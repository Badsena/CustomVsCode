/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { CancellationToken } from '../../../../../base/common/cancellation.js';
import { Event } from '../../../../../base/common/event.js';
import { DisposableStore } from '../../../../../base/common/lifecycle.js';
import { OS } from '../../../../../base/common/platform.js';
import { URI } from '../../../../../base/common/uri.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { IConfigurationService } from '../../../../../platform/configuration/common/configuration.js';
import { TestConfigurationService } from '../../../../../platform/configuration/test/common/testConfigurationService.js';
import { IWorkspaceContextService } from '../../../../../platform/workspace/common/workspace.js';
import { ConfigurationManager } from '../../browser/debugConfigurationManager.js';
import { DebugConfigurationProviderTriggerKind } from '../../common/debug.js';
import { IPreferencesService } from '../../../../services/preferences/common/preferences.js';
import { IRemoteAgentService } from '../../../../services/remote/common/remoteAgentService.js';
import { TestRemoteAgentService, workbenchInstantiationService } from '../../../../test/browser/workbenchTestServices.js';
import { TestContextService } from '../../../../test/common/workbenchTestServices.js';
suite('debugConfigurationManager', () => {
    const configurationProviderType = 'custom-type';
    let _debugConfigurationManager;
    let disposables;
    let instantiationService;
    let contextService;
    const adapterManager = {
        getDebugAdapterDescriptor(session, config) {
            return Promise.resolve(undefined);
        },
        activateDebuggers(activationEvent, debugType) {
            return Promise.resolve();
        },
        get onDidDebuggersExtPointRead() {
            return Event.None;
        }
    };
    const preferencesService = {
        userSettingsResource: URI.file('/tmp/settings.json')
    };
    const configurationService = new TestConfigurationService();
    let remoteAgentService;
    function createConfigurationManager() {
        instantiationService.stub(IWorkspaceContextService, contextService);
        instantiationService.stub(IConfigurationService, configurationService);
        instantiationService.stub(IRemoteAgentService, remoteAgentService);
        instantiationService.stub(IPreferencesService, preferencesService);
        return disposables.add(instantiationService.createInstance(ConfigurationManager, adapterManager));
    }
    setup(() => {
        disposables = new DisposableStore();
        instantiationService = workbenchInstantiationService(undefined, disposables);
        contextService = new TestContextService();
        remoteAgentService = new TestRemoteAgentService();
        _debugConfigurationManager = createConfigurationManager();
    });
    teardown(() => disposables.dispose());
    ensureNoDisposablesAreLeakedInTestSuite();
    test('resolves configuration based on type', async () => {
        disposables.add(_debugConfigurationManager.registerDebugConfigurationProvider({
            type: configurationProviderType,
            resolveDebugConfiguration: (folderUri, config, token) => {
                assert.strictEqual(config.type, configurationProviderType);
                return Promise.resolve({
                    ...config,
                    configurationResolved: true
                });
            },
            triggerKind: DebugConfigurationProviderTriggerKind.Initial
        }));
        const initialConfig = {
            type: configurationProviderType,
            request: 'launch',
            name: 'configName',
        };
        const resultConfig = await _debugConfigurationManager.resolveConfigurationByProviders(undefined, configurationProviderType, initialConfig, CancellationToken.None);
        // eslint-disable-next-line local/code-no-any-casts
        assert.strictEqual(resultConfig.configurationResolved, true, 'Configuration should be updated by test provider');
    });
    test('resolves configuration from second provider if type changes', async () => {
        const secondProviderType = 'second-provider';
        disposables.add(_debugConfigurationManager.registerDebugConfigurationProvider({
            type: configurationProviderType,
            resolveDebugConfiguration: (folderUri, config, token) => {
                assert.strictEqual(config.type, configurationProviderType);
                return Promise.resolve({
                    ...config,
                    type: secondProviderType
                });
            },
            triggerKind: DebugConfigurationProviderTriggerKind.Initial
        }));
        disposables.add(_debugConfigurationManager.registerDebugConfigurationProvider({
            type: secondProviderType,
            resolveDebugConfiguration: (folderUri, config, token) => {
                assert.strictEqual(config.type, secondProviderType);
                return Promise.resolve({
                    ...config,
                    configurationResolved: true
                });
            },
            triggerKind: DebugConfigurationProviderTriggerKind.Initial
        }));
        const initialConfig = {
            type: configurationProviderType,
            request: 'launch',
            name: 'configName',
        };
        const resultConfig = await _debugConfigurationManager.resolveConfigurationByProviders(undefined, configurationProviderType, initialConfig, CancellationToken.None);
        assert.strictEqual(resultConfig.type, secondProviderType);
        // eslint-disable-next-line local/code-no-any-casts
        assert.strictEqual(resultConfig.configurationResolved, true, 'Configuration should be updated by test provider');
    });
    test('uses remote target OS when computing visible configurations', async () => {
        class LinuxRemoteAgentService extends TestRemoteAgentService {
            async getEnvironment() {
                return {
                    pid: 1,
                    connectionToken: 'token',
                    appRoot: URI.file('/remote/app'),
                    tmpDir: URI.file('/remote/tmp'),
                    settingsPath: URI.file('/remote/settings.json'),
                    mcpResource: URI.file('/remote/mcp.json'),
                    logsPath: URI.file('/remote/logs'),
                    extensionHostLogsPath: URI.file('/remote/ext-logs'),
                    globalStorageHome: URI.file('/remote/global-storage'),
                    workspaceStorageHome: URI.file('/remote/workspace-storage'),
                    localHistoryHome: URI.file('/remote/local-history'),
                    userHome: URI.file('/remote/home'),
                    os: 3 /* OperatingSystem.Linux */,
                    arch: 'x64',
                    marks: [],
                    useHostProxy: false,
                    profiles: {
                        all: [],
                        home: URI.file('/remote/profiles')
                    },
                    isUnsupportedGlibc: false
                };
            }
        }
        remoteAgentService = new LinuxRemoteAgentService();
        contextService = new TestContextService();
        configurationService.setUserConfiguration('launch', {
            version: '0.2.0',
            configurations: [
                { type: 'node', request: 'launch', name: 'visible', presentation: { hidden: false } },
                { type: 'node', request: 'launch', name: 'linux-hidden', linux: { presentation: { hidden: true } } }
            ]
        });
        disposables.delete(_debugConfigurationManager);
        _debugConfigurationManager = createConfigurationManager();
        if (OS !== 3 /* OperatingSystem.Linux */) {
            await Event.toPromise(_debugConfigurationManager.onDidSelectConfiguration);
        }
        assert.deepStrictEqual(_debugConfigurationManager.getAllConfigurations().map(({ name }) => name), ['visible']);
    });
    teardown(() => disposables.clear());
});
//# sourceMappingURL=debugConfigurationManager.test.js.map