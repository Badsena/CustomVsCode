/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Disposable } from '../../../../base/common/lifecycle.js';
import { isMacintosh } from '../../../../base/common/platform.js';
import { ICodeEditorService } from '../../../../editor/browser/services/codeEditorService.js';
import { CommonFindController } from '../../../../editor/contrib/find/browser/findController.js';
import { CONTEXT_FIND_WIDGET_FOCUSED } from '../../../../editor/contrib/find/browser/findModel.js';
import { localize } from '../../../../nls.js';
import { AccessibleViewRegistry } from '../../../../platform/accessibility/browser/accessibleViewRegistry.js';
/**
 * Accessible view implementation for Find and Replace help in the code editor.
 * Provides comprehensive accessibility support for the Find dialog, including:
 * - Search status information (current term, match count, position)
 * - Navigation instructions for keyboard control
 * - Focus behavior explanation
 * - Available settings and options
 * - Platform-specific guidance
 *
 * Activated via Alt+F1 when any element in the Find widget is focused.
 */
export class EditorFindAccessibilityHelp {
    constructor() {
        this.priority = 105;
        this.name = 'editor-find';
        this.when = CONTEXT_FIND_WIDGET_FOCUSED;
        this.type = "help" /* AccessibleViewType.Help */;
    }
    /**
     * Creates an accessible view content provider for the active code editor's Find/Replace dialog.
     * @param accessor Service accessor for retrieving the code editor service
     * @returns The provider instance, or undefined if no active editor or find controller is found
     */
    getProvider(accessor) {
        const codeEditorService = accessor.get(ICodeEditorService);
        const codeEditor = codeEditorService.getActiveCodeEditor() || codeEditorService.getFocusedCodeEditor();
        if (!codeEditor) {
            return;
        }
        const findController = CommonFindController.get(codeEditor);
        if (!findController) {
            return;
        }
        return new EditorFindAccessibilityHelpProvider(findController);
    }
}
/**
 * Content provider for the Find and Replace accessibility help.
 * Generates localized, context-aware help information based on the current Find state.
 *
 * The implementation:
 * - Adapts content based on whether Replace mode is active
 * - Provides current search status (term, match count, position)
 * - Explains focus behavior (how focus moves between Find input, Replace input, and editor)
 * - Lists keyboard navigation shortcuts for different contexts
 * - Documents available Find and Replace options
 * - References relevant settings that affect Find behavior
 * - Includes platform-specific guidance where applicable
 */
