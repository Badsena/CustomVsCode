/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { AmypoExtensionService } from './amypoExtensionService.js';

/**
 * Curated list of recommended extension IDs for Amypo Coder.
 * Fetched dynamically from the Amypo server API.
 */
export async function getAmypoRecommendedExtensions(): Promise<string[]> {
    return await AmypoExtensionService.getRecommendedExtensions();
}

/**
 * Clears the extension cache, forcing a refresh on the next fetch.
 */
export function clearAmypoExtensionCache(): void {
    AmypoExtensionService.clearCache();
}
