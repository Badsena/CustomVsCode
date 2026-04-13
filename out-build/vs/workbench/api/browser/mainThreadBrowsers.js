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
import { Disposable, DisposableMap, DisposableStore, toDisposable } from '../../../base/common/lifecycle.js';
import { IEditorService } from '../../services/editor/common/editorService.js';
import { extHostNamedCustomer } from '../../services/extensions/common/extHostCustomers.js';
import { ExtHostContext, MainContext } from '../common/extHost.protocol.js';
import { IBrowserViewCDPService } from '../../contrib/browserView/common/browserView.js';
import { BrowserViewUri } from '../../../platform/browserView/common/browserViewUri.js';
import { generateUuid } from '../../../base/common/uuid.js';
import { columnToEditorGroup } from '../../services/editor/common/editorGroupColumn.js';
import { IEditorGroupsService } from '../../services/editor/common/editorGroupsService.js';
import { IConfigurationService } from '../../../platform/configuration/common/configuration.js';
import { BrowserEditorInput } from '../../contrib/browserView/common/browserEditorInput.js';
let MainThreadBrowsers = class MainThreadBrowsers extends Disposable {
    constructor(extHostContext, editorService, cdpService, editorGroupsService, configurationService) {
        super();
        this.editorService = editorService;
        this.cdpService = cdpService;
        this.editorGroupsService = editorGroupsService;
        this.configurationService = configurationService;
        this._cdpSessions = this._register(new DisposableMap());
        this._knownBrowsers = this._register(new DisposableMap());
        this._proxy = extHostContext.getProxy(ExtHostContext.ExtHostBrowsers);
        // Track open browser editors
        this._register(this.editorService.onWillOpenEditor((e) => {
            if (e.editor instanceof BrowserEditorInput) {
                this._track(e.editor);
            }
        }));
        this._register(this.editorService.onDidCloseEditor(e => {
            if (e.editor instanceof BrowserEditorInput) {
                this._knownBrowsers.deleteAndDispose(e.editor.id);
            }
        }));
        this._register(this.editorService.onDidActiveEditorChange(() => this._syncActiveBrowserTab()));
        // Initial sync
        for (const input of this.editorService.editors) {
            if (input instanceof BrowserEditorInput) {
                this._track(input);
            }
        }
        this._syncActiveBrowserTab();
    }
    // #region Browser tab open
    async $openBrowserTab(url, viewColumn, options) {
        const id = generateUuid();
        const browserUri = BrowserViewUri.forId(id);
        await this.editorService.openEditor({
            resource: browserUri,
            options: { ...options, viewState: { url } }
        }, columnToEditorGroup(this.editorGroupsService, this.configurationService, viewColumn));
        const known = this._knownBrowsers.get(id);
        if (!known) {
            throw new Error('Failed to open browser tab');
        }
        return this._toDto(known.input);
    }
    // #endregion
    // #region Browser tab tracking
    async _syncActiveBrowserTab() {
        const active = this.editorService.activeEditorPane?.input;
        if (active instanceof BrowserEditorInput) {
            this._proxy.$onDidChangeActiveBrowserTab(this._toDto(active));
        }
        else {
            this._proxy.$onDidChangeActiveBrowserTab(undefined);
        }
    }
    _track(input) {
        if (this._knownBrowsers.has(input.id)) {
            return;
        }
        const disposables = new DisposableStore();
        // Track property changes. Currently all the tracked properties are covered under the `onDidChangeLabel` event.
        disposables.add(input.onDidChangeLabel(() => {
            this._proxy.$onDidChangeBrowserTabState(input.id, this._toDto(input));
        }));
        disposables.add(input.onWillDispose(() => {
            this._proxy.$onDidCloseBrowserTab(input.id);
            this._knownBrowsers.deleteAndDispose(input.id);
        }));
        this._knownBrowsers.set(input.id, { input, dispose: () => disposables.dispose() });
        this._proxy.$onDidOpenBrowserTab(this._toDto(input));
    }
    _toDto(input) {
        return {
            id: input.id,
            url: input.url || 'about:blank',
            title: input.getTitle(),
            favicon: input.favicon,
        };
    }
    // #endregion
    // #region CDP session management
    async $startCDPSession(sessionId, browserId) {
        const known = this._knownBrowsers.get(browserId);
        if (!known) {
            throw new Error(`Unknown browser id: ${browserId}`);
        }
        // Before starting a session, resolve the input to ensure the underlying web contents exist and can be attached.
        await known.input.resolve();
        const groupId = await this.cdpService.createSessionGroup(browserId);
        const disposables = new DisposableStore();
        // Wire CDP messages from main process back to ext host
        disposables.add(this.cdpService.onCDPMessage(groupId)(message => {
            this._proxy.$onCDPSessionMessage(sessionId, message);
        }));
        disposables.add(this.cdpService.onDidDestroy(groupId)(() => {
            this._cdpSessions.deleteAndDispose(sessionId);
        }));
        disposables.add(toDisposable(() => {
            this.cdpService.destroySessionGroup(groupId).catch(() => { });
            this._proxy.$onCDPSessionClosed(sessionId);
        }));
        this._cdpSessions.set(sessionId, { groupId, dispose: () => disposables.dispose() });
    }
    async $closeCDPSession(sessionId) {
        this._cdpSessions.deleteAndDispose(sessionId);
    }
    async $sendCDPMessage(sessionId, message) {
        const session = this._cdpSessions.get(sessionId);
        if (session) {
            await this.cdpService.sendCDPMessage(session.groupId, message);
        }
    }
    async $closeBrowserTab(browserId) {
        const known = this._knownBrowsers.get(browserId);
        if (!known) {
            throw new Error(`Unknown browser id: ${browserId}`);
        }
        known.input.dispose();
    }
};
MainThreadBrowsers = __decorate([
    extHostNamedCustomer(MainContext.MainThreadBrowsers),
    __param(1, IEditorService),
    __param(2, IBrowserViewCDPService),
    __param(3, IEditorGroupsService),
    __param(4, IConfigurationService)
], MainThreadBrowsers);
export { MainThreadBrowsers };
//# sourceMappingURL=mainThreadBrowsers.js.map