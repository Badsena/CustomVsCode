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
import { ActionBar } from '../../../../base/browser/ui/actionbar/actionbar.js';
import { toAction } from '../../../../base/common/actions.js';
import { CancellationToken } from '../../../../base/common/cancellation.js';
import { Codicon } from '../../../../base/common/codicons.js';
import { MarkdownString } from '../../../../base/common/htmlContent.js';
import { Disposable, MutableDisposable } from '../../../../base/common/lifecycle.js';
import { ThemeIcon } from '../../../../base/common/themables.js';
import { localize } from '../../../../nls.js';
import { IClipboardService } from '../../../../platform/clipboard/common/clipboardService.js';
import { ICommandService } from '../../../../platform/commands/common/commands.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { IHoverService, nativeHoverDelegate } from '../../../../platform/hover/browser/hover.js';
import { IMarkdownRendererService, openLinkFromMarkdown } from '../../../../platform/markdown/browser/markdownRenderer.js';
import { IMeteredConnectionService } from '../../../../platform/meteredConnection/common/meteredConnection.js';
import { IOpenerService } from '../../../../platform/opener/common/opener.js';
import { IProductService } from '../../../../platform/product/common/productService.js';
import { asTextOrError, IRequestService } from '../../../../platform/request/common/request.js';
import { computeDownloadSpeed, computeDownloadTimeRemaining, computeProgressPercent, formatBytes, formatDate, formatTimeRemaining, getUpdateInfoUrl, tryParseDate } from '../common/updateUtils.js';
import './media/updateTooltip.css';
/**
 * A stateful tooltip control for the update status.
 */
