/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Codicon } from '../../../../../base/common/codicons.js';
import { basename } from '../../../../../base/common/resources.js';
import { ThemeIcon } from '../../../../../base/common/themables.js';
import { assertType } from '../../../../../base/common/types.js';
import { URI } from '../../../../../base/common/uri.js';
import { EditorContextKeys } from '../../../../../editor/common/editorContextKeys.js';
import { localize, localize2 } from '../../../../../nls.js';
import { Action2, MenuId, registerAction2 } from '../../../../../platform/actions/common/actions.js';
import { ICommandService } from '../../../../../platform/commands/common/commands.js';
import { IConfigurationService } from '../../../../../platform/configuration/common/configuration.js';
import { ContextKeyExpr } from '../../../../../platform/contextkey/common/contextkey.js';
import { IDialogService } from '../../../../../platform/dialogs/common/dialogs.js';
import { IInstantiationService } from '../../../../../platform/instantiation/common/instantiation.js';
import { ILogService } from '../../../../../platform/log/common/log.js';
import { ITelemetryService } from '../../../../../platform/telemetry/common/telemetry.js';
import { IViewsService } from '../../../../services/views/common/viewsService.js';
import { IsSessionsWindowContext } from '../../../../common/contextkeys.js';
import { ChatContextKeys } from '../../common/actions/chatContextKeys.js';
import { getModeNameForTelemetry, buildCustomAgentHandoffsInfo, getHandoffId, IChatModeService } from '../../common/chatModes.js';
import { chatVariableLeader } from '../../common/requestParser/chatParserTypes.js';
import { ChatStopCancellationNoopEventName, IChatService } from '../../common/chatService/chatService.js';
import { ChatAgentLocation, ChatConfiguration, ChatModeKind } from '../../common/constants.js';
import { ILanguageModelToolsService } from '../../common/tools/languageModelToolsService.js';
import { isInClaudeAgentsFolder } from '../../common/promptSyntax/config/promptFileLocations.js';
import { IChatSessionsService, localChatSessionType } from '../../common/chatSessionsService.js';
import { IChatWidgetService } from '../chat.js';
import { getAgentSessionProvider, AgentSessionProviders } from '../agentSessions/agentSessions.js';
import { getEditingSessionContext } from '../chatEditing/chatEditingActions.js';
import { ctxHasEditorModification, ctxHasRequestInProgress, ctxIsGlobalEditingSession } from '../chatEditing/chatEditingEditorContextKeys.js';
import { ACTION_ID_NEW_CHAT, CHAT_CATEGORY, clearChatSessionPreservingType, handleCurrentEditingSession, handleModeSwitch } from './chatActions.js';
import { CreateRemoteAgentJobAction } from './chatContinueInAction.js';
import { CTX_HOVER_MODE } from '../../../inlineChat/common/inlineChat.js';
class SubmitAction extends Action2 {
    async run(accessor, ...args) {
        const context = args[0];
        const telemetryService = accessor.get(ITelemetryService);
        const widgetService = accessor.get(IChatWidgetService);
        const widget = context?.widget ?? widgetService.lastFocusedWidget;
        // Check if there's a pending delegation target
        const pendingDelegationTarget = widget?.input.pendingDelegationTarget;
        if (pendingDelegationTarget && pendingDelegationTarget !== AgentSessionProviders.Local) {
            return await this.handleDelegation(accessor, widget, pendingDelegationTarget);
        }
        if (widget?.viewModel?.editing) {
            const configurationService = accessor.get(IConfigurationService);
            const dialogService = accessor.get(IDialogService);
            const chatService = accessor.get(IChatService);
            const chatModel = chatService.getSession(widget.viewModel.sessionResource);
            if (!chatModel) {
                return;
            }
            const session = chatModel.editingSession;
            if (!session) {
                return;
            }
            const requestId = widget.viewModel?.editing.id;
            if (requestId) {
                const chatRequests = chatModel.getRequests();
                const itemIndex = chatRequests.findIndex(request => request.id === requestId);
                const editsToUndo = chatRequests.length - itemIndex;
                const requestsToRemove = chatRequests.slice(itemIndex);
                const requestIdsToRemove = new Set(requestsToRemove.map(request => request.id));
                const entriesModifiedInRequestsToRemove = session.entries.get().filter((entry) => requestIdsToRemove.has(entry.lastModifyingRequestId)) ?? [];
                const shouldPrompt = entriesModifiedInRequestsToRemove.length > 0 && configurationService.getValue('chat.editing.confirmEditRequestRemoval') === true;
                let message;
                if (editsToUndo === 1) {
                    if (entriesModifiedInRequestsToRemove.length === 1) {
                        message = localize(5953, null, basename(entriesModifiedInRequestsToRemove[0].modifiedURI));
                    }
                    else {
                        message = localize(5954, null, entriesModifiedInRequestsToRemove.length);
                    }
                }
                else {
                    if (entriesModifiedInRequestsToRemove.length === 1) {
                        message = localize(5955, null, basename(entriesModifiedInRequestsToRemove[0].modifiedURI));
                    }
                    else {
                        message = localize(5956, null, entriesModifiedInRequestsToRemove.length);
                    }
                }
                const confirmation = shouldPrompt
                    ? await dialogService.confirm({
                        title: editsToUndo === 1
                            ? localize(5957, null)
                            : localize(5958, null, editsToUndo),
                        message: message,
                        primaryButton: localize(5959, null),
                        checkbox: { label: localize(5960, null), checked: false },
                        type: 'info'
                    })
                    : { confirmed: true };
                if (!confirmation.confirmed) {
                    telemetryService.publicLog2('chat.undoEditsConfirmation', {
                        editRequestType: configurationService.getValue('chat.editRequests'),
                        outcome: 'cancelled',
                        editsUndoCount: editsToUndo
                    });
                    return;
                }
                else if (editsToUndo > 0) {
                    telemetryService.publicLog2('chat.undoEditsConfirmation', {
                        editRequestType: configurationService.getValue('chat.editRequests'),
                        outcome: 'applied',
                        editsUndoCount: editsToUndo
                    });
                }
                if (confirmation.checkboxChecked) {
                    await configurationService.updateValue('chat.editing.confirmEditRequestRemoval', false);
                }
                // Restore the snapshot to what it was before the request(s) that we deleted
                const snapshotRequestId = chatRequests[itemIndex].id;
                await session.restoreSnapshot(snapshotRequestId, undefined);
            }
        }
        else if (widget?.viewModel?.model.checkpoint) {
            widget.viewModel.model.setCheckpoint(undefined);
        }
        widget?.acceptInput(context?.inputValue);
    }
    async handleDelegation(accessor, widget, delegationTarget) {
        const chatSessionsService = accessor.get(IChatSessionsService);
        // Find the contribution for the delegation target
        const contributions = chatSessionsService.getAllChatSessionContributions();
        const targetContribution = contributions.find(contrib => {
            const providerType = getAgentSessionProvider(contrib.type);
            return providerType === delegationTarget;
        });
        if (!targetContribution) {
            throw new Error(`No contribution found for delegation target: ${delegationTarget}`);
        }
        if (targetContribution.canDelegate === false) {
            throw new Error(`The contribution for delegation target: ${delegationTarget} does not support delegation.`);
        }
        return new CreateRemoteAgentJobAction().run(accessor, targetContribution, widget);
    }
}
const requestInProgressOrPendingToolCall = ContextKeyExpr.or(ChatContextKeys.requestInProgress, ChatContextKeys.Editing.hasToolConfirmation, ChatContextKeys.Editing.hasQuestionCarousel);
const requestInProgressWithoutInput = ContextKeyExpr.and(ChatContextKeys.requestInProgress, ChatContextKeys.inputHasText.negate());
const pendingToolCall = ContextKeyExpr.or(ChatContextKeys.Editing.hasToolConfirmation, ContextKeyExpr.and(ChatContextKeys.Editing.hasQuestionCarousel, ChatContextKeys.inputHasText.negate()));
const noQuestionCarouselOrHasInput = ContextKeyExpr.or(ChatContextKeys.Editing.hasQuestionCarousel.negate(), ChatContextKeys.inputHasText);
const whenNotInProgress = ChatContextKeys.requestInProgress.negate();
export class ChatSubmitAction extends SubmitAction {
    static { this.ID = 'workbench.action.chat.submit'; }
    constructor() {
        const menuCondition = ChatContextKeys.chatModeKind.isEqualTo(ChatModeKind.Ask);
        const precondition = ContextKeyExpr.and(ChatContextKeys.inputHasText, whenNotInProgress, ChatContextKeys.chatSessionOptionsValid);
        super({
            id: ChatSubmitAction.ID,
            title: localize2(5967, "Send"),
            f1: false,
            category: CHAT_CATEGORY,
            icon: Codicon.arrowUp,
            precondition,
            toggled: {
                condition: ChatContextKeys.lockedToCodingAgent,
                icon: Codicon.arrowUp,
                tooltip: localize(5961, null),
            },
            keybinding: {
                when: ContextKeyExpr.and(ChatContextKeys.inChatInput, ChatContextKeys.withinEditSessionDiff.negate()),
                primary: 3 /* KeyCode.Enter */,
                weight: 100 /* KeybindingWeight.EditorContrib */
            },
            menu: [
                {
                    id: MenuId.ChatExecute,
                    order: 4,
                    when: ContextKeyExpr.and(whenNotInProgress, menuCondition, ChatContextKeys.withinEditSessionDiff.negate(), noQuestionCarouselOrHasInput),
                    group: 'navigation',
                    alt: {
                        id: 'workbench.action.chat.sendToNewChat',
                        title: localize2(5968, "Send to New Chat"),
                        icon: Codicon.plus
                    }
                }, {
                    id: MenuId.ChatEditorInlineExecute,
                    group: 'navigation',
                    order: 4,
                    when: ContextKeyExpr.and(ContextKeyExpr.or(ctxHasEditorModification.negate(), ChatContextKeys.inputHasText), whenNotInProgress, ChatContextKeys.requestInProgress.negate(), menuCondition),
                }
            ]
        });
    }
}
export const ToggleAgentModeActionId = 'workbench.action.chat.toggleAgentMode';
class ToggleChatModeAction extends Action2 {
    static { this.ID = ToggleAgentModeActionId; }
    constructor() {
        super({
            id: ToggleChatModeAction.ID,
            title: localize2(5969, "Switch to Next Agent"),
            f1: true,
            category: CHAT_CATEGORY,
            precondition: ContextKeyExpr.and(ChatContextKeys.enabled, ChatContextKeys.requestInProgress.negate())
        });
    }
    async run(accessor, ...args) {
        const commandService = accessor.get(ICommandService);
        const instaService = accessor.get(IInstantiationService);
        const modeService = accessor.get(IChatModeService);
        const telemetryService = accessor.get(ITelemetryService);
        const chatWidgetService = accessor.get(IChatWidgetService);
        const arg = args.at(0);
        let widget;
        if (arg?.sessionResource) {
            widget = chatWidgetService.getWidgetBySessionResource(arg.sessionResource);
        }
        else {
            widget = getEditingSessionContext(accessor, args)?.chatWidget;
        }
        if (!widget) {
            return;
        }
        const chatSession = widget.viewModel?.model;
        const requestCount = chatSession?.getRequests().length ?? 0;
        const switchToMode = (arg && (modeService.findModeById(arg.modeId) || modeService.findModeByName(arg.modeId))) ?? this.getNextMode(widget, requestCount, modeService);
        const currentMode = widget.input.currentModeObs.get();
        if (switchToMode.id === currentMode.id) {
            return;
        }
        const chatModeCheck = await instaService.invokeFunction(handleModeSwitch, widget.input.currentModeKind, switchToMode.kind, requestCount, widget.viewModel?.model);
        if (!chatModeCheck) {
            return;
        }
        // Send telemetry for mode change
        const storage = switchToMode.source?.storage ?? 'builtin';
        const extensionId = switchToMode.source?.storage === 'extension' ? switchToMode.source.extensionId.value : undefined;
        const toolsCount = switchToMode.customTools?.get()?.length ?? 0;
        const handoffsCount = switchToMode.handOffs?.get()?.length ?? 0;
        const modeUri = switchToMode.uri?.get();
        const isClaudeAgent = modeUri ? isInClaudeAgentsFolder(modeUri) : undefined;
        telemetryService.publicLog2('chat.modeChange', {
            fromMode: getModeNameForTelemetry(currentMode),
            mode: getModeNameForTelemetry(switchToMode),
            requestCount: requestCount,
            storage,
            extensionId,
            toolsCount,
            handoffsCount,
            isClaudeAgent
        });
        widget.input.setChatMode(switchToMode.id);
        if (chatModeCheck.needToClearSession) {
            await commandService.executeCommand(ACTION_ID_NEW_CHAT);
        }
    }
    getNextMode(chatWidget, requestCount, modeService) {
        const modes = modeService.getModes();
        const flat = [
            ...modes.builtin.filter(mode => {
                return mode.kind !== ChatModeKind.Edit || requestCount === 0;
            }),
            ...(modes.custom ?? []),
        ];
        const curModeIndex = flat.findIndex(mode => mode.id === chatWidget.input.currentModeObs.get().id);
        const newMode = flat[(curModeIndex + 1) % flat.length];
        return newMode;
    }
}
class SwitchToNextModelAction extends Action2 {
    static { this.ID = 'workbench.action.chat.switchToNextModel'; }
    constructor() {
        super({
            id: SwitchToNextModelAction.ID,
            title: localize2(5970, "Switch to Next Model"),
            category: CHAT_CATEGORY,
            f1: true,
            precondition: ChatContextKeys.enabled,
        });
    }
    run(accessor, ...args) {
        const widgetService = accessor.get(IChatWidgetService);
        const widget = widgetService.lastFocusedWidget;
        widget?.input.switchToNextModel();
    }
}
export class OpenModelPickerAction extends Action2 {
    static { this.ID = 'workbench.action.chat.openModelPicker'; }
    constructor() {
        super({
            id: OpenModelPickerAction.ID,
            title: localize2(5971, "Open Model Picker"),
            category: CHAT_CATEGORY,
            f1: false,
            keybinding: {
                primary: 2048 /* KeyMod.CtrlCmd */ | 512 /* KeyMod.Alt */ | 89 /* KeyCode.Period */,
                weight: 200 /* KeybindingWeight.WorkbenchContrib */,
                when: ChatContextKeys.inChatInput
            },
            precondition: ChatContextKeys.enabled,
            menu: {
                id: MenuId.ChatInput,
                order: 3,
                group: 'navigation',
                when: ContextKeyExpr.and(ContextKeyExpr.or(ChatContextKeys.lockedToCodingAgent.negate(), ChatContextKeys.chatSessionHasTargetedModels), ContextKeyExpr.or(ContextKeyExpr.equals(ChatContextKeys.location.key, ChatAgentLocation.Chat), ContextKeyExpr.equals(ChatContextKeys.location.key, ChatAgentLocation.EditorInline), ContextKeyExpr.equals(ChatContextKeys.location.key, ChatAgentLocation.Notebook), ContextKeyExpr.equals(ChatContextKeys.location.key, ChatAgentLocation.Terminal)), 
                // Hide in welcome view when session type is not local
                ContextKeyExpr.or(ChatContextKeys.inAgentSessionsWelcome.negate(), ChatContextKeys.chatSessionHasTargetedModels, ChatContextKeys.agentSessionType.isEqualTo(AgentSessionProviders.Local)))
            }
        });
    }
    async run(accessor, ...args) {
        const widgetService = accessor.get(IChatWidgetService);
        const widget = widgetService.lastFocusedWidget;
        if (widget) {
            await widgetService.reveal(widget);
            widget.input.openModelPicker();
        }
    }
}
export class OpenPermissionPickerAction extends Action2 {
    static { this.ID = 'workbench.action.chat.openPermissionPicker'; }
    constructor() {
        super({
            id: OpenPermissionPickerAction.ID,
            title: localize2(5972, "Open Permission Picker"),
            tooltip: localize(5962, null),
            category: CHAT_CATEGORY,
            f1: false,
            precondition: ChatContextKeys.enabled,
            menu: {
                id: MenuId.ChatInputSecondary,
                order: 10,
                group: 'navigation',
                when: ContextKeyExpr.and(ChatContextKeys.enabled, ChatContextKeys.location.isEqualTo(ChatAgentLocation.Chat), ChatContextKeys.chatModeKind.notEqualsTo(ChatModeKind.Ask), ChatContextKeys.inQuickChat.negate(), ContextKeyExpr.or(ChatContextKeys.lockedToCodingAgent.negate(), ChatContextKeys.lockedCodingAgentId.isEqualTo(AgentSessionProviders.Background)))
            }
        });
    }
    async run(accessor) {
        const widgetService = accessor.get(IChatWidgetService);
        const widget = widgetService.lastFocusedWidget;
        if (widget) {
            widget.input.openPermissionPicker();
        }
    }
}
export class OpenModePickerAction extends Action2 {
    static { this.ID = 'workbench.action.chat.openModePicker'; }
    constructor() {
        super({
            id: OpenModePickerAction.ID,
            title: localize2(5973, "Open Agent Picker"),
            tooltip: localize(5963, null),
            category: CHAT_CATEGORY,
            f1: false,
            precondition: ChatContextKeys.enabled,
            keybinding: {
                when: ContextKeyExpr.and(ChatContextKeys.inChatInput, ChatContextKeys.location.isEqualTo(ChatAgentLocation.Chat)),
                primary: 2048 /* KeyMod.CtrlCmd */ | 89 /* KeyCode.Period */,
                weight: 100 /* KeybindingWeight.EditorContrib */
            },
            menu: [
                {
                    id: MenuId.ChatInput,
                    order: 1,
                    when: ContextKeyExpr.and(ChatContextKeys.enabled, ChatContextKeys.location.isEqualTo(ChatAgentLocation.Chat), ChatContextKeys.inQuickChat.negate(), ContextKeyExpr.or(ChatContextKeys.lockedToCodingAgent.negate(), ChatContextKeys.chatSessionHasCustomAgentTarget), 
                    // Show in welcome view for local sessions or sessions with custom agent target
                    ContextKeyExpr.or(ChatContextKeys.inAgentSessionsWelcome.negate(), ChatContextKeys.chatSessionHasCustomAgentTarget, ChatContextKeys.agentSessionType.isEqualTo(AgentSessionProviders.Local))),
                    group: 'navigation',
                },
            ]
        });
    }
    async run(accessor, ...args) {
        const widgetService = accessor.get(IChatWidgetService);
        const widget = widgetService.lastFocusedWidget;
        if (widget) {
            widget.input.openModePicker();
        }
    }
}
export class OpenSessionTargetPickerAction extends Action2 {
    static { this.ID = 'workbench.action.chat.openSessionTargetPicker'; }
    constructor() {
        super({
            id: OpenSessionTargetPickerAction.ID,
            title: localize2(5974, "Open Session Target Picker"),
            tooltip: localize(5964, null),
            category: CHAT_CATEGORY,
            f1: false,
            precondition: ContextKeyExpr.and(ChatContextKeys.enabled, ContextKeyExpr.or(ChatContextKeys.chatSessionIsEmpty, ChatContextKeys.inAgentSessionsWelcome), ChatContextKeys.currentlyEditingInput.negate(), ChatContextKeys.currentlyEditing.negate()),
            menu: [
                {
                    id: MenuId.ChatInput,
                    order: 0,
                    when: ContextKeyExpr.and(ChatContextKeys.enabled, ChatContextKeys.location.isEqualTo(ChatAgentLocation.Chat), ChatContextKeys.inQuickChat.negate(), ChatContextKeys.chatSessionIsEmpty, IsSessionsWindowContext),
                    group: 'navigation',
                },
                {
                    id: MenuId.ChatInputSecondary,
                    order: 0,
                    when: ContextKeyExpr.and(ChatContextKeys.enabled, ChatContextKeys.location.isEqualTo(ChatAgentLocation.Chat), ChatContextKeys.inQuickChat.negate(), IsSessionsWindowContext.negate(), ChatContextKeys.chatSessionIsEmpty),
                    group: 'navigation',
                },
            ]
        });
    }
    async run(accessor, ...args) {
        const widgetService = accessor.get(IChatWidgetService);
        const widget = widgetService.lastFocusedWidget;
        if (widget) {
            widget.input.openSessionTargetPicker();
        }
    }
}
export class OpenDelegationPickerAction extends Action2 {
    static { this.ID = 'workbench.action.chat.openDelegationPicker'; }
    constructor() {
        super({
            id: OpenDelegationPickerAction.ID,
            title: localize2(5975, "Open Delegation Picker"),
            tooltip: localize(5965, null),
            category: CHAT_CATEGORY,
            f1: false,
            precondition: ContextKeyExpr.and(ChatContextKeys.enabled, ChatContextKeys.chatSessionIsEmpty.negate(), ChatContextKeys.currentlyEditingInput.negate(), ChatContextKeys.currentlyEditing.negate()),
            menu: [
                {
                    id: MenuId.ChatInputSecondary,
                    order: 0.5,
                    when: ContextKeyExpr.and(ChatContextKeys.enabled, ChatContextKeys.location.isEqualTo(ChatAgentLocation.Chat), ChatContextKeys.inQuickChat.negate(), ChatContextKeys.chatSessionSupportsDelegation, ChatContextKeys.chatSessionIsEmpty.negate()),
                    group: 'navigation',
                },
            ]
        });
    }
    async run(accessor, ...args) {
        const widgetService = accessor.get(IChatWidgetService);
        const widget = widgetService.lastFocusedWidget;
        if (widget) {
            widget.input.openDelegationPicker();
        }
    }
}
export class OpenWorkspacePickerAction extends Action2 {
    static { this.ID = 'workbench.action.chat.openWorkspacePicker'; }
    constructor() {
        super({
            id: OpenWorkspacePickerAction.ID,
            title: localize2(5976, "Open Workspace Picker"),
            tooltip: localize(5966, null),
            category: CHAT_CATEGORY,
            f1: false,
            precondition: ContextKeyExpr.and(ChatContextKeys.enabled, ChatContextKeys.inAgentSessionsWelcome),
            menu: [
                {
                    id: MenuId.ChatInput,
                    order: 0.6,
                    when: ContextKeyExpr.and(ChatContextKeys.inAgentSessionsWelcome, ChatContextKeys.chatSessionType.isEqualTo(localChatSessionType), IsSessionsWindowContext),
                    group: 'navigation',
                },
                {
                    id: MenuId.ChatInputSecondary,
                    order: 0.6,
                    when: ContextKeyExpr.and(ChatContextKeys.inAgentSessionsWelcome, ChatContextKeys.chatSessionType.isEqualTo(localChatSessionType), IsSessionsWindowContext.negate()),
                    group: 'navigation',
                },
            ]
        });
    }
    async run(accessor, ...args) {
        // The picker is opened via the action view item
    }
}
export class ChatSessionPrimaryPickerAction extends Action2 {
    static { this.ID = 'workbench.action.chat.chatSessionPrimaryPicker'; }
    constructor() {
        super({
            id: ChatSessionPrimaryPickerAction.ID,
            title: localize2(5977, "Open Primary Session Picker"),
            category: CHAT_CATEGORY,
            f1: false,
            precondition: ChatContextKeys.enabled,
            menu: {
                id: MenuId.ChatInput,
                order: 4,
                group: 'navigation',
                when: ContextKeyExpr.and(ChatContextKeys.chatSessionHasModels, ContextKeyExpr.or(ChatContextKeys.lockedToCodingAgent, ContextKeyExpr.and(ChatContextKeys.inAgentSessionsWelcome, ChatContextKeys.chatSessionType.notEqualsTo('local'))))
            }
        });
    }
    async run(accessor, ...args) {
        const widgetService = accessor.get(IChatWidgetService);
        const widget = widgetService.lastFocusedWidget;
        if (widget) {
            widget.input.openChatSessionPicker();
        }
    }
}
export const ChangeChatModelActionId = 'workbench.action.chat.changeModel';
class ChangeChatModelAction extends Action2 {
    static { this.ID = ChangeChatModelActionId; }
    constructor() {
        super({
            id: ChangeChatModelAction.ID,
            title: localize2(5978, "Change Model"),
            category: CHAT_CATEGORY,
            f1: false,
            precondition: ChatContextKeys.enabled,
        });
    }
    run(accessor, ...args) {
        const modelInfo = args[0];
        // Type check the arg
        assertType(typeof modelInfo.vendor === 'string' && typeof modelInfo.id === 'string' && typeof modelInfo.family === 'string');
        const widgetService = accessor.get(IChatWidgetService);
        const widgets = widgetService.getAllWidgets();
        for (const widget of widgets) {
            widget.input.switchModel(modelInfo);
        }
    }
}
export class ChatEditingSessionSubmitAction extends SubmitAction {
    static { this.ID = 'workbench.action.edits.submit'; }
    constructor() {
        const notInProgressOrEditing = ContextKeyExpr.and(ContextKeyExpr.or(whenNotInProgress, ChatContextKeys.editingRequestType.isEqualTo("s" /* ChatContextKeys.EditingRequestType.Sent */)), ChatContextKeys.editingRequestType.notEqualsTo("q" /* ChatContextKeys.EditingRequestType.Queue */), ChatContextKeys.editingRequestType.notEqualsTo("st" /* ChatContextKeys.EditingRequestType.Steer */));
        const menuCondition = ChatContextKeys.chatModeKind.notEqualsTo(ChatModeKind.Ask);
        const precondition = ContextKeyExpr.and(ChatContextKeys.inputHasText, notInProgressOrEditing, ChatContextKeys.chatSessionOptionsValid);
        super({
            id: ChatEditingSessionSubmitAction.ID,
            title: localize2(5979, "Send"),
            f1: false,
            category: CHAT_CATEGORY,
            icon: Codicon.arrowUp,
            precondition,
            menu: [
                {
                    id: MenuId.ChatExecute,
                    order: 4,
                    when: ContextKeyExpr.and(notInProgressOrEditing, menuCondition, noQuestionCarouselOrHasInput),
                    group: 'navigation',
                    alt: {
                        id: 'workbench.action.chat.sendToNewChat',
                        title: localize2(5980, "Send to New Chat"),
                        icon: Codicon.plus
                    }
                }
            ]
        });
    }
}
class SubmitWithoutDispatchingAction extends Action2 {
    static { this.ID = 'workbench.action.chat.submitWithoutDispatching'; }
    constructor() {
        const precondition = ContextKeyExpr.and(ChatContextKeys.inputHasText, whenNotInProgress, ChatContextKeys.chatModeKind.isEqualTo(ChatModeKind.Ask));
        super({
            id: SubmitWithoutDispatchingAction.ID,
            title: localize2(5981, "Send"),
            f1: false,
            category: CHAT_CATEGORY,
            precondition,
            keybinding: {
                when: ChatContextKeys.inChatInput,
                primary: 512 /* KeyMod.Alt */ | 1024 /* KeyMod.Shift */ | 3 /* KeyCode.Enter */,
                weight: 100 /* KeybindingWeight.EditorContrib */
            }
        });
    }
    run(accessor, ...args) {
        const context = args[0];
        const widgetService = accessor.get(IChatWidgetService);
        const widget = context?.widget ?? widgetService.lastFocusedWidget;
        widget?.acceptInput(context?.inputValue, { noCommandDetection: true });
    }
}
export class ChatSubmitWithCodebaseAction extends Action2 {
    static { this.ID = 'workbench.action.chat.submitWithCodebase'; }
    constructor() {
        const precondition = ContextKeyExpr.and(ChatContextKeys.inputHasText, whenNotInProgress);
        super({
            id: ChatSubmitWithCodebaseAction.ID,
            title: localize2(5982, "Send with {0}", `${chatVariableLeader}codebase`),
            precondition,
            keybinding: {
                when: ChatContextKeys.inChatInput,
                primary: 2048 /* KeyMod.CtrlCmd */ | 3 /* KeyCode.Enter */,
                weight: 100 /* KeybindingWeight.EditorContrib */
            },
        });
    }
    run(accessor, ...args) {
        const context = args[0];
        const widgetService = accessor.get(IChatWidgetService);
        const widget = context?.widget ?? widgetService.lastFocusedWidget;
        if (!widget) {
            return;
        }
        const languageModelToolsService = accessor.get(ILanguageModelToolsService);
        const codebaseTool = languageModelToolsService.getToolByName('codebase');
        if (!codebaseTool) {
            return;
        }
        widget.input.attachmentModel.addContext({
            id: codebaseTool.id,
            name: codebaseTool.displayName ?? '',
            fullName: codebaseTool.displayName ?? '',
            value: undefined,
            icon: ThemeIcon.isThemeIcon(codebaseTool.icon) ? codebaseTool.icon : undefined,
            kind: 'tool'
        });
        widget.acceptInput();
    }
}
class SendToNewChatAction extends Action2 {
    constructor() {
        const precondition = ChatContextKeys.inputHasText;
        super({
            id: 'workbench.action.chat.sendToNewChat',
            title: localize2(5983, "Send to New Chat"),
            precondition,
            category: CHAT_CATEGORY,
            f1: false,
            keybinding: {
                weight: 200 /* KeybindingWeight.WorkbenchContrib */,
                primary: 2048 /* KeyMod.CtrlCmd */ | 1024 /* KeyMod.Shift */ | 3 /* KeyCode.Enter */,
                when: ChatContextKeys.inChatInput,
            }
        });
    }
    async run(accessor, ...args) {
        const context = args[0];
        const widgetService = accessor.get(IChatWidgetService);
        const viewsService = accessor.get(IViewsService);
        const dialogService = accessor.get(IDialogService);
        const chatService = accessor.get(IChatService);
        const widget = context?.widget ?? widgetService.lastFocusedWidget;
        if (!widget) {
            return;
        }
        const inputBeforeClear = widget.getInput();
        // Cancel any in-progress request before clearing
        if (widget.viewModel) {
            await chatService.cancelCurrentRequestForSession(widget.viewModel.sessionResource, 'newSessionAction');
        }
        if (widget.viewModel?.model) {
            if (!(await handleCurrentEditingSession(widget.viewModel.model, undefined, dialogService))) {
                return;
            }
        }
        // Clear the input from the current session before creating a new one
        widget.setInput('');
        await clearChatSessionPreservingType(widget, viewsService);
        widget.acceptInput(inputBeforeClear, { storeToHistory: true });
    }
}
export const CancelChatActionId = 'workbench.action.chat.cancel';
export class CancelAction extends Action2 {
    static { this.ID = CancelChatActionId; }
    constructor() {
        super({
            id: CancelAction.ID,
            title: localize2(5984, "Cancel"),
            f1: false,
            category: CHAT_CATEGORY,
            icon: Codicon.stopCircle,
            menu: [{
                    id: MenuId.ChatExecute,
                    when: ContextKeyExpr.and(ContextKeyExpr.or(requestInProgressWithoutInput, pendingToolCall), ChatContextKeys.remoteJobCreating.negate(), ChatContextKeys.currentlyEditing.negate()),
                    order: 4,
                    group: 'navigation',
                }, {
                    id: MenuId.ChatEditorInlineExecute,
                    when: ContextKeyExpr.and(ctxIsGlobalEditingSession.negate(), ctxHasRequestInProgress, CTX_HOVER_MODE.negate()),
                    order: 4,
                    group: 'navigation',
                }
            ],
            keybinding: {
                weight: 200 /* KeybindingWeight.WorkbenchContrib */,
                primary: 2048 /* KeyMod.CtrlCmd */ | 9 /* KeyCode.Escape */,
                when: ContextKeyExpr.and(requestInProgressOrPendingToolCall, ChatContextKeys.remoteJobCreating.negate()),
                win: { primary: 512 /* KeyMod.Alt */ | 1 /* KeyCode.Backspace */ },
            }
        });
    }
    async run(accessor, ...args) {
        const context = args[0];
        const widgetService = accessor.get(IChatWidgetService);
        const logService = accessor.get(ILogService);
        const telemetryService = accessor.get(ITelemetryService);
        const widget = context?.widget ?? widgetService.lastFocusedWidget;
        if (!widget) {
            telemetryService.publicLog2(ChatStopCancellationNoopEventName, {
                source: 'cancelAction',
                reason: 'noWidget',
                requestInProgress: 'unknown',
                pendingRequests: 0,
            });
            logService.info('ChatCancelAction#run: No focused chat widget was found');
            return;
        }
        const chatService = accessor.get(IChatService);
        if (widget.viewModel) {
            await chatService.cancelCurrentRequestForSession(widget.viewModel.sessionResource, 'cancelAction');
        }
        else {
            telemetryService.publicLog2(ChatStopCancellationNoopEventName, {
                source: 'cancelAction',
                reason: 'noViewModel',
                requestInProgress: 'unknown',
                pendingRequests: 0,
            });
            logService.info('ChatCancelAction#run: Canceled chat widget has no view model');
        }
    }
}
export const CancelChatEditId = 'workbench.edit.chat.cancel';
export class CancelEdit extends Action2 {
    static { this.ID = CancelChatEditId; }
    constructor() {
        super({
            id: CancelEdit.ID,
            title: localize2(5985, "Cancel Edit"),
            f1: false,
            category: CHAT_CATEGORY,
            icon: Codicon.x,
            menu: [
                {
                    id: MenuId.ChatMessageTitle,
                    group: 'navigation',
                    order: 1,
                    when: ContextKeyExpr.and(ChatContextKeys.isRequest, ChatContextKeys.currentlyEditing, ContextKeyExpr.equals(`config.${ChatConfiguration.EditRequests}`, 'input'))
                }
            ],
            keybinding: {
                primary: 9 /* KeyCode.Escape */,
                when: ContextKeyExpr.and(ChatContextKeys.inChatInput, EditorContextKeys.hoverVisible.toNegated(), EditorContextKeys.hasNonEmptySelection.toNegated(), EditorContextKeys.hasMultipleSelections.toNegated(), ContextKeyExpr.or(ChatContextKeys.currentlyEditing, ChatContextKeys.currentlyEditingInput)),
                weight: 100 /* KeybindingWeight.EditorContrib */ - 5
            }
        });
    }
    run(accessor, ...args) {
        const context = args[0];
        const widgetService = accessor.get(IChatWidgetService);
        const widget = context?.widget ?? widgetService.lastFocusedWidget;
        if (!widget) {
            return;
        }
        widget.finishedEditing();
    }
}
// --- Handoff Discovery & Execution Commands ---
export const GetHandoffsActionId = 'workbench.action.chat.getHandoffs';
/**
 * Discovers the handoffs available across custom agents (and built-in modes).
 *
 * **Return value**: `ICustomAgentInfo[]` — an array where each element
 * represents an agent/mode with its `id`, `name`, `isBuiltin`,
 * `visibility`, and `handoffs` list.
 *
 * @see ICustomAgentInfo
 * @see IHandoffInfo
 */
