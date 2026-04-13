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
var ChatModeService_1;
import { CancellationToken } from '../../../../base/common/cancellation.js';
import { Emitter } from '../../../../base/common/event.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { constObservable, observableValue, transaction } from '../../../../base/common/observable.js';
import { isUriComponents, URI } from '../../../../base/common/uri.js';
import { localize } from '../../../../nls.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { IContextKeyService } from '../../../../platform/contextkey/common/contextkey.js';
import { ExtensionIdentifier } from '../../../../platform/extensions/common/extensions.js';
import { createDecorator } from '../../../../platform/instantiation/common/instantiation.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { IStorageService } from '../../../../platform/storage/common/storage.js';
import { IChatAgentService } from './participants/chatAgents.js';
import { ChatContextKeys } from './actions/chatContextKeys.js';
import { ChatConfiguration, ChatModeKind } from './constants.js';
import { ExtensionAgentSourceType, IPromptsService, isCustomAgentVisibility, PromptsStorage } from './promptSyntax/service/promptsService.js';
import { Target } from './promptSyntax/promptTypes.js';
import { Codicon } from '../../../../base/common/codicons.js';
import { hash } from '../../../../base/common/hash.js';
import { isString } from '../../../../base/common/types.js';
import { isTarget } from './promptSyntax/languageProviders/promptFileAttributes.js';
export const IChatModeService = createDecorator('chatModeService');
let ChatModeService = class ChatModeService extends Disposable {
    static { ChatModeService_1 = this; }
    static { this.CUSTOM_MODES_STORAGE_KEY = 'chat.customModes'; }
    constructor(promptsService, chatAgentService, contextKeyService, logService, storageService, configurationService) {
        super();
        this.promptsService = promptsService;
        this.chatAgentService = chatAgentService;
        this.logService = logService;
        this.storageService = storageService;
        this.configurationService = configurationService;
        this._customModeInstances = new Map();
        this._onDidChangeChatModes = this._register(new Emitter());
        this.onDidChangeChatModes = this._onDidChangeChatModes.event;
        this.hasCustomModes = ChatContextKeys.Modes.hasCustomChatModes.bindTo(contextKeyService);
        this.agentModeDisabledByPolicy = ChatContextKeys.Modes.agentModeDisabledByPolicy.bindTo(contextKeyService);
        // Initialize the policy context key
        this.updateAgentModePolicyContextKey();
        // Load cached modes from storage first
        this.loadCachedModes();
        void this.refreshCustomPromptModes(true);
        this._register(this.promptsService.onDidChangeCustomAgents(() => {
            void this.refreshCustomPromptModes(true);
        }));
        this._register(this.storageService.onWillSaveState(() => this.saveCachedModes()));
        // Listen for configuration changes that affect agent mode policy
        this._register(this.configurationService.onDidChangeConfiguration(e => {
            if (e.affectsConfiguration(ChatConfiguration.AgentEnabled)) {
                this.updateAgentModePolicyContextKey();
                this._onDidChangeChatModes.fire();
            }
        }));
        // Ideally we can get rid of the setting to disable agent mode?
        let didHaveToolsAgent = this.chatAgentService.hasToolsAgent;
        this._register(this.chatAgentService.onDidChangeAgents(() => {
            if (didHaveToolsAgent !== this.chatAgentService.hasToolsAgent) {
                didHaveToolsAgent = this.chatAgentService.hasToolsAgent;
                this._onDidChangeChatModes.fire();
            }
        }));
    }
    loadCachedModes() {
        try {
            const cachedCustomModes = this.storageService.getObject(ChatModeService_1.CUSTOM_MODES_STORAGE_KEY, 1 /* StorageScope.WORKSPACE */);
            if (cachedCustomModes) {
                this.deserializeCachedModes(cachedCustomModes);
            }
        }
        catch (error) {
            this.logService.error(error, 'Failed to load cached custom agents');
        }
    }
    deserializeCachedModes(cachedCustomModes) {
        if (!Array.isArray(cachedCustomModes)) {
            this.logService.error('Invalid cached custom modes data: expected array');
            return;
        }
        for (const cachedMode of cachedCustomModes) {
            if (isCachedChatModeData(cachedMode) && cachedMode.uri) {
                try {
                    const visibility = cachedMode.visibility ?? { userInvocable: true, agentInvocable: cachedMode.infer !== false };
                    if (!visibility.userInvocable) {
                        continue;
                    }
                    const uri = URI.revive(cachedMode.uri);
                    const customChatMode = {
                        uri,
                        name: cachedMode.name,
                        description: cachedMode.description,
                        tools: cachedMode.customTools,
                        model: isString(cachedMode.model) ? [cachedMode.model] : cachedMode.model,
                        argumentHint: cachedMode.argumentHint,
                        agentInstructions: cachedMode.modeInstructions ?? { content: cachedMode.body ?? '', toolReferences: [] },
                        handOffs: cachedMode.handOffs,
                        target: cachedMode.target ?? Target.Undefined,
                        visibility,
                        agents: cachedMode.agents,
                        source: reviveChatModeSource(cachedMode.source) ?? { storage: PromptsStorage.local }
                    };
                    const instance = new CustomChatMode(customChatMode);
                    this._customModeInstances.set(uri.toString(), instance);
                }
                catch (error) {
                    this.logService.error(error, 'Failed to revive cached custom agent');
                }
            }
        }
        this.hasCustomModes.set(this._customModeInstances.size > 0);
    }
    saveCachedModes() {
        try {
            const modesToCache = Array.from(this._customModeInstances.values());
            this.storageService.store(ChatModeService_1.CUSTOM_MODES_STORAGE_KEY, modesToCache, 1 /* StorageScope.WORKSPACE */, 1 /* StorageTarget.MACHINE */);
        }
        catch (error) {
            this.logService.warn('Failed to save cached custom agents', error);
        }
    }
    async refreshCustomPromptModes(fireChangeEvent) {
        try {
            const customModes = await this.promptsService.getCustomAgents(CancellationToken.None);
            // Create a new set of mode instances, reusing existing ones where possible
            const seenUris = new Set();
            for (const customMode of customModes) {
                if (!customMode.visibility.userInvocable) {
                    continue;
                }
                const uriString = customMode.uri.toString();
                seenUris.add(uriString);
                let modeInstance = this._customModeInstances.get(uriString);
                if (modeInstance) {
                    // Update existing instance with new data
                    modeInstance.updateData(customMode);
                }
                else {
                    // Create new instance
                    modeInstance = new CustomChatMode(customMode);
                    this._customModeInstances.set(uriString, modeInstance);
                }
            }
            // Clean up instances for modes that no longer exist
            for (const [uriString] of this._customModeInstances.entries()) {
                if (!seenUris.has(uriString)) {
                    this._customModeInstances.delete(uriString);
                }
            }
            this.hasCustomModes.set(this._customModeInstances.size > 0);
        }
        catch (error) {
            this.logService.error(error, 'Failed to load custom agents');
            this._customModeInstances.clear();
            this.hasCustomModes.set(false);
        }
        if (fireChangeEvent) {
            this._onDidChangeChatModes.fire();
        }
    }
    getModes() {
        return {
            builtin: this.getBuiltinModes(),
            custom: this.getCustomModes(),
        };
    }
    findModeById(id) {
        return this.getBuiltinModes().find(mode => mode.id === id) ?? this._customModeInstances.get(id);
    }
    findModeByName(name) {
        return this.getBuiltinModes().find(mode => mode.name.get() === name) ?? this.getCustomModes().find(mode => mode.name.get() === name);
    }
    getBuiltinModes() {
        const builtinModes = [
            ChatMode.Ask,
        ];
        // Include Agent mode if:
        // - It's enabled (hasToolsAgent is true), OR
        // - It's disabled by policy (so we can show it with a lock icon)
        // But hide it if the user manually disabled it via settings
        if (this.chatAgentService.hasToolsAgent || this.isAgentModeDisabledByPolicy()) {
            builtinModes.unshift(ChatMode.Agent);
        }
        builtinModes.push(ChatMode.Edit);
        return builtinModes;
    }
    getCustomModes() {
        // Show custom modes when agent mode is enabled OR when disabled by policy (to show them in the policy-managed group)
        return this.chatAgentService.hasToolsAgent || this.isAgentModeDisabledByPolicy() ? Array.from(this._customModeInstances.values()) : [];
    }
    updateAgentModePolicyContextKey() {
        this.agentModeDisabledByPolicy.set(this.isAgentModeDisabledByPolicy());
    }
    isAgentModeDisabledByPolicy() {
        return this.configurationService.inspect(ChatConfiguration.AgentEnabled).policyValue === false;
    }
};
ChatModeService = ChatModeService_1 = __decorate([
    __param(0, IPromptsService),
    __param(1, IChatAgentService),
    __param(2, IContextKeyService),
    __param(3, ILogService),
    __param(4, IStorageService),
    __param(5, IConfigurationService)
], ChatModeService);
export { ChatModeService };
function isCachedChatModeData(data) {
    if (typeof data !== 'object' || data === null) {
        return false;
    }
    const mode = data;
    return typeof mode.id === 'string' &&
        typeof mode.name === 'string' &&
        typeof mode.kind === 'string' &&
        (mode.description === undefined || typeof mode.description === 'string') &&
        (mode.customTools === undefined || Array.isArray(mode.customTools)) &&
        (mode.modeInstructions === undefined || (typeof mode.modeInstructions === 'object' && mode.modeInstructions !== null)) &&
        (mode.model === undefined || typeof mode.model === 'string' || Array.isArray(mode.model)) &&
        (mode.argumentHint === undefined || typeof mode.argumentHint === 'string') &&
        (mode.handOffs === undefined || Array.isArray(mode.handOffs)) &&
        (mode.uri === undefined || (typeof mode.uri === 'object' && mode.uri !== null)) &&
        (mode.source === undefined || isChatModeSourceData(mode.source)) &&
        (mode.target === undefined || isTarget(mode.target)) &&
        (mode.visibility === undefined || isCustomAgentVisibility(mode.visibility)) &&
        (mode.agents === undefined || Array.isArray(mode.agents));
}
export class CustomChatMode {
    get name() {
        return this._nameObservable;
    }
    get description() {
        return this._descriptionObservable;
    }
    get icon() {
        return constObservable(undefined);
    }
    get isBuiltin() {
        return isBuiltinChatMode(this);
    }
    get customTools() {
        return this._customToolsObservable;
    }
    get model() {
        return this._modelObservable;
    }
    get argumentHint() {
        return this._argumentHintObservable;
    }
    get modeInstructions() {
        return this._modeInstructions;
    }
    get uri() {
        return this._uriObservable;
    }
    get label() {
        return this.name;
    }
    get handOffs() {
        return this._handoffsObservable;
    }
    get source() {
        return this._source;
    }
    get target() {
        return this._targetObservable;
    }
    get visibility() {
        return this._visibilityObservable;
    }
    get agents() {
        return this._agentsObservable;
    }
    constructor(customChatMode) {
        this.kind = ChatModeKind.Agent;
        this.id = customChatMode.uri.toString();
        this._nameObservable = observableValue('name', customChatMode.name);
        this._descriptionObservable = observableValue('description', customChatMode.description);
        this._customToolsObservable = observableValue('customTools', customChatMode.tools);
        this._modelObservable = observableValue('model', customChatMode.model);
        this._argumentHintObservable = observableValue('argumentHint', customChatMode.argumentHint);
        this._handoffsObservable = observableValue('handOffs', customChatMode.handOffs);
        this._targetObservable = observableValue('target', customChatMode.target);
        this._visibilityObservable = observableValue('visibility', customChatMode.visibility);
        this._agentsObservable = observableValue('agents', customChatMode.agents);
        this._modeInstructions = observableValue('_modeInstructions', customChatMode.agentInstructions);
        this._uriObservable = observableValue('uri', customChatMode.uri);
        this._source = customChatMode.source;
    }
    /**
     * Updates the underlying data and triggers observable changes
     */
    updateData(newData) {
        transaction(tx => {
            this._nameObservable.set(newData.name, tx);
            this._descriptionObservable.set(newData.description, tx);
            this._customToolsObservable.set(newData.tools, tx);
            this._modelObservable.set(newData.model, tx);
            this._argumentHintObservable.set(newData.argumentHint, tx);
            this._handoffsObservable.set(newData.handOffs, tx);
            this._targetObservable.set(newData.target, tx);
            this._visibilityObservable.set(newData.visibility, tx);
            this._agentsObservable.set(newData.agents, tx);
            this._modeInstructions.set(newData.agentInstructions, tx);
            this._uriObservable.set(newData.uri, tx);
            this._source = newData.source;
        });
    }
    toJSON() {
        return {
            id: this.id,
            name: this.name.get(),
            description: this.description.get(),
            kind: this.kind,
            customTools: this.customTools.get(),
            model: this.model.get(),
            argumentHint: this.argumentHint.get(),
            modeInstructions: this.modeInstructions.get(),
            uri: this.uri.get(),
            handOffs: this.handOffs.get(),
            source: serializeChatModeSource(this._source),
            target: this.target.get(),
            visibility: this.visibility.get(),
            agents: this.agents.get()
        };
    }
}
function isChatModeSourceData(value) {
    if (typeof value !== 'object' || value === null) {
        return false;
    }
    const data = value;
    if (data.storage === PromptsStorage.extension) {
        return typeof data.extensionId === 'string';
    }
    if (data.storage === PromptsStorage.plugin) {
        return isUriComponents(data.pluginUri);
    }
    return data.storage === PromptsStorage.local || data.storage === PromptsStorage.user || data.storage === PromptsStorage.internal;
}
function serializeChatModeSource(source) {
    if (!source) {
        return undefined;
    }
    if (source.storage === PromptsStorage.extension) {
        return { storage: PromptsStorage.extension, extensionId: source.extensionId.value, type: source.type };
    }
    if (source.storage === PromptsStorage.plugin) {
        return { storage: PromptsStorage.plugin, pluginUri: source.pluginUri };
    }
    return { storage: source.storage };
}
function reviveChatModeSource(data) {
    if (!data) {
        return undefined;
    }
    if (data.storage === PromptsStorage.extension) {
        return { storage: PromptsStorage.extension, extensionId: new ExtensionIdentifier(data.extensionId), type: data.type ?? ExtensionAgentSourceType.contribution };
    }
    if (data.storage === PromptsStorage.plugin) {
        return { storage: PromptsStorage.plugin, pluginUri: URI.revive(data.pluginUri) };
    }
    if (data.storage === PromptsStorage.internal) {
        return { storage: PromptsStorage.internal };
    }
    return { storage: data.storage };
}
export class BuiltinChatMode {
    constructor(kind, label, description, icon) {
        this.kind = kind;
        this.name = constObservable(kind);
        this.label = constObservable(label);
        this.description = observableValue('description', description);
        this.icon = constObservable(icon);
        this.target = constObservable(Target.Undefined);
    }
    get isBuiltin() {
        return isBuiltinChatMode(this);
    }
    get id() {
        // Need a differentiator?
        return this.kind;
    }
    /**
     * Getters are not json-stringified
     */
    toJSON() {
        return {
            id: this.id,
            name: this.name.get(),
            description: this.description.get(),
            kind: this.kind
        };
    }
}
export var ChatMode;
(function (ChatMode) {
    ChatMode.Ask = new BuiltinChatMode(ChatModeKind.Ask, 'Ask', localize(8435, null), Codicon.question);
    ChatMode.Edit = new BuiltinChatMode(ChatModeKind.Edit, 'Edit', localize(8436, null), Codicon.edit);
    ChatMode.Agent = new BuiltinChatMode(ChatModeKind.Agent, 'Agent', localize(8437, null), Codicon.agent);
})(ChatMode || (ChatMode = {}));
export function isBuiltinChatMode(mode) {
    return mode.id === ChatMode.Ask.id ||
        mode.id === ChatMode.Edit.id ||
        mode.id === ChatMode.Agent.id;
}
/**
 * Returns a telemetry-safe mode name. User/local mode names are hashed
 * to avoid leaking PII; builtin and extension mode names are returned as-is.
 */
