/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { localize } from '../../../../nls.js';
// =============================================================================
// Copilot CLI built-in tool interfaces
//
// The Copilot CLI (via @github/copilot) exposes these built-in tools. Tool names
// and parameter shapes are not typed in the SDK -- they come from the CLI server
// as plain strings. These interfaces are derived from observing the CLI's actual
// tool events and the ShellConfig class in @github/copilot.
//
// Shell tool names follow a pattern per ShellConfig:
//   shellToolName, readShellToolName, writeShellToolName,
//   stopShellToolName, listShellsToolName
// For bash: bash, read_bash, write_bash, bash_shutdown, list_bash
// For powershell: powershell, read_powershell, write_powershell, list_powershell
// =============================================================================
/**
 * Known Copilot CLI tool names. These are the `toolName` values that appear
 * in `tool.execution_start` events from the SDK.
 */
var CopilotToolName;
(function (CopilotToolName) {
    CopilotToolName["Bash"] = "bash";
    CopilotToolName["ReadBash"] = "read_bash";
    CopilotToolName["WriteBash"] = "write_bash";
    CopilotToolName["BashShutdown"] = "bash_shutdown";
    CopilotToolName["ListBash"] = "list_bash";
    CopilotToolName["PowerShell"] = "powershell";
    CopilotToolName["ReadPowerShell"] = "read_powershell";
    CopilotToolName["WritePowerShell"] = "write_powershell";
    CopilotToolName["ListPowerShell"] = "list_powershell";
    CopilotToolName["View"] = "view";
    CopilotToolName["Edit"] = "edit";
    CopilotToolName["Write"] = "write";
    CopilotToolName["Grep"] = "grep";
    CopilotToolName["Glob"] = "glob";
    CopilotToolName["Patch"] = "patch";
    CopilotToolName["WebSearch"] = "web_search";
    CopilotToolName["AskUser"] = "ask_user";
    CopilotToolName["ReportIntent"] = "report_intent";
})(CopilotToolName || (CopilotToolName = {}));
/** Set of tool names that execute shell commands (bash or powershell). */
const SHELL_TOOL_NAMES = new Set([
    "bash" /* CopilotToolName.Bash */,
    "powershell" /* CopilotToolName.PowerShell */,
]);
/**
 * Tools that should not be shown to the user. These are internal tools
 * used by the CLI for its own purposes (e.g., reporting intent to the model).
 */
const HIDDEN_TOOL_NAMES = new Set([
    "report_intent" /* CopilotToolName.ReportIntent */,
]);
/**
 * Returns true if the tool should be hidden from the UI.
 */
