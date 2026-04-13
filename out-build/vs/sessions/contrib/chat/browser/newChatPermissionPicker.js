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
import * as dom from '../../../../base/browser/dom.js';
import { Codicon } from '../../../../base/common/codicons.js';
import { Emitter } from '../../../../base/common/event.js';
import { Disposable, DisposableStore } from '../../../../base/common/lifecycle.js';
import { localize } from '../../../../nls.js';
import { IActionWidgetService } from '../../../../platform/actionWidget/browser/actionWidget.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { IDialogService } from '../../../../platform/dialogs/common/dialogs.js';
import { renderIcon } from '../../../../base/browser/ui/iconLabel/iconLabels.js';
import { ChatConfiguration, ChatPermissionLevel } from '../../../../workbench/contrib/chat/common/constants.js';
import Severity from '../../../../base/common/severity.js';
import { MarkdownString } from '../../../../base/common/htmlContent.js';
// Track whether warnings have been shown this VS Code session
const shownWarnings = new Set();
/**
 * A permission picker for the new-session welcome view.
 * Shows Default Approvals, Bypass Approvals, and Autopilot options.
 */
let NewChatPermissionPicker = class NewChatPermissionPicker extends Disposable {
    get permissionLevel() {
        return this._currentLevel;
    }
    constructor(actionWidgetService, configurationService, dialogService) {
        super();
        this.actionWidgetService = actionWidgetService;
        this.configurationService = configurationService;
        this.dialogService = dialogService;
        this._onDidChangeLevel = this._register(new Emitter());
        this.onDidChangeLevel = this._onDidChangeLevel.event;
        this._currentLevel = ChatPermissionLevel.Default;
        this._renderDisposables = this._register(new DisposableStore());
    }
    render(container) {
        this._renderDisposables.clear();
        const slot = dom.append(container, dom.$('.sessions-chat-picker-slot'));
        this._container = slot;
        this._renderDisposables.add({ dispose: () => slot.remove() });
        const trigger = dom.append(slot, dom.$('a.action-label'));
        trigger.tabIndex = 0;
        trigger.role = 'button';
        this._triggerElement = trigger;
        this._updateTriggerLabel(trigger);
        this._renderDisposables.add(dom.addDisposableListener(trigger, dom.EventType.CLICK, (e) => {
            dom.EventHelper.stop(e, true);
            this.showPicker();
        }));
        this._renderDisposables.add(dom.addDisposableListener(trigger, dom.EventType.KEY_DOWN, (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                dom.EventHelper.stop(e, true);
                this.showPicker();
            }
        }));
        return slot;
    }
    setVisible(visible) {
        if (this._container) {
            this._container.style.display = visible ? '' : 'none';
        }
    }
    showPicker() {
        if (!this._triggerElement || this.actionWidgetService.isVisible) {
            return;
        }
        const policyRestricted = this.configurationService.inspect(ChatConfiguration.GlobalAutoApprove).policyValue === false;
        const isAutopilotEnabled = this.configurationService.getValue(ChatConfiguration.AutopilotEnabled) !== false;
        const items = [
            {
                kind: "action" /* ActionListItemKind.Action */,
                group: { kind: "header" /* ActionListItemKind.Header */, title: '', icon: Codicon.shield },
                item: {
                    level: ChatPermissionLevel.Default,
                    label: localize(3152, null),
                    icon: Codicon.shield,
                    checked: this._currentLevel === ChatPermissionLevel.Default,
                },
                label: localize(3153, null),
                description: localize(3154, null),
                disabled: false,
            },
            {
                kind: "action" /* ActionListItemKind.Action */,
                group: { kind: "header" /* ActionListItemKind.Header */, title: '', icon: Codicon.warning },
                item: {
                    level: ChatPermissionLevel.AutoApprove,
                    label: localize(3155, null),
                    icon: Codicon.warning,
                    checked: this._currentLevel === ChatPermissionLevel.AutoApprove,
                },
                label: localize(3156, null),
                description: localize(3157, null),
                disabled: policyRestricted,
            },
        ];
        if (isAutopilotEnabled) {
            items.push({
                kind: "action" /* ActionListItemKind.Action */,
                group: { kind: "header" /* ActionListItemKind.Header */, title: '', icon: Codicon.rocket },
                item: {
                    level: ChatPermissionLevel.Autopilot,
                    label: localize(3158, null),
                    icon: Codicon.rocket,
                    checked: this._currentLevel === ChatPermissionLevel.Autopilot,
                },
                label: localize(3159, null),
                description: localize(3160, null),
                disabled: policyRestricted,
            });
        }
        const triggerElement = this._triggerElement;
        const delegate = {
            onSelect: async (item) => {
                this.actionWidgetService.hide();
                await this._selectLevel(item.level);
            },
            onHide: () => { triggerElement.focus(); },
        };
        const listOptions = { descriptionBelow: true, minWidth: 255 };
        this.actionWidgetService.show('permissionPicker', false, items, delegate, this._triggerElement, undefined, [], {
            getAriaLabel: (item) => item.label ?? '',
            getWidgetAriaLabel: () => localize(3161, null),
        }, listOptions);
    }
    async _selectLevel(level) {
        if (level === ChatPermissionLevel.AutoApprove && !shownWarnings.has(ChatPermissionLevel.AutoApprove)) {
            const result = await this.dialogService.prompt({
                type: Severity.Warning,
                message: localize(3162, null),
                buttons: [
                    {
                        label: localize(3163, null),
                        run: () => true
                    },
                    {
                        label: localize(3164, null),
                        run: () => false
                    },
                ],
                custom: {
                    icon: Codicon.warning,
                    markdownDetails: [{
                            markdown: new MarkdownString(localize(3165, null)),
                        }],
                },
            });
            if (result.result !== true) {
                return;
            }
            shownWarnings.add(ChatPermissionLevel.AutoApprove);
        }
        if (level === ChatPermissionLevel.Autopilot && !shownWarnings.has(ChatPermissionLevel.Autopilot)) {
            const result = await this.dialogService.prompt({
                type: Severity.Warning,
                message: localize(3166, null),
                buttons: [
                    {
                        label: localize(3167, null),
                        run: () => true
                    },
                    {
                        label: localize(3168, null),
                        run: () => false
                    },
                ],
                custom: {
                    icon: Codicon.rocket,
                    markdownDetails: [{
                            markdown: new MarkdownString(localize(3169, null)),
                        }],
                },
            });
            if (result.result !== true) {
                return;
            }
            shownWarnings.add(ChatPermissionLevel.Autopilot);
        }
        this._currentLevel = level;
        this._updateTriggerLabel(this._triggerElement);
        this._onDidChangeLevel.fire(level);
    }
    _updateTriggerLabel(trigger) {
        if (!trigger) {
            return;
        }
        dom.clearNode(trigger);
        let icon;
        let label;
        switch (this._currentLevel) {
            case ChatPermissionLevel.Autopilot:
                icon = Codicon.rocket;
                label = localize(3170, null);
                break;
            case ChatPermissionLevel.AutoApprove:
                icon = Codicon.warning;
                label = localize(3171, null);
                break;
            default:
                icon = Codicon.shield;
                label = localize(3172, null);
                break;
        }
        dom.append(trigger, renderIcon(icon));
        const labelSpan = dom.append(trigger, dom.$('span.sessions-chat-dropdown-label'));
        labelSpan.textContent = label;
        dom.append(trigger, renderIcon(Codicon.chevronDown));
        trigger.classList.toggle('warning', this._currentLevel === ChatPermissionLevel.Autopilot);
        trigger.classList.toggle('info', this._currentLevel === ChatPermissionLevel.AutoApprove);
    }
};
NewChatPermissionPicker = __decorate([
    __param(0, IActionWidgetService),
    __param(1, IConfigurationService),
    __param(2, IDialogService)
], NewChatPermissionPicker);
export { NewChatPermissionPicker };
//# sourceMappingURL=newChatPermissionPicker.js.map