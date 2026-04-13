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
var AuxiliaryBarPart_1;
import '../../../workbench/browser/parts/auxiliarybar/media/auxiliaryBarPart.css';
import { IContextKeyService } from '../../../platform/contextkey/common/contextkey.js';
import { IContextMenuService } from '../../../platform/contextview/browser/contextView.js';
import { IInstantiationService } from '../../../platform/instantiation/common/instantiation.js';
import { IKeybindingService } from '../../../platform/keybinding/common/keybinding.js';
import { INotificationService } from '../../../platform/notification/common/notification.js';
import { IStorageService } from '../../../platform/storage/common/storage.js';
import { IThemeService } from '../../../platform/theme/common/themeService.js';
import { ActiveAuxiliaryContext, AuxiliaryBarFocusContext } from '../../../workbench/common/contextkeys.js';
import { ACTIVITY_BAR_BADGE_BACKGROUND, ACTIVITY_BAR_BADGE_FOREGROUND, ACTIVITY_BAR_TOP_ACTIVE_BORDER, ACTIVITY_BAR_TOP_DRAG_AND_DROP_BORDER, ACTIVITY_BAR_TOP_FOREGROUND, ACTIVITY_BAR_TOP_INACTIVE_FOREGROUND, PANEL_ACTIVE_TITLE_BORDER, PANEL_ACTIVE_TITLE_FOREGROUND, PANEL_DRAG_AND_DROP_BORDER, PANEL_INACTIVE_TITLE_FOREGROUND, SIDE_BAR_BACKGROUND, SIDE_BAR_TITLE_BORDER, SIDE_BAR_FOREGROUND } from '../../../workbench/common/theme.js';
import { contrastBorder } from '../../../platform/theme/common/colorRegistry.js';
import { sessionsSidebarBorder } from '../../common/theme.js';
import { IViewDescriptorService } from '../../../workbench/common/views.js';
import { IExtensionService } from '../../../workbench/services/extensions/common/extensions.js';
import { IWorkbenchLayoutService } from '../../../workbench/services/layout/browser/layoutService.js';
import { assertReturnsDefined } from '../../../base/common/types.js';
import { AbstractPaneCompositePart, CompositeBarPosition } from '../../../workbench/browser/parts/paneCompositePart.js';
import { Part } from '../../../workbench/browser/part.js';
import { IMenuService, MenuId, MenuItemAction } from '../../../platform/actions/common/actions.js';
import { Menus } from '../menus.js';
import { IHoverService } from '../../../platform/hover/browser/hover.js';
import { DropdownWithPrimaryActionViewItem } from '../../../platform/actions/browser/dropdownWithPrimaryActionViewItem.js';
import { getFlatContextMenuActions } from '../../../platform/actions/browser/menuEntryActionViewItem.js';
import { MutableDisposable } from '../../../base/common/lifecycle.js';
import { Extensions } from '../../../workbench/browser/panecomposite.js';
/**
 * Auxiliary bar part specifically for agent sessions workbench.
 * This is a simplified version of the AuxiliaryBarPart for agent session contexts.
 */
