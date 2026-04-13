var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as dom from '../../../base/browser/dom.js';
import { ActionBar } from '../../../base/browser/ui/actionbar/actionbar.js';
import { Disposable, DisposableStore, MutableDisposable } from '../../../base/common/lifecycle.js';
import './actionWidget.css';
import { localize, localize2 } from '../../../nls.js';
import { acceptSelectedActionCommand, ActionList, previewSelectedActionCommand } from './actionList.js';
import { Action2, registerAction2 } from '../../actions/common/actions.js';
import { ContextKeyExpr, IContextKeyService, RawContextKey } from '../../contextkey/common/contextkey.js';
import { IContextViewService } from '../../contextview/browser/contextView.js';
import { registerSingleton } from '../../instantiation/common/extensions.js';
import { createDecorator, IInstantiationService } from '../../instantiation/common/instantiation.js';
import { inputActiveOptionBackground, registerColor } from '../../theme/common/colorRegistry.js';
registerColor('actionBar.toggledBackground', inputActiveOptionBackground, localize(1871, null));
const ActionWidgetContextKeys = {
    Visible: new RawContextKey('codeActionMenuVisible', false, localize(1872, null)),
    FilterFocused: new RawContextKey('codeActionMenuFilterFocused', false, localize(1873, null)),
};
export const IActionWidgetService = createDecorator('actionWidgetService');
let ActionWidgetService = class ActionWidgetService extends Disposable {
    get isVisible() {
        return ActionWidgetContextKeys.Visible.getValue(this._contextKeyService) || false;
    }
    constructor(_contextViewService, _contextKeyService, _instantiationService) {
        super();
        this._contextViewService = _contextViewService;
        this._contextKeyService = _contextKeyService;
        this._instantiationService = _instantiationService;
        this._list = this._register(new MutableDisposable());
    }
    show(user, supportsPreview, items, delegate, anchor, container, actionBarActions, accessibilityProvider, listOptions) {
        const visibleContext = ActionWidgetContextKeys.Visible.bindTo(this._contextKeyService);
        const list = this._instantiationService.createInstance(ActionList, user, supportsPreview, items, delegate, accessibilityProvider, listOptions, anchor);
        this._contextViewService.showContextView({
            getAnchor: () => anchor,
            render: (container) => {
                visibleContext.set(true);
                return this._renderWidget(container, list, actionBarActions ?? []);
            },
            onHide: (didCancel) => {
                visibleContext.reset();
                this._onWidgetClosed(didCancel);
            },
            get anchorPosition() { return list.anchorPosition; },
        }, container, false);
    }
    acceptSelected(preview) {
        this._list.value?.acceptSelected(preview);
    }
    focusPrevious() {
        this._list?.value?.focusPrevious();
    }
    focusNext() {
        this._list?.value?.focusNext();
    }
    collapseSection() {
        this._list?.value?.collapseFocusedSection();
    }
    expandSection() {
        this._list?.value?.expandFocusedSection();
    }
    toggleSection() {
        return this._list?.value?.toggleFocusedSection() ?? false;
    }
    clearFilter() {
        return this._list?.value?.clearFilter() ?? false;
    }
    hide(didCancel) {
        this._list.value?.hide(didCancel);
        this._list.clear();
    }
    clear() {
        this._list.clear();
    }
    _renderWidget(element, list, actionBarActions) {
        const widget = document.createElement('div');
        widget.classList.add('action-widget');
        element.appendChild(widget);
        this._list.value = list;
        if (this._list.value) {
            if (this._list.value.filterContainer) {
                widget.appendChild(this._list.value.filterContainer);
            }
            widget.appendChild(this._list.value.domNode);
        }
        else {
            throw new Error('List has no value');
        }
        const renderDisposables = new DisposableStore();
        // Invisible div to block mouse interaction in the rest of the UI
        const menuBlock = document.createElement('div');
        const block = element.appendChild(menuBlock);
        block.classList.add('context-view-block');
        renderDisposables.add(dom.addDisposableListener(block, dom.EventType.MOUSE_DOWN, e => e.stopPropagation()));
        // Invisible div to block mouse interaction with the menu
        const pointerBlockDiv = document.createElement('div');
        const pointerBlock = element.appendChild(pointerBlockDiv);
        pointerBlock.classList.add('context-view-pointerBlock');
        // Removes block on click INSIDE widget or ANY mouse movement
        renderDisposables.add(dom.addDisposableListener(pointerBlock, dom.EventType.POINTER_MOVE, () => pointerBlock.remove()));
        renderDisposables.add(dom.addDisposableListener(pointerBlock, dom.EventType.MOUSE_DOWN, () => pointerBlock.remove()));
        // Action bar
        let actionBarWidth = 0;
        if (actionBarActions.length) {
            const actionBar = this._createActionBar('.action-widget-action-bar', actionBarActions);
            if (actionBar) {
                widget.appendChild(actionBar.getContainer().parentElement);
                renderDisposables.add(actionBar);
                actionBarWidth = actionBar.getContainer().offsetWidth;
            }
        }
        const width = this._list.value?.layout(actionBarWidth);
        widget.style.width = `${width}px`;
        this._list.value?.focus();
        // Track filter input focus state
        const filterFocusedContext = ActionWidgetContextKeys.FilterFocused.bindTo(this._contextKeyService);
        renderDisposables.add({ dispose: () => filterFocusedContext.reset() });
        if (this._list.value?.filterInput) {
            const filterInput = this._list.value.filterInput;
            renderDisposables.add(dom.addDisposableListener(filterInput, 'focus', () => filterFocusedContext.set(true)));
            renderDisposables.add(dom.addDisposableListener(filterInput, 'blur', () => filterFocusedContext.set(false)));
        }
        const focusTracker = renderDisposables.add(dom.trackFocus(element));
        renderDisposables.add(focusTracker.onDidBlur(() => {
            // Don't hide if focus moved to a hover or submenu that belongs to this action widget
            const activeElement = dom.getActiveElement();
            if (activeElement?.closest('.action-widget-hover') || activeElement?.closest('.action-list-submenu-panel')) {
                return;
            }
            this.hide(true);
        }));
        return renderDisposables;
    }
    _createActionBar(className, actions) {
        if (!actions.length) {
            return undefined;
        }
        const container = dom.$(className);
        const actionBar = new ActionBar(container);
        actionBar.push(actions, { icon: false, label: true });
        return actionBar;
    }
    _onWidgetClosed(didCancel) {
        this._list.value?.hide(didCancel);
    }
};
ActionWidgetService = __decorate([
    __param(0, IContextViewService),
    __param(1, IContextKeyService),
    __param(2, IInstantiationService)
], ActionWidgetService);
registerSingleton(IActionWidgetService, ActionWidgetService, 1 /* InstantiationType.Delayed */);
const weight = 100 /* KeybindingWeight.EditorContrib */ + 1000;
registerAction2(class extends Action2 {
    constructor() {
        super({
            id: 'hideCodeActionWidget',
            title: localize2(1874, "Hide action widget"),
            precondition: ActionWidgetContextKeys.Visible,
            keybinding: {
                weight,
                primary: 9 /* KeyCode.Escape */,
                secondary: [1024 /* KeyMod.Shift */ | 9 /* KeyCode.Escape */]
            },
        });
    }
    run(accessor) {
        accessor.get(IActionWidgetService).hide(true);
    }
});
registerAction2(class extends Action2 {
    constructor() {
        super({
            id: 'clearFilterCodeActionWidget',
            title: localize2(1875, "Clear action widget filter"),
            precondition: ContextKeyExpr.and(ActionWidgetContextKeys.Visible, ActionWidgetContextKeys.FilterFocused),
            keybinding: {
                weight: weight + 1,
                primary: 9 /* KeyCode.Escape */,
            }
        });
    }
    run(accessor) {
        const widgetService = accessor.get(IActionWidgetService);
        if (widgetService instanceof ActionWidgetService) {
            if (!widgetService.clearFilter()) {
                widgetService.hide(true);
            }
        }
    }
});
registerAction2(class extends Action2 {
    constructor() {
        super({
            id: 'selectPrevCodeAction',
            title: localize2(1876, "Select previous action"),
            precondition: ActionWidgetContextKeys.Visible,
            keybinding: {
                weight,
                primary: 16 /* KeyCode.UpArrow */,
                secondary: [2048 /* KeyMod.CtrlCmd */ | 16 /* KeyCode.UpArrow */],
                mac: { primary: 16 /* KeyCode.UpArrow */, secondary: [2048 /* KeyMod.CtrlCmd */ | 16 /* KeyCode.UpArrow */, 256 /* KeyMod.WinCtrl */ | 46 /* KeyCode.KeyP */] },
            }
        });
    }
    run(accessor) {
        const widgetService = accessor.get(IActionWidgetService);
        if (widgetService instanceof ActionWidgetService) {
            widgetService.focusPrevious();
        }
    }
});
registerAction2(class extends Action2 {
    constructor() {
        super({
            id: 'selectNextCodeAction',
            title: localize2(1877, "Select next action"),
            precondition: ActionWidgetContextKeys.Visible,
            keybinding: {
                weight,
                primary: 18 /* KeyCode.DownArrow */,
                secondary: [2048 /* KeyMod.CtrlCmd */ | 18 /* KeyCode.DownArrow */],
                mac: { primary: 18 /* KeyCode.DownArrow */, secondary: [2048 /* KeyMod.CtrlCmd */ | 18 /* KeyCode.DownArrow */, 256 /* KeyMod.WinCtrl */ | 44 /* KeyCode.KeyN */] }
            }
        });
    }
    run(accessor) {
        const widgetService = accessor.get(IActionWidgetService);
        if (widgetService instanceof ActionWidgetService) {
            widgetService.focusNext();
        }
    }
});
registerAction2(class extends Action2 {
    constructor() {
        super({
            id: 'collapseSectionCodeAction',
            title: localize2(1878, "Collapse section"),
            precondition: ContextKeyExpr.and(ActionWidgetContextKeys.Visible, ActionWidgetContextKeys.FilterFocused.negate()),
            keybinding: {
                weight,
                primary: 15 /* KeyCode.LeftArrow */,
            }
        });
    }
    run(accessor) {
        const widgetService = accessor.get(IActionWidgetService);
        if (widgetService instanceof ActionWidgetService) {
            widgetService.collapseSection();
        }
    }
});
registerAction2(class extends Action2 {
    constructor() {
        super({
            id: 'expandSectionCodeAction',
            title: localize2(1879, "Expand section"),
            precondition: ContextKeyExpr.and(ActionWidgetContextKeys.Visible, ActionWidgetContextKeys.FilterFocused.negate()),
            keybinding: {
                weight,
                primary: 17 /* KeyCode.RightArrow */,
            }
        });
    }
    run(accessor) {
        const widgetService = accessor.get(IActionWidgetService);
        if (widgetService instanceof ActionWidgetService) {
            widgetService.expandSection();
        }
    }
});
registerAction2(class extends Action2 {
    constructor() {
        super({
            id: 'toggleSectionCodeAction',
            title: localize2(1880, "Toggle section"),
            precondition: ContextKeyExpr.and(ActionWidgetContextKeys.Visible, ActionWidgetContextKeys.FilterFocused.negate()),
            keybinding: {
                weight,
                primary: 10 /* KeyCode.Space */,
            }
        });
    }
    run(accessor) {
        const widgetService = accessor.get(IActionWidgetService);
        if (widgetService instanceof ActionWidgetService) {
            if (!widgetService.toggleSection()) {
                widgetService.acceptSelected();
            }
        }
    }
});
registerAction2(class extends Action2 {
    constructor() {
        super({
            id: acceptSelectedActionCommand,
            title: localize2(1881, "Accept selected action"),
            precondition: ActionWidgetContextKeys.Visible,
            keybinding: {
                weight,
                primary: 3 /* KeyCode.Enter */,
                secondary: [2048 /* KeyMod.CtrlCmd */ | 89 /* KeyCode.Period */],
            }
        });
    }
    run(accessor) {
        const widgetService = accessor.get(IActionWidgetService);
        if (widgetService instanceof ActionWidgetService) {
            widgetService.acceptSelected();
        }
    }
});
registerAction2(class extends Action2 {
    constructor() {
        super({
            id: previewSelectedActionCommand,
            title: localize2(1882, "Preview selected action"),
            precondition: ActionWidgetContextKeys.Visible,
            keybinding: {
                weight,
                primary: 2048 /* KeyMod.CtrlCmd */ | 3 /* KeyCode.Enter */,
            }
        });
    }
    run(accessor) {
        const widgetService = accessor.get(IActionWidgetService);
        if (widgetService instanceof ActionWidgetService) {
            widgetService.acceptSelected(true);
        }
    }
});
//# sourceMappingURL=actionWidget.js.map