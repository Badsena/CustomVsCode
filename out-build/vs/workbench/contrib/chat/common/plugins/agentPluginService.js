/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { basename } from '../../../../../base/common/resources.js';
import { createDecorator } from '../../../../../platform/instantiation/common/instantiation.js';
export const IAgentPluginService = createDecorator('agentPluginService');
export function getCanonicalPluginCommandId(plugin, commandName) {
    const pluginSegment = basename(plugin.uri);
    const prefix = normalizePluginToken(pluginSegment);
    const normalizedCommand = normalizePluginToken(commandName);
    if (normalizedCommand.startsWith(`${prefix}:`)) {
        return normalizedCommand;
    }
    return `${prefix}:${normalizedCommand}`;
}
function normalizePluginToken(value) {
    return value
        .trim()
        .toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^a-z0-9_.:-]/g, '-')
        .replace(/-+/g, '-')
        .replace(/^[-:.]+|[-:.]+$/g, '');
}
class AgentPluginDiscoveryRegistry {
    constructor() {
        this._discovery = [];
    }
    register(descriptor) {
        this._discovery.push(descriptor);
    }
    getAll() {
        return this._discovery;
    }
}
export const agentPluginDiscoveryRegistry = new AgentPluginDiscoveryRegistry();
//# sourceMappingURL=agentPluginService.js.map