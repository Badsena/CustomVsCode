/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as nls from '../../../../../nls.js';
import { Target } from './promptTypes.js';
/**
 * Enum of hook types across all targets. For the set of supported hooks per target, see HOOKS_BY_TARGET.
 */
export var HookType;
(function (HookType) {
    HookType["SessionStart"] = "SessionStart";
    HookType["SessionEnd"] = "SessionEnd";
    HookType["UserPromptSubmit"] = "UserPromptSubmit";
    HookType["PreToolUse"] = "PreToolUse";
    HookType["PostToolUse"] = "PostToolUse";
    HookType["PreCompact"] = "PreCompact";
    HookType["SubagentStart"] = "SubagentStart";
    HookType["SubagentStop"] = "SubagentStop";
    HookType["Stop"] = "Stop";
    HookType["ErrorOccurred"] = "ErrorOccurred";
})(HookType || (HookType = {}));
export const HOOKS_BY_TARGET = {
    // see https://code.visualstudio.com/docs/copilot/customization/hooks#_hook-lifecycle-events
    [Target.VSCode]: {
        'SessionStart': HookType.SessionStart,
        'UserPromptSubmit': HookType.UserPromptSubmit,
        'PreToolUse': HookType.PreToolUse,
        'PostToolUse': HookType.PostToolUse,
        'PreCompact': HookType.PreCompact,
        'SubagentStart': HookType.SubagentStart,
        'SubagentStop': HookType.SubagentStop,
        'Stop': HookType.Stop,
    },
    // see https://docs.github.com/en/copilot/concepts/agents/coding-agent/about-hooks#types-of-hooks
    [Target.GitHubCopilot]: {
        'sessionStart': HookType.SessionStart,
        'sessionEnd': HookType.SessionEnd,
        'userPromptSubmitted': HookType.UserPromptSubmit,
        'preToolUse': HookType.PreToolUse,
        'postToolUse': HookType.PostToolUse,
        'agentStop': HookType.Stop,
        'subagentStop': HookType.SubagentStop,
        'errorOccurred': HookType.ErrorOccurred
    },
    // see https://docs.anthropic.com/en/docs/claude-code/hooks
    [Target.Claude]: {
        'SessionStart': HookType.SessionStart,
        'UserPromptSubmit': HookType.UserPromptSubmit,
        'PreToolUse': HookType.PreToolUse,
        'PostToolUse': HookType.PostToolUse,
        'PreCompact': HookType.PreCompact,
        'SubagentStart': HookType.SubagentStart,
        'SubagentStop': HookType.SubagentStop,
        'Stop': HookType.Stop,
    },
    // if no target, just list all known hook types.
    [Target.Undefined]: Object.fromEntries(Object.values(HookType).map(h => [h, h]))
};
/**
 * Metadata for hook types including localized labels and descriptions
 */
export const HOOK_METADATA = {
    [HookType.SessionStart]: {
        label: nls.localize(8531, null),
        description: nls.localize(8532, null)
    },
    [HookType.UserPromptSubmit]: {
        label: nls.localize(8533, null),
        description: nls.localize(8534, null)
    },
    [HookType.PreToolUse]: {
        label: nls.localize(8535, null),
        description: nls.localize(8536, null)
    },
    [HookType.PostToolUse]: {
        label: nls.localize(8537, null),
        description: nls.localize(8538, null)
    },
    [HookType.PreCompact]: {
        label: nls.localize(8539, null),
        description: nls.localize(8540, null)
    },
    [HookType.SubagentStart]: {
        label: nls.localize(8541, null),
        description: nls.localize(8542, null)
    },
    [HookType.SubagentStop]: {
        label: nls.localize(8543, null),
        description: nls.localize(8544, null)
    },
    [HookType.Stop]: {
        label: nls.localize(8545, null),
        description: nls.localize(8546, null)
    },
    [HookType.SessionEnd]: {
        label: nls.localize(8547, null),
        description: nls.localize(8548, null)
    },
    [HookType.ErrorOccurred]: {
        label: nls.localize(8549, null),
        description: nls.localize(8550, null)
    }
};
//# sourceMappingURL=hookTypes.js.map