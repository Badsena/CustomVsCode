/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as nls from '../../nls.js';
import { RawContextKey } from '../../platform/contextkey/common/contextkey.js';
export var EditorContextKeys;
(function (EditorContextKeys) {
    EditorContextKeys.editorSimpleInput = new RawContextKey('editorSimpleInput', false, true);
    /**
     * A context key that is set when the editor's text has focus (cursor is blinking).
     * Is false when focus is in simple editor widgets (repl input, scm commit input).
     */
    EditorContextKeys.editorTextFocus = new RawContextKey('editorTextFocus', false, nls.localize(827, null));
    /**
     * A context key that is set when the editor's text or an editor's widget has focus.
     */
    EditorContextKeys.focus = new RawContextKey('editorFocus', false, nls.localize(828, null));
    /**
     * A context key that is set when any editor input has focus (regular editor, repl input...).
     */
    EditorContextKeys.textInputFocus = new RawContextKey('textInputFocus', false, nls.localize(829, null));
    EditorContextKeys.readOnly = new RawContextKey('editorReadonly', false, nls.localize(830, null));
    EditorContextKeys.inDiffEditor = new RawContextKey('inDiffEditor', false, nls.localize(831, null));
    EditorContextKeys.isEmbeddedDiffEditor = new RawContextKey('isEmbeddedDiffEditor', false, nls.localize(832, null));
    EditorContextKeys.inMultiDiffEditor = new RawContextKey('inMultiDiffEditor', false, nls.localize(833, null));
    EditorContextKeys.multiDiffEditorAllCollapsed = new RawContextKey('multiDiffEditorAllCollapsed', undefined, nls.localize(834, null));
    EditorContextKeys.hasChanges = new RawContextKey('diffEditorHasChanges', false, nls.localize(835, null));
    EditorContextKeys.comparingMovedCode = new RawContextKey('comparingMovedCode', false, nls.localize(836, null));
    EditorContextKeys.accessibleDiffViewerVisible = new RawContextKey('accessibleDiffViewerVisible', false, nls.localize(837, null));
    EditorContextKeys.diffEditorRenderSideBySideInlineBreakpointReached = new RawContextKey('diffEditorRenderSideBySideInlineBreakpointReached', false, nls.localize(838, null));
    EditorContextKeys.diffEditorInlineMode = new RawContextKey('diffEditorInlineMode', false, nls.localize(839, null));
    EditorContextKeys.diffEditorOriginalWritable = new RawContextKey('diffEditorOriginalWritable', false, nls.localize(840, null));
    EditorContextKeys.diffEditorModifiedWritable = new RawContextKey('diffEditorModifiedWritable', false, nls.localize(841, null));
    EditorContextKeys.diffEditorOriginalUri = new RawContextKey('diffEditorOriginalUri', '', nls.localize(842, null));
    EditorContextKeys.diffEditorModifiedUri = new RawContextKey('diffEditorModifiedUri', '', nls.localize(843, null));
    EditorContextKeys.columnSelection = new RawContextKey('editorColumnSelection', false, nls.localize(844, null));
    EditorContextKeys.writable = EditorContextKeys.readOnly.toNegated();
    EditorContextKeys.hasNonEmptySelection = new RawContextKey('editorHasSelection', false, nls.localize(845, null));
    EditorContextKeys.hasOnlyEmptySelection = EditorContextKeys.hasNonEmptySelection.toNegated();
    EditorContextKeys.hasMultipleSelections = new RawContextKey('editorHasMultipleSelections', false, nls.localize(846, null));
    EditorContextKeys.hasSingleSelection = EditorContextKeys.hasMultipleSelections.toNegated();
    EditorContextKeys.tabMovesFocus = new RawContextKey('editorTabMovesFocus', false, nls.localize(847, null));
    EditorContextKeys.tabDoesNotMoveFocus = EditorContextKeys.tabMovesFocus.toNegated();
    EditorContextKeys.isInEmbeddedEditor = new RawContextKey('isInEmbeddedEditor', false, true);
    EditorContextKeys.canUndo = new RawContextKey('canUndo', false, true);
    EditorContextKeys.canRedo = new RawContextKey('canRedo', false, true);
    EditorContextKeys.hoverVisible = new RawContextKey('editorHoverVisible', false, nls.localize(848, null));
    EditorContextKeys.hoverFocused = new RawContextKey('editorHoverFocused', false, nls.localize(849, null));
    EditorContextKeys.stickyScrollFocused = new RawContextKey('stickyScrollFocused', false, nls.localize(850, null));
    EditorContextKeys.stickyScrollVisible = new RawContextKey('stickyScrollVisible', false, nls.localize(851, null));
    EditorContextKeys.standaloneColorPickerVisible = new RawContextKey('standaloneColorPickerVisible', false, nls.localize(852, null));
    EditorContextKeys.standaloneColorPickerFocused = new RawContextKey('standaloneColorPickerFocused', false, nls.localize(853, null));
    EditorContextKeys.isComposing = new RawContextKey('isComposing', false, nls.localize(854, null));
    /**
     * A context key that is set when an editor is part of a larger editor, like notebooks or
     * (future) a diff editor
     */
    EditorContextKeys.inCompositeEditor = new RawContextKey('inCompositeEditor', undefined, nls.localize(855, null));
    EditorContextKeys.notInCompositeEditor = EditorContextKeys.inCompositeEditor.toNegated();
    // -- mode context keys
    EditorContextKeys.languageId = new RawContextKey('editorLangId', '', nls.localize(856, null));
    EditorContextKeys.hasCompletionItemProvider = new RawContextKey('editorHasCompletionItemProvider', false, nls.localize(857, null));
    EditorContextKeys.hasCodeActionsProvider = new RawContextKey('editorHasCodeActionsProvider', false, nls.localize(858, null));
    EditorContextKeys.hasCodeLensProvider = new RawContextKey('editorHasCodeLensProvider', false, nls.localize(859, null));
    EditorContextKeys.hasDefinitionProvider = new RawContextKey('editorHasDefinitionProvider', false, nls.localize(860, null));
    EditorContextKeys.hasDeclarationProvider = new RawContextKey('editorHasDeclarationProvider', false, nls.localize(861, null));
    EditorContextKeys.hasImplementationProvider = new RawContextKey('editorHasImplementationProvider', false, nls.localize(862, null));
    EditorContextKeys.hasTypeDefinitionProvider = new RawContextKey('editorHasTypeDefinitionProvider', false, nls.localize(863, null));
    EditorContextKeys.hasHoverProvider = new RawContextKey('editorHasHoverProvider', false, nls.localize(864, null));
    EditorContextKeys.hasDocumentHighlightProvider = new RawContextKey('editorHasDocumentHighlightProvider', false, nls.localize(865, null));
    EditorContextKeys.hasDocumentSymbolProvider = new RawContextKey('editorHasDocumentSymbolProvider', false, nls.localize(866, null));
    EditorContextKeys.hasReferenceProvider = new RawContextKey('editorHasReferenceProvider', false, nls.localize(867, null));
    EditorContextKeys.hasRenameProvider = new RawContextKey('editorHasRenameProvider', false, nls.localize(868, null));
    EditorContextKeys.hasSignatureHelpProvider = new RawContextKey('editorHasSignatureHelpProvider', false, nls.localize(869, null));
    EditorContextKeys.hasInlayHintsProvider = new RawContextKey('editorHasInlayHintsProvider', false, nls.localize(870, null));
    // -- mode context keys: formatting
    EditorContextKeys.hasDocumentFormattingProvider = new RawContextKey('editorHasDocumentFormattingProvider', false, nls.localize(871, null));
    EditorContextKeys.hasDocumentSelectionFormattingProvider = new RawContextKey('editorHasDocumentSelectionFormattingProvider', false, nls.localize(872, null));
    EditorContextKeys.hasMultipleDocumentFormattingProvider = new RawContextKey('editorHasMultipleDocumentFormattingProvider', false, nls.localize(873, null));
    EditorContextKeys.hasMultipleDocumentSelectionFormattingProvider = new RawContextKey('editorHasMultipleDocumentSelectionFormattingProvider', false, nls.localize(874, null));
    EditorContextKeys.selectionHasDiagnostics = new RawContextKey('editorSelectionHasDiagnostics', false, nls.localize(875, null));
})(EditorContextKeys || (EditorContextKeys = {}));
//# sourceMappingURL=editorContextKeys.js.map