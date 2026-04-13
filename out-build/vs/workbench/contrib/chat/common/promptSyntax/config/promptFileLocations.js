/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { posix } from '../../../../../../base/common/path.js';
import { PromptsType } from '../promptTypes.js';
import { PromptsStorage } from '../service/promptsService.js';
const { basename, dirname } = posix;
/**
 * File extension for the reusable prompt files.
 */
export const PROMPT_FILE_EXTENSION = '.prompt.md';
/**
 * File extension for the reusable instruction files.
 */
export const INSTRUCTION_FILE_EXTENSION = '.instructions.md';
/**
 * File extension for the modes files.
 */
export const LEGACY_MODE_FILE_EXTENSION = '.chatmode.md';
/**
 * File extension for the agent files.
 */
export const AGENT_FILE_EXTENSION = '.agent.md';
/**
 * Skill file name (case insensitive).
 */
export const SKILL_FILENAME = 'SKILL.md';
/**
 * AGENT file name
 */
export const AGENT_MD_FILENAME = 'AGENTS.md';
/**
 * Claude file name.
 */
export const CLAUDE_MD_FILENAME = 'CLAUDE.md';
/**
 * Claude local file name.
 */
export const CLAUDE_LOCAL_MD_FILENAME = 'CLAUDE.local.md';
/**
 * Claude configuration folder name.
 */
export const CLAUDE_CONFIG_FOLDER = '.claude';
/**
 * Copilot custom instructions file name.
 */
export const COPILOT_CUSTOM_INSTRUCTIONS_FILENAME = 'copilot-instructions.md';
/**
 * GitHub configuration folder name.
 */
export const GITHUB_CONFIG_FOLDER = '.github';
/**
 * Default reusable prompt files source folder.
 */
export const PROMPT_DEFAULT_SOURCE_FOLDER = '.github/prompts';
/**
 * Default reusable instructions files source folder.
 */
export const INSTRUCTIONS_DEFAULT_SOURCE_FOLDER = '.github/instructions';
/**
 * Default modes source folder.
 */
export const LEGACY_MODE_DEFAULT_SOURCE_FOLDER = '.github/chatmodes';
/**
 * Agents folder.
 */
export const AGENTS_SOURCE_FOLDER = '.github/agents';
/**
 * Claude agents folder.
 */
export const CLAUDE_AGENTS_SOURCE_FOLDER = '.claude/agents';
/**
 * Copilot user agents folder.
 */
export const COPILOT_USER_AGENTS_SOURCE_FOLDER = '~/.copilot/agents';
/**
 * Claude rules folder.
 */
export const CLAUDE_RULES_SOURCE_FOLDER = '.claude/rules';
/**
 * Hooks folder.
 */
export const HOOKS_SOURCE_FOLDER = '.github/hooks';
/**
 * Tracks where prompt files originate from.
 */
export var PromptFileSource;
(function (PromptFileSource) {
    PromptFileSource["GitHubWorkspace"] = "github-workspace";
    PromptFileSource["CopilotPersonal"] = "copilot-personal";
    PromptFileSource["ClaudePersonal"] = "claude-personal";
    PromptFileSource["ClaudeWorkspace"] = "claude-workspace";
    PromptFileSource["ClaudeWorkspaceLocal"] = "claude-workspace-local";
    PromptFileSource["AgentsWorkspace"] = "agents-workspace";
    PromptFileSource["AgentsPersonal"] = "agents-personal";
    PromptFileSource["ConfigWorkspace"] = "config-workspace";
    PromptFileSource["ConfigPersonal"] = "config-personal";
    PromptFileSource["ExtensionContribution"] = "extension-contribution";
    PromptFileSource["ExtensionAPI"] = "extension-api";
    PromptFileSource["Plugin"] = "plugin";
    PromptFileSource["Internal"] = "internal";
})(PromptFileSource || (PromptFileSource = {}));
/**
 * All default skill source folders (both workspace and user home).
 */
export const DEFAULT_SKILL_SOURCE_FOLDERS = [
    { path: '.github/skills', source: PromptFileSource.GitHubWorkspace, storage: PromptsStorage.local },
    { path: '.agents/skills', source: PromptFileSource.AgentsWorkspace, storage: PromptsStorage.local },
    { path: '.claude/skills', source: PromptFileSource.ClaudeWorkspace, storage: PromptsStorage.local },
    { path: '~/.copilot/skills', source: PromptFileSource.CopilotPersonal, storage: PromptsStorage.user },
    { path: '~/.agents/skills', source: PromptFileSource.AgentsPersonal, storage: PromptsStorage.user },
    { path: '~/.claude/skills', source: PromptFileSource.ClaudePersonal, storage: PromptsStorage.user },
];
/**
 * Default instructions source folders.
 */
