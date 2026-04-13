/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { EventEmitter } from 'events';
import { Emitter } from '../../../../base/common/event.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../base/test/common/utils.js';
import { NullLogService } from '../../../log/common/log.js';
import { McpGatewaySession } from '../../node/mcpGatewaySession.js';
class TestServerResponse extends EventEmitter {
    constructor() {
        super(...arguments);
        this.writes = [];
        this.destroyed = false;
        this.writableEnded = false;
    }
    writeHead(statusCode, headers) {
        this.statusCode = statusCode;
        this.headers = headers;
        return this;
    }
    write(chunk) {
        this.writes.push(chunk);
        return true;
    }
    end(chunk) {
        if (chunk) {
            this.writes.push(chunk);
        }
        this.writableEnded = true;
        this.destroyed = true;
        this.emit('close');
        return this;
    }
}
suite('McpGatewaySession', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    function createInvoker() {
        const onDidChangeTools = new Emitter();
        const onDidChangeResources = new Emitter();
        const tools = [{
                name: 'test_tool',
                description: 'Test tool',
                inputSchema: {
                    type: 'object',
                    properties: {
                        name: { type: 'string' }
                    }
                }
            }];
        const resources = [{
                uri: 'file:///test/resource.txt',
                name: 'resource.txt',
            }];
        return {
            onDidChangeTools,
            onDidChangeResources,
            invoker: {
                onDidChangeTools: onDidChangeTools.event,
                onDidChangeResources: onDidChangeResources.event,
                listTools: async () => tools,
                callTool: async (_name, args) => ({
                    content: [{ type: 'text', text: `Hello, ${typeof args.name === 'string' ? args.name : 'World'}!` }]
                }),
                listResources: async () => resources,
                readResource: async (_uri) => ({
                    contents: [{ uri: 'file:///test/resource.txt', text: 'hello world', mimeType: 'text/plain' }],
                }),
                listResourceTemplates: async () => [{ uriTemplate: 'file:///test/{name}', name: 'Test Template' }],
            }
        };
    }
    test('returns initialize result', async () => {
        const { invoker, onDidChangeTools, onDidChangeResources } = createInvoker();
        const session = new McpGatewaySession('session-1', new NullLogService(), () => { }, invoker);
        const responses = await session.handleIncoming({
            jsonrpc: '2.0',
            id: 1,
            method: 'initialize',
            params: {
                protocolVersion: '2025-11-25',
                capabilities: {},
                clientInfo: { name: 'test-client', version: '1.0.0' },
            },
        });
        assert.strictEqual(responses.length, 1);
        const response = responses[0];
        assert.strictEqual(response.jsonrpc, '2.0');
        assert.strictEqual(response.id, 1);
        assert.strictEqual(response.result.protocolVersion, '2025-11-25');
        session.dispose();
        onDidChangeTools.dispose();
        onDidChangeResources.dispose();
    });
    test('negotiates to older protocol version when client requests it', async () => {
        const { invoker, onDidChangeTools, onDidChangeResources } = createInvoker();
        const session = new McpGatewaySession('session-negotiate-1', new NullLogService(), () => { }, invoker);
        const responses = await session.handleIncoming({
            jsonrpc: '2.0',
            id: 1,
            method: 'initialize',
            params: {
                protocolVersion: '2025-03-26',
                capabilities: {},
                clientInfo: { name: 'test-client', version: '1.0.0' },
            },
        });
        assert.strictEqual(responses.length, 1);
        const response = responses[0];
        assert.strictEqual(response.result.protocolVersion, '2025-03-26');
        session.dispose();
        onDidChangeTools.dispose();
        onDidChangeResources.dispose();
    });
    test('negotiates to each supported protocol version', async () => {
        const supportedVersions = ['2025-11-25', '2025-06-18', '2025-03-26', '2024-11-05', '2024-10-07'];
        for (const version of supportedVersions) {
            const { invoker, onDidChangeTools, onDidChangeResources } = createInvoker();
            const session = new McpGatewaySession(`session-ver-${version}`, new NullLogService(), () => { }, invoker);
            const responses = await session.handleIncoming({
                jsonrpc: '2.0',
                id: 1,
                method: 'initialize',
                params: { protocolVersion: version, capabilities: {} },
            });
            const response = responses[0];
            assert.strictEqual(response.result.protocolVersion, version, `Expected server to negotiate to ${version}`);
            session.dispose();
            onDidChangeTools.dispose();
            onDidChangeResources.dispose();
        }
    });
    test('falls back to latest version for unsupported client version', async () => {
        const { invoker, onDidChangeTools, onDidChangeResources } = createInvoker();
        const session = new McpGatewaySession('session-negotiate-2', new NullLogService(), () => { }, invoker);
        const responses = await session.handleIncoming({
            jsonrpc: '2.0',
            id: 1,
            method: 'initialize',
            params: {
                protocolVersion: '2099-01-01',
                capabilities: {},
                clientInfo: { name: 'test-client', version: '1.0.0' },
            },
        });
        assert.strictEqual(responses.length, 1);
        const response = responses[0];
        assert.strictEqual(response.result.protocolVersion, '2025-11-25');
        session.dispose();
        onDidChangeTools.dispose();
        onDidChangeResources.dispose();
    });
    test('falls back to latest version when no params provided', async () => {
        const { invoker, onDidChangeTools, onDidChangeResources } = createInvoker();
        const session = new McpGatewaySession('session-negotiate-3', new NullLogService(), () => { }, invoker);
        const responses = await session.handleIncoming({
            jsonrpc: '2.0',
            id: 1,
            method: 'initialize',
        });
        assert.strictEqual(responses.length, 1);
        const response = responses[0];
        assert.strictEqual(response.result.protocolVersion, '2025-11-25');
        session.dispose();
        onDidChangeTools.dispose();
        onDidChangeResources.dispose();
    });
    test('falls back to latest version when protocolVersion is not a string', async () => {
        const { invoker, onDidChangeTools, onDidChangeResources } = createInvoker();
        const session = new McpGatewaySession('session-negotiate-4', new NullLogService(), () => { }, invoker);
        const responses = await session.handleIncoming({
            jsonrpc: '2.0',
            id: 1,
            method: 'initialize',
            params: {
                protocolVersion: 42,
                capabilities: {},
            },
        });
        assert.strictEqual(responses.length, 1);
        const response = responses[0];
        assert.strictEqual(response.result.protocolVersion, '2025-11-25');
        session.dispose();
        onDidChangeTools.dispose();
        onDidChangeResources.dispose();
    });
    test('initialize response includes server info and capabilities', async () => {
        const { invoker, onDidChangeTools, onDidChangeResources } = createInvoker();
        const session = new McpGatewaySession('session-init-caps', new NullLogService(), () => { }, invoker);
        const responses = await session.handleIncoming({
            jsonrpc: '2.0',
            id: 1,
            method: 'initialize',
            params: { protocolVersion: '2025-03-26', capabilities: {} },
        });
        const result = responses[0].result;
        assert.deepStrictEqual(result, {
            protocolVersion: '2025-03-26',
            capabilities: {
                tools: { listChanged: true },
                resources: { listChanged: true },
            },
            serverInfo: {
                name: 'VS Code MCP Gateway',
                version: '1.0.0',
            },
        });
        session.dispose();
        onDidChangeTools.dispose();
        onDidChangeResources.dispose();
    });
    test('rejects non-initialize requests before initialized notification', async () => {
        const { invoker, onDidChangeTools, onDidChangeResources } = createInvoker();
        const session = new McpGatewaySession('session-2', new NullLogService(), () => { }, invoker);
        const responses = await session.handleIncoming({
            jsonrpc: '2.0',
            id: 2,
            method: 'tools/list',
        });
        assert.strictEqual(responses.length, 1);
        const response = responses[0];
        assert.strictEqual(response.jsonrpc, '2.0');
        assert.strictEqual(response.id, 2);
        assert.strictEqual(response.error.code, -32600);
        session.dispose();
        onDidChangeTools.dispose();
        onDidChangeResources.dispose();
    });
    test('serves tools/list and tools/call after initialized notification', async () => {
        const { invoker, onDidChangeTools, onDidChangeResources } = createInvoker();
        const session = new McpGatewaySession('session-3', new NullLogService(), () => { }, invoker);
        await session.handleIncoming({ jsonrpc: '2.0', id: 1, method: 'initialize' });
        const notificationResponses = await session.handleIncoming({ jsonrpc: '2.0', method: 'notifications/initialized' });
        assert.strictEqual(notificationResponses.length, 0);
        const listResponses = await session.handleIncoming({ jsonrpc: '2.0', id: 3, method: 'tools/list' });
        const listResponse = listResponses[0];
        const tools = listResponse.result.tools;
        assert.strictEqual(tools.length, 1);
        assert.strictEqual(tools[0].name, 'test_tool');
        const callResponses = await session.handleIncoming({
            jsonrpc: '2.0',
            id: 4,
            method: 'tools/call',
            params: {
                name: 'test_tool',
                arguments: {
                    name: 'VS Code',
                },
            },
        });
        const callResponse = callResponses[0];
        const text = (callResponse.result.content[0].text);
        assert.strictEqual(text, 'Hello, VS Code!');
        session.dispose();
        onDidChangeTools.dispose();
        onDidChangeResources.dispose();
    });
    test('broadcasts notifications to attached SSE clients', async () => {
        const { invoker, onDidChangeTools, onDidChangeResources } = createInvoker();
        const session = new McpGatewaySession('session-4', new NullLogService(), () => { }, invoker);
        const response = new TestServerResponse();
        session.attachSseClient({}, response);
        await session.handleIncoming({ jsonrpc: '2.0', id: 1, method: 'initialize' });
        await session.handleIncoming({ jsonrpc: '2.0', method: 'notifications/initialized' });
        assert.strictEqual(response.statusCode, 200);
        assert.strictEqual(response.headers?.['Content-Type'], 'text/event-stream');
        assert.ok(response.writes.some(chunk => chunk.includes(': connected')));
        assert.ok(response.writes.some(chunk => chunk.includes('event: message')));
        assert.ok(response.writes.some(chunk => chunk.includes('notifications/tools/list_changed')));
        assert.ok(response.writes.some(chunk => chunk.includes('notifications/resources/list_changed')));
        session.dispose();
        onDidChangeTools.dispose();
        onDidChangeResources.dispose();
    });
    test('emits list changed on tool invoker changes', async () => {
        const { invoker, onDidChangeTools, onDidChangeResources } = createInvoker();
        const session = new McpGatewaySession('session-5', new NullLogService(), () => { }, invoker);
        const response = new TestServerResponse();
        session.attachSseClient({}, response);
        await session.handleIncoming({ jsonrpc: '2.0', id: 1, method: 'initialize' });
        await session.handleIncoming({ jsonrpc: '2.0', method: 'notifications/initialized' });
        const writesBefore = response.writes.length;
        onDidChangeTools.fire();
        assert.ok(response.writes.length > writesBefore);
        assert.ok(response.writes.slice(writesBefore).some(chunk => chunk.includes('notifications/tools/list_changed')));
        session.dispose();
        onDidChangeTools.dispose();
        onDidChangeResources.dispose();
    });
    test('disposes attached SSE clients and callback', () => {
        const { invoker, onDidChangeTools, onDidChangeResources } = createInvoker();
        let disposed = false;
        const session = new McpGatewaySession('session-6', new NullLogService(), () => {
            disposed = true;
        }, invoker);
        const response = new TestServerResponse();
        session.attachSseClient({}, response);
        session.dispose();
        assert.strictEqual(response.writableEnded, true);
        assert.strictEqual(disposed, true);
        onDidChangeTools.dispose();
        onDidChangeResources.dispose();
    });
    test('emits resources list changed on resource invoker changes', async () => {
        const { invoker, onDidChangeTools, onDidChangeResources } = createInvoker();
        const session = new McpGatewaySession('session-7', new NullLogService(), () => { }, invoker);
        const response = new TestServerResponse();
        session.attachSseClient({}, response);
        await session.handleIncoming({ jsonrpc: '2.0', id: 1, method: 'initialize' });
        await session.handleIncoming({ jsonrpc: '2.0', method: 'notifications/initialized' });
        const writesBefore = response.writes.length;
        onDidChangeResources.fire();
        assert.ok(response.writes.length > writesBefore);
        assert.ok(response.writes.slice(writesBefore).some(chunk => chunk.includes('notifications/resources/list_changed')));
        session.dispose();
        onDidChangeTools.dispose();
        onDidChangeResources.dispose();
    });
    test('serves resources/list with raw URIs', async () => {
        const { invoker, onDidChangeTools, onDidChangeResources } = createInvoker();
        const session = new McpGatewaySession('session-8', new NullLogService(), () => { }, invoker);
        await session.handleIncoming({ jsonrpc: '2.0', id: 1, method: 'initialize' });
        await session.handleIncoming({ jsonrpc: '2.0', method: 'notifications/initialized' });
        const responses = await session.handleIncoming({ jsonrpc: '2.0', id: 2, method: 'resources/list' });
        const response = responses[0];
        const resources = response.result.resources;
        assert.strictEqual(resources.length, 1);
        assert.strictEqual(resources[0].uri, 'file:///test/resource.txt');
        assert.strictEqual(resources[0].name, 'resource.txt');
        session.dispose();
        onDidChangeTools.dispose();
        onDidChangeResources.dispose();
    });
    test('serves resources/read with raw URIs', async () => {
        const { invoker, onDidChangeTools, onDidChangeResources } = createInvoker();
        const session = new McpGatewaySession('session-9', new NullLogService(), () => { }, invoker);
        await session.handleIncoming({ jsonrpc: '2.0', id: 1, method: 'initialize' });
        await session.handleIncoming({ jsonrpc: '2.0', method: 'notifications/initialized' });
        const responses = await session.handleIncoming({
            jsonrpc: '2.0',
            id: 2,
            method: 'resources/read',
            params: { uri: 'file:///test/resource.txt' },
        });
        const response = responses[0];
        const contents = response.result.contents;
        assert.strictEqual(contents.length, 1);
        assert.strictEqual(contents[0].uri, 'file:///test/resource.txt');
        assert.strictEqual(contents[0].text, 'hello world');
        session.dispose();
        onDidChangeTools.dispose();
        onDidChangeResources.dispose();
    });
    test('serves resources/templates/list with raw URI templates', async () => {
        const { invoker, onDidChangeTools, onDidChangeResources } = createInvoker();
        const session = new McpGatewaySession('session-10', new NullLogService(), () => { }, invoker);
        await session.handleIncoming({ jsonrpc: '2.0', id: 1, method: 'initialize' });
        await session.handleIncoming({ jsonrpc: '2.0', method: 'notifications/initialized' });
        const responses = await session.handleIncoming({ jsonrpc: '2.0', id: 2, method: 'resources/templates/list' });
        const response = responses[0];
        const templates = response.result.resourceTemplates;
        assert.strictEqual(templates.length, 1);
        assert.strictEqual(templates[0].uriTemplate, 'file:///test/{name}');
        assert.strictEqual(templates[0].name, 'Test Template');
        session.dispose();
        onDidChangeTools.dispose();
        onDidChangeResources.dispose();
    });
});
//# sourceMappingURL=mcpGatewaySession.test.js.map