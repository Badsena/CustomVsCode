/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { dirname } from '../../../../../../base/common/resources.js';
import { URI } from '../../../../../../base/common/uri.js';
import { localize } from '../../../../../../nls.js';
import { SpecedToolAliases } from '../../tools/languageModelToolsService.js';
import { CLAUDE_AGENTS_SOURCE_FOLDER, isInClaudeRulesFolder } from '../config/promptFileLocations.js';
import { PromptHeaderAttributes } from '../promptFileParser.js';
import { PromptsType, Target } from '../promptTypes.js';
export var GithubPromptHeaderAttributes;
(function (GithubPromptHeaderAttributes) {
    GithubPromptHeaderAttributes.mcpServers = 'mcp-servers';
    GithubPromptHeaderAttributes.github = 'github';
})(GithubPromptHeaderAttributes || (GithubPromptHeaderAttributes = {}));
export var ClaudeHeaderAttributes;
(function (ClaudeHeaderAttributes) {
    ClaudeHeaderAttributes.disallowedTools = 'disallowedTools';
})(ClaudeHeaderAttributes || (ClaudeHeaderAttributes = {}));
export function isTarget(value) {
    return value === Target.VSCode || value === Target.GitHubCopilot || value === Target.Claude || value === Target.Undefined;
}
const booleanAttributeEnumValues = [
    { name: 'true' },
    { name: 'false' }
];
const targetAttributeEnumValues = [
    { name: 'vscode' },
    { name: 'github-copilot' },
];
// Attribute metadata for prompt files (`*.prompt.md`).
export const promptFileAttributes = {
    [PromptHeaderAttributes.name]: {
        type: 'scalar',
        description: localize(8556, null),
    },
    [PromptHeaderAttributes.description]: {
        type: 'scalar',
        description: localize(8557, null),
    },
    [PromptHeaderAttributes.argumentHint]: {
        type: 'scalar',
        description: localize(8558, null),
    },
    [PromptHeaderAttributes.model]: {
        type: 'scalar | sequence',
        description: localize(8559, null),
    },
    [PromptHeaderAttributes.tools]: {
        type: 'scalar | sequence',
        description: localize(8560, null),
        defaults: ['[]', '[\'search\', \'edit\', \'web\']'],
    },
    [PromptHeaderAttributes.agent]: {
        type: 'scalar',
        description: localize(8561, null),
    },
    [PromptHeaderAttributes.mode]: {
        type: 'scalar',
        description: localize(8562, null),
    },
};
// Attribute metadata for instructions files (`*.instructions.md`).
export const instructionAttributes = {
    [PromptHeaderAttributes.name]: {
        type: 'scalar',
        description: localize(8563, null),
    },
    [PromptHeaderAttributes.description]: {
        type: 'scalar',
        description: localize(8564, null),
    },
    [PromptHeaderAttributes.applyTo]: {
        type: 'scalar',
        description: localize(8565, null),
        defaults: [
            '\'**\'',
            '\'**/*.ts, **/*.js\'',
            '\'**/*.php\'',
            '\'**/*.py\''
        ],
    },
    [PromptHeaderAttributes.excludeAgent]: {
        type: 'scalar | sequence',
        description: localize(8566, null),
    },
};
// Attribute metadata for custom agent files (`*.agent.md`).
export const customAgentAttributes = {
    [PromptHeaderAttributes.name]: {
        type: 'scalar',
        description: localize(8567, null),
    },
    [PromptHeaderAttributes.description]: {
        type: 'scalar',
        description: localize(8568, null),
    },
    [PromptHeaderAttributes.argumentHint]: {
        type: 'scalar',
        description: localize(8569, null),
    },
    [PromptHeaderAttributes.model]: {
        type: 'scalar | sequence',
        description: localize(8570, null),
    },
    [PromptHeaderAttributes.tools]: {
        type: 'scalar | sequence',
        description: localize(8571, null),
        defaults: ['[]', '[search, edit, web]'],
    },
    [PromptHeaderAttributes.handOffs]: {
        type: 'sequence',
        description: localize(8572, null),
    },
    [PromptHeaderAttributes.target]: {
        type: 'scalar',
        description: localize(8573, null),
        enums: targetAttributeEnumValues,
    },
    [PromptHeaderAttributes.infer]: {
        type: 'scalar',
        description: localize(8574, null),
        enums: booleanAttributeEnumValues,
    },
    [PromptHeaderAttributes.agents]: {
        type: 'sequence',
        description: localize(8575, null),
        defaults: ['["*"]'],
    },
    [PromptHeaderAttributes.userInvocable]: {
        type: 'scalar',
        description: localize(8576, null),
        enums: booleanAttributeEnumValues,
    },
    [PromptHeaderAttributes.userInvokable]: {
        type: 'scalar',
        description: localize(8577, null),
        enums: booleanAttributeEnumValues,
    },
    [PromptHeaderAttributes.disableModelInvocation]: {
        type: 'scalar',
        description: localize(8578, null),
        enums: booleanAttributeEnumValues,
    },
    [PromptHeaderAttributes.advancedOptions]: {
        type: 'map',
        description: localize(8579, null),
    },
    [GithubPromptHeaderAttributes.github]: {
        type: 'map',
        description: localize(8580, null),
    },
    [PromptHeaderAttributes.hooks]: {
        type: 'map',
        description: localize(8581, null),
    },
};
// Attribute metadata for skill files (`SKILL.md`).
export const skillAttributes = {
    [PromptHeaderAttributes.name]: {
        type: 'scalar',
        description: localize(8582, null),
    },
    [PromptHeaderAttributes.description]: {
        type: 'scalar',
        description: localize(8583, null),
    },
    [PromptHeaderAttributes.argumentHint]: {
        type: 'scalar',
        description: localize(8584, null),
    },
    [PromptHeaderAttributes.userInvocable]: {
        type: 'scalar',
        description: localize(8585, null),
        enums: booleanAttributeEnumValues,
    },
    [PromptHeaderAttributes.userInvokable]: {
        type: 'scalar',
        description: localize(8586, null),
        enums: booleanAttributeEnumValues,
    },
    [PromptHeaderAttributes.disableModelInvocation]: {
        type: 'scalar',
        description: localize(8587, null),
        enums: booleanAttributeEnumValues,
    },
    [PromptHeaderAttributes.license]: {
        type: 'scalar | map',
        description: localize(8588, null),
    },
    [PromptHeaderAttributes.compatibility]: {
        type: 'scalar | map',
        description: localize(8589, null),
    },
    [PromptHeaderAttributes.metadata]: {
        type: 'map',
        description: localize(8590, null),
    },
};
const allAttributeNames = {
    [PromptsType.prompt]: Object.keys(promptFileAttributes),
    [PromptsType.instructions]: Object.keys(instructionAttributes),
    [PromptsType.agent]: Object.keys(customAgentAttributes),
    [PromptsType.skill]: Object.keys(skillAttributes),
    [PromptsType.hook]: [], // hooks are JSON files, not markdown with YAML frontmatter
};
const githubCopilotAgentAttributeNames = [PromptHeaderAttributes.name, PromptHeaderAttributes.description, PromptHeaderAttributes.tools, PromptHeaderAttributes.target, GithubPromptHeaderAttributes.mcpServers, GithubPromptHeaderAttributes.github, PromptHeaderAttributes.infer];
const recommendedAttributeNames = {
    [PromptsType.prompt]: allAttributeNames[PromptsType.prompt].filter(name => !isNonRecommendedAttribute(name)),
    [PromptsType.instructions]: allAttributeNames[PromptsType.instructions].filter(name => !isNonRecommendedAttribute(name)),
    [PromptsType.agent]: allAttributeNames[PromptsType.agent].filter(name => !isNonRecommendedAttribute(name)),
    [PromptsType.skill]: allAttributeNames[PromptsType.skill].filter(name => !isNonRecommendedAttribute(name)),
    [PromptsType.hook]: [], // hooks are JSON files, not markdown with YAML frontmatter
};
export function getValidAttributeNames(promptType, includeNonRecommended, target) {
    if (target === Target.Claude) {
        if (promptType === PromptsType.instructions) {
            return Object.keys(claudeRulesAttributes);
        }
        return Object.keys(claudeAgentAttributes);
    }
    else if (target === Target.GitHubCopilot) {
        if (promptType === PromptsType.agent) {
            return githubCopilotAgentAttributeNames;
        }
    }
    return includeNonRecommended ? allAttributeNames[promptType] : recommendedAttributeNames[promptType];
}
export function isNonRecommendedAttribute(attributeName) {
    return attributeName === PromptHeaderAttributes.advancedOptions || attributeName === PromptHeaderAttributes.excludeAgent || attributeName === PromptHeaderAttributes.mode || attributeName === PromptHeaderAttributes.infer || attributeName === PromptHeaderAttributes.userInvokable;
}
export function getAttributeDefinition(attributeName, promptType, target) {
    switch (promptType) {
        case PromptsType.instructions:
            if (target === Target.Claude) {
                return claudeRulesAttributes[attributeName];
            }
            return instructionAttributes[attributeName];
        case PromptsType.skill:
            return skillAttributes[attributeName];
        case PromptsType.agent:
            if (target === Target.Claude) {
                return claudeAgentAttributes[attributeName];
            }
            return customAgentAttributes[attributeName];
        case PromptsType.prompt:
            return promptFileAttributes[attributeName];
        default:
            return undefined;
    }
}
// The list of tools known to be used by GitHub Copilot custom agents
export const knownGithubCopilotTools = [
    { name: SpecedToolAliases.execute, description: localize(8591, null) },
    { name: SpecedToolAliases.read, description: localize(8592, null) },
    { name: SpecedToolAliases.edit, description: localize(8593, null) },
    { name: SpecedToolAliases.search, description: localize(8594, null) },
    { name: SpecedToolAliases.agent, description: localize(8595, null) },
];
export const knownClaudeTools = [
    { name: 'Bash', description: localize(8596, null), toolEquivalent: [SpecedToolAliases.execute] },
    { name: 'Edit', description: localize(8597, null), toolEquivalent: ['edit/editNotebook', 'edit/editFiles'] },
    { name: 'Glob', description: localize(8598, null), toolEquivalent: ['search/fileSearch'] },
    { name: 'Grep', description: localize(8599, null), toolEquivalent: ['search/textSearch'] },
    { name: 'Read', description: localize(8600, null), toolEquivalent: ['read/readFile', 'read/getNotebookSummary'] },
    { name: 'Write', description: localize(8601, null), toolEquivalent: ['edit/createDirectory', 'edit/createFile', 'edit/createJupyterNotebook'] },
    { name: 'WebFetch', description: localize(8602, null), toolEquivalent: [SpecedToolAliases.web] },
    { name: 'WebSearch', description: localize(8603, null), toolEquivalent: [SpecedToolAliases.web] },
    { name: 'Task', description: localize(8604, null), toolEquivalent: [SpecedToolAliases.agent] },
    { name: 'Skill', description: localize(8605, null), toolEquivalent: [] },
    { name: 'LSP', description: localize(8606, null), toolEquivalent: [] },
    { name: 'NotebookEdit', description: localize(8607, null), toolEquivalent: ['edit/editNotebook'] },
    { name: 'AskUserQuestion', description: localize(8608, null), toolEquivalent: ['vscode/askQuestions'] },
    { name: 'MCPSearch', description: localize(8609, null), toolEquivalent: [] }
];
export const knownClaudeModels = [
    { name: 'sonnet', description: localize(8610, null), modelEquivalent: 'Claude Sonnet 4.5 (copilot)' },
    { name: 'opus', description: localize(8611, null), modelEquivalent: 'Claude Opus 4.6 (copilot)' },
    { name: 'haiku', description: localize(8612, null), modelEquivalent: 'Claude Haiku 4.5 (copilot)' },
    { name: 'inherit', description: localize(8613, null), modelEquivalent: undefined },
];
export function mapClaudeModels(claudeModelNames) {
    const result = [];
    for (const name of claudeModelNames) {
        const claudeModel = knownClaudeModels.find(model => model.name === name);
        if (claudeModel && claudeModel.modelEquivalent) {
            result.push(claudeModel.modelEquivalent);
        }
    }
    return result;
}
/**
 * Maps Claude tool names to their VS Code tool equivalents.
 */
