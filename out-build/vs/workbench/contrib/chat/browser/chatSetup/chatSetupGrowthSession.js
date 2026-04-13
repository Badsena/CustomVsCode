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
var GrowthSessionController_1;
import { Codicon } from '../../../../../base/common/codicons.js';
import { Emitter } from '../../../../../base/common/event.js';
import { Disposable, DisposableStore } from '../../../../../base/common/lifecycle.js';
import { URI } from '../../../../../base/common/uri.js';
import { localize, localize2 } from '../../../../../nls.js';
import { Action2, registerAction2 } from '../../../../../platform/actions/common/actions.js';
import { ICommandService } from '../../../../../platform/commands/common/commands.js';
import { ILogService } from '../../../../../platform/log/common/log.js';
import { IStorageService } from '../../../../../platform/storage/common/storage.js';
import { ILifecycleService } from '../../../../services/lifecycle/common/lifecycle.js';
import { AgentSessionProviders } from '../agentSessions/agentSessions.js';
import { sessionOpenerRegistry } from '../agentSessions/agentSessionsOpener.js';
import { IChatWidgetService } from '../chat.js';
import { CHAT_OPEN_ACTION_ID } from '../actions/chatActions.js';
/**
 * Core-side growth session controller that shows a single "attention needed"
 * session item in the agent sessions view for anonymous/new users.
 *
 * When the user clicks the session, we open the chat panel (which triggers the
 * anonymous setup flow). When the user opens chat at all, the badge is cleared.
 *
 * The session is shown at most once, tracked via a storage flag.
 */
let GrowthSessionController = class GrowthSessionController extends Disposable {
    static { GrowthSessionController_1 = this; }
    static { this.STORAGE_KEY = 'chat.growthSession.dismissed'; }
    static { this.SESSION_URI = URI.from({ scheme: AgentSessionProviders.Growth, path: '/growth-welcome' }); }
    get isDismissed() { return this._dismissed; }
    constructor(storageService, chatWidgetService, lifecycleService, logService) {
        super();
        this.storageService = storageService;
        this.chatWidgetService = chatWidgetService;
        this.lifecycleService = lifecycleService;
        this.logService = logService;
        this._onDidChangeChatSessionItems = this._register(new Emitter());
        this.onDidChangeChatSessionItems = this._onDidChangeChatSessionItems.event;
        this._onDidDismiss = this._register(new Emitter());
        this.onDidDismiss = this._onDidDismiss.event;
        this._created = Date.now();
        this._dismissed = this.storageService.getBoolean(GrowthSessionController_1.STORAGE_KEY, -1 /* StorageScope.APPLICATION */, false);
        // Dismiss the growth session when the user opens chat.
        // Wait until the workbench is fully restored so we skip widgets
        // that were restored from a previous session at startup.
        this.lifecycleService.when(3 /* LifecyclePhase.Restored */).then(() => {
            if (this._store.isDisposed || this._dismissed) {
                return;
            }
            this._register(this.chatWidgetService.onDidAddWidget(() => {
                this.dismiss();
            }));
        });
    }
    get items() {
        if (this._dismissed) {
            return [];
        }
        return [{
                resource: GrowthSessionController_1.SESSION_URI,
                label: localize(7387, null),
                description: localize(7388, null),
                status: 3 /* ChatSessionStatus.NeedsInput */,
                iconPath: Codicon.lightbulb,
                timing: {
                    created: this._created,
                    lastRequestStarted: undefined,
                    lastRequestEnded: undefined,
                },
            }];
    }
    async refresh() {
        // Nothing to refresh -- this is a static, local-only session item
    }
    dismiss() {
        if (this._dismissed) {
            return;
        }
        this.logService.trace('[GrowthSession] Dismissing growth session');
        this._dismissed = true;
        this.storageService.store(GrowthSessionController_1.STORAGE_KEY, true, -1 /* StorageScope.APPLICATION */, 0 /* StorageTarget.USER */);
        // Fire change event first so that listeners (like the model) see empty items
        this._onDidChangeChatSessionItems.fire({
            removed: [GrowthSessionController_1.SESSION_URI],
        });
        // Then fire dismiss event which triggers unregistration of the controller.
        this._onDidDismiss.fire();
    }
};
GrowthSessionController = GrowthSessionController_1 = __decorate([
    __param(0, IStorageService),
    __param(1, IChatWidgetService),
    __param(2, ILifecycleService),
    __param(3, ILogService)
], GrowthSessionController);
export { GrowthSessionController };
/**
 * Handles clicks on the growth session item in the agent sessions view.
 * Opens a new local chat session with a pre-seeded welcome message.
 * The user can then send messages that go through the normal agent.
 */
export class GrowthSessionOpenerParticipant {
    async handleOpenSession(accessor, session, _openOptions) {
        if (session.providerType !== AgentSessionProviders.Growth) {
            return false;
        }
        const commandService = accessor.get(ICommandService);
        const opts = {
            query: '',
            isPartialQuery: true,
            previousRequests: [{
                    request: localize(7389, null),
                    // allow-any-unicode-next-line
                    response: localize(7390, null),
                }],
        };
        await commandService.executeCommand(CHAT_OPEN_ACTION_ID, opts);
        return true;
    }
}
/**
 * Registers the growth session controller and opener participant.
 * Returns a disposable that cleans up all registrations.
 */
export function registerGrowthSession(chatSessionsService, growthController) {
    const disposables = new DisposableStore();
    // Register as session item controller so it appears in the sessions view
    disposables.add(chatSessionsService.registerChatSessionItemController(AgentSessionProviders.Growth, growthController));
    // Register opener participant so clicking the growth session opens chat
    disposables.add(sessionOpenerRegistry.registerParticipant(new GrowthSessionOpenerParticipant()));
    return disposables;
}
// #region Developer Actions
registerAction2(class ResetGrowthSessionAction extends Action2 {
    constructor() {
        super({
            id: 'workbench.action.chat.resetGrowthSession',
            title: localize2(7391, "Reset Growth Session Notification"),
            category: localize2(7392, "Developer"),
            f1: true,
        });
    }
    run(accessor) {
        const storageService = accessor.get(IStorageService);
        storageService.remove(GrowthSessionController.STORAGE_KEY, -1 /* StorageScope.APPLICATION */);
    }
});
// #endregion
//# sourceMappingURL=chatSetupGrowthSession.js.map