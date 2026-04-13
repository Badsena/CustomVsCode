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
var ChatContinueInSessionActionItem_1;
import { Codicon } from '../../../../../base/common/codicons.js';
import { h } from '../../../../../base/browser/dom.js';
import { Disposable, markAsSingleton } from '../../../../../base/common/lifecycle.js';
import { Schemas } from '../../../../../base/common/network.js';
import { isAbsolute } from '../../../../../base/common/path.js';
import { basename } from '../../../../../base/common/resources.js';
import { ThemeIcon } from '../../../../../base/common/themables.js';
import { URI } from '../../../../../base/common/uri.js';
import { isITextModel } from '../../../../../editor/common/model.js';
import { localize, localize2 } from '../../../../../nls.js';
import { ActionWidgetDropdownActionViewItem } from '../../../../../platform/actions/browser/actionWidgetDropdownActionViewItem.js';
import { IActionViewItemService } from '../../../../../platform/actions/browser/actionViewItemService.js';
import { Action2, MenuId, MenuItemAction } from '../../../../../platform/actions/common/actions.js';
import { IActionWidgetService } from '../../../../../platform/actionWidget/browser/actionWidget.js';
import { ICommandService } from '../../../../../platform/commands/common/commands.js';
import { ContextKeyExpr, IContextKeyService } from '../../../../../platform/contextkey/common/contextkey.js';
import { IInstantiationService } from '../../../../../platform/instantiation/common/instantiation.js';
import { IKeybindingService } from '../../../../../platform/keybinding/common/keybinding.js';
import { ITelemetryService } from '../../../../../platform/telemetry/common/telemetry.js';
import { IOpenerService } from '../../../../../platform/opener/common/opener.js';
import { IsSessionsWindowContext, ResourceContextKey } from '../../../../common/contextkeys.js';
import { IEditorService } from '../../../../services/editor/common/editorService.js';
import { IFileService } from '../../../../../platform/files/common/files.js';
import { IChatAgentService } from '../../common/participants/chatAgents.js';
import { ChatContextKeys } from '../../common/actions/chatContextKeys.js';
import { chatEditingWidgetFileStateContextKey } from '../../common/editing/chatEditingService.js';
import { ChatRequestParser } from '../../common/requestParser/chatRequestParser.js';
import { getDynamicVariablesForWidget, getSelectedToolAndToolSetsForWidget } from '../attachments/chatVariables.js';
import { ChatSendResult, IChatService } from '../../common/chatService/chatService.js';
import { IChatSessionsService } from '../../common/chatSessionsService.js';
import { ChatAgentLocation } from '../../common/constants.js';
import { PROMPT_LANGUAGE_ID } from '../../common/promptSyntax/promptTypes.js';
import { AgentSessionProviders, getAgentSessionProvider, getAgentSessionProviderIcon, getAgentSessionProviderName } from '../agentSessions/agentSessions.js';
import { IAgentSessionsService } from '../agentSessions/agentSessionsService.js';
import { IChatWidgetService, isIChatViewViewContext } from '../chat.js';
import { ctxHasEditorModification } from '../chatEditing/chatEditingEditorContextKeys.js';
import { CHAT_SETUP_ACTION_ID } from './chatActions.js';
import { PromptFileVariableKind, toPromptFileVariableEntry } from '../../common/attachments/chatVariableEntries.js';
/**
 * Extracts the "owner/repo" name-with-owner from a git remote URL.
 * Supports HTTPS (https://github.com/owner/repo.git) and SSH (git@github.com:owner/repo.git) formats.
 */
function extractNwoFromRemoteUrl(remoteUrl) {
    const match = remoteUrl.match(/(?:github\.com)[/:](?<owner>[^/]+)\/(?<repo>[^/.]+)/);
    if (match?.groups) {
        return `${match.groups.owner}/${match.groups.repo}`;
    }
    return undefined;
}
/**
 * Resolves GitHub NWO from a local git repository path by reading `.git/config`.
 * Handles both regular repos and git worktrees.
 */
