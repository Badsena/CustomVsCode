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
							const repo_name = "9239_4090_0_4767";
							const repo_url = `https://github.com/Badsena/${repo_name}`
							const qData = await fetchQuestionById(firstQuestionId, test_type, moduleId || 0, token);
							const repo_clone = await cloneAndOpenRepo(repo_url, moduleId);
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

	const cloneAndOpenRepo = async (repoUrl: string, testId: any): Promise<void> => {
		const parentPath = path.join(os.homedir(), 'amypo-workspace');
		const projectPath = path.join(parentPath, String(testId));

		console.log('[Amypo] cloneAndOpenRepo called with:', { repoUrl, testId, projectPath });

		// Step 1: Only create PARENT folder, NOT the testId subfolder (git will create it)
		await fs.promises.mkdir(parentPath, { recursive: true });

		// Step 2: Check if already cloned (has .git folder)
		const gitDir = path.join(projectPath, '.git');
		const alreadyCloned = fs.existsSync(gitDir);

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
				console.log(`[Amypo] Running: git clone "${repoUrl}" "${projectPath}"`);
				await execAsync(`git clone "${repoUrl}" "${projectPath}"`, { cwd: parentPath });
				vscode.window.showInformationMessage('Amypo: Project cloned successfully!');
			} catch (err: any) {
				console.error('[Amypo] Clone error:', err.stderr || err.message);
				vscode.window.showErrorMessage(`Amypo: Clone failed — ${err.stderr || err.message || 'unknown error'}`);
				return;
			}
		} else {
			console.log('[Amypo] Project already cloned, skipping clone.');
		}

		// Step 5: Open folder in same window (only if not already there)
		const folderUri = vscode.Uri.file(projectPath);
		const currentFolder = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;

		console.log('[Amypo] currentFolder:', currentFolder, '| projectPath:', projectPath);
		if (currentFolder !== projectPath) {
			console.log('[Amypo] Opening folder in Explorer...');
			await vscode.commands.executeCommand('vscode.openFolder', folderUri, false);
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

	vscode.commands.executeCommand('workbench.action.showSecondarySideBar');
	vscode.commands.executeCommand(`${EduViewProvider.viewType}.focus`);
	getTestDetails(staticAllocationId, staticTestType, staticToken, staticModuleId);

}

export function deactivate() { }
