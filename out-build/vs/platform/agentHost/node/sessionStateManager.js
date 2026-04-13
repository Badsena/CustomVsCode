/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
import { Emitter } from '../../../base/common/event.js';
import { Disposable } from '../../../base/common/lifecycle.js';
import { ILogService } from '../../log/common/log.js';
import { isRootAction, isSessionAction } from '../common/state/sessionActions.js';
import { rootReducer, sessionReducer } from '../common/state/sessionReducers.js';
import { createRootState, createSessionState, ROOT_STATE_URI } from '../common/state/sessionState.js';
/**
 * Server-side state manager for the sessions process protocol.
 *
 * Maintains the authoritative state tree (root + per-session), applies actions
 * through pure reducers, assigns monotonic sequence numbers, and emits
 * {@link IActionEnvelope}s for subscribed clients.
 */
let SessionStateManager = class SessionStateManager extends Disposable {
    constructor(_logService) {
        super();
        this._logService = _logService;
        this._serverSeq = 0;
        this._sessionStates = new Map();
        /** Tracks which session URI each active turn belongs to, keyed by turnId. */
        this._activeTurnToSession = new Map();
        this._onDidEmitEnvelope = this._register(new Emitter());
        this.onDidEmitEnvelope = this._onDidEmitEnvelope.event;
        this._onDidEmitNotification = this._register(new Emitter());
        this.onDidEmitNotification = this._onDidEmitNotification.event;
        this._log = (msg) => this._logService.warn(`[SessionStateManager] ${msg}`);
        this._rootState = createRootState();
    }
    get hasActiveSessions() {
        return this._activeTurnToSession.size > 0;
    }
    // ---- State accessors ----------------------------------------------------
    get rootState() {
        return this._rootState;
    }
    getSessionState(session) {
        return this._sessionStates.get(session);
    }
    get serverSeq() {
        return this._serverSeq;
    }
    // ---- Snapshots ----------------------------------------------------------
    /**
     * Returns a state snapshot for a given resource URI.
     * The `fromSeq` in the snapshot is the current serverSeq at snapshot time;
     * the client should process subsequent envelopes with serverSeq > fromSeq.
     */
    getSnapshot(resource) {
        if (resource === ROOT_STATE_URI) {
            return {
                resource,
                state: this._rootState,
                fromSeq: this._serverSeq,
            };
        }
        const sessionState = this._sessionStates.get(resource);
        if (!sessionState) {
            return undefined;
        }
        return {
            resource,
            state: sessionState,
            fromSeq: this._serverSeq,
        };
    }
    // ---- Session lifecycle --------------------------------------------------
    /**
     * Creates a new session in state with `lifecycle: 'creating'`.
     * Returns the initial session state.
     */
    createSession(summary) {
        const key = summary.resource;
        if (this._sessionStates.has(key)) {
            this._logService.warn(`[SessionStateManager] Session already exists: ${key}`);
            return this._sessionStates.get(key);
        }
        const state = createSessionState(summary);
        this._sessionStates.set(key, state);
        this._logService.trace(`[SessionStateManager] Created session: ${key}`);
        this._onDidEmitNotification.fire({
            type: "notify/sessionAdded" /* NotificationType.SessionAdded */,
            summary,
        });
        return state;
    }
    /**
     * Removes a session from state and emits a sessionRemoved notification.
     */
    removeSession(session) {
        const state = this._sessionStates.get(session);
        if (!state) {
            return;
        }
        // Clean up active turn tracking
        if (state.activeTurn) {
            this._activeTurnToSession.delete(state.activeTurn.id);
        }
        this._sessionStates.delete(session);
        this._logService.trace(`[SessionStateManager] Removed session: ${session}`);
        this._onDidEmitNotification.fire({
            type: "notify/sessionRemoved" /* NotificationType.SessionRemoved */,
            session,
        });
    }
    // ---- Turn tracking ------------------------------------------------------
    /**
     * Registers a mapping from turnId to session URI so that incoming
     * provider events (which carry only session URI) can be associated
     * with the correct active turn.
     */
    getActiveTurnId(session) {
        const state = this._sessionStates.get(session);
        return state?.activeTurn?.id;
    }
    // ---- Action dispatch ----------------------------------------------------
    /**
     * Dispatch a server-originated action (from the agent backend).
     * The action is applied to state via the reducer and emitted as an
     * envelope with no origin (server-produced).
     */
    dispatchServerAction(action) {
        this._applyAndEmit(action, undefined);
    }
    /**
     * Dispatch a client-originated action (write-ahead from a renderer).
     * The action is applied to state and emitted with the client's origin
     * so the originating client can reconcile.
     */
    dispatchClientAction(action, origin) {
        return this._applyAndEmit(action, origin);
    }
    // ---- Internal -----------------------------------------------------------
    _applyAndEmit(action, origin) {
        let resultingState = undefined;
        // Apply to state
        if (isRootAction(action)) {
            this._rootState = rootReducer(this._rootState, action, this._log);
            resultingState = this._rootState;
        }
        if (isSessionAction(action)) {
            const sessionAction = action;
            const key = sessionAction.session;
            const state = this._sessionStates.get(key);
            if (state) {
                const newState = sessionReducer(state, sessionAction, this._log);
                this._sessionStates.set(key, newState);
                // Track active turn for turn lifecycle
                if (sessionAction.type === "session/turnStarted" /* ActionType.SessionTurnStarted */) {
                    this._activeTurnToSession.set(sessionAction.turnId, key);
                    this.dispatchServerAction({ type: "root/activeSessionsChanged" /* ActionType.RootActiveSessionsChanged */, activeSessions: this._activeTurnToSession.size });
                }
                else if (sessionAction.type === "session/turnComplete" /* ActionType.SessionTurnComplete */ ||
                    sessionAction.type === "session/turnCancelled" /* ActionType.SessionTurnCancelled */ ||
                    sessionAction.type === "session/error" /* ActionType.SessionError */) {
                    this._activeTurnToSession.delete(sessionAction.turnId);
                    this.dispatchServerAction({ type: "root/activeSessionsChanged" /* ActionType.RootActiveSessionsChanged */, activeSessions: this._activeTurnToSession.size });
                }
                resultingState = newState;
            }
            else {
                this._logService.warn(`[SessionStateManager] Action for unknown session: ${key}, type=${action.type}`);
            }
        }
        // Emit envelope
        const envelope = {
            action,
            serverSeq: ++this._serverSeq,
            origin,
        };
        this._logService.trace(`[SessionStateManager] Emitting envelope: seq=${envelope.serverSeq}, type=${action.type}${origin ? `, origin=${origin.clientId}:${origin.clientSeq}` : ''}`);
        this._onDidEmitEnvelope.fire(envelope);
        return resultingState;
    }
};
SessionStateManager = __decorate([
    __param(0, ILogService)
], SessionStateManager);
export { SessionStateManager };
//# sourceMappingURL=sessionStateManager.js.map