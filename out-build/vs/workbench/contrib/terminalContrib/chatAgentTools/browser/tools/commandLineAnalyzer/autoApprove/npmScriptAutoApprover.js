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
import { MarkdownString } from '../../../../../../../../base/common/htmlContent.js';
import { visit } from '../../../../../../../../base/common/json.js';
import { Disposable } from '../../../../../../../../base/common/lifecycle.js';
import { URI } from '../../../../../../../../base/common/uri.js';
import { IUriIdentityService } from '../../../../../../../../platform/uriIdentity/common/uriIdentity.js';
import { localize } from '../../../../../../../../nls.js';
import { IConfigurationService } from '../../../../../../../../platform/configuration/common/configuration.js';
import { IFileService } from '../../../../../../../../platform/files/common/files.js';
import { IWorkspaceContextService } from '../../../../../../../../platform/workspace/common/workspace.js';
/**
 * Regex patterns to match npm/yarn/pnpm run commands and extract the script name.
 * Uses named capture groups: 'command' for the package manager, 'scriptName' for the script.
 */
const npmRunPatterns = [
    // npm run <script>
    // npm run-script <script>
    /^(?<command>npm)\s+(?:run(?:-script)?)\s+(?<scriptName>[^\s&|;]+)/i,
    // npm test, npm start, npm stop, npm restart (shorthand commands)
    // See https://docs.npmjs.com/cli/v10/commands/npm-run-script
    /^(?<command>npm)\s+(?<scriptName>test|start|stop|restart)\b/i,
    // yarn <script>
    // yarn run <script>
    /^(?<command>yarn)\s+(?:run\s+)?(?<scriptName>[^\s&|;]+)/i,
    // pnpm <script>
    // pnpm run <script>
    /^(?<command>pnpm)\s+(?:run\s+)?(?<scriptName>[^\s&|;]+)/i,
];
/**
 * Yarn built-in commands that should not be treated as script names.
 * Note: 'test' is omitted since it's commonly a user script, and 'yarn test'
 * is often used to run the 'test' script from package.json.
 */
const yarnBuiltinCommands = new Set([
    'add', 'audit', 'autoclean', 'bin', 'cache', 'check', 'config',
    'create', 'dedupe', 'dlx', 'exec', 'explain', 'generate-lock-entry',
    'global', 'help', 'import', 'info', 'init', 'install', 'licenses',
    'link', 'list', 'login', 'logout', 'node', 'outdated', 'owner',
    'pack', 'patch', 'patch-commit', 'plugin', 'policies', 'publish',
    'rebuild', 'remove', 'run', 'search', 'set', 'stage', 'tag', 'team',
    'unlink', 'unplug', 'up', 'upgrade', 'upgrade-interactive',
    'version', 'versions', 'why', 'workspace', 'workspaces',
]);
/**
 * pnpm built-in commands that should not be treated as script names.
 * Note: 'test' is omitted since it's commonly a user script, and 'pnpm test'
 * is often used to run the 'test' script from package.json.
 */
