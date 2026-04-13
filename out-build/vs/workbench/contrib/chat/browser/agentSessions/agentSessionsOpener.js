/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { isLocalAgentSessionItem } from './agentSessionsModel.js';
import { ChatViewPaneTarget, IChatWidgetService } from '../chat.js';
import { ACTIVE_GROUP, SIDE_GROUP } from '../../../../services/editor/common/editorService.js';
import { IChatSessionsService } from '../../common/chatSessionsService.js';
import { Schemas } from '../../../../../base/common/network.js';
import { IInstantiationService } from '../../../../../platform/instantiation/common/instantiation.js';
import { INotificationService } from '../../../../../platform/notification/common/notification.js';
import { localize } from '../../../../../nls.js';
import { toErrorMessage } from '../../../../../base/common/errorMessage.js';
import { ILogService } from '../../../../../platform/log/common/log.js';
class SessionOpenerRegistry {
    constructor() {
        this.participants = new Set();
    }
    registerParticipant(participant) {
        this.participants.add(participant);
        return {
            dispose: () => {
                this.participants.delete(participant);
            }
        };
    }
    getParticipants() {
        return Array.from(this.participants);
    }
}
export const sessionOpenerRegistry = new SessionOpenerRegistry();
//#endregion
export async function openSession(accessor, session, openOptions) {
    const instantiationService = accessor.get(IInstantiationService);
    const logService = accessor.get(ILogService);
    // First, give registered participants a chance to handle the session
    for (const participant of sessionOpenerRegistry.getParticipants()) {
        try {
            const handled = await instantiationService.invokeFunction(accessor => participant.handleOpenSession(accessor, session, openOptions));
            if (handled) {
                return undefined; // Participant handled the session, skip default opening
            }
        }
        catch (error) {
            logService.error(error); // log error but continue to support opening from default logic
        }
    }
    // Default session opening logic
    return instantiationService.invokeFunction(accessor => openSessionDefault(accessor, session, openOptions));
}
async function openSessionDefault(accessor, session, openOptions) {
    const chatSessionsService = accessor.get(IChatSessionsService);
    const chatWidgetService = accessor.get(IChatWidgetService);
    const notificationService = accessor.get(INotificationService);
    try {
        session.setRead(true); // mark as read when opened
        let sessionOptions;
        if (isLocalAgentSessionItem(session)) {
            sessionOptions = {};
        }
        else {
            sessionOptions = { title: { preferred: session.label } };
        }
        let options = {
            ...sessionOptions,
            ...openOptions?.editorOptions,
            revealIfOpened: true, // always try to reveal if already opened
        };
        await chatSessionsService.activateChatSessionItemProvider(session.providerType); // ensure provider is activated before trying to open
        let target;
        if (openOptions?.sideBySide) {
            target = ACTIVE_GROUP;
        }
        else {
            target = ChatViewPaneTarget;
        }
        const isLocalChatSession = session.resource.scheme === Schemas.vscodeChatEditor || session.resource.scheme === Schemas.vscodeLocalChatSession;
        if (!isLocalChatSession && !(await chatSessionsService.canResolveChatSession(session.resource.scheme))) {
            target = openOptions?.sideBySide ? SIDE_GROUP : ACTIVE_GROUP; // force to open in editor if session cannot be resolved in panel
            options = { ...options, revealIfOpened: true };
        }
        return await chatWidgetService.openSession(session.resource, target, options);
    }
    catch (error) {
        notificationService.error(localize(6243, null, toErrorMessage(error)));
        return undefined;
    }
}
//# sourceMappingURL=agentSessionsOpener.js.map