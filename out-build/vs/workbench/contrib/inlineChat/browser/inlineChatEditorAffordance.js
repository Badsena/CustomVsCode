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
var InlineChatEditorAffordance_1;
import './media/inlineChatEditorAffordance.css';
import * as dom from '../../../../base/browser/dom.js';
import { Disposable, DisposableStore, MutableDisposable } from '../../../../base/common/lifecycle.js';
import { Emitter } from '../../../../base/common/event.js';
import { computeIndentLevel } from '../../../../editor/common/model/utils.js';
import { autorun } from '../../../../base/common/observable.js';
import { MenuId, MenuItemAction } from '../../../../platform/actions/common/actions.js';
import { MenuWorkbenchToolBar } from '../../../../platform/actions/browser/toolbar.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { quickFixCommandId } from '../../../../editor/contrib/codeAction/browser/codeAction.js';
import { CodeActionController } from '../../../../editor/contrib/codeAction/browser/codeActionController.js';
import { MenuEntryActionViewItem } from '../../../../platform/actions/browser/menuEntryActionViewItem.js';
import { ThemeIcon } from '../../../../base/common/themables.js';
import { IKeybindingService } from '../../../../platform/keybinding/common/keybinding.js';
import { INotificationService } from '../../../../platform/notification/common/notification.js';
import { IContextKeyService } from '../../../../platform/contextkey/common/contextkey.js';
import { IThemeService } from '../../../../platform/theme/common/themeService.js';
import { IContextMenuService } from '../../../../platform/contextview/browser/contextView.js';
import { IAccessibilityService } from '../../../../platform/accessibility/common/accessibility.js';
import { Codicon } from '../../../../base/common/codicons.js';
import { ACTION_START, ACTION_ASK_IN_CHAT } from '../common/inlineChat.js';
import { ICommandService } from '../../../../platform/commands/common/commands.js';
let QuickFixActionViewItem = class QuickFixActionViewItem extends MenuEntryActionViewItem {
    constructor(action, _editor, keybindingService, notificationService, contextKeyService, themeService, contextMenuService, accessibilityService, commandService) {
        const wrappedAction = new class extends MenuItemAction {
            constructor() {
                super(action.item, action.alt?.item, {}, action.hideActions, action.menuKeybinding, contextKeyService, commandService);
                this.elementGetter = () => undefined;
            }
            async run(...args) {
                const controller = CodeActionController.get(_editor);
                const info = controller?.lightBulbState.get();
                const element = this.elementGetter();
                if (controller && info && element) {
                    const { bottom, left } = element.getBoundingClientRect();
                    await controller.showCodeActions(info.trigger, info.actions, { x: left, y: bottom });
                }
            }
        };
        super(wrappedAction, { draggable: false }, keybindingService, notificationService, contextKeyService, themeService, contextMenuService, accessibilityService);
        this._editor = _editor;
        this._lightBulbStore = this._store.add(new MutableDisposable());
        wrappedAction.elementGetter = () => this.element;
    }
    render(container) {
        super.render(container);
        this._updateFromLightBulb();
    }
    getTooltip() {
        return this._currentTitle ?? super.getTooltip();
    }
    _updateFromLightBulb() {
        const controller = CodeActionController.get(this._editor);
        if (!controller) {
            return;
        }
        const store = new DisposableStore();
        this._lightBulbStore.value = store;
        store.add(autorun(reader => {
            const info = controller.lightBulbState.read(reader);
            if (this.label) {
                // Update icon
                const icon = info?.icon ?? Codicon.lightBulb;
                const iconClasses = ThemeIcon.asClassNameArray(icon);
                this.label.className = '';
                this.label.classList.add('codicon', 'action-label', ...iconClasses);
            }
            // Update tooltip
            this._currentTitle = info?.title;
            this.updateTooltip();
        }));
    }
};
QuickFixActionViewItem = __decorate([
    __param(2, IKeybindingService),
    __param(3, INotificationService),
    __param(4, IContextKeyService),
    __param(5, IThemeService),
    __param(6, IContextMenuService),
    __param(7, IAccessibilityService),
    __param(8, ICommandService)
], QuickFixActionViewItem);
let LabelWithKeybindingActionViewItem = class LabelWithKeybindingActionViewItem extends MenuEntryActionViewItem {
    constructor(action, keybindingService, notificationService, contextKeyService, themeService, contextMenuService, accessibilityService) {
        super(action, { draggable: false }, keybindingService, notificationService, contextKeyService, themeService, contextMenuService, accessibilityService);
        this.options.label = true;
        this.options.icon = false;
        this._kbLabel = keybindingService.lookupKeybinding(action.id)?.getLabel() ?? undefined;
    }
    updateLabel() {
        if (this.label) {
            dom.reset(this.label, this.action.label, ...(this._kbLabel ? [dom.$('span.inline-chat-keybinding', undefined, this._kbLabel)] : []));
        }
    }
};
LabelWithKeybindingActionViewItem = __decorate([
    __param(1, IKeybindingService),
    __param(2, INotificationService),
    __param(3, IContextKeyService),
    __param(4, IThemeService),
    __param(5, IContextMenuService),
    __param(6, IAccessibilityService)
], LabelWithKeybindingActionViewItem);
/**
 * Content widget that shows a small sparkle icon at the cursor position.
 * When clicked, it shows the overlay widget for inline chat.
 */
