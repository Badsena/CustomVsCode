/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { upcast } from '../../../base/common/types.js';
import { createDecorator } from '../../instantiation/common/instantiation.js';
/**
 * Updates are run as a state machine:
 *
 *      Uninitialized
 *           ↓
 *          Idle
 *          ↓  ↑
 *   Checking for Updates  →  Available for Download
 *         ↓                    ↓
 *                     ←   Overwriting
 *     Downloading              ↑
 *                     →      Ready
 *         ↓                    ↑
 *     Downloaded      →     Updating
 *
 * Available: There is an update available for download (linux, darwin on metered connection).
 * Ready: Code will be updated as soon as it restarts (win32, darwin).
 * Downloaded: There is an update ready to be installed in the background (win32).
 * Overwriting: A newer update is being downloaded to replace the pending update (darwin).
 */
export var StateType;
(function (StateType) {
    StateType["Uninitialized"] = "uninitialized";
    StateType["Idle"] = "idle";
    StateType["Disabled"] = "disabled";
    StateType["CheckingForUpdates"] = "checking for updates";
    StateType["AvailableForDownload"] = "available for download";
    StateType["Downloading"] = "downloading";
    StateType["Downloaded"] = "downloaded";
    StateType["Updating"] = "updating";
    StateType["Ready"] = "ready";
    StateType["Overwriting"] = "overwriting";
})(StateType || (StateType = {}));
export var UpdateType;
(function (UpdateType) {
    UpdateType[UpdateType["Setup"] = 0] = "Setup";
    UpdateType[UpdateType["Archive"] = 1] = "Archive";
    UpdateType[UpdateType["Snap"] = 2] = "Snap";
})(UpdateType || (UpdateType = {}));
export var DisablementReason;
(function (DisablementReason) {
    DisablementReason[DisablementReason["NotBuilt"] = 0] = "NotBuilt";
    DisablementReason[DisablementReason["DisabledByEnvironment"] = 1] = "DisabledByEnvironment";
    DisablementReason[DisablementReason["ManuallyDisabled"] = 2] = "ManuallyDisabled";
    DisablementReason[DisablementReason["Policy"] = 3] = "Policy";
    DisablementReason[DisablementReason["MissingConfiguration"] = 4] = "MissingConfiguration";
    DisablementReason[DisablementReason["InvalidConfiguration"] = 5] = "InvalidConfiguration";
    DisablementReason[DisablementReason["RunningAsAdmin"] = 6] = "RunningAsAdmin";
})(DisablementReason || (DisablementReason = {}));
export const State = {
    Uninitialized: upcast({ type: "uninitialized" /* StateType.Uninitialized */ }),
    Disabled: (reason) => ({ type: "disabled" /* StateType.Disabled */, reason }),
    Idle: (updateType, error, notAvailable) => ({ type: "idle" /* StateType.Idle */, updateType, error, notAvailable }),
    CheckingForUpdates: (explicit) => ({ type: "checking for updates" /* StateType.CheckingForUpdates */, explicit }),
    AvailableForDownload: (update, canInstall) => ({ type: "available for download" /* StateType.AvailableForDownload */, update, canInstall }),
    Downloading: (update, explicit, overwrite, downloadedBytes, totalBytes, startTime) => ({ type: "downloading" /* StateType.Downloading */, update, explicit, overwrite, downloadedBytes, totalBytes, startTime }),
    Downloaded: (update, explicit, overwrite) => ({ type: "downloaded" /* StateType.Downloaded */, update, explicit, overwrite }),
    Updating: (update, currentProgress, maxProgress) => ({ type: "updating" /* StateType.Updating */, update, currentProgress, maxProgress }),
    Ready: (update, explicit, overwrite) => ({ type: "ready" /* StateType.Ready */, update, explicit, overwrite }),
    Overwriting: (update, explicit) => ({ type: "overwriting" /* StateType.Overwriting */, update, explicit }),
};
export const IUpdateService = createDecorator('updateService');
//# sourceMappingURL=update.js.map