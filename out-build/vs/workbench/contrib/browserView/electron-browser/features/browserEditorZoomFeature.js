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
import { localize, localize2 } from '../../../../../nls.js';
import { $ } from '../../../../../base/browser/dom.js';
import { RawContextKey, IContextKeyService, ContextKeyExpr } from '../../../../../platform/contextkey/common/contextkey.js';
import { Action2, registerAction2, MenuId } from '../../../../../platform/actions/common/actions.js';
import { Extensions as ConfigurationExtensions } from '../../../../../platform/configuration/common/configurationRegistry.js';
import { IEditorService } from '../../../../services/editor/common/editorService.js';
import { Codicon } from '../../../../../base/common/codicons.js';
import { ThemeIcon } from '../../../../../base/common/themables.js';
import { Disposable, MutableDisposable } from '../../../../../base/common/lifecycle.js';
import { disposableTimeout } from '../../../../../base/common/async.js';
import { browserZoomFactors, browserZoomLabel, browserZoomAccessibilityLabel } from '../../../../../platform/browserView/common/browserView.js';
import { BrowserZoomService, IBrowserZoomService, MATCH_WINDOW_ZOOM_LABEL } from '../../../browserView/common/browserZoomService.js';
import { IAccessibilityService } from '../../../../../platform/accessibility/common/accessibility.js';
import { BrowserEditor, BrowserEditorContribution, CONTEXT_BROWSER_HAS_ERROR, CONTEXT_BROWSER_HAS_URL, CONTEXT_BROWSER_FOCUSED } from '../browserEditor.js';
import { BROWSER_EDITOR_ACTIVE, BrowserActionCategory, BrowserActionGroup } from '../browserViewActions.js';
import { registerWorkbenchContribution2 } from '../../../../common/contributions.js';
import { getZoomLevel, onDidChangeZoomLevel } from '../../../../../base/browser/browser.js';
import { zoomLevelToZoomFactor } from '../../../../../platform/window/common/window.js';
import { mainWindow } from '../../../../../base/browser/window.js';
import { registerSingleton } from '../../../../../platform/instantiation/common/extensions.js';
import { workbenchConfigurationNodeBase } from '../../../../common/configuration.js';
import { Registry } from '../../../../../platform/registry/common/platform.js';
export const CONTEXT_BROWSER_CAN_ZOOM_IN = new RawContextKey('browserCanZoomIn', true, localize(5590, null));
export const CONTEXT_BROWSER_CAN_ZOOM_OUT = new RawContextKey('browserCanZoomOut', true, localize(5591, null));
/**
 * Transient zoom-level indicator that briefly appears inside the URL bar on zoom changes.
 */
class BrowserZoomPill extends Disposable {
    constructor() {
        super();
        this._timeout = this._register(new MutableDisposable());
        this.element = $('.browser-zoom-pill');
        // Don't announce this transient element; the zoom level is announced via IAccessibilityService.status()
        this.element.setAttribute('aria-hidden', 'true');
        this._icon = $('span');
        this._label = $('span');
        this.element.appendChild(this._icon);
        this.element.appendChild(this._label);
    }
    /**
     * Briefly show the zoom level, then auto-hide after 750 ms.
     */
    show(zoomLabel, isAtOrAboveDefault) {
        this._icon.className = ThemeIcon.asClassName(isAtOrAboveDefault ? Codicon.zoomIn : Codicon.zoomOut);
        this._label.textContent = zoomLabel;
        this.element.classList.add('visible');
        // Reset auto-hide timer so rapid zoom actions extend the display
        this._timeout.value = disposableTimeout(() => {
            this.element.classList.remove('visible');
        }, 750); // Chrome shows the zoom level for 1.5 seconds, but we show it for less because ours is non-interactive
    }
}
/**
 * Browser editor contribution that manages zoom context keys and the zoom pill indicator.
 */
