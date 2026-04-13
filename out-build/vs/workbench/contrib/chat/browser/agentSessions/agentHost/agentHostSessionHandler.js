/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
import { Emitter } from '../../../../../../base/common/event.js';
import { MarkdownString } from '../../../../../../base/common/htmlContent.js';
import { Disposable, DisposableStore, toDisposable } from '../../../../../../base/common/lifecycle.js';
import { observableValue } from '../../../../../../base/common/observable.js';
import { generateUuid } from '../../../../../../base/common/uuid.js';
import { URI } from '../../../../../../base/common/uri.js';
import { ExtensionIdentifier } from '../../../../../../platform/extensions/common/extensions.js';
import { ILogService } from '../../../../../../platform/log/common/log.js';
import { IInstantiationService } from '../../../../../../platform/instantiation/common/instantiation.js';
import { IProductService } from '../../../../../../platform/product/common/productService.js';
import { IWorkspaceContextService } from '../../../../../../platform/workspace/common/workspace.js';
import { AgentSession } from '../../../../../../platform/agentHost/common/agentService.js';
import { isSessionAction } from '../../../../../../platform/agentHost/common/state/sessionActions.js';
import { SessionClientState } from '../../../../../../platform/agentHost/common/state/sessionClientState.js';
import { getToolKind, getToolLanguage } from '../../../../../../platform/agentHost/common/state/sessionReducers.js';
import { ChatAgentLocation, ChatModeKind } from '../../../common/constants.js';
import { IChatAgentService } from '../../../common/participants/chatAgents.js';
import { IChatToolInvocation } from '../../../common/chatService/chatService.js';
import { getAgentHostIcon } from '../agentSessions.js';
import { turnsToHistory, toolCallStateToInvocation, permissionToConfirmation, finalizeToolInvocation } from './stateToProgressAdapter.js';
// =============================================================================
// AgentHostSessionHandler — renderer-side handler for a single agent host
// chat session type. Bridges the protocol state layer with the chat UI:
// subscribes to session state, derives IChatProgress[] from immutable state
// changes, and dispatches client actions (turnStarted, permissionResolved,
// turnCancelled) back to the server.
// =============================================================================
// =============================================================================
// Chat session
// =============================================================================
let AgentHostChatSession = class AgentHostChatSession extends Disposable {
    constructor(sessionResource, history, _sendRequest, onDispose, _logService) {
        super();
        this.sessionResource = sessionResource;
        this.history = history;
        this._sendRequest = _sendRequest;
        this._logService = _logService;
        this.progressObs = observableValue('agentHostProgress', []);
        this.isCompleteObs = observableValue('agentHostComplete', true);
        this._onWillDispose = this._register(new Emitter());
        this.onWillDispose = this._onWillDispose.event;
        this._register(toDisposable(() => this._onWillDispose.fire()));
        this._register(toDisposable(onDispose));
        this.requestHandler = async (request, progress, _history, cancellationToken) => {
            this._logService.info('[AgentHost] requestHandler called');
            this.isCompleteObs.set(false, undefined);
            await this._sendRequest(request, progress, cancellationToken);
            this.isCompleteObs.set(true, undefined);
        };
        this.interruptActiveResponseCallback = history.length > 0 ? undefined : async () => {
            return true;
        };
    }
};
AgentHostChatSession = __decorate([
    __param(4, ILogService)
], AgentHostChatSession);
let AgentHostSessionHandler = class AgentHostSessionHandler extends Disposable {
    constructor(config, _chatAgentService, _logService, _productService, _workspaceContextService, _instantiationService) {
        super();
        this._chatAgentService = _chatAgentService;
        this._logService = _logService;
        this._productService = _productService;
        this._workspaceContextService = _workspaceContextService;
        this._instantiationService = _instantiationService;
        this._activeSessions = new Map();
        /** Maps UI resource keys to resolved backend session URIs. */
        this._sessionToBackend = new Map();
        this._config = config;
        // Create shared client state manager for this handler instance
        this._clientState = this._register(new SessionClientState(config.connection.clientId, this._logService));
        // Forward action envelopes from IPC to client state
        this._register(config.connection.onDidAction(envelope => {
            if (isSessionAction(envelope.action)) {
                this._clientState.receiveEnvelope(envelope);
            }
        }));
        this._registerAgent();
    }
    async provideChatSessionContent(sessionResource, _token) {
        const resourceKey = sessionResource.path.substring(1);
        // For untitled (new) sessions, defer backend session creation until the
        // first request arrives so the user-selected model is available.
        // For existing sessions we resolve immediately to load history.
        let resolvedSession;
        const isUntitled = resourceKey.startsWith('untitled-');
        const history = [];
        if (!isUntitled) {
            resolvedSession = this._resolveSessionUri(sessionResource);
            this._sessionToBackend.set(resourceKey, resolvedSession);
            try {
                const snapshot = await this._config.connection.subscribe(resolvedSession);
                if (snapshot?.state) {
                    this._clientState.handleSnapshot(resolvedSession.toString(), snapshot.state, snapshot.fromSeq);
                    const sessionState = this._clientState.getSessionState(resolvedSession.toString());
                    if (sessionState) {
                        history.push(...turnsToHistory(sessionState.turns, this._config.agentId));
                    }
                }
            }
            catch (err) {
                this._logService.warn(`[AgentHost] Failed to subscribe to existing session: ${resolvedSession.toString()}`, err);
            }
        }
        const session = this._instantiationService.createInstance(AgentHostChatSession, sessionResource, history, async (request, progress, token) => {
            const backendSession = resolvedSession ?? await this._createAndSubscribe(sessionResource, request.userSelectedModelId);
            resolvedSession = backendSession;
            this._sessionToBackend.set(resourceKey, backendSession);
            return this._handleTurn(backendSession, request, progress, token);
        }, () => {
            this._activeSessions.delete(resourceKey);
            this._sessionToBackend.delete(resourceKey);
            if (resolvedSession) {
                this._clientState.unsubscribe(resolvedSession.toString());
                this._config.connection.unsubscribe(resolvedSession);
                this._config.connection.disposeSession(resolvedSession);
            }
        });
        this._activeSessions.set(resourceKey, session);
        return session;
    }
    // ---- Agent registration -------------------------------------------------
    _registerAgent() {
        const agentData = {
            id: this._config.agentId,
            name: this._config.agentId,
            fullName: this._config.fullName,
            description: this._config.description,
            extensionId: new ExtensionIdentifier(this._config.extensionId ?? 'vscode.agent-host'),
            extensionVersion: undefined,
            extensionPublisherId: 'vscode',
            extensionDisplayName: this._config.extensionDisplayName ?? 'Agent Host',
            isDefault: false,
            isDynamic: true,
            isCore: true,
            metadata: { themeIcon: getAgentHostIcon(this._productService) },
            slashCommands: [],
            locations: [ChatAgentLocation.Chat],
            modes: [ChatModeKind.Agent],
            disambiguation: [],
        };
        const agentImpl = {
            invoke: async (request, progress, _history, cancellationToken) => {
                return this._invokeAgent(request, progress, cancellationToken);
            },
        };
        this._register(this._chatAgentService.registerDynamicAgent(agentData, agentImpl));
    }
    async _invokeAgent(request, progress, cancellationToken) {
        this._logService.info(`[AgentHost] _invokeAgent called for resource: ${request.sessionResource.toString()}`);
        // Resolve or create backend session
        const resourceKey = request.sessionResource.path.substring(1);
        let resolvedSession = this._sessionToBackend.get(resourceKey);
        if (!resolvedSession) {
            resolvedSession = await this._createAndSubscribe(request.sessionResource, request.userSelectedModelId);
            this._sessionToBackend.set(resourceKey, resolvedSession);
        }
        await this._handleTurn(resolvedSession, request, progress, cancellationToken);
        const activeSession = this._activeSessions.get(resourceKey);
        if (activeSession) {
            activeSession.isCompleteObs.set(true, undefined);
        }
        return {};
    }
    // ---- Turn handling (state-driven) ---------------------------------------
    async _handleTurn(session, request, progress, cancellationToken) {
        if (cancellationToken.isCancellationRequested) {
            return;
        }
        const turnId = generateUuid();
        const attachments = this._convertVariablesToAttachments(request);
        const messageAttachments = attachments.map(a => ({
            type: a.type,
            path: a.path,
            displayName: a.displayName,
        }));
        // If the user selected a different model since the session was created
        // (or since the last turn), dispatch a model change action first so the
        // agent backend picks up the new model before processing the turn.
        const rawModelId = this._extractRawModelId(request.userSelectedModelId);
        if (rawModelId) {
            const currentModel = this._clientState.getSessionState(session.toString())?.summary.model;
            if (currentModel !== rawModelId) {
                const modelAction = {
                    type: "session/modelChanged" /* ActionType.SessionModelChanged */,
                    session: session.toString(),
                    model: rawModelId,
                };
                const modelSeq = this._clientState.applyOptimistic(modelAction);
                this._config.connection.dispatchAction(modelAction, this._clientState.clientId, modelSeq);
            }
        }
        // Dispatch session/turnStarted — the server will call sendMessage on
        // the provider as a side effect.
        const turnAction = {
            type: "session/turnStarted" /* ActionType.SessionTurnStarted */,
            session: session.toString(),
            turnId,
            userMessage: {
                text: request.message,
                attachments: messageAttachments.length > 0 ? messageAttachments : undefined,
            },
        };
        const clientSeq = this._clientState.applyOptimistic(turnAction);
        this._config.connection.dispatchAction(turnAction, this._clientState.clientId, clientSeq);
        // Track live ChatToolInvocation/permission objects for this turn
        const activeToolInvocations = new Map();
        const activePermissions = new Map();
        // Track last-emitted lengths to compute deltas from immutable state
        let lastStreamedTextLen = 0;
        let lastReasoningLen = 0;
        const turnDisposables = new DisposableStore();
        let resolveDone;
        const done = new Promise(resolve => { resolveDone = resolve; });
        let finished = false;
        const finish = () => {
            if (finished) {
                return;
            }
            finished = true;
            // Finalize any outstanding tool invocations
            for (const [, invocation] of activeToolInvocations) {
                invocation.didExecuteTool(undefined);
            }
            activeToolInvocations.clear();
            turnDisposables.dispose();
            resolveDone();
        };
        // Listen to state changes and translate to IChatProgress[]
        turnDisposables.add(this._clientState.onDidChangeSessionState(e => {
            if (e.session !== session.toString() || cancellationToken.isCancellationRequested) {
                return;
            }
            const activeTurn = e.state.activeTurn;
            if (!activeTurn || activeTurn.id !== turnId) {
                // Turn completed (activeTurn cleared by reducer).
                // Check if the finalized turn ended with an error and emit it.
                const lastTurn = e.state.turns[e.state.turns.length - 1];
                if (lastTurn?.id === turnId && lastTurn.state === "error" /* TurnState.Error */ && lastTurn.error) {
                    progress([{ kind: 'markdownContent', content: new MarkdownString(`\n\nError: (${lastTurn.error.errorType}) ${lastTurn.error.message}`) }]);
                }
                if (!finished) {
                    finish();
                }
                return;
            }
            // Stream text deltas
            if (activeTurn.streamingText.length > lastStreamedTextLen) {
                const delta = activeTurn.streamingText.substring(lastStreamedTextLen);
                lastStreamedTextLen = activeTurn.streamingText.length;
                progress([{ kind: 'markdownContent', content: new MarkdownString(delta) }]);
            }
            // Stream reasoning deltas
            if (activeTurn.reasoning.length > lastReasoningLen) {
                const delta = activeTurn.reasoning.substring(lastReasoningLen);
                lastReasoningLen = activeTurn.reasoning.length;
                progress([{ kind: 'thinking', value: delta }]);
            }
            // Handle tool calls — create/finalize ChatToolInvocations
            for (const [toolCallId, tc] of Object.entries(activeTurn.toolCalls)) {
                const existing = activeToolInvocations.get(toolCallId);
                if (!existing) {
                    if (tc.status === "running" /* ToolCallStatus.Running */ || tc.status === "streaming" /* ToolCallStatus.Streaming */ || tc.status === "pending-confirmation" /* ToolCallStatus.PendingConfirmation */) {
                        const invocation = toolCallStateToInvocation(tc);
                        activeToolInvocations.set(toolCallId, invocation);
                        progress([invocation]);
                    }
                }
                else if (tc.status === "completed" /* ToolCallStatus.Completed */ || tc.status === "cancelled" /* ToolCallStatus.Cancelled */) {
                    activeToolInvocations.delete(toolCallId);
                    finalizeToolInvocation(existing, tc);
                }
                else if (tc.status === "running" /* ToolCallStatus.Running */ || tc.status === "pending-confirmation" /* ToolCallStatus.PendingConfirmation */) {
                    // Tool transitioned from streaming to ready — update the invocation
                    // with the now-available invocationMessage and toolSpecificData.
                    existing.invocationMessage = typeof tc.invocationMessage === 'string'
                        ? tc.invocationMessage
                        : new MarkdownString(tc.invocationMessage.markdown);
                    if (getToolKind(tc) === 'terminal' && tc.toolInput) {
                        existing.toolSpecificData = {
                            kind: 'terminal',
                            commandLine: { original: tc.toolInput },
                            language: getToolLanguage(tc) ?? 'shellscript',
                        };
                    }
                }
            }
            // Handle permission requests
            for (const [requestId, perm] of Object.entries(activeTurn.pendingPermissions)) {
                if (activePermissions.has(requestId)) {
                    continue;
                }
                const confirmInvocation = permissionToConfirmation(perm);
                activePermissions.set(requestId, confirmInvocation);
                progress([confirmInvocation]);
                IChatToolInvocation.awaitConfirmation(confirmInvocation, cancellationToken).then(reason => {
                    const approved = reason.type !== 0 /* ToolConfirmKind.Denied */ && reason.type !== 5 /* ToolConfirmKind.Skipped */;
                    this._logService.info(`[AgentHost] Permission response: requestId=${requestId}, approved=${approved}`);
                    const resolveAction = {
                        type: "session/permissionResolved" /* ActionType.SessionPermissionResolved */,
                        session: session.toString(),
                        turnId,
                        requestId,
                        approved,
                    };
                    const seq = this._clientState.applyOptimistic(resolveAction);
                    this._config.connection.dispatchAction(resolveAction, this._clientState.clientId, seq);
                    if (approved) {
                        confirmInvocation.didExecuteTool(undefined);
                    }
                    else {
                        confirmInvocation.didExecuteTool({ content: [], toolResultError: 'User denied' });
                    }
                }).catch(err => {
                    this._logService.warn(`[AgentHost] Permission confirmation failed for requestId=${requestId}`, err);
                });
            }
        }));
        turnDisposables.add(cancellationToken.onCancellationRequested(() => {
            this._logService.info(`[AgentHost] Cancellation requested for ${session.toString()}, dispatching turnCancelled`);
            const cancelAction = {
                type: "session/turnCancelled" /* ActionType.SessionTurnCancelled */,
                session: session.toString(),
                turnId,
            };
            const seq = this._clientState.applyOptimistic(cancelAction);
            this._config.connection.dispatchAction(cancelAction, this._clientState.clientId, seq);
            finish();
        }));
        await done;
    }
    // ---- Session resolution -------------------------------------------------
    /** Maps a UI session resource to a backend provider URI. */
    _resolveSessionUri(sessionResource) {
        const rawId = sessionResource.path.substring(1);
        return AgentSession.uri(this._config.provider, rawId);
    }
    /** Creates a new backend session and subscribes to its state. */
    async _createAndSubscribe(sessionResource, modelId) {
        const rawModelId = this._extractRawModelId(modelId);
        const resourceKey = sessionResource.path.substring(1);
        const workingDirectory = this._config.resolveWorkingDirectory?.(resourceKey)
            ?? this._workspaceContextService.getWorkspace().folders[0]?.uri.fsPath;
        this._logService.trace(`[AgentHost] Creating new session, model=${rawModelId ?? '(default)'}, provider=${this._config.provider}`);
        const session = await this._config.connection.createSession({
            model: rawModelId,
            provider: this._config.provider,
            workingDirectory,
        });
        this._logService.trace(`[AgentHost] Created session: ${session.toString()}`);
        // Subscribe to the new session's state
        try {
            const snapshot = await this._config.connection.subscribe(session);
            this._clientState.handleSnapshot(session.toString(), snapshot.state, snapshot.fromSeq);
        }
        catch (err) {
            this._logService.error(`[AgentHost] Failed to subscribe to new session: ${session.toString()}`, err);
        }
        return session;
    }
    /**
     * Extracts the raw model id from a language-model service identifier.
     * E.g. "agent-host-copilot:claude-sonnet-4-20250514" → "claude-sonnet-4-20250514".
     */
    _extractRawModelId(languageModelIdentifier) {
        if (!languageModelIdentifier) {
            return undefined;
        }
        const prefix = this._config.sessionType + ':';
        if (languageModelIdentifier.startsWith(prefix)) {
            return languageModelIdentifier.substring(prefix.length);
        }
        return languageModelIdentifier;
    }
    _convertVariablesToAttachments(request) {
        const attachments = [];
        for (const v of request.variables.variables) {
            if (v.kind === 'file') {
                const uri = v.value instanceof URI ? v.value : undefined;
                if (uri?.scheme === 'file') {
                    attachments.push({ type: "file" /* AttachmentType.File */, path: uri.fsPath, displayName: v.name });
                }
            }
            else if (v.kind === 'directory') {
                const uri = v.value instanceof URI ? v.value : undefined;
                if (uri?.scheme === 'file') {
                    attachments.push({ type: "directory" /* AttachmentType.Directory */, path: uri.fsPath, displayName: v.name });
                }
            }
            else if (v.kind === 'implicit' && v.isSelection) {
                const uri = v.uri;
                if (uri?.scheme === 'file') {
                    attachments.push({ type: "selection" /* AttachmentType.Selection */, path: uri.fsPath, displayName: v.name });
                }
            }
        }
        if (attachments.length > 0) {
            this._logService.trace(`[AgentHost] Converted ${attachments.length} attachments from ${request.variables.variables.length} variables`);
        }
        return attachments;
    }
    // ---- Lifecycle ----------------------------------------------------------
    dispose() {
        for (const [, session] of this._activeSessions) {
            session.dispose();
        }
        this._activeSessions.clear();
        this._sessionToBackend.clear();
        super.dispose();
    }
};
AgentHostSessionHandler = __decorate([
    __param(1, IChatAgentService),
    __param(2, ILogService),
    __param(3, IProductService),
    __param(4, IWorkspaceContextService),
    __param(5, IInstantiationService)
], AgentHostSessionHandler);
export { AgentHostSessionHandler };
//# sourceMappingURL=agentHostSessionHandler.js.map