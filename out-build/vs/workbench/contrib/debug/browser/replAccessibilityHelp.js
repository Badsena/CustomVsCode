/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { ContextKeyExpr } from '../../../../platform/contextkey/common/contextkey.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { getReplView } from './repl.js';
import { IViewsService } from '../../../services/views/common/viewsService.js';
import { localize } from '../../../../nls.js';
import { CONTEXT_IN_DEBUG_REPL } from '../common/debug.js';
export class ReplAccessibilityHelp {
    constructor() {
        this.priority = 120;
        this.name = 'replHelp';
        this.when = ContextKeyExpr.or(ContextKeyExpr.equals('focusedView', 'workbench.panel.repl.view'), CONTEXT_IN_DEBUG_REPL);
        this.type = "help" /* AccessibleViewType.Help */;
    }
    getProvider(accessor) {
        const viewsService = accessor.get(IViewsService);
        const replView = getReplView(viewsService);
        if (!replView) {
            return undefined;
        }
        return new ReplAccessibilityHelpProvider(replView);
    }
}
class ReplAccessibilityHelpProvider extends Disposable {
    constructor(_replView) {
        super();
        this._replView = _replView;
        this.id = "replHelp" /* AccessibleViewProviderId.ReplHelp */;
        this.verbositySettingKey = "accessibility.verbosity.find" /* AccessibilityVerbositySettingId.Find */;
        this.options = { type: "help" /* AccessibleViewType.Help */ };
    }
    onClose() {
        this._replView.focusFilter();
    }
    provideContent() {
        const content = [];
        // Header
        content.push(localize(10113, null));
        content.push(localize(10114, null));
        content.push('');
        // Current Filter Status
        content.push(localize(10115, null));
        content.push(localize(10116, null));
        content.push('');
        // Inside the Filter Input
        content.push(localize(10117, null));
        content.push(localize(10118, null));
        content.push('');
        // What Happens When You Filter
        content.push(localize(10119, null));
        content.push(localize(10120, null));
        content.push('');
        // Focus Behavior
        content.push(localize(10121, null));
        content.push(localize(10122, null));
        content.push(localize(10123, null));
        content.push(localize(10124, null));
        content.push('');
        // Distinguishing Filter from Console Input
        content.push(localize(10125, null));
        content.push(localize(10126, null));
        content.push(localize(10127, null));
        content.push(localize(10128, null, '<keybinding:workbench.panel.repl.view.focus>'));
        content.push('');
        // Filter Syntax
        content.push(localize(10129, null));
        content.push(localize(10130, null));
        content.push(localize(10131, null));
        content.push('');
        // Keyboard Navigation Summary
        content.push(localize(10132, null));
        content.push(localize(10133, null));
        content.push(localize(10134, null));
        content.push(localize(10135, null));
        content.push(localize(10136, null, '<keybinding:workbench.panel.repl.view.focus>'));
        content.push('');
        // Settings
        content.push(localize(10137, null, '<keybinding:workbench.action.openSettings>'));
        content.push(localize(10138, null));
        content.push(localize(10139, null));
        content.push(localize(10140, null));
        content.push(localize(10141, null));
        content.push(localize(10142, null));
        content.push(localize(10143, null));
        content.push(localize(10144, null));
        content.push(localize(10145, null));
        content.push(localize(10146, null));
        content.push('');
        // Closing
        content.push(localize(10147, null));
        content.push(localize(10148, null));
        return content.join('\n');
    }
}
//# sourceMappingURL=replAccessibilityHelp.js.map