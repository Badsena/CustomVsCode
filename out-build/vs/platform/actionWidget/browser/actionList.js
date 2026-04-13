var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var ActionListWidget_1;
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as dom from '../../../base/browser/dom.js';
import { renderMarkdown } from '../../../base/browser/markdownRenderer.js';
import { ActionBar } from '../../../base/browser/ui/actionbar/actionbar.js';
import { getAnchorRect } from '../../../base/browser/ui/contextview/contextview.js';
import { KeybindingLabel } from '../../../base/browser/ui/keybindingLabel/keybindingLabel.js';
import { List } from '../../../base/browser/ui/list/listWidget.js';
import { SubmenuAction, toAction } from '../../../base/common/actions.js';
import { CancellationTokenSource } from '../../../base/common/cancellation.js';
import { Codicon } from '../../../base/common/codicons.js';
import { Emitter } from '../../../base/common/event.js';
import { MarkdownString } from '../../../base/common/htmlContent.js';
import { Disposable, DisposableStore, MutableDisposable, toDisposable } from '../../../base/common/lifecycle.js';
import { OS } from '../../../base/common/platform.js';
import { ThemeIcon } from '../../../base/common/themables.js';
import { URI } from '../../../base/common/uri.js';
import './actionWidget.css';
import { localize } from '../../../nls.js';
import { IContextViewService } from '../../contextview/browser/contextView.js';
import { IKeybindingService } from '../../keybinding/common/keybinding.js';
import { IOpenerService } from '../../opener/common/opener.js';
import { defaultListStyles } from '../../theme/browser/defaultStyles.js';
import { asCssVariable } from '../../theme/common/colorRegistry.js';
import { ILayoutService } from '../../layout/browser/layoutService.js';
import { IInstantiationService } from '../../instantiation/common/instantiation.js';
import { IHoverService } from '../../hover/browser/hover.js';
export const acceptSelectedActionCommand = 'acceptSelectedCodeAction';
export const previewSelectedActionCommand = 'previewSelectedCodeAction';
export var ActionListItemKind;
(function (ActionListItemKind) {
    ActionListItemKind["Action"] = "action";
    ActionListItemKind["Header"] = "header";
    ActionListItemKind["Separator"] = "separator";
})(ActionListItemKind || (ActionListItemKind = {}));
class HeaderRenderer {
    get templateId() { return "header" /* ActionListItemKind.Header */; }
    renderTemplate(container) {
        container.classList.add('group-header');
        const text = document.createElement('span');
        container.append(text);
        return { container, text };
    }
    renderElement(element, _index, templateData) {
        templateData.text.textContent = element.group?.title ?? element.label ?? '';
    }
    disposeTemplate(_templateData) {
        // noop
    }
}
class SeparatorRenderer {
    get templateId() { return "separator" /* ActionListItemKind.Separator */; }
    renderTemplate(container) {
        container.classList.add('separator');
        const text = document.createElement('span');
        container.append(text);
        return { container, text };
    }
    renderElement(element, _index, templateData) {
        templateData.text.textContent = element.label ?? '';
    }
    disposeTemplate(_templateData) {
        // noop
    }
}
let ActionItemRenderer = class ActionItemRenderer {
    get templateId() { return "action" /* ActionListItemKind.Action */; }
    constructor(_supportsPreview, _onRemoveItem, _onSubmenuIndicatorHover, _hasAnySubmenuActions, _keybindingService, _openerService) {
        this._supportsPreview = _supportsPreview;
        this._onRemoveItem = _onRemoveItem;
        this._onSubmenuIndicatorHover = _onSubmenuIndicatorHover;
        this._hasAnySubmenuActions = _hasAnySubmenuActions;
        this._keybindingService = _keybindingService;
        this._openerService = _openerService;
    }
    renderTemplate(container) {
        container.classList.add(this.templateId);
        const icon = document.createElement('div');
        icon.className = 'icon';
        container.append(icon);
        const text = document.createElement('span');
        text.className = 'title';
        container.append(text);
        const badge = document.createElement('span');
        badge.className = 'action-item-badge';
        container.append(badge);
        const description = document.createElement('span');
        description.className = 'description';
        container.append(description);
        const keybinding = new KeybindingLabel(container, OS);
        const toolbar = document.createElement('div');
        toolbar.className = 'action-list-item-toolbar';
        container.append(toolbar);
        const submenuIndicator = document.createElement('div');
        submenuIndicator.className = 'action-list-submenu-indicator';
        container.append(submenuIndicator);
        const elementDisposables = new DisposableStore();
        return { container, icon, text, badge, description, keybinding, toolbar, submenuIndicator, elementDisposables };
    }
    renderElement(element, _index, data) {
        // Clear previous element disposables
        data.elementDisposables.clear();
        if (element.group?.icon) {
            data.icon.className = ThemeIcon.asClassName(element.group.icon);
            if (element.group.icon.color) {
                data.icon.style.color = asCssVariable(element.group.icon.color.id);
            }
        }
        else {
            data.icon.className = ThemeIcon.asClassName(Codicon.lightBulb);
            data.icon.style.color = 'var(--vscode-editorLightBulb-foreground)';
        }
        if (!element.item || !element.label) {
            return;
        }
        dom.setVisibility(!element.hideIcon, data.icon);
        // Apply optional className - clean up previous to avoid stale classes
        // from virtualized row reuse
        if (data.previousClassName) {
            data.container.classList.remove(data.previousClassName);
        }
        data.container.classList.toggle('action-list-custom', !!element.className);
        if (element.className) {
            data.container.classList.add(element.className);
        }
        data.previousClassName = element.className;
        data.text.textContent = stripNewlines(element.label);
        // Render optional badge
        if (element.badge) {
            data.badge.textContent = element.badge;
            data.badge.style.display = '';
        }
        else {
            data.badge.textContent = '';
            data.badge.style.display = 'none';
        }
        if (element.keybinding) {
            data.description.textContent = element.keybinding.getLabel();
            data.description.style.display = 'inline';
            data.description.style.letterSpacing = '0.5px';
        }
        else if (element.description) {
            dom.clearNode(data.description);
            if (typeof element.description === 'string') {
                data.description.textContent = stripNewlines(element.description);
            }
            else {
                const rendered = renderMarkdown(element.description, {
                    actionHandler: (content) => {
                        this._openerService.open(URI.parse(content), { allowCommands: true });
                    }
                });
                data.elementDisposables.add(rendered);
                data.description.appendChild(rendered.element);
            }
            data.description.style.display = 'inline';
        }
        else {
            data.description.textContent = '';
            data.description.style.display = 'none';
        }
        const actionTitle = this._keybindingService.lookupKeybinding(acceptSelectedActionCommand)?.getLabel();
        const previewTitle = this._keybindingService.lookupKeybinding(previewSelectedActionCommand)?.getLabel();
        data.container.classList.toggle('option-disabled', !!element.disabled);
        if (element.hover !== undefined) {
            // Don't show tooltip when hover content is configured - the rich hover will show instead
            data.container.title = '';
        }
        else if (element.tooltip) {
            data.container.title = element.tooltip;
        }
        else if (element.disabled) {
            data.container.title = element.label;
        }
        else if (actionTitle && previewTitle) {
            if (this._supportsPreview && element.canPreview) {
                data.container.title = localize(1864, null, actionTitle, previewTitle);
            }
            else {
                data.container.title = localize(1865, null, actionTitle);
            }
        }
        else {
            data.container.title = '';
        }
        // Clear and render toolbar actions
        dom.clearNode(data.toolbar);
        const toolbarActions = [...(element.toolbarActions ?? [])];
        if (element.onRemove) {
            toolbarActions.push(toAction({
                id: 'actionList.remove',
                label: localize(1866, null),
                class: ThemeIcon.asClassName(Codicon.close),
                run: () => {
                    element.onRemove();
                    this._onRemoveItem?.(element);
                },
            }));
        }
        data.container.classList.toggle('has-toolbar', toolbarActions.length > 0);
        if (toolbarActions.length > 0) {
            const actionBar = new ActionBar(data.toolbar);
            data.elementDisposables.add(actionBar);
            actionBar.push(toolbarActions, { icon: true, label: false });
        }
        // Show submenu indicator for items with submenu actions
        const hasSubmenu = !!element.submenuActions?.length;
        if (hasSubmenu) {
            data.submenuIndicator.className = 'action-list-submenu-indicator has-submenu ' + ThemeIcon.asClassName(Codicon.chevronRight);
            data.submenuIndicator.style.display = '';
            this._onSubmenuIndicatorHover?.(element, data.submenuIndicator, data.elementDisposables);
        }
        else if (this._hasAnySubmenuActions) {
            // Reserve space for alignment when other items have submenus
            data.submenuIndicator.className = 'action-list-submenu-indicator';
            data.submenuIndicator.style.display = '';
        }
        else {
            // No items have submenu actions — hide completely
            data.submenuIndicator.style.display = 'none';
        }
    }
    disposeTemplate(templateData) {
        templateData.keybinding.dispose();
        templateData.elementDisposables.dispose();
    }
};
ActionItemRenderer = __decorate([
    __param(4, IKeybindingService),
    __param(5, IOpenerService)
], ActionItemRenderer);
class AcceptSelectedEvent extends UIEvent {
    constructor() { super('acceptSelectedAction'); }
}
class PreviewSelectedEvent extends UIEvent {
    constructor() { super('previewSelectedAction'); }
}
function getKeyboardNavigationLabel(item) {
    // Filter out header vs. action vs. separator
    if (item.kind === 'action') {
        return item.label;
    }
    return undefined;
}
/**
 * A standalone action list widget that handles core list rendering, filtering,
 * hover, submenu, and section management without depending on IContextViewService
 * or anchor-based positioning. Suitable for embedding directly in any container.
 */
