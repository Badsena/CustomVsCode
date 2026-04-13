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
import * as dom from '../../../../base/browser/dom.js';
import { BaseActionViewItem } from '../../../../base/browser/ui/actionbar/actionViewItems.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { isWeb } from '../../../../base/common/platform.js';
import { localize } from '../../../../nls.js';
import { IActionViewItemService } from '../../../../platform/actions/browser/actionViewItemService.js';
import { Action2, MenuId, registerAction2 } from '../../../../platform/actions/common/actions.js';
import { ICommandService } from '../../../../platform/commands/common/commands.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { IContextKeyService, RawContextKey } from '../../../../platform/contextkey/common/contextkey.js';
import { IHoverService } from '../../../../platform/hover/browser/hover.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { IProductService } from '../../../../platform/product/common/productService.js';
import { IStorageService } from '../../../../platform/storage/common/storage.js';
import { ITelemetryService } from '../../../../platform/telemetry/common/telemetry.js';
import { IUpdateService } from '../../../../platform/update/common/update.js';
import { IHostService } from '../../../services/host/browser/host.js';
import { computeProgressPercent, isMajorMinorVersionChange } from '../common/updateUtils.js';
import './media/updateTitleBarEntry.css';
import { UpdateTooltip } from './updateTooltip.js';
const UPDATE_TITLE_BAR_ACTION_ID = 'workbench.actions.updateIndicator';
const UPDATE_TITLE_BAR_CONTEXT = new RawContextKey('updateTitleBar', false);
const ACTIONABLE_STATES = ["available for download" /* StateType.AvailableForDownload */, "downloaded" /* StateType.Downloaded */, "ready" /* StateType.Ready */];
const DETAILED_STATES = [...ACTIONABLE_STATES, "checking for updates" /* StateType.CheckingForUpdates */, "downloading" /* StateType.Downloading */, "updating" /* StateType.Updating */, "overwriting" /* StateType.Overwriting */];
const LAST_KNOWN_VERSION_KEY = 'updateTitleBarEntry/lastKnownVersion';
registerAction2(class UpdateIndicatorTitleBarAction extends Action2 {
    constructor() {
        super({
            id: UPDATE_TITLE_BAR_ACTION_ID,
            title: localize(16916, null),
            f1: false,
            menu: [{
                    id: MenuId.TitleBarAdjacentCenter,
                    order: 0,
                    when: UPDATE_TITLE_BAR_CONTEXT,
                }]
        });
    }
    async run() { }
});
/**
 * Displays update status and actions in the title bar.
 */
let UpdateTitleBarContribution = class UpdateTitleBarContribution extends Disposable {
    constructor(actionViewItemService, configurationService, contextKeyService, hostService, instantiationService, productService, storageService, telemetryService, updateService) {
        super();
        this.configurationService = configurationService;
        this.hostService = hostService;
        this.productService = productService;
        this.storageService = storageService;
        this.telemetryService = telemetryService;
        this.mode = 'none';
        this.tooltipVisible = false;
        if (isWeb) {
            return; // Electron only
        }
        this.context = UPDATE_TITLE_BAR_CONTEXT.bindTo(contextKeyService);
        this.tooltip = this._register(instantiationService.createInstance(UpdateTooltip, true));
        this.mode = configurationService.getValue('update.titleBar');
        this._register(configurationService.onDidChangeConfiguration(e => {
            if (e.affectsConfiguration('update.titleBar')) {
                this.mode = configurationService.getValue('update.titleBar');
                this.onStateChange();
            }
        }));
        this.state = updateService.state;
        this._register(updateService.onStateChange((state) => {
            this.state = state;
            this.onStateChange();
        }));
        this._register(actionViewItemService.register(MenuId.TitleBarAdjacentCenter, UPDATE_TITLE_BAR_ACTION_ID, (action, options) => {
            this.entry = instantiationService.createInstance(UpdateTitleBarEntry, action, options, this.tooltip, () => {
                this.tooltipVisible = false;
                this.updateContext();
            });
            if (this.tooltipVisible) {
                this.entry.showTooltip();
            }
            return this.entry;
        }));
        void this.onStateChange(true);
    }
    updateContext() {
        switch (this.mode) {
            case 'always':
                this.context.set(true);
                break;
            case 'detailed':
                this.context.set(DETAILED_STATES.includes(this.state.type));
                break;
            case 'actionable':
                this.context.set(ACTIONABLE_STATES.includes(this.state.type));
                break;
            default:
                this.context.set(false);
                break;
        }
    }
    async onStateChange(startup = false) {
        this.updateContext();
        if (this.mode === 'none' || this.tooltipVisible || !await this.hostService.hadLastFocus()) {
            return;
        }
        let showTooltip = startup && this.detectVersionChange();
        if (showTooltip) {
            this.tooltip.renderPostInstall();
        }
        else {
            this.tooltip.renderState(this.state);
            switch (this.state.type) {
                case "disabled" /* StateType.Disabled */:
                    if (startup) {
                        const reason = this.state.reason;
                        showTooltip = reason === 5 /* DisablementReason.InvalidConfiguration */ || reason === 6 /* DisablementReason.RunningAsAdmin */;
                    }
                    break;
                case "idle" /* StateType.Idle */:
                    showTooltip = !!this.state.error || !!this.state.notAvailable;
                    break;
            }
        }
        if (showTooltip) {
            this.tooltipVisible = true;
            this.context.set(true);
            this.entry?.showTooltip();
        }
    }
    detectVersionChange() {
        let from;
        try {
            from = this.storageService.getObject(LAST_KNOWN_VERSION_KEY, -1 /* StorageScope.APPLICATION */);
        }
        catch { }
        const to = {
            version: this.productService.version,
            commit: this.productService.commit,
            timestamp: Date.now(),
        };
        if (from?.commit === to.commit) {
            return false;
        }
        this.storageService.store(LAST_KNOWN_VERSION_KEY, JSON.stringify(to), -1 /* StorageScope.APPLICATION */, 1 /* StorageTarget.MACHINE */);
        if (from) {
            this.trackVersionChange(from, to);
            return isMajorMinorVersionChange(from.version, to.version);
        }
        return false;
    }
    trackVersionChange(from, to) {
        this.telemetryService.publicLog2('update:versionChanged', {
            fromVersion: from.version,
            fromCommit: from.commit,
            fromVersionTime: from.timestamp,
            toVersion: to.version,
            toCommit: to.commit,
            timeToUpdateMs: from.timestamp !== undefined ? to.timestamp - from.timestamp : undefined,
            updateMode: this.configurationService.getValue('update.mode'),
            titleBarMode: this.mode
        });
    }
};
UpdateTitleBarContribution = __decorate([
    __param(0, IActionViewItemService),
    __param(1, IConfigurationService),
    __param(2, IContextKeyService),
    __param(3, IHostService),
    __param(4, IInstantiationService),
    __param(5, IProductService),
    __param(6, IStorageService),
    __param(7, ITelemetryService),
    __param(8, IUpdateService)
], UpdateTitleBarContribution);
export { UpdateTitleBarContribution };
/**
 * Custom action view item for the update indicator in the title bar.
 */
