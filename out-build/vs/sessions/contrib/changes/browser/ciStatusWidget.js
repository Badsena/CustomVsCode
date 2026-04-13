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
var CIStatusWidget_1;
import './media/ciStatusWidget.css';
import * as dom from '../../../../base/browser/dom.js';
import { renderIcon } from '../../../../base/browser/ui/iconLabel/iconLabels.js';
import { Action } from '../../../../base/common/actions.js';
import { Codicon } from '../../../../base/common/codicons.js';
import { Emitter } from '../../../../base/common/event.js';
import { Disposable, DisposableStore } from '../../../../base/common/lifecycle.js';
import { autorun } from '../../../../base/common/observable.js';
import { ThemeIcon } from '../../../../base/common/themables.js';
import { URI } from '../../../../base/common/uri.js';
import { localize } from '../../../../nls.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { WorkbenchList } from '../../../../platform/list/browser/listService.js';
import { IOpenerService } from '../../../../platform/opener/common/opener.js';
import { ChatViewPaneTarget, IChatWidgetService } from '../../../../workbench/contrib/chat/browser/chat.js';
import { DEFAULT_LABELS_CONTAINER, ResourceLabels } from '../../../../workbench/browser/labels.js';
import { ActionBar } from '../../../../base/browser/ui/actionbar/actionbar.js';
const $ = dom.$;
var CICheckGroup;
(function (CICheckGroup) {
    CICheckGroup[CICheckGroup["Running"] = 0] = "Running";
    CICheckGroup[CICheckGroup["Pending"] = 1] = "Pending";
    CICheckGroup[CICheckGroup["Failed"] = 2] = "Failed";
    CICheckGroup[CICheckGroup["Successful"] = 3] = "Successful";
})(CICheckGroup || (CICheckGroup = {}));
class CICheckListDelegate {
    static { this.ITEM_HEIGHT = 24; }
    getHeight(_element) {
        return CICheckListDelegate.ITEM_HEIGHT;
    }
    getTemplateId(_element) {
        return CICheckListRenderer.TEMPLATE_ID;
    }
}
class CICheckListRenderer {
    static { this.TEMPLATE_ID = 'ciCheck'; }
    constructor(_labels, _openerService) {
        this._labels = _labels;
        this._openerService = _openerService;
        this.templateId = CICheckListRenderer.TEMPLATE_ID;
    }
    renderTemplate(container) {
        const templateDisposables = new DisposableStore();
        const row = dom.append(container, $('.ci-status-widget-check'));
        const labelContainer = dom.append(row, $('.ci-status-widget-check-label'));
        const label = templateDisposables.add(this._labels.create(labelContainer, { supportIcons: true }));
        const actionBarContainer = dom.append(row, $('.ci-status-widget-check-actions'));
        const actionBar = templateDisposables.add(new ActionBar(actionBarContainer));
        return {
            row,
            label,
            actionBar,
            templateDisposables,
            elementDisposables: templateDisposables.add(new DisposableStore()),
        };
    }
    renderElement(element, _index, templateData) {
        templateData.elementDisposables.clear();
        templateData.actionBar.clear();
        templateData.row.className = `ci-status-widget-check ${getCheckStatusClass(element.check)}`;
        const title = localize(3099, null, element.check.name, getCheckStateLabel(element.check));
        templateData.label.setResource({
            name: element.check.name,
            resource: URI.from({ scheme: 'github-check', path: `/${element.check.id}/${element.check.name}` }),
        }, {
            icon: getCheckIcon(element.check),
            title,
        });
        const actions = [];
        if (element.check.detailsUrl) {
            actions.push(templateData.elementDisposables.add(new Action('ci.openOnGitHub', localize(3100, null), ThemeIcon.asClassName(Codicon.linkExternal), true, async () => {
                await this._openerService.open(URI.parse(element.check.detailsUrl));
            })));
        }
        templateData.actionBar.push(actions, { icon: true, label: false });
    }
    disposeElement(_element, _index, templateData) {
        templateData.elementDisposables.clear();
        templateData.actionBar.clear();
    }
    disposeTemplate(templateData) {
        templateData.templateDisposables.dispose();
    }
}
/**
 * A collapsible widget that shows the CI status of a PR.
 * Rendered beneath the changes tree in the changes view.
 */
