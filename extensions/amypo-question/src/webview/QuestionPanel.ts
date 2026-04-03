/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';
import { getQuestionTemplate } from './questionTemplate';

export class QuestionPanel {
	public static currentPanel: QuestionPanel | undefined;
	private readonly _panel: vscode.WebviewPanel;
	private readonly _extensionUri: vscode.Uri;
	private _disposables: vscode.Disposable[] = [];

	public static createOrShow(extensionUri: vscode.Uri) {
		// If the panel already exists, just reveal it in column one
		if (QuestionPanel.currentPanel) {
			QuestionPanel.currentPanel._panel.reveal(vscode.ViewColumn.One);
			return;
		}

		// Create a new panel in the FIRST editor column (right next to Explorer)
		// preserveFocus: true ensures files you click still open in the next column
		const panel = vscode.window.createWebviewPanel(
			'amypoQuestion',
			'QUESTION',
			{ viewColumn: vscode.ViewColumn.One, preserveFocus: true },
			{
				enableScripts: true,
				retainContextWhenHidden: true,
				localResourceRoots: [extensionUri]
			}
		);

		panel.iconPath = vscode.Uri.joinPath(extensionUri, 'logo.png');

		QuestionPanel.currentPanel = new QuestionPanel(panel, extensionUri);
	}

	private constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri) {
		this._panel = panel;
		this._extensionUri = extensionUri;

		// Set the HTML content
		this._update();

		// Pin this editor so it stays fixed and doesn't get replaced
		vscode.commands.executeCommand('workbench.action.pinEditor');

		// When disposed, clean up
		this._panel.onDidDispose(() => this.dispose(), null, this._disposables);

		// Handle messages from the webview
		this._panel.webview.onDidReceiveMessage(
			async message => {
				switch (message.command) {
					case 'alert':
						vscode.window.showErrorMessage(message.text);
						return;
					case 'minimize':
						await vscode.commands.executeCommand('workbench.action.decreaseViewWidth');
						await vscode.commands.executeCommand('workbench.action.decreaseViewWidth');
						return;
					case 'maximize':
						await vscode.commands.executeCommand('workbench.action.maximizeEditor');
						return;
				}
			},
			null,
			this._disposables
		);
	}

	public dispose() {
		QuestionPanel.currentPanel = undefined;
		this._panel.dispose();

		while (this._disposables.length) {
			const x = this._disposables.pop();
			if (x) {
				x.dispose();
			}
		}
	}

	private _update() {
		this._panel.title = 'QUESTION';
		this._panel.webview.html = getQuestionTemplate(this._panel.webview, this._extensionUri);
	}
}
