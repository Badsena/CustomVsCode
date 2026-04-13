/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
export function isAutoApproveRule(rule) {
    return !!rule && 'sourceText' in rule;
}
export function isNpmScriptAutoApproveRule(rule) {
    return !!rule && 'type' in rule && rule.type === 'npmScript';
}
//# sourceMappingURL=commandLineAnalyzer.js.map