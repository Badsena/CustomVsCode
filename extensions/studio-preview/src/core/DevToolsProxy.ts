/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as http from 'http';
import * as zlib from 'zlib';
import * as fs from 'fs';

/**
 * ══════════════════════════════════════════════════
 * DevToolsProxy — Injects eruda.js into student apps
 * ══════════════════════════════════════════════════
 *
 * A lightweight HTTP reverse proxy that sits between the
 * Amypo Browser iframe and the student's dev server.
 *
 * For HTML responses, it injects the eruda.js script tag
 * so students get full DevTools (Console, Network, Elements)
 * scoped to THEIR app only — no AmypoCoder internals exposed.
 */
export class DevToolsProxy {
	private _server: http.Server | undefined;
	private _proxyPort: number = 0;
	private _targetPort: number = 0;
	private _erudaFilePath: string = '';

	public get proxyPort(): number {
		return this._proxyPort;
	}

	public get isRunning(): boolean {
		return !!this._server;
	}

	/**
	 * Start the proxy server targeting a student's dev server port.
	 * Returns the proxy's own port (randomly assigned).
	 */
	public async start(targetPort: number, erudaFilePath: string): Promise<number> {
		// If already proxying the same port, return existing
		if (this._server && this._targetPort === targetPort) {
			return this._proxyPort;
		}
 
		// Stop any existing proxy first
		await this.stop();
		this._targetPort = targetPort;
		this._erudaFilePath = erudaFilePath;

		return new Promise<number>((resolve, reject) => {
			this._server = http.createServer((clientReq, clientRes) => {
				this._handleRequest(clientReq, clientRes);
			});

			// ── WebSocket upgrade support (HMR for React/Vite) ──
			this._server.on('upgrade', (req, socket, _head) => {
				const proxyReq = http.request({
					hostname: 'localhost',
					port: this._targetPort,
					path: req.url,
					method: req.method,
					headers: req.headers,
				});

				proxyReq.on('upgrade', (proxyRes, proxySocket, _proxyHead) => {
					socket.write(
						`HTTP/${proxyRes.httpVersion} ${proxyRes.statusCode || 101} ${proxyRes.statusMessage || 'Switching Protocols'}\r\n` +
						Object.entries(proxyRes.headers)
							.map(([k, v]) => `${k}: ${v}`)
							.join('\r\n') +
						'\r\n\r\n'
					);
					proxySocket.pipe(socket);
					socket.pipe(proxySocket);
				});

				proxyReq.on('error', () => {
					socket.destroy();
				});

				proxyReq.end();
			});

			this._server.on('error', (err) => {
				console.error('[DevToolsProxy] Server error:', err);
				reject(err);
			});

			// Listen on port 0 = OS assigns a random available port
			this._server.listen(0, '127.0.0.1', () => {
				const addr = this._server!.address();
				if (addr && typeof addr !== 'string') {
					this._proxyPort = addr.port;
				}
				console.log(`[DevToolsProxy] Proxying localhost:${this._targetPort} → localhost:${this._proxyPort}`);
				resolve(this._proxyPort);
			});
		});
	}

	/**
	 * Stop the proxy server and clean up.
	 */
	public stop(): Promise<void> {
		return new Promise((resolve) => {
			if (this._server) {
				this._server.close(() => {
					this._server = undefined;
					this._proxyPort = 0;
					this._targetPort = 0;
					console.log('[DevToolsProxy] Stopped');
					resolve();
				});
				// Force close after 1s if graceful shutdown stalls
				setTimeout(() => {
					this._server = undefined;
					resolve();
				}, 1000);
			} else {
				resolve();
			}
		});
	}

