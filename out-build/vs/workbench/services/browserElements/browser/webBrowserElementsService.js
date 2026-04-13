/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { registerSingleton } from '../../../../platform/instantiation/common/extensions.js';
import { IBrowserElementsService } from './browserElementsService.js';
class WebBrowserElementsService {
    constructor() { }
    async getElementData(rect, token, locator) {
        throw new Error('Not implemented');
    }
    async getFocusedElementData(rect, token, locator) {
        throw new Error('Not implemented');
    }
    async startDebugSession(token, locator) {
        throw new Error('Not implemented');
    }
    async startConsoleSession(token, locator) {
        throw new Error('Not implemented');
    }
    async getConsoleLogs(locator) {
        throw new Error('Not implemented');
    }
}
registerSingleton(IBrowserElementsService, WebBrowserElementsService, 1 /* InstantiationType.Delayed */);
//# sourceMappingURL=webBrowserElementsService.js.map