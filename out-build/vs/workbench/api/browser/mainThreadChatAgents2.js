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
import { DeferredPromise } from '../../../base/common/async.js';
import { CancellationToken } from '../../../base/common/cancellation.js';
import { Emitter } from '../../../base/common/event.js';
import { Disposable, DisposableMap } from '../../../base/common/lifecycle.js';
import { revive } from '../../../base/common/marshalling.js';
import { Schemas } from '../../../base/common/network.js';
import { escapeRegExpCharacters } from '../../../base/common/strings.js';
import { ThemeIcon } from '../../../base/common/themables.js';
import { URI } from '../../../base/common/uri.js';
import { Range } from '../../../editor/common/core/range.js';
import { getWordAtText } from '../../../editor/common/core/wordHelper.js';
import { ILanguageFeaturesService } from '../../../editor/common/services/languageFeatures.js';
import { ExtensionIdentifier } from '../../../platform/extensions/common/extensions.js';
import { IInstantiationService } from '../../../platform/instantiation/common/instantiation.js';
import { ILogService } from '../../../platform/log/common/log.js';
import { IUriIdentityService } from '../../../platform/uriIdentity/common/uriIdentity.js';
import { IChatWidgetService } from '../../contrib/chat/browser/chat.js';
import { AgentSessionProviders, getAgentSessionProvider } from '../../contrib/chat/browser/agentSessions/agentSessions.js';
import { AddDynamicVariableAction } from '../../contrib/chat/browser/attachments/chatDynamicVariables.js';
import { IChatAgentService } from '../../contrib/chat/common/participants/chatAgents.js';
import { IPromptsService } from '../../contrib/chat/common/promptSyntax/service/promptsService.js';
import { isValidPromptType } from '../../contrib/chat/common/promptSyntax/promptTypes.js';
import { ChatRequestAgentPart } from '../../contrib/chat/common/requestParser/chatParserTypes.js';
import { ChatRequestParser } from '../../contrib/chat/common/requestParser/chatRequestParser.js';
import { getDynamicVariablesForWidget, getSelectedToolAndToolSetsForWidget } from '../../contrib/chat/browser/attachments/chatVariables.js';
import { IChatService } from '../../contrib/chat/common/chatService/chatService.js';
import { IChatSessionsService } from '../../contrib/chat/common/chatSessionsService.js';
import { ChatAgentLocation, ChatModeKind } from '../../contrib/chat/common/constants.js';
import { ILanguageModelToolsService } from '../../contrib/chat/common/tools/languageModelToolsService.js';
import { extHostNamedCustomer } from '../../services/extensions/common/extHostCustomers.js';
import { IExtensionService } from '../../services/extensions/common/extensions.js';
import { ExtHostContext, MainContext } from '../common/extHost.protocol.js';
import { NotebookDto } from './mainThreadNotebookDto.js';
import { isUntitledChatSession } from '../../contrib/chat/common/model/chatUri.js';
export class MainThreadChatTask {
    get onDidAddProgress() { return this._onDidAddProgress.event; }
    constructor(content) {
        this.content = content;
        this.kind = 'progressTask';
        this.deferred = new DeferredPromise();
        this._onDidAddProgress = new Emitter();
        this.progress = [];
    }
    task() {
        return this.deferred.p;
    }
    isSettled() {
        return this.deferred.isSettled;
    }
    complete(v) {
        this.deferred.complete(v);
    }
    add(progress) {
        this.progress.push(progress);
        this._onDidAddProgress.fire(progress);
    }
    toJSON() {
        return {
            kind: 'progressTaskSerialized',
            content: this.content,
            progress: this.progress
        };
    }
}
let MainThreadChatAgents2 = class MainThreadChatAgents2 extends Disposable {
    constructor(extHostContext, _chatAgentService, _chatSessionService, _chatService, _languageFeaturesService, _chatWidgetService, _instantiationService, _logService, _extensionService, _uriIdentityService, _promptsService, _languageModelToolsService) {
        super();
        this._chatAgentService = _chatAgentService;
        this._chatSessionService = _chatSessionService;
        this._chatService = _chatService;
        this._languageFeaturesService = _languageFeaturesService;
        this._chatWidgetService = _chatWidgetService;
        this._instantiationService = _instantiationService;
        this._logService = _logService;
        this._extensionService = _extensionService;
        this._uriIdentityService = _uriIdentityService;
        this._promptsService = _promptsService;
        this._languageModelToolsService = _languageModelToolsService;
        this._agents = this._register(new DisposableMap());
        this._agentCompletionProviders = this._register(new DisposableMap());
        this._agentIdsToCompletionProviders = this._register(new DisposableMap);
        this._chatParticipantDetectionProviders = this._register(new DisposableMap());
        this._promptFileProviders = this._register(new DisposableMap());
        this._promptFileProviderEmitters = this._register(new DisposableMap());
        this._promptFileContentRegistrations = this._register(new DisposableMap());
        this._pendingProgress = new Map();
        this._activeTasks = new Map();
        this._unresolvedAnchors = new Map();
        this._proxy = extHostContext.getProxy(ExtHostContext.ExtHostChatAgents2);
        this._register(this._chatService.onDidDisposeSession(e => {
            for (const resource of e.sessionResource) {
                this._proxy.$releaseSession(resource);
            }
        }));
        this._register(this._chatService.onDidPerformUserAction(e => {
            if (typeof e.agentId === 'string') {
                for (const [handle, agent] of this._agents) {
                    if (agent.id === e.agentId) {
                        if (e.action.kind === 'vote') {
                            this._proxy.$acceptFeedback(handle, e.result ?? {}, e.action);
                        }
                        else {
                            this._proxy.$acceptAction(handle, e.result || {}, e);
                        }
                        break;
                    }
                }
            }
        }));
        this._register(this._chatService.onDidReceiveQuestionCarouselAnswer(e => {
            this._proxy.$handleQuestionCarouselAnswer(e.requestId, e.resolveId, e.answers);
        }));
        this._register(this._chatWidgetService.onDidChangeFocusedSession(() => {
            this._acceptActiveChatSession(this._chatWidgetService.lastFocusedWidget);
        }));
        // Push the initial active session if there is already a focused widget
        this._acceptActiveChatSession(this._chatWidgetService.lastFocusedWidget);
        // Push custom agents to ext host
        void this._pushCustomAgents();
        this._register(this._promptsService.onDidChangeCustomAgents(() => {
            void this._pushCustomAgents();
        }));
        // Push instructions to ext host
        void this._pushInstructions();
        this._register(this._promptsService.onDidChangeInstructions(() => {
            void this._pushInstructions();
        }));
        // Push skills to ext host
        void this._pushSkills();
        this._register(this._promptsService.onDidChangeSkills(() => {
            void this._pushSkills();
        }));
    }
    _acceptActiveChatSession(widget) {
        const sessionResource = widget?.viewModel?.sessionResource;
        const isLocal = sessionResource && getAgentSessionProvider(sessionResource) === AgentSessionProviders.Local;
        this._proxy.$acceptActiveChatSession(isLocal ? sessionResource : undefined);
    }
    async _pushCustomAgents() {
        try {
            const customAgents = await this._promptsService.getCustomAgents(CancellationToken.None);
            const dtos = customAgents.map(agent => ({ uri: agent.uri }));
            this._proxy.$acceptCustomAgents(dtos);
        }
        catch (error) {
            this._logService.error('[chat] Failed to push custom agents to extension host', error);
        }
    }
    async _pushInstructions() {
        try {
            const instructions = await this._promptsService.getInstructionFiles(CancellationToken.None);
            const dtos = instructions.map(instruction => ({ uri: instruction.uri }));
            this._proxy.$acceptInstructions(dtos);
        }
        catch (error) {
            this._logService.error('[chat] Failed to push instructions to extension host', error);
        }
    }
    async _pushSkills() {
        try {
            const skills = await this._promptsService.findAgentSkills(CancellationToken.None) ?? [];
            const dtos = skills.map(skill => ({ uri: skill.uri }));
            this._proxy.$acceptSkills(dtos);
        }
        catch (error) {
            this._logService.error('[chat] Failed to push skills to extension host', error);
        }
    }
    $unregisterAgent(handle) {
        this._agents.deleteAndDispose(handle);
    }
    async $transferActiveChatSession(toWorkspace) {
        const widget = this._chatWidgetService.lastFocusedWidget;
        const model = widget?.viewModel?.model;
        if (!model) {
            this._logService.error(`MainThreadChat#$transferActiveChatSession: No active chat session found`);
            return;
        }
        await this._chatService.transferChatSession(model.sessionResource, URI.revive(toWorkspace));
    }
    async $registerAgent(handle, extension, id, metadata, dynamicProps) {
        await this._extensionService.whenInstalledExtensionsRegistered();
        const staticAgentRegistration = this._chatAgentService.getAgent(id, true);
        const chatSessionRegistration = this._chatSessionService.getAllChatSessionContributions().find(c => c.type === id || c.alternativeIds?.includes(id));
        if (!staticAgentRegistration && !chatSessionRegistration && !dynamicProps) {
            if (this._chatAgentService.getAgentsByName(id).length) {
                // Likely some extension authors will not adopt the new ID, so give a hint if they register a
                // participant by name instead of ID.
                throw new Error(`chatParticipant must be declared with an ID in package.json. The "id" property may be missing! "${id}"`);
            }
            throw new Error(`chatParticipant must be declared in package.json: ${id}`);
        }
        const impl = {
            invoke: async (request, progress, history, token) => {
                const chatSession = this._chatService.getSession(request.sessionResource);
                this._pendingProgress.set(request.requestId, { progress, chatSession });
                try {
                    const contributedSession = chatSession?.contributedChatSession;
                    let chatSessionContext;
                    if (contributedSession) {
                        const chatSessionResource = contributedSession.chatSessionResource;
                        const isUntitled = isUntitledChatSession(chatSessionResource);
                        chatSessionContext = {
                            chatSessionResource,
                            isUntitled,
                            initialSessionOptions: contributedSession.initialSessionOptions?.map(o => ({
                                optionId: o.optionId,
                                value: typeof o.value === 'string' ? o.value : o.value.id,
                            })),
                        };
                    }
                    return await this._proxy.$invokeAgent(handle, request, {
                        history,
                        chatSessionContext,
                    }, token) ?? {};
                }
                finally {
                    this._pendingProgress.delete(request.requestId);
                }
            },
            setRequestTools: (requestId, tools) => {
                this._proxy.$setRequestTools(requestId, tools);
            },
            setYieldRequested: (requestId, value) => {
                this._proxy.$setYieldRequested(requestId, value);
            },
            provideFollowups: async (request, result, history, token) => {
                if (!this._agents.get(handle)?.hasFollowups) {
                    return [];
                }
                return this._proxy.$provideFollowups(request, handle, result, { history }, token);
            },
            provideChatTitle: (history, token) => {
                return this._proxy.$provideChatTitle(handle, history, token);
            },
            provideChatSummary: (history, token) => {
                return this._proxy.$provideChatSummary(handle, history, token);
            },
        };
        // Do not attempt to register migrated chatSession providers
        if (chatSessionRegistration?.alternativeIds?.includes(id)) {
            return;
        }
        let disposable;
        if (!staticAgentRegistration && dynamicProps) {
            const extensionDescription = this._extensionService.extensions.find(e => ExtensionIdentifier.equals(e.identifier, extension));
            disposable = this._chatAgentService.registerDynamicAgent({
                id,
                name: dynamicProps.name,
                description: dynamicProps.description,
                extensionId: extension,
                extensionVersion: extensionDescription?.version,
                extensionDisplayName: extensionDescription?.displayName ?? extension.value,
                extensionPublisherId: extensionDescription?.publisher ?? '',
                publisherDisplayName: dynamicProps.publisherName,
                fullName: dynamicProps.fullName,
                metadata: revive(metadata),
                slashCommands: [],
                disambiguation: [],
                locations: [ChatAgentLocation.Chat],
                modes: [ChatModeKind.Ask, ChatModeKind.Agent, ChatModeKind.Edit],
            }, impl);
        }
        else {
            disposable = this._chatAgentService.registerAgentImplementation(id, impl);
        }
        this._agents.set(handle, {
            id: id,
            extensionId: extension,
            dispose: () => disposable.dispose(),
            hasFollowups: metadata.hasFollowups
        });
    }
    async $updateAgent(handle, metadataUpdate) {
        await this._extensionService.whenInstalledExtensionsRegistered();
        const data = this._agents.get(handle);
        if (!data) {
            this._logService.error(`MainThreadChatAgents2#$updateAgent: No agent with handle ${handle} registered`);
            return;
        }
        data.hasFollowups = metadataUpdate.hasFollowups;
        this._chatAgentService.updateAgent(data.id, revive(metadataUpdate));
    }
    async $handleProgressChunk(requestId, chunks) {
        const pendingProgress = this._pendingProgress.get(requestId);
        if (!pendingProgress) {
            this._logService.warn(`MainThreadChatAgents2#$handleProgressChunk: No pending progress for requestId ${requestId}`);
            return;
        }
        const { progress, chatSession } = pendingProgress;
        const chatProgressParts = [];
        const response = chatSession?.getRequests().find(req => req.id === requestId)?.response;
        for (const item of chunks) {
            const [progress, responsePartHandle] = Array.isArray(item) ? item : [item];
            if (progress.kind === 'externalEdits') {
                if (chatSession?.editingSession && responsePartHandle !== undefined && response) {
                    const parts = progress.start
                        ? await chatSession.editingSession.startExternalEdits(response, responsePartHandle, revive(progress.resources), progress.undoStopId)
                        : await chatSession.editingSession.stopExternalEdits(response, responsePartHandle);
                    chatProgressParts.push(...parts);
                }
                continue;
            }
            if (progress.kind === 'beginToolInvocation') {
                // Begin a streaming tool invocation
                this._languageModelToolsService.beginToolCall({
                    toolCallId: progress.toolCallId,
                    toolId: progress.toolName,
                    chatRequestId: requestId,
                    sessionResource: chatSession?.sessionResource,
                    subagentInvocationId: progress.subagentInvocationId,
                });
                continue;
            }
            if (progress.kind === 'updateToolInvocation') {
                // Update the streaming data for an existing tool invocation
                this._languageModelToolsService.updateToolStream(progress.toolCallId, progress.streamData?.partialInput, CancellationToken.None);
                continue;
            }
            if (progress.kind === 'usage') {
                if (response) {
                    response.setUsage({
                        kind: 'usage',
                        promptTokens: progress.promptTokens,
                        completionTokens: progress.completionTokens,
                        outputBuffer: progress.outputBuffer,
                        promptTokenDetails: progress.promptTokenDetails
                    });
                }
                continue;
            }
            const revivedProgress = progress.kind === 'notebookEdit'
                ? ChatNotebookEdit.fromChatEdit(progress)
                : revive(progress);
            if (revivedProgress.kind === 'notebookEdit'
                || revivedProgress.kind === 'textEdit'
                || revivedProgress.kind === 'codeblockUri') {
                // make sure to use the canonical uri
                revivedProgress.uri = this._uriIdentityService.asCanonicalUri(revivedProgress.uri);
            }
            if (responsePartHandle !== undefined) {
                if (revivedProgress.kind === 'progressTask') {
                    const handle = responsePartHandle;
                    const responsePartId = `${requestId}_${handle}`;
                    const task = new MainThreadChatTask(revivedProgress.content);
                    this._activeTasks.set(responsePartId, task);
                    chatProgressParts.push(task);
                }
                else if (responsePartHandle !== undefined) {
                    const responsePartId = `${requestId}_${responsePartHandle}`;
                    const task = this._activeTasks.get(responsePartId);
                    switch (revivedProgress.kind) {
                        case 'progressTaskResult':
                            if (task && revivedProgress.content) {
                                task.complete(revivedProgress.content.value);
                                this._activeTasks.delete(responsePartId);
                            }
                            else {
                                task?.complete(undefined);
                            }
                            break;
                        case 'warning':
                        case 'reference':
                            task?.add(revivedProgress);
                            break;
                    }
                }
                continue;
            }
            if (revivedProgress.kind === 'inlineReference' && revivedProgress.resolveId) {
                if (!this._unresolvedAnchors.has(requestId)) {
                    this._unresolvedAnchors.set(requestId, new Map());
                }
                this._unresolvedAnchors.get(requestId)?.set(revivedProgress.resolveId, revivedProgress);
            }
            chatProgressParts.push(revivedProgress);
        }
        progress(chatProgressParts);
    }
    $handleAnchorResolve(requestId, handle, resolveAnchor) {
        const anchor = this._unresolvedAnchors.get(requestId)?.get(handle);
        if (!anchor) {
            return;
        }
        this._unresolvedAnchors.get(requestId)?.delete(handle);
        if (resolveAnchor) {
            const revivedAnchor = revive(resolveAnchor);
            anchor.inlineReference = revivedAnchor.inlineReference;
        }
    }
    $registerAgentCompletionsProvider(handle, id, triggerCharacters) {
        const provide = async (query, token) => {
            const completions = await this._proxy.$invokeCompletionProvider(handle, query, token);
            return completions.map((c) => ({ ...c, icon: c.icon ? ThemeIcon.fromId(c.icon) : undefined }));
        };
        this._agentIdsToCompletionProviders.set(id, this._chatAgentService.registerAgentCompletionProvider(id, provide));
        this._agentCompletionProviders.set(handle, this._languageFeaturesService.completionProvider.register({ scheme: Schemas.vscodeChatInput, hasAccessToAllModels: true }, {
            _debugDisplayName: 'chatAgentCompletions:' + handle,
            triggerCharacters,
            provideCompletionItems: async (model, position, _context, token) => {
                const widget = this._chatWidgetService.getWidgetByInputUri(model.uri);
                if (!widget || !widget.viewModel) {
                    return;
                }
                const triggerCharsPart = triggerCharacters.map(c => escapeRegExpCharacters(c)).join('');
                const wordRegex = new RegExp(`[${triggerCharsPart}]\\S*`, 'g');
                const query = getWordAtText(position.column, wordRegex, model.getLineContent(position.lineNumber), 0)?.word ?? '';
                if (query && !triggerCharacters.some(c => query.startsWith(c))) {
                    return;
                }
                const parsedRequest = this._instantiationService.createInstance(ChatRequestParser).parseChatRequestWithReferences(getDynamicVariablesForWidget(widget), getSelectedToolAndToolSetsForWidget(widget), model.getValue()).parts;
                const agentPart = parsedRequest.find((part) => part instanceof ChatRequestAgentPart);
                const thisAgentId = this._agents.get(handle)?.id;
                if (agentPart?.agent.id !== thisAgentId) {
                    return;
                }
                const range = computeCompletionRanges(model, position, wordRegex);
                if (!range) {
                    return null;
                }
                const result = await provide(query, token);
                const variableItems = result.map(v => {
                    const insertText = v.insertText ?? (typeof v.label === 'string' ? v.label : v.label.label);
                    const rangeAfterInsert = new Range(range.insert.startLineNumber, range.insert.startColumn, range.insert.endLineNumber, range.insert.startColumn + insertText.length);
                    return {
                        label: v.label,
                        range,
                        insertText: insertText + ' ',
                        kind: 18 /* CompletionItemKind.Text */,
                        detail: v.detail,
                        documentation: v.documentation,
                        command: { id: AddDynamicVariableAction.ID, title: '', arguments: [{ id: v.id, widget, range: rangeAfterInsert, variableData: revive(v.value), command: v.command }] }
                    };
                });
                return {
                    suggestions: variableItems
                };
            }
        }));
    }
    $unregisterAgentCompletionsProvider(handle, id) {
        this._agentCompletionProviders.deleteAndDispose(handle);
        this._agentIdsToCompletionProviders.deleteAndDispose(id);
    }
    $registerChatParticipantDetectionProvider(handle) {
        this._chatParticipantDetectionProviders.set(handle, this._chatAgentService.registerChatParticipantDetectionProvider(handle, {
            provideParticipantDetection: async (request, history, options, token) => {
                return await this._proxy.$detectChatParticipant(handle, request, { history }, options, token);
            }
        }));
    }
    $unregisterChatParticipantDetectionProvider(handle) {
        this._chatParticipantDetectionProviders.deleteAndDispose(handle);
    }
    async $registerPromptFileProvider(handle, type, extensionId) {
        const extension = await this._extensionService.getExtension(extensionId.value);
        if (!extension) {
            this._logService.error(`[MainThreadChatAgents2] Could not find extension for prompt file provider: ${extensionId.value}`);
            return;
        }
        if (!isValidPromptType(type)) {
            this._logService.error(`[MainThreadChatAgents2] Invalid contribution type: ${type}`);
            return;
        }
        const emitter = new Emitter();
        this._promptFileProviderEmitters.set(handle, emitter);
        // Track content registrations for this provider so they can be disposed when provider is unregistered
        const contentRegistrations = new DisposableMap();
        this._promptFileContentRegistrations.set(handle, contentRegistrations);
        const disposable = this._promptsService.registerPromptFileProvider(extension, type, {
            onDidChangePromptFiles: emitter.event,
            providePromptFiles: async (context, token) => {
                const contributions = await this._proxy.$providePromptFiles(handle, type, context, token);
                if (!contributions) {
                    return undefined;
                }
                // Convert UriComponents to URI and register any inline content
                return contributions.map(c => {
                    return {
                        uri: URI.revive(c.uri),
                    };
                });
            }
        });
        this._promptFileProviders.set(handle, disposable);
    }
    $unregisterPromptFileProvider(handle) {
        this._promptFileProviders.deleteAndDispose(handle);
        this._promptFileProviderEmitters.deleteAndDispose(handle);
        this._promptFileContentRegistrations.deleteAndDispose(handle);
    }
    $onDidChangePromptFiles(handle) {
        const emitter = this._promptFileProviderEmitters.get(handle);
        if (emitter) {
            emitter.fire();
        }
    }
};
MainThreadChatAgents2 = __decorate([
    extHostNamedCustomer(MainContext.MainThreadChatAgents2),
    __param(1, IChatAgentService),
    __param(2, IChatSessionsService),
    __param(3, IChatService),
    __param(4, ILanguageFeaturesService),
    __param(5, IChatWidgetService),
    __param(6, IInstantiationService),
    __param(7, ILogService),
    __param(8, IExtensionService),
    __param(9, IUriIdentityService),
    __param(10, IPromptsService),
    __param(11, ILanguageModelToolsService)
], MainThreadChatAgents2);
export { MainThreadChatAgents2 };
function computeCompletionRanges(model, position, reg) {
    const varWord = getWordAtText(position.column, reg, model.getLineContent(position.lineNumber), 0);
    if (!varWord && model.getWordUntilPosition(position).word) {
        // inside a "normal" word
        return;
    }
    let insert;
    let replace;
    if (!varWord) {
        insert = replace = Range.fromPositions(position);
    }
    else {
        insert = new Range(position.lineNumber, varWord.startColumn, position.lineNumber, position.column);
        replace = new Range(position.lineNumber, varWord.startColumn, position.lineNumber, varWord.endColumn);
    }
    return { insert, replace };
}
var ChatNotebookEdit;
(function (ChatNotebookEdit) {
    function fromChatEdit(part) {
        return {
            kind: 'notebookEdit',
            uri: URI.revive(part.uri),
            done: part.done,
            edits: part.edits.map(NotebookDto.fromCellEditOperationDto)
        };
    }
    ChatNotebookEdit.fromChatEdit = fromChatEdit;
})(ChatNotebookEdit || (ChatNotebookEdit = {}));
//# sourceMappingURL=mainThreadChatAgents2.js.map