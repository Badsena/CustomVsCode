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
import { IActionWidgetService } from './actionWidget.js';
import { BaseDropdown } from '../../../base/browser/ui/dropdown/dropdown.js';
import { ThemeIcon } from '../../../base/common/themables.js';
import { Codicon } from '../../../base/common/codicons.js';
import { getActiveElement, isHTMLElement } from '../../../base/browser/dom.js';
import { IKeybindingService } from '../../keybinding/common/keybinding.js';
import { ITelemetryService } from '../../telemetry/common/telemetry.js';
/**
 * Action widget dropdown is a dropdown that uses the action widget under the hood to simulate a native dropdown menu
 * The benefits of this include non native features such as headers, descriptions, icons, and button bar
 */
let ActionWidgetDropdown = class ActionWidgetDropdown extends BaseDropdown {
    constructor(container, _options, actionWidgetService, keybindingService, telemetryService) {
        super(container, _options);
        this._options = _options;
        this.actionWidgetService = actionWidgetService;
        this.keybindingService = keybindingService;
        this.telemetryService = telemetryService;
        this._enabled = true;
    }
    show() {
        if (!this._enabled) {
            return;
        }
        const actionBarActions = this._options.actionBarActions ?? this._options.actionBarActionProvider?.getActions() ?? [];
        const actions = this._options.actions ?? this._options.actionProvider?.getActions() ?? [];
        // Track the currently selected option before opening
        const optionBeforeOpen = actions.find(a => a.checked);
        let selectedOption = optionBeforeOpen;
        const actionWidgetItems = [];
        const actionsByCategory = new Map();
        for (const action of actions) {
            let category = action.category;
            if (!category) {
                category = { label: '', order: Number.MIN_SAFE_INTEGER };
            }
            if (!actionsByCategory.has(category.label)) {
                actionsByCategory.set(category.label, []);
            }
            actionsByCategory.get(category.label).push(action);
        }
        // Sort categories by order
        const sortedCategories = Array.from(actionsByCategory.entries())
            .sort((a, b) => {
            const aOrder = a[1][0]?.category?.order ?? Number.MAX_SAFE_INTEGER;
            const bOrder = b[1][0]?.category?.order ?? Number.MAX_SAFE_INTEGER;
            return aOrder - bOrder;
        });
        for (let i = 0; i < sortedCategories.length; i++) {
            const [categoryLabel, categoryActions] = sortedCategories[i];
            const showHeader = categoryActions[0]?.category?.showHeader ?? false;
            if (showHeader && categoryLabel) {
                actionWidgetItems.push({
                    kind: "header" /* ActionListItemKind.Header */,
                    label: categoryLabel,
                    canPreview: false,
                    disabled: false,
                    hideIcon: false,
                });
            }
            // Push actions for each category
            for (const action of categoryActions) {
                actionWidgetItems.push({
                    item: action,
                    tooltip: action.tooltip,
                    description: action.description,
                    hover: action.hover,
                    toolbarActions: action.toolbarActions,
                    kind: "action" /* ActionListItemKind.Action */,
                    canPreview: false,
                    group: { title: '', icon: action.icon ?? ThemeIcon.fromId(action.checked ? Codicon.check.id : Codicon.blank.id) },
                    disabled: !action.enabled,
                    hideIcon: false,
                    label: action.label,
                    keybinding: this._options.showItemKeybindings ?
                        this.keybindingService.lookupKeybinding(action.id) :
                        undefined,
                });
            }
            // Add separator after each category except the last one
            if (i < sortedCategories.length - 1) {
                actionWidgetItems.push({
                    label: '',
                    kind: "separator" /* ActionListItemKind.Separator */,
                    canPreview: false,
                    disabled: false,
                    hideIcon: false,
                });
            }
        }
        const previouslyFocusedElement = getActiveElement();
        const auxiliaryActionIds = new Set(actionBarActions.map(action => action.id));
        const actionWidgetDelegate = {
            onSelect: (action, preview) => {
                if (!auxiliaryActionIds.has(action.id)) {
                    selectedOption = action;
                }
                this.actionWidgetService.hide();
                action.run();
            },
            onHide: () => {
                this.hide();
                if (isHTMLElement(previouslyFocusedElement)) {
                    previouslyFocusedElement.focus();
                }
                this._emitCloseEvent(optionBeforeOpen, selectedOption);
            }
        };
        if (actionBarActions.length) {
            if (actionWidgetItems.length) {
                actionWidgetItems.push({
                    label: '',
                    kind: "separator" /* ActionListItemKind.Separator */,
                    canPreview: false,
                    disabled: false,
                    hideIcon: false,
                });
            }
            for (const action of actionBarActions) {
                actionWidgetItems.push({
                    item: action,
                    tooltip: action.tooltip,
                    kind: "action" /* ActionListItemKind.Action */,
                    canPreview: false,
                    group: { title: '', icon: ThemeIcon.fromId(Codicon.blank.id) },
                    disabled: !action.enabled,
                    hideIcon: false,
                    label: action.label,
                });
            }
        }
        const accessibilityProvider = {
            isChecked(element) {
                return element.kind === "action" /* ActionListItemKind.Action */ && !!element?.item?.checked;
            },
            getRole: (e) => {
                switch (e.kind) {
                    case "action" /* ActionListItemKind.Action */:
                        // Auxiliary actions are not checkable options, so use 'menuitem' to
                        // avoid screen readers announcing them as unchecked checkboxes.
                        return e.item && auxiliaryActionIds.has(e.item.id) ? 'menuitem' : 'menuitemcheckbox';
                    case "separator" /* ActionListItemKind.Separator */:
                        return 'separator';
                    default:
                        return 'separator';
                }
            },
            getWidgetRole: () => 'menu',
        };
        super.show();
        this.actionWidgetService.show(this._options.label ?? '', false, actionWidgetItems, actionWidgetDelegate, this._options.getAnchor?.() ?? this.element, undefined, [], accessibilityProvider, this._options.listOptions);
    }
    setEnabled(enabled) {
        this._enabled = enabled;
    }
    _emitCloseEvent(optionBeforeOpen, selectedOption) {
        const optionBefore = optionBeforeOpen;
        const optionAfter = selectedOption;
        if (this._options.reporter) {
            this.telemetryService.publicLog2('actionWidgetDropdownClosed', {
                id: this._options.reporter.id,
                name: this._options.reporter.name,
                selectionChanged: optionBefore?.id !== optionAfter?.id,
                optionIdBefore: this._options.reporter.includeOptions ? optionBefore?.id : undefined,
                optionIdAfter: this._options.reporter.includeOptions ? optionAfter?.id : undefined,
                optionLabelBefore: this._options.reporter.includeOptions ? optionBefore?.label : undefined,
                optionLabelAfter: this._options.reporter.includeOptions ? optionAfter?.label : undefined,
            });
        }
    }
};
ActionWidgetDropdown = __decorate([
    __param(2, IActionWidgetService),
    __param(3, IKeybindingService),
    __param(4, ITelemetryService)
], ActionWidgetDropdown);
export { ActionWidgetDropdown };
//# sourceMappingURL=actionWidgetDropdown.js.map