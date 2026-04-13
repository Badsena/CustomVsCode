/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { basename, dirname } from '../../../../../base/common/path.js';
import { toHookType } from './hookSchema.js';
import { parseClaudeHooks, extractHookCommandsFromItem } from './hookClaudeCompat.js';
import { resolveCopilotCliHookType } from './hookCopilotCliCompat.js';
/**
 * Supported hook file formats.
 */
export var HookSourceFormat;
(function (HookSourceFormat) {
    /** GitHub Copilot hooks .json format */
    HookSourceFormat["Copilot"] = "copilot";
    /** Claude settings.json / settings.local.json format */
    HookSourceFormat["Claude"] = "claude";
})(HookSourceFormat || (HookSourceFormat = {}));
/**
 * Determines the hook source format based on the file URI.
 */
export function getHookSourceFormat(fileUri) {
    const filename = basename(fileUri.path).toLowerCase();
    const dir = dirname(fileUri.path);
    // Claude format: .claude/settings.json or .claude/settings.local.json
    if ((filename === 'settings.json' || filename === 'settings.local.json') && dir.endsWith('.claude')) {
        return HookSourceFormat.Claude;
    }
    // Default to Copilot format
    return HookSourceFormat.Copilot;
}
/**
 * Checks if a file is read-only based on its source format.
 * Claude settings files should be read-only from our perspective since they have a different format.
 */
export function isReadOnlyHookSource(format) {
    return format === HookSourceFormat.Claude;
}
/**
 * Parses hooks from a Copilot hooks .json file (our native format).
 */
export function parseCopilotHooks(json, workspaceRootUri, userHome) {
    const result = new Map();
    if (!json || typeof json !== 'object') {
        return result;
    }
    const root = json;
    const hooks = root.hooks;
    if (!hooks || typeof hooks !== 'object') {
        return result;
    }
    const hooksObj = hooks;
    for (const originalId of Object.keys(hooksObj)) {
        const hookType = resolveCopilotCliHookType(originalId) ?? toHookType(originalId);
        if (!hookType) {
            continue;
        }
        const hookArray = hooksObj[originalId];
        if (!Array.isArray(hookArray)) {
            continue;
        }
        const commands = [];
        for (const item of hookArray) {
            // Use helper that handles both direct commands and Claude-style nested matcher structures
            const extracted = extractHookCommandsFromItem(item, workspaceRootUri, userHome);
            commands.push(...extracted);
        }
        if (commands.length > 0) {
            result.set(hookType, { hooks: commands, originalId });
        }
    }
    return result;
}
/**
 * Parses hooks from any supported format, auto-detecting the format from the file URI.
 */
export function parseHooksFromFile(fileUri, json, workspaceRootUri, userHome) {
    const format = getHookSourceFormat(fileUri);
    let hooks;
    let disabledAllHooks = false;
    switch (format) {
        case HookSourceFormat.Claude: {
            const result = parseClaudeHooks(json, workspaceRootUri, userHome);
            hooks = result.hooks;
            disabledAllHooks = result.disabledAllHooks;
            break;
        }
        case HookSourceFormat.Copilot:
        default:
            hooks = parseCopilotHooks(json, workspaceRootUri, userHome);
            break;
    }
    return { format, hooks, disabledAllHooks };
}
/**
 * Parses hooks from a file, ignoring the `disableAllHooks` flag.
 * Used by diagnostics to show which hooks are hidden when `disableAllHooks: true` is set.
 */
export function parseHooksIgnoringDisableAll(fileUri, json, workspaceRootUri, userHome) {
    const format = getHookSourceFormat(fileUri);
    let hooks;
    switch (format) {
        case HookSourceFormat.Claude: {
            // Strip `disableAllHooks` before parsing so the hooks are still extracted
            if (json && typeof json === 'object') {
                const { disableAllHooks: _, ...rest } = json;
                const result = parseClaudeHooks(rest, workspaceRootUri, userHome);
                hooks = result.hooks;
            }
            else {
                hooks = new Map();
            }
            break;
        }
        case HookSourceFormat.Copilot:
        default:
            hooks = parseCopilotHooks(json, workspaceRootUri, userHome);
            break;
    }
    return { format, hooks, disabledAllHooks: true };
}
/**
 * Gets a human-readable label for a hook source format.
 */
export function getHookSourceFormatLabel(format) {
    switch (format) {
        case HookSourceFormat.Claude:
            return 'Claude';
        case HookSourceFormat.Copilot:
            return 'GitHub Copilot';
    }
}
/**
 * Builds a new hook entry object in the appropriate format for the given source format.
 * - Copilot format: `{ type: 'command', command: '' }`
 * - Claude format: `{ matcher: '', hooks: [{ type: 'command', command: '' }] }`
 */
export function buildNewHookEntry(format) {
    const commandEntry = { type: 'command', command: '' };
    if (format === HookSourceFormat.Claude) {
        return { matcher: '', hooks: [commandEntry] };
    }
    return commandEntry;
}
//# sourceMappingURL=hookCompatibility.js.map