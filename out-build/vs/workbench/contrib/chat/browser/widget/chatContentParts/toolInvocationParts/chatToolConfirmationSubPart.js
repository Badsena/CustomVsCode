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
import * as dom from '../../../../../../../base/browser/dom.js';
import { Separator } from '../../../../../../../base/common/actions.js';
import { RunOnceScheduler } from '../../../../../../../base/common/async.js';
import { MarkdownString } from '../../../../../../../base/common/htmlContent.js';
import { toDisposable } from '../../../../../../../base/common/lifecycle.js';
import { count } from '../../../../../../../base/common/strings.js';
import { isEmptyObject } from '../../../../../../../base/common/types.js';
import { generateUuid } from '../../../../../../../base/common/uuid.js';
import { ElementSizeObserver } from '../../../../../../../editor/browser/config/elementSizeObserver.js';
import { ILanguageService } from '../../../../../../../editor/common/languages/language.js';
import { localize } from '../../../../../../../nls.js';
import { ICommandService } from '../../../../../../../platform/commands/common/commands.js';
import { IContextKeyService } from '../../../../../../../platform/contextkey/common/contextkey.js';
import { IInstantiationService } from '../../../../../../../platform/instantiation/common/instantiation.js';
import { IKeybindingService } from '../../../../../../../platform/keybinding/common/keybinding.js';
import { IMarkerService, MarkerSeverity } from '../../../../../../../platform/markers/common/markers.js';
import { createToolInputUri, createToolSchemaUri, ILanguageModelToolsService } from '../../../../common/tools/languageModelToolsService.js';
import { ILanguageModelToolsConfirmationService } from '../../../../common/tools/languageModelToolsConfirmationService.js';
import { AcceptToolConfirmationActionId, SkipToolConfirmationActionId } from '../../../actions/chatToolActions.js';
import { IChatWidgetService } from '../../../chat.js';
import { renderFileWidgets } from '../chatInlineAnchorWidget.js';
import { IChatMarkdownAnchorService } from '../chatMarkdownAnchorService.js';
import { ChatMarkdownContentPart } from '../chatMarkdownContentPart.js';
import { AbstractToolConfirmationSubPart } from './abstractToolConfirmationSubPart.js';
const SHOW_MORE_MESSAGE_HEIGHT_TRIGGER = 45;
let ToolConfirmationSubPart = class ToolConfirmationSubPart extends AbstractToolConfirmationSubPart {
    get codeblocks() {
        return this.markdownParts.flatMap(part => part.codeblocks);
    }
    constructor(toolInvocation, context, renderer, editorPool, currentWidthDelegate, codeBlockModelCollection, codeBlockStartIndex, instantiationService, keybindingService, languageService, contextKeyService, chatWidgetService, commandService, markerService, languageModelToolsService, chatMarkdownAnchorService, confirmationService) {
        const state = toolInvocation.state.get();
        if (state.type !== 1 /* IChatToolInvocation.StateKind.WaitingForConfirmation */ || !state.confirmationMessages?.title) {
            throw new Error('Confirmation messages are missing');
        }
        super(toolInvocation, context, instantiationService, keybindingService, contextKeyService, chatWidgetService, languageModelToolsService);
        this.renderer = renderer;
        this.editorPool = editorPool;
        this.currentWidthDelegate = currentWidthDelegate;
        this.codeBlockModelCollection = codeBlockModelCollection;
        this.codeBlockStartIndex = codeBlockStartIndex;
        this.languageService = languageService;
        this.commandService = commandService;
        this.markerService = markerService;
        this.chatMarkdownAnchorService = chatMarkdownAnchorService;
        this.confirmationService = confirmationService;
        this.markdownParts = [];
        this.render({
            allowActionId: AcceptToolConfirmationActionId,
            skipActionId: SkipToolConfirmationActionId,
            allowLabel: state.confirmationMessages.confirmResults ? localize(8115, null) : localize(8116, null),
            skipLabel: localize(8117, null),
            partType: 'chatToolConfirmation',
            subtitle: typeof toolInvocation.originMessage === 'string' ? toolInvocation.originMessage : toolInvocation.originMessage?.value,
        });
    }
    additionalPrimaryActions() {
        const actions = super.additionalPrimaryActions();
        const state = this.toolInvocation.state.get();
        if (state.type !== 1 /* IChatToolInvocation.StateKind.WaitingForConfirmation */) {
            return actions;
        }
        if (state.confirmationMessages?.allowAutoConfirm !== false) {
            // Get actions from confirmation service
            const confirmActions = this.confirmationService.getPreConfirmActions({
                toolId: this.toolInvocation.toolId,
                source: this.toolInvocation.source,
                parameters: state.parameters,
                chatSessionResource: this.context.element.sessionResource
            });
            for (const action of confirmActions) {
                if (action.divider) {
                    actions.push(new Separator());
                }
                actions.push({
                    label: action.label,
                    tooltip: action.detail,
                    scope: action.scope,
                    data: async () => {
                        const shouldConfirm = await action.select();
                        if (shouldConfirm) {
                            this.confirmWith(this.toolInvocation, { type: 4 /* ToolConfirmKind.UserAction */ });
                        }
                    }
                });
            }
        }
        if (state.confirmationMessages?.confirmResults) {
            actions.unshift({
                label: localize(8118, null),
                data: () => {
                    state.confirmationMessages.confirmResults = undefined;
                    this.confirmWith(this.toolInvocation, { type: 4 /* ToolConfirmKind.UserAction */ });
                }
            }, new Separator());
        }
        return actions;
    }
    createContentElement() {
        const state = this.toolInvocation.state.get();
        if (state.type !== 1 /* IChatToolInvocation.StateKind.WaitingForConfirmation */) {
            return '';
        }
        const { message, disclaimer } = state.confirmationMessages;
        const toolInvocation = this.toolInvocation;
        if (typeof message === 'string' && !disclaimer) {
            return message;
        }
        else {
            const codeBlockRenderOptions = {
                hideToolbar: true,
                reserveWidth: 19,
                verticalPadding: 5,
                editorOptions: {
                    tabFocusMode: true,
                    ariaLabel: this.getTitle(),
                },
            };
            const elements = dom.h('div', [
                dom.h('.message@messageContainer', [
                    dom.h('.message-wrapper@message'),
                    dom.h('.see-more@showMore', [
                        dom.h('a', [localize(8119, null)])
                    ]),
                ]),
                dom.h('.editor@editor'),
                dom.h('.disclaimer@disclaimer'),
            ]);
            if (toolInvocation.toolSpecificData?.kind === 'input' && toolInvocation.toolSpecificData.rawInput && !isEmptyObject(toolInvocation.toolSpecificData.rawInput)) {
                const titleEl = document.createElement('h3');
                titleEl.textContent = localize(8120, null);
                elements.editor.appendChild(titleEl);
                const inputData = toolInvocation.toolSpecificData;
                const codeBlockRenderOptions = {
                    hideToolbar: true,
                    reserveWidth: 19,
                    maxHeightInLines: 13,
                    verticalPadding: 5,
                    editorOptions: {
                        wordWrap: 'off',
                        readOnly: false,
                        ariaLabel: this.getTitle(),
                    }
                };
                const langId = this.languageService.getLanguageIdByLanguageName('json');
                const rawJsonInput = JSON.stringify(inputData.rawInput ?? {}, null, 1);
                const canSeeMore = count(rawJsonInput, '\n') > 2; // if more than one key:value
                const modelRef = this._register(this.context.inlineTextModels.acquire(createToolInputUri(toolInvocation.toolCallId), 
                // View a single JSON line by default until they 'see more'
                rawJsonInput.replace(/\n */g, ' '), this.languageService.createById(langId), true));
                const model = modelRef.object;
                const markerOwner = generateUuid();
                const schemaUri = createToolSchemaUri(toolInvocation.toolId);
                const validator = new RunOnceScheduler(async () => {
                    const newMarker = [];
                    const result = await this.commandService.executeCommand('json.validate', schemaUri, model.getValue());
                    for (const item of result ?? []) {
                        if (item.range && item.message) {
                            newMarker.push({
                                severity: item.severity === 'Error' ? MarkerSeverity.Error : MarkerSeverity.Warning,
                                message: item.message,
                                startLineNumber: item.range[0].line + 1,
                                startColumn: item.range[0].character + 1,
                                endLineNumber: item.range[1].line + 1,
                                endColumn: item.range[1].character + 1,
                                code: item.code ? String(item.code) : undefined
                            });
                        }
                    }
                    this.markerService.changeOne(markerOwner, model.uri, newMarker);
                }, 500);
                validator.schedule();
                this._register(model.onDidChangeContent(() => validator.schedule()));
                this._register(toDisposable(() => this.markerService.remove(markerOwner, [model.uri])));
                this._register(validator);
                const editor = this._register(this.editorPool.get());
                editor.object.render({
                    codeBlockIndex: this.codeBlockStartIndex,
                    codeBlockPartIndex: 0,
                    element: this.context.element,
                    languageId: langId ?? 'json',
                    renderOptions: codeBlockRenderOptions,
                    textModel: Promise.resolve(model),
                    chatSessionResource: this.context.element.sessionResource
                }, this.currentWidthDelegate());
                this.codeblocks.push({
                    codeBlockIndex: this.codeBlockStartIndex,
                    codemapperUri: undefined,
                    elementId: this.context.element.id,
                    focus: () => editor.object.focus(),
                    ownerMarkdownPartId: this.codeblocksPartId,
                    uri: model.uri,
                    uriPromise: Promise.resolve(model.uri),
                    chatSessionResource: this.context.element.sessionResource
                });
                this._register(model.onDidChangeContent(e => {
                    try {
                        inputData.rawInput = JSON.parse(model.getValue());
                    }
                    catch {
                        // ignore
                    }
                }));
                elements.editor.append(editor.object.element);
                if (canSeeMore) {
                    const seeMore = dom.h('div.see-more', [dom.h('a@link')]);
                    seeMore.link.textContent = localize(8121, null);
                    this._register(dom.addDisposableGenericMouseDownListener(seeMore.link, () => {
                        try {
                            const parsed = JSON.parse(model.getValue());
                            model.setValue(JSON.stringify(parsed, null, 2));
                            editor.object.editor.updateOptions({ tabFocusMode: false });
                            editor.object.editor.updateOptions({ wordWrap: 'on' });
                        }
                        catch {
                            // ignored
                        }
                        seeMore.root.remove();
                    }));
                    elements.editor.append(seeMore.root);
                }
            }
            const mdPart = this._makeMarkdownPart(elements.message, message, codeBlockRenderOptions);
            const messageSeeMoreObserver = this._register(new ElementSizeObserver(mdPart.domNode, undefined));
            const updateSeeMoreDisplayed = () => {
                const show = messageSeeMoreObserver.getHeight() > SHOW_MORE_MESSAGE_HEIGHT_TRIGGER;
                if (elements.messageContainer.classList.contains('can-see-more') !== show) {
                    elements.messageContainer.classList.toggle('can-see-more', show);
                }
            };
            this._register(dom.addDisposableListener(elements.showMore, 'click', () => {
                elements.messageContainer.classList.toggle('can-see-more', false);
                messageSeeMoreObserver.dispose();
            }));
            this._register(messageSeeMoreObserver.onDidChange(updateSeeMoreDisplayed));
            messageSeeMoreObserver.startObserving();
            if (disclaimer) {
                this._makeMarkdownPart(elements.disclaimer, disclaimer, codeBlockRenderOptions);
            }
            else {
                elements.disclaimer.remove();
            }
            return elements.root;
        }
    }
    getTitle() {
        const state = this.toolInvocation.state.get();
        if (state.type !== 1 /* IChatToolInvocation.StateKind.WaitingForConfirmation */) {
            return '';
        }
        const title = state.confirmationMessages?.title;
        if (!title) {
            return '';
        }
        return typeof title === 'string' ? title : title.value;
    }
    _makeMarkdownPart(container, message, codeBlockRenderOptions) {
        const part = this._register(this.instantiationService.createInstance(ChatMarkdownContentPart, {
            kind: 'markdownContent',
            content: typeof message === 'string' ? new MarkdownString().appendMarkdown(message) : message,
        }, this.context, this.editorPool, false, this.codeBlockStartIndex, this.renderer, undefined, this.currentWidthDelegate(), this.codeBlockModelCollection, { codeBlockRenderOptions }));
        renderFileWidgets(part.domNode, this.instantiationService, this.chatMarkdownAnchorService, this._store);
        container.append(part.domNode);
        return part;
    }
};
ToolConfirmationSubPart = __decorate([
    __param(7, IInstantiationService),
    __param(8, IKeybindingService),
    __param(9, ILanguageService),
    __param(10, IContextKeyService),
    __param(11, IChatWidgetService),
    __param(12, ICommandService),
    __param(13, IMarkerService),
    __param(14, ILanguageModelToolsService),
    __param(15, IChatMarkdownAnchorService),
    __param(16, ILanguageModelToolsConfirmationService)
], ToolConfirmationSubPart);
export { ToolConfirmationSubPart };
//# sourceMappingURL=chatToolConfirmationSubPart.js.map