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
import { Disposable } from '../../../../base/common/lifecycle.js';
import { AgentHostContribution } from '../browser/agentSessions/agentHost/agentHostChatContribution.js';
import { autorun } from '../../../../base/common/observable.js';
import { resolve } from '../../../../base/common/path.js';
import { isMacintosh } from '../../../../base/common/platform.js';
import { generateUuid } from '../../../../base/common/uuid.js';
import { URI } from '../../../../base/common/uri.js';
import { ipcRenderer } from '../../../../base/parts/sandbox/electron-browser/globals.js';
import { localize } from '../../../../nls.js';
import { registerAction2 } from '../../../../platform/actions/common/actions.js';
import { CommandsRegistry, ICommandService } from '../../../../platform/commands/common/commands.js';
import { IContextKeyService } from '../../../../platform/contextkey/common/contextkey.js';
import { IDialogService } from '../../../../platform/dialogs/common/dialogs.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { INativeHostService } from '../../../../platform/native/common/native.js';
import { IProductService } from '../../../../platform/product/common/productService.js';
import { IWorkspaceTrustRequestService } from '../../../../platform/workspace/common/workspaceTrust.js';
import { registerWorkbenchContribution2 } from '../../../common/contributions.js';
import { IViewsService } from '../../../services/views/common/viewsService.js';
import { IEditorService } from '../../../services/editor/common/editorService.js';
import { INativeWorkbenchEnvironmentService } from '../../../services/environment/electron-browser/environmentService.js';
import { IExtensionService } from '../../../services/extensions/common/extensions.js';
import { IWorkbenchLayoutService } from '../../../services/layout/browser/layoutService.js';
import { ILifecycleService } from '../../../services/lifecycle/common/lifecycle.js';
import { ACTION_ID_NEW_CHAT, CHAT_OPEN_ACTION_ID } from '../browser/actions/chatActions.js';
import { ChatViewId, ChatViewPaneTarget, IChatWidgetService } from '../browser/chat.js';
import { ChatEditorInput } from '../browser/widgetHosts/editor/chatEditorInput.js';
import { AgentSessionProviders } from '../browser/agentSessions/agentSessions.js';
import { isSessionInProgressStatus } from '../browser/agentSessions/agentSessionsModel.js';
import { IAgentSessionsService } from '../browser/agentSessions/agentSessionsService.js';
import { IChatEntitlementService } from '../../../services/chat/common/chatEntitlementService.js';
import { ChatContextKeys } from '../common/actions/chatContextKeys.js';
import { ChatModeKind } from '../common/constants.js';
import { IChatService } from '../common/chatService/chatService.js';
import { registerChatDeveloperActions } from './actions/chatDeveloperActions.js';
import { registerChatExportZipAction } from './actions/chatExportZip.js';
import { HoldToVoiceChatInChatViewAction, InlineVoiceChatAction, QuickVoiceChatAction, ReadChatResponseAloud, StartVoiceChatAction, StopListeningAction, StopListeningAndSubmitAction, StopReadAloud, StopReadChatItemAloud, VoiceChatInChatViewAction } from './actions/voiceChatActions.js';
import { NativeBuiltinToolsContribution } from './builtInTools/tools.js';
import { OpenSessionsWindowAction } from './agentSessions/agentSessionsActions.js';
let ChatCommandLineHandler = class ChatCommandLineHandler extends Disposable {
    static { this.ID = 'workbench.contrib.chatCommandLineHandler'; }
    constructor(environmentService, commandService, workspaceTrustRequestService, logService, layoutService, contextKeyService, chatWidgetService) {
        super();
        this.environmentService = environmentService;
        this.commandService = commandService;
        this.workspaceTrustRequestService = workspaceTrustRequestService;
        this.logService = logService;
        this.layoutService = layoutService;
        this.contextKeyService = contextKeyService;
        this.chatWidgetService = chatWidgetService;
        this.registerListeners();
    }
    registerListeners() {
        ipcRenderer.on('vscode:handleChatRequest', (_, ...args) => {
            const chatArgs = args[0];
            this.logService.trace('vscode:handleChatRequest', chatArgs);
            this.prompt(chatArgs);
        });
        ipcRenderer.on('vscode:openChatSession', (_, ...args) => {
            const sessionUriString = args[0];
            this.logService.trace('vscode:openChatSession', sessionUriString);
            const sessionResource = URI.parse(sessionUriString);
            this.chatWidgetService.openSession(sessionResource, ChatViewPaneTarget);
        });
    }
    async prompt(args) {
        if (!Array.isArray(args?._)) {
            return;
        }
        const trusted = await this.workspaceTrustRequestService.requestWorkspaceTrust({
            message: localize(9038, null)
        });
        if (!trusted) {
            return;
        }
        const opts = {
            query: args._.length > 0 ? args._.join(' ') : '',
            mode: args.mode ?? ChatModeKind.Agent,
            attachFiles: args['add-file']?.map(file => URI.file(resolve(file))), // use `resolve` to deal with relative paths properly
        };
        if (args.maximize) {
            const location = this.contextKeyService.getContextKeyValue(ChatContextKeys.panelLocation.key);
            if (location === 2 /* ViewContainerLocation.AuxiliaryBar */) {
                this.layoutService.setAuxiliaryBarMaximized(true);
            }
            else if (location === 1 /* ViewContainerLocation.Panel */ && !this.layoutService.isPanelMaximized()) {
                this.layoutService.toggleMaximizedPanel();
            }
        }
        await this.commandService.executeCommand(ACTION_ID_NEW_CHAT);
        await this.commandService.executeCommand(CHAT_OPEN_ACTION_ID, opts);
    }
};
ChatCommandLineHandler = __decorate([
    __param(0, INativeWorkbenchEnvironmentService),
    __param(1, ICommandService),
    __param(2, IWorkspaceTrustRequestService),
    __param(3, ILogService),
    __param(4, IWorkbenchLayoutService),
    __param(5, IContextKeyService),
    __param(6, IChatWidgetService)
], ChatCommandLineHandler);
let ChatSuspendThrottlingHandler = class ChatSuspendThrottlingHandler extends Disposable {
    static { this.ID = 'workbench.contrib.chatSuspendThrottlingHandler'; }
    constructor(nativeHostService, chatService, productService, logService) {
        super();
        this._register(autorun(reader => {
            const running = chatService.requestInProgressObs.read(reader);
            // When a chat request is in progress, we must ensure that background
            // throttling is not applied so that the chat session can continue
            // even when the window is not in focus.
            nativeHostService.setBackgroundThrottling(!running);
            if (productService.quality === 'insider') { // TODO@bpasero remove me in the future
                logService.info(`[ChatSuspendThrottlingHandler] background throttling ${running ? 'suspended' : 'resumed'}`);
            }
        }));
    }
};
ChatSuspendThrottlingHandler = __decorate([
    __param(0, INativeHostService),
    __param(1, IChatService),
    __param(2, IProductService),
    __param(3, ILogService)
], ChatSuspendThrottlingHandler);
let ChatLifecycleHandler = class ChatLifecycleHandler extends Disposable {
    static { this.ID = 'workbench.contrib.chatLifecycleHandler'; }
    constructor(lifecycleService, agentSessionsService, dialogService, widgetService, contextKeyService, extensionService, environmentService, chatEntitlementService) {
        super();
        this.agentSessionsService = agentSessionsService;
        this.dialogService = dialogService;
        this.widgetService = widgetService;
        this.contextKeyService = contextKeyService;
        this.environmentService = environmentService;
        this.chatEntitlementService = chatEntitlementService;
        this._register(lifecycleService.onBeforeShutdown(e => {
            e.veto(this.shouldVetoShutdown(e.reason), 'veto.chat');
        }));
        this._register(extensionService.onWillStop(e => {
            e.veto(this.hasNonCloudSessionInProgress(), localize(9039, null));
        }));
    }
    hasNonCloudSessionInProgress() {
        if (this.chatEntitlementService.sentiment.hidden) {
            return false; // AI features are disabled
        }
        return this.agentSessionsService.model.sessions.some(session => isSessionInProgressStatus(session.status) &&
            session.providerType !== AgentSessionProviders.Cloud &&
            !session.isArchived());
    }
    shouldVetoShutdown(reason) {
        if (this.environmentService.enableSmokeTestDriver) {
            return false;
        }
        if (!this.hasNonCloudSessionInProgress()) {
            return false;
        }
        if (ChatContextKeys.skipChatRequestInProgressMessage.getValue(this.contextKeyService) === true) {
            return false;
        }
        return this.doShouldVetoShutdown(reason);
    }
    async doShouldVetoShutdown(reason) {
        this.widgetService.revealWidget();
        let message;
        let detail;
        switch (reason) {
            case 1 /* ShutdownReason.CLOSE */:
                message = localize(9040, null);
                detail = localize(9041, null);
                break;
            case 4 /* ShutdownReason.LOAD */:
                message = localize(9042, null);
                detail = localize(9043, null);
                break;
            case 3 /* ShutdownReason.RELOAD */:
                message = localize(9044, null);
                detail = localize(9045, null);
                break;
            default:
                message = isMacintosh ? localize(9046, null) : localize(9047, null);
                detail = isMacintosh ? localize(9048, null) : localize(9049, null);
                break;
        }
        const result = await this.dialogService.confirm({ message, detail });
        return !result.confirmed;
    }
};
ChatLifecycleHandler = __decorate([
    __param(0, ILifecycleService),
    __param(1, IAgentSessionsService),
    __param(2, IDialogService),
    __param(3, IChatWidgetService),
    __param(4, IContextKeyService),
    __param(5, IExtensionService),
    __param(6, INativeWorkbenchEnvironmentService),
    __param(7, IChatEntitlementService)
], ChatLifecycleHandler);
export { ChatLifecycleHandler };
registerAction2(OpenSessionsWindowAction);
registerAction2(StartVoiceChatAction);
registerAction2(VoiceChatInChatViewAction);
registerAction2(HoldToVoiceChatInChatViewAction);
registerAction2(QuickVoiceChatAction);
registerAction2(InlineVoiceChatAction);
registerAction2(StopListeningAction);
registerAction2(StopListeningAndSubmitAction);
registerAction2(ReadChatResponseAloud);
registerAction2(StopReadChatItemAloud);
registerAction2(StopReadAloud);
registerChatDeveloperActions();
registerChatExportZipAction();
// registerWorkbenchContribution2(KeywordActivationContribution.ID, KeywordActivationContribution, WorkbenchPhase.AfterRestored);
registerWorkbenchContribution2(NativeBuiltinToolsContribution.ID, NativeBuiltinToolsContribution, 3 /* WorkbenchPhase.AfterRestored */);
registerWorkbenchContribution2(ChatCommandLineHandler.ID, ChatCommandLineHandler, 2 /* WorkbenchPhase.BlockRestore */);
registerWorkbenchContribution2(ChatSuspendThrottlingHandler.ID, ChatSuspendThrottlingHandler, 3 /* WorkbenchPhase.AfterRestored */);
// registerWorkbenchContribution2(ChatLifecycleHandler.ID, ChatLifecycleHandler, WorkbenchPhase.AfterRestored);
registerWorkbenchContribution2(AgentHostContribution.ID, AgentHostContribution, 3 /* WorkbenchPhase.AfterRestored */);
// Register command for opening a new Agent Host session from the session type picker
CommandsRegistry.registerCommand(`workbench.action.chat.openNewChatSessionInPlace.${AgentSessionProviders.AgentHostCopilot}`, async (accessor, chatSessionPosition) => {
    const viewsService = accessor.get(IViewsService);
    const resource = URI.from({
        scheme: AgentSessionProviders.AgentHostCopilot,
        path: `/untitled-${generateUuid()}`,
    });
    if (chatSessionPosition === 'editor') {
        const editorService = accessor.get(IEditorService);
        await editorService.openEditor({
            resource,
            options: {
                override: ChatEditorInput.EditorID,
                pinned: true,
            },
        });
    }
    else {
        const view = await viewsService.openView(ChatViewId);
        await view.loadSession(resource);
        view.focus();
    }
});
//# sourceMappingURL=chat.contribution.js.map