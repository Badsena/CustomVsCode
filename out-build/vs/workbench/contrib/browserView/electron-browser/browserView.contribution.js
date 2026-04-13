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
import { localize } from '../../../../nls.js';
import { SyncDescriptor } from '../../../../platform/instantiation/common/descriptors.js';
import { Registry } from '../../../../platform/registry/common/platform.js';
import { EditorPaneDescriptor } from '../../../browser/editor.js';
import { EditorExtensions } from '../../../common/editor.js';
import { BrowserEditor } from './browserEditor.js';
import { BrowserEditorInput, BrowserEditorSerializer } from '../common/browserEditorInput.js';
import { BrowserViewUri } from '../../../../platform/browserView/common/browserViewUri.js';
import { generateUuid } from '../../../../base/common/uuid.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { registerSingleton } from '../../../../platform/instantiation/common/extensions.js';
import { Extensions as ConfigurationExtensions } from '../../../../platform/configuration/common/configurationRegistry.js';
import { workbenchConfigurationNodeBase } from '../../../common/configuration.js';
import { IEditorResolverService, RegisteredEditorPriority } from '../../../services/editor/common/editorResolverService.js';
import { registerWorkbenchContribution2 } from '../../../common/contributions.js';
import { Schemas } from '../../../../base/common/network.js';
import { IBrowserViewCDPService, IBrowserViewWorkbenchService } from '../common/browserView.js';
import { BrowserViewWorkbenchService } from './browserViewWorkbenchService.js';
import { BrowserViewCDPService } from './browserViewCDPService.js';
import { BrowserViewStorageScope } from '../../../../platform/browserView/common/browserView.js';
import { IOpenerService } from '../../../../platform/opener/common/opener.js';
import { isLocalhostAuthority } from '../../../../platform/url/common/trustedDomains.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { IEditorService } from '../../../services/editor/common/editorService.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { ITelemetryService } from '../../../../platform/telemetry/common/telemetry.js';
import { logBrowserOpen } from '../../../../platform/browserView/common/browserViewTelemetry.js';
// Register actions and browser features
import './browserViewActions.js';
import './features/browserEditorChatFeatures.js';
import './features/browserEditorZoomFeature.js';
Registry.as(EditorExtensions.EditorPane).registerEditorPane(EditorPaneDescriptor.create(BrowserEditor, BrowserEditorInput.EDITOR_ID, localize(5548, null)), [
    new SyncDescriptor(BrowserEditorInput)
]);
Registry.as(EditorExtensions.EditorFactory).registerEditorSerializer(BrowserEditorInput.ID, BrowserEditorSerializer);
let BrowserEditorResolverContribution = class BrowserEditorResolverContribution {
    static { this.ID = 'workbench.contrib.browserEditorResolver'; }
    constructor(editorResolverService, instantiationService) {
        editorResolverService.registerEditor(`${Schemas.vscodeBrowser}:/**`, {
            id: BrowserEditorInput.ID,
            label: localize(5549, null),
            priority: RegisteredEditorPriority.exclusive
        }, {
            canSupportResource: resource => resource.scheme === Schemas.vscodeBrowser,
            singlePerResource: true
        }, {
            createEditorInput: ({ resource, options }) => {
                const parsed = BrowserViewUri.parse(resource);
                if (!parsed) {
                    throw new Error(`Invalid browser view resource: ${resource.toString()}`);
                }
                const browserInput = instantiationService.createInstance(BrowserEditorInput, {
                    ...options?.viewState,
                    id: parsed.id
                });
                // Start resolving the input right away. This will create the browser view.
                // This allows browser views to be loaded in the background.
                void browserInput.resolve();
                return {
                    editor: browserInput,
                    options: {
                        ...options,
                        pinned: !!browserInput.url // pin if navigated
                    }
                };
            }
        });
    }
};
BrowserEditorResolverContribution = __decorate([
    __param(0, IEditorResolverService),
    __param(1, IInstantiationService)
], BrowserEditorResolverContribution);
registerWorkbenchContribution2(BrowserEditorResolverContribution.ID, BrowserEditorResolverContribution, 1 /* WorkbenchPhase.BlockStartup */);
/**
 * Opens localhost URLs in the Integrated Browser when the setting is enabled.
 */
let LocalhostLinkOpenerContribution = class LocalhostLinkOpenerContribution extends Disposable {
    static { this.ID = 'workbench.contrib.localhostLinkOpener'; }
    constructor(openerService, configurationService, editorService, telemetryService) {
        super();
        this.configurationService = configurationService;
        this.editorService = editorService;
        this.telemetryService = telemetryService;
        this._register(openerService.registerExternalOpener(this));
    }
    async openExternal(href, _ctx, _token) {
        if (!this.configurationService.getValue('workbench.browser.openLocalhostLinks')) {
            return false;
        }
        try {
            const parsed = new URL(href);
            if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
                return false;
            }
            if (!isLocalhostAuthority(parsed.host)) {
                return false;
            }
        }
        catch {
            return false;
        }
        logBrowserOpen(this.telemetryService, 'localhostLinkOpener');
        const browserUri = BrowserViewUri.forId(generateUuid());
        await this.editorService.openEditor({ resource: browserUri, options: { pinned: true, viewState: { url: href } } });
        return true;
    }
};
LocalhostLinkOpenerContribution = __decorate([
    __param(0, IOpenerService),
    __param(1, IConfigurationService),
    __param(2, IEditorService),
    __param(3, ITelemetryService)
], LocalhostLinkOpenerContribution);
registerWorkbenchContribution2(LocalhostLinkOpenerContribution.ID, LocalhostLinkOpenerContribution, 1 /* WorkbenchPhase.BlockStartup */);
registerSingleton(IBrowserViewWorkbenchService, BrowserViewWorkbenchService, 1 /* InstantiationType.Delayed */);
registerSingleton(IBrowserViewCDPService, BrowserViewCDPService, 1 /* InstantiationType.Delayed */);
Registry.as(ConfigurationExtensions.Configuration).registerConfiguration({
    ...workbenchConfigurationNodeBase,
    properties: {
        'workbench.browser.showInTitleBar': {
            type: 'boolean',
            default: false,
            experiment: { mode: 'startup' },
            description: localize(5550, null)
        },
        'workbench.browser.openLocalhostLinks': {
            type: 'boolean',
            default: false,
            markdownDescription: localize(5551, null)
        },
        'workbench.browser.dataStorage': {
            type: 'string',
            enum: [
                BrowserViewStorageScope.Global,
                BrowserViewStorageScope.Workspace,
                BrowserViewStorageScope.Ephemeral
            ],
            markdownEnumDescriptions: [
                localize(5552, null),
                localize(5553, null),
                localize(5554, null)
            ],
            restricted: true,
            default: BrowserViewStorageScope.Global,
            markdownDescription: localize(5555, null),
            scope: 4 /* ConfigurationScope.WINDOW */,
            order: 100
        }
    }
});
//# sourceMappingURL=browserView.contribution.js.map