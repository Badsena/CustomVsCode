/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Schemas } from '../../../base/common/network.js';
import { URI } from '../../../base/common/uri.js';
/**
 * Helper for creating and parsing browser view URIs.
 */
export var BrowserViewUri;
(function (BrowserViewUri) {
    BrowserViewUri.scheme = Schemas.vscodeBrowser;
    /**
     * Creates a resource URI for a browser view with the given ID.
     */
    function forId(id) {
        return URI.from({ scheme: BrowserViewUri.scheme, path: `/${id}` });
    }
    BrowserViewUri.forId = forId;
    /**
     * Parses a browser view resource URI to extract the ID.
     */
    function parse(resource) {
        if (resource.scheme !== BrowserViewUri.scheme) {
            return undefined;
        }
        // Remove leading slash if present
        const id = resource.path.startsWith('/') ? resource.path.substring(1) : resource.path;
        if (!id) {
            return undefined;
        }
        return { id };
    }
    BrowserViewUri.parse = parse;
    /**
     * Extracts the ID from a browser view resource URI.
     */
    function getId(resource) {
        return parse(resource)?.id;
    }
    BrowserViewUri.getId = getId;
})(BrowserViewUri || (BrowserViewUri = {}));
//# sourceMappingURL=browserViewUri.js.map