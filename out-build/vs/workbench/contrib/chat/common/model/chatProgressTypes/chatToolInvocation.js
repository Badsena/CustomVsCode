/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { encodeBase64 } from '../../../../../../base/common/buffer.js';
import { observableValue } from '../../../../../../base/common/observable.js';
import { localize } from '../../../../../../nls.js';
import { IChatToolInvocation } from '../../chatService/chatService.js';
import { isToolResultOutputDetails } from '../../tools/languageModelToolsService.js';
export class ChatToolInvocation {
    get state() {
        return this._state;
    }
    /**
     * Create a tool invocation in streaming state.
     * Use this when the tool call is beginning to stream partial input from the LM.
     */
    static createStreaming(options) {
        return new ChatToolInvocation(undefined, options.toolData, options.toolCallId, options.subagentInvocationId, undefined, { startInStreaming: true }, options.chatRequestId);
    }
    /**
     * Create a tool invocation already in cancelled state.
     * Use this when a hook denies tool execution before it even starts.
     */
    static createCancelled(options, parameters, reason, reasonMessage) {
        return new ChatToolInvocation(undefined, options.toolData, options.toolCallId, options.subagentInvocationId, parameters, { startInCancelled: true, cancelReason: reason, cancelReasonMessage: reasonMessage }, options.chatRequestId);
    }
    constructor(preparedInvocation, toolData, toolCallId, subAgentInvocationId, parameters, startOptions = {}, chatRequestId) {
        this.toolCallId = toolCallId;
        this.kind = 'toolInvocation';
        this.isAttachedToThinking = false;
        this._progress = observableValue(this, { progress: 0 });
        // Streaming-related observables
        this._partialInput = observableValue(this, undefined);
        this._streamingMessage = observableValue(this, undefined);
        // For streaming invocations, use a default message until handleToolStream provides one
        let defaultMessage = '';
        if (startOptions.startInStreaming) {
            defaultMessage = toolData.displayName;
        }
        else if (startOptions.startInCancelled) {
            defaultMessage = startOptions.cancelReasonMessage ?? localize(8483, null, toolData.displayName);
        }
        this.invocationMessage = preparedInvocation?.invocationMessage ?? defaultMessage;
        this.pastTenseMessage = preparedInvocation?.pastTenseMessage;
        this.originMessage = preparedInvocation?.originMessage;
        this.confirmationMessages = preparedInvocation?.confirmationMessages;
        this.presentation = preparedInvocation?.presentation;
        this.toolSpecificData = preparedInvocation?.toolSpecificData;
        this.toolId = toolData.id;
        this.source = toolData.source;
        this.subAgentInvocationId = subAgentInvocationId;
        this.parameters = parameters;
        this.chatRequestId = chatRequestId;
        if (startOptions.startInCancelled) {
            // Start directly in cancelled state (e.g., when a hook denies execution)
            this._state = observableValue(this, {
                type: 5 /* IChatToolInvocation.StateKind.Cancelled */,
                reason: startOptions.cancelReason ?? 0 /* ToolConfirmKind.Denied */,
                reasonMessage: startOptions.cancelReasonMessage,
                parameters: this.parameters,
                confirmationMessages: this.confirmationMessages,
            });
        }
        else if (startOptions.startInStreaming) {
            // Start in streaming state
            this._state = observableValue(this, {
                type: 0 /* IChatToolInvocation.StateKind.Streaming */,
                partialInput: this._partialInput,
                streamingMessage: this._streamingMessage,
            });
        }
        else if (!this.confirmationMessages?.title) {
            this._state = observableValue(this, {
                type: 2 /* IChatToolInvocation.StateKind.Executing */,
                confirmed: { type: 1 /* ToolConfirmKind.ConfirmationNotNeeded */, reason: this.confirmationMessages?.confirmationNotNeededReason },
                progress: this._progress,
                parameters: this.parameters,
                confirmationMessages: this.confirmationMessages,
            });
        }
        else {
            this._state = observableValue(this, {
                type: 1 /* IChatToolInvocation.StateKind.WaitingForConfirmation */,
                parameters: this.parameters,
                confirmationMessages: this.confirmationMessages,
                confirm: reason => {
                    if (reason.type === 0 /* ToolConfirmKind.Denied */ || reason.type === 5 /* ToolConfirmKind.Skipped */) {
                        this._state.set({
                            type: 5 /* IChatToolInvocation.StateKind.Cancelled */,
                            reason: reason.type,
                            parameters: this.parameters,
                            confirmationMessages: this.confirmationMessages,
                        }, undefined);
                    }
                    else {
                        this._state.set({
                            type: 2 /* IChatToolInvocation.StateKind.Executing */,
                            confirmed: reason,
                            progress: this._progress,
                            parameters: this.parameters,
                            confirmationMessages: this.confirmationMessages,
                        }, undefined);
                    }
                }
            });
        }
    }
    /**
     * Update the partial input observable during streaming.
     */
    updatePartialInput(input) {
        if (this._state.get().type !== 0 /* IChatToolInvocation.StateKind.Streaming */) {
            return; // Only update in streaming state
        }
        this._partialInput.set(input, undefined);
    }
    /**
     * Update the streaming message (from handleToolStream).
     */
    updateStreamingMessage(message) {
        const state = this._state.get();
        if (state.type !== 0 /* IChatToolInvocation.StateKind.Streaming */) {
            return; // Only update in streaming state
        }
        this._streamingMessage.set(message, undefined);
    }
    /**
     * Cancel a streaming invocation directly (e.g., when preToolUse hook denies).
     * Only works when in Streaming state.
     * @returns true if the cancellation was applied, false if not in streaming state
     */
    cancelFromStreaming(reason, reasonMessage) {
        const currentState = this._state.get();
        if (currentState.type !== 0 /* IChatToolInvocation.StateKind.Streaming */) {
            return false; // Only cancel from streaming state
        }
        this._state.set({
            type: 5 /* IChatToolInvocation.StateKind.Cancelled */,
            reason: reason,
            reasonMessage: reasonMessage,
            parameters: this.parameters,
            confirmationMessages: this.confirmationMessages,
        }, undefined);
        return true;
    }
    /**
     * Transition from streaming state to prepared/executing state.
     * Called when the full tool call is ready.
     */
    transitionFromStreaming(preparedInvocation, parameters, autoConfirmed) {
        const currentState = this._state.get();
        if (currentState.type !== 0 /* IChatToolInvocation.StateKind.Streaming */) {
            return; // Only transition from streaming state
        }
        // Preserve the last streaming message if no new invocation message is provided
        const lastStreamingMessage = this._streamingMessage.get();
        if (lastStreamingMessage && !preparedInvocation?.invocationMessage) {
            this.invocationMessage = lastStreamingMessage;
        }
        // Update fields from prepared invocation
        this.parameters = parameters;
        if (preparedInvocation) {
            if (preparedInvocation.invocationMessage) {
                this.invocationMessage = preparedInvocation.invocationMessage;
            }
            this.pastTenseMessage = preparedInvocation.pastTenseMessage;
            this.confirmationMessages = preparedInvocation.confirmationMessages;
            this.presentation = preparedInvocation.presentation;
            this.toolSpecificData = preparedInvocation.toolSpecificData;
        }
        const confirm = (reason) => {
            if (reason.type === 0 /* ToolConfirmKind.Denied */ || reason.type === 5 /* ToolConfirmKind.Skipped */) {
                this._state.set({
                    type: 5 /* IChatToolInvocation.StateKind.Cancelled */,
                    reason: reason.type,
                    parameters: this.parameters,
                    confirmationMessages: this.confirmationMessages,
                }, undefined);
            }
            else {
                this._state.set({
                    type: 2 /* IChatToolInvocation.StateKind.Executing */,
                    confirmed: reason,
                    progress: this._progress,
                    parameters: this.parameters,
                    confirmationMessages: this.confirmationMessages,
                }, undefined);
            }
        };
        // Transition to the appropriate state
        if (autoConfirmed) {
            confirm(autoConfirmed);
        }
        else if (!this.confirmationMessages?.title) {
            this._state.set({
                type: 2 /* IChatToolInvocation.StateKind.Executing */,
                confirmed: { type: 1 /* ToolConfirmKind.ConfirmationNotNeeded */, reason: this.confirmationMessages?.confirmationNotNeededReason },
                progress: this._progress,
                parameters: this.parameters,
                confirmationMessages: this.confirmationMessages,
            }, undefined);
        }
        else {
            this._state.set({
                type: 1 /* IChatToolInvocation.StateKind.WaitingForConfirmation */,
                parameters: this.parameters,
                confirmationMessages: this.confirmationMessages,
                confirm,
            }, undefined);
        }
    }
    _setCompleted(result, postConfirmed) {
        if (postConfirmed && (postConfirmed.type === 0 /* ToolConfirmKind.Denied */ || postConfirmed.type === 5 /* ToolConfirmKind.Skipped */)) {
            this._state.set({
                type: 5 /* IChatToolInvocation.StateKind.Cancelled */,
                reason: postConfirmed.type,
                parameters: this.parameters,
                confirmationMessages: this.confirmationMessages,
            }, undefined);
            return;
        }
        this._state.set({
            type: 4 /* IChatToolInvocation.StateKind.Completed */,
            confirmed: IChatToolInvocation.executionConfirmedOrDenied(this) || { type: 1 /* ToolConfirmKind.ConfirmationNotNeeded */ },
            resultDetails: result?.toolResultDetails,
            postConfirmed,
            contentForModel: result?.content || [],
            parameters: this.parameters,
            confirmationMessages: this.confirmationMessages,
        }, undefined);
    }
    async didExecuteTool(result, final, checkIfResultAutoApproved) {
        if (result?.toolResultMessage) {
            this.pastTenseMessage = result.toolResultMessage;
        }
        else if (this._progress.get().message) {
            this.pastTenseMessage = this._progress.get().message;
        }
        if (this.confirmationMessages?.confirmResults && !result?.toolResultError && result?.confirmResults !== false && !final) {
            const autoApproved = await checkIfResultAutoApproved?.();
            if (autoApproved) {
                this._setCompleted(result, autoApproved);
            }
            else {
                this._state.set({
                    type: 3 /* IChatToolInvocation.StateKind.WaitingForPostApproval */,
                    confirmed: IChatToolInvocation.executionConfirmedOrDenied(this) || { type: 1 /* ToolConfirmKind.ConfirmationNotNeeded */ },
                    resultDetails: result?.toolResultDetails,
                    contentForModel: result?.content || [],
                    confirm: reason => this._setCompleted(result, reason),
                    parameters: this.parameters,
                    confirmationMessages: this.confirmationMessages,
                }, undefined);
            }
        }
        else {
            this._setCompleted(result);
        }
        return this._state.get();
    }
    acceptProgress(step) {
        const prev = this._progress.get();
        this._progress.set({
            progress: step.progress || prev.progress || 0,
            message: step.message,
        }, undefined);
    }
    toJSON() {
        // persist the serialized call as 'skipped' if we were waiting for postapproval
        const waitingForPostApproval = this.state.get().type === 3 /* IChatToolInvocation.StateKind.WaitingForPostApproval */;
        const details = waitingForPostApproval ? undefined : IChatToolInvocation.resultDetails(this);
        return {
            kind: 'toolInvocationSerialized',
            presentation: this.presentation,
            invocationMessage: this.invocationMessage,
            pastTenseMessage: this.pastTenseMessage,
            originMessage: this.originMessage,
            isConfirmed: waitingForPostApproval ? { type: 5 /* ToolConfirmKind.Skipped */ } : IChatToolInvocation.executionConfirmedOrDenied(this),
            isComplete: true,
            source: this.source,
            resultDetails: isToolResultOutputDetails(details)
                ? { output: { type: 'data', mimeType: details.output.mimeType, base64Data: encodeBase64(details.output.value) } }
                : details,
            toolSpecificData: this.toolSpecificData,
            toolCallId: this.toolCallId,
            toolId: this.toolId,
            subAgentInvocationId: this.subAgentInvocationId,
            generatedTitle: this.generatedTitle,
        };
    }
}
//# sourceMappingURL=chatToolInvocation.js.map