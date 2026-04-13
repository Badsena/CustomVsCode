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
import { constObservable, derived, observableFromEventOpts } from '../../../../../base/common/observable.js';
import { IWorkspaceContextService } from '../../../../../platform/workspace/common/workspace.js';
import { IAICustomizationWorkspaceService, AICustomizationManagementSection } from '../../common/aiCustomizationWorkspaceService.js';
import { registerSingleton } from '../../../../../platform/instantiation/common/extensions.js';
import { IPromptsService } from '../../common/promptSyntax/service/promptsService.js';
import { ICommandService } from '../../../../../platform/commands/common/commands.js';
import { PromptsType } from '../../common/promptSyntax/promptTypes.js';
import { ICustomizationHarnessService } from '../../common/customizationHarnessService.js';
import { GENERATE_AGENT_COMMAND_ID, GENERATE_HOOK_COMMAND_ID, GENERATE_ON_DEMAND_INSTRUCTIONS_COMMAND_ID, GENERATE_PROMPT_COMMAND_ID, GENERATE_SKILL_COMMAND_ID, } from '../actions/chatActions.js';
let AICustomizationWorkspaceService = class AICustomizationWorkspaceService {
    constructor(workspaceContextService, commandService, promptsService, harnessService) {
        this.workspaceContextService = workspaceContextService;
        this.commandService = commandService;
        this.promptsService = promptsService;
        this.harnessService = harnessService;
        this.managementSections = [
            AICustomizationManagementSection.Agents,
            AICustomizationManagementSection.Skills,
            AICustomizationManagementSection.Instructions,
            AICustomizationManagementSection.Prompts,
            AICustomizationManagementSection.Hooks,
            AICustomizationManagementSection.McpServers,
            AICustomizationManagementSection.Plugins,
        ];
        this.isSessionsWindow = false;
        this.hasOverrideProjectRoot = constObservable(false);
        const workspaceFolders = observableFromEventOpts({ owner: this }, this.workspaceContextService.onDidChangeWorkspaceFolders, () => this.workspaceContextService.getWorkspace().folders);
        this.activeProjectRoot = derived(reader => {
            const folders = workspaceFolders.read(reader);
            return folders[0]?.uri;
        });
    }
    getActiveProjectRoot() {
        const folders = this.workspaceContextService.getWorkspace().folders;
        return folders[0]?.uri;
    }
    getStorageSourceFilter(type) {
        return this.harnessService.getStorageSourceFilter(type);
    }
    setOverrideProjectRoot(_root) { }
    clearOverrideProjectRoot() { }
    async commitFiles(_projectRoot, _fileUris) {
        // No-op in core VS Code.
    }
    async deleteFiles(_projectRoot, _fileUris) {
        // No-op in core VS Code.
    }
    async generateCustomization(type) {
        const commandIds = {
            [PromptsType.agent]: GENERATE_AGENT_COMMAND_ID,
            [PromptsType.skill]: GENERATE_SKILL_COMMAND_ID,
            [PromptsType.instructions]: GENERATE_ON_DEMAND_INSTRUCTIONS_COMMAND_ID,
            [PromptsType.prompt]: GENERATE_PROMPT_COMMAND_ID,
            [PromptsType.hook]: GENERATE_HOOK_COMMAND_ID,
        };
        const commandId = commandIds[type];
        if (commandId) {
            await this.commandService.executeCommand(commandId);
        }
    }
    async getFilteredPromptSlashCommands(token) {
        return this.promptsService.getPromptSlashCommands(token);
    }
};
AICustomizationWorkspaceService = __decorate([
    __param(0, IWorkspaceContextService),
    __param(1, ICommandService),
    __param(2, IPromptsService),
    __param(3, ICustomizationHarnessService)
], AICustomizationWorkspaceService);
registerSingleton(IAICustomizationWorkspaceService, AICustomizationWorkspaceService, 1 /* InstantiationType.Delayed */);
//# sourceMappingURL=aiCustomizationWorkspaceService.js.map