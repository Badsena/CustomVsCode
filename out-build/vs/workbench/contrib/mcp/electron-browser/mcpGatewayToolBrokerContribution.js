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
import { IMainProcessService } from '../../../../platform/ipc/common/mainProcessService.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { McpGatewayToolBrokerChannelName } from '../../../../platform/mcp/common/mcpGateway.js';
import { IMcpService } from '../common/mcpTypes.js';
import { McpGatewayToolBrokerChannel } from '../common/mcpGatewayToolBrokerChannel.js';
let McpGatewayToolBrokerContribution = class McpGatewayToolBrokerContribution {
    constructor(mainProcessService, mcpService, logService) {
        mainProcessService.registerChannel(McpGatewayToolBrokerChannelName, new McpGatewayToolBrokerChannel(mcpService, logService));
    }
};
McpGatewayToolBrokerContribution = __decorate([
    __param(0, IMainProcessService),
    __param(1, IMcpService),
    __param(2, ILogService)
], McpGatewayToolBrokerContribution);
export { McpGatewayToolBrokerContribution };
//# sourceMappingURL=mcpGatewayToolBrokerContribution.js.map