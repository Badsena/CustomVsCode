/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as DOM from '../../../../../base/browser/dom.js';
import { DisposableStore } from '../../../../../base/common/lifecycle.js';
import { localize } from '../../../../../nls.js';
import { renderSection, tokenizeContent } from './chatDebugToolCallContentRenderer.js';
import { safeIntl } from '../../../../../base/common/date.js';
const $ = DOM.$;
const numberFormatter = safeIntl.NumberFormat();
/**
 * Render a resolved model turn content with structured display of
 * request metadata, token usage, and timing.
 * When JSON is detected in section content, renders it with syntax highlighting.
 */
export async function renderModelTurnContent(content, languageService, clipboardService, scrollable) {
    const disposables = new DisposableStore();
    const container = $('div.chat-debug-message-content');
    container.tabIndex = 0;
    // Header: Model Turn
    DOM.append(container, $('div.chat-debug-message-content-title', undefined, localize(7004, null)));
    // Status summary line
    const statusParts = [];
    if (content.requestName) {
        statusParts.push(content.requestName);
    }
    if (content.model) {
        statusParts.push(content.model);
    }
    if (content.status && content.status !== 'unknown') {
        statusParts.push(content.status);
    }
    if (content.durationInMillis !== undefined) {
        statusParts.push(localize(7005, null, numberFormatter.value.format(content.durationInMillis)));
    }
    if (statusParts.length > 0) {
        DOM.append(container, $('div.chat-debug-message-content-summary', undefined, statusParts.join(' \u00b7 ')));
    }
    // Token usage details
    const detailsContainer = DOM.append(container, $('div.chat-debug-model-turn-details'));
    if (content.inputTokens !== undefined) {
        DOM.append(detailsContainer, $('div', undefined, localize(7006, null, numberFormatter.value.format(content.inputTokens))));
    }
    if (content.outputTokens !== undefined) {
        DOM.append(detailsContainer, $('div', undefined, localize(7007, null, numberFormatter.value.format(content.outputTokens))));
    }
    if (content.cachedTokens !== undefined) {
        DOM.append(detailsContainer, $('div', undefined, localize(7008, null, numberFormatter.value.format(content.cachedTokens))));
    }
    if (content.totalTokens !== undefined) {
        DOM.append(detailsContainer, $('div', undefined, localize(7009, null, numberFormatter.value.format(content.totalTokens))));
    }
    if (content.timeToFirstTokenInMillis !== undefined) {
        DOM.append(detailsContainer, $('div', undefined, localize(7010, null, numberFormatter.value.format(content.timeToFirstTokenInMillis))));
    }
    if (content.maxInputTokens !== undefined) {
        DOM.append(detailsContainer, $('div', undefined, localize(7011, null, numberFormatter.value.format(content.maxInputTokens))));
    }
    if (content.maxOutputTokens !== undefined) {
        DOM.append(detailsContainer, $('div', undefined, localize(7012, null, numberFormatter.value.format(content.maxOutputTokens))));
    }
    if (content.errorMessage) {
        DOM.append(detailsContainer, $('div.chat-debug-model-turn-error', undefined, localize(7013, null, content.errorMessage)));
    }
    // Collapsible sections (e.g., system prompt, user prompt, tools, response)
    if (content.sections && content.sections.length > 0) {
        const sectionsContainer = DOM.append(container, $('div.chat-debug-message-sections'));
        DOM.append(sectionsContainer, $('div.chat-debug-message-sections-label', undefined, localize(7014, null, content.sections.length)));
        for (const section of content.sections) {
            const { plainText, tokenizedHtml } = await tokenizeContent(section.content, languageService);
            renderSection(sectionsContainer, section.name, plainText, tokenizedHtml, disposables, false, clipboardService, scrollable);
        }
    }
    return { element: container, disposables };
}
/**
 * Convert a resolved model turn content to plain text for clipboard / editor output.
 */
export function modelTurnContentToPlainText(content) {
    const lines = [];
    lines.push(localize(7015, null, content.requestName));
    if (content.model) {
        lines.push(localize(7016, null, content.model));
    }
    if (content.status && content.status !== 'unknown') {
        lines.push(localize(7017, null, content.status));
    }
    if (content.durationInMillis !== undefined) {
        lines.push(localize(7018, null, numberFormatter.value.format(content.durationInMillis)));
    }
    if (content.timeToFirstTokenInMillis !== undefined) {
        lines.push(localize(7019, null, numberFormatter.value.format(content.timeToFirstTokenInMillis)));
    }
    if (content.inputTokens !== undefined) {
        lines.push(localize(7020, null, numberFormatter.value.format(content.inputTokens)));
    }
    if (content.outputTokens !== undefined) {
        lines.push(localize(7021, null, numberFormatter.value.format(content.outputTokens)));
    }
    if (content.cachedTokens !== undefined) {
        lines.push(localize(7022, null, numberFormatter.value.format(content.cachedTokens)));
    }
    if (content.totalTokens !== undefined) {
        lines.push(localize(7023, null, numberFormatter.value.format(content.totalTokens)));
    }
    if (content.maxInputTokens !== undefined) {
        lines.push(localize(7024, null, numberFormatter.value.format(content.maxInputTokens)));
    }
    if (content.maxOutputTokens !== undefined) {
        lines.push(localize(7025, null, numberFormatter.value.format(content.maxOutputTokens)));
    }
    if (content.errorMessage) {
        lines.push(localize(7026, null, content.errorMessage));
    }
    if (content.sections && content.sections.length > 0) {
        lines.push('');
        for (const section of content.sections) {
            lines.push(`--- ${section.name} ---`);
            lines.push(section.content);
            lines.push('');
        }
    }
    return lines.join('\n');
}
//# sourceMappingURL=chatDebugModelTurnContentRenderer.js.map