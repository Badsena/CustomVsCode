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
import { Disposable, toDisposable } from '../../base/common/lifecycle.js';
import { createDecorator } from '../../platform/instantiation/common/instantiation.js';
import { ILogService } from '../../platform/log/common/log.js';
export const IServerLifetimeService = createDecorator('serverLifetimeService');
export const SHUTDOWN_TIMEOUT = 5 * 60 * 1000;
let ServerLifetimeService = class ServerLifetimeService extends Disposable {
    constructor(_options, _logService) {
        super();
        this._options = _options;
        this._logService = _logService;
        this._consumers = new Map();
        this._totalCount = 0;
        if (this._options.enableAutoShutdown) {
            // Start initial shutdown timer (no clients connected yet)
            this._scheduleShutdown(true);
        }
    }
    get hasActiveConsumers() {
        return this._totalCount > 0;
    }
    active(consumer) {
        const wasEmpty = this._totalCount === 0;
        const current = this._consumers.get(consumer) ?? 0;
        this._consumers.set(consumer, current + 1);
        this._totalCount++;
        this._logService.debug(`ServerLifetime: consumer '${consumer}' active (total: ${this._totalCount})`);
        if (wasEmpty) {
            this._cancelShutdown();
        }
        let disposed = false;
        return toDisposable(() => {
            if (disposed) {
                return;
            }
            disposed = true;
            const count = this._consumers.get(consumer);
            if (count !== undefined) {
                if (count <= 1) {
                    this._consumers.delete(consumer);
                }
                else {
                    this._consumers.set(consumer, count - 1);
                }
            }
            this._totalCount--;
            this._logService.debug(`ServerLifetime: consumer '${consumer}' inactive (total: ${this._totalCount})`);
            if (this._totalCount === 0 && this._options.enableAutoShutdown) {
                this._scheduleShutdown(false);
            }
        });
    }
    delay() {
        if (this._shutdownTimer) {
            this._logService.debug('ServerLifetime: delay requested, resetting shutdown timer');
            this._cancelShutdown();
            this._scheduleShutdown(false);
        }
    }
    _scheduleShutdown(initial) {
        if (this._options.shutdownWithoutDelay && !initial) {
            this._tryShutdown();
        }
        else {
            this._logService.debug('ServerLifetime: scheduling shutdown timer');
            this._shutdownTimer = setTimeout(() => {
                this._shutdownTimer = undefined;
                this._tryShutdown();
            }, SHUTDOWN_TIMEOUT);
        }
    }
    _tryShutdown() {
        if (this._totalCount > 0) {
            this._logService.debug('ServerLifetime: consumer became active, aborting shutdown');
            return;
        }
        console.log('All consumers inactive, shutting down');
        this._logService.info('ServerLifetime: all consumers inactive, shutting down');
        this.dispose();
        process.exit(0);
    }
    _cancelShutdown() {
        if (this._shutdownTimer) {
            this._logService.debug('ServerLifetime: cancelling shutdown timer');
            clearTimeout(this._shutdownTimer);
            this._shutdownTimer = undefined;
        }
    }
};
ServerLifetimeService = __decorate([
    __param(1, ILogService)
], ServerLifetimeService);
export { ServerLifetimeService };
//# sourceMappingURL=serverLifetimeService.js.map