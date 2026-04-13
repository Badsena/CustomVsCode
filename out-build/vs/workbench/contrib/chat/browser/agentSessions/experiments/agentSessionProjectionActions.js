/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { localize, localize2 } from '../../../../../../nls.js';
import { Action2 } from '../../../../../../platform/actions/common/actions.js';
import { ContextKeyExpr } from '../../../../../../platform/contextkey/common/contextkey.js';
import { ChatContextKeys } from '../../../common/actions/chatContextKeys.js';
import { IAgentSessionProjectionService } from './agentSessionProjectionService.js';
import { isMarshalledAgentSessionContext } from '../agentSessionsModel.js';
import { IAgentSessionsService } from '../agentSessionsService.js';
import { CHAT_CATEGORY } from '../../actions/chatActions.js';
import { ToggleTitleBarConfigAction } from '../../../../../browser/parts/titlebar/titlebarActions.js';
import { IsCompactTitleBarContext } from '../../../../../common/contextkeys.js';
import { inAgentSessionProjection } from './agentSessionProjection.js';
import { ChatConfiguration } from '../../../common/constants.js';
//#region Enter Agent Session Projection
export class EnterAgentSessionProjectionAction extends Action2 {
    static { this.ID = 'agentSession.enterAgentSessionProjection'; }
    constructor() {
        super({
            id: EnterAgentSessionProjectionAction.ID,
            title: localize2(6282, "Enter Agent Session Projection"),
            category: CHAT_CATEGORY,
            f1: false,
            precondition: ContextKeyExpr.and(ChatContextKeys.enabled, ContextKeyExpr.has(`config.${ChatConfiguration.AgentSessionProjectionEnabled}`), inAgentSessionProjection.negate()),
        });
    }
    async run(accessor, context) {
        const projectionService = accessor.get(IAgentSessionProjectionService);
        const agentSessionsService = accessor.get(IAgentSessionsService);
        let session;
        if (context) {
            if (isMarshalledAgentSessionContext(context)) {
                session = agentSessionsService.getSession(context.session.resource);
            }
            else {
                session = context;
            }
        }
        if (session) {
            await projectionService.enterProjection(session);
        }
    }
}
//#endregion
//#region Exit Agent Session Projection
export class ExitAgentSessionProjectionAction extends Action2 {
    static { this.ID = 'agentSession.exitAgentSessionProjection'; }
    constructor() {
        super({
            id: ExitAgentSessionProjectionAction.ID,
            title: localize2(6283, "Exit Agent Session Projection"),
            category: CHAT_CATEGORY,
            f1: true,
            precondition: ContextKeyExpr.and(ChatContextKeys.enabled, inAgentSessionProjection),
            keybinding: {
                weight: 200 /* KeybindingWeight.WorkbenchContrib */,
                primary: 9 /* KeyCode.Escape */,
                when: inAgentSessionProjection,
            },
        });
    }
    async run(accessor) {
        const projectionService = accessor.get(IAgentSessionProjectionService);
        await projectionService.exitProjection();
    }
}
//#endregion
//#region Toggle Agent Status
export class ToggleAgentStatusAction extends ToggleTitleBarConfigAction {
    constructor() {
        super(ChatConfiguration.AgentStatusEnabled, localize(6278, null), localize(6279, null), 6, ContextKeyExpr.and(ChatContextKeys.enabled, IsCompactTitleBarContext.negate(), ChatContextKeys.supported, ContextKeyExpr.has('config.window.commandCenter')));
    }
}
//#endregion
//#region Toggle Agent Quick Input
export class ToggleUnifiedAgentsBarAction extends ToggleTitleBarConfigAction {
    constructor() {
        super(ChatConfiguration.UnifiedAgentsBar, localize(6280, null), localize(6281, null), 7, ContextKeyExpr.and(ChatContextKeys.enabled, IsCompactTitleBarContext.negate(), ChatContextKeys.supported, ContextKeyExpr.has('config.window.commandCenter')));
    }
}
//#endregion
//# sourceMappingURL=agentSessionProjectionActions.js.map