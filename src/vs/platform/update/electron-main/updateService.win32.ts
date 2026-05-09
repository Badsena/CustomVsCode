/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { ChildProcess, spawn } from 'child_process';
import { app } from 'electron';
import { existsSync } from 'fs';
import { mkdir, readFile, unlink } from 'fs/promises';
import { release, tmpdir } from 'os';
import { Delayer } from '../../../base/common/async.js';
import { VSBuffer } from '../../../base/common/buffer.js';
import { CancellationToken } from '../../../base/common/cancellation.js';
import { memoize } from '../../../base/common/decorators.js';
// import { hash } from '../../../base/common/hash.js';
import * as path from '../../../base/common/path.js';
import { basename } from '../../../base/common/path.js';
import { transform } from '../../../base/common/stream.js';
import { URI } from '../../../base/common/uri.js';
// import { checksum } from '../../../base/node/crypto.js';
import * as pfs from '../../../base/node/pfs.js';
import { getWindowsRelease } from '../../../base/node/windowsVersion.js';
import { IConfigurationService } from '../../configuration/common/configuration.js';
import { IEnvironmentMainService } from '../../environment/electron-main/environmentMainService.js';
import { IFileService } from '../../files/common/files.js';
import { ILifecycleMainService, IRelaunchHandler, IRelaunchOptions } from '../../lifecycle/electron-main/lifecycleMainService.js';
import { ILogService } from '../../log/common/log.js';
import { IMeteredConnectionService } from '../../meteredConnection/common/meteredConnection.js';
import { IProductService } from '../../product/common/productService.js';
import { asJson, IRequestService } from '../../request/common/request.js';
import { ITelemetryService } from '../../telemetry/common/telemetry.js';
import { AvailableForDownload, IUpdate, State, StateType, UpdateType } from '../common/update.js';
import { AbstractUpdateService, createUpdateURL, IUpdateURLOptions } from './abstractUpdateService.js';
import { INodeProcess } from '../../../base/common/platform.js';

interface IAvailableUpdate {
	packagePath: string;
	updateFilePath?: string;
	cancelFilePath?: string;
	updateProcess?: ChildProcess;
}

let _updateType: UpdateType | undefined = undefined;
function getUpdateType(): UpdateType {
	if (typeof _updateType === 'undefined') {
		_updateType = existsSync(path.join(path.dirname(process.execPath), 'unins000.exe'))
			? UpdateType.Setup
			: UpdateType.Archive;
	}
	return _updateType;
}

export class Win32UpdateService extends AbstractUpdateService implements IRelaunchHandler {

	private availableUpdate: IAvailableUpdate | undefined;


	@memoize
	get cachePath(): Promise<string> {
		const result = path.join(tmpdir(), `vscode-${this.productService.quality}-${this.productService.target}-${process.arch}`);
		return mkdir(result, { recursive: true }).then(() => result);
	}

	constructor(
		@ILifecycleMainService lifecycleMainService: ILifecycleMainService,
		@IConfigurationService configurationService: IConfigurationService,
		@ITelemetryService private readonly telemetryService: ITelemetryService,
		@IEnvironmentMainService environmentMainService: IEnvironmentMainService,
		@IRequestService requestService: IRequestService,
		@ILogService logService: ILogService,
		@IFileService private readonly fileService: IFileService,
		@IProductService productService: IProductService,
		@IMeteredConnectionService meteredConnectionService: IMeteredConnectionService,
	) {
		super(lifecycleMainService, configurationService, environmentMainService, requestService, logService, productService, meteredConnectionService, true);
		lifecycleMainService.setRelaunchHandler(this);
	}

	handleRelaunch(options?: IRelaunchOptions): boolean {
		if (options?.addArgs || options?.removeArgs) {
			return false;
		}
		if (this.state.type !== StateType.Ready || !this.availableUpdate) {
			return false;
		}
		this.logService.trace('update#handleRelaunch(): running raw#quitAndInstall()');
		this.doQuitAndInstall();
		return true;
	}

