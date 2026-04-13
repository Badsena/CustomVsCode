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
import { timeout } from '../../../../../base/common/async.js';
import { BugIndicatingError } from '../../../../../base/common/errors.js';
import { Emitter, Event } from '../../../../../base/common/event.js';
import { Disposable, DisposableStore } from '../../../../../base/common/lifecycle.js';
import { autorun, derived } from '../../../../../base/common/observable.js';
import { runWithFakedTimers } from '../../../../../base/test/common/timeTravelScheduler.js';
import { IAccessibilitySignalService } from '../../../../../platform/accessibilitySignal/browser/accessibilitySignalService.js';
import { IDefaultAccountService } from '../../../../../platform/defaultAccount/common/defaultAccount.js';
import { SyncDescriptor } from '../../../../../platform/instantiation/common/descriptors.js';
import { ServiceCollection } from '../../../../../platform/instantiation/common/serviceCollection.js';
import { CoreEditingCommands, CoreNavigationCommands } from '../../../../browser/coreCommands.js';
import { IBulkEditService } from '../../../../browser/services/bulkEditService.js';
import { IRenameSymbolTrackerService, NullRenameSymbolTrackerService } from '../../../../browser/services/renameSymbolTrackerService.js';
import { TextEdit } from '../../../../common/core/edits/textEdit.js';
import { Range } from '../../../../common/core/range.js';
import { PositionOffsetTransformer } from '../../../../common/core/text/positionToOffset.js';
import { ILanguageFeaturesService } from '../../../../common/services/languageFeatures.js';
import { LanguageFeaturesService } from '../../../../common/services/languageFeaturesService.js';
import { IModelService } from '../../../../common/services/model.js';
import { ITextModelService } from '../../../../common/services/resolverService.js';
import { withAsyncTestCodeEditor } from '../../../../test/browser/testCodeEditor.js';
import { InlineCompletionsController } from '../../browser/controller/inlineCompletionsController.js';
import { InlineSuggestionsView } from '../../browser/view/inlineSuggestionsView.js';
export class MockInlineCompletionsProvider {
    constructor(enableForwardStability = false) {
        this.enableForwardStability = enableForwardStability;
        this.returnValue = [];
        this.delayMs = 0;
        this.callHistory = new Array();
        this.calledTwiceIn50Ms = false;
        this._onDidChangeEmitter = new Emitter();
        this.onDidChangeInlineCompletions = this._onDidChangeEmitter.event;
        this.lastTimeMs = undefined;
    }
    setReturnValue(value, delayMs = 0) {
        this.returnValue = value ? [value] : [];
        this.delayMs = delayMs;
    }
    setReturnValues(values, delayMs = 0) {
        this.returnValue = values;
        this.delayMs = delayMs;
    }
    getAndClearCallHistory() {
        const history = [...this.callHistory];
        this.callHistory = [];
        return history;
    }
    assertNotCalledTwiceWithin50ms() {
        if (this.calledTwiceIn50Ms) {
            throw new Error('provideInlineCompletions has been called at least twice within 50ms. This should not happen.');
        }
    }
    /**
     * Fire an onDidChange event with an optional change hint.
     */
    fireOnDidChange(changeHint) {
        this._onDidChangeEmitter.fire(changeHint);
    }
    async provideInlineCompletions(model, position, context, token) {
        const currentTimeMs = new Date().getTime();
        if (this.lastTimeMs && currentTimeMs - this.lastTimeMs < 50) {
            this.calledTwiceIn50Ms = true;
        }
        this.lastTimeMs = currentTimeMs;
        this.callHistory.push({
            position: position.toString(),
            triggerKind: context.triggerKind,
            text: model.getValue(),
            ...(context.changeHint !== undefined ? { changeHint: context.changeHint } : {}),
        });
        const result = new Array();
        for (const v of this.returnValue) {
            const x = { ...v };
            if (!x.range) {
                x.range = model.getFullModelRange();
            }
            result.push(x);
        }
        if (this.delayMs > 0) {
            await timeout(this.delayMs);
        }
        return { items: result, enableForwardStability: this.enableForwardStability };
    }
    disposeInlineCompletions() { }
    handleItemDidShow() { }
}
export class MockSearchReplaceCompletionsProvider {
    constructor() {
        this._map = new Map();
    }
    add(search, replace) {
        this._map.set(search, replace);
    }
    async provideInlineCompletions(model, position, context, token) {
        const text = model.getValue();
        for (const [search, replace] of this._map) {
            const idx = text.indexOf(search);
            // replace idx...idx+text.length with replace
            if (idx !== -1) {
                const range = Range.fromPositions(model.getPositionAt(idx), model.getPositionAt(idx + search.length));
                return {
                    items: [
                        { range, insertText: replace, isInlineEdit: true }
                    ]
                };
            }
        }
        return { items: [] };
    }
    disposeInlineCompletions() { }
    handleItemDidShow() { }
}
export class InlineEditContext extends Disposable {
    constructor(model, editor) {
        super();
        this.editor = editor;
        this.prettyViewStates = new Array();
        const edit = derived(reader => {
            const state = model.state.read(reader);
            return state ? new TextEdit(state.edits) : undefined;
        });
        this._register(autorun(reader => {
            /** @description update */
            const e = edit.read(reader);
            let view;
            if (e) {
                view = e.toString(this.editor.getValue());
            }
            else {
                view = undefined;
            }
            this.prettyViewStates.push(view);
        }));
    }
    getAndClearViewStates() {
        const arr = [...this.prettyViewStates];
        this.prettyViewStates.length = 0;
        return arr;
    }
}
export class GhostTextContext extends Disposable {
    get currentPrettyViewState() {
        return this._currentPrettyViewState;
    }
    constructor(model, editor) {
        super();
        this.editor = editor;
        this.prettyViewStates = new Array();
        this._register(autorun(reader => {
            /** @description update */
            const ghostText = model.primaryGhostText.read(reader);
            let view;
            if (ghostText) {
                view = ghostText.render(this.editor.getValue(), true);
            }
            else {
                view = this.editor.getValue();
            }
            if (this._currentPrettyViewState !== view) {
                this.prettyViewStates.push(view);
            }
            this._currentPrettyViewState = view;
        }));
    }
    getAndClearViewStates() {
        const arr = [...this.prettyViewStates];
        this.prettyViewStates.length = 0;
        return arr;
    }
    keyboardType(text) {
        this.editor.trigger('keyboard', 'type', { text });
    }
    cursorUp() {
        this.editor.runCommand(CoreNavigationCommands.CursorUp, null);
    }
    cursorRight() {
        this.editor.runCommand(CoreNavigationCommands.CursorRight, null);
    }
    cursorLeft() {
        this.editor.runCommand(CoreNavigationCommands.CursorLeft, null);
    }
    cursorDown() {
        this.editor.runCommand(CoreNavigationCommands.CursorDown, null);
    }
    cursorLineEnd() {
        this.editor.runCommand(CoreNavigationCommands.CursorLineEnd, null);
    }
    leftDelete() {
        this.editor.runCommand(CoreEditingCommands.DeleteLeft, null);
    }
}
export async function withAsyncTestCodeEditorAndInlineCompletionsModel(text, options, callback) {
    return await runWithFakedTimers({
        useFakeTimers: options.fakeClock,
    }, async () => {
        const disposableStore = new DisposableStore();
        try {
            if (options.provider) {
                const languageFeaturesService = new LanguageFeaturesService();
                if (!options.serviceCollection) {
                    options.serviceCollection = new ServiceCollection();
                }
                options.serviceCollection.set(ILanguageFeaturesService, languageFeaturesService);
                // eslint-disable-next-line local/code-no-any-casts
                options.serviceCollection.set(IAccessibilitySignalService, {
                    playSignal: async () => { },
                    isSoundEnabled(signal) { return false; },
                });
                options.serviceCollection.set(IBulkEditService, {
                    apply: async () => { throw new Error('IBulkEditService.apply not implemented'); },
                    hasPreviewHandler: () => { throw new Error('IBulkEditService.hasPreviewHandler not implemented'); },
                    setPreviewHandler: () => { throw new Error('IBulkEditService.setPreviewHandler not implemented'); },
                    _serviceBrand: undefined,
                });
                options.serviceCollection.set(ITextModelService, new SyncDescriptor(MockTextModelService));
                options.serviceCollection.set(IDefaultAccountService, {
                    _serviceBrand: undefined,
                    onDidChangeDefaultAccount: Event.None,
                    onDidChangePolicyData: Event.None,
                    policyData: null,
                    copilotTokenInfo: null,
                    onDidChangeCopilotTokenInfo: Event.None,
                    getDefaultAccount: async () => null,
                    setDefaultAccountProvider: () => { },
                    getDefaultAccountAuthenticationProvider: () => { return { id: 'mockProvider', name: 'Mock Provider', enterprise: false }; },
                    refresh: async () => { return null; },
                    signIn: async () => { return null; },
                    signOut: async () => { },
                });
                options.serviceCollection.set(IRenameSymbolTrackerService, new NullRenameSymbolTrackerService());
                const d = languageFeaturesService.inlineCompletionsProvider.register({ pattern: '**' }, options.provider);
                disposableStore.add(d);
            }
            let result;
            await withAsyncTestCodeEditor(text, options, async (editor, editorViewModel, instantiationService) => {
                instantiationService.stubInstance(InlineSuggestionsView, {
                    shouldShowHoverAtViewZone: () => false,
                    dispose: () => { },
                });
                const controller = instantiationService.createInstance(InlineCompletionsController, editor);
                const model = controller.model.get();
                const context = new GhostTextContext(model, editor);
                try {
                    result = await callback({ editor, editorViewModel, model, context, store: disposableStore });
                }
                finally {
                    context.dispose();
                    model.dispose();
                    controller.dispose();
                }
            });
            if (options.provider instanceof MockInlineCompletionsProvider) {
                options.provider.assertNotCalledTwiceWithin50ms();
            }
            return result;
        }
        finally {
            disposableStore.dispose();
        }
    });
}
export class AnnotatedString {
    constructor(src, annotations = ['↓']) {
        const markers = findMarkers(src, annotations);
        this.value = markers.textWithoutMarkers;
        this.markers = markers.results;
    }
    getMarkerOffset(markerIdx = 0) {
        if (markerIdx >= this.markers.length) {
            throw new BugIndicatingError(`Marker index ${markerIdx} out of bounds`);
        }
        return this.markers[markerIdx].idx;
    }
}
function findMarkers(text, markers) {
    const results = [];
    let textWithoutMarkers = '';
    markers.sort((a, b) => b.length - a.length);
    let pos = 0;
    for (let i = 0; i < text.length;) {
        let foundMarker = false;
        for (const marker of markers) {
            if (text.startsWith(marker, i)) {
                results.push({ mark: marker, idx: pos });
                i += marker.length;
                foundMarker = true;
                break;
            }
        }
        if (!foundMarker) {
            textWithoutMarkers += text[i];
            pos++;
            i++;
        }
    }
    return { results, textWithoutMarkers };
}
export class AnnotatedText extends AnnotatedString {
    constructor() {
        super(...arguments);
        this._transformer = new PositionOffsetTransformer(this.value);
    }
    getMarkerPosition(markerIdx = 0) {
        return this._transformer.getPosition(this.getMarkerOffset(markerIdx));
    }
}
let MockTextModelService = class MockTextModelService {
    constructor(_modelService) {
        this._modelService = _modelService;
    }
    async createModelReference(resource) {
        const model = this._modelService.getModel(resource);
        if (!model) {
            throw new Error(`MockTextModelService: Model not found for ${resource.toString()}`);
        }
        return {
            object: {
                textEditorModel: model,
                getLanguageId: () => model.getLanguageId(),
                isReadonly: () => false,
                isDisposed: () => model.isDisposed(),
                isResolved: () => true,
                onWillDispose: model.onWillDispose,
                resolve: async () => { },
                createSnapshot: () => model.createSnapshot(),
                dispose: () => { },
            },
            dispose: () => { },
        };
    }
    registerTextModelContentProvider() {
        throw new Error('MockTextModelService.registerTextModelContentProvider not implemented');
    }
    canHandleResource() {
        return false;
    }
};
MockTextModelService = __decorate([
    __param(0, IModelService)
], MockTextModelService);
//# sourceMappingURL=utils.js.map