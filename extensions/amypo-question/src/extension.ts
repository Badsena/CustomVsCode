/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';
import { EduViewProvider } from './webview/EduModal';
import { submitData } from './services/axios/submissions';

export function activate(context: vscode.ExtensionContext) {
    console.log('[Amypo Question] Activating…');
    let pendingTestData: any = null;
    let currentAllocationData: any = null;

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

    const fetchAdpUrl = async () => {
        console.log('[Amypo EduTech] fetchAdpUrl triggered');
        // Placeholder for ADP URL fetching logic
    };

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

            // ✅ Save test details for "Start Test" confirmation
            pendingTestData = {
                repo_url: test?.repo_url || test?.project_link,
                question_url: test?.question_url || test?.question_link,
                test_id: String(test?.id || allocation_id),
                folder: test?.folder || '',
                token: token
            };

            // Check Expiry

            // if (isAfterNow(allocation?.course_start_date)) {
            //     vscode.window.showWarningMessage('Amypo: This course has not started yet.');
            // } else if (isBeforeNow(allocation?.course_end_date)) {
            //     vscode.window.showWarningMessage('Amypo: This course has already expired.');
            // } else if (isAfterNow(allocation?.topic_start_date)) {
            //     vscode.window.showWarningMessage('Amypo: This topic has not started yet.');
            // } else if (isBeforeNow(allocation?.topic_end_date)) {
            //     vscode.window.showWarningMessage('Amypo: This topic has already expired.');
            // }

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

            // ✅ Update Sidebar View
            vscode.commands.executeCommand('workbench.action.showSecondarySideBar');
            eduViewProvider.updateView(finalCourseInfo, async () => {
                if (!pendingTestData) {
                    vscode.window.showErrorMessage('Amypo: No test data found to start.');
                    return;
                }
                const { repo_url, question_url, test_id, folder, token } = pendingTestData;

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
                            const qData = await fetchQuestionById(firstQuestionId, test_type, moduleId || 0, token);
                            if (qData) {
                                eduViewProvider.postMessage({ state: 'loaded', payload: qData, stats: statsObj });
                            } else {
                                eduViewProvider.postMessage({ state: 'error', message: 'Failed to retrieve question details.' });
                            }
                        } else {
                            eduViewProvider.postMessage({ state: 'error', message: 'Invalid Question ID.' });
                        }
                    } else {
                        vscode.window.showWarningMessage('Amypo: No questions allocated for this test.');
                        eduViewProvider.postMessage({ state: 'error', message: 'No questions allocated.' });
                    }
                } else {
                    eduViewProvider.postMessage({ state: 'error', message: 'Failed to initialize test log.' });
                }

                pendingTestData = null;
            });
            vscode.commands.executeCommand(`${EduViewProvider.viewType}.focus`);

        } catch (error: any) {
            console.error('[Amypo EduTech] Error fetching test details:', error);
            vscode.window.showErrorMessage('Amypo: Failed to fetch test details.');
        }
    };

    // ✅ Static Trigger: Load test automatically on startup
    const staticAllocationId = 4060;
    const staticTestType = 0;
    const staticToken = '285424|cJqVBPY44e2t8QrqQuOWbzY54twVY3uoYdd7WHg380bc7904';
    const staticModuleId = 992;

    getTestDetails(staticAllocationId, staticTestType, staticToken, staticModuleId);

}

export function deactivate() { }
