/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
// Client-side state manager for the sessions process protocol.
// See protocol.md -> Write-ahead reconciliation for the full design.
//
// Manages confirmed state (last server-acknowledged), pending actions queue
// (optimistically applied), and reconciliation when the server echoes back
// or sends concurrent actions from other sources.
//
// This operates on two kinds of subscribable state:
//   - Root state (agents + their models) — server-only mutations, no write-ahead.
//   - Session state — mixed: some actions client-sendable (write-ahead),
//     others server-only.
import { Emitter } from '../../../../base/common/event.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { URI } from '../../../../base/common/uri.js';
import { isRootAction, isSessionAction } from './sessionActions.js';
import { rootReducer, sessionReducer } from './sessionReducers.js';
import { ROOT_STATE_URI } from './sessionState.js';
// ---- Client state manager ---------------------------------------------------
/**
 * Manages the client's local view of the state tree with write-ahead
 * reconciliation. The client can optimistically apply its own session
 * actions and reconcile when the server echoes them back (possibly
 * interleaved with actions from other clients or the server).
 *
 * Usage:
 * 1. Call `handleSnapshot(resource, state, fromSeq)` for each snapshot
 *    from the handshake or a subscribe response.
 * 2. Call `applyOptimistic(action)` when the user does something
 *    (returns a clientSeq for the command).
 * 3. Call `receiveEnvelope(envelope)` for each action from the server.
 * 4. Call `receiveNotification(notification)` for each notification.
 * 5. Read `rootState` / `getSessionState(uri)` for the current view.
 */
