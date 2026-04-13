/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Schemas } from '../../../../base/common/network.js';
import { IChatSessionsService } from './chatSessionsService.js';
import { RawContextKey } from '../../../../platform/contextkey/common/contextkey.js';
export var ChatConfiguration;
(function (ChatConfiguration) {
    ChatConfiguration["AIDisabled"] = "chat.disableAIFeatures";
    ChatConfiguration["PluginsEnabled"] = "chat.plugins.enabled";
    ChatConfiguration["PluginLocations"] = "chat.pluginLocations";
    ChatConfiguration["PluginMarketplaces"] = "chat.plugins.marketplaces";
    ChatConfiguration["AgentEnabled"] = "chat.agent.enabled";
    ChatConfiguration["PlanAgentDefaultModel"] = "chat.planAgent.defaultModel";
    ChatConfiguration["ExploreAgentDefaultModel"] = "chat.exploreAgent.defaultModel";
    ChatConfiguration["RequestQueueingDefaultAction"] = "chat.requestQueuing.defaultAction";
    ChatConfiguration["AgentStatusEnabled"] = "chat.agentsControl.enabled";
    ChatConfiguration["EditorAssociations"] = "chat.editorAssociations";
    ChatConfiguration["UnifiedAgentsBar"] = "chat.unifiedAgentsBar.enabled";
    ChatConfiguration["AgentSessionProjectionEnabled"] = "chat.agentSessionProjection.enabled";
    ChatConfiguration["EditModeHidden"] = "chat.editMode.hidden";
    ChatConfiguration["ExtensionToolsEnabled"] = "chat.extensionTools.enabled";
    ChatConfiguration["RepoInfoEnabled"] = "chat.repoInfo.enabled";
    ChatConfiguration["EditRequests"] = "chat.editRequests";
    ChatConfiguration["InlineReferencesStyle"] = "chat.inlineReferences.style";
    ChatConfiguration["AutoReply"] = "chat.autoReply";
    ChatConfiguration["GlobalAutoApprove"] = "chat.tools.global.autoApprove";
    ChatConfiguration["AutoApproveEdits"] = "chat.tools.edits.autoApprove";
    ChatConfiguration["AutoApprovedUrls"] = "chat.tools.urls.autoApprove";
    ChatConfiguration["EligibleForAutoApproval"] = "chat.tools.eligibleForAutoApproval";
    ChatConfiguration["EnableMath"] = "chat.math.enabled";
    ChatConfiguration["CheckpointsEnabled"] = "chat.checkpoints.enabled";
    ChatConfiguration["ThinkingStyle"] = "chat.agent.thinkingStyle";
    ChatConfiguration["ThinkingGenerateTitles"] = "chat.agent.thinking.generateTitles";
    ChatConfiguration["TerminalToolsInThinking"] = "chat.agent.thinking.terminalTools";
    ChatConfiguration["SimpleTerminalCollapsible"] = "chat.tools.terminal.simpleCollapsible";
    ChatConfiguration["ThinkingPhrases"] = "chat.agent.thinking.phrases";
    ChatConfiguration["AutoExpandToolFailures"] = "chat.tools.autoExpandFailures";
    ChatConfiguration["TodosShowWidget"] = "chat.tools.todos.showWidget";
    ChatConfiguration["NotifyWindowOnConfirmation"] = "chat.notifyWindowOnConfirmation";
    ChatConfiguration["NotifyWindowOnResponseReceived"] = "chat.notifyWindowOnResponseReceived";
    ChatConfiguration["ChatViewSessionsEnabled"] = "chat.viewSessions.enabled";
    ChatConfiguration["ChatViewSessionsGrouping"] = "chat.viewSessions.grouping";
    ChatConfiguration["ChatViewSessionsOrientation"] = "chat.viewSessions.orientation";
    ChatConfiguration["ChatViewProgressBadgeEnabled"] = "chat.viewProgressBadge.enabled";
    ChatConfiguration["ChatContextUsageEnabled"] = "chat.contextUsage.enabled";
    ChatConfiguration["SubagentToolCustomAgents"] = "chat.customAgentInSubagent.enabled";
    ChatConfiguration["ShowCodeBlockProgressAnimation"] = "chat.agent.codeBlockProgress";
    ChatConfiguration["RestoreLastPanelSession"] = "chat.restoreLastPanelSession";
    ChatConfiguration["ExitAfterDelegation"] = "chat.exitAfterDelegation";
    ChatConfiguration["ExplainChangesEnabled"] = "chat.editing.explainChanges.enabled";
    ChatConfiguration["GrowthNotificationEnabled"] = "chat.growthNotification.enabled";
    ChatConfiguration["ChatCustomizationMenuEnabled"] = "chat.customizationsMenu.enabled";
    ChatConfiguration["ChatCustomizationHarnessSelectorEnabled"] = "chat.customizations.harnessSelector.enabled";
    ChatConfiguration["AutopilotEnabled"] = "chat.autopilot.enabled";
    ChatConfiguration["ImageCarouselEnabled"] = "chat.imageCarousel.enabled";
    ChatConfiguration["ArtifactsEnabled"] = "chat.artifacts.enabled";
})(ChatConfiguration || (ChatConfiguration = {}));
/**
 * The "kind" of agents for custom agents.
 */
