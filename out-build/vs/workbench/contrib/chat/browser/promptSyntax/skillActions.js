/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { ChatViewId } from '../chat.js';
import { CHAT_CATEGORY, CHAT_CONFIG_MENU_ID } from '../actions/chatActions.js';
import { localize, localize2 } from '../../../../../nls.js';
import { ChatContextKeys } from '../../common/actions/chatContextKeys.js';
import { PromptFilePickers } from './pickers/promptFilePickers.js';
import { Action2, registerAction2 } from '../../../../../platform/actions/common/actions.js';
import { IInstantiationService } from '../../../../../platform/instantiation/common/instantiation.js';
import { Codicon } from '../../../../../base/common/codicons.js';
import { ContextKeyExpr } from '../../../../../platform/contextkey/common/contextkey.js';
import { PromptsType } from '../../common/promptSyntax/promptTypes.js';
import { IOpenerService } from '../../../../../platform/opener/common/opener.js';
/**
 * Action ID for the `Configure Skills` action.
 */
export const CONFIGURE_SKILLS_ACTION_ID = 'workbench.action.chat.configure.skills';
class ManageSkillsAction extends Action2 {
    constructor() {
        super({
            id: CONFIGURE_SKILLS_ACTION_ID,
            title: localize2(7765, "Configure Skills..."),
            shortTitle: localize2(7766, "Skills"),
            icon: Codicon.lightbulb,
            f1: true,
            precondition: ChatContextKeys.enabled,
            category: CHAT_CATEGORY,
            menu: {
                id: CHAT_CONFIG_MENU_ID,
                when: ContextKeyExpr.and(ChatContextKeys.enabled, ContextKeyExpr.equals('view', ChatViewId)),
                order: 9,
                group: '1_level'
            }
        });
    }
    async run(accessor) {
        const openerService = accessor.get(IOpenerService);
        const instaService = accessor.get(IInstantiationService);
        const pickers = instaService.createInstance(PromptFilePickers);
        const placeholder = localize(7764, null);
        const result = await pickers.selectPromptFile({ placeholder, type: PromptsType.skill, optionEdit: false });
        if (result !== undefined) {
            await openerService.open(result.promptFile);
        }
    }
}
/**
 * Helper to register the `Manage Skills` action.
 */
export function registerSkillActions() {
    registerAction2(ManageSkillsAction);
}
//# sourceMappingURL=skillActions.js.map