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
import { mainWindow } from '../../../../base/browser/window.js';
import { Codicon } from '../../../../base/common/codicons.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { localize } from '../../../../nls.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { IDialogService } from '../../../../platform/dialogs/common/dialogs.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { IURLService } from '../../../../platform/url/common/url.js';
import { IHostService } from '../../../services/host/browser/host.js';
import { ChatConfiguration } from '../common/constants.js';
import { parseMarketplaceReference, parseMarketplaceReferences } from '../common/plugins/marketplaceReference.js';
import { IPluginInstallService } from '../common/plugins/pluginInstallService.js';
import { decodeBase64 } from '../../../../base/common/buffer.js';
/**
 * Handles `vscode://chat-plugin/install?source=<base64>` and
 * `vscode://chat-plugin/add-marketplace?ref=<base64>` URLs.
 *
 * The `source` / `ref` query parameter is a base64-encoded `owner/repo` or
 * git clone URL. A confirmation dialog is always shown before any action.
 */
let PluginUrlHandler = class PluginUrlHandler extends Disposable {
    static { this.ID = 'workbench.contrib.pluginUrlHandler'; }
    constructor(urlService, _pluginInstallService, _dialogService, _configurationService, _hostService, _logService) {
        super();
        this._pluginInstallService = _pluginInstallService;
        this._dialogService = _dialogService;
        this._configurationService = _configurationService;
        this._hostService = _hostService;
        this._logService = _logService;
        this._register(urlService.registerHandler(this));
    }
    async handleURL(uri) {
        if (uri.authority !== 'chat-plugin') {
            return false;
        }
        switch (uri.path) {
            case '/install':
                return this._handleInstall(uri);
            case '/add-marketplace':
                return this._handleAddMarketplace(uri);
            default:
                return false;
        }
    }
    // --- install a plugin from source ---
    async _handleInstall(uri) {
        const source = this._decodeQueryParam(uri, 'source');
        if (!source) {
            this._logService.warn('[PluginUrlHandler] Missing or invalid "source" query parameter');
            return true;
        }
        const ref = parseMarketplaceReference(source);
        if (!ref) {
            this._logService.warn(`[PluginUrlHandler] Invalid plugin source: ${source}`);
            return true;
        }
        if (ref.kind === "localFileUri" /* MarketplaceReferenceKind.LocalFileUri */) {
            this._logService.warn('[PluginUrlHandler] Local file URIs are not supported for install');
            return true;
        }
        await this._hostService.focus(mainWindow);
        const { confirmed } = await this._dialogService.confirm({
            type: 'question',
            message: localize(7610, null, ref.displayLabel),
            detail: localize(7611, null, ref.rawValue),
            primaryButton: localize(7612, null),
            custom: { icon: Codicon.shield },
        });
        if (!confirmed) {
            return true;
        }
        await this._pluginInstallService.installPluginFromSource(source);
        return true;
    }
    // --- add a marketplace ---
    async _handleAddMarketplace(uri) {
        const refValue = this._decodeQueryParam(uri, 'ref');
        if (!refValue) {
            this._logService.warn('[PluginUrlHandler] Missing or invalid "ref" query parameter');
            return true;
        }
        const ref = parseMarketplaceReference(refValue);
        if (!ref) {
            this._logService.warn(`[PluginUrlHandler] Invalid marketplace reference: ${refValue}`);
            return true;
        }
        await this._hostService.focus(mainWindow);
        const { confirmed } = await this._dialogService.confirm({
            type: 'question',
            message: localize(7613, null, ref.displayLabel),
            detail: localize(7614, null, ref.rawValue),
            primaryButton: localize(7615, null),
            custom: { icon: Codicon.shield },
        });
        if (!confirmed) {
            return true;
        }
        const existing = this._configurationService.getValue(ChatConfiguration.PluginMarketplaces) ?? [];
        const existingRefs = parseMarketplaceReferences(existing);
        if (!existingRefs.some(e => e.canonicalId === ref.canonicalId)) {
            await this._configurationService.updateValue(ChatConfiguration.PluginMarketplaces, [...existing, refValue], 2 /* ConfigurationTarget.USER */);
        }
        return true;
    }
    // --- helpers ---
    /**
     * Reads a query parameter and attempts to parse it as a marketplace
     * reference. Tries base64-decoding first, then falls back to the raw
     * value so that plain-text `owner/repo` values also work in URLs.
     */
    _decodeQueryParam(uri, key) {
        const params = new URLSearchParams(uri.query);
        const raw = params.get(key);
        if (!raw) {
            return undefined;
        }
        // Try base64 first; if the decoded string is a valid reference, use it.
        try {
            const decoded = decodeBase64(raw).toString();
            if (parseMarketplaceReference(decoded)) {
                return decoded;
            }
        }
        catch {
            // not valid base64
        }
        return raw;
    }
};
PluginUrlHandler = __decorate([
    __param(0, IURLService),
    __param(1, IPluginInstallService),
    __param(2, IDialogService),
    __param(3, IConfigurationService),
    __param(4, IHostService),
    __param(5, ILogService)
], PluginUrlHandler);
export { PluginUrlHandler };
//# sourceMappingURL=pluginUrlHandler.js.map