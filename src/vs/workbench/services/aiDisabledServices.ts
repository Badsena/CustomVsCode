/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { registerSingleton, InstantiationType } from '../../platform/instantiation/common/extensions.js';
import { IChatAgentService, IChatAgent, IChatAgentData, IChatAgentMetadata, IChatAgentResult, IChatAgentHistoryEntry, IChatAgentRequest, IChatAgentNameService } from '../contrib/chat/common/participants/chatAgents.js';
import { IChatService, IChatProgress, ChatSendResult, IChatCompleteResponse, IChatDetail, IChatUserActionEvent, IChatSessionContext, IChatModelReference } from '../contrib/chat/common/chatService/chatService.js';
import { IChatEditingService, IChatEditingSession } from '../contrib/chat/common/editing/chatEditingService.js';
import { IChatVariablesService, IDynamicVariable } from '../contrib/chat/common/attachments/chatVariables.js';
import { ILanguageModelsService, ILanguageModelChatMetadata, ILanguageModelProviderDescriptor, ILanguageModelsGroup, ILanguageModelChatSelector, ILanguageModelChatProvider, ILanguageModelChatMetadataAndIdentifier, IChatMessage, ILanguageModelChatRequestOptions, ILanguageModelChatResponse, IModelsControlManifest } from '../contrib/chat/common/languageModels.js';
import { IChatWidgetService } from '../contrib/chat/browser/chat.js';
import { IInlineChatSessionService } from '../contrib/inlineChat/browser/inlineChatSessionService.js';
import { IChatContextPickService } from '../contrib/chat/browser/attachments/chatContextPickService.js';
import { IPluginInstallService, IUpdateAllPluginsOptions, IUpdateAllPluginsResult } from '../contrib/chat/common/plugins/pluginInstallService.js';
import { ILanguageModelToolsService, IToolInvocation, CountTokensCallback } from '../contrib/chat/common/tools/languageModelToolsService.js';
import { ILanguageModelToolsConfirmationService } from '../contrib/chat/common/tools/languageModelToolsConfirmationService.js';
import { IChatSessionsService, IChatSessionItemsDelta, IChatSessionsExtensionPoint, IChatSessionItemController, IChatSessionContentProvider, IChatSessionRequestHistoryItem, IChatSessionItem, ResolvedChatSessionsExtensionPoint, IChatNewSessionRequest, IChatSession, IChatSessionProviderOptionItem, IChatSessionOptionsWillNotifyExtensionEvent } from '../contrib/chat/common/chatSessionsService.js';
import { IPromptsService, IPromptDiscoveryLogEntry, IPromptPath, PromptsStorage, IChatPromptSlashCommand, ICustomAgent, IResolvedAgentFile, Logger, IAgentSkill, IConfiguredHooksInfo } from '../contrib/chat/common/promptSyntax/service/promptsService.js';
import { ICodeMapperService, ICodeMapperProvider, ICodeMapperRequest, ICodeMapperResponse } from '../contrib/chat/common/editing/chatCodeMapperService.js';
import { ITerminalChatService, IChatTerminalToolProgressPart } from '../contrib/terminal/browser/terminal.js';
import { ILanguageModelStatsService } from '../contrib/chat/common/languageModelStats.js';
import { Event, Emitter } from '../../base/common/event.js';
import { IDisposable, Disposable } from '../../base/common/lifecycle.js';
import { CancellationToken } from '../../base/common/cancellation.js';
import { ChatAgentLocation } from '../contrib/chat/common/constants.js';
import { URI } from '../../base/common/uri.js';
import { IObservable, observableValue } from '../../base/common/observable.js';
import { IChatModel, IExportableChatData, ISerializableChatData } from '../contrib/chat/common/model/chatModel.js';
import { ExtensionIdentifier } from '../../platform/extensions/common/extensions.js';
import { ResourceSet } from '../../base/common/map.js';
import { IExtensionDescription } from '../../platform/extensions/common/extensions.js';
import { ITextModel } from '../../editor/common/model.js';
import { PromptsType } from '../contrib/chat/common/promptSyntax/promptTypes.js';

