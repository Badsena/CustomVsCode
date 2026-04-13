/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
// ─── Root State ──────────────────────────────────────────────────────────────
/**
 * Policy configuration state for a model.
 *
 * @category Root State
 */
export var PolicyState;
(function (PolicyState) {
    PolicyState["Enabled"] = "enabled";
    PolicyState["Disabled"] = "disabled";
    PolicyState["Unconfigured"] = "unconfigured";
})(PolicyState || (PolicyState = {}));
// ─── Session State ───────────────────────────────────────────────────────────
/**
 * Session initialization state.
 *
 * @category Session State
 */
export var SessionLifecycle;
(function (SessionLifecycle) {
    SessionLifecycle["Creating"] = "creating";
    SessionLifecycle["Ready"] = "ready";
    SessionLifecycle["CreationFailed"] = "creationFailed";
})(SessionLifecycle || (SessionLifecycle = {}));
/**
 * Current session status.
 *
 * @category Session State
 */
export var SessionStatus;
(function (SessionStatus) {
    SessionStatus["Idle"] = "idle";
    SessionStatus["InProgress"] = "in-progress";
    SessionStatus["Error"] = "error";
})(SessionStatus || (SessionStatus = {}));
// ─── Turn Types ──────────────────────────────────────────────────────────────
/**
 * How a turn ended.
 *
 * @category Turn Types
 */
export var TurnState;
(function (TurnState) {
    TurnState["Complete"] = "complete";
    TurnState["Cancelled"] = "cancelled";
    TurnState["Error"] = "error";
})(TurnState || (TurnState = {}));
/**
 * Type of a message attachment.
 *
 * @category Turn Types
 */
export var AttachmentType;
(function (AttachmentType) {
    AttachmentType["File"] = "file";
    AttachmentType["Directory"] = "directory";
    AttachmentType["Selection"] = "selection";
})(AttachmentType || (AttachmentType = {}));
// ─── Response Parts ──────────────────────────────────────────────────────────
/**
 * Discriminant for response part types.
 *
 * @category Response Parts
 */
export var ResponsePartKind;
(function (ResponsePartKind) {
    ResponsePartKind["Markdown"] = "markdown";
    ResponsePartKind["ContentRef"] = "contentRef";
})(ResponsePartKind || (ResponsePartKind = {}));
// ─── Tool Call Types ─────────────────────────────────────────────────────────
/**
 * Status of a tool call in the lifecycle state machine.
 *
 * @category Tool Call Types
 */
export var ToolCallStatus;
(function (ToolCallStatus) {
    ToolCallStatus["Streaming"] = "streaming";
    ToolCallStatus["PendingConfirmation"] = "pending-confirmation";
    ToolCallStatus["Running"] = "running";
    ToolCallStatus["PendingResultConfirmation"] = "pending-result-confirmation";
    ToolCallStatus["Completed"] = "completed";
    ToolCallStatus["Cancelled"] = "cancelled";
})(ToolCallStatus || (ToolCallStatus = {}));
/**
 * How a tool call was confirmed for execution.
 *
 * - `NotNeeded` — No confirmation required (auto-approved)
 * - `UserAction` — User explicitly approved
 * - `Setting` — Approved by a persistent user setting
 *
 * @category Tool Call Types
 */
export var ToolCallConfirmationReason;
(function (ToolCallConfirmationReason) {
    ToolCallConfirmationReason["NotNeeded"] = "not-needed";
    ToolCallConfirmationReason["UserAction"] = "user-action";
    ToolCallConfirmationReason["Setting"] = "setting";
})(ToolCallConfirmationReason || (ToolCallConfirmationReason = {}));
/**
 * Why a tool call was cancelled.
 *
 * @category Tool Call Types
 */
export var ToolCallCancellationReason;
(function (ToolCallCancellationReason) {
    ToolCallCancellationReason["Denied"] = "denied";
    ToolCallCancellationReason["Skipped"] = "skipped";
    ToolCallCancellationReason["ResultDenied"] = "result-denied";
})(ToolCallCancellationReason || (ToolCallCancellationReason = {}));
// ─── Tool Result Content ─────────────────────────────────────────────────────
/**
 * Discriminant for tool result content types.
 *
 * @category Tool Result Content
 */
export var ToolResultContentType;
(function (ToolResultContentType) {
    ToolResultContentType["Text"] = "text";
    ToolResultContentType["Binary"] = "binary";
})(ToolResultContentType || (ToolResultContentType = {}));
// ─── Permission Types ────────────────────────────────────────────────────────
/**
 * Type of permission requested.
 *
 * @category Permission Types
 */
export var PermissionKind;
(function (PermissionKind) {
    PermissionKind["Shell"] = "shell";
    PermissionKind["Write"] = "write";
    PermissionKind["Mcp"] = "mcp";
    PermissionKind["Read"] = "read";
    PermissionKind["Url"] = "url";
})(PermissionKind || (PermissionKind = {}));
//# sourceMappingURL=state.js.map