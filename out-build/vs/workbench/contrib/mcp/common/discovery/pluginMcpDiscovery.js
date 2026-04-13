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
import { hash } from '../../../../../base/common/hash.js';
import { Disposable, DisposableResourceMap } from '../../../../../base/common/lifecycle.js';
import { ResourceSet } from '../../../../../base/common/map.js';
import { Schemas } from '../../../../../base/common/network.js';
import { autorun } from '../../../../../base/common/observable.js';
import { isDefined } from '../../../../../base/common/types.js';
import { URI } from '../../../../../base/common/uri.js';
import { IAgentPluginService } from '../../../chat/common/plugins/agentPluginService.js';
import { isContributionEnabled } from '../../../chat/common/enablement.js';
import { IMcpRegistry } from '../mcpRegistryTypes.js';
let PluginMcpDiscovery = class PluginMcpDiscovery extends Disposable {
    constructor(_agentPluginService, _mcpRegistry) {
        super();
        this._agentPluginService = _agentPluginService;
        this._mcpRegistry = _mcpRegistry;
        this.fromGallery = false;
        this._collections = this._register(new DisposableResourceMap());
    }
    start() {
        this._register(autorun(reader => {
            const plugins = this._agentPluginService.plugins.read(reader);
            const seen = new ResourceSet();
            for (const plugin of plugins) {
                if (!isContributionEnabled(plugin.enablement.read(reader))) {
                    continue;
                }
                seen.add(plugin.uri);
                let collectionState = this._collections.get(plugin.uri);
                if (!collectionState) {
                    collectionState = this.createCollectionState(plugin);
                    this._collections.set(plugin.uri, collectionState);
                }
            }
            for (const [pluginUri] of this._collections) {
                if (!seen.has(pluginUri)) {
                    this._collections.deleteAndDispose(pluginUri);
                }
            }
        }));
    }
    createCollectionState(plugin) {
        const collectionId = `plugin.${plugin.uri}`;
        return this._mcpRegistry.registerCollection({
            id: collectionId,
            label: `${plugin.label} (Agent Plugin)`,
            remoteAuthority: plugin.uri.scheme === Schemas.vscodeRemote ? plugin.uri.authority : null,
            configTarget: 2 /* ConfigurationTarget.USER */,
            scope: 0 /* StorageScope.PROFILE */,
            trustBehavior: 0 /* McpServerTrust.Kind.Trusted */,
            serverDefinitions: plugin.mcpServerDefinitions.map(defs => defs.map(d => this._toServerDefinition(collectionId, d)).filter(isDefined)),
            presentation: {
                origin: plugin.uri,
                order: 350 /* McpCollectionSortOrder.Plugin */,
            },
        });
    }
    _toServerDefinition(collectionId, { name, configuration }) {
        const launch = this._toLaunch(configuration);
        if (!launch) {
            return undefined;
        }
        return {
            id: `${collectionId}.${name}`,
            label: name,
            launch,
            cacheNonce: String(hash(launch)),
        };
    }
    _toLaunch(config) {
        if (config.type === "stdio" /* McpServerType.LOCAL */) {
            return {
                type: 1 /* McpServerTransportType.Stdio */,
                command: config.command,
                args: config.args ? [...config.args] : [],
                env: config.env ? { ...config.env } : {},
                envFile: config.envFile,
                cwd: config.cwd,
                sandbox: undefined,
            };
        }
        try {
            return {
                type: 2 /* McpServerTransportType.HTTP */,
                uri: URI.parse(config.url),
                headers: Object.entries(config.headers ?? {}),
            };
        }
        catch {
            return undefined;
        }
    }
};
PluginMcpDiscovery = __decorate([
    __param(0, IAgentPluginService),
    __param(1, IMcpRegistry)
], PluginMcpDiscovery);
export { PluginMcpDiscovery };
//# sourceMappingURL=pluginMcpDiscovery.js.map