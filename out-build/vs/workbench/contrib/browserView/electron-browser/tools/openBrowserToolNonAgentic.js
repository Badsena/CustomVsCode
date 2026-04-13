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
import { localize } from '../../../../../nls.js';
import { logBrowserOpen } from '../../../../../platform/browserView/common/browserViewTelemetry.js';
import { BrowserViewUri } from '../../../../../platform/browserView/common/browserViewUri.js';
import { generateUuid } from '../../../../../base/common/uuid.js';
import { ITelemetryService } from '../../../../../platform/telemetry/common/telemetry.js';
import { IEditorService } from '../../../../services/editor/common/editorService.js';
import { OpenBrowserToolData } from './openBrowserTool.js';
export const OpenBrowserToolNonAgenticData = {
    ...OpenBrowserToolData,
    modelDescription: 'Open a new browser page in the integrated browser at the given URL.',
};
let OpenBrowserToolNonAgentic = class OpenBrowserToolNonAgentic {
    constructor(telemetryService, editorService) {
        this.telemetryService = telemetryService;
        this.editorService = editorService;
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
            invocationMessage: localize(5638, null, parsed.href),
            pastTenseMessage: localize(5639, null, parsed.href),
            confirmationMessages: {
                title: localize(5640, null),
                message: localize(5641, null, parsed.href),
                allowAutoConfirm: true,
            },
        };
    }
    async invoke(invocation, _countTokens, _progress, _token) {
        const params = invocation.parameters;
        logBrowserOpen(this.telemetryService, 'chatTool');
        const browserUri = BrowserViewUri.forId(generateUuid());
        await this.editorService.openEditor({ resource: browserUri, options: { pinned: true, viewState: { url: params.url } } });
        return {
            content: [{
                    kind: 'text',
                    value: `Page opened successfully. Note that you do not have access to the page contents unless the user enables agentic tools via the \`workbench.browser.enableChatTools\` setting.`,
                }]
        };
    }
};
OpenBrowserToolNonAgentic = __decorate([
    __param(0, ITelemetryService),
    __param(1, IEditorService)
], OpenBrowserToolNonAgentic);
export { OpenBrowserToolNonAgentic };
//# sourceMappingURL=openBrowserToolNonAgentic.js.map