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
import { WebContentsView, webContents } from 'electron';
import { FileAccess } from '../../../base/common/network.js';
import { Disposable } from '../../../base/common/lifecycle.js';
import { Emitter } from '../../../base/common/event.js';
import { VSBuffer } from '../../../base/common/buffer.js';
import { BrowserNewPageLocation, browserViewIsolatedWorldId, browserZoomFactors, browserZoomDefaultIndex } from '../common/browserView.js';
import { EVENT_KEY_CODE_MAP, SCAN_CODE_STR_TO_EVENT_KEY_CODE } from '../../../base/common/keyCodes.js';
import { IWindowsMainService } from '../../windows/electron-main/windows.js';
import { IAuxiliaryWindowsMainService } from '../../auxiliaryWindow/electron-main/auxiliaryWindows.js';
import { isMacintosh } from '../../../base/common/platform.js';
import { BrowserViewUri } from '../common/browserViewUri.js';
import { BrowserViewDebugger } from './browserViewDebugger.js';
import { ILogService } from '../../log/common/log.js';
import { hasKey } from '../../../base/common/types.js';
/** Key combinations that are used in system-level shortcuts. */
const nativeShortcuts = new Set([
    2048 /* KeyMod.CtrlCmd */ | 31 /* KeyCode.KeyA */,
    2048 /* KeyMod.CtrlCmd */ | 33 /* KeyCode.KeyC */,
    2048 /* KeyMod.CtrlCmd */ | 52 /* KeyCode.KeyV */,
    2048 /* KeyMod.CtrlCmd */ | 1024 /* KeyMod.Shift */ | 52 /* KeyCode.KeyV */,
    2048 /* KeyMod.CtrlCmd */ | 54 /* KeyCode.KeyX */,
    ...(isMacintosh ? [] : [2048 /* KeyMod.CtrlCmd */ | 55 /* KeyCode.KeyY */]),
    2048 /* KeyMod.CtrlCmd */ | 56 /* KeyCode.KeyZ */,
    2048 /* KeyMod.CtrlCmd */ | 1024 /* KeyMod.Shift */ | 56 /* KeyCode.KeyZ */
]);
/**
 * Represents a single browser view instance with its WebContentsView and all associated logic.
 * This class encapsulates all operations and events for a single browser view.
 */
