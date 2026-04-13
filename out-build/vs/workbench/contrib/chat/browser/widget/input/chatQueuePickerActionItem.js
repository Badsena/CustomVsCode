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
import { $, addDisposableListener, append, EventType, ModifierKeyEmitter } from '../../../../../../base/browser/dom.js';
import { StandardKeyboardEvent } from '../../../../../../base/browser/keyboardEvent.js';
import { ActionViewItem, BaseActionViewItem } from '../../../../../../base/browser/ui/actionbar/actionViewItems.js';
import { Action } from '../../../../../../base/common/actions.js';
import { Codicon } from '../../../../../../base/common/codicons.js';
import { Disposable } from '../../../../../../base/common/lifecycle.js';
import { ThemeIcon } from '../../../../../../base/common/themables.js';
import { localize } from '../../../../../../nls.js';
import { IActionViewItemService } from '../../../../../../platform/actions/browser/actionViewItemService.js';
import { ActionWidgetDropdownActionViewItem } from '../../../../../../platform/actions/browser/actionWidgetDropdownActionViewItem.js';
import { MenuId, SubmenuItemAction } from '../../../../../../platform/actions/common/actions.js';
import { IActionWidgetService } from '../../../../../../platform/actionWidget/browser/actionWidget.js';
import { ICommandService } from '../../../../../../platform/commands/common/commands.js';
import { IConfigurationService } from '../../../../../../platform/configuration/common/configuration.js';
import { IContextKeyService } from '../../../../../../platform/contextkey/common/contextkey.js';
import { IKeybindingService } from '../../../../../../platform/keybinding/common/keybinding.js';
import { ITelemetryService } from '../../../../../../platform/telemetry/common/telemetry.js';
import { ChatContextKeys } from '../../../common/actions/chatContextKeys.js';
import { ChatConfiguration } from '../../../common/constants.js';
import { ChatSubmitAction } from '../../actions/chatExecuteActions.js';
import { ChatQueueMessageAction, ChatSteerWithMessageAction } from '../../actions/chatQueueActions.js';
/**
 * Split-button action view item for the queue/steer picker in the chat execute toolbar.
 * The primary button runs the current default action (queue or steer).
 * The dropdown arrow opens a custom action widget with hover descriptions.
 *
 * Follows the same split-button pattern as {@link DropdownWithDefaultActionViewItem},
 * but uses {@link ActionWidgetDropdownActionViewItem} for the dropdown to show
 * an action widget with hover descriptions instead of a standard context menu.
 */
