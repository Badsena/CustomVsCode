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
import * as dom from '../../../../../base/browser/dom.js';
import { renderIcon } from '../../../../../base/browser/ui/iconLabel/iconLabels.js';
import { RunOnceScheduler } from '../../../../../base/common/async.js';
import { CancellationTokenSource } from '../../../../../base/common/cancellation.js';
import { Codicon } from '../../../../../base/common/codicons.js';
import { fromNow, getDurationString } from '../../../../../base/common/date.js';
import { MarkdownString } from '../../../../../base/common/htmlContent.js';
import { Disposable, toDisposable } from '../../../../../base/common/lifecycle.js';
import { ThemeIcon } from '../../../../../base/common/themables.js';
import { localize } from '../../../../../nls.js';
import { IInstantiationService } from '../../../../../platform/instantiation/common/instantiation.js';
import { IChatService } from '../../common/chatService/chatService.js';
import { ChatAgentLocation, ChatModeKind } from '../../common/constants.js';
import { ChatViewModel } from '../../common/model/chatViewModel.js';
import { CodeBlockModelCollection } from '../../common/widget/codeBlockModelCollection.js';
import { IChatWidgetService } from '../chat.js';
import { ChatListWidget } from '../widget/chatListWidget.js';
import { AgentSessionProviders, getAgentSessionProvider, getAgentSessionProviderIcon, getAgentSessionProviderName } from './agentSessions.js';
import { getAgentChangesSummary, hasValidDiff } from './agentSessionsModel.js';
import './media/agentSessionHoverWidget.css';
const HEADER_HEIGHT = 60;
const CHAT_LIST_HEIGHT = 240;
const CHAT_HOVER_WIDTH = 500;
let AgentSessionHoverWidget = class AgentSessionHoverWidget extends Disposable {
    constructor(session, chatService, instantiationService, chatWidgetService) {
        super();
        this.session = session;
        this.chatService = chatService;
        this.instantiationService = instantiationService;
        this.chatWidgetService = chatWidgetService;
        this.hasRendered = false;
        this.domNode = dom.$('.agent-session-hover.interactive-session');
        this.domNode.style.width = `${CHAT_HOVER_WIDTH}px`;
        this.domNode.style.height = `${HEADER_HEIGHT + CHAT_LIST_HEIGHT}px`;
        this.domNode.style.overflow = 'hidden';
        this.cts = new CancellationTokenSource();
        this._register(toDisposable(() => this.cts.cancel()));
        // Build header immediately
        this.buildHeader();
        // Create content container with loading state
        this.contentElement = dom.append(this.domNode, dom.$('.agent-session-hover-content'));
        this.loadingElement = dom.append(this.contentElement, dom.$('.agent-session-hover-loading'));
        dom.append(this.loadingElement, renderIcon(ThemeIcon.modify(Codicon.loading, 'spin')));
        // Delay rendering by 200ms to avoid expensive rendering for brief hovers
        this.renderScheduler = this._register(new RunOnceScheduler(() => this.render(), 200));
    }
    onRendered() {
        this.modelRef ??= this.loadModel();
        if (!this.hasRendered) {
            this.hasRendered = true;
            this.renderScheduler.schedule();
        }
        else {
            this.listWidget?.layout(CHAT_LIST_HEIGHT, CHAT_HOVER_WIDTH);
        }
    }
    async loadModel() {
        const modelRef = await this.chatService.acquireOrLoadSession(this.session.resource, ChatAgentLocation.Chat, this.cts.token);
        if (this._store.isDisposed) {
            modelRef?.dispose();
            return;
        }
        if (!modelRef) {
            // Show fallback tooltip text
            this.loadingElement.remove();
            const tooltip = this.buildFallbackTooltip(this.session);
            this.domNode.textContent = typeof tooltip === 'string' ? tooltip : tooltip.value;
            return;
        }
        this._register(modelRef);
        return modelRef.object;
    }
    async render() {
        this.modelRef ??= this.loadModel();
        const model = await this.modelRef;
        if (!model || this._store.isDisposed) {
            return;
        }
        // Remove loading state
        this.loadingElement.remove();
        // Create view model - only show last request+response pair
        const codeBlockCollection = this._register(this.instantiationService.createInstance(CodeBlockModelCollection, 'agentSessionHover'));
        const viewModel = this._register(this.instantiationService.createInstance(ChatViewModel, model, codeBlockCollection, { maxVisibleItems: 2 }));
        // Create the chat list widget
        const container = dom.append(this.contentElement, dom.$('.interactive-list'));
        const listWidget = this._register(this.instantiationService.createInstance(ChatListWidget, container, {
            rendererOptions: {
                renderStyle: 'compact',
                noHeader: true,
                editable: false,
            },
            currentChatMode: () => ChatModeKind.Ask,
        }));
        listWidget.layout(CHAT_LIST_HEIGHT, CHAT_HOVER_WIDTH);
        listWidget.setScrollLock(true);
        listWidget.setViewModel(viewModel);
        listWidget.refresh();
        const viewModelScheudler = this._register(new RunOnceScheduler(() => listWidget.refresh(), 500));
        this._register(viewModel.onDidChange(() => {
            if (!viewModelScheudler.isScheduled()) {
                viewModelScheudler.schedule();
            }
        }));
        // Handle followup clicks - open the session and accept input
        this._register(listWidget.onDidClickFollowup(async (followup) => {
            const widget = await this.chatWidgetService.openSession(model.sessionResource);
            if (widget) {
                widget.acceptInput(followup.message);
            }
        }));
    }
    buildHeader() {
        const session = this.session;
        const header = dom.append(this.domNode, dom.$('.agent-session-hover-header'));
        // Title row
        const titleRow = dom.append(header, dom.$('.agent-session-hover-title'));
        dom.append(titleRow, dom.$('span', undefined, session.label));
        // Details row: Provider icon + Duration/Time • Diff • Status (if not completed)
        const detailsRow = dom.append(header, dom.$('.agent-session-hover-details'));
        // Provider icon + name + Duration or start time
        const providerType = getAgentSessionProvider(session.providerType);
        const provider = providerType ?? AgentSessionProviders.Local;
        const providerIcon = getAgentSessionProviderIcon(provider);
        dom.append(detailsRow, renderIcon(providerIcon));
        dom.append(detailsRow, dom.$('span', undefined, getAgentSessionProviderName(provider)));
        dom.append(detailsRow, dom.$('span.separator', undefined, '•'));
        if (session.timing.lastRequestEnded && session.timing.lastRequestStarted) {
            const duration = this.toDuration(session.timing.lastRequestStarted, session.timing.lastRequestEnded, true);
            if (duration) {
                dom.append(detailsRow, dom.$('span', undefined, duration));
            }
        }
        else {
            const startTime = session.timing.lastRequestStarted ?? session.timing.created;
            dom.append(detailsRow, dom.$('span', undefined, fromNow(startTime, true, true)));
        }
        // Diff information
        const diff = getAgentChangesSummary(session.changes);
        if (diff && hasValidDiff(session.changes)) {
            dom.append(detailsRow, dom.$('span.separator', undefined, '•'));
            const diffContainer = dom.append(detailsRow, dom.$('.agent-session-hover-diff'));
            if (diff.files > 0) {
                dom.append(diffContainer, dom.$('span', undefined, diff.files === 1 ? localize(6155, null) : localize(6156, null, diff.files)));
            }
            if (diff.insertions > 0) {
                dom.append(diffContainer, dom.$('span.insertions', undefined, `+${diff.insertions}`));
            }
            if (diff.deletions > 0) {
                dom.append(diffContainer, dom.$('span.deletions', undefined, `-${diff.deletions}`));
            }
        }
        // Status (only show if not completed)
        if (session.status !== 1 /* AgentSessionStatus.Completed */) {
            dom.append(detailsRow, dom.$('span.separator', undefined, '•'));
            dom.append(detailsRow, dom.$('span', undefined, this.toStatusLabel(session.status)));
        }
        // Archived indicator
        if (session.isArchived()) {
            dom.append(detailsRow, dom.$('span.separator', undefined, '•'));
            dom.append(detailsRow, renderIcon(Codicon.archive));
            dom.append(detailsRow, dom.$('span', undefined, localize(6157, null)));
        }
    }
    buildFallbackTooltip(session) {
        const lines = [];
        // Title
        lines.push(`**${session.label}**`);
        // Tooltip (from provider)
        if (session.tooltip) {
            const tooltip = typeof session.tooltip === 'string' ? session.tooltip : session.tooltip.value;
            lines.push(tooltip);
        }
        else {
            // Description
            if (session.description) {
                const description = typeof session.description === 'string' ? session.description : session.description.value;
                lines.push(description);
            }
            // Badge
            if (session.badge) {
                const badge = typeof session.badge === 'string' ? session.badge : session.badge.value;
                lines.push(badge);
            }
        }
        // Details line: Provider icon + Duration/Time • Diff • Status (if not completed)
        const details = [];
        // Provider icon + name + Duration or start time
        const providerType = getAgentSessionProvider(session.providerType);
        const provider = providerType ?? AgentSessionProviders.Local;
        const providerIcon = getAgentSessionProviderIcon(provider);
        const providerName = getAgentSessionProviderName(provider);
        let timeLabel;
        if (session.timing.lastRequestEnded && session.timing.lastRequestStarted) {
            const duration = this.toDuration(session.timing.lastRequestStarted, session.timing.lastRequestEnded, true);
            timeLabel = duration ?? fromNow(session.timing.lastRequestStarted, true, true);
        }
        else {
            const startTime = session.timing.lastRequestStarted ?? session.timing.created;
            timeLabel = fromNow(startTime, true, true);
        }
        details.push(`$(${providerIcon.id}) ${providerName} • ${timeLabel}`);
        // Diff information
        const diff = getAgentChangesSummary(session.changes);
        if (diff && hasValidDiff(session.changes)) {
            const diffParts = [];
            if (diff.files > 0) {
                diffParts.push(diff.files === 1 ? localize(6158, null) : localize(6159, null, diff.files));
            }
            if (diff.insertions > 0) {
                diffParts.push(`+${diff.insertions}`);
            }
            if (diff.deletions > 0) {
                diffParts.push(`-${diff.deletions}`);
            }
            if (diffParts.length > 0) {
                details.push(diffParts.join(' '));
            }
        }
        // Status (only show if not completed)
        if (session.status !== 1 /* AgentSessionStatus.Completed */) {
            details.push(this.toStatusLabel(session.status));
        }
        lines.push(details.join(' • '));
        // Archived status
        if (session.isArchived()) {
            lines.push(`$(archive) ${localize(6160, null)}`);
        }
        return new MarkdownString(lines.join('\n\n'), { supportThemeIcons: true });
    }
    toDuration(startTime, endTime, useFullTimeWords) {
        const elapsed = Math.round((endTime - startTime) / 1000) * 1000;
        if (elapsed < 1000) {
            return undefined;
        }
        return getDurationString(elapsed, useFullTimeWords);
    }
    toStatusLabel(status) {
        let statusLabel;
        switch (status) {
            case 3 /* AgentSessionStatus.NeedsInput */:
                statusLabel = localize(6161, null);
                break;
            case 2 /* AgentSessionStatus.InProgress */:
                statusLabel = localize(6162, null);
                break;
            case 0 /* AgentSessionStatus.Failed */:
                statusLabel = localize(6163, null);
                break;
            default:
                statusLabel = localize(6164, null);
        }
        return statusLabel;
    }
};
AgentSessionHoverWidget = __decorate([
    __param(1, IChatService),
    __param(2, IInstantiationService),
    __param(3, IChatWidgetService)
], AgentSessionHoverWidget);
export { AgentSessionHoverWidget };
//# sourceMappingURL=agentSessionHoverWidget.js.map