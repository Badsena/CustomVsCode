/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { MarkdownString } from '../../../../base/common/htmlContent.js';
import { localize } from '../../../../nls.js';
import { ContextKeyExpr } from '../../../../platform/contextkey/common/contextkey.js';
import { MenuRegistry } from '../../../../platform/actions/common/actions.js';
import { ChatContextKeys } from '../common/actions/chatContextKeys.js';
import { ChatConfiguration, ChatModeKind } from '../common/constants.js';
import { localChatSessionType } from '../common/chatSessionsService.js';
import { TipTrackingCommands } from './chatTipStorageKeys.js';
import { GENERATE_AGENT_COMMAND_ID, GENERATE_AGENT_INSTRUCTIONS_COMMAND_ID, GENERATE_PROMPT_COMMAND_ID, GENERATE_SKILL_COMMAND_ID, INSERT_FORK_CONVERSATION_COMMAND_ID, INSERT_TROUBLESHOOT_COMMAND_ID, } from './actions/chatActions.js';
export var ChatTipTier;
(function (ChatTipTier) {
    ChatTipTier["Foundational"] = "foundational";
    ChatTipTier["Qol"] = "qol";
})(ChatTipTier || (ChatTipTier = {}));
/**
 * Gets the display label for a command, looking it up from MenuRegistry.
 * Falls back to extracting a readable name from the command ID.
 */
export function getCommandLabel(commandId) {
    const command = MenuRegistry.getCommand(commandId);
    if (command?.title) {
        // Handle both string and ILocalizedString formats
        return typeof command.title === 'string' ? command.title : command.title.value;
    }
    // Fallback: extract readable name from command ID
    // e.g., 'workbench.action.chat.openEditSession' -> 'openEditSession'
    const parts = commandId.split('.');
    return parts[parts.length - 1];
}
/**
 * Formats a keybinding for display in a tip message.
 * Returns empty string if no keybinding is bound.
 */
function formatKeybinding(ctx, commandId) {
    const kb = ctx.keybindingService.lookupKeybinding(commandId);
    return kb ? ` (${kb.getLabel()})` : '';
}
/**
 * Extracts command IDs from command: links in a markdown string.
 * Used to automatically populate enabledCommands for trusted markdown.
 */
export function extractCommandIds(markdown) {
    const commandPattern = /\[.*?\]\(command:([^?\s)]+)/g;
    const commands = new Set();
    let match;
    while ((match = commandPattern.exec(markdown)) !== null) {
        commands.add(match[1]);
    }
    return [...commands];
}
// -----------------------------------------------------------------------------
// Tip Catalog
// -----------------------------------------------------------------------------
/**
 * Static catalog of tips. Tips are built dynamically at runtime to enable
 * keybindings and command labels to be resolved fresh.
 */
