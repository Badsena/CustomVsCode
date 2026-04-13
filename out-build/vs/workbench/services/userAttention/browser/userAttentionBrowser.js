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
import * as dom from '../../../../base/browser/dom.js';
import { mainWindow } from '../../../../base/browser/window.js';
import { Event } from '../../../../base/common/event.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { autorun, derived, observableFromEvent, observableValue } from '../../../../base/common/observable.js';
// eslint-disable-next-line local/code-no-deep-import-of-internal
import { TotalTrueTimeObservable, wasTrueRecently } from '../../../../base/common/observableInternal/experimental/time.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { registerSingleton } from '../../../../platform/instantiation/common/extensions.js';
import { ILogService, LogLevel } from '../../../../platform/log/common/log.js';
import { IHostService } from '../../host/browser/host.js';
import { IUserAttentionService } from '../common/userAttentionService.js';
/**
 * The user attention timeout in milliseconds.
 * User is considered attentive if there was activity within this time frame.
 */
const USER_ATTENTION_TIMEOUT_MS = 60_000;
let UserAttentionService = class UserAttentionService extends Disposable {
    constructor(instantiationService, _logService) {
        super();
        this._logService = _logService;
        const hostAdapter = this._register(instantiationService.createInstance(UserAttentionServiceEnv));
        this.isVsCodeFocused = hostAdapter.isVsCodeFocused;
        this.isUserActive = hostAdapter.isUserActive;
        this._isTracingEnabled = observableFromEvent(this, this._logService.onDidChangeLogLevel, () => this._logService.getLevel() === LogLevel.Trace);
        const hadRecentActivity = wasTrueRecently(this.isUserActive, USER_ATTENTION_TIMEOUT_MS, this._store);
        this.hasUserAttention = derived(this, reader => {
            return hadRecentActivity.read(reader);
        });
        this._timeKeeper = this._register(new TotalTrueTimeObservable(this.hasUserAttention));
        this._register(autorun(reader => {
            if (!this._isTracingEnabled.read(reader)) {
                return;
            }
            reader.store.add(autorun(innerReader => {
                const focused = this.isVsCodeFocused.read(innerReader);
                this._logService.trace(`[UserAttentionService] VS Code focus changed: ${focused}`);
            }));
            reader.store.add(autorun(innerReader => {
                const hasAttention = this.hasUserAttention.read(innerReader);
                this._logService.trace(`[UserAttentionService] User attention changed: ${hasAttention}`);
            }));
        }));
    }
    fireAfterGivenFocusTimePassed(focusTimeMs, callback) {
        return this._timeKeeper.fireWhenTimeIncreasedBy(focusTimeMs, callback);
    }
    get totalFocusTimeMs() {
        return this._timeKeeper.totalTimeMs();
    }
};
UserAttentionService = __decorate([
    __param(0, IInstantiationService),
    __param(1, ILogService)
], UserAttentionService);
export { UserAttentionService };
let UserAttentionServiceEnv = class UserAttentionServiceEnv extends Disposable {
    constructor(_hostService, _logService) {
        super();
        this._hostService = _hostService;
        this._logService = _logService;
        this._isUserActive = observableValue(this, false);
        this.isVsCodeFocused = observableFromEvent(this, this._hostService.onDidChangeFocus, () => this._hostService.hasFocus);
        this.isUserActive = this._isUserActive;
        const onActivity = () => {
            this._markUserActivity();
        };
        this._register(Event.runAndSubscribe(dom.onDidRegisterWindow, ({ window, disposables }) => {
            disposables.add(dom.addDisposableListener(window.document, 'keydown', onActivity, eventListenerOptions));
            disposables.add(dom.addDisposableListener(window.document, 'mousemove', onActivity, eventListenerOptions));
            disposables.add(dom.addDisposableListener(window.document, 'mousedown', onActivity, eventListenerOptions));
            disposables.add(dom.addDisposableListener(window.document, 'touchstart', onActivity, eventListenerOptions));
        }, { window: mainWindow, disposables: this._store }));
        if (this._hostService.hasFocus) {
            this._markUserActivity();
        }
    }
    _markUserActivity() {
        if (this._activityDebounceTimeout !== undefined) {
            clearTimeout(this._activityDebounceTimeout);
        }
        else {
            this._logService.trace('[UserAttentionService] User activity detected');
            this._isUserActive.set(true, undefined);
        }
        // An activity event accounts for 500ms for immediate use activity
        this._activityDebounceTimeout = setTimeout(() => {
            this._isUserActive.set(false, undefined);
            this._activityDebounceTimeout = undefined;
        }, 500);
    }
};
UserAttentionServiceEnv = __decorate([
    __param(0, IHostService),
    __param(1, ILogService)
], UserAttentionServiceEnv);
export { UserAttentionServiceEnv };
const eventListenerOptions = {
    passive: true,
    capture: true,
};
registerSingleton(IUserAttentionService, UserAttentionService, 1 /* InstantiationType.Delayed */);
//# sourceMappingURL=userAttentionBrowser.js.map