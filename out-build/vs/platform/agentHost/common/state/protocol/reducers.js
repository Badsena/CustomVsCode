/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { IS_CLIENT_DISPATCHABLE } from './action-origin.generated.js';
// ─── Helpers ─────────────────────────────────────────────────────────────────
/**
 * Soft assertion for exhaustiveness checking. Place in the `default` branch of
 * a switch on a discriminated union so the compiler errors when a new variant
 * is added but not handled.
 *
 * At runtime, logs a warning instead of throwing so that forward-compatible
 * clients receiving unknown actions from a newer server degrade gracefully.
 */
export function softAssertNever(value, log) {
    const msg = `Unhandled action type: ${value.type}`;
    (log ?? console.warn)(msg);
}
/** Extracts the common base fields shared by all tool call lifecycle states. */
function tcBase(tc) {
    return {
        toolCallId: tc.toolCallId,
        toolName: tc.toolName,
        displayName: tc.displayName,
        toolClientId: tc.toolClientId,
        _meta: tc._meta,
    };
}
/**
 * Ends the active turn, finalizing it into a completed turn record.
 */
function endTurn(state, turnId, turnState, summaryStatus, error) {
    if (!state.activeTurn || state.activeTurn.id !== turnId) {
        return state;
    }
    const active = state.activeTurn;
    const toolCalls = [];
    for (const tc of Object.values(active.toolCalls)) {
        if (tc.status === "completed" /* ToolCallStatus.Completed */ || tc.status === "cancelled" /* ToolCallStatus.Cancelled */) {
            toolCalls.push(tc);
        }
        else {
            // Force non-terminal tool calls into cancelled state.
            toolCalls.push({
                status: "cancelled" /* ToolCallStatus.Cancelled */,
                ...tcBase(tc),
                invocationMessage: tc.status === "streaming" /* ToolCallStatus.Streaming */ ? (tc.invocationMessage ?? '') : tc.invocationMessage,
                toolInput: tc.status === "streaming" /* ToolCallStatus.Streaming */ ? undefined : tc.toolInput,
                reason: "skipped" /* ToolCallCancellationReason.Skipped */,
            });
        }
    }
    const turn = {
        id: active.id,
        userMessage: active.userMessage,
        responseText: active.streamingText,
        responseParts: active.responseParts,
        toolCalls,
        usage: active.usage,
        state: turnState,
        error,
    };
    return {
        ...state,
        turns: [...state.turns, turn],
        activeTurn: undefined,
        summary: { ...state.summary, status: summaryStatus, modifiedAt: Date.now() },
    };
}
/**
 * Immutably updates a single tool call in the active turn's toolCalls map.
 * Returns `state` unchanged if the active turn or tool call doesn't match.
 */
function updateToolCall(state, turnId, toolCallId, updater) {
    const activeTurn = state.activeTurn;
    if (!activeTurn || activeTurn.id !== turnId) {
        return state;
    }
    const existing = activeTurn.toolCalls[toolCallId];
    if (!existing) {
        return state;
    }
    return {
        ...state,
        activeTurn: {
            ...activeTurn,
            toolCalls: {
                ...activeTurn.toolCalls,
                [toolCallId]: updater(existing),
            },
        },
    };
}
// ─── Root Reducer ────────────────────────────────────────────────────────────
/**
 * Pure reducer for root state. Handles all {@link IRootAction} variants.
 */
export function rootReducer(state, action, log) {
    switch (action.type) {
        case "root/agentsChanged" /* ActionType.RootAgentsChanged */:
            return { ...state, agents: action.agents };
        case "root/activeSessionsChanged" /* ActionType.RootActiveSessionsChanged */:
            return { ...state, activeSessions: action.activeSessions };
        default:
            softAssertNever(action, log);
            return state;
    }
}
// ─── Session Reducer ─────────────────────────────────────────────────────────
/**
 * Pure reducer for session state. Handles all {@link ISessionAction} variants.
 */
