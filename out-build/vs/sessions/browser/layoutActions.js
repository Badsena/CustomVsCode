/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { alert } from '../../base/browser/ui/aria/aria.js';
import { Codicon } from '../../base/common/codicons.js';
import { localize, localize2 } from '../../nls.js';
import { Categories } from '../../platform/action/common/actionCommonCategories.js';
import { Action2, MenuRegistry, registerAction2 } from '../../platform/actions/common/actions.js';
import { ContextKeyExpr } from '../../platform/contextkey/common/contextkey.js';
import { Menus } from './menus.js';
import { registerIcon } from '../../platform/theme/common/iconRegistry.js';
import { AuxiliaryBarVisibleContext, IsAuxiliaryWindowContext, IsWindowAlwaysOnTopContext, SideBarVisibleContext } from '../../workbench/common/contextkeys.js';
import { IWorkbenchLayoutService } from '../../workbench/services/layout/browser/layoutService.js';
import { SessionsWelcomeVisibleContext } from '../common/contextkeys.js';
// Register Icons
const panelLeftIcon = registerIcon('agent-panel-left', Codicon.layoutSidebarLeft, localize(2924, null));
const panelLeftOffIcon = registerIcon('agent-panel-left-off', Codicon.layoutSidebarLeftOff, localize(2925, null));
const panelRightIcon = registerIcon('agent-panel-right', Codicon.layoutSidebarRight, localize(2926, null));
const panelRightOffIcon = registerIcon('agent-panel-right-off', Codicon.layoutSidebarRightOff, localize(2927, null));
const panelCloseIcon = registerIcon('agent-panel-close', Codicon.close, localize(2928, null));
class ToggleSidebarVisibilityAction extends Action2 {
    static { this.ID = 'workbench.action.agentToggleSidebarVisibility'; }
    static { this.LABEL = localize(2929, null); }
    constructor() {
        super({
            id: ToggleSidebarVisibilityAction.ID,
            title: localize2(2942, 'Toggle Primary Side Bar Visibility'),
            icon: panelLeftOffIcon,
            toggled: {
                condition: SideBarVisibleContext,
                icon: panelLeftIcon,
                title: localize(2930, null),
                mnemonicTitle: localize(2931, null),
            },
            metadata: {
                description: localize(2932, null),
            },
            category: Categories.View,
            f1: true,
            keybinding: {
                weight: 200 /* KeybindingWeight.WorkbenchContrib */,
                primary: 2048 /* KeyMod.CtrlCmd */ | 32 /* KeyCode.KeyB */
            },
            menu: [
                {
                    id: Menus.TitleBarLeftLayout,
                    group: 'navigation',
                    order: 0,
                    when: ContextKeyExpr.and(IsAuxiliaryWindowContext.toNegated(), SessionsWelcomeVisibleContext.toNegated())
                },
                {
                    id: Menus.TitleBarContext,
                    group: 'navigation',
                    order: 0,
                    when: IsAuxiliaryWindowContext.toNegated()
                }
            ]
        });
    }
    run(accessor) {
        const layoutService = accessor.get(IWorkbenchLayoutService);
        const isCurrentlyVisible = layoutService.isVisible("workbench.parts.sidebar" /* Parts.SIDEBAR_PART */);
        layoutService.setPartHidden(isCurrentlyVisible, "workbench.parts.sidebar" /* Parts.SIDEBAR_PART */);
        // Announce visibility change to screen readers
        const alertMessage = isCurrentlyVisible
            ? localize(2933, null)
            : localize(2934, null);
        alert(alertMessage);
    }
}
class ToggleSecondarySidebarVisibilityAction extends Action2 {
    static { this.ID = 'workbench.action.agentToggleSecondarySidebarVisibility'; }
    static { this.LABEL = localize(2935, null); }
    constructor() {
        super({
            id: ToggleSecondarySidebarVisibilityAction.ID,
            title: localize2(2943, 'Toggle Secondary Side Bar Visibility'),
            icon: panelRightOffIcon,
            toggled: {
                condition: AuxiliaryBarVisibleContext,
                icon: panelRightIcon,
                title: localize(2936, null),
                mnemonicTitle: localize(2937, null),
            },
            metadata: {
                description: localize(2938, null),
            },
            category: Categories.View,
            f1: true,
            menu: [
                {
                    id: Menus.TitleBarRightLayout,
                    group: 'navigation',
                    order: 10,
                    when: ContextKeyExpr.and(IsAuxiliaryWindowContext.toNegated(), SessionsWelcomeVisibleContext.toNegated())
                },
                {
                    id: Menus.TitleBarContext,
                    order: 1,
                    when: IsAuxiliaryWindowContext.toNegated()
                }
            ]
        });
    }
    run(accessor) {
        const layoutService = accessor.get(IWorkbenchLayoutService);
        const isCurrentlyVisible = layoutService.isVisible("workbench.parts.auxiliarybar" /* Parts.AUXILIARYBAR_PART */);
        layoutService.setPartHidden(isCurrentlyVisible, "workbench.parts.auxiliarybar" /* Parts.AUXILIARYBAR_PART */);
        // Announce visibility change to screen readers
        const alertMessage = isCurrentlyVisible
            ? localize(2939, null)
            : localize(2940, null);
        alert(alertMessage);
    }
}
class TogglePanelVisibilityAction extends Action2 {
    static { this.ID = 'workbench.action.agentTogglePanelVisibility'; }
    constructor() {
        super({
            id: TogglePanelVisibilityAction.ID,
            title: localize2(2944, 'Toggle Panel Visibility'),
            category: Categories.View,
            f1: true,
            icon: panelCloseIcon,
            menu: [
                {
                    id: Menus.PanelTitle,
                    group: 'navigation',
                    order: 2,
                    when: IsAuxiliaryWindowContext.toNegated()
                }
            ]
        });
    }
    run(accessor) {
        const layoutService = accessor.get(IWorkbenchLayoutService);
        layoutService.setPartHidden(layoutService.isVisible("workbench.parts.panel" /* Parts.PANEL_PART */), "workbench.parts.panel" /* Parts.PANEL_PART */);
    }
}
registerAction2(ToggleSidebarVisibilityAction);
registerAction2(ToggleSecondarySidebarVisibilityAction);
registerAction2(TogglePanelVisibilityAction);
// Floating window controls: always-on-top
MenuRegistry.appendMenuItem(Menus.TitleBarRightLayout, {
    command: {
        id: 'workbench.action.toggleWindowAlwaysOnTop',
        title: localize(2941, null),
        icon: Codicon.pin,
        toggled: {
            condition: IsWindowAlwaysOnTopContext,
            icon: Codicon.pinned,
        },
    },
    when: IsAuxiliaryWindowContext,
    group: 'navigation',
    order: 0
});
//# sourceMappingURL=layoutActions.js.map