export class SessionClientState extends Disposable {
    constructor(clientId, logService) {
        super();
        this._nextClientSeq = 1;
        this._lastSeenServerSeq = 0;
        this._confirmedSessionStates = new Map();
        // Pending session actions (root actions are server-only, never pending)
        this._pendingActions = [];
        this._optimisticSessionStates = new Map();
        this._onDidChangeRootState = this._register(new Emitter());
        this.onDidChangeRootState = this._onDidChangeRootState.event;
        this._onDidChangeSessionState = this._register(new Emitter());
        this.onDidChangeSessionState = this._onDidChangeSessionState.event;
        this._onDidReceiveNotification = this._register(new Emitter());
        this.onDidReceiveNotification = this._onDidReceiveNotification.event;
        this._clientId = clientId;
        this._log = msg => logService.warn(`[SessionClientState] ${msg}`);
    }
    get clientId() {
        return this._clientId;
    }
    get lastSeenServerSeq() {
        return this._lastSeenServerSeq;
    }
    /** Current root state, or undefined if not yet subscribed. */
    get rootState() {
        return this._optimisticRootState;
    }
    /** Current optimistic session state, or undefined if not subscribed. */
    getSessionState(session) {
        return this._optimisticSessionStates.get(session);
    }
    /** URIs of sessions the client is currently subscribed to. */
    get subscribedSessions() {
        return [...this._confirmedSessionStates.keys()].map(k => URI.parse(k));
    }
    // ---- Snapshot handling ---------------------------------------------------
    /**
     * Apply a state snapshot received from the server (from handshake,
     * subscribe response, or reconnection).
     */
    handleSnapshot(resource, state, fromSeq) {
        this._lastSeenServerSeq = Math.max(this._lastSeenServerSeq, fromSeq);
        if (resource === ROOT_STATE_URI) {
            const rootState = state;
            this._confirmedRootState = rootState;
            this._optimisticRootState = rootState;
            this._onDidChangeRootState.fire(rootState);
        }
        else {
            const sessionState = state;
            this._confirmedSessionStates.set(resource, sessionState);
            this._optimisticSessionStates.set(resource, sessionState);
            // Re-apply any pending session actions for this session
            this._recomputeOptimisticSession(resource);
            this._onDidChangeSessionState.fire({
                session: resource,
                state: this._optimisticSessionStates.get(resource),
            });
        }
    }
    /**
     * Unsubscribe from a resource, dropping its local state.
     */
    unsubscribe(resource) {
        if (resource === ROOT_STATE_URI) {
            this._confirmedRootState = undefined;
            this._optimisticRootState = undefined;
        }
        else {
            this._confirmedSessionStates.delete(resource);
            this._optimisticSessionStates.delete(resource);
            // Remove pending actions for this session
            for (let i = this._pendingActions.length - 1; i >= 0; i--) {
                const action = this._pendingActions[i].action;
                if (isSessionAction(action) && action.session === resource) {
                    this._pendingActions.splice(i, 1);
                }
            }
        }
    }
    // ---- Write-ahead --------------------------------------------------------
    /**
     * Optimistically apply a session action locally. Returns the clientSeq
     * that should be sent to the server with the corresponding command so
     * the server can echo it back for reconciliation.
     *
     * Only session actions can be write-ahead (root actions are server-only).
     */
    applyOptimistic(action) {
        const clientSeq = this._nextClientSeq++;
        this._pendingActions.push({ clientSeq, action });
        this._applySessionToOptimistic(action);
        return clientSeq;
    }
    // ---- Receiving server messages ------------------------------------------
    /**
     * Process an action envelope received from the server.
     * This is the core reconciliation algorithm.
     */
    receiveEnvelope(envelope) {
        this._lastSeenServerSeq = Math.max(this._lastSeenServerSeq, envelope.serverSeq);
        const origin = envelope.origin;
        const isOwnAction = origin !== undefined && origin.clientId === this._clientId;
        if (isOwnAction) {
            const headIdx = this._pendingActions.findIndex(p => p.clientSeq === origin.clientSeq);
            if (headIdx !== -1) {
                if (envelope.rejectionReason) {
                    this._pendingActions.splice(headIdx, 1);
                }
                else {
                    this._applyToConfirmed(envelope.action);
                    this._pendingActions.splice(headIdx, 1);
                }
            }
            else {
                this._applyToConfirmed(envelope.action);
            }
        }
        else {
            this._applyToConfirmed(envelope.action);
        }
        // Recompute optimistic state from confirmed + remaining pending
        this._recomputeOptimistic(envelope.action);
    }
    /**
     * Process an ephemeral notification from the server.
     * Not stored in state — just forwarded to listeners.
     */
    receiveNotification(notification) {
        this._onDidReceiveNotification.fire(notification);
    }
    // ---- Internal state management ------------------------------------------
    _applyToConfirmed(action) {
        if (isRootAction(action) && this._confirmedRootState) {
            this._confirmedRootState = rootReducer(this._confirmedRootState, action, this._log);
        }
        if (isSessionAction(action)) {
            const key = action.session.toString();
            const state = this._confirmedSessionStates.get(key);
            if (state) {
                this._confirmedSessionStates.set(key, sessionReducer(state, action, this._log));
            }
        }
    }
    _applySessionToOptimistic(action) {
        const key = action.session.toString();
        const state = this._optimisticSessionStates.get(key);
        if (state) {
            const newState = sessionReducer(state, action, this._log);
            this._optimisticSessionStates.set(key, newState);
            this._onDidChangeSessionState.fire({ session: action.session, state: newState });
        }
    }
    /**
     * After applying a server action to confirmed state, recompute optimistic
     * state by replaying pending actions on top of confirmed.
     */
    _recomputeOptimistic(triggerAction) {
        // Root state: no pending actions (server-only), so optimistic = confirmed
        if (isRootAction(triggerAction) && this._confirmedRootState) {
            this._optimisticRootState = this._confirmedRootState;
            this._onDidChangeRootState.fire(this._confirmedRootState);
        }
        // Session states: recompute only affected sessions
        if (isSessionAction(triggerAction)) {
            this._recomputeOptimisticSession(triggerAction.session);
        }
        // Also recompute any sessions that have pending actions
        const affectedKeys = new Set();
        for (const pending of this._pendingActions) {
            if (isSessionAction(pending.action)) {
                affectedKeys.add(pending.action.session.toString());
            }
        }
        for (const key of affectedKeys) {
            this._recomputeOptimisticSession(key);
        }
    }
    _recomputeOptimisticSession(session) {
        const confirmed = this._confirmedSessionStates.get(session);
        if (!confirmed) {
            return;
        }
        let state = confirmed;
        for (const pending of this._pendingActions) {
            if (isSessionAction(pending.action) && pending.action.session === session) {
                state = sessionReducer(state, pending.action, this._log);
            }
        }
        this._optimisticSessionStates.set(session, state);
        this._onDidChangeSessionState.fire({ session, state });
    }
}
//# sourceMappingURL=sessionClientState.js.map