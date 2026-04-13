/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Disposable } from '../../../../base/common/lifecycle.js';
import { localize } from '../../../../nls.js';
import { KEYBINDING_CONTEXT_WEBVIEW_FIND_WIDGET_FOCUSED } from './webview.js';
export class WebviewFindAccessibilityHelp {
    constructor() {
        this.priority = 105;
        this.name = 'webview-find';
        this.type = "help" /* AccessibleViewType.Help */;
        this.when = KEYBINDING_CONTEXT_WEBVIEW_FIND_WIDGET_FOCUSED;
    }
    getProvider(accessor) {
        return new WebviewFindAccessibilityHelpProvider();
    }
}
class WebviewFindAccessibilityHelpProvider extends Disposable {
    constructor() {
        super(...arguments);
        this.id = "webviewFindHelp" /* AccessibleViewProviderId.WebviewFindHelp */;
        this.verbositySettingKey = "accessibility.verbosity.find" /* AccessibilityVerbositySettingId.Find */;
        this.options = { type: "help" /* AccessibleViewType.Help */ };
    }
    onClose() {
        // Focus will remain on webview
    }
    provideContent() {
        const content = [];
        // Header
        content.push(localize(17254, null));
        content.push(localize(17255, null));
        content.push('');
        // Current Search Status
        content.push(localize(17256, null));
        content.push(localize(17257, null));
        content.push('');
        // Inside the Webview Find Input
        content.push(localize(17258, null));
        content.push(localize(17259, null));
        content.push('');
        // What You Hear
        content.push(localize(17260, null));
        content.push(localize(17261, null));
        content.push(localize(17262, null));
        content.push(localize(17263, null));
        content.push(localize(17264, null));
        content.push('');
        // Focus Behavior
        content.push(localize(17265, null));
        content.push(localize(17266, null));
        content.push(localize(17267, null));
        content.push(localize(17268, null));
        content.push('');
        // Keyboard Navigation Summary
        content.push(localize(17269, null));
        content.push('');
        content.push(localize(17270, null));
        content.push(localize(17271, null));
        content.push(localize(17272, null));
        content.push('');
        // Find Options
        content.push(localize(17273, null));
        content.push(localize(17274, null));
        content.push(localize(17275, null));
        content.push(localize(17276, null));
        content.push('');
        // Important About Webviews
        content.push(localize(17277, null));
        content.push(localize(17278, null));
        content.push('');
        // Settings
        content.push(localize(17279, null, '<keybinding:workbench.action.openSettings>'));
        content.push(localize(17280, null));
        content.push(localize(17281, null));
        content.push('');
        // Closing
        content.push(localize(17282, null));
        content.push(localize(17283, null));
        return content.join('\n');
    }
}
//# sourceMappingURL=webviewFindAccessibilityHelp.js.map