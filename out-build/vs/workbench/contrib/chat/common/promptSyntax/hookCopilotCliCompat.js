/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { HOOKS_BY_TARGET } from './hookTypes.js';
import { Target } from './promptTypes.js';
const COPILOT_CLI_HOOK_TYPE_MAP = HOOKS_BY_TARGET[Target.GitHubCopilot];
/**
 * Cached inverse mapping from HookType to Copilot CLI hook type name.
 * Lazily computed on first access.
 */
let _hookTypeToCopilotCliName;
function getHookTypeToCopilotCliNameMap() {
    if (!_hookTypeToCopilotCliName) {
        _hookTypeToCopilotCliName = new Map();
        for (const [copilotCliName, hookType] of Object.entries(COPILOT_CLI_HOOK_TYPE_MAP)) {
            _hookTypeToCopilotCliName.set(hookType, copilotCliName);
        }
    }
    return _hookTypeToCopilotCliName;
}
/**
 * Resolves a Copilot CLI hook type name to our abstract HookType.
 */
export function resolveCopilotCliHookType(name) {
    return COPILOT_CLI_HOOK_TYPE_MAP[name];
}
/**
 * Gets the Copilot CLI hook type name for a given abstract HookType.
 * Returns undefined if the hook type is not supported in Copilot CLI.
 */
export function getCopilotCliHookTypeName(hookType) {
    return getHookTypeToCopilotCliNameMap().get(hookType);
}
//# sourceMappingURL=hookCopilotCliCompat.js.map