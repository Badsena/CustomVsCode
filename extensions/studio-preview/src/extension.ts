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
import { submitData } from './services/axios/submissions';

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

    context.subscriptions.push(toggleCmd, openCmd, autoReloadListener,
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
                    const module_id = params.get('module_id') ?? "";
                    const mode = params.get('mode') ?? "development";

                    if (!allocation_id || !test_type || !token) {
                        vscode.window.showErrorMessage('Invalid test URL!');
                        return;
                    }

                }
            }
        })
    );

    vscode.commands.executeCommand('setContext', 'amypo.browserOpen', false);

    // vscode.commands.executeCommand('amypo-sidebar.focus');

    // To start test
    const test_type = 0;
    const allocation_id = 4092;
    const token = '285393|5LWOidzOUKt6FCGTGF3AL01njTK94YWw3noOdHEP7f4b4a3c';
    const moduleId = 996;
    const mode = "development";
    const API_URL = "https://1102amy21.amypo.ai/api";
    const getTestDetails = async (): Promise<void> => {
        try {
            let resp = null

            if (allocation_id && test_type) {
                let payload = {}
                if (moduleId) {
                    payload = {
                        allocate_id: allocation_id,
                        test_type: test_type,
                        module_id: moduleId,
                    }
                } else {
                    payload = {
                        allocate_id: allocation_id,
                        test_type: test_type,
                    }
                }
                const endpoint =
                    test_type == 2
                        ? `${API_URL}/sandbox/fetch_link_test_details`
                        : `${API_URL}/sandbox/fetch_test_details`
                resp = await submitData(payload, endpoint, 0)

                console.log('test details resp:', resp)

                if (resp?.status !== 200 || !resp?.data) {
                    console.warn('No test details found.')
                    return
                }

                const allocation = resp.data.allocation ?? {}
                const test = resp.data.test ?? {}
                const couse_details = resp.data.couse_details ?? {}
                const topic_details = resp.data.topic_details ?? {}

                setDialogueTestDetails((prev) => ({
                    ...prev,
                    courseName: couse_details?.course_name ?? 'N/A',
                }))

                const courseDetails = {
                    course_name: couse_details?.course_name ?? 'N/A',
                    topic_name: topic_details?.topic_name ?? 'N/A',
                    module_name: test?.module_name ?? 'N/A',
                    course_type: couse_details?.type ?? 0,
                    test_type:
                        test_type == 0
                            ? 'Practice'
                            : 'Assessment',
                }
                setUserCourseInfo((prev) => ({
                    ...prev,
                    courseInfo: courseDetails,
                }))

                console.log('allocation', allocation)

                setAllocationData(allocation)

                setDialogBox(1)

                // Normalize proctoring
                let proctoringData = []
                const rawProctor = allocation?.proctoring
                if (rawProctor != null) {
                    if (typeof rawProctor === 'string') {
                        try {
                            proctoringData = JSON.parse(rawProctor)
                        } catch (e) {
                            console.error('Invalid proctoring JSON:', e)
                            proctoringData = []
                        }
                    } else {
                        proctoringData = rawProctor
                    }
                }

                if (isAfterNow(allocation?.course_start_date)) {
                    setDialogueTestDetails((prev) => ({
                        ...prev,
                        expiry: 1,
                    }))
                } else if (isBeforeNow(allocation?.course_end_date)) {
                    setDialogueTestDetails((prev) => ({
                        ...prev,
                        expiry: 2,
                    }))
                } else if (isAfterNow(allocation?.topic_start_date)) {
                    setDialogueTestDetails((prev) => ({
                        ...prev,
                        expiry: 3,
                    }))
                } else if (isBeforeNow(allocation?.topic_end_date)) {
                    setDialogueTestDetails((prev) => ({
                        ...prev,
                        expiry: 4,
                    }))
                }

                if (searchParamsDatas?.testType == 0) {
                    setDialogueTestDetails((prev) => ({
                        ...prev,
                        testName: test?.module_name ?? 'N/A',
                    }))

                    if (couse_details?.language) {
                        await getLanguageDetails(
                            JSON.parse(couse_details?.language),
                        )
                    }

                    // set coding_eval_count here
                    setProctoringDatas((prev: any) => ({
                        ...prev,
                        coding_eval_count: test?.coding_eval_count
                            ? Number(test?.coding_eval_count)
                            : 0,
                    }))
                } else {
                    setDialogueTestDetails((prev) => ({
                        ...prev,
                        testName: test?.testName ?? 'N/A',
                    }))

                    // Modules setup
                    const modules = Array.isArray(test?.test_modules)
                        ? test.test_modules
                        : []
                    if (modules.length == 0) {
                        console.log('No TestModule Found')
                        return
                    }

                    console.log('modules', modules)

                    setTestModule(modules)
                }
                setProctoring(proctoringData ?? null)

                return
            }
        } catch (error: any) {
            console.error(error)
            if (error?.response?.data?.status === 404) {
                console.log(error?.response?.data?.message)
            }
        }
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



export function deactivate() {
    if (globalPreviewManager) globalPreviewManager.dispose();
}