// ---- CHAT AGENT ----
class NullChatAgentService implements IChatAgentService {
	_serviceBrand: undefined;
	readonly onDidChangeAgents: Event<IChatAgent | undefined> = Event.None;
	readonly onDidRegisterAgent: Event<IChatAgentData> = Event.None;
	readonly onDidUnregisterAgent: Event<IChatAgentData> = Event.None;
	readonly onDidChangeAgentHistory: Event<void> = Event.None;

	registerAgent(id: string, data: IChatAgentData): IDisposable { return Disposable.None; }
	registerAgentMetadata(id: string, metadata: IChatAgentMetadata): IDisposable { return Disposable.None; }
	registerDynamicAgent(data: IChatAgentData, agent: IChatAgent): IDisposable { return Disposable.None; }
	registerAgentHistory(agentId: string, history: IChatAgentHistoryEntry[]): void { }
	getAgents(): IChatAgentData[] { return []; }
	getAgent(id: string): IChatAgentData | undefined { return undefined; }
	getAgentByFullyQualifiedId(id: string): IChatAgentData | undefined { return undefined; }
	getActivatedAgents(): IChatAgent[] { return []; }
	getSecondaryAgent(): IChatAgentData | undefined { return undefined; }
	updateAgent(id: string, metadata: IChatAgentMetadata): void { }
	getDefaultAgent(location: ChatAgentLocation): IChatAgent | undefined { return undefined; }
	getContributedDefaultAgent(location: ChatAgentLocation): IChatAgentData | undefined { return undefined; }
	getAgentByLocation(location: ChatAgentLocation): IChatAgentData | undefined { return undefined; }
	getAgentsByName(name: string): IChatAgentData[] { return []; }
	hasAgent(id: string): boolean { return false; }
	getAgentHistory(id: string): IChatAgentHistoryEntry[] { return []; }
	clearAgentHistory(id: string): void { }
	invokeAgent(id: string, request: IChatAgentRequest, progress: (parts: any[]) => void, history: IChatAgentHistoryEntry[], token: CancellationToken): Promise<IChatAgentResult> { return Promise.resolve({}); }
	setYieldRequested(agentId: string, requestId: string, yieldRequested: boolean): void { }
	getFollowups(agentId: string, request: IChatAgentRequest, result: IChatAgentResult, history: IChatAgentHistoryEntry[], token: CancellationToken): Promise<any[]> { return Promise.resolve([]); }
	getChatTitle(agentId: string, history: IChatAgentHistoryEntry[], token: CancellationToken): Promise<string | undefined> { return Promise.resolve(undefined); }
	getChatSummary(agentId: string, history: IChatAgentHistoryEntry[], token: CancellationToken): Promise<string | undefined> { return Promise.resolve(undefined); }
	agentHasDupeName(agentId: string): boolean { return false; }
	readonly hasToolsAgent: boolean = false;
	registerAgentImplementation(id: string, implementation: any): IDisposable { return Disposable.None; }
	registerAgentCompletionProvider(id: string, provider: any): IDisposable { return Disposable.None; }
	getAgentCompletionItems(id: string, location: ChatAgentLocation, token: CancellationToken): Promise<any[]> { return Promise.resolve([]); }
	registerChatParticipantDetectionProvider(handle: number, provider: any): IDisposable { return Disposable.None; }
	detectAgentOrCommand(request: IChatAgentRequest, history: IChatAgentHistoryEntry[], options: { location: ChatAgentLocation }, token: CancellationToken): Promise<any> { return Promise.resolve(undefined); }
	hasChatParticipantDetectionProviders(): boolean { return false; }
	setRequestTools(agent: string, requestId: string, tools: any): void { }
}

// ---- CHAT SERVICE ----
class NullChatService implements IChatService {
	_serviceBrand: undefined;
	transferredSessionResource: URI | undefined = undefined;
	readonly onDidSubmitRequest: Event<{ readonly chatSessionResource: URI; readonly message?: any }> = Event.None;
	readonly onDidCreateModel: Event<IChatModel> = Event.None;
	readonly chatModels: IObservable<Iterable<IChatModel>> = observableValue(this, []);
	readonly editingSessions: readonly IChatEditingSession[] = [];
	readonly onDidPerformUserAction: Event<IChatUserActionEvent> = Event.None;
	readonly onDidReceiveQuestionCarouselAnswer: Event<any> = Event.None;
	readonly onDidDisposeSession: Event<any> = Event.None;
	readonly requestInProgressObs: IObservable<boolean> = observableValue(this, false);

