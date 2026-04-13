/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Emitter } from '../../../../base/common/event.js';
import { AgentSession } from '../../common/agentService.js';
/**
 * General-purpose mock agent for unit tests. Tracks all method calls
 * for assertion and exposes {@link fireProgress} to inject progress events.
 */
export class MockAgent {
    constructor(id = 'mock') {
        this.id = id;
        this._onDidSessionProgress = new Emitter();
        this.onDidSessionProgress = this._onDidSessionProgress.event;
        this._sessions = new Map();
        this._nextId = 1;
        this.setAuthTokenCalls = [];
        this.sendMessageCalls = [];
        this.disposeSessionCalls = [];
        this.abortSessionCalls = [];
        this.respondToPermissionCalls = [];
        this.changeModelCalls = [];
    }
    getDescriptor() {
        return { provider: this.id, displayName: `Agent ${this.id}`, description: `Test ${this.id} agent`, requiresAuth: this.id === 'copilot' };
    }
    async listModels() {
        return [{ provider: this.id, id: `${this.id}-model`, name: `${this.id} Model`, maxContextWindow: 128000, supportsVision: false, supportsReasoningEffort: false }];
    }
    async listSessions() {
        return [...this._sessions.values()].map(s => ({ session: s, startTime: Date.now(), modifiedTime: Date.now() }));
    }
    async createSession(_config) {
        const rawId = `${this.id}-session-${this._nextId++}`;
        const session = AgentSession.uri(this.id, rawId);
        this._sessions.set(rawId, session);
        return session;
    }
    async sendMessage(session, prompt) {
        this.sendMessageCalls.push({ session, prompt });
    }
    async getSessionMessages(_session) {
        return [];
    }
    async disposeSession(session) {
        this.disposeSessionCalls.push(session);
        this._sessions.delete(AgentSession.id(session));
    }
    async abortSession(session) {
        this.abortSessionCalls.push(session);
    }
    respondToPermissionRequest(requestId, approved) {
        this.respondToPermissionCalls.push({ requestId, approved });
    }
    async changeModel(session, model) {
        this.changeModelCalls.push({ session, model });
    }
    async setAuthToken(token) {
        this.setAuthTokenCalls.push(token);
    }
    async shutdown() { }
    fireProgress(event) {
        this._onDidSessionProgress.fire(event);
    }
    dispose() {
        this._onDidSessionProgress.dispose();
    }
}
export class ScriptedMockAgent {
    constructor() {
        this.id = 'mock';
        this._onDidSessionProgress = new Emitter();
        this.onDidSessionProgress = this._onDidSessionProgress.event;
        this._sessions = new Map();
        this._nextId = 1;
        // Track pending permission requests
        this._pendingPermissions = new Map();
        // Track pending abort callbacks for slow responses
        this._pendingAborts = new Map();
    }
    getDescriptor() {
        return { provider: 'mock', displayName: 'Mock Agent', description: 'Scripted test agent', requiresAuth: false };
    }
    async listModels() {
        return [{ provider: 'mock', id: 'mock-model', name: 'Mock Model', maxContextWindow: 128000, supportsVision: false, supportsReasoningEffort: false }];
    }
    async listSessions() {
        return [...this._sessions.values()].map(s => ({ session: s, startTime: Date.now(), modifiedTime: Date.now() }));
    }
    async createSession(_config) {
        const rawId = `mock-session-${this._nextId++}`;
        const session = AgentSession.uri('mock', rawId);
        this._sessions.set(rawId, session);
        return session;
    }
    async sendMessage(session, prompt, _attachments) {
        switch (prompt) {
            case 'hello':
                this._fireSequence(session, [
                    { type: 'delta', session, messageId: 'msg-1', content: 'Hello, world!' },
                    { type: 'idle', session },
                ]);
                break;
            case 'use-tool':
                this._fireSequence(session, [
                    { type: 'tool_start', session, toolCallId: 'tc-1', toolName: 'echo_tool', displayName: 'Echo Tool', invocationMessage: 'Running echo tool...' },
                    { type: 'tool_complete', session, toolCallId: 'tc-1', success: true, pastTenseMessage: 'Ran echo tool', toolOutput: 'echoed' },
                    { type: 'delta', session, messageId: 'msg-1', content: 'Tool done.' },
                    { type: 'idle', session },
                ]);
                break;
            case 'error':
                this._fireSequence(session, [
                    { type: 'error', session, errorType: 'test_error', message: 'Something went wrong' },
                ]);
                break;
            case 'permission': {
                // Fire permission_request, then wait for respondToPermissionRequest
                const permEvent = {
                    type: 'permission_request',
                    session,
                    requestId: 'perm-1',
                    permissionKind: "shell" /* PermissionKind.Shell */,
                    fullCommandText: 'echo test',
                    intention: 'Run a test command',
                    rawRequest: JSON.stringify({ permissionKind: "shell" /* PermissionKind.Shell */, fullCommandText: 'echo test', intention: 'Run a test command' }),
                };
                setTimeout(() => this._onDidSessionProgress.fire(permEvent), 10);
                this._pendingPermissions.set('perm-1', (approved) => {
                    if (approved) {
                        this._fireSequence(session, [
                            { type: 'delta', session, messageId: 'msg-1', content: 'Allowed.' },
                            { type: 'idle', session },
                        ]);
                    }
                });
                break;
            }
            case 'with-usage':
                this._fireSequence(session, [
                    { type: 'delta', session, messageId: 'msg-1', content: 'Usage response.' },
                    { type: 'usage', session, inputTokens: 100, outputTokens: 50, model: 'mock-model' },
                    { type: 'idle', session },
                ]);
                break;
            case 'slow': {
                // Slow response for cancel testing — fires delta after a long delay
                const timer = setTimeout(() => {
                    this._fireSequence(session, [
                        { type: 'delta', session, messageId: 'msg-1', content: 'Slow response.' },
                        { type: 'idle', session },
                    ]);
                }, 5000);
                this._pendingAborts.set(session.toString(), () => clearTimeout(timer));
                break;
            }
            default:
                this._fireSequence(session, [
                    { type: 'delta', session, messageId: 'msg-1', content: 'Unknown prompt: ' + prompt },
                    { type: 'idle', session },
                ]);
                break;
        }
    }
    async getSessionMessages(_session) {
        return [];
    }
    async disposeSession(session) {
        this._sessions.delete(AgentSession.id(session));
    }
    async abortSession(session) {
        const callback = this._pendingAborts.get(session.toString());
        if (callback) {
            this._pendingAborts.delete(session.toString());
            callback();
        }
    }
    async changeModel(_session, _model) {
        // Mock agent doesn't track model state
    }
    respondToPermissionRequest(requestId, approved) {
        const callback = this._pendingPermissions.get(requestId);
        if (callback) {
            this._pendingPermissions.delete(requestId);
            callback(approved);
        }
    }
    async setAuthToken(_token) { }
    async shutdown() { }
    dispose() {
        this._onDidSessionProgress.dispose();
    }
    _fireSequence(session, events) {
        let delay = 0;
        for (const event of events) {
            delay += 10;
            setTimeout(() => this._onDidSessionProgress.fire(event), delay);
        }
    }
}
//# sourceMappingURL=mockAgent.js.map