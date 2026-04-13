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
import { Disposable, MutableDisposable, toDisposable } from '../../base/common/lifecycle.js';
import { ProxyChannel } from '../../base/parts/ipc/common/ipc.js';
import { createDecorator } from '../../platform/instantiation/common/instantiation.js';
import { ILogService, ILoggerService } from '../../platform/log/common/log.js';
import { RemoteLoggerChannelClient } from '../../platform/log/common/logIpc.js';
import { IServerLifetimeService } from './serverLifetimeService.js';
export const IServerAgentHostManager = createDecorator('serverAgentHostManager');
var Constants;
(function (Constants) {
    Constants[Constants["MaxRestarts"] = 5] = "MaxRestarts";
})(Constants || (Constants = {}));
let ServerAgentHostManager = class ServerAgentHostManager extends Disposable {
    constructor(_starter, _logService, _loggerService, _serverLifetimeService) {
        super();
        this._starter = _starter;
        this._logService = _logService;
        this._loggerService = _loggerService;
        this._serverLifetimeService = _serverLifetimeService;
        this._restartCount = 0;
        /** Lifetime token for when agent sessions are active. */
        this._lifetimeToken = this._register(new MutableDisposable());
        this._register(this._starter);
        this._start();
    }
    _start() {
        const connection = this._starter.start();
        this._logService.info('ServerAgentHostManager: agent host started');
        // Connect logger channel so agent host logs appear in the output channel
        this._register(new RemoteLoggerChannelClient(this._loggerService, connection.client.getChannel("agentHostLogger" /* AgentHostIpcChannels.Logger */)));
        this._trackActiveSessions(connection);
        // Handle unexpected exit
        this._register(connection.onDidProcessExit(e => {
            if (!this._store.isDisposed) {
                // Sessions are gone when the process exits
                this._lifetimeToken.clear();
                if (this._restartCount <= Constants.MaxRestarts) {
                    this._logService.error(`ServerAgentHostManager: agent host terminated unexpectedly with code ${e.code}`);
                    this._restartCount++;
                    connection.store.dispose();
                    this._start();
                }
                else {
                    this._logService.error(`ServerAgentHostManager: agent host terminated with code ${e.code}, giving up after ${Constants.MaxRestarts} restarts`);
                }
            }
        }));
        this._register(toDisposable(() => connection.store.dispose()));
    }
    _trackActiveSessions(connection) {
        const agentService = ProxyChannel.toService(connection.client.getChannel("agentHost" /* AgentHostIpcChannels.AgentHost */));
        this._register(agentService.onDidAction(envelope => {
            if (envelope.action.type === 'root/activeSessionsChanged') {
                if (envelope.action.activeSessions > 0) {
                    this._lifetimeToken.value ??= this._serverLifetimeService.active('AgentSession');
                }
                else {
                    this._lifetimeToken.clear();
                }
            }
        }));
    }
};
ServerAgentHostManager = __decorate([
    __param(1, ILogService),
    __param(2, ILoggerService),
    __param(3, IServerLifetimeService)
], ServerAgentHostManager);
export { ServerAgentHostManager };
//# sourceMappingURL=serverAgentHostManager.js.map