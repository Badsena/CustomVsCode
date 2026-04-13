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
// Service implementation that manages WebSocket connections to remote agent
// host processes. Reads addresses from the `chat.remoteAgentHosts` setting
// and maintains connections, reconnecting as the setting changes.
import { Emitter } from '../../../base/common/event.js';
import { Disposable, DisposableStore } from '../../../base/common/lifecycle.js';
import { IConfigurationService } from '../../configuration/common/configuration.js';
import { IInstantiationService } from '../../instantiation/common/instantiation.js';
import { ILogService } from '../../log/common/log.js';
import { RemoteAgentHostsSettingId, } from '../common/remoteAgentHostService.js';
import { RemoteAgentHostProtocolClient } from './remoteAgentHostProtocolClient.js';
let RemoteAgentHostService = class RemoteAgentHostService extends Disposable {
    constructor(_configurationService, _instantiationService, _logService) {
        super();
        this._configurationService = _configurationService;
        this._instantiationService = _instantiationService;
        this._logService = _logService;
        this._onDidChangeConnections = this._register(new Emitter());
        this.onDidChangeConnections = this._onDidChangeConnections.event;
        this._entries = new Map();
        this._names = new Map();
        // React to setting changes
        this._register(this._configurationService.onDidChangeConfiguration(e => {
            if (e.affectsConfiguration(RemoteAgentHostsSettingId)) {
                this._reconcileConnections();
            }
        }));
        // Initial connection
        this._reconcileConnections();
    }
    get connections() {
        const result = [];
        for (const [address, entry] of this._entries) {
            if (entry.connected) {
                result.push({
                    address,
                    name: this._names.get(address) ?? address,
                    clientId: entry.client.clientId,
                    defaultDirectory: entry.client.defaultDirectory,
                });
            }
        }
        return result;
    }
    getConnection(address) {
        const entry = this._entries.get(address);
        return entry?.connected ? entry.client : undefined;
    }
    _removeConnection(address) {
        const entry = this._entries.get(address);
        if (entry) {
            this._entries.delete(address);
            entry.store.dispose();
            this._onDidChangeConnections.fire();
        }
    }
    _reconcileConnections() {
        const entries = this._configurationService.getValue(RemoteAgentHostsSettingId) ?? [];
        const desired = new Set(entries.map(e => e.address));
        this._logService.info(`[RemoteAgentHost] Reconciling: desired=[${[...desired].join(', ')}], current=[${[...this._entries.keys()].map(a => `${a}(${this._entries.get(a).connected ? 'connected' : 'pending'})`).join(', ')}]`);
        // Update name map and detect name changes for existing connections
        let namesChanged = false;
        const oldNames = new Map(this._names);
        this._names.clear();
        for (const entry of entries) {
            this._names.set(entry.address, entry.name);
            if (this._entries.has(entry.address) && oldNames.get(entry.address) !== entry.name) {
                namesChanged = true;
            }
        }
        // Remove connections no longer in the setting
        for (const address of [...this._entries.keys()]) {
            if (!desired.has(address)) {
                this._logService.info(`[RemoteAgentHost] Disconnecting from ${address}`);
                this._removeConnection(address);
            }
        }
        // Add new connections
        for (const entry of entries) {
            if (!this._entries.has(entry.address)) {
                this._connectTo(entry.address, entry.connectionToken);
            }
        }
        // If only names changed (no add/remove), notify so the UI updates
        if (namesChanged) {
            this._onDidChangeConnections.fire();
        }
    }
    _connectTo(address, connectionToken) {
        const store = new DisposableStore();
        const client = store.add(this._instantiationService.createInstance(RemoteAgentHostProtocolClient, address, connectionToken));
        const entry = { store, client, connected: false };
        this._entries.set(address, entry);
        // Guard removal against stale callbacks: only remove if the
        // current entry for this address is still the one we created.
        const guardedRemove = () => {
            if (this._entries.get(address) === entry) {
                this._removeConnection(address);
            }
        };
        store.add(client.onDidClose(() => {
            this._logService.warn(`[RemoteAgentHost] Connection closed: ${address}`);
            guardedRemove();
        }));
        this._logService.info(`[RemoteAgentHost] Connecting to ${address}`);
        client.connect().then(() => {
            if (store.isDisposed) {
                return; // removed before connect resolved
            }
            this._logService.info(`[RemoteAgentHost] Connected to ${address}`);
            entry.connected = true;
            this._onDidChangeConnections.fire();
        }).catch(err => {
            this._logService.error(`[RemoteAgentHost] Failed to connect to ${address}`, err);
            guardedRemove();
        });
    }
    dispose() {
        for (const entry of this._entries.values()) {
            entry.store.dispose();
        }
        this._entries.clear();
        super.dispose();
    }
};
RemoteAgentHostService = __decorate([
    __param(0, IConfigurationService),
    __param(1, IInstantiationService),
    __param(2, ILogService)
], RemoteAgentHostService);
export { RemoteAgentHostService };
//# sourceMappingURL=remoteAgentHostServiceImpl.js.map