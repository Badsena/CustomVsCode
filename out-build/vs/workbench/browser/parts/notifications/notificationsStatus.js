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
import { getNotificationsPosition } from '../../../common/notifications.js';
import { IStatusbarService } from '../../../services/statusbar/browser/statusbar.js';
import { Disposable, dispose } from '../../../../base/common/lifecycle.js';
import { HIDE_NOTIFICATIONS_CENTER, SHOW_NOTIFICATIONS_CENTER } from './notificationsCommands.js';
import { localize } from '../../../../nls.js';
import { INotificationService, NotificationsFilter } from '../../../../platform/notification/common/notification.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
let NotificationsStatus = class NotificationsStatus extends Disposable {
    constructor(model, statusbarService, notificationService, configurationService) {
        super();
        this.model = model;
        this.statusbarService = statusbarService;
        this.notificationService = notificationService;
        this.configurationService = configurationService;
        this.newNotificationsCount = 0;
        this.isNotificationsCenterVisible = false;
        this.isNotificationsToastsVisible = false;
        this.updateNotificationsCenterStatusItem();
        if (model.statusMessage) {
            this.doSetStatusMessage(model.statusMessage);
        }
        this.registerListeners();
    }
    registerListeners() {
        this._register(this.model.onDidChangeNotification(e => this.onDidChangeNotification(e)));
        this._register(this.model.onDidChangeStatusMessage(e => this.onDidChangeStatusMessage(e)));
        this._register(this.notificationService.onDidChangeFilter(() => this.updateNotificationsCenterStatusItem()));
        this._register(this.configurationService.onDidChangeConfiguration(e => {
            if (e.affectsConfiguration("workbench.notifications.position" /* NotificationsSettings.NOTIFICATIONS_POSITION */)) {
                this.updateNotificationsCenterStatusItem();
            }
        }));
    }
    onDidChangeNotification(e) {
        // Consider a notification as unread as long as it only
        // appeared as toast and not in the notification center
        if (!this.isNotificationsCenterVisible) {
            if (e.kind === 0 /* NotificationChangeType.ADD */) {
                this.newNotificationsCount++;
            }
            else if (e.kind === 3 /* NotificationChangeType.REMOVE */ && this.newNotificationsCount > 0) {
                this.newNotificationsCount--;
            }
        }
        // Update in status bar
        this.updateNotificationsCenterStatusItem();
    }
    updateNotificationsCenterStatusItem() {
        // Figure out how many notifications have progress only if neither
        // toasts are visible nor center is visible. In that case we still
        // want to give a hint to the user that something is running.
        let notificationsInProgress = 0;
        if (!this.isNotificationsCenterVisible && !this.isNotificationsToastsVisible) {
            for (const notification of this.model.notifications) {
                if (notification.hasProgress) {
                    notificationsInProgress++;
                }
            }
        }
        // Show the status bar entry depending on do not disturb setting
        let statusProperties = {
            name: localize(4527, null),
            text: `${notificationsInProgress > 0 || this.newNotificationsCount > 0 ? '$(bell-dot)' : '$(bell)'}`,
            ariaLabel: localize(4528, null),
            command: this.isNotificationsCenterVisible ? HIDE_NOTIFICATIONS_CENTER : SHOW_NOTIFICATIONS_CENTER,
            tooltip: this.getTooltip(notificationsInProgress),
            showBeak: this.isNotificationsCenterVisible
        };
        if (this.notificationService.getFilter() === NotificationsFilter.ERROR) {
            statusProperties = {
                ...statusProperties,
                text: `${notificationsInProgress > 0 || this.newNotificationsCount > 0 ? '$(bell-slash-dot)' : '$(bell-slash)'}`,
                ariaLabel: localize(4529, null),
                tooltip: localize(4530, null)
            };
        }
        // For top-right position, hide the status bar bell entirely
        // (it is shown in the title bar instead via menu registration)
        const position = getNotificationsPosition(this.configurationService);
        if (position === "top-right" /* NotificationsPosition.TOP_RIGHT */) {
            this.notificationsCenterStatusItem?.dispose();
            this.notificationsCenterStatusItem = undefined;
            this.currentAlignment = undefined;
        }
        // For other positions, figure out the desired alignment
        else {
            const desiredAlignment = this.getDesiredAlignment();
            // If alignment changed, dispose old entry and create a new one
            if (this.currentAlignment !== desiredAlignment) {
                this.notificationsCenterStatusItem?.dispose();
                this.notificationsCenterStatusItem = undefined;
                this.currentAlignment = desiredAlignment;
            }
            if (!this.notificationsCenterStatusItem) {
                this.notificationsCenterStatusItem = this.statusbarService.addEntry(statusProperties, 'status.notifications', this.currentAlignment, this.currentAlignment === 0 /* StatusbarAlignment.LEFT */
                    ? Number.MAX_SAFE_INTEGER // almost leftmost on the left side
                    : Number.NEGATIVE_INFINITY // rightmost on the right side
                );
            }
            else {
                this.notificationsCenterStatusItem.update(statusProperties);
            }
        }
    }
    getDesiredAlignment() {
        const position = getNotificationsPosition(this.configurationService);
        switch (position) {
            case "bottom-left" /* NotificationsPosition.BOTTOM_LEFT */:
                return 0 /* StatusbarAlignment.LEFT */;
            case "top-right" /* NotificationsPosition.TOP_RIGHT */:
            case "bottom-right" /* NotificationsPosition.BOTTOM_RIGHT */:
            default:
                return 1 /* StatusbarAlignment.RIGHT */;
        }
    }
    getTooltip(notificationsInProgress) {
        if (this.isNotificationsCenterVisible) {
            return localize(4531, null);
        }
        if (this.model.notifications.length === 0) {
            return localize(4532, null);
        }
        if (notificationsInProgress === 0) {
            if (this.newNotificationsCount === 0) {
                return localize(4533, null);
            }
            if (this.newNotificationsCount === 1) {
                return localize(4534, null);
            }
            return localize(4535, null, this.newNotificationsCount);
        }
        if (this.newNotificationsCount === 0) {
            return localize(4536, null, notificationsInProgress);
        }
        if (this.newNotificationsCount === 1) {
            return localize(4537, null, notificationsInProgress);
        }
        return localize(4538, null, this.newNotificationsCount, notificationsInProgress);
    }
    update(isCenterVisible, isToastsVisible) {
        let updateNotificationsCenterStatusItem = false;
        if (this.isNotificationsCenterVisible !== isCenterVisible) {
            this.isNotificationsCenterVisible = isCenterVisible;
            this.newNotificationsCount = 0; // Showing the notification center resets the unread counter to 0
            updateNotificationsCenterStatusItem = true;
        }
        if (this.isNotificationsToastsVisible !== isToastsVisible) {
            this.isNotificationsToastsVisible = isToastsVisible;
            updateNotificationsCenterStatusItem = true;
        }
        // Update in status bar as needed
        if (updateNotificationsCenterStatusItem) {
            this.updateNotificationsCenterStatusItem();
        }
    }
    onDidChangeStatusMessage(e) {
        const statusItem = e.item;
        switch (e.kind) {
            // Show status notification
            case 0 /* StatusMessageChangeType.ADD */:
                this.doSetStatusMessage(statusItem);
                break;
            // Hide status notification (if its still the current one)
            case 1 /* StatusMessageChangeType.REMOVE */:
                if (this.currentStatusMessage && this.currentStatusMessage[0] === statusItem) {
                    dispose(this.currentStatusMessage[1]);
                    this.currentStatusMessage = undefined;
                }
                break;
        }
    }
    doSetStatusMessage(item) {
        const message = item.message;
        const showAfter = item.options && typeof item.options.showAfter === 'number' ? item.options.showAfter : 0;
        const hideAfter = item.options && typeof item.options.hideAfter === 'number' ? item.options.hideAfter : -1;
        // Dismiss any previous
        if (this.currentStatusMessage) {
            dispose(this.currentStatusMessage[1]);
        }
        // Create new
        let statusMessageEntry;
        let showHandle = setTimeout(() => {
            statusMessageEntry = this.statusbarService.addEntry({
                name: localize(4539, null),
                text: message,
                ariaLabel: message
            }, 'status.message', 0 /* StatusbarAlignment.LEFT */, Number.NEGATIVE_INFINITY /* last entry */);
            showHandle = undefined;
        }, showAfter);
        // Dispose function takes care of timeouts and actual entry
        let hideHandle;
        const statusMessageDispose = {
            dispose: () => {
                if (showHandle) {
                    clearTimeout(showHandle);
                }
                if (hideHandle) {
                    clearTimeout(hideHandle);
                }
                statusMessageEntry?.dispose();
            }
        };
        if (hideAfter > 0) {
            hideHandle = setTimeout(() => statusMessageDispose.dispose(), hideAfter);
        }
        // Remember as current status message
        this.currentStatusMessage = [item, statusMessageDispose];
    }
};
NotificationsStatus = __decorate([
    __param(1, IStatusbarService),
    __param(2, INotificationService),
    __param(3, IConfigurationService)
], NotificationsStatus);
export { NotificationsStatus };
//# sourceMappingURL=notificationsStatus.js.map