class GetHandoffsAction extends Action2 {
    static { this.ID = GetHandoffsActionId; }
    constructor() {
        super({
            id: GetHandoffsAction.ID,
            title: localize2(5986, "Get Handoffs"),
            f1: false,
            category: CHAT_CATEGORY,
        });
    }
    run(accessor, ...args) {
        const modeService = accessor.get(IChatModeService);
        const arg = args.at(0);
        const { builtin, custom } = modeService.getModes();
        let allModes = [...builtin, ...custom];
        if (arg?.sourceCustomAgent) {
            const filterName = arg.sourceCustomAgent;
            allModes = allModes.filter(m => m.name.get().toLowerCase() === filterName.toLowerCase());
        }
        return buildCustomAgentHandoffsInfo(allModes);
    }
}
export const ExecuteHandoffActionId = 'workbench.action.chat.executeHandoff';
class ExecuteHandoffAction extends Action2 {
    static { this.ID = ExecuteHandoffActionId; }
    constructor() {
        super({
            id: ExecuteHandoffAction.ID,
            title: localize2(5987, "Execute Handoff"),
            f1: false,
            category: CHAT_CATEGORY,
        });
    }
    async run(accessor, ...args) {
        const chatWidgetService = accessor.get(IChatWidgetService);
        const modeService = accessor.get(IChatModeService);
        const arg = args.at(0);
        if (!arg?.id && !arg?.label) {
            return { success: false, error: 'Either id or label is required' };
        }
        // Resolve the target widget: explicit sessionResource, or fall back to last-focused
        let widget;
        if (arg.sessionResource) {
            let sessionResource;
            try {
                sessionResource = URI.parse(arg.sessionResource);
            }
            catch {
                return { success: false, error: `Invalid sessionResource URI: '${arg.sessionResource}'` };
            }
            widget = chatWidgetService.getWidgetBySessionResource(sessionResource);
        }
        else {
            widget = chatWidgetService.lastFocusedWidget;
        }
        if (!widget) {
            return { success: false, error: 'No chat widget found. Provide sessionResource or focus a chat widget.' };
        }
        // Resolve the source custom agent whose handoffs we search (case-insensitive)
        let sourceMode;
        if (arg.sourceCustomAgent) {
            const filterName = arg.sourceCustomAgent.toLowerCase();
            const { builtin, custom } = modeService.getModes();
            sourceMode = [...builtin, ...custom].find(m => m.name.get().toLowerCase() === filterName || m.id.toLowerCase() === filterName);
        }
        if (!sourceMode) {
            sourceMode = widget.input.currentModeObs.get();
        }
        const handoffs = sourceMode?.handOffs?.get();
        if (!handoffs || handoffs.length === 0) {
            return { success: false, error: `No handoffs available for mode '${sourceMode?.name.get()}'` };
        }
        // Match by id first, then by label
        let matchedHandoff = arg.id
            ? handoffs.find(h => getHandoffId(h) === arg.id)
            : undefined;
        if (!matchedHandoff && arg.label) {
            const labelLower = arg.label.trim().toLowerCase();
            matchedHandoff = handoffs.find(h => h.label.trim().toLowerCase() === labelLower);
        }
        if (!matchedHandoff) {
            const identifier = arg.id ?? arg.label;
            return { success: false, error: `No handoff with identifier '${identifier}' found for mode '${sourceMode?.name.get()}'` };
        }
        await widget.executeHandoff(matchedHandoff);
        return { success: true, targetMode: matchedHandoff.agent };
    }
}
export function registerChatExecuteActions() {
    registerAction2(ChatSubmitAction);
    registerAction2(ChatEditingSessionSubmitAction);
    registerAction2(SubmitWithoutDispatchingAction);
    registerAction2(CancelAction);
    registerAction2(SendToNewChatAction);
    registerAction2(ChatSubmitWithCodebaseAction);
    registerAction2(ToggleChatModeAction);
    registerAction2(SwitchToNextModelAction);
    registerAction2(OpenModelPickerAction);
    registerAction2(OpenPermissionPickerAction);
    registerAction2(OpenModePickerAction);
    registerAction2(OpenSessionTargetPickerAction);
    registerAction2(OpenDelegationPickerAction);
    registerAction2(OpenWorkspacePickerAction);
    registerAction2(ChatSessionPrimaryPickerAction);
    registerAction2(ChangeChatModelAction);
    registerAction2(CancelEdit);
    registerAction2(GetHandoffsAction);
    registerAction2(ExecuteHandoffAction);
}
//# sourceMappingURL=chatExecuteActions.js.map