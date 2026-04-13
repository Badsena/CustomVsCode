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
import { renderLabelWithIcons } from '../../../../../../base/browser/ui/iconLabel/iconLabels.js';
import { URI } from '../../../../../../base/common/uri.js';
import { localize } from '../../../../../../nls.js';
import { IActionWidgetService } from '../../../../../../platform/actionWidget/browser/actionWidget.js';
import { ICommandService } from '../../../../../../platform/commands/common/commands.js';
import { IContextKeyService } from '../../../../../../platform/contextkey/common/contextkey.js';
import { IKeybindingService } from '../../../../../../platform/keybinding/common/keybinding.js';
import { IOpenerService } from '../../../../../../platform/opener/common/opener.js';
import { ITelemetryService } from '../../../../../../platform/telemetry/common/telemetry.js';
import { IChatSessionsService } from '../../../common/chatSessionsService.js';
import { AgentSessionProviders, getAgentSessionProvider, getAgentSessionProviderDescription, getAgentSessionProviderIcon, getAgentSessionProviderName, isFirstPartyAgentSessionProvider } from '../../agentSessions/agentSessions.js';
import { ChatInputPickerActionViewItem } from './chatInputPickerActionItem.js';
const firstPartyCategory = { label: localize(8312, null), order: 1 };
const otherCategory = { label: localize(8313, null), order: 2 };
/**
 * Action view item for selecting a session target in the chat interface.
 * This picker allows switching between different chat session types for new/empty sessions.
 */
let SessionTypePickerActionItem = class SessionTypePickerActionItem extends ChatInputPickerActionViewItem {
    constructor(action, chatSessionPosition, delegate, pickerOptions, actionWidgetService, keybindingService, contextKeyService, chatSessionsService, commandService, openerService, telemetryService) {
        const actionProvider = {
            getActions: () => {
                const currentType = this._getSelectedSessionType();
                const actions = [...this._getAdditionalActions().map(a => ({ ...action, ...a }))];
                for (const sessionTypeItem of this._sessionTypeItems) {
                    if (!this._isVisible(sessionTypeItem.type)) {
                        continue;
                    }
                    actions.push({
                        ...action,
                        id: sessionTypeItem.commandId,
                        label: sessionTypeItem.label,
                        checked: currentType === sessionTypeItem.type,
                        icon: getAgentSessionProviderIcon(sessionTypeItem.type),
                        enabled: this._isSessionTypeEnabled(sessionTypeItem.type),
                        category: this._getSessionCategory(sessionTypeItem),
                        description: this._getSessionDescription(sessionTypeItem),
                        tooltip: '',
                        hover: { content: sessionTypeItem.hoverDescription, position: this.pickerOptions.hoverPosition },
                        run: async () => {
                            this._run(sessionTypeItem);
                        },
                    });
                }
                return actions;
            }
        };
        const actionBarActionProvider = {
            getActions: () => {
                return [this._getLearnMore()];
            }
        };
        const sessionTargetPickerOptions = {
            actionProvider,
            actionBarActionProvider,
            showItemKeybindings: true,
            reporter: { id: 'ChatSessionTypePicker', name: `ChatSessionTypePicker`, includeOptions: true },
        };
        super(action, sessionTargetPickerOptions, pickerOptions, actionWidgetService, keybindingService, contextKeyService, telemetryService);
        this.chatSessionPosition = chatSessionPosition;
        this.delegate = delegate;
        this.keybindingService = keybindingService;
        this.chatSessionsService = chatSessionsService;
        this.commandService = commandService;
        this.openerService = openerService;
        this._sessionTypeItems = [];
        this._register(this.chatSessionsService.onDidChangeAvailability(() => {
            this._updateAgentSessionItems();
        }));
        this._updateAgentSessionItems();
    }
    _run(sessionTypeItem) {
        if (this.delegate.setActiveSessionProvider) {
            // Use provided setter (for welcome view)
            this.delegate.setActiveSessionProvider(sessionTypeItem.type);
        }
        else {
            // Execute command to create new session
            this.commandService.executeCommand(sessionTypeItem.commandId, this.chatSessionPosition);
        }
        if (this.element) {
            this.renderLabel(this.element);
        }
    }
    _getSelectedSessionType() {
        return this.delegate.getActiveSessionProvider();
    }
    _getAdditionalActions() {
        return [];
    }
    _getLearnMore() {
        const learnMoreUrl = 'https://code.visualstudio.com/docs/copilot/agents/overview';
        return {
            id: 'workbench.action.chat.agentOverview.learnMore',
            label: localize(8314, null),
            tooltip: learnMoreUrl,
            class: undefined,
            enabled: true,
            run: async () => {
                await this.openerService.open(URI.parse(learnMoreUrl));
            }
        };
    }
    _updateAgentSessionItems() {
        const localSessionItem = {
            type: AgentSessionProviders.Local,
            label: getAgentSessionProviderName(AgentSessionProviders.Local),
            hoverDescription: getAgentSessionProviderDescription(AgentSessionProviders.Local),
            commandId: `workbench.action.chat.openNewChatSessionInPlace.${AgentSessionProviders.Local}`,
        };
        const agentSessionItems = [localSessionItem];
        const contributions = this.chatSessionsService.getAllChatSessionContributions();
        for (const contribution of contributions) {
            const agentSessionType = getAgentSessionProvider(contribution.type);
            if (!agentSessionType) {
                continue;
            }
            agentSessionItems.push({
                type: agentSessionType,
                label: getAgentSessionProviderName(agentSessionType),
                hoverDescription: getAgentSessionProviderDescription(agentSessionType),
                commandId: contribution.canDelegate ?
                    `workbench.action.chat.openNewChatSessionInPlace.${contribution.type}` :
                    `workbench.action.chat.openNewChatSessionExternal.${contribution.type}`,
            });
        }
        this._sessionTypeItems = agentSessionItems;
    }
    _isVisible(type) {
        return true;
    }
    _isSessionTypeEnabled(type) {
        if (type === AgentSessionProviders.Local) {
            return true; // Local is always available
        }
        // Disable non-local session types when their provider is not registered yet
        return !!this.chatSessionsService.getChatSessionContribution(type);
    }
    _getSessionCategory(sessionTypeItem) {
        return isFirstPartyAgentSessionProvider(sessionTypeItem.type) ? firstPartyCategory : otherCategory;
    }
    _getSessionDescription(sessionTypeItem) {
        return undefined;
    }
    render(container) {
        super.render(container);
        container.classList.add('chat-session-target-picker-item');
    }
    renderLabel(element) {
        this.setAriaLabelAttributes(element);
        const currentType = this._getSelectedSessionType();
        const label = getAgentSessionProviderName(currentType ?? AgentSessionProviders.Local);
        const icon = getAgentSessionProviderIcon(currentType ?? AgentSessionProviders.Local);
        const labelElements = [];
        labelElements.push(...renderLabelWithIcons(`$(${icon.id})`));
        labelElements.push(dom.$('span.chat-input-picker-label', undefined, label));
        labelElements.push(...renderLabelWithIcons(`$(chevron-down)`));
        dom.reset(element, ...labelElements);
        return null;
    }
};
SessionTypePickerActionItem = __decorate([
    __param(4, IActionWidgetService),
    __param(5, IKeybindingService),
    __param(6, IContextKeyService),
    __param(7, IChatSessionsService),
    __param(8, ICommandService),
    __param(9, IOpenerService),
    __param(10, ITelemetryService)
], SessionTypePickerActionItem);
export { SessionTypePickerActionItem };
//# sourceMappingURL=sessionTargetPickerActionItem.js.map