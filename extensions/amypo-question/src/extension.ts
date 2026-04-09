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
import { submitData, jsonsubmitData, setBaseUrl } from './services/axios/submissions';
import { verifySpringBoot, verifyReact } from './services/verificationService';

const execAsync = promisify(exec);

const server_type = 'dev';
const API_URL = server_type === 'dev' ? 'https://1102amy21.amypo.ai/api' : 'https://endpoint.amypo.ai/api';
const EXTENSION_UPDATE_URL = server_type === 'dev' ? 'https://1102amy21.amypo.ai/api/extensions/latest-version.json' : 'https://endpoint.amypo.ai/api/extensions/latest-version.json';

function readGithubToken(): string {
	try {
		const productJsonPath = path.join(vscode.env.appRoot, 'product.json');
		const productJson = JSON.parse(fs.readFileSync(productJsonPath, 'utf8'));
		return productJson.amypoGithubToken ?? '';
	} catch {
		return '';
	}
}

const GITHUB_TOKEN = readGithubToken();

const STATIC_ALLOCATION_ID = 4060;
const STATIC_TEST_TYPE = 0;
const STATIC_TOKEN = '285526|5SZi3FeoZdTFYLeVCH4YG2pqoNboHKyv1HeJzJOr2bd83239';
const STATIC_MODULE_ID = 992;

const GITHUB_TOKEN = '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';
const GIT_URL = 'https://github.com/Badsena/';

// Launch gate constants
const LAUNCH_TOKEN_KEY = 'amypo.launchToken';

