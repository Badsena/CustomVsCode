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
import * as DOM from '../../../../../base/browser/dom.js';
import { BreadcrumbsWidget } from '../../../../../base/browser/ui/breadcrumbs/breadcrumbsWidget.js';
import { Button } from '../../../../../base/browser/ui/button/button.js';
import { RunOnceScheduler } from '../../../../../base/common/async.js';
import { Codicon } from '../../../../../base/common/codicons.js';
import { Emitter } from '../../../../../base/common/event.js';
import { Disposable, DisposableStore } from '../../../../../base/common/lifecycle.js';
import { ThemeIcon } from '../../../../../base/common/themables.js';
import { localize } from '../../../../../nls.js';
import { defaultBreadcrumbsWidgetStyles, defaultButtonStyles } from '../../../../../platform/theme/browser/defaultStyles.js';
import { ChatDebugLogLevel, IChatDebugService } from '../../common/chatDebugService.js';
import { safeIntl } from '../../../../../base/common/date.js';
import { IChatService } from '../../common/chatService/chatService.js';
import { ChatAgentLocation } from '../../common/constants.js';
import { IChatSessionsService, localChatSessionType } from '../../common/chatSessionsService.js';
import { getChatSessionType, LocalChatSessionUri } from '../../common/model/chatUri.js';
import { IChatWidgetService } from '../chat.js';
import { setupBreadcrumbKeyboardNavigation, TextBreadcrumbItem } from './chatDebugTypes.js';
const $ = DOM.$;
const numberFormatter = safeIntl.NumberFormat();
export var OverviewNavigation;
(function (OverviewNavigation) {
    OverviewNavigation["Home"] = "home";
    OverviewNavigation["Logs"] = "logs";
    OverviewNavigation["FlowChart"] = "flowchart";
})(OverviewNavigation || (OverviewNavigation = {}));
let ChatDebugOverviewView = class ChatDebugOverviewView extends Disposable {
    constructor(parent, chatService, chatDebugService, chatWidgetService, chatSessionsService) {
        super();
        this.chatService = chatService;
        this.chatDebugService = chatDebugService;
        this.chatWidgetService = chatWidgetService;
        this.chatSessionsService = chatSessionsService;
        this._onNavigate = this._register(new Emitter());
        this.onNavigate = this._onNavigate.event;
        this.loadDisposables = this._register(new DisposableStore());
        this.isFirstLoad = true;
        this.container = DOM.append(parent, $('.chat-debug-overview'));
        DOM.hide(this.container);
        this.refreshScheduler = this._register(new RunOnceScheduler(() => this.doRefresh(), 100));
        // Breadcrumb
        const breadcrumbContainer = DOM.append(this.container, $('.chat-debug-breadcrumb'));
        this.breadcrumbWidget = this._register(new BreadcrumbsWidget(breadcrumbContainer, 3, undefined, Codicon.chevronRight, defaultBreadcrumbsWidgetStyles));
        this._register(setupBreadcrumbKeyboardNavigation(breadcrumbContainer, this.breadcrumbWidget));
        this._register(this.breadcrumbWidget.onDidSelectItem(e => {
            if (e.type === 'select' && e.item instanceof TextBreadcrumbItem) {
                this.breadcrumbWidget.setSelection(undefined);
                const items = this.breadcrumbWidget.getItems();
                const idx = items.indexOf(e.item);
                if (idx === 0) {
                    this._onNavigate.fire("home" /* OverviewNavigation.Home */);
                }
            }
        }));
        this.content = DOM.append(this.container, $('.chat-debug-overview-content'));
    }
    setSession(sessionResource) {
        this.currentSessionResource = sessionResource;
        this.isFirstLoad = true;
    }
    show() {
        DOM.show(this.container);
        this.load();
    }
    hide() {
        DOM.hide(this.container);
        this.refreshScheduler.cancel();
    }
    refresh() {
        if (this.container.style.display !== 'none') {
            if (!this.refreshScheduler.isScheduled()) {
                this.refreshScheduler.schedule();
            }
        }
    }
    doRefresh() {
        // On refresh, only update the metrics section in-place
        if (this.metricsContainer && this.currentSessionResource) {
            DOM.clearNode(this.metricsContainer);
            const events = this.chatDebugService.getEvents(this.currentSessionResource);
            this.renderMetricsContent(this.metricsContainer, events);
            this.isFirstLoad = false;
        }
        else {
            this.load();
        }
    }
    updateBreadcrumb() {
        if (!this.currentSessionResource) {
            return;
        }
        const sessionTitle = this.chatService.getSessionTitle(this.currentSessionResource) || LocalChatSessionUri.parseLocalSessionId(this.currentSessionResource) || this.currentSessionResource.toString();
        this.breadcrumbWidget.setItems([
            new TextBreadcrumbItem(localize(7027, null), true),
            new TextBreadcrumbItem(sessionTitle),
        ]);
    }
    load() {
        DOM.clearNode(this.content);
        this.loadDisposables.clear();
        this.updateBreadcrumb();
        if (!this.currentSessionResource) {
            return;
        }
        const sessionTitle = this.chatService.getSessionTitle(this.currentSessionResource) || LocalChatSessionUri.parseLocalSessionId(this.currentSessionResource) || this.currentSessionResource.toString();
        const titleRow = DOM.append(this.content, $('.chat-debug-overview-title-row'));
        const titleEl = DOM.append(titleRow, $('h2.chat-debug-overview-title'));
        DOM.append(titleEl, $(`span${ThemeIcon.asCSSSelector(Codicon.comment)}`));
        titleEl.append(sessionTitle);
        const titleActions = DOM.append(titleRow, $('.chat-debug-overview-title-actions'));
        const revealSessionBtn = this.loadDisposables.add(new Button(titleActions, { ariaLabel: localize(7028, null), title: localize(7029, null) }));
        revealSessionBtn.element.classList.add('chat-debug-icon-button');
        revealSessionBtn.icon = Codicon.goToFile;
        this.loadDisposables.add(revealSessionBtn.onDidClick(() => {
            if (this.currentSessionResource) {
                this.chatWidgetService.openSession(this.currentSessionResource);
            }
        }));
        // Session details section
        this.renderSessionDetails(this.currentSessionResource);
        // Derived overview metrics — show shimmer only on the very first load
        // AND when there are no events yet. If events were already streamed
        // (e.g. while viewing logs), render them immediately so the shimmer
        // doesn't get stuck forever waiting for an event that already fired.
        const events = this.chatDebugService.getEvents(this.currentSessionResource);
        this.renderDerivedOverview(events, this.isFirstLoad && events.length === 0);
        this.isFirstLoad = false;
    }
    renderSessionDetails(sessionUri) {
        const model = this.chatService.getSession(sessionUri);
        const details = [];
        // Session type
        const sessionType = getChatSessionType(sessionUri);
        const contribution = this.chatSessionsService.getChatSessionContribution(sessionType);
        const sessionTypeName = contribution?.displayName || (sessionType === localChatSessionType
            ? localize(7030, null)
            : sessionType);
        details.push({ label: localize(7031, null), value: sessionTypeName });
        if (model) {
            const locationLabel = this.getLocationLabel(model.initialLocation);
            details.push({ label: localize(7032, null), value: locationLabel });
            const inProgress = model.requestInProgress.get();
            const statusLabel = inProgress
                ? localize(7033, null)
                : localize(7034, null);
            details.push({ label: localize(7035, null), value: statusLabel });
            const timing = model.timing;
            details.push({ label: localize(7036, null), value: new Date(timing.created).toLocaleString() });
            if (timing.lastRequestEnded) {
                details.push({ label: localize(7037, null), value: new Date(timing.lastRequestEnded).toLocaleString() });
            }
            else if (timing.lastRequestStarted) {
                details.push({ label: localize(7038, null), value: new Date(timing.lastRequestStarted).toLocaleString() });
            }
        }
        if (details.length > 0) {
            const section = DOM.append(this.content, $('.chat-debug-overview-section'));
            DOM.append(section, $('h3.chat-debug-overview-section-label', undefined, localize(7039, null)));
            const detailsGrid = DOM.append(section, $('.chat-debug-overview-details'));
            for (const detail of details) {
                const row = DOM.append(detailsGrid, $('.chat-debug-overview-detail-row'));
                DOM.append(row, $('span.chat-debug-overview-detail-label', undefined, detail.label));
                DOM.append(row, $('span.chat-debug-overview-detail-value', undefined, detail.value));
            }
        }
    }
    getLocationLabel(location) {
        switch (location) {
            case ChatAgentLocation.Chat: return localize(7040, null);
            case ChatAgentLocation.Terminal: return localize(7041, null);
            case ChatAgentLocation.Notebook: return localize(7042, null);
            case ChatAgentLocation.EditorInline: return localize(7043, null);
            default: return String(location);
        }
    }
    renderDerivedOverview(events, showShimmer) {
        const metricsSection = DOM.append(this.content, $('.chat-debug-overview-section'));
        DOM.append(metricsSection, $('h3.chat-debug-overview-section-label', undefined, localize(7044, null)));
        this.metricsContainer = DOM.append(metricsSection, $('.chat-debug-overview-metrics'));
        if (showShimmer) {
            this.renderMetricsShimmer(this.metricsContainer);
        }
        else {
            this.renderMetricsContent(this.metricsContainer, events);
        }
        // Explore actions
        const actionsSection = DOM.append(this.content, $('.chat-debug-overview-section'));
        DOM.append(actionsSection, $('h3.chat-debug-overview-section-label', undefined, localize(7045, null)));
        const row = DOM.append(actionsSection, $('.chat-debug-overview-actions'));
        const viewLogsBtn = this.loadDisposables.add(new Button(row, { ...defaultButtonStyles, secondary: true, supportIcons: true, title: localize(7046, null) }));
        viewLogsBtn.element.classList.add('chat-debug-overview-action-button');
        viewLogsBtn.label = `$(list-flat) ${localize(7047, null)}`;
        this.loadDisposables.add(viewLogsBtn.onDidClick(() => {
            this._onNavigate.fire("logs" /* OverviewNavigation.Logs */);
        }));
        const flowChartBtn = this.loadDisposables.add(new Button(row, { ...defaultButtonStyles, secondary: true, supportIcons: true, title: localize(7048, null) }));
        flowChartBtn.element.classList.add('chat-debug-overview-action-button');
        flowChartBtn.label = `$(type-hierarchy) ${localize(7049, null)}`;
        this.loadDisposables.add(flowChartBtn.onDidClick(() => {
            this._onNavigate.fire("flowchart" /* OverviewNavigation.FlowChart */);
        }));
    }
    renderMetricsShimmer(container) {
        // Show placeholder shimmer cards while provider data is loading
        const placeholderLabels = [
            localize(7050, null),
            localize(7051, null),
            localize(7052, null),
            localize(7053, null),
            localize(7054, null),
        ];
        for (const label of placeholderLabels) {
            const card = DOM.append(container, $('.chat-debug-overview-metric-card'));
            DOM.append(card, $('div.chat-debug-overview-metric-label', undefined, label));
            const valueEl = DOM.append(card, $('div.chat-debug-overview-metric-value'));
            const shimmer = DOM.append(valueEl, $('span.chat-debug-overview-metric-shimmer'));
            shimmer.textContent = '\u00A0'; // non-breaking space for height
        }
    }
    renderMetricsContent(container, events) {
        const modelTurns = events.filter(e => e.kind === 'modelTurn');
        const toolCalls = events.filter(e => e.kind === 'toolCall');
        const errors = events.filter(e => (e.kind === 'generic' && e.level === ChatDebugLogLevel.Error) ||
            (e.kind === 'toolCall' && e.result === 'error'));
        const totalTokens = modelTurns.reduce((sum, e) => sum + (e.totalTokens ?? 0), 0);
        const metrics = [
            { label: localize(7055, null), value: String(modelTurns.length) },
            { label: localize(7056, null), value: String(toolCalls.length) },
            { label: localize(7057, null), value: numberFormatter.value.format(totalTokens) },
            { label: localize(7058, null), value: String(errors.length) },
            { label: localize(7059, null), value: String(events.length) },
        ];
        for (const metric of metrics) {
            const card = DOM.append(container, $('.chat-debug-overview-metric-card'));
            DOM.append(card, $('div.chat-debug-overview-metric-label', undefined, metric.label));
            DOM.append(card, $('div.chat-debug-overview-metric-value', undefined, metric.value));
        }
    }
};
ChatDebugOverviewView = __decorate([
    __param(1, IChatService),
    __param(2, IChatDebugService),
    __param(3, IChatWidgetService),
    __param(4, IChatSessionsService)
], ChatDebugOverviewView);
export { ChatDebugOverviewView };
//# sourceMappingURL=chatDebugOverviewView.js.map