let ChatQueuePickerActionItem = class ChatQueuePickerActionItem extends BaseActionViewItem {
    constructor(action, _options, commandService, configurationService, actionWidgetService, keybindingService, contextKeyService, telemetryService) {
        super(undefined, action);
        this.commandService = commandService;
        this.configurationService = configurationService;
        this._altKeyPressed = false;
        const isSteerDefault = this._isSteerDefault();
        // Primary action - runs the current default (queue or steer)
        this._primaryActionAction = this._register(new Action('chat.queuePickerPrimary', isSteerDefault ? localize(8225, null) : localize(8226, null), ThemeIcon.asClassName(isSteerDefault ? Codicon.arrowUp : Codicon.add), !!contextKeyService.getContextKeyValue(ChatContextKeys.inputHasText.key), () => this._runDefaultAction()));
        this._primaryAction = this._register(new ActionViewItem(undefined, this._primaryActionAction, { icon: true, label: false }));
        this._register(contextKeyService.onDidChangeContext(e => {
            this._primaryActionAction.enabled = !!contextKeyService.getContextKeyValue(ChatContextKeys.inputHasText.key);
        }));
        // Dropdown - action widget with hover descriptions and chevron-down icon
        const dropdownAction = this._register(new Action('chat.queuePickerDropdown', localize(8227, null)));
        this._dropdown = this._register(new ChevronActionWidgetDropdown(dropdownAction, {
            actionProvider: { getActions: () => this._getDropdownActions() },
            showItemKeybindings: true,
        }, actionWidgetService, keybindingService, contextKeyService, telemetryService));
        // React to config changes
        this._register(this.configurationService.onDidChangeConfiguration(e => {
            if (e.affectsConfiguration(ChatConfiguration.RequestQueueingDefaultAction)) {
                this._updatePrimaryAction();
            }
        }));
        // Toggle icon when Alt key is pressed/released
        this._register(ModifierKeyEmitter.getInstance().event(status => {
            if (this._altKeyPressed !== status.altKey) {
                this._altKeyPressed = status.altKey;
                this._updatePrimaryAction();
            }
        }));
    }
    _isSteerDefault() {
        return this.configurationService.getValue(ChatConfiguration.RequestQueueingDefaultAction) === 'steer';
    }
    _isEffectiveSteer() {
        const isSteerDefault = this._isSteerDefault();
        return this._altKeyPressed ? !isSteerDefault : isSteerDefault;
    }
    _updatePrimaryAction() {
        const isSteer = this._isEffectiveSteer();
        this._primaryActionAction.label = isSteer
            ? localize(8228, null)
            : localize(8229, null);
        this._primaryActionAction.class = ThemeIcon.asClassName(isSteer ? Codicon.arrowUp : Codicon.add);
    }
    _runDefaultAction() {
        const actionId = this._isEffectiveSteer()
            ? ChatSteerWithMessageAction.ID
            : ChatQueueMessageAction.ID;
        this.commandService.executeCommand(actionId);
    }
    render(container) {
        super.render(container);
        container.classList.add('monaco-dropdown-with-default');
        // Primary action button
        const primaryContainer = $('.action-container');
        this._primaryAction.render(append(container, primaryContainer));
        this._register(addDisposableListener(primaryContainer, EventType.KEY_DOWN, (e) => {
            const event = new StandardKeyboardEvent(e);
            if (event.equals(17 /* KeyCode.RightArrow */)) {
                this._primaryAction.blur();
                this._dropdown.focus();
                event.stopPropagation();
            }
        }));
        // Dropdown arrow button
        const dropdownContainer = $('.dropdown-action-container');
        this._dropdown.render(append(container, dropdownContainer));
        this._register(addDisposableListener(dropdownContainer, EventType.KEY_DOWN, (e) => {
            const event = new StandardKeyboardEvent(e);
            if (event.equals(15 /* KeyCode.LeftArrow */)) {
                this._dropdown.setFocusable(false);
                this._primaryAction.focus();
                event.stopPropagation();
            }
        }));
    }
    focus(fromRight) {
        if (fromRight) {
            this._dropdown.focus();
        }
        else {
            this._primaryAction.focus();
        }
    }
    blur() {
        this._primaryAction.blur();
        this._dropdown.blur();
    }
    setFocusable(focusable) {
        this._primaryAction.setFocusable(focusable);
        this._dropdown.setFocusable(focusable);
    }
    _getDropdownActions() {
        const isSteerDefault = this._isSteerDefault();
        const queueAction = {
            id: ChatQueueMessageAction.ID,
            label: localize(8230, null),
            tooltip: '',
            enabled: true,
            checked: !isSteerDefault,
            icon: Codicon.add,
            class: undefined,
            hover: {
                content: localize(8231, null),
            },
            run: () => {
                this.commandService.executeCommand(ChatQueueMessageAction.ID);
            }
        };
        const steerAction = {
            id: ChatSteerWithMessageAction.ID,
            label: localize(8232, null),
            tooltip: '',
            enabled: true,
            checked: isSteerDefault,
            icon: Codicon.arrowUp,
            class: undefined,
            hover: {
                content: localize(8233, null),
            },
            run: () => {
                this.commandService.executeCommand(ChatSteerWithMessageAction.ID);
            }
        };
        const sendAction = {
            id: '_' + ChatSubmitAction.ID, // _ to avoid showing a keybinding which is not valid in this context
            label: localize(8234, null),
            tooltip: '',
            enabled: true,
            icon: Codicon.arrowRight,
            class: undefined,
            hover: {
                content: localize(8235, null),
            },
            run: () => {
                this.commandService.executeCommand(ChatSubmitAction.ID);
            }
        };
        return [sendAction, queueAction, steerAction];
    }
};
ChatQueuePickerActionItem = __decorate([
    __param(2, ICommandService),
    __param(3, IConfigurationService),
    __param(4, IActionWidgetService),
    __param(5, IKeybindingService),
    __param(6, IContextKeyService),
    __param(7, ITelemetryService)
], ChatQueuePickerActionItem);
export { ChatQueuePickerActionItem };
/**
 * {@link ActionWidgetDropdownActionViewItem} that renders a chevron-down icon
 * as its label, used as the dropdown arrow in the split button.
 */
class ChevronActionWidgetDropdown extends ActionWidgetDropdownActionViewItem {
    renderLabel(element) {
        element.classList.add('codicon', 'codicon-chevron-down');
        return null;
    }
}
/**
 * Workbench contribution that registers a custom action view item for the
 * queue/steer picker in the execute toolbar. This replaces the default split
 * button with a custom dropdown similar to the model switcher.
 */
let ChatQueuePickerRendering = class ChatQueuePickerRendering extends Disposable {
    static { this.ID = 'chat.queuePickerRendering'; }
    constructor(actionViewItemService) {
        super();
        this._register(actionViewItemService.register(MenuId.ChatExecute, MenuId.ChatExecuteQueue, (action, options, instantiationService) => {
            if (!(action instanceof SubmenuItemAction)) {
                return undefined;
            }
            return instantiationService.createInstance(ChatQueuePickerActionItem, action, options);
        }));
    }
};
ChatQueuePickerRendering = __decorate([
    __param(0, IActionViewItemService)
], ChatQueuePickerRendering);
export { ChatQueuePickerRendering };
//# sourceMappingURL=chatQueuePickerActionItem.js.map