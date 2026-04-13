/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
// ─── Protocol Notifications ──────────────────────────────────────────────────
/**
 * Discriminant values for all protocol notifications.
 *
 * @category Protocol Notifications
 */
export var NotificationType;
(function (NotificationType) {
    NotificationType["SessionAdded"] = "notify/sessionAdded";
    NotificationType["SessionRemoved"] = "notify/sessionRemoved";
})(NotificationType || (NotificationType = {}));
//# sourceMappingURL=notifications.js.map