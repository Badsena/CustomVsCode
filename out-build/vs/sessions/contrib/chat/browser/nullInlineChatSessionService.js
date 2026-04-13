/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Event } from '../../../../base/common/event.js';
import { registerSingleton } from '../../../../platform/instantiation/common/extensions.js';
import { IInlineChatSessionService } from '../../../../workbench/contrib/inlineChat/browser/inlineChatSessionService.js';
class NullInlineChatSessionService {
    constructor() {
        this.onWillStartSession = Event.None;
        this.onDidChangeSessions = Event.None;
    }
    dispose() { }
    createSession(_editor) {
        throw new Error('Inline chat sessions are not supported in the sessions window');
    }
    getSessionByTextModel(_uri) {
        return undefined;
    }
    getSessionBySessionUri(_uri) {
        return undefined;
    }
}
registerSingleton(IInlineChatSessionService, NullInlineChatSessionService, 1 /* InstantiationType.Delayed */);
//# sourceMappingURL=nullInlineChatSessionService.js.map