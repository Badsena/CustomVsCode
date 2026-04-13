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
import { Codicon } from '../../../../base/common/codicons.js';
import { Emitter } from '../../../../base/common/event.js';
import { Disposable, DisposableStore } from '../../../../base/common/lifecycle.js';
import { renderIcon } from '../../../../base/browser/ui/iconLabel/iconLabels.js';
import { localize } from '../../../../nls.js';
import { IActionWidgetService } from '../../../../platform/actionWidget/browser/actionWidget.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
// #endregion
// #region --- Target Picker ---
/**
 * A self-contained widget for selecting the session target type.
 *
 * Options:
 * - **Copilot CLI** (`cli`) — local agent session
 * - **Cloud** (`cloud`) — remote/cloud agent session
 *
 * The target is determined by the project type (folder → CLI, repo → Cloud).
 * Emits `onDidChange` with the selected `SessionTargetType` when the target changes.
 */
export class SessionTypePicker extends Disposable {
    get sessionTarget() {
        return this._sessionTarget;
    }
    get isCli() {
        return this._sessionTarget === 'copilot-cli';
    }
    get isCloud() {
        return this._sessionTarget === 'cloud';
    }
    constructor() {
        super();
        this._sessionTarget = 'copilot-cli';
        this._onDidChange = this._register(new Emitter());
        this.onDidChange = this._onDidChange.event;
        this._renderDisposables = this._register(new DisposableStore());
    }
    /**
     * Sets the current project context. Determines the target type:
     * - Repo project → cloud
     * - Folder project → cli
     * - No project → retains current target
     */
    setProject(project) {
        this._project = project;
        this._updateTarget();
        this._updateTriggerLabel();
    }
    _updateTarget() {
        if (this._project?.isRepo) {
            this._setTarget('cloud');
            return;
        }
        if (this._project?.isFolder) {
            this._setTarget('copilot-cli');
            return;
        }
    }
    render(container) {
        this._renderDisposables.clear();
        const slot = dom.append(container, dom.$('.sessions-chat-picker-slot'));
        this._slotElement = slot;
        this._renderDisposables.add({ dispose: () => slot.remove() });
        const trigger = dom.append(slot, dom.$('a.action-label'));
        trigger.tabIndex = -1;
        trigger.role = 'button';
        trigger.setAttribute('aria-disabled', 'true');
        this._triggerElement = trigger;
        this._updateTriggerLabel();
    }
    _setTarget(target) {
        if (this._sessionTarget !== target) {
            this._sessionTarget = target;
            this._updateTriggerLabel();
            this._onDidChange.fire(target);
        }
    }
    _updateTriggerLabel() {
        if (!this._triggerElement) {
            return;
        }
        dom.clearNode(this._triggerElement);
        let modeIcon;
        let modeLabel;
        switch (this._sessionTarget) {
            case 'cloud':
                modeIcon = Codicon.cloud;
                modeLabel = localize(3248, null);
                break;
            case 'copilot-cli':
            default:
                modeIcon = Codicon.worktree;
                modeLabel = localize(3249, null);
                break;
        }
        dom.append(this._triggerElement, renderIcon(modeIcon));
        const labelSpan = dom.append(this._triggerElement, dom.$('span.sessions-chat-dropdown-label'));
        labelSpan.textContent = modeLabel;
        this._slotElement?.classList.toggle('disabled', true);
    }
}
// #endregion
// #region --- Isolation Picker ---
/**
 * A self-contained widget for selecting the isolation mode.
 *
 * Options:
 * - **Worktree** (`worktree`) — run in a git worktree
 * - **Folder** (`workspace`) — run directly in the folder
 *
 * Only visible when isolation option is enabled, project has a git repo,
 * and the target is CLI.
 *
 * Emits `onDidChange` with the selected `IsolationMode` when the user picks an option.
 */
