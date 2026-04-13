/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { localize } from '../../nls.js';
import { RawContextKey } from '../../platform/contextkey/common/contextkey.js';
//#region < --- Chat Bar --- >
export const ActiveChatBarContext = new RawContextKey('activeChatBar', '', localize(2954, null));
export const ChatBarFocusContext = new RawContextKey('chatBarFocus', false, localize(2955, null));
export const ChatBarVisibleContext = new RawContextKey('chatBarVisible', false, localize(2956, null));
//#endregion
//#region < --- Welcome --- >
export const SessionsWelcomeVisibleContext = new RawContextKey('sessionsWelcomeVisible', false, localize(2957, null));
//#endregion
//# sourceMappingURL=contextkeys.js.map