/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Disposable } from '../../../../base/common/lifecycle.js';
import { IKeybindingService } from '../../../../platform/keybinding/common/keybinding.js';
import * as nls from '../../../../nls.js';
import { OUTPUT_FILTER_FOCUS_CONTEXT } from '../../../services/output/common/output.js';
export class OutputAccessibilityHelp {
    constructor() {
        this.type = "help" /* AccessibleViewType.Help */;
        this.priority = 105;
        this.name = 'outputFilter';
        this.when = OUTPUT_FILTER_FOCUS_CONTEXT;
    }
    getProvider(accessor) {
        return new OutputAccessibilityHelpProvider(accessor.get(IKeybindingService));
    }
}
class OutputAccessibilityHelpProvider extends Disposable {
    constructor(_keybindingService) {
        super();
        this._keybindingService = _keybindingService;
        this.id = "outputFindHelp" /* AccessibleViewProviderId.OutputFindHelp */;
        this.verbositySettingKey = "accessibility.verbosity.find" /* AccessibilityVerbositySettingId.Find */;
        this.options = { type: "help" /* AccessibleViewType.Help */ };
    }
    provideContent() {
        const lines = [];
        // Header
        lines.push(nls.localize(13394, null));
        lines.push(nls.localize(13395, null));
        lines.push('');
        // Current Filter Status
        lines.push(nls.localize(13396, null));
        lines.push(nls.localize(13397, null));
        lines.push('');
        // Inside the Filter Input
        lines.push(nls.localize(13398, null));
        lines.push(nls.localize(13399, null));
        lines.push('');
        // What Happens When You Filter
        lines.push(nls.localize(13400, null));
        lines.push(nls.localize(13401, null));
        lines.push(nls.localize(13402, null));
        lines.push('');
        // Focus Behavior
        lines.push(nls.localize(13403, null));
        lines.push(nls.localize(13404, null));
        lines.push(nls.localize(13405, null));
        lines.push(nls.localize(13406, null));
        lines.push('');
        // Filter Syntax
        lines.push(nls.localize(13407, null));
        lines.push(nls.localize(13408, null));
        lines.push(nls.localize(13409, null));
        lines.push(nls.localize(13410, null));
        lines.push(nls.localize(13411, null));
        lines.push(nls.localize(13412, null));
        lines.push('');
        // Keyboard Navigation Summary
        lines.push(nls.localize(13413, null));
        lines.push(nls.localize(13414, null));
        lines.push(nls.localize(13415, null));
        lines.push(nls.localize(13416, null));
        lines.push('');
        // Settings
        lines.push(nls.localize(13417, null, this._describeCommand('workbench.action.openSettings') || 'Ctrl+,'));
        lines.push(nls.localize(13418, null));
        lines.push(nls.localize(13419, null));
        lines.push(nls.localize(13420, null));
        lines.push('');
        // Closing
        lines.push(nls.localize(13421, null));
        lines.push(nls.localize(13422, null));
        return lines.join('\n');
    }
    _describeCommand(commandId) {
        const kb = this._keybindingService.lookupKeybinding(commandId);
        return kb?.getAriaLabel() ?? undefined;
    }
    onClose() {
        // No-op
    }
}
//# sourceMappingURL=outputAccessibilityHelp.js.map