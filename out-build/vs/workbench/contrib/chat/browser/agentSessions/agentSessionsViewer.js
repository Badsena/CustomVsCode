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
var AgentSessionRenderer_1, AgentSessionSectionRenderer_1;
import './media/agentsessionsviewer.css';
import { h } from '../../../../../base/browser/dom.js';
import { localize } from '../../../../../nls.js';
import { NotSelectableGroupId } from '../../../../../base/browser/ui/list/list.js';
import { Disposable, DisposableStore, MutableDisposable } from '../../../../../base/common/lifecycle.js';
import { getAgentChangesSummary, hasValidDiff, isAgentSession, isAgentSessionSection, isAgentSessionsModel, isSessionInProgressStatus } from './agentSessionsModel.js';
import { IconLabel } from '../../../../../base/browser/ui/iconLabel/iconLabel.js';
import { ThemeIcon } from '../../../../../base/common/themables.js';
import { Codicon } from '../../../../../base/common/codicons.js';
import { fromNow, getDurationString } from '../../../../../base/common/date.js';
import { createMatches } from '../../../../../base/common/filters.js';
import { IMarkdownRendererService } from '../../../../../platform/markdown/browser/markdownRenderer.js';
import { allowedChatMarkdownHtmlTags } from '../widget/chatContentMarkdownRenderer.js';
import { IProductService } from '../../../../../platform/product/common/productService.js';
import { coalesce } from '../../../../../base/common/arrays.js';
import { IInstantiationService } from '../../../../../platform/instantiation/common/instantiation.js';
import { fillEditorsDragData } from '../../../../browser/dnd.js';
import { IHoverService } from '../../../../../platform/hover/browser/hover.js';
import { IntervalTimer } from '../../../../../base/common/async.js';
import { MenuWorkbenchToolBar } from '../../../../../platform/actions/browser/toolbar.js';
import { MenuId } from '../../../../../platform/actions/common/actions.js';
import { IContextKeyService } from '../../../../../platform/contextkey/common/contextkey.js';
import { ChatContextKeys } from '../../common/actions/chatContextKeys.js';
import { ServiceCollection } from '../../../../../platform/instantiation/common/serviceCollection.js';
import { Emitter } from '../../../../../base/common/event.js';
import { renderAsPlaintext } from '../../../../../base/browser/markdownRenderer.js';
import { MarkdownString } from '../../../../../base/common/htmlContent.js';
import { AgentSessionHoverWidget } from './agentSessionHoverWidget.js';
import { AgentSessionProviders } from './agentSessions.js';
import { AgentSessionsGrouping } from './agentSessionsFilter.js';
import { autorun } from '../../../../../base/common/observable.js';
import { Button } from '../../../../../base/browser/ui/button/button.js';
import { defaultButtonStyles } from '../../../../../platform/theme/browser/defaultStyles.js';
import { BugIndicatingError } from '../../../../../base/common/errors.js';
let AgentSessionRenderer = class AgentSessionRenderer extends Disposable {
    static { AgentSessionRenderer_1 = this; }
    static { this.TEMPLATE_ID = 'agent-session'; }
    static { this.APPROVAL_ROW_MAX_LINES = 3; }
    static { this._APPROVAL_ROW_LINE_HEIGHT = 18; }
    static { this._APPROVAL_ROW_OVERHEAD = 14; } // 4px margin-top + 4px padding-top + 4px padding-bottom + 2px border
    static getApprovalRowHeight(label) {
        const lineCount = Math.min(label.split(/\r?\n/).length, AgentSessionRenderer_1.APPROVAL_ROW_MAX_LINES);
        return lineCount * AgentSessionRenderer_1._APPROVAL_ROW_LINE_HEIGHT + AgentSessionRenderer_1._APPROVAL_ROW_OVERHEAD;
    }
    constructor(options, _approvalModel, _activeSessionResource, markdownRendererService, productService, hoverService, instantiationService, contextKeyService) {
        super();
        this.options = options;
        this._approvalModel = _approvalModel;
        this._activeSessionResource = _activeSessionResource;
        this.markdownRendererService = markdownRendererService;
        this.productService = productService;
        this.hoverService = hoverService;
        this.instantiationService = instantiationService;
        this.contextKeyService = contextKeyService;
        this.templateId = AgentSessionRenderer_1.TEMPLATE_ID;
        this.sessionHover = this._register(new MutableDisposable());
        this._onDidChangeItemHeight = this._register(new Emitter());
        this.onDidChangeItemHeight = this._onDidChangeItemHeight.event;
    }
    renderTemplate(container) {
        const disposables = new DisposableStore();
        const elementDisposable = disposables.add(new DisposableStore());
        const elements = h('div.agent-session-item@item', [
            h('div.agent-session-icon-col', [
                h('div.agent-session-icon@icon')
            ]),
            h('div.agent-session-main-col', [
                h('div.agent-session-title-row', [
                    h('div.agent-session-title@title'),
                    h('div.agent-session-title-toolbar@titleToolbar'),
                ]),
                h('div.agent-session-details-row', [
                    h('div.agent-session-badge@badge'),
                    h('span.agent-session-separator@separator'),
                    h('div.agent-session-diff-container@diffContainer', [
                        h('span.agent-session-diff-added@addedSpan'),
                        h('span.agent-session-diff-removed@removedSpan')
                    ]),
                    h('div.agent-session-description@description'),
                    h('div.agent-session-status@statusContainer', [
                        h('span.agent-session-status-time@statusTime'),
                    ]),
                ]),
                h('div.agent-session-approval-row@approvalRow', [
                    h('span.agent-session-approval-label@approvalLabel'),
                    h('div.agent-session-approval-button@approvalButtonContainer'),
                ])
            ])
        ]);
        const contextKeyService = disposables.add(this.contextKeyService.createScoped(elements.item));
        const scopedInstantiationService = disposables.add(this.instantiationService.createChild(new ServiceCollection([IContextKeyService, contextKeyService])));
        const titleToolbar = disposables.add(scopedInstantiationService.createInstance(MenuWorkbenchToolBar, elements.titleToolbar, MenuId.AgentSessionItemToolbar, {
            menuOptions: { shouldForwardArgs: true },
        }));
        container.appendChild(elements.item);
        return {
            element: elements.item,
            icon: elements.icon,
            title: disposables.add(new IconLabel(elements.title, { supportHighlights: true, supportIcons: true })),
            titleToolbar,
            badge: elements.badge,
            separator: elements.separator,
            diffContainer: elements.diffContainer,
            diffAddedSpan: elements.addedSpan,
            diffRemovedSpan: elements.removedSpan,
            description: elements.description,
            statusContainer: elements.statusContainer,
            statusTime: elements.statusTime,
            approvalRow: elements.approvalRow,
            approvalLabel: elements.approvalLabel,
            approvalButtonContainer: elements.approvalButtonContainer,
            contextKeyService,
            elementDisposable,
            disposables
        };
    }
    renderElement(session, index, template, details) {
        // Clear old state
        template.elementDisposable.clear();
        template.diffAddedSpan.textContent = '';
        template.diffRemovedSpan.textContent = '';
        template.badge.textContent = '';
        template.description.textContent = '';
        // Archived
        template.element.classList.toggle('archived', session.element.isArchived());
        // Icon
        template.icon.className = `agent-session-icon ${ThemeIcon.asClassName(this.getIcon(session.element))}${session.element.status === 3 /* AgentSessionStatus.NeedsInput */ ? ' needs-input' : ''}`;
        // Title
        const markdownTitle = new MarkdownString(session.element.label);
        template.title.setLabel(renderAsPlaintext(markdownTitle), undefined, { matches: createMatches(session.filterData) });
        // Title Actions - Update context keys
        ChatContextKeys.isArchivedAgentSession.bindTo(template.contextKeyService).set(session.element.isArchived());
        ChatContextKeys.isPinnedAgentSession.bindTo(template.contextKeyService).set(session.element.isPinned());
        ChatContextKeys.isReadAgentSession.bindTo(template.contextKeyService).set(session.element.isRead());
        ChatContextKeys.agentSessionType.bindTo(template.contextKeyService).set(session.element.providerType);
        template.titleToolbar.context = session.element;
        // Badge
        const hasBadge = this.renderBadge(session, template);
        // Diff information
        let hasDiff = false;
        const { changes: diff } = session.element;
        if (!isSessionInProgressStatus(session.element.status) && diff && hasValidDiff(diff)) {
            if (this.renderDiff(session, template)) {
                hasDiff = true;
            }
        }
        let hasAgentSessionChanges = false;
        if (session.element.providerType === AgentSessionProviders.Background ||
            session.element.providerType === AgentSessionProviders.Cloud) {
            // Background and Cloud agents provide the list of changes directly,
            // so we have to use the list of changes to determine whether to show
            // the "View All Changes" action
            hasAgentSessionChanges = Array.isArray(diff) && diff.length > 0;
        }
        else {
            hasAgentSessionChanges = hasDiff;
        }
        ChatContextKeys.hasAgentSessionChanges.bindTo(template.contextKeyService).set(hasAgentSessionChanges);
        // Description
        const hasDescription = this.renderDescription(session, template);
        // Status
        const hasStatus = this.renderStatus(session, template);
        // When in progress with a description, only show description in the details row
        const hideDetails = hasDescription && isSessionInProgressStatus(session.element.status);
        template.badge.classList.toggle('has-badge', hasBadge && !hideDetails);
        template.diffContainer.classList.toggle('has-diff', hasDiff && !hideDetails);
        template.statusContainer.classList.toggle('hidden', hideDetails);
        template.separator.classList.toggle('has-separator', !hideDetails && hasBadge && hasDiff);
        template.description.classList.toggle('has-separator', hasDescription && !hideDetails && (hasBadge || hasDiff));
        template.statusContainer.classList.toggle('has-separator', !hideDetails && hasStatus && (hasBadge || hasDiff || hasDescription));
        // Hover
        this.renderHover(session, template);
        // Approval row
        if (this._approvalModel) {
            this.renderApprovalRow(session, template);
        }
    }
    renderBadge(session, template) {
        const badge = session.element.badge;
        if (!badge) {
            return false;
        }
        // When grouped by repository, hide the badge only if the name it shows
        // matches the section header (i.e. the repository name for this session).
        // Badges with a different name (e.g. worktree name) are still shown.
        // Archived sessions always keep their badge since they are grouped under
        // the "Archived" section, not a repository section.
        if (this.options.isGroupedByRepository?.() && !session.element.isArchived()) {
            const raw = typeof badge === 'string' ? badge : badge.value;
            const match = raw.match(/^\$\((?:repo|folder|worktree)\)\s*(.+)/);
            if (match) {
                const badgeName = match[1].trim();
                const repoName = getRepositoryName(session.element);
                if (badgeName === repoName) {
                    return false;
                }
            }
        }
        const normalisedBadge = this.stripCodicons(badge);
        const badgeValue = typeof normalisedBadge === 'string' ? normalisedBadge : normalisedBadge.value;
        if (!badgeValue) {
            return false;
        }
        this.renderMarkdownOrText(normalisedBadge, template.badge, template.elementDisposable);
        return true;
    }
    stripCodicons(content) {
        const raw = typeof content === 'string' ? content : content.value;
        const stripped = raw.replace(/\$\([a-z0-9\-]+\)\s*/gi, '').trim();
        if (typeof content === 'string') {
            return stripped;
        }
        return MarkdownString.lift({ ...content, value: stripped });
    }
    renderMarkdownOrText(content, container, disposables) {
        if (typeof content === 'string') {
            container.textContent = content;
        }
        else {
            disposables.add(this.markdownRendererService.render(content, {
                sanitizerConfig: {
                    replaceWithPlaintext: true,
                    allowedTags: {
                        override: allowedChatMarkdownHtmlTags,
                    },
                    allowedLinkSchemes: { augment: [this.productService.urlProtocol] }
                },
            }, container));
        }
    }
    renderDiff(session, template) {
        const diff = getAgentChangesSummary(session.element.changes);
        if (!diff) {
            return false;
        }
        if (diff.insertions === 0 && diff.deletions === 0) {
            return false;
        }
        if (diff.insertions >= 0 /* render even `0` for more homogeneity */) {
            template.diffAddedSpan.textContent = `+${diff.insertions}`;
        }
        if (diff.deletions >= 0 /* render even `0` for more homogeneity */) {
            template.diffRemovedSpan.textContent = `-${diff.deletions}`;
        }
        return true;
    }
    getIcon(session) {
        if (session.status === 2 /* AgentSessionStatus.InProgress */) {
            return Codicon.sessionInProgress;
        }
        if (session.status === 3 /* AgentSessionStatus.NeedsInput */) {
            return Codicon.circleFilled;
        }
        if (session.status === 0 /* AgentSessionStatus.Failed */) {
            return Codicon.error;
        }
        if (!session.isRead() && !session.isArchived()) {
            return Codicon.circleFilled;
        }
        if (session.providerType === AgentSessionProviders.Local) {
            return Codicon.circleSmallFilled;
        }
        return session.icon;
    }
    renderDescription(session, template) {
        const description = session.element.description;
        if (description) {
            this.renderMarkdownOrText(description, template.description, template.elementDisposable);
            return true;
        }
        // Fallback to state label
        if (session.element.status === 2 /* AgentSessionStatus.InProgress */) {
            template.description.textContent = localize(6250, null);
            return true;
        }
        else if (session.element.status === 3 /* AgentSessionStatus.NeedsInput */) {
            template.description.textContent = localize(6251, null);
            return true;
        }
        else if (session.element.status === 0 /* AgentSessionStatus.Failed */) {
            template.description.textContent = localize(6252, null);
            return true;
        }
        template.description.textContent = '';
        return false;
    }
    toDuration(startTime, endTime, useFullTimeWords, disallowNow) {
        const elapsed = Math.max(Math.round((endTime - startTime) / 1000) * 1000, 1000 /* clamp to 1s */);
        if (!disallowNow && elapsed < 60000) {
            return localize(6253, null);
        }
        return getDurationString(elapsed, useFullTimeWords);
    }
    renderStatus(session, template) {
        const getTimeLabel = (session) => {
            let timeLabel;
            if (session.status === 2 /* AgentSessionStatus.InProgress */ && session.timing.lastRequestStarted) {
                timeLabel = this.toDuration(session.timing.lastRequestStarted, Date.now(), false, false);
            }
            if (!timeLabel) {
                const date = session.timing.created;
                const seconds = Math.round((new Date().getTime() - date) / 1000);
                if (seconds < 60) {
                    timeLabel = localize(6254, null);
                }
                else {
                    timeLabel = sessionDateFromNow(date, true);
                }
            }
            return timeLabel;
        };
        // Time label
        template.statusTime.textContent = getTimeLabel(session.element);
        const timer = template.elementDisposable.add(new IntervalTimer());
        timer.cancelAndSet(() => template.statusTime.textContent = getTimeLabel(session.element), session.element.status === 2 /* AgentSessionStatus.InProgress */ ? 1000 /* every second */ : 60 * 1000 /* every minute */);
        return true;
    }
    renderHover(session, template) {
        if (this.options.disableHover) {
            return;
        }
        if (!isSessionInProgressStatus(session.element.status) && session.element.isRead()) {
            return; // the hover is complex and large, for now limit it to in-progress sessions only
        }
        const reducedDelay = session.element.status === 3 /* AgentSessionStatus.NeedsInput */;
        template.elementDisposable.add(this.hoverService.setupDelayedHover(template.element, () => this.buildHoverContent(session.element), { groupId: 'agent.sessions', reducedDelay }));
    }
    buildHoverContent(session) {
        if (this.sessionHover.value?.session.resource.toString() !== session.resource.toString()) {
            // note: hover service use mouseover which triggers again if the mouse moves
            // within the element. Only recreate the hover widget if the session changed.
            this.sessionHover.value = this.instantiationService.createInstance(AgentSessionHoverWidget, session);
        }
        const widget = this.sessionHover.value;
        return {
            id: `agent.session.hover.${session.resource.toString()}`,
            content: widget.domNode,
            style: 1 /* HoverStyle.Pointer */,
            onDidShow: () => widget.onRendered(),
            position: {
                hoverPosition: this.options.getHoverPosition()
            }
        };
    }
    renderApprovalRow(session, template) {
        if (this._approvalModel === undefined) {
            throw new BugIndicatingError('Approval model is required to render approval row');
        }
        const approvalModel = this._approvalModel;
        // Initialize from current model state to avoid unnecessary height changes on first render
        const initialInfo = approvalModel.getApproval(session.element.resource).get();
        let wasVisible = !!initialInfo;
        template.approvalRow.classList.toggle('visible', wasVisible);
        const buttonStore = template.elementDisposable.add(new DisposableStore());
        template.elementDisposable.add(autorun(reader => {
            buttonStore.clear();
            const info = approvalModel.getApproval(session.element.resource).read(reader);
            const visible = !!info;
            template.approvalRow.classList.toggle('visible', visible);
            if (info) {
                // Render up to 3 lines, each as a separate code block so CSS can truncate per-line
                const lines = info.label.split('\n');
                const maxLines = AgentSessionRenderer_1.APPROVAL_ROW_MAX_LINES;
                const visibleLines = lines.slice(0, maxLines);
                if (lines.length > maxLines) {
                    visibleLines[maxLines - 1] = `${visibleLines[maxLines - 1]} \u2026`;
                }
                const langId = info.languageId ?? 'json';
                const labelContent = new MarkdownString();
                for (const line of visibleLines) {
                    labelContent.appendCodeblock(langId, line);
                }
                this.renderMarkdownOrText(labelContent, template.approvalLabel, buttonStore);
                // Hover with full content as a code block
                const fullContent = new MarkdownString().appendCodeblock(info.languageId ?? 'json', info.label);
                buttonStore.add(this.hoverService.setupDelayedHover(template.approvalLabel, {
                    content: fullContent,
                    style: 1 /* HoverStyle.Pointer */,
                    position: { hoverPosition: 2 /* HoverPosition.BELOW */ },
                }));
                template.approvalButtonContainer.textContent = '';
                const isActive = this._activeSessionResource.read(reader)?.toString() === session.element.resource.toString();
                const button = buttonStore.add(new Button(template.approvalButtonContainer, {
                    title: localize(6255, null),
                    secondary: isActive,
                    ...defaultButtonStyles
                }));
                button.label = localize(6256, null);
                buttonStore.add(button.onDidClick(() => info.confirm()));
            }
            if (wasVisible !== visible) {
                wasVisible = visible;
                this._onDidChangeItemHeight.fire(session.element);
            }
        }));
    }
    renderCompressedElements(node, index, templateData, details) {
        throw new Error('Should never happen since session is incompressible');
    }
    disposeElement(element, index, template, details) {
        template.elementDisposable.clear();
    }
    disposeTemplate(templateData) {
        templateData.disposables.dispose();
    }
};
AgentSessionRenderer = AgentSessionRenderer_1 = __decorate([
    __param(3, IMarkdownRendererService),
    __param(4, IProductService),
    __param(5, IHoverService),
    __param(6, IInstantiationService),
    __param(7, IContextKeyService)
], AgentSessionRenderer);
export { AgentSessionRenderer };
export function toStatusLabel(status) {
    let statusLabel;
    switch (status) {
        case 3 /* AgentSessionStatus.NeedsInput */:
            statusLabel = localize(6257, null);
            break;
        case 2 /* AgentSessionStatus.InProgress */:
            statusLabel = localize(6258, null);
            break;
        case 0 /* AgentSessionStatus.Failed */:
            statusLabel = localize(6259, null);
            break;
        default:
            statusLabel = localize(6260, null);
    }
    return statusLabel;
}
let AgentSessionSectionRenderer = class AgentSessionSectionRenderer {
    static { AgentSessionSectionRenderer_1 = this; }
    static { this.TEMPLATE_ID = 'agent-session-section'; }
    constructor(instantiationService, contextKeyService) {
        this.instantiationService = instantiationService;
        this.contextKeyService = contextKeyService;
        this.templateId = AgentSessionSectionRenderer_1.TEMPLATE_ID;
    }
    renderTemplate(container) {
        const disposables = new DisposableStore();
        const elements = h('div.agent-session-section@container', [
            h('span.agent-session-section-label@label'),
            h('div.agent-session-section-toolbar@toolbar')
        ]);
        const contextKeyService = disposables.add(this.contextKeyService.createScoped(elements.container));
        const scopedInstantiationService = disposables.add(this.instantiationService.createChild(new ServiceCollection([IContextKeyService, contextKeyService])));
        const toolbar = disposables.add(scopedInstantiationService.createInstance(MenuWorkbenchToolBar, elements.toolbar, MenuId.AgentSessionSectionToolbar, {
            menuOptions: { shouldForwardArgs: true },
        }));
        container.appendChild(elements.container);
        return {
            container: elements.container,
            label: elements.label,
            toolbar,
            contextKeyService,
            disposables
        };
    }
    renderElement(element, index, template, details) {
        // Label
        template.label.textContent = element.element.label;
        // Toolbar
        ChatContextKeys.agentSessionSection.bindTo(template.contextKeyService).set(element.element.section);
        template.toolbar.context = element.element;
    }
    renderCompressedElements(node, index, templateData, details) {
        throw new Error('Should never happen since section header is incompressible');
    }
    disposeElement(element, index, template, details) {
        // noop
    }
    disposeTemplate(templateData) {
        templateData.disposables.dispose();
    }
};
AgentSessionSectionRenderer = AgentSessionSectionRenderer_1 = __decorate([
    __param(0, IInstantiationService),
    __param(1, IContextKeyService)
], AgentSessionSectionRenderer);
export { AgentSessionSectionRenderer };
//#endregion
export class AgentSessionsListDelegate {
    static { this.ITEM_HEIGHT = 54; }
    static { this.SECTION_HEIGHT = 26; }
    constructor(_approvalModel) {
        this._approvalModel = _approvalModel;
    }
    getHeight(element) {
        if (isAgentSessionSection(element)) {
            return AgentSessionsListDelegate.SECTION_HEIGHT;
        }
        let height = AgentSessionsListDelegate.ITEM_HEIGHT;
        const approval = this._approvalModel?.getApproval(element.resource).get();
        if (approval) {
            height += AgentSessionRenderer.getApprovalRowHeight(approval.label);
        }
        return height;
    }
    hasDynamicHeight(element) {
        return !!this._approvalModel && isAgentSession(element);
    }
    getTemplateId(element) {
        if (isAgentSessionSection(element)) {
            return AgentSessionSectionRenderer.TEMPLATE_ID;
        }
        return AgentSessionRenderer.TEMPLATE_ID;
    }
}
export class AgentSessionsAccessibilityProvider {
    getWidgetRole() {
        return 'list';
    }
    getRole(element) {
        return 'listitem';
    }
    getWidgetAriaLabel() {
        return localize(6261, null);
    }
    getAriaLabel(element) {
        if (isAgentSessionSection(element)) {
            return localize(6262, null, element.label);
        }
        return localize(6263, null, element.providerLabel, element.label, toStatusLabel(element.status), new Date(element.timing.created).toLocaleString());
    }
}
export class AgentSessionsDataSource extends Disposable {
    static { this.CAPPED_SESSIONS_LIMIT = 3; }
    constructor(filter, sorter, logService) {
        super();
        this.filter = filter;
        this.sorter = sorter;
        this.logService = logService;
        this._onDidGetChildren = this._register(new Emitter());
        this.onDidGetChildren = this._onDidGetChildren.event;
    }
    hasChildren(element) {
        // Sessions model
        if (isAgentSessionsModel(element)) {
            return true;
        }
        // Sessions	section
        else if (isAgentSessionSection(element)) {
            return element.sessions.length > 0;
        }
        // Session element
        else {
            return false;
        }
    }
    getChildren(element) {
        // Sessions model
        if (isAgentSessionsModel(element)) {
            // Apply filter if configured
            let filteredSessions = element.sessions.filter(session => !this.filter?.exclude(session));
            // Apply sorter unless we group into sections or we are to limit results
            const limitResultsCount = this.filter?.limitResults?.();
            if (!this.filter?.groupResults?.() || typeof limitResultsCount === 'number') {
                filteredSessions.sort(this.sorter.compare.bind(this.sorter));
            }
            // Apply limiter if configured (requires sorting)
            if (typeof limitResultsCount === 'number') {
                filteredSessions = filteredSessions.slice(0, limitResultsCount);
            }
            // Callback results count
            this.filter?.notifyResults?.(filteredSessions.length);
            this._onDidGetChildren.fire(filteredSessions.length);
            // Group sessions into sections if enabled
            if (this.filter?.groupResults?.()) {
                return this.groupSessionsIntoSections(filteredSessions);
            }
            // Otherwise return flat sorted list
            return filteredSessions;
        }
        // Sessions	section
        else if (isAgentSessionSection(element)) {
            return element.sessions;
        }
        // Session element
        else {
            return [];
        }
    }
    groupSessionsIntoSections(sessions) {
        const isCapped = this.filter?.groupResults?.() === AgentSessionsGrouping.Capped;
        const sorter = this.sorter;
        const sortedSessions = sorter instanceof AgentSessionsSorter
            ? sessions.sort((a, b) => sorter.compare(a, b, isCapped /* special sorting for when results are capped to keep active ones top */))
            : sessions.sort(sorter.compare.bind(sorter));
        if (isCapped) {
            if (this.filter?.getExcludes().read) {
                return sortedSessions; // When filtering to show only unread sessions, show a flat list
            }
            return this.groupSessionsCapped(sortedSessions);
        }
        else if (this.filter?.groupResults?.() === AgentSessionsGrouping.Repository) {
            return this.groupSessionsByRepository(sortedSessions);
        }
        else {
            return this.groupSessionsByDate(sortedSessions);
        }
    }
    groupSessionsCapped(sortedSessions) {
        const result = [];
        const firstArchivedIndex = sortedSessions.findIndex(session => session.isArchived());
        const nonArchivedCount = firstArchivedIndex === -1 ? sortedSessions.length : firstArchivedIndex;
        const nonArchivedSessions = sortedSessions.slice(0, nonArchivedCount);
        const archivedSessions = sortedSessions.slice(nonArchivedCount);
        // All pinned sessions are always visible
        const pinnedSessions = nonArchivedSessions.filter(session => session.isPinned());
        const unpinnedSessions = nonArchivedSessions.filter(session => !session.isPinned());
        // Take up to N non-pinned sessions from the sorted order (preserves NeedsInput prioritization)
        const topUnpinned = unpinnedSessions.slice(0, AgentSessionsDataSource.CAPPED_SESSIONS_LIMIT);
        const remainingUnpinned = unpinnedSessions.slice(AgentSessionsDataSource.CAPPED_SESSIONS_LIMIT);
        // Add pinned first, then top N non-pinned
        result.push(...pinnedSessions, ...topUnpinned);
        // Add "More" section for the rest (remaining unpinned + archived)
        const othersSessions = [...remainingUnpinned, ...archivedSessions];
        if (othersSessions.length > 0) {
            result.push({
                section: "more" /* AgentSessionSection.More */,
                label: AgentSessionSectionLabels["more" /* AgentSessionSection.More */],
                sessions: othersSessions
            });
        }
        return result;
    }
    groupSessionsByDate(sortedSessions) {
        const result = [];
        const groupedSessions = groupAgentSessionsByDate(sortedSessions);
        for (const { sessions, section, label } of groupedSessions.values()) {
            if (sessions.length === 0) {
                continue;
            }
            result.push({ section, label, sessions });
        }
        return result;
    }
    groupSessionsByRepository(sortedSessions) {
        const repoMap = new Map();
        const pinnedSessions = [];
        const archivedSessions = [];
        const unknownKey = '\x00unknown';
        const unknownLabel = localize(6264, null);
        for (const session of sortedSessions) {
            if (session.isArchived()) {
                archivedSessions.push(session);
                continue;
            }
            if (session.isPinned()) {
                pinnedSessions.push(session);
                continue;
            }
            const repoName = this.getRepositoryName(session);
            if (!repoName) {
                this.logService?.warn('[AgentSessions] Could not determine repository name for session, categorizing as "Other"', JSON.stringify(session));
            }
            const repoId = repoName || unknownKey;
            const repoLabel = repoName || unknownLabel;
            let group = repoMap.get(repoId);
            if (!group) {
                group = { label: repoLabel, sessions: [] };
                repoMap.set(repoId, group);
            }
            group.sessions.push(session);
        }
        const result = [];
        if (pinnedSessions.length > 0) {
            result.push({
                section: "pinned" /* AgentSessionSection.Pinned */,
                label: AgentSessionSectionLabels["pinned" /* AgentSessionSection.Pinned */],
                sessions: pinnedSessions,
            });
        }
        for (const [, { label, sessions }] of repoMap) {
            result.push({
                section: "repository" /* AgentSessionSection.Repository */,
                label,
                sessions,
            });
        }
        if (archivedSessions.length > 0) {
            result.push({
                section: "archived" /* AgentSessionSection.Archived */,
                label: AgentSessionSectionLabels["archived" /* AgentSessionSection.Archived */],
                sessions: archivedSessions,
            });
        }
        return result;
    }
    getRepositoryName(session) {
        return getRepositoryName(session);
    }
}
/**
 * Extracts the repository name for an agent session from its metadata or badge.
 * Used for grouping sessions by repository and for determining whether a badge
 * is redundant with the section header.
 */
