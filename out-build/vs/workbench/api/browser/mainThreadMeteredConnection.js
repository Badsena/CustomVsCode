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
import { Disposable } from '../../../base/common/lifecycle.js';
import { IMeteredConnectionService } from '../../../platform/meteredConnection/common/meteredConnection.js';
import { extHostNamedCustomer } from '../../services/extensions/common/extHostCustomers.js';
import { ExtHostContext, MainContext } from '../common/extHost.protocol.js';
let MainThreadMeteredConnection = class MainThreadMeteredConnection extends Disposable {
    constructor(extHostContext, meteredConnectionService) {
        super();
        this.meteredConnectionService = meteredConnectionService;
        this._proxy = extHostContext.getProxy(ExtHostContext.ExtHostMeteredConnection);
        // Send initial value
        this._proxy.$initializeIsConnectionMetered(this.meteredConnectionService.isConnectionMetered);
        // Listen for changes and forward to extension host
        this._register(this.meteredConnectionService.onDidChangeIsConnectionMetered(isMetered => {
            this._proxy.$onDidChangeIsConnectionMetered(isMetered);
        }));
    }
};
MainThreadMeteredConnection = __decorate([
    extHostNamedCustomer(MainContext.MainThreadMeteredConnection),
    __param(1, IMeteredConnectionService)
], MainThreadMeteredConnection);
export { MainThreadMeteredConnection };
//# sourceMappingURL=mainThreadMeteredConnection.js.map