let BrowserEditorZoomSupport = class BrowserEditorZoomSupport extends BrowserEditorContribution {
    constructor(editor, contextKeyService, browserZoomService, accessibilityService) {
        super(editor);
        this.browserZoomService = browserZoomService;
        this.accessibilityService = accessibilityService;
        this._canZoomInContext = CONTEXT_BROWSER_CAN_ZOOM_IN.bindTo(contextKeyService);
        this._canZoomOutContext = CONTEXT_BROWSER_CAN_ZOOM_OUT.bindTo(contextKeyService);
        this._zoomPill = this._register(new BrowserZoomPill());
    }
    get urlBarWidgets() {
        return [{ element: this._zoomPill.element, order: 0 }];
    }
    subscribeToModel(model, store) {
        this._updateZoomContext(model);
        store.add(model.onDidChangeZoom(() => {
            this._updateZoomContext(model);
        }));
    }
    clear() {
        this._canZoomInContext.reset();
        this._canZoomOutContext.reset();
    }
    async zoomIn() {
        await this.editor.model?.zoomIn();
        this._showZoomPill();
    }
    async zoomOut() {
        await this.editor.model?.zoomOut();
        this._showZoomPill();
    }
    async resetZoom() {
        await this.editor.model?.resetZoom();
        this._showZoomPill();
    }
    _updateZoomContext(model) {
        this._canZoomInContext.set(model.canZoomIn);
        this._canZoomOutContext.set(model.canZoomOut);
    }
    _showZoomPill() {
        const model = this.editor.model;
        if (!model) {
            return;
        }
        const defaultIndex = this.browserZoomService.getEffectiveZoomIndex(undefined, false);
        const defaultFactor = browserZoomFactors[defaultIndex];
        const currentFactor = model.zoomFactor;
        const label = browserZoomLabel(currentFactor);
        this._zoomPill.show(label, currentFactor >= defaultFactor);
        // Announce the new zoom level to screen readers (polite, non-interruptive).
        this.accessibilityService.status(browserZoomAccessibilityLabel(currentFactor));
    }
};
BrowserEditorZoomSupport = __decorate([
    __param(1, IContextKeyService),
    __param(2, IBrowserZoomService),
    __param(3, IAccessibilityService)
], BrowserEditorZoomSupport);
export { BrowserEditorZoomSupport };
// Register the contribution
BrowserEditor.registerContribution(BrowserEditorZoomSupport);
// -- Actions ------------------------------------------------------------
class ZoomInAction extends Action2 {
    static { this.ID = 'workbench.action.browser.zoomIn'; }
    constructor() {
        super({
            id: ZoomInAction.ID,
            title: localize2(5594, 'Zoom In'),
            category: BrowserActionCategory,
            icon: Codicon.zoomIn,
            f1: true,
            precondition: ContextKeyExpr.and(BROWSER_EDITOR_ACTIVE, CONTEXT_BROWSER_HAS_URL, CONTEXT_BROWSER_HAS_ERROR.negate()),
            menu: {
                id: MenuId.BrowserActionsToolbar,
                group: BrowserActionGroup.Zoom,
                order: 1,
                when: CONTEXT_BROWSER_CAN_ZOOM_IN,
            },
            keybinding: {
                when: CONTEXT_BROWSER_FOCUSED,
                weight: 200 /* KeybindingWeight.WorkbenchContrib */ + 75,
                // Same shortcuts as 'workbench.action.zoomIn'
                primary: 2048 /* KeyMod.CtrlCmd */ | 86 /* KeyCode.Equal */,
                secondary: [2048 /* KeyMod.CtrlCmd */ | 1024 /* KeyMod.Shift */ | 86 /* KeyCode.Equal */, 2048 /* KeyMod.CtrlCmd */ | 109 /* KeyCode.NumpadAdd */],
            },
        });
    }
    async run(accessor, browserEditor = accessor.get(IEditorService).activeEditorPane) {
        if (browserEditor instanceof BrowserEditor) {
            await browserEditor.getContribution(BrowserEditorZoomSupport)?.zoomIn();
        }
    }
}
class ZoomOutAction extends Action2 {
    static { this.ID = 'workbench.action.browser.zoomOut'; }
    constructor() {
        super({
            id: ZoomOutAction.ID,
            title: localize2(5595, 'Zoom Out'),
            category: BrowserActionCategory,
            icon: Codicon.zoomOut,
            f1: true,
            precondition: ContextKeyExpr.and(BROWSER_EDITOR_ACTIVE, CONTEXT_BROWSER_HAS_URL, CONTEXT_BROWSER_HAS_ERROR.negate()),
            menu: {
                id: MenuId.BrowserActionsToolbar,
                group: BrowserActionGroup.Zoom,
                order: 2,
                when: CONTEXT_BROWSER_CAN_ZOOM_OUT,
            },
            keybinding: {
                when: CONTEXT_BROWSER_FOCUSED,
                weight: 200 /* KeybindingWeight.WorkbenchContrib */ + 75,
                // Same shortcuts as 'workbench.action.zoomOut'
                primary: 2048 /* KeyMod.CtrlCmd */ | 88 /* KeyCode.Minus */,
                secondary: [2048 /* KeyMod.CtrlCmd */ | 1024 /* KeyMod.Shift */ | 88 /* KeyCode.Minus */, 2048 /* KeyMod.CtrlCmd */ | 111 /* KeyCode.NumpadSubtract */],
                linux: {
                    primary: 2048 /* KeyMod.CtrlCmd */ | 88 /* KeyCode.Minus */,
                    secondary: [2048 /* KeyMod.CtrlCmd */ | 111 /* KeyCode.NumpadSubtract */]
                }
            },
        });
    }
    async run(accessor, browserEditor = accessor.get(IEditorService).activeEditorPane) {
        if (browserEditor instanceof BrowserEditor) {
            await browserEditor.getContribution(BrowserEditorZoomSupport)?.zoomOut();
        }
    }
}
class ResetZoomAction extends Action2 {
    static { this.ID = 'workbench.action.browser.resetZoom'; }
    constructor() {
        super({
            id: ResetZoomAction.ID,
            title: localize2(5596, 'Reset Zoom'),
            category: BrowserActionCategory,
            icon: Codicon.screenNormal,
            f1: true,
            precondition: ContextKeyExpr.and(BROWSER_EDITOR_ACTIVE, CONTEXT_BROWSER_HAS_URL, CONTEXT_BROWSER_HAS_ERROR.negate()),
            menu: {
                id: MenuId.BrowserActionsToolbar,
                group: BrowserActionGroup.Zoom,
                order: 3,
            },
            keybinding: {
                when: CONTEXT_BROWSER_FOCUSED,
                weight: 200 /* KeybindingWeight.WorkbenchContrib */ + 75,
                // Same shortcuts as 'workbench.action.zoomReset'
                // (note: both workbench and here use Numpad0 instead of Digit0 to avoid conflicts with keybinding to focus sidebar.)
                primary: 2048 /* KeyMod.CtrlCmd */ | 98 /* KeyCode.Numpad0 */,
            },
        });
    }
    async run(accessor, browserEditor = accessor.get(IEditorService).activeEditorPane) {
        if (browserEditor instanceof BrowserEditor) {
            await browserEditor.getContribution(BrowserEditorZoomSupport)?.resetZoom();
        }
    }
}
registerAction2(ZoomInAction);
registerAction2(ZoomOutAction);
registerAction2(ResetZoomAction);
/**
 * Bridges the application's UI zoom level changes into IBrowserZoomService so that
 * views using the 'Match Window' default zoom level stay in sync.
 */
