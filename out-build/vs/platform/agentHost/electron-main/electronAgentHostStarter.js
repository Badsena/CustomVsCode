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
var ElectronAgentHostStarter_1;
import { Disposable, DisposableStore, toDisposable } from '../../../base/common/lifecycle.js';
import { Emitter } from '../../../base/common/event.js';
import { deepClone } from '../../../base/common/objects.js';
import { validatedIpcMain } from '../../../base/parts/ipc/electron-main/ipcMain.js';
import { Client as MessagePortClient } from '../../../base/parts/ipc/electron-main/ipc.mp.js';
import { IEnvironmentMainService } from '../../environment/electron-main/environmentMainService.js';
import { parseAgentHostDebugPort } from '../../environment/node/environmentService.js';
import { ILifecycleMainService } from '../../lifecycle/electron-main/lifecycleMainService.js';
import { ILogService } from '../../log/common/log.js';
import { Schemas } from '../../../base/common/network.js';
import { NullTelemetryService } from '../../telemetry/common/telemetryUtils.js';
import { UtilityProcess } from '../../utilityProcess/electron-main/utilityProcess.js';
let ElectronAgentHostStarter = class ElectronAgentHostStarter extends Disposable {
    static { ElectronAgentHostStarter_1 = this; }
    constructor(_environmentMainService, _lifecycleMainService, _logService) {
        super();
        this._environmentMainService = _environmentMainService;
        this._lifecycleMainService = _lifecycleMainService;
        this._logService = _logService;
        this.utilityProcess = undefined;
        this._onRequestConnection = this._register(new Emitter());
        this.onRequestConnection = this._onRequestConnection.event;
        this._onWillShutdown = this._register(new Emitter());
        this.onWillShutdown = this._onWillShutdown.event;
        this._register(this._lifecycleMainService.onWillShutdown(() => this._onWillShutdown.fire()));
        // Listen for new windows to establish a direct MessagePort connection to the agent host
        const onWindowConnection = (e, nonce) => this._onWindowConnection(e, nonce);
        validatedIpcMain.on('vscode:createAgentHostMessageChannel', onWindowConnection);
        this._register(toDisposable(() => {
            validatedIpcMain.removeListener('vscode:createAgentHostMessageChannel', onWindowConnection);
        }));
    }
    start() {
        this.utilityProcess = new UtilityProcess(this._logService, NullTelemetryService, this._lifecycleMainService);
        const inspectParams = parseAgentHostDebugPort(this._environmentMainService.args, this._environmentMainService.isBuilt);
        const execArgv = inspectParams.port ? [
            '--nolazy',
            `--inspect${inspectParams.break ? '-brk' : ''}=${inspectParams.port}`
        ] : undefined;
        this.utilityProcess.start({
            type: 'agentHost',
            name: 'agent-host',
            entryPoint: 'vs/platform/agentHost/node/agentHostMain',
            execArgv,
            args: ['--logsPath', this._environmentMainService.logsHome.with({ scheme: Schemas.file }).fsPath],
            env: {
                ...deepClone(process.env),
                VSCODE_ESM_ENTRYPOINT: 'vs/platform/agentHost/node/agentHostMain',
                VSCODE_PIPE_LOGGING: 'true',
                VSCODE_VERBOSE_LOGGING: 'true',
            }
        });
        const port = this.utilityProcess.connect();
        const client = new MessagePortClient(port, 'agentHost');
        const store = new DisposableStore();
        store.add(client);
        store.add(this.utilityProcess.onStderr(data => {
            if (this._isExpectedStderr(data)) {
                return;
            }
            this._logService.error(`[AgentHost:stderr] ${data}`);
        }));
        store.add(toDisposable(() => {
            this.utilityProcess?.kill();
            this.utilityProcess?.dispose();
            this.utilityProcess = undefined;
        }));
        return {
            client,
            store,
            onDidProcessExit: this.utilityProcess.onExit,
        };
    }
    _onWindowConnection(e, nonce) {
        this._onRequestConnection.fire();
        if (!this.utilityProcess) {
            this._logService.error('AgentHostStarter: cannot create window connection, agent host process is not running');
            return;
        }
        const port = this.utilityProcess.connect();
        if (e.sender.isDestroyed()) {
            port.close();
            return;
        }
        e.sender.postMessage('vscode:createAgentHostMessageChannelResult', nonce, [port]);
    }
    static { this._expectedStderrPatterns = [
        'Most NODE_OPTIONs are not supported in packaged apps',
        'Debugger listening on ws://',
        'For help, see: https://nodejs.org/en/docs/inspector',
        'ExperimentalWarning: SQLite is an experimental feature',
    ]; }
    _isExpectedStderr(data) {
        return ElectronAgentHostStarter_1._expectedStderrPatterns.some(pattern => data.includes(pattern));
    }
};
ElectronAgentHostStarter = ElectronAgentHostStarter_1 = __decorate([
    __param(0, IEnvironmentMainService),
    __param(1, ILifecycleMainService),
    __param(2, ILogService)
], ElectronAgentHostStarter);
export { ElectronAgentHostStarter };
//# sourceMappingURL=electronAgentHostStarter.js.map