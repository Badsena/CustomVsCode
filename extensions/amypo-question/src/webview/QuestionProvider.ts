import * as vscode from 'vscode';
import { getQuestionTemplate } from './questionTemplate';

export class QuestionProvider implements vscode.WebviewViewProvider {
    public static readonly viewType = 'amypo-question-view';

    private _view?: vscode.WebviewView;

    constructor(
        private readonly _extensionUri: vscode.Uri,
    ) { }

    public resolveWebviewView(
        webviewView: vscode.WebviewView,
        _context: vscode.WebviewViewResolveContext,
        _token: vscode.CancellationToken,
    ) {
        this._view = webviewView;

        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [this._extensionUri]
        };

        // Render the full question template in the sidebar
        webviewView.webview.html = getQuestionTemplate(webviewView.webview, this._extensionUri);

        // Keep the view visible and don't let it get hidden
        webviewView.show?.(true);
    }
}
