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
import { Event } from '../../../../base/common/event.js';
import { URI } from '../../../../base/common/uri.js';
import { ProxyChannel } from '../../../../base/parts/ipc/common/ipc.js';
import { IMainProcessService } from '../../../../platform/ipc/common/mainProcessService.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { McpGatewayChannelName } from '../../../../platform/mcp/common/mcpGateway.js';
import { IRemoteAgentService } from '../../../services/remote/common/remoteAgentService.js';
/**
 * Electron workbench implementation of the MCP Gateway Service.
 *
 * This implementation can create gateways either in the main process (local)
 * or on a remote server (if connected).
 */
let WorkbenchMcpGatewayService = class WorkbenchMcpGatewayService {
    constructor(mainProcessService, _remoteAgentService, _logService) {
        this._remoteAgentService = _remoteAgentService;
        this._logService = _logService;
        this._localChannel = mainProcessService.getChannel(McpGatewayChannelName);
        this._localPlatformService = ProxyChannel.toService(this._localChannel);
    }
    async createGateway(inRemote) {
        this._logService.debug(`[McpGateway][Workbench] createGateway requested (inRemote=${inRemote})`);
        if (inRemote) {
            return this._createRemoteGateway();
        }
        else {
            return this._createLocalGateway();
        }
    }
    async _createLocalGateway() {
        this._logService.info('[McpGateway][Workbench] Creating local gateway via main process');
        const info = await this._localPlatformService.createGateway(undefined);
        const servers = reviveServers(info.servers);
        this._logService.info(`[McpGateway][Workbench] Local gateway created with ${servers.length} server(s)`);
        const onDidChangeServers = Event.map(Event.filter(this._localChannel.listen('onDidChangeGatewayServers'), e => e.gatewayId === info.gatewayId), e => reviveServers(e.servers));
        return {
            servers,
            onDidChangeServers,
            dispose: () => {
                this._logService.info(`[McpGateway][Workbench] Disposing local gateway: ${info.gatewayId}`);
                this._localPlatformService.disposeGateway(info.gatewayId);
            }
        };
    }
    async _createRemoteGateway() {
        const connection = this._remoteAgentService.getConnection();
        if (!connection) {
            this._logService.info('[McpGateway][Workbench] No remote connection available for remote gateway');
            return undefined;
        }
        this._logService.info('[McpGateway][Workbench] Creating remote gateway via remote server');
        return connection.withChannel(McpGatewayChannelName, async (channel) => {
            const service = ProxyChannel.toService(channel);
            const info = await service.createGateway(undefined);
            const servers = reviveServers(info.servers);
            this._logService.info(`[McpGateway][Workbench] Remote gateway created with ${servers.length} server(s)`);
            const onDidChangeServers = Event.map(Event.filter(channel.listen('onDidChangeGatewayServers'), e => e.gatewayId === info.gatewayId), e => reviveServers(e.servers));
            return {
                servers,
                onDidChangeServers,
                dispose: () => {
                    this._logService.info(`[McpGateway][Workbench] Disposing remote gateway: ${info.gatewayId}`);
                    service.disposeGateway(info.gatewayId);
                }
            };
        });
    }
};
WorkbenchMcpGatewayService = __decorate([
    __param(0, IMainProcessService),
    __param(1, IRemoteAgentService),
    __param(2, ILogService)
], WorkbenchMcpGatewayService);
export { WorkbenchMcpGatewayService };
function reviveServers(servers) {
    return servers.map(s => ({ label: s.label, address: URI.revive(s.address) }));
}
//# sourceMappingURL=mcpGatewayService.js.map