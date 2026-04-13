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
import { CancellationToken } from '../../../base/common/cancellation.js';
import { URI } from '../../../base/common/uri.js';
import { MainContext } from './extHost.protocol.js';
import { DocumentSelector, MarkdownString } from './extHostTypeConverters.js';
import { IExtHostRpcService } from './extHostRpcService.js';
import { Disposable, DisposableStore } from '../../../base/common/lifecycle.js';
import { IExtHostCommands } from './extHostCommands.js';
let ExtHostChatContext = class ExtHostChatContext extends Disposable {
    constructor(extHostRpc, _commands) {
        super();
        this._commands = _commands;
        this._handlePool = 0;
        this._providers = new Map();
        this._itemPool = 0;
        /** Global map of itemHandle -> original item for command execution with reference equality */
        this._globalItems = new Map();
        /** Track which items belong to which provider for cleanup */
        this._providerItems = new Map(); // providerHandle -> Set<itemHandle>
        this._proxy = extHostRpc.getProxy(MainContext.MainThreadChatContext);
    }
    // Workspace context provider methods
    async $provideWorkspaceChatContext(handle, token) {
        this._clearProviderItems(handle);
        const entry = this._providers.get(handle);
        if (!entry || entry.type !== 'workspace') {
            throw new Error('Workspace context provider not found');
        }
        const provider = entry.provider;
        const result = (await provider.provideWorkspaceChatContext?.(token)) ?? (await provider.provideChatContext?.(token)) ?? [];
        return this._convertItems(handle, result);
    }
    // Explicit context provider methods
    async $provideExplicitChatContext(handle, token) {
        this._clearProviderItems(handle);
        const entry = this._providers.get(handle);
        if (!entry || entry.type !== 'explicit') {
            throw new Error('Explicit context provider not found');
        }
        const provider = entry.provider;
        const result = (await provider.provideExplicitChatContext?.(token)) ?? (await provider.provideChatContext?.(token)) ?? [];
        return this._convertItems(handle, result);
    }
    async $resolveExplicitChatContext(handle, context, token) {
        const entry = this._providers.get(handle);
        if (!entry || entry.type !== 'explicit') {
            throw new Error('Explicit context provider not found');
        }
        const provider = entry.provider;
        const extItem = this._globalItems.get(context.handle);
        if (!extItem) {
            throw new Error('Chat context item not found');
        }
        return this._doResolve((provider.resolveExplicitChatContext ?? provider.resolveChatContext)?.bind(provider), context, extItem, token);
    }
    // Resource context provider methods
    async $provideResourceChatContext(handle, options, token) {
        const entry = this._providers.get(handle);
        if (!entry || entry.type !== 'resource') {
            throw new Error('Resource context provider not found');
        }
        const provider = entry.provider;
        const result = (await provider.provideResourceChatContext?.({ resource: URI.revive(options.resource) }, token)) ?? (await provider.provideChatContext?.({ resource: URI.revive(options.resource) }, token));
        if (!result) {
            return undefined;
        }
        if (result.label === undefined && result.resourceUri === undefined) {
            throw new Error('ChatContextItem must have either a label or a resourceUri');
        }
        const itemHandle = this._addTrackedItem(handle, result);
        const item = {
            handle: itemHandle,
            icon: result.icon,
            label: result.label,
            resourceUri: result.resourceUri,
            modelDescription: result.modelDescription,
            tooltip: result.tooltip ? MarkdownString.from(result.tooltip) : undefined,
            value: options.withValue ? result.value : undefined,
            command: result.command ? { id: result.command.command } : undefined
        };
        if (options.withValue && !item.value) {
            const resolved = await (provider.resolveResourceChatContext ?? provider.resolveChatContext)?.bind(provider)(result, token);
            item.value = resolved?.value;
            item.tooltip = resolved?.tooltip ? MarkdownString.from(resolved.tooltip) : item.tooltip;
        }
        return item;
    }
    async $resolveResourceChatContext(handle, context, token) {
        const entry = this._providers.get(handle);
        if (!entry || entry.type !== 'resource') {
            throw new Error('Resource context provider not found');
        }
        const provider = entry.provider;
        const extItem = this._globalItems.get(context.handle);
        if (!extItem) {
            throw new Error('Chat context item not found');
        }
        return this._doResolve((provider.resolveResourceChatContext ?? provider.resolveChatContext)?.bind(provider), context, extItem, token);
    }
    // Command execution
    async $executeChatContextItemCommand(itemHandle) {
        const extItem = this._globalItems.get(itemHandle);
        if (!extItem) {
            throw new Error('Chat context item not found');
        }
        if (!extItem.command) {
            throw new Error('Chat context item has no command');
        }
        // Execute the command with the original extension item as an argument (reference equality)
        const args = extItem.command.arguments ? [extItem, ...extItem.command.arguments] : [extItem];
        await this._commands.executeCommand(extItem.command.command, ...args);
    }
    // Registration methods
    registerChatWorkspaceContextProvider(id, provider) {
        const handle = this._handlePool++;
        const disposables = new DisposableStore();
        this._providers.set(handle, { type: 'workspace', provider, disposables });
        this._listenForWorkspaceContextChanges(handle, provider, disposables);
        this._proxy.$registerChatWorkspaceContextProvider(handle, id);
        return {
            dispose: () => {
                this._providers.delete(handle);
                this._clearProviderItems(handle);
                this._providerItems.delete(handle);
                this._proxy.$unregisterChatContextProvider(handle);
                disposables.dispose();
            }
        };
    }
    registerChatExplicitContextProvider(id, provider) {
        const handle = this._handlePool++;
        const disposables = new DisposableStore();
        this._providers.set(handle, { type: 'explicit', provider, disposables });
        this._proxy.$registerChatExplicitContextProvider(handle, id);
        return {
            dispose: () => {
                this._providers.delete(handle);
                this._clearProviderItems(handle);
                this._providerItems.delete(handle);
                this._proxy.$unregisterChatContextProvider(handle);
                disposables.dispose();
            }
        };
    }
    registerChatResourceContextProvider(selector, id, provider) {
        const handle = this._handlePool++;
        const disposables = new DisposableStore();
        this._providers.set(handle, { type: 'resource', provider, disposables });
        this._proxy.$registerChatResourceContextProvider(handle, id, DocumentSelector.from(selector));
        return {
            dispose: () => {
                this._providers.delete(handle);
                this._clearProviderItems(handle);
                this._providerItems.delete(handle);
                this._proxy.$unregisterChatContextProvider(handle);
                disposables.dispose();
            }
        };
    }
    /**
     * @deprecated Use registerChatWorkspaceContextProvider, registerChatExplicitContextProvider, or registerChatResourceContextProvider instead.
     */
    registerChatContextProvider(selector, id, provider) {
        const disposables = [];
        // Register workspace context provider if the provider supports it
        if (provider.provideWorkspaceChatContext) {
            const workspaceProvider = {
                onDidChangeWorkspaceChatContext: provider.onDidChangeWorkspaceChatContext,
                provideWorkspaceChatContext: (token) => provider.provideWorkspaceChatContext(token)
            };
            disposables.push(this.registerChatWorkspaceContextProvider(id, workspaceProvider));
        }
        // Register explicit context provider if the provider supports it
        if (provider.provideChatContextExplicit) {
            const explicitProvider = {
                provideExplicitChatContext: (token) => provider.provideChatContextExplicit(token),
                resolveExplicitChatContext: provider.resolveChatContext
                    ? (context, token) => provider.resolveChatContext(context, token)
                    : (context) => context
            };
            disposables.push(this.registerChatExplicitContextProvider(id, explicitProvider));
        }
        // Register resource context provider if the provider supports it and has a selector
        if (provider.provideChatContextForResource && selector) {
            const resourceProvider = {
                provideResourceChatContext: (options, token) => provider.provideChatContextForResource(options, token),
                resolveResourceChatContext: provider.resolveChatContext
                    ? (context, token) => provider.resolveChatContext(context, token)
                    : (context) => context
            };
            disposables.push(this.registerChatResourceContextProvider(selector, id, resourceProvider));
        }
        return {
            dispose: () => {
                for (const disposable of disposables) {
                    disposable.dispose();
                }
            }
        };
    }
    // Helper methods
    _clearProviderItems(handle) {
        const itemHandles = this._providerItems.get(handle);
        if (itemHandles) {
            for (const itemHandle of itemHandles) {
                this._globalItems.delete(itemHandle);
            }
            itemHandles.clear();
        }
    }
    _addTrackedItem(providerHandle, item) {
        const itemHandle = this._itemPool++;
        this._globalItems.set(itemHandle, item);
        if (!this._providerItems.has(providerHandle)) {
            this._providerItems.set(providerHandle, new Set());
        }
        this._providerItems.get(providerHandle).add(itemHandle);
        return itemHandle;
    }
    _convertItems(handle, items) {
        const result = [];
        for (const item of items) {
            if (item.label === undefined && item.resourceUri === undefined) {
                throw new Error('ChatContextItem must have either a label or a resourceUri');
            }
            const itemHandle = this._addTrackedItem(handle, item);
            result.push({
                handle: itemHandle,
                icon: item.icon,
                label: item.label,
                resourceUri: item.resourceUri,
                modelDescription: item.modelDescription,
                tooltip: item.tooltip ? MarkdownString.from(item.tooltip) : undefined,
                value: item.value,
                command: item.command ? { id: item.command.command } : undefined
            });
        }
        return result;
    }
    async _doResolve(resolveFn, context, extItem, token) {
        const extResult = await resolveFn(extItem, token);
        if (extResult) {
            return {
                handle: context.handle,
                icon: extResult.icon,
                label: extResult.label,
                resourceUri: extResult.resourceUri,
                modelDescription: extResult.modelDescription,
                tooltip: extResult.tooltip ? MarkdownString.from(extResult.tooltip) : undefined,
                value: extResult.value,
                command: extResult.command ? { id: extResult.command.command } : undefined
            };
        }
        return context;
    }
    _listenForWorkspaceContextChanges(handle, provider, disposables) {
        if (!provider.onDidChangeWorkspaceChatContext) {
            return;
        }
        const provideWorkspaceContext = async () => {
            const workspaceContexts = (await provider.provideWorkspaceChatContext?.(CancellationToken.None) ?? await provider.provideChatContext?.(CancellationToken.None));
            const resolvedContexts = this._convertItems(handle, workspaceContexts ?? []);
            return this._proxy.$updateWorkspaceContextItems(handle, resolvedContexts);
        };
        disposables.add(provider.onDidChangeWorkspaceChatContext(async () => provideWorkspaceContext()));
        // kick off initial workspace context fetch
        provideWorkspaceContext();
    }
    dispose() {
        super.dispose();
        for (const { disposables } of this._providers.values()) {
            disposables.dispose();
        }
    }
};
ExtHostChatContext = __decorate([
    __param(0, IExtHostRpcService),
    __param(1, IExtHostCommands)
], ExtHostChatContext);
export { ExtHostChatContext };
//# sourceMappingURL=extHostChatContext.js.map