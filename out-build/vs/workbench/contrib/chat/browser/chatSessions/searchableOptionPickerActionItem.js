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
var SearchableOptionPickerActionItem_1;
import './media/chatSessionPickerActionItem.css';
import { CancellationTokenSource } from '../../../../../base/common/cancellation.js';
import { Delayer } from '../../../../../base/common/async.js';
import * as dom from '../../../../../base/browser/dom.js';
import { IActionWidgetService } from '../../../../../platform/actionWidget/browser/actionWidget.js';
import { IContextKeyService } from '../../../../../platform/contextkey/common/contextkey.js';
import { IKeybindingService } from '../../../../../platform/keybinding/common/keybinding.js';
import { DisposableStore } from '../../../../../base/common/lifecycle.js';
import { renderLabelWithIcons, renderIcon } from '../../../../../base/browser/ui/iconLabel/iconLabels.js';
import { localize } from '../../../../../nls.js';
import { IQuickInputService } from '../../../../../platform/quickinput/common/quickInput.js';
import { ThemeIcon } from '../../../../../base/common/themables.js';
import { ChatSessionPickerActionItem } from './chatSessionPickerActionItem.js';
import { ILogService } from '../../../../../platform/log/common/log.js';
import { ICommandService } from '../../../../../platform/commands/common/commands.js';
import { ITelemetryService } from '../../../../../platform/telemetry/common/telemetry.js';
function isSearchableOptionQuickPickItem(item) {
    return !!item && typeof item.optionItem === 'object';
}
/**
 * Action view item for searchable option groups with QuickPick.
 * Used when an option group has `searchable: true` (e.g., repository selection).
 * Shows an inline dropdown with items + "See more..." option that opens a searchable QuickPick.
 */
let SearchableOptionPickerActionItem = class SearchableOptionPickerActionItem extends ChatSessionPickerActionItem {
    static { SearchableOptionPickerActionItem_1 = this; }
    static { this.SEE_MORE_ID = '__see_more__'; }
    constructor(action, initialState, delegate, pickerOptions, actionWidgetService, contextKeyService, keybindingService, quickInputService, logService, commandService, telemetryService) {
        super(action, initialState, delegate, pickerOptions, actionWidgetService, contextKeyService, keybindingService, commandService, telemetryService);
        this.quickInputService = quickInputService;
        this.logService = logService;
    }
    getDropdownActions() {
        // If locked, show the current option only
        const currentOption = this.delegate.getCurrentOption();
        if (currentOption?.locked) {
            return [this.createLockedOptionAction(currentOption)];
        }
        const optionGroup = this.delegate.getOptionGroup();
        if (!optionGroup) {
            return [];
        }
        // Build actions from items
        const actions = optionGroup.items.map(optionItem => {
            const isCurrent = optionItem.id === currentOption?.id;
            return {
                id: optionItem.id,
                enabled: !optionItem.locked,
                icon: optionItem.icon,
                checked: isCurrent,
                class: undefined,
                description: optionItem.description,
                tooltip: optionItem.description ?? optionItem.name,
                label: optionItem.name,
                run: () => {
                    this.delegate.setOption(optionItem);
                }
            };
        });
        // Add "See more..." action if onSearch is available
        if (optionGroup.onSearch) {
            actions.push({
                id: SearchableOptionPickerActionItem_1.SEE_MORE_ID,
                enabled: true,
                checked: false,
                class: 'searchable-picker-see-more',
                description: undefined,
                tooltip: localize(7357, null),
                label: localize(7358, null),
                run: () => {
                    this.showSearchableQuickPick(optionGroup);
                }
            });
        }
        return actions;
    }
    renderLabel(element) {
        const domChildren = [];
        const optionGroup = this.delegate.getOptionGroup();
        element.classList.add('chat-session-option-picker');
        if (optionGroup?.icon) {
            domChildren.push(renderIcon(optionGroup.icon));
        }
        // Label
        const label = this.currentOption?.name ?? optionGroup?.name ?? localize(7359, null);
        domChildren.push(dom.$('span.chat-session-option-label', undefined, label));
        domChildren.push(...renderLabelWithIcons(`$(chevron-down)`));
        dom.reset(element, ...domChildren);
        this.setAriaLabelAttributes(element);
        return null;
    }
    getContainerClass() {
        return 'chat-searchable-option-picker-item';
    }
    /**
     * Shows the full searchable QuickPick with all items (initial + search results)
     * Called when user clicks "See more..." from the dropdown
     */
    async showSearchableQuickPick(optionGroup) {
        if (optionGroup.onSearch) {
            const disposables = new DisposableStore();
            const quickPick = this.quickInputService.createQuickPick();
            disposables.add(quickPick);
            quickPick.placeholder = optionGroup.description ?? localize(7360, null, optionGroup.name);
            quickPick.matchOnDescription = true;
            quickPick.matchOnDetail = true;
            quickPick.ignoreFocusOut = true;
            quickPick.busy = true;
            quickPick.show();
            // Debounced search state
            let currentSearchCts;
            const searchDelayer = disposables.add(new Delayer(300));
            const performSearch = async (query) => {
                // Cancel previous search
                currentSearchCts?.cancel();
                currentSearchCts?.dispose();
                currentSearchCts = new CancellationTokenSource();
                const token = currentSearchCts.token;
                quickPick.busy = true;
                try {
                    const items = await optionGroup.onSearch(query, token);
                    if (!token.isCancellationRequested) {
                        quickPick.items = items.map(item => this.createQuickPickItem(item));
                    }
                }
                catch (error) {
                    if (!token.isCancellationRequested) {
                        this.logService.error('Error fetching searchable option items:', error);
                    }
                }
                finally {
                    if (!token.isCancellationRequested) {
                        quickPick.busy = false;
                    }
                }
            };
            // Initial search with empty query
            await performSearch('');
            // Listen for value changes and perform debounced search
            disposables.add(quickPick.onDidChangeValue(value => {
                searchDelayer.trigger(() => performSearch(value));
            }));
            // Handle selection
            return new Promise((resolve) => {
                disposables.add(quickPick.onDidAccept(() => {
                    const pick = quickPick.selectedItems[0];
                    if (isSearchableOptionQuickPickItem(pick)) {
                        const selectedItem = pick.optionItem;
                        if (!selectedItem.locked) {
                            this.delegate.setOption(selectedItem);
                        }
                    }
                    quickPick.hide();
                }));
                disposables.add(quickPick.onDidHide(() => {
                    currentSearchCts?.cancel();
                    currentSearchCts?.dispose();
                    disposables.dispose();
                    resolve();
                }));
            });
        }
    }
    createQuickPickItem(item) {
        const iconClass = item.icon ? ThemeIcon.asClassName(item.icon) : undefined;
        return {
            label: item.name,
            description: item.description,
            iconClass,
            disabled: item.locked,
            optionItem: item,
        };
    }
    /**
     * Opens the picker programmatically.
     */
    show() {
        const optionGroup = this.delegate.getOptionGroup();
        if (optionGroup) {
            this.showSearchableQuickPick(optionGroup);
        }
    }
};
SearchableOptionPickerActionItem = SearchableOptionPickerActionItem_1 = __decorate([
    __param(4, IActionWidgetService),
    __param(5, IContextKeyService),
    __param(6, IKeybindingService),
    __param(7, IQuickInputService),
    __param(8, ILogService),
    __param(9, ICommandService),
    __param(10, ITelemetryService)
], SearchableOptionPickerActionItem);
export { SearchableOptionPickerActionItem };
//# sourceMappingURL=searchableOptionPickerActionItem.js.map