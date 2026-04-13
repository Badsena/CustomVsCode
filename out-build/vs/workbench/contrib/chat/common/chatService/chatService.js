/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { DisposableStore } from '../../../../../base/common/lifecycle.js';
import { autorun, autorunSelfDisposable } from '../../../../../base/common/observable.js';
import { hasKey } from '../../../../../base/common/types.js';
import { URI } from '../../../../../base/common/uri.js';
import { Range } from '../../../../../editor/common/core/range.js';
import { createDecorator } from '../../../../../platform/instantiation/common/instantiation.js';
export var ChatErrorLevel;
(function (ChatErrorLevel) {
    ChatErrorLevel[ChatErrorLevel["Info"] = 0] = "Info";
    ChatErrorLevel[ChatErrorLevel["Warning"] = 1] = "Warning";
    ChatErrorLevel[ChatErrorLevel["Error"] = 2] = "Error";
})(ChatErrorLevel || (ChatErrorLevel = {}));
export function isIDocumentContext(obj) {
    return (!!obj &&
        typeof obj === 'object' &&
        'uri' in obj && obj.uri instanceof URI &&
        'version' in obj && typeof obj.version === 'number' &&
        'ranges' in obj && Array.isArray(obj.ranges) && obj.ranges.every(Range.isIRange));
}
export function isIUsedContext(obj) {
    return (!!obj &&
        typeof obj === 'object' &&
        'documents' in obj &&
        Array.isArray(obj.documents) &&
        obj.documents.every(isIDocumentContext));
}
export function isChatContentVariableReference(obj) {
    return !!obj &&
        typeof obj === 'object' &&
        typeof obj.variableName === 'string';
}
export var ChatResponseReferencePartStatusKind;
(function (ChatResponseReferencePartStatusKind) {
    ChatResponseReferencePartStatusKind[ChatResponseReferencePartStatusKind["Complete"] = 1] = "Complete";
    ChatResponseReferencePartStatusKind[ChatResponseReferencePartStatusKind["Partial"] = 2] = "Partial";
    ChatResponseReferencePartStatusKind[ChatResponseReferencePartStatusKind["Omitted"] = 3] = "Omitted";
})(ChatResponseReferencePartStatusKind || (ChatResponseReferencePartStatusKind = {}));
export var ChatResponseClearToPreviousToolInvocationReason;
(function (ChatResponseClearToPreviousToolInvocationReason) {
    ChatResponseClearToPreviousToolInvocationReason[ChatResponseClearToPreviousToolInvocationReason["NoReason"] = 0] = "NoReason";
    ChatResponseClearToPreviousToolInvocationReason[ChatResponseClearToPreviousToolInvocationReason["FilteredContentRetry"] = 1] = "FilteredContentRetry";
    ChatResponseClearToPreviousToolInvocationReason[ChatResponseClearToPreviousToolInvocationReason["CopyrightContentRetry"] = 2] = "CopyrightContentRetry";
})(ChatResponseClearToPreviousToolInvocationReason || (ChatResponseClearToPreviousToolInvocationReason = {}));
export class ChatMultiDiffData {
    constructor(opts) {
        this.kind = 'multiDiffData';
        this.readOnly = opts.readOnly;
        this.collapsed = opts.collapsed;
        this.multiDiffData = opts.multiDiffData;
    }
    toJSON() {
        return {
            kind: this.kind,
            multiDiffData: hasKey(this.multiDiffData, { title: true }) ? this.multiDiffData : this.multiDiffData.get(),
            collapsed: this.collapsed,
            readOnly: this.readOnly,
        };
    }
}
export var ElicitationState;
(function (ElicitationState) {
    ElicitationState["Pending"] = "pending";
    ElicitationState["Accepted"] = "accepted";
    ElicitationState["Rejected"] = "rejected";
})(ElicitationState || (ElicitationState = {}));
export function isLegacyChatTerminalToolInvocationData(data) {
    return !!data && typeof data === 'object' && 'command' in data && 'language' in data;
}
export var ToolConfirmKind;
(function (ToolConfirmKind) {
    ToolConfirmKind[ToolConfirmKind["Denied"] = 0] = "Denied";
    ToolConfirmKind[ToolConfirmKind["ConfirmationNotNeeded"] = 1] = "ConfirmationNotNeeded";
    ToolConfirmKind[ToolConfirmKind["Setting"] = 2] = "Setting";
    ToolConfirmKind[ToolConfirmKind["LmServicePerTool"] = 3] = "LmServicePerTool";
    ToolConfirmKind[ToolConfirmKind["UserAction"] = 4] = "UserAction";
    ToolConfirmKind[ToolConfirmKind["Skipped"] = 5] = "Skipped";
})(ToolConfirmKind || (ToolConfirmKind = {}));
export var IChatToolInvocation;
(function (IChatToolInvocation) {
    let StateKind;
    (function (StateKind) {
        /** Tool call is streaming partial input from the LM */
        StateKind[StateKind["Streaming"] = 0] = "Streaming";
        StateKind[StateKind["WaitingForConfirmation"] = 1] = "WaitingForConfirmation";
        StateKind[StateKind["Executing"] = 2] = "Executing";
        StateKind[StateKind["WaitingForPostApproval"] = 3] = "WaitingForPostApproval";
        StateKind[StateKind["Completed"] = 4] = "Completed";
        StateKind[StateKind["Cancelled"] = 5] = "Cancelled";
    })(StateKind = IChatToolInvocation.StateKind || (IChatToolInvocation.StateKind = {}));
    function executionConfirmedOrDenied(invocation, reader) {
        if (invocation.kind === 'toolInvocationSerialized') {
            if (invocation.isConfirmed === undefined || typeof invocation.isConfirmed === 'boolean') {
                return { type: invocation.isConfirmed ? 4 /* ToolConfirmKind.UserAction */ : 0 /* ToolConfirmKind.Denied */ };
            }
            return invocation.isConfirmed;
        }
        const state = invocation.state.read(reader);
        if (state.type === 0 /* StateKind.Streaming */ || state.type === 1 /* StateKind.WaitingForConfirmation */) {
            return undefined; // don't know yet
        }
        if (state.type === 5 /* StateKind.Cancelled */) {
            return { type: state.reason };
        }
        return state.confirmed;
    }
    IChatToolInvocation.executionConfirmedOrDenied = executionConfirmedOrDenied;
    function awaitConfirmation(invocation, token) {
        const reason = executionConfirmedOrDenied(invocation);
        if (reason) {
            return Promise.resolve(reason);
        }
        const store = new DisposableStore();
        return new Promise(resolve => {
            if (token) {
                store.add(token.onCancellationRequested(() => {
                    resolve({ type: 0 /* ToolConfirmKind.Denied */ });
                }));
            }
            store.add(autorun(reader => {
                const reason = executionConfirmedOrDenied(invocation, reader);
                if (reason) {
                    store.dispose();
                    resolve(reason);
                }
            }));
        }).finally(() => {
            store.dispose();
        });
    }
    IChatToolInvocation.awaitConfirmation = awaitConfirmation;
    function postApprovalConfirmedOrDenied(invocation, reader) {
        const state = invocation.state.read(reader);
        if (state.type === 4 /* StateKind.Completed */) {
            return state.postConfirmed || { type: 1 /* ToolConfirmKind.ConfirmationNotNeeded */ };
        }
        if (state.type === 5 /* StateKind.Cancelled */) {
            return { type: state.reason };
        }
        return undefined;
    }
    function confirmWith(invocation, reason) {
        const state = invocation?.state.get();
        if (state?.type === 1 /* StateKind.WaitingForConfirmation */ || state?.type === 3 /* StateKind.WaitingForPostApproval */) {
            state.confirm(reason);
            return true;
        }
        return false;
    }
    IChatToolInvocation.confirmWith = confirmWith;
    function awaitPostConfirmation(invocation, token) {
        const reason = postApprovalConfirmedOrDenied(invocation);
        if (reason) {
            return Promise.resolve(reason);
        }
        const store = new DisposableStore();
        return new Promise(resolve => {
            if (token) {
                store.add(token.onCancellationRequested(() => {
                    resolve({ type: 0 /* ToolConfirmKind.Denied */ });
                }));
            }
            store.add(autorun(reader => {
                const reason = postApprovalConfirmedOrDenied(invocation, reader);
                if (reason) {
                    store.dispose();
                    resolve(reason);
                }
            }));
        }).finally(() => {
            store.dispose();
        });
    }
    IChatToolInvocation.awaitPostConfirmation = awaitPostConfirmation;
    function resultDetails(invocation, reader) {
        if (invocation.kind === 'toolInvocationSerialized') {
            return invocation.resultDetails;
        }
        const state = invocation.state.read(reader);
        if (state.type === 4 /* StateKind.Completed */ || state.type === 3 /* StateKind.WaitingForPostApproval */) {
            return state.resultDetails;
        }
        return undefined;
    }
    IChatToolInvocation.resultDetails = resultDetails;
    function isComplete(invocation, reader) {
        if (invocation.kind === 'toolInvocationSerialized') {
            return true; // always cancelled or complete
        }
        const state = invocation.state.read(reader);
        return state.type === 4 /* StateKind.Completed */ || state.type === 5 /* StateKind.Cancelled */;
    }
    IChatToolInvocation.isComplete = isComplete;
    function isStreaming(invocation, reader) {
        if (invocation.kind === 'toolInvocationSerialized') {
            return false;
        }
        const state = invocation.state.read(reader);
        return state.type === 0 /* StateKind.Streaming */;
    }
    IChatToolInvocation.isStreaming = isStreaming;
    /**
     * Get parameters from invocation. Returns undefined during streaming state.
     */
    function getParameters(invocation, reader) {
        if (invocation.kind === 'toolInvocationSerialized') {
            return undefined; // serialized invocations don't store parameters
        }
        const state = invocation.state.read(reader);
        if (state.type === 0 /* StateKind.Streaming */) {
            return undefined;
        }
        return state.parameters;
    }
    IChatToolInvocation.getParameters = getParameters;
    /**
     * Get confirmation messages from invocation. Returns undefined during streaming state.
     */
    function getConfirmationMessages(invocation, reader) {
        if (invocation.kind === 'toolInvocationSerialized') {
            return undefined; // serialized invocations don't store confirmation messages
        }
        const state = invocation.state.read(reader);
        if (state.type === 0 /* StateKind.Streaming */) {
            return undefined;
        }
        return state.confirmationMessages;
    }
    IChatToolInvocation.getConfirmationMessages = getConfirmationMessages;
})(IChatToolInvocation || (IChatToolInvocation = {}));
export class ChatMcpServersStarting {
    get isEmpty() {
        const s = this.state.get();
        return !s.working && s.serversRequiringInteraction.length === 0;
    }
    constructor(state) {
        this.state = state;
        this.kind = 'mcpServersStarting';
        this.didStartServerIds = [];
    }
    wait() {
        return new Promise(resolve => {
            autorunSelfDisposable(reader => {
                const s = this.state.read(reader);
                if (!s.working) {
                    reader.dispose();
                    resolve(s);
                }
            });
        });
    }
    toJSON() {
        return { kind: 'mcpServersStarting', didStartServerIds: this.didStartServerIds };
    }
}
export function isChatFollowup(obj) {
    return (!!obj &&
        obj.kind === 'reply' &&
        typeof obj.message === 'string' &&
        typeof obj.agentId === 'string');
}
export var ChatAgentVoteDirection;
(function (ChatAgentVoteDirection) {
    ChatAgentVoteDirection[ChatAgentVoteDirection["Down"] = 0] = "Down";
    ChatAgentVoteDirection[ChatAgentVoteDirection["Up"] = 1] = "Up";
})(ChatAgentVoteDirection || (ChatAgentVoteDirection = {}));
export var ChatAgentVoteDownReason;
(function (ChatAgentVoteDownReason) {
    ChatAgentVoteDownReason["IncorrectCode"] = "incorrectCode";
    ChatAgentVoteDownReason["DidNotFollowInstructions"] = "didNotFollowInstructions";
    ChatAgentVoteDownReason["IncompleteCode"] = "incompleteCode";
    ChatAgentVoteDownReason["MissingContext"] = "missingContext";
    ChatAgentVoteDownReason["PoorlyWrittenOrFormatted"] = "poorlyWrittenOrFormatted";
    ChatAgentVoteDownReason["RefusedAValidRequest"] = "refusedAValidRequest";
    ChatAgentVoteDownReason["OffensiveOrUnsafe"] = "offensiveOrUnsafe";
    ChatAgentVoteDownReason["Other"] = "other";
    ChatAgentVoteDownReason["WillReportIssue"] = "willReportIssue";
})(ChatAgentVoteDownReason || (ChatAgentVoteDownReason = {}));
export var ChatCopyKind;
(function (ChatCopyKind) {
    // Keyboard shortcut or context menu
    ChatCopyKind[ChatCopyKind["Action"] = 1] = "Action";
    ChatCopyKind[ChatCopyKind["Toolbar"] = 2] = "Toolbar";
})(ChatCopyKind || (ChatCopyKind = {}));
export function convertLegacyChatSessionTiming(timing) {
    if (hasKey(timing, { created: true })) {
        return timing;
    }
    return {
        created: timing.startTime,
        lastRequestStarted: timing.startTime,
        lastRequestEnded: timing.endTime,
    };
}
export var ResponseModelState;
(function (ResponseModelState) {
    ResponseModelState[ResponseModelState["Pending"] = 0] = "Pending";
    ResponseModelState[ResponseModelState["Complete"] = 1] = "Complete";
    ResponseModelState[ResponseModelState["Cancelled"] = 2] = "Cancelled";
    ResponseModelState[ResponseModelState["Failed"] = 3] = "Failed";
    ResponseModelState[ResponseModelState["NeedsInput"] = 4] = "NeedsInput";
})(ResponseModelState || (ResponseModelState = {}));
export var ChatSendResult;
(function (ChatSendResult) {
    function isSent(result) {
        return result.kind === 'sent';
    }
    ChatSendResult.isSent = isSent;
    function isRejected(result) {
        return result.kind === 'rejected';
    }
    ChatSendResult.isRejected = isRejected;
    function isQueued(result) {
        return result.kind === 'queued';
    }
    ChatSendResult.isQueued = isQueued;
    /** Assertion function for tests - asserts that the result is a sent result */
    function assertSent(result) {
        if (result.kind !== 'sent') {
            throw new Error(`Expected ChatSendResult to be 'sent', but was '${result.kind}'`);
        }
    }
    ChatSendResult.assertSent = assertSent;
})(ChatSendResult || (ChatSendResult = {}));
/**
 * The kind of queue request.
 */
export var ChatRequestQueueKind;
(function (ChatRequestQueueKind) {
    /** Request is queued to be sent after current request completes */
    ChatRequestQueueKind["Queued"] = "queued";
    /** Request is queued and signals the active request to yield */
    ChatRequestQueueKind["Steering"] = "steering";
})(ChatRequestQueueKind || (ChatRequestQueueKind = {}));
export const IChatService = createDecorator('IChatService');
export const KEYWORD_ACTIVIATION_SETTING_ID = 'accessibility.voice.keywordActivation';
export const ChatStopCancellationNoopEventName = 'chat.stopCancellationNoop';
export const ChatPendingRequestChangeEventName = 'chat.pendingRequestChange';
//# sourceMappingURL=chatService.js.map