	/**
	 * Handle an incoming proxy request.
	 */
	private _handleRequest(clientReq: http.IncomingMessage, clientRes: http.ServerResponse): void {
		// ── Serve local eruda.js directly from the proxy ──
		if (clientReq.url === '/__amypo__/eruda.js') {
			if (fs.existsSync(this._erudaFilePath)) {
				clientRes.writeHead(200, { 'Content-Type': 'application/javascript' });
				fs.createReadStream(this._erudaFilePath).pipe(clientRes);
			} else {
				clientRes.writeHead(404);
				clientRes.end('eruda.js not found');
			}
			return;
		}

		const options: http.RequestOptions = {
			hostname: 'localhost',
			port: this._targetPort,
			path: clientReq.url,
			method: clientReq.method,
			headers: {
				...clientReq.headers,
				host: `localhost:${this._targetPort}`,
			},
		};

		// Remove accept-encoding to get plain text (easier to inject)
		// We'll handle compression ourselves on the response
		(options.headers as Record<string, any>)['accept-encoding'] = 'identity';

		const proxyReq = http.request(options, (proxyRes) => {
			const contentType = (proxyRes.headers['content-type'] || '').toLowerCase();
			const acceptHeader = (clientReq.headers['accept'] || '').toLowerCase();
			const secFetchDest = (clientReq.headers['sec-fetch-dest'] || '').toLowerCase();

			const isHtml = contentType.includes('text/html');
			const isJson = contentType.includes('application/json');
			const isPlain = contentType.includes('text/plain');

			// ✅ Should we wrap this in HTML to show DevTools?
			// Only for main document/iframe requests, not sub-resources like JS/CSS/Images
			const isDocument = acceptHeader.includes('text/html') || secFetchDest === 'iframe' || secFetchDest === 'document';
			const shouldWrap = isDocument && (isJson || isPlain);

			if (isHtml || shouldWrap) {
				// ── HTML or Wrappable response: buffer, inject eruda, forward ──
				this._injectEruda(proxyRes, clientRes, isHtml);
			} else {
				// ── Non-HTML sub-resource: pipe through unchanged ──
				clientRes.writeHead(proxyRes.statusCode || 200, proxyRes.headers);
				proxyRes.pipe(clientRes);
			}
		});

		proxyReq.on('error', (err) => {
			console.error('[DevToolsProxy] Proxy request error:', err.message);
			clientRes.writeHead(502, { 'Content-Type': 'text/plain' });
			clientRes.end(`DevTools Proxy Error: Cannot reach localhost:${this._targetPort}\n${err.message}`);
		});

		// Forward request body
		clientReq.pipe(proxyReq);
	}

	/**
	 * Buffer an HTML response, inject eruda.js, and send to client.
	 */
	private _injectEruda(proxyRes: http.IncomingMessage, clientRes: http.ServerResponse, isHtml: boolean): void {
		const chunks: Buffer[] = [];
		const encoding = (proxyRes.headers['content-encoding'] || '').toLowerCase();

		let stream: NodeJS.ReadableStream = proxyRes;

		// Decompress if needed
		if (encoding === 'gzip') {
			stream = proxyRes.pipe(zlib.createGunzip());
		} else if (encoding === 'deflate') {
			stream = proxyRes.pipe(zlib.createInflate());
		} else if (encoding === 'br') {
			stream = proxyRes.pipe(zlib.createBrotliDecompress());
		}

		stream.on('data', (chunk: Buffer) => {
			chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
		});

		stream.on('end', () => {
			let rawData = Buffer.concat(chunks).toString('utf8');
			let html = rawData;

			// ── If not HTML (e.g. JSON/Text), wrap in a basic shell so eruda can load ──
			if (!isHtml) {
				html = `<!DOCTYPE html><html><head><title>Amypo DevTools Proxy</title></head><body><pre style="word-wrap: break-word; white-space: pre-wrap;">${rawData}</pre></body></html>`;
			}

			// ── Inject eruda.js ──
			const erudaScript = `
<!-- Amypo DevTools: eruda.js injection -->
<script src="/__amypo__/eruda.js"></script>
<script>
  try {
    if (typeof eruda !== 'undefined') {
      eruda.init({
        tool: ['console', 'network', 'elements', 'resources'],
        useShadowDom: true,
        autoScale: true
      });
      eruda.show();
    }
  } catch(e) { console.warn('eruda init failed:', e); }
</script>`;

			// Try to inject before </head>, fallback to before </body>, fallback to end
			if (html.includes('</head>')) {
				html = html.replace('</head>', erudaScript + '\n</head>');
			} else if (html.includes('</body>')) {
				html = html.replace('</body>', erudaScript + '\n</body>');
			} else {
				html += erudaScript;
			}

			// Build response headers (remove original encoding since we decompressed)
			const headers: http.OutgoingHttpHeaders = { ...proxyRes.headers };
			delete headers['content-encoding'];
			delete headers['content-length'];
			headers['content-length'] = Buffer.byteLength(html, 'utf8');

			clientRes.writeHead(proxyRes.statusCode || 200, headers);
			clientRes.end(html, 'utf8');
		});

		stream.on('error', (err) => {
			console.error('[DevToolsProxy] Stream error:', err.message);
			clientRes.writeHead(500, { 'Content-Type': 'text/plain' });
			clientRes.end('DevTools Proxy: Error processing response');
		});
	}
}