export var ChatModeKind;
(function (ChatModeKind) {
    ChatModeKind["Ask"] = "ask";
    ChatModeKind["Edit"] = "edit";
    ChatModeKind["Agent"] = "agent";
})(ChatModeKind || (ChatModeKind = {}));
export function validateChatMode(mode) {
    switch (mode) {
        case ChatModeKind.Ask:
        case ChatModeKind.Edit:
        case ChatModeKind.Agent:
            return mode;
        default:
            return undefined;
    }
}
/**
 * The permission level controlling tool auto-approval behavior.
 */
export var ChatPermissionLevel;
(function (ChatPermissionLevel) {
    /** Use existing auto-approve settings */
    ChatPermissionLevel["Default"] = "default";
    /** Auto-approve all tool calls, auto-retry on error */
    ChatPermissionLevel["AutoApprove"] = "autoApprove";
    /** Everything AutoApprove does plus an internal stop hook that continues until the task is done */
    ChatPermissionLevel["Autopilot"] = "autopilot";
})(ChatPermissionLevel || (ChatPermissionLevel = {}));
/**
 * Returns true if the permission level enables auto-approval of all tool calls.
 * Both {@link ChatPermissionLevel.AutoApprove} and {@link ChatPermissionLevel.Autopilot} enable auto-approval.
 */
export function isAutoApproveLevel(level) {
    return level === ChatPermissionLevel.AutoApprove || level === ChatPermissionLevel.Autopilot;
}
export function isChatMode(mode) {
    return !!validateChatMode(mode);
}
// Thinking display modes for pinned content
export var ThinkingDisplayMode;
(function (ThinkingDisplayMode) {
    ThinkingDisplayMode["Collapsed"] = "collapsed";
    ThinkingDisplayMode["CollapsedPreview"] = "collapsedPreview";
    ThinkingDisplayMode["FixedScrolling"] = "fixedScrolling";
})(ThinkingDisplayMode || (ThinkingDisplayMode = {}));
export var CollapsedToolsDisplayMode;
(function (CollapsedToolsDisplayMode) {
    CollapsedToolsDisplayMode["Off"] = "off";
    CollapsedToolsDisplayMode["WithThinking"] = "withThinking";
    CollapsedToolsDisplayMode["Always"] = "always";
})(CollapsedToolsDisplayMode || (CollapsedToolsDisplayMode = {}));
export var ChatNotificationMode;
(function (ChatNotificationMode) {
    ChatNotificationMode["Off"] = "off";
    ChatNotificationMode["WindowNotFocused"] = "windowNotFocused";
    ChatNotificationMode["Always"] = "always";
})(ChatNotificationMode || (ChatNotificationMode = {}));
export var ChatAgentLocation;
(function (ChatAgentLocation) {
    /**
     * This is chat, whether it's in the sidebar, a chat editor, or quick chat.
     * Leaving the values alone as they are in stored data so we don't have to normalize them.
     */
    ChatAgentLocation["Chat"] = "panel";
    ChatAgentLocation["Terminal"] = "terminal";
    ChatAgentLocation["Notebook"] = "notebook";
    /**
     * EditorInline means inline chat in a text editor.
     */
    ChatAgentLocation["EditorInline"] = "editor";
})(ChatAgentLocation || (ChatAgentLocation = {}));
(function (ChatAgentLocation) {
    function fromRaw(value) {
        switch (value) {
            case 'panel': return ChatAgentLocation.Chat;
            case 'terminal': return ChatAgentLocation.Terminal;
            case 'notebook': return ChatAgentLocation.Notebook;
            case 'editor': return ChatAgentLocation.EditorInline;
        }
        return ChatAgentLocation.Chat;
    }
    ChatAgentLocation.fromRaw = fromRaw;
})(ChatAgentLocation || (ChatAgentLocation = {}));
/**
 * List of file schemes that are always unsupported for use in chat
 */
const chatAlwaysUnsupportedFileSchemes = new Set([
    Schemas.vscodeChatEditor,
    Schemas.walkThrough,
    Schemas.vscodeLocalChatSession,
    Schemas.vscodeSettings,
    Schemas.webviewPanel,
    Schemas.vscodeUserData,
    Schemas.extension,
    'ccreq',
    'openai-codex', // Codex session custom editor scheme
]);
export function isSupportedChatFileScheme(accessor, scheme) {
    const chatService = accessor.get(IChatSessionsService);
    // Exclude schemes we always know are bad
    if (chatAlwaysUnsupportedFileSchemes.has(scheme)) {
        return false;
    }
    // Plus any schemes used by content providers
    if (chatService.getContentProviderSchemes().includes(scheme)) {
        return false;
    }
    // Everything else is supported
    return true;
}
export const MANAGE_CHAT_COMMAND_ID = 'workbench.action.chat.manage';
export const ChatEditorTitleMaxLength = 30;
export const CHAT_TERMINAL_OUTPUT_MAX_PREVIEW_LINES = 1000;
export const CONTEXT_MODELS_EDITOR = new RawContextKey('inModelsEditor', false);
export const CONTEXT_MODELS_SEARCH_FOCUS = new RawContextKey('inModelsSearch', false);
//# sourceMappingURL=constants.js.map