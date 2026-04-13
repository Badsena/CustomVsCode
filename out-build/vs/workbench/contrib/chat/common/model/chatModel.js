/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var ChatModel_1;
import { asArray } from '../../../../../base/common/arrays.js';
import { softAssertNever } from '../../../../../base/common/assert.js';
import { VSBuffer, decodeHex, encodeHex } from '../../../../../base/common/buffer.js';
import { BugIndicatingError } from '../../../../../base/common/errors.js';
import { Emitter } from '../../../../../base/common/event.js';
import { MarkdownString, isMarkdownString } from '../../../../../base/common/htmlContent.js';
import { Disposable, MutableDisposable } from '../../../../../base/common/lifecycle.js';
import { ResourceMap } from '../../../../../base/common/map.js';
import { revive } from '../../../../../base/common/marshalling.js';
import { Schemas } from '../../../../../base/common/network.js';
import { equals } from '../../../../../base/common/objects.js';
import { autorun, autorunSelfDisposable, constObservable, derived, observableFromEvent, observableSignalFromEvent, observableValue, observableValueOpts } from '../../../../../base/common/observable.js';
import { basename, isEqual } from '../../../../../base/common/resources.js';
import { hasKey } from '../../../../../base/common/types.js';
import { URI } from '../../../../../base/common/uri.js';
import { generateUuid } from '../../../../../base/common/uuid.js';
import { OffsetRange } from '../../../../../editor/common/core/ranges/offsetRange.js';
import { localize } from '../../../../../nls.js';
import { ILogService } from '../../../../../platform/log/common/log.js';
import { CellUri } from '../../../notebook/common/notebookCommon.js';
import { IChatRequestVariableEntry, isImplicitVariableEntry, isStringImplicitContextValue, isStringVariableEntry } from '../attachments/chatVariableEntries.js';
import { migrateLegacyTerminalToolSpecificData } from '../chat.js';
import { ChatResponseClearToPreviousToolInvocationReason, IChatService, IChatToolInvocation, isIUsedContext } from '../chatService/chatService.js';
import { ChatAgentLocation, ChatModeKind } from '../constants.js';
import { ChatToolInvocation } from './chatProgressTypes/chatToolInvocation.js';
import { ToolDataSource } from '../tools/languageModelToolsService.js';
import { IChatEditingService } from '../editing/chatEditingService.js';
import { IChatAgentService, reviveSerializedAgent } from '../participants/chatAgents.js';
import { ChatRequestTextPart, reviveParsedChatRequest } from '../requestParser/chatParserTypes.js';
import { chatSessionResourceToId, LocalChatSessionUri } from './chatUri.js';
export const CHAT_ATTACHABLE_IMAGE_MIME_TYPES = {
    png: 'image/png',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    gif: 'image/gif',
    webp: 'image/webp',
};
export function getAttachableImageExtension(mimeType) {
    return Object.entries(CHAT_ATTACHABLE_IMAGE_MIME_TYPES).find(([_, value]) => value === mimeType)?.[0];
}
export var IChatRequestVariableData;
(function (IChatRequestVariableData) {
    function toExport(data) {
        return { variables: data.variables.map(IChatRequestVariableEntry.toExport) };
    }
    IChatRequestVariableData.toExport = toExport;
})(IChatRequestVariableData || (IChatRequestVariableData = {}));
export function isCellTextEditOperation(value) {
    const candidate = value;
    return !!candidate && !!candidate.edit && !!candidate.uri && URI.isUri(candidate.uri);
}
export function isCellTextEditOperationArray(value) {
    return value.some(isCellTextEditOperation);
}
const nonHistoryKinds = new Set(['toolInvocation', 'toolInvocationSerialized', 'undoStop']);
function isChatProgressHistoryResponseContent(content) {
    return !nonHistoryKinds.has(content.kind);
}
export function toChatHistoryContent(content) {
    return content.filter(isChatProgressHistoryResponseContent);
}
export const defaultChatResponseModelChangeReason = { reason: 'other' };
export class ChatRequestModel {
    get shouldBeBlocked() {
        return this._shouldBeBlocked;
    }
    setShouldBeBlocked(value) {
        this._shouldBeBlocked.set(value, undefined);
    }
    get session() {
        return this._session;
    }
    get attempt() {
        return this._attempt;
    }
    get variableData() {
        return this._variableData;
    }
    set variableData(v) {
        this._version++;
        this._variableData = v;
    }
    get confirmation() {
        return this._confirmation;
    }
    get locationData() {
        return this._locationData;
    }
    get attachedContext() {
        return this._attachedContext;
    }
    get editedFileEvents() {
        return this._editedFileEvents;
    }
    get version() {
        return this._version;
    }
    constructor(params) {
        this._shouldBeBlocked = observableValue(this, false);
        this._version = 0;
        this._session = params.session;
        this.message = params.message;
        this._variableData = params.variableData;
        this.timestamp = params.timestamp;
        this._attempt = params.attempt ?? 0;
        this.modeInfo = params.modeInfo;
        this._confirmation = params.confirmation;
        this._locationData = params.locationData;
        this._attachedContext = params.attachedContext;
        this.isCompleteAddedRequest = params.isCompleteAddedRequest ?? false;
        this.modelId = params.modelId;
        this.id = params.restoredId ?? 'request_' + generateUuid();
        this._editedFileEvents = params.editedFileEvents;
        this.userSelectedTools = params.userSelectedTools;
    }
    adoptTo(session) {
        this._session = session;
    }
}
class AbstractResponse {
    get value() {
        return this._responseParts;
    }
    constructor(value) {
        this._responseParts = value;
    }
    toString() {
        if (this._responseRepr === undefined) {
            this._responseRepr = this.computeRepr();
        }
        return this._responseRepr;
    }
    /**
     * _Just_ the content of markdown parts in the response
     */
    getMarkdown() {
        if (this._markdownContent === undefined) {
            this._markdownContent = this.computeMarkdownContent();
        }
        return this._markdownContent;
    }
    /**
     * Invalidate cached representations so they are recomputed on next access.
     */
    _invalidateRepr() {
        this._responseRepr = undefined;
        this._markdownContent = undefined;
    }
    computeMarkdownContent() {
        const segments = [];
        for (const part of this._responseParts) {
            if (part.kind === 'inlineReference') {
                segments.push(this.inlineRefToRepr(part));
            }
            else if (part.kind === 'markdownContent' || part.kind === 'markdownVuln') {
                if (part.content.value.length > 0) {
                    segments.push(part.content.value);
                }
            }
        }
        return segments.join('');
    }
    computeRepr() {
        return this.partsToRepr(this._responseParts);
    }
    partsToRepr(parts) {
        const blocks = [];
        let currentBlockSegments = [];
        let hasEditGroupsAfterLastClear = false;
        for (const part of parts) {
            let segment;
            switch (part.kind) {
                case 'clearToPreviousToolInvocation':
                    currentBlockSegments = [];
                    blocks.length = 0;
                    hasEditGroupsAfterLastClear = false; // Reset edit groups flag when clearing
                    continue;
                case 'treeData':
                case 'progressMessage':
                case 'codeblockUri':
                case 'extensions':
                case 'pullRequest':
                case 'undoStop':
                case 'workspaceEdit':
                case 'elicitation2':
                case 'elicitationSerialized':
                case 'thinking':
                case 'hook':
                case 'multiDiffData':
                case 'mcpServersStarting':
                case 'questionCarousel':
                case 'disabledClaudeHooks':
                    // Ignore
                    continue;
                case 'toolInvocation':
                case 'toolInvocationSerialized':
                    // Include tool invocations in the copy text
                    segment = this.getToolInvocationText(part);
                    break;
                case 'inlineReference':
                    segment = { text: this.inlineRefToRepr(part) };
                    break;
                case 'command':
                    segment = { text: part.command.title, isBlock: true };
                    break;
                case 'textEditGroup':
                case 'notebookEditGroup':
                    // Mark that we have edit groups after the last clear
                    hasEditGroupsAfterLastClear = true;
                    // Skip individual edit groups to avoid duplication
                    continue;
                case 'confirmation':
                    if (part.message instanceof MarkdownString) {
                        segment = { text: `${part.title}\n${part.message.value}`, isBlock: true };
                        break;
                    }
                    segment = { text: `${part.title}\n${part.message}`, isBlock: true };
                    break;
                case 'markdownContent':
                case 'markdownVuln':
                case 'progressTask':
                case 'progressTaskSerialized':
                case 'warning':
                    segment = { text: part.content.value };
                    break;
                default:
                    // Ignore any unknown/obsolete parts, but assert that all are handled:
                    softAssertNever(part);
                    continue;
            }
            if (segment.isBlock) {
                if (currentBlockSegments.length) {
                    blocks.push(currentBlockSegments.join(''));
                    currentBlockSegments = [];
                }
                blocks.push(segment.text);
            }
            else {
                currentBlockSegments.push(segment.text);
            }
        }
        if (currentBlockSegments.length) {
            blocks.push(currentBlockSegments.join(''));
        }
        // Add consolidated edit summary at the end if there were any edit groups after the last clear
        if (hasEditGroupsAfterLastClear) {
            blocks.push(localize(8476, null));
        }
        return blocks.join('\n\n');
    }
    inlineRefToRepr(part) {
        if ('uri' in part.inlineReference) {
            return this.uriToRepr(part.inlineReference.uri);
        }
        return 'name' in part.inlineReference
            ? '`' + part.inlineReference.name + '`'
            : this.uriToRepr(part.inlineReference);
    }
    getToolInvocationText(toolInvocation) {
        // Extract the message and input details
        let message = '';
        let input = '';
        if (toolInvocation.pastTenseMessage) {
            message = typeof toolInvocation.pastTenseMessage === 'string'
                ? toolInvocation.pastTenseMessage
                : toolInvocation.pastTenseMessage.value;
        }
        else {
            message = typeof toolInvocation.invocationMessage === 'string'
                ? toolInvocation.invocationMessage
                : toolInvocation.invocationMessage.value;
        }
        // Handle different types of tool invocations
        if (toolInvocation.toolSpecificData) {
            if (toolInvocation.toolSpecificData.kind === 'terminal') {
                message = 'Ran terminal command';
                const terminalData = migrateLegacyTerminalToolSpecificData(toolInvocation.toolSpecificData);
                input = terminalData.commandLine.userEdited ?? terminalData.commandLine.toolEdited ?? terminalData.commandLine.original;
            }
        }
        // Format the tool invocation text
        let text = message;
        if (input) {
            text += `: ${input}`;
        }
        // For completed tool invocations, also include the result details if available
        if (toolInvocation.kind === 'toolInvocationSerialized' || (toolInvocation.kind === 'toolInvocation' && IChatToolInvocation.isComplete(toolInvocation))) {
            const resultDetails = IChatToolInvocation.resultDetails(toolInvocation);
            if (resultDetails && 'input' in resultDetails) {
                const resultPrefix = toolInvocation.kind === 'toolInvocationSerialized' || IChatToolInvocation.isComplete(toolInvocation) ? 'Completed' : 'Errored';
                text += `\n${resultPrefix} with input: ${resultDetails.input}`;
            }
        }
        return { text, isBlock: true };
    }
    uriToRepr(uri) {
        if (uri.scheme === Schemas.http || uri.scheme === Schemas.https) {
            return uri.toString(false);
        }
        return basename(uri);
    }
}
/** A view of a subset of a response */
class ResponseView extends AbstractResponse {
    constructor(_response, undoStop) {
        let idx = _response.value.findIndex(v => v.kind === 'undoStop' && v.id === undoStop);
        // Undo stops are inserted before `codeblockUri`'s, which are preceeded by a
        // markdownContent containing the opening code fence. Adjust the index
        // backwards to avoid a buggy response if it looked like this happened.
        if (_response.value[idx + 1]?.kind === 'codeblockUri' && _response.value[idx - 1]?.kind === 'markdownContent') {
            idx--;
        }
        super(idx === -1 ? _response.value.slice() : _response.value.slice(0, idx));
        this.undoStop = undoStop;
    }
}
export class Response extends AbstractResponse {
    get onDidChangeValue() {
        return this._onDidChangeValue.event;
    }
    constructor(value) {
        super(asArray(value).map((v) => ('kind' in v ? v :
            isMarkdownString(v) ? { content: v, kind: 'markdownContent' } :
                { kind: 'treeData', treeData: v })));
        this._onDidChangeValue = new Emitter();
        this._citations = [];
    }
    dispose() {
        this._onDidChangeValue.dispose();
    }
    clear() {
        this._responseParts = [];
        this._contentChanged(true);
    }
    clearToPreviousToolInvocation(message) {
        // look through the response parts and find the last tool invocation, then slice the response parts to that point
        let lastToolInvocationIndex = -1;
        for (let i = this._responseParts.length - 1; i >= 0; i--) {
            const part = this._responseParts[i];
            if (part.kind === 'toolInvocation' || part.kind === 'toolInvocationSerialized') {
                lastToolInvocationIndex = i;
                break;
            }
        }
        if (lastToolInvocationIndex !== -1) {
            this._responseParts = this._responseParts.slice(0, lastToolInvocationIndex + 1);
        }
        else {
            this._responseParts = [];
        }
        if (message) {
            this._responseParts.push({ kind: 'warning', content: new MarkdownString(message) });
        }
        this._contentChanged(true);
    }
    updateContent(progress, quiet) {
        if (progress.kind === 'clearToPreviousToolInvocation') {
            if (progress.reason === ChatResponseClearToPreviousToolInvocationReason.CopyrightContentRetry) {
                this.clearToPreviousToolInvocation(localize(8477, null));
            }
            else if (progress.reason === ChatResponseClearToPreviousToolInvocationReason.FilteredContentRetry) {
                this.clearToPreviousToolInvocation(localize(8478, null));
            }
            else {
                this.clearToPreviousToolInvocation();
            }
            return;
        }
        else if (progress.kind === 'markdownContent') {
            // last response which is NOT a text edit group because we do want to support heterogenous streaming but not have
            // the MD be chopped up by text edit groups (and likely other non-renderable parts)
            const lastResponsePart = this._responseParts
                .filter(p => p.kind !== 'textEditGroup')
                .at(-1);
            if (!lastResponsePart || lastResponsePart.kind !== 'markdownContent' || !canMergeMarkdownStrings(lastResponsePart.content, progress.content)) {
                // The last part can't be merged with- not markdown, or markdown with different permissions
                this._responseParts.push(progress);
            }
            else {
                // Don't modify the current object, since it's being diffed by the renderer
                const idx = this._responseParts.indexOf(lastResponsePart);
                this._responseParts[idx] = { ...lastResponsePart, content: appendMarkdownString(lastResponsePart.content, progress.content) };
            }
            this._contentChanged(quiet);
        }
        else if (progress.kind === 'thinking') {
            // tries to split thinking chunks if it is an array. only while certain models give us array chunks.
            const lastResponsePart = this._responseParts
                .filter(p => p.kind !== 'textEditGroup')
                .at(-1);
            const lastText = lastResponsePart && lastResponsePart.kind === 'thinking'
                ? (Array.isArray(lastResponsePart.value) ? lastResponsePart.value.join('') : (lastResponsePart.value || ''))
                : '';
            const currText = Array.isArray(progress.value) ? progress.value.join('') : (progress.value || '');
            const isEmpty = (s) => s.length === 0;
            // Do not merge if either the current or last thinking chunk is empty; empty chunks separate thinking
            if (!lastResponsePart
                || lastResponsePart.kind !== 'thinking'
                || isEmpty(currText)
                || isEmpty(lastText)
                || !canMergeMarkdownStrings(new MarkdownString(lastText), new MarkdownString(currText))) {
                this._responseParts.push(progress);
            }
            else {
                const idx = this._responseParts.indexOf(lastResponsePart);
                this._responseParts[idx] = {
                    ...lastResponsePart,
                    value: appendMarkdownString(new MarkdownString(lastText), new MarkdownString(currText)).value
                };
            }
            this._contentChanged(quiet);
        }
        else if (progress.kind === 'textEdit' || progress.kind === 'notebookEdit') {
            // merge edits for the same file no matter when they come in
            const notebookUri = CellUri.parse(progress.uri)?.notebook;
            const uri = notebookUri ?? progress.uri;
            const isExternalEdit = progress.isExternalEdit;
            if (progress.kind === 'textEdit' && !notebookUri) {
                // Text edits to a regular (non-notebook) file
                this._mergeOrPushTextEditGroup(uri, progress.edits, progress.done, isExternalEdit);
            }
            else if (progress.kind === 'textEdit') {
                // Text edits to a notebook cell - convert to ICellTextEditOperation
                const cellEdits = progress.edits.map(edit => ({ uri: progress.uri, edit }));
                this._mergeOrPushNotebookEditGroup(uri, cellEdits, progress.done, isExternalEdit);
            }
            else {
                // Notebook cell edits (ICellEditOperation)
                this._mergeOrPushNotebookEditGroup(uri, progress.edits, progress.done, isExternalEdit);
            }
            this._contentChanged(quiet);
        }
        else if (progress.kind === 'progressTask') {
            // Add a new resolving part
            const responsePosition = this._responseParts.push(progress) - 1;
            this._contentChanged(quiet);
            const disp = progress.onDidAddProgress(() => {
                this._contentChanged(false);
            });
            progress.task?.().then((content) => {
                // Stop listening for progress updates once the task settles
                disp.dispose();
                // Replace the resolving part's content with the resolved response
                if (typeof content === 'string') {
                    this._responseParts[responsePosition].content = new MarkdownString(content);
                }
                this._contentChanged(false);
            });
        }
        else if (progress.kind === 'toolInvocation') {
            autorunSelfDisposable(reader => {
                progress.state.read(reader); // update repr when state changes
                this._contentChanged(false);
                if (IChatToolInvocation.isComplete(progress, reader)) {
                    reader.dispose();
                }
            });
            this._responseParts.push(progress);
            this._contentChanged(quiet);
        }
        else if (progress.kind === 'externalToolInvocationUpdate') {
            this._handleExternalToolInvocationUpdate(progress);
            this._contentChanged(quiet);
        }
        else {
            this._responseParts.push(progress);
            this._contentChanged(quiet);
        }
    }
    addCitation(citation) {
        this._citations.push(citation);
        this._contentChanged();
    }
    _mergeOrPushTextEditGroup(uri, edits, done, isExternalEdit) {
        for (const candidate of this._responseParts) {
            if (candidate.kind === 'textEditGroup' && !candidate.done && isEqual(candidate.uri, uri)) {
                candidate.edits.push(edits);
                candidate.done = done;
                return;
            }
        }
        this._responseParts.push({ kind: 'textEditGroup', uri, edits: [edits], done, isExternalEdit });
    }
    _mergeOrPushNotebookEditGroup(uri, edits, done, isExternalEdit) {
        for (const candidate of this._responseParts) {
            if (candidate.kind === 'notebookEditGroup' && !candidate.done && isEqual(candidate.uri, uri)) {
                candidate.edits.push(edits);
                candidate.done = done;
                return;
            }
        }
        this._responseParts.push({ kind: 'notebookEditGroup', uri, edits: [edits], done, isExternalEdit });
    }
    _handleExternalToolInvocationUpdate(progress) {
        // Look for existing invocation in the response parts
        const existingInvocation = this._responseParts.findLast((part) => part.kind === 'toolInvocation' && part.toolCallId === progress.toolCallId);
        if (existingInvocation) {
            if (progress.isComplete) {
                existingInvocation.didExecuteTool({
                    content: [],
                    toolResultMessage: progress.pastTenseMessage,
                    toolResultError: progress.errorMessage,
                    toolResultDetails: progress.resultDetails
                });
            }
            if (progress.toolSpecificData !== undefined) {
                existingInvocation.toolSpecificData = progress.toolSpecificData;
            }
            return;
        }
        // Create a new external tool invocation
        const toolData = {
            id: progress.toolName,
            source: ToolDataSource.External,
            displayName: progress.toolName,
            modelDescription: progress.toolName,
        };
        const invocation = new ChatToolInvocation({
            invocationMessage: progress.invocationMessage,
            pastTenseMessage: progress.pastTenseMessage,
            toolSpecificData: progress.toolSpecificData,
        }, toolData, progress.toolCallId, progress.subagentInvocationId, undefined, // parameters
        {}, undefined // chatRequestId
        );
        if (progress.isComplete) {
            // Already completed on first push
            invocation.didExecuteTool({
                content: [],
                toolResultMessage: progress.pastTenseMessage,
                toolResultError: progress.errorMessage,
                toolResultDetails: progress.resultDetails
            });
            if (progress.toolSpecificData !== undefined) {
                invocation.toolSpecificData = progress.toolSpecificData;
            }
        }
        this._responseParts.push(invocation);
    }
    computeRepr() {
        let repr = super.computeRepr();
        if (this._citations.length) {
            repr += '\n\n' + getCodeCitationsMessage(this._citations);
        }
        return repr;
    }
    _contentChanged(quiet) {
        this._invalidateRepr();
        if (!quiet) {
            this._onDidChangeValue.fire();
        }
    }
}
export class ChatResponseModel extends Disposable {
    get shouldBeBlocked() {
        return this._shouldBeBlocked;
    }
    get request() {
        return this.session.getRequests().find(r => r.id === this.requestId);
    }
    get session() {
        return this._session;
    }
    get shouldBeRemovedOnSend() {
        return this._shouldBeRemovedOnSend;
    }
    get isComplete() {
        return this._modelState.get().value !== 0 /* ResponseModelState.Pending */ && this._modelState.get().value !== 4 /* ResponseModelState.NeedsInput */;
    }
    get timestamp() {
        return this._timestamp;
    }
    set shouldBeRemovedOnSend(disablement) {
        if (this._shouldBeRemovedOnSend === disablement) {
            return;
        }
        this._shouldBeRemovedOnSend = disablement;
        this._onDidChange.fire(defaultChatResponseModelChangeReason);
    }
    get isCanceled() {
        return this._modelState.get().value === 2 /* ResponseModelState.Cancelled */;
    }
    get completedAt() {
        const state = this._modelState.get();
        if (state.value === 1 /* ResponseModelState.Complete */ || state.value === 2 /* ResponseModelState.Cancelled */ || state.value === 3 /* ResponseModelState.Failed */) {
            return state.completedAt;
        }
        return undefined;
    }
    get state() {
        const state = this._modelState.get().value;
        if (state === 1 /* ResponseModelState.Complete */ && !!this._result?.errorDetails && this.result?.errorDetails?.code !== 'canceled') {
            // This check covers sessions created in previous vscode versions which saved a failed response as 'Complete'
            return 3 /* ResponseModelState.Failed */;
        }
        return state;
    }
    get stateT() {
        return this._modelState.get();
    }
    get vote() {
        return this._vote;
    }
    get voteDownReason() {
        return this._voteDownReason;
    }
    get followups() {
        return this._followups;
    }
    get entireResponse() {
        return this._finalizedResponse || this._response;
    }
    get result() {
        return this._result;
    }
    get usage() {
        return this._usage;
    }
    get username() {
        return this.session.responderUsername;
    }
    get agent() {
        return this._agent;
    }
    get slashCommand() {
        return this._slashCommand;
    }
    get agentOrSlashCommandDetected() {
        return this._agentOrSlashCommandDetected ?? false;
    }
    get usedContext() {
        return this._usedContext;
    }
    get contentReferences() {
        return Array.from(this._contentReferences);
    }
    get codeCitations() {
        return this._codeCitations;
    }
    get progressMessages() {
        return this._progressMessages;
    }
    get isStale() {
        return this._isStale;
    }
    get response() {
        const undoStop = this._shouldBeRemovedOnSend?.afterUndoStop;
        if (!undoStop) {
            return this._finalizedResponse || this._response;
        }
        if (this._responseView?.undoStop !== undoStop) {
            this._responseView = new ResponseView(this._response, undoStop);
        }
        return this._responseView;
    }
    get codeBlockInfos() {
        return this._codeBlockInfos;
    }
    constructor(params) {
        super();
        this._onDidChange = this._register(new Emitter());
        this.onDidChange = this._onDidChange.event;
        this._modelState = observableValue(this, { value: 0 /* ResponseModelState.Pending */ });
        this._shouldBeBlocked = observableValue(this, false);
        this._contentReferences = [];
        this._codeCitations = [];
        this._progressMessages = [];
        this._isStale = false;
        this._session = params.session;
        this._agent = params.agent;
        this._slashCommand = params.slashCommand;
        this.requestId = params.requestId;
        this._timestamp = params.timestamp || Date.now();
        if (params.modelState) {
            this._modelState.set(params.modelState, undefined);
        }
        this._timeSpentWaitingAccumulator = params.timeSpentWaiting || 0;
        this._vote = params.vote;
        this._voteDownReason = params.voteDownReason;
        this._result = params.result;
        this._followups = params.followups ? [...params.followups] : undefined;
        this.isCompleteAddedRequest = params.isCompleteAddedRequest ?? false;
        this._shouldBeRemovedOnSend = params.shouldBeRemovedOnSend;
        this._shouldBeBlocked.set(params.shouldBeBlocked ?? false, undefined);
        // If we are creating a response with some existing content, consider it stale
        this._isStale = Array.isArray(params.responseContent) && (params.responseContent.length !== 0 || isMarkdownString(params.responseContent) && params.responseContent.value.length !== 0);
        this._response = this._register(new Response(params.responseContent));
        this._codeBlockInfos = params.codeBlockInfos ? [...params.codeBlockInfos] : undefined;
        const signal = observableSignalFromEvent(this, this.onDidChange);
        const _pendingInfo = signal.map((_value, r) => {
            signal.read(r);
            for (const part of this._response.value) {
                if (part.kind === 'toolInvocation') {
                    const state = part.state.read(r);
                    if (state.type === 1 /* IChatToolInvocation.StateKind.WaitingForConfirmation */) {
                        const title = state.confirmationMessages?.title;
                        return title ? (isMarkdownString(title) ? title.value : title) : undefined;
                    }
                    if (state.type === 3 /* IChatToolInvocation.StateKind.WaitingForPostApproval */) {
                        return localize(8479, null);
                    }
                }
                if (part.kind === 'confirmation' && !part.isUsed) {
                    return part.title;
                }
                if (part.kind === 'questionCarousel' && !part.isUsed) {
                    return localize(8480, null);
                }
                if (part.kind === 'elicitation2' && part.state.read(r) === "pending" /* ElicitationState.Pending */) {
                    const title = part.title;
                    return isMarkdownString(title) ? title.value : title;
                }
            }
            return undefined;
        });
        const _startedWaitingAt = _pendingInfo.map(p => !!p).map(p => p ? Date.now() : undefined);
        this.isPendingConfirmation = _startedWaitingAt.map((waiting, r) => waiting ? { startedWaitingAt: waiting, detail: _pendingInfo.read(r) } : undefined);
        this.isInProgress = signal.map((_value, r) => {
            signal.read(r);
            return !_pendingInfo.read(r)
                && !this.shouldBeRemovedOnSend
                && (this._modelState.read(r).value === 0 /* ResponseModelState.Pending */ || this._modelState.read(r).value === 4 /* ResponseModelState.NeedsInput */);
        });
        this._register(this._response.onDidChangeValue(() => this._onDidChange.fire(defaultChatResponseModelChangeReason)));
        this.id = params.restoredId ?? 'response_' + generateUuid();
        let lastStartedWaitingAt = undefined;
        this.confirmationAdjustedTimestamp = derived(reader => {
            const pending = this.isPendingConfirmation.read(reader);
            if (pending) {
                this._modelState.set({ value: 4 /* ResponseModelState.NeedsInput */ }, undefined);
                if (!lastStartedWaitingAt) {
                    lastStartedWaitingAt = pending.startedWaitingAt;
                }
            }
            else if (lastStartedWaitingAt) {
                // Restore state to Pending if it was set to NeedsInput by this observable
                if (this._modelState.read(reader).value === 4 /* ResponseModelState.NeedsInput */) {
                    this._modelState.set({ value: 0 /* ResponseModelState.Pending */ }, undefined);
                }
                this._timeSpentWaitingAccumulator += Date.now() - lastStartedWaitingAt;
                lastStartedWaitingAt = undefined;
            }
            return this._timestamp + this._timeSpentWaitingAccumulator;
        }).recomputeInitiallyAndOnChange(this._store);
    }
    initializeCodeBlockInfos(codeBlockInfo) {
        if (this._codeBlockInfos) {
            throw new BugIndicatingError('Code block infos have already been initialized');
        }
        this._codeBlockInfos = [...codeBlockInfo];
    }
    setBlockedState(isBlocked) {
        this._shouldBeBlocked.set(isBlocked, undefined);
    }
    /**
     * Apply a progress update to the actual response content.
     */
    updateContent(responsePart, quiet) {
        this._response.updateContent(responsePart, quiet);
    }
    /**
     * Adds an undo stop at the current position in the stream.
     */
    addUndoStop(undoStop) {
        this._onDidChange.fire({ reason: 'undoStop', id: undoStop.id });
        this._response.updateContent(undoStop, true);
    }
    /**
     * Apply one of the progress updates that are not part of the actual response content.
     */
    applyReference(progress) {
        if (progress.kind === 'usedContext') {
            this._usedContext = progress;
        }
        else if (progress.kind === 'reference') {
            this._contentReferences.push(progress);
            this._onDidChange.fire(defaultChatResponseModelChangeReason);
        }
    }
    applyCodeCitation(progress) {
        this._codeCitations.push(progress);
        this._response.addCitation(progress);
        this._onDidChange.fire(defaultChatResponseModelChangeReason);
    }
    setAgent(agent, slashCommand) {
        this._agent = agent;
        this._slashCommand = slashCommand;
        this._agentOrSlashCommandDetected = !agent.isDefault || !!slashCommand;
        this._onDidChange.fire(defaultChatResponseModelChangeReason);
    }
    setResult(result) {
        this._result = result;
        this._onDidChange.fire(defaultChatResponseModelChangeReason);
    }
    setUsage(usage) {
        this._usage = usage;
        this._onDidChange.fire(defaultChatResponseModelChangeReason);
    }
    complete() {
        // No-op if it's already complete
        if (this.isComplete) {
            return;
        }
        if (this._result?.errorDetails?.responseIsRedacted) {
            this._response.clear();
        }
        // Canceled sessions can be considered 'Complete'
        const state = !!this._result?.errorDetails && this._result.errorDetails.code !== 'canceled' ? 3 /* ResponseModelState.Failed */ : 1 /* ResponseModelState.Complete */;
        this._modelState.set({ value: state, completedAt: Date.now() }, undefined);
        this._onDidChange.fire({ reason: 'completedRequest' });
    }
    cancel() {
        this._modelState.set({ value: 2 /* ResponseModelState.Cancelled */, completedAt: Date.now() }, undefined);
        this._onDidChange.fire({ reason: 'completedRequest' });
    }
    setFollowups(followups) {
        this._followups = followups;
        this._onDidChange.fire(defaultChatResponseModelChangeReason); // Fire so that command followups get rendered on the row
    }
    setVote(vote) {
        this._vote = vote;
        this._onDidChange.fire(defaultChatResponseModelChangeReason);
    }
    setVoteDownReason(reason) {
        this._voteDownReason = reason;
        this._onDidChange.fire(defaultChatResponseModelChangeReason);
    }
    setEditApplied(edit, editCount) {
        if (!this.response.value.includes(edit)) {
            return false;
        }
        if (!edit.state) {
            return false;
        }
        edit.state.applied = editCount; // must not be edit.edits.length
        this._onDidChange.fire(defaultChatResponseModelChangeReason);
        return true;
    }
    adoptTo(session) {
        this._session = session;
        this._onDidChange.fire(defaultChatResponseModelChangeReason);
    }
    finalizeUndoState() {
        this._finalizedResponse = this.response;
        this._responseView = undefined;
        this._shouldBeRemovedOnSend = undefined;
    }
    toJSON() {
        const modelState = this._modelState.get();
        const pendingConfirmation = this.isPendingConfirmation.get();
        return {
            responseId: this.id,
            result: this.result,
            responseMarkdownInfo: this.codeBlockInfos?.map(info => ({ suggestionId: info.suggestionId })),
            followups: this.followups,
            modelState: modelState.value === 0 /* ResponseModelState.Pending */ || modelState.value === 4 /* ResponseModelState.NeedsInput */ ? { value: 2 /* ResponseModelState.Cancelled */, completedAt: Date.now() } : modelState,
            vote: this.vote,
            voteDownReason: this.voteDownReason,
            slashCommand: this.slashCommand,
            usedContext: this.usedContext,
            contentReferences: this.contentReferences,
            codeCitations: this.codeCitations,
            timestamp: this._timestamp,
            timeSpentWaiting: (pendingConfirmation ? Date.now() - pendingConfirmation.startedWaitingAt : 0) + this._timeSpentWaitingAccumulator,
        };
    }
}
/**
 * Normalize chat data from storage to the current format.
 * TODO- ChatModel#_deserialize and reviveSerializedAgent also still do some normalization and maybe that should be done in here too.
 */
