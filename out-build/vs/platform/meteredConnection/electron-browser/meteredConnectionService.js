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
import { toDisposable } from '../../../base/common/lifecycle.js';
import { IConfigurationService } from '../../configuration/common/configuration.js';
import { registerSingleton } from '../../instantiation/common/extensions.js';
import { IMainProcessService } from '../../ipc/common/mainProcessService.js';
import { AbstractMeteredConnectionService, getIsBrowserConnectionMetered, IMeteredConnectionService } from '../common/meteredConnection.js';
import { METERED_CONNECTION_CHANNEL, MeteredConnectionCommand } from '../common/meteredConnectionIpc.js';
/**
 * Electron-browser implementation of the metered connection service.
 * This implementation monitors navigator.connection and reports changes to the main process via IPC channel.
 */
let NativeMeteredConnectionService = class NativeMeteredConnectionService extends AbstractMeteredConnectionService {
    constructor(configurationService, mainProcessService) {
        super(configurationService, getIsBrowserConnectionMetered());
        this._channel = mainProcessService.getChannel(METERED_CONNECTION_CHANNEL);
        const connection = navigator.connection;
        if (connection) {
            const onChange = () => this.setIsBrowserConnectionMetered(getIsBrowserConnectionMetered());
            connection.addEventListener('change', onChange);
            this._register(toDisposable(() => connection.removeEventListener('change', onChange)));
        }
    }
    /**
     * Notify the main process about changes to the navigator connection state.
     */
    onChangeBrowserConnection() {
        super.onChangeBrowserConnection();
        this._channel.call(MeteredConnectionCommand.SetIsBrowserConnectionMetered, this.isBrowserConnectionMetered);
    }
};
NativeMeteredConnectionService = __decorate([
    __param(0, IConfigurationService),
    __param(1, IMainProcessService)
], NativeMeteredConnectionService);
export { NativeMeteredConnectionService };
registerSingleton(IMeteredConnectionService, NativeMeteredConnectionService, 1 /* InstantiationType.Delayed */);
//# sourceMappingURL=meteredConnectionService.js.map