	isEnabled(location: ChatAgentLocation): boolean { return false; }
	hasSessions(): boolean { return false; }
	startNewLocalSession(location: ChatAgentLocation, options?: any): IChatModelReference { throw new Error('Not implemented'); }
	getSession(sessionResource: URI): IChatModel | undefined { return undefined; }
	acquireExistingSession(sessionResource: URI): IChatModelReference | undefined { return undefined; }
	acquireOrLoadSession(sessionResource: URI, location: ChatAgentLocation, token: CancellationToken): Promise<IChatModelReference | undefined> { throw new Error('Not implemented'); }
	loadSessionFromData(data: IExportableChatData | ISerializableChatData): IChatModelReference { throw new Error('Not implemented'); }
	getChatSessionFromInternalUri(sessionResource: URI): IChatSessionContext | undefined { return undefined; }
	sendRequest(sessionResource: URI, message: string, options?: any): Promise<ChatSendResult> { throw new Error('Not implemented'); }
	getSessionTitle(sessionResource: URI): string | undefined { return undefined; }
	setSessionTitle(sessionResource: URI, title: string): void { }
	appendProgress(request: any, progress: IChatProgress): void { }
	resendRequest(request: any, options?: any): Promise<void> { return Promise.resolve(); }
	adoptRequest(sessionResource: URI, request: any): Promise<void> { return Promise.resolve(); }
	removeRequest(sessionResource: URI, requestId: string): Promise<void> { return Promise.resolve(); }
	cancelCurrentRequestForSession(sessionResource: URI, source?: string): Promise<void> { return Promise.resolve(); }
	migrateRequests(originalResource: URI, targetResource: URI): void { }
	setYieldRequested(sessionResource: URI): void { }
	removePendingRequest(sessionResource: URI, requestId: string): void { }
	setPendingRequests(sessionResource: URI, requests: readonly any[]): void { }
	processPendingRequests(sessionResource: URI): void { }
	addCompleteRequest(sessionResource: URI, message: any, variableData: any, attempt: number | undefined, response: IChatCompleteResponse): void { }
	setChatSessionTitle(sessionResource: URI, title: string): void { }
	getLocalSessionHistory(): Promise<IChatDetail[]> { return Promise.resolve([]); }
	clearAllHistoryEntries(): Promise<void> { return Promise.resolve(); }
	removeHistoryEntry(sessionResource: URI): Promise<void> { return Promise.resolve(); }
	getChatStorageFolder(): URI { throw new Error('Not implemented'); }
	logChatIndex(): void { }
	getLiveSessionItems(): Promise<IChatDetail[]> { return Promise.resolve([]); }
	getHistorySessionItems(): Promise<IChatDetail[]> { return Promise.resolve([]); }
	getMetadataForSession(sessionResource: URI): Promise<IChatDetail | undefined> { return Promise.resolve(undefined); }
	notifyUserAction(event: IChatUserActionEvent): void { }
	notifyQuestionCarouselAnswer(requestId: string, resolveId: string, answers: any): void { }
	transferChatSession(transferredSessionResource: URI, toWorkspace: URI): Promise<void> { return Promise.resolve(); }
	activateDefaultAgent(location: ChatAgentLocation): Promise<void> { return Promise.resolve(); }
	registerChatModelChangeListeners(chatSessionType: string, onChange: (chatSessionResource: URI) => void): IDisposable { return Disposable.None; }
	setSaveModelsEnabled(enabled: boolean): void { }
	waitForModelDisposals(): Promise<void> { return Promise.resolve(); }
}

// ---- CHAT AGENT NAME ----
class NullChatAgentNameService implements IChatAgentNameService {
	_serviceBrand: undefined;
	getAgentNameRestriction(chatAgentData: IChatAgentData): boolean { return true; }
}

