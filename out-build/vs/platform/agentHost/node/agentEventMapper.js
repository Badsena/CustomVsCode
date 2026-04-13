/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
/**
 * Maps a flat {@link IAgentProgressEvent} from the agent host into
 * protocol {@link ISessionAction}(s) suitable for dispatch to the reducer.
 *
 * Returns `undefined` for events that have no corresponding action.
 * May return an array when a single SDK event maps to multiple protocol actions
 * (e.g. `tool_start` → `toolCallStart` + `toolCallReady`).
 */
export function mapProgressEventToActions(event, session, turnId) {
    switch (event.type) {
        case 'delta':
            return {
                type: "session/delta" /* ActionType.SessionDelta */,
                session,
                turnId,
                content: event.content,
            };
        case 'tool_start': {
            // The Copilot SDK provides full parameters at tool_start time.
            // We emit both toolCallStart (streaming → created) and toolCallReady
            // (params complete → running with auto-confirm) as a pair.
            const e = event;
            const startAction = {
                type: "session/toolCallStart" /* ActionType.SessionToolCallStart */,
                session,
                turnId,
                toolCallId: e.toolCallId,
                toolName: e.toolName,
                displayName: e.displayName,
                _meta: { toolKind: e.toolKind, language: e.language },
            };
            const readyAction = {
                type: "session/toolCallReady" /* ActionType.SessionToolCallReady */,
                session,
                turnId,
                toolCallId: e.toolCallId,
                invocationMessage: e.invocationMessage,
                toolInput: e.toolInput,
                confirmed: "not-needed" /* ToolCallConfirmationReason.NotNeeded */,
            };
            return [startAction, readyAction];
        }
        case 'tool_complete': {
            const e = event;
            return {
                type: "session/toolCallComplete" /* ActionType.SessionToolCallComplete */,
                session,
                turnId,
                toolCallId: e.toolCallId,
                result: {
                    success: e.success,
                    pastTenseMessage: e.pastTenseMessage,
                    content: e.toolOutput !== undefined ? [{ type: "text" /* ToolResultContentType.Text */, text: e.toolOutput }] : undefined,
                    error: e.error,
                },
            };
        }
        case 'idle':
            return {
                type: "session/turnComplete" /* ActionType.SessionTurnComplete */,
                session,
                turnId,
            };
        case 'error': {
            const e = event;
            return {
                type: "session/error" /* ActionType.SessionError */,
                session,
                turnId,
                error: {
                    errorType: e.errorType,
                    message: e.message,
                    stack: e.stack,
                },
            };
        }
        case 'usage': {
            const e = event;
            return {
                type: "session/usage" /* ActionType.SessionUsage */,
                session,
                turnId,
                usage: {
                    inputTokens: e.inputTokens,
                    outputTokens: e.outputTokens,
                    model: e.model,
                    cacheReadTokens: e.cacheReadTokens,
                },
            };
        }
        case 'title_changed':
            return {
                type: "session/titleChanged" /* ActionType.SessionTitleChanged */,
                session,
                title: event.title,
            };
        case 'permission_request': {
            const e = event;
            return {
                type: "session/permissionRequest" /* ActionType.SessionPermissionRequest */,
                session,
                turnId,
                request: {
                    requestId: e.requestId,
                    permissionKind: e.permissionKind,
                    toolCallId: e.toolCallId,
                    path: e.path,
                    fullCommandText: e.fullCommandText,
                    intention: e.intention,
                    serverName: e.serverName,
                    toolName: e.toolName,
                    rawRequest: e.rawRequest,
                },
            };
        }
        case 'reasoning':
            return {
                type: "session/reasoning" /* ActionType.SessionReasoning */,
                session,
                turnId,
                content: event.content,
            };
        case 'message':
            return undefined;
        default:
            return undefined;
    }
}
//# sourceMappingURL=agentEventMapper.js.map