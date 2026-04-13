/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { localize } from '../../../../nls.js';
import { MenuId } from '../../../../platform/actions/common/actions.js';
import { Extensions } from '../../../../platform/configuration/common/configurationRegistry.js';
import { ContextKeyExpr, RawContextKey } from '../../../../platform/contextkey/common/contextkey.js';
import { Registry } from '../../../../platform/registry/common/platform.js';
import { diffInserted, diffRemoved, editorWidgetBackground, editorWidgetBorder, editorWidgetForeground, focusBorder, inputBackground, inputPlaceholderForeground, registerColor, transparent, widgetShadow } from '../../../../platform/theme/common/colorRegistry.js';
import { NOTEBOOK_IS_ACTIVE_EDITOR } from '../../notebook/common/notebookContextKeys.js';
// settings
export var InlineChatConfigKeys;
(function (InlineChatConfigKeys) {
    InlineChatConfigKeys["FinishOnType"] = "inlineChat.finishOnType";
    /** @deprecated do not read on client */
    InlineChatConfigKeys["EnableV2"] = "inlineChat.enableV2";
    InlineChatConfigKeys["notebookAgent"] = "inlineChat.notebookAgent";
    InlineChatConfigKeys["DefaultModel"] = "inlineChat.defaultModel";
    InlineChatConfigKeys["Affordance"] = "inlineChat.affordance";
    InlineChatConfigKeys["RenderMode"] = "inlineChat.renderMode";
    InlineChatConfigKeys["FixDiagnostics"] = "inlineChat.fixDiagnostics";
})(InlineChatConfigKeys || (InlineChatConfigKeys = {}));
Registry.as(Extensions.Configuration).registerConfiguration({
    id: 'editor',
    properties: {
        ["inlineChat.finishOnType" /* InlineChatConfigKeys.FinishOnType */]: {
            description: localize(11656, null),
            default: false,
            type: 'boolean'
        },
        ["inlineChat.enableV2" /* InlineChatConfigKeys.EnableV2 */]: {
            description: localize(11657, null),
            default: false,
            type: 'boolean',
            tags: ['preview'],
            experiment: {
                mode: 'auto'
            }
        },
        ["inlineChat.notebookAgent" /* InlineChatConfigKeys.notebookAgent */]: {
            markdownDescription: localize(11658, null),
            default: false,
            type: 'boolean',
            tags: ['experimental'],
            experiment: {
                mode: 'startup'
            }
        },
        ["inlineChat.affordance" /* InlineChatConfigKeys.Affordance */]: {
            description: localize(11659, null),
            default: 'off',
            type: 'string',
            enum: ['off', 'gutter', 'editor'],
            enumDescriptions: [
                localize(11660, null),
                localize(11661, null),
                localize(11662, null),
            ],
            experiment: {
                mode: 'auto'
            },
            tags: ['experimental']
        },
        ["inlineChat.renderMode" /* InlineChatConfigKeys.RenderMode */]: {
            description: localize(11663, null),
            default: 'hover',
            type: 'string',
            enum: ['zone', 'hover'],
            enumDescriptions: [
                localize(11664, null),
                localize(11665, null),
            ],
            experiment: {
                mode: 'auto'
            },
            tags: ['experimental']
        },
        ["inlineChat.fixDiagnostics" /* InlineChatConfigKeys.FixDiagnostics */]: {
            description: localize(11666, null),
            default: true,
            type: 'boolean',
            experiment: {
                mode: 'auto'
            },
            tags: ['experimental']
        }
    }
});
export const INLINE_CHAT_ID = 'interactiveEditor';
export const INTERACTIVE_EDITOR_ACCESSIBILITY_HELP_ID = 'interactiveEditorAccessiblityHelp';
// --- CONTEXT
export var InlineChatResponseType;
(function (InlineChatResponseType) {
    InlineChatResponseType["None"] = "none";
    InlineChatResponseType["Messages"] = "messages";
    InlineChatResponseType["MessagesAndEdits"] = "messagesAndEdits";
})(InlineChatResponseType || (InlineChatResponseType = {}));
export const CTX_INLINE_CHAT_POSSIBLE = new RawContextKey('inlineChatPossible', false, localize(11667, null));
export const CTX_INLINE_CHAT_HAS_AGENT2 = new RawContextKey('inlineChatHasEditsAgent', false, localize(11668, null));
export const CTX_INLINE_CHAT_HAS_NOTEBOOK_INLINE = new RawContextKey('inlineChatHasNotebookInline', false, localize(11669, null));
export const CTX_INLINE_CHAT_HAS_NOTEBOOK_AGENT = new RawContextKey('inlineChatHasNotebookAgent', false, localize(11670, null));
export const CTX_INLINE_CHAT_VISIBLE = new RawContextKey('inlineChatVisible', false, localize(11671, null));
export const CTX_INLINE_CHAT_FOCUSED = new RawContextKey('inlineChatFocused', false, localize(11672, null));
export const CTX_INLINE_CHAT_EDITING = new RawContextKey('inlineChatEditing', true, localize(11673, null));
export const CTX_INLINE_CHAT_RESPONSE_FOCUSED = new RawContextKey('inlineChatResponseFocused', false, localize(11674, null));
export const CTX_INLINE_CHAT_EMPTY = new RawContextKey('inlineChatEmpty', false, localize(11675, null));
export const CTX_INLINE_CHAT_INPUT_HAS_TEXT = new RawContextKey('inlineChatInputHasText', false, localize(11676, null));
export const CTX_INLINE_CHAT_INPUT_WIDGET_FOCUSED = new RawContextKey('inlineChatInputWidgetFocused', false, localize(11677, null));
export const CTX_INLINE_CHAT_INNER_CURSOR_FIRST = new RawContextKey('inlineChatInnerCursorFirst', false, localize(11678, null));
export const CTX_INLINE_CHAT_INNER_CURSOR_LAST = new RawContextKey('inlineChatInnerCursorLast', false, localize(11679, null));
export const CTX_INLINE_CHAT_OUTER_CURSOR_POSITION = new RawContextKey('inlineChatOuterCursorPosition', '', localize(11680, null));
export const CTX_INLINE_CHAT_HAS_STASHED_SESSION = new RawContextKey('inlineChatHasStashedSession', false, localize(11681, null));
export const CTX_INLINE_CHAT_CHANGE_HAS_DIFF = new RawContextKey('inlineChatChangeHasDiff', false, localize(11682, null));
export const CTX_INLINE_CHAT_CHANGE_SHOWS_DIFF = new RawContextKey('inlineChatChangeShowsDiff', false, localize(11683, null));
export const CTX_INLINE_CHAT_REQUEST_IN_PROGRESS = new RawContextKey('inlineChatRequestInProgress', false, localize(11684, null));
export const CTX_INLINE_CHAT_RESPONSE_TYPE = new RawContextKey('inlineChatResponseType', "none" /* InlineChatResponseType.None */, localize(11685, null));
export const CTX_INLINE_CHAT_FILE_BELONGS_TO_CHAT = new RawContextKey('inlineChatFileBelongsToChat', false, localize(11686, null));
export const CTX_INLINE_CHAT_PENDING_CONFIRMATION = new RawContextKey('inlineChatPendingConfirmation', false, localize(11687, null));
export const CTX_INLINE_CHAT_TERMINATED = new RawContextKey('inlineChatTerminated', false, localize(11688, null));
export const CTX_INLINE_CHAT_AFFORDANCE_VISIBLE = new RawContextKey('inlineChatAffordanceVisible', false, localize(11689, null));
export const CTX_INLINE_CHAT_V1_ENABLED = ContextKeyExpr.or(ContextKeyExpr.and(NOTEBOOK_IS_ACTIVE_EDITOR, CTX_INLINE_CHAT_HAS_NOTEBOOK_INLINE));
export const CTX_INLINE_CHAT_V2_ENABLED = ContextKeyExpr.or(CTX_INLINE_CHAT_HAS_AGENT2, ContextKeyExpr.and(NOTEBOOK_IS_ACTIVE_EDITOR, CTX_INLINE_CHAT_HAS_NOTEBOOK_AGENT));
export const CTX_HOVER_MODE = ContextKeyExpr.equals('config.inlineChat.renderMode', 'hover');
export const CTX_FIX_DIAGNOSTICS_ENABLED = ContextKeyExpr.equals('config.inlineChat.fixDiagnostics', true);
// --- (selected) action identifier
export const ACTION_START = 'inlineChat.start';
export const ACTION_ASK_IN_CHAT = 'inlineChat.askInChat';
export const ACTION_ACCEPT_CHANGES = 'inlineChat.acceptChanges';
export const ACTION_DISCARD_CHANGES = 'inlineChat.discardHunkChange';
export const ACTION_REGENERATE_RESPONSE = 'inlineChat.regenerate';
export const ACTION_VIEW_IN_CHAT = 'inlineChat.viewInChat';
export const ACTION_TOGGLE_DIFF = 'inlineChat.toggleDiff';
export const ACTION_REPORT_ISSUE = 'inlineChat.reportIssue';
// --- menus
export const MENU_INLINE_CHAT_WIDGET_STATUS = MenuId.for('inlineChatWidget.status');
export const MENU_INLINE_CHAT_WIDGET_SECONDARY = MenuId.for('inlineChatWidget.secondary');
export const MENU_INLINE_CHAT_ZONE = MenuId.for('inlineChatWidget.changesZone');
export const MENU_INLINE_CHAT_SIDE = MenuId.for('inlineChatWidget.side');
// --- colors
export const inlineChatForeground = registerColor('inlineChat.foreground', editorWidgetForeground, localize(11690, null));
export const inlineChatBackground = registerColor('inlineChat.background', editorWidgetBackground, localize(11691, null));
export const inlineChatBorder = registerColor('inlineChat.border', editorWidgetBorder, localize(11692, null));
export const inlineChatShadow = registerColor('inlineChat.shadow', widgetShadow, localize(11693, null));
export const inlineChatInputBorder = registerColor('inlineChatInput.border', editorWidgetBorder, localize(11694, null));
export const inlineChatInputFocusBorder = registerColor('inlineChatInput.focusBorder', focusBorder, localize(11695, null));
export const inlineChatInputPlaceholderForeground = registerColor('inlineChatInput.placeholderForeground', inputPlaceholderForeground, localize(11696, null));
export const inlineChatInputBackground = registerColor('inlineChatInput.background', inputBackground, localize(11697, null));
export const inlineChatDiffInserted = registerColor('inlineChatDiff.inserted', transparent(diffInserted, .5), localize(11698, null));
export const overviewRulerInlineChatDiffInserted = registerColor('editorOverviewRuler.inlineChatInserted', { dark: transparent(diffInserted, 0.6), light: transparent(diffInserted, 0.8), hcDark: transparent(diffInserted, 0.6), hcLight: transparent(diffInserted, 0.8) }, localize(11699, null));
export const minimapInlineChatDiffInserted = registerColor('editorMinimap.inlineChatInserted', { dark: transparent(diffInserted, 0.6), light: transparent(diffInserted, 0.8), hcDark: transparent(diffInserted, 0.6), hcLight: transparent(diffInserted, 0.8) }, localize(11700, null));
export const inlineChatDiffRemoved = registerColor('inlineChatDiff.removed', transparent(diffRemoved, .5), localize(11701, null));
export const overviewRulerInlineChatDiffRemoved = registerColor('editorOverviewRuler.inlineChatRemoved', { dark: transparent(diffRemoved, 0.6), light: transparent(diffRemoved, 0.8), hcDark: transparent(diffRemoved, 0.6), hcLight: transparent(diffRemoved, 0.8) }, localize(11702, null));
//# sourceMappingURL=inlineChat.js.map