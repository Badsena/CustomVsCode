/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Codicon } from '../../../../../base/common/codicons.js';
import { localize, localize2 } from '../../../../../nls.js';
import { IAccessibilityService } from '../../../../../platform/accessibility/common/accessibility.js';
import { Action2, MenuId, MenuRegistry, registerAction2 } from '../../../../../platform/actions/common/actions.js';
import { CommandsRegistry } from '../../../../../platform/commands/common/commands.js';
import { ContextKeyExpr } from '../../../../../platform/contextkey/common/contextkey.js';
import { IDialogService } from '../../../../../platform/dialogs/common/dialogs.js';
import { IViewsService } from '../../../../services/views/common/viewsService.js';
import { ChatContextKeys } from '../../common/actions/chatContextKeys.js';
import { IChatService } from '../../common/chatService/chatService.js';
import { ChatAgentLocation, ChatConfiguration, ChatModeKind } from '../../common/constants.js';
import { ChatViewId, IChatWidgetService } from '../chat.js';
import { EditingSessionAction, getEditingSessionContext } from '../chatEditing/chatEditingActions.js';
import { ACTION_ID_NEW_CHAT, ACTION_ID_NEW_EDIT_SESSION, CHAT_CATEGORY, clearChatSessionPreservingType, handleCurrentEditingSession } from './chatActions.js';
import { clearChatEditor } from './chatClear.js';
import { AgentSessionProviders, AgentSessionsViewerOrientation } from '../agentSessions/agentSessions.js';
import { IConfigurationService } from '../../../../../platform/configuration/common/configuration.js';
function isNewEditSessionActionContext(arg) {
    if (arg && typeof arg === 'object') {
        const obj = arg;
        if (obj.inputValue !== undefined && typeof obj.inputValue !== 'string') {
            return false;
        }
        if (obj.agentMode !== undefined && typeof obj.agentMode !== 'boolean') {
            return false;
        }
        if (obj.isPartialQuery !== undefined && typeof obj.isPartialQuery !== 'boolean') {
            return false;
        }
        return true;
    }
    return false;
}
export function registerNewChatActions() {
    // Add "New Chat" submenu to Chat view menu
    MenuRegistry.appendMenuItem(MenuId.ViewTitle, {
        submenu: MenuId.ChatNewMenu,
        title: localize2(6019, "New Chat"),
        icon: Codicon.plus,
        when: ContextKeyExpr.equals('view', ChatViewId),
        group: 'navigation',
        order: -1,
        isSplitButton: true
    });
    registerAction2(class NewChatEditorAction extends Action2 {
        constructor() {
            super({
                id: 'workbench.action.chatEditor.newChat',
                title: localize2(6020, "New Chat"),
                icon: Codicon.plus,
                f1: false,
                precondition: ChatContextKeys.enabled,
            });
        }
        async run(accessor, ...args) {
            await clearChatEditor(accessor);
        }
    });
    registerAction2(class NewChatAction extends Action2 {
        constructor() {
            super({
                id: ACTION_ID_NEW_CHAT,
                title: localize2(6021, "New Chat"),
                category: CHAT_CATEGORY,
                icon: Codicon.plus,
                precondition: ContextKeyExpr.and(ChatContextKeys.enabled, ChatContextKeys.location.isEqualTo(ChatAgentLocation.Chat)),
                f1: true,
                menu: [
                    {
                        id: MenuId.ChatContext,
                        group: 'z_clear'
                    },
                    {
                        id: MenuId.ChatNewMenu,
                        group: '1_open',
                        order: 1,
                        when: ContextKeyExpr.and(ChatContextKeys.newChatButtonExperimentIcon.notEqualsTo('copilot'), ChatContextKeys.newChatButtonExperimentIcon.notEqualsTo('new-session'), ChatContextKeys.newChatButtonExperimentIcon.notEqualsTo('comment'))
                    }
                ],
                keybinding: {
                    weight: 200 /* KeybindingWeight.WorkbenchContrib */ + 1,
                    primary: 2048 /* KeyMod.CtrlCmd */ | 44 /* KeyCode.KeyN */,
                    secondary: [2048 /* KeyMod.CtrlCmd */ | 42 /* KeyCode.KeyL */],
                    mac: {
                        primary: 2048 /* KeyMod.CtrlCmd */ | 44 /* KeyCode.KeyN */,
                        secondary: [256 /* KeyMod.WinCtrl */ | 42 /* KeyCode.KeyL */]
                    },
                    when: ChatContextKeys.inChatSession
                }
            });
        }
        async run(accessor, ...args) {
            const executeCommandContext = isNewEditSessionActionContext(args[0]) ? args[0] : undefined;
            // Context from toolbar or lastFocusedWidget
            const context = getEditingSessionContext(accessor, args);
            await runNewChatAction(accessor, context, executeCommandContext);
        }
    });
    const iconVariants = [
        { idSuffix: '.copilotIcon', iconValue: 'copilot', icon: Codicon.copilot },
        { idSuffix: '.newSessionIcon', iconValue: 'new-session', icon: Codicon.newSession },
        { idSuffix: '.commentIcon', iconValue: 'comment', icon: Codicon.comment },
    ];
    for (const variant of iconVariants) {
        registerAction2(class extends Action2 {
            constructor() {
                super({
                    id: ACTION_ID_NEW_CHAT + variant.idSuffix,
                    title: localize2(6022, "New Chat"),
                    category: CHAT_CATEGORY,
                    icon: variant.icon,
                    precondition: ContextKeyExpr.and(ChatContextKeys.enabled, ChatContextKeys.location.isEqualTo(ChatAgentLocation.Chat)),
                    f1: false,
                    menu: [{
                            id: MenuId.ChatNewMenu,
                            group: '1_open',
                            order: 1,
                            when: ChatContextKeys.newChatButtonExperimentIcon.isEqualTo(variant.iconValue)
                        }]
                });
            }
            async run(accessor, ...args) {
                const executeCommandContext = isNewEditSessionActionContext(args[0]) ? args[0] : undefined;
                const context = getEditingSessionContext(accessor, args);
                await runNewChatAction(accessor, context, executeCommandContext);
            }
        });
    }
    CommandsRegistry.registerCommandAlias(ACTION_ID_NEW_EDIT_SESSION, ACTION_ID_NEW_CHAT);
    registerAction2(class NewLocalChatAction extends Action2 {
        constructor() {
            super({
                id: 'workbench.action.chat.newLocalChat',
                title: localize2(6023, "New Local Chat"),
                category: CHAT_CATEGORY,
                icon: Codicon.plus,
                precondition: ContextKeyExpr.and(ChatContextKeys.enabled, ChatContextKeys.location.isEqualTo(ChatAgentLocation.Chat)),
                f1: false,
            });
        }
        async run(accessor, ...args) {
            const executeCommandContext = isNewEditSessionActionContext(args[0]) ? args[0] : undefined;
            // Context from toolbar or lastFocusedWidget
            const context = getEditingSessionContext(accessor, args);
            await runNewChatAction(accessor, context, executeCommandContext, AgentSessionProviders.Local);
        }
    });
    MenuRegistry.appendMenuItem(MenuId.ChatViewSessionTitleNavigationToolbar, {
        command: {
            id: ACTION_ID_NEW_CHAT,
            title: localize2(6024, "Go Back"),
            icon: Codicon.arrowLeft,
        },
        when: ChatContextKeys.agentSessionsViewerOrientation.notEqualsTo(AgentSessionsViewerOrientation.SideBySide), // when sessions show side by side, no need for a back button
        group: 'navigation',
        order: 1
    });
    registerAction2(class UndoChatEditInteractionAction extends EditingSessionAction {
        constructor() {
            super({
                id: 'workbench.action.chat.undoEdit',
                title: localize2(6025, "Undo Last Edit"),
                category: CHAT_CATEGORY,
                icon: Codicon.discard,
                precondition: ContextKeyExpr.and(ChatContextKeys.chatEditingCanUndo, ChatContextKeys.enabled),
                f1: true,
                menu: [{
                        id: MenuId.ViewTitle,
                        when: ContextKeyExpr.equals('view', ChatViewId),
                        group: 'navigation',
                        order: -3,
                        isHiddenByDefault: true
                    }]
            });
        }
        async runEditingSessionAction(accessor, editingSession) {
            await editingSession.undoInteraction();
        }
    });
    registerAction2(class RedoChatEditInteractionAction extends EditingSessionAction {
        constructor() {
            super({
                id: 'workbench.action.chat.redoEdit',
                title: localize2(6026, "Redo Last Edit"),
                category: CHAT_CATEGORY,
                icon: Codicon.redo,
                precondition: ContextKeyExpr.and(ChatContextKeys.chatEditingCanRedo, ChatContextKeys.enabled),
                f1: true,
                menu: [
                    {
                        id: MenuId.ViewTitle,
                        when: ContextKeyExpr.equals('view', ChatViewId),
                        group: 'navigation',
                        order: -2,
                        isHiddenByDefault: true
                    }
                ]
            });
        }
        async runEditingSessionAction(accessor, editingSession) {
            const chatService = accessor.get(IChatService);
            await editingSession.redoInteraction();
            chatService.getSession(editingSession.chatSessionResource)?.setCheckpoint(undefined);
        }
    });
    registerAction2(class RedoChatCheckpoints extends EditingSessionAction {
        constructor() {
            super({
                id: 'workbench.action.chat.redoEdit2',
                title: localize2(6027, "Redo"),
                tooltip: localize2(6028, "Reapply discarded workspace changes and chat"),
                category: CHAT_CATEGORY,
                precondition: ContextKeyExpr.and(ChatContextKeys.chatEditingCanRedo, ChatContextKeys.enabled),
                f1: true,
                menu: [{
                        id: MenuId.ChatMessageRestoreCheckpoint,
                        when: ChatContextKeys.lockedToCodingAgent.negate(),
                        group: 'navigation',
                        order: -1
                    }]
            });
        }
        async runEditingSessionAction(accessor, editingSession) {
            const widget = accessor.get(IChatWidgetService);
            while (editingSession.canRedo.get()) {
                await editingSession.redoInteraction();
            }
            const currentWidget = widget.getWidgetBySessionResource(editingSession.chatSessionResource);
            const requestText = currentWidget?.viewModel?.model.checkpoint?.message.text;
            // if the input has the same text that we just restored, clear it.
            if (currentWidget?.inputEditor.getValue() === requestText) {
                currentWidget?.input.setValue('', false);
            }
            currentWidget?.viewModel?.model.setCheckpoint(undefined);
            currentWidget?.focusInput();
        }
    });
}
async function runNewChatAction(accessor, context, executeCommandContext, sessionType) {
    const accessibilityService = accessor.get(IAccessibilityService);
    const viewsService = accessor.get(IViewsService);
    const configurationService = accessor.get(IConfigurationService);
    const { editingSession, chatWidget: widget } = context ?? {};
    if (!widget) {
        return;
    }
    const dialogService = accessor.get(IDialogService);
    const model = widget.viewModel?.model;
    if (model && !(await handleCurrentEditingSession(model, undefined, dialogService))) {
        return;
    }
    await editingSession?.stop();
    // Create a new session, preserving the session type (or using the specified one)
    await clearChatSessionPreservingType(widget, viewsService, sessionType);
    widget.attachmentModel.clear(true);
    widget.focusInput();
    accessibilityService.alert(localize(6018, null));
    if (!executeCommandContext) {
        return;
    }
    if (typeof executeCommandContext.agentMode === 'boolean') {
        widget.input.setChatMode(executeCommandContext.agentMode ? ChatModeKind.Agent : ChatModeKind.Edit);
    }
    else if (widget.input.currentModeKind === ChatModeKind.Edit && configurationService.getValue(ChatConfiguration.EditModeHidden)) {
        widget.input.setChatMode(ChatModeKind.Agent);
    }
    if (executeCommandContext.inputValue) {
        if (executeCommandContext.isPartialQuery) {
            widget.setInput(executeCommandContext.inputValue);
        }
        else {
            widget.acceptInput(executeCommandContext.inputValue);
        }
    }
}
//# sourceMappingURL=chatNewActions.js.map