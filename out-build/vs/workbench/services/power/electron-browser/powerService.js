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
import { Disposable } from '../../../../base/common/lifecycle.js';
import { registerSingleton } from '../../../../platform/instantiation/common/extensions.js';
import { INativeHostService } from '../../../../platform/native/common/native.js';
import { IPowerService } from '../common/powerService.js';
import { Event } from '../../../../base/common/event.js';
/**
 * Desktop implementation of IPowerService using Electron's powerMonitor.
 */
let NativePowerService = class NativePowerService extends Disposable {
    constructor(nativeHostService) {
        super();
        this.nativeHostService = nativeHostService;
        // Forward events from native host service
        this.onDidSuspend = nativeHostService.onDidSuspendOS;
        this.onDidResume = Event.map(nativeHostService.onDidResumeOS, () => undefined);
        this.onDidChangeOnBatteryPower = nativeHostService.onDidChangeOnBatteryPower;
        this.onDidChangeThermalState = nativeHostService.onDidChangeThermalState;
        this.onDidChangeSpeedLimit = nativeHostService.onDidChangeSpeedLimit;
        this.onWillShutdown = nativeHostService.onWillShutdownOS;
        this.onDidLockScreen = nativeHostService.onDidLockScreen;
        this.onDidUnlockScreen = nativeHostService.onDidUnlockScreen;
    }
    async getSystemIdleState(idleThreshold) {
        return this.nativeHostService.getSystemIdleState(idleThreshold);
    }
    async getSystemIdleTime() {
        return this.nativeHostService.getSystemIdleTime();
    }
    async getCurrentThermalState() {
        return this.nativeHostService.getCurrentThermalState();
    }
    async isOnBatteryPower() {
        return this.nativeHostService.isOnBatteryPower();
    }
    async startPowerSaveBlocker(type) {
        return this.nativeHostService.startPowerSaveBlocker(type);
    }
    async stopPowerSaveBlocker(id) {
        return this.nativeHostService.stopPowerSaveBlocker(id);
    }
    async isPowerSaveBlockerStarted(id) {
        return this.nativeHostService.isPowerSaveBlockerStarted(id);
    }
};
NativePowerService = __decorate([
    __param(0, INativeHostService)
], NativePowerService);
export { NativePowerService };
registerSingleton(IPowerService, NativePowerService, 1 /* InstantiationType.Delayed */);
//# sourceMappingURL=powerService.js.map