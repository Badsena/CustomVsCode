/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Emitter } from '../../../base/common/event.js';
import { Disposable, DisposableStore } from '../../../base/common/lifecycle.js';
import { observableValue } from '../../../base/common/observable.js';
import { AgentSession } from '../common/agentService.js';
import { AgentSideEffects } from './agentSideEffects.js';
import { SessionStateManager } from './sessionStateManager.js';
/**
 * The agent service implementation that runs inside the agent-host utility
 * process. Dispatches to registered {@link IAgent} instances based
 * on the provider identifier in the session configuration.
 */
export class AgentService extends Disposable {
    /** Exposes the state manager for co-hosting a WebSocket protocol server. */
    get stateManager() { return this._stateManager; }
    constructor(_logService, _fileService) {
        super();
        this._logService = _logService;
        this._fileService = _fileService;
        /** Protocol: fires when state is mutated by an action. */
        this._onDidAction = this._register(new Emitter());
        this.onDidAction = this._onDidAction.event;
        /** Protocol: fires for ephemeral notifications (sessionAdded/Removed). */
        this._onDidNotification = this._register(new Emitter());
        this.onDidNotification = this._onDidNotification.event;
        /** Registered providers keyed by their {@link AgentProvider} id. */
        this._providers = new Map();
        /** Maps each active session URI (toString) to its owning provider. */
        this._sessionToProvider = new Map();
        /** Subscriptions to provider progress events; cleared when providers change. */
        this._providerSubscriptions = this._register(new DisposableStore());
        /** Observable registered agents, drives `root/agentsChanged` via {@link AgentSideEffects}. */
        this._agents = observableValue('agents', []);
        this._logService.info('AgentService initialized');
        this._stateManager = this._register(new SessionStateManager(_logService));
        this._register(this._stateManager.onDidEmitEnvelope(e => this._onDidAction.fire(e)));
        this._register(this._stateManager.onDidEmitNotification(e => this._onDidNotification.fire(e)));
        this._sideEffects = this._register(new AgentSideEffects(this._stateManager, {
            getAgent: session => this._findProviderForSession(session),
            agents: this._agents,
        }, this._logService, this._fileService));
    }
    // ---- provider registration ----------------------------------------------
    registerProvider(provider) {
        if (this._providers.has(provider.id)) {
            throw new Error(`Agent provider already registered: ${provider.id}`);
        }
        this._logService.info(`Registering agent provider: ${provider.id}`);
        this._providers.set(provider.id, provider);
        this._providerSubscriptions.add(this._sideEffects.registerProgressListener(provider));
        if (!this._defaultProvider) {
            this._defaultProvider = provider.id;
        }
        // Update root state with current agents list
        this._updateAgents();
    }
    // ---- auth ---------------------------------------------------------------
    async listAgents() {
        return [...this._providers.values()].map(p => p.getDescriptor());
    }
    async setAuthToken(token) {
        this._logService.trace('[AgentService] setAuthToken called');
        const promises = [];
        for (const provider of this._providers.values()) {
            promises.push(provider.setAuthToken(token));
        }
        await Promise.all(promises);
    }
    // ---- session management -------------------------------------------------
    async listSessions() {
        this._logService.trace('[AgentService] listSessions called');
        const results = await Promise.all([...this._providers.values()].map(p => p.listSessions()));
        const flat = results.flat();
        this._logService.trace(`[AgentService] listSessions returned ${flat.length} sessions`);
        return flat;
    }
    /**
     * Refreshes the model list from all providers and publishes the updated
     * agents (with their models) to root state via `root/agentsChanged`.
     */
    async refreshModels() {
        this._logService.trace('[AgentService] refreshModels called');
        this._updateAgents();
    }
    async createSession(config) {
        const providerId = config?.provider ?? this._defaultProvider;
        const provider = providerId ? this._providers.get(providerId) : undefined;
        if (!provider) {
            throw new Error(`No agent provider registered for: ${providerId ?? '(none)'}`);
        }
        this._logService.trace(`[AgentService] createSession: provider=${provider.id} model=${config?.model ?? '(default)'}`);
        const session = await provider.createSession(config);
        this._sessionToProvider.set(session.toString(), provider.id);
        this._logService.trace(`[AgentService] createSession returned: ${session.toString()}`);
        // Create state in the state manager
        const summary = {
            resource: session.toString(),
            provider: provider.id,
            title: 'New Session',
            status: "idle" /* SessionStatus.Idle */,
            createdAt: Date.now(),
            modifiedAt: Date.now(),
        };
        this._stateManager.createSession(summary);
        this._stateManager.dispatchServerAction({ type: "session/ready" /* ActionType.SessionReady */, session: session.toString() });
        return session;
    }
    async disposeSession(session) {
        this._logService.trace(`[AgentService] disposeSession: ${session.toString()}`);
        const provider = this._findProviderForSession(session);
        if (provider) {
            await provider.disposeSession(session);
            this._sessionToProvider.delete(session.toString());
        }
        this._stateManager.removeSession(session.toString());
    }
    // ---- Protocol methods ---------------------------------------------------
    async subscribe(resource) {
        this._logService.trace(`[AgentService] subscribe: ${resource.toString()}`);
        const snapshot = this._stateManager.getSnapshot(resource.toString());
        if (!snapshot) {
            throw new Error(`Cannot subscribe to unknown resource: ${resource.toString()}`);
        }
        return snapshot;
    }
    unsubscribe(resource) {
        this._logService.trace(`[AgentService] unsubscribe: ${resource.toString()}`);
        // Server-side tracking of per-client subscriptions will be added
        // in Phase 4 (multi-client). For now this is a no-op.
    }
    dispatchAction(action, clientId, clientSeq) {
        this._logService.trace(`[AgentService] dispatchAction: type=${action.type}, clientId=${clientId}, clientSeq=${clientSeq}`, action);
        const origin = { clientId, clientSeq };
        const state = this._stateManager.dispatchClientAction(action, origin);
        this._logService.trace(`[AgentService] resulting state:`, state);
        this._sideEffects.handleAction(action);
    }
    async browseDirectory(uri) {
        return this._sideEffects.handleBrowseDirectory(uri.toString());
    }
    async shutdown() {
        this._logService.info('AgentService: shutting down all providers...');
        const promises = [];
        for (const provider of this._providers.values()) {
            promises.push(provider.shutdown());
        }
        await Promise.all(promises);
        this._sessionToProvider.clear();
    }
    // ---- helpers ------------------------------------------------------------
    _findProviderForSession(session) {
        const key = typeof session === 'string' ? session : session.toString();
        const providerId = this._sessionToProvider.get(key);
        if (providerId) {
            return this._providers.get(providerId);
        }
        const schemeProvider = AgentSession.provider(session);
        if (schemeProvider) {
            return this._providers.get(schemeProvider);
        }
        // Fallback: try the default provider (handles resumed sessions not yet tracked)
        if (this._defaultProvider) {
            return this._providers.get(this._defaultProvider);
        }
        return undefined;
    }
    /**
     * Sets the agents observable to trigger model re-fetch and
     * `root/agentsChanged` via the autorun in {@link AgentSideEffects}.
     */
    _updateAgents() {
        this._agents.set([...this._providers.values()], undefined);
    }
    dispose() {
        for (const provider of this._providers.values()) {
            provider.dispose();
        }
        this._providers.clear();
        super.dispose();
    }
}
//# sourceMappingURL=agentService.js.map