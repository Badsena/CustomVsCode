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
import { sep } from '../../../../../base/common/path.js';
import { AsyncIterableProducer, raceCancellationError } from '../../../../../base/common/async.js';
import { CancellationToken, CancellationTokenSource } from '../../../../../base/common/cancellation.js';
import { Codicon } from '../../../../../base/common/codicons.js';
import { AsyncEmitter, Emitter, Event } from '../../../../../base/common/event.js';
import { combinedDisposable, Disposable, DisposableMap, DisposableStore, toDisposable } from '../../../../../base/common/lifecycle.js';
import { ResourceMap, ResourceSet } from '../../../../../base/common/map.js';
import { Schemas } from '../../../../../base/common/network.js';
import * as resources from '../../../../../base/common/resources.js';
import { ThemeIcon } from '../../../../../base/common/themables.js';
import { URI } from '../../../../../base/common/uri.js';
import { generateUuid } from '../../../../../base/common/uuid.js';
import { localize, localize2 } from '../../../../../nls.js';
import { Action2, IMenuService, MenuId, MenuItemAction, MenuRegistry, registerAction2 } from '../../../../../platform/actions/common/actions.js';
import { ContextKeyExpr, IContextKeyService } from '../../../../../platform/contextkey/common/contextkey.js';
import { ILabelService } from '../../../../../platform/label/common/label.js';
import { ILogService } from '../../../../../platform/log/common/log.js';
import { isDark } from '../../../../../platform/theme/common/theme.js';
import { IThemeService } from '../../../../../platform/theme/common/themeService.js';
import { IEditorService } from '../../../../services/editor/common/editorService.js';
import { IExtensionService, isProposedApiEnabled } from '../../../../services/extensions/common/extensions.js';
import { ExtensionsRegistry } from '../../../../services/extensions/common/extensionsRegistry.js';
import { ChatEditorInput } from '../widgetHosts/editor/chatEditorInput.js';
import { IChatAgentService } from '../../common/participants/chatAgents.js';
import { ChatContextKeys } from '../../common/actions/chatContextKeys.js';
import { isSessionInProgressStatus } from '../../common/chatSessionsService.js';
import { ChatAgentLocation, ChatModeKind } from '../../common/constants.js';
import { CHAT_CATEGORY } from '../actions/chatActions.js';
import { IChatService } from '../../common/chatService/chatService.js';
import { autorun, observableFromEvent } from '../../../../../base/common/observable.js';
import { renderAsPlaintext } from '../../../../../base/browser/markdownRenderer.js';
import { IViewsService } from '../../../../services/views/common/viewsService.js';
import { ChatViewId } from '../chat.js';
import { AgentSessionProviders, getAgentSessionProviderName } from '../agentSessions/agentSessions.js';
import { BugIndicatingError, isCancellationError } from '../../../../../base/common/errors.js';
import { IEditorGroupsService } from '../../../../services/editor/common/editorGroupsService.js';
import { getChatSessionType, isUntitledChatSession, LocalChatSessionUri } from '../../common/model/chatUri.js';
import { assertNever } from '../../../../../base/common/assert.js';
import { ICommandService } from '../../../../../platform/commands/common/commands.js';
import { Target } from '../../common/promptSyntax/promptTypes.js';
const extensionPoint = ExtensionsRegistry.registerExtensionPoint({
    extensionPoint: 'chatSessions',
    jsonSchema: {
        description: localize(7310, null),
        type: 'array',
        items: {
            type: 'object',
            additionalProperties: false,
            properties: {
                type: {
                    description: localize(7311, null),
                    type: 'string',
                },
                name: {
                    description: localize(7312, null),
                    type: 'string',
                    pattern: '^[\\w-]+$'
                },
                displayName: {
                    description: localize(7313, null),
                    type: 'string',
                },
                description: {
                    description: localize(7314, null),
                    type: 'string'
                },
                when: {
                    description: localize(7315, null),
                    type: 'string'
                },
                icon: {
                    description: localize(7316, null),
                    anyOf: [{
                            type: 'string'
                        },
                        {
                            type: 'object',
                            properties: {
                                light: {
                                    description: localize(7317, null),
                                    type: 'string'
                                },
                                dark: {
                                    description: localize(7318, null),
                                    type: 'string'
                                }
                            }
                        }]
                },
                order: {
                    description: localize(7319, null),
                    type: 'integer'
                },
                alternativeIds: {
                    description: localize(7320, null),
                    type: 'array',
                    items: {
                        type: 'string'
                    }
                },
                welcomeTitle: {
                    description: localize(7321, null),
                    type: 'string'
                },
                welcomeMessage: {
                    description: localize(7322, null),
                    type: 'string'
                },
                welcomeTips: {
                    description: localize(7323, null),
                    type: 'string'
                },
                inputPlaceholder: {
                    description: localize(7324, null),
                    type: 'string'
                },
                capabilities: {
                    description: localize(7325, null),
                    type: 'object',
                    additionalProperties: false,
                    properties: {
                        supportsFileAttachments: {
                            description: localize(7326, null),
                            type: 'boolean'
                        },
                        supportsToolAttachments: {
                            description: localize(7327, null),
                            type: 'boolean'
                        },
                        supportsMCPAttachments: {
                            description: localize(7328, null),
                            type: 'boolean'
                        },
                        supportsImageAttachments: {
                            description: localize(7329, null),
                            type: 'boolean'
                        },
                        supportsSearchResultAttachments: {
                            description: localize(7330, null),
                            type: 'boolean'
                        },
                        supportsInstructionAttachments: {
                            description: localize(7331, null),
                            type: 'boolean'
                        },
                        supportsSourceControlAttachments: {
                            description: localize(7332, null),
                            type: 'boolean'
                        },
                        supportsProblemAttachments: {
                            description: localize(7333, null),
                            type: 'boolean'
                        },
                        supportsSymbolAttachments: {
                            description: localize(7334, null),
                            type: 'boolean'
                        },
                        supportsPromptAttachments: {
                            description: localize(7335, null),
                            type: 'boolean'
                        },
                        supportsHandOffs: {
                            description: localize(7336, null),
                            type: 'boolean'
                        }
                    }
                },
                commands: {
                    markdownDescription: localize(7337, null),
                    type: 'array',
                    items: {
                        additionalProperties: false,
                        type: 'object',
                        defaultSnippets: [{ body: { name: '', description: '' } }],
                        required: ['name'],
                        properties: {
                            name: {
                                description: localize(7338, null),
                                type: 'string'
                            },
                            description: {
                                description: localize(7339, null),
                                type: 'string'
                            },
                            when: {
                                description: localize(7340, null),
                                type: 'string'
                            },
                        }
                    }
                },
                canDelegate: {
                    description: localize(7341, null),
                    type: 'boolean',
                    default: false
                },
                customAgentTarget: {
                    description: localize(7342, null),
                    type: 'string'
                },
                requiresCustomModels: {
                    description: localize(7343, null),
                    type: 'boolean',
                    default: false
                },
                autoAttachReferences: {
                    description: localize(7344, null),
                    type: 'boolean',
                    default: false
                }
            },
            required: ['type', 'name', 'displayName', 'description'],
        }
    },
    activationEventsGenerator: function* (contribs) {
        for (const contrib of contribs) {
            yield `onChatSession:${contrib.type}`;
        }
    }
});
class ContributedChatSessionData extends Disposable {
    getOption(optionId) {
        return this._optionsCache.get(optionId);
    }
    getAllOptions() {
        return this._optionsCache.entries();
    }
    setOption(optionId, value) {
        this._optionsCache.set(optionId, value);
    }
    constructor(session, chatSessionType, resource, options, onWillDispose) {
        super();
        this.session = session;
        this.chatSessionType = chatSessionType;
        this.resource = resource;
        this.options = options;
        this.onWillDispose = onWillDispose;
        this._optionsCache = new Map();
        if (options) {
            for (const [key, value] of Object.entries(options)) {
                this._optionsCache.set(key, value);
            }
        }
        this._register(this.session.onWillDispose(() => {
            this.onWillDispose(this.resource);
        }));
    }
}
let ChatSessionsService = class ChatSessionsService extends Disposable {
    get onDidChangeInProgress() { return this._onDidChangeInProgress.event; }
    get onDidChangeContentProviderSchemes() { return this._onDidChangeContentProviderSchemes.event; }
    get onDidChangeSessionOptions() { return this._onDidChangeSessionOptions.event; }
    get onDidChangeOptionGroups() { return this._onDidChangeOptionGroups.event; }
    get onRequestNotifyExtension() { return this._onRequestNotifyExtension.event; }
    constructor(_logService, _chatAgentService, _extensionService, _contextKeyService, _menuService, _themeService, _labelService) {
        super();
        this._logService = _logService;
        this._chatAgentService = _chatAgentService;
        this._extensionService = _extensionService;
        this._contextKeyService = _contextKeyService;
        this._menuService = _menuService;
        this._themeService = _themeService;
        this._labelService = _labelService;
        this._itemControllers = new Map();
        this._contributions = new Map();
        this._contributionDisposables = this._register(new DisposableMap());
        this._contentProviders = new Map();
        this._alternativeIdMap = new Map();
        this._contextKeys = new Set();
        this._onDidChangeItemsProviders = this._register(new Emitter());
        this.onDidChangeItemsProviders = this._onDidChangeItemsProviders.event;
        this._onDidChangeSessionItems = this._register(new Emitter());
        this.onDidChangeSessionItems = this._onDidChangeSessionItems.event;
        this._onDidChangeAvailability = this._register(new Emitter());
        this.onDidChangeAvailability = this._onDidChangeAvailability.event;
        this._onDidChangeInProgress = this._register(new Emitter());
        this._onDidChangeContentProviderSchemes = this._register(new Emitter());
        this._onDidChangeSessionOptions = this._register(new Emitter());
        this._onDidChangeOptionGroups = this._register(new Emitter());
        this._onRequestNotifyExtension = this._register(new AsyncEmitter());
        this.inProgressMap = new Map();
        this._sessionTypeOptions = new Map();
        this._sessionTypeNewSessionOptions = new Map();
        this._sessions = new ResourceMap();
        this._resourceAliases = new ResourceMap(); // real resource -> untitled resource
        this._hasCanDelegateProvidersKey = ChatContextKeys.hasCanDelegateProviders.bindTo(this._contextKeyService);
        this._register(extensionPoint.setHandler(extensions => {
            for (const ext of extensions) {
                if (!isProposedApiEnabled(ext.description, 'chatSessionsProvider')) {
                    continue;
                }
                if (!Array.isArray(ext.value)) {
                    continue;
                }
                for (const contribution of ext.value) {
                    this._register(this.registerContribution(contribution, ext.description));
                }
            }
        }));
        // Listen for context changes and re-evaluate contributions
        this._register(Event.filter(this._contextKeyService.onDidChangeContext, e => e.affectsSome(this._contextKeys))(() => {
            this._evaluateAvailability();
        }));
        const builtinSessionProviders = [AgentSessionProviders.Local];
        const contributedSessionProviders = observableFromEvent(this.onDidChangeAvailability, () => Array.from(this._contributions.keys()).filter(key => this._contributionDisposables.has(key) && isAgentSessionProviderType(key))).recomputeInitiallyAndOnChange(this._store);
        this._register(autorun(reader => {
            const activatedProviders = [...builtinSessionProviders, ...contributedSessionProviders.read(reader)];
            for (const provider of Object.values(AgentSessionProviders)) {
                if (activatedProviders.includes(provider)) {
                    reader.store.add(registerNewSessionInPlaceAction(provider, getAgentSessionProviderName(provider)));
                }
            }
        }));
        this._register(this.onDidChangeSessionItems((delta) => {
            const changedChatSessionTypes = new Set();
            for (const session of delta.addedOrUpdated ?? []) {
                changedChatSessionTypes.add(getChatSessionType(session.resource));
            }
            for (const resource of delta.removed ?? []) {
                changedChatSessionTypes.add(getChatSessionType(resource));
            }
            for (const chatSessionType of changedChatSessionTypes) {
                this.updateInProgressStatus(chatSessionType).catch(error => {
                    this._logService.warn(`Failed to update progress status for '${chatSessionType}':`, error);
                });
            }
        }));
        this._register(this._labelService.registerFormatter({
            scheme: Schemas.copilotPr,
            formatting: {
                label: '${authority}${path}',
                separator: sep,
                stripPathStartingSeparator: true,
            }
        }));
    }
    reportInProgress(chatSessionType, count) {
        let displayName;
        if (chatSessionType === AgentSessionProviders.Local) {
            displayName = localize(7345, null);
        }
        else if (chatSessionType === AgentSessionProviders.Background) {
            displayName = localize(7346, null);
        }
        else if (chatSessionType === AgentSessionProviders.Cloud) {
            displayName = localize(7347, null);
        }
        else {
            displayName = this._contributions.get(chatSessionType)?.contribution.displayName;
        }
        if (displayName) {
            this.inProgressMap.set(displayName, count);
        }
        this._onDidChangeInProgress.fire();
    }
    getInProgress() {
        return Array.from(this.inProgressMap.entries()).map(([displayName, count]) => ({ displayName, count }));
    }
    async updateInProgressStatus(chatSessionType) {
        try {
            const items = [];
            for await (const result of this.getChatSessionItems([chatSessionType], CancellationToken.None)) {
                items.push(...result.items);
            }
            const inProgress = items.filter(item => item.status && isSessionInProgressStatus(item.status));
            this.reportInProgress(chatSessionType, inProgress.length);
        }
        catch (error) {
            this._logService.warn(`Failed to update in-progress status for chat session type '${chatSessionType}':`, error);
        }
    }
    registerContribution(contribution, ext) {
        this._logService.trace(`[ChatSessionsService] registerContribution called for type='${contribution.type}', canDelegate=${contribution.canDelegate}, when='${contribution.when}', extension='${ext.identifier.value}'`);
        if (this._contributions.has(contribution.type)) {
            this._logService.trace(`[ChatSessionsService] registerContribution: type='${contribution.type}' already registered, skipping`);
            return Disposable.None;
        }
        // Track context keys from the when condition
        if (contribution.when) {
            const whenExpr = ContextKeyExpr.deserialize(contribution.when);
            if (whenExpr) {
                for (const key of whenExpr.keys()) {
                    this._contextKeys.add(key);
                }
            }
        }
        this._contributions.set(contribution.type, { contribution, extension: ext });
        // Register alternative IDs if provided
        if (contribution.alternativeIds) {
            for (const altId of contribution.alternativeIds) {
                if (this._alternativeIdMap.has(altId)) {
                    this._logService.warn(`Alternative ID '${altId}' is already mapped to '${this._alternativeIdMap.get(altId)}'. Remapping to '${contribution.type}'.`);
                }
                this._alternativeIdMap.set(altId, contribution.type);
            }
        }
        this._evaluateAvailability();
        return {
            dispose: () => {
                this._contributions.delete(contribution.type);
                // Remove alternative ID mappings
                if (contribution.alternativeIds) {
                    for (const altId of contribution.alternativeIds) {
                        if (this._alternativeIdMap.get(altId) === contribution.type) {
                            this._alternativeIdMap.delete(altId);
                        }
                    }
                }
                this._contributionDisposables.deleteAndDispose(contribution.type);
                this._updateHasCanDelegateProvidersContextKey();
            }
        };
    }
    _isContributionAvailable(contribution) {
        if (!contribution.when) {
            return true;
        }
        const whenExpr = ContextKeyExpr.deserialize(contribution.when);
        return !whenExpr || this._contextKeyService.contextMatchesRules(whenExpr);
    }
    /**
     * Resolves a session type to its primary type, checking for alternative IDs.
     * @param sessionType The session type or alternative ID to resolve
     * @returns The primary session type, or undefined if not found or not available
     */
    _resolveToPrimaryType(sessionType) {
        // Try to find the primary type first
        const contribution = this._contributions.get(sessionType)?.contribution;
        if (contribution) {
            // If the contribution is available, use it
            if (this._isContributionAvailable(contribution)) {
                return sessionType;
            }
            // If not available, fall through to check for alternatives
        }
        // Check if this is an alternative ID, or if the primary type is not available
        const primaryType = this._alternativeIdMap.get(sessionType);
        if (primaryType) {
            const altContribution = this._contributions.get(primaryType)?.contribution;
            if (altContribution && this._isContributionAvailable(altContribution)) {
                return primaryType;
            }
        }
        return undefined;
    }
    _registerMenuItems(contribution, extensionDescription) {
        // If provider registers anything for the create submenu, let it fully control the creation
        const contextKeyService = this._contextKeyService.createOverlay([
            ['chatSessionType', contribution.type]
        ]);
        const rawMenuActions = this._menuService.getMenuActions(MenuId.AgentSessionsCreateSubMenu, contextKeyService);
        const menuActions = rawMenuActions.map(value => value[1]).flat();
        const disposables = new DisposableStore();
        // Mirror all create submenu actions into the global Chat New menu
        for (let i = 0; i < menuActions.length; i++) {
            const action = menuActions[i];
            if (action instanceof MenuItemAction) {
                // TODO: This is an odd way to do this, but the best we can do currently
                if (i === 0 && !contribution.canDelegate) {
                    disposables.add(registerNewSessionExternalAction(contribution.type, contribution.displayName, action.item.id));
                }
                else {
                    disposables.add(MenuRegistry.appendMenuItem(MenuId.ChatNewMenu, {
                        command: action.item,
                        group: '4_externally_contributed',
                    }));
                }
            }
        }
        return {
            dispose: () => disposables.dispose()
        };
    }
    _registerCommands(contribution) {
        const isAvailableInSessionTypePicker = isAgentSessionProviderType(contribution.type);
        return combinedDisposable(registerAction2(class OpenChatSessionAction extends Action2 {
            constructor() {
                super({
                    id: `workbench.action.chat.openSessionWithPrompt.${contribution.type}`,
                    title: localize2(7352, "New {0} with Prompt", contribution.displayName),
                    category: CHAT_CATEGORY,
                    icon: Codicon.plus,
                    f1: false,
                    precondition: ChatContextKeys.enabled
                });
            }
            async run(accessor, chatOptions) {
                const chatService = accessor.get(IChatService);
                const { type } = contribution;
                if (chatOptions) {
                    const resource = URI.revive(chatOptions.resource);
                    const ref = await chatService.acquireOrLoadSession(resource, ChatAgentLocation.Chat, CancellationToken.None);
                    try {
                        const result = await chatService.sendRequest(resource, chatOptions.prompt, { agentIdSilent: type, attachedContext: chatOptions.attachedContext });
                        if (result.kind === 'queued') {
                            await result.deferred;
                        }
                        else if (result.kind === 'sent') {
                            await result.data.responseCompletePromise;
                        }
                    }
                    finally {
                        ref?.dispose();
                    }
                }
            }
        }), 
        // Creates a chat editor
        registerAction2(class OpenNewChatSessionEditorAction extends Action2 {
            constructor() {
                super({
                    id: `workbench.action.chat.openNewSessionEditor.${contribution.type}`,
                    title: localize2(7353, "New {0}", contribution.displayName),
                    category: CHAT_CATEGORY,
                    icon: Codicon.plus,
                    f1: true,
                    precondition: ChatContextKeys.enabled,
                });
            }
            async run(accessor, chatOptions) {
                const { type, displayName } = contribution;
                await openChatSession(accessor, { type, displayName, position: ChatSessionPosition.Editor }, chatOptions);
            }
        }), 
        // New chat in sidebar chat (+ button)
        registerAction2(class OpenNewChatSessionSidebarAction extends Action2 {
            constructor() {
                super({
                    id: `workbench.action.chat.openNewSessionSidebar.${contribution.type}`,
                    title: localize2(7354, "New {0}", contribution.displayName),
                    category: CHAT_CATEGORY,
                    icon: Codicon.plus,
                    f1: false, // Hide from Command Palette
                    precondition: ChatContextKeys.enabled,
                    menu: !isAvailableInSessionTypePicker ? {
                        id: MenuId.ChatNewMenu,
                        group: '3_new_special',
                    } : undefined,
                });
            }
            async run(accessor, chatOptions) {
                const { type, displayName } = contribution;
                await openChatSession(accessor, { type, displayName, position: ChatSessionPosition.Sidebar }, chatOptions);
            }
        }));
    }
    _evaluateAvailability() {
        const newlyEnabledChatSessionTypes = new Set();
        const newlyDisabledChatSessionTypes = new Set();
        const disposedChatSessions = new ResourceSet();
        for (const { contribution, extension } of this._contributions.values()) {
            const isCurrentlyRegistered = this._contributionDisposables.has(contribution.type);
            const shouldBeRegistered = this._isContributionAvailable(contribution);
            this._logService.trace(`[ChatSessionsService] _evaluateAvailability: type='${contribution.type}', isCurrentlyRegistered=${isCurrentlyRegistered}, shouldBeRegistered=${shouldBeRegistered}, when='${contribution.when}'`);
            if (isCurrentlyRegistered && !shouldBeRegistered) {
                // Disable the contribution by disposing its disposable store
                this._contributionDisposables.deleteAndDispose(contribution.type);
                // Also dispose any cached sessions for this contribution
                for (const sessionResource of this._disposeSessionsForContribution(contribution.type)) {
                    disposedChatSessions.add(sessionResource);
                }
                newlyDisabledChatSessionTypes.add(contribution.type);
            }
            else if (!isCurrentlyRegistered && shouldBeRegistered) {
                // Enable the contribution by registering it
                if (extension) {
                    this._enableContribution(contribution, extension);
                }
                newlyEnabledChatSessionTypes.add(contribution.type);
            }
        }
        if (newlyEnabledChatSessionTypes.size > 0 || newlyDisabledChatSessionTypes.size > 0) {
            this._onDidChangeAvailability.fire();
            for (const chatSessionType of [...newlyEnabledChatSessionTypes, ...newlyDisabledChatSessionTypes]) {
                this._onDidChangeItemsProviders.fire({ chatSessionType });
            }
            if (disposedChatSessions.size > 0) {
                this._onDidChangeSessionItems.fire({ removed: Array.from(disposedChatSessions) });
            }
        }
        this._updateHasCanDelegateProvidersContextKey();
    }
    _enableContribution(contribution, ext) {
        this._logService.trace(`[ChatSessionsService] _enableContribution: type='${contribution.type}', canDelegate=${contribution.canDelegate}`);
        const disposableStore = new DisposableStore();
        this._contributionDisposables.set(contribution.type, disposableStore);
        if (contribution.canDelegate) {
            disposableStore.add(this._registerAgent(contribution, ext));
            disposableStore.add(this._registerCommands(contribution));
        }
        disposableStore.add(this._registerMenuItems(contribution, ext));
    }
    /**
     * Disposes of all sessions that belong to a contribution
     *
     * @returns List of session resources that were disposed.
     */
    _disposeSessionsForContribution(contributionId) {
        // Find and dispose all sessions that belong to this contribution
        const sessionsToDispose = [];
        for (const [sessionResource, sessionData] of this._sessions) {
            if (sessionData.chatSessionType === contributionId) {
                sessionsToDispose.push(sessionResource);
            }
        }
        if (sessionsToDispose.length > 0) {
            this._logService.info(`Disposing ${sessionsToDispose.length} cached sessions for contribution '${contributionId}' due to when clause change`);
        }
        for (const sessionKey of sessionsToDispose) {
            const sessionData = this._sessions.get(sessionKey);
            if (sessionData) {
                sessionData.dispose(); // This will call _onWillDisposeSession and clean up
            }
        }
        return sessionsToDispose;
    }
    _registerAgent(contribution, ext) {
        const storedIcon = this.getContributionIcon(ext, contribution);
        const icons = ThemeIcon.isThemeIcon(storedIcon)
            ? { themeIcon: storedIcon, icon: undefined, iconDark: undefined }
            : storedIcon
                ? { icon: storedIcon.light, iconDark: storedIcon.dark }
                : { themeIcon: Codicon.sendToRemoteAgent };
        const id = contribution.type;
        const agentData = {
            id,
            name: contribution.name,
            fullName: contribution.displayName,
            description: contribution.description,
            isDefault: false,
            isCore: false,
            isDynamic: true,
            slashCommands: contribution.commands ?? [],
            locations: [ChatAgentLocation.Chat],
            modes: [ChatModeKind.Agent, ChatModeKind.Ask],
            disambiguation: [],
            metadata: {
                ...icons,
            },
            capabilities: contribution.capabilities,
            canAccessPreviousChatHistory: true,
            extensionId: ext.identifier,
            extensionVersion: ext.version,
            extensionDisplayName: ext.displayName || ext.name,
            extensionPublisherId: ext.publisher,
        };
        return this._chatAgentService.registerAgent(id, agentData);
    }
    getAllChatSessionContributions() {
        return Array.from(this._contributions.values())
            .filter(entry => this._isContributionAvailable(entry.contribution))
            .map(entry => this.resolveChatSessionContribution(entry.extension, entry.contribution));
    }
    _updateHasCanDelegateProvidersContextKey() {
        const hasCanDelegate = this.getAllChatSessionContributions().filter(c => c.canDelegate);
        const canDelegateEnabled = hasCanDelegate.length > 0;
        this._logService.trace(`[ChatSessionsService] hasCanDelegateProvidersAvailable=${canDelegateEnabled} (${hasCanDelegate.map(c => c.type).join(', ')})`);
        this._hasCanDelegateProvidersKey.set(canDelegateEnabled);
    }
    getChatSessionContribution(chatSessionType) {
        const entry = this._contributions.get(chatSessionType);
        if (!entry) {
            return undefined;
        }
        if (!this._isContributionAvailable(entry.contribution)) {
            return undefined;
        }
        return this.resolveChatSessionContribution(entry.extension, entry.contribution);
    }
    resolveChatSessionContribution(ext, contribution) {
        return {
            ...contribution,
            icon: this.resolveIconForCurrentColorTheme(this.getContributionIcon(ext, contribution)),
        };
    }
    getContributionIcon(ext, contribution) {
        if (!contribution.icon) {
            return undefined;
        }
        if (typeof contribution.icon === 'string') {
            return contribution.icon.startsWith('$(') && contribution.icon.endsWith(')')
                ? ThemeIcon.fromString(contribution.icon)
                : ThemeIcon.fromId(contribution.icon);
        }
        return {
            dark: ext ? resources.joinPath(ext.extensionLocation, contribution.icon.dark) : URI.parse(contribution.icon.dark),
            light: ext ? resources.joinPath(ext.extensionLocation, contribution.icon.light) : URI.parse(contribution.icon.light)
        };
    }
    resolveIconForCurrentColorTheme(rawIcon) {
        if (!rawIcon) {
            return undefined;
        }
        if (ThemeIcon.isThemeIcon(rawIcon)) {
            return rawIcon;
        }
        else if (isDark(this._themeService.getColorTheme().type)) {
            return rawIcon.dark;
        }
        else {
            return rawIcon.light;
        }
    }
    registerChatSessionContribution(contribution) {
        if (this._contributions.has(contribution.type)) {
            return { dispose: () => { } };
        }
        this._contributions.set(contribution.type, { contribution, extension: undefined });
        this._onDidChangeAvailability.fire();
        return toDisposable(() => {
            this._contributions.delete(contribution.type);
            this._onDidChangeAvailability.fire();
        });
    }
    async activateChatSessionItemProvider(chatViewType) {
        await this.doActivateChatSessionItemController(chatViewType);
    }
    async doActivateChatSessionItemController(chatViewType) {
        await this._extensionService.whenInstalledExtensionsRegistered();
        const resolvedType = this._resolveToPrimaryType(chatViewType);
        if (resolvedType) {
            chatViewType = resolvedType;
        }
        const contribution = this._contributions.get(chatViewType)?.contribution;
        if (contribution && !this._isContributionAvailable(contribution)) {
            return false;
        }
        if (this._itemControllers.has(chatViewType)) {
            return true;
        }
        await this._extensionService.activateByEvent(`onChatSession:${chatViewType}`);
        const controller = this._itemControllers.get(chatViewType);
        return !!controller;
    }
    async canResolveChatSession(sessionType) {
        await this._extensionService.whenInstalledExtensionsRegistered();
        const resolvedType = this._resolveToPrimaryType(sessionType) || sessionType;
        const contribution = this._contributions.get(resolvedType)?.contribution;
        if (contribution && !this._isContributionAvailable(contribution)) {
            return false;
        }
        if (this._contentProviders.has(sessionType)) {
            return true;
        }
        await this._extensionService.activateByEvent(`onChatSession:${sessionType}`);
        return this._contentProviders.has(sessionType);
    }
    async tryActivateControllers(providersToResolve) {
        await Promise.all(this.getAllChatSessionContributions().map(async (contrib) => {
            if (providersToResolve && !providersToResolve.includes(contrib.type)) {
                return; // skip: not considered for resolving
            }
            if (!await this.doActivateChatSessionItemController(contrib.type)) {
                // We requested this provider but it is not available
                if (providersToResolve?.includes(contrib.type)) {
                    this._logService.trace(`[ChatSessionsService] No enabled provider found for chat session type ${contrib.type}`);
                }
            }
        }));
    }
    getChatSessionItems(providersToResolve, token) {
        return new AsyncIterableProducer(async (writer) => {
            // First, make sure contributed controller are active
            await raceCancellationError(this.tryActivateControllers(providersToResolve), token);
            // Then actually resolve items for all active controllers
            await Promise.all(Array.from(this._itemControllers, async ([chatSessionType, controllerEntry]) => {
                const resolvedType = this._resolveToPrimaryType(chatSessionType) ?? chatSessionType;
                if (providersToResolve && !providersToResolve.includes(resolvedType)) {
                    return; // skip: not considered for resolving
                }
                try {
                    await raceCancellationError(controllerEntry.initialRefresh, token); // Ensure initial refresh is complete before accessing items
                    const providerSessions = controllerEntry.controller.items;
                    this._logService.trace(`[ChatSessionsService] Resolved ${providerSessions.length} sessions for provider ${resolvedType}`);
                    writer.emitOne({ chatSessionType: resolvedType, items: providerSessions });
                }
                catch (err) {
                    if (!isCancellationError(err)) {
                        // Log error but continue with other providers
                        this._logService.error(`[ChatSessionsService] Failed to resolve sessions for provider ${resolvedType}`, err);
                    }
                }
            }));
        });
    }
    async refreshChatSessionItems(providersToResolve, token) {
        await this.tryActivateControllers(providersToResolve);
        await Promise.all(Array.from(this._itemControllers).map(async ([chatSessionType, controllerEntry]) => {
            const resolvedType = this._resolveToPrimaryType(chatSessionType) ?? chatSessionType;
            if (providersToResolve && !providersToResolve.includes(resolvedType)) {
                return; // skip: not considered for resolving
            }
            try {
                await controllerEntry.controller.refresh(token);
            }
            catch (err) {
                if (!isCancellationError(err)) {
                    // Log error but continue with other providers
                    this._logService.error(`[ChatSessionsService] Failed to resolve sessions for provider ${resolvedType}`, err);
                }
            }
        }));
    }
    getRegisteredChatSessionItemProviders() {
        return [...new Set(Array.from(this._itemControllers.keys()).map(key => this._resolveToPrimaryType(key) ?? key))];
    }
    registerChatSessionItemController(chatSessionType, controller) {
        const disposables = new DisposableStore();
        // Register and trigger an initial refresh to populate the provider's items
        const initialRefreshCts = disposables.add(new CancellationTokenSource());
        this._itemControllers.set(chatSessionType, { controller, initialRefresh: controller.refresh(initialRefreshCts.token) });
        this._onDidChangeItemsProviders.fire({ chatSessionType });
        disposables.add(controller.onDidChangeChatSessionItems(e => {
            this._onDidChangeSessionItems.fire(e);
        }));
        this.updateInProgressStatus(chatSessionType).catch(error => {
            this._logService.warn(`Failed to update initial progress status for '${chatSessionType}':`, error);
        });
        return {
            dispose: () => {
                initialRefreshCts.cancel();
                disposables.dispose();
                const controller = this._itemControllers.get(chatSessionType);
                if (controller) {
                    this._itemControllers.delete(chatSessionType);
                    this._onDidChangeItemsProviders.fire({ chatSessionType });
                }
            }
        };
    }
    registerChatSessionContentProvider(chatSessionType, provider) {
        if (this._contentProviders.has(chatSessionType)) {
            throw new Error(`Content provider for ${chatSessionType} is already registered.`);
        }
        this._contentProviders.set(chatSessionType, provider);
        this._onDidChangeContentProviderSchemes.fire({ added: [chatSessionType], removed: [] });
        return {
            dispose: () => {
                this._contentProviders.delete(chatSessionType);
                this._onDidChangeContentProviderSchemes.fire({ added: [], removed: [chatSessionType] });
                // Remove all sessions that were created by this provider
                for (const [key, session] of this._sessions) {
                    if (session.chatSessionType === chatSessionType) {
                        session.dispose();
                        this._sessions.delete(key);
                    }
                }
            }
        };
    }
    getInProgressSessionDescription(chatModel) {
        const requests = chatModel.getRequests();
        if (requests.length === 0) {
            return undefined;
        }
        // Get the last request to check its response status
        const lastRequest = requests.at(-1);
        const response = lastRequest?.response;
        if (!response) {
            return undefined;
        }
        // If the response is complete, show Finished
        if (response.isComplete) {
            return undefined;
        }
        // Get the response parts to find tool invocations and progress messages
        const responseParts = response.response.value;
        let description = '';
        for (let i = responseParts.length - 1; i >= 0; i--) {
            const part = responseParts[i];
            if (description) {
                break;
            }
            if (part.kind === 'confirmation' && typeof part.message === 'string') {
                description = part.message;
            }
            else if (part.kind === 'toolInvocation') {
                const toolInvocation = part;
                const state = toolInvocation.state.get();
                description = toolInvocation.generatedTitle || toolInvocation.pastTenseMessage || toolInvocation.invocationMessage;
                if (state.type === 1 /* IChatToolInvocation.StateKind.WaitingForConfirmation */) {
                    const confirmationTitle = state.confirmationMessages?.title;
                    const titleMessage = confirmationTitle && (typeof confirmationTitle === 'string'
                        ? confirmationTitle
                        : confirmationTitle.value);
                    const descriptionValue = typeof description === 'string' ? description : description.value;
                    description = titleMessage ?? localize(7348, null, descriptionValue);
                }
            }
            else if (part.kind === 'toolInvocationSerialized') {
                description = part.invocationMessage;
            }
            else if (part.kind === 'progressMessage') {
                description = part.content;
            }
            else if (part.kind === 'thinking') {
                description = localize(7349, null);
            }
        }
        return description ? renderAsPlaintext(description, { useLinkFormatter: true }) : '';
    }
    async createNewChatSessionItem(chatSessionType, request, token) {
        const controllerData = this._itemControllers.get(chatSessionType);
        if (!controllerData) {
            return undefined;
        }
        await controllerData.initialRefresh;
        return controllerData.controller.newChatSessionItem?.(request, token);
    }
    async getOrCreateChatSession(sessionResource, token) {
        {
            const existingSessionData = this._sessions.get(sessionResource);
            if (existingSessionData) {
                return existingSessionData.session;
            }
        }
        if (!(await raceCancellationError(this.canResolveChatSession(sessionResource.scheme), token))) {
            throw Error(`Can not find provider for ${sessionResource}`);
        }
        // Check again after async provider resolution
        {
            const existingSessionData = this._sessions.get(sessionResource);
            if (existingSessionData) {
                return existingSessionData.session;
            }
        }
        const resolvedType = this._resolveToPrimaryType(sessionResource.scheme) || sessionResource.scheme;
        const provider = this._contentProviders.get(resolvedType);
        if (!provider) {
            throw Error(`Can not find provider for ${sessionResource}`);
        }
        let session;
        const newSessionOptions = this.getNewSessionOptionsForSessionType(resolvedType);
        if (isUntitledChatSession(sessionResource) && newSessionOptions) {
            session = {
                sessionResource: sessionResource,
                onWillDispose: Event.None,
                history: [],
                options: newSessionOptions ?? {},
                dispose: () => { }
            };
        }
        else {
            session = await raceCancellationError(provider.provideChatSessionContent(sessionResource, token), token);
        }
        for (const [optionId, value] of Object.entries(session.options ?? {})) {
            this.setSessionOption(sessionResource, optionId, value);
        }
        // Make sure another session wasn't created while we were awaiting the provider
        {
            const existingSessionData = this._sessions.get(sessionResource);
            if (existingSessionData) {
                session.dispose();
                return existingSessionData.session;
            }
        }
        const sessionData = new ContributedChatSessionData(session, sessionResource.scheme, sessionResource, session.options, resource => {
            sessionData.dispose();
            this._sessions.delete(resource);
        });
        this._sessions.set(sessionResource, sessionData);
        // Make sure any listeners are aware of the new session and its options
        this._onDidChangeSessionOptions.fire(sessionResource);
        return session;
    }
    hasAnySessionOptions(sessionResource) {
        const session = this._sessions.get(this._resolveResource(sessionResource));
        return !!session && !!session.options && Object.keys(session.options).length > 0;
    }
    getSessionOptions(sessionResource) {
        const session = this._sessions.get(this._resolveResource(sessionResource));
        if (!session) {
            return undefined;
        }
        const result = new Map();
        for (const [key, value] of session.getAllOptions()) {
            result.set(key, typeof value === 'string' ? value : value.id);
        }
        return result.size > 0 ? result : undefined;
    }
    getSessionOption(sessionResource, optionId) {
        const session = this._sessions.get(this._resolveResource(sessionResource));
        return session?.getOption(optionId);
    }
    setSessionOption(sessionResource, optionId, value) {
        const session = this._sessions.get(this._resolveResource(sessionResource));
        return !!session?.setOption(optionId, value);
    }
    /**
     * Resolve a resource through the alias map. If the resource is a real
     * resource that has been aliased to an untitled resource, return the
     * untitled resource (the canonical key in {@link _sessions}).
     */
    _resolveResource(resource) {
        return this._resourceAliases.get(resource) ?? resource;
    }
    registerSessionResourceAlias(untitledResource, realResource) {
        this._resourceAliases.set(realResource, untitledResource);
    }
    /**
     * Store option groups for a session type
     */
    setOptionGroupsForSessionType(chatSessionType, handle, optionGroups) {
        if (optionGroups) {
            this._sessionTypeOptions.set(chatSessionType, optionGroups);
        }
        else {
            this._sessionTypeOptions.delete(chatSessionType);
        }
        this._onDidChangeOptionGroups.fire(chatSessionType);
    }
    /**
     * Get available option groups for a session type
     */
    getOptionGroupsForSessionType(chatSessionType) {
        return this._sessionTypeOptions.get(chatSessionType);
    }
    getNewSessionOptionsForSessionType(chatSessionType) {
        return this._sessionTypeNewSessionOptions.get(chatSessionType);
    }
    setNewSessionOptionsForSessionType(chatSessionType, options) {
        this._sessionTypeNewSessionOptions.set(chatSessionType, options);
    }
    /**
     * Notify extension about option changes for a session
     */
    async notifySessionOptionsChange(sessionResource, updates) {
        if (!updates.length) {
            return;
        }
        this._logService.trace(`[ChatSessionsService] notifySessionOptionsChange: starting for ${sessionResource}, ${updates.length} update(s): [${updates.map(u => u.optionId).join(', ')}]`);
        // Fire event to notify MainThreadChatSessions (which forwards to extension host)
        // Uses fireAsync to properly await async listener work via waitUntil pattern
        await this._onRequestNotifyExtension.fireAsync({ sessionResource, updates }, CancellationToken.None);
        this._logService.trace(`[ChatSessionsService] notifySessionOptionsChange: fireAsync completed for ${sessionResource}`);
        for (const u of updates) {
            this.setSessionOption(sessionResource, u.optionId, u.value);
        }
        this._onDidChangeSessionOptions.fire(this._resolveResource(sessionResource));
        this._logService.trace(`[ChatSessionsService] notifySessionOptionsChange: finished for ${sessionResource}`);
    }
    /**
     * Get the capabilities for a specific session type
     */
    getCapabilitiesForSessionType(chatSessionType) {
        const contribution = this._contributions.get(chatSessionType)?.contribution;
        return contribution?.capabilities;
    }
    /**
     * Get the customAgentTarget for a specific session type.
     * When set, the mode picker should show filtered custom agents matching this target.
     */
    getCustomAgentTargetForSessionType(chatSessionType) {
        const contribution = this._contributions.get(chatSessionType)?.contribution;
        return contribution?.customAgentTarget ?? Target.Undefined;
    }
    requiresCustomModelsForSessionType(chatSessionType) {
        const contribution = this._contributions.get(chatSessionType)?.contribution;
        return !!contribution?.requiresCustomModels;
    }
    supportsDelegationForSessionType(chatSessionType) {
        const contribution = this._contributions.get(chatSessionType)?.contribution;
        return contribution?.supportsDelegation !== false;
    }
    sessionSupportsFork(sessionResource) {
        const resolved = this._resolveResource(sessionResource);
        const session = this._sessions.get(resolved);
        return !!session?.session.forkSession;
    }
    async forkChatSession(sessionResource, request, token) {
        const session = this._sessions.get(this._resolveResource(sessionResource));
        if (!session?.session.forkSession) {
            throw new Error(`Session ${sessionResource.toString()} does not support forking`);
        }
        return session.session.forkSession(request, token);
    }
    getContentProviderSchemes() {
        return Array.from(this._contentProviders.keys());
    }
};
ChatSessionsService = __decorate([
    __param(0, ILogService),
    __param(1, IChatAgentService),
    __param(2, IExtensionService),
    __param(3, IContextKeyService),
    __param(4, IMenuService),
    __param(5, IThemeService),
    __param(6, ILabelService)
], ChatSessionsService);
export { ChatSessionsService };
// registerSingleton(IChatSessionsService, ChatSessionsServiceStub as any, InstantiationType.Delayed);
function registerNewSessionInPlaceAction(type, displayName) {
    return registerAction2(class NewChatSessionInPlaceAction extends Action2 {
        constructor() {
            super({
                id: `workbench.action.chat.openNewChatSessionInPlace.${type}`,
                title: localize2(7355, "New {0}", displayName),
                category: CHAT_CATEGORY,
                f1: false,
                precondition: ChatContextKeys.enabled,
            });
        }
        // Expected args: [chatSessionPosition: 'sidebar' | 'editor']
        async run(accessor, ...args) {
            if (args.length === 0) {
                throw new BugIndicatingError('Expected chat session position argument');
            }
            const chatSessionPosition = args[0];
            if (chatSessionPosition !== ChatSessionPosition.Sidebar && chatSessionPosition !== ChatSessionPosition.Editor) {
                throw new BugIndicatingError(`Invalid chat session position argument: ${chatSessionPosition}`);
            }
            await openChatSession(accessor, { type: type, displayName: localize(7350, null), position: chatSessionPosition, replaceEditor: true });
        }
    });
}
function registerNewSessionExternalAction(type, displayName, commandId) {
    return registerAction2(class NewChatSessionExternalAction extends Action2 {
        constructor() {
            super({
                id: `workbench.action.chat.openNewChatSessionExternal.${type}`,
                title: localize2(7356, "New {0}", displayName),
                category: CHAT_CATEGORY,
                f1: false,
                precondition: ChatContextKeys.enabled,
            });
        }
        async run(accessor) {
            const commandService = accessor.get(ICommandService);
            await commandService.executeCommand(commandId);
        }
    });
}
export var ChatSessionPosition;
(function (ChatSessionPosition) {
    ChatSessionPosition["Editor"] = "editor";
    ChatSessionPosition["Sidebar"] = "sidebar";
})(ChatSessionPosition || (ChatSessionPosition = {}));
async function openChatSession(accessor, openOptions, chatSendOptions) {
    const viewsService = accessor.get(IViewsService);
    const chatService = accessor.get(IChatService);
    const logService = accessor.get(ILogService);
    const editorGroupService = accessor.get(IEditorGroupsService);
    const editorService = accessor.get(IEditorService);
    // Determine resource to open
    const resource = getResourceForNewChatSession(openOptions);
    // Open chat session
    try {
        switch (openOptions.position) {
            case ChatSessionPosition.Sidebar: {
                const view = await viewsService.openView(ChatViewId);
                if (openOptions.type === AgentSessionProviders.Local) {
                    await view.widget.clear();
                }
                else {
                    await view.loadSession(resource);
                }
                view.focus();
                break;
            }
            case ChatSessionPosition.Editor: {
                const options = {
                    override: ChatEditorInput.EditorID,
                    pinned: true,
                    title: {
                        fallback: localize(7351, null, openOptions.displayName),
                    }
                };
                if (openOptions.replaceEditor) {
                    // TODO: Do not rely on active editor
                    const activeEditor = editorGroupService.activeGroup.activeEditor;
                    if (!activeEditor || !(activeEditor instanceof ChatEditorInput)) {
                        throw new Error('No active chat editor to replace');
                    }
                    await editorService.replaceEditors([{ editor: activeEditor, replacement: { resource, options } }], editorGroupService.activeGroup);
                }
                else {
                    await editorService.openEditor({ resource, options });
                }
                break;
            }
            default: assertNever(openOptions.position, `Unknown chat session position: ${openOptions.position}`);
        }
    }
    catch (e) {
        logService.error(`Failed to open '${openOptions.type}' chat session with openOptions: ${JSON.stringify(openOptions)}`, e);
        return;
    }
    // Send initial prompt if provided
    if (chatSendOptions) {
        try {
            // Set initial session options on the model before sending the request,
            // so that the contributed session provider can read them.
            if (chatSendOptions.initialSessionOptions) {
                const model = chatService.getSession(resource);
                if (model?.contributedChatSession) {
                    model.setContributedChatSession({
                        ...model.contributedChatSession,
                        initialSessionOptions: chatSendOptions.initialSessionOptions,
                    });
                }
            }
            await chatService.sendRequest(resource, chatSendOptions.prompt, { agentIdSilent: openOptions.type, attachedContext: chatSendOptions.attachedContext });
        }
        catch (e) {
            logService.error(`Failed to send initial request to '${openOptions.type}' chat session with contextOptions: ${JSON.stringify(chatSendOptions)}`, e);
        }
    }
}
export function getResourceForNewChatSession(options) {
    const isRemoteSession = options.type !== AgentSessionProviders.Local;
    if (isRemoteSession) {
        return URI.from({
            scheme: options.type,
            path: `/untitled-${generateUuid()}`,
        });
    }
    const isEditorPosition = options.position === ChatSessionPosition.Editor;
    if (isEditorPosition) {
        return ChatEditorInput.getNewEditorUri();
    }
    return LocalChatSessionUri.getNewSessionUri();
}
function isAgentSessionProviderType(type) {
    return Object.values(AgentSessionProviders).includes(type);
}
//# sourceMappingURL=chatSessions.contribution.js.map