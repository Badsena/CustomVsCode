/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { isAncestorOfActiveElement } from '../../../../../base/browser/dom.js';
import { alert } from '../../../../../base/browser/ui/aria/aria.js';
import { coalesce } from '../../../../../base/common/arrays.js';
import { timeout } from '../../../../../base/common/async.js';
import { Codicon } from '../../../../../base/common/codicons.js';
import { safeIntl } from '../../../../../base/common/date.js';
import { Event } from '../../../../../base/common/event.js';
import { MarkdownString } from '../../../../../base/common/htmlContent.js';
import { language } from '../../../../../base/common/platform.js';
import { basename } from '../../../../../base/common/resources.js';
import { ThemeIcon } from '../../../../../base/common/themables.js';
import { URI } from '../../../../../base/common/uri.js';
import { EditorAction2 } from '../../../../../editor/browser/editorExtensions.js';
import { localize, localize2 } from '../../../../../nls.js';
import { Action2, MenuId, MenuRegistry, registerAction2 } from '../../../../../platform/actions/common/actions.js';
import { ICommandService } from '../../../../../platform/commands/common/commands.js';
import { IConfigurationService } from '../../../../../platform/configuration/common/configuration.js';
import { ContextKeyExpr } from '../../../../../platform/contextkey/common/contextkey.js';
import { IsLinuxContext, IsWindowsContext } from '../../../../../platform/contextkey/common/contextkeys.js';
import { IDialogService } from '../../../../../platform/dialogs/common/dialogs.js';
import { IFileService } from '../../../../../platform/files/common/files.js';
import { IInstantiationService } from '../../../../../platform/instantiation/common/instantiation.js';
import { ILogService } from '../../../../../platform/log/common/log.js';
import { INotificationService } from '../../../../../platform/notification/common/notification.js';
import { IOpenerService } from '../../../../../platform/opener/common/opener.js';
import product from '../../../../../platform/product/common/product.js';
import { ITelemetryService } from '../../../../../platform/telemetry/common/telemetry.js';
import { ActiveEditorContext } from '../../../../common/contextkeys.js';
import { IViewDescriptorService } from '../../../../common/views.js';
import { ChatEntitlement, IChatEntitlementService } from '../../../../services/chat/common/chatEntitlementService.js';
import { ACTIVE_GROUP, AUX_WINDOW_GROUP, SIDE_GROUP } from '../../../../services/editor/common/editorService.js';
import { IHostService } from '../../../../services/host/browser/host.js';
import { IWorkbenchLayoutService } from '../../../../services/layout/browser/layoutService.js';
import { IPreferencesService } from '../../../../services/preferences/common/preferences.js';
import { IViewsService } from '../../../../services/views/common/viewsService.js';
import { EXTENSIONS_CATEGORY, IExtensionsWorkbenchService } from '../../../extensions/common/extensions.js';
import { SCMHistoryItemChangeRangeContentProvider } from '../../../scm/browser/scmHistoryChatContext.js';
import { ISCMService } from '../../../scm/common/scm.js';
import { IChatAgentService } from '../../common/participants/chatAgents.js';
import { ChatContextKeys } from '../../common/actions/chatContextKeys.js';
import { ChatMode, IChatModeService } from '../../common/chatModes.js';
import { IChatService } from '../../common/chatService/chatService.js';
import { isRequestVM } from '../../common/model/chatViewModel.js';
import { IChatWidgetHistoryService } from '../../common/widget/chatWidgetHistoryService.js';
import { ChatAgentLocation, ChatConfiguration, ChatModeKind } from '../../common/constants.js';
import { ILanguageModelsService } from '../../common/languageModels.js';
import { CopilotUsageExtensionFeatureId } from '../../common/languageModelStats.js';
import { ILanguageModelToolsConfirmationService } from '../../common/tools/languageModelToolsConfirmationService.js';
import { ILanguageModelToolsService, isToolSet } from '../../common/tools/languageModelToolsService.js';
import { ChatViewId, IChatWidgetService, isIChatViewViewContext } from '../chat.js';
import { ChatEditorInput, showClearEditingSessionConfirmation } from '../widgetHosts/editor/chatEditorInput.js';
import { convertBufferToScreenshotVariable } from '../attachments/chatScreenshotContext.js';
import { getChatSessionType, LocalChatSessionUri } from '../../common/model/chatUri.js';
import { localChatSessionType } from '../../common/chatSessionsService.js';
import { generateUuid } from '../../../../../base/common/uuid.js';
export const CHAT_CATEGORY = localize2(5861, 'Chat');
export const ACTION_ID_NEW_CHAT = `workbench.action.chat.newChat`;
export const ACTION_ID_NEW_EDIT_SESSION = `workbench.action.chat.newEditSession`;
export const ACTION_ID_OPEN_CHAT = 'workbench.action.openChat';
export const CHAT_OPEN_ACTION_ID = 'workbench.action.chat.open';
export const CHAT_SETUP_ACTION_ID = 'workbench.action.chat.triggerSetup';
export const CHAT_SETUP_SUPPORT_ANONYMOUS_ACTION_ID = 'workbench.action.chat.triggerSetupSupportAnonymousAction';
const TOGGLE_CHAT_ACTION_ID = 'workbench.action.chat.toggle';
export const GENERATE_AGENT_INSTRUCTIONS_COMMAND_ID = 'workbench.action.chat.generateAgentInstructions';
export const GENERATE_ON_DEMAND_INSTRUCTIONS_COMMAND_ID = 'workbench.action.chat.generateOnDemandInstructions';
export const GENERATE_PROMPT_COMMAND_ID = 'workbench.action.chat.generatePrompt';
export const GENERATE_SKILL_COMMAND_ID = 'workbench.action.chat.generateSkill';
export const GENERATE_AGENT_COMMAND_ID = 'workbench.action.chat.generateAgent';
export const GENERATE_HOOK_COMMAND_ID = 'workbench.action.chat.generateHook';
export const INSERT_FORK_CONVERSATION_COMMAND_ID = 'workbench.action.chat.insertForkConversationCommand';
export const INSERT_TROUBLESHOOT_COMMAND_ID = 'workbench.action.chat.insertTroubleshootCommand';
const defaultChat = {
    manageSettingsUrl: product.defaultChatAgent?.manageSettingsUrl ?? '',
    provider: product.defaultChatAgent?.provider ?? { enterprise: { id: '' } },
    completionsAdvancedSetting: product.defaultChatAgent?.completionsAdvancedSetting ?? '',
    completionsMenuCommand: product.defaultChatAgent?.completionsMenuCommand ?? '',
};
export const CHAT_CONFIG_MENU_ID = new MenuId('workbench.chat.menu.config');
const OPEN_CHAT_QUOTA_EXCEEDED_DIALOG = 'workbench.action.chat.openQuotaExceededDialog';
class OpenChatGlobalAction extends Action2 {
    constructor(overrides, mode) {
        super({
            ...overrides,
            icon: Codicon.chatSparkle,
            f1: true,
            category: CHAT_CATEGORY,
            precondition: ContextKeyExpr.and(ChatContextKeys.Setup.hidden.negate(), ChatContextKeys.Setup.disabled.negate())
        });
        this.mode = mode;
    }
    async run(accessor, opts) {
        opts = typeof opts === 'string' ? { query: opts } : opts;
        const chatService = accessor.get(IChatService);
        const widgetService = accessor.get(IChatWidgetService);
        const toolsService = accessor.get(ILanguageModelToolsService);
        const hostService = accessor.get(IHostService);
        const chatAgentService = accessor.get(IChatAgentService);
        const instaService = accessor.get(IInstantiationService);
        const commandService = accessor.get(ICommandService);
        const chatModeService = accessor.get(IChatModeService);
        const fileService = accessor.get(IFileService);
        const languageModelService = accessor.get(ILanguageModelsService);
        const scmService = accessor.get(ISCMService);
        const logService = accessor.get(ILogService);
        const configurationService = accessor.get(IConfigurationService);
        let chatWidget = widgetService.lastFocusedWidget;
        // When this was invoked to switch to a mode via keybinding, and some chat widget is focused, use that one.
        // Otherwise, open the view.
        if (!this.mode || !chatWidget || !isAncestorOfActiveElement(chatWidget.domNode)) {
            chatWidget = await widgetService.revealWidget();
        }
        if (!chatWidget) {
            return;
        }
        const switchToMode = (opts?.mode ? chatModeService.findModeByName(opts?.mode) : undefined) ?? this.mode;
        if (switchToMode) {
            await this.handleSwitchToMode(switchToMode, chatWidget, instaService, commandService);
        }
        if (opts?.modelSelector) {
            const ids = await languageModelService.selectLanguageModels(opts.modelSelector);
            const id = ids.sort().at(0);
            if (!id) {
                throw new Error(`No language models found matching selector: ${JSON.stringify(opts.modelSelector)}.`);
            }
            const model = languageModelService.lookupLanguageModel(id);
            if (!model) {
                throw new Error(`Language model not loaded: ${id}.`);
            }
            chatWidget.input.setCurrentLanguageModel({ metadata: model, identifier: id });
        }
        if (opts?.toolsInclude || opts?.toolsExclude) {
            const model = chatWidget.input.selectedLanguageModel.get()?.metadata;
            const allTools = Array.from(toolsService.getTools(model));
            const allToolSets = Array.from(toolsService.getToolSetsForModel(model));
            const result = computeToolEnablementMap({
                allTools,
                allToolSets,
                toolsInclude: opts.toolsInclude,
                toolsExclude: opts.toolsExclude,
            });
            for (const identifier of result.unknownIdentifiers) {
                logService.warn(`Tool filtering: Unknown identifier '${identifier}' - no matching tool or toolset found.`);
            }
            chatWidget.input.selectedToolsModel.set(result.enablementMap, true);
        }
        if (opts?.previousRequests?.length && chatWidget.viewModel) {
            for (const { request, response } of opts.previousRequests) {
                chatService.addCompleteRequest(chatWidget.viewModel.sessionResource, request, undefined, 0, { message: response });
            }
        }
        if (opts?.attachScreenshot) {
            const screenshot = await hostService.getScreenshot();
            if (screenshot) {
                chatWidget.attachmentModel.addContext(convertBufferToScreenshotVariable(screenshot));
            }
        }
        if (opts?.attachFiles) {
            for (const file of opts.attachFiles) {
                const uri = file instanceof URI ? file : file.uri;
                const range = file instanceof URI ? undefined : file.range;
                if (await fileService.exists(uri)) {
                    chatWidget.attachmentModel.addFile(uri, range);
                }
            }
        }
        if (opts?.attachHistoryItemChanges) {
            for (const historyItemChange of opts.attachHistoryItemChanges) {
                const repository = scmService.getRepository(URI.file(historyItemChange.uri.path));
                const historyProvider = repository?.provider.historyProvider.get();
                if (!historyProvider) {
                    continue;
                }
                const historyItem = await historyProvider.resolveHistoryItem(historyItemChange.historyItemId);
                if (!historyItem) {
                    continue;
                }
                chatWidget.attachmentModel.addContext({
                    id: historyItemChange.uri.toString(),
                    name: `${basename(historyItemChange.uri)}`,
                    value: historyItemChange.uri,
                    historyItem: historyItem,
                    kind: 'scmHistoryItemChange'
                });
            }
        }
        if (opts?.attachHistoryItemChangeRanges) {
            for (const historyItemChangeRange of opts.attachHistoryItemChangeRanges) {
                const repository = scmService.getRepository(URI.file(historyItemChangeRange.end.uri.path));
                const historyProvider = repository?.provider.historyProvider.get();
                if (!repository || !historyProvider) {
                    continue;
                }
                const [historyItemStart, historyItemEnd] = await Promise.all([
                    historyProvider.resolveHistoryItem(historyItemChangeRange.start.historyItemId),
                    historyProvider.resolveHistoryItem(historyItemChangeRange.end.historyItemId),
                ]);
                if (!historyItemStart || !historyItemEnd) {
                    continue;
                }
                const uri = historyItemChangeRange.end.uri.with({
                    scheme: SCMHistoryItemChangeRangeContentProvider.scheme,
                    query: JSON.stringify({
                        repositoryId: repository.id,
                        start: historyItemStart.id,
                        end: historyItemChangeRange.end.historyItemId
                    })
                });
                chatWidget.attachmentModel.addContext({
                    id: uri.toString(),
                    name: `${basename(uri)}`,
                    value: uri,
                    historyItemChangeStart: {
                        uri: historyItemChangeRange.start.uri,
                        historyItem: historyItemStart
                    },
                    historyItemChangeEnd: {
                        uri: historyItemChangeRange.end.uri,
                        historyItem: {
                            ...historyItemEnd,
                            displayId: historyItemChangeRange.end.historyItemId
                        }
                    },
                    kind: 'scmHistoryItemChangeRange'
                });
            }
        }
        let resp;
        if (opts?.query) {
            if (opts.isPartialQuery) {
                chatWidget.input.showScrollbarUntilAccept();
                chatWidget.setInput(opts.query);
            }
            else {
                if (!chatWidget.viewModel) {
                    await Event.toPromise(chatWidget.onDidChangeViewModel);
                }
                await waitForDefaultAgent(chatAgentService, chatWidget.input.currentModeKind);
                chatWidget.setInput(opts.query); // wait until the model is restored before setting the input, or it will be cleared when the model is restored
                resp = chatWidget.acceptInput();
            }
        }
        if (opts?.toolIds && opts.toolIds.length > 0) {
            for (const toolId of opts.toolIds) {
                const tool = toolsService.getTool(toolId);
                if (tool) {
                    chatWidget.attachmentModel.addContext({
                        id: tool.id,
                        name: tool.displayName,
                        fullName: tool.displayName,
                        value: undefined,
                        icon: ThemeIcon.isThemeIcon(tool.icon) ? tool.icon : undefined,
                        kind: 'tool'
                    });
                }
            }
        }
        chatWidget.focusInput();
        if (opts?.blockOnResponse) {
            const response = await resp;
            if (response) {
                const autoReplyEnabled = configurationService.getValue(ChatConfiguration.AutoReply);
                await new Promise(resolve => {
                    const d = response.onDidChange(async () => {
                        if (response.isComplete) {
                            d.dispose();
                            resolve();
                            return;
                        }
                        const pendingConfirmation = response.isPendingConfirmation.get();
                        if (pendingConfirmation) {
                            // Check if the pending confirmation is a question carousel that will be auto-replied.
                            // Only question carousels are auto-replied; other confirmation types (tool approvals,
                            // elicitations, etc.) should cause us to resolve immediately.
                            const hasPendingQuestionCarousel = response.response.value.some(part => part.kind === 'questionCarousel' && !part.isUsed);
                            if (autoReplyEnabled && hasPendingQuestionCarousel) {
                                // Auto-reply will handle this question carousel, keep waiting
                                return;
                            }
                            d.dispose();
                            resolve();
                        }
                    });
                });
                const confirmationInfo = getPendingConfirmationInfo(response);
                if (confirmationInfo) {
                    return { ...response.result, ...confirmationInfo };
                }
                return { ...response.result };
            }
        }
        return undefined;
    }
    async handleSwitchToMode(switchToMode, chatWidget, instaService, commandService) {
        const currentMode = chatWidget.input.currentModeKind;
        if (switchToMode) {
            const model = chatWidget.viewModel?.model;
            const chatModeCheck = model ? await instaService.invokeFunction(handleModeSwitch, currentMode, switchToMode.kind, model.getRequests().length, model) : { needToClearSession: false };
            if (!chatModeCheck) {
                return;
            }
            chatWidget.input.setChatMode(switchToMode.id);
            if (chatModeCheck.needToClearSession) {
                await commandService.executeCommand(ACTION_ID_NEW_CHAT);
            }
        }
    }
}
async function waitForDefaultAgent(chatAgentService, mode) {
    const defaultAgent = chatAgentService.getDefaultAgent(ChatAgentLocation.Chat, mode);
    if (defaultAgent) {
        return;
    }
    await Promise.race([
        Event.toPromise(Event.filter(chatAgentService.onDidChangeAgents, () => {
            const defaultAgent = chatAgentService.getDefaultAgent(ChatAgentLocation.Chat, mode);
            return Boolean(defaultAgent);
        })),
        timeout(60_000).then(() => { throw new Error('Timed out waiting for default agent'); })
    ]);
}
/**
 * Extracts detailed information about the pending confirmation from a chat response.
 * Returns undefined if there is no pending confirmation.
 */
