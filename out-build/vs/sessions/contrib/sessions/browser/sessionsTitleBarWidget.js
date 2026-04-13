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
import './media/sessionsTitleBarWidget.css';
import { $, addDisposableListener, EventType, getActiveWindow, reset } from '../../../../base/browser/dom.js';
import { Separator } from '../../../../base/common/actions.js';
import { Disposable, DisposableStore, MutableDisposable } from '../../../../base/common/lifecycle.js';
import { StandardMouseEvent } from '../../../../base/browser/mouseEvent.js';
import { localize } from '../../../../nls.js';
import { IHoverService } from '../../../../platform/hover/browser/hover.js';
import { getDefaultHoverDelegate } from '../../../../base/browser/ui/hover/hoverDelegateFactory.js';
import { BaseActionViewItem } from '../../../../base/browser/ui/actionbar/actionViewItems.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { IMenuService, MenuId, MenuRegistry, SubmenuItemAction } from '../../../../platform/actions/common/actions.js';
import { IContextKeyService, ContextKeyExpr } from '../../../../platform/contextkey/common/contextkey.js';
import { IContextMenuService } from '../../../../platform/contextview/browser/contextView.js';
import { ChatContextKeys } from '../../../../workbench/contrib/chat/common/actions/chatContextKeys.js';
import { getAgentChangesSummary, hasValidDiff } from '../../../../workbench/contrib/chat/browser/agentSessions/agentSessionsModel.js';
import { IChatSessionsService } from '../../../../workbench/contrib/chat/common/chatSessionsService.js';
import { Menus } from '../../../browser/menus.js';
import { IActionViewItemService } from '../../../../platform/actions/browser/actionViewItemService.js';
import { IAgentSessionsService } from '../../../../workbench/contrib/chat/browser/agentSessions/agentSessionsService.js';
import { ISessionsManagementService } from './sessionsManagementService.js';
import { FocusAgentSessionsAction } from '../../../../workbench/contrib/chat/browser/agentSessions/agentSessionsActions.js';
import { AgentSessionsPicker } from '../../../../workbench/contrib/chat/browser/agentSessions/agentSessionsPicker.js';
import { autorun } from '../../../../base/common/observable.js';
import { IChatService } from '../../../../workbench/contrib/chat/common/chatService/chatService.js';
import { ThemeIcon } from '../../../../base/common/themables.js';
import { AgentSessionProviders, getAgentSessionProvider, getAgentSessionProviderIcon } from '../../../../workbench/contrib/chat/browser/agentSessions/agentSessions.js';
import { Codicon } from '../../../../base/common/codicons.js';
import { basename } from '../../../../base/common/resources.js';
import { IsAuxiliaryWindowContext } from '../../../../workbench/common/contextkeys.js';
import { SessionsWelcomeVisibleContext } from '../../../common/contextkeys.js';
/**
 * Sessions Title Bar Widget - renders the active chat session title
 * in the command center of the agent sessions workbench.
 *
 * Shows the current chat session label as a clickable pill with:
 * - Kind icon at the beginning (provider type icon)
 * - Session title
 * - Repository folder name
 *
 * Session actions (changes, terminal, etc.) are rendered via the
 * SessionTitleActions menu toolbar next to the session title.
 *
 * On click, opens the sessions picker.
 */