// ---- LANGUAGE MODELS ----
class NullLanguageModelsService implements ILanguageModelsService {
	_serviceBrand: undefined;
	readonly onDidChangeLanguageModelVendors: Event<readonly string[]> = Event.None;
	readonly onDidChangeLanguageModels: Event<string> = Event.None;
	readonly onDidChangeModelsControlManifest: Event<IModelsControlManifest> = Event.None;
	readonly restrictedChatParticipants: IObservable<{ [name: string]: string[] }> = observableValue(this, {});

	updateModelPickerPreference(modelIdentifier: string, showInModelPicker: boolean): void { }
	getLanguageModelIds(): string[] { return []; }
	getVendors(): ILanguageModelProviderDescriptor[] { return []; }
	lookupLanguageModel(modelId: string): ILanguageModelChatMetadata | undefined { return undefined; }
	lookupLanguageModelByQualifiedName(qualifiedName: string): ILanguageModelChatMetadataAndIdentifier | undefined { return undefined; }
	getLanguageModelGroups(vendor: string): ILanguageModelsGroup[] { return []; }
	selectLanguageModels(selector: ILanguageModelChatSelector): Promise<string[]> { return Promise.resolve([]); }
	registerLanguageModelProvider(vendor: string, provider: ILanguageModelChatProvider): IDisposable { return Disposable.None; }
	deltaLanguageModelChatProviderDescriptors(added: any[], removed: any[]): void { }
	sendChatRequest(modelId: string, from: any, messages: IChatMessage[], options: ILanguageModelChatRequestOptions, token: CancellationToken): Promise<ILanguageModelChatResponse> { throw new Error('Not implemented'); }
	computeTokenLength(modelId: string, message: string | IChatMessage, token: CancellationToken): Promise<number> { return Promise.resolve(0); }
	getModelConfiguration(modelId: string): any { return undefined; }
	setModelConfiguration(modelId: string, values: any): Promise<void> { return Promise.resolve(); }
	getModelConfigurationActions(modelId: string): any[] { return []; }
	addLanguageModelsProviderGroup(name: string, vendorId: string, configuration: any): Promise<void> { return Promise.resolve(); }
	removeLanguageModelsProviderGroup(vendorId: string, providerGroupName: string): Promise<void> { return Promise.resolve(); }
	configureLanguageModelsProviderGroup(vendorId: string, name?: string): Promise<void> { return Promise.resolve(); }
	configureModel(modelId: string): Promise<void> { return Promise.resolve(); }
	migrateLanguageModelsProviderGroup(languageModelsProviderGroup: any): Promise<void> { return Promise.resolve(); }
	getRecentlyUsedModelIds(): string[] { return []; }
	addToRecentlyUsedList(modelIdentifier: string): void { }
	clearRecentlyUsedList(): void { }
	getModelsControlManifest(): IModelsControlManifest { return { free: {}, paid: {} }; }
}

// ---- CHAT VARIABLES ----
class NullChatVariablesService implements IChatVariablesService {
	_serviceBrand: undefined;
	getDynamicVariables(sessionResource: URI): ReadonlyArray<IDynamicVariable> { return []; }
	getSelectedToolAndToolSets(sessionResource: URI): any { return new Map(); }
}

// ---- CHAT WIDGET ----
class NullChatWidgetService implements IChatWidgetService {
	_serviceBrand: undefined;
	readonly onDidRegisterWidget: Event<any> = Event.None;
	readonly onDidUnregisterWidget: Event<any> = Event.None;
	readonly onDidAddWidget: Event<any> = Event.None;
	readonly onDidBackgroundSession: Event<URI> = Event.None;
	readonly onDidChangeFocusedWidget: Event<any> = Event.None;
	readonly onDidChangeFocusedSession: Event<void> = Event.None;
	lastFocusedWidget: any | undefined = undefined;

	registerWidget(widget: any) { return Disposable.None; }
	getWidgetByInputUri(uri: URI) { return undefined; }
	getWidgetBySessionId(sessionId: string) { return undefined; }
	getWidgetBySessionResource(sessionResource: URI) { return undefined; }
	getWidgetsByLocations(location: any) { return []; }
	getAllWidgets() { return []; }
	reveal(widget: any, preserveFocus?: boolean) { return Promise.resolve(false); }
	revealWidget(preserveFocus?: boolean) { return Promise.resolve(undefined); }
	openSession(sessionResource: URI, target?: any, options?: any) { return Promise.resolve(undefined); }
	register(newWidget: any) { return Disposable.None; }
}

