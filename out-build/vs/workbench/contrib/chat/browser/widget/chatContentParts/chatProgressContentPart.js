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
import { $, append } from '../../../../../../base/browser/dom.js';
import { renderAsPlaintext } from '../../../../../../base/browser/markdownRenderer.js';
import { alert } from '../../../../../../base/browser/ui/aria/aria.js';
import { Codicon } from '../../../../../../base/common/codicons.js';
import { MarkdownString } from '../../../../../../base/common/htmlContent.js';
import { stripIcons } from '../../../../../../base/common/iconLabels.js';
import { Disposable, DisposableStore, MutableDisposable } from '../../../../../../base/common/lifecycle.js';
import { ThemeIcon } from '../../../../../../base/common/themables.js';
import { IInstantiationService } from '../../../../../../platform/instantiation/common/instantiation.js';
import { localize } from '../../../../../../nls.js';
import { isResponseVM } from '../../../common/model/chatViewModel.js';
import { renderFileWidgets } from './chatInlineAnchorWidget.js';
import { getToolApprovalMessage } from './toolInvocationParts/chatToolPartUtilities.js';
import { IChatMarkdownAnchorService } from './chatMarkdownAnchorService.js';
import { IConfigurationService } from '../../../../../../platform/configuration/common/configuration.js';
import { IHoverService } from '../../../../../../platform/hover/browser/hover.js';
import { ILanguageModelToolsService } from '../../../common/tools/languageModelToolsService.js';
import { isEqual } from '../../../../../../base/common/resources.js';
import { buildPhrasePool } from './chatThinkingContentPart.js';
let ChatProgressContentPart = class ChatProgressContentPart extends Disposable {
    constructor(progress, chatContentMarkdownRenderer, context, forceShowSpinner, forceShowMessage, icon, toolInvocation, shimmer, instantiationService, chatMarkdownAnchorService, configurationService) {
        super();
        this.chatContentMarkdownRenderer = chatContentMarkdownRenderer;
        this.toolInvocation = toolInvocation;
        this.instantiationService = instantiationService;
        this.chatMarkdownAnchorService = chatMarkdownAnchorService;
        this.configurationService = configurationService;
        this.renderedMessage = this._register(new MutableDisposable());
        this._fileWidgetStore = this._register(new DisposableStore());
        this.currentContent = progress.content;
        const followingContent = context.content.slice(context.contentIndex + 1);
        this.showSpinner = forceShowSpinner ?? shouldShowSpinner(followingContent, context.element);
        this.isHidden = forceShowMessage !== true && followingContent.some(part => part.kind !== 'progressMessage');
        if (this.isHidden) {
            // Placeholder, don't show the progress message
            this.domNode = $('');
            return;
        }
        if (this.showSpinner && this.configurationService.getValue("accessibility.verboseChatProgressUpdates" /* AccessibilityWorkbenchSettingId.VerboseChatProgressUpdates */)) {
            // this step is in progress, communicate it to SR users
            alert(stripIcons(renderAsPlaintext(progress.content)));
        }
        const isLoadingIcon = icon && ThemeIcon.isEqual(icon, ThemeIcon.modify(Codicon.loading, 'spin'));
        // Even if callers request shimmer, only the active (spinner-visible) progress row should animate.
        const useShimmer = (shimmer ?? (!icon || isLoadingIcon)) && this.showSpinner;
        // if we have shimmer, don't show spinner
        const codicon = useShimmer ? Codicon.check : (icon ?? (this.showSpinner ? ThemeIcon.modify(Codicon.loading, 'spin') : Codicon.check));
        const result = this.chatContentMarkdownRenderer.render(progress.content);
        result.element.classList.add('progress-step');
        renderFileWidgets(result.element, this.instantiationService, this.chatMarkdownAnchorService, this._fileWidgetStore);
        const tooltip = this.createApprovalMessage();
        const progressPart = this._register(instantiationService.createInstance(ChatProgressSubPart, result.element, codicon, tooltip));
        this.domNode = progressPart.domNode;
        if (useShimmer) {
            this.domNode.classList.add('shimmer-progress');
        }
        this.renderedMessage.value = result;
    }
    updateMessage(content) {
        if (this.isHidden) {
            return;
        }
        // Render the new message
        const result = this._register(this.chatContentMarkdownRenderer.render(content));
        result.element.classList.add('progress-step');
        this._fileWidgetStore.clear();
        renderFileWidgets(result.element, this.instantiationService, this.chatMarkdownAnchorService, this._fileWidgetStore);
        // Replace the old message container with the new one
        if (this.renderedMessage.value) {
            this.renderedMessage.value.element.replaceWith(result.element);
        }
        else {
            this.domNode.appendChild(result.element);
        }
        this.renderedMessage.value = result;
    }
    hasSameContent(other, followingContent, element) {
        // Progress parts render render until some other content shows up, then they hide.
        // When some other content shows up, need to signal to be rerendered as hidden.
        if (followingContent.some(part => part.kind !== 'progressMessage') && !this.isHidden) {
            return false;
        }
        // Needs rerender when spinner state changes
        const showSpinner = shouldShowSpinner(followingContent, element);
        // Needs rerender when content changes
        if (other.kind === 'progressMessage' && other.content.value !== this.currentContent.value) {
            return false;
        }
        return other.kind === 'progressMessage' && this.showSpinner === showSpinner;
    }
    createApprovalMessage() {
        return this.toolInvocation && getToolApprovalMessage(this.toolInvocation);
    }
};
ChatProgressContentPart = __decorate([
    __param(8, IInstantiationService),
    __param(9, IChatMarkdownAnchorService),
    __param(10, IConfigurationService)
], ChatProgressContentPart);
export { ChatProgressContentPart };
function shouldShowSpinner(followingContent, element) {
    return isResponseVM(element) && !element.isComplete && followingContent.length === 0;
}
let ChatProgressSubPart = class ChatProgressSubPart extends Disposable {
    constructor(messageElement, icon, tooltip, hoverService) {
        super();
        this.domNode = $('.progress-container');
        const iconElement = $('div');
        iconElement.classList.add(...ThemeIcon.asClassNameArray(icon));
        if (tooltip) {
            this._register(hoverService.setupDelayedHover(iconElement, {
                content: tooltip,
                style: 1 /* HoverStyle.Pointer */,
            }));
            this._register(hoverService.setupDelayedHover(messageElement, {
                content: tooltip,
                style: 1 /* HoverStyle.Pointer */,
            }));
        }
        append(this.domNode, iconElement);
        messageElement.classList.add('progress-step');
        append(this.domNode, messageElement);
    }
};
ChatProgressSubPart = __decorate([
    __param(3, IHoverService)
], ChatProgressSubPart);
export { ChatProgressSubPart };
let ChatWorkingProgressContentPart = class ChatWorkingProgressContentPart extends ChatProgressContentPart {
    constructor(_workingProgress, chatContentMarkdownRenderer, context, instantiationService, chatMarkdownAnchorService, configurationService, languageModelToolsService) {
        const defaultLabel = localize(7908, null);
        const pool = buildPhrasePool([defaultLabel], configurationService);
        const label = pool[Math.floor(Math.random() * pool.length)];
        const progressMessage = {
            kind: 'progressMessage',
            content: new MarkdownString().appendText(label)
        };
        super(progressMessage, chatContentMarkdownRenderer, context, undefined, undefined, undefined, undefined, true, instantiationService, chatMarkdownAnchorService, configurationService);
        this._register(languageModelToolsService.onDidPrepareToolCallBecomeUnresponsive(e => {
            if (isEqual(context.element.sessionResource, e.sessionResource)) {
                this.updateMessage(new MarkdownString(localize(7909, null, e.toolData.displayName)));
            }
        }));
    }
    hasSameContent(other, followingContent, element) {
        return other.kind === 'working';
    }
};
ChatWorkingProgressContentPart = __decorate([
    __param(3, IInstantiationService),
    __param(4, IChatMarkdownAnchorService),
    __param(5, IConfigurationService),
    __param(6, ILanguageModelToolsService)
], ChatWorkingProgressContentPart);
export { ChatWorkingProgressContentPart };
//# sourceMappingURL=chatProgressContentPart.js.map