/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';
export class EduViewProvider implements vscode.WebviewViewProvider {
    public static readonly viewType = 'amypoEduView';
    private _view?: vscode.WebviewView;
    private _courseInfo?: any;
    private _lastMessage?: any;
    private _webviewReady = false;
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
        webviewView.description = 'Amypo Question Panel';
        webviewView.webview.onDidReceiveMessage((message) => {
            switch (message.command) {
                case 'ready':
                    this._webviewReady = true;
                    // Re-send last state if we have it
                    if (this._lastMessage) {
                        setTimeout(() => {
                            this.postMessage(this._lastMessage);
                        }, 100);
                    }
                    // Notify extension that webview is ready (for session restore)
                    if (this._onReady) {
                        this._onReady();
                        this._onReady = undefined;
                    }
                    break;
                case 'reload':
                    if (this._onReload) {
                        this._onReload();
                    }
                    break;
                case 'save':
                    if (this._onSave) {
                        this._onSave();
                    }
                    break;
                case 'verify':
                    if (this._onVerify) {
                        this._onVerify();
                    }
                    break;
                case 'pull':
                    if (this._onPull) {
                        this._onPull();
                    }
                    break;
                case 'startTest':
                    if (this._onConfirm) {
                        this._onConfirm();
                    }
                    break;
            }
        });

