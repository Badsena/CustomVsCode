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
// Protocol client for communicating with a remote agent host process.
// Wraps WebSocketClientTransport and SessionClientState to provide a
// higher-level API matching IAgentService.
import { DeferredPromise } from '../../../base/common/async.js';
import { Emitter } from '../../../base/common/event.js';
import { Disposable } from '../../../base/common/lifecycle.js';
import { hasKey } from '../../../base/common/types.js';
import { URI } from '../../../base/common/uri.js';
import { generateUuid } from '../../../base/common/uuid.js';
import { ILogService } from '../../log/common/log.js';
import { AgentSession } from '../common/agentService.js';
import { PROTOCOL_VERSION } from '../common/state/sessionCapabilities.js';
import { isJsonRpcNotification, isJsonRpcResponse } from '../common/state/sessionProtocol.js';
import { WebSocketClientTransport } from './webSocketClientTransport.js';
/**
 * A protocol-level client for a single remote agent host connection.
 * Manages the WebSocket transport, handshake, subscriptions, action dispatch,
 * and command/response correlation.
 *
 * Implements {@link IAgentConnection} so consumers can program against
 * a single interface regardless of whether the agent host is local or remote.
 */
let RemoteAgentHostProtocolClient = class RemoteAgentHostProtocolClient extends Disposable {
    get clientId() {
        return this._clientId;
    }
    get address() {
        return this._transport['_address'];
    }
    get defaultDirectory() {
        return this._defaultDirectory;
    }
    constructor(address, connectionToken, _logService) {
        super();
        this._logService = _logService;
        this._clientId = generateUuid();
        this._serverSeq = 0;
        this._nextClientSeq = 1;
        this._onDidAction = this._register(new Emitter());
        this.onDidAction = this._onDidAction.event;
        this._onDidNotification = this._register(new Emitter());
        this.onDidNotification = this._onDidNotification.event;
        this._onDidClose = this._register(new Emitter());
        this.onDidClose = this._onDidClose.event;
        /** Pending JSON-RPC requests keyed by request id. */
        this._pendingRequests = new Map();
        this._nextRequestId = 1;
        this._transport = this._register(new WebSocketClientTransport(address, connectionToken));
        this._register(this._transport.onMessage(msg => this._handleMessage(msg)));
        this._register(this._transport.onClose(() => this._onDidClose.fire()));
    }
    /**
     * Connect to the remote agent host and perform the protocol handshake.
     */
    async connect() {
        await this._transport.connect();
        const result = await this._sendRequest('initialize', {
            protocolVersion: PROTOCOL_VERSION,
            clientId: this._clientId,
        });
        this._serverSeq = result.serverSeq;
        this._defaultDirectory = result.defaultDirectory;
    }
    /**
     * Subscribe to state at a URI. Returns the current state snapshot.
     */
    async subscribe(resource) {
        const result = await this._sendRequest('subscribe', { resource: resource.toString() });
        return result.snapshot;
    }
    /**
     * Unsubscribe from state at a URI.
     */
    unsubscribe(resource) {
        this._sendNotification('unsubscribe', { resource: resource.toString() });
    }
    /**
     * Dispatch a client action to the server. Returns the clientSeq used.
     */
    dispatchAction(action, _clientId, clientSeq) {
        this._sendNotification('dispatchAction', { clientSeq, action });
    }
    /**
     * Create a new session on the remote agent host.
     */
    async createSession(config) {
        const provider = config?.provider ?? 'copilot';
        const session = AgentSession.uri(provider, generateUuid());
        await this._sendRequest('createSession', {
            session: session.toString(),
            provider,
            model: config?.model,
            workingDirectory: config?.workingDirectory,
        });
        return session;
    }
    /**
     * Push a GitHub auth token to the remote agent host.
     */
    async setAuthToken(token) {
        this._sendExtensionNotification('setAuthToken', { token });
    }
    /**
     * Refresh the model list from all providers on the remote host.
     */
    async refreshModels() {
        await this._sendExtensionRequest('refreshModels');
    }
    /**
     * Discover available agent backends from the remote host.
     */
    async listAgents() {
        return await this._sendExtensionRequest('listAgents');
    }
    /**
     * Gracefully shut down all sessions on the remote host.
     */
    async shutdown() {
        await this._sendExtensionRequest('shutdown');
    }
    /**
     * Dispose a session on the remote agent host.
     */
    async disposeSession(session) {
        await this._sendRequest('disposeSession', { session: session.toString() });
    }
    /**
     * List all sessions from the remote agent host.
     */
    async listSessions() {
        const result = await this._sendRequest('listSessions', {});
        return result.items.map((s) => ({
            session: URI.parse(s.resource),
            startTime: s.createdAt,
            modifiedTime: s.modifiedAt,
            summary: s.title,
        }));
    }
    /**
     * List the contents of a directory on the remote host's filesystem.
     */
    async browseDirectory(uri) {
        return await this._sendRequest('browseDirectory', { uri: uri.toString() });
    }
    _handleMessage(msg) {
        if (isJsonRpcResponse(msg)) {
            const pending = this._pendingRequests.get(msg.id);
            if (pending) {
                this._pendingRequests.delete(msg.id);
                if (hasKey(msg, { error: true })) {
                    this._logService.warn(`[RemoteAgentHostProtocol] Request ${msg.id} failed:`, msg.error);
                    pending.error(new Error(msg.error.message));
                }
                else {
                    pending.complete(msg.result);
                }
            }
            else {
                this._logService.warn(`[RemoteAgentHostProtocol] Received response for unknown request id ${msg.id}`);
            }
        }
        else if (isJsonRpcNotification(msg)) {
            switch (msg.method) {
                case 'action': {
                    // Protocol envelope → VS Code envelope (superset of action types)
                    const envelope = msg.params;
                    this._serverSeq = Math.max(this._serverSeq, envelope.serverSeq);
                    this._onDidAction.fire(envelope);
                    break;
                }
                case 'notification': {
                    const notification = msg.params.notification;
                    this._logService.trace(`[RemoteAgentHostProtocol] Notification: ${notification.type}`);
                    this._onDidNotification.fire(notification);
                    break;
                }
                default:
                    this._logService.trace(`[RemoteAgentHostProtocol] Unhandled method: ${msg.method}`);
                    break;
            }
        }
        else {
            this._logService.warn(`[RemoteAgentHostProtocol] Unrecognized message:`, JSON.stringify(msg));
        }
    }
    /** Send a typed JSON-RPC notification for a protocol-defined method. */
    _sendNotification(method, params) {
        // Generic M can't satisfy the distributive IAhpNotification union directly
        // eslint-disable-next-line local/code-no-dangerous-type-assertions
        this._transport.send({ jsonrpc: '2.0', method, params });
    }
    /** Send a JSON-RPC notification for a VS Code extension method (not in the protocol spec). */
    _sendExtensionNotification(method, params) {
        // Cast: extension methods aren't in the typed protocol maps yet
        // eslint-disable-next-line local/code-no-dangerous-type-assertions
        this._transport.send({ jsonrpc: '2.0', method, params });
    }
    /** Send a typed JSON-RPC request for a protocol-defined method. */
    _sendRequest(method, params) {
        const id = this._nextRequestId++;
        const deferred = new DeferredPromise();
        this._pendingRequests.set(id, deferred);
        // Generic M can't satisfy the distributive IAhpRequest union directly
        // eslint-disable-next-line local/code-no-dangerous-type-assertions
        this._transport.send({ jsonrpc: '2.0', id, method, params });
        return deferred.p;
    }
    /** Send a JSON-RPC request for a VS Code extension method (not in the protocol spec). */
    _sendExtensionRequest(method, params) {
        const id = this._nextRequestId++;
        const deferred = new DeferredPromise();
        this._pendingRequests.set(id, deferred);
        // Cast: extension methods aren't in the typed protocol maps yet
        // eslint-disable-next-line local/code-no-dangerous-type-assertions
        this._transport.send({ jsonrpc: '2.0', id, method, params });
        return deferred.p;
    }
    /**
     * Get the next client sequence number for optimistic dispatch.
     */
    nextClientSeq() {
        return this._nextClientSeq++;
    }
};
RemoteAgentHostProtocolClient = __decorate([
    __param(2, ILogService)
], RemoteAgentHostProtocolClient);
export { RemoteAgentHostProtocolClient };
//# sourceMappingURL=remoteAgentHostProtocolClient.js.map