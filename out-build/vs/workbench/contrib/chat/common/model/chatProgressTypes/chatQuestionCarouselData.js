/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { DeferredPromise } from '../../../../../../base/common/async.js';
/**
 * Runtime representation of a question carousel with a {@link DeferredPromise}
 * that is resolved when the user submits answers. {@link toJSON} strips the
 * completion so only serialisable data is persisted.
 */
export class ChatQuestionCarouselData {
    constructor(questions, allowSkip, resolveId, data, isUsed, message, source) {
        this.questions = questions;
        this.allowSkip = allowSkip;
        this.resolveId = resolveId;
        this.data = data;
        this.isUsed = isUsed;
        this.message = message;
        this.source = source;
        this.kind = 'questionCarousel';
        this.completion = new DeferredPromise();
    }
    toJSON() {
        return {
            kind: this.kind,
            questions: this.questions,
            allowSkip: this.allowSkip,
            resolveId: this.resolveId,
            data: this.data,
            isUsed: this.isUsed,
            message: this.message,
            source: this.source,
        };
    }
}
//# sourceMappingURL=chatQuestionCarouselData.js.map