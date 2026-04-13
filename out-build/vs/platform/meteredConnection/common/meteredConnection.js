/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Emitter } from '../../../base/common/event.js';
import { Disposable } from '../../../base/common/lifecycle.js';
import { createDecorator } from '../../instantiation/common/instantiation.js';
export const IMeteredConnectionService = createDecorator('meteredConnectionService');
export const METERED_CONNECTION_SETTING_KEY = 'network.meteredConnection';
/**
 * Check if the current network connection is metered according to the Network Information API.
 */
export function getIsBrowserConnectionMetered() {
    const connection = navigator.connection;
    if (!connection) {
        return false;
    }
    if (connection.saveData || connection.metered) {
        return true;
    }
    const effectiveType = connection.effectiveType;
    return effectiveType === '2g' || effectiveType === 'slow-2g';
}
/**
 * Abstract base class for metered connection services.
 */
export class AbstractMeteredConnectionService extends Disposable {
    constructor(configurationService, isBrowserConnectionMetered) {
        super();
        this._onDidChangeIsConnectionMetered = this._register(new Emitter());
        this.onDidChangeIsConnectionMetered = this._onDidChangeIsConnectionMetered.event;
        this._isBrowserConnectionMetered = isBrowserConnectionMetered;
        this._meteredConnectionSetting = configurationService.getValue(METERED_CONNECTION_SETTING_KEY);
        this._isConnectionMetered = this._meteredConnectionSetting === 'on' || (this._meteredConnectionSetting !== 'off' && this._isBrowserConnectionMetered);
        this._register(configurationService.onDidChangeConfiguration(e => {
            if (e.affectsConfiguration(METERED_CONNECTION_SETTING_KEY)) {
                const value = configurationService.getValue(METERED_CONNECTION_SETTING_KEY);
                if (value !== this._meteredConnectionSetting) {
                    this._meteredConnectionSetting = value;
                    this.onUpdated();
                }
            }
        }));
    }
    get isConnectionMetered() {
        return this._isConnectionMetered;
    }
    get isBrowserConnectionMetered() {
        return this._isBrowserConnectionMetered;
    }
    setIsBrowserConnectionMetered(value) {
        if (value !== this._isBrowserConnectionMetered) {
            this._isBrowserConnectionMetered = value;
            this.onChangeBrowserConnection();
        }
    }
    onChangeBrowserConnection() {
        this.onUpdated();
    }
    onUpdated() {
        const value = this._meteredConnectionSetting === 'on' || (this._meteredConnectionSetting !== 'off' && this._isBrowserConnectionMetered);
        if (value !== this._isConnectionMetered) {
            this._isConnectionMetered = value;
            this.onChangeIsConnectionMetered();
        }
    }
    onChangeIsConnectionMetered() {
        this._onDidChangeIsConnectionMetered.fire(this._isConnectionMetered);
    }
}
//# sourceMappingURL=meteredConnection.js.map