	protected override async initialize(): Promise<void> {
		if ((process as INodeProcess).isEmbeddedApp) {
			this.logService.info('update#ctor - embedded app: checking for updates without auto-download');
			await super.initialize();
			return;
		}

		if (this.productService.win32VersionedUpdate) {
			const cachePath = await this.cachePath;
			app.setPath('appUpdate', cachePath);
			await this.unlink(path.join(cachePath, 'session-ending.flag'));
		}

		type WindowsUpdateInitEvent = { osRelease: string; osNodeRelease: string; };
		type WindowsUpdateInitClassification = {
			osRelease: { classification: 'SystemMetaData'; purpose: 'FeatureInsight'; comment: 'The Windows OS release version from registry.' };
			osNodeRelease: { classification: 'SystemMetaData'; purpose: 'FeatureInsight'; comment: 'The Windows OS release version from os.release().' };
			owner: 'dmitriv';
			comment: 'Tracks Windows OS release information during update initialization.';
		};
		const osRelease = await getWindowsRelease();
		const osNodeRelease = release();
		this.telemetryService.publicLog2<WindowsUpdateInitEvent, WindowsUpdateInitClassification>('windowsUpdateInit', { osRelease, osNodeRelease });

		// ✅ Amypo: System setup only — user-setup admin check is disabled
		// if (this.productService.target === 'user' && await this.nativeHostMainService.isAdmin(undefined)) {
		// 	this.setState(State.Disabled(DisablementReason.RunningAsAdmin));
		// 	this.logService.info('update#ctor - updates are disabled due to running as Admin in user setup');
		// 	return;
		// }

		await super.initialize();
	}

	protected override async postInitialize(): Promise<void> {
		if (!this.productService.win32VersionedUpdate) {
			return;
		}
		const exePath = app.getPath('exe');
		const exeDir = path.dirname(exePath);
		const updatingVersionPath = path.join(exeDir, 'updating_version');
		if (await pfs.Promises.exists(updatingVersionPath)) {
			try {
				const updatingVersion = (await readFile(updatingVersionPath, 'utf8')).trim();
				this.logService.info(`update#doCheckForUpdates - application was updating to version ${updatingVersion}`);
				const updatePackagePath = await this.getUpdatePackagePath(updatingVersion);
				if (await pfs.Promises.exists(updatePackagePath)) {
					await this._applySpecificUpdate(updatePackagePath);
					this.logService.info(`update#doCheckForUpdates - successfully applied update to version ${updatingVersion}`);
				}
			} catch (e) {
				this.logService.error(`update#doCheckForUpdates - could not read ${updatingVersionPath}`, e);
			}
		} else {
			// ✅ Amypo: System setup only — user-setup inno_updater background GC is disabled
			// const fastUpdatesEnabled = this.configurationService.getValue('update.enableWindowsBackgroundUpdates');
			// if (fastUpdatesEnabled && this.productService.target === 'user' && this.productService.commit) {
			// 	const versionedResourcesFolder = this.productService.commit.substring(0, 10);
			// 	const innoUpdater = path.join(exeDir, versionedResourcesFolder, 'tools', 'inno_updater.exe');
			// 	await new Promise<void>(resolve => {
			// 		const child = spawn(innoUpdater, ['--gc', exePath, versionedResourcesFolder], {
			// 			stdio: ['ignore', 'ignore', 'ignore'],
			// 			windowsHide: true,
			// 			timeout: 2 * 60 * 1000
			// 		});
			// 		child.once('exit', () => resolve());
			// 	});
			// }
		}
	}

	protected buildUpdateFeedUrl(quality: string, commit: string, options?: IUpdateURLOptions): string | undefined {
		let platform = `win32-${process.arch}`;
		if (getUpdateType() === UpdateType.Archive) {
			platform += '-archive';
		}
		// ✅ Amypo: System setup only — user platform suffix is disabled
		// else if (this.productService.target === 'user') {
		// 	platform += '-user';
		// }
		return createUpdateURL(this.productService.updateUrl!, platform, quality, commit, options);
	}

