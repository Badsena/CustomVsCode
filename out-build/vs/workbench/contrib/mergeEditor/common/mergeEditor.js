/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { localize } from '../../../../nls.js';
import { RawContextKey } from '../../../../platform/contextkey/common/contextkey.js';
export const ctxIsMergeEditor = new RawContextKey('isMergeEditor', false, { type: 'boolean', description: localize(12709, null) });
export const ctxIsMergeResultEditor = new RawContextKey('isMergeResultEditor', false, { type: 'boolean', description: localize(12710, null) });
export const ctxMergeEditorLayout = new RawContextKey('mergeEditorLayout', 'mixed', { type: 'string', description: localize(12711, null) });
export const ctxMergeEditorShowBase = new RawContextKey('mergeEditorShowBase', false, { type: 'boolean', description: localize(12712, null) });
export const ctxMergeEditorShowBaseAtTop = new RawContextKey('mergeEditorShowBaseAtTop', false, { type: 'boolean', description: localize(12713, null) });
export const ctxMergeEditorShowNonConflictingChanges = new RawContextKey('mergeEditorShowNonConflictingChanges', false, { type: 'boolean', description: localize(12714, null) });
export const ctxMergeBaseUri = new RawContextKey('mergeEditorBaseUri', '', { type: 'string', description: localize(12715, null) });
export const ctxMergeResultUri = new RawContextKey('mergeEditorResultUri', '', { type: 'string', description: localize(12716, null) });
export const StorageCloseWithConflicts = 'mergeEditorCloseWithConflicts';
//# sourceMappingURL=mergeEditor.js.map