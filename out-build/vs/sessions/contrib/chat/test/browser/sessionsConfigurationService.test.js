/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { DisposableStore } from '../../../../../base/common/lifecycle.js';
import { URI } from '../../../../../base/common/uri.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { mock } from '../../../../../base/test/common/mock.js';
import { TestInstantiationService } from '../../../../../platform/instantiation/test/common/instantiationServiceMock.js';
import { IFileService } from '../../../../../platform/files/common/files.js';
import { InMemoryStorageService, IStorageService } from '../../../../../platform/storage/common/storage.js';
import { IJSONEditingService } from '../../../../../workbench/services/configuration/common/jsonEditing.js';
import { IPreferencesService } from '../../../../../workbench/services/preferences/common/preferences.js';
import { ITerminalService } from '../../../../../workbench/contrib/terminal/browser/terminal.js';
import { ISessionsManagementService } from '../../../sessions/browser/sessionsManagementService.js';
import { SessionsConfigurationService } from '../../browser/sessionsConfigurationService.js';
import { VSBuffer } from '../../../../../base/common/buffer.js';
import { observableValue } from '../../../../../base/common/observable.js';
function makeSession(opts = {}) {
    return {
        resource: URI.parse('file:///session'),
        isUntitled: false,
        label: 'session',
        repository: opts.repository,
        worktree: opts.worktree,
        worktreeBranchName: undefined,
        providerType: 'background',
    };
}
function makeTask(label, command, inSessions) {
    return { label, type: 'shell', command: command ?? label, inSessions };
}
function makeNpmTask(label, script, inSessions) {
    return { label, type: 'npm', script, inSessions };
}
function makeUnsupportedTask(label, inSessions) {
    return { label, type: 'gulp', command: label, inSessions };
}
function tasksJsonContent(tasks) {
    return JSON.stringify({ version: '2.0.0', tasks });
}
suite('SessionsConfigurationService', () => {
    const store = new DisposableStore();
    let service;
    let fileContents;
    let jsonEdits;
    let createdTerminals;
    let sentCommands;
    let committedFiles;
    let storageService;
    let readFileCalls;
    let activeSessionObs;
    const userSettingsUri = URI.parse('file:///user/settings.json');
    const repoUri = URI.parse('file:///repo');
    const worktreeUri = URI.parse('file:///worktree');
    setup(() => {
        fileContents = new Map();
        jsonEdits = [];
        createdTerminals = [];
        sentCommands = [];
        committedFiles = [];
        readFileCalls = [];
        const instantiationService = store.add(new TestInstantiationService());
        activeSessionObs = observableValue('activeSession', undefined);
        instantiationService.stub(IFileService, new class extends mock() {
            constructor() {
                super(...arguments);
                this.onDidFilesChange = () => ({ dispose() { } });
            }
            async readFile(resource) {
                readFileCalls.push(resource);
                const content = fileContents.get(resource.toString());
                if (content === undefined) {
                    throw new Error('file not found');
                }
                return { value: VSBuffer.fromString(content) };
            }
            watch() { return { dispose() { } }; }
        });
        instantiationService.stub(IJSONEditingService, new class extends mock() {
            async write(resource, values, _save) {
                jsonEdits.push({ uri: resource, values });
            }
        });
        instantiationService.stub(IPreferencesService, new class extends mock() {
            constructor() {
                super(...arguments);
                this.userSettingsResource = userSettingsUri;
            }
        });
        let nextInstanceId = 1;
        const terminalInstances = [];
        const terminalServiceMock = new class extends mock() {
            get instances() { return terminalInstances; }
            async createTerminal(opts) {
                const instance = {
                    instanceId: nextInstanceId++,
                    initialCwd: opts?.cwd?.fsPath,
                    cwd: opts?.cwd?.fsPath,
                    hasChildProcesses: false,
                    sendText: async (text) => { sentCommands.push({ command: text }); },
                };
                createdTerminals.push({ name: opts?.config?.name, cwd: opts?.cwd });
                terminalInstances.push(instance);
                return instance;
            }
            setActiveInstance() { }
            async revealActiveTerminal() { }
        };
        instantiationService.stub(ITerminalService, terminalServiceMock);
        instantiationService.stub(ISessionsManagementService, new class extends mock() {
            constructor() {
                super(...arguments);
                this.activeSession = activeSessionObs;
            }
            async commitWorktreeFiles(session, fileUris) { committedFiles.push({ session, fileUris }); }
        });
        storageService = store.add(new InMemoryStorageService());
        instantiationService.stub(IStorageService, storageService);
        service = store.add(instantiationService.createInstance(SessionsConfigurationService));
    });
    teardown(() => {
        store.clear();
    });
    ensureNoDisposablesAreLeakedInTestSuite();
    // --- getSessionTasks ---
    test('getSessionTasks returns tasks with inSessions: true from worktree', async () => {
        const worktreeTasksUri = URI.parse('file:///worktree/.vscode/tasks.json');
        fileContents.set(worktreeTasksUri.toString(), tasksJsonContent([
            makeTask('build', 'npm run build', true),
            makeTask('lint', 'npm run lint', false),
            makeTask('test', 'npm test', true),
            makeNpmTask('watch', 'watch', true),
            makeUnsupportedTask('gulp-task', true),
        ]));
        // user tasks.json — empty
        const userTasksUri = URI.from({ scheme: userSettingsUri.scheme, path: '/user/tasks.json' });
        fileContents.set(userTasksUri.toString(), tasksJsonContent([]));
        const session = makeSession({ worktree: worktreeUri, repository: repoUri });
        const obs = service.getSessionTasks(session);
        // Let async refresh settle
        await new Promise(r => setTimeout(r, 10));
        const tasks = obs.get();
        assert.deepStrictEqual(tasks.map(t => t.task.label), ['build', 'test', 'watch']);
    });
    test('getSessionTasks returns empty array when no worktree', async () => {
        const session = makeSession({ repository: repoUri });
        const obs = service.getSessionTasks(session);
        await new Promise(r => setTimeout(r, 10));
        assert.deepStrictEqual(obs.get(), []);
    });
    test('getSessionTasks reads from repository when no worktree', async () => {
        const repoTasksUri = URI.parse('file:///repo/.vscode/tasks.json');
        fileContents.set(repoTasksUri.toString(), tasksJsonContent([
            makeTask('serve', 'npm run serve', true),
            makeTask('lint', 'npm run lint', false),
        ]));
        const userTasksUri = URI.from({ scheme: userSettingsUri.scheme, path: '/user/tasks.json' });
        fileContents.set(userTasksUri.toString(), tasksJsonContent([]));
        const session = makeSession({ repository: repoUri });
        const obs = service.getSessionTasks(session);
        await new Promise(r => setTimeout(r, 10));
        assert.deepStrictEqual(obs.get().map(t => t.task.label), ['serve']);
    });
    test('getSessionTasks does not re-read files on repeated calls for the same folder', async () => {
        const worktreeTasksUri = URI.parse('file:///worktree/.vscode/tasks.json');
        const userTasksUri = URI.from({ scheme: userSettingsUri.scheme, path: '/user/tasks.json' });
        fileContents.set(worktreeTasksUri.toString(), tasksJsonContent([
            makeTask('build', 'npm run build', true),
        ]));
        fileContents.set(userTasksUri.toString(), tasksJsonContent([]));
        const session = makeSession({ worktree: worktreeUri, repository: repoUri });
        // Call getSessionTasks multiple times for the same session/folder
        service.getSessionTasks(session);
        service.getSessionTasks(session);
        service.getSessionTasks(session);
        await new Promise(r => setTimeout(r, 10));
        // _refreshSessionTasks reads two files (workspace + user tasks.json).
        // If refresh triggered more than once, we'd see > 2 reads.
        assert.strictEqual(readFileCalls.length, 2, 'should read files only once (no duplicate refresh)');
    });
    // --- getNonSessionTasks ---
    test('getNonSessionTasks returns only tasks without inSessions and with supported types', async () => {
        const worktreeTasksUri = URI.parse('file:///worktree/.vscode/tasks.json');
        fileContents.set(worktreeTasksUri.toString(), tasksJsonContent([
            makeTask('build', 'npm run build', true),
            makeTask('lint', 'npm run lint', false),
            makeTask('test', 'npm test'),
            makeNpmTask('watch', 'watch', false),
            makeUnsupportedTask('gulp-task', false),
        ]));
        const userTasksUri = URI.from({ scheme: userSettingsUri.scheme, path: '/user/tasks.json' });
        fileContents.set(userTasksUri.toString(), tasksJsonContent([]));
        const session = makeSession({ worktree: worktreeUri, repository: repoUri });
        const nonSessionTasks = await service.getNonSessionTasks(session);
        assert.deepStrictEqual(nonSessionTasks.map(t => t.task.label), ['lint', 'test', 'watch']);
    });
    test('getNonSessionTasks reads from repository when no worktree', async () => {
        const repoTasksUri = URI.parse('file:///repo/.vscode/tasks.json');
        fileContents.set(repoTasksUri.toString(), tasksJsonContent([
            makeTask('build', 'npm run build', true),
            makeTask('lint', 'npm run lint', false),
        ]));
        const userTasksUri = URI.from({ scheme: userSettingsUri.scheme, path: '/user/tasks.json' });
        fileContents.set(userTasksUri.toString(), tasksJsonContent([]));
        const session = makeSession({ repository: repoUri });
        const nonSessionTasks = await service.getNonSessionTasks(session);
        assert.deepStrictEqual(nonSessionTasks.map(t => t.task.label), ['lint']);
    });
    test('getNonSessionTasks preserves the source target for workspace and user tasks', async () => {
        const worktreeTasksUri = URI.parse('file:///worktree/.vscode/tasks.json');
        const userTasksUri = URI.from({ scheme: userSettingsUri.scheme, path: '/user/tasks.json' });
        fileContents.set(worktreeTasksUri.toString(), tasksJsonContent([
            makeTask('workspaceTask', 'npm run workspace'),
        ]));
        fileContents.set(userTasksUri.toString(), tasksJsonContent([
            makeTask('userTask', 'npm run user'),
        ]));
        const session = makeSession({ worktree: worktreeUri, repository: repoUri });
        const nonSessionTasks = await service.getNonSessionTasks(session);
        assert.deepStrictEqual(nonSessionTasks, [
            { task: { label: 'workspaceTask', type: 'shell', command: 'npm run workspace' }, target: 'workspace' },
            { task: { label: 'userTask', type: 'shell', command: 'npm run user' }, target: 'user' },
        ]);
    });
    // --- addTaskToSessions ---
    test('addTaskToSessions writes inSessions: true to the matching task index', async () => {
        const worktreeTasksUri = URI.parse('file:///worktree/.vscode/tasks.json');
        fileContents.set(worktreeTasksUri.toString(), tasksJsonContent([
            makeTask('build', 'npm run build'),
            makeTask('test', 'npm test'),
        ]));
        const session = makeSession({ worktree: worktreeUri, repository: repoUri });
        const task = makeTask('test', 'npm test');
        await service.addTaskToSessions(task, session, 'workspace');
        assert.strictEqual(jsonEdits.length, 1);
        assert.deepStrictEqual(jsonEdits[0].values, [{ path: ['tasks', 1, 'inSessions'], value: true }]);
        assert.strictEqual(committedFiles.length, 1);
        assert.strictEqual(committedFiles[0].fileUris[0].path, '/worktree/.vscode/tasks.json');
    });
    test('addTaskToSessions does nothing when task label not found', async () => {
        const worktreeTasksUri = URI.parse('file:///worktree/.vscode/tasks.json');
        fileContents.set(worktreeTasksUri.toString(), tasksJsonContent([
            makeTask('build', 'npm run build'),
        ]));
        const session = makeSession({ worktree: worktreeUri, repository: repoUri });
        await service.addTaskToSessions(makeTask('nonexistent'), session, 'workspace');
        assert.strictEqual(jsonEdits.length, 0);
    });
    test('addTaskToSessions writes to repository and does not commit when no worktree', async () => {
        const repoTasksUri = URI.parse('file:///repo/.vscode/tasks.json');
        fileContents.set(repoTasksUri.toString(), tasksJsonContent([
            makeTask('build', 'npm run build'),
            makeTask('test', 'npm test'),
        ]));
        const session = makeSession({ repository: repoUri });
        await service.addTaskToSessions(makeTask('test', 'npm test'), session, 'workspace');
        assert.strictEqual(jsonEdits.length, 1);
        assert.strictEqual(jsonEdits[0].uri.toString(), repoTasksUri.toString());
        assert.deepStrictEqual(jsonEdits[0].values, [{ path: ['tasks', 1, 'inSessions'], value: true }]);
        assert.strictEqual(committedFiles.length, 0, 'should not commit when there is no worktree');
    });
    test('addTaskToSessions updates runOptions when provided', async () => {
        const worktreeTasksUri = URI.parse('file:///worktree/.vscode/tasks.json');
        fileContents.set(worktreeTasksUri.toString(), tasksJsonContent([
            makeTask('build', 'npm run build'),
        ]));
        const session = makeSession({ worktree: worktreeUri, repository: repoUri });
        await service.addTaskToSessions(makeTask('build', 'npm run build'), session, 'workspace', { runOn: 'worktreeCreated' });
        assert.deepStrictEqual(jsonEdits[0].values, [
            { path: ['tasks', 0, 'inSessions'], value: true },
            { path: ['tasks', 0, 'runOptions'], value: { runOn: 'worktreeCreated' } },
        ]);
    });
    test('addTaskToSessions clears runOptions when default is requested', async () => {
        const worktreeTasksUri = URI.parse('file:///worktree/.vscode/tasks.json');
        fileContents.set(worktreeTasksUri.toString(), tasksJsonContent([
            { ...makeTask('build', 'npm run build'), runOptions: { runOn: 'worktreeCreated' } },
        ]));
        const session = makeSession({ worktree: worktreeUri, repository: repoUri });
        await service.addTaskToSessions(makeTask('build', 'npm run build'), session, 'workspace', { runOn: 'default' });
        assert.deepStrictEqual(jsonEdits[0].values, [
            { path: ['tasks', 0, 'inSessions'], value: true },
            { path: ['tasks', 0, 'runOptions'], value: undefined },
        ]);
    });
    // --- createAndAddTask ---
    test('createAndAddTask writes new task with inSessions: true', async () => {
        const worktreeTasksUri = URI.parse('file:///worktree/.vscode/tasks.json');
        fileContents.set(worktreeTasksUri.toString(), tasksJsonContent([
            makeTask('existing', 'echo hi'),
        ]));
        const session = makeSession({ worktree: worktreeUri, repository: repoUri });
        await service.createAndAddTask(undefined, 'npm run dev', session, 'workspace');
        assert.strictEqual(jsonEdits.length, 1);
        const edit = jsonEdits[0];
        assert.strictEqual(edit.uri.toString(), worktreeTasksUri.toString());
        const tasksValue = edit.values.find(v => v.path[0] === 'tasks');
        assert.ok(tasksValue);
        const tasks = tasksValue.value;
        assert.strictEqual(tasks.length, 2);
        assert.strictEqual(tasks[1].label, 'npm run dev');
        assert.strictEqual(tasks[1].inSessions, true);
        assert.strictEqual(committedFiles.length, 1);
        assert.strictEqual(committedFiles[0].fileUris[0].path, '/worktree/.vscode/tasks.json');
    });
    test('createAndAddTask writes to repository and does not commit when no worktree', async () => {
        const repoTasksUri = URI.parse('file:///repo/.vscode/tasks.json');
        fileContents.set(repoTasksUri.toString(), tasksJsonContent([
            makeTask('existing', 'echo hi'),
        ]));
        const session = makeSession({ repository: repoUri });
        await service.createAndAddTask(undefined, 'npm run dev', session, 'workspace');
        assert.strictEqual(jsonEdits.length, 1);
        assert.strictEqual(jsonEdits[0].uri.toString(), repoTasksUri.toString());
        const tasksValue = jsonEdits[0].values.find(v => v.path[0] === 'tasks');
        assert.ok(tasksValue);
        const tasks = tasksValue.value;
        assert.strictEqual(tasks.length, 2);
        assert.strictEqual(tasks[1].label, 'npm run dev');
        assert.strictEqual(tasks[1].inSessions, true);
        assert.strictEqual(committedFiles.length, 0, 'should not commit when there is no worktree');
    });
    test('createAndAddTask writes worktreeCreated run option when requested', async () => {
        const worktreeTasksUri = URI.parse('file:///worktree/.vscode/tasks.json');
        fileContents.set(worktreeTasksUri.toString(), tasksJsonContent([]));
        const session = makeSession({ worktree: worktreeUri, repository: repoUri });
        await service.createAndAddTask(undefined, 'npm run dev', session, 'workspace', { runOn: 'worktreeCreated' });
        assert.strictEqual(jsonEdits.length, 1);
        const tasksValue = jsonEdits[0].values.find(v => v.path[0] === 'tasks');
        assert.ok(tasksValue);
        const tasks = tasksValue.value;
        assert.deepStrictEqual(tasks[0].runOptions, { runOn: 'worktreeCreated' });
    });
    test('createAndAddTask writes a custom label when provided', async () => {
        const worktreeTasksUri = URI.parse('file:///worktree/.vscode/tasks.json');
        fileContents.set(worktreeTasksUri.toString(), tasksJsonContent([]));
        const session = makeSession({ worktree: worktreeUri, repository: repoUri });
        await service.createAndAddTask('Start Dev Server', 'npm run dev', session, 'workspace');
        assert.strictEqual(jsonEdits.length, 1);
        const tasksValue = jsonEdits[0].values.find(v => v.path[0] === 'tasks');
        assert.ok(tasksValue);
        const tasks = tasksValue.value;
        assert.strictEqual(tasks[0].label, 'Start Dev Server');
        assert.strictEqual(tasks[0].command, 'npm run dev');
    });
    // --- removeTask ---
    test('removeTask deletes the matching task entry', async () => {
        const worktreeTasksUri = URI.parse('file:///worktree/.vscode/tasks.json');
        fileContents.set(worktreeTasksUri.toString(), tasksJsonContent([
            makeTask('build', 'npm run build', true),
            makeTask('test', 'npm test', true),
            makeTask('lint', 'npm run lint'),
        ]));
        const session = makeSession({ worktree: worktreeUri, repository: repoUri });
        await service.removeTask('test', session, 'workspace');
        assert.strictEqual(jsonEdits.length, 1);
        assert.deepStrictEqual(jsonEdits[0].values, [{
                path: ['tasks'],
                value: [
                    makeTask('build', 'npm run build', true),
                    { label: 'lint', type: 'shell', command: 'npm run lint' },
                ],
            }]);
        assert.strictEqual(committedFiles.length, 1);
        assert.strictEqual(committedFiles[0].fileUris[0].path, '/worktree/.vscode/tasks.json');
    });
    // --- updateTask ---
    test('updateTask replaces an existing task in place', async () => {
        const worktreeTasksUri = URI.parse('file:///worktree/.vscode/tasks.json');
        fileContents.set(worktreeTasksUri.toString(), tasksJsonContent([
            makeTask('build', 'npm run build', true),
            makeTask('test', 'npm test', true),
        ]));
        const session = makeSession({ worktree: worktreeUri, repository: repoUri });
        await service.updateTask('test', {
            label: 'Test Changed',
            type: 'shell',
            command: 'pnpm test',
            inSessions: true,
            runOptions: { runOn: 'worktreeCreated' }
        }, session, 'workspace', 'workspace');
        assert.strictEqual(jsonEdits.length, 1);
        assert.deepStrictEqual(jsonEdits[0].values, [{
                path: ['tasks', 1],
                value: {
                    label: 'Test Changed',
                    type: 'shell',
                    command: 'pnpm test',
                    inSessions: true,
                    runOptions: { runOn: 'worktreeCreated' }
                }
            }]);
        assert.strictEqual(committedFiles.length, 1);
    });
    test('updateTask moves a task between workspace and user storage', async () => {
        const worktreeTasksUri = URI.parse('file:///worktree/.vscode/tasks.json');
        const userTasksUri = URI.from({ scheme: userSettingsUri.scheme, path: '/user/tasks.json' });
        fileContents.set(worktreeTasksUri.toString(), tasksJsonContent([
            makeTask('build', 'npm run build', true),
        ]));
        fileContents.set(userTasksUri.toString(), tasksJsonContent([
            makeTask('userExisting', 'npm run user', true),
        ]));
        const session = makeSession({ worktree: worktreeUri, repository: repoUri });
        await service.updateTask('build', {
            label: 'Build Changed',
            type: 'shell',
            command: 'pnpm build',
            inSessions: true,
        }, session, 'workspace', 'user');
        assert.strictEqual(jsonEdits.length, 2);
        assert.deepStrictEqual(jsonEdits[0], {
            uri: worktreeTasksUri,
            values: [{
                    path: ['tasks'],
                    value: []
                }]
        });
        assert.deepStrictEqual(jsonEdits[1], {
            uri: userTasksUri,
            values: [
                { path: ['version'], value: '2.0.0' },
                {
                    path: ['tasks'],
                    value: [
                        makeTask('userExisting', 'npm run user', true),
                        {
                            label: 'Build Changed',
                            type: 'shell',
                            command: 'pnpm build',
                            inSessions: true,
                        }
                    ]
                }
            ]
        });
        assert.strictEqual(committedFiles.length, 1);
    });
    // --- pinned task ---
    test('getPinnedTaskLabel returns undefined when no task is pinned', () => {
        const obs = service.getPinnedTaskLabel(repoUri);
        assert.strictEqual(obs.get(), undefined);
    });
    test('setPinnedTaskLabel stores and clears the pinned task label', () => {
        const obs = service.getPinnedTaskLabel(repoUri);
        service.setPinnedTaskLabel(repoUri, 'build');
        assert.strictEqual(obs.get(), 'build');
        service.setPinnedTaskLabel(repoUri, undefined);
        assert.strictEqual(obs.get(), undefined);
    });
    test('updateTask keeps the pinned task in sync when the label changes', async () => {
        const worktreeTasksUri = URI.parse('file:///worktree/.vscode/tasks.json');
        fileContents.set(worktreeTasksUri.toString(), tasksJsonContent([
            makeTask('build', 'npm run build', true),
        ]));
        service.setPinnedTaskLabel(repoUri, 'build');
        const session = makeSession({ worktree: worktreeUri, repository: repoUri });
        await service.updateTask('build', {
            label: 'build:watch',
            type: 'shell',
            command: 'npm run watch',
            inSessions: true,
        }, session, 'workspace', 'workspace');
        assert.strictEqual(service.getPinnedTaskLabel(repoUri).get(), 'build:watch');
    });
    test('removeTask clears the pinned task when deleting the pinned entry', async () => {
        const worktreeTasksUri = URI.parse('file:///worktree/.vscode/tasks.json');
        fileContents.set(worktreeTasksUri.toString(), tasksJsonContent([
            makeTask('build', 'npm run build', true),
        ]));
        service.setPinnedTaskLabel(repoUri, 'build');
        const session = makeSession({ worktree: worktreeUri, repository: repoUri });
        await service.removeTask('build', session, 'workspace');
        assert.strictEqual(service.getPinnedTaskLabel(repoUri).get(), undefined);
    });
    // --- runTask ---
    test('runTask creates terminal and sends command', async () => {
        const session = makeSession({ worktree: worktreeUri, repository: repoUri });
        const task = makeTask('build', 'npm run build');
        await service.runTask(task, session);
        assert.strictEqual(createdTerminals.length, 1);
        assert.strictEqual(createdTerminals[0].name, 'build');
        assert.strictEqual(sentCommands.length, 1);
        assert.strictEqual(sentCommands[0].command, 'npm run build');
    });
    test('runTask resolves npm task to npm run <script>', async () => {
        const session = makeSession({ worktree: worktreeUri, repository: repoUri });
        const task = makeNpmTask('watch', 'watch');
        await service.runTask(task, session);
        assert.strictEqual(createdTerminals.length, 1);
        assert.strictEqual(createdTerminals[0].name, 'watch');
        assert.strictEqual(sentCommands.length, 1);
        assert.strictEqual(sentCommands[0].command, 'npm run watch');
    });
    test('runTask does nothing for npm task without script', async () => {
        const session = makeSession({ worktree: worktreeUri, repository: repoUri });
        const task = { label: 'broken', type: 'npm', inSessions: true };
        await service.runTask(task, session);
        assert.strictEqual(createdTerminals.length, 0);
        assert.strictEqual(sentCommands.length, 0);
    });
    test('runTask does nothing when no cwd available', async () => {
        const session = makeSession({ repository: undefined, worktree: undefined });
        await service.runTask(makeTask('build', 'npm run build'), session);
        assert.strictEqual(createdTerminals.length, 0);
        assert.strictEqual(sentCommands.length, 0);
    });
    test('runTask reuses the same terminal for the same command and worktree', async () => {
        const session = makeSession({ worktree: worktreeUri, repository: repoUri });
        const task = makeTask('build', 'npm run build');
        await service.runTask(task, session);
        await service.runTask(task, session);
        assert.strictEqual(createdTerminals.length, 1, 'should create only one terminal');
        assert.strictEqual(sentCommands.length, 2, 'should send command twice');
        assert.strictEqual(sentCommands[0].command, 'npm run build');
        assert.strictEqual(sentCommands[1].command, 'npm run build');
    });
    test('runTask creates different terminals for different commands', async () => {
        const session = makeSession({ worktree: worktreeUri, repository: repoUri });
        await service.runTask(makeTask('build', 'npm run build'), session);
        await service.runTask(makeTask('test', 'npm test'), session);
        assert.strictEqual(createdTerminals.length, 2, 'should create two terminals');
        assert.strictEqual(createdTerminals[0].name, 'build');
        assert.strictEqual(createdTerminals[1].name, 'test');
    });
    test('runTask appends args to shell command', async () => {
        const session = makeSession({ worktree: worktreeUri, repository: repoUri });
        const task = { label: 'build', type: 'shell', command: 'dotnet', args: ['build', '--configuration', 'Release'], inSessions: true };
        await service.runTask(task, session);
        assert.strictEqual(sentCommands.length, 1);
        assert.strictEqual(sentCommands[0].command, 'dotnet build --configuration Release');
    });
    test('runTask appends args to npm task', async () => {
        const session = makeSession({ worktree: worktreeUri, repository: repoUri });
        const task = { label: 'test', type: 'npm', script: 'test', args: ['--', '--coverage'], inSessions: true };
        await service.runTask(task, session);
        assert.strictEqual(sentCommands.length, 1);
        assert.strictEqual(sentCommands[0].command, 'npm run test -- --coverage');
    });
    test('runTask resolves CommandString objects in args', async () => {
        const session = makeSession({ worktree: worktreeUri, repository: repoUri });
        const task = {
            label: 'build', type: 'shell', command: 'gcc',
            args: [
                { value: '-o', quoting: 'escape' },
                'output.exe',
                'main.c',
            ],
            inSessions: true
        };
        await service.runTask(task, session);
        assert.strictEqual(sentCommands.length, 1);
        assert.strictEqual(sentCommands[0].command, 'gcc -o output.exe main.c');
    });
    test('runTask sends only command when args is empty', async () => {
        const session = makeSession({ worktree: worktreeUri, repository: repoUri });
        const task = { label: 'build', type: 'shell', command: 'make', args: [], inSessions: true };
        await service.runTask(task, session);
        assert.strictEqual(sentCommands.length, 1);
        assert.strictEqual(sentCommands[0].command, 'make');
    });
    test('runTask creates different terminals for same command in different worktrees', async () => {
        const wt1 = URI.parse('file:///worktree1');
        const wt2 = URI.parse('file:///worktree2');
        const session1 = makeSession({ worktree: wt1, repository: repoUri });
        const session2 = makeSession({ worktree: wt2, repository: repoUri });
        await service.runTask(makeTask('build', 'npm run build'), session1);
        await service.runTask(makeTask('build', 'npm run build'), session2);
        assert.strictEqual(createdTerminals.length, 2, 'should create two terminals for different worktrees');
    });
    test('runs worktreeCreated session tasks when a session gains a worktree', async () => {
        const sessionResource = URI.parse('file:///session-worktree-created');
        const worktreeTasksUri = URI.parse('file:///worktree/.vscode/tasks.json');
        const userTasksUri = URI.from({ scheme: userSettingsUri.scheme, path: '/user/tasks.json' });
        fileContents.set(worktreeTasksUri.toString(), tasksJsonContent([
            { label: 'build', type: 'shell', command: 'npm run build', inSessions: true, runOptions: { runOn: 'worktreeCreated' } },
            makeTask('manual', 'npm test', true),
        ]));
        fileContents.set(userTasksUri.toString(), tasksJsonContent([]));
        activeSessionObs.set({ ...makeSession({ repository: repoUri }), resource: sessionResource }, undefined);
        await new Promise(r => setTimeout(r, 10));
        activeSessionObs.set({ ...makeSession({ repository: repoUri, worktree: worktreeUri }), resource: sessionResource }, undefined);
        await new Promise(r => setTimeout(r, 10));
        assert.strictEqual(sentCommands.length, 1);
        assert.strictEqual(sentCommands[0].command, 'npm run build');
    });
});
//# sourceMappingURL=sessionsConfigurationService.test.js.map