	// ✅ Amypo Custom App Update Check
	private async checkAmypoUpdate(explicit: boolean): Promise<void> {
		try {
			const updateUrl = this.productService.amypoUpdateUrl;
			const currentVersion = this.productService.amypoAppVersion ?? '1.0.0';

			if (!updateUrl) {
				this.logService.warn('[AmypoUpdate] No amypoUpdateUrl in product.json');
				return;
			}

			this.logService.info(`[AmypoUpdate] Checking... current: ${currentVersion}`);
			this.setState(State.CheckingForUpdates(explicit));

			const context = await this.requestService.request(
				{ url: updateUrl, callSite: 'amypoUpdate.check' },
				CancellationToken.None
			);

			const data = await asJson<any>(context);

			if (!data || !data.app || !Array.isArray(data.app)) {
				this.logService.info('[AmypoUpdate] No valid app section found — up to date');
				this.setState(State.Idle(getUpdateType(), undefined, explicit || undefined));
				return;
			}

			// Find the windows entry in the app array
			const winApp = data.app.find((a: any) => a.id === 'windows');
			if (!winApp) {
				this.logService.info('[AmypoUpdate] No Windows update section found.');
				this.setState(State.Idle(getUpdateType(), undefined, explicit || undefined));
				return;
			}

			const serverVersion = winApp.version;
			const downloadUrl = winApp.url;

			this.logService.info(`[AmypoUpdate] Server: ${serverVersion} | Current: ${currentVersion}`);

			if (!this.isAmypoNewer(serverVersion, currentVersion)) {
				this.logService.info('[AmypoUpdate] Already up to date ✅');
				this.setState(State.Idle(getUpdateType(), undefined, explicit || undefined));
				return;
			}

			this.logService.info(`[AmypoUpdate] New version found: ${serverVersion}`);

			const update: IUpdate = {
				version: serverVersion,
				productVersion: serverVersion,
				url: downloadUrl,
				sha256hash: data.app.sha256hash ?? ''
			};

			this.setState(State.AvailableForDownload(update));

		} catch (err: any) {
			this.logService.error('[AmypoUpdate] Check failed:', err.message);
			this.setState(State.Idle(getUpdateType()));
		}
	}

	// ✅ Version compare helper
	private isAmypoNewer(server: string, current: string): boolean {
		const a = server.split('.').map(Number);
		const b = current.split('.').map(Number);
		for (let i = 0; i < 3; i++) {
			if ((a[i] || 0) > (b[i] || 0)) return true;
			if ((a[i] || 0) < (b[i] || 0)) return false;
		}
		return false;
	}

	protected doCheckForUpdates(explicit: boolean, pendingCommit?: string): void {
		// ✅ Use Amypo custom update — skip VS Code update server
		this.checkAmypoUpdate(explicit);
	}

	protected override async doDownloadUpdate(state: AvailableForDownload): Promise<void> {
		if (!state.update.url) {
			return;
		}

		try {
			const version = state.update.version;
			const downloadUrl = state.update.url;

			// ✅ Show downloading state
			this.setState(State.Downloading(state.update, true, false, 0, undefined, Date.now()));

			// ✅ Download to temp folder
			const cachePath = await this.cachePath;
			const downloadPath = path.join(cachePath, `AmypoCoderSetup-${version}.exe.tmp`);
			const finalPath = path.join(cachePath, `AmypoCoderSetup-${version}.exe`);

			this.logService.info(`[AmypoUpdate] Downloading from: ${downloadUrl}`);

			// ✅ Download using requestService
			const context = await this.requestService.request({ url: downloadUrl, callSite: 'amypoUpdate.download' }, CancellationToken.None);

			const contentLengthHeader = context.res.headers['content-length'];
			const totalBytes = contentLengthHeader ? parseInt(String(contentLengthHeader), 10) : undefined;

			let downloadedBytes = 0;
			const startTime = Date.now();
			const progressDelayer = new Delayer<void>(500);

			const progressStream = transform<VSBuffer, VSBuffer>(
				context.stream,
				{
					data: chunk => {
						downloadedBytes += chunk.byteLength;
						progressDelayer.trigger(() => {
							this.setState(State.Downloading(state.update, true, false, downloadedBytes, totalBytes, startTime));
						});
						return chunk;
					}
				},
				chunks => VSBuffer.concat(chunks)
			);

			// ✅ Save to disk
			await this.fileService.writeFile(URI.file(downloadPath), progressStream).finally(() => progressDelayer.dispose());

			// ✅ Rename tmp → final
			await pfs.Promises.rename(downloadPath, finalPath, false);

			this.logService.info(`[AmypoUpdate] Downloaded to: ${finalPath}`);

			this.availableUpdate = { packagePath: finalPath };
			await this.saveUpdateMetadata(state.update);
			
			this.setState(State.Downloaded(state.update, true, false));

		} catch (err: any) {
			this.logService.error('[AmypoUpdate] Download failed:', err.message);
			this.setState(State.Idle(getUpdateType(), err.message));
		}
	}

