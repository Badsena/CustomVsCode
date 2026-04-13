/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Emitter } from '../../../../../../base/common/event.js';
import { Disposable } from '../../../../../../base/common/lifecycle.js';
import { createDecorator } from '../../../../../../platform/instantiation/common/instantiation.js';
//#region Agent Status Mode
export var AgentStatusMode;
(function (AgentStatusMode) {
    /** Default mode showing workspace name + session stats */
    AgentStatusMode["Default"] = "default";
    /** Session ready mode showing session title + Enter button (before entering projection) */
    AgentStatusMode["SessionReady"] = "sessionReady";
    /** Session mode showing session title + Esc button (inside projection) */
    AgentStatusMode["Session"] = "session";
})(AgentStatusMode || (AgentStatusMode = {}));
export const IAgentTitleBarStatusService = createDecorator('agentTitleBarStatusService');
//#endregion
//#region Agent Status Service Implementation
export class AgentTitleBarStatusService extends Disposable {
    constructor() {
        super(...arguments);
        this._mode = AgentStatusMode.Default;
        this._onDidChangeMode = this._register(new Emitter());
        this.onDidChangeMode = this._onDidChangeMode.event;
        this._onDidChangeSessionInfo = this._register(new Emitter());
        this.onDidChangeSessionInfo = this._onDidChangeSessionInfo.event;
    }
    get mode() { return this._mode; }
    get sessionInfo() { return this._sessionInfo; }
    enterSessionMode(sessionResource, title) {
        const newInfo = { sessionResource, title };
        const modeChanged = this._mode !== AgentStatusMode.Session;
        this._mode = AgentStatusMode.Session;
        this._sessionInfo = newInfo;
        if (modeChanged) {
            this._onDidChangeMode.fire(this._mode);
        }
        this._onDidChangeSessionInfo.fire(this._sessionInfo);
    }
    enterSessionReadyMode(sessionResource, title) {
        const newInfo = { sessionResource, title };
        const modeChanged = this._mode !== AgentStatusMode.SessionReady;
        this._mode = AgentStatusMode.SessionReady;
        this._sessionInfo = newInfo;
        if (modeChanged) {
            this._onDidChangeMode.fire(this._mode);
        }
        this._onDidChangeSessionInfo.fire(this._sessionInfo);
    }
    exitSessionReadyMode() {
        // Only exit if we're in SessionReady mode (don't exit from Session mode)
        if (this._mode !== AgentStatusMode.SessionReady) {
            return;
        }
        this._mode = AgentStatusMode.Default;
        this._sessionInfo = undefined;
        this._onDidChangeMode.fire(this._mode);
        this._onDidChangeSessionInfo.fire(undefined);
    }
    exitSessionMode() {
        if (this._mode === AgentStatusMode.Default) {
            return;
        }
        this._mode = AgentStatusMode.Default;
        this._sessionInfo = undefined;
        this._onDidChangeMode.fire(this._mode);
        this._onDidChangeSessionInfo.fire(undefined);
    }
    updateSessionTitle(title) {
        if (this._mode !== AgentStatusMode.Session || !this._sessionInfo) {
            return;
        }
        this._sessionInfo = { ...this._sessionInfo, title };
        this._onDidChangeSessionInfo.fire(this._sessionInfo);
    }
}
//#endregion
//# sourceMappingURL=agentTitleBarStatusService.js.map