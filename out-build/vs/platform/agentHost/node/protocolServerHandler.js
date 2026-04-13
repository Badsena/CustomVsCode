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
import { Disposable, DisposableStore } from '../../../base/common/lifecycle.js';
import { ILogService } from '../../log/common/log.js';
import { isSessionAction } from '../common/state/sessionActions.js';
import { isActionKnownToVersion, MIN_PROTOCOL_VERSION, PROTOCOL_VERSION } from '../common/state/sessionCapabilities.js';
import { AHP_SESSION_NOT_FOUND, AHP_UNSUPPORTED_PROTOCOL_VERSION, isJsonRpcNotification, isJsonRpcRequest, JSON_RPC_INTERNAL_ERROR, ProtocolError, } from '../common/state/sessionProtocol.js';
import { ROOT_STATE_URI } from '../common/state/sessionState.js';
/** Default capacity of the server-side action replay buffer. */
const REPLAY_BUFFER_CAPACITY = 1000;
/** Build a JSON-RPC success response suitable for transport.send(). */
function jsonRpcSuccess(id, result) {
    return { jsonrpc: '2.0', id, result };
}
/** Build a JSON-RPC error response suitable for transport.send(). */
function jsonRpcError(id, code, message) {
    return { jsonrpc: '2.0', id, error: { code, message } };
}
/**
 * Server-side handler that manages protocol connections, routes JSON-RPC
 * messages to the state manager, and broadcasts actions/notifications
 * to subscribed clients.
 */
