/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { localize, localize2 } from '../../../../nls.js';
import { ContextKeyExpr } from '../../../../platform/contextkey/common/contextkey.js';
import { Action2, registerAction2, MenuId } from '../../../../platform/actions/common/actions.js';
import { ACTIVE_GROUP, IEditorService, SIDE_GROUP } from '../../../services/editor/common/editorService.js';
import { Codicon } from '../../../../base/common/codicons.js';
import { BrowserEditor, CONTEXT_BROWSER_CAN_GO_BACK, CONTEXT_BROWSER_CAN_GO_FORWARD, CONTEXT_BROWSER_DEVTOOLS_OPEN, CONTEXT_BROWSER_FOCUSED, CONTEXT_BROWSER_HAS_ERROR, CONTEXT_BROWSER_HAS_URL, CONTEXT_BROWSER_STORAGE_SCOPE, CONTEXT_BROWSER_FIND_WIDGET_FOCUSED, CONTEXT_BROWSER_FIND_WIDGET_VISIBLE } from './browserEditor.js';
import { BrowserViewUri } from '../../../../platform/browserView/common/browserViewUri.js';
import { generateUuid } from '../../../../base/common/uuid.js';
import { IBrowserViewWorkbenchService } from '../common/browserView.js';
import { BrowserViewCommandId, BrowserViewStorageScope } from '../../../../platform/browserView/common/browserView.js';
import { IOpenerService } from '../../../../platform/opener/common/opener.js';
import { IPreferencesService } from '../../../services/preferences/common/preferences.js';
import { ITelemetryService } from '../../../../platform/telemetry/common/telemetry.js';
import { logBrowserOpen } from '../../../../platform/browserView/common/browserViewTelemetry.js';
import { BrowserEditorInput } from '../common/browserEditorInput.js';
import { ToggleTitleBarConfigAction } from '../../../browser/parts/titlebar/titlebarActions.js';
// Context key expression to check if browser editor is active
export const BROWSER_EDITOR_ACTIVE = ContextKeyExpr.equals('activeEditor', BrowserEditorInput.EDITOR_ID);
export const BrowserActionCategory = localize2(5558, "Browser");
export var BrowserActionGroup;
(function (BrowserActionGroup) {
    BrowserActionGroup["Tabs"] = "1_tabs";
    BrowserActionGroup["Zoom"] = "2_zoom";
    BrowserActionGroup["Page"] = "3_page";
    BrowserActionGroup["Settings"] = "4_settings";
})(BrowserActionGroup || (BrowserActionGroup = {}));
class OpenIntegratedBrowserAction extends Action2 {
    constructor() {
        super({
            id: BrowserViewCommandId.Open,
            title: localize2(5559, "Open Integrated Browser"),
            category: BrowserActionCategory,
            icon: Codicon.globe,
            f1: true,
            menu: {
                id: MenuId.TitleBar,
                group: 'navigation',
                order: 10,
                when: ContextKeyExpr.equals('config.workbench.browser.showInTitleBar', true)
            }
        });
    }
    async run(accessor, urlOrOptions) {
        const editorService = accessor.get(IEditorService);
        const telemetryService = accessor.get(ITelemetryService);
        // Parse arguments
        const options = typeof urlOrOptions === 'string' ? { url: urlOrOptions } : (urlOrOptions ?? {});
        const resource = BrowserViewUri.forId(generateUuid());
        const group = options.openToSide ? SIDE_GROUP : ACTIVE_GROUP;
        logBrowserOpen(telemetryService, options.url ? 'commandWithUrl' : 'commandWithoutUrl');
        const editorPane = await editorService.openEditor({ resource, options: { viewState: { url: options.url } } }, group);
        // Lock the group when opening to the side
        if (options.openToSide && editorPane?.group) {
            editorPane.group.lock(true);
        }
    }
}
class NewTabAction extends Action2 {
    constructor() {
        super({
            id: BrowserViewCommandId.NewTab,
            title: localize2(5560, "New Tab"),
            category: BrowserActionCategory,
            f1: true,
            precondition: BROWSER_EDITOR_ACTIVE,
            menu: {
                id: MenuId.BrowserActionsToolbar,
                group: BrowserActionGroup.Tabs,
                order: 1,
            },
            // When already in a browser, Ctrl/Cmd + T opens a new tab
            keybinding: {
                weight: 200 /* KeybindingWeight.WorkbenchContrib */ + 50, // Priority over search actions
                primary: 2048 /* KeyMod.CtrlCmd */ | 50 /* KeyCode.KeyT */,
            }
        });
    }
    async run(accessor, _browserEditor = accessor.get(IEditorService).activeEditorPane) {
        const editorService = accessor.get(IEditorService);
        const telemetryService = accessor.get(ITelemetryService);
        const resource = BrowserViewUri.forId(generateUuid());
        logBrowserOpen(telemetryService, 'newTabCommand');
        await editorService.openEditor({ resource });
    }
}
class GoBackAction extends Action2 {
    static { this.ID = BrowserViewCommandId.GoBack; }
    constructor() {
        super({
            id: GoBackAction.ID,
            title: localize2(5561, 'Go Back'),
            category: BrowserActionCategory,
            icon: Codicon.arrowLeft,
            f1: true,
            precondition: ContextKeyExpr.and(BROWSER_EDITOR_ACTIVE, CONTEXT_BROWSER_CAN_GO_BACK),
            menu: {
                id: MenuId.BrowserNavigationToolbar,
                group: 'navigation',
                order: 1,
            },
            keybinding: {
                weight: 200 /* KeybindingWeight.WorkbenchContrib */ + 50, // Priority over editor navigation
                primary: 512 /* KeyMod.Alt */ | 15 /* KeyCode.LeftArrow */,
                secondary: [122 /* KeyCode.BrowserBack */],
                mac: { primary: 2048 /* KeyMod.CtrlCmd */ | 92 /* KeyCode.BracketLeft */, secondary: [122 /* KeyCode.BrowserBack */, 2048 /* KeyMod.CtrlCmd */ | 15 /* KeyCode.LeftArrow */] }
            }
        });
    }
    async run(accessor, browserEditor = accessor.get(IEditorService).activeEditorPane) {
        if (browserEditor instanceof BrowserEditor) {
            await browserEditor.goBack();
        }
    }
}
class GoForwardAction extends Action2 {
    static { this.ID = BrowserViewCommandId.GoForward; }
    constructor() {
        super({
            id: GoForwardAction.ID,
            title: localize2(5562, 'Go Forward'),
            category: BrowserActionCategory,
            icon: Codicon.arrowRight,
            f1: true,
            precondition: ContextKeyExpr.and(BROWSER_EDITOR_ACTIVE, CONTEXT_BROWSER_CAN_GO_FORWARD),
            menu: {
                id: MenuId.BrowserNavigationToolbar,
                group: 'navigation',
                order: 2,
            },
            keybinding: {
                weight: 200 /* KeybindingWeight.WorkbenchContrib */ + 50, // Priority over editor navigation
                primary: 512 /* KeyMod.Alt */ | 17 /* KeyCode.RightArrow */,
                secondary: [123 /* KeyCode.BrowserForward */],
                mac: { primary: 2048 /* KeyMod.CtrlCmd */ | 94 /* KeyCode.BracketRight */, secondary: [123 /* KeyCode.BrowserForward */, 2048 /* KeyMod.CtrlCmd */ | 17 /* KeyCode.RightArrow */] }
            }
        });
    }
    async run(accessor, browserEditor = accessor.get(IEditorService).activeEditorPane) {
        if (browserEditor instanceof BrowserEditor) {
            await browserEditor.goForward();
        }
    }
}
class ReloadAction extends Action2 {
    static { this.ID = BrowserViewCommandId.Reload; }
    constructor() {
        super({
            id: ReloadAction.ID,
            title: localize2(5563, 'Reload'),
            category: BrowserActionCategory,
            icon: Codicon.refresh,
            f1: true,
            precondition: BROWSER_EDITOR_ACTIVE,
            menu: {
                id: MenuId.BrowserNavigationToolbar,
                group: 'navigation',
                order: 3,
                alt: {
                    id: HardReloadAction.ID,
                    title: localize2(5564, 'Hard Reload'),
                    icon: Codicon.refresh,
                }
            },
            keybinding: {
                when: CONTEXT_BROWSER_FOCUSED,
                weight: 200 /* KeybindingWeight.WorkbenchContrib */ + 75, // Priority over debug and reload workbench
                primary: 2048 /* KeyMod.CtrlCmd */ | 48 /* KeyCode.KeyR */,
                secondary: [63 /* KeyCode.F5 */],
                mac: { primary: 2048 /* KeyMod.CtrlCmd */ | 48 /* KeyCode.KeyR */, secondary: [] }
            }
        });
    }
    async run(accessor, browserEditor = accessor.get(IEditorService).activeEditorPane) {
        if (browserEditor instanceof BrowserEditor) {
            await browserEditor.reload();
        }
    }
}
class HardReloadAction extends Action2 {
    static { this.ID = BrowserViewCommandId.HardReload; }
    constructor() {
        super({
            id: HardReloadAction.ID,
            title: localize2(5565, 'Hard Reload'),
            category: BrowserActionCategory,
            icon: Codicon.refresh,
            f1: true,
            precondition: BROWSER_EDITOR_ACTIVE,
            keybinding: {
                when: CONTEXT_BROWSER_FOCUSED,
                weight: 200 /* KeybindingWeight.WorkbenchContrib */ + 75, // Priority over debug and reload workbench
                primary: 2048 /* KeyMod.CtrlCmd */ | 1024 /* KeyMod.Shift */ | 48 /* KeyCode.KeyR */,
                secondary: [2048 /* KeyMod.CtrlCmd */ | 63 /* KeyCode.F5 */],
                mac: { primary: 2048 /* KeyMod.CtrlCmd */ | 1024 /* KeyMod.Shift */ | 48 /* KeyCode.KeyR */, secondary: [] }
            }
        });
    }
    async run(accessor, browserEditor = accessor.get(IEditorService).activeEditorPane) {
        if (browserEditor instanceof BrowserEditor) {
            await browserEditor.reload(true);
        }
    }
}
class FocusUrlInputAction extends Action2 {
    static { this.ID = BrowserViewCommandId.FocusUrlInput; }
    constructor() {
        super({
            id: FocusUrlInputAction.ID,
            title: localize2(5566, 'Focus URL Input'),
            category: BrowserActionCategory,
            f1: true,
            precondition: BROWSER_EDITOR_ACTIVE,
            keybinding: {
                weight: 200 /* KeybindingWeight.WorkbenchContrib */,
                primary: 2048 /* KeyMod.CtrlCmd */ | 42 /* KeyCode.KeyL */,
            }
        });
    }
    async run(accessor, browserEditor = accessor.get(IEditorService).activeEditorPane) {
        if (browserEditor instanceof BrowserEditor) {
            await browserEditor.focusUrlInput();
        }
    }
}
class ToggleDevToolsAction extends Action2 {
    static { this.ID = BrowserViewCommandId.ToggleDevTools; }
    constructor() {
        super({
            id: ToggleDevToolsAction.ID,
            title: localize2(5567, 'Toggle Developer Tools'),
            category: BrowserActionCategory,
            icon: Codicon.terminal,
            f1: true,
            precondition: ContextKeyExpr.and(BROWSER_EDITOR_ACTIVE, CONTEXT_BROWSER_HAS_URL, CONTEXT_BROWSER_HAS_ERROR.negate()),
            toggled: ContextKeyExpr.equals(CONTEXT_BROWSER_DEVTOOLS_OPEN.key, true),
            menu: {
                id: MenuId.BrowserActionsToolbar,
                group: 'actions',
                order: 3,
            },
            keybinding: {
                weight: 200 /* KeybindingWeight.WorkbenchContrib */,
                primary: 70 /* KeyCode.F12 */
            }
        });
    }
    async run(accessor, browserEditor = accessor.get(IEditorService).activeEditorPane) {
        if (browserEditor instanceof BrowserEditor) {
            await browserEditor.toggleDevTools();
        }
    }
}
class OpenInExternalBrowserAction extends Action2 {
    static { this.ID = BrowserViewCommandId.OpenExternal; }
    constructor() {
        super({
            id: OpenInExternalBrowserAction.ID,
            title: localize2(5568, 'Open in External Browser'),
            category: BrowserActionCategory,
            icon: Codicon.linkExternal,
            f1: true,
            // Note: We do allow opening in an external browser even if there is an error page shown
            precondition: ContextKeyExpr.and(BROWSER_EDITOR_ACTIVE, CONTEXT_BROWSER_HAS_URL),
            menu: {
                id: MenuId.BrowserActionsToolbar,
                group: BrowserActionGroup.Page,
                order: 10
            }
        });
    }
    async run(accessor, browserEditor = accessor.get(IEditorService).activeEditorPane) {
        if (browserEditor instanceof BrowserEditor) {
            const url = browserEditor.getUrl();
            if (url) {
                const openerService = accessor.get(IOpenerService);
                await openerService.open(url, {
                    // ensures that VS Code itself doesn't try to open the URL, even for non-"http(s):" scheme URLs.
                    openExternal: true,
                    // ensures that the link isn't opened in Integrated Browser or other contributed external openers. False is the default, but just being explicit here.
                    allowContributedOpeners: false
                });
            }
        }
    }
}
class ClearGlobalBrowserStorageAction extends Action2 {
    static { this.ID = BrowserViewCommandId.ClearGlobalStorage; }
    constructor() {
        super({
            id: ClearGlobalBrowserStorageAction.ID,
            title: localize2(5569, 'Clear Storage (Global)'),
            category: BrowserActionCategory,
            icon: Codicon.clearAll,
            f1: true,
            menu: {
                id: MenuId.BrowserActionsToolbar,
                group: BrowserActionGroup.Settings,
                order: 1,
                when: ContextKeyExpr.equals(CONTEXT_BROWSER_STORAGE_SCOPE.key, BrowserViewStorageScope.Global)
            }
        });
    }
    async run(accessor) {
        const browserViewWorkbenchService = accessor.get(IBrowserViewWorkbenchService);
        await browserViewWorkbenchService.clearGlobalStorage();
    }
}
class ClearWorkspaceBrowserStorageAction extends Action2 {
    static { this.ID = BrowserViewCommandId.ClearWorkspaceStorage; }
    constructor() {
        super({
            id: ClearWorkspaceBrowserStorageAction.ID,
            title: localize2(5570, 'Clear Storage (Workspace)'),
            category: BrowserActionCategory,
            icon: Codicon.clearAll,
            f1: true,
            menu: {
                id: MenuId.BrowserActionsToolbar,
                group: BrowserActionGroup.Settings,
                order: 1,
                when: ContextKeyExpr.equals(CONTEXT_BROWSER_STORAGE_SCOPE.key, BrowserViewStorageScope.Workspace)
            }
        });
    }
    async run(accessor) {
        const browserViewWorkbenchService = accessor.get(IBrowserViewWorkbenchService);
        await browserViewWorkbenchService.clearWorkspaceStorage();
    }
}
class ClearEphemeralBrowserStorageAction extends Action2 {
    static { this.ID = BrowserViewCommandId.ClearEphemeralStorage; }
    constructor() {
        super({
            id: ClearEphemeralBrowserStorageAction.ID,
            title: localize2(5571, 'Clear Storage (Ephemeral)'),
            category: BrowserActionCategory,
            icon: Codicon.clearAll,
            f1: true,
            precondition: ContextKeyExpr.equals(CONTEXT_BROWSER_STORAGE_SCOPE.key, BrowserViewStorageScope.Ephemeral),
            menu: {
                id: MenuId.BrowserActionsToolbar,
                group: BrowserActionGroup.Settings,
                order: 1,
                when: ContextKeyExpr.equals(CONTEXT_BROWSER_STORAGE_SCOPE.key, BrowserViewStorageScope.Ephemeral)
            }
        });
    }
    async run(accessor, browserEditor = accessor.get(IEditorService).activeEditorPane) {
        if (browserEditor instanceof BrowserEditor) {
            await browserEditor.clearStorage();
        }
    }
}
class OpenBrowserSettingsAction extends Action2 {
    static { this.ID = BrowserViewCommandId.OpenSettings; }
    constructor() {
        super({
            id: OpenBrowserSettingsAction.ID,
            title: localize2(5572, 'Open Browser Settings'),
            category: BrowserActionCategory,
            icon: Codicon.settingsGear,
            f1: false,
            menu: {
                id: MenuId.BrowserActionsToolbar,
                group: BrowserActionGroup.Settings,
                order: 2
            }
        });
    }
    async run(accessor) {
        const preferencesService = accessor.get(IPreferencesService);
        await preferencesService.openSettings({ query: '@id:workbench.browser.*,chat.sendElementsToChat.*' });
    }
}
// Find actions
class ShowBrowserFindAction extends Action2 {
    static { this.ID = BrowserViewCommandId.ShowFind; }
    constructor() {
        super({
            id: ShowBrowserFindAction.ID,
            title: localize2(5573, 'Find in Page'),
            category: BrowserActionCategory,
            f1: true,
            precondition: ContextKeyExpr.and(BROWSER_EDITOR_ACTIVE, CONTEXT_BROWSER_HAS_URL, CONTEXT_BROWSER_HAS_ERROR.negate()),
            menu: {
                id: MenuId.BrowserActionsToolbar,
                group: BrowserActionGroup.Page,
                order: 1,
            },
            keybinding: {
                weight: 100 /* KeybindingWeight.EditorContrib */,
                primary: 2048 /* KeyMod.CtrlCmd */ | 36 /* KeyCode.KeyF */
            }
        });
    }
    run(accessor, browserEditor = accessor.get(IEditorService).activeEditorPane) {
        if (browserEditor instanceof BrowserEditor) {
            browserEditor.showFind();
        }
    }
}
class HideBrowserFindAction extends Action2 {
    static { this.ID = BrowserViewCommandId.HideFind; }
    constructor() {
        super({
            id: HideBrowserFindAction.ID,
            title: localize2(5574, 'Close Find Widget'),
            category: BrowserActionCategory,
            f1: false,
            precondition: ContextKeyExpr.and(BROWSER_EDITOR_ACTIVE, CONTEXT_BROWSER_FIND_WIDGET_VISIBLE),
            keybinding: {
                weight: 100 /* KeybindingWeight.EditorContrib */ + 5,
                primary: 9 /* KeyCode.Escape */
            }
        });
    }
    run(accessor) {
        const browserEditor = accessor.get(IEditorService).activeEditorPane;
        if (browserEditor instanceof BrowserEditor) {
            browserEditor.hideFind();
        }
    }
}
class BrowserFindNextAction extends Action2 {
    static { this.ID = BrowserViewCommandId.FindNext; }
    constructor() {
        super({
            id: BrowserFindNextAction.ID,
            title: localize2(5575, 'Find Next'),
            category: BrowserActionCategory,
            f1: false,
            precondition: BROWSER_EDITOR_ACTIVE,
            keybinding: [{
                    when: CONTEXT_BROWSER_FIND_WIDGET_FOCUSED,
                    weight: 100 /* KeybindingWeight.EditorContrib */,
                    primary: 3 /* KeyCode.Enter */
                }, {
                    when: CONTEXT_BROWSER_FIND_WIDGET_VISIBLE,
                    weight: 100 /* KeybindingWeight.EditorContrib */,
                    primary: 61 /* KeyCode.F3 */,
                    mac: { primary: 2048 /* KeyMod.CtrlCmd */ | 37 /* KeyCode.KeyG */ }
                }]
        });
    }
    run(accessor) {
        const browserEditor = accessor.get(IEditorService).activeEditorPane;
        if (browserEditor instanceof BrowserEditor) {
            browserEditor.findNext();
        }
    }
}
class BrowserFindPreviousAction extends Action2 {
    static { this.ID = BrowserViewCommandId.FindPrevious; }
    constructor() {
        super({
            id: BrowserFindPreviousAction.ID,
            title: localize2(5576, 'Find Previous'),
            category: BrowserActionCategory,
            f1: false,
            precondition: BROWSER_EDITOR_ACTIVE,
            keybinding: [{
                    when: CONTEXT_BROWSER_FIND_WIDGET_FOCUSED,
                    weight: 100 /* KeybindingWeight.EditorContrib */,
                    primary: 1024 /* KeyMod.Shift */ | 3 /* KeyCode.Enter */
                }, {
                    when: CONTEXT_BROWSER_FIND_WIDGET_VISIBLE,
                    weight: 100 /* KeybindingWeight.EditorContrib */,
                    primary: 1024 /* KeyMod.Shift */ | 61 /* KeyCode.F3 */,
                    mac: { primary: 2048 /* KeyMod.CtrlCmd */ | 1024 /* KeyMod.Shift */ | 37 /* KeyCode.KeyG */ }
                }]
        });
    }
    run(accessor) {
        const browserEditor = accessor.get(IEditorService).activeEditorPane;
        if (browserEditor instanceof BrowserEditor) {
            browserEditor.findPrevious();
        }
    }
}
// Register actions
registerAction2(OpenIntegratedBrowserAction);
registerAction2(NewTabAction);
registerAction2(GoBackAction);
registerAction2(GoForwardAction);
registerAction2(ReloadAction);
registerAction2(HardReloadAction);
registerAction2(FocusUrlInputAction);
registerAction2(ToggleDevToolsAction);
registerAction2(OpenInExternalBrowserAction);
registerAction2(ClearGlobalBrowserStorageAction);
registerAction2(ClearWorkspaceBrowserStorageAction);
registerAction2(ClearEphemeralBrowserStorageAction);
registerAction2(OpenBrowserSettingsAction);
registerAction2(ShowBrowserFindAction);
registerAction2(HideBrowserFindAction);
registerAction2(BrowserFindNextAction);
registerAction2(BrowserFindPreviousAction);
registerAction2(class ToggleBrowserTitleBarButton extends ToggleTitleBarConfigAction {
    constructor() {
        super('workbench.browser.showInTitleBar', localize(5556, null), localize(5557, null), 8);
    }
});
//# sourceMappingURL=browserViewActions.js.map