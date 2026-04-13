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
import { renderAsPlaintext } from '../../../../../../base/browser/markdownRenderer.js';
import { StandardKeyboardEvent } from '../../../../../../base/browser/keyboardEvent.js';
import { Emitter } from '../../../../../../base/common/event.js';
import { MarkdownString, isMarkdownString } from '../../../../../../base/common/htmlContent.js';
import { Disposable, DisposableStore, MutableDisposable } from '../../../../../../base/common/lifecycle.js';
import { isMacintosh } from '../../../../../../base/common/platform.js';
import { generateUuid } from '../../../../../../base/common/uuid.js';
import { hasKey } from '../../../../../../base/common/types.js';
import { localize } from '../../../../../../nls.js';
import { IAccessibilityService } from '../../../../../../platform/accessibility/common/accessibility.js';
import { IMarkdownRendererService } from '../../../../../../platform/markdown/browser/markdownRenderer.js';
import { defaultButtonStyles, defaultCheckboxStyles, defaultInputBoxStyles } from '../../../../../../platform/theme/browser/defaultStyles.js';
import { Button } from '../../../../../../base/browser/ui/button/button.js';
import { InputBox } from '../../../../../../base/browser/ui/inputbox/inputBox.js';
import { DomScrollableElement } from '../../../../../../base/browser/ui/scrollbar/scrollableElement.js';
import { Checkbox } from '../../../../../../base/browser/ui/toggle/toggle.js';
import { ChatQuestionCarouselData } from '../../../common/model/chatProgressTypes/chatQuestionCarouselData.js';
import { isResponseVM } from '../../../common/model/chatViewModel.js';
import { Codicon } from '../../../../../../base/common/codicons.js';
import { IHoverService } from '../../../../../../platform/hover/browser/hover.js';
import { IContextKeyService } from '../../../../../../platform/contextkey/common/contextkey.js';
import { IKeybindingService } from '../../../../../../platform/keybinding/common/keybinding.js';
import { ChatContextKeys } from '../../../common/actions/chatContextKeys.js';
import './media/chatQuestionCarousel.css';
const PREVIOUS_QUESTION_ACTION_ID = 'workbench.action.chat.previousQuestion';
const NEXT_QUESTION_ACTION_ID = 'workbench.action.chat.nextQuestion';
let ChatQuestionCarouselPart = class ChatQuestionCarouselPart extends Disposable {
    constructor(carousel, context, _options, _markdownRendererService, _hoverService, _accessibilityService, _contextKeyService, _keybindingService) {
        super();
        this.carousel = carousel;
        this._options = _options;
        this._markdownRendererService = _markdownRendererService;
        this._hoverService = _hoverService;
        this._accessibilityService = _accessibilityService;
        this._contextKeyService = _contextKeyService;
        this._keybindingService = _keybindingService;
        this._onDidChangeHeight = this._register(new Emitter());
        this.onDidChangeHeight = this._onDidChangeHeight.event;
        this._currentIndex = 0;
        this._answers = new Map();
        this._isCollapsed = false;
        this._isSkipped = false;
        this._textInputBoxes = new Map();
        this._singleSelectItems = new Map();
        this._multiSelectCheckboxes = new Map();
        this._freeformTextareas = new Map();
        this._inputBoxes = this._register(new DisposableStore());
        this._questionRenderStore = this._register(new MutableDisposable());
        /**
         * Disposable store for interactive UI components (header, nav buttons, etc.)
         * that should be disposed when transitioning to summary view.
         */
        this._interactiveUIStore = this._register(new MutableDisposable());
        this.domNode = dom.$('.chat-question-carousel-container');
        this.domNode.id = generateUuid();
        this._inChatQuestionCarouselContextKey = ChatContextKeys.inChatQuestionCarousel.bindTo(this._contextKeyService);
        const focusTracker = this._register(dom.trackFocus(this.domNode));
        this._register(focusTracker.onDidFocus(() => this._inChatQuestionCarouselContextKey.set(true)));
        this._register(focusTracker.onDidBlur(() => this._inChatQuestionCarouselContextKey.set(false)));
        this._register({ dispose: () => this._inChatQuestionCarouselContextKey.reset() });
        // Set up accessibility attributes for the carousel container
        this.domNode.tabIndex = 0;
        this.domNode.setAttribute('role', 'region');
        this.domNode.setAttribute('aria-roledescription', localize(7910, null));
        this._updateAriaLabel();
        // Restore draft state from transient runtime fields when available.
        if (carousel instanceof ChatQuestionCarouselData) {
            if (typeof carousel.draftCurrentIndex === 'number') {
                this._currentIndex = Math.max(0, Math.min(carousel.draftCurrentIndex, carousel.questions.length - 1));
            }
            if (typeof carousel.draftCollapsed === 'boolean') {
                this._isCollapsed = carousel.draftCollapsed;
            }
            if (carousel.draftAnswers) {
                for (const [key, value] of Object.entries(carousel.draftAnswers)) {
                    this._answers.set(key, value);
                }
            }
        }
        // Restore submitted answers for summary rendering.
        if (carousel.data) {
            for (const [key, value] of Object.entries(carousel.data)) {
                this._answers.set(key, value);
            }
        }
        // If carousel was already used OR the response is complete, show summary of answers
        // When response is complete, the carousel can no longer be interacted with
        const responseIsComplete = isResponseVM(context.element) && context.element.isComplete;
        if (carousel.isUsed || responseIsComplete) {
            this._isSkipped = true;
            this.domNode.classList.add('chat-question-carousel-used');
            this.renderSummary();
            return;
        }
        // Create disposable store for interactive UI components
        const interactiveStore = new DisposableStore();
        this._interactiveUIStore.value = interactiveStore;
        // Question container
        this._questionContainer = dom.$('.chat-question-carousel-content');
        this.domNode.append(this._questionContainer);
        this._headerActionsContainer = dom.$('.chat-question-header-actions');
        const collapseToggleTitle = localize(7911, null);
        const collapseButton = interactiveStore.add(new Button(this._headerActionsContainer, { ...defaultButtonStyles, secondary: true, supportIcons: true }));
        collapseButton.element.classList.add('chat-question-collapse-toggle');
        collapseButton.element.setAttribute('aria-label', collapseToggleTitle);
        this._collapseButton = collapseButton;
        // Close/skip button (X) - placed in header row, only shown when allowSkip is true
        if (carousel.allowSkip) {
            this._closeButtonContainer = dom.$('.chat-question-close-container');
            const skipAllTitle = localize(7912, null);
            const skipAllButton = interactiveStore.add(new Button(this._closeButtonContainer, { ...defaultButtonStyles, secondary: true, supportIcons: true }));
            skipAllButton.label = `$(${Codicon.close.id})`;
            skipAllButton.element.classList.add('chat-question-close');
            skipAllButton.element.setAttribute('aria-label', skipAllTitle);
            interactiveStore.add(this._hoverService.setupDelayedHover(skipAllButton.element, { content: skipAllTitle }));
            this._skipAllButton = skipAllButton;
        }
        // Register event listeners
        interactiveStore.add(collapseButton.onDidClick(() => this.toggleCollapsed()));
        if (this._skipAllButton) {
            interactiveStore.add(this._skipAllButton.onDidClick(() => this.ignore()));
        }
        // Register keyboard navigation
        interactiveStore.add(dom.addDisposableListener(this.domNode, dom.EventType.KEY_DOWN, (e) => {
            const event = new StandardKeyboardEvent(e);
            if (event.keyCode === 9 /* KeyCode.Escape */ && this.carousel.allowSkip) {
                e.preventDefault();
                e.stopPropagation();
                this.ignore();
            }
            else if (event.keyCode === 3 /* KeyCode.Enter */ && (event.metaKey || event.ctrlKey)) {
                // Cmd/Ctrl+Enter submits immediately from anywhere
                e.preventDefault();
                e.stopPropagation();
                this.submit();
            }
            else if (event.keyCode === 3 /* KeyCode.Enter */ && !event.shiftKey) {
                const target = e.target;
                const isTextInput = target.tagName === 'INPUT' && target.type === 'text';
                const isFreeformTextarea = target.tagName === 'TEXTAREA' && target.classList.contains('chat-question-freeform-textarea');
                if (isTextInput || isFreeformTextarea) {
                    e.preventDefault();
                    e.stopPropagation();
                    this.handleNextOrSubmit();
                }
            }
            else if ((event.ctrlKey || event.metaKey) && (event.keyCode === 1 /* KeyCode.Backspace */ || event.keyCode === 20 /* KeyCode.Delete */)) {
                e.stopPropagation();
            }
        }));
        // Initialize the carousel
        this.renderCurrentQuestion();
    }
    /**
     * Saves the current question's answer to the answers map.
     */
    saveCurrentAnswer() {
        const currentQuestion = this.carousel.questions[this._currentIndex];
        const answer = this.getCurrentAnswer();
        if (answer !== undefined) {
            this._answers.set(currentQuestion.id, answer);
        }
        else {
            this._answers.delete(currentQuestion.id);
        }
        // Validate on change to update the Next button state
        if (currentQuestion?.validation && typeof answer === 'string' && answer !== '') {
            const error = this.getValidationError(answer, currentQuestion.validation);
            if (error) {
                this.showValidationError(error);
            }
            else {
                this.clearValidationError();
            }
        }
        else {
            this.clearValidationError();
        }
        this.updateFooterState();
        this.persistDraftState();
    }
    persistDraftState() {
        if (this.carousel.isUsed || !(this.carousel instanceof ChatQuestionCarouselData)) {
            return;
        }
        this.carousel.draftAnswers = Object.fromEntries(this._answers.entries());
        this.carousel.draftCurrentIndex = this._currentIndex;
        this.carousel.draftCollapsed = this._isCollapsed;
    }
    toggleCollapsed() {
        this._isCollapsed = !this._isCollapsed;
        this.persistDraftState();
        this.updateCollapsedPresentation();
        this._onDidChangeHeight.fire();
    }
    updateCollapsedPresentation() {
        this.domNode.classList.toggle('chat-question-carousel-collapsed', this._isCollapsed);
        if (this._collapseButton) {
            const collapsed = this._isCollapsed;
            const buttonTitle = collapsed
                ? localize(7913, null)
                : localize(7914, null);
            const contentId = this.domNode.id;
            this._collapseButton.label = collapsed ? `$(${Codicon.chevronUp.id})` : `$(${Codicon.chevronDown.id})`;
            this._collapseButton.element.setAttribute('aria-label', buttonTitle);
            this._collapseButton.element.setAttribute('aria-expanded', String(!collapsed));
            this._collapseButton.element.setAttribute('aria-controls', contentId);
            this._collapseButton.setTitle(buttonTitle);
        }
    }
    /**
     * Navigates the carousel by the given delta.
     * @param delta Negative for previous, positive for next
     */
    navigate(delta) {
        const newIndex = this._currentIndex + delta;
        if (newIndex >= 0 && newIndex < this.carousel.questions.length) {
            this.saveCurrentAnswer();
            this._currentIndex = newIndex;
            this.persistDraftState();
            this.renderCurrentQuestion(true);
            this.domNode.focus();
        }
    }
    /**
     * Handles the next/submit behavior for keyboard and option selection flows.
     * Either advances to the next question or submits when on the last question.
     */
    handleNextOrSubmit() {
        this.saveCurrentAnswer();
        if (!this.validateCurrentQuestion()) {
            return;
        }
        if (this._currentIndex < this.carousel.questions.length - 1) {
            // Move to next question
            this._currentIndex++;
            this.persistDraftState();
            this.renderCurrentQuestion(true);
        }
        else {
            // Submit
            if (!this.validateRequiredFields()) {
                return;
            }
            this._options.onSubmit(this._answers);
            this.hideAndShowSummary();
        }
    }
    /**
     * Handles explicit submit action from the dedicated submit button.
     */
    submit() {
        this.saveCurrentAnswer();
        if (!this.validateCurrentQuestion()) {
            return;
        }
        if (!this.validateRequiredFields()) {
            return;
        }
        this._options.onSubmit(this._answers);
        this.hideAndShowSummary();
    }
    /**
     * Focuses the container element and announces the question for screen reader users.
     */
    _focusContainerAndAnnounce() {
        this.domNode.focus();
        const question = this.carousel.questions[this._currentIndex];
        if (question) {
            const questionText = question.message ?? question.title;
            const messageContent = this.getQuestionText(questionText);
            const questionCount = this.carousel.questions.length;
            const alertMessage = questionCount === 1
                ? messageContent
                : localize(7915, null, this._currentIndex + 1, questionCount, messageContent);
            this._accessibilityService.alert(alertMessage);
        }
    }
    /**
     * Hides the carousel UI and shows a summary of answers.
     */
    hideAndShowSummary() {
        this._isSkipped = true;
        this.domNode.classList.add('chat-question-carousel-used');
        // Dispose interactive UI and clear DOM
        this.clearInteractiveResources();
        dom.clearNode(this.domNode);
        // Render summary
        this.renderSummary();
        this._onDidChangeHeight.fire();
    }
    /**
     * Clears and disposes all interactive UI resources (header, nav buttons, input boxes, etc.)
     * and resets references to disposed elements.
     */
    clearInteractiveResources() {
        // Dispose interactive UI disposables (header, nav buttons, etc.)
        this._interactiveUIStore.clear();
        this._questionRenderStore.clear();
        this._inputBoxes.clear();
        this._textInputBoxes.clear();
        this._singleSelectItems.clear();
        this._multiSelectCheckboxes.clear();
        this._freeformTextareas.clear();
        // Clear references to disposed elements
        this._prevButton = undefined;
        this._nextButton = undefined;
        this._submitButton = undefined;
        this._skipAllButton = undefined;
        this._questionContainer = undefined;
        this._headerActionsContainer = undefined;
        this._closeButtonContainer = undefined;
        this._collapseButton = undefined;
        this._footerRow = undefined;
        this._stepIndicator = undefined;
        this._submitHint = undefined;
        this._inputScrollable = undefined;
    }
    layoutInputScrollable(inputScrollable) {
        if (!this._questionContainer) {
            return;
        }
        const scrollableNode = inputScrollable.getDomNode();
        const scrollableContent = scrollableNode.firstElementChild;
        if (!dom.isHTMLElement(scrollableContent)) {
            return;
        }
        // Clear stale size constraints first so this step can shrink after
        // navigating from a taller question.
        if (scrollableNode.style.height !== '' || scrollableNode.style.maxHeight !== '') {
            scrollableNode.style.height = '';
            scrollableNode.style.maxHeight = '';
        }
        if (scrollableContent.style.height !== '' || scrollableContent.style.maxHeight !== '') {
            scrollableContent.style.height = '';
            scrollableContent.style.maxHeight = '';
        }
        // Use the flex-resolved container height (constrained by CSS max-height)
        // instead of window.innerHeight, so the scroll viewport tracks actual chat space.
        const maxContainerHeight = this._questionContainer.clientHeight;
        const computedStyle = dom.getWindow(this._questionContainer).getComputedStyle(this._questionContainer);
        const contentVerticalPadding = Number.parseFloat(computedStyle.paddingTop || '0') +
            Number.parseFloat(computedStyle.paddingBottom || '0');
        const nonScrollableContentHeight = Array.from(this._questionContainer.children)
            .filter(child => child !== scrollableNode)
            .reduce((sum, child) => sum + child.offsetHeight, 0);
        const availableScrollableHeight = Math.floor(maxContainerHeight - contentVerticalPadding - nonScrollableContentHeight);
        const contentScrollableHeight = scrollableContent.scrollHeight;
        const constrainedScrollableHeight = Math.max(0, Math.min(availableScrollableHeight, contentScrollableHeight));
        const constrainedScrollableHeightPx = `${constrainedScrollableHeight}px`;
        // Constrain wrapper + content so no stale flex sizing survives between steps.
        if (scrollableNode.style.height !== constrainedScrollableHeightPx || scrollableNode.style.maxHeight !== constrainedScrollableHeightPx) {
            scrollableNode.style.height = constrainedScrollableHeightPx;
            scrollableNode.style.maxHeight = constrainedScrollableHeightPx;
        }
        // Constrain the content element (DomScrollableElement._element) so that
        // scanDomNode sees clientHeight < scrollHeight and enables scrolling.
        if (scrollableContent.style.height !== constrainedScrollableHeightPx || scrollableContent.style.maxHeight !== constrainedScrollableHeightPx) {
            scrollableContent.style.height = constrainedScrollableHeightPx;
            scrollableContent.style.maxHeight = constrainedScrollableHeightPx;
        }
        inputScrollable.scanDomNode();
    }
    /**
     * Skips the carousel with default values - called when user wants to proceed quickly.
     * Returns defaults for all questions.
     */
    skip() {
        if (this._isSkipped || !this.carousel.allowSkip) {
            return false;
        }
        const defaults = this.getDefaultAnswers();
        this._options.onSubmit(defaults);
        // Reset answers to match submitted defaults for summary display
        this._answers.clear();
        for (const [key, value] of defaults) {
            this._answers.set(key, value);
        }
        this.hideAndShowSummary();
        return true;
    }
    /**
     * Ignores the carousel completely - called when user wants to dismiss without data.
     * Returns undefined to signal the carousel was ignored.
     */
    ignore() {
        if (this._isSkipped || !this.carousel.allowSkip) {
            return false;
        }
        this._isSkipped = true;
        this._options.onSubmit(undefined);
        // Dispose interactive UI and clear DOM
        this.clearInteractiveResources();
        // Hide UI and show skipped message
        this.domNode.classList.add('chat-question-carousel-used');
        dom.clearNode(this.domNode);
        this.renderSkippedMessage();
        this._onDidChangeHeight.fire();
        return true;
    }
    /**
     * Collects default values for all questions in the carousel.
     */
    getDefaultAnswers() {
        const answers = new Map();
        for (const question of this.carousel.questions) {
            const defaultAnswer = this.getDefaultAnswerForQuestion(question);
            if (defaultAnswer !== undefined) {
                answers.set(question.id, defaultAnswer);
            }
        }
        return answers;
    }
    /**
     * Gets the default answer for a specific question.
     */
    getDefaultAnswerForQuestion(question) {
        switch (question.type) {
            case 'text':
                return typeof question.defaultValue === 'string' ? question.defaultValue : undefined;
            case 'singleSelect': {
                const defaultOptionId = typeof question.defaultValue === 'string' ? question.defaultValue : undefined;
                const defaultOption = defaultOptionId !== undefined
                    ? question.options?.find(opt => opt.id === defaultOptionId)
                    : undefined;
                const selectedValue = defaultOption?.value;
                return selectedValue !== undefined ? { selectedValue, freeformValue: undefined } : undefined;
            }
            case 'multiSelect': {
                const defaultIds = Array.isArray(question.defaultValue)
                    ? question.defaultValue
                    : (typeof question.defaultValue === 'string' ? [question.defaultValue] : []);
                const selectedValues = question.options
                    ?.filter(opt => defaultIds.includes(opt.id))
                    .map(opt => opt.value)
                    .filter(v => v !== undefined) ?? [];
                return selectedValues.length > 0 ? { selectedValues, freeformValue: undefined } : undefined;
            }
            default:
                return typeof question.defaultValue === 'string' ? question.defaultValue : Array.isArray(question.defaultValue) ? { selectedValues: question.defaultValue } : undefined;
        }
    }
    /**
     * Returns whether auto-focus should be enabled.
     * Disabled when screen reader mode is active or when explicitly disabled via options.
     */
    _shouldAutoFocus() {
        if (this._options.shouldAutoFocus === false) {
            return false;
        }
        // Disable auto-focus for screen reader users to allow them to read the question first
        return !this._accessibilityService.isScreenReaderOptimized();
    }
    /**
     * Updates the aria-label of the carousel container based on the current question.
     */
    _updateAriaLabel() {
        const question = this.carousel.questions[this._currentIndex];
        if (!question) {
            this.domNode.setAttribute('aria-label', localize(7916, null));
            return;
        }
        const questionText = question.message ?? question.title;
        const messageContent = this.getQuestionText(questionText);
        const questionCount = this.carousel.questions.length;
        if (questionCount === 1) {
            this.domNode.setAttribute('aria-label', localize(7917, null, messageContent));
        }
        else {
            this.domNode.setAttribute('aria-label', localize(7918, null, this._currentIndex + 1, questionCount, messageContent));
        }
    }
    /**
     * Focuses the carousel container element.
     */
    focus() {
        this.domNode.focus();
    }
    /**
     * Returns whether the carousel container has focus.
     */
    hasFocus() {
        return dom.isAncestorOfActiveElement(this.domNode);
    }
    navigateToPreviousQuestion() {
        if (this._currentIndex <= 0) {
            return false;
        }
        this.navigate(-1);
        return true;
    }
    navigateToNextQuestion() {
        if (this._currentIndex >= this.carousel.questions.length - 1) {
            return false;
        }
        this.navigate(1);
        return true;
    }
    renderCurrentQuestion(focusContainerForScreenReader = false) {
        if (!this._questionContainer) {
            return;
        }
        const questionRenderStore = new DisposableStore();
        this._questionRenderStore.value = questionRenderStore;
        this._inputScrollable = undefined;
        // Clear previous input boxes and stale references
        this._inputBoxes.clear();
        this._textInputBoxes.clear();
        this._singleSelectItems.clear();
        this._multiSelectCheckboxes.clear();
        this._freeformTextareas.clear();
        // Clear previous content
        dom.clearNode(this._questionContainer);
        const question = this.carousel.questions[this._currentIndex];
        if (!question) {
            return;
        }
        // Render unified question title (message ?? title)
        const headerRow = dom.$('.chat-question-header-row');
        const titleRow = dom.$('.chat-question-title-row');
        // Render carousel-level message if present (e.g. from MCP elicitation)
        if (this.carousel.message && this._currentIndex === 0) {
            const messageMd = isMarkdownString(this.carousel.message) ? MarkdownString.lift(this.carousel.message) : new MarkdownString(this.carousel.message);
            const carouselMessage = dom.$('.chat-question-carousel-message');
            const renderedMessage = questionRenderStore.add(this._markdownRendererService.render(messageMd));
            carouselMessage.appendChild(renderedMessage.element);
            headerRow.appendChild(carouselMessage);
        }
        const questionText = question.message ?? question.title;
        if (questionText) {
            const title = dom.$('.chat-question-title');
            const messageContent = this.getQuestionText(questionText);
            title.setAttribute('aria-label', messageContent);
            const titleText = question.required
                ? new MarkdownString(`${isMarkdownString(questionText) ? questionText.value : questionText} *`)
                : (isMarkdownString(questionText) ? MarkdownString.lift(questionText) : new MarkdownString(questionText));
            const renderedTitle = questionRenderStore.add(this._markdownRendererService.render(titleText));
            title.appendChild(renderedTitle.element);
            titleRow.appendChild(title);
        }
        headerRow.appendChild(titleRow);
        if (this._headerActionsContainer) {
            dom.clearNode(this._headerActionsContainer);
            if (this._closeButtonContainer) {
                this._headerActionsContainer.appendChild(this._closeButtonContainer);
            }
            if (this._collapseButton) {
                this._headerActionsContainer.appendChild(this._collapseButton.element);
            }
            titleRow.appendChild(this._headerActionsContainer);
        }
        this._questionContainer.appendChild(headerRow);
        // Render description if present
        if (question.description) {
            const descriptionEl = dom.$('.chat-question-description');
            descriptionEl.textContent = question.description;
            this._questionContainer.appendChild(descriptionEl);
        }
        // Render input based on question type
        const inputContainer = dom.$('.chat-question-input-container');
        this.renderInput(inputContainer, question);
        const inputScrollable = questionRenderStore.add(new DomScrollableElement(inputContainer, {
            vertical: 3 /* ScrollbarVisibility.Visible */,
            horizontal: 2 /* ScrollbarVisibility.Hidden */,
            consumeMouseWheelIfScrollbarIsNeeded: true,
        }));
        this._inputScrollable = inputScrollable;
        const inputScrollableNode = inputScrollable.getDomNode();
        inputScrollableNode.classList.add('chat-question-input-scrollable');
        this._questionContainer.appendChild(inputScrollableNode);
        // Validation message element below the scrollable area (not inside it)
        this._validationMessageElement = dom.$('.chat-question-validation-message');
        this._validationMessageElement.style.display = 'none';
        this._questionContainer.appendChild(this._validationMessageElement);
        const isSingleQuestion = this.carousel.questions.length === 1;
        // Render footer before first layout so the scrollable area is measured against
        // its final available height and does not visibly resize twice.
        if (!isSingleQuestion) {
            this.renderFooter();
        }
        else {
            this.renderSingleQuestionFooter();
        }
        let relayoutScheduled = false;
        const relayoutScheduler = questionRenderStore.add(new MutableDisposable());
        const scheduleLayoutInputScrollable = () => {
            if (relayoutScheduled) {
                return;
            }
            relayoutScheduled = true;
            relayoutScheduler.value = dom.runAtThisOrScheduleAtNextAnimationFrame(dom.getWindow(this.domNode), () => {
                relayoutScheduled = false;
                this.layoutInputScrollable(inputScrollable);
            });
        };
        const inputResizeObserver = questionRenderStore.add(new dom.DisposableResizeObserver(() => scheduleLayoutInputScrollable()));
        questionRenderStore.add(inputResizeObserver.observe(inputScrollableNode));
        questionRenderStore.add(inputResizeObserver.observe(inputContainer));
        questionRenderStore.add(dom.addDisposableListener(dom.getWindow(this.domNode), dom.EventType.RESIZE, () => scheduleLayoutInputScrollable()));
        scheduleLayoutInputScrollable();
        questionRenderStore.add(dom.runAtThisOrScheduleAtNextAnimationFrame(dom.getWindow(this.domNode), () => {
            inputContainer.scrollTop = 0;
            inputContainer.scrollLeft = 0;
            inputScrollable.setScrollPosition({ scrollTop: 0, scrollLeft: 0 });
            inputScrollable.scanDomNode();
        }));
        // Update aria-label to reflect the current question
        this._updateAriaLabel();
        this.updateCollapsedPresentation();
        // In screen reader mode, focus the container and announce the question
        // This must happen after all render calls to avoid focus being stolen
        if (focusContainerForScreenReader && this._accessibilityService.isScreenReaderOptimized()) {
            this._focusContainerAndAnnounce();
        }
        this._onDidChangeHeight.fire();
    }
    /**
     * Renders or updates the persistent footer with nav arrows, step indicator, and submit button.
     */
    renderFooter() {
        if (!this._footerRow) {
            const interactiveStore = this._interactiveUIStore.value;
            if (!interactiveStore) {
                return;
            }
            this._footerRow = dom.$('.chat-question-footer-row');
            // Left side: nav arrows + step indicator
            const leftControls = dom.$('.chat-question-footer-left.chat-question-carousel-nav');
            leftControls.setAttribute('role', 'navigation');
            leftControls.setAttribute('aria-label', localize(7919, null));
            const arrowsContainer = dom.$('.chat-question-nav-arrows');
            const previousLabel = this.getLabelWithKeybinding(localize(7920, null), PREVIOUS_QUESTION_ACTION_ID);
            const prevButton = interactiveStore.add(new Button(arrowsContainer, { ...defaultButtonStyles, secondary: true, supportIcons: true }));
            prevButton.element.classList.add('chat-question-nav-arrow', 'chat-question-nav-prev');
            prevButton.label = `$(${Codicon.chevronLeft.id})`;
            prevButton.element.setAttribute('aria-label', previousLabel);
            interactiveStore.add(this._hoverService.setupDelayedHover(prevButton.element, { content: previousLabel }));
            interactiveStore.add(prevButton.onDidClick(() => this.navigate(-1)));
            this._prevButton = prevButton;
            const nextLabel = this.getLabelWithKeybinding(localize(7921, null), NEXT_QUESTION_ACTION_ID);
            const nextButton = interactiveStore.add(new Button(arrowsContainer, { ...defaultButtonStyles, secondary: true, supportIcons: true }));
            nextButton.element.classList.add('chat-question-nav-arrow', 'chat-question-nav-next');
            nextButton.label = `$(${Codicon.chevronRight.id})`;
            nextButton.element.setAttribute('aria-label', nextLabel);
            interactiveStore.add(this._hoverService.setupDelayedHover(nextButton.element, { content: nextLabel }));
            interactiveStore.add(nextButton.onDidClick(() => this.navigate(1)));
            this._nextButton = nextButton;
            leftControls.appendChild(arrowsContainer);
            this._stepIndicator = dom.$('.chat-question-step-indicator');
            leftControls.appendChild(this._stepIndicator);
            this._footerRow.appendChild(leftControls);
            // Right side: hint + submit
            const rightControls = dom.$('.chat-question-footer-right');
            const hint = dom.$('span.chat-question-submit-hint');
            hint.textContent = isMacintosh
                ? localize(7922, null)
                : localize(7923, null);
            rightControls.appendChild(hint);
            this._submitHint = hint;
            const submitButton = interactiveStore.add(new Button(rightControls, { ...defaultButtonStyles }));
            submitButton.element.classList.add('chat-question-submit-button');
            submitButton.label = localize(7924, null);
            interactiveStore.add(submitButton.onDidClick(() => this.submit()));
            this._submitButton = submitButton;
            this._footerRow.appendChild(rightControls);
            this.domNode.append(this._footerRow);
        }
        this.updateFooterState();
    }
    /**
     * Updates the footer nav button enabled state and step indicator text.
     */
    updateFooterState() {
        if (this._prevButton) {
            this._prevButton.enabled = this._currentIndex > 0;
        }
        if (this._nextButton) {
            const canAdvance = this._currentIndex < this.carousel.questions.length - 1;
            const question = this.carousel.questions[this._currentIndex];
            const answer = this._answers.get(question?.id);
            const hasAnswer = answer !== undefined && answer !== '';
            const hasValidationError = !!this._currentValidationError;
            this._nextButton.enabled = canAdvance && (!question?.required || hasAnswer) && !hasValidationError;
        }
        if (this._stepIndicator) {
            this._stepIndicator.textContent = localize(7925, null, this._currentIndex + 1, this.carousel.questions.length);
        }
        if (this._submitButton) {
            const isLastQuestion = this._currentIndex === this.carousel.questions.length - 1;
            this._submitButton.element.style.display = isLastQuestion ? '' : 'none';
            if (this._submitHint) {
                this._submitHint.style.display = isLastQuestion ? '' : 'none';
            }
        }
    }
    /**
     * Renders a simplified footer with just a submit button for single-question multi-select carousels.
     */
    renderSingleQuestionFooter() {
        if (!this._footerRow) {
            const interactiveStore = this._interactiveUIStore.value;
            if (!interactiveStore) {
                return;
            }
            this._footerRow = dom.$('.chat-question-footer-row');
            // Spacer to push controls to the right
            const leftControls = dom.$('.chat-question-footer-left.chat-question-carousel-nav');
            leftControls.setAttribute('role', 'navigation');
            leftControls.setAttribute('aria-label', localize(7926, null));
            this._footerRow.appendChild(leftControls);
            const rightControls = dom.$('.chat-question-footer-right');
            const hint = dom.$('span.chat-question-submit-hint');
            hint.textContent = isMacintosh
                ? localize(7927, null)
                : localize(7928, null);
            rightControls.appendChild(hint);
            this._submitHint = hint;
            const submitButton = interactiveStore.add(new Button(rightControls, { ...defaultButtonStyles }));
            submitButton.element.classList.add('chat-question-submit-button');
            submitButton.label = localize(7929, null);
            interactiveStore.add(submitButton.onDidClick(() => this.submit()));
            this._submitButton = submitButton;
            this._footerRow.appendChild(rightControls);
            this.domNode.append(this._footerRow);
        }
    }
    getLabelWithKeybinding(label, actionId) {
        const keybindingLabel = this._keybindingService.lookupKeybinding(actionId, this._contextKeyService)?.getLabel();
        return keybindingLabel
            ? localize(7930, null, label, keybindingLabel)
            : label;
    }
    renderInput(container, question) {
        switch (question.type) {
            case 'text':
                this.renderTextInput(container, question);
                break;
            case 'singleSelect':
                this.renderSingleSelect(container, question);
                break;
            case 'multiSelect':
                this.renderMultiSelect(container, question);
                break;
        }
    }
    /**
     * Sets up auto-resize behavior for a textarea element.
     * @returns A function that triggers the resize manually (useful for initial sizing).
     */
    setupTextareaAutoResize(textarea) {
        const autoResize = () => {
            textarea.style.height = 'auto';
            textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`;
            if (this._inputScrollable) {
                this.layoutInputScrollable(this._inputScrollable);
            }
            this._onDidChangeHeight.fire();
        };
        this._inputBoxes.add(dom.addDisposableListener(textarea, dom.EventType.INPUT, autoResize));
        return autoResize;
    }
    renderTextInput(container, question) {
        const inputBox = this._inputBoxes.add(new InputBox(container, undefined, {
            placeholder: localize(7931, null),
            inputBoxStyles: defaultInputBoxStyles,
            validationOptions: question.validation ? {
                validation: (value) => {
                    if (!value && !question.required) {
                        return null;
                    }
                    const error = this.getValidationError(value, question.validation);
                    if (error) {
                        return { type: 2 /* MessageType.WARNING */, content: error };
                    }
                    return null;
                }
            } : undefined,
        }));
        this._inputBoxes.add(inputBox.onDidChange(() => {
            this.saveCurrentAnswer();
        }));
        // Restore previous answer if exists
        const previousAnswer = this._answers.get(question.id);
        if (previousAnswer !== undefined) {
            inputBox.value = String(previousAnswer);
        }
        else if (question.defaultValue !== undefined) {
            inputBox.value = String(question.defaultValue);
        }
        this._textInputBoxes.set(question.id, inputBox);
        // Focus on input when rendered using proper DOM scheduling
        if (this._shouldAutoFocus()) {
            this._inputBoxes.add(dom.runAtThisOrScheduleAtNextAnimationFrame(dom.getWindow(inputBox.element), () => inputBox.focus()));
        }
    }
    renderSingleSelect(container, question) {
        const options = question.options || [];
        const selectContainer = dom.$('.chat-question-list');
        selectContainer.setAttribute('role', 'listbox');
        selectContainer.setAttribute('aria-label', question.title);
        selectContainer.tabIndex = 0;
        container.appendChild(selectContainer);
        // Restore previous answer if exists
        const previousAnswer = this._answers.get(question.id);
        const prevSingle = typeof previousAnswer === 'object' && previousAnswer !== null && hasKey(previousAnswer, { selectedValue: true }) ? previousAnswer : undefined;
        const previousFreeform = prevSingle?.freeformValue;
        const previousSelectedValue = prevSingle?.selectedValue;
        // Get default option id (for singleSelect, defaultValue is a single string)
        const defaultOptionId = typeof question.defaultValue === 'string' ? question.defaultValue : undefined;
        // Determine initially selected index
        let selectedIndex = -1;
        options.forEach((option, index) => {
            if (previousSelectedValue !== undefined && option.value === previousSelectedValue) {
                selectedIndex = index;
            }
            else if (selectedIndex === -1 && !previousFreeform && defaultOptionId !== undefined && option.id === defaultOptionId) {
                selectedIndex = index;
            }
        });
        const listItems = [];
        const indicators = [];
        const updateSelection = (newIndex) => {
            // Update visual state
            listItems.forEach((item, i) => {
                const isSelected = i === newIndex;
                item.classList.toggle('selected', isSelected);
                item.setAttribute('aria-selected', String(isSelected));
                const indicator = indicators[i];
                indicator.classList.toggle('codicon', isSelected);
                indicator.classList.toggle('codicon-check', isSelected);
            });
            // Update aria-activedescendant for screen reader announcements
            if (newIndex >= 0 && newIndex < listItems.length) {
                selectContainer.setAttribute('aria-activedescendant', listItems[newIndex].id);
            }
            // Update tracked state
            const data = this._singleSelectItems.get(question.id);
            if (data) {
                data.selectedIndex = newIndex;
            }
            this.saveCurrentAnswer();
        };
        options.forEach((option, index) => {
            const isSelected = index === selectedIndex;
            const listItem = dom.$('.chat-question-list-item');
            listItem.setAttribute('role', 'option');
            listItem.setAttribute('aria-selected', String(isSelected));
            listItem.setAttribute('aria-label', localize(7932, null, index + 1, option.label));
            listItem.id = `option-${question.id}-${index}`;
            listItem.tabIndex = -1;
            const number = dom.$('.chat-question-list-number');
            number.textContent = `${index + 1}`;
            listItem.appendChild(number);
            // Selection indicator (checkmark when selected)
            const indicator = dom.$('.chat-question-list-indicator');
            if (isSelected) {
                indicator.classList.add('codicon', 'codicon-check');
            }
            indicators.push(indicator);
            // Label with optional description (format: "Title - Description")
            const label = dom.$('.chat-question-list-label');
            const separatorIndex = option.label.indexOf(' - ');
            if (separatorIndex !== -1) {
                listItem.classList.add('has-description');
                const titleSpan = dom.$('span.chat-question-list-label-title');
                titleSpan.textContent = option.label.substring(0, separatorIndex);
                label.appendChild(titleSpan);
                const descSpan = dom.$('span.chat-question-list-label-desc');
                descSpan.textContent = option.label.substring(separatorIndex + 3);
                label.appendChild(descSpan);
            }
            else {
                label.textContent = option.label;
            }
            listItem.appendChild(label);
            listItem.appendChild(indicator);
            if (isSelected) {
                listItem.classList.add('selected');
            }
            // if we select an option, clear text and go to next question
            this._inputBoxes.add(dom.addDisposableListener(listItem, dom.EventType.CLICK, (e) => {
                e.preventDefault();
                e.stopPropagation();
                updateSelection(index);
                const freeform = this._freeformTextareas.get(question.id);
                if (freeform) {
                    freeform.value = '';
                }
                this.handleNextOrSubmit();
            }));
            this._inputBoxes.add(this._hoverService.setupDelayedHover(listItem, {
                content: option.label,
                position: { hoverPosition: 2 /* HoverPosition.BELOW */ },
                appearance: { showPointer: true }
            }));
            selectContainer.appendChild(listItem);
            listItems.push(listItem);
        });
        this._singleSelectItems.set(question.id, { items: listItems, selectedIndex });
        // Set initial aria-activedescendant if there's a selected item
        if (selectedIndex >= 0 && selectedIndex < listItems.length) {
            selectContainer.setAttribute('aria-activedescendant', listItems[selectedIndex].id);
        }
        // Show freeform input only when explicitly allowed
        let freeformTextarea;
        if (question.allowFreeformInput !== false) {
            const freeformContainer = dom.$('.chat-question-freeform');
            const freeformNumber = dom.$('.chat-question-freeform-number');
            freeformNumber.textContent = `${options.length + 1}`;
            freeformContainer.appendChild(freeformNumber);
            freeformTextarea = dom.$('textarea.chat-question-freeform-textarea');
            freeformTextarea.placeholder = localize(7933, null);
            freeformTextarea.rows = 1;
            if (previousFreeform !== undefined) {
                freeformTextarea.value = previousFreeform;
            }
            // Setup auto-resize behavior
            const autoResize = this.setupTextareaAutoResize(freeformTextarea);
            // clear when we start typing in freeform
            const capturedFreeform = freeformTextarea;
            this._inputBoxes.add(dom.addDisposableListener(capturedFreeform, dom.EventType.INPUT, () => {
                if (capturedFreeform.value.length > 0) {
                    updateSelection(-1);
                }
                else {
                    this.saveCurrentAnswer();
                }
            }));
            freeformContainer.appendChild(freeformTextarea);
            container.appendChild(freeformContainer);
            this._freeformTextareas.set(question.id, freeformTextarea);
            // Resize textarea if it has restored content
            if (previousFreeform !== undefined) {
                this._inputBoxes.add(dom.runAtThisOrScheduleAtNextAnimationFrame(dom.getWindow(capturedFreeform), () => autoResize()));
            }
        }
        // Keyboard navigation for the list
        this._inputBoxes.add(dom.addDisposableListener(selectContainer, dom.EventType.KEY_DOWN, (e) => {
            const event = new StandardKeyboardEvent(e);
            const data = this._singleSelectItems.get(question.id);
            if (!data || !listItems.length) {
                return;
            }
            let newIndex = data.selectedIndex;
            if (event.keyCode === 18 /* KeyCode.DownArrow */) {
                e.preventDefault();
                newIndex = Math.min(data.selectedIndex + 1, listItems.length - 1);
            }
            else if (event.keyCode === 16 /* KeyCode.UpArrow */) {
                e.preventDefault();
                newIndex = Math.max(data.selectedIndex - 1, 0);
            }
            else if ((event.keyCode === 3 /* KeyCode.Enter */ || event.keyCode === 10 /* KeyCode.Space */) && !event.metaKey && !event.ctrlKey) {
                // Enter confirms current selection and advances to next question
                e.preventDefault();
                e.stopPropagation();
                this.handleNextOrSubmit();
                return;
            }
            else if (event.keyCode >= 22 /* KeyCode.Digit1 */ && event.keyCode <= 30 /* KeyCode.Digit9 */) {
                // Number keys 1-9 select the corresponding option, or focus freeform for next number
                const numberIndex = event.keyCode - 22 /* KeyCode.Digit1 */;
                if (numberIndex < listItems.length) {
                    e.preventDefault();
                    updateSelection(numberIndex);
                }
                else if (freeformTextarea && numberIndex === listItems.length) {
                    e.preventDefault();
                    updateSelection(-1);
                    freeformTextarea.focus();
                }
                return;
            }
            if (newIndex !== data.selectedIndex && newIndex >= 0) {
                updateSelection(newIndex);
            }
        }));
        // focus on the row when first rendered or textarea if it has content
        if (this._shouldAutoFocus()) {
            if (freeformTextarea && previousFreeform) {
                const capturedFreeform = freeformTextarea;
                this._inputBoxes.add(dom.runAtThisOrScheduleAtNextAnimationFrame(dom.getWindow(capturedFreeform), () => {
                    capturedFreeform.focus();
                }));
            }
            else if (listItems.length > 0) {
                const focusIndex = selectedIndex >= 0 ? selectedIndex : 0;
                // if no default and no freeform text, select the first answer
                if (selectedIndex < 0) {
                    updateSelection(0);
                }
                this._inputBoxes.add(dom.runAtThisOrScheduleAtNextAnimationFrame(dom.getWindow(selectContainer), () => {
                    listItems[focusIndex]?.focus();
                }));
            }
        }
    }
    renderMultiSelect(container, question) {
        const options = question.options || [];
        const selectContainer = dom.$('.chat-question-list');
        selectContainer.setAttribute('role', 'listbox');
        selectContainer.setAttribute('aria-multiselectable', 'true');
        selectContainer.setAttribute('aria-label', question.title);
        selectContainer.tabIndex = 0;
        container.appendChild(selectContainer);
        // Restore previous answer if exists
        const previousAnswer = this._answers.get(question.id);
        const prevMulti = typeof previousAnswer === 'object' && previousAnswer !== null && hasKey(previousAnswer, { selectedValues: true }) ? previousAnswer : undefined;
        const previousFreeform = prevMulti?.freeformValue;
        const previousSelectedValues = prevMulti?.selectedValues ?? [];
        // Get default option ids (for multiSelect, defaultValue can be string or string[])
        const defaultOptionIds = Array.isArray(question.defaultValue)
            ? question.defaultValue
            : (typeof question.defaultValue === 'string' ? [question.defaultValue] : []);
        const checkboxes = [];
        const listItems = [];
        let focusedIndex = 0;
        let firstCheckedIndex = -1;
        options.forEach((option, index) => {
            // Determine initial checked state
            let isChecked = false;
            if (previousSelectedValues && previousSelectedValues.length > 0) {
                isChecked = previousSelectedValues.includes(option.value);
            }
            else if (!previousFreeform && defaultOptionIds.includes(option.id)) {
                isChecked = true;
            }
            const listItem = dom.$('.chat-question-list-item.multi-select');
            listItem.setAttribute('role', 'option');
            listItem.setAttribute('aria-selected', String(isChecked));
            listItem.setAttribute('aria-label', localize(7934, null, index + 1, option.label));
            listItem.id = `option-${question.id}-${index}`;
            listItem.tabIndex = -1;
            const number = dom.$('.chat-question-list-number');
            number.textContent = `${index + 1}`;
            listItem.appendChild(number);
            // Create checkbox using the VS Code Checkbox component
            const checkbox = this._inputBoxes.add(new Checkbox(option.label, isChecked, defaultCheckboxStyles));
            checkbox.domNode.classList.add('chat-question-list-checkbox');
            // Remove checkbox from tab order since list items are navigable with arrow keys
            checkbox.domNode.tabIndex = -1;
            listItem.appendChild(checkbox.domNode);
            // Label with optional description (format: "Title - Description")
            const label = dom.$('.chat-question-list-label');
            const separatorIndex = option.label.indexOf(' - ');
            if (separatorIndex !== -1) {
                listItem.classList.add('has-description');
                const titleSpan = dom.$('span.chat-question-list-label-title');
                titleSpan.textContent = option.label.substring(0, separatorIndex);
                label.appendChild(titleSpan);
                const descSpan = dom.$('span.chat-question-list-label-desc');
                descSpan.textContent = option.label.substring(separatorIndex + 3);
                label.appendChild(descSpan);
            }
            else {
                label.textContent = option.label;
            }
            listItem.appendChild(label);
            if (isChecked) {
                listItem.classList.add('checked');
                if (firstCheckedIndex === -1) {
                    firstCheckedIndex = index;
                }
            }
            // Sync checkbox state with list item visual state
            this._inputBoxes.add(checkbox.onChange(() => {
                listItem.classList.toggle('checked', checkbox.checked);
                listItem.setAttribute('aria-selected', String(checkbox.checked));
                this.saveCurrentAnswer();
            }));
            // Click handler for the entire row (toggle checkbox)
            this._inputBoxes.add(dom.addDisposableListener(listItem, dom.EventType.CLICK, (e) => {
                // Update focusedIndex when clicking a row
                focusedIndex = index;
                // Don't toggle if the click was on the checkbox itself (it handles itself)
                if (e.target !== checkbox.domNode && !checkbox.domNode.contains(e.target)) {
                    // Use click() to trigger onChange and sync visual state
                    checkbox.domNode.click();
                }
            }));
            this._inputBoxes.add(this._hoverService.setupDelayedHover(listItem, {
                content: option.label,
                position: { hoverPosition: 2 /* HoverPosition.BELOW */ },
                appearance: { showPointer: true }
            }));
            selectContainer.appendChild(listItem);
            checkboxes.push(checkbox);
            listItems.push(listItem);
        });
        this._multiSelectCheckboxes.set(question.id, checkboxes);
        // Show freeform input only when explicitly allowed
        let freeformTextarea;
        if (question.allowFreeformInput !== false) {
            const freeformContainer = dom.$('.chat-question-freeform');
            // Number indicator for freeform (comes after all options)
            const freeformNumber = dom.$('.chat-question-freeform-number');
            freeformNumber.textContent = `${options.length + 1}`;
            freeformContainer.appendChild(freeformNumber);
            freeformTextarea = dom.$('textarea.chat-question-freeform-textarea');
            freeformTextarea.placeholder = localize(7935, null);
            freeformTextarea.rows = 1;
            if (previousFreeform !== undefined) {
                freeformTextarea.value = previousFreeform;
            }
            // Setup auto-resize behavior
            const autoResize = this.setupTextareaAutoResize(freeformTextarea);
            this._inputBoxes.add(dom.addDisposableListener(freeformTextarea, dom.EventType.INPUT, () => this.saveCurrentAnswer()));
            freeformContainer.appendChild(freeformTextarea);
            container.appendChild(freeformContainer);
            this._freeformTextareas.set(question.id, freeformTextarea);
            // Resize textarea if it has restored content
            if (previousFreeform !== undefined) {
                this._inputBoxes.add(dom.runAtThisOrScheduleAtNextAnimationFrame(dom.getWindow(freeformTextarea), () => autoResize()));
            }
        }
        // Keyboard navigation for the list
        this._inputBoxes.add(dom.addDisposableListener(selectContainer, dom.EventType.KEY_DOWN, (e) => {
            const event = new StandardKeyboardEvent(e);
            // Guard against empty list
            if (!listItems.length) {
                return;
            }
            if (event.keyCode === 18 /* KeyCode.DownArrow */) {
                e.preventDefault();
                focusedIndex = Math.min(focusedIndex + 1, listItems.length - 1);
                listItems[focusedIndex].focus();
            }
            else if (event.keyCode === 16 /* KeyCode.UpArrow */) {
                e.preventDefault();
                focusedIndex = Math.max(focusedIndex - 1, 0);
                listItems[focusedIndex].focus();
            }
            else if (event.keyCode === 3 /* KeyCode.Enter */ && !event.metaKey && !event.ctrlKey) {
                e.preventDefault();
                e.stopPropagation();
                this.handleNextOrSubmit();
            }
            else if (event.keyCode === 10 /* KeyCode.Space */) {
                e.preventDefault();
                // Toggle the currently focused checkbox using click() to trigger onChange
                if (focusedIndex >= 0 && focusedIndex < checkboxes.length) {
                    checkboxes[focusedIndex].domNode.click();
                }
            }
            else if (event.keyCode >= 22 /* KeyCode.Digit1 */ && event.keyCode <= 30 /* KeyCode.Digit9 */) {
                // Number keys 1-9 toggle the corresponding checkbox, or focus freeform for next number
                const numberIndex = event.keyCode - 22 /* KeyCode.Digit1 */;
                if (numberIndex < checkboxes.length) {
                    e.preventDefault();
                    checkboxes[numberIndex].domNode.click();
                }
                else if (freeformTextarea && numberIndex === checkboxes.length) {
                    e.preventDefault();
                    freeformTextarea.focus();
                }
            }
        }));
        // Focus on the appropriate row when rendered or textarea if it has content
        if (this._shouldAutoFocus()) {
            if (freeformTextarea && previousFreeform) {
                const capturedFreeform = freeformTextarea;
                this._inputBoxes.add(dom.runAtThisOrScheduleAtNextAnimationFrame(dom.getWindow(capturedFreeform), () => {
                    capturedFreeform.focus();
                }));
            }
            else if (listItems.length > 0) {
                const initialFocusIndex = firstCheckedIndex >= 0 ? firstCheckedIndex : 0;
                focusedIndex = initialFocusIndex;
                this._inputBoxes.add(dom.runAtThisOrScheduleAtNextAnimationFrame(dom.getWindow(selectContainer), () => {
                    listItems[initialFocusIndex]?.focus();
                }));
            }
        }
    }
    getCurrentAnswer() {
        const question = this.carousel.questions[this._currentIndex];
        if (!question) {
            return undefined;
        }
        switch (question.type) {
            case 'text': {
                const inputBox = this._textInputBoxes.get(question.id);
                return inputBox?.value ?? (typeof question.defaultValue === 'string' ? question.defaultValue : Array.isArray(question.defaultValue) ? { selectedValues: question.defaultValue } : undefined);
            }
            case 'singleSelect': {
                const data = this._singleSelectItems.get(question.id);
                let selectedValue = undefined;
                if (data && data.selectedIndex >= 0) {
                    selectedValue = question.options?.[data.selectedIndex]?.value;
                }
                // Find default option if nothing selected (defaultValue is the option id)
                if (selectedValue === undefined && typeof question.defaultValue === 'string') {
                    const defaultOption = question.options?.find(opt => opt.id === question.defaultValue);
                    selectedValue = defaultOption?.value;
                }
                // For single-select: if freeform is provided, use ONLY freeform (ignore selection)
                const freeformTextarea = this._freeformTextareas.get(question.id);
                const freeformValue = freeformTextarea?.value !== '' ? freeformTextarea?.value : undefined;
                if (freeformValue) {
                    // Freeform takes priority - ignore selectedValue
                    return { selectedValue: undefined, freeformValue };
                }
                if (selectedValue !== undefined) {
                    return { selectedValue, freeformValue: undefined };
                }
                return undefined;
            }
            case 'multiSelect': {
                const checkboxes = this._multiSelectCheckboxes.get(question.id);
                const selectedValues = [];
                if (checkboxes) {
                    checkboxes.forEach((checkbox, index) => {
                        if (checkbox.checked) {
                            const value = question.options?.[index]?.value;
                            if (value !== undefined) {
                                selectedValues.push(value);
                            }
                        }
                    });
                }
                // Always include freeform value for multi-select questions
                const freeformTextarea = this._freeformTextareas.get(question.id);
                const freeformValue = freeformTextarea?.value !== '' ? freeformTextarea?.value : undefined;
                // Return whatever was selected - defaults are applied at render time when
                // checkboxes are initially checked, so empty selection means user unchecked all
                if (freeformValue || selectedValues.length > 0) {
                    return { selectedValues, freeformValue };
                }
                return undefined;
            }
            default:
                return typeof question.defaultValue === 'string' ? question.defaultValue : Array.isArray(question.defaultValue) ? { selectedValues: question.defaultValue } : undefined;
        }
    }
    /**
     * Renders a "Skipped" message when the carousel is dismissed without answers.
     */
    renderSkippedMessage() {
        const skippedContainer = dom.$('.chat-question-carousel-summary');
        const skippedMessage = dom.$('.chat-question-summary-skipped');
        skippedMessage.textContent = localize(7936, null);
        skippedContainer.appendChild(skippedMessage);
        this.domNode.appendChild(skippedContainer);
    }
    /**
     * Renders a summary of answers when the carousel is already used.
     */
    renderSummary() {
        // If no answers, show skipped message
        if (this._answers.size === 0) {
            if (this.carousel.isUsed) {
                this.renderSkippedMessage();
            }
            return;
        }
        const summaryContainer = dom.$('.chat-question-carousel-summary');
        for (const question of this.carousel.questions) {
            const answer = this._answers.get(question.id);
            const summaryItem = dom.$('.chat-question-summary-item');
            const questionRow = dom.$('div.chat-question-summary-label');
            const questionText = question.message ?? question.title;
            let labelText = typeof questionText === 'string' ? questionText : questionText.value;
            labelText = labelText.replace(/[:\s]+$/, '');
            questionRow.textContent = localize(7937, null, labelText);
            summaryItem.appendChild(questionRow);
            if (answer !== undefined) {
                const formattedAnswer = this.formatAnswerForSummary(question, answer);
                const answerRow = dom.$('div.chat-question-summary-answer-title');
                answerRow.textContent = localize(7938, null, formattedAnswer);
                summaryItem.appendChild(answerRow);
            }
            else {
                const unanswered = dom.$('div.chat-question-summary-unanswered');
                unanswered.textContent = localize(7939, null);
                summaryItem.appendChild(unanswered);
            }
            summaryContainer.appendChild(summaryItem);
        }
        this.domNode.appendChild(summaryContainer);
    }
    /**
     * Formats an answer for display in the summary.
     */
    formatAnswerForSummary(question, answer) {
        switch (question.type) {
            case 'text':
                return String(answer);
            case 'singleSelect': {
                if (typeof answer === 'object') {
                    const { selectedValue, freeformValue } = answer;
                    const selectedLabel = selectedValue !== undefined ? question.options?.find(opt => opt.value === selectedValue)?.label : undefined;
                    // For singleSelect, freeform takes priority over selection
                    if (freeformValue) {
                        return freeformValue;
                    }
                    return selectedLabel ?? String(selectedValue ?? '');
                }
                const label = question.options?.find(opt => opt.value === answer)?.label;
                return label ?? String(answer);
            }
            case 'multiSelect': {
                if (typeof answer === 'object' && hasKey(answer, { selectedValues: true })) {
                    const { selectedValues, freeformValue } = answer;
                    const labels = selectedValues
                        .map(v => question.options?.find(opt => opt.value === v)?.label ?? String(v));
                    // For multiSelect, combine selections and freeform with comma separator
                    if (freeformValue) {
                        labels.push(freeformValue);
                    }
                    return labels.join(localize(7940, null));
                }
                return String(answer);
            }
            default:
                return String(answer);
        }
    }
    getQuestionText(questionText) {
        const md = typeof questionText === 'string' ? new MarkdownString(questionText) : questionText;
        return renderAsPlaintext(md);
    }
    /**
     * Validates the current question's answer against its validation rules.
     * Returns true if valid, false if validation errors were shown.
     */
    validateCurrentQuestion() {
        const question = this.carousel.questions[this._currentIndex];
        if (!question) {
            return true;
        }
        const answer = this._answers.get(question.id);
        // Check required
        if (question.required && (answer === undefined || answer === '')) {
            this.showValidationError(localize(7941, null));
            return false;
        }
        // Validate text inputs
        if (question.type === 'text' && question.validation && typeof answer === 'string' && answer !== '') {
            const error = this.getValidationError(answer, question.validation);
            if (error) {
                this.showValidationError(error);
                return false;
            }
        }
        this.clearValidationError();
        return true;
    }
    /**
     * Validates that all required questions have been answered.
     * Returns true if all required fields are satisfied.
     */
    validateRequiredFields() {
        for (let i = 0; i < this.carousel.questions.length; i++) {
            const question = this.carousel.questions[i];
            if (!question.required) {
                continue;
            }
            const answer = this._answers.get(question.id);
            if (answer === undefined || answer === '') {
                // Navigate to the unanswered required question
                this.saveCurrentAnswer();
                this._currentIndex = i;
                this.persistDraftState();
                this.renderCurrentQuestion(true);
                this.showValidationError(localize(7942, null));
                return false;
            }
        }
        return true;
    }
    /**
     * Returns a validation error message for the given value, or undefined if valid.
     */
    getValidationError(value, validation) {
        if (validation.minLength !== undefined && value.length < validation.minLength) {
            return localize(7943, null, validation.minLength);
        }
        if (validation.maxLength !== undefined && value.length > validation.maxLength) {
            return localize(7944, null, validation.maxLength);
        }
        if (validation.format) {
            switch (validation.format) {
                case 'email':
                    if (!value.includes('@')) {
                        return localize(7945, null);
                    }
                    break;
                case 'uri':
                    if (!URL.canParse(value)) {
                        return localize(7946, null);
                    }
                    break;
                case 'date': {
                    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
                    if (!dateRegex.test(value) || isNaN(new Date(value).getTime())) {
                        return localize(7947, null);
                    }
                    break;
                }
                case 'date-time':
                    if (isNaN(new Date(value).getTime())) {
                        return localize(7948, null);
                    }
                    break;
            }
        }
        if (validation.isInteger !== undefined || validation.minimum !== undefined || validation.maximum !== undefined) {
            const num = Number(value);
            if (isNaN(num)) {
                return localize(7949, null);
            }
            if (validation.isInteger && !Number.isInteger(num)) {
                return localize(7950, null);
            }
            if (validation.minimum !== undefined && num < validation.minimum) {
                return localize(7951, null, validation.minimum);
            }
            if (validation.maximum !== undefined && num > validation.maximum) {
                return localize(7952, null, validation.maximum);
            }
        }
        return undefined;
    }
    showValidationError(message) {
        this._currentValidationError = message;
        if (this._validationMessageElement) {
            this._validationMessageElement.textContent = message;
            this._validationMessageElement.style.display = '';
        }
    }
    clearValidationError() {
        this._currentValidationError = undefined;
        if (this._validationMessageElement) {
            this._validationMessageElement.textContent = '';
            this._validationMessageElement.style.display = 'none';
        }
    }
    hasSameContent(other, _followingContent, element) {
        // does not have same content when it is not skipped and is active and we stop the response
        if (!this._isSkipped && !this.carousel.isUsed && isResponseVM(element) && element.isComplete) {
            return false;
        }
        return other.kind === 'questionCarousel' && other === this.carousel;
    }
    addDisposable(disposable) {
        this._register(disposable);
    }
    dispose() {
        if (!this._isSkipped && !this.carousel.isUsed) {
            this.saveCurrentAnswer();
        }
        super.dispose();
    }
};
ChatQuestionCarouselPart = __decorate([
    __param(3, IMarkdownRendererService),
    __param(4, IHoverService),
    __param(5, IAccessibilityService),
    __param(6, IContextKeyService),
    __param(7, IKeybindingService)
], ChatQuestionCarouselPart);
export { ChatQuestionCarouselPart };
//# sourceMappingURL=chatQuestionCarouselPart.js.map