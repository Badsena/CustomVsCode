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
import * as dom from '../../../../../../base/browser/dom.js';
import { Button } from '../../../../../../base/browser/ui/button/button.js';
import { Disposable } from '../../../../../../base/common/lifecycle.js';
import { localize } from '../../../../../../nls.js';
import { ICommandService } from '../../../../../../platform/commands/common/commands.js';
import { IConfigurationService } from '../../../../../../platform/configuration/common/configuration.js';
import { ContextKeyExpr } from '../../../../../../platform/contextkey/common/contextkey.js';
import { ITelemetryService } from '../../../../../../platform/telemetry/common/telemetry.js';
import { defaultButtonStyles } from '../../../../../../platform/theme/browser/defaultStyles.js';
import { ChatEntitlement, ChatEntitlementContextKeys, IChatEntitlementService } from '../../../../../services/chat/common/chatEntitlementService.js';
import { ChatContextKeys } from '../../../common/actions/chatContextKeys.js';
import { CHAT_SETUP_ACTION_ID } from '../../actions/chatActions.js';
import { ChatInputPartWidgetsRegistry } from './chatInputPartWidgets.js';
import './media/chatStatusWidget.css';
const $ = dom.$;
/**
 * Widget that displays a status message with an optional action button.
 * Only shown for free tier users when the setting is enabled (experiment controlled via onExP tag).
 */
let ChatStatusWidget = class ChatStatusWidget extends Disposable {
    static { this.ID = 'chatStatusWidget'; }
    constructor(chatEntitlementService, commandService, configurationService, telemetryService) {
        super();
        this.chatEntitlementService = chatEntitlementService;
        this.commandService = commandService;
        this.configurationService = configurationService;
        this.telemetryService = telemetryService;
        this.domNode = $('.chat-status-widget');
        this.domNode.style.display = 'none';
        this.initializeIfEnabled();
    }
    initializeIfEnabled() {
        const entitlement = this.chatEntitlementService.entitlement;
        const isAnonymous = this.chatEntitlementService.anonymous;
        if (isAnonymous && this.configurationService.getValue('chat.statusWidget.anonymous')) {
            this.createWidgetContent('anonymous');
        }
        else if (entitlement === ChatEntitlement.Free) {
            this.createWidgetContent('free');
        }
        else {
            return;
        }
        this.domNode.style.display = '';
    }
    get height() {
        return this.domNode.style.display === 'none' ? 0 : this.domNode.offsetHeight;
    }
    createWidgetContent(enabledSku) {
        const contentContainer = $('.chat-status-content');
        this.messageElement = $('.chat-status-message');
        contentContainer.appendChild(this.messageElement);
        const actionContainer = $('.chat-status-action');
        this.actionButton = this._register(new Button(actionContainer, {
            ...defaultButtonStyles,
            supportIcons: true
        }));
        this.actionButton.element.classList.add('chat-status-button');
        if (enabledSku === 'anonymous') {
            const message = localize(8236, null);
            const buttonLabel = localize(8237, null);
            this.messageElement.textContent = message;
            this.actionButton.label = buttonLabel;
            this.actionButton.element.ariaLabel = localize(8238, null, message, buttonLabel);
        }
        else {
            const message = localize(8239, null);
            const buttonLabel = localize(8240, null);
            this.messageElement.textContent = message;
            this.actionButton.label = buttonLabel;
            this.actionButton.element.ariaLabel = localize(8241, null, message, buttonLabel);
        }
        this._register(this.actionButton.onDidClick(async () => {
            const commandId = this.chatEntitlementService.anonymous
                ? CHAT_SETUP_ACTION_ID
                : 'workbench.action.chat.upgradePlan';
            this.telemetryService.publicLog2('workbenchActionExecuted', {
                id: commandId,
                from: 'chatStatusWidget'
            });
            await this.commandService.executeCommand(commandId);
        }));
        this.domNode.appendChild(contentContainer);
        this.domNode.appendChild(actionContainer);
    }
};
ChatStatusWidget = __decorate([
    __param(0, IChatEntitlementService),
    __param(1, ICommandService),
    __param(2, IConfigurationService),
    __param(3, ITelemetryService)
], ChatStatusWidget);
export { ChatStatusWidget };
ChatInputPartWidgetsRegistry.register(ChatStatusWidget.ID, ChatStatusWidget, ContextKeyExpr.and(ChatContextKeys.chatQuotaExceeded, ChatContextKeys.chatSessionIsEmpty, ContextKeyExpr.or(ChatContextKeys.Entitlement.planFree, ChatEntitlementContextKeys.chatAnonymous)));
//# sourceMappingURL=chatStatusWidget.js.map