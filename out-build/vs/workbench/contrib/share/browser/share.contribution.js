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
var ShareWorkbenchContribution_1;
import { localize } from '../../../../nls.js';
import { MenuId, MenuRegistry } from '../../../../platform/actions/common/actions.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { registerSingleton } from '../../../../platform/instantiation/common/extensions.js';
import { Registry } from '../../../../platform/registry/common/platform.js';
import { ShareService } from './shareService.js';
import { IShareService } from '../common/share.js';
import { Disposable, DisposableStore } from '../../../../base/common/lifecycle.js';
import { Extensions as ConfigurationExtensions } from '../../../../platform/configuration/common/configurationRegistry.js';
import { workbenchConfigurationNodeBase } from '../../../common/configuration.js';
import { Extensions as WorkbenchExtensions } from '../../../common/contributions.js';
const targetMenus = [
    MenuId.EditorContextShare,
    MenuId.SCMResourceContextShare,
    MenuId.OpenEditorsContextShare,
    MenuId.EditorTitleContextShare,
    // MenuId.MenubarShare,
    // MenuId.EditorLineNumberContext, // todo@joyceerhl add share
    MenuId.ExplorerContextShare
];
let ShareWorkbenchContribution = class ShareWorkbenchContribution extends Disposable {
    static { ShareWorkbenchContribution_1 = this; }
    static { this.SHARE_ENABLED_SETTING = 'workbench.experimental.share.enabled'; }
    constructor(shareService, configurationService) {
        super();
        this.shareService = shareService;
        this.configurationService = configurationService;
        if (this.configurationService.getValue(ShareWorkbenchContribution_1.SHARE_ENABLED_SETTING)) {
            this.registerActions();
        }
        this._register(this.configurationService.onDidChangeConfiguration(e => {
            if (e.affectsConfiguration(ShareWorkbenchContribution_1.SHARE_ENABLED_SETTING)) {
                const settingValue = this.configurationService.getValue(ShareWorkbenchContribution_1.SHARE_ENABLED_SETTING);
                if (settingValue === true && this._disposables === undefined) {
                    this.registerActions();
                }
                else if (settingValue === false && this._disposables !== undefined) {
                    this._disposables?.clear();
                    this._disposables = undefined;
                }
            }
        }));
    }
    dispose() {
        super.dispose();
        this._disposables?.dispose();
    }
    registerActions() {
        if (!this._disposables) {
            this._disposables = new DisposableStore();
        }
        /*
        this._disposables.add(
            registerAction2(class ShareAction extends Action2 {
                static readonly ID = 'workbench.action.share';
                static readonly LABEL = localize2('share', 'Share...');

                constructor() {
                    super({
                        id: ShareAction.ID,
                        title: ShareAction.LABEL,
                        f1: true,
                        icon: Codicon.linkExternal,
                        precondition: ContextKeyExpr.and(ShareProviderCountContext.notEqualsTo(0), WorkspaceFolderCountContext.notEqualsTo(0)),
                        keybinding: {
                            weight: KeybindingWeight.WorkbenchContrib,
                            primary: KeyMod.Alt | KeyMod.CtrlCmd | KeyCode.KeyS,
                        },
                        menu: [
                            { id: MenuId.CommandCenter, order: 3 }
                        ]
                    });
                }

                override async run(accessor: ServicesAccessor, ...args: unknown[]): Promise<void> {
                    const shareService = accessor.get(IShareService);
                    const activeEditor = accessor.get(IEditorService)?.activeEditor;
                    const resourceUri = (activeEditor && EditorResourceAccessor.getOriginalUri(activeEditor, { supportSideBySide: SideBySideEditor.PRIMARY }))
                        ?? accessor.get(IWorkspaceContextService).getWorkspace().folders[0].uri;
                    const clipboardService = accessor.get(IClipboardService);
                    const dialogService = accessor.get(IDialogService);
                    const urlService = accessor.get(IOpenerService);
                    const progressService = accessor.get(IProgressService);
                    const selection = accessor.get(ICodeEditorService).getActiveCodeEditor()?.getSelection() ?? undefined;

                    const result = await progressService.withProgress({
                        location: ProgressLocation.Window,
                        detail: localize('generating link', 'Generating link...')
                    }, async () => shareService.provideShare({ resourceUri, selection }, CancellationToken.None));

                    if (result) {
                        const uriText = result.toString();
                        const isResultText = typeof result === 'string';
                        await clipboardService.writeText(uriText);

                        dialogService.prompt(
                            {
                                type: Severity.Info,
                                message: isResultText ? localize('shareTextSuccess', 'Copied text to clipboard!') : localize('shareSuccess', 'Copied link to clipboard!'),
                                custom: {
                                    icon: Codicon.check,
                                    markdownDetails: [{
                                        markdown: new MarkdownString(`<div aria-label='${uriText}'>${uriText}</div>`, { supportHtml: true }),
                                        classes: [isResultText ? 'share-dialog-input-text' : 'share-dialog-input-link']
                                    }]
                                },
                                cancelButton: localize('close', 'Close'),
                                buttons: isResultText ? [] : [{ label: localize('open link', 'Open Link'), run: () => { urlService.open(result, { openExternal: true }); } }]
                            }
                        );
                    }
                }
            })
        );
        */
        const actions = this.shareService.getShareActions();
        for (const menuId of targetMenus) {
            for (const action of actions) {
                // todo@joyceerhl avoid duplicates
                this._disposables.add(MenuRegistry.appendMenuItem(menuId, action));
            }
        }
    }
};
ShareWorkbenchContribution = ShareWorkbenchContribution_1 = __decorate([
    __param(0, IShareService),
    __param(1, IConfigurationService)
], ShareWorkbenchContribution);
registerSingleton(IShareService, ShareService, 1 /* InstantiationType.Delayed */);
const workbenchContributionsRegistry = Registry.as(WorkbenchExtensions.Workbench);
workbenchContributionsRegistry.registerWorkbenchContribution(ShareWorkbenchContribution, 4 /* LifecyclePhase.Eventually */);
Registry.as(ConfigurationExtensions.Configuration).registerConfiguration({
    ...workbenchConfigurationNodeBase,
    properties: {
        'workbench.experimental.share.enabled': {
            type: 'boolean',
            default: false,
            tags: ['experimental'],
            markdownDescription: localize(14750, null, '`#window.commandCenter#`', '`true`'),
            restricted: false,
        }
    }
});
//# sourceMappingURL=share.contribution.js.map