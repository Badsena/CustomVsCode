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
import { Disposable } from '../../../../../../base/common/lifecycle.js';
import { ITerminalSandboxService } from '../../common/terminalSandboxService.js';
let SandboxOutputAnalyzer = class SandboxOutputAnalyzer extends Disposable {
    constructor(_sandboxService) {
        super();
        this._sandboxService = _sandboxService;
    }
    async analyze(options) {
        if (options.exitCode === undefined || options.exitCode === 0) {
            return undefined;
        }
        if (!options.isSandboxWrapped) {
            return undefined;
        }
        const os = await this._sandboxService.getOS();
        const fileSystemSetting = os === 3 /* OperatingSystem.Linux */
            ? "chat.tools.terminal.sandbox.linuxFileSystem" /* TerminalChatAgentToolsSettingId.TerminalSandboxLinuxFileSystem */
            : "chat.tools.terminal.sandbox.macFileSystem" /* TerminalChatAgentToolsSettingId.TerminalSandboxMacFileSystem */;
        return `Command failed while running in sandboxed mode. If the command failed due to sandboxing:
- If it would be reasonable to extend the sandbox rules, work with the user to update allowWrite for file system access problems in ${fileSystemSetting}, or to add required domains to ${"chat.tools.terminal.sandbox.network" /* TerminalChatAgentToolsSettingId.TerminalSandboxNetwork */}.allowedDomains.
- You can also rerun requestUnsandboxedExecution=true and prompt the user to bypass the sandbox.

Here is the output of the command:\n`;
    }
};
SandboxOutputAnalyzer = __decorate([
    __param(0, ITerminalSandboxService)
], SandboxOutputAnalyzer);
export { SandboxOutputAnalyzer };
//# sourceMappingURL=sandboxOutputAnalyzer.js.map