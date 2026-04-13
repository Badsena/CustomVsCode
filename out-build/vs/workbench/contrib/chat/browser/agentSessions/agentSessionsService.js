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
import { Emitter } from '../../../../../base/common/event.js';
import { Disposable } from '../../../../../base/common/lifecycle.js';
import { createDecorator, IInstantiationService } from '../../../../../platform/instantiation/common/instantiation.js';
import { IChatService } from '../../common/chatService/chatService.js';
import { AgentSessionsModel } from './agentSessionsModel.js';
let AgentSessionsService = class AgentSessionsService extends Disposable {
    get model() {
        if (!this._model) {
            this._model = this._register(this.instantiationService.createInstance(AgentSessionsModel));
            this._register(this._model.onDidChangeSessionArchivedState(session => {
                if (session.isArchived()) {
                    void this.chatService.cancelCurrentRequestForSession(session.resource, 'archive');
                }
                this._onDidChangeSessionArchivedState.fire(session);
            }));
            this._model.resolve(undefined /* all providers */);
        }
        return this._model;
    }
    constructor(instantiationService, chatService) {
        super();
        this.instantiationService = instantiationService;
        this.chatService = chatService;
        this._onDidChangeSessionArchivedState = this._register(new Emitter());
        this.onDidChangeSessionArchivedState = this._onDidChangeSessionArchivedState.event;
    }
    getSession(resource) {
        return this.model.getSession(resource);
    }
};
AgentSessionsService = __decorate([
    __param(0, IInstantiationService),
    __param(1, IChatService)
], AgentSessionsService);
export { AgentSessionsService };
export const IAgentSessionsService = createDecorator('agentSessions');
//# sourceMappingURL=agentSessionsService.js.map