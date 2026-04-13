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
import { ILogService } from '../../../../platform/log/common/log.js';
import { McpGatewayChannelName } from '../../../../platform/mcp/common/mcpGateway.js';
import { IRemoteAgentService } from '../../../services/remote/common/remoteAgentService.js';
/**
 * Browser implementation of the MCP Gateway Service.
 *
 * In browser/serverless web environments without a remote connection,
 * there is no Node.js process available to create an HTTP server.
 *
 * When running with a remote connection, the gateway is created on the
 * remote server via IPC.
 */
let BrowserMcpGatewayService = class BrowserMcpGatewayService {
    constructor(_remoteAgentService, _logService) {
        this._remoteAgentService = _remoteAgentService;
        this._logService = _logService;
    }
    async createGateway(inRemote) {
        this._logService.debug(`[McpGateway][BrowserWorkbench] createGateway requested (inRemote=${inRemote})`);
        // Browser can only create gateways in remote environment
        if (!inRemote) {
            this._logService.info('[McpGateway][BrowserWorkbench] Cannot create local gateway in browser environment');
            return undefined;
        }
        const connection = this._remoteAgentService.getConnection();
        if (!connection) {
            this._logService.info('[McpGateway][BrowserWorkbench] No remote connection available (serverless web)');
            return undefined;
        }
        this._logService.info('[McpGateway][BrowserWorkbench] Creating remote gateway via remote server');
        // Use the remote server's gateway service
        return connection.withChannel(McpGatewayChannelName, async (channel) => {
            const service = ProxyChannel.toService(channel);
            const info = await service.createGateway(undefined);
            const servers = reviveServers(info.servers);
            this._logService.info(`[McpGateway][BrowserWorkbench] Remote gateway created with ${servers.length} server(s)`);
            const onDidChangeServers = Event.map(Event.filter(channel.listen('onDidChangeGatewayServers'), e => e.gatewayId === info.gatewayId), e => reviveServers(e.servers));
            return {
                servers,
                onDidChangeServers,
                dispose: () => {
                    this._logService.info(`[McpGateway][BrowserWorkbench] Disposing remote gateway: ${info.gatewayId}`);
                    service.disposeGateway(info.gatewayId);
                }
            };
        });
    }
};
BrowserMcpGatewayService = __decorate([
    __param(0, IRemoteAgentService),
    __param(1, ILogService)
], BrowserMcpGatewayService);
export { BrowserMcpGatewayService };
function reviveServers(servers) {
    return servers.map(s => ({ label: s.label, address: URI.revive(s.address) }));
}
//# sourceMappingURL=mcpGatewayService.js.map