function getPendingConfirmationInfo(response) {
    for (const part of response.response.value) {
        if (part.kind === 'toolInvocation') {
            const state = part.state.get();
            if (state.type === 1 /* IChatToolInvocation.StateKind.WaitingForConfirmation */) {
                return {
                    type: 'confirmation',
                    kind: 'toolInvocation',
                    toolId: part.toolId,
                };
            }
            if (state.type === 3 /* IChatToolInvocation.StateKind.WaitingForPostApproval */) {
                return {
                    type: 'confirmation',
                    kind: 'toolPostApproval',
                    toolId: part.toolId,
                };
            }
        }
        if (part.kind === 'confirmation' && !part.isUsed) {
            return {
                type: 'confirmation',
                kind: 'confirmation',
                title: part.title,
                data: part.data,
            };
        }
        if (part.kind === 'questionCarousel' && !part.isUsed) {
            return {
                type: 'confirmation',
                kind: 'questionCarousel',
                questions: part.questions,
            };
        }
        if (part.kind === 'elicitation2' && part.state.get() === "pending" /* ElicitationState.Pending */) {
            const title = part.title;
            return {
                type: 'confirmation',
                kind: 'elicitation',
                title: typeof title === 'string' ? title : title.value,
            };
        }
    }
    return undefined;
}
class PrimaryOpenChatGlobalAction extends OpenChatGlobalAction {
    constructor() {
        super({
            id: CHAT_OPEN_ACTION_ID,
            title: localize2(5862, "Open Chat"),
            keybinding: {
                weight: 200 /* KeybindingWeight.WorkbenchContrib */,
                primary: 2048 /* KeyMod.CtrlCmd */ | 512 /* KeyMod.Alt */ | 39 /* KeyCode.KeyI */,
                mac: {
                    primary: 2048 /* KeyMod.CtrlCmd */ | 256 /* KeyMod.WinCtrl */ | 39 /* KeyCode.KeyI */
                }
            },
            menu: [{
                    id: MenuId.ChatTitleBarMenu,
                    group: 'a_open',
                    order: 1
                }]
        });
    }
}
export function getOpenChatActionIdForMode(mode) {
    return `workbench.action.chat.open${mode.name.get()}`;
}
export class ModeOpenChatGlobalAction extends OpenChatGlobalAction {
    constructor(mode, keybinding) {
        super({
            id: getOpenChatActionIdForMode(mode),
            title: localize2(5863, "Open Chat ({0})", mode.label.get()),
            keybinding
        }, mode);
    }
}
export function registerChatActions() {
    registerAction2(PrimaryOpenChatGlobalAction);
    registerAction2(class extends ModeOpenChatGlobalAction {
        constructor() { super(ChatMode.Ask); }
    });
    registerAction2(class extends ModeOpenChatGlobalAction {
        constructor() {
            super(ChatMode.Agent, {
                when: ContextKeyExpr.has(`config.${ChatConfiguration.AgentEnabled}`),
                weight: 200 /* KeybindingWeight.WorkbenchContrib */,
                primary: 2048 /* KeyMod.CtrlCmd */ | 1024 /* KeyMod.Shift */ | 39 /* KeyCode.KeyI */,
                linux: {
                    primary: 2048 /* KeyMod.CtrlCmd */ | 512 /* KeyMod.Alt */ | 1024 /* KeyMod.Shift */ | 39 /* KeyCode.KeyI */
                }
            });
        }
    });
    registerAction2(class extends ModeOpenChatGlobalAction {
        constructor() { super(ChatMode.Edit); }
    });
    registerAction2(class ToggleChatAction extends Action2 {
        constructor() {
            super({
                id: TOGGLE_CHAT_ACTION_ID,
                title: localize2(5864, "Toggle Chat"),
                category: CHAT_CATEGORY
            });
        }
        async run(accessor) {
            const layoutService = accessor.get(IWorkbenchLayoutService);
            const viewsService = accessor.get(IViewsService);
            const viewDescriptorService = accessor.get(IViewDescriptorService);
            const widgetService = accessor.get(IChatWidgetService);
            const chatLocation = viewDescriptorService.getViewLocationById(ChatViewId);
            const chatVisible = viewsService.isViewVisible(ChatViewId);
            if (chatVisible) {
                this.updatePartVisibility(layoutService, chatLocation, false);
            }
            else {
                this.updatePartVisibility(layoutService, chatLocation, true);
                (await widgetService.revealWidget())?.focusInput();
            }
        }
        updatePartVisibility(layoutService, location, visible) {
            let part;
            switch (location) {
                case 1 /* ViewContainerLocation.Panel */:
                    part = "workbench.parts.panel" /* Parts.PANEL_PART */;
                    break;
                case 0 /* ViewContainerLocation.Sidebar */:
                    part = "workbench.parts.sidebar" /* Parts.SIDEBAR_PART */;
                    break;
                case 2 /* ViewContainerLocation.AuxiliaryBar */:
                    part = "workbench.parts.auxiliarybar" /* Parts.AUXILIARYBAR_PART */;
                    break;
            }
            if (part) {
                layoutService.setPartHidden(!visible, part);
            }
        }
    });
    registerAction2(class NewChatEditorAction extends Action2 {
        constructor() {
            super({
                id: ACTION_ID_OPEN_CHAT,
                title: localize2(5865, "New Chat Editor"),
                icon: Codicon.plus,
                f1: true,
                category: CHAT_CATEGORY,
                precondition: ChatContextKeys.enabled,
                keybinding: {
                    weight: 200 /* KeybindingWeight.WorkbenchContrib */,
                    primary: 2048 /* KeyMod.CtrlCmd */ | 44 /* KeyCode.KeyN */,
                    when: ContextKeyExpr.and(ChatContextKeys.inChatSession, ChatContextKeys.inChatEditor)
                },
                menu: [{
                        id: MenuId.ChatTitleBarMenu,
                        group: 'b_new',
                        order: 0
                    }, {
                        id: MenuId.ChatNewMenu,
                        group: '2_new',
                        order: 2
                    }, {
                        id: MenuId.EditorTitle,
                        group: 'navigation',
                        when: ContextKeyExpr.and(ActiveEditorContext.isEqualTo(ChatEditorInput.EditorID), ChatContextKeys.newChatButtonExperimentIcon.notEqualsTo('copilot'), ChatContextKeys.newChatButtonExperimentIcon.notEqualsTo('new-session'), ChatContextKeys.newChatButtonExperimentIcon.notEqualsTo('comment')),
                        order: 1
                    }],
            });
        }
        async run(accessor) {
            const widgetService = accessor.get(IChatWidgetService);
            await widgetService.openSession(LocalChatSessionUri.getNewSessionUri(), ACTIVE_GROUP, { pinned: true });
        }
    });
    registerAction2(class NewChatEditorCopilotIconAction extends Action2 {
        constructor() {
            super({
                id: ACTION_ID_OPEN_CHAT + '.copilotIcon',
                title: localize2(5866, "New Chat Editor"),
                icon: Codicon.copilot,
                f1: false,
                category: CHAT_CATEGORY,
                precondition: ChatContextKeys.enabled,
                menu: [{
                        id: MenuId.EditorTitle,
                        group: 'navigation',
                        when: ContextKeyExpr.and(ActiveEditorContext.isEqualTo(ChatEditorInput.EditorID), ChatContextKeys.newChatButtonExperimentIcon.isEqualTo('copilot')),
                        order: 1
                    }],
            });
        }
        async run(accessor) {
            const widgetService = accessor.get(IChatWidgetService);
            await widgetService.openSession(LocalChatSessionUri.getNewSessionUri(), ACTIVE_GROUP, { pinned: true });
        }
    });
    registerAction2(class NewChatEditorNewSessionIconAction extends Action2 {
        constructor() {
            super({
                id: ACTION_ID_OPEN_CHAT + '.newSessionIcon',
                title: localize2(5867, "New Chat Editor"),
                icon: Codicon.newSession,
                f1: false,
                category: CHAT_CATEGORY,
                precondition: ChatContextKeys.enabled,
                menu: [{
                        id: MenuId.EditorTitle,
                        group: 'navigation',
                        when: ContextKeyExpr.and(ActiveEditorContext.isEqualTo(ChatEditorInput.EditorID), ChatContextKeys.newChatButtonExperimentIcon.isEqualTo('new-session')),
                        order: 1
                    }],
            });
        }
        async run(accessor) {
            const widgetService = accessor.get(IChatWidgetService);
            await widgetService.openSession(LocalChatSessionUri.getNewSessionUri(), ACTIVE_GROUP, { pinned: true });
        }
    });
    registerAction2(class NewChatEditorCommentIconAction extends Action2 {
        constructor() {
            super({
                id: ACTION_ID_OPEN_CHAT + '.commentIcon',
                title: localize2(5868, "New Chat Editor"),
                icon: Codicon.comment,
                f1: false,
                category: CHAT_CATEGORY,
                precondition: ChatContextKeys.enabled,
                menu: [{
                        id: MenuId.EditorTitle,
                        group: 'navigation',
                        when: ContextKeyExpr.and(ActiveEditorContext.isEqualTo(ChatEditorInput.EditorID), ChatContextKeys.newChatButtonExperimentIcon.isEqualTo('comment')),
                        order: 1
                    }],
            });
        }
        async run(accessor) {
            const widgetService = accessor.get(IChatWidgetService);
            await widgetService.openSession(LocalChatSessionUri.getNewSessionUri(), ACTIVE_GROUP, { pinned: true });
        }
    });
    registerAction2(class NewChatEditorToSideAction extends Action2 {
        constructor() {
            super({
                id: 'workbench.action.openChatToSide',
                title: localize2(5869, "New Chat Editor to the Side"),
                f1: true,
                category: CHAT_CATEGORY,
                precondition: ChatContextKeys.enabled,
            });
        }
        async run(accessor) {
            const widgetService = accessor.get(IChatWidgetService);
            await widgetService.openSession(LocalChatSessionUri.getNewSessionUri(), SIDE_GROUP, { pinned: true });
        }
    });
    registerAction2(class NewChatWindowAction extends Action2 {
        constructor() {
            super({
                id: `workbench.action.newChatWindow`,
                title: localize2(5870, "New Chat Window"),
                f1: true,
                category: CHAT_CATEGORY,
                precondition: ChatContextKeys.enabled,
                menu: [{
                        id: MenuId.ChatTitleBarMenu,
                        group: 'b_new',
                        order: 1
                    }, {
                        id: MenuId.ChatNewMenu,
                        group: '2_new',
                        order: 3
                    }]
            });
        }
        async run(accessor) {
            const widgetService = accessor.get(IChatWidgetService);
            await widgetService.openSession(LocalChatSessionUri.getNewSessionUri(), AUX_WINDOW_GROUP, { pinned: true, auxiliary: { compact: true, bounds: { width: 640, height: 640 } } });
        }
    });
    registerAction2(class ClearChatInputHistoryAction extends Action2 {
        constructor() {
            super({
                id: 'workbench.action.chat.clearInputHistory',
                title: localize2(5871, "Clear Input History"),
                precondition: ChatContextKeys.enabled,
                category: CHAT_CATEGORY,
                f1: true,
            });
        }
        async run(accessor, ...args) {
            const historyService = accessor.get(IChatWidgetHistoryService);
            historyService.clearHistory();
        }
    });
    registerAction2(class FocusChatAction extends EditorAction2 {
        constructor() {
            super({
                id: 'chat.action.focus',
                title: localize2(5872, 'Focus Chat List'),
                precondition: ContextKeyExpr.and(ChatContextKeys.inChatInput),
                category: CHAT_CATEGORY,
                keybinding: [
                    // On mac, require that the cursor is at the top of the input, to avoid stealing cmd+up to move the cursor to the top
                    {
                        when: ContextKeyExpr.and(ChatContextKeys.inputCursorAtTop, ChatContextKeys.inQuickChat.negate()),
                        primary: 2048 /* KeyMod.CtrlCmd */ | 16 /* KeyCode.UpArrow */,
                        weight: 100 /* KeybindingWeight.EditorContrib */,
                    },
                    // On win/linux, ctrl+up can always focus the chat list
                    {
                        when: ContextKeyExpr.and(ContextKeyExpr.or(IsWindowsContext, IsLinuxContext), ChatContextKeys.inQuickChat.negate()),
                        primary: 2048 /* KeyMod.CtrlCmd */ | 16 /* KeyCode.UpArrow */,
                        weight: 100 /* KeybindingWeight.EditorContrib */,
                    },
                    {
                        when: ContextKeyExpr.and(ChatContextKeys.inChatSession, ChatContextKeys.inQuickChat),
                        primary: 2048 /* KeyMod.CtrlCmd */ | 18 /* KeyCode.DownArrow */,
                        weight: 200 /* KeybindingWeight.WorkbenchContrib */,
                    }
                ]
            });
        }
        runEditorCommand(accessor, editor) {
            const editorUri = editor.getModel()?.uri;
            if (editorUri) {
                const widgetService = accessor.get(IChatWidgetService);
                widgetService.getWidgetByInputUri(editorUri)?.focusResponseItem();
            }
        }
    });
    registerAction2(class FocusMostRecentlyFocusedChatAction extends EditorAction2 {
        constructor() {
            super({
                id: 'workbench.chat.action.focusLastFocused',
                title: localize2(5873, 'Focus Last Focused Chat List Item'),
                precondition: ContextKeyExpr.and(ChatContextKeys.inChatInput),
                category: CHAT_CATEGORY,
                keybinding: [
                    // On mac, require that the cursor is at the top of the input, to avoid stealing cmd+up to move the cursor to the top
                    {
                        when: ContextKeyExpr.and(ChatContextKeys.inputCursorAtTop, ChatContextKeys.inQuickChat.negate()),
                        primary: 2048 /* KeyMod.CtrlCmd */ | 16 /* KeyCode.UpArrow */ | 1024 /* KeyMod.Shift */,
                        weight: 100 /* KeybindingWeight.EditorContrib */ + 1,
                    },
                    // On win/linux, ctrl+up can always focus the chat list
                    {
                        when: ContextKeyExpr.and(ContextKeyExpr.or(IsWindowsContext, IsLinuxContext), ChatContextKeys.inQuickChat.negate()),
                        primary: 2048 /* KeyMod.CtrlCmd */ | 16 /* KeyCode.UpArrow */ | 1024 /* KeyMod.Shift */,
                        weight: 100 /* KeybindingWeight.EditorContrib */ + 1,
                    },
                    {
                        when: ContextKeyExpr.and(ChatContextKeys.inChatSession, ChatContextKeys.inQuickChat),
                        primary: 2048 /* KeyMod.CtrlCmd */ | 18 /* KeyCode.DownArrow */ | 1024 /* KeyMod.Shift */,
                        weight: 200 /* KeybindingWeight.WorkbenchContrib */ + 1,
                    }
                ]
            });
        }
        runEditorCommand(accessor, editor) {
            const editorUri = editor.getModel()?.uri;
            if (editorUri) {
                const widgetService = accessor.get(IChatWidgetService);
                widgetService.getWidgetByInputUri(editorUri)?.focusResponseItem(true);
            }
        }
    });
    registerAction2(class FocusChatInputAction extends Action2 {
        constructor() {
            super({
                id: 'workbench.action.chat.focusInput',
                title: localize2(5874, "Focus Chat Input"),
                f1: false,
                keybinding: [
                    {
                        primary: 2048 /* KeyMod.CtrlCmd */ | 18 /* KeyCode.DownArrow */,
                        weight: 200 /* KeybindingWeight.WorkbenchContrib */,
                        when: ContextKeyExpr.and(ChatContextKeys.inChatSession, ChatContextKeys.inChatInput.negate(), ChatContextKeys.inQuickChat.negate()),
                    },
                    {
                        when: ContextKeyExpr.and(ChatContextKeys.inChatSession, ChatContextKeys.inChatInput.negate(), ChatContextKeys.inQuickChat),
                        primary: 2048 /* KeyMod.CtrlCmd */ | 16 /* KeyCode.UpArrow */,
                        weight: 200 /* KeybindingWeight.WorkbenchContrib */,
                    }
                ]
            });
        }
        run(accessor, ...args) {
            const widgetService = accessor.get(IChatWidgetService);
            widgetService.lastFocusedWidget?.focusInput();
        }
    });
    registerAction2(class FocusTodosViewAction extends Action2 {
        static { this.ID = 'workbench.action.chat.focusTodosView'; }
        constructor() {
            super({
                id: FocusTodosViewAction.ID,
                title: localize2(5875, "Toggle Focus Between TODOs and Input"),
                category: CHAT_CATEGORY,
                f1: true,
                precondition: ChatContextKeys.chatModeKind.isEqualTo(ChatModeKind.Agent),
                keybinding: [{
                        weight: 200 /* KeybindingWeight.WorkbenchContrib */ + 1,
                        primary: 2048 /* KeyMod.CtrlCmd */ | 1024 /* KeyMod.Shift */ | 50 /* KeyCode.KeyT */,
                        when: ContextKeyExpr.or(ContextKeyExpr.and(ChatContextKeys.inChatInput, ChatContextKeys.chatModeKind.isEqualTo(ChatModeKind.Agent)), ContextKeyExpr.and(ChatContextKeys.inChatTodoList, ChatContextKeys.chatModeKind.isEqualTo(ChatModeKind.Agent))),
                    }]
            });
        }
        run(accessor) {
            const widgetService = accessor.get(IChatWidgetService);
            const widget = widgetService.lastFocusedWidget;
            if (!widget || !widget.toggleTodosViewFocus()) {
                alert(localize(5841, null));
            }
        }
    });
    registerAction2(class FocusQuestionCarouselAction extends Action2 {
        static { this.ID = 'workbench.action.chat.focusQuestionCarousel'; }
        constructor() {
            super({
                id: FocusQuestionCarouselAction.ID,
                title: localize2(5876, "Chat: Toggle Focus Between Question and Input"),
                category: CHAT_CATEGORY,
                f1: true,
                precondition: ChatContextKeys.inChatSession,
                keybinding: [{
                        weight: 200 /* KeybindingWeight.WorkbenchContrib */,
                        primary: 2048 /* KeyMod.CtrlCmd */ | 1024 /* KeyMod.Shift */ | 31 /* KeyCode.KeyA */,
                        when: ContextKeyExpr.and(ChatContextKeys.inChatSession, ChatContextKeys.Editing.hasQuestionCarousel),
                    }]
            });
        }
        run(accessor) {
            const widgetService = accessor.get(IChatWidgetService);
            const widget = widgetService.lastFocusedWidget;
            if (!widget || !widget.toggleQuestionCarouselFocus()) {
                alert(localize(5842, null));
            }
        }
    });
    registerAction2(class PreviousQuestionCarouselQuestionAction extends Action2 {
        static { this.ID = 'workbench.action.chat.previousQuestion'; }
        constructor() {
            super({
                id: PreviousQuestionCarouselQuestionAction.ID,
                title: localize2(5877, "Chat: Previous Question"),
                category: CHAT_CATEGORY,
                f1: true,
                precondition: ContextKeyExpr.and(ChatContextKeys.inChatSession, ChatContextKeys.Editing.hasQuestionCarousel),
                keybinding: [{
                        weight: 200 /* KeybindingWeight.WorkbenchContrib */,
                        primary: 512 /* KeyMod.Alt */ | 46 /* KeyCode.KeyP */,
                        when: ContextKeyExpr.and(ChatContextKeys.inChatQuestionCarousel, ChatContextKeys.Editing.hasQuestionCarousel),
                    }]
            });
        }
        run(accessor) {
            const widgetService = accessor.get(IChatWidgetService);
            widgetService.lastFocusedWidget?.navigateToPreviousQuestion();
        }
    });
    registerAction2(class NextQuestionCarouselQuestionAction extends Action2 {
        static { this.ID = 'workbench.action.chat.nextQuestion'; }
        constructor() {
            super({
                id: NextQuestionCarouselQuestionAction.ID,
                title: localize2(5878, "Chat: Next Question"),
                category: CHAT_CATEGORY,
                f1: true,
                precondition: ContextKeyExpr.and(ChatContextKeys.inChatSession, ChatContextKeys.Editing.hasQuestionCarousel),
                keybinding: [{
                        weight: 200 /* KeybindingWeight.WorkbenchContrib */,
                        primary: 512 /* KeyMod.Alt */ | 44 /* KeyCode.KeyN */,
                        when: ContextKeyExpr.and(ChatContextKeys.inChatQuestionCarousel, ChatContextKeys.Editing.hasQuestionCarousel),
                    }]
            });
        }
        run(accessor) {
            const widgetService = accessor.get(IChatWidgetService);
            widgetService.lastFocusedWidget?.navigateToNextQuestion();
        }
    });
    registerAction2(class FocusTipAction extends Action2 {
        static { this.ID = 'workbench.action.chat.focusTip'; }
        constructor() {
            super({
                id: FocusTipAction.ID,
                title: localize2(5879, "Chat: Toggle Focus Between Tip and Input"),
                category: CHAT_CATEGORY,
                f1: true,
                precondition: ChatContextKeys.inChatSession,
                keybinding: [{
                        weight: 200 /* KeybindingWeight.WorkbenchContrib */,
                        primary: 2048 /* KeyMod.CtrlCmd */ | 1024 /* KeyMod.Shift */ | 90 /* KeyCode.Slash */,
                        when: ContextKeyExpr.or(ChatContextKeys.inChatSession, ChatContextKeys.inChatTip),
                    }]
            });
        }
        run(accessor) {
            const widgetService = accessor.get(IChatWidgetService);
            const widget = widgetService.lastFocusedWidget;
            if (!widget || !widget.toggleTipFocus()) {
                alert(localize(5843, null));
            }
        }
    });
    registerAction2(class ShowContextUsageAction extends Action2 {
        constructor() {
            super({
                id: 'workbench.action.chat.showContextUsage',
                title: localize2(5880, "Show Context Window Usage"),
                category: CHAT_CATEGORY,
                f1: true,
                precondition: ChatContextKeys.enabled,
            });
        }
        async run(accessor) {
            const widgetService = accessor.get(IChatWidgetService);
            const widget = widgetService.lastFocusedWidget ?? (await widgetService.revealWidget());
            widget?.input.showContextUsageDetails();
        }
    });
    registerAction2(class ToggleShowContextUsageAction extends Action2 {
        constructor() {
            super({
                id: 'workbench.action.chat.toggleShowContextUsage',
                title: localize2(5881, "Show Context Usage"),
                category: CHAT_CATEGORY,
                toggled: ContextKeyExpr.equals(`config.${ChatConfiguration.ChatContextUsageEnabled}`, true),
                menu: {
                    id: MenuId.ChatWelcomeContext,
                    group: '1_display',
                    order: 1,
                    when: ChatContextKeys.inChatEditor.negate()
                }
            });
        }
        async run(accessor) {
            const configurationService = accessor.get(IConfigurationService);
            const currentValue = configurationService.getValue(ChatConfiguration.ChatContextUsageEnabled);
            await configurationService.updateValue(ChatConfiguration.ChatContextUsageEnabled, !currentValue);
        }
    });
    const nonEnterpriseCopilotUsers = ContextKeyExpr.and(ChatContextKeys.enabled, ContextKeyExpr.notEquals(`config.${defaultChat.completionsAdvancedSetting}.authProvider`, defaultChat.provider.enterprise.id));
    registerAction2(class extends Action2 {
        constructor() {
            super({
                id: 'workbench.action.chat.manageSettings',
                title: localize2(5882, "Manage Chat"),
                category: CHAT_CATEGORY,
                f1: true,
                precondition: ContextKeyExpr.and(ContextKeyExpr.or(ChatContextKeys.Entitlement.planFree, ChatContextKeys.Entitlement.planPro, ChatContextKeys.Entitlement.planProPlus), nonEnterpriseCopilotUsers),
                menu: {
                    id: MenuId.ChatTitleBarMenu,
                    group: 'y_manage',
                    order: 1,
                    when: nonEnterpriseCopilotUsers
                }
            });
        }
        async run(accessor) {
            const openerService = accessor.get(IOpenerService);
            openerService.open(URI.parse(defaultChat.manageSettingsUrl));
        }
    });
    registerAction2(class ShowExtensionsUsingCopilot extends Action2 {
        constructor() {
            super({
                id: 'workbench.action.chat.showExtensionsUsingCopilot',
                title: localize2(5883, "Show Extensions using Copilot"),
                f1: true,
                category: EXTENSIONS_CATEGORY,
                precondition: ChatContextKeys.enabled
            });
        }
        async run(accessor) {
            const extensionsWorkbenchService = accessor.get(IExtensionsWorkbenchService);
            extensionsWorkbenchService.openSearch(`@contribute:${CopilotUsageExtensionFeatureId}`);
        }
    });
    registerAction2(class ConfigureCopilotCompletions extends Action2 {
        constructor() {
            super({
                id: 'workbench.action.chat.configureCodeCompletions',
                title: localize2(5884, "Configure Inline Suggestions..."),
                precondition: ContextKeyExpr.and(ChatContextKeys.Setup.installed, ChatContextKeys.Setup.disabled.negate(), ChatContextKeys.Setup.untrusted.negate()),
                menu: {
                    id: MenuId.ChatTitleBarMenu,
                    group: 'f_completions',
                    order: 10,
                }
            });
        }
        async run(accessor) {
            const commandService = accessor.get(ICommandService);
            commandService.executeCommand(defaultChat.completionsMenuCommand);
        }
    });
    registerAction2(class ShowQuotaExceededDialogAction extends Action2 {
        constructor() {
            super({
                id: OPEN_CHAT_QUOTA_EXCEEDED_DIALOG,
                title: localize(5844, null)
            });
        }
        async run(accessor) {
            const chatEntitlementService = accessor.get(IChatEntitlementService);
            const commandService = accessor.get(ICommandService);
            const dialogService = accessor.get(IDialogService);
            const telemetryService = accessor.get(ITelemetryService);
            let message;
            const chatQuotaExceeded = chatEntitlementService.quotas.chat?.percentRemaining === 0;
            const completionsQuotaExceeded = chatEntitlementService.quotas.completions?.percentRemaining === 0;
            if (chatQuotaExceeded && !completionsQuotaExceeded) {
                message = localize(5845, null);
            }
            else if (completionsQuotaExceeded && !chatQuotaExceeded) {
                message = localize(5846, null);
            }
            else {
                message = localize(5847, null);
            }
            if (chatEntitlementService.quotas.resetDate) {
                const dateFormatter = chatEntitlementService.quotas.resetDateHasTime ? safeIntl.DateTimeFormat(language, { year: 'numeric', month: 'long', day: 'numeric', hour: 'numeric', minute: 'numeric' }) : safeIntl.DateTimeFormat(language, { year: 'numeric', month: 'long', day: 'numeric' });
                const quotaResetDate = new Date(chatEntitlementService.quotas.resetDate);
                message = [message, localize(5848, null, dateFormatter.value.format(quotaResetDate))].join(' ');
            }
            const free = chatEntitlementService.entitlement === ChatEntitlement.Free;
            const upgradeToPro = free ? localize(5849, null) : undefined;
            await dialogService.prompt({
                type: 'none',
                message: localize(5850, null),
                cancelButton: {
                    label: localize(5851, null),
                    run: () => { }
                },
                buttons: [
                    {
                        label: free ? localize(5852, null) : localize(5853, null),
                        run: () => {
                            const commandId = 'workbench.action.chat.upgradePlan';
                            telemetryService.publicLog2('workbenchActionExecuted', { id: commandId, from: 'chat-dialog' });
                            commandService.executeCommand(commandId);
                        }
                    },
                ],
                custom: {
                    icon: Codicon.copilotWarningLarge,
                    markdownDetails: coalesce([
                        { markdown: new MarkdownString(message, true) },
                        upgradeToPro ? { markdown: new MarkdownString(upgradeToPro, true) } : undefined
                    ])
                }
            });
        }
    });
    registerAction2(class ResetTrustedToolsAction extends Action2 {
        constructor() {
            super({
                id: 'workbench.action.chat.resetTrustedTools',
                title: localize2(5885, "Reset Tool Confirmations"),
                category: CHAT_CATEGORY,
                f1: true,
                precondition: ChatContextKeys.enabled
            });
        }
        run(accessor) {
            accessor.get(ILanguageModelToolsConfirmationService).resetToolAutoConfirmation();
            accessor.get(INotificationService).info(localize(5854, null));
        }
    });
    registerAction2(class GenerateInstructionsAction extends Action2 {
        constructor() {
            super({
                id: GENERATE_AGENT_INSTRUCTIONS_COMMAND_ID,
                title: localize2(5886, "Generate Agent Instructions"),
                category: CHAT_CATEGORY,
                icon: Codicon.sparkle,
                f1: true,
                precondition: ChatContextKeys.enabled
            });
        }
        async run(accessor) {
            const commandService = accessor.get(ICommandService);
            await commandService.executeCommand('workbench.action.chat.open', {
                mode: 'agent',
                query: '/init',
                isPartialQuery: false,
            });
        }
    });
    registerAction2(class GenerateInstructionAction extends Action2 {
        constructor() {
            super({
                id: GENERATE_ON_DEMAND_INSTRUCTIONS_COMMAND_ID,
                title: localize2(5887, "Generate On-Demand Instructions"),
                category: CHAT_CATEGORY,
                icon: Codicon.sparkle,
                f1: true,
                precondition: ChatContextKeys.enabled
            });
        }
        async run(accessor) {
            const commandService = accessor.get(ICommandService);
            await commandService.executeCommand('workbench.action.chat.open', {
                mode: 'agent',
                query: '/create-instructions ',
                isPartialQuery: true,
            });
        }
    });
    registerAction2(class GeneratePromptAction extends Action2 {
        constructor() {
            super({
                id: GENERATE_PROMPT_COMMAND_ID,
                title: localize2(5888, "Generate Prompt File"),
                shortTitle: localize2(5889, "Generate Prompt"),
                category: CHAT_CATEGORY,
                icon: Codicon.sparkle,
                f1: true,
                precondition: ChatContextKeys.enabled
            });
        }
        async run(accessor) {
            const commandService = accessor.get(ICommandService);
            await commandService.executeCommand('workbench.action.chat.open', {
                mode: 'agent',
                query: '/create-prompt ',
                isPartialQuery: true,
            });
        }
    });
    registerAction2(class GenerateSkillAction extends Action2 {
        constructor() {
            super({
                id: GENERATE_SKILL_COMMAND_ID,
                title: localize2(5890, "Generate Skill"),
                shortTitle: localize2(5891, "Generate Skill"),
                category: CHAT_CATEGORY,
                icon: Codicon.sparkle,
                f1: true,
                precondition: ChatContextKeys.enabled
            });
        }
        async run(accessor) {
            const commandService = accessor.get(ICommandService);
            await commandService.executeCommand('workbench.action.chat.open', {
                mode: 'agent',
                query: '/create-skill ',
                isPartialQuery: true,
            });
        }
    });
    registerAction2(class GenerateAgentAction extends Action2 {
        constructor() {
            super({
                id: GENERATE_AGENT_COMMAND_ID,
                title: localize2(5892, "Generate Custom Agent"),
                shortTitle: localize2(5893, "Generate Agent"),
                category: CHAT_CATEGORY,
                icon: Codicon.sparkle,
                f1: true,
                precondition: ChatContextKeys.enabled
            });
        }
        async run(accessor) {
            const commandService = accessor.get(ICommandService);
            await commandService.executeCommand('workbench.action.chat.open', {
                mode: 'agent',
                query: '/create-agent ',
                isPartialQuery: true,
            });
        }
    });
    registerAction2(class GenerateHookAction extends Action2 {
        constructor() {
            super({
                id: GENERATE_HOOK_COMMAND_ID,
                title: localize2(5894, "Generate Hook"),
                shortTitle: localize2(5895, "Generate Hook"),
                category: CHAT_CATEGORY,
                icon: Codicon.sparkle,
                f1: true,
                precondition: ChatContextKeys.enabled
            });
        }
        async run(accessor) {
            const commandService = accessor.get(ICommandService);
            await commandService.executeCommand('workbench.action.chat.open', {
                mode: 'agent',
                query: '/create-hook ',
                isPartialQuery: true,
            });
        }
    });
    registerAction2(class InsertForkConversationSlashCommandAction extends Action2 {
        constructor() {
            super({
                id: INSERT_FORK_CONVERSATION_COMMAND_ID,
                title: localize2(5896, "Insert Fork Command"),
                shortTitle: localize2(5897, "Insert /fork"),
                category: CHAT_CATEGORY,
                icon: Codicon.repoForked,
                f1: true,
                precondition: ChatContextKeys.enabled
            });
        }
        async run(accessor) {
            const commandService = accessor.get(ICommandService);
            await commandService.executeCommand('workbench.action.chat.open', {
                query: '/fork ',
                isPartialQuery: true,
            });
        }
    });
    registerAction2(class InsertTroubleshootSlashCommandAction extends Action2 {
        constructor() {
            super({
                id: INSERT_TROUBLESHOOT_COMMAND_ID,
                title: localize2(5898, "Insert Troubleshoot Command"),
                shortTitle: localize2(5899, "Insert /troubleshoot"),
                category: CHAT_CATEGORY,
                f1: true,
                precondition: ChatContextKeys.enabled
            });
        }
        async run(accessor) {
            const commandService = accessor.get(ICommandService);
            await commandService.executeCommand('workbench.action.chat.open', {
                query: '/troubleshoot ',
                isPartialQuery: true,
            });
        }
    });
    registerAction2(class OpenChatFeatureSettingsAction extends Action2 {
        constructor() {
            super({
                id: 'workbench.action.chat.openFeatureSettings',
                title: localize2(5900, "Chat Settings"),
                shortTitle: localize(5855, null),
                category: CHAT_CATEGORY,
                f1: true,
                precondition: ChatContextKeys.enabled,
                menu: [{
                        id: CHAT_CONFIG_MENU_ID,
                        when: ContextKeyExpr.and(ChatContextKeys.enabled, ContextKeyExpr.equals('view', ChatViewId)),
                        order: 15,
                        group: '3_configure'
                    },
                    {
                        id: MenuId.ChatWelcomeContext,
                        group: '2_settings',
                        order: 1
                    }]
            });
        }
        async run(accessor) {
            const preferencesService = accessor.get(IPreferencesService);
            preferencesService.openSettings({ query: '@feature:chat ' });
        }
    });
    MenuRegistry.appendMenuItem(MenuId.ViewTitle, {
        submenu: CHAT_CONFIG_MENU_ID,
        title: localize2(5901, "Configure Chat"),
        group: 'navigation',
        when: ContextKeyExpr.equals('view', ChatViewId),
        icon: Codicon.gear,
        order: 6
    });
}
export function stringifyItem(item, includeName = true) {
    if (isRequestVM(item)) {
        return (includeName ? `${item.username}: ` : '') + item.messageText;
    }
    else {
        return (includeName ? `${item.username}: ` : '') + item.response.toString();
    }
}
/**
 * Computes the tool enablement map based on include/exclude filters.
 *
 * Resolution algorithm:
 * 1. If `toolsInclude` is specified, start with only those tools/toolsets enabled
 * 2. If `toolsExclude` is specified, remove those tools/toolsets
 * 3. Explicit tool references in `toolsInclude` override toolset exclusions
 * 4. Explicit tool exclusions always win
 * 5. Toolset enablement is calculated based on whether all member tools are enabled
 *
 * @throws Error if filtering results in zero enabled tools
 */
