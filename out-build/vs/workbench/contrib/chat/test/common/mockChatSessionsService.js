/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { CancellationToken } from '../../../../../base/common/cancellation.js';
import { AsyncEmitter, Emitter } from '../../../../../base/common/event.js';
import { ResourceMap } from '../../../../../base/common/map.js';
import { ThemeIcon } from '../../../../../base/common/themables.js';
import { Target } from '../../common/promptSyntax/promptTypes.js';
export class MockChatSessionsService {
    constructor() {
        this._onDidChangeSessionOptions = new Emitter();
        this.onDidChangeSessionOptions = this._onDidChangeSessionOptions.event;
        this._onDidChangeItemsProviders = new Emitter();
        this.onDidChangeItemsProviders = this._onDidChangeItemsProviders.event;
        this._onDidChangeSessionItems = new Emitter();
        this.onDidChangeSessionItems = this._onDidChangeSessionItems.event;
        this._onDidChangeAvailability = new Emitter();
        this.onDidChangeAvailability = this._onDidChangeAvailability.event;
        this._onDidChangeInProgress = new Emitter();
        this.onDidChangeInProgress = this._onDidChangeInProgress.event;
        this._onDidChangeContentProviderSchemes = new Emitter();
        this.onDidChangeContentProviderSchemes = this._onDidChangeContentProviderSchemes.event;
        this._onDidChangeOptionGroups = new Emitter();
        this.onDidChangeOptionGroups = this._onDidChangeOptionGroups.event;
        this._onRequestNotifyExtension = new AsyncEmitter();
        this.onRequestNotifyExtension = this._onRequestNotifyExtension.event;
        this.sessionItemControllers = new Map();
        this.contentProviders = new Map();
        this.contributions = [];
        this.optionGroups = new Map();
        this.sessionOptions = new ResourceMap();
        this.inProgress = new Map();
    }
    // For testing: allow triggering events
    fireDidChangeItemsProviders(event) {
        this._onDidChangeItemsProviders.fire(event);
    }
    fireDidChangeSessionItems(event) {
        this._onDidChangeSessionItems.fire(event);
    }
    fireDidChangeAvailability() {
        this._onDidChangeAvailability.fire();
    }
    fireDidChangeInProgress() {
        this._onDidChangeInProgress.fire();
    }
    registerChatSessionItemController(chatSessionType, controller) {
        this.sessionItemControllers.set(chatSessionType, { controller, initialRefresh: controller.refresh(CancellationToken.None) });
        return {
            dispose: () => {
                this.sessionItemControllers.delete(chatSessionType);
            }
        };
    }
    getRegisteredChatSessionItemProviders() {
        return Array.from(this.sessionItemControllers.keys());
    }
    getAllChatSessionContributions() {
        return this.contributions.map(contribution => this.resolveContribution(contribution));
    }
    getChatSessionContribution(chatSessionType) {
        const contribution = this.contributions.find(c => c.type === chatSessionType);
        if (!contribution) {
            return undefined;
        }
        return this.resolveContribution(contribution);
    }
    resolveContribution(contribution) {
        return {
            ...contribution,
            icon: contribution.icon && typeof contribution.icon === 'string' ? ThemeIcon.fromId(contribution.icon) : undefined,
        };
    }
    setContributions(contributions) {
        this.contributions = contributions;
    }
    async activateChatSessionItemProvider(chatSessionType) {
        // Noop, nothing to activate
    }
    async *getChatSessionItems(providerTypeFilter, token) {
        for (const [chatSessionType, controllerEntry] of this.sessionItemControllers.entries()) {
            if (!providerTypeFilter || providerTypeFilter.includes(chatSessionType)) {
                await controllerEntry.initialRefresh; // ensure initial refresh is done
                yield {
                    chatSessionType: chatSessionType,
                    items: controllerEntry.controller.items
                };
            }
        }
    }
    async refreshChatSessionItems(providerTypeFilter, token) {
        await Promise.all(Array.from(this.sessionItemControllers.entries())
            .filter(([chatSessionType]) => !providerTypeFilter || providerTypeFilter.includes(chatSessionType))
            .map(async ([_chatSessionType, controllerEntry]) => {
            await controllerEntry.controller.refresh(token);
        }));
    }
    reportInProgress(chatSessionType, count) {
        this.inProgress.set(chatSessionType, count);
        this._onDidChangeInProgress.fire();
    }
    getInProgress() {
        return Array.from(this.inProgress.entries()).map(([displayName, count]) => ({ displayName, count }));
    }
    registerChatSessionContentProvider(chatSessionType, provider) {
        this.contentProviders.set(chatSessionType, provider);
        this._onDidChangeContentProviderSchemes.fire({ added: [chatSessionType], removed: [] });
        return {
            dispose: () => {
                this.contentProviders.delete(chatSessionType);
            }
        };
    }
    async canResolveContentProvider(chatSessionType) {
        return this.contentProviders.has(chatSessionType);
    }
    async getOrCreateChatSession(sessionResource, token) {
        const provider = this.contentProviders.get(sessionResource.scheme);
        if (!provider) {
            throw new Error(`No content provider for ${sessionResource.scheme}`);
        }
        return provider.provideChatSessionContent(sessionResource, token);
    }
    async canResolveChatSession(sessionType) {
        return this.contentProviders.has(sessionType);
    }
    getOptionGroupsForSessionType(chatSessionType) {
        return this.optionGroups.get(chatSessionType);
    }
    setOptionGroupsForSessionType(chatSessionType, handle, optionGroups) {
        if (optionGroups) {
            this.optionGroups.set(chatSessionType, optionGroups);
        }
        else {
            this.optionGroups.delete(chatSessionType);
        }
    }
    getNewSessionOptionsForSessionType(_chatSessionType) {
        return undefined;
    }
    setNewSessionOptionsForSessionType(_chatSessionType, _options) {
        // noop
    }
    async notifySessionOptionsChange(sessionResource, updates) {
        await this._onRequestNotifyExtension.fireAsync({ sessionResource, updates }, CancellationToken.None);
    }
    getSessionOptions(sessionResource) {
        const options = this.sessionOptions.get(sessionResource);
        return options && options.size > 0 ? options : undefined;
    }
    getSessionOption(sessionResource, optionId) {
        return this.sessionOptions.get(sessionResource)?.get(optionId);
    }
    setSessionOption(sessionResource, optionId, value) {
        if (!this.sessionOptions.has(sessionResource)) {
            this.sessionOptions.set(sessionResource, new Map());
        }
        this.sessionOptions.get(sessionResource).set(optionId, value);
        return true;
    }
    hasAnySessionOptions(resource) {
        return this.sessionOptions.has(resource) && this.sessionOptions.get(resource).size > 0;
    }
    getCapabilitiesForSessionType(chatSessionType) {
        return this.contributions.find(c => c.type === chatSessionType)?.capabilities;
    }
    getCustomAgentTargetForSessionType(chatSessionType) {
        return this.contributions.find(c => c.type === chatSessionType)?.customAgentTarget ?? Target.Undefined;
    }
    requiresCustomModelsForSessionType(chatSessionType) {
        return this.contributions.find(c => c.type === chatSessionType)?.requiresCustomModels ?? false;
    }
    supportsDelegationForSessionType(chatSessionType) {
        return this.contributions.find(c => c.type === chatSessionType)?.supportsDelegation !== false;
    }
    sessionSupportsFork(_sessionResource) {
        return false;
    }
    async forkChatSession(_sessionResource, _request, _token) {
        throw new Error('Not implemented');
    }
    getContentProviderSchemes() {
        return Array.from(this.contentProviders.keys());
    }
    getInProgressSessionDescription(chatModel) {
        return undefined;
    }
    async createNewChatSessionItem(_chatSessionType, _request, _token) {
        return undefined;
    }
    registerSessionResourceAlias(_untitledResource, _realResource) {
        // noop
    }
    registerChatSessionContribution(contribution) {
        this.contributions.push(contribution);
        return {
            dispose: () => {
                const idx = this.contributions.indexOf(contribution);
                if (idx >= 0) {
                    this.contributions.splice(idx, 1);
                }
            }
        };
    }
}
//# sourceMappingURL=mockChatSessionsService.js.map