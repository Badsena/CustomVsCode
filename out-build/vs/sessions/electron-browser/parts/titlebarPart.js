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
var AuxiliaryNativeTitlebarPart_1;
import { getZoomFactor } from '../../../base/browser/browser.js';
import { getWindow, getWindowId } from '../../../base/browser/dom.js';
import { IConfigurationService } from '../../../platform/configuration/common/configuration.js';
import { IContextKeyService } from '../../../platform/contextkey/common/contextkey.js';
import { IContextMenuService } from '../../../platform/contextview/browser/contextView.js';
import { IInstantiationService } from '../../../platform/instantiation/common/instantiation.js';
import { INativeHostService } from '../../../platform/native/common/native.js';
import { IStorageService } from '../../../platform/storage/common/storage.js';
import { IThemeService } from '../../../platform/theme/common/themeService.js';
import { useWindowControlsOverlay } from '../../../platform/window/common/window.js';
import { IsWindowAlwaysOnTopContext } from '../../../workbench/common/contextkeys.js';
import { IHostService } from '../../../workbench/services/host/browser/host.js';
import { IWorkbenchLayoutService } from '../../../workbench/services/layout/browser/layoutService.js';
import { mainWindow } from '../../../base/browser/window.js';
import { TitlebarPart, TitleService } from '../../browser/parts/titlebarPart.js';
let NativeTitlebarPart = class NativeTitlebarPart extends TitlebarPart {
    constructor(id, targetWindow, contextMenuService, configurationService, instantiationService, themeService, storageService, layoutService, contextKeyService, hostService, nativeHostService) {
        super(id, targetWindow, contextMenuService, configurationService, instantiationService, themeService, storageService, layoutService, contextKeyService, hostService);
        this.nativeHostService = nativeHostService;
        this.handleWindowsAlwaysOnTop(targetWindow.vscodeWindowId, contextKeyService);
    }
    async handleWindowsAlwaysOnTop(targetWindowId, contextKeyService) {
        const isWindowAlwaysOnTopContext = IsWindowAlwaysOnTopContext.bindTo(contextKeyService);
        this._register(this.nativeHostService.onDidChangeWindowAlwaysOnTop(({ windowId, alwaysOnTop }) => {
            if (windowId === targetWindowId) {
                isWindowAlwaysOnTopContext.set(alwaysOnTop);
            }
        }));
        isWindowAlwaysOnTopContext.set(await this.nativeHostService.isWindowAlwaysOnTop({ targetWindowId }));
    }
    updateStyles() {
        super.updateStyles();
        if (this.element) {
            if (useWindowControlsOverlay(this.configurationService)) {
                if (!this.cachedWindowControlStyles ||
                    this.cachedWindowControlStyles.bgColor !== this.element.style.backgroundColor ||
                    this.cachedWindowControlStyles.fgColor !== this.element.style.color) {
                    this.cachedWindowControlStyles = {
                        bgColor: this.element.style.backgroundColor,
                        fgColor: this.element.style.color
                    };
                    this.nativeHostService.updateWindowControls({
                        targetWindowId: getWindowId(getWindow(this.element)),
                        backgroundColor: this.element.style.backgroundColor,
                        foregroundColor: this.element.style.color
                    });
                }
            }
        }
    }
    layout(width, height) {
        super.layout(width, height);
        if (useWindowControlsOverlay(this.configurationService)) {
            const newHeight = Math.round(height * getZoomFactor(getWindow(this.element)));
            if (newHeight !== this.cachedWindowControlHeight) {
                this.cachedWindowControlHeight = newHeight;
                this.nativeHostService.updateWindowControls({
                    targetWindowId: getWindowId(getWindow(this.element)),
                    height: newHeight
                });
            }
        }
    }
};
NativeTitlebarPart = __decorate([
    __param(2, IContextMenuService),
    __param(3, IConfigurationService),
    __param(4, IInstantiationService),
    __param(5, IThemeService),
    __param(6, IStorageService),
    __param(7, IWorkbenchLayoutService),
    __param(8, IContextKeyService),
    __param(9, IHostService),
    __param(10, INativeHostService)
], NativeTitlebarPart);
export { NativeTitlebarPart };
let MainNativeTitlebarPart = class MainNativeTitlebarPart extends NativeTitlebarPart {
    constructor(contextMenuService, configurationService, instantiationService, themeService, storageService, layoutService, contextKeyService, hostService, nativeHostService) {
        super("workbench.parts.titlebar" /* Parts.TITLEBAR_PART */, mainWindow, contextMenuService, configurationService, instantiationService, themeService, storageService, layoutService, contextKeyService, hostService, nativeHostService);
    }
};
MainNativeTitlebarPart = __decorate([
    __param(0, IContextMenuService),
    __param(1, IConfigurationService),
    __param(2, IInstantiationService),
    __param(3, IThemeService),
    __param(4, IStorageService),
    __param(5, IWorkbenchLayoutService),
    __param(6, IContextKeyService),
    __param(7, IHostService),
    __param(8, INativeHostService)
], MainNativeTitlebarPart);
let AuxiliaryNativeTitlebarPart = class AuxiliaryNativeTitlebarPart extends NativeTitlebarPart {
    static { AuxiliaryNativeTitlebarPart_1 = this; }
    static { this.COUNTER = 1; }
    get height() { return this.minimumHeight; }
    constructor(container, mainTitlebar, contextMenuService, configurationService, instantiationService, themeService, storageService, layoutService, contextKeyService, hostService, nativeHostService) {
        const id = AuxiliaryNativeTitlebarPart_1.COUNTER++;
        super(`workbench.parts.auxiliaryTitle.${id}`, getWindow(container), contextMenuService, configurationService, instantiationService, themeService, storageService, layoutService, contextKeyService, hostService, nativeHostService);
        this.container = container;
        this.mainTitlebar = mainTitlebar;
    }
    get preventZoom() {
        return getZoomFactor(getWindow(this.element)) < 1 || !this.mainTitlebar.hasZoomableElements;
    }
};
AuxiliaryNativeTitlebarPart = AuxiliaryNativeTitlebarPart_1 = __decorate([
    __param(2, IContextMenuService),
    __param(3, IConfigurationService),
    __param(4, IInstantiationService),
    __param(5, IThemeService),
    __param(6, IStorageService),
    __param(7, IWorkbenchLayoutService),
    __param(8, IContextKeyService),
    __param(9, IHostService),
    __param(10, INativeHostService)
], AuxiliaryNativeTitlebarPart);
export class NativeTitleService extends TitleService {
    createMainTitlebarPart() {
        return this.instantiationService.createInstance(MainNativeTitlebarPart);
    }
    doCreateAuxiliaryTitlebarPart(container, _editorGroupsContainer, instantiationService) {
        return instantiationService.createInstance(AuxiliaryNativeTitlebarPart, container, this.mainPart);
    }
}
//# sourceMappingURL=titlebarPart.js.map