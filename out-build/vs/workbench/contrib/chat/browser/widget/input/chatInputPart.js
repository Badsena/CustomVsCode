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
var ChatInputPart_1;
import * as dom from '../../../../../../base/browser/dom.js';
import { addDisposableListener } from '../../../../../../base/browser/dom.js';
import { DEFAULT_FONT_FAMILY } from '../../../../../../base/browser/fonts.js';
import { hasModifierKeys } from '../../../../../../base/browser/keyboardEvent.js';
import { ActionViewItem, BaseActionViewItem } from '../../../../../../base/browser/ui/actionbar/actionViewItems.js';
import * as aria from '../../../../../../base/browser/ui/aria/aria.js';
import { ButtonWithIcon } from '../../../../../../base/browser/ui/button/button.js';
import { createInstantHoverDelegate } from '../../../../../../base/browser/ui/hover/hoverDelegateFactory.js';
import { equals as arraysEqual } from '../../../../../../base/common/arrays.js';
import { DeferredPromise, RunOnceScheduler } from '../../../../../../base/common/async.js';
import { CancellationToken } from '../../../../../../base/common/cancellation.js';
import { Codicon } from '../../../../../../base/common/codicons.js';
import { Emitter } from '../../../../../../base/common/event.js';
import { Iterable } from '../../../../../../base/common/iterator.js';
import { Lazy } from '../../../../../../base/common/lazy.js';
import { Disposable, DisposableMap, DisposableStore, MutableDisposable, toDisposable } from '../../../../../../base/common/lifecycle.js';
import { ResourceSet } from '../../../../../../base/common/map.js';
import { Schemas } from '../../../../../../base/common/network.js';
import { mixin } from '../../../../../../base/common/objects.js';
import { autorun, derived, derivedOpts, observableFromEvent, observableValue } from '../../../../../../base/common/observable.js';
import { isMacintosh } from '../../../../../../base/common/platform.js';
import { isEqual } from '../../../../../../base/common/resources.js';
import { URI } from '../../../../../../base/common/uri.js';
import { EditorExtensionsRegistry } from '../../../../../../editor/browser/editorExtensions.js';
import { CodeEditorWidget } from '../../../../../../editor/browser/widget/codeEditor/codeEditorWidget.js';
import { EditorOptions } from '../../../../../../editor/common/config/editorOptions.js';
import { Range } from '../../../../../../editor/common/core/range.js';
import { isLocation } from '../../../../../../editor/common/languages.js';
import { IModelService } from '../../../../../../editor/common/services/model.js';
import { ITextModelService } from '../../../../../../editor/common/services/resolverService.js';
import { CopyPasteController } from '../../../../../../editor/contrib/dropOrPasteInto/browser/copyPasteController.js';
import { DropIntoEditorController } from '../../../../../../editor/contrib/dropOrPasteInto/browser/dropIntoEditorController.js';
import { ContentHoverController } from '../../../../../../editor/contrib/hover/browser/contentHoverController.js';
import { GlyphHoverController } from '../../../../../../editor/contrib/hover/browser/glyphHoverController.js';
import { LinkDetector } from '../../../../../../editor/contrib/links/browser/links.js';
import { SuggestController } from '../../../../../../editor/contrib/suggest/browser/suggestController.js';
import { localize } from '../../../../../../nls.js';
import { IAccessibilityService } from '../../../../../../platform/accessibility/common/accessibility.js';
import { MenuWorkbenchButtonBar } from '../../../../../../platform/actions/browser/buttonbar.js';
import { MenuWorkbenchToolBar } from '../../../../../../platform/actions/browser/toolbar.js';
import { MenuId, MenuItemAction } from '../../../../../../platform/actions/common/actions.js';
import { IConfigurationService } from '../../../../../../platform/configuration/common/configuration.js';
import { ContextKeyExpr, IContextKeyService, RawContextKey } from '../../../../../../platform/contextkey/common/contextkey.js';
import { IFileService } from '../../../../../../platform/files/common/files.js';
import { registerAndCreateHistoryNavigationContext } from '../../../../../../platform/history/browser/contextScopedHistoryWidget.js';
import { IInstantiationService } from '../../../../../../platform/instantiation/common/instantiation.js';
import { ServiceCollection } from '../../../../../../platform/instantiation/common/serviceCollection.js';
import { IKeybindingService } from '../../../../../../platform/keybinding/common/keybinding.js';
import { ILogService } from '../../../../../../platform/log/common/log.js';
import { observableMemento } from '../../../../../../platform/observable/common/observableMemento.js';
import { bindContextKey } from '../../../../../../platform/observable/common/platformObservableUtils.js';
import { IStorageService } from '../../../../../../platform/storage/common/storage.js';
import { IThemeService } from '../../../../../../platform/theme/common/themeService.js';
import { ISharedWebContentExtractorService } from '../../../../../../platform/webContentExtractor/common/webContentExtractor.js';
import { IWorkspaceContextService } from '../../../../../../platform/workspace/common/workspace.js';
import { IWorkbenchLayoutService } from '../../../../../services/layout/browser/layoutService.js';
import { IViewDescriptorService } from '../../../../../common/views.js';
import { ResourceLabels } from '../../../../../browser/labels.js';
import { IWorkbenchAssignmentService } from '../../../../../services/assignment/common/assignmentService.js';
import { IChatEntitlementService } from '../../../../../services/chat/common/chatEntitlementService.js';
import { ACTIVE_GROUP, IEditorService, SIDE_GROUP } from '../../../../../services/editor/common/editorService.js';
import { getSimpleCodeEditorWidgetOptions, getSimpleEditorOptions, setupSimpleEditorSelectionStyling } from '../../../../codeEditor/browser/simpleEditorOptions.js';
import { ChatContextKeys } from '../../../common/actions/chatContextKeys.js';
import { ChatRequestVariableSet, isElementVariableEntry, isImageVariableEntry, isNotebookOutputVariableEntry, isPasteVariableEntry, isPromptFileVariableEntry, isPromptTextVariableEntry, isSCMHistoryItemChangeRangeVariableEntry, isSCMHistoryItemChangeVariableEntry, isSCMHistoryItemVariableEntry, isStringVariableEntry } from '../../../common/attachments/chatVariableEntries.js';
import { ChatMode, getModeNameForTelemetry, IChatModeService } from '../../../common/chatModes.js';
import { IChatService } from '../../../common/chatService/chatService.js';
import { agentOptionId, IChatSessionsService, isIChatSessionFileChange2, localChatSessionType } from '../../../common/chatSessionsService.js';
import { ChatAgentLocation, ChatConfiguration, ChatModeKind, ChatPermissionLevel, isAutoApproveLevel, validateChatMode } from '../../../common/constants.js';
import { ILanguageModelChatMetadata, ILanguageModelsService } from '../../../common/languageModels.js';
import { filterModelsForSession, findDefaultModel, hasModelsTargetingSession, isModelValidForSession, mergeModelsWithCache, resolveModelFromSyncState, shouldResetModelToDefault, shouldResetOnModelListChange, shouldRestoreLateArrivingModel, shouldRestorePersistedModel } from './chatModelSelectionLogic.js';
import { getChatSessionType } from '../../../common/model/chatUri.js';
import { isResponseVM } from '../../../common/model/chatViewModel.js';
import { IChatAgentService } from '../../../common/participants/chatAgents.js';
import { ILanguageModelToolsService } from '../../../common/tools/languageModelToolsService.js';
import { ChatHistoryNavigator } from '../../../common/widget/chatWidgetHistoryService.js';
import { ChatSessionPrimaryPickerAction, ChatSubmitAction, OpenDelegationPickerAction, OpenModelPickerAction, OpenModePickerAction, OpenPermissionPickerAction, OpenSessionTargetPickerAction, OpenWorkspacePickerAction } from '../../actions/chatExecuteActions.js';
import { AgentSessionProviders, getAgentSessionProvider } from '../../agentSessions/agentSessions.js';
import { IAgentSessionsService } from '../../agentSessions/agentSessionsService.js';
import { ChatAttachmentModel } from '../../attachments/chatAttachmentModel.js';
import { IChatAttachmentWidgetRegistry } from '../../attachments/chatAttachmentWidgetRegistry.js';
import { DefaultChatAttachmentWidget, ElementChatAttachmentWidget, FileAttachmentWidget, ImageAttachmentWidget, NotebookCellOutputChatAttachmentWidget, PasteAttachmentWidget, PromptFileAttachmentWidget, PromptTextAttachmentWidget, SCMHistoryItemAttachmentWidget, SCMHistoryItemChangeAttachmentWidget, SCMHistoryItemChangeRangeAttachmentWidget, TerminalCommandAttachmentWidget, ToolSetOrToolItemAttachmentWidget } from '../../attachments/chatAttachmentWidgets.js';
import { ChatImplicitContexts } from '../../attachments/chatImplicitContext.js';
import { ImplicitContextAttachmentWidget } from '../../attachments/implicitContextAttachment.js';
import { isIChatResourceViewContext, isIChatViewViewContext } from '../../chat.js';
import { ChatEditingShowChangesAction, ViewAllSessionChangesAction, ViewPreviousEditsAction } from '../../chatEditing/chatEditingActions.js';
import { resizeImage } from '../../chatImageUtils.js';
import { ChatSessionPickerActionItem } from '../../chatSessions/chatSessionPickerActionItem.js';
import { SearchableOptionPickerActionItem } from '../../chatSessions/searchableOptionPickerActionItem.js';
import { IChatContextService } from '../../contextContrib/chatContextService.js';
import { ChatQuestionCarouselPart } from '../chatContentParts/chatQuestionCarouselPart.js';
import { CollapsibleListPool } from '../chatContentParts/chatReferencesContentPart.js';
import { ChatTodoListWidget } from '../chatContentParts/chatTodoListWidget.js';
import { ChatArtifactsWidget } from '../chatArtifactsWidget.js';
import { ChatDragAndDrop } from '../chatDragAndDrop.js';
import { ChatFollowups } from './chatFollowups.js';
import { ChatInputPartWidgetController } from './chatInputPartWidgets.js';
import { ChatSelectedTools } from './chatSelectedTools.js';
import { DelegationSessionPickerActionItem } from './delegationSessionPickerActionItem.js';
import { ModePickerActionItem } from './modePickerActionItem.js';
import { PermissionPickerActionItem } from './permissionPickerActionItem.js';
import { SessionTypePickerActionItem } from './sessionTargetPickerActionItem.js';
import { WorkspacePickerActionItem } from './workspacePickerActionItem.js';
import { ChatContextUsageWidget } from '../../widgetHosts/viewPane/chatContextUsageWidget.js';
import { Target } from '../../../common/promptSyntax/promptTypes.js';
import { EnhancedModelPickerActionItem } from './modelPickerActionItem2.js';
const $ = dom.$;
const INPUT_EDITOR_MAX_HEIGHT = 250;
const INPUT_EDITOR_LINE_HEIGHT = 20;
const INPUT_EDITOR_PADDING = { compact: { top: 2, bottom: 2 }, default: { top: 12, bottom: 12 } };
const CachedLanguageModelsKey = 'chat.cachedLanguageModels.v2';
const CHAT_INPUT_PICKER_COLLAPSE_WIDTH = 320;
export var ChatWidgetLocation;
(function (ChatWidgetLocation) {
    ChatWidgetLocation["SidebarLeft"] = "sidebarLeft";
    ChatWidgetLocation["SidebarRight"] = "sidebarRight";
    ChatWidgetLocation["Panel"] = "panel";
    ChatWidgetLocation["Editor"] = "editor";
})(ChatWidgetLocation || (ChatWidgetLocation = {}));
const emptyInputState = observableMemento({
    defaultValue: undefined,
    key: 'chat.untitledInputState',
    toStorage: JSON.stringify,
    fromStorage(value) {
        const obj = JSON.parse(value);
        if (obj.selectedModel && !obj.selectedModel.metadata.isDefaultForLocation) {
            const oldIsDefault = obj.selectedModel.metadata.isDefault;
            const isDefaultForLocation = { [ChatAgentLocation.Chat]: Boolean(oldIsDefault) };
            mixin(obj.selectedModel.metadata, { isDefaultForLocation: isDefaultForLocation });
            delete obj.selectedModel.metadata.isDefault;
        }
        return obj;
    },
});
let ChatInputPart = class ChatInputPart extends Disposable {
    static { ChatInputPart_1 = this; }
    static { this._counter = 0; }
    get attachmentModel() {
        return this._attachmentModel;
    }
    getAttachedContext() {
        const contextArr = new ChatRequestVariableSet();
        contextArr.add(...this.attachmentModel.attachments, ...this.chatContextService.getWorkspaceContextItems());
        return contextArr;
    }
    getAttachedAndImplicitContext() {
        const contextArr = this.getAttachedContext();
        if (this.implicitContext) {
            const implicitChatVariables = this.implicitContext.enabledBaseEntries(this.configurationService.getValue('chat.implicitContext.suggestedContext'));
            contextArr.add(...implicitChatVariables);
        }
        return contextArr;
    }
    get implicitContext() {
        return this._implicitContext;
    }
    get inputContainerElement() {
        return this.inputContainer;
    }
    get gettingStartedTipContainerElement() {
        return this.chatGettingStartedTipContainer;
    }
    get inputEditor() {
        return this._inputEditor;
    }
    get currentLanguageModel() {
        return this._currentLanguageModel.get()?.identifier;
    }
    get selectedLanguageModel() {
        return this._currentLanguageModel;
    }
    get currentModeKind() {
        const mode = this._currentModeObservable.get();
        return mode.kind === ChatModeKind.Agent && !this.agentService.hasToolsAgent ?
            ChatModeKind.Edit :
            mode.kind;
    }
    get currentModeObs() {
        return this._currentModeObservable;
    }
    get currentPermissionLevelObs() {
        return this._currentPermissionLevel;
    }
    get currentModeInfo() {
        const mode = this._currentModeObservable.get();
        const modeId = mode.isBuiltin ? this.currentModeKind : 'custom';
        const modeInstructions = mode.modeInstructions?.get();
        return {
            kind: this.currentModeKind,
            isBuiltin: mode.isBuiltin,
            modeInstructions: modeInstructions ? {
                uri: mode.uri?.get(),
                name: mode.name.get(),
                content: modeInstructions.content,
                toolReferences: this.toolService.toToolReferences(modeInstructions.toolReferences),
                metadata: modeInstructions.metadata,
                isBuiltin: mode.isBuiltin
            } : undefined,
            modeId: modeId,
            modeName: getModeNameForTelemetry(mode),
            applyCodeBlockSuggestionId: undefined,
            permissionLevel: this._currentPermissionLevel.get(),
        };
    }
    get selectedElements() {
        const edits = [];
        const editsList = this._chatEditList?.object;
        const selectedElements = editsList?.getSelectedElements() ?? [];
        for (const element of selectedElements) {
            if (element.kind === 'reference' && URI.isUri(element.reference)) {
                edits.push(element.reference);
            }
        }
        return edits;
    }
    /**
     * The number of working set entries that the user actually wanted to attach.
     * This is less than or equal to {@link ChatInputPart.chatEditWorkingSetFiles}.
     */
    get attemptedWorkingSetEntriesCount() {
        return this._attemptedWorkingSetEntriesCount;
    }
    /**
     * Gets the pending delegation target if one is set.
     * This is used when the user changes the session target picker to a different provider
     * but hasn't submitted yet, so the delegation will happen on submit.
     */
    get pendingDelegationTarget() {
        return this._pendingDelegationTarget;
    }
    constructor(
    // private readonly editorOptions: ChatEditorOptions, // TODO this should be used
    location, options, styles, inline, modelService, instantiationService, contextKeyService, configurationService, keybindingService, accessibilityService, languageModelsService, logService, fileService, editorService, themeService, textModelResolverService, storageService, agentService, sharedWebExtracterService, experimentService, entitlementService, chatModeService, toolService, chatService, chatSessionsService, chatContextService, agentSessionsService, workspaceContextService, layoutService, viewDescriptorService, _chatAttachmentWidgetRegistry) {
        super();
        this.location = location;
        this.options = options;
        this.inline = inline;
        this.modelService = modelService;
        this.instantiationService = instantiationService;
        this.contextKeyService = contextKeyService;
        this.configurationService = configurationService;
        this.keybindingService = keybindingService;
        this.accessibilityService = accessibilityService;
        this.languageModelsService = languageModelsService;
        this.logService = logService;
        this.fileService = fileService;
        this.editorService = editorService;
        this.themeService = themeService;
        this.textModelResolverService = textModelResolverService;
        this.storageService = storageService;
        this.agentService = agentService;
        this.sharedWebExtracterService = sharedWebExtracterService;
        this.experimentService = experimentService;
        this.entitlementService = entitlementService;
        this.chatModeService = chatModeService;
        this.toolService = toolService;
        this.chatService = chatService;
        this.chatSessionsService = chatSessionsService;
        this.chatContextService = chatContextService;
        this.agentSessionsService = agentSessionsService;
        this.workspaceContextService = workspaceContextService;
        this.layoutService = layoutService;
        this.viewDescriptorService = viewDescriptorService;
        this._chatAttachmentWidgetRegistry = _chatAttachmentWidgetRegistry;
        this._workingSetCollapsed = observableValue('chatInputPart.workingSetCollapsed', true);
        this._stableInputPartWidth = observableValue('chatInputPart.stableInputPartWidth', 0);
        this._chatInputTodoListWidget = this._register(new MutableDisposable());
        this._chatArtifactsWidget = this._register(new MutableDisposable());
        this._chatQuestionCarouselWidgets = this._register(new DisposableMap());
        this._questionCarouselResponseIds = new Map();
        this._questionCarouselSessionResources = new Map();
        this._chatEditingTodosDisposables = this._register(new DisposableStore());
        this._onDidLoadInputState = this._register(new Emitter());
        this.onDidLoadInputState = this._onDidLoadInputState.event;
        this._toolbarRelayoutScheduler = this._register(new RunOnceScheduler(() => {
            if (typeof this.cachedWidth === 'number') {
                this.layout(this.cachedWidth);
            }
        }, 0));
        this._onDidFocus = this._register(new Emitter());
        this.onDidFocus = this._onDidFocus.event;
        this._onDidBlur = this._register(new Emitter());
        this.onDidBlur = this._onDidBlur.event;
        this._onDidChangeContext = this._register(new Emitter());
        this.onDidChangeContext = this._onDidChangeContext.event;
        this._onDidAcceptFollowup = this._register(new Emitter());
        this.onDidAcceptFollowup = this._onDidAcceptFollowup.event;
        this._onDidClickOverlay = this._register(new Emitter());
        this.onDidClickOverlay = this._onDidClickOverlay.event;
        this._indexOfLastAttachedContextDeletedWithKeyboard = -1;
        this._indexOfLastOpenedContext = -1;
        this._onDidChangeVisibility = this._register(new Emitter());
        this.inputEditorHeight = 0;
        this.followupsDisposables = this._register(new DisposableStore());
        this.overlayClickListener = this._register(new MutableDisposable());
        this.attachedContextDisposables = this._register(new MutableDisposable());
        this._widgetController = this._register(new MutableDisposable());
        this._contextUsageDisposables = this._register(new MutableDisposable());
        this.height = observableValue(this, 0);
        this._forceVisibleScrollbarUntilAccept = false;
        // Disposables for model observation
        this._modelSyncDisposables = this._register(new DisposableStore());
        // Flag to prevent circular updates between view and model
        this._isSyncingToOrFromInputModel = false;
        this.chatSessionPickerWidgets = new Map();
        this._waitForPersistedLanguageModel = this._register(new MutableDisposable());
        this._chatSessionOptionEmitters = new Map();
        /**
         * Map of option group ID to its context key.
         * Keys follow the pattern `chatSessionOption.<groupId>` and hold the currently selected option item ID.
         */
        this._optionContextKeys = new Map();
        this._currentLanguageModel = observableValue('_currentLanguageModel', undefined);
        this._onDidChangeCurrentChatMode = this._register(new Emitter());
        this.onDidChangeCurrentChatMode = this._onDidChangeCurrentChatMode.event;
        this.inputUri = URI.parse(`${Schemas.vscodeChatInput}:input-${ChatInputPart_1._counter++}`);
        this._workingSetLinesAddedSpan = new Lazy(() => dom.$('.working-set-lines-added'));
        this._workingSetLinesRemovedSpan = new Lazy(() => dom.$('.working-set-lines-removed'));
        this._chatEditsActionsDisposables = this._register(new DisposableStore());
        this._chatEditsDisposables = this._register(new DisposableStore());
        this._renderingChatEdits = this._register(new MutableDisposable());
        this._attemptedWorkingSetEntriesCount = 0;
        this._chatSessionIsEmpty = false;
        this._pendingDelegationTarget = undefined;
        this._currentSessionType = undefined;
        // Initialize debounced text sync scheduler
        this._syncTextDebounced = this._register(new RunOnceScheduler(() => this._syncInputStateToModel(), 150));
        this._emptyInputState = this._register(emptyInputState(1 /* StorageScope.WORKSPACE */, 0 /* StorageTarget.USER */, this.storageService));
        this._contextResourceLabels = this._register(this.instantiationService.createInstance(ResourceLabels, { onDidChangeVisibility: this._onDidChangeVisibility.event }));
        this._currentModeObservable = observableValue('currentMode', this.options.defaultMode ?? ChatMode.Agent);
        this._currentPermissionLevel = observableValue('permissionLevel', ChatPermissionLevel.Default);
        this._register(this.editorService.onDidActiveEditorChange(() => {
            this._indexOfLastOpenedContext = -1;
            this.refreshChatSessionPickers();
        }));
        // React to chat session option changes for the active session
        this._register(this.chatSessionsService.onDidChangeSessionOptions(e => {
            const sessionResource = this._widget?.viewModel?.model.sessionResource;
            if (sessionResource && isEqual(sessionResource, e)) {
                // Options changed for our current session - refresh pickers
                this.refreshChatSessionPickers();
            }
        }));
        this._register(this.chatSessionsService.onDidChangeOptionGroups(chatSessionType => {
            const sessionResource = this._widget?.viewModel?.model.sessionResource;
            if (sessionResource) {
                const ctx = this.chatService.getChatSessionFromInternalUri(sessionResource);
                const delegateSessionType = this.options.sessionTypePickerDelegate?.getActiveSessionProvider?.();
                if (ctx && (getChatSessionType(ctx.chatSessionResource) === chatSessionType) || delegateSessionType === chatSessionType) {
                    this.refreshChatSessionPickers();
                }
            }
        }));
        // Listen for session type changes from the welcome page delegate
        if (this.options.sessionTypePickerDelegate?.onDidChangeActiveSessionProvider) {
            this._register(this.options.sessionTypePickerDelegate.onDidChangeActiveSessionProvider(async (newSessionType) => {
                this.computeVisibleOptionGroups();
                this.agentSessionTypeKey.set(newSessionType);
                this.chatSessionSupportsDelegationKey.set(this.chatSessionsService.supportsDelegationForSessionType(newSessionType));
                this.updateWidgetLockStateFromSessionType(newSessionType);
                this.refreshChatSessionPickers();
            }));
        }
        this._attachmentModel = this._register(this.instantiationService.createInstance(ChatAttachmentModel));
        this._register(this._attachmentModel.onDidChange(() => this._syncInputStateToModel()));
        this.selectedToolsModel = this._register(this.instantiationService.createInstance(ChatSelectedTools, this.currentModeObs, this._currentLanguageModel));
        this.dnd = this._register(this.instantiationService.createInstance(ChatDragAndDrop, () => this._widget, this._attachmentModel, styles));
        this.inputEditorMaxHeight = this.options.renderStyle === 'compact' ? INPUT_EDITOR_MAX_HEIGHT / 3 : INPUT_EDITOR_MAX_HEIGHT;
        const padding = this.options.renderStyle === 'compact' ? INPUT_EDITOR_PADDING.compact : INPUT_EDITOR_PADDING.default;
        this.inputEditorMinHeight = this.options.inputEditorMinLines ? this.options.inputEditorMinLines * INPUT_EDITOR_LINE_HEIGHT + padding.top + padding.bottom : undefined;
        this.inputEditorHasText = ChatContextKeys.inputHasText.bindTo(contextKeyService);
        this.chatCursorAtTop = ChatContextKeys.inputCursorAtTop.bindTo(contextKeyService);
        this.inputEditorHasFocus = ChatContextKeys.inputHasFocus.bindTo(contextKeyService);
        this._hasQuestionCarouselContextKey = ChatContextKeys.Editing.hasQuestionCarousel.bindTo(contextKeyService);
        this.chatModeKindKey = ChatContextKeys.chatModeKind.bindTo(contextKeyService);
        this.chatModeNameKey = ChatContextKeys.chatModeName.bindTo(contextKeyService);
        this.chatModelIdKey = ChatContextKeys.chatModelId.bindTo(contextKeyService);
        this.permissionLevelKey = ChatContextKeys.chatPermissionLevel.bindTo(contextKeyService);
        this.withinEditSessionKey = ChatContextKeys.withinEditSessionDiff.bindTo(contextKeyService);
        this.filePartOfEditSessionKey = ChatContextKeys.filePartOfEditSession.bindTo(contextKeyService);
        this.chatSessionHasOptions = ChatContextKeys.chatSessionHasModels.bindTo(contextKeyService);
        this.chatSessionOptionsValid = ChatContextKeys.chatSessionOptionsValid.bindTo(contextKeyService);
        this.agentSessionTypeKey = ChatContextKeys.agentSessionType.bindTo(contextKeyService);
        this.chatSessionSupportsDelegationKey = ChatContextKeys.chatSessionSupportsDelegation.bindTo(contextKeyService);
        // Initialize agentSessionType from delegate if available
        if (this.options.sessionTypePickerDelegate?.getActiveSessionProvider) {
            const initialSessionType = this.options.sessionTypePickerDelegate.getActiveSessionProvider();
            if (initialSessionType) {
                this.agentSessionTypeKey.set(initialSessionType);
                this.chatSessionSupportsDelegationKey.set(this.chatSessionsService.supportsDelegationForSessionType(initialSessionType));
            }
        }
        this.chatSessionHasCustomAgentTarget = ChatContextKeys.chatSessionHasCustomAgentTarget.bindTo(contextKeyService);
        this.chatSessionHasTargetedModels = ChatContextKeys.chatSessionHasTargetedModels.bindTo(contextKeyService);
        this.history = this._register(this.instantiationService.createInstance(ChatHistoryNavigator, this.location));
        this._register(this.configurationService.onDidChangeConfiguration(e => {
            const newOptions = {};
            if (e.affectsConfiguration("accessibility.verbosity.panelChat" /* AccessibilityVerbositySettingId.Chat */)) {
                newOptions.ariaLabel = this._getAriaLabel();
            }
            if (e.affectsConfiguration('editor.wordSegmenterLocales')) {
                newOptions.wordSegmenterLocales = this.configurationService.getValue('editor.wordSegmenterLocales');
            }
            if (e.affectsConfiguration('editor.autoClosingBrackets')) {
                newOptions.autoClosingBrackets = this.configurationService.getValue('editor.autoClosingBrackets');
            }
            if (e.affectsConfiguration('editor.autoClosingQuotes')) {
                newOptions.autoClosingQuotes = this.configurationService.getValue('editor.autoClosingQuotes');
            }
            if (e.affectsConfiguration('editor.autoSurround')) {
                newOptions.autoSurround = this.configurationService.getValue('editor.autoSurround');
            }
            this.inputEditor.updateOptions(newOptions);
        }));
        this._chatEditsListPool = this._register(this.instantiationService.createInstance(CollapsibleListPool, this._onDidChangeVisibility.event, MenuId.ChatEditingWidgetModifiedFilesToolbar, { verticalScrollMode: 3 /* ScrollbarVisibility.Visible */ }));
        this._hasFileAttachmentContextKey = ChatContextKeys.hasFileAttachments.bindTo(contextKeyService);
        this.initSelectedModel();
        this._register(this.languageModelsService.onDidChangeLanguageModels(() => {
            if (shouldResetOnModelListChange(this._currentLanguageModel.get()?.identifier, this.getModels())) {
                this.setCurrentLanguageModelToDefault();
            }
        }));
        this._register(this.onDidChangeCurrentChatMode(() => {
            this.accessibilityService.alert(this._currentModeObservable.get().label.get());
            if (this._inputEditor) {
                this._inputEditor.updateOptions({ ariaLabel: this._getAriaLabel() });
            }
            this.setImplicitContextEnablement();
        }));
        this._register(autorun(reader => {
            const lm = this._currentLanguageModel.read(reader);
            this.chatModelIdKey.set(lm?.metadata.id.toLowerCase() ?? '');
            if (lm?.metadata.name) {
                this.accessibilityService.alert(lm.metadata.name);
            }
            this._inputEditor?.updateOptions({ ariaLabel: this._getAriaLabel() });
        }));
        this._register(this.chatModeService.onDidChangeChatModes(() => this.validateCurrentChatMode()));
        this._register(autorun(r => {
            const mode = this._currentModeObservable.read(r);
            this.chatModeKindKey.set(mode.kind);
            this.chatModeNameKey.set(mode.name.read(r));
            const models = mode.model?.read(r);
            if (models) {
                this.switchModelByQualifiedName(models);
            }
        }));
        this._register(autorun(r => {
            const mode = this._currentModeObservable.read(r);
            const modeName = mode.name.read(r);
            const sessionResource = this._widget?.viewModel?.model.sessionResource;
            if (sessionResource) {
                const ctx = this.chatService.getChatSessionFromInternalUri(sessionResource);
                if (ctx) {
                    let needsUpdate = true;
                    const agentOption = this.chatSessionsService.getSessionOption(ctx.chatSessionResource, agentOptionId);
                    if (typeof agentOption !== 'undefined') {
                        const agentId = (typeof agentOption === 'string' ? agentOption : agentOption.id) || ChatMode.Agent.id;
                        const isDefaultAgent = agentId === ChatMode.Agent.id;
                        needsUpdate = isDefaultAgent
                            ? mode.id !== ChatMode.Agent.id
                            : mode.label.read(undefined) !== agentId; // Extensions use Label (name) as identifier for custom agents.
                    }
                    if (needsUpdate) {
                        this.chatSessionsService.notifySessionOptionsChange(ctx.chatSessionResource, [{ optionId: agentOptionId, value: mode.isBuiltin ? '' : modeName }]).catch(err => this.logService.error('Failed to notify extension of agent change:', err));
                    }
                }
            }
        }));
        // Validate the initial mode - if Agent mode is set by default but disabled by policy, switch to Ask
        this.validateCurrentChatMode();
    }
    setImplicitContextEnablement() {
        if (this.implicitContext && this.configurationService.getValue('chat.implicitContext.suggestedContext')) {
            this.implicitContext.setEnabled(this._currentModeObservable.get().name.get().toLowerCase() === 'ask');
        }
    }
    setIsWithinEditSession(inInsideDiff, isFilePartOfEditSession) {
        this.withinEditSessionKey.set(inInsideDiff);
        this.filePartOfEditSessionKey.set(isFilePartOfEditSession);
    }
    getSelectedModelStorageKey() {
        const sessionType = this._currentSessionType;
        if (sessionType && this.hasModelsTargetingSessionType()) {
            return `chat.currentLanguageModel.${this.location}.${sessionType}`;
        }
        return `chat.currentLanguageModel.${this.location}`;
    }
    getSelectedModelIsDefaultStorageKey() {
        const sessionType = this._currentSessionType;
        if (sessionType && this.hasModelsTargetingSessionType()) {
            return `chat.currentLanguageModel.${this.location}.${sessionType}.isDefault`;
        }
        return `chat.currentLanguageModel.${this.location}.isDefault`;
    }
    initSelectedModel() {
        const persistedSelection = this.storageService.get(this.getSelectedModelStorageKey(), -1 /* StorageScope.APPLICATION */);
        const persistedAsDefault = this.storageService.getBoolean(this.getSelectedModelIsDefaultStorageKey(), -1 /* StorageScope.APPLICATION */, true);
        if (persistedSelection) {
            const result = shouldRestorePersistedModel(persistedSelection, persistedAsDefault, this.getModels(), this.location);
            if (result.shouldRestore && result.model) {
                this.setCurrentLanguageModel(result.model);
                this.checkModelSupported();
            }
            else if (!result.model) {
                this._waitForPersistedLanguageModel.value = this.languageModelsService.onDidChangeLanguageModels(e => {
                    const persistedModel = this.languageModelsService.lookupLanguageModel(persistedSelection);
                    if (persistedModel) {
                        this._waitForPersistedLanguageModel.clear();
                        const lateModel = { metadata: persistedModel, identifier: persistedSelection };
                        if (shouldRestoreLateArrivingModel(persistedSelection, persistedAsDefault, lateModel, this.location)) {
                            this.setCurrentLanguageModel(lateModel);
                            this.checkModelSupported();
                        }
                    }
                    else {
                        this.setCurrentLanguageModelToDefault();
                    }
                });
            }
        }
        this._register(this._onDidChangeCurrentChatMode.event(() => {
            this.checkModelSupported();
        }));
    }
    setEditing(enabled, editingSentRequest) {
        this.currentlyEditingInputKey?.set(enabled);
        this.editingSentRequestKey?.set(editingSentRequest);
    }
    switchModel(modelMetadata) {
        const models = this.getModels();
        const model = models.find(m => m.metadata.vendor === modelMetadata.vendor && m.metadata.id === modelMetadata.id && m.metadata.family === modelMetadata.family);
        if (model) {
            this.setCurrentLanguageModel(model);
        }
    }
    switchModelByQualifiedName(qualifiedModelNames) {
        const models = this.getModels();
        for (const qualifiedModelName of qualifiedModelNames) {
            const model = models.find(m => ILanguageModelChatMetadata.matchesQualifiedName(qualifiedModelName, m.metadata));
            if (model) {
                this.setCurrentLanguageModel(model);
                return true;
            }
        }
        this.logService.warn(`[chat] Node of the models "${qualifiedModelNames.join(', ')}" not found. Use format "<name> (<vendor>)", e.g. "GPT-4o (copilot)".`);
        return false;
    }
    switchToNextModel() {
        const models = this.getModels();
        if (models.length > 0) {
            const currentIndex = models.findIndex(model => model.identifier === this._currentLanguageModel.get()?.identifier);
            const nextIndex = (currentIndex + 1) % models.length;
            this.setCurrentLanguageModel(models[nextIndex]);
        }
    }
    openModelPicker() {
        this.modelWidget?.show();
    }
    openModePicker() {
        this.modeWidget?.show();
    }
    openPermissionPicker() {
        this.permissionWidget?.show();
    }
    setPermissionLevel(level) {
        this._currentPermissionLevel.set(level, undefined);
        this.permissionLevelKey.set(level);
        this.permissionWidget?.refresh();
    }
    openSessionTargetPicker() {
        this.sessionTargetWidget?.show();
    }
    openDelegationPicker() {
        this.delegationWidget?.show();
    }
    openChatSessionPicker() {
        // Open the first available picker widget
        const firstWidget = this.chatSessionPickerWidgets?.values()?.next().value;
        firstWidget?.show();
    }
    /**
     * Create picker widgets for all option groups available for the current session type.
     */
    createChatSessionPickerWidgets(action, pickerOptions) {
        this._lastSessionPickerAction = action;
        this._lastSessionPickerOptions = pickerOptions;
        const result = this.computeVisibleOptionGroups();
        if (!result) {
            return [];
        }
        const { visibleGroupIds, optionGroups, effectiveSessionType } = result;
        // Clear existing widgets
        this.disposeSessionPickerWidgets();
        const widgets = [];
        for (const optionGroup of optionGroups) {
            if (!visibleGroupIds.has(optionGroup.id)) {
                continue;
            }
            const initialItem = this.getCurrentOptionForGroup(optionGroup.id);
            const initialState = { group: optionGroup, item: initialItem };
            // Create delegate for this option group
            const itemDelegate = {
                getCurrentOption: () => this.getCurrentOptionForGroup(optionGroup.id),
                onDidChangeOption: this.getOrCreateOptionEmitter(optionGroup.id).event,
                setOption: (option) => {
                    // Update context key for this option group
                    this.updateOptionContextKey(optionGroup.id, option.id);
                    this.getOrCreateOptionEmitter(optionGroup.id).fire(option);
                    // Notify session if we have one (not in welcome view before session creation)
                    const sessionResource = this._widget?.viewModel?.model.sessionResource;
                    const currentCtx = sessionResource ? this.chatService.getChatSessionFromInternalUri(sessionResource) : undefined;
                    if (currentCtx) {
                        this.chatSessionsService.notifySessionOptionsChange(currentCtx.chatSessionResource, [{ optionId: optionGroup.id, value: option }]).catch(err => this.logService.error(`Failed to notify extension of ${optionGroup.id} change:`, err));
                    }
                    // Refresh pickers to re-evaluate visibility of other option groups
                    this.refreshChatSessionPickers();
                },
                getOptionGroup: () => {
                    const groups = this.chatSessionsService.getOptionGroupsForSessionType(effectiveSessionType);
                    return groups?.find(g => g.id === optionGroup.id);
                },
                getSessionResource: () => {
                    return this._widget?.viewModel?.model.sessionResource;
                }
            };
            const widget = this.instantiationService.createInstance(optionGroup.searchable ? SearchableOptionPickerActionItem : ChatSessionPickerActionItem, action, initialState, itemDelegate, pickerOptions);
            this.chatSessionPickerWidgets.set(optionGroup.id, widget);
            widgets.push(widget);
        }
        return widgets;
    }
    /**
     * Set the input model reference for syncing input state
     */
    setInputModel(model, chatSessionIsEmpty) {
        this._inputModel = model;
        this._modelSyncDisposables.clear();
        this.selectedToolsModel.resetSessionEnablementState();
        this._chatSessionIsEmpty = chatSessionIsEmpty;
        // Reset permission level on new sessions, unless global auto-approve is on
        // or the current permission level is already auto-approve/autopilot
        if (chatSessionIsEmpty && !this.configurationService.getValue(ChatConfiguration.GlobalAutoApprove) && !isAutoApproveLevel(this._currentPermissionLevel.get())) {
            this._currentPermissionLevel.set(ChatPermissionLevel.Default, undefined);
            this.permissionLevelKey.set(ChatPermissionLevel.Default);
            this.permissionWidget?.refresh();
        }
        // TODO@roblourens This is for an experiment which will be obsolete in a month or two and can then be removed.
        if (chatSessionIsEmpty) {
            this._setEmptyModelState();
        }
        // Observe changes from model and sync to view
        this._modelSyncDisposables.add(autorun(reader => {
            let state = model.state.read(reader);
            if (!state && this._chatSessionIsEmpty) {
                state = this._emptyInputState.read(undefined);
            }
            this._syncFromModel(state);
        }));
    }
    _setEmptyModelState() {
        const storageKey = this.getDefaultModeExperimentStorageKey();
        const hasSetDefaultMode = this.storageService.getBoolean(storageKey, 1 /* StorageScope.WORKSPACE */, false);
        if (!hasSetDefaultMode) {
            const isAnonymous = this.entitlementService.anonymous;
            this.experimentService.getTreatment('chat.defaultMode')
                .then((defaultModeTreatment => {
                if (isAnonymous) {
                    // be deterministic for anonymous users
                    // to support agentic flows with default
                    // model.
                    defaultModeTreatment = ChatModeKind.Agent;
                }
                if (typeof defaultModeTreatment === 'string') {
                    this.storageService.store(storageKey, true, 1 /* StorageScope.WORKSPACE */, 1 /* StorageTarget.MACHINE */);
                    const defaultMode = validateChatMode(defaultModeTreatment);
                    if (defaultMode) {
                        this.logService.trace(`Applying default mode from experiment: ${defaultMode}`);
                        this.setChatMode(defaultMode, false);
                        this.checkModelSupported();
                    }
                }
            }));
        }
    }
    /**
     * Sync from model to view (when model state changes)
     */
    _syncFromModel(state) {
        // Prevent circular updates
        if (this._isSyncingToOrFromInputModel) {
            return;
        }
        try {
            this._isSyncingToOrFromInputModel = true;
            // Sync mode
            if (state) {
                const currentMode = this._currentModeObservable.get();
                if (currentMode.id !== state.mode.id) {
                    this.setChatMode(state.mode.id, false);
                }
            }
            // Sync selected model - validate it belongs to the current session's model pool
            if (state?.selectedModel) {
                const allModels = this.getAllMergedModels();
                const sessionType = this.getCurrentSessionType();
                const syncResult = resolveModelFromSyncState(state.selectedModel, this._currentLanguageModel.get(), allModels, sessionType, {
                    location: this.location,
                    currentModeKind: this.currentModeKind,
                    isInlineChatV2Enabled: !!this.configurationService.getValue("inlineChat.enableV2" /* InlineChatConfigKeys.EnableV2 */),
                    sessionType,
                });
                if (syncResult.action === 'apply') {
                    this.setCurrentLanguageModel(state.selectedModel);
                }
                else if (syncResult.action === 'default') {
                    this.setCurrentLanguageModelToDefault();
                }
            }
            // Sync attachments
            const currentAttachments = this._attachmentModel.attachments;
            if (!state) {
                this._attachmentModel.clear();
            }
            else if (!arraysEqual(currentAttachments, state.attachments)) {
                this._attachmentModel.clearAndSetContext(...state.attachments);
            }
            // Sync input text
            if (this._inputEditor) {
                this._inputEditor.setValue(state?.inputText || '');
                if (state?.selections.length) {
                    this._inputEditor.setSelections(state.selections);
                }
            }
            if (state) {
                this._widget?.contribs.forEach(contrib => {
                    contrib.setInputState?.(state.contrib);
                });
            }
        }
        finally {
            this._isSyncingToOrFromInputModel = false;
        }
    }
    /**
     * Sync current input state to the input model
     */
    _syncInputStateToModel() {
        if (this._isSyncingToOrFromInputModel) {
            return;
        }
        this._isSyncingToOrFromInputModel = true;
        const state = this.getCurrentInputState();
        if (this._chatSessionIsEmpty) {
            this._emptyInputState.set(state, undefined);
        }
        this._inputModel?.setState(state);
        this._isSyncingToOrFromInputModel = false;
    }
    setCurrentLanguageModel(model) {
        this._currentLanguageModel.set(model, undefined);
        if (this.cachedWidth) {
            // For quick chat and editor chat, relayout because the input may need to shrink to accomodate the model name
            this.layout(this.cachedWidth);
        }
        // Store as global user preference (session-specific state is in the model's inputModel)
        this.storageService.store(this.getSelectedModelStorageKey(), model.identifier, -1 /* StorageScope.APPLICATION */, 0 /* StorageTarget.USER */);
        this.storageService.store(this.getSelectedModelIsDefaultStorageKey(), !!model.metadata.isDefaultForLocation[this.location], -1 /* StorageScope.APPLICATION */, 0 /* StorageTarget.USER */);
        // Sync to model
        this._syncInputStateToModel();
    }
    checkModelSupported() {
        const lm = this._currentLanguageModel.get();
        const allModels = this.getAllMergedModels();
        if (shouldResetModelToDefault(lm, this.getModels(), {
            location: this.location,
            currentModeKind: this.currentModeKind,
            isInlineChatV2Enabled: !!this.configurationService.getValue("inlineChat.enableV2" /* InlineChatConfigKeys.EnableV2 */),
            sessionType: this.getCurrentSessionType(),
        }, allModels)) {
            this.setCurrentLanguageModelToDefault();
        }
    }
    /**
     * By ID- prefer this method
     */
    setChatMode(mode, storeSelection = true) {
        if (!this.options.supportsChangingModes) {
            return;
        }
        const mode2 = this.chatModeService.findModeById(mode) ??
            this.chatModeService.findModeByName(mode) ??
            this.chatModeService.findModeById(ChatModeKind.Agent) ??
            ChatMode.Ask;
        this.setChatMode2(mode2, storeSelection);
    }
    setChatMode2(mode, storeSelection = true) {
        if (!this.options.supportsChangingModes) {
            return;
        }
        this._currentModeObservable.set(mode, undefined);
        this._onDidChangeCurrentChatMode.fire();
        // Sync to model (mode is now persisted in the model's input state)
        this._syncInputStateToModel();
    }
    /**
     * Get all models merged from live and cache, without session/mode filtering.
     * This is the canonical source for the full model pool, including cached models
     * that bridge startup races when live models haven't loaded yet.
     */
    getAllMergedModels() {
        const cachedModels = this.storageService.getObject(CachedLanguageModelsKey, -1 /* StorageScope.APPLICATION */, []);
        const liveModels = this.languageModelsService.getLanguageModelIds()
            .map(modelId => ({ identifier: modelId, metadata: this.languageModelsService.lookupLanguageModel(modelId) }));
        const contributedVendors = new Set(this.languageModelsService.getVendors().map(v => v.vendor));
        const models = mergeModelsWithCache(liveModels, cachedModels, contributedVendors);
        if (liveModels.length > 0) {
            this.storageService.store(CachedLanguageModelsKey, models, -1 /* StorageScope.APPLICATION */, 1 /* StorageTarget.MACHINE */);
        }
        return models;
    }
    getModels() {
        const models = this.getAllMergedModels();
        models.sort((a, b) => a.metadata.name.localeCompare(b.metadata.name));
        return filterModelsForSession(models, this.getCurrentSessionType(), this.currentModeKind, this.location, !!this.configurationService.getValue("inlineChat.enableV2" /* InlineChatConfigKeys.EnableV2 */));
    }
    /**
     * Get the chat session type for the current session, if any.
     * Uses the delegate or `getChatSessionFromInternalUri` to determine the session type.
     */
    getCurrentSessionType() {
        const delegateSessionType = this.options.sessionTypePickerDelegate?.getActiveSessionProvider?.();
        if (delegateSessionType) {
            return delegateSessionType;
        }
        const sessionResource = this._widget?.viewModel?.model.sessionResource;
        const ctx = sessionResource ? this.chatService.getChatSessionFromInternalUri(sessionResource) : undefined;
        return ctx ? getChatSessionType(ctx.chatSessionResource) : undefined;
    }
    /**
     * Check if any registered models target the current session type.
     * This is used to set the context key that controls model picker visibility.
     */
    hasModelsTargetingSessionType() {
        return hasModelsTargetingSession(this.getAllMergedModels(), this.getCurrentSessionType());
    }
    isModelValidForCurrentSession(model) {
        return isModelValidForSession(model, this.getAllMergedModels(), this.getCurrentSessionType());
    }
    /**
     * Validate that the current model belongs to the current session's pool.
     * Called when switching sessions to prevent cross-contamination.
     */
    checkModelInSessionPool() {
        const lm = this._currentLanguageModel.get();
        if (lm && !this.isModelValidForCurrentSession(lm)) {
            this.setCurrentLanguageModelToDefault();
        }
    }
    /**
     * Pre-select the model in the model picker based on the `modelId` from the
     * last request in the current session's history. This ensures that when a
     * contributed chat session is reopened, the model picker shows the model
     * that was last used - providing continuity.
     */
    preselectModelFromSessionHistory() {
        const sessionResource = this._widget?.viewModel?.model.sessionResource;
        const ctx = sessionResource ? this.chatService.getChatSessionFromInternalUri(sessionResource) : undefined;
        const requiresCustomModels = ctx && this.chatSessionsService.requiresCustomModelsForSessionType(getChatSessionType(ctx.chatSessionResource));
        if (!requiresCustomModels) {
            return;
        }
        const requests = this._widget?.viewModel?.model.getRequests();
        if (!requests || requests.length === 0) {
            return;
        }
        // Find the modelId from the last request that has one
        let lastModelId;
        for (let i = requests.length - 1; i >= 0; i--) {
            if (requests[i].modelId) {
                lastModelId = requests[i].modelId;
                break;
            }
        }
        if (!lastModelId) {
            return;
        }
        const tryMatch = () => {
            const models = this.getModels();
            // Try exact identifier match first (e.g. "copilot/gpt-4o")
            let match = models.find(m => m.identifier === lastModelId);
            if (!match) {
                // Fallback: match on metadata.id (short model ID from the extension)
                match = models.find(m => m.metadata.id === lastModelId);
            }
            return match;
        };
        const match = tryMatch();
        if (match) {
            this.setCurrentLanguageModel(match);
            return;
        }
        // Models may not be loaded yet - wait for them
        this._waitForPersistedLanguageModel.value = this.languageModelsService.onDidChangeLanguageModels(() => {
            const found = tryMatch();
            if (found) {
                this._waitForPersistedLanguageModel.clear();
                this.setCurrentLanguageModel(found);
            }
        });
    }
    setCurrentLanguageModelToDefault() {
        const allModels = this.getModels();
        const defaultModel = findDefaultModel(allModels, this.location);
        if (defaultModel) {
            this.setCurrentLanguageModel(defaultModel);
        }
    }
    /**
     * Get the current input state for history
     */
    getCurrentInputState() {
        const mode = this._currentModeObservable.get();
        const state = {
            inputText: this._inputEditor?.getValue() ?? '',
            attachments: this._attachmentModel.attachments,
            mode: {
                id: mode.id,
                kind: mode.kind
            },
            selectedModel: this._currentLanguageModel.get(),
            selections: this._inputEditor?.getSelections() || [],
            contrib: {},
        };
        for (const contrib of this._widget?.contribs || Iterable.empty()) {
            contrib.getInputState?.(state.contrib);
        }
        return state;
    }
    _getAriaLabel() {
        const verbose = this.configurationService.getValue("accessibility.verbosity.panelChat" /* AccessibilityVerbositySettingId.Chat */);
        let kbLabel;
        if (verbose) {
            kbLabel = this.keybindingService.lookupKeybinding("editor.action.accessibilityHelp" /* AccessibilityCommandId.OpenAccessibilityHelp */)?.getLabel();
        }
        const mode = this._currentModeObservable.get();
        // Include model information if available
        const modelName = this._currentLanguageModel.get()?.metadata.name;
        const modelInfo = modelName ? localize(8192, null, modelName) : '';
        let modeLabel = '';
        if (!mode.isBuiltin) {
            const mode = this.currentModeObs.get();
            modeLabel = localize(8193, null, mode.label.get(), mode.description.get());
        }
        else {
            switch (this.currentModeKind) {
                case ChatModeKind.Agent:
                    modeLabel = localize(8194, null);
                    break;
                case ChatModeKind.Edit:
                    modeLabel = localize(8195, null);
                    break;
                case ChatModeKind.Ask:
                default:
                    modeLabel = localize(8196, null);
                    break;
            }
        }
        if (verbose) {
            return kbLabel
                ? localize(8197, null, modeLabel, modelInfo, kbLabel)
                : localize(8198, null, modeLabel, modelInfo);
        }
        else {
            return localize(8199, null, modeLabel, modelInfo);
        }
    }
    validateCurrentChatMode() {
        const currentMode = this._currentModeObservable.get();
        const validMode = this.chatModeService.findModeById(currentMode.id);
        const isAgentModeEnabled = this.configurationService.getValue(ChatConfiguration.AgentEnabled);
        if (!validMode) {
            this.setChatMode(isAgentModeEnabled ? ChatModeKind.Agent : ChatModeKind.Ask);
            return;
        }
        if (currentMode.kind === ChatModeKind.Agent && !isAgentModeEnabled) {
            this.setChatMode(ChatModeKind.Ask);
            return;
        }
    }
    getDefaultModeExperimentStorageKey() {
        const tag = this.options.widgetViewKindTag;
        return `chat.${tag}.hasSetDefaultModeByExperiment`;
    }
    logInputHistory() {
        const historyStr = this.history.values.map(entry => JSON.stringify(entry)).join('\n');
        this.logService.info(`[${this.location}] Chat input history:`, historyStr);
    }
    setVisible(visible) {
        this._onDidChangeVisibility.fire(visible);
    }
    /** If consumers are busy generating the chat input, returns the promise resolved when they finish */
    get generating() {
        return this._generating?.defer.p;
    }
    /** Disables the input submissions buttons until the disposable is disposed. */
    startGenerating() {
        this.logService.trace('ChatWidget#startGenerating');
        if (this._generating) {
            this._generating.rc++;
        }
        else {
            this._generating = { rc: 1, defer: new DeferredPromise() };
        }
        return toDisposable(() => {
            this.logService.trace('ChatWidget#doneGenerating');
            if (this._generating && !--this._generating.rc) {
                this._generating.defer.complete();
                this._generating = undefined;
            }
        });
    }
    get element() {
        return this.container;
    }
    async showPreviousValue() {
        if (this.history.isAtStart()) {
            return;
        }
        const state = this.getCurrentInputState();
        if (state.inputText || state.attachments.length) {
            this.history.overlay(state);
        }
        this.navigateHistory(true);
    }
    async showNextValue() {
        if (this.history.isAtEnd()) {
            return;
        }
        const state = this.getCurrentInputState();
        if (state.inputText || state.attachments.length) {
            this.history.overlay(state);
        }
        this.navigateHistory(false);
    }
    async navigateHistory(previous) {
        const historyEntry = previous ?
            this.history.previous() : this.history.next();
        let historyAttachments = historyEntry?.attachments ?? [];
        // Check for images in history to restore the value.
        if (historyAttachments.length > 0) {
            historyAttachments = (await Promise.all(historyAttachments.map(async (attachment) => {
                if (isImageVariableEntry(attachment) && attachment.references?.length && URI.isUri(attachment.references[0].reference)) {
                    const currReference = attachment.references[0].reference;
                    try {
                        const imageBinary = currReference.toString(true).startsWith('http') ? await this.sharedWebExtracterService.readImage(currReference, CancellationToken.None) : (await this.fileService.readFile(currReference)).value;
                        if (!imageBinary) {
                            return undefined;
                        }
                        const newAttachment = { ...attachment };
                        newAttachment.value = (isImageVariableEntry(attachment) && attachment.isPasted) ? imageBinary.buffer : await resizeImage(imageBinary.buffer); // if pasted image, we do not need to resize.
                        return newAttachment;
                    }
                    catch (err) {
                        this.logService.error('Failed to fetch and reference.', err);
                        return undefined;
                    }
                }
                return attachment;
            }))).filter(attachment => attachment !== undefined);
        }
        this._attachmentModel.clearAndSetContext(...historyAttachments);
        const inputText = historyEntry?.inputText ?? '';
        const contribData = historyEntry?.contrib ?? {};
        aria.status(inputText);
        this.setValue(inputText, true);
        this._widget?.contribs.forEach(contrib => {
            contrib.setInputState?.(contribData);
        });
        this._onDidLoadInputState.fire();
        const model = this._inputEditor.getModel();
        if (!model) {
            return;
        }
        if (previous) {
            // When navigating to previous history, always position cursor at the start (line 1, column 1)
            // This ensures that pressing up again will continue to navigate history
            this._inputEditor.setPosition({ lineNumber: 1, column: 1 });
        }
        else {
            this._inputEditor.setPosition(getLastPosition(model));
        }
    }
    setValue(value, transient) {
        this.inputEditor.setValue(value);
        // always leave cursor at the end
        const model = this.inputEditor.getModel();
        if (model) {
            this.inputEditor.setPosition(getLastPosition(model));
        }
    }
    focus() {
        this._inputEditor.focus();
    }
    hasFocus() {
        return this._inputEditor.hasWidgetFocus();
    }
    focusTodoList() {
        return this._chatInputTodoListWidget.value?.focus() ?? false;
    }
    isTodoListFocused() {
        return this._chatInputTodoListWidget.value?.hasFocus() ?? false;
    }
    hasVisibleTodos() {
        return this._chatInputTodoListWidget.value?.hasTodos() ?? false;
    }
    /**
     * Reset the input and update history.
     * @param userQuery If provided, this will be added to the history. Followups and programmatic queries should not be passed.
     */
    async acceptInput(isUserQuery) {
        if (isUserQuery) {
            const userQuery = this.getCurrentInputState();
            this.history.append(this._getFilteredEntry(userQuery));
        }
        this.resetScrollbarVisibilityAfterAccept();
        if (this._chatSessionIsEmpty) {
            this._chatSessionIsEmpty = false;
            this._emptyInputState.set(undefined, undefined);
        }
        // Clear attached context, fire event to clear input state, and clear the input editor
        this.attachmentModel.clear();
        this._onDidLoadInputState.fire();
        if (this.accessibilityService.isScreenReaderOptimized() && isMacintosh) {
            this._acceptInputForVoiceover();
        }
        else {
            this._inputEditor.focus();
            this._inputEditor.setValue('');
        }
    }
    validateAgentMode() {
        if (!this.agentService.hasToolsAgent && this._currentModeObservable.get().kind === ChatModeKind.Agent) {
            this.setChatMode(ChatModeKind.Edit);
        }
    }
    // A function that filters out specifically the `value` property of the attachment.
    _getFilteredEntry(inputState) {
        const attachmentsWithoutImageValues = inputState.attachments.map(attachment => {
            if (isImageVariableEntry(attachment) && attachment.references?.length && attachment.value) {
                const newAttachment = { ...attachment };
                newAttachment.value = undefined;
                return newAttachment;
            }
            return attachment;
        });
        return { ...inputState, attachments: attachmentsWithoutImageValues };
    }
    _acceptInputForVoiceover() {
        const domNode = this._inputEditor.getDomNode();
        if (!domNode) {
            return;
        }
        // Remove the input editor from the DOM temporarily to prevent VoiceOver
        // from reading the cleared text (the request) to the user.
        domNode.remove();
        this._inputEditor.setValue('');
        this._inputEditorElement.appendChild(domNode);
        this._inputEditor.focus();
    }
    _handleAttachedContextChange() {
        this._hasFileAttachmentContextKey.set(Boolean(this._attachmentModel.attachments.find(a => a.kind === 'file')));
        this.renderAttachedContext();
    }
    getOrCreateOptionEmitter(optionGroupId) {
        let emitter = this._chatSessionOptionEmitters.get(optionGroupId);
        if (!emitter) {
            emitter = this._register(new Emitter());
            this._chatSessionOptionEmitters.set(optionGroupId, emitter);
        }
        return emitter;
    }
    /**
     * Get or create a context key for an option group.
     * Context keys follow the pattern `chatSessionOption.<groupId>`.
     */
    getOrCreateOptionContextKey(optionGroupId) {
        if (!this._scopedContextKeyService) {
            return undefined;
        }
        let contextKey = this._optionContextKeys.get(optionGroupId);
        if (!contextKey) {
            const rawKey = new RawContextKey(`chatSessionOption.${optionGroupId}`, '');
            contextKey = rawKey.bindTo(this._scopedContextKeyService);
            this._optionContextKeys.set(optionGroupId, contextKey);
        }
        return contextKey;
    }
    /**
     * Update the context key for an option group with the current selection.
     * This enables `when` expressions on other option groups to react to changes.
     */
    updateOptionContextKey(optionGroupId, optionItemId) {
        const normalizedOptionId = optionItemId.trim();
        const contextKey = this.getOrCreateOptionContextKey(optionGroupId);
        if (contextKey) {
            contextKey.set(normalizedOptionId);
        }
    }
    /**
     * Evaluate whether an option group should be visible based on its `when` expression.
     * Returns true if the option group should be visible, false otherwise.
     */
    evaluateOptionGroupVisibility(optionGroup) {
        if (!optionGroup.when) {
            return true; // No condition means always visible
        }
        if (!this._scopedContextKeyService) {
            return true; // No context key service yet, default to visible
        }
        const expr = ContextKeyExpr.deserialize(optionGroup.when);
        if (!expr) {
            return true; // Invalid expression defaults to visible
        }
        return this._scopedContextKeyService.contextMatchesRules(expr);
    }
    /**
     * Computes which option groups should be visible for the current session.
     *
     * A picker should show if and only if:
     * 1. We can determine a session type (from session context OR delegate)
     * 2. That session type has option groups registered
     * 3. At least one option group has items AND passes its `when` clause
     *
     * This method also updates the `chatSessionHasOptions` context key, which controls
     * whether the picker action is shown in the toolbar via its `when` clause.
     *
     * @returns The result containing visible group IDs and related context, or undefined
     *          if there are no visible option groups
     */
    computeVisibleOptionGroups() {
        const setNoOptions = () => {
            this.chatSessionHasOptions.set(false);
            this.chatSessionOptionsValid.set(true);
        };
        const sessionResource = this._widget?.viewModel?.model.sessionResource;
        const ctx = sessionResource ? this.chatService.getChatSessionFromInternalUri(sessionResource) : undefined;
        // Check if this session type has a customAgentTarget
        const customAgentTarget = ctx && this.chatSessionsService.getCustomAgentTargetForSessionType(getChatSessionType(ctx.chatSessionResource));
        this.chatSessionHasCustomAgentTarget.set(customAgentTarget !== Target.Undefined);
        // Check if this session type requires custom models
        const requiresCustomModels = ctx && this.chatSessionsService.requiresCustomModelsForSessionType(getChatSessionType(ctx.chatSessionResource));
        this.chatSessionHasTargetedModels.set(!!requiresCustomModels);
        // Handle agent option from session - set initial mode
        if (customAgentTarget) {
            const agentOption = this.chatSessionsService.getSessionOption(ctx.chatSessionResource, agentOptionId);
            if (typeof agentOption !== 'undefined') {
                const agentId = (typeof agentOption === 'string' ? agentOption : agentOption.id) || ChatMode.Agent.id;
                const currentMode = this._currentModeObservable.get();
                const isDefaultAgent = agentId === ChatMode.Agent.id;
                const needsUpdate = isDefaultAgent
                    ? currentMode.id !== ChatMode.Agent.id
                    : currentMode.label.get() !== agentId; // Extensions use Label (name) as identifier for custom agents.
                if (needsUpdate) {
                    this.setChatMode(agentId);
                }
            }
        }
        // Step 1: Determine the session type
        // - Panel/Editor: Use actual session's type (ctx available)
        // - Welcome view: Use delegate's type (ctx may not exist yet)
        const delegateSessionType = this.options.sessionTypePickerDelegate?.getActiveSessionProvider?.();
        const effectiveSessionType = delegateSessionType ?? (ctx ? getChatSessionType(ctx.chatSessionResource) : undefined);
        if (!effectiveSessionType) {
            setNoOptions();
            return undefined;
        }
        // Step 2: Get option groups for this session type
        const optionGroups = this.chatSessionsService.getOptionGroupsForSessionType(effectiveSessionType);
        if (!optionGroups || optionGroups.length === 0) {
            setNoOptions();
            return undefined;
        }
        // Update context keys with current option values before evaluating `when` clauses.
        // This ensures interdependent `when` expressions work correctly.
        if (ctx) {
            for (const optionGroup of optionGroups) {
                const currentOption = this.chatSessionsService.getSessionOption(ctx.chatSessionResource, optionGroup.id);
                if (currentOption) {
                    const optionId = typeof currentOption === 'string' ? currentOption : currentOption.id;
                    this.updateOptionContextKey(optionGroup.id, optionId);
                }
            }
        }
        // Step 3: Filter to visible groups (has items AND passes `when` clause AND session has option configured)
        const visibleGroupIds = new Set();
        for (const optionGroup of optionGroups) {
            const hasItems = optionGroup.items.length > 0 || (optionGroup.commands || []).length > 0;
            const passesWhenClause = this.evaluateOptionGroupVisibility(optionGroup);
            // Only show picker if the session has this option configured once a real session exists.
            // In the welcome view (no `ctx` yet), treat groups as eligible so they can be rendered.
            const sessionHasOption = !ctx || this.chatSessionsService.getSessionOption(ctx.chatSessionResource, optionGroup.id) !== undefined;
            if (hasItems && passesWhenClause && sessionHasOption) {
                visibleGroupIds.add(optionGroup.id);
            }
        }
        if (visibleGroupIds.size === 0) {
            setNoOptions();
            return undefined;
        }
        // Validate selected options exist in their respective groups
        let allOptionsValid = true;
        if (ctx) {
            for (const groupId of visibleGroupIds) {
                const optionGroup = optionGroups.find(g => g.id === groupId);
                const currentOption = this.chatSessionsService.getSessionOption(ctx.chatSessionResource, groupId);
                if (optionGroup && currentOption) {
                    const currentOptionId = typeof currentOption === 'string' ? currentOption : currentOption.id;
                    // TODO: @osortega @joshspicer should we add a `placeHolder` item to option groups to straighten this check?
                    if (!optionGroup.items.some(item => item.id === currentOptionId) && typeof currentOption === 'string') {
                        allOptionsValid = false;
                        break;
                    }
                }
            }
        }
        this.chatSessionHasOptions.set(true);
        this.chatSessionOptionsValid.set(allOptionsValid);
        return { visibleGroupIds, optionGroups, ctx, effectiveSessionType };
    }
    /**
     * Refresh all registered option groups for the current chat session.
     * Fires events for each option group with their current selection.
     */
    refreshChatSessionPickers() {
        // Use the shared helper to compute visibility and update context keys
        const result = this.computeVisibleOptionGroups();
        if (!result) {
            // No visible options - helper already updated context keys
            this.hideAllSessionPickerWidgets();
            return;
        }
        const { visibleGroupIds, optionGroups, ctx } = result;
        // Check if widgets need recreation (different set of visible groups)
        const currentWidgetGroupIds = new Set(this.chatSessionPickerWidgets.keys());
        const needsRecreation = currentWidgetGroupIds.size !== visibleGroupIds.size ||
            !Array.from(visibleGroupIds).every(id => currentWidgetGroupIds.has(id));
        if (needsRecreation && this._lastSessionPickerAction && this.chatSessionPickerContainer) {
            const widgets = this.createChatSessionPickerWidgets(this._lastSessionPickerAction, this._lastSessionPickerOptions);
            dom.clearNode(this.chatSessionPickerContainer);
            for (const widget of widgets) {
                const container = dom.$('.action-item.chat-sessionPicker-item');
                widget.render(container);
                this.chatSessionPickerContainer.appendChild(container);
            }
        }
        if (this.chatSessionPickerContainer) {
            this.chatSessionPickerContainer.style.display = '';
        }
        // Fire option change events for existing widgets to sync their state
        // (only if we have a session context - in welcome view, options aren't persisted yet)
        if (ctx) {
            for (const [optionGroupId] of this.chatSessionPickerWidgets.entries()) {
                const currentOption = this.chatSessionsService.getSessionOption(ctx.chatSessionResource, optionGroupId);
                if (currentOption) {
                    const optionGroup = optionGroups.find(g => g.id === optionGroupId);
                    if (optionGroup) {
                        const currentOptionId = typeof currentOption === 'string' ? currentOption : currentOption.id;
                        const item = optionGroup.items.find((m) => m.id === currentOptionId);
                        // If currentOption is an object (not a string ID), it represents a complete option item and should be used directly.
                        // Otherwise, if it's a string ID, look up the corresponding item and use that.
                        if (item && typeof currentOption === 'string') {
                            this.getOrCreateOptionEmitter(optionGroupId).fire(item);
                        }
                        else if (typeof currentOption !== 'string') {
                            this.getOrCreateOptionEmitter(optionGroupId).fire(currentOption);
                        }
                    }
                }
            }
        }
    }
    hideAllSessionPickerWidgets() {
        if (this.chatSessionPickerContainer) {
            this.chatSessionPickerContainer.style.display = 'none';
        }
    }
    disposeSessionPickerWidgets() {
        for (const widget of this.chatSessionPickerWidgets.values()) {
            widget.dispose();
        }
        this.chatSessionPickerWidgets.clear();
    }
    /**
     * Get the current option for a specific option group.
     * Returns undefined if the session doesn't have this option configured.
     */
    getCurrentOptionForGroup(optionGroupId) {
        const sessionResource = this._widget?.viewModel?.model.sessionResource;
        if (!sessionResource) {
            return;
        }
        const ctx = this.chatService.getChatSessionFromInternalUri(sessionResource);
        if (!ctx) {
            return;
        }
        // Only return an option if the session has it configured
        if (this.chatSessionsService.getSessionOption(ctx.chatSessionResource, optionGroupId) === undefined) {
            return;
        }
        const effectiveSessionType = this.getEffectiveSessionType(ctx, this.options.sessionTypePickerDelegate);
        const optionGroups = this.chatSessionsService.getOptionGroupsForSessionType(effectiveSessionType);
        const optionGroup = optionGroups?.find(g => g.id === optionGroupId);
        if (!optionGroup || optionGroup.items.length === 0) {
            return;
        }
        const currentOptionValue = this.chatSessionsService.getSessionOption(ctx.chatSessionResource, optionGroupId);
        if (!currentOptionValue) {
            const defaultItem = optionGroup.items.find(item => item.default);
            return defaultItem;
        }
        if (typeof currentOptionValue === 'string') {
            const normalizedOptionId = currentOptionValue.trim();
            return optionGroup.items.find(m => m.id === normalizedOptionId);
        }
        else {
            return currentOptionValue;
        }
    }
    getEffectiveSessionType(ctx, delegate) {
        return this.options.sessionTypePickerDelegate?.getActiveSessionProvider?.() || (ctx && getChatSessionType(ctx.chatSessionResource)) || '';
    }
    /**
     * Updates the agentSessionType context key based on delegate or actual session.
     */
    updateAgentSessionTypeContextKey() {
        const sessionResource = this._widget?.viewModel?.model.sessionResource;
        // Determine effective session type:
        // - If we have a delegate with a setter (e.g., welcome page), use the delegate's session type
        // - Otherwise, use the actual session's type
        const delegate = this.options.sessionTypePickerDelegate;
        const delegateSessionType = delegate?.setActiveSessionProvider && delegate?.getActiveSessionProvider?.();
        const sessionType = delegateSessionType || (sessionResource ? getChatSessionType(sessionResource) : '');
        this.agentSessionTypeKey.set(sessionType);
        this.chatSessionSupportsDelegationKey.set(this.chatSessionsService.supportsDelegationForSessionType(sessionType));
    }
    /**
     * Updates the widget lock state based on a session type.
     * Local sessions unlock from coding agent mode, while remote/cloud sessions lock to coding agent mode.
     */
    updateWidgetLockStateFromSessionType(sessionType) {
        if (sessionType === localChatSessionType) {
            this._widget?.unlockFromCodingAgent();
            return;
        }
        const contribution = this.chatSessionsService.getChatSessionContribution(sessionType);
        if (contribution) {
            this._widget?.lockToCodingAgent(contribution.name, contribution.displayName, contribution.type);
        }
        else {
            this._widget?.unlockFromCodingAgent();
        }
    }
    /**
     * Updates the widget controller based on session type.
     */
    tryUpdateWidgetController() {
        const sessionResource = this._widget?.viewModel?.model.sessionResource;
        if (!sessionResource) {
            return;
        }
        // Determine effective session type:
        // - If we have a delegate with a setter (e.g., welcome page), use the delegate's session type
        // - Otherwise, use the actual session's type
        const delegate = this.options.sessionTypePickerDelegate;
        const delegateSessionType = delegate?.setActiveSessionProvider && delegate?.getActiveSessionProvider?.();
        const sessionType = delegateSessionType || this._pendingDelegationTarget || getChatSessionType(sessionResource);
        const isLocalSession = sessionType === localChatSessionType;
        if (!isLocalSession) {
            this._widgetController.clear();
            return;
        }
        if (!this._widgetController.value) {
            this._widgetController.value = this.instantiationService.createInstance(ChatInputPartWidgetController, this.chatInputWidgetsContainer);
        }
    }
    /**
     * Shows the context usage details popup and focuses it.
     * @returns Whether the details were successfully shown.
     */
    showContextUsageDetails() {
        return this.contextUsageWidget?.showDetails() ?? false;
    }
    /**
     * Updates the context usage widget based on the current model.
     */
    updateContextUsageWidget() {
        this._contextUsageDisposables.clear();
        const model = this._widget?.viewModel?.model;
        if (!model || !this.contextUsageWidget) {
            return;
        }
        const store = new DisposableStore();
        this._contextUsageDisposables.value = store;
        store.add(model.onDidChange(e => {
            if (e.kind === 'addRequest' || e.kind === 'completedRequest') {
                this.contextUsageWidget?.update(model.lastRequest);
            }
        }));
        // Initial update
        this.contextUsageWidget.update(model.lastRequest);
    }
    render(container, initialValue, widget) {
        this._widget = widget;
        this.computeVisibleOptionGroups();
        // Initialize lock state when rendering with a pre-selected session provider (e.g., welcome view restore)
        const delegate = this.options.sessionTypePickerDelegate;
        if (delegate?.setActiveSessionProvider && delegate?.getActiveSessionProvider) {
            const initialSessionType = delegate.getActiveSessionProvider();
            if (initialSessionType) {
                this.updateWidgetLockStateFromSessionType(initialSessionType);
            }
        }
        this._register(widget.onDidChangeViewModel((e) => {
            this._pendingDelegationTarget = undefined;
            // Update agentSessionType when view model changes
            this.updateAgentSessionTypeContextKey();
            this.refreshChatSessionPickers();
            this.tryUpdateWidgetController();
            this.updateContextUsageWidget();
            let hasMatchingResource = false;
            if (e.currentSessionResource) {
                for (const r of this._questionCarouselSessionResources.values()) {
                    if (isEqual(r, e.currentSessionResource)) {
                        hasMatchingResource = true;
                        break;
                    }
                }
            }
            if (this._questionCarouselSessionResources.size > 0 && (!e.currentSessionResource || !hasMatchingResource)) {
                this.clearQuestionCarousel();
            }
            // Track the current session type and re-initialize model selection
            // when the session type changes (different session types may have
            // different model pools via targetChatSessionType).
            const newSessionType = this.getCurrentSessionType();
            if (e.currentSessionResource && newSessionType !== this._currentSessionType) {
                this._currentSessionType = newSessionType;
                this.initSelectedModel();
                this.checkModelInSessionPool();
            }
            // For contributed sessions with history, pre-select the model
            // from the last request so the user resumes with the same model.
            this.preselectModelFromSessionHistory();
        }));
        let elements;
        if (this.options.renderStyle === 'compact') {
            elements = dom.h('.interactive-input-part', [
                dom.h('.interactive-input-and-edit-session', [
                    dom.h('.chat-question-carousel-widget-container@chatQuestionCarouselContainer'),
                    dom.h('.chat-input-widgets-container@chatInputWidgetsContainer'),
                    dom.h('.chat-todo-list-widget-container@chatInputTodoListWidgetContainer'),
                    dom.h('.chat-artifacts-widget-container@chatArtifactsWidgetContainer'),
                    dom.h('.chat-editing-session@chatEditingSessionWidgetContainer'),
                    dom.h('.chat-getting-started-tip-container@chatGettingStartedTipContainer'),
                    dom.h('.interactive-input-and-side-toolbar@inputAndSideToolbar', [
                        dom.h('.chat-input-container@inputContainer', [
                            dom.h('.chat-editor-container@editorContainer'),
                            dom.h('.chat-input-toolbars@inputToolbars'),
                        ]),
                    ]),
                    dom.h('.chat-secondary-toolbar@secondaryToolbar', [
                        dom.h('.chat-context-usage-container@contextUsageWidgetContainer'),
                    ]),
                    dom.h('.chat-attachments-container@attachmentsContainer', [
                        dom.h('.chat-attached-context@attachedContextContainer'),
                    ]),
                    dom.h('.interactive-input-followups@followupsContainer'),
                ])
            ]);
        }
        else {
            elements = dom.h('.interactive-input-part', [
                dom.h('.chat-question-carousel-widget-container@chatQuestionCarouselContainer'),
                dom.h('.interactive-input-followups@followupsContainer'),
                dom.h('.chat-input-widgets-container@chatInputWidgetsContainer'),
                dom.h('.chat-todo-list-widget-container@chatInputTodoListWidgetContainer'),
                dom.h('.chat-artifacts-widget-container@chatArtifactsWidgetContainer'),
                dom.h('.chat-editing-session@chatEditingSessionWidgetContainer'),
                dom.h('.chat-getting-started-tip-container@chatGettingStartedTipContainer'),
                dom.h('.interactive-input-and-side-toolbar@inputAndSideToolbar', [
                    dom.h('.chat-input-container@inputContainer', [
                        dom.h('.chat-attachments-container@attachmentsContainer', [
                            dom.h('.chat-attached-context@attachedContextContainer'),
                        ]),
                        dom.h('.chat-editor-container@editorContainer'),
                        dom.h('.chat-input-toolbars@inputToolbars'),
                    ]),
                ]),
                dom.h('.chat-secondary-toolbar@secondaryToolbar', [
                    dom.h('.chat-context-usage-container@contextUsageWidgetContainer'),
                ]),
            ]);
        }
        this.container = elements.root;
        this.chatInputOverlay = dom.$('.chat-input-overlay');
        container.append(this.container);
        this.container.append(this.chatInputOverlay);
        this.container.classList.toggle('compact', this.options.renderStyle === 'compact');
        // Create a scoped context key service for option group visibility expressions
        // This isolates chatSessionOption.* context keys to this specific chat input instance
        this._scopedContextKeyService = this._register(this.contextKeyService.createScoped(this.container));
        this.followupsContainer = elements.followupsContainer;
        const inputAndSideToolbar = elements.inputAndSideToolbar; // The chat input and toolbar to the right
        const inputContainer = elements.inputContainer; // The chat editor, attachments, and toolbars
        this.inputContainer = inputContainer;
        const editorContainer = elements.editorContainer;
        this.attachmentsContainer = elements.attachmentsContainer;
        this.attachedContextContainer = elements.attachedContextContainer;
        const toolbarsContainer = elements.inputToolbars;
        this.secondaryToolbarContainer = elements.secondaryToolbar;
        if (this.options.renderStyle === 'compact') {
            this.secondaryToolbarContainer.style.display = 'none';
        }
        this.chatEditingSessionWidgetContainer = elements.chatEditingSessionWidgetContainer;
        this.chatInputTodoListWidgetContainer = elements.chatInputTodoListWidgetContainer;
        this.chatArtifactsWidgetContainer = elements.chatArtifactsWidgetContainer;
        this.chatGettingStartedTipContainer = elements.chatGettingStartedTipContainer;
        this.chatGettingStartedTipContainer.style.display = 'none';
        this.chatQuestionCarouselContainer = elements.chatQuestionCarouselContainer;
        this.chatInputWidgetsContainer = elements.chatInputWidgetsContainer;
        this.contextUsageWidgetContainer = elements.contextUsageWidgetContainer;
        if (this.options.isSessionsWindow || this.options.renderStyle === 'compact') {
            toolbarsContainer.prepend(this.contextUsageWidgetContainer);
        }
        // Context usage widget — will be positioned in the toolbar after toolbars are created
        this.contextUsageWidget = this._register(this.instantiationService.createInstance(ChatContextUsageWidget));
        this.contextUsageWidgetContainer.appendChild(this.contextUsageWidget.domNode);
        if (this.options.enableImplicitContext && !this._implicitContext) {
            this._implicitContext = this._register(this.instantiationService.createInstance(ChatImplicitContexts));
            this.setImplicitContextEnablement();
            this._register(this._implicitContext.onDidChangeValue(() => {
                this._indexOfLastAttachedContextDeletedWithKeyboard = -1;
                this._handleAttachedContextChange();
            }));
        }
        else if (!this.options.enableImplicitContext && this._implicitContext) {
            this._implicitContext?.dispose();
            this._implicitContext = undefined;
        }
        this.tryUpdateWidgetController();
        this._register(this._attachmentModel.onDidChange((e) => {
            if (e.added.length > 0) {
                this._indexOfLastAttachedContextDeletedWithKeyboard = -1;
            }
            this._handleAttachedContextChange();
        }));
        this.renderChatEditingSessionState(null);
        this.dnd.addOverlay(this.options.dndContainer ?? container, this.options.dndContainer ?? container);
        const inputScopedContextKeyService = this._register(this.contextKeyService.createScoped(inputContainer));
        ChatContextKeys.inChatInput.bindTo(inputScopedContextKeyService).set(true);
        this.currentlyEditingInputKey = ChatContextKeys.currentlyEditingInput.bindTo(inputScopedContextKeyService);
        this.editingSentRequestKey = ChatContextKeys.editingRequestType.bindTo(this.contextKeyService);
        const scopedInstantiationService = this._register(this.instantiationService.createChild(new ServiceCollection([IContextKeyService, inputScopedContextKeyService])));
        const { historyNavigationBackwardsEnablement, historyNavigationForwardsEnablement } = this._register(registerAndCreateHistoryNavigationContext(inputScopedContextKeyService, this));
        this.historyNavigationBackwardsEnablement = historyNavigationBackwardsEnablement;
        this.historyNavigationForewardsEnablement = historyNavigationForwardsEnablement;
        const options = getSimpleEditorOptions(this.configurationService);
        options.overflowWidgetsDomNode = this.options.editorOverflowWidgetsDomNode;
        options.pasteAs = EditorOptions.pasteAs.defaultValue;
        options.readOnly = false;
        options.ariaLabel = this._getAriaLabel();
        options.fontFamily = DEFAULT_FONT_FAMILY;
        options.fontSize = 13;
        options.lineHeight = INPUT_EDITOR_LINE_HEIGHT;
        options.padding = this.options.renderStyle === 'compact' ? INPUT_EDITOR_PADDING.compact : INPUT_EDITOR_PADDING.default;
        options.cursorWidth = 1;
        options.wrappingStrategy = 'advanced';
        options.bracketPairColorization = { enabled: false };
        // Respect user's editor settings for auto-closing and auto-surrounding behavior
        options.autoClosingBrackets = this.configurationService.getValue('editor.autoClosingBrackets');
        options.autoClosingQuotes = this.configurationService.getValue('editor.autoClosingQuotes');
        options.autoSurround = this.configurationService.getValue('editor.autoSurround');
        options.suggest = {
            showIcons: true,
            showSnippets: false,
            showWords: true,
            showStatusBar: false,
            insertMode: 'insert',
        };
        options.scrollbar = this.options.renderStyle === 'compact'
            ? { ...(options.scrollbar ?? {}), vertical: 'hidden' }
            : {
                ...(options.scrollbar ?? {}),
                vertical: 'auto',
                verticalScrollbarSize: 7,
            };
        options.stickyScroll = { enabled: false };
        this._inputEditorElement = dom.append(editorContainer, $(chatInputEditorContainerSelector));
        const editorOptions = getSimpleCodeEditorWidgetOptions();
        editorOptions.contributions?.push(...EditorExtensionsRegistry.getSomeEditorContributions([ContentHoverController.ID, GlyphHoverController.ID, DropIntoEditorController.ID, CopyPasteController.ID, LinkDetector.ID]));
        this._inputEditor = this._register(scopedInstantiationService.createInstance(CodeEditorWidget, this._inputEditorElement, options, editorOptions));
        SuggestController.get(this._inputEditor)?.forceRenderingAbove();
        options.overflowWidgetsDomNode?.classList.add('hideSuggestTextIcons');
        this._inputEditorElement.classList.add('hideSuggestTextIcons');
        // Prevent Enter key from creating new lines - but respect user's custom keybindings
        // Only prevent default behavior if ChatSubmitAction is bound to Enter AND its precondition is met
        this._register(this._inputEditor.onKeyDown((e) => {
            if (e.keyCode === 3 /* KeyCode.Enter */ && !hasModifierKeys(e)) {
                // Check if ChatSubmitAction has a keybinding for plain Enter in the current context
                // This respects user's custom keybindings that disable the submit action
                for (const keybinding of this.keybindingService.lookupKeybindings(ChatSubmitAction.ID)) {
                    const chords = keybinding.getDispatchChords();
                    const isPlainEnter = chords.length === 1 && chords[0] === '[Enter]';
                    if (isPlainEnter) {
                        // Do NOT call stopPropagation() so the keybinding service can still process this event
                        e.preventDefault();
                        break;
                    }
                }
            }
        }));
        this._register(this._inputEditor.onDidChangeModelContent(() => {
            const currentHeight = Math.min(this._inputEditor.getContentHeight(), this.inputEditorMaxHeight);
            if (currentHeight !== this.inputEditorHeight) {
                this.inputEditorHeight = currentHeight;
                // Directly update editor layout - ResizeObserver will notify parent about height change
                if (this.cachedWidth) {
                    this._layout(this.cachedWidth);
                }
            }
            const model = this._inputEditor.getModel();
            const inputHasText = !!model && model.getValue().trim().length > 0;
            this.inputEditorHasText.set(inputHasText);
            // Debounced sync to model for text changes
            this._syncTextDebounced.schedule();
        }));
        this._register(this._inputEditor.onDidContentSizeChange(e => {
            if (e.contentHeightChanged) {
                this.inputEditorHeight = !this.inline ? e.contentHeight : this.inputEditorHeight;
                // Directly update editor layout - ResizeObserver will notify parent about height change
                if (this.cachedWidth) {
                    this._layout(this.cachedWidth);
                }
            }
        }));
        this._register(this._inputEditor.onDidFocusEditorText(() => {
            this.inputEditorHasFocus.set(true);
            this._onDidFocus.fire();
            inputContainer.classList.toggle('focused', true);
        }));
        this._register(this._inputEditor.onDidBlurEditorText(() => {
            this.inputEditorHasFocus.set(false);
            inputContainer.classList.toggle('focused', false);
            this._onDidBlur.fire();
        }));
        this._register(this._inputEditor.onDidBlurEditorWidget(() => {
            CopyPasteController.get(this._inputEditor)?.clearWidgets();
            DropIntoEditorController.get(this._inputEditor)?.clearWidgets();
        }));
        const hoverDelegate = this._register(createInstantHoverDelegate());
        const { location, isMaximized } = this.getWidgetLocationInfo(widget);
        const pickerOptions = {
            getOverflowAnchor: () => this.inputActionsToolbar.getElement(),
            actionContext: { widget },
            hideChevrons: derived(reader => this._stableInputPartWidth.read(reader) < CHAT_INPUT_PICKER_COLLAPSE_WIDTH),
            hoverPosition: {
                forcePosition: true,
                hoverPosition: location === "sidebarRight" /* ChatWidgetLocation.SidebarRight */ && !isMaximized ? 0 /* HoverPosition.LEFT */ : 1 /* HoverPosition.RIGHT */
            },
        };
        this._register(dom.addStandardDisposableListener(toolbarsContainer, dom.EventType.CLICK, e => this.inputEditor.focus()));
        this._register(dom.addStandardDisposableListener(this.attachmentsContainer, dom.EventType.CLICK, e => this.inputEditor.focus()));
        this.inputActionsToolbar = this._register(this.instantiationService.createInstance(MenuWorkbenchToolBar, this.options.renderInputToolbarBelowInput ? this.attachmentsContainer : toolbarsContainer, MenuId.ChatInput, {
            telemetrySource: this.options.menus.telemetrySource,
            menuOptions: { shouldForwardArgs: true },
            hiddenItemStrategy: -1 /* HiddenItemStrategy.NoHide */,
            hoverDelegate,
            responsiveBehavior: {
                enabled: true,
                kind: 'last',
                minItems: 1,
                actionMinWidth: 22
            },
            actionViewItemProvider: (action, options) => {
                if (action.id === OpenModelPickerAction.ID && action instanceof MenuItemAction) {
                    if (!this._currentLanguageModel) {
                        this.setCurrentLanguageModelToDefault();
                    }
                    const itemDelegate = {
                        currentModel: this._currentLanguageModel,
                        setModel: (model) => {
                            this._waitForPersistedLanguageModel.clear();
                            this.setCurrentLanguageModel(model);
                            this.renderAttachedContext();
                        },
                        getModels: () => this.getModels(),
                        useGroupedModelPicker: () => {
                            const sessionType = this.getCurrentSessionType();
                            return !sessionType || sessionType === localChatSessionType;
                        },
                        showManageModelsAction: () => {
                            const sessionType = this.getCurrentSessionType();
                            return !sessionType || sessionType === localChatSessionType;
                        },
                        showUnavailableFeatured: () => {
                            const sessionType = this.getCurrentSessionType();
                            return !sessionType || sessionType === localChatSessionType;
                        },
                        showFeatured: () => {
                            const sessionType = this.getCurrentSessionType();
                            return !sessionType || sessionType === localChatSessionType;
                        },
                    };
                    return this.modelWidget = this.instantiationService.createInstance(EnhancedModelPickerActionItem, action, itemDelegate, pickerOptions);
                }
                else if (action.id === OpenModePickerAction.ID && action instanceof MenuItemAction) {
                    const delegate = {
                        currentMode: this._currentModeObservable,
                        sessionResource: () => this._widget?.viewModel?.sessionResource,
                        customAgentTarget: () => {
                            const sessionResource = this._widget?.viewModel?.model.sessionResource;
                            const ctx = sessionResource && this.chatService.getChatSessionFromInternalUri(sessionResource);
                            return (ctx && this.chatSessionsService.getCustomAgentTargetForSessionType(getChatSessionType(ctx.chatSessionResource))) ?? Target.Undefined;
                        },
                    };
                    return this.modeWidget = this.instantiationService.createInstance(ModePickerActionItem, action, delegate, pickerOptions);
                }
                else if ((action.id === OpenSessionTargetPickerAction.ID || action.id === OpenDelegationPickerAction.ID) && action instanceof MenuItemAction) {
                    // Use provided delegate if available, otherwise create default delegate
                    const getActiveSessionType = () => {
                        const sessionResource = this._widget?.viewModel?.sessionResource;
                        return sessionResource ? getAgentSessionProvider(sessionResource) : undefined;
                    };
                    const delegate = this.options.sessionTypePickerDelegate ?? {
                        getActiveSessionProvider: () => {
                            return getActiveSessionType();
                        },
                        getPendingDelegationTarget: () => {
                            return this._pendingDelegationTarget;
                        },
                        setPendingDelegationTarget: (provider) => {
                            const isActive = getActiveSessionType() === provider;
                            this._pendingDelegationTarget = isActive ? undefined : provider;
                            this.updateWidgetLockStateFromSessionType(provider);
                            this.updateAgentSessionTypeContextKey();
                            this.refreshChatSessionPickers();
                        },
                    };
                    const isWelcomeViewMode = !!this.options.sessionTypePickerDelegate?.setActiveSessionProvider;
                    const Picker = (action.id === OpenSessionTargetPickerAction.ID || isWelcomeViewMode) ? SessionTypePickerActionItem : DelegationSessionPickerActionItem;
                    return this.sessionTargetWidget = this.instantiationService.createInstance(Picker, action, location === "editor" /* ChatWidgetLocation.Editor */ ? 'editor' : 'sidebar', delegate, pickerOptions);
                }
                else if (action.id === OpenWorkspacePickerAction.ID && action instanceof MenuItemAction) {
                    if (this.workspaceContextService.getWorkbenchState() === 1 /* WorkbenchState.EMPTY */ && this.options.workspacePickerDelegate) {
                        return this.instantiationService.createInstance(WorkspacePickerActionItem, action, this.options.workspacePickerDelegate, pickerOptions);
                    }
                    else {
                        return new HiddenActionViewItem(action);
                    }
                }
                else if (action.id === ChatSessionPrimaryPickerAction.ID && action instanceof MenuItemAction) {
                    // Create all pickers and return a container action view item
                    const widgets = this.createChatSessionPickerWidgets(action, pickerOptions);
                    if (widgets.length === 0) {
                        return new HiddenActionViewItem(action);
                    }
                    // Create a container to hold all picker widgets
                    return this.instantiationService.createInstance(ChatSessionPickersContainerActionItem, action, widgets);
                }
                return undefined;
            }
        }));
        this.inputActionsToolbar.getElement().classList.add('chat-input-toolbar');
        this.inputActionsToolbar.context = { widget };
        this._register(this.inputActionsToolbar.onDidChangeMenuItems(() => {
            // Update container reference for the pickers
            const toolbarElement = this.inputActionsToolbar.getElement();
            // eslint-disable-next-line no-restricted-syntax
            const container = toolbarElement.querySelector('.chat-sessionPicker-container');
            this.chatSessionPickerContainer = container;
            if (this.cachedWidth && typeof this.cachedInputToolbarWidth === 'number' && this.cachedInputToolbarWidth !== this.inputActionsToolbar.getItemsWidth()) {
                this._toolbarRelayoutScheduler.schedule();
            }
        }));
        this.executeToolbar = this._register(this.instantiationService.createInstance(MenuWorkbenchToolBar, toolbarsContainer, this.options.menus.executeToolbar, {
            telemetrySource: this.options.menus.telemetrySource,
            menuOptions: {
                shouldForwardArgs: true
            },
            hoverDelegate,
            hiddenItemStrategy: -1 /* HiddenItemStrategy.NoHide */,
        }));
        this.executeToolbar.getElement().classList.add('chat-execute-toolbar');
        this.executeToolbar.context = { widget };
        this._register(this.executeToolbar.onDidChangeMenuItems(() => {
            if (this.cachedWidth && typeof this.cachedExecuteToolbarWidth === 'number' && this.cachedExecuteToolbarWidth !== this.executeToolbar.getItemsWidth()) {
                this._toolbarRelayoutScheduler.schedule();
            }
        }));
        if (this.options.menus.inputSideToolbar) {
            const toolbarSide = this._register(this.instantiationService.createInstance(MenuWorkbenchToolBar, inputAndSideToolbar, this.options.menus.inputSideToolbar, {
                telemetrySource: this.options.menus.telemetrySource,
                menuOptions: {
                    shouldForwardArgs: true
                },
                hoverDelegate
            }));
            this.inputSideToolbarContainer = toolbarSide.getElement();
            toolbarSide.getElement().classList.add('chat-side-toolbar');
            toolbarSide.context = { widget };
        }
        // Secondary toolbar (permissions) — below the input box
        this.secondaryToolbar = this._register(this.instantiationService.createInstance(MenuWorkbenchToolBar, this.secondaryToolbarContainer, MenuId.ChatInputSecondary, {
            telemetrySource: this.options.menus.telemetrySource,
            menuOptions: { shouldForwardArgs: true },
            hiddenItemStrategy: -1 /* HiddenItemStrategy.NoHide */,
            hoverDelegate,
            actionViewItemProvider: (action, options) => {
                if ((action.id === OpenSessionTargetPickerAction.ID || action.id === OpenDelegationPickerAction.ID) && action instanceof MenuItemAction) {
                    const getActiveSessionType = () => {
                        const sessionResource = this._widget?.viewModel?.sessionResource;
                        return sessionResource ? getAgentSessionProvider(sessionResource) : undefined;
                    };
                    const delegate = this.options.sessionTypePickerDelegate ?? {
                        getActiveSessionProvider: () => {
                            return getActiveSessionType();
                        },
                        getPendingDelegationTarget: () => {
                            return this._pendingDelegationTarget;
                        },
                        setPendingDelegationTarget: (provider) => {
                            const isActive = getActiveSessionType() === provider;
                            this._pendingDelegationTarget = isActive ? undefined : provider;
                            this.updateWidgetLockStateFromSessionType(provider);
                            this.updateAgentSessionTypeContextKey();
                            this.refreshChatSessionPickers();
                        },
                    };
                    const isWelcomeViewMode = !!this.options.sessionTypePickerDelegate?.setActiveSessionProvider;
                    const Picker = (action.id === OpenSessionTargetPickerAction.ID || isWelcomeViewMode) ? SessionTypePickerActionItem : DelegationSessionPickerActionItem;
                    return this.sessionTargetWidget = this.instantiationService.createInstance(Picker, action, location === "editor" /* ChatWidgetLocation.Editor */ ? 'editor' : 'sidebar', delegate, pickerOptions);
                }
                else if (action.id === OpenWorkspacePickerAction.ID && action instanceof MenuItemAction) {
                    if (this.workspaceContextService.getWorkbenchState() === 1 /* WorkbenchState.EMPTY */ && this.options.workspacePickerDelegate) {
                        return this.instantiationService.createInstance(WorkspacePickerActionItem, action, this.options.workspacePickerDelegate, pickerOptions);
                    }
                    else {
                        const empty = new BaseActionViewItem(undefined, action);
                        if (empty.element) {
                            empty.element.style.display = 'none';
                        }
                        return empty;
                    }
                }
                else if (action.id === OpenPermissionPickerAction.ID && action instanceof MenuItemAction) {
                    const delegate = {
                        currentPermissionLevel: this._currentPermissionLevel,
                        setPermissionLevel: (level) => {
                            this._currentPermissionLevel.set(level, undefined);
                            this.permissionLevelKey.set(level);
                        },
                    };
                    return this.permissionWidget = this.instantiationService.createInstance(PermissionPickerActionItem, action, delegate, pickerOptions);
                }
                return undefined;
            }
        }));
        this.secondaryToolbar.getElement().classList.add('chat-secondary-input-toolbar');
        this.secondaryToolbar.context = { widget };
        let inputModel = this.modelService.getModel(this.inputUri);
        if (!inputModel) {
            inputModel = this.modelService.createModel('', null, this.inputUri, true);
        }
        this.textModelResolverService.createModelReference(this.inputUri).then(ref => {
            // make sure to hold a reference so that the model doesn't get disposed by the text model service
            if (this._store.isDisposed) {
                ref.dispose();
                return;
            }
            this._register(ref);
        });
        this.inputModel = inputModel;
        this.inputModel.updateOptions({ bracketColorizationOptions: { enabled: false, independentColorPoolPerBracketType: false } });
        this._inputEditor.setModel(this.inputModel);
        if (initialValue) {
            this.inputModel.setValue(initialValue);
            const lineNumber = this.inputModel.getLineCount();
            this._inputEditor.setPosition({ lineNumber, column: this.inputModel.getLineMaxColumn(lineNumber) });
        }
        const onDidChangeCursorPosition = () => {
            const model = this._inputEditor.getModel();
            if (!model) {
                return;
            }
            const position = this._inputEditor.getPosition();
            if (!position) {
                return;
            }
            const atTop = position.lineNumber === 1 && position.column === 1;
            this.chatCursorAtTop.set(atTop);
            this.historyNavigationBackwardsEnablement.set(atTop);
            this.historyNavigationForewardsEnablement.set(position.equals(getLastPosition(model)));
            // Sync cursor and selection to model
            this._syncInputStateToModel();
        };
        this._register(this._inputEditor.onDidChangeCursorPosition(e => onDidChangeCursorPosition()));
        onDidChangeCursorPosition();
        this._register(this.themeService.onDidFileIconThemeChange(() => {
            this.renderAttachedContext();
        }));
        this.renderAttachedContext();
        const inputResizeObserver = this._register(new dom.DisposableResizeObserver(() => {
            const newHeight = this.container.offsetHeight;
            this.height.set(newHeight, undefined);
        }));
        this._register(inputResizeObserver.observe(this.container));
        if (this.options.renderStyle === 'compact') {
            const toolbarsResizeObserver = this._register(new dom.DisposableResizeObserver(() => {
                // Have to layout the editor when the toolbars change size, when they share width with the editor.
                // This handles ensuring we layout when quick chat is shown/hidden.
                // The toolbar may have changed since the last time it was visible.
                if (this.cachedWidth) {
                    this.layout(this.cachedWidth);
                }
            }));
            this._register(toolbarsResizeObserver.observe(toolbarsContainer));
        }
    }
    toggleChatInputOverlay(editing) {
        this.chatInputOverlay.classList.toggle('disabled', editing);
        if (editing) {
            this.overlayClickListener.value = dom.addStandardDisposableListener(this.chatInputOverlay, dom.EventType.CLICK, e => {
                e.preventDefault();
                e.stopPropagation();
                this._onDidClickOverlay.fire();
            });
        }
        else {
            this.overlayClickListener.clear();
        }
    }
    renderAttachedContext() {
        const container = this.attachedContextContainer;
        const store = new DisposableStore();
        this.attachedContextDisposables.value = store;
        dom.clearNode(container);
        store.add(dom.addStandardDisposableListener(this.attachmentsContainer, dom.EventType.KEY_DOWN, (e) => {
            this.handleAttachmentNavigation(e);
        }));
        const attachments = [...this.attachmentModel.attachments.entries()];
        const hasAttachments = Boolean(attachments.length);
        // Render implicit context (active editor in Ask mode, or selection)
        let hasImplicitContext = false;
        const isSuggestedEnabled = this.configurationService.getValue('chat.implicitContext.suggestedContext');
        const hasVisibleImplicitContext = isSuggestedEnabled
            ? this._implicitContext?.hasValue ?? false
            : this._implicitContext?.values.some(v => v.enabled || v.isSelection) ?? false;
        if (this._implicitContext && hasVisibleImplicitContext) {
            const isAttachmentAlreadyAttached = (targetUri, targetRange, targetHandle) => {
                return this._attachmentModel.attachments.some(a => {
                    const aUri = URI.isUri(a.value) ? a.value : isLocation(a.value) ? a.value.uri : undefined;
                    const aRange = isLocation(a.value) ? a.value.range : undefined;
                    if (targetHandle !== undefined && isStringVariableEntry(a) && a.handle === targetHandle) {
                        return true;
                    }
                    if (targetUri && aUri && isEqual(targetUri, aUri)) {
                        if (targetRange && aRange) {
                            return Range.equalsRange(targetRange, aRange);
                        }
                        return !targetRange && !aRange;
                    }
                    return false;
                });
            };
            const implicitContextWidget = this.instantiationService.createInstance(ImplicitContextAttachmentWidget, () => this._widget, isAttachmentAlreadyAttached, this._implicitContext, this._contextResourceLabels, this._attachmentModel, container);
            store.add(implicitContextWidget);
            hasImplicitContext = implicitContextWidget.hasRenderedContexts;
        }
        dom.setVisibility(Boolean(this.options.renderInputToolbarBelowInput || hasAttachments || hasImplicitContext), this.attachmentsContainer);
        dom.setVisibility(hasAttachments || hasImplicitContext, this.attachedContextContainer);
        if (!attachments.length) {
            this._indexOfLastAttachedContextDeletedWithKeyboard = -1;
            this._indexOfLastOpenedContext = -1;
        }
        for (const [index, attachment] of attachments) {
            const resource = URI.isUri(attachment.value) ? attachment.value : isLocation(attachment.value) ? attachment.value.uri : undefined;
            const range = isLocation(attachment.value) ? attachment.value.range : undefined;
            const shouldFocusClearButton = index === Math.min(this._indexOfLastAttachedContextDeletedWithKeyboard, this.attachmentModel.size - 1) && this._indexOfLastAttachedContextDeletedWithKeyboard > -1;
            let attachmentWidget;
            const options = { shouldFocusClearButton, supportsDeletion: true };
            const lm = this._currentLanguageModel.get();
            if (attachment.kind === 'tool' || attachment.kind === 'toolset') {
                attachmentWidget = this.instantiationService.createInstance(ToolSetOrToolItemAttachmentWidget, attachment, lm, options, container, this._contextResourceLabels);
            }
            else if (resource && isNotebookOutputVariableEntry(attachment)) {
                attachmentWidget = this.instantiationService.createInstance(NotebookCellOutputChatAttachmentWidget, resource, attachment, lm, options, container, this._contextResourceLabels);
            }
            else if (isPromptFileVariableEntry(attachment)) {
                attachmentWidget = this.instantiationService.createInstance(PromptFileAttachmentWidget, attachment, lm, options, container, this._contextResourceLabels);
            }
            else if (isPromptTextVariableEntry(attachment)) {
                attachmentWidget = this.instantiationService.createInstance(PromptTextAttachmentWidget, attachment, undefined, options, container, this._contextResourceLabels);
            }
            else if (resource && (attachment.kind === 'file' || attachment.kind === 'directory')) {
                attachmentWidget = this.instantiationService.createInstance(FileAttachmentWidget, resource, range, attachment, undefined, lm, options, container, this._contextResourceLabels);
            }
            else if (attachment.kind === 'terminalCommand') {
                attachmentWidget = this.instantiationService.createInstance(TerminalCommandAttachmentWidget, attachment, lm, options, container, this._contextResourceLabels);
            }
            else if (isImageVariableEntry(attachment)) {
                attachmentWidget = this.instantiationService.createInstance(ImageAttachmentWidget, resource, attachment, lm, options, container, this._contextResourceLabels);
            }
            else if (isElementVariableEntry(attachment)) {
                attachmentWidget = this.instantiationService.createInstance(ElementChatAttachmentWidget, attachment, lm, options, container, this._contextResourceLabels);
            }
            else if (isPasteVariableEntry(attachment)) {
                attachmentWidget = this.instantiationService.createInstance(PasteAttachmentWidget, attachment, lm, options, container, this._contextResourceLabels);
            }
            else if (isSCMHistoryItemVariableEntry(attachment)) {
                attachmentWidget = this.instantiationService.createInstance(SCMHistoryItemAttachmentWidget, attachment, lm, options, container, this._contextResourceLabels);
            }
            else if (isSCMHistoryItemChangeVariableEntry(attachment)) {
                attachmentWidget = this.instantiationService.createInstance(SCMHistoryItemChangeAttachmentWidget, attachment, lm, options, container, this._contextResourceLabels);
            }
            else if (isSCMHistoryItemChangeRangeVariableEntry(attachment)) {
                attachmentWidget = this.instantiationService.createInstance(SCMHistoryItemChangeRangeAttachmentWidget, attachment, lm, options, container, this._contextResourceLabels);
            }
            else {
                attachmentWidget = this._chatAttachmentWidgetRegistry.createWidget(attachment, options, container)
                    ?? this.instantiationService.createInstance(DefaultChatAttachmentWidget, resource, range, attachment, undefined, lm, options, container, this._contextResourceLabels);
            }
            if (shouldFocusClearButton) {
                attachmentWidget.element.focus();
            }
            if (index === Math.min(this._indexOfLastOpenedContext, this.attachmentModel.size - 1)) {
                attachmentWidget.element.focus();
            }
            store.add(attachmentWidget);
            store.add(attachmentWidget.onDidDelete(e => {
                this.handleAttachmentDeletion(e, index, attachment);
            }));
            store.add(attachmentWidget.onDidOpen(e => {
                this.handleAttachmentOpen(index, attachment);
            }));
        }
        this._indexOfLastOpenedContext = -1;
    }
    handleAttachmentDeletion(e, index, attachment) {
        // Set focus to the next attached context item if deletion was triggered by a keystroke (vs a mouse click)
        if (dom.isKeyboardEvent(e)) {
            this._indexOfLastAttachedContextDeletedWithKeyboard = index;
        }
        this._attachmentModel.delete(attachment.id);
        if (this.configurationService.getValue('chat.implicitContext.enableImplicitContext')) {
            // if currently opened file is deleted, do not show implicit context
            for (const implicitContext of (this._implicitContext?.values || [])) {
                const implicitValue = URI.isUri(implicitContext?.value) && URI.isUri(attachment.value) && isEqual(implicitContext.value, attachment.value);
                if (implicitContext?.isFile && implicitValue) {
                    implicitContext.enabled = false;
                }
            }
        }
        if (this._attachmentModel.size === 0) {
            this.focus();
        }
        this._onDidChangeContext.fire({ removed: [attachment] });
        this.renderAttachedContext();
    }
    handleAttachmentOpen(index, attachment) {
        this._indexOfLastOpenedContext = index;
        this._indexOfLastAttachedContextDeletedWithKeyboard = -1;
        if (this._attachmentModel.size === 0) {
            this.focus();
        }
    }
    handleAttachmentNavigation(e) {
        if (!e.equals(15 /* KeyCode.LeftArrow */) && !e.equals(17 /* KeyCode.RightArrow */)) {
            return;
        }
        // eslint-disable-next-line no-restricted-syntax
        const attachments = Array.from(this.attachedContextContainer.querySelectorAll('.chat-attached-context-attachment'));
        if (!attachments.length) {
            return;
        }
        const activeElement = dom.getWindow(this.attachmentsContainer).document.activeElement;
        const currentIndex = attachments.findIndex(attachment => attachment === activeElement);
        let newIndex = currentIndex;
        if (e.equals(15 /* KeyCode.LeftArrow */)) {
            newIndex = currentIndex > 0 ? currentIndex - 1 : attachments.length - 1;
        }
        else if (e.equals(17 /* KeyCode.RightArrow */)) {
            newIndex = currentIndex < attachments.length - 1 ? currentIndex + 1 : 0;
        }
        if (newIndex !== -1) {
            const nextElement = attachments[newIndex];
            nextElement.focus();
            e.preventDefault();
            e.stopPropagation();
        }
    }
    async renderChatTodoListWidget(chatSessionResource) {
        const isTodoWidgetEnabled = this.configurationService.getValue(ChatConfiguration.TodosShowWidget) !== false;
        if (!isTodoWidgetEnabled) {
            return;
        }
        if (!this._chatInputTodoListWidget.value) {
            const widget = this._chatEditingTodosDisposables.add(this.instantiationService.createInstance(ChatTodoListWidget));
            this._chatInputTodoListWidget.value = widget;
            // Add the widget's DOM node to the dedicated todo list container
            dom.clearNode(this.chatInputTodoListWidgetContainer);
            dom.append(this.chatInputTodoListWidgetContainer, widget.domNode);
        }
        this._chatInputTodoListWidget.value.render(chatSessionResource);
    }
    clearTodoListWidget(sessionResource, force) {
        this._chatInputTodoListWidget.value?.clear(sessionResource, force);
    }
    renderArtifactsWidget(chatSessionResource) {
        if (!this.configurationService.getValue(ChatConfiguration.ArtifactsEnabled)) {
            return;
        }
        if (!this._chatArtifactsWidget.value) {
            const widget = this._register(this.instantiationService.createInstance(ChatArtifactsWidget));
            this._chatArtifactsWidget.value = widget;
            dom.clearNode(this.chatArtifactsWidgetContainer);
            dom.append(this.chatArtifactsWidgetContainer, widget.domNode);
        }
        this._chatArtifactsWidget.value.render(chatSessionResource);
    }
    clearArtifactsWidget() {
        this._chatArtifactsWidget.value?.hide();
    }
    renderQuestionCarousel(carousel, context, options) {
        const carouselKey = carousel.resolveId ?? `${isResponseVM(context.element) ? context.element.requestId : ''}_${context.contentIndex}`;
        // If a carousel with the same key already exists, return it
        const existing = this._chatQuestionCarouselWidgets.get(carouselKey);
        if (existing) {
            return existing;
        }
        // Track the response id and session for this carousel
        if (isResponseVM(context.element)) {
            this._questionCarouselResponseIds.set(carouselKey, context.element.requestId);
            this._questionCarouselSessionResources.set(carouselKey, context.element.sessionResource);
        }
        const part = this.instantiationService.createInstance(ChatQuestionCarouselPart, carousel, context, options);
        this._chatQuestionCarouselWidgets.set(carouselKey, part);
        this._hasQuestionCarouselContextKey?.set(true);
        dom.append(this.chatQuestionCarouselContainer, part.domNode);
        return part;
    }
    clearQuestionCarousel(responseId, resolveId) {
        if (resolveId !== undefined) {
            // Remove a specific carousel by resolveId
            const part = this._chatQuestionCarouselWidgets.get(resolveId);
            if (part) {
                part.domNode.remove();
                this._chatQuestionCarouselWidgets.deleteAndDispose(resolveId);
            }
            this._questionCarouselResponseIds.delete(resolveId);
            this._questionCarouselSessionResources.delete(resolveId);
        }
        else if (responseId !== undefined) {
            // Remove all carousels associated with a given responseId
            for (const [key, rid] of this._questionCarouselResponseIds) {
                if (rid === responseId) {
                    const part = this._chatQuestionCarouselWidgets.get(key);
                    if (part) {
                        part.domNode.remove();
                        this._chatQuestionCarouselWidgets.deleteAndDispose(key);
                    }
                    this._questionCarouselResponseIds.delete(key);
                    this._questionCarouselSessionResources.delete(key);
                }
            }
        }
        else {
            // Clear all carousels
            this._chatQuestionCarouselWidgets.clearAndDisposeAll();
            this._questionCarouselResponseIds.clear();
            this._questionCarouselSessionResources.clear();
            dom.clearNode(this.chatQuestionCarouselContainer);
        }
        this._hasQuestionCarouselContextKey?.set(this._chatQuestionCarouselWidgets.size > 0);
    }
    get questionCarousel() {
        // Return the focused carousel, or the first one
        for (const part of this._chatQuestionCarouselWidgets.values()) {
            if (part.hasFocus()) {
                return part;
            }
        }
        return this._chatQuestionCarouselWidgets.size > 0 ? this._chatQuestionCarouselWidgets.values().next().value : undefined;
    }
    focusQuestionCarousel() {
        const carousel = this.questionCarousel;
        if (carousel) {
            carousel.focus();
            return true;
        }
        return false;
    }
    isQuestionCarouselFocused() {
        for (const part of this._chatQuestionCarouselWidgets.values()) {
            if (part.hasFocus()) {
                return true;
            }
        }
        return false;
    }
    navigateToPreviousQuestion() {
        const carousel = this.questionCarousel;
        return carousel?.navigateToPreviousQuestion() ?? false;
    }
    navigateToNextQuestion() {
        const carousel = this.questionCarousel;
        return carousel?.navigateToNextQuestion() ?? false;
    }
    setWorkingSetCollapsed(collapsed) {
        this._workingSetCollapsed.set(collapsed, undefined);
    }
    renderChatEditingSessionState(chatEditingSession) {
        dom.setVisibility(Boolean(chatEditingSession), this.chatEditingSessionWidgetContainer);
        if (chatEditingSession) {
            if (!isEqual(chatEditingSession.chatSessionResource, this._lastEditingSessionResource)) {
                this._workingSetCollapsed.set(true, undefined);
            }
            this._lastEditingSessionResource = chatEditingSession.chatSessionResource;
        }
        const modifiedEntries = derivedOpts({ equalsFn: arraysEqual }, r => {
            // Background chat sessions render the working set based on the session files, and not the editing session
            const sessionResource = chatEditingSession?.chatSessionResource ?? this._widget?.viewModel?.model.sessionResource;
            if (sessionResource && getChatSessionType(sessionResource) === AgentSessionProviders.Background) {
                return [];
            }
            return chatEditingSession?.entries.read(r).filter(entry => entry.state.read(r) === 0 /* ModifiedFileEntryState.Modified */) || [];
        });
        const editSessionEntries = derived((reader) => {
            const seenEntries = new ResourceSet();
            const entries = [];
            for (const entry of modifiedEntries.read(reader)) {
                if (entry.state.read(reader) !== 0 /* ModifiedFileEntryState.Modified */) {
                    continue;
                }
                if (!seenEntries.has(entry.modifiedURI)) {
                    seenEntries.add(entry.modifiedURI);
                    const linesAdded = entry.linesAdded?.read(reader);
                    const linesRemoved = entry.linesRemoved?.read(reader);
                    entries.push({
                        reference: entry.modifiedURI,
                        state: 0 /* ModifiedFileEntryState.Modified */,
                        kind: 'reference',
                        options: {
                            status: undefined,
                            diffMeta: { added: linesAdded ?? 0, removed: linesRemoved ?? 0 },
                            isDeletion: !!entry.isDeletion,
                            originalUri: entry.isDeletion ? entry.originalURI : undefined,
                        }
                    });
                }
            }
            entries.sort((a, b) => {
                if (a.kind === 'reference' && b.kind === 'reference') {
                    if (a.state === b.state || a.state === undefined || b.state === undefined) {
                        return a.reference.toString().localeCompare(b.reference.toString());
                    }
                    return a.state - b.state;
                }
                return 0;
            });
            return entries;
        });
        const sessionFileChanges = observableFromEvent(this, this.agentSessionsService.model.onDidChangeSessions, () => {
            const sessionResource = this._widget?.viewModel?.model?.sessionResource;
            if (!sessionResource) {
                return Iterable.empty();
            }
            const model = this.agentSessionsService.getSession(sessionResource);
            return model?.changes instanceof Array ? model.changes : Iterable.empty();
        });
        const sessionFiles = derived(reader => sessionFileChanges.read(reader).map((entry) => ({
            reference: isIChatSessionFileChange2(entry)
                ? entry.modifiedUri ?? entry.uri
                : entry.modifiedUri,
            state: 1 /* ModifiedFileEntryState.Accepted */,
            kind: 'reference',
            options: {
                diffMeta: { added: entry.insertions, removed: entry.deletions },
                isDeletion: entry.modifiedUri === undefined,
                originalUri: entry.originalUri,
                status: undefined
            }
        })));
        const shouldRender = derived(reader => editSessionEntries.read(reader).length > 0 || sessionFiles.read(reader).length > 0);
        this._renderingChatEdits.value = autorun(reader => {
            if (this.options.renderWorkingSet && shouldRender.read(reader)) {
                this.renderChatEditingSessionWithEntries(reader.store, chatEditingSession, editSessionEntries, sessionFiles);
            }
            else {
                dom.clearNode(this.chatEditingSessionWidgetContainer);
                this._chatEditsDisposables.clear();
                this._chatEditList = undefined;
            }
        });
    }
    renderChatEditingSessionWithEntries(store, chatEditingSession, editSessionEntriesObs, sessionEntriesObs) {
        // Summary of number of files changed
        // eslint-disable-next-line no-restricted-syntax
        const innerContainer = this.chatEditingSessionWidgetContainer.querySelector('.chat-editing-session-container.show-file-icons') ?? dom.append(this.chatEditingSessionWidgetContainer, $('.chat-editing-session-container.show-file-icons'));
        // eslint-disable-next-line no-restricted-syntax
        const overviewRegion = innerContainer.querySelector('.chat-editing-session-overview') ?? dom.append(innerContainer, $('.chat-editing-session-overview'));
        // eslint-disable-next-line no-restricted-syntax
        const overviewTitle = overviewRegion.querySelector('.working-set-title') ?? dom.append(overviewRegion, $('.working-set-title'));
        // Clear out the previous actions (if any)
        this._chatEditsActionsDisposables.clear();
        // Chat editing session actions
        // eslint-disable-next-line no-restricted-syntax
        const actionsContainer = overviewRegion.querySelector('.chat-editing-session-actions') ?? dom.append(overviewRegion, $('.chat-editing-session-actions'));
        const sessionResource = chatEditingSession?.chatSessionResource || this._widget?.viewModel?.model.sessionResource;
        const scopedContextKeyService = this._chatEditsActionsDisposables.add(this.contextKeyService.createScoped(actionsContainer));
        if (sessionResource) {
            scopedContextKeyService.createKey(ChatContextKeys.agentSessionType.key, getChatSessionType(sessionResource));
        }
        this._chatEditsActionsDisposables.add(bindContextKey(ChatContextKeys.hasAgentSessionChanges, scopedContextKeyService, r => !!sessionEntriesObs.read(r)?.length));
        const scopedInstantiationService = this._chatEditsActionsDisposables.add(this.instantiationService.createChild(new ServiceCollection([IContextKeyService, scopedContextKeyService])));
        // Working set
        // eslint-disable-next-line no-restricted-syntax
        const workingSetContainer = innerContainer.querySelector('.chat-editing-session-list') ?? dom.append(innerContainer, $('.chat-editing-session-list'));
        const button = this._chatEditsActionsDisposables.add(new ButtonWithIcon(overviewTitle, {
            supportIcons: true,
            secondary: true,
            ariaLabel: localize(8200, null),
        }));
        const topLevelStats = derived(reader => {
            const entries = editSessionEntriesObs.read(reader);
            const sessionEntries = sessionEntriesObs.read(reader);
            let added = 0, removed = 0;
            if (entries.length > 0) {
                for (const entry of entries) {
                    if (entry.kind === 'reference' && entry.options?.diffMeta) {
                        added += entry.options.diffMeta.added;
                        removed += entry.options.diffMeta.removed;
                    }
                }
            }
            else {
                for (const entry of sessionEntries) {
                    if (entry.kind === 'reference' && entry.options?.diffMeta) {
                        added += entry.options.diffMeta.added;
                        removed += entry.options.diffMeta.removed;
                    }
                }
            }
            const files = entries.length > 0 ? entries.length : sessionEntries.length;
            const topLevelIsSessionMenu = entries.length === 0 && sessionEntries.length > 0;
            const shouldShowEditingSession = entries.length > 0 || sessionEntries.length > 0;
            return { files, added, removed, shouldShowEditingSession, topLevelIsSessionMenu };
        });
        const topLevelIsSessionMenu = topLevelStats.map(t => t.topLevelIsSessionMenu);
        store.add(autorun(reader => {
            const isSessionMenu = topLevelIsSessionMenu.read(reader);
            reader.store.add(scopedInstantiationService.createInstance(MenuWorkbenchButtonBar, actionsContainer, isSessionMenu ? MenuId.ChatEditingSessionChangesToolbar : MenuId.ChatEditingWidgetToolbar, {
                telemetrySource: this.options.menus.telemetrySource,
                small: true,
                menuOptions: sessionResource ? (isSessionMenu ? {
                    args: [sessionResource, this.agentSessionsService.getSession(sessionResource)?.metadata],
                } : {
                    arg: {
                        $mid: 19 /* MarshalledId.ChatViewContext */,
                        sessionResource,
                    },
                }) : undefined,
                disableWhileRunning: isSessionMenu,
                buttonConfigProvider: (action) => {
                    if (action.id === ChatEditingShowChangesAction.ID || action.id === ViewPreviousEditsAction.Id || action.id === ViewAllSessionChangesAction.ID) {
                        return { showIcon: true, showLabel: false, isSecondary: true };
                    }
                    return undefined;
                }
            }));
        }));
        store.add(autorun(reader => {
            const { files, added, removed, shouldShowEditingSession } = topLevelStats.read(reader);
            const buttonLabel = files === 1
                ? localize(8201, null)
                : localize(8202, null, files);
            button.label = buttonLabel;
            button.element.setAttribute('aria-label', localize(8203, null, buttonLabel, added, removed));
            this._workingSetLinesAddedSpan.value.textContent = `+${added}`;
            this._workingSetLinesRemovedSpan.value.textContent = `-${removed}`;
            dom.setVisibility(shouldShowEditingSession, this.chatEditingSessionWidgetContainer);
        }));
        const countsContainer = dom.$('.working-set-line-counts');
        button.element.appendChild(countsContainer);
        countsContainer.appendChild(this._workingSetLinesAddedSpan.value);
        countsContainer.appendChild(this._workingSetLinesRemovedSpan.value);
        const toggleWorkingSet = () => {
            this._workingSetCollapsed.set(!this._workingSetCollapsed.get(), undefined);
        };
        this._chatEditsActionsDisposables.add(button.onDidClick(toggleWorkingSet));
        this._chatEditsActionsDisposables.add(addDisposableListener(overviewRegion, 'click', e => {
            if (e.defaultPrevented) {
                return;
            }
            const target = e.target;
            if (target.closest('.monaco-button')) {
                return;
            }
            toggleWorkingSet();
        }));
        this._chatEditsActionsDisposables.add(autorun(reader => {
            const collapsed = this._workingSetCollapsed.read(reader);
            button.icon = collapsed ? Codicon.chevronRight : Codicon.chevronDown;
            workingSetContainer.classList.toggle('collapsed', collapsed);
        }));
        if (!this._chatEditList) {
            this._chatEditList = this._chatEditsListPool.get();
            const list = this._chatEditList.object;
            this._chatEditsDisposables.add(this._chatEditList);
            this._chatEditsDisposables.add(list.onDidFocus(() => {
                this._onDidFocus.fire();
            }));
            this._chatEditsDisposables.add(list.onDidOpen(async (e) => {
                if (e.element?.kind === 'reference' && URI.isUri(e.element.reference)) {
                    const modifiedFileUri = e.element.reference;
                    const originalUri = e.element.options?.originalUri;
                    if (e.element.options?.isDeletion && originalUri) {
                        await this.editorService.openEditor({
                            resource: originalUri, // instead of modified, because modified will not exist
                            options: e.editorOptions
                        }, e.sideBySide ? SIDE_GROUP : ACTIVE_GROUP);
                        return;
                    }
                    // If there's a originalUri, open as diff editor
                    if (originalUri) {
                        await this.editorService.openEditor({
                            original: { resource: originalUri },
                            modified: { resource: modifiedFileUri },
                            options: e.editorOptions
                        }, e.sideBySide ? SIDE_GROUP : ACTIVE_GROUP);
                        return;
                    }
                    const entry = chatEditingSession?.getEntry(modifiedFileUri);
                    const pane = await this.editorService.openEditor({
                        resource: modifiedFileUri,
                        options: e.editorOptions
                    }, e.sideBySide ? SIDE_GROUP : ACTIVE_GROUP);
                    if (pane) {
                        entry?.getEditorIntegration(pane).reveal(true, e.editorOptions.preserveFocus);
                    }
                }
            }));
            this._chatEditsDisposables.add(addDisposableListener(list.getHTMLElement(), 'click', e => {
                if (!this.hasFocus()) {
                    this._onDidFocus.fire();
                }
            }, true));
            dom.append(workingSetContainer, list.getHTMLElement());
            dom.append(innerContainer, workingSetContainer);
        }
        store.add(autorun(reader => {
            const editEntries = editSessionEntriesObs.read(reader);
            const sessionFileEntries = sessionEntriesObs.read(reader);
            // Combine edit session entries with session file changes. At the moment, we
            // we can combine these two arrays since local chat sessions use edit session
            // entries, while background chat sessions use session file changes.
            const allEntries = editEntries.concat(sessionFileEntries);
            const maxItemsShown = 6;
            const itemsShown = Math.min(allEntries.length, maxItemsShown);
            const height = itemsShown * 22;
            const list = this._chatEditList.object;
            list.layout(height);
            list.getHTMLElement().style.height = `${height}px`;
            list.splice(0, list.length, allEntries);
        }));
    }
    async renderFollowups(items, response) {
        if (!this.options.renderFollowups) {
            return;
        }
        this.followupsDisposables.clear();
        dom.clearNode(this.followupsContainer);
        if (items && items.length > 0) {
            this.followupsDisposables.add(this.instantiationService.createInstance(ChatFollowups, this.followupsContainer, items, this.location, undefined, followup => this._onDidAcceptFollowup.fire({ followup, response })));
        }
    }
    /**
     * Layout the input part with the given width. Height is intrinsic - determined by content
     * and detected via ResizeObserver, which updates `inputPartHeight` for the parent to observe.
     */
    layout(width) {
        this.cachedWidth = width;
        this._stableInputPartWidth.set(width, undefined);
        return this._layout(width);
    }
    _layout(width, allowRecurse = true) {
        const data = this.getLayoutData();
        const followupsWidth = width - data.inputPartHorizontalPadding;
        this.followupsContainer.style.width = `${followupsWidth}px`;
        const initialEditorScrollWidth = this._inputEditor.getScrollWidth();
        const newEditorWidth = width - data.inputPartHorizontalPadding - data.editorBorder - data.inputPartHorizontalPaddingInside - data.toolbarsWidth - data.sideToolbarWidth;
        const inputEditorHeight = this.inputEditorMinHeight ? Math.max(this.inputEditorMinHeight, Math.min(this._inputEditor.getContentHeight(), this.inputEditorMaxHeight)) : Math.min(this._inputEditor.getContentHeight(), this.inputEditorMaxHeight);
        const newDimension = { width: newEditorWidth, height: inputEditorHeight };
        if (!this.previousInputEditorDimension || (this.previousInputEditorDimension.width !== newDimension.width || this.previousInputEditorDimension.height !== newDimension.height)) {
            // This layout call has side-effects that are hard to understand. eg if we are calling this inside a onDidChangeContent handler, this can trigger the next onDidChangeContent handler
            // to be invoked, and we have a lot of these on this editor. Only doing a layout this when the editor size has actually changed makes it much easier to follow.
            this._inputEditor.layout(newDimension);
            this.previousInputEditorDimension = newDimension;
        }
        if (allowRecurse && initialEditorScrollWidth < 10) {
            // This is probably the initial layout. Now that the editor is layed out with its correct width, it should report the correct contentHeight
            return this._layout(width, false);
        }
    }
    getLayoutData() {
        // ###########################################################################
        // #                                                                         #
        // #    CHANGING THIS METHOD HAS RENDERING IMPLICATIONS FOR THE CHAT VIEW    #
        // #    IF YOU MAKE CHANGES HERE, PLEASE TEST THE CHAT VIEW THOROUGHLY:      #
        // #    - produce various chat responses                                     #
        // #    - click the response to get a focus outline                          #
        // #    - ensure the outline is not cut off at the bottom                    #
        // #                                                                         #
        // ###########################################################################
        const inputSideToolbarWidth = this.inputSideToolbarContainer ? dom.getTotalWidth(this.inputSideToolbarContainer) : 0;
        const getToolbarsWidthCompact = () => {
            const toolbarItemGap = 4;
            const executeToolbarWidth = this.cachedExecuteToolbarWidth = this.executeToolbar.getItemsWidth();
            const inputToolbarWidth = this.cachedInputToolbarWidth = this.inputActionsToolbar.getItemsWidth();
            const executeToolbarPadding = (this.executeToolbar.getItemsLength() - 1) * toolbarItemGap;
            const inputToolbarPadding = this.inputActionsToolbar.getItemsLength() ? (this.inputActionsToolbar.getItemsLength() - 1) * toolbarItemGap : 0;
            const contextUsageWidth = dom.getTotalWidth(this.contextUsageWidgetContainer);
            const inputToolbarsPadding = 12; // pdading between input toolbar/execute toolbar/contextUsage.
            return executeToolbarWidth + executeToolbarPadding + contextUsageWidth + (this.options.renderInputToolbarBelowInput ? 0 : inputToolbarWidth + inputToolbarPadding + inputToolbarsPadding);
        };
        return {
            editorBorder: 2,
            inputPartHorizontalPadding: this.options.renderStyle === 'compact' ? 16 : 24,
            inputPartHorizontalPaddingInside: this.options.renderStyle === 'compact' ? 12 : 10,
            toolbarsWidth: this.options.renderStyle === 'compact' ? getToolbarsWidthCompact() : 0,
            sideToolbarWidth: inputSideToolbarWidth > 0 ? inputSideToolbarWidth + 4 /*gap*/ : 0,
        };
    }
    /**
     * Gets the location of the chat widget and whether that location is maximized.
     */
    getWidgetLocationInfo(widget) {
        // Editor context (quick chat, inline chat, etc.)
        if (isIChatResourceViewContext(widget.viewContext)) {
            return { location: "editor" /* ChatWidgetLocation.Editor */, isMaximized: false };
        }
        // View context - determine actual location from view descriptor service
        if (isIChatViewViewContext(widget.viewContext)) {
            const viewLocation = this.viewDescriptorService.getViewLocationById(widget.viewContext.viewId);
            const sideBarPosition = this.layoutService.getSideBarPosition();
            switch (viewLocation) {
                case 1 /* ViewContainerLocation.Panel */:
                    return {
                        location: "panel" /* ChatWidgetLocation.Panel */,
                        isMaximized: this.layoutService.isPanelMaximized(),
                    };
                case 2 /* ViewContainerLocation.AuxiliaryBar */:
                    // AuxiliaryBar is on the opposite side of the primary sidebar
                    return {
                        location: sideBarPosition === 0 /* Position.LEFT */ ? "sidebarRight" /* ChatWidgetLocation.SidebarRight */ : "sidebarLeft" /* ChatWidgetLocation.SidebarLeft */,
                        isMaximized: this.layoutService.isAuxiliaryBarMaximized(),
                    };
                case 0 /* ViewContainerLocation.Sidebar */:
                default:
                    // Primary sidebar follows its configured position
                    // Note: Primary sidebar cannot be maximized, so always false
                    return {
                        location: sideBarPosition === 0 /* Position.LEFT */ ? "sidebarLeft" /* ChatWidgetLocation.SidebarLeft */ : "sidebarRight" /* ChatWidgetLocation.SidebarRight */,
                        isMaximized: false,
                    };
            }
        }
        // Fallback for unknown contexts
        return { location: "editor" /* ChatWidgetLocation.Editor */, isMaximized: false };
    }
    getDefaultScrollbarOptions() {
        const scrollbar = this._inputEditor.getRawOptions().scrollbar ?? {};
        return this.options.renderStyle === 'compact'
            ? { ...scrollbar, vertical: 'hidden' }
            : { ...scrollbar, vertical: 'auto', verticalScrollbarSize: 7 };
    }
    getVisibleScrollbarOptions() {
        const scrollbar = this._inputEditor.getRawOptions().scrollbar ?? {};
        return this.options.renderStyle === 'compact'
            ? { ...scrollbar, vertical: 'hidden' }
            : { ...scrollbar, vertical: 'visible', verticalScrollbarSize: 7 };
    }
    updateInputEditorScrollbarOptions() {
        this._inputEditor.updateOptions({
            scrollbar: this._forceVisibleScrollbarUntilAccept
                ? this.getVisibleScrollbarOptions()
                : this.getDefaultScrollbarOptions()
        });
    }
    showScrollbarUntilAccept() {
        this._forceVisibleScrollbarUntilAccept = true;
        this.updateInputEditorScrollbarOptions();
    }
    resetScrollbarVisibilityAfterAccept() {
        if (!this._forceVisibleScrollbarUntilAccept) {
            return;
        }
        this._forceVisibleScrollbarUntilAccept = false;
        this.updateInputEditorScrollbarOptions();
    }
};
ChatInputPart = ChatInputPart_1 = __decorate([
    __param(4, IModelService),
    __param(5, IInstantiationService),
    __param(6, IContextKeyService),
    __param(7, IConfigurationService),
    __param(8, IKeybindingService),
    __param(9, IAccessibilityService),
    __param(10, ILanguageModelsService),
    __param(11, ILogService),
    __param(12, IFileService),
    __param(13, IEditorService),
    __param(14, IThemeService),
    __param(15, ITextModelService),
    __param(16, IStorageService),
    __param(17, IChatAgentService),
    __param(18, ISharedWebContentExtractorService),
    __param(19, IWorkbenchAssignmentService),
    __param(20, IChatEntitlementService),
    __param(21, IChatModeService),
    __param(22, ILanguageModelToolsService),
    __param(23, IChatService),
    __param(24, IChatSessionsService),
    __param(25, IChatContextService),
    __param(26, IAgentSessionsService),
    __param(27, IWorkspaceContextService),
    __param(28, IWorkbenchLayoutService),
    __param(29, IViewDescriptorService),
    __param(30, IChatAttachmentWidgetRegistry)
], ChatInputPart);
export { ChatInputPart };
function getLastPosition(model) {
    return { lineNumber: model.getLineCount(), column: model.getLineLength(model.getLineCount()) + 1 };
}
const chatInputEditorContainerSelector = '.interactive-input-editor';
setupSimpleEditorSelectionStyling(chatInputEditorContainerSelector);
class ChatSessionPickersContainerActionItem extends ActionViewItem {
    constructor(action, widgets, options) {
        super(null, action, options ?? {});
        this.widgets = widgets;
    }
    render(container) {
        container.classList.add('chat-sessionPicker-container');
        for (const widget of this.widgets) {
            const itemContainer = dom.$('.action-item.chat-sessionPicker-item');
            widget.render(itemContainer);
            container.appendChild(itemContainer);
        }
    }
    dispose() {
        for (const widget of this.widgets) {
            widget.dispose();
        }
        super.dispose();
    }
}
class HiddenActionViewItem extends BaseActionViewItem {
    constructor(action) {
        super(undefined, action);
    }
    render(container) {
        super.render(container);
        container.style.display = 'none';
    }
}
//# sourceMappingURL=chatInputPart.js.map