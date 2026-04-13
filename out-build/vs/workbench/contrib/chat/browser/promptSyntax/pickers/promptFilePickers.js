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
import { localize } from '../../../../../../nls.js';
import { URI } from '../../../../../../base/common/uri.js';
import { Codicon } from '../../../../../../base/common/codicons.js';
import { ThemeIcon } from '../../../../../../base/common/themables.js';
import { AgentFileType, IPromptsService, PromptsStorage } from '../../../common/promptSyntax/service/promptsService.js';
import { basename, dirname, extUri, joinPath } from '../../../../../../base/common/resources.js';
import { DisposableStore } from '../../../../../../base/common/lifecycle.js';
import { IFileService } from '../../../../../../platform/files/common/files.js';
import { IOpenerService } from '../../../../../../platform/opener/common/opener.js';
import { IDialogService } from '../../../../../../platform/dialogs/common/dialogs.js';
import { ICommandService } from '../../../../../../platform/commands/common/commands.js';
import { getCleanPromptName } from '../../../common/promptSyntax/config/promptFileLocations.js';
import { PromptsType, INSTRUCTIONS_DOCUMENTATION_URL, AGENT_DOCUMENTATION_URL, PROMPT_DOCUMENTATION_URL, SKILL_DOCUMENTATION_URL, HOOK_DOCUMENTATION_URL } from '../../../common/promptSyntax/promptTypes.js';
import { NEW_PROMPT_COMMAND_ID, NEW_INSTRUCTIONS_COMMAND_ID, NEW_AGENT_COMMAND_ID, NEW_SKILL_COMMAND_ID } from '../newPromptFileActions.js';
import { GENERATE_AGENT_INSTRUCTIONS_COMMAND_ID, GENERATE_ON_DEMAND_INSTRUCTIONS_COMMAND_ID, GENERATE_PROMPT_COMMAND_ID, GENERATE_SKILL_COMMAND_ID, GENERATE_AGENT_COMMAND_ID } from '../../actions/chatActions.js';
import { IQuickInputService } from '../../../../../../platform/quickinput/common/quickInput.js';
import { askForPromptFileName } from './askForPromptName.js';
import { IInstantiationService } from '../../../../../../platform/instantiation/common/instantiation.js';
import { CancellationToken, CancellationTokenSource } from '../../../../../../base/common/cancellation.js';
import { askForPromptSourceFolder } from './askForPromptSourceFolder.js';
import { ILabelService } from '../../../../../../platform/label/common/label.js';
import { IProductService } from '../../../../../../platform/product/common/productService.js';
import { PromptFileRewriter } from '../promptFileRewriter.js';
import { isOrganizationPromptFile } from '../../../common/promptSyntax/utils/promptsServiceUtils.js';
import { assertNever } from '../../../../../../base/common/assert.js';
/**
 * Button that opens the documentation.
 */
function newHelpButton(type) {
    const iconClass = ThemeIcon.asClassName(Codicon.question);
    switch (type) {
        case PromptsType.prompt:
            return {
                tooltip: localize(7706, null),
                helpURI: URI.parse(PROMPT_DOCUMENTATION_URL),
                iconClass
            };
        case PromptsType.instructions:
            return {
                tooltip: localize(7707, null),
                helpURI: URI.parse(INSTRUCTIONS_DOCUMENTATION_URL),
                iconClass
            };
        case PromptsType.agent:
            return {
                tooltip: localize(7708, null),
                helpURI: URI.parse(AGENT_DOCUMENTATION_URL),
                iconClass
            };
        case PromptsType.skill:
            return {
                tooltip: localize(7709, null),
                helpURI: URI.parse(SKILL_DOCUMENTATION_URL),
                iconClass
            };
        case PromptsType.hook:
            return {
                tooltip: localize(7710, null),
                helpURI: URI.parse(HOOK_DOCUMENTATION_URL),
                iconClass
            };
    }
}
function isHelpButton(button) {
    return button.helpURI !== undefined;
}
function isPromptFileItem(item) {
    return item.type === 'item' && !!item.promptFileUri;
}
/**
 * Type guard for extension prompt paths.
 */
function isExtensionPromptPath(prompt) {
    return prompt.storage === PromptsStorage.extension && !!prompt.extension;
}
/**
 * A quick pick item that starts the 'New Prompt File' command.
 */
