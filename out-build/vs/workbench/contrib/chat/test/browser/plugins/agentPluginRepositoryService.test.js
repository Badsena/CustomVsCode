/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { URI } from '../../../../../../base/common/uri.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../../base/test/common/utils.js';
import { ICommandService } from '../../../../../../platform/commands/common/commands.js';
import { IEnvironmentService } from '../../../../../../platform/environment/common/environment.js';
import { IFileService } from '../../../../../../platform/files/common/files.js';
import { TestInstantiationService } from '../../../../../../platform/instantiation/test/common/instantiationServiceMock.js';
import { ILogService, NullLogService } from '../../../../../../platform/log/common/log.js';
import { INotificationService } from '../../../../../../platform/notification/common/notification.js';
import { IProgressService } from '../../../../../../platform/progress/common/progress.js';
import { IStorageService, InMemoryStorageService } from '../../../../../../platform/storage/common/storage.js';
import { AgentPluginRepositoryService } from '../../../browser/agentPluginRepositoryService.js';
import { parseMarketplaceReference } from '../../../common/plugins/pluginMarketplaceService.js';
suite('AgentPluginRepositoryService', () => {
    const store = ensureNoDisposablesAreLeakedInTestSuite();
    function createPlugin(marketplace, source) {
        const marketplaceReference = parseMarketplaceReference(marketplace);
        assert.ok(marketplaceReference);
        if (!marketplaceReference) {
            throw new Error('Expected marketplace reference to parse.');
        }
        return {
            name: 'test-plugin',
            description: '',
            version: '',
            source,
            sourceDescriptor: { kind: "relativePath" /* PluginSourceKind.RelativePath */, path: source },
            marketplace: marketplaceReference.displayLabel,
            marketplaceReference,
            marketplaceType: "copilot" /* MarketplaceType.Copilot */,
        };
    }
    function createService(onExists, onExecuteCommand) {
        const instantiationService = store.add(new TestInstantiationService());
        const fileService = {
            exists: async (resource) => onExists ? onExists(resource) : true,
        };
        const progressService = {
            withProgress: async (_options, callback) => callback(),
        };
        instantiationService.stub(ICommandService, {
            executeCommand: async (id, ...args) => {
                onExecuteCommand?.(id, ...args);
                return undefined;
            },
        });
        instantiationService.stub(IEnvironmentService, { cacheHome: URI.file('/cache') });
        instantiationService.stub(IFileService, fileService);
        instantiationService.stub(ILogService, new NullLogService());
        instantiationService.stub(INotificationService, { notify: () => undefined });
        instantiationService.stub(IProgressService, progressService);
        instantiationService.stub(IStorageService, store.add(new InMemoryStorageService()));
        return instantiationService.createInstance(AgentPluginRepositoryService);
    }
    test('uses cacheSegments path for GitHub shorthand plugin references', () => {
        const service = createService();
        const plugin = createPlugin('microsoft/vscode', 'plugins/myPlugin');
        const uri = service.getRepositoryUri(plugin.marketplaceReference, plugin.marketplaceType);
        assert.strictEqual(uri.path, '/cache/agentPlugins/github.com/microsoft/vscode');
    });
    test('uses marketplaces cache path for direct git URI plugin references', () => {
        const service = createService();
        const plugin = createPlugin('https://example.com/org/repo.git', 'plugins/myPlugin');
        const uri = service.getRepositoryUri(plugin.marketplaceReference, plugin.marketplaceType);
        assert.strictEqual(uri.path, '/cache/agentPlugins/example.com/org/repo');
    });
    test('uses same cache path for equivalent GitHub shorthand and URI references', () => {
        const service = createService();
        const shorthandPlugin = createPlugin('microsoft/vscode', 'plugins/myPlugin');
        const uriPlugin = createPlugin('https://github.com/microsoft/vscode.git', 'plugins/myPlugin');
        const shorthandUri = service.getRepositoryUri(shorthandPlugin.marketplaceReference, shorthandPlugin.marketplaceType);
        const uriRefUri = service.getRepositoryUri(uriPlugin.marketplaceReference, uriPlugin.marketplaceType);
        assert.strictEqual(shorthandUri.path, '/cache/agentPlugins/github.com/microsoft/vscode');
        assert.strictEqual(uriRefUri.path, '/cache/agentPlugins/github.com/microsoft/vscode');
    });
    test('ensures plugin repositories via cacheSegments path', async () => {
        let checkedPath;
        const service = createService(async (resource) => {
            checkedPath = resource.path;
            return true;
        });
        const plugin = createPlugin('microsoft/vscode', 'plugins/myPlugin');
        const uri = await service.ensureRepository(plugin.marketplaceReference, { marketplaceType: plugin.marketplaceType });
        assert.strictEqual(checkedPath, '/cache/agentPlugins/github.com/microsoft/vscode');
        assert.strictEqual(uri.path, '/cache/agentPlugins/github.com/microsoft/vscode');
    });
    test('concurrent ensureRepository calls for the same marketplace clone only once', async () => {
        let cloneCount = 0;
        const instantiationService = store.add(new TestInstantiationService());
        // Track whether the repo exists (set to true after the first clone completes)
        let repoExists = false;
        const fileService = {
            exists: async (_resource) => repoExists,
            createFolder: async () => undefined,
        };
        const progressService = {
            withProgress: async (_options, callback) => callback(),
        };
        instantiationService.stub(ICommandService, {
            executeCommand: async (id) => {
                if (id === '_git.cloneRepository') {
                    cloneCount++;
                    // Simulate async clone by yielding, then mark repo as existing
                    await new Promise(r => setTimeout(r, 0));
                    repoExists = true;
                }
                return undefined;
            },
        });
        instantiationService.stub(IEnvironmentService, { cacheHome: URI.file('/cache') });
        instantiationService.stub(IFileService, fileService);
        instantiationService.stub(ILogService, new NullLogService());
        instantiationService.stub(INotificationService, { notify: () => undefined });
        instantiationService.stub(IProgressService, progressService);
        instantiationService.stub(IStorageService, store.add(new InMemoryStorageService()));
        const service = instantiationService.createInstance(AgentPluginRepositoryService);
        const plugin = createPlugin('microsoft/vscode', 'plugins/myPlugin');
        // Fire two concurrent ensureRepository calls for the same marketplace
        const [uri1, uri2] = await Promise.all([
            service.ensureRepository(plugin.marketplaceReference, { marketplaceType: plugin.marketplaceType }),
            service.ensureRepository(plugin.marketplaceReference, { marketplaceType: plugin.marketplaceType }),
        ]);
        assert.strictEqual(cloneCount, 1);
        assert.strictEqual(uri1.path, '/cache/agentPlugins/github.com/microsoft/vscode');
        assert.strictEqual(uri2.path, '/cache/agentPlugins/github.com/microsoft/vscode');
    });
    test('builds install URI from source inside repository root', () => {
        const service = createService();
        const plugin = createPlugin('microsoft/vscode', 'plugins/myPlugin');
        const uri = service.getPluginInstallUri(plugin);
        assert.strictEqual(uri.path, '/cache/agentPlugins/github.com/microsoft/vscode/plugins/myPlugin');
    });
    test('uses indexed repository URI when available', () => {
        const storage = store.add(new InMemoryStorageService());
        storage.store('chat.plugins.marketplaces.index.v1', JSON.stringify({
            'github:microsoft/vscode': {
                repositoryUri: URI.file('/cache/agentPlugins/indexed/microsoft/vscode'),
                marketplaceType: "copilot" /* MarketplaceType.Copilot */,
            },
        }), -1 /* StorageScope.APPLICATION */, 1 /* StorageTarget.MACHINE */);
        const instantiationService = store.add(new TestInstantiationService());
        instantiationService.stub(ICommandService, { executeCommand: async () => undefined });
        instantiationService.stub(IEnvironmentService, { cacheHome: URI.file('/cache') });
        instantiationService.stub(IFileService, { exists: async () => true });
        instantiationService.stub(ILogService, new NullLogService());
        instantiationService.stub(INotificationService, { notify: () => undefined });
        instantiationService.stub(IProgressService, { withProgress: async (_options, callback) => callback() });
        instantiationService.stub(IStorageService, storage);
        const service = instantiationService.createInstance(AgentPluginRepositoryService);
        const plugin = createPlugin('microsoft/vscode', 'plugins/myPlugin');
        const uri = service.getRepositoryUri(plugin.marketplaceReference, plugin.marketplaceType);
        assert.strictEqual(uri.path, '/cache/agentPlugins/indexed/microsoft/vscode');
    });
    test('rejects plugin source paths that escape repository root', () => {
        const service = createService();
        const plugin = createPlugin('microsoft/vscode', '../outside');
        assert.throws(() => service.getPluginInstallUri(plugin));
    });
    test('uses local repository URI for file marketplace references', () => {
        const service = createService();
        const plugin = createPlugin('file:///tmp/marketplace-repo', 'plugins/myPlugin');
        const uri = service.getRepositoryUri(plugin.marketplaceReference, plugin.marketplaceType);
        assert.strictEqual(uri.scheme, 'file');
        assert.strictEqual(uri.path, '/tmp/marketplace-repo');
    });
    test('does not invoke clone command when ensuring existing local file repository', async () => {
        let commandInvocationCount = 0;
        const service = createService(async () => true, () => {
            commandInvocationCount++;
        });
        const plugin = createPlugin('file:///tmp/marketplace-repo', 'plugins/myPlugin');
        const uri = await service.ensureRepository(plugin.marketplaceReference, { marketplaceType: plugin.marketplaceType });
        assert.strictEqual(uri.path, '/tmp/marketplace-repo');
        assert.strictEqual(commandInvocationCount, 0);
    });
    test('builds revision-aware install URI for github plugin sources', () => {
        const service = createService();
        const uri = service.getPluginSourceInstallUri({
            kind: "github" /* PluginSourceKind.GitHub */,
            repo: 'owner/repo',
            ref: 'release/v1',
        });
        assert.strictEqual(uri.path, '/cache/agentPlugins/github.com/owner/repo/ref_release_v1');
    });
    test('updates git plugin source by pulling and checking out requested revision', async () => {
        const commands = [];
        const service = createService(async () => true, (id) => {
            commands.push(id);
        });
        await service.updatePluginSource({
            name: 'my-plugin',
            description: '',
            version: '',
            source: '',
            sourceDescriptor: {
                kind: "github" /* PluginSourceKind.GitHub */,
                repo: 'owner/repo',
                sha: 'a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0',
            },
            marketplace: 'owner/repo',
            marketplaceReference: parseMarketplaceReference('owner/repo'),
            marketplaceType: "copilot" /* MarketplaceType.Copilot */,
        }, {
            pluginName: 'my-plugin',
            failureLabel: 'my-plugin',
            marketplaceType: "copilot" /* MarketplaceType.Copilot */,
        });
        assert.deepStrictEqual(commands, ['git.openRepository', '_git.revParse', 'git.fetch', '_git.checkout', '_git.revParse']);
    });
    // =========================================================================
    // cleanupPluginSource — issue #297251 regression
    // =========================================================================
    suite('cleanupPluginSource', () => {
        function createServiceWithDel(onDel, options) {
            const instantiationService = store.add(new TestInstantiationService());
            instantiationService.stub(ICommandService, { executeCommand: async () => undefined });
            instantiationService.stub(IEnvironmentService, { cacheHome: URI.file('/cache') });
            instantiationService.stub(IFileService, {
                exists: async () => true,
                del: async (resource) => { onDel(resource); },
                createFolder: async () => undefined,
                resolve: async (resource) => options?.resolve?.(resource) ?? { children: [] },
            });
            instantiationService.stub(ILogService, new NullLogService());
            instantiationService.stub(INotificationService, { notify: () => undefined });
            instantiationService.stub(IProgressService, { withProgress: async (_o, cb) => cb() });
            instantiationService.stub(IStorageService, store.add(new InMemoryStorageService()));
            return instantiationService.createInstance(AgentPluginRepositoryService);
        }
        test('does not delete files for relative-path (marketplace) plugin', async () => {
            const deleted = [];
            const service = createServiceWithDel(r => deleted.push(r.path));
            await service.cleanupPluginSource({
                name: 'marketplace-plugin',
                description: '',
                version: '',
                source: 'plugins/foo',
                sourceDescriptor: { kind: "relativePath" /* PluginSourceKind.RelativePath */, path: 'plugins/foo' },
                marketplace: 'microsoft/vscode',
                marketplaceReference: parseMarketplaceReference('microsoft/vscode'),
                marketplaceType: "copilot" /* MarketplaceType.Copilot */,
            });
            assert.strictEqual(deleted.length, 0);
        });
        test('deletes cache for github plugin source', async () => {
            const deleted = [];
            const service = createServiceWithDel(r => deleted.push(r.path));
            await service.cleanupPluginSource({
                name: 'gh-plugin',
                description: '',
                version: '',
                source: '',
                sourceDescriptor: { kind: "github" /* PluginSourceKind.GitHub */, repo: 'owner/repo' },
                marketplace: 'owner/marketplace',
                marketplaceReference: parseMarketplaceReference('owner/marketplace'),
                marketplaceType: "copilot" /* MarketplaceType.Copilot */,
            });
            assert.ok(deleted.length >= 1);
            assert.ok(deleted[0].includes('github.com/owner/repo'));
        });
        test('deletes parent cache dir for npm plugin source', async () => {
            const deleted = [];
            const service = createServiceWithDel(r => deleted.push(r.path));
            await service.cleanupPluginSource({
                name: 'npm-plugin',
                description: '',
                version: '',
                source: '',
                sourceDescriptor: { kind: "npm" /* PluginSourceKind.Npm */, package: '@acme/plugin' },
                marketplace: 'owner/marketplace',
                marketplaceReference: parseMarketplaceReference('owner/marketplace'),
                marketplaceType: "copilot" /* MarketplaceType.Copilot */,
            });
            assert.ok(deleted.length >= 1);
            // First delete should be the npm/<sanitized-package> cache dir
            assert.ok(deleted[0].includes('/npm/'), `Expected npm path, got: ${deleted[0]}`);
        });
        test('deletes cache for pip plugin source', async () => {
            const deleted = [];
            const service = createServiceWithDel(r => deleted.push(r.path));
            await service.cleanupPluginSource({
                name: 'pip-plugin',
                description: '',
                version: '',
                source: '',
                sourceDescriptor: { kind: "pip" /* PluginSourceKind.Pip */, package: 'my-pip-pkg' },
                marketplace: 'owner/marketplace',
                marketplaceReference: parseMarketplaceReference('owner/marketplace'),
                marketplaceType: "copilot" /* MarketplaceType.Copilot */,
            });
            assert.ok(deleted.length >= 1);
            assert.ok(deleted[0].includes('pip/my-pip-pkg'));
        });
        test('does not throw when delete fails', async () => {
            const instantiationService = store.add(new TestInstantiationService());
            instantiationService.stub(ICommandService, { executeCommand: async () => undefined });
            instantiationService.stub(IEnvironmentService, { cacheHome: URI.file('/cache') });
            instantiationService.stub(IFileService, {
                exists: async () => true,
                del: async () => { throw new Error('permission denied'); },
                createFolder: async () => undefined,
                resolve: async () => ({ children: [] }),
            });
            instantiationService.stub(ILogService, new NullLogService());
            instantiationService.stub(INotificationService, { notify: () => undefined });
            instantiationService.stub(IProgressService, { withProgress: async (_o, cb) => cb() });
            instantiationService.stub(IStorageService, store.add(new InMemoryStorageService()));
            const service = instantiationService.createInstance(AgentPluginRepositoryService);
            // Should not throw — cleanup is best-effort
            await service.cleanupPluginSource({
                name: 'gh-plugin',
                description: '',
                version: '',
                source: '',
                sourceDescriptor: { kind: "github" /* PluginSourceKind.GitHub */, repo: 'owner/repo' },
                marketplace: 'owner/marketplace',
                marketplaceReference: parseMarketplaceReference('owner/marketplace'),
                marketplaceType: "copilot" /* MarketplaceType.Copilot */,
            });
        });
        test('prunes empty parent directories up to cache root', async () => {
            // After deleting github.com/owner/repo, the "owner" dir is empty
            // and should also be removed.
            const deleted = [];
            const service = createServiceWithDel(r => deleted.push(r.path), { resolve: () => ({ children: [] }) });
            await service.cleanupPluginSource({
                name: 'gh-plugin',
                description: '',
                version: '',
                source: '',
                sourceDescriptor: { kind: "github" /* PluginSourceKind.GitHub */, repo: 'owner/repo' },
                marketplace: 'owner/marketplace',
                marketplaceReference: parseMarketplaceReference('owner/marketplace'),
                marketplaceType: "copilot" /* MarketplaceType.Copilot */,
            });
            // Should have deleted the repo dir + empty parents (owner, github.com)
            assert.ok(deleted.length >= 2, `Expected at least 2 deletions (repo + parent), got ${deleted.length}: ${deleted.join(', ')}`);
            assert.ok(deleted[0].includes('github.com/owner/repo'), 'First delete should be the repo dir');
            assert.ok(deleted.some(p => p.endsWith('/owner')), 'Should prune empty owner directory');
        });
        test('stops pruning at non-empty parent', async () => {
            const deleted = [];
            const service = createServiceWithDel(r => deleted.push(r.path), {
                resolve: (resource) => {
                    // owner dir still has another repo
                    if (resource.path.endsWith('/owner')) {
                        return { children: [{ name: 'other-repo' }] };
                    }
                    return { children: [] };
                },
            });
            await service.cleanupPluginSource({
                name: 'gh-plugin',
                description: '',
                version: '',
                source: '',
                sourceDescriptor: { kind: "github" /* PluginSourceKind.GitHub */, repo: 'owner/repo' },
                marketplace: 'owner/marketplace',
                marketplaceReference: parseMarketplaceReference('owner/marketplace'),
                marketplaceType: "copilot" /* MarketplaceType.Copilot */,
            });
            // Should only delete the repo dir, stop at non-empty owner dir
            assert.strictEqual(deleted.length, 1);
            assert.ok(deleted[0].includes('github.com/owner/repo'));
        });
    });
});
//# sourceMappingURL=agentPluginRepositoryService.test.js.map