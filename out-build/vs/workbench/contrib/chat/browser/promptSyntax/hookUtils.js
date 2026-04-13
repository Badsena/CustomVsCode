/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { findNodeAtLocation, parse as parseJSONC, parseTree } from '../../../../../base/common/json.js';
import { PromptsType } from '../../common/promptSyntax/promptTypes.js';
import { formatHookCommandLabel } from '../../common/promptSyntax/hookSchema.js';
import { HOOK_METADATA, HookType } from '../../common/promptSyntax/hookTypes.js';
import { parseHooksFromFile, parseHooksIgnoringDisableAll } from '../../common/promptSyntax/hookCompatibility.js';
import * as nls from '../../../../../nls.js';
/**
 * Converts an offset in content to a 1-based line and column.
 */
function offsetToPosition(content, offset) {
    let line = 1;
    let column = 1;
    for (let i = 0; i < offset && i < content.length; i++) {
        if (content[i] === '\n') {
            line++;
            column = 1;
        }
        else {
            column++;
        }
    }
    return { line, column };
}
/**
 * Finds the n-th command field node in a hook type array, handling both simple and nested formats.
 * This iterates through the structure in the same order as the parser flattens hooks.
 */
function findNthCommandNode(tree, hookType, targetIndex, fieldName) {
    const hookTypeArray = findNodeAtLocation(tree, ['hooks', hookType]);
    if (!hookTypeArray || hookTypeArray.type !== 'array' || !hookTypeArray.children) {
        return undefined;
    }
    let currentIndex = 0;
    for (let i = 0; i < hookTypeArray.children.length; i++) {
        const item = hookTypeArray.children[i];
        if (item.type !== 'object') {
            continue;
        }
        // Check if this item has nested hooks (matcher format)
        const nestedHooksNode = findNodeAtLocation(tree, ['hooks', hookType, i, 'hooks']);
        if (nestedHooksNode && nestedHooksNode.type === 'array' && nestedHooksNode.children) {
            // Iterate through nested hooks
            for (let j = 0; j < nestedHooksNode.children.length; j++) {
                if (currentIndex === targetIndex) {
                    return findNodeAtLocation(tree, ['hooks', hookType, i, 'hooks', j, fieldName]);
                }
                currentIndex++;
            }
        }
        else {
            // Simple format - direct command
            if (currentIndex === targetIndex) {
                return findNodeAtLocation(tree, ['hooks', hookType, i, fieldName]);
            }
            currentIndex++;
        }
    }
    return undefined;
}
/**
 * Finds the selection range for a hook command field value in JSON content.
 * Supports both simple format and nested matcher format:
 * - Simple: { hooks: { hookType: [{ command: "..." }] } }
 * - Nested: { hooks: { hookType: [{ matcher: "", hooks: [{ command: "..." }] }] } }
 *
 * The index is a flattened index across all commands in the hook type, regardless of nesting.
 *
 * @param content The JSON file content
 * @param hookType The hook type (e.g., "sessionStart")
 * @param index The flattened index of the hook command within the hook type
 * @param fieldName The field name to find ('command', 'bash', or 'powershell')
 * @returns The selection range for the field value, or undefined if not found
 */
export function findHookCommandSelection(content, hookType, index, fieldName) {
    const tree = parseTree(content);
    if (!tree) {
        return undefined;
    }
    const node = findNthCommandNode(tree, hookType, index, fieldName);
    if (!node || node.type !== 'string') {
        return undefined;
    }
    // Node offset/length includes quotes, so adjust to select only the value content
    const valueStart = node.offset + 1; // After opening quote
    const valueEnd = node.offset + node.length - 1; // Before closing quote
    const start = offsetToPosition(content, valueStart);
    const end = offsetToPosition(content, valueEnd);
    return {
        startLineNumber: start.line,
        startColumn: start.column,
        endLineNumber: end.line,
        endColumn: end.column
    };
}
/**
 * Finds the selection range for a hook command string in a YAML/Markdown file
 * (e.g., an agent `.md` file with YAML frontmatter).
 *
 * Searches for the command text within command field lines and selects the value.
 * Supports all hook command field keys: command, windows, linux, osx, bash, powershell.
 *
 * @param content The full file content
 * @param commandText The command string to locate
 * @returns The selection range, or undefined if not found
 */