	private async saveUpdateMetadata(update: IUpdate): Promise<void> {
		try {
			const cachePath = await this.cachePath;
			const metadataPath = path.join(cachePath, 'update-metadata.json');
			await pfs.Promises.writeFile(metadataPath, JSON.stringify(update));
		} catch (e) {
			this.logService.error('update#saveUpdateMetadata: failed to save', e);
		}
	}

	private async getUpdatePackagePath(version: string): Promise<string> {
		const cachePath = await this.cachePath;
		return path.join(cachePath, `CodeSetup-${this.productService.quality}-${version}.exe`);
	}


	protected override async doApplyUpdate(): Promise<void> {
		if (this.state.type !== StateType.Downloaded) {
			return Promise.resolve(undefined);
		}
		if (!this.availableUpdate) {
			return Promise.resolve(undefined);
		}

		const update = this.state.update;
		const explicit = this.state.explicit;

		// Move to Ready state to trigger "Restart to Update" UI
		this.setState(State.Ready(update, explicit, false));
	}

	protected override doQuitAndInstall(): void {
		if (this.state.type !== StateType.Ready || !this.availableUpdate) {
			return;
		}
		
		this.logService.info('[AmypoUpdate] Quitting and installing update...');

		const spawnOptions: any = {
			detached: true,
			stdio: ['ignore', 'ignore', 'ignore'],
			env: { ...process.env }
		};

		// Launch the setup.exe with silent flags
		spawn(this.availableUpdate.packagePath, [
			'/verysilent',
			'/update',
			'/forcecloseapplications',
			'/log',
			'/mergetasks=runcode,!desktopicon,!quicklaunchicon'
		], spawnOptions);
	}


	private async loadUpdateMetadata(): Promise<IUpdate | undefined> {
		try {
			const cachePath = await this.cachePath;
			const metadataPath = path.join(cachePath, 'update-metadata.json');
			if (await pfs.Promises.exists(metadataPath)) {
				const content = await readFile(metadataPath, 'utf8');
				return JSON.parse(content);
			}
		} catch (e) {
			this.logService.error('update#loadUpdateMetadata: failed to load', e);
		}
		return undefined;
	}

	protected override getUpdateType(): UpdateType {
		return getUpdateType();
	}

	override async _applySpecificUpdate(packagePath: string): Promise<void> {
		if (this.state.type !== StateType.Idle) {
			return;
		}
		const update: IUpdate = await this.loadUpdateMetadata() ?? { version: 'unknown', productVersion: 'unknown' };

		this.setState(State.Downloading(update, true, false));
		this.availableUpdate = { packagePath };
		this.setState(State.Downloaded(update, true, false));

		// ✅ Amypo: System setup only — always go to Ready state (shows "Restart to Update" badge)
		// if (fastUpdatesEnabled && this.productService.target === 'user') {
		// 	this.doApplyUpdate();
		// } else {
		this.setState(State.Ready(update, true, false));
		// }
	}

	private async unlink(path: string | undefined): Promise<void> {
		if (path) {
			try {
				await unlink(path);
			} catch (err) {
				const error = err as NodeJS.ErrnoException;
				if (error && error.code === 'ENOENT') {
					return;
				} else {
					this.logService.warn(`update#unlink: failed to unlink ${basename(path)}`, err);
				}
			}
		}
	}
}
