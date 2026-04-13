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
import * as dom from '../../../../../../base/browser/dom.js';
import { renderIcon, renderLabelWithIcons } from '../../../../../../base/browser/ui/iconLabel/iconLabels.js';
import { autorun } from '../../../../../../base/common/observable.js';
import { localize } from '../../../../../../nls.js';
import { IActionWidgetService } from '../../../../../../platform/actionWidget/browser/actionWidget.js';
import { ICommandService } from '../../../../../../platform/commands/common/commands.js';
import { IContextKeyService } from '../../../../../../platform/contextkey/common/contextkey.js';
import { IKeybindingService } from '../../../../../../platform/keybinding/common/keybinding.js';
import { IProductService } from '../../../../../../platform/product/common/productService.js';
import { ITelemetryService } from '../../../../../../platform/telemetry/common/telemetry.js';
import { TelemetryTrustedValue } from '../../../../../../platform/telemetry/common/telemetryUtils.js';
import { ChatEntitlement, IChatEntitlementService } from '../../../../../services/chat/common/chatEntitlementService.js';
import { MANAGE_CHAT_COMMAND_ID } from '../../../common/constants.js';
import { DEFAULT_MODEL_PICKER_CATEGORY } from '../../../common/widget/input/modelPickerWidget.js';
import { ChatInputPickerActionViewItem } from './chatInputPickerActionItem.js';
function modelDelegateToWidgetActionsProvider(delegate, telemetryService, pickerOptions) {
    return {
        getActions: () => {
            const models = delegate.getModels();
            if (models.length === 0) {
                // Show a fake "Auto" entry when no models are available
                return [{
                        id: 'auto',
                        enabled: true,
                        checked: true,
                        category: DEFAULT_MODEL_PICKER_CATEGORY,
                        class: undefined,
                        tooltip: localize(8268, null),
                        label: localize(8269, null),
                        hover: { content: localize(8270, null), position: pickerOptions.hoverPosition },
                        run: () => { }
                    }];
            }
            return models.map(model => {
                const hoverContent = model.metadata.tooltip;
                return {
                    id: model.metadata.id,
                    enabled: true,
                    icon: model.metadata.statusIcon,
                    checked: model.identifier === delegate.currentModel.get()?.identifier,
                    category: model.metadata.modelPickerCategory || DEFAULT_MODEL_PICKER_CATEGORY,
                    class: undefined,
                    description: model.metadata.multiplier ?? model.metadata.detail,
                    tooltip: hoverContent ? '' : model.metadata.name,
                    hover: hoverContent ? { content: hoverContent, position: pickerOptions.hoverPosition } : undefined,
                    label: model.metadata.name,
                    run: () => {
                        const previousModel = delegate.currentModel.get();
                        telemetryService.publicLog2('chat.modelChange', {
                            fromModel: previousModel?.metadata.vendor === 'copilot' ? new TelemetryTrustedValue(previousModel.identifier) : 'unknown',
                            toModel: model.metadata.vendor === 'copilot' ? new TelemetryTrustedValue(model.identifier) : 'unknown'
                        });
                        delegate.setModel(model);
                    }
                };
            });
        }
    };
}
function getModelPickerActionBarActionProvider(commandService, chatEntitlementService, productService) {
    const actionProvider = {
        getActions: () => {
            const additionalActions = [];
            if (chatEntitlementService.entitlement === ChatEntitlement.Free ||
                chatEntitlementService.entitlement === ChatEntitlement.Pro ||
                chatEntitlementService.entitlement === ChatEntitlement.ProPlus ||
                chatEntitlementService.entitlement === ChatEntitlement.Business ||
                chatEntitlementService.entitlement === ChatEntitlement.Enterprise ||
                chatEntitlementService.isInternal) {
                additionalActions.push({
                    id: 'manageModels',
                    label: localize(8271, null),
                    enabled: true,
                    tooltip: localize(8272, null),
                    class: undefined,
                    run: () => {
                        commandService.executeCommand(MANAGE_CHAT_COMMAND_ID);
                    }
                });
            }
            // Add sign-in / upgrade option if entitlement is anonymous / free / new user
            const isNewOrAnonymousUser = !chatEntitlementService.sentiment.installed ||
                chatEntitlementService.entitlement === ChatEntitlement.Available ||
                chatEntitlementService.anonymous ||
                chatEntitlementService.entitlement === ChatEntitlement.Unknown;
            if (isNewOrAnonymousUser || chatEntitlementService.entitlement === ChatEntitlement.Free) {
                additionalActions.push({
                    id: 'moreModels',
                    label: isNewOrAnonymousUser ? localize(8273, null) : localize(8274, null),
                    enabled: true,
                    tooltip: isNewOrAnonymousUser ? localize(8275, null) : localize(8276, null),
                    class: undefined,
                    run: () => {
                        const commandId = isNewOrAnonymousUser ? 'workbench.action.chat.triggerSetup' : 'workbench.action.chat.upgradePlan';
                        commandService.executeCommand(commandId);
                    }
                });
            }
            return additionalActions;
        }
    };
    return actionProvider;
}
/**
 * Action view item for selecting a language model in the chat interface.
 */
