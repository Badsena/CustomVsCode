/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { URI } from '../../../../../base/common/uri.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { TestInstantiationService } from '../../../../../platform/instantiation/test/common/instantiationServiceMock.js';
import { mock } from '../../../../../base/test/common/mock.js';
import { IHistoryService } from '../../../../services/history/common/history.js';
import { IExternalTerminalService } from '../../../../../platform/externalTerminal/electron-browser/externalTerminalService.js';
import { IConfigurationService } from '../../../../../platform/configuration/common/configuration.js';
import { TestConfigurationService } from '../../../../../platform/configuration/test/common/testConfigurationService.js';
import { IRemoteAuthorityResolverService } from '../../../../../platform/remote/common/remoteAuthorityResolver.js';
import { IWorkspaceContextService } from '../../../../../platform/workspace/common/workspace.js';
import { CommandsRegistry } from '../../../../../platform/commands/common/commands.js';
import { IQuickInputService } from '../../../../../platform/quickinput/common/quickInput.js';
import { ILabelService } from '../../../../../platform/label/common/label.js';
import '../../electron-browser/externalTerminal.contribution.js';
suite('ExternalTerminal contribution', () => {
    const store = ensureNoDisposablesAreLeakedInTestSuite();
    let instantiationService;
    let openTerminalCalls;
    let pickCalls;
    function createWorkspaceFolder(uri, name, index) {
        return {
            uri,
            name,
            index,
            toResource: (relativePath) => URI.joinPath(uri, relativePath)
        };
    }
    function setupServices(options) {
        instantiationService = store.add(new TestInstantiationService());
        openTerminalCalls = [];
        pickCalls = [];
        instantiationService.stub(IHistoryService, new class extends mock() {
            getLastActiveWorkspaceRoot() {
                return options.lastActiveRoot;
            }
            getLastActiveFile(_schemeFilter) {
                return options.lastActiveFile;
            }
        });
        instantiationService.stub(IExternalTerminalService, new class extends mock() {
            async openTerminal(_config, cwd) {
                openTerminalCalls.push({ cwd });
            }
        });
        instantiationService.stub(IConfigurationService, new TestConfigurationService({
            terminal: { external: { linuxExec: 'xterm', osxExec: 'Terminal.app', windowsExec: 'cmd' } }
        }));
        instantiationService.stub(IRemoteAuthorityResolverService, new class extends mock() {
        });
        instantiationService.stub(IWorkspaceContextService, new class extends mock() {
            getWorkspace() {
                return {
                    id: 'test-workspace',
                    folders: options.folders,
                };
            }
        });
        instantiationService.stub(IQuickInputService, new class extends mock() {
            async pick(picks) {
                pickCalls.push(picks);
                if (options.pickedFolder) {
                    const index = options.folders.indexOf(options.pickedFolder);
                    return picks[index];
                }
                return undefined;
            }
        });
        instantiationService.stub(ILabelService, new class extends mock() {
            getUriLabel(uri) {
                return uri.fsPath;
            }
        });
    }
    test('single folder - uses last active workspace root', async () => {
        const folderUri = URI.file('/workspace/project');
        const folder = createWorkspaceFolder(folderUri, 'project', 0);
        setupServices({
            folders: [folder],
            lastActiveRoot: folderUri,
        });
        const handler = CommandsRegistry.getCommand('workbench.action.terminal.openNativeConsole').handler;
        await instantiationService.invokeFunction(handler);
        assert.deepStrictEqual(openTerminalCalls, [{ cwd: folderUri.fsPath }]);
        assert.deepStrictEqual(pickCalls, []);
    });
    test('multiple folders - shows picker and opens selected folder', async () => {
        const folder1Uri = URI.file('/workspace/project1');
        const folder2Uri = URI.file('/workspace/project2');
        const folder1 = createWorkspaceFolder(folder1Uri, 'project1', 0);
        const folder2 = createWorkspaceFolder(folder2Uri, 'project2', 1);
        setupServices({
            folders: [folder1, folder2],
            pickedFolder: folder2,
        });
        const handler = CommandsRegistry.getCommand('workbench.action.terminal.openNativeConsole').handler;
        await instantiationService.invokeFunction(handler);
        assert.strictEqual(pickCalls.length, 1);
        assert.deepStrictEqual(openTerminalCalls, [{ cwd: folder2Uri.fsPath }]);
    });
    test('multiple folders - picker cancelled does not open terminal', async () => {
        const folder1Uri = URI.file('/workspace/project1');
        const folder2Uri = URI.file('/workspace/project2');
        const folder1 = createWorkspaceFolder(folder1Uri, 'project1', 0);
        const folder2 = createWorkspaceFolder(folder2Uri, 'project2', 1);
        setupServices({
            folders: [folder1, folder2],
            pickedFolder: undefined,
        });
        const handler = CommandsRegistry.getCommand('workbench.action.terminal.openNativeConsole').handler;
        await instantiationService.invokeFunction(handler);
        assert.strictEqual(pickCalls.length, 1);
        assert.deepStrictEqual(openTerminalCalls, []);
    });
    test('no workspace root - falls back to active file directory', async () => {
        const fileUri = URI.file('/workspace/project/src/file.ts');
        const expectedDir = URI.file('/workspace/project/src').fsPath;
        setupServices({
            folders: [],
            lastActiveRoot: undefined,
            lastActiveFile: fileUri,
        });
        const handler = CommandsRegistry.getCommand('workbench.action.terminal.openNativeConsole').handler;
        await instantiationService.invokeFunction(handler);
        assert.deepStrictEqual(openTerminalCalls, [{ cwd: expectedDir }]);
    });
    test('no workspace, no file - opens terminal without cwd', async () => {
        setupServices({
            folders: [],
            lastActiveRoot: undefined,
            lastActiveFile: undefined,
        });
        const handler = CommandsRegistry.getCommand('workbench.action.terminal.openNativeConsole').handler;
        await instantiationService.invokeFunction(handler);
        assert.deepStrictEqual(openTerminalCalls, [{ cwd: undefined }]);
    });
});
//# sourceMappingURL=externalTerminal.contribution.test.js.map