export function getModeNameForTelemetry(mode) {
    const modeStorage = mode.source?.storage;
    if (modeStorage === PromptsStorage.local || modeStorage === PromptsStorage.user) {
        return String(hash(mode.name.get()));
    }
    return mode.name.get();
}
/**
 * Generates a stable identifier for a handoff by combining the target agent
 * name with a slugified version of the display label.
 *
 * Within a single source agent, the combination of `agent` + `label` must be
 * unique for IDs to be unambiguous.
 *
 * @example
 * ```
 * getHandoffId({ agent: 'agent', label: 'Continue', prompt: '...' })
 * // => 'agent:continue'
 * ```
 */
export function getHandoffId(handoff) {
    const slug = handoff.label.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    return `${handoff.agent}:${slug}`;
}
/**
 * Builds an array of {@link ICustomAgentInfo} with handoff metadata for the given agents/modes.
 *
 * @param modes - The set of agents/modes to include. Pass all modes to get a
 *   complete picture, or a filtered subset to scope the result.
 * @returns One entry per agent/mode, each containing the agent's metadata and
 *   its declared handoffs.
 */
export function buildCustomAgentHandoffsInfo(modes) {
    return modes.map(mode => {
        const handoffs = mode.handOffs?.get() ?? [];
        const visibility = mode.visibility?.get();
        return {
            id: mode.id,
            name: mode.name.get(),
            isBuiltin: mode.isBuiltin,
            visibility: {
                userInvocable: visibility?.userInvocable ?? true,
                agentInvocable: visibility?.agentInvocable ?? true,
            },
            handoffs: handoffs.map(h => ({
                id: getHandoffId(h),
                label: h.label,
                agent: h.agent,
                prompt: h.prompt,
                ...(h.send !== undefined ? { send: h.send } : {}),
                ...(h.showContinueOn !== undefined ? { showContinueOn: h.showContinueOn } : {}),
                ...(h.model !== undefined ? { model: h.model } : {}),
            })),
        };
    });
}
//# sourceMappingURL=chatModes.js.map