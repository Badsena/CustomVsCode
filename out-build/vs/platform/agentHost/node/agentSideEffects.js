/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Disposable, DisposableStore } from '../../../base/common/lifecycle.js';
import { autorun } from '../../../base/common/observable.js';
import { URI } from '../../../base/common/uri.js';
import * as os from 'os';
import { AHP_PROVIDER_NOT_FOUND, JSON_RPC_INTERNAL_ERROR, ProtocolError } from '../common/state/sessionProtocol.js';
import { mapProgressEventToActions } from './agentEventMapper.js';
/**
 * Shared implementation of agent side-effect handling.
 *
 * Routes client-dispatched actions to the correct agent backend, handles
 * session create/dispose/list operations, tracks pending permission requests,
 * and wires up agent progress events to the state manager.
 *
 * Used by both the Electron utility-process path ({@link AgentService}) and
 * the standalone WebSocket server (`agentHostServerMain`).
 */
export class AgentSideEffects extends Disposable {
    constructor(_stateManager, _options, _logService, _fileService) {
        super();
        this._stateManager = _stateManager;
        this._options = _options;
        this._logService = _logService;
        this._fileService = _fileService;
        /** Maps pending permission request IDs to the provider that issued them. */
        this._pendingPermissions = new Map();
        // Whenever the agents observable changes, publish to root state.
        this._register(autorun(reader => {
            const agents = this._options.agents.read(reader);
            this._publishAgentInfos(agents);
        }));
    }
    /**
     * Fetches models from all agents and dispatches `root/agentsChanged`.
     */
    async _publishAgentInfos(agents) {
        const infos = await Promise.all(agents.map(async (a) => {
            const d = a.getDescriptor();
            let models;
            try {
                const rawModels = await a.listModels();
                models = rawModels.map(m => ({
                    id: m.id, provider: m.provider, name: m.name,
                    maxContextWindow: m.maxContextWindow, supportsVision: m.supportsVision,
                    policyState: m.policyState,
                }));
            }
            catch {
                models = [];
            }
            return { provider: d.provider, displayName: d.displayName, description: d.description, models };
        }));
        this._stateManager.dispatchServerAction({ type: "root/agentsChanged" /* ActionType.RootAgentsChanged */, agents: infos });
    }
    // ---- Agent registration -------------------------------------------------
    /**
     * Registers a progress-event listener on the given agent so that
     * `IAgentProgressEvent`s are mapped to protocol actions and dispatched
     * through the state manager. Returns a disposable that removes the
     * listener.
     */
    registerProgressListener(agent) {
        const disposables = new DisposableStore();
        disposables.add(agent.onDidSessionProgress(e => {
            // Track permission requests so handleAction can route responses
            if (e.type === 'permission_request') {
                this._pendingPermissions.set(e.requestId, agent.id);
            }
            const turnId = this._stateManager.getActiveTurnId(e.session.toString());
            if (turnId) {
                const actions = mapProgressEventToActions(e, e.session.toString(), turnId);
                if (actions) {
                    if (Array.isArray(actions)) {
                        for (const action of actions) {
                            this._stateManager.dispatchServerAction(action);
                        }
                    }
                    else {
                        this._stateManager.dispatchServerAction(actions);
                    }
                }
            }
        }));
        return disposables;
    }
    // ---- IProtocolSideEffectHandler -----------------------------------------
    handleAction(action) {
        switch (action.type) {
            case "session/turnStarted" /* ActionType.SessionTurnStarted */: {
                const agent = this._options.getAgent(action.session);
                if (!agent) {
                    this._stateManager.dispatchServerAction({
                        type: "session/error" /* ActionType.SessionError */,
                        session: action.session,
                        turnId: action.turnId,
                        error: { errorType: 'noAgent', message: 'No agent found for session' },
                    });
                    return;
                }
                const attachments = action.userMessage.attachments?.map((a) => ({
                    type: a.type,
                    path: a.path,
                    displayName: a.displayName,
                }));
                agent.sendMessage(URI.parse(action.session), action.userMessage.text, attachments).catch(err => {
                    this._logService.error('[AgentSideEffects] sendMessage failed', err);
                    this._stateManager.dispatchServerAction({
                        type: "session/error" /* ActionType.SessionError */,
                        session: action.session,
                        turnId: action.turnId,
                        error: { errorType: 'sendFailed', message: String(err) },
                    });
                });
                break;
            }
            case "session/permissionResolved" /* ActionType.SessionPermissionResolved */: {
                const providerId = this._pendingPermissions.get(action.requestId);
                if (providerId) {
                    this._pendingPermissions.delete(action.requestId);
                    const agent = this._options.agents.get().find(a => a.id === providerId);
                    agent?.respondToPermissionRequest(action.requestId, action.approved);
                }
                else {
                    this._logService.warn(`[AgentSideEffects] No pending permission request for: ${action.requestId}`);
                }
                break;
            }
            case "session/turnCancelled" /* ActionType.SessionTurnCancelled */: {
                const agent = this._options.getAgent(action.session);
                agent?.abortSession(URI.parse(action.session)).catch(err => {
                    this._logService.error('[AgentSideEffects] abortSession failed', err);
                });
                break;
            }
            case "session/modelChanged" /* ActionType.SessionModelChanged */: {
                const agent = this._options.getAgent(action.session);
                agent?.changeModel?.(URI.parse(action.session), action.model).catch(err => {
                    this._logService.error('[AgentSideEffects] changeModel failed', err);
                });
                break;
            }
        }
    }
    async handleCreateSession(command) {
        const provider = command.provider;
        if (!provider) {
            throw new ProtocolError(AHP_PROVIDER_NOT_FOUND, 'No provider specified for session creation');
        }
        const agent = this._options.agents.get().find(a => a.id === provider);
        if (!agent) {
            throw new ProtocolError(AHP_PROVIDER_NOT_FOUND, `No agent registered for provider: ${provider}`);
        }
        // Use the client-provided session URI per the protocol spec
        const session = command.session;
        await agent.createSession({
            provider,
            model: command.model,
            workingDirectory: command.workingDirectory,
            session: URI.parse(session),
        });
        const summary = {
            resource: session,
            provider,
            title: 'Session',
            status: "idle" /* SessionStatus.Idle */,
            createdAt: Date.now(),
            modifiedAt: Date.now(),
        };
        this._stateManager.createSession(summary);
        this._stateManager.dispatchServerAction({ type: "session/ready" /* ActionType.SessionReady */, session });
    }
    handleDisposeSession(session) {
        const agent = this._options.getAgent(session);
        agent?.disposeSession(URI.parse(session)).catch(() => { });
        this._stateManager.removeSession(session);
    }
    async handleListSessions() {
        const allSessions = [];
        for (const agent of this._options.agents.get()) {
            const sessions = await agent.listSessions();
            const provider = agent.id;
            for (const s of sessions) {
                allSessions.push({
                    resource: s.session.toString(),
                    provider,
                    title: s.summary ?? 'Session',
                    status: "idle" /* SessionStatus.Idle */,
                    createdAt: s.startTime,
                    modifiedAt: s.modifiedTime,
                });
            }
        }
        return allSessions;
    }
    handleSetAuthToken(token) {
        for (const agent of this._options.agents.get()) {
            agent.setAuthToken(token).catch(err => {
                this._logService.error('[AgentSideEffects] setAuthToken failed', err);
            });
        }
    }
    async handleBrowseDirectory(uri) {
        let stat;
        try {
            stat = await this._fileService.resolve(URI.parse(uri));
        }
        catch {
            throw new ProtocolError(JSON_RPC_INTERNAL_ERROR, `Directory not found: ${uri.toString()}`);
        }
        if (!stat.isDirectory) {
            throw new ProtocolError(JSON_RPC_INTERNAL_ERROR, `Not a directory: ${uri.toString()}`);
        }
        const entries = (stat.children ?? []).map(child => ({
            name: child.name,
            type: child.isDirectory ? 'directory' : 'file',
        }));
        return { entries };
    }
    getDefaultDirectory() {
        return URI.file(os.homedir()).toString();
    }
    dispose() {
        this._pendingPermissions.clear();
        super.dispose();
    }
}
//# sourceMappingURL=agentSideEffects.js.map