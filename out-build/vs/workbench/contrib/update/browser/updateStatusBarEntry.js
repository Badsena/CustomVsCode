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
var UpdateStatusBarContribution_1;
import { Disposable, MutableDisposable } from '../../../../base/common/lifecycle.js';
import { isWeb } from '../../../../base/common/platform.js';
import { localize } from '../../../../nls.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { IUpdateService } from '../../../../platform/update/common/update.js';
import { IStatusbarService, ShowTooltipCommand } from '../../../services/statusbar/browser/statusbar.js';
import { computeProgressPercent, formatBytes } from '../common/updateUtils.js';
import './media/updateStatusBarEntry.css';
import { UpdateTooltip } from './updateTooltip.js';
/**
 * Displays update status and actions in the status bar.
 */
let UpdateStatusBarContribution = class UpdateStatusBarContribution extends Disposable {
    static { UpdateStatusBarContribution_1 = this; }
    static { this.actionableStates = ["available for download" /* StateType.AvailableForDownload */, "downloaded" /* StateType.Downloaded */, "ready" /* StateType.Ready */]; }
    constructor(configurationService, instantiationService, statusbarService, updateService) {
        super();
        this.configurationService = configurationService;
        this.statusbarService = statusbarService;
        this.accessor = this._register(new MutableDisposable());
        if (isWeb) {
            return; // Electron only
        }
        this.tooltip = this._register(instantiationService.createInstance(UpdateTooltip, false));
        this._register(updateService.onStateChange(this.onStateChange.bind(this)));
        this._register(this.configurationService.onDidChangeConfiguration(e => {
            if (e.affectsConfiguration('update.statusBar') || e.affectsConfiguration('update.titleBar')) {
                this.onStateChange(updateService.state);
            }
        }));
        this.onStateChange(updateService.state);
    }
    onStateChange(state) {
        const titleBarMode = this.configurationService.getValue('update.titleBar');
        if (titleBarMode !== 'none') {
            this.accessor.clear();
            return;
        }
        const mode = this.configurationService.getValue('update.statusBar');
        if (mode === 'hidden' || mode === 'actionable' && !UpdateStatusBarContribution_1.actionableStates.includes(state.type)) {
            this.accessor.clear();
            return;
        }
        if (this.lastStateType !== state.type) {
            this.accessor.clear();
            this.lastStateType = state.type;
        }
        this.tooltip.renderState(state);
        switch (state.type) {
            case "checking for updates" /* StateType.CheckingForUpdates */:
                this.updateEntry(localize(16900, null), localize(16901, null), ShowTooltipCommand);
                break;
            case "available for download" /* StateType.AvailableForDownload */:
                this.updateEntry(localize(16902, null), localize(16903, null), 'update.downloadNow');
                break;
            case "downloading" /* StateType.Downloading */:
                this.updateEntry(this.getDownloadingText(state), localize(16904, null), ShowTooltipCommand);
                break;
            case "downloaded" /* StateType.Downloaded */:
                this.updateEntry(localize(16905, null), localize(16906, null), 'update.install');
                break;
            case "updating" /* StateType.Updating */:
                this.updateEntry(this.getUpdatingText(state), undefined, ShowTooltipCommand);
                break;
            case "ready" /* StateType.Ready */:
                this.updateEntry(localize(16907, null), localize(16908, null), 'update.restart');
                break;
            case "overwriting" /* StateType.Overwriting */:
                this.updateEntry(localize(16909, null), localize(16910, null), ShowTooltipCommand);
                break;
            default:
                this.accessor.clear();
                break;
        }
    }
    updateEntry(text, ariaLabel, command) {
        const entry = {
            text,
            ariaLabel: ariaLabel ?? text,
            name: localize(16911, null),
            tooltip: this.tooltip?.domNode,
            command
        };
        if (this.accessor.value) {
            this.accessor.value.update(entry);
        }
        else {
            this.accessor.value = this.statusbarService.addEntry(entry, 'status.update', 0 /* StatusbarAlignment.LEFT */, -Number.MAX_VALUE);
        }
    }
    getDownloadingText({ downloadedBytes, totalBytes }) {
        if (downloadedBytes !== undefined && totalBytes !== undefined && totalBytes > 0) {
            const percent = computeProgressPercent(downloadedBytes, totalBytes) ?? 0;
            return localize(16912, null, formatBytes(downloadedBytes), formatBytes(totalBytes), percent);
        }
        else {
            return localize(16913, null);
        }
    }
    getUpdatingText({ currentProgress, maxProgress }) {
        const percentage = computeProgressPercent(currentProgress, maxProgress);
        if (percentage !== undefined) {
            return localize(16914, null, percentage);
        }
        else {
            return localize(16915, null);
        }
    }
};
UpdateStatusBarContribution = UpdateStatusBarContribution_1 = __decorate([
    __param(0, IConfigurationService),
    __param(1, IInstantiationService),
    __param(2, IStatusbarService),
    __param(3, IUpdateService)
], UpdateStatusBarContribution);
export { UpdateStatusBarContribution };
//# sourceMappingURL=updateStatusBarEntry.js.map