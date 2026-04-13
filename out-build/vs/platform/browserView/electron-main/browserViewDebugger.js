/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Emitter } from '../../../base/common/event.js';
import { Disposable, DisposableMap } from '../../../base/common/lifecycle.js';
/**
 * Wraps a browser view's Electron debugger with per-client session management.
 *
 * Each client gets their own Electron debugger session, providing true isolation
 * just like connecting multiple DevTools clients to a real Chrome instance.
 */
export class BrowserViewDebugger extends Disposable {
    constructor(view, logService) {
        super();
        this.view = view;
        this.logService = logService;
        /** Map from CDP sessionId to the per-connection event emitter */
        this._sessions = this._register(new DisposableMap());
        this._electronDebugger = view.webContents.debugger;
        // Set up message handler bound to this instance - note the sessionId parameter
        this._messageHandler = (_event, method, params, sessionId) => {
            this.routeCDPEvent(method, params, sessionId);
        };
    }
    /**
     * Attach to this debugger.
     * Creates a dedicated CDP session and returns a connection.
     * Dispose the returned connection to detach.
     */
    async attach() {
        // Ensure initialized
        await this.initialize();
        // Create a dedicated Electron session
        const result = await this._electronDebugger.sendCommand('Target.attachToTarget', {
            targetId: this._realTargetId,
            flatten: true
        });
        const sessionId = result.sessionId;
        const session = new DebugSession(sessionId, this.view, this._electronDebugger);
        this._sessions.set(sessionId, session);
        session.onClose(() => this._sessions.deleteAndDispose(sessionId));
        return session;
    }
    /**
     * Get CDP target info.
     * Initializes the debugger if not already done.
     */
    async getTargetInfo() {
        // Ensure initialized
        await this.initialize();
        const url = this.view.webContents.getURL() || 'about:blank';
        const title = this.view.webContents.getTitle() || url;
        return {
            targetId: this._realTargetId,
            type: 'page',
            title,
            url,
            attached: this._sessions.size > 0,
            canAccessOpener: false,
            browserContextId: this.view.session.id
        };
    }
    /**
     * Initialize the debugger early to discover the real targetId.
     */
    initialize() {
        if (!this._initializePromise) {
            this._initializePromise = (async () => {
                this.attachElectronDebugger();
                await this.discoverRealTargetId();
                if (!this._realTargetId) {
                    this._initializePromise = undefined; // Allow retry on failure
                    throw new Error('Could not discover real targetId for this WebContents');
                }
            })();
        }
        return this._initializePromise;
    }
    /**
     * Discover the real targetId for this WebContents
     */
    async discoverRealTargetId() {
        try {
            const result = await this._electronDebugger.sendCommand('Target.getTargetInfo');
            this._realTargetId = result.targetInfo.targetId;
        }
        catch (error) {
            this.logService.error(`[BrowserViewDebugger] Error discovering real targetId:`, error);
        }
    }
    /**
     * Attach to the Electron debugger
     */
    attachElectronDebugger() {
        if (this._electronDebugger.isAttached()) {
            return;
        }
        this._electronDebugger.attach('1.3');
        this._electronDebugger.on('message', this._messageHandler);
    }
    /**
     * Route a CDP event to the correct connection by sessionId.
     * Fires on the per-connection session for the proxy to handle.
     */
    routeCDPEvent(method, params, sessionId) {
        if (!sessionId) {
            // Events without a sessionId are managed at a higher level, so we can ignore them here.
            return;
        }
        // Find the session for this sessionId and fire the event
        const session = this._sessions.get(sessionId);
        if (session) {
            session.emitEvent({ method, params, sessionId });
        }
    }
    /**
     * Detach from the Electron debugger
     */
    detachElectronDebugger() {
        if (!this._electronDebugger.isAttached()) {
            return;
        }
        this._electronDebugger.removeListener('message', this._messageHandler);
        try {
            this._electronDebugger.detach();
        }
        catch (error) {
            this.logService.error(`[BrowserViewDebugger] Error detaching from WebContents:`, error);
        }
    }
    dispose() {
        this.detachElectronDebugger();
        super.dispose();
    }
}
class DebugSession extends Disposable {
    constructor(sessionId, _view, _electronDebugger) {
        super();
        this.sessionId = sessionId;
        this._view = _view;
        this._electronDebugger = _electronDebugger;
        this._onEvent = this._register(new Emitter());
        this.onEvent = this._onEvent.event;
        this.emitEvent = (event) => this._onEvent.fire(event);
        this._onClose = this._register(new Emitter());
        this.onClose = this._onClose.event;
        this._isDisposed = false;
    }
    async sendCommand(method, params, _sessionId) {
        // This crashes Electron. Don't pass it through.
        if (method === 'Emulation.setDeviceMetricsOverride') {
            return Promise.resolve({});
        }
        const result = await this._electronDebugger.sendCommand(method, params, this.sessionId);
        // Electron overrides dialog behavior in a way that this command does not auto-dismiss the dialog.
        // So we manually emit the (internal) event to dismiss open dialogs when this command is sent.
        if (method === 'Page.handleJavaScriptDialog') {
            this._view.webContents.emit('-cancel-dialogs');
        }
        return result;
    }
    dispose() {
        if (this._isDisposed) {
            return;
        }
        this._isDisposed = true;
        // Detach from the Electron session (fire and forget)
        this._electronDebugger.sendCommand('Target.detachFromTarget', { sessionId: this.sessionId }).catch(() => { });
        this._onClose.fire();
        super.dispose();
    }
}
//# sourceMappingURL=browserViewDebugger.js.map