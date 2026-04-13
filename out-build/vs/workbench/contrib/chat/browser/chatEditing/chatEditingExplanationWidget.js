/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import './media/chatEditingExplanationWidget.css';
import { Codicon } from '../../../../../base/common/codicons.js';
import { Disposable, DisposableStore } from '../../../../../base/common/lifecycle.js';
import { Event } from '../../../../../base/common/event.js';
import { renderIcon } from '../../../../../base/browser/ui/iconLabel/iconLabels.js';
import { $, addDisposableListener, clearNode, getTotalWidth } from '../../../../../base/browser/dom.js';
import { ThemeIcon } from '../../../../../base/common/themables.js';
import { Range } from '../../../../../editor/common/core/range.js';
import { overviewRulerRangeHighlight } from '../../../../../editor/common/core/editorColorRegistry.js';
import { OverviewRulerLane } from '../../../../../editor/common/model.js';
import { themeColorFromId } from '../../../../../platform/theme/common/themeService.js';
import { ChatViewId } from '../chat.js';
import * as nls from '../../../../../nls.js';
import { autorun } from '../../../../../base/common/observable.js';
/**
 * Gets the text content for a change
 */
function getChangeTexts(change, diffInfo) {
    const originalLines = [];
    const modifiedLines = [];
    // Get original text
    for (let i = change.original.startLineNumber; i < change.original.endLineNumberExclusive; i++) {
        const line = diffInfo.originalModel.getLineContent(i);
        originalLines.push(line);
    }
    // Get modified text
    for (let i = change.modified.startLineNumber; i < change.modified.endLineNumberExclusive; i++) {
        const line = diffInfo.modifiedModel.getLineContent(i);
        modifiedLines.push(line);
    }
    return {
        originalText: originalLines.join('\n'),
        modifiedText: modifiedLines.join('\n')
    };
}
/**
 * Groups nearby changes within a threshold number of lines
 * Uses the vertical span from widget position to last line it refers to
 */
function groupNearbyChanges(changes, lineThreshold = 5) {
    if (changes.length === 0) {
        return [];
    }
    const groups = [];
    let currentGroup = [changes[0]];
    for (let i = 1; i < changes.length; i++) {
        const firstChange = currentGroup[0];
        const currentChange = changes[i];
        // Calculate vertical span from widget position (first change) to start of current change
        const widgetLine = firstChange.modified.startLineNumber;
        const lastLine = currentChange.modified.startLineNumber;
        const verticalSpan = lastLine - widgetLine;
        if (verticalSpan <= lineThreshold) {
            currentGroup.push(currentChange);
        }
        else {
            groups.push(currentGroup);
            currentGroup = [currentChange];
        }
    }
    if (currentGroup.length > 0) {
        groups.push(currentGroup);
    }
    return groups;
}
/**
 * Widget that displays explanatory comments for chat-made changes
 * Positioned on the right side of the editor like a speech bubble
 */
