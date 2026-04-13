/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { URI } from '../../../../base/common/uri.js';
import { createDecorator } from '../../../../platform/instantiation/common/instantiation.js';
export var ChatSessionStatus;
(function (ChatSessionStatus) {
    ChatSessionStatus[ChatSessionStatus["Failed"] = 0] = "Failed";
    ChatSessionStatus[ChatSessionStatus["Completed"] = 1] = "Completed";
    ChatSessionStatus[ChatSessionStatus["InProgress"] = 2] = "InProgress";
    ChatSessionStatus[ChatSessionStatus["NeedsInput"] = 3] = "NeedsInput";
})(ChatSessionStatus || (ChatSessionStatus = {}));
/**
 * The session type used for local agent chat sessions.
 */
export const localChatSessionType = 'local';
/**
 * The option ID used for selecting the agent in chat sessions.
 */
export const agentOptionId = 'agent';
export const IChatSessionsService = createDecorator('chatSessionsService');
export function isSessionInProgressStatus(state) {
    return state === 2 /* ChatSessionStatus.InProgress */ || state === 3 /* ChatSessionStatus.NeedsInput */;
}
export function isIChatSessionFileChange2(obj) {
    const candidate = obj;
    return candidate && candidate.uri instanceof URI && typeof candidate.insertions === 'number' && typeof candidate.deletions === 'number';
}
//# sourceMappingURL=chatSessionsService.js.map