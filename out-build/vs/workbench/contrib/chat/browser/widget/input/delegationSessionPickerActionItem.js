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
import { Codicon } from '../../../../../../base/common/codicons.js';
import { Iterable } from '../../../../../../base/common/iterator.js';
import { URI } from '../../../../../../base/common/uri.js';
import { localize } from '../../../../../../nls.js';
import { IActionWidgetService } from '../../../../../../platform/actionWidget/browser/actionWidget.js';
import { ICommandService } from '../../../../../../platform/commands/common/commands.js';
import { IContextKeyService } from '../../../../../../platform/contextkey/common/contextkey.js';
import { IKeybindingService } from '../../../../../../platform/keybinding/common/keybinding.js';
import { IOpenerService } from '../../../../../../platform/opener/common/opener.js';
import { ITelemetryService } from '../../../../../../platform/telemetry/common/telemetry.js';
import { IsSessionsWindowContext } from '../../../../../common/contextkeys.js';
import { IChatSessionsService } from '../../../common/chatSessionsService.js';
import { ACTION_ID_NEW_CHAT } from '../../actions/chatActions.js';
import { AgentSessionProviders, getAgentCanContinueIn, getAgentSessionProvider, isFirstPartyAgentSessionProvider } from '../../agentSessions/agentSessions.js';
import { SessionTypePickerActionItem } from './sessionTargetPickerActionItem.js';
import { IGitService } from '../../../../git/common/gitService.js';
/**
 * Action view item for delegating to a remote session (Background or Cloud).
 * This picker allows switching to remote execution providers when the session is not empty.
 */
let DelegationSessionPickerActionItem = class DelegationSessionPickerActionItem extends SessionTypePickerActionItem {
    constructor(action, chatSessionPosition, delegate, pickerOptions, actionWidgetService, keybindingService, contextKeyService, chatSessionsService, commandService, openerService, telemetryService, gitService) {
        super(action, chatSessionPosition, delegate, pickerOptions, actionWidgetService, keybindingService, contextKeyService, chatSessionsService, commandService, openerService, telemetryService);
        this.gitService = gitService;
        this._isSessionsWindow = IsSessionsWindowContext.getValue(contextKeyService) === true;
    }
    _run(sessionTypeItem) {
        if (this.delegate.setPendingDelegationTarget) {
            this.delegate.setPendingDelegationTarget(sessionTypeItem.type);
        }
        if (this.element) {
            this.renderLabel(this.element);
        }
    }
    _getSelectedSessionType() {
        const delegationTarget = this.delegate.getPendingDelegationTarget ? this.delegate.getPendingDelegationTarget() : undefined;
        if (delegationTarget) {
            return delegationTarget;
        }
        return this.delegate.getActiveSessionProvider();
    }
    _isSessionTypeEnabled(type) {
        const allContributions = this.chatSessionsService.getAllChatSessionContributions();
        const contribution = allContributions.find(contribution => getAgentSessionProvider(contribution.type) === type);
        // In core VS Code, only allow delegation from local sessions.
        // In the sessions window, only allow delegation from background sessions (not cloud).
        const activeProvider = this.delegate.getActiveSessionProvider();
        if (!this._isSessionsWindow && activeProvider !== AgentSessionProviders.Local) {
            return false;
        }
        if (this._isSessionsWindow && activeProvider !== AgentSessionProviders.Background) {
            return false;
        }
        // In the sessions window, cloud delegation requires a git repository
        if (this._isSessionsWindow && type === AgentSessionProviders.Cloud && !this._hasGitRepository()) {
            return false;
        }
        if (contribution && !contribution.canDelegate && activeProvider !== type /* Allow switching back to active type */) {
            return false;
        }
        return this._getSelectedSessionType() !== type; // Always allow switching back to active session
    }
    _hasGitRepository() {
        return !Iterable.isEmpty(this.gitService.repositories);
    }
    _isVisible(type) {
        // In the sessions window, only show Background and Cloud targets
        if (this._isSessionsWindow && type === AgentSessionProviders.Local) {
            return false;
        }
        if (this.delegate.getActiveSessionProvider() === type) {
            return true; // Always show active session type
        }
        return getAgentCanContinueIn(type);
    }
    _getSessionCategory(sessionTypeItem) {
        if (isFirstPartyAgentSessionProvider(sessionTypeItem.type)) {
            return { label: localize(8242, null), order: 1, showHeader: true };
        }
        return { label: localize(8243, null), order: 2, showHeader: false };
    }
    _getSessionDescription(sessionTypeItem) {
        if (this._isSessionsWindow && sessionTypeItem.type === AgentSessionProviders.Cloud && !this._hasGitRepository()) {
            return localize(8244, null);
        }
        return undefined;
    }
    _getLearnMore() {
        const learnMoreUrl = 'https://aka.ms/vscode-continue-chat-in';
        return {
            id: 'workbench.action.chat.agentOverview.learnMoreHandOff',
            label: localize(8245, null),
            tooltip: learnMoreUrl,
            class: undefined,
            enabled: true,
            run: async () => {
                await this.openerService.open(URI.parse(learnMoreUrl));
            }
        };
    }
    _getAdditionalActions() {
        if (this._isSessionsWindow) {
            return [];
        }
        return [{
                id: 'newChatSession',
                class: undefined,
                label: localize(8246, null),
                tooltip: '',
                hover: { content: '', position: this.pickerOptions.hoverPosition },
                checked: false,
                icon: Codicon.plus,
                enabled: true,
                category: { label: localize(8247, null), order: 0, showHeader: false },
                description: this.keybindingService.lookupKeybinding(ACTION_ID_NEW_CHAT)?.getLabel() || undefined,
                run: async () => {
                    this.commandService.executeCommand(ACTION_ID_NEW_CHAT, this.chatSessionPosition);
                },
            }];
    }
};
DelegationSessionPickerActionItem = __decorate([
    __param(4, IActionWidgetService),
    __param(5, IKeybindingService),
    __param(6, IContextKeyService),
    __param(7, IChatSessionsService),
    __param(8, ICommandService),
    __param(9, IOpenerService),
    __param(10, ITelemetryService),
    __param(11, IGitService)
], DelegationSessionPickerActionItem);
export { DelegationSessionPickerActionItem };
//# sourceMappingURL=delegationSessionPickerActionItem.js.map