/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { isEqual } from '../../../../base/common/resources.js';
import { isIChatSessionFileChange2 } from '../common/chatSessionsService.js';
export function editingEntriesContainResource(entries, resourceUri) {
    for (const entry of entries) {
        if (isEqual(entry.modifiedURI, resourceUri) || isEqual(entry.originalURI, resourceUri)) {
            return true;
        }
    }
    return false;
}
export function agentSessionContainsResource(session, resourceUri) {
    if (!(session.changes instanceof Array)) {
        return false;
    }
    for (const change of session.changes) {
        if (isIChatSessionFileChange2(change)) {
            if (isEqual(change.uri, resourceUri) || (change.originalUri && isEqual(change.originalUri, resourceUri)) || (change.modifiedUri && isEqual(change.modifiedUri, resourceUri))) {
                return true;
            }
        }
        else if (isEqual(change.modifiedUri, resourceUri) || (change.originalUri && isEqual(change.originalUri, resourceUri))) {
            return true;
        }
    }
    return false;
}
//# sourceMappingURL=sessionResourceMatching.js.map