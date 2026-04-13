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
import './media/aiCustomizationManagement.css';
import * as DOM from '../../../../../base/browser/dom.js';
import { Disposable, DisposableStore, isDisposable } from '../../../../../base/common/lifecycle.js';
import { Emitter } from '../../../../../base/common/event.js';
import { localize } from '../../../../../nls.js';
import { IInstantiationService } from '../../../../../platform/instantiation/common/instantiation.js';
import { WorkbenchList } from '../../../../../platform/list/browser/listService.js';
import { ThemeIcon } from '../../../../../base/common/themables.js';
import { Codicon } from '../../../../../base/common/codicons.js';
import { Button } from '../../../../../base/browser/ui/button/button.js';
import { defaultButtonStyles, defaultInputBoxStyles } from '../../../../../platform/theme/browser/defaultStyles.js';
import { ICommandService } from '../../../../../platform/commands/common/commands.js';
import { IMcpWorkbenchService, IMcpService } from '../../../../contrib/mcp/common/mcpTypes.js';
import { isContributionDisabled } from '../../common/enablement.js';
import { autorun } from '../../../../../base/common/observable.js';
import { IOpenerService } from '../../../../../platform/opener/common/opener.js';
import { URI } from '../../../../../base/common/uri.js';
import { InputBox } from '../../../../../base/browser/ui/inputbox/inputBox.js';
import { IContextMenuService, IContextViewService } from '../../../../../platform/contextview/browser/contextView.js';
import { CancellationTokenSource } from '../../../../../base/common/cancellation.js';
import { Delayer } from '../../../../../base/common/async.js';
import { Action, Separator } from '../../../../../base/common/actions.js';
import { getContextMenuActions } from '../../../../contrib/mcp/browser/mcpServerActions.js';
import { IAgentPluginService } from '../../common/plugins/agentPluginService.js';
import { IDialogService } from '../../../../../platform/dialogs/common/dialogs.js';
import { workspaceIcon, userIcon, mcpServerIcon, builtinIcon, extensionIcon } from './aiCustomizationIcons.js';
import { formatDisplayName, truncateToFirstSentence } from './aiCustomizationListWidget.js';
import { getDefaultHoverDelegate } from '../../../../../base/browser/ui/hover/hoverDelegateFactory.js';
import { IHoverService } from '../../../../../platform/hover/browser/hover.js';
import { IAICustomizationWorkspaceService } from '../../common/aiCustomizationWorkspaceService.js';
import { ICustomizationHarnessService, CustomizationHarness } from '../../common/customizationHarnessService.js';
import { CustomizationGroupHeaderRenderer, CUSTOMIZATION_GROUP_HEADER_HEIGHT, CUSTOMIZATION_GROUP_HEADER_HEIGHT_WITH_SEPARATOR } from './customizationGroupHeaderRenderer.js';
const $ = DOM.$;
const MCP_ITEM_HEIGHT = 36;
/**
 * Delegate for the MCP server list.
 */
class McpServerItemDelegate {
    getHeight(element) {
        if (element.type === 'group-header') {
            return element.isFirst ? CUSTOMIZATION_GROUP_HEADER_HEIGHT : CUSTOMIZATION_GROUP_HEADER_HEIGHT_WITH_SEPARATOR;
        }
        if (element.type === 'server-item' && element.server.gallery && !element.server.local) {
            return 62;
        }
        return MCP_ITEM_HEIGHT;
    }
    getTemplateId(element) {
        if (element.type === 'group-header') {
            return 'mcpGroupHeader';
        }
        if (element.type === 'builtin-item') {
            return 'mcpServerItem';
        }
        const server = element.server;
        return server.gallery && !server.local ? 'mcpGalleryItem' : 'mcpServerItem';
    }
}
/**
 * Renderer for local MCP server list items.
 */
