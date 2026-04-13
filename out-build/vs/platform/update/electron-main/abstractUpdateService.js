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
import * as os from 'os';
import { IntervalTimer, timeout } from '../../../base/common/async.js';
import { CancellationToken, CancellationTokenSource } from '../../../base/common/cancellation.js';
import { Emitter } from '../../../base/common/event.js';
import { isMacintosh, isWindows } from '../../../base/common/platform.js';
import { getWindowsReleaseSync } from '../../../base/node/windowsVersion.js';
import { IMeteredConnectionService } from '../../meteredConnection/common/meteredConnection.js';
import { IConfigurationService } from '../../configuration/common/configuration.js';
import { IEnvironmentMainService } from '../../environment/electron-main/environmentMainService.js';
import { ILifecycleMainService } from '../../lifecycle/electron-main/lifecycleMainService.js';
import { ILogService } from '../../log/common/log.js';
import { IProductService } from '../../product/common/productService.js';
import { IRequestService } from '../../request/common/request.js';
import { State } from '../common/update.js';
export function createUpdateURL(baseUpdateUrl, platform, quality, commit, options) {
    const url = new URL(`${baseUpdateUrl}/api/update/${platform}/${quality}/${commit}`);
    if (options?.background) {
        url.searchParams.set('bg', 'true');
    }
    url.searchParams.set('u', options?.internalOrg ?? 'none');
    return url.toString();
}
/**
 * Builds common headers for update requests, including those issued
 * via Electron's auto-updater (e.g. setFeedURL({ url, headers })) and
 * manual HTTP requests that bypass the auto-updater. The headers include
 * OS version information which the update server uses for EOL detection.
 *
 * On macOS, the User-Agent includes the Darwin kernel version.
 * On Windows, the User-Agent includes accurate Windows version from the registry.
 */
