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

import { EduViewProvider, ICourseInfo } from './webview/EduModal';
import { submitData, jsonsubmitData, fetchData } from './services/axios/submissions';
import { verifySpringBoot, verifyReact, verifyFullStack, verifySelenium } from './services/verificationService';

const execAsync = promisify(exec);

const server_type = 'dev';
const API_URL = server_type === 'dev' ? 'https://1102amy21.amypo.ai/api' : 'https://endpoint.amypo.ai/api';
// const EXTENSION_UPDATE_URL = server_type === 'dev' ? 'https://1102amy21.amypo.ai/storage/version.json' : 'https://endpoint.amypo.ai/storage/version.json';
// static details removed to use URL params only


let GITHUB_TOKEN = '';
let GIT_URL = '';

// check App name
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

// Layer 2 — Secret Key from product.json
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

// Auto-Update
async function checkForExtensionUpdate(secretKey: string, context: vscode.ExtensionContext): Promise<boolean> {
	const statusBarItem = vscode.window.setStatusBarMessage('$(sync~spin) Amypo: Checking for updates...');
	try {
		const currentVersion = context.extension.packageJSON?.version ?? '0.0.0';
		console.log(`[Amypo Update] Current version: ${currentVersion}`);

		// ── Fetch version.json from private server
		const versionResp = await axios.get(
			'https://1102amy21.amypo.ai/storage/version.json',
			{
				timeout: 5000,
				validateStatus: (status) => status === 200
			}
		);
		statusBarItem.dispose();

		// ✅ Server returns an object with "extensions" array
		const extensionData = versionResp.data.extensions?.find((e: any) => e.id === 'AMYPO.amypo-question');
		const latestVersion = extensionData?.version;
		const downloadUrl = extensionData?.downloadUrl;

		if (!latestVersion || !downloadUrl) {
			console.log('[Amypo Update] Extension "AMYPO.amypo-question" not found in version.json — skipping.');
			return false;
		}

		console.log(`[Amypo Update] Server: ${latestVersion} | Current: ${currentVersion}`);

		if (currentVersion === latestVersion) {
			console.log('[Amypo Update] Already up to date.');
			return false;
		}

		if (!compareVersions(latestVersion, currentVersion)) {
			console.log('[Amypo Update] No newer version.');
			return false;
		}

		console.log(`[Amypo Update] New version found: ${latestVersion}`);

		// ── Download VSIX from private server
		await vscode.window.withProgress({
			location: vscode.ProgressLocation.Notification,
			title: `Amypo: Updating to v${latestVersion}...`,
			cancellable: false
		}, async (progress) => {

			progress.report({ message: 'Downloading...' });

			const vsixResp = await axios.get(downloadUrl, {
				responseType: 'arraybuffer',
				timeout: 60000
			});

			progress.report({ message: 'Saving...' });

			const tempDir = path.join(os.tmpdir(), 'amypo-updates');
			await fs.promises.mkdir(tempDir, { recursive: true });

			const vsixPath = path.join(
				tempDir,
				`amypo-question-${latestVersion}.vsix`
			);

			await fs.promises.writeFile(vsixPath, Buffer.from(vsixResp.data));
			console.log(`[Amypo Update] VSIX saved: ${vsixPath}`);

			progress.report({ message: 'Installing...' });

			await vscode.commands.executeCommand(
				'workbench.extensions.installExtension',
				vscode.Uri.file(vsixPath)
			);

			try { await fs.promises.unlink(vsixPath); } catch { }

			progress.report({ message: 'Done!' });
		});

		// ── Auto Reload
		vscode.window.showInformationMessage(`✅ Amypo updated to v${latestVersion}. Reloading...`);
		vscode.commands.executeCommand('workbench.action.reloadWindow');

		return true;

	} catch (error: any) {
		console.warn('[Amypo Update] Update check skipped:', error.message);
		return false;
	}
}

// ── Version compare helper
function compareVersions(versionA: string, versionB: string): boolean {
	const a = versionA.split('.').map(Number);
	const b = versionB.split('.').map(Number);
	for (let i = 0; i < 3; i++) {
		if ((a[i] || 0) > (b[i] || 0)) { return true; }
		if ((a[i] || 0) < (b[i] || 0)) { return false; }
	}
	return false;
}

