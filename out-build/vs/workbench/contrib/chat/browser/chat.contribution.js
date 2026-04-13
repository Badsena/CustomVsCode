/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
import { Event } from '../../../../base/common/event.js';
import { Disposable, DisposableMap, DisposableStore } from '../../../../base/common/lifecycle.js';
import { Schemas } from '../../../../base/common/network.js';
import { isMacintosh } from '../../../../base/common/platform.js';
import { PolicyCategory } from '../../../../base/common/policy.js';
import { AgentHostEnabledSettingId } from '../../../../platform/agentHost/common/agentService.js';
import { RemoteAgentHostsSettingId } from '../../../../platform/agentHost/common/remoteAgentHostService.js';
import { registerEditorFeature } from '../../../../editor/common/editorFeatures.js';
import * as nls from '../../../../nls.js';
import { AccessibleViewRegistry } from '../../../../platform/accessibility/browser/accessibleViewRegistry.js';
import { registerAction2 } from '../../../../platform/actions/common/actions.js';
import { Extensions as ConfigurationExtensions } from '../../../../platform/configuration/common/configurationRegistry.js';
import { SyncDescriptor } from '../../../../platform/instantiation/common/descriptors.js';
import { registerSingleton } from '../../../../platform/instantiation/common/extensions.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { IContextKeyService } from '../../../../platform/contextkey/common/contextkey.js';
import { mcpAccessConfig, mcpAutoStartConfig, mcpGalleryServiceEnablementConfig, mcpGalleryServiceUrlConfig, mcpAppsEnabledConfig } from '../../../../platform/mcp/common/mcpManagement.js';
import product from '../../../../platform/product/common/product.js';
import { Registry } from '../../../../platform/registry/common/platform.js';
import { EditorPaneDescriptor } from '../../../browser/editor.js';
import { Extensions } from '../../../common/configuration.js';
import { registerWorkbenchContribution2 } from '../../../common/contributions.js';
import { EditorExtensions } from '../../../common/editor.js';
import { IWorkbenchAssignmentService } from '../../../services/assignment/common/assignmentService.js';
import { ChatEntitlement, IChatEntitlementService } from '../../../services/chat/common/chatEntitlementService.js';
import { IEditorService } from '../../../services/editor/common/editorService.js';
import { IEditorResolverService, RegisteredEditorPriority } from '../../../services/editor/common/editorResolverService.js';
import { IPathService } from '../../../services/path/common/pathService.js';
import { IViewsService } from '../../../services/views/common/viewsService.js';
import { AssistedTypes } from '../../mcp/browser/mcpCommandsAddConfiguration.js';
import { allDiscoverySources, discoverySourceSettingsLabel, mcpDiscoverySection, mcpServerSamplingSection } from '../../mcp/common/mcpConfiguration.js';
import '../common/widget/chatColors.js';
import { IChatLayoutService } from '../common/widget/chatLayoutService.js';
import { ChatModeService, IChatModeService } from '../common/chatModes.js';
import { ChatResponseResourceFileSystemProvider, ChatResponseResourceWorkbenchContribution, IChatResponseResourceFileSystemProvider } from '../common/widget/chatResponseResourceFileSystemProvider.js';
import { IChatSessionsService } from '../common/chatSessionsService.js';
import { ChatSlashCommandService, IChatSlashCommandService } from '../common/participants/chatSlashCommands.js';
import { ChatArtifactsService, IChatArtifactsService } from '../common/tools/chatArtifactsService.js';
import { ChatTodoListService, IChatTodoListService } from '../common/tools/chatTodoListService.js';
import { ChatTransferService, IChatTransferService } from '../common/model/chatTransferService.js';
import { ChatWidgetHistoryService, IChatWidgetHistoryService } from '../common/widget/chatWidgetHistoryService.js';
import { ChatAgentLocation, ChatConfiguration, ChatNotificationMode } from '../common/constants.js';
import { ILanguageModelIgnoredFilesService, LanguageModelIgnoredFilesService } from '../common/ignoredFiles.js';
import { agentPluginDiscoveryRegistry, IAgentPluginService } from '../common/plugins/agentPluginService.js';
import { ChatPromptFilesExtensionPointHandler } from '../common/promptSyntax/chatPromptFilesContribution.js';
import { isTildePath, PromptsConfig } from '../common/promptSyntax/config/config.js';
import { INSTRUCTIONS_DEFAULT_SOURCE_FOLDER, INSTRUCTION_FILE_EXTENSION, LEGACY_MODE_DEFAULT_SOURCE_FOLDER, LEGACY_MODE_FILE_EXTENSION, PROMPT_DEFAULT_SOURCE_FOLDER, PROMPT_FILE_EXTENSION, DEFAULT_SKILL_SOURCE_FOLDERS, AGENTS_SOURCE_FOLDER, AGENT_FILE_EXTENSION, SKILL_FILENAME, CLAUDE_AGENTS_SOURCE_FOLDER, DEFAULT_HOOK_FILE_PATHS, DEFAULT_INSTRUCTIONS_SOURCE_FOLDERS, PromptFileSource, COPILOT_USER_AGENTS_SOURCE_FOLDER } from '../common/promptSyntax/config/promptFileLocations.js';
import { PromptLanguageFeaturesProvider } from '../common/promptSyntax/promptFileContributions.js';
import { AGENT_DOCUMENTATION_URL, INSTRUCTIONS_DOCUMENTATION_URL, PROMPT_DOCUMENTATION_URL, SKILL_DOCUMENTATION_URL, HOOK_DOCUMENTATION_URL, PromptsType } from '../common/promptSyntax/promptTypes.js';
import { hookFileSchema, HOOK_SCHEMA_URI } from '../common/promptSyntax/hookSchema.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { Extensions as JSONExtensions } from '../../../../platform/jsonschemas/common/jsonContributionRegistry.js';
import { LanguageModelToolsExtensionPointHandler } from '../common/tools/languageModelToolsContribution.js';
import { ILanguageModelToolsService } from '../common/tools/languageModelToolsService.js';
import { BuiltinToolsContribution } from '../common/tools/builtinTools/tools.js';
import { RenameToolContribution } from './tools/renameTool.js';
import { UsagesToolContribution } from './tools/usagesTool.js';
import { IVoiceChatService, VoiceChatService } from '../common/voiceChatService.js';
import { registerChatAccessibilityActions } from './actions/chatAccessibilityActions.js';
import { AgentChatAccessibilityHelp, EditsChatAccessibilityHelp, PanelChatAccessibilityHelp, QuickChatAccessibilityHelp } from './actions/chatAccessibilityHelp.js';
import { ModeOpenChatGlobalAction, registerChatActions } from './actions/chatActions.js';
import { CodeBlockActionRendering, registerChatCodeBlockActions, registerChatCodeCompareBlockActions } from './actions/chatCodeblockActions.js';
import { ChatContextContributions } from './actions/chatContext.js';
import { registerChatContextActions } from './actions/chatContextActions.js';
import { registerChatCopyActions } from './actions/chatCopyActions.js';
import { registerChatDeveloperActions } from './actions/chatDeveloperActions.js';
import { registerChatExecuteActions } from './actions/chatExecuteActions.js';
import { registerChatFileTreeActions } from './actions/chatFileTreeActions.js';
import { ChatGettingStartedContribution } from './actions/chatGettingStarted.js';
import { registerChatForkActions } from './actions/chatForkActions.js';
import { registerChatExportActions } from './actions/chatImportExport.js';
import { registerLanguageModelActions } from './actions/chatLanguageModelActions.js';
import { registerChatPluginActions } from './actions/chatPluginActions.js';
import { registerMoveActions } from './actions/chatMoveActions.js';
import { registerNewChatActions } from './actions/chatNewActions.js';
import { registerChatPromptNavigationActions } from './actions/chatPromptNavigationActions.js';
import { registerChatQueueActions } from './actions/chatQueueActions.js';
import { registerQuickChatActions } from './actions/chatQuickInputActions.js';
import { ChatAgentRecommendation } from './actions/chatAgentRecommendationActions.js';
import { registerChatTitleActions } from './actions/chatTitleActions.js';
import { registerChatElicitationActions } from './actions/chatElicitationActions.js';
import { registerChatToolActions } from './actions/chatToolActions.js';
import { ChatTransferContribution } from './actions/chatTransfer.js';
import { registerChatOpenAgentDebugPanelAction } from './actions/chatOpenAgentDebugPanelAction.js';
import { IChatDebugService } from '../common/chatDebugService.js';
import { ChatDebugServiceImpl } from '../common/chatDebugServiceImpl.js';
import { ChatDebugEditor } from './chatDebug/chatDebugEditor.js';
import { PromptsDebugContribution } from './promptsDebugContribution.js';
import { ChatDebugEditorInput, ChatDebugEditorInputSerializer } from './chatDebug/chatDebugEditorInput.js';
import './agentSessions/agentSessions.contribution.js';
import { ChatContextKeys } from '../common/actions/chatContextKeys.js';
import { ChatViewId, IChatAccessibilityService, IChatCodeBlockContextProviderService, IChatWidgetService, IQuickChatService, isIChatResourceViewContext, isIChatViewViewContext } from './chat.js';
import { ChatAccessibilityService } from './accessibility/chatAccessibilityService.js';
import './attachments/chatAttachmentModel.js';
import './widget/input/chatStatusWidget.js';
import { ChatAttachmentResolveService, IChatAttachmentResolveService } from './attachments/chatAttachmentResolveService.js';
import { ChatAttachmentWidgetRegistry, IChatAttachmentWidgetRegistry } from './attachments/chatAttachmentWidgetRegistry.js';
import { ChatMarkdownAnchorService, IChatMarkdownAnchorService } from './widget/chatContentParts/chatMarkdownAnchorService.js';
// import { IChatContextPickService } from './attachments/chatContextPickService.js';
import { ChatInputBoxContentProvider } from './widget/input/editor/chatEditorInputContentProvider.js';
import { ChatEditingEditorAccessibility } from './chatEditing/chatEditingEditorAccessibility.js';
import { registerChatEditorActions } from './chatEditing/chatEditingEditorActions.js';
import { ChatEditingEditorContextKeys } from './chatEditing/chatEditingEditorContextKeys.js';
import { ChatEditingEditorOverlay } from './chatEditing/chatEditingEditorOverlay.js';
import { ChatEditingNotebookFileSystemProviderContrib } from './chatEditing/notebook/chatEditingNotebookFileSystemProvider.js';
import { SimpleBrowserOverlay } from './attachments/simpleBrowserEditorOverlay.js';
import { ChatEditor } from './widgetHosts/editor/chatEditor.js';
import { ChatEditorInput, ChatEditorInputSerializer } from './widgetHosts/editor/chatEditorInput.js';
import { ChatLayoutService } from './widget/chatLayoutService.js';
import { ChatLanguageModelsDataContribution, LanguageModelsConfigurationService } from './languageModelsConfigurationService.js';
import './chatManagement/chatManagement.contribution.js';
import './aiCustomization/aiCustomizationWorkspaceService.js';
import './aiCustomization/customizationHarnessService.js';
import './aiCustomization/aiCustomizationManagement.contribution.js';
import { ChatOutputRendererService, IChatOutputRendererService } from './chatOutputItemRenderer.js';
import { ChatCompatibilityNotifier, ChatExtensionPointHandler } from './chatParticipant.contribution.js';
import { ChatPasteProvidersFeature } from './widget/input/editor/chatPasteProviders.js';
import { QuickChatService } from './widgetHosts/chatQuick.js';
import { ChatResponseAccessibleView } from './accessibility/chatResponseAccessibleView.js';
import { ChatTerminalOutputAccessibleView } from './accessibility/chatTerminalOutputAccessibleView.js';
import { ChatSetupContribution, ChatTeardownContribution } from './chatSetup/chatSetupContributions.js';
// import { ChatStatusBarEntry } from './chatStatus/chatStatusEntry.js';
import { ChatWidget } from './widget/chatWidget.js';
import { ChatCodeBlockContextProviderService } from './codeBlockContextProviderService.js';
import { ChatDynamicVariableModel } from './attachments/chatDynamicVariables.js';
import { ChatImplicitContextContribution } from './attachments/chatImplicitContext.js';
import './widget/input/editor/chatInputCompletions.js';
import './widget/input/editor/chatInputEditorContrib.js';
import './widget/input/editor/chatInputEditorHover.js';
import { AgentPluginService, ConfiguredAgentPluginDiscovery, MarketplaceAgentPluginDiscovery } from '../common/plugins/agentPluginServiceImpl.js';
import { IAgentPluginRepositoryService } from '../common/plugins/agentPluginRepositoryService.js';
import { IPluginMarketplaceService, PluginMarketplaceService } from '../common/plugins/pluginMarketplaceService.js';
import { WorkspacePluginSettingsService, IWorkspacePluginSettingsService } from '../common/plugins/workspacePluginSettingsService.js';
import { AgentPluginsViewsContribution } from './agentPluginsView.js';
import { AgentPluginRecommendations } from './claudePluginRecommendations.js';
import { AgentPluginEditor } from './agentPluginEditor/agentPluginEditor.js';
import { AgentPluginEditorInput } from './agentPluginEditor/agentPluginEditorInput.js';
import { AgentPluginRepositoryService } from './agentPluginRepositoryService.js';
import './promptSyntax/promptCodingAgentActionContribution.js';
import './promptSyntax/promptToolsCodeLensProvider.js';
import { ChatSlashCommandsContribution } from './chatSlashCommands.js';
import { PluginUrlHandler } from './pluginUrlHandler.js';
import { PromptUrlHandler } from './promptSyntax/promptUrlHandler.js';
import { ConfigureToolSets, UserToolSetsContributions } from './tools/toolSetsContribution.js';
import { ChatViewsWelcomeHandler } from './viewsWelcome/chatViewsWelcomeHandler.js';
import { ILanguageModelsConfigurationService } from '../common/languageModelsConfiguration.js';
import { ChatWindowNotifier } from './chatWindowNotifier.js';
import { ChatRepoInfoContribution } from './chatRepoInfo.js';
import { VALID_PROMPT_FOLDER_PATTERN } from '../common/promptSyntax/utils/promptFilesLocator.js';
import { ChatTipService, IChatTipService } from './chatTipService.js';
import { ChatQueuePickerRendering } from './widget/input/chatQueuePickerActionItem.js';
import { ExploreAgentDefaultModel } from './exploreAgentDefaultModel.js';
import { PlanAgentDefaultModel } from './planAgentDefaultModel.js';
import { IChatImageCarouselService, ChatImageCarouselService } from './chatImageCarouselService.js';
const toolReferenceNameEnumValues = [];
const toolReferenceNameEnumDescriptions = [];
const globalAutoApproveDescription = nls.localize(6653, null);
// Register JSON schema for hook files
const jsonContributionRegistry = Registry.as(JSONExtensions.JSONContribution);
jsonContributionRegistry.registerSchema(HOOK_SCHEMA_URI, hookFileSchema);
// Register configuration
const configurationRegistry = Registry.as(ConfigurationExtensions.Configuration);
configurationRegistry.registerConfiguration({
    id: 'chatSidebar',
    title: nls.localize(6654, null),
    type: 'object',
    properties: {
        'chat.experimentalSessionsWindowOverride': {
            type: 'boolean',
            description: nls.localize(6655, null),
            default: false,
            tags: ['experimental'],
        },
        'chat.fontSize': {
            type: 'number',
            description: nls.localize(6656, null),
            default: 13,
            minimum: 6,
            maximum: 100
        },
        'chat.fontFamily': {
            type: 'string',
            description: nls.localize(6657, null),
            default: 'default'
        },
        'chat.editor.fontSize': {
            type: 'number',
            description: nls.localize(6658, null),
            default: isMacintosh ? 12 : 14,
        },
        'chat.editor.fontFamily': {
            type: 'string',
            description: nls.localize(6659, null),
            default: 'default'
        },
        'chat.editor.fontWeight': {
            type: 'string',
            description: nls.localize(6660, null),
            default: 'default'
        },
        'chat.editor.wordWrap': {
            type: 'string',
            description: nls.localize(6661, null),
            default: 'off',
            enum: ['on', 'off']
        },
        'chat.editor.lineHeight': {
            type: 'number',
            description: nls.localize(6662, null),
            default: 0
        },
        [ChatConfiguration.AgentStatusEnabled]: {
            type: 'boolean',
            markdownDescription: nls.localize(6663, null, '`#window.commandCenter#`', '`#chat.viewSessions.enabled#`'),
            default: true,
            tags: ['experimental']
        },
        [ChatConfiguration.UnifiedAgentsBar]: {
            type: 'boolean',
            markdownDescription: nls.localize(6664, null),
            default: false,
            tags: ['experimental']
        },
        [ChatConfiguration.AgentSessionProjectionEnabled]: {
            type: 'boolean',
            markdownDescription: nls.localize(6665, null),
            default: false,
            tags: ['experimental'],
        },
        'chat.implicitContext.enabled': {
            type: 'object',
            description: nls.localize(6666, null),
            additionalProperties: {
                type: 'string',
                enum: ['never', 'first', 'always'],
                description: nls.localize(6667, null),
                enumDescriptions: [
                    nls.localize(6668, null),
                    nls.localize(6669, null),
                    nls.localize(6670, null)
                ]
            },
            default: {
                'panel': 'always',
            },
            tags: ['experimental'],
            experiment: {
                mode: 'startup'
            }
        },
        'chat.implicitContext.suggestedContext': {
            type: 'boolean',
            markdownDescription: nls.localize(6671, null),
            default: true,
        },
        'chat.editing.autoAcceptDelay': {
            type: 'number',
            markdownDescription: nls.localize(6672, null),
            default: 0,
            minimum: 0,
            maximum: 100
        },
        'chat.editing.confirmEditRequestRemoval': {
            type: 'boolean',
            scope: 1 /* ConfigurationScope.APPLICATION */,
            markdownDescription: nls.localize(6673, null),
            default: true,
        },
        'chat.editing.confirmEditRequestRetry': {
            type: 'boolean',
            scope: 1 /* ConfigurationScope.APPLICATION */,
            markdownDescription: nls.localize(6674, null),
            default: true,
        },
        'chat.editing.explainChanges.enabled': {
            type: 'boolean',
            markdownDescription: nls.localize(6675, null),
            default: false,
            tags: ['experimental'],
            experiment: {
                mode: 'auto'
            }
        },
        'chat.tips.enabled': {
            type: 'boolean',
            scope: 1 /* ConfigurationScope.APPLICATION */,
            description: nls.localize(6676, null),
            default: false,
            tags: ['experimental'],
            experiment: {
                mode: 'auto'
            }
        },
        'chat.upvoteAnimation': {
            type: 'string',
            enum: ['off', 'confetti', 'floatingThumbs', 'pulseWave', 'radiantLines'],
            enumDescriptions: [
                nls.localize(6677, null),
                nls.localize(6678, null),
                nls.localize(6679, null),
                nls.localize(6680, null),
                nls.localize(6681, null),
            ],
            description: nls.localize(6682, null),
            default: 'floatingThumbs',
        },
        'chat.experimental.detectParticipant.enabled': {
            type: 'boolean',
            deprecationMessage: nls.localize(6683, null),
            description: nls.localize(6684, null),
            default: null
        },
        'chat.detectParticipant.enabled': {
            type: 'boolean',
            description: nls.localize(6685, null),
            default: true
        },
        [ChatConfiguration.InlineReferencesStyle]: {
            type: 'string',
            enum: ['box', 'link'],
            enumDescriptions: [
                nls.localize(6686, null),
                nls.localize(6687, null)
            ],
            description: nls.localize(6688, null),
            default: 'box'
        },
        [ChatConfiguration.EditorAssociations]: {
            type: 'object',
            markdownDescription: nls.localize(6689, null),
            additionalProperties: {
                type: 'string'
            },
            default: {}
        },
        [ChatConfiguration.NotifyWindowOnConfirmation]: {
            type: 'string',
            enum: ['off', 'windowNotFocused', 'always'],
            enumDescriptions: [
                nls.localize(6690, null),
                nls.localize(6691, null),
                nls.localize(6692, null),
            ],
            description: nls.localize(6693, null),
            default: 'windowNotFocused',
        },
        [ChatConfiguration.AutoReply]: {
            default: false,
            markdownDescription: nls.localize(6694, null),
            type: 'boolean',
            scope: 3 /* ConfigurationScope.APPLICATION_MACHINE */,
            tags: ['experimental', 'advanced'],
        },
        [ChatConfiguration.AutopilotEnabled]: {
            type: 'boolean',
            markdownDescription: nls.localize(6695, null),
            default: true,
            tags: ['experimental'],
        },
        [ChatConfiguration.GlobalAutoApprove]: {
            default: false,
            markdownDescription: globalAutoApproveDescription,
            type: 'boolean',
            scope: 3 /* ConfigurationScope.APPLICATION_MACHINE */,
            tags: ['experimental'],
            policy: {
                name: 'ChatToolsAutoApprove',
                category: PolicyCategory.InteractiveSession,
                minimumVersion: '1.99',
                value: (policyData) => policyData.chat_preview_features_enabled === false ? false : undefined,
                localization: {
                    description: {
                        key: 'autoApprove3.description',
                        value: nls.localize(6696, null)
                    }
                },
            }
        },
        [ChatConfiguration.AutoApproveEdits]: {
            default: {
                '**/*': true,
                '**/.vscode/*.json': false,
                '**/.git/**': false,
                '**/{package.json,server.xml,build.rs,web.config,.gitattributes,.env}': false,
                '**/*.{code-workspace,csproj,fsproj,vbproj,vcxproj,proj,targets,props}': false,
                '**/*.lock': false, // yarn.lock, bun.lock, etc.
                '**/*-lock.{yaml,json}': false, // pnpm-lock.yaml, package-lock.json
            },
            markdownDescription: nls.localize(6697, null),
            type: 'object',
            additionalProperties: {
                type: 'boolean',
            }
        },
        [ChatConfiguration.AutoApprovedUrls]: {
            default: {
                'https://code.visualstudio.com': true,
                'https://github.com/microsoft/vscode/wiki/*': true,
            },
            markdownDescription: nls.localize(6698, null),
            type: 'object',
            additionalProperties: {
                oneOf: [
                    { type: 'boolean' },
                    {
                        type: 'object',
                        properties: {
                            approveRequest: { type: 'boolean' },
                            approveResponse: { type: 'boolean' }
                        }
                    }
                ]
            }
        },
        [ChatConfiguration.EligibleForAutoApproval]: {
            default: {},
            markdownDescription: nls.localize(6699, null),
            type: 'object',
            propertyNames: {
                enum: toolReferenceNameEnumValues,
                enumDescriptions: toolReferenceNameEnumDescriptions,
            },
            additionalProperties: {
                type: 'boolean',
            },
            examples: [
                {
                    'fetch': false,
                    'runTask': false
                }
            ],
            policy: {
                name: 'ChatToolsEligibleForAutoApproval',
                category: PolicyCategory.InteractiveSession,
                minimumVersion: '1.107',
                localization: {
                    description: {
                        key: 'chat.tools.eligibleForAutoApproval',
                        value: nls.localize(6700, null)
                    }
                },
            }
        },
        'chat.sendElementsToChat.enabled': {
            default: true,
            description: nls.localize(6701, null),
            type: 'boolean',
            tags: ['preview']
        },
        'chat.sendElementsToChat.attachCSS': {
            default: true,
            markdownDescription: nls.localize(6702, null, '`#chat.sendElementsToChat.enabled#`'),
            type: 'boolean',
            tags: ['preview']
        },
        'chat.sendElementsToChat.attachImages': {
            default: true,
            markdownDescription: nls.localize(6703, null, '`#chat.sendElementsToChat.enabled#`'),
            type: 'boolean',
            tags: ['experimental']
        },
        [ChatConfiguration.ImageCarouselEnabled]: {
            default: true,
            description: nls.localize(6704, null),
            type: 'boolean',
            tags: ['preview']
        },
        [ChatConfiguration.ArtifactsEnabled]: {
            default: false,
            description: nls.localize(6705, null),
            type: 'boolean',
            tags: ['preview']
        },
        'chat.undoRequests.restoreInput': {
            default: true,
            markdownDescription: nls.localize(6706, null),
            type: 'boolean',
        },
        'chat.editRequests': {
            markdownDescription: nls.localize(6707, null),
            type: 'string',
            enum: ['inline', 'hover', 'input', 'none'],
            default: 'inline',
        },
        [ChatConfiguration.ChatViewSessionsEnabled]: {
            type: 'boolean',
            default: true,
            description: nls.localize(6708, null),
        },
        [ChatConfiguration.ChatViewSessionsOrientation]: {
            type: 'string',
            enum: ['stacked', 'sideBySide'],
            enumDescriptions: [
                nls.localize(6709, null),
                nls.localize(6710, null)
            ],
            default: 'sideBySide',
            description: nls.localize(6711, null),
        },
        [ChatConfiguration.ChatViewProgressBadgeEnabled]: {
            type: 'boolean',
            default: false,
            description: nls.localize(6712, null),
        },
        [ChatConfiguration.ChatContextUsageEnabled]: {
            type: 'boolean',
            default: true,
            description: nls.localize(6713, null),
        },
        [ChatConfiguration.NotifyWindowOnResponseReceived]: {
            type: 'string',
            enum: ['off', 'windowNotFocused', 'always'],
            enumDescriptions: [
                nls.localize(6714, null),
                nls.localize(6715, null),
                nls.localize(6716, null),
            ],
            default: 'windowNotFocused',
            description: nls.localize(6717, null),
        },
        'chat.checkpoints.enabled': {
            type: 'boolean',
            default: true,
            description: nls.localize(6718, null),
        },
        'chat.checkpoints.showFileChanges': {
            type: 'boolean',
            description: nls.localize(6719, null),
            default: false
        },
        [mcpAccessConfig]: {
            type: 'string',
            description: nls.localize(6720, null),
            enum: [
                "none" /* McpAccessValue.None */,
                "registry" /* McpAccessValue.Registry */,
                "all" /* McpAccessValue.All */
            ],
            enumDescriptions: [
                nls.localize(6721, null),
                nls.localize(6722, null),
                nls.localize(6723, null)
            ],
            default: "all" /* McpAccessValue.All */,
            policy: {
                name: 'ChatMCP',
                category: PolicyCategory.InteractiveSession,
                minimumVersion: '1.99',
                value: (policyData) => {
                    if (policyData.mcp === false) {
                        return "none" /* McpAccessValue.None */;
                    }
                    if (policyData.mcpAccess === 'registry_only') {
                        return "registry" /* McpAccessValue.Registry */;
                    }
                    return undefined;
                },
                localization: {
                    description: {
                        key: 'chat.mcp.access',
                        value: nls.localize(6724, null)
                    },
                    enumDescriptions: [
                        {
                            key: 'chat.mcp.access.none', value: nls.localize(6725, null),
                        },
                        {
                            key: 'chat.mcp.access.registry', value: nls.localize(6726, null),
                        },
                        {
                            key: 'chat.mcp.access.any', value: nls.localize(6727, null)
                        }
                    ]
                },
            }
        },
        [mcpAutoStartConfig]: {
            type: 'string',
            description: nls.localize(6728, null),
            default: "newAndOutdated" /* McpAutoStartValue.NewAndOutdated */,
            enum: [
                "never" /* McpAutoStartValue.Never */,
                "onlyNew" /* McpAutoStartValue.OnlyNew */,
                "newAndOutdated" /* McpAutoStartValue.NewAndOutdated */
            ],
            enumDescriptions: [
                nls.localize(6729, null),
                nls.localize(6730, null),
                nls.localize(6731, null)
            ],
            tags: ['experimental'],
        },
        [mcpAppsEnabledConfig]: {
            type: 'boolean',
            description: nls.localize(6732, null),
            default: true,
            tags: ['experimental'],
        },
        [mcpServerSamplingSection]: {
            type: 'object',
            description: nls.localize(6733, null, 'MCP: ' + nls.localize(6734, null)),
            scope: 5 /* ConfigurationScope.RESOURCE */,
            additionalProperties: {
                type: 'object',
                properties: {
                    allowedDuringChat: {
                        type: 'boolean',
                        description: nls.localize(6735, null),
                        default: true,
                    },
                    allowedOutsideChat: {
                        type: 'boolean',
                        description: nls.localize(6736, null),
                        default: false,
                    },
                    allowedModels: {
                        type: 'array',
                        items: {
                            type: 'string',
                            description: nls.localize(6737, null),
                        },
                    }
                }
            },
        },
        [AssistedTypes[4 /* AddConfigurationType.NuGetPackage */].enabledConfigKey]: {
            type: 'boolean',
            description: nls.localize(6738, null),
            default: false,
            tags: ['experimental'],
            experiment: {
                mode: 'startup'
            }
        },
        [ChatConfiguration.ExtensionToolsEnabled]: {
            type: 'boolean',
            description: nls.localize(6739, null),
            default: true,
            policy: {
                name: 'ChatAgentExtensionTools',
                category: PolicyCategory.InteractiveSession,
                minimumVersion: '1.99',
                localization: {
                    description: {
                        key: 'chat.extensionToolsEnabled',
                        value: nls.localize(6740, null)
                    }
                },
            }
        },
        [ChatConfiguration.PluginsEnabled]: {
            type: 'boolean',
            description: nls.localize(6741, null),
            default: true,
            tags: ['preview'],
        },
        [ChatConfiguration.PluginLocations]: {
            type: 'object',
            additionalProperties: { type: 'boolean' },
            restricted: true,
            markdownDescription: nls.localize(6742, null),
            scope: 2 /* ConfigurationScope.MACHINE */,
            tags: ['experimental'],
        },
        [ChatConfiguration.PluginMarketplaces]: {
            type: 'array',
            items: {
                type: 'string',
            },
            markdownDescription: nls.localize(6743, null),
            default: ['github/copilot-plugins', 'github/awesome-copilot'],
            scope: 1 /* ConfigurationScope.APPLICATION */,
            tags: ['experimental'],
        },
        [ChatConfiguration.AgentEnabled]: {
            type: 'boolean',
            description: nls.localize(6744, null),
            default: true,
            order: 1,
            policy: {
                name: 'ChatAgentMode',
                category: PolicyCategory.InteractiveSession,
                minimumVersion: '1.99',
                value: (policyData) => policyData.chat_agent_enabled === false ? false : undefined,
                localization: {
                    description: {
                        key: 'chat.agent.enabled.description',
                        value: nls.localize(6745, null),
                    }
                }
            }
        },
        [AgentHostEnabledSettingId]: {
            type: 'boolean',
            description: nls.localize(6746, null),
            default: false,
            tags: ['experimental'],
            included: product.quality !== 'stable',
        },
        [RemoteAgentHostsSettingId]: {
            type: 'array',
            items: {
                type: 'object',
                properties: {
                    address: { type: 'string', description: nls.localize(6747, null) },
                    name: { type: 'string', description: nls.localize(6748, null) },
                    connectionToken: { type: 'string', description: nls.localize(6749, null) },
                },
                required: ['address', 'name'],
            },
            description: nls.localize(6750, null),
            default: [],
            tags: ['experimental'],
            included: product.quality !== 'stable',
        },
        [ChatConfiguration.PlanAgentDefaultModel]: {
            type: 'string',
            description: nls.localize(6751, null),
            default: '',
            enum: PlanAgentDefaultModel.modelIds,
            enumItemLabels: PlanAgentDefaultModel.modelLabels,
            markdownEnumDescriptions: PlanAgentDefaultModel.modelDescriptions
        },
        [ChatConfiguration.ExploreAgentDefaultModel]: {
            type: 'string',
            description: nls.localize(6752, null),
            default: '',
            enum: ExploreAgentDefaultModel.modelIds,
            enumItemLabels: ExploreAgentDefaultModel.modelLabels,
            markdownEnumDescriptions: ExploreAgentDefaultModel.modelDescriptions
        },
        [ChatConfiguration.RequestQueueingDefaultAction]: {
            type: 'string',
            enum: ['queue', 'steer'],
            enumDescriptions: [
                nls.localize(6753, null),
                nls.localize(6754, null),
            ],
            description: nls.localize(6755, null),
            default: 'steer',
        },
        [ChatConfiguration.EditModeHidden]: {
            type: 'boolean',
            description: nls.localize(6756, null),
            default: true,
            tags: ['experimental'],
            experiment: {
                mode: 'auto'
            },
            policy: {
                name: 'DeprecatedEditModeHidden',
                category: PolicyCategory.InteractiveSession,
                minimumVersion: '1.112',
                localization: {
                    description: {
                        key: 'chat.editMode.hidden',
                        value: nls.localize(6757, null),
                    }
                }
            }
        },
        [ChatConfiguration.EnableMath]: {
            type: 'boolean',
            description: nls.localize(6758, null),
            default: true,
        },
        [ChatConfiguration.ShowCodeBlockProgressAnimation]: {
            type: 'boolean',
            description: nls.localize(6759, null),
            default: true,
            tags: ['experimental'],
        },
        ['chat.statusWidget.anonymous']: {
            type: 'boolean',
            description: nls.localize(6760, null),
            default: false,
            tags: ['experimental', 'advanced'],
            experiment: {
                mode: 'auto'
            }
        },
        [mcpDiscoverySection]: {
            type: 'object',
            properties: Object.fromEntries(allDiscoverySources.map(k => [k, { type: 'boolean', description: discoverySourceSettingsLabel[k] }])),
            additionalProperties: false,
            default: Object.fromEntries(allDiscoverySources.map(k => [k, false])),
            markdownDescription: nls.localize(6761, null),
        },
        [mcpGalleryServiceEnablementConfig]: {
            type: 'boolean',
            default: false,
            tags: ['preview'],
            description: nls.localize(6762, null),
            included: product.quality === 'stable'
        },
        [mcpGalleryServiceUrlConfig]: {
            type: 'string',
            description: nls.localize(6763, null),
            default: '',
            scope: 1 /* ConfigurationScope.APPLICATION */,
            tags: ['usesOnlineServices', 'advanced'],
            included: false,
            policy: {
                name: 'McpGalleryServiceUrl',
                category: PolicyCategory.InteractiveSession,
                minimumVersion: '1.101',
                value: (policyData) => policyData.mcpRegistryUrl,
                localization: {
                    description: {
                        key: 'mcp.gallery.serviceUrl',
                        value: nls.localize(6764, null),
                    }
                }
            },
        },
        [PromptsConfig.INSTRUCTIONS_LOCATION_KEY]: {
            type: 'object',
            title: nls.localize(6765, null),
            markdownDescription: nls.localize(6766, null, INSTRUCTION_FILE_EXTENSION, INSTRUCTIONS_DOCUMENTATION_URL),
            default: {
                ...DEFAULT_INSTRUCTIONS_SOURCE_FOLDERS.map((folder) => ({ [folder.path]: true })).reduce((acc, curr) => ({ ...acc, ...curr }), {}),
            },
            additionalProperties: { type: 'boolean' },
            propertyNames: {
                pattern: VALID_PROMPT_FOLDER_PATTERN,
                patternErrorMessage: nls.localize(6767, null),
            },
            restricted: true,
            tags: ['prompts', 'reusable prompts', 'prompt snippets', 'instructions'],
            examples: [
                {
                    [DEFAULT_INSTRUCTIONS_SOURCE_FOLDERS[0].path]: true,
                },
                {
                    [INSTRUCTIONS_DEFAULT_SOURCE_FOLDER]: true,
                    '/Users/vscode/repos/instructions': true,
                },
            ],
        },
        [PromptsConfig.PROMPT_LOCATIONS_KEY]: {
            type: 'object',
            title: nls.localize(6768, null),
            markdownDescription: nls.localize(6769, null, PROMPT_FILE_EXTENSION, PROMPT_DOCUMENTATION_URL),
            default: {
                [PROMPT_DEFAULT_SOURCE_FOLDER]: true,
            },
            additionalProperties: { type: 'boolean' },
            unevaluatedProperties: { type: 'boolean' },
            propertyNames: {
                pattern: VALID_PROMPT_FOLDER_PATTERN,
                patternErrorMessage: nls.localize(6770, null),
            },
            restricted: true,
            tags: ['prompts', 'reusable prompts', 'prompt snippets', 'instructions'],
            examples: [
                {
                    [PROMPT_DEFAULT_SOURCE_FOLDER]: true,
                },
                {
                    [PROMPT_DEFAULT_SOURCE_FOLDER]: true,
                    '/Users/vscode/repos/prompts': true,
                },
            ],
        },
        [PromptsConfig.MODE_LOCATION_KEY]: {
            type: 'object',
            title: nls.localize(6771, null),
            markdownDescription: nls.localize(6772, null, LEGACY_MODE_FILE_EXTENSION, AGENT_DOCUMENTATION_URL),
            default: {
                [LEGACY_MODE_DEFAULT_SOURCE_FOLDER]: true,
            },
            deprecationMessage: nls.localize(6773, null),
            additionalProperties: { type: 'boolean' },
            unevaluatedProperties: { type: 'boolean' },
            restricted: true,
            tags: ['experimental', 'prompts', 'reusable prompts', 'prompt snippets', 'instructions'],
            examples: [
                {
                    [LEGACY_MODE_DEFAULT_SOURCE_FOLDER]: true,
                },
                {
                    [LEGACY_MODE_DEFAULT_SOURCE_FOLDER]: true,
                    '/Users/vscode/repos/chatmodes': true,
                },
            ],
        },
        [PromptsConfig.AGENTS_LOCATION_KEY]: {
            type: 'object',
            title: nls.localize(6774, null),
            markdownDescription: nls.localize(6775, null, AGENT_FILE_EXTENSION, AGENT_DOCUMENTATION_URL),
            default: {
                [AGENTS_SOURCE_FOLDER]: true,
                [CLAUDE_AGENTS_SOURCE_FOLDER]: true,
                [COPILOT_USER_AGENTS_SOURCE_FOLDER]: true,
            },
            additionalProperties: { type: 'boolean' },
            propertyNames: {
                pattern: VALID_PROMPT_FOLDER_PATTERN,
                patternErrorMessage: nls.localize(6776, null),
            },
            restricted: true,
            tags: ['prompts', 'reusable prompts', 'prompt snippets', 'instructions'],
            examples: [
                {
                    [AGENTS_SOURCE_FOLDER]: true,
                },
                {
                    [AGENTS_SOURCE_FOLDER]: true,
                    'my-agents': true,
                    '../shared-agents': true,
                    '~/.copilot/agents': true,
                },
            ],
        },
        [PromptsConfig.USE_AGENT_MD]: {
            type: 'boolean',
            title: nls.localize(6777, null),
            markdownDescription: nls.localize(6778, null),
            default: true,
            restricted: true,
            disallowConfigurationDefault: true,
            tags: ['prompts', 'reusable prompts', 'prompt snippets', 'instructions']
        },
        [PromptsConfig.USE_NESTED_AGENT_MD]: {
            type: 'boolean',
            title: nls.localize(6779, null),
            markdownDescription: nls.localize(6780, null),
            default: false,
            restricted: true,
            disallowConfigurationDefault: true,
            tags: ['experimental', 'prompts', 'reusable prompts', 'prompt snippets', 'instructions']
        },
        [PromptsConfig.USE_CLAUDE_MD]: {
            type: 'boolean',
            title: nls.localize(6781, null),
            markdownDescription: nls.localize(6782, null),
            default: true,
            restricted: true,
            disallowConfigurationDefault: true,
            tags: ['prompts', 'reusable prompts', 'prompt snippets', 'instructions']
        },
        [PromptsConfig.USE_AGENT_SKILLS]: {
            type: 'boolean',
            title: nls.localize(6783, null),
            markdownDescription: nls.localize(6784, null),
            default: true,
            restricted: true,
            disallowConfigurationDefault: true,
            tags: ['prompts', 'reusable prompts', 'prompt snippets', 'instructions']
        },
        [PromptsConfig.USE_SKILL_ADHERENCE_PROMPT]: {
            type: 'boolean',
            title: nls.localize(6785, null),
            markdownDescription: nls.localize(6786, null),
            default: false,
            restricted: true,
            disallowConfigurationDefault: true,
            tags: ['experimental', 'prompts', 'reusable prompts', 'prompt snippets', 'instructions'],
            experiment: {
                mode: 'auto'
            }
        },
        [PromptsConfig.INCLUDE_APPLYING_INSTRUCTIONS]: {
            type: 'boolean',
            title: nls.localize(6787, null),
            markdownDescription: nls.localize(6788, null),
            default: true,
            restricted: true,
            disallowConfigurationDefault: true,
            tags: ['prompts', 'reusable prompts', 'prompt snippets', 'instructions']
        },
        [PromptsConfig.INCLUDE_REFERENCED_INSTRUCTIONS]: {
            type: 'boolean',
            title: nls.localize(6789, null),
            markdownDescription: nls.localize(6790, null),
            default: false,
            restricted: true,
            disallowConfigurationDefault: true,
            tags: ['prompts', 'reusable prompts', 'prompt snippets', 'instructions']
        },
        [PromptsConfig.USE_CUSTOMIZATIONS_IN_PARENT_REPOS]: {
            type: 'boolean',
            title: nls.localize(6791, null),
            markdownDescription: nls.localize(6792, null),
            default: false,
            restricted: true,
            disallowConfigurationDefault: true,
            tags: ['prompts', 'reusable prompts', 'prompt snippets', 'instructions']
        },
        [PromptsConfig.SKILLS_LOCATION_KEY]: {
            type: 'object',
            title: nls.localize(6793, null),
            markdownDescription: nls.localize(6794, null, SKILL_FILENAME, SKILL_DOCUMENTATION_URL),
            default: {
                ...DEFAULT_SKILL_SOURCE_FOLDERS.map((folder) => ({ [folder.path]: true })).reduce((acc, curr) => ({ ...acc, ...curr }), {}),
            },
            additionalProperties: { type: 'boolean' },
            propertyNames: {
                pattern: VALID_PROMPT_FOLDER_PATTERN,
                patternErrorMessage: nls.localize(6795, null),
            },
            restricted: true,
            tags: ['prompts', 'reusable prompts', 'prompt snippets', 'instructions'],
            examples: [
                {
                    [DEFAULT_SKILL_SOURCE_FOLDERS[0].path]: true,
                },
                {
                    [DEFAULT_SKILL_SOURCE_FOLDERS[0].path]: true,
                    'my-skills': true,
                    '../shared-skills': true,
                    '~/.custom/skills': true,
                },
            ],
        },
        [PromptsConfig.HOOKS_LOCATION_KEY]: {
            type: 'object',
            title: nls.localize(6796, null),
            markdownDescription: nls.localize(6797, null, HOOK_DOCUMENTATION_URL),
            default: {
                ...DEFAULT_HOOK_FILE_PATHS.map((f) => ({ [f.path]: true })).reduce((acc, curr) => ({ ...acc, ...curr }), {}),
            },
            additionalProperties: { type: 'boolean' },
            propertyNames: {
                pattern: VALID_PROMPT_FOLDER_PATTERN,
                patternErrorMessage: nls.localize(6798, null),
            },
            restricted: true,
            tags: ['preview', 'prompts', 'hooks', 'agent'],
            examples: [
                {
                    [DEFAULT_HOOK_FILE_PATHS[0].path]: true,
                },
                {
                    [DEFAULT_HOOK_FILE_PATHS[0].path]: true,
                    'custom-hooks/hooks.json': true,
                },
            ],
        },
        [PromptsConfig.USE_CHAT_HOOKS]: {
            type: 'boolean',
            title: nls.localize(6799, null),
            markdownDescription: nls.localize(6800, null),
            default: true,
            restricted: true,
            disallowConfigurationDefault: true,
            tags: ['preview', 'prompts', 'hooks', 'agent'],
            policy: {
                name: 'ChatHooks',
                category: PolicyCategory.InteractiveSession,
                minimumVersion: '1.109',
                value: (policyData) => policyData.chat_preview_features_enabled === false ? false : undefined,
                localization: {
                    description: {
                        key: 'chat.useHooks.description',
                        value: nls.localize(6801, null)
                    }
                },
            }
        },
        [PromptsConfig.USE_CLAUDE_HOOKS]: {
            type: 'boolean',
            title: nls.localize(6802, null),
            markdownDescription: nls.localize(6803, null),
            default: false,
            restricted: true,
            disallowConfigurationDefault: true,
            tags: ['preview', 'prompts', 'hooks', 'agent']
        },
        [PromptsConfig.USE_CUSTOM_AGENT_HOOKS]: {
            type: 'boolean',
            title: nls.localize(6804, null),
            markdownDescription: nls.localize(6805, null),
            default: false,
            restricted: true,
            disallowConfigurationDefault: true,
            tags: ['preview', 'prompts', 'hooks', 'agent']
        },
        [PromptsConfig.PROMPT_FILES_SUGGEST_KEY]: {
            type: 'object',
            scope: 5 /* ConfigurationScope.RESOURCE */,
            title: nls.localize(6806, null),
            markdownDescription: nls.localize(6807, null),
            default: {},
            additionalProperties: {
                oneOf: [
                    { type: 'boolean' },
                    { type: 'string' }
                ]
            },
            tags: ['prompts', 'reusable prompts', 'prompt snippets', 'instructions'],
            examples: [
                {
                    'plan': true,
                    'a11y-audit': 'resourceExtname == .html',
                    'document': 'resourceLangId == markdown'
                }
            ],
        },
        [ChatConfiguration.TodosShowWidget]: {
            type: 'boolean',
            default: true,
            description: nls.localize(6808, null),
        },
        [ChatConfiguration.ThinkingStyle]: {
            type: 'string',
            default: 'fixedScrolling',
            enum: ['collapsed', 'collapsedPreview', 'fixedScrolling'],
            enumDescriptions: [
                nls.localize(6809, null),
                nls.localize(6810, null),
                nls.localize(6811, null),
            ],
            description: nls.localize(6812, null),
            tags: ['experimental'],
        },
        [ChatConfiguration.ThinkingGenerateTitles]: {
            type: 'boolean',
            default: true,
            description: nls.localize(6813, null),
            tags: ['experimental'],
        },
        'chat.agent.thinking.collapsedTools': {
            type: 'string',
            default: 'always',
            enum: ['off', 'withThinking', 'always'],
            enumDescriptions: [
                nls.localize(6814, null),
                nls.localize(6815, null),
                nls.localize(6816, null),
            ],
            markdownDescription: nls.localize(6817, null),
            tags: ['experimental'],
        },
        [ChatConfiguration.TerminalToolsInThinking]: {
            type: 'boolean',
            default: true,
            markdownDescription: nls.localize(6818, null),
            tags: ['experimental'],
        },
        [ChatConfiguration.SimpleTerminalCollapsible]: {
            type: 'boolean',
            default: true,
            markdownDescription: nls.localize(6819, null),
            tags: ['experimental'],
        },
        'chat.tools.usagesTool.enabled': {
            type: 'boolean',
            default: true,
            markdownDescription: nls.localize(6820, null),
            tags: ['preview'],
            experiment: {
                mode: 'auto'
            }
        },
        'chat.tools.renameTool.enabled': {
            type: 'boolean',
            default: true,
            markdownDescription: nls.localize(6821, null),
            tags: ['preview'],
            experiment: {
                mode: 'auto'
            }
        },
        [ChatConfiguration.ThinkingPhrases]: {
            type: 'object',
            default: {
                mode: 'append',
                phrases: []
            },
            properties: {
                mode: {
                    type: 'string',
                    enum: ['replace', 'append'],
                    default: 'append',
                    description: nls.localize(6822, null)
                },
                phrases: {
                    type: 'array',
                    items: { type: 'string' },
                    default: [],
                    description: nls.localize(6823, null)
                }
            },
            additionalProperties: false,
            markdownDescription: nls.localize(6824, null),
            tags: ['experimental'],
        },
        [ChatConfiguration.AutoExpandToolFailures]: {
            type: 'boolean',
            default: true,
            markdownDescription: nls.localize(6825, null),
        },
        [ChatConfiguration.AIDisabled]: {
            type: 'boolean',
            description: nls.localize(6826, null),
            default: false,
            scope: 4 /* ConfigurationScope.WINDOW */
        },
        'chat.allowAnonymousAccess': {
            type: 'boolean',
            description: nls.localize(6827, null),
            default: false,
            tags: ['experimental'],
            experiment: {
                mode: 'auto'
            }
        },
        [ChatConfiguration.GrowthNotificationEnabled]: {
            type: 'boolean',
            description: nls.localize(6828, null),
            default: false,
            tags: ['experimental'],
            experiment: {
                mode: 'auto'
            }
        },
        [ChatConfiguration.RestoreLastPanelSession]: {
            type: 'boolean',
            description: nls.localize(6829, null),
            default: false
        },
        [ChatConfiguration.ExitAfterDelegation]: {
            type: 'boolean',
            description: nls.localize(6830, null),
            default: false,
            tags: ['preview'],
        },
        'chat.extensionUnification.enabled': {
            type: 'boolean',
            description: nls.localize(6831, null),
            default: true,
            tags: ['experimental'],
            experiment: {
                mode: 'auto'
            }
        },
        [ChatConfiguration.SubagentToolCustomAgents]: {
            type: 'boolean',
            description: nls.localize(6832, null),
            default: true,
            experiment: {
                mode: 'auto'
            }
        },
        [ChatConfiguration.ChatCustomizationMenuEnabled]: {
            type: 'boolean',
            tags: ['preview'],
            description: nls.localize(6833, null),
            default: true,
        },
        [ChatConfiguration.ChatCustomizationHarnessSelectorEnabled]: {
            type: 'boolean',
            tags: ['preview'],
            description: nls.localize(6834, null),
            default: true,
        },
    }
});
Registry.as(EditorExtensions.EditorPane).registerEditorPane(EditorPaneDescriptor.create(ChatEditor, ChatEditorInput.EditorID, nls.localize(6835, null)), [
    new SyncDescriptor(ChatEditorInput)
]);
Registry.as(EditorExtensions.EditorPane).registerEditorPane(EditorPaneDescriptor.create(ChatDebugEditor, ChatDebugEditorInput.ID, nls.localize(6836, null)), [
    new SyncDescriptor(ChatDebugEditorInput)
]);
Registry.as(EditorExtensions.EditorPane).registerEditorPane(EditorPaneDescriptor.create(AgentPluginEditor, AgentPluginEditor.ID, nls.localize(6837, null)), [
    new SyncDescriptor(AgentPluginEditorInput)
]);
Registry.as(Extensions.ConfigurationMigration).registerConfigurationMigrations([
    {
        key: 'chat.experimental.detectParticipant.enabled',
        migrateFn: (value, _accessor) => ([
            ['chat.experimental.detectParticipant.enabled', { value: undefined }],
            ['chat.detectParticipant.enabled', { value: value !== false }]
        ])
    },
    {
        key: 'chat.useClaudeSkills',
        migrateFn: (value, _accessor) => ([
            ['chat.useClaudeSkills', { value: undefined }],
            ['chat.useAgentSkills', { value }]
        ])
    },
    {
        key: mcpDiscoverySection,
        migrateFn: (value) => {
            if (typeof value === 'boolean') {
                return { value: Object.fromEntries(allDiscoverySources.map(k => [k, value])) };
            }
            return { value };
        }
    },
    {
        key: ChatConfiguration.NotifyWindowOnConfirmation,
        migrateFn: (value) => {
            if (value === true) {
                return { value: ChatNotificationMode.WindowNotFocused };
            }
            else if (value === false) {
                return { value: ChatNotificationMode.Off };
            }
            return [];
        }
    },
    {
        key: ChatConfiguration.NotifyWindowOnResponseReceived,
        migrateFn: (value) => {
            if (value === true) {
                return { value: ChatNotificationMode.WindowNotFocused };
            }
            else if (value === false) {
                return { value: ChatNotificationMode.Off };
            }
            return [];
        }
    },
    {
        key: 'chat.plugins.paths',
        migrateFn: (value, _accessor) => ([
            ['chat.plugins.paths', { value: undefined }],
            [ChatConfiguration.PluginLocations, { value }]
        ])
    },
]);
let ChatResolverContribution = class ChatResolverContribution extends Disposable {
    static { this.ID = 'workbench.contrib.chatResolver'; }
    constructor(chatSessionsService, editorResolverService, instantiationService) {
        super();
        this.editorResolverService = editorResolverService;
        this.instantiationService = instantiationService;
        this._editorRegistrations = this._register(new DisposableMap());
        this._registerEditor(Schemas.vscodeChatEditor);
        this._registerEditor(Schemas.vscodeLocalChatSession);
        this._register(chatSessionsService.onDidChangeContentProviderSchemes((e) => {
            for (const scheme of e.added) {
                this._registerEditor(scheme);
            }
            for (const scheme of e.removed) {
                this._editorRegistrations.deleteAndDispose(scheme);
            }
        }));
        for (const scheme of chatSessionsService.getContentProviderSchemes()) {
            this._registerEditor(scheme);
        }
    }
    _registerEditor(scheme) {
        this._editorRegistrations.set(scheme, this.editorResolverService.registerEditor(`${scheme}:**/**`, {
            id: ChatEditorInput.EditorID,
            label: nls.localize(6838, null),
            priority: RegisteredEditorPriority.builtin
        }, {
            singlePerResource: true,
            canSupportResource: resource => resource.scheme === scheme,
        }, {
            createEditorInput: ({ resource, options }) => {
                return {
                    editor: this.instantiationService.createInstance(ChatEditorInput, resource, options),
                    options
                };
            }
        }));
    }
};
ChatResolverContribution = __decorate([
    __param(0, IChatSessionsService),
    __param(1, IEditorResolverService),
    __param(2, IInstantiationService)
], ChatResolverContribution);
let ChatDebugResolverContribution = class ChatDebugResolverContribution {
    static { this.ID = 'workbench.contrib.chatDebugResolver'; }
    constructor(editorResolverService) {
        editorResolverService.registerEditor(`${ChatDebugEditorInput.RESOURCE.scheme}:**/**`, {
            id: ChatDebugEditorInput.ID,
            label: nls.localize(6839, null),
            priority: RegisteredEditorPriority.exclusive
        }, {
            singlePerResource: true,
            canSupportResource: resource => resource.scheme === ChatDebugEditorInput.RESOURCE.scheme
        }, {
            createEditorInput: () => {
                return {
                    editor: ChatDebugEditorInput.instance,
                    options: { pinned: true }
                };
            }
        });
    }
};
ChatDebugResolverContribution = __decorate([
    __param(0, IEditorResolverService)
], ChatDebugResolverContribution);
let ChatAgentSettingContribution = class ChatAgentSettingContribution extends Disposable {
    static { this.ID = 'workbench.contrib.chatAgentSetting'; }
    constructor(experimentService, entitlementService, contextKeyService) {
        super();
        this.experimentService = experimentService;
        this.entitlementService = entitlementService;
        this.contextKeyService = contextKeyService;
        this.newChatButtonExperimentIcon = ChatContextKeys.newChatButtonExperimentIcon.bindTo(this.contextKeyService);
        this.registerMaxRequestsSetting();
        this.registerNewChatButtonIcon();
    }
    registerMaxRequestsSetting() {
        let lastNode;
        const registerMaxRequestsSetting = () => {
            const treatmentId = this.entitlementService.entitlement === ChatEntitlement.Free ?
                'chatAgentMaxRequestsFree' :
                'chatAgentMaxRequestsPro';
            this.experimentService.getTreatment(treatmentId).then((value) => {
                const node = {
                    id: 'chatSidebar',
                    title: nls.localize(6840, null),
                    type: 'object',
                    properties: {
                        'chat.agent.maxRequests': {
                            type: 'number',
                            markdownDescription: nls.localize(6841, null),
                            default: value ?? 50,
                            order: 2,
                        },
                    }
                };
                configurationRegistry.updateConfigurations({ remove: lastNode ? [lastNode] : [], add: [node] });
                lastNode = node;
            });
        };
        this._register(Event.runAndSubscribe(Event.debounce(this.entitlementService.onDidChangeEntitlement, () => { }, 1000), () => registerMaxRequestsSetting()));
    }
    registerNewChatButtonIcon() {
        this.experimentService.getTreatment('chatNewButtonIcon').then((value) => {
            const supportedValues = ['copilot', 'new-session', 'comment'];
            if (typeof value === 'string' && supportedValues.includes(value)) {
                this.newChatButtonExperimentIcon.set(value);
            }
            else {
                this.newChatButtonExperimentIcon.reset();
            }
        });
    }
};
ChatAgentSettingContribution = __decorate([
    __param(0, IWorkbenchAssignmentService),
    __param(1, IChatEntitlementService),
    __param(2, IContextKeyService)
], ChatAgentSettingContribution);
let ChatForegroundSessionCountContribution = class ChatForegroundSessionCountContribution extends Disposable {
    static { this.ID = 'workbench.contrib.chatForegroundSessionCount'; }
    constructor(contextKeyService, chatWidgetService, viewsService, editorService) {
        super();
        this.contextKeyService = contextKeyService;
        this.chatWidgetService = chatWidgetService;
        this.viewsService = viewsService;
        this.editorService = editorService;
        this.foregroundSessionCountContextKey = ChatContextKeys.foregroundSessionCount.bindTo(this.contextKeyService);
        this._register(this.chatWidgetService.onDidAddWidget(() => {
            this.updateForegroundSessionCount();
        }));
        this._register(this.editorService.onDidVisibleEditorsChange(() => {
            this.updateForegroundSessionCount();
        }));
        this._register(Event.filter(this.viewsService.onDidChangeViewVisibility, e => e.id === ChatViewId)(() => {
            this.updateForegroundSessionCount();
        }));
        this.updateForegroundSessionCount();
    }
    updateForegroundSessionCount() {
        let count = this.viewsService.isViewVisible(ChatViewId) ? 1 : 0;
        for (const widget of this.chatWidgetService.getWidgetsByLocations(ChatAgentLocation.Chat)) {
            if (widget.domNode.offsetParent === null) {
                continue;
            }
            if (isIChatViewViewContext(widget.viewContext)) {
                continue;
            }
            if (isIChatResourceViewContext(widget.viewContext) && widget.viewContext.isQuickChat) {
                continue;
            }
            count++;
        }
        this.foregroundSessionCountContextKey.set(count);
    }
};
ChatForegroundSessionCountContribution = __decorate([
    __param(0, IContextKeyService),
    __param(1, IChatWidgetService),
    __param(2, IViewsService),
    __param(3, IEditorService)
], ChatForegroundSessionCountContribution);
/**
 * Given builtin and custom modes, returns only the custom mode IDs that should have actions registered.
 * Custom modes whose names conflict with builtin modes are excluded.
 * If there are name collisions among custom modes, the later mode in the list wins.
 */