export function computeToolEnablementMap(options) {
    const { allTools, allToolSets, toolsInclude, toolsExclude } = options;
    const enablementMap = new Map();
    const matchedIdentifiers = new Set();
    // Helper to check if a tool matches any identifier (by id or toolReferenceName)
    const toolMatches = (tool, identifiers) => {
        if (identifiers.has(tool.id)) {
            matchedIdentifiers.add(tool.id);
            return true;
        }
        if (tool.toolReferenceName && identifiers.has(tool.toolReferenceName)) {
            matchedIdentifiers.add(tool.toolReferenceName);
            return true;
        }
        return false;
    };
    // Helper to check if a toolset matches any identifier (by id or referenceName)
    const toolSetMatches = (toolSet, identifiers) => {
        if (identifiers.has(toolSet.id)) {
            matchedIdentifiers.add(toolSet.id);
            return true;
        }
        if (identifiers.has(toolSet.referenceName)) {
            matchedIdentifiers.add(toolSet.referenceName);
            return true;
        }
        return false;
    };
    // Track which tools are explicitly referenced in toolsInclude
    const explicitlyIncludedTools = new Set();
    // Step 1: Build initial set based on toolsInclude
    if (toolsInclude) {
        const includeSet = new Set(toolsInclude);
        // First, process toolsets - if a toolset matches, enable all its tools
        for (const toolSet of allToolSets) {
            if (toolSetMatches(toolSet, includeSet)) {
                for (const tool of toolSet.getTools()) {
                    enablementMap.set(tool, true);
                }
            }
        }
        // Then process individual tools
        for (const tool of allTools) {
            if (toolMatches(tool, includeSet)) {
                enablementMap.set(tool, true);
                explicitlyIncludedTools.add(tool);
            }
            else if (!enablementMap.has(tool)) {
                enablementMap.set(tool, false);
            }
        }
        // Also process tools from toolsets that may not be in allTools
        for (const toolSet of allToolSets) {
            for (const tool of toolSet.getTools()) {
                if (toolMatches(tool, includeSet)) {
                    enablementMap.set(tool, true);
                    explicitlyIncludedTools.add(tool);
                }
                else if (!enablementMap.has(tool)) {
                    enablementMap.set(tool, false);
                }
            }
        }
    }
    else {
        // No toolsInclude specified - start with all tools enabled
        for (const tool of allTools) {
            enablementMap.set(tool, true);
        }
        for (const toolSet of allToolSets) {
            for (const tool of toolSet.getTools()) {
                enablementMap.set(tool, true);
            }
        }
    }
    // Step 2: Remove tools matching toolsExclude
    if (toolsExclude) {
        const excludeSet = new Set(toolsExclude);
        // First, process toolsets - if a toolset matches, disable all its tools
        // (unless explicitly included as individual tools)
        for (const toolSet of allToolSets) {
            if (toolSetMatches(toolSet, excludeSet)) {
                for (const tool of toolSet.getTools()) {
                    // Explicit tool reference overrides toolset exclusion
                    if (!explicitlyIncludedTools.has(tool)) {
                        enablementMap.set(tool, false);
                    }
                }
            }
        }
        // Then process individual tools - explicit exclusion always wins
        for (const tool of allTools) {
            if (toolMatches(tool, excludeSet)) {
                enablementMap.set(tool, false);
            }
        }
        for (const toolSet of allToolSets) {
            for (const tool of toolSet.getTools()) {
                if (toolMatches(tool, excludeSet)) {
                    enablementMap.set(tool, false);
                }
            }
        }
    }
    // Collect unknown identifiers
    const allIdentifiers = new Set([...(toolsInclude ?? []), ...(toolsExclude ?? [])]);
    const unknownIdentifiers = [];
    for (const identifier of allIdentifiers) {
        if (!matchedIdentifiers.has(identifier)) {
            unknownIdentifiers.push(identifier);
        }
    }
    // Validate at least one tool is enabled
    const enabledToolCount = Array.from(enablementMap.entries()).filter(([item, enabled]) => enabled && !isToolSet(item)).length;
    if (enabledToolCount === 0) {
        throw new Error('Tool filtering resulted in zero enabled tools. At least one tool must be enabled.');
    }
    // Calculate toolset enablement based on whether all member tools are enabled
    for (const toolSet of allToolSets) {
        const toolSetTools = Array.from(toolSet.getTools());
        const allToolsEnabled = toolSetTools.length > 0 && toolSetTools.every(t => enablementMap.get(t) === true);
        enablementMap.set(toolSet, allToolsEnabled);
    }
    return { enablementMap, unknownIdentifiers };
}
/**
 * Returns whether we can continue clearing/switching chat sessions, false to cancel.
 */
