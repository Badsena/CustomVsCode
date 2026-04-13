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
import { MarkdownString } from '../../../../../../base/common/htmlContent.js';
import { localize } from '../../../../../../nls.js';
import { ILanguageModelsService } from '../../languageModels.js';
import { ILanguageModelToolsService, isToolSet } from '../../tools/languageModelToolsService.js';
import { IChatModeService, isBuiltinChatMode } from '../../chatModes.js';
import { getPromptsTypeForLanguageId, PromptsType, Target } from '../promptTypes.js';
import { IPromptsService } from '../service/promptsService.js';
import { parseCommaSeparatedList, PromptHeaderAttributes } from '../promptFileParser.js';
import { ClaudeHeaderAttributes, getAttributeDefinition, getTarget, isVSCodeOrDefaultTarget, knownClaudeModels, knownClaudeTools } from './promptFileAttributes.js';
import { HOOKS_BY_TARGET, HOOK_METADATA } from '../hookTypes.js';
import { HOOK_COMMAND_FIELD_DESCRIPTIONS } from '../hookSchema.js';
import { IConfigurationService } from '../../../../../../platform/configuration/common/configuration.js';
import { PromptsConfig } from '../config/config.js';
let PromptHoverProvider = class PromptHoverProvider {
    constructor(promptsService, languageModelToolsService, languageModelsService, chatModeService, configurationService) {
        this.promptsService = promptsService;
        this.languageModelToolsService = languageModelToolsService;
        this.languageModelsService = languageModelsService;
        this.chatModeService = chatModeService;
        this.configurationService = configurationService;
        /**
         * Debug display name for this provider.
         */
        this._debugDisplayName = 'PromptHoverProvider';
    }
    createHover(contents, range) {
        return {
            contents: [new MarkdownString(contents)],
            range
        };
    }
    async provideHover(model, position, token, _context) {
        const promptType = getPromptsTypeForLanguageId(model.getLanguageId());
        if (!promptType) {
            // if the model is not a prompt, we don't provide any hovers
            return undefined;
        }
        const promptAST = this.promptsService.getParsedPromptFile(model);
        const target = getTarget(promptType, promptAST.header ?? model.uri);
        if (promptAST.header?.range.containsPosition(position)) {
            return this.provideHeaderHover(position, promptType, promptAST.header, target);
        }
        if (promptAST.body?.range.containsPosition(position)) {
            return this.provideBodyHover(position, promptAST.body, target);
        }
        return undefined;
    }
    async provideBodyHover(position, body, target) {
        for (const ref of body.variableReferences) {
            if (ref.range.containsPosition(position)) {
                const toolName = ref.name;
                return this.getToolHoverByName(toolName, ref.range, target);
            }
        }
        return undefined;
    }
    async provideHeaderHover(position, promptType, header, target) {
        for (const attribute of header.attributes) {
            if (attribute.range.containsPosition(position)) {
                const description = getAttributeDefinition(attribute.key, promptType, target)?.description;
                if (description) {
                    switch (attribute.key) {
                        case PromptHeaderAttributes.model:
                            return this.getModelHover(attribute, position, description, target);
                        case PromptHeaderAttributes.tools:
                        case ClaudeHeaderAttributes.disallowedTools:
                            return this.getToolHover(attribute, position, description, target);
                        case PromptHeaderAttributes.agent:
                        case PromptHeaderAttributes.mode:
                            return this.getAgentHover(attribute, position, description);
                        case PromptHeaderAttributes.handOffs:
                            return this.getHandsOffHover(attribute, position, target);
                        case PromptHeaderAttributes.hooks:
                            if (!this.configurationService.getValue(PromptsConfig.USE_CUSTOM_AGENT_HOOKS)) {
                                return undefined;
                            }
                            return this.getHooksHover(attribute, position, description, target);
                        case PromptHeaderAttributes.infer:
                            return this.createHover(description + '\n\n' + localize(8640, null), attribute.range);
                        default:
                            return this.createHover(description, attribute.range);
                    }
                }
            }
        }
        return undefined;
    }
    getToolHover(node, position, baseMessage, target) {
        let value = node.value;
        if (value.type === 'scalar') {
            value = parseCommaSeparatedList(value);
        }
        if (value.type === 'sequence') {
            for (const toolName of value.items) {
                if (toolName.type === 'scalar' && toolName.range.containsPosition(position)) {
                    const description = this.getToolHoverByName(toolName.value, toolName.range, target);
                    if (description) {
                        return description;
                    }
                }
            }
        }
        return this.createHover(baseMessage, node.range);
    }
    getToolHoverByName(toolName, range, target) {
        if (target === Target.Claude) {
            const description = knownClaudeTools.find(tool => tool.name === toolName)?.description;
            if (description) {
                return this.createHover(description, range);
            }
            return undefined;
        }
        const tool = this.languageModelToolsService.getToolByFullReferenceName(toolName);
        if (tool !== undefined) {
            if (isToolSet(tool)) {
                return this.getToolsetHover(tool, range);
            }
            else {
                return this.createHover(tool.userDescription ?? tool.modelDescription, range);
            }
        }
        return undefined;
    }
    getToolsetHover(toolSet, range) {
        const lines = [];
        lines.push(localize(8641, null, toolSet.referenceName));
        if (toolSet.description) {
            lines.push(toolSet.description);
        }
        for (const tool of toolSet.getTools()) {
            lines.push(`- ${tool.toolReferenceName ?? tool.displayName}`);
        }
        return this.createHover(lines.join('\n'), range);
    }
    getModelHover(node, position, baseMessage, target) {
        if (target === Target.GitHubCopilot) {
            return this.createHover(baseMessage + '\n\n' + localize(8642, null), node.range);
        }
        const modelHoverContent = (modelName) => {
            const lines = [];
            lines.push(baseMessage + '\n');
            if (target === Target.Claude) {
                const claudeModel = knownClaudeModels.find(model => model.name === modelName);
                if (!claudeModel) {
                    return this.createHover(lines.join('\n'), node.range);
                }
                if (claudeModel.modelEquivalent) {
                    lines.push(localize(8643, null, modelName));
                    modelName = claudeModel.modelEquivalent;
                }
                else {
                    lines.push(claudeModel.description);
                    return this.createHover(lines.join('\n'), node.range);
                }
            }
            const result = this.languageModelsService.lookupLanguageModelByQualifiedName(modelName);
            if (result) {
                const meta = result.metadata;
                lines.push(localize(8644, null, meta.name));
                lines.push(localize(8645, null, meta.family));
                lines.push(localize(8646, null, meta.vendor));
                if (meta.tooltip) {
                    lines.push('', '', meta.tooltip);
                }
                return this.createHover(lines.join('\n'), node.range);
            }
            return undefined;
        };
        if (node.value.type === 'scalar') {
            const hover = modelHoverContent(node.value.value);
            if (hover) {
                return hover;
            }
        }
        else if (node.value.type === 'sequence') {
            for (const item of node.value.items) {
                if (item.type === 'scalar' && item.range.containsPosition(position)) {
                    const hover = modelHoverContent(item.value);
                    if (hover) {
                        return hover;
                    }
                }
            }
        }
        return this.createHover(baseMessage, node.range);
    }
    getAgentHover(agentAttribute, position, baseMessage) {
        const lines = [];
        const value = agentAttribute.value;
        if (value.type === 'scalar' && value.range.containsPosition(position)) {
            const agent = this.chatModeService.findModeByName(value.value);
            if (agent) {
                const description = agent.description.get() || (isBuiltinChatMode(agent) ? localize(8647, null) : localize(8648, null));
                lines.push(`\`${agent.name.get()}\`: ${description}`);
            }
        }
        else {
            const agents = this.chatModeService.getModes();
            lines.push(baseMessage);
            lines.push('');
            // Built-in agents
            lines.push(localize(8649, null));
            for (const agent of agents.builtin) {
                lines.push(`- \`${agent.name.get()}\`: ${agent.description.get() || agent.label.get()}`);
            }
            // Custom agents
            if (agents.custom.length > 0) {
                lines.push('');
                lines.push(localize(8650, null));
                for (const agent of agents.custom) {
                    const description = agent.description.get();
                    lines.push(`- \`${agent.name.get()}\`: ${description || localize(8651, null)}`);
                }
            }
        }
        return this.createHover(lines.join('\n'), agentAttribute.range);
    }
    getHooksHover(attribute, position, baseMessage, target) {
        const value = attribute.value;
        if (value.type === 'map') {
            const hooksByTarget = HOOKS_BY_TARGET[target] ?? HOOKS_BY_TARGET[Target.Undefined];
            for (const prop of value.properties) {
                // Hover on a hook event name key (e.g., SessionStart, PreToolUse)
                if (prop.key.range.containsPosition(position)) {
                    const hookType = hooksByTarget[prop.key.value];
                    if (hookType) {
                        const meta = HOOK_METADATA[hookType];
                        return this.createHover(`**${meta.label}**\n\n${meta.description}`, prop.key.range);
                    }
                }
                // Hover inside hook command entries
                if (prop.value.type === 'sequence') {
                    const hover = this.getHookCommandItemHover(prop.value, position);
                    if (hover) {
                        return hover;
                    }
                }
            }
        }
        return this.createHover(baseMessage, attribute.range);
    }
    /**
     * Recursively searches hook command items for hover information.
     * Handles both direct command objects and nested matcher format
     * (e.g., `{ matcher: "...", hooks: [{ type: command, ... }] }`).
     */
    getHookCommandItemHover(sequence, position) {
        for (const item of sequence.items) {
            if (item.type !== 'map' || !item.range.containsPosition(position)) {
                continue;
            }
            // Check for nested matcher format: { hooks: [...] }
            const nestedHooks = item.properties.find(p => p.key.value === 'hooks');
            if (nestedHooks && nestedHooks.value.type === 'sequence') {
                const hover = this.getHookCommandItemHover(nestedHooks.value, position);
                if (hover) {
                    return hover;
                }
            }
            // Check fields of the command object itself
            for (const field of item.properties) {
                if (field.key.range.containsPosition(position) || field.value.range.containsPosition(position)) {
                    const desc = HOOK_COMMAND_FIELD_DESCRIPTIONS[field.key.value];
                    if (desc) {
                        return this.createHover(desc, field.key.range);
                    }
                }
            }
        }
        return undefined;
    }
    getHandsOffHover(attribute, position, target) {
        const handoffsBaseMessage = getAttributeDefinition(PromptHeaderAttributes.handOffs, PromptsType.agent, target)?.description;
        if (!isVSCodeOrDefaultTarget(target)) {
            return this.createHover(handoffsBaseMessage + '\n\n' + localize(8652, null), attribute.range);
        }
        return this.createHover(handoffsBaseMessage, attribute.range);
    }
};
PromptHoverProvider = __decorate([
    __param(0, IPromptsService),
    __param(1, ILanguageModelToolsService),
    __param(2, ILanguageModelsService),
    __param(3, IChatModeService),
    __param(4, IConfigurationService)
], PromptHoverProvider);
export { PromptHoverProvider };
//# sourceMappingURL=promptHovers.js.map