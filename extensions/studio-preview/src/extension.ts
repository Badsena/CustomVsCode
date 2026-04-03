import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);
import { PreviewManager } from './webview/PreviewManager';
import { SidebarProvider } from './providers/SidebarProvider';
import { ProjectDetector } from './core/ProjectDetector';

let isProcessing = false;
let globalPreviewManager: PreviewManager | undefined;
let globalSidebarProvider: SidebarProvider | undefined;

export function activate(context: vscode.ExtensionContext) {
    console.log('[Amypo Browser] Activating…');

    const projectDetector = new ProjectDetector();
    const previewManager = PreviewManager.getInstance(context.extensionUri);
    globalPreviewManager = previewManager;

    const sidebarProvider = new SidebarProvider(
        context.extensionUri,
        projectDetector,
        previewManager
    );
    globalSidebarProvider = sidebarProvider;

    context.subscriptions.push(
        vscode.window.registerWebviewViewProvider(
            SidebarProvider.viewType,
            sidebarProvider
        )
    );

    //   amypo.toggleBrowser
    //   Multi-Server Responsive Toggle

    const toggleCmd = vscode.commands.registerCommand('amypo.toggleBrowser', async () => {
        if (isProcessing) return;

        // 1. If already open -> Close Browser
        if (previewManager.isOpen) {
            previewManager.toggle();
            return;
        }

        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders || workspaceFolders.length === 0) {
            vscode.window.showWarningMessage('Amypo Browser: Please open a folder.');
            return;
        }

        // Prioritize Active Root
        let activeRoot = workspaceFolders[0].uri.fsPath;
        const activeEditor = vscode.window.activeTextEditor;
        if (activeEditor) {
            const folder = vscode.workspace.getWorkspaceFolder(activeEditor.document.uri);
            if (folder) activeRoot = folder.uri.fsPath;
        }

        isProcessing = true;
        try {
            await vscode.window.withProgress(
                { location: vscode.ProgressLocation.Notification, title: 'Amypo Browser', cancellable: false },
                async (progress) => {
                    progress.report({ message: 'Detecting services…' });

                    const projects = await projectDetector.detect(activeRoot);

                    progress.report({ message: 'Launching Dashboard…' });
                    // ✅ Always use open() — it sets projects first then opens
                    previewManager.open(
                        projects.length > 0
                            ? projects
                            : [{ type: 'static', category: 'static', rootPath: activeRoot, port: 5500, startCommand: '', label: 'Local Dev' }]
                    );
                }
            );
        } finally {
            isProcessing = false;
        }
    });


    // Detects changes in the workspace and automatically refreshes the browser.
    const autoReloadListener = vscode.workspace.onDidSaveTextDocument((doc) => {
        // Only reload if it's a code/style/markup file
        const ext = doc.fileName.split('.').pop()?.toLowerCase();
        const validExts = ['ts', 'js', 'tsx', 'jsx', 'html', 'css', 'scss', 'json', 'py', 'php', 'java'];

        if (previewManager.isOpen && validExts.includes(ext || '')) {
            console.log('[Amypo Browser] Auto-Reload triggered by file save:', doc.fileName);
            previewManager.navigate('refresh');
        }
    });

    const openCmd = vscode.commands.registerCommand('amypo.openSimpleBrowser',
        () => vscode.commands.executeCommand('amypo.toggleBrowser'));

    context.subscriptions.push(toggleCmd, openCmd, autoReloadListener,
        {
            dispose: () => {
                previewManager.dispose();
            }
        });


    /*
    // ✅ Amypo EduTech - Handle URL Protocol
    // amypo://starttest?repo=...&question=...
    context.subscriptions.push(
        vscode.window.registerUriHandler({
            handleUri: async (uri: vscode.Uri) => {
                vscode.window.setStatusBarMessage(`$(sync~spin) Amypo EduTech: URI Received...`, 5000);
                console.log('[Amypo EduTech] URI received:', uri.toString());

                const params = new URLSearchParams(uri.query);
                const isStartTest = uri.path.includes('starttest') || uri.authority === 'starttest';
                const isSubmitTest = uri.path.includes('submittest') || uri.authority === 'submittest';

                if (isStartTest) {
                    const allocationId = params.get('allocation_id');
                    const testType = params.get('test_type');
                    const token = params.get('testId');
                    const moduleId = params.get('module_id');

                    if (allocationId && testType && token) {
                        await getTestDetails(Number(allocationId), Number(testType), token, moduleId ? Number(moduleId) : undefined);
                    } else {
                        vscode.window.showErrorMessage('Amypo: Invalid Test URI parameters.');
                    }
                }
            }
        })
    );
    */

    vscode.commands.executeCommand('setContext', 'amypo.browserOpen', false);


}


export function deactivate() {
    if (globalPreviewManager) globalPreviewManager.dispose();
}
