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
export const OpenPageToolId = 'open_browser_page';
export const OpenBrowserToolData = {
    id: OpenPageToolId,
    toolReferenceName: 'openBrowserPage',
    displayName: localize(5632, null),
    userDescription: localize(5633, null),
    modelDescription: 'Open a new browser page in the integrated browser at the given URL. Returns a page ID that must be used with other browser tools to interact with the page. Prefer to reuse existing pages whenever possible and only call this tool if a new page is necessary.',
    icon: Codicon.openInProduct,
    source: ToolDataSource.Internal,
    inputSchema: {
        type: 'object',
        properties: {
            url: {
                type: 'string',
                description: 'The full URL to open in the browser.'
            },
        },
        required: ['url'],
    },
};
let OpenBrowserTool = class OpenBrowserTool {
    constructor(playwrightService) {
        this.playwrightService = playwrightService;
    }
    async prepareToolInvocation(context, _token) {
        const params = context.parameters;
        if (!params.url) {
            throw new Error('The "url" parameter is required.');
        }
        const parsed = URL.parse(params.url);
        if (!parsed) {
            throw new Error('You must provide a complete, valid URL.');
        }
        return {
            invocationMessage: localize(5634, null, parsed.href),
            pastTenseMessage: localize(5635, null, parsed.href),
            confirmationMessages: {
                title: localize(5636, null),
                message: localize(5637, null, parsed.href),
                allowAutoConfirm: true,
            },
        };
    }
    async invoke(invocation, _countTokens, _progress, _token) {
        const params = invocation.parameters;
        const { pageId, summary } = await this.playwrightService.openPage(params.url);
        return {
            content: [{
                    kind: 'text',
                    value: `Page ID: ${pageId}\n${summary}`,
                }],
        };
    }
};
OpenBrowserTool = __decorate([
    __param(0, IPlaywrightService)
], OpenBrowserTool);
export { OpenBrowserTool };
//# sourceMappingURL=openBrowserTool.js.map