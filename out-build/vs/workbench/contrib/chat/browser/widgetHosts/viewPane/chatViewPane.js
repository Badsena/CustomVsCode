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
var ChatViewPane_1;
import './media/chatViewPane.css';
import { $, addDisposableListener, append, EventHelper, EventType, getWindow, setVisibility } from '../../../../../../base/browser/dom.js';
import { StandardMouseEvent } from '../../../../../../base/browser/mouseEvent.js';
import { Button } from '../../../../../../base/browser/ui/button/button.js';
import { Sash } from '../../../../../../base/browser/ui/sash/sash.js';
import { CancellationToken } from '../../../../../../base/common/cancellation.js';
import { Event } from '../../../../../../base/common/event.js';
import { MutableDisposable, toDisposable, DisposableStore } from '../../../../../../base/common/lifecycle.js';
import { autorun } from '../../../../../../base/common/observable.js';
import { localize } from '../../../../../../nls.js';
import { MenuWorkbenchToolBar } from '../../../../../../platform/actions/browser/toolbar.js';
import { MenuId } from '../../../../../../platform/actions/common/actions.js';
import { ICommandService } from '../../../../../../platform/commands/common/commands.js';
import { IConfigurationService } from '../../../../../../platform/configuration/common/configuration.js';
import { IContextKeyService } from '../../../../../../platform/contextkey/common/contextkey.js';
import { IContextMenuService } from '../../../../../../platform/contextview/browser/contextView.js';
import { IHoverService } from '../../../../../../platform/hover/browser/hover.js';
import { IInstantiationService } from '../../../../../../platform/instantiation/common/instantiation.js';
import { ServiceCollection } from '../../../../../../platform/instantiation/common/serviceCollection.js';
import { IKeybindingService } from '../../../../../../platform/keybinding/common/keybinding.js';
import { ILogService } from '../../../../../../platform/log/common/log.js';
import { INotificationService } from '../../../../../../platform/notification/common/notification.js';
import { IOpenerService } from '../../../../../../platform/opener/common/opener.js';
import { IStorageService } from '../../../../../../platform/storage/common/storage.js';
import { ITelemetryService } from '../../../../../../platform/telemetry/common/telemetry.js';
import { defaultButtonStyles } from '../../../../../../platform/theme/browser/defaultStyles.js';
import { editorBackground } from '../../../../../../platform/theme/common/colorRegistry.js';
import { ChatViewTitleControl } from './chatViewTitleControl.js';
import { IThemeService } from '../../../../../../platform/theme/common/themeService.js';
import { ViewPane } from '../../../../../browser/parts/views/viewPane.js';
import { Memento } from '../../../../../common/memento.js';
import { SIDE_BAR_FOREGROUND } from '../../../../../common/theme.js';
import { IViewDescriptorService } from '../../../../../common/views.js';
import { ILifecycleService } from '../../../../../services/lifecycle/common/lifecycle.js';
import { IChatAgentService } from '../../../common/participants/chatAgents.js';
import { ChatContextKeys } from '../../../common/actions/chatContextKeys.js';
import { CHAT_PROVIDER_ID } from '../../../common/participants/chatParticipantContribTypes.js';
import { IChatService } from '../../../common/chatService/chatService.js';
import { IChatSessionsService, localChatSessionType } from '../../../common/chatSessionsService.js';
import { LocalChatSessionUri, getChatSessionType } from '../../../common/model/chatUri.js';
import { ChatAgentLocation, ChatConfiguration, ChatModeKind } from '../../../common/constants.js';
import { AgentSessionsControl } from '../../agentSessions/agentSessionsControl.js';
import { ACTION_ID_NEW_CHAT } from '../../actions/chatActions.js';
import { ChatWidget } from '../../widget/chatWidget.js';
import { ChatViewWelcomeController } from '../../viewsWelcome/chatViewWelcomeController.js';
import { IWorkbenchLayoutService } from '../../../../../services/layout/browser/layoutService.js';
import { AgentSessionsViewerOrientation, AgentSessionsViewerPosition } from '../../agentSessions/agentSessions.js';
import { IProgressService } from '../../../../../../platform/progress/common/progress.js';
import { ChatViewId } from '../../chat.js';
import { IActivityService, ProgressBadge } from '../../../../../services/activity/common/activity.js';
import { disposableTimeout } from '../../../../../../base/common/async.js';
import { AgentSessionsFilter, AgentSessionsGrouping } from '../../agentSessions/agentSessionsFilter.js';
import { IAgentSessionsService } from '../../agentSessions/agentSessionsService.js';
import { IChatEntitlementService } from '../../../../../services/chat/common/chatEntitlementService.js';
import { toErrorMessage } from '../../../../../../base/common/errorMessage.js';
import { IWorkbenchEnvironmentService } from '../../../../../services/environment/common/environmentService.js';
import { IHostService } from '../../../../../services/host/browser/host.js';
let ChatViewPane = class ChatViewPane extends ViewPane {
    static { ChatViewPane_1 = this; }
    constructor(options, keybindingService, contextMenuService, configurationService, contextKeyService, viewDescriptorService, instantiationService, openerService, themeService, hoverService, storageService, chatService, chatAgentService, logService, notificationService, layoutService, chatSessionsService, telemetryService, lifecycleService, progressService, agentSessionsService, chatEntitlementService, commandService, activityService, workbenchEnvironmentService, hostService) {
        super(options, keybindingService, contextMenuService, configurationService, contextKeyService, viewDescriptorService, instantiationService, openerService, themeService, hoverService);
        this.storageService = storageService;
        this.chatService = chatService;
        this.chatAgentService = chatAgentService;
        this.logService = logService;
        this.notificationService = notificationService;
        this.layoutService = layoutService;
        this.chatSessionsService = chatSessionsService;
        this.telemetryService = telemetryService;
        this.progressService = progressService;
        this.agentSessionsService = agentSessionsService;
        this.chatEntitlementService = chatEntitlementService;
        this.commandService = commandService;
        this.activityService = activityService;
        this.workbenchEnvironmentService = workbenchEnvironmentService;
        this.hostService = hostService;
        this.lastDimensionsPerOrientation = new Map();
        this.modelRef = this._register(new MutableDisposable());
        this.activityBadge = this._register(new MutableDisposable());
        this.sessionsViewerOrientation = AgentSessionsViewerOrientation.Stacked;
        this.sessionsViewerOrientationConfiguration = 'sideBySide';
        this.sessionsViewerSashDisposables = this._register(new MutableDisposable());
        //#region Layout
        this.layoutingBody = false;
        // View state for the ViewPane is currently global per-provider basically,
        // but some other strictly per-model state will require a separate memento.
        this.memento = new Memento(`interactive-session-view-${CHAT_PROVIDER_ID}`, this.storageService);
        this.viewState = this.memento.getMemento(1 /* StorageScope.WORKSPACE */, 1 /* StorageTarget.MACHINE */);
        if (lifecycleService.startupKind !== 3 /* StartupKind.ReloadedWindow */ &&
            this.configurationService.getValue(ChatConfiguration.RestoreLastPanelSession) === false) {
            // clear persisted session on fresh start
            this.viewState.sessionId = undefined;
            this.viewState.sessionResource = undefined;
        }
        this.sessionsViewerVisible = false; // will be updated from layout code
        this.sessionsViewerSidebarWidth = Math.max(ChatViewPane_1.SESSIONS_SIDEBAR_MIN_WIDTH, this.viewState.sessionsSidebarWidth ?? ChatViewPane_1.SESSIONS_SIDEBAR_DEFAULT_WIDTH);
        // Contextkeys
        this.chatViewLocationContext = ChatContextKeys.panelLocation.bindTo(contextKeyService);
        this.sessionsViewerOrientationContext = ChatContextKeys.agentSessionsViewerOrientation.bindTo(contextKeyService);
        this.sessionsViewerPositionContext = ChatContextKeys.agentSessionsViewerPosition.bindTo(contextKeyService);
        this.sessionsViewerVisibilityContext = ChatContextKeys.agentSessionsViewerVisible.bindTo(contextKeyService);
        this.updateContextKeys();
        this.registerListeners();
    }
    updateContextKeys() {
        const { position, location } = this.getViewPositionAndLocation();
        this.chatViewLocationContext.set(location ?? 2 /* ViewContainerLocation.AuxiliaryBar */);
        this.sessionsViewerOrientationContext.set(this.sessionsViewerOrientation);
        this.sessionsViewerPositionContext.set(position === 1 /* Position.RIGHT */ ? AgentSessionsViewerPosition.Right : AgentSessionsViewerPosition.Left);
    }
    getViewPositionAndLocation() {
        const viewLocation = this.viewDescriptorService.getViewLocationById(this.id);
        const sideBarPosition = this.layoutService.getSideBarPosition();
        const panelPosition = this.layoutService.getPanelPosition();
        let sideSessionsOnRightPosition;
        switch (viewLocation) {
            case 0 /* ViewContainerLocation.Sidebar */:
                sideSessionsOnRightPosition = sideBarPosition === 1 /* Position.RIGHT */;
                break;
            case 1 /* ViewContainerLocation.Panel */:
                sideSessionsOnRightPosition = panelPosition !== 0 /* Position.LEFT */;
                break;
            default:
                sideSessionsOnRightPosition = sideBarPosition === 0 /* Position.LEFT */;
                break;
        }
        return {
            position: sideSessionsOnRightPosition ? 1 /* Position.RIGHT */ : 0 /* Position.LEFT */,
            location: viewLocation ?? 2 /* ViewContainerLocation.AuxiliaryBar */,
        };
    }
    getSessionHoverPosition() {
        const viewLocation = this.viewDescriptorService.getViewLocationById(this.id);
        const sideBarPosition = this.layoutService.getSideBarPosition();
        if (this.sessionsViewerOrientation === AgentSessionsViewerOrientation.SideBySide) {
            return viewLocation === 0 /* ViewContainerLocation.Sidebar */ && sideBarPosition === 1 /* Position.RIGHT */ ? 0 /* HoverPosition.LEFT */ : 1 /* HoverPosition.RIGHT */;
        }
        return {
            [0 /* Position.LEFT */]: 1 /* HoverPosition.RIGHT */,
            [1 /* Position.RIGHT */]: 0 /* HoverPosition.LEFT */,
            [3 /* Position.TOP */]: 2 /* HoverPosition.BELOW */,
            [2 /* Position.BOTTOM */]: 3 /* HoverPosition.ABOVE */
        }[viewLocation === 1 /* ViewContainerLocation.Panel */ ? this.layoutService.getPanelPosition() : sideBarPosition];
    }
    updateViewPaneClasses(fromEvent) {
        const activityBarLocationDefault = this.configurationService.getValue("workbench.activityBar.location" /* LayoutSettings.ACTIVITY_BAR_LOCATION */) === 'default';
        this.viewPaneContainer?.classList.toggle('activity-bar-location-default', activityBarLocationDefault);
        this.viewPaneContainer?.classList.toggle('activity-bar-location-other', !activityBarLocationDefault);
        const { position, location } = this.getViewPositionAndLocation();
        this.viewPaneContainer?.classList.toggle('chat-view-location-auxiliarybar', location === 2 /* ViewContainerLocation.AuxiliaryBar */);
        this.viewPaneContainer?.classList.toggle('chat-view-location-sidebar', location === 0 /* ViewContainerLocation.Sidebar */);
        this.viewPaneContainer?.classList.toggle('chat-view-location-panel', location === 1 /* ViewContainerLocation.Panel */);
        this.viewPaneContainer?.classList.toggle('chat-view-position-left', position === 0 /* Position.LEFT */);
        this.viewPaneContainer?.classList.toggle('chat-view-position-right', position === 1 /* Position.RIGHT */);
        if (fromEvent) {
            this.relayout();
        }
    }
    registerListeners() {
        // Agent changes
        this._register(this.chatAgentService.onDidChangeAgents(() => this.onDidChangeAgents()));
        // Layout changes
        this._register(Event.any(Event.filter(this.configurationService.onDidChangeConfiguration, e => e.affectsConfiguration('workbench.sideBar.location')), this.layoutService.onDidChangePanelPosition, Event.filter(this.viewDescriptorService.onDidChangeContainerLocation, e => e.viewContainer === this.viewDescriptorService.getViewContainerByViewId(this.id)))(() => {
            this.updateContextKeys();
            this.updateViewPaneClasses(true /* layout here */);
        }));
        // Settings changes
        this._register(Event.filter(this.configurationService.onDidChangeConfiguration, e => {
            return e.affectsConfiguration("workbench.activityBar.location" /* LayoutSettings.ACTIVITY_BAR_LOCATION */);
        })(() => this.updateViewPaneClasses(true)));
    }
    onDidChangeAgents() {
        if (this.chatAgentService.getDefaultAgent(ChatAgentLocation.Chat)) {
            if (!this._widget?.viewModel && !this.restoringSession) {
                const sessionResource = this.getTransferredOrPersistedSessionInfo();
                this.restoringSession =
                    (sessionResource ? this.chatService.acquireOrLoadSession(sessionResource, ChatAgentLocation.Chat, CancellationToken.None) : Promise.resolve(undefined)).then(async (modelRef) => {
                        if (!this._widget) {
                            return; // renderBody has not been called yet
                        }
                        // The widget may be hidden at this point, because welcome views were allowed. Use setVisible to
                        // avoid doing a render while the widget is hidden. This is changing the condition in `shouldShowWelcome`
                        // so it should fire onDidChangeViewWelcomeState.
                        const wasVisible = this._widget.visible;
                        try {
                            this._widget.setVisible(false);
                            await this.showModel(modelRef);
                        }
                        finally {
                            this._widget.setVisible(wasVisible);
                        }
                    });
                this.restoringSession.finally(() => this.restoringSession = undefined);
            }
        }
        this._onDidChangeViewWelcomeState.fire();
    }
    getTransferredOrPersistedSessionInfo() {
        if (this.chatService.transferredSessionResource) {
            return this.chatService.transferredSessionResource;
        }
        if (this.viewState.sessionResource) {
            return this.viewState.sessionResource;
        }
        return this.viewState.sessionId ? LocalChatSessionUri.forSession(this.viewState.sessionId) : undefined;
    }
    renderBody(parent) {
        super.renderBody(parent);
        this.telemetryService.publicLog2('chatViewPaneOpened');
        this.viewPaneContainer = parent;
        this.viewPaneContainer.classList.add('chat-viewpane');
        this.updateViewPaneClasses(false);
        this.createControls(parent);
        this.setupContextMenu(parent);
        this.applyModel();
    }
    createControls(parent) {
        // Sessions Control
        const sessionsControl = this.createSessionsControl(parent);
        // Welcome Control (used to show chat specific extension provided welcome views via `chatViewsWelcome` contribution point)
        const welcomeController = this.welcomeController = this._register(this.instantiationService.createInstance(ChatViewWelcomeController, parent, this, ChatAgentLocation.Chat));
        // Chat Control
        const chatWidget = this.createChatControl(parent);
        // Controls Listeners
        this.registerControlsListeners(sessionsControl, chatWidget, welcomeController);
        // Update sessions control visibility when all controls are created
        this.updateSessionsControlVisibility();
    }
    //#region Sessions Control
    static { this.SESSIONS_SIDEBAR_MIN_WIDTH = 200; }
    static { this.SESSIONS_SIDEBAR_SNAP_THRESHOLD = this.SESSIONS_SIDEBAR_MIN_WIDTH / 2; } // snap to hide when dragged below half of minimum width
    static { this.SESSIONS_SIDEBAR_DEFAULT_WIDTH = 300; }
    static { this.CHAT_WIDGET_DEFAULT_WIDTH = 300; }
    static { this.SESSIONS_SIDEBAR_VIEW_MIN_WIDTH = this.CHAT_WIDGET_DEFAULT_WIDTH + this.SESSIONS_SIDEBAR_DEFAULT_WIDTH; }
    createSessionsControl(parent) {
        const sessionsContainer = this.sessionsContainer = parent.appendChild($('.agent-sessions-container'));
        // Sessions Title
        const sessionsTitleContainer = this.sessionsTitleContainer = append(sessionsContainer, $('.agent-sessions-title-container'));
        const sessionsTitle = this.sessionsTitle = append(sessionsTitleContainer, $('span.agent-sessions-title'));
        sessionsTitle.textContent = localize(8338, null);
        this._register(addDisposableListener(sessionsTitle, EventType.CLICK, () => {
            this.sessionsControl?.scrollToTop();
            this.sessionsControl?.focus();
        }));
        // Sessions Toolbar
        const sessionsToolbarContainer = append(sessionsTitleContainer, $('.agent-sessions-toolbar'));
        const sessionsToolbar = this._register(this.instantiationService.createInstance(MenuWorkbenchToolBar, sessionsToolbarContainer, MenuId.AgentSessionsToolbar, {
            menuOptions: { shouldForwardArgs: true }
        }));
        // Sessions Filter
        const sessionsFilter = this._register(this.instantiationService.createInstance(AgentSessionsFilter, {
            filterMenuId: MenuId.AgentSessionsViewerFilterSubMenu,
            groupResults: () => this.sessionsViewerOrientation === AgentSessionsViewerOrientation.Stacked ? AgentSessionsGrouping.Capped : AgentSessionsGrouping.Date
        }));
        this._register(Event.runAndSubscribe(sessionsFilter.onDidChange, () => {
            sessionsToolbarContainer.classList.toggle('filtered', !sessionsFilter.isDefault());
        }));
        // New Session Button
        const newSessionButtonContainer = this.sessionsNewButtonContainer = append(sessionsContainer, $('.agent-sessions-new-button-container'));
        const newSessionButton = this._register(new Button(newSessionButtonContainer, { ...defaultButtonStyles, secondary: true }));
        newSessionButton.label = localize(8339, null);
        this._register(newSessionButton.onDidClick(() => this.commandService.executeCommand(ACTION_ID_NEW_CHAT)));
        // Sessions Control
        this.sessionsControlContainer = append(sessionsContainer, $('.agent-sessions-control-container'));
        const sessionsControl = this.sessionsControl = this._register(this.instantiationService.createInstance(AgentSessionsControl, this.sessionsControlContainer, {
            source: 'chatViewPane',
            filter: sessionsFilter,
            overrideStyles: this.getLocationBasedColors().listOverrideStyles,
            getHoverPosition: () => this.getSessionHoverPosition(),
            trackActiveEditorSession: () => {
                return !this._widget || this._widget.isEmpty(); // only track and reveal if chat widget is empty
            },
            overrideSessionOpenOptions: openEvent => {
                if (this.sessionsViewerOrientation === AgentSessionsViewerOrientation.Stacked && !openEvent.sideBySide) {
                    return { ...openEvent, editorOptions: { ...openEvent.editorOptions, preserveFocus: false /* focus the chat widget when opening from stacked sessions viewer since this closes the stacked viewer */ } };
                }
                return openEvent;
            },
        }));
        this._register(this.onDidChangeBodyVisibility(visible => sessionsControl.setVisible(visible)));
        sessionsToolbar.context = sessionsControl;
        // Refresh sessions when window gets focus to compensate for missing events
        this._register(this.hostService.onDidChangeFocus(hasFocus => {
            if (hasFocus) {
                sessionsControl.refresh();
            }
        }));
        // Deal with orientation configuration
        this._register(Event.runAndSubscribe(Event.filter(this.configurationService.onDidChangeConfiguration, e => e.affectsConfiguration(ChatConfiguration.ChatViewSessionsOrientation)), e => {
            const newSessionsViewerOrientationConfiguration = this.configurationService.getValue(ChatConfiguration.ChatViewSessionsOrientation);
            this.doUpdateConfiguredSessionsViewerOrientation(newSessionsViewerOrientationConfiguration, { updateConfiguration: false, layout: !!e });
        }));
        return sessionsControl;
    }
    getSessionsViewerOrientation() {
        return this.sessionsViewerOrientation;
    }
    updateConfiguredSessionsViewerOrientation(orientation) {
        return this.doUpdateConfiguredSessionsViewerOrientation(orientation, { updateConfiguration: true, layout: true });
    }
    doUpdateConfiguredSessionsViewerOrientation(orientation, options) {
        const oldSessionsViewerOrientationConfiguration = this.sessionsViewerOrientationConfiguration;
        let validatedOrientation;
        if (orientation === 'stacked' || orientation === 'sideBySide') {
            validatedOrientation = orientation;
        }
        else {
            validatedOrientation = 'sideBySide'; // default
        }
        this.sessionsViewerOrientationConfiguration = validatedOrientation;
        if (oldSessionsViewerOrientationConfiguration === this.sessionsViewerOrientationConfiguration) {
            return; // no change from our existing config
        }
        if (options.updateConfiguration) {
            this.configurationService.updateValue(ChatConfiguration.ChatViewSessionsOrientation, validatedOrientation);
        }
        if (options.layout) {
            this.relayout();
        }
    }
    updateSessionsControlVisibility() {
        if (!this.sessionsContainer || !this.viewPaneContainer) {
            return { changed: false, visible: false };
        }
        let newSessionsContainerVisible;
        if (!this.configurationService.getValue(ChatConfiguration.ChatViewSessionsEnabled)) {
            newSessionsContainerVisible = false; // disabled in settings
        }
        else {
            // Sessions control: stacked
            if (this.sessionsViewerOrientation === AgentSessionsViewerOrientation.Stacked) {
                newSessionsContainerVisible =
                    !!this.chatEntitlementService.sentiment.installed && // chat is installed (otherwise make room for terms and welcome)
                        (!this._widget || (this._widget.isEmpty() && !!this._widget.viewModel && !this._widget.viewModel.model.title)) && // chat widget empty (but not when model is loading or has a title)
                        !this.welcomeController?.isShowingWelcome.get(); // welcome not showing
            }
            // Sessions control: sidebar
            else {
                newSessionsContainerVisible =
                    !this.welcomeController?.isShowingWelcome.get() && // welcome not showing
                        !!this.lastDimensions && this.lastDimensions.width >= ChatViewPane_1.SESSIONS_SIDEBAR_VIEW_MIN_WIDTH; // has sessions or is showing all sessions
            }
        }
        this.viewPaneContainer.classList.toggle('has-sessions-control', newSessionsContainerVisible);
        const sessionsContainerVisible = this.sessionsContainer.style.display !== 'none';
        setVisibility(newSessionsContainerVisible, this.sessionsContainer);
        this.sessionsViewerVisible = newSessionsContainerVisible;
        this.sessionsViewerVisibilityContext.set(newSessionsContainerVisible);
        return {
            changed: sessionsContainerVisible !== newSessionsContainerVisible,
            visible: newSessionsContainerVisible
        };
    }
    getFocusedSessions() {
        return this.sessionsControl?.getFocus() ?? [];
    }
    //#endregion
    //#region Chat Control
    static { this.MIN_CHAT_WIDGET_HEIGHT = 116; }
    get widget() { return this._widget; }
    createChatControl(parent) {
        const chatControlsContainer = append(parent, $('.chat-controls-container'));
        const locationBasedColors = this.getLocationBasedColors();
        const editorOverflowWidgetsDomNode = this.layoutService.getContainer(getWindow(chatControlsContainer)).appendChild($('.chat-editor-overflow.monaco-editor'));
        this._register(toDisposable(() => editorOverflowWidgetsDomNode.remove()));
        // Chat Title (unless we are hosted in the chat bar)
        if (this.viewDescriptorService.getViewLocationById(this.id) !== 3 /* ViewContainerLocation.ChatBar */) {
            this.createChatTitleControl(chatControlsContainer);
        }
        // Chat Widget
        const scopedInstantiationService = this._register(this.instantiationService.createChild(new ServiceCollection([IContextKeyService, this.scopedContextKeyService])));
        this._widget = this._register(scopedInstantiationService.createInstance(ChatWidget, ChatAgentLocation.Chat, { viewId: this.id }, {
            autoScroll: mode => mode !== ChatModeKind.Ask,
            renderFollowups: true,
            supportsFileReferences: true,
            clear: () => this.clear(),
            rendererOptions: {
                renderTextEditsAsSummary: (uri) => {
                    return true;
                },
                referencesExpandedWhenEmptyResponse: false,
                progressMessageAtBottomOfResponse: mode => mode !== ChatModeKind.Ask,
            },
            editorOverflowWidgetsDomNode,
            enableImplicitContext: true,
            enableWorkingSet: this.workbenchEnvironmentService.isSessionsWindow
                ? 'implicit'
                : 'explicit',
            supportsChangingModes: true,
            dndContainer: parent,
            inputEditorMinLines: this.workbenchEnvironmentService.isSessionsWindow ? 2 : undefined,
            isSessionsWindow: this.workbenchEnvironmentService.isSessionsWindow,
        }, {
            listForeground: SIDE_BAR_FOREGROUND,
            listBackground: locationBasedColors.background,
            overlayBackground: locationBasedColors.overlayBackground,
            inputEditorBackground: locationBasedColors.background,
            resultEditorBackground: editorBackground,
        }));
        this._widget.render(chatControlsContainer);
        const updateWidgetVisibility = (reader) => this._widget.setVisible(this.isBodyVisible() && !this.welcomeController?.isShowingWelcome.read(reader));
        this._register(this.onDidChangeBodyVisibility(() => updateWidgetVisibility()));
        this._register(autorun(reader => updateWidgetVisibility(reader)));
        return this._widget;
    }
    createChatTitleControl(parent) {
        this.titleControl = this._register(this.instantiationService.createInstance(ChatViewTitleControl, parent, {
            focusChat: () => this._widget.focusInput()
        }));
        this._register(this.titleControl.onDidChangeHeight(() => {
            this.relayout();
        }));
    }
    //#endregion
    registerControlsListeners(sessionsControl, chatWidget, welcomeController) {
        // Sessions control visibility is impacted by multiple things:
        // - chat widget being in empty state or showing a chat
        // - extensions provided welcome view showing or not
        // - configuration setting
        this._register(Event.any(chatWidget.onDidChangeEmptyState, Event.fromObservable(welcomeController.isShowingWelcome), Event.filter(this.configurationService.onDidChangeConfiguration, e => e.affectsConfiguration(ChatConfiguration.ChatViewSessionsEnabled)))(() => {
            if (this.sessionsViewerOrientation === AgentSessionsViewerOrientation.Stacked) {
                sessionsControl.clearFocus(); // improve visual appearance when switching visibility by clearing focus
            }
            const { changed: visibilityChanged } = this.updateSessionsControlVisibility();
            if (visibilityChanged) {
                this.relayout();
            }
        }));
        // Track the active chat model and reveal it in the sessions control if side-by-side
        this._register(chatWidget.onDidChangeViewModel(() => {
            if (this.sessionsViewerOrientation === AgentSessionsViewerOrientation.Stacked) {
                return; // only reveal in side-by-side mode
            }
            const sessionResource = chatWidget.viewModel?.sessionResource;
            if (sessionResource) {
                const revealed = sessionsControl.reveal(sessionResource);
                if (!revealed) {
                    // Session doesn't exist in the list yet (e.g., new untitled session),
                    // clear the selection so the list doesn't show stale selection
                    sessionsControl.clearFocus();
                }
            }
        }));
        // When sessions change (e.g., after first message in a new session)
        // reveal it unless the user is interacting with the list already
        this._register(this.agentSessionsService.model.onDidChangeSessions(() => {
            if (this.sessionsViewerOrientation === AgentSessionsViewerOrientation.Stacked) {
                return; // only reveal in side-by-side mode
            }
            if (sessionsControl.hasFocusOrSelection()) {
                return; // do not reveal if user is interacting with sessions control
            }
            const sessionResource = chatWidget.viewModel?.sessionResource;
            if (sessionResource) {
                sessionsControl.reveal(sessionResource);
            }
        }));
        // When showing sessions stacked, adjust the height of the sessions list to make room for chat input
        this._register(autorun(reader => {
            chatWidget.inputPart.height.read(reader);
            if (this.sessionsViewerVisible && this.sessionsViewerOrientation === AgentSessionsViewerOrientation.Stacked) {
                this.relayout();
            }
        }));
        // Show progress badge when the current session is in progress
        const progressBadgeDisposables = this._register(new MutableDisposable());
        const updateProgressBadge = () => {
            progressBadgeDisposables.value = new DisposableStore();
            if (!this.configurationService.getValue(ChatConfiguration.ChatViewProgressBadgeEnabled)) {
                this.activityBadge.clear();
                return;
            }
            const model = chatWidget.viewModel?.model;
            if (model) {
                progressBadgeDisposables.value.add(autorun(reader => {
                    if (model.requestInProgress.read(reader)) {
                        this.activityBadge.value = this.activityService.showViewActivity(this.id, {
                            badge: new ProgressBadge(() => localize(8340, null))
                        });
                    }
                    else {
                        this.activityBadge.clear();
                    }
                }));
            }
            else {
                this.activityBadge.clear();
            }
        };
        this._register(chatWidget.onDidChangeViewModel(() => updateProgressBadge()));
        this._register(Event.filter(this.configurationService.onDidChangeConfiguration, e => e.affectsConfiguration(ChatConfiguration.ChatViewProgressBadgeEnabled))(() => updateProgressBadge()));
        updateProgressBadge();
    }
    setupContextMenu(parent) {
        this._register(addDisposableListener(parent, EventType.CONTEXT_MENU, e => {
            EventHelper.stop(e, true);
            this.contextMenuService.showContextMenu({
                menuId: MenuId.ChatWelcomeContext,
                contextKeyService: this.contextKeyService,
                getAnchor: () => new StandardMouseEvent(getWindow(parent), e)
            });
        }));
    }
    //#region Model Management
    applyModel() {
        this.restoringSession = this._applyModel();
        this.restoringSession.finally(() => this.restoringSession = undefined);
    }
    async _applyModel() {
        const sessionResource = this.getTransferredOrPersistedSessionInfo();
        const modelRef = sessionResource ? await this.chatService.acquireOrLoadSession(sessionResource, ChatAgentLocation.Chat, CancellationToken.None) : undefined;
        await this.showModel(modelRef);
    }
    async showModel(modelRef, startNewSession = true) {
        const oldModelResource = this.modelRef.value?.object.sessionResource;
        this.modelRef.value = undefined;
        let ref;
        if (startNewSession) {
            ref = modelRef ?? (this.chatService.transferredSessionResource
                ? await this.chatService.acquireOrLoadSession(this.chatService.transferredSessionResource, ChatAgentLocation.Chat, CancellationToken.None)
                : this.chatService.startNewLocalSession(ChatAgentLocation.Chat));
            if (!ref) {
                throw new Error('Could not start chat session');
            }
        }
        this.modelRef.value = ref;
        const model = ref?.object;
        if (model) {
            await this.updateWidgetLockState(getChatSessionType(model.sessionResource)); // Update widget lock state based on session type
            // remember as model to restore in view state
            this.viewState.sessionResource = model.sessionResource;
        }
        this._widget.setModel(model);
        // Update title control
        this.titleControl?.update(model);
        // Update the toolbar context with new sessionId
        this.updateActions();
        // Mark the old model as read when closing unless explicitly marked unread
        if (oldModelResource) {
            const oldSession = this.agentSessionsService.model.getSession(oldModelResource);
            if (oldSession && !oldSession.isMarkedUnread()) {
                oldSession.setRead(true);
            }
        }
        return model;
    }
    async updateWidgetLockState(sessionType) {
        if (sessionType === localChatSessionType) {
            this._widget.unlockFromCodingAgent();
            return;
        }
        let canResolve = false;
        try {
            canResolve = await this.chatSessionsService.canResolveChatSession(sessionType);
        }
        catch (error) {
            this.logService.warn(`Failed to resolve chat session type '${sessionType}' for locking`, error);
        }
        if (!canResolve) {
            this._widget.unlockFromCodingAgent();
            return;
        }
        const contribution = this.chatSessionsService.getChatSessionContribution(sessionType);
        if (contribution) {
            this._widget.lockToCodingAgent(contribution.name, contribution.displayName, sessionType);
        }
        else {
            this._widget.unlockFromCodingAgent();
        }
    }
    async clear() {
        // Grab the widget's latest view state because it will be loaded back into the widget
        this.updateViewState();
        await this.showModel(undefined);
        // Update the toolbar context with new sessionId
        this.updateActions();
    }
    async loadSession(sessionResource) {
        // Wait for any in-progress session restore (e.g. from onDidChangeAgents)
        // to finish first, so our showModel call is guaranteed to be the last one.
        if (this.restoringSession) {
            await this.restoringSession;
        }
        return this.progressService.withProgress({ location: ChatViewId, delay: 200 }, async () => {
            let queue = Promise.resolve();
            // A delay here to avoid blinking because only Cloud sessions are slow, most others are fast
            const clearWidget = disposableTimeout(() => {
                // clear current model without starting a new one
                queue = this.showModel(undefined, false).then(() => { });
            }, 100);
            try {
                const newModelRef = await this.chatService.acquireOrLoadSession(sessionResource, ChatAgentLocation.Chat, CancellationToken.None);
                clearWidget.dispose();
                await queue;
                return this.showModel(newModelRef);
            }
            catch (err) {
                clearWidget.dispose();
                await queue;
                // Recover by starting a fresh empty session so the widget
                // is not left in a broken state without title or back button.
                this.logService.error(`Failed to load chat session '${sessionResource.toString()}'`, err);
                this.notificationService.error(localize(8341, null, toErrorMessage(err)));
                return this.showModel(undefined);
            }
        });
    }
    //#endregion
    focus() {
        super.focus();
        this.focusInput();
    }
    focusInput() {
        this._widget.focusInput();
    }
    focusSessions() {
        if (this.sessionsContainer?.style.display === 'none') {
            return false; // not visible
        }
        this.sessionsControl?.focus();
        return true;
    }
    relayout() {
        if (this.lastDimensions) {
            this.layoutBody(this.lastDimensions.height, this.lastDimensions.width);
        }
    }
    layoutBody(height, width) {
        if (this.layoutingBody) {
            return; // prevent re-entrancy
        }
        this.layoutingBody = true;
        try {
            this.doLayoutBody(height, width);
        }
        finally {
            this.layoutingBody = false;
        }
    }
    doLayoutBody(height, width) {
        super.layoutBody(height, width);
        this.lastDimensions = { height, width };
        let remainingHeight = height;
        let remainingWidth = width;
        // Sessions Control
        const { heightReduction, widthReduction } = this.layoutSessionsControl(remainingHeight, remainingWidth);
        remainingHeight -= heightReduction;
        remainingWidth -= widthReduction;
        // Title Control
        remainingHeight -= this.titleControl?.getHeight() ?? 0;
        // Chat Widget
        this._widget.layout(remainingHeight, remainingWidth);
        // Remember last dimensions per orientation
        this.lastDimensionsPerOrientation.set(this.sessionsViewerOrientation, { height, width });
    }
    layoutSessionsControl(height, width) {
        let heightReduction = 0;
        let widthReduction = 0;
        if (!this.sessionsContainer || !this.sessionsControlContainer || !this.sessionsControl || !this.viewPaneContainer || !this.sessionsTitleContainer || !this.sessionsTitle) {
            return { heightReduction, widthReduction };
        }
        const oldSessionsViewerOrientation = this.sessionsViewerOrientation;
        let newSessionsViewerOrientation;
        switch (this.sessionsViewerOrientationConfiguration) {
            // Stacked
            case 'stacked':
                newSessionsViewerOrientation = AgentSessionsViewerOrientation.Stacked;
                break;
            // Update orientation based on available width
            default:
                newSessionsViewerOrientation = width >= ChatViewPane_1.SESSIONS_SIDEBAR_VIEW_MIN_WIDTH ? AgentSessionsViewerOrientation.SideBySide : AgentSessionsViewerOrientation.Stacked;
        }
        this.sessionsViewerOrientation = newSessionsViewerOrientation;
        if (newSessionsViewerOrientation === AgentSessionsViewerOrientation.SideBySide) {
            this.viewPaneContainer.classList.toggle('sessions-control-orientation-sidebyside', true);
            this.viewPaneContainer.classList.toggle('sessions-control-orientation-stacked', false);
            this.sessionsViewerOrientationContext.set(AgentSessionsViewerOrientation.SideBySide);
        }
        else {
            this.viewPaneContainer.classList.toggle('sessions-control-orientation-sidebyside', false);
            this.viewPaneContainer.classList.toggle('sessions-control-orientation-stacked', true);
            this.sessionsViewerOrientationContext.set(AgentSessionsViewerOrientation.Stacked);
        }
        if (oldSessionsViewerOrientation !== this.sessionsViewerOrientation) {
            const updatePromise = this.sessionsControl.update(); // Changing orientation has an impact to grouping, so we need to update
            // Switching to side-by-side, reveal the current session after elements have loaded
            if (this.sessionsViewerOrientation === AgentSessionsViewerOrientation.SideBySide) {
                updatePromise.then(() => {
                    const sessionResource = this._widget?.viewModel?.sessionResource;
                    if (sessionResource) {
                        this.sessionsControl?.reveal(sessionResource);
                    }
                });
            }
        }
        // Ensure visibility is in sync before we layout
        const { visible: sessionsContainerVisible } = this.updateSessionsControlVisibility();
        // Handle Sash (only visible in side-by-side)
        if (!sessionsContainerVisible || this.sessionsViewerOrientation === AgentSessionsViewerOrientation.Stacked) {
            this.sessionsViewerSashDisposables.clear();
            this.sessionsViewerSash = undefined;
        }
        else if (this.sessionsViewerOrientation === AgentSessionsViewerOrientation.SideBySide) {
            if (!this.sessionsViewerSashDisposables.value && this.viewPaneContainer) {
                this.createSessionsViewerSash(this.viewPaneContainer, height, width);
            }
        }
        if (!sessionsContainerVisible) {
            return { heightReduction: 0, widthReduction: 0 };
        }
        let availableSessionsHeight = height - this.sessionsTitleContainer.offsetHeight;
        if (this.sessionsViewerOrientation === AgentSessionsViewerOrientation.Stacked) {
            availableSessionsHeight -= Math.max(ChatViewPane_1.MIN_CHAT_WIDGET_HEIGHT, this._widget?.input?.height.get() ?? 0);
        }
        else {
            availableSessionsHeight -= this.sessionsNewButtonContainer?.offsetHeight ?? 0;
        }
        // Show as sidebar
        if (this.sessionsViewerOrientation === AgentSessionsViewerOrientation.SideBySide) {
            const sessionsViewerSidebarWidth = this.computeEffectiveSideBySideSessionsSidebarWidth(width);
            this.sessionsControlContainer.style.height = `${availableSessionsHeight}px`;
            this.sessionsControlContainer.style.width = `${sessionsViewerSidebarWidth}px`;
            this.sessionsControl.layout(availableSessionsHeight, sessionsViewerSidebarWidth);
            this.sessionsViewerSash?.layout();
            heightReduction = 0; // side by side to chat widget
            widthReduction = this.sessionsContainer.offsetWidth;
        }
        // Show stacked
        else {
            this.sessionsControlContainer.style.height = `${availableSessionsHeight}px`;
            this.sessionsControlContainer.style.width = ``;
            this.sessionsControl.layout(availableSessionsHeight, width);
            heightReduction = this.sessionsContainer.offsetHeight;
            widthReduction = 0; // stacked on top of the chat widget
        }
        return { heightReduction, widthReduction };
    }
    computeEffectiveSideBySideSessionsSidebarWidth(width, sessionsViewerSidebarWidth = this.sessionsViewerSidebarWidth) {
        return Math.max(ChatViewPane_1.SESSIONS_SIDEBAR_MIN_WIDTH, // never smaller than min width for side by side sessions
        Math.min(sessionsViewerSidebarWidth, width - ChatViewPane_1.CHAT_WIDGET_DEFAULT_WIDTH // never so wide that chat widget is smaller than default width
        ));
    }
    getLastDimensions(orientation) {
        return this.lastDimensionsPerOrientation.get(orientation);
    }
    createSessionsViewerSash(container, height, width) {
        const disposables = this.sessionsViewerSashDisposables.value = new DisposableStore();
        const sash = this.sessionsViewerSash = disposables.add(new Sash(container, {
            getVerticalSashLeft: () => {
                const sessionsViewerSidebarWidth = this.computeEffectiveSideBySideSessionsSidebarWidth(this.lastDimensions?.width ?? width);
                const { position } = this.getViewPositionAndLocation();
                if (position === 1 /* Position.RIGHT */) {
                    return (this.lastDimensions?.width ?? width) - sessionsViewerSidebarWidth;
                }
                return sessionsViewerSidebarWidth;
            }
        }, { orientation: 0 /* Orientation.VERTICAL */ }));
        let sashStartWidth;
        disposables.add(sash.onDidStart(() => sashStartWidth = this.sessionsViewerSidebarWidth));
        disposables.add(sash.onDidEnd(() => sashStartWidth = undefined));
        disposables.add(sash.onDidChange(e => {
            if (sashStartWidth === undefined || !this.lastDimensions) {
                return;
            }
            const { position } = this.getViewPositionAndLocation();
            const delta = e.currentX - e.startX;
            const newWidth = position === 1 /* Position.RIGHT */ ? sashStartWidth - delta : sashStartWidth + delta;
            if (newWidth < ChatViewPane_1.SESSIONS_SIDEBAR_SNAP_THRESHOLD) {
                this.updateConfiguredSessionsViewerOrientation('stacked'); // snap to stacked when sized small enough
                return;
            }
            this.sessionsViewerSidebarWidth = this.computeEffectiveSideBySideSessionsSidebarWidth(this.lastDimensions.width, newWidth);
            this.viewState.sessionsSidebarWidth = this.sessionsViewerSidebarWidth;
            this.layoutBody(this.lastDimensions.height, this.lastDimensions.width);
        }));
        disposables.add(sash.onDidReset(() => {
            this.sessionsViewerSidebarWidth = ChatViewPane_1.SESSIONS_SIDEBAR_DEFAULT_WIDTH;
            this.viewState.sessionsSidebarWidth = this.sessionsViewerSidebarWidth;
            this.relayout();
        }));
    }
    //#endregion
    saveState() {
        // Don't do saveState when no widget, or no viewModel in which case
        // the state has not yet been restored - in that case the default
        // state would overwrite the real state
        if (this._widget?.viewModel) {
            this._widget.saveState();
            this.updateViewState();
            this.memento.saveMemento();
        }
        super.saveState();
    }
    updateViewState(viewState) {
        const newViewState = viewState ?? this._widget.getViewState();
        if (newViewState) {
            for (const [key, value] of Object.entries(newViewState)) {
                this.viewState[key] = value; // Assign all props to the memento so they get saved
            }
        }
    }
    shouldShowWelcome() {
        const noPersistedSessions = !this.chatService.hasSessions();
        const hasCoreAgent = this.chatAgentService.getAgents().some(agent => agent.isCore && agent.locations.includes(ChatAgentLocation.Chat));
        const hasDefaultAgent = this.chatAgentService.getDefaultAgent(ChatAgentLocation.Chat) !== undefined; // only false when Hide AI Features has run and unregistered the setup agents
        const shouldShow = !hasCoreAgent && (!hasDefaultAgent || !this._widget?.viewModel && noPersistedSessions);
        this.logService.trace(`ChatViewPane#shouldShowWelcome() = ${shouldShow}: hasCoreAgent=${hasCoreAgent} hasDefaultAgent=${hasDefaultAgent} || noViewModel=${!this._widget?.viewModel} && noPersistedSessions=${noPersistedSessions}`);
        return !!shouldShow;
    }
    getMatchingWelcomeView() {
        return this.welcomeController?.getMatchingWelcomeView();
    }
    getActionsContext() {
        return this._widget?.viewModel ? {
            sessionResource: this._widget.viewModel.sessionResource,
            $mid: 19 /* MarshalledId.ChatViewContext */
        } : undefined;
    }
};
ChatViewPane = ChatViewPane_1 = __decorate([
    __param(1, IKeybindingService),
    __param(2, IContextMenuService),
    __param(3, IConfigurationService),
    __param(4, IContextKeyService),
    __param(5, IViewDescriptorService),
    __param(6, IInstantiationService),
    __param(7, IOpenerService),
    __param(8, IThemeService),
    __param(9, IHoverService),
    __param(10, IStorageService),
    __param(11, IChatService),
    __param(12, IChatAgentService),
    __param(13, ILogService),
    __param(14, INotificationService),
    __param(15, IWorkbenchLayoutService),
    __param(16, IChatSessionsService),
    __param(17, ITelemetryService),
    __param(18, ILifecycleService),
    __param(19, IProgressService),
    __param(20, IAgentSessionsService),
    __param(21, IChatEntitlementService),
    __param(22, ICommandService),
    __param(23, IActivityService),
    __param(24, IWorkbenchEnvironmentService),
    __param(25, IHostService)
], ChatViewPane);
export { ChatViewPane };
//# sourceMappingURL=chatViewPane.js.map