let IsolationPicker = class IsolationPicker extends Disposable {
    get isolationMode() {
        return this._isolationMode;
    }
    get isWorktree() {
        return this._isolationMode === 'worktree';
    }
    get isFolder() {
        return this._isolationMode === 'workspace';
    }
    constructor(actionWidgetService, configurationService) {
        super();
        this.actionWidgetService = actionWidgetService;
        this.configurationService = configurationService;
        this._isolationMode = 'worktree';
        this._hasGitRepo = false;
        this._visible = true;
        this._onDidChange = this._register(new Emitter());
        this.onDidChange = this._onDidChange.event;
        this._renderDisposables = this._register(new DisposableStore());
        this._isolationOptionEnabled = this.configurationService.getValue('github.copilot.chat.cli.isolationOption.enabled') !== false;
        this._register(this.configurationService.onDidChangeConfiguration(e => {
            if (e.affectsConfiguration('github.copilot.chat.cli.isolationOption.enabled')) {
                this._isolationOptionEnabled = this.configurationService.getValue('github.copilot.chat.cli.isolationOption.enabled') !== false;
                if (!this._isolationOptionEnabled) {
                    // Reset to worktree when isolation option is disabled
                    this._setMode('worktree');
                }
                this._updateVisibility();
                this._updateTriggerLabel();
            }
        }));
    }
    /**
     * Sets whether the project has a git repository.
     * Resets isolation mode to the appropriate default.
     */
    setHasGitRepo(hasRepo) {
        this._hasGitRepo = hasRepo;
        if (!hasRepo) {
            this._setMode('workspace');
        }
        else {
            this._setMode('worktree');
        }
        this._updateVisibility();
        this._updateTriggerLabel();
    }
    /**
     * Sets external visibility (e.g. hidden when target is Cloud).
     */
    setVisible(visible) {
        this._visible = visible;
        this._updateVisibility();
    }
    render(container) {
        this._renderDisposables.clear();
        const slot = dom.append(container, dom.$('.sessions-chat-picker-slot'));
        this._slotElement = slot;
        this._renderDisposables.add({ dispose: () => slot.remove() });
        const trigger = dom.append(slot, dom.$('a.action-label'));
        trigger.tabIndex = 0;
        trigger.role = 'button';
        this._triggerElement = trigger;
        this._updateTriggerLabel();
        this._updateVisibility();
        this._renderDisposables.add(dom.addDisposableListener(trigger, dom.EventType.CLICK, (e) => {
            dom.EventHelper.stop(e, true);
            this._showPicker();
        }));
        this._renderDisposables.add(dom.addDisposableListener(trigger, dom.EventType.KEY_DOWN, (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                dom.EventHelper.stop(e, true);
                this._showPicker();
            }
        }));
    }
    _showPicker() {
        if (!this._triggerElement || this.actionWidgetService.isVisible) {
            return;
        }
        if (!this._hasGitRepo || !this._isolationOptionEnabled) {
            return;
        }
        const items = [
            {
                kind: "action" /* ActionListItemKind.Action */,
                label: localize(3250, null),
                group: { title: '', icon: Codicon.worktree },
                item: 'worktree',
            },
            {
                kind: "action" /* ActionListItemKind.Action */,
                label: localize(3251, null),
                group: { title: '', icon: Codicon.folder },
                item: 'workspace',
            },
        ];
        const triggerElement = this._triggerElement;
        const delegate = {
            onSelect: (mode) => {
                this.actionWidgetService.hide();
                this._setMode(mode);
            },
            onHide: () => { triggerElement.focus(); },
        };
        this.actionWidgetService.show('isolationPicker', false, items, delegate, this._triggerElement, undefined, [], {
            getAriaLabel: (item) => item.label ?? '',
            getWidgetAriaLabel: () => localize(3252, null),
        });
    }
    _setMode(mode) {
        if (this._isolationMode !== mode) {
            this._isolationMode = mode;
            this._updateTriggerLabel();
            this._onDidChange.fire(mode);
        }
    }
    _updateVisibility() {
        if (!this._slotElement) {
            return;
        }
        const shouldShow = this._visible && this._hasGitRepo && this._isolationOptionEnabled;
        this._slotElement.style.display = shouldShow ? '' : 'none';
    }
    _updateTriggerLabel() {
        if (!this._triggerElement) {
            return;
        }
        dom.clearNode(this._triggerElement);
        let modeIcon;
        let modeLabel;
        switch (this._isolationMode) {
            case 'workspace':
                modeIcon = Codicon.folder;
                modeLabel = localize(3253, null);
                break;
            case 'worktree':
            default:
                modeIcon = Codicon.worktree;
                modeLabel = localize(3254, null);
                break;
        }
        dom.append(this._triggerElement, renderIcon(modeIcon));
        const labelSpan = dom.append(this._triggerElement, dom.$('span.sessions-chat-dropdown-label'));
        labelSpan.textContent = modeLabel;
        dom.append(this._triggerElement, renderIcon(Codicon.chevronDown));
    }
};
IsolationPicker = __decorate([
    __param(0, IActionWidgetService),
    __param(1, IConfigurationService)
], IsolationPicker);
export { IsolationPicker };
// #endregion
//# sourceMappingURL=sessionTargetPicker.js.map