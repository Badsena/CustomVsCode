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
import '../../../browser/media/sidebarActionButton.css';
import './media/customizationsToolbar.css';
import * as DOM from '../../../../base/browser/dom.js';
import { Codicon } from '../../../../base/common/codicons.js';
import { Disposable, MutableDisposable } from '../../../../base/common/lifecycle.js';
import { autorun } from '../../../../base/common/observable.js';
import { ThemeIcon } from '../../../../base/common/themables.js';
import { localize } from '../../../../nls.js';
import { MenuWorkbenchToolBar } from '../../../../platform/actions/browser/toolbar.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { IStorageService } from '../../../../platform/storage/common/storage.js';
import { IWorkspaceContextService } from '../../../../platform/workspace/common/workspace.js';
import { Button } from '../../../../base/browser/ui/button/button.js';
import { defaultButtonStyles } from '../../../../platform/theme/browser/defaultStyles.js';
import { IPromptsService } from '../../../../workbench/contrib/chat/common/promptSyntax/service/promptsService.js';
import { IMcpService } from '../../../../workbench/contrib/mcp/common/mcpTypes.js';
import { IAICustomizationWorkspaceService } from '../../../../workbench/contrib/chat/common/aiCustomizationWorkspaceService.js';
import { Menus } from '../../../browser/menus.js';
import { getCustomizationTotalCount } from './customizationCounts.js';
import { IAgentPluginService } from '../../../../workbench/contrib/chat/common/plugins/agentPluginService.js';
const $ = DOM.$;
const CUSTOMIZATIONS_COLLAPSED_KEY = 'agentSessions.customizationsCollapsed';
let AICustomizationShortcutsWidget = class AICustomizationShortcutsWidget extends Disposable {
    constructor(container, options, instantiationService, storageService, promptsService, mcpService, workspaceContextService, workspaceService, agentPluginService) {
        super();
        this.instantiationService = instantiationService;
        this.storageService = storageService;
        this.promptsService = promptsService;
        this.mcpService = mcpService;
        this.workspaceContextService = workspaceContextService;
        this.workspaceService = workspaceService;
        this.agentPluginService = agentPluginService;
        this._render(container, options);
    }
    _render(parent, options) {
        // Get initial collapsed state
        const isCollapsed = this.storageService.getBoolean(CUSTOMIZATIONS_COLLAPSED_KEY, 0 /* StorageScope.PROFILE */, false);
        const container = DOM.append(parent, $('.ai-customization-toolbar'));
        if (isCollapsed) {
            container.classList.add('collapsed');
        }
        // Header (clickable to toggle)
        const header = DOM.append(container, $('.ai-customization-header'));
        header.classList.toggle('collapsed', isCollapsed);
        const headerButtonContainer = DOM.append(header, $('.customization-link-button-container'));
        const headerButton = this._register(new Button(headerButtonContainer, {
            ...defaultButtonStyles,
            secondary: true,
            title: false,
            supportIcons: true,
            buttonSecondaryBackground: 'transparent',
            buttonSecondaryHoverBackground: undefined,
            buttonSecondaryForeground: undefined,
            buttonSecondaryBorder: undefined,
        }));
        headerButton.element.classList.add('customization-link-button', 'sidebar-action-button');
        headerButton.element.setAttribute('aria-expanded', String(!isCollapsed));
        headerButton.label = localize(3290, null);
        const chevronContainer = DOM.append(headerButton.element, $('span.customization-link-counts'));
        const chevron = DOM.append(chevronContainer, $('.ai-customization-chevron'));
        const headerTotalCount = DOM.append(chevronContainer, $('span.ai-customization-header-total.hidden'));
        chevron.classList.add(...ThemeIcon.asClassNameArray(isCollapsed ? Codicon.chevronRight : Codicon.chevronDown));
        // Toolbar container
        const toolbarContainer = DOM.append(container, $('.ai-customization-toolbar-content.sidebar-action-list'));
        this._register(this.instantiationService.createInstance(MenuWorkbenchToolBar, toolbarContainer, Menus.SidebarCustomizations, {
            hiddenItemStrategy: -1 /* HiddenItemStrategy.NoHide */,
            toolbarOptions: { primaryGroup: () => true },
            telemetrySource: 'sidebarCustomizations',
        }));
        let updateCountRequestId = 0;
        const updateHeaderTotalCount = async () => {
            const requestId = ++updateCountRequestId;
            const totalCount = await getCustomizationTotalCount(this.promptsService, this.mcpService, this.workspaceService, this.workspaceContextService, this.agentPluginService);
            if (requestId !== updateCountRequestId) {
                return;
            }
            headerTotalCount.classList.toggle('hidden', totalCount === 0);
            headerTotalCount.textContent = `${totalCount}`;
        };
        this._register(this.promptsService.onDidChangeCustomAgents(() => updateHeaderTotalCount()));
        this._register(this.promptsService.onDidChangeSlashCommands(() => updateHeaderTotalCount()));
        this._register(this.workspaceContextService.onDidChangeWorkspaceFolders(() => updateHeaderTotalCount()));
        this._register(autorun(reader => {
            this.mcpService.servers.read(reader);
            updateHeaderTotalCount();
        }));
        this._register(autorun(reader => {
            this.workspaceService.activeProjectRoot.read(reader);
            updateHeaderTotalCount();
        }));
        updateHeaderTotalCount();
        // Toggle collapse on header click
        const transitionListener = this._register(new MutableDisposable());
        const toggleCollapse = () => {
            const collapsed = container.classList.toggle('collapsed');
            header.classList.toggle('collapsed', collapsed);
            this.storageService.store(CUSTOMIZATIONS_COLLAPSED_KEY, collapsed, 0 /* StorageScope.PROFILE */, 0 /* StorageTarget.USER */);
            headerButton.element.setAttribute('aria-expanded', String(!collapsed));
            chevron.classList.remove(...ThemeIcon.asClassNameArray(Codicon.chevronRight), ...ThemeIcon.asClassNameArray(Codicon.chevronDown));
            chevron.classList.add(...ThemeIcon.asClassNameArray(collapsed ? Codicon.chevronRight : Codicon.chevronDown));
            // Re-layout after the transition
            transitionListener.value = DOM.addDisposableListener(toolbarContainer, 'transitionend', () => {
                transitionListener.clear();
                options?.onDidToggleCollapse?.();
            });
        };
        this._register(headerButton.onDidClick(() => toggleCollapse()));
    }
};
AICustomizationShortcutsWidget = __decorate([
    __param(2, IInstantiationService),
    __param(3, IStorageService),
    __param(4, IPromptsService),
    __param(5, IMcpService),
    __param(6, IWorkspaceContextService),
    __param(7, IAICustomizationWorkspaceService),
    __param(8, IAgentPluginService)
], AICustomizationShortcutsWidget);
export { AICustomizationShortcutsWidget };
//# sourceMappingURL=aiCustomizationShortcutsWidget.js.map