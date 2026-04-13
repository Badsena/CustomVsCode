/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { extUri, isEqual } from '../../../../../../base/common/resources.js';
import { URI } from '../../../../../../base/common/uri.js';
import { localize } from '../../../../../../nls.js';
import { ILabelService } from '../../../../../../platform/label/common/label.js';
import { IOpenerService } from '../../../../../../platform/opener/common/opener.js';
import { PROMPT_DOCUMENTATION_URL, PromptsType } from '../../../common/promptSyntax/promptTypes.js';
import { IQuickInputService } from '../../../../../../platform/quickinput/common/quickInput.js';
import { IWorkspaceContextService } from '../../../../../../platform/workspace/common/workspace.js';
import { IPromptsService, PromptsStorage } from '../../../common/promptSyntax/service/promptsService.js';
/**
 * Asks the user for a specific prompt folder, if multiple folders provided.
 */
export async function askForPromptSourceFolder(accessor, type, existingFolder, isMove = false) {
    const quickInputService = accessor.get(IQuickInputService);
    const promptsService = accessor.get(IPromptsService);
    const labelService = accessor.get(ILabelService);
    const workspaceService = accessor.get(IWorkspaceContextService);
    // get prompts source folders based on the prompt type
    const folders = await promptsService.getSourceFolders(type);
    // if no source folders found, show 'learn more' dialog
    // note! this is a temporary solution and must be replaced with a dialog to select
    //       a custom folder path, or switch to a different prompt type
    if (folders.length === 0) {
        await showNoFoldersDialog(accessor, type);
        return;
    }
    const pickOptions = {
        placeHolder: existingFolder ? getPlaceholderStringforMove(type, isMove) : getPlaceholderStringforNew(type),
        canPickMany: false,
        matchOnDescription: true,
    };
    // create list of source folder locations
    const foldersList = folders.map(folder => {
        const uri = folder.uri;
        const detail = (existingFolder && isEqual(uri, existingFolder)) ? localize(7681, null) : undefined;
        if (folder.storage !== PromptsStorage.local) {
            return {
                type: 'item',
                label: promptsService.getPromptLocationLabel(folder),
                detail,
                tooltip: labelService.getUriLabel(uri),
                folder
            };
        }
        const { folders } = workspaceService.getWorkspace();
        const isMultirootWorkspace = (folders.length > 1);
        const firstFolder = folders[0];
        // if multi-root or empty workspace, or source folder `uri` does not point to
        // the root folder of a single-root workspace, return the default label and description
        if (isMultirootWorkspace || !firstFolder || !extUri.isEqual(firstFolder.uri, uri)) {
            return {
                type: 'item',
                label: labelService.getUriLabel(uri, { relative: true }),
                detail,
                tooltip: labelService.getUriLabel(uri),
                folder,
            };
        }
        // if source folder points to the root of this single-root workspace,
        // use appropriate label and description strings to prevent confusion
        return {
            type: 'item',
            label: localize(7682, null),
            detail,
            tooltip: labelService.getUriLabel(uri),
            folder,
        };
    });
    const answer = await quickInputService.pick(foldersList, pickOptions);
    if (!answer) {
        return;
    }
    return answer.folder;
}
function getPlaceholderStringforNew(type) {
    switch (type) {
        case PromptsType.instructions:
            return localize(7683, null);
        case PromptsType.prompt:
            return localize(7684, null);
        case PromptsType.agent:
            return localize(7685, null);
        case PromptsType.skill:
            return localize(7686, null);
        case PromptsType.hook:
            return localize(7687, null);
        default:
            throw new Error('Unknown prompt type');
    }
}
function getPlaceholderStringforMove(type, isMove) {
    if (isMove) {
        switch (type) {
            case PromptsType.instructions:
                return localize(7688, null);
            case PromptsType.prompt:
                return localize(7689, null);
            case PromptsType.agent:
                return localize(7690, null);
            case PromptsType.skill:
                return localize(7691, null);
            case PromptsType.hook:
                throw new Error('Hooks cannot be moved');
            default:
                throw new Error('Unknown prompt type');
        }
    }
    switch (type) {
        case PromptsType.instructions:
            return localize(7692, null);
        case PromptsType.prompt:
            return localize(7693, null);
        case PromptsType.agent:
            return localize(7694, null);
        case PromptsType.skill:
            return localize(7695, null);
        case PromptsType.hook:
            throw new Error('Hooks cannot be copied');
        default:
            throw new Error('Unknown prompt type');
    }
}
/**
 * Shows a dialog to the user when no prompt source folders are found.
 *
 * Note! this is a temporary solution and must be replaced with a dialog to select
 *       a custom folder path, or switch to a different prompt type
 */
async function showNoFoldersDialog(accessor, type) {
    const quickInputService = accessor.get(IQuickInputService);
    const openerService = accessor.get(IOpenerService);
    const docsQuickPick = {
        type: 'item',
        label: getLearnLabel(type),
        description: PROMPT_DOCUMENTATION_URL,
        tooltip: PROMPT_DOCUMENTATION_URL,
        value: URI.parse(PROMPT_DOCUMENTATION_URL),
    };
    const result = await quickInputService.pick([docsQuickPick], {
        placeHolder: getMissingSourceFolderString(type),
        canPickMany: false,
    });
    if (result) {
        await openerService.open(result.value);
    }
}
function getLearnLabel(type) {
    switch (type) {
        case PromptsType.prompt:
            return localize(7696, null);
        case PromptsType.instructions:
            return localize(7697, null);
        case PromptsType.agent:
            return localize(7698, null);
        case PromptsType.skill:
            return localize(7699, null);
        case PromptsType.hook:
            return localize(7700, null);
        default:
            throw new Error('Unknown prompt type');
    }
}
function getMissingSourceFolderString(type) {
    switch (type) {
        case PromptsType.instructions:
            return localize(7701, null);
        case PromptsType.prompt:
            return localize(7702, null);
        case PromptsType.agent:
            return localize(7703, null);
        case PromptsType.skill:
            return localize(7704, null);
        case PromptsType.hook:
            return localize(7705, null);
        default:
            throw new Error('Unknown prompt type');
    }
}
//# sourceMappingURL=askForPromptSourceFolder.js.map