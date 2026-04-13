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
export const TypeBrowserToolData = {
    id: 'type_in_page',
    toolReferenceName: 'typeInPage',
    displayName: localize(5657, null),
    userDescription: localize(5658, null),
    modelDescription: 'Type text or press keys in a browser page.',
    icon: Codicon.symbolText,
    source: ToolDataSource.Internal,
    inputSchema: {
        type: 'object',
        properties: {
            pageId: {
                type: 'string',
                description: `The browser page ID, acquired from context or the open tool.`
            },
            text: {
                type: 'string',
                description: 'The text to type. One of "text" or "key" must be provided.'
            },
            key: {
                type: 'string',
                description: 'A key or key combination to press (e.g., "Enter", "Tab", "Control+c"). One of "text" or "key" must be provided.'
            },
            selector: {
                type: 'string',
                description: 'Playwright selector of element to target. If omitted, types into the focused element.'
            },
            ref: {
                type: 'string',
                description: 'Element reference to target. If omitted, types into the focused element.'
            },
        },
        required: ['pageId'],
    },
};
let TypeBrowserTool = class TypeBrowserTool {
    constructor(playwrightService) {
        this.playwrightService = playwrightService;
    }
    async prepareToolInvocation(context, _token) {
        const params = context.parameters;
        if (params.key) {
            return {
                invocationMessage: localize(5659, null, params.key),
                pastTenseMessage: localize(5660, null, params.key),
            };
        }
        return {
            invocationMessage: localize(5661, null),
            pastTenseMessage: localize(5662, null),
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
        if (!params.text && !params.key) {
            return errorResult('Either a "text" or "key" parameter is required.');
        }
        // Press key
        if (params.key) {
            if (selector) {
                return playwrightInvoke(this.playwrightService, params.pageId, (page, sel, key) => page.locator(sel).press(key), selector, params.key);
            }
            return playwrightInvoke(this.playwrightService, params.pageId, (page, key) => page.keyboard.press(key), params.key);
        }
        // Type text
        if (selector) {
            return playwrightInvoke(this.playwrightService, params.pageId, (page, sel, text) => page.locator(sel).fill(text), selector, params.text);
        }
        return playwrightInvoke(this.playwrightService, params.pageId, (page, text) => page.keyboard.type(text), params.text);
    }
};
TypeBrowserTool = __decorate([
    __param(0, IPlaywrightService)
], TypeBrowserTool);
export { TypeBrowserTool };
//# sourceMappingURL=typeBrowserTool.js.map