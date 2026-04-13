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
import * as dom from '../../../../base/browser/dom.js';
import { ActionBar } from '../../../../base/browser/ui/actionbar/actionbar.js';
import { Action } from '../../../../base/common/actions.js';
import { Codicon } from '../../../../base/common/codicons.js';
import { MarkdownString } from '../../../../base/common/htmlContent.js';
import { Disposable, DisposableStore, MutableDisposable } from '../../../../base/common/lifecycle.js';
import { basename } from '../../../../base/common/path.js';
import { ThemeIcon } from '../../../../base/common/themables.js';
import { ILanguageService } from '../../../../editor/common/languages/language.js';
import { localize } from '../../../../nls.js';
import { FileKind } from '../../../../platform/files/common/files.js';
import { IHoverService } from '../../../../platform/hover/browser/hover.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { WorkbenchObjectTree } from '../../../../platform/list/browser/listService.js';
import { DEFAULT_LABELS_CONTAINER, ResourceLabels } from '../../../../workbench/browser/labels.js';
import { IAgentFeedbackService } from './agentFeedbackService.js';
import { editorHoverBackground } from '../../../../platform/theme/common/colorRegistry.js';
const $ = dom.$;
function isFeedbackFileElement(element) {
    return element.type === 'file';
}
// --- Tree Delegate ---
class FeedbackTreeDelegate {
    getHeight(_element) {
        return 22;
    }
    getTemplateId(element) {
        return isFeedbackFileElement(element)
            ? FeedbackFileRenderer.TEMPLATE_ID
            : FeedbackCommentRenderer.TEMPLATE_ID;
    }
}
class FeedbackFileRenderer {
    static { this.TEMPLATE_ID = 'feedbackFile'; }
    constructor(_labels, _agentFeedbackService, _sessionResource) {
        this._labels = _labels;
        this._agentFeedbackService = _agentFeedbackService;
        this._sessionResource = _sessionResource;
        this.templateId = FeedbackFileRenderer.TEMPLATE_ID;
    }
    renderTemplate(container) {
        const templateDisposables = new DisposableStore();
        const label = templateDisposables.add(this._labels.create(container, { supportHighlights: true, supportIcons: true }));
        const actionBarContainer = $('div.agent-feedback-hover-action-bar');
        label.element.appendChild(actionBarContainer);
        const actionBar = templateDisposables.add(new ActionBar(actionBarContainer));
        return { label, actionBar, templateDisposables };
    }
    renderElement(node, _index, templateData) {
        const element = node.element;
        templateData.label.element.style.display = 'flex';
        const name = basename(element.uri.path);
        templateData.label.setResource({ resource: element.uri, name }, { fileKind: FileKind.FILE });
        templateData.actionBar.clear();
        if (this._agentFeedbackService) {
            const service = this._agentFeedbackService;
            const sessionResource = this._sessionResource;
            templateData.actionBar.push(new Action('agentFeedback.removeFileComments', localize(3036, null), ThemeIcon.asClassName(Codicon.close), true, () => {
                for (const item of element.items) {
                    service.removeFeedback(sessionResource, item.id);
                }
            }), { icon: true, label: false });
        }
    }
    disposeTemplate(templateData) {
        templateData.templateDisposables.dispose();
    }
}
class FeedbackCommentRenderer {
    static { this.TEMPLATE_ID = 'feedbackComment'; }
    constructor(_agentFeedbackService, _sessionResource, _hoverService, _languageService) {
        this._agentFeedbackService = _agentFeedbackService;
        this._sessionResource = _sessionResource;
        this._hoverService = _hoverService;
        this._languageService = _languageService;
        this.templateId = FeedbackCommentRenderer.TEMPLATE_ID;
    }
    renderTemplate(container) {
        const templateDisposables = new DisposableStore();
        const row = dom.append(container, $('div.agent-feedback-hover-comment-row'));
        const textElement = dom.append(row, $('div.agent-feedback-hover-comment-text'));
        const actionBarContainer = dom.append(row, $('div.agent-feedback-hover-action-bar'));
        const actionBar = templateDisposables.add(new ActionBar(actionBarContainer));
        const hoverDisposable = templateDisposables.add(new MutableDisposable());
        const templateData = { textElement, row, actionBar, templateDisposables, hoverDisposable, element: undefined };
        if (this._agentFeedbackService) {
            const service = this._agentFeedbackService;
            const sessionResource = this._sessionResource;
            templateDisposables.add(dom.addDisposableListener(row, dom.EventType.CLICK, (e) => {
                const data = templateData.element;
                if (data) {
                    e.preventDefault();
                    e.stopPropagation();
                    service.revealFeedback(sessionResource, data.id);
                }
            }));
        }
        return templateData;
    }
    renderElement(node, _index, templateData) {
        const element = node.element;
        templateData.textElement.textContent = element.text;
        templateData.element = element;
        // In read-only mode, set up a rich markdown hover with comment + code snippet
        if (!this._agentFeedbackService) {
            templateData.hoverDisposable.value = this._hoverService.setupDelayedHover(templateData.row, () => this._buildCommentHover(element), { groupId: 'agent-feedback-comment' });
        }
        templateData.actionBar.clear();
        if (this._agentFeedbackService) {
            const service = this._agentFeedbackService;
            const sessionResource = this._sessionResource;
            templateData.actionBar.push(new Action('agentFeedback.removeComment', localize(3037, null), ThemeIcon.asClassName(Codicon.close), true, () => {
                service.removeFeedback(sessionResource, element.id);
            }), { icon: true, label: false });
        }
    }
    disposeTemplate(templateData) {
        templateData.templateDisposables.dispose();
    }
    _buildCommentHover(element) {
        const markdown = new MarkdownString('', { isTrusted: true, supportThemeIcons: true });
        markdown.appendText(element.text);
        if (element.codeSelection) {
            const languageId = this._languageService.guessLanguageIdByFilepathOrFirstLine(element.resourceUri);
            markdown.appendMarkdown('\n\n');
            markdown.appendCodeblock(languageId ?? '', element.codeSelection);
        }
        if (element.diffHunks) {
            markdown.appendMarkdown('\n\n');
            markdown.appendCodeblock('diff', element.diffHunks);
        }
        return {
            content: markdown,
            style: 1 /* HoverStyle.Pointer */,
            position: {
                hoverPosition: 1 /* HoverPosition.RIGHT */,
            },
        };
    }
}
// --- Hover ---
/**
 * Creates the custom hover content for the "N comments" attachment.
 * Uses a WorkbenchObjectTree to render files as parent nodes and comments as children,
 * with per-row action bars for removal.
 */