let InlineChatEditorAffordance = class InlineChatEditorAffordance extends Disposable {
    static { InlineChatEditorAffordance_1 = this; }
    static { this._idPool = 0; }
    constructor(_editor, selection, instantiationService) {
        super();
        this._editor = _editor;
        this._id = `inline-chat-content-widget-${InlineChatEditorAffordance_1._idPool++}`;
        this._position = null;
        this._isVisible = false;
        this._onDidRunAction = this._store.add(new Emitter());
        this.onDidRunAction = this._onDidRunAction.event;
        this.allowEditorOverflow = true;
        this.suppressMouseDown = false;
        // Create the widget DOM
        this._domNode = dom.$('.inline-chat-content-widget');
        // Create toolbar with the inline chat start action
        const toolbar = this._store.add(instantiationService.createInstance(MenuWorkbenchToolBar, this._domNode, MenuId.InlineChatEditorAffordance, {
            telemetrySource: 'inlineChatEditorAffordance',
            hiddenItemStrategy: 0 /* HiddenItemStrategy.Ignore */,
            menuOptions: { renderShortTitle: true },
            toolbarOptions: { primaryGroup: () => true, useSeparatorsInPrimaryActions: true },
            actionViewItemProvider: (action) => {
                if (action instanceof MenuItemAction && action.id === quickFixCommandId) {
                    return instantiationService.createInstance(QuickFixActionViewItem, action, this._editor);
                }
                if (action instanceof MenuItemAction && (action.id === ACTION_START || action.id === ACTION_ASK_IN_CHAT || action.id === 'inlineChat.fixDiagnostics')) {
                    return instantiationService.createInstance(LabelWithKeybindingActionViewItem, action);
                }
                return undefined;
            }
        }));
        this._store.add(toolbar.actionRunner.onDidRun((e) => {
            this._onDidRunAction.fire(e.action.id);
            this._hide();
        }));
        this._store.add(autorun(r => {
            const sel = selection.read(r);
            if (sel) {
                this._show(sel);
            }
            else {
                this._hide();
            }
        }));
        this._store.add(this._editor.onDidScrollChange(() => {
            const sel = selection.get();
            if (!sel) {
                return;
            }
            const isInViewport = this._isPositionInViewport();
            if (isInViewport && !this._isVisible) {
                this._show(sel);
            }
            else if (!isInViewport && this._isVisible) {
                this._hide();
            }
        }));
    }
    _show(selection) {
        if (selection.isEmpty()) {
            this._showAtLineStart(selection.getPosition().lineNumber);
        }
        else {
            this._showAtSelection(selection);
        }
        if (this._isVisible) {
            this._editor.layoutContentWidget(this);
        }
        else {
            this._editor.addContentWidget(this);
            this._isVisible = true;
        }
    }
    _showAtSelection(selection) {
        const cursorPosition = selection.getPosition();
        const direction = selection.getDirection();
        const preference = direction === 1 /* SelectionDirection.RTL */
            ? 1 /* ContentWidgetPositionPreference.ABOVE */
            : 2 /* ContentWidgetPositionPreference.BELOW */;
        this._position = {
            position: cursorPosition,
            preference: [preference],
        };
    }
    _showAtLineStart(lineNumber) {
        const model = this._editor.getModel();
        if (!model) {
            return;
        }
        const tabSize = model.getOptions().tabSize;
        const fontInfo = this._editor.getOptions().get(59 /* EditorOption.fontInfo */);
        const lineContent = model.getLineContent(lineNumber);
        const indent = computeIndentLevel(lineContent, tabSize);
        const lineHasSpace = indent < 0 ? true : fontInfo.spaceWidth * indent > 22;
        let effectiveLineNumber = lineNumber;
        if (!lineHasSpace) {
            const isLineEmptyOrIndented = (ln) => {
                const content = model.getLineContent(ln);
                return /^\s*$|^\s+/.test(content);
            };
            const lineCount = model.getLineCount();
            if (lineNumber > 1 && isLineEmptyOrIndented(lineNumber - 1)) {
                effectiveLineNumber = lineNumber - 1;
            }
            else if (lineNumber < lineCount && isLineEmptyOrIndented(lineNumber + 1)) {
                effectiveLineNumber = lineNumber + 1;
            }
        }
        const effectiveColumnNumber = /^\S\s*$/.test(model.getLineContent(effectiveLineNumber)) ? 2 : 1;
        this._position = {
            position: { lineNumber: effectiveLineNumber, column: effectiveColumnNumber },
            preference: [0 /* ContentWidgetPositionPreference.EXACT */],
        };
    }
    _isPositionInViewport() {
        const widgetPosition = this._position?.position;
        if (!widgetPosition) {
            return false;
        }
        // Check vertical visibility
        const visibleRanges = this._editor.getVisibleRanges();
        const isLineVisible = visibleRanges.some(range => widgetPosition.lineNumber >= range.startLineNumber && widgetPosition.lineNumber <= range.endLineNumber);
        if (!isLineVisible) {
            return false;
        }
        // Check horizontal visibility
        const scrolledPos = this._editor.getScrolledVisiblePosition(widgetPosition);
        if (!scrolledPos) {
            return false;
        }
        const layoutInfo = this._editor.getOptions().get(165 /* EditorOption.layoutInfo */);
        return scrolledPos.left >= 0 && scrolledPos.left <= layoutInfo.width;
    }
    _hide() {
        if (this._isVisible) {
            this._isVisible = false;
            this._editor.removeContentWidget(this);
        }
    }
    getId() {
        return this._id;
    }
    getDomNode() {
        return this._domNode;
    }
    getPosition() {
        return this._position;
    }
    beforeRender() {
        const position = this._editor.getPosition();
        const lineHeight = position ? this._editor.getLineHeightForPosition(position) : this._editor.getOption(75 /* EditorOption.lineHeight */);
        this._domNode.style.setProperty('--vscode-inline-chat-affordance-height', `${lineHeight}px`);
        return null;
    }
    dispose() {
        if (this._isVisible) {
            this._editor.removeContentWidget(this);
        }
        super.dispose();
    }
};
InlineChatEditorAffordance = InlineChatEditorAffordance_1 = __decorate([
    __param(2, IInstantiationService)
], InlineChatEditorAffordance);
export { InlineChatEditorAffordance };
//# sourceMappingURL=inlineChatEditorAffordance.js.map