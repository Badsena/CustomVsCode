/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { CHAT_CATEGORY, CHAT_CONFIG_MENU_ID } from '../actions/chatActions.js';
import { Codicon } from '../../../../../base/common/codicons.js';
import { ChatContextKeys } from '../../common/actions/chatContextKeys.js';
import { localize, localize2 } from '../../../../../nls.js';
import { PromptFilePickers } from './pickers/promptFilePickers.js';
import { Action2, MenuId, registerAction2 } from '../../../../../platform/actions/common/actions.js';
import { IInstantiationService } from '../../../../../platform/instantiation/common/instantiation.js';
import { PromptsType } from '../../common/promptSyntax/promptTypes.js';
import { ChatViewId } from '../chat.js';
import { ContextKeyExpr } from '../../../../../platform/contextkey/common/contextkey.js';
import { IOpenerService } from '../../../../../platform/opener/common/opener.js';
class ConfigAgentActionImpl extends Action2 {
    async run(accessor) {
        const instaService = accessor.get(IInstantiationService);
        const openerService = accessor.get(IOpenerService);
        const pickers = instaService.createInstance(PromptFilePickers);
        const placeholder = localize(7622, null);
        const result = await pickers.selectPromptFile({ placeholder, type: PromptsType.agent, optionEdit: false, optionVisibility: true });
        if (result !== undefined) {
            await openerService.open(result.promptFile);
        }
    }
}
// Separate action `Configure Custom Agents` link in the agent picker.
const PICKER_CONFIGURE_AGENTS_ACTION_ID = 'workbench.action.chat.picker.customagents';
function createPickerConfigureAgentsActionConfig(disabled) {
    const config = {
        id: disabled ? PICKER_CONFIGURE_AGENTS_ACTION_ID + '.disabled' : PICKER_CONFIGURE_AGENTS_ACTION_ID,
        title: localize2(7626, "Configure Custom Agents..."),
        tooltip: disabled ? localize(7623, null) : undefined,
        icon: disabled ? Codicon.lock : undefined,
        category: CHAT_CATEGORY,
        f1: false,
        precondition: disabled ? ContextKeyExpr.false() : ChatContextKeys.Modes.agentModeDisabledByPolicy.negate(),
        menu: {
            id: MenuId.ChatModePicker,
            when: disabled ? ChatContextKeys.Modes.agentModeDisabledByPolicy : ChatContextKeys.Modes.agentModeDisabledByPolicy.negate(),
        },
    };
    return config;
}
class PickerConfigAgentAction extends ConfigAgentActionImpl {
    constructor() { super(createPickerConfigureAgentsActionConfig(false)); }
}
class PickerConfigAgentActionDisabled extends ConfigAgentActionImpl {
    constructor() { super(createPickerConfigureAgentsActionConfig(true)); }
}
/**
 * Action ID for the `Configure Custom Agents` action.
 */
const CONFIGURE_AGENTS_ACTION_ID = 'workbench.action.chat.configure.customagents';
function createManageAgentsActionConfig(disabled) {
    const base = {
        id: disabled ? CONFIGURE_AGENTS_ACTION_ID + '.disabled' : CONFIGURE_AGENTS_ACTION_ID,
        title: localize2(7627, "Configure Custom Agents..."),
        shortTitle: localize(7624, null),
        icon: disabled ? Codicon.lock : Codicon.bookmark,
        f1: !disabled,
        precondition: disabled ? ContextKeyExpr.false() : ContextKeyExpr.and(ChatContextKeys.enabled, ChatContextKeys.Modes.agentModeDisabledByPolicy.negate()),
        category: CHAT_CATEGORY,
        menu: [
            {
                id: CHAT_CONFIG_MENU_ID,
                when: ContextKeyExpr.and(ChatContextKeys.enabled, ContextKeyExpr.equals('view', ChatViewId), disabled ? ChatContextKeys.Modes.agentModeDisabledByPolicy : ChatContextKeys.Modes.agentModeDisabledByPolicy.negate()),
                order: 10,
                group: '0_level'
            }
        ]
    };
    return disabled ? { ...base, tooltip: localize(7625, null) } : base;
}
class ManageAgentsAction extends ConfigAgentActionImpl {
    constructor() { super(createManageAgentsActionConfig(false)); }
}
class ManageAgentsActionDisabled extends ConfigAgentActionImpl {
    constructor() { super(createManageAgentsActionConfig(true)); }
}
/**
 * Helper to register all the `Run Current Prompt` actions.
 */
export function registerAgentActions() {
    registerAction2(ManageAgentsAction);
    registerAction2(ManageAgentsActionDisabled);
    registerAction2(PickerConfigAgentAction);
    registerAction2(PickerConfigAgentActionDisabled);
}
//# sourceMappingURL=chatModeActions.js.map