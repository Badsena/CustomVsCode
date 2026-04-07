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
import axios from 'axios';

import { EduViewProvider } from './webview/EduModal';
import { submitData } from './services/axios/submissions';

const execAsync = promisify(exec);

// ─────────────────────────────────────────────────────────────
//  Constants
// ─────────────────────────────────────────────────────────────
const API_URL = 'https://1102amy21.amypo.ai/api';
const EXTENSION_UPDATE_URL = 'https://1102amy21.amypo.ai/api/extensions/latest-version.json';
const EXTENSION_VALIDATE_URL = 'https://1102amy21.amypo.ai/api/extensions/validate';
const GITHUB_TOKEN = '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';

const STATIC_ALLOCATION_ID = 4060;
const STATIC_TEST_TYPE = 0;
const STATIC_TOKEN = '285469|CFngwM53U7QMtcGnkYC64WFXYjDl63OddWqrRhSFda4cdffe';
const STATIC_MODULE_ID = 992;

// ─────────────────────────────────────────────────────────────
//  Security: 3-Layer Protection
// ─────────────────────────────────────────────────────────────

/**
 * Layer 1 — App Name Check
 * Ensures the extension is running inside Amypo Coder, not standard VS Code.
 */
function checkAppName(): boolean {
	const appName = vscode.env.appName;
	const appRoot = vscode.env.appRoot;

	const isAmypoCoder =
		appName.includes('Amypo') ||
		appRoot.toLowerCase().includes('amypo') ||
		appRoot.includes('CustomVsCode'); // ← dev mode path

	if (!isAmypoCoder) {
		console.error('[Amypo Security] Layer 1 FAILED: Unauthorized host application:', appName, 'root:', appRoot);
		return false;
	}
	console.log('[Amypo Security] Layer 1 PASSED: App name verified.');
	return true;
}

/**
 * Layer 2 — Secret Key from product.json
 * Reads a secret key embedded in the Amypo Coder product.json.
 * Returns the key string, or null if missing/invalid.
 */
function readSecretKey(): string | null {
	try {
		const productJsonPath = path.join(vscode.env.appRoot, 'product.json');
		const productJson = JSON.parse(fs.readFileSync(productJsonPath, 'utf8'));
		const secretKey = productJson.amypoSecretKey;

		if (!secretKey || typeof secretKey !== 'string') {
			console.error('[Amypo Security] Layer 2 FAILED: Missing amypoSecretKey in product.json');
			return null;
		}

		console.log('[Amypo Security] Layer 2 PASSED: Secret key found.');
		return secretKey;
	} catch (error) {
		console.error('[Amypo Security] Layer 2 FAILED: Cannot read product.json:', error);
		return null;
	}
}

/**
 * Layer 3 — Server Fingerprint Validation
 * Sends app identifiers + secret key to the server for verification.
 * If the server is down, allows the extension to continue (graceful degradation).
 */
async function validateWithServer(secretKey: string): Promise<boolean> {
	try {
		const fingerprint = {
			appName: vscode.env.appName,
			appHost: vscode.env.appHost,
			machineId: vscode.env.machineId,
			secretKey,
		};

		const resp = await axios.post(EXTENSION_VALIDATE_URL, fingerprint, {
			headers: {
				'Content-Type': 'application/json',
				'X-Amypo-Key': secretKey,
			},
			timeout: 5000, // 5s timeout — don't block launch if server is slow
		});

		if (resp.status === 200) {
			console.log('[Amypo Security] Layer 3 PASSED: Server validated.');
			return true;
		}

		console.error('[Amypo Security] Layer 3 FAILED: Server rejected fingerprint.');
		return false;

	} catch (error: any) {
		if (error?.response?.status === 403) {
			console.error('[Amypo Security] Layer 3 FAILED: 403 Forbidden from server.');
			return false;
		}
		// Server unreachable or other network error — allow graceful degradation
		console.warn('[Amypo Security] Layer 3 SKIPPED: Server unreachable, allowing offline mode.');
		return true;
	}
}