let WindowZoomSynchronizer = class WindowZoomSynchronizer extends Disposable {
    static { this.ID = 'workbench.contrib.browserView.windowZoomSynchronizer'; }
    constructor(browserZoomService) {
        super();
        browserZoomService.notifyWindowZoomChanged(zoomLevelToZoomFactor(getZoomLevel(mainWindow)));
        this._register(onDidChangeZoomLevel(() => {
            browserZoomService.notifyWindowZoomChanged(zoomLevelToZoomFactor(getZoomLevel(mainWindow)));
        }));
    }
};
WindowZoomSynchronizer = __decorate([
    __param(0, IBrowserZoomService)
], WindowZoomSynchronizer);
registerWorkbenchContribution2(WindowZoomSynchronizer.ID, WindowZoomSynchronizer, 2 /* WorkbenchPhase.BlockRestore */);
registerSingleton(IBrowserZoomService, BrowserZoomService, 1 /* InstantiationType.Delayed */);
Registry.as(ConfigurationExtensions.Configuration).registerConfiguration({
    ...workbenchConfigurationNodeBase,
    properties: {
        'workbench.browser.pageZoom': {
            type: 'string',
            enum: [MATCH_WINDOW_ZOOM_LABEL, ...browserZoomFactors.map(f => `${Math.round(f * 100)}%`)],
            markdownEnumDescriptions: [
                localize(5592, null),
                ...browserZoomFactors.map(() => ''),
            ],
            default: MATCH_WINDOW_ZOOM_LABEL,
            markdownDescription: localize(5593, null),
            // Zoom can change from machine to machine, so we don't need the workspace-level nor syncing that WINDOW has.
            scope: 2 /* ConfigurationScope.MACHINE */
        }
    }
});
//# sourceMappingURL=browserEditorZoomFeature.js.map