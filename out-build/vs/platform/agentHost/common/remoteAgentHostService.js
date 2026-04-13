/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Event } from '../../../base/common/event.js';
import { createDecorator } from '../../instantiation/common/instantiation.js';
/** Configuration key for the list of remote agent host addresses. */
export const RemoteAgentHostsSettingId = 'chat.remoteAgentHosts';
export const IRemoteAgentHostService = createDecorator('remoteAgentHostService');
export class NullRemoteAgentHostService {
    constructor() {
        this.onDidChangeConnections = Event.None;
        this.connections = [];
    }
    getConnection() { return undefined; }
}
//# sourceMappingURL=remoteAgentHostService.js.map