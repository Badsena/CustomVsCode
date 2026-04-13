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
import './media/chatWidget.css';
import './media/chatWelcomePart.css';
import * as dom from '../../../../base/browser/dom.js';
import { Codicon } from '../../../../base/common/codicons.js';
import { toAction } from '../../../../base/common/actions.js';
import { Emitter } from '../../../../base/common/event.js';
import { Disposable, DisposableStore, MutableDisposable, toDisposable } from '../../../../base/common/lifecycle.js';
import { autorun, observableValue } from '../../../../base/common/observable.js';
import { URI } from '../../../../base/common/uri.js';
import { CancellationTokenSource } from '../../../../base/common/cancellation.js';
import { Button } from '../../../../base/browser/ui/button/button.js';
import { CodeEditorWidget } from '../../../../editor/browser/widget/codeEditor/codeEditorWidget.js';
import { EditorExtensionsRegistry } from '../../../../editor/browser/editorExtensions.js';
import { IModelService } from '../../../../editor/common/services/model.js';
import { SuggestController } from '../../../../editor/contrib/suggest/browser/suggestController.js';
import { SnippetController2 } from '../../../../editor/contrib/snippet/browser/snippetController2.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { IContextKeyService, RawContextKey } from '../../../../platform/contextkey/common/contextkey.js';
import { ServiceCollection } from '../../../../platform/instantiation/common/serviceCollection.js';
import { IContextMenuService } from '../../../../platform/contextview/browser/contextView.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { IKeybindingService } from '../../../../platform/keybinding/common/keybinding.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { IOpenerService } from '../../../../platform/opener/common/opener.js';
import { IStorageService } from '../../../../platform/storage/common/storage.js';
import { IThemeService } from '../../../../platform/theme/common/themeService.js';
import { IHoverService } from '../../../../platform/hover/browser/hover.js';
import { getDefaultHoverDelegate } from '../../../../base/browser/ui/hover/hoverDelegateFactory.js';
import { renderIcon } from '../../../../base/browser/ui/iconLabel/iconLabels.js';
import { localize } from '../../../../nls.js';
import * as aria from '../../../../base/browser/ui/aria/aria.js';
import { AgentSessionProviders } from '../../../../workbench/contrib/chat/browser/agentSessions/agentSessions.js';
import { ISessionsManagementService } from '../../sessions/browser/sessionsManagementService.js';
import { ChatSessionPosition, getResourceForNewChatSession } from '../../../../workbench/contrib/chat/browser/chatSessions/chatSessions.contribution.js';
import { ChatSessionPickerActionItem } from '../../../../workbench/contrib/chat/browser/chatSessions/chatSessionPickerActionItem.js';
import { SearchableOptionPickerActionItem } from '../../../../workbench/contrib/chat/browser/chatSessions/searchableOptionPickerActionItem.js';
import { ILanguageModelsService } from '../../../../workbench/contrib/chat/common/languageModels.js';
import { EnhancedModelPickerActionItem } from '../../../../workbench/contrib/chat/browser/widget/input/modelPickerActionItem2.js';
import { IViewDescriptorService } from '../../../../workbench/common/views.js';
import { IWorkspaceTrustRequestService } from '../../../../platform/workspace/common/workspaceTrust.js';
import { ViewPane } from '../../../../workbench/browser/parts/views/viewPane.js';
import { ContextMenuController } from '../../../../editor/contrib/contextmenu/browser/contextmenu.js';
import { getSimpleEditorOptions } from '../../../../workbench/contrib/codeEditor/browser/simpleEditorOptions.js';
import { NewChatContextAttachments } from './newChatContextAttachments.js';
import { IGitService } from '../../../../workbench/contrib/git/common/gitService.js';
import { SessionTypePicker, IsolationPicker } from './sessionTargetPicker.js';
import { BranchPicker } from './branchPicker.js';
import { RemoteNewSession } from './newSession.js';
import { CloudModelPicker } from './modelPicker.js';
import { WorkspacePicker } from './workspacePicker.js';
import { SessionWorkspace } from '../../sessions/common/sessionWorkspace.js';
import { ModePicker } from './modePicker.js';
import { getErrorMessage } from '../../../../base/common/errors.js';
import { SlashCommandHandler } from './slashCommands.js';
import { IChatRequestVariableEntry } from '../../../../workbench/contrib/chat/common/attachments/chatVariableEntries.js';
import { ChatAgentLocation, ChatModeKind } from '../../../../workbench/contrib/chat/common/constants.js';
import { ChatHistoryNavigator } from '../../../../workbench/contrib/chat/common/widget/chatWidgetHistoryService.js';
import { NewChatPermissionPicker } from './newChatPermissionPicker.js';
import { registerAndCreateHistoryNavigationContext } from '../../../../platform/history/browser/contextScopedHistoryWidget.js';
const STORAGE_KEY_DRAFT_STATE = 'sessions.draftState';
const MIN_EDITOR_HEIGHT = 50;
const MAX_EDITOR_HEIGHT = 200;
/**
 * A self-contained new-session chat widget with a welcome view (mascot, target
 * buttons, option pickers), an input editor, model picker, and send button.
 *
 * This widget is shown only in the empty/welcome state. Once the user sends
 * a message, a session is created and the workbench ChatViewPane takes over.
 */