export function isHiddenTool(toolName) {
    return HIDDEN_TOOL_NAMES.has(toolName);
}
// =============================================================================
// Display helpers
//
// These functions translate Copilot CLI tool names and arguments into
// human-readable display strings. This logic lives here -- in the agent-host
// process -- so the IPC protocol stays agent-agnostic; the renderer never needs
// to know about specific tool names.
// =============================================================================
function truncate(text, maxLength) {
    return text.length > maxLength ? text.substring(0, maxLength - 3) + '...' : text;
}
export function getToolDisplayName(toolName) {
    switch (toolName) {
        case "bash" /* CopilotToolName.Bash */: return localize(1885, null);
        case "powershell" /* CopilotToolName.PowerShell */: return localize(1886, null);
        case "read_bash" /* CopilotToolName.ReadBash */:
        case "read_powershell" /* CopilotToolName.ReadPowerShell */: return localize(1887, null);
        case "write_bash" /* CopilotToolName.WriteBash */:
        case "write_powershell" /* CopilotToolName.WritePowerShell */: return localize(1888, null);
        case "bash_shutdown" /* CopilotToolName.BashShutdown */: return localize(1889, null);
        case "list_bash" /* CopilotToolName.ListBash */:
        case "list_powershell" /* CopilotToolName.ListPowerShell */: return localize(1890, null);
        case "view" /* CopilotToolName.View */: return localize(1891, null);
        case "edit" /* CopilotToolName.Edit */: return localize(1892, null);
        case "write" /* CopilotToolName.Write */: return localize(1893, null);
        case "grep" /* CopilotToolName.Grep */: return localize(1894, null);
        case "glob" /* CopilotToolName.Glob */: return localize(1895, null);
        case "patch" /* CopilotToolName.Patch */: return localize(1896, null);
        case "web_search" /* CopilotToolName.WebSearch */: return localize(1897, null);
        case "ask_user" /* CopilotToolName.AskUser */: return localize(1898, null);
        default: return toolName;
    }
}
export function getInvocationMessage(toolName, displayName, parameters) {
    if (SHELL_TOOL_NAMES.has(toolName)) {
        const args = parameters;
        if (args?.command) {
            const firstLine = args.command.split('\n')[0];
            return localize(1899, null, truncate(firstLine, 80));
        }
        return localize(1900, null, displayName);
    }
    switch (toolName) {
        case "view" /* CopilotToolName.View */: {
            const args = parameters;
            if (args?.file_path) {
                return localize(1901, null, args.file_path);
            }
            return localize(1902, null);
        }
        case "edit" /* CopilotToolName.Edit */: {
            const args = parameters;
            if (args?.file_path) {
                return localize(1903, null, args.file_path);
            }
            return localize(1904, null);
        }
        case "write" /* CopilotToolName.Write */: {
            const args = parameters;
            if (args?.file_path) {
                return localize(1905, null, args.file_path);
            }
            return localize(1906, null);
        }
        case "grep" /* CopilotToolName.Grep */: {
            const args = parameters;
            if (args?.pattern) {
                return localize(1907, null, truncate(args.pattern, 80));
            }
            return localize(1908, null);
        }
        case "glob" /* CopilotToolName.Glob */: {
            const args = parameters;
            if (args?.pattern) {
                return localize(1909, null, truncate(args.pattern, 80));
            }
            return localize(1910, null);
        }
        default:
            return localize(1911, null, displayName);
    }
}
export function getPastTenseMessage(toolName, displayName, parameters, success) {
    if (!success) {
        return localize(1912, null, displayName);
    }
    if (SHELL_TOOL_NAMES.has(toolName)) {
        const args = parameters;
        if (args?.command) {
            const firstLine = args.command.split('\n')[0];
            return localize(1913, null, truncate(firstLine, 80));
        }
        return localize(1914, null, displayName);
    }
    switch (toolName) {
        case "view" /* CopilotToolName.View */: {
            const args = parameters;
            if (args?.file_path) {
                return localize(1915, null, args.file_path);
            }
            return localize(1916, null);
        }
        case "edit" /* CopilotToolName.Edit */: {
            const args = parameters;
            if (args?.file_path) {
                return localize(1917, null, args.file_path);
            }
            return localize(1918, null);
        }
        case "write" /* CopilotToolName.Write */: {
            const args = parameters;
            if (args?.file_path) {
                return localize(1919, null, args.file_path);
            }
            return localize(1920, null);
        }
        case "grep" /* CopilotToolName.Grep */: {
            const args = parameters;
            if (args?.pattern) {
                return localize(1921, null, truncate(args.pattern, 80));
            }
            return localize(1922, null);
        }
        case "glob" /* CopilotToolName.Glob */: {
            const args = parameters;
            if (args?.pattern) {
                return localize(1923, null, truncate(args.pattern, 80));
            }
            return localize(1924, null);
        }
        default:
            return localize(1925, null, displayName);
    }
}
export function getToolInputString(toolName, parameters, rawArguments) {
    if (!parameters && !rawArguments) {
        return undefined;
    }
    if (SHELL_TOOL_NAMES.has(toolName)) {
        const args = parameters;
        return args?.command ?? rawArguments;
    }
    switch (toolName) {
        case "grep" /* CopilotToolName.Grep */: {
            const args = parameters;
            return args?.pattern ?? rawArguments;
        }
        default:
            // For other tools, show the formatted JSON arguments
            if (parameters) {
                try {
                    return JSON.stringify(parameters, null, 2);
                }
                catch {
                    return rawArguments;
                }
            }
            return rawArguments;
    }
}
/**
 * Returns a rendering hint for the given tool. Currently only 'terminal' is
 * supported, which tells the renderer to display the tool as a terminal command
 * block.
 */
export function getToolKind(toolName) {
    if (SHELL_TOOL_NAMES.has(toolName)) {
        return 'terminal';
    }
    return undefined;
}
/**
 * Returns the shell language identifier for syntax highlighting.
 * Used when creating terminal tool-specific data for the renderer.
 */
export function getShellLanguage(toolName) {
    switch (toolName) {
        case "powershell" /* CopilotToolName.PowerShell */: return 'powershell';
        default: return 'shellscript';
    }
}
//# sourceMappingURL=copilotToolDisplay.js.map