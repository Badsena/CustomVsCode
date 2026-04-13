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
import { Codicon } from '../../../../../base/common/codicons.js';
import { localize } from '../../../../../nls.js';
import { IPlaywrightService } from '../../../../../platform/browserView/common/playwrightService.js';
import { ToolDataSource } from '../../../chat/common/tools/languageModelToolsService.js';
import { errorResult, playwrightInvoke } from './browserToolHelpers.js';
import { OpenPageToolId } from './openBrowserTool.js';
export const NavigateBrowserToolData = {
    id: 'navigate_page',
    toolReferenceName: 'navigatePage',
    displayName: localize(5620, null),
    userDescription: localize(5621, null),
    modelDescription: 'Navigate a browser page by URL, history, or reload.',
    icon: Codicon.arrowRight,
    source: ToolDataSource.Internal,
    inputSchema: {
        type: 'object',
        properties: {
            pageId: {
                type: 'string',
                description: `The browser page ID to navigate, acquired from context or the open tool.`
            },
            type: {
                type: 'string',
                enum: ['url', 'back', 'forward', 'reload'],
                description: 'Navigation type: "url" to navigate to a URL (default, requires "url" param), "back" or "forward" for history, "reload" to refresh.'
            },
            url: {
                type: 'string',
                description: 'The URL to navigate to. Required when type is "url".'
            },
        },
        required: ['pageId'],
    },
};
let NavigateBrowserTool = class NavigateBrowserTool {
    constructor(playwrightService) {
        this.playwrightService = playwrightService;
    }
    async prepareToolInvocation(context, _token) {
        const params = context.parameters;
        switch (params.type) {
            case 'reload':
                return {
                    invocationMessage: localize(5622, null),
                    pastTenseMessage: localize(5623, null),
                };
            case 'back':
                return {
                    invocationMessage: localize(5624, null),
                    pastTenseMessage: localize(5625, null),
                };
            case 'forward':
                return {
                    invocationMessage: localize(5626, null),
                    pastTenseMessage: localize(5627, null),
                };
            default: {
                if (!params.url) {
                    throw new Error('The "url" parameter is required when type is "url".');
                }
                const parsed = URL.parse(params.url);
                if (!parsed) {
                    throw new Error('You must provide a complete, valid URL.');
                }
                return {
                    invocationMessage: localize(5628, null, parsed.href),
                    pastTenseMessage: localize(5629, null, parsed.href),
                    confirmationMessages: {
                        title: localize(5630, null),
                        message: localize(5631, null, parsed.href),
                        allowAutoConfirm: true,
                    },
                };
            }
        }
    }
    async invoke(invocation, _countTokens, _progress, _token) {
        const params = invocation.parameters;
        if (!params.pageId) {
            return errorResult(`No page ID provided. Use '${OpenPageToolId}' first.`);
        }
        switch (params.type) {
            case 'reload':
                return playwrightInvoke(this.playwrightService, params.pageId, (page) => page.reload({ waitUntil: 'domcontentloaded' }));
            case 'back':
                return playwrightInvoke(this.playwrightService, params.pageId, (page) => page.goBack({ waitUntil: 'domcontentloaded' }));
            case 'forward':
                return playwrightInvoke(this.playwrightService, params.pageId, (page) => page.goForward({ waitUntil: 'domcontentloaded' }));
            default: {
                return playwrightInvoke(this.playwrightService, params.pageId, (page, url) => {
                    return page.goto(url, { waitUntil: 'domcontentloaded' });
                }, params.url);
            }
        }
    }
};
NavigateBrowserTool = __decorate([
    __param(0, IPlaywrightService)
], NavigateBrowserTool);
export { NavigateBrowserTool };
//# sourceMappingURL=navigateBrowserTool.js.map