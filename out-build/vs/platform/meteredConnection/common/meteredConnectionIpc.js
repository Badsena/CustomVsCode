/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Emitter } from '../../../base/common/event.js';
import { Disposable } from '../../../base/common/lifecycle.js';
export const METERED_CONNECTION_CHANNEL = 'meteredConnection';
/**
 * Commands supported by the metered connection IPC channel.
 */
export var MeteredConnectionCommand;
(function (MeteredConnectionCommand) {
    MeteredConnectionCommand["OnDidChangeIsConnectionMetered"] = "OnDidChangeIsConnectionMetered";
    MeteredConnectionCommand["IsConnectionMetered"] = "IsConnectionMetered";
    MeteredConnectionCommand["SetIsBrowserConnectionMetered"] = "SetIsBrowserConnectionMetered";
})(MeteredConnectionCommand || (MeteredConnectionCommand = {}));
/**
 * IPC channel client for the metered connection service.
 */
export class MeteredConnectionChannelClient extends Disposable {
    get isConnectionMetered() {
        return this._isConnectionMetered;
    }
    constructor(channel) {
        super();
        this._onDidChangeIsConnectionMetered = this._register(new Emitter());
        this.onDidChangeIsConnectionMetered = this._onDidChangeIsConnectionMetered.event;
        this._isConnectionMetered = false;
        channel.call(MeteredConnectionCommand.IsConnectionMetered).then(value => {
            this._isConnectionMetered = value;
            if (value) {
                this._onDidChangeIsConnectionMetered.fire(value);
            }
        });
        this._register(channel.listen(MeteredConnectionCommand.OnDidChangeIsConnectionMetered)(value => {
            if (this._isConnectionMetered !== value) {
                this._isConnectionMetered = value;
                this._onDidChangeIsConnectionMetered.fire(value);
            }
        }));
    }
}
//# sourceMappingURL=meteredConnectionIpc.js.map