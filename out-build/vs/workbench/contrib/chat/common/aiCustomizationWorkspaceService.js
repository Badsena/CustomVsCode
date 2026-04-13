/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { isEqualOrParent } from '../../../../base/common/resources.js';
import { createDecorator } from '../../../../platform/instantiation/common/instantiation.js';
import { PromptsStorage } from './promptSyntax/service/promptsService.js';
export const IAICustomizationWorkspaceService = createDecorator('aiCustomizationWorkspaceService');
/**
 * Possible section IDs for the AI Customization Management Editor sidebar.
 */
export const AICustomizationManagementSection = {
    Agents: 'agents',
    Skills: 'skills',
    Instructions: 'instructions',
    Prompts: 'prompts',
    Hooks: 'hooks',
    McpServers: 'mcpServers',
    Plugins: 'plugins',
    Models: 'models',
};
/**
 * Applies a storage source filter to an array of items that have uri and storage.
 * Removes items whose storage is not in the filter's source list,
 * and for user-storage items, removes those not under an allowed root.
 */
export function applyStorageSourceFilter(items, filter) {
    const sourceSet = new Set(filter.sources);
    return items.filter(item => {
        if (!sourceSet.has(item.storage)) {
            return false;
        }
        if (item.storage === PromptsStorage.user && filter.includedUserFileRoots) {
            return filter.includedUserFileRoots.some(root => isEqualOrParent(item.uri, root));
        }
        return true;
    });
}
//# sourceMappingURL=aiCustomizationWorkspaceService.js.map