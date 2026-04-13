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
import { CancellationTokenSource } from '../../../../../../base/common/cancellation.js';
import { Emitter } from '../../../../../../base/common/event.js';
import { Disposable } from '../../../../../../base/common/lifecycle.js';
import { URI } from '../../../../../../base/common/uri.js';
import { IProductService } from '../../../../../../platform/product/common/productService.js';
import { AgentSession } from '../../../../../../platform/agentHost/common/agentService.js';
import { isSessionAction } from '../../../../../../platform/agentHost/common/state/sessionActions.js';
import { getAgentHostIcon } from '../agentSessions.js';
/**
 * Provides session list items for the chat sessions sidebar by querying
 * active sessions from an agent host connection. Listens to protocol
 * notifications for incremental updates.
 *
 * Works with both local and remote agent host connections via the
 * {@link IAgentConnection} interface.
 */
let AgentHostSessionListController = class AgentHostSessionListController extends Disposable {
    constructor(_sessionType, _provider, _connection, _description, _productService) {
        super();
        this._sessionType = _sessionType;
        this._provider = _provider;
        this._connection = _connection;
        this._description = _description;
        this._productService = _productService;
        this._onDidChangeChatSessionItems = this._register(new Emitter());
        this.onDidChangeChatSessionItems = this._onDidChangeChatSessionItems.event;
        this._items = [];
        // React to protocol notifications for session list changes
        this._register(this._connection.onDidNotification(n => {
            if (n.type === 'notify/sessionAdded' && n.summary.provider === this._provider) {
                const rawId = AgentSession.id(n.summary.resource);
                const item = {
                    resource: URI.from({ scheme: this._sessionType, path: `/${rawId}` }),
                    label: n.summary.title ?? `Session ${rawId.substring(0, 8)}`,
                    description: this._description,
                    iconPath: getAgentHostIcon(this._productService),
                    status: 1 /* ChatSessionStatus.Completed */,
                    timing: {
                        created: n.summary.createdAt,
                        lastRequestStarted: n.summary.modifiedAt,
                        lastRequestEnded: n.summary.modifiedAt,
                    },
                };
                this._items.push(item);
                this._onDidChangeChatSessionItems.fire({ addedOrUpdated: [item] });
            }
            else if (n.type === 'notify/sessionRemoved') {
                const removedId = AgentSession.id(n.session);
                const idx = this._items.findIndex(item => item.resource.path === `/${removedId}`);
                if (idx >= 0) {
                    const [removed] = this._items.splice(idx, 1);
                    this._onDidChangeChatSessionItems.fire({ removed: [removed.resource] });
                }
            }
        }));
        // Refresh on turnComplete actions for metadata updates (title, timing)
        this._register(this._connection.onDidAction(e => {
            if (e.action.type === 'session/turnComplete' && isSessionAction(e.action) && AgentSession.provider(e.action.session) === this._provider) {
                const cts = new CancellationTokenSource();
                this.refresh(cts.token).finally(() => cts.dispose());
            }
        }));
    }
    get items() {
        return this._items;
    }
    async refresh(_token) {
        try {
            const sessions = await this._connection.listSessions();
            const filtered = sessions.filter(s => AgentSession.provider(s.session) === this._provider);
            const rawId = (s) => AgentSession.id(s.session);
            this._items = filtered.map(s => ({
                resource: URI.from({ scheme: this._sessionType, path: `/${rawId(s)}` }),
                label: s.summary ?? `Session ${rawId(s).substring(0, 8)}`,
                description: this._description,
                iconPath: getAgentHostIcon(this._productService),
                status: 1 /* ChatSessionStatus.Completed */,
                timing: {
                    created: s.startTime,
                    lastRequestStarted: s.modifiedTime,
                    lastRequestEnded: s.modifiedTime,
                },
            }));
        }
        catch {
            this._items = [];
        }
        this._onDidChangeChatSessionItems.fire({ addedOrUpdated: this._items });
    }
};
AgentHostSessionListController = __decorate([
    __param(4, IProductService)
], AgentHostSessionListController);
export { AgentHostSessionListController };
//# sourceMappingURL=agentHostSessionListController.js.map