let ProtocolServerHandler = class ProtocolServerHandler extends Disposable {
    constructor(_stateManager, _server, _sideEffectHandler, _logService) {
        super();
        this._stateManager = _stateManager;
        this._server = _server;
        this._sideEffectHandler = _sideEffectHandler;
        this._logService = _logService;
        this._clients = new Map();
        this._replayBuffer = [];
        // ---- Requests (expect a response) ---------------------------------------
        /**
         * Methods handled by the request dispatcher (excludes initialize/reconnect
         * which are handled during the handshake phase).
         */
        this._requestHandlers = {
            subscribe: async (client, params) => {
                const snapshot = this._stateManager.getSnapshot(params.resource);
                if (!snapshot) {
                    throw new ProtocolError(AHP_SESSION_NOT_FOUND, `Resource not found: ${params.resource}`);
                }
                client.subscriptions.add(params.resource);
                return { snapshot };
            },
            createSession: async (_client, params) => {
                await this._sideEffectHandler.handleCreateSession(params);
                return null;
            },
            disposeSession: async (_client, params) => {
                this._sideEffectHandler.handleDisposeSession(params.session);
                return null;
            },
            listSessions: async () => {
                const items = await this._sideEffectHandler.handleListSessions();
                return { items };
            },
            fetchTurns: async (_client, params) => {
                const state = this._stateManager.getSessionState(params.session);
                if (!state) {
                    throw new ProtocolError(AHP_SESSION_NOT_FOUND, `Session not found: ${params.session}`);
                }
                const turns = state.turns;
                const limit = Math.min(params.limit ?? 50, 100);
                let endIndex = turns.length;
                if (params.before) {
                    const idx = turns.findIndex(t => t.id === params.before);
                    if (idx !== -1) {
                        endIndex = idx;
                    }
                }
                const startIndex = Math.max(0, endIndex - limit);
                return {
                    turns: turns.slice(startIndex, endIndex),
                    hasMore: startIndex > 0,
                };
            },
            browseDirectory: async (_client, params) => {
                return this._sideEffectHandler.handleBrowseDirectory(params.uri);
            },
            fetchContent: async () => {
                throw new Error('fetchContent not implemented');
            },
        };
        this._register(this._server.onConnection(transport => {
            this._handleNewConnection(transport);
        }));
        this._register(this._stateManager.onDidEmitEnvelope(envelope => {
            this._replayBuffer.push(envelope);
            if (this._replayBuffer.length > REPLAY_BUFFER_CAPACITY) {
                this._replayBuffer.shift();
            }
            this._broadcastAction(envelope);
        }));
        this._register(this._stateManager.onDidEmitNotification(notification => {
            this._broadcastNotification(notification);
        }));
    }
    // ---- Connection handling -------------------------------------------------
    _handleNewConnection(transport) {
        const disposables = new DisposableStore();
        let client;
        disposables.add(transport.onMessage(msg => {
            if (isJsonRpcRequest(msg)) {
                this._logService.trace(`[ProtocolServer] request: method=${msg.method} id=${msg.id}`);
                // Handle initialize/reconnect as requests that set up the client
                if (!client && msg.method === 'initialize') {
                    try {
                        const result = this._handleInitialize(msg.params, transport, disposables);
                        client = result.client;
                        transport.send(jsonRpcSuccess(msg.id, result.response));
                    }
                    catch (err) {
                        const code = err instanceof ProtocolError ? err.code : JSON_RPC_INTERNAL_ERROR;
                        const message = err instanceof Error ? err.message : String(err);
                        transport.send(jsonRpcError(msg.id, code, message));
                    }
                    return;
                }
                if (!client && msg.method === 'reconnect') {
                    try {
                        const result = this._handleReconnect(msg.params, transport, disposables);
                        client = result.client;
                        transport.send(jsonRpcSuccess(msg.id, result.response));
                    }
                    catch (err) {
                        const code = err instanceof ProtocolError ? err.code : JSON_RPC_INTERNAL_ERROR;
                        const message = err instanceof Error ? err.message : String(err);
                        transport.send(jsonRpcError(msg.id, code, message));
                    }
                    return;
                }
                if (!client) {
                    return;
                }
                this._handleRequest(client, msg.method, msg.params, msg.id);
            }
            else if (isJsonRpcNotification(msg)) {
                this._logService.trace(`[ProtocolServer] notification: method=${msg.method}`);
                // Notification — fire-and-forget
                switch (msg.method) {
                    case 'unsubscribe':
                        if (client) {
                            client.subscriptions.delete(msg.params.resource);
                        }
                        break;
                    case 'dispatchAction':
                        if (client) {
                            this._logService.trace(`[ProtocolServer] dispatchAction: ${JSON.stringify(msg.params.action.type)}`);
                            const origin = { clientId: client.clientId, clientSeq: msg.params.clientSeq };
                            const action = msg.params.action;
                            this._stateManager.dispatchClientAction(action, origin);
                            this._sideEffectHandler.handleAction(action);
                        }
                        break;
                    default: {
                        // VS Code extension: setAuthToken (not part of the protocol spec)
                        const method = msg.method;
                        if (method === 'setAuthToken') {
                            const p = msg.params;
                            this._sideEffectHandler.handleSetAuthToken(p.token);
                        }
                        break;
                    }
                }
            }
            // Responses from the client (if any) are ignored on the server side.
        }));
        disposables.add(transport.onClose(() => {
            if (client) {
                this._logService.info(`[ProtocolServer] Client disconnected: ${client.clientId}`);
                this._clients.delete(client.clientId);
            }
            disposables.dispose();
        }));
        disposables.add(transport);
    }
    // ---- Handshake handlers ----------------------------------------------------
    _handleInitialize(params, transport, disposables) {
        this._logService.info(`[ProtocolServer] Initialize: clientId=${params.clientId}, version=${params.protocolVersion}`);
        if (params.protocolVersion < MIN_PROTOCOL_VERSION) {
            throw new ProtocolError(AHP_UNSUPPORTED_PROTOCOL_VERSION, `Client protocol version ${params.protocolVersion} is below minimum ${MIN_PROTOCOL_VERSION}`);
        }
        const client = {
            clientId: params.clientId,
            protocolVersion: params.protocolVersion,
            transport,
            subscriptions: new Set(),
            disposables,
        };
        this._clients.set(params.clientId, client);
        const snapshots = [];
        if (params.initialSubscriptions) {
            for (const uri of params.initialSubscriptions) {
                const snapshot = this._stateManager.getSnapshot(uri);
                if (snapshot) {
                    snapshots.push(snapshot);
                    client.subscriptions.add(uri.toString());
                }
            }
        }
        return {
            client,
            response: {
                protocolVersion: PROTOCOL_VERSION,
                serverSeq: this._stateManager.serverSeq,
                snapshots,
                defaultDirectory: this._sideEffectHandler.getDefaultDirectory?.(),
            },
        };
    }
    _handleReconnect(params, transport, disposables) {
        this._logService.info(`[ProtocolServer] Reconnect: clientId=${params.clientId}, lastSeenSeq=${params.lastSeenServerSeq}`);
        const client = {
            clientId: params.clientId,
            protocolVersion: PROTOCOL_VERSION,
            transport,
            subscriptions: new Set(),
            disposables,
        };
        this._clients.set(params.clientId, client);
        const oldestBuffered = this._replayBuffer.length > 0 ? this._replayBuffer[0].serverSeq : this._stateManager.serverSeq;
        const canReplay = params.lastSeenServerSeq >= oldestBuffered;
        if (canReplay) {
            const actions = [];
            for (const sub of params.subscriptions) {
                client.subscriptions.add(sub.toString());
            }
            for (const envelope of this._replayBuffer) {
                if (envelope.serverSeq > params.lastSeenServerSeq) {
                    if (this._isRelevantToClient(client, envelope)) {
                        actions.push(envelope);
                    }
                }
            }
            return { client, response: { type: 'replay', actions } };
        }
        else {
            const snapshots = [];
            for (const sub of params.subscriptions) {
                const snapshot = this._stateManager.getSnapshot(sub);
                if (snapshot) {
                    snapshots.push(snapshot);
                    client.subscriptions.add(sub);
                }
            }
            return { client, response: { type: 'snapshot', snapshots } };
        }
    }
    _handleRequest(client, method, params, id) {
        const handler = this._requestHandlers.hasOwnProperty(method) ? this._requestHandlers[method] : undefined;
        if (!handler) {
            client.transport.send(jsonRpcError(id, JSON_RPC_INTERNAL_ERROR, `Unknown method: ${method}`));
            return;
        }
        handler(client, params).then(result => {
            this._logService.trace(`[ProtocolServer] Request '${method}' id=${id} succeeded`);
            client.transport.send(jsonRpcSuccess(id, result ?? null));
        }).catch(err => {
            this._logService.error(`[ProtocolServer] Request '${method}' failed`, err);
            const code = err instanceof ProtocolError ? err.code : JSON_RPC_INTERNAL_ERROR;
            const message = err instanceof ProtocolError
                ? err.message
                : err instanceof Error && err.stack
                    ? err.stack
                    : String(err?.message ?? err);
            client.transport.send(jsonRpcError(id, code, message));
        });
    }
    // ---- Broadcasting -------------------------------------------------------
    _broadcastAction(envelope) {
        this._logService.trace(`[ProtocolServer] Broadcasting action: ${envelope.action.type}`);
        const msg = { jsonrpc: '2.0', method: 'action', params: envelope };
        for (const client of this._clients.values()) {
            if (this._isRelevantToClient(client, envelope)) {
                client.transport.send(msg);
            }
        }
    }
    _broadcastNotification(notification) {
        const msg = { jsonrpc: '2.0', method: 'notification', params: { notification } };
        for (const client of this._clients.values()) {
            client.transport.send(msg);
        }
    }
    _isRelevantToClient(client, envelope) {
        const action = envelope.action;
        if (!isActionKnownToVersion(action, client.protocolVersion)) {
            return false;
        }
        if (action.type.startsWith('root/')) {
            return client.subscriptions.has(ROOT_STATE_URI);
        }
        if (isSessionAction(action)) {
            return client.subscriptions.has(action.session);
        }
        return false;
    }
    dispose() {
        for (const client of this._clients.values()) {
            client.disposables.dispose();
        }
        this._clients.clear();
        this._replayBuffer.length = 0;
        super.dispose();
    }
};
ProtocolServerHandler = __decorate([
    __param(3, ILogService)
], ProtocolServerHandler);
export { ProtocolServerHandler };
//# sourceMappingURL=protocolServerHandler.js.map