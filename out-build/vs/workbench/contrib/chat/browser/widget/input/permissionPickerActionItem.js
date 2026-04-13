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
import { renderLabelWithIcons } from '../../../../../../base/browser/ui/iconLabel/iconLabels.js';
import { Codicon } from '../../../../../../base/common/codicons.js';
import { ThemeIcon } from '../../../../../../base/common/themables.js';
import { localize } from '../../../../../../nls.js';
import { IActionWidgetService } from '../../../../../../platform/actionWidget/browser/actionWidget.js';
import { IContextKeyService } from '../../../../../../platform/contextkey/common/contextkey.js';
import { IKeybindingService } from '../../../../../../platform/keybinding/common/keybinding.js';
import { ITelemetryService } from '../../../../../../platform/telemetry/common/telemetry.js';
import { ChatConfiguration, ChatPermissionLevel } from '../../../common/constants.js';
import { IConfigurationService } from '../../../../../../platform/configuration/common/configuration.js';
import { IDialogService } from '../../../../../../platform/dialogs/common/dialogs.js';
import Severity from '../../../../../../base/common/severity.js';
import { MarkdownString } from '../../../../../../base/common/htmlContent.js';
import { ChatInputPickerActionViewItem } from './chatInputPickerActionItem.js';
// Track whether warnings have been shown this VS Code session
const shownWarnings = new Set();
function hasShownElevatedWarning(level) {
    if (shownWarnings.has(level)) {
        return true;
    }
    // Autopilot is stricter than AutoApprove, so confirming Autopilot
    // implies the user already accepted the AutoApprove risks.
    if (level === ChatPermissionLevel.AutoApprove && shownWarnings.has(ChatPermissionLevel.Autopilot)) {
        return true;
    }
    return false;
}
let PermissionPickerActionItem = class PermissionPickerActionItem extends ChatInputPickerActionViewItem {
    constructor(action, delegate, pickerOptions, actionWidgetService, keybindingService, contextKeyService, telemetryService, configurationService, dialogService) {
        const isAutoApprovePolicyRestricted = () => configurationService.inspect(ChatConfiguration.GlobalAutoApprove).policyValue === false;
        const isAutopilotEnabled = () => configurationService.getValue(ChatConfiguration.AutopilotEnabled) !== false;
        const actionProvider = {
            getActions: () => {
                const currentLevel = delegate.currentPermissionLevel.get();
                const policyRestricted = isAutoApprovePolicyRestricted();
                const actions = [
                    {
                        ...action,
                        id: 'chat.permissions.default',
                        label: localize(8288, null),
                        description: localize(8289, null),
                        icon: ThemeIcon.fromId(Codicon.shield.id),
                        checked: currentLevel === ChatPermissionLevel.Default,
                        tooltip: '',
                        hover: {
                            content: localize(8290, null),
                            position: pickerOptions.hoverPosition
                        },
                        run: async () => {
                            delegate.setPermissionLevel(ChatPermissionLevel.Default);
                            if (this.element) {
                                this.renderLabel(this.element);
                            }
                        },
                    },
                    {
                        ...action,
                        id: 'chat.permissions.autoApprove',
                        label: localize(8291, null),
                        description: localize(8292, null),
                        icon: ThemeIcon.fromId(Codicon.warning.id),
                        checked: currentLevel === ChatPermissionLevel.AutoApprove,
                        enabled: !policyRestricted,
                        tooltip: policyRestricted ? localize(8293, null) : '',
                        hover: {
                            content: policyRestricted
                                ? localize(8294, null)
                                : localize(8295, null),
                            position: pickerOptions.hoverPosition
                        },
                        run: async () => {
                            if (!hasShownElevatedWarning(ChatPermissionLevel.AutoApprove)) {
                                const result = await this.dialogService.prompt({
                                    type: Severity.Warning,
                                    message: localize(8296, null),
                                    buttons: [
                                        {
                                            label: localize(8297, null),
                                            run: () => true
                                        },
                                        {
                                            label: localize(8298, null),
                                            run: () => false
                                        },
                                    ],
                                    custom: {
                                        icon: Codicon.warning,
                                        markdownDetails: [{
                                                markdown: new MarkdownString(localize(8299, null)),
                                            }],
                                    },
                                });
                                if (result.result !== true) {
                                    return;
                                }
                                shownWarnings.add(ChatPermissionLevel.AutoApprove);
                            }
                            delegate.setPermissionLevel(ChatPermissionLevel.AutoApprove);
                            if (this.element) {
                                this.renderLabel(this.element);
                            }
                        },
                    },
                ];
                if (isAutopilotEnabled()) {
                    actions.push({
                        ...action,
                        id: 'chat.permissions.autopilot',
                        label: localize(8300, null),
                        description: localize(8301, null),
                        icon: ThemeIcon.fromId(Codicon.rocket.id),
                        checked: currentLevel === ChatPermissionLevel.Autopilot,
                        enabled: !policyRestricted,
                        tooltip: policyRestricted ? localize(8302, null) : '',
                        hover: {
                            content: policyRestricted
                                ? localize(8303, null)
                                : localize(8304, null),
                            position: pickerOptions.hoverPosition
                        },
                        run: async () => {
                            if (!hasShownElevatedWarning(ChatPermissionLevel.Autopilot)) {
                                const result = await this.dialogService.prompt({
                                    type: Severity.Warning,
                                    message: localize(8305, null),
                                    buttons: [
                                        {
                                            label: localize(8306, null),
                                            run: () => true
                                        },
                                        {
                                            label: localize(8307, null),
                                            run: () => false
                                        },
                                    ],
                                    custom: {
                                        icon: Codicon.rocket,
                                        markdownDetails: [{
                                                markdown: new MarkdownString(localize(8308, null)),
                                            }],
                                    },
                                });
                                if (result.result !== true) {
                                    return;
                                }
                                shownWarnings.add(ChatPermissionLevel.Autopilot);
                            }
                            delegate.setPermissionLevel(ChatPermissionLevel.Autopilot);
                            if (this.element) {
                                this.renderLabel(this.element);
                            }
                        },
                    });
                }
                return actions;
            }
        };
        super(action, {
            actionProvider,
            reporter: { id: 'ChatPermissionPicker', name: 'ChatPermissionPicker', includeOptions: true },
            listOptions: { descriptionBelow: true, minWidth: 255 },
        }, pickerOptions, actionWidgetService, keybindingService, contextKeyService, telemetryService);
        this.delegate = delegate;
        this.dialogService = dialogService;
    }
    renderLabel(element) {
        this.setAriaLabelAttributes(element);
        const level = this.delegate.currentPermissionLevel.get();
        let icon;
        let label;
        switch (level) {
            case ChatPermissionLevel.Autopilot:
                icon = Codicon.rocket;
                label = localize(8309, null);
                break;
            case ChatPermissionLevel.AutoApprove:
                icon = Codicon.warning;
                label = localize(8310, null);
                break;
            default:
                icon = Codicon.shield;
                label = localize(8311, null);
                break;
        }
        const labelElements = [];
        labelElements.push(...renderLabelWithIcons(`$(${icon.id})`));
        labelElements.push(dom.$('span.chat-input-picker-label', undefined, label));
        labelElements.push(...renderLabelWithIcons(`$(chevron-down)`));
        dom.reset(element, ...labelElements);
        element.classList.toggle('warning', level === ChatPermissionLevel.Autopilot);
        element.classList.toggle('info', level === ChatPermissionLevel.AutoApprove);
        return null;
    }
    refresh() {
        if (this.element) {
            this.renderLabel(this.element);
        }
    }
};
PermissionPickerActionItem = __decorate([
    __param(3, IActionWidgetService),
    __param(4, IKeybindingService),
    __param(5, IContextKeyService),
    __param(6, ITelemetryService),
    __param(7, IConfigurationService),
    __param(8, IDialogService)
], PermissionPickerActionItem);
export { PermissionPickerActionItem };
//# sourceMappingURL=permissionPickerActionItem.js.map