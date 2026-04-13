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
import { DeferredPromise } from '../../../base/common/async.js';
import { Emitter } from '../../../base/common/event.js';
import { Disposable, DisposableStore } from '../../../base/common/lifecycle.js';
import { generateUuid } from '../../../base/common/uuid.js';
import { getDelayedChannel, ProxyChannel } from '../../../base/parts/ipc/common/ipc.js';
import { Client as MessagePortClient } from '../../../base/parts/ipc/common/ipc.mp.js';
import { acquirePort } from '../../../base/parts/ipc/electron-browser/ipc.mp.js';
import { registerSingleton } from '../../instantiation/common/extensions.js';
import { IConfigurationService } from '../../configuration/common/configuration.js';
import { ILogService } from '../../log/common/log.js';
import { AgentHostEnabledSettingId, IAgentHostService } from '../common/agentService.js';
import { revive } from '../../../base/common/marshalling.js';
/**
 * Renderer-side implementation of {@link IAgentHostService} that connects
 * directly to the agent host utility process via MessagePort, bypassing
 * the main process relay. Uses the same `getDelayedChannel` pattern as
 * the pty host so the proxy is usable immediately while the port is acquired.
 */
let AgentHostServiceClient = class AgentHostServiceClient extends Disposable {
    constructor(_logService, configurationService) {
        super();
        this._logService = _logService;
        /** Unique identifier for this window, used in action envelope origin tracking. */
        this.clientId = generateUuid();
        this._clientEventually = new DeferredPromise();
        this._onAgentHostExit = this._register(new Emitter());
        this.onAgentHostExit = this._onAgentHostExit.event;
        this._onAgentHostStart = this._register(new Emitter());
        this.onAgentHostStart = this._onAgentHostStart.event;
        this._onDidAction = this._register(new Emitter());
        this.onDidAction = this._onDidAction.event;
        this._onDidNotification = this._register(new Emitter());
        this.onDidNotification = this._onDidNotification.event;
        // Create a proxy backed by a delayed channel - usable immediately,
        // calls queue until the MessagePort connection is established.
        this._proxy = ProxyChannel.toService(getDelayedChannel(this._clientEventually.p.then(client => client.getChannel("agentHost" /* AgentHostIpcChannels.AgentHost */))));
        if (configurationService.getValue(AgentHostEnabledSettingId)) {
            this._connect();
        }
    }
    async _connect() {
        this._logService.info('[AgentHost:renderer] Acquiring MessagePort to agent host...');
        const port = await acquirePort('vscode:createAgentHostMessageChannel', 'vscode:createAgentHostMessageChannelResult');
        this._logService.info('[AgentHost:renderer] MessagePort acquired, creating client...');
        const store = this._register(new DisposableStore());
        const client = store.add(new MessagePortClient(port, `agentHost:window`));
        this._clientEventually.complete(client);
        store.add(this._proxy.onDidAction(e => {
            this._onDidAction.fire(revive(e));
        }));
        store.add(this._proxy.onDidNotification(e => {
            this._onDidNotification.fire(revive(e));
        }));
        this._logService.info('[AgentHost:renderer] Direct MessagePort connection established');
        this._onAgentHostStart.fire();
    }
    // ---- IAgentService forwarding (no await needed, delayed channel handles queuing) ----
    setAuthToken(token) {
        return this._proxy.setAuthToken(token);
    }
    listAgents() {
        return this._proxy.listAgents();
    }
    refreshModels() {
        return this._proxy.refreshModels();
    }
    listSessions() {
        return this._proxy.listSessions();
    }
    createSession(config) {
        return this._proxy.createSession(config);
    }
    disposeSession(session) {
        return this._proxy.disposeSession(session);
    }
    shutdown() {
        return this._proxy.shutdown();
    }
    subscribe(resource) {
        return this._proxy.subscribe(resource);
    }
    unsubscribe(resource) {
        this._proxy.unsubscribe(resource);
    }
    dispatchAction(action, clientId, clientSeq) {
        this._proxy.dispatchAction(action, clientId, clientSeq);
    }
    browseDirectory(uri) {
        return this._proxy.browseDirectory(uri);
    }
    async restartAgentHost() {
        // Restart is handled by the main process side
    }
};
AgentHostServiceClient = __decorate([
    __param(0, ILogService),
    __param(1, IConfigurationService)
], AgentHostServiceClient);
registerSingleton(IAgentHostService, AgentHostServiceClient, 1 /* InstantiationType.Delayed */);
//# sourceMappingURL=agentHostService.js.map