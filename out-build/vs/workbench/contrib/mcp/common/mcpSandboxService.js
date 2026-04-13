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
import { VSBuffer } from '../../../../base/common/buffer.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { FileAccess } from '../../../../base/common/network.js';
import { dirname, posix, win32 } from '../../../../base/common/path.js';
import { OS } from '../../../../base/common/platform.js';
import { URI } from '../../../../base/common/uri.js';
import { generateUuid } from '../../../../base/common/uuid.js';
import { localize } from '../../../../nls.js';
import { ConfigurationTargetToString } from '../../../../platform/configuration/common/configuration.js';
import { IEnvironmentService } from '../../../../platform/environment/common/environment.js';
import { IFileService } from '../../../../platform/files/common/files.js';
import { createDecorator } from '../../../../platform/instantiation/common/instantiation.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { IMcpResourceScannerService } from '../../../../platform/mcp/common/mcpResourceScannerService.js';
import { IRemoteAgentService } from '../../../services/remote/common/remoteAgentService.js';
export const IMcpSandboxService = createDecorator('mcpSandboxService');
let McpSandboxService = class McpSandboxService extends Disposable {
    constructor(_fileService, _environmentService, _logService, _mcpResourceScannerService, _remoteAgentService) {
        super();
        this._fileService = _fileService;
        this._environmentService = _environmentService;
        this._logService = _logService;
        this._mcpResourceScannerService = _mcpResourceScannerService;
        this._remoteAgentService = _remoteAgentService;
        this._defaultAllowedDomains = ['registry.npmjs.org']; // Default allowed domains that are commonly needed for MCP servers, even if the user doesn't specify them in their sandbox config
        this._defaultAllowWritePaths = ['~/.npm'];
        this._sandboxConfigPerConfigurationTarget = new Map();
        this._pathJoin = (os, ...segments) => {
            const path = os === 1 /* OperatingSystem.Windows */ ? win32 : posix;
            return path.join(...segments);
        };
        this._getPathDelimiter = async (remoteAuthority) => {
            const os = await this._getOperatingSystem(remoteAuthority);
            return os === 1 /* OperatingSystem.Windows */ ? win32.delimiter : posix.delimiter;
        };
        this._sandboxSettingsId = generateUuid();
        this._remoteEnvDetailsPromise = this._remoteAgentService.getEnvironment();
    }
    async isEnabled(serverDef, remoteAuthority) {
        const os = await this._getOperatingSystem(remoteAuthority);
        if (os === 1 /* OperatingSystem.Windows */) {
            return false;
        }
        return !!serverDef.sandboxEnabled;
    }
    async launchInSandboxIfEnabled(serverDef, launch, remoteAuthority, configTarget) {
        if (launch.type !== 1 /* McpServerTransportType.Stdio */) {
            return launch;
        }
        if (await this.isEnabled(serverDef, remoteAuthority)) {
            this._logService.trace(`McpSandboxService: Launching with config target ${configTarget}`);
            const launchDetails = await this._resolveSandboxLaunchDetails(configTarget, remoteAuthority, launch.sandbox, launch.cwd);
            const quotedCommand = this._quoteShellArgument(launch.command);
            const quotedArgs = launch.args.map(arg => this._quoteShellArgument(arg));
            const sandboxArgs = this._getSandboxCommandArgs(quotedCommand, quotedArgs, launchDetails.sandboxConfigPath);
            const sandboxEnv = await this._getSandboxEnvVariables(launch.env, launchDetails.tempDir, launchDetails.rgPath, remoteAuthority);
            if (launchDetails.srtPath) {
                if (launchDetails.execPath) {
                    return {
                        ...launch,
                        command: launchDetails.execPath,
                        args: [launchDetails.srtPath, ...sandboxArgs],
                        env: sandboxEnv,
                        type: 1 /* McpServerTransportType.Stdio */,
                    };
                }
                else {
                    return {
                        ...launch,
                        command: launchDetails.srtPath,
                        args: sandboxArgs,
                        env: sandboxEnv,
                        type: 1 /* McpServerTransportType.Stdio */,
                    };
                }
            }
            if (!launchDetails.execPath) {
                this._logService.warn('McpSandboxService: execPath is unavailable, launching without sandbox runtime wrapper');
            }
            this._logService.debug(`McpSandboxService: launch details for server ${serverDef.label} - command: ${launch.command}, args: ${launch.args.join(' ')}`);
        }
        return launch;
    }
    getSandboxConfigSuggestionMessage(serverLabel, potentialBlocks, existingSandboxConfig) {
        const suggestions = this._getSandboxConfigSuggestions(potentialBlocks, existingSandboxConfig);
        if (!suggestions) {
            return undefined;
        }
        const allowWriteList = suggestions.allowWrite;
        const allowedDomainsList = suggestions.allowedDomains;
        const suggestionLines = [];
        if (allowedDomainsList.length) {
            const shown = allowedDomainsList.map(domain => `"${domain}"`).join(', ');
            suggestionLines.push(localize(12540, null, shown));
        }
        if (allowWriteList.length) {
            const shown = allowWriteList.map(path => `"${path}"`).join(', ');
            suggestionLines.push(localize(12541, null, shown));
        }
        const sandboxConfig = {};
        if (allowedDomainsList.length) {
            sandboxConfig.network = { allowedDomains: [...allowedDomainsList] };
        }
        if (allowWriteList.length) {
            sandboxConfig.filesystem = { allowWrite: [...allowWriteList] };
        }
        return {
            message: localize(12542, null, serverLabel, suggestionLines.join('\n')),
            sandboxConfig,
        };
    }
    async applySandboxConfigSuggestion(serverDef, mcpResource, configTarget, potentialBlocks, suggestedSandboxConfig) {
        const scanTarget = this._toMcpResourceTarget(configTarget);
        let didChange = false;
        await this._mcpResourceScannerService.updateSandboxConfig(data => {
            const existingSandbox = data.sandbox;
            const suggestedAllowedDomains = suggestedSandboxConfig?.network?.allowedDomains ?? [];
            const suggestedAllowWrite = suggestedSandboxConfig?.filesystem?.allowWrite ?? [];
            const currentAllowedDomains = new Set(existingSandbox?.network?.allowedDomains ?? []);
            for (const domain of suggestedAllowedDomains) {
                if (domain && !currentAllowedDomains.has(domain)) {
                    currentAllowedDomains.add(domain);
                }
            }
            const currentAllowWrite = new Set(existingSandbox?.filesystem?.allowWrite ?? []);
            for (const path of suggestedAllowWrite) {
                if (path && !currentAllowWrite.has(path)) {
                    currentAllowWrite.add(path);
                }
            }
            if (suggestedAllowedDomains.length === 0 && suggestedAllowWrite.length === 0) {
                return data;
            }
            didChange = true;
            const nextSandboxConfig = {};
            if (currentAllowedDomains.size > 0) {
                nextSandboxConfig.network = {
                    ...existingSandbox?.network,
                    allowedDomains: [...currentAllowedDomains]
                };
            }
            if (currentAllowWrite.size > 0) {
                nextSandboxConfig.filesystem = {
                    ...existingSandbox?.filesystem,
                    allowWrite: [...currentAllowWrite],
                };
            }
            return {
                ...data,
                sandbox: nextSandboxConfig,
            };
        }, mcpResource, scanTarget);
        return didChange;
    }
    _getSandboxConfigSuggestions(potentialBlocks, existingSandboxConfig) {
        if (!potentialBlocks.length) {
            return undefined;
        }
        const allowWrite = new Set();
        const allowedDomains = new Set();
        const existingAllowWrite = new Set(existingSandboxConfig?.filesystem?.allowWrite ?? []);
        const existingAllowedDomains = new Set(existingSandboxConfig?.network?.allowedDomains ?? []);
        for (const block of potentialBlocks) {
            if (block.kind === 'network' && block.host && !existingAllowedDomains.has(block.host)) {
                allowedDomains.add(block.host);
            }
            if (block.kind === 'filesystem' && block.path && !existingAllowWrite.has(block.path)) {
                allowWrite.add(block.path);
            }
        }
        if (!allowWrite.size && !allowedDomains.size) {
            return undefined;
        }
        return {
            allowWrite: [...allowWrite],
            allowedDomains: [...allowedDomains],
        };
    }
    _toMcpResourceTarget(configTarget) {
        switch (configTarget) {
            case 2 /* ConfigurationTarget.USER */:
            case 3 /* ConfigurationTarget.USER_LOCAL */:
            case 4 /* ConfigurationTarget.USER_REMOTE */:
                return 2 /* ConfigurationTarget.USER */;
            case 5 /* ConfigurationTarget.WORKSPACE */:
                return 5 /* ConfigurationTarget.WORKSPACE */;
            case 6 /* ConfigurationTarget.WORKSPACE_FOLDER */:
                return 6 /* ConfigurationTarget.WORKSPACE_FOLDER */;
            default:
                return 2 /* ConfigurationTarget.USER */;
        }
    }
    async _resolveSandboxLaunchDetails(configTarget, remoteAuthority, sandboxConfig, launchCwd) {
        const os = await this._getOperatingSystem(remoteAuthority);
        if (os === 1 /* OperatingSystem.Windows */) {
            return { execPath: undefined, srtPath: undefined, rgPath: undefined, sandboxConfigPath: undefined, tempDir: undefined };
        }
        const appRoot = await this._getAppRoot(remoteAuthority);
        const execPath = await this._getExecPath(os, appRoot, remoteAuthority);
        const tempDir = await this._getTempDir(remoteAuthority);
        const srtPath = this._pathJoin(os, appRoot, 'node_modules', '@anthropic-ai', 'sandbox-runtime', 'dist', 'cli.js');
        const rgPath = this._pathJoin(os, appRoot, 'node_modules', '@vscode', 'ripgrep', 'bin', 'rg');
        const sandboxConfigPath = tempDir ? await this._updateSandboxConfig(tempDir, configTarget, sandboxConfig, launchCwd) : undefined;
        this._logService.debug(`McpSandboxService: Updated sandbox config path: ${sandboxConfigPath}`);
        return { execPath, srtPath, rgPath, sandboxConfigPath, tempDir };
    }
    async _getExecPath(os, appRoot, remoteAuthority) {
        if (remoteAuthority) {
            return this._pathJoin(os, appRoot, 'node');
        }
        return undefined; // Use Electron executable as the default exec path for local development, which will run the sandbox runtime wrapper with Electron in node mode. For remote, we need to specify the node executable to ensure it runs with Node.js.
    }
    async _getSandboxEnvVariables(baseEnv, tempDir, rgPath, remoteAuthority) {
        let env = { ...baseEnv };
        if (tempDir) {
            env = { ...env, TMPDIR: tempDir.path, SRT_DEBUG: 'true', NODE_USE_ENV_PROXY: '1' };
        }
        if (rgPath) {
            env = { ...env, PATH: env['PATH'] ? `${env['PATH']}${await this._getPathDelimiter(remoteAuthority)}${dirname(rgPath)}` : dirname(rgPath) };
        }
        if (!remoteAuthority) {
            // Add any remote-specific environment variables here
            env = { ...env, ELECTRON_RUN_AS_NODE: '1' };
        }
        // Ensure VSCODE_INSPECTOR_OPTIONS is not inherited by the sandboxed process, as it can cause issues with sandboxing.
        env['VSCODE_INSPECTOR_OPTIONS'] = null;
        return env;
    }
    _getSandboxCommandArgs(command, args, sandboxConfigPath) {
        const result = [];
        if (sandboxConfigPath) {
            result.push('--settings', sandboxConfigPath);
            result.push('--');
        }
        result.push(command, ...args);
        return result;
    }
    async _getRemoteEnv(remoteAuthority) {
        if (!remoteAuthority) {
            return null;
        }
        return this._remoteEnvDetailsPromise;
    }
    async _getOperatingSystem(remoteAuthority) {
        const remoteEnv = await this._getRemoteEnv(remoteAuthority);
        if (remoteEnv) {
            return remoteEnv.os;
        }
        return OS;
    }
    async _getAppRoot(remoteAuthority) {
        const remoteEnv = await this._getRemoteEnv(remoteAuthority);
        if (remoteEnv) {
            return remoteEnv.appRoot.path;
        }
        return dirname(FileAccess.asFileUri('').path);
    }
    async _getTempDir(remoteAuthority) {
        const remoteEnv = await this._getRemoteEnv(remoteAuthority);
        if (remoteEnv) {
            return remoteEnv.tmpDir;
        }
        const environmentService = this._environmentService;
        const tempDir = environmentService.tmpDir;
        if (!tempDir) {
            this._logService.warn('McpSandboxService: Cannot create sandbox settings file because no tmpDir is available in this environment');
        }
        return tempDir;
    }
    async _updateSandboxConfig(tempDir, configTarget, sandboxConfig, launchCwd) {
        const normalizedSandboxConfig = this._withDefaultSandboxConfig(sandboxConfig, launchCwd);
        let configFileUri;
        const configTargetKey = ConfigurationTargetToString(configTarget);
        if (this._sandboxConfigPerConfigurationTarget.has(configTargetKey)) {
            configFileUri = URI.parse(this._sandboxConfigPerConfigurationTarget.get(configTargetKey));
        }
        else {
            configFileUri = URI.joinPath(tempDir, `vscode-${configTargetKey}-mcp-sandbox-settings-${this._sandboxSettingsId}.json`);
            this._sandboxConfigPerConfigurationTarget.set(configTargetKey, configFileUri.toString());
        }
        await this._fileService.createFile(configFileUri, VSBuffer.fromString(JSON.stringify(normalizedSandboxConfig, null, '\t')), { overwrite: true });
        return configFileUri.path;
    }
    // this method merges the default allowWrite paths and allowedDomains with the ones provided in the sandbox config, to ensure that the default necessary paths and domains are always included in the sandbox config used for launching,
    //  even if they are not explicitly specified in the config provided by the user or the MCP server config.
    _withDefaultSandboxConfig(sandboxConfig, launchCwd) {
        const mergedAllowWrite = new Set(sandboxConfig?.filesystem?.allowWrite ?? []);
        for (const defaultAllowWrite of this._getDefaultAllowWrite(launchCwd ? [launchCwd] : undefined)) {
            if (defaultAllowWrite) {
                mergedAllowWrite.add(defaultAllowWrite);
            }
        }
        const mergedAllowedDomains = new Set(sandboxConfig?.network?.allowedDomains ?? []);
        for (const defaultAllowedDomain of this._defaultAllowedDomains) {
            if (defaultAllowedDomain) {
                mergedAllowedDomains.add(defaultAllowedDomain);
            }
        }
        return {
            ...sandboxConfig,
            network: {
                allowedDomains: [...mergedAllowedDomains],
                deniedDomains: sandboxConfig?.network?.deniedDomains ?? [],
            },
            filesystem: {
                allowWrite: [...mergedAllowWrite],
                denyRead: sandboxConfig?.filesystem?.denyRead ?? [],
                denyWrite: sandboxConfig?.filesystem?.denyWrite ?? [],
            },
        };
    }
    _getDefaultAllowWrite(directories) {
        for (const launchCwd of directories ?? []) {
            const trimmed = launchCwd.trim();
            if (trimmed) {
                this._defaultAllowWritePaths.push(trimmed);
            }
        }
        return this._defaultAllowWritePaths;
    }
    _quoteShellArgument(value) {
        return `'${value.replace(/'/g, `'\\''`)}'`;
    }
};
McpSandboxService = __decorate([
    __param(0, IFileService),
    __param(1, IEnvironmentService),
    __param(2, ILogService),
    __param(3, IMcpResourceScannerService),
    __param(4, IRemoteAgentService)
], McpSandboxService);
export { McpSandboxService };
//# sourceMappingURL=mcpSandboxService.js.map