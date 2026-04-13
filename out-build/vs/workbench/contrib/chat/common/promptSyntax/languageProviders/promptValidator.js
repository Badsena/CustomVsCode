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
import { isEmptyPattern, parse, splitGlobAware } from '../../../../../../base/common/glob.js';
import { Iterable } from '../../../../../../base/common/iterator.js';
import { Range } from '../../../../../../editor/common/core/range.js';
import { IModelService } from '../../../../../../editor/common/services/model.js';
import { localize } from '../../../../../../nls.js';
import { IInstantiationService } from '../../../../../../platform/instantiation/common/instantiation.js';
import { IMarkerService, MarkerSeverity } from '../../../../../../platform/markers/common/markers.js';
import { ChatMode, IChatModeService } from '../../chatModes.js';
import { ChatModeKind } from '../../constants.js';
import { ILanguageModelChatMetadata, ILanguageModelsService } from '../../languageModels.js';
import { ILanguageModelToolsService, SpecedToolAliases } from '../../tools/languageModelToolsService.js';
import { getPromptsTypeForLanguageId, PromptsType, Target } from '../promptTypes.js';
import { parseCommaSeparatedList, PromptHeaderAttributes } from '../promptFileParser.js';
import { Disposable, DisposableStore, toDisposable } from '../../../../../../base/common/lifecycle.js';
import { Delayer } from '../../../../../../base/common/async.js';
import { ResourceMap } from '../../../../../../base/common/map.js';
import { IFileService } from '../../../../../../platform/files/common/files.js';
import { IConfigurationService } from '../../../../../../platform/configuration/common/configuration.js';
import { IPromptsService } from '../service/promptsService.js';
import { ILabelService } from '../../../../../../platform/label/common/label.js';
import { AGENTS_SOURCE_FOLDER, CLAUDE_AGENTS_SOURCE_FOLDER, isInClaudeRulesFolder, LEGACY_MODE_FILE_EXTENSION } from '../config/promptFileLocations.js';
import { Lazy } from '../../../../../../base/common/lazy.js';
import { CancellationToken } from '../../../../../../base/common/cancellation.js';
import { dirname } from '../../../../../../base/common/resources.js';
import { URI } from '../../../../../../base/common/uri.js';
import { HOOKS_BY_TARGET } from '../hookTypes.js';
import { PromptsConfig } from '../config/config.js';
import { GithubPromptHeaderAttributes } from './promptFileAttributes.js';
export const MARKERS_OWNER_ID = 'prompts-diagnostics-provider';
let PromptValidator = class PromptValidator {
    constructor(languageModelsService, languageModelToolsService, chatModeService, fileService, labelService, promptsService, configurationService) {
        this.languageModelsService = languageModelsService;
        this.languageModelToolsService = languageModelToolsService;
        this.chatModeService = chatModeService;
        this.fileService = fileService;
        this.labelService = labelService;
        this.promptsService = promptsService;
        this.configurationService = configurationService;
    }
    async validate(promptAST, promptType, report) {
        promptAST.header?.errors.forEach(error => report(toMarker(error.message, error.range, MarkerSeverity.Error)));
        const target = getTarget(promptType, promptAST.header ?? promptAST.uri);
        await this.validateHeader(promptAST, promptType, target, report);
        await this.validateBody(promptAST, target, report);
        await this.validateFileName(promptAST, promptType, report);
        await this.validateSkillFolderName(promptAST, promptType, report);
    }
    async validateFileName(promptAST, promptType, report) {
        if (promptType === PromptsType.agent && promptAST.uri.path.endsWith(LEGACY_MODE_FILE_EXTENSION)) {
            const location = this.promptsService.getAgentFileURIFromModeFile(promptAST.uri);
            if (location && await this.fileService.canCreateFile(location)) {
                report(toMarker(localize(8653, null, location.toString()), new Range(1, 1, 1, 4), MarkerSeverity.Warning));
            }
            else {
                report(toMarker(localize(8654, null, AGENTS_SOURCE_FOLDER), new Range(1, 1, 1, 4), MarkerSeverity.Warning));
            }
        }
    }
    async validateSkillFolderName(promptAST, promptType, report) {
        if (promptType !== PromptsType.skill) {
            return;
        }
        const nameAttribute = promptAST.header?.attributes.find(attr => attr.key === PromptHeaderAttributes.name);
        if (!nameAttribute || nameAttribute.value.type !== 'scalar') {
            return;
        }
        const skillName = nameAttribute.value.value.trim();
        if (!skillName) {
            return;
        }
        // Extract folder name from path (e.g., .github/skills/my-skill/SKILL.md -> my-skill)
        const pathParts = promptAST.uri.path.split('/');
        const skillIndex = pathParts.findIndex(part => part === 'SKILL.md');
        if (skillIndex > 0) {
            const folderName = pathParts[skillIndex - 1];
            if (folderName && skillName !== folderName) {
                report(toMarker(localize(8655, null, skillName, folderName), nameAttribute.value.range, MarkerSeverity.Warning));
            }
        }
    }
    async validateBody(promptAST, target, report) {
        const body = promptAST.body;
        if (!body) {
            return;
        }
        // Validate file references
        const fileReferenceChecks = [];
        for (const ref of body.fileReferences) {
            const resolved = body.resolveFilePath(ref.content);
            if (!resolved) {
                report(toMarker(localize(8656, null, ref.content), ref.range, MarkerSeverity.Warning));
                continue;
            }
            if (promptAST.uri.scheme === resolved.scheme) {
                // only validate if the link is in the file system of the prompt file
                fileReferenceChecks.push((async () => {
                    try {
                        const exists = await this.fileService.exists(resolved);
                        if (exists) {
                            return;
                        }
                    }
                    catch {
                    }
                    const loc = this.labelService.getUriLabel(resolved);
                    report(toMarker(localize(8657, null, ref.content, loc), ref.range, MarkerSeverity.Warning));
                })());
            }
        }
        // Validate variable references (tool or toolset names)
        if (body.variableReferences.length && isVSCodeOrDefaultTarget(target)) {
            const headerTools = promptAST.header?.tools;
            const headerToolsMap = headerTools ? this.languageModelToolsService.toToolAndToolSetEnablementMap(headerTools, undefined) : undefined;
            const available = new Set(this.languageModelToolsService.getFullReferenceNames());
            const deprecatedNames = this.languageModelToolsService.getDeprecatedFullReferenceNames();
            for (const variable of body.variableReferences) {
                if (!available.has(variable.name)) {
                    if (deprecatedNames.has(variable.name)) {
                        const currentNames = deprecatedNames.get(variable.name);
                        if (currentNames && currentNames.size > 0) {
                            if (currentNames.size === 1) {
                                const newName = Array.from(currentNames)[0];
                                report(toMarker(localize(8658, null, variable.name, newName), variable.range, MarkerSeverity.Info));
                            }
                            else {
                                const newNames = Array.from(currentNames).sort((a, b) => a.localeCompare(b)).join(', ');
                                report(toMarker(localize(8659, null, variable.name, newNames), variable.range, MarkerSeverity.Info));
                            }
                        }
                    }
                    else {
                        report(toMarker(localize(8660, null, variable.name), variable.range, MarkerSeverity.Warning));
                    }
                }
                else if (headerToolsMap) {
                    const tool = this.languageModelToolsService.getToolByFullReferenceName(variable.name);
                    if (tool && headerToolsMap.get(tool) === false) {
                        report(toMarker(localize(8661, null, variable.name), variable.range, MarkerSeverity.Warning));
                    }
                }
            }
        }
        await Promise.all(fileReferenceChecks);
    }
    async validateHeader(promptAST, promptType, target, report) {
        const header = promptAST.header;
        if (!header) {
            return;
        }
        const attributes = header.attributes;
        this.checkForInvalidArguments(attributes, promptType, target, report);
        this.validateName(attributes, report);
        this.validateDescription(attributes, report);
        this.validateArgumentHint(attributes, report);
        switch (promptType) {
            case PromptsType.prompt: {
                const agent = this.validateAgent(attributes, report);
                this.validateTools(attributes, agent?.kind ?? ChatModeKind.Agent, target, report);
                this.validateModel(attributes, agent?.kind ?? ChatModeKind.Agent, report);
                break;
            }
            case PromptsType.instructions:
                if (target === Target.Claude) {
                    this.validatePaths(attributes, report);
                }
                else {
                    this.validateApplyTo(attributes, report);
                }
                this.validateExcludeAgent(attributes, report);
                break;
            case PromptsType.agent: {
                this.validateTarget(attributes, report);
                this.validateInfer(attributes, report);
                this.validateUserInvocable(attributes, report);
                this.validateUserInvokable(attributes, report);
                this.validateDisableModelInvocation(attributes, report);
                this.validateTools(attributes, ChatModeKind.Agent, target, report);
                if (this.configurationService.getValue(PromptsConfig.USE_CUSTOM_AGENT_HOOKS)) {
                    this.validateHooks(attributes, target, report);
                }
                if (isVSCodeOrDefaultTarget(target)) {
                    this.validateModel(attributes, ChatModeKind.Agent, report);
                    this.validateHandoffs(attributes, report);
                    await this.validateAgentsAttribute(attributes, header, report);
                    this.validateGithubPermissions(attributes, report);
                }
                else if (target === Target.Claude) {
                    this.validateClaudeAttributes(attributes, report);
                }
                else if (target === Target.GitHubCopilot) {
                    this.validateGithubPermissions(attributes, report);
                }
                break;
            }
            case PromptsType.skill:
                this.validateUserInvocable(attributes, report);
                this.validateUserInvokable(attributes, report);
                this.validateDisableModelInvocation(attributes, report);
                break;
        }
    }
    checkForInvalidArguments(attributes, promptType, target, report) {
        let validAttributeNames = getValidAttributeNames(promptType, true, target);
        if (!this.configurationService.getValue(PromptsConfig.USE_CUSTOM_AGENT_HOOKS)) {
            validAttributeNames = validAttributeNames.filter(name => name !== PromptHeaderAttributes.hooks);
        }
        const useCustomAgentHooks = this.configurationService.getValue(PromptsConfig.USE_CUSTOM_AGENT_HOOKS);
        const validGithubCopilotAttributeNames = new Lazy(() => new Set(getValidAttributeNames(promptType, false, Target.GitHubCopilot)));
        for (const attribute of attributes) {
            if (!validAttributeNames.includes(attribute.key)) {
                const supportedNames = new Lazy(() => {
                    let names = getValidAttributeNames(promptType, false, target);
                    if (!useCustomAgentHooks) {
                        names = names.filter(name => name !== PromptHeaderAttributes.hooks);
                    }
                    return names.sort().join(', ');
                });
                switch (promptType) {
                    case PromptsType.prompt:
                        report(toMarker(localize(8662, null, attribute.key, supportedNames.value), attribute.range, MarkerSeverity.Warning));
                        break;
                    case PromptsType.agent:
                        if (target === Target.GitHubCopilot) {
                            report(toMarker(localize(8663, null, attribute.key, supportedNames.value), attribute.range, MarkerSeverity.Warning));
                        }
                        else if (target === Target.Claude) {
                            // ignore for now as we don't have a full list of supported attributes for claude target
                        }
                        else {
                            if (validGithubCopilotAttributeNames.value.has(attribute.key)) {
                                report(toMarker(localize(8664, null, attribute.key), attribute.range, MarkerSeverity.Info));
                            }
                            else {
                                report(toMarker(localize(8665, null, attribute.key, supportedNames.value), attribute.range, MarkerSeverity.Warning));
                            }
                        }
                        break;
                    case PromptsType.instructions:
                        if (target === Target.Claude) {
                            report(toMarker(localize(8666, null, attribute.key, supportedNames.value), attribute.range, MarkerSeverity.Warning));
                        }
                        else {
                            report(toMarker(localize(8667, null, attribute.key, supportedNames.value), attribute.range, MarkerSeverity.Warning));
                        }
                        break;
                    case PromptsType.skill:
                        report(toMarker(localize(8668, null, attribute.key, supportedNames.value), attribute.range, MarkerSeverity.Warning));
                        break;
                }
            }
        }
    }
    validateName(attributes, report) {
        const nameAttribute = attributes.find(attr => attr.key === PromptHeaderAttributes.name);
        if (!nameAttribute) {
            return;
        }
        if (nameAttribute.value.type !== 'scalar') {
            report(toMarker(localize(8669, null), nameAttribute.range, MarkerSeverity.Error));
            return;
        }
        if (nameAttribute.value.value.trim().length === 0) {
            report(toMarker(localize(8670, null), nameAttribute.value.range, MarkerSeverity.Error));
            return;
        }
    }
    validateDescription(attributes, report) {
        const descriptionAttribute = attributes.find(attr => attr.key === PromptHeaderAttributes.description);
        if (!descriptionAttribute) {
            return;
        }
        if (descriptionAttribute.value.type !== 'scalar') {
            report(toMarker(localize(8671, null), descriptionAttribute.range, MarkerSeverity.Error));
            return;
        }
        if (descriptionAttribute.value.value.trim().length === 0) {
            report(toMarker(localize(8672, null), descriptionAttribute.value.range, MarkerSeverity.Error));
            return;
        }
    }
    validateArgumentHint(attributes, report) {
        const argumentHintAttribute = attributes.find(attr => attr.key === PromptHeaderAttributes.argumentHint);
        if (!argumentHintAttribute) {
            return;
        }
        if (argumentHintAttribute.value.type !== 'scalar') {
            report(toMarker(localize(8673, null), argumentHintAttribute.range, MarkerSeverity.Error));
            return;
        }
        if (argumentHintAttribute.value.value.trim().length === 0) {
            report(toMarker(localize(8674, null), argumentHintAttribute.value.range, MarkerSeverity.Error));
            return;
        }
    }
    validateModel(attributes, agentKind, report) {
        const attribute = attributes.find(attr => attr.key === PromptHeaderAttributes.model);
        if (!attribute) {
            return;
        }
        if (attribute.value.type !== 'scalar' && attribute.value.type !== 'sequence') {
            report(toMarker(localize(8675, null), attribute.value.range, MarkerSeverity.Error));
            return;
        }
        const modelNames = [];
        if (attribute.value.type === 'scalar') {
            const modelName = attribute.value.value.trim();
            if (modelName.length === 0) {
                report(toMarker(localize(8676, null), attribute.value.range, MarkerSeverity.Error));
                return;
            }
            modelNames.push([modelName, attribute.value.range]);
        }
        else if (attribute.value.type === 'sequence') {
            if (attribute.value.items.length === 0) {
                report(toMarker(localize(8677, null), attribute.value.range, MarkerSeverity.Error));
                return;
            }
            for (const item of attribute.value.items) {
                if (item.type !== 'scalar') {
                    report(toMarker(localize(8678, null), item.range, MarkerSeverity.Error));
                    return;
                }
                const modelName = item.value.trim();
                if (modelName.length === 0) {
                    report(toMarker(localize(8679, null), item.range, MarkerSeverity.Error));
                    return;
                }
                modelNames.push([modelName, item.range]);
            }
        }
        const languageModels = this.languageModelsService.getLanguageModelIds();
        if (languageModels.length === 0) {
            // likely the service is not initialized yet
            return;
        }
        for (const [modelName, range] of modelNames) {
            const modelMetadata = this.findModelByName(modelName);
            if (!modelMetadata) {
                report(toMarker(localize(8680, null, modelName), range, MarkerSeverity.Warning));
            }
            else if (agentKind === ChatModeKind.Agent && !ILanguageModelChatMetadata.suitableForAgentMode(modelMetadata)) {
                report(toMarker(localize(8681, null, modelName), range, MarkerSeverity.Warning));
            }
        }
    }
    validateClaudeAttributes(attributes, report) {
        // vaidate all claude-specific attributes that have enum values
        for (const claudeAttributeName in claudeAgentAttributes) {
            const claudeAttribute = claudeAgentAttributes[claudeAttributeName];
            const enumValues = claudeAttribute.enums;
            if (enumValues) {
                const attribute = attributes.find(attr => attr.key === claudeAttributeName);
                if (!attribute) {
                    continue;
                }
                if (attribute.value.type !== 'scalar') {
                    report(toMarker(localize(8682, null, claudeAttributeName), attribute.value.range, MarkerSeverity.Error));
                    continue;
                }
                else {
                    const modelName = attribute.value.value.trim();
                    if (enumValues.every(model => model.name !== modelName)) {
                        const validValues = enumValues.map(model => model.name).join(', ');
                        report(toMarker(localize(8683, null, modelName, validValues), attribute.value.range, MarkerSeverity.Warning));
                    }
                }
            }
        }
    }
    findModelByName(modelName) {
        const metadataAndId = this.languageModelsService.lookupLanguageModelByQualifiedName(modelName);
        if (metadataAndId && metadataAndId.metadata.isUserSelectable !== false) {
            return metadataAndId.metadata;
        }
        return undefined;
    }
    validateAgent(attributes, report) {
        const agentAttribute = attributes.find(attr => attr.key === PromptHeaderAttributes.agent);
        const modeAttribute = attributes.find(attr => attr.key === PromptHeaderAttributes.mode);
        if (modeAttribute) {
            if (agentAttribute) {
                report(toMarker(localize(8684, null), modeAttribute.range, MarkerSeverity.Warning));
            }
            else {
                report(toMarker(localize(8685, null), modeAttribute.range, MarkerSeverity.Error));
            }
        }
        const attribute = attributes.find(attr => attr.key === PromptHeaderAttributes.agent) ?? modeAttribute;
        if (!attribute) {
            return undefined; // default agent for prompts is Agent
        }
        if (attribute.value.type !== 'scalar') {
            report(toMarker(localize(8686, null, attribute.key), attribute.value.range, MarkerSeverity.Error));
            return undefined;
        }
        const agentValue = attribute.value.value;
        if (agentValue.trim().length === 0) {
            report(toMarker(localize(8687, null, attribute.key), attribute.value.range, MarkerSeverity.Error));
            return undefined;
        }
        return this.validateAgentValue(attribute.value, report);
    }
    validateAgentValue(value, report) {
        const agents = this.chatModeService.getModes();
        const availableAgents = [];
        // Check if agent exists in builtin or custom agents
        for (const agent of Iterable.concat(agents.builtin, agents.custom)) {
            if (agent.name.get() === value.value) {
                return agent;
            }
            availableAgents.push(agent.name.get()); // collect all available agent names
        }
        const errorMessage = localize(8688, null, value.value, availableAgents.join(', '));
        report(toMarker(errorMessage, value.range, MarkerSeverity.Warning));
        return undefined;
    }
    validateTools(attributes, agentKind, target, report) {
        const attribute = attributes.find(attr => attr.key === PromptHeaderAttributes.tools);
        if (!attribute) {
            return;
        }
        if (agentKind !== ChatModeKind.Agent) {
            report(toMarker(localize(8689, null), attribute.range, MarkerSeverity.Warning));
        }
        let value = attribute.value;
        if (value.type === 'scalar') {
            value = parseCommaSeparatedList(value);
        }
        if (value.type !== 'sequence') {
            report(toMarker(localize(8690, null), attribute.value.range, MarkerSeverity.Error));
            return;
        }
        if (target === Target.GitHubCopilot || target === Target.Claude) {
            // no validation for github-copilot target and claude
        }
        else {
            this.validateVSCodeTools(value, report);
        }
    }
    validateVSCodeTools(valueItem, report) {
        if (valueItem.items.length > 0) {
            const available = new Set(this.languageModelToolsService.getFullReferenceNames());
            const deprecatedNames = this.languageModelToolsService.getDeprecatedFullReferenceNames();
            for (const item of valueItem.items) {
                if (item.type !== 'scalar') {
                    report(toMarker(localize(8691, null), item.range, MarkerSeverity.Error));
                }
                else if (item.value) {
                    if (!available.has(item.value)) {
                        const currentNames = deprecatedNames.get(item.value);
                        if (currentNames) {
                            if (currentNames?.size === 1) {
                                const newName = Array.from(currentNames)[0];
                                report(toMarker(localize(8692, null, item.value, newName), item.range, MarkerSeverity.Info));
                            }
                            else {
                                const newNames = Array.from(currentNames).sort((a, b) => a.localeCompare(b)).join(', ');
                                report(toMarker(localize(8693, null, item.value, newNames), item.range, MarkerSeverity.Info));
                            }
                        }
                        else {
                            report(toMarker(localize(8694, null, item.value), item.range, MarkerSeverity.Warning));
                        }
                    }
                }
            }
        }
    }
    validateApplyTo(attributes, report) {
        const attribute = attributes.find(attr => attr.key === PromptHeaderAttributes.applyTo);
        if (!attribute) {
            return;
        }
        if (attribute.value.type !== 'scalar') {
            report(toMarker(localize(8695, null), attribute.value.range, MarkerSeverity.Error));
            return;
        }
        const pattern = attribute.value.value;
        try {
            const patterns = splitGlobAware(pattern, ',');
            if (patterns.length === 0) {
                report(toMarker(localize(8696, null), attribute.value.range, MarkerSeverity.Error));
                return;
            }
            for (const pattern of patterns) {
                const globPattern = parse(pattern);
                if (isEmptyPattern(globPattern)) {
                    report(toMarker(localize(8697, null), attribute.value.range, MarkerSeverity.Error));
                    return;
                }
            }
        }
        catch (_error) {
            report(toMarker(localize(8698, null), attribute.value.range, MarkerSeverity.Error));
        }
    }
    validatePaths(attributes, report) {
        const attribute = attributes.find(attr => attr.key === PromptHeaderAttributes.paths);
        if (!attribute) {
            return;
        }
        if (attribute.value.type !== 'sequence') {
            report(toMarker(localize(8699, null), attribute.value.range, MarkerSeverity.Error));
            return;
        }
        for (const item of attribute.value.items) {
            if (item.type !== 'scalar') {
                report(toMarker(localize(8700, null), item.range, MarkerSeverity.Error));
                continue;
            }
            const pattern = item.value.trim();
            if (pattern.length === 0) {
                report(toMarker(localize(8701, null), item.range, MarkerSeverity.Error));
                continue;
            }
            try {
                const globPattern = parse(pattern);
                if (isEmptyPattern(globPattern)) {
                    report(toMarker(localize(8702, null, pattern), item.range, MarkerSeverity.Error));
                }
            }
            catch (_error) {
                report(toMarker(localize(8703, null, pattern), item.range, MarkerSeverity.Error));
            }
        }
    }
    validateExcludeAgent(attributes, report) {
        const attribute = attributes.find(attr => attr.key === PromptHeaderAttributes.excludeAgent);
        if (!attribute) {
            return;
        }
        if (attribute.value.type !== 'sequence' && attribute.value.type !== 'scalar') {
            report(toMarker(localize(8704, null), attribute.value.range, MarkerSeverity.Error));
            return;
        }
    }
    validateHooks(attributes, target, report) {
        const attribute = attributes.find(attr => attr.key === PromptHeaderAttributes.hooks);
        if (!attribute) {
            return;
        }
        if (attribute.value.type !== 'map') {
            report(toMarker(localize(8705, null), attribute.value.range, MarkerSeverity.Error));
            return;
        }
        const validHookNames = new Set(Object.keys(HOOKS_BY_TARGET[target] ?? HOOKS_BY_TARGET[Target.Undefined]));
        for (const prop of attribute.value.properties) {
            if (!validHookNames.has(prop.key.value)) {
                report(toMarker(localize(8706, null, prop.key.value, Array.from(validHookNames).join(', ')), prop.key.range, MarkerSeverity.Warning));
            }
            if (prop.value.type !== 'sequence') {
                report(toMarker(localize(8707, null, prop.key.value), prop.value.range, MarkerSeverity.Error));
                continue;
            }
            for (const item of prop.value.items) {
                this.validateHookCommand(item, target, report);
            }
        }
    }
    validateHookCommand(item, target, report) {
        if (item.type !== 'map') {
            report(toMarker(localize(8708, null), item.range, MarkerSeverity.Error));
            return;
        }
        // Detect nested matcher format: { matcher?: "...", hooks: [{ type: 'command', command: '...' }] }
        const hooksProperty = item.properties.find(p => p.key.value === 'hooks');
        if (hooksProperty) {
            // Validate that only known matcher properties are present
            for (const prop of item.properties) {
                if (prop.key.value !== 'hooks' && prop.key.value !== 'matcher') {
                    report(toMarker(localize(8709, null, prop.key.value), prop.key.range, MarkerSeverity.Warning));
                }
            }
            if (hooksProperty.value.type !== 'sequence') {
                report(toMarker(localize(8710, null), hooksProperty.value.range, MarkerSeverity.Error));
                return;
            }
            for (const nestedItem of hooksProperty.value.items) {
                this.validateHookCommand(nestedItem, target, report);
            }
            return;
        }
        const isCopilotCli = target === Target.GitHubCopilot;
        // Determine valid and command-providing properties based on target
        const validCommandFields = isCopilotCli
            ? new Set(['bash', 'powershell'])
            : new Set(['command', 'windows', 'linux', 'osx', 'bash', 'powershell']);
        const validProperties = isCopilotCli
            ? new Set(['type', 'bash', 'powershell', 'cwd', 'env', 'timeoutSec'])
            : new Set(['type', 'command', 'windows', 'linux', 'osx', 'bash', 'powershell', 'cwd', 'env', 'timeout']);
        let hasType = false;
        let hasCommandField = false;
        for (const prop of item.properties) {
            const key = prop.key.value;
            if (!validProperties.has(key)) {
                report(toMarker(localize(8711, null, key), prop.key.range, MarkerSeverity.Warning));
            }
            if (key === 'type') {
                hasType = true;
                if (prop.value.type !== 'scalar' || prop.value.value !== 'command') {
                    report(toMarker(localize(8712, null), prop.value.range, MarkerSeverity.Error));
                }
            }
            else if (validCommandFields.has(key)) {
                hasCommandField = true;
                if (prop.value.type !== 'scalar' || prop.value.value.trim().length === 0) {
                    report(toMarker(localize(8713, null, key), prop.value.range, MarkerSeverity.Error));
                }
            }
            else if (key === 'cwd') {
                if (prop.value.type !== 'scalar') {
                    report(toMarker(localize(8714, null), prop.value.range, MarkerSeverity.Error));
                }
            }
            else if (key === 'env') {
                if (prop.value.type !== 'map') {
                    report(toMarker(localize(8715, null), prop.value.range, MarkerSeverity.Error));
                }
                else {
                    for (const envProp of prop.value.properties) {
                        if (envProp.value.type !== 'scalar') {
                            report(toMarker(localize(8716, null, envProp.key.value), envProp.value.range, MarkerSeverity.Error));
                        }
                    }
                }
            }
            else if (key === 'timeout' || key === 'timeoutSec') {
                if (prop.value.type !== 'scalar' || isNaN(Number(prop.value.value))) {
                    report(toMarker(localize(8717, null, key), prop.value.range, MarkerSeverity.Error));
                }
            }
        }
        if (!hasType) {
            report(toMarker(localize(8718, null), item.range, MarkerSeverity.Error));
        }
        if (!hasCommandField) {
            if (isCopilotCli) {
                report(toMarker(localize(8719, null), item.range, MarkerSeverity.Error));
            }
            else {
                report(toMarker(localize(8720, null), item.range, MarkerSeverity.Error));
            }
        }
    }
    validateHandoffs(attributes, report) {
        const attribute = attributes.find(attr => attr.key === PromptHeaderAttributes.handOffs);
        if (!attribute) {
            return;
        }
        if (attribute.value.type !== 'sequence') {
            report(toMarker(localize(8721, null), attribute.value.range, MarkerSeverity.Error));
            return;
        }
        const seenLabels = new Map();
        for (const item of attribute.value.items) {
            if (item.type !== 'map') {
                report(toMarker(localize(8722, null), item.range, MarkerSeverity.Error));
                continue;
            }
            const required = new Set(['label', 'agent', 'prompt']);
            for (const prop of item.properties) {
                switch (prop.key.value) {
                    case 'label':
                        if (prop.value.type !== 'scalar' || prop.value.value.trim().length === 0) {
                            report(toMarker(localize(8723, null), prop.value.range, MarkerSeverity.Error));
                        }
                        else if (!/[a-zA-Z0-9]/.test(prop.value.value)) {
                            report(toMarker(localize(8724, null), prop.value.range, MarkerSeverity.Error));
                        }
                        break;
                    case 'agent':
                        if (prop.value.type !== 'scalar' || prop.value.value.trim().length === 0) {
                            report(toMarker(localize(8725, null), prop.value.range, MarkerSeverity.Error));
                        }
                        else {
                            this.validateAgentValue(prop.value, report);
                        }
                        break;
                    case 'prompt':
                        if (prop.value.type !== 'scalar') {
                            report(toMarker(localize(8726, null), prop.value.range, MarkerSeverity.Error));
                        }
                        break;
                    case 'send':
                        if (!isTrueOrFalse(prop.value)) {
                            report(toMarker(localize(8727, null), prop.value.range, MarkerSeverity.Error));
                        }
                        break;
                    case 'showContinueOn':
                        if (!isTrueOrFalse(prop.value)) {
                            report(toMarker(localize(8728, null), prop.value.range, MarkerSeverity.Error));
                        }
                        break;
                    case 'model':
                        if (prop.value.type !== 'scalar') {
                            report(toMarker(localize(8729, null), prop.value.range, MarkerSeverity.Error));
                        }
                        break;
                    default:
                        report(toMarker(localize(8730, null, prop.key.value), prop.value.range, MarkerSeverity.Warning));
                }
                required.delete(prop.key.value);
            }
            if (required.size > 0) {
                report(toMarker(localize(8731, null, Array.from(required).map(s => `'${s}'`).join(', ')), item.range, MarkerSeverity.Error));
            }
            // Detect duplicate labels (case-insensitive, consistent with ExecuteHandoffAction lookup)
            const labelProp = item.properties.find(p => p.key.value === 'label');
            if (labelProp?.value.type === 'scalar') {
                const normalizedLabel = labelProp.value.value.toLowerCase();
                if (normalizedLabel && seenLabels.has(normalizedLabel)) {
                    report(toMarker(localize(8732, null, labelProp.value.value), labelProp.value.range, MarkerSeverity.Error));
                }
                else if (normalizedLabel) {
                    seenLabels.set(normalizedLabel, labelProp.value.range);
                }
            }
        }
    }
    validateInfer(attributes, report) {
        const attribute = attributes.find(attr => attr.key === PromptHeaderAttributes.infer);
        if (!attribute) {
            return;
        }
        report(toMarker(localize(8733, null), attribute.value.range, MarkerSeverity.Error));
    }
    validateTarget(attributes, report) {
        const attribute = attributes.find(attr => attr.key === PromptHeaderAttributes.target);
        if (!attribute) {
            return;
        }
        if (attribute.value.type !== 'scalar') {
            report(toMarker(localize(8734, null), attribute.value.range, MarkerSeverity.Error));
            return;
        }
        const targetValue = attribute.value.value.trim();
        if (targetValue.length === 0) {
            report(toMarker(localize(8735, null), attribute.value.range, MarkerSeverity.Error));
            return;
        }
        const validTargets = ['github-copilot', 'vscode'];
        if (!validTargets.includes(targetValue)) {
            report(toMarker(localize(8736, null, validTargets.join(', ')), attribute.value.range, MarkerSeverity.Error));
        }
    }
    validateUserInvocable(attributes, report) {
        const attribute = attributes.find(attr => attr.key === PromptHeaderAttributes.userInvocable);
        if (!attribute) {
            return;
        }
        if (!isTrueOrFalse(attribute.value)) {
            report(toMarker(localize(8737, null), attribute.value.range, MarkerSeverity.Error));
            return;
        }
    }
    validateUserInvokable(attributes, report) {
        const attribute = attributes.find(attr => attr.key === PromptHeaderAttributes.userInvokable);
        if (!attribute) {
            return;
        }
        report(toMarker(localize(8738, null), attribute.range, MarkerSeverity.Warning));
    }
    validateDisableModelInvocation(attributes, report) {
        const attribute = attributes.find(attr => attr.key === PromptHeaderAttributes.disableModelInvocation);
        if (!attribute) {
            return;
        }
        if (!isTrueOrFalse(attribute.value)) {
            report(toMarker(localize(8739, null), attribute.value.range, MarkerSeverity.Error));
            return;
        }
    }
    async validateAgentsAttribute(attributes, header, report) {
        const attribute = attributes.find(attr => attr.key === PromptHeaderAttributes.agents);
        if (!attribute) {
            return;
        }
        if (attribute.value.type !== 'sequence') {
            report(toMarker(localize(8740, null), attribute.value.range, MarkerSeverity.Error));
            return;
        }
        // Collect available agent names
        const agents = await this.promptsService.getCustomAgents(CancellationToken.None);
        const availableAgentNames = new Set(agents.map(agent => agent.name));
        availableAgentNames.add(ChatMode.Agent.name.get()); // include default agent
        // Check each item is a string and agent exists
        const agentNames = [];
        for (const item of attribute.value.items) {
            if (item.type !== 'scalar') {
                report(toMarker(localize(8741, null), item.range, MarkerSeverity.Error));
            }
            else if (item.value) {
                agentNames.push(item.value);
                if (item.value !== '*' && !availableAgentNames.has(item.value)) {
                    report(toMarker(localize(8742, null, item.value, Array.from(availableAgentNames).join(', ')), item.range, MarkerSeverity.Warning));
                }
            }
        }
        // If not wildcard and not empty, check that 'agent' tool is available
        if (agentNames.length > 0) {
            const tools = header.tools;
            if (tools && !tools.includes(SpecedToolAliases.agent)) {
                report(toMarker(localize(8743, null), attribute.value.range, MarkerSeverity.Warning));
            }
        }
    }
    validateGithubPermissions(attributes, report) {
        const attribute = attributes.find(attr => attr.key === GithubPromptHeaderAttributes.github);
        if (!attribute) {
            return;
        }
        if (attribute.value.type !== 'map') {
            report(toMarker(localize(8744, null), attribute.value.range, MarkerSeverity.Error));
            return;
        }
        for (const prop of attribute.value.properties) {
            if (prop.key.value !== 'permissions') {
                report(toMarker(localize(8745, null, prop.key.value), prop.key.range, MarkerSeverity.Warning));
                continue;
            }
            if (prop.value.type !== 'map') {
                report(toMarker(localize(8746, null), prop.value.range, MarkerSeverity.Error));
                continue;
            }
            for (const permProp of prop.value.properties) {
                const scope = permProp.key.value;
                const scopeInfo = githubPermissionScopes[scope];
                if (!scopeInfo) {
                    const validScopes = Object.keys(githubPermissionScopes).sort().join(', ');
                    report(toMarker(localize(8747, null, scope, validScopes), permProp.key.range, MarkerSeverity.Warning));
                    continue;
                }
                if (permProp.value.type !== 'scalar') {
                    report(toMarker(localize(8748, null, scope), permProp.value.range, MarkerSeverity.Error));
                    continue;
                }
                const value = permProp.value.value;
                if (!scopeInfo.allowedValues.includes(value)) {
                    report(toMarker(localize(8749, null, value, scope, scopeInfo.allowedValues.join(', ')), permProp.value.range, MarkerSeverity.Error));
                }
            }
        }
    }
};
PromptValidator = __decorate([
    __param(0, ILanguageModelsService),
    __param(1, ILanguageModelToolsService),
    __param(2, IChatModeService),
    __param(3, IFileService),
    __param(4, ILabelService),
    __param(5, IPromptsService),
    __param(6, IConfigurationService)
], PromptValidator);
export { PromptValidator };
export const githubPermissionScopes = {
    'actions': { allowedValues: ['read', 'write', 'none'], description: localize(8750, null) },
    'checks': { allowedValues: ['read', 'none'], description: localize(8751, null) },
    'contents': { allowedValues: ['read', 'write', 'none'], description: localize(8752, null) },
    'discussions': { allowedValues: ['read', 'write', 'none'], description: localize(8753, null) },
    'issues': { allowedValues: ['read', 'write', 'none'], description: localize(8754, null) },
    'metadata': { allowedValues: ['read'], description: localize(8755, null) },
    'pull-requests': { allowedValues: ['read', 'write', 'none'], description: localize(8756, null) },
    'security-events': { allowedValues: ['read', 'none'], description: localize(8757, null) },
    'workflows': { allowedValues: ['write', 'none'], description: localize(8758, null) },
};
function isTrueOrFalse(value) {
    if (value.type === 'scalar') {
        return (value.value === 'true' || value.value === 'false') && value.format === 'none';
    }
    return false;
}
const allAttributeNames = {
    [PromptsType.prompt]: [PromptHeaderAttributes.name, PromptHeaderAttributes.description, PromptHeaderAttributes.model, PromptHeaderAttributes.tools, PromptHeaderAttributes.mode, PromptHeaderAttributes.agent, PromptHeaderAttributes.argumentHint],
    [PromptsType.instructions]: [PromptHeaderAttributes.name, PromptHeaderAttributes.description, PromptHeaderAttributes.applyTo, PromptHeaderAttributes.excludeAgent],
    [PromptsType.agent]: [PromptHeaderAttributes.name, PromptHeaderAttributes.description, PromptHeaderAttributes.model, PromptHeaderAttributes.tools, PromptHeaderAttributes.advancedOptions, PromptHeaderAttributes.handOffs, PromptHeaderAttributes.argumentHint, PromptHeaderAttributes.target, PromptHeaderAttributes.infer, PromptHeaderAttributes.agents, PromptHeaderAttributes.hooks, PromptHeaderAttributes.userInvocable, PromptHeaderAttributes.userInvokable, PromptHeaderAttributes.disableModelInvocation, GithubPromptHeaderAttributes.github],
    [PromptsType.skill]: [PromptHeaderAttributes.name, PromptHeaderAttributes.description, PromptHeaderAttributes.license, PromptHeaderAttributes.compatibility, PromptHeaderAttributes.metadata, PromptHeaderAttributes.argumentHint, PromptHeaderAttributes.userInvocable, PromptHeaderAttributes.userInvokable, PromptHeaderAttributes.disableModelInvocation],
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
export function getAttributeDescription(attributeName, promptType, target) {
    if (target === Target.Claude) {
        if (promptType === PromptsType.agent) {
            return claudeAgentAttributes[attributeName]?.description;
        }
        if (promptType === PromptsType.instructions) {
            return claudeRulesAttributes[attributeName]?.description;
        }
    }
    switch (promptType) {
        case PromptsType.instructions:
            switch (attributeName) {
                case PromptHeaderAttributes.name:
                    return localize(8759, null);
                case PromptHeaderAttributes.description:
                    return localize(8760, null);
                case PromptHeaderAttributes.applyTo:
                    return localize(8761, null);
            }
            break;
        case PromptsType.skill:
            switch (attributeName) {
                case PromptHeaderAttributes.name:
                    return localize(8762, null);
                case PromptHeaderAttributes.description:
                    return localize(8763, null);
                case PromptHeaderAttributes.argumentHint:
                    return localize(8764, null);
                case PromptHeaderAttributes.userInvocable:
                    return localize(8765, null);
                case PromptHeaderAttributes.disableModelInvocation:
                    return localize(8766, null);
            }
            break;
        case PromptsType.agent:
            switch (attributeName) {
                case PromptHeaderAttributes.name:
                    return localize(8767, null);
                case PromptHeaderAttributes.description:
                    return localize(8768, null);
                case PromptHeaderAttributes.argumentHint:
                    return localize(8769, null);
                case PromptHeaderAttributes.model:
                    return localize(8770, null);
                case PromptHeaderAttributes.tools:
                    return localize(8771, null);
                case PromptHeaderAttributes.handOffs:
                    return localize(8772, null);
                case PromptHeaderAttributes.target:
                    return localize(8773, null);
                case PromptHeaderAttributes.infer:
                    return localize(8774, null);
                case PromptHeaderAttributes.agents:
                    return localize(8775, null);
                case PromptHeaderAttributes.hooks:
                    return localize(8776, null);
                case PromptHeaderAttributes.userInvocable:
                    return localize(8777, null);
                case PromptHeaderAttributes.disableModelInvocation:
                    return localize(8778, null);
                case GithubPromptHeaderAttributes.github:
                    return localize(8779, null);
            }
            break;
        case PromptsType.prompt:
            switch (attributeName) {
                case PromptHeaderAttributes.name:
                    return localize(8780, null);
                case PromptHeaderAttributes.description:
                    return localize(8781, null);
                case PromptHeaderAttributes.argumentHint:
                    return localize(8782, null);
                case PromptHeaderAttributes.model:
                    return localize(8783, null);
                case PromptHeaderAttributes.tools:
                    return localize(8784, null);
                case PromptHeaderAttributes.agent:
                case PromptHeaderAttributes.mode:
                    return localize(8785, null);
            }
            break;
    }
    return undefined;
}
// The list of tools known to be used by GitHub Copilot custom agents
export const knownGithubCopilotTools = [
    { name: SpecedToolAliases.execute, description: localize(8786, null) },
    { name: SpecedToolAliases.read, description: localize(8787, null) },
    { name: SpecedToolAliases.edit, description: localize(8788, null) },
    { name: SpecedToolAliases.search, description: localize(8789, null) },
    { name: SpecedToolAliases.agent, description: localize(8790, null) },
];
export const knownClaudeTools = [
    { name: 'Bash', description: localize(8791, null), toolEquivalent: [SpecedToolAliases.execute] },
    { name: 'Edit', description: localize(8792, null), toolEquivalent: ['edit/editNotebook', 'edit/editFiles'] },
    { name: 'Glob', description: localize(8793, null), toolEquivalent: ['search/fileSearch'] },
    { name: 'Grep', description: localize(8794, null), toolEquivalent: ['search/textSearch'] },
    { name: 'Read', description: localize(8795, null), toolEquivalent: ['read/readFile', 'read/getNotebookSummary'] },
    { name: 'Write', description: localize(8796, null), toolEquivalent: ['edit/createDirectory', 'edit/createFile', 'edit/createJupyterNotebook'] },
    { name: 'WebFetch', description: localize(8797, null), toolEquivalent: [SpecedToolAliases.web] },
    { name: 'WebSearch', description: localize(8798, null), toolEquivalent: [SpecedToolAliases.web] },
    { name: 'Task', description: localize(8799, null), toolEquivalent: [SpecedToolAliases.agent] },
    { name: 'Skill', description: localize(8800, null), toolEquivalent: [] },
    { name: 'LSP', description: localize(8801, null), toolEquivalent: [] },
    { name: 'NotebookEdit', description: localize(8802, null), toolEquivalent: ['edit/editNotebook'] },
    { name: 'AskUserQuestion', description: localize(8803, null), toolEquivalent: ['vscode/askQuestions'] },
    { name: 'MCPSearch', description: localize(8804, null), toolEquivalent: [] }
];
export const knownClaudeModels = [
    { name: 'sonnet', description: localize(8805, null), modelEquivalent: 'Claude Sonnet 4.5 (copilot)' },
    { name: 'opus', description: localize(8806, null), modelEquivalent: 'Claude Opus 4.6 (copilot)' },
    { name: 'haiku', description: localize(8807, null), modelEquivalent: 'Claude Haiku 4.5 (copilot)' },
    { name: 'inherit', description: localize(8808, null), modelEquivalent: undefined },
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
        description: localize(8809, null),
    },
    'description': {
        type: 'scalar',
        description: localize(8810, null),
    },
    'tools': {
        type: 'sequence',
        description: localize(8811, null),
        defaults: ['Read, Edit, Bash'],
        items: knownClaudeTools
    },
    'disallowedTools': {
        type: 'sequence',
        description: localize(8812, null),
        defaults: ['Write, Edit, Bash'],
        items: knownClaudeTools
    },
    'model': {
        type: 'scalar',
        description: localize(8813, null),
        defaults: ['sonnet', 'opus', 'haiku', 'inherit'],
        enums: knownClaudeModels
    },
    'permissionMode': {
        type: 'scalar',
        description: localize(8814, null),
        defaults: ['default', 'acceptEdits', 'dontAsk', 'bypassPermissions', 'plan'],
        enums: [
            { name: 'default', description: localize(8815, null) },
            { name: 'acceptEdits', description: localize(8816, null) },
            { name: 'plan', description: localize(8817, null) },
            { name: 'delegate', description: localize(8818, null) },
            { name: 'dontAsk', description: localize(8819, null) },
            { name: 'bypassPermissions', description: localize(8820, null) }
        ]
    },
    'skills': {
        type: 'sequence',
        description: localize(8821, null),
    },
    'mcpServers': {
        type: 'sequence',
        description: localize(8822, null),
    },
    'hooks': {
        type: 'object',
        description: localize(8823, null),
    },
    'memory': {
        type: 'scalar',
        description: localize(8824, null),
        defaults: ['user', 'project', 'local'],
        enums: [
            { name: 'user', description: localize(8825, null) },
            { name: 'project', description: localize(8826, null) },
            { name: 'local', description: localize(8827, null) }
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
        description: localize(8828, null),
    },
    'paths': {
        type: 'sequence',
        description: localize(8829, null),
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
function toMarker(message, range, severity = MarkerSeverity.Error) {
    return { severity, message, ...range };
}
let PromptValidatorContribution = class PromptValidatorContribution extends Disposable {
    constructor(modelService, instantiationService, markerService, promptsService, languageModelsService, languageModelToolsService, chatModeService) {
        super();
        this.modelService = modelService;
        this.markerService = markerService;
        this.promptsService = promptsService;
        this.languageModelsService = languageModelsService;
        this.languageModelToolsService = languageModelToolsService;
        this.chatModeService = chatModeService;
        this.localDisposables = this._register(new DisposableStore());
        this.validator = instantiationService.createInstance(PromptValidator);
        this.updateRegistration();
    }
    updateRegistration() {
        this.localDisposables.clear();
        const trackers = new ResourceMap();
        this.localDisposables.add(toDisposable(() => {
            trackers.forEach(tracker => tracker.dispose());
            trackers.clear();
        }));
        this.modelService.getModels().forEach(model => {
            const promptType = getPromptsTypeForLanguageId(model.getLanguageId());
            if (promptType) {
                trackers.set(model.uri, new ModelTracker(model, promptType, this.validator, this.promptsService, this.markerService));
            }
        });
        this.localDisposables.add(this.modelService.onModelAdded((model) => {
            const promptType = getPromptsTypeForLanguageId(model.getLanguageId());
            if (promptType && !trackers.has(model.uri)) {
                trackers.set(model.uri, new ModelTracker(model, promptType, this.validator, this.promptsService, this.markerService));
            }
        }));
        this.localDisposables.add(this.modelService.onModelRemoved((model) => {
            const tracker = trackers.get(model.uri);
            if (tracker) {
                tracker.dispose();
                trackers.delete(model.uri);
            }
        }));
        this.localDisposables.add(this.modelService.onModelLanguageChanged((event) => {
            const { model } = event;
            const tracker = trackers.get(model.uri);
            if (tracker) {
                tracker.dispose();
                trackers.delete(model.uri);
            }
            const promptType = getPromptsTypeForLanguageId(model.getLanguageId());
            if (promptType) {
                trackers.set(model.uri, new ModelTracker(model, promptType, this.validator, this.promptsService, this.markerService));
            }
        }));
        const validateAll = () => trackers.forEach(tracker => tracker.validate());
        this.localDisposables.add(this.languageModelToolsService.onDidChangeTools(() => validateAll()));
        this.localDisposables.add(this.chatModeService.onDidChangeChatModes(() => validateAll()));
        this.localDisposables.add(this.languageModelsService.onDidChangeLanguageModels(() => validateAll()));
    }
};
PromptValidatorContribution = __decorate([
    __param(0, IModelService),
    __param(1, IInstantiationService),
    __param(2, IMarkerService),
    __param(3, IPromptsService),
    __param(4, ILanguageModelsService),
    __param(5, ILanguageModelToolsService),
    __param(6, IChatModeService)
], PromptValidatorContribution);
export { PromptValidatorContribution };
let ModelTracker = class ModelTracker extends Disposable {
    constructor(textModel, promptType, validator, promptsService, markerService) {
        super();
        this.textModel = textModel;
        this.promptType = promptType;
        this.validator = validator;
        this.promptsService = promptsService;
        this.markerService = markerService;
        this.delayer = this._register(new Delayer(200));
        this._register(textModel.onDidChangeContent(() => this.validate()));
        this.validate();
    }
    validate() {
        this.delayer.trigger(async () => {
            const markers = [];
            const ast = this.promptsService.getParsedPromptFile(this.textModel);
            await this.validator.validate(ast, this.promptType, m => markers.push(m));
            this.markerService.changeOne(MARKERS_OWNER_ID, this.textModel.uri, markers);
        });
    }
    dispose() {
        this.markerService.remove(MARKERS_OWNER_ID, [this.textModel.uri]);
        super.dispose();
    }
};
ModelTracker = __decorate([
    __param(3, IPromptsService),
    __param(4, IMarkerService)
], ModelTracker);
//# sourceMappingURL=promptValidator.js.map