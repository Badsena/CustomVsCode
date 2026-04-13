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
var SidebarPart_1;
import '../../../workbench/browser/parts/sidebar/media/sidebarpart.css';
import './media/sidebarPart.css';
import { IWorkbenchLayoutService } from '../../../workbench/services/layout/browser/layoutService.js';
import { SidebarFocusContext, ActiveViewletContext } from '../../../workbench/common/contextkeys.js';
import { IStorageService } from '../../../platform/storage/common/storage.js';
import { IContextMenuService } from '../../../platform/contextview/browser/contextView.js';
import { IKeybindingService } from '../../../platform/keybinding/common/keybinding.js';
import { IInstantiationService } from '../../../platform/instantiation/common/instantiation.js';
import { IThemeService } from '../../../platform/theme/common/themeService.js';
import { SIDE_BAR_TITLE_FOREGROUND, SIDE_BAR_TITLE_BORDER, SIDE_BAR_BACKGROUND, SIDE_BAR_FOREGROUND, SIDE_BAR_DRAG_AND_DROP_BACKGROUND, ACTIVITY_BAR_BADGE_BACKGROUND, ACTIVITY_BAR_BADGE_FOREGROUND, ACTIVITY_BAR_TOP_FOREGROUND, ACTIVITY_BAR_TOP_ACTIVE_BORDER, ACTIVITY_BAR_TOP_INACTIVE_FOREGROUND, ACTIVITY_BAR_TOP_DRAG_AND_DROP_BORDER } from '../../../workbench/common/theme.js';
import { contrastBorder } from '../../../platform/theme/common/colorRegistry.js';
import { sessionsSidebarBorder, sessionsSidebarHeaderBackground, sessionsSidebarHeaderForeground } from '../../common/theme.js';
import { INotificationService } from '../../../platform/notification/common/notification.js';
import { IContextKeyService } from '../../../platform/contextkey/common/contextkey.js';
import { IExtensionService } from '../../../workbench/services/extensions/common/extensions.js';
import { assertReturnsDefined } from '../../../base/common/types.js';
import { IViewDescriptorService } from '../../../workbench/common/views.js';
import { AbstractPaneCompositePart, CompositeBarPosition } from '../../../workbench/browser/parts/paneCompositePart.js';
import { Part } from '../../../workbench/browser/part.js';
import { IMenuService } from '../../../platform/actions/common/actions.js';
import { Separator } from '../../../base/common/actions.js';
import { IHoverService } from '../../../platform/hover/browser/hover.js';
import { Extensions } from '../../../workbench/browser/panecomposite.js';
import { Menus } from '../menus.js';
import { $, append, getWindowId, prepend } from '../../../base/browser/dom.js';
import { MenuWorkbenchToolBar } from '../../../platform/actions/browser/toolbar.js';
import { isMacintosh, isNative } from '../../../base/common/platform.js';
import { isFullscreen, onDidChangeFullscreen } from '../../../base/browser/browser.js';
import { mainWindow } from '../../../base/browser/window.js';
import { IConfigurationService } from '../../../platform/configuration/common/configuration.js';
import { hasNativeTitlebar, getTitleBarStyle } from '../../../platform/window/common/window.js';
/**
 * Sidebar part specifically for agent sessions workbench.
 * This is a simplified version of the SidebarPart for agent session contexts.
 */
