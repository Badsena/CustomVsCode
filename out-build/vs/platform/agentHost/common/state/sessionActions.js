/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
// Action and notification types for the sessions process protocol.
// Re-exports from the auto-generated protocol layer with local aliases.
//
// VS Code-specific additions:
//   - IToolCallStartAction extends protocol with `toolKind` and `language`
//   - isRootAction / isSessionAction type guards
//   - INotification alias for IProtocolNotification
// ---- Re-exports from protocol -----------------------------------------------
export { ActionType, } from './protocol/actions.js';
export { NotificationType, } from './protocol/notifications.js';
// ---- Type guards ------------------------------------------------------------
export function isRootAction(action) {
    return action.type.startsWith('root/');
}
export function isSessionAction(action) {
    return action.type.startsWith('session/');
}
//# sourceMappingURL=sessionActions.js.map