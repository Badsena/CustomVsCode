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
import { getQuestionHtml, QuestionData } from './webview/questionTemplate';

let isProcessing = false;
let globalPreviewManager: PreviewManager | undefined;

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

    context.subscriptions.push(
        vscode.window.registerWebviewViewProvider(
            SidebarProvider.viewType,
            sidebarProvider
        )
    );

    /**
     * amypo.toggleBrowser
     * Multi-Server Responsive Toggle
     */
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

    /**
     * NEW FEATURE: Auto-Reload on File Save (v1.3)
     * Detects changes in the workspace and automatically refreshes the browser.
     */
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

    const refreshCmd = vscode.commands.registerCommand('amypo.refreshBrowser',
        () => previewManager.navigate('refresh'));

    const submitCmd = vscode.commands.registerCommand('amypo.submitTest', async () => {
        if (previewManager.currentTest) {
            const { testPath, testId } = previewManager.currentTest;
            await submitEduTest(testPath, testId);
        } else {
            vscode.window.showInformationMessage('No active test to submit.');
        }
    });

    context.subscriptions.push(toggleCmd, openCmd, refreshCmd, submitCmd, autoReloadListener,
        {
            dispose: () => {
                previewManager.dispose();
            }
        });


    // ✅ Amypo EduTech - Handle URL Protocol
    // amypo://starttest?repo=...&question=...
    context.subscriptions.push(
        vscode.window.registerUriHandler({
            handleUri: async (uri: vscode.Uri) => {
                vscode.window.setStatusBarMessage(`$(sync~spin) Amypo EduTech: URI Received...`, 5000);
                console.log('[Amypo EduTech] URI received:', uri.toString(), 'Path:', uri.path, 'Authority:', uri.authority);

                const isStartTest = uri.path === '/starttest' || uri.path === '/starttest/' || uri.authority === 'starttest';
                const isSubmitTest = uri.path === '/submittest' || uri.path === '/submittest/' || uri.authority === 'submittest';

                if (isStartTest) {
                    vscode.window.showInformationMessage('🚀 Amypo: Starting EduTech Test...');
                    const params = new URLSearchParams(uri.query);
                    const test_type = params.get('test_type');
                    const allocation_id = params.get('allocation_id');
                    const token = params.get('testId');
                    const _module_id = params.get('_module_id') ?? "";
                    const _mode = params.get('_mode') ?? "development";

                    if (!allocation_id || !test_type || !token) {
                        vscode.window.showErrorMessage('Invalid test URL!');
                        return;
                    }

                } else if (isSubmitTest) {
                    const params = new URLSearchParams(uri.query);
                    const testId = params.get('testId');

                    if (!previewManager.currentTest) {
                        vscode.window.showErrorMessage('No active test found to submit.');
                        return;
                    }

                    await submitEduTest(
                        previewManager.currentTest.testPath,
                        testId || previewManager.currentTest.testId
                    );
                }
            }
        })
    );

    vscode.commands.executeCommand('setContext', 'amypo.browserOpen', false);

    // ✅ CRITICAL: Resume pending test after extension host restart
    // When _startEduTest opens a folder, the extension host restarts.
    // We saved the test info to globalState BEFORE the restart.
    // Now we pick it up and finish the flow: fetch question → render → show submit.
    const pendingTest = context.globalState.get<{
        testPath: string;
        questionUrl: string;
        testId: string | null;
        token: string | null;
    }>('pendingEduTest');

    if (pendingTest) {
        console.log('[Amypo EduTech] Resuming pending test:', pendingTest);
        // Clear immediately so we don't loop on next activation
        context.globalState.update('pendingEduTest', undefined);

        // Delay to let VS Code fully render the Explorer with the new folder
        setTimeout(async () => {
            try {
                vscode.window.setStatusBarMessage(`$(sync~spin) Amypo: Loading Question...`, 5000);
                // Fetch question data from API with Bearer token
                const questionData = await fetchQuestion(pendingTest.questionUrl, pendingTest.token);

                // Show question in a dedicated webview panel
                showQuestionPanel(context, questionData);

                // Set test context so Submit button appears in sidebar
                previewManager.currentTest = {
                    testPath: pendingTest.testPath,
                    testId: pendingTest.testId
                };
                previewManager.refreshStatus();

                vscode.window.showInformationMessage(
                    '✅ Test loaded! Write your code and click Submit when ready.'
                );
            } catch (err) {
                console.error('[Amypo EduTech] Failed to load question:', err);
                vscode.window.showErrorMessage(`Failed to load question: ${err}`);
            }
        }, 2000);
    }
}