function getCustomModesWithUniqueNames(builtinModes, customModes) {
    const customModeIds = new Set();
    const builtinNames = new Set(builtinModes.map(mode => mode.name.get()));
    const customNameToId = new Map();
    for (const mode of customModes) {
        const modeName = mode.name.get();
        // Skip custom modes that conflict with builtin mode names
        if (builtinNames.has(modeName)) {
            continue;
        }
        // If there is a name collision among custom modes, the later one in the list wins
        const existingId = customNameToId.get(modeName);
        if (existingId) {
            customModeIds.delete(existingId);
        }
        customNameToId.set(modeName, mode.id);
        customModeIds.add(mode.id);
    }
    return customModeIds;
}
/**
 * Workbench contribution to register actions for custom chat modes via events
 */
let ChatAgentActionsContribution = class ChatAgentActionsContribution extends Disposable {
    static { this.ID = 'workbench.contrib.chatAgentActions'; }
    constructor(chatModeService) {
        super();
        this.chatModeService = chatModeService;
        this._modeActionDisposables = new DisposableMap();
        this._store.add(this._modeActionDisposables);
        // Register actions for existing custom modes (avoiding name collisions)
        const { builtin, custom } = this.chatModeService.getModes();
        const currentModeIds = getCustomModesWithUniqueNames(builtin, custom);
        for (const mode of custom) {
            if (currentModeIds.has(mode.id)) {
                this._registerModeAction(mode);
            }
        }
        // Listen for custom mode changes by tracking snapshots
        this._register(this.chatModeService.onDidChangeChatModes(() => {
            const { builtin, custom } = this.chatModeService.getModes();
            const currentModeIds = getCustomModesWithUniqueNames(builtin, custom);
            // Remove modes that no longer exist and those replaced by modes later in the list with same name
            for (const modeId of this._modeActionDisposables.keys()) {
                if (!currentModeIds.has(modeId)) {
                    this._modeActionDisposables.deleteAndDispose(modeId);
                }
            }
            // Register new modes
            for (const mode of custom) {
                if (currentModeIds.has(mode.id) && !this._modeActionDisposables.has(mode.id)) {
                    this._registerModeAction(mode);
                }
            }
        }));
    }
    _registerModeAction(mode) {
        const actionClass = class extends ModeOpenChatGlobalAction {
            constructor() {
                super(mode);
            }
        };
        this._modeActionDisposables.set(mode.id, registerAction2(actionClass));
    }
};
ChatAgentActionsContribution = __decorate([
    __param(0, IChatModeService)
], ChatAgentActionsContribution);
let HookSchemaAssociationContribution = class HookSchemaAssociationContribution extends Disposable {
    static { this.ID = 'workbench.contrib.hookSchemaAssociation'; }
    constructor(_configurationService, _pathService) {
        super();
        this._configurationService = _configurationService;
        this._pathService = _pathService;
        this._registrations = this._register(new DisposableStore());
        this._updateAssociations();
        this._register(this._configurationService.onDidChangeConfiguration(e => {
            if (e.affectsConfiguration(PromptsConfig.HOOKS_LOCATION_KEY)) {
                this._updateAssociations();
            }
        }));
    }
    async _updateAssociations() {
        this._registrations.clear();
        const folders = PromptsConfig.promptSourceFolders(this._configurationService, PromptsType.hook);
        const userHomeUri = await this._pathService.userHome();
        const userHome = userHomeUri.fsPath ?? userHomeUri.path;
        for (const folder of folders) {
            // Skip Claude settings files — they use a different schema format
            if (folder.source === PromptFileSource.ClaudeWorkspace || folder.source === PromptFileSource.ClaudeWorkspaceLocal || folder.source === PromptFileSource.ClaudePersonal) {
                continue;
            }
            // Expand tilde paths to absolute paths so the JSON language service can match them
            const resolvedPath = isTildePath(folder.path)
                ? userHome + folder.path.substring(1)
                : folder.path;
            // If it's a specific .json file, use it directly; otherwise treat as directory
            const glob = resolvedPath.toLowerCase().endsWith('.json')
                ? resolvedPath
                : `${resolvedPath}/*.json`;
            this._registrations.add(jsonContributionRegistry.registerSchemaAssociation(HOOK_SCHEMA_URI, glob));
        }
    }
};
HookSchemaAssociationContribution = __decorate([
    __param(0, IConfigurationService),
    __param(1, IPathService)
], HookSchemaAssociationContribution);
let ToolReferenceNamesContribution = class ToolReferenceNamesContribution extends Disposable {
    static { this.ID = 'workbench.contrib.toolReferenceNames'; }
    constructor(_languageModelToolsService) {
        super();
        this._languageModelToolsService = _languageModelToolsService;
        this._updateToolReferenceNames();
        this._register(this._languageModelToolsService.onDidChangeTools(() => this._updateToolReferenceNames()));
    }
    _updateToolReferenceNames() {
        const tools = Array.from(this._languageModelToolsService.getAllToolsIncludingDisabled())
            .filter((tool) => typeof tool.toolReferenceName === 'string')
            .sort((a, b) => a.toolReferenceName.localeCompare(b.toolReferenceName));
        toolReferenceNameEnumValues.length = 0;
        toolReferenceNameEnumDescriptions.length = 0;
        for (const tool of tools) {
            toolReferenceNameEnumValues.push(tool.toolReferenceName);
            const description = tool.userDescription || tool.displayName || tool.toolReferenceName;
            toolReferenceNameEnumDescriptions.push(nls.localize(6842, null, tool.toolReferenceName, description));
        }
        configurationRegistry.notifyConfigurationSchemaUpdated({
            id: 'chatSidebar',
            properties: {
                [ChatConfiguration.EligibleForAutoApproval]: {}
            }
        });
    }
};
ToolReferenceNamesContribution = __decorate([
    __param(0, ILanguageModelToolsService)
], ToolReferenceNamesContribution);
AccessibleViewRegistry.register(new ChatTerminalOutputAccessibleView());
AccessibleViewRegistry.register(new ChatResponseAccessibleView());
AccessibleViewRegistry.register(new PanelChatAccessibilityHelp());
AccessibleViewRegistry.register(new QuickChatAccessibilityHelp());
AccessibleViewRegistry.register(new EditsChatAccessibilityHelp());
AccessibleViewRegistry.register(new AgentChatAccessibilityHelp());
registerEditorFeature(ChatInputBoxContentProvider);
Registry.as(EditorExtensions.EditorFactory).registerEditorSerializer(ChatEditorInput.TypeID, ChatEditorInputSerializer);
Registry.as(EditorExtensions.EditorFactory).registerEditorSerializer(ChatDebugEditorInput.ID, ChatDebugEditorInputSerializer);
registerWorkbenchContribution2(ChatResolverContribution.ID, ChatResolverContribution, 1 /* WorkbenchPhase.BlockStartup */);
registerWorkbenchContribution2(ChatDebugResolverContribution.ID, ChatDebugResolverContribution, 1 /* WorkbenchPhase.BlockStartup */);
registerWorkbenchContribution2(PromptsDebugContribution.ID, PromptsDebugContribution, 2 /* WorkbenchPhase.BlockRestore */);
registerWorkbenchContribution2(ChatLanguageModelsDataContribution.ID, ChatLanguageModelsDataContribution, 2 /* WorkbenchPhase.BlockRestore */);
registerWorkbenchContribution2(ChatSlashCommandsContribution.ID, ChatSlashCommandsContribution, 4 /* WorkbenchPhase.Eventually */);
registerWorkbenchContribution2(ChatExtensionPointHandler.ID, ChatExtensionPointHandler, 1 /* WorkbenchPhase.BlockStartup */);
registerWorkbenchContribution2(LanguageModelToolsExtensionPointHandler.ID, LanguageModelToolsExtensionPointHandler, 2 /* WorkbenchPhase.BlockRestore */);
registerWorkbenchContribution2(ChatPromptFilesExtensionPointHandler.ID, ChatPromptFilesExtensionPointHandler, 2 /* WorkbenchPhase.BlockRestore */);
registerWorkbenchContribution2(ChatCompatibilityNotifier.ID, ChatCompatibilityNotifier, 4 /* WorkbenchPhase.Eventually */);
registerWorkbenchContribution2(CodeBlockActionRendering.ID, CodeBlockActionRendering, 2 /* WorkbenchPhase.BlockRestore */);
registerWorkbenchContribution2(ChatImplicitContextContribution.ID, ChatImplicitContextContribution, 4 /* WorkbenchPhase.Eventually */);
registerWorkbenchContribution2(ChatViewsWelcomeHandler.ID, ChatViewsWelcomeHandler, 1 /* WorkbenchPhase.BlockStartup */);
registerWorkbenchContribution2(ChatGettingStartedContribution.ID, ChatGettingStartedContribution, 4 /* WorkbenchPhase.Eventually */);
registerWorkbenchContribution2(ChatSetupContribution.ID, ChatSetupContribution, 2 /* WorkbenchPhase.BlockRestore */);
registerWorkbenchContribution2(ChatTeardownContribution.ID, ChatTeardownContribution, 3 /* WorkbenchPhase.AfterRestored */);
// registerWorkbenchContribution2(ChatStatusBarEntry.ID, ChatStatusBarEntry, WorkbenchPhase.BlockRestore);
registerWorkbenchContribution2(BuiltinToolsContribution.ID, BuiltinToolsContribution, 4 /* WorkbenchPhase.Eventually */);
registerWorkbenchContribution2(UsagesToolContribution.ID, UsagesToolContribution, 2 /* WorkbenchPhase.BlockRestore */);
registerWorkbenchContribution2(RenameToolContribution.ID, RenameToolContribution, 2 /* WorkbenchPhase.BlockRestore */);
registerWorkbenchContribution2(ChatAgentSettingContribution.ID, ChatAgentSettingContribution, 3 /* WorkbenchPhase.AfterRestored */);
registerWorkbenchContribution2(ChatForegroundSessionCountContribution.ID, ChatForegroundSessionCountContribution, 3 /* WorkbenchPhase.AfterRestored */);
registerWorkbenchContribution2(ChatAgentActionsContribution.ID, ChatAgentActionsContribution, 4 /* WorkbenchPhase.Eventually */);
registerWorkbenchContribution2(HookSchemaAssociationContribution.ID, HookSchemaAssociationContribution, 3 /* WorkbenchPhase.AfterRestored */);
registerWorkbenchContribution2(ToolReferenceNamesContribution.ID, ToolReferenceNamesContribution, 3 /* WorkbenchPhase.AfterRestored */);
registerWorkbenchContribution2(ChatAgentRecommendation.ID, ChatAgentRecommendation, 4 /* WorkbenchPhase.Eventually */);
registerWorkbenchContribution2(ChatEditingEditorAccessibility.ID, ChatEditingEditorAccessibility, 3 /* WorkbenchPhase.AfterRestored */);
registerWorkbenchContribution2(ChatQueuePickerRendering.ID, ChatQueuePickerRendering, 2 /* WorkbenchPhase.BlockRestore */);
registerWorkbenchContribution2(ChatEditingEditorOverlay.ID, ChatEditingEditorOverlay, 3 /* WorkbenchPhase.AfterRestored */);
registerWorkbenchContribution2(SimpleBrowserOverlay.ID, SimpleBrowserOverlay, 3 /* WorkbenchPhase.AfterRestored */);
registerWorkbenchContribution2(ChatEditingEditorContextKeys.ID, ChatEditingEditorContextKeys, 3 /* WorkbenchPhase.AfterRestored */);
registerWorkbenchContribution2(ChatTransferContribution.ID, ChatTransferContribution, 2 /* WorkbenchPhase.BlockRestore */);
registerWorkbenchContribution2(ChatContextContributions.ID, ChatContextContributions, 3 /* WorkbenchPhase.AfterRestored */);
registerWorkbenchContribution2(PromptUrlHandler.ID, PromptUrlHandler, 2 /* WorkbenchPhase.BlockRestore */);
registerWorkbenchContribution2(PluginUrlHandler.ID, PluginUrlHandler, 2 /* WorkbenchPhase.BlockRestore */);
registerWorkbenchContribution2(ChatEditingNotebookFileSystemProviderContrib.ID, ChatEditingNotebookFileSystemProviderContrib, 1 /* WorkbenchPhase.BlockStartup */);
registerWorkbenchContribution2(ChatResponseResourceWorkbenchContribution.ID, ChatResponseResourceWorkbenchContribution, 3 /* WorkbenchPhase.AfterRestored */);
registerWorkbenchContribution2(UserToolSetsContributions.ID, UserToolSetsContributions, 4 /* WorkbenchPhase.Eventually */);
registerWorkbenchContribution2(PromptLanguageFeaturesProvider.ID, PromptLanguageFeaturesProvider, 4 /* WorkbenchPhase.Eventually */);
registerWorkbenchContribution2(ChatWindowNotifier.ID, ChatWindowNotifier, 3 /* WorkbenchPhase.AfterRestored */);
registerWorkbenchContribution2(ChatRepoInfoContribution.ID, ChatRepoInfoContribution, 4 /* WorkbenchPhase.Eventually */);
registerWorkbenchContribution2(AgentPluginsViewsContribution.ID, AgentPluginsViewsContribution, 3 /* WorkbenchPhase.AfterRestored */);
registerWorkbenchContribution2(AgentPluginRecommendations.ID, AgentPluginRecommendations, 4 /* WorkbenchPhase.Eventually */);
registerChatActions();
// registered stubs below
registerChatAccessibilityActions();
registerChatCopyActions();
registerChatOpenAgentDebugPanelAction();
registerChatCodeBlockActions();
registerChatCodeCompareBlockActions();
registerChatFileTreeActions();
registerChatPromptNavigationActions();
registerChatTitleActions();
registerChatExecuteActions();
registerChatQueueActions();
registerQuickChatActions();
registerChatExportActions();
registerChatForkActions();
registerMoveActions();
registerNewChatActions();
registerChatContextActions();
registerChatDeveloperActions();
registerChatEditorActions();
registerChatElicitationActions();
registerChatToolActions();
registerLanguageModelActions();
registerChatPluginActions();
registerAction2(ConfigureToolSets);
registerEditorFeature(ChatPasteProvidersFeature);
agentPluginDiscoveryRegistry.register(new SyncDescriptor(ConfiguredAgentPluginDiscovery));
agentPluginDiscoveryRegistry.register(new SyncDescriptor(MarketplaceAgentPluginDiscovery));
registerSingleton(IChatResponseResourceFileSystemProvider, ChatResponseResourceFileSystemProvider, 1 /* InstantiationType.Delayed */);
registerSingleton(IChatTransferService, ChatTransferService, 1 /* InstantiationType.Delayed */);
// registerSingleton(IChatService, ChatServiceStub as any, InstantiationType.Delayed);
// registerSingleton(IChatWidgetService, ChatWidgetServiceStub as any, InstantiationType.Delayed);
registerSingleton(IQuickChatService, QuickChatService, 1 /* InstantiationType.Delayed */);
registerSingleton(IChatAccessibilityService, ChatAccessibilityService, 1 /* InstantiationType.Delayed */);
registerSingleton(IChatWidgetHistoryService, ChatWidgetHistoryService, 1 /* InstantiationType.Delayed */);
registerSingleton(ILanguageModelsConfigurationService, LanguageModelsConfigurationService, 1 /* InstantiationType.Delayed */);
// registerSingleton(ILanguageModelsService, LanguageModelsServiceStub as any, InstantiationType.Delayed);
// registerSingleton(ILanguageModelStatsService, LanguageModelStatsService, InstantiationType.Delayed);
registerSingleton(IChatSlashCommandService, ChatSlashCommandService, 1 /* InstantiationType.Delayed */);
// registerSingleton(IChatAgentService, ChatAgentServiceStub as any, InstantiationType.Delayed);
// registerSingleton(IChatAgentNameService, ChatAgentNameServiceStub as any, InstantiationType.Delayed);
// registerSingleton(IChatVariablesService, ChatVariablesServiceStub as any, InstantiationType.Delayed);
registerSingleton(IAgentPluginService, AgentPluginService, 1 /* InstantiationType.Delayed */);
registerSingleton(IPluginMarketplaceService, PluginMarketplaceService, 1 /* InstantiationType.Delayed */);
registerSingleton(IWorkspacePluginSettingsService, WorkspacePluginSettingsService, 1 /* InstantiationType.Delayed */);
registerSingleton(IAgentPluginRepositoryService, AgentPluginRepositoryService, 1 /* InstantiationType.Delayed */);
// registerSingleton(IPluginInstallService, PluginInstallService, InstantiationType.Delayed);
// registerSingleton(ILanguageModelToolsService, LanguageModelToolsServiceStub as any, InstantiationType.Delayed);
// registerSingleton(ILanguageModelToolsConfirmationService, LanguageModelToolsConfirmationServiceStub as any, InstantiationType.Delayed);
registerSingleton(IVoiceChatService, VoiceChatService, 1 /* InstantiationType.Delayed */);
registerSingleton(IChatCodeBlockContextProviderService, ChatCodeBlockContextProviderService, 1 /* InstantiationType.Delayed */);
// registerSingleton(ICodeMapperService, CodeMapperServiceStub as any, InstantiationType.Delayed);
// registerSingleton(IChatEditingService, ChatEditingServiceStub as any, InstantiationType.Delayed);
registerSingleton(IChatMarkdownAnchorService, ChatMarkdownAnchorService, 1 /* InstantiationType.Delayed */);
registerSingleton(ILanguageModelIgnoredFilesService, LanguageModelIgnoredFilesService, 1 /* InstantiationType.Delayed */);
// registerSingleton(IPromptsService, PromptsServiceStub as any, InstantiationType.Delayed);
// registerSingleton(IChatContextPickService, ChatContextPickServiceStub as any, InstantiationType.Delayed);
registerSingleton(IChatModeService, ChatModeService, 1 /* InstantiationType.Delayed */);
registerSingleton(IChatAttachmentResolveService, ChatAttachmentResolveService, 1 /* InstantiationType.Delayed */);
registerSingleton(IChatAttachmentWidgetRegistry, ChatAttachmentWidgetRegistry, 1 /* InstantiationType.Delayed */);
registerSingleton(IChatTodoListService, ChatTodoListService, 1 /* InstantiationType.Delayed */);
registerSingleton(IChatArtifactsService, ChatArtifactsService, 1 /* InstantiationType.Delayed */);
registerSingleton(IChatOutputRendererService, ChatOutputRendererService, 1 /* InstantiationType.Delayed */);
registerSingleton(IChatLayoutService, ChatLayoutService, 1 /* InstantiationType.Delayed */);
registerSingleton(IChatTipService, ChatTipService, 1 /* InstantiationType.Delayed */);
registerSingleton(IChatDebugService, ChatDebugServiceImpl, 1 /* InstantiationType.Delayed */);
registerSingleton(IChatImageCarouselService, ChatImageCarouselService, 1 /* InstantiationType.Delayed */);
ChatWidget.CONTRIBS.push(ChatDynamicVariableModel);
//# sourceMappingURL=chat.contribution.js.map