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
import { getActiveWindow } from '../../../../../../base/browser/dom.js';
import { autorun } from '../../../../../../base/common/observable.js';
import { ActionWidgetDropdownActionViewItem } from '../../../../../../platform/actions/browser/actionWidgetDropdownActionViewItem.js';
import { IActionWidgetService } from '../../../../../../platform/actionWidget/browser/actionWidget.js';
import { IContextKeyService } from '../../../../../../platform/contextkey/common/contextkey.js';
import { IKeybindingService } from '../../../../../../platform/keybinding/common/keybinding.js';
import { ITelemetryService } from '../../../../../../platform/telemetry/common/telemetry.js';
/**
 * Base class for chat input picker action items (model picker, mode picker, session target picker).
 * Provides common anchor resolution logic for dropdown positioning.
 */
let ChatInputPickerActionViewItem = class ChatInputPickerActionViewItem extends ActionWidgetDropdownActionViewItem {
    constructor(action, actionWidgetOptions, pickerOptions, actionWidgetService, keybindingService, contextKeyService, telemetryService) {
        // Inject the anchor getter into the options
        const optionsWithAnchor = {
            ...actionWidgetOptions,
            getAnchor: () => this.getAnchorElement(),
        };
        super(action, optionsWithAnchor, actionWidgetService, keybindingService, contextKeyService, telemetryService);
        this.pickerOptions = pickerOptions;
        this._register(autorun(reader => {
            const hideChevrons = this.pickerOptions.hideChevrons.read(reader);
            if (this.element) {
                this.element.classList.toggle('hide-chevrons', hideChevrons);
                this.renderLabel(this.element);
            }
        }));
    }
    /**
     * Returns the anchor element for the dropdown.
     * Falls back to the overflow anchor if this element is not in the DOM.
     */
    getAnchorElement() {
        if (this.element && getActiveWindow().document.contains(this.element)) {
            return this.element;
        }
        return this.pickerOptions.getOverflowAnchor?.() ?? this.element;
    }
    render(container) {
        super.render(container);
        container.classList.add('chat-input-picker-item');
        // Apply initial collapsed state now that this.element exists
        const hideChevrons = this.pickerOptions.hideChevrons.get();
        if (this.element) {
            this.element.classList.toggle('hide-chevrons', hideChevrons);
            this.renderLabel(this.element);
        }
    }
};
ChatInputPickerActionViewItem = __decorate([
    __param(3, IActionWidgetService),
    __param(4, IKeybindingService),
    __param(5, IContextKeyService),
    __param(6, ITelemetryService)
], ChatInputPickerActionViewItem);
export { ChatInputPickerActionViewItem };
//# sourceMappingURL=chatInputPickerActionItem.js.map