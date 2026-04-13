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
import { timeout } from '../../../../base/common/async.js';
import { MarkdownString, isMarkdownString } from '../../../../base/common/htmlContent.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import * as nls from '../../../../nls.js';
import { ICommandService } from '../../../../platform/commands/common/commands.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { IChatAgentService } from '../common/participants/chatAgents.js';
import { IChatSlashCommandService } from '../common/participants/chatSlashCommands.js';
import { IChatService } from '../common/chatService/chatService.js';
import { ChatAgentLocation, ChatConfiguration, ChatModeKind, ChatPermissionLevel } from '../common/constants.js';
import { ACTION_ID_NEW_CHAT } from './actions/chatActions.js';
import { ChatSubmitAction, OpenModePickerAction, OpenModelPickerAction } from './actions/chatExecuteActions.js';
import { ManagePluginsAction } from './actions/chatPluginActions.js';
import { ConfigureToolsAction } from './actions/chatToolActions.js';
import { IAgentSessionsService } from './agentSessions/agentSessionsService.js';
import { CONFIGURE_INSTRUCTIONS_ACTION_ID } from './promptSyntax/attachInstructionsAction.js';
import { showConfigureHooksQuickPick } from './promptSyntax/hookActions.js';
import { CONFIGURE_PROMPTS_ACTION_ID } from './promptSyntax/runPromptAction.js';
import { CONFIGURE_SKILLS_ACTION_ID } from './promptSyntax/skillActions.js';
import { IChatWidgetService } from './chat.js';
import { agentSlashCommandToMarkdown, agentToMarkdown } from './widget/chatContentParts/chatMarkdownDecorationsRenderer.js';
import { Target } from '../common/promptSyntax/promptTypes.js';
import { IWorkbenchEnvironmentService } from '../../../services/environment/common/environmentService.js';
let ChatSlashCommandsContribution = class ChatSlashCommandsContribution extends Disposable {
    static { this.ID = 'workbench.contrib.chatSlashCommands'; }
    constructor(slashCommandService, commandService, chatAgentService, instantiationService, agentSessionsService, chatService, configurationService, chatWidgetService, environmentService) {
        super();
        this.environmentService = environmentService;
        this._store.add(slashCommandService.registerSlashCommand({
            command: 'clear',
            detail: nls.localize(7432, null),
            sortText: 'z2_clear',
            executeImmediately: true,
            locations: [ChatAgentLocation.Chat]
        }, async (_prompt, _progress, _history, _location, sessionResource) => {
            agentSessionsService.getSession(sessionResource)?.setArchived(true);
            commandService.executeCommand(ACTION_ID_NEW_CHAT);
        }));
        this._store.add(slashCommandService.registerSlashCommand({
            command: 'hooks',
            detail: nls.localize(7433, null),
            sortText: 'z3_hooks',
            executeImmediately: true,
            silent: true,
            locations: [ChatAgentLocation.Chat],
            targets: [Target.VSCode]
        }, async () => {
            await instantiationService.invokeFunction(showConfigureHooksQuickPick);
        }));
        this._store.add(slashCommandService.registerSlashCommand({
            command: 'models',
            detail: nls.localize(7434, null),
            sortText: 'z3_models',
            executeImmediately: true,
            silent: true,
            locations: [ChatAgentLocation.Chat],
            targets: [Target.VSCode]
        }, async () => {
            await commandService.executeCommand(OpenModelPickerAction.ID);
        }));
        this._store.add(slashCommandService.registerSlashCommand({
            command: 'tools',
            detail: nls.localize(7435, null),
            sortText: 'z3_tools',
            executeImmediately: true,
            silent: true,
            locations: [ChatAgentLocation.Chat],
            targets: [Target.VSCode]
        }, async () => {
            await commandService.executeCommand(ConfigureToolsAction.ID);
        }));
        this._store.add(slashCommandService.registerSlashCommand({
            command: 'plugins',
            detail: nls.localize(7436, null),
            sortText: 'z3_plugins',
            executeImmediately: true,
            silent: true,
            locations: [ChatAgentLocation.Chat],
            targets: [Target.VSCode]
        }, async () => {
            await commandService.executeCommand(ManagePluginsAction.ID);
        }));
        if (!this.environmentService.isSessionsWindow) {
            this._store.add(slashCommandService.registerSlashCommand({
                command: 'debug',
                detail: nls.localize(7437, null),
                sortText: 'z3_debug',
                executeImmediately: true,
                silent: true,
                locations: [ChatAgentLocation.Chat],
            }, async () => {
                await commandService.executeCommand('github.copilot.debug.showChatLogView');
            }));
        }
        this._store.add(slashCommandService.registerSlashCommand({
            command: 'agents',
            detail: nls.localize(7438, null),
            sortText: 'z3_agents',
            executeImmediately: true,
            silent: true,
            locations: [ChatAgentLocation.Chat],
            targets: [Target.VSCode]
        }, async () => {
            await commandService.executeCommand(OpenModePickerAction.ID);
        }));
        this._store.add(slashCommandService.registerSlashCommand({
            command: 'skills',
            detail: nls.localize(7439, null),
            sortText: 'z3_skills',
            executeImmediately: true,
            silent: true,
            locations: [ChatAgentLocation.Chat],
            targets: [Target.VSCode]
        }, async () => {
            await commandService.executeCommand(CONFIGURE_SKILLS_ACTION_ID);
        }));
        this._store.add(slashCommandService.registerSlashCommand({
            command: 'instructions',
            detail: nls.localize(7440, null),
            sortText: 'z3_instructions',
            executeImmediately: true,
            silent: true,
            locations: [ChatAgentLocation.Chat],
            targets: [Target.VSCode]
        }, async () => {
            await commandService.executeCommand(CONFIGURE_INSTRUCTIONS_ACTION_ID);
        }));
        this._store.add(slashCommandService.registerSlashCommand({
            command: 'prompts',
            detail: nls.localize(7441, null),
            sortText: 'z3_prompts',
            executeImmediately: true,
            silent: true,
            locations: [ChatAgentLocation.Chat],
            targets: [Target.VSCode]
        }, async () => {
            await commandService.executeCommand(CONFIGURE_PROMPTS_ACTION_ID);
        }));
        this._store.add(slashCommandService.registerSlashCommand({
            command: 'fork',
            detail: nls.localize(7442, null),
            sortText: 'z2_fork',
            executeImmediately: true,
            silent: true,
            locations: [ChatAgentLocation.Chat],
            targets: [Target.VSCode, Target.GitHubCopilot]
        }, async (_prompt, _progress, _history, _location, sessionResource) => {
            await commandService.executeCommand('workbench.action.chat.forkConversation', sessionResource);
        }));
        this._store.add(slashCommandService.registerSlashCommand({
            command: 'rename',
            detail: nls.localize(7443, null),
            sortText: 'z2_rename',
            executeImmediately: false,
            silent: true,
            locations: [ChatAgentLocation.Chat],
            targets: [Target.VSCode]
        }, async (prompt, _progress, _history, _location, sessionResource) => {
            const title = prompt.trim();
            if (title) {
                chatService.setChatSessionTitle(sessionResource, title);
            }
        }));
        const setPermissionLevelForSession = (sessionResource, level) => {
            const widget = chatWidgetService.getWidgetBySessionResource(sessionResource) ?? chatWidgetService.lastFocusedWidget;
            if (widget) {
                widget.input.setPermissionLevel(level);
            }
        };
        const autoApprovePolicyValue = configurationService.inspect(ChatConfiguration.GlobalAutoApprove).policyValue;
        if (autoApprovePolicyValue !== false) {
            this._store.add(slashCommandService.registerSlashCommand({
                command: 'autoApprove',
                detail: nls.localize(7444, null),
                sortText: 'z1_autoApprove',
                executeImmediately: true,
                silent: true,
                locations: [ChatAgentLocation.Chat]
            }, async (_prompt, _progress, _history, _location, sessionResource) => {
                setPermissionLevelForSession(sessionResource, ChatPermissionLevel.AutoApprove);
            }));
            this._store.add(slashCommandService.registerSlashCommand({
                command: 'disableAutoApprove',
                detail: nls.localize(7445, null),
                sortText: 'z1_disableAutoApprove',
                executeImmediately: true,
                silent: true,
                locations: [ChatAgentLocation.Chat]
            }, async (_prompt, _progress, _history, _location, sessionResource) => {
                setPermissionLevelForSession(sessionResource, ChatPermissionLevel.Default);
            }));
            this._store.add(slashCommandService.registerSlashCommand({
                command: 'yolo',
                detail: nls.localize(7446, null),
                sortText: 'z1_yolo',
                executeImmediately: true,
                silent: true,
                locations: [ChatAgentLocation.Chat]
            }, async (_prompt, _progress, _history, _location, sessionResource) => {
                setPermissionLevelForSession(sessionResource, ChatPermissionLevel.AutoApprove);
            }));
            this._store.add(slashCommandService.registerSlashCommand({
                command: 'disableYolo',
                detail: nls.localize(7447, null),
                sortText: 'z1_disableYolo',
                executeImmediately: true,
                silent: true,
                locations: [ChatAgentLocation.Chat]
            }, async (_prompt, _progress, _history, _location, sessionResource) => {
                setPermissionLevelForSession(sessionResource, ChatPermissionLevel.Default);
            }));
            if (configurationService.getValue(ChatConfiguration.AutopilotEnabled) !== false) {
                this._store.add(slashCommandService.registerSlashCommand({
                    command: 'autopilot',
                    detail: nls.localize(7448, null),
                    sortText: 'z1_autopilot',
                    executeImmediately: true,
                    silent: true,
                    locations: [ChatAgentLocation.Chat]
                }, async (_prompt, _progress, _history, _location, sessionResource) => {
                    setPermissionLevelForSession(sessionResource, ChatPermissionLevel.Autopilot);
                }));
                this._store.add(slashCommandService.registerSlashCommand({
                    command: 'exitAutopilot',
                    detail: nls.localize(7449, null),
                    sortText: 'z1_exitAutopilot',
                    executeImmediately: true,
                    silent: true,
                    locations: [ChatAgentLocation.Chat]
                }, async (_prompt, _progress, _history, _location, sessionResource) => {
                    setPermissionLevelForSession(sessionResource, ChatPermissionLevel.Default);
                }));
            }
        }
        this._store.add(slashCommandService.registerSlashCommand({
            command: 'help',
            detail: '',
            sortText: 'z1_help',
            executeImmediately: true,
            locations: [ChatAgentLocation.Chat],
            modes: [ChatModeKind.Ask],
            targets: [Target.VSCode]
        }, async (prompt, progress, _history, _location, sessionResource) => {
            const defaultAgent = chatAgentService.getDefaultAgent(ChatAgentLocation.Chat);
            const agents = chatAgentService.getAgents();
            // Report prefix
            if (defaultAgent?.metadata.helpTextPrefix) {
                if (isMarkdownString(defaultAgent.metadata.helpTextPrefix)) {
                    progress.report({ content: defaultAgent.metadata.helpTextPrefix, kind: 'markdownContent' });
                }
                else {
                    progress.report({ content: new MarkdownString(defaultAgent.metadata.helpTextPrefix), kind: 'markdownContent' });
                }
                progress.report({ content: new MarkdownString('\n\n'), kind: 'markdownContent' });
            }
            // Report agent list
            const agentText = (await Promise.all(agents
                .filter(a => !a.isDefault && !a.isCore)
                .filter(a => a.locations.includes(ChatAgentLocation.Chat))
                .map(async (a) => {
                const description = a.description ? `- ${a.description}` : '';
                const agentMarkdown = instantiationService.invokeFunction(accessor => agentToMarkdown(a, sessionResource, true, accessor));
                const agentLine = `- ${agentMarkdown} ${description}`;
                const commandText = a.slashCommands.map(c => {
                    const description = c.description ? `- ${c.description}` : '';
                    return `\t* ${agentSlashCommandToMarkdown(a, c, sessionResource)} ${description}`;
                }).join('\n');
                return (agentLine + '\n' + commandText).trim();
            }))).join('\n');
            progress.report({ content: new MarkdownString(agentText, { isTrusted: { enabledCommands: [ChatSubmitAction.ID] } }), kind: 'markdownContent' });
            // Report help text ending
            if (defaultAgent?.metadata.helpTextPostfix) {
                progress.report({ content: new MarkdownString('\n\n'), kind: 'markdownContent' });
                if (isMarkdownString(defaultAgent.metadata.helpTextPostfix)) {
                    progress.report({ content: defaultAgent.metadata.helpTextPostfix, kind: 'markdownContent' });
                }
                else {
                    progress.report({ content: new MarkdownString(defaultAgent.metadata.helpTextPostfix), kind: 'markdownContent' });
                }
            }
            // Without this, the response will be done before it renders and so it will not stream. This ensures that if the response starts
            // rendering during the next 200ms, then it will be streamed. Once it starts streaming, the whole response streams even after
            // it has received all response data has been received.
            await timeout(200);
        }));
    }
};
ChatSlashCommandsContribution = __decorate([
    __param(0, IChatSlashCommandService),
    __param(1, ICommandService),
    __param(2, IChatAgentService),
    __param(3, IInstantiationService),
    __param(4, IAgentSessionsService),
    __param(5, IChatService),
    __param(6, IConfigurationService),
    __param(7, IChatWidgetService),
    __param(8, IWorkbenchEnvironmentService)
], ChatSlashCommandsContribution);
export { ChatSlashCommandsContribution };
//# sourceMappingURL=chatSlashCommands.js.map