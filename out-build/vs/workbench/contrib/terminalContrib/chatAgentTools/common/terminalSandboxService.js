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
import { VSBuffer } from '../../../../../base/common/buffer.js';
import { Event } from '../../../../../base/common/event.js';
import { Disposable } from '../../../../../base/common/lifecycle.js';
import { FileAccess } from '../../../../../base/common/network.js';
import { dirname, posix, win32 } from '../../../../../base/common/path.js';
import { OS } from '../../../../../base/common/platform.js';
import { URI } from '../../../../../base/common/uri.js';
import { generateUuid } from '../../../../../base/common/uuid.js';
import { IConfigurationService } from '../../../../../platform/configuration/common/configuration.js';
import { IEnvironmentService } from '../../../../../platform/environment/common/environment.js';
import { IFileService } from '../../../../../platform/files/common/files.js';
import { createDecorator } from '../../../../../platform/instantiation/common/instantiation.js';
import { ILogService } from '../../../../../platform/log/common/log.js';
import { IRemoteAgentService } from '../../../../services/remote/common/remoteAgentService.js';
import { ITrustedDomainService } from '../../../url/common/trustedDomainService.js';
import { IWorkspaceContextService } from '../../../../../platform/workspace/common/workspace.js';
export const ITerminalSandboxService = createDecorator('terminalSandboxService');
let TerminalSandboxService = class TerminalSandboxService extends Disposable {
    constructor(_configurationService, _fileService, _environmentService, _logService, _remoteAgentService, _trustedDomainService, _workspaceContextService) {
        super();
        this._configurationService = _configurationService;
        this._fileService = _fileService;
        this._environmentService = _environmentService;
        this._logService = _logService;
        this._remoteAgentService = _remoteAgentService;
        this._trustedDomainService = _trustedDomainService;
        this._workspaceContextService = _workspaceContextService;
        this._srtPathResolved = false;
        this._needsForceUpdateConfigFile = true;
        this._remoteEnvDetails = null;
        this._os = OS;
        this._defaultWritePaths = ['~/.npm'];
        // Joins path segments according to the current OS.
        this._pathJoin = (...segments) => {
            const path = this._os === 1 /* OperatingSystem.Windows */ ? win32 : posix;
            return path.join(...segments);
        };
        this._appRoot = dirname(FileAccess.asFileUri('').path);
        // Get the node executable path from native environment service if available (Electron's execPath with ELECTRON_RUN_AS_NODE)
        const nativeEnv = this._environmentService;
        this._execPath = nativeEnv.execPath;
        this._sandboxSettingsId = generateUuid();
        this._remoteEnvDetailsPromise = this._remoteAgentService.getEnvironment();
        this._register(Event.runAndSubscribe(this._configurationService.onDidChangeConfiguration, (e) => {
            // If terminal sandbox settings changed, update sandbox config.
            if (e?.affectsConfiguration("chat.tools.terminal.sandbox.enabled" /* TerminalChatAgentToolsSettingId.TerminalSandboxEnabled */) ||
                e?.affectsConfiguration("chat.tools.terminal.sandbox.network" /* TerminalChatAgentToolsSettingId.TerminalSandboxNetwork */) ||
                e?.affectsConfiguration("chat.tools.terminal.sandbox.linuxFileSystem" /* TerminalChatAgentToolsSettingId.TerminalSandboxLinuxFileSystem */) ||
                e?.affectsConfiguration("chat.tools.terminal.sandbox.macFileSystem" /* TerminalChatAgentToolsSettingId.TerminalSandboxMacFileSystem */)) {
                this.setNeedsForceUpdateConfigFile();
            }
        }));
        this._register(this._trustedDomainService.onDidChangeTrustedDomains(() => {
            this.setNeedsForceUpdateConfigFile();
        }));
        this._register(this._workspaceContextService.onDidChangeWorkspaceFolders(() => {
            this.setNeedsForceUpdateConfigFile();
        }));
    }
    async isEnabled() {
        const os = await this.getOS();
        if (os === 1 /* OperatingSystem.Windows */) {
            return false;
        }
        return this._configurationService.getValue("chat.tools.terminal.sandbox.enabled" /* TerminalChatAgentToolsSettingId.TerminalSandboxEnabled */);
    }
    async getOS() {
        this._remoteEnvDetails = await this._remoteEnvDetailsPromise;
        this._os = this._remoteEnvDetails ? this._remoteEnvDetails.os : OS;
        return this._os;
    }
    wrapCommand(command) {
        if (!this._sandboxConfigPath || !this._tempDir) {
            throw new Error('Sandbox config path or temp dir not initialized');
        }
        if (!this._execPath) {
            throw new Error('Executable path not set to run sandbox commands');
        }
        if (!this._srtPath) {
            throw new Error('Sandbox runtime path not resolved');
        }
        if (!this._rgPath) {
            throw new Error('Ripgrep path not resolved');
        }
        // Use ELECTRON_RUN_AS_NODE=1 to make Electron executable behave as Node.js
        // TMPDIR must be set as environment variable before the command
        // Quote shell arguments so the wrapped command cannot break out of the outer shell.
        const wrappedCommand = `PATH="$PATH:${dirname(this._rgPath)}" TMPDIR="${this._tempDir.path}" "${this._execPath}" "${this._srtPath}" --settings "${this._sandboxConfigPath}" -c ${this._quoteShellArgument(command)}`;
        if (this._remoteEnvDetails) {
            return `${wrappedCommand}`;
        }
        return `ELECTRON_RUN_AS_NODE=1 ${wrappedCommand}`;
    }
    getTempDir() {
        return this._tempDir;
    }
    setNeedsForceUpdateConfigFile() {
        this._needsForceUpdateConfigFile = true;
    }
    async getSandboxConfigPath(forceRefresh = false) {
        await this._resolveSrtPath();
        if (!this._sandboxConfigPath || forceRefresh || this._needsForceUpdateConfigFile) {
            this._sandboxConfigPath = await this._createSandboxConfig();
            this._needsForceUpdateConfigFile = false;
        }
        return this._sandboxConfigPath;
    }
    _quoteShellArgument(value) {
        return `'${value.replace(/'/g, `'\\''`)}'`;
    }
    async _resolveSrtPath() {
        if (this._srtPathResolved) {
            return;
        }
        this._srtPathResolved = true;
        const remoteEnv = this._remoteEnvDetails || await this._remoteEnvDetailsPromise;
        if (remoteEnv) {
            this._appRoot = remoteEnv.appRoot.path;
            this._execPath = this._pathJoin(this._appRoot, 'node');
        }
        this._srtPath = this._pathJoin(this._appRoot, 'node_modules', '@anthropic-ai', 'sandbox-runtime', 'dist', 'cli.js');
        this._rgPath = this._pathJoin(this._appRoot, 'node_modules', '@vscode', 'ripgrep', 'bin', 'rg');
    }
    async _createSandboxConfig() {
        if (await this.isEnabled() && !this._tempDir) {
            await this._initTempDir();
        }
        if (this._tempDir) {
            const networkSetting = this._configurationService.getValue("chat.tools.terminal.sandbox.network" /* TerminalChatAgentToolsSettingId.TerminalSandboxNetwork */) ?? {};
            const linuxFileSystemSetting = this._os === 3 /* OperatingSystem.Linux */
                ? this._configurationService.getValue("chat.tools.terminal.sandbox.linuxFileSystem" /* TerminalChatAgentToolsSettingId.TerminalSandboxLinuxFileSystem */) ?? {}
                : {};
            const macFileSystemSetting = this._os === 2 /* OperatingSystem.Macintosh */
                ? this._configurationService.getValue("chat.tools.terminal.sandbox.macFileSystem" /* TerminalChatAgentToolsSettingId.TerminalSandboxMacFileSystem */) ?? {}
                : {};
            const configFileUri = URI.joinPath(this._tempDir, `vscode-sandbox-settings-${this._sandboxSettingsId}.json`);
            const linuxAllowWrite = this._updateAllowWritePathsWithWorkspaceFolders(linuxFileSystemSetting.allowWrite);
            const macAllowWrite = this._updateAllowWritePathsWithWorkspaceFolders(macFileSystemSetting.allowWrite);
            let allowedDomains = networkSetting.allowedDomains ?? [];
            if (networkSetting.allowTrustedDomains) {
                allowedDomains = this._addTrustedDomainsToAllowedDomains(allowedDomains);
            }
            const sandboxSettings = {
                network: {
                    allowedDomains,
                    deniedDomains: networkSetting.deniedDomains ?? []
                },
                filesystem: {
                    denyRead: this._os === 2 /* OperatingSystem.Macintosh */ ? macFileSystemSetting.denyRead : linuxFileSystemSetting.denyRead,
                    allowWrite: this._os === 2 /* OperatingSystem.Macintosh */ ? macAllowWrite : linuxAllowWrite,
                    denyWrite: this._os === 2 /* OperatingSystem.Macintosh */ ? macFileSystemSetting.denyWrite : linuxFileSystemSetting.denyWrite,
                }
            };
            this._sandboxConfigPath = configFileUri.path;
            await this._fileService.createFile(configFileUri, VSBuffer.fromString(JSON.stringify(sandboxSettings, null, '\t')), { overwrite: true });
            return this._sandboxConfigPath;
        }
        return undefined;
    }
    async _initTempDir() {
        if (await this.isEnabled()) {
            this._needsForceUpdateConfigFile = true;
            const remoteEnv = this._remoteEnvDetails || await this._remoteEnvDetailsPromise;
            if (remoteEnv) {
                this._tempDir = remoteEnv.tmpDir;
            }
            else {
                const environmentService = this._environmentService;
                this._tempDir = environmentService.tmpDir;
            }
            if (this._tempDir) {
                this._defaultWritePaths.push(this._tempDir.path);
            }
            if (!this._tempDir) {
                this._logService.warn('TerminalSandboxService: Cannot create sandbox settings file because no tmpDir is available in this environment');
            }
        }
    }
    _addTrustedDomainsToAllowedDomains(allowedDomains) {
        const allowedDomainsSet = new Set(allowedDomains);
        for (const domain of this._trustedDomainService.trustedDomains) {
            try {
                const uri = new URL(domain);
                allowedDomainsSet.add(uri.hostname);
            }
            catch {
                if (domain !== '*') {
                    allowedDomainsSet.add(domain);
                }
            }
        }
        return Array.from(allowedDomainsSet);
    }
    _updateAllowWritePathsWithWorkspaceFolders(configuredAllowWrite) {
        const workspaceFolderPaths = this._workspaceContextService.getWorkspace().folders.map(folder => folder.uri.path);
        return [...new Set([...workspaceFolderPaths, ...this._defaultWritePaths, ...(configuredAllowWrite ?? [])])];
    }
};
TerminalSandboxService = __decorate([
    __param(0, IConfigurationService),
    __param(1, IFileService),
    __param(2, IEnvironmentService),
    __param(3, ILogService),
    __param(4, IRemoteAgentService),
    __param(5, ITrustedDomainService),
    __param(6, IWorkspaceContextService)
], TerminalSandboxService);
export { TerminalSandboxService };
//# sourceMappingURL=terminalSandboxService.js.map