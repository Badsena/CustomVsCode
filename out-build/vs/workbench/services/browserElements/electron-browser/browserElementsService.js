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
import { INativeBrowserElementsService } from '../../../../platform/browserElements/common/browserElements.js';
import { ipcRenderer } from '../../../../base/parts/sandbox/electron-browser/globals.js';
import { registerSingleton } from '../../../../platform/instantiation/common/extensions.js';
import { IBrowserElementsService } from '../browser/browserElementsService.js';
import { IMainProcessService } from '../../../../platform/ipc/common/mainProcessService.js';
import { INativeWorkbenchEnvironmentService } from '../../environment/electron-browser/environmentService.js';
import { NativeBrowserElementsService } from '../../../../platform/browserElements/common/nativeBrowserElementsService.js';
let WorkbenchNativeBrowserElementsService = class WorkbenchNativeBrowserElementsService extends NativeBrowserElementsService {
    constructor(environmentService, mainProcessService) {
        super(environmentService.window.id, mainProcessService);
    }
};
WorkbenchNativeBrowserElementsService = __decorate([
    __param(0, INativeWorkbenchEnvironmentService),
    __param(1, IMainProcessService)
], WorkbenchNativeBrowserElementsService);
let cancelSelectionIdPool = 0;
let cancelAndDetachIdPool = 0;
let WorkbenchBrowserElementsService = class WorkbenchBrowserElementsService {
    constructor(simpleBrowser) {
        this.simpleBrowser = simpleBrowser;
    }
    async getConsoleLogs(locator) {
        return await this.simpleBrowser.getConsoleLogs(locator);
    }
    async startConsoleSession(token, locator) {
        const cancelAndDetachId = cancelAndDetachIdPool++;
        const onCancelChannel = `vscode:cancelConsoleSession${cancelAndDetachId}`;
        const disposable = token.onCancellationRequested(() => {
            ipcRenderer.send(onCancelChannel, cancelAndDetachId);
            disposable.dispose();
        });
        try {
            await this.simpleBrowser.startConsoleSession(token, locator, cancelAndDetachId);
        }
        catch (error) {
            throw new Error('Failed to start console session', { cause: error });
        }
        finally {
            disposable.dispose();
        }
    }
    async startDebugSession(token, locator) {
        const cancelAndDetachId = cancelAndDetachIdPool++;
        const onCancelChannel = `vscode:cancelCurrentSession${cancelAndDetachId}`;
        const disposable = token.onCancellationRequested(() => {
            ipcRenderer.send(onCancelChannel, cancelAndDetachId);
            disposable.dispose();
        });
        try {
            await this.simpleBrowser.startDebugSession(token, locator, cancelAndDetachId);
        }
        catch (error) {
            throw new Error('No debug session target found', { cause: error });
        }
        finally {
            disposable.dispose();
        }
    }
    async getElementData(rect, token, locator) {
        if (!locator) {
            return undefined;
        }
        const cancelSelectionId = cancelSelectionIdPool++;
        const onCancelChannel = `vscode:cancelElementSelection${cancelSelectionId}`;
        const disposable = token.onCancellationRequested(() => {
            ipcRenderer.send(onCancelChannel, cancelSelectionId);
        });
        try {
            const elementData = await this.simpleBrowser.getElementData(rect, token, locator, cancelSelectionId);
            return elementData;
        }
        catch (error) {
            disposable.dispose();
            throw new Error(`Native Host: Error getting element data: ${error}`);
        }
        finally {
            disposable.dispose();
        }
    }
    async getFocusedElementData(rect, token, locator) {
        if (!locator) {
            return undefined;
        }
        const cancelSelectionId = cancelSelectionIdPool++;
        const onCancelChannel = `vscode:cancelElementSelection${cancelSelectionId}`;
        const disposable = token.onCancellationRequested(() => {
            ipcRenderer.send(onCancelChannel, cancelSelectionId);
        });
        try {
            return await this.simpleBrowser.getFocusedElementData(rect, token, locator, cancelSelectionId);
        }
        finally {
            disposable.dispose();
        }
    }
};
WorkbenchBrowserElementsService = __decorate([
    __param(0, INativeBrowserElementsService)
], WorkbenchBrowserElementsService);
registerSingleton(IBrowserElementsService, WorkbenchBrowserElementsService, 1 /* InstantiationType.Delayed */);
registerSingleton(INativeBrowserElementsService, WorkbenchNativeBrowserElementsService, 1 /* InstantiationType.Delayed */);
//# sourceMappingURL=browserElementsService.js.map