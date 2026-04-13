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
import { $ } from '../../../../../../base/browser/dom.js';
import { ButtonWithIcon } from '../../../../../../base/browser/ui/button/button.js';
import { Disposable, MutableDisposable } from '../../../../../../base/common/lifecycle.js';
import { autorun, observableValue } from '../../../../../../base/common/observable.js';
import { IConfigurationService } from '../../../../../../platform/configuration/common/configuration.js';
import { IHoverService } from '../../../../../../platform/hover/browser/hover.js';
import { observableConfigValue } from '../../../../../../platform/observable/common/platformObservableUtils.js';
import { renderFileWidgets } from './chatInlineAnchorWidget.js';
let ChatCollapsibleContentPart = class ChatCollapsibleContentPart extends Disposable {
    get icon() {
        return this._overrideIcon.get();
    }
    set icon(value) {
        this._overrideIcon.set(value, undefined);
    }
    constructor(title, context, hoverMessage, hoverService, configurationService) {
        super();
        this.title = title;
        this.hoverMessage = hoverMessage;
        this.hoverService = hoverService;
        this._renderedTitleWithWidgets = this._register(new MutableDisposable());
        this._isExpanded = observableValue(this, false);
        this._overrideIcon = observableValue(this, undefined);
        this._contentInitialized = false;
        this.element = context.element;
        this.hasFollowingContent = context.contentIndex + 1 < context.content.length;
        this._showCheckmarks = observableConfigValue("accessibility.chat.showCheckmarks" /* AccessibilityWorkbenchSettingId.ShowChatCheckmarks */, false, configurationService);
    }
    get domNode() {
        this._domNode ??= this.init();
        return this._domNode;
    }
    init() {
        const referencesLabel = this.title;
        const buttonElement = $('.chat-used-context-label', undefined);
        const collapseButton = this._register(new ButtonWithIcon(buttonElement, {
            buttonBackground: undefined,
            buttonBorder: undefined,
            buttonForeground: undefined,
            buttonHoverBackground: undefined,
            buttonSecondaryBackground: undefined,
            buttonSecondaryForeground: undefined,
            buttonSecondaryHoverBackground: undefined,
            buttonSeparator: undefined
        }));
        this._collapseButton = collapseButton;
        this._domNode = $('.chat-used-context', undefined, buttonElement);
        collapseButton.label = referencesLabel;
        // Add hover chevron indicator on the right (decorative, hide from screen readers)
        const hoverChevron = $('span.chat-collapsible-hover-chevron.codicon.codicon-chevron-right', { 'aria-hidden': 'true' });
        collapseButton.element.appendChild(hoverChevron);
        if (this.hoverMessage) {
            this._register(this.hoverService.setupDelayedHover(collapseButton.iconElement, {
                content: this.hoverMessage,
                style: 1 /* HoverStyle.Pointer */,
            }));
        }
        this._register(collapseButton.onDidClick(() => {
            const value = this._isExpanded.get();
            this._isExpanded.set(!value, undefined);
        }));
        // Initialize the expanded state based on the subclass's isExpanded() method
        this._isExpanded.set(this.isExpanded(), undefined);
        this._register(autorun(r => {
            const expanded = this._isExpanded.read(r);
            const overrideIcon = this._overrideIcon.read(r);
            const showCheckmarks = this._showCheckmarks.read(r);
            if (overrideIcon) {
                collapseButton.icon = overrideIcon;
            }
            this._domNode?.classList.toggle('show-checkmarks', showCheckmarks);
            // Update hover chevron direction
            hoverChevron.classList.toggle('codicon-chevron-right', !expanded);
            hoverChevron.classList.toggle('codicon-chevron-down', expanded);
            this._domNode?.classList.toggle('chat-used-context-collapsed', !expanded);
            this.updateAriaLabel(collapseButton.element, typeof referencesLabel === 'string' ? referencesLabel : referencesLabel.value, expanded);
            // Lazy initialization: render content only when expanded for the first time
            if ((expanded || this.shouldInitEarly()) && !this._contentInitialized) {
                this._contentInitialized = true;
                this._contentElement = this.initContent();
                this._domNode?.appendChild(this._contentElement);
            }
        }));
        return this._domNode;
    }
    shouldInitEarly() {
        return false;
    }
    updateAriaLabel(element, label, expanded) {
        element.ariaLabel = label;
        element.ariaExpanded = String(expanded);
    }
    addDisposable(disposable) {
        this._register(disposable);
    }
    get expanded() {
        return this._isExpanded;
    }
    isExpanded() {
        return this._isExpanded.get();
    }
    setExpanded(value) {
        this._isExpanded.set(value, undefined);
    }
    setTitle(title) {
        this.title = title;
        if (this._collapseButton) {
            this._collapseButton.label = title;
            this.updateAriaLabel(this._collapseButton.element, title, this.isExpanded());
        }
    }
    // Render collapsible dropdown title with widgets
    setTitleWithWidgets(content, instantiationService, chatMarkdownAnchorService, chatContentMarkdownRenderer) {
        if (this._store.isDisposed || !this._collapseButton) {
            return;
        }
        const result = chatContentMarkdownRenderer.render(content);
        result.element.classList.add('collapsible-title-content');
        renderFileWidgets(result.element, instantiationService, chatMarkdownAnchorService, this._store);
        const labelElement = this._collapseButton.labelElement;
        labelElement.textContent = '';
        labelElement.appendChild(result.element);
        const textContent = result.element.textContent || '';
        this.updateAriaLabel(this._collapseButton.element, textContent, this.isExpanded());
        this._renderedTitleWithWidgets.value = result;
    }
};
ChatCollapsibleContentPart = __decorate([
    __param(3, IHoverService),
    __param(4, IConfigurationService)
], ChatCollapsibleContentPart);
export { ChatCollapsibleContentPart };
//# sourceMappingURL=chatCollapsibleContentPart.js.map