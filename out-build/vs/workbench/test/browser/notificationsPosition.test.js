/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { TestConfigurationService } from '../../../platform/configuration/test/common/testConfigurationService.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../base/test/common/utils.js';
import { DEFAULT_CUSTOM_TITLEBAR_HEIGHT } from '../../../platform/window/common/window.js';
import { Codicon } from '../../../base/common/codicons.js';
import { hideIcon, hideUpIcon, getNotificationExpandIcon, getNotificationCollapseIcon } from '../../browser/parts/notifications/notificationsActions.js';
suite('Notifications Position', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    suite('Configuration', () => {
        test('defaults to bottom-right when no configuration is set', () => {
            const configurationService = new TestConfigurationService();
            const position = configurationService.getValue("workbench.notifications.position" /* NotificationsSettings.NOTIFICATIONS_POSITION */) ?? "bottom-right" /* NotificationsPosition.BOTTOM_RIGHT */;
            assert.strictEqual(position, "bottom-right" /* NotificationsPosition.BOTTOM_RIGHT */);
        });
        test('returns bottom-left when configured', async () => {
            const configurationService = new TestConfigurationService();
            await configurationService.setUserConfiguration("workbench.notifications.position" /* NotificationsSettings.NOTIFICATIONS_POSITION */, "bottom-left" /* NotificationsPosition.BOTTOM_LEFT */);
            const position = configurationService.getValue("workbench.notifications.position" /* NotificationsSettings.NOTIFICATIONS_POSITION */);
            assert.strictEqual(position, "bottom-left" /* NotificationsPosition.BOTTOM_LEFT */);
        });
        test('returns top-right when configured', async () => {
            const configurationService = new TestConfigurationService();
            await configurationService.setUserConfiguration("workbench.notifications.position" /* NotificationsSettings.NOTIFICATIONS_POSITION */, "top-right" /* NotificationsPosition.TOP_RIGHT */);
            const position = configurationService.getValue("workbench.notifications.position" /* NotificationsSettings.NOTIFICATIONS_POSITION */);
            assert.strictEqual(position, "top-right" /* NotificationsPosition.TOP_RIGHT */);
        });
        test('returns bottom-right when configured', async () => {
            const configurationService = new TestConfigurationService();
            await configurationService.setUserConfiguration("workbench.notifications.position" /* NotificationsSettings.NOTIFICATIONS_POSITION */, "bottom-right" /* NotificationsPosition.BOTTOM_RIGHT */);
            const position = configurationService.getValue("workbench.notifications.position" /* NotificationsSettings.NOTIFICATIONS_POSITION */);
            assert.strictEqual(position, "bottom-right" /* NotificationsPosition.BOTTOM_RIGHT */);
        });
    });
    suite('Status Bar Alignment', () => {
        function getDesiredAlignment(position) {
            switch (position) {
                case "bottom-left" /* NotificationsPosition.BOTTOM_LEFT */:
                    return 'left';
                case "top-right" /* NotificationsPosition.TOP_RIGHT */:
                    return 'hidden'; // bell is in titlebar instead
                case "bottom-right" /* NotificationsPosition.BOTTOM_RIGHT */:
                default:
                    return 'right';
            }
        }
        test('bottom-right position aligns bell to right', () => {
            assert.strictEqual(getDesiredAlignment("bottom-right" /* NotificationsPosition.BOTTOM_RIGHT */), 'right');
        });
        test('bottom-left position aligns bell to left', () => {
            assert.strictEqual(getDesiredAlignment("bottom-left" /* NotificationsPosition.BOTTOM_LEFT */), 'left');
        });
        test('top-right position hides status bar bell', () => {
            assert.strictEqual(getDesiredAlignment("top-right" /* NotificationsPosition.TOP_RIGHT */), 'hidden');
        });
    });
    suite('Top Offset for Top-Right', () => {
        function computeTopOffset(position, titleBarVisible) {
            if (position !== "top-right" /* NotificationsPosition.TOP_RIGHT */) {
                return undefined;
            }
            let topOffset = 7;
            if (titleBarVisible) {
                topOffset += DEFAULT_CUSTOM_TITLEBAR_HEIGHT;
            }
            return topOffset;
        }
        test('bottom-right has no top offset', () => {
            assert.strictEqual(computeTopOffset("bottom-right" /* NotificationsPosition.BOTTOM_RIGHT */, true), undefined);
        });
        test('bottom-left has no top offset', () => {
            assert.strictEqual(computeTopOffset("bottom-left" /* NotificationsPosition.BOTTOM_LEFT */, true), undefined);
        });
        test('top-right without titlebar has 7px offset', () => {
            assert.strictEqual(computeTopOffset("top-right" /* NotificationsPosition.TOP_RIGHT */, false), 7);
        });
        test('top-right with titlebar has 42px offset', () => {
            assert.strictEqual(computeTopOffset("top-right" /* NotificationsPosition.TOP_RIGHT */, true), 42);
        });
    });
    suite('NotificationsPosition Enum Values', () => {
        test('enum values match expected strings', () => {
            assert.strictEqual("bottom-right" /* NotificationsPosition.BOTTOM_RIGHT */, 'bottom-right');
            assert.strictEqual("bottom-left" /* NotificationsPosition.BOTTOM_LEFT */, 'bottom-left');
            assert.strictEqual("top-right" /* NotificationsPosition.TOP_RIGHT */, 'top-right');
        });
        test('setting key is correct', () => {
            assert.strictEqual("workbench.notifications.position" /* NotificationsSettings.NOTIFICATIONS_POSITION */, 'workbench.notifications.position');
        });
        test('button setting key is correct', () => {
            assert.strictEqual("workbench.notifications.showInTitleBar" /* NotificationsSettings.NOTIFICATIONS_BUTTON */, 'workbench.notifications.showInTitleBar');
        });
    });
    suite('Hide Notifications Icon', () => {
        function getHideIcon(position) {
            return position === "top-right" /* NotificationsPosition.TOP_RIGHT */ ? hideUpIcon : hideIcon;
        }
        test('bottom-right uses chevron down icon', () => {
            assert.strictEqual(getHideIcon("bottom-right" /* NotificationsPosition.BOTTOM_RIGHT */).id, hideIcon.id);
        });
        test('bottom-left uses chevron down icon', () => {
            assert.strictEqual(getHideIcon("bottom-left" /* NotificationsPosition.BOTTOM_LEFT */).id, hideIcon.id);
        });
        test('top-right uses chevron up icon', () => {
            assert.strictEqual(getHideIcon("top-right" /* NotificationsPosition.TOP_RIGHT */).id, hideUpIcon.id);
        });
        test('hide icon defaults use correct codicons', () => {
            assert.strictEqual(Codicon.chevronDown.id, 'chevron-down');
            assert.strictEqual(Codicon.chevronUp.id, 'chevron-up');
        });
    });
    suite('Expand/Collapse Notification Icons', () => {
        test('bottom-right expand uses notifications-expand icon', () => {
            assert.strictEqual(getNotificationExpandIcon("bottom-right" /* NotificationsPosition.BOTTOM_RIGHT */).id, 'notifications-expand');
        });
        test('bottom-left expand uses notifications-expand icon', () => {
            assert.strictEqual(getNotificationExpandIcon("bottom-left" /* NotificationsPosition.BOTTOM_LEFT */).id, 'notifications-expand');
        });
        test('top-right expand uses notifications-expand-down icon', () => {
            assert.strictEqual(getNotificationExpandIcon("top-right" /* NotificationsPosition.TOP_RIGHT */).id, 'notifications-expand-down');
        });
        test('bottom-right collapse uses notifications-collapse icon', () => {
            assert.strictEqual(getNotificationCollapseIcon("bottom-right" /* NotificationsPosition.BOTTOM_RIGHT */).id, 'notifications-collapse');
        });
        test('bottom-left collapse uses notifications-collapse icon', () => {
            assert.strictEqual(getNotificationCollapseIcon("bottom-left" /* NotificationsPosition.BOTTOM_LEFT */).id, 'notifications-collapse');
        });
        test('top-right collapse uses notifications-collapse-up icon', () => {
            assert.strictEqual(getNotificationCollapseIcon("top-right" /* NotificationsPosition.TOP_RIGHT */).id, 'notifications-collapse-up');
        });
    });
});
//# sourceMappingURL=notificationsPosition.test.js.map