let NewChatWidget = class NewChatWidget extends Disposable {
    get element() { return this._editorContainer; }
    constructor(options, instantiationService, modelService, configurationService, languageModelsService, contextKeyService, logService, hoverService, sessionsManagementService, gitService, storageService, workspaceTrustRequestService) {
        super();
        this.instantiationService = instantiationService;
        this.modelService = modelService;
        this.configurationService = configurationService;
        this.languageModelsService = languageModelsService;
        this.contextKeyService = contextKeyService;
        this.logService = logService;
        this.hoverService = hoverService;
        this.sessionsManagementService = sessionsManagementService;
        this.gitService = gitService;
        this.storageService = storageService;
        this.workspaceTrustRequestService = workspaceTrustRequestService;
        // IHistoryNavigationWidget
        this._onDidFocus = this._register(new Emitter());
        this.onDidFocus = this._onDidFocus.event;
        this._onDidBlur = this._register(new Emitter());
        this.onDidBlur = this._onDidBlur.event;
        this._currentLanguageModel = observableValue('currentLanguageModel', undefined);
        this._modelPickerDisposable = this._register(new MutableDisposable());
        // Pending session
        this._newSession = this._register(new MutableDisposable());
        this._newSessionListener = this._register(new MutableDisposable());
        this._sending = false;
        // Repository loading
        this._openRepositoryCts = this._register(new MutableDisposable());
        this._projectSelectionCts = this._register(new MutableDisposable());
        this._repositoryLoading = false;
        this._branchLoading = false;
        this._loadingDelayDisposable = this._register(new MutableDisposable());
        this._toolbarPickerWidgets = new Map();
        this._toolbarPickerDisposables = this._register(new DisposableStore());
        this._optionEmitters = new Map();
        this._optionContextKeys = new Map();
        // Input state
        this._draftState = {
            inputText: '',
            attachments: [],
            mode: { id: ChatModeKind.Agent, kind: ChatModeKind.Agent },
            selectedModel: undefined,
            selections: [],
            contrib: {}
        };
        this._history = this._register(this.instantiationService.createInstance(ChatHistoryNavigator, ChatAgentLocation.Chat));
        this._contextAttachments = this._register(this.instantiationService.createInstance(NewChatContextAttachments));
        this._workspacePicker = this._register(this.instantiationService.createInstance(WorkspacePicker));
        this._permissionPicker = this._register(this.instantiationService.createInstance(NewChatPermissionPicker));
        this._cloudModelPicker = this._register(this.instantiationService.createInstance(CloudModelPicker));
        this._modePicker = this._register(this.instantiationService.createInstance(ModePicker));
        this._sessionTypePicker = this._register(this.instantiationService.createInstance(SessionTypePicker));
        this._branchPicker = this._register(this.instantiationService.createInstance(BranchPicker));
        this._isolationPicker = this._register(this.instantiationService.createInstance(IsolationPicker));
        this._options = options;
        // When a project is selected, infer the target and create a new session
        this._register(this._workspacePicker.onDidSelectProject(async (project) => {
            await this._onProjectSelected(project);
            this._updateDraftState();
            this._focusEditor();
        }));
        this._register(this._branchPicker.onDidChangeLoading(loading => {
            this._branchLoading = loading;
            this._updateInputLoadingState();
        }));
        this._register(this._branchPicker.onDidChange((branch) => {
            this._newSession.value?.setBranch(branch);
            this._updateDraftState();
            this._focusEditor();
        }));
        this._register(this._sessionTypePicker.onDidChange((target) => {
            if (target === 'cloud') {
                this._isolationPicker.setVisible(false);
                this._branchPicker.setVisible(false);
            }
            else {
                this._newSession.value?.setIsolationMode(this._isolationPicker.isolationMode);
                this._isolationPicker.setVisible(true);
                this._branchPicker.setVisible(this._isolationPicker.isWorktree);
            }
            this._updateDraftState();
            this._focusEditor();
        }));
        this._register(this._isolationPicker.onDidChange((mode) => {
            this._newSession.value?.setIsolationMode(mode);
            this._branchPicker.setVisible(mode === 'worktree');
            this._updateDraftState();
            this._focusEditor();
        }));
        // When mode changes, update the session
        this._register(this._modePicker.onDidChange((mode) => {
            this._newSession.value?.setMode(mode);
            this._focusEditor();
        }));
        // When language models change (e.g., extension activates), reinitialize if no model selected
        this._register(this.languageModelsService.onDidChangeLanguageModels(() => {
            this._initDefaultModel();
        }));
        // Update input state when attachments or model change
        this._register(this._contextAttachments.onDidChangeContext(() => {
            this._updateDraftState();
            this._focusEditor();
        }));
        this._register(autorun(reader => {
            this._currentLanguageModel.read(reader);
            this._updateDraftState();
        }));
    }
    // --- Rendering ---
    render(container) {
        const wrapper = dom.append(container, dom.$('.sessions-chat-widget'));
        // Overflow widget DOM node at the top level so the suggest widget
        // is not clipped by any overflow:hidden ancestor.
        const editorOverflowWidgetsDomNode = dom.append(container, dom.$('.sessions-chat-editor-overflow.monaco-editor'));
        this._register({ dispose: () => editorOverflowWidgetsDomNode.remove() });
        const welcomeElement = dom.append(wrapper, dom.$('.chat-full-welcome'));
        // Watermark letterpress
        const header = dom.append(welcomeElement, dom.$('.chat-full-welcome-header'));
        dom.append(header, dom.$('.chat-full-welcome-letterpress'));
        // Option group pickers (above the input)
        this._pickersContainer = dom.append(welcomeElement, dom.$('.chat-full-welcome-pickers-container'));
        // Input slot
        this._inputSlot = dom.append(welcomeElement, dom.$('.chat-full-welcome-inputSlot'));
        // Input area inside the input slot
        const inputArea = dom.$('.sessions-chat-input-area');
        this._contextAttachments.registerDropTarget(wrapper);
        this._contextAttachments.registerPasteHandler(inputArea);
        // Attachments row (pills only) inside input area, above editor
        const attachRow = dom.append(inputArea, dom.$('.sessions-chat-attach-row'));
        const attachedContextContainer = dom.append(attachRow, dom.$('.sessions-chat-attached-context'));
        this._contextAttachments.renderAttachedContext(attachedContextContainer);
        this._createEditor(inputArea, editorOverflowWidgetsDomNode);
        this._createBottomToolbar(inputArea);
        this._inputSlot.appendChild(inputArea);
        // Isolation mode and branch pickers (below the input, shown when Local target is selected)
        const isolationContainer = dom.append(welcomeElement, dom.$('.chat-full-welcome-local-mode'));
        this._sessionTypePicker.render(isolationContainer);
        this._permissionPicker.render(isolationContainer);
        dom.append(isolationContainer, dom.$('.sessions-chat-local-mode-spacer'));
        const branchContainer = dom.append(isolationContainer, dom.$('.sessions-chat-local-mode-right'));
        this._isolationPicker.render(branchContainer);
        this._branchPicker.render(branchContainer);
        // Render project picker & extension pickers
        this._renderOptionGroupPickers();
        // Initialize model picker
        this._initDefaultModel();
        // Restore draft input state from storage
        this._restoreState();
        // Create initial session
        const restoredProject = this._workspacePicker.selectedProject;
        if (restoredProject) {
            this._onProjectSelected(restoredProject);
        }
        else {
            this._createNewSession();
        }
        // Reveal
        welcomeElement.classList.add('revealed');
        // Layout editor after the input slot fade-in animation completes
        this._register(dom.addDisposableListener(this._inputSlot, 'animationend', () => {
            this._editor?.layout();
        }, { once: true }));
    }
    async _createNewSession(project) {
        const target = project?.isRepo ? AgentSessionProviders.Cloud : AgentSessionProviders.Background;
        const resource = getResourceForNewChatSession({
            type: target,
            position: this._options.sessionPosition ?? ChatSessionPosition.Sidebar,
            displayName: '',
        });
        try {
            const session = await this.sessionsManagementService.createNewSessionForTarget(target, resource);
            if (project) {
                session.setProject(project);
            }
            this._setNewSession(session);
        }
        catch (e) {
            this.logService.error('Failed to create new session:', e);
        }
    }
    _setNewSession(session) {
        this._newSession.value = session;
        if (session.target === AgentSessionProviders.Background && this._branchPicker.selectedBranch) {
            session.setBranch(this._branchPicker.selectedBranch);
        }
        // Set the current model on the session (for local sessions)
        const currentModel = this._currentLanguageModel.get();
        if (currentModel) {
            session.setModelId(currentModel.identifier);
        }
        // Set the current mode on the session (for local sessions)
        session.setMode(this._modePicker.selectedMode);
        // Listen for session changes
        const listeners = new DisposableStore();
        listeners.add(session.onDidChange((changeType) => {
            if (changeType === 'disabled') {
                this._updateSendButtonState();
            }
        }));
        this._sessionTypePicker.setProject(session.project);
        if (session instanceof RemoteNewSession) {
            this._renderRemoteSessionPickers(session, true);
            listeners.add(session.onDidChangeOptionGroups(() => {
                this._renderRemoteSessionPickers(session);
            }));
        }
        else {
            this._renderLocalSessionPickers();
            if (session.project) {
                this._openRepository(session.project.uri);
            }
        }
        this._newSessionListener.value = listeners;
        this._updateSendButtonState();
    }
    _openRepository(folderUri) {
        this._openRepositoryCts.value?.cancel();
        const cts = this._openRepositoryCts.value = new CancellationTokenSource();
        this._repositoryLoading = true;
        this._updateInputLoadingState();
        this._branchPicker.setRepository(undefined);
        this._modePicker.reset();
        this.gitService.openRepository(folderUri).then(repository => {
            if (cts.token.isCancellationRequested) {
                return;
            }
            this._repositoryLoading = false;
            this._updateInputLoadingState();
            const session = this._newSession.value;
            if (session?.project) {
                session.setProject(session.project.withRepository(repository));
            }
            this._sessionTypePicker.setProject(session?.project);
            this._isolationPicker.setHasGitRepo(!!repository);
            this._branchPicker.setRepository(repository);
            this._branchPicker.setVisible(!!repository && this._sessionTypePicker.isCli && this._isolationPicker.isWorktree);
            this._modePicker.reset();
        }).catch(e => {
            if (cts.token.isCancellationRequested) {
                return;
            }
            this.logService.warn(`Failed to open repository at ${folderUri.toString()}`, getErrorMessage(e));
            this._repositoryLoading = false;
            this._updateInputLoadingState();
            this._sessionTypePicker.setProject(undefined);
            this._isolationPicker.setHasGitRepo(false);
            this._branchPicker.setRepository(undefined);
            this._branchPicker.setVisible(false);
            this._modePicker.reset();
        });
    }
    _updateInputLoadingState() {
        const loading = this._repositoryLoading || this._branchLoading || this._sending;
        if (loading) {
            if (!this._loadingDelayDisposable.value) {
                const timer = setTimeout(() => {
                    this._loadingDelayDisposable.clear();
                    if (this._repositoryLoading || this._branchLoading || this._sending) {
                        this._loadingSpinner?.classList.add('visible');
                    }
                }, 500);
                this._loadingDelayDisposable.value = toDisposable(() => clearTimeout(timer));
            }
        }
        else {
            this._loadingDelayDisposable.clear();
            this._loadingSpinner?.classList.remove('visible');
        }
    }
    // --- Editor ---
    _createEditor(container, overflowWidgetsDomNode) {
        const editorContainer = this._editorContainer = dom.append(container, dom.$('.sessions-chat-editor'));
        editorContainer.style.height = `${MIN_EDITOR_HEIGHT}px`;
        // Create scoped context key service and register history navigation
        // BEFORE creating the editor, so the editor's context key scope is a child
        const inputScopedContextKeyService = this._register(this.contextKeyService.createScoped(container));
        const { historyNavigationBackwardsEnablement, historyNavigationForwardsEnablement } = this._register(registerAndCreateHistoryNavigationContext(inputScopedContextKeyService, this));
        this._historyNavigationBackwardsEnablement = historyNavigationBackwardsEnablement;
        this._historyNavigationForwardsEnablement = historyNavigationForwardsEnablement;
        const scopedInstantiationService = this._register(this.instantiationService.createChild(new ServiceCollection([IContextKeyService, inputScopedContextKeyService])));
        const uri = URI.from({ scheme: 'sessions-chat', path: `input-${Date.now()}` });
        const textModel = this._register(this.modelService.createModel('', null, uri, true));
        const editorOptions = {
            ...getSimpleEditorOptions(this.configurationService),
            readOnly: false,
            ariaLabel: localize(3173, null),
            placeholder: localize(3174, null),
            fontFamily: 'system-ui, -apple-system, sans-serif',
            fontSize: 13,
            lineHeight: 20,
            cursorWidth: 1,
            padding: { top: 8, bottom: 2 },
            wrappingStrategy: 'advanced',
            stickyScroll: { enabled: false },
            renderWhitespace: 'none',
            overflowWidgetsDomNode,
            suggest: {
                showIcons: false,
                showSnippets: false,
                showWords: true,
                showStatusBar: false,
                insertMode: 'insert',
            },
        };
        const widgetOptions = {
            isSimpleWidget: true,
            contributions: EditorExtensionsRegistry.getSomeEditorContributions([
                ContextMenuController.ID,
                SuggestController.ID,
                SnippetController2.ID,
            ]),
        };
        this._editor = this._register(scopedInstantiationService.createInstance(CodeEditorWidget, editorContainer, editorOptions, widgetOptions));
        this._editor.setModel(textModel);
        // Ensure suggest widget renders above the input (not clipped by container)
        SuggestController.get(this._editor)?.forceRenderingAbove();
        this._register(this._editor.onDidFocusEditorWidget(() => this._onDidFocus.fire()));
        this._register(this._editor.onDidBlurEditorWidget(() => this._onDidBlur.fire()));
        this._register(this._editor.onKeyDown(e => {
            if (e.keyCode === 3 /* KeyCode.Enter */ && !e.shiftKey && !e.ctrlKey && !e.altKey) {
                // Don't send if the suggest widget is visible (let it accept the completion)
                if (this._editor.contextKeyService.getContextKeyValue('suggestWidgetVisible')) {
                    return;
                }
                e.preventDefault();
                e.stopPropagation();
                this._send();
            }
            if (e.keyCode === 3 /* KeyCode.Enter */ && !e.shiftKey && !e.ctrlKey && e.altKey) {
                e.preventDefault();
                e.stopPropagation();
                this._send();
            }
        }));
        // Update history navigation enablement based on cursor position
        const updateHistoryNavigationEnablement = () => {
            const model = this._editor.getModel();
            const position = this._editor.getPosition();
            if (!model || !position) {
                return;
            }
            this._historyNavigationBackwardsEnablement.set(position.lineNumber === 1 && position.column === 1);
            this._historyNavigationForwardsEnablement.set(position.lineNumber === model.getLineCount() && position.column === model.getLineMaxColumn(position.lineNumber));
        };
        this._register(this._editor.onDidChangeCursorPosition(() => updateHistoryNavigationEnablement()));
        updateHistoryNavigationEnablement();
        let previousHeight = -1;
        this._register(this._editor.onDidContentSizeChange(e => {
            if (!e.contentHeightChanged) {
                return;
            }
            const contentHeight = this._editor.getContentHeight();
            const clampedHeight = Math.min(MAX_EDITOR_HEIGHT, Math.max(MIN_EDITOR_HEIGHT, contentHeight));
            if (clampedHeight === previousHeight) {
                return;
            }
            previousHeight = clampedHeight;
            this._editorContainer.style.height = `${clampedHeight}px`;
            this._editor.layout();
        }));
        // Slash commands
        this._slashCommandHandler = this._register(this.instantiationService.createInstance(SlashCommandHandler, this._editor));
        this._register(this._editor.onDidChangeModelContent(() => {
            this._updateDraftState();
            this._updateSendButtonState();
        }));
    }
    _focusEditor() {
        this._editor?.focus();
    }
    _createAttachButton(container) {
        const attachButton = dom.append(container, dom.$('.sessions-chat-attach-button'));
        const attachButtonLabel = localize(3175, null);
        attachButton.tabIndex = 0;
        attachButton.role = 'button';
        attachButton.ariaLabel = attachButtonLabel;
        this._register(this.hoverService.setupDelayedHover(attachButton, {
            content: attachButtonLabel,
            position: { hoverPosition: 2 /* HoverPosition.BELOW */ },
            appearance: { showPointer: true }
        }));
        dom.append(attachButton, renderIcon(Codicon.add));
        this._register(dom.addDisposableListener(attachButton, dom.EventType.CLICK, () => {
            this._contextAttachments.showPicker(this._getContextFolderUri());
        }));
    }
    /**
     * Returns the folder URI for the context picker based on the current project selection.
     */
    _getContextFolderUri() {
        return this._newSession.value?.project?.uri;
    }
    _createBottomToolbar(container) {
        const toolbar = dom.append(container, dom.$('.sessions-chat-toolbar'));
        this._createAttachButton(toolbar);
        // Mode picker (before model pickers)
        this._modePicker.render(toolbar);
        this._modePicker.setVisible(false);
        // Local model picker (EnhancedModelPickerActionItem)
        this._localModelPickerContainer = dom.append(toolbar, dom.$('.sessions-chat-model-picker'));
        this._createLocalModelPicker(this._localModelPickerContainer);
        // Extension toolbar pickers (agent picker for remote sessions)
        this._toolbarPickersContainer = dom.append(toolbar, dom.$('.sessions-chat-toolbar-pickers'));
        // Remote model picker (action list dropdown)
        this._cloudModelPicker.render(toolbar);
        this._cloudModelPicker.setVisible(false);
        dom.append(toolbar, dom.$('.sessions-chat-toolbar-spacer'));
        this._loadingSpinner = dom.append(toolbar, dom.$('.sessions-chat-loading-spinner'));
        this._register(this.hoverService.setupManagedHover(getDefaultHoverDelegate('mouse'), this._loadingSpinner, localize(3176, null)));
        const sendButtonContainer = dom.append(toolbar, dom.$('.sessions-chat-send-button'));
        const sendButton = this._sendButton = this._register(new Button(sendButtonContainer, {
            secondary: true,
            title: localize(3177, null),
            ariaLabel: localize(3178, null),
        }));
        sendButton.icon = Codicon.send;
        this._register(sendButton.onDidClick(() => this._send()));
        this._updateSendButtonState();
    }
    // --- Model picker ---
    _createLocalModelPicker(container) {
        const delegate = {
            currentModel: this._currentLanguageModel,
            setModel: (model) => {
                this._currentLanguageModel.set(model, undefined);
                this._newSession.value?.setModelId(model.identifier);
                this._focusEditor();
            },
            getModels: () => this._getAvailableModels(),
            useGroupedModelPicker: () => true,
            showManageModelsAction: () => false,
            showUnavailableFeatured: () => false,
            showFeatured: () => true,
        };
        const pickerOptions = {
            hideChevrons: observableValue('hideChevrons', false),
            hoverPosition: { hoverPosition: 3 /* HoverPosition.ABOVE */ },
        };
        const action = { id: 'sessions.modelPicker', label: '', enabled: true, class: undefined, tooltip: '', run: () => { } };
        const modelPicker = this.instantiationService.createInstance(EnhancedModelPickerActionItem, action, delegate, pickerOptions);
        this._modelPickerDisposable.value = modelPicker;
        modelPicker.render(container);
    }
    _initDefaultModel() {
        const models = this._getAvailableModels();
        const draft = this._getDraftState();
        const lastModelId = draft?.selectedModel?.identifier ?? this._history.values.at(-1)?.selectedModel?.identifier;
        const defaultModel = (lastModelId ? models.find(m => m.identifier === lastModelId) : undefined) ?? models[0];
        this._currentLanguageModel.set(defaultModel, undefined);
    }
    _getAvailableModels() {
        return this.languageModelsService.getLanguageModelIds()
            .map(id => {
            const metadata = this.languageModelsService.lookupLanguageModel(id);
            return metadata ? { metadata, identifier: id } : undefined;
        })
            .filter((m) => !!m && m.metadata.targetChatSessionType === AgentSessionProviders.Background);
    }
    // --- Welcome: Target & option pickers (dropdown row below input) ---
    _renderOptionGroupPickers() {
        if (!this._pickersContainer) {
            return;
        }
        this._clearAllPickers();
        dom.clearNode(this._pickersContainer);
        const pickersRow = dom.append(this._pickersContainer, dom.$('.chat-full-welcome-pickers'));
        // Project picker (unified folder + repo picker)
        this._workspacePicker.render(pickersRow);
    }
    // --- Local session pickers ---
    _renderLocalSessionPickers() {
        this._clearAllPickers();
        // Show local model and mode pickers, hide remote
        if (this._localModelPickerContainer) {
            this._localModelPickerContainer.style.display = '';
        }
        this._modePicker.setVisible(true);
        this._permissionPicker.setVisible(true);
        this._cloudModelPicker.setVisible(false);
    }
    // --- Remote session pickers ---
    _renderRemoteSessionPickers(session, force) {
        // Show remote model picker, hide local pickers
        if (this._localModelPickerContainer) {
            this._localModelPickerContainer.style.display = 'none';
        }
        this._modePicker.setVisible(false);
        this._permissionPicker.setVisible(false);
        this._branchPicker.setVisible(false);
        this._isolationPicker.setVisible(false);
        this._cloudModelPicker.setSession(session);
        this._cloudModelPicker.setVisible(true);
        // Render toolbar pickers (other groups) — separator visibility is managed inside
        this._renderToolbarPickers(session, force);
    }
    _renderToolbarPickers(session, force) {
        if (!this._toolbarPickersContainer) {
            return;
        }
        const toolbarOptions = session.getOtherOptionGroups();
        // Filter by item availability (when-clause filtering is done by the session)
        const visibleGroups = toolbarOptions.filter(option => {
            const group = option.group;
            return group.items.length > 0 || (group.commands || []).length > 0 || !!group.searchable;
        });
        if (visibleGroups.length === 0) {
            this._clearToolbarPickers();
            return;
        }
        if (!force) {
            const allMatch = visibleGroups.length === this._toolbarPickerWidgets.size && visibleGroups.every(o => this._toolbarPickerWidgets.has(o.group.id));
            if (allMatch) {
                return;
            }
        }
        this._clearToolbarPickers();
        for (const option of visibleGroups) {
            this._renderToolbarPickerWidget(option, session);
        }
    }
    _renderToolbarPickerWidget(option, session) {
        const { group: optionGroup, value: initialItem } = option;
        if (initialItem) {
            this._updateOptionContextKey(optionGroup.id, initialItem.id);
        }
        const initialState = { group: optionGroup, item: initialItem };
        const emitter = this._getOrCreateOptionEmitter(optionGroup.id);
        const itemDelegate = {
            getCurrentOption: () => session.getOptionValue(optionGroup.id) ?? initialItem,
            onDidChangeOption: emitter.event,
            setOption: (item) => {
                this._updateOptionContextKey(optionGroup.id, item.id);
                emitter.fire(item);
                session.setOptionValue(optionGroup.id, item);
                this._focusEditor();
            },
            getOptionGroup: () => {
                const modelOpt = session.getModelOptionGroup();
                if (modelOpt?.group.id === optionGroup.id) {
                    return modelOpt.group;
                }
                return session.getOtherOptionGroups().find(o => o.group.id === optionGroup.id)?.group;
            },
            getSessionResource: () => session.resource,
        };
        const action = toAction({ id: optionGroup.id, label: optionGroup.name, run: () => { } });
        const widget = this.instantiationService.createInstance(optionGroup.searchable ? SearchableOptionPickerActionItem : ChatSessionPickerActionItem, action, initialState, itemDelegate, undefined);
        this._toolbarPickerDisposables.add(widget);
        this._toolbarPickerWidgets.set(optionGroup.id, widget);
        const slot = dom.append(this._toolbarPickersContainer, dom.$('.sessions-chat-picker-slot'));
        widget.render(slot);
    }
    _updateOptionContextKey(optionGroupId, optionItemId) {
        let contextKey = this._optionContextKeys.get(optionGroupId);
        if (!contextKey) {
            const rawKey = new RawContextKey(`chatSessionOption.${optionGroupId}`, '');
            contextKey = rawKey.bindTo(this.contextKeyService);
            this._optionContextKeys.set(optionGroupId, contextKey);
        }
        contextKey.set(optionItemId.trim());
    }
    _getOrCreateOptionEmitter(optionGroupId) {
        let emitter = this._optionEmitters.get(optionGroupId);
        if (!emitter) {
            emitter = new Emitter();
            this._optionEmitters.set(optionGroupId, emitter);
            this._toolbarPickerDisposables.add(emitter);
        }
        return emitter;
    }
    _clearToolbarPickers() {
        this._toolbarPickerDisposables.clear();
        this._toolbarPickerWidgets.clear();
        this._optionEmitters.clear();
        if (this._toolbarPickersContainer) {
            dom.clearNode(this._toolbarPickersContainer);
        }
    }
    _clearAllPickers() {
        this._clearToolbarPickers();
    }
    // --- Input History (IHistoryNavigationWidget) ---
    showPreviousValue() {
        if (this._history.isAtStart()) {
            return;
        }
        if (this._draftState?.inputText || this._draftState?.attachments.length) {
            this._history.overlay(this._draftState);
        }
        this._navigateHistory(true);
    }
    showNextValue() {
        if (this._history.isAtEnd()) {
            return;
        }
        if (this._draftState?.inputText || this._draftState?.attachments.length) {
            this._history.overlay(this._draftState);
        }
        this._navigateHistory(false);
    }
    _updateDraftState() {
        const attachments = [...this._contextAttachments.attachments];
        this._draftState = {
            inputText: this._editor?.getModel()?.getValue() ?? '',
            attachments,
            mode: { id: ChatModeKind.Agent, kind: ChatModeKind.Agent },
            selectedModel: this._currentLanguageModel.get(),
            selections: this._editor?.getSelections() ?? [],
            contrib: {},
            branch: this._branchPicker.selectedBranch,
            projectUri: this._newSession.value?.project?.uri.toJSON(),
        };
    }
    _navigateHistory(previous) {
        const entry = previous ? this._history.previous() : this._history.next();
        const inputText = entry?.inputText ?? '';
        if (entry) {
            this._editor?.getModel()?.setValue(inputText);
            this._contextAttachments.setAttachments(entry.attachments);
        }
        aria.status(inputText);
        if (previous) {
            this._editor.setPosition({ lineNumber: 1, column: 1 });
        }
        else {
            const model = this._editor.getModel();
            if (model) {
                const lastLine = model.getLineCount();
                this._editor.setPosition({ lineNumber: lastLine, column: model.getLineMaxColumn(lastLine) });
            }
        }
    }
    // --- Send ---
    _updateSendButtonState() {
        if (!this._sendButton) {
            return;
        }
        const hasText = !!this._editor?.getModel()?.getValue().trim();
        this._sendButton.enabled = !this._sending && hasText && !(this._newSession.value?.disabled ?? true);
    }
    async _send() {
        let query = this._editor.getModel()?.getValue().trim();
        const session = this._newSession.value;
        if (!query || !session || this._sending) {
            return;
        }
        // If the session is disabled due to missing folder/repo, open the picker
        if (session.disabled) {
            if (!this._hasRequiredRepoOrFolderSelection(session.target)) {
                this._openRepoOrFolderPicker(session.target);
            }
            return;
        }
        // Check for slash commands first
        if (this._slashCommandHandler?.tryExecuteSlashCommand(query)) {
            this._editor.getModel()?.setValue('');
            return;
        }
        // Expand prompt/skill slash commands into a CLI-friendly reference
        const expanded = this._slashCommandHandler?.tryExpandPromptSlashCommand(query);
        if (expanded) {
            query = expanded;
        }
        session.setQuery(query);
        session.setAttachedContext(this._contextAttachments.attachments.length > 0 ? [...this._contextAttachments.attachments] : undefined);
        if (this._draftState) {
            this._history.append(this._draftState);
        }
        this._clearDraftState();
        this._sending = true;
        this._editor.updateOptions({ readOnly: true });
        this._updateSendButtonState();
        this._updateInputLoadingState();
        try {
            await this.sessionsManagementService.sendRequestForNewSession(session.resource, {
                permissionLevel: this._permissionPicker.permissionLevel,
            });
            this._newSessionListener.clear();
            this._contextAttachments.clear();
            this._editor.getModel()?.setValue('');
        }
        catch (e) {
            this.logService.error('Failed to send request:', e);
        }
        this._sending = false;
        this._editor.updateOptions({ readOnly: false });
        this._updateSendButtonState();
        this._updateInputLoadingState();
    }
    /**
     * Checks whether the required folder/repo selection exists for the given session type.
     * For Local/Background targets, checks the folder picker.
     * For other targets, checks extension-contributed repo/folder option groups.
     */
    _hasRequiredRepoOrFolderSelection(_sessionType) {
        return !!this._newSession.value?.project;
    }
    _openRepoOrFolderPicker(_sessionType) {
        this._workspacePicker.showPicker();
    }
    async _requestFolderTrust(folderUri, previousProject) {
        const trusted = await this.workspaceTrustRequestService.requestResourcesTrust({
            uri: folderUri,
            message: localize(3179, null),
        });
        if (!trusted) {
            this._workspacePicker.removeFromRecents(folderUri);
            if (previousProject) {
                this._workspacePicker.setSelectedProject(previousProject, false);
            }
            else {
                this._workspacePicker.clearSelection();
            }
        }
        return !!trusted;
    }
    _restoreState() {
        const draft = this._getDraftState();
        if (draft) {
            this._editor?.getModel()?.setValue(draft.inputText);
            if (draft.attachments?.length) {
                this._contextAttachments.setAttachments(draft.attachments.map(IChatRequestVariableEntry.fromExport));
            }
            if (draft.selectedModel) {
                const models = this._getAvailableModels();
                const model = models.find(m => m.identifier === draft.selectedModel?.identifier);
                if (model) {
                    this._currentLanguageModel.set(model, undefined);
                }
            }
            if (draft.branch) {
                this._branchPicker.setPreferredBranch(draft.branch);
            }
            if (draft.projectUri) {
                try {
                    const project = new SessionWorkspace(URI.revive(draft.projectUri));
                    this._workspacePicker.setSelectedProject(project, false);
                }
                catch { /* ignore */ }
            }
        }
    }
    _getDraftState() {
        const raw = this.storageService.get(STORAGE_KEY_DRAFT_STATE, 1 /* StorageScope.WORKSPACE */);
        if (!raw) {
            return undefined;
        }
        try {
            return JSON.parse(raw);
        }
        catch {
            return undefined;
        }
    }
    _clearDraftState() {
        // Preserve picker preferences so they survive widget recreation
        const preserved = {
            inputText: '',
            attachments: [],
            mode: { id: ChatModeKind.Agent, kind: ChatModeKind.Agent },
            selectedModel: this._draftState?.selectedModel,
            selections: [],
            contrib: {},
            branch: this._newSession.value?.branch,
            projectUri: this._newSession.value?.project?.uri.toJSON(),
        };
        this._draftState = preserved;
        this.storageService.store(STORAGE_KEY_DRAFT_STATE, JSON.stringify(preserved), 1 /* StorageScope.WORKSPACE */, 1 /* StorageTarget.MACHINE */);
    }
    saveState() {
        if (this._draftState) {
            const state = {
                ...this._draftState,
                attachments: this._draftState.attachments.map(IChatRequestVariableEntry.toExport),
            };
            this.storageService.store(STORAGE_KEY_DRAFT_STATE, JSON.stringify(state), 1 /* StorageScope.WORKSPACE */, 1 /* StorageTarget.MACHINE */);
        }
    }
    layout(_height, _width) {
        this._editor?.layout();
    }
    focusInput() {
        this._editor?.focus();
    }
    /**
     * Handles a project selection from the unified project picker.
     * Infers the session target from the selection kind, creates a new session,
     * and shows/hides pickers accordingly.
     */
    async _onProjectSelected(project) {
        // Cancel any in-flight project selection
        this._projectSelectionCts.value?.cancel();
        const cts = this._projectSelectionCts.value = new CancellationTokenSource();
        if (project.isFolder) {
            // For folder selections, request trust
            const trusted = await this._requestFolderTrust(project.uri, this._newSession.value?.project);
            if (!trusted || cts.token.isCancellationRequested) {
                return;
            }
        }
        if (cts.token.isCancellationRequested) {
            return;
        }
        // Always create a new session when the project changes
        await this._createNewSession(project);
    }
    prefillInput(text) {
        const editor = this._editor;
        const model = editor?.getModel();
        if (editor && model) {
            model.setValue(text);
            const lastLine = model.getLineCount();
            const maxColumn = model.getLineMaxColumn(lastLine);
            editor.setPosition({ lineNumber: lastLine, column: maxColumn });
            editor.focus();
        }
    }
    sendQuery(text) {
        const model = this._editor?.getModel();
        if (model) {
            model.setValue(text);
            this._send();
        }
    }
};
NewChatWidget = __decorate([
    __param(1, IInstantiationService),
    __param(2, IModelService),
    __param(3, IConfigurationService),
    __param(4, ILanguageModelsService),
    __param(5, IContextKeyService),
    __param(6, ILogService),
    __param(7, IHoverService),
    __param(8, ISessionsManagementService),
    __param(9, IGitService),
    __param(10, IStorageService),
    __param(11, IWorkspaceTrustRequestService)
], NewChatWidget);
// #endregion
// #region --- New Chat View Pane ---
export const SessionsViewId = 'workbench.view.sessions.chat';
/**
 * A view pane that hosts the new-session welcome widget.
 */
