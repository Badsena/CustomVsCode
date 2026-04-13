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
import { Emitter } from '../../../base/common/event.js';
import { Disposable } from '../../../base/common/lifecycle.js';
import { createDecorator } from '../../../platform/instantiation/common/instantiation.js';
import { IExtHostRpcService } from './extHostRpcService.js';
import { MainContext } from './extHost.protocol.js';
let ExtHostPower = class ExtHostPower extends Disposable {
    constructor(extHostRpc) {
        super();
        // Events
        this._onDidSuspend = this._register(new Emitter());
        this.onDidSuspend = this._onDidSuspend.event;
        this._onDidResume = this._register(new Emitter());
        this.onDidResume = this._onDidResume.event;
        this._onDidChangeOnBatteryPower = this._register(new Emitter());
        this.onDidChangeOnBatteryPower = this._onDidChangeOnBatteryPower.event;
        this._onDidChangeThermalState = this._register(new Emitter());
        this.onDidChangeThermalState = this._onDidChangeThermalState.event;
        this._onDidChangeSpeedLimit = this._register(new Emitter());
        this.onDidChangeSpeedLimit = this._onDidChangeSpeedLimit.event;
        this._onWillShutdown = this._register(new Emitter());
        this.onWillShutdown = this._onWillShutdown.event;
        this._onDidLockScreen = this._register(new Emitter());
        this.onDidLockScreen = this._onDidLockScreen.event;
        this._onDidUnlockScreen = this._register(new Emitter());
        this.onDidUnlockScreen = this._onDidUnlockScreen.event;
        this._proxy = extHostRpc.getProxy(MainContext.MainThreadPower);
    }
    // === Proxy callbacks (called by MainThread) ===
    $onDidSuspend() {
        this._onDidSuspend.fire();
    }
    $onDidResume() {
        this._onDidResume.fire();
    }
    $onDidChangeOnBatteryPower(isOnBattery) {
        this._onDidChangeOnBatteryPower.fire(isOnBattery);
    }
    $onDidChangeThermalState(state) {
        this._onDidChangeThermalState.fire(state);
    }
    $onDidChangeSpeedLimit(limit) {
        this._onDidChangeSpeedLimit.fire(limit);
    }
    $onWillShutdown() {
        this._onWillShutdown.fire();
    }
    $onDidLockScreen() {
        this._onDidLockScreen.fire();
    }
    $onDidUnlockScreen() {
        this._onDidUnlockScreen.fire();
    }
    // === API for extensions ===
    getSystemIdleState(idleThresholdSeconds) {
        return this._proxy.$getSystemIdleState(idleThresholdSeconds);
    }
    getSystemIdleTime() {
        return this._proxy.$getSystemIdleTime();
    }
    getCurrentThermalState() {
        return this._proxy.$getCurrentThermalState();
    }
    isOnBatteryPower() {
        return this._proxy.$isOnBatteryPower();
    }
    async startPowerSaveBlocker(type) {
        const id = await this._proxy.$startPowerSaveBlocker(type);
        const proxy = this._proxy;
        const isSupported = id >= 0;
        let disposed = false;
        return {
            id,
            get isStarted() {
                return isSupported && !disposed;
            },
            dispose: () => {
                if (isSupported && !disposed) {
                    disposed = true;
                    proxy.$stopPowerSaveBlocker(id);
                }
            }
        };
    }
};
ExtHostPower = __decorate([
    __param(0, IExtHostRpcService)
], ExtHostPower);
export { ExtHostPower };
export const IExtHostPower = createDecorator('IExtHostPower');
//# sourceMappingURL=extHostPower.js.map