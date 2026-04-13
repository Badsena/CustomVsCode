/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { RawContextKey } from '../../../../../platform/contextkey/common/contextkey.js';
import { localize } from '../../../../../nls.js';
import * as nls from '../../../../../nls.js';
export class InlineCompletionContextKeys {
    static { this.inlineSuggestionVisible = new RawContextKey('inlineSuggestionVisible', false, localize(1391, null)); }
    static { this.inlineSuggestionAlternativeActionVisible = new RawContextKey('inlineSuggestionAlternativeActionVisible', false, localize(1392, null)); }
    static { this.inlineSuggestionHasIndentation = new RawContextKey('inlineSuggestionHasIndentation', false, localize(1393, null)); }
    static { this.inlineSuggestionHasIndentationLessThanTabSize = new RawContextKey('inlineSuggestionHasIndentationLessThanTabSize', true, localize(1394, null)); }
    static { this.suppressSuggestions = new RawContextKey('inlineSuggestionSuppressSuggestions', undefined, localize(1395, null)); }
    static { this.cursorBeforeGhostText = new RawContextKey('cursorBeforeGhostText', false, localize(1396, null)); }
    static { this.cursorInIndentation = new RawContextKey('cursorInIndentation', false, localize(1397, null)); }
    static { this.hasSelection = new RawContextKey('editor.hasSelection', false, localize(1398, null)); }
    static { this.cursorAtInlineEdit = new RawContextKey('cursorAtInlineEdit', false, localize(1399, null)); }
    static { this.inlineEditVisible = new RawContextKey('inlineEditIsVisible', false, localize(1400, null)); }
    static { this.tabShouldJumpToInlineEdit = new RawContextKey('tabShouldJumpToInlineEdit', false, localize(1401, null)); }
    static { this.tabShouldAcceptInlineEdit = new RawContextKey('tabShouldAcceptInlineEdit', false, localize(1402, null)); }
    static { this.inInlineEditsPreviewEditor = new RawContextKey('inInlineEditsPreviewEditor', true, nls.localize(1403, null)); }
}
//# sourceMappingURL=inlineCompletionContextKeys.js.map