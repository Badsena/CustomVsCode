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
import { AbstractMeteredConnectionService, getIsBrowserConnectionMetered, IMeteredConnectionService } from '../common/meteredConnection.js';
/**
 * Browser implementation of the metered connection service.
 * This implementation monitors navigator.connection for changes.
 */
let MeteredConnectionService = class MeteredConnectionService extends AbstractMeteredConnectionService {
    constructor(configurationService) {
        super(configurationService, getIsBrowserConnectionMetered());
        const connection = navigator.connection;
        if (connection) {
            const onChange = () => this.setIsBrowserConnectionMetered(getIsBrowserConnectionMetered());
            connection.addEventListener('change', onChange);
            this._register(toDisposable(() => connection.removeEventListener('change', onChange)));
        }
    }
};
MeteredConnectionService = __decorate([
    __param(0, IConfigurationService)
], MeteredConnectionService);
export { MeteredConnectionService };
registerSingleton(IMeteredConnectionService, MeteredConnectionService, 1 /* InstantiationType.Delayed */);
//# sourceMappingURL=meteredConnectionService.js.map