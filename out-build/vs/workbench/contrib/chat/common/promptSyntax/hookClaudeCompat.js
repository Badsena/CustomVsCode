/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { toHookType, extractHookCommandsFromItem } from './hookSchema.js';
import { HOOKS_BY_TARGET } from './hookTypes.js';
import { Target } from './promptTypes.js';
export { extractHookCommandsFromItem };
/**
 * Cached inverse mapping from HookType to Claude hook type name.
 * Lazily computed on first access.
 */
let _hookTypeToClaudeName;
function getHookTypeToClaudeNameMap() {
    if (!_hookTypeToClaudeName) {
        _hookTypeToClaudeName = new Map();
        for (const [claudeName, hookType] of Object.entries(HOOKS_BY_TARGET[Target.Claude])) {
            _hookTypeToClaudeName.set(hookType, claudeName);
        }
    }
    return _hookTypeToClaudeName;
}
/**
 * Resolves a Claude hook type name to our abstract HookType.
 */
export function resolveClaudeHookType(name) {
    return HOOKS_BY_TARGET[Target.Claude][name];
}
/**
 * Gets the Claude hook type name for a given abstract HookType.
 * Returns undefined if the hook type is not supported in Claude.
 */
export function getClaudeHookTypeName(hookType) {
    return getHookTypeToClaudeNameMap().get(hookType);
}
/**
 * Parses hooks from a Claude settings.json file.
 * Claude format:
 * {
 *   "hooks": {
 *     "PreToolUse": [
 *       { "matcher": "Bash", "hooks": [{ "type": "command", "command": "..." }] }
 *     ]
 *   }
 * }
 *
 * Or simpler format:
 * {
 *   "hooks": {
 *     "PreToolUse": [{ "type": "command", "command": "..." }]
 *   }
 * }
 *
 * If the file has `disableAllHooks: true` at the top level, all hooks are filtered out.
 */
export function parseClaudeHooks(json, workspaceRootUri, userHome) {
    const result = new Map();
    if (!json || typeof json !== 'object') {
        return { hooks: result, disabledAllHooks: false };
    }
    const root = json;
    // Check for disableAllHooks property at the top level
    if (root.disableAllHooks === true) {
        return { hooks: result, disabledAllHooks: true };
    }
    const hooks = root.hooks;
    if (!hooks || typeof hooks !== 'object') {
        return { hooks: result, disabledAllHooks: false };
    }
    const hooksObj = hooks;
    for (const originalId of Object.keys(hooksObj)) {
        // Resolve Claude hook type name to our canonical HookType
        const hookType = resolveClaudeHookType(originalId) ?? toHookType(originalId);
        if (!hookType) {
            continue;
        }
        const hookArray = hooksObj[originalId];
        if (!Array.isArray(hookArray)) {
            continue;
        }
        const commands = [];
        for (const item of hookArray) {
            // Use shared helper that handles both direct commands and nested matcher structures
            const extracted = extractHookCommandsFromItem(item, workspaceRootUri, userHome);
            commands.push(...extracted);
        }
        if (commands.length > 0) {
            const existing = result.get(hookType);
            if (existing) {
                existing.hooks.push(...commands);
            }
            else {
                result.set(hookType, { hooks: commands, originalId });
            }
        }
    }
    return { hooks: result, disabledAllHooks: false };
}
//# sourceMappingURL=hookClaudeCompat.js.map