// ---- INLINE CHAT SESSION ----
class NullInlineChatSessionService implements IInlineChatSessionService {
	_serviceBrand: undefined;
	readonly onWillStartSession: Event<any> = Event.None;
	readonly onDidEndSession: Event<any> = Event.None;
	readonly onDidMoveSession: Event<any> = Event.None;
	readonly onDidChangeSessions = new Emitter<any>().event;

	dispose() { }
	registerSession(editor: any, session: any) { }
	getSession(editor: any, uri: URI) { return undefined; }
	releaseSession(session: any) { }
	getAllSessions(): Iterable<any> { return []; }
	createSession(...args: any[]): any { return undefined; }
	getSessionByTextModel(...args: any[]): any { return undefined; }
	getSessionBySessionUri(...args: any[]): any { return undefined; }
}

// ---- CONTEXT PICK ----
class NullContextPickService implements IChatContextPickService {
	_serviceBrand: undefined;
	readonly items: any[] = [];
	registerChatContextItem(item: any) { return Disposable.None; }
}

// ---- CHAT EDITING ----
class NullChatEditingService implements IChatEditingService {
	_serviceBrand: undefined;
	readonly onDidCreateEditingSession: Event<any> = Event.None;
	readonly onDidDisposeEditingSession: Event<any> = Event.None;
	editingSessionsObs: IObservable<readonly IChatEditingSession[]> = observableValue(this, []);
	startOrContinueGlobalEditingSession(chatModel: any): IChatEditingSession { throw new Error('Not implemented'); }
	getEditingSession(chatSessionResource: URI): IChatEditingSession | undefined { return undefined; }
	createEditingSession(chatModel: any): IChatEditingSession { throw new Error('Not implemented'); }
	transferEditingSession(chatModel: any, session: IChatEditingSession): IChatEditingSession { throw new Error('Not implemented'); }
}

// ---- PLUGIN INSTALL ----
class NullPluginInstallService implements IPluginInstallService {
	_serviceBrand: undefined;
	async installPlugin(plugin: any): Promise<void> { }
	async installPluginFromSource(source: string): Promise<void> { }
	validatePluginSource(source: string): string | undefined { return undefined; }
	async installPluginFromValidatedSource(source: string): Promise<{ success: boolean; message?: string }> { return { success: true }; }
	async updatePlugin(plugin: any): Promise<boolean> { return true; }
	async updateAllPlugins(options: IUpdateAllPluginsOptions, token: CancellationToken): Promise<IUpdateAllPluginsResult> { return { updatedNames: [], failedNames: [] }; }
	getPluginInstallUri(plugin: any): URI { return URI.file('/'); }
}

// ---- LANGUAGE MODEL TOOLS ----
class NullLanguageModelToolsService {
	_serviceBrand: undefined;
	readonly onDidChangeTools: Event<void> = Event.None;
	getTools() { return []; }
	getTool(id: string) { return undefined; }
	registerTool(data: any) { return Disposable.None; }
	async invokeTool(invocation: IToolInvocation, countTokens: CountTokensCallback, token: CancellationToken): Promise<any> {
		return { content: [] };
	}

	// Legacy or fork methods
	readonly toolSets: IObservable<Iterable<any>> = observableValue(this, []);
	readonly onDidPrepareToolCallBecomeUnresponsive: Event<any> = Event.None;
	readonly onDidInvokeTool: Event<any> = Event.None;
	getAllToolsIncludingDisabled() { return []; }
	observeTools(model: any) { return observableValue(this, []); }
}

class NullLanguageModelStatsService implements ILanguageModelStatsService {
	_serviceBrand: undefined;
	async update(model: string, extensionId: ExtensionIdentifier, agent: string | undefined, tokenCount: number | undefined): Promise<void> { }
}

