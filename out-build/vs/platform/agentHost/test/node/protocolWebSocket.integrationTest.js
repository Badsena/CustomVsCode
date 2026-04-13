/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { fork } from 'child_process';
import { fileURLToPath } from 'url';
import { WebSocket } from 'ws';
import { URI } from '../../../../base/common/uri.js';
import { PROTOCOL_VERSION } from '../../common/state/sessionCapabilities.js';
import { isJsonRpcNotification, isJsonRpcResponse, JSON_RPC_PARSE_ERROR } from '../../common/state/sessionProtocol.js';
class TestProtocolClient {
    constructor(port) {
        this._nextId = 1;
        this._pendingCalls = new Map();
        this._notifications = [];
        this._notifWaiters = [];
        this._ws = new WebSocket(`ws://127.0.0.1:${port}`);
    }
    async connect() {
        return new Promise((resolve, reject) => {
            this._ws.on('open', () => {
                this._ws.on('message', (data) => {
                    const text = typeof data === 'string' ? data : data.toString('utf-8');
                    const msg = JSON.parse(text);
                    this._handleMessage(msg);
                });
                resolve();
            });
            this._ws.on('error', reject);
        });
    }
    _handleMessage(msg) {
        if (isJsonRpcResponse(msg)) {
            // JSON-RPC response — resolve pending call
            const pending = this._pendingCalls.get(msg.id);
            if (pending) {
                this._pendingCalls.delete(msg.id);
                const errResp = msg;
                if (errResp.error) {
                    pending.reject(new Error(errResp.error.message));
                }
                else {
                    pending.resolve(msg.result);
                }
            }
        }
        else if (isJsonRpcNotification(msg)) {
            // JSON-RPC notification from server
            const notif = msg;
            // Check waiters first
            for (let i = this._notifWaiters.length - 1; i >= 0; i--) {
                if (this._notifWaiters[i].predicate(notif)) {
                    const waiter = this._notifWaiters.splice(i, 1)[0];
                    waiter.resolve(notif);
                }
            }
            this._notifications.push(notif);
        }
    }
    /** Send a JSON-RPC notification (fire-and-forget). */
    notify(method, params) {
        this._ws.send(JSON.stringify({ jsonrpc: '2.0', method, params }));
    }
    /** Send a JSON-RPC request and await the response. */
    call(method, params, timeoutMs = 5000) {
        const id = this._nextId++;
        this._ws.send(JSON.stringify({ jsonrpc: '2.0', id, method, params }));
        return new Promise((resolve, reject) => {
            const timer = setTimeout(() => {
                this._pendingCalls.delete(id);
                reject(new Error(`Timeout waiting for response to ${method} (id=${id}, ${timeoutMs}ms)`));
            }, timeoutMs);
            this._pendingCalls.set(id, {
                resolve: result => { clearTimeout(timer); resolve(result); },
                reject: err => { clearTimeout(timer); reject(err); },
            });
        });
    }
    /** Wait for a server notification matching a predicate. */
    waitForNotification(predicate, timeoutMs = 5000) {
        const existing = this._notifications.find(predicate);
        if (existing) {
            return Promise.resolve(existing);
        }
        return new Promise((resolve, reject) => {
            const timer = setTimeout(() => {
                const idx = this._notifWaiters.findIndex(w => w.resolve === resolve);
                if (idx >= 0) {
                    this._notifWaiters.splice(idx, 1);
                }
                reject(new Error(`Timeout waiting for notification (${timeoutMs}ms)`));
            }, timeoutMs);
            this._notifWaiters.push({
                predicate,
                resolve: n => { clearTimeout(timer); resolve(n); },
                reject,
            });
        });
    }
    /** Return all received notifications matching a predicate. */
    receivedNotifications(predicate) {
        return predicate ? this._notifications.filter(predicate) : [...this._notifications];
    }
    /** Send a raw string over the WebSocket without JSON serialization. */
    sendRaw(data) {
        this._ws.send(data);
    }
    /** Wait for the next raw message from the server. */
    waitForRawMessage(timeoutMs = 5000) {
        return new Promise((resolve, reject) => {
            const timer = setTimeout(() => {
                cleanup();
                reject(new Error(`Timeout waiting for raw message (${timeoutMs}ms)`));
            }, timeoutMs);
            const onMsg = (data) => {
                cleanup();
                const text = typeof data === 'string' ? data : data.toString('utf-8');
                resolve(JSON.parse(text));
            };
            const cleanup = () => {
                clearTimeout(timer);
                this._ws.removeListener('message', onMsg);
            };
            this._ws.on('message', onMsg);
        });
    }
    close() {
        for (const w of this._notifWaiters) {
            w.reject(new Error('Client closed'));
        }
        this._notifWaiters.length = 0;
        for (const [, p] of this._pendingCalls) {
            p.reject(new Error('Client closed'));
        }
        this._pendingCalls.clear();
        this._ws.close();
    }
    clearReceived() {
        this._notifications.length = 0;
    }
}
// ---- Server process lifecycle -----------------------------------------------
async function startServer() {
    return new Promise((resolve, reject) => {
        const serverPath = fileURLToPath(new URL('../../node/agentHostServerMain.js', import.meta.url));
        const child = fork(serverPath, ['--enable-mock-agent', '--quiet', '--port', '0', '--without-connection-token'], {
            stdio: ['pipe', 'pipe', 'pipe', 'ipc'],
        });
        const timeout = setTimeout(() => {
            child.kill();
            reject(new Error('Server startup timed out'));
        }, 10_000);
        child.stdout.on('data', (data) => {
            const text = data.toString();
            const match = text.match(/READY:(\d+)/);
            if (match) {
                clearTimeout(timeout);
                resolve({ process: child, port: parseInt(match[1], 10) });
            }
        });
        child.stderr.on('data', () => {
            // Intentionally swallowed - the test runner fails if console.error is used.
        });
        child.on('error', err => {
            clearTimeout(timeout);
            reject(err);
        });
        child.on('exit', code => {
            clearTimeout(timeout);
            reject(new Error(`Server exited prematurely with code ${code}`));
        });
    });
}
// ---- Helpers ----------------------------------------------------------------
let sessionCounter = 0;
function nextSessionUri() {
    return URI.from({ scheme: 'mock', path: `/test-session-${++sessionCounter}` }).toString();
}
function isActionNotification(n, actionType) {
    if (n.method !== 'action') {
        return false;
    }
    const envelope = n.params;
    return envelope.action.type === actionType;
}
function getActionEnvelope(n) {
    return n.params;
}
/** Perform handshake, create a session, subscribe, and return its URI. */
async function createAndSubscribeSession(c, clientId) {
    await c.call('initialize', { protocolVersion: PROTOCOL_VERSION, clientId });
    await c.call('createSession', { session: nextSessionUri(), provider: 'mock' });
    const notif = await c.waitForNotification(n => n.method === 'notification' && n.params.notification.type === 'notify/sessionAdded');
    const realSessionUri = notif.params.notification.summary.resource;
    await c.call('subscribe', { resource: realSessionUri });
    c.clearReceived();
    return realSessionUri;
}
function dispatchTurnStarted(c, session, turnId, text, clientSeq) {
    c.notify('dispatchAction', {
        clientSeq,
        action: {
            type: 'session/turnStarted',
            session,
            turnId,
            userMessage: { text },
        },
    });
}
// ---- Test suite -------------------------------------------------------------
suite('Protocol WebSocket E2E', function () {
    let server;
    let client;
    suiteSetup(async function () {
        this.timeout(15_000);
        server = await startServer();
    });
    suiteTeardown(function () {
        server.process.kill();
    });
    setup(async function () {
        this.timeout(10_000);
        client = new TestProtocolClient(server.port);
        await client.connect();
    });
    teardown(function () {
        client.close();
    });
    // 1. Handshake
    test('handshake returns initialize response with protocol version', async function () {
        this.timeout(5_000);
        const result = await client.call('initialize', {
            protocolVersion: PROTOCOL_VERSION,
            clientId: 'test-handshake',
            initialSubscriptions: [URI.from({ scheme: 'agenthost', path: '/root' }).toString()],
        });
        assert.strictEqual(result.protocolVersion, PROTOCOL_VERSION);
        assert.ok(result.serverSeq >= 0);
        assert.ok(result.snapshots.length >= 1, 'should have root state snapshot');
    });
    // 2. Create session
    test('create session triggers sessionAdded notification', async function () {
        this.timeout(10_000);
        await client.call('initialize', { protocolVersion: PROTOCOL_VERSION, clientId: 'test-create-session' });
        await client.call('createSession', { session: nextSessionUri(), provider: 'mock' });
        const notif = await client.waitForNotification(n => n.method === 'notification' && n.params.notification.type === 'notify/sessionAdded');
        const notification = notif.params.notification;
        assert.strictEqual(URI.parse(notification.summary.resource).scheme, 'mock');
        assert.strictEqual(notification.summary.provider, 'mock');
    });
    // 3. Send message and receive response
    test('send message and receive delta + turnComplete', async function () {
        this.timeout(10_000);
        const sessionUri = await createAndSubscribeSession(client, 'test-send-message');
        dispatchTurnStarted(client, sessionUri, 'turn-1', 'hello', 1);
        const delta = await client.waitForNotification(n => isActionNotification(n, 'session/delta'));
        const deltaAction = getActionEnvelope(delta).action;
        assert.strictEqual(deltaAction.type, 'session/delta');
        if (deltaAction.type === 'session/delta') {
            assert.strictEqual(deltaAction.content, 'Hello, world!');
        }
        await client.waitForNotification(n => isActionNotification(n, 'session/turnComplete'));
    });
    // 4. Tool invocation lifecycle
    test('tool invocation: toolCallStart → toolCallComplete → delta → turnComplete', async function () {
        this.timeout(10_000);
        const sessionUri = await createAndSubscribeSession(client, 'test-tool-invocation');
        dispatchTurnStarted(client, sessionUri, 'turn-tool', 'use-tool', 1);
        await client.waitForNotification(n => isActionNotification(n, 'session/toolCallStart'));
        await client.waitForNotification(n => isActionNotification(n, 'session/toolCallReady'));
        const toolComplete = await client.waitForNotification(n => isActionNotification(n, 'session/toolCallComplete'));
        const tcAction = getActionEnvelope(toolComplete).action;
        if (tcAction.type === 'session/toolCallComplete') {
            assert.strictEqual(tcAction.result.success, true);
        }
        await client.waitForNotification(n => isActionNotification(n, 'session/delta'));
        await client.waitForNotification(n => isActionNotification(n, 'session/turnComplete'));
    });
    // 5. Error handling
    test('error prompt triggers session/error', async function () {
        this.timeout(10_000);
        const sessionUri = await createAndSubscribeSession(client, 'test-error');
        dispatchTurnStarted(client, sessionUri, 'turn-err', 'error', 1);
        const errorNotif = await client.waitForNotification(n => isActionNotification(n, 'session/error'));
        const errorAction = getActionEnvelope(errorNotif).action;
        if (errorAction.type === 'session/error') {
            assert.strictEqual(errorAction.error.message, 'Something went wrong');
        }
    });
    // 6. Permission flow
    test('permission request → resolve → response', async function () {
        this.timeout(10_000);
        const sessionUri = await createAndSubscribeSession(client, 'test-permission');
        dispatchTurnStarted(client, sessionUri, 'turn-perm', 'permission', 1);
        await client.waitForNotification(n => isActionNotification(n, 'session/permissionRequest'));
        client.notify('dispatchAction', {
            clientSeq: 2,
            action: {
                type: 'session/permissionResolved',
                session: sessionUri,
                turnId: 'turn-perm',
                requestId: 'perm-1',
                approved: true,
            },
        });
        const delta = await client.waitForNotification(n => isActionNotification(n, 'session/delta'));
        const content = getActionEnvelope(delta).action.content;
        assert.strictEqual(content, 'Allowed.');
        await client.waitForNotification(n => isActionNotification(n, 'session/turnComplete'));
    });
    // 7. Session list
    test('listSessions returns sessions', async function () {
        this.timeout(10_000);
        await client.call('initialize', { protocolVersion: PROTOCOL_VERSION, clientId: 'test-list-sessions' });
        await client.call('createSession', { session: nextSessionUri(), provider: 'mock' });
        await client.waitForNotification(n => n.method === 'notification' && n.params.notification.type === 'notify/sessionAdded');
        const result = await client.call('listSessions');
        assert.ok(Array.isArray(result.items));
        assert.ok(result.items.length >= 1, 'should have at least one session');
    });
    // 8. Reconnect
    test('reconnect replays missed actions', async function () {
        this.timeout(15_000);
        const sessionUri = await createAndSubscribeSession(client, 'test-reconnect');
        dispatchTurnStarted(client, sessionUri, 'turn-recon', 'hello', 1);
        await client.waitForNotification(n => isActionNotification(n, 'session/turnComplete'));
        const allActions = client.receivedNotifications(n => n.method === 'action');
        assert.ok(allActions.length > 0);
        const missedFromSeq = getActionEnvelope(allActions[0]).serverSeq - 1;
        client.close();
        const client2 = new TestProtocolClient(server.port);
        await client2.connect();
        const result = await client2.call('reconnect', {
            clientId: 'test-reconnect',
            lastSeenServerSeq: missedFromSeq,
            subscriptions: [sessionUri],
        });
        assert.ok(result.type === 'replay' || result.type === 'snapshot', 'should receive replay or snapshot');
        if (result.type === 'replay') {
            assert.ok(result.actions.length > 0, 'should have replayed actions');
        }
        client2.close();
    });
    // ---- Gap tests: functionality bugs ----------------------------------------
    test('usage info is captured on completed turn', async function () {
        this.timeout(10_000);
        const sessionUri = await createAndSubscribeSession(client, 'test-usage');
        dispatchTurnStarted(client, sessionUri, 'turn-usage', 'with-usage', 1);
        const usageNotif = await client.waitForNotification(n => isActionNotification(n, 'session/usage'));
        const usageAction = getActionEnvelope(usageNotif).action;
        assert.strictEqual(usageAction.usage.inputTokens, 100);
        assert.strictEqual(usageAction.usage.outputTokens, 50);
        await client.waitForNotification(n => isActionNotification(n, 'session/turnComplete'));
        const snapshot = await client.call('subscribe', { resource: sessionUri });
        const state = snapshot.snapshot.state;
        assert.ok(state.turns.length >= 1);
        const turn = state.turns[state.turns.length - 1];
        assert.ok(turn.usage);
        assert.strictEqual(turn.usage.inputTokens, 100);
        assert.strictEqual(turn.usage.outputTokens, 50);
    });
    test('modifiedAt updates on turn completion', async function () {
        this.timeout(10_000);
        const sessionUri = await createAndSubscribeSession(client, 'test-modifiedAt');
        const initialSnapshot = await client.call('subscribe', { resource: sessionUri });
        const initialModifiedAt = initialSnapshot.snapshot.state.summary.modifiedAt;
        await new Promise(resolve => setTimeout(resolve, 50));
        dispatchTurnStarted(client, sessionUri, 'turn-mod', 'hello', 1);
        await client.waitForNotification(n => isActionNotification(n, 'session/turnComplete'));
        const updatedSnapshot = await client.call('subscribe', { resource: sessionUri });
        const updatedModifiedAt = updatedSnapshot.snapshot.state.summary.modifiedAt;
        assert.ok(updatedModifiedAt >= initialModifiedAt);
    });
    test('createSession with invalid provider does not crash server', async function () {
        this.timeout(10_000);
        await client.call('initialize', { protocolVersion: PROTOCOL_VERSION, clientId: 'test-invalid-create' });
        // This should return a JSON-RPC error
        let gotError = false;
        try {
            await client.call('createSession', { session: nextSessionUri(), provider: 'nonexistent' });
        }
        catch {
            gotError = true;
        }
        assert.ok(gotError, 'should have received an error for invalid provider');
        // Server should still be functional
        await client.call('createSession', { session: nextSessionUri(), provider: 'mock' });
        const notif = await client.waitForNotification(n => n.method === 'notification' && n.params.notification.type === 'notify/sessionAdded');
        assert.ok(notif);
    });
    test('fetchTurns returns completed turn history', async function () {
        this.timeout(15_000);
        const sessionUri = await createAndSubscribeSession(client, 'test-fetchTurns');
        dispatchTurnStarted(client, sessionUri, 'turn-ft-1', 'hello', 1);
        await client.waitForNotification(n => isActionNotification(n, 'session/turnComplete'));
        dispatchTurnStarted(client, sessionUri, 'turn-ft-2', 'hello', 2);
        await new Promise(resolve => setTimeout(resolve, 200));
        await client.waitForNotification(n => isActionNotification(n, 'session/turnComplete'));
        const result = await client.call('fetchTurns', { session: sessionUri, limit: 10 });
        assert.ok(result.turns.length >= 2);
        assert.strictEqual(typeof result.hasMore, 'boolean');
    });
    // ---- Gap tests: coverage ---------------------------------------------------
    test('dispose session sends sessionRemoved notification', async function () {
        this.timeout(10_000);
        const sessionUri = await createAndSubscribeSession(client, 'test-dispose');
        await client.call('disposeSession', { session: sessionUri });
        const notif = await client.waitForNotification(n => n.method === 'notification' && n.params.notification.type === 'notify/sessionRemoved');
        const removed = notif.params.notification;
        assert.strictEqual(removed.session.toString(), sessionUri.toString());
    });
    test('cancel turn stops in-progress processing', async function () {
        this.timeout(10_000);
        const sessionUri = await createAndSubscribeSession(client, 'test-cancel');
        dispatchTurnStarted(client, sessionUri, 'turn-cancel', 'slow', 1);
        client.notify('dispatchAction', {
            clientSeq: 2,
            action: { type: 'session/turnCancelled', session: sessionUri, turnId: 'turn-cancel' },
        });
        await client.waitForNotification(n => isActionNotification(n, 'session/turnCancelled'));
        const snapshot = await client.call('subscribe', { resource: sessionUri });
        const state = snapshot.snapshot.state;
        assert.ok(state.turns.length >= 1);
        assert.strictEqual(state.turns[state.turns.length - 1].state, 'cancelled');
    });
    test('multiple sequential turns accumulate in history', async function () {
        this.timeout(15_000);
        const sessionUri = await createAndSubscribeSession(client, 'test-multi-turns');
        dispatchTurnStarted(client, sessionUri, 'turn-m1', 'hello', 1);
        await client.waitForNotification(n => isActionNotification(n, 'session/turnComplete'));
        dispatchTurnStarted(client, sessionUri, 'turn-m2', 'hello', 2);
        await new Promise(resolve => setTimeout(resolve, 200));
        await client.waitForNotification(n => isActionNotification(n, 'session/turnComplete'));
        const snapshot = await client.call('subscribe', { resource: sessionUri });
        const state = snapshot.snapshot.state;
        assert.ok(state.turns.length >= 2, `expected >= 2 turns but got ${state.turns.length}`);
        assert.strictEqual(state.turns[0].id, 'turn-m1');
        assert.strictEqual(state.turns[1].id, 'turn-m2');
    });
    test('two clients on same session both see actions', async function () {
        this.timeout(10_000);
        const sessionUri = await createAndSubscribeSession(client, 'test-multi-client-1');
        const client2 = new TestProtocolClient(server.port);
        await client2.connect();
        await client2.call('initialize', { protocolVersion: PROTOCOL_VERSION, clientId: 'test-multi-client-2' });
        await client2.call('subscribe', { resource: sessionUri });
        client2.clearReceived();
        dispatchTurnStarted(client, sessionUri, 'turn-mc', 'hello', 1);
        const d1 = await client.waitForNotification(n => isActionNotification(n, 'session/delta'));
        const d2 = await client2.waitForNotification(n => isActionNotification(n, 'session/delta'));
        assert.ok(d1);
        assert.ok(d2);
        await client.waitForNotification(n => isActionNotification(n, 'session/turnComplete'));
        await client2.waitForNotification(n => isActionNotification(n, 'session/turnComplete'));
        client2.close();
    });
    test('unsubscribe stops receiving session actions', async function () {
        this.timeout(10_000);
        const sessionUri = await createAndSubscribeSession(client, 'test-unsubscribe');
        client.notify('unsubscribe', { resource: sessionUri });
        await new Promise(resolve => setTimeout(resolve, 100));
        client.clearReceived();
        const client2 = new TestProtocolClient(server.port);
        await client2.connect();
        await client2.call('initialize', { protocolVersion: PROTOCOL_VERSION, clientId: 'test-unsub-helper' });
        await client2.call('subscribe', { resource: sessionUri });
        dispatchTurnStarted(client2, sessionUri, 'turn-unsub', 'hello', 1);
        await client2.waitForNotification(n => isActionNotification(n, 'session/turnComplete'));
        await new Promise(resolve => setTimeout(resolve, 300));
        const sessionActions = client.receivedNotifications(n => isActionNotification(n, 'session/'));
        assert.strictEqual(sessionActions.length, 0, 'unsubscribed client should not receive session actions');
        client2.close();
    });
    test('change model within session updates state', async function () {
        this.timeout(10_000);
        const sessionUri = await createAndSubscribeSession(client, 'test-change-model');
        client.notify('dispatchAction', {
            clientSeq: 1,
            action: { type: 'session/modelChanged', session: sessionUri, model: 'new-mock-model' },
        });
        const modelChanged = await client.waitForNotification(n => isActionNotification(n, 'session/modelChanged'));
        const action = getActionEnvelope(modelChanged).action;
        assert.strictEqual(action.type, 'session/modelChanged');
        if (action.type === 'session/modelChanged') {
            assert.strictEqual(action.model, 'new-mock-model');
        }
        const snapshot = await client.call('subscribe', { resource: sessionUri });
        const state = snapshot.snapshot.state;
        assert.strictEqual(state.summary.model, 'new-mock-model');
    });
    test('malformed JSON message returns parse error', async function () {
        this.timeout(10_000);
        const raw = new TestProtocolClient(server.port);
        await raw.connect();
        const responsePromise = raw.waitForRawMessage();
        raw.sendRaw('this is not valid json{{{');
        const response = await responsePromise;
        assert.strictEqual(response.jsonrpc, '2.0');
        assert.strictEqual(response.id, null);
        assert.strictEqual(response.error.code, JSON_RPC_PARSE_ERROR);
        raw.close();
    });
});
//# sourceMappingURL=protocolWebSocket.integrationTest.js.map