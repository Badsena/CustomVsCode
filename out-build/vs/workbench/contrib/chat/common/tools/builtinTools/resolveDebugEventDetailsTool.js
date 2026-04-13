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
import { localize } from '../../../../../../nls.js';
import { ChatContextKeys } from '../../actions/chatContextKeys.js';
import { ChatDebugHookResult, IChatDebugService } from '../../chatDebugService.js';
import { ToolDataSource } from '../languageModelToolsService.js';
export const ResolveDebugEventDetailsToolId = 'vscode_resolveDebugEventDetails_internal';
export const ResolveDebugEventDetailsToolData = {
    id: ResolveDebugEventDetailsToolId,
    toolReferenceName: 'resolveDebugEventDetails',
    displayName: localize(8898, null),
    when: ChatContextKeys.chatSessionHasDebugTools,
    canBeReferencedInPrompt: false,
    modelDescription: 'Resolves the full details for a specific chat debug event by its event ID. Use this tool to get detailed information about a debug event such as tool call input/output, model turn details, user message sections, or file lists. The event ID can be found in the debug event log summary provided in the conversation context.',
    source: ToolDataSource.Internal,
    inputSchema: {
        type: 'object',
        properties: {
            eventId: {
                type: 'string',
                description: 'The ID of the debug event to resolve details for.',
            },
        },
        required: ['eventId'],
    },
};
function formatResolvedContent(content) {
    switch (content.kind) {
        case 'text':
            return content.value;
        case 'fileList': {
            const lines = [localize(8899, null, content.discoveryType)];
            if (content.sourceFolders) {
                for (const folder of content.sourceFolders) {
                    lines.push(localize(8900, null, folder.uri.toString(), folder.storage));
                }
            }
            for (const file of content.files) {
                const status = file.status === 'loaded'
                    ? localize(8901, null)
                    : file.skipReason
                        ? localize(8902, null, file.skipReason)
                        : localize(8903, null);
                lines.push(`  ${file.uri.toString()} [${status}]`);
            }
            return lines.join('\n');
        }
        case 'message': {
            const messageType = content.type === 'user'
                ? localize(8904, null, content.message)
                : localize(8905, null, content.message);
            const lines = [messageType];
            for (const section of content.sections) {
                lines.push(`--- ${section.name} ---`);
                lines.push(section.content);
            }
            return lines.join('\n');
        }
        case 'toolCall': {
            const lines = [localize(8906, null, content.toolName)];
            if (content.result) {
                lines.push(localize(8907, null, content.result));
            }
            if (content.durationInMillis !== undefined) {
                lines.push(localize(8908, null, content.durationInMillis));
            }
            if (content.input) {
                lines.push(localize(8909, null) + '\n' + content.input);
            }
            if (content.output) {
                lines.push(localize(8910, null) + '\n' + content.output);
            }
            return lines.join('\n');
        }
        case 'modelTurn': {
            const lines = [localize(8911, null, content.requestName)];
            if (content.model) {
                lines.push(localize(8912, null, content.model));
            }
            if (content.status) {
                lines.push(localize(8913, null, content.status));
            }
            if (content.durationInMillis !== undefined) {
                lines.push(localize(8914, null, content.durationInMillis));
            }
            if (content.inputTokens !== undefined || content.outputTokens !== undefined) {
                lines.push(localize(8915, null, content.inputTokens ?? '?', content.outputTokens ?? '?', content.cachedTokens ?? '?', content.totalTokens ?? '?'));
            }
            if (content.errorMessage) {
                lines.push(localize(8916, null, content.errorMessage));
            }
            if (content.sections) {
                for (const section of content.sections) {
                    lines.push(`--- ${section.name} ---`);
                    lines.push(section.content);
                }
            }
            return lines.join('\n');
        }
        case 'hook': {
            const lines = [localize(8917, null, content.hookType)];
            if (content.command) {
                lines.push(localize(8918, null, content.command));
            }
            if (content.result !== undefined) {
                const resultText = content.result === ChatDebugHookResult.Success
                    ? localize(8919, null)
                    : content.result === ChatDebugHookResult.Error
                        ? localize(8920, null)
                        : localize(8921, null);
                lines.push(localize(8922, null, resultText));
            }
            if (content.exitCode !== undefined) {
                lines.push(localize(8923, null, content.exitCode));
            }
            if (content.durationInMillis !== undefined) {
                lines.push(localize(8924, null, content.durationInMillis));
            }
            if (content.input) {
                lines.push(localize(8925, null) + '\n' + content.input);
            }
            if (content.output) {
                lines.push(localize(8926, null) + '\n' + content.output);
            }
            if (content.errorMessage) {
                lines.push(localize(8927, null, content.errorMessage));
            }
            return lines.join('\n');
        }
        default: {
            const _ = content;
            return JSON.stringify(_);
        }
    }
}
function truncate(text, maxLength = 30) {
    if (text.length <= maxLength) {
        return text;
    }
    const lastSpace = text.lastIndexOf(' ', maxLength);
    const cutoff = lastSpace > maxLength / 2 ? lastSpace : maxLength;
    return text.substring(0, cutoff) + '\u2026';
}
function getEventLabel(event) {
    switch (event.kind) {
        case 'generic': return event.name;
        case 'toolCall': return event.toolName;
        case 'modelTurn': return event.requestName ?? localize(8928, null);
        case 'userMessage': return localize(8929, null, truncate(event.message));
        case 'agentResponse': return localize(8930, null, truncate(event.message));
        case 'subagentInvocation': return event.agentName;
    }
}
let ResolveDebugEventDetailsTool = class ResolveDebugEventDetailsTool {
    constructor(chatDebugService) {
        this.chatDebugService = chatDebugService;
    }
    async prepareToolInvocation(context, _token) {
        const eventId = context.parameters?.eventId;
        let eventLabel;
        if (typeof eventId === 'string' && context.chatSessionResource) {
            const events = this.chatDebugService.getEvents(context.chatSessionResource);
            const event = events.find(e => e.id === eventId);
            if (event) {
                eventLabel = getEventLabel(event);
            }
        }
        if (eventLabel) {
            return {
                invocationMessage: localize(8931, null, eventLabel),
                pastTenseMessage: localize(8932, null, eventLabel),
            };
        }
        return {
            invocationMessage: localize(8933, null),
            pastTenseMessage: localize(8934, null),
        };
    }
    async invoke(invocation, _countTokens, _progress, _token) {
        const eventId = invocation.parameters['eventId'];
        if (typeof eventId !== 'string' || !eventId) {
            return {
                content: [{ kind: 'text', value: localize(8935, null) }],
            };
        }
        const sessionResource = invocation.context?.sessionResource;
        if (!sessionResource) {
            return {
                content: [{ kind: 'text', value: localize(8936, null) }],
            };
        }
        const sessionEvents = this.chatDebugService.getEvents(sessionResource);
        if (!sessionEvents.some(e => e.id === eventId)) {
            return {
                content: [{ kind: 'text', value: localize(8937, null, eventId) }],
            };
        }
        const resolved = await this.chatDebugService.resolveEvent(eventId);
        if (!resolved) {
            return {
                content: [{ kind: 'text', value: localize(8938, null, eventId) }],
            };
        }
        return {
            content: [{ kind: 'text', value: formatResolvedContent(resolved) }],
        };
    }
};
ResolveDebugEventDetailsTool = __decorate([
    __param(0, IChatDebugService)
], ResolveDebugEventDetailsTool);
export { ResolveDebugEventDetailsTool };
//# sourceMappingURL=resolveDebugEventDetailsTool.js.map