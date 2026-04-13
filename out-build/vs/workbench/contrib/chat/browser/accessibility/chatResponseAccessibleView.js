/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { renderAsPlaintext } from '../../../../../base/browser/markdownRenderer.js';
import { Emitter } from '../../../../../base/common/event.js';
import { isMarkdownString } from '../../../../../base/common/htmlContent.js';
import { stripIcons } from '../../../../../base/common/iconLabels.js';
import { Disposable, DisposableStore } from '../../../../../base/common/lifecycle.js';
import { URI } from '../../../../../base/common/uri.js';
import { localize } from '../../../../../nls.js';
import { IStorageService } from '../../../../../platform/storage/common/storage.js';
import { migrateLegacyTerminalToolSpecificData } from '../../common/chat.js';
import { ChatContextKeys } from '../../common/actions/chatContextKeys.js';
import { IChatToolInvocation, isLegacyChatTerminalToolInvocationData } from '../../common/chatService/chatService.js';
import { isResponseVM } from '../../common/model/chatViewModel.js';
import { isToolResultInputOutputDetails, isToolResultOutputDetails, toolContentToA11yString } from '../../common/tools/languageModelToolsService.js';
import { IChatWidgetService } from '../chat.js';
export class ChatResponseAccessibleView {
    constructor() {
        this.priority = 100;
        this.name = 'panelChat';
        this.type = "view" /* AccessibleViewType.View */;
        this.when = ChatContextKeys.inChatSession;
    }
    getProvider(accessor) {
        const widgetService = accessor.get(IChatWidgetService);
        const storageService = accessor.get(IStorageService);
        const widget = widgetService.lastFocusedWidget;
        if (!widget) {
            return;
        }
        const chatInputFocused = widget.hasInputFocus();
        if (chatInputFocused) {
            widget.focusResponseItem();
        }
        const verifiedWidget = widget;
        let focusedItem = verifiedWidget.getFocus();
        if (!focusedItem || !isResponseVM(focusedItem)) {
            const responseItems = verifiedWidget.viewModel?.getItems().filter(isResponseVM);
            const lastResponse = responseItems?.at(-1);
            if (lastResponse) {
                focusedItem = lastResponse;
                verifiedWidget.focus(lastResponse);
            }
        }
        if (!focusedItem || !isResponseVM(focusedItem)) {
            return;
        }
        return new ChatResponseAccessibleProvider(verifiedWidget, focusedItem, chatInputFocused, storageService);
    }
}
export const CHAT_ACCESSIBLE_VIEW_INCLUDE_THINKING_STORAGE_KEY = 'chat.accessibleView.includeThinking';
const CHAT_ACCESSIBLE_VIEW_INCLUDE_THINKING_DEFAULT = true;
export function isThinkingContentIncludedInAccessibleView(storageService) {
    return storageService.getBoolean(CHAT_ACCESSIBLE_VIEW_INCLUDE_THINKING_STORAGE_KEY, 0 /* StorageScope.PROFILE */, CHAT_ACCESSIBLE_VIEW_INCLUDE_THINKING_DEFAULT);
}
function isOutputDetailsSerialized(obj) {
    return typeof obj === 'object' && obj !== null && 'output' in obj &&
        typeof obj.output === 'object' &&
        obj.output?.type === 'data' &&
        typeof obj.output?.base64Data === 'string';
}
export function getToolSpecificDataDescription(toolSpecificData) {
    if (!toolSpecificData) {
        return '';
    }
    if (isLegacyChatTerminalToolInvocationData(toolSpecificData) || toolSpecificData.kind === 'terminal') {
        const terminalData = migrateLegacyTerminalToolSpecificData(toolSpecificData);
        return terminalData.commandLine.userEdited ?? terminalData.commandLine.toolEdited ?? terminalData.commandLine.original;
    }
    switch (toolSpecificData.kind) {
        case 'subagent': {
            const parts = [];
            if (toolSpecificData.agentName) {
                parts.push(localize(5757, null, toolSpecificData.agentName));
            }
            if (toolSpecificData.description) {
                parts.push(toolSpecificData.description);
            }
            if (toolSpecificData.prompt) {
                parts.push(localize(5758, null, toolSpecificData.prompt));
            }
            return parts.join('. ') || '';
        }
        case 'extensions':
            return toolSpecificData.extensions.length > 0
                ? localize(5759, null, toolSpecificData.extensions.join(', '))
                : '';
        case 'todoList': {
            const todos = toolSpecificData.todoList;
            if (todos.length === 0) {
                return '';
            }
            const todoDescriptions = todos.map(t => localize(5760, null, t.title, t.status));
            return localize(5761, null, todos.length, todoDescriptions.join('; '));
        }
        case 'pullRequest':
            return localize(5762, null, toolSpecificData.title, toolSpecificData.author);
        case 'input':
            return typeof toolSpecificData.rawInput === 'string'
                ? toolSpecificData.rawInput
                : JSON.stringify(toolSpecificData.rawInput);
        case 'resources': {
            const values = toolSpecificData.values;
            if (values.length === 0) {
                return '';
            }
            const paths = values.map(v => {
                if ('uri' in v && 'range' in v) {
                    // Location
                    return `${v.uri.fsPath || v.uri.path}:${v.range.startLineNumber}`;
                }
                else {
                    // URI
                    return v.fsPath || v.path;
                }
            }).join(', ');
            return localize(5763, null, paths);
        }
        case 'simpleToolInvocation': {
            const inputText = toolSpecificData.input;
            const outputText = toolSpecificData.output;
            return localize(5764, null, inputText, outputText);
        }
        case 'modifiedFilesConfirmation': {
            if (toolSpecificData.modifiedFiles.length === 0) {
                return '';
            }
            return localize(5765, null, toolSpecificData.modifiedFiles.map(file => {
                const revivedUri = URI.revive(file.uri);
                return revivedUri.fsPath || revivedUri.path;
            }).join(', '));
        }
        default:
            return '';
    }
}
export function getResultDetailsDescription(resultDetails) {
    if (!resultDetails) {
        return {};
    }
    if (Array.isArray(resultDetails)) {
        const files = resultDetails.map(ref => {
            if (URI.isUri(ref)) {
                return ref.fsPath || ref.path;
            }
            return ref.uri.fsPath || ref.uri.path;
        });
        return { files };
    }
    if (isToolResultInputOutputDetails(resultDetails)) {
        return {
            input: resultDetails.input,
            isError: resultDetails.isError
        };
    }
    if (isOutputDetailsSerialized(resultDetails)) {
        return {
            input: localize(5766, null, resultDetails.output.mimeType)
        };
    }
    if (isToolResultOutputDetails(resultDetails)) {
        return {
            input: localize(5767, null, resultDetails.output.mimeType)
        };
    }
    return {};
}
export function getToolInvocationA11yDescription(invocationMessage, pastTenseMessage, toolSpecificData, resultDetails, isComplete) {
    const parts = [];
    const message = isComplete && pastTenseMessage ? pastTenseMessage : invocationMessage;
    if (message) {
        parts.push(message);
    }
    const toolDataDesc = getToolSpecificDataDescription(toolSpecificData);
    if (toolDataDesc) {
        parts.push(toolDataDesc);
    }
    if (isComplete && resultDetails) {
        const details = getResultDetailsDescription(resultDetails);
        if (details.isError) {
            parts.unshift(localize(5768, null));
        }
        if (details.input && !toolDataDesc) {
            parts.push(localize(5769, null, details.input));
        }
        if (details.files && details.files.length > 0) {
            parts.push(localize(5770, null, details.files.join(', ')));
        }
    }
    return parts.join('. ');
}
class ChatResponseAccessibleProvider extends Disposable {
    constructor(_widget, item, _wasOpenedFromInput, _storageService) {
        super();
        this._widget = _widget;
        this._wasOpenedFromInput = _wasOpenedFromInput;
        this._storageService = _storageService;
        this._focusedItemDisposables = this._register(new DisposableStore());
        this._storageDisposables = this._register(new DisposableStore());
        this._onDidChangeContent = this._register(new Emitter());
        this.onDidChangeContent = this._onDidChangeContent.event;
        this.id = "panelChat" /* AccessibleViewProviderId.PanelChat */;
        this.verbositySettingKey = "accessibility.verbosity.panelChat" /* AccessibilityVerbositySettingId.Chat */;
        this.options = { type: "view" /* AccessibleViewType.View */ };
        this._storageDisposables.add(this._storageService.onDidChangeValue(0 /* StorageScope.PROFILE */, CHAT_ACCESSIBLE_VIEW_INCLUDE_THINKING_STORAGE_KEY, this._storageDisposables)(() => {
            this._onDidChangeContent.fire();
        }));
        this._setFocusedItem(item);
    }
    provideContent() {
        return this._getContent(this._focusedItem);
    }
    _setFocusedItem(item) {
        this._focusedItem = item;
        this._focusedItemDisposables.clear();
        if (isResponseVM(item)) {
            this._focusedItemDisposables.add(item.model.onDidChange(() => this._onDidChangeContent.fire()));
        }
    }
    _renderMessageAsPlaintext(message) {
        return typeof message === 'string' ? message : stripIcons(renderAsPlaintext(message, { useLinkFormatter: true }));
    }
    _getContent(item) {
        const contentParts = [];
        if (!isResponseVM(item)) {
            return '';
        }
        if ('errorDetails' in item && item.errorDetails) {
            contentParts.push(item.errorDetails.message);
        }
        // Process all parts in order to maintain the natural flow
        for (const part of item.response.value) {
            switch (part.kind) {
                case 'thinking': {
                    if (!this._shouldIncludeThinkingContent()) {
                        break;
                    }
                    const thinkingValue = Array.isArray(part.value) ? part.value.join('') : (part.value || '');
                    const trimmed = thinkingValue.trim();
                    if (trimmed) {
                        contentParts.push(localize(5771, null, trimmed));
                    }
                    break;
                }
                case 'markdownContent': {
                    const text = renderAsPlaintext(part.content, { includeCodeBlocksFences: true, useLinkFormatter: true });
                    if (text.trim()) {
                        contentParts.push(text);
                    }
                    break;
                }
                case 'elicitation2':
                case 'elicitationSerialized': {
                    const title = part.title;
                    let elicitationContent = '';
                    if (typeof title === 'string') {
                        elicitationContent += `${title}\n`;
                    }
                    else if (isMarkdownString(title)) {
                        elicitationContent += renderAsPlaintext(title, { includeCodeBlocksFences: true }) + '\n';
                    }
                    const message = part.message;
                    if (isMarkdownString(message)) {
                        elicitationContent += renderAsPlaintext(message, { includeCodeBlocksFences: true });
                    }
                    else {
                        elicitationContent += message;
                    }
                    if (elicitationContent.trim()) {
                        contentParts.push(elicitationContent);
                    }
                    break;
                }
                case 'toolInvocation': {
                    const state = part.state.get();
                    if (state.type === 1 /* IChatToolInvocation.StateKind.WaitingForConfirmation */ && state.confirmationMessages?.title) {
                        const title = this._renderMessageAsPlaintext(state.confirmationMessages.title);
                        const message = state.confirmationMessages.message ? this._renderMessageAsPlaintext(state.confirmationMessages.message) : '';
                        const toolDataDesc = getToolSpecificDataDescription(part.toolSpecificData);
                        let toolContent = title;
                        if (toolDataDesc) {
                            toolContent += `: ${toolDataDesc}`;
                        }
                        if (message) {
                            toolContent += `\n${message}`;
                        }
                        contentParts.push(toolContent);
                    }
                    else if (state.type === 3 /* IChatToolInvocation.StateKind.WaitingForPostApproval */) {
                        const postApprovalDetails = isToolResultInputOutputDetails(state.resultDetails)
                            ? state.resultDetails.input
                            : isToolResultOutputDetails(state.resultDetails)
                                ? undefined
                                : toolContentToA11yString(state.contentForModel);
                        contentParts.push(localize(5772, null, part.toolId) + (postApprovalDetails ?? ''));
                    }
                    else {
                        const resultDetails = IChatToolInvocation.resultDetails(part);
                        const isComplete = IChatToolInvocation.isComplete(part);
                        const description = getToolInvocationA11yDescription(this._renderMessageAsPlaintext(part.invocationMessage), part.pastTenseMessage ? this._renderMessageAsPlaintext(part.pastTenseMessage) : undefined, part.toolSpecificData, resultDetails, isComplete);
                        if (description) {
                            contentParts.push(description);
                        }
                    }
                    break;
                }
                case 'toolInvocationSerialized': {
                    const description = getToolInvocationA11yDescription(this._renderMessageAsPlaintext(part.invocationMessage), part.pastTenseMessage ? this._renderMessageAsPlaintext(part.pastTenseMessage) : undefined, part.toolSpecificData, part.resultDetails, part.isComplete);
                    if (description) {
                        contentParts.push(description);
                    }
                    break;
                }
            }
        }
        return this._normalizeWhitespace(contentParts.join('\n'));
    }
    _normalizeWhitespace(content) {
        const lines = content.split(/\r?\n/);
        const normalized = [];
        for (const line of lines) {
            if (line.trim().length === 0) {
                continue;
            }
            normalized.push(line);
        }
        return normalized.join('\n');
    }
    _shouldIncludeThinkingContent() {
        return isThinkingContentIncludedInAccessibleView(this._storageService);
    }
    onClose() {
        this._widget.reveal(this._focusedItem);
        if (this._wasOpenedFromInput) {
            this._widget.focusInput();
        }
        else {
            this._widget.focus(this._focusedItem);
        }
    }
    provideNextContent() {
        const next = this._widget.getSibling(this._focusedItem, 'next');
        if (next) {
            this._setFocusedItem(next);
            return this._getContent(next);
        }
        return;
    }
    providePreviousContent() {
        const previous = this._widget.getSibling(this._focusedItem, 'previous');
        if (previous) {
            this._setFocusedItem(previous);
            return this._getContent(previous);
        }
        return;
    }
}
//# sourceMappingURL=chatResponseAccessibleView.js.map