export function normalizeSerializableChatData(raw) {
    normalizeOldFields(raw);
    if (!('version' in raw)) {
        return {
            version: 3,
            ...raw,
            customTitle: undefined,
        };
    }
    if (raw.version === 2) {
        return {
            ...raw,
            version: 3,
            customTitle: raw.computedTitle
        };
    }
    return raw;
}
function normalizeOldFields(raw) {
    // Fill in fields that very old chat data may be missing
    if (!raw.sessionId) {
        raw.sessionId = generateUuid();
    }
    if (!raw.creationDate) {
        raw.creationDate = getLastYearDate();
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any, local/code-no-any-casts
    if (raw.initialLocation === 'editing-session') {
        raw.initialLocation = ChatAgentLocation.Chat;
    }
}
function getLastYearDate() {
    const lastYearDate = new Date();
    lastYearDate.setFullYear(lastYearDate.getFullYear() - 1);
    return lastYearDate.getTime();
}
export function isExportableSessionData(obj) {
    return !!obj &&
        Array.isArray(obj.requests) &&
        typeof obj.responderUsername === 'string';
}
export function isSerializableSessionData(obj) {
    const data = obj;
    return isExportableSessionData(obj) &&
        typeof data.creationDate === 'number' &&
        typeof data.sessionId === 'string' &&
        obj.requests.every((request) => !request.usedContext /* for backward compat allow missing usedContext */ || isIUsedContext(request.usedContext));
}
export var ChatRequestRemovalReason;
(function (ChatRequestRemovalReason) {
    /**
     * "Normal" remove
     */
    ChatRequestRemovalReason[ChatRequestRemovalReason["Removal"] = 0] = "Removal";
    /**
     * Removed because the request will be resent
     */
    ChatRequestRemovalReason[ChatRequestRemovalReason["Resend"] = 1] = "Resend";
    /**
     * Remove because the request is moving to another model
     */
    ChatRequestRemovalReason[ChatRequestRemovalReason["Adoption"] = 2] = "Adoption";
})(ChatRequestRemovalReason || (ChatRequestRemovalReason = {}));
/**
 * Internal implementation of IInputModel
 */
class InputModel {
    constructor(initialState) {
        this._state = observableValueOpts({ debugName: 'inputModelState', equalsFn: equals }, initialState);
        this.state = this._state;
    }
    setState(state) {
        const current = this._state.get();
        this._state.set({
            // If current is undefined, provide defaults for required fields
            attachments: [],
            mode: { id: 'agent', kind: ChatModeKind.Agent },
            selectedModel: undefined,
            inputText: '',
            selections: [],
            contrib: {},
            ...current,
            ...state
        }, undefined);
    }
    clearState() {
        this._state.set(undefined, undefined);
    }
    toJSON() {
        const value = this.state.get();
        if (!value) {
            return undefined;
        }
        // Filter out extension-contributed context items (kind: 'string' or implicit entries with StringChatContextValue)
        // These have handles that become invalid after window reload and cannot be properly restored.
        const persistableAttachments = value.attachments.filter(attachment => {
            if (isStringVariableEntry(attachment)) {
                return false;
            }
            if (isImplicitVariableEntry(attachment) && isStringImplicitContextValue(attachment.value)) {
                return false;
            }
            return true;
        });
        return {
            contrib: value.contrib,
            attachments: persistableAttachments,
            mode: value.mode,
            selectedModel: value.selectedModel ? {
                identifier: value.selectedModel.identifier,
                metadata: value.selectedModel.metadata
            } : undefined,
            inputText: value.inputText,
            selections: value.selections
        };
    }
}
let ChatModel = ChatModel_1 = class ChatModel extends Disposable {
    static getDefaultTitle(requests) {
        const firstRequestMessage = requests.at(0)?.message ?? '';
        const message = typeof firstRequestMessage === 'string' ?
            firstRequestMessage :
            firstRequestMessage.text;
        return message.split('\n')[0].substring(0, 200);
    }
    get contributedChatSession() {
        return this._contributedChatSession;
    }
    setContributedChatSession(session) {
        this._contributedChatSession = session;
    }
    get repoData() {
        return this._repoData;
    }
    setRepoData(data) {
        this._repoData = data;
    }
    getPendingRequests() {
        return this._pendingRequests;
    }
    setPendingRequests(requests) {
        const existingMap = new Map(this._pendingRequests.map(p => [p.request.id, p]));
        const newPending = [];
        for (const { requestId, kind } of requests) {
            const existing = existingMap.get(requestId);
            if (existing) {
                // Update kind if changed, keep existing request and sendOptions
                newPending.push(existing.kind === kind ? existing : { request: existing.request, kind, sendOptions: existing.sendOptions });
            }
        }
        this._pendingRequests.length = 0;
        this._pendingRequests.push(...newPending);
        this._onDidChangePendingRequests.fire();
    }
    /**
     * @internal Used by ChatService to add a request to the queue.
     * Steering messages are placed before queued messages.
     */
    addPendingRequest(request, kind, sendOptions) {
        const pendingRequest = {
            request,
            kind,
            sendOptions,
        };
        if (kind === "steering" /* ChatRequestQueueKind.Steering */) {
            // Insert after the last steering message, or at the beginning if there is none
            let insertIndex = 0;
            for (let i = 0; i < this._pendingRequests.length; i++) {
                if (this._pendingRequests[i].kind === "steering" /* ChatRequestQueueKind.Steering */) {
                    insertIndex = i + 1;
                }
                else {
                    break;
                }
            }
            this._pendingRequests.splice(insertIndex, 0, pendingRequest);
        }
        else {
            // Queued messages always go at the end
            this._pendingRequests.push(pendingRequest);
        }
        this._onDidChangePendingRequests.fire();
        return pendingRequest;
    }
    /**
     * @internal Used by ChatService to remove a pending request
     */
    removePendingRequest(id) {
        const index = this._pendingRequests.findIndex(r => r.request.id === id);
        if (index !== -1) {
            this._pendingRequests.splice(index, 1);
            this._onDidChangePendingRequests.fire();
        }
    }
    /**
     * @internal Used by ChatService to dequeue the next pending request
     */
    dequeuePendingRequest() {
        const request = this._pendingRequests.shift();
        if (request) {
            this._onDidChangePendingRequests.fire();
        }
        return request;
    }
    /**
     * @internal Used by ChatService to dequeue all consecutive steering requests at the front of the queue.
     * Returns an empty array if the first pending request is not a steering request.
     */
    dequeueAllSteeringRequests() {
        const steeringRequests = [];
        while (this._pendingRequests.at(0)?.kind === "steering" /* ChatRequestQueueKind.Steering */) {
            steeringRequests.push(this._pendingRequests.shift());
        }
        if (steeringRequests.length > 0) {
            this._onDidChangePendingRequests.fire();
        }
        return steeringRequests;
    }
    /**
     * @internal Used by ChatService to clear all pending requests
     */
    clearPendingRequests() {
        if (this._pendingRequests.length > 0) {
            this._pendingRequests.length = 0;
            this._onDidChangePendingRequests.fire();
        }
    }
    /** @deprecated Use {@link sessionResource} instead */
    get sessionId() {
        return this._sessionId;
    }
    get sessionResource() {
        return this._sessionResource;
    }
    get hasRequests() {
        return this._requests.length > 0;
    }
    get lastRequest() {
        return this._requests.at(-1);
    }
    get timestamp() {
        return this._timestamp;
    }
    get timing() {
        const lastRequest = this._requests.at(-1);
        const lastResponse = lastRequest?.response;
        const lastRequestStarted = lastRequest?.timestamp;
        const lastRequestEnded = lastResponse?.completedAt ?? lastResponse?.timestamp;
        return {
            created: this._timestamp,
            lastRequestStarted,
            lastRequestEnded,
        };
    }
    get lastMessageDate() {
        return this._requests.at(-1)?.timestamp ?? this._timestamp;
    }
    get _defaultAgent() {
        return this.chatAgentService.getDefaultAgent(ChatAgentLocation.Chat, ChatModeKind.Ask);
    }
    get responderUsername() {
        return this._defaultAgent?.fullName ??
            this._initialResponderUsername ?? '';
    }
    get isImported() {
        return this._isImported;
    }
    get customTitle() {
        return this._customTitle;
    }
    get title() {
        return this._customTitle || ChatModel_1.getDefaultTitle(this._requests);
    }
    get hasCustomTitle() {
        return this._customTitle !== undefined;
    }
    get editingSession() {
        return this._editingSession;
    }
    get initialLocation() {
        return this._initialLocation;
    }
    get canUseTools() {
        return this._canUseTools;
    }
    get willKeepAlive() {
        return !this._disableBackgroundKeepAlive;
    }
    constructor(dataRef, initialModelProps, logService, chatAgentService, chatEditingService, chatService) {
        super();
        this.logService = logService;
        this.chatAgentService = chatAgentService;
        this.chatEditingService = chatEditingService;
        this.chatService = chatService;
        this._onDidDispose = this._register(new Emitter());
        this.onDidDispose = this._onDidDispose.event;
        this._onDidChange = this._register(new Emitter());
        this.onDidChange = this._onDidChange.event;
        this._pendingRequests = [];
        this._onDidChangePendingRequests = this._register(new Emitter());
        this.onDidChangePendingRequests = this._onDidChangePendingRequests.event;
        this._isImported = false;
        this._canUseTools = true;
        this.currentEditedFileEvents = new ResourceMap();
        this._checkpoint = undefined;
        const initialData = dataRef?.value;
        const isValidExportedData = isExportableSessionData(initialData);
        const isValidFullData = isValidExportedData && isSerializableSessionData(initialData);
        if (initialData && !isValidExportedData) {
            this.logService.warn(`ChatModel#constructor: Loaded malformed session data: ${JSON.stringify(initialData)}`);
        }
        this._isImported = !!initialData && isValidExportedData && !isValidFullData;
        // Set the session resource and id
        if (initialModelProps.resource) {
            // prefer using the provided resource if provided
            this._sessionId = chatSessionResourceToId(initialModelProps.resource);
            this._sessionResource = initialModelProps.resource;
        }
        else if (isValidFullData) {
            // Otherwise use the serialized id. This is only valid for local chat sessions
            this._sessionId = initialData.sessionId;
            this._sessionResource = LocalChatSessionUri.forSession(initialData.sessionId);
        }
        else {
            // Finally fall back to generating a new id for a local session. This is used in the case where a
            // chat has been exported (but not serialized)
            this._sessionId = generateUuid();
            this._sessionResource = LocalChatSessionUri.forSession(this._sessionId);
        }
        this._disableBackgroundKeepAlive = initialModelProps.disableBackgroundKeepAlive ?? false;
        this._requests = initialData ? this._deserialize(initialData) : [];
        this._timestamp = (isValidFullData && initialData.creationDate) || Date.now();
        this._customTitle = isValidFullData ? initialData.customTitle : undefined;
        // Initialize input model from serialized data (undefined for new chats)
        const serializedInputState = initialModelProps.inputState || (isValidFullData && initialData.inputState ? initialData.inputState : undefined);
        this.inputModel = new InputModel(serializedInputState && {
            attachments: serializedInputState.attachments,
            mode: serializedInputState.mode,
            selectedModel: serializedInputState.selectedModel && {
                identifier: serializedInputState.selectedModel.identifier,
                metadata: serializedInputState.selectedModel.metadata
            },
            contrib: serializedInputState.contrib,
            inputText: serializedInputState.inputText,
            selections: serializedInputState.selections
        });
        this.dataSerializer = dataRef?.serializer;
        this._initialResponderUsername = initialData?.responderUsername;
        this._repoData = isValidFullData && initialData.repoData ? initialData.repoData : undefined;
        // Hydrate pending requests from serialized data
        if (isValidFullData && initialData.pendingRequests) {
            this._pendingRequests = this._deserializePendingRequests(initialData.pendingRequests);
        }
        this._initialLocation = initialData?.initialLocation ?? initialModelProps.initialLocation;
        this._canUseTools = initialModelProps.canUseTools;
        this.lastRequestObs = observableFromEvent(this, this.onDidChange, () => this._requests.at(-1));
        this._register(autorun(reader => {
            const request = this.lastRequestObs.read(reader);
            if (!request?.response) {
                return;
            }
            reader.store.add(request.response.onDidChange(async (ev) => {
                if (!this._editingSession || ev.reason !== 'completedRequest') {
                    return;
                }
                this._onDidChange.fire({ kind: 'completedRequest', request });
            }));
        }));
        this.requestInProgress = this.lastRequestObs.map((request, r) => {
            return request?.response?.isInProgress.read(r) ?? false;
        });
        this.requestNeedsInput = this.lastRequestObs.map((request, r) => {
            const pendingInfo = request?.response?.isPendingConfirmation.read(r);
            if (!pendingInfo) {
                return undefined;
            }
            return {
                title: this.title,
                detail: pendingInfo.detail,
            };
        });
        // Retain a reference to itself when a request is in progress, so the ChatModel stays alive in the background
        // only while running a request. TODO also keep it alive for 5min or so so we don't have to dispose/restore too often?
        if (this.initialLocation === ChatAgentLocation.Chat && !initialModelProps.disableBackgroundKeepAlive) {
            const selfRef = this._register(new MutableDisposable());
            this._register(autorun(r => {
                const inProgress = this.requestInProgress.read(r);
                const needsInput = this.requestNeedsInput.read(r);
                const shouldStayAlive = inProgress || !!needsInput;
                if (shouldStayAlive && !selfRef.value) {
                    selfRef.value = chatService.acquireExistingSession(this._sessionResource);
                }
                else if (!shouldStayAlive && selfRef.value) {
                    selfRef.clear();
                }
            }));
        }
    }
    startEditingSession(isGlobalEditingSession, transferFromSession) {
        const session = this._editingSession ??= this._register(transferFromSession
            ? this.chatEditingService.transferEditingSession(this, transferFromSession)
            : isGlobalEditingSession
                ? this.chatEditingService.startOrContinueGlobalEditingSession(this)
                : this.chatEditingService.createEditingSession(this));
        if (!this._disableBackgroundKeepAlive) {
            // todo@connor4312: hold onto a reference so background sessions don't
            // trigger early disposal. This will be cleaned up with the globalization of edits.
            const selfRef = this._register(new MutableDisposable());
            this._register(autorun(r => {
                const hasModified = session.entries.read(r).some(e => e.state.read(r) === 0 /* ModifiedFileEntryState.Modified */);
                if (hasModified && !selfRef.value) {
                    selfRef.value = this.chatService.acquireExistingSession(this._sessionResource);
                }
                else if (!hasModified && selfRef.value) {
                    selfRef.clear();
                }
            }));
        }
        this._register(autorun(reader => {
            this._setDisabledRequests(session.requestDisablement.read(reader));
        }));
    }
    notifyEditingAction(action) {
        const state = action.outcome === 'accepted' ? ChatRequestEditedFileEventKind.Keep :
            action.outcome === 'rejected' ? ChatRequestEditedFileEventKind.Undo :
                action.outcome === 'userModified' ? ChatRequestEditedFileEventKind.UserModification : null;
        if (state === null) {
            return;
        }
        if (!this.currentEditedFileEvents.has(action.uri) || this.currentEditedFileEvents.get(action.uri)?.eventKind === ChatRequestEditedFileEventKind.Keep) {
            this.currentEditedFileEvents.set(action.uri, { eventKind: state, uri: action.uri });
        }
    }
    _deserialize(obj) {
        const requests = hasKey(obj, { serializer: true }) ? obj.value.requests : obj.requests;
        if (!Array.isArray(requests)) {
            this.logService.error(`Ignoring malformed session data: ${JSON.stringify(obj)}`);
            return [];
        }
        try {
            return requests.map(r => this._deserializeRequest(r));
        }
        catch (error) {
            this.logService.error('Failed to parse chat data', error);
            return [];
        }
    }
    _deserializeRequest(raw) {
        const parsedRequest = typeof raw.message === 'string'
            ? this.getParsedRequestFromString(raw.message)
            : reviveParsedChatRequest(raw.message);
        // Old messages don't have variableData, or have it in the wrong (non-array) shape
        const variableData = this.reviveVariableData(raw.variableData);
        const request = new ChatRequestModel({
            session: this,
            message: parsedRequest,
            variableData,
            timestamp: raw.timestamp ?? -1,
            restoredId: raw.requestId,
            confirmation: raw.confirmation,
            editedFileEvents: raw.editedFileEvents,
            modelId: raw.modelId,
            modeInfo: raw.modeInfo,
        });
        request.shouldBeRemovedOnSend = raw.isHidden ? { requestId: raw.requestId } : raw.shouldBeRemovedOnSend;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any, local/code-no-any-casts
        if (raw.response || raw.result || raw.responseErrorDetails) {
            const agent = (raw.agent && 'metadata' in raw.agent) ? // Check for the new format, ignore entries in the old format
                reviveSerializedAgent(raw.agent) : undefined;
            // Port entries from old format
            const result = 'responseErrorDetails' in raw ?
                // eslint-disable-next-line local/code-no-dangerous-type-assertions
                { errorDetails: raw.responseErrorDetails } : raw.result;
            let modelState = raw.modelState || { value: raw.isCanceled ? 2 /* ResponseModelState.Cancelled */ : 1 /* ResponseModelState.Complete */, completedAt: Date.now() };
            if (modelState.value === 0 /* ResponseModelState.Pending */ || modelState.value === 4 /* ResponseModelState.NeedsInput */) {
                modelState = { value: 2 /* ResponseModelState.Cancelled */, completedAt: Date.now() };
            }
            // Mark question carousels as used after
            // deserialization. After a reload, the extension is no longer listening for
            // their responses, so they cannot be interacted with.
            if (raw.response) {
                for (const part of raw.response) {
                    if (hasKey(part, { kind: true }) && (part.kind === 'questionCarousel')) {
                        part.isUsed = true;
                    }
                }
            }
            request.response = new ChatResponseModel({
                responseContent: raw.response ?? [new MarkdownString(raw.response)],
                session: this,
                agent,
                slashCommand: raw.slashCommand,
                requestId: request.id,
                modelState,
                vote: raw.vote,
                timestamp: raw.timestamp,
                voteDownReason: raw.voteDownReason,
                result,
                followups: raw.followups,
                restoredId: raw.responseId,
                timeSpentWaiting: raw.timeSpentWaiting,
                shouldBeBlocked: request.shouldBeBlocked.get(),
                codeBlockInfos: raw.responseMarkdownInfo?.map(info => ({ suggestionId: info.suggestionId })),
            });
            request.response.shouldBeRemovedOnSend = raw.isHidden ? { requestId: raw.requestId } : raw.shouldBeRemovedOnSend;
            if (raw.usedContext) { // @ulugbekna: if this's a new vscode sessions, doc versions are incorrect anyway?
                request.response.applyReference(revive(raw.usedContext));
            }
            raw.contentReferences?.forEach(r => request.response.applyReference(revive(r)));
            raw.codeCitations?.forEach(c => request.response.applyCodeCitation(revive(c)));
        }
        return request;
    }
    reviveVariableData(raw) {
        const variableData = raw && Array.isArray(raw.variables)
            ? raw :
            { variables: [] };
        variableData.variables = variableData.variables.map(IChatRequestVariableEntry.fromExport);
        return variableData;
    }
    getParsedRequestFromString(message) {
        // TODO These offsets won't be used, but chat replies need to go through the parser as well
        const parts = [new ChatRequestTextPart(new OffsetRange(0, message.length), { startColumn: 1, startLineNumber: 1, endColumn: 1, endLineNumber: 1 }, message)];
        return {
            text: message,
            parts
        };
    }
    /**
     * Hydrates pending requests from serialized data.
     * For each serialized pending request, finds the matching request model and adds it to the pending queue.
     */
    _deserializePendingRequests(pendingRequests) {
        try {
            return pendingRequests.map(pending => ({
                id: pending.id,
                request: this._deserializeRequest(pending.request),
                kind: pending.kind,
                sendOptions: {
                    ...pending.sendOptions,
                    userSelectedTools: pending.sendOptions.userSelectedTools
                        ? constObservable(pending.sendOptions.userSelectedTools)
                        : undefined,
                }
            }));
        }
        catch (e) {
            this.logService.error('Failed to parse pending chat requests', e);
            return [];
        }
    }
    getRequests() {
        return this._requests;
    }
    resetCheckpoint() {
        for (const request of this._requests) {
            request.setShouldBeBlocked(false);
            if (request.response) {
                request.response.setBlockedState(false);
            }
        }
    }
    setCheckpoint(requestId) {
        let checkpoint;
        let checkpointIndex = -1;
        if (requestId !== undefined) {
            this._requests.forEach((request, index) => {
                if (request.id === requestId) {
                    checkpointIndex = index;
                    checkpoint = request;
                    request.setShouldBeBlocked(true);
                }
            });
            if (!checkpoint) {
                return; // Invalid request ID
            }
        }
        for (let i = this._requests.length - 1; i >= 0; i -= 1) {
            const request = this._requests[i];
            if (this._checkpoint && !checkpoint) {
                request.setShouldBeBlocked(false);
                if (request.response) {
                    request.response.setBlockedState(false);
                }
            }
            else if (checkpoint && i >= checkpointIndex) {
                request.setShouldBeBlocked(true);
                if (request.response) {
                    request.response.setBlockedState(true);
                }
            }
            else if (checkpoint && i < checkpointIndex) {
                request.setShouldBeBlocked(false);
                if (request.response) {
                    request.response.setBlockedState(false);
                }
            }
        }
        this._checkpoint = checkpoint;
    }
    get checkpoint() {
        return this._checkpoint;
    }
    _setDisabledRequests(requestIds) {
        this._requests.forEach((request) => {
            const shouldBeRemovedOnSend = requestIds.find(r => r.requestId === request.id);
            request.shouldBeRemovedOnSend = shouldBeRemovedOnSend;
            if (request.response) {
                request.response.shouldBeRemovedOnSend = shouldBeRemovedOnSend;
            }
        });
        this._onDidChange.fire({ kind: 'setHidden' });
    }
    addRequest(message, variableData, attempt, modeInfo, chatAgent, slashCommand, confirmation, locationData, attachments, isCompleteAddedRequest, modelId, userSelectedTools, id) {
        const editedFileEvents = [...this.currentEditedFileEvents.values()];
        this.currentEditedFileEvents.clear();
        const request = new ChatRequestModel({
            restoredId: id,
            session: this,
            message,
            variableData,
            timestamp: Date.now(),
            attempt,
            modeInfo,
            confirmation,
            locationData,
            attachedContext: attachments,
            isCompleteAddedRequest,
            modelId,
            editedFileEvents: editedFileEvents.length ? editedFileEvents : undefined,
            userSelectedTools,
        });
        request.response = new ChatResponseModel({
            responseContent: [],
            session: this,
            agent: chatAgent,
            slashCommand,
            requestId: request.id,
            isCompleteAddedRequest,
            codeBlockInfos: undefined,
        });
        this._requests.push(request);
        this._onDidChange.fire({ kind: 'addRequest', request });
        return request;
    }
    setCustomTitle(title) {
        this._customTitle = title;
        this._onDidChange.fire({ kind: 'setCustomTitle', title });
    }
    updateRequest(request, variableData) {
        request.variableData = variableData;
        this._onDidChange.fire({ kind: 'changedRequest', request });
    }
    adoptRequest(request) {
        // this doesn't use `removeRequest` because it must not dispose the request object
        const oldOwner = request.session;
        const index = oldOwner._requests.findIndex((candidate) => candidate.id === request.id);
        if (index === -1) {
            return;
        }
        oldOwner._requests.splice(index, 1);
        request.adoptTo(this);
        request.response?.adoptTo(this);
        this._requests.push(request);
        oldOwner._onDidChange.fire({ kind: 'removeRequest', requestId: request.id, responseId: request.response?.id, reason: 2 /* ChatRequestRemovalReason.Adoption */ });
        this._onDidChange.fire({ kind: 'addRequest', request });
    }
    acceptResponseProgress(request, progress, quiet) {
        if (!request.response) {
            request.response = new ChatResponseModel({
                responseContent: [],
                session: this,
                requestId: request.id,
                codeBlockInfos: undefined,
            });
        }
        if (request.response.isComplete) {
            throw new Error('acceptResponseProgress: Adding progress to a completed response');
        }
        if (progress.kind === 'usedContext' || progress.kind === 'reference') {
            request.response.applyReference(progress);
        }
        else if (progress.kind === 'codeCitation') {
            request.response.applyCodeCitation(progress);
        }
        else if (progress.kind === 'move') {
            this._onDidChange.fire({ kind: 'move', target: progress.uri, range: progress.range });
        }
        else if (progress.kind === 'codeblockUri' && progress.isEdit) {
            request.response.addUndoStop({ id: progress.undoStopId ?? generateUuid(), kind: 'undoStop' });
            request.response.updateContent(progress, quiet);
        }
        else if (progress.kind === 'progressTaskResult') {
            // Should have been handled upstream, not sent to model
            this.logService.error(`Couldn't handle progress: ${JSON.stringify(progress)}`);
        }
        else {
            request.response.updateContent(progress, quiet);
        }
    }
    removeRequest(id, reason = 0 /* ChatRequestRemovalReason.Removal */) {
        const index = this._requests.findIndex(request => request.id === id);
        const request = this._requests[index];
        if (index !== -1) {
            this._onDidChange.fire({ kind: 'removeRequest', requestId: request.id, responseId: request.response?.id, reason });
            this._requests.splice(index, 1);
            request.response?.dispose();
        }
    }
    cancelRequest(request) {
        if (request.response) {
            request.response.cancel();
        }
    }
    setResponse(request, result) {
        if (!request.response) {
            request.response = new ChatResponseModel({
                responseContent: [],
                session: this,
                requestId: request.id,
                codeBlockInfos: undefined,
            });
        }
        request.response.setResult(result);
    }
    setFollowups(request, followups) {
        if (!request.response) {
            // Maybe something went wrong?
            return;
        }
        request.response.setFollowups(followups);
    }
    setResponseModel(request, response) {
        request.response = response;
        this._onDidChange.fire({ kind: 'addResponse', response });
    }
    toExport() {
        return {
            responderUsername: this.responderUsername,
            initialLocation: this.initialLocation,
            requests: this._requests.map((r) => {
                const message = {
                    ...r.message,
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    parts: r.message.parts.map((p) => p && 'toJSON' in p ? p.toJSON() : p)
                };
                const agent = r.response?.agent;
                const agentJson = agent && 'toJSON' in agent ? agent.toJSON() :
                    agent ? { ...agent } : undefined;
                return {
                    requestId: r.id,
                    message,
                    variableData: IChatRequestVariableData.toExport(r.variableData),
                    response: r.response ?
                        r.response.entireResponse.value.map(item => {
                            // Keeping the shape of the persisted data the same for back compat
                            if (item.kind === 'treeData') {
                                return item.treeData;
                            }
                            else if (item.kind === 'markdownContent') {
                                return item.content;
                            }
                            else {
                                // eslint-disable-next-line local/code-no-any-casts, @typescript-eslint/no-explicit-any
                                return item; // TODO
                            }
                        })
                        : undefined,
                    shouldBeRemovedOnSend: r.shouldBeRemovedOnSend,
                    agent: agentJson,
                    timestamp: r.timestamp,
                    confirmation: r.confirmation,
                    editedFileEvents: r.editedFileEvents,
                    modelId: r.modelId,
                    modeInfo: r.modeInfo,
                    ...r.response?.toJSON(),
                };
            }),
        };
    }
    toJSON() {
        return {
            version: 3,
            ...this.toExport(),
            sessionId: this.sessionId,
            creationDate: this._timestamp,
            customTitle: this._customTitle,
            inputState: this.inputModel.toJSON(),
        };
    }
    dispose() {
        this._requests.forEach(r => r.response?.dispose());
        this._onDidDispose.fire();
        super.dispose();
    }
};
ChatModel = ChatModel_1 = __decorate([
    __param(2, ILogService),
    __param(3, IChatAgentService),
    __param(4, IChatEditingService),
    __param(5, IChatService)
], ChatModel);
export { ChatModel };
export function updateRanges(variableData, diff) {
    return {
        variables: variableData.variables.map(v => ({
            ...v,
            range: v.range && {
                start: v.range.start - diff,
                endExclusive: v.range.endExclusive - diff
            }
        }))
    };
}
export function canMergeMarkdownStrings(md1, md2) {
    if (md1.baseUri && md2.baseUri) {
        const baseUriEquals = md1.baseUri.scheme === md2.baseUri.scheme
            && md1.baseUri.authority === md2.baseUri.authority
            && md1.baseUri.path === md2.baseUri.path
            && md1.baseUri.query === md2.baseUri.query
            && md1.baseUri.fragment === md2.baseUri.fragment;
        if (!baseUriEquals) {
            return false;
        }
    }
    else if (md1.baseUri || md2.baseUri) {
        return false;
    }
    return equals(md1.isTrusted, md2.isTrusted) &&
        md1.supportHtml === md2.supportHtml &&
        md1.supportThemeIcons === md2.supportThemeIcons;
}
export function appendMarkdownString(md1, md2) {
    const appendedValue = typeof md2 === 'string' ? md2 : md2.value;
    return {
        value: md1.value + appendedValue,
        isTrusted: md1.isTrusted,
        supportThemeIcons: md1.supportThemeIcons,
        supportHtml: md1.supportHtml,
        baseUri: md1.baseUri
    };
}
export function getCodeCitationsMessage(citations) {
    if (citations.length === 0) {
        return '';
    }
    const licenseTypes = citations.reduce((set, c) => set.add(c.license), new Set());
    const label = licenseTypes.size === 1 ?
        localize(8481, null, licenseTypes.size) :
        localize(8482, null, licenseTypes.size);
    return label;
}
/**
 * Converts IChatSendRequestOptions to a serializable format by extracting only
 * serializable fields and converting observables to static values.
 */
export function serializeSendOptions(options) {
    return {
        modeInfo: options.modeInfo,
        userSelectedModelId: options.userSelectedModelId,
        userSelectedTools: options.userSelectedTools?.get(),
        location: options.location,
        locationData: options.locationData,
        attempt: options.attempt,
        noCommandDetection: options.noCommandDetection,
        agentId: options.agentId,
        agentIdSilent: options.agentIdSilent,
        slashCommand: options.slashCommand,
        confirmation: options.confirmation,
    };
}
export var ChatRequestEditedFileEventKind;
(function (ChatRequestEditedFileEventKind) {
    ChatRequestEditedFileEventKind[ChatRequestEditedFileEventKind["Keep"] = 1] = "Keep";
    ChatRequestEditedFileEventKind[ChatRequestEditedFileEventKind["Undo"] = 2] = "Undo";
    ChatRequestEditedFileEventKind[ChatRequestEditedFileEventKind["UserModification"] = 3] = "UserModification";
})(ChatRequestEditedFileEventKind || (ChatRequestEditedFileEventKind = {}));
/** URI for a resource embedded in a chat request/response */
export var ChatResponseResource;
(function (ChatResponseResource) {
    ChatResponseResource.scheme = 'vscode-chat-response-resource';
    function createUri(sessionResource, toolCallId, index, basename) {
        return URI.from({
            scheme: ChatResponseResource.scheme,
            authority: encodeHex(VSBuffer.fromString(sessionResource.toString())),
            path: `/tool/${toolCallId}/${index}` + (basename ? `/${basename}` : ''),
        });
    }
    ChatResponseResource.createUri = createUri;
    function parseUri(uri) {
        if (uri.scheme !== ChatResponseResource.scheme) {
            return undefined;
        }
        const parts = uri.path.split('/');
        if (parts.length < 4) {
            return undefined;
        }
        const [, kind, toolCallId, index] = parts;
        if (kind !== 'tool') {
            return undefined;
        }
        let sessionResource;
        try {
            sessionResource = URI.parse(decodeHex(uri.authority).toString());
        }
        catch (e) {
            if (e instanceof SyntaxError) { // pre-1.108 local session ID
                sessionResource = LocalChatSessionUri.forSession(uri.authority);
            }
            else {
                throw e;
            }
        }
        return {
            sessionResource,
            toolCallId: toolCallId,
            index: Number(index),
        };
    }
    ChatResponseResource.parseUri = parseUri;
})(ChatResponseResource || (ChatResponseResource = {}));
//# sourceMappingURL=chatModel.js.map