export const DEFAULT_INSTRUCTIONS_SOURCE_FOLDERS = [
    { path: INSTRUCTIONS_DEFAULT_SOURCE_FOLDER, source: PromptFileSource.GitHubWorkspace, storage: PromptsStorage.local },
    { path: CLAUDE_RULES_SOURCE_FOLDER, source: PromptFileSource.ClaudeWorkspace, storage: PromptsStorage.local },
    { path: '~/.copilot/instructions', source: PromptFileSource.CopilotPersonal, storage: PromptsStorage.user },
    { path: '~/' + CLAUDE_RULES_SOURCE_FOLDER, source: PromptFileSource.ClaudePersonal, storage: PromptsStorage.user },
];
/**
 * Default prompt source folders.
 */
export const DEFAULT_PROMPT_SOURCE_FOLDERS = [
    { path: PROMPT_DEFAULT_SOURCE_FOLDER, source: PromptFileSource.GitHubWorkspace, storage: PromptsStorage.local },
];
/**
 * Default agent source folders.
 */
export const DEFAULT_AGENT_SOURCE_FOLDERS = [
    { path: AGENTS_SOURCE_FOLDER, source: PromptFileSource.GitHubWorkspace, storage: PromptsStorage.local },
    { path: CLAUDE_AGENTS_SOURCE_FOLDER, source: PromptFileSource.ClaudeWorkspace, storage: PromptsStorage.local },
    { path: '~/' + CLAUDE_AGENTS_SOURCE_FOLDER, source: PromptFileSource.ClaudePersonal, storage: PromptsStorage.user },
    { path: COPILOT_USER_AGENTS_SOURCE_FOLDER, source: PromptFileSource.CopilotPersonal, storage: PromptsStorage.user },
];
/**
 * Default hook file paths.
 * Entries can be either a directory or a specific file path (.json)
 */
export const DEFAULT_HOOK_FILE_PATHS = [
    { path: '.github/hooks', source: PromptFileSource.GitHubWorkspace, storage: PromptsStorage.local },
    { path: '.claude/settings.local.json', source: PromptFileSource.ClaudeWorkspaceLocal, storage: PromptsStorage.local },
    { path: '.claude/settings.json', source: PromptFileSource.ClaudeWorkspace, storage: PromptsStorage.local },
    { path: '~/.copilot/hooks', source: PromptFileSource.CopilotPersonal, storage: PromptsStorage.user },
    { path: '~/.claude/settings.json', source: PromptFileSource.ClaudePersonal, storage: PromptsStorage.user },
];
/**
 * Helper function to check if a file is directly in the .github/agents/ folder (not in subfolders).
 */
function isInAgentsFolder(fileUri) {
    const dir = dirname(fileUri.path);
    return dir.endsWith('/' + AGENTS_SOURCE_FOLDER) || dir.endsWith('/' + CLAUDE_AGENTS_SOURCE_FOLDER) || isInCopilotAgentsFolder(fileUri);
}
/**
 * Helper function to check if a file is directly in the .claude/agents/ folder.
 */
export function isInClaudeAgentsFolder(fileUri) {
    const dir = dirname(fileUri.path);
    return dir.endsWith('/' + CLAUDE_AGENTS_SOURCE_FOLDER);
}
/**
 * Helper function to check if a file is directly in the ~/.copilot/agents/ folder.
 */
export function isInCopilotAgentsFolder(fileUri) {
    const dir = dirname(fileUri.path);
    return dir.endsWith(COPILOT_USER_AGENTS_SOURCE_FOLDER.substring(1));
}
/**
 * Helper function to check if a file is inside the .claude/rules/ folder (including subfolders).
 * Claude rules files (.md) in this folder are treated as instruction files.
 */
export function isInClaudeRulesFolder(fileUri) {
    const path = fileUri.path;
    return path.includes('/' + CLAUDE_RULES_SOURCE_FOLDER + '/');
}
/**
 * Gets the prompt file type from the provided path.
 *
 * Note: This function assumes the URI is already known to be a prompt file
 * (e.g., from a configured prompt source folder). It does not validate that
 * arbitrary URIs are prompt files - for example, any .json file will return
 * PromptsType.hook regardless of its location.
 */