export function sessionReducer(state, action, log) {
    switch (action.type) {
        // ── Lifecycle ──────────────────────────────────────────────────────────
        case "session/ready" /* ActionType.SessionReady */:
            return {
                ...state,
                lifecycle: "ready" /* SessionLifecycle.Ready */,
                summary: { ...state.summary, status: "idle" /* SessionStatus.Idle */ },
            };
        case "session/creationFailed" /* ActionType.SessionCreationFailed */:
            return {
                ...state,
                lifecycle: "creationFailed" /* SessionLifecycle.CreationFailed */,
                creationError: action.error,
            };
        // ── Turn Lifecycle ────────────────────────────────────────────────────
        case "session/turnStarted" /* ActionType.SessionTurnStarted */:
            return {
                ...state,
                summary: { ...state.summary, status: "in-progress" /* SessionStatus.InProgress */, modifiedAt: Date.now() },
                activeTurn: {
                    id: action.turnId,
                    userMessage: action.userMessage,
                    streamingText: '',
                    responseParts: [],
                    toolCalls: {},
                    pendingPermissions: {},
                    reasoning: '',
                    usage: undefined,
                },
            };
        case "session/delta" /* ActionType.SessionDelta */:
            if (!state.activeTurn || state.activeTurn.id !== action.turnId) {
                return state;
            }
            return {
                ...state,
                activeTurn: {
                    ...state.activeTurn,
                    streamingText: state.activeTurn.streamingText + action.content,
                },
            };
        case "session/responsePart" /* ActionType.SessionResponsePart */:
            if (!state.activeTurn || state.activeTurn.id !== action.turnId) {
                return state;
            }
            return {
                ...state,
                activeTurn: {
                    ...state.activeTurn,
                    responseParts: [...state.activeTurn.responseParts, action.part],
                },
            };
        case "session/turnComplete" /* ActionType.SessionTurnComplete */:
            return endTurn(state, action.turnId, "complete" /* TurnState.Complete */, "idle" /* SessionStatus.Idle */);
        case "session/turnCancelled" /* ActionType.SessionTurnCancelled */:
            return endTurn(state, action.turnId, "cancelled" /* TurnState.Cancelled */, "idle" /* SessionStatus.Idle */);
        case "session/error" /* ActionType.SessionError */:
            return endTurn(state, action.turnId, "error" /* TurnState.Error */, "error" /* SessionStatus.Error */, action.error);
        // ── Tool Call State Machine ───────────────────────────────────────────
        case "session/toolCallStart" /* ActionType.SessionToolCallStart */:
            if (!state.activeTurn || state.activeTurn.id !== action.turnId) {
                return state;
            }
            return {
                ...state,
                activeTurn: {
                    ...state.activeTurn,
                    toolCalls: {
                        ...state.activeTurn.toolCalls,
                        [action.toolCallId]: {
                            toolCallId: action.toolCallId,
                            toolName: action.toolName,
                            displayName: action.displayName,
                            toolClientId: action.toolClientId,
                            _meta: action._meta,
                            status: "streaming" /* ToolCallStatus.Streaming */,
                        },
                    },
                },
            };
        case "session/toolCallDelta" /* ActionType.SessionToolCallDelta */:
            return updateToolCall(state, action.turnId, action.toolCallId, tc => {
                if (tc.status !== "streaming" /* ToolCallStatus.Streaming */) {
                    return tc;
                }
                return {
                    ...tc,
                    partialInput: (tc.partialInput ?? '') + action.content,
                    invocationMessage: action.invocationMessage ?? tc.invocationMessage,
                };
            });
        case "session/toolCallReady" /* ActionType.SessionToolCallReady */:
            return updateToolCall(state, action.turnId, action.toolCallId, tc => {
                const base = tcBase(tc);
                if (action.confirmed) {
                    return {
                        status: "running" /* ToolCallStatus.Running */,
                        ...base,
                        invocationMessage: action.invocationMessage,
                        toolInput: action.toolInput,
                        confirmed: action.confirmed,
                    };
                }
                return {
                    status: "pending-confirmation" /* ToolCallStatus.PendingConfirmation */,
                    ...base,
                    invocationMessage: action.invocationMessage,
                    toolInput: action.toolInput,
                };
            });
        case "session/toolCallConfirmed" /* ActionType.SessionToolCallConfirmed */:
            return updateToolCall(state, action.turnId, action.toolCallId, tc => {
                if (tc.status !== "pending-confirmation" /* ToolCallStatus.PendingConfirmation */) {
                    return tc;
                }
                const base = tcBase(tc);
                if (action.approved) {
                    return {
                        status: "running" /* ToolCallStatus.Running */,
                        ...base,
                        invocationMessage: tc.invocationMessage,
                        toolInput: tc.toolInput,
                        confirmed: action.confirmed,
                    };
                }
                return {
                    status: "cancelled" /* ToolCallStatus.Cancelled */,
                    ...base,
                    invocationMessage: tc.invocationMessage,
                    toolInput: tc.toolInput,
                    reason: action.reason,
                    reasonMessage: action.reasonMessage,
                    userSuggestion: action.userSuggestion,
                };
            });
        case "session/toolCallComplete" /* ActionType.SessionToolCallComplete */:
            return updateToolCall(state, action.turnId, action.toolCallId, tc => {
                if (tc.status !== "running" /* ToolCallStatus.Running */ && tc.status !== "pending-confirmation" /* ToolCallStatus.PendingConfirmation */) {
                    return tc;
                }
                const base = tcBase(tc);
                const confirmed = tc.status === "running" /* ToolCallStatus.Running */
                    ? tc.confirmed
                    : "not-needed" /* ToolCallConfirmationReason.NotNeeded */;
                if (action.requiresResultConfirmation) {
                    return {
                        status: "pending-result-confirmation" /* ToolCallStatus.PendingResultConfirmation */,
                        ...base,
                        invocationMessage: tc.invocationMessage,
                        toolInput: tc.toolInput,
                        confirmed,
                        ...action.result,
                    };
                }
                return {
                    status: "completed" /* ToolCallStatus.Completed */,
                    ...base,
                    invocationMessage: tc.invocationMessage,
                    toolInput: tc.toolInput,
                    confirmed,
                    ...action.result,
                };
            });
        case "session/toolCallResultConfirmed" /* ActionType.SessionToolCallResultConfirmed */:
            return updateToolCall(state, action.turnId, action.toolCallId, tc => {
                if (tc.status !== "pending-result-confirmation" /* ToolCallStatus.PendingResultConfirmation */) {
                    return tc;
                }
                const base = tcBase(tc);
                if (action.approved) {
                    return {
                        status: "completed" /* ToolCallStatus.Completed */,
                        ...base,
                        invocationMessage: tc.invocationMessage,
                        toolInput: tc.toolInput,
                        confirmed: tc.confirmed,
                        success: tc.success,
                        pastTenseMessage: tc.pastTenseMessage,
                        content: tc.content,
                        structuredContent: tc.structuredContent,
                        error: tc.error,
                    };
                }
                return {
                    status: "cancelled" /* ToolCallStatus.Cancelled */,
                    ...base,
                    invocationMessage: tc.invocationMessage,
                    toolInput: tc.toolInput,
                    reason: "result-denied" /* ToolCallCancellationReason.ResultDenied */,
                };
            });
        // ── Permissions ───────────────────────────────────────────────────────
        case "session/permissionRequest" /* ActionType.SessionPermissionRequest */: {
            if (!state.activeTurn || state.activeTurn.id !== action.turnId) {
                return state;
            }
            const pendingPermissions = {
                ...state.activeTurn.pendingPermissions,
                [action.request.requestId]: action.request,
            };
            // If the permission is tied to a tool call, transition it to pending-confirmation
            let toolCalls = state.activeTurn.toolCalls;
            if (action.request.toolCallId) {
                const tc = toolCalls[action.request.toolCallId];
                if (tc && (tc.status === "running" /* ToolCallStatus.Running */ || tc.status === "streaming" /* ToolCallStatus.Streaming */)) {
                    toolCalls = {
                        ...toolCalls,
                        [action.request.toolCallId]: {
                            ...tc,
                            status: "pending-confirmation" /* ToolCallStatus.PendingConfirmation */,
                            invocationMessage: tc.invocationMessage ?? '',
                        },
                    };
                }
            }
            return {
                ...state,
                activeTurn: { ...state.activeTurn, pendingPermissions, toolCalls },
            };
        }
        case "session/permissionResolved" /* ActionType.SessionPermissionResolved */: {
            if (!state.activeTurn || state.activeTurn.id !== action.turnId) {
                return state;
            }
            const resolved = state.activeTurn.pendingPermissions[action.requestId];
            const { [action.requestId]: _, ...pendingPermissions } = state.activeTurn.pendingPermissions;
            // If the permission was tied to a tool call, transition it based on approval
            let toolCalls = state.activeTurn.toolCalls;
            if (resolved?.toolCallId) {
                const tc = toolCalls[resolved.toolCallId];
                if (tc && tc.status === "pending-confirmation" /* ToolCallStatus.PendingConfirmation */) {
                    const base = tcBase(tc);
                    const updated = action.approved
                        ? {
                            status: "running" /* ToolCallStatus.Running */,
                            ...base,
                            invocationMessage: tc.invocationMessage,
                            toolInput: tc.toolInput,
                            confirmed: "user-action" /* ToolCallConfirmationReason.UserAction */,
                        }
                        : {
                            status: "cancelled" /* ToolCallStatus.Cancelled */,
                            ...base,
                            invocationMessage: tc.invocationMessage,
                            toolInput: tc.toolInput,
                            reason: "denied" /* ToolCallCancellationReason.Denied */,
                        };
                    toolCalls = { ...toolCalls, [resolved.toolCallId]: updated };
                }
            }
            return {
                ...state,
                activeTurn: { ...state.activeTurn, pendingPermissions, toolCalls },
            };
        }
        // ── Metadata ──────────────────────────────────────────────────────────
        case "session/titleChanged" /* ActionType.SessionTitleChanged */:
            return {
                ...state,
                summary: { ...state.summary, title: action.title, modifiedAt: Date.now() },
            };
        case "session/usage" /* ActionType.SessionUsage */:
            if (!state.activeTurn || state.activeTurn.id !== action.turnId) {
                return state;
            }
            return {
                ...state,
                activeTurn: { ...state.activeTurn, usage: action.usage },
            };
        case "session/reasoning" /* ActionType.SessionReasoning */:
            if (!state.activeTurn || state.activeTurn.id !== action.turnId) {
                return state;
            }
            return {
                ...state,
                activeTurn: {
                    ...state.activeTurn,
                    reasoning: state.activeTurn.reasoning + action.content,
                },
            };
        case "session/modelChanged" /* ActionType.SessionModelChanged */:
            return {
                ...state,
                summary: { ...state.summary, model: action.model, modifiedAt: Date.now() },
            };
        case "session/serverToolsChanged" /* ActionType.SessionServerToolsChanged */:
            return { ...state, serverTools: action.tools };
        case "session/activeClientChanged" /* ActionType.SessionActiveClientChanged */:
            return {
                ...state,
                activeClient: action.activeClient ?? undefined,
            };
        case "session/activeClientToolsChanged" /* ActionType.SessionActiveClientToolsChanged */:
            if (!state.activeClient) {
                return state;
            }
            return {
                ...state,
                activeClient: { ...state.activeClient, tools: action.tools },
            };
        default:
            softAssertNever(action, log);
            return state;
    }
}
// ─── Dispatch Validation ─────────────────────────────────────────────────────
/**
 * Type guard that checks whether an action may be dispatched by a client.
 *
 * Servers SHOULD call this to validate incoming `dispatchAction` requests
 * and reject any action the client is not allowed to originate.
 */
export function isClientDispatchable(action) {
    return IS_CLIENT_DISPATCHABLE[action.type];
}
//# sourceMappingURL=reducers.js.map