// check App name
function checkAppName(): boolean {
	const appName = vscode.env.appName.toLowerCase();
	const uriScheme = vscode.env.uriScheme.toLowerCase();
	const appRoot = vscode.env.appRoot;

	// Check for amypocoder scheme OR Amypo coder name OR dev path
	const isAmypoCoder =
		uriScheme === 'amypocoder' ||
		uriScheme === 'amypo' ||
		appName.includes('amypo') ||
		appRoot.includes('CustomVsCode');

	if (!isAmypoCoder) {
		console.error('[Amypo Security] Layer 1 FAILED: Unauthorized host', uriScheme, appName, appRoot);
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

// Auto-Update — checks VS Code Marketplace directly, installs over built-in
async function checkForExtensionUpdate(secretKey: string): Promise<void> {
	try {
		const ext = vscode.extensions.getExtension('AMYPO.amypo-question');
		const currentVersion = ext?.packageJSON?.version ?? '0.0.0';

		console.log(`[Amypo Update] Current extension version: ${currentVersion}`);

		// Query VS Code Marketplace API for latest version
		const marketplaceResp = await axios.post(
			'https://marketplace.visualstudio.com/_apis/public/gallery/extensionquery',
			{
				filters: [{
					criteria: [
						{ filterType: 7, value: 'AMYPO.amypo-question' }
					]
				}],
				flags: 914
			},
			{
				headers: { 'Content-Type': 'application/json', 'Accept': 'application/json;api-version=6.0-preview.1' },
				timeout: 8000,
			}
		);

		const extensions = marketplaceResp.data?.results?.[0]?.extensions;
		if (!extensions || extensions.length === 0) {
			console.log('[Amypo Update] Extension not found on marketplace.');
			return;
		}

		const latestVersion = extensions[0]?.versions?.[0]?.version;
		if (!latestVersion) {
			console.log('[Amypo Update] Could not determine latest version.');
			return;
		}

		console.log(`[Amypo Update] Marketplace version: ${latestVersion}, Current: ${currentVersion}`);

		if (currentVersion === latestVersion) {
			console.log('[Amypo Update] Extension is up to date.');
			return;
		}

		// Compare versions (simple string compare works for semver with same digit count)
		const current = currentVersion.split('.').map(Number);
		const latest = latestVersion.split('.').map(Number);
		let isNewer = false;
		for (let i = 0; i < 3; i++) {
			if ((latest[i] || 0) > (current[i] || 0)) { isNewer = true; break; }
			if ((latest[i] || 0) < (current[i] || 0)) { break; }
		}

		if (!isNewer) {
			console.log('[Amypo Update] Built-in version is same or newer than marketplace.');
			return;
		}

		console.log(`[Amypo Update] New version available: ${latestVersion} (current: ${currentVersion})`);

		// Auto-install from marketplace with progress notification
		await vscode.window.withProgress({
			location: vscode.ProgressLocation.Notification,
			title: `Amypo Question Panel: Updating to v${latestVersion}...`,
			cancellable: false
		}, async (progress) => {
			try {
				progress.report({ message: 'Downloading from marketplace...' });

				// Install from marketplace by extension ID
				await vscode.commands.executeCommand(
					'workbench.extensions.installExtension',
					'AMYPO.amypo-question'
				);

				progress.report({ message: 'Installed successfully!' });

				console.log(`[Amypo Update] Successfully updated to v${latestVersion}`);
			} catch (installError) {
				console.error('[Amypo Update] Installation failed:', installError);
				vscode.window.showErrorMessage('Amypo: Failed to install update. Please try again later.');
				throw installError;
			}
		});

		// Show persistent restart prompt
		const action = await vscode.window.showInformationMessage(
			`✅ Amypo Question Panel updated to v${latestVersion}. Restart to apply changes.`,
			{ modal: false },
			'Restart Now'
		);

		if (action === 'Restart Now') {
			vscode.commands.executeCommand('workbench.action.reloadWindow');
		}

	} catch (error) {
		// Update check failed — non-critical, log and continue
		console.warn('[Amypo Update] Update check failed:', error);
	}
}

// Launch gate — check if current session is valid (token-based only, no expiry)
function isValidSession(context: vscode.ExtensionContext): boolean {
	const token = context.globalState.get<string>(LAUNCH_TOKEN_KEY);
	return !!token;
}

// Enable UI elements (called after valid portal launch)
async function enableUI(): Promise<void> {
	const config = vscode.workspace.getConfiguration();
	await config.update('workbench.activityBar.visible', true, vscode.ConfigurationTarget.Global);
	await config.update('workbench.statusBar.visible', true, vscode.ConfigurationTarget.Global);
	await config.update('window.menuBarVisibility', 'classic', vscode.ConfigurationTarget.Global);
	await config.update('terminal.integrated.defaultProfile.windows', undefined, vscode.ConfigurationTarget.Global);
	console.log('[Amypo] UI enabled.');
}

// Disable UI elements (called on direct open or expired session)
async function disableUI(): Promise<void> {
	const config = vscode.workspace.getConfiguration();
	await config.update('workbench.activityBar.visible', false, vscode.ConfigurationTarget.Global);
	await config.update('workbench.statusBar.visible', false, vscode.ConfigurationTarget.Global);
	await config.update('window.menuBarVisibility', 'hidden', vscode.ConfigurationTarget.Global);

	// FULL LOCKDOWN: Close all editors and clear workspace
	try {
		await vscode.commands.executeCommand('workbench.action.closeAllEditors');
		if (vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders.length > 0) {
			vscode.workspace.updateWorkspaceFolders(0, vscode.workspace.workspaceFolders.length);
		}
	} catch (e) {
		console.error('[Amypo] Failed to clear workspace:', e);
	}

	console.log('[Amypo] Full UI Lockdown applied.');
}

//  Activate
export async function activate(context: vscode.ExtensionContext) {
	console.log('[Amypo Question] Activating…');

	// Variable to handle the grace period for portal launch
	let gateCheckTimeout: NodeJS.Timeout | undefined;

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

	//  Auto-Update Check (async, non-blocking)
	checkForExtensionUpdate(secretKey).catch(err => {
		console.warn('[Amypo Update] Background update check error:', err);
	});

	// Register Block Action for Extensions View
	context.subscriptions.push(
		vscode.commands.registerCommand('amypo.blockAction', () => {
			vscode.window.showWarningMessage('Amypo Coder: Access to this feature is restricted during testing.');
		})
	);

	// ── Transient Security Gate (v2) ──
	// Step 1: Immediately hide UI and clear session for a fresh start
	await context.globalState.update(LAUNCH_TOKEN_KEY, undefined);
	await disableUI();

	// Step 2: Set a 1.5s grace period to wait for a portal deep link
	gateCheckTimeout = setTimeout(async () => {
		if (!isValidSession(context)) {
			console.log('[Amypo Gate] Grace period expired - Blocking access.');

			// Use Modal Warning (Center of screen, blocks all UI)
			const choice = await vscode.window.showWarningMessage(
				'Access Restricted: This application must be launched from the Amypo Student Portal.',
				{ modal: true },
				'Close Amypo Coder'
			);

			// Quit app immediately
			vscode.commands.executeCommand('workbench.action.quit');
		}
	}, 1500); // 1.5 second grace period

	// Always register URI handler (must work even when locked)
	context.subscriptions.push(
		vscode.window.registerUriHandler({
			async handleUri(uri: vscode.Uri) {
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

				if (!allocation_id || !token) {
					console.error('[Amypo] ERROR: Missing required params!');
					vscode.window.showErrorMessage('Amypo: Invalid deep link — missing parameters.');
					return;
				}

				console.log('[Amypo] All params valid — saving launch token and enabling UI...');

				// Cancel the gate lockout timer immediately
				if (gateCheckTimeout) {
					clearTimeout(gateCheckTimeout);
					gateCheckTimeout = undefined;
				}

				// Save launch token for gate check
				await context.globalState.update(LAUNCH_TOKEN_KEY, token);
				await context.globalState.update('amypo.serverType', server_type);

				// Enable UI elements
				await enableUI();
				await enableUI();

				try {
					vscode.commands.executeCommand('workbench.action.focusAuxiliaryBar');
					vscode.commands.executeCommand(`${EduViewProvider.viewType}.focus`);
				} catch { }

				getTestDetails(allocation_id, test_type, token, module_id);
			}
		})
	);

	//  State
	let currentAllocationData: any = null;
	let currentProjectPath: string | null = null;
	let currentRepoUrl: string | null = null;
	let currentProjectType: 'react' | 'fullstack' | 'spring' = 'spring';

	// Test state for API synchronization
	let activeTestType: number = STATIC_TEST_TYPE;
	let activeModuleId: number = STATIC_MODULE_ID;
	let activeToken: string = STATIC_TOKEN;
	let activeQuestionDatas: any[] = [];
	let activeAllocation: any = context.globalState.get<any>('amypo.testDetails')?.allocation ?? STATIC_ALLOCATION_ID;
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
		console.log("activeAllocation", activeAllocation);
		console.log("activeQuestionDatas", activeQuestionDatas);
		console.log("activeTestType", activeTestType);
		console.log("activeModuleId", activeModuleId);
		console.log("activeToken", activeToken);
		console.log("testStartTime", testStartTime);
		console.log("exit_reason", exit_reason);
		console.log("testStartTime", testStartTime);

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

		console.log("payload", payload);

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

		if (langId === 1002) {
			currentProjectType = 'react';
		} else if (langId === 1004) {
			currentProjectType = 'fullstack';
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
			await context.globalState.update('amypo.lastTest', {
				allocation_id: STATIC_ALLOCATION_ID,
				test_type: STATIC_TEST_TYPE,
				module_id: STATIC_MODULE_ID
			});
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

	// Main: Get Test Details
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

			// Cache full data for restoration
			await context.globalState.update('amypo.testDetails', resp.data);

			currentAllocationData = allocation;
			activeAllocation = allocation;
			activeTestType = test_type;
			activeModuleId = moduleId ?? 0;
			activeToken = token;
			testStartTime = Date.now();

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
				const repo_name = '9239_4090_0_476';
				const repo_url = `${GIT_URL}${repo_name}`;

				const qData = await fetchQuestionById(firstQuestionId, test_type, moduleId ?? 0, token);
				console.log('[Amypo] qData:', qData);
				console.log('[Amypo] questionDatas:', questionDatas);

				let primaryLanguageId: number | undefined;
				try {
					const matchedLang = allLangDetails.find(l => l.id === qData?.l_id);
					primaryLanguageId = matchedLang?.language_id;
					console.log('[Amypo] Matched primary language ID:', primaryLanguageId);
				} catch { /* non-critical */ }

				await cloneAndOpenRepo(repo_url, moduleId, primaryLanguageId);

				if (qData) {
					const msg = { state: 'loaded', payload: qData, stats: statsObj };
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
			eduViewProvider.postMessage({
				state: 'status',
				type: 'info',
				text: action === 'save' ? 'Saving changes…' : 'Pulling changes…',
			});

			const authenticatedUrl = injectToken(currentRepoUrl, GITHUB_TOKEN);

			if (action === 'save') {
				await execAsync('git add .', { cwd: workingDir });

				try {
					await execAsync('git commit -m "User commit"', { cwd: workingDir });
				} catch {
					console.log('[Amypo Git] Nothing new to commit.');
				}

				try {
					await execAsync(`git push ${authenticatedUrl} main`, { cwd: workingDir });
				} catch (error: any) {
					console.error('[Amypo Git] Error during push:', error);
					const errMsg = error.stderr ?? error.message ?? 'Git push failed';
					eduViewProvider.postMessage({ state: 'status', type: 'error', text: `Failed to push: ${errMsg}` });
					return;
				}

				const timestamp = Date.now();
				vscode.window.showInformationMessage('Changes pushed to Git successfully!');
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
				await execAsync(`git pull ${authenticatedUrl} main`, { cwd: workingDir });
				eduViewProvider.postMessage({ state: 'status', type: 'success', text: 'Pulled latest changes!' });
			}

		} catch (error: any) {
			console.error(`[Amypo Git] Error during ${action}:`, error);
			const errMsg = error.stderr ?? error.message ?? 'Git operation failed';
			eduViewProvider.postMessage({ state: 'status', type: 'error', text: `Failed: ${errMsg}` });
		} finally {
			isSyncing = false;
		}
	};

	// eduViewProvider.setOnReload(() => {
	// 	console.log("[Amypo] Reloading test details");
	// 	getTestDetails(STATIC_ALLOCATION_ID, STATIC_TEST_TYPE, STATIC_TOKEN, STATIC_MODULE_ID);
	// });

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


			const request = {
				project_path: currentProjectPath,
				question_id: cachedQuestion?.payload?.question_id,
				qb_name: cachedQuestion?.payload?.qb_name || 'practice',
				token: activeToken,
				backend_url: API_URL
			};

			console.log('[Amypo] Verification request:', request);

			let result;
			if (currentProjectType === 'spring') {
				result = await verifySpringBoot(request);
				console.log('springboot result', result);
			} else if (currentProjectType === 'react') {
				result = await verifyReact(request);
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

		} catch (error: any) {
			console.error('[Amypo] Verification error:', error);
			eduViewProvider.postMessage({ state: 'status', type: 'error', text: `Verification failed: ${error.message}` });
		}
	});

	// ── Launch Gate Check ──
	// If no valid session, lock down UI and block access
	if (!isValidSession(context)) {
		console.log('[Amypo] No valid session — blocking direct open.');
		await disableUI();

		const choice = await vscode.window.showWarningMessage(
			'Access Restricted: Please launch Amypo Coder from the student portal.',
			{ modal: true },
			'Close'
		);

		vscode.commands.executeCommand('workbench.action.closeWindow');
		return;
	}

	// Valid session — enable UI and proceed
	console.log('[Amypo] Valid session detected — enabling UI.');
	await enableUI();

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
	const amypoWorkspace = path.join(os.homedir(), 'amypo-workspace');
	const normalizedCurrent = currentFolder?.replace(/\\/g, '/').toLowerCase() ?? '';
	const normalizedAmypo = amypoWorkspace.replace(/\\/g, '/').toLowerCase();
	const isInsideAmypoProject = normalizedCurrent.startsWith(normalizedAmypo);

	console.log('[Amypo] Guard check:', { currentFolder: normalizedCurrent, amypoWorkspace: normalizedAmypo, isInsideAmypoProject });

	// Use testStarted (flag) AND isInsideAmypoProject (location) to decide whether to restore session automatically.
	const shouldRestore = testAlreadyStarted && isInsideAmypoProject;

	if (shouldRestore) {
		console.log('[Amypo] Re-activation detected (testStarted=' + testAlreadyStarted + ', insideProject=' + isInsideAmypoProject + '). Restoring session…');

		// Restore saved data from globalState
		currentAllocationData = context.globalState.get('amypo.allocationData') ?? null;
		currentProjectPath = context.globalState.get<string>('amypo.projectPath') ?? null;
		currentRepoUrl = context.globalState.get<string>('amypo.repoUrl') ?? null;
		currentProjectType = context.globalState.get<'react' | 'fullstack' | 'spring'>('amypo.projectType') ?? 'spring';
		const lastTest = context.globalState.get<any>('amypo.lastTest') ?? {
			allocation_id: STATIC_ALLOCATION_ID,
			test_type: STATIC_TEST_TYPE,
			module_id: STATIC_MODULE_ID
		};

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

		// Wait for webview to signal 'ready' before sending data
		eduViewProvider.setOnReady(async () => {
			try {
				console.log('[Amypo] Webview ready — restoring question…');

				// Check if we have a cached question from a very recent transition
				const cachedMsg = context.globalState.get<any>('amypo.cachedQuestion');
				if (cachedMsg) {
					console.log('[Amypo] Using cached question data (transition recovery)', cachedMsg);
					eduViewProvider.postMessage(cachedMsg);
					// Clear the cache after one use — subsequent reloads will fetch fresh data
					// await context.globalState.update('amypo.cachedQuestion', undefined);

					// Also restore the course info UI
					const savedCourseInfo = context.globalState.get<any>('amypo.courseInfo');
					console.log('[Amypo] Using cached course info (transition recovery)', savedCourseInfo);

					if (savedCourseInfo) {
						eduViewProvider.updateView(savedCourseInfo, () => { });
					}

					const savedTestData = context.globalState.get<any>('amypo.testData');
					const elapsedSeconds = parseInt(savedTestData.time);
					testStartTime = Date.now() - (elapsedSeconds * 1000);
					return;
				}

				// Otherwise, perform fresh fetch (this handles manual vs code reloads)
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
					STATIC_TOKEN
				);

				const questionMessage = qData
					? { state: 'loaded', payload: qData, stats: statsObj }
					: { state: 'error', message: 'Failed to retrieve question details.' };

				eduViewProvider.postMessage(questionMessage);

				const savedCourseInfo = context.globalState.get<any>('amypo.courseInfo');
				if (savedCourseInfo) {
					eduViewProvider.updateView(savedCourseInfo, () => { });
				}

			} catch (err) {
				console.error('[Amypo] Session restore error:', err);
				eduViewProvider.postMessage({ state: 'error', message: 'Error restoring session.' });
			}
		});

	} else {
		// Fresh launch — show Start Test
		console.log('[Amypo] Fresh launch detected. Showing Start Test screen.');

		// Clear session-specific caches on fresh start (e.g. VS Code opened without a folder)
		if (normalizedCurrent === '') {
			await context.globalState.update('amypo.cachedQuestion', undefined);
			await context.globalState.update('amypo.courseInfo', undefined);
		}

		getTestDetails(STATIC_ALLOCATION_ID, STATIC_TEST_TYPE, STATIC_TOKEN, STATIC_MODULE_ID);
	}

	const doExitAndSave = async () => {
		await vscode.window.withProgress({
			location: vscode.ProgressLocation.Notification,
			title: "Amypo: Performing final save...",
			cancellable: false
		}, async (progress) => {
			try {
				progress.report({ message: "Syncing Git and Server state..." });
				await syncGit('save');

				progress.report({ message: "Cleaning session state..." });
				callMurugaExit();

				// Clear persistent state + launch token
				await context.globalState.update('amypo.testStarted', false);
				await context.globalState.update('amypo.allocationData', undefined);
				await context.globalState.update('amypo.testDetails', undefined);
				await context.globalState.update('amypo.testData', undefined);
				await context.globalState.update('amypo.questionData', undefined);
				await context.globalState.update('amypo.courseInfo', undefined);
				await context.globalState.update('amypo.cachedQuestion', undefined);
				await context.globalState.update(LAUNCH_TOKEN_KEY, undefined);

				// Disable UI before closing
				await disableUI();

				// Final exit
				vscode.commands.executeCommand('workbench.action.closeWindow');
			} catch (error) {
				vscode.window.showErrorMessage("Failed to save progress on exit. Please try manual save first.");
			}
		});
	};

	// Global interceptor to handle 401 Backend Errors with a Modal Alert
	axios.interceptors.response.use(
		response => response,
		async error => {
			if (error.response?.status === 401) {
				const saveExitItem: vscode.MessageItem = { title: "Save & Exit", isCloseAffordance: true };
				const choice = await vscode.window.showWarningMessage(
					"Session Expired (401)! Please save your progress and exit to sync to the cloud.",
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

	context.subscriptions.push(vscode.commands.registerCommand('amypo.exit', async () => {
		const choice = await vscode.window.showWarningMessage(
			"Are you sure you want to finish and exit? Your current progress will be synced to the cloud.",
			{ modal: true },
			"Save & Exit"
		);

		if (choice !== "Save & Exit") {
			return;
		}

		doExitAndSave();
	}));
}

export function deactivate() { }
