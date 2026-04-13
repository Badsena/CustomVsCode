/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Emitter } from '../../../base/common/event.js';
import { Disposable } from '../../../base/common/lifecycle.js';
import { createDecorator } from '../../../platform/instantiation/common/instantiation.js';
export const IExtHostMeteredConnection = createDecorator('IExtHostMeteredConnection');
export class ExtHostMeteredConnection extends Disposable {
    constructor() {
        super();
        this._isConnectionMetered = false;
        this._onDidChangeIsConnectionMetered = this._register(new Emitter());
        this.onDidChangeIsConnectionMetered = this._onDidChangeIsConnectionMetered.event;
    }
    get isConnectionMetered() {
        return this._isConnectionMetered;
    }
    $initializeIsConnectionMetered(isMetered) {
        this._isConnectionMetered = isMetered;
    }
    $onDidChangeIsConnectionMetered(isMetered) {
        if (this._isConnectionMetered !== isMetered) {
            this._isConnectionMetered = isMetered;
            this._onDidChangeIsConnectionMetered.fire(isMetered);
        }
    }
}
//# sourceMappingURL=extHostMeteredConnection.js.map