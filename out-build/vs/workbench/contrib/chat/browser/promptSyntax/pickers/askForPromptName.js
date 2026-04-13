/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { localize } from '../../../../../../nls.js';
import { getPromptFileExtension } from '../../../common/promptSyntax/config/promptFileLocations.js';
import { PromptsType } from '../../../common/promptSyntax/promptTypes.js';
import { IQuickInputService } from '../../../../../../platform/quickinput/common/quickInput.js';
import { URI } from '../../../../../../base/common/uri.js';
import { IFileService } from '../../../../../../platform/files/common/files.js';
import Severity from '../../../../../../base/common/severity.js';
import { isValidBasename } from '../../../../../../base/common/extpath.js';
/**
 * Asks the user for a file name.
 */
export async function askForPromptFileName(accessor, type, selectedFolder, existingFileName, fileExtensionOverride) {
    const quickInputService = accessor.get(IQuickInputService);
    const fileService = accessor.get(IFileService);
    const sanitizeInput = (input) => {
        const trimmedName = input.trim();
        if (!trimmedName) {
            return undefined;
        }
        const fileExtension = fileExtensionOverride ?? getPromptFileExtension(type);
        return (trimmedName.endsWith(fileExtension))
            ? trimmedName
            : `${trimmedName}${fileExtension}`;
    };
    const validateInput = async (value) => {
        const fileName = sanitizeInput(value);
        if (!fileName) {
            return {
                content: localize(7672, null),
                severity: Severity.Warning
            };
        }
        if (!isValidBasename(fileName)) {
            return {
                content: localize(7673, null),
                severity: Severity.Error
            };
        }
        const fileUri = URI.joinPath(selectedFolder, fileName);
        if (await fileService.exists(fileUri)) {
            return {
                content: localize(7674, null),
                severity: Severity.Error
            };
        }
        return undefined;
    };
    const placeHolder = existingFileName ? getPlaceholderStringForRename(type) : getPlaceholderStringForNew(type);
    const result = await quickInputService.input({ placeHolder, validateInput, value: existingFileName });
    if (!result) {
        return undefined;
    }
    return sanitizeInput(result);
}
function getPlaceholderStringForNew(type) {
    switch (type) {
        case PromptsType.instructions:
            return localize(7675, null);
        case PromptsType.prompt:
            return localize(7676, null);
        case PromptsType.agent:
            return localize(7677, null);
        default:
            throw new Error('Unknown prompt type');
    }
}
function getPlaceholderStringForRename(type) {
    switch (type) {
        case PromptsType.instructions:
            return localize(7678, null);
        case PromptsType.prompt:
            return localize(7679, null);
        case PromptsType.agent:
            return localize(7680, null);
        default:
            throw new Error('Unknown prompt type');
    }
}
//# sourceMappingURL=askForPromptName.js.map