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
import { generateUuid } from '../../../../../base/common/uuid.js';
import { isITextModel } from '../../../../../editor/common/model.js';
import { ILanguageFeaturesService } from '../../../../../editor/common/services/languageFeatures.js';
import { localize } from '../../../../../nls.js';
import { CommandsRegistry } from '../../../../../platform/commands/common/commands.js';
import { IInstantiationService } from '../../../../../platform/instantiation/common/instantiation.js';
import { showToolsPicker } from '../actions/chatToolPicker.js';
import { ILanguageModelToolsService } from '../../common/tools/languageModelToolsService.js';
import { ALL_PROMPTS_LANGUAGE_SELECTOR, getPromptsTypeForLanguageId, PromptsType } from '../../common/promptSyntax/promptTypes.js';
import { IPromptsService } from '../../common/promptSyntax/service/promptsService.js';
import { registerEditorFeature } from '../../../../../editor/common/editorFeatures.js';
import { PromptFileRewriter } from './promptFileRewriter.js';
import { Range } from '../../../../../editor/common/core/range.js';
import { parseCommaSeparatedList, PromptHeaderAttributes } from '../../common/promptSyntax/promptFileParser.js';
import { isBoolean } from '../../../../../base/common/types.js';
import { getTarget, isTarget, isVSCodeOrDefaultTarget } from '../../common/promptSyntax/languageProviders/promptFileAttributes.js';
let PromptToolsCodeLensProvider = class PromptToolsCodeLensProvider extends Disposable {
    constructor(promptsService, languageService, languageModelToolsService, instantiationService) {
        super();
        this.promptsService = promptsService;
        this.languageService = languageService;
        this.languageModelToolsService = languageModelToolsService;
        this.instantiationService = instantiationService;
        // `_`-prefix marks this as private command
        this.cmdId = `_configure/${generateUuid()}`;
        this._register(this.languageService.codeLensProvider.register(ALL_PROMPTS_LANGUAGE_SELECTOR, this));
        this._register(CommandsRegistry.registerCommand(this.cmdId, (_accessor, ...args) => {
            const [modelArg, rangeArg, isStringArg, toolsArg, targetArg] = args;
            const model = modelArg;
            if (isITextModel(model) && Range.isIRange(rangeArg) && isBoolean(isStringArg) && Array.isArray(toolsArg) && isTarget(targetArg)) {
                this.updateTools(model, Range.lift(rangeArg), isStringArg, toolsArg, targetArg);
            }
        }));
    }
    async provideCodeLenses(model, token) {
        const promptType = getPromptsTypeForLanguageId(model.getLanguageId());
        if (!promptType || promptType === PromptsType.instructions) {
            // if the model is not a prompt, we don't provide any code actions
            return undefined;
        }
        const promptAST = this.promptsService.getParsedPromptFile(model);
        const header = promptAST.header;
        if (!header) {
            return undefined;
        }
        const target = getTarget(promptType, header);
        if (!isVSCodeOrDefaultTarget(target)) {
            return undefined;
        }
        const toolsAttr = header.getAttribute(PromptHeaderAttributes.tools);
        if (!toolsAttr) {
            return undefined;
        }
        let value = toolsAttr.value;
        if (value.type === 'scalar') {
            value = parseCommaSeparatedList(value);
        }
        if (value.type !== 'sequence') {
            return undefined;
        }
        const items = value.items;
        const selectedTools = items.filter(item => item.type === 'scalar').map(item => item.value);
        const codeLens = {
            range: toolsAttr.range.collapseToStart(),
            command: {
                title: localize(7741, null),
                id: this.cmdId,
                arguments: [model, toolsAttr.value.range, toolsAttr.value.type === 'scalar', selectedTools, target]
            }
        };
        return { lenses: [codeLens] };
    }
    async updateTools(model, range, isString, selectedTools, target) {
        const selectedToolsNow = () => this.languageModelToolsService.toToolAndToolSetEnablementMap(selectedTools, undefined);
        const newSelectedAfter = await this.instantiationService.invokeFunction(showToolsPicker, localize(7742, null), 'codeLens', undefined, selectedToolsNow);
        if (!newSelectedAfter) {
            return;
        }
        this.instantiationService.createInstance(PromptFileRewriter).rewriteTools(model, newSelectedAfter, range, isString);
    }
};
PromptToolsCodeLensProvider = __decorate([
    __param(0, IPromptsService),
    __param(1, ILanguageFeaturesService),
    __param(2, ILanguageModelToolsService),
    __param(3, IInstantiationService)
], PromptToolsCodeLensProvider);
registerEditorFeature(PromptToolsCodeLensProvider);
//# sourceMappingURL=promptToolsCodeLensProvider.js.map