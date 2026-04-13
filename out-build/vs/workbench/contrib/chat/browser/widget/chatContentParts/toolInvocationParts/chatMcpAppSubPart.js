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
import { Button } from '../../../../../../../base/browser/ui/button/button.js';
import { Codicon } from '../../../../../../../base/common/codicons.js';
import { MarkdownString } from '../../../../../../../base/common/htmlContent.js';
import { MutableDisposable } from '../../../../../../../base/common/lifecycle.js';
import { autorun, observableValue } from '../../../../../../../base/common/observable.js';
import { ThemeIcon } from '../../../../../../../base/common/themables.js';
import { localize } from '../../../../../../../nls.js';
import { IInstantiationService } from '../../../../../../../platform/instantiation/common/instantiation.js';
import { IMarkdownRendererService } from '../../../../../../../platform/markdown/browser/markdownRenderer.js';
import { defaultButtonStyles } from '../../../../../../../platform/theme/browser/defaultStyles.js';
import { ChatErrorLevel } from '../../../../common/chatService/chatService.js';
import { ChatErrorWidget } from '../chatErrorContentPart.js';
import { ChatProgressSubPart } from '../chatProgressContentPart.js';
import { ChatResourceGroupWidget } from '../chatResourceGroupWidget.js';
import { ChatMcpAppModel } from './chatMcpAppModel.js';
import { BaseChatToolInvocationSubPart } from './chatToolInvocationSubPart.js';
const maxWebviewHeightPct = 0.75;
/**
 * Sub-part for rendering MCP App webviews in chat tool output.
 * This is a thin view layer that delegates to ChatMcpAppModel.
 */
let ChatMcpAppSubPart = class ChatMcpAppSubPart extends BaseChatToolInvocationSubPart {
    constructor(toolInvocation, onDidRemount, context, _renderData, _instantiationService, _markdownRendererService) {
        super(toolInvocation);
        this._renderData = _renderData;
        this._instantiationService = _instantiationService;
        this._markdownRendererService = _markdownRendererService;
        this.codeblocks = [];
        /** Current progress part for loading state */
        this._progressPart = this._register(new MutableDisposable());
        /** Current resource group widget for downloads */
        this._downloadWidget = this._register(new MutableDisposable());
        // Create the DOM structure
        this.domNode = dom.$('div.mcp-app-part');
        this._webviewContainer = dom.$('div.mcp-app-webview');
        this._webviewContainer.style.maxHeight = `${maxWebviewHeightPct * 100}vh`;
        this._webviewContainer.style.minHeight = '100px';
        this._webviewContainer.style.height = '300px'; // Initial height, will be updated by model
        this.domNode.appendChild(this._webviewContainer);
        // Download container — below webview, for ui/download-file resources
        this._downloadContainer = dom.$('div.mcp-app-downloads');
        this.domNode.appendChild(this._downloadContainer);
        const targetWindow = dom.getWindow(this.domNode);
        const getMaxHeight = () => maxWebviewHeightPct * targetWindow.innerHeight;
        const maxHeight = observableValue('mcpAppMaxHeight', getMaxHeight());
        dom.addDisposableListener(targetWindow, 'resize', () => maxHeight.set(getMaxHeight(), undefined));
        // Create the model - it will mount the webview to the container
        this._model = this._register(this._instantiationService.createInstance(ChatMcpAppModel, toolInvocation, this._renderData, this._webviewContainer, maxHeight, context.currentWidth));
        // Update container height from model
        this._updateContainerHeight();
        // Set up load state handling
        this._register(autorun(reader => {
            const loadState = this._model.loadState.read(reader);
            this._handleLoadStateChange(this._webviewContainer, loadState);
        }));
        // Subscribe to model height changes
        this._register(this._model.onDidChangeHeight(() => {
            this._updateContainerHeight();
        }));
        // Observe download parts and render resource group widget
        this._register(autorun(reader => {
            const parts = this._model.downloadParts.read(reader);
            if (parts.length === 0) {
                this._downloadWidget.clear();
                dom.clearNode(this._downloadContainer);
                return;
            }
            dom.clearNode(this._downloadContainer);
            const widget = this._instantiationService.createInstance(ChatResourceGroupWidget, parts);
            this._downloadWidget.value = widget;
            this._downloadContainer.appendChild(widget.domNode);
        }));
        this._register(onDidRemount(() => {
            this._model.remount();
        }));
        this._register(context.onDidChangeVisibility(visible => {
            if (visible) {
                this._model.remount();
            }
        }));
    }
    _handleLoadStateChange(container, loadState) {
        // Remove any existing loading/error indicators
        if (this._progressPart.value) {
            this._progressPart.value.domNode.remove();
        }
        this._progressPart.clear();
        if (this._errorNode) {
            this._errorNode.remove();
            this._errorNode = undefined;
        }
        switch (loadState.status) {
            case 'loading': {
                // Hide the webview container while loading
                container.style.display = 'none';
                const progressMessage = dom.$('span');
                progressMessage.textContent = localize(8065, null);
                const progressPart = this._instantiationService.createInstance(ChatProgressSubPart, progressMessage, ThemeIcon.modify(Codicon.loading, 'spin'), undefined);
                this._progressPart.value = progressPart;
                // Append to domNode (parent), not the webview container
                this.domNode.appendChild(progressPart.domNode);
                break;
            }
            case 'loaded': {
                // Show the webview container
                container.style.display = '';
                break;
            }
            case 'error': {
                // Hide the webview container on error
                container.style.display = 'none';
                this._showError(this.domNode, loadState.error);
                break;
            }
        }
    }
    _updateContainerHeight() {
        this._webviewContainer.style.height = `${this._model.height}px`;
    }
    /**
     * Shows an error message in the container.
     */
    _showError(container, error) {
        const errorNode = dom.$('.mcp-app-error');
        // Create error message with markdown
        const errorMessage = new MarkdownString();
        errorMessage.appendText(localize(8066, null, error.message || String(error)));
        // Use ChatErrorWidget for consistent error styling
        const errorWidget = this._register(new ChatErrorWidget(ChatErrorLevel.Error, errorMessage, this._markdownRendererService));
        errorNode.appendChild(errorWidget.domNode);
        // Add retry button
        const buttonContainer = dom.append(errorNode, dom.$('.chat-buttons-container'));
        const retryButton = this._register(new Button(buttonContainer, defaultButtonStyles));
        retryButton.label = localize(8067, null);
        this._register(retryButton.onDidClick(() => {
            this._model.retry();
        }));
        container.appendChild(errorNode);
        this._errorNode = errorNode;
    }
};
ChatMcpAppSubPart = __decorate([
    __param(4, IInstantiationService),
    __param(5, IMarkdownRendererService)
], ChatMcpAppSubPart);
export { ChatMcpAppSubPart };
//# sourceMappingURL=chatMcpAppSubPart.js.map