const NEW_PROMPT_FILE_OPTION = {
    type: 'item',
    label: `$(plus) ${localize(7711, null)}`,
    pickable: false,
    alwaysShow: true,
    buttons: [newHelpButton(PromptsType.prompt)],
    commandId: NEW_PROMPT_COMMAND_ID,
};
/**
 * A quick pick item that starts the 'New Instructions File' command.
 */
const NEW_INSTRUCTIONS_FILE_OPTION = {
    type: 'item',
    label: `$(plus) ${localize(7712, null)}`,
    pickable: false,
    alwaysShow: true,
    buttons: [newHelpButton(PromptsType.instructions)],
    commandId: NEW_INSTRUCTIONS_COMMAND_ID,
};
/**
 * A quick pick item that starts the 'Generate Agent Instructions' command.
 */
const GENERATE_AGENT_INSTRUCTIONS_OPTION = {
    type: 'item',
    label: `$(sparkle) ${localize(7713, null)}`,
    pickable: false,
    alwaysShow: true,
    buttons: [newHelpButton(PromptsType.instructions)],
    commandId: GENERATE_AGENT_INSTRUCTIONS_COMMAND_ID,
};
/**
 * A quick pick item that starts the 'Generate On-demand Instructions' command.
 */
const GENERATE_ON_DEMAND_INSTRUCTIONS_OPTION = {
    type: 'item',
    label: `$(sparkle) ${localize(7714, null)}`,
    pickable: false,
    alwaysShow: true,
    buttons: [newHelpButton(PromptsType.instructions)],
    commandId: GENERATE_ON_DEMAND_INSTRUCTIONS_COMMAND_ID,
};
/**
 * A quick pick item that starts the 'New Agent File' command.
 */
const NEW_AGENT_FILE_OPTION = {
    type: 'item',
    label: `$(plus) ${localize(7715, null)}`,
    pickable: false,
    alwaysShow: true,
    buttons: [newHelpButton(PromptsType.agent)],
    commandId: NEW_AGENT_COMMAND_ID,
};
/**
 * A quick pick item that starts the 'New Skill' command.
 */
const NEW_SKILL_FILE_OPTION = {
    type: 'item',
    label: `$(plus) ${localize(7716, null)}`,
    pickable: false,
    alwaysShow: true,
    buttons: [newHelpButton(PromptsType.skill)],
    commandId: NEW_SKILL_COMMAND_ID,
};
/**
 * A quick pick item that generates a prompt file with agent.
 */
const GENERATE_PROMPT_OPTION = {
    type: 'item',
    label: `$(sparkle) ${localize(7717, null)}`,
    pickable: false,
    alwaysShow: true,
    buttons: [newHelpButton(PromptsType.prompt)],
    commandId: GENERATE_PROMPT_COMMAND_ID,
};
/**
 * A quick pick item that generates a skill with agent.
 */
const GENERATE_SKILL_OPTION = {
    type: 'item',
    label: `$(sparkle) ${localize(7718, null)}`,
    pickable: false,
    alwaysShow: true,
    buttons: [newHelpButton(PromptsType.skill)],
    commandId: GENERATE_SKILL_COMMAND_ID,
};
/**
 * A quick pick item that generates a custom agent with agent.
 */
const GENERATE_AGENT_OPTION = {
    type: 'item',
    label: `$(sparkle) ${localize(7719, null)}`,
    pickable: false,
    alwaysShow: true,
    buttons: [newHelpButton(PromptsType.agent)],
    commandId: GENERATE_AGENT_COMMAND_ID,
};
/**
 * Button that opens a prompt file in the editor.
 */
const EDIT_BUTTON = {
    tooltip: localize(7720, null),
    iconClass: ThemeIcon.asClassName(Codicon.fileCode),
};
/**
 * Button that deletes a prompt file.
 */
const DELETE_BUTTON = {
    tooltip: localize(7721, null),
    iconClass: ThemeIcon.asClassName(Codicon.trash),
};
/**
 * Button that renames a prompt file.
 */
const RENAME_BUTTON = {
    tooltip: localize(7722, null),
    iconClass: ThemeIcon.asClassName(Codicon.replace),
};
/**
 * Button that copies a prompt file.
 */
const COPY_BUTTON = {
    tooltip: localize(7723, null),
    iconClass: ThemeIcon.asClassName(Codicon.copy),
};
/**
 * Button that sets a prompt file to be visible.
 */
const MAKE_VISIBLE_BUTTON = {
    tooltip: localize(7724, null),
    iconClass: ThemeIcon.asClassName(Codicon.eyeClosed),
    alwaysVisible: true,
};
/**
 * Button that sets a prompt file to be invisible.
 */
