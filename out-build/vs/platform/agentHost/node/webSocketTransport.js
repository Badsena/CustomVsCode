/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
// WebSocket transport for the sessions process protocol.
// Uses JSON serialization with URI revival for cross-process communication.
import { Emitter } from '../../../base/common/event.js';
import { Disposable } from '../../../base/common/lifecycle.js';
import { connectionTokenQueryName } from '../../../base/common/network.js';
import { JSON_RPC_PARSE_ERROR } from '../common/state/sessionProtocol.js';
// ---- Per-connection transport -----------------------------------------------
/**
 * Wraps a single WebSocket connection as an {@link IProtocolTransport}.
 * Messages are serialized as JSON with URI revival.
 */
export class WebSocketProtocolTransport extends Disposable {
    constructor(_ws, _WebSocket) {
        super();
        this._ws = _ws;
        this._WebSocket = _WebSocket;
        this._onMessage = this._register(new Emitter());
        this.onMessage = this._onMessage.event;
        this._onClose = this._register(new Emitter());
        this.onClose = this._onClose.event;
        this._ws.on('message', (data) => {
            try {
                const text = typeof data === 'string' ? data : data.toString('utf-8');
                const message = JSON.parse(text);
                this._onMessage.fire(message);
            }
            catch {
                this.send({ jsonrpc: '2.0', id: null, error: { code: JSON_RPC_PARSE_ERROR, message: 'Parse error' } });
            }
        });
        this._ws.on('close', () => {
            this._onClose.fire();
        });
        this._ws.on('error', () => {
            // Error always precedes close — closing is handled in the close handler.
            this._onClose.fire();
        });
    }
    send(message) {
        if (this._ws.readyState === this._WebSocket.OPEN) {
            this._ws.send(JSON.stringify(message));
        }
    }
    dispose() {
        this._ws.close();
        super.dispose();
    }
}
// ---- Server -----------------------------------------------------------------
/**
 * WebSocket server that accepts client connections and wraps each one
 * as an {@link IProtocolTransport}.
 *
 * Use the static {@link create} method to construct — it dynamically imports
 * `ws` and `http`/`url` so the modules are only loaded when needed.
 */
export class WebSocketProtocolServer extends Disposable {
    get address() {
        const addr = this._wss.address();
        if (!addr || typeof addr === 'string') {
            return addr ?? undefined;
        }
        return `${addr.address}:${addr.port}`;
    }
    /**
     * Creates a new WebSocket protocol server. Dynamically imports `ws`,
     * `http`, and `url` so callers don't pay the cost when unused.
     */
    static async create(options, logService) {
        const [ws, http, url] = await Promise.all([
            import('ws'),
            import('http'),
            import('url'),
        ]);
        return new WebSocketProtocolServer(options, logService, ws, http, url);
    }
    constructor(options, _logService, ws, http, url) {
        super();
        this._logService = _logService;
        this._onConnection = this._register(new Emitter());
        this.onConnection = this._onConnection.event;
        this._WebSocket = ws.WebSocket;
        // Backwards compat: accept a plain port number
        const opts = typeof options === 'number' ? { port: options } : options;
        const host = opts.host ?? '127.0.0.1';
        const verifyClient = opts.connectionTokenValidate
            ? (info, cb) => {
                const parsedUrl = url.parse(info.req.url ?? '', true);
                const token = parsedUrl.query[connectionTokenQueryName];
                if (!opts.connectionTokenValidate(token)) {
                    this._logService.warn('[WebSocketProtocol] Connection rejected: invalid connection token');
                    cb(false, 403, 'Forbidden');
                    return;
                }
                cb(true);
            }
            : undefined;
        if (opts.socketPath) {
            // For socket paths, create an HTTP server listening on the path
            // and attach the WebSocket server to it.
            this._httpServer = http.createServer();
            this._wss = new ws.WebSocketServer({ server: this._httpServer, verifyClient });
            this._httpServer.listen(opts.socketPath, () => {
                this._logService.info(`[WebSocketProtocol] Server listening on socket ${opts.socketPath}`);
            });
        }
        else {
            this._wss = new ws.WebSocketServer({ port: opts.port, host, verifyClient });
            this._logService.info(`[WebSocketProtocol] Server listening on ${host}:${opts.port}`);
        }
        this._wss.on('connection', (wsConn) => {
            this._logService.trace('[WebSocketProtocol] New client connection');
            const transport = new WebSocketProtocolTransport(wsConn, this._WebSocket);
            this._onConnection.fire(transport);
        });
        this._wss.on('error', (err) => {
            this._logService.error('[WebSocketProtocol] Server error', err);
        });
    }
    dispose() {
        this._wss.close();
        this._httpServer?.close();
        super.dispose();
    }
}
//# sourceMappingURL=webSocketTransport.js.map