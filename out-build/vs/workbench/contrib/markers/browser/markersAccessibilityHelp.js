/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Disposable } from '../../../../base/common/lifecycle.js';
import { IKeybindingService } from '../../../../platform/keybinding/common/keybinding.js';
import * as nls from '../../../../nls.js';
import { MarkersContextKeys } from '../common/markers.js';
export class ProblemsAccessibilityHelp {
    constructor() {
        this.type = "help" /* AccessibleViewType.Help */;
        this.priority = 105;
        this.name = 'problemsFilter';
        this.when = MarkersContextKeys.MarkerViewFilterFocusContextKey;
    }
    getProvider(accessor) {
        return new ProblemsAccessibilityHelpProvider(accessor.get(IKeybindingService));
    }
}
class ProblemsAccessibilityHelpProvider extends Disposable {
    constructor(_keybindingService) {
        super();
        this._keybindingService = _keybindingService;
        this.id = "problemsFilterHelp" /* AccessibleViewProviderId.ProblemsFilterHelp */;
        this.verbositySettingKey = "accessibility.verbosity.find" /* AccessibilityVerbositySettingId.Find */;
        this.options = { type: "help" /* AccessibleViewType.Help */ };
    }
    provideContent() {
        const lines = [];
        // Header
        lines.push(nls.localize(12020, null));
        lines.push(nls.localize(12021, null));
        lines.push('');
        // Current Filter Status
        lines.push(nls.localize(12022, null));
        lines.push(nls.localize(12023, null));
        lines.push('');
        // Inside the Filter Input
        lines.push(nls.localize(12024, null));
        lines.push(nls.localize(12025, null));
        lines.push('');
        // What Happens When You Filter
        lines.push(nls.localize(12026, null));
        lines.push(nls.localize(12027, null));
        lines.push(nls.localize(12028, null));
        lines.push('');
        // Focus Behavior
        lines.push(nls.localize(12029, null));
        lines.push(nls.localize(12030, null));
        lines.push(nls.localize(12031, null));
        lines.push(nls.localize(12032, null));
        lines.push(nls.localize(12033, null));
        lines.push('');
        // Filter Syntax
        lines.push(nls.localize(12034, null));
        lines.push(nls.localize(12035, null));
        lines.push(nls.localize(12036, null));
        lines.push(nls.localize(12037, null));
        lines.push('');
        // Severity and Scope Filtering
        lines.push(nls.localize(12038, null));
        lines.push(nls.localize(12039, null));
        lines.push(nls.localize(12040, null));
        lines.push(nls.localize(12041, null));
        lines.push(nls.localize(12042, null));
        lines.push(nls.localize(12043, null));
        lines.push(nls.localize(12044, null));
        lines.push('');
        // Keyboard Navigation Summary
        lines.push(nls.localize(12045, null));
        lines.push(nls.localize(12046, null));
        lines.push(nls.localize(12047, null));
        lines.push(nls.localize(12048, null));
        lines.push(nls.localize(12049, null, this._describeCommand('editor.action.marker.nextInFiles') || 'F8'));
        lines.push(nls.localize(12050, null, this._describeCommand('editor.action.marker.prevInFiles') || 'Shift+F8'));
        lines.push(nls.localize(12051, null));
        lines.push('');
        // Settings
        lines.push(nls.localize(12052, null, this._describeCommand('workbench.action.openSettings') || 'Ctrl+,'));
        lines.push(nls.localize(12053, null));
        lines.push(nls.localize(12054, null));
        lines.push(nls.localize(12055, null));
        lines.push(nls.localize(12056, null));
        lines.push(nls.localize(12057, null));
        lines.push(nls.localize(12058, null));
        lines.push('');
        // Closing
        lines.push(nls.localize(12059, null));
        lines.push(nls.localize(12060, null));
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
//# sourceMappingURL=markersAccessibilityHelp.js.map