        // ✅ Always set HTML immediately
        if (this._courseInfo) {
            this._view.webview.html = this._getHtml(this._view.webview, this._extensionUri, this._courseInfo);
        } else if (!this._view.webview.html) {
            // Show loading state until courseInfo arrives
            this._view.webview.html = this._getLoadingHtml();
        }
    }

    private _onReload?: () => void;
    private _onSave?: () => void;
    private _onVerify?: () => void;
    private _onPull?: () => void;
    private _onReady?: () => void;

    public setOnReload(callback: () => void) { this._onReload = callback; }
    public setOnSave(callback: () => void) { this._onSave = callback; }
    public setOnVerify(callback: () => void) { this._onVerify = callback; }
    public setOnPull(callback: () => void) { this._onPull = callback; }
    public setOnReady(callback: () => void) {
        if (this._webviewReady) {
            // Webview already fired ready — call immediately
            console.log('[Amypo] Webview already ready — firing callback immediately');
            setTimeout(callback, 100);
        } else {
            this._onReady = callback;
        }
    }

    public updateView(courseInfo: { course_name: string; module_name: string; languages?: string[]; errorMessage?: string }, onConfirm: () => void) {
        this._courseInfo = courseInfo;
        this._onConfirm = onConfirm;
        this._webviewReady = false; // Reset — new HTML will fire 'ready' again

        if (this._view) {
            this._view.webview.html = this._getHtml(this._view.webview, this._extensionUri, courseInfo);
            this._view.show?.(true);
        }
    }

    public postMessage(message: any) {
        this._lastMessage = message;
        if (this._view) {
            this._view.webview.postMessage(message);
        }
    }

    private _getLoadingHtml(): string {
        return `<!DOCTYPE html>
        <html><body style="display:flex;align-items:center;justify-content:center;height:100%;
        background:var(--vscode-editor-background);color:var(--vscode-foreground);font-family:var(--vscode-font-family);">
            <div style="text-align:center;">
                <div style="border:4px solid rgba(0,0,0,0.1);width:36px;height:36px;border-radius:50%;border-left-color:#0984e3;animation:spin 1s linear infinite;margin:0 auto 16px;"></div>
                <div>Loading Amypo...</div>
            </div>
            <style>@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }</style>
            <script>
                const vscode = acquireVsCodeApi();
                vscode.postMessage({ command: 'ready' });
            </script>
        </body></html>`;
    }

    private _getHtml(webview: vscode.Webview, extensionUri: vscode.Uri, courseInfo: any) {
        const nonce = getNonce();
        const logoUri = webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, 'logo.png'));

        const languagesHtml = courseInfo.languages && courseInfo.languages.length > 0
            ? `<div class="languages">
				${courseInfo.languages.map(l => `<span class="lang-tag">${l}</span>`).join('')}
			   </div>`
            : '';

        return `<!DOCTYPE html>
        <html lang="en" style="height: 100%; margin: 0; padding: 0; overflow: hidden;">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src ${webview.cspSource} https: data:; script-src 'nonce-${nonce}'; style-src 'unsafe-inline';">
            <style>
                html, body {
                    margin: 0;
                    padding: 0;
                    width: 100%;
                    height: 100%;
                    overflow: hidden;
                    background: var(--vscode-editor-background);
                    color: var(--vscode-editor-foreground);
                    font-family: var(--vscode-font-family);
                }
                #modal-wrapper {
                    position: absolute;
                    inset: 0;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    overflow-y: auto;
                    padding: 24px;
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
                    position: absolute;
                    inset: 0;
                    flex-direction: column;
                    overflow: hidden;
                    background-color: var(--vscode-editor-background, #f1f2f6);
                }
                /* Inherit general background */
                .topbar { background-color: var(--vscode-editor-background, white); padding: 12px 24px; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--vscode-widget-border, #dfe4ea); }
                .topbar-left { display: flex; align-items: center; gap: 16px; flex-wrap: wrap; }
                .logo { height: 24px; }
                .info-pill { font-size: 13px; color: var(--vscode-foreground, #636e72); display: flex; align-items: center; gap: 8px; border-left: 1px solid var(--vscode-widget-border, #dfe4ea); padding-left: 16px; font-weight: 500; }
                .icon-btn { border: 1px solid var(--vscode-widget-border, #dfe4ea); border-radius: 50%; padding: 4px; background: transparent; cursor: pointer; display: flex; align-items: center; justify-content: center; width: 20px; height: 20px; }
                .icon-btn.yellow { border-color: #ffd32a; color: #ffa801; }
                .main-layout {
                    position: absolute;
                    top: 53px;
                    bottom: 60px;
                    left: 0;
                    right: 0;
                    overflow: hidden;
                    display: flex;
                }
                .content-area { flex: 1; background: var(--vscode-editorWidget-background, white); margin: 12px; border-radius: 8px; border: 1px solid var(--vscode-widget-border, #dfe4ea); display: flex; flex-direction: column; overflow: hidden; }
                .content-header { padding: 12px 24px; border-bottom: 1px solid var(--vscode-widget-border, #f1f2f6); display: flex; justify-content: space-between; align-items: center; background: var(--vscode-editorWidget-background, #fbfbfb); border-radius: 8px 8px 0 0; }
                .tab-title { color: #00b894; font-weight: 600; display: flex; align-items: center; gap: 8px; }
                .report-btn { color: #ff7675; border: 1px solid #fab1a0; border-radius: 6px; padding: 6px 16px; background: transparent; font-size: 12px; font-weight: bold; cursor: pointer; display: flex; align-items: center; gap: 6px; transition: 0.2s; }
                .report-btn:hover { background-color: var(--vscode-list-hoverBackground, #ffeaa7); }

                .question-body { padding: 24px; flex: 1; overflow-y: auto; color: var(--vscode-foreground, #2d3436); }
                .q-title { font-size: 24px; font-weight: bold; margin-bottom: 24px; }
                .q-description { font-size: 15px; line-height: 1.6; margin-bottom: 32px; }

                .action-bar {
                    position: absolute;
                    bottom: 0;
                    left: 0;
                    right: 0;
                    display: flex;
                    gap: 12px;
                    padding: 12px;
                    background: var(--vscode-editor-background);
                    border-top: 1px solid var(--vscode-widget-border);
                    box-sizing: border-box;
                }
                .btn-action { flex: 1; padding: 10px; border-radius: 6px; border: 1px solid var(--vscode-widget-border, #dfe4ea); background: var(--vscode-button-secondaryBackground, #f1f2f6); color: var(--vscode-button-secondaryForeground, #2d3436); font-size: 13px; font-weight: 600; cursor: pointer; transition: 0.2s; display: flex; align-items: center; justify-content: center; gap: 8px; }
                .btn-action:hover { background: var(--vscode-button-secondaryHoverBackground, #dfe4ea); }
                .btn-primary { background: #3867d6; color: white; border: none; }
                .btn-primary:hover { background: #2b52ad; }
                .btn-success { background: #00ce7a; color: white; border: none; }
                .btn-success:hover { background: #00b36a; }

                .status-msg { margin-top: 12px; font-size: 12px; font-weight: 500; display: none; padding: 8px; border-radius: 4px; }
                .status-msg.success { display: block; background: #e6fcf5; color: #087f5b; border: 1px solid #c3fae8; }
                .status-msg.error { display: block; background: #fff5f5; color: #c92a2a; border: 1px solid #ffe3e3; }
                .status-msg.info { display: block; background: #e7f5ff; color: #1864ab; border: 1px solid #d0ebff; }

                .loader-container { display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; color: var(--vscode-descriptionForeground, #636e72); }
                .spinner { border: 4px solid var(--vscode-widget-border, rgba(0,0,0,0.1)); width: 36px; height: 36px; border-radius: 50%; border-left-color: #0984e3; animation: spin 1s linear infinite; margin-bottom: 16px; }
                @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }

                .tooltip-container { position: relative; display: inline-block; cursor: pointer; }
                .tooltip-content {
                    display: none; position: absolute; top: 100%; left: 0; margin-top: 8px;
                    background: var(--vscode-editorWidget-background, white);
                    color: var(--vscode-editor-foreground, black); border: 1px solid var(--vscode-widget-border, #ccc);
                    padding: 12px 16px; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                    z-index: 100; font-size: 13px; font-weight: normal; white-space: nowrap; line-height: 1.6;
                }
                .tooltip-content p { margin: 4px 0; }
                .tooltip-container:hover .tooltip-content,
                .tooltip-container:focus-within .tooltip-content { display: block; }

                @media (max-width: 600px) {
                    .topbar { flex-direction: column; gap: 8px; }
                    .content-header { flex-direction: column; gap: 8px; align-items: flex-start; }
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
                        ${courseInfo.errorMessage ? `<div style="color: #e17055; margin-top: 16px; font-weight: 600; text-align: center; border: 1px solid #fab1a0; padding: 12px; border-radius: 8px; background: #fff5f5;">${courseInfo.errorMessage}</div>` :
                `<div class="buttons">
                            <button class="btn-start" id="start">Start Test</button>
                        </div>`}
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
                        <div class="info-pill">User Details :
                            <div class="tooltip-container">
                                <div class="icon-btn" tabindex="0">👁</div>
                                <div class="tooltip-content">
                                    <p><b>Name :</b> ${courseInfo.user_name}</p>
                                    <p><b>Email :</b> ${courseInfo.user_email}</p>
                                    <p><b>Roll No :</b> ${courseInfo.user_roll_no}</p>
                                    <p><b>College :</b> ${courseInfo.user_college}</p>
                                    <p><b>Department :</b> ${courseInfo.user_department}</p>
                                    <p><b>Batch :</b> ${courseInfo.user_batch}</p>
                                    <p><b>Section :</b> ${courseInfo.user_section}</p>
                                </div>
                            </div>
                        </div>
                        <div class="info-pill">Course Details :
                            <div class="tooltip-container">
                                <div class="icon-btn" tabindex="0">👁</div>
                                <div class="tooltip-content">
                                    <p><b>Course Name :</b> ${courseInfo.course_name}</p>
                                    <p><b>Course Type :</b> ${courseInfo.course_type}</p>
                                    <p><b>Test Type :</b> ${courseInfo.test_type}</p>
                                    <p><b>Topic Name :</b> ${courseInfo.topic_name}</p>
                                    <p><b>Module Name :</b> ${courseInfo.module_name}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="topbar-right">
                        <button class="icon-btn" id="reload" title="Reload Extension">⟳</button>
                    </div>
                </div>

                <div class="main-layout">
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
                            <div id="data-view" style="display: none; height: 100%; flex-direction: column;">
                                <div id="q-content" style="flex: 1; overflow-y: auto;">
                                    <div class="q-title" id="q-title"></div>
                                    <div class="q-description" id="q-desc"></div>
                                </div>

                                <div id="status-bar" class="status-msg"></div>


                            </div>
                        </div>
                    </div>
                </div>

                <!-- ✅ action-bar inside question-ui -->
                <div class="action-bar">
                    <button class="btn-action" id="save-btn"><span>💾</span> Save</button>
                    <button class="btn-action btn-success" id="pull-btn">Pull</button>
                    <button class="btn-action btn-primary" id="verify-btn"><span>Check</span> Verify</button>
                </div>
            </div>
            <script nonce="${nonce}">
                const vscode = acquireVsCodeApi();

                vscode.postMessage({ command: 'ready' });

                const startBtn = document.getElementById('start');
                if (startBtn) {
                    startBtn.onclick = () => {
                        document.getElementById('step1').style.display = 'none';
                        document.getElementById('step2').style.display = 'block';
                    };
                }

                const continueBtn = document.getElementById('continue');
                if (continueBtn) {
                    continueBtn.onclick = () => {
                        vscode.postMessage({ command: 'startTest' });
                    };
                }

                const reloadBtn = document.getElementById('reload');
                if (reloadBtn) {
                    reloadBtn.onclick = () => {
                        vscode.postMessage({ command: 'reload' });
                    };
                }

                const saveBtn = document.getElementById('save-btn');
                if (saveBtn) {
                    saveBtn.onclick = () => {
                        const status = document.getElementById('status-bar');
                        status.className = 'status-msg info';
                        status.innerText = 'Saving...';
                        vscode.postMessage({ command: 'save' });
                    };
                }

                const verifyBtn = document.getElementById('verify-btn');
                if (verifyBtn) {
                    verifyBtn.onclick = () => {
                        const status = document.getElementById('status-bar');
                        status.className = 'status-msg info';
                        status.innerText = 'Verifying your code...';
                        vscode.postMessage({ command: 'verify' });
                    };
                }

                const pullBtn = document.getElementById('pull-btn');
                if (pullBtn) {
                    pullBtn.onclick = () => {
                        vscode.postMessage({ command: 'pull' });
                    };
                }

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
                            const qdata = Array.isArray(payload) ? payload[0] : payload;
                            if (qdata) {
                                document.getElementById('q-title').innerText = qdata?.question_name || qdata?.title || 'Question 1';
                                document.getElementById('q-desc').innerHTML = qdata?.description || qdata?.question || 'Empty Question Description';
                            }
                        } else if (message.state === 'status') {
                            const status = document.getElementById('status-bar');
                            status.className = 'status-msg ' + (message.type || 'info');
                            status.innerText = message.text;
                            if (message.type === 'success' || message.type === 'error') {
                                setTimeout(() => { if (status.innerText === message.text) status.style.display = 'none'; }, 5000);
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