let NewChatViewPane = class NewChatViewPane extends ViewPane {
    constructor(options, keybindingService, contextMenuService, configurationService, contextKeyService, viewDescriptorService, instantiationService, openerService, themeService, hoverService) {
        super(options, keybindingService, contextMenuService, configurationService, contextKeyService, viewDescriptorService, instantiationService, openerService, themeService, hoverService);
    }
    renderBody(container) {
        super.renderBody(container);
        this._widget = this._register(this.instantiationService.createInstance(NewChatWidget, {}));
        this._widget.render(container);
        this._widget.focusInput();
    }
    layoutBody(height, width) {
        super.layoutBody(height, width);
        this._widget?.layout(height, width);
    }
    focus() {
        super.focus();
        this._widget?.focusInput();
    }
    prefillInput(text) {
        this._widget?.prefillInput(text);
    }
    sendQuery(text) {
        this._widget?.sendQuery(text);
    }
    setVisible(visible) {
        super.setVisible(visible);
        if (visible) {
            this._widget?.focusInput();
        }
    }
    saveState() {
        this._widget?.saveState();
    }
    dispose() {
        this._widget?.saveState();
        super.dispose();
    }
};
NewChatViewPane = __decorate([
    __param(1, IKeybindingService),
    __param(2, IContextMenuService),
    __param(3, IConfigurationService),
    __param(4, IContextKeyService),
    __param(5, IViewDescriptorService),
    __param(6, IInstantiationService),
    __param(7, IOpenerService),
    __param(8, IThemeService),
    __param(9, IHoverService)
], NewChatViewPane);
export { NewChatViewPane };
// #endregion
//# sourceMappingURL=newChatViewPane.js.map