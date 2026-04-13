/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Codicon } from '../../../../../base/common/codicons.js';
import * as nls from '../../../../../nls.js';
import { formatDebugEventsForContext, getDebugEventsModelDescription } from '../../common/chatDebugEvents.js';
/**
 * Creates a debug events attachment for a chat session.
 * This can be used to attach debug logs to a chat request.
 */
export async function createDebugEventsAttachment(sessionResource, chatDebugService) {
    chatDebugService.markDebugDataAttached(sessionResource);
    if (!chatDebugService.hasInvokedProviders(sessionResource)) {
        await chatDebugService.invokeProviders(sessionResource);
    }
    const events = chatDebugService.getEvents(sessionResource);
    const summary = events.length > 0
        ? formatDebugEventsForContext(events)
        : nls.localize(6864, null);
    return {
        id: 'chatDebugEvents',
        name: nls.localize(6865, null),
        icon: Codicon.output,
        kind: 'debugEvents',
        snapshotTime: Date.now(),
        sessionResource,
        value: summary,
        modelDescription: getDebugEventsModelDescription(),
    };
}
//# sourceMappingURL=chatDebugAttachment.js.map