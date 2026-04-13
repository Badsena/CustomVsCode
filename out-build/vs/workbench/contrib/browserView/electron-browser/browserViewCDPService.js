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
import { Disposable } from '../../../../base/common/lifecycle.js';
import { ProxyChannel } from '../../../../base/parts/ipc/common/ipc.js';
import { ipcBrowserViewGroupChannelName } from '../../../../platform/browserView/common/browserViewGroup.js';
import { BrowserViewUri } from '../../../../platform/browserView/common/browserViewUri.js';
import { IMainProcessService } from '../../../../platform/ipc/common/mainProcessService.js';
import { IEditorService } from '../../../services/editor/common/editorService.js';
import { IEditorGroupsService } from '../../../services/editor/common/editorGroupsService.js';
let BrowserViewCDPService = class BrowserViewCDPService extends Disposable {
    constructor(mainProcessService, editorService, editorGroupsService) {
        super();
        this.editorService = editorService;
        this.editorGroupsService = editorGroupsService;
        const channel = mainProcessService.getChannel(ipcBrowserViewGroupChannelName);
        this._groupService = ProxyChannel.toService(channel);
    }
    async createSessionGroup(browserId) {
        const windowId = this._getWindowIdForBrowser(browserId);
        const groupId = await this._groupService.createGroup(windowId);
        await this._groupService.addViewToGroup(groupId, browserId);
        return groupId;
    }
    async destroySessionGroup(groupId) {
        await this._groupService.destroyGroup(groupId);
    }
    async sendCDPMessage(groupId, message) {
        await this._groupService.sendCDPMessage(groupId, message);
    }
    onCDPMessage(groupId) {
        return this._groupService.onDynamicCDPMessage(groupId);
    }
    onDidDestroy(groupId) {
        return this._groupService.onDynamicDidDestroy(groupId);
    }
    _getWindowIdForBrowser(browserId) {
        const browserUri = BrowserViewUri.forId(browserId);
        const editors = this.editorService.findEditors(browserUri);
        if (editors.length > 0) {
            const group = this.editorGroupsService.getGroup(editors[0].groupId);
            if (group) {
                return group.windowId;
            }
        }
        // Fall back to main window
        return this.editorGroupsService.mainPart.windowId;
    }
};
BrowserViewCDPService = __decorate([
    __param(0, IMainProcessService),
    __param(1, IEditorService),
    __param(2, IEditorGroupsService)
], BrowserViewCDPService);
export { BrowserViewCDPService };
//# sourceMappingURL=browserViewCDPService.js.map