let BrowserView = class BrowserView extends Disposable {
    constructor(id, session, createChildView, openContextMenu, options, windowsMainService, auxiliaryWindowsMainService, logService) {
        super();
        this.id = id;
        this.session = session;
        this.windowsMainService = windowsMainService;
        this.auxiliaryWindowsMainService = auxiliaryWindowsMainService;
        this.logService = logService;
        this._faviconRequestCache = new Map();
        this._lastScreenshot = undefined;
        this._lastFavicon = undefined;
        this._lastError = undefined;
        this._lastUserGestureTimestamp = -Infinity;
        this._browserZoomIndex = browserZoomDefaultIndex;
        this._isSendingKeyEvent = false;
        this._isDisposed = false;
        this._onDidNavigate = this._register(new Emitter());
        this.onDidNavigate = this._onDidNavigate.event;
        this._onDidChangeLoadingState = this._register(new Emitter());
        this.onDidChangeLoadingState = this._onDidChangeLoadingState.event;
        this._onDidChangeFocus = this._register(new Emitter());
        this.onDidChangeFocus = this._onDidChangeFocus.event;
        this._onDidChangeVisibility = this._register(new Emitter());
        this.onDidChangeVisibility = this._onDidChangeVisibility.event;
        this._onDidChangeDevToolsState = this._register(new Emitter());
        this.onDidChangeDevToolsState = this._onDidChangeDevToolsState.event;
        this._onDidKeyCommand = this._register(new Emitter());
        this.onDidKeyCommand = this._onDidKeyCommand.event;
        this._onDidChangeTitle = this._register(new Emitter());
        this.onDidChangeTitle = this._onDidChangeTitle.event;
        this._onDidChangeFavicon = this._register(new Emitter());
        this.onDidChangeFavicon = this._onDidChangeFavicon.event;
        this._onDidRequestNewPage = this._register(new Emitter());
        this.onDidRequestNewPage = this._onDidRequestNewPage.event;
        this._onDidFindInPage = this._register(new Emitter());
        this.onDidFindInPage = this._onDidFindInPage.event;
        this._onDidClose = this._register(new Emitter());
        this.onDidClose = this._onDidClose.event;
        const webPreferences = {
            ...options?.webPreferences,
            nodeIntegration: false,
            contextIsolation: true,
            sandbox: true,
            webviewTag: false,
            session: this.session.electronSession,
            preload: FileAccess.asFileUri('vs/platform/browserView/electron-browser/preload-browserView.js').fsPath,
            // TODO@kycutler: Remove this once https://github.com/electron/electron/issues/42578 is fixed
            type: 'browserView'
        };
        this._view = new WebContentsView({
            webPreferences,
            // Passing an `undefined` webContents triggers an error in Electron.
            ...(options?.webContents ? { webContents: options.webContents } : {})
        });
        this._view.setBackgroundColor('#FFFFFF');
        this._view.webContents.setWindowOpenHandler((details) => {
            const location = (() => {
                switch (details.disposition) {
                    case 'background-tab': return BrowserNewPageLocation.Background;
                    case 'foreground-tab': return BrowserNewPageLocation.Foreground;
                    case 'new-window': return BrowserNewPageLocation.NewWindow;
                    default: return undefined;
                }
            })();
            if (!location || !this.consumePopupPermission(location)) {
                // Eventually we may want to surface this. For now, just silently block it.
                return { action: 'deny' };
            }
            return {
                action: 'allow',
                createWindow: (options) => {
                    const childView = createChildView(options);
                    const resource = BrowserViewUri.forId(childView.id);
                    // Fire event for the workbench to open this view
                    this._onDidRequestNewPage.fire({
                        resource,
                        url: details.url,
                        location,
                        position: { x: options.x, y: options.y, width: options.width, height: options.height }
                    });
                    // Return the webContents so Electron can complete the window.open() call
                    return childView.webContents;
                }
            };
        });
        this._view.webContents.on('context-menu', (_event, params) => {
            openContextMenu(this, params);
        });
        this._view.webContents.on('destroyed', () => {
            this.dispose();
        });
        this._debugger = new BrowserViewDebugger(this, this.logService);
        this.setupEventListeners();
    }
    setupEventListeners() {
        const webContents = this._view.webContents;
        // DevTools state events
        webContents.on('devtools-opened', () => {
            this._onDidChangeDevToolsState.fire({ isDevToolsOpen: true });
        });
        webContents.on('devtools-closed', () => {
            this._onDidChangeDevToolsState.fire({ isDevToolsOpen: false });
        });
        // Favicon events
        webContents.on('page-favicon-updated', async (_event, favicons) => {
            // try each url in order until one works
            for (const url of favicons) {
                if (!this._faviconRequestCache.has(url)) {
                    this._faviconRequestCache.set(url, (async () => {
                        const response = await webContents.session.fetch(url, {
                            cache: 'force-cache'
                        });
                        if (!response.ok) {
                            throw new Error(`Failed to fetch favicon: ${response.status} ${response.statusText}`);
                        }
                        const type = await response.headers.get('content-type');
                        const buffer = await response.arrayBuffer();
                        return `data:${type};base64,${Buffer.from(buffer).toString('base64')}`;
                    })());
                }
                try {
                    this._lastFavicon = await this._faviconRequestCache.get(url);
                    this._onDidChangeFavicon.fire({ favicon: this._lastFavicon });
                    // On success, stop searching
                    return;
                }
                catch (e) {
                    // On failure, just try the next one
                }
            }
            // If we searched all favicons and none worked, clear the favicon
            if (this._lastFavicon) {
                this._lastFavicon = undefined;
                this._onDidChangeFavicon.fire({ favicon: this._lastFavicon });
            }
        });
        // Title events
        webContents.on('page-title-updated', (_event, title) => {
            this._onDidChangeTitle.fire({ title });
        });
        const fireNavigationEvent = () => {
            const url = webContents.getURL();
            this._onDidNavigate.fire({
                url,
                title: webContents.getTitle(),
                canGoBack: webContents.navigationHistory.canGoBack(),
                canGoForward: webContents.navigationHistory.canGoForward(),
                certificateError: this.session.trust.getCertificateError(url)
            });
        };
        const fireLoadingEvent = (loading) => {
            this._onDidChangeLoadingState.fire({ loading, error: this._lastError });
        };
        // Loading state events
        webContents.on('did-start-loading', () => {
            this._lastError = undefined;
            fireLoadingEvent(true);
        });
        webContents.on('did-stop-loading', () => fireLoadingEvent(false));
        webContents.on('did-fail-load', (e, errorCode, errorDescription, validatedURL, isMainFrame) => {
            if (isMainFrame) {
                // Ignore ERR_ABORTED (-3) which is the expected error when user stops a page load.
                if (errorCode === -3) {
                    fireLoadingEvent(false);
                    return;
                }
                this._lastError = {
                    url: validatedURL,
                    errorCode,
                    errorDescription,
                    // -200 - -220 are the range of certificate errors in Chromium.
                    certificateError: errorCode <= -200 && errorCode >= -220 ? this.session.trust.getCertificateError(validatedURL) : undefined
                };
                fireLoadingEvent(false);
                this._onDidNavigate.fire({
                    url: validatedURL,
                    title: '',
                    canGoBack: webContents.navigationHistory.canGoBack(),
                    canGoForward: webContents.navigationHistory.canGoForward(),
                    certificateError: this.session.trust.getCertificateError(validatedURL)
                });
            }
        });
        webContents.on('did-finish-load', () => fireLoadingEvent(false));
        this.session.trust.installCertErrorHandler(webContents);
        webContents.on('render-process-gone', (_event, details) => {
            this._lastError = {
                url: webContents.getURL(),
                errorCode: details.exitCode,
                errorDescription: `Render process gone: ${details.reason}`
            };
            fireLoadingEvent(false);
        });
        // Navigation events (when URL actually changes)
        webContents.on('did-navigate', fireNavigationEvent);
        webContents.on('did-navigate-in-page', fireNavigationEvent);
        // Chromium resets the zoom factor to its per-origin default (100%) when
        // navigating to a new document. Re-apply our stored zoom to override it.
        webContents.on('did-navigate', () => {
            this._view.webContents.setZoomFactor(browserZoomFactors[this._browserZoomIndex]);
        });
        // Focus events
        webContents.on('focus', () => {
            this._onDidChangeFocus.fire({ focused: true });
        });
        webContents.on('blur', () => {
            this._onDidChangeFocus.fire({ focused: false });
        });
        // Key down events - listen for raw key input events
        webContents.on('before-input-event', async (event, input) => {
            if (input.type === 'keyDown' && !this._isSendingKeyEvent) {
                if (this.tryHandleCommand(input)) {
                    event.preventDefault();
                }
            }
        });
        // Track user gestures for popup blocking logic.
        // Roughly based on https://html.spec.whatwg.org/multipage/interaction.html#tracking-user-activation.
        webContents.on('input-event', (_event, input) => {
            switch (input.type) {
                case 'rawKeyDown':
                case 'keyDown':
                case 'mouseDown':
                case 'pointerDown':
                case 'pointerUp':
                case 'touchEnd':
                    this._lastUserGestureTimestamp = Date.now();
            }
        });
        // For now, always prevent sites from blocking unload.
        // In the future we may want to show a dialog to ask the user,
        // with heavy restrictions regarding interaction and repeated prompts.
        webContents.on('will-prevent-unload', (e) => {
            e.preventDefault();
        });
        // Find in page events
        webContents.on('found-in-page', (_event, result) => {
            this._onDidFindInPage.fire({
                activeMatchOrdinal: result.activeMatchOrdinal,
                matches: result.matches,
                selectionArea: result.selectionArea,
                finalUpdate: result.finalUpdate
            });
        });
    }
    consumePopupPermission(location) {
        switch (location) {
            case BrowserNewPageLocation.Foreground:
            case BrowserNewPageLocation.Background:
                return true;
            case BrowserNewPageLocation.NewWindow:
                // Each user gesture allows one popup window within 1 second
                if (this._lastUserGestureTimestamp > Date.now() - 1000) {
                    this._lastUserGestureTimestamp = -Infinity;
                    return true;
                }
                return false;
        }
    }
    get webContents() {
        return this._view.webContents;
    }
    /**
     * Get the current state of this browser view
     */
    getState() {
        const webContents = this._view.webContents;
        const url = webContents.getURL();
        return {
            url,
            title: webContents.getTitle(),
            canGoBack: webContents.navigationHistory.canGoBack(),
            canGoForward: webContents.navigationHistory.canGoForward(),
            loading: webContents.isLoading(),
            focused: webContents.isFocused(),
            visible: this._view.getVisible(),
            isDevToolsOpen: webContents.isDevToolsOpened(),
            lastScreenshot: this._lastScreenshot,
            lastFavicon: this._lastFavicon,
            lastError: this._lastError,
            certificateError: this.session.trust.getCertificateError(url),
            storageScope: this.session.storageScope,
            browserZoomIndex: this._browserZoomIndex
        };
    }
    /**
     * Toggle developer tools for this browser view.
     */
    toggleDevTools() {
        this._view.webContents.toggleDevTools();
    }
    /**
     * Update the layout bounds of this view
     */
    layout(bounds) {
        if (this._window?.win?.id !== bounds.windowId) {
            const newWindow = this._windowById(bounds.windowId);
            if (newWindow) {
                this._window?.win?.contentView.removeChildView(this._view);
                this._window = newWindow;
                newWindow.win?.contentView.addChildView(this._view);
            }
        }
        this._view.setBorderRadius(Math.round(bounds.cornerRadius * bounds.zoomFactor));
        this._view.setBounds({
            x: Math.round(bounds.x * bounds.zoomFactor),
            y: Math.round(bounds.y * bounds.zoomFactor),
            width: Math.round(bounds.width * bounds.zoomFactor),
            height: Math.round(bounds.height * bounds.zoomFactor)
        });
    }
    setBrowserZoomIndex(zoomIndex) {
        this._browserZoomIndex = Math.max(0, Math.min(zoomIndex, browserZoomFactors.length - 1));
        const browserZoomFactor = browserZoomFactors[this._browserZoomIndex];
        this._view.webContents.setZoomFactor(browserZoomFactor);
    }
    /**
     * Set the visibility of this view
     */
    setVisible(visible) {
        if (this._view.getVisible() === visible) {
            return;
        }
        // If the view is focused, pass focus back to the window when hiding
        if (!visible && this._view.webContents.isFocused()) {
            this._window?.win?.webContents.focus();
        }
        this._view.setVisible(visible);
        this._onDidChangeVisibility.fire({ visible });
    }
    /**
     * Load a URL in this view
     */
    async loadURL(url) {
        await this._view.webContents.loadURL(url);
    }
    /**
     * Get the current URL
     */
    getURL() {
        return this._view.webContents.getURL();
    }
    /**
     * Navigate back in history
     */
    goBack() {
        if (this._view.webContents.navigationHistory.canGoBack()) {
            this._view.webContents.navigationHistory.goBack();
        }
    }
    /**
     * Navigate forward in history
     */
    goForward() {
        if (this._view.webContents.navigationHistory.canGoForward()) {
            this._view.webContents.navigationHistory.goForward();
        }
    }
    /**
     * Reload the current page
     */
    reload(hard) {
        if (hard) {
            this._view.webContents.reloadIgnoringCache();
        }
        else {
            this._view.webContents.reload();
        }
    }
    /**
     * Check if the view can navigate back
     */
    canGoBack() {
        return this._view.webContents.navigationHistory.canGoBack();
    }
    /**
     * Check if the view can navigate forward
     */
    canGoForward() {
        return this._view.webContents.navigationHistory.canGoForward();
    }
    /**
     * Capture a screenshot of this view
     */
    async captureScreenshot(options) {
        const quality = options?.quality ?? 80;
        const image = await this._view.webContents.capturePage(options?.rect, {
            stayHidden: true
        });
        const buffer = image.toJPEG(quality);
        const screenshot = VSBuffer.wrap(buffer);
        // Only update _lastScreenshot if capturing the full view
        if (!options?.rect) {
            this._lastScreenshot = screenshot;
        }
        return screenshot;
    }
    /**
     * Dispatch a keyboard event to this view
     */
    async dispatchKeyEvent(keyEvent) {
        const event = {
            type: 'keyDown',
            keyCode: keyEvent.key,
            modifiers: []
        };
        if (keyEvent.ctrlKey) {
            event.modifiers.push('control');
        }
        if (keyEvent.shiftKey) {
            event.modifiers.push('shift');
        }
        if (keyEvent.altKey) {
            event.modifiers.push('alt');
        }
        if (keyEvent.metaKey) {
            event.modifiers.push('meta');
        }
        this._isSendingKeyEvent = true;
        try {
            await this._view.webContents.sendInputEvent(event);
        }
        finally {
            this._isSendingKeyEvent = false;
        }
    }
    /**
     * Focus this view
     */
    async focus() {
        this._view.webContents.focus();
    }
    /**
     * Find text in the page
     */
    async findInPage(text, options) {
        this._view.webContents.findInPage(text, {
            matchCase: options?.matchCase ?? false,
            forward: options?.forward ?? true,
            // `findNext` is not very clearly named. From Electron docs: `Whether to begin a new text finding session with this request`.
            // It needs to be set to `true` if we want a new search to be performed, such as when the text changes.
            // We name it `recompute` in our internal options to better reflect its purpose / behavior.
            findNext: options?.recompute ?? false
        });
    }
    /**
     * Stop finding in page
     */
    async stopFindInPage(keepSelection) {
        this._view.webContents.stopFindInPage(keepSelection ? 'keepSelection' : 'clearSelection');
    }
    /**
     * Get the currently selected text in the browser view.
     * Returns immediately with empty string if the page is still loading.
     */
    async getSelectedText() {
        // we don't want to wait for the page to finish loading, which executeJavaScript normally does.
        if (this._view.webContents.isLoading()) {
            return '';
        }
        try {
            // Uses our preloaded contextBridge-exposed API.
            return await this._view.webContents.executeJavaScriptInIsolatedWorld(browserViewIsolatedWorldId, [{ code: 'window.browserViewAPI?.getSelectedText?.() ?? ""' }]);
        }
        catch {
            return '';
        }
    }
    /**
     * Clear all storage data for this browser view's session
     */
    async clearStorage() {
        await this.session.clearData();
    }
    /**
     * Trust a certificate for a given host and reload the page.
     */
    async trustCertificate(host, fingerprint) {
        await this.session.trust.trustCertificate(host, fingerprint);
        this._view.webContents.reload();
    }
    /**
     * Revoke trust for a previously trusted certificate and close the view.
     */
    async untrustCertificate(host, fingerprint) {
        await this.session.trust.untrustCertificate(host, fingerprint);
        this.dispose();
    }
    /**
     * Get the underlying WebContentsView
     */
    getWebContentsView() {
        return this._view;
    }
    /**
     * Get the hosting Electron window for this view, if any.
     * This can be an auxiliary window, depending on where the view is currently hosted.
     */
    getElectronWindow() {
        return this._window?.win ?? undefined;
    }
    /**
     * Get the main code window hosting this browser view, if any. This is used for routing commands from the browser view to the correct window.
     * If the browser view is hosted in an auxiliary window, this will return the parent code window of that auxiliary window.
     */
    getTopCodeWindow() {
        return this._window && hasKey(this._window, { parentId: true }) ? this._codeWindowById(this._window.parentId) : undefined;
    }
    // ============ ICDPTarget implementation ============
    /**
     * Get CDP target info using Electron's real targetId.
     */
    getTargetInfo() {
        return this._debugger.getTargetInfo();
    }
    /**
     * Attach to receive debugger events.
     * @returns A connection that can be disposed to detach
     */
    attach() {
        return this._debugger.attach();
    }
    dispose() {
        if (this._isDisposed) {
            return;
        }
        this._isDisposed = true;
        // Dispose debugger. This detaches debug sessions first.
        this._debugger.dispose();
        // Remove from parent window
        this._window?.win?.contentView.removeChildView(this._view);
        // Fire close event BEFORE disposing emitters. This signals the view has been destroyed.
        this._onDidClose.fire();
        // Clean up the view and all its event listeners
        if (!this._view.webContents.isDestroyed()) {
            this._view.webContents.close({ waitForBeforeUnload: false });
        }
        super.dispose();
    }
    /**
     * Potentially handle an input event as a VS Code command.
     * Returns `true` if the event was forwarded to VS Code and should not be handled natively.
     */
    tryHandleCommand(input) {
        const eventKeyCode = SCAN_CODE_STR_TO_EVENT_KEY_CODE[input.code] || 0;
        const keyCode = EVENT_KEY_CODE_MAP[eventKeyCode] || 0 /* KeyCode.Unknown */;
        const isArrowKey = keyCode >= 15 /* KeyCode.LeftArrow */ && keyCode <= 18 /* KeyCode.DownArrow */;
        const isNonEditingKey = keyCode === 3 /* KeyCode.Enter */ ||
            keyCode === 9 /* KeyCode.Escape */ ||
            keyCode >= 59 /* KeyCode.F1 */ && keyCode <= 82 /* KeyCode.F24 */ ||
            keyCode >= 117 /* KeyCode.AudioVolumeMute */;
        // Ignore most Alt-only inputs (often used for accented characters or menu accelerators)
        const isAltOnlyInput = input.alt && !input.control && !input.meta;
        if (isAltOnlyInput && !isNonEditingKey && !isArrowKey) {
            return false;
        }
        // Only reroute if there's a command modifier or it's a non-editing key
        const hasCommandModifier = input.control || input.alt || input.meta;
        if (!hasCommandModifier && !isNonEditingKey) {
            return false;
        }
        // Ignore Ctrl/Cmd + [A,C,V,X,Z] shortcuts to allow native handling (e.g. copy/paste)
        const isControlInput = isMacintosh ? input.meta : input.control;
        const modifiedKeyCode = keyCode |
            (isControlInput ? 2048 /* KeyMod.CtrlCmd */ : 0) |
            (input.shift ? 1024 /* KeyMod.Shift */ : 0) |
            (input.alt ? 512 /* KeyMod.Alt */ : 0);
        if (nativeShortcuts.has(modifiedKeyCode)) {
            return false;
        }
        this._onDidKeyCommand.fire({
            key: input.key,
            keyCode: eventKeyCode,
            code: input.code,
            ctrlKey: input.control || false,
            shiftKey: input.shift || false,
            altKey: input.alt || false,
            metaKey: input.meta || false,
            repeat: input.isAutoRepeat || false
        });
        return true;
    }
    _windowById(windowId) {
        return this._codeWindowById(windowId) ?? this._auxiliaryWindowById(windowId);
    }
    _codeWindowById(windowId) {
        if (typeof windowId !== 'number') {
            return undefined;
        }
        return this.windowsMainService.getWindowById(windowId);
    }
    _auxiliaryWindowById(windowId) {
        if (typeof windowId !== 'number') {
            return undefined;
        }
        const contents = webContents.fromId(windowId);
        if (!contents) {
            return undefined;
        }
        return this.auxiliaryWindowsMainService.getWindowByWebContents(contents);
    }
};
BrowserView = __decorate([
    __param(5, IWindowsMainService),
    __param(6, IAuxiliaryWindowsMainService),
    __param(7, ILogService)
], BrowserView);
export { BrowserView };
//# sourceMappingURL=browserView.js.map