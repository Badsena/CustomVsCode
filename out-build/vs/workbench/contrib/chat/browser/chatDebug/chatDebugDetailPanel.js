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
import * as DOM from '../../../../../base/browser/dom.js';
import { Button } from '../../../../../base/browser/ui/button/button.js';
import { Sash } from '../../../../../base/browser/ui/sash/sash.js';
import { DomScrollableElement } from '../../../../../base/browser/ui/scrollbar/scrollableElement.js';
import { Codicon } from '../../../../../base/common/codicons.js';
import { Emitter } from '../../../../../base/common/event.js';
import { Disposable, DisposableStore } from '../../../../../base/common/lifecycle.js';
import { localize } from '../../../../../nls.js';
import { ILanguageService } from '../../../../../editor/common/languages/language.js';
import { IModelService } from '../../../../../editor/common/services/model.js';
import { IClipboardService } from '../../../../../platform/clipboard/common/clipboardService.js';
import { IHoverService } from '../../../../../platform/hover/browser/hover.js';
import { IInstantiationService } from '../../../../../platform/instantiation/common/instantiation.js';
import { ILabelService } from '../../../../../platform/label/common/label.js';
import { IOpenerService } from '../../../../../platform/opener/common/opener.js';
import { IEditorService } from '../../../../services/editor/common/editorService.js';
import { IChatDebugService } from '../../common/chatDebugService.js';
import { formatEventDetail } from './chatDebugEventDetailRenderer.js';
import { renderCustomizationDiscoveryContent, fileListToPlainText } from './chatCustomizationDiscoveryRenderer.js';
import { renderUserMessageContent, renderAgentResponseContent, messageEventToPlainText, renderResolvedMessageContent, resolvedMessageToPlainText } from './chatDebugMessageContentRenderer.js';
import { renderToolCallContent, toolCallContentToPlainText } from './chatDebugToolCallContentRenderer.js';
import { renderModelTurnContent, modelTurnContentToPlainText } from './chatDebugModelTurnContentRenderer.js';
import { renderHookContent, hookContentToPlainText } from './chatDebugHookContentRenderer.js';
const $ = DOM.$;
const DETAIL_PANEL_DEFAULT_WIDTH = 350;
const DETAIL_PANEL_MIN_WIDTH = 200;
const DETAIL_PANEL_MAX_WIDTH = 800;
/**
 * Reusable detail panel that resolves and displays the content of a
 * single {@link IChatDebugEvent}. Used by both the logs view and the
 * flow chart view.
 */
