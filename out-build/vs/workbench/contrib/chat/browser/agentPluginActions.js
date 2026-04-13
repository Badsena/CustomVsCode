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
import { Action } from '../../../../base/common/actions.js';
import { Emitter } from '../../../../base/common/event.js';
import { ActionWithDropdownActionViewItem } from '../../../../base/browser/ui/dropdown/dropdownActionViewItem.js';
import { localize } from '../../../../nls.js';
import { ICommandService } from '../../../../platform/commands/common/commands.js';
import { IOpenerService } from '../../../../platform/opener/common/opener.js';
import { IWorkspaceContextService } from '../../../../platform/workspace/common/workspace.js';
import { dirname, joinPath } from '../../../../base/common/resources.js';
import { isContributionDisabled, isContributionEnabled } from '../common/enablement.js';
import { IAgentPluginService } from '../common/plugins/agentPluginService.js';
import { IPluginInstallService } from '../common/plugins/pluginInstallService.js';
import { buildEnablementContextMenuGroup } from './enablementActions.js';
import { hasKey } from '../../../../base/common/types.js';
//#region Simple actions
let InstallPluginAction = class InstallPluginAction extends Action {
    constructor(item, pluginInstallService) {
        super('agentPlugin.install', localize(6123, null), 'extension-action label prominent install', true, () => pluginInstallService.installPlugin({
            name: item.name,
            description: item.description,
            version: '',
            source: item.source,
            sourceDescriptor: item.sourceDescriptor,
            marketplace: item.marketplace,
            marketplaceReference: item.marketplaceReference,
            marketplaceType: item.marketplaceType,
            readmeUri: item.readmeUri,
        }));
    }
};
InstallPluginAction = __decorate([
    __param(1, IPluginInstallService)
], InstallPluginAction);
export { InstallPluginAction };
export class UninstallPluginAction extends Action {
    constructor(plugin) {
        super('agentPlugin.uninstall', localize(6124, null), 'extension-action label uninstall', true, () => { plugin.remove(); return Promise.resolve(); });
    }
}
let OpenPluginFolderAction = class OpenPluginFolderAction extends Action {
    constructor(plugin, commandService, openerService) {
        super('agentPlugin.openFolder', localize(6125, null), undefined, true, async () => {
            try {
                await commandService.executeCommand('revealFileInOS', plugin.uri);
            }
            catch {
                await openerService.open(dirname(plugin.uri));
            }
        });
    }
};
OpenPluginFolderAction = __decorate([
    __param(1, ICommandService),
    __param(2, IOpenerService)
], OpenPluginFolderAction);
export { OpenPluginFolderAction };
let OpenPluginReadmeAction = class OpenPluginReadmeAction extends Action {
    constructor(readmeUri, openerService) {
        super('agentPlugin.openReadme', localize(6126, null), undefined, true, () => openerService.open(readmeUri));
    }
};
OpenPluginReadmeAction = __decorate([
    __param(1, IOpenerService)
], OpenPluginReadmeAction);
export { OpenPluginReadmeAction };
//#endregion
//#region Context menu
/**
 * Builds the standard context menu action groups for an installed plugin.
 */
export function getInstalledPluginContextMenuActions(plugin, instantiationService) {
    return instantiationService.invokeFunction(accessor => {
        const agentPluginService = accessor.get(IAgentPluginService);
        const workspaceService = accessor.get(IWorkspaceContextService);
        const groups = [];
        groups.push(buildEnablementContextMenuGroup(plugin.enablement.get(), plugin.uri.toString(), agentPluginService.enablementModel, workspaceService, 'agentPlugin'));
        groups.push([
            instantiationService.createInstance(OpenPluginFolderAction, plugin),
            instantiationService.createInstance(OpenPluginReadmeAction, joinPath(plugin.uri, 'README.md')),
        ]);
        if (plugin.fromMarketplace) {
            groups.push([new UninstallPluginAction(plugin)]);
        }
        return groups;
    });
}
//#endregion
//#region Dropdown enablement actions for editor-style action bars
/**
 * Sub-action base class that auto-hides when disabled, for use inside
 * {@link EnablementDropDownAction}.
 */
class EnablementSubAction extends Action {
    get hidden() { return this._hidden; }
    set hidden(v) { this._hidden = v; }
    constructor(id, label, cssClass, enabled, actionCallback) {
        super(id, label, cssClass, enabled, actionCallback);
        this._hidden = !enabled;
    }
    _setEnabled(value) {
        super._setEnabled(value);
        this.hidden = !value;
    }
}
/**
 * Dropdown action that aggregates enablement sub-actions and shows the
 * first visible one as the primary button, with others in the dropdown.
 * Hides itself entirely when all sub-actions are hidden.
 */
