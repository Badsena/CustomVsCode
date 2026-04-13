/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { localize } from '../../../../../nls.js';
export var TerminalOscNotificationsSettingId;
(function (TerminalOscNotificationsSettingId) {
    TerminalOscNotificationsSettingId["EnableNotifications"] = "terminal.integrated.enableNotifications";
})(TerminalOscNotificationsSettingId || (TerminalOscNotificationsSettingId = {}));
export const terminalOscNotificationsConfiguration = {
    ["terminal.integrated.enableNotifications" /* TerminalOscNotificationsSettingId.EnableNotifications */]: {
        description: localize(16172, null),
        type: 'boolean',
        default: true
    },
};
//# sourceMappingURL=terminalNotificationConfiguration.js.map