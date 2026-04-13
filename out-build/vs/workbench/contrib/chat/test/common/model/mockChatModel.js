/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Emitter } from '../../../../../../base/common/event.js';
import { Disposable } from '../../../../../../base/common/lifecycle.js';
import { observableValue } from '../../../../../../base/common/observable.js';
import { ChatAgentLocation } from '../../../common/constants.js';
export class MockChatModel extends Disposable {
    constructor(sessionResource) {
        super();
        this.sessionResource = sessionResource;
        this.onDidDispose = this._register(new Emitter()).event;
        this.onDidChange = this._register(new Emitter()).event;
        this.sessionId = '';
        this.timestamp = 0;
        this.timing = { created: Date.now(), lastRequestStarted: undefined, lastRequestEnded: undefined };
        this.initialLocation = ChatAgentLocation.Chat;
        this.title = '';
        this.hasCustomTitle = false;
        this.lastMessageDate = Date.now();
        this.creationDate = Date.now();
        this.requests = [];
        this.requestInProgress = observableValue('requestInProgress', false);
        this.requestNeedsInput = observableValue('requestNeedsInput', undefined);
        this.inputPlaceholder = undefined;
        this.editingSession = undefined;
        this.checkpoint = undefined;
        this.willKeepAlive = true;
        this.responderUsername = 'agent';
        this.inputModel = {
            state: observableValue('inputModelState', undefined),
            setState: () => { },
            clearState: () => { },
            toJSON: () => undefined
        };
        this.contributedChatSession = undefined;
        this.repoData = undefined;
        this.isDisposed = false;
        this.hasRequests = false;
        this.onDidChangePendingRequests = this._register(new Emitter()).event;
        this.lastRequest = undefined;
        this.lastRequestObs = observableValue('lastRequest', undefined);
    }
    setContributedChatSession(session) {
        throw new Error('Method not implemented.');
    }
    dispose() {
        this.isDisposed = true;
        super.dispose();
    }
    startEditingSession(isGlobalEditingSession, transferFromSession) { }
    getRequests() { return []; }
    setCheckpoint(requestId) { }
    setRepoData(data) { this.repoData = data; }
    getPendingRequests() { return []; }
    toExport() {
        return {
            initialLocation: this.initialLocation,
            requests: [],
            responderUsername: '',
        };
    }
    toJSON() {
        return {
            version: 3,
            sessionId: this.sessionId,
            creationDate: this.timestamp,
            customTitle: this.customTitle,
            initialLocation: this.initialLocation,
            requests: [],
            responderUsername: '',
            repoData: this.repoData
        };
    }
}
//# sourceMappingURL=mockChatModel.js.map