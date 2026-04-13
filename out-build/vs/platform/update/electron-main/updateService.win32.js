/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
import { spawn } from 'child_process';
import { app } from 'electron';
import { existsSync, unlinkSync } from 'fs';
import { mkdir, readFile, unlink } from 'fs/promises';
import { release, tmpdir } from 'os';
import { Delayer, ProcessTimeRunOnceScheduler, timeout } from '../../../base/common/async.js';
import { VSBuffer } from '../../../base/common/buffer.js';
import { CancellationToken, CancellationTokenSource } from '../../../base/common/cancellation.js';
import { memoize } from '../../../base/common/decorators.js';
import { hash } from '../../../base/common/hash.js';
import * as path from '../../../base/common/path.js';
import { basename } from '../../../base/common/path.js';
import { transform } from '../../../base/common/stream.js';
import { URI } from '../../../base/common/uri.js';
import { checksum } from '../../../base/node/crypto.js';
import * as pfs from '../../../base/node/pfs.js';
import { killTree } from '../../../base/node/processes.js';
import { getWindowsRelease } from '../../../base/node/windowsVersion.js';
import { IConfigurationService } from '../../configuration/common/configuration.js';
import { IEnvironmentMainService } from '../../environment/electron-main/environmentMainService.js';
import { IFileService } from '../../files/common/files.js';
import { ILifecycleMainService } from '../../lifecycle/electron-main/lifecycleMainService.js';
import { ILogService } from '../../log/common/log.js';
import { IMeteredConnectionService } from '../../meteredConnection/common/meteredConnection.js';
import { INativeHostMainService } from '../../native/electron-main/nativeHostMainService.js';
import { IProductService } from '../../product/common/productService.js';
import { asJson, IRequestService } from '../../request/common/request.js';
import { ITelemetryService } from '../../telemetry/common/telemetry.js';
import { State } from '../common/update.js';
import { AbstractUpdateService, createUpdateURL, getUpdateRequestHeaders } from './abstractUpdateService.js';
let _updateType = undefined;
function getUpdateType() {
    if (typeof _updateType === 'undefined') {
        _updateType = existsSync(path.join(path.dirname(process.execPath), 'unins000.exe'))
            ? 0 /* UpdateType.Setup */
            : 1 /* UpdateType.Archive */;
    }
    return _updateType;
}
let Win32UpdateService = class Win32UpdateService extends AbstractUpdateService {
    get cachePath() {
        const result = path.join(tmpdir(), `vscode-${this.productService.quality}-${this.productService.target}-${process.arch}`);
        return mkdir(result, { recursive: true }).then(() => result);
    }
    constructor(lifecycleMainService, configurationService, telemetryService, environmentMainService, requestService, logService, fileService, nativeHostMainService, productService, meteredConnectionService) {
        super(lifecycleMainService, configurationService, environmentMainService, requestService, logService, productService, meteredConnectionService, true);
        this.telemetryService = telemetryService;
        this.fileService = fileService;
        this.nativeHostMainService = nativeHostMainService;
        lifecycleMainService.setRelaunchHandler(this);
    }
    handleRelaunch(options) {
        if (options?.addArgs || options?.removeArgs) {
            return false; // we cannot apply an update and restart with different args
        }
        if (this.state.type !== "ready" /* StateType.Ready */ || !this.availableUpdate) {
            return false; // we only handle the relaunch when we have a pending update
        }
        this.logService.trace('update#handleRelaunch(): running raw#quitAndInstall()');
        this.doQuitAndInstall();
        return true;
    }
    async initialize() {
        // In the embedded app, skip win32-specific setup (cache paths, telemetry)
        // but still run the base initialization to detect available updates.
        if (process.isEmbeddedApp) {
            this.logService.info('update#ctor - embedded app: checking for updates without auto-download');
            await super.initialize();
            return;
        }
        if (this.productService.win32VersionedUpdate) {
            const cachePath = await this.cachePath;
            app.setPath('appUpdate', cachePath);
            await this.unlink(path.join(cachePath, 'session-ending.flag'));
        }
        const osRelease = await getWindowsRelease();
        const osNodeRelease = release();
        this.telemetryService.publicLog2('windowsUpdateInit', { osRelease, osNodeRelease });
        if (this.productService.target === 'user' && await this.nativeHostMainService.isAdmin(undefined)) {
            this.setState(State.Disabled(6 /* DisablementReason.RunningAsAdmin */));
            this.logService.info('update#ctor - updates are disabled due to running as Admin in user setup');
            return;
        }
        await super.initialize();
    }
    async postInitialize() {
        if (!this.productService.win32VersionedUpdate) {
            return;
        }
        // Check for pending update from previous session
        // This can happen if the app is quit right after the update has been
        // downloaded and before the update has been applied.
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
            }
            catch (e) {
                this.logService.error(`update#doCheckForUpdates - could not read ${updatingVersionPath}`, e);
            }
            finally {
                // updatingVersionPath will be deleted by inno setup.
            }
        }
        else {
            const fastUpdatesEnabled = this.configurationService.getValue('update.enableWindowsBackgroundUpdates');
            // GC for background updates in system setup happens via inno_setup since it requires
            // elevated permissions.
            if (fastUpdatesEnabled && this.productService.target === 'user' && this.productService.commit) {
                const versionedResourcesFolder = this.productService.commit.substring(0, 10);
                const innoUpdater = path.join(exeDir, versionedResourcesFolder, 'tools', 'inno_updater.exe');
                await new Promise(resolve => {
                    const child = spawn(innoUpdater, ['--gc', exePath, versionedResourcesFolder], {
                        stdio: ['ignore', 'ignore', 'ignore'],
                        windowsHide: true,
                        timeout: 2 * 60 * 1000
                    });
                    child.once('exit', () => resolve());
                });
            }
        }
    }
    buildUpdateFeedUrl(quality, commit, options) {
        let platform = `win32-${process.arch}`;
        if (getUpdateType() === 1 /* UpdateType.Archive */) {
            platform += '-archive';
        }
        else if (this.productService.target === 'user') {
            platform += '-user';
        }
        return createUpdateURL(this.productService.updateUrl, platform, quality, commit, options);
    }
    doCheckForUpdates(explicit, pendingCommit) {
        if (!this.quality) {
            return;
        }
        const internalOrg = this.getInternalOrg();
        const background = !explicit && !internalOrg;
        const url = this.buildUpdateFeedUrl(this.quality, pendingCommit ?? this.productService.commit, { background, internalOrg });
        // Only set CheckingForUpdates if we're not already in Overwriting state
        if (this.state.type !== "overwriting" /* StateType.Overwriting */) {
            this.setState(State.CheckingForUpdates(explicit));
        }
        const headers = getUpdateRequestHeaders(this.productService.version);
        this.requestService.request({ url, headers, callSite: 'updateService.win32.checkForUpdates' }, CancellationToken.None)
            .then(asJson)
            .then(update => {
            const updateType = getUpdateType();
            if (!update || !update.url || !update.version || !update.productVersion) {
                // If we were checking for an overwrite update and found nothing newer,
                // restore the Ready state with the pending update
                if (this.state.type === "overwriting" /* StateType.Overwriting */) {
                    this._overwrite = false;
                    this.setState(State.Ready(this.state.update, this.state.explicit, false));
                }
                else {
                    this.setState(State.Idle(updateType, undefined, explicit || undefined));
                }
                return Promise.resolve(null);
            }
            if (updateType === 1 /* UpdateType.Archive */) {
                this.setState(State.AvailableForDownload(update));
                return Promise.resolve(null);
            }
            // In the embedded app, signal that an update exists but can't be installed here.
            if (process.isEmbeddedApp) {
                this.logService.info('update#doCheckForUpdates - embedded app: update available, skipping download');
                this.setState(State.AvailableForDownload(update, /* canInstall */ false));
                return Promise.resolve(null);
            }
            // When connection is metered and this is not an explicit check,
            // show update is available but don't start downloading
            if (!explicit && this.meteredConnectionService.isConnectionMetered) {
                this.logService.info('update#doCheckForUpdates - update available but skipping download because connection is metered');
                this.setState(State.AvailableForDownload(update));
                return Promise.resolve(null);
            }
            const startTime = Date.now();
            this.setState(State.Downloading(update, explicit, this._overwrite, 0, undefined, startTime));
            return this.cleanup(update.version).then(() => {
                return this.getUpdatePackagePath(update.version).then(updatePackagePath => {
                    return pfs.Promises.exists(updatePackagePath).then(exists => {
                        if (exists) {
                            return Promise.resolve(updatePackagePath);
                        }
                        const downloadPath = `${updatePackagePath}.tmp`;
                        return this.requestService.request({ url: update.url, callSite: 'updateService.win32.downloadUpdate' }, CancellationToken.None)
                            .then(context => {
                            // Get total size from Content-Length header
                            const contentLengthHeader = context.res.headers['content-length'];
                            const contentLength = typeof contentLengthHeader === 'string' ? contentLengthHeader : undefined;
                            const totalBytes = contentLength ? parseInt(contentLength, 10) : undefined;
                            // Track downloaded bytes and update state periodically using Delayer
                            let downloadedBytes = 0;
                            const progressDelayer = new Delayer(500);
                            const progressStream = transform(context.stream, {
                                data: data => {
                                    downloadedBytes += data.byteLength;
                                    progressDelayer.trigger(() => {
                                        this.setState(State.Downloading(update, explicit, this._overwrite, downloadedBytes, totalBytes, startTime));
                                    });
                                    return data;
                                }
                            }, chunks => VSBuffer.concat(chunks));
                            return this.fileService.writeFile(URI.file(downloadPath), progressStream)
                                .finally(() => progressDelayer.dispose());
                        })
                            .then(update.sha256hash ? () => checksum(downloadPath, update.sha256hash) : () => undefined)
                            .then(() => pfs.Promises.rename(downloadPath, updatePackagePath, false /* no retry */))
                            .then(() => updatePackagePath);
                    });
                }).then(packagePath => {
                    this.availableUpdate = { packagePath };
                    this.saveUpdateMetadata(update);
                    this.setState(State.Downloaded(update, explicit, this._overwrite));
                    const fastUpdatesEnabled = this.configurationService.getValue('update.enableWindowsBackgroundUpdates');
                    if (fastUpdatesEnabled && this.productService.target === 'user') {
                        this.doApplyUpdate();
                    }
                    else {
                        this.setState(State.Ready(update, explicit, this._overwrite));
                    }
                });
            });
        })
            .then(undefined, err => {
            this.telemetryService.publicLog2('update:error', { messageHash: String(hash(String(err))) });
            this.logService.error(err);
            // only show message when explicitly checking for updates
            const message = explicit ? (err.message || err) : undefined;
            // If we were checking for an overwrite update and it failed,
            // restore the Ready state with the pending update
            if (this.state.type === "overwriting" /* StateType.Overwriting */) {
                this._overwrite = false;
                this.setState(State.Ready(this.state.update, this.state.explicit, false));
            }
            else {
                this.setState(State.Idle(getUpdateType(), message));
            }
        });
    }
    async doDownloadUpdate(state) {
        if (state.update.url) {
            this.nativeHostMainService.openExternal(undefined, state.update.url);
        }
        this.setState(State.Idle(getUpdateType()));
    }
    async getUpdatePackagePath(version) {
        const cachePath = await this.cachePath;
        return path.join(cachePath, `CodeSetup-${this.productService.quality}-${version}.exe`);
    }
    async cleanup(exceptVersion = null) {
        const filter = exceptVersion ? (one) => !(new RegExp(`${this.productService.quality}-${exceptVersion}\\.exe$`).test(one)) : () => true;
        const cachePath = await this.cachePath;
        const versions = await pfs.Promises.readdir(cachePath);
        const promises = versions.filter(filter).map(one => this.unlink(path.join(cachePath, one)));
        await Promise.all(promises);
    }
    async doApplyUpdate() {
        if (this.state.type !== "downloaded" /* StateType.Downloaded */) {
            return Promise.resolve(undefined);
        }
        if (!this.availableUpdate) {
            return Promise.resolve(undefined);
        }
        const update = this.state.update;
        const explicit = this.state.explicit;
        this.setState(State.Updating(update));
        const cachePath = await this.cachePath;
        const sessionEndFlagPath = path.join(cachePath, 'session-ending.flag');
        const cancelFilePath = path.join(cachePath, `cancel.flag`);
        await this.unlink(cancelFilePath);
        const progressFilePath = path.join(cachePath, `update-progress`);
        await this.unlink(progressFilePath);
        this.availableUpdate.updateFilePath = path.join(cachePath, `CodeSetup-${this.productService.quality}-${update.version}.flag`);
        this.availableUpdate.cancelFilePath = cancelFilePath;
        await pfs.Promises.writeFile(this.availableUpdate.updateFilePath, 'flag');
        const child = spawn(this.availableUpdate.packagePath, [
            '/verysilent',
            '/log',
            `/update="${this.availableUpdate.updateFilePath}"`,
            `/progress="${progressFilePath}"`,
            `/sessionend="${sessionEndFlagPath}"`,
            `/cancel="${cancelFilePath}"`,
            '/nocloseapplications',
            '/mergetasks=runcode,!desktopicon,!quicklaunchicon'
        ], {
            detached: true,
            stdio: ['ignore', 'ignore', 'ignore'],
            windowsVerbatimArguments: true,
            env: { ...process.env, __COMPAT_LAYER: 'RunAsInvoker' }
        });
        // Track the process so we can cancel it if needed
        this.availableUpdate.updateProcess = child;
        child.once('exit', () => {
            this.availableUpdate = undefined;
            this.setState(State.Idle(getUpdateType()));
        });
        const readyMutexName = `${this.productService.win32MutexName}-ready`;
        const mutex = await import('@vscode/windows-mutex');
        this.updateCancellationTokenSource?.dispose(true);
        const cts = this.updateCancellationTokenSource = new CancellationTokenSource();
        const token = cts.token;
        const poll = async () => {
            while (this.state.type === "updating" /* StateType.Updating */ && !token.isCancellationRequested) {
                if (mutex.isActive(readyMutexName)) {
                    this.setState(State.Ready(update, explicit, this._overwrite));
                    return;
                }
                try {
                    const progressContent = await readFile(progressFilePath, 'utf8');
                    if (!token.isCancellationRequested) {
                        const [currentStr, maxStr] = progressContent.split(',');
                        const currentProgress = parseInt(currentStr, 10);
                        const maxProgress = parseInt(maxStr, 10);
                        if (!isNaN(currentProgress) && !isNaN(maxProgress) && this.state.type === "updating" /* StateType.Updating */) {
                            if (this.state.currentProgress !== currentProgress || this.state.maxProgress !== maxProgress) {
                                this.setState(State.Updating(update, currentProgress, maxProgress));
                            }
                        }
                    }
                }
                catch {
                    // Progress file may not exist yet or be locked, ignore
                }
                await timeout(500);
            }
        };
        const cancelTimeout = new ProcessTimeRunOnceScheduler(() => {
            this.logService.warn('update#doApplyUpdate: polling timed out waiting for update to be ready');
            this.setState(State.Idle(getUpdateType(), 'Update did not complete within expected time'));
        }, 60 * 60 * 1000);
        // Poll for progress and ready mutex for 1 hour.
        cancelTimeout.schedule();
        poll().finally(() => {
            cancelTimeout.dispose();
            if (this.updateCancellationTokenSource === cts) {
                this.updateCancellationTokenSource = undefined;
            }
            cts.dispose();
        });
    }
    async cancelPendingUpdate() {
        if (!this.availableUpdate) {
            return;
        }
        // Cancel the polling loop
        this.updateCancellationTokenSource?.dispose(true);
        this.updateCancellationTokenSource = undefined;
        this.logService.trace('update#cancelPendingUpdate: cancelling pending update');
        const { updateProcess, updateFilePath, cancelFilePath } = this.availableUpdate;
        if (updateProcess && updateProcess.exitCode === null) {
            // Remove all listeners to prevent the exit handler from changing state
            updateProcess.removeAllListeners();
            const exitPromise = new Promise(resolve => updateProcess.once('exit', () => resolve(true)));
            // Write the cancel file to signal Inno Setup to exit gracefully
            if (cancelFilePath) {
                try {
                    await pfs.Promises.writeFile(cancelFilePath, 'cancel');
                }
                catch (err) {
                    this.logService.warn('update#cancelPendingUpdate: failed to write cancel file', err);
                }
            }
            // Wait for the process to exit gracefully, then force-kill if needed
            const pid = updateProcess.pid;
            const exited = await Promise.race([exitPromise, timeout(30 * 1000).then(() => false)]);
            if (pid && !exited) {
                this.logService.trace('update#cancelPendingUpdate: process did not exit gracefully, killing process tree');
                await killTree(pid, true);
            }
        }
        // Clean up the flag file
        await this.unlink(updateFilePath);
        // Clean up the cancel file
        await this.unlink(cancelFilePath);
        this.availableUpdate = undefined;
    }
    doQuitAndInstall() {
        if (this.state.type !== "ready" /* StateType.Ready */ || !this.availableUpdate) {
            return;
        }
        this.logService.trace('update#quitAndInstall(): running raw#quitAndInstall()');
        if (this.availableUpdate.updateFilePath) {
            try {
                unlinkSync(this.availableUpdate.updateFilePath);
            }
            catch {
                // ignore
            }
        }
        else {
            spawn(this.availableUpdate.packagePath, ['/silent', '/log', '/mergetasks=runcode,!desktopicon,!quicklaunchicon'], {
                detached: true,
                stdio: ['ignore', 'ignore', 'ignore'],
                env: { ...process.env, __COMPAT_LAYER: 'RunAsInvoker' }
            });
        }
    }
    async saveUpdateMetadata(update) {
        try {
            const cachePath = await this.cachePath;
            const metadataPath = path.join(cachePath, 'update-metadata.json');
            await pfs.Promises.writeFile(metadataPath, JSON.stringify(update));
        }
        catch (e) {
            this.logService.error('update#saveUpdateMetadata: failed to save', e);
        }
    }
    async loadUpdateMetadata() {
        try {
            const cachePath = await this.cachePath;
            const metadataPath = path.join(cachePath, 'update-metadata.json');
            if (await pfs.Promises.exists(metadataPath)) {
                const content = await readFile(metadataPath, 'utf8');
                return JSON.parse(content);
            }
        }
        catch (e) {
            this.logService.error('update#loadUpdateMetadata: failed to load', e);
        }
        return undefined;
    }
    getUpdateType() {
        return getUpdateType();
    }
    async _applySpecificUpdate(packagePath) {
        if (this.state.type !== "idle" /* StateType.Idle */) {
            return;
        }
        const fastUpdatesEnabled = this.configurationService.getValue('update.enableWindowsBackgroundUpdates');
        const update = await this.loadUpdateMetadata() ?? { version: 'unknown', productVersion: 'unknown' };
        this.setState(State.Downloading(update, true, false));
        this.availableUpdate = { packagePath };
        this.setState(State.Downloaded(update, true, false));
        if (fastUpdatesEnabled && this.productService.target === 'user') {
            this.doApplyUpdate();
        }
        else {
            this.setState(State.Ready(update, true, false));
        }
    }
    async unlink(path) {
        if (path) {
            try {
                await unlink(path);
            }
            catch (err) {
                const error = err;
                if (error && error.code === 'ENOENT') {
                    return;
                }
                else {
                    this.logService.warn(`update#unlink: failed to unlink ${basename(path)}`, err);
                }
            }
        }
    }
};
__decorate([
    memoize
], Win32UpdateService.prototype, "cachePath", null);
Win32UpdateService = __decorate([
    __param(0, ILifecycleMainService),
    __param(1, IConfigurationService),
    __param(2, ITelemetryService),
    __param(3, IEnvironmentMainService),
    __param(4, IRequestService),
    __param(5, ILogService),
    __param(6, IFileService),
    __param(7, INativeHostMainService),
    __param(8, IProductService),
    __param(9, IMeteredConnectionService)
], Win32UpdateService);
export { Win32UpdateService };
//# sourceMappingURL=updateService.win32.js.map