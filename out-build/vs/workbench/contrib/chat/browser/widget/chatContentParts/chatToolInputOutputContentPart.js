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
import * as dom from '../../../../../../base/browser/dom.js';
import { ButtonWithIcon } from '../../../../../../base/browser/ui/button/button.js';
import { Codicon } from '../../../../../../base/common/codicons.js';
import { Disposable } from '../../../../../../base/common/lifecycle.js';
import { autorun, observableValue } from '../../../../../../base/common/observable.js';
import { ThemeIcon } from '../../../../../../base/common/themables.js';
import { ILanguageService } from '../../../../../../editor/common/languages/language.js';
import { IModelService } from '../../../../../../editor/common/services/model.js';
import { localize } from '../../../../../../nls.js';
import { IContextKeyService } from '../../../../../../platform/contextkey/common/contextkey.js';
import { IConfigurationService } from '../../../../../../platform/configuration/common/configuration.js';
import { IHoverService } from '../../../../../../platform/hover/browser/hover.js';
import { observableConfigValue } from '../../../../../../platform/observable/common/platformObservableUtils.js';
import { IInstantiationService } from '../../../../../../platform/instantiation/common/instantiation.js';
import { LanguageModelPartAudience } from '../../../common/languageModels.js';
import { ChatQueryTitlePart } from './chatConfirmationWidget.js';
import { ChatToolOutputContentSubPart } from './chatToolOutputContentSubPart.js';
import { renderFileWidgets } from './chatInlineAnchorWidget.js';
import { IChatMarkdownAnchorService } from './chatMarkdownAnchorService.js';
let ChatCollapsibleInputOutputContentPart = class ChatCollapsibleInputOutputContentPart extends Disposable {
    get codeblocks() {
        const outputCodeblocks = this._outputSubPart?.codeblocks ?? [];
        return outputCodeblocks;
    }
    set title(s) {
        this._titlePart.title = s;
    }
    get title() {
        return this._titlePart.title;
    }
    get expanded() {
        return this._expanded.get();
    }
    constructor(title, subtitle, progressTooltip, context, input, output, isError, initiallyExpanded, shimmer, contextKeyService, _instantiationService, hoverService, modelService, languageService, chatMarkdownAnchorService, configurationService) {
        super();
        this.context = context;
        this.input = input;
        this.output = output;
        this.contextKeyService = contextKeyService;
        this._instantiationService = _instantiationService;
        this.modelService = modelService;
        this.languageService = languageService;
        this.chatMarkdownAnchorService = chatMarkdownAnchorService;
        this.configurationService = configurationService;
        this._editorReferences = [];
        this._contentInitialized = false;
        const container = dom.h('.chat-confirmation-widget-container');
        const titleEl = dom.h('.chat-confirmation-widget-title-inner');
        const elements = dom.h('.chat-confirmation-widget');
        this.domNode = container.root;
        container.root.appendChild(elements.root);
        this._titlePart = this._register(_instantiationService.createInstance(ChatQueryTitlePart, titleEl.root, title, subtitle));
        renderFileWidgets(titleEl.root, this._instantiationService, this.chatMarkdownAnchorService, this._store);
        const spacer = document.createElement('span');
        spacer.style.flexGrow = '1';
        const btn = this._register(new ButtonWithIcon(elements.root, {}));
        btn.element.classList.add('chat-confirmation-widget-title', 'monaco-text-button');
        btn.labelElement.append(titleEl.root);
        // Add hover chevron indicator on the right (decorative, hide from screen readers)
        const hoverChevron = dom.$('span.chat-collapsible-hover-chevron.codicon.codicon-chevron-right');
        hoverChevron.setAttribute('aria-hidden', 'true');
        btn.element.appendChild(hoverChevron);
        // Only show leading icon for errors, or for checkmarks/loading when the accessibility setting is on
        const showCheckmarks = observableConfigValue("accessibility.chat.showCheckmarks" /* AccessibilityWorkbenchSettingId.ShowChatCheckmarks */, false, this.configurationService);
        const expanded = this._expanded = observableValue(this, initiallyExpanded);
        this._register(autorun(r => {
            const value = expanded.read(r);
            const checkmarksEnabled = showCheckmarks.read(r);
            elements.root.classList.toggle('collapsed', !value);
            const isInProgress = !output && !isError;
            if (isError) {
                btn.icon = Codicon.error;
            }
            else {
                btn.icon = output
                    ? Codicon.check
                    : ThemeIcon.modify(Codicon.loading, 'spin');
            }
            elements.root.classList.toggle('shimmer-progress', shimmer && isInProgress);
            container.root.classList.toggle('show-checkmarks', checkmarksEnabled);
            // Update hover chevron direction
            hoverChevron.classList.toggle('codicon-chevron-right', !value);
            hoverChevron.classList.toggle('codicon-chevron-down', value);
            // Lazy initialization: render content only when expanded for the first time
            if (value && !this._contentInitialized) {
                this._contentInitialized = true;
                const messageContainer = dom.h('.chat-confirmation-widget-message');
                messageContainer.root.appendChild(this.createMessageContents());
                elements.root.appendChild(messageContainer.root);
            }
        }));
        const toggle = (e) => {
            if (!e.defaultPrevented) {
                const value = expanded.get();
                expanded.set(!value, undefined);
                e.preventDefault();
            }
        };
        this._register(btn.onDidClick(toggle));
        const topLevelResources = this.output?.parts
            .filter(p => p.kind === 'data')
            .filter(p => !p.audience || p.audience.includes(LanguageModelPartAudience.User));
        if (topLevelResources?.length) {
            const resourceSubPart = this._register(this._instantiationService.createInstance(ChatToolOutputContentSubPart, this.context, topLevelResources));
            const group = resourceSubPart.domNode;
            group.classList.add('chat-collapsible-top-level-resource-group');
            container.root.appendChild(group);
            this._register(autorun(r => {
                group.style.display = expanded.read(r) ? 'none' : '';
            }));
        }
    }
    createMessageContents() {
        const contents = dom.h('div', [
            dom.h('h3@inputTitle'),
            dom.h('div@input'),
            dom.h('h3@outputTitle'),
            dom.h('div@output'),
        ]);
        const { input, output } = this;
        contents.inputTitle.textContent = localize(8038, null);
        this.addCodeBlock(input, contents.input);
        if (!output) {
            contents.output.remove();
            contents.outputTitle.remove();
        }
        else {
            contents.outputTitle.textContent = localize(8039, null);
            const outputSubPart = this._register(this._instantiationService.createInstance(ChatToolOutputContentSubPart, this.context, output.parts));
            this._outputSubPart = outputSubPart;
            contents.output.appendChild(outputSubPart.domNode);
        }
        return contents.root;
    }
    addCodeBlock(part, container) {
        // Create the text model lazily when rendering
        const textModel = this._register(this.modelService.createModel(part.data, this.languageService.createById(part.languageId), undefined, true));
        const data = {
            languageId: part.languageId,
            textModel: Promise.resolve(textModel),
            codeBlockIndex: part.codeBlockIndex,
            codeBlockPartIndex: 0,
            element: this.context.element,
            parentContextKeyService: this.contextKeyService,
            renderOptions: part.options,
            chatSessionResource: this.context.element.sessionResource,
        };
        const editorReference = this._register(this.context.editorPool.get());
        editorReference.object.render(data, this.context.currentWidth.get() || 300);
        container.appendChild(editorReference.object.element);
        this._editorReferences.push(editorReference);
    }
    hasSameContent(other, followingContent, element) {
        // For now, we consider content different unless it's exactly the same instance
        return false;
    }
    layout(width) {
        this._editorReferences.forEach(r => r.object.layout(width));
        this._outputSubPart?.layout(width);
    }
};
ChatCollapsibleInputOutputContentPart = __decorate([
    __param(9, IContextKeyService),
    __param(10, IInstantiationService),
    __param(11, IHoverService),
    __param(12, IModelService),
    __param(13, ILanguageService),
    __param(14, IChatMarkdownAnchorService),
    __param(15, IConfigurationService)
], ChatCollapsibleInputOutputContentPart);
export { ChatCollapsibleInputOutputContentPart };
//# sourceMappingURL=chatToolInputOutputContentPart.js.map