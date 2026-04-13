/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { URI } from '../../../../../../base/common/uri.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../../base/test/common/utils.js';
import { IConfigurationService } from '../../../../../../platform/configuration/common/configuration.js';
import { IDialogService } from '../../../../../../platform/dialogs/common/dialogs.js';
import { IFileService } from '../../../../../../platform/files/common/files.js';
import { TestInstantiationService } from '../../../../../../platform/instantiation/test/common/instantiationServiceMock.js';
import { ILogService, NullLogService } from '../../../../../../platform/log/common/log.js';
import { INotificationService } from '../../../../../../platform/notification/common/notification.js';
import { IProgressService } from '../../../../../../platform/progress/common/progress.js';
import { IQuickInputService } from '../../../../../../platform/quickinput/common/quickInput.js';
import { ITerminalService } from '../../../../terminal/browser/terminal.js';
import { PluginInstallService } from '../../../browser/pluginInstallService.js';
import { IAgentPluginRepositoryService } from '../../../common/plugins/agentPluginRepositoryService.js';
import { ChatConfiguration } from '../../../common/constants.js';
import { IPluginMarketplaceService, parseMarketplaceReference } from '../../../common/plugins/pluginMarketplaceService.js';
suite('PluginInstallService', () => {
    const store = ensureNoDisposablesAreLeakedInTestSuite();
    // --- Factory helpers -------------------------------------------------------
    function makeMarketplaceRef(marketplace) {
        const ref = parseMarketplaceReference(marketplace);
        assert.ok(ref);
        return ref;
    }
    function createPlugin(overrides) {
        return {
            name: overrides.name ?? 'test-plugin',
            description: overrides.description ?? '',
            version: overrides.version ?? '',
            source: overrides.source ?? '',
            sourceDescriptor: overrides.sourceDescriptor,
            marketplace: overrides.marketplace ?? 'microsoft/vscode',
            marketplaceReference: overrides.marketplaceReference ?? makeMarketplaceRef('microsoft/vscode'),
            marketplaceType: overrides.marketplaceType ?? "copilot" /* MarketplaceType.Copilot */,
            readmeUri: overrides.readmeUri,
        };
    }
    function createDefaults() {
        return {
            notifications: [],
            addedPlugins: [],
            dialogConfirmResult: true,
            fileExistsResult: true,
            ensureRepositoryResult: URI.file('/cache/agentPlugins/github.com/microsoft/vscode'),
            ensurePluginSourceResult: URI.file('/cache/agentPlugins/npm/my-package'),
            pluginSourceInstallUris: new Map(),
            terminalCommands: [],
            terminalExitCode: 0,
            terminalCompletes: true,
            pullRepositoryCalls: [],
            updatePluginSourceCalls: [],
            marketplaceTrusted: true,
            trustedMarketplaces: [],
            readPluginsResult: [],
            quickPickResult: undefined,
            quickInputResult: undefined,
            configuredMarketplaces: [],
            updatedMarketplaces: undefined,
        };
    }
    function createService(stateOverrides) {
        const state = { ...createDefaults(), ...stateOverrides };
        const instantiationService = store.add(new TestInstantiationService());
        // IFileService
        instantiationService.stub(IFileService, {
            exists: async (resource) => {
                if (typeof state.fileExistsResult === 'function') {
                    return state.fileExistsResult(resource);
                }
                return state.fileExistsResult;
            },
        });
        // INotificationService
        instantiationService.stub(INotificationService, {
            notify: (notification) => {
                state.notifications.push({ severity: notification.severity, message: notification.message });
                return undefined;
            },
        });
        // IDialogService
        instantiationService.stub(IDialogService, {
            confirm: async () => ({ confirmed: state.dialogConfirmResult }),
        });
        // ITerminalService — the mock coordinates runCommand and onCommandFinished
        // so the command ID matches, just like a real terminal would.
        instantiationService.stub(ITerminalService, {
            createTerminal: async () => {
                let finishedCallback;
                return {
                    processReady: Promise.resolve(),
                    dispose: () => { },
                    runCommand: (command, _addNewLine) => {
                        state.terminalCommands.push(command);
                        // Simulate command completing after runCommand is called
                        if (finishedCallback) {
                            finishedCallback({ id: 'command', exitCode: state.terminalExitCode });
                        }
                    },
                    capabilities: {
                        get: () => state.terminalCompletes ? {
                            onCommandFinished: (callback) => {
                                finishedCallback = callback;
                                return { dispose() { } };
                            },
                        } : undefined,
                        onDidAddCommandDetectionCapability: () => ({ dispose() { } }),
                    },
                };
            },
            setActiveInstance: () => { },
        });
        // IProgressService
        instantiationService.stub(IProgressService, {
            withProgress: async (_options, callback) => callback(),
        });
        // ILogService
        instantiationService.stub(ILogService, new NullLogService());
        // IAgentPluginRepositoryService
        // Build mock source repositories for npm/pip that simulate terminal-based install
        const makeMockPackageRepo = (kind) => ({
            kind,
            getCleanupTarget: () => URI.file('/mock-cleanup'),
            getInstallUri: () => URI.file('/mock'),
            ensure: async () => state.ensurePluginSourceResult,
            update: async () => true,
            getLabel: (d) => kind === "npm" /* PluginSourceKind.Npm */ ? d.package : d.package,
            runInstall: async (_installDir, pluginDir, plugin) => {
                // Simulate confirmation dialog
                if (!state.dialogConfirmResult) {
                    return undefined;
                }
                // Simulate building and running the command
                const descriptor = plugin.sourceDescriptor;
                let args;
                if (kind === "npm" /* PluginSourceKind.Npm */) {
                    const npm = descriptor;
                    const packageSpec = npm.version ? `${npm.package}@${npm.version}` : npm.package;
                    args = ['npm', 'install', '--prefix', _installDir.fsPath, packageSpec];
                    if (npm.registry) {
                        args.push('--registry', npm.registry);
                    }
                }
                else {
                    const pip = descriptor;
                    const packageSpec = pip.version ? `${pip.package}==${pip.version}` : pip.package;
                    args = ['pip', 'install', '--target', _installDir.fsPath, packageSpec];
                    if (pip.registry) {
                        args.push('--index-url', pip.registry);
                    }
                }
                const command = args.join(' ');
                state.terminalCommands.push(command);
                if (state.terminalExitCode !== 0) {
                    state.notifications.push({ severity: 3, message: `Plugin installation command failed: Command exited with code ${state.terminalExitCode}` });
                    return undefined;
                }
                // Check if plugin dir exists
                const exists = typeof state.fileExistsResult === 'function'
                    ? await state.fileExistsResult(pluginDir)
                    : state.fileExistsResult;
                if (!exists) {
                    const label = kind === "npm" /* PluginSourceKind.Npm */ ? 'npm' : 'pip';
                    const pkg = descriptor.package;
                    state.notifications.push({ severity: 3, message: `${label} package '${pkg}' was not found after installation.` });
                    return undefined;
                }
                return { pluginDir };
            },
        });
        const mockSourceRepos = new Map([
            ["relativePath" /* PluginSourceKind.RelativePath */, { kind: "relativePath" /* PluginSourceKind.RelativePath */, getCleanupTarget: () => undefined, getInstallUri: () => { throw new Error(); }, ensure: async () => { throw new Error(); }, update: async () => { throw new Error(); }, getLabel: (d) => d.path || '.' }],
            ["github" /* PluginSourceKind.GitHub */, { kind: "github" /* PluginSourceKind.GitHub */, getCleanupTarget: () => URI.file('/mock'), getInstallUri: () => URI.file('/mock'), ensure: async () => URI.file('/mock'), update: async () => true, getLabel: (d) => d.repo }],
            ["url" /* PluginSourceKind.GitUrl */, { kind: "url" /* PluginSourceKind.GitUrl */, getCleanupTarget: () => URI.file('/mock'), getInstallUri: () => URI.file('/mock'), ensure: async () => URI.file('/mock'), update: async () => true, getLabel: (d) => d.url }],
            ["npm" /* PluginSourceKind.Npm */, makeMockPackageRepo("npm" /* PluginSourceKind.Npm */)],
            ["pip" /* PluginSourceKind.Pip */, makeMockPackageRepo("pip" /* PluginSourceKind.Pip */)],
        ]);
        instantiationService.stub(IAgentPluginRepositoryService, {
            getPluginInstallUri: (plugin) => {
                return URI.joinPath(state.ensureRepositoryResult, plugin.source);
            },
            getRepositoryUri: () => state.ensureRepositoryResult,
            ensureRepository: async (_marketplace, _options) => {
                return state.ensureRepositoryResult;
            },
            pullRepository: async (marketplace, options) => {
                state.pullRepositoryCalls.push({ marketplace, options });
            },
            getPluginSourceInstallUri: (descriptor) => {
                const key = descriptor.kind;
                return state.pluginSourceInstallUris.get(key) ?? URI.file(`/cache/agentPlugins/${key}/default`);
            },
            ensurePluginSource: async () => state.ensurePluginSourceResult,
            updatePluginSource: async (plugin, options) => {
                state.updatePluginSourceCalls.push({ plugin, options });
            },
            getPluginSource: (kind) => mockSourceRepos.get(kind),
            cleanupPluginSource: async () => { },
        });
        // IPluginMarketplaceService
        instantiationService.stub(IPluginMarketplaceService, {
            addInstalledPlugin: (uri, plugin) => {
                state.addedPlugins.push({ uri: uri.toString(), plugin });
            },
            isMarketplaceTrusted: () => state.marketplaceTrusted,
            trustMarketplace: (ref) => {
                state.trustedMarketplaces.push(ref.canonicalId);
            },
            readPluginsFromDirectory: async () => state.readPluginsResult,
        });
        // IConfigurationService
        instantiationService.stub(IConfigurationService, {
            getValue: (key) => {
                if (key === ChatConfiguration.PluginMarketplaces) {
                    return state.configuredMarketplaces;
                }
                return undefined;
            },
            updateValue: async (key, value) => {
                if (key === ChatConfiguration.PluginMarketplaces) {
                    state.updatedMarketplaces = value;
                }
            },
        });
        // IQuickInputService
        instantiationService.stub(IQuickInputService, {
            input: async () => state.quickInputResult,
            pick: async (picks) => {
                if (!state.quickPickResult) {
                    return undefined;
                }
                return picks.find(p => p.label === state.quickPickResult.label);
            },
        });
        const service = instantiationService.createInstance(PluginInstallService);
        return { service, state };
    }
    // =========================================================================
    // getPluginInstallUri
    // =========================================================================
    suite('getPluginInstallUri', () => {
        test('delegates to getPluginInstallUri for relative-path plugins', () => {
            const { service } = createService();
            const plugin = createPlugin({
                source: 'plugins/myPlugin',
                sourceDescriptor: { kind: "relativePath" /* PluginSourceKind.RelativePath */, path: 'plugins/myPlugin' },
            });
            const uri = service.getPluginInstallUri(plugin);
            assert.strictEqual(uri.path, '/cache/agentPlugins/github.com/microsoft/vscode/plugins/myPlugin');
        });
        test('delegates to getPluginSourceInstallUri for npm plugins', () => {
            const npmUri = URI.file('/cache/agentPlugins/npm/my-pkg/node_modules/my-pkg');
            const { service } = createService({
                pluginSourceInstallUris: new Map([['npm', npmUri]]),
            });
            const plugin = createPlugin({
                sourceDescriptor: { kind: "npm" /* PluginSourceKind.Npm */, package: 'my-pkg' },
            });
            const uri = service.getPluginInstallUri(plugin);
            assert.strictEqual(uri.path, npmUri.path);
        });
        test('delegates to getPluginSourceInstallUri for pip plugins', () => {
            const pipUri = URI.file('/cache/agentPlugins/pip/my-pkg');
            const { service } = createService({
                pluginSourceInstallUris: new Map([['pip', pipUri]]),
            });
            const plugin = createPlugin({
                sourceDescriptor: { kind: "pip" /* PluginSourceKind.Pip */, package: 'my-pkg' },
            });
            const uri = service.getPluginInstallUri(plugin);
            assert.strictEqual(uri.path, pipUri.path);
        });
        test('delegates to getPluginSourceInstallUri for github plugins', () => {
            const ghUri = URI.file('/cache/agentPlugins/github.com/owner/repo');
            const { service } = createService({
                pluginSourceInstallUris: new Map([['github', ghUri]]),
            });
            const plugin = createPlugin({
                sourceDescriptor: { kind: "github" /* PluginSourceKind.GitHub */, repo: 'owner/repo' },
            });
            const uri = service.getPluginInstallUri(plugin);
            assert.strictEqual(uri.path, ghUri.path);
        });
    });
    // =========================================================================
    // installPlugin — relative path
    // =========================================================================
    suite('installPlugin — relative path', () => {
        test('installs a relative-path plugin when directory exists', async () => {
            const { service, state } = createService();
            const plugin = createPlugin({
                source: 'plugins/myPlugin',
                sourceDescriptor: { kind: "relativePath" /* PluginSourceKind.RelativePath */, path: 'plugins/myPlugin' },
            });
            await service.installPlugin(plugin);
            assert.strictEqual(state.addedPlugins.length, 1);
            assert.ok(state.addedPlugins[0].uri.includes('plugins/myPlugin'));
            assert.strictEqual(state.notifications.length, 0);
        });
        test('notifies error when plugin directory does not exist', async () => {
            const { service, state } = createService({ fileExistsResult: false });
            const plugin = createPlugin({
                source: 'plugins/missing',
                sourceDescriptor: { kind: "relativePath" /* PluginSourceKind.RelativePath */, path: 'plugins/missing' },
            });
            await service.installPlugin(plugin);
            assert.strictEqual(state.addedPlugins.length, 0);
            assert.strictEqual(state.notifications.length, 1);
            assert.ok(state.notifications[0].message.includes('not found'));
        });
        test('does not install when ensureRepository throws', async () => {
            const { state } = createService();
            // Override ensureRepository to throw
            const instantiationService = store.add(new TestInstantiationService());
            const repoService = {
                ensureRepository: async () => { throw new Error('clone failed'); },
                getPluginInstallUri: () => URI.file('/x'),
                getPluginSourceInstallUri: () => URI.file('/x'),
            };
            instantiationService.stub(IAgentPluginRepositoryService, repoService);
            instantiationService.stub(IFileService, { exists: async () => true });
            instantiationService.stub(INotificationService, { notify: (n) => { state.notifications.push(n); } });
            instantiationService.stub(IDialogService, { confirm: async () => ({ confirmed: true }) });
            instantiationService.stub(ITerminalService, {});
            instantiationService.stub(IProgressService, { withProgress: async (_o, cb) => cb() });
            instantiationService.stub(ILogService, new NullLogService());
            instantiationService.stub(IPluginMarketplaceService, { addInstalledPlugin: () => { } });
            instantiationService.stub(IPluginMarketplaceService, 'isMarketplaceTrusted', () => true);
            instantiationService.stub(IPluginMarketplaceService, 'trustMarketplace', () => { });
            const svc = instantiationService.createInstance(PluginInstallService);
            const plugin = createPlugin({
                source: 'plugins/myPlugin',
                sourceDescriptor: { kind: "relativePath" /* PluginSourceKind.RelativePath */, path: 'plugins/myPlugin' },
            });
            await svc.installPlugin(plugin);
            // Should return without installing or crashing
            assert.strictEqual(state.addedPlugins.length, 0);
        });
    });
    // =========================================================================
    // installPlugin — GitHub / GitUrl
    // =========================================================================
    suite('installPlugin — git sources', () => {
        test('installs a GitHub plugin when source exists after clone', async () => {
            const { service, state } = createService({
                ensurePluginSourceResult: URI.file('/cache/agentPlugins/github.com/owner/repo'),
            });
            const plugin = createPlugin({
                sourceDescriptor: { kind: "github" /* PluginSourceKind.GitHub */, repo: 'owner/repo' },
            });
            await service.installPlugin(plugin);
            assert.strictEqual(state.addedPlugins.length, 1);
            assert.strictEqual(state.notifications.length, 0);
        });
        test('installs a GitUrl plugin when source exists after clone', async () => {
            const { service, state } = createService({
                ensurePluginSourceResult: URI.file('/cache/agentPlugins/example.com/repo'),
            });
            const plugin = createPlugin({
                sourceDescriptor: { kind: "url" /* PluginSourceKind.GitUrl */, url: 'https://example.com/repo.git' },
            });
            await service.installPlugin(plugin);
            assert.strictEqual(state.addedPlugins.length, 1);
            assert.strictEqual(state.notifications.length, 0);
        });
        test('notifies error when cloned directory does not exist', async () => {
            const { service, state } = createService({
                fileExistsResult: false,
                ensurePluginSourceResult: URI.file('/cache/agentPlugins/github.com/owner/repo'),
            });
            const plugin = createPlugin({
                sourceDescriptor: { kind: "github" /* PluginSourceKind.GitHub */, repo: 'owner/repo' },
            });
            await service.installPlugin(plugin);
            assert.strictEqual(state.addedPlugins.length, 0);
            assert.strictEqual(state.notifications.length, 1);
            assert.ok(state.notifications[0].message.includes('not found'));
        });
    });
    // =========================================================================
    // installPlugin — npm
    // =========================================================================
    suite('installPlugin — npm', () => {
        test('runs npm install and registers plugin on success', async () => {
            const npmInstallUri = URI.file('/cache/agentPlugins/npm/my-pkg/node_modules/my-pkg');
            const { service, state } = createService({
                ensurePluginSourceResult: URI.file('/cache/agentPlugins/npm/my-pkg'),
                pluginSourceInstallUris: new Map([['npm', npmInstallUri]]),
            });
            const plugin = createPlugin({
                sourceDescriptor: { kind: "npm" /* PluginSourceKind.Npm */, package: 'my-pkg' },
            });
            await service.installPlugin(plugin);
            assert.strictEqual(state.terminalCommands.length, 1);
            assert.ok(state.terminalCommands[0].includes('npm'));
            assert.ok(state.terminalCommands[0].includes('install'));
            assert.ok(state.terminalCommands[0].includes('my-pkg'));
            assert.strictEqual(state.addedPlugins.length, 1);
            assert.strictEqual(state.notifications.length, 0);
        });
        test('includes version in npm install command', async () => {
            const { service, state } = createService({
                ensurePluginSourceResult: URI.file('/cache/agentPlugins/npm/my-pkg'),
                pluginSourceInstallUris: new Map([['npm', URI.file('/cache/agentPlugins/npm/my-pkg/node_modules/my-pkg')]]),
            });
            const plugin = createPlugin({
                sourceDescriptor: { kind: "npm" /* PluginSourceKind.Npm */, package: 'my-pkg', version: '1.2.3' },
            });
            await service.installPlugin(plugin);
            assert.strictEqual(state.terminalCommands.length, 1);
            assert.ok(state.terminalCommands[0].includes('my-pkg@1.2.3'));
        });
        test('includes registry in npm install command', async () => {
            const { service, state } = createService({
                ensurePluginSourceResult: URI.file('/cache/agentPlugins/npm/my-pkg'),
                pluginSourceInstallUris: new Map([['npm', URI.file('/cache/agentPlugins/npm/my-pkg/node_modules/my-pkg')]]),
            });
            const plugin = createPlugin({
                sourceDescriptor: { kind: "npm" /* PluginSourceKind.Npm */, package: 'my-pkg', registry: 'https://custom.registry.com' },
            });
            await service.installPlugin(plugin);
            assert.strictEqual(state.terminalCommands.length, 1);
            assert.ok(state.terminalCommands[0].includes('--registry'));
            assert.ok(state.terminalCommands[0].includes('https://custom.registry.com'));
        });
        test('does not install when user declines confirmation', async () => {
            const { service, state } = createService({ dialogConfirmResult: false });
            const plugin = createPlugin({
                sourceDescriptor: { kind: "npm" /* PluginSourceKind.Npm */, package: 'my-pkg' },
            });
            await service.installPlugin(plugin);
            assert.strictEqual(state.terminalCommands.length, 0);
            assert.strictEqual(state.addedPlugins.length, 0);
        });
        test('notifies error when npm package directory not found after install', async () => {
            const { service, state } = createService({
                ensurePluginSourceResult: URI.file('/cache/agentPlugins/npm/my-pkg'),
                // exists returns true for ensurePluginSource but false for the final check
                fileExistsResult: false,
            });
            const plugin = createPlugin({
                sourceDescriptor: { kind: "npm" /* PluginSourceKind.Npm */, package: 'my-pkg' },
            });
            await service.installPlugin(plugin);
            assert.strictEqual(state.addedPlugins.length, 0);
            assert.strictEqual(state.notifications.length, 1);
            assert.ok(state.notifications[0].message.includes('not found'));
        });
        test('notifies error when terminal command fails with non-zero exit code', async () => {
            const { service, state } = createService({
                ensurePluginSourceResult: URI.file('/cache/agentPlugins/npm/my-pkg'),
                terminalExitCode: 1,
            });
            const plugin = createPlugin({
                sourceDescriptor: { kind: "npm" /* PluginSourceKind.Npm */, package: 'my-pkg' },
            });
            await service.installPlugin(plugin);
            assert.strictEqual(state.addedPlugins.length, 0);
            assert.strictEqual(state.notifications.length, 1);
            assert.ok(state.notifications[0].message.includes('failed'));
        });
    });
    // =========================================================================
    // installPlugin — pip
    // =========================================================================
    suite('installPlugin — pip', () => {
        test('runs pip install and registers plugin on success', async () => {
            const pipInstallUri = URI.file('/cache/agentPlugins/pip/my-pkg');
            const { service, state } = createService({
                ensurePluginSourceResult: URI.file('/cache/agentPlugins/pip/my-pkg'),
                pluginSourceInstallUris: new Map([['pip', pipInstallUri]]),
            });
            const plugin = createPlugin({
                sourceDescriptor: { kind: "pip" /* PluginSourceKind.Pip */, package: 'my-pkg' },
            });
            await service.installPlugin(plugin);
            assert.strictEqual(state.terminalCommands.length, 1);
            assert.ok(state.terminalCommands[0].includes('pip'));
            assert.ok(state.terminalCommands[0].includes('install'));
            assert.ok(state.terminalCommands[0].includes('my-pkg'));
            assert.strictEqual(state.addedPlugins.length, 1);
            assert.strictEqual(state.notifications.length, 0);
        });
        test('includes version with == syntax in pip install command', async () => {
            const { service, state } = createService({
                ensurePluginSourceResult: URI.file('/cache/agentPlugins/pip/my-pkg'),
                pluginSourceInstallUris: new Map([['pip', URI.file('/cache/agentPlugins/pip/my-pkg')]]),
            });
            const plugin = createPlugin({
                sourceDescriptor: { kind: "pip" /* PluginSourceKind.Pip */, package: 'my-pkg', version: '2.0.0' },
            });
            await service.installPlugin(plugin);
            assert.strictEqual(state.terminalCommands.length, 1);
            assert.ok(state.terminalCommands[0].includes('my-pkg==2.0.0'));
        });
        test('includes registry with --index-url in pip install command', async () => {
            const { service, state } = createService({
                ensurePluginSourceResult: URI.file('/cache/agentPlugins/pip/my-pkg'),
                pluginSourceInstallUris: new Map([['pip', URI.file('/cache/agentPlugins/pip/my-pkg')]]),
            });
            const plugin = createPlugin({
                sourceDescriptor: { kind: "pip" /* PluginSourceKind.Pip */, package: 'my-pkg', registry: 'https://pypi.custom.com/simple' },
            });
            await service.installPlugin(plugin);
            assert.strictEqual(state.terminalCommands.length, 1);
            assert.ok(state.terminalCommands[0].includes('--index-url'));
            assert.ok(state.terminalCommands[0].includes('https://pypi.custom.com/simple'));
        });
        test('does not install when user declines confirmation', async () => {
            const { service, state } = createService({ dialogConfirmResult: false });
            const plugin = createPlugin({
                sourceDescriptor: { kind: "pip" /* PluginSourceKind.Pip */, package: 'my-pkg' },
            });
            await service.installPlugin(plugin);
            assert.strictEqual(state.terminalCommands.length, 0);
            assert.strictEqual(state.addedPlugins.length, 0);
        });
        test('notifies error when pip package directory not found after install', async () => {
            const { service, state } = createService({
                ensurePluginSourceResult: URI.file('/cache/agentPlugins/pip/my-pkg'),
                fileExistsResult: false,
            });
            const plugin = createPlugin({
                sourceDescriptor: { kind: "pip" /* PluginSourceKind.Pip */, package: 'my-pkg' },
            });
            await service.installPlugin(plugin);
            assert.strictEqual(state.addedPlugins.length, 0);
            assert.strictEqual(state.notifications.length, 1);
            assert.ok(state.notifications[0].message.includes('not found'));
        });
    });
    // =========================================================================
    // updatePlugin
    // =========================================================================
    suite('updatePlugin', () => {
        test('calls updatePluginSource for relative-path plugins', async () => {
            const { service, state } = createService();
            const plugin = createPlugin({
                source: 'plugins/myPlugin',
                sourceDescriptor: { kind: "relativePath" /* PluginSourceKind.RelativePath */, path: 'plugins/myPlugin' },
            });
            await service.updatePlugin(plugin);
            assert.strictEqual(state.updatePluginSourceCalls.length, 1);
        });
        test('calls updatePluginSource for GitHub plugins', async () => {
            const { service, state } = createService();
            const plugin = createPlugin({
                sourceDescriptor: { kind: "github" /* PluginSourceKind.GitHub */, repo: 'owner/repo' },
            });
            await service.updatePlugin(plugin);
            assert.strictEqual(state.updatePluginSourceCalls.length, 1);
        });
        test('calls updatePluginSource for GitUrl plugins', async () => {
            const { service, state } = createService();
            const plugin = createPlugin({
                sourceDescriptor: { kind: "url" /* PluginSourceKind.GitUrl */, url: 'https://example.com/repo.git' },
            });
            await service.updatePlugin(plugin);
            assert.strictEqual(state.updatePluginSourceCalls.length, 1);
        });
        test('re-installs for npm plugin updates', async () => {
            const { service, state } = createService({
                ensurePluginSourceResult: URI.file('/cache/agentPlugins/npm/my-pkg'),
                pluginSourceInstallUris: new Map([['npm', URI.file('/cache/agentPlugins/npm/my-pkg/node_modules/my-pkg')]]),
            });
            const plugin = createPlugin({
                sourceDescriptor: { kind: "npm" /* PluginSourceKind.Npm */, package: 'my-pkg' },
            });
            await service.updatePlugin(plugin);
            // npm update goes through the same install flow
            assert.strictEqual(state.terminalCommands.length, 1);
            assert.ok(state.terminalCommands[0].includes('npm'));
        });
        test('does not report npm plugin as updated when install is declined', async () => {
            const { service, state } = createService({
                dialogConfirmResult: false,
                ensurePluginSourceResult: URI.file('/cache/agentPlugins/npm/my-pkg'),
                pluginSourceInstallUris: new Map([['npm', URI.file('/cache/agentPlugins/npm/my-pkg/node_modules/my-pkg')]]),
            });
            const plugin = createPlugin({
                sourceDescriptor: { kind: "npm" /* PluginSourceKind.Npm */, package: 'my-pkg' },
            });
            const updated = await service.updatePlugin(plugin);
            assert.strictEqual(updated, false);
            assert.strictEqual(state.terminalCommands.length, 0);
            assert.strictEqual(state.addedPlugins.length, 0);
        });
        test('re-installs for pip plugin updates', async () => {
            const { service, state } = createService({
                ensurePluginSourceResult: URI.file('/cache/agentPlugins/pip/my-pkg'),
                pluginSourceInstallUris: new Map([['pip', URI.file('/cache/agentPlugins/pip/my-pkg')]]),
            });
            const plugin = createPlugin({
                sourceDescriptor: { kind: "pip" /* PluginSourceKind.Pip */, package: 'my-pkg' },
            });
            await service.updatePlugin(plugin);
            assert.strictEqual(state.terminalCommands.length, 1);
            assert.ok(state.terminalCommands[0].includes('pip'));
        });
        test('does not report pip plugin as updated when install is declined', async () => {
            const { service, state } = createService({
                dialogConfirmResult: false,
                ensurePluginSourceResult: URI.file('/cache/agentPlugins/pip/my-pkg'),
                pluginSourceInstallUris: new Map([['pip', URI.file('/cache/agentPlugins/pip/my-pkg')]]),
            });
            const plugin = createPlugin({
                sourceDescriptor: { kind: "pip" /* PluginSourceKind.Pip */, package: 'my-pkg' },
            });
            const updated = await service.updatePlugin(plugin);
            assert.strictEqual(updated, false);
            assert.strictEqual(state.terminalCommands.length, 0);
            assert.strictEqual(state.addedPlugins.length, 0);
        });
    });
    // =========================================================================
    // installPlugin — marketplace trust
    // =========================================================================
    suite('installPlugin — marketplace trust', () => {
        test('skips trust prompt when marketplace is already trusted', async () => {
            const { service, state } = createService({ marketplaceTrusted: true });
            const plugin = createPlugin({
                source: 'plugins/myPlugin',
                sourceDescriptor: { kind: "relativePath" /* PluginSourceKind.RelativePath */, path: 'plugins/myPlugin' },
            });
            await service.installPlugin(plugin);
            assert.strictEqual(state.addedPlugins.length, 1);
            assert.strictEqual(state.trustedMarketplaces.length, 0, 'should not re-trust');
        });
        test('shows trust prompt and installs when user confirms', async () => {
            const { service, state } = createService({ marketplaceTrusted: false, dialogConfirmResult: true });
            const plugin = createPlugin({
                source: 'plugins/myPlugin',
                sourceDescriptor: { kind: "relativePath" /* PluginSourceKind.RelativePath */, path: 'plugins/myPlugin' },
            });
            await service.installPlugin(plugin);
            assert.strictEqual(state.trustedMarketplaces.length, 1);
            assert.strictEqual(state.addedPlugins.length, 1);
        });
        test('does not install when user declines trust', async () => {
            const { service, state } = createService({ marketplaceTrusted: false, dialogConfirmResult: false });
            const plugin = createPlugin({
                source: 'plugins/myPlugin',
                sourceDescriptor: { kind: "relativePath" /* PluginSourceKind.RelativePath */, path: 'plugins/myPlugin' },
            });
            await service.installPlugin(plugin);
            assert.strictEqual(state.trustedMarketplaces.length, 0);
            assert.strictEqual(state.addedPlugins.length, 0);
        });
        test('trust prompt applies to all source kinds', async () => {
            const { service, state } = createService({ marketplaceTrusted: false, dialogConfirmResult: false });
            const kinds = [
                { kind: "relativePath" /* PluginSourceKind.RelativePath */, path: 'p' },
                { kind: "github" /* PluginSourceKind.GitHub */, repo: 'owner/repo' },
                { kind: "url" /* PluginSourceKind.GitUrl */, url: 'https://example.com/repo.git' },
                { kind: "npm" /* PluginSourceKind.Npm */, package: 'my-pkg' },
                { kind: "pip" /* PluginSourceKind.Pip */, package: 'my-pkg' },
            ];
            for (const sourceDescriptor of kinds) {
                await service.installPlugin(createPlugin({ sourceDescriptor }));
            }
            assert.strictEqual(state.addedPlugins.length, 0, 'no plugins should be installed when trust is declined');
        });
    });
    // =========================================================================
    // installPluginFromSource
    // =========================================================================
    suite('installPluginFromSource', () => {
        test('rejects invalid source strings', async () => {
            const { service, state } = createService();
            await service.installPluginFromSource('not a valid source');
            assert.strictEqual(state.addedPlugins.length, 0);
            assert.strictEqual(state.notifications.length, 1);
        });
        test('rejects local file URIs', async () => {
            const { service, state } = createService();
            await service.installPluginFromSource('file:///some/local/path');
            assert.strictEqual(state.addedPlugins.length, 0);
            assert.strictEqual(state.notifications.length, 1);
        });
        test('installs single plugin from GitHub shorthand with marketplace.json', async () => {
            const ref = makeMarketplaceRef('owner/my-plugin');
            const discoveredPlugin = createPlugin({
                name: 'my-discovered-plugin',
                description: 'A discovered plugin',
                sourceDescriptor: { kind: "relativePath" /* PluginSourceKind.RelativePath */, path: '' },
                marketplace: ref.displayLabel,
                marketplaceReference: ref,
                marketplaceType: "openPlugin" /* MarketplaceType.OpenPlugin */,
            });
            const { service, state } = createService({
                ensurePluginSourceResult: URI.file('/cache/agentPlugins/github.com/owner/my-plugin'),
                readPluginsResult: [discoveredPlugin],
            });
            await service.installPluginFromSource('owner/my-plugin');
            assert.strictEqual(state.addedPlugins.length, 1);
            assert.strictEqual(state.addedPlugins[0].plugin.name, 'my-discovered-plugin');
        });
        test('shows error when no marketplace.json found', async () => {
            const { service, state } = createService({
                ensurePluginSourceResult: URI.file('/cache/agentPlugins/github.com/owner/cool-tool'),
                readPluginsResult: [],
            });
            await service.installPluginFromSource('owner/cool-tool');
            assert.strictEqual(state.addedPlugins.length, 0);
            assert.strictEqual(state.notifications.length, 1);
            assert.ok(state.notifications[0].message.includes('No plugins found'));
        });
        test('shows quick pick for multi-plugin repos', async () => {
            const ref = makeMarketplaceRef('owner/multi-repo');
            const pluginA = createPlugin({
                name: 'plugin-a',
                source: 'plugins/a',
                sourceDescriptor: { kind: "relativePath" /* PluginSourceKind.RelativePath */, path: 'plugins/a' },
                marketplace: ref.displayLabel,
                marketplaceReference: ref,
            });
            const pluginB = createPlugin({
                name: 'plugin-b',
                source: 'plugins/b',
                sourceDescriptor: { kind: "relativePath" /* PluginSourceKind.RelativePath */, path: 'plugins/b' },
                marketplace: ref.displayLabel,
                marketplaceReference: ref,
            });
            const { service, state } = createService({
                ensurePluginSourceResult: URI.file('/cache/agentPlugins/github.com/owner/multi-repo'),
                readPluginsResult: [pluginA, pluginB],
                quickPickResult: { label: 'plugin-b' },
            });
            await service.installPluginFromSource('owner/multi-repo');
            assert.strictEqual(state.addedPlugins.length, 1);
            assert.strictEqual(state.addedPlugins[0].plugin.name, 'plugin-b');
            assert.ok(state.addedPlugins[0].uri.includes('plugins/b'));
        });
        test('does not install when quick pick is cancelled', async () => {
            const ref = makeMarketplaceRef('owner/multi-repo');
            const pluginA = createPlugin({
                name: 'plugin-a',
                sourceDescriptor: { kind: "relativePath" /* PluginSourceKind.RelativePath */, path: 'plugins/a' },
                marketplace: ref.displayLabel,
                marketplaceReference: ref,
            });
            const pluginB = createPlugin({
                name: 'plugin-b',
                sourceDescriptor: { kind: "relativePath" /* PluginSourceKind.RelativePath */, path: 'plugins/b' },
                marketplace: ref.displayLabel,
                marketplaceReference: ref,
            });
            const { service, state } = createService({
                ensurePluginSourceResult: URI.file('/cache/agentPlugins/github.com/owner/multi-repo'),
                readPluginsResult: [pluginA, pluginB],
                quickPickResult: undefined,
            });
            await service.installPluginFromSource('owner/multi-repo');
            assert.strictEqual(state.addedPlugins.length, 0);
        });
        test('does not install when trust is declined', async () => {
            const { service, state } = createService({
                marketplaceTrusted: false,
                dialogConfirmResult: false,
                readPluginsResult: [],
            });
            await service.installPluginFromSource('owner/repo');
            assert.strictEqual(state.addedPlugins.length, 0);
        });
        test('shows error when no plugins found in git URL', async () => {
            const { service, state } = createService({
                ensurePluginSourceResult: URI.file('/cache/agentPlugins/github.com/owner/my-tool'),
                readPluginsResult: [],
            });
            await service.installPluginFromSource('https://github.com/owner/my-tool.git');
            assert.strictEqual(state.addedPlugins.length, 0);
            assert.strictEqual(state.notifications.length, 1);
            assert.ok(state.notifications[0].message.includes('No plugins found'));
        });
        test('shows error when clone directory does not exist', async () => {
            const { service, state } = createService({
                ensurePluginSourceResult: URI.file('/cache/agentPlugins/github.com/owner/missing'),
                fileExistsResult: false,
            });
            await service.installPluginFromSource('owner/missing');
            assert.strictEqual(state.addedPlugins.length, 0);
            assert.strictEqual(state.notifications.length, 1);
        });
        test('adds marketplace to config after installing single plugin', async () => {
            const ref = makeMarketplaceRef('owner/my-plugin');
            const discoveredPlugin = createPlugin({
                name: 'my-discovered-plugin',
                sourceDescriptor: { kind: "relativePath" /* PluginSourceKind.RelativePath */, path: '' },
                marketplace: ref.displayLabel,
                marketplaceReference: ref,
                marketplaceType: "openPlugin" /* MarketplaceType.OpenPlugin */,
            });
            const { service, state } = createService({
                ensurePluginSourceResult: URI.file('/cache/agentPlugins/github.com/owner/my-plugin'),
                readPluginsResult: [discoveredPlugin],
            });
            await service.installPluginFromSource('owner/my-plugin');
            assert.deepStrictEqual(state.updatedMarketplaces, ['owner/my-plugin']);
        });
        test('adds marketplace to config after picking from multi-plugin repo', async () => {
            const ref = makeMarketplaceRef('owner/multi-repo');
            const pluginA = createPlugin({
                name: 'plugin-a',
                source: 'plugins/a',
                sourceDescriptor: { kind: "relativePath" /* PluginSourceKind.RelativePath */, path: 'plugins/a' },
                marketplace: ref.displayLabel,
                marketplaceReference: ref,
            });
            const pluginB = createPlugin({
                name: 'plugin-b',
                source: 'plugins/b',
                sourceDescriptor: { kind: "relativePath" /* PluginSourceKind.RelativePath */, path: 'plugins/b' },
                marketplace: ref.displayLabel,
                marketplaceReference: ref,
            });
            const { service, state } = createService({
                ensurePluginSourceResult: URI.file('/cache/agentPlugins/github.com/owner/multi-repo'),
                readPluginsResult: [pluginA, pluginB],
                quickPickResult: { label: 'plugin-a' },
            });
            await service.installPluginFromSource('owner/multi-repo');
            assert.deepStrictEqual(state.updatedMarketplaces, ['owner/multi-repo']);
        });
        test('does not duplicate marketplace in config', async () => {
            const ref = makeMarketplaceRef('owner/my-plugin');
            const discoveredPlugin = createPlugin({
                name: 'my-discovered-plugin',
                sourceDescriptor: { kind: "relativePath" /* PluginSourceKind.RelativePath */, path: '' },
                marketplace: ref.displayLabel,
                marketplaceReference: ref,
                marketplaceType: "openPlugin" /* MarketplaceType.OpenPlugin */,
            });
            const { service, state } = createService({
                ensurePluginSourceResult: URI.file('/cache/agentPlugins/github.com/owner/my-plugin'),
                readPluginsResult: [discoveredPlugin],
                configuredMarketplaces: ['owner/my-plugin'],
            });
            await service.installPluginFromSource('owner/my-plugin');
            assert.strictEqual(state.updatedMarketplaces, undefined);
        });
    });
});
//# sourceMappingURL=pluginInstallService.test.js.map