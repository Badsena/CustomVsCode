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
import { Emitter, Event } from '../../../base/common/event.js';
import { Disposable, DisposableMap } from '../../../base/common/lifecycle.js';
import { BrowserViewCommandId } from '../common/browserView.js';
import { clipboard, Menu, MenuItem } from 'electron';
import { IEnvironmentMainService } from '../../environment/electron-main/environmentMainService.js';
import { createDecorator, IInstantiationService } from '../../instantiation/common/instantiation.js';
import { BrowserView } from './browserView.js';
import { generateUuid } from '../../../base/common/uuid.js';
import { BrowserViewUri } from '../common/browserViewUri.js';
import { IWindowsMainService } from '../../windows/electron-main/windows.js';
import { BrowserSession } from './browserSession.js';
import { IProductService } from '../../product/common/productService.js';
import { IApplicationStorageMainService } from '../../storage/electron-main/storageMainService.js';
import { CDPBrowserProxy } from '../common/cdp/proxy.js';
import { logBrowserOpen } from '../common/browserViewTelemetry.js';
import { ITelemetryService } from '../../telemetry/common/telemetry.js';
import { CancellationToken } from '../../../base/common/cancellation.js';
import { localize } from '../../../nls.js';
import { INativeHostMainService } from '../../native/electron-main/nativeHostMainService.js';
import { htmlAttributeEncodeValue } from '../../../base/common/strings.js';
export const IBrowserViewMainService = createDecorator('browserViewMainService');
let BrowserViewMainService = class BrowserViewMainService extends Disposable {
    /**
     * Check if a webContents belongs to an integrated browser view.
     * Delegates to {@link BrowserSession.isBrowserViewWebContents}.
     */
    static isBrowserViewWebContents(contents) {
        return BrowserSession.isBrowserViewWebContents(contents);
    }
    constructor(environmentMainService, instantiationService, windowsMainService, productService, telemetryService, nativeHostMainService, applicationStorageMainService) {
        super();
        this.environmentMainService = environmentMainService;
        this.instantiationService = instantiationService;
        this.windowsMainService = windowsMainService;
        this.productService = productService;
        this.telemetryService = telemetryService;
        this.nativeHostMainService = nativeHostMainService;
        this.applicationStorageMainService = applicationStorageMainService;
        this.browserViews = this._register(new DisposableMap());
        this._keybindings = Object.create(null);
        // ICDPBrowserTarget events
        this._onTargetCreated = this._register(new Emitter());
        this.onTargetCreated = this._onTargetCreated.event;
        this._onTargetDestroyed = this._register(new Emitter());
        this.onTargetDestroyed = this._onTargetDestroyed.event;
    }
    async getOrCreateBrowserView(id, scope, workspaceId) {
        if (this.browserViews.has(id)) {
            // Note: scope will be ignored if the view already exists.
            // Browser views cannot be moved between sessions after creation.
            const view = this.browserViews.get(id);
            return view.getState();
        }
        const browserSession = BrowserSession.getOrCreate(id, scope, this.environmentMainService.workspaceStorageHome, workspaceId);
        const view = this.createBrowserView(id, browserSession);
        return view.getState();
    }
    tryGetBrowserView(id) {
        return this.browserViews.get(id);
    }
    // ICDPBrowserTarget implementation
    getVersion() {
        return {
            protocolVersion: '1.3',
            product: `${this.productService.nameShort}/${this.productService.version}`,
            revision: this.productService.commit || 'unknown',
            userAgent: 'Electron',
            jsVersion: process.versions.v8
        };
    }
    getWindowForTarget(target) {
        if (!(target instanceof BrowserView)) {
            throw new Error('Can only get window for targets created by this service');
        }
        const view = target.getWebContentsView();
        const viewBounds = view.getBounds();
        return {
            windowId: 1,
            bounds: {
                left: viewBounds.x,
                top: viewBounds.y,
                width: viewBounds.width,
                height: viewBounds.height,
                windowState: 'normal'
            }
        };
    }
    async attach() {
        return new CDPBrowserProxy(this);
    }
    async getTargetInfo() {
        return {
            targetId: 'browser',
            type: 'browser',
            title: this.getVersion().product,
            url: '',
            attached: true,
            canAccessOpener: false
        };
    }
    getTargets() {
        return this.browserViews.values();
    }
    async createTarget(url, browserContextId, windowId) {
        const browserSession = browserContextId ? BrowserSession.get(browserContextId) : undefined;
        return this.openNew(url, {
            session: browserSession,
            windowId,
            editorOptions: { preserveFocus: true },
            source: 'cdpCreated'
        });
    }
    async activateTarget(target) {
        if (!(target instanceof BrowserView)) {
            throw new Error('Can only activate targets created by this service');
        }
        // TODO@kycutler
    }
    async closeTarget(target) {
        if (!(target instanceof BrowserView)) {
            throw new Error('Can only close targets created by this service');
        }
        await this.destroyBrowserView(target.id);
        return true;
    }
    // Browser context management
    getBrowserContexts() {
        return BrowserSession.getBrowserContextIds();
    }
    async createBrowserContext() {
        const browserSession = BrowserSession.getOrCreateEphemeral(generateUuid(), 'cdp-created');
        return browserSession.id;
    }
    async disposeBrowserContext(browserContextId) {
        if (!browserContextId.startsWith('cdp-created:')) {
            throw new Error('Can only dispose browser contexts created via CDP');
        }
        const browserSession = BrowserSession.get(browserContextId);
        if (!browserSession) {
            throw new Error(`Browser context ${browserContextId} not found`);
        }
        // Close all targets in this context
        for (const view of this.browserViews.values()) {
            if (view.session === browserSession) {
                await this.destroyBrowserView(view.id);
            }
        }
    }
    /**
     * Get a browser view or throw if not found
     */
    _getBrowserView(id) {
        const view = this.browserViews.get(id);
        if (!view) {
            throw new Error(`Browser view ${id} not found`);
        }
        return view;
    }
    onDynamicDidNavigate(id) {
        return this._getBrowserView(id).onDidNavigate;
    }
    onDynamicDidChangeLoadingState(id) {
        return this._getBrowserView(id).onDidChangeLoadingState;
    }
    onDynamicDidChangeFocus(id) {
        return this._getBrowserView(id).onDidChangeFocus;
    }
    onDynamicDidChangeVisibility(id) {
        return this._getBrowserView(id).onDidChangeVisibility;
    }
    onDynamicDidChangeDevToolsState(id) {
        return this._getBrowserView(id).onDidChangeDevToolsState;
    }
    onDynamicDidKeyCommand(id) {
        return this._getBrowserView(id).onDidKeyCommand;
    }
    onDynamicDidChangeTitle(id) {
        return this._getBrowserView(id).onDidChangeTitle;
    }
    onDynamicDidChangeFavicon(id) {
        return this._getBrowserView(id).onDidChangeFavicon;
    }
    onDynamicDidRequestNewPage(id) {
        return this._getBrowserView(id).onDidRequestNewPage;
    }
    onDynamicDidFindInPage(id) {
        return this._getBrowserView(id).onDidFindInPage;
    }
    onDynamicDidClose(id) {
        return this._getBrowserView(id).onDidClose;
    }
    async getState(id) {
        return this._getBrowserView(id).getState();
    }
    async destroyBrowserView(id) {
        return this.browserViews.deleteAndDispose(id);
    }
    async layout(id, bounds) {
        return this._getBrowserView(id).layout(bounds);
    }
    async setVisible(id, visible) {
        return this._getBrowserView(id).setVisible(visible);
    }
    async loadURL(id, url) {
        return this._getBrowserView(id).loadURL(url);
    }
    async getURL(id) {
        return this._getBrowserView(id).getURL();
    }
    async goBack(id) {
        return this._getBrowserView(id).goBack();
    }
    async goForward(id) {
        return this._getBrowserView(id).goForward();
    }
    async reload(id, hard) {
        return this._getBrowserView(id).reload(hard);
    }
    async toggleDevTools(id) {
        return this._getBrowserView(id).toggleDevTools();
    }
    async canGoBack(id) {
        return this._getBrowserView(id).canGoBack();
    }
    async canGoForward(id) {
        return this._getBrowserView(id).canGoForward();
    }
    async captureScreenshot(id, options) {
        return this._getBrowserView(id).captureScreenshot(options);
    }
    async dispatchKeyEvent(id, keyEvent) {
        return this._getBrowserView(id).dispatchKeyEvent(keyEvent);
    }
    async focus(id) {
        return this._getBrowserView(id).focus();
    }
    async findInPage(id, text, options) {
        return this._getBrowserView(id).findInPage(text, options);
    }
    async stopFindInPage(id, keepSelection) {
        return this._getBrowserView(id).stopFindInPage(keepSelection);
    }
    async getSelectedText(id) {
        return this._getBrowserView(id).getSelectedText();
    }
    async clearStorage(id) {
        return this._getBrowserView(id).clearStorage();
    }
    async setBrowserZoomIndex(id, zoomIndex) {
        return this._getBrowserView(id).setBrowserZoomIndex(zoomIndex);
    }
    async trustCertificate(id, host, fingerprint) {
        return this._getBrowserView(id).trustCertificate(host, fingerprint);
    }
    async untrustCertificate(id, host, fingerprint) {
        return this._getBrowserView(id).untrustCertificate(host, fingerprint);
    }
    async clearGlobalStorage() {
        const browserSession = BrowserSession.getOrCreateGlobal();
        browserSession.connectStorage(this.applicationStorageMainService);
        await browserSession.clearData();
    }
    async clearWorkspaceStorage(workspaceId) {
        const browserSession = BrowserSession.getOrCreateWorkspace(workspaceId, this.environmentMainService.workspaceStorageHome);
        browserSession.connectStorage(this.applicationStorageMainService);
        await browserSession.clearData();
    }
    async updateKeybindings(keybindings) {
        this._keybindings = keybindings;
    }
    /**
     * Create a browser view backed by the given {@link BrowserSession}.
     */
    createBrowserView(id, browserSession, options) {
        if (this.browserViews.has(id)) {
            throw new Error(`Browser view with id ${id} already exists`);
        }
        browserSession.connectStorage(this.applicationStorageMainService);
        const view = this.instantiationService.createInstance(BrowserView, id, browserSession, 
        // Recursive factory for nested windows (child views share the same session)
        (childOptions) => this.createBrowserView(generateUuid(), browserSession, childOptions), (v, params) => this.showContextMenu(v, params), options);
        this.browserViews.set(id, view);
        this._onTargetCreated.fire(view);
        Event.once(view.onDidClose)(() => {
            this._onTargetDestroyed.fire(view);
            this.browserViews.deleteAndDispose(id);
        });
        return view;
    }
    async openNew(url, { session, windowId, editorOptions, source }) {
        const targetId = generateUuid();
        const view = this.createBrowserView(targetId, session || BrowserSession.getOrCreateEphemeral(targetId));
        const window = windowId !== undefined ? this.windowsMainService.getWindowById(windowId) : this.windowsMainService.getFocusedWindow();
        if (!window) {
            throw new Error(`Window ${windowId} not found`);
        }
        logBrowserOpen(this.telemetryService, source);
        // Request the workbench to open the editor
        window.sendWhenReady('vscode:runAction', CancellationToken.None, {
            id: '_workbench.open',
            args: [BrowserViewUri.forId(targetId), [undefined, { ...editorOptions, viewState: { url } }], undefined]
        });
        return view;
    }
    showContextMenu(view, params) {
        const win = view.getElectronWindow();
        if (!win) {
            return;
        }
        const webContents = view.webContents;
        if (webContents.isDestroyed()) {
            return;
        }
        const menu = new Menu();
        if (params.linkURL) {
            menu.append(new MenuItem({
                label: localize(1928, null),
                click: () => {
                    void this.openNew(params.linkURL, {
                        session: view.session,
                        windowId: view.getTopCodeWindow()?.id,
                        editorOptions: { preserveFocus: true, inactive: true },
                        source: 'browserLinkBackground'
                    });
                }
            }));
            menu.append(new MenuItem({
                label: localize(1929, null),
                click: () => { void this.nativeHostMainService.openExternal(undefined, params.linkURL); }
            }));
            menu.append(new MenuItem({ type: 'separator' }));
            menu.append(new MenuItem({
                label: localize(1930, null),
                click: () => {
                    clipboard.write({
                        text: params.linkURL,
                        html: `<a href="${encodeURI(params.linkURL)}">${htmlAttributeEncodeValue(params.linkText || params.linkURL)}</a>`
                    });
                }
            }));
        }
        if (params.hasImageContents && params.srcURL) {
            if (menu.items.length > 0) {
                menu.append(new MenuItem({ type: 'separator' }));
            }
            menu.append(new MenuItem({
                label: localize(1931, null),
                click: () => {
                    void this.openNew(params.srcURL, {
                        session: view.session,
                        windowId: view.getTopCodeWindow()?.id,
                        editorOptions: { preserveFocus: true, inactive: true },
                        source: 'browserLinkBackground'
                    });
                }
            }));
            menu.append(new MenuItem({
                label: localize(1932, null),
                click: () => { view.webContents.copyImageAt(params.x, params.y); }
            }));
            menu.append(new MenuItem({
                label: localize(1933, null),
                click: () => { clipboard.writeText(params.srcURL); }
            }));
        }
        if (params.isEditable) {
            menu.append(new MenuItem({ role: 'cut', enabled: params.editFlags.canCut }));
            menu.append(new MenuItem({ role: 'copy', enabled: params.editFlags.canCopy }));
            menu.append(new MenuItem({ role: 'paste', enabled: params.editFlags.canPaste }));
            menu.append(new MenuItem({ role: 'pasteAndMatchStyle', enabled: params.editFlags.canPaste }));
            menu.append(new MenuItem({ role: 'selectAll', enabled: params.editFlags.canSelectAll }));
        }
        else if (params.selectionText) {
            menu.append(new MenuItem({ role: 'copy' }));
        }
        // Add navigation items as defaults
        if (menu.items.length === 0) {
            if (webContents.navigationHistory.canGoBack()) {
                menu.append(new MenuItem({
                    label: localize(1934, null),
                    accelerator: this._keybindings[BrowserViewCommandId.GoBack],
                    click: () => webContents.navigationHistory.goBack()
                }));
            }
            if (webContents.navigationHistory.canGoForward()) {
                menu.append(new MenuItem({
                    label: localize(1935, null),
                    accelerator: this._keybindings[BrowserViewCommandId.GoForward],
                    click: () => webContents.navigationHistory.goForward()
                }));
            }
            menu.append(new MenuItem({
                label: localize(1936, null),
                accelerator: this._keybindings[BrowserViewCommandId.Reload],
                click: () => webContents.reload()
            }));
        }
        menu.append(new MenuItem({ type: 'separator' }));
        menu.append(new MenuItem({
            label: localize(1937, null),
            click: () => webContents.inspectElement(params.x, params.y)
        }));
        const viewBounds = view.getWebContentsView().getBounds();
        menu.popup({
            window: win,
            x: viewBounds.x + params.x,
            y: viewBounds.y + params.y,
            sourceType: params.menuSourceType
        });
    }
};
BrowserViewMainService = __decorate([
    __param(0, IEnvironmentMainService),
    __param(1, IInstantiationService),
    __param(2, IWindowsMainService),
    __param(3, IProductService),
    __param(4, ITelemetryService),
    __param(5, INativeHostMainService),
    __param(6, IApplicationStorageMainService)
], BrowserViewMainService);
export { BrowserViewMainService };
//# sourceMappingURL=browserViewMainService.js.map