/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { localize } from '../../../../../nls.js';
import { safeIntl } from '../../../../../base/common/date.js';
const numberFormatter = safeIntl.NumberFormat();
/**
 * Format the detail text for a debug event (used when no resolved content is available).
 */
export function formatEventDetail(event) {
    switch (event.kind) {
        case 'toolCall': {
            const parts = [localize(6874, null, event.toolName)];
            if (event.toolCallId) {
                parts.push(localize(6875, null, event.toolCallId));
            }
            if (event.result) {
                parts.push(localize(6876, null, event.result));
            }
            if (event.durationInMillis !== undefined) {
                parts.push(localize(6877, null, numberFormatter.value.format(event.durationInMillis)));
            }
            if (event.input) {
                parts.push(`\n${localize(6878, null)}\n${event.input}`);
            }
            if (event.output) {
                parts.push(`\n${localize(6879, null)}\n${event.output}`);
            }
            return parts.join('\n');
        }
        case 'modelTurn': {
            const parts = [event.model ?? localize(6880, null)];
            if (event.inputTokens !== undefined) {
                parts.push(localize(6881, null, numberFormatter.value.format(event.inputTokens)));
            }
            if (event.outputTokens !== undefined) {
                parts.push(localize(6882, null, numberFormatter.value.format(event.outputTokens)));
            }
            if (event.totalTokens !== undefined) {
                parts.push(localize(6883, null, numberFormatter.value.format(event.totalTokens)));
            }
            if (event.durationInMillis !== undefined) {
                parts.push(localize(6884, null, numberFormatter.value.format(event.durationInMillis)));
            }
            return parts.join('\n');
        }
        case 'generic':
            return `${event.name}\n${event.details ?? ''}`;
        case 'subagentInvocation': {
            const parts = [localize(6885, null, event.agentName)];
            if (event.description) {
                parts.push(localize(6886, null, event.description));
            }
            if (event.status) {
                parts.push(localize(6887, null, event.status));
            }
            if (event.durationInMillis !== undefined) {
                parts.push(localize(6888, null, numberFormatter.value.format(event.durationInMillis)));
            }
            if (event.toolCallCount !== undefined) {
                parts.push(localize(6889, null, numberFormatter.value.format(event.toolCallCount)));
            }
            if (event.modelTurnCount !== undefined) {
                parts.push(localize(6890, null, numberFormatter.value.format(event.modelTurnCount)));
            }
            return parts.join('\n');
        }
        case 'userMessage': {
            const parts = [localize(6891, null, event.message)];
            for (const section of event.sections) {
                parts.push(`\n--- ${section.name} ---\n${section.content}`);
            }
            return parts.join('\n');
        }
        case 'agentResponse': {
            const parts = [localize(6892, null, event.message)];
            for (const section of event.sections) {
                parts.push(`\n--- ${section.name} ---\n${section.content}`);
            }
            return parts.join('\n');
        }
    }
}
//# sourceMappingURL=chatDebugEventDetailRenderer.js.map