/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Event } from '../../../../base/common/event.js';
import { IDisposable, Disposable } from '../../../../base/common/lifecycle.js';
import { ISpeechService, ISpeechProvider, ISpeechToTextSession, ITextToSpeechSession, KeywordRecognitionStatus } from '../common/speechService.js';
import { CancellationToken } from '../../../../base/common/cancellation.js';

export class SpeechServiceStub extends Disposable implements ISpeechService {
	readonly _serviceBrand: undefined;
	readonly onDidChangeHasSpeechProvider: Event<void> = Event.None;
	readonly hasSpeechProvider: boolean = false;
	registerSpeechProvider(identifier: string, provider: ISpeechProvider): IDisposable { return Disposable.None; }
	readonly onDidStartSpeechToTextSession: Event<void> = Event.None;
	readonly onDidEndSpeechToTextSession: Event<void> = Event.None;
	readonly hasActiveSpeechToTextSession: boolean = false;
	async createSpeechToTextSession(token: CancellationToken, context?: string): Promise<ISpeechToTextSession> {
		return { onDidChange: Event.None };
	}
	readonly onDidStartTextToSpeechSession: Event<void> = Event.None;
	readonly onDidEndTextToSpeechSession: Event<void> = Event.None;
	readonly hasActiveTextToSpeechSession: boolean = false;
	async createTextToSpeechSession(token: CancellationToken, context?: string): Promise<ITextToSpeechSession> {
		return { onDidChange: Event.None, synthesize: async () => { } };
	}
	readonly onDidStartKeywordRecognition: Event<void> = Event.None;
	readonly onDidEndKeywordRecognition: Event<void> = Event.None;
	readonly hasActiveKeywordRecognition: boolean = false;
	async recognizeKeyword(token: CancellationToken): Promise<KeywordRecognitionStatus> {
		return KeywordRecognitionStatus.Stopped;
	}
}
