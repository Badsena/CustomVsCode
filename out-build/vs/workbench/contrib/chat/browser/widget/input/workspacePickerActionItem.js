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
import { basename } from '../../../../../../base/common/resources.js';
import { localize } from '../../../../../../nls.js';
import { IActionWidgetService } from '../../../../../../platform/actionWidget/browser/actionWidget.js';
import { ICommandService } from '../../../../../../platform/commands/common/commands.js';
import { IContextKeyService } from '../../../../../../platform/contextkey/common/contextkey.js';
import { IKeybindingService } from '../../../../../../platform/keybinding/common/keybinding.js';
import { ITelemetryService } from '../../../../../../platform/telemetry/common/telemetry.js';
import { ChatInputPickerActionViewItem } from './chatInputPickerActionItem.js';
/**
 * Action view item for selecting a target workspace in the chat interface.
 * This picker allows selecting a recent workspace to run the chat request in,
 * which is useful for empty window contexts.
 */
let WorkspacePickerActionItem = class WorkspacePickerActionItem extends ChatInputPickerActionViewItem {
    constructor(action, delegate, pickerOptions, actionWidgetService, keybindingService, contextKeyService, commandService, telemetryService) {
        const actionProvider = {
            getActions: () => {
                const currentWorkspace = this.delegate.getSelectedWorkspace();
                const workspaces = this.delegate.getWorkspaces();
                const actions = workspaces.map(workspace => ({
                    ...action,
                    id: `workspace.${workspace.uri.toString()}`,
                    label: workspace.label,
                    checked: currentWorkspace?.uri.toString() === workspace.uri.toString(),
                    icon: workspace.isFolder ? { id: 'folder' } : { id: 'file-symlink-directory' },
                    enabled: true,
                    tooltip: workspace.uri.fsPath,
                    run: async () => {
                        this.delegate.setSelectedWorkspace(workspace);
                        if (this.element) {
                            this.renderLabel(this.element);
                        }
                    },
                }));
                // Add "Open Folder..." option
                actions.push({
                    ...action,
                    id: 'workspace.openFolder',
                    label: localize(8315, null),
                    checked: false,
                    enabled: true,
                    tooltip: localize(8316, null),
                    run: async () => {
                        this.commandService.executeCommand(this.delegate.openFolderCommand);
                    },
                });
                return actions;
            }
        };
        const actionBarActionProvider = {
            getActions: () => []
        };
        const workspacePickerOptions = {
            actionProvider,
            actionBarActionProvider,
            showItemKeybindings: false,
            reporter: { id: 'ChatWorkspacePicker', name: 'ChatWorkspacePicker', includeOptions: false },
        };
        super(action, workspacePickerOptions, pickerOptions, actionWidgetService, keybindingService, contextKeyService, telemetryService);
        this.delegate = delegate;
        this.commandService = commandService;
        this._register(this.delegate.onDidChangeSelectedWorkspace(() => {
            if (this.element) {
                this.renderLabel(this.element);
            }
        }));
        this._register(this.delegate.onDidChangeWorkspaces(() => {
            // Re-render when workspaces list changes
            if (this.element) {
                this.renderLabel(this.element);
            }
        }));
    }
    renderLabel(element) {
        this.setAriaLabelAttributes(element);
        const currentWorkspace = this.delegate.getSelectedWorkspace();
        const labelElements = [];
        if (currentWorkspace) {
            // Show the workspace label or folder name
            const label = currentWorkspace.label || basename(currentWorkspace.uri);
            labelElements.push(...renderLabelWithIcons(`$(folder)`));
            labelElements.push(dom.$('span.chat-input-picker-label', undefined, label));
        }
        else {
            labelElements.push(...renderLabelWithIcons(`$(folder)`));
            labelElements.push(dom.$('span.chat-input-picker-label', undefined, localize(8317, null)));
        }
        if (!this.pickerOptions.hideChevrons.get()) {
            labelElements.push(...renderLabelWithIcons(`$(chevron-down)`));
        }
        dom.reset(element, ...labelElements);
        return null;
    }
};
WorkspacePickerActionItem = __decorate([
    __param(3, IActionWidgetService),
    __param(4, IKeybindingService),
    __param(5, IContextKeyService),
    __param(6, ICommandService),
    __param(7, ITelemetryService)
], WorkspacePickerActionItem);
export { WorkspacePickerActionItem };
//# sourceMappingURL=workspacePickerActionItem.js.map