let SessionsTitleBarWidget = class SessionsTitleBarWidget extends BaseActionViewItem {
    constructor(action, options, instantiationService, hoverService, activeSessionService, chatService, agentSessionsService, contextMenuService, menuService, contextKeyService, chatSessionsService) {
        super(undefined, action, options);
        this.instantiationService = instantiationService;
        this.hoverService = hoverService;
        this.activeSessionService = activeSessionService;
        this.chatService = chatService;
        this.agentSessionsService = agentSessionsService;
        this.contextMenuService = contextMenuService;
        this.menuService = menuService;
        this.contextKeyService = contextKeyService;
        this.chatSessionsService = chatSessionsService;
        this._dynamicDisposables = this._register(new DisposableStore());
        this._modelChangeListener = this._register(new MutableDisposable());
        /** Guard to prevent re-entrant rendering */
        this._isRendering = false;
        // Re-render when the active session changes
        this._register(autorun(reader => {
            const activeSession = this.activeSessionService.activeSession.read(reader);
            this._trackModelTitleChanges(activeSession?.resource);
            this._lastRenderState = undefined;
            this._render();
        }));
        // Re-render when sessions data changes (e.g., changes info updated)
        this._register(this.agentSessionsService.model.onDidChangeSessions(() => {
            this._lastRenderState = undefined;
            this._render();
        }));
    }
    render(container) {
        super.render(container);
        this._container = container;
        container.classList.add('agent-sessions-titlebar-container');
        // Initial render
        this._render();
    }
    setFocusable(_focusable) {
        // Don't set focusable on the container
    }
    // Override onClick to prevent the base class from running the underlying
    // submenu action when the widget handles clicks itself.
    onClick() {
        // No-op: click handling is done by the pill handler
    }
    _render() {
        if (!this._container) {
            return;
        }
        if (this._isRendering) {
            return;
        }
        this._isRendering = true;
        try {
            const label = this._getActiveSessionLabel();
            const icon = this._getActiveSessionIcon();
            const repoLabel = this._getRepositoryLabel();
            const changesSummary = this._getChangesSummary();
            // Build a render-state key from all displayed data
            const renderState = `${icon?.id ?? ''}|${label}|${repoLabel ?? ''}|${changesSummary?.insertions ?? ''}|${changesSummary?.deletions ?? ''}`;
            // Skip re-render if state hasn't changed
            if (this._lastRenderState === renderState) {
                return;
            }
            this._lastRenderState = renderState;
            // Clear existing content
            reset(this._container);
            this._dynamicDisposables.clear();
            // Set up container as the button directly
            this._container.setAttribute('role', 'button');
            this._container.setAttribute('aria-label', localize(3302, null));
            this._container.tabIndex = 0;
            // Session pill: icon + label + folder together
            const sessionPill = $('span.agent-sessions-titlebar-pill');
            // Center group: icon + label + folder
            const centerGroup = $('span.agent-sessions-titlebar-center');
            // Kind icon at the beginning
            if (icon) {
                const iconEl = $('span.agent-sessions-titlebar-icon' + ThemeIcon.asCSSSelector(icon));
                centerGroup.appendChild(iconEl);
            }
            // Label
            const labelEl = $('span.agent-sessions-titlebar-label');
            labelEl.textContent = label;
            centerGroup.appendChild(labelEl);
            // Folder shown next to the title
            if (repoLabel) {
                const separator1 = $('span.agent-sessions-titlebar-separator');
                separator1.textContent = '\u00B7';
                centerGroup.appendChild(separator1);
                const repoEl = $('span.agent-sessions-titlebar-repo');
                repoEl.textContent = repoLabel;
                centerGroup.appendChild(repoEl);
            }
            // Changes summary shown next to the repo
            if (changesSummary) {
                const separator2 = $('span.agent-sessions-titlebar-separator');
                separator2.textContent = '\u00B7';
                centerGroup.appendChild(separator2);
                const changesEl = $('span.agent-sessions-titlebar-changes');
                const addedEl = $('span.agent-sessions-titlebar-changes-added');
                addedEl.textContent = `+${changesSummary.insertions}`;
                changesEl.appendChild(addedEl);
                const removedEl = $('span.agent-sessions-titlebar-changes-removed');
                removedEl.textContent = `-${changesSummary.deletions}`;
                changesEl.appendChild(removedEl);
                centerGroup.appendChild(changesEl);
            }
            sessionPill.appendChild(centerGroup);
            // Click handler on pill - show sessions picker
            this._dynamicDisposables.add(addDisposableListener(sessionPill, EventType.MOUSE_DOWN, (e) => {
                e.preventDefault();
                e.stopPropagation();
            }));
            this._dynamicDisposables.add(addDisposableListener(sessionPill, EventType.CLICK, (e) => {
                e.preventDefault();
                e.stopPropagation();
                this._showSessionsPicker();
            }));
            this._dynamicDisposables.add(addDisposableListener(sessionPill, EventType.CONTEXT_MENU, (e) => {
                e.preventDefault();
                e.stopPropagation();
                this._showContextMenu(e);
            }));
            this._container.appendChild(sessionPill);
            // Hover
            this._dynamicDisposables.add(this.hoverService.setupManagedHover(getDefaultHoverDelegate('mouse'), sessionPill, label));
            // Keyboard handler
            this._dynamicDisposables.add(addDisposableListener(this._container, EventType.KEY_DOWN, (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    e.stopPropagation();
                    this._showSessionsPicker();
                }
            }));
        }
        finally {
            this._isRendering = false;
        }
    }
    /**
     * Track title changes on the chat model for the given session resource.
     * When the model title changes, re-render the widget.
     */
    _trackModelTitleChanges(sessionResource) {
        this._modelChangeListener.clear();
        if (!sessionResource) {
            return;
        }
        const model = this.chatService.getSession(sessionResource);
        if (!model) {
            return;
        }
        this._modelChangeListener.value = model.onDidChange(e => {
            if (e.kind === 'setCustomTitle' || e.kind === 'addRequest') {
                this._lastRenderState = undefined;
                this._render();
            }
        });
    }
    /**
     * Get the label of the active chat session.
     */
    _getActiveSessionLabel() {
        const activeSession = this.activeSessionService.getActiveSession();
        const label = activeSession?.label;
        if (label) {
            return label; // prefer session label to support renamed sessions
        }
        if (activeSession) {
            const activeModel = this.chatService.getSession(activeSession.resource);
            if (activeModel?.title) {
                return activeModel.title; // fall back to chat model title if available
            }
        }
        return localize(3303, null);
    }
    /**
     * Get the icon for the active session's kind/provider.
     */
    _getActiveSessionIcon() {
        const activeSession = this.activeSessionService.getActiveSession();
        if (!activeSession) {
            return undefined;
        }
        // Try to get icon from the agent session model (has provider-resolved icon)
        const agentSession = this.agentSessionsService.getSession(activeSession.resource);
        if (agentSession) {
            // For background sessions, distinguish worktree vs folder based on metadata
            if (agentSession.providerType === AgentSessionProviders.Background) {
                const hasWorktree = typeof agentSession.metadata?.worktreePath === 'string';
                return hasWorktree ? Codicon.worktree : Codicon.folder;
            }
            return agentSession.icon;
        }
        // Fall back to provider icon from the resource
        const provider = getAgentSessionProvider(activeSession.resource);
        if (provider !== undefined) {
            return getAgentSessionProviderIcon(provider);
        }
        return undefined;
    }
    /**
     * Get the repository label for the active session.
     */
    _getRepositoryLabel() {
        const activeSession = this.activeSessionService.getActiveSession();
        if (!activeSession) {
            return undefined;
        }
        const uri = activeSession.repository;
        if (!uri) {
            return undefined;
        }
        return basename(uri);
    }
    _showContextMenu(e) {
        const activeSession = this.activeSessionService.getActiveSession();
        if (!activeSession) {
            return;
        }
        const agentSession = this.agentSessionsService.getSession(activeSession.resource);
        if (!agentSession) {
            return;
        }
        this.chatSessionsService.activateChatSessionItemProvider(agentSession.providerType);
        const contextOverlay = [
            [ChatContextKeys.isArchivedAgentSession.key, agentSession.isArchived()],
            [ChatContextKeys.isPinnedAgentSession.key, agentSession.isPinned()],
            [ChatContextKeys.isReadAgentSession.key, agentSession.isRead()],
            [ChatContextKeys.agentSessionType.key, agentSession.providerType],
        ];
        const menu = this.menuService.createMenu(MenuId.AgentSessionsContext, this.contextKeyService.createOverlay(contextOverlay));
        const marshalledContext = {
            session: agentSession,
            sessions: [agentSession],
            $mid: 25 /* MarshalledId.AgentSessionContext */,
        };
        this.contextMenuService.showContextMenu({
            getActions: () => Separator.join(...menu.getActions({ arg: marshalledContext, shouldForwardArgs: true }).map(([, actions]) => actions)),
            getAnchor: () => new StandardMouseEvent(getActiveWindow(), e),
            getActionsContext: () => marshalledContext
        });
        menu.dispose();
    }
    /**
     * Get the changes summary for the active session.
     */
    _getChangesSummary() {
        const activeSession = this.activeSessionService.getActiveSession();
        if (!activeSession) {
            return undefined;
        }
        const agentSession = this.agentSessionsService.getSession(activeSession.resource);
        const changes = agentSession?.changes;
        if (!changes || !hasValidDiff(changes)) {
            return undefined;
        }
        return getAgentChangesSummary(changes);
    }
    _showSessionsPicker() {
        const picker = this.instantiationService.createInstance(AgentSessionsPicker, undefined, {
            overrideSessionOpen: (session, openOptions) => this.activeSessionService.openSession(session.resource, openOptions)
        });
        picker.pickAgentSession();
    }
};
SessionsTitleBarWidget = __decorate([
    __param(2, IInstantiationService),
    __param(3, IHoverService),
    __param(4, ISessionsManagementService),
    __param(5, IChatService),
    __param(6, IAgentSessionsService),
    __param(7, IContextMenuService),
    __param(8, IMenuService),
    __param(9, IContextKeyService),
    __param(10, IChatSessionsService)
], SessionsTitleBarWidget);
export { SessionsTitleBarWidget };
/**
 * Provides custom rendering for the sessions title bar widget
 * in the command center. Uses IActionViewItemService to render a custom widget
 * for the TitleBarControlMenu submenu.
 */
