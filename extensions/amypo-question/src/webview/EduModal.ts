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
                .btn-action {
                    flex: 1;
                    padding: 10px;
                    border-radius: 6px;
                    border: 1px solid var(--vscode-widget-border, #dfe4ea);
                    background: var(--vscode-button-secondaryBackground, #f1f2f6);
                    color: var(--vscode-button-secondaryForeground, #2d3436);
                    font-size: 13px;
                    font-weight: 600;
                    cursor: pointer;
                    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    gap: 2px;
                    box-shadow: 0 1px 3px rgba(0,0,0,0.1);
                }
                .btn-action:hover {
                    background: var(--vscode-button-secondaryHoverBackground, #dfe4ea);
                    transform: translateY(-1px);
                    box-shadow: 0 2px 5px rgba(0,0,0,0.15);
                }
                .btn-action:active { transform: translateY(0); }
                .btn-primary { background: #3867d6; color: white; border: none; }
                .btn-primary:hover { background: #2b52ad; }
                .btn-success { background: #00ce7a; color: white; border: none; }
                .btn-success:hover { background: #00b36a; }
                .btn-action:disabled {
                    opacity: 0.6;
                    cursor: not-allowed;
                    transform: none !important;
                    box-shadow: none !important;
                }
                .save-time {
                    font-size: 12px;
                    opacity: 0.9;
                    font-weight: 400;
                    margin-top: -2px;
                }

                .status-msg { margin-top: 12px; font-size: 12px; font-weight: 500; display: none; padding: 8px; border-radius: 4px; }
                .status-msg.success { display: block; background: #e6fcf5; color: #087f5b; border: 1px solid #c3fae8; }
                .status-msg.error { display: block; background: #fff5f5; color: #c92a2a; border: 1px solid #ffe3e3; }
                .status-msg.info { display: block; background: #e7f5ff; color: #1864ab; border: 1px solid #d0ebff; }

                .loader-container { display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; color: var(--vscode-descriptionForeground, #636e72); }
                .spinner { border: 4px solid var(--vscode-widget-border, rgba(0,0,0,0.1)); width: 36px; height: 36px; border-radius: 50%; border-left-color: #0984e3; animation: spin 1s linear infinite; margin-bottom: 16px; }
                .btn-spinner {
                    width: 12px;
                    height: 12px;
                    border: 2px solid rgba(0, 0, 0, 0.1);
                    border-radius: 50%;
                    border-top-color: currentColor;
                    animation: spin 0.8s linear infinite;
                    display: none;
                }
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

                .verify-text { font-size: 15px; color: var(--vscode-descriptionForeground, #636e72); font-weight: 500; text-align: center; }

                /* Verification Loader Overlay */
                .verify-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.4); backdrop-filter: blur(2px); z-index: 9999; display: none; flex-direction: column; align-items: center; justify-content: center; }
                .verify-modal { background: var(--vscode-editorWidget-background, white); padding: 40px; border-radius: 12px; box-shadow: 0 20px 60px rgba(0,0,0,0.5); display: flex; flex-direction: column; align-items: center; justify-content: center; width: 90%; max-width: 600px; animation: fadeIn 0.3s ease-out; }
                .verify-terminal { background: #0b0c16; border-radius: 8px; padding: 24px; width: 100%; max-width: 400px; height: 160px; box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15); display: flex; flex-direction: column; gap: 8px; font-family: monospace; font-size: 13px; color: #4a6fe3; margin-bottom: 24px; position: relative; overflow: hidden; }
                .verify-term-line { display: none; }
                .verify-term-line.active { display: block; animation: fadeIn 0.3s ease-out forwards; }
                .verify-term-line.current { color: #8bb2ff; text-shadow: 0 0 8px #8bb2ff; position: relative; }
                .verify-term-line.current::after { content: ''; position: absolute; top: 50%; left: -10px; right: -10px; height: 140%; transform: translateY(-50%); background: linear-gradient(90deg, transparent, rgba(74, 111, 227, 0.4), transparent); z-index: 0; animation: scan 2s infinite linear; }
                .verify-term-line span { position: relative; z-index: 1; }
                @keyframes scan { 0% { background-position: -200px 0; } 100% { background-position: 200px 0; } }

                /* Results Modal */
                .result-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.5); z-index: 10000; display: none; align-items: center; justify-content: center; overflow-y: auto; padding: 20px; }
                .result-modal { background: #fff; width: 100%; max-width: 900px; border-radius: 8px; position: relative; display: flex; flex-direction: column; animation: fadeIn 0.3s ease-out; padding: 30px; box-shadow: 0 10px 40px rgba(0,0,0,0.2); }
                .result-close { position: absolute; right: 20px; top: 15px; cursor: pointer; font-size: 24px; color: #666; font-weight: 300; line-height: 1; }
                .result-close:hover { color: #333; }
                .result-header { background: #eef2f7; border-radius: 8px; padding: 12px; display: flex; align-items: center; justify-content: center; gap: 10px; color: #2d3436; font-weight: 600; margin-bottom: 25px; font-size: 14px; }
                .result-header i { font-style: normal; display: flex; align-items: center; justify-content: center; background: #00d2be; color: white; width: 22px; height: 22px; border-radius: 4px; font-size: 12px; }

                .result-section-label { font-size: 16px; font-weight: 700; color: #212529; margin-bottom: 20px; text-align: left; width: 100%; }
                .result-cards { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 30px; width: 100%; }
                .result-card { border: 1px solid #e9ecef; border-radius: 12px; padding: 20px 10px; text-align: center; display: flex; flex-direction: column; gap: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.02); }
                .result-card-val { font-size: 28px; font-weight: 800; color: #2d3436; }
                .result-card-label { font-size: 13px; color: #868e96; font-weight: 600; }

                .result-card.passed { border-color: #d3f9d8; background: #f4fff7; }
                .result-card.passed .result-card-val { color: #00ce7a; }
                .result-card.passed .result-card-label { color: #00ce7a; }

                .result-card.failed { border-color: #ffe3e3; background: #fff5f5; }
                .result-card.failed .result-card-val { color: #ff5e5e; }
                .result-card.failed .result-card-label { color: #ff5e5e; }

                .result-card.score { border-color: #fff9db; background: #fffdf2; }
                .result-card.score .result-card-val { color: #fab005; }
                .result-card.score .result-card-label { color: #fab005; }

                .terminal-box { border: 1px solid #eee; border-radius: 8px; padding: 20px; background: #fff; color: #636e72; font-family: 'Courier New', monospace; font-size: 13px; min-height: 100px; max-height: 300px; overflow-y: auto; text-align: left; width: 100%; box-sizing: border-box; }
                .terminal-empty { color: #adb5bd; text-align: center; margin-top: 10px; }

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
                    <button class="btn-action" id="save-btn">
                        <div style="display: flex; align-items: center; gap: 8px;">
                            <div class="btn-spinner" id="save-spinner"></div>
                            <span>💾 Save</span>
                        </div>
                        <div>
                            <span>Last Saved : </span>
                            <span class="save-time" id="last-saved-time"></span>
                        </div>
                    </button>
                    <button class="btn-action btn-success" id="pull-btn">Pull</button>
                    <button class="btn-action btn-primary" id="verify-btn"><span>Check Verify</span></button>
                </div>

                <!-- Verification Loader UI -->
                <div id="verify-overlay" class="verify-overlay">
                    <div class="verify-modal">
                        <div class="verify-terminal" id="verify-terminal">
                            <div class="verify-term-line" id="vline-1"><span>> Checking modules...</span></div>
                            <div class="verify-term-line" id="vline-2"><span>> Loading assets...</span></div>
                            <div class="verify-term-line" id="vline-3"><span>> Validating signature...</span></div>
                            <div class="verify-term-line" id="vline-4"><span>> Running scan...</span></div>
                            <div class="verify-term-line" id="vline-5"><span>> Checking dependencies...</span></div>
                            <div class="verify-term-line" id="vline-6"><span>> Verification in progress...</span></div>
                        </div>
                        <div class="verify-text">Verification is in Progress...</div>
                    </div>
                </div>

                <!-- Test Result Modal -->
                <div id="result-overlay" class="result-overlay">
                    <div class="result-modal">
                        <div class="result-close" id="result-close">&times;</div>
                        <div class="result-header">
                            <i>[]</i> Test result
                        </div>

                        <div class="result-section-label">Test Results Summary</div>
                        <div class="result-cards">
                            <div class="result-card">
                                <span class="result-card-val" id="res-total">0</span>
                                <span class="result-card-label">Total</span>
                            </div>
                            <div class="result-card passed">
                                <span class="result-card-val" id="res-passed">0</span>
                                <span class="result-card-label">Passed</span>
                            </div>
                            <div class="result-card failed">
                                <span class="result-card-val" id="res-failed">0</span>
                                <span class="result-card-label">Failed</span>
                            </div>
                            <div class="result-card score">
                                <span class="result-card-val" id="res-score">0.00</span>
                                <span class="result-card-label">Score</span>
                            </div>
                        </div>

                        <div class="result-header">
                            <i>[]</i> Terminal Output
                        </div>
                        <div class="terminal-box" id="res-terminal">No output from Terminal</div>
                    </div>
                </div>

            </div>
            <script nonce="${nonce}">
                let vInterval = null;
                let expectedTestCount = 0;
                let totalQuestionMark = 0;
                const vscode = acquireVsCodeApi();

                const resOverlay = document.getElementById('result-overlay');
                const resClose = document.getElementById('result-close');
                if (resClose) {
                    resClose.onclick = () => { if(resOverlay) resOverlay.style.display = 'none'; };
                }

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

                        saveBtn.disabled = true;
                        document.getElementById('save-spinner').style.display = 'block';

                        vscode.postMessage({ command: 'save' });
                    };
                }

                const verifyBtn = document.getElementById('verify-btn');
                if (verifyBtn) {
                    verifyBtn.onclick = () => {
                        verifyBtn.disabled = true;

                        const vOverlay = document.getElementById('verify-overlay');
                        if(vOverlay) vOverlay.style.display = 'flex';

                        // Reset all lines
                        for (let i = 1; i <= 6; i++) {
                            const line = document.getElementById('vline-' + i);
                            if(line) line.className = 'verify-term-line';
                        }

                        let currentLine = 1;
                        if (vInterval) clearInterval(vInterval);

                        vInterval = setInterval(() => {
                            if (currentLine <= 6) {
                                if (currentLine > 1) {
                                    const prev = document.getElementById('vline-' + (currentLine - 1));
                                    if(prev) prev.className = 'verify-term-line active';
                                }
                                const curr = document.getElementById('vline-' + currentLine);
                                if(curr) curr.className = 'verify-term-line active current';
                                currentLine++;
                            } else {
                                clearInterval(vInterval);
                            }
                        }, 800);

                        vscode.postMessage({ command: 'verify' });
                    };
                }

                const pullBtn = document.getElementById('pull-btn');
                if (pullBtn) {
                    pullBtn.onclick = () => {
                        vscode.postMessage({ command: 'pull' });
                    };
                }

                let lastSavedTimestamp = null;
                function updateRelativeTime() {
                    if (!lastSavedTimestamp) return;
                    const el = document.getElementById('last-saved-time');
                    if (!el) return;

                    const diff = Math.floor((Date.now() - lastSavedTimestamp) / 1000);
                    if (diff < 5) el.innerText = 'just now';
                    else if (diff < 60) el.innerText = diff + ' secs ago';
                    else if (diff < 3600) el.innerText = Math.floor(diff / 60) + ' mins ago';
                    else el.innerText = Math.floor(diff / 3600) + ' hrs ago';
                }
                setInterval(updateRelativeTime, 10000);

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

                                // Parse expected test case count from metadata
                                if (qdata.testcaseCount) {
                                    try {
                                        const counts = JSON.parse(qdata.testcaseCount);
                                        // Take spring count as priority, fallback to react
                                        expectedTestCount = parseInt(counts.spring || counts.react || 0);
                                        console.log('[Amypo] Expected test case count:', expectedTestCount);
                                    } catch(e) {
                                        console.warn('[Amypo] Failed to parse testcaseCount:', qdata.testcaseCount);
                                    }
                                }

                                if (qdata.mark) {
                                    totalQuestionMark = parseInt(qdata.mark);
                                    console.log('[Amypo] Total question mark:', totalQuestionMark);
                                }
                            }
                        } else if (message.state === 'status') {
                            const status = document.getElementById('status-bar');
                            status.className = 'status-msg ' + (message.type || 'info');
                            status.innerText = message.text;

                            // Re-enable save button on success or error
                            if (message.type === 'success' || message.type === 'error') {
                                setTimeout(() => { if (status.innerText === message.text) status.style.display = 'none'; }, 5000);
                                const sBtn = document.getElementById('save-btn');
                                if (sBtn) {
                                    sBtn.disabled = false;
                                    document.getElementById('save-spinner').style.display = 'none';
                                }

                                // Clean up verify overlay and logic
                                const vBtn = document.getElementById('verify-btn');
                                if (vBtn) {
                                    vBtn.disabled = false;
                                }
                                const vOverlay = document.getElementById('verify-overlay');
                                if (vOverlay) {
                                    vOverlay.style.display = 'none';
                                }
                                if (vInterval) clearInterval(vInterval);

                                // Show results modal if payload exists
                                if (message.payload) {
                                    const payload = message.payload;
                                    const results = payload.test_results || {};

                                    const totalDisplay = expectedTestCount > 0 ? expectedTestCount : (results.total || 0);
                                    const passed = results.passed || 0;
                                    const failed = Math.max(0, totalDisplay - passed);

                                    document.getElementById('res-total').innerText = totalDisplay;
                                    document.getElementById('res-passed').innerText = passed;
                                    document.getElementById('res-failed').innerText = failed;

                                    const multiplier = totalQuestionMark > 0 ? totalQuestionMark : 10;
                                    const score = totalDisplay > 0 ? ((passed / totalDisplay) * multiplier).toFixed(2) : "0.00";
                                    document.getElementById('res-score').innerText = score;

                                    const terminalBox = document.getElementById('res-terminal');
                                    if (payload.full_terminal_output) {
                                        terminalBox.innerText = payload.full_terminal_output;
                                        terminalBox.style.color = '#636e72';
                                        terminalBox.className = 'terminal-box';
                                    } else {
                                        terminalBox.innerText = 'No output from Terminal';
                                        terminalBox.className = 'terminal-box terminal-empty';
                                    }

                                    if (resOverlay) resOverlay.style.display = 'flex';
                                }
                            }
                        } else if (message.state === 'saved') {
                             lastSavedTimestamp = message.timestamp;
                             updateRelativeTime();

                             // Also re-enable here just in case
                             const sBtn = document.getElementById('save-btn');
                             if (sBtn) {
                                 sBtn.disabled = false;
                                 document.getElementById('save-spinner').style.display = 'none';
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
