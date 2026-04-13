/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Disposable } from '../../../../../base/common/lifecycle.js';
import { localize } from '../../../../../nls.js';
import { TerminalContextKeys } from '../../../terminal/common/terminalContextKey.js';
import { ICommandService } from '../../../../../platform/commands/common/commands.js';
export class TerminalFindAccessibilityHelp {
    constructor() {
        this.priority = 105;
        this.name = 'terminal-find';
        this.type = "help" /* AccessibleViewType.Help */;
        this.when = TerminalContextKeys.findFocus;
    }
    getProvider(accessor) {
        const commandService = accessor.get(ICommandService);
        return new TerminalFindAccessibilityHelpProvider(commandService);
    }
}
class TerminalFindAccessibilityHelpProvider extends Disposable {
    constructor(_commandService) {
        super();
        this._commandService = _commandService;
        this.id = "terminalFindHelp" /* AccessibleViewProviderId.TerminalFindHelp */;
        this.verbositySettingKey = "accessibility.verbosity.find" /* AccessibilityVerbositySettingId.Find */;
        this.options = { type: "help" /* AccessibleViewType.Help */ };
    }
    onClose() {
        // The Escape key that closes the accessible help will also propagate
        // and close the terminal find widget. Re-open the find widget after
        // the Escape event has fully propagated through all handlers.
        setTimeout(() => {
            this._commandService.executeCommand("workbench.action.terminal.focusFind" /* TerminalFindCommandId.FindFocus */);
        }, 200);
    }
    provideContent() {
        const content = [];
        // Header
        content.push(localize(16087, null));
        content.push(localize(16088, null));
        content.push('');
        // Current Search Status
        content.push(localize(16089, null));
        content.push(localize(16090, null));
        content.push('');
        // Inside the Terminal Find Input
        content.push(localize(16091, null));
        content.push(localize(16092, null));
        content.push('');
        // What You Hear
        content.push(localize(16093, null));
        content.push(localize(16094, null));
        content.push(localize(16095, null));
        content.push(localize(16096, null));
        content.push(localize(16097, null));
        content.push('');
        // Focus Behavior
        content.push(localize(16098, null));
        content.push(localize(16099, null));
        content.push(localize(16100, null));
        content.push(localize(16101, null));
        content.push('');
        // Keyboard Navigation Summary
        content.push(localize(16102, null));
        content.push('');
        content.push(localize(16103, null));
        content.push(localize(16104, null));
        content.push(localize(16105, null));
        content.push('');
        content.push(localize(16106, null));
        content.push('');
        // Find Options
        content.push(localize(16107, null));
        content.push(localize(16108, null));
        content.push(localize(16109, null));
        content.push(localize(16110, null));
        content.push('');
        // Settings
        content.push(localize(16111, null, '<keybinding:workbench.action.openSettings>'));
        content.push(localize(16112, null));
        content.push(localize(16113, null));
        content.push('');
        // Closing
        content.push(localize(16114, null));
        content.push(localize(16115, null));
        return content.join('\n');
    }
}
//# sourceMappingURL=terminalFindAccessibilityHelp.js.map