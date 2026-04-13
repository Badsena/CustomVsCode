/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { registerSingleton } from '../../platform/instantiation/common/extensions.js';
import { IChatAgentService, IChatAgentNameService } from '../contrib/chat/common/participants/chatAgents.js';
import { IChatService } from '../contrib/chat/common/chatService/chatService.js';
import { IChatEditingService } from '../contrib/chat/common/editing/chatEditingService.js';
import { IChatVariablesService } from '../contrib/chat/common/attachments/chatVariables.js';
import { ILanguageModelsService } from '../contrib/chat/common/languageModels.js';
import { IChatWidgetService } from '../contrib/chat/browser/chat.js';
import { IInlineChatSessionService } from '../contrib/inlineChat/browser/inlineChatSessionService.js';
import { IChatContextPickService } from '../contrib/chat/browser/attachments/chatContextPickService.js';
import { IPluginInstallService } from '../contrib/chat/common/plugins/pluginInstallService.js';
import { ILanguageModelToolsService } from '../contrib/chat/common/tools/languageModelToolsService.js';
import { ILanguageModelToolsConfirmationService } from '../contrib/chat/common/tools/languageModelToolsConfirmationService.js';
import { IChatSessionsService } from '../contrib/chat/common/chatSessionsService.js';
import { IPromptsService } from '../contrib/chat/common/promptSyntax/service/promptsService.js';
import { ICodeMapperService } from '../contrib/chat/common/editing/chatCodeMapperService.js';
import { ITerminalChatService } from '../contrib/terminal/browser/terminal.js';
import { ILanguageModelStatsService } from '../contrib/chat/common/languageModelStats.js';
import { Event, Emitter } from '../../base/common/event.js';
import { Disposable } from '../../base/common/lifecycle.js';
import { URI } from '../../base/common/uri.js';
import { observableValue } from '../../base/common/observable.js';
import { ResourceSet } from '../../base/common/map.js';
// ---- CHAT AGENT ----
class NullChatAgentService {
    constructor() {
        this.onDidChangeAgents = Event.None;
        this.onDidRegisterAgent = Event.None;
        this.onDidUnregisterAgent = Event.None;
        this.onDidChangeAgentHistory = Event.None;
        this.hasToolsAgent = false;
    }
    registerAgent(id, data) { return Disposable.None; }
    registerAgentMetadata(id, metadata) { return Disposable.None; }
    registerDynamicAgent(data, agent) { return Disposable.None; }
    registerAgentHistory(agentId, history) { }
    getAgents() { return []; }
    getAgent(id) { return undefined; }
    getAgentByFullyQualifiedId(id) { return undefined; }
    getActivatedAgents() { return []; }
    getSecondaryAgent() { return undefined; }
    updateAgent(id, metadata) { }
    getDefaultAgent(location) { return undefined; }
    getContributedDefaultAgent(location) { return undefined; }
    getAgentByLocation(location) { return undefined; }
    getAgentsByName(name) { return []; }
    hasAgent(id) { return false; }
    getAgentHistory(id) { return []; }
    clearAgentHistory(id) { }
    invokeAgent(id, request, progress, history, token) { return Promise.resolve({}); }
    setYieldRequested(agentId, requestId, yieldRequested) { }
    getFollowups(agentId, request, result, history, token) { return Promise.resolve([]); }
    getChatTitle(agentId, history, token) { return Promise.resolve(undefined); }
    getChatSummary(agentId, history, token) { return Promise.resolve(undefined); }
    agentHasDupeName(agentId) { return false; }
    registerAgentImplementation(id, implementation) { return Disposable.None; }
    registerAgentCompletionProvider(id, provider) { return Disposable.None; }
    getAgentCompletionItems(id, location, token) { return Promise.resolve([]); }
    registerChatParticipantDetectionProvider(handle, provider) { return Disposable.None; }
    detectAgentOrCommand(request, history, options, token) { return Promise.resolve(undefined); }
    hasChatParticipantDetectionProviders() { return false; }
    setRequestTools(agent, requestId, tools) { }
}
// ---- CHAT SERVICE ----
class NullChatService {
    constructor() {
        this.transferredSessionResource = undefined;
        this.onDidSubmitRequest = Event.None;
        this.onDidCreateModel = Event.None;
        this.chatModels = observableValue(this, []);
        this.editingSessions = [];
        this.onDidPerformUserAction = Event.None;
        this.onDidReceiveQuestionCarouselAnswer = Event.None;
        this.onDidDisposeSession = Event.None;
        this.requestInProgressObs = observableValue(this, false);
    }
    isEnabled(location) { return false; }
    hasSessions() { return false; }
    startNewLocalSession(location, options) { throw new Error('Not implemented'); }
    getSession(sessionResource) { return undefined; }
    acquireExistingSession(sessionResource) { return undefined; }
    acquireOrLoadSession(sessionResource, location, token) { throw new Error('Not implemented'); }
    loadSessionFromData(data) { throw new Error('Not implemented'); }
    getChatSessionFromInternalUri(sessionResource) { return undefined; }
    sendRequest(sessionResource, message, options) { throw new Error('Not implemented'); }
    getSessionTitle(sessionResource) { return undefined; }
    setSessionTitle(sessionResource, title) { }
    appendProgress(request, progress) { }
    resendRequest(request, options) { return Promise.resolve(); }
    adoptRequest(sessionResource, request) { return Promise.resolve(); }
    removeRequest(sessionResource, requestId) { return Promise.resolve(); }
    cancelCurrentRequestForSession(sessionResource, source) { return Promise.resolve(); }
    migrateRequests(originalResource, targetResource) { }
    setYieldRequested(sessionResource) { }
    removePendingRequest(sessionResource, requestId) { }
    setPendingRequests(sessionResource, requests) { }
    processPendingRequests(sessionResource) { }
    addCompleteRequest(sessionResource, message, variableData, attempt, response) { }
    setChatSessionTitle(sessionResource, title) { }
    getLocalSessionHistory() { return Promise.resolve([]); }
    clearAllHistoryEntries() { return Promise.resolve(); }
    removeHistoryEntry(sessionResource) { return Promise.resolve(); }
    getChatStorageFolder() { throw new Error('Not implemented'); }
    logChatIndex() { }
    getLiveSessionItems() { return Promise.resolve([]); }
    getHistorySessionItems() { return Promise.resolve([]); }
    getMetadataForSession(sessionResource) { return Promise.resolve(undefined); }
    notifyUserAction(event) { }
    notifyQuestionCarouselAnswer(requestId, resolveId, answers) { }
    transferChatSession(transferredSessionResource, toWorkspace) { return Promise.resolve(); }
    activateDefaultAgent(location) { return Promise.resolve(); }
    registerChatModelChangeListeners(chatSessionType, onChange) { return Disposable.None; }
    setSaveModelsEnabled(enabled) { }
    waitForModelDisposals() { return Promise.resolve(); }
}
// ---- CHAT AGENT NAME ----
class NullChatAgentNameService {
    getAgentNameRestriction(chatAgentData) { return true; }
}
// ---- LANGUAGE MODELS ----
class NullLanguageModelsService {
    constructor() {
        this.onDidChangeLanguageModelVendors = Event.None;
        this.onDidChangeLanguageModels = Event.None;
        this.onDidChangeModelsControlManifest = Event.None;
        this.restrictedChatParticipants = observableValue(this, {});
    }
    updateModelPickerPreference(modelIdentifier, showInModelPicker) { }
    getLanguageModelIds() { return []; }
    getVendors() { return []; }
    lookupLanguageModel(modelId) { return undefined; }
    lookupLanguageModelByQualifiedName(qualifiedName) { return undefined; }
    getLanguageModelGroups(vendor) { return []; }
    selectLanguageModels(selector) { return Promise.resolve([]); }
    registerLanguageModelProvider(vendor, provider) { return Disposable.None; }
    deltaLanguageModelChatProviderDescriptors(added, removed) { }
    sendChatRequest(modelId, from, messages, options, token) { throw new Error('Not implemented'); }
    computeTokenLength(modelId, message, token) { return Promise.resolve(0); }
    getModelConfiguration(modelId) { return undefined; }
    setModelConfiguration(modelId, values) { return Promise.resolve(); }
    getModelConfigurationActions(modelId) { return []; }
    addLanguageModelsProviderGroup(name, vendorId, configuration) { return Promise.resolve(); }
    removeLanguageModelsProviderGroup(vendorId, providerGroupName) { return Promise.resolve(); }
    configureLanguageModelsProviderGroup(vendorId, name) { return Promise.resolve(); }
    configureModel(modelId) { return Promise.resolve(); }
    migrateLanguageModelsProviderGroup(languageModelsProviderGroup) { return Promise.resolve(); }
    getRecentlyUsedModelIds() { return []; }
    addToRecentlyUsedList(modelIdentifier) { }
    clearRecentlyUsedList() { }
    getModelsControlManifest() { return { free: {}, paid: {} }; }
}
// ---- CHAT VARIABLES ----
class NullChatVariablesService {
    getDynamicVariables(sessionResource) { return []; }
    getSelectedToolAndToolSets(sessionResource) { return new Map(); }
}
// ---- CHAT WIDGET ----
class NullChatWidgetService {
    constructor() {
        this.onDidRegisterWidget = Event.None;
        this.onDidUnregisterWidget = Event.None;
        this.onDidAddWidget = Event.None;
        this.onDidBackgroundSession = Event.None;
        this.onDidChangeFocusedWidget = Event.None;
        this.onDidChangeFocusedSession = Event.None;
        this.lastFocusedWidget = undefined;
    }
    registerWidget(widget) { return Disposable.None; }
    getWidgetByInputUri(uri) { return undefined; }
    getWidgetBySessionId(sessionId) { return undefined; }
    getWidgetBySessionResource(sessionResource) { return undefined; }
    getWidgetsByLocations(location) { return []; }
    getAllWidgets() { return []; }
    reveal(widget, preserveFocus) { return Promise.resolve(false); }
    revealWidget(preserveFocus) { return Promise.resolve(undefined); }
    openSession(sessionResource, target, options) { return Promise.resolve(undefined); }
    register(newWidget) { return Disposable.None; }
}
// ---- INLINE CHAT SESSION ----
class NullInlineChatSessionService {
    constructor() {
        this.onWillStartSession = Event.None;
        this.onDidEndSession = Event.None;
        this.onDidMoveSession = Event.None;
        this.onDidChangeSessions = new Emitter().event;
    }
    dispose() { }
    registerSession(editor, session) { }
    getSession(editor, uri) { return undefined; }
    releaseSession(session) { }
    getAllSessions() { return []; }
    createSession(...args) { return undefined; }
    getSessionByTextModel(...args) { return undefined; }
    getSessionBySessionUri(...args) { return undefined; }
}
// ---- CONTEXT PICK ----
class NullContextPickService {
    constructor() {
        this.items = [];
    }
    registerChatContextItem(item) { return Disposable.None; }
}
// ---- CHAT EDITING ----
class NullChatEditingService {
    constructor() {
        this.onDidCreateEditingSession = Event.None;
        this.onDidDisposeEditingSession = Event.None;
        this.editingSessionsObs = observableValue(this, []);
    }
    startOrContinueGlobalEditingSession(chatModel) { throw new Error('Not implemented'); }
    getEditingSession(chatSessionResource) { return undefined; }
    createEditingSession(chatModel) { throw new Error('Not implemented'); }
    transferEditingSession(chatModel, session) { throw new Error('Not implemented'); }
}
// ---- PLUGIN INSTALL ----
class NullPluginInstallService {
    async installPlugin(plugin) { }
    async installPluginFromSource(source) { }
    validatePluginSource(source) { return undefined; }
    async installPluginFromValidatedSource(source) { return { success: true }; }
    async updatePlugin(plugin) { return true; }
    async updateAllPlugins(options, token) { return { updatedNames: [], failedNames: [] }; }
    getPluginInstallUri(plugin) { return URI.file('/'); }
}
// ---- LANGUAGE MODEL TOOLS ----
class NullLanguageModelToolsService {
    constructor() {
        this.onDidChangeTools = Event.None;
        // Legacy or fork methods
        this.toolSets = observableValue(this, []);
        this.onDidPrepareToolCallBecomeUnresponsive = Event.None;
        this.onDidInvokeTool = Event.None;
    }
    getTools() { return []; }
    getTool(id) { return undefined; }
    registerTool(data) { return Disposable.None; }
    async invokeTool(invocation, countTokens, token) {
        return { content: [] };
    }
    getAllToolsIncludingDisabled() { return []; }
    observeTools(model) { return observableValue(this, []); }
}
class NullLanguageModelStatsService {
    async update(model, extensionId, agent, tokenCount) { }
}
// ---- LANGUAGE MODEL TOOLS CONFIRMATION ----
class NullLanguageModelToolsConfirmationService {
    getPreConfirmAction(ref) { return undefined; }
    getPostConfirmAction(ref) { return undefined; }
    getPreConfirmActions(ref) { return []; }
    getPostConfirmActions(ref) { return []; }
    manageConfirmationPreferences(tools, options) { }
    registerConfirmationContribution(toolName, contribution) { return Disposable.None; }
    toolCanManageConfirmation(tool) { return false; }
    resetToolAutoConfirmation() { }
    confirmToolInvocation(toolId, parameters, token) { return Promise.resolve(true); }
}
// ---- CHAT SESSIONS ----
export class NullChatSessionsService {
    constructor() {
        this.onDidChangeItemsProviders = Event.None;
        this.onDidChangeSessionItems = Event.None;
        this.onDidChangeAvailability = Event.None;
        this.onDidChangeInProgress = Event.None;
        this.onDidChangeContentProviderSchemes = Event.None;
        this.onDidChangeSessionOptions = Event.None;
        this.onDidChangeOptionGroups = Event.None;
        this.onRequestNotifyExtension = Event.None;
    }
    getChatSessionContribution(chatSessionType) { return undefined; }
    getAllChatSessionContributions() { return []; }
    registerChatSessionContribution(contribution) { return Disposable.None; }
    registerChatSessionItemController(chatSessionType, controller) { return Disposable.None; }
    getRegisteredChatSessionItemProviders() { return []; }
    activateChatSessionItemProvider(chatSessionType) { return Promise.resolve(); }
    getChatSessionItems(providerTypeFilter, token) { return (async function* () { })(); }
    refreshChatSessionItems(providerTypeFilter, token) { return Promise.resolve(); }
    reportInProgress(chatSessionType, count) { }
    getInProgress() { return []; }
    getContentProviderSchemes() { return []; }
    registerChatSessionContentProvider(scheme, provider) { return Disposable.None; }
    canResolveChatSession(sessionType) { return Promise.resolve(false); }
    getOrCreateChatSession(sessionResource, token) { throw new Error('Not implemented'); }
    hasAnySessionOptions(sessionResource) { return false; }
    getSessionOptions(sessionResource) { return undefined; }
    getSessionOption(sessionResource, optionId) { return undefined; }
    setSessionOption(sessionResource, optionId, value) { return false; }
    getCapabilitiesForSessionType(chatSessionType) { return undefined; }
    getCustomAgentTargetForSessionType(chatSessionType) { return undefined; }
    requiresCustomModelsForSessionType(chatSessionType) { return false; }
    supportsDelegationForSessionType(chatSessionType) { return true; }
    sessionSupportsFork(sessionResource) { return false; }
    forkChatSession(sessionResource, request, token) { throw new Error('Not implemented'); }
    getOptionGroupsForSessionType(chatSessionType) { return undefined; }
    setOptionGroupsForSessionType(chatSessionType, handle, optionGroups) { }
    getNewSessionOptionsForSessionType(chatSessionType) { return undefined; }
    setNewSessionOptionsForSessionType(chatSessionType, options) { }
    notifySessionOptionsChange(sessionResource, updates) { return Promise.resolve(); }
    getInProgressSessionDescription(chatModel) { return undefined; }
    createNewChatSessionItem(chatSessionType, request, token) { return Promise.resolve(undefined); }
    registerSessionResourceAlias(untitledResource, realResource) { }
}
// ---- PROMPTS SERVICE ----
class NullPromptsService {
    constructor() {
        this.onDidChangeSlashCommands = Event.None;
        this.onDidChangeCustomAgents = Event.None;
        this.onDidChangeInstructions = Event.None;
        this.onDidChangeSkills = Event.None;
        this.onDidLogDiscovery = Event.None;
    }
    dispose() { }
    getParsedPromptFile(textModel) { return {}; }
    async listPromptFiles(type, token) { return []; }
    async listPromptFilesForStorage(type, storage, token) { return []; }
    async getSourceFolders(type) { return []; }
    async getResolvedSourceFolders(type) { return []; }
    isValidSlashCommandName(name) { return false; }
    async resolvePromptSlashCommand(command, token) { return undefined; }
    async getPromptSlashCommands(token, sessionResource) { return []; }
    async getPromptSlashCommandName(uri, token) { return ''; }
    async getCustomAgents(token, sessionResource) { return []; }
    async parseNew(uri, token) { return {}; }
    registerContributedFile(type, uri, extension, name, description, when) { return Disposable.None; }
    getPromptLocationLabel(promptPath) { return ''; }
    async listNestedAgentMDs(token) { return []; }
    async listAgentInstructions(token, logger) { return []; }
    getAgentFileURIFromModeFile(oldURI) { return undefined; }
    getDisabledPromptFiles(type) { return new ResourceSet(); }
    setDisabledPromptFiles(type, uris) { }
    registerPromptFileProvider(extension, type, provider) { return Disposable.None; }
    async findAgentSkills(token, sessionResource) { return undefined; }
    async getHooks(token, sessionResource) { return undefined; }
    async getInstructionFiles(token, sessionResource) { return []; }
}
// ---- CODE MAPPER ----
class NullCodeMapperService {
    constructor() {
        this.providers = [];
    }
    registerCodeMapperProvider(handle, provider) { return Disposable.None; }
    mapCode(request, response, token) { return Promise.resolve(undefined); }
}
// ---- TERMINAL CHAT ----
class NullTerminalChatService {
    constructor() {
        this.onDidRegisterTerminalInstanceWithToolSession = Event.None;
        this.onDidContinueInBackground = Event.None;
    }
    registerTerminalInstanceWithToolSession(terminalToolSessionId, instance) { }
    async getTerminalInstanceByToolSessionId(terminalToolSessionId) { return undefined; }
    getToolSessionTerminalInstances(hiddenOnly) { return []; }
    getToolSessionIdForInstance(instance) { return undefined; }
    registerTerminalInstanceWithChatSession(chatSessionResource, instance) { }
    getChatSessionResourceForInstance(instance) { return undefined; }
    isBackgroundTerminal(terminalToolSessionId) { return false; }
    registerProgressPart(part) { return Disposable.None; }
    setFocusedProgressPart(part) { }
    clearFocusedProgressPart(part) { }
    getFocusedProgressPart() { return undefined; }
    getMostRecentProgressPart() { return undefined; }
    setChatSessionAutoApproval(chatSessionResource, enabled) { }
    hasChatSessionAutoApproval(chatSessionResource) { return false; }
    addSessionAutoApproveRule(chatSessionResource, key, value) { }
    getSessionAutoApproveRules(chatSessionResource) { return {}; }
    continueInBackground(terminalToolSessionId) { }
}
// ---- REGISTER ALL ----
registerSingleton(IChatAgentService, NullChatAgentService, 1 /* InstantiationType.Delayed */);
registerSingleton(IChatService, NullChatService, 1 /* InstantiationType.Delayed */);
registerSingleton(IChatAgentNameService, NullChatAgentNameService, 1 /* InstantiationType.Delayed */);
registerSingleton(ILanguageModelsService, NullLanguageModelsService, 1 /* InstantiationType.Delayed */);
registerSingleton(IChatVariablesService, NullChatVariablesService, 1 /* InstantiationType.Delayed */);
registerSingleton(IChatWidgetService, NullChatWidgetService, 1 /* InstantiationType.Delayed */);
registerSingleton(IInlineChatSessionService, NullInlineChatSessionService, 1 /* InstantiationType.Delayed */);
registerSingleton(IChatContextPickService, NullContextPickService, 1 /* InstantiationType.Delayed */);
registerSingleton(IChatEditingService, NullChatEditingService, 1 /* InstantiationType.Delayed */);
registerSingleton(IPluginInstallService, NullPluginInstallService, 1 /* InstantiationType.Delayed */);
registerSingleton(ILanguageModelToolsService, NullLanguageModelToolsService, 1 /* InstantiationType.Delayed */);
registerSingleton(ILanguageModelToolsConfirmationService, NullLanguageModelToolsConfirmationService, 1 /* InstantiationType.Delayed */);
registerSingleton(IChatSessionsService, NullChatSessionsService, 1 /* InstantiationType.Delayed */);
registerSingleton(IPromptsService, NullPromptsService, 1 /* InstantiationType.Delayed */);
registerSingleton(ILanguageModelStatsService, NullLanguageModelStatsService, 1 /* InstantiationType.Delayed */);
registerSingleton(ICodeMapperService, NullCodeMapperService, 1 /* InstantiationType.Delayed */);
registerSingleton(ITerminalChatService, NullTerminalChatService, 1 /* InstantiationType.Delayed */);
//# sourceMappingURL=aiDisabledServices.js.map