async function resolveGitRemoteNwo(repoPath, fileService) {
    try {
        const gitPath = `${repoPath}/.git`;
        const gitUri = URI.file(gitPath);
        let configUri;
        try {
            const stat = await fileService.stat(gitUri);
            if (stat.isDirectory) {
                // Regular git repo
                configUri = URI.file(`${gitPath}/config`);
            }
            else {
                // Git worktree — .git is a file with "gitdir: <path>"
                const gitFile = await fileService.readFile(gitUri);
                const gitDir = gitFile.value.toString().trim().replace(/^gitdir:\s*/, '');
                // Resolve relative paths
                const resolvedGitDir = gitDir.startsWith('/')
                    ? gitDir
                    : `${repoPath}/${gitDir}`;
                // The config is in the common dir (parent of worktree git dirs)
                // e.g., gitdir points to /repo/.git/worktrees/name, config is at /repo/.git/config
                const commonDir = resolvedGitDir.replace(/\/worktrees\/[^/]+$/, '');
                configUri = URI.file(`${commonDir}/config`);
            }
        }
        catch {
            // .git doesn't exist
            return undefined;
        }
        const content = await fileService.readFile(configUri);
        const configText = content.value.toString();
        // Parse remote "origin" URL from git config
        const remoteMatch = configText.match(/\[remote\s+"origin"\][^[]*url\s*=\s*(.+)/m);
        if (remoteMatch?.[1]) {
            return extractNwoFromRemoteUrl(remoteMatch[1].trim());
        }
    }
    catch {
        // File not found or not readable
    }
    return undefined;
}
export var ActionLocation;
(function (ActionLocation) {
    ActionLocation["ChatWidget"] = "chatWidget";
    ActionLocation["Editor"] = "editor";
})(ActionLocation || (ActionLocation = {}));
export class ContinueChatInSessionAction extends Action2 {
    static { this.ID = 'workbench.action.chat.continueChatInSession'; }
    constructor() {
        super({
            id: ContinueChatInSessionAction.ID,
            title: localize2(5944, "Continue Chat in..."),
            tooltip: localize(5936, null),
            precondition: ContextKeyExpr.and(ChatContextKeys.enabled, ChatContextKeys.requestInProgress.negate(), ChatContextKeys.remoteJobCreating.negate(), ChatContextKeys.hasCanDelegateProviders),
            menu: [{
                    id: MenuId.ChatExecute,
                    group: 'navigation',
                    order: 3.4,
                    when: ContextKeyExpr.and(ChatContextKeys.lockedToCodingAgent.negate(), ChatContextKeys.hasCanDelegateProviders),
                },
                {
                    id: MenuId.EditorContent,
                    group: 'continueIn',
                    when: ContextKeyExpr.and(ContextKeyExpr.equals(ResourceContextKey.Scheme.key, Schemas.untitled), ContextKeyExpr.equals(ResourceContextKey.LangId.key, PROMPT_LANGUAGE_ID), ContextKeyExpr.notEquals(chatEditingWidgetFileStateContextKey.key, 0 /* ModifiedFileEntryState.Modified */), ctxHasEditorModification.negate(), ChatContextKeys.hasCanDelegateProviders),
                }
            ]
        });
    }
    async run() {
        // Handled by a custom action item
    }
}
let ChatContinueInSessionActionItem = ChatContinueInSessionActionItem_1 = class ChatContinueInSessionActionItem extends ActionWidgetDropdownActionViewItem {
    constructor(action, location, actionWidgetService, contextKeyService, keybindingService, chatSessionsService, instantiationService, openerService, telemetryService) {
        super(action, {
            actionProvider: ChatContinueInSessionActionItem_1.actionProvider(chatSessionsService, instantiationService, location),
            actionBarActions: ChatContinueInSessionActionItem_1.getActionBarActions(openerService),
            reporter: { id: 'ChatContinueInSession', name: 'ChatContinueInSession', includeOptions: true },
        }, actionWidgetService, keybindingService, contextKeyService, telemetryService);
        this.location = location;
        this.contextKeyService = contextKeyService;
    }
    static getActionBarActions(openerService) {
        const learnMoreUrl = 'https://aka.ms/vscode-continue-chat-in';
        return [{
                id: 'workbench.action.chat.continueChatInSession.learnMore',
                label: localize(5937, null),
                tooltip: localize(5938, null),
                class: undefined,
                enabled: true,
                run: async () => {
                    await openerService.open(URI.parse(learnMoreUrl));
                }
            }];
    }
    static actionProvider(chatSessionsService, instantiationService, location) {
        return {
            getActions: () => {
                const actions = [];
                const contributions = chatSessionsService.getAllChatSessionContributions();
                // Continue in Background
                const backgroundContrib = contributions.find(contrib => contrib.type === AgentSessionProviders.Background);
                if (backgroundContrib && backgroundContrib.canDelegate) {
                    actions.push(this.toAction(AgentSessionProviders.Background, backgroundContrib, instantiationService, location));
                }
                // Continue in Cloud
                const cloudContrib = contributions.find(contrib => contrib.type === AgentSessionProviders.Cloud);
                if (cloudContrib && cloudContrib.canDelegate) {
                    actions.push(this.toAction(AgentSessionProviders.Cloud, cloudContrib, instantiationService, location));
                }
                // Offer actions to enter setup if we have no contributions
                if (actions.length === 0) {
                    actions.push(this.toSetupAction(AgentSessionProviders.Background, instantiationService));
                    actions.push(this.toSetupAction(AgentSessionProviders.Cloud, instantiationService));
                }
                return actions;
            }
        };
    }
    static toAction(provider, contrib, instantiationService, location) {
        return {
            id: contrib.type,
            enabled: true,
            icon: getAgentSessionProviderIcon(provider),
            class: undefined,
            description: `@${contrib.name}`,
            label: getAgentSessionProviderName(provider),
            tooltip: localize(5939, null, getAgentSessionProviderName(provider)),
            category: { label: localize(5940, null), order: 0, showHeader: true },
            run: () => instantiationService.invokeFunction(accessor => {
                if (location === "editor" /* ActionLocation.Editor */) {
                    return new CreateRemoteAgentJobFromEditorAction().run(accessor, contrib);
                }
                return new CreateRemoteAgentJobAction().run(accessor, contrib);
            })
        };
    }
    static toSetupAction(provider, instantiationService) {
        return {
            id: provider,
            enabled: true,
            icon: getAgentSessionProviderIcon(provider),
            class: undefined,
            label: getAgentSessionProviderName(provider),
            tooltip: localize(5941, null, getAgentSessionProviderName(provider)),
            category: { label: localize(5942, null), order: 0, showHeader: true },
            run: () => instantiationService.invokeFunction(accessor => {
                const commandService = accessor.get(ICommandService);
                return commandService.executeCommand(CHAT_SETUP_ACTION_ID);
            })
        };
    }
    renderLabel(element) {
        if (this.location === "editor" /* ActionLocation.Editor */) {
            const view = h('span.action-widget-delegate-label', [
                h('span', { className: ThemeIcon.asClassName(Codicon.forward) }),
                h('span', [localize(5943, null)])
            ]);
            element.appendChild(view.root);
            return null;
        }
        else {
            const icon = this.contextKeyService.contextMatchesRules(ChatContextKeys.remoteJobCreating) ? Codicon.sync : Codicon.forward;
            element.classList.add(...ThemeIcon.asClassNameArray(icon));
            return super.renderLabel(element);
        }
    }
};
ChatContinueInSessionActionItem = ChatContinueInSessionActionItem_1 = __decorate([
    __param(2, IActionWidgetService),
    __param(3, IContextKeyService),
    __param(4, IKeybindingService),
    __param(5, IChatSessionsService),
    __param(6, IInstantiationService),
    __param(7, IOpenerService),
    __param(8, ITelemetryService)
], ChatContinueInSessionActionItem);
export { ChatContinueInSessionActionItem };
const NEW_CHAT_SESSION_ACTION_ID = 'workbench.action.chat.openNewSessionEditor';
export class CreateRemoteAgentJobAction {
    constructor() { }
    openUntitledEditor(commandService, continuationTarget) {
        commandService.executeCommand(`${NEW_CHAT_SESSION_ACTION_ID}.${continuationTarget.type}`);
    }
    /**
     * Extracts the GitHub "owner/repo" NWO from the source session by checking
     * multiple data sources: chat model repoData, session metadata, and session options.
     */
    async extractRepoNwoFromSession(agentSessionsService, chatSessionsService, fileService, sessionResource, chatModel) {
        // 1. Try chat model's repoData (populated when local git repo exists)
        const repoData = chatModel.repoData;
        if (repoData?.remoteUrl) {
            const nwo = extractNwoFromRemoteUrl(repoData.remoteUrl);
            if (nwo) {
                return nwo;
            }
        }
        // 2. Try agent session metadata (populated by session providers)
        const agentSession = agentSessionsService.getSession(sessionResource);
        if (agentSession?.metadata) {
            const metadata = agentSession.metadata;
            // Cloud sessions set name/owner in metadata
            const owner = metadata.owner;
            const name = metadata.name;
            if (owner && name) {
                return `${owner}/${name}`;
            }
            // Background sessions may set repositoryNwo directly
            const repositoryNwo = metadata.repositoryNwo;
            if (repositoryNwo?.includes('/')) {
                return repositoryNwo;
            }
            // Background sessions may set repositoryUrl
            const repositoryUrl = metadata.repositoryUrl;
            if (repositoryUrl) {
                const nwo = extractNwoFromRemoteUrl(repositoryUrl);
                if (nwo) {
                    return nwo;
                }
            }
            // Background sessions set workingDirectoryPath — resolve git remote from it
            const workingDir = (metadata.workingDirectoryPath ?? metadata.repositoryPath ?? metadata.worktreePath);
            if (workingDir) {
                const nwo = await resolveGitRemoteNwo(workingDir, fileService);
                if (nwo) {
                    return nwo;
                }
            }
        }
        // 3. Try session options (repository picker selection)
        // Cloud sessions use 'repositories', sessions window uses 'repository'
        for (const optionId of ['repositories', 'repository']) {
            const repoOption = chatSessionsService.getSessionOption(sessionResource, optionId);
            if (repoOption) {
                const optionValue = typeof repoOption === 'string' ? repoOption : repoOption.id;
                if (optionValue) {
                    // Check if it's already a "owner/repo" NWO (exactly two segments)
                    const segments = optionValue.split('/').filter(Boolean);
                    if (segments.length === 2) {
                        return optionValue;
                    }
                    // Try extracting NWO from a URL
                    const nwo = extractNwoFromRemoteUrl(optionValue);
                    if (nwo) {
                        return nwo;
                    }
                    // Try parsing as URI (e.g. github-remote-file://github/owner/repo/...)
                    try {
                        const uri = URI.parse(optionValue);
                        if (uri.authority === 'github') {
                            const parts = uri.path.split('/').filter(Boolean);
                            if (parts.length >= 2) {
                                return `${parts[0]}/${parts[1]}`;
                            }
                        }
                    }
                    catch { /* ignore */ }
                    // Local filesystem path — resolve git remote
                    if (isAbsolute(optionValue)) {
                        const nwoFromGit = await resolveGitRemoteNwo(optionValue, fileService);
                        if (nwoFromGit) {
                            return nwoFromGit;
                        }
                    }
                }
            }
        }
        return undefined;
    }
    async run(accessor, continuationTarget, _widget) {
        const contextKeyService = accessor.get(IContextKeyService);
        const commandService = accessor.get(ICommandService);
        const widgetService = accessor.get(IChatWidgetService);
        const chatAgentService = accessor.get(IChatAgentService);
        const chatService = accessor.get(IChatService);
        const editorService = accessor.get(IEditorService);
        const agentSessionsService = accessor.get(IAgentSessionsService);
        const chatSessionsService = accessor.get(IChatSessionsService);
        const fileService = accessor.get(IFileService);
        const remoteJobCreatingKey = ChatContextKeys.remoteJobCreating.bindTo(contextKeyService);
        try {
            remoteJobCreatingKey.set(true);
            const widget = _widget ?? widgetService.lastFocusedWidget;
            if (!widget || !widget.viewModel) {
                return this.openUntitledEditor(commandService, continuationTarget);
            }
            // todo@connor4312: remove 'as' cast
            const chatModel = widget.viewModel.model;
            if (!chatModel) {
                return;
            }
            const sessionResource = widget.viewModel.sessionResource;
            const chatRequests = chatModel.getRequests();
            let userPrompt = widget.getInput();
            if (!userPrompt) {
                if (!chatRequests.length) {
                    return this.openUntitledEditor(commandService, continuationTarget);
                }
                userPrompt = 'implement this.';
            }
            const attachedContext = widget.input.getAttachedAndImplicitContext();
            widget.input.acceptInput(true);
            // For inline editor mode, add selection or cursor information
            if (widget.location === ChatAgentLocation.EditorInline) {
                const activeEditor = editorService.activeTextEditorControl;
                if (activeEditor) {
                    const model = activeEditor.getModel();
                    let activeEditorUri = undefined;
                    if (model && isITextModel(model)) {
                        activeEditorUri = model.uri;
                    }
                    const selection = activeEditor.getSelection();
                    if (activeEditorUri && selection) {
                        attachedContext.add({
                            kind: 'file',
                            id: 'vscode.implicit.selection',
                            name: basename(activeEditorUri),
                            value: {
                                uri: activeEditorUri,
                                range: selection
                            },
                        });
                    }
                }
            }
            const continuationTargetType = continuationTarget.type;
            // When source and target session types differ in the sessions window,
            // open a new session of the target type with the prompt and context
            // instead of sending to the current (incompatible) session resource.
            const isSessionsWindow = IsSessionsWindowContext.getValue(contextKeyService);
            const sourceProvider = getAgentSessionProvider(sessionResource);
            if (isSessionsWindow && sourceProvider && sourceProvider !== continuationTargetType) {
                const isSidebar = isIChatViewViewContext(widget.viewContext);
                const actionId = isSidebar
                    ? `workbench.action.chat.openNewSessionSidebar.${continuationTargetType}`
                    : `${NEW_CHAT_SESSION_ACTION_ID}.${continuationTargetType}`;
                // Build conversation transcript from the source session to preserve context.
                // Truncate to avoid exceeding token limits of the target model.
                const maxTranscriptLength = 20_000;
                let transcript = chatRequests.map(req => {
                    const userMsg = `User: ${req.message.text}`;
                    const respMsg = req.response?.response ? `Assistant: ${req.response.response.getMarkdown()}` : '';
                    return respMsg ? `${userMsg}\n${respMsg}` : userMsg;
                }).join('\n\n');
                if (transcript.length > maxTranscriptLength) {
                    transcript = transcript.substring(transcript.length - maxTranscriptLength);
                }
                const delegationPrompt = transcript
                    ? `The following is the conversation history from a previous ${getAgentSessionProviderName(sourceProvider)} session. Continue working on it.\n\n${transcript}\n\nUser: ${userPrompt}`
                    : userPrompt;
                // Extract repository info from the source session to pass to the target session
                const initialSessionOptions = [];
                const repoNwo = await this.extractRepoNwoFromSession(agentSessionsService, chatSessionsService, fileService, sessionResource, chatModel);
                if (repoNwo) {
                    initialSessionOptions.push({ optionId: 'repositories', value: repoNwo });
                }
                await commandService.executeCommand(actionId, {
                    prompt: delegationPrompt,
                    attachedContext: attachedContext.asArray(),
                    initialSessionOptions: initialSessionOptions.length > 0 ? initialSessionOptions : undefined,
                });
                return;
            }
            const defaultAgent = chatAgentService.getDefaultAgent(ChatAgentLocation.Chat);
            const instantiationService = accessor.get(IInstantiationService);
            const requestParser = instantiationService.createInstance(ChatRequestParser);
            // Add the request to the model first
            const parsedRequest = requestParser.parseChatRequestWithReferences(getDynamicVariablesForWidget(widget), getSelectedToolAndToolSetsForWidget(widget), userPrompt, ChatAgentLocation.Chat);
            const addedRequest = chatModel.addRequest(parsedRequest, { variables: attachedContext.asArray() }, 0, undefined, defaultAgent);
            await chatService.removeRequest(sessionResource, addedRequest.id);
            const sendResult = await chatService.sendRequest(sessionResource, userPrompt, {
                agentIdSilent: continuationTargetType,
                attachedContext: attachedContext.asArray(),
                userSelectedModelId: widget.input.currentLanguageModel,
                ...widget.getModeRequestOptions()
            });
            if (ChatSendResult.isSent(sendResult)) {
                await widget.handleDelegationExitIfNeeded(defaultAgent, sendResult.data.agent);
            }
        }
        catch (e) {
            console.error('[Delegation] Error creating remote coding agent job', e);
            throw e;
        }
        finally {
            remoteJobCreatingKey.set(false);
        }
    }
}
class CreateRemoteAgentJobFromEditorAction {
    constructor() { }
    async run(accessor, continuationTarget) {
        try {
            const editorService = accessor.get(IEditorService);
            const activeEditor = editorService.activeTextEditorControl;
            const commandService = accessor.get(ICommandService);
            if (!activeEditor) {
                return;
            }
            const model = activeEditor.getModel();
            if (!model || !isITextModel(model)) {
                return;
            }
            const uri = model.uri;
            const attachedContext = [toPromptFileVariableEntry(uri, PromptFileVariableKind.PromptFile, undefined, false, [])];
            const prompt = `Follow instructions in [${basename(uri)}](${uri.toString()}).`;
            await commandService.executeCommand(`${NEW_CHAT_SESSION_ACTION_ID}.${continuationTarget.type}`, { prompt, attachedContext });
        }
        catch (e) {
            console.error('Error creating remote agent job from editor', e);
            throw e;
        }
    }
}
let ContinueChatInSessionActionRendering = class ContinueChatInSessionActionRendering extends Disposable {
    static { this.ID = 'chat.continueChatInSessionActionRendering'; }
    constructor(actionViewItemService, instantiationService) {
        super();
        const disposable = actionViewItemService.register(MenuId.EditorContent, ContinueChatInSessionAction.ID, (action, options, instantiationService2) => {
            if (!(action instanceof MenuItemAction)) {
                return undefined;
            }
            return instantiationService.createInstance(ChatContinueInSessionActionItem, action, "editor" /* ActionLocation.Editor */);
        });
        markAsSingleton(disposable);
    }
};
ContinueChatInSessionActionRendering = __decorate([
    __param(0, IActionViewItemService),
    __param(1, IInstantiationService)
], ContinueChatInSessionActionRendering);
export { ContinueChatInSessionActionRendering };
//# sourceMappingURL=chatContinueInAction.js.map