export async function handleCurrentEditingSession(model, phrase, dialogService) {
    return showClearEditingSessionConfirmation(model, dialogService, { messageOverride: phrase });
}
/**
 * Returns whether we can switch the agent, based on whether the user had to agree to clear the session, false to cancel.
 */
export async function handleModeSwitch(accessor, fromMode, toMode, requestCount, model) {
    if (!model?.editingSession || fromMode === toMode) {
        return { needToClearSession: false };
    }
    const dialogService = accessor.get(IDialogService);
    const needToClearEdits = (fromMode === ChatModeKind.Edit || toMode === ChatModeKind.Edit) && requestCount > 0;
    if (needToClearEdits) {
        // Switching into or out of edit mode, ask to discard the session
        const phrase = localize(5856, null);
        const currentEdits = model.editingSession.entries.get();
        const undecidedEdits = currentEdits.filter((edit) => edit.state.get() === 0 /* ModifiedFileEntryState.Modified */);
        if (undecidedEdits.length > 0) {
            if (!await handleCurrentEditingSession(model, phrase, dialogService)) {
                return false;
            }
            return { needToClearSession: true };
        }
        else {
            const confirmation = await dialogService.confirm({
                title: localize(5857, null),
                message: localize(5858, null),
                primaryButton: localize(5859, null),
                type: 'info'
            });
            if (!confirmation.confirmed) {
                return false;
            }
            return { needToClearSession: true };
        }
    }
    return { needToClearSession: false };
}
/**
 * Clears the current chat session and starts a new one, preserving
 * the session type (e.g. Claude, Cloud, Background) for non-local sessions
 * in the sidebar.
 */
