/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
// ─── Client-Dispatchable Map ─────────────────────────────────────────────────
/**
 * Exhaustive map indicating which action types may be dispatched by clients.
 * Adding a new action to IStateAction without adding it here is a compile error.
 */
export const IS_CLIENT_DISPATCHABLE = {
    ["root/agentsChanged" /* ActionType.RootAgentsChanged */]: false,
    ["root/activeSessionsChanged" /* ActionType.RootActiveSessionsChanged */]: false,
    ["session/ready" /* ActionType.SessionReady */]: false,
    ["session/creationFailed" /* ActionType.SessionCreationFailed */]: false,
    ["session/turnStarted" /* ActionType.SessionTurnStarted */]: true,
    ["session/delta" /* ActionType.SessionDelta */]: false,
    ["session/responsePart" /* ActionType.SessionResponsePart */]: false,
    ["session/toolCallStart" /* ActionType.SessionToolCallStart */]: false,
    ["session/toolCallDelta" /* ActionType.SessionToolCallDelta */]: false,
    ["session/toolCallReady" /* ActionType.SessionToolCallReady */]: false,
    ["session/toolCallConfirmed" /* ActionType.SessionToolCallConfirmed */]: true,
    ["session/toolCallComplete" /* ActionType.SessionToolCallComplete */]: true,
    ["session/toolCallResultConfirmed" /* ActionType.SessionToolCallResultConfirmed */]: true,
    ["session/permissionRequest" /* ActionType.SessionPermissionRequest */]: false,
    ["session/permissionResolved" /* ActionType.SessionPermissionResolved */]: true,
    ["session/turnComplete" /* ActionType.SessionTurnComplete */]: false,
    ["session/turnCancelled" /* ActionType.SessionTurnCancelled */]: true,
    ["session/error" /* ActionType.SessionError */]: false,
    ["session/titleChanged" /* ActionType.SessionTitleChanged */]: false,
    ["session/usage" /* ActionType.SessionUsage */]: false,
    ["session/reasoning" /* ActionType.SessionReasoning */]: false,
    ["session/modelChanged" /* ActionType.SessionModelChanged */]: true,
    ["session/serverToolsChanged" /* ActionType.SessionServerToolsChanged */]: false,
    ["session/activeClientChanged" /* ActionType.SessionActiveClientChanged */]: true,
    ["session/activeClientToolsChanged" /* ActionType.SessionActiveClientToolsChanged */]: true,
};
//# sourceMappingURL=action-origin.generated.js.map