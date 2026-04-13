/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Codicon } from '../../../../../base/common/codicons.js';
import { DisposableStore } from '../../../../../base/common/lifecycle.js';
import { localize, localize2 } from '../../../../../nls.js';
import { Action2, MenuId, MenuRegistry, registerAction2 } from '../../../../../platform/actions/common/actions.js';
import { ContextKeyExpr } from '../../../../../platform/contextkey/common/contextkey.js';
import { KeybindingsRegistry } from '../../../../../platform/keybinding/common/keybindingsRegistry.js';
import { ChatViewId, IChatWidgetService } from '../../../chat/browser/chat.js';
import { ChatContextKeys } from '../../../chat/common/actions/chatContextKeys.js';
import { IChatService } from '../../../chat/common/chatService/chatService.js';
import { ChatAgentLocation, ChatConfiguration } from '../../../chat/common/constants.js';
import { isDetachedTerminalInstance, ITerminalChatService, ITerminalEditorService, ITerminalGroupService, ITerminalService } from '../../../terminal/browser/terminal.js';
import { registerActiveXtermAction } from '../../../terminal/browser/terminalActions.js';
import { TerminalContextKeys } from '../../../terminal/common/terminalContextKey.js';
import { MENU_TERMINAL_CHAT_WIDGET_STATUS, TerminalChatContextKeys } from './terminalChat.js';
import { IQuickInputService } from '../../../../../platform/quickinput/common/quickInput.js';
import { IInstantiationService } from '../../../../../platform/instantiation/common/instantiation.js';
import { getIconId } from '../../../terminal/browser/terminalIcon.js';
import { TerminalChatController } from './terminalChatController.js';
import { isString } from '../../../../../base/common/types.js';
import { CommandsRegistry } from '../../../../../platform/commands/common/commands.js';
import { IPreferencesService } from '../../../../services/preferences/common/preferences.js';
import { AbstractInlineChatAction } from '../../../inlineChat/browser/inlineChatActions.js';
registerActiveXtermAction({
    id: "workbench.action.terminal.chat.start" /* TerminalChatCommandId.Start */,
    title: localize2(15858, 'Open Inline Chat'),
    category: localize2(15859, "Terminal"),
    keybinding: {
        primary: 2048 /* KeyMod.CtrlCmd */ | 39 /* KeyCode.KeyI */,
        when: ContextKeyExpr.and(TerminalContextKeys.focusInAny),
        // HACK: Force weight to be higher than the extension contributed keybinding to override it until it gets replaced
        weight: 400 /* KeybindingWeight.ExternalExtension */ + 1, // KeybindingWeight.WorkbenchContrib,
    },
    f1: true,
    precondition: ContextKeyExpr.and(ChatContextKeys.enabled, ContextKeyExpr.or(TerminalContextKeys.processSupported, TerminalContextKeys.terminalHasBeenCreated), TerminalChatContextKeys.hasChatAgent),
    menu: {
        id: MenuId.TerminalInstanceContext,
        group: "0_chat" /* TerminalContextMenuGroup.Chat */,
        order: 2,
        when: ChatContextKeys.enabled
    },
    run: (_xterm, _accessor, activeInstance, opts) => {
        if (isDetachedTerminalInstance(activeInstance)) {
            return;
        }
        const contr = TerminalChatController.activeChatController || TerminalChatController.get(activeInstance);
        if (!contr) {
            return;
        }
        if (opts) {
            function isValidOptionsObject(obj) {
                return typeof obj === 'object' && obj !== null && 'query' in obj && isString(obj.query);
            }
            opts = isString(opts) ? { query: opts } : opts;
            if (isValidOptionsObject(opts)) {
                contr.updateInput(opts.query, false);
                if (!opts.isPartialQuery) {
                    contr.terminalChatWidget?.acceptInput();
                }
            }
        }
        contr.terminalChatWidget?.reveal();
    }
});
registerActiveXtermAction({
    id: "workbench.action.terminal.chat.close" /* TerminalChatCommandId.Close */,
    title: localize2(15860, 'Close'),
    category: AbstractInlineChatAction.category,
    keybinding: {
        primary: 9 /* KeyCode.Escape */,
        when: ContextKeyExpr.and(ContextKeyExpr.or(TerminalContextKeys.focus, TerminalChatContextKeys.focused), TerminalChatContextKeys.visible),
        weight: 200 /* KeybindingWeight.WorkbenchContrib */,
    },
    menu: [{
            id: MENU_TERMINAL_CHAT_WIDGET_STATUS,
            group: '0_main',
            order: 2,
        }],
    icon: Codicon.close,
    f1: true,
    precondition: ContextKeyExpr.and(ChatContextKeys.enabled, TerminalChatContextKeys.visible),
    run: (_xterm, _accessor, activeInstance) => {
        if (isDetachedTerminalInstance(activeInstance)) {
            return;
        }
        const contr = TerminalChatController.activeChatController || TerminalChatController.get(activeInstance);
        contr?.terminalChatWidget?.clear();
    }
});
registerActiveXtermAction({
    id: "workbench.action.terminal.chat.runCommand" /* TerminalChatCommandId.RunCommand */,
    title: localize2(15861, 'Run Chat Command'),
    shortTitle: localize2(15862, 'Run'),
    category: AbstractInlineChatAction.category,
    precondition: ContextKeyExpr.and(ChatContextKeys.enabled, ContextKeyExpr.or(TerminalContextKeys.processSupported, TerminalContextKeys.terminalHasBeenCreated), TerminalChatContextKeys.requestActive.negate(), TerminalChatContextKeys.responseContainsCodeBlock, TerminalChatContextKeys.responseContainsMultipleCodeBlocks.negate()),
    icon: Codicon.play,
    keybinding: {
        when: TerminalChatContextKeys.requestActive.negate(),
        weight: 200 /* KeybindingWeight.WorkbenchContrib */,
        primary: 2048 /* KeyMod.CtrlCmd */ | 3 /* KeyCode.Enter */,
    },
    menu: {
        id: MENU_TERMINAL_CHAT_WIDGET_STATUS,
        group: '0_main',
        order: 0,
        when: ContextKeyExpr.and(TerminalChatContextKeys.responseContainsCodeBlock, TerminalChatContextKeys.responseContainsMultipleCodeBlocks.negate(), TerminalChatContextKeys.requestActive.negate())
    },
    run: (_xterm, _accessor, activeInstance) => {
        if (isDetachedTerminalInstance(activeInstance)) {
            return;
        }
        const contr = TerminalChatController.activeChatController || TerminalChatController.get(activeInstance);
        contr?.terminalChatWidget?.acceptCommand(true);
    }
});
registerActiveXtermAction({
    id: "workbench.action.terminal.chat.runFirstCommand" /* TerminalChatCommandId.RunFirstCommand */,
    title: localize2(15863, 'Run First Chat Command'),
    shortTitle: localize2(15864, 'Run First'),
    category: AbstractInlineChatAction.category,
    precondition: ContextKeyExpr.and(ChatContextKeys.enabled, ContextKeyExpr.or(TerminalContextKeys.processSupported, TerminalContextKeys.terminalHasBeenCreated), TerminalChatContextKeys.requestActive.negate(), TerminalChatContextKeys.responseContainsMultipleCodeBlocks),
    icon: Codicon.play,
    keybinding: {
        when: TerminalChatContextKeys.requestActive.negate(),
        weight: 200 /* KeybindingWeight.WorkbenchContrib */,
        primary: 2048 /* KeyMod.CtrlCmd */ | 3 /* KeyCode.Enter */,
    },
    menu: {
        id: MENU_TERMINAL_CHAT_WIDGET_STATUS,
        group: '0_main',
        order: 0,
        when: ContextKeyExpr.and(TerminalChatContextKeys.responseContainsMultipleCodeBlocks, TerminalChatContextKeys.requestActive.negate())
    },
    run: (_xterm, _accessor, activeInstance) => {
        if (isDetachedTerminalInstance(activeInstance)) {
            return;
        }
        const contr = TerminalChatController.activeChatController || TerminalChatController.get(activeInstance);
        contr?.terminalChatWidget?.acceptCommand(true);
    }
});
registerActiveXtermAction({
    id: "workbench.action.terminal.chat.insertCommand" /* TerminalChatCommandId.InsertCommand */,
    title: localize2(15865, 'Insert Chat Command'),
    shortTitle: localize2(15866, 'Insert'),
    category: AbstractInlineChatAction.category,
    icon: Codicon.insert,
    precondition: ContextKeyExpr.and(ChatContextKeys.enabled, ContextKeyExpr.or(TerminalContextKeys.processSupported, TerminalContextKeys.terminalHasBeenCreated), TerminalChatContextKeys.requestActive.negate(), TerminalChatContextKeys.responseContainsCodeBlock, TerminalChatContextKeys.responseContainsMultipleCodeBlocks.negate()),
    keybinding: {
        when: TerminalChatContextKeys.requestActive.negate(),
        weight: 200 /* KeybindingWeight.WorkbenchContrib */,
        primary: 512 /* KeyMod.Alt */ | 3 /* KeyCode.Enter */,
        secondary: [2048 /* KeyMod.CtrlCmd */ | 3 /* KeyCode.Enter */ | 512 /* KeyMod.Alt */]
    },
    menu: {
        id: MENU_TERMINAL_CHAT_WIDGET_STATUS,
        group: '0_main',
        order: 1,
        when: ContextKeyExpr.and(TerminalChatContextKeys.responseContainsCodeBlock, TerminalChatContextKeys.responseContainsMultipleCodeBlocks.negate(), TerminalChatContextKeys.requestActive.negate())
    },
    run: (_xterm, _accessor, activeInstance) => {
        if (isDetachedTerminalInstance(activeInstance)) {
            return;
        }
        const contr = TerminalChatController.activeChatController || TerminalChatController.get(activeInstance);
        contr?.terminalChatWidget?.acceptCommand(false);
    }
});
registerActiveXtermAction({
    id: "workbench.action.terminal.chat.insertFirstCommand" /* TerminalChatCommandId.InsertFirstCommand */,
    title: localize2(15867, 'Insert First Chat Command'),
    shortTitle: localize2(15868, 'Insert First'),
    category: AbstractInlineChatAction.category,
    precondition: ContextKeyExpr.and(ChatContextKeys.enabled, ContextKeyExpr.or(TerminalContextKeys.processSupported, TerminalContextKeys.terminalHasBeenCreated), TerminalChatContextKeys.requestActive.negate(), TerminalChatContextKeys.responseContainsMultipleCodeBlocks),
    keybinding: {
        when: TerminalChatContextKeys.requestActive.negate(),
        weight: 200 /* KeybindingWeight.WorkbenchContrib */,
        primary: 512 /* KeyMod.Alt */ | 3 /* KeyCode.Enter */,
        secondary: [2048 /* KeyMod.CtrlCmd */ | 3 /* KeyCode.Enter */ | 512 /* KeyMod.Alt */]
    },
    menu: {
        id: MENU_TERMINAL_CHAT_WIDGET_STATUS,
        group: '0_main',
        order: 1,
        when: ContextKeyExpr.and(TerminalChatContextKeys.responseContainsMultipleCodeBlocks, TerminalChatContextKeys.requestActive.negate())
    },
    run: (_xterm, _accessor, activeInstance) => {
        if (isDetachedTerminalInstance(activeInstance)) {
            return;
        }
        const contr = TerminalChatController.activeChatController || TerminalChatController.get(activeInstance);
        contr?.terminalChatWidget?.acceptCommand(false);
    }
});
registerActiveXtermAction({
    id: "workbench.action.terminal.chat.rerunRequest" /* TerminalChatCommandId.RerunRequest */,
    title: localize2(15869, "Rerun Request"),
    f1: false,
    icon: Codicon.refresh,
    category: AbstractInlineChatAction.category,
    precondition: ContextKeyExpr.and(ChatContextKeys.enabled, ContextKeyExpr.or(TerminalContextKeys.processSupported, TerminalContextKeys.terminalHasBeenCreated), TerminalChatContextKeys.requestActive.negate()),
    keybinding: {
        weight: 200 /* KeybindingWeight.WorkbenchContrib */,
        primary: 2048 /* KeyMod.CtrlCmd */ | 48 /* KeyCode.KeyR */,
        when: TerminalChatContextKeys.focused
    },
    menu: {
        id: MENU_TERMINAL_CHAT_WIDGET_STATUS,
        group: '0_main',
        order: 5,
        when: ContextKeyExpr.and(TerminalChatContextKeys.inputHasText.toNegated(), TerminalChatContextKeys.requestActive.negate())
    },
    run: async (_xterm, _accessor, activeInstance) => {
        const chatService = _accessor.get(IChatService);
        const chatWidgetService = _accessor.get(IChatWidgetService);
        const contr = TerminalChatController.activeChatController;
        const model = contr?.terminalChatWidget?.inlineChatWidget.chatWidget.viewModel?.model;
        if (!model) {
            return;
        }
        const lastRequest = model.getRequests().at(-1);
        if (lastRequest) {
            const widget = chatWidgetService.getWidgetBySessionResource(model.sessionResource);
            await chatService.resendRequest(lastRequest, {
                noCommandDetection: false,
                attempt: lastRequest.attempt + 1,
                location: ChatAgentLocation.Terminal,
                userSelectedModelId: widget?.input.currentLanguageModel
            });
        }
    }
});
registerActiveXtermAction({
    id: "workbench.action.terminal.chat.viewInChat" /* TerminalChatCommandId.ViewInChat */,
    title: localize2(15870, 'View in Chat'),
    category: AbstractInlineChatAction.category,
    precondition: ContextKeyExpr.and(ChatContextKeys.enabled, ContextKeyExpr.or(TerminalContextKeys.processSupported, TerminalContextKeys.terminalHasBeenCreated), TerminalChatContextKeys.requestActive.negate()),
    icon: Codicon.chatSparkle,
    menu: [{
            id: MENU_TERMINAL_CHAT_WIDGET_STATUS,
            group: 'zzz',
            order: 1,
            isHiddenByDefault: true,
            when: ContextKeyExpr.and(TerminalChatContextKeys.responseContainsCodeBlock, TerminalChatContextKeys.requestActive.negate()),
        }],
    run: (_xterm, _accessor, activeInstance) => {
        if (isDetachedTerminalInstance(activeInstance)) {
            return;
        }
        const contr = TerminalChatController.activeChatController || TerminalChatController.get(activeInstance);
        contr?.viewInChat();
    }
});
registerAction2(class ShowChatTerminalsAction extends Action2 {
    constructor() {
        super({
            id: "workbench.action.terminal.chat.viewHiddenChatTerminals" /* TerminalChatCommandId.ViewHiddenChatTerminals */,
            title: localize2(15871, 'View Hidden Chat Terminals'),
            category: localize2(15872, 'Terminal'),
            f1: true,
            precondition: ContextKeyExpr.and(TerminalChatContextKeys.hasHiddenChatTerminals, ChatContextKeys.enabled),
            menu: [{
                    id: MenuId.ViewTitle,
                    when: ContextKeyExpr.and(TerminalChatContextKeys.hasHiddenChatTerminals, ContextKeyExpr.equals('view', ChatViewId)),
                    group: 'terminal',
                    order: 0,
                    isHiddenByDefault: true
                }]
        });
    }
    async run(accessor) {
        const terminalService = accessor.get(ITerminalService);
        const groupService = accessor.get(ITerminalGroupService);
        const editorService = accessor.get(ITerminalEditorService);
        const terminalChatService = accessor.get(ITerminalChatService);
        const quickInputService = accessor.get(IQuickInputService);
        const instantiationService = accessor.get(IInstantiationService);
        const chatService = accessor.get(IChatService);
        const visible = new Set([...groupService.instances, ...editorService.instances]);
        const toolInstances = terminalChatService.getToolSessionTerminalInstances();
        if (toolInstances.length === 0) {
            return;
        }
        const all = new Map();
        for (const i of toolInstances) {
            if (!visible.has(i)) {
                all.set(i.instanceId, i);
            }
        }
        // If there are no hidden terminals, return early
        if (all.size === 0) {
            return;
        }
        // If there's only one hidden terminal, show it directly without the quick pick
        if (all.size === 1) {
            const instance = Array.from(all.values())[0];
            terminalService.setActiveInstance(instance);
            await terminalService.revealTerminal(instance);
            await terminalService.focusInstance(instance);
            return;
        }
        const items = [];
        const lastCommandLocalized = (command) => localize2(15873, 'Last: {0}', command).value;
        const MAX_DETAIL_LENGTH = 80;
        const metas = [];
        for (const instance of all.values()) {
            const iconId = instantiationService.invokeFunction(getIconId, instance);
            const label = `$(${iconId}) ${instance.title}`;
            const lastCommand = instance.capabilities.get(2 /* TerminalCapability.CommandDetection */)?.commands.at(-1)?.command;
            // Get the chat session title
            const chatSessionResource = terminalChatService.getChatSessionResourceForInstance(instance);
            let chatSessionTitle;
            if (chatSessionResource) {
                const liveTitle = chatService.getSession(chatSessionResource)?.title;
                chatSessionTitle = liveTitle ?? chatService.getSessionTitle(chatSessionResource);
            }
            const description = chatSessionTitle;
            let detail;
            let tooltip;
            if (lastCommand) {
                // Take only the first line if the command spans multiple lines
                const commandLines = lastCommand.split('\n');
                const firstLine = commandLines[0];
                const displayCommand = firstLine.length > MAX_DETAIL_LENGTH ? firstLine.substring(0, MAX_DETAIL_LENGTH) + '…' : firstLine;
                detail = lastCommandLocalized(displayCommand);
                // If the command was truncated or has multiple lines, provide a tooltip with the full command
                const wasTruncated = firstLine.length > MAX_DETAIL_LENGTH;
                const hasMultipleLines = commandLines.length > 1;
                if (wasTruncated || hasMultipleLines) {
                    // Use markdown code block to preserve formatting for multi-line commands
                    if (hasMultipleLines) {
                        tooltip = { value: `\`\`\`\n${lastCommand}\n\`\`\``, supportThemeIcons: true };
                    }
                    else {
                        tooltip = lastCommandLocalized(lastCommand);
                    }
                }
            }
            metas.push({
                label,
                description,
                detail,
                tooltip,
                id: String(instance.instanceId),
            });
        }
        for (const m of metas) {
            items.push({
                label: m.label,
                description: m.description,
                detail: m.detail,
                tooltip: m.tooltip,
                id: m.id
            });
        }
        const qp = quickInputService.createQuickPick();
        qp.placeholder = localize2(15874, 'Select a chat terminal to show and focus').value;
        qp.items = items;
        qp.canSelectMany = false;
        qp.title = localize2(15875, 'Chat Terminals').value;
        qp.matchOnDescription = true;
        qp.matchOnDetail = true;
        const qpDisposables = new DisposableStore();
        qpDisposables.add(qp);
        qpDisposables.add(qp.onDidAccept(async () => {
            const sel = qp.selectedItems[0];
            if (sel) {
                const instance = all.get(Number(sel.id));
                if (instance) {
                    terminalService.setActiveInstance(instance);
                    await terminalService.revealTerminal(instance);
                    qp.hide();
                    await terminalService.focusInstance(instance);
                }
                else {
                    qp.hide();
                }
            }
            else {
                qp.hide();
            }
        }));
        qpDisposables.add(qp.onDidHide(() => {
            qpDisposables.dispose();
            qp.dispose();
        }));
        qp.show();
    }
});
KeybindingsRegistry.registerCommandAndKeybindingRule({
    id: "workbench.action.terminal.chat.focusMostRecentChatTerminal" /* TerminalChatCommandId.FocusMostRecentChatTerminal */,
    weight: 200 /* KeybindingWeight.WorkbenchContrib */,
    when: ChatContextKeys.inChatSession,
    handler: async (accessor) => {
        const terminalChatService = accessor.get(ITerminalChatService);
        const part = terminalChatService.getMostRecentProgressPart();
        if (!part) {
            return;
        }
        await part.focusTerminal();
    }
});
KeybindingsRegistry.registerCommandAndKeybindingRule({
    id: "workbench.action.terminal.chat.focusMostRecentChatTerminalOutput" /* TerminalChatCommandId.FocusMostRecentChatTerminalOutput */,
    weight: 200 /* KeybindingWeight.WorkbenchContrib */,
    when: ChatContextKeys.inChatSession,
    primary: 2048 /* KeyMod.CtrlCmd */ | 1024 /* KeyMod.Shift */ | 512 /* KeyMod.Alt */ | 45 /* KeyCode.KeyO */,
    handler: async (accessor) => {
        const terminalChatService = accessor.get(ITerminalChatService);
        const part = terminalChatService.getMostRecentProgressPart();
        if (!part) {
            return;
        }
        await part.toggleOutputFromKeyboard();
    }
});
MenuRegistry.appendMenuItem(MenuId.CommandPalette, {
    command: {
        id: "workbench.action.terminal.chat.focusMostRecentChatTerminal" /* TerminalChatCommandId.FocusMostRecentChatTerminal */,
        title: localize(15856, null),
    },
    when: ChatContextKeys.inChatSession
});
MenuRegistry.appendMenuItem(MenuId.CommandPalette, {
    command: {
        id: "workbench.action.terminal.chat.focusMostRecentChatTerminalOutput" /* TerminalChatCommandId.FocusMostRecentChatTerminalOutput */,
        title: localize(15857, null),
    },
    when: ChatContextKeys.inChatSession
});
CommandsRegistry.registerCommand("workbench.action.terminal.chat.openTerminalSettingsLink" /* TerminalChatCommandId.OpenTerminalSettingsLink */, async (accessor, scopeRaw) => {
    const preferencesService = accessor.get(IPreferencesService);
    if (scopeRaw === 'global') {
        preferencesService.openSettings({
            query: `@id:${ChatConfiguration.GlobalAutoApprove}`
        });
    }
    else {
        const scope = parseInt(scopeRaw);
        const target = !isNaN(scope) ? scope : undefined;
        const options = {
            jsonEditor: true,
            revealSetting: {
                key: "chat.tools.terminal.autoApprove" /* TerminalChatAgentToolsSettingId.AutoApprove */,
            }
        };
        switch (target) {
            case 1 /* ConfigurationTarget.APPLICATION */:
                preferencesService.openApplicationSettings(options);
                break;
            case 2 /* ConfigurationTarget.USER */:
            case 3 /* ConfigurationTarget.USER_LOCAL */:
                preferencesService.openUserSettings(options);
                break;
            case 4 /* ConfigurationTarget.USER_REMOTE */:
                preferencesService.openRemoteSettings(options);
                break;
            case 5 /* ConfigurationTarget.WORKSPACE */:
            case 6 /* ConfigurationTarget.WORKSPACE_FOLDER */:
                preferencesService.openWorkspaceSettings(options);
                break;
            default: {
                // Fallback if something goes wrong
                preferencesService.openSettings({
                    target: 2 /* ConfigurationTarget.USER */,
                    query: `@id:${"chat.tools.terminal.autoApprove" /* TerminalChatAgentToolsSettingId.AutoApprove */}`,
                });
                break;
            }
        }
    }
});
CommandsRegistry.registerCommand("workbench.action.terminal.chat.disableSessionAutoApproval" /* TerminalChatCommandId.DisableSessionAutoApproval */, async (accessor, chatSessionResource) => {
    const terminalChatService = accessor.get(ITerminalChatService);
    terminalChatService.setChatSessionAutoApproval(chatSessionResource, false);
});
//# sourceMappingURL=terminalChatActions.js.map