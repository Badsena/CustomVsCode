/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
// Re-export reducers from the protocol layer
export { rootReducer, sessionReducer, softAssertNever, isClientDispatchable } from './protocol/reducers.js';
// ---- Tool call metadata helpers (VS Code extensions via _meta) --------------
/**
 * Extracts the VS Code-specific `toolKind` rendering hint from a tool call's `_meta`.
 */
export function getToolKind(tc) {
    return tc._meta?.toolKind;
}
/**
 * Extracts the VS Code-specific `language` hint from a tool call's `_meta`.
 */
export function getToolLanguage(tc) {
    return tc._meta?.language;
}
//# sourceMappingURL=sessionReducers.js.map