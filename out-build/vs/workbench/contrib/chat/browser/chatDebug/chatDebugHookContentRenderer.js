/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as DOM from '../../../../../base/browser/dom.js';
import { DisposableStore } from '../../../../../base/common/lifecycle.js';
import { localize } from '../../../../../nls.js';
import { ChatDebugHookResult } from '../../common/chatDebugService.js';
import { renderSection, tokenizeContent } from './chatDebugToolCallContentRenderer.js';
const $ = DOM.$;
/**
 * Render a resolved hook execution content with structured sections for
 * hook type, command, result, duration, input, and output.
 * When JSON is detected in input/output, renders it with syntax highlighting.
 */
export async function renderHookContent(content, languageService, clipboardService, scrollable) {
    const disposables = new DisposableStore();
    const container = $('div.chat-debug-message-content');
    container.tabIndex = 0;
    // Header: hook type
    DOM.append(container, $('div.chat-debug-message-content-title', undefined, content.hookType));
    // Status summary line
    const statusParts = [];
    if (content.result !== undefined) {
        statusParts.push(formatHookResult(content.result));
    }
    if (content.exitCode !== undefined) {
        statusParts.push(localize(6948, null, content.exitCode));
    }
    if (content.durationInMillis !== undefined) {
        statusParts.push(localize(6949, null, content.durationInMillis));
    }
    if (statusParts.length > 0) {
        DOM.append(container, $('div.chat-debug-message-content-summary', undefined, statusParts.join(' \u00b7 ')));
    }
    // Build collapsible sections for command, input, output, and error
    const sectionsContainer = DOM.append(container, $('div.chat-debug-message-sections'));
    if (content.command) {
        const { plainText, tokenizedHtml } = await tokenizeContent(content.command, languageService);
        renderSection(sectionsContainer, localize(6950, null), plainText, tokenizedHtml, disposables, false, clipboardService, scrollable);
    }
    if (content.input) {
        const { plainText, tokenizedHtml } = await tokenizeContent(content.input, languageService);
        renderSection(sectionsContainer, localize(6951, null), plainText, tokenizedHtml, disposables, false, clipboardService, scrollable);
    }
    if (content.output) {
        const { plainText, tokenizedHtml } = await tokenizeContent(content.output, languageService);
        renderSection(sectionsContainer, localize(6952, null), plainText, tokenizedHtml, disposables, false, clipboardService, scrollable);
    }
    if (content.errorMessage) {
        const { plainText, tokenizedHtml } = await tokenizeContent(content.errorMessage, languageService);
        renderSection(sectionsContainer, localize(6953, null), plainText, tokenizedHtml, disposables, false, clipboardService, scrollable);
    }
    return { element: container, disposables };
}
function formatHookResult(result) {
    switch (result) {
        case ChatDebugHookResult.Success:
            return localize(6954, null);
        case ChatDebugHookResult.Error:
            return localize(6955, null);
        case ChatDebugHookResult.NonBlockingError:
            return localize(6956, null);
        default:
            return String(result);
    }
}
/**
 * Convert a resolved hook content to plain text for clipboard / editor output.
 */
export function hookContentToPlainText(content) {
    const lines = [];
    lines.push(localize(6957, null, content.hookType));
    if (content.result !== undefined) {
        lines.push(localize(6958, null, formatHookResult(content.result)));
    }
    if (content.exitCode !== undefined) {
        lines.push(localize(6959, null, content.exitCode));
    }
    if (content.durationInMillis !== undefined) {
        lines.push(localize(6960, null, content.durationInMillis));
    }
    if (content.command) {
        lines.push('');
        lines.push(`[${localize(6961, null)}]`);
        lines.push(content.command);
    }
    if (content.input) {
        lines.push('');
        lines.push(`[${localize(6962, null)}]`);
        try {
            const parsed = JSON.parse(content.input);
            lines.push(JSON.stringify(parsed, null, 2));
        }
        catch {
            lines.push(content.input);
        }
    }
    if (content.output) {
        lines.push('');
        lines.push(`[${localize(6963, null)}]`);
        try {
            const parsed = JSON.parse(content.output);
            lines.push(JSON.stringify(parsed, null, 2));
        }
        catch {
            lines.push(content.output);
        }
    }
    if (content.errorMessage) {
        lines.push('');
        lines.push(`[${localize(6964, null)}]`);
        lines.push(content.errorMessage);
    }
    return lines.join('\n');
}
//# sourceMappingURL=chatDebugHookContentRenderer.js.map