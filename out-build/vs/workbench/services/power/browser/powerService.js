/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Event } from '../../../../base/common/event.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { registerSingleton } from '../../../../platform/instantiation/common/extensions.js';
import { IPowerService } from '../common/powerService.js';
/**
 * Browser stub implementation of IPowerService.
 * Power APIs are not available in web environments.
 */
export class BrowserPowerService extends Disposable {
    constructor() {
        super(...arguments);
        // Events never fire in browser
        this.onDidSuspend = Event.None;
        this.onDidResume = Event.None;
        this.onDidChangeOnBatteryPower = Event.None;
        this.onDidChangeThermalState = Event.None;
        this.onDidChangeSpeedLimit = Event.None;
        this.onWillShutdown = Event.None;
        this.onDidLockScreen = Event.None;
        this.onDidUnlockScreen = Event.None;
    }
    async getSystemIdleState(_idleThreshold) {
        return 'unknown';
    }
    async getSystemIdleTime() {
        return 0;
    }
    async getCurrentThermalState() {
        return 'unknown';
    }
    async isOnBatteryPower() {
        return false;
    }
    async startPowerSaveBlocker(_type) {
        // Return a fake ID (no-op in browser)
        return -1;
    }
    async stopPowerSaveBlocker(_id) {
        return false;
    }
    async isPowerSaveBlockerStarted(_id) {
        return false;
    }
}
registerSingleton(IPowerService, BrowserPowerService, 1 /* InstantiationType.Delayed */);
//# sourceMappingURL=powerService.js.map