let McpServerItemRenderer = class McpServerItemRenderer {
    constructor(mcpService, workspaceService, harnessService, hoverService) {
        this.mcpService = mcpService;
        this.workspaceService = workspaceService;
        this.harnessService = harnessService;
        this.hoverService = hoverService;
        this.templateId = 'mcpServerItem';
    }
    renderTemplate(container) {
        container.classList.add('mcp-server-item');
        const typeIcon = DOM.append(container, $('.mcp-server-icon'));
        typeIcon.classList.add(...ThemeIcon.asClassNameArray(mcpServerIcon));
        const details = DOM.append(container, $('.mcp-server-details'));
        const nameRow = DOM.append(details, $('.mcp-server-name-row'));
        const name = DOM.append(nameRow, $('.mcp-server-name'));
        const bridgedBadge = DOM.append(nameRow, $('.mcp-bridged-badge'));
        bridgedBadge.textContent = localize(6489, null);
        const description = DOM.append(details, $('.mcp-server-description'));
        const status = DOM.append(container, $('.mcp-server-status'));
        return { container, typeIcon, name, description, status, bridgedBadge, disposables: new DisposableStore() };
    }
    renderElement(element, index, templateData) {
        templateData.disposables.clear();
        // Show/hide the "Bridged" badge based on active harness
        templateData.disposables.add(autorun(reader => {
            const activeId = this.harnessService.activeHarness.read(reader);
            templateData.bridgedBadge.style.display = activeId !== CustomizationHarness.VSCode ? '' : 'none';
        }));
        templateData.disposables.add(this.hoverService.setupManagedHover(getDefaultHoverDelegate('mouse'), templateData.bridgedBadge, localize(6490, null)));
        if (element.type === 'builtin-item') {
            templateData.container.classList.add('builtin');
            templateData.name.textContent = formatDisplayName(element.label);
            if (element.description) {
                templateData.description.textContent = truncateToFirstSentence(element.description);
                templateData.description.style.display = '';
            }
            else {
                templateData.description.style.display = 'none';
            }
            templateData.status.style.display = 'none';
            return;
        }
        templateData.container.classList.remove('builtin');
        templateData.name.textContent = formatDisplayName(element.server.label);
        if (element.server.description) {
            templateData.description.textContent = truncateToFirstSentence(element.server.description);
            templateData.description.style.display = '';
        }
        else {
            templateData.description.style.display = 'none';
        }
        // Find the server from IMcpService to get connection state
        const server = this.mcpService.servers.get().find(s => s.definition.id === element.server.id);
        templateData.disposables.add(autorun(reader => {
            const disabled = server ? isContributionDisabled(server.enablement.read(reader)) : false;
            const connectionState = server?.connectionState.read(reader);
            templateData.container.classList.toggle('disabled', disabled);
            this.updateStatus(templateData.status, disabled ? 'disabled' : connectionState?.state);
        }));
    }
    updateStatus(statusElement, state) {
        statusElement.className = 'mcp-server-status';
        if (this.workspaceService.isSessionsWindow) {
            // In sessions window, CLI manages MCP servers — hide status
            statusElement.style.display = 'none';
            return;
        }
        statusElement.style.display = '';
        if (state === 'disabled') {
            statusElement.textContent = localize(6491, null);
            statusElement.classList.add('disabled');
            return;
        }
        switch (state) {
            case 2 /* McpConnectionState.Kind.Running */:
                statusElement.textContent = localize(6492, null);
                statusElement.classList.add('running');
                break;
            case 1 /* McpConnectionState.Kind.Starting */:
                statusElement.textContent = localize(6493, null);
                statusElement.classList.add('starting');
                break;
            case 3 /* McpConnectionState.Kind.Error */:
                statusElement.textContent = localize(6494, null);
                statusElement.classList.add('error');
                break;
            case 0 /* McpConnectionState.Kind.Stopped */:
            default:
                statusElement.textContent = localize(6495, null);
                statusElement.classList.add('stopped');
                break;
        }
    }
    disposeTemplate(templateData) {
        templateData.disposables.dispose();
    }
};
McpServerItemRenderer = __decorate([
    __param(0, IMcpService),
    __param(1, IAICustomizationWorkspaceService),
    __param(2, ICustomizationHarnessService),
    __param(3, IHoverService)
], McpServerItemRenderer);
/**
 * Renderer for gallery MCP server items with an install button.
 */
