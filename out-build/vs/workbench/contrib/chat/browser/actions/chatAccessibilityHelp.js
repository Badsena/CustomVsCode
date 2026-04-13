/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { AccessibleDiffViewerNext } from '../../../../../editor/browser/widget/diffEditor/commands.js';
import { localize } from '../../../../../nls.js';
import { AccessibleContentProvider } from '../../../../../platform/accessibility/browser/accessibleView.js';
import { ContextKeyExpr } from '../../../../../platform/contextkey/common/contextkey.js';
import { IKeybindingService } from '../../../../../platform/keybinding/common/keybinding.js';
import { INLINE_CHAT_ID } from '../../../inlineChat/common/inlineChat.js';
import { ChatContextKeyExprs, ChatContextKeys } from '../../common/actions/chatContextKeys.js';
import { ChatAgentLocation, ChatConfiguration, ChatModeKind } from '../../common/constants.js';
import { FocusAgentSessionsAction } from '../agentSessions/agentSessionsActions.js';
import { IChatWidgetService } from '../chat.js';
import { ChatEditingShowChangesAction, ViewPreviousEditsAction } from '../chatEditing/chatEditingActions.js';
export class PanelChatAccessibilityHelp {
    constructor() {
        this.priority = 107;
        this.name = 'panelChat';
        this.type = "help" /* AccessibleViewType.Help */;
        this.when = ContextKeyExpr.and(ChatContextKeys.location.isEqualTo(ChatAgentLocation.Chat), ChatContextKeys.inQuickChat.negate(), ChatContextKeys.chatModeKind.isEqualTo(ChatModeKind.Ask), ContextKeyExpr.or(ChatContextKeys.inChatSession, ChatContextKeys.isResponse, ChatContextKeys.isRequest));
    }
    getProvider(accessor) {
        return getChatAccessibilityHelpProvider(accessor, undefined, 'panelChat');
    }
}
export class QuickChatAccessibilityHelp {
    constructor() {
        this.priority = 107;
        this.name = 'quickChat';
        this.type = "help" /* AccessibleViewType.Help */;
        this.when = ContextKeyExpr.and(ChatContextKeys.inQuickChat, ContextKeyExpr.or(ChatContextKeys.inChatSession, ChatContextKeys.isResponse, ChatContextKeys.isRequest));
    }
    getProvider(accessor) {
        return getChatAccessibilityHelpProvider(accessor, undefined, 'quickChat');
    }
}
export class EditsChatAccessibilityHelp {
    constructor() {
        this.priority = 119;
        this.name = 'editsView';
        this.type = "help" /* AccessibleViewType.Help */;
        this.when = ContextKeyExpr.and(ChatContextKeyExprs.inEditingMode, ChatContextKeys.inChatInput);
    }
    getProvider(accessor) {
        return getChatAccessibilityHelpProvider(accessor, undefined, 'editsView');
    }
}
export class AgentChatAccessibilityHelp {
    constructor() {
        this.priority = 120;
        this.name = 'agentView';
        this.type = "help" /* AccessibleViewType.Help */;
        this.when = ContextKeyExpr.and(ChatContextKeys.chatModeKind.isEqualTo(ChatModeKind.Agent), ChatContextKeys.inChatInput);
    }
    getProvider(accessor) {
        return getChatAccessibilityHelpProvider(accessor, undefined, 'agentView');
    }
}
export function getAccessibilityHelpText(type, keybindingService) {
    const content = [];
    if (type === 'panelChat' || type === 'quickChat' || type === 'agentView') {
        if (type === 'quickChat') {
            content.push(localize(5782, null));
            content.push(localize(5783, null));
        }
        else {
            content.push(localize(5784, null));
            content.push(localize(5785, null, '<keybinding:workbench.action.chat.newChat>'));
            content.push(localize(5786, null, '<keybinding:workbench.action.chat.history>'));
            content.push(localize(5787, null, `<keybinding:${FocusAgentSessionsAction.id}>`));
        }
        content.push(localize(5788, null));
        content.push(localize(5789, null));
        content.push(localize(5790, null, '<keybinding:editor.action.accessibleView>'));
        content.push(localize(5791, null));
        content.push(localize(5792, null, getChatFocusKeybindingLabel(keybindingService, type, 'last')));
        content.push(localize(5793, null, getChatFocusKeybindingLabel(keybindingService, type, 'lastFocused')));
        content.push(localize(5794, null, getChatFocusKeybindingLabel(keybindingService, type, 'input')));
        content.push(localize(5795, null));
        content.push(localize(5796, null));
        content.push(localize(5797, null, '<keybinding:workbench.action.chat.nextCodeBlock>'));
        content.push(localize(5798, null, '<keybinding:workbench.action.chat.nextUserPrompt>'));
        content.push(localize(5799, null, '<keybinding:workbench.action.chat.previousUserPrompt>'));
        content.push(localize(5800, null, '<keybinding:workbench.action.chat.focusConfirmation>'));
        content.push(localize(5801, null, '<keybinding:workbench.action.terminal.chat.viewHiddenChatTerminals>'));
        content.push(localize(5802, null, `<keybinding:${"workbench.action.terminal.chat.focusMostRecentChatTerminal" /* TerminalContribCommandId.FocusMostRecentChatTerminal */}>`));
        content.push(localize(5803, null, `<keybinding:${"workbench.action.terminal.chat.focusMostRecentChatTerminalOutput" /* TerminalContribCommandId.FocusMostRecentChatTerminalOutput */}>`));
        content.push(localize(5804, null, '<keybinding:workbench.action.chat.focusQuestionCarousel>'));
        content.push(localize(5805, null, '<keybinding:workbench.action.chat.previousQuestion>'));
        content.push(localize(5806, null, '<keybinding:workbench.action.chat.nextQuestion>'));
        content.push(localize(5807, null, '<keybinding:workbench.action.chat.focusTip>'));
    }
    if (type === 'editsView' || type === 'agentView') {
        if (type === 'agentView') {
            content.push(localize(5808, null));
        }
        else {
            content.push(localize(5809, null));
        }
        content.push(localize(5810, null));
        content.push(localize(5811, null));
        content.push(localize(5812, null));
        content.push(localize(5813, null, '<keybinding:chatEditor.action.navigatePrevious>', '<keybinding:chatEditor.action.navigateNext>'));
        content.push(localize(5814, null, '<keybinding:chatEditor.action.acceptHunk>', '<keybinding:chatEditor.action.undoHunk>', '<keybinding:chatEditor.action.toggleDiff>'));
        content.push(localize(5815, null));
        if (type === 'agentView') {
            content.push(localize(5816, null));
            content.push(localize(5817, null, '<keybinding:workbench.action.chat.acceptTool>'));
            content.push(localize(5818, null, ChatConfiguration.GlobalAutoApprove, 'true'));
            content.push(localize(5819, null, '<keybinding:workbench.action.chat.acceptTool>'));
            content.push(localize(5820, null));
            content.push(localize(5821, null, '<keybinding:workbench.action.chat.focusTodosView>'));
        }
        content.push(localize(5822, null));
        content.push(localize(5823, null, '<keybinding:workbench.action.chat.undoEdits>'));
        content.push(localize(5824, null, '<keybinding:workbench.action.chat.restoreLastCheckpoint>'));
        content.push(localize(5825, null, '<keybinding:workbench.action.chat.editing.attachFiles>'));
        content.push(localize(5826, null, '<keybinding:chatEditing.removeFileFromWorkingSet>'));
        content.push(localize(5827, null, '<keybinding:chatEditing.acceptFile>', '<keybinding:chatEditing.discardFile>'));
        content.push(localize(5828, null, '<keybinding:chatEditing.saveAllFiles>'));
        content.push(localize(5829, null, '<keybinding:chatEditing.acceptAllFiles>'));
        content.push(localize(5830, null, '<keybinding:chatEditing.discardAllFiles>'));
        content.push(localize(5831, null, '<keybinding:chatEditing.openFileInDiff>'));
        content.push(`- ${ChatEditingShowChangesAction.LABEL}<keybinding:chatEditing.viewChanges>`);
        content.push(`- ${ViewPreviousEditsAction.Label}<keybinding:chatEditing.viewPreviousEdits>`);
    }
    else {
        content.push(localize(5832, null));
        content.push(localize(5833, null, '<keybinding:inlineChat.start>'));
        content.push(localize(5834, null, '<keybinding:history.showPrevious>', '<keybinding:history.showNext>'));
        content.push(localize(5835, null, '<keybinding:editor.action.accessibleView>'));
        content.push(localize(5836, null));
        content.push(localize(5837, null));
        content.push(localize(5838, null, AccessibleDiffViewerNext.id));
        content.push(localize(5839, null));
    }
    content.push(localize(5840, null));
    return content.join('\n');
}
export function getChatAccessibilityHelpProvider(accessor, editor, type) {
    const widgetService = accessor.get(IChatWidgetService);
    const keybindingService = accessor.get(IKeybindingService);
    const inputEditor = widgetService.lastFocusedWidget?.inputEditor;
    if (!inputEditor) {
        return;
    }
    const domNode = inputEditor.getDomNode() ?? undefined;
    if (!domNode) {
        return;
    }
    const cachedPosition = inputEditor.getPosition();
    inputEditor.getSupportedActions();
    const helpText = getAccessibilityHelpText(type, keybindingService);
    return new AccessibleContentProvider(type === 'panelChat' ? "panelChat" /* AccessibleViewProviderId.PanelChat */ : type === 'inlineChat' ? "inlineChat" /* AccessibleViewProviderId.InlineChat */ : type === 'agentView' ? "agentChat" /* AccessibleViewProviderId.AgentChat */ : "quickChat" /* AccessibleViewProviderId.QuickChat */, { type: "help" /* AccessibleViewType.Help */ }, () => helpText, () => {
        if (type === 'quickChat' || type === 'editsView' || type === 'agentView' || type === 'panelChat') {
            if (cachedPosition) {
                inputEditor.setPosition(cachedPosition);
            }
            inputEditor.focus();
        }
        else if (type === 'inlineChat') {
            // TODO@jrieken find a better way for this
            const ctrl = editor?.getContribution(INLINE_CHAT_ID);
            ctrl?.focus();
        }
    }, type === 'inlineChat' ? "accessibility.verbosity.inlineChat" /* AccessibilityVerbositySettingId.InlineChat */ : "accessibility.verbosity.panelChat" /* AccessibilityVerbositySettingId.Chat */);
}
// The when clauses for actions may not be true when we invoke the accessible view, so we need to provide the keybinding label manually
// to ensure it's correct
function getChatFocusKeybindingLabel(keybindingService, type, focus) {
    let kbs;
    const fallback = ' (unassigned keybinding)';
    if (focus === 'input') {
        kbs = keybindingService.lookupKeybindings('workbench.action.chat.focusInput');
    }
    else if (focus === 'lastFocused') {
        kbs = keybindingService.lookupKeybindings('workbench.chat.action.focusLastFocused');
    }
    else {
        kbs = keybindingService.lookupKeybindings('chat.action.focus');
    }
    if (!kbs?.length) {
        return fallback;
    }
    let kb;
    if (type === 'agentView' || type === 'panelChat') {
        if (focus !== 'input') {
            kb = kbs.find(kb => kb.getAriaLabel()?.includes('UpArrow'))?.getAriaLabel();
        }
        else {
            kb = kbs.find(kb => kb.getAriaLabel()?.includes('DownArrow'))?.getAriaLabel();
        }
    }
    else {
        // Quick chat
        if (focus !== 'input') {
            kb = kbs.find(kb => kb.getAriaLabel()?.includes('DownArrow'))?.getAriaLabel();
        }
        else {
            kb = kbs.find(kb => kb.getAriaLabel()?.includes('UpArrow'))?.getAriaLabel();
        }
    }
    return !!kb ? ` (${kb})` : fallback;
}
//# sourceMappingURL=chatAccessibilityHelp.js.map