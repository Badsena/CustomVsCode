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
import { Codicon } from '../../../../../base/common/codicons.js';
import { Emitter } from '../../../../../base/common/event.js';
import { combinedDisposable, Disposable, MutableDisposable } from '../../../../../base/common/lifecycle.js';
import { autorun } from '../../../../../base/common/observable.js';
import { RunOnceScheduler } from '../../../../../base/common/async.js';
import { ThemeIcon } from '../../../../../base/common/themables.js';
import { localize } from '../../../../../nls.js';
import { IContextKeyService } from '../../../../../platform/contextkey/common/contextkey.js';
import { IInstantiationService } from '../../../../../platform/instantiation/common/instantiation.js';
import { ServiceCollection } from '../../../../../platform/instantiation/common/serviceCollection.js';
import { WorkbenchList, WorkbenchObjectTree } from '../../../../../platform/list/browser/listService.js';
import { defaultBreadcrumbsWidgetStyles, defaultButtonStyles } from '../../../../../platform/theme/browser/defaultStyles.js';
import { FilterWidget } from '../../../../browser/parts/views/viewFilter.js';
import { IChatDebugService } from '../../common/chatDebugService.js';
import { filterDebugEventsByText } from '../../common/chatDebugEvents.js';
import { IChatService } from '../../common/chatService/chatService.js';
import { LocalChatSessionUri } from '../../common/model/chatUri.js';
import { ChatDebugEventRenderer, ChatDebugEventDelegate, ChatDebugEventTreeRenderer, getEventCreatedText, getEventNameText, getEventDetailsText } from './chatDebugEventList.js';
import { setupBreadcrumbKeyboardNavigation, TextBreadcrumbItem } from './chatDebugTypes.js';
import { bindFilterContextKeys } from './chatDebugFilters.js';
import { ChatDebugDetailPanel } from './chatDebugDetailPanel.js';
import { IChatWidgetService } from '../chat.js';
import { createDebugEventsAttachment } from './chatDebugAttachment.js';
import { IClipboardService } from '../../../../../platform/clipboard/common/clipboardService.js';
import { IContextMenuService } from '../../../../../platform/contextview/browser/contextView.js';
import { Action, Separator } from '../../../../../base/common/actions.js';
import { StandardMouseEvent } from '../../../../../base/browser/mouseEvent.js';
const $ = DOM.$;
export var LogsNavigation;
(function (LogsNavigation) {
    LogsNavigation["Home"] = "home";
    LogsNavigation["Overview"] = "overview";
})(LogsNavigation || (LogsNavigation = {}));
let ChatDebugLogsView = class ChatDebugLogsView extends Disposable {
    constructor(parent, filterState, chatService, chatDebugService, instantiationService, contextKeyService, chatWidgetService, clipboardService, contextMenuService) {
        super();
        this.filterState = filterState;
        this.chatService = chatService;
        this.chatDebugService = chatDebugService;
        this.instantiationService = instantiationService;
        this.contextKeyService = contextKeyService;
        this.chatWidgetService = chatWidgetService;
        this.clipboardService = clipboardService;
        this.contextMenuService = contextMenuService;
        this._onNavigate = this._register(new Emitter());
        this.onNavigate = this._onNavigate.event;
        this.logsViewMode = "tree" /* LogsViewMode.Tree */;
        this.events = [];
        this.eventListener = this._register(new MutableDisposable());
        this.sessionStateDisposable = this._register(new MutableDisposable());
        this.refreshScheduler = this._register(new RunOnceScheduler(() => this.refreshList(), 50));
        this.container = DOM.append(parent, $('.chat-debug-logs'));
        DOM.hide(this.container);
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
                    this._onNavigate.fire("home" /* LogsNavigation.Home */);
                }
                else if (idx === 1) {
                    this._onNavigate.fire("overview" /* LogsNavigation.Overview */);
                }
            }
        }));
        // Header (filter)
        this.headerContainer = DOM.append(this.container, $('.chat-debug-editor-header'));
        // Scoped context key service for filter menu items
        const scopedContextKeyService = this._register(this.contextKeyService.createScoped(this.headerContainer));
        const syncContextKeys = bindFilterContextKeys(this.filterState, scopedContextKeyService);
        syncContextKeys();
        const childInstantiationService = this._register(this.instantiationService.createChild(new ServiceCollection([IContextKeyService, scopedContextKeyService])));
        this.filterWidget = this._register(childInstantiationService.createInstance(FilterWidget, {
            placeholder: localize(6965, null),
            ariaLabel: localize(6966, null),
        }));
        // View mode toggle
        this.viewModeToggle = this._register(new Button(this.headerContainer, { ...defaultButtonStyles, secondary: true, title: localize(6967, null) }));
        this.viewModeToggle.element.classList.add('chat-debug-view-mode-toggle', 'monaco-text-button');
        this.updateViewModeToggle();
        this._register(this.viewModeToggle.onDidClick(() => {
            this.toggleViewMode();
        }));
        const filterContainer = DOM.append(this.headerContainer, $('.viewpane-filter-container'));
        filterContainer.appendChild(this.filterWidget.element);
        // Troubleshoot button
        const troubleshootButton = this._register(new Button(this.headerContainer, { ...defaultButtonStyles, secondary: true, title: localize(6968, null) }));
        troubleshootButton.element.classList.add('chat-debug-troubleshoot-button', 'monaco-text-button');
        DOM.append(troubleshootButton.element, $(`span${ThemeIcon.asCSSSelector(Codicon.chatSparkle)}`));
        this._register(troubleshootButton.onDidClick(async () => {
            if (!this.currentSessionResource) {
                return;
            }
            const widget = await this.chatWidgetService.openSession(this.currentSessionResource);
            if (widget) {
                const attachment = await createDebugEventsAttachment(this.currentSessionResource, this.chatDebugService);
                widget.attachmentModel.addContext(attachment);
                widget.focusInput();
            }
        }));
        this._register(this.filterWidget.onDidChangeFilterText(text => {
            this.filterState.setTextFilter(text);
        }));
        // React to shared filter state changes
        this._register(this.filterState.onDidChange(() => {
            syncContextKeys();
            this.updateMoreFiltersChecked();
            this.refreshList();
        }));
        // Content wrapper (flex row: main column + detail panel)
        const contentContainer = DOM.append(this.container, $('.chat-debug-logs-content'));
        // Main column (table header + list/tree body)
        const mainColumn = DOM.append(contentContainer, $('.chat-debug-logs-main'));
        // Table header
        this.tableHeader = DOM.append(mainColumn, $('.chat-debug-table-header'));
        DOM.append(this.tableHeader, $('span.chat-debug-col-created', undefined, localize(6969, null)));
        DOM.append(this.tableHeader, $('span.chat-debug-col-name', undefined, localize(6970, null)));
        DOM.append(this.tableHeader, $('span.chat-debug-col-details', undefined, localize(6971, null)));
        // Body container
        this.bodyContainer = DOM.append(mainColumn, $('.chat-debug-logs-body'));
        // List container (initially hidden — tree view is default)
        this.listContainer = DOM.append(this.bodyContainer, $('.chat-debug-list-container'));
        DOM.hide(this.listContainer);
        const accessibilityProvider = {
            getAriaLabel: (e) => {
                switch (e.kind) {
                    case 'toolCall': return localize(6972, null, e.toolName, e.result ? ` (${e.result})` : '');
                    case 'modelTurn': return localize(6973, null, e.model ?? localize(6974, null), e.totalTokens ? localize(6975, null, e.totalTokens) : '');
                    case 'generic': return `${e.category ? e.category + ': ' : ''}${e.name}: ${e.details ?? ''}`;
                    case 'subagentInvocation': return localize(6976, null, e.agentName, e.description ? ` - ${e.description}` : '');
                    case 'userMessage': return localize(6977, null, e.message);
                    case 'agentResponse': return localize(6978, null, e.message);
                }
            },
            getWidgetAriaLabel: () => localize(6979, null),
        };
        let nextFallbackId = 0;
        const fallbackIds = new WeakMap();
        const identityProvider = {
            getId: (e) => {
                if (e.id) {
                    return e.id;
                }
                let fallback = fallbackIds.get(e);
                if (!fallback) {
                    fallback = `_fallback_${nextFallbackId++}`;
                    fallbackIds.set(e, fallback);
                }
                return fallback;
            }
        };
        this.list = this._register(this.instantiationService.createInstance((WorkbenchList), 'ChatDebugEvents', this.listContainer, new ChatDebugEventDelegate(), [new ChatDebugEventRenderer()], { identityProvider, accessibilityProvider }));
        // Tree container (default view)
        this.treeContainer = DOM.append(this.bodyContainer, $('.chat-debug-list-container'));
        this.tree = this._register(this.instantiationService.createInstance((WorkbenchObjectTree), 'ChatDebugEventsTree', this.treeContainer, new ChatDebugEventDelegate(), [new ChatDebugEventTreeRenderer()], { identityProvider, accessibilityProvider }));
        // Shimmer row (positioned right below last row to indicate session is running)
        this.shimmerRow = DOM.append(this.bodyContainer, $('.chat-debug-logs-shimmer-row'));
        this.shimmerRow.setAttribute('aria-label', localize(6980, null));
        this.shimmerRow.setAttribute('aria-busy', 'true');
        DOM.append(this.shimmerRow, $('span.chat-debug-logs-shimmer-bar'));
        DOM.hide(this.shimmerRow);
        // Detail panel (sibling of main column so it aligns with table header)
        this.detailPanel = this._register(this.instantiationService.createInstance(ChatDebugDetailPanel, contentContainer));
        this._register(this.detailPanel.onDidChangeWidth(() => {
            if (this.currentDimension) {
                this.layout(this.currentDimension);
            }
        }));
        this._register(this.detailPanel.onDidHide(() => {
            if (this.list.getSelection().length > 0) {
                this.list.setSelection([]);
            }
            if (this.tree.getSelection().length > 0) {
                this.tree.setSelection([]);
            }
            if (this.currentDimension) {
                this.layout(this.currentDimension);
            }
        }));
        // Context menu
        this._register(this.list.onContextMenu(e => {
            if (e.element) {
                this.showEventContextMenu(e.element, e.browserEvent);
            }
        }));
        this._register(this.tree.onContextMenu(e => {
            if (e.element) {
                this.showEventContextMenu(e.element, e.browserEvent);
            }
        }));
        // Resolve event details on selection
        this._register(this.list.onDidChangeSelection(e => {
            const selected = e.elements[0];
            if (selected) {
                this.detailPanel.show(selected);
            }
            else {
                this.detailPanel.hide();
            }
        }));
        this._register(this.tree.onDidChangeSelection(e => {
            const selected = e.elements[0];
            if (selected) {
                this.detailPanel.show(selected);
            }
            else {
                this.detailPanel.hide();
            }
        }));
    }
    setSession(sessionResource) {
        this.currentSessionResource = sessionResource;
    }
    setFilterText(text) {
        this.filterWidget.setFilterText(text);
    }
    show() {
        DOM.show(this.container);
        this.loadEvents();
        this.refreshList();
    }
    hide() {
        DOM.hide(this.container);
    }
    focus() {
        if (this.logsViewMode === "tree" /* LogsViewMode.Tree */) {
            this.tree.domFocus();
        }
        else {
            this.list.domFocus();
        }
    }
    updateBreadcrumb() {
        if (!this.currentSessionResource) {
            return;
        }
        const sessionTitle = this.chatService.getSessionTitle(this.currentSessionResource) || LocalChatSessionUri.parseLocalSessionId(this.currentSessionResource) || this.currentSessionResource.toString();
        this.breadcrumbWidget.setItems([
            new TextBreadcrumbItem(localize(6981, null), true),
            new TextBreadcrumbItem(sessionTitle, true),
            new TextBreadcrumbItem(localize(6982, null)),
        ]);
    }
    layout(dimension) {
        this.currentDimension = dimension;
        const breadcrumbHeight = 22;
        const headerHeight = this.headerContainer.offsetHeight;
        const tableHeaderHeight = this.tableHeader.offsetHeight;
        const detailVisible = this.detailPanel.isVisible;
        const detailWidth = detailVisible ? this.detailPanel.width : 0;
        const listHeight = dimension.height - breadcrumbHeight - headerHeight - tableHeaderHeight;
        const listWidth = dimension.width - detailWidth;
        if (this.logsViewMode === "tree" /* LogsViewMode.Tree */) {
            this.tree.layout(listHeight, listWidth);
        }
        else {
            this.list.layout(listHeight, listWidth);
        }
        if (this.detailPanel.isVisible) {
            this.detailPanel.layout(listHeight);
        }
        this.detailPanel.layoutSash();
    }
    refreshList() {
        let filtered = this.events;
        // Filter by kind toggles (pass category for generic events so only
        // discovery-category events are affected by the Prompt Discovery toggle)
        filtered = filtered.filter(e => {
            const category = e.kind === 'generic' ? e.category : undefined;
            return this.filterState.isKindVisible(e.kind, category);
        });
        // Filter by text search and timestamp (before:/after: syntax is handled
        // inside filterDebugEventsByText)
        const filterText = this.filterState.textFilter;
        if (filterText) {
            filtered = filterDebugEventsByText(filtered, filterText);
        }
        if (this.logsViewMode === "list" /* LogsViewMode.List */) {
            this.list.splice(0, this.list.length, filtered);
        }
        else {
            this.refreshTree(filtered);
        }
        this.updateShimmerPosition(filtered.length);
    }
    updateShimmerPosition(itemCount) {
        this.shimmerRow.style.top = `${itemCount * 28}px`;
    }
    addEvent(event) {
        // Binary-insert to maintain chronological order without a full sort.
        // Events almost always arrive in order, so the insertion point is
        // typically at the end (O(log n) comparison, O(1) splice).
        const time = event.created.getTime();
        let lo = 0;
        let hi = this.events.length;
        while (lo < hi) {
            const mid = (lo + hi) >>> 1;
            if (this.events[mid].created.getTime() <= time) {
                lo = mid + 1;
            }
            else {
                hi = mid;
            }
        }
        if (lo === this.events.length) {
            this.events.push(event);
        }
        else {
            this.events.splice(lo, 0, event);
        }
        this.scheduleRefresh();
    }
    scheduleRefresh() {
        if (!this.refreshScheduler.isScheduled()) {
            this.refreshScheduler.schedule();
        }
    }
    loadEvents() {
        this.events = [...this.chatDebugService.getEvents(this.currentSessionResource || undefined)];
        const addEventDisposable = this.chatDebugService.onDidAddEvent(e => {
            if (!this.currentSessionResource || e.sessionResource.toString() === this.currentSessionResource.toString()) {
                this.addEvent(e);
            }
        });
        // Reload events when provider events are cleared (before re-invoking providers)
        const clearEventsDisposable = this.chatDebugService.onDidClearProviderEvents(sessionResource => {
            if (!this.currentSessionResource || sessionResource.toString() === this.currentSessionResource.toString()) {
                this.events = [...this.chatDebugService.getEvents(this.currentSessionResource || undefined)];
                this.refreshList();
            }
        });
        this.eventListener.value = combinedDisposable(addEventDisposable, clearEventsDisposable);
        this.updateBreadcrumb();
        this.trackSessionState();
    }
    trackSessionState() {
        if (!this.currentSessionResource) {
            DOM.hide(this.shimmerRow);
            this.sessionStateDisposable.clear();
            return;
        }
        const model = this.chatService.getSession(this.currentSessionResource);
        if (!model) {
            DOM.hide(this.shimmerRow);
            this.sessionStateDisposable.clear();
            return;
        }
        this.sessionStateDisposable.value = autorun(reader => {
            const inProgress = model.requestInProgress.read(reader);
            if (inProgress) {
                DOM.show(this.shimmerRow);
            }
            else {
                DOM.hide(this.shimmerRow);
            }
        });
    }
    refreshTree(filtered) {
        const treeElements = this.buildTreeHierarchy(filtered);
        this.tree.setChildren(null, treeElements);
    }
    buildTreeHierarchy(events) {
        const idToEvent = new Map();
        const idToChildren = new Map();
        const roots = [];
        for (const event of events) {
            if (event.id) {
                idToEvent.set(event.id, event);
            }
        }
        for (const event of events) {
            if (event.parentEventId && idToEvent.has(event.parentEventId)) {
                let children = idToChildren.get(event.parentEventId);
                if (!children) {
                    children = [];
                    idToChildren.set(event.parentEventId, children);
                }
                children.push(event);
            }
            else {
                roots.push(event);
            }
        }
        const toTreeElement = (event) => {
            const children = event.id ? idToChildren.get(event.id) : undefined;
            return {
                element: event,
                children: children?.map(toTreeElement),
                collapsible: (children?.length ?? 0) > 0,
                collapsed: false,
            };
        };
        return roots.map(toTreeElement);
    }
    toggleViewMode() {
        if (this.logsViewMode === "list" /* LogsViewMode.List */) {
            this.logsViewMode = "tree" /* LogsViewMode.Tree */;
            DOM.hide(this.listContainer);
            DOM.show(this.treeContainer);
        }
        else {
            this.logsViewMode = "list" /* LogsViewMode.List */;
            DOM.show(this.listContainer);
            DOM.hide(this.treeContainer);
        }
        this.updateViewModeToggle();
        this.refreshList();
        if (this.currentDimension) {
            this.layout(this.currentDimension);
        }
    }
    updateViewModeToggle() {
        const el = this.viewModeToggle.element;
        DOM.clearNode(el);
        const isTree = this.logsViewMode === "tree" /* LogsViewMode.Tree */;
        DOM.append(el, $(`span${ThemeIcon.asCSSSelector(isTree ? Codicon.listTree : Codicon.listFlat)}`));
        const labelContainer = DOM.append(el, $('span.chat-debug-view-mode-labels'));
        const treeLabel = DOM.append(labelContainer, $('span.chat-debug-view-mode-label'));
        treeLabel.textContent = localize(6983, null);
        const listLabel = DOM.append(labelContainer, $('span.chat-debug-view-mode-label'));
        listLabel.textContent = localize(6984, null);
        if (isTree) {
            listLabel.classList.add('hidden');
        }
        else {
            treeLabel.classList.add('hidden');
        }
        const activeLabel = isTree
            ? localize(6985, null)
            : localize(6986, null);
        el.setAttribute('aria-label', activeLabel);
        this.viewModeToggle.setTitle(activeLabel);
    }
    updateMoreFiltersChecked() {
        this.filterWidget.checkMoreFilters(!this.filterState.isAllFiltersDefault());
    }
    showEventContextMenu(event, browserEvent) {
        const d = event.created;
        const pad = (n) => String(n).padStart(2, '0');
        const timestamp = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
        const row = [getEventCreatedText(event), getEventNameText(event), getEventDetailsText(event)].filter(Boolean).join('\t');
        const name = getEventNameText(event);
        this.contextMenuService.showContextMenu({
            getAnchor: () => DOM.isMouseEvent(browserEvent)
                ? new StandardMouseEvent(DOM.getWindow(this.container), browserEvent)
                : this.container,
            getActions: () => [
                new Action('chatDebug.copyTimestamp', localize(6987, null), undefined, true, () => this.clipboardService.writeText(timestamp)),
                new Action('chatDebug.copyRow', localize(6988, null), undefined, true, () => this.clipboardService.writeText(row)),
                new Separator(),
                new Action('chatDebug.filterBefore', localize(6989, null), undefined, true, () => this.applyFilterToken(`before:${timestamp}`)),
                new Action('chatDebug.filterAfter', localize(6990, null), undefined, true, () => this.applyFilterToken(`after:${timestamp}`)),
                new Action('chatDebug.filterName', localize(6991, null), undefined, !!name, () => this.applyFilterToken(name)),
            ],
        });
    }
    applyFilterToken(token) {
        this.filterWidget.setFilterText(token);
    }
};
ChatDebugLogsView = __decorate([
    __param(2, IChatService),
    __param(3, IChatDebugService),
    __param(4, IInstantiationService),
    __param(5, IContextKeyService),
    __param(6, IChatWidgetService),
    __param(7, IClipboardService),
    __param(8, IContextMenuService)
], ChatDebugLogsView);
export { ChatDebugLogsView };
//# sourceMappingURL=chatDebugLogsView.js.map