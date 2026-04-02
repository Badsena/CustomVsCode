import * as vscode from 'vscode';
import { PreviewManager } from '../webview/PreviewManager';
import { ProjectDetector } from '../core/ProjectDetector';

export class SidebarProvider implements vscode.WebviewViewProvider {
    public static readonly viewType = 'amypo-sidebar';
    private _view?: vscode.WebviewView;

    constructor(
        private readonly _extensionUri: vscode.Uri,
        _projectDetector: ProjectDetector,
        private readonly _previewManager: PreviewManager
    ) {
        void _projectDetector;
    }

    resolveWebviewView(
        webviewView: vscode.WebviewView,
        _context: vscode.WebviewViewResolveContext,
        _token: vscode.CancellationToken
    ) {
        this._view = webviewView;

        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [this._extensionUri]
        };

        // ✅ Set HTML once only — never replace it again
        webviewView.webview.html = this._getHtmlContent(webviewView.webview);

        webviewView.webview.onDidReceiveMessage(async (message) => {
            switch (message.command) {
                case 'openBrowser':
                    await vscode.commands.executeCommand('amypo.toggleBrowser');
                    break;
                case 'refresh':
                    this._previewManager.navigate('refresh');
                    break;
                case 'submit':
                    await vscode.commands.executeCommand('amypo.submitTest');
                    break;
            }
        });

        // ✅ Send message to update UI — don't replace HTML
        this._previewManager.onStatusChange(() => this.refresh());
    }

    // ✅ Fixed — send postMessage instead of replacing HTML
    public refresh() {
        if (this._view) {
            const hasTest = !!this._previewManager.currentTest;
            this._view.webview.postMessage({
                command: 'updateStatus',
                hasTest,
                status: hasTest ? 'Active Test' : 'Ready'
            });
        }
    }

    private _getHtmlContent(webview: vscode.Webview): string {
        const nonce = getNonce();
        const cspSource = webview.cspSource;

        return `<!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta http-equiv="Content-Security-Policy"
                content="default-src 'none';
                         script-src 'nonce-${nonce}';
                         style-src ${cspSource} 'unsafe-inline';">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Amypo</title>
            <style>
                *, *::before, *::after {
                    box-sizing: border-box;
                    margin: 0;
                    padding: 0;
                }
                html, body {
                    height: 100%;
                    overflow: hidden;
                }
                body {
                    padding: 10px;
                    color: var(--vscode-foreground);
                    font-family: var(--vscode-font-family);
                    background: var(--vscode-sideBar-background);
                }
                button {
                    width: 100%;
                    padding: 8px;
                    margin: 4px 0;
                    background: var(--vscode-button-background);
                    color: var(--vscode-button-foreground);
                    border: none;
                    border-radius: 4px;
                    cursor: pointer;
                    font-size: 13px;
                }
                button:hover {
                    background: var(--vscode-button-hoverBackground);
                }
                .status {
                    font-size: 12px;
                    color: var(--vscode-descriptionForeground);
                    margin-bottom: 10px;
                }
                #btn-submit {
                    display: none;
                    background: #4caf50;
                    color: white;
                }
            </style>
        </head>
        <body>
            <p class="status" id="status-text">Amypo Coder — Ready</p>
            <button id="btn-open-browser">🌐 Open Browser</button>
            <button id="btn-submit">✅ Submit Test</button>

            <script nonce="${nonce}">
                const vscode = acquireVsCodeApi();

                document.getElementById('btn-open-browser').addEventListener('click', () => {
                    vscode.postMessage({ command: 'openBrowser' });
                });

                document.getElementById('btn-submit').addEventListener('click', () => {
                    vscode.postMessage({ command: 'submit' });
                });

                // ✅ Handle status updates via message — no HTML replacement
                window.addEventListener('message', (event) => {
                    const msg = event.data;
                    if (msg.command === 'updateStatus') {
                        document.getElementById('status-text').textContent =
                            'Amypo Coder — ' + msg.status;
                        document.getElementById('btn-submit').style.display =
                            msg.hasTest ? 'block' : 'none';
                    }
                });
            </script>
        </body>
        </html>`;
    }
}

function getNonce() {
    let text = '';
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    for (let i = 0; i < 32; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
}

