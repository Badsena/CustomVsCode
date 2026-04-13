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
import { registerSingleton } from '../../../../../../platform/instantiation/common/extensions.js';
import { MenuId, MenuRegistry, registerAction2 } from '../../../../../../platform/actions/common/actions.js';
import { IAgentSessionProjectionService, AgentSessionProjectionService, AGENT_SESSION_PROJECTION_ENABLED_PROVIDERS } from './agentSessionProjectionService.js';
import { EnterAgentSessionProjectionAction, ExitAgentSessionProjectionAction, ToggleAgentStatusAction, ToggleUnifiedAgentsBarAction } from './agentSessionProjectionActions.js';
import { registerWorkbenchContribution2 } from '../../../../../common/contributions.js';
import { AgentTitleBarStatusRendering } from './agentTitleBarStatusWidget.js';
import { AgentTitleBarStatusService, IAgentTitleBarStatusService } from './agentTitleBarStatusService.js';
import { Codicon } from '../../../../../../base/common/codicons.js';
import { localize } from '../../../../../../nls.js';
import { ContextKeyExpr } from '../../../../../../platform/contextkey/common/contextkey.js';
import { ProductQualityContext } from '../../../../../../platform/contextkey/common/contextkeys.js';
import { ChatAgentLocation, ChatConfiguration } from '../../../common/constants.js';
import { ChatContextKeys } from '../../../common/actions/chatContextKeys.js';
import { Disposable, DisposableStore } from '../../../../../../base/common/lifecycle.js';
import { IChatWidgetService } from '../../chat.js';
import { IConfigurationService } from '../../../../../../platform/configuration/common/configuration.js';
import { IAgentSessionsService } from '../agentSessionsService.js';
import { AgentSessionProviders } from '../agentSessions.js';
import { IChatEditingService } from '../../../common/editing/chatEditingService.js';
import { isSessionInProgressStatus } from '../agentSessionsModel.js';
import { autorun } from '../../../../../../base/common/observable.js';
import './unifiedQuickAccessActions.js'; // Register unified quick access actions
/**
 * Contribution that watches for projection-capable sessions and shows
 * the "session ready" state in the title bar when changes are available for review.
 */