let ActionListWidget = ActionListWidget_1 = class ActionListWidget extends Disposable {
    constructor(user, preview, items, _delegate, accessibilityProvider, _options, _keybindingService, _hoverService, _openerService, _instantiationService) {
        super();
        this._delegate = _delegate;
        this._options = _options;
        this._keybindingService = _keybindingService;
        this._hoverService = _hoverService;
        this._openerService = _openerService;
        this._instantiationService = _instantiationService;
        this._headerLineHeight = 24;
        this._separatorLineHeight = 8;
        this.cts = this._register(new CancellationTokenSource());
        this._hover = this._register(new MutableDisposable());
        this._submenuDisposables = this._register(new DisposableStore());
        this._collapsedSections = new Set();
        this._filterText = '';
        this._suppressHover = false;
        this._onDidRequestLayout = this._register(new Emitter());
        /**
         * Fired when the widget's visible item set changes and the parent should
         * re-layout (e.g. after filtering or collapsing a section).
         */
        this.onDidRequestLayout = this._onDidRequestLayout.event;
        this.domNode = document.createElement('div');
        this.domNode.classList.add('actionList');
        if (this._options?.descriptionBelow) {
            this.domNode.classList.add('description-below');
        }
        this._actionLineHeight = this._options?.descriptionBelow ? 48 : 24;
        // Create submenu container appended to domNode
        this._submenuContainer = document.createElement('div');
        this._submenuContainer.className = 'action-list-submenu-panel action-widget';
        this._submenuContainer.style.display = 'none';
        this.domNode.append(this._submenuContainer);
        this._register(dom.addDisposableListener(this._submenuContainer, 'mouseenter', () => {
            this._cancelSubmenuHide();
        }));
        this._register(dom.addDisposableListener(this._submenuContainer, 'mouseleave', () => {
            this._scheduleSubmenuHide();
        }));
        this._register(toDisposable(() => this._cancelSubmenuHide()));
        // Initialize collapsed sections
        if (this._options?.collapsedByDefault) {
            for (const section of this._options.collapsedByDefault) {
                this._collapsedSections.add(section);
            }
        }
        const virtualDelegate = {
            getHeight: element => {
                switch (element.kind) {
                    case "header" /* ActionListItemKind.Header */:
                        return this._headerLineHeight;
                    case "separator" /* ActionListItemKind.Separator */:
                        return this._separatorLineHeight;
                    default:
                        return this._actionLineHeight;
                }
            },
            getTemplateId: element => element.kind
        };
        const hasAnySubmenuActions = items.some(item => !!item.submenuActions?.length);
        this._list = this._register(new List(user, this.domNode, virtualDelegate, [
            new ActionItemRenderer(preview, (item) => this._removeItem(item), (element, indicator, disposables) => this._wireSubmenuIndicator(element, indicator, disposables), hasAnySubmenuActions, this._keybindingService, this._openerService),
            new HeaderRenderer(),
            new SeparatorRenderer(),
        ], {
            keyboardSupport: false,
            typeNavigationEnabled: !this._options?.showFilter,
            keyboardNavigationLabelProvider: { getKeyboardNavigationLabel },
            accessibilityProvider: {
                getAriaLabel: element => {
                    if (element.kind === "action" /* ActionListItemKind.Action */) {
                        let label = element.label ? stripNewlines(element?.label) : '';
                        if (element.description) {
                            const descText = typeof element.description === 'string' ? element.description : element.description.value;
                            label = label + ', ' + stripNewlines(descText);
                        }
                        if (element.disabled) {
                            label = localize(1867, null, label, element.disabled);
                        }
                        return label;
                    }
                    return null;
                },
                getWidgetAriaLabel: () => localize(1868, null),
                getRole: (e) => {
                    switch (e.kind) {
                        case "action" /* ActionListItemKind.Action */:
                            return 'option';
                        case "separator" /* ActionListItemKind.Separator */:
                            return 'separator';
                        default:
                            return 'separator';
                    }
                },
                getWidgetRole: () => 'listbox',
                ...accessibilityProvider
            },
        }));
        this._list.style(defaultListStyles);
        this._register(this._list.onMouseClick(e => this.onListClick(e)));
        this._register(this._list.onMouseOver(e => this.onListHover(e)));
        this._register(this._list.onDidChangeFocus(() => this.onFocus()));
        this._register(this._list.onDidChangeSelection(e => this.onListSelection(e)));
        this._allMenuItems = [...items];
        // Create filter input
        if (this._options?.showFilter) {
            this._filterContainer = document.createElement('div');
            this._filterContainer.className = 'action-list-filter';
            const filterRow = dom.append(this._filterContainer, dom.$('.action-list-filter-row'));
            this._filterInput = document.createElement('input');
            this._filterInput.type = 'text';
            this._filterInput.className = 'action-list-filter-input';
            this._filterInput.placeholder = this._options?.filterPlaceholder ?? localize(1869, null);
            this._filterInput.setAttribute('aria-label', localize(1870, null));
            filterRow.appendChild(this._filterInput);
            const filterActions = this._options?.filterActions ?? [];
            if (filterActions.length > 0) {
                const filterActionsContainer = dom.append(filterRow, dom.$('.action-list-filter-actions'));
                const filterActionBar = this._register(new ActionBar(filterActionsContainer));
                filterActionBar.push(filterActions, { icon: true, label: false });
            }
            this._register(dom.addDisposableListener(this._filterInput, 'input', () => {
                this._filterText = this._filterInput.value;
                this._applyFilter();
            }));
        }
        this._applyFilter();
        if (this._list.length) {
            this._focusCheckedOrFirst();
        }
        // ArrowRight opens submenu for the focused item and moves focus into it
        this._register(dom.addDisposableListener(this.domNode, 'keydown', (e) => {
            if (e.key === 'ArrowRight') {
                const focused = this._list.getFocus();
                if (focused.length > 0) {
                    const element = this._list.element(focused[0]);
                    if (element?.submenuActions?.length) {
                        dom.EventHelper.stop(e, true);
                        const rowElement = this._getRowElement(focused[0]);
                        if (rowElement) {
                            this._showSubmenuForElement(element, rowElement);
                            this._currentSubmenuWidget?.focus();
                        }
                    }
                }
            }
        }));
        // When the list has focus and user types a printable character,
        // forward it to the filter input so search begins automatically.
        if (this._filterInput) {
            this._register(dom.addDisposableListener(this.domNode, 'keydown', (e) => {
                if (this._filterInput && !dom.isActiveElement(this._filterInput)
                    && e.key.length === 1 && e.key !== ' ' && !e.ctrlKey && !e.metaKey && !e.altKey) {
                    this._filterInput.focus();
                    this._filterInput.value = e.key;
                    this._filterText = e.key;
                    this._applyFilter();
                    e.preventDefault();
                    e.stopPropagation();
                }
            }));
        }
    }
    _toggleSection(section) {
        if (this._collapsedSections.has(section)) {
            this._collapsedSections.delete(section);
        }
        else {
            this._collapsedSections.add(section);
        }
        this._applyFilter();
    }
    _applyFilter() {
        const filterLower = this._filterText.toLowerCase();
        const isFiltering = filterLower.length > 0;
        const visible = [];
        // Remember the focused item before splice
        const focusedIndexes = this._list.getFocus();
        let focusedItem;
        if (focusedIndexes.length > 0) {
            focusedItem = this._list.element(focusedIndexes[0]);
        }
        for (const item of this._allMenuItems) {
            if (item.kind === "header" /* ActionListItemKind.Header */) {
                if (isFiltering) {
                    // When filtering, skip all headers
                    continue;
                }
                visible.push(item);
                continue;
            }
            if (item.kind === "separator" /* ActionListItemKind.Separator */) {
                if (isFiltering) {
                    continue;
                }
                if (item.section && this._collapsedSections.has(item.section)) {
                    continue;
                }
                visible.push(item);
                continue;
            }
            // Action item
            if (isFiltering) {
                // Always show items tagged with showAlways
                if (item.showAlways) {
                    visible.push(item);
                    continue;
                }
                // When filtering, skip section toggle items and only match content
                if (item.isSectionToggle) {
                    continue;
                }
                // Match against label and description
                const label = (item.label ?? '').toLowerCase();
                const descValue = typeof item.description === 'string' ? item.description : item.description?.value ?? '';
                const desc = descValue.toLowerCase();
                if (label.includes(filterLower) || desc.includes(filterLower)) {
                    visible.push(item);
                }
            }
            else {
                // Update icon for section toggle items based on collapsed state
                if (item.isSectionToggle && item.section) {
                    const collapsed = this._collapsedSections.has(item.section);
                    visible.push({
                        ...item,
                        group: { ...item.group, icon: collapsed ? Codicon.chevronRight : Codicon.chevronDown },
                    });
                    continue;
                }
                // Not filtering - check collapsed sections
                if (item.section && this._collapsedSections.has(item.section)) {
                    continue;
                }
                visible.push(item);
            }
        }
        // Capture whether the filter input currently has focus before splice
        // which may cause DOM changes that shift focus.
        const filterInputHasFocus = this._filterInput && dom.isActiveElement(this._filterInput);
        this._list.splice(0, this._list.length, visible);
        // Notify the parent that a re-layout is needed
        this._onDidRequestLayout.fire();
        // Restore focus after splice destroyed DOM elements,
        // otherwise the blur handler in ActionWidgetService closes the widget.
        // Keep focus on the filter input if the user is typing a filter.
        if (filterInputHasFocus) {
            this._filterInput?.focus();
            // Keep a highlighted item in the list so Enter works without pressing DownArrow first
            this._focusCheckedOrFirst();
        }
        else {
            this._list.domFocus();
            // Restore focus to the previously focused item
            if (focusedItem) {
                const focusedItemId = focusedItem.item?.id;
                if (focusedItemId) {
                    for (let i = 0; i < this._list.length; i++) {
                        const el = this._list.element(i);
                        if (el.item?.id === focusedItemId) {
                            this._list.setFocus([i]);
                            this._list.reveal(i);
                            break;
                        }
                    }
                }
            }
        }
    }
    /**
     * Returns the filter container element, if filter is enabled.
     * The caller is responsible for appending it to the widget DOM.
     */
    get filterContainer() {
        return this._filterContainer;
    }
    get filterInput() {
        return this._filterInput;
    }
    focusCondition(element) {
        return !element.disabled && element.kind === "action" /* ActionListItemKind.Action */;
    }
    focus() {
        if (this._filterInput && this._options?.focusFilterOnOpen) {
            this._filterInput.focus();
            // Highlight the first item so Enter works immediately
            this._focusCheckedOrFirst();
            return;
        }
        this._list.domFocus();
        this._focusCheckedOrFirst();
    }
    getFocusedElement() {
        const focused = this._list.getFocus();
        if (focused.length > 0) {
            return this._list.element(focused[0]);
        }
        return undefined;
    }
    _focusCheckedOrFirst() {
        this._suppressHover = true;
        try {
            // Try to focus the checked item first
            for (let i = 0; i < this._list.length; i++) {
                const element = this._list.element(i);
                if (element.kind === "action" /* ActionListItemKind.Action */ && element.item?.checked) {
                    this._list.setFocus([i]);
                    this._list.reveal(i);
                    return;
                }
            }
            // Set focus on the first focusable item without moving DOM focus
            this._list.focusFirst(undefined, this.focusCondition);
            const focused = this._list.getFocus();
            if (focused.length > 0) {
                this._list.reveal(focused[0]);
            }
        }
        finally {
            this._suppressHover = false;
        }
    }
    hide(didCancel) {
        this._delegate.onHide(didCancel);
        this.cts.cancel();
        this._hover.clear();
        this._hideSubmenu();
    }
    clearFilter() {
        if (this._filterInput && this._filterText) {
            this._filterInput.value = '';
            this._filterText = '';
            this._applyFilter();
            return true;
        }
        return false;
    }
    /**
     * Whether this widget uses dynamic height (has filter or collapsible sections).
     */
    get hasDynamicHeight() {
        if (this._options?.showFilter) {
            return true;
        }
        return this._allMenuItems.some(item => item.isSectionToggle);
    }
    /**
     * The height of a single action row in pixels.
     */
    get lineHeight() {
        return this._actionLineHeight;
    }
    /**
     * Computes the total height of all items (including collapsed/filtered items).
     */
    computeFullHeight() {
        let fullHeight = 0;
        for (const item of this._allMenuItems) {
            switch (item.kind) {
                case "header" /* ActionListItemKind.Header */:
                    fullHeight += this._headerLineHeight;
                    break;
                case "separator" /* ActionListItemKind.Separator */:
                    fullHeight += this._separatorLineHeight;
                    break;
                default:
                    fullHeight += this._actionLineHeight;
                    break;
            }
        }
        return fullHeight;
    }
    /**
     * Computes the total height of visible items in the list.
     */
    computeListHeight() {
        const visibleCount = this._list.length;
        let listHeight = 0;
        for (let i = 0; i < visibleCount; i++) {
            const element = this._list.element(i);
            switch (element.kind) {
                case "header" /* ActionListItemKind.Header */:
                    listHeight += this._headerLineHeight;
                    break;
                case "separator" /* ActionListItemKind.Separator */:
                    listHeight += this._separatorLineHeight;
                    break;
                default:
                    listHeight += this._actionLineHeight;
                    break;
            }
        }
        return listHeight;
    }
    /**
     * Lays out the list widget with the given explicit dimensions.
     */
    layout(height, width) {
        this._list.layout(height, width);
        this.domNode.style.height = `${height}px`;
        // Place filter container on the preferred side.
        if (this._filterContainer && this._filterContainer.parentElement) {
            this._filterContainer.parentElement.insertBefore(this._filterContainer, this.domNode);
        }
    }
    computeMaxWidth(minWidth) {
        const visibleCount = this._list.length;
        const effectiveMinWidth = Math.max(minWidth, this._options?.minWidth ?? 0);
        let maxWidth = effectiveMinWidth;
        const totalItemCount = this._allMenuItems.length;
        if (totalItemCount >= 50) {
            return Math.max(380, effectiveMinWidth);
        }
        if (totalItemCount > visibleCount) {
            // Temporarily splice in all items to measure widths,
            // preventing width jumps when expanding/collapsing sections.
            const visibleItems = [];
            for (let i = 0; i < visibleCount; i++) {
                visibleItems.push(this._list.element(i));
            }
            const allItems = [...this._allMenuItems];
            this._list.splice(0, visibleCount, allItems);
            let allItemsHeight = 0;
            for (const item of allItems) {
                switch (item.kind) {
                    case "header" /* ActionListItemKind.Header */:
                        allItemsHeight += this._headerLineHeight;
                        break;
                    case "separator" /* ActionListItemKind.Separator */:
                        allItemsHeight += this._separatorLineHeight;
                        break;
                    default:
                        allItemsHeight += this._actionLineHeight;
                        break;
                }
            }
            this._list.layout(allItemsHeight);
            const itemWidths = [];
            for (let i = 0; i < allItems.length; i++) {
                const element = this._getRowElement(i);
                if (element) {
                    element.style.width = 'auto';
                    const width = element.getBoundingClientRect().width;
                    element.style.width = '';
                    itemWidths.push(width + this._computeToolbarWidth(allItems[i]));
                }
            }
            maxWidth = Math.max(...itemWidths, effectiveMinWidth);
            // Restore visible items
            this._list.splice(0, allItems.length, visibleItems);
            return maxWidth;
        }
        // All items are visible, measure them directly
        const itemWidths = [];
        for (let i = 0; i < visibleCount; i++) {
            const element = this._getRowElement(i);
            if (element) {
                element.style.width = 'auto';
                const width = element.getBoundingClientRect().width;
                element.style.width = '';
                itemWidths.push(width + this._computeToolbarWidth(this._list.element(i)));
            }
        }
        return Math.max(...itemWidths, effectiveMinWidth);
    }
    focusPrevious() {
        if (this._filterInput && dom.isActiveElement(this._filterInput)) {
            this._list.domFocus();
            // An item is already highlighted; advance from it instead of jumping to last
            const current = this._list.getFocus();
            if (current.length > 0) {
                this._list.focusPrevious(1, false, undefined, this.focusCondition);
                const focused = this._list.getFocus();
                // If we couldn't move (already at first), go to filter
                if (focused.length > 0 && focused[0] >= current[0]) {
                    this._filterInput.focus();
                }
                else if (focused.length > 0) {
                    this._list.reveal(focused[0]);
                }
            }
            else {
                this._list.focusLast(undefined, this.focusCondition);
                const focused = this._list.getFocus();
                if (focused.length > 0) {
                    this._list.reveal(focused[0]);
                }
            }
            return;
        }
        const previousFocus = this._list.getFocus();
        this._list.focusPrevious(1, true, undefined, this.focusCondition);
        const focused = this._list.getFocus();
        if (focused.length > 0) {
            // If focus wrapped (was at first focusable, now at last), move to filter instead
            if (this._filterInput && previousFocus.length > 0 && focused[0] > previousFocus[0]) {
                this._list.setFocus([]);
                this._filterInput.focus();
                return;
            }
            this._list.reveal(focused[0]);
        }
    }
    focusNext() {
        if (this._filterInput && dom.isActiveElement(this._filterInput)) {
            this._list.domFocus();
            // An item is already highlighted; advance from it instead of jumping to first
            const current = this._list.getFocus();
            if (current.length > 0) {
                this._list.focusNext(1, false, undefined, this.focusCondition);
                const focused = this._list.getFocus();
                if (focused.length > 0) {
                    this._list.reveal(focused[0]);
                }
            }
            else {
                this._list.focusFirst(undefined, this.focusCondition);
                const focused = this._list.getFocus();
                if (focused.length > 0) {
                    this._list.reveal(focused[0]);
                }
            }
            return;
        }
        const previousFocus = this._list.getFocus();
        this._list.focusNext(1, true, undefined, this.focusCondition);
        const focused = this._list.getFocus();
        if (focused.length > 0) {
            // If focus wrapped (was at last focusable, now at first), move to filter instead
            if (this._filterInput && previousFocus.length > 0 && focused[0] < previousFocus[0]) {
                this._list.setFocus([]);
                this._filterInput.focus();
                return;
            }
            this._list.reveal(focused[0]);
        }
    }
    collapseFocusedSection() {
        const section = this._getFocusedSection();
        if (section && !this._collapsedSections.has(section)) {
            this._toggleSection(section);
        }
    }
    expandFocusedSection() {
        const section = this._getFocusedSection();
        if (section && this._collapsedSections.has(section)) {
            this._toggleSection(section);
        }
    }
    toggleFocusedSection() {
        const focused = this._list.getFocus();
        if (focused.length === 0) {
            return false;
        }
        const element = this._list.element(focused[0]);
        if (element.isSectionToggle && element.section) {
            this._toggleSection(element.section);
            return true;
        }
        return false;
    }
    _getFocusedSection() {
        const focused = this._list.getFocus();
        if (focused.length === 0) {
            return undefined;
        }
        const element = this._list.element(focused[0]);
        if (element.isSectionToggle && element.section) {
            return element.section;
        }
        return element.section;
    }
    acceptSelected(preview) {
        const focused = this._list.getFocus();
        if (focused.length === 0) {
            return;
        }
        const focusIndex = focused[0];
        const element = this._list.element(focusIndex);
        if (!this.focusCondition(element)) {
            return;
        }
        const event = preview ? new PreviewSelectedEvent() : new AcceptSelectedEvent();
        this._list.setSelection([focusIndex], event);
    }
    onListSelection(e) {
        if (!e.elements.length) {
            return;
        }
        const element = e.elements[0];
        if (element.isSectionToggle) {
            this._list.setSelection([]);
            return;
        }
        // Don't select when clicking the submenu indicator
        if (element.submenuActions?.length && dom.isMouseEvent(e.browserEvent)) {
            const target = e.browserEvent.target;
            if (dom.isHTMLElement(target) && target.closest('.action-list-submenu-indicator')) {
                this._list.setSelection([]);
                return;
            }
        }
        if (element.item && this.focusCondition(element)) {
            this._delegate.onSelect(element.item, e.browserEvent instanceof PreviewSelectedEvent);
        }
        else {
            this._list.setSelection([]);
        }
    }
    onFocus() {
        const focused = this._list.getFocus();
        if (focused.length === 0) {
            return;
        }
        const focusIndex = focused[0];
        const element = this._list.element(focusIndex);
        this._delegate.onFocus?.(element.item);
        // Show hover on focus change (suppress during programmatic initial focus)
        if (!this._suppressHover) {
            this._showHoverForElement(element, focusIndex);
        }
    }
    _removeItem(item) {
        const index = this._allMenuItems.indexOf(item);
        if (index >= 0) {
            this._allMenuItems.splice(index, 1);
            this._applyFilter();
        }
    }
    _computeToolbarWidth(item) {
        let actionCount = item.toolbarActions?.length ?? 0;
        if (item.onRemove) {
            actionCount++;
        }
        if (actionCount === 0) {
            return 0;
        }
        // Each toolbar action button is ~22px (16px icon + padding) plus 6px row gap
        const actionButtonWidth = 22;
        return actionCount * actionButtonWidth + 6;
    }
    _getRowElement(index) {
        // eslint-disable-next-line no-restricted-syntax
        return this.domNode.ownerDocument.getElementById(this._list.getElementID(index));
    }
    _showHoverForElement(element, index) {
        this._submenuDisposables.clear();
        const rowElement = this._getRowElement(index);
        if (!rowElement) {
            this._hover.clear();
            return;
        }
        const hasHoverContent = !!element.hover?.content;
        if (!hasHoverContent) {
            this._hover.clear();
            return;
        }
        const markdown = typeof element.hover.content === 'string' ? new MarkdownString(element.hover.content) : element.hover.content;
        this._hover.value = this._hoverService.showDelayedHover({
            content: markdown ?? '',
            target: rowElement,
            additionalClasses: ['action-widget-hover'],
            position: {
                hoverPosition: 0 /* HoverPosition.LEFT */,
                forcePosition: false,
                ...element.hover.position,
            },
            appearance: {
                showPointer: true,
            },
        }, { groupId: `actionListHover` });
    }
    _wireSubmenuIndicator(element, indicator, disposables) {
        disposables.add(dom.addDisposableListener(indicator, 'mouseenter', () => {
            this._cancelSubmenuHide();
            this._showSubmenuForElement(element, indicator);
        }));
        disposables.add(dom.addDisposableListener(indicator, 'mouseleave', () => {
            this._scheduleSubmenuHide();
        }));
    }
    _showSubmenuForElement(element, indicator) {
        this._submenuDisposables.clear();
        this._hover.clear();
        dom.clearNode(this._submenuContainer);
        // Convert submenu actions into ActionListWidget items
        const submenuItems = [];
        for (const action of element.submenuActions) {
            if (action instanceof SubmenuAction) {
                // Add header for the group
                submenuItems.push({
                    kind: "header" /* ActionListItemKind.Header */,
                    group: { title: action.label },
                    label: action.label,
                });
                // Add each child action as a selectable item
                for (const child of action.actions) {
                    submenuItems.push({
                        item: child,
                        kind: "action" /* ActionListItemKind.Action */,
                        label: child.label,
                        description: child.tooltip || undefined,
                        group: { title: '', icon: ThemeIcon.fromId(child.checked ? Codicon.check.id : Codicon.blank.id) },
                        hideIcon: false,
                    });
                }
            }
        }
        const submenuDelegate = {
            onHide: () => { },
            onSelect: (action) => {
                action.run();
                this._hideSubmenu();
                this.hide();
            },
        };
        // Show container before creating widget so List can measure during construction
        this._submenuContainer.style.display = '';
        this._submenuContainer.style.position = 'absolute';
        // Position: prefer right side, fall back to left if not enough space
        const indicatorRect = indicator.getBoundingClientRect();
        const parentRect = this.domNode.getBoundingClientRect();
        const submenuWidget = this._submenuDisposables.add(this._instantiationService.createInstance((ActionListWidget_1), 'submenu', false, submenuItems, submenuDelegate, undefined, undefined));
        this._submenuContainer.appendChild(submenuWidget.domNode);
        this._currentSubmenuWidget = submenuWidget;
        // Layout: first pass renders items, second pass measures true width
        const totalHeight = submenuWidget.computeListHeight();
        submenuWidget.layout(totalHeight);
        const maxWidth = submenuWidget.computeMaxWidth(0);
        submenuWidget.layout(totalHeight, maxWidth);
        submenuWidget.domNode.style.width = `${maxWidth}px`;
        // Position: prefer right side, fall back to left if not enough space
        const targetWindow = dom.getWindow(this.domNode);
        const viewportWidth = targetWindow.innerWidth;
        const spaceRight = viewportWidth - indicatorRect.right;
        const spaceLeft = parentRect.left;
        const submenuWidth = maxWidth + 10; // account for border/padding
        if (spaceRight >= submenuWidth || spaceRight >= spaceLeft) {
            // Show on the right
            this._submenuContainer.style.left = `${indicatorRect.right - parentRect.left}px`;
        }
        else {
            // Show on the left
            this._submenuContainer.style.left = `${-submenuWidth}px`;
        }
        this._submenuContainer.style.top = `${indicatorRect.top - parentRect.top - 4}px`;
        // Keyboard navigation in submenu
        this._submenuDisposables.add(dom.addDisposableListener(submenuWidget.domNode, 'keydown', (e) => {
            if (e.key === 'ArrowLeft' || e.key === 'Escape') {
                dom.EventHelper.stop(e, true);
                this._hideSubmenu();
                this._list.domFocus();
            }
            else if (e.key === 'Enter') {
                dom.EventHelper.stop(e, true);
                const focused = submenuWidget.getFocusedElement();
                if (focused?.item) {
                    focused.item.run();
                    this._hideSubmenu();
                    this.hide();
                }
            }
            else if (e.key === 'ArrowDown') {
                dom.EventHelper.stop(e, true);
                submenuWidget.focusNext();
            }
            else if (e.key === 'ArrowUp') {
                dom.EventHelper.stop(e, true);
                submenuWidget.focusPrevious();
            }
        }));
    }
    _hideSubmenu() {
        this._cancelSubmenuHide();
        this._submenuDisposables.clear();
        this._currentSubmenuWidget = undefined;
        dom.clearNode(this._submenuContainer);
        this._submenuContainer.style.display = 'none';
    }
    _scheduleSubmenuHide() {
        this._cancelSubmenuHide();
        this._submenuHideTimeout = setTimeout(() => {
            this._hideSubmenu();
        }, 300);
    }
    _cancelSubmenuHide() {
        if (this._submenuHideTimeout !== undefined) {
            clearTimeout(this._submenuHideTimeout);
            this._submenuHideTimeout = undefined;
        }
    }
    async onListHover(e) {
        const element = e.element;
        if (element && element.item && this.focusCondition(element)) {
            // Check if the hover target is inside a toolbar or submenu indicator - if so, skip the splice
            // to avoid re-rendering which would destroy the element mid-hover
            const isHoveringToolbar = dom.isHTMLElement(e.browserEvent.target) && e.browserEvent.target.closest('.action-list-item-toolbar') !== null;
            const submenuIndicator = dom.isHTMLElement(e.browserEvent.target) ? e.browserEvent.target.closest('.action-list-submenu-indicator') : null;
            if (isHoveringToolbar) {
                this._list.setFocus([]);
                return;
            }
            if (submenuIndicator && element.submenuActions?.length) {
                this._list.setFocus(typeof e.index === 'number' ? [e.index] : []);
                this._cancelSubmenuHide();
                this._showSubmenuForElement(element, submenuIndicator);
                return;
            }
            // Set focus immediately for responsive hover feedback
            this._list.setFocus(typeof e.index === 'number' ? [e.index] : []);
            this._hideSubmenu();
            if (this._delegate.onHover && !element.disabled && element.kind === "action" /* ActionListItemKind.Action */) {
                const result = await this._delegate.onHover(element.item, this.cts.token);
                const canPreview = result ? result.canPreview : undefined;
                if (canPreview !== element.canPreview) {
                    element.canPreview = canPreview;
                    if (typeof e.index === 'number') {
                        this._list.splice(e.index, 1, [element]);
                        this._list.setFocus([e.index]);
                    }
                }
            }
        }
        else if (element && element.hover?.content && typeof e.index === 'number') {
            // Show hover for disabled items that have hover content
            this._showHoverForElement(element, e.index);
        }
    }
    onListClick(e) {
        // Click on submenu indicator opens/keeps the submenu
        if (e.element && e.element.submenuActions?.length) {
            const submenuIndicator = dom.isHTMLElement(e.browserEvent.target) ? e.browserEvent.target.closest('.action-list-submenu-indicator') : null;
            if (submenuIndicator) {
                this._cancelSubmenuHide();
                this._showSubmenuForElement(e.element, submenuIndicator);
                return;
            }
        }
        if (e.element && e.element.isSectionToggle && e.element.section) {
            const section = e.element.section;
            queueMicrotask(() => this._toggleSection(section));
            return;
        }
        if (e.element && this.focusCondition(e.element)) {
            this._list.setFocus([]);
        }
    }
};
ActionListWidget = ActionListWidget_1 = __decorate([
    __param(6, IKeybindingService),
    __param(7, IHoverService),
    __param(8, IOpenerService),
    __param(9, IInstantiationService)
], ActionListWidget);
export { ActionListWidget };
/**
 * An action list that wraps {@link ActionListWidget} with context-view positioning
 * and anchor-based height computation.
 */
