/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { encodeBase64, VSBuffer, decodeBase64 } from '../../../../../base/common/buffer.js';
import { Schemas } from '../../../../../base/common/network.js';
import { URI } from '../../../../../base/common/uri.js';
import { localChatSessionType } from '../chatSessionsService.js';
export var LocalChatSessionUri;
(function (LocalChatSessionUri) {
    LocalChatSessionUri.scheme = Schemas.vscodeLocalChatSession;
    function forSession(sessionId) {
        const encodedId = encodeBase64(VSBuffer.wrap(new TextEncoder().encode(sessionId)), false, true);
        return URI.from({ scheme: LocalChatSessionUri.scheme, authority: localChatSessionType, path: '/' + encodedId });
    }
    LocalChatSessionUri.forSession = forSession;
    function getNewSessionUri() {
        const handle = Math.floor(Math.random() * 1e9);
        return forSession(`chat-${handle}`);
    }
    LocalChatSessionUri.getNewSessionUri = getNewSessionUri;
    function parseLocalSessionId(resource) {
        const parsed = parse(resource);
        return parsed?.chatSessionType === localChatSessionType ? parsed.sessionId : undefined;
    }
    LocalChatSessionUri.parseLocalSessionId = parseLocalSessionId;
    function isLocalSession(resource) {
        return !!parseLocalSessionId(resource);
    }
    LocalChatSessionUri.isLocalSession = isLocalSession;
    function parse(resource) {
        if (resource.scheme !== LocalChatSessionUri.scheme) {
            return undefined;
        }
        if (!resource.authority) {
            return undefined;
        }
        const parts = resource.path.split('/');
        if (parts.length !== 2) {
            return undefined;
        }
        const chatSessionType = resource.authority;
        const decodedSessionId = decodeBase64(parts[1]);
        return { chatSessionType, sessionId: new TextDecoder().decode(decodedSessionId.buffer) };
    }
})(LocalChatSessionUri || (LocalChatSessionUri = {}));
/**
 * Converts a chat session resource URI to a string ID.
 *
 * This exists mainly for backwards compatibility with existing code that uses string IDs in telemetry and storage.
 */
export function chatSessionResourceToId(resource) {
    // If we have a local session, prefer using just the id part
    const localId = LocalChatSessionUri.parseLocalSessionId(resource);
    if (localId) {
        return localId;
    }
    return resource.toString();
}
/**
 * Extracts the chat session type from a resource URI.
 *
 * @param resource - The chat session resource URI
 * @returns The session type string. Returns `localChatSessionType` for local sessions
 *          (vscodeChatEditor and vscodeLocalChatSession schemes), or the scheme/authority
 *          for contributed sessions.
 */
export function getChatSessionType(resource) {
    if (resource.scheme === Schemas.vscodeChatEditor) {
        return localChatSessionType;
    }
    if (resource.scheme === LocalChatSessionUri.scheme) {
        return resource.authority || localChatSessionType;
    }
    return resource.scheme;
}
export function isUntitledChatSession(resource) {
    return resource.path.startsWith('/untitled-');
}
//# sourceMappingURL=chatUri.js.map