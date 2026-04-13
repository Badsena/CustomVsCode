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
import { coalesce } from '../../../../../base/common/arrays.js';
import { CancellationToken } from '../../../../../base/common/cancellation.js';
import { Codicon } from '../../../../../base/common/codicons.js';
import { Emitter } from '../../../../../base/common/event.js';
import { Disposable } from '../../../../../base/common/lifecycle.js';
import { ResourceSet } from '../../../../../base/common/map.js';
import { Schemas } from '../../../../../base/common/network.js';
import { isEqual } from '../../../../../base/common/resources.js';
import { ILogService } from '../../../../../platform/log/common/log.js';
import { convertLegacyChatSessionTiming, IChatService } from '../../common/chatService/chatService.js';
import { IChatSessionsService, localChatSessionType } from '../../common/chatSessionsService.js';
import { getChatSessionType } from '../../common/model/chatUri.js';
let LocalAgentsSessionsController = class LocalAgentsSessionsController extends Disposable {
    static { this.ID = 'workbench.contrib.localAgentsSessionsController'; }
    constructor(chatService, chatSessionsService, logService) {
        super();
        this.chatService = chatService;
        this.chatSessionsService = chatSessionsService;
        this.logService = logService;
        this.chatSessionType = localChatSessionType;
        this._onDidChange = this._register(new Emitter());
        this.onDidChange = this._onDidChange.event;
        this._onDidChangeChatSessionItems = this._register(new Emitter());
        this.onDidChangeChatSessionItems = this._onDidChangeChatSessionItems.event;
        this._items = [];
        this._register(this.chatSessionsService.registerChatSessionItemController(this.chatSessionType, this));
        this.registerListeners();
    }
    get items() {
        return this._items;
    }
    async refresh(token) {
        this._items = await this.provideChatSessionItems(token);
    }
    registerListeners() {
        this._register(this.chatService.registerChatModelChangeListeners(Schemas.vscodeLocalChatSession, async (sessionResource) => {
            if (getChatSessionType(sessionResource) !== this.chatSessionType) {
                return;
            }
            // TODO: This gets fired too often
            await this.refresh(CancellationToken.None);
            const item = this.getItem(sessionResource);
            if (item) {
                this._onDidChangeChatSessionItems.fire({ addedOrUpdated: [item] });
            }
        }));
        this._register(this.chatService.onDidDisposeSession(e => {
            const removedSessionResources = e.sessionResource.filter(resource => getChatSessionType(resource) === this.chatSessionType);
            if (removedSessionResources.length) {
                this._onDidChangeChatSessionItems.fire({ removed: removedSessionResources });
            }
        }));
    }
    getItem(sessionResource) {
        return this._items.find(item => isEqual(item.resource, sessionResource));
    }
    async provideChatSessionItems(token) {
        const sessions = [];
        const sessionsByResource = new ResourceSet();
        for (const sessionDetail of await this.chatService.getLiveSessionItems()) {
            const editorSession = this.toChatSessionItem(sessionDetail);
            if (!editorSession) {
                continue;
            }
            sessionsByResource.add(sessionDetail.sessionResource);
            sessions.push(editorSession);
        }
        if (!token.isCancellationRequested) {
            const history = await this.getHistoryItems();
            sessions.push(...history.filter(historyItem => !sessionsByResource.has(historyItem.resource)));
        }
        return sessions;
    }
    async getHistoryItems() {
        try {
            const historyItems = await this.chatService.getHistorySessionItems();
            return coalesce(historyItems.map(history => this.toChatSessionItem(history)));
        }
        catch (error) {
            return [];
        }
    }
    toChatSessionItem(chat) {
        const model = this.chatService.getSession(chat.sessionResource);
        let description;
        if (model) {
            if (!model.hasRequests) {
                return undefined; // ignore sessions without requests
            }
            description = this.chatSessionsService.getInProgressSessionDescription(model);
        }
        return {
            resource: chat.sessionResource,
            label: chat.title,
            description,
            status: model ? this.modelToStatus(model) : this.chatResponseStateToStatus(chat.lastResponseState),
            iconPath: Codicon.chatSparkle,
            timing: convertLegacyChatSessionTiming(chat.timing),
            changes: chat.stats ? {
                insertions: chat.stats.added,
                deletions: chat.stats.removed,
                files: chat.stats.fileCount,
            } : undefined
        };
    }
    modelToStatus(model) {
        if (model.requestInProgress.get()) {
            this.logService.trace(`[agent sessions] Session ${model.sessionResource.toString()} request is in progress.`);
            return 2 /* ChatSessionStatus.InProgress */;
        }
        const lastRequest = model.getRequests().at(-1);
        this.logService.trace(`[agent sessions] Session ${model.sessionResource.toString()} last request response: state ${lastRequest?.response?.state}, isComplete ${lastRequest?.response?.isComplete}, isCanceled ${lastRequest?.response?.isCanceled}, error: ${lastRequest?.response?.result?.errorDetails?.message}.`);
        if (lastRequest?.response) {
            if (lastRequest.response.state === 4 /* ResponseModelState.NeedsInput */) {
                return 3 /* ChatSessionStatus.NeedsInput */;
            }
            else if (lastRequest.response.isCanceled || lastRequest.response.result?.errorDetails?.code === 'canceled') {
                return 1 /* ChatSessionStatus.Completed */;
            }
            else if (lastRequest.response.result?.errorDetails) {
                return 0 /* ChatSessionStatus.Failed */;
            }
            else if (lastRequest.response.isComplete) {
                return 1 /* ChatSessionStatus.Completed */;
            }
            else {
                return 2 /* ChatSessionStatus.InProgress */;
            }
        }
        return undefined;
    }
    chatResponseStateToStatus(state) {
        switch (state) {
            case 2 /* ResponseModelState.Cancelled */:
            case 1 /* ResponseModelState.Complete */:
                return 1 /* ChatSessionStatus.Completed */;
            case 3 /* ResponseModelState.Failed */:
                return 0 /* ChatSessionStatus.Failed */;
            case 0 /* ResponseModelState.Pending */:
                return 2 /* ChatSessionStatus.InProgress */;
            case 4 /* ResponseModelState.NeedsInput */:
                return 3 /* ChatSessionStatus.NeedsInput */;
        }
    }
};
LocalAgentsSessionsController = __decorate([
    __param(0, IChatService),
    __param(1, IChatSessionsService),
    __param(2, ILogService)
], LocalAgentsSessionsController);
export { LocalAgentsSessionsController };
//# sourceMappingURL=localAgentSessionsController.js.map