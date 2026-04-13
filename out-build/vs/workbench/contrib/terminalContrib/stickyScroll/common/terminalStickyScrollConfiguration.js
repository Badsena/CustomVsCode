/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { localize } from '../../../../../nls.js';
export var TerminalStickyScrollSettingId;
(function (TerminalStickyScrollSettingId) {
    TerminalStickyScrollSettingId["Enabled"] = "terminal.integrated.stickyScroll.enabled";
    TerminalStickyScrollSettingId["MaxLineCount"] = "terminal.integrated.stickyScroll.maxLineCount";
    TerminalStickyScrollSettingId["IgnoredCommands"] = "terminal.integrated.stickyScroll.ignoredCommands";
})(TerminalStickyScrollSettingId || (TerminalStickyScrollSettingId = {}));
export const terminalStickyScrollConfiguration = {
    ["terminal.integrated.stickyScroll.enabled" /* TerminalStickyScrollSettingId.Enabled */]: {
        markdownDescription: localize(16218, null, 'https://code.visualstudio.com/docs/terminal/shell-integration', `\`#${"terminal.integrated.shellIntegration.enabled" /* TerminalSettingId.ShellIntegrationEnabled */}#\``),
        type: 'boolean',
        default: true
    },
    ["terminal.integrated.stickyScroll.maxLineCount" /* TerminalStickyScrollSettingId.MaxLineCount */]: {
        markdownDescription: localize(16219, null),
        type: 'number',
        default: 5,
        minimum: 1,
        maximum: 10
    },
    ["terminal.integrated.stickyScroll.ignoredCommands" /* TerminalStickyScrollSettingId.IgnoredCommands */]: {
        markdownDescription: localize(16220, null),
        type: 'array',
        items: {
            type: 'string'
        },
        default: [
            'clear',
            'cls',
            'clear-host',
            'copilot',
            'claude',
            'codex',
            'gemini'
        ]
    },
};
//# sourceMappingURL=terminalStickyScrollConfiguration.js.map