export function getRepositoryName(session) {
    const metadata = session.metadata;
    if (metadata) {
        // Cloud sessions: metadata.owner + metadata.name
        const owner = metadata.owner;
        const name = metadata.name;
        if (owner && name) {
            return name;
        }
        // repositoryNwo: "owner/repo"
        const nwo = metadata.repositoryNwo;
        if (nwo && nwo.includes('/')) {
            return nwo.split('/').pop();
        }
        // repository: could be "owner/repo", a URL, or git@host:owner/repo.git
        const repository = metadata.repository;
        if (repository) {
            const repoName = parseRepositoryName(repository);
            if (repoName) {
                return repoName;
            }
        }
        // repositoryUrl: "https://github.com/owner/repo"
        const repositoryUrl = metadata.repositoryUrl;
        if (repositoryUrl) {
            const repoName = parseRepositoryName(repositoryUrl);
            if (repoName) {
                return repoName;
            }
        }
        // repositoryPath: extract repo name from the directory path basename
        const repositoryPath = metadata.repositoryPath;
        if (repositoryPath) {
            const repoName = extractRepoNameFromPath(repositoryPath);
            if (repoName) {
                return repoName;
            }
        }
        // worktreePath: extract repo name from the worktree path
        const worktreePath = metadata.worktreePath;
        if (worktreePath) {
            const repoName = extractRepoNameFromPath(worktreePath);
            if (repoName) {
                return repoName;
            }
        }
        // workingDirectoryPath: fallback to extract name from the working directory
        const workingDirectoryPath = metadata.workingDirectoryPath;
        if (workingDirectoryPath) {
            const repoName = extractRepoNameFromPath(workingDirectoryPath);
            if (repoName) {
                return repoName;
            }
        }
    }
    // Fallback: extract repo/folder name from badge
    const badge = session.badge;
    if (badge) {
        const raw = typeof badge === 'string' ? badge : badge.value;
        const badgeMatch = raw.match(/\$\((?:repo|folder|worktree)\)\s*(.+)/);
        if (badgeMatch) {
            return badgeMatch[1].trim();
        }
    }
    return undefined;
}
/**
 * Parses a repository name from various formats: "owner/repo", URLs,
 * and git@host:owner/repo.git style references.
 */