let AgentSessionReadyContribution = class AgentSessionReadyContribution extends Disposable {
    static { this.ID = 'chat.agentSessionReady'; }
    constructor(chatWidgetService, configurationService, agentTitleBarStatusService, agentSessionsService, agentSessionProjectionService, chatEditingService) {
        super();
        this.chatWidgetService = chatWidgetService;
        this.configurationService = configurationService;
        this.agentTitleBarStatusService = agentTitleBarStatusService;
        this.agentSessionsService = agentSessionsService;
        this.agentSessionProjectionService = agentSessionProjectionService;
        this.chatEditingService = chatEditingService;
        this._widgetDisposables = this._register(new DisposableStore());
        this._suppressSessionReady = false; // Suppress re-showing session-ready after user explicitly exits projection
        // Monitor existing widgets
        for (const widget of this.chatWidgetService.getAllWidgets()) {
            if (widget.location === ChatAgentLocation.Chat) {
                this._watchWidget(widget);
            }
        }
        // Monitor new widgets
        this._register(this.chatWidgetService.onDidAddWidget(widget => {
            if (widget.location === ChatAgentLocation.Chat) {
                this._watchWidget(widget);
            }
        }));
        // When projection mode exits, suppress session-ready for the same session
        this._register(this.agentSessionProjectionService.onDidChangeProjectionMode(isActive => {
            if (!isActive) {
                // User explicitly exited projection - suppress re-showing session-ready for this session
                this._suppressSessionReady = true;
                this._clearEntriesWatcher();
                this.agentTitleBarStatusService.exitSessionReadyMode();
            }
        }));
        // Also watch for editing session changes - an editing session might be created after the chat is opened
        this._register(autorun(reader => {
            // Read the observable to track changes
            this.chatEditingService.editingSessionsObs.read(reader);
            // When editing sessions change, re-check the current session
            const currentWidget = this.chatWidgetService.getAllWidgets().find(w => w.location === ChatAgentLocation.Chat);
            if (currentWidget) {
                this._checkSession(currentWidget.viewModel?.sessionResource);
            }
        }));
        // Watch for agent sessions model changes - sessions are resolved asynchronously
        this._register(this.agentSessionsService.model.onDidChangeSessions(() => {
            const currentWidget = this.chatWidgetService.getAllWidgets().find(w => w.location === ChatAgentLocation.Chat);
            if (currentWidget) {
                this._checkSession(currentWidget.viewModel?.sessionResource);
            }
        }));
    }
    _watchWidget(widget) {
        // Clear previous disposables when switching widgets
        this._widgetDisposables.clear();
        // Check initial state
        this._checkSession(widget.viewModel?.sessionResource);
        // Watch for viewmodel changes
        this._widgetDisposables.add(widget.onDidChangeViewModel(() => {
            this._checkSession(widget.viewModel?.sessionResource);
        }));
    }
    _checkSession(sessionResource) {
        // Clear the suppress flag when switching to a different session
        if (sessionResource?.toString() !== this._watchedSessionResource?.toString()) {
            this._suppressSessionReady = false;
        }
        // If we're in projection mode and switching to a different session,
        // automatically enter projection for the new session (if eligible)
        if (this.agentSessionProjectionService.isActive) {
            const activeSession = this.agentSessionProjectionService.activeSession;
            if (sessionResource && activeSession && sessionResource.toString() !== activeSession.resource.toString()) {
                const newSession = this.agentSessionsService.getSession(sessionResource);
                if (newSession) {
                    // enterProjection handles session switching and will check eligibility
                    this.agentSessionProjectionService.enterProjection(newSession);
                }
            }
            return;
        }
        // Update state based on current session
        this._updateSessionReadyState(sessionResource);
    }
    _clearEntriesWatcher() {
        this._entriesWatcher?.dispose();
        this._entriesWatcher = undefined;
        this._watchedSessionResource = undefined;
    }
    _updateSessionReadyState(sessionResource) {
        // Check if projection is enabled
        const isEnabled = this.configurationService.getValue(ChatConfiguration.AgentSessionProjectionEnabled);
        if (!isEnabled) {
            this._clearEntriesWatcher();
            this.agentTitleBarStatusService.exitSessionReadyMode();
            return;
        }
        // If already in projection mode, don't show session-ready (handled by _checkSession)
        if (this.agentSessionProjectionService.isActive) {
            this._clearEntriesWatcher();
            return;
        }
        if (!sessionResource) {
            this._clearEntriesWatcher();
            this.agentTitleBarStatusService.exitSessionReadyMode();
            return;
        }
        // Get the session
        const session = this.agentSessionsService.getSession(sessionResource);
        if (!session) {
            this._clearEntriesWatcher();
            this.agentTitleBarStatusService.exitSessionReadyMode();
            return;
        }
        // Check if this is a projection-capable provider
        if (!AGENT_SESSION_PROJECTION_ENABLED_PROVIDERS.has(session.providerType)) {
            this._clearEntriesWatcher();
            this.agentTitleBarStatusService.exitSessionReadyMode();
            return;
        }
        // Check if session is in progress
        if (isSessionInProgressStatus(session.status)) {
            this._clearEntriesWatcher();
            this.agentTitleBarStatusService.exitSessionReadyMode();
            return;
        }
        let hasPendingChanges = false;
        if (session.providerType === AgentSessionProviders.Local) {
            // Local sessions track undecided edits via the editing service
            const editingSession = this.chatEditingService.getEditingSession(sessionResource);
            if (!editingSession) {
                this._clearEntriesWatcher();
                this.agentTitleBarStatusService.exitSessionReadyMode();
                return;
            }
            const entries = editingSession.entries.get();
            hasPendingChanges = entries.some(entry => entry.state.get() === 0 /* ModifiedFileEntryState.Modified */);
            if (hasPendingChanges && !this._suppressSessionReady) {
                this.agentTitleBarStatusService.enterSessionReadyMode(session.resource, session.label);
                if (!this._watchedSessionResource || this._watchedSessionResource.toString() !== sessionResource.toString()) {
                    this._clearEntriesWatcher();
                    this._watchedSessionResource = sessionResource;
                    // Monitor the entries for changes
                    this._entriesWatcher = autorun(reader => {
                        const currentEntries = editingSession.entries.read(reader);
                        const stillHasChanges = currentEntries.some(entry => entry.state.read(reader) === 0 /* ModifiedFileEntryState.Modified */);
                        if (!stillHasChanges) {
                            this.agentTitleBarStatusService.exitSessionReadyMode();
                        }
                    });
                }
            }
            else {
                this._clearEntriesWatcher();
                this.agentTitleBarStatusService.exitSessionReadyMode();
            }
        }
        else {
            // Cloud/remote sessions: rely on changes array from the session
            this._clearEntriesWatcher();
            const changeCount = Array.isArray(session.changes)
                ? session.changes.filter(change => !!change.originalUri).length
                : 0;
            hasPendingChanges = changeCount > 0;
            if (hasPendingChanges && !this._suppressSessionReady) {
                this.agentTitleBarStatusService.enterSessionReadyMode(session.resource, session.label);
            }
            else {
                this.agentTitleBarStatusService.exitSessionReadyMode();
            }
        }
    }
};
AgentSessionReadyContribution = __decorate([
    __param(0, IChatWidgetService),
    __param(1, IConfigurationService),
    __param(2, IAgentTitleBarStatusService),
    __param(3, IAgentSessionsService),
    __param(4, IAgentSessionProjectionService),
    __param(5, IChatEditingService)
], AgentSessionReadyContribution);
// #region Agent Session Projection & Status
registerAction2(EnterAgentSessionProjectionAction);
registerAction2(ExitAgentSessionProjectionAction);
registerAction2(ToggleAgentStatusAction);
registerAction2(ToggleUnifiedAgentsBarAction);
registerSingleton(IAgentSessionProjectionService, AgentSessionProjectionService, 1 /* InstantiationType.Delayed */);
registerSingleton(IAgentTitleBarStatusService, AgentTitleBarStatusService, 1 /* InstantiationType.Delayed */);
registerWorkbenchContribution2(AgentTitleBarStatusRendering.ID, AgentTitleBarStatusRendering, 3 /* WorkbenchPhase.AfterRestored */);
registerWorkbenchContribution2(AgentSessionReadyContribution.ID, AgentSessionReadyContribution, 3 /* WorkbenchPhase.AfterRestored */);
// Register Agent Status as a menu item in the command center (alongside the search box, not replacing it)
MenuRegistry.appendMenuItem(MenuId.CommandCenter, {
    submenu: MenuId.AgentsTitleBarControlMenu,
    title: localize(6285, null),
    icon: Codicon.chatSparkle,
    when: ContextKeyExpr.and(ChatContextKeys.enabled, ContextKeyExpr.or(ContextKeyExpr.has(`config.${ChatConfiguration.AgentStatusEnabled}`), ContextKeyExpr.has(`config.${ChatConfiguration.UnifiedAgentsBar}`))),
    order: 10002 // to the right of the chat button
});
// Add to the global title bar if command center is disabled
MenuRegistry.appendMenuItem(MenuId.TitleBar, {
    submenu: MenuId.ChatTitleBarMenu,
    title: localize(6286, null),
    group: 'navigation',
    icon: Codicon.chatSparkle,
    when: ContextKeyExpr.and(ChatContextKeys.supported, ContextKeyExpr.and(ChatContextKeys.Setup.hidden.negate(), ChatContextKeys.Setup.disabled.negate()), ContextKeyExpr.has(`config.${ChatConfiguration.AgentStatusEnabled}`), ContextKeyExpr.has('config.window.commandCenter').negate()),
    order: 1
});
// Register a placeholder action to the submenu so it appears (required for submenus)
MenuRegistry.appendMenuItem(MenuId.AgentsTitleBarControlMenu, {
    command: {
        id: 'workbench.action.chat.toggle',
        title: localize(6287, null),
    },
    when: ContextKeyExpr.and(ChatContextKeys.enabled, ContextKeyExpr.or(ContextKeyExpr.has(`config.${ChatConfiguration.AgentStatusEnabled}`), ContextKeyExpr.has(`config.${ChatConfiguration.UnifiedAgentsBar}`))),
    group: 'a_open',
    order: 1
});
// Toggle for Agent Quick Input (Insiders only)
MenuRegistry.appendMenuItem(MenuId.AgentsTitleBarControlMenu, {
    command: {
        id: `toggle.${ChatConfiguration.UnifiedAgentsBar}`,
        title: localize(6288, null),
        toggled: ContextKeyExpr.has(`config.${ChatConfiguration.UnifiedAgentsBar}`),
    },
    when: ContextKeyExpr.and(ChatContextKeys.enabled, ProductQualityContext.notEqualsTo('stable')),
    group: 'z_experimental',
    order: 10
});
//#endregion
//# sourceMappingURL=agentSessionsExperiments.contribution.js.map