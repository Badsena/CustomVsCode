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
import { autorun, debouncedObservable, derived, observableSignalFromEvent, observableValue, runOnChange, waitForState } from '../../../../base/common/observable.js';
import { observableCodeEditor } from '../../../../editor/browser/observableCodeEditor.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { CTX_INLINE_CHAT_AFFORDANCE_VISIBLE } from '../common/inlineChat.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { observableConfigValue } from '../../../../platform/observable/common/platformObservableUtils.js';
import { IChatEntitlementService } from '../../../services/chat/common/chatEntitlementService.js';
import { InlineChatEditorAffordance } from './inlineChatEditorAffordance.js';
import { InlineChatGutterAffordance } from './inlineChatGutterAffordance.js';
import { assertType } from '../../../../base/common/types.js';
import { IInlineChatSessionService } from './inlineChatSessionService.js';
import { CodeActionController } from '../../../../editor/contrib/codeAction/browser/codeActionController.js';
import { ITelemetryService } from '../../../../platform/telemetry/common/telemetry.js';
import { generateUuid } from '../../../../base/common/uuid.js';
import { Event } from '../../../../base/common/event.js';
import { IContextKeyService } from '../../../../platform/contextkey/common/contextkey.js';
let InlineChatAffordance = class InlineChatAffordance extends Disposable {
    #editor;
    #inputWidget;
    #instantiationService;
    #menuData = observableValue(this, undefined);
    #selectionData = observableValue(this, undefined);
    constructor(editor, inputWidget, instantiationService, configurationService, chatEntiteldService, inlineChatSessionService, telemetryService, contextKeyService) {
        super();
        this.#editor = editor;
        this.#inputWidget = inputWidget;
        this.#instantiationService = instantiationService;
        const editorObs = observableCodeEditor(this.#editor);
        const affordance = observableConfigValue("inlineChat.affordance" /* InlineChatConfigKeys.Affordance */, 'off', configurationService);
        const debouncedSelection = debouncedObservable(editorObs.cursorSelection, 500);
        const selectionData = this.#selectionData;
        const ctxAffordanceVisible = CTX_INLINE_CHAT_AFFORDANCE_VISIBLE.bindTo(contextKeyService);
        this._store.add({ dispose: () => ctxAffordanceVisible.reset() });
        let explicitSelection = false;
        let affordanceId;
        this._store.add(runOnChange(editorObs.selections, (value, _prev, events) => {
            explicitSelection = events.every(e => e.reason === 3 /* CursorChangeReason.Explicit */);
            if (!value || value.length !== 1 || value[0].isEmpty() || !explicitSelection) {
                selectionData.set(undefined, undefined);
            }
        }));
        this._store.add(autorun(r => {
            const value = debouncedSelection.read(r);
            if (!value || value.isEmpty() || !explicitSelection || this.#editor.getModel()?.getValueInRange(value).match(/^\s+$/)) {
                selectionData.set(undefined, undefined);
                affordanceId = undefined;
                return;
            }
            affordanceId = generateUuid();
            const mode = affordance.read(undefined);
            if (mode === 'gutter' || mode === 'editor') {
                telemetryService.publicLog2('inlineChatAffordance/shown', { mode, id: affordanceId, commandId: '' });
            }
            selectionData.set(value, undefined);
        }));
        this._store.add(autorun(r => {
            if (chatEntiteldService.sentimentObs.read(r).hidden) {
                selectionData.set(undefined, undefined);
            }
        }));
        const hasSessionObs = derived(r => {
            observableSignalFromEvent(this, inlineChatSessionService.onDidChangeSessions).read(r);
            const model = editorObs.model.read(r);
            return model ? inlineChatSessionService.getSessionByTextModel(model.uri) !== undefined : false;
        });
        this._store.add(autorun(r => {
            if (hasSessionObs.read(r)) {
                selectionData.set(undefined, undefined);
            }
        }));
        // Hide when the editor context menu shows
        this._store.add(this.#editor.onContextMenu(() => {
            selectionData.set(undefined, undefined);
        }));
        // Hide when the editor loses focus (e.g., switching tabs in notebooks)
        this._store.add(autorun(r => {
            if (!editorObs.isFocused.read(r)) {
                selectionData.set(undefined, undefined);
            }
        }));
        this._store.add(autorun(r => {
            const sel = selectionData.read(r);
            const mode = affordance.read(r);
            ctxAffordanceVisible.set(sel !== undefined && (mode === 'editor' || mode === 'gutter'));
        }));
        const gutterAffordance = this._store.add(this.#instantiationService.createInstance(InlineChatGutterAffordance, editorObs, derived(r => affordance.read(r) === 'gutter' ? selectionData.read(r) : undefined)));
        const editorAffordance = this.#instantiationService.createInstance(InlineChatEditorAffordance, this.#editor, derived(r => affordance.read(r) === 'editor' ? selectionData.read(r) : undefined));
        this._store.add(editorAffordance);
        this._store.add(Event.any(editorAffordance.onDidRunAction, gutterAffordance.onDidRunAction)(commandId => {
            if (affordanceId) {
                telemetryService.publicLog2('inlineChatAffordance/selected', { mode: affordance.get(), id: affordanceId, commandId });
            }
        }));
        this._store.add(autorun(r => {
            const mode = affordance.read(r);
            const hideWithSelection = mode === 'editor' || mode === 'gutter';
            const controller = CodeActionController.get(this.#editor);
            if (controller) {
                controller.onlyLightBulbWithEmptySelection = hideWithSelection;
            }
        }));
        this._store.add(autorun(r => {
            const data = this.#menuData.read(r);
            if (!data) {
                return;
            }
            // Reveal the line in case it's outside the viewport (e.g., when triggered from sticky scroll)
            this.#editor.revealLineInCenterIfOutsideViewport(data.lineNumber, 1 /* ScrollType.Immediate */);
            const editorDomNode = this.#editor.getDomNode();
            const editorRect = editorDomNode.getBoundingClientRect();
            const left = data.rect.left - editorRect.left;
            // Show the overlay widget
            this.#inputWidget.show(data.lineNumber, left, data.above, data.placeholder, data.value);
        }));
        this._store.add(autorun(r => {
            const pos = this.#inputWidget.position.read(r);
            if (pos === null) {
                this.#menuData.set(undefined, undefined);
            }
        }));
    }
    dismiss() {
        this.#selectionData.set(undefined, undefined);
    }
    async showMenuAtSelection(placeholder, value) {
        assertType(this.#editor.hasModel());
        const direction = this.#editor.getSelection().getDirection();
        const position = this.#editor.getPosition();
        const editorDomNode = this.#editor.getDomNode();
        const scrolledPosition = this.#editor.getScrolledVisiblePosition(position);
        const editorRect = editorDomNode.getBoundingClientRect();
        const x = editorRect.left + scrolledPosition.left;
        const y = editorRect.top + scrolledPosition.top;
        this.#menuData.set({
            rect: new DOMRect(x, y, 0, scrolledPosition.height),
            above: direction === 1 /* SelectionDirection.RTL */,
            lineNumber: position.lineNumber,
            placeholder,
            value
        }, undefined);
        await waitForState(this.#inputWidget.position, pos => pos === null);
    }
};
InlineChatAffordance = __decorate([
    __param(2, IInstantiationService),
    __param(3, IConfigurationService),
    __param(4, IChatEntitlementService),
    __param(5, IInlineChatSessionService),
    __param(6, ITelemetryService),
    __param(7, IContextKeyService)
], InlineChatAffordance);
export { InlineChatAffordance };
//# sourceMappingURL=inlineChatAffordance.js.map