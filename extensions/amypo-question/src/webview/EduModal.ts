import * as vscode from 'vscode';

export class EduViewProvider implements vscode.WebviewViewProvider {
    public static readonly viewType = 'amypoEduView';
    private _view?: vscode.WebviewView;
    private _courseInfo?: any;
    private _onConfirm?: () => void;

    constructor(private readonly _extensionUri: vscode.Uri) { }

    public resolveWebviewView(
        webviewView: vscode.WebviewView,
        context: vscode.WebviewViewResolveContext,
        _token: vscode.CancellationToken,
    ) {
        this._view = webviewView;
        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [this._extensionUri]
        };

        webviewView.webview.onDidReceiveMessage((message) => {
            switch (message.command) {
                case 'startTest':
                    if (this._onConfirm) {
                        this._onConfirm();
                    }
                    break;
            }
        });

        if (this._courseInfo) {
            this._view.webview.html = this._getHtml(this._view.webview, this._extensionUri, this._courseInfo);
        }
    }

    public updateView(courseInfo: { course_name: string; module_name: string; languages?: string[] }, onConfirm: () => void) {
        this._courseInfo = courseInfo;
        this._onConfirm = onConfirm;

        if (this._view) {
            this._view.webview.html = this._getHtml(this._view.webview, this._extensionUri, courseInfo);
            this._view.show?.(true);
        }
    }

    public postMessage(message: any) {
        if (this._view) {
            this._view.webview.postMessage(message);
        }
    }

    private _getHtml(webview: vscode.Webview, extensionUri: vscode.Uri, courseInfo: { course_name: string; module_name: string; languages?: string[]; user_name?: string }) {
        const nonce = getNonce();
        const logoUri = webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, 'image.png'));

        const languagesHtml = courseInfo.languages && courseInfo.languages.length > 0
            ? `<div class="languages">
				${courseInfo.languages.map(l => `<span class="lang-tag">${l}</span>`).join('')}
			   </div>`
            : '';

        return `<!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>
                body {
                    margin: 0;
                    padding: 0;
                    min-height: 100vh;
                    background: var(--vscode-editor-background, #f1f2f6);
                    color: var(--vscode-editor-foreground);
                    font-family: var(--vscode-font-family);
                    display: flex;
                    flex-direction: column;
                }
                #modal-wrapper {
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    min-height: 100vh;
                    padding: 24px;
                    width: 100%;
                    box-sizing: border-box;
                }
                #modal-content {
                    background: var(--vscode-editorWidget-background, white);
                    color: var(--vscode-editorWidget-foreground, #2d3436);
                    border-radius: 16px;
                    width: 100%;
                    max-width: 400px;
                    padding: 40px 24px;
                    text-align: center;
                    box-shadow: 0 20px 60px rgba(0,0,0,0.5);
                    animation: fadeIn 0.3s ease-out;
                }
                @keyframes fadeIn {
                    from { opacity: 0; transform: scale(0.95); }
                    to { opacity: 1; transform: scale(1); }
                }
                .illustration {
                    width: 100%;
                    max-width: 160px;
                    height: auto;
                    margin: 0 auto 24px;
                    display: block;
                }
                .title {
                    font-size: 24px;
                    font-weight: 700;
                    color: var(--vscode-editorWidget-foreground, #2d3436);
                    margin-bottom: 4px;
                    text-transform: capitalize;
                }
                .subtext {
                    font-size: 15px;
                    color: var(--vscode-descriptionForeground, #636e72);
                    margin-bottom: 20px;
                }
                .languages {
                    display: flex;
                    flex-wrap: wrap;
                    justify-content: center;
                    gap: 6px;
                    margin-bottom: 30px;
                }
                .lang-tag {
                    background: var(--vscode-badge-background, #f1f2f6);
                    color: var(--vscode-badge-foreground, #2f3542);
                    padding: 4px 12px;
                    border-radius: 6px;
                    font-size: 12px;
                    font-weight: 600;
                }
                .buttons {
                    display: flex;
                    flex-direction: column;
                    gap: 12px;
                    justify-content: center;
                }
                button {
                    padding: 12px 24px;
                    border-radius: 10px;
                    border: none;
                    font-size: 15px;
                    font-weight: 600;
                    cursor: pointer;
                    transition: all 0.2s;
                    width: 100%;
                }
                .btn-start {
                    background: #00ce7a;
                    color: white;
                }
                .btn-start:hover { background: #00b36a; }

                /* Guidelines Styles */
                .guidelines-title {
                    font-size: 20px;
                    font-weight: 700;
                    color: var(--vscode-editorWidget-foreground, #2d3436);
                    margin-bottom: 24px;
                    text-align: center;
                }
                .guidelines-list {
                    list-style: none;
                    padding: 0;
                    margin: 0;
                    font-size: 14px;
                    color: var(--vscode-descriptionForeground, #636e72);
                    text-align: left;
                    max-height: 350px;
                    overflow-y: auto;
                    margin-bottom: 24px;
                }
                .guidelines-list li {
                    margin-bottom: 16px;
                    display: flex;
                    align-items: flex-start;
                    line-height: 1.5;
                }
                .bullet-icon {
                    min-width: 8px;
                    height: 8px;
                    background-color: #00ce7a;
                    border-radius: 50%;
                    margin-right: 12px;
                    margin-top: 6px;
                }

                /* Question UI Styles */
                #question-ui {
                    display: none;
                    flex-direction: column;
                    height: 100vh;
                    width: 100%;
                    background-color: var(--vscode-editor-background, #f1f2f6);
                }
                /* Inherit general background */
                .topbar { background-color: var(--vscode-editor-background, white); padding: 12px 24px; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--vscode-widget-border, #dfe4ea); }
                .topbar-left { display: flex; align-items: center; gap: 16px; flex-wrap: wrap; }
                .logo { height: 24px; }
                .info-pill { font-size: 13px; color: var(--vscode-foreground, #636e72); display: flex; align-items: center; gap: 8px; border-left: 1px solid var(--vscode-widget-border, #dfe4ea); padding-left: 16px; font-weight: 500; }
                .icon-btn { border: 1px solid var(--vscode-widget-border, #dfe4ea); border-radius: 50%; padding: 4px; background: transparent; cursor: pointer; display: flex; align-items: center; justify-content: center; width: 20px; height: 20px; }
                .icon-btn.yellow { border-color: #ffd32a; color: #ffa801; }

                .main-layout { display: flex; flex: 1; overflow: hidden; }
                .sidebar { width: 80px; background-color: var(--vscode-sideBar-background, #d1d8e0); display: flex; flex-direction: column; justify-content: space-between; border-right: 1px solid var(--vscode-widget-border, #ced6e0); padding: 12px 0; }

                .nav-item { display: flex; justify-content: center; margin-bottom: 16px; }
                .nav-btn { background: none; border: none; font-size: 20px; color: var(--vscode-foreground, #2d3436); cursor: pointer; }
                .q-tab { background: #3867d6; color: white; width: 100%; padding: 12px 0; text-align: center; font-weight: bold; border-bottom: 3px solid #ff9f43; font-size: 18px; }

                .stats { display: flex; flex-direction: column; gap: 8px; padding: 0 10px; }
                .stat-box { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 6px; border-radius: 6px; color: white; font-size: 11px; font-weight: bold; text-align: center; }
                .stat-box .count { font-size: 16px; margin-bottom: 2px; }
                .stat-green { background: #00ce7a; }
                .stat-yellow { background: #ffaf40; }
                .stat-orange { background: #ff793f; }
                .stat-grey { background: #747d8c; }

                .content-area { flex: 1; background: var(--vscode-editorWidget-background, white); margin: 12px; border-radius: 8px; border: 1px solid var(--vscode-widget-border, #dfe4ea); display: flex; flex-direction: column; overflow: hidden; }
                .content-header { padding: 12px 24px; border-bottom: 1px solid var(--vscode-widget-border, #f1f2f6); display: flex; justify-content: space-between; align-items: center; background: var(--vscode-editorWidget-background, #fbfbfb); border-radius: 8px 8px 0 0; }
                .tab-title { color: #00b894; font-weight: 600; display: flex; align-items: center; gap: 8px; }
                .report-btn { color: #ff7675; border: 1px solid #fab1a0; border-radius: 6px; padding: 6px 16px; background: transparent; font-size: 12px; font-weight: bold; cursor: pointer; display: flex; align-items: center; gap: 6px; transition: 0.2s; }
                .report-btn:hover { background-color: var(--vscode-list-hoverBackground, #ffeaa7); }

                .question-body { padding: 24px; flex: 1; overflow-y: auto; color: var(--vscode-foreground, #2d3436); }
                .q-title { font-size: 24px; font-weight: bold; margin-bottom: 24px; }
                .q-description { font-size: 15px; line-height: 1.6; }

                .loader-container { display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; color: var(--vscode-descriptionForeground, #636e72); }
                .spinner { border: 4px solid var(--vscode-widget-border, rgba(0,0,0,0.1)); width: 36px; height: 36px; border-radius: 50%; border-left-color: #0984e3; animation: spin 1s linear infinite; margin-bottom: 16px; }
                @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }

                .footer { background: var(--vscode-sideBar-background, #d1d8e0); padding: 12px 24px; font-size: 13px; font-weight: bold; color: var(--vscode-foreground, #2d3436); border-top: 1px solid var(--vscode-widget-border, #ced6e0); display: flex; align-items: center; }

                @media (max-width: 600px) {
                    .topbar { flex-direction: column; gap: 8px; }
                    .sidebar { width: 60px; }
                    .content-header { flex-direction: column; gap: 8px; align-items: flex-start; }
                    .q-tab { font-size: 14px; }
                }
            </style>
        </head>
        <body>
            <!-- MODAL VIEWS -->
            <div id="modal-wrapper">
                <div id="modal-content">
                    <div id="step1">
                        <img src="${logoUri}" alt="Amypo" class="illustration">
                        <div class="title">${courseInfo.module_name}</div>
                        <div class="subtext">${courseInfo.course_name}</div>
                        ${languagesHtml}
                        <div class="buttons">
                            <button class="btn-start" id="start">Start Test</button>
                        </div>
                    </div>

                    <div id="step2" style="display: none;">
                        <div class="guidelines-title">Test Guidelines</div>
                        <ul class="guidelines-list">
                            <li><div class="bullet-icon"></div><div>To ensure optimal performance during the test, we recommend using the latest version of Google Chrome (version 60 or above).</div></li>
                            <li><div class="bullet-icon"></div><div>Your computer system must maintain steady and uninterrupted internet connectivity. For a smooth testing experience, both your download and upload speeds should be at least 2 Mbps.</div></li>
                            <li><div class="bullet-icon"></div><div>Confirm that your computer's system clock is accurately set to the (GMT +5:30) Mumbai, Kolkata, Chennai, New Delhi timezone. A mismatch in time can result in test discrepancies.</div></li>
                            <li><div class="bullet-icon"></div><div>Avoid switching tabs during the test. Any such activity can lead to an automatic and premature submission of your test.</div></li>
                            <li><div class="bullet-icon"></div><div>Notifications or pop-ups appearing during the test will be interpreted as tab switches, which may cause your test to close prematurely. It is strongly advised to turn off these distractions before starting.</div></li>
                        </ul>
                        <div class="buttons">
                            <button class="btn-start" id="continue">Continue</button>
                        </div>
                    </div>
                </div>
            </div>

            <!-- QUESTION FULL UI -->
            <div id="question-ui">
                <div class="topbar">
                    <div class="topbar-left">
                        <img src="${logoUri}" alt="Amypo" class="logo">
                        <div class="info-pill">User: ${courseInfo.user_name || 'Student'} <div class="icon-btn">👁</div></div>
                        <div class="info-pill">Course: ${courseInfo.course_name || 'N/A'} <div class="icon-btn">👁</div></div>
                    </div>
                    <div class="icon-btn yellow">☀</div>
                </div>

                <div class="main-layout">
                    <div class="sidebar">
                        <div>
                            <div class="nav-item">
                                <button class="nav-btn">≡</button>
                            </div>
                            <div class="q-tab">1</div>
                        </div>
                        <div class="stats">
                            <div class="stat-box stat-green"><div class="count" id="stat-sub">0</div>Sub..</div>
                            <div class="stat-box stat-yellow"><div class="count" id="stat-sav">0</div>Saved</div>
                            <div class="stat-box stat-orange"><div class="count" id="stat-not">0</div>Not..</div>
                            <div class="stat-box stat-grey"><div class="count" id="stat-tot">0</div>Total</div>
                        </div>
                    </div>

                    <div class="content-area">
                        <div class="content-header">
                            <div class="tab-title"><span style="color: #636e72;">📋</span> Question</div>
                        </div>

                        <div id="content-container" class="question-body">
                            <!-- Loader -->
                            <div class="loader-container" id="loader">
                                <div class="spinner"></div>
                                <div style="font-weight: 500;">Loading test environment...</div>
                            </div>

                            <!-- Error -->
                            <div id="error-view" style="display: none; color: #e17055; text-align: center; margin-top: 40px;">
                                <h2 id="error-msg">Failed to load test.</h2>
                            </div>

                            <!-- Content -->
                            <div id="data-view" style="display: none;">
                                <div class="q-title" id="q-title"></div>
                                <div class="q-description" id="q-desc"></div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <script nonce="${nonce}">
                const vscode = acquireVsCodeApi();

                document.getElementById('start').onclick = () => {
                    document.getElementById('step1').style.display = 'none';
                    document.getElementById('step2').style.display = 'block';
                };

                document.getElementById('continue').onclick = () => {
                    vscode.postMessage({ command: 'startTest' });
                };

                window.addEventListener('message', event => {
                    const message = event.data;
                    const wrapper = document.getElementById('modal-wrapper');
                    const qUi = document.getElementById('question-ui');

                    if (message.state) {
                        wrapper.style.display = 'none';
                        qUi.style.display = 'flex';

                        const loader = document.getElementById('loader');
                        const dataView = document.getElementById('data-view');
                        const errorView = document.getElementById('error-view');

                        if (message.state === 'loading') {
                            loader.style.display = 'flex';
                            dataView.style.display = 'none';
                            errorView.style.display = 'none';
                        } else if (message.state === 'error') {
                            loader.style.display = 'none';
                            dataView.style.display = 'none';
                            errorView.style.display = 'block';
                            document.getElementById('error-msg').innerText = message.message || 'An error occurred';
                        } else if (message.state === 'loaded') {
                            loader.style.display = 'none';
                            errorView.style.display = 'none';
                            dataView.style.display = 'block';

                            const payload = message.payload;
                            const stats = message.stats;

                            if (stats) {
                                document.getElementById('stat-sub').innerText = stats.submitted || '0';
                                document.getElementById('stat-sav').innerText = stats.saved || '0';
                                document.getElementById('stat-not').innerText = stats.not_attended || '0';
                                document.getElementById('stat-tot').innerText = stats.total || '0';
                            }

                            const qdata = Array.isArray(payload) ? payload[0] : payload;
                            if (qdata) {
                                document.getElementById('q-title').innerText = qdata?.question_name || qdata?.title || 'Question 1';
                                document.getElementById('q-desc').innerHTML = qdata?.description || qdata?.question || 'Empty Question Description';
                            }
                        }
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
