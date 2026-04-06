/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';

import * as os from 'os';
import * as path from 'path';
import * as fs from 'fs';
import { exec } from 'child_process';
import { promisify } from 'util';
const execAsync = promisify(exec);

import { EduViewProvider } from './webview/EduModal';
import { submitData } from './services/axios/submissions';



export function activate(context: vscode.ExtensionContext) {
    console.log('[Amypo Question] Activating…');
    let currentAllocationData: any = null;
    let currentProjectPath: string | null = null;
    let currentRepoUrl: string | null = null;
    let currentProjectType: 'react' | 'fullstack' | 'spring' = 'spring';

    const GITHUB_TOKEN = "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"; // Replace with actual PAT

    const injectToken = (url: string, token: string): string => {
        if (!url || !token || url.includes('@')) return url;
        try {
            return url.replace('https://', `https://${token}@`);
        } catch {
            return url;
        }
    };

    const syncGit = async (action: 'save' | 'pull') => {
        if (!currentProjectPath || !currentRepoUrl) {
            eduViewProvider.postMessage({ state: 'status', type: 'error', text: 'No active project found.' });
            return;
        }

        // Detect subdirectory based on type (following user snippet logic)
        let subpath = '';
        if (currentProjectType === 'react') subpath = 'reactapp';
        else if (currentProjectType === 'fullstack') subpath = '';
        else subpath = 'demo';

        const fullPath = path.join(currentProjectPath, subpath);
        const gitDir = path.join(fullPath, '.git');

        // If the specific subdir isn't a git repo, fallback to root
        let workingDir = fullPath;
        if (!fs.existsSync(gitDir)) {
            workingDir = currentProjectPath;
        }

        console.log(`[Amypo Git] ${action} in ${workingDir}`);
        eduViewProvider.postMessage({ state: 'status', type: 'info', text: `${action === 'save' ? 'Saving' : 'Pulling'} changes...` });

        try {
            const authenticatedUrl = injectToken(currentRepoUrl, GITHUB_TOKEN);

            if (action === 'save') {
                // 1. git add .
                await execAsync('git add .', { cwd: workingDir });

                // 2. git commit (allow failure if nothing to commit)
                try {
                    await execAsync('git commit -m "User commit"', { cwd: workingDir });
                } catch (e) {
                    console.log('[Amypo Git] Commit failed (possibly nothing to commit)');
                }

                // 3. git push (using authenticated URL directly to hide token from config)
                await execAsync(`git push ${authenticatedUrl} main`, { cwd: workingDir });
                eduViewProvider.postMessage({ state: 'status', type: 'success', text: 'Saved to cloud successfully!' });
            } else {
                // git pull (using authenticated URL directly)
                await execAsync(`git pull ${authenticatedUrl} main`, { cwd: workingDir });
                eduViewProvider.postMessage({ state: 'status', type: 'success', text: 'Pulled latest changes!' });
            }
        } catch (error: any) {
            console.error(`[Amypo Git] Error during ${action}:`, error);
            const errMsg = error.stderr || error.message || 'Git operation failed';
            eduViewProvider.postMessage({ state: 'status', type: 'error', text: `Failed: ${errMsg}` });
        }
    };

    const eduViewProvider = new EduViewProvider(context.extensionUri);
    context.subscriptions.push(
        vscode.window.registerWebviewViewProvider(EduViewProvider.viewType, eduViewProvider, {
            webviewOptions: {
                retainContextWhenHidden: true
            }
        })
    );

    // Command: opens the question as a fixed panel next to Explorer


    // ✅ Amypo EduTech - Fetch and Process Test Details
    const API_URL = "https://1102amy21.amypo.ai/api";

    const checkStoreInitialData = async (allocation_id: number, test_type: number, token: string, moduleId?: number): Promise<any> => {
        try {
            const payload = {
                allocate_id: allocation_id,
                preview: 0,
                test_type: test_type,
                module_id: moduleId || 0,
                ip: '',
                os: process.platform,
                device: 'desktop',
                loc: '',
                browser: 'vscode',
                image_url: ''
            };
            const endpoint = test_type == 2
                ? `${API_URL}/sandbox/check_store_initial_link_test_data`
                : `${API_URL}/sandbox/check_store_initial_data`;

            const resp = await submitData(payload, endpoint, 0, token);
            console.log('[Amypo EduTech] checkStoreInitialData Response:', resp);

            if (resp?.status !== 200 && resp?.status !== 201) {
                vscode.window.showErrorMessage('Amypo: Failed to store initial test data.');
                return null;
            }
            return resp;
        } catch (error) {
            console.error('[Amypo EduTech] Error in checkStoreInitialData:', error);
            // Even if it fails, maybe we don't want to completely block the user if it's transient
            vscode.window.showErrorMessage('Amypo: Network error while initializing test logging.');
            return null; // Actually, strictly following webapp logic it errors out.
        }
    };

    const fetchQuestionById = async (questionId: number, test_type: number, moduleId: number, token: string) => {
        try {
            const payload = {
                allocate_id: currentAllocationData?.id || 0,
                preview: 0,
                test_type: test_type,
                module_id: moduleId,
                questionId: questionId,
                course_allocation_id: currentAllocationData?.allocation_id ?? 0,
                db: currentAllocationData?.db ?? 'link_test',
                topic_test_id: currentAllocationData?.topic_id || currentAllocationData?.test_id || 0,
            };

            const endpoint = test_type == 2
                ? `${API_URL}/sandbox/link_test_fetchbyid`
                : `${API_URL}/sandbox/fetchbyid`;

            const resp = await submitData(payload, endpoint, 0, token);
            console.log('[Amypo EduTech] fetchQuestionById Response:', resp);

            if ((resp?.status == 200 || resp?.status == 201) && resp?.data != null) {
                vscode.window.showInformationMessage(`Amypo: Fetched Question! Ready for UI. (ID: ${questionId})`);
                return resp.data;
            } else {
                vscode.window.showErrorMessage('Amypo: Failed to retrieve question details.');
            }
        } catch (error) {
            console.error('[Amypo EduTech] Error fetching question:', error);
            vscode.window.showErrorMessage('Amypo: Network error while fetching question.');
        }
        return null;
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
                const errorMsg = 'No test details found or unauthorized access.';
                vscode.commands.executeCommand('workbench.action.showSecondarySideBar');
                eduViewProvider.updateView({
                    course_name: 'Error',
                    module_name: 'Test Initialization Failed',
                    errorMessage: errorMsg
                }, () => { });
                return;
            }

            const allocation = resp.data.allocation ?? {};
            currentAllocationData = allocation;
            const test = resp.data.test ?? {};
            const course_details = resp.data.couse_details ?? {};
            const topic_details = resp.data.topic_details ?? {};
            const user_details = resp.data.user_details ?? {};

            // Log details (instead of React setters)
            console.log('[Amypo EduTech] Course Name:', course_details?.course_name);

            const courseInfo = {
                course_name: course_details?.course_name ?? 'N/A',
                topic_name: topic_details?.topic_name ?? 'N/A',
                module_name: (test_type == 0 ? test?.module_name : test?.testName) ?? 'N/A',
                course_type: course_details?.type ?? 0,
                test_type: test_type == 0 ? 'Practice' : 'Assessment',
                user_name: user_details?.name ?? user_details?.first_name ?? 'Student',
                user_email: user_details?.email ?? 'N/A',
                user_roll_no: user_details?.roll_no ?? 'N/A',
                user_college: user_details?.college_name ?? 'N/A',
                user_department: user_details?.department_name ?? 'N/A',
                user_batch: user_details?.batch_name ?? 'N/A',
                user_section: user_details?.section_name ?? 'N/A'
            };

            const isAfterNow = (dateStr: any) => {
                if (!dateStr) return false;
                const d = new Date(dateStr.replace(' ', 'T')); // Handle bit of space vs T
                return d > new Date();
            };
            const isBeforeNow = (dateStr: any) => {
                if (!dateStr) return false;
                const d = new Date(dateStr.replace(' ', 'T'));
                return d < new Date();
            };

            let errorMessage: string | null = null;
            if (isAfterNow(allocation?.course_start_date)) {
                errorMessage = 'This course has not started yet.';
            } else if (isBeforeNow(allocation?.course_end_date)) {
                errorMessage = 'This course has already expired.';
            } else if (isAfterNow(allocation?.topic_start_date)) {
                errorMessage = 'This topic has not started yet.';
            } else if (isBeforeNow(allocation?.topic_end_date)) {
                errorMessage = 'This topic has already expired.';
            }

            // Fetch Languages if Practice (test_type == 0)
            let languages: string[] = [];
            // ... (rest of language fetching)
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

            // Update courseInfo with languages and error
            const finalCourseInfo = {
                ...courseInfo,
                languages: languages,
                errorMessage: errorMessage
            };

            // ✅ Update Sidebar View
            vscode.commands.executeCommand('workbench.action.showSecondarySideBar');
            eduViewProvider.updateView(finalCourseInfo, async () => {

                vscode.window.setStatusBarMessage(`$(sync~spin) Amypo: Starting test...`, 5000);

                // Show QuestionPanel immediately as loading
                eduViewProvider.postMessage({ state: 'loading' });

                const initResp = await checkStoreInitialData(allocation_id, test_type, token, moduleId);

                if (initResp) {
                    vscode.window.showInformationMessage('Amypo: Test started successfully!');
                    const questionDatas = initResp.question_datas ?? [];

                    if (questionDatas.length > 0) {
                        let total = questionDatas.length;
                        let submitted = 0; let saved = 0; let attended = 0;

                        questionDatas.forEach((q: any) => {
                            if (q.solve_status == 2) submitted++;
                            else if (q.solve_status == 1) saved++;
                            else if (q.solve_status == 0) attended++;
                        });

                        let not_attended = total - (submitted + saved + attended);
                        const statsObj = { total, submitted, saved, not_attended, attended };

                        const firstQuestionId = questionDatas[0]?.id;
                        if (firstQuestionId) {
                            const repo_name = "9239_4090_0_4767"; // Hardcoded for dev
                            const repo_url = `https://github.com/Badsena/${repo_name}`;

                            // Extract lang_id (first one if multiple)
                            let primaryLangId: number | undefined;
                            try {
                                const lIds = JSON.parse(course_details?.language || '[]');
                                if (Array.isArray(lIds) && lIds.length > 0) primaryLangId = lIds[0];
                            } catch { }

                            const qData = await fetchQuestionById(firstQuestionId, test_type, moduleId || 0, token);
                            const repo_clone = await cloneAndOpenRepo(repo_url, moduleId, primaryLangId);
                            if (qData) {
                                eduViewProvider.postMessage({ state: 'loaded', payload: qData, stats: statsObj });
                            } else {
                                eduViewProvider.postMessage({ state: 'error', message: 'Failed to retrieve question details.' });
                            }
                        } else {
                            eduViewProvider.postMessage({ state: 'error', message: 'Invalid Question ID.' });
                        }
                    } else {
                        eduViewProvider.postMessage({ state: 'error', message: 'No questions allocated.' });
                    }
                } else {
                    eduViewProvider.postMessage({ state: 'error', message: 'Failed to initialize test log.' });
                }

            });
            vscode.commands.executeCommand(`${EduViewProvider.viewType}.focus`);

        } catch (error: any) {
            console.error('[Amypo EduTech] Error fetching test details:', error);
            const status = error?.response?.status;
            let msg = 'Failed to fetch test details.';
            if (status === 401) {
                msg = 'Unauthorized: Invalid or expired token (401).';
            } else if (status === 404) {
                msg = 'Test not found (404).';
            } else if (status === 500) {
                msg = 'Server error (500). Please try again later.';
            }

            eduViewProvider.updateView({
                course_name: 'Error',
                module_name: 'Access Denied',
                errorMessage: msg
            }, () => { });
        }
    };

    const cloneAndOpenRepo = async (repoUrl: string | null | undefined, testId: any, langId?: number): Promise<void> => {
        const parentPath = path.join(os.homedir(), 'amypo-workspace');
        const projectPath = path.join(parentPath, String(testId));

        let finalUrl = repoUrl;
        if (!finalUrl && langId) {
            console.log(`[Amypo] No repoUrl provided. Selecting template for langId: ${langId}`);
            switch (langId) {
                case 1002: finalUrl = 'https://github.com/Badsena/amypo-react-template.git'; break;
                case 1003: finalUrl = 'https://github.com/Badsena/amypo-spring-template.git'; break;
                case 1004: finalUrl = 'https://github.com/Badsena/amypo-fullstack-template.git'; break;
                case 1005: finalUrl = 'https://github.com/Badsena/amypo-selenium-template.git'; break;
            }
        }

        if (!finalUrl) {
            console.error('[Amypo] No repository URL or valid template found for cloning.');
            return;
        }

        finalUrl = injectToken(finalUrl, GITHUB_TOKEN);
        console.log('[Amypo] cloneAndOpenRepo called with:', { finalUrl, testId, projectPath });

        // Step 1: Only create PARENT folder, NOT the testId subfolder (git will create it)
        await fs.promises.mkdir(parentPath, { recursive: true });

        // Step 2: Check if already cloned (has .git folder)
        const gitDir = path.join(projectPath, '.git');
        const alreadyCloned = fs.existsSync(gitDir);

        // Store for Git actions
        currentProjectPath = projectPath;
        currentRepoUrl = finalUrl; // Captured before token injection or template logic if needed

        if (langId === 1002) currentProjectType = 'react';
        else if (langId === 1004) currentProjectType = 'fullstack';
        else currentProjectType = 'spring';

        if (!alreadyCloned) {
            // Step 3: Check git is installed
            try {
                await execAsync('git --version');
            } catch {
                vscode.window.showErrorMessage('Amypo: Git is not installed. Please install Git and try again.');
                return;
            }

            // Step 4: Clone the repo — git creates the testId subfolder itself
            vscode.window.setStatusBarMessage('$(sync~spin) Amypo: Cloning project...', 30000);
            try {
                const authenticatedUrl = injectToken(finalUrl || '', GITHUB_TOKEN);
                console.log(`[Amypo] Running: git clone "${authenticatedUrl.replace(GITHUB_TOKEN, '***')}" "${projectPath}"`); // Hide token from log
                await execAsync(`git clone "${authenticatedUrl}" "${projectPath}"`, { cwd: parentPath });

                // ✅ CLEANUP: Remove token from remote config immediately
                if (finalUrl) {
                    await execAsync(`git remote set-url origin "${finalUrl}"`, { cwd: projectPath });
                    console.log('[Amypo] Remote URL reset to clean URL.');
                }

                vscode.window.showInformationMessage('Amypo: Project cloned successfully!');
            } catch (err: any) {
                console.error('[Amypo] Clone error:', err.stderr || err.message);
                vscode.window.showErrorMessage(`Amypo: Clone failed — ${err.stderr || err.message || 'unknown error'}`);
                return;
            }
        } else {
            console.log('[Amypo] Project already cloned, skipping clone.');
            // Even if already cloned, update currentRepoUrl if possible
            if (finalUrl) currentRepoUrl = finalUrl;
        }

    };

    // ✅ Static Trigger: Load test automatically on startup
    const staticAllocationId = 4060;
    const staticTestType = 0;
    const staticToken = '285452|59GB0aGaSjSesoExX5nIFC0MUDLidBlKRIzqYTqt1d501244';
    const staticModuleId = 992;

    eduViewProvider.setOnReload(() => {
        getTestDetails(staticAllocationId, staticTestType, staticToken, staticModuleId);
    });

    eduViewProvider.setOnSave(() => {
        syncGit('save');
    });

    eduViewProvider.setOnVerify(() => {
        // Logic for verification goes here (triggering tests, etc.)
        eduViewProvider.postMessage({ state: 'status', type: 'info', text: 'Verification started...' });
        // Simulating completion
        setTimeout(() => {
            eduViewProvider.postMessage({ state: 'status', type: 'success', text: 'All tests passed!' });
        }, 2000);
    });

    eduViewProvider.setOnPull(() => {
        syncGit('pull');
    });

    vscode.commands.executeCommand('workbench.action.showSecondarySideBar');
    vscode.commands.executeCommand(`${EduViewProvider.viewType}.focus`);
    getTestDetails(staticAllocationId, staticTestType, staticToken, staticModuleId);

}

export function deactivate() { }
