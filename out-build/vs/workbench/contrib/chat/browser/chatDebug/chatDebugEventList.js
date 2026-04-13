/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as DOM from '../../../../../base/browser/dom.js';
import { localize } from '../../../../../nls.js';
import { ChatDebugLogLevel } from '../../common/chatDebugService.js';
import { safeIntl } from '../../../../../base/common/date.js';
const $ = DOM.$;
/** Coerce a value to a string, returning a fallback for null/undefined/non-strings. */
function safeStr(value, fallback = '') {
    if (value === null || value === undefined || typeof value !== 'string') {
        return fallback;
    }
    return value;
}
const dateFormatter = safeIntl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
});
const numberFormatter = safeIntl.NumberFormat();
/** Returns the formatted creation timestamp for a debug event. */
export function getEventCreatedText(element) {
    return dateFormatter.value.format(element.created);
}
/** Returns the display name for a debug event. */
export function getEventNameText(element) {
    switch (element.kind) {
        case 'toolCall': return safeStr(element.toolName, localize(6893, null));
        case 'modelTurn': return safeStr(element.model) || localize(6894, null);
        case 'generic': return safeStr(element.name, localize(6895, null));
        case 'subagentInvocation': return safeStr(element.agentName, localize(6896, null));
        case 'userMessage': return localize(6897, null);
        case 'agentResponse': return localize(6898, null);
    }
}
/** Returns the details text for a debug event. */
export function getEventDetailsText(element) {
    switch (element.kind) {
        case 'toolCall': return safeStr(element.result);
        case 'modelTurn': return [
            safeStr(element.requestName),
            element.totalTokens !== undefined ? localize(6899, null, numberFormatter.value.format(element.totalTokens)) : '',
        ].filter(Boolean).join(' \u00b7 ');
        case 'generic': return safeStr(element.details);
        case 'subagentInvocation': return safeStr(element.description) || safeStr(element.status);
        case 'userMessage': return safeStr(element.message);
        case 'agentResponse': return safeStr(element.message);
    }
}
function renderEventToTemplate(element, templateData) {
    templateData.created.textContent = getEventCreatedText(element);
    templateData.name.textContent = getEventNameText(element);
    templateData.details.textContent = getEventDetailsText(element);
    const isError = element.kind === 'generic' && element.level === ChatDebugLogLevel.Error
        || element.kind === 'toolCall' && element.result === 'error';
    const isWarning = element.kind === 'generic' && element.level === ChatDebugLogLevel.Warning;
    const isTrace = element.kind === 'generic' && element.level === ChatDebugLogLevel.Trace;
    templateData.container.classList.toggle('chat-debug-log-error', isError);
    templateData.container.classList.toggle('chat-debug-log-warning', isWarning);
    templateData.container.classList.toggle('chat-debug-log-trace', isTrace);
}
function createEventTemplate(container) {
    container.classList.add('chat-debug-log-row');
    const created = DOM.append(container, $('span.chat-debug-log-created'));
    const name = DOM.append(container, $('span.chat-debug-log-name'));
    const details = DOM.append(container, $('span.chat-debug-log-details'));
    return { container, created, name, details };
}
export class ChatDebugEventRenderer {
    static { this.TEMPLATE_ID = 'chatDebugEvent'; }
    get templateId() {
        return ChatDebugEventRenderer.TEMPLATE_ID;
    }
    renderTemplate(container) {
        return createEventTemplate(container);
    }
    renderElement(element, index, templateData) {
        renderEventToTemplate(element, templateData);
    }
    disposeTemplate(_templateData) {
        // noop
    }
}
export class ChatDebugEventDelegate {
    getHeight(_element) {
        return 28;
    }
    getTemplateId(_element) {
        return ChatDebugEventRenderer.TEMPLATE_ID;
    }
}
export class ChatDebugEventTreeRenderer {
    static { this.TEMPLATE_ID = 'chatDebugEvent'; }
    get templateId() {
        return ChatDebugEventTreeRenderer.TEMPLATE_ID;
    }
    renderTemplate(container) {
        return createEventTemplate(container);
    }
    renderElement(node, index, templateData) {
        renderEventToTemplate(node.element, templateData);
    }
    disposeTemplate(_templateData) {
        // noop
    }
}
//# sourceMappingURL=chatDebugEventList.js.map