let ChatDebugDetailPanel = class ChatDebugDetailPanel extends Disposable {
    get width() {
        return this._width;
    }
    constructor(parent, chatDebugService, instantiationService, editorService, clipboardService, hoverService, openerService, languageService) {
        super();
        this.chatDebugService = chatDebugService;
        this.instantiationService = instantiationService;
        this.editorService = editorService;
        this.clipboardService = clipboardService;
        this.hoverService = hoverService;
        this.openerService = openerService;
        this.languageService = languageService;
        this._onDidHide = this._register(new Emitter());
        this.onDidHide = this._onDidHide.event;
        this._onDidChangeWidth = this._register(new Emitter());
        this.onDidChangeWidth = this._onDidChangeWidth.event;
        this.detailDisposables = this._register(new DisposableStore());
        this.currentDetailText = '';
        this._width = DETAIL_PANEL_DEFAULT_WIDTH;
        this.element = DOM.append(parent, $('.chat-debug-detail-panel'));
        this.contentContainer = $('.chat-debug-detail-content');
        this.scrollable = this._register(new DomScrollableElement(this.contentContainer, {
            horizontal: 2 /* ScrollbarVisibility.Hidden */,
            vertical: 1 /* ScrollbarVisibility.Auto */,
        }));
        this.element.style.width = `${this._width}px`;
        DOM.hide(this.element);
        // Sash on the parent container, positioned at the left edge of the detail panel
        this.sash = this._register(new Sash(parent, {
            getVerticalSashLeft: () => parent.offsetWidth - this._width,
        }, { orientation: 0 /* Orientation.VERTICAL */ }));
        this.sash.state = 0 /* SashState.Disabled */;
        let sashStartWidth;
        this._register(this.sash.onDidStart(() => sashStartWidth = this._width));
        this._register(this.sash.onDidEnd(() => {
            sashStartWidth = undefined;
            this.sash.layout();
        }));
        this._register(this.sash.onDidChange(e => {
            if (sashStartWidth === undefined) {
                return;
            }
            // Dragging left (negative currentX delta) should increase width
            const delta = e.startX - e.currentX;
            const newWidth = Math.max(DETAIL_PANEL_MIN_WIDTH, Math.min(DETAIL_PANEL_MAX_WIDTH, sashStartWidth + delta));
            this._width = newWidth;
            this.element.style.width = `${newWidth}px`;
            this.sash.layout();
            this._onDidChangeWidth.fire(newWidth);
        }));
        // Handle Ctrl+A / Cmd+A to select all within the detail panel
        this._register(DOM.addDisposableListener(this.element, DOM.EventType.KEY_DOWN, (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'a') {
                const target = e.target;
                if (target && this.element.contains(target)) {
                    e.preventDefault();
                    const targetWindow = DOM.getWindow(target);
                    const selection = targetWindow.getSelection();
                    if (selection) {
                        const range = targetWindow.document.createRange();
                        range.selectNodeContents(target);
                        selection.removeAllRanges();
                        selection.addRange(range);
                    }
                }
            }
        }));
    }
    async show(event) {
        // Skip re-rendering if we're already showing this event's detail
        if (event.id && event.id === this.currentDetailEventId) {
            return;
        }
        this.currentDetailEventId = event.id;
        const resolved = event.id ? await this.chatDebugService.resolveEvent(event.id) : undefined;
        DOM.show(this.element);
        this.sash.state = 3 /* SashState.Enabled */;
        this.sash.layout();
        DOM.clearNode(this.element);
        DOM.clearNode(this.contentContainer);
        this.detailDisposables.clear();
        // Header with action buttons
        const header = DOM.append(this.element, $('.chat-debug-detail-header'));
        this.headerElement = header;
        this.element.appendChild(this.scrollable.getDomNode());
        const fullScreenButton = this.detailDisposables.add(new Button(header, { ariaLabel: localize(6866, null), title: localize(6867, null) }));
        fullScreenButton.element.classList.add('chat-debug-detail-button');
        fullScreenButton.icon = Codicon.goToFile;
        this.firstFocusableElement = fullScreenButton.element;
        this.detailDisposables.add(fullScreenButton.onDidClick(() => {
            this.editorService.openEditor({ contents: this.currentDetailText, resource: undefined });
        }));
        const copyButton = this.detailDisposables.add(new Button(header, { ariaLabel: localize(6868, null), title: localize(6869, null) }));
        copyButton.element.classList.add('chat-debug-detail-button');
        copyButton.icon = Codicon.copy;
        this.detailDisposables.add(copyButton.onDidClick(() => {
            this.clipboardService.writeText(this.currentDetailText);
        }));
        const closeButton = this.detailDisposables.add(new Button(header, { ariaLabel: localize(6870, null), title: localize(6871, null) }));
        closeButton.element.classList.add('chat-debug-detail-button');
        closeButton.icon = Codicon.close;
        this.detailDisposables.add(closeButton.onDidClick(() => {
            this.hide();
        }));
        if (resolved && resolved.kind === 'fileList') {
            this.currentDetailText = fileListToPlainText(resolved);
            const { element: contentEl, disposables: contentDisposables } = this.instantiationService.invokeFunction(accessor => renderCustomizationDiscoveryContent(resolved, this.openerService, accessor.get(IModelService), this.languageService, this.hoverService, accessor.get(ILabelService), this.scrollable));
            this.detailDisposables.add(contentDisposables);
            this.contentContainer.appendChild(contentEl);
        }
        else if (resolved && resolved.kind === 'toolCall') {
            this.currentDetailText = toolCallContentToPlainText(resolved);
            const { element: contentEl, disposables: contentDisposables } = await renderToolCallContent(resolved, this.languageService, this.clipboardService, this.scrollable);
            if (this.currentDetailEventId !== event.id) {
                // Another event was selected while we were rendering
                contentDisposables.dispose();
                return;
            }
            this.detailDisposables.add(contentDisposables);
            this.contentContainer.appendChild(contentEl);
        }
        else if (resolved && resolved.kind === 'message') {
            this.currentDetailText = resolvedMessageToPlainText(resolved);
            const { element: contentEl, disposables: contentDisposables } = await renderResolvedMessageContent(resolved, this.languageService, this.clipboardService, this.scrollable);
            if (this.currentDetailEventId !== event.id) {
                contentDisposables.dispose();
                return;
            }
            this.detailDisposables.add(contentDisposables);
            this.contentContainer.appendChild(contentEl);
        }
        else if (resolved && resolved.kind === 'modelTurn') {
            this.currentDetailText = modelTurnContentToPlainText(resolved);
            const { element: contentEl, disposables: contentDisposables } = await renderModelTurnContent(resolved, this.languageService, this.clipboardService, this.scrollable);
            if (this.currentDetailEventId !== event.id) {
                // Another event was selected while we were rendering
                contentDisposables.dispose();
                return;
            }
            this.detailDisposables.add(contentDisposables);
            this.contentContainer.appendChild(contentEl);
        }
        else if (resolved && resolved.kind === 'hook') {
            this.currentDetailText = hookContentToPlainText(resolved);
            const { element: contentEl, disposables: contentDisposables } = await renderHookContent(resolved, this.languageService, this.clipboardService, this.scrollable);
            if (this.currentDetailEventId !== event.id) {
                // Another event was selected while we were rendering
                contentDisposables.dispose();
                return;
            }
            this.detailDisposables.add(contentDisposables);
            this.contentContainer.appendChild(contentEl);
        }
        else if (event.kind === 'userMessage') {
            this.currentDetailText = messageEventToPlainText(event);
            const { element: contentEl, disposables: contentDisposables } = await renderUserMessageContent(event, this.languageService, this.clipboardService, this.scrollable);
            if (this.currentDetailEventId !== event.id) {
                contentDisposables.dispose();
                return;
            }
            this.detailDisposables.add(contentDisposables);
            this.contentContainer.appendChild(contentEl);
        }
        else if (event.kind === 'agentResponse') {
            this.currentDetailText = messageEventToPlainText(event);
            const { element: contentEl, disposables: contentDisposables } = await renderAgentResponseContent(event, this.languageService, this.clipboardService, this.scrollable);
            if (this.currentDetailEventId !== event.id) {
                contentDisposables.dispose();
                return;
            }
            this.detailDisposables.add(contentDisposables);
            this.contentContainer.appendChild(contentEl);
        }
        else {
            const pre = DOM.append(this.contentContainer, $('pre'));
            pre.tabIndex = 0;
            if (resolved) {
                this.currentDetailText = resolved.value;
            }
            else {
                this.currentDetailText = formatEventDetail(event);
            }
            pre.textContent = this.currentDetailText;
        }
        // Compute height from the parent container and set explicit
        // dimensions so the scrollable element can show proper scrollbars.
        const parentHeight = this.element.parentElement?.clientHeight ?? 0;
        if (parentHeight > 0) {
            this.layout(parentHeight);
        }
        else {
            this.scrollable.scanDomNode();
        }
    }
    get isVisible() {
        return this.element.style.display !== 'none';
    }
    focus() {
        this.firstFocusableElement?.focus();
    }
    /**
     * Set explicit dimensions on the scrollable element so the scrollbar
     * can compute its size. Call after the panel is shown and whenever
     * the available space changes.
     */
    layout(height) {
        const headerHeight = this.headerElement?.offsetHeight ?? 0;
        const scrollableHeight = Math.max(0, height - headerHeight);
        this.contentContainer.style.height = `${scrollableHeight}px`;
        this.scrollable.scanDomNode();
        this.sash.layout();
    }
    layoutSash() {
        this.sash.layout();
    }
    hide() {
        this.currentDetailEventId = undefined;
        this.firstFocusableElement = undefined;
        this.headerElement = undefined;
        DOM.hide(this.element);
        this.sash.state = 0 /* SashState.Disabled */;
        DOM.clearNode(this.element);
        DOM.clearNode(this.contentContainer);
        this.detailDisposables.clear();
        this._onDidHide.fire();
    }
};
ChatDebugDetailPanel = __decorate([
    __param(1, IChatDebugService),
    __param(2, IInstantiationService),
    __param(3, IEditorService),
    __param(4, IClipboardService),
    __param(5, IHoverService),
    __param(6, IOpenerService),
    __param(7, ILanguageService)
], ChatDebugDetailPanel);
export { ChatDebugDetailPanel };
//# sourceMappingURL=chatDebugDetailPanel.js.map