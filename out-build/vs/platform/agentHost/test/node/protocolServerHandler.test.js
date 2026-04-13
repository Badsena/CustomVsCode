/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { Emitter, Event } from '../../../../base/common/event.js';
import { DisposableStore } from '../../../../base/common/lifecycle.js';
import { URI } from '../../../../base/common/uri.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../base/test/common/utils.js';
import { NullLogService } from '../../../log/common/log.js';
import { isJsonRpcNotification, isJsonRpcResponse, JSON_RPC_INTERNAL_ERROR, ProtocolError } from '../../common/state/sessionProtocol.js';
import { PROTOCOL_VERSION } from '../../common/state/sessionCapabilities.js';
import { ProtocolServerHandler } from '../../node/protocolServerHandler.js';
import { SessionStateManager } from '../../node/sessionStateManager.js';
// ---- Mock helpers -----------------------------------------------------------
class MockProtocolTransport {
    constructor() {
        this._onMessage = new Emitter();
        this.onMessage = this._onMessage.event;
        this._onDidSend = new Emitter();
        this.onDidSend = this._onDidSend.event;
        this._onClose = new Emitter();
        this.onClose = this._onClose.event;
        this.sent = [];
    }
    send(message) {
        this.sent.push(message);
        this._onDidSend.fire(message);
    }
    simulateMessage(msg) {
        this._onMessage.fire(msg);
    }
    simulateClose() {
        this._onClose.fire();
    }
    dispose() {
        this._onMessage.dispose();
        this._onDidSend.dispose();
        this._onClose.dispose();
    }
}
class MockProtocolServer {
    constructor() {
        this._onConnection = new Emitter();
        this.onConnection = this._onConnection.event;
        this.address = 'mock://test';
    }
    simulateConnection(transport) {
        this._onConnection.fire(transport);
    }
    dispose() {
        this._onConnection.dispose();
    }
}
class MockSideEffectHandler {
    constructor() {
        this.handledActions = [];
        this.browsedUris = [];
        this.browseErrors = new Map();
    }
    handleAction(action) {
        this.handledActions.push(action);
    }
    async handleCreateSession(_command) { }
    handleDisposeSession(_session) { }
    async handleListSessions() { return []; }
    handleSetAuthToken(_token) { }
    async handleBrowseDirectory(uri) {
        this.browsedUris.push(URI.parse(uri));
        const error = this.browseErrors.get(uri);
        if (error) {
            throw error;
        }
        return {
            entries: [
                { name: 'src', type: 'directory' },
                { name: 'README.md', type: 'file' },
            ],
        };
    }
    getDefaultDirectory() {
        return URI.file('/home/testuser').toString();
    }
}
// ---- Helpers ----------------------------------------------------------------
function notification(method, params) {
    return { jsonrpc: '2.0', method, params };
}
function request(id, method, params) {
    return { jsonrpc: '2.0', id, method, params };
}
function findNotifications(sent, method) {
    return sent.filter(isJsonRpcNotification);
}
function findResponse(sent, id) {
    return sent.find(isJsonRpcResponse);
}
function waitForResponse(transport, id) {
    return Event.toPromise(Event.filter(transport.onDidSend, message => isJsonRpcResponse(message) && message.id === id));
}
// ---- Tests ------------------------------------------------------------------
suite('ProtocolServerHandler', () => {
    let disposables;
    let stateManager;
    let server;
    let sideEffects;
    const sessionUri = URI.from({ scheme: 'copilot', path: '/test-session' }).toString();
    function makeSessionSummary(resource) {
        return {
            resource: resource ?? sessionUri,
            provider: 'copilot',
            title: 'Test',
            status: "idle" /* SessionStatus.Idle */,
            createdAt: Date.now(),
            modifiedAt: Date.now(),
        };
    }
    function connectClient(clientId, initialSubscriptions) {
        const transport = new MockProtocolTransport();
        server.simulateConnection(transport);
        transport.simulateMessage(request(1, 'initialize', {
            protocolVersion: PROTOCOL_VERSION,
            clientId,
            initialSubscriptions,
        }));
        return transport;
    }
    setup(() => {
        disposables = new DisposableStore();
        stateManager = disposables.add(new SessionStateManager(new NullLogService()));
        server = disposables.add(new MockProtocolServer());
        sideEffects = new MockSideEffectHandler();
        disposables.add(new ProtocolServerHandler(stateManager, server, sideEffects, new NullLogService()));
    });
    teardown(() => {
        disposables.dispose();
    });
    ensureNoDisposablesAreLeakedInTestSuite();
    test('handshake returns initialize response', () => {
        const transport = connectClient('client-1');
        const resp = findResponse(transport.sent, 1);
        assert.ok(resp, 'should have sent initialize response');
        const result = resp.result;
        assert.strictEqual(result.protocolVersion, PROTOCOL_VERSION);
        assert.strictEqual(result.serverSeq, stateManager.serverSeq);
    });
    test('handshake with initialSubscriptions returns snapshots', () => {
        stateManager.createSession(makeSessionSummary());
        const transport = connectClient('client-1', [sessionUri]);
        const resp = findResponse(transport.sent, 1);
        assert.ok(resp);
        const result = resp.result;
        assert.strictEqual(result.snapshots.length, 1);
        assert.strictEqual(result.snapshots[0].resource.toString(), sessionUri.toString());
    });
    test('subscribe request returns snapshot', async () => {
        stateManager.createSession(makeSessionSummary());
        const transport = connectClient('client-1');
        transport.sent.length = 0;
        const responsePromise = waitForResponse(transport, 1);
        transport.simulateMessage(request(1, 'subscribe', { resource: sessionUri }));
        const resp = await responsePromise;
        assert.ok(resp, 'should have sent response');
        const result = resp.result;
        assert.strictEqual(result.snapshot.resource.toString(), sessionUri.toString());
    });
    test('client action is dispatched and echoed', () => {
        stateManager.createSession(makeSessionSummary());
        stateManager.dispatchServerAction({ type: "session/ready" /* ActionType.SessionReady */, session: sessionUri });
        const transport = connectClient('client-1', [sessionUri]);
        transport.sent.length = 0;
        transport.simulateMessage(notification('dispatchAction', {
            clientSeq: 1,
            action: {
                type: "session/turnStarted" /* ActionType.SessionTurnStarted */,
                session: sessionUri,
                turnId: 'turn-1',
                userMessage: { text: 'hello' },
            },
        }));
        const actionMsgs = findNotifications(transport.sent, 'action');
        const turnStarted = actionMsgs.find(m => {
            const envelope = m.params;
            return envelope.action.type === "session/turnStarted" /* ActionType.SessionTurnStarted */;
        });
        assert.ok(turnStarted, 'should have echoed turnStarted');
        const envelope = turnStarted.params;
        assert.strictEqual(envelope.origin.clientId, 'client-1');
        assert.strictEqual(envelope.origin.clientSeq, 1);
    });
    test('actions are scoped to subscribed sessions', () => {
        stateManager.createSession(makeSessionSummary());
        stateManager.dispatchServerAction({ type: "session/ready" /* ActionType.SessionReady */, session: sessionUri });
        const transportA = connectClient('client-a', [sessionUri]);
        const transportB = connectClient('client-b');
        transportA.sent.length = 0;
        transportB.sent.length = 0;
        stateManager.dispatchServerAction({
            type: "session/titleChanged" /* ActionType.SessionTitleChanged */,
            session: sessionUri,
            title: 'New Title',
        });
        assert.strictEqual(findNotifications(transportA.sent, 'action').length, 1);
        assert.strictEqual(findNotifications(transportB.sent, 'action').length, 0);
    });
    test('notifications are broadcast to all clients', () => {
        const transportA = connectClient('client-a');
        const transportB = connectClient('client-b');
        transportA.sent.length = 0;
        transportB.sent.length = 0;
        stateManager.createSession(makeSessionSummary());
        assert.strictEqual(findNotifications(transportA.sent, 'notification').length, 1);
        assert.strictEqual(findNotifications(transportB.sent, 'notification').length, 1);
    });
    test('reconnect replays missed actions', () => {
        stateManager.createSession(makeSessionSummary());
        stateManager.dispatchServerAction({ type: "session/ready" /* ActionType.SessionReady */, session: sessionUri });
        const transport1 = connectClient('client-r', [sessionUri]);
        const resp = findResponse(transport1.sent, 1);
        const initSeq = resp.result.serverSeq;
        transport1.simulateClose();
        stateManager.dispatchServerAction({ type: "session/titleChanged" /* ActionType.SessionTitleChanged */, session: sessionUri, title: 'Title A' });
        stateManager.dispatchServerAction({ type: "session/titleChanged" /* ActionType.SessionTitleChanged */, session: sessionUri, title: 'Title B' });
        const transport2 = new MockProtocolTransport();
        server.simulateConnection(transport2);
        transport2.simulateMessage(request(1, 'reconnect', {
            clientId: 'client-r',
            lastSeenServerSeq: initSeq,
            subscriptions: [sessionUri],
        }));
        const reconnectResp = findResponse(transport2.sent, 1);
        assert.ok(reconnectResp, 'should have sent reconnect response');
        const result = reconnectResp.result;
        assert.strictEqual(result.type, 'replay');
        if (result.type === 'replay') {
            assert.strictEqual(result.actions.length, 2);
        }
    });
    test('reconnect sends fresh snapshots when gap too large', () => {
        stateManager.createSession(makeSessionSummary());
        stateManager.dispatchServerAction({ type: "session/ready" /* ActionType.SessionReady */, session: sessionUri });
        const transport1 = connectClient('client-g', [sessionUri]);
        transport1.simulateClose();
        for (let i = 0; i < 1100; i++) {
            stateManager.dispatchServerAction({ type: "session/titleChanged" /* ActionType.SessionTitleChanged */, session: sessionUri, title: `Title ${i}` });
        }
        const transport2 = new MockProtocolTransport();
        server.simulateConnection(transport2);
        transport2.simulateMessage(request(1, 'reconnect', {
            clientId: 'client-g',
            lastSeenServerSeq: 0,
            subscriptions: [sessionUri],
        }));
        const reconnectResp = findResponse(transport2.sent, 1);
        assert.ok(reconnectResp, 'should have sent reconnect response');
        const result = reconnectResp.result;
        assert.strictEqual(result.type, 'snapshot');
        if (result.type === 'snapshot') {
            assert.ok(result.snapshots.length > 0, 'should contain snapshots');
        }
    });
    test('client disconnect cleans up', () => {
        stateManager.createSession(makeSessionSummary());
        stateManager.dispatchServerAction({ type: "session/ready" /* ActionType.SessionReady */, session: sessionUri });
        const transport = connectClient('client-d', [sessionUri]);
        transport.sent.length = 0;
        transport.simulateClose();
        stateManager.dispatchServerAction({ type: "session/titleChanged" /* ActionType.SessionTitleChanged */, session: sessionUri, title: 'After Disconnect' });
        assert.strictEqual(transport.sent.length, 0);
    });
    test('handshake includes defaultDirectory from side effects', () => {
        const transport = connectClient('client-home');
        const resp = findResponse(transport.sent, 1);
        assert.ok(resp);
        const result = resp.result;
        assert.strictEqual(URI.parse(result.defaultDirectory).path, '/home/testuser');
    });
    test('browseDirectory routes to side effect handler', async () => {
        const transport = connectClient('client-browse');
        transport.sent.length = 0;
        const dirUri = URI.file('/home/user/project').toString();
        const responsePromise = waitForResponse(transport, 2);
        transport.simulateMessage(request(2, 'browseDirectory', { uri: dirUri }));
        const resp = await responsePromise;
        assert.strictEqual(sideEffects.browsedUris.length, 1);
        assert.strictEqual(sideEffects.browsedUris[0].path, '/home/user/project');
        assert.ok(resp);
        const result = resp.result;
        assert.strictEqual(result.entries.length, 2);
        assert.strictEqual(result.entries[0].name, 'src');
        assert.strictEqual(result.entries[0].type, 'directory');
        assert.strictEqual(result.entries[1].name, 'README.md');
        assert.strictEqual(result.entries[1].type, 'file');
    });
    test('browseDirectory returns a JSON-RPC error when the target is invalid', async () => {
        const transport = connectClient('client-browse-error');
        transport.sent.length = 0;
        const dirUri = URI.file('/missing').toString();
        sideEffects.browseErrors.set(dirUri, new ProtocolError(JSON_RPC_INTERNAL_ERROR, `Directory not found: ${dirUri}`));
        const responsePromise = waitForResponse(transport, 2);
        transport.simulateMessage(request(2, 'browseDirectory', { uri: dirUri }));
        const resp = await responsePromise;
        assert.ok(resp?.error);
        assert.strictEqual(resp.error.code, JSON_RPC_INTERNAL_ERROR);
        assert.match(resp.error.message, /Directory not found/);
    });
});
//# sourceMappingURL=protocolServerHandler.test.js.map