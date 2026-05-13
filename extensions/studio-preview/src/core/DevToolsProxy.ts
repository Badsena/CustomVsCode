/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as http from 'http';
import * as zlib from 'zlib';
import { Socket } from 'net';

/**
 * ══════════════════════════════════════════════════
 * DevToolsProxy — Injects Chii into student apps
 * ══════════════════════════════════════════════════
 */
export class DevToolsProxy {
	private _server: http.Server | undefined;
	private _proxyPort: number = 0;
	private _targetPort: number = 0;
	private _chiiServer: http.Server | undefined;
	private _chiiPort: number = 0;
    private _connections = new Set<Socket>();
    public onNavigate: ((path: string) => void) | undefined;

	public get proxyPort(): number {
		return this._proxyPort;
	}

	public get chiiPort(): number {
		return this._chiiPort;
	}

	public async start(targetPort: number): Promise<number> {
		if (this._server && this._targetPort === targetPort) {
			return this._proxyPort;
		}
 
		await this.stop();
		this._targetPort = targetPort;

        this._server = http.createServer((clientReq, clientRes) => {
            this._handleRequest(clientReq, clientRes);
        });

        // 🟢 Track connections for clean shutdown
        this._server.on('connection', (socket) => {
            this._connections.add(socket);
            socket.on('close', () => this._connections.delete(socket));
        });

        this._server.on('upgrade', (req, socket, head) => {
            const isChii = req.url && req.url.includes('/__amypo_chii__/');
            const targetPort = isChii ? this._chiiPort : this._targetPort;
            // ✅ Fix: Keep the full URL for Chii, only replace for the student app
            const realUrl = isChii ? req.url : req.url; 

            const headers = { ...req.headers };
            headers['host'] = `127.0.0.1:${targetPort}`;
            if (headers.origin) {
                headers.origin = `http://127.0.0.1:${targetPort}`;
            }

            const proxyReq = http.request({
                hostname: '127.0.0.1',
                port: targetPort,
                path: realUrl,
                method: req.method,
                headers: headers,
            });

            proxyReq.on('upgrade', (proxyRes, proxySocket, proxyHead) => {
                let response = `HTTP/${proxyRes.httpVersion} ${proxyRes.statusCode || 101} ${proxyRes.statusMessage || 'Switching Protocols'}\r\n`;
                for (const [key, value] of Object.entries(proxyRes.headers)) {
                    if (Array.isArray(value)) {
                        for (const v of value) response += `${key}: ${v}\r\n`;
                    } else {
                        response += `${key}: ${value}\r\n`;
                    }
                }
                response += '\r\n';
                
                socket.write(response);
                if (proxyHead && proxyHead.length) socket.write(proxyHead);
                proxySocket.pipe(socket);
                socket.pipe(proxySocket);
            });

            proxyReq.on('error', (err) => {
                console.error('[DevToolsProxy] WebSocket proxy error:', err.message);
                socket.destroy();
            });

            proxyReq.end(head);
        });

        await new Promise<void>((resolve, reject) => {
            this._server!.listen(0, '127.0.0.1', () => {
                this._proxyPort = (this._server!.address() as any).port;
                console.log(`[DevToolsProxy] Proxy Server started on localhost:${this._proxyPort}`);
                resolve();
            });
            this._server!.on('error', (err) => {
                console.error('[DevToolsProxy] Proxy Server error:', err);
                reject(err);
            });
        });

        await new Promise<void>((resolve, reject) => {
            try {
                const chii = require('chii');
                this._chiiServer = http.createServer();
                
                this._chiiServer.on('error', (err) => {
                    console.error('[DevToolsProxy] Chii Server error:', err);
                    reject(err);
                });

                this._chiiServer.listen(0, '127.0.0.1', async () => {
                    try {
                        this._chiiPort = (this._chiiServer!.address() as any).port;
                        await chii.start({ 
                            server: this._chiiServer,
                            domain: `localhost:${this._proxyPort}`,
                            basePath: '/__amypo_chii__/'
                        });
                        
                        console.log(`[DevToolsProxy] Chii DevTools backend started at 127.0.0.1:${this._chiiPort}`);
                        resolve();
                    } catch (err) {
                        console.error('[DevToolsProxy] Failed to start Chii:', err);
                        reject(err);
                    }
                });
            } catch (err) {
                console.error('[DevToolsProxy] Failed to load Chii:', err);
                reject(err);
            }
        });

        return this._proxyPort;
	}