class McpGalleryItemRenderer {
    constructor(mcpWorkbenchService) {
        this.mcpWorkbenchService = mcpWorkbenchService;
        this.templateId = 'mcpGalleryItem';
    }
    renderTemplate(container) {
        container.classList.add('mcp-server-item', 'mcp-gallery-item', 'extension-list-item');
        const details = DOM.append(container, $('.details'));
        const headerContainer = DOM.append(details, $('.header-container'));
        const header = DOM.append(headerContainer, $('.header'));
        const name = DOM.append(header, $('span.name'));
        const description = DOM.append(details, $('.description.ellipsis'));
        const footer = DOM.append(details, $('.footer'));
        const publisherContainer = DOM.append(footer, $('.publisher-container'));
        const publisher = DOM.append(publisherContainer, $('span.publisher-name'));
        const actionContainer = DOM.append(footer, $('.mcp-gallery-action'));
        const installButton = new Button(actionContainer, { ...defaultButtonStyles, supportIcons: true });
        installButton.element.classList.add('mcp-gallery-install-button');
        const templateDisposables = new DisposableStore();
        templateDisposables.add(installButton);
        return { container, name, publisher, description, installButton, elementDisposables: new DisposableStore(), templateDisposables };
    }
    renderElement(element, _index, templateData) {
        templateData.elementDisposables.clear();
        templateData.name.textContent = element.server.label;
        templateData.publisher.textContent = element.server.publisherDisplayName ? `by ${element.server.publisherDisplayName}` : '';
        templateData.description.textContent = element.server.description || '';
        this.updateInstallButton(templateData.installButton, element.server);
        templateData.elementDisposables.add(templateData.installButton.onDidClick(async () => {
            const canInstall = this.mcpWorkbenchService.canInstall(element.server);
            if (canInstall === true) {
                templateData.installButton.label = localize(6496, null);
                templateData.installButton.enabled = false;
                await this.mcpWorkbenchService.install(element.server);
            }
        }));
        templateData.elementDisposables.add(this.mcpWorkbenchService.onChange(changed => {
            if (!changed || changed.id === element.server.id) {
                this.updateInstallButton(templateData.installButton, element.server);
            }
        }));
    }
    updateInstallButton(button, server) {
        switch (server.installState) {
            case 1 /* McpServerInstallState.Installed */:
                button.label = localize(6497, null);
                button.enabled = false;
                break;
            case 0 /* McpServerInstallState.Installing */:
                button.label = localize(6498, null);
                button.enabled = false;
                break;
            default:
                button.label = localize(6499, null);
                button.enabled = true;
                break;
        }
    }
    disposeTemplate(templateData) {
        templateData.elementDisposables.dispose();
        templateData.templateDisposables.dispose();
    }
}
/**
 * Widget that displays a list of MCP servers with marketplace browsing.
 */
