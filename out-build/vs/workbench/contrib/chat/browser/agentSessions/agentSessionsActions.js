/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { localize, localize2 } from '../../../../../nls.js';
import { isAgentSessionSection, isLocalAgentSessionItem, isMarshalledAgentSessionContext } from './agentSessionsModel.js';
import { Action2, MenuId, MenuRegistry } from '../../../../../platform/actions/common/actions.js';
import { Codicon } from '../../../../../base/common/codicons.js';
import { AGENT_SESSION_DELETE_ACTION_ID, AGENT_SESSION_RENAME_ACTION_ID, AgentSessionProviders, AgentSessionsViewerOrientation } from './agentSessions.js';
import { IChatService } from '../../common/chatService/chatService.js';
import { ChatContextKeys } from '../../common/actions/chatContextKeys.js';
import { ChatViewId, IChatWidgetService } from '../chat.js';
import { ACTIVE_GROUP, AUX_WINDOW_GROUP, SIDE_GROUP } from '../../../../services/editor/common/editorService.js';
import { IViewDescriptorService } from '../../../../common/views.js';
import { IWorkbenchLayoutService } from '../../../../services/layout/browser/layoutService.js';
import { IAgentSessionsService } from './agentSessionsService.js';
import { ContextKeyExpr } from '../../../../../platform/contextkey/common/contextkey.js';
import { ChatEditorInput, showClearEditingSessionConfirmation } from '../widgetHosts/editor/chatEditorInput.js';
import { IDialogService } from '../../../../../platform/dialogs/common/dialogs.js';
import { IConfigurationService } from '../../../../../platform/configuration/common/configuration.js';
import { ChatConfiguration } from '../../common/constants.js';
import { ACTION_ID_NEW_CHAT } from '../actions/chatActions.js';
import { IViewsService } from '../../../../services/views/common/viewsService.js';
import { ICommandService } from '../../../../../platform/commands/common/commands.js';
import { IInstantiationService } from '../../../../../platform/instantiation/common/instantiation.js';
import { AgentSessionsPicker } from './agentSessionsPicker.js';
import { ActiveEditorContext, IsSessionsWindowContext } from '../../../../common/contextkeys.js';
import { IQuickInputService } from '../../../../../platform/quickinput/common/quickInput.js';
import { coalesce } from '../../../../../base/common/arrays.js';
import { IStorageService } from '../../../../../platform/storage/common/storage.js';
import { IPaneCompositePartService } from '../../../../services/panecomposite/browser/panecomposite.js';
import { IWorkbenchEnvironmentService } from '../../../../services/environment/common/environmentService.js';
const AGENT_SESSIONS_CATEGORY = localize2(6204, "Chat Agent Sessions");
//#region Chat View
export class ToggleShowAgentSessionsAction extends Action2 {
    constructor() {
        super({
            id: 'workbench.action.chat.toggleShowAgentSessions',
            title: localize2(6205, "Show Sessions"),
            toggled: ContextKeyExpr.equals(`config.${ChatConfiguration.ChatViewSessionsEnabled}`, true),
            menu: {
                id: MenuId.ChatWelcomeContext,
                group: '0_sessions',
                order: 2,
                when: ChatContextKeys.inChatEditor.negate()
            }
        });
    }
    async run(accessor) {
        const configurationService = accessor.get(IConfigurationService);
        const currentValue = configurationService.getValue(ChatConfiguration.ChatViewSessionsEnabled);
        await configurationService.updateValue(ChatConfiguration.ChatViewSessionsEnabled, !currentValue);
    }
}
const agentSessionsOrientationSubmenu = new MenuId('chatAgentSessionsOrientationSubmenu');
MenuRegistry.appendMenuItem(MenuId.ChatWelcomeContext, {
    submenu: agentSessionsOrientationSubmenu,
    title: localize2(6206, "Sessions Orientation"),
    group: '0_sessions',
    order: 1,
    when: ChatContextKeys.inChatEditor.negate()
});
export class SetAgentSessionsOrientationStackedAction extends Action2 {
    constructor() {
        super({
            id: 'workbench.action.chat.setAgentSessionsOrientationStacked',
            title: localize2(6207, "Stacked"),
            toggled: ContextKeyExpr.equals(`config.${ChatConfiguration.ChatViewSessionsOrientation}`, 'stacked'),
            precondition: ContextKeyExpr.equals(`config.${ChatConfiguration.ChatViewSessionsEnabled}`, true),
            menu: {
                id: agentSessionsOrientationSubmenu,
                group: 'navigation',
                order: 2
            }
        });
    }
    async run(accessor) {
        const commandService = accessor.get(ICommandService);
        await commandService.executeCommand(HideAgentSessionsSidebar.ID);
    }
}
export class SetAgentSessionsOrientationSideBySideAction extends Action2 {
    constructor() {
        super({
            id: 'workbench.action.chat.setAgentSessionsOrientationSideBySide',
            title: localize2(6208, "Side by Side"),
            toggled: ContextKeyExpr.notEquals(`config.${ChatConfiguration.ChatViewSessionsOrientation}`, 'stacked'),
            precondition: ContextKeyExpr.equals(`config.${ChatConfiguration.ChatViewSessionsEnabled}`, true),
            menu: {
                id: agentSessionsOrientationSubmenu,
                group: 'navigation',
                order: 1
            }
        });
    }
    async run(accessor) {
        const commandService = accessor.get(ICommandService);
        await commandService.executeCommand(ShowAgentSessionsSidebar.ID);
    }
}
export class PickAgentSessionAction extends Action2 {
    constructor() {
        super({
            id: `workbench.action.chat.history`,
            title: localize2(6209, "Open Agent Session..."),
            menu: [
                {
                    id: MenuId.ViewTitle,
                    when: ContextKeyExpr.and(ContextKeyExpr.equals('view', ChatViewId), ContextKeyExpr.equals(`config.${ChatConfiguration.ChatViewSessionsEnabled}`, false)),
                    group: 'navigation',
                    order: 2
                },
                {
                    id: MenuId.EditorTitle,
                    when: ActiveEditorContext.isEqualTo(ChatEditorInput.EditorID),
                }
            ],
            category: AGENT_SESSIONS_CATEGORY,
            icon: Codicon.history,
            f1: true,
            precondition: ChatContextKeys.enabled
        });
    }
    async run(accessor) {
        const instantiationService = accessor.get(IInstantiationService);
        const agentSessionsPicker = instantiationService.createInstance(AgentSessionsPicker, undefined, undefined);
        await agentSessionsPicker.pickAgentSession();
    }
}
export class ArchiveAllAgentSessionsAction extends Action2 {
    constructor() {
        super({
            id: 'workbench.action.chat.archiveAllAgentSessions',
            title: localize2(6210, "Archive All Workspace Agent Sessions"),
            precondition: ChatContextKeys.enabled,
            category: AGENT_SESSIONS_CATEGORY,
            f1: true,
        });
    }
    async run(accessor) {
        const agentSessionsService = accessor.get(IAgentSessionsService);
        const dialogService = accessor.get(IDialogService);
        const sessionsToArchive = agentSessionsService.model.sessions.filter(session => !session.isArchived());
        if (sessionsToArchive.length === 0) {
            return;
        }
        const confirmed = await dialogService.confirm({
            message: sessionsToArchive.length === 1
                ? localize(6180, null)
                : localize(6181, null, sessionsToArchive.length),
            detail: localize(6182, null),
            primaryButton: localize(6183, null)
        });
        if (!confirmed.confirmed) {
            return;
        }
        for (const session of sessionsToArchive) {
            session.setArchived(true);
        }
    }
}
export class MarkAllAgentSessionsReadAction extends Action2 {
    constructor() {
        super({
            id: 'workbench.action.chat.markAllAgentSessionsRead',
            title: localize2(6211, "Mark All as Read"),
            precondition: ChatContextKeys.enabled,
            category: AGENT_SESSIONS_CATEGORY,
            f1: true,
            menu: {
                id: MenuId.AgentSessionsContext,
                group: '0_read',
                order: 2,
                when: ChatContextKeys.isArchivedAgentSession.negate() // no read state for archived sessions
            }
        });
    }
    async run(accessor) {
        const agentSessionsService = accessor.get(IAgentSessionsService);
        const sessionsToMarkRead = agentSessionsService.model.sessions.filter(session => !session.isArchived() && !session.isRead());
        if (sessionsToMarkRead.length === 0) {
            return;
        }
        for (const session of sessionsToMarkRead) {
            session.setRead(true);
        }
    }
}
const ConfirmArchiveStorageKey = 'chat.sessions.confirmArchive';
export class ArchiveAgentSessionSectionAction extends Action2 {
    constructor() {
        super({
            id: 'agentSessionSection.archive',
            title: localize2(6212, "Archive All"),
            icon: Codicon.archive,
            menu: [{
                    id: MenuId.AgentSessionSectionToolbar,
                    group: 'navigation',
                    order: 1,
                    when: ChatContextKeys.agentSessionSection.notEqualsTo("archived" /* AgentSessionSection.Archived */),
                }, {
                    id: MenuId.AgentSessionSectionContext,
                    group: '1_edit',
                    order: 2,
                    when: ChatContextKeys.agentSessionSection.notEqualsTo("archived" /* AgentSessionSection.Archived */),
                }]
        });
    }
    async run(accessor, context) {
        if (!context || !isAgentSessionSection(context)) {
            return;
        }
        const dialogService = accessor.get(IDialogService);
        const storageService = accessor.get(IStorageService);
        const skipConfirmation = storageService.getBoolean(ConfirmArchiveStorageKey, 0 /* StorageScope.PROFILE */, false);
        if (!skipConfirmation) {
            const confirmed = await dialogService.confirm({
                message: context.sessions.length === 1
                    ? localize(6184, null, context.label)
                    : localize(6185, null, context.sessions.length, context.label),
                detail: localize(6186, null),
                primaryButton: localize(6187, null),
                checkbox: {
                    label: localize(6188, null)
                }
            });
            if (!confirmed.confirmed) {
                return;
            }
            if (confirmed.checkboxChecked) {
                storageService.store(ConfirmArchiveStorageKey, true, 0 /* StorageScope.PROFILE */, 0 /* StorageTarget.USER */);
            }
        }
        for (const session of context.sessions) {
            session.setArchived(true);
        }
    }
}
export class UnarchiveAgentSessionSectionAction extends Action2 {
    constructor() {
        super({
            id: 'agentSessionSection.unarchive',
            title: localize2(6213, "Unarchive All"),
            icon: Codicon.unarchive,
            menu: [{
                    id: MenuId.AgentSessionSectionToolbar,
                    group: 'navigation',
                    order: 1,
                    when: ChatContextKeys.agentSessionSection.isEqualTo("archived" /* AgentSessionSection.Archived */),
                }, {
                    id: MenuId.AgentSessionSectionContext,
                    group: '1_edit',
                    order: 2,
                    when: ChatContextKeys.agentSessionSection.isEqualTo("archived" /* AgentSessionSection.Archived */),
                }]
        });
    }
    async run(accessor, context) {
        if (!context || !isAgentSessionSection(context)) {
            return;
        }
        const dialogService = accessor.get(IDialogService);
        const storageService = accessor.get(IStorageService);
        const skipConfirmation = storageService.getBoolean(ConfirmArchiveStorageKey, 0 /* StorageScope.PROFILE */, false);
        if (!skipConfirmation) {
            const confirmed = await dialogService.confirm({
                message: context.sessions.length === 1
                    ? localize(6189, null)
                    : localize(6190, null, context.sessions.length),
                primaryButton: localize(6191, null),
                checkbox: {
                    label: localize(6192, null)
                }
            });
            if (!confirmed.confirmed) {
                return;
            }
            if (confirmed.checkboxChecked) {
                storageService.store(ConfirmArchiveStorageKey, true, 0 /* StorageScope.PROFILE */, 0 /* StorageTarget.USER */);
            }
        }
        for (const session of context.sessions) {
            session.setArchived(false);
        }
    }
}
export class MarkAgentSessionSectionReadAction extends Action2 {
    constructor() {
        super({
            id: 'agentSessionSection.markRead',
            title: localize2(6214, "Mark All as Read"),
            menu: [{
                    id: MenuId.AgentSessionSectionContext,
                    group: '1_edit',
                    order: 1,
                    when: ChatContextKeys.agentSessionSection.notEqualsTo("archived" /* AgentSessionSection.Archived */),
                }]
        });
    }
    async run(accessor, context) {
        if (!context || !isAgentSessionSection(context)) {
            return;
        }
        for (const session of context.sessions) {
            session.setRead(true);
        }
    }
}
//#endregion
//#region Session Actions
class BaseAgentSessionAction extends Action2 {
    async run(accessor, context) {
        const agentSessionsService = accessor.get(IAgentSessionsService);
        const viewsService = accessor.get(IViewsService);
        let sessions = [];
        if (isMarshalledAgentSessionContext(context)) {
            sessions = coalesce((context.sessions ?? [context.session]).map(session => agentSessionsService.getSession(session.resource)));
        }
        else if (context) {
            sessions = [context];
        }
        if (sessions.length === 0) {
            const chatView = viewsService.getActiveViewWithId(ChatViewId);
            const focused = chatView?.getFocusedSessions().at(0);
            if (focused) {
                sessions = [focused];
            }
        }
        if (sessions.length > 0) {
            await this.runWithSessions(sessions, accessor);
        }
    }
}
export class MarkAgentSessionUnreadAction extends BaseAgentSessionAction {
    constructor() {
        super({
            id: 'agentSession.markUnread',
            title: localize2(6215, "Mark as Unread"),
            menu: {
                id: MenuId.AgentSessionsContext,
                group: '0_read',
                order: 1,
                when: ContextKeyExpr.and(ChatContextKeys.isReadAgentSession, ChatContextKeys.isArchivedAgentSession.negate() // no read state for archived sessions
                ),
            }
        });
    }
    runWithSessions(sessions) {
        for (const session of sessions) {
            session.setRead(false);
        }
    }
}
export class MarkAgentSessionReadAction extends BaseAgentSessionAction {
    constructor() {
        super({
            id: 'agentSession.markRead',
            title: localize2(6216, "Mark as Read"),
            menu: {
                id: MenuId.AgentSessionsContext,
                group: '0_read',
                order: 1,
                when: ContextKeyExpr.and(ChatContextKeys.isReadAgentSession.negate(), ChatContextKeys.isArchivedAgentSession.negate() // no read state for archived sessions
                ),
            }
        });
    }
    runWithSessions(sessions) {
        for (const session of sessions) {
            session.setRead(true);
        }
    }
}
export class ArchiveAgentSessionAction extends BaseAgentSessionAction {
    constructor() {
        super({
            id: 'agentSession.archive',
            title: localize2(6217, "Archive"),
            icon: Codicon.archive,
            keybinding: {
                primary: 20 /* KeyCode.Delete */,
                mac: { primary: 2048 /* KeyMod.CtrlCmd */ | 1 /* KeyCode.Backspace */ },
                weight: 200 /* KeybindingWeight.WorkbenchContrib */ + 1,
                when: ContextKeyExpr.and(ChatContextKeys.agentSessionsViewerFocused, ChatContextKeys.isArchivedAgentSession.negate())
            },
            menu: [{
                    id: MenuId.AgentSessionItemToolbar,
                    group: 'navigation',
                    order: 1,
                    when: ChatContextKeys.isArchivedAgentSession.negate(),
                }, {
                    id: MenuId.AgentSessionsContext,
                    group: '1_edit',
                    order: 2,
                    when: ChatContextKeys.isArchivedAgentSession.negate()
                }]
        });
    }
    async runWithSessions(sessions, accessor) {
        const chatService = accessor.get(IChatService);
        const dialogService = accessor.get(IDialogService);
        const environmentService = accessor.get(IWorkbenchEnvironmentService);
        // Archive all sessions
        for (const session of sessions) {
            if (!environmentService.isSessionsWindow) {
                const chatModel = chatService.getSession(session.resource);
                if (chatModel && !await showClearEditingSessionConfirmation(chatModel, dialogService, {
                    isArchiveAction: true,
                    titleOverride: localize(6193, null),
                    messageOverride: localize(6194, null)
                })) {
                    return;
                }
            }
            session.setArchived(true);
        }
    }
}
export class UnarchiveAgentSessionAction extends BaseAgentSessionAction {
    constructor() {
        super({
            id: 'agentSession.unarchive',
            title: localize2(6218, "Unarchive"),
            icon: Codicon.unarchive,
            keybinding: {
                primary: 1024 /* KeyMod.Shift */ | 20 /* KeyCode.Delete */,
                mac: {
                    primary: 2048 /* KeyMod.CtrlCmd */ | 1024 /* KeyMod.Shift */ | 1 /* KeyCode.Backspace */,
                },
                weight: 200 /* KeybindingWeight.WorkbenchContrib */ + 1,
                when: ContextKeyExpr.and(ChatContextKeys.agentSessionsViewerFocused, ChatContextKeys.isArchivedAgentSession)
            },
            menu: [{
                    id: MenuId.AgentSessionItemToolbar,
                    group: 'navigation',
                    order: 1,
                    when: ChatContextKeys.isArchivedAgentSession,
                }, {
                    id: MenuId.AgentSessionsContext,
                    group: '1_edit',
                    order: 2,
                    when: ChatContextKeys.isArchivedAgentSession,
                }]
        });
    }
    runWithSessions(sessions) {
        for (const session of sessions) {
            session.setArchived(false);
        }
    }
}
export class PinAgentSessionAction extends BaseAgentSessionAction {
    constructor() {
        super({
            id: 'agentSession.pin',
            title: localize2(6219, "Pin"),
            icon: Codicon.pin,
            menu: [{
                    id: MenuId.AgentSessionItemToolbar,
                    group: 'navigation',
                    order: 0,
                    when: ContextKeyExpr.and(ChatContextKeys.isPinnedAgentSession.negate(), ChatContextKeys.isArchivedAgentSession.negate()),
                }, {
                    id: MenuId.AgentSessionsContext,
                    group: '0_pin',
                    order: 1,
                    when: ContextKeyExpr.and(ChatContextKeys.isPinnedAgentSession.negate(), ChatContextKeys.isArchivedAgentSession.negate()),
                }]
        });
    }
    runWithSessions(sessions) {
        for (const session of sessions) {
            session.setPinned(true);
        }
    }
}
export class UnpinAgentSessionAction extends BaseAgentSessionAction {
    constructor() {
        super({
            id: 'agentSession.unpin',
            title: localize2(6220, "Unpin"),
            icon: Codicon.pinned,
            menu: [{
                    id: MenuId.AgentSessionItemToolbar,
                    group: 'navigation',
                    order: 0,
                    when: ContextKeyExpr.and(ChatContextKeys.isPinnedAgentSession, ChatContextKeys.isArchivedAgentSession.negate()),
                }, {
                    id: MenuId.AgentSessionsContext,
                    group: '0_pin',
                    order: 1,
                    when: ContextKeyExpr.and(ChatContextKeys.isPinnedAgentSession, ChatContextKeys.isArchivedAgentSession.negate()),
                }]
        });
    }
    runWithSessions(sessions) {
        for (const session of sessions) {
            session.setPinned(false);
        }
    }
}
export class RenameAgentSessionAction extends BaseAgentSessionAction {
    constructor() {
        super({
            id: AGENT_SESSION_RENAME_ACTION_ID,
            title: localize2(6221, "Rename..."),
            precondition: ChatContextKeys.hasMultipleAgentSessionsSelected.negate(),
            keybinding: {
                primary: 60 /* KeyCode.F2 */,
                mac: {
                    primary: 3 /* KeyCode.Enter */
                },
                weight: 200 /* KeybindingWeight.WorkbenchContrib */ + 1,
                when: ContextKeyExpr.and(ChatContextKeys.agentSessionsViewerFocused, ChatContextKeys.agentSessionType.isEqualTo(AgentSessionProviders.Local)),
            },
            menu: {
                id: MenuId.AgentSessionsContext,
                group: '1_edit',
                order: 3,
                when: ChatContextKeys.agentSessionType.isEqualTo(AgentSessionProviders.Local)
            }
        });
    }
    async runWithSessions(sessions, accessor) {
        const session = sessions.at(0);
        if (!session) {
            return;
        }
        const quickInputService = accessor.get(IQuickInputService);
        const chatService = accessor.get(IChatService);
        const title = await quickInputService.input({ prompt: localize(6195, null), value: session.label });
        if (title) {
            chatService.setChatSessionTitle(session.resource, title);
        }
    }
}
export class DeleteAgentSessionAction extends BaseAgentSessionAction {
    constructor() {
        super({
            id: AGENT_SESSION_DELETE_ACTION_ID,
            title: localize2(6222, "Delete..."),
            menu: {
                id: MenuId.AgentSessionsContext,
                group: '1_edit',
                order: 4,
                when: ChatContextKeys.agentSessionType.isEqualTo(AgentSessionProviders.Local)
            }
        });
    }
    async runWithSessions(sessions, accessor) {
        if (sessions.length === 0) {
            return;
        }
        const chatService = accessor.get(IChatService);
        const dialogService = accessor.get(IDialogService);
        const widgetService = accessor.get(IChatWidgetService);
        const confirmed = await dialogService.confirm({
            message: sessions.length === 1
                ? localize(6196, null)
                : localize(6197, null, sessions.length),
            detail: localize(6198, null),
            primaryButton: localize(6199, null)
        });
        if (!confirmed.confirmed) {
            return;
        }
        for (const session of sessions) {
            // Clear chat widget
            await widgetService.getWidgetBySessionResource(session.resource)?.clear();
            // Remove from storage
            await chatService.removeHistoryEntry(session.resource);
        }
    }
}
export class DeleteAllLocalSessionsAction extends Action2 {
    constructor() {
        super({
            id: 'workbench.action.chat.clearHistory',
            title: localize2(6223, "Delete All Local Workspace Chat Sessions"),
            precondition: ChatContextKeys.enabled,
            category: AGENT_SESSIONS_CATEGORY,
            f1: true,
        });
    }
    async run(accessor, ...args) {
        const chatService = accessor.get(IChatService);
        const widgetService = accessor.get(IChatWidgetService);
        const dialogService = accessor.get(IDialogService);
        const agentSessionsService = accessor.get(IAgentSessionsService);
        const localSessionsCount = agentSessionsService.model.sessions.filter(session => isLocalAgentSessionItem(session)).length;
        if (localSessionsCount === 0) {
            return;
        }
        const confirmed = await dialogService.confirm({
            message: localSessionsCount === 1
                ? localize(6200, null)
                : localize(6201, null, localSessionsCount),
            detail: localize(6202, null),
            primaryButton: localize(6203, null)
        });
        if (!confirmed.confirmed) {
            return;
        }
        // Clear all chat widgets
        await Promise.all(widgetService.getAllWidgets().map(widget => widget.clear()));
        // Remove from storage
        await chatService.clearAllHistoryEntries();
    }
}
class BaseOpenAgentSessionAction extends BaseAgentSessionAction {
    async runWithSessions(sessions, accessor) {
        const chatWidgetService = accessor.get(IChatWidgetService);
        const targetGroup = this.getTargetGroup();
        for (const session of sessions) {
            const uri = session.resource;
            await chatWidgetService.openSession(uri, targetGroup, {
                ...this.getOptions(),
                pinned: true
            });
        }
    }
}
export class OpenAgentSessionInEditorGroupAction extends BaseOpenAgentSessionAction {
    static { this.id = 'workbench.action.chat.openSessionInEditorGroup'; }
    constructor() {
        super({
            id: OpenAgentSessionInEditorGroupAction.id,
            title: localize2(6224, "Open as Editor"),
            keybinding: {
                primary: 2048 /* KeyMod.CtrlCmd */ | 3 /* KeyCode.Enter */,
                mac: {
                    primary: 256 /* KeyMod.WinCtrl */ | 3 /* KeyCode.Enter */
                },
                weight: 200 /* KeybindingWeight.WorkbenchContrib */ + 1,
                when: ContextKeyExpr.and(ChatContextKeys.agentSessionsViewerFocused, IsSessionsWindowContext.negate()),
            },
            menu: {
                id: MenuId.AgentSessionsContext,
                when: IsSessionsWindowContext.negate(),
                order: 1,
                group: 'navigation'
            }
        });
    }
    getTargetGroup() {
        return ACTIVE_GROUP;
    }
    getOptions() {
        return {};
    }
}
export class OpenAgentSessionInNewEditorGroupAction extends BaseOpenAgentSessionAction {
    static { this.id = 'workbench.action.chat.openSessionInNewEditorGroup'; }
    constructor() {
        super({
            id: OpenAgentSessionInNewEditorGroupAction.id,
            title: localize2(6225, "Open to the Side"),
            keybinding: {
                primary: 2048 /* KeyMod.CtrlCmd */ | 512 /* KeyMod.Alt */ | 3 /* KeyCode.Enter */,
                mac: {
                    primary: 256 /* KeyMod.WinCtrl */ | 512 /* KeyMod.Alt */ | 3 /* KeyCode.Enter */
                },
                weight: 200 /* KeybindingWeight.WorkbenchContrib */ + 1,
                when: ContextKeyExpr.and(ChatContextKeys.agentSessionsViewerFocused, IsSessionsWindowContext.negate()),
            },
            menu: {
                id: MenuId.AgentSessionsContext,
                when: IsSessionsWindowContext.negate(),
                order: 2,
                group: 'navigation'
            }
        });
    }
    getTargetGroup() {
        return SIDE_GROUP;
    }
    getOptions() {
        return {};
    }
}
export class OpenAgentSessionInNewWindowAction extends BaseOpenAgentSessionAction {
    static { this.id = 'workbench.action.chat.openSessionInNewWindow'; }
    constructor() {
        super({
            id: OpenAgentSessionInNewWindowAction.id,
            title: localize2(6226, "Open in New Window"),
            menu: {
                id: MenuId.AgentSessionsContext,
                order: 3,
                group: 'navigation'
            }
        });
    }
    getTargetGroup() {
        return AUX_WINDOW_GROUP;
    }
    getOptions() {
        return {
            auxiliary: { compact: true, bounds: { width: 800, height: 640 } }
        };
    }
}
//#endregion
//#region Agent Sessions Sidebar
export class RefreshAgentSessionsViewerAction extends Action2 {
    constructor() {
        super({
            id: 'agentSessionsViewer.refresh',
            title: localize2(6227, "Refresh Agent Sessions"),
            icon: Codicon.refresh,
            menu: {
                id: MenuId.AgentSessionsToolbar,
                group: 'navigation',
                order: 1,
            },
        });
    }
    run(accessor, agentSessionsControl) {
        agentSessionsControl.refresh();
    }
}
export class FindAgentSessionInViewerAction extends Action2 {
    constructor() {
        super({
            id: 'agentSessionsViewer.find',
            title: localize2(6228, "Find Agent Session"),
            icon: Codicon.search,
            menu: {
                id: MenuId.AgentSessionsToolbar,
                group: 'navigation',
                order: 2,
            }
        });
    }
    run(accessor, agentSessionsControl) {
        return agentSessionsControl.openFind();
    }
}
class UpdateChatViewWidthAction extends Action2 {
    async run(accessor) {
        const layoutService = accessor.get(IWorkbenchLayoutService);
        const viewDescriptorService = accessor.get(IViewDescriptorService);
        const configurationService = accessor.get(IConfigurationService);
        const viewsService = accessor.get(IViewsService);
        const paneCompositeService = accessor.get(IPaneCompositePartService);
        const chatLocation = viewDescriptorService.getViewLocationById(ChatViewId);
        if (typeof chatLocation !== 'number') {
            return; // we need a view location
        }
        // Determine if we can resize the view: this is not possible
        // for when the chat view is in the panel at the top or bottom
        const panelPosition = layoutService.getPanelPosition();
        const canResizeView = chatLocation !== 1 /* ViewContainerLocation.Panel */ || (panelPosition === 0 /* Position.LEFT */ || panelPosition === 1 /* Position.RIGHT */);
        // Update configuration if needed
        const chatViewSessionsEnabled = configurationService.getValue(ChatConfiguration.ChatViewSessionsEnabled);
        if (!chatViewSessionsEnabled) {
            await configurationService.updateValue(ChatConfiguration.ChatViewSessionsEnabled, true);
        }
        let chatView = viewsService.getActiveViewWithId(ChatViewId);
        if (!chatView) {
            chatView = await viewsService.openView(ChatViewId, false);
        }
        if (!chatView) {
            return; // we need the chat view
        }
        const configuredOrientation = configurationService.getValue(ChatConfiguration.ChatViewSessionsOrientation);
        let validatedConfiguredOrientation;
        if (configuredOrientation === 'stacked' || configuredOrientation === 'sideBySide') {
            validatedConfiguredOrientation = configuredOrientation;
        }
        else {
            validatedConfiguredOrientation = 'sideBySide'; // default
        }
        const newOrientation = this.getOrientation();
        const lastWidthForOrientation = chatView?.getLastDimensions(newOrientation)?.width;
        if ((!canResizeView || validatedConfiguredOrientation === 'sideBySide') && newOrientation === AgentSessionsViewerOrientation.Stacked) {
            chatView.updateConfiguredSessionsViewerOrientation('stacked');
        }
        else if ((!canResizeView || validatedConfiguredOrientation === 'stacked') && newOrientation === AgentSessionsViewerOrientation.SideBySide) {
            chatView.updateConfiguredSessionsViewerOrientation('sideBySide');
        }
        if (!canResizeView) {
            return; // location does not allow for resize (panel top or bottom)
        }
        const part = paneCompositeService.getPartId(chatLocation);
        let currentSize = layoutService.getSize(part);
        const chatViewDefaultWidth = 300;
        const sessionsViewDefaultWidth = chatViewDefaultWidth;
        const sideBySideMinWidth = chatViewDefaultWidth + sessionsViewDefaultWidth + 1; // account for possible theme border
        if ((newOrientation === AgentSessionsViewerOrientation.SideBySide && currentSize.width >= sideBySideMinWidth) || // already wide enough to show side by side
            (newOrientation === AgentSessionsViewerOrientation.Stacked && chatLocation === 2 /* ViewContainerLocation.AuxiliaryBar */ && layoutService.isAuxiliaryBarMaximized()) // try to not leave maximized state if maximized
        ) {
            return;
        }
        // Leave maximized state if applicable
        if (chatLocation === 2 /* ViewContainerLocation.AuxiliaryBar */) {
            layoutService.setAuxiliaryBarMaximized(false);
            currentSize = layoutService.getSize(part);
        }
        // Figure out the right new width
        let newWidth;
        if (newOrientation === AgentSessionsViewerOrientation.SideBySide) {
            newWidth = Math.max(sideBySideMinWidth, lastWidthForOrientation || Math.round(layoutService.mainContainerDimension.width / 2));
        }
        else {
            newWidth = lastWidthForOrientation || Math.max(chatViewDefaultWidth, currentSize.width - sessionsViewDefaultWidth);
        }
        // Apply the new width
        layoutService.setSize(part, { width: newWidth, height: currentSize.height });
        // If we figure out that the width was not applied due to constraints (such as window dimensions),
        // we maximize the auxiliary bar to ensure the side by side experience is optimal
        const actualSize = layoutService.getSize(part);
        if (chatLocation === 2 /* ViewContainerLocation.AuxiliaryBar */ && // only applicable for auxiliary bar
            newOrientation === AgentSessionsViewerOrientation.SideBySide && // only applicable when going to side by side
            actualSize.width < sideBySideMinWidth // width is still not enough for side by side
        ) {
            layoutService.setAuxiliaryBarMaximized(true);
        }
    }
}
export class ShowAgentSessionsSidebar extends UpdateChatViewWidthAction {
    static { this.ID = 'agentSessions.showAgentSessionsSidebar'; }
    static { this.TITLE = localize2(6229, "Show Agent Sessions Sidebar"); }
    constructor() {
        super({
            id: ShowAgentSessionsSidebar.ID,
            title: ShowAgentSessionsSidebar.TITLE,
            precondition: ContextKeyExpr.and(ChatContextKeys.enabled, ChatContextKeys.agentSessionsViewerOrientation.isEqualTo(AgentSessionsViewerOrientation.Stacked)),
            f1: true,
            category: AGENT_SESSIONS_CATEGORY,
        });
    }
    getOrientation() {
        return AgentSessionsViewerOrientation.SideBySide;
    }
}
export class HideAgentSessionsSidebar extends UpdateChatViewWidthAction {
    static { this.ID = 'agentSessions.hideAgentSessionsSidebar'; }
    static { this.TITLE = localize2(6230, "Hide Agent Sessions Sidebar"); }
    constructor() {
        super({
            id: HideAgentSessionsSidebar.ID,
            title: HideAgentSessionsSidebar.TITLE,
            precondition: ContextKeyExpr.and(ChatContextKeys.enabled, ChatContextKeys.agentSessionsViewerOrientation.isEqualTo(AgentSessionsViewerOrientation.SideBySide)),
            f1: true,
            category: AGENT_SESSIONS_CATEGORY,
        });
    }
    getOrientation() {
        return AgentSessionsViewerOrientation.Stacked;
    }
}
export class ToggleAgentSessionsSidebar extends Action2 {
    static { this.ID = 'agentSessions.toggleAgentSessionsSidebar'; }
    static { this.TITLE = localize2(6231, "Toggle Agent Sessions Sidebar"); }
    constructor() {
        super({
            id: ToggleAgentSessionsSidebar.ID,
            title: ToggleAgentSessionsSidebar.TITLE,
            precondition: ChatContextKeys.enabled,
            f1: true,
            category: AGENT_SESSIONS_CATEGORY,
        });
    }
    async run(accessor) {
        const commandService = accessor.get(ICommandService);
        const viewsService = accessor.get(IViewsService);
        const chatView = viewsService.getActiveViewWithId(ChatViewId);
        const currentOrientation = chatView?.getSessionsViewerOrientation();
        if (currentOrientation === AgentSessionsViewerOrientation.SideBySide) {
            await commandService.executeCommand(HideAgentSessionsSidebar.ID);
        }
        else {
            await commandService.executeCommand(ShowAgentSessionsSidebar.ID);
        }
    }
}
export class FocusAgentSessionsAction extends Action2 {
    static { this.id = 'workbench.action.chat.focusAgentSessionsViewer'; }
    constructor() {
        super({
            id: FocusAgentSessionsAction.id,
            title: localize2(6232, "Focus Agent Sessions"),
            precondition: ContextKeyExpr.and(ChatContextKeys.enabled, ContextKeyExpr.equals(`config.${ChatConfiguration.ChatViewSessionsEnabled}`, true)),
            category: AGENT_SESSIONS_CATEGORY,
            f1: true,
        });
    }
    async run(accessor) {
        const viewsService = accessor.get(IViewsService);
        const configurationService = accessor.get(IConfigurationService);
        const commandService = accessor.get(ICommandService);
        const chatView = await viewsService.openView(ChatViewId, true);
        const focused = chatView?.focusSessions();
        if (focused) {
            return;
        }
        const configuredSessionsViewerOrientation = configurationService.getValue(ChatConfiguration.ChatViewSessionsOrientation);
        if (configuredSessionsViewerOrientation === 'stacked') {
            await commandService.executeCommand(ACTION_ID_NEW_CHAT);
        }
        else {
            await commandService.executeCommand(ShowAgentSessionsSidebar.ID);
        }
        chatView?.focusSessions();
    }
}
//#endregion
//# sourceMappingURL=agentSessionsActions.js.map