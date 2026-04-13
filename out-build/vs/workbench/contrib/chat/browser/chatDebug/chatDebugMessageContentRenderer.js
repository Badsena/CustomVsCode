/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as DOM from '../../../../../base/browser/dom.js';
import { DisposableStore } from '../../../../../base/common/lifecycle.js';
import { localize } from '../../../../../nls.js';
import { renderSection, tokenizeContent } from './chatDebugToolCallContentRenderer.js';
const $ = DOM.$;
/**
 * Render a user message event with collapsible prompt sections.
 * JSON content in sections is syntax-highlighted.
 */
export async function renderUserMessageContent(event, languageService, clipboardService, scrollable) {
    const disposables = new DisposableStore();
    const container = $('div.chat-debug-message-content');
    container.tabIndex = 0;
    DOM.append(container, $('div.chat-debug-message-content-title', undefined, localize(6992, null)));
    DOM.append(container, $('div.chat-debug-message-content-summary', undefined, event.message));
    if (event.sections.length > 0) {
        const sectionsContainer = DOM.append(container, $('div.chat-debug-message-sections'));
        DOM.append(sectionsContainer, $('div.chat-debug-message-sections-label', undefined, localize(6993, null, event.sections.length)));
        for (const section of event.sections) {
            const { plainText, tokenizedHtml } = await tokenizeContent(section.content, languageService);
            renderSection(sectionsContainer, section.name, plainText, tokenizedHtml, disposables, false, clipboardService, scrollable);
        }
    }
    return { element: container, disposables };
}
/**
 * Render an agent response event with collapsible response sections.
 * JSON content in sections is syntax-highlighted.
 */
export async function renderAgentResponseContent(event, languageService, clipboardService, scrollable) {
    const disposables = new DisposableStore();
    const container = $('div.chat-debug-message-content');
    container.tabIndex = 0;
    DOM.append(container, $('div.chat-debug-message-content-title', undefined, localize(6994, null)));
    DOM.append(container, $('div.chat-debug-message-content-summary', undefined, event.message));
    if (event.sections.length > 0) {
        const sectionsContainer = DOM.append(container, $('div.chat-debug-message-sections'));
        DOM.append(sectionsContainer, $('div.chat-debug-message-sections-label', undefined, localize(6995, null, event.sections.length)));
        for (const section of event.sections) {
            const { plainText, tokenizedHtml } = await tokenizeContent(section.content, languageService);
            renderSection(sectionsContainer, section.name, plainText, tokenizedHtml, disposables, false, clipboardService, scrollable);
        }
    }
    return { element: container, disposables };
}
/**
 * Convert a user message or agent response event to plain text for clipboard / editor output.
 */
export function messageEventToPlainText(event) {
    const lines = [];
    const label = event.kind === 'userMessage' ? localize(6996, null) : localize(6997, null);
    lines.push(`${label}: ${event.message}`);
    lines.push('');
    for (const section of event.sections) {
        lines.push(`--- ${section.name} ---`);
        lines.push(section.content);
        lines.push('');
    }
    return lines.join('\n');
}
/**
 * Render a resolved message content (from resolveChatDebugLogEvent) with collapsible sections.
 * JSON content in sections is syntax-highlighted.
 */
export async function renderResolvedMessageContent(content, languageService, clipboardService, scrollable) {
    const disposables = new DisposableStore();
    const container = $('div.chat-debug-message-content');
    container.tabIndex = 0;
    const title = content.type === 'user'
        ? localize(6998, null)
        : localize(6999, null);
    DOM.append(container, $('div.chat-debug-message-content-title', undefined, title));
    DOM.append(container, $('div.chat-debug-message-content-summary', undefined, content.message));
    if (content.sections.length > 0) {
        const sectionsContainer = DOM.append(container, $('div.chat-debug-message-sections'));
        const label = content.type === 'user'
            ? localize(7000, null, content.sections.length)
            : localize(7001, null, content.sections.length);
        DOM.append(sectionsContainer, $('div.chat-debug-message-sections-label', undefined, label));
        for (const section of content.sections) {
            const { plainText, tokenizedHtml } = await tokenizeContent(section.content, languageService);
            renderSection(sectionsContainer, section.name, plainText, tokenizedHtml, disposables, false, clipboardService, scrollable);
        }
    }
    return { element: container, disposables };
}
/**
 * Convert a resolved message content to plain text.
 */
export function resolvedMessageToPlainText(content) {
    const lines = [];
    const label = content.type === 'user'
        ? localize(7002, null)
        : localize(7003, null);
    lines.push(`${label}: ${content.message}`);
    lines.push('');
    for (const section of content.sections) {
        lines.push(`--- ${section.name} ---`);
        lines.push(section.content);
        lines.push('');
    }
    return lines.join('\n');
}
//# sourceMappingURL=chatDebugMessageContentRenderer.js.map