export function getPromptFileType(fileUri) {
    const filename = basename(fileUri.path);
    if (filename.endsWith(PROMPT_FILE_EXTENSION)) {
        return PromptsType.prompt;
    }
    if (filename.endsWith(INSTRUCTION_FILE_EXTENSION) || (filename === COPILOT_CUSTOM_INSTRUCTIONS_FILENAME)) {
        return PromptsType.instructions;
    }
    if (filename.endsWith(LEGACY_MODE_FILE_EXTENSION) || filename.endsWith(AGENT_FILE_EXTENSION)) {
        return PromptsType.agent;
    }
    if (filename.toLowerCase() === SKILL_FILENAME.toLowerCase()) {
        return PromptsType.skill;
    }
    // Check if it's a .md file in the .github/agents/ folder
    // Exclude README.md to allow documentation files
    if (filename.endsWith('.md') && filename !== 'README.md' && isInAgentsFolder(fileUri)) {
        return PromptsType.agent;
    }
    // Check if it's a .md file inside the .claude/rules/ folder (including subfolders)
    // These are treated as instruction files
    if (filename.endsWith('.md') && filename !== 'README.md' && isInClaudeRulesFolder(fileUri)) {
        return PromptsType.instructions;
    }
    // Any .json file is treated as a hook file.
    // The caller is responsible for only passing URIs from valid prompt source folders.
    if (filename.toLowerCase().endsWith('.json')) {
        return PromptsType.hook;
    }
    return undefined;
}
/**
 * Check if provided URI points to a file that with prompt file extension.
 */
export function isPromptOrInstructionsFile(fileUri) {
    return getPromptFileType(fileUri) !== undefined;
}
export function getPromptFileExtension(type) {
    switch (type) {
        case PromptsType.instructions:
            return INSTRUCTION_FILE_EXTENSION;
        case PromptsType.prompt:
            return PROMPT_FILE_EXTENSION;
        case PromptsType.agent:
            return AGENT_FILE_EXTENSION;
        case PromptsType.skill:
            return SKILL_FILENAME;
        case PromptsType.hook:
            return '.json';
        default:
            throw new Error('Unknown prompt type');
    }
}
export function getPromptFileDefaultLocations(type) {
    switch (type) {
        case PromptsType.instructions:
            return DEFAULT_INSTRUCTIONS_SOURCE_FOLDERS;
        case PromptsType.prompt:
            return DEFAULT_PROMPT_SOURCE_FOLDERS;
        case PromptsType.agent:
            return DEFAULT_AGENT_SOURCE_FOLDERS;
        case PromptsType.skill:
            return DEFAULT_SKILL_SOURCE_FOLDERS;
        case PromptsType.hook:
            return DEFAULT_HOOK_FILE_PATHS;
        default:
            throw new Error('Unknown prompt type');
    }
}
/**
 * Gets clean prompt name without file extension.
 */
export function getCleanPromptName(fileUri) {
    const fileName = basename(fileUri.path);
    const extensions = [
        PROMPT_FILE_EXTENSION,
        INSTRUCTION_FILE_EXTENSION,
        LEGACY_MODE_FILE_EXTENSION,
        AGENT_FILE_EXTENSION,
    ];
    for (const ext of extensions) {
        if (fileName.endsWith(ext)) {
            return basename(fileUri.path, ext);
        }
    }
    if (fileName === COPILOT_CUSTOM_INSTRUCTIONS_FILENAME) {
        return basename(fileUri.path, '.md');
    }
    // For SKILL.md files (case insensitive), return 'SKILL'
    if (fileName.toLowerCase() === SKILL_FILENAME.toLowerCase()) {
        return basename(fileUri.path, '.md');
    }
    // For .md files in .github/agents/ folder, treat them as agent files
    // Exclude README.md to allow documentation files
    if (fileName.endsWith('.md') && fileName !== 'README.md' && isInAgentsFolder(fileUri)) {
        return basename(fileUri.path, '.md');
    }
    // For .md files in .claude/rules/ folder, treat them as instruction files
    if (fileName.endsWith('.md') && fileName !== 'README.md' && isInClaudeRulesFolder(fileUri)) {
        return basename(fileUri.path, '.md');
    }
    // because we now rely on the `prompt` language ID that can be explicitly
    // set for any document in the editor, any file can be a "prompt" file, so
    // to account for that, we return the full file name including the file
    // extension for all other cases
    return basename(fileUri.path);
}
//# sourceMappingURL=promptFileLocations.js.map