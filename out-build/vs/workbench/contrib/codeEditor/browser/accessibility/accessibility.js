/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import './accessibility.css';
import * as nls from '../../../../../nls.js';
import { IConfigurationService } from '../../../../../platform/configuration/common/configuration.js';
import { CONTEXT_ACCESSIBILITY_MODE_ENABLED, IAccessibilityService } from '../../../../../platform/accessibility/common/accessibility.js';
import { Action2, registerAction2 } from '../../../../../platform/actions/common/actions.js';
import { accessibilityHelpIsShown } from '../../../accessibility/browser/accessibilityConfiguration.js';
import { AccessibilityHelpNLS } from '../../../../../editor/common/standaloneStrings.js';
import { ICodeEditorService } from '../../../../../editor/browser/services/codeEditorService.js';
import { alert } from '../../../../../base/browser/ui/aria/aria.js';
import { CursorColumns } from '../../../../../editor/common/core/cursorColumns.js';
import { EditorContextKeys } from '../../../../../editor/common/editorContextKeys.js';
import { ContextKeyExpr } from '../../../../../platform/contextkey/common/contextkey.js';
class ToggleScreenReaderMode extends Action2 {
    constructor() {
        super({
            id: 'editor.action.toggleScreenReaderAccessibilityMode',
            title: nls.localize2(9064, "Toggle Screen Reader Accessibility Mode"),
            metadata: {
                description: nls.localize2(9065, "Toggles an optimized mode for usage with screen readers, braille devices, and other assistive technologies."),
            },
            f1: true,
            keybinding: [{
                    primary: 2048 /* KeyMod.CtrlCmd */ | 35 /* KeyCode.KeyE */,
                    weight: 200 /* KeybindingWeight.WorkbenchContrib */ + 10,
                    when: accessibilityHelpIsShown
                },
                {
                    primary: 512 /* KeyMod.Alt */ | 59 /* KeyCode.F1 */ | 1024 /* KeyMod.Shift */,
                    linux: { primary: 512 /* KeyMod.Alt */ | 62 /* KeyCode.F4 */ | 1024 /* KeyMod.Shift */ },
                    weight: 200 /* KeybindingWeight.WorkbenchContrib */ + 10,
                }]
        });
    }
    async run(accessor) {
        const accessibiiltyService = accessor.get(IAccessibilityService);
        const configurationService = accessor.get(IConfigurationService);
        const isScreenReaderOptimized = accessibiiltyService.isScreenReaderOptimized();
        configurationService.updateValue('editor.accessibilitySupport', isScreenReaderOptimized ? 'off' : 'on', 2 /* ConfigurationTarget.USER */);
        alert(isScreenReaderOptimized ? AccessibilityHelpNLS.screenReaderModeDisabled : AccessibilityHelpNLS.screenReaderModeEnabled);
    }
}
registerAction2(ToggleScreenReaderMode);
class AnnounceCursorPosition extends Action2 {
    constructor() {
        super({
            id: 'editor.action.announceCursorPosition',
            title: nls.localize2(9066, "Announce Cursor Position"),
            f1: true,
            metadata: {
                description: nls.localize2(9067, "Announce the current cursor position (line and column) via screen reader.")
            },
            keybinding: {
                primary: 2048 /* KeyMod.CtrlCmd */ | 512 /* KeyMod.Alt */ | 1024 /* KeyMod.Shift */ | 37 /* KeyCode.KeyG */,
                weight: 200 /* KeybindingWeight.WorkbenchContrib */ + 10,
                when: ContextKeyExpr.and(EditorContextKeys.editorTextFocus, CONTEXT_ACCESSIBILITY_MODE_ENABLED)
            }
        });
    }
    async run(accessor) {
        const codeEditorService = accessor.get(ICodeEditorService);
        const editor = codeEditorService.getFocusedCodeEditor();
        if (!editor) {
            return;
        }
        const position = editor.getPosition();
        const model = editor.getModel();
        if (!position || !model) {
            return;
        }
        // Use visible column to match status bar display (accounts for tabs)
        const tabSize = model.getOptions().tabSize;
        const lineContent = model.getLineContent(position.lineNumber);
        const visibleColumn = CursorColumns.visibleColumnFromColumn(lineContent, position.column, tabSize) + 1;
        alert(nls.localize(9063, null, position.lineNumber, visibleColumn));
    }
}
registerAction2(AnnounceCursorPosition);
//# sourceMappingURL=accessibility.js.map