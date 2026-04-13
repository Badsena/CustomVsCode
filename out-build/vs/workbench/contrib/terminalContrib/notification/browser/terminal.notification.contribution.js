/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
import * as dom from '../../../../../base/browser/dom.js';
import { Disposable } from '../../../../../base/common/lifecycle.js';
import { IConfigurationService } from '../../../../../platform/configuration/common/configuration.js';
import { INotificationService } from '../../../../../platform/notification/common/notification.js';
import { ITerminalLogService } from '../../../../../platform/terminal/common/terminal.js';
import { registerTerminalContribution } from '../../../terminal/browser/terminalExtensions.js';
import { TerminalNotificationHandler } from './terminalNotificationHandler.js';
let TerminalOscNotificationsContribution = class TerminalOscNotificationsContribution extends Disposable {
    static { this.ID = 'terminal.oscNotifications'; }
    constructor(_ctx, _configurationService, _notificationService, _logService) {
        super();
        this._ctx = _ctx;
        this._configurationService = _configurationService;
        this._notificationService = _notificationService;
        this._logService = _logService;
        this._handler = this._register(new TerminalNotificationHandler({
            isEnabled: () => this._configurationService.getValue("terminal.integrated.enableNotifications" /* TerminalOscNotificationsSettingId.EnableNotifications */) === true,
            isWindowFocused: () => dom.getActiveWindow().document.hasFocus(),
            isTerminalVisible: () => this._ctx.instance.isVisible,
            focusTerminal: () => this._ctx.instance.focus(true),
            notify: notification => this._notificationService.notify(notification),
            updateEnableNotifications: value => this._configurationService.updateValue("terminal.integrated.enableNotifications" /* TerminalOscNotificationsSettingId.EnableNotifications */, value),
            logWarn: message => this._logService.warn(message),
            writeToProcess: data => { void this._ctx.instance.sendText(data, false); }
        }));
    }
    xtermReady(xterm) {
        this._register(xterm.raw.parser.registerOscHandler(99, data => this._handler.handleSequence(data)));
    }
};
TerminalOscNotificationsContribution = __decorate([
    __param(1, IConfigurationService),
    __param(2, INotificationService),
    __param(3, ITerminalLogService)
], TerminalOscNotificationsContribution);
registerTerminalContribution(TerminalOscNotificationsContribution.ID, TerminalOscNotificationsContribution);
export function getTerminalOscNotifications(instance) {
    return instance.getContribution(TerminalOscNotificationsContribution.ID);
}
//# sourceMappingURL=terminal.notification.contribution.js.map