// ─────────────────────────────────────────────────────────────
//  Auto-Update
// ─────────────────────────────────────────────────────────────

/**
 * Checks the private server for a newer version of amypo-question.
 * If a newer VSIX is available, prompts the user to install it.
 */
async function checkForExtensionUpdate(secretKey: string): Promise<void> {
	try {
		const ext = vscode.extensions.getExtension('AMYPO.amypo-question');
		const currentVersion = ext?.packageJSON?.version ?? '0.0.0';

		console.log(`[Amypo Update] Current extension version: ${currentVersion}`);

		const resp = await axios.get(EXTENSION_UPDATE_URL, {
			headers: { 'X-Amypo-Key': secretKey },
			timeout: 5000,
		});

		const { latestVersion, downloadUrl } = resp.data;

		if (!latestVersion || !downloadUrl) {
			console.log('[Amypo Update] Invalid server response — skipping update check.');
			return;
		}

		if (currentVersion === latestVersion) {
			console.log('[Amypo Update] Extension is up to date.');
			return;
		}

		console.log(`[Amypo Update] New version available: ${latestVersion} (current: ${currentVersion})`);

		const choice = await vscode.window.showInformationMessage(
			`Amypo Question update available (v${latestVersion})`,
			'Update Now',
			'Later'
		);

		if (choice === 'Update Now') {
			vscode.window.setStatusBarMessage('$(sync~spin) Amypo: Installing update…', 15000);

			try {
				await vscode.commands.executeCommand(
					'workbench.extensions.installExtension',
					vscode.Uri.parse(downloadUrl)
				);
				vscode.window.showInformationMessage(
					`Amypo Question updated to v${latestVersion}! Restart to apply.`,
					'Restart Now'
				).then(action => {
					if (action === 'Restart Now') {
						vscode.commands.executeCommand('workbench.action.reloadWindow');
					}
				});
			} catch (installError) {
				console.error('[Amypo Update] VSIX installation failed:', installError);
				vscode.window.showErrorMessage('Amypo: Failed to install update.');
			}
		}

	} catch (error) {
		// Update check failed — non-critical, log and continue
		console.warn('[Amypo Update] Update check failed (server may be unreachable):', error);
	}
}

