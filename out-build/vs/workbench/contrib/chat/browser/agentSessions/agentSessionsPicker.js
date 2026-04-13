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
import { renderAsPlaintext } from '../../../../../base/browser/markdownRenderer.js';
import { Codicon } from '../../../../../base/common/codicons.js';
import { DisposableStore } from '../../../../../base/common/lifecycle.js';
import { ThemeIcon } from '../../../../../base/common/themables.js';
import { localize } from '../../../../../nls.js';
import { ICommandService } from '../../../../../platform/commands/common/commands.js';
import { IInstantiationService } from '../../../../../platform/instantiation/common/instantiation.js';
import { IQuickInputService } from '../../../../../platform/quickinput/common/quickInput.js';
import { openSession } from './agentSessionsOpener.js';
import { isLocalAgentSessionItem } from './agentSessionsModel.js';
import { IAgentSessionsService } from './agentSessionsService.js';
import { AgentSessionsSorter, groupAgentSessionsByDate, sessionDateFromNow } from './agentSessionsViewer.js';
import { AGENT_SESSION_DELETE_ACTION_ID, AGENT_SESSION_RENAME_ACTION_ID } from './agentSessions.js';
import { AgentSessionsFilter } from './agentSessionsFilter.js';
export const archiveButton = {
    iconClass: ThemeIcon.asClassName(Codicon.archive),
    tooltip: localize(6244, null)
};
export const unarchiveButton = {
    iconClass: ThemeIcon.asClassName(Codicon.inbox),
    tooltip: localize(6245, null)
};
export const renameButton = {
    iconClass: ThemeIcon.asClassName(Codicon.edit),
    tooltip: localize(6246, null)
};
export const deleteButton = {
    iconClass: ThemeIcon.asClassName(Codicon.trash),
    tooltip: localize(6247, null)
};
export function getSessionDescription(session) {
    const descriptionText = typeof session.description === 'string' ? session.description : session.description ? renderAsPlaintext(session.description) : undefined;
    const timeAgo = sessionDateFromNow(session.timing.created);
    const descriptionParts = [descriptionText, session.providerLabel, timeAgo].filter(part => !!part);
    return descriptionParts.join(' • ');
}
export function getSessionButtons(session) {
    const buttons = [];
    if (isLocalAgentSessionItem(session)) {
        buttons.push(renameButton);
        buttons.push(deleteButton);
    }
    buttons.push(session.isArchived() ? unarchiveButton : archiveButton);
    return buttons;
}
let AgentSessionsPicker = class AgentSessionsPicker {
    constructor(anchor, options, agentSessionsService, quickInputService, instantiationService, commandService) {
        this.anchor = anchor;
        this.options = options;
        this.agentSessionsService = agentSessionsService;
        this.quickInputService = quickInputService;
        this.instantiationService = instantiationService;
        this.commandService = commandService;
        this.sorter = new AgentSessionsSorter();
    }
    async pickAgentSession() {
        const disposables = new DisposableStore();
        const picker = disposables.add(this.quickInputService.createQuickPick({ useSeparators: true }));
        const filter = disposables.add(this.instantiationService.createInstance(AgentSessionsFilter, {}));
        picker.anchor = this.anchor;
        picker.items = this.createPickerItems(filter);
        picker.canAcceptInBackground = true;
        picker.placeholder = localize(6248, null);
        disposables.add(picker.onDidAccept(e => {
            const pick = picker.selectedItems[0];
            if (pick) {
                const openOptions = {
                    sideBySide: e.inBackground,
                    editorOptions: {
                        preserveFocus: e.inBackground,
                        pinned: e.inBackground
                    }
                };
                if (this.options?.overrideSessionOpen) {
                    this.options.overrideSessionOpen(pick.session, openOptions);
                }
                else {
                    this.instantiationService.invokeFunction(openSession, pick.session, openOptions);
                }
            }
            if (!e.inBackground) {
                picker.hide();
            }
        }));
        disposables.add(picker.onDidTriggerItemButton(async (e) => {
            const session = e.item.session;
            let reopenResolved = false;
            if (e.button === renameButton) {
                reopenResolved = true;
                await this.commandService.executeCommand(AGENT_SESSION_RENAME_ACTION_ID, session);
            }
            else if (e.button === deleteButton) {
                reopenResolved = true;
                await this.commandService.executeCommand(AGENT_SESSION_DELETE_ACTION_ID, session);
            }
            else {
                const newArchivedState = !session.isArchived();
                session.setArchived(newArchivedState);
            }
            if (reopenResolved) {
                await this.agentSessionsService.model.resolve(session.providerType);
                this.pickAgentSession();
            }
            else {
                picker.items = this.createPickerItems(filter);
            }
        }));
        disposables.add(picker.onDidHide(() => disposables.dispose()));
        picker.show();
    }
    createPickerItems(filter) {
        const sessions = this.agentSessionsService.model.sessions
            .filter(session => !filter.exclude(session))
            .sort(this.sorter.compare.bind(this.sorter));
        const items = [];
        const groupedSessions = groupAgentSessionsByDate(sessions);
        for (const group of groupedSessions.values()) {
            if (group.sessions.length > 0) {
                items.push({ type: 'separator', label: group.label });
                items.push(...group.sessions.map(session => this.toPickItem(session)));
            }
        }
        return items;
    }
    toPickItem(session) {
        const description = getSessionDescription(session);
        const buttons = getSessionButtons(session);
        return {
            id: session.resource.toString(),
            label: session.label,
            tooltip: session.tooltip,
            description,
            iconClass: ThemeIcon.asClassName(session.icon),
            buttons,
            session
        };
    }
};
AgentSessionsPicker = __decorate([
    __param(2, IAgentSessionsService),
    __param(3, IQuickInputService),
    __param(4, IInstantiationService),
    __param(5, ICommandService)
], AgentSessionsPicker);
export { AgentSessionsPicker };
//# sourceMappingURL=agentSessionsPicker.js.map