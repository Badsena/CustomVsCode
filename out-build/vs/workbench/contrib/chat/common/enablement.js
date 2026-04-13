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
import { observableMemento } from '../../../../platform/observable/common/observableMemento.js';
import { IStorageService } from '../../../../platform/storage/common/storage.js';
export var ContributionEnablementState;
(function (ContributionEnablementState) {
    ContributionEnablementState[ContributionEnablementState["DisabledProfile"] = 0] = "DisabledProfile";
    ContributionEnablementState[ContributionEnablementState["DisabledWorkspace"] = 1] = "DisabledWorkspace";
    ContributionEnablementState[ContributionEnablementState["EnabledProfile"] = 2] = "EnabledProfile";
    ContributionEnablementState[ContributionEnablementState["EnabledWorkspace"] = 3] = "EnabledWorkspace";
})(ContributionEnablementState || (ContributionEnablementState = {}));
export function isContributionEnabled(state) {
    return state === 2 /* ContributionEnablementState.EnabledProfile */ || state === 3 /* ContributionEnablementState.EnabledWorkspace */;
}
export function isContributionDisabled(state) {
    return !isContributionEnabled(state);
}
function mapToStorage(value) {
    return JSON.stringify([...value]);
}
function mapFromStorage(value) {
    const parsed = JSON.parse(value);
    return new Map(Array.isArray(parsed) ? parsed : []);
}
/**
 * A reusable enablement model for string-keyed contributions. Uses
 * `observableMemento` to persist enable/disable state in both profile-scoped
 * and workspace-scoped storage.
 *
 * Resolution order: if a workspace-scoped entry exists for a key, it wins.
 * Otherwise, the profile-scoped entry is used. The default (absence of any
 * entry) is {@link ContributionEnablementState.EnabledProfile}.
 */
let EnablementModel = class EnablementModel extends Disposable {
    constructor(storageKey, storageService) {
        super();
        const mapMemento = observableMemento({
            key: storageKey,
            defaultValue: new Map(),
            toStorage: mapToStorage,
            fromStorage: mapFromStorage,
        });
        this._profileState = this._register(mapMemento(0 /* StorageScope.PROFILE */, 1 /* StorageTarget.MACHINE */, storageService));
        this._workspaceState = this._register(mapMemento(1 /* StorageScope.WORKSPACE */, 1 /* StorageTarget.MACHINE */, storageService));
    }
    readEnabled(key, reader) {
        const wsMap = this._workspaceState.read(reader);
        if (wsMap.has(key)) {
            return wsMap.get(key)
                ? 3 /* ContributionEnablementState.EnabledWorkspace */
                : 1 /* ContributionEnablementState.DisabledWorkspace */;
        }
        const profileMap = this._profileState.read(reader);
        if (profileMap.has(key)) {
            return profileMap.get(key)
                ? 2 /* ContributionEnablementState.EnabledProfile */
                : 0 /* ContributionEnablementState.DisabledProfile */;
        }
        return 2 /* ContributionEnablementState.EnabledProfile */;
    }
    setEnabled(key, state) {
        switch (state) {
            case 2 /* ContributionEnablementState.EnabledProfile */: {
                // Enabled-profile is the default: remove key from profile state,
                // and also remove any workspace override.
                this._deleteFromMap(this._profileState, key);
                this._deleteFromMap(this._workspaceState, key);
                break;
            }
            case 0 /* ContributionEnablementState.DisabledProfile */: {
                // Store disabled in profile, remove workspace override.
                this._setInMap(this._profileState, key, false);
                this._deleteFromMap(this._workspaceState, key);
                break;
            }
            case 3 /* ContributionEnablementState.EnabledWorkspace */: {
                // Workspace override: always store explicitly.
                this._setInMap(this._workspaceState, key, true);
                break;
            }
            case 1 /* ContributionEnablementState.DisabledWorkspace */: {
                // Workspace override: always store explicitly.
                this._setInMap(this._workspaceState, key, false);
                break;
            }
        }
    }
    remove(key) {
        this._deleteFromMap(this._profileState, key);
        this._deleteFromMap(this._workspaceState, key);
    }
    _setInMap(memento, key, value) {
        const current = memento.get();
        if (current.get(key) === value) {
            return;
        }
        const next = new Map(current);
        next.set(key, value);
        memento.set(next, undefined);
    }
    _deleteFromMap(memento, key) {
        const current = memento.get();
        if (!current.has(key)) {
            return;
        }
        const next = new Map(current);
        next.delete(key);
        memento.set(next, undefined);
    }
};
EnablementModel = __decorate([
    __param(1, IStorageService)
], EnablementModel);
export { EnablementModel };
//# sourceMappingURL=enablement.js.map