async function _startEduTest(
    context: vscode.ExtensionContext,
    repoUrl: string,
    questionUrl: string,
    testId: string | null,
    folder: string | null,
    token: string | null
) {
    await vscode.window.withProgress({
        location: vscode.ProgressLocation.Notification,
        title: 'Amypo EduTech',
        cancellable: false
    }, async (progress) => {

        // Step 1 — Clone repo
        progress.report({ message: 'Cloning test repository...' });
        vscode.window.setStatusBarMessage(`$(cloud-download) Amypo: Cloning Repository...`, 10000);
        const testPath = path.join(
            os.homedir(),
            'AmypoTests',
            testId || 'current-test'
        );

        try {
            // Clean old test if exists
            if (fs.existsSync(testPath)) {
                fs.rmSync(testPath, { recursive: true });
            }

            // Ensure parent directory exists
            const parentDir = path.dirname(testPath);
            if (!fs.existsSync(parentDir)) {
                fs.mkdirSync(parentDir, { recursive: true });
            }

            let finalRepoUrl = repoUrl;
            if (!repoUrl.startsWith('http') && !repoUrl.startsWith('git@')) {
                finalRepoUrl = `https://github.com/${repoUrl.includes('/') ? repoUrl : 'Badsena/' + repoUrl}`;
            }

            await execAsync(`git clone "${finalRepoUrl}" "${testPath}"`);

        } catch (err) {
            vscode.window.showErrorMessage(`Failed to clone repo: ${err}`);
            return;
        }

        // Step 2 — Save test state BEFORE opening folder
        // ⚡ CRITICAL: Opening a folder restarts the extension host.
        // Everything after vscode.openFolder will be DESTROYED.
        // We save the test info to persistent globalState so activate() can resume it.
        progress.report({ message: 'Opening project...' });
        const openPath = folder ? path.join(testPath, folder) : testPath;
        const uri = vscode.Uri.file(openPath);

        await context.globalState.update('pendingEduTest', {
            testPath: openPath,
            questionUrl,
            testId,
            token
        });

        console.log('[Amypo EduTech] Saved pending test to globalState. Opening folder...');

        // Step 3 — Open folder in current window
        // This WILL restart the extension host. Code below this line never runs.
        // activate() will detect the pending test and finish the flow.
        await vscode.commands.executeCommand('vscode.openFolder', uri, { forceNewWindow: false });

        // ⚠️ Lines below here are unreachable after host restart.
        // They only run if the folder was already open (no restart needed).
    });
}

/**
 * Fetch question data from EduTech API with Bearer token authentication.
 */
async function fetchQuestion(apiUrl: string, token: string | null): Promise<QuestionData> {
    const headers: Record<string, string> = {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
    };

    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(apiUrl, { headers });

    if (!response.ok) {
        throw new Error(`API returned ${response.status}: ${response.statusText}`);
    }

    const json = await response.json() as any;

    // Handle wrapped responses like { data: { ... } } or { question: { ... } }
    return json.data || json.question || json.result || json;
}

/**
 * Show fetched question in a dedicated VS Code webview panel.
 */
function showQuestionPanel(
    context: vscode.ExtensionContext,
    question: QuestionData
) {
    const panel = vscode.window.createWebviewPanel(
        'amypoQuestion',
        `📝 ${question.title || 'Test Question'}`,
        { viewColumn: vscode.ViewColumn.Beside, preserveFocus: true },
        {
            enableScripts: true,
            retainContextWhenHidden: true,
            localResourceRoots: [context.extensionUri]
        }
    );

    panel.webview.html = getQuestionHtml(panel.webview, question);

    console.log('[Amypo EduTech] Question panel opened:', question.title);
}

async function submitEduTest(testPath: string, testId: string | null) {
    await vscode.window.withProgress({
        location: vscode.ProgressLocation.Notification,
        title: 'Submitting test...',
        cancellable: false
    }, async (progress) => {

        // Push to GitHub
        progress.report({ message: 'Pushing code to GitHub...' });
        try {
            await execAsync('git add .', { cwd: testPath });
            await execAsync('git commit -m "Test submission - Amypo Coder"', { cwd: testPath });
            await execAsync('git push', { cwd: testPath });
        } catch (err) {
            console.error('[Amypo] Git push failed:', err);
            vscode.window.showErrorMessage('Failed to push code to GitHub. Please try again.');
        }

        progress.report({ message: 'Notifying portal...' });

        // Notify API
        try {
            await fetch('https://your-edutech-api.com/submit', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ testId, status: 'submitted' })
            });
        } catch (err) {
            console.error('[Amypo] API notification failed:', err);
        }

        vscode.window.showInformationMessage(
            '🎉 Test submitted successfully!'
        );
    });
}

export function deactivate() {
    if (globalPreviewManager) globalPreviewManager.dispose();
}
