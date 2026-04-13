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
import { raceCancellationError } from '../../../base/common/async.js';
import { CancellationToken } from '../../../base/common/cancellation.js';
import { Emitter } from '../../../base/common/event.js';
import { MarkdownString } from '../../../base/common/htmlContent.js';
import { Disposable, DisposableMap, DisposableStore } from '../../../base/common/lifecycle.js';
import { ResourceMap } from '../../../base/common/map.js';
import { revive } from '../../../base/common/marshalling.js';
import { autorun, observableValue } from '../../../base/common/observable.js';
import { isEqual } from '../../../base/common/resources.js';
import { URI } from '../../../base/common/uri.js';
import { localize } from '../../../nls.js';
import { IDialogService } from '../../../platform/dialogs/common/dialogs.js';
import { IInstantiationService } from '../../../platform/instantiation/common/instantiation.js';
import { ILogService } from '../../../platform/log/common/log.js';
import { hasValidDiff } from '../../contrib/chat/browser/agentSessions/agentSessionsModel.js';
import { IAgentSessionsService } from '../../contrib/chat/browser/agentSessions/agentSessionsService.js';
import { IChatWidgetService, isIChatViewViewContext } from '../../contrib/chat/browser/chat.js';
import { ChatEditorInput } from '../../contrib/chat/browser/widgetHosts/editor/chatEditorInput.js';
import { awaitStatsForSession } from '../../contrib/chat/common/chat.js';
import { IChatService } from '../../contrib/chat/common/chatService/chatService.js';
import { IChatSessionsService } from '../../contrib/chat/common/chatSessionsService.js';
import { ChatAgentLocation } from '../../contrib/chat/common/constants.js';
import { isUntitledChatSession } from '../../contrib/chat/common/model/chatUri.js';
import { IChatArtifactsService } from '../../contrib/chat/common/tools/chatArtifactsService.js';
import { IChatTodoListService } from '../../contrib/chat/common/tools/chatTodoListService.js';
import { IEditorGroupsService } from '../../services/editor/common/editorGroupsService.js';
import { IEditorService } from '../../services/editor/common/editorService.js';
import { extHostNamedCustomer } from '../../services/extensions/common/extHostCustomers.js';
import { ExtHostContext, MainContext } from '../common/extHost.protocol.js';
export class ObservableChatSession extends Disposable {
    get options() {
        return this._options;
    }
    get progressObs() {
        return this._progressObservable;
    }
    get isCompleteObs() {
        return this._isCompleteObservable;
    }
    constructor(resource, providerHandle, proxy, logService, dialogService) {
        super();
        this._progressObservable = observableValue(this, []);
        this._isCompleteObservable = observableValue(this, false);
        this._onWillDispose = new Emitter();
        this.onWillDispose = this._onWillDispose.event;
        this._pendingProgressChunks = new Map();
        this._isInitialized = false;
        this._interruptionWasCanceled = false;
        this._disposalPending = false;
        this.sessionResource = resource;
        this.providerHandle = providerHandle;
        this.history = [];
        this._proxy = proxy;
        this._providerHandle = providerHandle;
        this._logService = logService;
        this._dialogService = dialogService;
    }
    initialize(token, context) {
        if (!this._initializationPromise) {
            this._initializationPromise = this._doInitializeContent(token, context);
        }
        return this._initializationPromise;
    }
    async _doInitializeContent(token, context) {
        try {
            const sessionContent = await raceCancellationError(this._proxy.$provideChatSessionContent(this._providerHandle, this.sessionResource, context, token), token);
            this._options = sessionContent.options;
            this.title = sessionContent.title;
            this.history.length = 0;
            this.history.push(...sessionContent.history.map((turn) => {
                if (turn.type === 'request') {
                    const variables = turn.variableData?.variables.map(v => {
                        const entry = {
                            ...v,
                            value: revive(v.value)
                        };
                        return entry;
                    });
                    return {
                        type: 'request',
                        prompt: turn.prompt,
                        participant: turn.participant,
                        command: turn.command,
                        variableData: variables ? { variables } : undefined,
                        id: turn.id,
                        modelId: turn.modelId,
                    };
                }
                return {
                    type: 'response',
                    parts: turn.parts.map((part) => revive(part)),
                    participant: turn.participant
                };
            }));
            if (sessionContent.hasActiveResponseCallback && !this.interruptActiveResponseCallback) {
                this.interruptActiveResponseCallback = async () => {
                    const confirmInterrupt = () => {
                        if (this._disposalPending) {
                            this._proxy.$disposeChatSessionContent(this._providerHandle, this.sessionResource);
                            this._disposalPending = false;
                        }
                        this._proxy.$interruptChatSessionActiveResponse(this._providerHandle, this.sessionResource, 'ongoing');
                        return true;
                    };
                    if (sessionContent.supportsInterruption) {
                        // If the session supports hot reload, interrupt without confirmation
                        return confirmInterrupt();
                    }
                    // Prompt the user to confirm interruption
                    return this._dialogService.confirm({
                        message: localize(3354, null)
                    }).then(confirmed => {
                        if (confirmed.confirmed) {
                            // User confirmed interruption - dispose the session content on extension host
                            return confirmInterrupt();
                        }
                        else {
                            // When user cancels the interruption, fire an empty progress message to keep the session alive
                            // This matches the behavior of the old implementation
                            this._addProgress([{
                                    kind: 'progressMessage',
                                    content: { value: '', isTrusted: false }
                                }]);
                            // Set flag to prevent completion when extension host calls handleProgressComplete
                            this._interruptionWasCanceled = true;
                            // User canceled interruption - cancel the deferred disposal
                            if (this._disposalPending) {
                                this._logService.info(`Canceling deferred disposal for session ${this.sessionResource} (user canceled interruption)`);
                                this._disposalPending = false;
                            }
                            return false;
                        }
                    });
                };
            }
            if (sessionContent.hasRequestHandler && !this.requestHandler) {
                this.requestHandler = async (request, progress, history, token) => {
                    // Clear previous progress and mark as active
                    this._progressObservable.set([], undefined);
                    this._isCompleteObservable.set(false, undefined);
                    // Set up reactive progress observation before starting the request
                    let lastProgressLength = 0;
                    const progressDisposable = autorun(reader => {
                        const progressArray = this._progressObservable.read(reader);
                        const isComplete = this._isCompleteObservable.read(reader);
                        if (progressArray.length > lastProgressLength) {
                            const newProgress = progressArray.slice(lastProgressLength);
                            progress(newProgress);
                            lastProgressLength = progressArray.length;
                        }
                        if (isComplete) {
                            progressDisposable.dispose();
                        }
                    });
                    try {
                        await this._proxy.$invokeChatSessionRequestHandler(this._providerHandle, this.sessionResource, request, history, token);
                        // Only mark as complete if there's no active response callback
                        // Sessions with active response callbacks should only complete when explicitly told to via handleProgressComplete
                        if (!this._isCompleteObservable.get() && !this.interruptActiveResponseCallback) {
                            this._markComplete();
                        }
                    }
                    catch (error) {
                        const errorProgress = {
                            kind: 'progressMessage',
                            content: { value: `Error: ${error instanceof Error ? error.message : String(error)}`, isTrusted: false }
                        };
                        this._addProgress([errorProgress]);
                        this._markComplete();
                        throw error;
                    }
                    finally {
                        // Ensure progress observation is cleaned up
                        progressDisposable.dispose();
                    }
                };
            }
            if (sessionContent.hasForkHandler && !this.forkSession) {
                this.forkSession = async (request, token) => {
                    const result = await this._proxy.$forkChatSession(this._providerHandle, this.sessionResource, request ? this.toRequestDto(request) : undefined, token);
                    return revive(result);
                };
            }
            this._isInitialized = true;
            // Process any pending progress chunks
            const hasActiveResponse = sessionContent.hasActiveResponseCallback;
            const hasRequestHandler = sessionContent.hasRequestHandler;
            const hasAnyCapability = hasActiveResponse || hasRequestHandler;
            for (const [requestId, chunks] of this._pendingProgressChunks) {
                this._logService.debug(`Processing ${chunks.length} pending progress chunks for session ${this.sessionResource}, requestId ${requestId}`);
                this._addProgress(chunks);
            }
            this._pendingProgressChunks.clear();
            // If session has no active response callback and no request handler, mark it as complete
            if (!hasAnyCapability) {
                this._isCompleteObservable.set(true, undefined);
            }
        }
        catch (error) {
            this._logService.error(`Failed to initialize chat session ${this.sessionResource}:`, error);
            throw error;
        }
    }
    /**
     * Handle progress chunks coming from the extension host.
     * If the session is not initialized yet, the chunks will be queued.
     */
    handleProgressChunk(requestId, progress) {
        if (!this._isInitialized) {
            const existing = this._pendingProgressChunks.get(requestId) || [];
            this._pendingProgressChunks.set(requestId, [...existing, ...progress]);
            this._logService.debug(`Queuing ${progress.length} progress chunks for session ${this.sessionResource}, requestId ${requestId} (session not initialized)`);
            return;
        }
        this._addProgress(progress);
    }
    /**
     * Handle progress completion from the extension host.
     */
    handleProgressComplete(requestId) {
        // Clean up any pending chunks for this request
        this._pendingProgressChunks.delete(requestId);
        if (this._isInitialized) {
            // Don't mark as complete if user canceled the interruption
            if (!this._interruptionWasCanceled) {
                this._markComplete();
            }
            else {
                // Reset the flag and don't mark as complete
                this._interruptionWasCanceled = false;
            }
        }
    }
    _addProgress(progress) {
        const currentProgress = this._progressObservable.get();
        this._progressObservable.set([...currentProgress, ...progress], undefined);
    }
    _markComplete() {
        if (!this._isCompleteObservable.get()) {
            this._isCompleteObservable.set(true, undefined);
        }
    }
    toRequestDto(request) {
        return {
            type: 'request',
            id: request.id,
            prompt: request.prompt,
            participant: request.participant,
            command: request.command,
            variableData: undefined,
            modelId: request.modelId,
        };
    }
    dispose() {
        this._onWillDispose.fire();
        this._onWillDispose.dispose();
        this._pendingProgressChunks.clear();
        // If this session has an active response callback and disposal is happening,
        // defer the actual session content disposal until we know the user's choice
        if (this.interruptActiveResponseCallback && !this._interruptionWasCanceled) {
            this._disposalPending = true;
            // The actual disposal will happen in the interruption callback based on user's choice
        }
        else {
            // No active response callback or user already canceled interruption - dispose immediately
            this._proxy.$disposeChatSessionContent(this._providerHandle, this.sessionResource);
        }
        super.dispose();
    }
}
let MainThreadChatSessionItemController = class MainThreadChatSessionItemController extends Disposable {
    constructor(proxy, chatSessionType, handle, chatService, _logService) {
        super();
        this._logService = _logService;
        this._onDidChangeChatSessionItems = this._register(new Emitter());
        this.onDidChangeChatSessionItems = this._onDidChangeChatSessionItems.event;
        this._items = new ResourceMap();
        this._proxy = proxy;
        this._handle = handle;
        this._register(chatService.registerChatModelChangeListeners(chatSessionType, (sessionResource) => {
            const item = this._items.get(sessionResource);
            if (item) {
                this._onDidChangeChatSessionItems.fire({ addedOrUpdated: [item] });
            }
        }));
    }
    get items() {
        return Array.from(this._items.values());
    }
    refresh(token) {
        return this._proxy.$refreshChatSessionItems(this._handle, token);
    }
    async newChatSessionItem(request, token) {
        const dto = await raceCancellationError(this._proxy.$newChatSessionItem(this._handle, request, token), token);
        if (!dto) {
            return undefined;
        }
        const item = {
            ...dto,
            resource: URI.revive(dto.resource),
            changes: revive(dto.changes),
        };
        this._items.set(item.resource, item);
        this._onDidChangeChatSessionItems.fire({
            addedOrUpdated: [item],
        });
        return item;
    }
    acceptChange(change) {
        for (const item of change.addedOrUpdated) {
            warnOnUntitledSessionResource(item.resource, this._logService);
            this._items.set(item.resource, item);
        }
        for (const uri of change.removed) {
            this._items.delete(uri);
        }
        this._onDidChangeChatSessionItems.fire({
            addedOrUpdated: change.addedOrUpdated,
            removed: change.removed,
        });
    }
    addOrUpdateItem(item) {
        warnOnUntitledSessionResource(item.resource, this._logService);
        this._items.set(item.resource, item);
        this._onDidChangeChatSessionItems.fire({
            addedOrUpdated: [item],
        });
    }
};
MainThreadChatSessionItemController = __decorate([
    __param(3, IChatService),
    __param(4, ILogService)
], MainThreadChatSessionItemController);
let MainThreadChatSessions = class MainThreadChatSessions extends Disposable {
    constructor(_extHostContext, _agentSessionsService, _chatSessionsService, _chatService, _chatWidgetService, _chatTodoListService, _chatArtifactsService, _dialogService, _editorService, editorGroupService, _logService, _instantiationService) {
        super();
        this._extHostContext = _extHostContext;
        this._agentSessionsService = _agentSessionsService;
        this._chatSessionsService = _chatSessionsService;
        this._chatService = _chatService;
        this._chatWidgetService = _chatWidgetService;
        this._chatTodoListService = _chatTodoListService;
        this._chatArtifactsService = _chatArtifactsService;
        this._dialogService = _dialogService;
        this._editorService = _editorService;
        this.editorGroupService = editorGroupService;
        this._logService = _logService;
        this._instantiationService = _instantiationService;
        this._itemControllerRegistrations = this._register(new DisposableMap());
        this._contentProvidersRegistrations = this._register(new DisposableMap());
        this._sessionTypeToHandle = new Map();
        this._activeSessions = new ResourceMap();
        this._sessionDisposables = new ResourceMap();
        this._proxy = this._extHostContext.getProxy(ExtHostContext.ExtHostChatSessions);
        this._register(this._chatSessionsService.onRequestNotifyExtension(({ sessionResource, updates, waitUntil }) => {
            warnOnUntitledSessionResource(sessionResource, this._logService);
            const handle = this._getHandleForSessionType(sessionResource.scheme);
            this._logService.trace(`[MainThreadChatSessions] onRequestNotifyExtension received: scheme '${sessionResource.scheme}', handle ${handle}, ${updates.length} update(s)`);
            if (handle !== undefined) {
                waitUntil(this.notifyOptionsChange(handle, sessionResource, updates));
            }
            else {
                this._logService.warn(`[MainThreadChatSessions] Cannot notify option change for scheme '${sessionResource.scheme}': no provider registered. Registered schemes: [${Array.from(this._sessionTypeToHandle.keys()).join(', ')}]`);
            }
        }));
        this._register(this._agentSessionsService.model.onDidChangeSessionArchivedState(session => {
            for (const [handle, { chatSessionType }] of this._itemControllerRegistrations) {
                if (chatSessionType === session.providerType) {
                    warnOnUntitledSessionResource(session.resource, this._logService);
                    this._proxy.$onDidChangeChatSessionItemState(handle, session.resource, session.isArchived());
                }
            }
        }));
    }
    _getHandleForSessionType(chatSessionType) {
        return this._sessionTypeToHandle.get(chatSessionType);
    }
    $registerChatSessionItemController(handle, chatSessionType) {
        const disposables = new DisposableStore();
        const controller = disposables.add(this._instantiationService.createInstance(MainThreadChatSessionItemController, this._proxy, chatSessionType, handle));
        disposables.add(this._chatSessionsService.registerChatSessionItemController(chatSessionType, controller));
        this._itemControllerRegistrations.set(handle, {
            chatSessionType,
            controller,
            dispose: () => disposables.dispose(),
        });
    }
    getController(handle) {
        const registration = this._itemControllerRegistrations.get(handle);
        if (!registration) {
            throw new Error(`No chat session controller registered for handle ${handle}`);
        }
        return registration.controller;
    }
    async _resolveSessionItem(item) {
        const uri = URI.revive(item.resource);
        const model = this._chatService.getSession(uri);
        if (model) {
            item = await this.handleSessionModelOverrides(model, item);
        }
        // We can still get stats if there is no model or if fetching from model failed
        if (!item.changes || !model) {
            const stats = (await this._chatService.getMetadataForSession(uri))?.stats;
            const diffs = {
                files: stats?.fileCount || 0,
                insertions: stats?.added || 0,
                deletions: stats?.removed || 0
            };
            if (hasValidDiff(diffs)) {
                item.changes = diffs;
            }
        }
        return {
            ...item,
            changes: revive(item.changes),
            resource: uri,
            iconPath: item.iconPath,
            tooltip: item.tooltip ? this._reviveTooltip(item.tooltip) : undefined,
            archived: item.archived,
        };
    }
    async $updateChatSessionItems(controllerHandle, change) {
        const controller = this.getController(controllerHandle);
        const resolvedItems = await Promise.all(change.addedOrUpdated.map(item => this._resolveSessionItem(item)));
        controller.acceptChange({
            addedOrUpdated: resolvedItems,
            removed: change.removed.map(uri => URI.revive(uri))
        });
    }
    async $addOrUpdateChatSessionItem(controllerHandle, item) {
        const controller = this.getController(controllerHandle);
        const resolvedItem = await this._resolveSessionItem(item);
        controller.addOrUpdateItem(resolvedItem);
    }
    $onDidChangeChatSessionOptions(handle, sessionResourceComponents, updates) {
        const sessionResource = URI.revive(sessionResourceComponents);
        warnOnUntitledSessionResource(sessionResource, this._logService);
        this._chatSessionsService.notifySessionOptionsChange(sessionResource, updates);
    }
    async $onDidCommitChatSessionItem(handle, originalComponents, modifiedCompoennts) {
        const originalResource = URI.revive(originalComponents);
        const modifiedResource = URI.revive(modifiedCompoennts);
        this._logService.trace(`$onDidCommitChatSessionItem: handle(${handle}), original(${originalResource}), modified(${modifiedResource})`);
        const chatSessionType = this._itemControllerRegistrations.get(handle)?.chatSessionType;
        if (!chatSessionType) {
            this._logService.error(`No chat session type found for provider handle ${handle}`);
            return;
        }
        const originalEditor = this._editorService.editors.find(editor => editor.resource?.toString() === originalResource.toString());
        const originalModel = this._chatService.acquireExistingSession(originalResource);
        const contribution = this._chatSessionsService.getAllChatSessionContributions().find(c => c.type === chatSessionType);
        try {
            // Migrate todos from old session to new session
            this._chatTodoListService.migrateTodos(originalResource, modifiedResource);
            // Migrate artifacts from old session to new session
            this._chatArtifactsService.migrateArtifacts(originalResource, modifiedResource);
            // Find the group containing the original editor
            const originalGroup = this.editorGroupService.groups.find(group => group.editors.some(editor => isEqual(editor.resource, originalResource)))
                ?? this.editorGroupService.activeGroup;
            const options = {
                title: {
                    preferred: originalEditor?.getName() || undefined,
                    fallback: localize(3355, null, contribution?.displayName),
                }
            };
            // Prefetch the chat session content to make the subsequent editor swap quick
            const newSession = await this._chatSessionsService.getOrCreateChatSession(URI.revive(modifiedResource), CancellationToken.None);
            if (originalEditor) {
                newSession.transferredState = originalEditor instanceof ChatEditorInput
                    ? { editingSession: originalEditor.transferOutEditingSession(), inputState: originalModel?.object?.inputModel.toJSON() }
                    : undefined;
                await this._editorService.replaceEditors([{
                        editor: originalEditor,
                        replacement: {
                            resource: modifiedResource,
                            options,
                        },
                    }], originalGroup);
                // Re-send queued requests from the original session on the committed session
                this._resendPendingRequests(originalResource, modifiedResource);
                return;
            }
            // If chat editor is in the side panel, then those are not listed as editors.
            // In that case we need to transfer editing session using the original model.
            if (originalModel) {
                newSession.transferredState = {
                    editingSession: originalModel.object.editingSession,
                    inputState: originalModel.object.inputModel.toJSON()
                };
            }
            const chatViewWidget = this._chatWidgetService.getWidgetBySessionResource(originalResource);
            if (chatViewWidget && isIChatViewViewContext(chatViewWidget.viewContext)) {
                await this._chatWidgetService.openSession(modifiedResource, undefined, { preserveFocus: true });
            }
            else {
                // Loading the session to ensure the session is created and editing session is transferred.
                const ref = await this._chatService.acquireOrLoadSession(modifiedResource, ChatAgentLocation.Chat, CancellationToken.None);
                ref?.dispose();
            }
            // Re-send queued requests from the original session on the committed session
            this._resendPendingRequests(originalResource, modifiedResource);
        }
        finally {
            originalModel?.dispose();
        }
    }
    /**
     * Re-sends pending and in-flight requests from the original session on the committed session.
     */
    _resendPendingRequests(originalResource, modifiedResource) {
        this._chatService.migrateRequests(originalResource, modifiedResource);
    }
    async handleSessionModelOverrides(model, session) {
        // Override desciription if there's an in-progress count
        const inProgress = model.getRequests().filter(r => r.response && !r.response.isComplete);
        if (inProgress.length) {
            session.description = this._chatSessionsService.getInProgressSessionDescription(model);
        }
        // Override changes
        // TODO: @osortega we don't really use statistics anymore, we need to clarify that in the API
        if (!(session.changes instanceof Array)) {
            const modelStats = await awaitStatsForSession(model);
            if (modelStats) {
                session.changes = {
                    files: modelStats.fileCount,
                    insertions: modelStats.added,
                    deletions: modelStats.removed
                };
            }
        }
        // Override status if the models needs input
        if (model.lastRequest?.response?.state === 4 /* ResponseModelState.NeedsInput */) {
            session.status = 3 /* ChatSessionStatus.NeedsInput */;
        }
        return session;
    }
    async _provideChatSessionContent(providerHandle, sessionResource, token) {
        warnOnUntitledSessionResource(sessionResource, this._logService);
        let session = this._activeSessions.get(sessionResource);
        if (!session) {
            session = new ObservableChatSession(sessionResource, providerHandle, this._proxy, this._logService, this._dialogService);
            this._activeSessions.set(sessionResource, session);
            const disposable = session.onWillDispose(() => {
                this._activeSessions.delete(sessionResource);
                this._sessionDisposables.get(sessionResource)?.dispose();
                this._sessionDisposables.delete(sessionResource);
            });
            this._sessionDisposables.set(sessionResource, disposable);
        }
        try {
            const initialSessionOptions = this._chatSessionsService.getSessionOptions(sessionResource);
            await session.initialize(token, {
                initialSessionOptions: initialSessionOptions ? [...initialSessionOptions].map(([optionId, value]) => ({ optionId, value })) : undefined,
            });
            if (session.options) {
                for (const [_, handle] of this._sessionTypeToHandle) {
                    if (handle === providerHandle) {
                        for (const [optionId, value] of Object.entries(session.options)) {
                            this._chatSessionsService.setSessionOption(sessionResource, optionId, value);
                        }
                        break;
                    }
                }
            }
            return session;
        }
        catch (error) {
            session.dispose();
            this._logService.error(`Error providing chat session content for handle ${providerHandle} and resource ${sessionResource.toString()}:`, error);
            throw error;
        }
    }
    $unregisterChatSessionItemController(handle) {
        this._itemControllerRegistrations.deleteAndDispose(handle);
    }
    $registerChatSessionContentProvider(handle, chatSessionScheme) {
        const provider = {
            provideChatSessionContent: (resource, token) => this._provideChatSessionContent(handle, resource, token)
        };
        this._sessionTypeToHandle.set(chatSessionScheme, handle);
        this._contentProvidersRegistrations.set(handle, this._chatSessionsService.registerChatSessionContentProvider(chatSessionScheme, provider));
        this._refreshProviderOptions(handle, chatSessionScheme);
    }
    $unregisterChatSessionContentProvider(handle) {
        this._contentProvidersRegistrations.deleteAndDispose(handle);
        for (const [sessionType, h] of this._sessionTypeToHandle) {
            if (h === handle) {
                this._sessionTypeToHandle.delete(sessionType);
                break;
            }
        }
        // dispose all sessions from this provider and clean up its disposables
        for (const [key, session] of this._activeSessions) {
            if (session.providerHandle === handle) {
                session.dispose();
                this._activeSessions.delete(key);
            }
        }
    }
    async $handleProgressChunk(handle, sessionResource, requestId, chunks) {
        const resource = URI.revive(sessionResource);
        const observableSession = this._activeSessions.get(resource);
        if (!observableSession) {
            this._logService.warn(`No session found for progress chunks: handle ${handle}, sessionResource ${resource}, requestId ${requestId}`);
            return;
        }
        const chatProgressParts = chunks.map(chunk => {
            const [progress] = Array.isArray(chunk) ? chunk : [chunk];
            return revive(progress);
        });
        observableSession.handleProgressChunk(requestId, chatProgressParts);
    }
    $handleProgressComplete(handle, sessionResource, requestId) {
        const resource = URI.revive(sessionResource);
        warnOnUntitledSessionResource(resource, this._logService);
        const observableSession = this._activeSessions.get(resource);
        if (!observableSession) {
            this._logService.warn(`No session found for progress completion: handle ${handle}, sessionResource ${resource}, requestId ${requestId}`);
            return;
        }
        observableSession.handleProgressComplete(requestId);
    }
    $handleAnchorResolve(handle, sesssionResource, requestId, requestHandle, anchor) {
        // throw new Error('Method not implemented.');
    }
    $onDidChangeChatSessionProviderOptions(handle) {
        let sessionType;
        for (const [type, h] of this._sessionTypeToHandle) {
            if (h === handle) {
                sessionType = type;
                break;
            }
        }
        if (!sessionType) {
            this._logService.warn(`No session type found for chat session content provider handle ${handle} when refreshing provider options`);
            return;
        }
        this._refreshProviderOptions(handle, sessionType);
    }
    _refreshProviderOptions(handle, chatSessionScheme) {
        this._proxy.$provideChatSessionProviderOptions(handle, CancellationToken.None).then(options => {
            if (options?.optionGroups && options.optionGroups.length) {
                const groupsWithCallbacks = options.optionGroups.map(group => ({
                    ...group,
                    onSearch: group.searchable ? async (query, token) => {
                        return await this._proxy.$invokeOptionGroupSearch(handle, group.id, query, token);
                    } : undefined,
                }));
                this._chatSessionsService.setOptionGroupsForSessionType(chatSessionScheme, handle, groupsWithCallbacks);
            }
            if (options?.newSessionOptions) {
                this._chatSessionsService.setNewSessionOptionsForSessionType(chatSessionScheme, options.newSessionOptions);
            }
        }).catch(err => this._logService.error('Error fetching chat session options', err));
    }
    dispose() {
        for (const session of this._activeSessions.values()) {
            session.dispose();
        }
        this._activeSessions.clear();
        for (const disposable of this._sessionDisposables.values()) {
            disposable.dispose();
        }
        this._sessionDisposables.clear();
        super.dispose();
    }
    _reviveTooltip(tooltip) {
        if (!tooltip) {
            return undefined;
        }
        // If it's already a string, return as-is
        if (typeof tooltip === 'string') {
            return tooltip;
        }
        // If it's a serialized IMarkdownString, revive it to MarkdownString
        if (typeof tooltip === 'object' && 'value' in tooltip) {
            return MarkdownString.lift(tooltip);
        }
        return undefined;
    }
    /**
     * Notify the extension about option changes for a session
     */
    async notifyOptionsChange(handle, sessionResource, updates) {
        this._logService.trace(`[MainThreadChatSessions] notifyOptionsChange: starting proxy call for handle ${handle}, sessionResource ${sessionResource}`);
        try {
            await this._proxy.$provideHandleOptionsChange(handle, sessionResource, updates, CancellationToken.None);
            this._logService.trace(`[MainThreadChatSessions] notifyOptionsChange: proxy call completed for handle ${handle}, sessionResource ${sessionResource}`);
        }
        catch (error) {
            this._logService.error(`[MainThreadChatSessions] notifyOptionsChange: error for handle ${handle}, sessionResource ${sessionResource}:`, error);
        }
    }
};
MainThreadChatSessions = __decorate([
    extHostNamedCustomer(MainContext.MainThreadChatSessions),
    __param(1, IAgentSessionsService),
    __param(2, IChatSessionsService),
    __param(3, IChatService),
    __param(4, IChatWidgetService),
    __param(5, IChatTodoListService),
    __param(6, IChatArtifactsService),
    __param(7, IDialogService),
    __param(8, IEditorService),
    __param(9, IEditorGroupsService),
    __param(10, ILogService),
    __param(11, IInstantiationService)
], MainThreadChatSessions);
export { MainThreadChatSessions };
function warnOnUntitledSessionResource(resource, logService) {
    if (isUntitledChatSession(resource)) {
        logService.warn(`[MainThreadChatSessions] untitled-style sessionResource detected ${resource.toString()}`);
    }
}
//# sourceMappingURL=mainThreadChatSessions.js.map