	public stop(): Promise<void> {
		return new Promise((resolve) => {
            let resolved = false;
            const done = () => {
                if (resolved) return;
                resolved = true;
                this._server = undefined;
                this._proxyPort = 0;
                this._targetPort = 0;
                this._connections.clear();
                resolve();
            };

			if (this._chiiServer) {
				this._chiiServer.close();
				this._chiiServer = undefined;
				this._chiiPort = 0;
			}
			
			if (this._server) {
                // 🟢 Destroy all active connections
                this._connections.forEach(s => s.destroy());
				this._server.close(() => {
					console.log('[DevToolsProxy] Stopped gracefully');
					done();
				});
				setTimeout(() => {
                    (this._server as any)?.closeAllConnections?.();
					done();
				}, 1000);
			} else {
				resolve();
			}
		});
	}

    private _cleanHeaders(headers: http.IncomingHttpHeaders): http.OutgoingHttpHeaders {
        const clean: any = { ...headers };
        delete clean['x-frame-options'];
        delete clean['content-security-policy'];
        delete clean['content-security-policy-report-only'];
        delete clean['x-content-security-policy'];
        delete clean['x-webkit-csp'];
        return clean;
    }

	private _handleRequest(clientReq: http.IncomingMessage, clientRes: http.ServerResponse): void {
		if (clientReq.url && clientReq.url.startsWith('/__amypo_cors_proxy__/')) {
			if (clientReq.method === 'OPTIONS') {
				clientRes.setHeader('Access-Control-Allow-Origin', '*');
				clientRes.setHeader('Access-Control-Allow-Methods', '*');
				clientRes.setHeader('Access-Control-Allow-Headers', '*');
				clientRes.writeHead(200);
				clientRes.end();
				return;
			}

			const match = clientReq.url.match(/^\/__amypo_cors_proxy__\/(\d+)(.*)/);
			if (match) {
				const backendPort = parseInt(match[1], 10);
				const realPath = match[2] || '/';

				const headers = { ...clientReq.headers };
				headers['host'] = `127.0.0.1:${backendPort}`;
				headers.origin = `http://127.0.0.1:${backendPort}`;
				if (headers.referer) {
					headers.referer = `http://127.0.0.1:${backendPort}/`;
				}
				delete headers['sec-fetch-site'];
				delete headers['sec-fetch-mode'];
				delete headers['sec-fetch-dest'];

				const options: http.RequestOptions = {
					hostname: '127.0.0.1',
					port: backendPort,
					path: realPath,
					method: clientReq.method,
					headers: headers,
				};

				const proxyReq = http.request(options as any, (proxyRes) => {
					clientRes.setHeader('Access-Control-Allow-Origin', '*');
					clientRes.setHeader('Access-Control-Allow-Methods', '*');
					clientRes.setHeader('Access-Control-Allow-Headers', '*');
					
					clientRes.writeHead(proxyRes.statusCode || 200, this._cleanHeaders(proxyRes.headers));
					proxyRes.pipe(clientRes);
				});

				proxyReq.on('error', (err) => {
                    if (!clientRes.headersSent) {
                        clientRes.writeHead(502);
                        clientRes.end('CORS Proxy Error: ' + err.message);
                    }
				});

				clientReq.pipe(proxyReq);
				return;
			}
		}

		const referer = clientReq.headers['referer'] || '';
		const isChiiRequest = clientReq.url?.startsWith('/__amypo_chii__/');

		if (isChiiRequest) {
			const chiiPath = clientReq.url || '/'; 
			const headers = { ...clientReq.headers };
			headers['host'] = `127.0.0.1:${this._chiiPort}`;
			headers['accept-encoding'] = 'identity';

			const options: http.RequestOptions = {
				hostname: '127.0.0.1',
				port: this._chiiPort,
				path: chiiPath,
				method: clientReq.method,
				headers: headers,
			};

			const proxyReq = http.request(options as any, (proxyRes) => {
				const contentType = (proxyRes.headers['content-type'] || '').toLowerCase();
				const isHtml = contentType.includes('text/html');

				if (isHtml) {
					const chunks: Buffer[] = [];
					proxyRes.on('data', chunk => chunks.push(chunk));
					proxyRes.on('end', () => {
						let html = Buffer.concat(chunks).toString('utf8');
						const headFix = `
<base href="/__amypo_chii__/">
<script>
  window.basePath = '/__amypo_chii__/';
  window.open = function(url) { 
    if (url.startsWith('/') && !url.startsWith('/__amypo_chii__/')) {
      url = '/__amypo_chii__' + url;
    }
    window.location.href = url; 
    return null; 
  };

  let autoInspectTimer;
  async function autoInspect() {
    try {
      const res = await fetch('/__amypo_chii__/targets');
      const data = await res.json();
      if (data.targets && data.targets.length > 0) {
        const target = data.targets[0]; 
        const currentUrl = window.location.href;
        if (!currentUrl.includes('target=' + target.id)) {
          const wsUrl = window.location.host + '/__amypo_chii__/client/' + target.id + '?target=' + target.id;
          const inspectUrl = '/__amypo_chii__/front_end/chii_app.html?ws=' + encodeURIComponent(wsUrl);
          window.location.href = inspectUrl;
        }
      }
    } catch (e) {}
    autoInspectTimer = setTimeout(autoInspect, 200);
  }
  autoInspect();
  window.addEventListener('beforeunload', () => { clearTimeout(autoInspectTimer); });
</script>`;
						html = html.replace('<head>', '<head>' + headFix);
						clientRes.writeHead(200, { 'Content-Type': 'text/html' });
						clientRes.end(html);
					});
				} else {
					clientRes.writeHead(proxyRes.statusCode || 200, this._cleanHeaders(proxyRes.headers));
					proxyRes.pipe(clientRes);
				}
			});
			proxyReq.on('error', (err) => {
                if (!clientRes.headersSent) {
                    clientRes.writeHead(502);
                    clientRes.end('Chii Proxy Error: ' + err.message);
                }
			});
			clientReq.pipe(proxyReq);
			return;
		}

		const headers = { ...clientReq.headers };
		headers['host'] = `localhost:${this._targetPort}`;
		
		if (headers.origin) {
			headers.origin = `http://localhost:${this._targetPort}`;
		}
		if (headers.referer) {
			headers.referer = (headers.referer as string).replace(`localhost:${this._proxyPort}`, `localhost:${this._targetPort}`);
		}

		const options: http.RequestOptions = {
			hostname: '127.0.0.1',
			port: this._targetPort,
			path: clientReq.url,
			method: clientReq.method,
			headers: headers,
		};

        (options.headers as any)['accept-encoding'] = 'identity';

		const proxyReq = http.request(options as any, (proxyRes) => {
			const contentType = (proxyRes.headers['content-type'] || '').toLowerCase();
			const acceptHeader = (clientReq.headers['accept'] || '').toLowerCase();
			const secFetchDest = (clientReq.headers['sec-fetch-dest'] || '').toLowerCase();

            const url = clientReq.url || '';
            const isAsset = /\.(js|ts|jsx|tsx|css|png|jpg|svg|ico|woff|json|map)(\?.*)?$/.test(url);
            
			const isHtml = contentType.includes('text/html') && !isAsset;
			const isJson = contentType.includes('application/json');
			const isPlain = contentType.includes('text/plain');

			const isDocument = acceptHeader.includes('text/html') || secFetchDest === 'iframe' || secFetchDest === 'document';
			const shouldWrap = isDocument && (isJson || isPlain) && !isAsset;

			if (isHtml || shouldWrap) {
                // ✅ Notify parent of navigation at the server level
                if (this.onNavigate) {
                    this.onNavigate(clientReq.url || '/');
                }
				this._injectDevTools(proxyRes, clientRes, isHtml);
			} else {
				clientRes.writeHead(proxyRes.statusCode || 200, this._cleanHeaders(proxyRes.headers));
				proxyRes.pipe(clientRes);
			}
		});

        proxyReq.setTimeout(10000, () => {
            proxyReq.destroy();
            if (!clientRes.headersSent) {
                clientRes.writeHead(504, { 'Content-Type': 'text/plain' });
                clientRes.end('Gateway Timeout');
            }
        });

		proxyReq.on('error', (err) => {
            if (!clientRes.headersSent) {
                clientRes.writeHead(502, { 'Content-Type': 'text/plain' });
                clientRes.end(`DevTools Proxy Error: Cannot reach localhost:${this._targetPort}\n${err.message}`);
            }
		});

		clientReq.pipe(proxyReq);
	}