// ---- LANGUAGE MODEL TOOLS CONFIRMATION ----
class NullLanguageModelToolsConfirmationService implements ILanguageModelToolsConfirmationService {
	_serviceBrand: undefined;
	getPreConfirmAction(ref: any) { return undefined; }
	getPostConfirmAction(ref: any) { return undefined; }
	getPreConfirmActions(ref: any) { return []; }
	getPostConfirmActions(ref: any) { return []; }
	manageConfirmationPreferences(tools: readonly any[], options?: any) { }
	registerConfirmationContribution(toolName: string, contribution: any) { return Disposable.None; }
	toolCanManageConfirmation(tool: any) { return false; }
	resetToolAutoConfirmation() { }
	confirmToolInvocation(toolId: string, parameters: any, token: CancellationToken) { return Promise.resolve(true); }
}

// ---- CHAT SESSIONS ----
export class NullChatSessionsService implements IChatSessionsService {
	_serviceBrand: undefined;
	readonly onDidChangeItemsProviders: Event<{ readonly chatSessionType: string }> = Event.None;
	readonly onDidChangeSessionItems: Event<IChatSessionItemsDelta> = Event.None;
	readonly onDidChangeAvailability: Event<void> = Event.None;
	readonly onDidChangeInProgress: Event<void> = Event.None;
	readonly onDidChangeContentProviderSchemes: Event<{ readonly added: string[]; readonly removed: string[] }> = Event.None;
	readonly onDidChangeSessionOptions: Event<URI> = Event.None;
	readonly onDidChangeOptionGroups: Event<string> = Event.None;
	readonly onRequestNotifyExtension: Event<IChatSessionOptionsWillNotifyExtensionEvent> = Event.None;

	getChatSessionContribution(chatSessionType: string): ResolvedChatSessionsExtensionPoint | undefined { return undefined; }
	getAllChatSessionContributions(): ResolvedChatSessionsExtensionPoint[] { return []; }
	registerChatSessionContribution(contribution: IChatSessionsExtensionPoint): IDisposable { return Disposable.None; }
	registerChatSessionItemController(chatSessionType: string, controller: IChatSessionItemController): IDisposable { return Disposable.None; }
	getRegisteredChatSessionItemProviders(): readonly string[] { return []; }
	activateChatSessionItemProvider(chatSessionType: string): Promise<void> { return Promise.resolve(); }
	getChatSessionItems(providerTypeFilter: readonly string[] | undefined, token: CancellationToken): AsyncIterable<{ readonly chatSessionType: string; readonly items: readonly IChatSessionItem[] }> { return (async function* () { })(); }
	refreshChatSessionItems(providerTypeFilter: readonly string[] | undefined, token: CancellationToken): Promise<void> { return Promise.resolve(); }
	reportInProgress(chatSessionType: string, count: number): void { }
	getInProgress(): { displayName: string; count: number }[] { return []; }
	getContentProviderSchemes(): string[] { return []; }
	registerChatSessionContentProvider(scheme: string, provider: IChatSessionContentProvider): IDisposable { return Disposable.None; }
	canResolveChatSession(sessionType: string): Promise<boolean> { return Promise.resolve(false); }
	getOrCreateChatSession(sessionResource: URI, token: CancellationToken): Promise<IChatSession> { throw new Error('Not implemented'); }
	hasAnySessionOptions(sessionResource: URI): boolean { return false; }
	getSessionOptions(sessionResource: URI): Map<string, string> | undefined { return undefined; }
	getSessionOption(sessionResource: URI, optionId: string): string | IChatSessionProviderOptionItem | undefined { return undefined; }
	setSessionOption(sessionResource: URI, optionId: string, value: string | IChatSessionProviderOptionItem): boolean { return false; }
	getCapabilitiesForSessionType(chatSessionType: string): any { return undefined; }
	getCustomAgentTargetForSessionType(chatSessionType: string): any { return undefined; }
	requiresCustomModelsForSessionType(chatSessionType: string): boolean { return false; }
	supportsDelegationForSessionType(chatSessionType: string): boolean { return true; }
	sessionSupportsFork(sessionResource: URI): boolean { return false; }
	forkChatSession(sessionResource: URI, request: IChatSessionRequestHistoryItem | undefined, token: CancellationToken): Promise<IChatSessionItem> { throw new Error('Not implemented'); }
	getOptionGroupsForSessionType(chatSessionType: string): any[] | undefined { return undefined; }
	setOptionGroupsForSessionType(chatSessionType: string, handle: number, optionGroups?: any[]): void { }
	getNewSessionOptionsForSessionType(chatSessionType: string): Record<string, string | IChatSessionProviderOptionItem> | undefined { return undefined; }
	setNewSessionOptionsForSessionType(chatSessionType: string, options: Record<string, string | IChatSessionProviderOptionItem>): void { }
	notifySessionOptionsChange(sessionResource: URI, updates: ReadonlyArray<{ optionId: string; value: string | IChatSessionProviderOptionItem }>): Promise<void> { return Promise.resolve(); }
	getInProgressSessionDescription(chatModel: any): string | undefined { return undefined; }
	createNewChatSessionItem(chatSessionType: string, request: IChatNewSessionRequest, token: CancellationToken): Promise<IChatSessionItem | undefined> { return Promise.resolve(undefined); }
	registerSessionResourceAlias(untitledResource: URI, realResource: URI): void { }
}