export class EnablementDropDownAction extends Action {
    get menuActions() { return [...this._menuActions]; }
    get isHidden() { return this._isHidden; }
    get onDidChange() { return this._onDidChange.event; }
    constructor(id, subActions) {
        super(id, undefined, 'extension-action label action-dropdown');
        this.menuActionClassNames = ['extension-action', 'label', 'action-dropdown'];
        this._menuActions = [];
        this._isHidden = false;
        this._onDidChange = new Emitter();
        this.subActions = subActions;
        for (const a of subActions) {
            a.onDidChange(() => this._updateDropdown());
        }
        this._updateDropdown();
    }
    _updateDropdown() {
        const visible = this.subActions.filter(a => !a.hidden);
        const primary = visible[0];
        this._menuActions = visible.length > 1 ? [...visible] : [];
        if (primary) {
            this._isHidden = false;
            this.enabled = true;
            this.label = primary.label;
            this.tooltip = primary.tooltip;
        }
        else {
            this._isHidden = true;
            this.enabled = false;
        }
        this._onDidChange.fire({ menuActions: this._menuActions });
    }
    async run() {
        const primary = this.subActions.find(a => !a.hidden);
        await primary?.run();
    }
    dispose() {
        for (const a of this.subActions) {
            a.dispose();
        }
        super.dispose();
    }
}
/**
 * View item for {@link EnablementDropDownAction} that properly hides
 * the dropdown chevron when there are no secondary actions.
 */
export class EnablementDropdownActionViewItem extends ActionWithDropdownActionViewItem {
    constructor(action, options, contextMenuProvider) {
        super(null, action, options, contextMenuProvider);
        this._register(action.onDidChange(e => {
            if (hasKey(e, { menuActions: true })) {
                this.updateClass();
            }
        }));
    }
    render(container) {
        super.render(container);
        this.updateClass();
    }
    updateClass() {
        super.updateClass();
        if (this.element && this.dropdownMenuActionViewItem?.element) {
            const action = this._action;
            this.element.classList.toggle('hide', action.isHidden);
            const isMenuEmpty = action.menuActions.length === 0;
            this.element.classList.toggle('empty', isMenuEmpty);
            this.dropdownMenuActionViewItem.element.classList.toggle('hide', isMenuEmpty);
        }
    }
}
/**
 * Creates the enable dropdown action for a plugin, containing Enable
 * and Enable (Workspace) sub-actions.
 */
export function createEnablePluginDropDown(plugin, enablementModel, workspaceContextService) {
    const key = plugin.uri.toString();
    const hasWorkspace = workspaceContextService.getWorkbenchState() !== 1 /* WorkbenchState.EMPTY */;
    const enable = new EnablementSubAction('agentPlugin.enable', localize(6127, null), 'extension-action label prominent', isContributionDisabled(plugin.enablement.get()), () => { enablementModel.setEnabled(key, 2 /* ContributionEnablementState.EnabledProfile */); return Promise.resolve(); });
    const enableWorkspace = new EnablementSubAction('agentPlugin.enableForWorkspace', localize(6128, null), 'extension-action label', isContributionDisabled(plugin.enablement.get()) && hasWorkspace, () => { enablementModel.setEnabled(key, 3 /* ContributionEnablementState.EnabledWorkspace */); return Promise.resolve(); });
    return new EnablementDropDownAction('agentPlugin.enableDropdown', [enable, enableWorkspace]);
}
/**
 * Creates the disable dropdown action for a plugin, containing Disable
 * and Disable (Workspace) sub-actions.
 */
export function createDisablePluginDropDown(plugin, enablementModel, workspaceContextService) {
    const key = plugin.uri.toString();
    const hasWorkspace = workspaceContextService.getWorkbenchState() !== 1 /* WorkbenchState.EMPTY */;
    const disable = new EnablementSubAction('agentPlugin.disable', localize(6129, null), 'extension-action label disable', isContributionEnabled(plugin.enablement.get()), () => { enablementModel.setEnabled(key, 0 /* ContributionEnablementState.DisabledProfile */); return Promise.resolve(); });
    const disableWorkspace = new EnablementSubAction('agentPlugin.disableForWorkspace', localize(6130, null), 'extension-action label disable', isContributionEnabled(plugin.enablement.get()) && hasWorkspace, () => { enablementModel.setEnabled(key, 1 /* ContributionEnablementState.DisabledWorkspace */); return Promise.resolve(); });
    return new EnablementDropDownAction('agentPlugin.disableDropdown', [disable, disableWorkspace]);
}
//#endregion
//# sourceMappingURL=agentPluginActions.js.map