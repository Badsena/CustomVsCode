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
import { registerWorkbenchContribution2 } from '../../../common/contributions.js';
import { IBannerService } from '../../../services/banner/browser/bannerService.js';
import { asJson, IRequestService } from '../../../../platform/request/common/request.js';
import { IProductService } from '../../../../platform/product/common/productService.js';
import { CancellationToken } from '../../../../base/common/cancellation.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { Codicon } from '../../../../base/common/codicons.js';
import { arch, platform } from '../../../../base/common/process.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { equals } from '../../../../base/common/arrays.js';
import { IntervalTimer } from '../../../../base/common/async.js';
import { mainWindow } from '../../../../base/browser/window.js';
const POLLING_INTERVAL = 60 * 60 * 1000; // 1 hour
const BANNER_ID = 'emergencyAlert.banner';
let EmergencyAlert = class EmergencyAlert extends Disposable {
    static { this.ID = 'workbench.contrib.emergencyAlert'; }
    constructor(bannerService, requestService, productService, logService) {
        super();
        this.bannerService = bannerService;
        this.requestService = requestService;
        this.productService = productService;
        this.logService = logService;
        const emergencyAlertUrl = productService.emergencyAlertUrl;
        if (!emergencyAlertUrl) {
            return; // no emergency alert configured
        }
        this.fetchAlerts(emergencyAlertUrl);
        const pollingTimer = this._register(new IntervalTimer());
        pollingTimer.cancelAndSet(() => this.fetchAlerts(emergencyAlertUrl), POLLING_INTERVAL, mainWindow);
    }
    async fetchAlerts(url) {
        try {
            await this.doFetchAlerts(url);
        }
        catch (e) {
            this.logService.error(e);
        }
    }
    async doFetchAlerts(url) {
        const requestResult = await this.requestService.request({ type: 'GET', url, disableCache: true, timeout: 20000, callSite: 'emergencyAlert.doFetchAlerts' }, CancellationToken.None);
        if (requestResult.res.statusCode !== 200) {
            throw new Error(`Failed to fetch emergency alerts: HTTP ${requestResult.res.statusCode}`);
        }
        const emergencyAlerts = await asJson(requestResult);
        if (!emergencyAlerts || !Array.isArray(emergencyAlerts.alerts)) {
            this.dismissAlert();
            return;
        }
        // Find the first matching alert
        const matchingAlert = emergencyAlerts.alerts.find(alert => alert.commit === this.productService.commit &&
            (!alert.platform || alert.platform === platform) &&
            (!alert.arch || alert.arch === arch));
        if (!matchingAlert) {
            // No matching alert, dismiss the banner if it was shown
            this.dismissAlert();
            return;
        }
        // Don't update the banner if message and actions didn't change
        if (this.currentAlertMessage === matchingAlert.message &&
            equals(this.currentAlertActions ?? [], matchingAlert.actions ?? [], (a, b) => a.label === b.label && a.href === b.href)) {
            return;
        }
        this.currentAlertMessage = matchingAlert.message;
        this.currentAlertActions = matchingAlert.actions;
        this.bannerService.show({
            id: BANNER_ID,
            icon: Codicon.warning,
            message: matchingAlert.message,
            actions: matchingAlert.actions
        });
    }
    dismissAlert() {
        if (this.currentAlertMessage !== undefined) {
            this.currentAlertMessage = undefined;
            this.currentAlertActions = undefined;
            this.bannerService.hide(BANNER_ID);
        }
    }
};
EmergencyAlert = __decorate([
    __param(0, IBannerService),
    __param(1, IRequestService),
    __param(2, IProductService),
    __param(3, ILogService)
], EmergencyAlert);
export { EmergencyAlert };
registerWorkbenchContribution2(EmergencyAlert.ID, EmergencyAlert, 4 /* WorkbenchPhase.Eventually */);
//# sourceMappingURL=emergencyAlert.contribution.js.map