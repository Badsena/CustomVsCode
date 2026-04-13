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
import { URI } from '../../../../../../base/common/uri.js';
import { localize } from '../../../../../../nls.js';
import { IFileService } from '../../../../../../platform/files/common/files.js';
import { ToolDataSource, ToolInvocationPresentation } from '../languageModelToolsService.js';
import { IChatArtifactsService } from '../chatArtifactsService.js';
import { MarkdownString } from '../../../../../../base/common/htmlContent.js';
export const SetArtifactsToolId = 'setArtifacts';
const inputSchema = {
    type: 'object',
    properties: {
        artifacts: {
            type: 'array',
            description: 'The complete list of artifacts for this session. Overwrites any existing artifacts.',
            items: {
                type: 'object',
                properties: {
                    label: {
                        type: 'string',
                        description: 'Display label for the artifact.'
                    },
                    uri: {
                        type: 'string',
                        description: 'Fully qualified URI of the artifact (e.g. https://localhost:3000 or file:///path/to/file). Must include the scheme.'
                    },
                    type: {
                        type: 'string',
                        enum: ['devServer', 'screenshot', 'plan'],
                        description: 'The type of artifact.'
                    }
                },
                required: ['label']
            }
        }
    },
    required: ['artifacts']
};
export const SetArtifactsToolData = {
    id: SetArtifactsToolId,
    displayName: localize(8941, null),
    modelDescription: 'Set the list of artifacts for the current session. Each artifact has a label and either a uri or a toolCallId+dataPartIndex reference, plus an optional type (devServer, screenshot, plan). This overwrites the entire artifact list. Use this to surface important links, screenshots, plans, drafts, or temporary markdown documents to the user. URIs must be fully qualified with a scheme (e.g. https://localhost:3000, file:///tmp/plan.md). To reference a screenshot or image from a previous tool result, use toolCallId and dataPartIndex instead of uri.',
    canBeReferencedInPrompt: true,
    source: ToolDataSource.Internal,
    inputSchema
};
let SetArtifactsTool = class SetArtifactsTool {
    constructor(_chatArtifactsService, _fileService) {
        this._chatArtifactsService = _chatArtifactsService;
        this._fileService = _fileService;
    }
    async prepareToolInvocation(_context, _token) {
        return {
            pastTenseMessage: new MarkdownString(localize(8942, null)),
            presentation: ToolInvocationPresentation.Hidden,
        };
    }
    async invoke(invocation, _countTokens, _progress, _token) {
        const args = invocation.parameters;
        const chatSessionResource = invocation.context?.sessionResource;
        if (!chatSessionResource) {
            return {
                content: [{ kind: 'text', value: 'Error: No session resource available' }]
            };
        }
        const artifacts = [];
        for (const a of args.artifacts ?? []) {
            let uri = a.uri;
            if (!uri) {
                uri = '';
            }
            if (uri) {
                const parsed = URI.parse(uri);
                if (parsed.scheme !== 'http' && parsed.scheme !== 'https') {
                    if (!await this._fileService.exists(parsed)) {
                        throw new Error(localize(8943, null, uri));
                    }
                }
            }
            artifacts.push({ label: a.label, uri, type: a.type });
        }
        this._chatArtifactsService.setArtifacts(chatSessionResource, artifacts);
        return {
            content: [{ kind: 'text', value: localize(8944, null, artifacts.length) }]
        };
    }
};
SetArtifactsTool = __decorate([
    __param(0, IChatArtifactsService),
    __param(1, IFileService)
], SetArtifactsTool);
export { SetArtifactsTool };
//# sourceMappingURL=setArtifactsTool.js.map