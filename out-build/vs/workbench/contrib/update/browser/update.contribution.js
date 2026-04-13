/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import '../../../../platform/update/common/update.config.contribution.js';
import { localize, localize2 } from '../../../../nls.js';
import { Registry } from '../../../../platform/registry/common/platform.js';
import { Extensions as WorkbenchExtensions } from '../../../common/contributions.js';
import { Categories } from '../../../../platform/action/common/actionCommonCategories.js';
import { MenuId, registerAction2, Action2 } from '../../../../platform/actions/common/actions.js';
import { ProductContribution, UpdateContribution, CONTEXT_UPDATE_STATE, SwitchProductQualityContribution, showReleaseNotesInEditor, DefaultAccountUpdateContribution } from './update.js';
import { UpdateStatusBarContribution } from './updateStatusBarEntry.js';
import { UpdateTitleBarContribution } from './updateTitleBarEntry.js';
import product from '../../../../platform/product/common/product.js';
import { IUpdateService } from '../../../../platform/update/common/update.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { isWindows } from '../../../../base/common/platform.js';
import { IFileDialogService } from '../../../../platform/dialogs/common/dialogs.js';
import { mnemonicButtonLabel } from '../../../../base/common/labels.js';
import { ShowCurrentReleaseNotesActionId, ShowCurrentReleaseNotesFromCurrentFileActionId } from '../common/update.js';
import { IsWebContext } from '../../../../platform/contextkey/common/contextkeys.js';
import { IOpenerService } from '../../../../platform/opener/common/opener.js';
import { IProductService } from '../../../../platform/product/common/productService.js';
import { URI } from '../../../../base/common/uri.js';
const workbench = Registry.as(WorkbenchExtensions.Workbench);
workbench.registerWorkbenchContribution(ProductContribution, 3 /* LifecyclePhase.Restored */);
workbench.registerWorkbenchContribution(UpdateContribution, 3 /* LifecyclePhase.Restored */);
workbench.registerWorkbenchContribution(SwitchProductQualityContribution, 3 /* LifecyclePhase.Restored */);
workbench.registerWorkbenchContribution(DefaultAccountUpdateContribution, 4 /* LifecyclePhase.Eventually */);
workbench.registerWorkbenchContribution(UpdateStatusBarContribution, 3 /* LifecyclePhase.Restored */);
workbench.registerWorkbenchContribution(UpdateTitleBarContribution, 3 /* LifecyclePhase.Restored */);
// Release notes
export class ShowReleaseNotesAction extends Action2 {
    static { this.AVAILABLE = !!product.releaseNotesUrl; }
    constructor() {
        super({
            id: ShowCurrentReleaseNotesActionId,
            title: {
                ...localize2(16846, "Show Release Notes"),
                mnemonicTitle: localize(16840, null),
            },
            category: { value: product.nameShort, original: product.nameShort },
            f1: true,
            menu: [{
                    id: MenuId.MenubarHelpMenu,
                    group: '1_welcome',
                    order: 5,
                }]
        });
    }
    async run(accessor, version) {
        const instantiationService = accessor.get(IInstantiationService);
        const productService = accessor.get(IProductService);
        const openerService = accessor.get(IOpenerService);
        const targetVersion = version ?? productService.version;
        try {
            await showReleaseNotesInEditor(instantiationService, targetVersion, false);
        }
        catch (err) {
            if (productService.releaseNotesUrl) {
                await openerService.open(URI.parse(productService.releaseNotesUrl));
            }
            else {
                throw new Error(localize(16841, null, productService.nameLong));
            }
        }
    }
}
export class ShowCurrentReleaseNotesFromCurrentFileAction extends Action2 {
    constructor() {
        super({
            id: ShowCurrentReleaseNotesFromCurrentFileActionId,
            title: {
                ...localize2(16847, "Open Current File as Release Notes"),
                mnemonicTitle: localize(16842, null),
            },
            category: localize2(16848, "Developer"),
            f1: true,
        });
    }
    async run(accessor) {
        const instantiationService = accessor.get(IInstantiationService);
        const productService = accessor.get(IProductService);
        try {
            await showReleaseNotesInEditor(instantiationService, productService.version, true);
        }
        catch (err) {
            throw new Error(localize(16843, null));
        }
    }
}
if (ShowReleaseNotesAction.AVAILABLE) {
    registerAction2(ShowReleaseNotesAction);
}
registerAction2(ShowCurrentReleaseNotesFromCurrentFileAction);
// Update
export class CheckForUpdateAction extends Action2 {
    constructor() {
        super({
            id: 'update.checkForUpdate',
            title: localize2(16849, 'Check for Updates...'),
            category: { value: product.nameShort, original: product.nameShort },
            f1: true,
            precondition: CONTEXT_UPDATE_STATE.isEqualTo("idle" /* StateType.Idle */),
        });
    }
    async run(accessor) {
        const updateService = accessor.get(IUpdateService);
        return updateService.checkForUpdates(true);
    }
}
class DownloadUpdateAction extends Action2 {
    constructor() {
        super({
            id: 'update.downloadUpdate',
            title: localize2(16850, 'Download Update'),
            category: { value: product.nameShort, original: product.nameShort },
            f1: true,
            precondition: CONTEXT_UPDATE_STATE.isEqualTo("available for download" /* StateType.AvailableForDownload */)
        });
    }
    async run(accessor) {
        await accessor.get(IUpdateService).downloadUpdate(true);
    }
}
class InstallUpdateAction extends Action2 {
    constructor() {
        super({
            id: 'update.installUpdate',
            title: localize2(16851, 'Install Update'),
            category: { value: product.nameShort, original: product.nameShort },
            f1: true,
            precondition: CONTEXT_UPDATE_STATE.isEqualTo("downloaded" /* StateType.Downloaded */)
        });
    }
    async run(accessor) {
        await accessor.get(IUpdateService).applyUpdate();
    }
}
class RestartToUpdateAction extends Action2 {
    constructor() {
        super({
            id: 'update.restartToUpdate',
            title: localize2(16852, 'Restart to Update'),
            category: { value: product.nameShort, original: product.nameShort },
            f1: true,
            precondition: CONTEXT_UPDATE_STATE.isEqualTo("ready" /* StateType.Ready */)
        });
    }
    async run(accessor) {
        await accessor.get(IUpdateService).quitAndInstall();
    }
}
class DownloadAction extends Action2 {
    static { this.ID = 'workbench.action.download'; }
    static { this.AVAILABLE = !!product.downloadUrl; }
    constructor() {
        super({
            id: DownloadAction.ID,
            title: localize2(16853, "Download {0}", product.nameLong),
            precondition: IsWebContext, // Only show when running in a web browser
            f1: true,
            menu: [{
                    id: MenuId.StatusBarWindowIndicatorMenu,
                    when: IsWebContext
                }]
        });
    }
    run(accessor) {
        const productService = accessor.get(IProductService);
        const openerService = accessor.get(IOpenerService);
        if (productService.downloadUrl) {
            openerService.open(URI.parse(productService.downloadUrl));
        }
    }
}
if (DownloadAction.AVAILABLE) {
    registerAction2(DownloadAction);
}
registerAction2(CheckForUpdateAction);
registerAction2(DownloadUpdateAction);
registerAction2(InstallUpdateAction);
registerAction2(RestartToUpdateAction);
if (isWindows) {
    class DeveloperApplyUpdateAction extends Action2 {
        constructor() {
            super({
                id: '_update.applyupdate',
                title: localize2(16854, 'Apply Update...'),
                category: Categories.Developer,
                f1: true,
                precondition: CONTEXT_UPDATE_STATE.isEqualTo("idle" /* StateType.Idle */)
            });
        }
        async run(accessor) {
            const updateService = accessor.get(IUpdateService);
            const fileDialogService = accessor.get(IFileDialogService);
            const updatePath = await fileDialogService.showOpenDialog({
                title: localize(16844, null),
                filters: [{ name: 'Setup', extensions: ['exe'] }],
                canSelectFiles: true,
                openLabel: mnemonicButtonLabel(localize(16845, null))
            });
            if (!updatePath || !updatePath[0]) {
                return;
            }
            await updateService._applySpecificUpdate(updatePath[0].fsPath);
        }
    }
    registerAction2(DeveloperApplyUpdateAction);
}
//# sourceMappingURL=update.contribution.js.map