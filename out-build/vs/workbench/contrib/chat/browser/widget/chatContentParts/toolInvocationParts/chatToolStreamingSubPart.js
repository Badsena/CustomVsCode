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
import { MarkdownString } from '../../../../../../../base/common/htmlContent.js';
import { autorun } from '../../../../../../../base/common/observable.js';
import { IInstantiationService } from '../../../../../../../platform/instantiation/common/instantiation.js';
import { ChatProgressContentPart } from '../chatProgressContentPart.js';
import { BaseChatToolInvocationSubPart } from './chatToolInvocationSubPart.js';
/**
 * Sub-part for rendering a tool invocation in the streaming state.
 * This shows progress while the tool arguments are being streamed from the LM.
 */
let ChatToolStreamingSubPart = class ChatToolStreamingSubPart extends BaseChatToolInvocationSubPart {
    constructor(toolInvocation, context, renderer, instantiationService) {
        super(toolInvocation);
        this.context = context;
        this.renderer = renderer;
        this.instantiationService = instantiationService;
        this.codeblocks = [];
        this.domNode = this.createStreamingPart();
    }
    createStreamingPart() {
        const container = document.createElement('div');
        if (this.toolInvocation.kind !== 'toolInvocation') {
            return container;
        }
        const toolInvocation = this.toolInvocation;
        const state = toolInvocation.state.get();
        if (state.type !== 0 /* IChatToolInvocation.StateKind.Streaming */) {
            return container;
        }
        // Observe streaming message changes
        this._register(autorun(reader => {
            const currentState = toolInvocation.state.read(reader);
            if (currentState.type !== 0 /* IChatToolInvocation.StateKind.Streaming */) {
                // State changed - clear the container DOM before triggering re-render
                // This prevents the old streaming message from lingering
                dom.clearNode(container);
                this._onNeedsRerender.fire();
                return;
            }
            // Read the streaming message
            const streamingMessage = currentState.streamingMessage.read(reader);
            const displayMessage = streamingMessage ?? toolInvocation.invocationMessage;
            // Don't render anything if there's no meaningful content
            const messageText = typeof displayMessage === 'string' ? displayMessage : displayMessage.value;
            if (!messageText || messageText.trim().length === 0) {
                dom.clearNode(container);
                return;
            }
            const content = typeof displayMessage === 'string'
                ? new MarkdownString().appendText(displayMessage)
                : displayMessage;
            const progressMessage = {
                kind: 'progressMessage',
                content
            };
            const part = reader.store.add(this.instantiationService.createInstance(ChatProgressContentPart, progressMessage, this.renderer, this.context, undefined, true, this.getIcon(), toolInvocation, false));
            dom.reset(container, part.domNode);
        }));
        return container;
    }
};
ChatToolStreamingSubPart = __decorate([
    __param(3, IInstantiationService)
], ChatToolStreamingSubPart);
export { ChatToolStreamingSubPart };
//# sourceMappingURL=chatToolStreamingSubPart.js.map