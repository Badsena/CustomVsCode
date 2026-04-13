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
import { ILogService } from '../../../../platform/log/common/log.js';
import { registerWorkbenchContribution2 } from '../../../common/contributions.js';
import { ChatConfiguration } from '../common/constants.js';
import { ILanguageModelsService } from '../common/languageModels.js';
import { createDefaultModelArrays, DefaultModelContribution } from './defaultModelContribution.js';
const arrays = createDefaultModelArrays();
let PlanAgentDefaultModel = class PlanAgentDefaultModel extends DefaultModelContribution {
    static { this.ID = 'workbench.contrib.planAgentDefaultModel'; }
    static { this.modelIds = arrays.modelIds; }
    static { this.modelLabels = arrays.modelLabels; }
    static { this.modelDescriptions = arrays.modelDescriptions; }
    constructor(languageModelsService, logService) {
        super(arrays, {
            configKey: ChatConfiguration.PlanAgentDefaultModel,
            configSectionId: 'chatSidebar',
            logPrefix: '[PlanAgentDefaultModel]',
            filter: metadata => !!metadata.capabilities?.toolCalling,
        }, languageModelsService, logService);
    }
};
PlanAgentDefaultModel = __decorate([
    __param(0, ILanguageModelsService),
    __param(1, ILogService)
], PlanAgentDefaultModel);
export { PlanAgentDefaultModel };
registerWorkbenchContribution2(PlanAgentDefaultModel.ID, PlanAgentDefaultModel, 2 /* WorkbenchPhase.BlockRestore */);
//# sourceMappingURL=planAgentDefaultModel.js.map