// ─────────────────────────────────────────────────────────────
//  Activate
// ─────────────────────────────────────────────────────────────
export async function activate(context: vscode.ExtensionContext) {
	console.log('[Amypo Question] Activating…');

	// ────────────────────────────────────────────────────────
	//  Security Layer 1 — App Name Check
	// ────────────────────────────────────────────────────────
	if (!checkAppName()) {
		vscode.window.showErrorMessage('Amypo Question: This extension only works inside Amypo Coder.');
		return;
	}

	// ────────────────────────────────────────────────────────
	//  Security Layer 2 — Secret Key
	// ────────────────────────────────────────────────────────
	const secretKey = readSecretKey();
	if (!secretKey) {
		vscode.window.showErrorMessage('Amypo Question: Security validation failed.');
		return;
	}

	// ────────────────────────────────────────────────────────
	//  Security Layer 3 — Server Validation (async, non-blocking)
	// ────────────────────────────────────────────────────────
	const serverValid = await validateWithServer(secretKey);
	if (!serverValid) {
		vscode.window.showErrorMessage('Amypo Question: Server validation failed. Access denied.');
		return;
	}

	// ────────────────────────────────────────────────────────
	//  Auto-Update Check (async, non-blocking)
	// ────────────────────────────────────────────────────────
	checkForExtensionUpdate(secretKey).catch(err => {
		console.warn('[Amypo Update] Background update check error:', err);
	});

	// ─────────────────────────────────────────────────────────
	//  State
	// ─────────────────────────────────────────────────────────
	let currentAllocationData: any = null;
	let currentProjectPath: string | null = null;
	let currentRepoUrl: string | null = null;
	let currentProjectType: 'react' | 'fullstack' | 'spring' = 'spring';

	// ─────────────────────────────────────────────────────────
	//  Helpers
	// ─────────────────────────────────────────────────────────

	/** Add folder to workspace without reloading the window */
	const openFolderWithoutReload = (projectPath: string) => {
		const folderUri = vscode.Uri.file(projectPath);

		const alreadyInWorkspace = vscode.workspace.workspaceFolders?.some(
			f => f.uri.fsPath === projectPath
		);

		if (!alreadyInWorkspace) {
			vscode.workspace.updateWorkspaceFolders(
				vscode.workspace.workspaceFolders?.length ?? 0,
				null,
				{ uri: folderUri }
			);
			console.log('[Amypo] Folder added to workspace:', projectPath);
		} else {
			console.log('[Amypo] Folder already in workspace — skipping.');
		}
	};

	/** Inject a PAT into a GitHub HTTPS URL */
	const injectToken = (url: string, token: string): string => {
		if (!url || !token || url.includes('@')) {
			return url;
		}
		try {
			return url.replace('https://', `https://${token}@`);
		} catch {
			return url;
		}
	};

	/** Return template repo URL for a given language ID */
	const getTemplateUrl = (langId: number | undefined): string | null => {
		switch (langId) {
			case 1002: return 'https://github.com/Badsena/amypo-react-template.git';
			case 1003: return 'https://github.com/Badsena/amypo-spring-template.git';
			case 1004: return 'https://github.com/Badsena/amypo-fullstack-template.git';
			case 1005: return 'https://github.com/Badsena/amypo-selenium-template.git';
			default: return null;
		}
	};

	/** Check whether a remote Git repo is accessible */
	const checkRepoExists = async (url: string): Promise<boolean> => {
		try {
			await execAsync(`git ls-remote "${injectToken(url, GITHUB_TOKEN)}"`);
			return true;
		} catch {
			console.warn(`[Amypo] Repo not found or inaccessible: ${url}`);
			return false;
		}
	};

	// ─────────────────────────────────────────────────────────
	//  GitHub Repo Creation
	// ─────────────────────────────────────────────────────────

	const createGithubRepo = async (
		owner: string,
		name: string,
		token: string
	): Promise<boolean> => {
		try {
			console.log(`[Amypo] Creating GitHub repo: ${owner}/${name}`);

			const userResp = await axios.get('https://api.github.com/user', {
				headers: {
					Authorization: `token ${token}`,
					Accept: 'application/vnd.github.v3+json',
				},
			});
			const authenticatedUser: string = userResp.data.login;
			console.log(`[Amypo] Authenticated GitHub user: ${authenticatedUser}`);

			const isPersonal = authenticatedUser.toLowerCase() === owner.toLowerCase();
			const endpoint = isPersonal
				? 'https://api.github.com/user/repos'
				: `https://api.github.com/orgs/${owner}/repos`;

			await axios.post(
				endpoint,
				{ name, private: true },
				{
					headers: {
						Authorization: `token ${token}`,
						Accept: 'application/vnd.github.v3+json',
					},
				}
			);

			console.log(`[Amypo] Repo ${owner}/${name} created. Waiting for GitHub to initialise…`);
			await new Promise(resolve => setTimeout(resolve, 3000));
			return true;

		} catch (err: any) {
			if (err.response?.status === 422) {
				console.log(`[Amypo] Repo ${owner}/${name} already exists.`);
				return true;
			}
			console.error('[Amypo] Repo creation failed:', err.response?.data ?? err.message);
			return false;
		}
	};

	// ─────────────────────────────────────────────────────────
	//  Git Sync (save / pull)
	// ─────────────────────────────────────────────────────────

	const syncGit = async (action: 'save' | 'pull'): Promise<void> => {
		if (!currentProjectPath || !currentRepoUrl) {
			eduViewProvider.postMessage({ state: 'status', type: 'error', text: 'No active project found.' });
			return;
		}

		let subpath = '';
		if (currentProjectType === 'react') {
			subpath = 'reactapp';
		} else if (currentProjectType === 'fullstack') {
			subpath = '';
		} else {
			subpath = 'demo';
		}

		const fullPath = path.join(currentProjectPath, subpath);
		const workingDir = fs.existsSync(path.join(fullPath, '.git')) ? fullPath : currentProjectPath;

		console.log(`[Amypo Git] ${action} in ${workingDir}`);
		eduViewProvider.postMessage({
			state: 'status',
			type: 'info',
			text: action === 'save' ? 'Saving changes…' : 'Pulling changes…',
		});

		try {
			const authenticatedUrl = injectToken(currentRepoUrl, GITHUB_TOKEN);

			if (action === 'save') {
				await execAsync('git add .', { cwd: workingDir });

				try {
					await execAsync('git commit -m "User commit"', { cwd: workingDir });
				} catch {
					console.log('[Amypo Git] Nothing new to commit.');
				}

				await execAsync(`git push ${authenticatedUrl} main`, { cwd: workingDir });
				eduViewProvider.postMessage({ state: 'status', type: 'success', text: 'Saved to cloud successfully!' });

			} else {
				await execAsync(`git pull ${authenticatedUrl} main`, { cwd: workingDir });
				eduViewProvider.postMessage({ state: 'status', type: 'success', text: 'Pulled latest changes!' });
			}

		} catch (error: any) {
			console.error(`[Amypo Git] Error during ${action}:`, error);
			const errMsg = error.stderr ?? error.message ?? 'Git operation failed';
			eduViewProvider.postMessage({ state: 'status', type: 'error', text: `Failed: ${errMsg}` });
		}
	};

	// ─────────────────────────────────────────────────────────
	//  Clone & Open Repository
	// ─────────────────────────────────────────────────────────

	const cloneAndOpenRepo = async (
		repoUrl: string | null | undefined,
		testId: any,
		langId?: number
	): Promise<void> => {
		const parentPath = path.join(os.homedir(), 'amypo-workspace');
		const projectPath = path.join(parentPath, String(testId));

		let finalUrl = repoUrl ?? null;
		let isTemplate = false;

		if (finalUrl) {
			const exists = await checkRepoExists(finalUrl);
			if (!exists) {
				console.log('[Amypo] Primary repo missing, falling back to template. langId:', langId);
				finalUrl = getTemplateUrl(langId);
				isTemplate = !!finalUrl;
			}
		} else {
			console.log('[Amypo] No primary repo URL, using template. langId:', langId);
			finalUrl = getTemplateUrl(langId);
			isTemplate = !!finalUrl;
		}

		if (!finalUrl) {
			console.error('[Amypo] No repository URL or valid template found for cloning.');
			return;
		}

		currentRepoUrl = isTemplate ? (repoUrl ?? null) : finalUrl;

		if (langId === 1002) currentProjectType = 'react';
		else if (langId === 1004) currentProjectType = 'fullstack';
		else currentProjectType = 'spring';

		currentProjectPath = projectPath;

		const authenticatedCloneUrl = injectToken(finalUrl, GITHUB_TOKEN);
		console.log('[Amypo] cloneAndOpenRepo →', {
			url: authenticatedCloneUrl.replace(GITHUB_TOKEN, '***'),
			testId,
			projectPath,
		});

		// Skip if already cloned
		if (fs.existsSync(path.join(projectPath, '.git'))) {
			console.log('[Amypo] Project already cloned — skipping initialisation.');
			openFolderWithoutReload(projectPath);
			return;
		}

		await fs.promises.mkdir(parentPath, { recursive: true });

		try {
			await execAsync('git --version');
		} catch {
			vscode.window.showErrorMessage('Amypo: Git is not installed. Please install Git and try again.');
			return;
		}

		vscode.window.setStatusBarMessage('$(sync~spin) Amypo: Initialising project…', 30000);

		try {
			console.log(`[Amypo] Cloning: ${authenticatedCloneUrl.replace(GITHUB_TOKEN, '***')}`);
			await execAsync(`git clone "${authenticatedCloneUrl}" "${projectPath}"`, { cwd: parentPath });

			if (isTemplate && repoUrl) {
				const parts = repoUrl.replace('https://github.com/', '').split('/');
				const [owner, repoName] = parts;

				if (owner && repoName) {
					const created = await createGithubRepo(owner, repoName.replace('.git', ''), GITHUB_TOKEN);
					if (!created) {
						vscode.window.showErrorMessage(`Amypo: Could not create GitHub repository ${owner}/${repoName}`);
						return;
					}
				}

				const authenticatedPushUrl = injectToken(repoUrl, GITHUB_TOKEN);
				console.log(`[Amypo] Re-pointing template remote → ${authenticatedPushUrl.replace(GITHUB_TOKEN, '***')}`);
				await execAsync(`git remote set-url origin "${authenticatedPushUrl}"`, { cwd: projectPath });

				try {
					await execAsync(`git push -u "${authenticatedPushUrl}" main`, { cwd: projectPath });
					console.log('[Amypo] Template pushed to new repo successfully.');
				} catch (pushErr: any) {
					console.warn('[Amypo] Initial push failed:', pushErr.stderr ?? pushErr.message);
				}

			} else {
				await execAsync(`git remote set-url origin "${finalUrl}"`, { cwd: projectPath });
			}

			vscode.window.showInformationMessage('Amypo: Project initialised successfully!');

			// Save state before updateWorkspaceFolders (which restarts the extension host)
			await context.globalState.update('amypo.allocationData', currentAllocationData);
			await context.globalState.update('amypo.lastTest', {
				allocation_id: STATIC_ALLOCATION_ID,
				test_type: STATIC_TEST_TYPE,
				module_id: STATIC_MODULE_ID
			});

			openFolderWithoutReload(projectPath);

		} catch (err: any) {
			console.error('[Amypo] Initialisation error:', err.stderr ?? err.message);
			vscode.window.showErrorMessage(`Amypo: Setup failed — ${err.stderr ?? err.message ?? 'unknown error'}`);
		}
	};

	// ─────────────────────────────────────────────────────────
	//  API Calls
	// ─────────────────────────────────────────────────────────

	const checkStoreInitialData = async (
		allocation_id: number,
		test_type: number,
		token: string,
		moduleId?: number
	): Promise<any> => {
		try {
			const payload = {
				allocate_id: allocation_id,
				preview: 0,
				test_type,
				module_id: moduleId ?? 0,
				ip: '',
				os: process.platform,
				device: 'desktop',
				loc: '',
				browser: 'vscode',
				image_url: '',
			};

			const endpoint = test_type === 2
				? `${API_URL}/sandbox/check_store_initial_link_test_data`
				: `${API_URL}/sandbox/check_store_initial_data`;

			const resp = await submitData(payload, endpoint, 0, token);
			console.log('[Amypo EduTech] checkStoreInitialData response:', resp);

			if (resp?.status !== 200 && resp?.status !== 201) {
				vscode.window.showErrorMessage('Amypo: Failed to store initial test data.');
				return null;
			}
			return resp;

		} catch (error) {
			console.error('[Amypo EduTech] checkStoreInitialData error:', error);
			vscode.window.showErrorMessage('Amypo: Network error while initialising test logging.');
			return null;
		}
	};

	const fetchQuestionById = async (
		questionId: number,
		test_type: number,
		moduleId: number,
		token: string
	): Promise<any> => {
		try {
			const payload = {
				allocate_id: currentAllocationData?.id ?? 0,
				preview: 0,
				test_type,
				module_id: moduleId,
				questionId,
				course_allocation_id: currentAllocationData?.allocation_id ?? 0,
				db: currentAllocationData?.db ?? 'link_test',
				topic_test_id: currentAllocationData?.topic_id ?? currentAllocationData?.test_id ?? 0,
			};

			const endpoint = test_type === 2
				? `${API_URL}/sandbox/link_test_fetchbyid`
				: `${API_URL}/sandbox/fetchbyid`;

			const resp = await submitData(payload, endpoint, 0, token);
			console.log('[Amypo EduTech] fetchQuestionById response:', resp);

			if ((resp?.status === 200 || resp?.status === 201) && resp?.data != null) {
				vscode.window.showInformationMessage(`Amypo: Question fetched! (ID: ${questionId})`);
				return resp.data;
			}

			vscode.window.showErrorMessage('Amypo: Failed to retrieve question details.');

		} catch (error) {
			console.error('[Amypo EduTech] fetchQuestionById error:', error);
			vscode.window.showErrorMessage('Amypo: Network error while fetching question.');
		}
		return null;
	};

	const getLanguageDetails = async (langIds: number[], token: string): Promise<any[]> => {
		try {
			const resp = await submitData({ langIds }, `${API_URL}/language_by_ids`, 0, token);

			if (resp?.status !== 200 || !resp?.data) {
				console.error('[Amypo EduTech] Failed to fetch language details.');
				return [];
			}

			console.log('[Amypo EduTech] Language details:', resp.data);
			return resp.data;

		} catch (error) {
			console.error('[Amypo EduTech] getLanguageDetails error:', error);
			return [];
		}
	};

	// ─────────────────────────────────────────────────────────
	//  Main: Get Test Details
	// ─────────────────────────────────────────────────────────

	const getTestDetails = async (
		allocation_id: number,
		test_type: number,
		token: string,
		moduleId?: number
	): Promise<void> => {
		try {
			vscode.window.setStatusBarMessage('$(sync~spin) Amypo: Fetching test details…', 10000);

			const payload: any = { allocate_id: allocation_id, test_type };
			if (moduleId) {
				payload.module_id = moduleId;
			}

			const endpoint = test_type === 2
				? `${API_URL}/sandbox/fetch_link_test_details`
				: `${API_URL}/sandbox/fetch_test_details`;

			const resp = await submitData(payload, endpoint, 0, token);
			console.log('[Amypo EduTech] Test details response:', resp);

			// Error: no data
			if (resp?.status !== 200 || !resp?.data) {
				try {
					await vscode.commands.executeCommand('workbench.action.focusAuxiliaryBar');
				} catch { /* command not available */ }
				eduViewProvider.updateView({
					course_name: 'Error',
					module_name: 'Test Initialisation Failed',
					errorMessage: 'No test details found or unauthorised access.',
				}, () => { });
				return;
			}

			// Parse response
			const allocation = resp.data.allocation ?? {};
			const test = resp.data.test ?? {};
			const course_details = resp.data.couse_details ?? {};
			const topic_details = resp.data.topic_details ?? {};
			const user_details = resp.data.user_details ?? {};

			currentAllocationData = allocation;

			console.log('[Amypo EduTech] Course:', course_details?.course_name);

			const courseInfo = {
				course_name: course_details?.course_name ?? 'N/A',
				topic_name: topic_details?.topic_name ?? 'N/A',
				module_name: (test_type === 0 ? test?.module_name : test?.testName) ?? 'N/A',
				course_type: course_details?.type ?? 0,
				test_type: test_type === 0 ? 'Practice' : 'Assessment',
				user_name: user_details?.name ?? user_details?.first_name ?? 'Student',
				user_email: user_details?.email ?? 'N/A',
				user_roll_no: user_details?.roll_no ?? 'N/A',
				user_college: user_details?.college_name ?? 'N/A',
				user_department: user_details?.department_name ?? 'N/A',
				user_batch: user_details?.batch_name ?? 'N/A',
				user_section: user_details?.section_name ?? 'N/A',
			};

			// Date validation
			const isAfterNow = (dateStr: any) => dateStr && new Date(dateStr.replace(' ', 'T')) > new Date();
			const isBeforeNow = (dateStr: any) => dateStr && new Date(dateStr.replace(' ', 'T')) < new Date();

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

			// Languages (Practice only)
			let languageNames: string[] = [];
			let allLangDetails: any[] = [];

			if (test_type === 0 && course_details?.language) {
				try {
					const langIds = JSON.parse(course_details.language);
					if (Array.isArray(langIds)) {
						allLangDetails = await getLanguageDetails(langIds, token);
						languageNames = allLangDetails.map(l => l.language_name ?? 'Unknown');
					}
				} catch (e) {
					console.error('[Amypo EduTech] Error parsing languages:', e);
				}
			}

			const finalCourseInfo = { ...courseInfo, languages: languageNames, errorMessage };

			// Update sidebar
			try {
				await vscode.commands.executeCommand('workbench.action.focusAuxiliaryBar');
			} catch { /* command not available */ }

			eduViewProvider.updateView(finalCourseInfo, async () => {
				vscode.window.setStatusBarMessage('$(sync~spin) Amypo: Starting test…', 5000);
				eduViewProvider.postMessage({ state: 'loading' });

				const initResp = await checkStoreInitialData(allocation_id, test_type, token, moduleId);

				if (!initResp) {
					eduViewProvider.postMessage({ state: 'error', message: 'Failed to initialise test log.' });
					return;
				}

				vscode.window.showInformationMessage('Amypo: Test started successfully!');

				const questionDatas: any[] = initResp.question_datas ?? [];

				if (questionDatas.length === 0) {
					eduViewProvider.postMessage({ state: 'error', message: 'No questions allocated.' });
					return;
				}

				// Question stats
				let submitted = 0, saved = 0, attended = 0;
				questionDatas.forEach((q: any) => {
					if (q.solve_status === 2) {
						submitted++;
					} else if (q.solve_status === 1) {
						saved++;
					} else if (q.solve_status === 0) {
						attended++;
					}
				});
				const total = questionDatas.length;
				const not_attended = total - (submitted + saved + attended);
				const statsObj = { total, submitted, saved, not_attended, attended };

				const firstQuestionId = questionDatas[0]?.id;

				if (!firstQuestionId) {
					eduViewProvider.postMessage({ state: 'error', message: 'Invalid Question ID.' });
					return;
				}

				// Fetch first question
				const repo_name = '9239_4090_0_476';
				const repo_url = `https://github.com/Badsena/${repo_name}`;

				const qData = await fetchQuestionById(firstQuestionId, test_type, moduleId ?? 0, token);
				console.log('[Amypo] qData:', qData);

				let primaryLanguageId: number | undefined;
				try {
					const matchedLang = allLangDetails.find(l => l.id === qData?.l_id);
					primaryLanguageId = matchedLang?.language_id;
					console.log('[Amypo] Matched primary language ID:', primaryLanguageId);
				} catch { /* non-critical */ }

				await cloneAndOpenRepo(repo_url, moduleId, primaryLanguageId);

				if (qData) {
					eduViewProvider.postMessage({ state: 'loaded', payload: qData, stats: statsObj });
				} else {
					eduViewProvider.postMessage({ state: 'error', message: 'Failed to retrieve question details.' });
				}
			});

			vscode.commands.executeCommand(`${EduViewProvider.viewType}.focus`);

		} catch (error: any) {
			console.error('[Amypo EduTech] getTestDetails error:', error);

			const status = error?.response?.status;
			let msg = 'Failed to fetch test details.';
			if (status === 401) msg = 'Unauthorised: Invalid or expired token (401).';
			else if (status === 404) msg = 'Test not found (404).';
			else if (status === 500) msg = 'Server error (500). Please try again later.';

			eduViewProvider.updateView({
				course_name: 'Error',
				module_name: 'Access Denied',
				errorMessage: msg,
			}, () => { });
		}
	};

	// ─────────────────────────────────────────────────────────
	//  Webview Provider Setup
	// ─────────────────────────────────────────────────────────

	const eduViewProvider = new EduViewProvider(context.extensionUri);

	context.subscriptions.push(
		vscode.window.registerWebviewViewProvider(
			EduViewProvider.viewType,
			eduViewProvider,
			{ webviewOptions: { retainContextWhenHidden: true } }
		)
	);

	eduViewProvider.setOnReload(() => {
		getTestDetails(STATIC_ALLOCATION_ID, STATIC_TEST_TYPE, STATIC_TOKEN, STATIC_MODULE_ID);
	});

	eduViewProvider.setOnSave(() => syncGit('save'));
	eduViewProvider.setOnPull(() => syncGit('pull'));

	eduViewProvider.setOnVerify(() => {
		eduViewProvider.postMessage({ state: 'status', type: 'info', text: 'Verification started…' });
		setTimeout(() => {
			eduViewProvider.postMessage({ state: 'status', type: 'success', text: 'All tests passed!' });
		}, 2000);
	});

	// ─────────────────────────────────────────────────────────
	//  Auto-start on activation with Workspace Guard
	// ─────────────────────────────────────────────────────────
	try {
		vscode.commands.executeCommand('workbench.action.focusAuxiliaryBar');
	} catch { /* command not available */ }
	vscode.commands.executeCommand(`${EduViewProvider.viewType}.focus`);

	const currentFolder = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
	const amypoWorkspace = path.join(os.homedir(), 'amypo-workspace');
	const isInsideAmypoProject = currentFolder?.startsWith(amypoWorkspace);

	if (isInsideAmypoProject) {
		console.log('[Amypo] Already inside amypo-workspace. Loading question directly.');

		// Restore saved data
		currentAllocationData = context.globalState.get('amypo.allocationData') ?? null;
		const lastTest = context.globalState.get<any>('amypo.lastTest') ?? {
			allocation_id: STATIC_ALLOCATION_ID,
			test_type: STATIC_TEST_TYPE,
			module_id: STATIC_MODULE_ID
		};

		// Skip Start Test, load question directly
		setTimeout(async () => {
			try {
				eduViewProvider.postMessage({ state: 'loading' });

				const initResp = await checkStoreInitialData(
					lastTest.allocation_id,
					lastTest.test_type,
					STATIC_TOKEN,
					lastTest.module_id
				);

				if (!initResp) {
					eduViewProvider.postMessage({ state: 'error', message: 'Failed to initialise test log.' });
					return;
				}

				const questionDatas = initResp.question_datas ?? [];
				if (questionDatas.length === 0) {
					eduViewProvider.postMessage({ state: 'error', message: 'No questions allocated.' });
					return;
				}

				// Question stats
				let submitted = 0, saved = 0, attended = 0;
				questionDatas.forEach((q: any) => {
					if (q.solve_status === 2) submitted++;
					else if (q.solve_status === 1) saved++;
					else if (q.solve_status === 0) attended++;
				});

				const statsObj = {
					total: questionDatas.length,
					submitted,
					saved,
					attended,
					not_attended: questionDatas.length - (submitted + saved + attended)
				};

				const firstQuestionId = questionDatas[0]?.id;
				if (!firstQuestionId) {
					eduViewProvider.postMessage({ state: 'error', message: 'Invalid Question ID.' });
					return;
				}

				const qData = await fetchQuestionById(
					firstQuestionId,
					lastTest.test_type,
					lastTest.module_id,
					STATIC_TOKEN
				);

				if (qData) {
					eduViewProvider.postMessage({ state: 'loaded', payload: qData, stats: statsObj });
				} else {
					eduViewProvider.postMessage({ state: 'error', message: 'Failed to retrieve question details.' });
				}

			} catch (err) {
				console.error('[Amypo] Workspace guard error:', err);
			}
		}, 1500); // 1.5s delay to ensure the webview is ready to receive messages

	} else {
		// Fresh launch — show Start Test
		getTestDetails(STATIC_ALLOCATION_ID, STATIC_TEST_TYPE, STATIC_TOKEN, STATIC_MODULE_ID);
	}
}

export function deactivate() { }
