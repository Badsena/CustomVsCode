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
import { Disposable } from '../../../../../../../base/common/lifecycle.js';
import { ITerminalSandboxService } from '../../../common/terminalSandboxService.js';
let CommandLineSandboxRewriter = class CommandLineSandboxRewriter extends Disposable {
    constructor(_sandboxService) {
        super();
        this._sandboxService = _sandboxService;
    }
    async rewrite(options) {
        if (options.requestUnsandboxedExecution) {
            return undefined;
        }
        if (!(await this._sandboxService.isEnabled())) {
            return undefined;
        }
        // Ensure sandbox config is initialized before wrapping
        const sandboxConfigPath = await this._sandboxService.getSandboxConfigPath();
        if (!sandboxConfigPath) {
            // If no sandbox config is available, run without sandboxing
            return undefined;
        }
        const wrappedCommand = this._sandboxService.wrapCommand(options.commandLine);
        return {
            rewritten: wrappedCommand,
            reasoning: 'Wrapped command for sandbox execution',
            forDisplay: options.commandLine, // show the command that is passed as input. In this case, the output from CommandLinePreventHistoryRewriter
            isSandboxWrapped: true,
        };
    }
};
CommandLineSandboxRewriter = __decorate([
    __param(0, ITerminalSandboxService)
], CommandLineSandboxRewriter);
export { CommandLineSandboxRewriter };
//# sourceMappingURL=commandLineSandboxRewriter.js.map