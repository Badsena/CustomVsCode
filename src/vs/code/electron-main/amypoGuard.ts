/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { app, dialog } from 'electron';

/**
 * enforcePortalLaunch
 * 
 * This is the ultimate security gate for Amypo Coder. It runs in the Electron Main process
 * at the very beginning of the application lifecycle.
 * 
 * It checks if the app was launched via the 'amypocoder://' protocol or specifically authorized
 * by the portal. If unauthorized, it shows a NATIVE modal dialog and exits the app.
 */
export async function enforcePortalLaunch(): Promise<boolean> {

	const args = process.argv.slice(1);
	const env = process.env;

	// ── 1. Bypass Checks (for Development & Debugging) ───────────────────
	const isDevMode = 
		!!env['VSCODE_DEV'] || 
		args.some(a => a.includes('--extensionDevelopmentPath')) ||
		args.some(a => a.includes('--remote-debugging-port'));

	if (isDevMode) {
		console.log('[Amypo Guard] Development mode detected — Bypassing security gate.');
		return true;
	}

	// ── 2. Authorization Checks ──────────────────────────────────────────
	const checks = {
		// Launched via protocol (Windows handles this as an argv)
		hasProtocol: args.some(a => 
			a.toLowerCase().startsWith('amypocoder://') || 
			a.toLowerCase().startsWith('amypo://')
		),
		
		// Portal can set an environment variable before spawning the process
		hasPortalEnv: !!env['AMYPO_PORTAL_TOKEN'],
		
		// Portal can pass a specialized flag
		hasPortalFlag: args.includes('--amypo-portal')
	};

	const isAuthorized = 
		checks.hasProtocol || 
		checks.hasPortalEnv || 
		checks.hasPortalFlag;

	// ── 3. Lockdown Execution ───────────────────────────────────────────
	if (!isAuthorized) {
		console.error('[Amypo Guard] UNAUTHORIZED DIRECT LAUNCH DETECTED — LOCKING DOWN.');

		// We must wait for the app to be ready to show a dialog
		if (!app.isReady()) {
			await app.whenReady();
		}

		// Show Native OS Dialog (Blocks everything)
		dialog.showMessageBoxSync({
			type: 'error',
			title: 'Amypo Coder — Access Restricted',
			message: '🔒 Direct Application Launch Not Allowed',
			detail: 
				'Amypo Coder can only be launched through the official student portal.\n\n' +
				'Please visit your student dashboard and click the "Launch Amypo Coder" button to continue.',
			buttons: ['Close Application'],
			defaultId: 0,
			noLink: true
		});

		// Kill the process immediately
		app.exit(0);
		return false;
	}

	console.log('[Amypo Guard] Authorized portal launch verified.');
	return true;
}
