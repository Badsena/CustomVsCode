/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { localize } from '../../../../../nls.js';
import { AccessibleContentProvider } from '../../../../../platform/accessibility/browser/accessibleView.js';
import { IKeybindingService } from '../../../../../platform/keybinding/common/keybinding.js';
import { ITerminalService } from '../../../terminal/browser/terminal.js';
import { TerminalChatContextKeys } from './terminalChat.js';
import { TerminalChatController } from './terminalChatController.js';
export class TerminalChatAccessibilityHelp {
    constructor() {
        this.priority = 110;
        this.name = 'terminalChat';
        this.when = TerminalChatContextKeys.focused;
        this.type = "help" /* AccessibleViewType.Help */;
    }
    getProvider(accessor) {
        const terminalService = accessor.get(ITerminalService);
        const instance = terminalService.activeInstance;
        if (!instance) {
            return;
        }
        const helpText = getAccessibilityHelpText(accessor);
        return new AccessibleContentProvider("terminal-chat" /* AccessibleViewProviderId.TerminalChat */, { type: "help" /* AccessibleViewType.Help */ }, () => helpText, () => TerminalChatController.get(instance)?.terminalChatWidget?.focus(), "accessibility.verbosity.terminalChat" /* AccessibilityVerbositySettingId.TerminalInlineChat */);
    }
}
export function getAccessibilityHelpText(accessor) {
    const keybindingService = accessor.get(IKeybindingService);
    const content = [];
    const openAccessibleViewKeybinding = keybindingService.lookupKeybinding('editor.action.accessibleView')?.getAriaLabel();
    const runCommandKeybinding = keybindingService.lookupKeybinding("workbench.action.terminal.chat.runCommand" /* TerminalChatCommandId.RunCommand */)?.getAriaLabel();
    const insertCommandKeybinding = keybindingService.lookupKeybinding("workbench.action.terminal.chat.insertCommand" /* TerminalChatCommandId.InsertCommand */)?.getAriaLabel();
    const makeRequestKeybinding = keybindingService.lookupKeybinding("workbench.action.terminal.chat.makeRequest" /* TerminalChatCommandId.MakeRequest */)?.getAriaLabel();
    const startChatKeybinding = keybindingService.lookupKeybinding("workbench.action.terminal.chat.start" /* TerminalChatCommandId.Start */)?.getAriaLabel();
    const focusResponseKeybinding = keybindingService.lookupKeybinding('chat.action.focus')?.getAriaLabel();
    const focusInputKeybinding = keybindingService.lookupKeybinding('workbench.action.chat.focusInput')?.getAriaLabel();
    content.push(localize(15840, null));
    content.push(localize(15841, null, startChatKeybinding));
    content.push(makeRequestKeybinding ? localize(15842, null, makeRequestKeybinding) : localize(15843, null));
    content.push(openAccessibleViewKeybinding ? localize(15844, null, openAccessibleViewKeybinding) : localize(15845, null));
    content.push(focusResponseKeybinding ? localize(15846, null, focusResponseKeybinding) : localize(15847, null));
    content.push(focusInputKeybinding ? localize(15848, null, focusInputKeybinding) : localize(15849, null));
    content.push(runCommandKeybinding ? localize(15850, null, runCommandKeybinding) : localize(15851, null));
    content.push(insertCommandKeybinding ? localize(15852, null, insertCommandKeybinding) : localize(15853, null));
    content.push(localize(15854, null));
    content.push(localize(15855, null));
    return content.join('\n');
}
//# sourceMappingURL=terminalChatAccessibilityHelp.js.map