/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { localize } from '../../../nls.js';
const commandPrefix = 'workbench.action.browser';
export var BrowserViewCommandId;
(function (BrowserViewCommandId) {
    BrowserViewCommandId["Open"] = "workbench.action.browser.open";
    BrowserViewCommandId["NewTab"] = "workbench.action.browser.newTab";
    BrowserViewCommandId["GoBack"] = "workbench.action.browser.goBack";
    BrowserViewCommandId["GoForward"] = "workbench.action.browser.goForward";
    BrowserViewCommandId["Reload"] = "workbench.action.browser.reload";
    BrowserViewCommandId["HardReload"] = "workbench.action.browser.hardReload";
    BrowserViewCommandId["FocusUrlInput"] = "workbench.action.browser.focusUrlInput";
    BrowserViewCommandId["AddElementToChat"] = "workbench.action.browser.addElementToChat";
    BrowserViewCommandId["AddConsoleLogsToChat"] = "workbench.action.browser.addConsoleLogsToChat";
    BrowserViewCommandId["ToggleDevTools"] = "workbench.action.browser.toggleDevTools";
    BrowserViewCommandId["OpenExternal"] = "workbench.action.browser.openExternal";
    BrowserViewCommandId["ClearGlobalStorage"] = "workbench.action.browser.clearGlobalStorage";
    BrowserViewCommandId["ClearWorkspaceStorage"] = "workbench.action.browser.clearWorkspaceStorage";
    BrowserViewCommandId["ClearEphemeralStorage"] = "workbench.action.browser.clearEphemeralStorage";
    BrowserViewCommandId["OpenSettings"] = "workbench.action.browser.openSettings";
    BrowserViewCommandId["ShowFind"] = "workbench.action.browser.showFind";
    BrowserViewCommandId["HideFind"] = "workbench.action.browser.hideFind";
    BrowserViewCommandId["FindNext"] = "workbench.action.browser.findNext";
    BrowserViewCommandId["FindPrevious"] = "workbench.action.browser.findPrevious";
})(BrowserViewCommandId || (BrowserViewCommandId = {}));
export var BrowserNewPageLocation;
(function (BrowserNewPageLocation) {
    BrowserNewPageLocation["Foreground"] = "foreground";
    BrowserNewPageLocation["Background"] = "background";
    BrowserNewPageLocation["NewWindow"] = "newWindow";
})(BrowserNewPageLocation || (BrowserNewPageLocation = {}));
export var BrowserViewStorageScope;
(function (BrowserViewStorageScope) {
    BrowserViewStorageScope["Global"] = "global";
    BrowserViewStorageScope["Workspace"] = "workspace";
    BrowserViewStorageScope["Ephemeral"] = "ephemeral";
})(BrowserViewStorageScope || (BrowserViewStorageScope = {}));
export const ipcBrowserViewChannelName = 'browserView';
/**
 * Discrete zoom levels matching Edge/Chrome.
 * Note: When those browsers say "33%" and "67%" zoom, they really mean 33.33...% and 66.66...%
 */
export const browserZoomFactors = [0.25, 1 / 3, 0.5, 2 / 3, 0.75, 0.8, 0.9, 1, 1.1, 1.25, 1.5, 1.75, 2, 2.5, 3, 4, 5];
export const browserZoomDefaultIndex = browserZoomFactors.indexOf(1);
export function browserZoomLabel(zoomFactor) {
    return localize(1926, null, Math.round(zoomFactor * 100));
}
export function browserZoomAccessibilityLabel(zoomFactor) {
    return localize(1927, null, Math.round(zoomFactor * 100));
}
/**
 * This should match the isolated world ID defined in `preload-browserView.ts`.
 */
export const browserViewIsolatedWorldId = 999;
//# sourceMappingURL=browserView.js.map