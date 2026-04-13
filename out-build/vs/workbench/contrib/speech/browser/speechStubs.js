/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Event } from '../../../../base/common/event.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { KeywordRecognitionStatus } from '../common/speechService.js';
export class SpeechServiceStub extends Disposable {
    constructor() {
        super(...arguments);
        this.onDidChangeHasSpeechProvider = Event.None;
        this.hasSpeechProvider = false;
        this.onDidStartSpeechToTextSession = Event.None;
        this.onDidEndSpeechToTextSession = Event.None;
        this.hasActiveSpeechToTextSession = false;
        this.onDidStartTextToSpeechSession = Event.None;
        this.onDidEndTextToSpeechSession = Event.None;
        this.hasActiveTextToSpeechSession = false;
        this.onDidStartKeywordRecognition = Event.None;
        this.onDidEndKeywordRecognition = Event.None;
        this.hasActiveKeywordRecognition = false;
    }
    registerSpeechProvider(identifier, provider) { return Disposable.None; }
    async createSpeechToTextSession(token, context) {
        return { onDidChange: Event.None };
    }
    async createTextToSpeechSession(token, context) {
        return { onDidChange: Event.None, synthesize: async () => { } };
    }
    async recognizeKeyword(token) {
        return KeywordRecognitionStatus.Stopped;
    }
}
//# sourceMappingURL=speechStubs.js.map