let ModelPickerActionItem = class ModelPickerActionItem extends ChatInputPickerActionViewItem {
    constructor(action, widgetOptions, delegate, pickerOptions, actionWidgetService, contextKeyService, commandService, chatEntitlementService, keybindingService, telemetryService, productService) {
        // Modify the original action with a different label and make it show the current model
        const actionWithLabel = {
            ...action,
            label: delegate.currentModel.get()?.metadata.name ?? localize(8277, null),
            run: () => { }
        };
        const baseActionBarActionProvider = getModelPickerActionBarActionProvider(commandService, chatEntitlementService, productService);
        const modelPickerActionWidgetOptions = {
            actionProvider: modelDelegateToWidgetActionsProvider(delegate, telemetryService, pickerOptions),
            actionBarActionProvider: { getActions: () => baseActionBarActionProvider.getActions() },
            reporter: { id: 'ChatModelPicker', name: 'ChatModelPicker', includeOptions: true },
        };
        super(actionWithLabel, widgetOptions ?? modelPickerActionWidgetOptions, pickerOptions, actionWidgetService, keybindingService, contextKeyService, telemetryService);
        this.currentModel = delegate.currentModel.get();
        // Listen for model changes from the delegate
        this._register(autorun(t => {
            const model = delegate.currentModel.read(t);
            this.currentModel = model;
            this.updateTooltip();
            if (this.element) {
                this.renderLabel(this.element);
            }
        }));
    }
    getHoverContents() {
        const label = `${localize(8278, null)}${super.getHoverContents()}`;
        const { statusIcon, tooltip } = this.currentModel?.metadata || {};
        return statusIcon && tooltip ? `${label} • ${tooltip}` : label;
    }
    setAriaLabelAttributes(element) {
        super.setAriaLabelAttributes(element);
        const modelName = this.currentModel?.metadata.name ?? localize(8279, null);
        element.ariaLabel = localize(8280, null, modelName);
    }
    renderLabel(element) {
        const { name, statusIcon } = this.currentModel?.metadata || {};
        const domChildren = [];
        if (statusIcon) {
            const iconElement = renderIcon(statusIcon);
            domChildren.push(iconElement);
        }
        domChildren.push(dom.$('span.chat-input-picker-label', undefined, name ?? localize(8281, null)));
        domChildren.push(...renderLabelWithIcons(`$(chevron-down)`));
        dom.reset(element, ...domChildren);
        this.setAriaLabelAttributes(element);
        return null;
    }
};
ModelPickerActionItem = __decorate([
    __param(4, IActionWidgetService),
    __param(5, IContextKeyService),
    __param(6, ICommandService),
    __param(7, IChatEntitlementService),
    __param(8, IKeybindingService),
    __param(9, ITelemetryService),
    __param(10, IProductService)
], ModelPickerActionItem);
export { ModelPickerActionItem };
//# sourceMappingURL=modelPickerActionItem.js.map