let UpdateTooltip = class UpdateTooltip extends Disposable {
    constructor(hostedByTitleBar, clipboardService, commandService, configurationService, hoverService, markdownRendererService, meteredConnectionService, openerService, productService, requestService) {
        super();
        this.hostedByTitleBar = hostedByTitleBar;
        this.clipboardService = clipboardService;
        this.commandService = commandService;
        this.configurationService = configurationService;
        this.hoverService = hoverService;
        this.markdownRendererService = markdownRendererService;
        this.meteredConnectionService = meteredConnectionService;
        this.openerService = openerService;
        this.productService = productService;
        this.requestService = requestService;
        this.markdown = this._register(new MutableDisposable());
        this.domNode = dom.$('.update-tooltip');
        // Header section
        const header = dom.append(this.domNode, dom.$('.header'));
        this.titleNode = dom.append(header, dom.$('.title'));
        const actionBar = this._register(new ActionBar(header, { hoverDelegate: nativeHoverDelegate }));
        actionBar.push(toAction({
            id: 'update.openSettings',
            label: localize(16918, null),
            class: ThemeIcon.asClassName(Codicon.gear),
            run: () => this.runCommandAndClose('workbench.action.openSettings', '@id:update*'),
        }), { icon: true, label: false });
        // Product info section
        this.productInfoNode = dom.append(this.domNode, dom.$('.product-info'));
        const logoContainer = dom.append(this.productInfoNode, dom.$('.product-logo'));
        logoContainer.setAttribute('role', 'img');
        logoContainer.setAttribute('aria-label', this.productService.nameLong);
        const details = dom.append(this.productInfoNode, dom.$('.product-details'));
        this.productNameNode = dom.append(details, dom.$('.product-name'));
        this.productNameNode.textContent = this.productService.nameLong;
        const currentVersionRow = this.createVersionRow(details);
        this.currentVersionNode = currentVersionRow.label;
        this.currentVersionCopyValue = currentVersionRow.copyValue;
        const latestVersionRow = this.createVersionRow(details);
        this.latestVersionNode = latestVersionRow.label;
        this.latestVersionCopyValue = latestVersionRow.copyValue;
        this.releaseDateNode = dom.append(details, dom.$('.product-release-date'));
        this.releaseNotesLink = dom.append(details, dom.$('a.release-notes-link'));
        this.releaseNotesLink.textContent = localize(16919, null);
        this.releaseNotesLink.href = '#';
        this._register(dom.addDisposableListener(this.releaseNotesLink, 'click', (e) => {
            e.preventDefault();
            if (this.releaseNotesVersion) {
                this.runCommandAndClose('update.showCurrentReleaseNotes', this.releaseNotesVersion);
            }
        }));
        // Progress section
        this.progressContainer = dom.append(this.domNode, dom.$('.progress-container'));
        const progressBar = dom.append(this.progressContainer, dom.$('.progress-bar'));
        this.progressFill = dom.append(progressBar, dom.$('.progress-fill'));
        const progressText = dom.append(this.progressContainer, dom.$('.progress-text'));
        this.progressPercentNode = dom.append(progressText, dom.$('span'));
        this.progressSizeNode = dom.append(progressText, dom.$('span'));
        // Extra download stats
        this.downloadStatsContainer = dom.append(this.progressContainer, dom.$('.download-stats'));
        this.timeRemainingNode = dom.append(this.downloadStatsContainer, dom.$('.time-remaining'));
        this.speedInfoNode = dom.append(this.downloadStatsContainer, dom.$('.speed-info'));
        // Update markdown section
        this.markdownContainer = dom.append(this.domNode, dom.$('.update-markdown'));
        // State-specific message
        this.messageNode = dom.append(this.domNode, dom.$('.state-message'));
        // Populate static product info
        this.updateCurrentVersion();
    }
    updateCurrentVersion() {
        const productVersion = this.productService.version;
        if (productVersion) {
            const currentCommitId = this.productService.commit?.substring(0, 7);
            this.currentVersionNode.textContent = currentCommitId
                ? localize(16920, null, productVersion, currentCommitId)
                : localize(16921, null, productVersion);
            this.currentVersionCopyValue.value = currentCommitId ? `${productVersion} (${this.productService.commit})` : productVersion;
            this.currentVersionNode.parentElement.style.display = '';
        }
        else {
            this.currentVersionNode.parentElement.style.display = 'none';
        }
    }
    hideAll() {
        this.productInfoNode.style.display = '';
        this.progressContainer.style.display = 'none';
        this.speedInfoNode.textContent = '';
        this.timeRemainingNode.textContent = '';
        this.messageNode.style.display = 'none';
        this.markdownContainer.style.display = 'none';
        this.markdown.clear();
    }
    renderState(state) {
        this.hideAll();
        switch (state.type) {
            case "uninitialized" /* StateType.Uninitialized */:
                this.renderUninitialized();
                break;
            case "disabled" /* StateType.Disabled */:
                this.renderDisabled(state);
                break;
            case "idle" /* StateType.Idle */:
                this.renderIdle(state);
                break;
            case "checking for updates" /* StateType.CheckingForUpdates */:
                this.renderCheckingForUpdates();
                break;
            case "available for download" /* StateType.AvailableForDownload */:
                this.renderAvailableForDownload(state);
                break;
            case "downloading" /* StateType.Downloading */:
                this.renderDownloading(state);
                break;
            case "downloaded" /* StateType.Downloaded */:
                this.renderDownloaded(state);
                break;
            case "updating" /* StateType.Updating */:
                this.renderUpdating(state);
                break;
            case "ready" /* StateType.Ready */:
                this.renderReady(state);
                break;
            case "overwriting" /* StateType.Overwriting */:
                this.renderOverwriting(state);
                break;
        }
    }
    renderUninitialized() {
        this.renderTitleAndInfo(localize(16922, null));
        this.renderMessage(localize(16923, null));
    }
    renderDisabled({ reason }) {
        this.renderTitleAndInfo(localize(16924, null));
        switch (reason) {
            case 0 /* DisablementReason.NotBuilt */:
                this.renderMessage(localize(16925, null), Codicon.info);
                break;
            case 1 /* DisablementReason.DisabledByEnvironment */:
                this.renderMessage(localize(16926, null), Codicon.warning);
                break;
            case 2 /* DisablementReason.ManuallyDisabled */:
                this.renderMessage(localize(16927, null), Codicon.warning);
                break;
            case 3 /* DisablementReason.Policy */:
                this.renderMessage(localize(16928, null), Codicon.info);
                break;
            case 4 /* DisablementReason.MissingConfiguration */:
                this.renderMessage(localize(16929, null), Codicon.info);
                break;
            case 5 /* DisablementReason.InvalidConfiguration */:
                this.renderMessage(localize(16930, null), Codicon.error);
                break;
            case 6 /* DisablementReason.RunningAsAdmin */:
                this.renderMessage(localize(16931, null, this.productService.nameShort), Codicon.warning);
                break;
            default:
                this.renderMessage(localize(16932, null), Codicon.warning);
                break;
        }
    }
    renderIdle({ error, notAvailable }) {
        if (error) {
            this.renderTitleAndInfo(localize(16933, null));
            this.renderMessage(error, Codicon.error);
            return;
        }
        if (notAvailable) {
            this.renderTitleAndInfo(localize(16934, null));
            this.renderMessage(localize(16935, null), Codicon.info);
            return;
        }
        this.renderTitleAndInfo(localize(16936, null));
        switch (this.configurationService.getValue('update.mode')) {
            case 'none':
                this.renderMessage(localize(16937, null), Codicon.warning);
                break;
            case 'manual':
                this.renderMessage(localize(16938, null));
                break;
            case 'start':
                this.renderMessage(localize(16939, null));
                break;
            case 'default':
                if (this.meteredConnectionService.isConnectionMetered) {
                    this.renderMessage(localize(16940, null), Codicon.radioTower);
                }
                else {
                    this.renderMessage(localize(16941, null), Codicon.smiley);
                }
                break;
        }
    }
    renderCheckingForUpdates() {
        this.renderTitleAndInfo(localize(16942, null));
        this.renderMessage(localize(16943, null));
    }
    renderAvailableForDownload({ update }) {
        this.renderTitleAndInfo(localize(16944, null), update);
        if (this.hostedByTitleBar) {
            this.renderMessage(localize(16945, null));
        }
    }
    renderDownloading(state) {
        this.renderTitleAndInfo(localize(16946, null), state.update);
        const { downloadedBytes, totalBytes } = state;
        if (downloadedBytes !== undefined && totalBytes !== undefined && totalBytes > 0) {
            const percentage = computeProgressPercent(downloadedBytes, totalBytes) ?? 0;
            this.progressFill.style.width = `${percentage}%`;
            this.progressPercentNode.textContent = `${percentage}%`;
            this.progressSizeNode.textContent = `${formatBytes(downloadedBytes)} / ${formatBytes(totalBytes)}`;
            this.progressContainer.style.display = '';
            const speed = computeDownloadSpeed(state);
            if (speed !== undefined && speed > 0) {
                this.speedInfoNode.textContent = localize(16947, null, formatBytes(speed));
            }
            const timeRemaining = computeDownloadTimeRemaining(state);
            if (timeRemaining !== undefined && timeRemaining > 0) {
                this.timeRemainingNode.textContent = `~${formatTimeRemaining(timeRemaining)} ${localize(16948, null)}`;
            }
            this.downloadStatsContainer.style.display = '';
        }
        else {
            this.renderMessage(localize(16949, null));
        }
    }
    renderDownloaded({ update }) {
        this.renderTitleAndInfo(localize(16950, null), update);
        if (this.hostedByTitleBar) {
            this.renderMessage(localize(16951, null));
        }
    }
    renderUpdating({ update, currentProgress, maxProgress }) {
        this.renderTitleAndInfo(localize(16952, null), update);
        const percentage = computeProgressPercent(currentProgress, maxProgress);
        if (percentage !== undefined) {
            this.progressFill.style.width = `${percentage}%`;
            this.progressPercentNode.textContent = `${percentage}%`;
            this.progressSizeNode.textContent = '';
            this.progressContainer.style.display = '';
        }
        else {
            this.renderMessage(localize(16953, null));
        }
    }
    renderReady({ update }) {
        this.renderTitleAndInfo(localize(16954, null), update);
        if (this.hostedByTitleBar) {
            this.renderMessage(localize(16955, null));
        }
    }
    renderOverwriting({ update }) {
        this.renderTitleAndInfo(localize(16956, null), update);
        this.renderMessage(localize(16957, null));
    }
    async renderPostInstall() {
        this.hideAll();
        this.renderTitleAndInfo(localize(16958, null));
        this.renderMessage(localize(16959, null), Codicon.info);
        let text = null;
        try {
            const url = getUpdateInfoUrl(this.productService.version);
            const context = await this.requestService.request({ url, callSite: 'updateTooltip' }, CancellationToken.None);
            text = await asTextOrError(context);
        }
        catch { }
        if (!text) {
            return;
        }
        this.titleNode.textContent = localize(16960, null, this.productService.version);
        this.productInfoNode.style.display = 'none';
        this.messageNode.style.display = 'none';
        const rendered = this.markdownRendererService.render(new MarkdownString(text, {
            isTrusted: true,
            supportHtml: true,
            supportThemeIcons: true,
        }), {
            actionHandler: (link, mdStr) => {
                openLinkFromMarkdown(this.openerService, link, mdStr.isTrusted);
                this.hoverService.hideHover(true);
            },
        });
        this.markdown.value = rendered;
        dom.clearNode(this.markdownContainer);
        this.markdownContainer.appendChild(rendered.element);
        this.markdownContainer.style.display = '';
    }
    renderTitleAndInfo(title, update) {
        this.titleNode.textContent = title;
        // Latest version
        const version = update?.productVersion;
        if (version) {
            const updateCommitId = update.version?.substring(0, 7);
            this.latestVersionNode.textContent = updateCommitId
                ? localize(16961, null, version, updateCommitId)
                : localize(16962, null, version);
            this.latestVersionCopyValue.value = updateCommitId ? `${version} (${update.version})` : version;
            this.latestVersionNode.parentElement.style.display = '';
        }
        else {
            this.latestVersionNode.parentElement.style.display = 'none';
        }
        // Release date
        const releaseDate = update?.timestamp ?? tryParseDate(this.productService.date);
        if (typeof releaseDate === 'number' && releaseDate > 0) {
            this.releaseDateNode.textContent = localize(16963, null, formatDate(releaseDate));
            this.releaseDateNode.style.display = '';
        }
        else {
            this.releaseDateNode.style.display = 'none';
        }
        // Release notes link
        this.releaseNotesVersion = version ?? this.productService.version;
        this.releaseNotesLink.style.display = this.releaseNotesVersion ? '' : 'none';
    }
    renderMessage(message, icon) {
        dom.clearNode(this.messageNode);
        if (icon) {
            const iconNode = dom.append(this.messageNode, dom.$('.state-message-icon'));
            iconNode.classList.add(...ThemeIcon.asClassNameArray(icon));
        }
        dom.append(this.messageNode, document.createTextNode(message));
        this.messageNode.style.display = '';
    }
    createVersionRow(parent) {
        const row = dom.append(parent, dom.$('.product-version'));
        const label = dom.append(row, dom.$('span'));
        const copyValue = { value: '' };
        const copyButton = dom.append(row, dom.$('a.copy-version-button'));
        copyButton.setAttribute('role', 'button');
        copyButton.setAttribute('tabindex', '0');
        const title = localize(16964, null);
        copyButton.title = title;
        copyButton.setAttribute('aria-label', title);
        const copyIcon = dom.append(copyButton, dom.$('.copy-icon'));
        copyIcon.classList.add(...ThemeIcon.asClassNameArray(Codicon.copy));
        this._register(dom.addDisposableListener(copyButton, 'click', e => {
            e.preventDefault();
            e.stopPropagation();
            if (copyValue.value) {
                this.clipboardService.writeText(copyValue.value);
            }
        }));
        return { label, copyValue };
    }
    runCommandAndClose(command, ...args) {
        this.commandService.executeCommand(command, ...args);
        this.hoverService.hideHover(true);
    }
};
UpdateTooltip = __decorate([
    __param(1, IClipboardService),
    __param(2, ICommandService),
    __param(3, IConfigurationService),
    __param(4, IHoverService),
    __param(5, IMarkdownRendererService),
    __param(6, IMeteredConnectionService),
    __param(7, IOpenerService),
    __param(8, IProductService),
    __param(9, IRequestService)
], UpdateTooltip);
export { UpdateTooltip };
//# sourceMappingURL=updateTooltip.js.map