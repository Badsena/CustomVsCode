/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { constObservable } from '../../../base/common/observable.js';
import { Disposable } from '../../../base/common/lifecycle.js';
import { Emitter } from '../../../base/common/event.js';
import { createDecorator } from '../../instantiation/common/instantiation.js';
export const IUserInteractionService = createDecorator('userInteractionService');
/**
 * Mock implementation of IUserInteractionService that can be used for testing
 * or simulating specific interaction states.
 */
export class MockUserInteractionService {
    constructor(_simulateFocus = true, _simulateHover = false, _modifiers = { ctrlKey: false, shiftKey: false, altKey: false, metaKey: false }) {
        this._simulateFocus = _simulateFocus;
        this._simulateHover = _simulateHover;
        this._modifiers = _modifiers;
    }
    readModifierKeyStatus(_element, _reader) {
        return this._modifiers;
    }
    createFocusTracker(_element, _store) {
        return constObservable(this._simulateFocus);
    }
    createHoverTracker(_element, _store) {
        return constObservable(this._simulateHover);
    }
    createDomFocusTracker(_element) {
        const tracker = new class extends Disposable {
            constructor() {
                super(...arguments);
                this._onDidFocus = this._register(new Emitter());
                this.onDidFocus = this._onDidFocus.event;
                this._onDidBlur = this._register(new Emitter());
                this.onDidBlur = this._onDidBlur.event;
            }
            refreshState() { }
            fireFocus() { this._onDidFocus.fire(); }
        };
        if (this._simulateFocus) {
            queueMicrotask(() => tracker.fireFocus());
        }
        return tracker;
    }
}
//# sourceMappingURL=userInteractionService.js.map