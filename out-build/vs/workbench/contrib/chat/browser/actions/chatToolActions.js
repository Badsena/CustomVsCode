/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { CancellationTokenSource } from '../../../../../base/common/cancellation.js';
import { Codicon } from '../../../../../base/common/codicons.js';
import { Iterable } from '../../../../../base/common/iterator.js';
import { autorun } from '../../../../../base/common/observable.js';
import { localize, localize2 } from '../../../../../nls.js';
import { Action2, MenuId, registerAction2 } from '../../../../../platform/actions/common/actions.js';
import { ContextKeyExpr } from '../../../../../platform/contextkey/common/contextkey.js';
import { IInstantiationService } from '../../../../../platform/instantiation/common/instantiation.js';
import { ITelemetryService } from '../../../../../platform/telemetry/common/telemetry.js';
import { ChatContextKeys } from '../../common/actions/chatContextKeys.js';
import { isResponseVM } from '../../common/model/chatViewModel.js';
import { ChatModeKind } from '../../common/constants.js';
import { IChatWidgetService } from '../chat.js';
import { ToolsScope } from '../widget/input/chatSelectedTools.js';
import { CHAT_CATEGORY } from './chatActions.js';
import { showToolsPicker } from './chatToolPicker.js';
export const AcceptToolConfirmationActionId = 'workbench.action.chat.acceptTool';
export const SkipToolConfirmationActionId = 'workbench.action.chat.skipTool';
export const AcceptToolPostConfirmationActionId = 'workbench.action.chat.acceptToolPostExecution';
export const SkipToolPostConfirmationActionId = 'workbench.action.chat.skipToolPostExecution';
class ToolConfirmationAction extends Action2 {
    run(accessor, context) {
        const chatWidgetService = accessor.get(IChatWidgetService);
        const widget = context?.sessionResource
            ? chatWidgetService.getWidgetBySessionResource(context.sessionResource)
            : chatWidgetService.lastFocusedWidget;
        const lastItem = widget?.viewModel?.getItems().at(-1);
        if (!isResponseVM(lastItem)) {
            return;
        }
        for (const item of lastItem.model.response.value) {
            const state = item.kind === 'toolInvocation' ? item.state.get() : undefined;
            if (state?.type === 1 /* IChatToolInvocation.StateKind.WaitingForConfirmation */ || state?.type === 3 /* IChatToolInvocation.StateKind.WaitingForPostApproval */) {
                state.confirm(this.getReason());
                break;
            }
        }
        // Return focus to the chat input, in case it was in the tool confirmation editor
        widget?.focusInput();
    }
}
class AcceptToolConfirmation extends ToolConfirmationAction {
    constructor() {
        super({
            id: AcceptToolConfirmationActionId,
            title: localize2(6090, "Accept"),
            f1: false,
            category: CHAT_CATEGORY,
            keybinding: {
                when: ContextKeyExpr.and(ChatContextKeys.inChatSession, ChatContextKeys.Editing.hasToolConfirmation),
                primary: 2048 /* KeyMod.CtrlCmd */ | 3 /* KeyCode.Enter */,
                // Override chatEditor.action.accept
                weight: 200 /* KeybindingWeight.WorkbenchContrib */ + 1,
            },
        });
    }
    getReason() {
        return { type: 4 /* ToolConfirmKind.UserAction */ };
    }
}
class SkipToolConfirmation extends ToolConfirmationAction {
    constructor() {
        super({
            id: SkipToolConfirmationActionId,
            title: localize2(6091, "Skip"),
            f1: false,
            category: CHAT_CATEGORY,
            keybinding: {
                when: ContextKeyExpr.and(ChatContextKeys.inChatSession, ChatContextKeys.Editing.hasToolConfirmation),
                primary: 2048 /* KeyMod.CtrlCmd */ | 3 /* KeyCode.Enter */ | 512 /* KeyMod.Alt */,
                // Override chatEditor.action.accept
                weight: 200 /* KeybindingWeight.WorkbenchContrib */ + 1,
            },
        });
    }
    getReason() {
        return { type: 5 /* ToolConfirmKind.Skipped */ };
    }
}
export class ConfigureToolsAction extends Action2 {
    static { this.ID = 'workbench.action.chat.configureTools'; }
    constructor() {
        super({
            id: ConfigureToolsAction.ID,
            title: localize(6081, null),
            icon: Codicon.settings,
            f1: false,
            category: CHAT_CATEGORY,
            precondition: ChatContextKeys.chatModeKind.isEqualTo(ChatModeKind.Agent),
            menu: [{
                    when: ContextKeyExpr.and(ChatContextKeys.chatModeKind.isEqualTo(ChatModeKind.Agent), ChatContextKeys.lockedToCodingAgent.negate()),
                    id: MenuId.ChatInput,
                    group: 'navigation',
                    order: 100,
                }]
        });
    }
    async run(accessor, ...args) {
        const instaService = accessor.get(IInstantiationService);
        const chatWidgetService = accessor.get(IChatWidgetService);
        const telemetryService = accessor.get(ITelemetryService);
        let widget = chatWidgetService.lastFocusedWidget;
        if (!widget) {
            widget = this.extractWidget(args);
        }
        if (!widget) {
            return;
        }
        const source = this.extractSource(args) ?? 'chatInput';
        let placeholder;
        let description;
        const { entriesScope, entriesMap } = widget.input.selectedToolsModel;
        switch (entriesScope) {
            case ToolsScope.Session:
                placeholder = localize(6082, null);
                description = localize(6083, null);
                break;
            case ToolsScope.Agent:
                placeholder = localize(6084, null);
                description = localize(6085, null, widget.input.currentModeObs.get().label.get());
                break;
            case ToolsScope.Agent_ReadOnly:
                placeholder = localize(6086, null);
                description = localize(6087, null, widget.input.currentModeObs.get().label.get());
                break;
            case ToolsScope.Global:
                placeholder = localize(6088, null);
                description = localize(6089, null);
                break;
        }
        // Create a cancellation token that cancels when the mode changes
        const cts = new CancellationTokenSource();
        const initialMode = widget.input.currentModeObs.get();
        const modeListener = autorun(reader => {
            if (initialMode.id !== widget.input.currentModeObs.read(reader).id) {
                cts.cancel();
            }
        });
        try {
            const result = await instaService.invokeFunction(showToolsPicker, placeholder, source, description, () => entriesMap.get(), widget.input.selectedLanguageModel.get()?.metadata, cts.token);
            if (result) {
                widget.input.selectedToolsModel.set(result, false);
            }
        }
        finally {
            modeListener.dispose();
            cts.dispose();
        }
        const tools = widget.input.selectedToolsModel.entriesMap.get();
        telemetryService.publicLog2('chat/selectedTools', {
            total: tools.size,
            enabled: Iterable.reduce(tools, (prev, [_, enabled]) => enabled ? prev + 1 : prev, 0),
        });
    }
    extractWidget(args) {
        function isChatActionContext(obj) {
            return !!obj && typeof obj === 'object' && !!obj.widget;
        }
        for (const arg of args) {
            if (isChatActionContext(arg)) {
                return arg.widget;
            }
        }
        return undefined;
    }
    extractSource(args) {
        function isChatActionSource(obj) {
            return !!obj && typeof obj === 'object' && !!obj.source;
        }
        for (const arg of args) {
            if (isChatActionSource(arg)) {
                return arg.source;
            }
        }
        return undefined;
    }
}
export function registerChatToolActions() {
    registerAction2(AcceptToolConfirmation);
    registerAction2(SkipToolConfirmation);
    registerAction2(ConfigureToolsAction);
}
//# sourceMappingURL=chatToolActions.js.map