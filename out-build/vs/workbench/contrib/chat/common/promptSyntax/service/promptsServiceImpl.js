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
import { CancellationToken } from '../../../../../../base/common/cancellation.js';
import { CancellationError } from '../../../../../../base/common/errors.js';
import { Emitter, Event } from '../../../../../../base/common/event.js';
import { parse as parseJSONC } from '../../../../../../base/common/json.js';
import { Disposable, DisposableStore } from '../../../../../../base/common/lifecycle.js';
import { autorun } from '../../../../../../base/common/observable.js';
import { ResourceMap, ResourceSet } from '../../../../../../base/common/map.js';
import { basename, dirname, isEqual } from '../../../../../../base/common/resources.js';
import { URI } from '../../../../../../base/common/uri.js';
import { OffsetRange } from '../../../../../../editor/common/core/ranges/offsetRange.js';
import { IModelService } from '../../../../../../editor/common/services/model.js';
import { localize } from '../../../../../../nls.js';
import { IConfigurationService } from '../../../../../../platform/configuration/common/configuration.js';
import { FileOperationError, IFileService } from '../../../../../../platform/files/common/files.js';
import { IExtensionService } from '../../../../../services/extensions/common/extensions.js';
import { IInstantiationService } from '../../../../../../platform/instantiation/common/instantiation.js';
import { ILabelService } from '../../../../../../platform/label/common/label.js';
import { ILogService } from '../../../../../../platform/log/common/log.js';
import { IFilesConfigurationService } from '../../../../../services/filesConfiguration/common/filesConfigurationService.js';
import { IStorageService } from '../../../../../../platform/storage/common/storage.js';
import { ITelemetryService } from '../../../../../../platform/telemetry/common/telemetry.js';
import { IUserDataProfileService } from '../../../../../services/userDataProfile/common/userDataProfile.js';
import { PromptsConfig } from '../config/config.js';
import { AGENT_MD_FILENAME, CLAUDE_CONFIG_FOLDER, CLAUDE_LOCAL_MD_FILENAME, CLAUDE_MD_FILENAME, COPILOT_CUSTOM_INSTRUCTIONS_FILENAME, getCleanPromptName, GITHUB_CONFIG_FOLDER, PromptFileSource } from '../config/promptFileLocations.js';
import { PROMPT_LANGUAGE_ID, PromptsType, Target, getPromptsTypeForLanguageId } from '../promptTypes.js';
import { PromptFilesLocator } from '../utils/promptFilesLocator.js';
import { PromptFileParser, PromptHeaderAttributes } from '../promptFileParser.js';
import { PromptsStorage, ExtensionAgentSourceType, CUSTOM_AGENT_PROVIDER_ACTIVATION_EVENT, INSTRUCTIONS_PROVIDER_ACTIVATION_EVENT, PROMPT_FILE_PROVIDER_ACTIVATION_EVENT, SKILL_PROVIDER_ACTIVATION_EVENT, AgentFileType } from './promptsService.js';
import { Delayer } from '../../../../../../base/common/async.js';
import { Schemas } from '../../../../../../base/common/network.js';
import { parseSubagentHooksFromYaml } from '../hookSchema.js';
import { HookSourceFormat, getHookSourceFormat, parseHooksFromFile } from '../hookCompatibility.js';
import { IWorkspaceContextService } from '../../../../../../platform/workspace/common/workspace.js';
import { IWorkspaceTrustManagementService } from '../../../../../../platform/workspace/common/workspaceTrust.js';
import { IPathService } from '../../../../../services/path/common/pathService.js';
import { getTarget, mapClaudeModels, mapClaudeTools } from '../languageProviders/promptFileAttributes.js';
import { StopWatch } from '../../../../../../base/common/stopwatch.js';
import { ContextKeyExpr, IContextKeyService } from '../../../../../../platform/contextkey/common/contextkey.js';
import { getCanonicalPluginCommandId, IAgentPluginService } from '../../plugins/agentPluginService.js';
import { isContributionEnabled } from '../../enablement.js';
import { assertNever } from '../../../../../../base/common/assert.js';
import { ChatInternalCustomizations } from '../internalCustomizations/internalCustomizations.js';
/**
 * Error thrown when a skill file is missing the required name attribute.
 */
export class SkillMissingNameError extends Error {
    constructor(uri) {
        super('Skill file must have a name attribute');
        this.uri = uri;
    }
}
/**
 * Error thrown when a skill file is missing the required description attribute.
 */
export class SkillMissingDescriptionError extends Error {
    constructor(uri) {
        super('Skill file must have a description attribute');
        this.uri = uri;
    }
}
/**
 * Error thrown when a skill's name does not match its parent folder name.
 */
export class SkillNameMismatchError extends Error {
    constructor(uri, skillName, folderName) {
        super(`Skill name must match folder name: expected "${folderName}" but got "${skillName}"`);
        this.uri = uri;
        this.skillName = skillName;
        this.folderName = folderName;
    }
}
/**
 * Provides prompt services.
 */