let SidebarPart = class SidebarPart extends AbstractPaneCompositePart {
    static { SidebarPart_1 = this; }
    static { this.activeViewletSettingsKey = 'workbench.agentsession.sidebar.activeviewletid'; }
    static { this.pinnedViewContainersKey = 'workbench.agentsession.pinnedViewlets2'; }
    static { this.placeholderViewContainersKey = 'workbench.agentsession.placeholderViewlets'; }
    static { this.viewContainersWorkspaceStateKey = 'workbench.agentsession.viewletsWorkspaceState'; }
    /** Visual margin values - sidebar is flush (no card appearance) */
    static { this.MARGIN_TOP = 0; }
    static { this.MARGIN_BOTTOM = 0; }
    static { this.MARGIN_LEFT = 0; }
    static { this.FOOTER_ITEM_HEIGHT = 26; }
    static { this.FOOTER_ITEM_GAP = 4; }
    static { this.FOOTER_VERTICAL_PADDING = 6; }
    get snap() { return true; }
    get preferredWidth() {
        const viewlet = this.getActivePaneComposite();
        if (!viewlet) {
            return undefined;
        }
        const width = viewlet.getOptimalWidth();
        if (typeof width !== 'number') {
            return undefined;
        }
        return Math.max(width, 300);
    }
    //#endregion
    constructor(notificationService, storageService, contextMenuService, layoutService, keybindingService, hoverService, instantiationService, themeService, viewDescriptorService, contextKeyService, extensionService, menuService, configurationService) {
        super("workbench.parts.sidebar" /* Parts.SIDEBAR_PART */, { hasTitle: true, trailingSeparator: false, borderWidth: () => (this.getColor(sessionsSidebarBorder) || this.getColor(contrastBorder)) ? 1 : 0 }, SidebarPart_1.activeViewletSettingsKey, ActiveViewletContext.bindTo(contextKeyService), SidebarFocusContext.bindTo(contextKeyService), 'sideBar', 'viewlet', SIDE_BAR_TITLE_FOREGROUND, SIDE_BAR_TITLE_BORDER, 0 /* ViewContainerLocation.Sidebar */, Extensions.Viewlets, Menus.SidebarTitle, Menus.TitleBarLeftLayout, notificationService, storageService, contextMenuService, layoutService, keybindingService, hoverService, instantiationService, themeService, viewDescriptorService, contextKeyService, extensionService, menuService);
        this.configurationService = configurationService;
        //#region IView
        this.minimumWidth = 170;
        this.maximumWidth = Number.POSITIVE_INFINITY;
        this.minimumHeight = 0;
        this.maximumHeight = Number.POSITIVE_INFINITY;
        this.priority = 1 /* LayoutPriority.Low */;
    }
    create(parent) {
        super.create(parent);
        this.createFooter(parent);
    }
    createTitleArea(parent) {
        const titleArea = super.createTitleArea(parent);
        this.sideBarTitleArea = titleArea;
        if (titleArea) {
            // Add a drag region so the sidebar title area can be used to move the window,
            // matching the titlebar's drag behavior.
            prepend(titleArea, $('div.titlebar-drag-region'));
        }
        // macOS native: the sidebar spans full height and the traffic lights
        // overlay the top-left corner. Add a fixed-width spacer inside the
        // title area to push content horizontally past the traffic lights.
        if (titleArea && isMacintosh && isNative && !hasNativeTitlebar(this.configurationService, getTitleBarStyle(this.configurationService))) {
            const spacer = $('div.window-controls-container');
            spacer.style.width = '70px';
            spacer.style.height = '100%';
            spacer.style.flexShrink = '0';
            spacer.style.order = '-1'; // match global-actions-left order so DOM order is respected
            prepend(titleArea, spacer);
            // Hide spacer in fullscreen (traffic lights are not shown)
            const updateSpacerVisibility = () => {
                spacer.style.display = isFullscreen(mainWindow) ? 'none' : '';
            };
            updateSpacerVisibility();
            this._register(onDidChangeFullscreen(windowId => {
                if (windowId === getWindowId(mainWindow)) {
                    updateSpacerVisibility();
                }
            }));
        }
        return titleArea;
    }
    createFooter(parent) {
        const footer = append(parent, $('.sidebar-footer.sidebar-action-list'));
        this.footerContainer = footer;
        this.footerToolbar = this._register(this.instantiationService.createInstance(MenuWorkbenchToolBar, footer, Menus.SidebarFooter, {
            hiddenItemStrategy: -1 /* HiddenItemStrategy.NoHide */,
            toolbarOptions: { primaryGroup: () => true },
            telemetrySource: 'sidebarFooter',
        }));
        this._register(this.footerToolbar.onDidChangeMenuItems(() => {
            if (this.previousLayoutDimensions) {
                const { width, height, top, left } = this.previousLayoutDimensions;
                this.layout(width, height, top, left);
            }
        }));
    }
    getFooterHeight() {
        const actionCount = this.footerToolbar?.getItemsLength() ?? 0;
        if (actionCount === 0) {
            return 0;
        }
        return SidebarPart_1.FOOTER_VERTICAL_PADDING * 2
            + (actionCount * SidebarPart_1.FOOTER_ITEM_HEIGHT)
            + ((actionCount - 1) * SidebarPart_1.FOOTER_ITEM_GAP);
    }
    updateFooterVisibility() {
        const footer = this.footerContainer;
        if (!footer) {
            return;
        }
        footer.style.display = this.getFooterHeight() > 0 ? '' : 'none';
    }
    updateStyles() {
        super.updateStyles();
        const container = assertReturnsDefined(this.getContainer());
        container.style.backgroundColor = this.getColor(SIDE_BAR_BACKGROUND) || '';
        container.style.color = this.getColor(SIDE_BAR_FOREGROUND) || '';
        container.style.outlineColor = this.getColor(SIDE_BAR_DRAG_AND_DROP_BACKGROUND) ?? '';
        // Right border to separate from the right section
        const borderColor = this.getColor(sessionsSidebarBorder) || this.getColor(contrastBorder) || '';
        container.style.borderRightWidth = borderColor ? '1px' : '';
        container.style.borderRightStyle = borderColor ? 'solid' : '';
        container.style.borderRightColor = borderColor;
        // Title area uses sessions-specific header colors
        if (this.sideBarTitleArea) {
            this.sideBarTitleArea.style.backgroundColor = this.getColor(sessionsSidebarHeaderBackground) || '';
            this.sideBarTitleArea.style.color = this.getColor(sessionsSidebarHeaderForeground) || '';
        }
    }
    layout(width, height, top, left) {
        this.previousLayoutDimensions = { width, height, top, left };
        if (!this.layoutService.isVisible("workbench.parts.sidebar" /* Parts.SIDEBAR_PART */)) {
            return;
        }
        this.updateFooterVisibility();
        const footerHeight = Math.min(height, this.getFooterHeight());
        // Layout content with reduced height to account for footer
        super.layout(width, height - footerHeight, top, left);
        // Restore the full grid-allocated dimensions so that Part.relayout() works correctly.
        Part.prototype.layout.call(this, width, height, top, left);
    }
    getTitleAreaDropDownAnchorAlignment() {
        return this.layoutService.getSideBarPosition() === 0 /* SideBarPosition.LEFT */ ? 0 /* AnchorAlignment.LEFT */ : 1 /* AnchorAlignment.RIGHT */;
    }
    createTitleLabel(_parent) {
        // No title label in agent sessions sidebar
        return {
            updateTitle: () => { },
            updateStyles: () => { }
        };
    }
    getCompositeBarOptions() {
        return {
            partContainerClass: 'sidebar',
            pinnedViewContainersKey: SidebarPart_1.pinnedViewContainersKey,
            placeholderViewContainersKey: SidebarPart_1.placeholderViewContainersKey,
            viewContainersWorkspaceStateKey: SidebarPart_1.viewContainersWorkspaceStateKey,
            icon: false,
            orientation: 0 /* ActionsOrientation.HORIZONTAL */,
            recomputeSizes: true,
            activityHoverOptions: {
                position: () => this.getCompositeBarPosition() === CompositeBarPosition.BOTTOM ? 3 /* HoverPosition.ABOVE */ : 2 /* HoverPosition.BELOW */,
            },
            fillExtraContextMenuActions: actions => {
                if (this.getCompositeBarPosition() === CompositeBarPosition.TITLE) {
                    const viewsSubmenuAction = this.getViewsSubmenuAction();
                    if (viewsSubmenuAction) {
                        actions.push(new Separator());
                        actions.push(viewsSubmenuAction);
                    }
                }
            },
            compositeSize: 0,
            iconSize: 16,
            overflowActionSize: 30,
            colors: theme => ({
                activeBackgroundColor: theme.getColor(SIDE_BAR_BACKGROUND),
                inactiveBackgroundColor: theme.getColor(SIDE_BAR_BACKGROUND),
                activeBorderBottomColor: theme.getColor(ACTIVITY_BAR_TOP_ACTIVE_BORDER),
                activeForegroundColor: theme.getColor(ACTIVITY_BAR_TOP_FOREGROUND),
                inactiveForegroundColor: theme.getColor(ACTIVITY_BAR_TOP_INACTIVE_FOREGROUND),
                badgeBackground: theme.getColor(ACTIVITY_BAR_BADGE_BACKGROUND),
                badgeForeground: theme.getColor(ACTIVITY_BAR_BADGE_FOREGROUND),
                dragAndDropBorder: theme.getColor(ACTIVITY_BAR_TOP_DRAG_AND_DROP_BORDER)
            }),
            compact: true
        };
    }
    shouldShowCompositeBar() {
        return false;
    }
    getCompositeBarPosition() {
        return CompositeBarPosition.TITLE;
    }
    async focusActivityBar() {
        if (this.shouldShowCompositeBar()) {
            this.focusCompositeBar();
        }
    }
    toJSON() {
        return {
            type: "workbench.parts.sidebar" /* Parts.SIDEBAR_PART */
        };
    }
};
SidebarPart = SidebarPart_1 = __decorate([
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
    __param(11, IMenuService),
    __param(12, IConfigurationService)
], SidebarPart);
export { SidebarPart };
//# sourceMappingURL=sidebarPart.js.map