function parseRepositoryName(value) {
    // Direct "owner/repo" style (no scheme, no git@ prefix)
    if (value.includes('/') && !value.includes('://') && !value.startsWith('git@')) {
        let repoSegment = value.split('/').filter(Boolean).pop();
        if (repoSegment?.endsWith('.git')) {
            repoSegment = repoSegment.slice(0, -4);
        }
        return repoSegment || undefined;
    }
    // Standard URL formats (https://..., ssh://..., etc.)
    try {
        const url = new URL(value);
        const parts = url.pathname.split('/').filter(Boolean);
        if (parts.length >= 2) {
            let repoSegment = parts[1];
            if (repoSegment.endsWith('.git')) {
                repoSegment = repoSegment.slice(0, -4);
            }
            return repoSegment || undefined;
        }
    }
    catch {
        // not a standard URL
    }
    // git@host:owner/repo(.git) style URLs
    if (value.startsWith('git@')) {
        const colonIndex = value.indexOf(':');
        if (colonIndex !== -1 && colonIndex < value.length - 1) {
            const pathPart = value.substring(colonIndex + 1);
            let repoSegment = pathPart.split('/').filter(Boolean).pop();
            if (repoSegment?.endsWith('.git')) {
                repoSegment = repoSegment.slice(0, -4);
            }
            return repoSegment || undefined;
        }
    }
    return undefined;
}
/**
 * Extracts the repository name from a filesystem path, handling git worktree
 * conventions where paths follow `<repo>.worktrees/<worktree-name>`.
 */
