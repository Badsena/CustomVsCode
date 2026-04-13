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
var ProductContribution_1, DefaultAccountUpdateContribution_1;
import * as nls from '../../../../nls.js';
import severity from '../../../../base/common/severity.js';
import { Disposable, MutableDisposable } from '../../../../base/common/lifecycle.js';
import { URI } from '../../../../base/common/uri.js';
import { IActivityService, NumberBadge, ProgressBadge } from '../../../services/activity/common/activity.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { IOpenerService } from '../../../../platform/opener/common/opener.js';
import { IStorageService } from '../../../../platform/storage/common/storage.js';
import { IUpdateService } from '../../../../platform/update/common/update.js';
import { INotificationService, NotificationPriority, Severity } from '../../../../platform/notification/common/notification.js';
import { IDialogService } from '../../../../platform/dialogs/common/dialogs.js';
import { IBrowserWorkbenchEnvironmentService } from '../../../services/environment/browser/environmentService.js';
import { ReleaseNotesManager } from './releaseNotesEditor.js';
import { isMacintosh, isWeb, isWindows } from '../../../../base/common/platform.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { RawContextKey, IContextKeyService, ContextKeyExpr } from '../../../../platform/contextkey/common/contextkey.js';
import { MenuRegistry, MenuId, registerAction2, Action2 } from '../../../../platform/actions/common/actions.js';
import { CommandsRegistry } from '../../../../platform/commands/common/commands.js';
import { IHostService } from '../../../services/host/browser/host.js';
import { IProductService } from '../../../../platform/product/common/productService.js';
import { IUserDataSyncEnablementService, IUserDataSyncService, IUserDataSyncStoreManagementService } from '../../../../platform/userDataSync/common/userDataSync.js';
import { IsWebContext } from '../../../../platform/contextkey/common/contextkeys.js';
import { Promises, Throttler } from '../../../../base/common/async.js';
import { IUserDataSyncWorkbenchService } from '../../../services/userDataSync/common/userDataSync.js';
import { Event } from '../../../../base/common/event.js';
import { toAction } from '../../../../base/common/actions.js';
import { IDefaultAccountService } from '../../../../platform/defaultAccount/common/defaultAccount.js';
import { getInternalOrg } from '../../../../platform/assignment/common/assignment.js';
import { preprocessError, tryParseVersion } from '../common/updateUtils.js';
import { IWorkbenchLayoutService } from '../../../services/layout/browser/layoutService.js';
import { mainWindow } from '../../../../base/browser/window.js';
export const CONTEXT_UPDATE_STATE = new RawContextKey('updateState', "uninitialized" /* StateType.Uninitialized */);
export const MAJOR_MINOR_UPDATE_AVAILABLE = new RawContextKey('majorMinorUpdateAvailable', false);
let releaseNotesManager = undefined;
export function showReleaseNotesInEditor(instantiationService, version, useCurrentFile) {
    if (!releaseNotesManager) {
        releaseNotesManager = instantiationService.createInstance(ReleaseNotesManager);
    }
    return releaseNotesManager.show(version, useCurrentFile);
}
async function openLatestReleaseNotesInBrowser(accessor) {
    const openerService = accessor.get(IOpenerService);
    const productService = accessor.get(IProductService);
    if (productService.releaseNotesUrl) {
        const uri = URI.parse(productService.releaseNotesUrl);
        await openerService.open(uri);
    }
    else {
        throw new Error(nls.localize(16855, null, productService.nameLong));
    }
}
async function showReleaseNotes(accessor, version) {
    const instantiationService = accessor.get(IInstantiationService);
    try {
        await showReleaseNotesInEditor(instantiationService, version, false);
    }
    catch (err) {
        try {
            await instantiationService.invokeFunction(openLatestReleaseNotesInBrowser);
        }
        catch (err2) {
            throw new Error(`${err.message} and ${err2.message}`);
        }
    }
}
/**
 * Appends update-related menu items to the given menu. This registers menu items
 * for all update states (idle, checking, downloading, etc.) that show the current
 * update status. The underlying commands (`update.check`, `update.restart`, etc.)
 * must be registered separately.
 */
