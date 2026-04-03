/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';
import { QuestionProvider } from './webview/QuestionProvider';
import { QuestionPanel } from './webview/QuestionPanel';

export function activate(context: vscode.ExtensionContext) {
    console.log('[Amypo Question] Activating…');

    // Command: opens the question as a fixed panel next to Explorer
    const openQuestionCmd = vscode.commands.registerCommand('amypo.openQuestion', async () => {
        // 1. Ensure Explorer is visible
        await vscode.commands.executeCommand('workbench.view.explorer');
        
        // 2. Ensure we have two columns for the Middle/Right layout
        await vscode.commands.executeCommand('workbench.action.editorLayoutTwoColumns');
        
        // 3. Open the question panel in the first editor column
        QuestionPanel.createOrShow(context.extensionUri);
    });

    const minimizeCmd = vscode.commands.registerCommand('amypo.minimizeQuestion', async () => {
        // Shrink the active editor (the question panel)
        await vscode.commands.executeCommand('workbench.action.decreaseViewWidth');
        await vscode.commands.executeCommand('workbench.action.decreaseViewWidth');
        await vscode.commands.executeCommand('workbench.action.decreaseViewWidth');
    });

    const maximizeCmd = vscode.commands.registerCommand('amypo.maximizeQuestion', async () => {
        // Expand the active editor (the question panel)
        await vscode.commands.executeCommand('workbench.action.maximizeEditor');
    });

    context.subscriptions.push(openQuestionCmd, minimizeCmd, maximizeCmd);
}

export function deactivate() {}