let SessionsTitleBarContribution = class SessionsTitleBarContribution extends Disposable {
    static { this.ID = 'workbench.contrib.agentSessionsTitleBar'; }
    constructor(actionViewItemService, instantiationService) {
        super();
        // Register the submenu item in the Agent Sessions command center
        this._register(MenuRegistry.appendMenuItem(Menus.CommandCenter, {
            submenu: Menus.TitleBarSessionTitle,
            title: localize(3304, null),
            order: 101,
            when: ContextKeyExpr.and(IsAuxiliaryWindowContext.negate(), SessionsWelcomeVisibleContext.negate())
        }));
        // Register a placeholder action so the submenu appears
        this._register(MenuRegistry.appendMenuItem(Menus.TitleBarSessionTitle, {
            command: {
                id: FocusAgentSessionsAction.id,
                title: localize(3305, null),
            },
            group: 'a_sessions',
            order: 1,
            when: IsAuxiliaryWindowContext.negate()
        }));
        this._register(actionViewItemService.register(Menus.CommandCenter, Menus.TitleBarSessionTitle, (action, options) => {
            if (!(action instanceof SubmenuItemAction)) {
                return undefined;
            }
            return instantiationService.createInstance(SessionsTitleBarWidget, action, options);
        }, undefined));
    }
};
SessionsTitleBarContribution = __decorate([
    __param(0, IActionViewItemService),
    __param(1, IInstantiationService)
], SessionsTitleBarContribution);
export { SessionsTitleBarContribution };
//# sourceMappingURL=sessionsTitleBarWidget.js.map