let ActionList = class ActionList extends Disposable {
    get domNode() {
        return this._widget.domNode;
    }
    get filterContainer() {
        return this._widget.filterContainer;
    }
    get filterInput() {
        return this._widget.filterInput;
    }
    /**
     * Returns the resolved anchor position after the first layout.
     * Used by the context view delegate to lock the dropdown direction.
     */
    get anchorPosition() {
        if (this._showAbove === undefined) {
            return undefined;
        }
        return this._showAbove ? 1 /* AnchorPosition.ABOVE */ : 0 /* AnchorPosition.BELOW */;
    }
    constructor(user, preview, items, _delegate, accessibilityProvider, options, anchor, _contextViewService, _layoutService, instantiationService) {
        super();
        this._contextViewService = _contextViewService;
        this._layoutService = _layoutService;
        this._lastMinWidth = 0;
        this._hasLaidOut = false;
        this._anchor = anchor;
        this._widget = this._register(instantiationService.createInstance((ActionListWidget), user, preview, items, _delegate, accessibilityProvider, options));
        this._register(this._widget.onDidRequestLayout(() => {
            if (this._hasLaidOut) {
                this.layout(this._lastMinWidth);
                this._contextViewService.layout();
            }
        }));
    }
    focus() {
        this._widget.focus();
    }
    hide(didCancel) {
        this._widget.hide(didCancel);
        this._contextViewService.hideContextView();
    }
    clearFilter() {
        return this._widget.clearFilter();
    }
    focusPrevious() {
        this._widget.focusPrevious();
    }
    focusNext() {
        this._widget.focusNext();
    }
    collapseFocusedSection() {
        this._widget.collapseFocusedSection();
    }
    expandFocusedSection() {
        this._widget.expandFocusedSection();
    }
    toggleFocusedSection() {
        return this._widget.toggleFocusedSection();
    }
    acceptSelected(preview) {
        this._widget.acceptSelected(preview);
    }
    hasDynamicHeight() {
        return this._widget.hasDynamicHeight;
    }
    computeHeight() {
        const listHeight = this._widget.computeListHeight();
        const filterHeight = this._widget.filterContainer ? 36 : 0;
        const padding = 10;
        const targetWindow = dom.getWindow(this.domNode);
        let availableHeight;
        if (this.hasDynamicHeight()) {
            const viewportHeight = targetWindow.innerHeight;
            const anchorRect = getAnchorRect(this._anchor);
            const anchorTopInViewport = anchorRect.top - targetWindow.pageYOffset;
            const spaceBelow = viewportHeight - anchorTopInViewport - anchorRect.height - padding;
            const spaceAbove = anchorTopInViewport - padding;
            // Lock the direction on first layout based on whether the full
            // unconstrained list fits below. Once decided, the dropdown stays
            // in the same position even when the visible item count changes.
            if (this._showAbove === undefined) {
                const fullHeight = filterHeight + this._widget.computeFullHeight();
                this._showAbove = fullHeight > spaceBelow && spaceAbove > spaceBelow;
            }
            availableHeight = this._showAbove ? spaceAbove : spaceBelow;
        }
        else {
            const windowHeight = this._layoutService.getContainer(targetWindow).clientHeight;
            const widgetTop = this.domNode.getBoundingClientRect().top;
            availableHeight = widgetTop > 0 ? windowHeight - widgetTop - padding : windowHeight * 0.7;
        }
        const viewportMaxHeight = Math.floor(targetWindow.innerHeight * 0.6);
        const actionLineHeight = this._widget.lineHeight;
        const maxHeight = Math.min(Math.max(availableHeight, actionLineHeight * 3 + filterHeight), viewportMaxHeight);
        const height = Math.min(listHeight + filterHeight, maxHeight);
        return height - filterHeight;
    }
    layout(minWidth) {
        this._hasLaidOut = true;
        this._lastMinWidth = minWidth;
        const listHeight = this.computeHeight();
        this._widget.layout(listHeight);
        this._cachedMaxWidth = this._widget.computeMaxWidth(minWidth);
        this._widget.layout(listHeight, this._cachedMaxWidth);
        return this._cachedMaxWidth;
    }
};
ActionList = __decorate([
    __param(7, IContextViewService),
    __param(8, ILayoutService),
    __param(9, IInstantiationService)
], ActionList);
export { ActionList };
function stripNewlines(str) {
    return str.replace(/\r\n|\r|\n/g, ' ');
}
//# sourceMappingURL=actionList.js.map