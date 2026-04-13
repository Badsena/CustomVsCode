/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { RawContextKey } from '../../../../../platform/contextkey/common/contextkey.js';
import { localize } from '../../../../../nls.js';
export var DiffSide;
(function (DiffSide) {
    DiffSide[DiffSide["Original"] = 0] = "Original";
    DiffSide[DiffSide["Modified"] = 1] = "Modified";
})(DiffSide || (DiffSide = {}));
export const DIFF_CELL_MARGIN = 16;
export const NOTEBOOK_DIFF_CELL_INPUT = new RawContextKey('notebook.diffEditor.cell.inputChanged', false);
export const NOTEBOOK_DIFF_METADATA = new RawContextKey('notebook.diffEditor.metadataChanged', false);
export const NOTEBOOK_DIFF_CELL_IGNORE_WHITESPACE_KEY = 'notebook.diffEditor.cell.ignoreWhitespace';
export const NOTEBOOK_DIFF_CELL_IGNORE_WHITESPACE = new RawContextKey(NOTEBOOK_DIFF_CELL_IGNORE_WHITESPACE_KEY, false);
export const NOTEBOOK_DIFF_CELL_PROPERTY = new RawContextKey('notebook.diffEditor.cell.property.changed', false);
export const NOTEBOOK_DIFF_CELL_PROPERTY_EXPANDED = new RawContextKey('notebook.diffEditor.cell.property.expanded', false);
export const NOTEBOOK_DIFF_CELLS_COLLAPSED = new RawContextKey('notebook.diffEditor.allCollapsed', undefined, localize(13055, null));
export const NOTEBOOK_DIFF_HAS_UNCHANGED_CELLS = new RawContextKey('notebook.diffEditor.hasUnchangedCells', undefined, localize(13056, null));
export const NOTEBOOK_DIFF_UNCHANGED_CELLS_HIDDEN = new RawContextKey('notebook.diffEditor.unchangedCellsAreHidden', undefined, localize(13057, null));
export const NOTEBOOK_DIFF_ITEM_KIND = new RawContextKey('notebook.diffEditor.item.kind', undefined, localize(13058, null));
export const NOTEBOOK_DIFF_ITEM_DIFF_STATE = new RawContextKey('notebook.diffEditor.item.state', undefined, localize(13059, null));
//# sourceMappingURL=notebookDiffEditorBrowser.js.map