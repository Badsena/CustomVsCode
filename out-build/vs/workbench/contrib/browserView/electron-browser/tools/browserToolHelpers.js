/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
/**
 * Shared helper for running a Playwright function against a page and returning its result.
 */
export async function playwrightInvokeRaw(playwrightService, pageId, fn, ...args) {
    return playwrightService.invokeFunctionRaw(pageId, fn.toString(), ...args);
}
/**
 * Shared helper for running a Playwright function against a page and returning
 * a tool result. Handles success/error formatting.
 */
export async function playwrightInvoke(playwrightService, pageId, fn, ...args) {
    try {
        const result = await playwrightService.invokeFunction(pageId, fn.toString(), ...args);
        return {
            content: [
                { kind: 'text', value: result.result ? JSON.stringify(result.result) : 'Script executed successfully' },
                { kind: 'text', value: result.summary }
            ]
        };
    }
    catch (e) {
        return errorResult(e instanceof Error ? e.message : String(e));
    }
}
export function errorResult(message) {
    return {
        content: [{ kind: 'text', value: message }],
        toolResultError: message,
    };
}
//# sourceMappingURL=browserToolHelpers.js.map