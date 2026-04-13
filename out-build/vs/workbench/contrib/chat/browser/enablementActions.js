/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Action } from '../../../../base/common/actions.js';
import { localize } from '../../../../nls.js';
import { isContributionDisabled } from '../common/enablement.js';
/**
 * Creates the four standard enablement actions (Enable, Enable Workspace,
 * Disable, Disable Workspace) for a contribution identified by a string key.
 */
export function createEnablementActions(key, enablementModel, idPrefix) {
    return [
        new Action(`${idPrefix}.enable`, localize(7562, null), undefined, true, () => { enablementModel.setEnabled(key, 2 /* ContributionEnablementState.EnabledProfile */); return Promise.resolve(); }),
        new Action(`${idPrefix}.enableForWorkspace`, localize(7563, null), undefined, true, () => { enablementModel.setEnabled(key, 3 /* ContributionEnablementState.EnabledWorkspace */); return Promise.resolve(); }),
        new Action(`${idPrefix}.disable`, localize(7564, null), undefined, true, () => { enablementModel.setEnabled(key, 0 /* ContributionEnablementState.DisabledProfile */); return Promise.resolve(); }),
        new Action(`${idPrefix}.disableForWorkspace`, localize(7565, null), undefined, true, () => { enablementModel.setEnabled(key, 1 /* ContributionEnablementState.DisabledWorkspace */); return Promise.resolve(); }),
    ];
}
/**
 * Builds the standard enablement context-menu action group for a
 * contribution. Returns either the enable or disable actions depending
 * on the current state, with workspace variants included only when a
 * workspace is open.
 */
export function buildEnablementContextMenuGroup(enablementState, key, enablementModel, workspaceContextService, idPrefix) {
    const hasWorkspace = workspaceContextService.getWorkbenchState() !== 1 /* WorkbenchState.EMPTY */;
    const [enable, enableWorkspace, disable, disableWorkspace] = createEnablementActions(key, enablementModel, idPrefix);
    const actions = [];
    if (isContributionDisabled(enablementState)) {
        actions.push(enable);
        if (hasWorkspace) {
            actions.push(enableWorkspace);
        }
    }
    else {
        actions.push(disable);
        if (hasWorkspace) {
            actions.push(disableWorkspace);
        }
    }
    return actions;
}
//# sourceMappingURL=enablementActions.js.map