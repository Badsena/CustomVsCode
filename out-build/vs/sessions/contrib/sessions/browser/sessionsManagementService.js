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
import { Disposable, DisposableStore, MutableDisposable } from '../../../../base/common/lifecycle.js';
import { CancellationToken } from '../../../../base/common/cancellation.js';
import { observableValue } from '../../../../base/common/observable.js';
import { URI } from '../../../../base/common/uri.js';
import { localize } from '../../../../nls.js';
import { createDecorator, IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { IContextKeyService, RawContextKey } from '../../../../platform/contextkey/common/contextkey.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { IStorageService } from '../../../../platform/storage/common/storage.js';
import { openSession as openSessionDefault } from '../../../../workbench/contrib/chat/browser/agentSessions/agentSessionsOpener.js';
import { ChatViewPaneTarget, IChatWidgetService } from '../../../../workbench/contrib/chat/browser/chat.js';
import { IChatSessionsService } from '../../../../workbench/contrib/chat/common/chatSessionsService.js';
import { IChatService } from '../../../../workbench/contrib/chat/common/chatService/chatService.js';
import { ChatAgentLocation, ChatModeKind, ChatPermissionLevel } from '../../../../workbench/contrib/chat/common/constants.js';
import { isAgentSession } from '../../../../workbench/contrib/chat/browser/agentSessions/agentSessionsModel.js';
import { IAgentSessionsService } from '../../../../workbench/contrib/chat/browser/agentSessions/agentSessionsService.js';
import { ICommandService } from '../../../../platform/commands/common/commands.js';
import { AgentSessionProviders } from '../../../../workbench/contrib/chat/browser/agentSessions/agentSessions.js';
import { CopilotCLISession, RemoteNewSession } from '../../chat/browser/newSession.js';
import { IUriIdentityService } from '../../../../platform/uriIdentity/common/uriIdentity.js';
import { isBuiltinChatMode } from '../../../../workbench/contrib/chat/common/chatModes.js';
import { ILanguageModelsService } from '../../../../workbench/contrib/chat/common/languageModels.js';
import { ILanguageModelToolsService } from '../../../../workbench/contrib/chat/common/tools/languageModelToolsService.js';
import { GITHUB_REMOTE_FILE_SCHEME } from '../common/sessionWorkspace.js';
import { ResourceSet } from '../../../../base/common/map.js';
export const IsNewChatSessionContext = new RawContextKey('isNewChatSession', true);
/**
 * True when the active session uses the Background provider type (copilotcli).
 * Used to gate actions that require a local worktree (run script, open in VS Code, terminal).
 */
export const IsActiveSessionBackgroundProviderContext = new RawContextKey('isActiveSessionBackgroundProvider', false, localize(3301, null));
//#region Active Session Service
const LAST_SELECTED_SESSION_KEY = 'agentSessions.lastSelectedSession';
export const ISessionsManagementService = createDecorator('sessionsManagementService');
let SessionsManagementService = class SessionsManagementService extends Disposable {
    constructor(storageService, uriIdentityService, agentSessionsService, chatSessionsService, chatWidgetService, chatService, instantiationService, logService, contextKeyService, commandService, languageModelsService, toolsService) {
        super();
        this.storageService = storageService;
        this.uriIdentityService = uriIdentityService;
        this.agentSessionsService = agentSessionsService;
        this.chatSessionsService = chatSessionsService;
        this.chatWidgetService = chatWidgetService;
        this.chatService = chatService;
        this.instantiationService = instantiationService;
        this.logService = logService;
        this.commandService = commandService;
        this.languageModelsService = languageModelsService;
        this.toolsService = toolsService;
        this._activeSession = observableValue(this, undefined);
        this.activeSession = this._activeSession;
        this._newActiveSessionDisposables = this._register(new DisposableStore());
        this._newSession = this._register(new MutableDisposable());
        // Bind context key to active session state.
        // isNewSession is false when there are any established sessions in the model.
        this.isNewChatSessionContext = IsNewChatSessionContext.bindTo(contextKeyService);
        this._isBackgroundProvider = IsActiveSessionBackgroundProviderContext.bindTo(contextKeyService);
        // Load last selected session
        this.lastSelectedSession = this.loadLastSelectedSession();
        // Save on shutdown
        this._register(this.storageService.onWillSaveState(() => this.saveLastSelectedSession()));
        // Update active session when the agent sessions model changes (e.g., metadata updates with worktree/repository info)
        this._register(this.agentSessionsService.model.onDidChangeSessions(() => this.refreshActiveSessionFromModel()));
        // Clear active session if the active session gets archived
        this._register(this.agentSessionsService.model.onDidChangeSessionArchivedState(e => {
            if (e.isArchived()) {
                const currentActive = this._activeSession.get();
                if (currentActive && currentActive.resource.toString() === e.resource.toString()) {
                    this.openNewSessionView();
                }
            }
        }));
    }
    refreshActiveSessionFromModel() {
        const currentActive = this._activeSession.get();
        if (!currentActive) {
            return;
        }
        if (currentActive.isUntitled) {
            return;
        }
        const agentSession = this.agentSessionsService.model.getSession(currentActive.resource);
        if (agentSession) {
            this.setActiveSession(agentSession);
        }
        else {
            this.showNextSession();
        }
    }
    showNextSession() {
        const sessions = this.agentSessionsService.model.sessions
            .filter(s => !s.isArchived())
            .sort((a, b) => (b.timing.lastRequestEnded ?? b.timing.created) - (a.timing.lastRequestEnded ?? a.timing.created));
        if (sessions.length > 0) {
            this.setActiveSession(sessions[0]);
            this.instantiationService.invokeFunction(openSessionDefault, sessions[0]);
        }
        else {
            this.openNewSessionView();
        }
    }
    getRepositoryFromMetadata(session) {
        const metadata = session.metadata;
        if (!metadata) {
            return [undefined, undefined, undefined, undefined];
        }
        if (session.providerType === AgentSessionProviders.Cloud) {
            //TODO: @osortega pass branch in metadata from extension
            const branch = typeof metadata.branch === 'string' ? metadata.branch : 'HEAD';
            const repositoryUri = URI.from({
                scheme: GITHUB_REMOTE_FILE_SCHEME,
                authority: 'github',
                path: `/${metadata.owner}/${metadata.name}/${encodeURIComponent(branch)}`
            });
            return [repositoryUri, undefined, undefined, undefined];
        }
        const workingDirectoryPath = metadata?.workingDirectoryPath;
        if (workingDirectoryPath) {
            return [URI.file(workingDirectoryPath), undefined, undefined, undefined];
        }
        const repositoryPath = metadata?.repositoryPath;
        const repositoryPathUri = typeof repositoryPath === 'string' ? URI.file(repositoryPath) : undefined;
        const worktreePath = metadata?.worktreePath;
        const worktreePathUri = typeof worktreePath === 'string' ? URI.file(worktreePath) : undefined;
        const worktreeBranchName = metadata?.branchName;
        const worktreeBaseBranchProtected = metadata?.baseBranchProtected;
        return [
            URI.isUri(repositoryPathUri) ? repositoryPathUri : undefined,
            URI.isUri(worktreePathUri) ? worktreePathUri : undefined,
            worktreeBranchName,
            worktreeBaseBranchProtected
        ];
    }
    getActiveSession() {
        return this._activeSession.get();
    }
    async openSession(sessionResource, openOptions) {
        const existingSession = this.agentSessionsService.model.getSession(sessionResource);
        if (!existingSession) {
            this.logService.warn(`[SessionsManagement] openSession: session not found in model: ${sessionResource.toString()}, model has ${this.agentSessionsService.model.sessions.length} sessions with types: ${[...new Set(this.agentSessionsService.model.sessions.map(s => s.providerType))].join(', ')}`);
            throw new Error(`Session with resource ${sessionResource.toString()} not found`);
        }
        this.logService.info(`[SessionsManagement] openSession: ${sessionResource.toString()} provider=${existingSession.providerType}`);
        this.isNewChatSessionContext.set(false);
        this.setActiveSession(existingSession);
        await this.instantiationService.invokeFunction(openSessionDefault, existingSession, openOptions);
    }
    async createNewSessionForTarget(target, sessionResource, defaultRepoUri) {
        if (!this.isNewChatSessionContext.get()) {
            this.isNewChatSessionContext.set(true);
        }
        let newSession;
        if (target === AgentSessionProviders.Background) {
            newSession = this.instantiationService.createInstance(CopilotCLISession, sessionResource, defaultRepoUri);
        }
        else {
            newSession = this.instantiationService.createInstance(RemoteNewSession, sessionResource, target);
        }
        this._newSession.value = newSession;
        this.setActiveSession(newSession);
        return newSession;
    }
    async sendRequestForNewSession(sessionResource, options) {
        const session = this._newSession.value;
        if (!session) {
            this.logService.error(`[SessionsManagementService] No new session found for resource: ${sessionResource.toString()}`);
            return;
        }
        if (!this.uriIdentityService.extUri.isEqual(sessionResource, session.resource)) {
            this.logService.error(`[SessionsManagementService] Session resource mismatch. Expected: ${session.resource.toString()}, received: ${sessionResource.toString()}`);
            return;
        }
        const query = session.query;
        if (!query) {
            this.logService.error('[SessionsManagementService] No query set on session');
            return;
        }
        const contribution = this.chatSessionsService.getChatSessionContribution(session.target);
        // Resolve mode from session's modeId (falls back to Agent)
        const modeKind = session.mode?.kind ?? ChatModeKind.Agent;
        const modeIsBuiltin = session.mode ? isBuiltinChatMode(session.mode) : true;
        const modeId = modeIsBuiltin ? modeKind : 'custom';
        const rawModeInstructions = session.mode?.modeInstructions?.get();
        const modeInstructions = rawModeInstructions ? {
            name: session.mode.name.get(),
            content: rawModeInstructions.content,
            toolReferences: this.toolsService.toToolReferences(rawModeInstructions.toolReferences),
            metadata: rawModeInstructions.metadata,
        } : undefined;
        const sendOptions = {
            location: ChatAgentLocation.Chat,
            userSelectedModelId: session.modelId,
            modeInfo: {
                kind: modeKind,
                isBuiltin: modeIsBuiltin,
                modeInstructions,
                modeId,
                applyCodeBlockSuggestionId: undefined,
                permissionLevel: options?.permissionLevel ?? ChatPermissionLevel.Default,
            },
            agentIdSilent: contribution?.type,
            attachedContext: session.attachedContext,
        };
        await this.chatSessionsService.getOrCreateChatSession(session.resource, CancellationToken.None);
        await this.doSendRequestForNewSession(session, query, sendOptions, session.selectedOptions);
        // Clean up the session after sending (setter disposes the previous value)
        this._newSession.value = undefined;
    }
    async doSendRequestForNewSession(session, query, sendOptions, selectedOptions) {
        // 1. Open the session - loads the model and shows the ChatViewPane
        const chatWidget = await this.openNewSession(session);
        const permissionLevel = sendOptions.modeInfo?.permissionLevel;
        if (permissionLevel) {
            chatWidget.input.setPermissionLevel(permissionLevel);
        }
        // 2. Load the session to apply selected options and have it ready when the view opens
        await this.loadNewSession(session, selectedOptions);
        //3. Send the initial request to kick off the session creation on the extension side
        const existingResources = new ResourceSet(this.agentSessionsService.model.sessions.map(s => s.resource));
        const result = await this.chatService.sendRequest(session.resource, query, sendOptions);
        if (result.kind === 'rejected') {
            this.logService.error(`[ActiveSessionService] sendRequest rejected: ${result.reason}`);
            return;
        }
        // 4. This is just a heuristic to wait for the extension to create the session before trying to find the session associated with the chat widget, which is what we want to set as active.
        // This allows to set the active session to the new session immediately instead of waiting for the chat widget to open, which results in a smoother user experience
        const probableNewSession = await this.loadProbableNewAgentSession(session, existingResources);
        this.setActiveSession(probableNewSession);
        // 5. Wait for the real new session to appear in the chat widget
        const newSession = await this.loadNewAgentSession(chatWidget, session);
        this.setActiveSession(newSession);
    }
    async openNewSession(session) {
        this.isNewChatSessionContext.set(false);
        const sessionResource = session.resource;
        const chatWidget = await this.chatWidgetService.openSession(sessionResource, ChatViewPaneTarget);
        if (!chatWidget) {
            throw new Error(`Failed to open chat session for resource ${sessionResource.toString()}`);
        }
        return chatWidget;
    }
    async loadNewSession(session, selectedOptions) {
        const modelRef = await this.chatService.acquireOrLoadSession(session.resource, ChatAgentLocation.Chat, CancellationToken.None);
        if (modelRef) {
            const model = modelRef.object;
            // Set the selected model on the input model so the model picker reflects it
            if (session.modelId) {
                const languageModel = this.languageModelsService.lookupLanguageModel(session.modelId);
                if (languageModel) {
                    model.inputModel.setState({
                        selectedModel: { identifier: session.modelId, metadata: languageModel }
                    });
                }
            }
            // Set the selected mode on the input model so the mode picker reflects it
            if (session.mode) {
                model.inputModel.setState({
                    mode: { id: session.mode.id, kind: session.mode.kind }
                });
            }
            // Apply selected options (repository, branch, etc.) to the contributed session
            if (selectedOptions && selectedOptions.size > 0) {
                const contributedSession = model.contributedChatSession;
                if (contributedSession) {
                    const initialSessionOptions = [...selectedOptions.entries()].map(([optionId, value]) => ({ optionId, value }));
                    model.setContributedChatSession({
                        ...contributedSession,
                        initialSessionOptions,
                    });
                }
            }
            modelRef.dispose();
        }
    }
    async loadProbableNewAgentSession(session, existingSessions) {
        const probableNewSession = this.agentSessionsService.model.sessions.find(s => s.providerType === session.target && !existingSessions.has(s.resource));
        if (probableNewSession) {
            return probableNewSession;
        }
        let listener;
        try {
            return await new Promise(resolve => {
                listener = this.agentSessionsService.model.onDidChangeSessions(() => {
                    const s = this.agentSessionsService.model.sessions.find(s => s.providerType === session.target && !existingSessions.has(s.resource));
                    if (s) {
                        listener?.dispose();
                        resolve(s);
                    }
                });
            });
        }
        finally {
            listener?.dispose();
        }
    }
    async loadNewAgentSession(chatWidget, session) {
        const newSession = this.agentSessionsService.model.sessions.find(s => s.providerType === session.target && this.uriIdentityService.extUri.isEqual(s.resource, chatWidget.viewModel?.sessionResource));
        if (newSession) {
            return newSession;
        }
        let listener;
        try {
            return await new Promise(resolve => {
                listener = chatWidget.onDidChangeViewModel(() => {
                    const s = this.agentSessionsService.model.sessions.find(s => s.providerType === session.target && this.uriIdentityService.extUri.isEqual(s.resource, chatWidget.viewModel?.sessionResource));
                    if (s) {
                        listener?.dispose();
                        resolve(s);
                    }
                });
            });
        }
        finally {
            listener?.dispose();
        }
    }
    openNewSessionView() {
        // No-op if the current session is already a new session
        if (this.isNewChatSessionContext.get()) {
            return;
        }
        this.setActiveSession(undefined);
        this.isNewChatSessionContext.set(true);
    }
    setActiveSession(session) {
        let activeSessionItem;
        if (session) {
            if (isAgentSession(session)) {
                this.lastSelectedSession = session.resource;
                const [repository, worktree, worktreeBranchName, worktreeBaseBranchProtected] = this.getRepositoryFromMetadata(session);
                activeSessionItem = {
                    isUntitled: false,
                    label: session.label,
                    resource: session.resource,
                    repository: repository,
                    worktree,
                    worktreeBranchName: worktreeBranchName,
                    worktreeBaseBranchProtected: worktreeBaseBranchProtected === true,
                    providerType: session.providerType,
                };
            }
            else {
                activeSessionItem = {
                    isUntitled: true,
                    label: undefined,
                    resource: session.resource,
                    repository: session.project?.uri,
                    worktree: undefined,
                    worktreeBranchName: undefined,
                    worktreeBaseBranchProtected: undefined,
                    providerType: session.target,
                };
                this._newActiveSessionDisposables.clear();
                this._newActiveSessionDisposables.add(session.onDidChange(e => {
                    if (e === 'repoUri') {
                        this.doSetActiveSession({
                            isUntitled: true,
                            label: undefined,
                            resource: session.resource,
                            repository: session.project?.uri,
                            worktree: undefined,
                            worktreeBranchName: undefined,
                            worktreeBaseBranchProtected: undefined,
                            providerType: session.target,
                        });
                    }
                }));
            }
        }
        this.doSetActiveSession(activeSessionItem);
    }
    doSetActiveSession(activeSessionItem) {
        if (this.equalsSessionItem(this._activeSession.get(), activeSessionItem)) {
            return;
        }
        if (activeSessionItem) {
            this.logService.info(`[ActiveSessionService] Active session changed: ${activeSessionItem.resource.toString()}`);
            this.logService.trace(`[ActiveSessionService] Active session details: ${JSON.stringify(activeSessionItem)}`);
        }
        else {
            this.logService.trace('[ActiveSessionService] Active session cleared');
        }
        this._isBackgroundProvider.set(activeSessionItem?.providerType === AgentSessionProviders.Background);
        this._activeSession.set(activeSessionItem, undefined);
    }
    equalsSessionItem(a, b) {
        if (a === b) {
            return true;
        }
        if (!a || !b) {
            return false;
        }
        return (a.label === b.label &&
            a.resource.toString() === b.resource.toString() &&
            a.repository?.toString() === b.repository?.toString() &&
            a.worktree?.toString() === b.worktree?.toString() &&
            a.worktreeBranchName === b.worktreeBranchName &&
            a.providerType === b.providerType &&
            a.worktreeBaseBranchProtected === b.worktreeBaseBranchProtected);
    }
    async commitWorktreeFiles(session, fileUris) {
        const worktreeUri = session.worktree;
        if (!worktreeUri) {
            throw new Error('Cannot commit worktree files: active session has no associated worktree');
        }
        for (const fileUri of fileUris) {
            await this.commandService.executeCommand('github.copilot.cli.sessions.commitToWorktree', { worktreeUri, fileUri });
        }
        await this.agentSessionsService.model.resolve(AgentSessionProviders.Background);
    }
    getGitHubContext(session) {
        // 1. Try parsing a github-remote-file URI (Cloud sessions)
        const repoUri = session.repository;
        if (repoUri && repoUri.scheme === GITHUB_REMOTE_FILE_SCHEME) {
            const parts = repoUri.path.split('/').filter(Boolean);
            if (parts.length >= 2) {
                const owner = decodeURIComponent(parts[0]);
                const repo = decodeURIComponent(parts[1]);
                const prNumber = this._parsePRNumberFromSession(session);
                return { owner, repo, prNumber };
            }
        }
        // 2. Try from agent session metadata (Background sessions)
        const agentSession = this.agentSessionsService.model.getSession(session.resource);
        if (agentSession?.metadata) {
            const metadata = agentSession.metadata;
            // owner + name fields
            if (typeof metadata.owner === 'string' && typeof metadata.name === 'string') {
                const prNumber = this._parsePRNumberFromSession(session);
                return { owner: metadata.owner, repo: metadata.name, prNumber };
            }
            // repositoryNwo: "owner/repo"
            if (typeof metadata.repositoryNwo === 'string') {
                const parts = metadata.repositoryNwo.split('/');
                if (parts.length === 2) {
                    const prNumber = this._parsePRNumberFromSession(session);
                    return { owner: parts[0], repo: parts[1], prNumber };
                }
            }
            // pullRequestUrl: "https://github.com/{owner}/{repo}/pull/{number}"
            if (typeof metadata.pullRequestUrl === 'string') {
                const match = /github\.com\/([^/]+)\/([^/]+)\/pull\/(\d+)/.exec(metadata.pullRequestUrl);
                if (match) {
                    return { owner: match[1], repo: match[2], prNumber: parseInt(match[3], 10) };
                }
            }
        }
        return undefined;
    }
    getGitHubContextForSession(sessionResource) {
        const agentSession = this.agentSessionsService.model.getSession(sessionResource);
        if (!agentSession) {
            return undefined;
        }
        const [repository, worktree] = this.getRepositoryFromMetadata(agentSession);
        return this.getGitHubContext({
            resource: sessionResource,
            isUntitled: false,
            label: agentSession.label,
            repository,
            worktree,
            worktreeBranchName: undefined,
            worktreeBaseBranchProtected: undefined,
            providerType: agentSession.providerType,
        });
    }
    resolveSessionFileUri(sessionResource, relativePath) {
        const agentSession = this.agentSessionsService.model.getSession(sessionResource);
        if (!agentSession) {
            return undefined;
        }
        const [repository, worktree] = this.getRepositoryFromMetadata(agentSession);
        const baseUri = worktree ?? repository;
        if (!baseUri) {
            return undefined;
        }
        return URI.joinPath(baseUri, relativePath);
    }
    _parsePRNumberFromSession(session) {
        const agentSession = this.agentSessionsService.model.getSession(session.resource);
        const metadata = agentSession?.metadata;
        if (!metadata) {
            return undefined;
        }
        // Direct prNumber field
        if (typeof metadata.pullRequestNumber === 'number') {
            return metadata.pullRequestNumber;
        }
        // Parse from pullRequestUrl: https://github.com/{owner}/{repo}/pull/{number}
        if (typeof metadata.pullRequestUrl === 'string') {
            const match = /\/pull\/(\d+)/.exec(metadata.pullRequestUrl);
            if (match) {
                return parseInt(match[1], 10);
            }
        }
        return undefined;
    }
    loadLastSelectedSession() {
        const cached = this.storageService.get(LAST_SELECTED_SESSION_KEY, 1 /* StorageScope.WORKSPACE */);
        if (!cached) {
            return undefined;
        }
        try {
            return URI.parse(cached);
        }
        catch {
            return undefined;
        }
    }
    saveLastSelectedSession() {
        if (this.lastSelectedSession) {
            this.storageService.store(LAST_SELECTED_SESSION_KEY, this.lastSelectedSession.toString(), 1 /* StorageScope.WORKSPACE */, 1 /* StorageTarget.MACHINE */);
        }
    }
};
SessionsManagementService = __decorate([
    __param(0, IStorageService),
    __param(1, IUriIdentityService),
    __param(2, IAgentSessionsService),
    __param(3, IChatSessionsService),
    __param(4, IChatWidgetService),
    __param(5, IChatService),
    __param(6, IInstantiationService),
    __param(7, ILogService),
    __param(8, IContextKeyService),
    __param(9, ICommandService),
    __param(10, ILanguageModelsService),
    __param(11, ILanguageModelToolsService)
], SessionsManagementService);
export { SessionsManagementService };
//#endregion
//# sourceMappingURL=sessionsManagementService.js.map