const MAKE_INVISIBLE_BUTTON = {
    tooltip: localize(7725, null),
    iconClass: ThemeIcon.asClassName(Codicon.eye),
};
const RUN_IN_CHAT_BUTTON = {
    tooltip: localize(7726, null),
    iconClass: ThemeIcon.asClassName(Codicon.play),
};
let PromptFilePickers = class PromptFilePickers {
    constructor(_quickInputService, _openerService, _fileService, _dialogService, _commandService, _instaService, _promptsService, _labelService, _productService) {
        this._quickInputService = _quickInputService;
        this._openerService = _openerService;
        this._fileService = _fileService;
        this._dialogService = _dialogService;
        this._commandService = _commandService;
        this._instaService = _instaService;
        this._promptsService = _promptsService;
        this._labelService = _labelService;
        this._productService = _productService;
    }
    /**
     * Shows the prompt file selection dialog to the user that allows to run a prompt file(s).
     *
     * If {@link ISelectOptions.resource resource} is provided, the dialog will have
     * the resource pre-selected in the prompts list.
     */
    async selectPromptFile(options) {
        const cts = new CancellationTokenSource();
        const quickPick = this._quickInputService.createQuickPick({ useSeparators: true });
        quickPick.busy = true;
        quickPick.placeholder = localize(7727, null);
        try {
            const fileOptions = await this._createPromptPickItems(options, cts.token);
            const activeItem = options.resource && fileOptions.find(f => f.type === 'item' && extUri.isEqual(f.promptFileUri, options.resource));
            if (activeItem) {
                quickPick.activeItems = [activeItem];
            }
            quickPick.placeholder = options.placeholder;
            quickPick.matchOnDescription = true;
            quickPick.items = fileOptions;
        }
        finally {
            quickPick.busy = false;
        }
        return new Promise(resolve => {
            const disposables = new DisposableStore();
            let isResolved = false;
            let isClosed = false;
            disposables.add(quickPick);
            disposables.add(cts);
            const refreshItems = async () => {
                const active = quickPick.activeItems;
                const newItems = await this._createPromptPickItems(options, CancellationToken.None);
                quickPick.items = newItems;
                quickPick.activeItems = active;
            };
            // handle the prompt `accept` event
            disposables.add(quickPick.onDidAccept(async () => {
                const { selectedItems } = quickPick;
                const { keyMods } = quickPick;
                const selectedItem = selectedItems[0];
                if (isPromptFileItem(selectedItem)) {
                    resolve({ promptFile: selectedItem.promptFileUri, keyMods: { ...keyMods } });
                    isResolved = true;
                }
                else {
                    if (selectedItem.commandId) {
                        await this._commandService.executeCommand(selectedItem.commandId);
                        return;
                    }
                }
                quickPick.hide();
            }));
            // handle the `button click` event on a list item (edit, delete, etc.)
            disposables.add(quickPick.onDidTriggerItemButton(async (e) => {
                const shouldRefresh = await this._handleButtonClick(quickPick, e, options);
                if (!isClosed && shouldRefresh) {
                    await refreshItems();
                }
            }));
            disposables.add(quickPick.onDidHide(() => {
                if (!quickPick.ignoreFocusOut) {
                    disposables.dispose();
                    isClosed = true;
                    if (!isResolved) {
                        resolve(undefined);
                        isResolved = true;
                    }
                }
            }));
            // finally, reveal the dialog
            quickPick.show();
        });
    }
    async _createPromptPickItems(options, token) {
        const buttons = [];
        if (options.type === PromptsType.prompt && options.optionRun !== false) {
            buttons.push(RUN_IN_CHAT_BUTTON);
        }
        if (options.optionEdit !== false) {
            buttons.push(EDIT_BUTTON);
        }
        if (options.optionCopy !== false) {
            buttons.push(COPY_BUTTON);
        }
        if (options.optionRename !== false) {
            buttons.push(RENAME_BUTTON);
        }
        if (options.optionDelete !== false) {
            buttons.push(DELETE_BUTTON);
        }
        const result = [];
        if (options.optionNew !== false) {
            result.push(...this._getNewItems(options.type));
        }
        let getVisibility = () => undefined;
        if (options.optionVisibility) {
            const disabled = this._promptsService.getDisabledPromptFiles(options.type);
            getVisibility = p => !disabled.has(p.uri);
        }
        const sortByLabel = (items) => items.sort((a, b) => a.label.localeCompare(b.label));
        const locals = await this._promptsService.listPromptFilesForStorage(options.type, PromptsStorage.local, token);
        if (locals.length) {
            result.push({ type: 'separator', label: localize(7728, null) });
            result.push(...sortByLabel(await Promise.all(locals.map(l => this._createPromptPickItem(l, buttons, getVisibility(l), token)))));
        }
        // Agent instruction files (copilot-instructions.md and AGENTS.md) are added here and not included in the output of
        // listPromptFilesForStorage() because that function only handles *.instructions.md files (under `.github/instructions/`, etc.)
        let agentInstructionFiles = [];
        if (options.type === PromptsType.instructions) {
            const agentInstructionUris = await this._promptsService.listAgentInstructions(token);
            agentInstructionFiles = agentInstructionUris.map(agentInstructionFile => {
                const folderName = this._labelService.getUriLabel(dirname(agentInstructionFile.uri), { relative: true });
                // Don't show the folder path for files under .github folder (namely, copilot-instructions.md) since that is only defined once per repo.
                return {
                    uri: agentInstructionFile.uri,
                    description: agentInstructionFile.type !== AgentFileType.copilotInstructionsMd ? folderName : undefined,
                    storage: PromptsStorage.local,
                    type: options.type
                };
            });
        }
        if (agentInstructionFiles.length) {
            const agentButtons = buttons.filter(b => b !== RENAME_BUTTON);
            result.push({ type: 'separator', label: localize(7729, null) });
            result.push(...sortByLabel(await Promise.all(agentInstructionFiles.map(l => this._createPromptPickItem(l, agentButtons, getVisibility(l), token)))));
        }
        const exts = (await this._promptsService.listPromptFilesForStorage(options.type, PromptsStorage.extension, token)).filter(isExtensionPromptPath);
        if (exts.length) {
            const extButtons = [];
            if (options.type === PromptsType.prompt && options.optionRun !== false) {
                extButtons.push(RUN_IN_CHAT_BUTTON);
            }
            if (options.optionEdit !== false) {
                extButtons.push(EDIT_BUTTON);
            }
            if (options.optionCopy !== false) {
                extButtons.push(COPY_BUTTON);
            }
            const groupedExts = new Map();
            for (const ext of exts) {
                const groupLabel = this._getExtensionGroupLabel(ext);
                if (!groupedExts.has(groupLabel)) {
                    groupedExts.set(groupLabel, []);
                }
                groupedExts.get(groupLabel).push(ext);
            }
            const sortedGroupedExts = Array.from(groupedExts.entries()).sort((a, b) => a[0].localeCompare(b[0]));
            for (const [groupLabel, groupExts] of sortedGroupedExts) {
                result.push({ type: 'separator', label: groupLabel });
                result.push(...sortByLabel(await Promise.all(groupExts.map(e => this._createPromptPickItem(e, extButtons, getVisibility(e), token)))));
            }
        }
        const users = await this._promptsService.listPromptFilesForStorage(options.type, PromptsStorage.user, token);
        if (users.length) {
            result.push({ type: 'separator', label: localize(7730, null) });
            result.push(...sortByLabel(await Promise.all(users.map(u => this._createPromptPickItem(u, buttons, getVisibility(u), token)))));
        }
        // Plugin files are read-only so only copy button is available
        const plugins = await this._promptsService.listPromptFilesForStorage(options.type, PromptsStorage.plugin, token);
        if (plugins.length) {
            const pluginButtons = [];
            if (options.optionCopy !== false) {
                pluginButtons.push(COPY_BUTTON);
            }
            result.push({ type: 'separator', label: localize(7731, null) });
            result.push(...sortByLabel(await Promise.all(plugins.map(p => this._createPromptPickItem(p, pluginButtons, getVisibility(p), token)))));
        }
        // Internal built-in files are read-only
        const internals = await this._promptsService.listPromptFilesForStorage(options.type, PromptsStorage.internal, token);
        if (internals.length) {
            const internalButtons = [];
            result.push({ type: 'separator', label: localize(7732, null) });
            result.push(...sortByLabel(await Promise.all(internals.map(p => this._createPromptPickItem(p, internalButtons, getVisibility(p), token)))));
        }
        return result;
    }
    _getExtensionGroupLabel(extPath) {
        if (isOrganizationPromptFile(extPath.uri, extPath.extension.identifier, this._productService)) {
            return localize(7733, null);
        }
        // By default, extension prompt files are grouped under "Extensions"
        return localize(7734, null);
    }
    _getNewItems(type) {
        switch (type) {
            case PromptsType.prompt:
                return [NEW_PROMPT_FILE_OPTION, GENERATE_PROMPT_OPTION];
            case PromptsType.instructions:
                return [NEW_INSTRUCTIONS_FILE_OPTION, GENERATE_ON_DEMAND_INSTRUCTIONS_OPTION, GENERATE_AGENT_INSTRUCTIONS_OPTION];
            case PromptsType.agent:
                return [NEW_AGENT_FILE_OPTION, GENERATE_AGENT_OPTION];
            case PromptsType.skill:
                return [NEW_SKILL_FILE_OPTION, GENERATE_SKILL_OPTION];
            default:
                throw new Error(`Unknown prompt type '${type}'.`);
        }
    }
    async _createPromptPickItem(promptFile, buttons, visibility, token) {
        const parsedPromptFile = await this._promptsService.parseNew(promptFile.uri, token).catch(() => undefined);
        let promptName = parsedPromptFile?.header?.name ?? promptFile.name ?? getCleanPromptName(promptFile.uri);
        const promptDescription = parsedPromptFile?.header?.description ?? promptFile.description;
        let tooltip;
        switch (promptFile.storage) {
            case PromptsStorage.extension:
                tooltip = promptFile.extension.displayName ?? promptFile.extension.id;
                break;
            case PromptsStorage.local:
                tooltip = this._labelService.getUriLabel(dirname(promptFile.uri), { relative: true });
                break;
            case PromptsStorage.user:
                tooltip = undefined;
                break;
            case PromptsStorage.plugin:
                tooltip = promptFile.name;
                break;
            case PromptsStorage.internal:
                tooltip = undefined;
                break;
            default:
                assertNever(promptFile);
        }
        let iconClass;
        if (visibility === false) {
            buttons = (buttons ?? []).concat(MAKE_VISIBLE_BUTTON);
            promptName = localize(7735, null, promptName);
            tooltip = localize(7736, null);
        }
        else if (visibility === true) {
            buttons = (buttons ?? []).concat(MAKE_INVISIBLE_BUTTON);
        }
        return {
            id: promptFile.uri.toString(),
            type: 'item',
            label: promptName,
            description: promptDescription,
            iconClass,
            tooltip,
            promptFileUri: promptFile.uri,
            buttons,
        };
    }
    async keepQuickPickOpen(quickPick, work) {
        const previousIgnoreFocusOut = quickPick.ignoreFocusOut;
        quickPick.ignoreFocusOut = true;
        try {
            return await work();
        }
        finally {
            quickPick.ignoreFocusOut = previousIgnoreFocusOut;
            quickPick.show();
        }
    }
    async _handleButtonClick(quickPick, context, options) {
        const { item, button } = context;
        if (!isPromptFileItem(item)) {
            if (isHelpButton(button)) {
                await this._openerService.open(button.helpURI);
                return false;
            }
            throw new Error(`Unknown button '${JSON.stringify(button)}'.`);
        }
        const value = item.promptFileUri;
        if (button === RUN_IN_CHAT_BUTTON) {
            const commandId = quickPick.keyMods.ctrlCmd === true
                ? 'workbench.action.chat.run-in-new-chat.prompt.current'
                : 'workbench.action.chat.run.prompt.current';
            await this._commandService.executeCommand(commandId, value);
            quickPick.hide();
            return false;
        }
        // `edit` button was pressed, open the prompt file in editor
        if (button === EDIT_BUTTON) {
            await this._openerService.open(value);
            return false;
        }
        // `copy` button was pressed, make a copy of the prompt file, open the copy in editor
        if (button === RENAME_BUTTON || button === COPY_BUTTON) {
            return await this.keepQuickPickOpen(quickPick, async () => {
                const currentFolder = dirname(value);
                const isMove = button === RENAME_BUTTON && quickPick.keyMods.ctrlCmd;
                const newFolder = await this._instaService.invokeFunction(askForPromptSourceFolder, options.type, currentFolder, isMove);
                if (!newFolder) {
                    return false;
                }
                const newName = await this._instaService.invokeFunction(askForPromptFileName, options.type, newFolder.uri, item.label);
                if (!newName) {
                    return false;
                }
                const newFile = joinPath(newFolder.uri, newName);
                if (isMove) {
                    await this._fileService.move(value, newFile);
                }
                else {
                    await this._fileService.copy(value, newFile);
                }
                await this._openerService.open(newFile);
                await this._instaService.createInstance(PromptFileRewriter).openAndRewriteName(newFile, getCleanPromptName(newFile), CancellationToken.None);
                return true;
            });
        }
        // `delete` button was pressed, delete the prompt file
        if (button === DELETE_BUTTON) {
            // don't close the main prompt selection dialog by the confirmation dialog
            return await this.keepQuickPickOpen(quickPick, async () => {
                const isSkill = options.type === PromptsType.skill;
                // For skills, use the parent folder name as the display name
                // since skills are structured as <skillname>/SKILL.md.
                const filename = isSkill ? basename(dirname(value)) : item.label;
                const message = isSkill
                    ? localize(7737, null, filename)
                    : localize(7738, null, filename);
                const { confirmed } = await this._dialogService.confirm({ message });
                // if prompt deletion was not confirmed, nothing to do
                if (!confirmed) {
                    return false;
                }
                // For skills, delete the parent folder (e.g. .github/skills/my-skill/)
                // since each skill is a folder containing SKILL.md.
                const deleteTarget = isSkill ? dirname(value) : value;
                await this._fileService.del(deleteTarget, { recursive: isSkill, useTrash: true });
                return true;
            });
        }
        if (button === MAKE_VISIBLE_BUTTON || button === MAKE_INVISIBLE_BUTTON) {
            const disabled = this._promptsService.getDisabledPromptFiles(options.type);
            if (button === MAKE_VISIBLE_BUTTON) {
                disabled.delete(value);
            }
            else {
                disabled.add(value);
            }
            this._promptsService.setDisabledPromptFiles(options.type, disabled);
            return true;
        }
        throw new Error(`Unknown button '${JSON.stringify(button)}'.`);
    }
    // --- Enablement Configuration -------------------------------------------------------
    /**
     * Shows a multi-select (checkbox) quick pick to configure which prompt files of the given
     * type are enabled. Currently only used for agent prompt files.
     */
    async managePromptFiles(type, placeholder) {
        const cts = new CancellationTokenSource();
        const quickPick = this._quickInputService.createQuickPick({ useSeparators: true });
        quickPick.placeholder = placeholder;
        quickPick.canSelectMany = true;
        quickPick.matchOnDescription = true;
        quickPick.sortByLabel = false;
        quickPick.busy = true;
        const options = {
            placeholder: '',
            type,
            optionNew: true,
            optionEdit: true,
            optionDelete: true,
            optionRename: true,
            optionCopy: true,
            optionVisibility: false,
            optionRun: false
        };
        try {
            const items = await this._createPromptPickItems(options, cts.token);
            quickPick.items = items;
        }
        finally {
            quickPick.busy = false;
        }
        return new Promise(resolve => {
            const disposables = new DisposableStore();
            disposables.add(quickPick);
            disposables.add(cts);
            let isClosed = false;
            let isResolved = false;
            const refreshItems = async () => {
                const active = quickPick.activeItems;
                const newItems = await this._createPromptPickItems(options, CancellationToken.None);
                quickPick.items = newItems;
                quickPick.activeItems = active;
            };
            disposables.add(quickPick.onDidAccept(async () => {
                const clickedItem = quickPick.activeItems;
                if (clickedItem.length === 1 && clickedItem[0].commandId) {
                    const commandId = clickedItem[0].commandId;
                    await this.keepQuickPickOpen(quickPick, async () => {
                        await this._commandService.executeCommand(commandId);
                    });
                    if (!isClosed) {
                        await refreshItems();
                    }
                    return;
                }
                isResolved = true;
                resolve(true);
                quickPick.hide();
            }));
            disposables.add(quickPick.onDidTriggerItemButton(async (e) => {
                const shouldRefresh = await this._handleButtonClick(quickPick, e, options);
                if (!isClosed && shouldRefresh) {
                    await refreshItems();
                }
            }));
            disposables.add(quickPick.onDidHide(() => {
                if (!quickPick.ignoreFocusOut) {
                    disposables.dispose();
                    isClosed = true;
                    if (!isResolved) {
                        resolve(false);
                        isResolved = true;
                    }
                }
            }));
            quickPick.show();
        });
    }
};
PromptFilePickers = __decorate([
    __param(0, IQuickInputService),
    __param(1, IOpenerService),
    __param(2, IFileService),
    __param(3, IDialogService),
    __param(4, ICommandService),
    __param(5, IInstantiationService),
    __param(6, IPromptsService),
    __param(7, ILabelService),
    __param(8, IProductService)
], PromptFilePickers);
export { PromptFilePickers };
//# sourceMappingURL=promptFilePickers.js.map