export class ChatEditingExplanationWidget extends Disposable {
    static { this._idPool = 0; }
    constructor(_editor, _changes, diffInfo, _chatWidgetService, _viewsService, _chatSessionResource) {
        super();
        this._editor = _editor;
        this._changes = _changes;
        this._chatWidgetService = _chatWidgetService;
        this._viewsService = _viewsService;
        this._chatSessionResource = _chatSessionResource;
        this._id = `chat-explanation-widget-${ChatEditingExplanationWidget._idPool++}`;
        this._explanationItems = new Map();
        this._position = null;
        this._explanations = [];
        this._isExpanded = true;
        this._isAllRead = false;
        this._disposed = false;
        this._startLineNumber = 1;
        this._eventStore = this._register(new DisposableStore());
        this._uri = diffInfo.modifiedModel.uri;
        // Create decoration collection for range highlighting on hover
        this._rangeHighlightDecoration = this._editor.createDecorationsCollection();
        // Build explanations from changes with loading state
        this._explanations = this._changes.map(change => {
            const { originalText, modifiedText } = getChangeTexts(change, diffInfo);
            return {
                startLineNumber: change.modified.startLineNumber,
                endLineNumber: change.modified.endLineNumberExclusive - 1,
                explanation: nls.localize(7146, null),
                read: false,
                loading: true,
                originalText,
                modifiedText,
            };
        });
        // Create DOM structure
        this._domNode = $('div.chat-explanation-widget');
        // Header
        this._headerNode = $('div.chat-explanation-header');
        // Read indicator (checkbox-like)
        this._readIndicator = $('div.chat-explanation-read-indicator');
        this._updateReadIndicator();
        this._headerNode.appendChild(this._readIndicator);
        // Title showing change count
        this._titleNode = $('span.chat-explanation-title');
        this._updateTitle();
        this._headerNode.appendChild(this._titleNode);
        // Spacer
        this._headerNode.appendChild($('span.chat-explanation-spacer'));
        // Toggle expand/collapse button
        this._toggleButton = $('div.chat-explanation-toggle');
        this._updateToggleButton();
        this._headerNode.appendChild(this._toggleButton);
        // Dismiss button
        this._dismissButton = $('div.chat-explanation-dismiss');
        this._dismissButton.appendChild(renderIcon(Codicon.close));
        this._dismissButton.title = nls.localize(7147, null);
        this._headerNode.appendChild(this._dismissButton);
        this._domNode.appendChild(this._headerNode);
        // Body (collapsible)
        this._bodyNode = $('div.chat-explanation-body');
        // Body starts expanded by default
        this._buildExplanationItems();
        this._domNode.appendChild(this._bodyNode);
        // Arrow pointer
        const arrow = $('div.chat-explanation-arrow');
        this._domNode.appendChild(arrow);
        // Event handlers
        this._setupEventHandlers();
        // Add visible class for initial display
        this._domNode.classList.add('visible');
        // Add to editor
        this._editor.addOverlayWidget(this);
    }
    _setupEventHandlers() {
        // Read indicator click - toggle all read/unread
        this._eventStore.add(addDisposableListener(this._readIndicator, 'click', (e) => {
            e.stopPropagation();
            this._isAllRead = !this._isAllRead;
            for (const exp of this._explanations) {
                exp.read = this._isAllRead;
            }
            this._updateReadIndicator();
            this._updateExplanationItemsReadState();
        }));
        // Toggle button click - expand/collapse
        this._eventStore.add(addDisposableListener(this._toggleButton, 'click', (e) => {
            e.stopPropagation();
            this._toggleExpanded();
        }));
        // Header click - also toggles expand/collapse
        this._eventStore.add(addDisposableListener(this._headerNode, 'click', () => {
            this._toggleExpanded();
        }));
        // Dismiss button click
        this._eventStore.add(addDisposableListener(this._dismissButton, 'click', (e) => {
            e.stopPropagation();
            this._dismiss();
        }));
    }
    _toggleExpanded() {
        this._isExpanded = !this._isExpanded;
        this._bodyNode.classList.toggle('collapsed', !this._isExpanded);
        this._updateToggleButton();
        this._editor.layoutOverlayWidget(this);
    }
    _dismiss() {
        this._domNode.classList.add('fadeOut');
        const dispose = () => {
            this.dispose();
        };
        // Listen for animation end
        const handle = setTimeout(dispose, 150);
        this._domNode.addEventListener('animationend', () => {
            clearTimeout(handle);
            dispose();
        }, { once: true });
    }
    _updateReadIndicator() {
        clearNode(this._readIndicator);
        const allRead = this._explanations.every(e => e.read);
        const someRead = this._explanations.some(e => e.read);
        this._isAllRead = allRead;
        if (allRead) {
            this._readIndicator.appendChild(renderIcon(Codicon.circle));
            this._readIndicator.classList.add('read');
            this._readIndicator.classList.remove('partial', 'unread');
            this._readIndicator.title = nls.localize(7148, null);
        }
        else if (someRead) {
            this._readIndicator.appendChild(renderIcon(Codicon.circleFilled));
            this._readIndicator.classList.remove('read', 'unread');
            this._readIndicator.classList.add('partial');
            this._readIndicator.title = nls.localize(7149, null);
        }
        else {
            this._readIndicator.appendChild(renderIcon(Codicon.circleFilled));
            this._readIndicator.classList.remove('read', 'partial');
            this._readIndicator.classList.add('unread');
            this._readIndicator.title = nls.localize(7150, null);
        }
    }
    _updateTitle() {
        const count = this._explanations.length;
        if (count === 1) {
            this._titleNode.textContent = nls.localize(7151, null);
        }
        else {
            this._titleNode.textContent = nls.localize(7152, null, count);
        }
    }
    _updateToggleButton() {
        clearNode(this._toggleButton);
        if (this._isExpanded) {
            this._toggleButton.appendChild(renderIcon(Codicon.chevronUp));
            this._toggleButton.title = nls.localize(7153, null);
        }
        else {
            this._toggleButton.appendChild(renderIcon(Codicon.chevronDown));
            this._toggleButton.title = nls.localize(7154, null);
        }
    }
    _buildExplanationItems() {
        clearNode(this._bodyNode);
        this._explanationItems.clear();
        for (let i = 0; i < this._explanations.length; i++) {
            const exp = this._explanations[i];
            const item = $('div.chat-explanation-item');
            // Line indicator
            const lineInfo = $('span.chat-explanation-line-info');
            if (exp.startLineNumber === exp.endLineNumber) {
                lineInfo.textContent = nls.localize(7155, null, exp.startLineNumber);
            }
            else {
                lineInfo.textContent = nls.localize(7156, null, exp.startLineNumber, exp.endLineNumber);
            }
            item.appendChild(lineInfo);
            // Explanation text with loading indicator
            const text = $('span.chat-explanation-text');
            if (exp.loading) {
                const loadingIcon = renderIcon(ThemeIcon.modify(Codicon.loading, 'spin'));
                loadingIcon.classList.add('chat-explanation-loading');
                text.appendChild(loadingIcon);
                const loadingText = document.createTextNode(' ' + exp.explanation);
                text.appendChild(loadingText);
            }
            else {
                text.textContent = exp.explanation;
            }
            item.appendChild(text);
            // Item read indicator
            const itemReadIndicator = $('div.chat-explanation-item-read');
            this._updateItemReadIndicator(itemReadIndicator, exp.read);
            item.appendChild(itemReadIndicator);
            // Reply button to add context to chat
            const replyButton = $('div.chat-explanation-reply-button');
            replyButton.appendChild(renderIcon(Codicon.arrowRight));
            replyButton.title = nls.localize(7157, null);
            item.appendChild(replyButton);
            // Reply button click handler
            this._eventStore.add(addDisposableListener(replyButton, 'click', async (e) => {
                e.stopPropagation();
                const range = new Range(exp.startLineNumber, 1, exp.endLineNumber, 1);
                let chatWidget;
                if (this._chatSessionResource) {
                    chatWidget = await this._chatWidgetService.openSession(this._chatSessionResource);
                }
                else {
                    await this._viewsService.openView(ChatViewId, true);
                    chatWidget = this._chatWidgetService.lastFocusedWidget;
                }
                if (chatWidget) {
                    chatWidget.attachmentModel.addContext(chatWidget.attachmentModel.asFileVariableEntry(this._uri, range));
                }
            }));
            // Click on item to mark as read
            this._eventStore.add(addDisposableListener(item, 'click', (e) => {
                e.stopPropagation();
                exp.read = !exp.read;
                this._updateItemReadIndicator(itemReadIndicator, exp.read);
                this._updateReadIndicator();
            }));
            // Hover handlers for range highlighting
            this._eventStore.add(addDisposableListener(item, 'mouseenter', () => {
                const range = new Range(exp.startLineNumber, 1, exp.endLineNumber, this._editor.getModel()?.getLineMaxColumn(exp.endLineNumber) ?? 1);
                this._rangeHighlightDecoration.set([
                    // Line highlight with gutter decoration
                    {
                        range,
                        options: {
                            description: 'chat-explanation-range-highlight',
                            className: 'rangeHighlight',
                            isWholeLine: true,
                            linesDecorationsClassName: 'chat-explanation-range-glyph',
                        }
                    },
                    // Overview ruler indicator
                    {
                        range,
                        options: {
                            description: 'chat-explanation-range-highlight-overview',
                            overviewRuler: {
                                color: themeColorFromId(overviewRulerRangeHighlight),
                                position: OverviewRulerLane.Full,
                            }
                        }
                    }
                ]);
            }));
            this._eventStore.add(addDisposableListener(item, 'mouseleave', () => {
                this._rangeHighlightDecoration.clear();
            }));
            this._explanationItems.set(i, { item, readIndicator: itemReadIndicator, textElement: text });
            this._bodyNode.appendChild(item);
        }
    }
    /**
     * Sets the explanation for a change matching the given line number range.
     * @returns true if a matching explanation was found and updated
     */
    setExplanationByLineNumber(startLineNumber, endLineNumber, explanation) {
        for (let i = 0; i < this._explanations.length; i++) {
            const exp = this._explanations[i];
            if (exp.startLineNumber === startLineNumber && exp.endLineNumber === endLineNumber) {
                exp.explanation = explanation;
                exp.loading = false;
                this._updateExplanationText(i);
                return true;
            }
        }
        return false;
    }
    /**
     * Gets the number of explanations in this widget.
     */
    get explanationCount() {
        return this._explanations.length;
    }
    _updateExplanationText(index) {
        const itemData = this._explanationItems.get(index);
        const exp = this._explanations[index];
        if (itemData && exp) {
            clearNode(itemData.textElement);
            itemData.textElement.textContent = exp.explanation;
        }
    }
    _updateItemReadIndicator(element, read) {
        clearNode(element);
        if (read) {
            element.appendChild(renderIcon(Codicon.circle));
            element.classList.add('read');
            element.classList.remove('unread');
        }
        else {
            element.appendChild(renderIcon(Codicon.circleFilled));
            element.classList.remove('read');
            element.classList.add('unread');
        }
    }
    _updateExplanationItemsReadState() {
        this._explanationItems.forEach(({ readIndicator }, index) => {
            const exp = this._explanations[index];
            this._updateItemReadIndicator(readIndicator, exp.read);
        });
    }
    /**
     * Updates the widget position and layout
     */
    layout(startLineNumber) {
        if (this._disposed) {
            return;
        }
        this._startLineNumber = startLineNumber;
        const lineHeight = this._editor.getOption(75 /* EditorOption.lineHeight */);
        const { contentLeft, contentWidth, verticalScrollbarWidth } = this._editor.getLayoutInfo();
        const scrollTop = this._editor.getScrollTop();
        // Position at right edge like DiffHunkWidget
        const widgetWidth = getTotalWidth(this._domNode) || 280;
        this._position = {
            stackOrdinal: 2,
            preference: {
                top: this._editor.getTopForLineNumber(startLineNumber) - scrollTop - lineHeight,
                left: contentLeft + contentWidth - (2 * verticalScrollbarWidth + widgetWidth)
            }
        };
        this._editor.layoutOverlayWidget(this);
    }
    /**
     * Shows or hides the widget
     */
    toggle(show) {
        this._domNode.classList.toggle('visible', show);
        if (show && this._explanations.length > 0) {
            this.layout(this._explanations[0].startLineNumber);
        }
    }
    /**
     * Relayouts the widget at its current line number
     */
    relayout() {
        if (this._startLineNumber) {
            this.layout(this._startLineNumber);
        }
    }
    // IOverlayWidget implementation
    getId() {
        return this._id;
    }
    getDomNode() {
        return this._domNode;
    }
    getPosition() {
        return this._position;
    }
    dispose() {
        if (this._disposed) {
            return;
        }
        this._disposed = true;
        this._rangeHighlightDecoration.clear();
        this._editor.removeOverlayWidget(this);
        super.dispose();
    }
}
/**
 * Manager for explanation widgets in an editor
 * Groups changes and creates combined widgets for nearby changes
 */
