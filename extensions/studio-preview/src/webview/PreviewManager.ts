/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as vscode from 'vscode';
import { getBrowserTemplate } from './browserTemplate';
import { ProjectInfo } from '../core/ProjectDetector';
import { DevToolsProxy } from '../core/DevToolsProxy';

export class PreviewManager {
    private static _instance: PreviewManager | undefined;
    private _panel: vscode.WebviewPanel | undefined;
    private _extensionUri: vscode.Uri;

    private _onStatusChange = new vscode.EventEmitter<void>();
    public readonly onStatusChange = this._onStatusChange.event;

    private _terminals = new Map<string, vscode.Terminal>();
    public currentTest: { testPath: string, testId: string | null } | undefined;

    private _dynamicPorts = new Set<number>();
    private _terminalPorts = new WeakMap<vscode.Terminal, Set<number>>();
    private _currentProjects: ProjectInfo[] = [];
    private _terminalDataListener: vscode.Disposable | undefined;
    private _terminalCloseListener: vscode.Disposable | undefined;
    private _devToolsProxy = new DevToolsProxy();
    private _devToolsActive = false;

    private constructor(extensionUri: vscode.Uri) {
        if (!extensionUri) {
            throw new Error('[PreviewManager] extensionUri is required');
        }
        this._extensionUri = extensionUri;

        if ((vscode.window as any).onDidWriteTerminalData) {
            this._terminalDataListener = (vscode.window as any).onDidWriteTerminalData((e: any) => {
                const text = e.data || '';
                const cleanText = text.replace(/\x1B\[[0-9;]*[a-zA-Z]/g, '');

                const port = detectPort(cleanText);
                if (!port) return;

                if (!this._dynamicPorts.has(port)) {
                    const isFirstPort = this._dynamicPorts.size === 0;
                    this._dynamicPorts.add(port);

                    if (e.terminal) {
                        let ports = this._terminalPorts.get(e.terminal);
                        if (!ports) {
                            ports = new Set<number>();
                            this._terminalPorts.set(e.terminal, ports);
                        }
                        ports.add(port);
                    }

                    if (!this._currentProjects.some(p => p.port === port)) {
                        const label = detectFrameworkLabel(cleanText, port);
                        const category = detectCategory(cleanText);

                        this._currentProjects.push({
                            type: 'dynamic',
                            category,
                            rootPath: '',
                            port,
                            startCommand: '',
                            label
                        });

                        if (this._panel) {
                            this._panel.webview.postMessage({
                                type: 'updateProjects',
                                projects: this._currentProjects
                            });

                            if (isFirstPort) {
                                this.navigate(`http://localhost:${port}`);
                            }
                        }

                        vscode.window.showInformationMessage(
                            `Amypo Coder: ${label} on port ${port} is ready!`,
                            'Open in Browser'
                        ).then(action => {
                            if (action === 'Open in Browser') {
                                this.navigate(`http://localhost:${port}`);
                            }
                        });
                        this.refreshStatus();
                    }
                }
            });
        }

        this._terminalCloseListener = vscode.window.onDidCloseTerminal((terminal) => {
            const ports = this._terminalPorts.get(terminal);
            if (ports) {
                ports.forEach(port => {
                    this._dynamicPorts.delete(port);
                    this._currentProjects = this._currentProjects.filter(p => !(p.type === 'dynamic' && p.port === port));
                });
                this._terminalPorts.delete(terminal);
                this.refreshStatus();
            }
        });
    }

    public refreshStatus(): void {
        this._onStatusChange.fire();
        if (this._panel) {
            this._panel.webview.postMessage({
                type: 'updateProjects',
                projects: this._currentProjects
            });
        }
    }

    public static getInstance(extensionUri: vscode.Uri): PreviewManager {
        if (!PreviewManager._instance) {
            PreviewManager._instance = new PreviewManager(extensionUri);
        }
        return PreviewManager._instance;
    }

    public get isOpen(): boolean {
        return !!this._panel;
    }

    public get isServerRunning(): boolean {
        return this._dynamicPorts.size > 0;
    }

    // ✅ Fixed toggle — if closing just close, if opening use current projects
    public toggle(): void {
        if (this._panel) {
            this._close();
        } else {
            // ✅ Open with whatever projects are already detected
            this._open();
        }
    }

    public open(projects: ProjectInfo[]): void {
        this._currentProjects = projects; // ✅ Always update projects first
        if (this._panel) {
            this._panel.webview.postMessage({
                type: 'updateProjects',
                projects: this._currentProjects
            });
            this._panel.reveal(vscode.ViewColumn.Beside, true);
        } else {
            this._open();
        }
    }

    public navigate(url: string): void {
        if (this._panel) {
            this._panel.webview.postMessage({ type: 'navigate', url });
        }
    }

    private _open(): void {
        this._panel = vscode.window.createWebviewPanel(
            'amypoBrowser',
            '⚡ Amypo Browser',
            { viewColumn: vscode.ViewColumn.Beside, preserveFocus: true },
            {
                enableScripts: true,
                retainContextWhenHidden: true,
                localResourceRoots: [
                    this._extensionUri,
                    // ✅ Allow loading local assets
                    vscode.Uri.joinPath(this._extensionUri, 'src', 'assets')
                ],
            }
        );
        console.log('[Amypo] Browser opened with projects:', this._currentProjects.length);



        // ✅ Smart initial URL
        const firstProject = this._currentProjects.find(p => p.port > 0);
        const initialUrl = firstProject
            ? `http://localhost:${firstProject.port}`
            : 'about:blank'; // ✅ Show empty state instead of wrong URL

        this._panel.webview.html = getBrowserTemplate(
            this._panel.webview,
            this._extensionUri,
            initialUrl,
            this._currentProjects
        );

        this._panel.webview.onDidReceiveMessage(async (message) => {
            switch (message.type) {
                case 'pin':
                    await vscode.commands.executeCommand('workbench.action.pinEditor');
                    break;
                case 'openExternal':
                    if (message.url) {
                        await vscode.env.openExternal(vscode.Uri.parse(message.url));
                    }
                    break;
                case 'toggleDevTools':
                    await this._handleToggleDevTools(message.currentUrl);
                    break;
                // ✅ Handle open folder from empty state
                case 'openFolder':
                    await vscode.commands.executeCommand('workbench.action.files.openFolder');
                    break;
            }
        });

        this._panel.onDidDispose(() => {
            this._panel = undefined;
            // Stop DevTools proxy when panel closes
            this._devToolsProxy.stop();
            this._devToolsActive = false;
            vscode.commands.executeCommand('setContext', 'amypo.browserOpen', false);
            this._onStatusChange.fire();
        });

        this._panel.onDidChangeViewState(({ webviewPanel }) => {
            vscode.commands.executeCommand('setContext', 'amypo.browserOpen', webviewPanel.visible);
            this._onStatusChange.fire();
        });

        vscode.commands.executeCommand('setContext', 'amypo.browserOpen', true);
        this._onStatusChange.fire();
    }

    private _close(): void {
        this._panel?.dispose();
        this._panel = undefined;
        vscode.commands.executeCommand('setContext', 'amypo.browserOpen', false);
        this._onStatusChange.fire();
    }

    // ── DevTools Proxy Toggle ──────────────────────────────────
    private async _handleToggleDevTools(currentUrl: string): Promise<void> {
        if (!this._panel) return;

        if (this._devToolsActive) {
            // ── Turn OFF: revert iframe to direct URL ──
            this._devToolsActive = false;
            await this._devToolsProxy.stop();

            // Extract original port from the current proxied URL
            const portMatch = currentUrl.match(/:(\d{4,5})/);
            const originalUrl = portMatch
                ? `http://localhost:${this._getOriginalPort(parseInt(portMatch[1], 10)) || portMatch[1]}`
                : currentUrl;

            this._panel.webview.postMessage({
                type: 'disableDevTools',
                url: originalUrl
            });
        } else {
            // ── Turn ON: start proxy, switch iframe ──
            const portMatch = currentUrl.match(/localhost:(\d{4,5})/);
            if (!portMatch) {
                vscode.window.showWarningMessage('Amypo DevTools: No localhost server detected in the current URL.');
                return;
            }

            const targetPort = parseInt(portMatch[1], 10);
            try {
                // ✅ Hook into proxy navigation events
                this._devToolsProxy.onNavigate = (path) => {
                    this._panel?.webview.postMessage({
                        type: 'urlChanged',
                        path: path,
                        url: `http://localhost:${targetPort}${path}`
                    });
                };

                const proxyPort = await this._devToolsProxy.start(
                    targetPort
                );
                this._devToolsActive = true;

                // Rebuild the URL through the proxy
                const proxyUrl = currentUrl.replace(
                    `localhost:${targetPort}`,
                    `localhost:${proxyPort}`
                );

                this._panel.webview.postMessage({
                    type: 'enableDevTools',
                    url: proxyUrl,
                    originalPort: targetPort,
                    proxyPort: proxyPort
                });
            } catch (err: any) {
                vscode.window.showErrorMessage(`Amypo DevTools: Failed to start proxy — ${err.message}`);
            }
        }
    }

    /**
     * Get the original target port from the proxy (if running).
     */
    private _getOriginalPort(proxyPort: number): number | undefined {
        if (this._devToolsProxy.proxyPort === proxyPort) {
            // The proxy knows its target — we stored it
            return undefined; // We'll use the tracked port from the webview message
        }
        return undefined;
    }

    public dispose(): void {
        this._close();
        this._devToolsProxy.stop();
        this._terminals.forEach(t => t.dispose());
        this._terminals.clear();
        this._terminalDataListener?.dispose();
        this._terminalCloseListener?.dispose();
        this._onStatusChange.dispose();
        PreviewManager._instance = undefined;
    }
}

// ══════════════════════════════════════════════════
// ✅ Universal Port Detector — All Frameworks
// ══════════════════════════════════════════════════
function detectPort(text: string): number | null {

    const patterns = [

        // ── Java / Spring Boot ──────────────────────
        /Tomcat\s+started\s+on\s+port[s]?\s[:\s]*(\d{4,5})/i,
        /o\.s\.b\.w\.e\.tomcat.*?:(\d{4,5})/i,
        /started\s+on\s+port[s]?\s*[:\s]*(\d{4,5})/i,

        // ── Node / Express ──────────────────────────
        /(?:server|app|express|listening)[^\n]*?(?:on\s+)?(?:port\s*[:\s]*|:)(\d{4,5})/i,
        /(?:running|started|server)\s+(?:at|on)\s+(?:http:\/\/)?[^\s]*?:(\d{4,5})/i,

        // ── React / Vite / Next.js ──────────────────
        /Local\s*:\s*http:\/\/localhost:(\d{4,5})/i,
        /➜\s*Local\s*:\s*http:\/\/localhost:(\d{4,5})/i,
        /ready\s+(?:on|at|in)\s+http:\/\/localhost:(\d{4,5})/i,
        /compiled\s+successfully.*?:(\d{4,5})/i,
        /webpack\s+compiled.*?localhost:(\d{4,5})/i,
        /Next\.js.*?localhost:(\d{4,5})/i,
        /dev\s+server\s+running\s+at.*?:(\d{4,5})/i,

        // ── Python / Flask / Django / FastAPI ───────
        /Running\s+on\s+http:\/\/(?:0\.0\.0\.0|127\.0\.0\.1|localhost):(\d{4,5})/i,
        /Uvicorn\s+running\s+on\s+http:\/\/.*?:(\d{4,5})/i,
        /Serving\s+on\s+http:\/\/.*?:(\d{4,5})/i,
        /Starting\s+development\s+server\s+at\s+http:\/\/.*?:(\d{4,5})/i,
        /django.*?:(\d{4,5})/i,

        // ── PHP ─────────────────────────────────────
        /PHP.*?Development\s+Server.*?:(\d{4,5})/i,
        /Listening\s+on\s+(?:http:\/\/)?.*?:(\d{4,5})/i,

        // ── Ruby on Rails ───────────────────────────
        /Puma.*?listening\s+on.*?:(\d{4,5})/i,
        /WEBrick.*?:(\d{4,5})/i,

        // ── Go ──────────────────────────────────────
        /listening\s+on\s+.*?:(\d{4,5})/i,
        /http\.ListenAndServe.*?:(\d{4,5})/i,

        // ── Rust / Actix ────────────────────────────
        /actix.*?:(\d{4,5})/i,

        // ── Generic URL fallback ─────────────────────
        // ✅ LAST RESORT: Only exact localhost:PORT URLs
        /(?:http:\/\/)?(?:localhost|127\.0\.0\.1|0\.0\.0\.0):(\d{4,5})(?:\/|\s|$)/i,
    ];

    for (const pattern of patterns) {
        const match = text.match(pattern);
        if (match && match[1]) {
            const port = parseInt(match[1], 10);
            // ✅ Only valid ports: 4-5 digits, 1024-65535
            if (port >= 1024 && port <= 65535 && match[1].length >= 4) {
                return port;
            }
        }
    }

    return null;
}

// ══════════════════════════════════════════════════
// ✅ Framework Label Detection
// ══════════════════════════════════════════════════
function detectFrameworkLabel(text: string, port: number): string {
    if (/tomcat|spring/i.test(text))           return `Spring Boot :${port}`;
    if (/vite/i.test(text))                    return `Vite :${port}`;
    if (/next\.js|nextjs/i.test(text))         return `Next.js :${port}`;
    if (/react/i.test(text))                   return `React :${port}`;
    if (/angular/i.test(text))                 return `Angular :${port}`;
    if (/vue/i.test(text))                     return `Vue :${port}`;
    if (/svelte/i.test(text))                  return `Svelte :${port}`;
    if (/uvicorn|fastapi/i.test(text))         return `FastAPI :${port}`;
    if (/flask/i.test(text))                   return `Flask :${port}`;
    if (/django/i.test(text))                  return `Django :${port}`;
    if (/express/i.test(text))                 return `Express :${port}`;
    if (/puma|rails/i.test(text))              return `Rails :${port}`;
    if (/php/i.test(text))                     return `PHP :${port}`;
    if (/actix|rocket/i.test(text))            return `Rust :${port}`;
    if (/gin|echo|fiber/i.test(text))          return `Go :${port}`;
    return `Server :${port}`;
}

// ══════════════════════════════════════════════════
// ✅ Category Detection — frontend or backend
// ══════════════════════════════════════════════════
function detectCategory(text: string): 'frontend' | 'backend' | 'static' {
    if (/vite|react|next|angular|vue|svelte|webpack|parcel/i.test(text)) {
        return 'frontend';
    }
    if (/tomcat|spring|express|flask|django|fastapi|uvicorn|rails|puma|php|actix|gin/i.test(text)) {
        return 'backend';
    }
    return 'backend'; // default
}