export function findHookCommandInYaml(content, commandText) {
    const commandFieldKeys = ['command', 'windows', 'linux', 'osx', 'bash', 'powershell'];
    const lines = content.split('\n');
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const trimmed = line.trimStart();
        // Only match lines whose YAML key is a known command field
        const matchedKey = commandFieldKeys.find(key => trimmed.startsWith(`${key}:`) || trimmed.startsWith(`- ${key}:`));
        if (!matchedKey) {
            continue;
        }
        // Search after the colon to avoid matching within the key name itself
        const colonIdx = line.indexOf(':');
        const idx = line.indexOf(commandText, colonIdx + 1);
        if (idx !== -1) {
            // Verify this is a full match (not a substring of a longer command)
            const afterIdx = idx + commandText.length;
            const charAfter = afterIdx < line.length ? line.charCodeAt(afterIdx) : -1;
            // Accept if what follows is end of line, a quote, or whitespace
            if (charAfter === -1 || charAfter === 34 /* " */ || charAfter === 39 /* ' */ || charAfter === 32 /* space */ || charAfter === 9 /* tab */) {
                return {
                    startLineNumber: i + 1,
                    startColumn: idx + 1,
                    endLineNumber: i + 1,
                    endColumn: idx + 1 + commandText.length
                };
            }
        }
    }
    return undefined;
}
/**
 * Parses all hook files and extracts individual hooks.
 * This is a shared helper used by both the configure action and diagnostics.
 */
export async function parseAllHookFiles(promptsService, fileService, labelService, workspaceRootUri, userHome, os, token, options) {
    const hookFiles = await promptsService.listPromptFiles(PromptsType.hook, token);
    const parsedHooks = [];
    for (const hookFile of hookFiles) {
        try {
            const content = await fileService.readFile(hookFile.uri);
            const json = parseJSONC(content.value.toString());
            // Use format-aware parsing
            const { hooks } = parseHooksFromFile(hookFile.uri, json, workspaceRootUri, userHome);
            for (const [hookType, { hooks: commands, originalId }] of hooks) {
                const hookTypeMeta = HOOK_METADATA[hookType];
                if (!hookTypeMeta) {
                    continue;
                }
                for (let i = 0; i < commands.length; i++) {
                    const command = commands[i];
                    const commandLabel = formatHookCommandLabel(command, os) || nls.localize(7654, null);
                    parsedHooks.push({
                        hookType,
                        hookTypeLabel: hookTypeMeta.label,
                        command,
                        commandLabel,
                        fileUri: hookFile.uri,
                        filePath: labelService.getUriLabel(hookFile.uri, { relative: true }),
                        index: i,
                        originalHookTypeId: originalId
                    });
                }
            }
        }
        catch (error) {
            // Skip files that can't be parsed, but surface the failure for diagnostics
            console.error('Failed to read or parse hook file', hookFile.uri.toString(), error);
        }
    }
    // Parse additional disabled files (e.g., files with disableAllHooks: true)
    // These are parsed ignoring the disableAllHooks flag so we can show their hooks as disabled
    if (options?.additionalDisabledFileUris) {
        for (const uri of options.additionalDisabledFileUris) {
            try {
                const content = await fileService.readFile(uri);
                const json = parseJSONC(content.value.toString());
                // Parse hooks ignoring disableAllHooks - use the underlying format parsers directly
                const { hooks } = parseHooksIgnoringDisableAll(uri, json, workspaceRootUri, userHome);
                for (const [hookType, { hooks: commands, originalId }] of hooks) {
                    const hookTypeMeta = HOOK_METADATA[hookType];
                    if (!hookTypeMeta) {
                        continue;
                    }
                    for (let i = 0; i < commands.length; i++) {
                        const command = commands[i];
                        const commandLabel = formatHookCommandLabel(command, os) || nls.localize(7655, null);
                        parsedHooks.push({
                            hookType,
                            hookTypeLabel: hookTypeMeta.label,
                            command,
                            commandLabel,
                            fileUri: uri,
                            filePath: labelService.getUriLabel(uri, { relative: true }),
                            index: i,
                            originalHookTypeId: originalId,
                            disabled: true
                        });
                    }
                }
            }
            catch (error) {
                console.error('Failed to read or parse disabled hook file', uri.toString(), error);
            }
        }
    }
    // Collect hooks from custom agents' frontmatter
    if (options?.includeAgentHooks) {
        const agents = await promptsService.getCustomAgents(token);
        for (const agent of agents) {
            if (!agent.hooks) {
                continue;
            }
            for (const hookTypeValue of Object.values(HookType)) {
                const commands = agent.hooks[hookTypeValue];
                if (!commands || commands.length === 0) {
                    continue;
                }
                const hookTypeMeta = HOOK_METADATA[hookTypeValue];
                if (!hookTypeMeta) {
                    continue;
                }
                for (let i = 0; i < commands.length; i++) {
                    const command = commands[i];
                    const commandLabel = formatHookCommandLabel(command, os) || nls.localize(7656, null);
                    parsedHooks.push({
                        hookType: hookTypeValue,
                        hookTypeLabel: hookTypeMeta.label,
                        command,
                        commandLabel,
                        fileUri: agent.uri,
                        filePath: labelService.getUriLabel(agent.uri, { relative: true }),
                        index: i,
                        originalHookTypeId: hookTypeValue,
                        agentName: agent.name,
                    });
                }
            }
        }
    }
    return parsedHooks;
}
//# sourceMappingURL=hookUtils.js.map