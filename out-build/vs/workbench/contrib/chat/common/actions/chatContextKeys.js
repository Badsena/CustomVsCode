/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { localize } from '../../../../../nls.js';
import { ContextKeyExpr, RawContextKey } from '../../../../../platform/contextkey/common/contextkey.js';
import { IsWebContext } from '../../../../../platform/contextkey/common/contextkeys.js';
import { RemoteNameContext } from '../../../../common/contextkeys.js';
import { ChatEntitlementContextKeys } from '../../../../services/chat/common/chatEntitlementService.js';
import { ChatModeKind, ChatPermissionLevel } from '../constants.js';
export var ChatContextKeys;
(function (ChatContextKeys) {
    ChatContextKeys.responseVote = new RawContextKey('chatSessionResponseVote', '', { type: 'string', description: localize(8344, null) });
    ChatContextKeys.responseDetectedAgentCommand = new RawContextKey('chatSessionResponseDetectedAgentOrCommand', false, { type: 'boolean', description: localize(8345, null) });
    ChatContextKeys.responseSupportsIssueReporting = new RawContextKey('chatResponseSupportsIssueReporting', false, { type: 'boolean', description: localize(8346, null) });
    ChatContextKeys.responseIsFiltered = new RawContextKey('chatSessionResponseFiltered', false, { type: 'boolean', description: localize(8347, null) });
    ChatContextKeys.responseHasError = new RawContextKey('chatSessionResponseError', false, { type: 'boolean', description: localize(8348, null) });
    ChatContextKeys.requestInProgress = new RawContextKey('chatSessionRequestInProgress', false, { type: 'boolean', description: localize(8349, null) });
    ChatContextKeys.currentlyEditing = new RawContextKey('chatSessionCurrentlyEditing', false, { type: 'boolean', description: localize(8350, null) });
    ChatContextKeys.currentlyEditingInput = new RawContextKey('chatSessionCurrentlyEditingInput', false, { type: 'boolean', description: localize(8351, null) });
    let EditingRequestType;
    (function (EditingRequestType) {
        EditingRequestType["Sent"] = "s";
        EditingRequestType["Queue"] = "q";
        EditingRequestType["Steer"] = "st";
    })(EditingRequestType = ChatContextKeys.EditingRequestType || (ChatContextKeys.EditingRequestType = {}));
    ChatContextKeys.editingRequestType = new RawContextKey('chatEditingSentRequest', undefined, { type: 'string', description: localize(8352, null) });
    ChatContextKeys.isResponse = new RawContextKey('chatResponse', false, { type: 'boolean', description: localize(8353, null) });
    ChatContextKeys.isRequest = new RawContextKey('chatRequest', false, { type: 'boolean', description: localize(8354, null) });
    ChatContextKeys.isPendingRequest = new RawContextKey('chatRequestIsPending', false, { type: 'boolean', description: localize(8355, null) });
    ChatContextKeys.itemId = new RawContextKey('chatItemId', '', { type: 'string', description: localize(8356, null) });
    ChatContextKeys.lastItemId = new RawContextKey('chatLastItemId', [], { type: 'string', description: localize(8357, null) });
    ChatContextKeys.editApplied = new RawContextKey('chatEditApplied', false, { type: 'boolean', description: localize(8358, null) });
    ChatContextKeys.inputHasText = new RawContextKey('chatInputHasText', false, { type: 'boolean', description: localize(8359, null) });
    ChatContextKeys.inputHasFocus = new RawContextKey('chatInputHasFocus', false, { type: 'boolean', description: localize(8360, null) });
    ChatContextKeys.inChatInput = new RawContextKey('inChatInput', false, { type: 'boolean', description: localize(8361, null) });
    ChatContextKeys.inChatSession = new RawContextKey('inChat', false, { type: 'boolean', description: localize(8362, null) });
    ChatContextKeys.inChatQuestionCarousel = new RawContextKey('inChatQuestionCarousel', false, { type: 'boolean', description: localize(8363, null) });
    ChatContextKeys.inChatEditor = new RawContextKey('inChatEditor', false, { type: 'boolean', description: localize(8364, null) });
    ChatContextKeys.inChatTodoList = new RawContextKey('inChatTodoList', false, { type: 'boolean', description: localize(8365, null) });
    ChatContextKeys.inChatTip = new RawContextKey('inChatTip', false, { type: 'boolean', description: localize(8366, null) });
    ChatContextKeys.multipleChatTips = new RawContextKey('multipleChatTips', false, { type: 'boolean', description: localize(8367, null) });
    ChatContextKeys.inChatTerminalToolOutput = new RawContextKey('inChatTerminalToolOutput', false, { type: 'boolean', description: localize(8368, null) });
    ChatContextKeys.chatModeKind = new RawContextKey('chatAgentKind', ChatModeKind.Ask, { type: 'string', description: localize(8369, null) });
    ChatContextKeys.chatPermissionLevel = new RawContextKey('chatPermissionLevel', ChatPermissionLevel.Default, { type: 'string', description: localize(8370, null) });
    ChatContextKeys.chatModeName = new RawContextKey('chatModeName', '', { type: 'string', description: localize(8371, null) });
    ChatContextKeys.chatModelId = new RawContextKey('chatModelId', '', { type: 'string', description: localize(8372, null) });
    ChatContextKeys.supported = ContextKeyExpr.or(IsWebContext.negate(), RemoteNameContext.notEqualsTo(''), ContextKeyExpr.has('config.chat.experimental.serverlessWebEnabled'));
    ChatContextKeys.enabled = new RawContextKey('chatIsEnabled', false, { type: 'boolean', description: localize(8373, null) });
    /**
     * True when the chat widget is locked to the coding agent session.
     */
    ChatContextKeys.lockedToCodingAgent = new RawContextKey('lockedToCodingAgent', false, { type: 'boolean', description: localize(8374, null) });
    ChatContextKeys.lockedCodingAgentId = new RawContextKey('lockedCodingAgentId', '', { type: 'string', description: localize(8375, null) });
    /**
     * True when the chat session has a customAgentTarget defined in its contribution,
     * which means the mode picker should be shown with filtered custom agents.
     */
    ChatContextKeys.chatSessionHasCustomAgentTarget = new RawContextKey('chatSessionHasCustomAgentTarget', false, { type: 'boolean', description: localize(8376, null) });
    /**
     * True when the current chat session has models that specifically target it
     * via `targetChatSessionType`, which means the model picker should be shown
     * even when the widget is locked to a coding agent.
     */
    ChatContextKeys.chatSessionHasTargetedModels = new RawContextKey('chatSessionHasTargetedModels', false, { type: 'boolean', description: localize(8377, null) });
    ChatContextKeys.agentSupportsAttachments = new RawContextKey('agentSupportsAttachments', false, { type: 'boolean', description: localize(8378, null) });
    ChatContextKeys.withinEditSessionDiff = new RawContextKey('withinEditSessionDiff', false, { type: 'boolean', description: localize(8379, null) });
    ChatContextKeys.filePartOfEditSession = new RawContextKey('filePartOfEditSession', false, { type: 'boolean', description: localize(8380, null) });
    ChatContextKeys.extensionParticipantRegistered = new RawContextKey('chatPanelExtensionParticipantRegistered', false, { type: 'boolean', description: localize(8381, null) });
    ChatContextKeys.panelParticipantRegistered = new RawContextKey('chatPanelParticipantRegistered', false, { type: 'boolean', description: localize(8382, null) });
    ChatContextKeys.chatEditingCanUndo = new RawContextKey('chatEditingCanUndo', false, { type: 'boolean', description: localize(8383, null) });
    ChatContextKeys.chatEditingCanRedo = new RawContextKey('chatEditingCanRedo', false, { type: 'boolean', description: localize(8384, null) });
    ChatContextKeys.languageModelsAreUserSelectable = new RawContextKey('chatModelsAreUserSelectable', false, { type: 'boolean', description: localize(8385, null) });
    ChatContextKeys.chatSessionHasModels = new RawContextKey('chatSessionHasModels', false, { type: 'boolean', description: localize(8386, null) });
    ChatContextKeys.chatSessionOptionsValid = new RawContextKey('chatSessionOptionsValid', true, { type: 'boolean', description: localize(8387, null) });
    ChatContextKeys.extensionInvalid = new RawContextKey('chatExtensionInvalid', false, { type: 'boolean', description: localize(8388, null) });
    ChatContextKeys.inputCursorAtTop = new RawContextKey('chatCursorAtTop', false);
    ChatContextKeys.inputHasAgent = new RawContextKey('chatInputHasAgent', false);
    ChatContextKeys.location = new RawContextKey('chatLocation', undefined);
    ChatContextKeys.inQuickChat = new RawContextKey('quickChatHasFocus', false, { type: 'boolean', description: localize(8389, null) });
    ChatContextKeys.inAgentSessionsWelcome = new RawContextKey('inAgentSessionsWelcome', false, { type: 'boolean', description: localize(8390, null) });
    ChatContextKeys.chatSessionType = new RawContextKey('chatSessionType', '', { type: 'string', description: localize(8391, null) });
    ChatContextKeys.hasFileAttachments = new RawContextKey('chatHasFileAttachments', false, { type: 'boolean', description: localize(8392, null) });
    ChatContextKeys.chatSessionIsEmpty = new RawContextKey('chatSessionIsEmpty', true, { type: 'boolean', description: localize(8393, null) });
    ChatContextKeys.hasPendingRequests = new RawContextKey('chatHasPendingRequests', false, { type: 'boolean', description: localize(8394, null) });
    ChatContextKeys.chatSessionHasDebugData = new RawContextKey('chatSessionHasDebugData', false, { type: 'boolean', description: localize(8395, null) });
    ChatContextKeys.chatSessionHasDebugTools = new RawContextKey('chatSessionHasDebugTools', false, { type: 'boolean', description: localize(8396, null) });
    ChatContextKeys.remoteJobCreating = new RawContextKey('chatRemoteJobCreating', false, { type: 'boolean', description: localize(8397, null) });
    ChatContextKeys.hasRemoteCodingAgent = new RawContextKey('hasRemoteCodingAgent', false, localize(8398, null));
    ChatContextKeys.hasCanDelegateProviders = new RawContextKey('chatHasCanDelegateProviders', false, { type: 'boolean', description: localize(8399, null) });
    ChatContextKeys.enableRemoteCodingAgentPromptFileOverlay = new RawContextKey('enableRemoteCodingAgentPromptFileOverlay', false, localize(8400, null));
    /** Used by the extension to skip the quit confirmation when #new wants to open a new folder */
    ChatContextKeys.skipChatRequestInProgressMessage = new RawContextKey('chatSkipRequestInProgressMessage', false, { type: 'boolean', description: localize(8401, null) });
    // Re-exported from chat entitlement service
    ChatContextKeys.Setup = ChatEntitlementContextKeys.Setup;
    ChatContextKeys.Entitlement = ChatEntitlementContextKeys.Entitlement;
    ChatContextKeys.chatQuotaExceeded = ChatEntitlementContextKeys.chatQuotaExceeded;
    ChatContextKeys.completionsQuotaExceeded = ChatEntitlementContextKeys.completionsQuotaExceeded;
    ChatContextKeys.Editing = {
        hasToolConfirmation: new RawContextKey('chatHasToolConfirmation', false, { type: 'boolean', description: localize(8402, null) }),
        hasElicitationRequest: new RawContextKey('chatHasElicitationRequest', false, { type: 'boolean', description: localize(8403, null) }),
        hasQuestionCarousel: new RawContextKey('chatHasQuestionCarousel', false, { type: 'boolean', description: localize(8404, null) }),
    };
    ChatContextKeys.Tools = {
        toolsCount: new RawContextKey('toolsCount', 0, { type: 'number', description: localize(8405, null) })
    };
    ChatContextKeys.foregroundSessionCount = new RawContextKey('chatForegroundSessionCount', 0, { type: 'number', description: localize(8406, null) });
    ChatContextKeys.Modes = {
        hasCustomChatModes: new RawContextKey('chatHasCustomAgents', false, { type: 'boolean', description: localize(8407, null) }),
        agentModeDisabledByPolicy: new RawContextKey('chatAgentModeDisabledByPolicy', false, { type: 'boolean', description: localize(8408, null) }),
    };
    ChatContextKeys.panelLocation = new RawContextKey('chatPanelLocation', undefined, { type: 'number', description: localize(8409, null) });
    ChatContextKeys.agentSessionsViewerFocused = new RawContextKey('agentSessionsViewerFocused', true, { type: 'boolean', description: localize(8410, null) });
    ChatContextKeys.agentSessionsViewerOrientation = new RawContextKey('agentSessionsViewerOrientation', undefined, { type: 'number', description: localize(8411, null) });
    ChatContextKeys.agentSessionsViewerPosition = new RawContextKey('agentSessionsViewerPosition', undefined, { type: 'number', description: localize(8412, null) });
    ChatContextKeys.agentSessionsViewerVisible = new RawContextKey('agentSessionsViewerVisible', undefined, { type: 'boolean', description: localize(8413, null) });
    ChatContextKeys.agentSessionType = new RawContextKey('chatSessionType', '', { type: 'string', description: localize(8414, null) });
    ChatContextKeys.chatSessionSupportsDelegation = new RawContextKey('chatSessionSupportsDelegation', true, { type: 'boolean', description: localize(8415, null) });
    ChatContextKeys.chatSessionSupportsFork = new RawContextKey('chatSessionSupportsFork', false, { type: 'boolean', description: localize(8416, null) });
    ChatContextKeys.agentSessionSection = new RawContextKey('agentSessionSection', '', { type: 'string', description: localize(8417, null) });
    ChatContextKeys.isArchivedAgentSession = new RawContextKey('agentSessionIsArchived', false, { type: 'boolean', description: localize(8418, null) });
    ChatContextKeys.isPinnedAgentSession = new RawContextKey('agentSessionIsPinned', false, { type: 'boolean', description: localize(8419, null) });
    ChatContextKeys.isReadAgentSession = new RawContextKey('agentSessionIsRead', false, { type: 'boolean', description: localize(8420, null) });
    ChatContextKeys.hasMultipleAgentSessionsSelected = new RawContextKey('agentSessionHasMultipleSelected', false, { type: 'boolean', description: localize(8421, null) });
    ChatContextKeys.hasAgentSessionChanges = new RawContextKey('agentSessionHasChanges', false, { type: 'boolean', description: localize(8422, null) });
    ChatContextKeys.isKatexMathElement = new RawContextKey('chatIsKatexMathElement', false, { type: 'boolean', description: localize(8423, null) });
    /**
     * True when the user has submitted a chat request using any of the `/create-*` slash commands.
     * This is persisted in application storage and used to suppress onboarding tips once discovered.
     */
    ChatContextKeys.hasUsedCreateSlashCommands = new RawContextKey('chatHasUsedCreateSlashCommands', false, { type: 'boolean', description: localize(8424, null) });
    ChatContextKeys.contextUsageHasBeenOpened = new RawContextKey('chatContextUsageHasBeenOpened', false, { type: 'boolean', description: localize(8425, null) });
    ChatContextKeys.newChatButtonExperimentIcon = new RawContextKey('chatNewChatButtonExperimentIcon', '', { type: 'string', description: localize(8426, null) });
})(ChatContextKeys || (ChatContextKeys = {}));
export var ChatContextKeyExprs;
(function (ChatContextKeyExprs) {
    ChatContextKeyExprs.inEditingMode = ContextKeyExpr.or(ChatContextKeys.chatModeKind.isEqualTo(ChatModeKind.Edit), ChatContextKeys.chatModeKind.isEqualTo(ChatModeKind.Agent));
    /**
     * Context expression that indicates when the welcome/setup view should be shown
     */
    ChatContextKeyExprs.chatSetupTriggerContext = ContextKeyExpr.or(ChatContextKeys.Setup.installed.negate(), ChatContextKeys.Entitlement.canSignUp);
})(ChatContextKeyExprs || (ChatContextKeyExprs = {}));
//# sourceMappingURL=chatContextKeys.js.map