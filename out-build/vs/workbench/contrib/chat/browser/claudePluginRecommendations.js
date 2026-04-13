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
import { localize } from '../../../../nls.js';
import { INotificationService, NeverShowAgainScope, Severity } from '../../../../platform/notification/common/notification.js';
import { IExtensionsWorkbenchService } from '../../extensions/common/extensions.js';
import { IChatService } from '../common/chatService/chatService.js';
import { IPluginMarketplaceService } from '../common/plugins/pluginMarketplaceService.js';
let AgentPluginRecommendations = class AgentPluginRecommendations extends Disposable {
    static { this.ID = 'workbench.contrib.agentPluginRecommendations'; }
    constructor(_chatService, _pluginMarketplaceService, _notificationService, _extensionsWorkbenchService) {
        super();
        this._chatService = _chatService;
        this._pluginMarketplaceService = _pluginMarketplaceService;
        this._notificationService = _notificationService;
        this._extensionsWorkbenchService = _extensionsWorkbenchService;
        this._hasNotified = false;
        this._register(this._chatService.onDidSubmitRequest(() => {
            if (!this._hasNotified) {
                this._hasNotified = true;
                this._checkForRecommendedPlugins();
            }
        }));
    }
    _checkForRecommendedPlugins() {
        const recommended = this._pluginMarketplaceService.recommendedPlugins.get();
        if (recommended.size === 0) {
            return;
        }
        // Build a set of installed plugin keys ("name@marketplace") from
        // storage without triggering any network fetch.
        const installedKeys = new Set();
        for (const entry of this._pluginMarketplaceService.installedPlugins.get()) {
            const key = `${entry.plugin.name}@${entry.plugin.marketplace}`;
            installedKeys.add(key);
        }
        let uninstalledCount = 0;
        for (const key of recommended) {
            if (!installedKeys.has(key)) {
                uninstalledCount++;
            }
        }
        if (uninstalledCount === 0) {
            return;
        }
        this._notificationService.prompt(Severity.Info, uninstalledCount === 1
            ? localize(7550, null)
            : localize(7551, null, uninstalledCount), [{
                label: localize(7552, null),
                run: () => {
                    this._extensionsWorkbenchService.openSearch('@agentPlugins @recommended');
                }
            }], {
            neverShowAgain: {
                id: 'agentPluginRecommendations.dismissed',
                scope: NeverShowAgainScope.WORKSPACE,
                isSecondary: true,
            }
        });
    }
};
AgentPluginRecommendations = __decorate([
    __param(0, IChatService),
    __param(1, IPluginMarketplaceService),
    __param(2, INotificationService),
    __param(3, IExtensionsWorkbenchService)
], AgentPluginRecommendations);
export { AgentPluginRecommendations };
//# sourceMappingURL=claudePluginRecommendations.js.map