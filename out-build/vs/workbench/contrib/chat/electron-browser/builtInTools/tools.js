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
import { Disposable } from '../../../../../base/common/lifecycle.js';
import { dirname, extUriBiasedIgnorePathCase } from '../../../../../base/common/resources.js';
import { URI } from '../../../../../base/common/uri.js';
import { IFileDialogService } from '../../../../../platform/dialogs/common/dialogs.js';
import { IFileService } from '../../../../../platform/files/common/files.js';
import { IInstantiationService } from '../../../../../platform/instantiation/common/instantiation.js';
import { ILabelService } from '../../../../../platform/label/common/label.js';
import { IStorageService } from '../../../../../platform/storage/common/storage.js';
import { ChatExternalPathConfirmationContribution } from '../../common/tools/builtinTools/chatExternalPathConfirmation.js';
import { ChatUrlFetchingConfirmationContribution } from '../../common/tools/builtinTools/chatUrlFetchingConfirmation.js';
import { ILanguageModelToolsConfirmationService } from '../../common/tools/languageModelToolsConfirmationService.js';
import { ILanguageModelToolsService } from '../../common/tools/languageModelToolsService.js';
import { InternalFetchWebPageToolId } from '../../common/tools/builtinTools/tools.js';
import { FetchWebPageTool, FetchWebPageToolData } from './fetchPageTool.js';
let NativeBuiltinToolsContribution = class NativeBuiltinToolsContribution extends Disposable {
    static { this.ID = 'chat.nativeBuiltinTools'; }
    constructor(toolsService, instantiationService, confirmationService, fileService, storageService, fileDialogService, labelService) {
        super();
        const editTool = instantiationService.createInstance(FetchWebPageTool);
        this._register(toolsService.registerTool(FetchWebPageToolData, editTool));
        this._register(confirmationService.registerConfirmationContribution(InternalFetchWebPageToolId, instantiationService.createInstance(ChatUrlFetchingConfirmationContribution, params => params.urls)));
        // Register external path confirmation contribution for read_file and list_dir
        // They share the same allowlist so approving a folder for reading files also allows listing that directory
        const externalPathConfirmation = new ChatExternalPathConfirmationContribution((ref) => {
            const params = ref.parameters;
            // read_file uses filePath (it's a file), list_dir uses path (it's a directory)
            if (params?.filePath) {
                return { path: params.filePath, isDirectory: false };
            }
            if (params?.path) {
                return { path: params.path, isDirectory: true };
            }
            return undefined;
        }, labelService, async (pathUri) => {
            // Walk up from the path looking for a .git folder to find the repository root
            let dir = dirname(pathUri);
            for (let i = 0; i < 100; i++) {
                try {
                    if (await fileService.exists(URI.joinPath(dir, '.git'))) {
                        return dir;
                    }
                }
                catch {
                    // ignore permission errors etc.
                }
                const parent = dirname(dir);
                if (extUriBiasedIgnorePathCase.isEqual(parent, dir)) {
                    return undefined;
                }
                dir = parent;
            }
            return undefined;
        }, storageService, async () => {
            const result = await fileDialogService.showOpenDialog({
                canSelectFolders: true,
                canSelectFiles: false,
                canSelectMany: false,
            });
            return result?.[0];
        });
        this._register(externalPathConfirmation);
        this._register(confirmationService.registerConfirmationContribution('copilot_readFile', externalPathConfirmation));
        this._register(confirmationService.registerConfirmationContribution('copilot_listDirectory', externalPathConfirmation));
    }
};
NativeBuiltinToolsContribution = __decorate([
    __param(0, ILanguageModelToolsService),
    __param(1, IInstantiationService),
    __param(2, ILanguageModelToolsConfirmationService),
    __param(3, IFileService),
    __param(4, IStorageService),
    __param(5, IFileDialogService),
    __param(6, ILabelService)
], NativeBuiltinToolsContribution);
export { NativeBuiltinToolsContribution };
//# sourceMappingURL=tools.js.map