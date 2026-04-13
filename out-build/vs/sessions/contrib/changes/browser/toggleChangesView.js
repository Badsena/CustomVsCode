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
import { autorun, derived, derivedOpts, observableSignalFromEvent } from '../../../../base/common/observable.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { ResourceMap } from '../../../../base/common/map.js';
import { isEqual } from '../../../../base/common/resources.js';
import { IAgentSessionsService } from '../../../../workbench/contrib/chat/browser/agentSessions/agentSessionsService.js';
import { IChatService } from '../../../../workbench/contrib/chat/common/chatService/chatService.js';
import { IWorkbenchLayoutService } from '../../../../workbench/services/layout/browser/layoutService.js';
import { ISessionsManagementService } from '../../sessions/browser/sessionsManagementService.js';
import { IViewsService } from '../../../../workbench/services/views/common/viewsService.js';
import { CHANGES_VIEW_ID } from './changesView.js';
let ToggleChangesViewContribution = class ToggleChangesViewContribution extends Disposable {
    static { this.ID = 'workbench.contrib.toggleChangesView'; }
    constructor(layoutService, sessionManagementService, agentSessionsService, chatService, viewsService) {
        super();
        this.layoutService = layoutService;
        this.sessionManagementService = sessionManagementService;
        this.agentSessionsService = agentSessionsService;
        this.chatService = chatService;
        this.viewsService = viewsService;
        this.pendingTurnStateByResource = new ResourceMap();
        const activeSessionChangedSignal = observableSignalFromEvent(this, this.agentSessionsService.model.onDidChangeSessions);
        const activeSessionResourceObs = derivedOpts({ equalsFn: isEqual, }, reader => {
            const activeSession = this.sessionManagementService.activeSession.read(reader);
            return activeSession?.resource;
        });
        const activeSessionHasChangesObs = derived(reader => {
            const sessionResource = activeSessionResourceObs.read(reader);
            if (!sessionResource) {
                return false;
            }
            activeSessionChangedSignal.read(reader);
            const model = this.agentSessionsService.getSession(sessionResource);
            const changes = model?.changes instanceof Array ? model.changes : [];
            return changes.length > 0;
        });
        // Switch between sessions
        this._register(autorun(reader => {
            const activeSessionHasChanges = activeSessionHasChangesObs.read(reader);
            this.syncAuxiliaryBarVisibility(activeSessionHasChanges);
        }));
        // When a turn is completed, check if there were changes before the turn and
        // if there are changes after the turn. If there were no changes before the
        // turn and there are changes after the turn, show the auxiliary bar.
        this._register(autorun((reader) => {
            const activeSessionResource = activeSessionResourceObs.read(reader);
            const activeSessionHasChanges = activeSessionHasChangesObs.read(reader);
            if (!activeSessionResource) {
                return;
            }
            const pendingTurnState = this.pendingTurnStateByResource.get(activeSessionResource);
            if (!pendingTurnState) {
                return;
            }
            const activeSession = this.agentSessionsService.getSession(activeSessionResource);
            const turnCompleted = !!activeSession?.timing.lastRequestEnded && activeSession.timing.lastRequestEnded >= pendingTurnState.submittedAt;
            if (!turnCompleted) {
                return;
            }
            if (!pendingTurnState.hadChangesBeforeSend && activeSessionHasChanges) {
                this.layoutService.setPartHidden(false, "workbench.parts.auxiliarybar" /* Parts.AUXILIARYBAR_PART */);
            }
            this.pendingTurnStateByResource.delete(activeSessionResource);
        }));
        this._register(this.chatService.onDidSubmitRequest(({ chatSessionResource }) => {
            this.pendingTurnStateByResource.set(chatSessionResource, {
                hadChangesBeforeSend: activeSessionHasChangesObs.get(),
                submittedAt: Date.now(),
            });
        }));
    }
    syncAuxiliaryBarVisibility(hasChanges) {
        if (hasChanges) {
            this.viewsService.openView(CHANGES_VIEW_ID, false);
        }
        else {
            this.layoutService.setPartHidden(true, "workbench.parts.auxiliarybar" /* Parts.AUXILIARYBAR_PART */);
        }
    }
};
ToggleChangesViewContribution = __decorate([
    __param(0, IWorkbenchLayoutService),
    __param(1, ISessionsManagementService),
    __param(2, IAgentSessionsService),
    __param(3, IChatService),
    __param(4, IViewsService)
], ToggleChangesViewContribution);
export { ToggleChangesViewContribution };
//# sourceMappingURL=toggleChangesView.js.map