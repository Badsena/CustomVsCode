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
import './media/agentsessionprojection.css';
import { Emitter } from '../../../../../../base/common/event.js';
import { Disposable } from '../../../../../../base/common/lifecycle.js';
import { localize } from '../../../../../../nls.js';
import { IContextKeyService } from '../../../../../../platform/contextkey/common/contextkey.js';
import { IConfigurationService } from '../../../../../../platform/configuration/common/configuration.js';
import { createDecorator } from '../../../../../../platform/instantiation/common/instantiation.js';
import { ILogService } from '../../../../../../platform/log/common/log.js';
import { IEditorGroupsService } from '../../../../../services/editor/common/editorGroupsService.js';
import { IEditorService, MODAL_GROUP } from '../../../../../services/editor/common/editorService.js';
import { ICommandService } from '../../../../../../platform/commands/common/commands.js';
import { isSessionInProgressStatus } from '../agentSessionsModel.js';
import { IChatWidgetService } from '../../chat.js';
import { AgentSessionProviders } from '../agentSessions.js';
import { IChatSessionsService } from '../../../common/chatSessionsService.js';
import { IWorkbenchLayoutService } from '../../../../../services/layout/browser/layoutService.js';
import { ACTION_ID_NEW_CHAT } from '../../actions/chatActions.js';
import { IChatEditingService } from '../../../common/editing/chatEditingService.js';
import { IAgentTitleBarStatusService } from './agentTitleBarStatusService.js';
import { inAgentSessionProjection } from './agentSessionProjection.js';
import { ChatConfiguration } from '../../../common/constants.js';
import { IAgentSessionsService } from '../agentSessionsService.js';
//#region Configuration
/**
 * Provider types that support agent session projection mode.
 * Only sessions from these providers will trigger projection mode.
 */
