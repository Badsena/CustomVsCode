/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
// ─── Protocol Version Constants ──────────────────────────────────────────────
/** The current protocol version that new code speaks. */
export const PROTOCOL_VERSION = 1;
/** The oldest protocol version the implementation maintains compatibility with. */
export const MIN_PROTOCOL_VERSION = 1;
// ─── Exhaustive Action → Version Map ─────────────────────────────────────────
/**
 * Maps every action type to the protocol version that introduced it.
 * Adding a new action to `IStateAction` without adding it here is a compile error.
 */
export const ACTION_INTRODUCED_IN = {
    ["root/agentsChanged" /* ActionType.RootAgentsChanged */]: 1,
    ["root/activeSessionsChanged" /* ActionType.RootActiveSessionsChanged */]: 1,
    ["session/ready" /* ActionType.SessionReady */]: 1,
    ["session/creationFailed" /* ActionType.SessionCreationFailed */]: 1,
    ["session/turnStarted" /* ActionType.SessionTurnStarted */]: 1,
    ["session/delta" /* ActionType.SessionDelta */]: 1,
    ["session/responsePart" /* ActionType.SessionResponsePart */]: 1,
    ["session/toolCallStart" /* ActionType.SessionToolCallStart */]: 1,
    ["session/toolCallDelta" /* ActionType.SessionToolCallDelta */]: 1,
    ["session/toolCallReady" /* ActionType.SessionToolCallReady */]: 1,
    ["session/toolCallConfirmed" /* ActionType.SessionToolCallConfirmed */]: 1,
    ["session/toolCallComplete" /* ActionType.SessionToolCallComplete */]: 1,
    ["session/toolCallResultConfirmed" /* ActionType.SessionToolCallResultConfirmed */]: 1,
    ["session/permissionRequest" /* ActionType.SessionPermissionRequest */]: 1,
    ["session/permissionResolved" /* ActionType.SessionPermissionResolved */]: 1,
    ["session/turnComplete" /* ActionType.SessionTurnComplete */]: 1,
    ["session/turnCancelled" /* ActionType.SessionTurnCancelled */]: 1,
    ["session/error" /* ActionType.SessionError */]: 1,
    ["session/titleChanged" /* ActionType.SessionTitleChanged */]: 1,
    ["session/usage" /* ActionType.SessionUsage */]: 1,
    ["session/reasoning" /* ActionType.SessionReasoning */]: 1,
    ["session/modelChanged" /* ActionType.SessionModelChanged */]: 1,
    ["session/serverToolsChanged" /* ActionType.SessionServerToolsChanged */]: 1,
    ["session/activeClientChanged" /* ActionType.SessionActiveClientChanged */]: 1,
    ["session/activeClientToolsChanged" /* ActionType.SessionActiveClientToolsChanged */]: 1,
};
/**
 * Returns whether the given action type is known to the specified protocol version.
 */
export function isActionKnownToVersion(action, clientVersion) {
    return ACTION_INTRODUCED_IN[action.type] <= clientVersion;
}
// ─── Exhaustive Notification → Version Map ─────────────────────────────────
/**
 * Maps every notification type to the protocol version that introduced it.
 * Adding a new notification to `IProtocolNotification` without adding it here
 * is a compile error.
 */
export const NOTIFICATION_INTRODUCED_IN = {
    ["notify/sessionAdded" /* NotificationType.SessionAdded */]: 1,
    ["notify/sessionRemoved" /* NotificationType.SessionRemoved */]: 1,
};
/**
 * Returns whether the given notification type is known to the specified protocol version.
 */
export function isNotificationKnownToVersion(notification, clientVersion) {
    return NOTIFICATION_INTRODUCED_IN[notification.type] <= clientVersion;
}
/**
 * Derives capabilities from a protocol version number.
 */
export function capabilitiesForVersion(_version) {
    return {
        sessions: true,
        tools: true,
        permissions: true,
    };
}
//# sourceMappingURL=registry.js.map