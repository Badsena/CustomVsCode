import * as vscode from 'vscode';
import { getBrowserTemplate } from './browserTemplate';
import { ProjectInfo } from '../core/ProjectDetector';

export class PreviewManager {
    private static _instance: PreviewManager | undefined;
    private _panel: vscode.WebviewPanel | undefined;
    private _extensionUri: vscode.Uri;

    private _onStatusChange = new vscode.EventEmitter<void>();
    public readonly onStatusChange = this._onStatusChange.event;

    private _terminals = new Map<string, vscode.Terminal>();
    public currentTest: { testPath: string, testId: string | null } | undefined;

    private _dynamicPorts = new Set<number>();
    private _currentProjects: ProjectInfo[] = [];
    private _terminalDataListener: vscode.Disposable | undefined;

    private constructor(extensionUri: vscode.Uri) {
        if (!extensionUri) {
            throw new Error('[PreviewManager] extensionUri is required');
        }
        this._extensionUri = extensionUri;

        if ((vscode.window as any).onDidWriteTerminalData) {
            this._terminalDataListener = (vscode.window as any).onDidWriteTerminalData((e: any) => {
                // 1. Strip ANSI escape sequences (colors, cursors) that break text matching
                const cleanText = e.data.replace(/\x1B\[[0-9;]*[a-zA-Z]/g, '');

                // 2. Safely capture localhost, 127.0.0.1, 0.0.0.0, and IPv6 [::1]
                const match = cleanText.match(/(?:(?:http:\/\/)?localhost|127\.0\.0\.1|0\.0\.0\.0|\[::1\]):(\d{2,5})/i);

                if (match && match[1]) {
                    const port = parseInt(match[1], 10);
                    if (!this._dynamicPorts.has(port)) {
                        const isFirstPort = this._dynamicPorts.size === 0;
                        this._dynamicPorts.add(port);

                        if (!this._currentProjects.some(p => p.port === port)) {
                            this._currentProjects.push({
                                type: 'dynamic',
                                category: 'frontend',
                                rootPath: '',
                                port: port,
                                startCommand: '',
                                label: 'Sniffed Port :' + port
                            });

                            if (this._panel) {
                                // Instantly update the browser dropdown picker
                                this._panel.webview.postMessage({
                                    type: 'updateProjects',
                                    projects: this._currentProjects
                                });

                                // 3. Super UX: Auto-navigate the browser immediately if this is the first server they started!
                                if (isFirstPort) {
                                    this.navigate(`http://localhost:${port}`);
                                }
                            }
                        }
                    }
                }
            });
        }
    }

    public refreshStatus(): void {
        this._onStatusChange.fire();
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
                localResourceRoots: [this._extensionUri],
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
                case 'openDevTools':
                    await vscode.commands.executeCommand('workbench.action.webview.openDeveloperTools');
                    break;
                // ✅ Handle open folder from empty state
                case 'openFolder':
                    await vscode.commands.executeCommand('workbench.action.files.openFolder');
                    break;
            }
        });

        this._panel.onDidDispose(() => {
            this._panel = undefined;
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

    public dispose(): void {
        this._close();
        this._terminals.forEach(t => t.dispose());
        this._terminals.clear();
        this._terminalDataListener?.dispose();
        this._onStatusChange.dispose();
        PreviewManager._instance = undefined;
    }
}
