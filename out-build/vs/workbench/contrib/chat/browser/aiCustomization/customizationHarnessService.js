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
import { derived, observableFromEvent } from '../../../../../base/common/observable.js';
import { registerSingleton } from '../../../../../platform/instantiation/common/extensions.js';
import { CustomizationHarness, CustomizationHarnessServiceBase, ICustomizationHarnessService, createCliHarnessDescriptor, createClaudeHarnessDescriptor, createVSCodeHarnessDescriptor, getCliUserRoots, getClaudeUserRoots, } from '../../common/customizationHarnessService.js';
import { PromptsStorage } from '../../common/promptSyntax/service/promptsService.js';
import { IPathService } from '../../../../services/path/common/pathService.js';
import { IChatAgentService } from '../../common/participants/chatAgents.js';
/**
 * Core implementation of the customization harness service.
 * Exposes VS Code, CLI, and Claude harnesses for filtering customizations.
 * CLI and Claude harnesses are only shown when their respective agents are registered.
 */
let CustomizationHarnessService = class CustomizationHarnessService extends CustomizationHarnessServiceBase {
    constructor(pathService, chatAgentService) {
        const userHome = pathService.userHome({ preferLocal: true });
        // Only the Local harness includes extension-contributed customizations.
        // CLI and Claude harnesses don't consume extension contributions.
        const localExtras = [PromptsStorage.extension];
        const restrictedExtras = [];
        const allHarnesses = [
            createVSCodeHarnessDescriptor(localExtras),
            createCliHarnessDescriptor(getCliUserRoots(userHome), restrictedExtras),
            createClaudeHarnessDescriptor(getClaudeUserRoots(userHome), restrictedExtras),
        ];
        // Track agent registration changes as an observable.
        // Return the agent count so the value changes on each event
        // (observableFromEvent uses strictEquals to decide whether to notify).
        const agentCount = observableFromEvent(chatAgentService.onDidChangeAgents, () => chatAgentService.getAgents().length);
        // Derive available harnesses from agent registration state
        const available = derived(reader => {
            agentCount.read(reader);
            return allHarnesses.filter(h => {
                if (!h.requiredAgentId) {
                    return true;
                }
                return !!chatAgentService.getAgent(h.requiredAgentId);
            });
        });
        super(allHarnesses, CustomizationHarness.VSCode, available);
    }
};
CustomizationHarnessService = __decorate([
    __param(0, IPathService),
    __param(1, IChatAgentService)
], CustomizationHarnessService);
registerSingleton(ICustomizationHarnessService, CustomizationHarnessService, 1 /* InstantiationType.Delayed */);
//# sourceMappingURL=customizationHarnessService.js.map