/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Codicon } from '../../../../base/common/codicons.js';
import { localize2 } from '../../../../nls.js';
import { Action2, MenuId, registerAction2 } from '../../../../platform/actions/common/actions.js';
import { ContextKeyExpr } from '../../../../platform/contextkey/common/contextkey.js';
import { SyncDescriptor } from '../../../../platform/instantiation/common/descriptors.js';
import { Registry } from '../../../../platform/registry/common/platform.js';
import { registerIcon } from '../../../../platform/theme/common/iconRegistry.js';
import { registerWorkbenchContribution2 } from '../../../../workbench/common/contributions.js';
import { Extensions as ViewContainerExtensions } from '../../../../workbench/common/views.js';
import { WorkspaceFolderCountContext } from '../../../../workbench/common/contextkeys.js';
import { ExplorerView } from '../../../../workbench/contrib/files/browser/views/explorerView.js';
import { ViewPaneContainer } from '../../../../workbench/browser/parts/views/viewPaneContainer.js';
import { IViewsService } from '../../../../workbench/services/views/common/viewsService.js';
const SESSIONS_FILES_CONTAINER_ID = 'workbench.sessions.auxiliaryBar.filesContainer';
const SESSIONS_FILES_VIEW_ID = 'sessions.files.explorer';
const filesViewIcon = registerIcon('sessions-files-view-icon', Codicon.files, localize2(3278, 'View icon of the files view in the sessions window.').value);
class RegisterFilesViewContribution {
    static { this.ID = 'sessions.registerFilesView'; }
    constructor() {
        const viewContainerRegistry = Registry.as(ViewContainerExtensions.ViewContainersRegistry);
        const viewsRegistry = Registry.as(ViewContainerExtensions.ViewsRegistry);
        // Register a new Files view container in the auxiliary bar for the sessions window
        const filesViewContainer = viewContainerRegistry.registerViewContainer({
            id: SESSIONS_FILES_CONTAINER_ID,
            title: localize2(3279, "Files"),
            icon: filesViewIcon,
            order: 11,
            ctorDescriptor: new SyncDescriptor(ViewPaneContainer, [SESSIONS_FILES_CONTAINER_ID, { mergeViewWithContainerWhenSingleView: true }]),
            storageId: SESSIONS_FILES_CONTAINER_ID,
            hideIfEmpty: true,
            windowVisibility: 2 /* WindowVisibility.Sessions */,
        }, 2 /* ViewContainerLocation.AuxiliaryBar */, { doNotRegisterOpenCommand: true });
        // Re-register the explorer view inside the new Files container
        viewsRegistry.registerViews([{
                id: SESSIONS_FILES_VIEW_ID,
                name: localize2(3280, "Files"),
                containerIcon: filesViewIcon,
                ctorDescriptor: new SyncDescriptor(ExplorerView),
                canToggleVisibility: true,
                canMoveView: false,
                when: WorkspaceFolderCountContext.notEqualsTo('0'),
                windowVisibility: 2 /* WindowVisibility.Sessions */,
            }], filesViewContainer);
    }
}
registerWorkbenchContribution2(RegisterFilesViewContribution.ID, RegisterFilesViewContribution, 3 /* WorkbenchPhase.AfterRestored */);
registerAction2(class extends Action2 {
    constructor() {
        super({
            id: 'sessions.files.action.collapseExplorerFolders',
            title: localize2(3281, "Collapse Folders in Explorer"),
            icon: Codicon.collapseAll,
            menu: {
                id: MenuId.ViewTitle,
                group: 'navigation',
                when: ContextKeyExpr.equals('view', SESSIONS_FILES_VIEW_ID),
            },
        });
    }
    run(accessor) {
        const viewsService = accessor.get(IViewsService);
        const view = viewsService.getViewWithId(SESSIONS_FILES_VIEW_ID);
        if (view !== null) {
            view.collapseAll();
        }
    }
});
//# sourceMappingURL=files.contribution.js.map