export function appendUpdateMenuItems(menuId, group) {
    MenuRegistry.appendMenuItem(menuId, {
        group,
        command: {
            id: 'update.check',
            title: nls.localize(16856, null)
        },
        when: CONTEXT_UPDATE_STATE.isEqualTo("idle" /* StateType.Idle */)
    });
    MenuRegistry.appendMenuItem(menuId, {
        group,
        command: {
            id: 'update.checking',
            title: nls.localize(16857, null),
            precondition: ContextKeyExpr.false()
        },
        when: CONTEXT_UPDATE_STATE.isEqualTo("checking for updates" /* StateType.CheckingForUpdates */)
    });
    MenuRegistry.appendMenuItem(menuId, {
        group,
        command: {
            id: 'update.downloadNow',
            title: nls.localize(16858, null)
        },
        when: CONTEXT_UPDATE_STATE.isEqualTo("available for download" /* StateType.AvailableForDownload */)
    });
    MenuRegistry.appendMenuItem(menuId, {
        group,
        command: {
            id: 'update.downloading',
            title: nls.localize(16859, null),
            precondition: ContextKeyExpr.false()
        },
        when: CONTEXT_UPDATE_STATE.isEqualTo("downloading" /* StateType.Downloading */)
    });
    MenuRegistry.appendMenuItem(menuId, {
        group,
        command: {
            id: 'update.install',
            title: nls.localize(16860, null)
        },
        when: CONTEXT_UPDATE_STATE.isEqualTo("downloaded" /* StateType.Downloaded */)
    });
    MenuRegistry.appendMenuItem(menuId, {
        group,
        command: {
            id: 'update.updating',
            title: nls.localize(16861, null),
            precondition: ContextKeyExpr.false()
        },
        when: CONTEXT_UPDATE_STATE.isEqualTo("updating" /* StateType.Updating */)
    });
    MenuRegistry.appendMenuItem(menuId, {
        group,
        order: 2,
        command: {
            id: 'update.restart',
            title: nls.localize(16862, null)
        },
        when: CONTEXT_UPDATE_STATE.isEqualTo("ready" /* StateType.Ready */)
    });
}
function isMajorMinorUpdate(before, after) {
    return before.major < after.major || before.minor < after.minor;
}
let ProductContribution = class ProductContribution {
    static { ProductContribution_1 = this; }
    static { this.KEY = 'releaseNotes/lastVersion'; }
    constructor(storageService, instantiationService, notificationService, environmentService, openerService, configurationService, hostService, productService) {
        if (isWeb) {
            return;
        }
        hostService.hadLastFocus().then(async (hadLastFocus) => {
            if (!hadLastFocus) {
                return;
            }
            if (configurationService.getValue('update.titleBar') !== 'none') {
                return;
            }
            const lastVersion = tryParseVersion(storageService.get(ProductContribution_1.KEY, -1 /* StorageScope.APPLICATION */, ''));
            const currentVersion = tryParseVersion(productService.version);
            const shouldShowReleaseNotes = configurationService.getValue('update.showReleaseNotes');
            const releaseNotesUrl = productService.releaseNotesUrl;
            // was there a major/minor update? if so, open release notes
            if (shouldShowReleaseNotes && !environmentService.skipReleaseNotes && releaseNotesUrl && lastVersion && currentVersion && isMajorMinorUpdate(lastVersion, currentVersion)) {
                showReleaseNotesInEditor(instantiationService, productService.version, false)
                    .then(undefined, () => {
                    notificationService.prompt(severity.Info, nls.localize(16863, null, productService.nameLong, productService.version), [{
                            label: nls.localize(16864, null),
                            run: () => {
                                const uri = URI.parse(releaseNotesUrl);
                                openerService.open(uri);
                            }
                        }], { priority: NotificationPriority.OPTIONAL });
                });
            }
            storageService.store(ProductContribution_1.KEY, productService.version, -1 /* StorageScope.APPLICATION */, 1 /* StorageTarget.MACHINE */);
        });
    }
};
ProductContribution = ProductContribution_1 = __decorate([
    __param(0, IStorageService),
    __param(1, IInstantiationService),
    __param(2, INotificationService),
    __param(3, IBrowserWorkbenchEnvironmentService),
    __param(4, IOpenerService),
    __param(5, IConfigurationService),
    __param(6, IHostService),
    __param(7, IProductService)
], ProductContribution);
export { ProductContribution };
let UpdateContribution = class UpdateContribution extends Disposable {
    constructor(storageService, instantiationService, notificationService, dialogService, updateService, activityService, contextKeyService, productService, openerService, configurationService, hostService, layoutService) {
        super();
        this.storageService = storageService;
        this.instantiationService = instantiationService;
        this.notificationService = notificationService;
        this.dialogService = dialogService;
        this.updateService = updateService;
        this.activityService = activityService;
        this.contextKeyService = contextKeyService;
        this.productService = productService;
        this.openerService = openerService;
        this.configurationService = configurationService;
        this.hostService = hostService;
        this.layoutService = layoutService;
        this.badgeDisposable = this._register(new MutableDisposable());
        this.state = updateService.state;
        this.updateStateContextKey = CONTEXT_UPDATE_STATE.bindTo(this.contextKeyService);
        this.majorMinorUpdateAvailableContextKey = MAJOR_MINOR_UPDATE_AVAILABLE.bindTo(this.contextKeyService);
        this.titleBarEnabled = this.isTitleBarEnabled();
        this._register(updateService.onStateChange(this.onUpdateStateChange, this));
        this.onUpdateStateChange(this.updateService.state);
        /*
        The `update/lastKnownVersion` and `update/updateNotificationTime` storage keys are used in
        combination to figure out when to show a message to the user that he should update.

        This message should appear if the user has received an update notification but hasn't
        updated since 5 days.
        */
        const currentVersion = this.productService.commit;
        const lastKnownVersion = this.storageService.get('update/lastKnownVersion', -1 /* StorageScope.APPLICATION */);
        // if current version != stored version, clear both fields
        if (currentVersion !== lastKnownVersion) {
            this.storageService.remove('update/lastKnownVersion', -1 /* StorageScope.APPLICATION */);
            this.storageService.remove('update/updateNotificationTime', -1 /* StorageScope.APPLICATION */);
        }
        this._register(this.configurationService.onDidChangeConfiguration(e => {
            if (e.affectsConfiguration('update.titleBar')) {
                this.titleBarEnabled = this.isTitleBarEnabled();
                this.onUpdateStateChange(this.updateService.state);
            }
        }));
        this._register(this.layoutService.onDidChangePartVisibility(e => {
            if (e.partId === "workbench.parts.titlebar" /* Parts.TITLEBAR_PART */) {
                this.titleBarEnabled = this.isTitleBarEnabled();
                this.onUpdateStateChange(this.updateService.state);
            }
        }));
        this.registerGlobalActivityActions();
    }
    isTitleBarEnabled() {
        return this.configurationService.getValue('update.titleBar') !== 'none'
            && this.layoutService.isVisible("workbench.parts.titlebar" /* Parts.TITLEBAR_PART */, mainWindow);
    }
    async onUpdateStateChange(state) {
        this.updateStateContextKey.set(state.type);
        switch (state.type) {
            case "disabled" /* StateType.Disabled */:
                if (!this.titleBarEnabled && state.reason === 6 /* DisablementReason.RunningAsAdmin */) {
                    this.notificationService.notify({
                        severity: Severity.Info,
                        message: nls.localize(16865, null, this.productService.nameLong),
                        actions: {
                            primary: [
                                toAction({
                                    id: '',
                                    label: nls.localize(16866, null),
                                    run: () => this.openerService.open('https://aka.ms/vscode-windows-setup')
                                })
                            ]
                        },
                        neverShowAgain: { id: 'no-updates-running-as-admin', }
                    });
                }
                break;
            case "idle" /* StateType.Idle */:
                if (state.error) {
                    this.onError(state.error);
                }
                else if (this.state.type === "checking for updates" /* StateType.CheckingForUpdates */ && this.state.explicit && await this.hostService.hadLastFocus()) {
                    this.onUpdateNotAvailable();
                }
                break;
            case "available for download" /* StateType.AvailableForDownload */:
                this.onUpdateAvailable(state.update);
                break;
            case "downloaded" /* StateType.Downloaded */:
                this.onUpdateDownloaded(state.update);
                break;
            case "overwriting" /* StateType.Overwriting */:
                this.onUpdateOverwriting(state);
                break;
            case "ready" /* StateType.Ready */: {
                const productVersion = state.update.productVersion;
                if (productVersion) {
                    const currentVersion = tryParseVersion(this.productService.version);
                    const nextVersion = tryParseVersion(productVersion);
                    this.majorMinorUpdateAvailableContextKey.set(Boolean(currentVersion && nextVersion && isMajorMinorUpdate(currentVersion, nextVersion)));
                }
                this.onUpdateReady(state);
                break;
            }
        }
        let badge = undefined;
        if (!this.titleBarEnabled) {
            if (state.type === "available for download" /* StateType.AvailableForDownload */ || state.type === "downloaded" /* StateType.Downloaded */ || state.type === "ready" /* StateType.Ready */) {
                badge = new NumberBadge(1, () => nls.localize(16867, null, this.productService.nameShort));
            }
            else if (state.type === "checking for updates" /* StateType.CheckingForUpdates */) {
                badge = new ProgressBadge(() => nls.localize(16868, null, this.productService.nameShort));
            }
            else if (state.type === "downloading" /* StateType.Downloading */ || state.type === "overwriting" /* StateType.Overwriting */) {
                badge = new ProgressBadge(() => nls.localize(16869, null, this.productService.nameShort));
            }
            else if (state.type === "updating" /* StateType.Updating */) {
                badge = new ProgressBadge(() => nls.localize(16870, null, this.productService.nameShort));
            }
        }
        this.badgeDisposable.clear();
        if (badge) {
            this.badgeDisposable.value = this.activityService.showGlobalActivity({ badge });
        }
        this.state = state;
    }
    onError(error) {
        if (this.titleBarEnabled) {
            return;
        }
        const processedError = preprocessError(error);
        if (processedError) {
            this.notificationService.notify({
                severity: Severity.Error,
                message: processedError,
                source: nls.localize(16871, null),
            });
        }
    }
    onUpdateNotAvailable() {
        if (this.titleBarEnabled) {
            return;
        }
        this.dialogService.info(nls.localize(16872, null));
    }
    // linux
    onUpdateAvailable(update) {
        if (this.titleBarEnabled) {
            return;
        }
        if (!this.shouldShowNotification()) {
            return;
        }
        const productVersion = update.productVersion;
        if (!productVersion) {
            return;
        }
        this.notificationService.prompt(severity.Info, nls.localize(16873, null), [{
                label: nls.localize(16874, null),
                run: () => this.updateService.downloadUpdate(true)
            }, {
                label: nls.localize(16875, null),
                run: () => { }
            }, {
                label: nls.localize(16876, null),
                run: () => {
                    this.instantiationService.invokeFunction(accessor => showReleaseNotes(accessor, productVersion));
                }
            }], { priority: NotificationPriority.OPTIONAL });
    }
    // windows fast updates
    onUpdateDownloaded(update) {
        if (this.titleBarEnabled) {
            return;
        }
        if (isMacintosh) {
            return;
        }
        if (this.configurationService.getValue('update.enableWindowsBackgroundUpdates') && this.productService.target === 'user') {
            return;
        }
        if (!this.shouldShowNotification()) {
            return;
        }
        const productVersion = update.productVersion;
        if (!productVersion) {
            return;
        }
        this.notificationService.prompt(severity.Info, nls.localize(16877, null, this.productService.nameLong, productVersion), [{
                label: nls.localize(16878, null),
                run: () => this.updateService.applyUpdate()
            }, {
                label: nls.localize(16879, null),
                run: () => { }
            }, {
                label: nls.localize(16880, null),
                run: () => {
                    this.instantiationService.invokeFunction(accessor => showReleaseNotes(accessor, productVersion));
                }
            }], { priority: NotificationPriority.OPTIONAL });
    }
    // windows and mac
    onUpdateReady(state) {
        if (this.titleBarEnabled) {
            this.overwriteNotificationHandle?.progress.done();
            this.overwriteNotificationHandle = undefined;
            return;
        }
        if (state.overwrite && this.overwriteNotificationHandle) {
            const handle = this.overwriteNotificationHandle;
            this.overwriteNotificationHandle = undefined;
            // Update notification to show completion with restart action
            handle.progress.done();
            handle.updateMessage(nls.localize(16881, null));
            handle.updateActions({
                primary: [
                    toAction({
                        id: 'update.restartToUpdate',
                        label: nls.localize(16882, null),
                        run: () => this.updateService.quitAndInstall()
                    })
                ]
            });
        }
        else {
            // Dismiss stale overwrite notification if the overwrite resolved without finding a newer update.
            if (this.overwriteNotificationHandle) {
                this.overwriteNotificationHandle.close();
                this.overwriteNotificationHandle = undefined;
            }
            if ((isWindows && this.productService.target !== 'user') || this.shouldShowNotification()) {
                const actions = [{
                        label: nls.localize(16883, null),
                        run: () => this.updateService.quitAndInstall()
                    }, {
                        label: nls.localize(16884, null),
                        run: () => { }
                    }];
                const productVersion = state.update.productVersion;
                if (productVersion) {
                    actions.push({
                        label: nls.localize(16885, null),
                        run: () => {
                            this.instantiationService.invokeFunction(accessor => showReleaseNotes(accessor, productVersion));
                        }
                    });
                }
                // windows user fast updates and mac
                this.notificationService.prompt(severity.Info, nls.localize(16886, null, this.productService.nameLong), actions, {
                    sticky: true,
                    priority: NotificationPriority.OPTIONAL
                });
            }
        }
    }
    // macOS overwrite update - overwriting
    onUpdateOverwriting(state) {
        if (this.titleBarEnabled) {
            return;
        }
        if (!state.explicit) {
            return;
        }
        // Show notification with progress
        this.overwriteNotificationHandle = this.notificationService.notify({
            severity: Severity.Info,
            sticky: true,
            message: nls.localize(16887, null),
            source: nls.localize(16888, null),
        });
        this.overwriteNotificationHandle.progress.infinite();
    }
    shouldShowNotification() {
        const currentVersion = this.productService.commit;
        const currentMillis = new Date().getTime();
        const lastKnownVersion = this.storageService.get('update/lastKnownVersion', -1 /* StorageScope.APPLICATION */);
        // if version != stored version, save version and date
        if (currentVersion !== lastKnownVersion) {
            this.storageService.store('update/lastKnownVersion', currentVersion, -1 /* StorageScope.APPLICATION */, 1 /* StorageTarget.MACHINE */);
            this.storageService.store('update/updateNotificationTime', currentMillis, -1 /* StorageScope.APPLICATION */, 1 /* StorageTarget.MACHINE */);
        }
        const updateNotificationMillis = this.storageService.getNumber('update/updateNotificationTime', -1 /* StorageScope.APPLICATION */, currentMillis);
        const diffDays = (currentMillis - updateNotificationMillis) / (1000 * 60 * 60 * 24);
        return diffDays > 5;
    }
    registerGlobalActivityActions() {
        CommandsRegistry.registerCommand('update.check', () => this.updateService.checkForUpdates(true));
        CommandsRegistry.registerCommand('update.checking', () => { });
        CommandsRegistry.registerCommand('update.downloadNow', () => this.updateService.downloadUpdate(true));
        CommandsRegistry.registerCommand('update.downloading', () => { });
        CommandsRegistry.registerCommand('update.install', () => this.updateService.applyUpdate());
        CommandsRegistry.registerCommand('update.updating', () => { });
        CommandsRegistry.registerCommand('update.restart', () => this.updateService.quitAndInstall());
        CommandsRegistry.registerCommand('_update.state', () => {
            return this.state;
        });
        appendUpdateMenuItems(MenuId.GlobalActivity, '7_update');
        if (this.productService.quality === 'stable') {
            CommandsRegistry.registerCommand('update.showUpdateReleaseNotes', () => {
                if (this.updateService.state.type !== "ready" /* StateType.Ready */) {
                    return;
                }
                const productVersion = this.updateService.state.update.productVersion;
                if (productVersion) {
                    this.instantiationService.invokeFunction(accessor => showReleaseNotes(accessor, productVersion));
                }
            });
            MenuRegistry.appendMenuItem(MenuId.GlobalActivity, {
                group: '7_update',
                order: 1,
                command: {
                    id: 'update.showUpdateReleaseNotes',
                    title: nls.localize(16889, null)
                },
                when: ContextKeyExpr.and(CONTEXT_UPDATE_STATE.isEqualTo("ready" /* StateType.Ready */), MAJOR_MINOR_UPDATE_AVAILABLE)
            });
        }
    }
};
UpdateContribution = __decorate([
    __param(0, IStorageService),
    __param(1, IInstantiationService),
    __param(2, INotificationService),
    __param(3, IDialogService),
    __param(4, IUpdateService),
    __param(5, IActivityService),
    __param(6, IContextKeyService),
    __param(7, IProductService),
    __param(8, IOpenerService),
    __param(9, IConfigurationService),
    __param(10, IHostService),
    __param(11, IWorkbenchLayoutService)
], UpdateContribution);
export { UpdateContribution };
let SwitchProductQualityContribution = class SwitchProductQualityContribution extends Disposable {
    constructor(productService, environmentService) {
        super();
        this.productService = productService;
        this.environmentService = environmentService;
        this.registerGlobalActivityActions();
    }
    registerGlobalActivityActions() {
        const quality = this.productService.quality;
        const productQualityChangeHandler = this.environmentService.options?.productQualityChangeHandler;
        if (productQualityChangeHandler && (quality === 'stable' || quality === 'insider')) {
            const newQuality = quality === 'stable' ? 'insider' : 'stable';
            const commandId = `update.switchQuality.${newQuality}`;
            const isSwitchingToInsiders = newQuality === 'insider';
            this._register(registerAction2(class SwitchQuality extends Action2 {
                constructor() {
                    super({
                        id: commandId,
                        title: isSwitchingToInsiders ? nls.localize(16890, null) : nls.localize(16891, null),
                        precondition: IsWebContext,
                        menu: {
                            id: MenuId.GlobalActivity,
                            when: IsWebContext,
                            group: '7_update',
                        }
                    });
                }
                async run(accessor) {
                    const dialogService = accessor.get(IDialogService);
                    const userDataSyncEnablementService = accessor.get(IUserDataSyncEnablementService);
                    const userDataSyncStoreManagementService = accessor.get(IUserDataSyncStoreManagementService);
                    const storageService = accessor.get(IStorageService);
                    const userDataSyncWorkbenchService = accessor.get(IUserDataSyncWorkbenchService);
                    const userDataSyncService = accessor.get(IUserDataSyncService);
                    const notificationService = accessor.get(INotificationService);
                    try {
                        const selectSettingsSyncServiceDialogShownKey = 'switchQuality.selectSettingsSyncServiceDialogShown';
                        const userDataSyncStore = userDataSyncStoreManagementService.userDataSyncStore;
                        let userDataSyncStoreType;
                        if (userDataSyncStore && isSwitchingToInsiders && userDataSyncEnablementService.isEnabled()
                            && !storageService.getBoolean(selectSettingsSyncServiceDialogShownKey, -1 /* StorageScope.APPLICATION */, false)) {
                            userDataSyncStoreType = await this.selectSettingsSyncService(dialogService);
                            if (!userDataSyncStoreType) {
                                return;
                            }
                            storageService.store(selectSettingsSyncServiceDialogShownKey, true, -1 /* StorageScope.APPLICATION */, 0 /* StorageTarget.USER */);
                            if (userDataSyncStoreType === 'stable') {
                                // Update the stable service type in the current window, so that it uses stable service after switched to insiders version (after reload).
                                await userDataSyncStoreManagementService.switch(userDataSyncStoreType);
                            }
                        }
                        const res = await dialogService.confirm({
                            type: 'info',
                            message: nls.localize(16892, null),
                            detail: newQuality === 'insider' ?
                                nls.localize(16893, null) :
                                nls.localize(16894, null),
                            primaryButton: nls.localize(16895, null)
                        });
                        if (res.confirmed) {
                            const promises = [];
                            // If sync is happening wait until it is finished before reload
                            if (userDataSyncService.status === "syncing" /* SyncStatus.Syncing */) {
                                promises.push(Event.toPromise(Event.filter(userDataSyncService.onDidChangeStatus, status => status !== "syncing" /* SyncStatus.Syncing */)));
                            }
                            // If user chose the sync service then synchronise the store type option in insiders service, so that other clients using insiders service are also updated.
                            if (isSwitchingToInsiders && userDataSyncStoreType) {
                                promises.push(userDataSyncWorkbenchService.synchroniseUserDataSyncStoreType());
                            }
                            await Promises.settled(promises);
                            productQualityChangeHandler(newQuality);
                        }
                        else {
                            // Reset
                            if (userDataSyncStoreType) {
                                storageService.remove(selectSettingsSyncServiceDialogShownKey, -1 /* StorageScope.APPLICATION */);
                            }
                        }
                    }
                    catch (error) {
                        notificationService.error(error);
                    }
                }
                async selectSettingsSyncService(dialogService) {
                    const { result } = await dialogService.prompt({
                        type: Severity.Info,
                        message: nls.localize(16896, null),
                        detail: nls.localize(16897, null),
                        buttons: [
                            {
                                label: nls.localize(16898, null),
                                run: () => 'insiders'
                            },
                            {
                                label: nls.localize(16899, null),
                                run: () => 'stable'
                            }
                        ],
                        cancelButton: true
                    });
                    return result;
                }
            }));
        }
    }
};
SwitchProductQualityContribution = __decorate([
    __param(0, IProductService),
    __param(1, IBrowserWorkbenchEnvironmentService)
], SwitchProductQualityContribution);
export { SwitchProductQualityContribution };
let DefaultAccountUpdateContribution = class DefaultAccountUpdateContribution extends Disposable {
    static { DefaultAccountUpdateContribution_1 = this; }
    static { this.STORAGE_KEY = 'update/internalOrg'; }
    #internalOrg;
    constructor(updateService, defaultAccountService, storageService) {
        super();
        this.updateService = updateService;
        this.defaultAccountService = defaultAccountService;
        this.storageService = storageService;
        this.#internalOrg = undefined;
        this.throttler = this._register(new Throttler());
        if (isWeb) {
            return; // Electron only
        }
        this.#internalOrg = this.storageService.get(DefaultAccountUpdateContribution_1.STORAGE_KEY, -1 /* StorageScope.APPLICATION */, undefined);
        this.throttler.queue(() => this.updateService.setInternalOrg(this.#internalOrg));
        // Check on startup
        this.refresh();
        // Listen for account changes
        this._register(this.defaultAccountService.onDidChangeDefaultAccount(() => this.refresh()));
    }
    refresh() {
        this.throttler.queue(() => this.doRefresh());
    }
    async doRefresh() {
        try {
            const defaultAccount = await this.defaultAccountService.getDefaultAccount();
            const internalOrg = getInternalOrg(defaultAccount?.entitlementsData?.organization_login_list);
            if (internalOrg === this.#internalOrg) {
                return;
            }
            this.#internalOrg = internalOrg;
            await this.updateService.setInternalOrg(this.#internalOrg);
            if (this.#internalOrg) {
                this.storageService.store(DefaultAccountUpdateContribution_1.STORAGE_KEY, internalOrg, -1 /* StorageScope.APPLICATION */, 1 /* StorageTarget.MACHINE */);
            }
            else {
                this.storageService.remove(DefaultAccountUpdateContribution_1.STORAGE_KEY, -1 /* StorageScope.APPLICATION */);
            }
        }
        catch (error) {
            // Silently ignore errors - if we can't get the account, we don't disable background updates
        }
    }
};
DefaultAccountUpdateContribution = DefaultAccountUpdateContribution_1 = __decorate([
    __param(0, IUpdateService),
    __param(1, IDefaultAccountService),
    __param(2, IStorageService)
], DefaultAccountUpdateContribution);
export { DefaultAccountUpdateContribution };
//# sourceMappingURL=update.js.map