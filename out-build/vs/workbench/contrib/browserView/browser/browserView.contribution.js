/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { registerSingleton } from '../../../../platform/instantiation/common/extensions.js';
import { IBrowserViewWorkbenchService, IBrowserViewCDPService } from '../common/browserView.js';
import { Event } from '../../../../base/common/event.js';
class WebBrowserViewWorkbenchService {
    async getOrCreateBrowserViewModel(_id) {
        throw new Error('Integrated Browser is not available in web.');
    }
    async getBrowserViewModel(_id) {
        throw new Error('Integrated Browser is not available in web.');
    }
    async clearGlobalStorage() { }
    async clearWorkspaceStorage() { }
}
class WebBrowserViewCDPService {
    async createSessionGroup(_browserId) {
        throw new Error('Integrated Browser is not available in web.');
    }
    async destroySessionGroup(_groupId) { }
    async sendCDPMessage(_groupId, _message) { }
    onCDPMessage(_groupId) {
        return Event.None;
    }
    onDidDestroy(_groupId) {
        return Event.None;
    }
}
registerSingleton(IBrowserViewWorkbenchService, WebBrowserViewWorkbenchService, 1 /* InstantiationType.Delayed */);
registerSingleton(IBrowserViewCDPService, WebBrowserViewCDPService, 1 /* InstantiationType.Delayed */);
//# sourceMappingURL=browserView.contribution.js.map