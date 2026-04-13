/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
// ─── Action Type Enum ────────────────────────────────────────────────────────
/**
 * Discriminant values for all state actions.
 *
 * @category Actions
 */
export var ActionType;
(function (ActionType) {
    ActionType["RootAgentsChanged"] = "root/agentsChanged";
    ActionType["RootActiveSessionsChanged"] = "root/activeSessionsChanged";
    ActionType["SessionReady"] = "session/ready";
    ActionType["SessionCreationFailed"] = "session/creationFailed";
    ActionType["SessionTurnStarted"] = "session/turnStarted";
    ActionType["SessionDelta"] = "session/delta";
    ActionType["SessionResponsePart"] = "session/responsePart";
    ActionType["SessionToolCallStart"] = "session/toolCallStart";
    ActionType["SessionToolCallDelta"] = "session/toolCallDelta";
    ActionType["SessionToolCallReady"] = "session/toolCallReady";
    ActionType["SessionToolCallConfirmed"] = "session/toolCallConfirmed";
    ActionType["SessionToolCallComplete"] = "session/toolCallComplete";
    ActionType["SessionToolCallResultConfirmed"] = "session/toolCallResultConfirmed";
    ActionType["SessionPermissionRequest"] = "session/permissionRequest";
    ActionType["SessionPermissionResolved"] = "session/permissionResolved";
    ActionType["SessionTurnComplete"] = "session/turnComplete";
    ActionType["SessionTurnCancelled"] = "session/turnCancelled";
    ActionType["SessionError"] = "session/error";
    ActionType["SessionTitleChanged"] = "session/titleChanged";
    ActionType["SessionUsage"] = "session/usage";
    ActionType["SessionReasoning"] = "session/reasoning";
    ActionType["SessionModelChanged"] = "session/modelChanged";
    ActionType["SessionServerToolsChanged"] = "session/serverToolsChanged";
    ActionType["SessionActiveClientChanged"] = "session/activeClientChanged";
    ActionType["SessionActiveClientToolsChanged"] = "session/activeClientToolsChanged";
})(ActionType || (ActionType = {}));
//# sourceMappingURL=actions.js.map