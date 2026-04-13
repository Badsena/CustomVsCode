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
export const ClickBrowserToolData = {
    id: 'click_element',
    toolReferenceName: 'clickElement',
    displayName: localize(5604, null),
    userDescription: localize(5605, null),
    modelDescription: 'Click on an element in a browser page.',
    icon: Codicon.cursor,
    source: ToolDataSource.Internal,
    inputSchema: {
        type: 'object',
        properties: {
            pageId: {
                type: 'string',
                description: `The browser page ID, acquired from context or the open tool.`
            },
            selector: {
                type: 'string',
                description: 'Playwright selector of the element to click.'
            },
            ref: {
                type: 'string',
                description: 'Element reference to click. One of "selector" or "ref" must be provided.'
            },
            dblClick: {
                type: 'boolean',
                description: 'Set to true for double clicks. Default is false.'
            },
            button: {
                type: 'string',
                enum: ['left', 'right', 'middle'],
                description: 'Mouse button to click with. Default is "left".'
            },
        },
        required: ['pageId'],
    },
};
let ClickBrowserTool = class ClickBrowserTool {
    constructor(playwrightService) {
        this.playwrightService = playwrightService;
    }
    async prepareToolInvocation(_context, _token) {
        return {
            invocationMessage: localize(5606, null),
            pastTenseMessage: localize(5607, null),
        };
    }
    async invoke(invocation, _countTokens, _progress, _token) {
        const params = invocation.parameters;
        if (!params.pageId) {
            return errorResult(`No page ID provided. Use '${OpenPageToolId}' first.`);
        }
        let selector = params.selector;
        if (params.ref) {
            selector = `aria-ref=${params.ref}`;
        }
        if (!selector) {
            return errorResult('Either a "selector" or "ref" parameter is required.');
        }
        const button = params.button ?? 'left';
        if (params.dblClick) {
            return playwrightInvoke(this.playwrightService, params.pageId, (page, sel, btn) => page.locator(sel).dblclick({ button: btn }), selector, button);
        }
        return playwrightInvoke(this.playwrightService, params.pageId, (page, sel, btn) => page.locator(sel).click({ button: btn }), selector, button);
    }
};
ClickBrowserTool = __decorate([
    __param(0, IPlaywrightService)
], ClickBrowserTool);
export { ClickBrowserTool };
//# sourceMappingURL=clickBrowserTool.js.map