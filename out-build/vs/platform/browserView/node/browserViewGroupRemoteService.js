/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Event } from '../../../base/common/event.js';
import { Disposable } from '../../../base/common/lifecycle.js';
import { ProxyChannel } from '../../../base/parts/ipc/common/ipc.js';
import { ipcBrowserViewGroupChannelName } from '../common/browserViewGroup.js';
/**
 * Remote proxy for a browser view group living in the main process.
 */
class RemoteBrowserViewGroup extends Disposable {
    constructor(id, groupService) {
        super();
        this.id = id;
        this.groupService = groupService;
        this._register(groupService.onDynamicDidDestroy(this.id)(() => {
            // Avoid loops
            this.dispose(true);
        }));
    }
    get onDidAddView() {
        return this.groupService.onDynamicDidAddView(this.id);
    }
    get onDidRemoveView() {
        return this.groupService.onDynamicDidRemoveView(this.id);
    }
    get onDidDestroy() {
        return this.groupService.onDynamicDidDestroy(this.id);
    }
    async addView(viewId) {
        return this.groupService.addViewToGroup(this.id, viewId);
    }
    async removeView(viewId) {
        return this.groupService.removeViewFromGroup(this.id, viewId);
    }
    async sendCDPMessage(msg) {
        return this.groupService.sendCDPMessage(this.id, msg);
    }
    get onCDPMessage() {
        return this.groupService.onDynamicCDPMessage(this.id);
    }
    dispose(fromService = false) {
        if (!fromService) {
            this.groupService.destroyGroup(this.id);
        }
        super.dispose();
    }
}
export class BrowserViewGroupRemoteService {
    constructor(mainProcessService) {
        this._groups = new Map();
        const channel = mainProcessService.getChannel(ipcBrowserViewGroupChannelName);
        this._groupService = ProxyChannel.toService(channel);
    }
    async createGroup(windowId) {
        const id = await this._groupService.createGroup(windowId);
        return this._wrap(id);
    }
    _wrap(id) {
        const group = new RemoteBrowserViewGroup(id, this._groupService);
        this._groups.set(id, group);
        Event.once(group.onDidDestroy)(() => {
            this._groups.delete(id);
        });
        return group;
    }
}
//# sourceMappingURL=browserViewGroupRemoteService.js.map