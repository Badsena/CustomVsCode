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
import { PromptsService } from '../../../../workbench/contrib/chat/common/promptSyntax/service/promptsServiceImpl.js';
import { PromptFilesLocator } from '../../../../workbench/contrib/chat/common/promptSyntax/utils/promptFilesLocator.js';
import { Event } from '../../../../base/common/event.js';
import { basename, dirname, isEqualOrParent, joinPath } from '../../../../base/common/resources.js';
import { CancellationToken } from '../../../../base/common/cancellation.js';
import { FileAccess } from '../../../../base/common/network.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { IFileService } from '../../../../platform/files/common/files.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { IWorkspaceContextService } from '../../../../platform/workspace/common/workspace.js';
import { HOOKS_SOURCE_FOLDER, SKILL_FILENAME, getCleanPromptName } from '../../../../workbench/contrib/chat/common/promptSyntax/config/promptFileLocations.js';
import { PromptsType } from '../../../../workbench/contrib/chat/common/promptSyntax/promptTypes.js';
import { PromptsStorage } from '../../../../workbench/contrib/chat/common/promptSyntax/service/promptsService.js';
import { BUILTIN_STORAGE } from '../../chat/common/builtinPromptsStorage.js';
import { IWorkbenchEnvironmentService } from '../../../../workbench/services/environment/common/environmentService.js';
import { IPathService } from '../../../../workbench/services/path/common/pathService.js';
import { ISearchService } from '../../../../workbench/services/search/common/search.js';
import { IUserDataProfileService } from '../../../../workbench/services/userDataProfile/common/userDataProfile.js';
import { IAICustomizationWorkspaceService } from '../../../../workbench/contrib/chat/common/aiCustomizationWorkspaceService.js';
import { IWorkspaceTrustManagementService } from '../../../../platform/workspace/common/workspaceTrust.js';
/** URI root for built-in prompts bundled with the Sessions app. */
export const BUILTIN_PROMPTS_URI = FileAccess.asFileUri('vs/sessions/prompts');
/** URI root for built-in skills bundled with the Sessions app. */
export const BUILTIN_SKILLS_URI = FileAccess.asFileUri('vs/sessions/skills');
export class AgenticPromptsService extends PromptsService {
    createPromptFilesLocator() {
        return this.instantiationService.createInstance(AgenticPromptFilesLocator);
    }
    getCopilotRoot() {
        if (!this._copilotRoot) {
            const pathService = this.instantiationService.invokeFunction(accessor => accessor.get(IPathService));
            this._copilotRoot = joinPath(pathService.userHome({ preferLocal: true }), '.copilot');
        }
        return this._copilotRoot;
    }
    /**
     * Returns built-in prompt files bundled with the Sessions app.
     */
    async getBuiltinPromptFiles(type) {
        if (type !== PromptsType.prompt) {
            return [];
        }
        if (!this._builtinPromptsCache) {
            this._builtinPromptsCache = new Map();
        }
        let cached = this._builtinPromptsCache.get(type);
        if (!cached) {
            cached = this.discoverBuiltinPrompts(type);
            this._builtinPromptsCache.set(type, cached);
        }
        return cached;
    }
    async discoverBuiltinPrompts(type) {
        const fileService = this.instantiationService.invokeFunction(accessor => accessor.get(IFileService));
        const promptsDir = FileAccess.asFileUri('vs/sessions/prompts');
        try {
            const stat = await fileService.resolve(promptsDir);
            if (!stat.children) {
                return [];
            }
            return stat.children
                .filter(child => !child.isDirectory && child.name.endsWith('.prompt.md'))
                .map(child => ({ uri: child.resource, storage: BUILTIN_STORAGE, type }));
        }
        catch {
            return [];
        }
    }
    //#region Built-in Skills
    /**
     * Returns built-in skill metadata, discovering and parsing SKILL.md files
     * bundled in the `vs/sessions/skills/` directory.
     */
    async getBuiltinSkills() {
        if (!this._builtinSkillsCache) {
            this._builtinSkillsCache = this.discoverBuiltinSkills();
        }
        return this._builtinSkillsCache;
    }
    /**
     * Discovers built-in skills from `vs/sessions/skills/{name}/SKILL.md`.
     * Each subdirectory containing a SKILL.md is treated as a skill.
     */
    async discoverBuiltinSkills() {
        const fileService = this.instantiationService.invokeFunction(accessor => accessor.get(IFileService));
        try {
            const stat = await fileService.resolve(BUILTIN_SKILLS_URI);
            if (!stat.children) {
                return [];
            }
            const skills = [];
            for (const child of stat.children) {
                if (!child.isDirectory) {
                    continue;
                }
                const skillFileUri = joinPath(child.resource, SKILL_FILENAME);
                try {
                    const parsed = await this.parseNew(skillFileUri, CancellationToken.None);
                    const rawName = parsed.header?.name;
                    const rawDescription = parsed.header?.description;
                    if (!rawName || !rawDescription) {
                        continue;
                    }
                    const name = sanitizeSkillText(rawName, 64);
                    const description = sanitizeSkillText(rawDescription, 1024);
                    const folderName = basename(child.resource);
                    if (name !== folderName) {
                        continue;
                    }
                    skills.push({
                        uri: skillFileUri,
                        storage: BUILTIN_STORAGE,
                        name,
                        description,
                        disableModelInvocation: parsed.header?.disableModelInvocation === true,
                        userInvocable: parsed.header?.userInvocable !== false,
                    });
                }
                catch (e) {
                    this.logger.warn(`[discoverBuiltinSkills] Failed to parse built-in skill: ${skillFileUri}`, e instanceof Error ? e.message : String(e));
                }
            }
            return skills;
        }
        catch {
            return [];
        }
    }
    /**
     * Returns built-in skill file paths for listing in the UI.
     */
    async getBuiltinSkillPaths() {
        const skills = await this.getBuiltinSkills();
        return skills.map(s => ({
            uri: s.uri,
            storage: BUILTIN_STORAGE,
            type: PromptsType.skill,
            name: s.name,
            description: s.description,
        }));
    }
    /**
     * Override to include built-in skills, appending them with lowest priority.
     * Skills from any other source (workspace, user, extension, internal) take precedence.
     */
    async findAgentSkills(token, sessionResource) {
        const baseResult = await super.findAgentSkills(token, sessionResource);
        if (baseResult === undefined) {
            return undefined;
        }
        const builtinSkills = await this.getBuiltinSkills();
        if (builtinSkills.length === 0) {
            return baseResult;
        }
        // Collect names already present from other sources
        const existingNames = new Set(baseResult.map(s => s.name));
        const disabledSkills = this.getDisabledPromptFiles(PromptsType.skill);
        const nonOverridden = builtinSkills.filter(s => !existingNames.has(s.name) && !disabledSkills.has(s.uri));
        if (nonOverridden.length === 0) {
            return baseResult;
        }
        return [...baseResult, ...nonOverridden];
    }
    //#endregion
    /**
     * Override to include built-in prompts and built-in skills, filtering out
     * those overridden by user or workspace items with the same name.
     */
    async listPromptFiles(type, token) {
        const baseResults = await super.listPromptFiles(type, token);
        let builtinItems;
        if (type === PromptsType.skill) {
            builtinItems = await this.getBuiltinSkillPaths();
        }
        else {
            builtinItems = await this.getBuiltinPromptFiles(type);
        }
        if (builtinItems.length === 0) {
            return baseResults;
        }
        // Collect names of user/workspace items to detect overrides
        const overriddenNames = new Set();
        for (const p of baseResults) {
            if (p.storage === PromptsStorage.local || p.storage === PromptsStorage.user) {
                overriddenNames.add(type === PromptsType.skill ? basename(dirname(p.uri)) : getCleanPromptName(p.uri));
            }
        }
        const nonOverridden = builtinItems.filter(p => !overriddenNames.has(type === PromptsType.skill ? basename(dirname(p.uri)) : getCleanPromptName(p.uri)));
        // Built-in items use BUILTIN_STORAGE ('builtin') which is not in the
        // core IPromptPath union but is handled by the sessions UI layer.
        return [...baseResults, ...nonOverridden];
    }
    async listPromptFilesForStorage(type, storage, token) {
        if (storage === BUILTIN_STORAGE) {
            if (type === PromptsType.skill) {
                return this.getBuiltinSkillPaths();
            }
            return this.getBuiltinPromptFiles(type);
        }
        return super.listPromptFilesForStorage(type, storage, token);
    }
    /**
     * Override to use ~/.copilot as the user-level source folder for creation,
     * instead of the VS Code profile's promptsHome.
     */
    async getSourceFolders(type) {
        const folders = await super.getSourceFolders(type);
        const copilotRoot = this.getCopilotRoot();
        // Replace any user-storage folders with the CLI-accessible ~/.copilot root
        return folders.map(folder => {
            if (folder.storage === PromptsStorage.user) {
                const subfolder = getCliUserSubfolder(type);
                return subfolder
                    ? { ...folder, uri: joinPath(copilotRoot, subfolder) }
                    : folder;
            }
            return folder;
        });
    }
}
let AgenticPromptFilesLocator = class AgenticPromptFilesLocator extends PromptFilesLocator {
    constructor(fileService, configService, workspaceService, environmentService, searchService, userDataService, logService, pathService, workspaceTrustManagementService, customizationWorkspaceService) {
        super(fileService, configService, workspaceService, environmentService, searchService, userDataService, logService, pathService, workspaceTrustManagementService);
        this.customizationWorkspaceService = customizationWorkspaceService;
    }
    getWorkspaceFolders() {
        const folder = this.getActiveWorkspaceFolder();
        return folder ? [folder] : [];
    }
    getWorkspaceFolder(resource) {
        const folder = this.getActiveWorkspaceFolder();
        if (!folder) {
            return undefined;
        }
        return isEqualOrParent(resource, folder.uri) ? folder : undefined;
    }
    onDidChangeWorkspaceFolders() {
        return Event.fromObservableLight(this.customizationWorkspaceService.activeProjectRoot);
    }
    async getHookSourceFolders() {
        const configured = await super.getHookSourceFolders();
        if (configured.length > 0) {
            return configured;
        }
        const folder = this.getActiveWorkspaceFolder();
        return folder ? [joinPath(folder.uri, HOOKS_SOURCE_FOLDER)] : [];
    }
    getActiveWorkspaceFolder() {
        const root = this.customizationWorkspaceService.getActiveProjectRoot();
        if (!root) {
            return undefined;
        }
        return {
            uri: root,
            name: basename(root),
            index: 0,
            toResource: relativePath => joinPath(root, relativePath),
        };
    }
};
AgenticPromptFilesLocator = __decorate([
    __param(0, IFileService),
    __param(1, IConfigurationService),
    __param(2, IWorkspaceContextService),
    __param(3, IWorkbenchEnvironmentService),
    __param(4, ISearchService),
    __param(5, IUserDataProfileService),
    __param(6, ILogService),
    __param(7, IPathService),
    __param(8, IWorkspaceTrustManagementService),
    __param(9, IAICustomizationWorkspaceService)
], AgenticPromptFilesLocator);
/**
 * Returns the subfolder name under ~/.copilot/ for a given customization type.
 * Used to determine the CLI-accessible user creation target.
 *
 * Prompts are a VS Code concept and use the standard profile promptsHome,
 * so they are intentionally excluded here.
 */
function getCliUserSubfolder(type) {
    switch (type) {
        case PromptsType.instructions: return 'instructions';
        case PromptsType.skill: return 'skills';
        case PromptsType.agent: return 'agents';
        default: return undefined;
    }
}
/**
 * Strips XML tags and truncates to the given max length.
 * Matches the sanitization applied by PromptsService for other skill sources.
 */
function sanitizeSkillText(text, maxLength) {
    const sanitized = text.replace(/<[^>]+>/g, '');
    return sanitized.length > maxLength ? sanitized.substring(0, maxLength) : sanitized;
}
//# sourceMappingURL=promptsService.js.map