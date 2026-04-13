/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import './media/runScriptAction.css';
import * as dom from '../../../../base/browser/dom.js';
import { StandardKeyboardEvent } from '../../../../base/browser/keyboardEvent.js';
import { Button } from '../../../../base/browser/ui/button/button.js';
import { InputBox } from '../../../../base/browser/ui/inputbox/inputBox.js';
import { Radio } from '../../../../base/browser/ui/radio/radio.js';
import { Checkbox } from '../../../../base/browser/ui/toggle/toggle.js';
import { Emitter } from '../../../../base/common/event.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { localize } from '../../../../nls.js';
import { defaultButtonStyles, defaultCheckboxStyles, defaultInputBoxStyles } from '../../../../platform/theme/browser/defaultStyles.js';
export const WORKTREE_CREATED_RUN_ON = 'worktreeCreated';
export class RunScriptCustomTaskWidget extends Disposable {
    constructor(state) {
        super();
        this._onDidSubmit = this._register(new Emitter());
        this.onDidSubmit = this._onDidSubmit.event;
        this._onDidCancel = this._register(new Emitter());
        this.onDidCancel = this._onDidCancel.event;
        this._labelLocked = !!state.labelDisabledReason;
        this._commandLocked = !!state.commandDisabledReason;
        this._targetLocked = !!state.targetDisabledReason && state.target !== undefined;
        this._isExistingTask = state.mode === 'configure';
        this._isAddExistingTask = state.mode === 'add-existing';
        this._selectedTarget = state.target ?? (state.targetDisabledReason ? 'user' : 'workspace');
        this._initialLabel = state.label ?? '';
        this._initialCommand = state.command ?? '';
        this._initialRunOn = state.runOn === WORKTREE_CREATED_RUN_ON;
        this._initialTarget = this._selectedTarget;
        this.domNode = dom.$('.run-script-action-widget');
        const labelSection = dom.append(this.domNode, dom.$('.run-script-action-section'));
        dom.append(labelSection, dom.$('label.run-script-action-label', undefined, localize(3227, null)));
        const labelInputContainer = dom.append(labelSection, dom.$('.run-script-action-input'));
        this._labelInput = this._register(new InputBox(labelInputContainer, undefined, {
            placeholder: localize(3228, null),
            tooltip: state.labelDisabledReason,
            ariaLabel: localize(3229, null),
            inputBoxStyles: defaultInputBoxStyles,
        }));
        this._labelInput.value = state.label ?? '';
        if (state.labelDisabledReason) {
            this._labelInput.disable();
        }
        const commandSection = dom.append(this.domNode, dom.$('.run-script-action-section'));
        dom.append(commandSection, dom.$('label.run-script-action-label', undefined, localize(3230, null)));
        const commandInputContainer = dom.append(commandSection, dom.$('.run-script-action-input'));
        this._commandInput = this._register(new InputBox(commandInputContainer, undefined, {
            placeholder: localize(3231, null),
            tooltip: state.commandDisabledReason,
            ariaLabel: localize(3232, null),
            inputBoxStyles: defaultInputBoxStyles,
        }));
        this._commandInput.value = state.command ?? '';
        if (state.commandDisabledReason) {
            this._commandInput.disable();
        }
        const runOnSection = dom.append(this.domNode, dom.$('.run-script-action-section'));
        dom.append(runOnSection, dom.$('div.run-script-action-label', undefined, localize(3233, null)));
        const runOnRow = dom.append(runOnSection, dom.$('.run-script-action-option-row'));
        this._runOnCheckbox = this._register(new Checkbox(localize(3234, null), state.runOn === WORKTREE_CREATED_RUN_ON, defaultCheckboxStyles));
        runOnRow.appendChild(this._runOnCheckbox.domNode);
        const runOnText = dom.append(runOnRow, dom.$('span.run-script-action-option-text', undefined, localize(3235, null)));
        this._register(dom.addDisposableListener(runOnText, dom.EventType.CLICK, () => this._runOnCheckbox.checked = !this._runOnCheckbox.checked));
        const storageSection = dom.append(this.domNode, dom.$('.run-script-action-section'));
        dom.append(storageSection, dom.$('div.run-script-action-label', undefined, localize(3236, null)));
        const storageDisabledReason = state.targetDisabledReason;
        const workspaceTargetDisabled = !!storageDisabledReason;
        this._storageOptions = this._register(new Radio({
            items: [
                {
                    text: localize(3237, null),
                    tooltip: storageDisabledReason ?? localize(3238, null),
                    isActive: this._selectedTarget === 'workspace',
                    disabled: workspaceTargetDisabled,
                },
                {
                    text: localize(3239, null),
                    tooltip: this._targetLocked ? storageDisabledReason : localize(3240, null),
                    isActive: this._selectedTarget === 'user',
                    disabled: this._targetLocked,
                }
            ]
        }));
        this._storageOptions.domNode.setAttribute('aria-label', localize(3241, null));
        storageSection.appendChild(this._storageOptions.domNode);
        if (storageDisabledReason && !this._targetLocked) {
            dom.append(storageSection, dom.$('div.run-script-action-hint', undefined, storageDisabledReason));
        }
        const buttonRow = dom.append(this.domNode, dom.$('.run-script-action-buttons'));
        this._cancelButton = this._register(new Button(buttonRow, { ...defaultButtonStyles, secondary: true }));
        this._cancelButton.label = localize(3242, null);
        this._submitButton = this._register(new Button(buttonRow, defaultButtonStyles));
        this._submitButton.label = this._getSubmitLabel();
        this._register(this._labelInput.onDidChange(() => this._updateButtonState()));
        this._register(this._commandInput.onDidChange(() => this._updateButtonState()));
        this._register(this._storageOptions.onDidSelect(index => {
            this._selectedTarget = index === 0 ? 'workspace' : 'user';
            this._updateButtonState();
        }));
        this._register(this._runOnCheckbox.onChange(() => this._updateButtonState()));
        this._register(this._submitButton.onDidClick(() => this._submit()));
        this._register(this._cancelButton.onDidClick(() => this._onDidCancel.fire()));
        this._register(dom.addDisposableListener(this._labelInput.inputElement, dom.EventType.KEY_DOWN, event => {
            const keyboardEvent = new StandardKeyboardEvent(event);
            if (keyboardEvent.equals(3 /* KeyCode.Enter */)) {
                keyboardEvent.preventDefault();
                keyboardEvent.stopPropagation();
                this._submit();
            }
        }));
        this._register(dom.addDisposableListener(this._commandInput.inputElement, dom.EventType.KEY_DOWN, event => {
            const keyboardEvent = new StandardKeyboardEvent(event);
            if (keyboardEvent.equals(3 /* KeyCode.Enter */)) {
                keyboardEvent.preventDefault();
                keyboardEvent.stopPropagation();
                this._submit();
            }
        }));
        this._register(dom.addDisposableListener(this.domNode, dom.EventType.KEY_DOWN, event => {
            const keyboardEvent = new StandardKeyboardEvent(event);
            if (keyboardEvent.equals(9 /* KeyCode.Escape */)) {
                keyboardEvent.preventDefault();
                keyboardEvent.stopPropagation();
                this._onDidCancel.fire();
            }
        }));
        this._updateButtonState();
    }
    focus() {
        if (!this._labelLocked) {
            this._labelInput.focus();
            return;
        }
        if (this._commandLocked) {
            this._runOnCheckbox.focus();
            return;
        }
        this._commandInput.focus();
    }
    _submit() {
        const label = this._labelInput.value.trim();
        const command = this._commandInput.value.trim();
        if (!command) {
            return;
        }
        this._onDidSubmit.fire({
            label: label.length > 0 ? label : undefined,
            command,
            target: this._selectedTarget,
            runOn: this._runOnCheckbox.checked ? WORKTREE_CREATED_RUN_ON : undefined,
        });
    }
    _updateButtonState() {
        this._submitButton.enabled = this._commandInput.value.trim().length > 0;
        this._submitButton.label = this._getSubmitLabel();
    }
    _getSubmitLabel() {
        if (this._isAddExistingTask) {
            return localize(3243, null);
        }
        if (!this._isExistingTask) {
            return localize(3244, null);
        }
        const targetChanged = this._selectedTarget !== this._initialTarget;
        const labelChanged = this._labelInput.value !== this._initialLabel;
        const commandChanged = this._commandInput.value !== this._initialCommand;
        const runOnChanged = this._runOnCheckbox.checked !== this._initialRunOn;
        const otherChanged = labelChanged || commandChanged || runOnChanged;
        if (targetChanged && otherChanged) {
            return localize(3245, null);
        }
        if (targetChanged) {
            return localize(3246, null);
        }
        return localize(3247, null);
    }
}
//# sourceMappingURL=runScriptCustomTaskWidget.js.map