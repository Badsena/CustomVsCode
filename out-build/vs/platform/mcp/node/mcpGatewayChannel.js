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
import { Emitter, Event } from '../../../base/common/event.js';
import { Disposable, DisposableMap, DisposableStore } from '../../../base/common/lifecycle.js';
import { ILoggerService } from '../../log/common/log.js';
import { IMcpGatewayService, McpGatewayToolBrokerChannelName } from '../common/mcpGateway.js';
/**
 * IPC channel for the MCP Gateway service, used by the remote server.
 *
 * This channel tracks which client (identified by reconnectionToken) creates gateways,
 * enabling cleanup when a client disconnects.
 */
let McpGatewayChannel = class McpGatewayChannel extends Disposable {
    constructor(_ipcServer, mcpGatewayService, _loggerService) {
        super();
        this._ipcServer = _ipcServer;
        this.mcpGatewayService = mcpGatewayService;
        this._loggerService = _loggerService;
        this._onDidChangeGatewayServers = this._register(new Emitter());
        this._gatewayDisposables = this._register(new DisposableMap());
        /** Tracks which gateways belong to which client for cleanup on disconnect */
        this._clientGateways = new Map();
        this._register(_ipcServer.onDidRemoveConnection(c => {
            this._loggerService.getLogger('mcpGateway')?.info(`[McpGateway][Channel] Client disconnected: ${c.ctx}, cleaning up gateways`);
            mcpGatewayService.disposeGatewaysForClient(c.ctx);
            // Clean up per-gateway change-event forwarders for this client
            const gatewaysForClient = this._clientGateways.get(c.ctx);
            if (gatewaysForClient) {
                for (const gatewayId of gatewaysForClient) {
                    this._gatewayDisposables.deleteAndDispose(gatewayId);
                }
                this._clientGateways.delete(c.ctx);
            }
        }));
    }
    listen(_ctx, event) {
        if (event === 'onDidChangeGatewayServers') {
            return this._onDidChangeGatewayServers.event;
        }
        throw new Error(`Invalid listen: ${event}`);
    }
    async call(ctx, command, args) {
        const logger = this._loggerService.getLogger('mcpGateway');
        logger?.debug(`[McpGateway][Channel] IPC call: ${command} from client ${ctx}`);
        switch (command) {
            case 'createGateway': {
                const brokerChannel = ipcChannelForContext(this._ipcServer, ctx);
                // Fetch initial server list before creating the gateway (IPC is async, but the invoker interface is sync)
                let currentServers = await brokerChannel.call('listServers');
                const onDidChangeServersListener = brokerChannel.listen('onDidChangeServers');
                const result = await this.mcpGatewayService.createGateway(ctx, {
                    onDidChangeServers: Event.map(onDidChangeServersListener, servers => {
                        currentServers = servers;
                        return servers;
                    }),
                    onDidChangeTools: brokerChannel.listen('onDidChangeTools'),
                    onDidChangeResources: brokerChannel.listen('onDidChangeResources'),
                    listServers: () => currentServers,
                    listToolsForServer: serverId => brokerChannel.call('listToolsForServer', { serverId }),
                    callToolForServer: (serverId, name, callArgs) => brokerChannel.call('callToolForServer', { serverId, name, args: callArgs }),
                    listResourcesForServer: serverId => brokerChannel.call('listResourcesForServer', { serverId }),
                    readResourceForServer: (serverId, uri) => brokerChannel.call('readResourceForServer', { serverId, uri }),
                    listResourceTemplatesForServer: serverId => brokerChannel.call('listResourceTemplatesForServer', { serverId }),
                });
                // Forward server change events via IPC
                const gatewayStore = new DisposableStore();
                gatewayStore.add(result.onDidChangeServers(servers => {
                    this._onDidChangeGatewayServers.fire({ gatewayId: result.gatewayId, servers });
                }));
                this._gatewayDisposables.set(result.gatewayId, gatewayStore);
                // Track client → gateway for disconnect cleanup
                let gatewaysForClient = this._clientGateways.get(ctx);
                if (!gatewaysForClient) {
                    gatewaysForClient = new Set();
                    this._clientGateways.set(ctx, gatewaysForClient);
                }
                gatewaysForClient.add(result.gatewayId);
                logger?.info(`[McpGateway][Channel] Gateway created: ${result.gatewayId} with ${result.servers.length} server(s) for client ${ctx}`);
                // eslint-disable-next-line local/code-no-dangerous-type-assertions
                return { gatewayId: result.gatewayId, servers: result.servers };
            }
            case 'disposeGateway': {
                const gatewayId = args;
                logger?.info(`[McpGateway][Channel] Disposing gateway: ${gatewayId} for client ${ctx}`);
                this._gatewayDisposables.deleteAndDispose(gatewayId);
                // Remove from client tracking
                const gatewaysForClient = this._clientGateways.get(ctx);
                if (gatewaysForClient) {
                    gatewaysForClient.delete(gatewayId);
                    if (gatewaysForClient.size === 0) {
                        this._clientGateways.delete(ctx);
                    }
                }
                await this.mcpGatewayService.disposeGateway(gatewayId);
                return undefined;
            }
        }
        throw new Error(`Invalid call: ${command}`);
    }
};
McpGatewayChannel = __decorate([
    __param(1, IMcpGatewayService),
    __param(2, ILoggerService)
], McpGatewayChannel);
export { McpGatewayChannel };
function ipcChannelForContext(ipcServer, ctx) {
    return ipcServer.getChannel(McpGatewayToolBrokerChannelName, client => client.ctx === ctx);
}
//# sourceMappingURL=mcpGatewayChannel.js.map