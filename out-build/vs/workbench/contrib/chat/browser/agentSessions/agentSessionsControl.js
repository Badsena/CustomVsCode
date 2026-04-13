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
var AgentSessionsControl_1;
import { IContextKeyService } from '../../../../../platform/contextkey/common/contextkey.js';
import { ChatContextKeys } from '../../common/actions/chatContextKeys.js';
import { IContextMenuService } from '../../../../../platform/contextview/browser/contextView.js';
import { IInstantiationService } from '../../../../../platform/instantiation/common/instantiation.js';
import { WorkbenchCompressibleAsyncDataTree } from '../../../../../platform/list/browser/listService.js';
import { $, append, EventHelper, addDisposableListener, EventType, hide, setVisibility } from '../../../../../base/browser/dom.js';
import { StandardKeyboardEvent } from '../../../../../base/browser/keyboardEvent.js';
import { localize } from '../../../../../nls.js';
import { isAgentSession, isAgentSessionSection } from './agentSessionsModel.js';
import { AgentSessionRenderer, AgentSessionsAccessibilityProvider, AgentSessionsCompressionDelegate, AgentSessionsDataSource, AgentSessionsDragAndDrop, AgentSessionsIdentityProvider, AgentSessionsKeyboardNavigationLabelProvider, AgentSessionsListDelegate, AgentSessionSectionRenderer, AgentSessionsSorter } from './agentSessionsViewer.js';
import { AgentSessionsGrouping } from './agentSessionsFilter.js';
import { AgentSessionApprovalModel } from './agentSessionApprovalModel.js';
import { IMenuService, MenuId } from '../../../../../platform/actions/common/actions.js';
import { IChatSessionsService } from '../../common/chatSessionsService.js';
import { ICommandService } from '../../../../../platform/commands/common/commands.js';
import { ACTION_ID_NEW_CHAT } from '../actions/chatActions.js';
import { Emitter, Event } from '../../../../../base/common/event.js';
import { Disposable } from '../../../../../base/common/lifecycle.js';
import { Throttler } from '../../../../../base/common/async.js';
import { observableValue } from '../../../../../base/common/observable.js';
import { Separator } from '../../../../../base/common/actions.js';
import { RenderIndentGuides, TreeFindMode } from '../../../../../base/browser/ui/tree/abstractTree.js';
import { IAgentSessionsService } from './agentSessionsService.js';
import { ITelemetryService } from '../../../../../platform/telemetry/common/telemetry.js';
import { openSession } from './agentSessionsOpener.js';
import { IEditorService } from '../../../../services/editor/common/editorService.js';
import { ChatEditorInput } from '../widgetHosts/editor/chatEditorInput.js';
import { IStorageService } from '../../../../../platform/storage/common/storage.js';
import { ILogService } from '../../../../../platform/log/common/log.js';
let AgentSessionsControl = class AgentSessionsControl extends Disposable {
    static { AgentSessionsControl_1 = this; }
    get element() { return this.sessionsContainer; }
    constructor(container, options, contextMenuService, contextKeyService, instantiationService, chatSessionsService, commandService, menuService, agentSessionsService, telemetryService, editorService, storageService, logService) {
        super();
        this.container = container;
        this.options = options;
        this.contextMenuService = contextMenuService;
        this.contextKeyService = contextKeyService;
        this.instantiationService = instantiationService;
        this.chatSessionsService = chatSessionsService;
        this.commandService = commandService;
        this.menuService = menuService;
        this.agentSessionsService = agentSessionsService;
        this.telemetryService = telemetryService;
        this.editorService = editorService;
        this.storageService = storageService;
        this.logService = logService;
        this.sessionsListFindIsOpen = false;
        this._isProgrammaticCollapseChange = false;
        this.updateSessionsListThrottler = this._register(new Throttler());
        this._onDidUpdate = this._register(new Emitter());
        this.onDidUpdate = this._onDidUpdate.event;
        this.visible = true;
        this.focusedAgentSessionArchivedContextKey = ChatContextKeys.isArchivedAgentSession.bindTo(this.contextKeyService);
        this.focusedAgentSessionPinnedContextKey = ChatContextKeys.isPinnedAgentSession.bindTo(this.contextKeyService);
        this.focusedAgentSessionReadContextKey = ChatContextKeys.isReadAgentSession.bindTo(this.contextKeyService);
        this.focusedAgentSessionTypeContextKey = ChatContextKeys.agentSessionType.bindTo(this.contextKeyService);
        this.hasMultipleAgentSessionsSelectedContextKey = ChatContextKeys.hasMultipleAgentSessionsSelected.bindTo(this.contextKeyService);
        this.create(this.container);
        this.registerListeners();
    }
    registerListeners() {
        this._register(this.editorService.onDidActiveEditorChange(() => this.revealAndFocusActiveEditorSession()));
    }
    revealAndFocusActiveEditorSession() {
        if (!this.options.trackActiveEditorSession() ||
            !this.visible) {
            return;
        }
        const input = this.editorService.activeEditor;
        const resource = (input instanceof ChatEditorInput) ? input.sessionResource : input?.resource;
        if (!resource) {
            return;
        }
        const matchingSession = this.agentSessionsService.model.getSession(resource);
        if (matchingSession && this.sessionsList?.hasNode(matchingSession)) {
            if (this.sessionsList.getRelativeTop(matchingSession) === null) {
                this.sessionsList.reveal(matchingSession, 0.5); // only reveal when not already visible
            }
            this.sessionsList.setFocus([matchingSession]);
            this.sessionsList.setSelection([matchingSession]);
        }
    }
    create(container) {
        this.sessionsContainer = append(container, $('.agent-sessions-viewer'));
        this.createEmptyFilterMessage(this.sessionsContainer);
        this.createList(this.sessionsContainer);
    }
    createEmptyFilterMessage(container) {
        this.emptyFilterMessage = append(container, $('.agent-sessions-empty-filter-message'));
        hide(this.emptyFilterMessage);
        const span = append(this.emptyFilterMessage, $('span'));
        span.textContent = `${localize(6233, null)} - `;
        const link = append(this.emptyFilterMessage, $('span.reset-filter-link'));
        link.textContent = localize(6234, null);
        link.tabIndex = 0;
        link.setAttribute('role', 'button');
        this._register(addDisposableListener(link, EventType.CLICK, () => this.options.filter.reset()));
        this._register(addDisposableListener(link, EventType.KEY_DOWN, (e) => {
            const event = new StandardKeyboardEvent(e);
            if (event.keyCode === 3 /* KeyCode.Enter */ || event.keyCode === 10 /* KeyCode.Space */) {
                EventHelper.stop(e, true);
                this.options.filter.reset();
            }
        }));
    }
    static { this.SECTION_COLLAPSE_STATE_KEY = 'agentSessions.sectionCollapseState'; }
    getSavedCollapseState(section) {
        const raw = this.storageService.get(AgentSessionsControl_1.SECTION_COLLAPSE_STATE_KEY, 0 /* StorageScope.PROFILE */);
        if (raw) {
            try {
                const state = JSON.parse(raw);
                if (typeof state[section] === 'boolean') {
                    return state[section];
                }
            }
            catch {
                // ignore corrupt data
            }
        }
        return undefined;
    }
    saveSectionCollapseState(section, collapsed) {
        let state = {};
        const raw = this.storageService.get(AgentSessionsControl_1.SECTION_COLLAPSE_STATE_KEY, 0 /* StorageScope.PROFILE */);
        if (raw) {
            try {
                const parsed = JSON.parse(raw);
                if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
                    state = parsed;
                }
            }
            catch {
                // ignore corrupt data
            }
        }
        state[section] = collapsed;
        this.storageService.store(AgentSessionsControl_1.SECTION_COLLAPSE_STATE_KEY, JSON.stringify(state), 0 /* StorageScope.PROFILE */, 0 /* StorageTarget.USER */);
    }
    createList(container) {
        const collapseByDefault = (element) => {
            if (isAgentSessionSection(element)) {
                // Check for persisted user preference first
                const saved = this.getSavedCollapseState(element.section);
                if (saved !== undefined) {
                    return saved;
                }
                if (element.section === "more" /* AgentSessionSection.More */ && !this.options.filter.getExcludes().read) {
                    return true; // More section is always collapsed unless only showing unread
                }
                if (element.section === "archived" /* AgentSessionSection.Archived */ && this.options.filter.getExcludes().archived) {
                    return true; // Archived section is collapsed when archived are excluded
                }
                if (this.options.collapseOlderSections?.()) {
                    const olderSections = ["week" /* AgentSessionSection.Week */, "older" /* AgentSessionSection.Older */, "archived" /* AgentSessionSection.Archived */];
                    if (olderSections.includes(element.section)) {
                        return true; // Collapse older time sections if option is enabled
                    }
                    if (element.section === "yesterday" /* AgentSessionSection.Yesterday */ && this.hasTodaySessions()) {
                        return true; // Also collapse Yesterday when there are sessions from Today
                    }
                }
            }
            return false;
        };
        const sorter = new AgentSessionsSorter();
        const approvalModel = this.options.enableApprovalRow ? this._register(this.instantiationService.createInstance(AgentSessionApprovalModel)) : undefined;
        const activeSessionResource = observableValue(this, undefined);
        const sessionRenderer = this._register(this.instantiationService.createInstance(AgentSessionRenderer, {
            ...this.options,
            isGroupedByRepository: () => this.options.filter.groupResults?.() === AgentSessionsGrouping.Repository,
        }, approvalModel, activeSessionResource));
        const sessionFilter = this._register(new AgentSessionsDataSource(this.options.filter, sorter, this.logService));
        const list = this.sessionsList = this._register(this.instantiationService.createInstance(WorkbenchCompressibleAsyncDataTree, 'AgentSessionsView', container, new AgentSessionsListDelegate(approvalModel), new AgentSessionsCompressionDelegate(), [
            sessionRenderer,
            this.instantiationService.createInstance(AgentSessionSectionRenderer),
        ], sessionFilter, {
            accessibilityProvider: new AgentSessionsAccessibilityProvider(),
            dnd: this.instantiationService.createInstance(AgentSessionsDragAndDrop),
            identityProvider: new AgentSessionsIdentityProvider(),
            horizontalScrolling: false,
            multipleSelectionSupport: true,
            findWidgetEnabled: true,
            defaultFindMode: TreeFindMode.Filter,
            keyboardNavigationLabelProvider: new AgentSessionsKeyboardNavigationLabelProvider(),
            overrideStyles: this.options.overrideStyles,
            twistieAdditionalCssClass: () => 'force-no-twistie',
            collapseByDefault: (element) => collapseByDefault(element),
            renderIndentGuides: RenderIndentGuides.None,
        }));
        ChatContextKeys.agentSessionsViewerFocused.bindTo(list.contextKeyService);
        this._register(sessionRenderer.onDidChangeItemHeight(session => {
            if (list.hasNode(session)) {
                list.updateElementHeight(session, undefined);
            }
        }));
        this._register(sessionFilter.onDidGetChildren(count => {
            this.updateEmpty(count === 0);
        }));
        const model = this.agentSessionsService.model;
        this._register(this.options.filter.onDidChange(async () => {
            if (this.visible) {
                this.updateSectionCollapseStates();
                this.update();
            }
        }));
        this._register(model.onDidChangeSessions(() => {
            if (this.visible) {
                this.update();
            }
        }));
        list.setInput(model);
        this._register(list.onDidOpen(e => this.openAgentSession(e)));
        this._register(list.onContextMenu(e => this.showContextMenu(e)));
        this._register(list.onMouseDblClick(({ element }) => {
            if (element === null) {
                this.commandService.executeCommand(ACTION_ID_NEW_CHAT);
            }
        }));
        this._register(Event.any(list.onDidChangeFocus, list.onDidChangeSelection, model.onDidChangeSessions)(() => {
            const focused = list.getFocus().at(0);
            if (focused && isAgentSession(focused)) {
                this.focusedAgentSessionArchivedContextKey.set(focused.isArchived());
                this.focusedAgentSessionPinnedContextKey.set(focused.isPinned());
                this.focusedAgentSessionReadContextKey.set(focused.isRead());
                this.focusedAgentSessionTypeContextKey.set(focused.providerType);
                activeSessionResource.set(focused.resource, undefined);
            }
            else {
                this.focusedAgentSessionArchivedContextKey.reset();
                this.focusedAgentSessionPinnedContextKey.reset();
                this.focusedAgentSessionReadContextKey.reset();
                this.focusedAgentSessionTypeContextKey.reset();
                activeSessionResource.set(undefined, undefined);
            }
            const selection = list.getSelection().filter(isAgentSession);
            this.hasMultipleAgentSessionsSelectedContextKey.set(selection.length > 1);
        }));
        this._register(list.onDidChangeFindOpenState(open => {
            this.sessionsListFindIsOpen = open;
            this.updateSectionCollapseStates();
        }));
        this._register(list.onDidChangeCollapseState(e => {
            if (this._isProgrammaticCollapseChange) {
                return;
            }
            const element = e.node.element?.element;
            if (element && isAgentSessionSection(element)) {
                this.saveSectionCollapseState(element.section, e.node.collapsed);
            }
        }));
    }
    updateEmpty(isEmpty) {
        if (!this.emptyFilterMessage || !this.sessionsList) {
            return;
        }
        const model = this.agentSessionsService.model;
        const hasSessionsInModel = model.sessions.length > 0;
        const isFilterActive = !this.options.filter.isDefault();
        const showEmpty = hasSessionsInModel && isEmpty && isFilterActive;
        setVisibility(showEmpty, this.emptyFilterMessage);
        setVisibility(!showEmpty, this.sessionsList.getHTMLElement());
    }
    hasTodaySessions() {
        const startOfToday = new Date().setHours(0, 0, 0, 0);
        return this.agentSessionsService.model.sessions.some(session => !session.isArchived() &&
            session.timing.created >= startOfToday);
    }
    async openAgentSession(e) {
        const element = e.element;
        if (!element || isAgentSessionSection(element)) {
            return; // Section headers are not openable
        }
        this.telemetryService.publicLog2('agentSessionOpened', {
            providerType: element.providerType,
            source: this.options.source
        });
        const options = this.options.overrideSessionOpenOptions?.(e) ?? e;
        if (this.options.overrideSessionOpen) {
            await this.options.overrideSessionOpen(element.resource, options);
        }
        else {
            const widget = await this.instantiationService.invokeFunction(openSession, element, options);
            if (widget) {
                this.options.notifySessionOpened?.(element.resource, widget);
            }
        }
    }
    async showContextMenu({ element, anchor, browserEvent }) {
        if (!element) {
            return;
        }
        EventHelper.stop(browserEvent, true);
        if (isAgentSessionSection(element)) {
            this.showAgentSessionSectionContextMenu(element, anchor);
        }
        else {
            this.showAgentSessionContextMenu(element, anchor);
        }
    }
    async showAgentSessionSectionContextMenu(section, anchor) {
        const contextOverlay = [];
        contextOverlay.push([ChatContextKeys.agentSessionSection.key, section.section]);
        const menu = this.menuService.createMenu(MenuId.AgentSessionSectionContext, this.contextKeyService.createOverlay(contextOverlay));
        this.contextMenuService.showContextMenu({
            getActions: () => Separator.join(...menu.getActions({ arg: section, shouldForwardArgs: true }).map(([, actions]) => actions)),
            getAnchor: () => anchor,
            getActionsContext: () => section,
        });
        menu.dispose();
    }
    async showAgentSessionContextMenu(session, anchor) {
        this.chatSessionsService.activateChatSessionItemProvider(session.providerType);
        const contextOverlay = [];
        contextOverlay.push([ChatContextKeys.isArchivedAgentSession.key, session.isArchived()]);
        contextOverlay.push([ChatContextKeys.isPinnedAgentSession.key, session.isPinned()]);
        contextOverlay.push([ChatContextKeys.isReadAgentSession.key, session.isRead()]);
        contextOverlay.push([ChatContextKeys.agentSessionType.key, session.providerType]);
        const menu = this.menuService.createMenu(MenuId.AgentSessionsContext, this.contextKeyService.createOverlay(contextOverlay));
        const selection = this.sessionsList?.getSelection().filter(isAgentSession) ?? [];
        const marshalledContext = {
            session,
            sessions: selection.length > 1 && selection.includes(session) ? selection : [session],
            $mid: 25 /* MarshalledId.AgentSessionContext */
        };
        this.contextMenuService.showContextMenu({
            getActions: () => Separator.join(...menu.getActions({ arg: marshalledContext, shouldForwardArgs: true }).map(([, actions]) => actions)),
            getAnchor: () => anchor,
            getActionsContext: () => marshalledContext,
        });
        menu.dispose();
    }
    openFind() {
        this.sessionsList?.openFind();
    }
    updateSectionCollapseStates() {
        if (!this.sessionsList) {
            return;
        }
        this._isProgrammaticCollapseChange = true;
        try {
            this._updateSectionCollapseStatesCore();
        }
        finally {
            this._isProgrammaticCollapseChange = false;
        }
    }
    _updateSectionCollapseStatesCore() {
        if (!this.sessionsList) {
            return;
        }
        const model = this.agentSessionsService.model;
        for (const child of this.sessionsList.getNode(model).children) {
            if (!isAgentSessionSection(child.element)) {
                continue;
            }
            switch (child.element.section) {
                case "archived" /* AgentSessionSection.Archived */: {
                    const shouldCollapseArchived = !this.sessionsListFindIsOpen && // always expand when find is open
                        this.options.filter.getExcludes().archived; // only collapse when archived are excluded from filter
                    if (shouldCollapseArchived && !child.collapsed) {
                        this.sessionsList.collapse(child.element);
                    }
                    else if (!shouldCollapseArchived && child.collapsed) {
                        this.sessionsList.expand(child.element);
                    }
                    break;
                }
                case "more" /* AgentSessionSection.More */: {
                    if (child.collapsed && this.sessionsListFindIsOpen) {
                        this.sessionsList.expand(child.element); // always expand when find is open
                    }
                    break;
                }
            }
        }
    }
    refresh() {
        return this.agentSessionsService.model.resolve(undefined);
    }
    async update() {
        return this.updateSessionsListThrottler.queue(async () => {
            await this.sessionsList?.updateChildren();
            this._onDidUpdate.fire();
        });
    }
    setVisible(visible) {
        if (this.visible === visible) {
            return;
        }
        this.visible = visible;
        if (this.visible) {
            this.update();
        }
    }
    layout(height, width) {
        this.sessionsList?.layout(height, width);
    }
    focus() {
        this.sessionsList?.domFocus();
    }
    clearFocus() {
        this.sessionsList?.setFocus([]);
        this.sessionsList?.setSelection([]);
    }
    hasFocusOrSelection() {
        return (this.sessionsList?.getFocus().length ?? 0) > 0 || (this.sessionsList?.getSelection().length ?? 0) > 0;
    }
    scrollToTop() {
        if (this.sessionsList) {
            this.sessionsList.scrollTop = 0;
        }
    }
    getFocus() {
        const focused = this.sessionsList?.getFocus() ?? [];
        return focused.filter(e => isAgentSession(e));
    }
    reveal(sessionResource) {
        if (!this.sessionsList) {
            return false;
        }
        const session = this.agentSessionsService.model.getSession(sessionResource);
        if (!session || !this.sessionsList.hasNode(session)) {
            return false;
        }
        if (this.sessionsList.getRelativeTop(session) === null) {
            this.sessionsList.reveal(session, 0.5); // only reveal when not already visible
        }
        this.sessionsList.setFocus([session]);
        this.sessionsList.setSelection([session]);
        return true;
    }
};
AgentSessionsControl = AgentSessionsControl_1 = __decorate([
    __param(2, IContextMenuService),
    __param(3, IContextKeyService),
    __param(4, IInstantiationService),
    __param(5, IChatSessionsService),
    __param(6, ICommandService),
    __param(7, IMenuService),
    __param(8, IAgentSessionsService),
    __param(9, ITelemetryService),
    __param(10, IEditorService),
    __param(11, IStorageService),
    __param(12, ILogService)
], AgentSessionsControl);
export { AgentSessionsControl };
//# sourceMappingURL=agentSessionsControl.js.map