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
import { Emitter } from '../../../base/common/event.js';
import { Disposable, DisposableStore } from '../../../base/common/lifecycle.js';
import { FileAccess, Schemas } from '../../../base/common/network.js';
import { Client } from '../../../base/parts/ipc/node/ipc.cp.js';
import { IEnvironmentService } from '../../environment/common/environment.js';
import { parseAgentHostDebugPort } from '../../environment/node/environmentService.js';
/**
 * Spawns the agent host as a Node child process (fallback when
 * Electron utility process is unavailable, e.g. dev/test).
 */
let NodeAgentHostStarter = class NodeAgentHostStarter extends Disposable {
    constructor(_environmentService) {
        super();
        this._environmentService = _environmentService;
        this._onRequestConnection = this._register(new Emitter());
        this.onRequestConnection = this._onRequestConnection.event;
    }
    /**
     * Configures the child process to also start a WebSocket server.
     * Must be called before {@link start}. Triggers eager process start
     * via {@link onRequestConnection}.
     */
    setWebSocketConfig(config) {
        this._wsConfig = config;
        // Signal the process manager to start immediately rather than
        // waiting for a renderer window to connect.
        this._onRequestConnection.fire();
    }
    start() {
        const env = {
            VSCODE_ESM_ENTRYPOINT: 'vs/platform/agentHost/node/agentHostMain',
            VSCODE_PIPE_LOGGING: 'true',
            VSCODE_VERBOSE_LOGGING: 'true',
        };
        // Forward WebSocket server configuration to the child process via env vars
        if (this._wsConfig) {
            if (this._wsConfig.port) {
                env['VSCODE_AGENT_HOST_PORT'] = this._wsConfig.port;
            }
            if (this._wsConfig.socketPath) {
                env['VSCODE_AGENT_HOST_SOCKET_PATH'] = this._wsConfig.socketPath;
            }
            if (this._wsConfig.host) {
                env['VSCODE_AGENT_HOST_HOST'] = this._wsConfig.host;
            }
            if (this._wsConfig.connectionToken) {
                env['VSCODE_AGENT_HOST_CONNECTION_TOKEN'] = this._wsConfig.connectionToken;
            }
        }
        const opts = {
            serverName: 'Agent Host',
            args: ['--type=agentHost', '--logsPath', this._environmentService.logsHome.with({ scheme: Schemas.file }).fsPath],
            env,
        };
        const agentHostDebug = parseAgentHostDebugPort(this._environmentService.args, this._environmentService.isBuilt);
        if (agentHostDebug) {
            if (agentHostDebug.break && agentHostDebug.port) {
                opts.debugBrk = agentHostDebug.port;
            }
            else if (!agentHostDebug.break && agentHostDebug.port) {
                opts.debug = agentHostDebug.port;
            }
        }
        const client = new Client(FileAccess.asFileUri('bootstrap-fork').fsPath, opts);
        const store = new DisposableStore();
        store.add(client);
        return {
            client,
            store,
            onDidProcessExit: client.onDidProcessExit
        };
    }
};
NodeAgentHostStarter = __decorate([
    __param(0, IEnvironmentService)
], NodeAgentHostStarter);
export { NodeAgentHostStarter };
//# sourceMappingURL=nodeAgentHostStarter.js.map