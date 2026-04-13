/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { createDecorator } from '../../../../../../platform/instantiation/common/instantiation.js';
/**
 * Activation events for prompt file providers.
 */
export const CUSTOM_AGENT_PROVIDER_ACTIVATION_EVENT = 'onCustomAgentProvider';
export const INSTRUCTIONS_PROVIDER_ACTIVATION_EVENT = 'onInstructionsProvider';
export const PROMPT_FILE_PROVIDER_ACTIVATION_EVENT = 'onPromptFileProvider';
export const SKILL_PROVIDER_ACTIVATION_EVENT = 'onSkillProvider';
/**
 * Provides prompt services.
 */
export const IPromptsService = createDecorator('IPromptsService');
/**
 * Where the prompt is stored.
 */
export var PromptsStorage;
(function (PromptsStorage) {
    PromptsStorage["local"] = "local";
    PromptsStorage["user"] = "user";
    PromptsStorage["extension"] = "extension";
    PromptsStorage["plugin"] = "plugin";
    PromptsStorage["internal"] = "internal";
})(PromptsStorage || (PromptsStorage = {}));
/**
 * The type of source for extension agents.
 */
export var ExtensionAgentSourceType;
(function (ExtensionAgentSourceType) {
    ExtensionAgentSourceType["contribution"] = "contribution";
    ExtensionAgentSourceType["provider"] = "provider";
})(ExtensionAgentSourceType || (ExtensionAgentSourceType = {}));
export function isCustomAgentVisibility(obj) {
    if (typeof obj !== 'object' || obj === null) {
        return false;
    }
    const v = obj;
    return typeof v.userInvocable === 'boolean' && typeof v.agentInvocable === 'boolean';
}
/**
 * Type of agent instruction file.
 */
export var AgentFileType;
(function (AgentFileType) {
    AgentFileType["agentsMd"] = "agentsMd";
    AgentFileType["claudeMd"] = "claudeMd";
    AgentFileType["copilotInstructionsMd"] = "copilotInstructionsMd";
})(AgentFileType || (AgentFileType = {}));
//# sourceMappingURL=promptsService.js.map