let PromptsService = class PromptsService extends Disposable {
    constructor(logger, labelService, modelService, instantiationService, userDataService, configurationService, fileService, filesConfigService, storageService, extensionService, telemetryService, workspaceService, pathService, contextKeyService, agentPluginService, workspaceTrustService) {
        super();
        this.logger = logger;
        this.labelService = labelService;
        this.modelService = modelService;
        this.instantiationService = instantiationService;
        this.userDataService = userDataService;
        this.configurationService = configurationService;
        this.fileService = fileService;
        this.filesConfigService = filesConfigService;
        this.storageService = storageService;
        this.extensionService = extensionService;
        this.telemetryService = telemetryService;
        this.workspaceService = workspaceService;
        this.pathService = pathService;
        this.contextKeyService = contextKeyService;
        this.agentPluginService = agentPluginService;
        this.workspaceTrustService = workspaceTrustService;
        /**
         * Cache for parsed prompt files keyed by URI.
         * The number in the returned tuple is textModel.getVersionId(), which is an internal VS Code counter that increments every time the text model's content changes.
         */
        this.cachedParsedPromptFromModels = new ResourceMap();
        /**
         * Emitter for discovery log events. Listeners (e.g. a debug bridge
         * contribution) can forward these to IChatDebugService.
         */
        this._onDidLogDiscovery = this._register(new Emitter());
        this.onDidLogDiscovery = this._onDidLogDiscovery.event;
        /**
         * Cached file locations commands. Caching only happens if the corresponding `fileLocatorEvents` event is used.
         */
        this.cachedFileLocations = {};
        /**
         * Lazily created events that notify listeners when the file locations for a given prompt type change.
         * An event is created on demand for each prompt type and can be used by consumers to react to updates
         * in the set of prompt files (e.g., when prompt files are added, removed, or modified).
         */
        this.fileLocatorEvents = {};
        /**
         * Contributed files from extensions keyed by prompt type then name.
         */
        this.contributedFiles = {
            [PromptsType.prompt]: new ResourceMap(),
            [PromptsType.instructions]: new ResourceMap(),
            [PromptsType.agent]: new ResourceMap(),
            [PromptsType.skill]: new ResourceMap(),
            [PromptsType.hook]: new ResourceMap(),
        };
        /**
         * Context keys referenced by contributed file `when` clauses.
         */
        this._contributedWhenKeys = new Set();
        this._contributedWhenClauses = new Map();
        this._onDidContributedWhenChange = this._register(new Emitter());
        this._onDidChangeInstructions = this._register(new Emitter());
        this._onDidPluginPromptFilesChange = this._register(new Emitter());
        this._onDidPluginHooksChange = this._register(new Emitter());
        this._pluginPromptFilesByType = new Map();
        /**
         * Registry of prompt file provider instances (custom agents, instructions, prompt files).
         * Extensions can register providers via the proposed API.
         */
        this.promptFileProviders = [];
        // --- Enabled Prompt Files -----------------------------------------------------------
        this.disabledPromptsStorageKeyPrefix = 'chat.disabledPromptFiles.';
        this.fileLocator = this.createPromptFilesLocator();
        // Register the internal readonly customizations
        this.internalCustomizations = this._register(new ChatInternalCustomizations(this.fileService));
        this._register(this.modelService.onModelRemoved((model) => {
            this.cachedParsedPromptFromModels.delete(model.uri);
        }));
        this._register(this.contextKeyService.onDidChangeContext(e => {
            if (e.affectsSome(this._contributedWhenKeys)) {
                for (const type of Object.keys(this.cachedFileLocations)) {
                    this.cachedFileLocations[type] = undefined;
                }
                this._onDidContributedWhenChange.fire();
            }
        }));
        const modelChangeEvent = this._register(new ModelChangeTracker(this.modelService)).onDidPromptChange;
        this.cachedCustomAgents = this._register(new CachedPromise((token) => this.computeCustomAgents(token), () => Event.any(this.getFileLocatorEvent(PromptsType.agent), Event.filter(modelChangeEvent, e => e.promptType === PromptsType.agent), this._onDidContributedWhenChange.event, Event.filter(this.configurationService.onDidChangeConfiguration, e => e.affectsConfiguration(PromptsConfig.USE_CUSTOM_AGENT_HOOKS)), this._onDidPluginPromptFilesChange.event)));
        this.cachedSlashCommands = this._register(new CachedPromise((token) => this.computePromptSlashCommands(token), () => Event.any(this.getFileLocatorEvent(PromptsType.prompt), this.getFileLocatorEvent(PromptsType.skill), Event.filter(modelChangeEvent, e => e.promptType === PromptsType.prompt), Event.filter(modelChangeEvent, e => e.promptType === PromptsType.skill), this._onDidContributedWhenChange.event, this._onDidPluginPromptFilesChange.event)));
        this.cachedSkills = this._register(new CachedPromise((token) => this.computeAgentSkills(token), () => Event.any(this.getFileLocatorEvent(PromptsType.skill), Event.filter(modelChangeEvent, e => e.promptType === PromptsType.skill), this._onDidContributedWhenChange.event, this._onDidPluginPromptFilesChange.event)));
        this.cachedHooks = this._register(new CachedPromise((token) => this.computeHooks(token), () => Event.any(this.getFileLocatorEvent(PromptsType.hook), Event.filter(this.configurationService.onDidChangeConfiguration, e => e.affectsConfiguration(PromptsConfig.USE_CHAT_HOOKS) || e.affectsConfiguration(PromptsConfig.USE_CLAUDE_HOOKS)), this._onDidPluginHooksChange.event, this.workspaceTrustService.onDidChangeTrust)));
        // Hack: Subscribe to activate caching (CachedPromise only caches when onDidChange has listeners)
        this._register(this.cachedSkills.onDidChange(() => { }));
        this._register(this.cachedHooks.onDidChange(() => { }));
        this._register(this.watchPluginPromptFilesForType(PromptsType.prompt, (plugin, reader) => plugin.commands.read(reader)));
        this._register(this.watchPluginPromptFilesForType(PromptsType.skill, (plugin, reader) => plugin.skills.read(reader)));
        this._register(this.watchPluginPromptFilesForType(PromptsType.agent, (plugin, reader) => plugin.agents.read(reader)));
        this._register(this.watchPluginPromptFilesForType(PromptsType.instructions, (plugin, reader) => plugin.instructions.read(reader)));
        this._register(autorun(reader => {
            const plugins = this.agentPluginService.plugins.read(reader);
            for (const plugin of plugins) {
                if (isContributionEnabled(plugin.enablement.read(reader))) {
                    plugin.hooks.read(reader);
                }
            }
            this._onDidPluginHooksChange.fire();
        }));
    }
    watchPluginPromptFilesForType(type, getItems) {
        return autorun(reader => {
            const plugins = this.agentPluginService.plugins.read(reader);
            const nextFiles = [];
            for (const plugin of plugins) {
                if (!isContributionEnabled(plugin.enablement.read(reader))) {
                    continue;
                }
                for (const item of getItems(plugin, reader)) {
                    nextFiles.push({
                        uri: item.uri,
                        storage: PromptsStorage.plugin,
                        type,
                        name: getCanonicalPluginCommandId(plugin, item.name),
                        pluginUri: plugin.uri,
                    });
                }
            }
            nextFiles.sort((a, b) => `${a.name ?? ''}|${a.uri.toString()}`.localeCompare(`${b.name ?? ''}|${b.uri.toString()}`));
            this._pluginPromptFilesByType.set(type, nextFiles);
            this.cachedFileLocations[type] = undefined;
            this._onDidPluginPromptFilesChange.fire();
        });
    }
    createPromptFilesLocator() {
        return this.instantiationService.createInstance(PromptFilesLocator);
    }
    getFileLocatorEvent(type) {
        let event = this.fileLocatorEvents[type];
        if (!event) {
            event = this.fileLocatorEvents[type] = this._register(this.fileLocator.createFilesUpdatedEvent(type)).event;
            this._register(event(() => {
                this.cachedFileLocations[type] = undefined;
            }));
        }
        return event;
    }
    getParsedPromptFile(textModel) {
        const cached = this.cachedParsedPromptFromModels.get(textModel.uri);
        if (cached && cached[0] === textModel.getVersionId()) {
            return cached[1];
        }
        const ast = new PromptFileParser().parse(textModel.uri, textModel.getValue());
        if (!cached || cached[0] < textModel.getVersionId()) {
            this.cachedParsedPromptFromModels.set(textModel.uri, [textModel.getVersionId(), ast]);
        }
        return ast;
    }
    async listPromptFiles(type, token) {
        let listPromise = this.cachedFileLocations[type];
        if (!listPromise) {
            listPromise = this.computeListPromptFiles(type, token);
            if (!this.fileLocatorEvents[type]) {
                return listPromise;
            }
            this.cachedFileLocations[type] = listPromise;
            return listPromise;
        }
        return listPromise;
    }
    async computeListPromptFiles(type, token) {
        const prompts = await Promise.all([
            this.fileLocator.listFiles(type, PromptsStorage.user, token).then(uris => uris.map(uri => ({ uri, storage: PromptsStorage.user, type }))),
            this.fileLocator.listFiles(type, PromptsStorage.local, token).then(uris => uris.map(uri => ({ uri, storage: PromptsStorage.local, type }))),
            this.getExtensionPromptFiles(type, token),
            this._pluginPromptFilesByType.get(type) ?? [],
        ]);
        return [...prompts.flat(), ...this.internalCustomizations.getPromptPaths(type)];
    }
    /**
     * Collects diagnostic information about which source folders were searched for display in the debug panel.
     */
    async _collectSourceFolderDiagnostics(type) {
        const resolvedFolders = await this.fileLocator.getSourceFoldersInDiscoveryOrder(type);
        return resolvedFolders.map(folder => ({
            uri: folder.uri,
            storage: folder.storage,
        }));
    }
    /**
     * Registers a prompt file provider (CustomAgentProvider, InstructionsProvider, or PromptFileProvider).
     * This will be called by the extension host bridge when
     * an extension registers a provider via vscode.chat.registerCustomAgentProvider(),
     * registerInstructionsProvider(), or registerPromptFileProvider().
     */
    registerPromptFileProvider(extension, type, provider) {
        const providerEntry = { extension, type, ...provider };
        this.promptFileProviders.push(providerEntry);
        const disposables = new DisposableStore();
        // Listen to provider change events to rerun computeListPromptFiles
        if (provider.onDidChangePromptFiles) {
            disposables.add(provider.onDidChangePromptFiles(() => {
                this.invalidatePromptFileCache(type);
            }));
        }
        // Invalidate cache when providers change
        this.invalidatePromptFileCache(type);
        disposables.add({
            dispose: () => {
                const index = this.promptFileProviders.findIndex((p) => p === providerEntry);
                if (index >= 0) {
                    this.promptFileProviders.splice(index, 1);
                    this.invalidatePromptFileCache(type);
                }
            }
        });
        return disposables;
    }
    invalidatePromptFileCache(type) {
        if (type === PromptsType.agent) {
            this.cachedFileLocations[PromptsType.agent] = undefined;
            this.cachedCustomAgents.refresh();
        }
        else if (type === PromptsType.instructions) {
            this.cachedFileLocations[PromptsType.instructions] = undefined;
            this._onDidChangeInstructions.fire();
        }
        else if (type === PromptsType.prompt) {
            this.cachedFileLocations[PromptsType.prompt] = undefined;
            this.cachedSlashCommands.refresh();
        }
        else if (type === PromptsType.skill) {
            this.cachedFileLocations[PromptsType.skill] = undefined;
            this.cachedSkills.refresh();
            this.cachedSlashCommands.refresh();
        }
    }
    /**
     * Shared helper to list prompt files from registered providers for a given type.
     */
    async listFromProviders(type, activationEvent, token) {
        const result = [];
        // Activate extensions that might provide files for this type
        await this.extensionService.activateByEvent(activationEvent);
        const providers = this.promptFileProviders.filter(p => p.type === type);
        if (providers.length === 0) {
            return result;
        }
        // Collect files from all providers
        for (const providerEntry of providers) {
            try {
                const files = await providerEntry.providePromptFiles({}, token);
                if (!files || token.isCancellationRequested) {
                    continue;
                }
                for (const file of files) {
                    try {
                        await this.filesConfigService.updateReadonly(file.uri, true);
                    }
                    catch (e) {
                        const msg = e instanceof Error ? e.message : String(e);
                        this.logger.error(`[listFromProviders] Failed to make file readonly: ${file.uri}`, msg);
                    }
                    result.push({
                        uri: file.uri,
                        storage: PromptsStorage.extension,
                        type,
                        extension: providerEntry.extension,
                        source: ExtensionAgentSourceType.provider,
                        name: file.name,
                        description: file.description,
                    });
                }
            }
            catch (e) {
                this.logger.error(`[listFromProviders] Failed to get ${type} files from provider`, e instanceof Error ? e.message : String(e));
            }
        }
        return result;
    }
    async listPromptFilesForStorage(type, storage, token) {
        switch (storage) {
            case PromptsStorage.extension:
                return this.getExtensionPromptFiles(type, token);
            case PromptsStorage.local:
                return this.fileLocator.listFiles(type, PromptsStorage.local, token).then(uris => uris.map(uri => ({ uri, storage: PromptsStorage.local, type })));
            case PromptsStorage.user:
                return this.fileLocator.listFiles(type, PromptsStorage.user, token).then(uris => uris.map(uri => ({ uri, storage: PromptsStorage.user, type })));
            case PromptsStorage.plugin:
                return this._pluginPromptFilesByType.get(type) ?? [];
            case PromptsStorage.internal:
                return this.internalCustomizations.getPromptPaths(type);
            default:
                throw new Error(`[listPromptFilesForStorage] Unsupported prompt storage type: ${storage}`);
        }
    }
    async getExtensionPromptFiles(type, token) {
        await this.extensionService.whenInstalledExtensionsRegistered();
        const settledResults = await Promise.allSettled(this.contributedFiles[type].values());
        const contributedFiles = settledResults
            .filter((result) => result.status === 'fulfilled')
            .map(result => result.value)
            .filter(file => {
            if (!file.when) {
                return true;
            }
            const expr = ContextKeyExpr.deserialize(file.when);
            if (!expr) {
                this.logger.warn(`[getExtensionPromptFiles] Ignoring contributed prompt file with invalid when clause: ${file.when}`);
                return false;
            }
            return this.contextKeyService.contextMatchesRules(expr);
        });
        const activationEvent = this.getProviderActivationEvent(type);
        if (!activationEvent) {
            // No provider activation event for this type (e.g., hooks)
            return contributedFiles;
        }
        const providerFiles = await this.listFromProviders(type, activationEvent, token);
        return [...contributedFiles, ...providerFiles];
    }
    getProviderActivationEvent(type) {
        switch (type) {
            case PromptsType.agent:
                return CUSTOM_AGENT_PROVIDER_ACTIVATION_EVENT;
            case PromptsType.instructions:
                return INSTRUCTIONS_PROVIDER_ACTIVATION_EVENT;
            case PromptsType.prompt:
                return PROMPT_FILE_PROVIDER_ACTIVATION_EVENT;
            case PromptsType.skill:
                return SKILL_PROVIDER_ACTIVATION_EVENT;
            case PromptsType.hook:
                return undefined; // hooks don't have extension providers
        }
    }
    async getSourceFolders(type) {
        const result = [];
        if (type === PromptsType.hook) {
            // For hooks, return the Copilot hooks folder for creating new hooks
            // (Claude paths are read-only and not included here)
            const hooksFolders = await this.fileLocator.getHookSourceFolders();
            for (const uri of hooksFolders) {
                result.push({ uri, storage: PromptsStorage.local, type });
            }
        }
        else {
            for (const uri of await this.fileLocator.getConfigBasedSourceFolders(type)) {
                result.push({ uri, storage: PromptsStorage.local, type });
            }
        }
        if (type !== PromptsType.skill && type !== PromptsType.hook) {
            // no user source folders for skills and hooks
            const userHome = this.userDataService.currentProfile.promptsHome;
            result.push({ uri: userHome, storage: PromptsStorage.user, type });
        }
        return result;
    }
    async getResolvedSourceFolders(type) {
        return this.fileLocator.getResolvedSourceFolders(type);
    }
    // slash prompt commands
    /**
     * Emitter for slash commands change events.
     */
    get onDidChangeSlashCommands() {
        return this.cachedSlashCommands.onDidChange;
    }
    async getPromptSlashCommands(token, sessionResource) {
        const sw = StopWatch.create();
        const result = await this.cachedSlashCommands.get(token);
        if (sessionResource) {
            const elapsed = sw.elapsed();
            void this.getPromptSlashCommandDiscoveryInfo(token).catch(() => undefined).then(discoveryInfo => {
                const details = result.length === 1
                    ? localize(8830, null, result.length, elapsed.toFixed(1))
                    : localize(8831, null, result.length, elapsed.toFixed(1));
                this._onDidLogDiscovery.fire({
                    sessionResource,
                    name: localize(8832, null),
                    details,
                    discoveryInfo,
                    category: 'discovery',
                });
            });
        }
        return result;
    }
    async computePromptSlashCommands(token) {
        const promptFiles = await this.listPromptFiles(PromptsType.prompt, token);
        const useAgentSkills = this.configurationService.getValue(PromptsConfig.USE_AGENT_SKILLS);
        const skills = useAgentSkills ? await this.listPromptFiles(PromptsType.skill, token) : [];
        const disabledSkills = this.getDisabledPromptFiles(PromptsType.skill);
        const slashCommandFiles = [
            ...promptFiles,
            ...skills.filter(s => !disabledSkills.has(s.uri)),
        ];
        const details = await Promise.all(slashCommandFiles.map(async (promptPath) => {
            try {
                const parsedPromptFile = await this.parseNew(promptPath.uri, token);
                return this.asChatPromptSlashCommand(parsedPromptFile, promptPath);
            }
            catch (e) {
                this.logger.error(`[computePromptSlashCommands] Failed to parse prompt file for slash command: ${promptPath.uri}`, e instanceof Error ? e.message : String(e));
                return undefined;
            }
        }));
        const result = [];
        const seen = new ResourceSet();
        for (const detail of details) {
            if (detail) {
                result.push(detail);
                seen.add(detail.promptPath.uri);
            }
        }
        for (const model of this.modelService.getModels()) {
            if (model.getLanguageId() === PROMPT_LANGUAGE_ID && model.uri.scheme === Schemas.untitled && !seen.has(model.uri)) {
                const parsedPromptFile = this.getParsedPromptFile(model);
                result.push(this.asChatPromptSlashCommand(parsedPromptFile, { uri: model.uri, storage: PromptsStorage.local, type: PromptsType.prompt }));
            }
        }
        return result;
    }
    isValidSlashCommandName(command) {
        return command.match(/^[\p{L}\d_\-\.:]+$/u) !== null;
    }
    async resolvePromptSlashCommand(name, token) {
        const commands = await this.getPromptSlashCommands(token);
        return commands.find(cmd => cmd.name === name);
    }
    asChatPromptSlashCommand(parsedPromptFile, promptPath) {
        let name = parsedPromptFile?.header?.name ?? promptPath.name ?? getCleanPromptName(promptPath.uri);
        name = name.replace(/[^\p{L}\d_\-\.:]+/gu, '-'); // replace spaces with dashes
        const internalSkill = this.internalCustomizations.getInternalSkillByUri(promptPath.uri);
        return {
            name: name,
            description: parsedPromptFile?.header?.description ?? promptPath.description,
            argumentHint: parsedPromptFile?.header?.argumentHint,
            parsedPromptFile,
            promptPath,
            when: internalSkill?.when,
        };
    }
    async getPromptSlashCommandName(uri, token) {
        const slashCommands = await this.getPromptSlashCommands(token);
        const slashCommand = slashCommands.find(c => isEqual(c.promptPath.uri, uri));
        if (!slashCommand) {
            return getCleanPromptName(uri);
        }
        return slashCommand.name;
    }
    // custom agents
    /**
     * Emitter for custom agents change events.
     */
    get onDidChangeCustomAgents() {
        return this.cachedCustomAgents.onDidChange;
    }
    get onDidChangeInstructions() {
        return Event.any(this.getFileLocatorEvent(PromptsType.instructions), this._onDidContributedWhenChange.event, this._onDidChangeInstructions.event, this._onDidPluginPromptFilesChange.event);
    }
    async getCustomAgents(token, sessionResource) {
        const sw = StopWatch.create();
        const result = await this.cachedCustomAgents.get(token);
        if (sessionResource) {
            const elapsed = sw.elapsed();
            void this.getAgentDiscoveryInfo(token).catch(() => undefined).then(discoveryInfo => {
                const details = result.length === 1
                    ? localize(8833, null, result.length, elapsed.toFixed(1))
                    : localize(8834, null, result.length, elapsed.toFixed(1));
                this._onDidLogDiscovery.fire({
                    sessionResource,
                    name: localize(8835, null),
                    details,
                    discoveryInfo,
                    category: 'discovery',
                });
            });
        }
        return result;
    }
    async computeCustomAgents(token) {
        let agentFiles = await this.listPromptFiles(PromptsType.agent, token);
        const disabledAgents = this.getDisabledPromptFiles(PromptsType.agent);
        agentFiles = agentFiles.filter(promptPath => !disabledAgents.has(promptPath.uri));
        // Get user home for tilde expansion in hook cwd paths
        const userHomeUri = await this.pathService.userHome();
        const userHome = userHomeUri.scheme === Schemas.file ? userHomeUri.fsPath : userHomeUri.path;
        const defaultFolder = this.workspaceService.getWorkspace().folders[0];
        const customAgentsResults = await Promise.allSettled(agentFiles.map(async (promptPath) => {
            const uri = promptPath.uri;
            const ast = await this.parseNew(uri, token);
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            let metadata;
            if (ast.header) {
                const advanced = ast.header.getAttribute(PromptHeaderAttributes.advancedOptions);
                if (advanced && advanced.value.type === 'map') {
                    metadata = {};
                    for (const [key, value] of Object.entries(advanced.value)) {
                        if (value.type === 'scalar') {
                            metadata[key] = value;
                        }
                    }
                }
            }
            const toolReferences = [];
            if (ast.body) {
                const bodyOffset = ast.body.offset;
                const bodyVarRefs = ast.body.variableReferences;
                for (let i = bodyVarRefs.length - 1; i >= 0; i--) { // in reverse order
                    const { name, offset } = bodyVarRefs[i];
                    const range = new OffsetRange(offset - bodyOffset, offset - bodyOffset + name.length + 1);
                    toolReferences.push({ name, range });
                }
            }
            const agentInstructions = {
                content: ast.body?.getContent() ?? '',
                toolReferences,
                metadata,
            };
            const name = ast.header?.name ?? promptPath.name ?? getCleanPromptName(uri);
            const target = getTarget(PromptsType.agent, ast.header ?? uri);
            const source = IAgentSource.fromPromptPath(promptPath);
            if (!ast.header) {
                return { uri, name, agentInstructions, source, target, visibility: { userInvocable: true, agentInvocable: true } };
            }
            const visibility = {
                userInvocable: ast.header.userInvocable !== false,
                agentInvocable: ast.header.infer !== undefined ? ast.header.infer === true : ast.header.disableModelInvocation !== true,
            };
            let model = ast.header.model;
            if (target === Target.Claude && model) {
                model = mapClaudeModels(model);
            }
            let { description, tools, handOffs, argumentHint, agents } = ast.header;
            if (target === Target.Claude && tools) {
                tools = mapClaudeTools(tools);
            }
            // Parse hooks from the frontmatter if present
            let hooks;
            const useCustomAgentHooks = this.configurationService.getValue(PromptsConfig.USE_CUSTOM_AGENT_HOOKS);
            const hooksRaw = ast.header.hooksRaw;
            if (useCustomAgentHooks && hooksRaw) {
                const hookWorkspaceFolder = this.workspaceService.getWorkspaceFolder(uri) ?? defaultFolder;
                const workspaceRootUri = hookWorkspaceFolder?.uri;
                hooks = parseSubagentHooksFromYaml(hooksRaw, workspaceRootUri, userHome, target);
            }
            return { uri, name, description, model, tools, handOffs, argumentHint, target, visibility, agents, hooks, agentInstructions, source };
        }));
        const customAgents = [];
        for (let i = 0; i < customAgentsResults.length; i++) {
            const result = customAgentsResults[i];
            if (result.status === 'fulfilled') {
                customAgents.push(result.value);
            }
            else {
                const uri = agentFiles[i].uri;
                const error = result.reason;
                if (error instanceof FileOperationError && error.fileOperationResult === 1 /* FileOperationResult.FILE_NOT_FOUND */) {
                    this.logger.warn(`[computeCustomAgents] Skipping agent file that does not exist: ${uri}`, error.message);
                }
                else {
                    this.logger.error(`[computeCustomAgents] Failed to parse agent file: ${uri}`, error);
                }
            }
        }
        return customAgents;
    }
    async parseNew(uri, token) {
        const model = this.modelService.getModel(uri);
        if (model) {
            return this.getParsedPromptFile(model);
        }
        const fileContent = await this.fileService.readFile(uri);
        if (token.isCancellationRequested) {
            throw new CancellationError();
        }
        return new PromptFileParser().parse(uri, fileContent.value.toString());
    }
    registerContributedFile(type, uri, extension, name, description, when) {
        const bucket = this.contributedFiles[type];
        if (bucket.has(uri)) {
            // keep first registration per extension (handler filters duplicates per extension already)
            return Disposable.None;
        }
        const entryPromise = (async () => {
            // For skills, validate that the file follows the required structure
            if (type === PromptsType.skill) {
                try {
                    const validated = await this.validateAndSanitizeSkillFile(uri, CancellationToken.None);
                    name = validated.name;
                    description = validated.description;
                }
                catch (e) {
                    const msg = e instanceof Error ? e.message : String(e);
                    this.logger.error(`[registerContributedFile] Extension '${extension.identifier.value}' failed to validate skill file: ${uri}`, msg);
                    throw e;
                }
            }
            try {
                await this.filesConfigService.updateReadonly(uri, true);
            }
            catch (e) {
                const msg = e instanceof Error ? e.message : String(e);
                this.logger.error(`[registerContributedFile] Failed to make prompt file readonly: ${uri}`, msg);
            }
            return { uri, name, description, when, storage: PromptsStorage.extension, type, extension, source: ExtensionAgentSourceType.contribution };
        })();
        bucket.set(uri, entryPromise);
        if (when) {
            this._contributedWhenClauses.set(`${type}/${uri.toString()}`, when);
        }
        const flushCachesIfRequired = () => {
            this._updateContributedWhenKeys();
            this.cachedFileLocations[type] = undefined;
            switch (type) {
                case PromptsType.agent:
                    this.cachedCustomAgents.refresh();
                    break;
                case PromptsType.prompt:
                    this.cachedSlashCommands.refresh();
                    break;
                case PromptsType.skill:
                    this.cachedSkills.refresh();
                    this.cachedSlashCommands.refresh();
                    break;
            }
        };
        flushCachesIfRequired();
        return {
            dispose: () => {
                bucket.delete(uri);
                this._contributedWhenClauses.delete(`${type}/${uri.toString()}`);
                flushCachesIfRequired();
            }
        };
    }
    _updateContributedWhenKeys() {
        this._contributedWhenKeys.clear();
        for (const whenClause of this._contributedWhenClauses.values()) {
            const expr = ContextKeyExpr.deserialize(whenClause);
            for (const key of expr?.keys() ?? []) {
                this._contributedWhenKeys.add(key);
            }
        }
    }
    getPromptLocationLabel(promptPath) {
        switch (promptPath.storage) {
            case PromptsStorage.local: return this.labelService.getUriLabel(dirname(promptPath.uri), { relative: true });
            case PromptsStorage.user: return localize(8836, null);
            case PromptsStorage.extension: {
                return localize(8837, null, promptPath.extension.displayName ?? promptPath.extension.id);
            }
            case PromptsStorage.plugin: return localize(8838, null);
            case PromptsStorage.internal: return localize(8839, null);
            default: assertNever(promptPath, 'Unknown prompt storage type');
        }
    }
    async listNestedAgentMDs(token) {
        const useAgentMD = this.configurationService.getValue(PromptsConfig.USE_AGENT_MD);
        if (!useAgentMD) {
            return [];
        }
        const useNestedAgentMD = this.configurationService.getValue(PromptsConfig.USE_NESTED_AGENT_MD);
        if (useNestedAgentMD) {
            return await this.fileLocator.findAgentMDsInWorkspace(token);
        }
        return [];
    }
    async listAgentInstructions(token, logger) {
        const resolvedAgentFiles = [];
        const promises = [];
        const includeParents = this.configurationService.getValue(PromptsConfig.USE_CUSTOMIZATIONS_IN_PARENT_REPOS) === true;
        const rootFolders = await this.fileLocator.getWorkspaceFolderRoots(includeParents, logger);
        const rootFiles = [];
        const useAgentMD = this.configurationService.getValue(PromptsConfig.USE_AGENT_MD);
        if (!useAgentMD) {
            logger?.logInfo('Agent MD files are disabled via configuration.');
        }
        else {
            rootFiles.push({ fileName: AGENT_MD_FILENAME, type: AgentFileType.agentsMd });
        }
        const useClaudeMD = this.configurationService.getValue(PromptsConfig.USE_CLAUDE_MD);
        if (!useClaudeMD) {
            logger?.logInfo('Claude MD files are disabled via configuration.');
        }
        else {
            const claudeMdFile = { fileName: CLAUDE_MD_FILENAME, type: AgentFileType.claudeMd };
            rootFiles.push(claudeMdFile); // CLAUDE.md in workspace root
            rootFiles.push({ fileName: CLAUDE_LOCAL_MD_FILENAME, type: AgentFileType.claudeMd }); // CLAUDE.local.md in workspace root
            promises.push(this.fileLocator.findFilesInRoots(rootFolders, CLAUDE_CONFIG_FOLDER, [claudeMdFile], token, resolvedAgentFiles)); // CLAUDE.md in .claude folder under workspace root
            promises.push(this.fileLocator.findFilesInRoots([await this.pathService.userHome()], CLAUDE_CONFIG_FOLDER, [claudeMdFile], token, resolvedAgentFiles)); // CLAUDE.md in in ~/.claude folder
        }
        const useCopilotInstructionsFiles = this.configurationService.getValue(PromptsConfig.USE_COPILOT_INSTRUCTION_FILES);
        if (!useCopilotInstructionsFiles) {
            logger?.logInfo('Copilot instructions files are disabled via configuration.');
        }
        else {
            const githubConfigFiles = [{ fileName: COPILOT_CUSTOM_INSTRUCTIONS_FILENAME, type: AgentFileType.copilotInstructionsMd }];
            promises.push(this.fileLocator.findFilesInRoots(rootFolders, GITHUB_CONFIG_FOLDER, githubConfigFiles, token, resolvedAgentFiles));
        }
        promises.push(this.fileLocator.findFilesInRoots(rootFolders, undefined, rootFiles, token, resolvedAgentFiles));
        await Promise.all(promises);
        if (token.isCancellationRequested) {
            return [];
        }
        // first look at non-symlinked files, then add symlinks only if target not already included
        const seenFileURI = new ResourceSet();
        const symlinks = [];
        const result = [];
        const add = (file) => {
            if (file.realPath) {
                symlinks.push(file);
            }
            else {
                result.push(file);
                seenFileURI.add(file.uri);
            }
            return true;
        };
        resolvedAgentFiles.forEach(add);
        for (const symlink of symlinks) {
            if (seenFileURI.has(symlink.realPath)) {
                logger?.logInfo(`Skipping symlinked agent instructions file ${symlink.uri} as target already included: ${symlink.realPath}`);
            }
            else {
                result.push(symlink);
                seenFileURI.add(symlink.realPath);
            }
        }
        return result.sort((a, b) => a.uri.toString().localeCompare(b.uri.toString()));
    }
    getAgentFileURIFromModeFile(oldURI) {
        return this.fileLocator.getAgentFileURIFromModeFile(oldURI);
    }
    getDisabledPromptFiles(type) {
        // Migration: if disabled key absent but legacy enabled key present, convert once.
        const disabledKey = this.disabledPromptsStorageKeyPrefix + type;
        const value = this.storageService.get(disabledKey, 0 /* StorageScope.PROFILE */, '[]');
        const result = new ResourceSet();
        try {
            const arr = JSON.parse(value);
            if (Array.isArray(arr)) {
                for (const s of arr) {
                    try {
                        result.add(URI.revive(s));
                    }
                    catch {
                        // ignore
                    }
                }
            }
        }
        catch {
            // ignore invalid storage values
        }
        return result;
    }
    setDisabledPromptFiles(type, uris) {
        const disabled = Array.from(uris).map(uri => uri.toJSON());
        this.storageService.store(this.disabledPromptsStorageKeyPrefix + type, JSON.stringify(disabled), 0 /* StorageScope.PROFILE */, 0 /* StorageTarget.USER */);
        if (type === PromptsType.agent) {
            this.cachedCustomAgents.refresh();
        }
        else if (type === PromptsType.skill) {
            this.cachedSkills.refresh();
            this.cachedSlashCommands.refresh();
        }
    }
    // Agent skills
    sanitizeAgentSkillText(text) {
        // Remove XML tags
        return text.replace(/<[^>]+>/g, '');
    }
    /**
     * Validates and sanitizes a skill file. Throws an error if validation fails.
     * @returns The sanitized name and description
     */
    async validateAndSanitizeSkillFile(uri, token) {
        const parsedFile = await this.parseNew(uri, token);
        const name = parsedFile.header?.name;
        if (!name) {
            this.logger.error(`[validateAndSanitizeSkillFile] Agent skill file missing name attribute: ${uri}`);
            throw new SkillMissingNameError(uri);
        }
        const description = parsedFile.header?.description;
        if (!description) {
            this.logger.error(`[validateAndSanitizeSkillFile] Agent skill file missing description attribute: ${uri}`);
            throw new SkillMissingDescriptionError(uri);
        }
        // Sanitize the name first (remove XML tags and truncate)
        const sanitizedName = this.truncateAgentSkillName(name, uri);
        // Validate that the sanitized name matches the parent folder name (per agentskills.io specification)
        const skillFolderUri = dirname(uri);
        const folderName = basename(skillFolderUri);
        if (sanitizedName !== folderName) {
            this.logger.error(`[validateAndSanitizeSkillFile] Agent skill name "${sanitizedName}" does not match folder name "${folderName}": ${uri}`);
            throw new SkillNameMismatchError(uri, sanitizedName, folderName);
        }
        const sanitizedDescription = this.truncateAgentSkillDescription(parsedFile.header?.description, uri);
        return { name: sanitizedName, description: sanitizedDescription };
    }
    truncateAgentSkillName(name, uri) {
        const MAX_NAME_LENGTH = 64;
        const sanitized = this.sanitizeAgentSkillText(name);
        if (sanitized !== name) {
            this.logger.warn(`[findAgentSkills] Agent skill name contains XML tags, removed: ${uri}`);
        }
        if (sanitized.length > MAX_NAME_LENGTH) {
            this.logger.warn(`[findAgentSkills] Agent skill name exceeds ${MAX_NAME_LENGTH} characters, truncated: ${uri}`);
            return sanitized.substring(0, MAX_NAME_LENGTH);
        }
        return sanitized;
    }
    truncateAgentSkillDescription(description, uri) {
        if (!description) {
            return undefined;
        }
        const MAX_DESCRIPTION_LENGTH = 1024;
        const sanitized = this.sanitizeAgentSkillText(description);
        if (sanitized !== description) {
            this.logger.warn(`[findAgentSkills] Agent skill description contains XML tags, removed: ${uri}`);
        }
        if (sanitized.length > MAX_DESCRIPTION_LENGTH) {
            this.logger.warn(`[findAgentSkills] Agent skill description exceeds ${MAX_DESCRIPTION_LENGTH} characters, truncated: ${uri}`);
            return sanitized.substring(0, MAX_DESCRIPTION_LENGTH);
        }
        return sanitized;
    }
    get onDidChangeSkills() {
        return this.cachedSkills.onDidChange;
    }
    async findAgentSkills(token, sessionResource) {
        const useAgentSkills = this.configurationService.getValue(PromptsConfig.USE_AGENT_SKILLS);
        if (!useAgentSkills) {
            return undefined;
        }
        const sw = StopWatch.create();
        const result = await this.cachedSkills.get(token);
        if (sessionResource) {
            const elapsed = sw.elapsed();
            void this.getSkillDiscoveryInfo(token).catch(() => undefined).then(discoveryInfo => {
                const details = result.length === 1
                    ? localize(8840, null, result.length, elapsed.toFixed(1))
                    : localize(8841, null, result.length, elapsed.toFixed(1));
                this._onDidLogDiscovery.fire({
                    sessionResource,
                    name: localize(8842, null),
                    details,
                    discoveryInfo,
                    category: 'discovery',
                });
            });
        }
        return result;
    }
    async computeAgentSkills(token) {
        const { files, skillsBySource } = await this.computeSkillDiscoveryInfo(token);
        // Extract loaded skills
        const result = [];
        for (const file of files) {
            if (file.status === 'loaded' && file.name) {
                const sanitizedDescription = this.truncateAgentSkillDescription(file.description, file.uri);
                const internalSkill = this.internalCustomizations.getInternalSkillByUri(file.uri);
                result.push({
                    uri: file.uri,
                    storage: file.storage,
                    name: file.name,
                    description: sanitizedDescription,
                    disableModelInvocation: file.disableModelInvocation ?? false,
                    userInvocable: file.userInvocable ?? true,
                    when: internalSkill?.when,
                });
            }
        }
        // Count skip reasons for telemetry
        let skippedMissingName = 0;
        let skippedMissingDescription = 0;
        let skippedDuplicateName = 0;
        let skippedParseFailed = 0;
        let skippedNameMismatch = 0;
        for (const file of files) {
            if (file.status === 'skipped') {
                switch (file.skipReason) {
                    case 'missing-name':
                        skippedMissingName++;
                        break;
                    case 'missing-description':
                        skippedMissingDescription++;
                        break;
                    case 'duplicate-name':
                        skippedDuplicateName++;
                        break;
                    case 'name-mismatch':
                        skippedNameMismatch++;
                        break;
                    case 'parse-error':
                        skippedParseFailed++;
                        break;
                }
            }
        }
        this.telemetryService.publicLog2('agentSkillsFound', {
            totalSkillsFound: result.length,
            claudePersonal: skillsBySource.get(PromptFileSource.ClaudePersonal) ?? 0,
            claudeWorkspace: skillsBySource.get(PromptFileSource.ClaudeWorkspace) ?? 0,
            copilotPersonal: skillsBySource.get(PromptFileSource.CopilotPersonal) ?? 0,
            githubWorkspace: skillsBySource.get(PromptFileSource.GitHubWorkspace) ?? 0,
            agentsPersonal: skillsBySource.get(PromptFileSource.AgentsPersonal) ?? 0,
            agentsWorkspace: skillsBySource.get(PromptFileSource.AgentsWorkspace) ?? 0,
            configWorkspace: skillsBySource.get(PromptFileSource.ConfigWorkspace) ?? 0,
            configPersonal: skillsBySource.get(PromptFileSource.ConfigPersonal) ?? 0,
            extensionContribution: skillsBySource.get(PromptFileSource.ExtensionContribution) ?? 0,
            extensionAPI: skillsBySource.get(PromptFileSource.ExtensionAPI) ?? 0,
            plugin: skillsBySource.get(PromptFileSource.Plugin) ?? 0,
            skippedDuplicateName,
            skippedMissingName,
            skippedMissingDescription,
            skippedNameMismatch,
            skippedParseFailed
        });
        return result;
    }
    async getHooks(token, sessionResource) {
        const sw = StopWatch.create();
        const result = await this.cachedHooks.get(token);
        if (sessionResource) {
            const elapsed = sw.elapsed();
            void this.getHookDiscoveryInfo(token).catch(() => undefined).then(discoveryInfo => {
                const hookCount = result ? Object.values(result.hooks).reduce((sum, arr) => sum + arr.length, 0) : 0;
                const details = hookCount === 1
                    ? localize(8843, null, hookCount, elapsed.toFixed(1))
                    : localize(8844, null, hookCount, elapsed.toFixed(1));
                this._onDidLogDiscovery.fire({
                    sessionResource,
                    name: localize(8845, null),
                    details,
                    discoveryInfo,
                    category: 'discovery',
                });
            });
        }
        return result;
    }
    async getInstructionFiles(token, sessionResource) {
        const sw = StopWatch.create();
        const result = await this.listPromptFiles(PromptsType.instructions, token);
        if (sessionResource) {
            const elapsed = sw.elapsed();
            void this.getInstructionsDiscoveryInfo(token).catch(() => undefined).then(discoveryInfo => {
                const details = result.length === 1
                    ? localize(8846, null, result.length, elapsed.toFixed(1))
                    : localize(8847, null, result.length, elapsed.toFixed(1));
                this._onDidLogDiscovery.fire({
                    sessionResource,
                    name: localize(8848, null),
                    details,
                    discoveryInfo,
                    category: 'discovery',
                });
            });
        }
        return result;
    }
    async computeHooks(token) {
        const useChatHooks = this.configurationService.getValue(PromptsConfig.USE_CHAT_HOOKS);
        if (!useChatHooks) {
            return undefined;
        }
        if (!this.workspaceTrustService.isWorkspaceTrusted()) {
            return undefined;
        }
        const useClaudeHooks = this.configurationService.getValue(PromptsConfig.USE_CLAUDE_HOOKS);
        const hookFiles = await this.listPromptFiles(PromptsType.hook, token);
        this.logger.trace(`[PromptsService] Found ${hookFiles.length} hook file(s).`);
        // Get user home for tilde expansion
        const userHomeUri = await this.pathService.userHome();
        const userHome = userHomeUri.scheme === Schemas.file ? userHomeUri.fsPath : userHomeUri.path;
        let hasDisabledClaudeHooks = false;
        const collectedHooks = new Map();
        const defaultFolder = this.workspaceService.getWorkspace().folders[0];
        for (const hookFile of hookFiles) {
            try {
                const content = await this.fileService.readFile(hookFile.uri);
                const json = parseJSONC(content.value.toString());
                // Resolve the workspace folder that contains this hook file for cwd resolution,
                // falling back to the first workspace folder for user-level hooks outside the workspace
                const hookWorkspaceFolder = this.workspaceService.getWorkspaceFolder(hookFile.uri) ?? defaultFolder;
                const workspaceRootUri = hookWorkspaceFolder?.uri;
                // Use format-aware parsing that handles Copilot and Claude formats
                const { format, hooks, disabledAllHooks } = parseHooksFromFile(hookFile.uri, json, workspaceRootUri, userHome);
                // Skip files that have all hooks disabled
                if (disabledAllHooks) {
                    this.logger.trace(`[PromptsService] Skipping hook file with disableAllHooks: ${hookFile.uri}`);
                    continue;
                }
                if (format === HookSourceFormat.Claude && useClaudeHooks === false) {
                    const hasAnyCommands = [...hooks.values()].some(({ hooks: cmds }) => cmds.length > 0);
                    if (hasAnyCommands) {
                        hasDisabledClaudeHooks = true;
                    }
                    this.logger.trace(`[PromptsService] Skipping Claude hook file (disabled via setting): ${hookFile.uri}`);
                    continue;
                }
                for (const [hookType, { hooks: commands }] of hooks) {
                    for (const command of commands) {
                        let bucket = collectedHooks.get(hookType);
                        if (!bucket) {
                            bucket = [];
                            collectedHooks.set(hookType, bucket);
                        }
                        bucket.push(command);
                        this.logger.trace(`[PromptsService] Collected ${hookType} hook from ${hookFile.uri} (format: ${format})`);
                    }
                }
            }
            catch (error) {
                this.logger.warn(`[PromptsService] Failed to parse hook file: ${hookFile.uri}`, error);
            }
        }
        // Collect hooks from agent plugins
        const plugins = this.agentPluginService.plugins.get();
        for (const plugin of plugins) {
            if (!isContributionEnabled(plugin.enablement.get())) {
                continue;
            }
            for (const hook of plugin.hooks.get()) {
                let bucket = collectedHooks.get(hook.type);
                if (!bucket) {
                    bucket = [];
                    collectedHooks.set(hook.type, bucket);
                }
                bucket.push(...hook.hooks);
            }
        }
        // Check if any hooks were collected
        if (collectedHooks.size === 0) {
            this.logger.trace('[PromptsService] No valid hooks collected.');
            return undefined;
        }
        // Build the result
        const result = Object.fromEntries(collectedHooks);
        this.logger.trace(`[PromptsService] Collected hooks: ${JSON.stringify(Object.keys(result))}`);
        return { hooks: result, hasDisabledClaudeHooks };
    }
    async getSkillDiscoveryInfo(token) {
        const useAgentSkills = this.configurationService.getValue(PromptsConfig.USE_AGENT_SKILLS);
        if (!useAgentSkills) {
            // Skills disabled - list all files as skipped with 'disabled' reason
            const allFiles = await this.listPromptFiles(PromptsType.skill, token);
            const files = allFiles.map(promptPath => ({
                uri: promptPath.uri,
                storage: promptPath.storage,
                status: 'skipped',
                skipReason: 'disabled',
                extensionId: promptPath.extension?.identifier?.value
            }));
            const sourceFolders = await this._collectSourceFolderDiagnostics(PromptsType.skill);
            return { type: PromptsType.skill, files, sourceFolders };
        }
        const { files } = await this.computeSkillDiscoveryInfo(token);
        return { type: PromptsType.skill, files };
    }
    /**
     * Shared implementation for skill discovery used by both findAgentSkills and getSkillDiscoveryInfo.
     * Returns the discovery results and a map of skill counts by source type for telemetry.
     */
    async computeSkillDiscoveryInfo(token) {
        const files = [];
        const skillsBySource = new Map();
        const seenNames = new Set();
        const nameToUri = new Map();
        // Collect all skills with their metadata for sorting
        const allSkills = [];
        const discoveredSkills = await this.fileLocator.findAgentSkills(token);
        const extensionSkills = await this.getExtensionPromptFiles(PromptsType.skill, token);
        const pluginSkills = this._pluginPromptFilesByType.get(PromptsType.skill) ?? [];
        allSkills.push(...discoveredSkills, ...extensionSkills.map((extPath) => ({
            fileUri: extPath.uri,
            storage: extPath.storage,
            source: extPath.source === ExtensionAgentSourceType.contribution ? PromptFileSource.ExtensionContribution : PromptFileSource.ExtensionAPI
        })), ...pluginSkills.map((p) => ({
            fileUri: p.uri,
            storage: p.storage,
            source: PromptFileSource.Plugin,
        })), ...this.internalCustomizations.getSkills()
            .map(s => ({
            fileUri: s.uri,
            storage: s.storage,
            source: PromptFileSource.Internal,
        })));
        const getPriority = (skill) => {
            if (skill.storage === PromptsStorage.local) {
                return 0; // workspace
            }
            if (skill.storage === PromptsStorage.user) {
                return 1; // personal
            }
            if (skill.storage === PromptsStorage.plugin) {
                return 2; // plugin
            }
            if (skill.source === PromptFileSource.ExtensionAPI) {
                return 3;
            }
            if (skill.source === PromptFileSource.ExtensionContribution) {
                return 4;
            }
            return 5;
        };
        // Stable sort; we should keep order consistent to the order in the user's configuration object
        allSkills.sort((a, b) => getPriority(a) - getPriority(b));
        // Build map of URI to extension ID
        const extensionIdByUri = new Map();
        for (const extSkill of extensionSkills) {
            extensionIdByUri.set(extSkill.uri.toString(), extSkill.extension.identifier.value);
        }
        for (const skill of allSkills) {
            const uri = skill.fileUri;
            const storage = skill.storage;
            const source = skill.source;
            const extensionId = extensionIdByUri.get(uri.toString());
            try {
                const parsedFile = await this.parseNew(uri, token);
                const name = parsedFile.header?.name;
                if (!name) {
                    this.logger.error(`[computeSkillDiscoveryInfo] Agent skill file missing name attribute: ${uri}`);
                    files.push({ uri, storage, status: 'skipped', skipReason: 'missing-name', extensionId, source });
                    continue;
                }
                const sanitizedName = this.truncateAgentSkillName(name, uri);
                const skillFolderUri = dirname(uri);
                const folderName = basename(skillFolderUri);
                if (sanitizedName !== folderName) {
                    this.logger.error(`[computeSkillDiscoveryInfo] Agent skill name "${sanitizedName}" does not match folder name "${folderName}": ${uri}`);
                    files.push({ uri, storage, status: 'skipped', skipReason: 'name-mismatch', name: sanitizedName, extensionId, source });
                    continue;
                }
                if (seenNames.has(sanitizedName)) {
                    this.logger.warn(`[computeSkillDiscoveryInfo] Skipping duplicate agent skill name: ${sanitizedName} at ${uri}`);
                    files.push({ uri, storage, status: 'skipped', skipReason: 'duplicate-name', name: sanitizedName, duplicateOf: nameToUri.get(sanitizedName), extensionId, source });
                    continue;
                }
                const description = parsedFile.header?.description;
                if (!description) {
                    this.logger.error(`[computeSkillDiscoveryInfo] Agent skill file missing description attribute: ${uri}`);
                    files.push({ uri, storage, status: 'skipped', skipReason: 'missing-description', name: sanitizedName, extensionId, source });
                    continue;
                }
                seenNames.add(sanitizedName);
                nameToUri.set(sanitizedName, uri);
                const disableModelInvocation = parsedFile.header?.disableModelInvocation === true;
                const userInvocable = parsedFile.header?.userInvocable !== false;
                files.push({ uri, storage, status: 'loaded', name: sanitizedName, description, extensionId, source, disableModelInvocation, userInvocable });
                // Track skill type
                skillsBySource.set(source, (skillsBySource.get(source) || 0) + 1);
            }
            catch (e) {
                const msg = e instanceof Error ? e.message : String(e);
                this.logger.error(`[computeSkillDiscoveryInfo] Failed to validate Agent skill file: ${uri}`, msg);
                files.push({
                    uri,
                    storage,
                    status: 'skipped',
                    skipReason: 'parse-error',
                    errorMessage: msg,
                    extensionId,
                    source
                });
            }
        }
        return { files, skillsBySource };
    }
    async getAgentDiscoveryInfo(token) {
        const files = [];
        const disabledAgents = this.getDisabledPromptFiles(PromptsType.agent);
        const agentFiles = await this.listPromptFiles(PromptsType.agent, token);
        for (const promptPath of agentFiles) {
            const uri = promptPath.uri;
            const storage = promptPath.storage;
            const extensionId = promptPath.extension?.identifier?.value;
            if (disabledAgents.has(uri)) {
                files.push({ uri, storage, status: 'skipped', skipReason: 'disabled', extensionId });
                continue;
            }
            try {
                const ast = await this.parseNew(uri, token);
                const name = ast.header?.name ?? promptPath.name ?? getCleanPromptName(uri);
                files.push({ uri, storage, status: 'loaded', name, extensionId });
            }
            catch (e) {
                files.push({
                    uri,
                    storage,
                    status: 'skipped',
                    skipReason: 'parse-error',
                    errorMessage: e instanceof Error ? e.message : String(e),
                    extensionId
                });
            }
        }
        const sourceFolders = await this._collectSourceFolderDiagnostics(PromptsType.agent);
        return { type: PromptsType.agent, files, sourceFolders };
    }
    async getPromptSlashCommandDiscoveryInfo(token) {
        const files = [];
        const promptFiles = await this.listPromptFiles(PromptsType.prompt, token);
        for (const promptPath of promptFiles) {
            const uri = promptPath.uri;
            const storage = promptPath.storage;
            const extensionId = promptPath.extension?.identifier?.value;
            try {
                const parsedPromptFile = await this.parseNew(uri, token);
                const name = parsedPromptFile?.header?.name ?? promptPath.name ?? getCleanPromptName(uri);
                files.push({ uri, storage, status: 'loaded', name, extensionId });
            }
            catch (e) {
                files.push({
                    uri,
                    storage,
                    status: 'skipped',
                    skipReason: 'parse-error',
                    errorMessage: e instanceof Error ? e.message : String(e),
                    extensionId
                });
            }
        }
        const sourceFolders = await this._collectSourceFolderDiagnostics(PromptsType.prompt);
        return { type: PromptsType.prompt, files, sourceFolders };
    }
    async getInstructionsDiscoveryInfo(token) {
        const files = [];
        const instructionsFiles = await this.listPromptFiles(PromptsType.instructions, token);
        for (const promptPath of instructionsFiles) {
            const uri = promptPath.uri;
            const storage = promptPath.storage;
            const extensionId = promptPath.extension?.identifier?.value;
            try {
                const parsedPromptFile = await this.parseNew(uri, token);
                const name = parsedPromptFile?.header?.name ?? promptPath.name ?? getCleanPromptName(uri);
                files.push({ uri, storage, status: 'loaded', name, extensionId });
            }
            catch (e) {
                files.push({
                    uri,
                    storage,
                    status: 'skipped',
                    skipReason: 'parse-error',
                    errorMessage: e instanceof Error ? e.message : String(e),
                    extensionId
                });
            }
        }
        const sourceFolders = await this._collectSourceFolderDiagnostics(PromptsType.instructions);
        return { type: PromptsType.instructions, files, sourceFolders };
    }
    async getHookDiscoveryInfo(token) {
        const files = [];
        // Get user home for tilde expansion
        const userHomeUri = await this.pathService.userHome();
        const userHome = userHomeUri.scheme === Schemas.file ? userHomeUri.fsPath : userHomeUri.path;
        const useClaudeHooks = this.configurationService.getValue(PromptsConfig.USE_CLAUDE_HOOKS);
        const hookFiles = await this.listPromptFiles(PromptsType.hook, token);
        for (const promptPath of hookFiles) {
            const uri = promptPath.uri;
            const storage = promptPath.storage;
            const extensionId = promptPath.extension?.identifier?.value;
            const name = basename(uri);
            // Ignored if workspace is untrusted
            if (!this.workspaceTrustService.isWorkspaceTrusted()) {
                files.push({
                    uri: promptPath.uri,
                    storage: promptPath.storage,
                    status: 'skipped',
                    skipReason: 'workspace-untrusted',
                    name: basename(promptPath.uri),
                    extensionId: promptPath.extension?.identifier?.value,
                });
                continue;
            }
            // Skip Claude hooks when the setting is disabled
            if (getHookSourceFormat(uri) === HookSourceFormat.Claude && useClaudeHooks === false) {
                files.push({
                    uri,
                    storage,
                    status: 'skipped',
                    skipReason: 'claude-hooks-disabled',
                    name,
                    extensionId
                });
                continue;
            }
            try {
                // Try to parse the JSON to validate it (supports JSONC with comments)
                const content = await this.fileService.readFile(uri);
                const json = parseJSONC(content.value.toString());
                // Validate it's an object
                if (!json || typeof json !== 'object') {
                    files.push({
                        uri,
                        storage,
                        status: 'skipped',
                        skipReason: 'parse-error',
                        errorMessage: 'Invalid hooks file: must be a JSON object',
                        name,
                        extensionId
                    });
                    continue;
                }
                // Resolve the workspace folder that contains this hook file for cwd resolution,
                // falling back to the first workspace folder for user-level hooks outside the workspace
                const hookWorkspaceFolder = this.workspaceService.getWorkspaceFolder(uri) ?? this.workspaceService.getWorkspace().folders[0];
                const workspaceRootUri = hookWorkspaceFolder?.uri;
                // Use format-aware parsing to check for disabledAllHooks
                const { disabledAllHooks } = parseHooksFromFile(uri, json, workspaceRootUri, userHome);
                if (disabledAllHooks) {
                    files.push({
                        uri,
                        storage,
                        status: 'skipped',
                        skipReason: 'all-hooks-disabled',
                        name,
                        extensionId
                    });
                    continue;
                }
                // File is valid
                files.push({ uri, storage, status: 'loaded', name, extensionId });
            }
            catch (e) {
                files.push({
                    uri,
                    storage,
                    status: 'skipped',
                    skipReason: 'parse-error',
                    errorMessage: e instanceof Error ? e.message : String(e),
                    name,
                    extensionId
                });
            }
        }
        const sourceFolders = await this._collectSourceFolderDiagnostics(PromptsType.hook);
        return { type: PromptsType.hook, files, sourceFolders };
    }
};
PromptsService = __decorate([
    __param(0, ILogService),
    __param(1, ILabelService),
    __param(2, IModelService),
    __param(3, IInstantiationService),
    __param(4, IUserDataProfileService),
    __param(5, IConfigurationService),
    __param(6, IFileService),
    __param(7, IFilesConfigurationService),
    __param(8, IStorageService),
    __param(9, IExtensionService),
    __param(10, ITelemetryService),
    __param(11, IWorkspaceContextService),
    __param(12, IPathService),
    __param(13, IContextKeyService),
    __param(14, IAgentPluginService),
    __param(15, IWorkspaceTrustManagementService)
], PromptsService);
export { PromptsService };
// helpers
class CachedPromise extends Disposable {
    constructor(computeFn, getEvent, delay = 0) {
        super();
        this.computeFn = computeFn;
        this.getEvent = getEvent;
        this.delay = delay;
        this.cachedPromise = undefined;
        this.onDidUpdatePromiseEmitter = undefined;
    }
    get onDidChange() {
        if (!this.onDidUpdatePromiseEmitter) {
            const emitter = this.onDidUpdatePromiseEmitter = this._register(new Emitter());
            const delayer = this._register(new Delayer(this.delay));
            this._register(this.getEvent()(() => {
                this.cachedPromise = undefined;
                delayer.trigger(() => emitter.fire());
            }));
        }
        return this.onDidUpdatePromiseEmitter.event;
    }
    get(token) {
        if (this.cachedPromise !== undefined) {
            return this.cachedPromise;
        }
        const result = this.computeFn(token);
        if (!this.onDidUpdatePromiseEmitter) {
            return result; // only cache if there is an event listener
        }
        this.cachedPromise = result;
        this.onDidUpdatePromiseEmitter.fire();
        return result;
    }
    refresh() {
        this.cachedPromise = undefined;
        this.onDidUpdatePromiseEmitter?.fire();
    }
}
class ModelChangeTracker extends Disposable {
    get onDidPromptChange() {
        return this.onDidPromptModelChange.event;
    }
    constructor(modelService) {
        super();
        this.listeners = new ResourceMap();
        this.onDidPromptModelChange = this._register(new Emitter());
        const onAdd = (model) => {
            const promptType = getPromptsTypeForLanguageId(model.getLanguageId());
            if (promptType !== undefined) {
                this.listeners.set(model.uri, model.onDidChangeContent(() => this.onDidPromptModelChange.fire({ uri: model.uri, promptType })));
            }
        };
        const onRemove = (languageId, uri) => {
            const promptType = getPromptsTypeForLanguageId(languageId);
            if (promptType !== undefined) {
                this.listeners.get(uri)?.dispose();
                this.listeners.delete(uri);
                this.onDidPromptModelChange.fire({ uri, promptType });
            }
        };
        this._register(modelService.onModelAdded(model => onAdd(model)));
        this._register(modelService.onModelLanguageChanged(e => {
            onRemove(e.oldLanguageId, e.model.uri);
            onAdd(e.model);
        }));
        this._register(modelService.onModelRemoved(model => onRemove(model.getLanguageId(), model.uri)));
    }
    dispose() {
        super.dispose();
        this.listeners.forEach(listener => listener.dispose());
        this.listeners.clear();
    }
}
var IAgentSource;
(function (IAgentSource) {
    function fromPromptPath(promptPath) {
        if (promptPath.storage === PromptsStorage.extension) {
            return {
                storage: PromptsStorage.extension,
                extensionId: promptPath.extension.identifier,
                type: promptPath.source
            };
        }
        else if (promptPath.storage === PromptsStorage.plugin) {
            return {
                storage: PromptsStorage.plugin,
                pluginUri: promptPath.pluginUri
            };
        }
        else if (promptPath.storage === PromptsStorage.internal) {
            return {
                storage: PromptsStorage.internal
            };
        }
        else {
            return {
                storage: promptPath.storage
            };
        }
    }
    IAgentSource.fromPromptPath = fromPromptPath;
})(IAgentSource || (IAgentSource = {}));
//# sourceMappingURL=promptsServiceImpl.js.map