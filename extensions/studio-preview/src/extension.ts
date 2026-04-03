import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);
import { PreviewManager } from './webview/PreviewManager';
import { SidebarProvider } from './providers/SidebarProvider';
// import { EduModal } from './webview/EduModal';
import { ProjectDetector } from './core/ProjectDetector';
// import { submitData } from './services/axios/submissions';

let isProcessing = false;
let globalPreviewManager: PreviewManager | undefined;
let globalSidebarProvider: SidebarProvider | undefined;
let pendingTestData: any = null;

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

    // Modal interaction is now handled via callback in getTestDetails

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

    /*
    // ✅ Amypo EduTech - Fetch and Process Test Details
    const API_URL = "https://1102amy21.amypo.ai/api";

    const fetchAdpUrl = async () => {
        console.log('[Amypo EduTech] fetchAdpUrl triggered');
        // Placeholder for ADP URL fetching logic
    };

    const getLanguageDetails = async (langIds: number[], token: string): Promise<string[]> => {
        try {
            const payload = { langIds };
            const endpoint = `${API_URL}/language_by_ids`;
            const resp = await submitData(payload, endpoint, 0, token);

            if (resp?.status !== 200 || !resp?.data) {
                console.error('[Amypo EduTech] Failed to fetch language details.');
                return [];
            }

            console.log('[Amypo EduTech] Language details:', resp.data);

            const languages: string[] = [];
            for (const lang_data of resp.data) {
                const langId = Number(lang_data?.language_id);
                if ([1002, 1003, 1004, 1005].includes(langId)) {
                    await fetchAdpUrl();
                }
                languages.push(lang_data?.language_name || 'Unknown');
            }
            return languages;
        } catch (error) {
            console.error('[Amypo EduTech] Error fetching languages:', error);
            return [];
        }
    };

    const getTestDetails = async (allocation_id: number, test_type: number, token: string, moduleId?: number): Promise<void> => {
        try {
            vscode.window.setStatusBarMessage(`$(sync~spin) Amypo: Fetching test details...`, 10000);

            let payload: any = {
                allocate_id: allocation_id,
                test_type: test_type,
            };
            if (moduleId) {
                payload.module_id = moduleId;
            }

            const endpoint = test_type == 2
                ? `${API_URL}/sandbox/fetch_link_test_details`
                : `${API_URL}/sandbox/fetch_test_details`;

            const resp = await submitData(payload, endpoint, 0, token);
            console.log('[Amypo EduTech] Test details response:', resp);

            if (resp?.status !== 200 || !resp?.data) {
                vscode.window.showWarningMessage('Amypo: No test details found.');
                return;
            }

            const allocation = resp.data.allocation ?? {};
            const test = resp.data.test ?? {};
            const course_details = resp.data.couse_details ?? {};
            const topic_details = resp.data.topic_details ?? {};

            // Log details (instead of React setters)
            console.log('[Amypo EduTech] Course Name:', course_details?.course_name);

            const courseInfo = {
                course_name: course_details?.course_name ?? 'N/A',
                topic_name: topic_details?.topic_name ?? 'N/A',
                module_name: (test_type == 0 ? test?.module_name : test?.testName) ?? 'N/A',
                course_type: course_details?.type ?? 0,
                test_type: test_type == 0 ? 'Practice' : 'Assessment',
            };

            // ✅ Save test details for "Start Test" confirmation
            pendingTestData = {
                repo_url: test?.repo_url || test?.project_link,
                question_url: test?.question_url || test?.question_link,
                test_id: String(test?.id || allocation_id),
                folder: test?.folder || '',
                token: token
            };

            // Check Expiry
            if (isAfterNow(allocation?.course_start_date)) {
                vscode.window.showWarningMessage('Amypo: This course has not started yet.');
            } else if (isBeforeNow(allocation?.course_end_date)) {
                vscode.window.showWarningMessage('Amypo: This course has already expired.');
            }

            // Fetch Languages if Practice (test_type == 0)
            let languages: string[] = [];
            if (test_type == 0 && course_details?.language) {
                try {
                    const langIds = JSON.parse(course_details.language);
                    if (Array.isArray(langIds)) {
                        languages = await getLanguageDetails(langIds, token);
                    }
                } catch (e) {
                    console.error('[Amypo EduTech] Error parsing languages:', e);
                }
            }

            // Update courseInfo with languages
            const finalCourseInfo = {
                ...courseInfo,
                languages: languages
            };

            // ✅ Show Centered Modal Popup instead of Sidebar update
            EduModal.show(context, finalCourseInfo, async () => {
                if (!pendingTestData) {
                    vscode.window.showErrorMessage('Amypo: No test data found to start.');
                    return;
                }
                const { repo_url, question_url, test_id, folder, token } = pendingTestData;
                await _startEduTest(context, repo_url, question_url || '', test_id, folder || '', token);
                pendingTestData = null;
            });

        } catch (error: any) {
            console.error('[Amypo EduTech] Error fetching test details:', error);
            vscode.window.showErrorMessage('Amypo: Failed to fetch test details.');
        }
    };

    // ✅ Static Trigger: Load test automatically on startup
    const staticAllocationId = 4092;
    const staticTestType = 0;
    const staticToken = '285393|5LWOidzOUKt6FCGTGF3AL01njTK94YWw3noOdHEP7f4b4a3c';
    const staticModuleId = 996;

    getTestDetails(staticAllocationId, staticTestType, staticToken, staticModuleId);
    */
}

/*
async function _startEduTest(
    context: vscode.ExtensionContext,
    repoUrl: string,
    questionUrl: string,
    testId: string | null,
    folder: string | null,
    token: string | null
) {
    ... // (ommited for brevity in this replace block, but actual content will be commented)
}
*/



export function deactivate() {
    if (globalPreviewManager) globalPreviewManager.dispose();
}