export const TIP_CATALOG = [
    {
        id: 'tip.switchToAuto',
        tier: "foundational" /* ChatTipTier.Foundational */,
        priority: 0,
        buildMessage(_ctx) {
            return new MarkdownString(localize(7526, null));
        },
        onlyWhenModelIds: ['gpt-4.1'],
    },
    {
        id: 'tip.init',
        tier: "foundational" /* ChatTipTier.Foundational */,
        priority: 50,
        buildMessage(ctx) {
            const kb = formatKeybinding(ctx, GENERATE_AGENT_INSTRUCTIONS_COMMAND_ID);
            return new MarkdownString(localize(7527, null, '/init', GENERATE_AGENT_INSTRUCTIONS_COMMAND_ID, kb));
        },
        when: ChatContextKeys.chatSessionType.isEqualTo(localChatSessionType),
        excludeWhenCommandsExecuted: [
            GENERATE_AGENT_INSTRUCTIONS_COMMAND_ID,
            TipTrackingCommands.CreateAgentInstructionsUsed,
        ],
    },
    {
        id: 'tip.createPrompt',
        tier: "foundational" /* ChatTipTier.Foundational */,
        buildMessage(ctx) {
            const kb = formatKeybinding(ctx, GENERATE_PROMPT_COMMAND_ID);
            return new MarkdownString(localize(7528, null, '/create-prompt', GENERATE_PROMPT_COMMAND_ID, kb));
        },
        when: ChatContextKeys.chatSessionType.isEqualTo(localChatSessionType),
        excludeWhenCommandsExecuted: [
            GENERATE_PROMPT_COMMAND_ID,
            TipTrackingCommands.CreatePromptUsed,
        ],
    },
    {
        id: 'tip.createAgent',
        tier: "foundational" /* ChatTipTier.Foundational */,
        priority: 30,
        buildMessage(ctx) {
            const kb = formatKeybinding(ctx, GENERATE_AGENT_COMMAND_ID);
            return new MarkdownString(localize(7529, null, '/create-agent', GENERATE_AGENT_COMMAND_ID, kb));
        },
        when: ChatContextKeys.chatSessionType.isEqualTo(localChatSessionType),
        excludeWhenCommandsExecuted: [
            GENERATE_AGENT_COMMAND_ID,
            TipTrackingCommands.CreateAgentUsed,
        ],
    },
    {
        id: 'tip.createSkill',
        tier: "foundational" /* ChatTipTier.Foundational */,
        priority: 40,
        buildMessage(ctx) {
            const kb = formatKeybinding(ctx, GENERATE_SKILL_COMMAND_ID);
            return new MarkdownString(localize(7530, null, '/create-skill', GENERATE_SKILL_COMMAND_ID, kb));
        },
        when: ChatContextKeys.chatSessionType.isEqualTo(localChatSessionType),
        excludeWhenCommandsExecuted: [
            GENERATE_SKILL_COMMAND_ID,
            TipTrackingCommands.CreateSkillUsed,
        ],
    },
    {
        id: 'tip.planMode',
        tier: "foundational" /* ChatTipTier.Foundational */,
        priority: 20,
        buildMessage(ctx) {
            const kb = formatKeybinding(ctx, 'workbench.action.chat.openPlan');
            return new MarkdownString(localize(7531, null, 'Plan agent', kb));
        },
        when: ChatContextKeys.chatModeName.notEqualsTo('Plan'),
        excludeWhenCommandsExecuted: ['workbench.action.chat.openPlan'],
        excludeWhenModesUsed: ['Plan'],
    },
    {
        id: 'tip.attachFiles',
        tier: "qol" /* ChatTipTier.Qol */,
        buildMessage() {
            return new MarkdownString(localize(7532, null));
        },
        excludeWhenCommandsExecuted: [
            'workbench.action.chat.attachContext',
            'workbench.action.chat.attachFile',
            'workbench.action.chat.attachFolder',
            'workbench.action.chat.attachSelection',
            TipTrackingCommands.AttachFilesReferenceUsed,
        ],
    },
    {
        id: 'tip.codeActions',
        tier: "qol" /* ChatTipTier.Qol */,
        buildMessage() {
            return new MarkdownString(localize(7533, null));
        },
        excludeWhenCommandsExecuted: ['inlineChat.start'],
    },
    {
        id: 'tip.undoChanges',
        tier: "qol" /* ChatTipTier.Qol */,
        buildMessage() {
            return new MarkdownString(localize(7534, null));
        },
        when: ContextKeyExpr.and(ChatContextKeys.chatSessionType.isEqualTo(localChatSessionType), ContextKeyExpr.or(ChatContextKeys.chatModeKind.isEqualTo(ChatModeKind.Agent), ChatContextKeys.chatModeKind.isEqualTo(ChatModeKind.Edit))),
        excludeWhenCommandsExecuted: ['workbench.action.chat.restoreCheckpoint', 'workbench.action.chat.restoreLastCheckpoint'],
    },
    {
        id: 'tip.messageQueueing',
        tier: "qol" /* ChatTipTier.Qol */,
        buildMessage() {
            return new MarkdownString(localize(7535, null));
        },
        when: ChatContextKeys.chatModeKind.isEqualTo(ChatModeKind.Agent),
        excludeWhenCommandsExecuted: ['workbench.action.chat.queueMessage', 'workbench.action.chat.steerWithMessage'],
    },
    {
        id: 'tip.forkConversation',
        tier: "qol" /* ChatTipTier.Qol */,
        buildMessage(ctx) {
            const kb = formatKeybinding(ctx, INSERT_FORK_CONVERSATION_COMMAND_ID);
            return new MarkdownString(localize(7536, null, '/fork', INSERT_FORK_CONVERSATION_COMMAND_ID, kb));
        },
        excludeWhenCommandsExecuted: [
            INSERT_FORK_CONVERSATION_COMMAND_ID,
            'workbench.action.chat.forkConversation',
            TipTrackingCommands.ForkConversationUsed,
        ],
    },
    {
        id: 'tip.agenticBrowser',
        tier: "qol" /* ChatTipTier.Qol */,
        buildMessage() {
            return new MarkdownString(localize(7537, null, 'agentic browser integration'));
        },
        when: ContextKeyExpr.and(ChatContextKeys.chatModeKind.isEqualTo(ChatModeKind.Agent), ContextKeyExpr.notEquals('config.workbench.browser.enableChatTools', true)),
        excludeWhenSettingsChanged: ['workbench.browser.enableChatTools'],
        dismissWhenCommandsClicked: ['workbench.action.openSettings'],
    },
    {
        id: 'tip.mermaid',
        tier: "qol" /* ChatTipTier.Qol */,
        buildMessage() {
            return new MarkdownString(localize(7538, null));
        },
        when: ChatContextKeys.chatModeKind.isEqualTo(ChatModeKind.Agent),
        excludeWhenToolsInvoked: ['renderMermaidDiagram'],
    },
    {
        id: 'tip.subagents',
        tier: "qol" /* ChatTipTier.Qol */,
        buildMessage() {
            return new MarkdownString(localize(7539, null));
        },
        when: ChatContextKeys.chatModeKind.isEqualTo(ChatModeKind.Agent),
        excludeWhenToolsInvoked: ['runSubagent'],
    },
    {
        id: 'tip.thinkingPhrases',
        tier: "qol" /* ChatTipTier.Qol */,
        buildMessage() {
            return new MarkdownString(localize(7540, null, 'thinking phrases', ChatConfiguration.ThinkingPhrases));
        },
        when: ChatContextKeys.chatModeKind.isEqualTo(ChatModeKind.Agent),
        excludeWhenSettingsChanged: [ChatConfiguration.ThinkingPhrases],
        dismissWhenCommandsClicked: ['workbench.action.openSettings'],
    },
    {
        id: 'tip.autoAcceptDelay',
        tier: "qol" /* ChatTipTier.Qol */,
        buildMessage() {
            return new MarkdownString(localize(7541, null, 'auto-accept delay'));
        },
        when: ContextKeyExpr.or(ChatContextKeys.chatModeKind.isEqualTo(ChatModeKind.Agent), ChatContextKeys.chatModeKind.isEqualTo(ChatModeKind.Edit)),
        excludeWhenSettingsChanged: ['chat.editing.autoAcceptDelay'],
        dismissWhenCommandsClicked: ['workbench.action.openSettings'],
    },
    {
        id: 'tip.troubleshoot',
        tier: "qol" /* ChatTipTier.Qol */,
        buildMessage(ctx) {
            const kb = formatKeybinding(ctx, INSERT_TROUBLESHOOT_COMMAND_ID);
            return new MarkdownString(localize(7542, null, '/troubleshoot', INSERT_TROUBLESHOOT_COMMAND_ID, kb));
        },
        when: ChatContextKeys.chatSessionType.isEqualTo(localChatSessionType),
        excludeWhenToolsInvoked: ['listDebugEvents'],
    },
];
//# sourceMappingURL=chatTipCatalog.js.map