let UpdateTitleBarEntry = class UpdateTitleBarEntry extends BaseActionViewItem {
    constructor(action, options, tooltip, onUserDismissedTooltip, commandService, hoverService, telemetryService, updateService) {
        super(undefined, action, options);
        this.tooltip = tooltip;
        this.onUserDismissedTooltip = onUserDismissedTooltip;
        this.commandService = commandService;
        this.hoverService = hoverService;
        this.telemetryService = telemetryService;
        this.updateService = updateService;
        this.showTooltipOnRender = false;
        this.action.run = () => this.runAction();
        this._register(this.updateService.onStateChange(state => this.onStateChange(state)));
    }
    render(container) {
        super.render(container);
        this.content = dom.append(container, dom.$('.update-indicator'));
        this.updateTooltip();
        this.onStateChange(this.updateService.state);
        if (this.showTooltipOnRender) {
            this.showTooltipOnRender = false;
            dom.scheduleAtNextAnimationFrame(dom.getWindow(container), () => this.showTooltip());
        }
    }
    showTooltip(focus = false) {
        if (!this.content?.isConnected) {
            this.showTooltipOnRender = true;
            return;
        }
        this.hoverService.showInstantHover({
            content: this.tooltip.domNode,
            target: {
                targetElements: [this.content],
                dispose: () => {
                    if (!!this.content?.isConnected) {
                        this.onUserDismissedTooltip();
                    }
                }
            },
            persistence: { sticky: true },
            appearance: { showPointer: true, compact: true },
        }, focus);
    }
    getHoverContents() {
        return this.tooltip.domNode;
    }
    async runAction() {
        let commandId;
        switch (this.updateService.state.type) {
            case "available for download" /* StateType.AvailableForDownload */:
                commandId = 'update.downloadNow';
                break;
            case "downloaded" /* StateType.Downloaded */:
                commandId = 'update.install';
                break;
            case "ready" /* StateType.Ready */:
                commandId = 'update.restart';
                break;
            default:
                this.showTooltip(true);
                return;
        }
        this.telemetryService.publicLog2('workbenchActionExecuted', { id: commandId, from: 'titlebar' });
        await this.commandService.executeCommand(commandId);
    }
    onStateChange(state) {
        if (!this.content) {
            return;
        }
        dom.clearNode(this.content);
        this.content.classList.remove('prominent', 'progress-indefinite', 'progress-percent', 'update-disabled');
        this.content.style.removeProperty('--update-progress');
        const label = dom.append(this.content, dom.$('.indicator-label'));
        label.textContent = localize(16917, null);
        switch (state.type) {
            case "disabled" /* StateType.Disabled */:
                this.content.classList.add('update-disabled');
                break;
            case "checking for updates" /* StateType.CheckingForUpdates */:
            case "overwriting" /* StateType.Overwriting */:
                this.renderProgressState(this.content);
                break;
            case "available for download" /* StateType.AvailableForDownload */:
            case "downloaded" /* StateType.Downloaded */:
            case "ready" /* StateType.Ready */:
                this.content.classList.add('prominent');
                break;
            case "downloading" /* StateType.Downloading */:
                this.renderProgressState(this.content, computeProgressPercent(state.downloadedBytes, state.totalBytes));
                break;
            case "updating" /* StateType.Updating */:
                this.renderProgressState(this.content, computeProgressPercent(state.currentProgress, state.maxProgress));
                break;
        }
    }
    renderProgressState(content, percentage) {
        if (percentage !== undefined) {
            content.classList.add('progress-percent');
            content.style.setProperty('--update-progress', `${percentage}%`);
        }
        else {
            content.classList.add('progress-indefinite');
        }
    }
};
UpdateTitleBarEntry = __decorate([
    __param(4, ICommandService),
    __param(5, IHoverService),
    __param(6, ITelemetryService),
    __param(7, IUpdateService)
], UpdateTitleBarEntry);
export { UpdateTitleBarEntry };
//# sourceMappingURL=updateTitleBarEntry.js.map