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
import { Disposable } from '../../../../base/common/lifecycle.js';
import { randomPort } from '../../../../base/common/ports.js';
import * as nls from '../../../../nls.js';
import { Categories } from '../../../../platform/action/common/actionCommonCategories.js';
import { Action2, MenuId } from '../../../../platform/actions/common/actions.js';
import { IExtensionHostDebugService } from '../../../../platform/debug/common/extensionHostDebug.js';
import { IDialogService } from '../../../../platform/dialogs/common/dialogs.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { INativeHostService } from '../../../../platform/native/common/native.js';
import { IProductService } from '../../../../platform/product/common/productService.js';
import { IProgressService } from '../../../../platform/progress/common/progress.js';
import { IStorageService } from '../../../../platform/storage/common/storage.js';
import { ActiveEditorContext } from '../../../common/contextkeys.js';
import { INativeWorkbenchEnvironmentService } from '../../../services/environment/electron-browser/environmentService.js';
import { IExtensionService } from '../../../services/extensions/common/extensions.js';
import { IHostService } from '../../../services/host/browser/host.js';
import { IDebugService } from '../../debug/common/debug.js';
import { RuntimeExtensionsEditor } from './runtimeExtensionsEditor.js';
import { IQuickInputService } from '../../../../platform/quickinput/common/quickInput.js';
// Shared helpers for debug actions
async function getExtensionHostPort(extensionService, nativeHostService, dialogService, productService) {
    const inspectPorts = await extensionService.getInspectPorts(1 /* ExtensionHostKind.LocalProcess */, false);
    if (inspectPorts.length === 0) {
        const res = await dialogService.confirm({
            message: nls.localize(11107, null),
            detail: nls.localize(11108, null, productService.nameLong),
            primaryButton: nls.localize(11109, null)
        });
        if (res.confirmed) {
            await nativeHostService.relaunch({ addArgs: [`--inspect-extensions=${randomPort()}`] });
        }
        return undefined;
    }
    if (inspectPorts.length > 1) {
        console.warn(`There are multiple extension hosts available for debugging. Picking the first one...`);
    }
    return inspectPorts[0].port;
}
async function getRendererDebugPort(extensionHostDebugService, windowId) {
    const result = await extensionHostDebugService.attachToCurrentWindowRenderer(windowId);
    return result.success ? result.port : undefined;
}
export class DebugExtensionHostInDevToolsAction extends Action2 {
    constructor() {
        super({
            id: 'workbench.extensions.action.devtoolsExtensionHost',
            title: nls.localize2(11115, 'Debug Extension Host In Dev Tools'),
            category: Categories.Developer,
            f1: true,
            icon: Codicon.debugStart,
        });
    }
    async run(accessor) {
        const extensionService = accessor.get(IExtensionService);
        const nativeHostService = accessor.get(INativeHostService);
        const quickInputService = accessor.get(IQuickInputService);
        const inspectPorts = await extensionService.getInspectPorts(1 /* ExtensionHostKind.LocalProcess */, true);
        if (inspectPorts.length === 0) {
            console.log('[devtoolsExtensionHost] No extension host inspect ports found.');
            return;
        }
        const items = inspectPorts.filter(portInfo => portInfo.devtoolsUrl).map(portInfo => ({
            label: portInfo.devtoolsLabel ?? `${portInfo.host}:${portInfo.port}`,
            detail: `${portInfo.host}:${portInfo.port}`,
            portInfo: portInfo
        }));
        if (items.length === 1) {
            const portInfo = items[0].portInfo;
            nativeHostService.openDevToolsWindow(portInfo.devtoolsUrl);
            return;
        }
        const selected = await quickInputService.pick(items, {
            placeHolder: nls.localize(11110, null),
            matchOnDetail: true,
        });
        if (selected) {
            const portInfo = selected.portInfo;
            nativeHostService.openDevToolsWindow(portInfo.devtoolsUrl);
        }
    }
}
export class DebugExtensionHostInNewWindowAction extends Action2 {
    constructor() {
        super({
            id: 'workbench.extensions.action.debugExtensionHost',
            title: nls.localize2(11116, "Debug Extension Host In New Window"),
            category: Categories.Developer,
            f1: true,
            icon: Codicon.debugStart,
            menu: {
                id: MenuId.EditorTitle,
                when: ActiveEditorContext.isEqualTo(RuntimeExtensionsEditor.ID),
                group: 'navigation',
            }
        });
    }
    async run(accessor) {
        const extensionService = accessor.get(IExtensionService);
        const nativeHostService = accessor.get(INativeHostService);
        const dialogService = accessor.get(IDialogService);
        const productService = accessor.get(IProductService);
        const instantiationService = accessor.get(IInstantiationService);
        const hostService = accessor.get(IHostService);
        const port = await getExtensionHostPort(extensionService, nativeHostService, dialogService, productService);
        if (port === undefined) {
            return;
        }
        const storage = instantiationService.createInstance(Storage);
        storage.storeDebugOnNewWindow(port);
        hostService.openWindow();
    }
}
export class DebugRendererInNewWindowAction extends Action2 {
    constructor() {
        super({
            id: 'workbench.action.debugRenderer',
            title: nls.localize2(11117, "Debug Renderer In New Window"),
            category: Categories.Developer,
            f1: true,
        });
    }
    async run(accessor) {
        const extensionHostDebugService = accessor.get(IExtensionHostDebugService);
        const environmentService = accessor.get(INativeWorkbenchEnvironmentService);
        const instantiationService = accessor.get(IInstantiationService);
        const hostService = accessor.get(IHostService);
        const port = await getRendererDebugPort(extensionHostDebugService, environmentService.window.id);
        if (port === undefined) {
            return;
        }
        const storage = instantiationService.createInstance(Storage);
        storage.storeRendererDebugOnNewWindow(port);
        // Force local window since Chrome debugging only works locally
        hostService.openWindow({ remoteAuthority: null });
    }
}
export class DebugExtensionHostAndRendererAction extends Action2 {
    constructor() {
        super({
            id: 'workbench.action.debugExtensionHostAndRenderer',
            title: nls.localize2(11118, "Debug Extension Host and Renderer In New Window"),
            category: Categories.Developer,
            f1: true,
        });
    }
    async run(accessor) {
        const extensionService = accessor.get(IExtensionService);
        const nativeHostService = accessor.get(INativeHostService);
        const dialogService = accessor.get(IDialogService);
        const productService = accessor.get(IProductService);
        const extensionHostDebugService = accessor.get(IExtensionHostDebugService);
        const environmentService = accessor.get(INativeWorkbenchEnvironmentService);
        const instantiationService = accessor.get(IInstantiationService);
        const hostService = accessor.get(IHostService);
        const [extHostPort, rendererPort] = await Promise.all([
            getExtensionHostPort(extensionService, nativeHostService, dialogService, productService),
            getRendererDebugPort(extensionHostDebugService, environmentService.window.id)
        ]);
        if (extHostPort === undefined || rendererPort === undefined) {
            return;
        }
        const storage = instantiationService.createInstance(Storage);
        storage.storeDebugOnNewWindow(extHostPort);
        storage.storeRendererDebugOnNewWindow(rendererPort);
        // Force local window since Chrome debugging only works locally
        hostService.openWindow({ remoteAuthority: null });
    }
}
let Storage = class Storage {
    constructor(_storageService) {
        this._storageService = _storageService;
    }
    storeDebugOnNewWindow(targetPort) {
        this._storageService.store('debugExtensionHost.debugPort', targetPort, -1 /* StorageScope.APPLICATION */, 1 /* StorageTarget.MACHINE */);
    }
    getAndDeleteDebugPortIfSet() {
        const port = this._storageService.getNumber('debugExtensionHost.debugPort', -1 /* StorageScope.APPLICATION */);
        if (port !== undefined) {
            this._storageService.remove('debugExtensionHost.debugPort', -1 /* StorageScope.APPLICATION */);
        }
        return port;
    }
    storeRendererDebugOnNewWindow(targetPort) {
        this._storageService.store('debugRenderer.debugPort', targetPort, -1 /* StorageScope.APPLICATION */, 1 /* StorageTarget.MACHINE */);
    }
    getAndDeleteRendererDebugPortIfSet() {
        const port = this._storageService.getNumber('debugRenderer.debugPort', -1 /* StorageScope.APPLICATION */);
        if (port !== undefined) {
            this._storageService.remove('debugRenderer.debugPort', -1 /* StorageScope.APPLICATION */);
        }
        return port;
    }
};
Storage = __decorate([
    __param(0, IStorageService)
], Storage);
const defaultDebugConfig = {
    trace: true,
    resolveSourceMapLocations: null,
    eagerSources: true,
    timeouts: {
        sourceMapMinPause: 30_000,
        sourceMapCumulativePause: 300_000,
    },
};
let DebugExtensionsContribution = class DebugExtensionsContribution extends Disposable {
    constructor(_debugService, _instantiationService, _progressService) {
        super();
        this._debugService = _debugService;
        this._instantiationService = _instantiationService;
        const storage = this._instantiationService.createInstance(Storage);
        const extHostPort = storage.getAndDeleteDebugPortIfSet();
        const rendererPort = storage.getAndDeleteRendererDebugPortIfSet();
        // Start both debug sessions in parallel
        const debugPromises = [];
        if (extHostPort !== undefined) {
            debugPromises.push(_progressService.withProgress({
                location: 15 /* ProgressLocation.Notification */,
                title: nls.localize(11111, null),
            }, async () => {
                // eslint-disable-next-line local/code-no-dangerous-type-assertions
                await this._debugService.startDebugging(undefined, {
                    type: 'node',
                    name: nls.localize(11112, null),
                    request: 'attach',
                    port: extHostPort,
                    ...defaultDebugConfig,
                });
            }));
        }
        if (rendererPort !== undefined) {
            debugPromises.push(_progressService.withProgress({
                location: 15 /* ProgressLocation.Notification */,
                title: nls.localize(11113, null),
            }, async () => {
                await this._debugService.startDebugging(undefined, {
                    type: 'chrome',
                    name: nls.localize(11114, null),
                    request: 'attach',
                    port: rendererPort,
                    ...defaultDebugConfig,
                });
            }));
        }
        Promise.all(debugPromises);
    }
};
DebugExtensionsContribution = __decorate([
    __param(0, IDebugService),
    __param(1, IInstantiationService),
    __param(2, IProgressService)
], DebugExtensionsContribution);
export { DebugExtensionsContribution };
//# sourceMappingURL=debugExtensionHostAction.js.map