let CIStatusWidget = class CIStatusWidget extends Disposable {
    static { CIStatusWidget_1 = this; }
    static { this.HEADER_HEIGHT = 30; }
    static { this.MIN_BODY_HEIGHT = 72; } // at least 3 checks (3 * 24)
    static { this.MAX_BODY_HEIGHT = 240; } // at most 10 checks (10 * 24)
    get element() {
        return this._domNode;
    }
    /** The full content height the widget would like (header + all checks). */
    get desiredHeight() {
        if (this._checkCount === 0) {
            return 0;
        }
        if (this._collapsed) {
            return CIStatusWidget_1.HEADER_HEIGHT;
        }
        return CIStatusWidget_1.HEADER_HEIGHT + this._checkCount * CICheckListDelegate.ITEM_HEIGHT;
    }
    /** Whether the widget is currently visible (has checks to show). */
    get visible() {
        return this._checkCount > 0;
    }
    constructor(container, _openerService, _chatWidgetService, _instantiationService) {
        super();
        this._openerService = _openerService;
        this._chatWidgetService = _chatWidgetService;
        this._instantiationService = _instantiationService;
        this._headerActionDisposables = this._register(new DisposableStore());
        this._onDidChangeHeight = this._register(new Emitter());
        this.onDidChangeHeight = this._onDidChangeHeight.event;
        this._collapsed = true;
        this._checkCount = 0;
        this._labels = this._register(this._instantiationService.createInstance(ResourceLabels, DEFAULT_LABELS_CONTAINER));
        this._domNode = dom.append(container, $('.ci-status-widget'));
        this._domNode.style.display = 'none';
        // Header (always visible)
        this._headerNode = dom.append(this._domNode, $('.ci-status-widget-header'));
        this._titleNode = dom.append(this._headerNode, $('.ci-status-widget-title'));
        this._titleLabel = this._register(this._labels.create(this._titleNode, { supportIcons: true }));
        this._headerActionBarContainer = dom.append(this._headerNode, $('.ci-status-widget-header-actions'));
        this._headerActionBar = this._register(new ActionBar(this._headerActionBarContainer));
        this._headerActionBarContainer.style.display = 'none';
        this._register(dom.addDisposableListener(this._headerActionBarContainer, dom.EventType.CLICK, e => {
            e.preventDefault();
            e.stopPropagation();
        }));
        this._twistieNode = dom.append(this._headerNode, $('.ci-status-widget-twistie'));
        this._updateTwistie();
        this._register(dom.addDisposableListener(this._headerNode, 'click', () => this._toggle()));
        // Body (collapsible list of checks)
        this._bodyNode = dom.append(this._domNode, $('.ci-status-widget-body'));
        this._bodyNode.style.display = 'none';
        const listContainer = $('.ci-status-widget-list');
        this._list = this._register(this._instantiationService.createInstance((WorkbenchList), 'CIStatusWidget', listContainer, new CICheckListDelegate(), [new CICheckListRenderer(this._labels, this._openerService)], {
            multipleSelectionSupport: false,
            openOnSingleClick: false,
            accessibilityProvider: {
                getWidgetAriaLabel: () => localize(3101, null),
                getAriaLabel: item => localize(3102, null, item.check.name, getCheckStateLabel(item.check)),
            },
            keyboardNavigationLabelProvider: {
                getKeyboardNavigationLabel: item => item.check.name,
            },
        }));
        this._bodyNode.appendChild(this._list.getHTMLElement());
    }
    /**
     * Bind to a CI model. When `ciModel` is undefined, the widget hides.
     * Returns a disposable that stops observation.
     */
    bind(ciModel, sessionResource) {
        return autorun(reader => {
            const model = ciModel.read(reader);
            this._sessionResource = sessionResource.read(reader);
            this._model = model;
            if (!model) {
                this._checkCount = 0;
                this._renderBody([]);
                this._renderHeaderActions([]);
                this._domNode.style.display = 'none';
                this._onDidChangeHeight.fire();
                return;
            }
            const checks = model.checks.read(reader);
            const overallStatus = model.overallStatus.read(reader);
            if (checks.length === 0) {
                this._checkCount = 0;
                this._renderBody([]);
                this._renderHeaderActions([]);
                this._domNode.style.display = 'none';
                this._onDidChangeHeight.fire();
                return;
            }
            const sorted = sortChecks(checks);
            const oldCount = this._checkCount;
            this._checkCount = sorted.length;
            this._domNode.style.display = '';
            this._renderHeader(checks, overallStatus);
            this._renderHeaderActions(getFailedChecks(checks));
            this._renderBody(sorted);
            if (this._checkCount !== oldCount) {
                this._onDidChangeHeight.fire();
            }
        });
    }
    _toggle() {
        this._collapsed = !this._collapsed;
        this._bodyNode.style.display = this._collapsed ? 'none' : '';
        this._updateTwistie();
        this._onDidChangeHeight.fire();
    }
    _updateTwistie() {
        dom.clearNode(this._twistieNode);
        this._twistieNode.appendChild(renderIcon(this._collapsed ? Codicon.chevronRight : Codicon.chevronDown));
    }
    _renderHeader(checks, overallStatus) {
        const { icon, className } = getHeaderIconAndClass(checks, overallStatus);
        this._titleNode.className = `ci-status-widget-title ${className}`;
        const summary = getChecksSummary(checks);
        const title = localize(3103, null, summary);
        this._titleLabel.setResource({
            name: title,
            resource: URI.from({ scheme: 'github-checks', path: '/summary' }),
        }, {
            icon: icon,
            title,
        });
    }
    _renderHeaderActions(failedChecks) {
        this._headerActionDisposables.clear();
        this._headerActionBar.clear();
        if (failedChecks.length === 0) {
            this._headerActionBarContainer.style.display = 'none';
            return;
        }
        const fixChecksAction = this._headerActionDisposables.add(new Action('ci.fixChecks', localize(3104, null), ThemeIcon.asClassName(Codicon.lightbulbAutofix), true, async () => {
            await this._sendFixChecksPrompt(failedChecks);
        }));
        this._headerActionBar.push([fixChecksAction], { icon: true, label: false });
        this._headerActionBarContainer.style.display = 'flex';
    }
    /**
     * Layout the widget body list to the given height.
     * Called by the parent view after computing available space.
     */
    layout(maxBodyHeight) {
        if (this._collapsed || this._checkCount === 0) {
            return;
        }
        const contentHeight = this._checkCount * CICheckListDelegate.ITEM_HEIGHT;
        const bodyHeight = Math.min(contentHeight, maxBodyHeight);
        this._list.getHTMLElement().style.height = `${bodyHeight}px`;
        this._list.layout(bodyHeight);
    }
    _renderBody(checks) {
        const contentHeight = checks.length * CICheckListDelegate.ITEM_HEIGHT;
        const bodyHeight = Math.min(contentHeight, CIStatusWidget_1.MAX_BODY_HEIGHT);
        this._list.getHTMLElement().style.height = `${bodyHeight}px`;
        this._list.layout(bodyHeight);
        this._list.splice(0, this._list.length, checks);
    }
    async _sendFixChecksPrompt(failedChecks) {
        const model = this._model;
        const sessionResource = this._sessionResource;
        if (!model || !sessionResource || failedChecks.length === 0) {
            return;
        }
        const failedCheckDetails = await Promise.all(failedChecks.map(async (check) => {
            const annotations = await model.getCheckRunAnnotations(check.id);
            return {
                check,
                annotations,
            };
        }));
        const prompt = buildFixChecksPrompt(failedCheckDetails);
        const chatWidget = this._chatWidgetService.getWidgetBySessionResource(sessionResource)
            ?? await this._chatWidgetService.openSession(sessionResource, ChatViewPaneTarget);
        if (!chatWidget) {
            return;
        }
        await chatWidget.acceptInput(prompt, { noCommandDetection: true });
    }
};
CIStatusWidget = CIStatusWidget_1 = __decorate([
    __param(1, IOpenerService),
    __param(2, IChatWidgetService),
    __param(3, IInstantiationService)
], CIStatusWidget);
export { CIStatusWidget };
function sortChecks(checks) {
    return [...checks]
        .sort(compareChecks)
        .map(check => ({ check, group: getCheckGroup(check) }));
}
function compareChecks(a, b) {
    const groupDiff = getCheckGroup(a) - getCheckGroup(b);
    if (groupDiff !== 0) {
        return groupDiff;
    }
    return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
}
function getCheckGroup(check) {
    switch (check.status) {
        case "in_progress" /* GitHubCheckStatus.InProgress */:
            return 0 /* CICheckGroup.Running */;
        case "queued" /* GitHubCheckStatus.Queued */:
            return 1 /* CICheckGroup.Pending */;
        case "completed" /* GitHubCheckStatus.Completed */:
            return isFailedConclusion(check.conclusion) ? 2 /* CICheckGroup.Failed */ : 3 /* CICheckGroup.Successful */;
    }
}
function getCheckCounts(checks) {
    let running = 0;
    let pending = 0;
    let failed = 0;
    let successful = 0;
    for (const check of checks) {
        switch (getCheckGroup(check)) {
            case 0 /* CICheckGroup.Running */:
                running++;
                break;
            case 1 /* CICheckGroup.Pending */:
                pending++;
                break;
            case 2 /* CICheckGroup.Failed */:
                failed++;
                break;
            case 3 /* CICheckGroup.Successful */:
                successful++;
                break;
        }
    }
    return { running, pending, failed, successful };
}
function getFailedChecks(checks) {
    return checks.filter(check => getCheckGroup(check) === 2 /* CICheckGroup.Failed */);
}
function getChecksSummary(checks) {
    const counts = getCheckCounts(checks);
    const parts = [];
    if (counts.running > 0) {
        parts.push(counts.running === 1
            ? localize(3105, null)
            : localize(3106, null, counts.running));
    }
    if (counts.pending > 0) {
        parts.push(counts.pending === 1
            ? localize(3107, null)
            : localize(3108, null, counts.pending));
    }
    if (counts.failed > 0) {
        parts.push(counts.failed === 1
            ? localize(3109, null)
            : localize(3110, null, counts.failed));
    }
    if (counts.successful > 0) {
        parts.push(counts.successful === 1
            ? localize(3111, null)
            : localize(3112, null, counts.successful));
    }
    return parts.join(', ');
}
function buildFixChecksPrompt(failedChecks) {
    const sections = failedChecks.map(({ check, annotations }) => {
        const parts = [
            `Check: ${check.name}`,
            `Status: ${getCheckStateLabel(check)}`,
            `Conclusion: ${check.conclusion ?? 'unknown'}`,
        ];
        if (check.detailsUrl) {
            parts.push(`Details: ${check.detailsUrl}`);
        }
        parts.push('', 'Annotations and output:', annotations || 'No output available for this check run.');
        return parts.join('\n');
    });
    return [
        'Please fix the failed CI checks for this session immediately.',
        'Use the failed check information below, including annotations and check output, to identify the root causes and make the necessary code changes.',
        'Focus on resolving these CI failures. Avoid unrelated changes unless they are required to fix the checks.',
        '',
        'Failed CI checks:',
        '',
        sections.join('\n\n---\n\n'),
    ].join('\n');
}
function getHeaderIconAndClass(checks, overallStatus) {
    const counts = getCheckCounts(checks);
    if (counts.running > 0) {
        return { icon: Codicon.clock, className: 'ci-status-running' };
    }
    switch (overallStatus) {
        case "success" /* GitHubCIOverallStatus.Success */:
            return { icon: Codicon.passFilled, className: 'ci-status-success' };
        case "failure" /* GitHubCIOverallStatus.Failure */:
            return { icon: Codicon.error, className: 'ci-status-failure' };
        case "pending" /* GitHubCIOverallStatus.Pending */:
            return { icon: Codicon.circleFilled, className: 'ci-status-pending' };
        default:
            return { icon: Codicon.circleFilled, className: 'ci-status-neutral' };
    }
}
function getCheckIcon(check) {
    switch (check.status) {
        case "in_progress" /* GitHubCheckStatus.InProgress */:
            return Codicon.clock;
        case "queued" /* GitHubCheckStatus.Queued */:
            return Codicon.circleFilled;
        case "completed" /* GitHubCheckStatus.Completed */:
            switch (check.conclusion) {
                case "success" /* GitHubCheckConclusion.Success */:
                    return Codicon.passFilled;
                case "failure" /* GitHubCheckConclusion.Failure */:
                case "timed_out" /* GitHubCheckConclusion.TimedOut */:
                case "action_required" /* GitHubCheckConclusion.ActionRequired */:
                    return Codicon.error;
                case "cancelled" /* GitHubCheckConclusion.Cancelled */:
                    return Codicon.circleSlash;
                case "skipped" /* GitHubCheckConclusion.Skipped */:
                    return Codicon.debugStepOver;
                default:
                    return Codicon.circleFilled;
            }
        default:
            return Codicon.circleFilled;
    }
}
function getCheckStatusClass(check) {
    switch (getCheckGroup(check)) {
        case 0 /* CICheckGroup.Running */:
            return 'ci-status-running';
        case 1 /* CICheckGroup.Pending */:
            return 'ci-status-pending';
        case 2 /* CICheckGroup.Failed */:
            return 'ci-status-failure';
        case 3 /* CICheckGroup.Successful */:
            return 'ci-status-success';
    }
}
function getCheckStateLabel(check) {
    switch (getCheckGroup(check)) {
        case 0 /* CICheckGroup.Running */:
            return localize(3113, null);
        case 1 /* CICheckGroup.Pending */:
            return localize(3114, null);
        case 2 /* CICheckGroup.Failed */:
            return localize(3115, null);
        case 3 /* CICheckGroup.Successful */:
            return localize(3116, null);
    }
}
function isFailedConclusion(conclusion) {
    return conclusion === "failure" /* GitHubCheckConclusion.Failure */
        || conclusion === "timed_out" /* GitHubCheckConclusion.TimedOut */
        || conclusion === "action_required" /* GitHubCheckConclusion.ActionRequired */;
}
//# sourceMappingURL=ciStatusWidget.js.map