//  Activate
export async function activate(context: vscode.ExtensionContext) {
	console.log('[Amypo Question] Activating…');

	//  Security Layer 1 — App Name Check
	if (!checkAppName()) {
		vscode.window.showErrorMessage('Amypo Question: This extension only works inside Amypo Coder.');
		return;
	}

	//  Security Layer 2 — Secret Key
	const secretKey = readSecretKey();
	if (!secretKey) {
		vscode.window.showErrorMessage('Amypo Question: Security validation failed.');
		return;
	}

	//  Auto-Update Check (blocking)
	try {
		const isUpdated = await checkForExtensionUpdate(secretKey, context);
		if (isUpdated) {
			console.log('[Amypo] Extension successfully updated, halting initialization.');
			return;
		}
	} catch (err) {
		console.warn('[Amypo Update] Blocking update check error:', err);
	}

	context.subscriptions.push(
		vscode.window.registerUriHandler({
			handleUri(uri: vscode.Uri) {
				console.log('========================================');
				console.log('[Amypo] Deep link received!');
				console.log('[Amypo] Full URI:', uri.toString());
				console.log('[Amypo] Scheme:', uri.scheme);
				console.log('[Amypo] Path:', uri.path);
				console.log('[Amypo] Raw Query:', uri.query);
				console.log('========================================');

				const params = new URLSearchParams(uri.query);

				const allocation_id = parseInt(params.get('allocation_id') ?? '0');
				const test_type = parseInt(params.get('test_type') ?? '0');
				const module_id = parseInt(params.get('module_id') ?? '0');
				const token = params.get('token') ?? '';
				const server_type = params.get('server_type') ?? 'prod';

				console.log('[Amypo] Parsed Params:');
				console.log('  allocation_id :', allocation_id);
				console.log('  test_type     :', test_type);
				console.log('  module_id     :', module_id);
				console.log('  token         :', token);
				console.log('  server_type   :', server_type);
				console.log('========================================');
				eduViewProvider.updateView({
					course_name: 'Amypo coder',
					module_name: 'Datas Not Received',
					errorMessage: `Test details allocation_id : ${allocation_id} token: ${token} test_type: ${test_type} module_id: ${module_id} server_type: ${server_type}`
				}, () => { });

				if (!allocation_id || !token) {
					console.error('[Amypo] ERROR: Missing required params!');
					vscode.window.showErrorMessage('Amypo: Invalid deep link — missing parameters.');
					return;
				}

				console.log('[Amypo] All params valid — starting test...');

				try {
					vscode.commands.executeCommand('workbench.action.focusAuxiliaryBar');
					vscode.commands.executeCommand(`${EduViewProvider.viewType}.focus`);
				} catch { }

				getTestDetails(allocation_id, test_type, token, module_id);
			}
		})
	);

	const STATIC_ALLOCATION_ID = 4165;
	const STATIC_TEST_TYPE = 0;
	const STATIC_TOKEN = '285881|JPVibXICnj72YrYqZT7F9EpArcRg6zFiqM4JK4fc5db82792';
	const STATIC_MODULE_ID = 1020;

	//  State
	let currentAllocationData: any = null;
	let currentProjectPath: string | null = null;
	let currentRepoUrl: string | null = null;
	let currentProjectType: 'react' | 'fullstack' | 'spring' | 'selenium' = 'spring';

	// Test state for API synchronization
	let activeTestType: number = 0;
	let activeModuleId: number = 0;
	let activeToken: string = '';
	let activeQuestionDatas: any[] = [];
	let lastVerificationResult: any = null;
	let activeAllocation: any = context.globalState.get<any>('amypo.testDetails')?.allocation ?? null;
	let testStartTime = Date.now();

	//  Exit
	const callMurugaExit = () => {
		console.log('exit button is clicked');
		vscode.window.showInformationMessage('Amypo: Exit logic triggered.');
	};

	//  Helpers
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

	// Inject a token into a GitHub HTTPS URL
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

	// Return template repo URL for a given language ID
	const getTemplateUrl = (langId: number | undefined): string | null => {
		switch (langId) {
			case 1002: return GIT_URL + 'amypo-react-template.git';
			case 1003: return GIT_URL + 'amypo-spring-template.git';
			case 1004: return GIT_URL + 'amypo-fullstack-template.git';
			case 1005: return GIT_URL + 'amypo-selenium-template.git';
			default: return null;
		}
	};

	// Check whether a remote Git repo is accessible
	const checkRepoExists = async (url: string): Promise<boolean> => {
		try {
			await execAsync(`git ls-remote "${injectToken(url, GITHUB_TOKEN)}"`);
			return true;
		} catch {
			console.warn(`[Amypo] Repo not found or inaccessible: ${url}`);
			return false;
		}
	};

	/**
	 * saveAmypoState — Synchronizes test metadata (timer, status, etc.) with Amypo server.
	 * Mirror of the user's save_datas logic.
	 */
	const saveAmypoState = async (exit_reason: string = 'auto') => {
		console.log('activeAllocation', activeAllocation);
		console.log('activeQuestionDatas', activeQuestionDatas);
		console.log('activeTestType', activeTestType);
		console.log('activeModuleId', activeModuleId);
		console.log('activeToken', activeToken);
		console.log('testStartTime', testStartTime);
		console.log('exit_reason', exit_reason);
		console.log('testStartTime', testStartTime);

		if (!activeAllocation || activeQuestionDatas.length === 0) {
			return;
		}

		console.log('[Amypo] Syncing state to server…');

		const qindex = 0; // Assuming first question for now as per extension context
		const question = activeQuestionDatas[qindex];
		const now = Date.now();
		const testTimer = Math.floor((now - testStartTime) / 1000);

		const payload: any = {
			save_type: 1, // Default to auto/manual
			allocate_id: parseInt(activeAllocation.id),
			test_type: activeTestType,
			module_id: activeModuleId,
			questionId: question.id,
			type: question.type,
			course_allocation_id: activeAllocation.allocation_id,
			topic_id: activeAllocation.topic_id,
			db: activeAllocation.db,
			topic_test_id: activeAllocation.topic_id || activeAllocation.test_id,

			solution: '', // Code is in Git
			sub_solutions: null,
			question_timer: testTimer,
			run_count: 0,
			deb_count: 0,
			opt_count: 0,
			verify_count: 0,
			compile_id: 0,
			error: [],

			timer: testTimer,
			tab_switched: 0,
		};

		// Add exit reason if applicable
		if (['manual', 'tabswitch', 'timer'].includes(exit_reason)) {
			payload.exit_reason = exit_reason;
		}

		console.log('payload', payload);

		const endpoint = activeTestType === 2
			? `${API_URL}/sandbox/link_save`
			: `${API_URL}/sandbox/save`;

		try {
			// Using activeToken which was used during activation
			const resp = await jsonsubmitData(payload, endpoint, 0, activeToken);
			console.log('[Amypo Server Sync] response:', resp);

			if (resp?.status === 200) {
				console.log('[Amypo Server Sync] Metadata saved successfully.');
			}
		} catch (error) {
			console.error('[Amypo Server Sync] Error:', error);
		}
	};

	// GitHub Repo Creation
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


	// Clone & Open Repository
	const cloneAndOpenRepo = async (
		repoUrl: string | null | undefined,
		testId: any,
		langId?: number
	): Promise<void> => {
		// ✅ Combined Security Solution
		// 1. Hidden directory in AppData so students can't easily find it
		const parentPath = path.join(process.env.LOCALAPPDATA || os.homedir(), 'amypo', 'workspace');

		// Extract repository name from URL (preventing nested github.com/owner directories)
		let sanitizedFolderName = 'project';
		if (repoUrl) {
			const cleanUrl = String(repoUrl).replace(/\/+$/, '').replace(/\.git$/i, '');
			sanitizedFolderName = cleanUrl.split('/').pop() || 'project';
		}
		sanitizedFolderName = sanitizedFolderName.replace(/[:*?"<>|]/g, '_');

		// 2. CLSID Trick ensures even if found, Windows Explorer redirects to "This PC"
		const CLSID = process.platform === 'win32'
			? '.{20D04FE0-3AEA-1069-A2D8-08002B30309D}'
			: '';


		const projectPath = path.join(parentPath, sanitizedFolderName);

		let finalUrl = repoUrl ?? null;
		let isTemplate = false;

		console.log('repoUrl for project path');

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

		if (langId === 1002) {
			currentProjectType = 'react';
		} else if (langId === 1004) {
			currentProjectType = 'fullstack';
		} else if (langId === 1005) {
			currentProjectType = 'selenium';
		} else {
			currentProjectType = 'spring';
		}

		currentProjectPath = projectPath;

		const authenticatedCloneUrl = injectToken(finalUrl, GITHUB_TOKEN);
		console.log('[Amypo] cloneAndOpenRepo →', {
			url: authenticatedCloneUrl.replace(GITHUB_TOKEN, '***'),
			testId,
			projectPath,
		});

		// Delete if already cloned to ensure a fresh state
		if (fs.existsSync(projectPath)) {
			console.log('[Amypo] Project folder exists — deleting for fresh clone.');
			try {
				await fs.promises.rm(projectPath, { recursive: true, force: true });
			} catch (err) {
				console.error('[Amypo] Error deleting existing folder:', err);
			}
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

			// Save ALL state before updateWorkspaceFolders (which restarts the extension host)
			await context.globalState.update('amypo.testStarted', true);
			await context.globalState.update('amypo.allocationData', currentAllocationData);
			await context.globalState.update('amypo.projectPath', projectPath);
			await context.globalState.update('amypo.repoUrl', currentRepoUrl);
			await context.globalState.update('amypo.projectType', currentProjectType);
			await context.globalState.update('amypo.token', activeToken);
			await context.globalState.update('amypo.lastTest', {
				allocation_id: activeAllocation?.id,
				test_type: activeTestType,
				module_id: activeModuleId
			});

			// No need to read from cachedQuestion here as it's already set in getTestDetails
			// or activation. But ensuring token is up to date.
			await context.globalState.update('amypo.token', activeToken);
			console.log('[Amypo] State saved to globalState before workspace change.');

			openFolderWithoutReload(projectPath);

		} catch (err: any) {
			console.error('[Amypo] Initialisation error:', err.stderr ?? err.message);
			vscode.window.showErrorMessage(`Amypo: Setup failed — ${err.stderr ?? err.message ?? 'unknown error'}`);
		}
	};

	// API Calls
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

			if ((resp?.status === 200 || resp?.status === 201) && resp?.data !== null) {
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

	const getUserDetails = async (db?: string, token: string = ''): Promise<any> => {
		try {
			const endpoint = db === 'link_test'
				? `${API_URL}/sandbox/link_test_user_details`
				: `${API_URL}/sandbox/user_details`;

			const resp = await fetchData(endpoint, token);
			console.log('[Amypo] getUserDetails response:', resp);
			return resp?.data ?? resp;
		} catch (error) {
			console.error('[Amypo] getUserDetails error:', error);
			return null;
		}
	};

	const fetchGitDetails = async (token: string): Promise<void> => {
		try {
			const resp = await fetchData(`${API_URL}/sandbox/git_details`, token);
			console.log('[Amypo] Git details response:', resp);

			if (resp) {
				const { git_username, git_token } = resp;
				if (git_username && git_token) {
					GITHUB_TOKEN = git_token;
					GIT_URL = `https://github.com/${git_username}/`;
					console.log('[Amypo] Git credentials updated successfully for:', git_username);
				}
			}
		} catch (error) {
			console.error('[Amypo] Error fetching git details:', error);
		}
	};

	// Main: Get Test Details
	const getTestDetails = async (
		allocation_id: number,
		test_type: number,
		token: string,
		moduleId?: number
	): Promise<void> => {
		console.log('[Amypo EduTech] testdatails called:', token);

		try {
			vscode.window.setStatusBarMessage('$(sync~spin) Amypo: Fetching test details…', 10000);

			const payload: any = { allocate_id: allocation_id, test_type };
			if (moduleId) {
				payload.module_id = moduleId;
			}

			const endpoint = test_type === 2
				? `${API_URL}/sandbox/fetch_link_test_details`
				: `${API_URL}/sandbox/fetch_test_details`;

			console.log('[Amypo EduTech] Test details token:', token);

			const resp = await submitData(payload, endpoint, 0, token);
			console.log('[Amypo EduTech] Test details response:', resp);

			// Fetch Git details in parallel or sequence
			await fetchGitDetails(token);

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

			// Fetch user details separately if not in response
			let user_details = resp.data.user_details;
			if (!user_details) {
				console.log('[Amypo] user_details missing in response, fetching separately...');
				user_details = await getUserDetails(test_type === 2 ? 'link_test' : undefined, token);
			}

			// Process AI features
			let aiDebugerOptimizer = {
				debuger: false,
				optimizer: false,
				debuger_count: -1,
				optimizer_count: -1,
			};

			if (user_details?.ai_features !== null) {
				try {
					const ai_features = typeof user_details.ai_features === 'string'
						? JSON.parse(user_details.ai_features)
						: user_details.ai_features;

					aiDebugerOptimizer = {
						debuger: ai_features?.student?.ai_debugger ? false : true,
						optimizer: ai_features?.student?.ai_optimizer ? false : true,
						debuger_count: ai_features?.student?.ai_debugger || 0,
						optimizer_count: ai_features?.student?.ai_optimizer || 0,
					};
					console.log('[Amypo] AI Features processed:', aiDebugerOptimizer);
				} catch (e) {
					console.error('[Amypo] Error parsing ai_features:', e);
				}
			}
			await context.globalState.update('amypo.aiFeatures', aiDebugerOptimizer);

			// Cache full data for restoration
			await context.globalState.update('amypo.testDetails', resp.data);

			currentAllocationData = allocation;
			activeAllocation = allocation;
			activeTestType = test_type;
			activeModuleId = (allocation.module_id ? parseInt(allocation.module_id) : moduleId) ?? 0;
			activeToken = token;
			testStartTime = Date.now();

			console.log('[Amypo EduTech] Course:', course_details?.course_name);

			const extVersion = vscode.extensions.getExtension('AMYPO.amypo-question')?.packageJSON?.version ?? '1.0.6';
			const courseInfo = {
				course_name: course_details?.course_name ?? 'N/A',
				topic_name: topic_details?.topic_name ?? 'N/A',
				module_name: (test_type === 0 ? test?.module_name : test?.testName) ?? 'N/A',
				course_type: course_details?.type ?? 0,
				test_type: test_type === 0 ? 'Practice' : 'Assessment',
				user_name: user_details?.name ?? user_details?.full_name ?? user_details?.first_name ?? 'Student',
				user_email: user_details?.email ?? 'N/A',
				user_roll_no: user_details?.roll_no ?? 'N/A',
				user_college: user_details?.college_name ?? 'N/A',
				user_department: user_details?.department_name ?? 'N/A',
				user_batch: user_details?.batch_name ?? 'N/A',
				user_section: user_details?.section_name ?? 'N/A',
				version: extVersion,
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

			// Save courseInfo for session restore after extension host restart
			await context.globalState.update('amypo.courseInfo', finalCourseInfo);

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

				// Resume timer if test was already in progress
				if (initResp.test_data?.time) {
					const elapsedSeconds = parseInt(initResp.test_data.time);
					testStartTime = Date.now() - (elapsedSeconds * 1000);
					console.log(`[Amypo] Resuming test timer from ${elapsedSeconds}s`);
				}

				// Cache test_data for restoration
				await context.globalState.update('amypo.testData', initResp.test_data);

				vscode.window.showInformationMessage('Amypo: Test started successfully!');

				const questionDatas: any[] = initResp.question_datas ?? [];
				activeQuestionDatas = questionDatas;
				await context.globalState.update('amypo.questionData', questionDatas);

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


				const qData = await fetchQuestionById(firstQuestionId, test_type, moduleId ?? 0, token);
				console.log('[Amypo] qData:', qData);
				console.log('[Amypo] questionDatas:', questionDatas);

				if (qData?.l_id) {
					console.log('[Amypo] Saving lang_id:', qData.l_id);
					// ✅ Save lang_id to globalState
					await context.globalState.update('amypo.langId', qData.l_id);
					await context.globalState.update('amypo.token', activeToken);
				}

				const repo_name = `${user_details?.id}_${allocation_id}_${test_type}_${firstQuestionId}`;
				const repo_url = `${GIT_URL}${repo_name}`;

				let primaryLanguageId: number | undefined;
				try {
					const matchedLang = allLangDetails.find(l => l.id === qData?.l_id);
					primaryLanguageId = matchedLang?.language_id;
					console.log('[Amypo] Matched primary language ID:', primaryLanguageId);
				} catch { /* non-critical */ }

				await cloneAndOpenRepo(repo_url, moduleId, primaryLanguageId);

				if (qData) {
					const msg = { state: 'loaded', payload: qData, stats: statsObj, aiFeatures: aiDebugerOptimizer };
					eduViewProvider.postMessage(msg);
					// Cache the data for immediate restoration after host restart
					await context.globalState.update('amypo.cachedQuestion', msg);
				} else {
					eduViewProvider.postMessage({ state: 'error', message: 'Failed to retrieve question details.' });
				}
			});

			vscode.commands.executeCommand(`${EduViewProvider.viewType}.focus`);

		} catch (error: any) {
			console.error('[Amypo EduTech] getTestDetails error:', error);

			const status = error?.response?.status;
			let msg = 'Failed to fetch test details.';
			if (status === 401) {
				msg = 'Unauthorised: Invalid or expired token (401).';
			} else if (status === 404) {
				msg = 'Test not found (404).';
			} else if (status === 500) {
				msg = 'Server error (500). Please try again later.';
			}

			eduViewProvider.updateView({
				course_name: 'Error',
				module_name: 'Access Denied',
				errorMessage: msg,
			}, () => { });
		}
	};



	// Webview Provider Setup
	const eduViewProvider = new EduViewProvider(context.extensionUri);

	context.subscriptions.push(
		vscode.window.registerWebviewViewProvider(
			EduViewProvider.viewType,
			eduViewProvider,
			{ webviewOptions: { retainContextWhenHidden: true } }
		)
	);

	let isSyncing = false;
	// Git Sync (save / pull)
	const syncGit = async (action: 'save' | 'pull'): Promise<void> => {
		if (isSyncing) {
			return;
		}
		isSyncing = true;

		try {
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
			vscode.window.setStatusBarMessage(`$(sync~spin) Amypo: ${action === 'save' ? 'Saving' : 'Pulling'} changes…`, 10000);
			eduViewProvider.postMessage({
				state: 'status',
				type: 'info',
				text: action === 'save' ? 'Saving changes…' : 'Pulling changes…',
			});

			const authenticatedUrl = injectToken(currentRepoUrl, GITHUB_TOKEN);

			if (action === 'save') {
				// Ensure Git user identity is set (critical for container/production environments)
				try {
					const courseInfo = context.globalState.get<any>('amypo.courseInfo');
					const userName = courseInfo?.user_name || 'Amypo Student';
					const userEmail = (courseInfo?.user_email && courseInfo.user_email !== 'N/A') ? courseInfo.user_email : 'student@amypo.ai';

					await execAsync(`git config user.email "${userEmail}"`, { cwd: workingDir });
					await execAsync(`git config user.name "${userName}"`, { cwd: workingDir });
				} catch (confErr) {
					console.warn('[Amypo Git] Failed to set Git user identity:', confErr);
				}

				await execAsync('git add .', { cwd: workingDir });

				try {
					await execAsync('git commit -m "User commit"', { cwd: workingDir });
				} catch (commitErr: any) {
					const commitMsg = commitErr.stderr ?? commitErr.message ?? '';
					if (commitMsg.includes('nothing to commit')) {
						console.log('[Amypo Git] Nothing new to commit.');
					} else {
						console.warn('[Amypo Git] Commit failed:', commitMsg);
					}
				}

				try {
					console.log(`[Amypo Git] Pushing to: ${authenticatedUrl.replace(GITHUB_TOKEN, '***')}`);
					await execAsync(`git push "${authenticatedUrl}" main`, { cwd: workingDir });
				} catch (error: any) {
					console.error('[Amypo Git] Error during push:', error);
					const errMsg = error.stderr ?? error.message ?? 'Git push failed';
					eduViewProvider.postMessage({
						state: 'status',
						type: 'error',
						text: `Failed to push: ${errMsg.length > 100 ? errMsg.substring(0, 100) + '...' : errMsg}`
					});
					return;
				}

				const timestamp = Date.now();
				vscode.window.showInformationMessage('Changes pushed to Git successfully!');
				vscode.window.setStatusBarMessage('$(check) Amypo: Saved to cloud.', 5000);
				eduViewProvider.postMessage({ state: 'status', type: 'success', text: 'Saved to cloud successfully!' });
				eduViewProvider.postMessage({ state: 'saved', timestamp });

				// Sync meta-state to Amypo server
				try {
					await saveAmypoState('manual');
				} catch (error: any) {
					console.error('[Amypo Git] Error during saveAmypoState:', error);
					const errMsg = error.stderr ?? error.message ?? 'Failed to save meta-state to Amypo server';
					eduViewProvider.postMessage({ state: 'status', type: 'error', text: `Failed: ${errMsg}` });
				}

			} else {
				try {
					console.log(`[Amypo Git] Pulling from: ${authenticatedUrl.replace(GITHUB_TOKEN, '***')}`);
					await execAsync(`git pull "${authenticatedUrl}" main`, { cwd: workingDir });
					vscode.window.setStatusBarMessage('$(check) Amypo: Pulled latest changes.', 5000);
					eduViewProvider.postMessage({ state: 'status', type: 'success', text: 'Pulled latest changes!' });
				} catch (pullErr: any) {
					console.error('[Amypo Git] Error during pull:', pullErr);
					const errMsg = pullErr.stderr ?? pullErr.message ?? 'Git pull failed';
					eduViewProvider.postMessage({
						state: 'status',
						type: 'error',
						text: `Failed to pull: ${errMsg.length > 100 ? errMsg.substring(0, 100) + '...' : errMsg}`
					});
				}
			}

		} catch (error: any) {
			console.error(`[Amypo Git] Error during ${action}:`, error);
			const errMsg = error.stderr ?? error.message ?? 'Git operation failed';
			eduViewProvider.postMessage({ state: 'status', type: 'error', text: `Failed: ${errMsg}` });
		} finally {
			isSyncing = false;
		}
	};

	eduViewProvider.setOnSave(() => syncGit('save'));
	eduViewProvider.setOnPull(() => syncGit('pull'));

	eduViewProvider.setOnVerify(async () => {
		try {

			const cachedQuestion = context.globalState.get<any>('amypo.cachedQuestion');
			if (!currentAllocationData || !currentProjectType) {
				eduViewProvider.postMessage({ state: 'status', type: 'error', text: 'No active test found for verification.' });
				return;
			}

			const question = activeQuestionDatas[0];
			if (!question) {
				eduViewProvider.postMessage({ state: 'status', type: 'error', text: 'Current question data not found.' });
				return;
			}

			eduViewProvider.postMessage({ state: 'status', type: 'info', text: 'Verification started…' });

			// Use the primary language name to determine verification logic if needed,
			// or just use the currentProjectType.

			if (!currentProjectPath) {
				eduViewProvider.postMessage({ state: 'status', type: 'error', text: 'Project path not found. Please start the test first.' });
				return;
			}

			console.log('question data', question);
			console.log('cachedQuestion', cachedQuestion);


			// Extract total testcases from metadata
			let total_testcases = 0;
			const fullQuestion = cachedQuestion?.payload;
			if (fullQuestion?.testcaseCount) {

				console.log('testcaseCount', fullQuestion.testcaseCount);

				try {
					const test_count = typeof fullQuestion.testcaseCount === 'string'
						? JSON.parse(fullQuestion.testcaseCount)
						: fullQuestion.testcaseCount;

					if (currentProjectType === 'react') {
						total_testcases = parseInt(test_count?.react, 10) || 0;
					} else if (currentProjectType === 'spring') {
						total_testcases = parseInt(test_count?.spring, 10) || 0;
					} else if (currentProjectType === 'selenium') {
						total_testcases = parseInt(test_count?.selenium, 10) || 0;
					} else if (currentProjectType === 'fullstack') {
						total_testcases = (parseInt(test_count?.backend, 10) || 0) + (parseInt(test_count?.frontend, 10) || 0);
					}
				} catch (e) { }
			}

			const request = {
				project_path: currentProjectPath,
				question_id: cachedQuestion?.payload?.question_id,
				qb_name: cachedQuestion?.payload?.qb_name || 'practice',
				token: activeToken,
				backend_url: API_URL,
				testcase_count: total_testcases
			};

			console.log('[Amypo] Verification request:', request);

			let result;
			if (currentProjectType === 'spring') {
				result = await verifySpringBoot(request);
				console.log('springboot result', result);
			} else if (currentProjectType === 'react') {
				result = await verifyReact(request);
			} else if (currentProjectType === 'fullstack') {
				result = await verifyFullStack(request);
				console.log('fullstack result', result);
			} else if (currentProjectType === 'selenium') {
				result = await verifySelenium(request);
				console.log('selenium result', result);
			} else {
				eduViewProvider.postMessage({ state: 'status', type: 'error', text: `Verification not implemented for ${currentProjectType}` });
				return;
			}

			if (result.success) {
				eduViewProvider.postMessage({
					state: 'status',
					type: 'success',
					text: 'All tests passed!',
					payload: result
				});
			} else {
				eduViewProvider.postMessage({
					state: 'status',
					type: 'error',
					text: 'Some tests failed. Check console for details.',
					payload: result
				});
			}

			lastVerificationResult = {
				result,
				total_testcases,
				testStartTime
			};

		} catch (error: any) {
			console.error('[Amypo] Verification error:', error);
			eduViewProvider.postMessage({ state: 'status', type: 'error', text: `Verification failed: ${error.message}` });
		}
	});

	eduViewProvider.setOnSubmit(async () => {
		if (!lastVerificationResult) {
			eduViewProvider.postMessage({ state: 'status', type: 'error', text: 'Please verify your work before submitting.' });
			return;
		}

		try {
			const { result, total_testcases, testStartTime } = lastVerificationResult;
			const cachedQuestion = context.globalState.get<any>('amypo.cachedQuestion');
			const fullQuestion = cachedQuestion?.payload;
			const question = activeQuestionDatas[0];

			// Store verification mark to the backend
			const now = Date.now();
			const testTimer = Math.floor((now - testStartTime) / 1000);

			let passed_testcases = 0;

			const total_mark_raw = fullQuestion?.total_mark ?? question?.total_mark ?? 0;
			const total_mark = typeof total_mark_raw === 'string' ? parseFloat(total_mark_raw) : total_mark_raw;
			let user_mark = question?.mark ?? 0;

			if (result?.test_results) {
				passed_testcases = result.test_results?.passed ?? 0;
				result.test_results.total = total_testcases > 0 ? total_testcases : (parseInt(result.test_results.total, 10) || 0);
				result.test_results.passed = passed_testcases;
				result.test_results.failed = Math.max(0, result.test_results.total - passed_testcases);
			}

			if (total_mark > 0) {
				const countToUse = total_testcases > 0 ? total_testcases : (result?.test_results?.total > 0 ? result.test_results.total : 1);
				const each_testcase_mark = total_mark / countToUse;
				user_mark = each_testcase_mark * passed_testcases;
			}

			const payload: any = {
				allocate_id: currentAllocationData?.id ? parseInt(currentAllocationData.id) : 0,
				test_type: activeTestType,
				module_id: activeModuleId,
				questionId: question?.id,
				type: question?.type,
				course_allocation_id: currentAllocationData?.allocation_id,
				topic_id: currentAllocationData?.topic_id,
				db: currentAllocationData?.db,
				topic_test_id: currentAllocationData?.topic_id || currentAllocationData?.test_id,
				solution: '',
				question_timer: testTimer,
				run_count: question?.run_count ?? 0,
				verify_count: (question?.verify_count ?? 0) + 1,
				deb_count: question?.deb_count ?? 0,
				opt_count: question?.opt_count ?? 0,
				compile_id: question?.compile_id ?? 0,
				error: question?.error_array ?? [],
				mark: user_mark,
				test_cases: result?.test_results ? result.test_results : [],
				timer: testTimer,
				tab_switched: 0,
				question_category: fullQuestion?.question_category ?? question?.question_category ?? 0,
				total_mark: total_mark,
				qb_name: fullQuestion?.qb_name ?? question?.qb_name ?? 0,
				q_id: fullQuestion?.question_id ?? question?.question_id ?? 0,
			};

			console.log('[Amypo] Payload for submit mark:', payload);

			const endpoint = activeTestType === 2
				? `${API_URL}/sandbox/link_submit`
				: `${API_URL}/sandbox/submit`;

			const resp = await jsonsubmitData(payload, endpoint, 0, activeToken);
			console.log('[Amypo] Submit mark resp:', resp);

			if (resp?.status === 200) {
				if (user_mark > 0 && question) {
					question.solve_status = 2; // update local status to submitted
				}
				eduViewProvider.postMessage({ state: 'status', type: 'success', text: 'Final results submitted successfully!' });
				console.log('[Amypo] Mark stored successfully.');
			} else {
				throw new Error(resp?.message || 'Submission failed');
			}
		} catch (error: any) {
			console.error('[Amypo] Error during final submission:', error);
			eduViewProvider.postMessage({ state: 'status', type: 'error', text: `Submission failed: ${error.message}` });
		}
	});

	// Auto-start on activation with Workspace Guard
	try {
		vscode.commands.executeCommand('workbench.action.focusAuxiliaryBar');
	} catch { /* command not available */ }

	// Auto-save every 1.5 minutes
	const autoSaveInterval = setInterval(() => {
		if (currentProjectPath && currentRepoUrl) {
			console.log('[Amypo] Auto-save triggered.');
			syncGit('save').catch(err => {
				console.error('[Amypo] Auto-save error:', err);
			});
		}
	}, 90000);

	context.subscriptions.push({ dispose: () => clearInterval(autoSaveInterval) });
	vscode.commands.executeCommand(`${EduViewProvider.viewType}.focus`);

	// Check if test was already started (survives extension host restart)
	const testAlreadyStarted = context.globalState.get<boolean>('amypo.testStarted') === true;

	// Also check workspace folder as a fallback
	// Normalize path separators and case to prevent mismatch on Windows
	const currentFolder = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
	const amypoWorkspace = path.join(process.env.LOCALAPPDATA || os.homedir(), 'amypo', 'workspace');

	const normalizedCurrent = currentFolder?.replace(/\\/g, '/').toLowerCase() ?? '';
	const normalizedAmypo = amypoWorkspace.replace(/\\/g, '/').toLowerCase();
	const isInsideAmypoProject = normalizedCurrent.startsWith(normalizedAmypo);

	console.log('[Amypo] Guard check:', { currentFolder: normalizedCurrent, amypoWorkspace: normalizedAmypo, isInsideAmypoProject });

	// Use testStarted (flag) AND isInsideAmypoProject (location) to decide whether to restore session automatically.
	const shouldRestore = testAlreadyStarted && isInsideAmypoProject;
	console.log('restore datas:', testAlreadyStarted, isInsideAmypoProject);


	if (shouldRestore) {
		console.log('[Amypo] Re-activation detected (testStarted=' + testAlreadyStarted + ', insideProject=' + isInsideAmypoProject + '). Restoring session…');

		// Restore saved data from globalState
		currentAllocationData = context.globalState.get('amypo.allocationData') ?? null;
		currentProjectPath = context.globalState.get<string>('amypo.projectPath') ?? null;
		currentRepoUrl = context.globalState.get<string>('amypo.repoUrl') ?? null;
		currentProjectType = context.globalState.get<'react' | 'fullstack' | 'spring' | 'selenium'>('amypo.projectType') ?? 'spring';
		activeToken = context.globalState.get<string>('amypo.token') ?? '';

		// ✅ Restore langId and token to storage for extensions panel
		const cachedQuestion = context.globalState.get<any>('amypo.cachedQuestion');
		const langId = cachedQuestion?.payload?.l_id;
		if (langId) {
			await context.globalState.update('amypo.langId', langId);
			console.log('[Amypo] LangId restored to storage:', langId);
		}
		await context.globalState.update('amypo.token', activeToken);
		const lastTest = context.globalState.get<any>('amypo.lastTest');
		if (lastTest) {
			activeTestType = lastTest.test_type ?? 0;
			activeModuleId = lastTest.module_id ?? 0;
			console.log('[Amypo] Restored test metadata:', { activeTestType, activeModuleId });
		}

		console.log('[Amypo] Restored state:', { currentProjectPath, currentRepoUrl, currentProjectType });

		// Restore metadata for API sync
		const cachedDetails = context.globalState.get<any>('amypo.testDetails');
		const cachedQuestions = context.globalState.get<any>('amypo.questionData');

		if (cachedDetails) {
			console.log('[Amypo] Restoring metadata from cache…');
			activeAllocation = cachedDetails.allocation;
		}
		if (cachedQuestions) {
			activeQuestionDatas = cachedQuestions;
		}
		const aiFeatures = context.globalState.get<any>('amypo.aiFeatures');

		// Wait for webview to signal 'ready' before sending data
		eduViewProvider.setOnReady(async () => {
			try {
				console.log('[Amypo] Webview ready — restoring question…');

				// Always ensure Git credentials are ready after a restart
				await fetchGitDetails(activeToken);

				// Check if we have a cached question from a very recent transition
				const cachedMsg = context.globalState.get<any>('amypo.cachedQuestion');
				if (cachedMsg) {
					console.log('[Amypo] Using cached question data (transition recovery)', cachedMsg);

					// Also restore the course info UI
					const savedCourseInfo = context.globalState.get<any>('amypo.courseInfo');
					console.log('[Amypo] Using cached course info (transition recovery)', savedCourseInfo);

					if (savedCourseInfo) {
						const extVersion = vscode.extensions.getExtension('AMYPO.amypo-question')?.packageJSON?.version ?? '1.0.6';
						eduViewProvider.updateView({ ...savedCourseInfo, shouldRestore: true, version: extVersion }, () => { });
						eduViewProvider.setOnReady(() => {
							eduViewProvider.postMessage(cachedMsg);
						});
					} else {
						eduViewProvider.postMessage(cachedMsg);
					}

					const savedTestData = context.globalState.get<any>('amypo.testData');
					const elapsedSeconds = parseInt(savedTestData?.time ?? '0');
					testStartTime = Date.now() - (elapsedSeconds * 1000);
					return;
				}

				// Otherwise, perform fresh fetch (this handles manual vs code reloads)
				if (!lastTest) {
					console.warn('[Amypo Restore] No lastTest metadata found — cannot restore session details.');
					eduViewProvider.postMessage({ state: 'error', message: 'Session metadata missing.' });
					return;
				}

				const initResp = await checkStoreInitialData(
					lastTest.allocation_id,
					lastTest.test_type,
					activeToken,
					lastTest.module_id
				);

				if (!initResp) {
					eduViewProvider.postMessage({ state: 'error', message: 'Failed to initialise test log.' });
					return;
				}

				// Resume timer if test was already in progress
				if (initResp.test_data?.time) {
					const elapsedSeconds = parseInt(initResp.test_data.time);
					testStartTime = Date.now() - (elapsedSeconds * 1000);
					console.log(`[Amypo Restore] Resuming test timer from ${elapsedSeconds}s`);
				}

				// Cache test_data for restoration
				await context.globalState.update('amypo.testData', initResp.test_data);

				const questionDatas = initResp.question_datas ?? [];
				activeQuestionDatas = questionDatas;
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

				const statsObj = {
					total: questionDatas.length,
					submitted,
					saved,
					attended,
					not_attended: questionDatas.length - (submitted + saved + attended)
				};

				const firstQuestionId = questionDatas[0]?.id;

				const qData = await fetchQuestionById(
					firstQuestionId,
					lastTest.test_type,
					lastTest.module_id,
					activeToken
				);

				const questionMessage = qData
					? { state: 'loaded', payload: qData, stats: statsObj, aiFeatures }
					: { state: 'error', message: 'Failed to retrieve question details.' };

				const savedCourseInfo = context.globalState.get<any>('amypo.courseInfo');
				if (savedCourseInfo) {
					const extVersion = vscode.extensions.getExtension('AMYPO.amypo-question')?.packageJSON?.version ?? '1.0.6';
					eduViewProvider.updateView({ ...savedCourseInfo, shouldRestore: true, version: extVersion }, () => { });
					eduViewProvider.setOnReady(() => {
						eduViewProvider.postMessage(questionMessage);
					});
				} else {
					eduViewProvider.postMessage(questionMessage);
				}

				// ✅ Refresh extensions panel after data is ready
				setTimeout(() => {
					vscode.commands.executeCommand(
						'workbench.extensions.action.refreshExtension'
					).then(undefined, () => {
						// ignore if command not found
					});
					console.log('[Amypo] Extensions panel refresh triggered');
				}, 2000);

			} catch (err) {
				console.error('[Amypo] Session restore error:', err);
				eduViewProvider.postMessage({ state: 'error', message: 'Error restoring session.' });
			}
		});

	} else {
		// Fresh launch — we expect the UriHandler to fire shortly after activate().
		// We comment this out so it doesn't show a false alarm before the URL is processed.

		vscode.window.showErrorMessage('Amypo: Test details not received from URL.');
		eduViewProvider.updateView({
			course_name: 'Amypo coder',
			module_name: 'Datas Not Received',
			errorMessage: 'Test details were not received from the URL. Please launch the test from your student portal.'
		}, () => { });


		// Clear session-specific caches on fresh start (e.g. VS Code opened without a folder)
		if (normalizedCurrent === '') {
			await context.globalState.update('amypo.cachedQuestion', undefined);
			await context.globalState.update('amypo.courseInfo', undefined);
		}

		console.log('enter test details');

		// getTestDetails(STATIC_ALLOCATION_ID, STATIC_TEST_TYPE, STATIC_TOKEN, STATIC_MODULE_ID);
	}

	const doExitAndSave = async () => {
		await vscode.window.withProgress({
			location: vscode.ProgressLocation.Notification,
			title: 'Amypo: Performing final save...',
			cancellable: false
		}, async (progress) => {
			try {
				const projectPathToDelete = currentProjectPath;

				progress.report({ message: 'Syncing Git and Server state...' });
				// syncGit('save') handles both Git push and Amypo state sync
				await syncGit('save');

				// Delete the local project folder after saving
				if (projectPathToDelete && fs.existsSync(projectPathToDelete)) {
					progress.report({ message: 'Deleting local project folder...' });

					// Close all editors to release file locks
					await vscode.commands.executeCommand('workbench.action.closeAllEditors');



					try {
						await fs.promises.rm(projectPathToDelete, { recursive: true, force: true });
						console.log(`[Amypo] Deleted project folder: ${projectPathToDelete}`);
					} catch (err) {
						console.warn(`[Amypo] Folder is locked, deferring deletion to background process...`);

						if (process.platform === 'win32') {
							const scriptPath = path.join(os.tmpdir(), `amypo-cleanup-${Date.now()}.ps1`);
							// Use \\?\ prefix to bypass shell restrictions on CLSID folders
							const psScript = `
								$folder = '\\\\?\\${projectPathToDelete.split('/').join('\\\\')}'
								$maxRetries = 15
								$retryCount = 0
								Start-Sleep -Seconds 3
								while (Test-Path -LiteralPath $folder) {
									if ($retryCount -ge $maxRetries) { break }
									try {
										Remove-Item -LiteralPath $folder -Recurse -Force -ErrorAction Stop
										break
									} catch {
										$retryCount++
										Start-Sleep -Seconds 2
									}
								}
								Remove-Item -LiteralPath $MyInvocation.MyCommand.Path -Force -ErrorAction SilentlyContinue
							`;
							fs.writeFileSync(scriptPath, psScript);

							const child = require('child_process').spawn('cmd.exe', [
								'/c', 'start', '""', '/MIN', 'powershell.exe',
								'-WindowStyle', 'Hidden',
								'-NoProfile',
								'-ExecutionPolicy', 'Bypass',
								'-File', scriptPath
							], {
								detached: true,
								stdio: 'ignore',
								windowsHide: true
							});
							child.unref();
						}
					}
				}

				progress.report({ message: 'Cleaning session state...' });
				callMurugaExit();

				// Clear persistent state
				await context.globalState.update('amypo.testStarted', false);
				await context.globalState.update('amypo.allocationData', undefined);
				await context.globalState.update('amypo.testDetails', undefined);
				await context.globalState.update('amypo.testData', undefined);
				await context.globalState.update('amypo.questionData', undefined);
				await context.globalState.update('amypo.courseInfo', undefined);
				await context.globalState.update('amypo.cachedQuestion', undefined);

				// Final exit
				vscode.commands.executeCommand('workbench.action.closeWindow');
			} catch (error) {
				vscode.window.showErrorMessage('Failed to save progress on exit. Please try manual save first.');
			}
		});
	};

	// Global interceptor to handle 401 Backend Errors with a Modal Alert
	axios.interceptors.response.use(
		response => response,
		async error => {
			if (error.response?.status === 401) {
				const saveExitItem: vscode.MessageItem = { title: 'Save & Exit', isCloseAffordance: true };
				const choice = await vscode.window.showWarningMessage(
					'Session Expired (401)! Please save your progress and exit to sync to the cloud.',
					{ modal: true },
					saveExitItem
				);

				if (choice === saveExitItem) {
					doExitAndSave();
				}
			}
			return Promise.reject(error);
		}
	);
	// ✅ Add version command
	context.subscriptions.push(
		vscode.commands.registerCommand(
			'amypo.checkVersion', () => {
				const version = vscode.extensions
					.getExtension('AMYPO.amypo-question')
					?.packageJSON?.version;
				vscode.window.showInformationMessage(
					`Amypo Version: ${version}`
				);
			})
	);

	context.subscriptions.push(vscode.commands.registerCommand('amypo.exit', async () => {
		const choice = await vscode.window.showWarningMessage(
			'Are you sure you want to finish and exit? Your current progress will be synced to the cloud.',
			{ modal: true },
			'Save & Exit'
		);

		if (choice !== 'Save & Exit') {
			return;
		}

		doExitAndSave();
	}));
}

export function deactivate() { }
