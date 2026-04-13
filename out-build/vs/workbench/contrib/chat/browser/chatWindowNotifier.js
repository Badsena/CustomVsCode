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
import * as dom from '../../../../base/browser/dom.js';
import { mainWindow } from '../../../../base/browser/window.js';
import { CancellationTokenSource } from '../../../../base/common/cancellation.js';
import { Disposable, DisposableResourceMap, toDisposable } from '../../../../base/common/lifecycle.js';
import { autorunDelta, autorunIterableDelta } from '../../../../base/common/observable.js';
import { localize } from '../../../../nls.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { IHostService } from '../../../services/host/browser/host.js';
import { IChatService } from '../common/chatService/chatService.js';
import { migrateLegacyTerminalToolSpecificData } from '../common/chat.js';
import { ChatConfiguration, ChatNotificationMode } from '../common/constants.js';
import { IChatWidgetService } from './chat.js';
/**
 * Observes all live chat models and triggers OS notifications when any model
 * transitions to needing input (confirmation/elicitation).
 */
let ChatWindowNotifier = class ChatWindowNotifier extends Disposable {
    static { this.ID = 'workbench.contrib.chatWindowNotifier'; }
    constructor(_chatService, _chatWidgetService, _hostService, _configurationService) {
        super();
        this._chatService = _chatService;
        this._chatWidgetService = _chatWidgetService;
        this._hostService = _hostService;
        this._configurationService = _configurationService;
        this._activeNotifications = this._register(new DisposableResourceMap());
        const modelTrackers = this._register(new DisposableResourceMap());
        this._register(autorunIterableDelta(reader => this._chatService.chatModels.read(reader), ({ addedValues, removedValues }) => {
            for (const model of addedValues) {
                modelTrackers.set(model.sessionResource, this._trackModel(model));
            }
            for (const model of removedValues) {
                modelTrackers.deleteAndDispose(model.sessionResource);
            }
        }));
    }
    _trackModel(model) {
        return autorunDelta(model.requestNeedsInput, ({ lastValue, newValue }) => {
            const currentNeedsInput = !!newValue;
            const previousNeedsInput = !!lastValue;
            // Only notify on transition from false -> true
            if (!previousNeedsInput && currentNeedsInput && newValue) {
                this._notifyIfNeeded(model.sessionResource, newValue);
            }
            else if (previousNeedsInput && !currentNeedsInput) {
                // Clear any active notification for this session when input is no longer needed
                this._clearNotification(model.sessionResource);
            }
        });
    }
    async _notifyIfNeeded(sessionResource, info) {
        // Check configuration
        const mode = this._configurationService.getValue(ChatConfiguration.NotifyWindowOnConfirmation);
        if (mode === ChatNotificationMode.Off) {
            return;
        }
        // Find the widget to determine the target window
        const widget = this._chatWidgetService.getWidgetBySessionResource(sessionResource);
        const targetWindow = widget ? dom.getWindow(widget.domNode) : mainWindow;
        const isFocused = targetWindow.document.hasFocus();
        if (mode !== ChatNotificationMode.Always && isFocused) {
            return;
        }
        // Clear any existing notification for this session
        this._clearNotification(sessionResource);
        // Focus window in notify mode (flash taskbar/dock) if not already focused
        if (!isFocused) {
            await this._hostService.focus(targetWindow, { mode: 1 /* FocusMode.Notify */ });
        }
        // Create OS notification
        const notificationTitle = info.title ? localize(7544, null, info.title) : localize(7545, null);
        const cts = new CancellationTokenSource();
        this._activeNotifications.set(sessionResource, toDisposable(() => cts.dispose(true)));
        // Determine if the pending input is for a question carousel
        const isQuestionCarousel = this._isQuestionCarouselPending(sessionResource);
        try {
            const actionLabel = isQuestionCarousel
                ? localize(7546, null)
                : localize(7547, null);
            const result = await this._hostService.showToast({
                title: this._sanitizeOSToastText(notificationTitle),
                body: this._getNotificationBody(sessionResource, info, isQuestionCarousel),
                actions: [actionLabel],
            }, cts.token);
            if (result.actionIndex === 0 && !isQuestionCarousel && this._confirmAllow(sessionResource)) {
                return; // skip focusing/opening chat if we successfully confirmed the tool invocation from the toast action
            }
            if (result.clicked || typeof result.actionIndex === 'number') {
                await this._hostService.focus(targetWindow, { mode: 2 /* FocusMode.Force */ });
                const widget = await this._chatWidgetService.openSession(sessionResource);
                widget?.focusInput();
            }
        }
        finally {
            this._clearNotification(sessionResource);
        }
    }
    _confirmAllow(sessionResource) {
        const model = this._chatService.getSession(sessionResource);
        const lastResponse = model?.lastRequest?.response;
        if (!lastResponse) {
            return false;
        }
        for (const part of lastResponse.response.value) {
            const state = part.kind === 'toolInvocation' ? part.state.get() : undefined;
            if (state?.type === 1 /* IChatToolInvocation.StateKind.WaitingForConfirmation */ || state?.type === 3 /* IChatToolInvocation.StateKind.WaitingForPostApproval */) {
                state.confirm({ type: 4 /* ToolConfirmKind.UserAction */ });
                return true;
            }
        }
        return false;
    }
    _getNotificationBody(sessionResource, info, isQuestionCarousel) {
        if (isQuestionCarousel) {
            return localize(7548, null);
        }
        const terminalCommand = this._getPendingTerminalCommand(sessionResource);
        if (terminalCommand) {
            return this._sanitizeOSToastText(terminalCommand);
        }
        if (info.detail) {
            return this._sanitizeOSToastText(info.detail);
        }
        return localize(7549, null);
    }
    _getPendingTerminalCommand(sessionResource) {
        const model = this._chatService.getSession(sessionResource);
        const lastResponse = model?.lastRequest?.response;
        if (!lastResponse?.response?.value) {
            return undefined;
        }
        for (const part of lastResponse.response.value) {
            if (part.kind === 'toolInvocation' && part.toolSpecificData?.kind === 'terminal') {
                const terminalData = migrateLegacyTerminalToolSpecificData(part.toolSpecificData);
                return terminalData.commandLine.forDisplay ?? terminalData.commandLine.userEdited ?? terminalData.commandLine.toolEdited ?? terminalData.commandLine.original;
            }
        }
        return undefined;
    }
    _isQuestionCarouselPending(sessionResource) {
        const model = this._chatService.getSession(sessionResource);
        const lastResponse = model?.lastRequest?.response;
        if (!lastResponse) {
            return false;
        }
        return lastResponse.response.value.some(part => part.kind === 'questionCarousel' && !part.isUsed);
    }
    _sanitizeOSToastText(text) {
        return text.replace(/`/g, '\''); // convert backticks to single quotes
    }
    _clearNotification(sessionResource) {
        this._activeNotifications.deleteAndDispose(sessionResource);
    }
};
ChatWindowNotifier = __decorate([
    __param(0, IChatService),
    __param(1, IChatWidgetService),
    __param(2, IHostService),
    __param(3, IConfigurationService)
], ChatWindowNotifier);
export { ChatWindowNotifier };
//# sourceMappingURL=chatWindowNotifier.js.map