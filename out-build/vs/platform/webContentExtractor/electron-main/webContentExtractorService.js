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
import { BrowserWindow } from 'electron';
import { Limiter } from '../../../base/common/async.js';
import { ILogService } from '../../log/common/log.js';
import { isURLDomainTrusted } from '../../url/common/trustedDomains.js';
import { WebContentCache } from './webContentCache.js';
import { WebPageLoader } from './webPageLoader.js';
let NativeWebContentExtractorService = class NativeWebContentExtractorService {
    constructor(_logger) {
        this._logger = _logger;
        // Only allow 3 windows to be opened at a time
        // to avoid overwhelming the system with too many processes.
        this._limiter = new Limiter(3);
        this._webContentsCache = new WebContentCache();
    }
    extract(uris, options) {
        if (uris.length === 0) {
            this._logger.info('No URIs provided for extraction');
            return Promise.resolve([]);
        }
        this._logger.info(`Extracting content from ${uris.length} URIs`);
        return Promise.all(uris.map((uri) => this._limiter.queue(() => this.doExtract(uri, options))));
    }
    async doExtract(uri, options) {
        const cached = this._webContentsCache.tryGet(uri, options);
        if (cached !== undefined) {
            this._logger.info(`Found cached content for ${uri.toString()}`);
            return cached;
        }
        const loader = new WebPageLoader((options) => new BrowserWindow(options), this._logger, uri, options, (uri) => isURLDomainTrusted(uri, options?.trustedDomains || []));
        try {
            const result = await loader.load();
            this._webContentsCache.add(uri, options, result);
            return result;
        }
        finally {
            loader.dispose();
        }
    }
};
NativeWebContentExtractorService = __decorate([
    __param(0, ILogService)
], NativeWebContentExtractorService);
export { NativeWebContentExtractorService };
//# sourceMappingURL=webContentExtractorService.js.map