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
import { mainWindow } from '../../../../base/browser/window.js';
import { ProxyChannel } from '../../../../base/parts/ipc/common/ipc.js';
import { IPlaywrightService } from '../../../../platform/browserView/common/playwrightService.js';
import { registerSharedProcessRemoteService } from '../../../../platform/ipc/electron-browser/services.js';
import { ILogService } from '../../../../platform/log/common/log.js';
let PlaywrightChannelClient = class PlaywrightChannelClient {
    constructor(channel, logService) {
        /**
         * send the current window's ID once via `__initialize`, so the server-side {@link PlaywrightChannel}
         * can create a per-window {@link PlaywrightWindowInstance}. All subsequent calls and events are proxied directly.
         */
        void channel.call('__initialize', mainWindow.vscodeWindowId).catch((e) => {
            logService.error(`Failed to initialize Playwright service`, e);
        });
        return ProxyChannel.toService(channel);
    }
};
PlaywrightChannelClient = __decorate([
    __param(1, ILogService)
], PlaywrightChannelClient);
registerSharedProcessRemoteService(IPlaywrightService, 'playwright', { channelClientCtor: PlaywrightChannelClient });
//# sourceMappingURL=playwrightWorkbenchService.js.map