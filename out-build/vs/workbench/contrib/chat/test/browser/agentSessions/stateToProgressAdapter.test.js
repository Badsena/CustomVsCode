/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../../base/test/common/utils.js';
import { ToolDataSource } from '../../../common/tools/languageModelToolsService.js';
import { turnsToHistory, toolCallStateToInvocation, permissionToConfirmation, finalizeToolInvocation } from '../../../browser/agentSessions/agentHost/stateToProgressAdapter.js';
// ---- Helper factories -------------------------------------------------------
function createToolCallState(overrides) {
    return {
        toolCallId: 'tc-1',
        toolName: 'test_tool',
        displayName: 'Test Tool',
        invocationMessage: 'Running test tool...',
        status: "running" /* ToolCallStatus.Running */,
        confirmed: "not-needed" /* ToolCallConfirmationReason.NotNeeded */,
        ...overrides,
    };
}
function createCompletedToolCall(overrides) {
    return {
        status: "completed" /* ToolCallStatus.Completed */,
        toolCallId: 'tc-1',
        toolName: 'test_tool',
        displayName: 'Test Tool',
        invocationMessage: 'Running test tool...',
        success: true,
        confirmed: "not-needed" /* ToolCallConfirmationReason.NotNeeded */,
        pastTenseMessage: 'Ran test tool',
        ...overrides,
    };
}
function createTurn(overrides) {
    return {
        id: 'turn-1',
        userMessage: { text: 'Hello' },
        responseText: '',
        responseParts: [],
        toolCalls: [],
        usage: undefined,
        state: "complete" /* TurnState.Complete */,
        ...overrides,
    };
}
function createPermission(overrides) {
    return {
        requestId: 'perm-1',
        permissionKind: "shell" /* PermissionKind.Shell */,
        ...overrides,
    };
}
// ---- Tests ------------------------------------------------------------------
suite('stateToProgressAdapter', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    suite('turnsToHistory', () => {
        test('empty turns produces empty history', () => {
            const result = turnsToHistory([], 'p');
            assert.deepStrictEqual(result, []);
        });
        test('single turn produces request + response pair', () => {
            const turn = createTurn({
                userMessage: { text: 'Do something' },
                toolCalls: [createCompletedToolCall()],
            });
            const history = turnsToHistory([turn], 'participant-1');
            assert.strictEqual(history.length, 2);
            // Request
            assert.strictEqual(history[0].type, 'request');
            assert.strictEqual(history[0].prompt, 'Do something');
            assert.strictEqual(history[0].participant, 'participant-1');
            // Response
            assert.strictEqual(history[1].type, 'response');
            assert.strictEqual(history[1].participant, 'participant-1');
            assert.strictEqual(history[1].parts.length, 1);
            const serialized = history[1].parts[0];
            assert.strictEqual(serialized.kind, 'toolInvocationSerialized');
            assert.strictEqual(serialized.toolCallId, 'tc-1');
            assert.strictEqual(serialized.toolId, 'test_tool');
            assert.strictEqual(serialized.isComplete, true);
        });
        test('terminal tool call in history has correct terminal data', () => {
            const turn = createTurn({
                toolCalls: [createCompletedToolCall({
                        _meta: { toolKind: 'terminal', language: 'shellscript' },
                        toolInput: 'echo hello',
                        content: [{ type: "text" /* ToolResultContentType.Text */, text: 'hello' }],
                        success: true,
                    })],
            });
            const history = turnsToHistory([turn], 'p');
            const response = history[1];
            assert.strictEqual(response.type, 'response');
            if (response.type !== 'response') {
                return;
            }
            const serialized = response.parts[0];
            assert.ok(serialized.toolSpecificData);
            assert.strictEqual(serialized.toolSpecificData.kind, 'terminal');
            const termData = serialized.toolSpecificData;
            assert.strictEqual(termData.commandLine.original, 'echo hello');
            assert.strictEqual(termData.terminalCommandOutput.text, 'hello');
            assert.strictEqual(termData.terminalCommandState.exitCode, 0);
        });
        test('turn with responseText produces markdown content in history', () => {
            const turn = createTurn({
                responseText: 'Hello world',
            });
            const history = turnsToHistory([turn], 'p');
            assert.strictEqual(history.length, 2);
            const response = history[1];
            assert.strictEqual(response.type, 'response');
            if (response.type !== 'response') {
                return;
            }
            assert.strictEqual(response.parts.length, 1);
            assert.strictEqual(response.parts[0].kind, 'markdownContent');
            assert.strictEqual(response.parts[0].content.value, 'Hello world');
        });
        test('error turn produces error message in history', () => {
            const turn = createTurn({
                state: "error" /* TurnState.Error */,
                error: { errorType: 'test', message: 'boom' },
            });
            const history = turnsToHistory([turn], 'p');
            const response = history[1];
            assert.strictEqual(response.type, 'response');
            if (response.type !== 'response') {
                return;
            }
            const errorPart = response.parts.find(p => p.kind === 'markdownContent' && p.content.value.includes('boom'));
            assert.ok(errorPart, 'Should have a markdownContent part containing the error message');
        });
        test('failed tool in history has exitCode 1', () => {
            const turn = createTurn({
                toolCalls: [createCompletedToolCall({
                        _meta: { toolKind: 'terminal' },
                        toolInput: 'bad-command',
                        content: [{ type: "text" /* ToolResultContentType.Text */, text: 'error' }],
                        success: false,
                    })],
            });
            const history = turnsToHistory([turn], 'p');
            const response = history[1];
            assert.strictEqual(response.type, 'response');
            if (response.type !== 'response') {
                return;
            }
            const serialized = response.parts[0];
            assert.ok(serialized.toolSpecificData);
            assert.strictEqual(serialized.toolSpecificData.kind, 'terminal');
            const termData = serialized.toolSpecificData;
            assert.strictEqual(termData.terminalCommandState.exitCode, 1);
        });
    });
    suite('toolCallStateToInvocation', () => {
        test('creates ChatToolInvocation for running tool', () => {
            const tc = createToolCallState({
                toolCallId: 'tc-42',
                toolName: 'my_tool',
                displayName: 'My Tool',
                invocationMessage: 'Doing stuff',
                status: "running" /* ToolCallStatus.Running */,
            });
            const invocation = toolCallStateToInvocation(tc);
            assert.strictEqual(invocation.toolCallId, 'tc-42');
            assert.strictEqual(invocation.toolId, 'my_tool');
            assert.strictEqual(invocation.source, ToolDataSource.Internal);
        });
        test('sets terminal toolSpecificData', () => {
            const tc = createToolCallState({
                _meta: { toolKind: 'terminal' },
                toolInput: 'ls -la',
            });
            const invocation = toolCallStateToInvocation(tc);
            assert.ok(invocation.toolSpecificData);
            assert.strictEqual(invocation.toolSpecificData.kind, 'terminal');
            const termData = invocation.toolSpecificData;
            assert.strictEqual(termData.commandLine.original, 'ls -la');
        });
        test('creates invocation without toolArguments', () => {
            const tc = createToolCallState({});
            const invocation = toolCallStateToInvocation(tc);
            assert.strictEqual(invocation.toolCallId, 'tc-1');
        });
    });
    suite('permissionToConfirmation', () => {
        test('shell permission has terminal data', () => {
            const perm = createPermission({
                permissionKind: "shell" /* PermissionKind.Shell */,
                fullCommandText: 'rm -rf /',
                intention: 'Delete everything',
            });
            const invocation = permissionToConfirmation(perm);
            assert.ok(invocation.toolSpecificData);
            assert.strictEqual(invocation.toolSpecificData.kind, 'terminal');
            const termData = invocation.toolSpecificData;
            assert.strictEqual(termData.commandLine.original, 'rm -rf /');
        });
        test('mcp permission uses server + tool name as title', () => {
            const perm = createPermission({
                permissionKind: "mcp" /* PermissionKind.Mcp */,
                serverName: 'My Server',
                toolName: 'my_tool',
            });
            const invocation = permissionToConfirmation(perm);
            const message = typeof invocation.invocationMessage === 'string' ? invocation.invocationMessage : invocation.invocationMessage.value;
            assert.ok(message.includes('My Server: my_tool'));
        });
        test('write permission has input data', () => {
            const perm = createPermission({
                permissionKind: "write" /* PermissionKind.Write */,
                path: '/test.ts',
                rawRequest: '{"path":"/test.ts","content":"hello"}',
            });
            const invocation = permissionToConfirmation(perm);
            assert.ok(invocation.toolSpecificData);
            assert.strictEqual(invocation.toolSpecificData.kind, 'input');
        });
    });
    suite('finalizeToolInvocation', () => {
        test('finalizes terminal tool with output and exit code', () => {
            const tc = createToolCallState({
                _meta: { toolKind: 'terminal' },
                toolInput: 'echo hi',
                status: "running" /* ToolCallStatus.Running */,
            });
            const invocation = toolCallStateToInvocation(tc);
            finalizeToolInvocation(invocation, {
                status: "completed" /* ToolCallStatus.Completed */,
                toolCallId: 'tc-1',
                toolName: 'test_tool',
                displayName: 'Test Tool',
                invocationMessage: 'Running test tool...',
                _meta: { toolKind: 'terminal' },
                toolInput: 'echo hi',
                confirmed: "not-needed" /* ToolCallConfirmationReason.NotNeeded */,
                success: true,
                pastTenseMessage: 'Ran echo hi',
                content: [{ type: "text" /* ToolResultContentType.Text */, text: 'output text' }],
            });
            assert.ok(invocation.toolSpecificData);
            assert.strictEqual(invocation.toolSpecificData.kind, 'terminal');
            const termData = invocation.toolSpecificData;
            assert.strictEqual(termData.terminalCommandOutput.text, 'output text');
            assert.strictEqual(termData.terminalCommandState.exitCode, 0);
        });
        test('finalizes failed tool with error message', () => {
            const tc = createToolCallState({
                status: "running" /* ToolCallStatus.Running */,
            });
            const invocation = toolCallStateToInvocation(tc);
            finalizeToolInvocation(invocation, {
                status: "completed" /* ToolCallStatus.Completed */,
                toolCallId: 'tc-1',
                toolName: 'test_tool',
                displayName: 'Test Tool',
                invocationMessage: 'Running test tool...',
                confirmed: "not-needed" /* ToolCallConfirmationReason.NotNeeded */,
                success: false,
                pastTenseMessage: 'Failed',
                error: { message: 'timeout' },
            });
            // Should not throw
        });
    });
});
//# sourceMappingURL=stateToProgressAdapter.test.js.map