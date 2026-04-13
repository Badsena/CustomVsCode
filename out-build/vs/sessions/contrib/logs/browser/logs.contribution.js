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
import { Codicon } from '../../../../base/common/codicons.js';
import { localize, localize2 } from '../../../../nls.js';
import { IContextKeyService } from '../../../../platform/contextkey/common/contextkey.js';
import { SyncDescriptor } from '../../../../platform/instantiation/common/descriptors.js';
import { Registry } from '../../../../platform/registry/common/platform.js';
import { registerIcon } from '../../../../platform/theme/common/iconRegistry.js';
import { ViewPaneContainer } from '../../../../workbench/browser/parts/views/viewPaneContainer.js';
import { registerWorkbenchContribution2 } from '../../../../workbench/common/contributions.js';
import { Extensions as ViewContainerExtensions } from '../../../../workbench/common/views.js';
import { OutputViewPane } from '../../../../workbench/contrib/output/browser/outputView.js';
import { OUTPUT_VIEW_ID } from '../../../../workbench/services/output/common/output.js';
const SESSIONS_LOGS_CONTAINER_ID = 'workbench.sessions.panel.logsContainer';
const logsViewIcon = registerIcon('sessions-logs-view-icon', Codicon.output, localize(3287, null));
let RegisterLogsViewContainerContribution = class RegisterLogsViewContainerContribution {
    static { this.ID = 'sessions.registerLogsViewContainer'; }
    constructor(contextKeyService) {
        const viewContainerRegistry = Registry.as(ViewContainerExtensions.ViewContainersRegistry);
        const viewsRegistry = Registry.as(ViewContainerExtensions.ViewsRegistry);
        // Deregister the output view and its container from the original registration
        const outputViewContainer = viewContainerRegistry.get(OUTPUT_VIEW_ID);
        if (outputViewContainer) {
            const view = viewsRegistry.getView(OUTPUT_VIEW_ID);
            if (view) {
                viewsRegistry.deregisterViews([view], outputViewContainer);
            }
            viewContainerRegistry.deregisterViewContainer(outputViewContainer);
        }
        // Register a new logs view container in the Panel for the sessions window
        const logsViewContainer = viewContainerRegistry.registerViewContainer({
            id: SESSIONS_LOGS_CONTAINER_ID,
            title: localize2(3288, "Logs"),
            icon: logsViewIcon,
            order: 2,
            ctorDescriptor: new SyncDescriptor(ViewPaneContainer, [SESSIONS_LOGS_CONTAINER_ID, { mergeViewWithContainerWhenSingleView: true }]),
            storageId: SESSIONS_LOGS_CONTAINER_ID,
            hideIfEmpty: true,
            windowVisibility: 2 /* WindowVisibility.Sessions */,
        }, 1 /* ViewContainerLocation.Panel */, { doNotRegisterOpenCommand: true });
        // Re-register the output view inside the new logs container with a `when` context
        viewsRegistry.registerViews([{
                id: OUTPUT_VIEW_ID,
                name: localize2(3289, "Logs"),
                containerIcon: logsViewIcon,
                ctorDescriptor: new SyncDescriptor(OutputViewPane),
                canToggleVisibility: true,
                canMoveView: false,
                windowVisibility: 2 /* WindowVisibility.Sessions */,
            }], logsViewContainer);
    }
};
RegisterLogsViewContainerContribution = __decorate([
    __param(0, IContextKeyService)
], RegisterLogsViewContainerContribution);
registerWorkbenchContribution2(RegisterLogsViewContainerContribution.ID, RegisterLogsViewContainerContribution, 1 /* WorkbenchPhase.BlockStartup */);
//# sourceMappingURL=logs.contribution.js.map