let McpListWidget = class McpListWidget extends Disposable {
    constructor(instantiationService, mcpWorkbenchService, mcpService, commandService, openerService, contextViewService, contextMenuService, hoverService, agentPluginService, dialogService) {
        super();
        this.instantiationService = instantiationService;
        this.mcpWorkbenchService = mcpWorkbenchService;
        this.mcpService = mcpService;
        this.commandService = commandService;
        this.openerService = openerService;
        this.contextViewService = contextViewService;
        this.contextMenuService = contextMenuService;
        this.hoverService = hoverService;
        this.agentPluginService = agentPluginService;
        this.dialogService = dialogService;
        this._onDidSelectServer = this._register(new Emitter());
        this.onDidSelectServer = this._onDidSelectServer.event;
        this._onDidChangeItemCount = this._register(new Emitter());
        this.onDidChangeItemCount = this._onDidChangeItemCount.event;
        this.filteredServers = [];
        this.filteredBuiltinCount = 0;
        this.displayEntries = [];
        this.galleryServers = [];
        this.searchQuery = '';
        this.browseMode = false;
        this.collapsedGroups = new Set();
        this.delayedFilter = new Delayer(200);
        this.delayedGallerySearch = new Delayer(400);
        this.element = $('.mcp-list-widget');
        this.create();
        this._register({
            dispose: () => {
                this.galleryCts?.dispose();
            }
        });
    }
    create() {
        // Search and button container
        this.searchAndButtonContainer = DOM.append(this.element, $('.list-search-and-button-container'));
        // Search container
        const searchContainer = DOM.append(this.searchAndButtonContainer, $('.list-search-container'));
        this.searchInput = this._register(new InputBox(searchContainer, this.contextViewService, {
            placeholder: localize(6500, null),
            inputBoxStyles: defaultInputBoxStyles,
        }));
        this._register(this.searchInput.onDidChange(() => {
            this.searchQuery = this.searchInput.value;
            if (this.browseMode) {
                this.delayedGallerySearch.trigger(() => this.queryGallery());
            }
            else {
                this.delayedFilter.trigger(() => this.filterServers());
            }
        }));
        // Button container (Browse Marketplace + Add Server)
        const buttonContainer = DOM.append(this.searchAndButtonContainer, $('.list-button-group'));
        // Browse Marketplace button
        const browseButtonContainer = DOM.append(buttonContainer, $('.list-add-button-container'));
        this.browseButton = this._register(new Button(browseButtonContainer, { ...defaultButtonStyles, secondary: true, supportIcons: true }));
        this.browseButton.label = `$(${Codicon.library.id}) ${localize(6501, null)}`;
        this.browseButton.element.classList.add('list-add-button');
        this._register(this.browseButton.onDidClick(() => {
            this.toggleBrowseMode(!this.browseMode);
        }));
        this.addButton = this._register(new Button(buttonContainer, {
            ...defaultButtonStyles,
            secondary: true,
            supportIcons: true,
            title: localize(6502, null),
            ariaLabel: localize(6503, null)
        }));
        this.addButton.label = `$(${Codicon.add.id})`;
        this.addButton.element.classList.add('list-icon-button');
        this._register(this.hoverService.setupManagedHover(getDefaultHoverDelegate('element'), this.addButton.element, localize(6504, null)));
        this._register(this.addButton.onDidClick(() => {
            this.commandService.executeCommand("workbench.mcp.addConfiguration" /* McpCommandIds.AddConfiguration */);
        }));
        // Back to installed link (shown only in browse mode)
        this.backLink = DOM.append(this.element, $('.mcp-back-link'));
        this.backLink.setAttribute('role', 'button');
        this.backLink.tabIndex = 0;
        this.backLink.setAttribute('aria-label', localize(6505, null));
        const backIcon = DOM.append(this.backLink, $('span'));
        backIcon.classList.add(...ThemeIcon.asClassNameArray(Codicon.arrowLeft));
        const backText = DOM.append(this.backLink, $('span'));
        backText.textContent = localize(6506, null);
        this._register(DOM.addDisposableListener(this.backLink, 'click', () => {
            this.toggleBrowseMode(false);
        }));
        this._register(DOM.addDisposableListener(this.backLink, 'keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                this.toggleBrowseMode(false);
            }
        }));
        this.backLink.style.display = 'none';
        // Empty state
        this.emptyContainer = DOM.append(this.element, $('.mcp-empty-state'));
        const emptyIcon = DOM.append(this.emptyContainer, $('.empty-icon'));
        emptyIcon.classList.add(...ThemeIcon.asClassNameArray(Codicon.server));
        this.emptyText = DOM.append(this.emptyContainer, $('.empty-text'));
        this.emptySubtext = DOM.append(this.emptyContainer, $('.empty-subtext'));
        // List container
        this.listContainer = DOM.append(this.element, $('.mcp-list-container'));
        // Section footer at bottom with description and link
        this.sectionHeader = DOM.append(this.element, $('.section-footer'));
        this.sectionDescription = DOM.append(this.sectionHeader, $('p.section-footer-description'));
        this.sectionDescription.textContent = localize(6507, null);
        this.sectionLink = DOM.append(this.sectionHeader, $('a.section-footer-link'));
        this.sectionLink.textContent = localize(6508, null);
        this.sectionLink.href = 'https://code.visualstudio.com/docs/copilot/chat/mcp-servers';
        this._register(DOM.addDisposableListener(this.sectionLink, 'click', (e) => {
            e.preventDefault();
            const href = this.sectionLink.href;
            if (href) {
                this.openerService.open(URI.parse(href));
            }
        }));
        // Create list
        const delegate = new McpServerItemDelegate();
        const groupHeaderRenderer = new CustomizationGroupHeaderRenderer('mcpGroupHeader', this.hoverService);
        const localRenderer = this.instantiationService.createInstance(McpServerItemRenderer);
        const galleryRenderer = new McpGalleryItemRenderer(this.mcpWorkbenchService);
        this.list = this._register(this.instantiationService.createInstance((WorkbenchList), 'McpManagementList', this.listContainer, delegate, [groupHeaderRenderer, localRenderer, galleryRenderer], {
            multipleSelectionSupport: false,
            setRowLineHeight: false,
            horizontalScrolling: false,
            accessibilityProvider: {
                getAriaLabel(element) {
                    if (element.type === 'group-header') {
                        return localize(6509, null, element.label, element.count, element.collapsed ? localize(6510, null) : localize(6511, null));
                    }
                    if (element.type === 'builtin-item') {
                        return element.label;
                    }
                    return element.server.label;
                },
                getWidgetAriaLabel() {
                    return localize(6512, null);
                }
            },
            openOnSingleClick: true,
            identityProvider: {
                getId(element) {
                    if (element.type === 'group-header') {
                        return element.id;
                    }
                    if (element.type === 'builtin-item') {
                        return element.id;
                    }
                    return element.server.id;
                }
            }
        }));
        this._register(this.list.onDidOpen(e => {
            if (e.element) {
                if (e.element.type === 'group-header') {
                    this.toggleGroup(e.element);
                }
                else if (e.element.type === 'server-item') {
                    this._onDidSelectServer.fire(e.element.server);
                }
                // builtin-item: no action on click (read-only)
            }
        }));
        // Handle context menu
        this._register(this.list.onContextMenu(e => this.onContextMenu(e)));
        // Listen to MCP service changes
        this._register(this.mcpWorkbenchService.onChange(() => {
            if (!this.browseMode) {
                this.refresh();
            }
        }));
        this._register(autorun(reader => {
            this.mcpService.servers.read(reader);
            if (!this.browseMode) {
                this.refresh();
            }
        }));
        // Initial refresh
        void this.refresh();
    }
    async refresh() {
        if (this.browseMode) {
            await this.queryGallery();
        }
        else {
            this.filterServers();
        }
    }
    toggleBrowseMode(browse) {
        this.browseMode = browse;
        this.searchInput.value = '';
        this.searchQuery = '';
        // Update UI for browse vs installed mode
        this.backLink.style.display = browse ? '' : 'none';
        this.addButton.element.style.display = browse ? 'none' : '';
        this.browseButton.element.parentElement.style.display = browse ? 'none' : '';
        this.searchInput.setPlaceHolder(browse
            ? localize(6513, null)
            : localize(6514, null));
        if (browse) {
            void this.queryGallery();
        }
        else {
            this.galleryCts?.dispose(true);
            this.galleryServers = [];
            this.filterServers();
        }
    }
    async queryGallery() {
        this.galleryCts?.dispose(true);
        const cts = this.galleryCts = new CancellationTokenSource();
        // Show loading state
        this.emptyContainer.style.display = 'flex';
        this.listContainer.style.display = 'none';
        this.emptyText.textContent = localize(6515, null);
        this.emptySubtext.textContent = '';
        try {
            const pager = await this.mcpWorkbenchService.queryGallery({ text: this.searchQuery.trim() || undefined }, cts.token);
            if (cts.token.isCancellationRequested) {
                return;
            }
            this.galleryServers = pager.firstPage.items;
            this.updateGalleryList();
        }
        catch {
            if (!cts.token.isCancellationRequested) {
                this.galleryServers = [];
                this.emptyContainer.style.display = 'flex';
                this.listContainer.style.display = 'none';
                this.emptyText.textContent = localize(6516, null);
                this.emptySubtext.textContent = localize(6517, null);
            }
        }
    }
    updateGalleryList() {
        if (this.galleryServers.length === 0) {
            this.emptyContainer.style.display = 'flex';
            this.listContainer.style.display = 'none';
            if (this.searchQuery.trim()) {
                this.emptyText.textContent = localize(6518, null, this.searchQuery);
                this.emptySubtext.textContent = localize(6519, null);
            }
            else {
                this.emptyText.textContent = localize(6520, null);
                this.emptySubtext.textContent = '';
            }
        }
        else {
            this.emptyContainer.style.display = 'none';
            this.listContainer.style.display = '';
        }
        const entries = this.galleryServers.map(server => ({ type: 'server-item', server }));
        this.list.splice(0, this.list.length, entries);
    }
    filterServers() {
        const query = this.searchQuery.toLowerCase().trim();
        if (query) {
            this.filteredServers = this.mcpWorkbenchService.local.filter(server => server.label.toLowerCase().includes(query) ||
                (server.description?.toLowerCase().includes(query)));
        }
        else {
            this.filteredServers = [...this.mcpWorkbenchService.local];
        }
        // Find extension-provided servers not in the local list (e.g. GitHub MCP)
        const localIds = new Set(this.filteredServers.map(s => s.id));
        const builtinServers = this.mcpService.servers.get()
            .filter(s => !localIds.has(s.definition.id))
            .filter(s => !query || s.definition.label.toLowerCase().includes(query));
        // Show empty state only when there are no servers at all (not when filtered to empty)
        if (this.filteredServers.length === 0 && builtinServers.length === 0) {
            this.emptyContainer.style.display = 'flex';
            this.listContainer.style.display = 'none';
            if (this.searchQuery.trim()) {
                // Search with no results
                this.emptyText.textContent = localize(6521, null, this.searchQuery);
                this.emptySubtext.textContent = localize(6522, null);
            }
            else {
                // No servers configured
                this.emptyText.textContent = localize(6523, null);
                this.emptySubtext.textContent = localize(6524, null);
            }
        }
        else {
            this.emptyContainer.style.display = 'none';
            this.listContainer.style.display = '';
        }
        // Group servers by scope
        const groups = [
            { scope: "workspace" /* LocalMcpServerScope.Workspace */, label: localize(6525, null), icon: workspaceIcon, description: localize(6526, null), servers: [] },
            { scope: "user" /* LocalMcpServerScope.User */, label: localize(6527, null), icon: userIcon, description: localize(6528, null), servers: [] },
        ];
        for (const server of this.filteredServers) {
            const scope = server.local?.scope;
            if (scope === "workspace" /* LocalMcpServerScope.Workspace */) {
                groups[0].servers.push(server);
            }
            else {
                // User, RemoteUser, or unknown → group under User
                groups[1].servers.push(server);
            }
        }
        // Build display entries with group headers
        const entries = [];
        let isFirst = true;
        for (const group of groups) {
            if (group.servers.length === 0) {
                continue;
            }
            const collapsed = this.collapsedGroups.has(group.scope);
            entries.push({
                type: 'group-header',
                id: `mcp-group-${group.scope}`,
                scope: group.scope,
                label: group.label,
                icon: group.icon,
                count: group.servers.length,
                isFirst,
                description: group.description,
                collapsed,
            });
            if (!collapsed) {
                for (const server of group.servers) {
                    entries.push({ type: 'server-item', server });
                }
            }
            isFirst = false;
        }
        // Add extension-provided and built-in servers
        if (builtinServers.length > 0) {
            const extensionServers = builtinServers.filter(s => s.collection.id.startsWith('ext.'));
            const otherBuiltinServers = builtinServers.filter(s => !s.collection.id.startsWith('ext.'));
            if (extensionServers.length > 0) {
                const collapsed = this.collapsedGroups.has('extension');
                entries.push({
                    type: 'group-header',
                    id: 'mcp-group-extension',
                    scope: 'extension',
                    label: localize(6529, null),
                    icon: extensionIcon,
                    count: extensionServers.length,
                    isFirst,
                    description: localize(6530, null),
                    collapsed,
                });
                if (!collapsed) {
                    for (const server of extensionServers) {
                        entries.push({
                            type: 'builtin-item',
                            id: `builtin-${server.definition.id}`,
                            label: server.definition.label,
                            description: '',
                            collectionId: server.collection.id,
                        });
                    }
                }
                isFirst = false;
            }
            if (otherBuiltinServers.length > 0) {
                const collapsed = this.collapsedGroups.has('builtin');
                entries.push({
                    type: 'group-header',
                    id: 'mcp-group-builtin',
                    scope: 'builtin',
                    label: localize(6531, null),
                    icon: builtinIcon,
                    count: otherBuiltinServers.length,
                    isFirst,
                    description: localize(6532, null),
                    collapsed,
                });
                if (!collapsed) {
                    for (const server of otherBuiltinServers) {
                        entries.push({
                            type: 'builtin-item',
                            id: `builtin-${server.definition.id}`,
                            label: server.definition.label,
                            description: '',
                            collectionId: server.collection.id,
                        });
                    }
                }
                isFirst = false;
            }
        }
        this.displayEntries = entries;
        this.list.splice(0, this.list.length, this.displayEntries);
        // Compute sidebar badge directly from the data arrays (same source as group headers)
        this.filteredBuiltinCount = builtinServers.length;
        this._onDidChangeItemCount.fire(this.itemCount);
    }
    /**
     * Gets the total item count from the underlying data arrays
     * (the same source used to build group headers).
     */
    get itemCount() {
        return this.filteredServers.length + this.filteredBuiltinCount;
    }
    /**
     * Re-fires the current item count. Call after subscribing to onDidChangeItemCount
     * to ensure the subscriber receives the latest count.
     */
    fireItemCount() {
        this._onDidChangeItemCount.fire(this.itemCount);
    }
    /**
     * Toggles the collapsed state of a group.
     */
    toggleGroup(entry) {
        if (this.collapsedGroups.has(entry.scope)) {
            this.collapsedGroups.delete(entry.scope);
        }
        else {
            this.collapsedGroups.add(entry.scope);
        }
        this.filterServers();
    }
    /**
     * Layouts the widget.
     */
    layout(height, width) {
        const sectionFooterHeight = this.sectionHeader.offsetHeight || 0;
        const searchBarHeight = this.searchAndButtonContainer.offsetHeight || 52;
        const backLinkHeight = this.browseMode ? (this.backLink.offsetHeight || 28) : 0;
        const listHeight = height - sectionFooterHeight - searchBarHeight - backLinkHeight;
        this.listContainer.style.height = `${Math.max(0, listHeight)}px`;
        this.list.layout(Math.max(0, listHeight), width);
        // Re-layout once after footer renders if we used a zero fallback
        if (sectionFooterHeight === 0) {
            DOM.getWindow(this.listContainer).requestAnimationFrame(() => {
                if (this._store.isDisposed) {
                    return;
                }
                const actualFooterHeight = this.sectionHeader.offsetHeight;
                if (actualFooterHeight > 0) {
                    const correctedHeight = height - actualFooterHeight - searchBarHeight - backLinkHeight;
                    this.listContainer.style.height = `${Math.max(0, correctedHeight)}px`;
                    this.list.layout(Math.max(0, correctedHeight), width);
                }
            });
        }
    }
    /**
     * Focuses the search input.
     */
    focusSearch() {
        this.searchInput.focus();
    }
    /**
     * Focuses the list.
     */
    focus() {
        this.list.domFocus();
        const servers = this.list.length;
        if (servers > 0) {
            this.list.setFocus([0]);
        }
    }
    /**
     * Handles context menu for MCP server items.
     */
    onContextMenu(e) {
        if (!e.element) {
            return;
        }
        // Plugin-provided builtin items get an "Uninstall Plugin" context menu
        if (e.element.type === 'builtin-item') {
            const collectionId = e.element.collectionId;
            if (!collectionId?.startsWith('plugin.')) {
                return;
            }
            const pluginUriStr = collectionId.slice('plugin.'.length);
            const plugin = this.agentPluginService.plugins.get().find(p => p.uri.toString() === pluginUriStr);
            if (!plugin) {
                return;
            }
            const disposables = new DisposableStore();
            const uninstallAction = disposables.add(new Action('mcpServer.uninstallPlugin', localize(6533, null), undefined, true, async () => {
                const result = await this.dialogService.confirm({
                    message: localize(6534, null, plugin.label),
                    detail: localize(6535, null),
                    primaryButton: localize(6536, null),
                    type: 'question',
                });
                if (result.confirmed) {
                    plugin.remove();
                }
            }));
            this.contextMenuService.showContextMenu({
                getAnchor: () => e.anchor,
                getActions: () => [uninstallAction],
                onHide: () => disposables.dispose(),
            });
            return;
        }
        if (e.element.type !== 'server-item') {
            return;
        }
        const serverEntry = e.element;
        const disposables = new DisposableStore();
        const mcpServer = this.mcpWorkbenchService.local.find(local => local.id === serverEntry.server.id) || serverEntry.server;
        // Get context menu actions from the MCP module
        const groups = getContextMenuActions(mcpServer, false, this.instantiationService);
        const actions = [];
        for (const menuActions of groups) {
            for (const menuAction of menuActions) {
                actions.push(menuAction);
                if (isDisposable(menuAction)) {
                    disposables.add(menuAction);
                }
            }
            actions.push(new Separator());
        }
        // Remove trailing separator
        if (actions.length > 0 && actions[actions.length - 1] instanceof Separator) {
            actions.pop();
        }
        this.contextMenuService.showContextMenu({
            getAnchor: () => e.anchor,
            getActions: () => actions,
            onHide: () => disposables.dispose()
        });
    }
};
McpListWidget = __decorate([
    __param(0, IInstantiationService),
    __param(1, IMcpWorkbenchService),
    __param(2, IMcpService),
    __param(3, ICommandService),
    __param(4, IOpenerService),
    __param(5, IContextViewService),
    __param(6, IContextMenuService),
    __param(7, IHoverService),
    __param(8, IAgentPluginService),
    __param(9, IDialogService)
], McpListWidget);
export { McpListWidget };
//# sourceMappingURL=mcpListWidget.js.map