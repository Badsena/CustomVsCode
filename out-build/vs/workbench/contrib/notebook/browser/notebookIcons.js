/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Codicon } from '../../../../base/common/codicons.js';
import { localize } from '../../../../nls.js';
import { registerIcon } from '../../../../platform/theme/common/iconRegistry.js';
export const selectKernelIcon = registerIcon('notebook-kernel-select', Codicon.serverEnvironment, localize(13211, null));
export const executeIcon = registerIcon('notebook-execute', Codicon.play, localize(13212, null));
export const executeAboveIcon = registerIcon('notebook-execute-above', Codicon.runAbove, localize(13213, null));
export const executeBelowIcon = registerIcon('notebook-execute-below', Codicon.runBelow, localize(13214, null));
export const stopIcon = registerIcon('notebook-stop', Codicon.primitiveSquare, localize(13215, null));
export const deleteCellIcon = registerIcon('notebook-delete-cell', Codicon.trash, localize(13216, null));
export const executeAllIcon = registerIcon('notebook-execute-all', Codicon.runAll, localize(13217, null));
export const editIcon = registerIcon('notebook-edit', Codicon.pencil, localize(13218, null));
export const stopEditIcon = registerIcon('notebook-stop-edit', Codicon.check, localize(13219, null));
export const moveUpIcon = registerIcon('notebook-move-up', Codicon.arrowUp, localize(13220, null));
export const moveDownIcon = registerIcon('notebook-move-down', Codicon.arrowDown, localize(13221, null));
export const clearIcon = registerIcon('notebook-clear', Codicon.clearAll, localize(13222, null));
export const splitCellIcon = registerIcon('notebook-split-cell', Codicon.splitVertical, localize(13223, null));
export const successStateIcon = registerIcon('notebook-state-success', Codicon.check, localize(13224, null));
export const errorStateIcon = registerIcon('notebook-state-error', Codicon.error, localize(13225, null));
export const pendingStateIcon = registerIcon('notebook-state-pending', Codicon.clock, localize(13226, null));
export const executingStateIcon = registerIcon('notebook-state-executing', Codicon.sync, localize(13227, null));
export const collapsedIcon = registerIcon('notebook-collapsed', Codicon.chevronRight, localize(13228, null));
export const expandedIcon = registerIcon('notebook-expanded', Codicon.chevronDown, localize(13229, null));
export const openAsTextIcon = registerIcon('notebook-open-as-text', Codicon.fileCode, localize(13230, null));
export const revertIcon = registerIcon('notebook-revert', Codicon.discard, localize(13231, null));
export const toggleWhitespace = registerIcon('notebook-diff-cell-toggle-whitespace', Codicon.whitespace, localize(13232, null));
export const renderOutputIcon = registerIcon('notebook-render-output', Codicon.preview, localize(13233, null));
export const mimetypeIcon = registerIcon('notebook-mimetype', Codicon.code, localize(13234, null));
export const copyIcon = registerIcon('notebook-copy', Codicon.copy, localize(13235, null));
export const saveIcon = registerIcon('notebook-save', Codicon.save, localize(13236, null));
export const previousChangeIcon = registerIcon('notebook-diff-editor-previous-change', Codicon.arrowUp, localize(13237, null));
export const nextChangeIcon = registerIcon('notebook-diff-editor-next-change', Codicon.arrowDown, localize(13238, null));
export const variablesViewIcon = registerIcon('variables-view-icon', Codicon.variableGroup, localize(13239, null));
//# sourceMappingURL=notebookIcons.js.map