export const AGENT_SESSION_PROJECTION_ENABLED_PROVIDERS = new Set(Object.values(AgentSessionProviders));
export const IAgentSessionProjectionService = createDecorator('agentSessionProjectionService');
//#endregion
//#region Agent Session Projection Service Implementation
let AgentSessionProjectionService = class AgentSessionProjectionService extends Disposable {
    get isActive() { return this._isActive; }
    get activeSession() { return this._activeSession; }
    constructor(contextKeyService, configurationService, editorGroupsService, editorService, logService, chatWidgetService, chatSessionsService, layoutService, commandService, chatEditingService, agentTitleBarStatusService, agentSessionsService) {
        super();
        this.configurationService = configurationService;
        this.editorGroupsService = editorGroupsService;
        this.editorService = editorService;
        this.logService = logService;
        this.chatWidgetService = chatWidgetService;
        this.chatSessionsService = chatSessionsService;
        this.layoutService = layoutService;
        this.commandService = commandService;
        this.chatEditingService = chatEditingService;
        this.agentTitleBarStatusService = agentTitleBarStatusService;
        this.agentSessionsService = agentSessionsService;
        this._isActive = false;
        /** Prevents re-entrant exits and enter-on-exit races */
        this._isExiting = false;
        /** Prevents checkForEmptyEditors from exiting during session swaps */
        this._isSwappingSessions = false;
        this._onDidChangeProjectionMode = this._register(new Emitter());
        this.onDidChangeProjectionMode = this._onDidChangeProjectionMode.event;
        this._onDidChangeActiveSession = this._register(new Emitter());
        this.onDidChangeActiveSession = this._onDidChangeActiveSession.event;
        /** Working sets per session, keyed by session resource URI string */
        this._sessionWorkingSets = new Map();
        /** Whether the auxiliary bar was maximized when entering projection mode */
        this._wasAuxiliaryBarMaximized = false;
        this._inProjectionModeContextKey = inAgentSessionProjection.bindTo(contextKeyService);
        // Listen for editor close events to exit projection mode when all editors are closed
        this._register(this.editorService.onDidCloseEditor(() => this._checkForEmptyEditors()));
        // Listen for session changes to exit projection mode if active session becomes in progress
        // Note: onDidChangeSessions fires for any session change, but _checkForInProgressSession()
        // has early exit guards and only checks when projection mode is active, making this efficient
        this._register(this.agentSessionsService.model.onDidChangeSessions(() => this._checkForInProgressSession()));
    }
    _isEnabled() {
        return this.configurationService.getValue(ChatConfiguration.AgentSessionProjectionEnabled) === true;
    }
    _checkForEmptyEditors() {
        // Only check if we're in projection mode and not swapping sessions
        if (!this._isActive || this._isExiting || this._isSwappingSessions) {
            return;
        }
        // Check if there are any visible editors
        const hasVisibleEditors = this.editorService.visibleEditors.length > 0;
        if (!hasVisibleEditors) {
            this.logService.trace('[AgentSessionProjection] All editors closed, exiting projection mode');
            this.exitProjection();
        }
    }
    _checkForInProgressSession() {
        // Only check if we're in projection mode
        if (!this._isActive || !this._activeSession) {
            return;
        }
        // Get the updated session from the model
        const updatedSession = this.agentSessionsService.getSession(this._activeSession.resource);
        if (!updatedSession) {
            return;
        }
        // If the session is now in progress, exit projection mode
        if (isSessionInProgressStatus(updatedSession.status)) {
            this.logService.trace('[AgentSessionProjection] Active session transitioned to in-progress, exiting projection mode');
            this.exitProjection({ startNewChat: false });
        }
    }
    /**
     * Opens a session in the chat panel without entering projection mode.
     */
    async _openSessionInChatPanel(session) {
        session.setRead(true);
        await this.chatSessionsService.activateChatSessionItemProvider(session.providerType);
        await this.chatWidgetService.openSession(session.resource, undefined, {
            title: { preferred: session.label },
            revealIfOpened: true
        });
    }
    /**
     * Open the session's files in a multi-diff editor.
     * @returns true if any files were opened, false if nothing to display
     */
    async _openSessionFiles(session) {
        this.logService.trace(`[AgentSessionProjection] Opening files for session '${session.label}'`, {
            hasChanges: !!session.changes,
            isArray: Array.isArray(session.changes),
            changeCount: Array.isArray(session.changes) ? session.changes.length : 0
        });
        // Open changes from the session as a multi-diff editor (like edit session view)
        if (session.changes && Array.isArray(session.changes) && session.changes.length > 0) {
            // Filter to changes that have both original and modified URIs for diff view
            const diffResources = session.changes
                .filter(change => change.originalUri)
                .map(change => ({
                originalUri: change.originalUri,
                modifiedUri: change.modifiedUri
            }));
            this.logService.trace(`[AgentSessionProjection] Found ${diffResources.length} files with diffs to display`);
            if (diffResources.length > 0) {
                // Open multi-diff editor showing all changes in a modal editor
                await this.editorService.openEditor({
                    multiDiffSource: session.resource.with({ scheme: session.resource.scheme + '-agent-session-projection' }),
                    resources: diffResources.map(dr => ({
                        original: { resource: dr.originalUri },
                        modified: { resource: dr.modifiedUri }
                    })),
                    label: localize(6284, null, session.label),
                }, MODAL_GROUP);
                this.logService.trace(`[AgentSessionProjection] Multi-diff editor opened successfully in modal view`);
                // Save this as the session's working set
                const sessionKey = session.resource.toString();
                const newWorkingSet = this.editorGroupsService.saveWorkingSet(`agent-session-projection-${sessionKey}`);
                this._sessionWorkingSets.set(sessionKey, newWorkingSet);
                return true;
            }
            else {
                this.logService.trace(`[AgentSessionProjection] No files with diffs to display (all changes missing originalUri)`);
                return false;
            }
        }
        else {
            this.logService.trace(`[AgentSessionProjection] Session has no changes to display`);
            return false;
        }
    }
    async enterProjection(session) {
        // Check if the feature is enabled
        if (!this._isEnabled()) {
            this.logService.trace('[AgentSessionProjection] Agent Session Projection is disabled');
            return;
        }
        // Check if this session's provider type supports agent session projection
        if (!AGENT_SESSION_PROJECTION_ENABLED_PROVIDERS.has(session.providerType)) {
            this.logService.trace(`[AgentSessionProjection] Provider type '${session.providerType}' does not support agent session projection`);
            return;
        }
        // Detect if auxiliary bar is maximized before any layout changes
        const isAuxBarMaximized = this.layoutService.isAuxiliaryBarMaximized();
        this.logService.trace('[AgentSessionProjection] enterProjection auxiliary bar state', {
            isAuxiliaryBarMaximized: isAuxBarMaximized
        });
        // Never enter projection mode for sessions that are in progress
        // The user should only be in projection mode when reviewing completed code
        if (isSessionInProgressStatus(session.status)) {
            this.logService.trace('[AgentSessionProjection] Session is in progress, opening chat without projection mode');
            // If we're already in projection mode and switching to an in-progress session, exit projection
            if (this._isActive) {
                await this.exitProjection({ startNewChat: false });
            }
            await this._openSessionInChatPanel(session);
            return;
        }
        // For local sessions, check if there are pending edits to show
        // If there's nothing to focus, just open the chat without entering projection mode
        let hasUndecidedChanges = true;
        let editingSessionExists = true;
        if (session.providerType === AgentSessionProviders.Local) {
            const editingSession = this.chatEditingService.getEditingSession(session.resource);
            editingSessionExists = !!editingSession;
            if (editingSession) {
                hasUndecidedChanges = editingSession.entries.get().some(e => e.state.get() === 0 /* ModifiedFileEntryState.Modified */);
                if (!hasUndecidedChanges) {
                    this.logService.trace('[AgentSessionProjection] Local session has no undecided changes, opening chat without projection mode');
                }
            }
            else {
                // Editing session doesn't exist yet - treat as no changes for now
                hasUndecidedChanges = false;
                this.logService.trace('[AgentSessionProjection] Local session has no editing session yet');
            }
        }
        // If no undecided changes and we're already in projection mode, exit projection
        // But only if we actually checked the editing session (it exists) - if it's undefined,
        // it might just not be loaded yet, so don't exit projection in that case
        if (!hasUndecidedChanges && this._isActive && editingSessionExists) {
            this.logService.trace('[AgentSessionProjection] Switching to session without changes while in projection mode, exiting projection');
            await this.exitProjection({ startNewChat: false });
            await this._openSessionInChatPanel(session);
            return;
        }
        // If we're switching to a session without an editing session yet while in projection,
        // just open the chat panel but stay in projection mode (let the editing session load)
        if (!hasUndecidedChanges && this._isActive && !editingSessionExists) {
            this.logService.trace('[AgentSessionProjection] Switching to session without editing session while in projection mode, staying in projection');
            await this._openSessionInChatPanel(session);
            return;
        }
        // Only enter projection mode if there are changes to show
        if (hasUndecidedChanges) {
            // Capture the user's working set immediately (before any editors are cleared)
            if (!this._isActive && !this._preProjectionWorkingSet) {
                const visibleEditorsBefore = this.editorService.visibleEditors.length;
                this._preProjectionWorkingSet = this.editorGroupsService.saveWorkingSet('agent-session-projection-backup');
                this.logService.trace('[AgentSessionProjection] saved pre-projection working set', {
                    id: this._preProjectionWorkingSet.id,
                    visibleEditorsBefore
                });
            }
            // Set swapping flag to prevent checkForEmptyEditors from exiting during session swap
            const isSwapping = this._isActive && this._activeSession;
            if (isSwapping) {
                this._isSwappingSessions = true;
                // Already in projection mode, switching sessions - save the current session's working set
                const previousSessionKey = this._activeSession.resource.toString();
                const previousWorkingSet = this.editorGroupsService.saveWorkingSet(`agent-session-projection-${previousSessionKey}`);
                this._sessionWorkingSets.set(previousSessionKey, previousWorkingSet);
            }
            try {
                // For local sessions, changes are shown via chatEditing.viewChanges, not _openSessionFiles
                // For other providers, try to open session files from session.changes
                let filesOpened = false;
                if (session.providerType === AgentSessionProviders.Local) {
                    // Local sessions use editing session for changes - we already verified hasUndecidedChanges above
                    filesOpened = true;
                }
                else {
                    // Try to open session files - only continue with projection if files were displayed
                    filesOpened = await this._openSessionFiles(session);
                }
                if (!filesOpened) {
                    this.logService.trace('[AgentSessionProjection] No files to display, opening chat without projection mode');
                    // Restore the working set we just saved if this was our first attempt
                    if (!this._isActive && this._preProjectionWorkingSet) {
                        await this.editorGroupsService.applyWorkingSet(this._preProjectionWorkingSet);
                        this.editorGroupsService.deleteWorkingSet(this._preProjectionWorkingSet);
                        this._preProjectionWorkingSet = undefined;
                    }
                    // Fall through to just open the chat panel
                }
                else {
                    // Set active state
                    const wasActive = this._isActive;
                    this._isActive = true;
                    this._activeSession = session;
                    this._inProjectionModeContextKey.set(true);
                    this.layoutService.mainContainer.classList.add('agent-session-projection-active');
                    // Capture auxiliary bar maximized state when first entering projection
                    if (!wasActive) {
                        this._wasAuxiliaryBarMaximized = isAuxBarMaximized;
                        this.logService.trace('[AgentSessionProjection] captured auxiliary bar maximized state', {
                            wasAuxiliaryBarMaximized: this._wasAuxiliaryBarMaximized
                        });
                    }
                    // Update the agent status to show session mode
                    this.agentTitleBarStatusService.enterSessionMode(session.resource, session.label);
                    if (!wasActive) {
                        this._onDidChangeProjectionMode.fire(true);
                    }
                    // Always fire session change event (for title updates when switching sessions)
                    this._onDidChangeActiveSession.fire(session);
                }
            }
            finally {
                // Clear swapping flag
                this._isSwappingSessions = false;
            }
        }
        // Open the session in the chat panel (always, even without changes)
        await this._openSessionInChatPanel(session);
        // For local sessions with changes, also pop open the edit session's changes view
        // Must be after openSession so the editing session context is available
        if (session.providerType === AgentSessionProviders.Local && hasUndecidedChanges) {
            await this.commandService.executeCommand('chatEditing.viewChanges');
        }
        // If auxiliary bar was maximized, hide it during projection to show full editor
        // This must be done after opening the session to avoid the session opening re-showing the bar
        if (this._wasAuxiliaryBarMaximized) {
            this.logService.trace('[AgentSessionProjection] hiding maximized auxiliary bar during projection');
            this.layoutService.setPartHidden(true, "workbench.parts.auxiliarybar" /* Parts.AUXILIARYBAR_PART */);
        }
    }
    async exitProjection(options) {
        if (!this._isActive || this._isExiting) {
            return;
        }
        const startNewChat = options?.startNewChat ?? true;
        this._isExiting = true;
        this.logService.trace('[AgentSessionProjection] exitProjection start', {
            hasPreProjectionWorkingSet: !!this._preProjectionWorkingSet,
            activeSession: this._activeSession?.label,
            startNewChat,
            wasAuxiliaryBarMaximized: this._wasAuxiliaryBarMaximized
        });
        // Save the current session's working set before exiting
        if (this._activeSession) {
            const sessionKey = this._activeSession.resource.toString();
            const workingSet = this.editorGroupsService.saveWorkingSet(`agent-session-projection-${sessionKey}`);
            this._sessionWorkingSets.set(sessionKey, workingSet);
        }
        // Close projection editors (multi-diff, etc.) so the restored set is clean
        for (const group of this.editorGroupsService.groups) {
            await group.closeAllEditors();
        }
        this.logService.trace('[AgentSessionProjection] exitProjection closed editors', { visible: this.editorService.visibleEditors.length });
        // Restore the pre-projection working set (original tabs)
        if (this._preProjectionWorkingSet) {
            await this.editorGroupsService.applyWorkingSet(this._preProjectionWorkingSet);
            this.logService.trace('[AgentSessionProjection] exitProjection applied pre-projection working set', {
                visible: this.editorService.visibleEditors.length,
                id: this._preProjectionWorkingSet.id
            });
            this.editorGroupsService.deleteWorkingSet(this._preProjectionWorkingSet);
            this._preProjectionWorkingSet = undefined;
        }
        else {
            await this.editorGroupsService.applyWorkingSet('empty', { preserveFocus: true });
            this.logService.trace('[AgentSessionProjection] exitProjection no pre-working set, applied empty');
        }
        this._isActive = false;
        this._activeSession = undefined;
        this._inProjectionModeContextKey.set(false);
        const shouldRestoreMaximized = this._wasAuxiliaryBarMaximized;
        this._wasAuxiliaryBarMaximized = false;
        this.layoutService.mainContainer.classList.remove('agent-session-projection-active');
        // Update the agent status to exit session mode
        this.agentTitleBarStatusService.exitSessionMode();
        this._onDidChangeProjectionMode.fire(false);
        this._onDidChangeActiveSession.fire(undefined);
        // Start a new chat to clear the sidebar (unless caller wants to keep current chat)
        if (startNewChat) {
            await this.commandService.executeCommand(ACTION_ID_NEW_CHAT);
        }
        // Restore auxiliary bar maximized state if it was maximized before entering projection
        if (shouldRestoreMaximized) {
            this.logService.trace('[AgentSessionProjection] restoring auxiliary bar maximized state');
            // First show the auxiliary bar, then maximize it
            this.layoutService.setPartHidden(false, "workbench.parts.auxiliarybar" /* Parts.AUXILIARYBAR_PART */);
            await this.commandService.executeCommand('workbench.action.maximizeAuxiliaryBar');
        }
        this.logService.trace('[AgentSessionProjection] exitProjection complete');
        this._isExiting = false;
    }
};
AgentSessionProjectionService = __decorate([
    __param(0, IContextKeyService),
    __param(1, IConfigurationService),
    __param(2, IEditorGroupsService),
    __param(3, IEditorService),
    __param(4, ILogService),
    __param(5, IChatWidgetService),
    __param(6, IChatSessionsService),
    __param(7, IWorkbenchLayoutService),
    __param(8, ICommandService),
    __param(9, IChatEditingService),
    __param(10, IAgentTitleBarStatusService),
    __param(11, IAgentSessionsService)
], AgentSessionProjectionService);
export { AgentSessionProjectionService };
//#endregion
//# sourceMappingURL=agentSessionProjectionService.js.map