	private _injectDevTools(proxyRes: http.IncomingMessage, clientRes: http.ServerResponse, isHtml: boolean): void {
		const chunks: Buffer[] = [];
        const encoding = (proxyRes.headers['content-encoding'] || '').toLowerCase();
  
        let stream: NodeJS.ReadableStream = proxyRes;
        if (encoding === 'gzip') stream = proxyRes.pipe(zlib.createGunzip());
        else if (encoding === 'br') stream = proxyRes.pipe(zlib.createBrotliDecompress());
        else if (encoding === 'deflate') stream = proxyRes.pipe(zlib.createInflate());

        // 🟡 Fix 3: Large file buffer guard
        const MAX_BUFFER = 10 * 1024 * 1024; // 10MB
        let totalSize = 0;
        let limitExceeded = false;

		stream.on('data', (chunk: Buffer) => {
            totalSize += chunk.length;
            if (totalSize > MAX_BUFFER && !limitExceeded) {
                limitExceeded = true;
                // Too large — fallback to direct pipe for what's left
                console.warn(`[DevToolsProxy] File too large (${totalSize} bytes), skipping injection.`);
            }
            if (!limitExceeded) {
                chunks.push(chunk);
            }
        });

		stream.on('end', () => {
            if (limitExceeded) {
                const resHeaders = this._cleanHeaders(proxyRes.headers);
                clientRes.writeHead(proxyRes.statusCode || 200, resHeaders);
                clientRes.end(Buffer.concat(chunks));
                return;
            }

			const rawData = Buffer.concat(chunks).toString('utf8');
			let html = rawData;

			if (!isHtml) {
                const escapeHtml = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
				html = `<!DOCTYPE html><html><head><title>Amypo DevTools Proxy</title></head><body><pre style="word-wrap: break-word; white-space: pre-wrap;">${escapeHtml(rawData)}</pre></body></html>`;
			}

            const historyShield = `
<script>
(function() {
  // 🛡️ Advanced History Shield: Completely hide debugger paths from React Router
  const isChii = (url) => {
    if (!url) return false;
    const urlStr = String(url);
    return urlStr.includes('__amypo_chii__') || urlStr.includes('target=');
  };

  const notifyParent = () => {
    try {
      window.parent.postMessage({ 
        type: 'urlChanged', 
        url: window.location.href,
        path: window.location.pathname + window.location.search + window.location.hash
      }, '*');
    } catch (e) {}
  };

  const _push = history.pushState.bind(history);
  const _replace = history.replaceState.bind(history);

  history.pushState = function(state, title, url) {
    const result = _push.apply(history, arguments);
    if (!isChii(url)) notifyParent();
    return result;
  };

  history.replaceState = function(state, title, url) {
    const result = _replace.apply(history, arguments);
    if (!isChii(url)) notifyParent();
    return result;
  };

  window.addEventListener('popstate', notifyParent);
  window.addEventListener('hashchange', notifyParent);
  window.addEventListener('click', () => setTimeout(notifyParent, 100));
  window.addEventListener('submit', () => setTimeout(notifyParent, 100));
  
  // 🕒 Periodically check for changes just in case
  setInterval(notifyParent, 500);

  // Initial notification
  if (document.readyState === 'complete') notifyParent();
  else window.addEventListener('load', notifyParent);

  // 🛡️ Navigation Guard: Prevent the app from accidentally loading the debugger in its own frame
  if (window.location.pathname.includes('__amypo_chii__')) {
    window.stop();
    window.location.href = '/'; 
    return;
  }

  const suppress = (args) => ['__amypo_chii__','Future Flag','No routes matched','v7_relativeSplatPath','v7_startTransition'].some(p => args.map(String).join(' ').includes(p));
  const _warn = console.warn;
  const _error = console.error;
  console.warn  = (...a) => suppress(a) ? null : _warn(...a);
  console.error = (...a) => suppress(a) ? null : _error(...a);
})();
</script>
<script src="/__amypo_chii__/target.js"></script>`;

			const devToolsScript = `
<script>
(function() {
  const proxyPort = ${this._proxyPort};
  const origFetch = window.fetch;
  window.fetch = function(...args) {
    if (typeof args[0] === 'string') {
      const match = args[0].match(/^http:\\/\\/(localhost|127\\.0\\.0\\.1):(\\d+)(.*)/);
      if (match && parseInt(match[2]) !== proxyPort) {
        args[0] = '/__amypo_cors_proxy__/' + match[2] + match[3];
      }
    }
    return origFetch.apply(this, args);
  };
  const origOpen = XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open = function(method, url, ...rest) {
    if (typeof url === 'string') {
      const match = url.match(/^http:\\/\\/(localhost|127\\.0\\.0\\.1):(\\d+)(.*)/);
      if (match && parseInt(match[2]) !== proxyPort) {
        url = '/__amypo_cors_proxy__/' + match[2] + match[3];
      }
    }
    return origOpen.call(this, method, url, ...rest);
  };
  window.alert = (msg) => { console.log('[Amypo Sandbox] Alert: ' + msg); };
})();
</script>`;

			if (html.match(/<head[^>]*>/i)) {
				html = html.replace(/(<head[^>]*>)/i, '$1\n' + historyShield + '\n' + devToolsScript);
			} else {
				html = historyShield + '\n' + devToolsScript + html;
			}

            // 🔴 Fix 1 & 2: Content-Type override and header cleanup
			const headers = this._cleanHeaders(proxyRes.headers);
			delete headers['content-encoding'];
			delete headers['content-length'];
			headers['content-length'] = Buffer.byteLength(html, 'utf8').toString();
            
            if (!isHtml) {
                headers['content-type'] = 'text/html; charset=utf-8';
            }

			clientRes.writeHead(proxyRes.statusCode || 200, headers);
			clientRes.end(html, 'utf8');
		});

        stream.on('error', (err) => {
            if (!clientRes.headersSent) {
                clientRes.writeHead(500);
                clientRes.end('Decompression error: ' + err.message);
            }
        });
	}
}
