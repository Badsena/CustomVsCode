/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Emitter, Event } from '../../../../../../base/common/event.js';
import { ResourceMap } from '../../../../../../base/common/map.js';
import { observableValue } from '../../../../../../base/common/observable.js';
import { URI } from '../../../../../../base/common/uri.js';
export class MockChatService {
    constructor() {
        this._chatModels = observableValue('chatModels', []);
        this.chatModels = this._chatModels;
        this.requestInProgressObs = observableValue('name', false);
        this.editingSessions = [];
        this.transferredSessionResource = undefined;
        this.onDidSubmitRequest = Event.None;
        this.onDidCreateModel = Event.None;
        this.sessions = new ResourceMap();
        this.liveSessionItems = [];
        this.historySessionItems = [];
        this._onDidDisposeSession = new Emitter();
        this.onDidDisposeSession = this._onDidDisposeSession.event;
        this.onDidPerformUserAction = Event.None;
        this.onDidReceiveQuestionCarouselAnswer = Event.None;
    }
    fireDidDisposeSession(sessionResource) {
        this._onDidDisposeSession.fire({ sessionResource, reason: 'cleared' });
    }
    setSaveModelsEnabled(enabled) {
    }
    processPendingRequests(sessionResource) {
    }
    setLiveSessionItems(items) {
        this.liveSessionItems = items;
    }
    setHistorySessionItems(items) {
        this.historySessionItems = items;
    }
    addSession(session) {
        this.sessions.set(session.sessionResource, session);
        // Update the chatModels observable
        this._chatModels.set([...this.sessions.values()], undefined);
    }
    removeSession(sessionResource) {
        this.sessions.delete(sessionResource);
        // Update the chatModels observable
        this._chatModels.set([...this.sessions.values()], undefined);
    }
    isEnabled(_location) {
        return true;
    }
    hasSessions() {
        return this.sessions.size > 0;
    }
    getProviderInfos() {
        return [];
    }
    startNewLocalSession(_location, _options) {
        throw new Error('Method not implemented.');
    }
    getSession(sessionResource) {
        return this.sessions.get(sessionResource);
    }
    getLatestRequest() {
        return undefined;
    }
    acquireOrRestoreSession(_sessionResource) {
        throw new Error('Method not implemented.');
    }
    getSessionTitle(_sessionResource) {
        return undefined;
    }
    loadSessionFromData(data) {
        throw new Error('Method not implemented.');
    }
    acquireOrLoadSession(_resource, _position, _token) {
        throw new Error('Method not implemented.');
    }
    acquireExistingSession(_sessionResource) {
        return undefined;
    }
    setSessionTitle(_sessionResource, _title) { }
    appendProgress(_request, _progress) { }
    sendRequest(_sessionResource, _message) {
        throw new Error('Method not implemented.');
    }
    resendRequest(_request, _options) {
        throw new Error('Method not implemented.');
    }
    adoptRequest(_sessionResource, _request) {
        throw new Error('Method not implemented.');
    }
    removeRequest(_sessionResource, _requestId) {
        throw new Error('Method not implemented.');
    }
    async cancelCurrentRequestForSession(_sessionResource, _source) { }
    migrateRequests(_originalResource, _targetResource) { }
    setYieldRequested(_sessionResource) { }
    removePendingRequest(_sessionResource, _requestId) { }
    setPendingRequests(_sessionResource, _requests) { }
    addCompleteRequest() { }
    async getLocalSessionHistory() {
        return this.historySessionItems;
    }
    async clearAllHistoryEntries() { }
    async removeHistoryEntry(_resource) { }
    notifyUserAction(_event) { }
    notifyQuestionCarouselAnswer(_requestId, _resolveId, _answers) { }
    async transferChatSession() { }
    setChatSessionTitle() { }
    isEditingLocation(_location) {
        return false;
    }
    getChatStorageFolder() {
        return URI.file('/tmp');
    }
    logChatIndex() { }
    activateDefaultAgent(_location) {
        return Promise.resolve();
    }
    getChatSessionFromInternalUri(_sessionResource) {
        return undefined;
    }
    async getLiveSessionItems() {
        return this.liveSessionItems;
    }
    async getHistorySessionItems() {
        return this.historySessionItems;
    }
    waitForModelDisposals() {
        return Promise.resolve();
    }
    getMetadataForSession(sessionResource) {
        throw new Error('Method not implemented.');
    }
    registerChatModelChangeListeners(chatSessionType, onChange) {
        // Store the emitter so tests can trigger it
        this.onChange = onChange;
        return {
            dispose: () => {
                this.onChange = undefined;
            }
        };
    }
    // Helper method for tests to trigger progress events
    triggerProgressEvent(sessionResource) {
        this.onChange?.(sessionResource);
    }
}
//# sourceMappingURL=mockChatService.js.map