let AuxiliaryBarPart = class AuxiliaryBarPart extends AbstractPaneCompositePart {
    static { AuxiliaryBarPart_1 = this; }
    static { this.activeViewSettingsKey = 'workbench.agentsession.auxiliarybar.activepanelid'; }
    static { this.pinnedViewsKey = 'workbench.agentsession.auxiliarybar.pinnedPanels'; }
    static { this.placeholderViewContainersKey = 'workbench.agentsession.auxiliarybar.placeholderPanels'; }
    static { this.viewContainersWorkspaceStateKey = 'workbench.agentsession.auxiliarybar.viewContainersWorkspaceState'; }
    /** Visual margin values for the card-like appearance */
    static { this.MARGIN_TOP = 8; }
    static { this.MARGIN_BOTTOM = 8; }
    static { this.MARGIN_RIGHT = 8; }
    // Action ID for run script - defined here to avoid layering issues
    static { this.RUN_SCRIPT_ACTION_ID = 'workbench.action.agentSessions.runScript'; }
    static { this.RUN_SCRIPT_DROPDOWN_MENU_ID = MenuId.for('AgentSessionsRunScriptDropdown'); }
    get preferredHeight() {
        return this.layoutService.mainContainerDimension.height * 0.4;
    }
    get preferredWidth() {
        const activeComposite = this.getActivePaneComposite();
        if (!activeComposite) {
            return undefined;
        }
        const width = activeComposite.getOptimalWidth();
        if (typeof width !== 'number') {
            return undefined;
        }
        return Math.max(width, 340);
    }
    constructor(notificationService, storageService, contextMenuService, layoutService, keybindingService, hoverService, instantiationService, themeService, viewDescriptorService, contextKeyService, extensionService, menuService) {
        super("workbench.parts.auxiliarybar" /* Parts.AUXILIARYBAR_PART */, {
            hasTitle: true,
            trailingSeparator: false,
            borderWidth: () => (this.getColor(sessionsSidebarBorder) || this.getColor(contrastBorder)) ? 1 : 0,
        }, AuxiliaryBarPart_1.activeViewSettingsKey, ActiveAuxiliaryContext.bindTo(contextKeyService), AuxiliaryBarFocusContext.bindTo(contextKeyService), 'auxiliarybar', 'auxiliarybar', undefined, SIDE_BAR_TITLE_BORDER, 2 /* ViewContainerLocation.AuxiliaryBar */, Extensions.Auxiliary, Menus.AuxiliaryBarTitle, Menus.AuxiliaryBarTitleLeft, notificationService, storageService, contextMenuService, layoutService, keybindingService, hoverService, instantiationService, themeService, viewDescriptorService, contextKeyService, extensionService, menuService);
        // Run script dropdown management
        this._runScriptDropdown = this._register(new MutableDisposable());
        this._runScriptMenu = this._register(new MutableDisposable());
        this._runScriptMenuListener = this._register(new MutableDisposable());
        // Use the side bar dimensions
        this.minimumWidth = 170;
        this.maximumWidth = Number.POSITIVE_INFINITY;
        this.minimumHeight = 0;
        this.maximumHeight = Number.POSITIVE_INFINITY;
        this.priority = 1 /* LayoutPriority.Low */;
    }
    updateStyles() {
        super.updateStyles();
        const container = assertReturnsDefined(this.getContainer());
        // Store background and border as CSS variables for the card styling on .part
        container.style.setProperty('--part-background', this.getColor(SIDE_BAR_BACKGROUND) || '');
        container.style.setProperty('--part-border-color', this.getColor(sessionsSidebarBorder) || this.getColor(contrastBorder) || 'transparent');
        container.style.backgroundColor = 'transparent';
        container.style.color = this.getColor(SIDE_BAR_FOREGROUND) || '';
        // Clear borders - the card appearance uses border-radius instead
        container.style.borderLeftColor = '';
        container.style.borderRightColor = '';
        container.style.borderLeftStyle = '';
        container.style.borderRightStyle = '';
        container.style.borderLeftWidth = '';
        container.style.borderRightWidth = '';
    }
    getCompositeBarOptions() {
        const $this = this;
        return {
            partContainerClass: 'auxiliarybar',
            pinnedViewContainersKey: AuxiliaryBarPart_1.pinnedViewsKey,
            placeholderViewContainersKey: AuxiliaryBarPart_1.placeholderViewContainersKey,
            viewContainersWorkspaceStateKey: AuxiliaryBarPart_1.viewContainersWorkspaceStateKey,
            icon: false,
            orientation: 0 /* ActionsOrientation.HORIZONTAL */,
            recomputeSizes: true,
            activityHoverOptions: {
                position: () => this.getCompositeBarPosition() === CompositeBarPosition.BOTTOM ? 3 /* HoverPosition.ABOVE */ : 2 /* HoverPosition.BELOW */,
            },
            fillExtraContextMenuActions: actions => this.fillExtraContextMenuActions(actions),
            compositeSize: 0,
            iconSize: 16,
            get overflowActionSize() { return $this.getCompositeBarPosition() === CompositeBarPosition.TITLE ? 40 : 30; },
            colors: theme => ({
                activeBackgroundColor: theme.getColor(SIDE_BAR_BACKGROUND),
                inactiveBackgroundColor: theme.getColor(SIDE_BAR_BACKGROUND),
                get activeBorderBottomColor() { return $this.getCompositeBarPosition() === CompositeBarPosition.TITLE ? theme.getColor(PANEL_ACTIVE_TITLE_BORDER) : theme.getColor(ACTIVITY_BAR_TOP_ACTIVE_BORDER); },
                get activeForegroundColor() { return $this.getCompositeBarPosition() === CompositeBarPosition.TITLE ? theme.getColor(PANEL_ACTIVE_TITLE_FOREGROUND) : theme.getColor(ACTIVITY_BAR_TOP_FOREGROUND); },
                get inactiveForegroundColor() { return $this.getCompositeBarPosition() === CompositeBarPosition.TITLE ? theme.getColor(PANEL_INACTIVE_TITLE_FOREGROUND) : theme.getColor(ACTIVITY_BAR_TOP_INACTIVE_FOREGROUND); },
                badgeBackground: theme.getColor(ACTIVITY_BAR_BADGE_BACKGROUND),
                badgeForeground: theme.getColor(ACTIVITY_BAR_BADGE_FOREGROUND),
                get dragAndDropBorder() { return $this.getCompositeBarPosition() === CompositeBarPosition.TITLE ? theme.getColor(PANEL_DRAG_AND_DROP_BORDER) : theme.getColor(ACTIVITY_BAR_TOP_DRAG_AND_DROP_BORDER); }
            }),
            compact: true
        };
    }
    actionViewItemProvider(action, options) {
        // Create a DropdownWithPrimaryActionViewItem for the run script action
        if (action.id === AuxiliaryBarPart_1.RUN_SCRIPT_ACTION_ID && action instanceof MenuItemAction) {
            // Create and store the menu so we can listen for changes
            if (!this._runScriptMenu.value) {
                this._runScriptMenu.value = this.menuService.createMenu(AuxiliaryBarPart_1.RUN_SCRIPT_DROPDOWN_MENU_ID, this.contextKeyService);
                this._runScriptMenuListener.value = this._runScriptMenu.value.onDidChange(() => this._updateRunScriptDropdown());
            }
            const dropdownActions = this._getRunScriptDropdownActions();
            const dropdownAction = {
                id: 'runScriptDropdown',
                label: '',
                tooltip: '',
                class: undefined,
                enabled: true,
                run: () => { }
            };
            this._runScriptDropdown.value = this.instantiationService.createInstance(DropdownWithPrimaryActionViewItem, action, dropdownAction, dropdownActions, '', {
                hoverDelegate: options.hoverDelegate,
                getKeyBinding: (action) => this.keybindingService.lookupKeybinding(action.id, this.contextKeyService)
            });
            return this._runScriptDropdown.value;
        }
        return super.actionViewItemProvider(action, options);
    }
    _getRunScriptDropdownActions() {
        if (!this._runScriptMenu.value) {
            return [];
        }
        return getFlatContextMenuActions(this._runScriptMenu.value.getActions({ shouldForwardArgs: true }));
    }
    _updateRunScriptDropdown() {
        if (this._runScriptDropdown.value) {
            const dropdownActions = this._getRunScriptDropdownActions();
            const dropdownAction = {
                id: 'runScriptDropdown',
                label: '',
                tooltip: '',
                class: undefined,
                enabled: true,
                run: () => { }
            };
            this._runScriptDropdown.value.update(dropdownAction, dropdownActions);
        }
    }
    fillExtraContextMenuActions(_actions) { }
    shouldShowCompositeBar() {
        return true;
    }
    getCompositeBarPosition() {
        return CompositeBarPosition.TITLE;
    }
    layout(width, height, top, left) {
        if (!this.layoutService.isVisible("workbench.parts.auxiliarybar" /* Parts.AUXILIARYBAR_PART */)) {
            return;
        }
        // Layout content with reduced dimensions to account for visual margins
        super.layout(width - AuxiliaryBarPart_1.MARGIN_RIGHT, height - AuxiliaryBarPart_1.MARGIN_TOP - AuxiliaryBarPart_1.MARGIN_BOTTOM, top, left);
        // Restore the full grid-allocated dimensions so that Part.relayout() works correctly.
        // Part.layout() only stores _dimension and _contentPosition - no other side effects.
        Part.prototype.layout.call(this, width, height, top, left);
    }
    toJSON() {
        return {
            type: "workbench.parts.auxiliarybar" /* Parts.AUXILIARYBAR_PART */
        };
    }
};
AuxiliaryBarPart = AuxiliaryBarPart_1 = __decorate([
    __param(0, INotificationService),
    __param(1, IStorageService),
    __param(2, IContextMenuService),
    __param(3, IWorkbenchLayoutService),
    __param(4, IKeybindingService),
    __param(5, IHoverService),
    __param(6, IInstantiationService),
    __param(7, IThemeService),
    __param(8, IViewDescriptorService),
    __param(9, IContextKeyService),
    __param(10, IExtensionService),
    __param(11, IMenuService)
], AuxiliaryBarPart);
export { AuxiliaryBarPart };
//# sourceMappingURL=auxiliaryBarPart.js.map