function extractRepoNameFromPath(dirPath) {
    const segments = dirPath.split(/[/\\]/).filter(Boolean);
    if (segments.length < 2) {
        return segments[0];
    }
    const parent = segments[segments.length - 2];
    if (parent.endsWith('.worktrees')) {
        return parent.slice(0, -'.worktrees'.length) || undefined;
    }
    return segments[segments.length - 1];
}
export const AgentSessionSectionLabels = {
    ["pinned" /* AgentSessionSection.Pinned */]: localize(6265, null),
    ["today" /* AgentSessionSection.Today */]: localize(6266, null),
    ["yesterday" /* AgentSessionSection.Yesterday */]: localize(6267, null),
    ["week" /* AgentSessionSection.Week */]: localize(6268, null),
    ["older" /* AgentSessionSection.Older */]: localize(6269, null),
    ["archived" /* AgentSessionSection.Archived */]: localize(6270, null),
    ["more" /* AgentSessionSection.More */]: localize(6271, null),
};
const DAY_THRESHOLD = 24 * 60 * 60 * 1000;
const WEEK_THRESHOLD = 7 * DAY_THRESHOLD;
export function groupAgentSessionsByDate(sessions) {
    const now = Date.now();
    const startOfToday = new Date(now).setHours(0, 0, 0, 0);
    const startOfYesterday = startOfToday - DAY_THRESHOLD;
    const weekThreshold = now - WEEK_THRESHOLD;
    const pinnedSessions = [];
    const todaySessions = [];
    const yesterdaySessions = [];
    const weekSessions = [];
    const olderSessions = [];
    const archivedSessions = [];
    for (const session of sessions) {
        if (session.isArchived()) {
            archivedSessions.push(session);
        }
        else if (session.isPinned()) {
            pinnedSessions.push(session);
        }
        else {
            const sessionTime = session.timing.created;
            if (sessionTime >= startOfToday) {
                todaySessions.push(session);
            }
            else if (sessionTime >= startOfYesterday) {
                yesterdaySessions.push(session);
            }
            else if (sessionTime >= weekThreshold) {
                weekSessions.push(session);
            }
            else {
                olderSessions.push(session);
            }
        }
    }
    return new Map([
        ["pinned" /* AgentSessionSection.Pinned */, { section: "pinned" /* AgentSessionSection.Pinned */, label: AgentSessionSectionLabels["pinned" /* AgentSessionSection.Pinned */], sessions: pinnedSessions }],
        ["today" /* AgentSessionSection.Today */, { section: "today" /* AgentSessionSection.Today */, label: AgentSessionSectionLabels["today" /* AgentSessionSection.Today */], sessions: todaySessions }],
        ["yesterday" /* AgentSessionSection.Yesterday */, { section: "yesterday" /* AgentSessionSection.Yesterday */, label: AgentSessionSectionLabels["yesterday" /* AgentSessionSection.Yesterday */], sessions: yesterdaySessions }],
        ["week" /* AgentSessionSection.Week */, { section: "week" /* AgentSessionSection.Week */, label: AgentSessionSectionLabels["week" /* AgentSessionSection.Week */], sessions: weekSessions }],
        ["older" /* AgentSessionSection.Older */, { section: "older" /* AgentSessionSection.Older */, label: AgentSessionSectionLabels["older" /* AgentSessionSection.Older */], sessions: olderSessions }],
        ["archived" /* AgentSessionSection.Archived */, { section: "archived" /* AgentSessionSection.Archived */, label: AgentSessionSectionLabels["archived" /* AgentSessionSection.Archived */], sessions: archivedSessions }],
    ]);
}
export function sessionDateFromNow(sessionTime, appendAgoLabel) {
    const now = Date.now();
    const startOfToday = new Date(now).setHours(0, 0, 0, 0);
    const startOfYesterday = startOfToday - DAY_THRESHOLD;
    const startOfTwoDaysAgo = startOfYesterday - DAY_THRESHOLD;
    // our grouping by date uses absolute start times for "Today"
    // and "Yesterday" while `fromNow` only works with full 24h
    // and 48h ranges for these. To prevent a label like "1 day ago"
    // to show under the "Last 7 Days" section, we do a bit of
    // normalization logic.
    if (sessionTime < startOfToday && sessionTime >= startOfYesterday) {
        return appendAgoLabel
            ? localize(6272, null)
            : localize(6273, null);
    }
    if (sessionTime < startOfYesterday && sessionTime >= startOfTwoDaysAgo) {
        return appendAgoLabel
            ? localize(6274, null)
            : localize(6275, null);
    }
    return fromNow(sessionTime, appendAgoLabel);
}
export class AgentSessionsIdentityProvider {
    getId(element) {
        if (isAgentSessionSection(element)) {
            return `section-${element.section}-${element.label}`;
        }
        if (isAgentSession(element)) {
            return element.resource.toString();
        }
        return 'agent-sessions-id';
    }
    getGroupId(element) {
        if (isAgentSessionSection(element) || isAgentSessionsModel(element)) {
            return NotSelectableGroupId;
        }
        return 1;
    }
}
export class AgentSessionsCompressionDelegate {
    isIncompressible(element) {
        return true;
    }
}
export class AgentSessionsSorter {
    compare(sessionA, sessionB, prioritizeActiveSessions = false) {
        // Special sorting if enabled
        if (prioritizeActiveSessions) {
            const aNeedsInput = sessionA.status === 3 /* AgentSessionStatus.NeedsInput */;
            const bNeedsInput = sessionB.status === 3 /* AgentSessionStatus.NeedsInput */;
            if (aNeedsInput && !bNeedsInput) {
                return -1; // a (needs input) comes before b (other)
            }
            if (!aNeedsInput && bNeedsInput) {
                return 1; // a (other) comes after b (needs input)
            }
        }
        // Archived
        const aArchived = sessionA.isArchived();
        const bArchived = sessionB.isArchived();
        if (!aArchived && bArchived) {
            return -1; // a (non-archived) comes before b (archived)
        }
        if (aArchived && !bArchived) {
            return 1; // a (archived) comes after b (non-archived)
        }
        // Pinned (non-archived pinned sessions come before non-pinned)
        const aPinned = !aArchived && sessionA.isPinned();
        const bPinned = !bArchived && sessionB.isPinned();
        if (aPinned && !bPinned) {
            return -1;
        }
        if (!aPinned && bPinned) {
            return 1;
        }
        // Sort by time
        const timeA = prioritizeActiveSessions ? sessionA.timing.lastRequestStarted ?? sessionA.timing.created : sessionA.timing.created;
        const timeB = prioritizeActiveSessions ? sessionB.timing.lastRequestStarted ?? sessionB.timing.created : sessionB.timing.created;
        return timeB - timeA;
    }
}
export class AgentSessionsKeyboardNavigationLabelProvider {
    getKeyboardNavigationLabel(element) {
        if (isAgentSessionSection(element)) {
            return element.label;
        }
        return element.label;
    }
    getCompressedNodeKeyboardNavigationLabel(elements) {
        return undefined; // not enabled
    }
}
let AgentSessionsDragAndDrop = class AgentSessionsDragAndDrop extends Disposable {
    constructor(instantiationService) {
        super();
        this.instantiationService = instantiationService;
    }
    onDragStart(data, originalEvent) {
        const elements = data.getData().filter(e => isAgentSession(e));
        const uris = coalesce(elements.map(e => e.resource));
        this.instantiationService.invokeFunction(accessor => fillEditorsDragData(accessor, uris, originalEvent));
    }
    getDragURI(element) {
        if (isAgentSessionSection(element)) {
            return null; // section headers are not draggable
        }
        return element.resource.toString();
    }
    getDragLabel(elements, originalEvent) {
        const sessions = elements.filter(e => isAgentSession(e));
        if (sessions.length === 1) {
            return sessions[0].label;
        }
        return localize(6276, null, sessions.length);
    }
    onDragOver(data, targetElement, targetIndex, targetSector, originalEvent) {
        return false;
    }
    drop(data, targetElement, targetIndex, targetSector, originalEvent) { }
};
AgentSessionsDragAndDrop = __decorate([
    __param(0, IInstantiationService)
], AgentSessionsDragAndDrop);
export { AgentSessionsDragAndDrop };
//# sourceMappingURL=agentSessionsViewer.js.map