const pnpmBuiltinCommands = new Set([
    'add', 'audit', 'bin', 'config', 'dedupe', 'deploy', 'dlx', 'doctor',
    'env', 'exec', 'fetch', 'import', 'init', 'install', 'install-test',
    'licenses', 'link', 'list', 'ln', 'ls', 'outdated', 'pack', 'patch',
    'patch-commit', 'patch-remove', 'prune', 'publish', 'rb', 'rebuild',
    'remove', 'rm', 'root', 'run', 'server', 'setup', 'store',
    'un', 'uninstall', 'unlink', 'up', 'update', 'why',
]);
let NpmScriptAutoApprover = class NpmScriptAutoApprover extends Disposable {
    constructor(_configurationService, _fileService, _uriIdentityService, _workspaceContextService) {
        super();
        this._configurationService = _configurationService;
        this._fileService = _fileService;
        this._uriIdentityService = _uriIdentityService;
        this._workspaceContextService = _workspaceContextService;
    }
    /**
     * Checks if a single command is an npm/yarn/pnpm script that exists in package.json.
     * Returns auto-approve result if the command is a valid script.
     */
    async isCommandAutoApproved(command, cwd) {
        // Check if the feature is enabled
        const isNpmScriptAutoApproveEnabled = this._configurationService.getValue("chat.tools.terminal.autoApproveWorkspaceNpmScripts" /* TerminalChatAgentToolsSettingId.AutoApproveWorkspaceNpmScripts */) === true;
        if (!isNpmScriptAutoApproveEnabled) {
            return { isAutoApproved: false };
        }
        // Extract script name from the command
        const scriptName = this._extractScriptName(command);
        if (!scriptName) {
            return { isAutoApproved: false };
        }
        // Find and parse package.json
        const packageJsonScripts = await this._getPackageJsonScripts(cwd);
        if (!packageJsonScripts) {
            return { isAutoApproved: false };
        }
        // Check if script exists in package.json
        if (!packageJsonScripts.scripts.has(scriptName)) {
            return { isAutoApproved: false };
        }
        // Script exists - auto approve
        return {
            isAutoApproved: true,
            scriptName,
            autoApproveInfo: new MarkdownString(localize(15889, null, `\`${scriptName}\``)),
        };
    }
    /**
     * Extracts script name from an npm/yarn/pnpm run command.
     */
    _extractScriptName(command) {
        const trimmedCommand = command.trim();
        for (const pattern of npmRunPatterns) {
            const match = trimmedCommand.match(pattern);
            if (match?.groups?.scriptName) {
                const { command: pkgManager, scriptName } = match.groups;
                // Check if this is a yarn/pnpm shorthand that matches a built-in command
                if (pkgManager.toLowerCase() === 'yarn' && yarnBuiltinCommands.has(scriptName.toLowerCase())) {
                    continue;
                }
                if (pkgManager.toLowerCase() === 'pnpm' && pnpmBuiltinCommands.has(scriptName.toLowerCase())) {
                    continue;
                }
                return scriptName;
            }
        }
        return undefined;
    }
    /**
     * Checks if a URI is within any workspace folder.
     */
    _isWithinWorkspace(uri) {
        const workspaceFolders = this._workspaceContextService.getWorkspace().folders;
        return workspaceFolders.some((folder) => this._uriIdentityService.extUri.isEqualOrParent(uri, folder.uri));
    }
    /**
     * Finds and parses package.json to get the scripts section.
     * Only looks within the workspace for security.
     */
    async _getPackageJsonScripts(cwd) {
        // Only look in cwd if it's within the workspace
        if (!cwd || !this._isWithinWorkspace(cwd)) {
            return undefined;
        }
        const packageJsonUri = URI.joinPath(cwd, 'package.json');
        const scripts = await this._readPackageJsonScripts(packageJsonUri);
        if (scripts) {
            return { uri: packageJsonUri, scripts };
        }
        return undefined;
    }
    /**
     * Reads and parses the scripts section from a package.json file.
     */
    async _readPackageJsonScripts(packageJsonUri) {
        try {
            const exists = await this._fileService.exists(packageJsonUri);
            if (!exists) {
                return undefined;
            }
            const content = await this._fileService.readFile(packageJsonUri);
            const text = content.value.toString();
            return this._parsePackageJsonScripts(text);
        }
        catch {
            return undefined;
        }
    }
    /**
     * Parses the scripts section from package.json content using jsonc-parser.
     */
    _parsePackageJsonScripts(content) {
        const scripts = new Set();
        let inScripts = false;
        let level = 0;
        const visitor = {
            onError() {
                // Ignore parse errors
            },
            onObjectBegin() {
                level++;
            },
            onObjectEnd() {
                if (inScripts && level === 2) {
                    inScripts = false;
                }
                level--;
            },
            onObjectProperty(property) {
                if (level === 1 && property === 'scripts') {
                    inScripts = true;
                }
                else if (inScripts && level === 2) {
                    scripts.add(property);
                }
            },
        };
        visit(content, visitor);
        return scripts.size > 0 ? scripts : undefined;
    }
};
NpmScriptAutoApprover = __decorate([
    __param(0, IConfigurationService),
    __param(1, IFileService),
    __param(2, IUriIdentityService),
    __param(3, IWorkspaceContextService)
], NpmScriptAutoApprover);
export { NpmScriptAutoApprover };
//# sourceMappingURL=npmScriptAutoApprover.js.map