export async function clearChatSessionPreservingType(widget, viewsService, sessionType) {
    const currentResource = widget.viewModel?.model.sessionResource;
    const newSessionType = sessionType ?? (currentResource ? getChatSessionType(currentResource) : localChatSessionType);
    if (isIChatViewViewContext(widget.viewContext) && newSessionType !== localChatSessionType) {
        // For the sidebar, we need to explicitly load a session with the same type
        const newResource = URI.from({ scheme: newSessionType, path: `/untitled-${generateUuid()}` });
        const view = await viewsService.openView(ChatViewId);
        await view.loadSession(newResource);
    }
    else {
        // For the editor, widget.clear() already preserves the session type via clearChatEditor
        await widget.clear();
    }
}
// --- Chat Submenus in various Components
MenuRegistry.appendMenuItem(MenuId.EditorContext, {
    submenu: MenuId.ChatTextEditorMenu,
    group: '1_chat',
    order: 5,
    title: localize(5860, null),
    when: ContextKeyExpr.and(ChatContextKeys.Setup.hidden.negate(), ChatContextKeys.Setup.disabled.negate())
});
// --- Chat Default Visibility
registerAction2(class ToggleDefaultVisibilityAction extends Action2 {
    constructor() {
        super({
            id: 'workbench.action.chat.toggleDefaultVisibility',
            title: localize2(5902, "Show View by Default"),
            toggled: ContextKeyExpr.equals('config.workbench.secondarySideBar.defaultVisibility', 'hidden').negate(),
            f1: false,
            menu: {
                id: MenuId.ViewTitle,
                when: ContextKeyExpr.and(ContextKeyExpr.equals('view', ChatViewId), ChatContextKeys.panelLocation.isEqualTo(2 /* ViewContainerLocation.AuxiliaryBar */)),
                order: 0,
                group: '5_configure'
            },
        });
    }
    async run(accessor) {
        const configurationService = accessor.get(IConfigurationService);
        const currentValue = configurationService.getValue('workbench.secondarySideBar.defaultVisibility');
        configurationService.updateValue('workbench.secondarySideBar.defaultVisibility', currentValue !== 'hidden' ? 'hidden' : 'visible');
    }
});
registerAction2(class EditToolApproval extends Action2 {
    constructor() {
        super({
            id: 'workbench.action.chat.editToolApproval',
            title: localize2(5903, "Manage Tool Approval"),
            metadata: {
                description: localize2(5904, "Edit/manage the tool approval and confirmation preferences for AI chat agents."),
            },
            precondition: ChatContextKeys.enabled,
            f1: true,
            category: CHAT_CATEGORY,
        });
    }
    async run(accessor, scope) {
        const confirmationService = accessor.get(ILanguageModelToolsConfirmationService);
        const toolsService = accessor.get(ILanguageModelToolsService);
        confirmationService.manageConfirmationPreferences([...toolsService.getAllToolsIncludingDisabled()], scope ? { defaultScope: scope } : undefined);
    }
});
//# sourceMappingURL=chatActions.js.map