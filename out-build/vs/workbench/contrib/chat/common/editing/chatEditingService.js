/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { decodeHex, encodeHex, VSBuffer } from '../../../../../base/common/buffer.js';
import { CancellationError } from '../../../../../base/common/errors.js';
import { autorunSelfDisposable } from '../../../../../base/common/observable.js';
import { hasKey } from '../../../../../base/common/types.js';
import { URI } from '../../../../../base/common/uri.js';
import { localize } from '../../../../../nls.js';
import { RawContextKey } from '../../../../../platform/contextkey/common/contextkey.js';
import { createDecorator } from '../../../../../platform/instantiation/common/instantiation.js';
export const IChatEditingService = createDecorator('chatEditingService');
export function chatEditingSessionIsReady(session) {
    return new Promise(resolve => {
        autorunSelfDisposable(reader => {
            const state = session.state.read(reader);
            if (state !== 0 /* ChatEditingSessionState.Initial */) {
                reader.dispose();
                resolve();
            }
        });
    });
}
export function editEntriesToMultiDiffData(entriesObs) {
    const multiDiffData = entriesObs.map(entries => ({
        title: localize(8447, null, entries.length),
        resources: entries.map(entry => ({
            originalUri: entry.originalURI,
            modifiedUri: entry.modifiedURI,
            goToFileUri: entry.modifiedURI,
            added: entry.added,
            removed: entry.removed,
        }))
    }));
    return {
        kind: 'multiDiffData',
        collapsed: true,
        multiDiffData,
        toJSON() {
            return {
                kind: 'multiDiffData',
                collapsed: this.collapsed,
                multiDiffData: multiDiffData.get(),
            };
        }
    };
}
export function awaitCompleteChatEditingDiff(diff, token) {
    return new Promise((resolve, reject) => {
        autorunSelfDisposable(reader => {
            if (token) {
                if (token.isCancellationRequested) {
                    reader.dispose();
                    return reject(new CancellationError());
                }
                reader.store.add(token.onCancellationRequested(() => {
                    reader.dispose();
                    reject(new CancellationError());
                }));
            }
            const current = diff.read(reader);
            if (current instanceof Array) {
                if (!current.some(c => c.isBusy)) {
                    reader.dispose();
                    resolve(current);
                }
            }
            else if (!current.isBusy) {
                reader.dispose();
                resolve(current);
            }
        });
    });
}
export function emptySessionEntryDiff(originalURI, modifiedURI) {
    return {
        originalURI,
        modifiedURI,
        added: 0,
        removed: 0,
        quitEarly: false,
        identical: false,
        isFinal: false,
        isBusy: false,
    };
}
export var ModifiedFileEntryState;
(function (ModifiedFileEntryState) {
    ModifiedFileEntryState[ModifiedFileEntryState["Modified"] = 0] = "Modified";
    ModifiedFileEntryState[ModifiedFileEntryState["Accepted"] = 1] = "Accepted";
    ModifiedFileEntryState[ModifiedFileEntryState["Rejected"] = 2] = "Rejected";
})(ModifiedFileEntryState || (ModifiedFileEntryState = {}));
export var ChatEditingSessionState;
(function (ChatEditingSessionState) {
    ChatEditingSessionState[ChatEditingSessionState["Initial"] = 0] = "Initial";
    ChatEditingSessionState[ChatEditingSessionState["StreamingEdits"] = 1] = "StreamingEdits";
    ChatEditingSessionState[ChatEditingSessionState["Idle"] = 2] = "Idle";
    ChatEditingSessionState[ChatEditingSessionState["Disposed"] = 3] = "Disposed";
})(ChatEditingSessionState || (ChatEditingSessionState = {}));
export const CHAT_EDITING_MULTI_DIFF_SOURCE_RESOLVER_SCHEME = 'chat-editing-multi-diff-source';
export const chatEditingWidgetFileStateContextKey = new RawContextKey('chatEditingWidgetFileState', undefined, localize(8448, null));
export const chatEditingAgentSupportsReadonlyReferencesContextKey = new RawContextKey('chatEditingAgentSupportsReadonlyReferences', undefined, localize(8449, null));
export const decidedChatEditingResourceContextKey = new RawContextKey('decidedChatEditingResource', []);
export const chatEditingResourceContextKey = new RawContextKey('chatEditingResource', undefined);
export const inChatEditingSessionContextKey = new RawContextKey('inChatEditingSession', undefined);
export const hasUndecidedChatEditingResourceContextKey = new RawContextKey('hasUndecidedChatEditingResource', false);
export const hasAppliedChatEditsContextKey = new RawContextKey('hasAppliedChatEdits', false);
export const applyingChatEditsFailedContextKey = new RawContextKey('applyingChatEditsFailed', false);
export const chatEditingMaxFileAssignmentName = 'chatEditingSessionFileLimit';
export const defaultChatEditingMaxFileLimit = 10;
export var ChatEditKind;
(function (ChatEditKind) {
    ChatEditKind[ChatEditKind["Created"] = 0] = "Created";
    ChatEditKind[ChatEditKind["Modified"] = 1] = "Modified";
    ChatEditKind[ChatEditKind["Deleted"] = 2] = "Deleted";
})(ChatEditKind || (ChatEditKind = {}));
export function isChatEditingActionContext(thing) {
    return typeof thing === 'object' && !!thing && hasKey(thing, { sessionResource: true });
}
export function getMultiDiffSourceUri(session, showPreviousChanges) {
    return URI.from({
        scheme: CHAT_EDITING_MULTI_DIFF_SOURCE_RESOLVER_SCHEME,
        authority: encodeHex(VSBuffer.fromString(session.chatSessionResource.toString())),
        query: showPreviousChanges ? 'previous' : undefined,
    });
}
export function parseChatMultiDiffUri(uri) {
    const chatSessionResource = URI.parse(decodeHex(uri.authority).toString());
    const showPreviousChanges = uri.query === 'previous';
    return { chatSessionResource, showPreviousChanges };
}
//# sourceMappingURL=chatEditingService.js.map