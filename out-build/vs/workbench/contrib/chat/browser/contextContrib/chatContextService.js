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
import { ThemeIcon } from '../../../../../base/common/themables.js';
import { score } from '../../../../../editor/common/languageSelector.js';
import { createDecorator } from '../../../../../platform/instantiation/common/instantiation.js';
import { IChatContextPickService } from '../attachments/chatContextPickService.js';
import { CancellationToken } from '../../../../../base/common/cancellation.js';
import { IExtensionService } from '../../../../services/extensions/common/extensions.js';
import { registerSingleton } from '../../../../../platform/instantiation/common/extensions.js';
import { Disposable, DisposableMap } from '../../../../../base/common/lifecycle.js';
import { basename } from '../../../../../base/common/resources.js';
export const IChatContextService = createDecorator('chatContextService');
let ChatContextService = class ChatContextService extends Disposable {
    constructor(_contextPickService, _extensionService) {
        super();
        this._contextPickService = _contextPickService;
        this._extensionService = _extensionService;
        this._providers = new Map();
        this._workspaceContext = new Map();
        this._registeredPickers = this._register(new DisposableMap());
        this._lastResourceContext = new Map();
    }
    setExecuteCommandCallback(callback) {
        this._executeCommandCallback = callback;
    }
    async executeChatContextItemCommand(handle) {
        if (!this._executeCommandCallback) {
            return;
        }
        await this._executeCommandCallback(handle);
    }
    setChatContextProvider(id, picker) {
        const providerEntry = this._providers.get(id) ?? {};
        providerEntry.picker = picker;
        this._providers.set(id, providerEntry);
        this._registerWithPickService(id);
    }
    _registerWithPickService(id) {
        const providerEntry = this._providers.get(id);
        if (!providerEntry || !providerEntry.picker || !providerEntry.explicitProvider) {
            return;
        }
        const title = `${providerEntry.picker.title.replace(/\.+$/, '')}...`;
        this._registeredPickers.set(id, this._contextPickService.registerChatContextItem(this._asPicker(title, providerEntry.picker.icon, id)));
    }
    registerChatWorkspaceContextProvider(id, provider) {
        const providerEntry = this._providers.get(id) ?? {};
        providerEntry.workspaceProvider = provider;
        this._providers.set(id, providerEntry);
    }
    registerChatExplicitContextProvider(id, provider) {
        const providerEntry = this._providers.get(id) ?? {};
        providerEntry.explicitProvider = provider;
        this._providers.set(id, providerEntry);
        this._registerWithPickService(id);
    }
    registerChatResourceContextProvider(id, selector, provider) {
        const providerEntry = this._providers.get(id) ?? {};
        providerEntry.resourceProvider = { selector, provider };
        this._providers.set(id, providerEntry);
    }
    unregisterChatContextProvider(id) {
        this._providers.delete(id);
        this._registeredPickers.deleteAndDispose(id);
    }
    updateWorkspaceContextItems(id, items) {
        this._workspaceContext.set(id, items);
    }
    getWorkspaceContextItems() {
        const items = [];
        for (const workspaceContexts of this._workspaceContext.values()) {
            for (const item of workspaceContexts) {
                if (!item.value) {
                    continue;
                }
                // Derive label from resourceUri if label is not set
                const derivedLabel = item.label ?? (item.resourceUri ? basename(item.resourceUri) : 'Unknown');
                items.push({
                    value: item.value,
                    name: derivedLabel,
                    modelDescription: item.modelDescription,
                    id: derivedLabel,
                    kind: 'workspace'
                });
            }
        }
        return items;
    }
    async contextForResource(uri, language) {
        return this._contextForResource(uri, false, language);
    }
    async _contextForResource(uri, withValue, language) {
        const scoredProviders = [];
        for (const providerEntry of this._providers.values()) {
            if (!providerEntry.resourceProvider) {
                continue;
            }
            const matchScore = score(providerEntry.resourceProvider.selector, uri, language ?? '', true, undefined, undefined);
            scoredProviders.push({ score: matchScore, provider: providerEntry.resourceProvider.provider });
        }
        scoredProviders.sort((a, b) => b.score - a.score);
        if (scoredProviders.length === 0 || scoredProviders[0].score <= 0) {
            return;
        }
        const provider = scoredProviders[0].provider;
        const context = (await provider.provideChatContext(uri, withValue, CancellationToken.None));
        if (!context) {
            return;
        }
        // Derive label from resourceUri if label is not set
        const effectiveResourceUri = context.resourceUri ?? uri;
        const derivedLabel = context.label ?? basename(effectiveResourceUri);
        const contextValue = {
            value: undefined,
            name: derivedLabel,
            icon: context.icon,
            uri: uri,
            resourceUri: context.resourceUri,
            modelDescription: context.modelDescription,
            tooltip: context.tooltip,
            commandId: context.command?.id,
            handle: context.handle
        };
        this._lastResourceContext.clear();
        this._lastResourceContext.set(contextValue, { originalItem: context, provider });
        return contextValue;
    }
    async resolveChatContext(context, language) {
        if (context.value !== undefined) {
            return context;
        }
        const item = this._lastResourceContext.get(context);
        if (!item) {
            const resolved = await this._contextForResource(context.uri, true, language);
            context.value = resolved?.value;
            context.modelDescription = resolved?.modelDescription;
            context.tooltip = resolved?.tooltip;
            return context;
        }
        else {
            const resolved = await item.provider.resolveChatContext(item.originalItem, CancellationToken.None);
            if (resolved) {
                context.value = resolved.value;
                context.modelDescription = resolved.modelDescription;
                context.tooltip = resolved.tooltip;
                return context;
            }
        }
        return context;
    }
    _asPicker(title, icon, id) {
        const asPicker = () => {
            let providerEntry = this._providers.get(id);
            if (!providerEntry) {
                throw new Error('No chat context provider registered');
            }
            const picks = async () => {
                if (providerEntry && !providerEntry.explicitProvider) {
                    // Activate the extension providing the chat context provider
                    await this._extensionService.activateByEvent(`onChatContextProvider:${id}`);
                    providerEntry = this._providers.get(id);
                    if (!providerEntry?.explicitProvider) {
                        return [];
                    }
                }
                const results = await providerEntry?.explicitProvider.provideChatContext(CancellationToken.None);
                return results || [];
            };
            return {
                picks: picks().then(items => {
                    return items.map(item => {
                        // Derive label from resourceUri if label is not set
                        const derivedLabel = item.label ?? (item.resourceUri ? basename(item.resourceUri) : 'Unknown');
                        return {
                            label: derivedLabel,
                            iconClass: item.icon ? ThemeIcon.asClassName(item.icon) : undefined,
                            asAttachment: async () => {
                                let contextValue = item;
                                if ((contextValue.value === undefined) && providerEntry?.explicitProvider) {
                                    contextValue = await providerEntry.explicitProvider.resolveChatContext(item, CancellationToken.None);
                                }
                                // Derive label from resourceUri if label is not set
                                const resolvedLabel = contextValue.label ?? (contextValue.resourceUri ? basename(contextValue.resourceUri) : 'Unknown');
                                return {
                                    kind: 'generic',
                                    id: resolvedLabel,
                                    name: resolvedLabel,
                                    icon: contextValue.icon,
                                    value: contextValue.value,
                                };
                            }
                        };
                    });
                }),
                placeholder: title
            };
        };
        const picker = {
            asPicker,
            type: 'pickerPick',
            label: title,
            icon
        };
        return picker;
    }
};
ChatContextService = __decorate([
    __param(0, IChatContextPickService),
    __param(1, IExtensionService)
], ChatContextService);
export { ChatContextService };
registerSingleton(IChatContextService, ChatContextService, 1 /* InstantiationType.Delayed */);
//# sourceMappingURL=chatContextService.js.map