export class ChatEditingExplanationWidgetManager extends Disposable {
    constructor(_editor, _chatWidgetService, _viewsService, modelManager, _modelUri) {
        super();
        this._editor = _editor;
        this._chatWidgetService = _chatWidgetService;
        this._viewsService = _viewsService;
        this._modelUri = _modelUri;
        this._widgets = [];
        this._visible = false;
        // Listen for model changes - hide/show widgets based on whether current model matches
        this._register(this._editor.onDidChangeModel(() => {
            const newUri = this._editor.getModel()?.uri;
            if (this._modelUri) {
                if (newUri && newUri.toString() === this._modelUri.toString()) {
                    // Switched back to the file - show widgets
                    for (const widget of this._widgets) {
                        widget.toggle(this._visible);
                        widget.relayout();
                    }
                }
                else {
                    // Switched to a different file - hide widgets
                    for (const widget of this._widgets) {
                        widget.toggle(false);
                    }
                }
            }
        }));
        // Observe state from model manager
        this._register(autorun(r => {
            const state = modelManager.state.read(r);
            const uriState = state.get(this._modelUri);
            if (uriState) {
                // Update diffInfo and chatSessionResource from state
                this._diffInfo = uriState.diffInfo;
                this._chatSessionResource = uriState.chatSessionResource;
                // Ensure widgets are created
                if (this._widgets.length === 0 && this._diffInfo) {
                    this._createWidgets(this._diffInfo, this._chatSessionResource);
                }
                // Handle explanation state changes
                if (uriState.progress === 'complete') {
                    this._handleExplanations(this._modelUri, uriState.explanations);
                }
                this.show();
            }
            else {
                this.hide();
            }
        }));
    }
    _createWidgets(diffInfo, chatSessionResource) {
        if (diffInfo.identical || diffInfo.changes.length === 0) {
            return;
        }
        // Group nearby changes
        const groups = groupNearbyChanges(diffInfo.changes, 5);
        // Create a widget for each group
        for (const group of groups) {
            const widget = new ChatEditingExplanationWidget(this._editor, group, diffInfo, this._chatWidgetService, this._viewsService, chatSessionResource);
            this._widgets.push(widget);
            this._register(widget);
            // Layout at the first change in the group
            widget.layout(group[0].modified.startLineNumber);
        }
        // Relayout on scroll/layout changes
        this._register(Event.any(this._editor.onDidScrollChange, this._editor.onDidLayoutChange)(() => {
            for (const widget of this._widgets) {
                widget.relayout();
            }
        }));
    }
    _handleExplanations(uri, explanations) {
        if (!this._modelUri || uri.toString() !== this._modelUri.toString()) {
            return;
        }
        // Map explanations to widgets by matching line numbers
        for (const explanation of explanations) {
            for (const widget of this._widgets) {
                // Try to set the explanation on the widget - it will match by line number
                if (widget.setExplanationByLineNumber(explanation.startLineNumber, explanation.endLineNumber, explanation.explanation)) {
                    break; // Found the matching widget, no need to check others
                }
            }
        }
    }
    /**
     * Shows all widgets
     */
    show() {
        this._visible = true;
        for (const widget of this._widgets) {
            widget.toggle(true);
            widget.relayout();
        }
    }
    /**
     * Hides all widgets
     */
    hide() {
        this._visible = false;
        for (const widget of this._widgets) {
            widget.toggle(false);
        }
    }
    _clearWidgets() {
        for (const widget of this._widgets) {
            widget.dispose();
        }
        this._widgets.length = 0;
    }
    dispose() {
        this._clearWidgets();
        super.dispose();
    }
}
//# sourceMappingURL=chatEditingExplanationWidget.js.map