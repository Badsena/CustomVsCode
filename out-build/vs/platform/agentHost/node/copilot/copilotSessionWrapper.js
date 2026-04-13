/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Emitter } from '../../../../base/common/event.js';
import { Disposable, toDisposable } from '../../../../base/common/lifecycle.js';
/**
 * Thin wrapper around {@link CopilotSession} that exposes each SDK event as a
 * proper VS Code `Event<T>`. All subscriptions and the underlying SDK session
 * are cleaned up on dispose.
 */
export class CopilotSessionWrapper extends Disposable {
    constructor(session) {
        super();
        this.session = session;
        this._register(toDisposable(() => {
            session.destroy().catch(() => { });
        }));
    }
    get sessionId() { return this.session.sessionId; }
    get onMessageDelta() {
        return this._onMessageDelta ??= this._sdkEvent('assistant.message_delta');
    }
    get onMessage() {
        return this._onMessage ??= this._sdkEvent('assistant.message');
    }
    get onToolStart() {
        return this._onToolStart ??= this._sdkEvent('tool.execution_start');
    }
    get onToolComplete() {
        return this._onToolComplete ??= this._sdkEvent('tool.execution_complete');
    }
    get onIdle() {
        return this._onIdle ??= this._sdkEvent('session.idle');
    }
    get onSessionStart() {
        return this._onSessionStart ??= this._sdkEvent('session.start');
    }
    get onSessionResume() {
        return this._onSessionResume ??= this._sdkEvent('session.resume');
    }
    get onSessionError() {
        return this._onSessionError ??= this._sdkEvent('session.error');
    }
    get onSessionInfo() {
        return this._onSessionInfo ??= this._sdkEvent('session.info');
    }
    get onSessionModelChange() {
        return this._onSessionModelChange ??= this._sdkEvent('session.model_change');
    }
    get onSessionHandoff() {
        return this._onSessionHandoff ??= this._sdkEvent('session.handoff');
    }
    get onSessionTruncation() {
        return this._onSessionTruncation ??= this._sdkEvent('session.truncation');
    }
    get onSessionSnapshotRewind() {
        return this._onSessionSnapshotRewind ??= this._sdkEvent('session.snapshot_rewind');
    }
    get onSessionShutdown() {
        return this._onSessionShutdown ??= this._sdkEvent('session.shutdown');
    }
    get onSessionUsageInfo() {
        return this._onSessionUsageInfo ??= this._sdkEvent('session.usage_info');
    }
    get onSessionCompactionStart() {
        return this._onSessionCompactionStart ??= this._sdkEvent('session.compaction_start');
    }
    get onSessionCompactionComplete() {
        return this._onSessionCompactionComplete ??= this._sdkEvent('session.compaction_complete');
    }
    get onUserMessage() {
        return this._onUserMessage ??= this._sdkEvent('user.message');
    }
    get onPendingMessagesModified() {
        return this._onPendingMessagesModified ??= this._sdkEvent('pending_messages.modified');
    }
    get onTurnStart() {
        return this._onTurnStart ??= this._sdkEvent('assistant.turn_start');
    }
    get onIntent() {
        return this._onIntent ??= this._sdkEvent('assistant.intent');
    }
    get onReasoning() {
        return this._onReasoning ??= this._sdkEvent('assistant.reasoning');
    }
    get onReasoningDelta() {
        return this._onReasoningDelta ??= this._sdkEvent('assistant.reasoning_delta');
    }
    get onTurnEnd() {
        return this._onTurnEnd ??= this._sdkEvent('assistant.turn_end');
    }
    get onUsage() {
        return this._onUsage ??= this._sdkEvent('assistant.usage');
    }
    get onAbort() {
        return this._onAbort ??= this._sdkEvent('abort');
    }
    get onToolUserRequested() {
        return this._onToolUserRequested ??= this._sdkEvent('tool.user_requested');
    }
    get onToolPartialResult() {
        return this._onToolPartialResult ??= this._sdkEvent('tool.execution_partial_result');
    }
    get onToolProgress() {
        return this._onToolProgress ??= this._sdkEvent('tool.execution_progress');
    }
    get onSkillInvoked() {
        return this._onSkillInvoked ??= this._sdkEvent('skill.invoked');
    }
    get onSubagentStarted() {
        return this._onSubagentStarted ??= this._sdkEvent('subagent.started');
    }
    get onSubagentCompleted() {
        return this._onSubagentCompleted ??= this._sdkEvent('subagent.completed');
    }
    get onSubagentFailed() {
        return this._onSubagentFailed ??= this._sdkEvent('subagent.failed');
    }
    get onSubagentSelected() {
        return this._onSubagentSelected ??= this._sdkEvent('subagent.selected');
    }
    get onHookStart() {
        return this._onHookStart ??= this._sdkEvent('hook.start');
    }
    get onHookEnd() {
        return this._onHookEnd ??= this._sdkEvent('hook.end');
    }
    get onSystemMessage() {
        return this._onSystemMessage ??= this._sdkEvent('system.message');
    }
    _sdkEvent(eventType) {
        const emitter = this._register(new Emitter());
        const unsubscribe = this.session.on(eventType, (data) => emitter.fire(data));
        this._register(toDisposable(unsubscribe));
        return emitter.event;
    }
}
//# sourceMappingURL=copilotSessionWrapper.js.map