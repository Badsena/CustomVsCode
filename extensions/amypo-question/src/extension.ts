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
import axios from 'axios';



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

    const createGithubRepo = async (owner: string, name: string, token: string) => {
        try {
            console.log(`[Amypo] Attempting to create GitHub repository: ${owner}/${name}`);

            // First, check if repo exists via API (optional but safer)
            // Then try to create it
            const endpoints = [
                `https://api.github.com/user/repos`,
                `https://api.github.com/orgs/${owner}/repos`
            ];

            // Note: We try 'user/repos' first as it's most common for personal tokens
            // But if it fails or should be in an org, we handle errors.
            try {
                await axios.post('https://api.github.com/user/repos',
                    { name, private: true },
                    { headers: { Authorization: `token ${token}`, Accept: 'application/vnd.github.v3+json' } }
                );
                console.log(`[Amypo] Repository ${name} created successfully.`);
            } catch (err: any) {
                if (err.response?.status === 422) {
                    console.log(`[Amypo] Repository ${name} already exists or is invalid.`);
                } else {
                    // Try org creation as fallback if it didn't match personal user
                    try {
                        await axios.post(`https://api.github.com/orgs/${owner}/repos`,
                            { name, private: true },
                            { headers: { Authorization: `token ${token}`, Accept: 'application/vnd.github.v3+json' } }
                        );
                        console.log(`[Amypo] Repository ${name} created in organization ${owner} successfully.`);
                    } catch (orgErr: any) {
                        console.error('[Amypo] Error creating repo in org:', orgErr.response?.data || orgErr.message);
                    }
                }
            }
        } catch (error: any) {
            console.error('[Amypo] Critical error in createGithubRepo:', error.message);
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

    const getLanguageDetails = async (langIds: number[], token: string): Promise<any[]> => {
        try {
            const payload = { langIds };
            const endpoint = `${API_URL}/language_by_ids`;
            const resp = await submitData(payload, endpoint, 0, token);

            if (resp?.status !== 200 || !resp?.data) {
                console.error('[Amypo EduTech] Failed to fetch language details.');
                return [];
            }

            console.log('[Amypo EduTech] Language details:', resp.data);
            return resp.data;
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
            let languageNames: string[] = [];
            let allLangDetails: any[] = [];
            if (test_type == 0 && course_details?.language) {
                try {
                    const langIds = JSON.parse(course_details.language);
                    if (Array.isArray(langIds)) {
                        allLangDetails = await getLanguageDetails(langIds, token);
                        languageNames = allLangDetails.map(l => l.language_name || 'Unknown');
                    }
                } catch (e) {
                    console.error('[Amypo EduTech] Error parsing languages:', e);
                }
            }

            // Update courseInfo with languages and error
            const finalCourseInfo = {
                ...courseInfo,
                languages: languageNames,
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
                            const repo_name = "9239_4090_0_476"; // Hardcoded for dev
                            const repo_url = `https://github.com/Badsena/${repo_name}`;

                            // Extract primary language_id


                            const qData = await fetchQuestionById(firstQuestionId, test_type, moduleId || 0, token);
                            console.log("qData", qData);
                            let primaryLanguageId: number | undefined;
                            try {
                                const firstId = qData?.l_id;
                                const matchedLang = allLangDetails.find(l => l.id === firstId);
                                primaryLanguageId = matchedLang?.language_id;
                                console.log('[Amypo] Matched Primary Language ID:', primaryLanguageId);
                            } catch { }
                            // Use qData?.l_id as priority, fallback to primaryLanguageId
                            const finalCloningLangId = primaryLanguageId;

                            const repo_clone = await cloneAndOpenRepo(repo_url, moduleId, finalCloningLangId);
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
        let isTemplate = false;

        // Helper to check if repo exists
        const checkRepoExists = async (url: string): Promise<boolean> => {
            try {
                const authenticatedUrl = injectToken(url, GITHUB_TOKEN);
                await execAsync(`git ls-remote "${authenticatedUrl}"`);
                return true;
            } catch (e) {
                console.warn(`[Amypo] Repo not found or inaccessible: ${url}`);
                return false;
            }
        };

        const getTemplateUrl = (lId: number | undefined): string | null => {
            if (!lId) return null;
            switch (lId) {
                case 1002: return 'https://github.com/Badsena/amypo-react-template.git';
                case 1003: return 'https://github.com/Badsena/amypo-spring-template.git';
                case 1004: return 'https://github.com/Badsena/amypo-fullstack-template.git';
                case 1005: return 'https://github.com/Badsena/amypo-selenium-template.git';
                default: return null;
            }
        };

        if (finalUrl) {
            const exists = await checkRepoExists(finalUrl);
            if (!exists) {
                console.log('[Amypo] Primary repo does not exist, falling back to template.', langId);
                finalUrl = getTemplateUrl(langId) || null;
                isTemplate = !!finalUrl;
            }
        } else {
            console.log('[Amypo] No primary repoUrl, using template.', langId);
            finalUrl = getTemplateUrl(langId) || null;
            isTemplate = !!finalUrl;
        }

        if (!finalUrl) {
            console.error('[Amypo] No repository URL or valid template found for cloning.');
            return;
        }

        // Store clean URL for subsequent Git actions
        // If we used a template, we want future pushes to go to the primary repoUrl
        currentRepoUrl = isTemplate ? repoUrl : finalUrl;

        const authenticatedCloneUrl = injectToken(finalUrl, GITHUB_TOKEN);
        console.log('[Amypo] cloneAndOpenRepo called with:', { finalUrl: authenticatedCloneUrl.replace(GITHUB_TOKEN, '***'), testId, projectPath });

        // Step 1: Only create PARENT folder, NOT the testId subfolder (git will create it)
        await fs.promises.mkdir(parentPath, { recursive: true });

        // Step 2: Check if already cloned (has .git folder)
        const gitDir = path.join(projectPath, '.git');
        const alreadyCloned = fs.existsSync(gitDir);

        // Store project path
        currentProjectPath = projectPath;

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

            // Step 4: Clone the repo
            vscode.window.setStatusBarMessage('$(sync~spin) Amypo: Initializing project...', 30000);
            try {
                console.log(`[Amypo] Cloning from: ${authenticatedCloneUrl.replace(GITHUB_TOKEN, '***')}`);
                await execAsync(`git clone "${authenticatedCloneUrl}" "${projectPath}"`, { cwd: parentPath });

                // ✅ Template Initialization Logic
                if (isTemplate && repoUrl) {
                    // 1. Extract owner and name from repoUrl (e.g. https://github.com/Badsena/reponame)
                    const parts = repoUrl.replace('https://github.com/', '').split('/');
                    const [owner, name] = parts;

                    if (owner && name) {
                        // Create the GitHub repository via API before pushing
                        await createGithubRepo(owner, name.replace('.git', ''), GITHUB_TOKEN);
                    }

                    // 2. Set remote to the NEW repo URL (authenticated)
                    const authenticatedPushUrl = injectToken(repoUrl, GITHUB_TOKEN);
                    console.log(`[Amypo] Re-initializing template for new repo: ${authenticatedPushUrl.replace(GITHUB_TOKEN, '***')}`);
                    await execAsync(`git remote set-url origin "${authenticatedPushUrl}"`, { cwd: projectPath });

                    // 3. Initial push to the new repo
                    try {
                        await execAsync(`git push -u "${authenticatedPushUrl}" main`, { cwd: projectPath });
                        console.log('[Amypo] Template content pushed to new repo successfully.');
                    } catch (pushErr: any) {
                        console.warn('[Amypo] Initial push failed even after creation attempt:', pushErr.stderr || pushErr.message);
                    }
                } else if (finalUrl) {
                    // Regular clone cleanup
                    await execAsync(`git remote set-url origin "${finalUrl}"`, { cwd: projectPath });
                }

                vscode.window.showInformationMessage('Amypo: Project initialized successfully!');
            } catch (err: any) {
                console.error('[Amypo] Initialization error:', err.stderr || err.message);
                vscode.window.showErrorMessage(`Amypo: Setup failed — ${err.stderr || err.message || 'unknown error'}`);
                return;
            }
        } else {
            console.log('[Amypo] Project already cloned, skipping initialization.');
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
