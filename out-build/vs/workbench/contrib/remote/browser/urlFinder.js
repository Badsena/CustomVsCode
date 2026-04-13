/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Emitter } from '../../../../base/common/event.js';
import { Disposable, DisposableMap } from '../../../../base/common/lifecycle.js';
import { removeAnsiEscapeCodes } from '../../../../base/common/strings.js';
import { RunOnceWorker } from '../../../../base/common/async.js';
export class UrlFinder extends Disposable {
    /**
     * Debounce time in ms before processing accumulated terminal data.
     */
    static { this.dataDebounceTimeout = 500; }
    /**
     * Maximum amount of data to accumulate before skipping URL detection.
     * When data exceeds this threshold, it indicates high-throughput scenarios
     * (like games or animations) where URL detection is unlikely to find useful results.
     */
    static { this.maxDataLength = 10000; }
    /**
     * Local server url pattern matching following urls:
     * http://localhost:3000/ - commonly used across multiple frameworks
     * https://127.0.0.1:5001/ - ASP.NET
     * http://:8080 - Beego Golang
     * http://0.0.0.0:4000 - Elixir Phoenix
     */
    static { this.localUrlRegex = /\b\w{0,20}(?::\/\/)?(?:localhost|127\.0\.0\.1|0\.0\.0\.0|:\d{2,5})[\w\-\.\~:\/\?\#[\]\@!\$&\(\)\*\+\,\;\=]*/gim; }
    static { this.extractPortRegex = /(localhost|127\.0\.0\.1|0\.0\.0\.0):(\d{1,5})/; }
    /**
     * https://github.com/microsoft/vscode-remote-release/issues/3949
     */
    static { this.localPythonServerRegex = /HTTP\son\s(127\.0\.0\.1|0\.0\.0\.0)\sport\s(\d+)/; }
    static { this.localGenericPortRegex = /(?:listening on|port|at|started|running|available|server|bound|address|serving)\s+(?:http:\/\/\S+:)?(?::|#)?(\d{2,5})\b/i; }
    static { this.localSpringBootRegex = /Tomcat started on port[s]?\s*[\(\[]?(\d{2,5})/i; }
    static { this.localPhpRegex = /Development Server.*:(\d{2,5})/i; }
    static { this.excludeTerminals = ['Dev Containers']; }
    constructor(terminalService, debugService) {
        super();
        this._onDidMatchLocalUrl = this._register(new Emitter());
        this.onDidMatchLocalUrl = this._onDidMatchLocalUrl.event;
        this.listeners = new Map();
        this.terminalDataWorkers = this._register(new DisposableMap());
        this.replPositions = new Map();
        // Terminal
        terminalService.instances.forEach(instance => {
            this.registerTerminalInstance(instance);
        });
        this._register(terminalService.onDidCreateInstance(instance => {
            this.registerTerminalInstance(instance);
        }));
        this._register(terminalService.onDidDisposeInstance(instance => {
            this.listeners.get(instance)?.dispose();
            this.listeners.delete(instance);
            this.terminalDataWorkers.deleteAndDispose(instance);
        }));
        // Debug
        this._register(debugService.onDidNewSession(session => {
            if (!session.parentSession || (session.parentSession && session.hasSeparateRepl())) {
                this.listeners.set(session.getId(), session.onDidChangeReplElements(() => {
                    this.processNewReplElements(session);
                }));
            }
        }));
        this._register(debugService.onDidEndSession(({ session }) => {
            if (this.listeners.has(session.getId())) {
                this.listeners.get(session.getId())?.dispose();
                this.listeners.delete(session.getId());
            }
        }));
    }
    registerTerminalInstance(instance) {
        if (!UrlFinder.excludeTerminals.includes(instance.title)) {
            this.listeners.set(instance, instance.onData(data => {
                this.getOrCreateWorker(instance).work(data);
            }));
        }
    }
    getOrCreateWorker(instance) {
        let worker = this.terminalDataWorkers.get(instance);
        if (!worker) {
            worker = new RunOnceWorker(chunks => this.processTerminalData(chunks), UrlFinder.dataDebounceTimeout);
            this.terminalDataWorkers.set(instance, worker);
        }
        return worker;
    }
    processTerminalData(chunks) {
        // Skip processing if data exceeds threshold (high-throughput scenario like games)
        const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
        if (totalLength > UrlFinder.maxDataLength) {
            return;
        }
        this.processData(chunks.join(''));
    }
    processNewReplElements(session) {
        const oldReplPosition = this.replPositions.get(session.getId());
        const replElements = session.getReplElements();
        this.replPositions.set(session.getId(), { position: replElements.length - 1, tail: replElements[replElements.length - 1] });
        if (!oldReplPosition && replElements.length > 0) {
            replElements.forEach(element => this.processData(element.toString()));
        }
        else if (oldReplPosition && (replElements.length - 1 !== oldReplPosition.position)) {
            // Process lines until we reach the old "tail"
            for (let i = replElements.length - 1; i >= 0; i--) {
                const element = replElements[i];
                if (element === oldReplPosition.tail) {
                    break;
                }
                else {
                    this.processData(element.toString());
                }
            }
        }
    }
    dispose() {
        super.dispose();
        for (const listener of this.listeners.values()) {
            listener.dispose();
        }
    }
    processData(data) {
        // strip ANSI terminal codes
        data = removeAnsiEscapeCodes(data);
        const urlMatches = data.match(UrlFinder.localUrlRegex) || [];
        if (urlMatches && urlMatches.length > 0) {
            urlMatches.forEach((match) => {
                // check if valid url
                let serverUrl;
                try {
                    serverUrl = new URL(match);
                }
                catch (e) {
                    // Not a valid URL
                }
                if (serverUrl) {
                    // check if the port is a valid integer value
                    const portMatch = match.match(UrlFinder.extractPortRegex);
                    const port = parseFloat(serverUrl.port ? serverUrl.port : (portMatch ? portMatch[2] : 'NaN'));
                    if (!isNaN(port) && Number.isInteger(port) && port > 0 && port <= 65535) {
                        // normalize the host name
                        let host = serverUrl.hostname;
                        if (host !== '0.0.0.0' && host !== '127.0.0.1') {
                            host = 'localhost';
                        }
                        // Exclude node inspect, except when using default port
                        if (port !== 9229 && data.startsWith('Debugger listening on')) {
                            return;
                        }
                        this._onDidMatchLocalUrl.fire({ port, host });
                    }
                }
            });
        }
        else {
            // Try Spring Boot (Java)
            const springMatch = data.match(UrlFinder.localSpringBootRegex);
            if (springMatch) {
                this._onDidMatchLocalUrl.fire({ host: 'localhost', port: Number(springMatch[1]) });
                return;
            }
            // Try PHP/Laravel
            const phpMatch = data.match(UrlFinder.localPhpRegex);
            if (phpMatch) {
                this._onDidMatchLocalUrl.fire({ host: 'localhost', port: Number(phpMatch[1]) });
                return;
            }
            // Try special python case
            const pythonMatch = data.match(UrlFinder.localPythonServerRegex);
            if (pythonMatch && pythonMatch.length === 3) {
                this._onDidMatchLocalUrl.fire({ host: pythonMatch[1], port: Number(pythonMatch[2]) });
            }
            else {
                // Try generic port case (e.g. "listening on 3000")
                const genericMatch = data.match(UrlFinder.localGenericPortRegex);
                if (genericMatch && genericMatch.length === 2) {
                    const port = parseInt(genericMatch[1], 10);
                    if (port > 0 && port <= 65535) {
                        this._onDidMatchLocalUrl.fire({ host: 'localhost', port });
                    }
                }
            }
        }
    }
}
//# sourceMappingURL=urlFinder.js.map