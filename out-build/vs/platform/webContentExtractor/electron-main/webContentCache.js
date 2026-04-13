/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { LRUCache } from '../../../base/common/map.js';
import { extUriIgnorePathCase } from '../../../base/common/resources.js';
/**
 * A cache for web content extraction results.
 */
export class WebContentCache {
    constructor() {
        this._cache = new LRUCache(WebContentCache.MAX_CACHE_SIZE);
    }
    static { this.MAX_CACHE_SIZE = 1000; }
    static { this.SUCCESS_CACHE_DURATION = 1000 * 60 * 60 * 24; } // 24 hours
    static { this.ERROR_CACHE_DURATION = 1000 * 60 * 5; } // 5 minutes
    /**
     * Add a web content extraction result to the cache.
     */
    add(uri, options, result) {
        let expiration;
        switch (result.status) {
            case 'ok':
            case 'redirect':
                expiration = Date.now() + WebContentCache.SUCCESS_CACHE_DURATION;
                break;
            default:
                expiration = Date.now() + WebContentCache.ERROR_CACHE_DURATION;
                break;
        }
        const key = WebContentCache.getKey(uri, options);
        this._cache.set(key, { result, options, expiration });
    }
    /**
     * Try to get a cached web content extraction result for the given URI and options.
     */
    tryGet(uri, options) {
        const key = WebContentCache.getKey(uri, options);
        const entry = this._cache.get(key);
        if (entry === undefined) {
            return undefined;
        }
        if (entry.expiration < Date.now()) {
            this._cache.delete(key);
            return undefined;
        }
        return entry.result;
    }
    static getKey(uri, options) {
        return `${!!options?.followRedirects}${extUriIgnorePathCase.getComparisonKey(uri)}`;
    }
}
//# sourceMappingURL=webContentCache.js.map