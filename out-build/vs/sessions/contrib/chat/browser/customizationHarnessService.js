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
import { CustomizationHarness, CustomizationHarnessServiceBase, createCliHarnessDescriptor, getCliUserRoots, } from '../../../../workbench/contrib/chat/common/customizationHarnessService.js';
import { IPathService } from '../../../../workbench/services/path/common/pathService.js';
import { BUILTIN_STORAGE } from '../common/builtinPromptsStorage.js';
/**
 * Sessions-window override of the customization harness service.
 *
 * Only the CLI harness is registered because sessions always run via
 * the Copilot CLI. With a single harness the toggle bar is hidden.
 */
let SessionsCustomizationHarnessService = class SessionsCustomizationHarnessService extends CustomizationHarnessServiceBase {
    constructor(pathService) {
        const userHome = pathService.userHome({ preferLocal: true });
        const extras = [BUILTIN_STORAGE];
        super([createCliHarnessDescriptor(getCliUserRoots(userHome), extras)], CustomizationHarness.CLI);
    }
};
SessionsCustomizationHarnessService = __decorate([
    __param(0, IPathService)
], SessionsCustomizationHarnessService);
export { SessionsCustomizationHarnessService };
//# sourceMappingURL=customizationHarnessService.js.map