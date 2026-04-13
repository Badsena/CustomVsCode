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
import { localize } from '../../../../nls.js';
import { IActionWidgetService } from '../../../../platform/actionWidget/browser/actionWidget.js';
import { renderIcon } from '../../../../base/browser/ui/iconLabel/iconLabels.js';
const COPILOT_WORKTREE_PATTERN = 'copilot-worktree-';
const FILTER_THRESHOLD = 10;
/**
 * A self-contained widget for selecting a git branch.
 * Uses `IGitRepository.getRefs` to list local branches.
 * Copilot worktree branches are shown in a collapsible section;
 * other branches are listed without a section header.
 * Writes the selected branch to the new session object.
 */
let BranchPicker = class BranchPicker extends Disposable {
    get selectedBranch() {
        return this._selectedBranch;
    }
    /**
     * Sets a preferred branch to select when branches are loaded.
     */
    setPreferredBranch(branch) {
        this._preferredBranch = branch;
    }
    constructor(actionWidgetService) {
        super();
        this.actionWidgetService = actionWidgetService;
        this._branches = [];
        this._onDidChange = this._register(new Emitter());
        this.onDidChange = this._onDidChange.event;
        this._onDidChangeLoading = this._register(new Emitter());
        this.onDidChangeLoading = this._onDidChangeLoading.event;
        this._renderDisposables = this._register(new DisposableStore());
    }
    /**
     * Sets the git repository and loads its branches.
     * When undefined, the picker is shown disabled.
     */
    async setRepository(repository) {
        this._branches = [];
        this._selectedBranch = undefined;
        if (!repository) {
            this._onDidChange.fire(undefined);
            this._setLoading(false);
            this._updateTriggerLabel();
            return;
        }
        this._setLoading(true);
        try {
            const refs = await repository.getRefs({ pattern: 'refs/heads' });
            this._branches = refs
                .map(ref => ref.name)
                .filter((name) => !!name)
                .filter(name => !name.includes(COPILOT_WORKTREE_PATTERN));
            // Select preferred branch (from draft), active branch, main, master, or the first branch
            const preferred = this._preferredBranch;
            this._preferredBranch = undefined;
            const defaultBranch = (preferred ? this._branches.find(b => b === preferred) : undefined)
                ?? this._branches.find(b => b === repository.state.get().HEAD?.name)
                ?? this._branches.find(b => b === 'main')
                ?? this._branches.find(b => b === 'master')
                ?? this._branches[0];
            if (defaultBranch) {
                this._selectBranch(defaultBranch);
            }
        }
        finally {
            this._setLoading(false);
            this._updateTriggerLabel();
        }
    }
    /**
     * Renders the branch picker trigger into the given container.
     */
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
        this._renderDisposables.add(dom.addDisposableListener(trigger, dom.EventType.CLICK, (e) => {
            dom.EventHelper.stop(e, true);
            this.showPicker();
        }));
        this._renderDisposables.add(dom.addDisposableListener(trigger, dom.EventType.KEY_DOWN, (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                dom.EventHelper.stop(e, true);
                this.showPicker();
            }
        }));
    }
    /**
     * Shows or hides the picker.
     */
    setVisible(visible) {
        if (this._slotElement) {
            this._slotElement.style.display = visible ? '' : 'none';
        }
    }
    /**
     * Shows the branch picker dropdown anchored to the trigger element.
     */
    showPicker() {
        if (!this._triggerElement || this.actionWidgetService.isVisible || this._branches.length === 0) {
            return;
        }
        const items = this._buildItems();
        const triggerElement = this._triggerElement;
        const delegate = {
            onSelect: (item) => {
                this.actionWidgetService.hide();
                this._selectBranch(item.name);
            },
            onHide: () => { triggerElement.focus(); },
        };
        const totalActions = items.filter(i => i.kind === "action" /* ActionListItemKind.Action */).length;
        this.actionWidgetService.show('branchPicker', false, items, delegate, this._triggerElement, undefined, [], {
            getAriaLabel: (item) => item.label ?? '',
            getWidgetAriaLabel: () => localize(3122, null),
        }, totalActions > FILTER_THRESHOLD ? { showFilter: true, filterPlaceholder: localize(3123, null) } : undefined);
    }
    _buildItems() {
        return this._branches.map(branch => ({
            kind: "action" /* ActionListItemKind.Action */,
            label: branch,
            group: { title: '', icon: Codicon.gitBranch },
            item: { name: branch },
        }));
    }
    _selectBranch(branch) {
        if (this._selectedBranch !== branch) {
            this._selectedBranch = branch;
            this._onDidChange.fire(branch);
            this._updateTriggerLabel();
        }
    }
    _updateTriggerLabel() {
        if (!this._triggerElement) {
            return;
        }
        dom.clearNode(this._triggerElement);
        const isDisabled = this._branches.length === 0;
        const label = this._selectedBranch ?? localize(3124, null);
        dom.append(this._triggerElement, renderIcon(Codicon.gitBranch));
        const labelSpan = dom.append(this._triggerElement, dom.$('span.sessions-chat-dropdown-label'));
        labelSpan.textContent = label;
        dom.append(this._triggerElement, renderIcon(Codicon.chevronDown));
        this._slotElement?.classList.toggle('disabled', isDisabled);
    }
    _setLoading(loading) {
        this._onDidChangeLoading.fire(loading);
    }
};
BranchPicker = __decorate([
    __param(0, IActionWidgetService)
], BranchPicker);
export { BranchPicker };
//# sourceMappingURL=branchPicker.js.map