export function mapClaudeTools(claudeToolNames) {
    const result = [];
    for (const name of claudeToolNames) {
        const claudeTool = knownClaudeTools.find(tool => tool.name === name);
        if (claudeTool) {
            result.push(...claudeTool.toolEquivalent);
        }
    }
    return result;
}
export const claudeAgentAttributes = {
    'name': {
        type: 'scalar',
        description: localize(8614, null),
    },
    'description': {
        type: 'scalar',
        description: localize(8615, null),
    },
    'tools': {
        type: 'sequence',
        description: localize(8616, null),
        defaults: ['Read, Edit, Bash'],
        items: knownClaudeTools
    },
    'disallowedTools': {
        type: 'sequence',
        description: localize(8617, null),
        defaults: ['Write, Edit, Bash'],
        items: knownClaudeTools
    },
    'model': {
        type: 'scalar',
        description: localize(8618, null),
        defaults: ['sonnet', 'opus', 'haiku', 'inherit'],
        enums: knownClaudeModels
    },
    'permissionMode': {
        type: 'scalar',
        description: localize(8619, null),
        defaults: ['default', 'acceptEdits', 'dontAsk', 'bypassPermissions', 'plan'],
        enums: [
            { name: 'default', description: localize(8620, null) },
            { name: 'acceptEdits', description: localize(8621, null) },
            { name: 'plan', description: localize(8622, null) },
            { name: 'delegate', description: localize(8623, null) },
            { name: 'dontAsk', description: localize(8624, null) },
            { name: 'bypassPermissions', description: localize(8625, null) }
        ]
    },
    'skills': {
        type: 'sequence',
        description: localize(8626, null),
    },
    'mcpServers': {
        type: 'sequence',
        description: localize(8627, null),
    },
    'hooks': {
        type: 'object',
        description: localize(8628, null),
    },
    'memory': {
        type: 'scalar',
        description: localize(8629, null),
        defaults: ['user', 'project', 'local'],
        enums: [
            { name: 'user', description: localize(8630, null) },
            { name: 'project', description: localize(8631, null) },
            { name: 'local', description: localize(8632, null) }
        ]
    }
};
/**
 * Attributes supported in Claude rules files (`.claude/rules/*.md`).
 * Claude rules use `paths` instead of `applyTo` for glob patterns.
 */
export const claudeRulesAttributes = {
    'description': {
        type: 'scalar',
        description: localize(8633, null),
    },
    'paths': {
        type: 'sequence',
        description: localize(8634, null),
    },
};
export function isVSCodeOrDefaultTarget(target) {
    return target === Target.VSCode || target === Target.Undefined;
}
export function getTarget(promptType, header) {
    const uri = header instanceof URI ? header : header.uri;
    if (promptType === PromptsType.agent) {
        const parentDir = dirname(uri);
        if (parentDir.path.endsWith(`/${CLAUDE_AGENTS_SOURCE_FOLDER}`)) {
            return Target.Claude;
        }
        if (!(header instanceof URI)) {
            const target = header.target;
            if (target === Target.GitHubCopilot || target === Target.VSCode) {
                return target;
            }
        }
        return Target.Undefined;
    }
    else if (promptType === PromptsType.instructions) {
        if (isInClaudeRulesFolder(uri)) {
            return Target.Claude;
        }
    }
    return Target.Undefined;
}
//# sourceMappingURL=promptFileAttributes.js.map