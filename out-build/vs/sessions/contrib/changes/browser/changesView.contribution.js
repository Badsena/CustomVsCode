/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Codicon } from '../../../../base/common/codicons.js';
import { localize2 } from '../../../../nls.js';
import { SyncDescriptor } from '../../../../platform/instantiation/common/descriptors.js';
import { Registry } from '../../../../platform/registry/common/platform.js';
import { registerIcon } from '../../../../platform/theme/common/iconRegistry.js';
import { registerWorkbenchContribution2 } from '../../../../workbench/common/contributions.js';
import { Extensions as ViewContainerExtensions } from '../../../../workbench/common/views.js';
import { CHANGES_VIEW_CONTAINER_ID, CHANGES_VIEW_ID, ChangesViewPane, ChangesViewPaneContainer } from './changesView.js';
import './changesViewActions.js';
import { ToggleChangesViewContribution } from './toggleChangesView.js';
const changesViewIcon = registerIcon('changes-view-icon', Codicon.gitCompare, localize2(3086, 'View icon for the Changes view.').value);
const viewContainersRegistry = Registry.as(ViewContainerExtensions.ViewContainersRegistry);
const changesViewContainer = viewContainersRegistry.registerViewContainer({
    id: CHANGES_VIEW_CONTAINER_ID,
    title: localize2(3087, 'Changes'),
    ctorDescriptor: new SyncDescriptor(ChangesViewPaneContainer),
    icon: changesViewIcon,
    order: 10,
    hideIfEmpty: true,
    windowVisibility: 2 /* WindowVisibility.Sessions */
}, 2 /* ViewContainerLocation.AuxiliaryBar */, { doNotRegisterOpenCommand: true, isDefault: true });
const viewsRegistry = Registry.as(ViewContainerExtensions.ViewsRegistry);
viewsRegistry.registerViews([{
        id: CHANGES_VIEW_ID,
        name: localize2(3088, 'Changes'),
        containerIcon: changesViewIcon,
        ctorDescriptor: new SyncDescriptor(ChangesViewPane),
        canToggleVisibility: true,
        canMoveView: true,
        weight: 100,
        order: 1,
        windowVisibility: 2 /* WindowVisibility.Sessions */
    }], changesViewContainer);
registerWorkbenchContribution2(ToggleChangesViewContribution.ID, ToggleChangesViewContribution, 2 /* WorkbenchPhase.BlockRestore */);
//# sourceMappingURL=changesView.contribution.js.map