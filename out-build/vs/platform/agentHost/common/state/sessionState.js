/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
// Immutable state types for the sessions process protocol.
// See protocol.md for the full design rationale.
//
// Most types are imported from the auto-generated protocol layer
// (synced from the agent-host-protocol repo). This file adds VS Code-specific
// helpers and re-exports.
import { hasKey } from '../../../../base/common/types.js';
// Re-export everything from the protocol state module
export { AttachmentType, PolicyState, PermissionKind, ResponsePartKind, SessionLifecycle, SessionStatus, ToolCallConfirmationReason, ToolCallCancellationReason, ToolCallStatus, ToolResultContentType, TurnState, } from './protocol/state.js';
// ---- Well-known URIs --------------------------------------------------------
/** URI for the root state subscription. */
export const ROOT_STATE_URI = 'agenthost:/root';
// ---- Tool output helper -----------------------------------------------------
/**
 * Extracts a plain-text tool output string from a tool call result's `content`
 * array. Joins all text-type content parts into a single string.
 *
 * Returns `undefined` if there are no text content parts.
 */
export function getToolOutputText(result) {
    if (!result.content || result.content.length === 0) {
        return undefined;
    }
    const textParts = [];
    for (const c of result.content) {
        if (hasKey(c, { type: true }) && c.type === "text" /* ToolResultContentType.Text */) {
            textParts.push(c);
        }
    }
    if (textParts.length === 0) {
        return undefined;
    }
    return textParts.map(p => p.text).join('\n');
}
// ---- Factory helpers --------------------------------------------------------
export function createRootState() {
    return {
        agents: [],
        activeSessions: 0,
    };
}
export function createSessionState(summary) {
    return {
        summary,
        lifecycle: "creating" /* SessionLifecycle.Creating */,
        turns: [],
        activeTurn: undefined,
    };
}
export function createActiveTurn(id, userMessage) {
    return {
        id,
        userMessage,
        streamingText: '',
        responseParts: [],
        toolCalls: {},
        pendingPermissions: {},
        reasoning: '',
        usage: undefined,
    };
}
//# sourceMappingURL=sessionState.js.map