// ---- PROMPTS SERVICE ----
class NullPromptsService implements IPromptsService {
	_serviceBrand: undefined;
	readonly onDidChangeSlashCommands: Event<void> = Event.None;
	readonly onDidChangeCustomAgents: Event<void> = Event.None;
	readonly onDidChangeInstructions: Event<void> = Event.None;
	readonly onDidChangeSkills: Event<void> = Event.None;
	readonly onDidLogDiscovery: Event<IPromptDiscoveryLogEntry> = Event.None;

	dispose() { }
	getParsedPromptFile(textModel: ITextModel): any { return {} as any; }
	async listPromptFiles(type: PromptsType, token: CancellationToken): Promise<readonly IPromptPath[]> { return []; }
	async listPromptFilesForStorage(type: PromptsType, storage: PromptsStorage, token: CancellationToken): Promise<readonly IPromptPath[]> { return []; }
	async getSourceFolders(type: PromptsType): Promise<readonly IPromptPath[]> { return []; }
	async getResolvedSourceFolders(type: PromptsType): Promise<readonly any[]> { return []; }
	isValidSlashCommandName(name: string): boolean { return false; }
	async resolvePromptSlashCommand(command: string, token: CancellationToken): Promise<IChatPromptSlashCommand | undefined> { return undefined; }
	async getPromptSlashCommands(token: CancellationToken, sessionResource?: URI): Promise<readonly IChatPromptSlashCommand[]> { return []; }
	async getPromptSlashCommandName(uri: URI, token: CancellationToken): Promise<string> { return ''; }
	async getCustomAgents(token: CancellationToken, sessionResource?: URI): Promise<readonly ICustomAgent[]> { return []; }
	async parseNew(uri: URI, token: CancellationToken): Promise<any> { return {} as any; }
	registerContributedFile(type: PromptsType, uri: URI, extension: IExtensionDescription, name: string | undefined, description: string | undefined, when?: string): IDisposable { return Disposable.None; }
	getPromptLocationLabel(promptPath: IPromptPath): string { return ''; }
	async listNestedAgentMDs(token: CancellationToken): Promise<IResolvedAgentFile[]> { return []; }
	async listAgentInstructions(token: CancellationToken, logger?: Logger): Promise<IResolvedAgentFile[]> { return []; }
	getAgentFileURIFromModeFile(oldURI: URI): URI | undefined { return undefined; }
	getDisabledPromptFiles(type: PromptsType): ResourceSet { return new ResourceSet(); }
	setDisabledPromptFiles(type: PromptsType, uris: ResourceSet): void { }
	registerPromptFileProvider(extension: IExtensionDescription, type: PromptsType, provider: { onDidChangePromptFiles?: Event<void>; providePromptFiles: (context: any, token: CancellationToken) => Promise<any> }): IDisposable { return Disposable.None; }
	async findAgentSkills(token: CancellationToken, sessionResource?: URI): Promise<IAgentSkill[] | undefined> { return undefined; }
	async getHooks(token: CancellationToken, sessionResource?: URI): Promise<IConfiguredHooksInfo | undefined> { return undefined; }
	async getInstructionFiles(token: CancellationToken, sessionResource?: URI): Promise<readonly IPromptPath[]> { return []; }
}