export function getUpdateRequestHeaders(productVersion) {
    if (isMacintosh) {
        const darwinVersion = os.release();
        return {
            'User-Agent': `Code/${productVersion} Darwin/${darwinVersion}`
        };
    }
    if (isWindows) {
        const match = getWindowsReleaseSync().match(/^(\d+\.\d+)/);
        if (match) {
            return {
                'User-Agent': `Code/${productVersion} Electron/${process.versions.electron} Windows NT ${match[1]}`
            };
        }
    }
    return undefined;
}
let AbstractUpdateService = class AbstractUpdateService {
    get state() {
        return this._state;
    }
    setState(state) {
        this.logService.info('update#setState', state.type);
        this._state = state;
        this._onStateChange.fire(state);
        // Clear transient one-time properties from Idle state after delivering the event.
        // This prevents new windows from seeing stale error/notAvailable messages.
        if (state.type === "idle" /* StateType.Idle */ && (state.error || state.notAvailable)) {
            this._state = State.Idle(state.updateType);
        }
        // Schedule 5-minute checks when in Ready state and overwrite is supported
        if (this.supportsUpdateOverwrite) {
            if (state.type === "ready" /* StateType.Ready */) {
                this.overwriteUpdatesCheckInterval.cancelAndSet(() => this.checkForOverwriteUpdates(), 5 * 60 * 1000);
            }
            else {
                this.overwriteUpdatesCheckInterval.cancel();
            }
        }
    }
    constructor(lifecycleMainService, configurationService, environmentMainService, requestService, logService, productService, meteredConnectionService, supportsUpdateOverwrite) {
        this.lifecycleMainService = lifecycleMainService;
        this.configurationService = configurationService;
        this.environmentMainService = environmentMainService;
        this.requestService = requestService;
        this.logService = logService;
        this.productService = productService;
        this.meteredConnectionService = meteredConnectionService;
        this.supportsUpdateOverwrite = supportsUpdateOverwrite;
        this._state = State.Uninitialized;
        this._overwrite = false;
        this._hasCheckedForOverwriteOnQuit = false;
        this.overwriteUpdatesCheckInterval = new IntervalTimer();
        this._internalOrg = undefined;
        this._onStateChange = new Emitter();
        this.onStateChange = this._onStateChange.event;
        lifecycleMainService.when(3 /* LifecycleMainPhase.AfterWindowOpen */)
            .finally(() => this.initialize());
    }
    /**
     * This must be called before any other call. This is a performance
     * optimization, to avoid using extra CPU cycles before first window open.
     * https://github.com/microsoft/vscode/issues/89784
     */
    async initialize() {
        if (!this.environmentMainService.isBuilt) {
            this.setState(State.Disabled(0 /* DisablementReason.NotBuilt */));
            return; // updates are never enabled when running out of sources
        }
        if (this.environmentMainService.disableUpdates) {
            this.setState(State.Disabled(1 /* DisablementReason.DisabledByEnvironment */));
            this.logService.info('update#ctor - updates are disabled by the environment');
            return;
        }
        if (!this.productService.updateUrl || !this.productService.commit) {
            this.setState(State.Disabled(4 /* DisablementReason.MissingConfiguration */));
            this.logService.info('update#ctor - updates are disabled as there is no update URL');
            return;
        }
        const updateMode = this.configurationService.getValue('update.mode');
        const updateModeInspection = this.configurationService.inspect('update.mode');
        const policyDisablesUpdates = updateModeInspection.policyValue !== undefined && !this.getProductQuality(updateModeInspection.policyValue);
        const quality = this.getProductQuality(updateMode);
        if (!quality) {
            if (policyDisablesUpdates) {
                this.setState(State.Disabled(3 /* DisablementReason.Policy */));
                this.logService.info('update#ctor - updates are disabled by policy');
            }
            else {
                this.setState(State.Disabled(2 /* DisablementReason.ManuallyDisabled */));
                this.logService.info('update#ctor - updates are disabled by user preference');
            }
            return;
        }
        if (!this.buildUpdateFeedUrl(quality, this.productService.commit)) {
            this.setState(State.Disabled(5 /* DisablementReason.InvalidConfiguration */));
            this.logService.info('update#ctor - updates are disabled as the update URL is badly formed');
            return;
        }
        this.quality = quality;
        this.setState(State.Idle(this.getUpdateType()));
        await this.postInitialize();
        if (updateMode === 'manual') {
            this.logService.info('update#ctor - manual checks only; automatic updates are disabled by user preference');
            return;
        }
        if (updateMode === 'start') {
            this.logService.info('update#ctor - startup checks only; automatic updates are disabled by user preference');
            // Check for updates only once after 30 seconds
            setTimeout(() => this.checkForUpdates(false), 30 * 1000);
        }
        else {
            // Start checking for updates after 30 seconds
            this.scheduleCheckForUpdates(30 * 1000).then(undefined, err => this.logService.error(err));
        }
    }
    getProductQuality(updateMode) {
        return updateMode === 'none' ? undefined : this.productService.quality;
    }
    scheduleCheckForUpdates(delay = 60 * 60 * 1000) {
        return timeout(delay)
            .then(() => this.checkForUpdates(false))
            .then(() => {
            // Check again after 1 hour
            return this.scheduleCheckForUpdates(60 * 60 * 1000);
        });
    }
    async checkForUpdates(explicit) {
        this.logService.trace('update#checkForUpdates, state = ', this.state.type);
        if (this.state.type !== "idle" /* StateType.Idle */) {
            return;
        }
        this.doCheckForUpdates(explicit);
    }
    async downloadUpdate(explicit) {
        this.logService.trace('update#downloadUpdate, state = ', this.state.type);
        if (this.state.type !== "available for download" /* StateType.AvailableForDownload */) {
            return;
        }
        if (!explicit && this.meteredConnectionService.isConnectionMetered) {
            this.logService.info('update#downloadUpdate - skipping download because connection is metered');
            return;
        }
        await this.doDownloadUpdate(this.state);
    }
    async doDownloadUpdate(state) {
        // noop
    }
    async applyUpdate() {
        this.logService.trace('update#applyUpdate, state = ', this.state.type);
        if (this.state.type !== "downloaded" /* StateType.Downloaded */) {
            return;
        }
        await this.doApplyUpdate();
    }
    async doApplyUpdate() {
        // noop
    }
    async quitAndInstall() {
        this.logService.trace('update#quitAndInstall, state = ', this.state.type);
        if (this.state.type !== "ready" /* StateType.Ready */) {
            return undefined;
        }
        if (this.supportsUpdateOverwrite && !this._hasCheckedForOverwriteOnQuit) {
            this._hasCheckedForOverwriteOnQuit = true;
            const didOverwrite = await this.checkForOverwriteUpdates(true);
            if (didOverwrite) {
                this.logService.info('update#quitAndInstall(): overwrite update detected, postponing quitAndInstall');
                return;
            }
        }
        this.logService.trace('update#quitAndInstall(): before lifecycle quit()');
        this.lifecycleMainService.quit(true /* will restart */).then(vetod => {
            this.logService.trace(`update#quitAndInstall(): after lifecycle quit() with veto: ${vetod}`);
            if (vetod) {
                return;
            }
            this.logService.trace('update#quitAndInstall(): running raw#quitAndInstall()');
            this.doQuitAndInstall();
        });
        return Promise.resolve(undefined);
    }
    async checkForOverwriteUpdates(explicit = false) {
        if (this._state.type !== "ready" /* StateType.Ready */) {
            return false;
        }
        const pendingUpdateCommit = this._state.update.version;
        let isLatest;
        try {
            const cts = new CancellationTokenSource();
            const timeoutPromise = timeout(2000).then(() => { cts.cancel(); return undefined; });
            isLatest = await Promise.race([this.isLatestVersion(pendingUpdateCommit, cts.token), timeoutPromise]);
            cts.dispose();
        }
        catch (error) {
            this.logService.warn('update#checkForOverwriteUpdates(): failed to check for updates, proceeding with restart');
            this.logService.warn(error);
            return false;
        }
        if (isLatest === false && this._state.type === "ready" /* StateType.Ready */) {
            this.logService.info('update#readyStateCheck: newer update available, restarting update machinery');
            try {
                await this.cancelPendingUpdate();
            }
            catch (error) {
                this.logService.error('update#checkForOverwriteUpdates(): failed to cancel pending update, aborting overwrite');
                this.logService.error(error);
                return false;
            }
            this._overwrite = true;
            this.setState(State.Overwriting(this._state.update, explicit));
            this.doCheckForUpdates(explicit, pendingUpdateCommit);
            return true;
        }
        return false;
    }
    async isLatestVersion(commit, token = CancellationToken.None) {
        if (!this.quality) {
            return undefined;
        }
        const mode = this.configurationService.getValue('update.mode');
        if (mode === 'none') {
            return undefined;
        }
        const url = this.buildUpdateFeedUrl(this.quality, commit ?? this.productService.commit, { internalOrg: this.getInternalOrg() });
        if (!url) {
            return undefined;
        }
        const headers = getUpdateRequestHeaders(this.productService.version);
        this.logService.trace('update#isLatestVersion() - checking update server', { url, headers });
        try {
            const context = await this.requestService.request({ url, headers, callSite: 'updateService.isLatestVersion' }, token);
            const statusCode = context.res.statusCode;
            this.logService.trace('update#isLatestVersion() - response', { statusCode });
            // The update server replies with 204 (No Content) when no
            // update is available - that's all we want to know.
            return statusCode === 204;
        }
        catch (error) {
            this.logService.error('update#isLatestVersion(): failed to check for updates');
            this.logService.error(error);
            return undefined;
        }
    }
    async _applySpecificUpdate(packagePath) {
        // noop
    }
    async setInternalOrg(internalOrg) {
        if (this._internalOrg === internalOrg) {
            return;
        }
        this.logService.info('update#setInternalOrg', internalOrg);
        this._internalOrg = internalOrg;
    }
    getInternalOrg() {
        return this._internalOrg;
    }
    getUpdateType() {
        return 1 /* UpdateType.Archive */;
    }
    doQuitAndInstall() {
        // noop
    }
    async postInitialize() {
        // noop
    }
    async cancelPendingUpdate() {
        // noop
    }
};
AbstractUpdateService = __decorate([
    __param(0, ILifecycleMainService),
    __param(1, IConfigurationService),
    __param(2, IEnvironmentMainService),
    __param(3, IRequestService),
    __param(4, ILogService),
    __param(5, IProductService),
    __param(6, IMeteredConnectionService)
], AbstractUpdateService);
export { AbstractUpdateService };
//# sourceMappingURL=abstractUpdateService.js.map