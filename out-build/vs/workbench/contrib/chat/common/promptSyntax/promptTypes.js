/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
/**
 * Documentation link for the reusable prompts feature.
 */
export const PROMPT_DOCUMENTATION_URL = 'https://aka.ms/vscode-ghcp-prompt-snippets';
export const INSTRUCTIONS_DOCUMENTATION_URL = 'https://aka.ms/vscode-ghcp-custom-instructions';
export const AGENT_DOCUMENTATION_URL = 'https://aka.ms/vscode-ghcp-custom-chat-modes'; // todo
export const SKILL_DOCUMENTATION_URL = 'https://aka.ms/vscode-agent-skills';
// TODO: update link when available
export const HOOK_DOCUMENTATION_URL = 'https://aka.ms/vscode-chat-hooks';
/**
 * Language ID for the reusable prompt syntax.
 */
export const PROMPT_LANGUAGE_ID = 'prompt';
/**
 * Language ID for instructions syntax.
 */
export const INSTRUCTIONS_LANGUAGE_ID = 'instructions';
/**
 * Language ID for agent syntax.
 */
export const AGENT_LANGUAGE_ID = 'chatagent';
/**
 * Language ID for skill syntax.
 */
export const SKILL_LANGUAGE_ID = 'skill';
/**
 * Prompt and instructions files language selector.
 */
export const ALL_PROMPTS_LANGUAGE_SELECTOR = [PROMPT_LANGUAGE_ID, INSTRUCTIONS_LANGUAGE_ID, AGENT_LANGUAGE_ID, SKILL_LANGUAGE_ID];
/**
 * Configuration key for enabling the agent debug log feature.
 */
export const AGENT_DEBUG_LOG_ENABLED_SETTING = 'github.copilot.chat.agentDebugLog.enabled';
/**
 * Configuration key for enabling file logging for the agent debug log.
 */
export const AGENT_DEBUG_LOG_FILE_LOGGING_ENABLED_SETTING = 'github.copilot.chat.agentDebugLog.fileLogging.enabled';
/**
 * The name of the troubleshoot slash command / skill.
 */
export const TROUBLESHOOT_COMMAND_NAME = 'troubleshoot';
/**
 * URI scheme used by the Copilot extension for built-in skills.
 */
export const COPILOT_SKILL_URI_SCHEME = 'copilot-skill';
/**
 * Path fragment that identifies the troubleshoot skill in a URI.
 */
export const TROUBLESHOOT_SKILL_PATH = 'troubleshoot/SKILL.md';
/**
 * The language id for a prompts type.
 */
export function getLanguageIdForPromptsType(type) {
    switch (type) {
        case PromptsType.prompt:
            return PROMPT_LANGUAGE_ID;
        case PromptsType.instructions:
            return INSTRUCTIONS_LANGUAGE_ID;
        case PromptsType.agent:
            return AGENT_LANGUAGE_ID;
        case PromptsType.skill:
            return SKILL_LANGUAGE_ID;
        case PromptsType.hook:
            // Hooks use JSONC syntax with schema validation
            return 'jsonc';
        default:
            throw new Error(`Unknown prompt type: ${type}`);
    }
}
export function getPromptsTypeForLanguageId(languageId) {
    switch (languageId) {
        case PROMPT_LANGUAGE_ID:
            return PromptsType.prompt;
        case INSTRUCTIONS_LANGUAGE_ID:
            return PromptsType.instructions;
        case AGENT_LANGUAGE_ID:
            return PromptsType.agent;
        case SKILL_LANGUAGE_ID:
            return PromptsType.skill;
        // Note: hook uses 'jsonc' language ID which is shared, so we don't map it here
        default:
            return undefined;
    }
}
/**
 * What the prompt is used for.
 */
export var PromptsType;
(function (PromptsType) {
    PromptsType["instructions"] = "instructions";
    PromptsType["prompt"] = "prompt";
    PromptsType["agent"] = "agent";
    PromptsType["skill"] = "skill";
    PromptsType["hook"] = "hook";
})(PromptsType || (PromptsType = {}));
export function isValidPromptType(type) {
    return Object.values(PromptsType).includes(type);
}
export var Target;
(function (Target) {
    Target["VSCode"] = "vscode";
    Target["GitHubCopilot"] = "github-copilot";
    Target["Claude"] = "claude";
    Target["Undefined"] = "undefined";
})(Target || (Target = {}));
//# sourceMappingURL=promptTypes.js.map