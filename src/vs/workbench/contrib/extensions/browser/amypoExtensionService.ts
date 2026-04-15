/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

const AMYPO_API_URL = 'http://localhost:3000/api/sandbox/extension_details';

let cachedExtensions: string[] | null = null;
let cacheTimestamp: number = 0;
const CACHE_TTL = 30 * 1000; // ✅ 30 seconds only

export class AmypoExtensionService {

    static async getRecommendedExtensions(): Promise<string[]> {
        // ✅ Expire cache after 30 seconds
        const now = Date.now();
        if (cachedExtensions !== null && (now - cacheTimestamp) < CACHE_TTL) {
            return cachedExtensions;
        }

        try {
            console.log('[Amypo] Fetching extensions from server...');

            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 5000);

            const response = await fetch(AMYPO_API_URL, {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' },
                signal: controller.signal
            });

            clearTimeout(timeout);

            if (!response.ok) {
                throw new Error(`Server error: ${response.status}`);
            }

            const data = await response.json();

            if (data.status === 200 && Array.isArray(data.datas)) {
                console.log('[Amypo] Extensions loaded:', data.datas.length);
                cachedExtensions = data.datas;
                cacheTimestamp = Date.now();
                return data.datas;
            }

            throw new Error('Invalid response format');

        } catch (err) {
            console.error('[Amypo] Failed to fetch extensions:', err);
            cachedExtensions = null;
            cacheTimestamp = 0;
            return [];
        }
    }

    static clearCache(): void {
        cachedExtensions = null;
        cacheTimestamp = 0;
        console.log('[Amypo] Extension cache cleared');
    }
}

export function clearAmypoExtensionCache(): void {
    AmypoExtensionService.clearCache();
}