class EditorFindAccessibilityHelpProvider extends Disposable {
    constructor(_findController) {
        super();
        this._findController = _findController;
        this.id = "editorFindHelp" /* AccessibleViewProviderId.EditorFindHelp */;
        this.verbositySettingKey = "accessibility.verbosity.find" /* AccessibilityVerbositySettingId.Find */;
        this.options = { type: "help" /* AccessibleViewType.Help */ };
    }
    /**
     * Returns focus to the last focused element in the Find widget when the accessibility help is closed.
     * This handles focus restoration for any element (inputs, checkboxes, buttons) not just the text inputs.
     */
    onClose() {
        this._findController.focusLastElement();
    }
    /**
     * Generates the complete accessibility help content for Find and Replace.
     * The content structure varies based on whether Replace mode is visible:
     *
     * Replace Mode Content:
     * - Header identifying the dialog
     * - Context explaining what the dialog does
     * - Current search and replace status
     * - Focus behavior explanation
     * - Keyboard shortcuts for Find, Replace, and Editor contexts
     * - Find and Replace options explanation
     * - Configurable settings documentation
     * - Platform-specific settings (macOS)
     *
     * Find-Only Mode Content:
     * - Similar structure but without Replace-specific sections
     *
     * @returns The complete help text as a newline-joined string for audio announcement
     */
    provideContent() {
        const state = this._findController.getState();
        const isReplaceVisible = state.isReplaceRevealed;
        const searchString = state.searchString;
        const matchCount = state.matchesCount;
        const matchPosition = state.matchesPosition;
        const content = [];
        if (isReplaceVisible) {
            // ========== REPLACE MODE CONTENT ==========
            content.push(localize(9081, null));
            content.push(localize(9082, null));
            content.push('');
            // Current Search Status
            content.push(localize(9083, null));
            if (searchString) {
                content.push(localize(9084, null, searchString));
                if (matchCount !== undefined && matchPosition !== undefined) {
                    if (matchCount === 0) {
                        content.push(localize(9085, null));
                    }
                    else {
                        content.push(localize(9086, null, matchPosition, matchCount));
                    }
                }
            }
            else {
                content.push(localize(9087, null));
            }
            const replaceString = state.replaceString;
            if (replaceString) {
                content.push(localize(9088, null, replaceString));
            }
            else {
                content.push(localize(9089, null));
            }
            content.push('');
            // Inside the Find and Replace Dialog
            content.push(localize(9090, null));
            content.push(localize(9091, null));
            content.push('');
            // What You Hear
            content.push(localize(9092, null));
            content.push(localize(9093, null));
            content.push(localize(9094, null));
            content.push(localize(9095, null));
            content.push(localize(9096, null));
            content.push('');
            // Focus Behavior
            content.push(localize(9097, null));
            content.push(localize(9098, null));
            content.push(localize(9099, null));
            content.push(localize(9100, null));
            content.push('');
            // Keyboard Navigation Summary
            content.push(localize(9101, null));
            content.push('');
            content.push(localize(9102, null));
            content.push(localize(9103, null));
            content.push(localize(9104, null));
            content.push(localize(9105, null));
            content.push('');
            content.push(localize(9106, null));
            content.push(localize(9107, null));
            content.push(localize(9108, null, '<keybinding:editor.action.replaceOne>'));
            content.push(localize(9109, null, '<keybinding:editor.action.replaceAll>'));
            content.push('');
            content.push(localize(9110, null));
            content.push(localize(9111, null, '<keybinding:editor.action.nextMatchFindAction>'));
            content.push(localize(9112, null, '<keybinding:editor.action.previousMatchFindAction>'));
            content.push('');
            content.push(localize(9113, null));
            content.push('');
            // Find and Replace Options
            content.push(localize(9114, null));
            content.push(localize(9115, null));
            content.push(localize(9116, null));
            content.push(localize(9117, null));
            content.push(localize(9118, null));
            content.push(localize(9119, null));
            content.push('');
            // Settings
            content.push(localize(9120, null, '<keybinding:workbench.action.openSettings>'));
            content.push(localize(9121, null));
            content.push(localize(9122, null));
            content.push(localize(9123, null));
            content.push(localize(9124, null));
            content.push(localize(9125, null));
            content.push(localize(9126, null));
            content.push(localize(9127, null));
            content.push(localize(9128, null));
            content.push(localize(9129, null));
            content.push(localize(9130, null));
            content.push(localize(9131, null));
            content.push(localize(9132, null));
            content.push(localize(9133, null));
            content.push(localize(9134, null));
            content.push(localize(9135, null));
            // Platform-specific setting
            if (isMacintosh) {
                content.push('');
                content.push(localize(9136, null));
                content.push(localize(9137, null));
            }
            content.push('');
            content.push(localize(9138, null));
            content.push(localize(9139, null));
        }
        else {
            // ========== FIND-ONLY MODE CONTENT ==========
            content.push(localize(9140, null));
            content.push(localize(9141, null));
            content.push('');
            // Current Search Status
            content.push(localize(9142, null));
            if (searchString) {
                content.push(localize(9143, null, searchString));
                if (matchCount !== undefined && matchPosition !== undefined) {
                    if (matchCount === 0) {
                        content.push(localize(9144, null));
                    }
                    else {
                        content.push(localize(9145, null, matchPosition, matchCount));
                    }
                }
            }
            else {
                content.push(localize(9146, null));
            }
            content.push('');
            // Inside the Find Dialog
            content.push(localize(9147, null));
            content.push(localize(9148, null));
            content.push('');
            // What You Hear
            content.push(localize(9149, null));
            content.push(localize(9150, null));
            content.push(localize(9151, null));
            content.push(localize(9152, null));
            content.push(localize(9153, null));
            content.push(localize(9154, null));
            content.push('');
            // Outside the Find Dialog
            content.push(localize(9155, null));
            content.push(localize(9156, null));
            content.push(localize(9157, null, '<keybinding:editor.action.nextMatchFindAction>'));
            content.push(localize(9158, null, '<keybinding:editor.action.previousMatchFindAction>'));
            content.push(localize(9159, null));
            content.push('');
            // Focus Behavior
            content.push(localize(9160, null));
            content.push(localize(9161, null));
            content.push(localize(9162, null));
            content.push('');
            // Keyboard Navigation Summary
            content.push(localize(9163, null));
            content.push('');
            content.push(localize(9164, null));
            content.push(localize(9165, null));
            content.push(localize(9166, null));
            content.push('');
            content.push(localize(9167, null));
            content.push(localize(9168, null, '<keybinding:editor.action.nextMatchFindAction>'));
            content.push(localize(9169, null, '<keybinding:editor.action.previousMatchFindAction>'));
            content.push('');
            content.push(localize(9170, null));
            content.push('');
            // Find Options
            content.push(localize(9171, null));
            content.push(localize(9172, null));
            content.push(localize(9173, null));
            content.push(localize(9174, null));
            content.push(localize(9175, null));
            content.push('');
            // Settings
            content.push(localize(9176, null, '<keybinding:workbench.action.openSettings>'));
            content.push(localize(9177, null));
            content.push(localize(9178, null));
            content.push(localize(9179, null));
            content.push(localize(9180, null));
            content.push(localize(9181, null));
            content.push(localize(9182, null));
            content.push(localize(9183, null));
            content.push(localize(9184, null));
            content.push(localize(9185, null));
            content.push(localize(9186, null));
            content.push(localize(9187, null));
            content.push(localize(9188, null));
            content.push(localize(9189, null));
            content.push(localize(9190, null));
            content.push(localize(9191, null));
            // Platform-specific setting
            if (isMacintosh) {
                content.push('');
                content.push(localize(9192, null));
                content.push(localize(9193, null));
            }
            content.push('');
            content.push(localize(9194, null));
            content.push(localize(9195, null));
        }
        return content.join('\n');
    }
}
// Register the accessibility help provider
AccessibleViewRegistry.register(new EditorFindAccessibilityHelp());
//# sourceMappingURL=editorFindAccessibilityHelp.js.map