let AgentFeedbackHover = class AgentFeedbackHover extends Disposable {
    constructor(_element, _attachment, _canDelete, _hoverService, _instantiationService, _agentFeedbackService, _languageService) {
        super();
        this._element = _element;
        this._attachment = _attachment;
        this._canDelete = _canDelete;
        this._hoverService = _hoverService;
        this._instantiationService = _instantiationService;
        this._agentFeedbackService = _agentFeedbackService;
        this._languageService = _languageService;
        // Show on hover (delayed)
        this._store.add(this._hoverService.setupDelayedHover(this._element, () => this._store.add(this._buildHoverContent()), { groupId: 'chat-attachments' }));
        // Show immediately on click
        this._store.add(dom.addDisposableListener(this._element, dom.EventType.CLICK, (e) => {
            e.preventDefault();
            e.stopPropagation();
            this._showHoverNow();
        }));
    }
    _showHoverNow() {
        const opts = this._buildHoverContent();
        this._register(opts);
        this._hoverService.showInstantHover({
            ...opts,
            target: this._element,
        });
    }
    _buildHoverContent() {
        const disposables = new DisposableStore();
        const hoverElement = $('div.agent-feedback-hover');
        // Tree container
        const treeContainer = dom.append(hoverElement, $('.results.show-file-icons.file-icon-themable-tree.agent-feedback-hover-tree'));
        // Resource labels (shared across all file renderers)
        const resourceLabels = disposables.add(this._instantiationService.createInstance(ResourceLabels, DEFAULT_LABELS_CONTAINER));
        // Build tree data
        const { children, commentElements } = this._buildTreeData();
        // Create tree
        const tree = disposables.add(this._instantiationService.createInstance((WorkbenchObjectTree), 'AgentFeedbackHoverTree', treeContainer, new FeedbackTreeDelegate(), [
            new FeedbackFileRenderer(resourceLabels, this._canDelete ? this._agentFeedbackService : undefined, this._attachment.sessionResource),
            new FeedbackCommentRenderer(this._canDelete ? this._agentFeedbackService : undefined, this._attachment.sessionResource, this._hoverService, this._languageService),
        ], {
            defaultIndent: 0,
            alwaysConsumeMouseWheel: false,
            accessibilityProvider: {
                getAriaLabel: (element) => {
                    if (isFeedbackFileElement(element)) {
                        return basename(element.uri.path);
                    }
                    return element.text;
                },
                getWidgetAriaLabel: () => localize(3038, null),
            },
            identityProvider: {
                getId: (element) => {
                    if (isFeedbackFileElement(element)) {
                        return `file:${element.uri.toString()}`;
                    }
                    return `comment:${element.id}`;
                }
            },
            overrideStyles: {
                listFocusBackground: undefined,
                listInactiveFocusBackground: undefined,
                listActiveSelectionBackground: undefined,
                listFocusAndSelectionBackground: undefined,
                listInactiveSelectionBackground: undefined,
                listBackground: editorHoverBackground,
                listFocusForeground: undefined,
                treeStickyScrollBackground: editorHoverBackground,
            }
        }));
        // Set tree data
        tree.setChildren(null, children);
        // Layout tree: clamp to reasonable height
        const ROW_HEIGHT = 22;
        const MAX_ROWS = 8;
        const totalRows = commentElements.length + children.length;
        const treeHeight = Math.min(totalRows * ROW_HEIGHT, MAX_ROWS * ROW_HEIGHT);
        tree.layout(treeHeight, 200);
        treeContainer.style.height = `${treeHeight}px`;
        return {
            content: hoverElement,
            style: 1 /* HoverStyle.Pointer */,
            persistence: { hideOnHover: false },
            position: { hoverPosition: 3 /* HoverPosition.ABOVE */ },
            trapFocus: true,
            appearance: { compact: true },
            additionalClasses: ['agent-feedback-hover-container'],
            dispose: () => disposables.dispose(),
        };
    }
    _buildTreeData() {
        // Group feedback items by file
        const byFile = new Map();
        for (const item of this._attachment.feedbackItems) {
            const key = item.resourceUri.toString();
            let group = byFile.get(key);
            if (!group) {
                group = { uri: item.resourceUri, comments: [] };
                byFile.set(key, group);
            }
            group.comments.push({
                type: 'comment',
                id: item.id,
                text: item.text,
                resourceUri: item.resourceUri,
                codeSelection: item.codeSelection,
                diffHunks: item.diffHunks,
            });
        }
        const children = [];
        const allComments = [];
        for (const [, group] of byFile) {
            const fileElement = {
                type: 'file',
                uri: group.uri,
                items: group.comments,
            };
            allComments.push(...group.comments);
            children.push({
                element: fileElement,
                collapsible: true,
                collapsed: false,
                children: group.comments.map(comment => ({
                    element: comment,
                    collapsible: false,
                })),
            });
        }
        return { children, commentElements: allComments };
    }
};
AgentFeedbackHover = __decorate([
    __param(3, IHoverService),
    __param(4, IInstantiationService),
    __param(5, IAgentFeedbackService),
    __param(6, ILanguageService)
], AgentFeedbackHover);
export { AgentFeedbackHover };
//# sourceMappingURL=agentFeedbackHover.js.map