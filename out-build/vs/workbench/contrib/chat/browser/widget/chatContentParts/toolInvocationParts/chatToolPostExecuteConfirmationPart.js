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
import { getExtensionForMimeType } from '../../../../../../../base/common/mime.js';
import { localize } from '../../../../../../../nls.js';
import { IContextKeyService } from '../../../../../../../platform/contextkey/common/contextkey.js';
import { IInstantiationService } from '../../../../../../../platform/instantiation/common/instantiation.js';
import { IKeybindingService } from '../../../../../../../platform/keybinding/common/keybinding.js';
import { ChatResponseResource } from '../../../../common/model/chatModel.js';
import { ILanguageModelToolsConfirmationService } from '../../../../common/tools/languageModelToolsConfirmationService.js';
import { ILanguageModelToolsService, stringifyPromptTsxPart } from '../../../../common/tools/languageModelToolsService.js';
import { AcceptToolPostConfirmationActionId, SkipToolPostConfirmationActionId } from '../../../actions/chatToolActions.js';
import { IChatWidgetService } from '../../../chat.js';
import { ChatToolOutputContentSubPart } from '../chatToolOutputContentSubPart.js';
import { AbstractToolConfirmationSubPart } from './abstractToolConfirmationSubPart.js';
let ChatToolPostExecuteConfirmationPart = class ChatToolPostExecuteConfirmationPart extends AbstractToolConfirmationSubPart {
    get codeblocks() {
        return this._codeblocks;
    }
    constructor(toolInvocation, context, instantiationService, keybindingService, contextKeyService, chatWidgetService, languageModelToolsService, confirmationService) {
        super(toolInvocation, context, instantiationService, keybindingService, contextKeyService, chatWidgetService, languageModelToolsService);
        this.confirmationService = confirmationService;
        this._codeblocks = [];
        const subtitle = toolInvocation.pastTenseMessage || toolInvocation.invocationMessage;
        this.render({
            allowActionId: AcceptToolPostConfirmationActionId,
            skipActionId: SkipToolPostConfirmationActionId,
            allowLabel: localize(8131, null),
            skipLabel: localize(8132, null),
            partType: 'chatToolPostConfirmation',
            subtitle: typeof subtitle === 'string' ? subtitle : subtitle?.value,
        });
    }
    createContentElement() {
        if (this.toolInvocation.kind !== 'toolInvocation') {
            throw new Error('post-approval not supported for serialized data');
        }
        const state = this.toolInvocation.state.get();
        if (state.type !== 3 /* IChatToolInvocation.StateKind.WaitingForPostApproval */) {
            throw new Error('Tool invocation is not waiting for post-approval');
        }
        return this.createResultsDisplay(this.toolInvocation, state.contentForModel);
    }
    getTitle() {
        return localize(8133, null);
    }
    additionalPrimaryActions() {
        const actions = super.additionalPrimaryActions();
        const state = this.toolInvocation.state.get();
        if (state.type !== 3 /* IChatToolInvocation.StateKind.WaitingForPostApproval */) {
            return actions;
        }
        // Get actions from confirmation service
        const confirmActions = this.confirmationService.getPostConfirmActions({
            toolId: this.toolInvocation.toolId,
            source: this.toolInvocation.source,
            parameters: state.parameters
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
        return actions;
    }
    createResultsDisplay(toolInvocation, contentForModel) {
        const container = dom.$('.tool-postconfirm-display');
        if (!contentForModel || contentForModel.length === 0) {
            container.textContent = localize(8134, null);
            return container;
        }
        const parts = [];
        for (const [i, part] of contentForModel.entries()) {
            if (part.kind === 'text') {
                // Display text parts
                parts.push({
                    kind: 'code',
                    title: part.title,
                    data: part.value,
                    languageId: 'plaintext',
                    codeBlockIndex: i,
                    ownerMarkdownPartId: this.codeblocksPartId,
                    options: {
                        hideToolbar: true,
                        reserveWidth: 19,
                        maxHeightInLines: 13,
                        verticalPadding: 5,
                        editorOptions: { wordWrap: 'on', readOnly: true }
                    }
                });
            }
            else if (part.kind === 'promptTsx') {
                // Display TSX parts as JSON-stringified
                const stringified = stringifyPromptTsxPart(part);
                parts.push({
                    kind: 'code',
                    data: stringified,
                    languageId: 'json',
                    codeBlockIndex: i,
                    ownerMarkdownPartId: this.codeblocksPartId,
                    options: {
                        hideToolbar: true,
                        reserveWidth: 19,
                        maxHeightInLines: 13,
                        verticalPadding: 5,
                        editorOptions: { wordWrap: 'on', readOnly: true }
                    }
                });
            }
            else if (part.kind === 'data') {
                // Display data parts
                const mimeType = part.value.mimeType;
                const data = part.value.data;
                // Check if it's an image
                if (mimeType?.startsWith('image/')) {
                    const permalinkBasename = getExtensionForMimeType(mimeType) ? `image${getExtensionForMimeType(mimeType)}` : 'image.bin';
                    const permalinkUri = ChatResponseResource.createUri(this.context.element.sessionResource, toolInvocation.toolCallId, i, permalinkBasename);
                    parts.push({ kind: 'data', value: data.buffer, mimeType, uri: permalinkUri, audience: part.audience });
                }
                else {
                    // Try to display as UTF-8 text, otherwise base64
                    const decoder = new TextDecoder('utf-8', { fatal: true });
                    try {
                        const text = decoder.decode(data.buffer);
                        parts.push({
                            kind: 'code',
                            data: text,
                            languageId: 'plaintext',
                            codeBlockIndex: i,
                            ownerMarkdownPartId: this.codeblocksPartId,
                            options: {
                                hideToolbar: true,
                                reserveWidth: 19,
                                maxHeightInLines: 13,
                                verticalPadding: 5,
                                editorOptions: { wordWrap: 'on', readOnly: true }
                            }
                        });
                    }
                    catch {
                        // Not valid UTF-8, show base64
                        const base64 = data.toString();
                        parts.push({
                            kind: 'code',
                            data: base64,
                            languageId: 'plaintext',
                            codeBlockIndex: i,
                            ownerMarkdownPartId: this.codeblocksPartId,
                            options: {
                                hideToolbar: true,
                                reserveWidth: 19,
                                maxHeightInLines: 13,
                                verticalPadding: 5,
                                editorOptions: { wordWrap: 'on', readOnly: true }
                            }
                        });
                    }
                }
            }
        }
        if (parts.length > 0) {
            const outputSubPart = this._register(this.instantiationService.createInstance(ChatToolOutputContentSubPart, this.context, parts));
            this._codeblocks.push(...outputSubPart.codeblocks);
            outputSubPart.domNode.classList.add('tool-postconfirm-display');
            return outputSubPart.domNode;
        }
        container.textContent = localize(8135, null);
        return container;
    }
};
ChatToolPostExecuteConfirmationPart = __decorate([
    __param(2, IInstantiationService),
    __param(3, IKeybindingService),
    __param(4, IContextKeyService),
    __param(5, IChatWidgetService),
    __param(6, ILanguageModelToolsService),
    __param(7, ILanguageModelToolsConfirmationService)
], ChatToolPostExecuteConfirmationPart);
export { ChatToolPostExecuteConfirmationPart };
//# sourceMappingURL=chatToolPostExecuteConfirmationPart.js.map