// ---- CODE MAPPER ----
class NullCodeMapperService implements ICodeMapperService {
	_serviceBrand: undefined;
	readonly providers: ICodeMapperProvider[] = [];
	registerCodeMapperProvider(handle: number, provider: ICodeMapperProvider) { return Disposable.None; }
	mapCode(request: ICodeMapperRequest, response: ICodeMapperResponse, token: CancellationToken) { return Promise.resolve(undefined); }
}

// ---- TERMINAL CHAT ----
class NullTerminalChatService implements ITerminalChatService {
	_serviceBrand: undefined;
	readonly onDidRegisterTerminalInstanceWithToolSession: Event<any> = Event.None;
	registerTerminalInstanceWithToolSession(terminalToolSessionId: string | undefined, instance: any): void { }
	async getTerminalInstanceByToolSessionId(terminalToolSessionId: string): Promise<any | undefined> { return undefined; }
	getToolSessionTerminalInstances(hiddenOnly?: boolean): readonly any[] { return []; }
	getToolSessionIdForInstance(instance: any): string | undefined { return undefined; }
	registerTerminalInstanceWithChatSession(chatSessionResource: URI, instance: any): void { }
	getChatSessionResourceForInstance(instance: any): URI | undefined { return undefined; }
	isBackgroundTerminal(terminalToolSessionId?: string): boolean { return false; }
	registerProgressPart(part: IChatTerminalToolProgressPart): IDisposable { return Disposable.None; }
	setFocusedProgressPart(part: IChatTerminalToolProgressPart): void { }
	clearFocusedProgressPart(part: IChatTerminalToolProgressPart): void { }
	getFocusedProgressPart(): IChatTerminalToolProgressPart | undefined { return undefined; }
	getMostRecentProgressPart(): IChatTerminalToolProgressPart | undefined { return undefined; }
	setChatSessionAutoApproval(chatSessionResource: URI, enabled: boolean): void { }
	hasChatSessionAutoApproval(chatSessionResource: URI): boolean { return false; }
	addSessionAutoApproveRule(chatSessionResource: URI, key: string, value: boolean | { approve: boolean; matchCommandLine?: boolean }): void { }
	getSessionAutoApproveRules(chatSessionResource: URI): Readonly<Record<string, boolean | { approve: boolean; matchCommandLine?: boolean }>> { return {}; }
	continueInBackground(terminalToolSessionId: string): void { }
	readonly onDidContinueInBackground: Event<string> = Event.None;
}

// ---- REGISTER ALL ----
registerSingleton(IChatAgentService, NullChatAgentService, InstantiationType.Delayed);
registerSingleton(IChatService, NullChatService, InstantiationType.Delayed);
registerSingleton(IChatAgentNameService, NullChatAgentNameService, InstantiationType.Delayed);
registerSingleton(ILanguageModelsService, NullLanguageModelsService, InstantiationType.Delayed);
registerSingleton(IChatVariablesService, NullChatVariablesService, InstantiationType.Delayed);
registerSingleton(IChatWidgetService, NullChatWidgetService, InstantiationType.Delayed);
registerSingleton(IInlineChatSessionService, NullInlineChatSessionService, InstantiationType.Delayed);
registerSingleton(IChatContextPickService, NullContextPickService, InstantiationType.Delayed);
registerSingleton(IChatEditingService, NullChatEditingService, InstantiationType.Delayed);
registerSingleton(IPluginInstallService, NullPluginInstallService, InstantiationType.Delayed);
registerSingleton(ILanguageModelToolsService, NullLanguageModelToolsService as any, InstantiationType.Delayed);
registerSingleton(ILanguageModelToolsConfirmationService, NullLanguageModelToolsConfirmationService, InstantiationType.Delayed);
registerSingleton(IChatSessionsService, NullChatSessionsService, InstantiationType.Delayed);
registerSingleton(IPromptsService, NullPromptsService, InstantiationType.Delayed);
registerSingleton(ILanguageModelStatsService, NullLanguageModelStatsService, InstantiationType.Delayed);
registerSingleton(ICodeMapperService, NullCodeMapperService, InstantiationType.Delayed);
registerSingleton(ITerminalChatService, NullTerminalChatService, InstantiationType.Delayed);
