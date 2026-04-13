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
import { Event } from '../../../base/common/event.js';
import { Disposable, toDisposable } from '../../../base/common/lifecycle.js';
import { ILogService, ILoggerService } from '../../log/common/log.js';
import { RemoteLoggerChannelClient } from '../../log/common/logIpc.js';
var Constants;
(function (Constants) {
    Constants[Constants["MaxRestarts"] = 5] = "MaxRestarts";
})(Constants || (Constants = {}));
/**
 * Main-process service that manages the agent host utility process lifecycle
 * (lazy start, crash recovery, logger forwarding). The renderer communicates
 * with the utility process directly via MessagePort - this class does not
 * relay any agent service calls.
 */
let AgentHostProcessManager = class AgentHostProcessManager extends Disposable {
    constructor(_starter, _logService, _loggerService) {
        super();
        this._starter = _starter;
        this._logService = _logService;
        this._loggerService = _loggerService;
        this._started = false;
        this._wasQuitRequested = false;
        this._restartCount = 0;
        this._register(this._starter);
        // Start lazily when the first window asks for a connection
        if (this._starter.onRequestConnection) {
            this._register(Event.once(this._starter.onRequestConnection)(() => this._ensureStarted()));
        }
        if (this._starter.onWillShutdown) {
            this._register(this._starter.onWillShutdown(() => this._wasQuitRequested = true));
        }
    }
    _ensureStarted() {
        if (!this._started) {
            this._start();
        }
    }
    _start() {
        const connection = this._starter.start();
        this._logService.info('AgentHostProcessManager: agent host started');
        // Connect logger channel so agent host logs appear in the output channel
        this._register(new RemoteLoggerChannelClient(this._loggerService, connection.client.getChannel("agentHostLogger" /* AgentHostIpcChannels.Logger */)));
        // Handle unexpected exit
        this._register(connection.onDidProcessExit(e => {
            if (!this._wasQuitRequested && !this._store.isDisposed) {
                if (this._restartCount <= Constants.MaxRestarts) {
                    this._logService.error(`AgentHostProcessManager: agent host terminated unexpectedly with code ${e.code}`);
                    this._restartCount++;
                    this._started = false;
                    connection.store.dispose();
                    this._start();
                }
                else {
                    this._logService.error(`AgentHostProcessManager: agent host terminated with code ${e.code}, giving up after ${Constants.MaxRestarts} restarts`);
                }
            }
        }));
        this._register(toDisposable(() => connection.store.dispose()));
        this._started = true;
    }
};
AgentHostProcessManager = __decorate([
    __param(1, ILogService),
    __param(2, ILoggerService)
], AgentHostProcessManager);
export { AgentHostProcessManager };
//# sourceMappingURL=agentHostService.js.map