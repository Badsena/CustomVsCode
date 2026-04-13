/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { MeteredConnectionCommand } from '../common/meteredConnectionIpc.js';
/**
 * IPC channel implementation for the metered connection service.
 */
export class MeteredConnectionChannel {
    constructor(service) {
        this.service = service;
    }
    listen(_, event) {
        switch (event) {
            case MeteredConnectionCommand.OnDidChangeIsConnectionMetered:
                return this.service.onDidChangeIsConnectionMetered;
            default:
                throw new Error(`Event not found: ${event}`);
        }
    }
    async call(_, command, arg) {
        switch (command) {
            case MeteredConnectionCommand.IsConnectionMetered:
                return this.service.isConnectionMetered;
            case MeteredConnectionCommand.SetIsBrowserConnectionMetered:
                this.service.setIsBrowserConnectionMetered(arg);
                break;
            default:
                throw new Error(`Call not found: ${command}`);
        }
    }
}
//# sourceMappingURL=meteredConnectionChannel.js.map