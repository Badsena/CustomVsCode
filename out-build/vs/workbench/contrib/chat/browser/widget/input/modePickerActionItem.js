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
import { coalesce } from '../../../../../../base/common/arrays.js';
import { Codicon } from '../../../../../../base/common/codicons.js';
import { groupBy } from '../../../../../../base/common/collections.js';
import { autorun, observableValue } from '../../../../../../base/common/observable.js';
import { ThemeIcon } from '../../../../../../base/common/themables.js';
import { localize } from '../../../../../../nls.js';
import { getFlatActionBarActions } from '../../../../../../platform/actions/browser/menuEntryActionViewItem.js';
import { IMenuService, MenuId } from '../../../../../../platform/actions/common/actions.js';
import { IActionWidgetService } from '../../../../../../platform/actionWidget/browser/actionWidget.js';
import { ICommandService } from '../../../../../../platform/commands/common/commands.js';
import { IConfigurationService } from '../../../../../../platform/configuration/common/configuration.js';
import { IContextKeyService } from '../../../../../../platform/contextkey/common/contextkey.js';
import { IKeybindingService } from '../../../../../../platform/keybinding/common/keybinding.js';
import { IProductService } from '../../../../../../platform/product/common/productService.js';
import { ITelemetryService } from '../../../../../../platform/telemetry/common/telemetry.js';
import { IChatAgentService } from '../../../common/participants/chatAgents.js';
import { ChatMode, IChatModeService } from '../../../common/chatModes.js';
import { isOrganizationPromptFile } from '../../../common/promptSyntax/utils/promptsServiceUtils.js';
import { ChatAgentLocation, ChatConfiguration, ChatModeKind } from '../../../common/constants.js';
import { PromptsStorage } from '../../../common/promptSyntax/service/promptsService.js';
import { Target } from '../../../common/promptSyntax/promptTypes.js';
import { getOpenChatActionIdForMode } from '../../actions/chatActions.js';
import { ToggleAgentModeActionId } from '../../actions/chatExecuteActions.js';
import { ChatInputPickerActionViewItem } from './chatInputPickerActionItem.js';
import { IOpenerService } from '../../../../../../platform/opener/common/opener.js';
import { IWorkbenchAssignmentService } from '../../../../../services/assignment/common/assignmentService.js';
// TODO: there should be an icon contributed for built-in modes
const builtinDefaultIcon = (mode) => {
    switch (mode.name.get().toLowerCase()) {
        case 'ask': return Codicon.ask;
        case 'edit': return Codicon.edit;
        case 'plan': return Codicon.tasklist;
        default: return undefined;
    }
};
let ModePickerActionItem = class ModePickerActionItem extends ChatInputPickerActionViewItem {
    constructor(action, delegate, pickerOptions, actionWidgetService, chatAgentService, keybindingService, configurationService, contextKeyService, chatModeService, menuService, commandService, _productService, telemetryService, openerService, assignmentService) {
        const assignments = observableValue('modePickerAssignments', { showOldAskMode: false });
        // Get custom agent target (if filtering is enabled)
        const customAgentTarget = delegate.customAgentTarget?.() ?? Target.Undefined;
        // Category definitions
        const builtInCategory = { label: localize(8283, null), order: 0 };
        const customCategory = { label: localize(8284, null), order: 1 };
        const policyDisabledCategory = { label: localize(8285, null), order: 999, showHeader: true };
        const agentModeDisabledViaPolicy = configurationService.inspect(ChatConfiguration.AgentEnabled).policyValue === false;
        const makeAction = (mode, currentMode) => {
            const isDisabledViaPolicy = mode.kind === ChatModeKind.Agent &&
                agentModeDisabledViaPolicy;
            const tooltip = chatAgentService.getDefaultAgent(ChatAgentLocation.Chat, mode.kind)?.description ?? action.tooltip;
            // Add toolbar actions for Agent modes
            const toolbarActions = [];
            if (mode.kind === ChatModeKind.Agent && !isDisabledViaPolicy) {
                if (mode.uri) {
                    let label, icon, id;
                    if (mode.source?.storage === PromptsStorage.extension) {
                        icon = Codicon.file;
                        id = `viewAgent:${mode.id}`;
                        label = localize(8286, null, mode.label.get());
                    }
                    else {
                        icon = Codicon.edit;
                        id = `editAgent:${mode.id}`;
                        label = localize(8287, null, mode.label.get());
                    }
                    const modeResource = mode.uri;
                    toolbarActions.push({
                        id,
                        label,
                        tooltip: label,
                        class: ThemeIcon.asClassName(icon),
                        enabled: true,
                        run: async () => {
                            openerService.open(modeResource.get());
                        }
                    });
                }
            }
            return {
                ...action,
                id: getOpenChatActionIdForMode(mode),
                label: mode.label.get(),
                icon: isDisabledViaPolicy ? ThemeIcon.fromId(Codicon.lock.id) : mode.icon.get(),
                class: isDisabledViaPolicy ? 'disabled-by-policy' : undefined,
                enabled: !isDisabledViaPolicy,
                checked: !isDisabledViaPolicy && currentMode.id === mode.id,
                tooltip: '',
                hover: { content: tooltip, position: this.pickerOptions.hoverPosition },
                toolbarActions,
                run: async () => {
                    if (isDisabledViaPolicy) {
                        return; // Block interaction if disabled by policy
                    }
                    const result = await commandService.executeCommand(ToggleAgentModeActionId, { modeId: mode.id, sessionResource: this.delegate.sessionResource() });
                    if (this.element) {
                        this.renderLabel(this.element);
                    }
                    return result;
                },
                category: isDisabledViaPolicy ? policyDisabledCategory : builtInCategory
            };
        };
        const makeActionFromCustomMode = (mode, currentMode) => {
            return {
                ...makeAction(mode, currentMode),
                tooltip: '',
                hover: { content: mode.description.get() ?? chatAgentService.getDefaultAgent(ChatAgentLocation.Chat, mode.kind)?.description ?? action.tooltip, position: this.pickerOptions.hoverPosition },
                icon: mode.icon.get() ?? (isModeConsideredBuiltIn(mode, this._productService) ? builtinDefaultIcon(mode) : undefined),
                category: agentModeDisabledViaPolicy ? policyDisabledCategory : customCategory
            };
        };
        const actionProviderWithCustomAgentTarget = {
            getActions: () => {
                const modes = chatModeService.getModes();
                const currentMode = delegate.currentMode.get();
                const filteredCustomModes = modes.custom.filter(mode => {
                    const target = mode.target.get();
                    return target === customAgentTarget || target === Target.Undefined;
                });
                const customModes = groupBy(filteredCustomModes, mode => isModeConsideredBuiltIn(mode, this._productService) ? 'builtin' : 'custom');
                // Always include the default "Agent" option first
                const checked = currentMode.id === ChatMode.Agent.id;
                const defaultAction = { ...makeAction(ChatMode.Agent, ChatMode.Agent), checked };
                defaultAction.category = builtInCategory;
                const builtInActions = customModes.builtin?.map(mode => {
                    const action = makeActionFromCustomMode(mode, currentMode);
                    action.category = builtInCategory;
                    return action;
                }) ?? [];
                // Add filtered custom modes
                const customActions = customModes.custom?.map(mode => makeActionFromCustomMode(mode, currentMode)) ?? [];
                return [defaultAction, ...builtInActions, ...customActions];
            }
        };
        const actionProvider = {
            getActions: () => {
                const modes = chatModeService.getModes();
                const currentMode = delegate.currentMode.get();
                const agentMode = modes.builtin.find(mode => mode.id === ChatMode.Agent.id);
                const otherBuiltinModes = modes.builtin.filter(mode => {
                    return mode.id !== ChatMode.Agent.id && shouldShowBuiltInMode(mode, assignments.get(), agentModeDisabledViaPolicy);
                });
                const filteredCustomModes = modes.custom.filter(mode => {
                    if (isModeConsideredBuiltIn(mode, this._productService)) {
                        return shouldShowBuiltInMode(mode, assignments.get(), agentModeDisabledViaPolicy);
                    }
                    return true;
                });
                // Filter out 'implement' mode from the dropdown - it's available for handoffs but not user-selectable
                const customModes = groupBy(filteredCustomModes, mode => isModeConsideredBuiltIn(mode, this._productService) ? 'builtin' : 'custom');
                const customBuiltinModeActions = customModes.builtin?.map(mode => {
                    const action = makeActionFromCustomMode(mode, currentMode);
                    action.category = agentModeDisabledViaPolicy ? policyDisabledCategory : builtInCategory;
                    return action;
                }) ?? [];
                customBuiltinModeActions.sort((a, b) => a.label.localeCompare(b.label));
                const customModeActions = customModes.custom?.map(mode => makeActionFromCustomMode(mode, currentMode)) ?? [];
                customModeActions.sort((a, b) => a.label.localeCompare(b.label));
                const orderedModes = coalesce([
                    agentMode && makeAction(agentMode, currentMode),
                    ...otherBuiltinModes.map(mode => mode && makeAction(mode, currentMode)),
                    ...customBuiltinModeActions,
                    ...customModeActions
                ]);
                return orderedModes;
            }
        };
        const modePickerActionWidgetOptions = {
            actionProvider: customAgentTarget !== Target.Undefined ? actionProviderWithCustomAgentTarget : actionProvider,
            actionBarActionProvider: {
                getActions: () => this.getModePickerActionBarActions()
            },
            showItemKeybindings: true,
            reporter: { id: 'ChatModePicker', name: 'ChatModePicker', includeOptions: true },
        };
        super(action, modePickerActionWidgetOptions, pickerOptions, actionWidgetService, keybindingService, contextKeyService, telemetryService);
        this.delegate = delegate;
        this.contextKeyService = contextKeyService;
        this.menuService = menuService;
        this._productService = _productService;
        // Listen to changes in the current mode and its properties
        this._register(autorun(reader => {
            this.delegate.currentMode.read(reader).label.read(reader); // use the reader so autorun tracks it
            if (this.element) {
                this.renderLabel(this.element);
            }
        }));
        assignmentService.getTreatment('chat.showOldAskMode').then(showOldAskMode => {
            assignments.set({ showOldAskMode: showOldAskMode === 'enabled' }, undefined);
        });
        this._register(assignmentService.onDidRefetchAssignments(async () => {
            assignments.set({ showOldAskMode: await assignmentService.getTreatment('chat.showOldAskMode') === 'enabled' }, undefined);
        }));
    }
    getModePickerActionBarActions() {
        const menuActions = this.menuService.createMenu(MenuId.ChatModePicker, this.contextKeyService);
        const menuContributions = getFlatActionBarActions(menuActions.getActions({ renderShortTitle: true }));
        menuActions.dispose();
        return menuContributions;
    }
    render(container) {
        super.render(container);
        container.classList.add('chat-mode-picker-item');
    }
    renderLabel(element) {
        this.setAriaLabelAttributes(element);
        const currentMode = this.delegate.currentMode.get();
        const state = currentMode.label.get();
        let icon = currentMode.icon.get();
        // Every built-in mode should have an icon. // TODO: this should be provided by the mode itself
        if (!icon && isModeConsideredBuiltIn(currentMode, this._productService)) {
            icon = builtinDefaultIcon(currentMode);
        }
        const labelElements = [];
        const collapsed = this.pickerOptions.hideChevrons.get();
        if (icon) {
            labelElements.push(...renderLabelWithIcons(`$(${icon.id})`));
        }
        if (!collapsed || !icon) {
            labelElements.push(dom.$('span.chat-input-picker-label', undefined, state));
        }
        if (!collapsed) {
            labelElements.push(...renderLabelWithIcons(`$(chevron-down)`));
        }
        dom.reset(element, ...labelElements);
        return null;
    }
};
ModePickerActionItem = __decorate([
    __param(3, IActionWidgetService),
    __param(4, IChatAgentService),
    __param(5, IKeybindingService),
    __param(6, IConfigurationService),
    __param(7, IContextKeyService),
    __param(8, IChatModeService),
    __param(9, IMenuService),
    __param(10, ICommandService),
    __param(11, IProductService),
    __param(12, ITelemetryService),
    __param(13, IOpenerService),
    __param(14, IWorkbenchAssignmentService)
], ModePickerActionItem);
export { ModePickerActionItem };
function isModeConsideredBuiltIn(mode, productService) {
    if (mode.isBuiltin) {
        return true;
    }
    // Not built-in if not from the built-in chat extension
    if (mode.source?.storage !== PromptsStorage.extension) {
        return false;
    }
    const chatExtensionId = productService.defaultChatAgent?.chatExtensionId;
    if (!chatExtensionId || mode.source.extensionId.value !== chatExtensionId) {
        return false;
    }
    // Organization-provided agents (under /github/ path) are also not considered built-in
    const modeUri = mode.uri?.get();
    if (!modeUri) {
        // If somehow there is no URI, but it's from the built-in chat extension, consider it built-in
        return true;
    }
    return !isOrganizationPromptFile(modeUri, mode.source.extensionId, productService);
}
function shouldShowBuiltInMode(mode, assignments, agentModeDisabledViaPolicy) {
    // The built-in "Edit" mode is deprecated, but still supported for older conversations and agent disablement.
    if (mode.id === ChatMode.Edit.id || mode.name.get().toLowerCase() === 'edit') {
        if (mode.id === ChatMode.Edit.id) {
            return agentModeDisabledViaPolicy;
        }
        else {
            return !agentModeDisabledViaPolicy;
        }
    }
    // The "Ask" mode is a special case - we want to show either the old or new version based on the assignment or agent disablement, but not both
    // We still support the old "Ask" mode for conversations that already use it.
    if (mode.id === ChatMode.Ask.id || mode.name.get().toLowerCase() === 'ask') {
        if (mode.id === ChatMode.Ask.id) {
            return assignments.showOldAskMode || agentModeDisabledViaPolicy;
        }
        else {
            return !(assignments.showOldAskMode || agentModeDisabledViaPolicy);
        }
    }
    return true;
}
//# sourceMappingURL=modePickerActionItem.js.map