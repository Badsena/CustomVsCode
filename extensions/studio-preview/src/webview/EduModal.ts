import * as vscode from 'vscode';

export class EduModal {
	private static _panel: vscode.WebviewPanel | undefined;

	public static show(context: vscode.ExtensionContext, courseInfo: { course_name: string; module_name: string; languages?: string[] }, onConfirm: () => void) {
		if (this._panel) {
			this._panel.reveal(vscode.ViewColumn.Active);
			return;
		}

		this._panel = vscode.window.createWebviewPanel(
			'eduModal',
			'Amypo: Test Ready',
			{ viewColumn: vscode.ViewColumn.Active, preserveFocus: false },
			{
				enableScripts: true,
				localResourceRoots: [context.extensionUri],
				retainContextWhenHidden: true
			}
		);

		this._panel.webview.html = this._getHtml(this._panel.webview, context.extensionUri, courseInfo);

		this._panel.webview.onDidReceiveMessage((message) => {
			switch (message.command) {
				case 'startTest':
					this._panel?.dispose();
					onConfirm();
					break;
				case 'cancel':
					this._panel?.dispose();
					break;
			}
		});

		this._panel.onDidDispose(() => {
			this._panel = undefined;
		});
	}

	private static _getHtml(webview: vscode.Webview, extensionUri: vscode.Uri, courseInfo: { course_name: string; module_name: string; languages?: string[] }) {
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
            <meta http-equiv="Content-Security-Policy"
                content="default-src 'none';
                         img-src ${webview.cspSource} https:;
                         script-src 'nonce-${nonce}';
                         style-src ${webview.cspSource} 'unsafe-inline';">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>
                body {
                    margin: 0;
                    padding: 0;
                    width: 100vw;
                    height: 100vh;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    background: rgba(0, 0, 0, 0.7);
                    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
                }
                #modal-content {
                    background: white;
                    border-radius: 16px;
                    width: 90%;
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
                    color: #2d3436;
                    margin-bottom: 4px;
                    text-transform: capitalize;
                }
                .subtext {
                    font-size: 15px;
                    color: #636e72;
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
                    background: #f1f2f6;
                    color: #2f3542;
                    padding: 4px 12px;
                    border-radius: 6px;
                    font-size: 12px;
                    font-weight: 600;
                }
                .buttons {
                    display: flex;
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
                    min-width: 130px;
                }
                .btn-cancel {
                    background: #f1f2f6;
                    color: #2f3542;
                }
                .btn-cancel:hover { background: #dfe4ea; }
                .btn-start {
                    background: #00ce7a;
                    color: white;
                }
                .btn-start:hover { background: #00b36a; }
            </style>
        </head>
        <body>
            <div id="modal-content">
                <img src="${logoUri}" alt="Amypo" class="illustration">
                <div class="title">${courseInfo.module_name}</div>
                <div class="subtext">${courseInfo.course_name}</div>
                ${languagesHtml}
                <div class="buttons">
                    <button class="btn-cancel" id="cancel">Cancel</button>
                    <button class="btn-start" id="start">Start Test</button>
                </div>
            </div>
            <script nonce="${nonce}">
                const vscode = acquireVsCodeApi();
                document.getElementById('cancel').onclick = () => vscode.postMessage({ command: 'cancel' });
                document.getElementById('start').onclick = () => vscode.postMessage({ command: 'startTest' });
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
