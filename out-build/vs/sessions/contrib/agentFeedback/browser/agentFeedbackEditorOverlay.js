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
import './media/agentFeedbackEditorOverlay.css';
import { Disposable, DisposableMap, DisposableStore, combinedDisposable, toDisposable } from '../../../../base/common/lifecycle.js';
import { autorun, observableFromEvent, observableSignalFromEvent, observableValue } from '../../../../base/common/observable.js';
import { ActionViewItem } from '../../../../base/browser/ui/actionbar/actionViewItems.js';
import { Event } from '../../../../base/common/event.js';
import { MenuWorkbenchToolBar } from '../../../../platform/actions/browser/toolbar.js';
import { IContextKeyService } from '../../../../platform/contextkey/common/contextkey.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { ServiceCollection } from '../../../../platform/instantiation/common/serviceCollection.js';
import { IKeybindingService } from '../../../../platform/keybinding/common/keybinding.js';
import { EditorGroupView } from '../../../../workbench/browser/parts/editor/editorGroupView.js';
import { IEditorGroupsService } from '../../../../workbench/services/editor/common/editorGroupsService.js';
import { IAgentFeedbackService } from './agentFeedbackService.js';
import { hasSessionAgentFeedback, hasSessionEditorComments, navigateNextFeedbackActionId, navigatePreviousFeedbackActionId, navigationBearingFakeActionId, submitFeedbackActionId } from './agentFeedbackEditorActions.js';
import { assertType } from '../../../../base/common/types.js';
import { localize } from '../../../../nls.js';
import { getActiveResourceCandidates, getSessionForResource } from './agentFeedbackEditorUtils.js';
import { Menus } from '../../../browser/menus.js';
import { IChatEditingService } from '../../../../workbench/contrib/chat/common/editing/chatEditingService.js';
import { IAgentSessionsService } from '../../../../workbench/contrib/chat/browser/agentSessions/agentSessionsService.js';
import { ICodeReviewService } from '../../codeReview/browser/codeReviewService.js';
import { getSessionEditorComments, hasAgentFeedbackComments } from './sessionEditorComments.js';
class AgentFeedbackActionViewItem extends ActionViewItem {
    constructor(action, options, _keybindingService, _primaryActionIds = [submitFeedbackActionId]) {
        const isIconOnly = action.id === navigatePreviousFeedbackActionId || action.id === navigateNextFeedbackActionId;
        super(undefined, action, { ...options, icon: isIconOnly, label: !isIconOnly, keybindingNotRenderedWithLabel: true });
        this._keybindingService = _keybindingService;
        this._primaryActionIds = _primaryActionIds;
    }
    render(container) {
        super.render(container);
        if (this._primaryActionIds.includes(this._action.id)) {
            this.element?.classList.add('primary');
        }
    }
    getTooltip() {
        const value = super.getTooltip();
        if (!value || this.options.keybinding) {
            return value;
        }
        return this._keybindingService.appendKeybinding(value, this._action.id);
    }
}
let AgentFeedbackOverlayWidget = class AgentFeedbackOverlayWidget extends Disposable {
    constructor(_instaService, _keybindingService) {
        super();
        this._instaService = _instaService;
        this._keybindingService = _keybindingService;
        this._showStore = this._store.add(new DisposableStore());
        this._navigationBearings = observableValue(this, { activeIdx: -1, totalCount: 0 });
        this._domNode = document.createElement('div');
        this._domNode.classList.add('agent-feedback-editor-overlay-widget');
        this._toolbarNode = document.createElement('div');
        this._toolbarNode.classList.add('agent-feedback-editor-overlay-toolbar');
    }
    getDomNode() {
        return this._domNode;
    }
    show(navigationBearings) {
        this._showStore.clear();
        this._navigationBearings.set(navigationBearings, undefined);
        if (!this._domNode.contains(this._toolbarNode)) {
            this._domNode.appendChild(this._toolbarNode);
        }
        this._showStore.add(this._instaService.createInstance(MenuWorkbenchToolBar, this._toolbarNode, Menus.AgentFeedbackEditorContent, {
            telemetrySource: 'agentFeedback.overlayToolbar',
            hiddenItemStrategy: 0 /* HiddenItemStrategy.Ignore */,
            toolbarOptions: {
                primaryGroup: () => true,
                useSeparatorsInPrimaryActions: true
            },
            menuOptions: { renderShortTitle: true },
            actionViewItemProvider: (action, options) => {
                if (action.id === navigationBearingFakeActionId) {
                    const that = this;
                    return new class extends ActionViewItem {
                        constructor() {
                            super(undefined, action, { ...options, icon: false, label: true, keybindingNotRenderedWithLabel: true });
                        }
                        render(container) {
                            super.render(container);
                            container.classList.add('label-item');
                            this._store.add(autorun(r => {
                                assertType(this.label);
                                const { activeIdx, totalCount } = that._navigationBearings.read(r);
                                if (totalCount > 0) {
                                    const current = activeIdx === -1 ? 1 : activeIdx + 1;
                                    this.label.innerText = localize(3016, null, current, totalCount);
                                }
                                else {
                                    this.label.innerText = localize(3017, null);
                                }
                            }));
                        }
                    };
                }
                return new AgentFeedbackActionViewItem(action, options, this._keybindingService);
            },
        }));
        this._showStore.add(toDisposable(() => this._toolbarNode.remove()));
    }
    hide() {
        this._showStore.clear();
        this._navigationBearings.set({ activeIdx: -1, totalCount: 0 }, undefined);
        this._toolbarNode.remove();
    }
};
AgentFeedbackOverlayWidget = __decorate([
    __param(0, IInstantiationService),
    __param(1, IKeybindingService)
], AgentFeedbackOverlayWidget);
export { AgentFeedbackOverlayWidget };
let AgentFeedbackOverlayController = class AgentFeedbackOverlayController {
    constructor(container, group, agentFeedbackService, agentSessionsService, instaService, chatEditingService, contextKeyService, codeReviewService) {
        this._store = new DisposableStore();
        this._domNode = document.createElement('div');
        this._domNode.classList.add('agent-feedback-editor-overlay');
        this._domNode.style.position = 'absolute';
        this._domNode.style.bottom = '24px';
        this._domNode.style.right = '24px';
        this._domNode.style.zIndex = '100';
        const widget = this._store.add(instaService.createInstance(AgentFeedbackOverlayWidget));
        this._domNode.appendChild(widget.getDomNode());
        this._store.add(toDisposable(() => this._domNode.remove()));
        const hasCommentsContext = hasSessionEditorComments.bindTo(contextKeyService);
        const hasAgentFeedbackContext = hasSessionAgentFeedback.bindTo(contextKeyService);
        const show = () => {
            if (!container.contains(this._domNode)) {
                container.appendChild(this._domNode);
            }
        };
        const hide = () => {
            if (container.contains(this._domNode)) {
                widget.hide();
                this._domNode.remove();
            }
        };
        const activeSignal = observableSignalFromEvent(this, Event.any(group.onDidActiveEditorChange, group.onDidModelChange, agentFeedbackService.onDidChangeFeedback, agentFeedbackService.onDidChangeNavigation));
        this._store.add(autorun(r => {
            activeSignal.read(r);
            const candidates = getActiveResourceCandidates(group.activeEditorPane?.input);
            let navigationBearings = undefined;
            let hasAgentFeedback = false;
            for (const candidate of candidates) {
                const sessionResource = getSessionForResource(candidate, chatEditingService, agentSessionsService);
                if (!sessionResource) {
                    continue;
                }
                const comments = getSessionEditorComments(sessionResource, agentFeedbackService.getFeedback(sessionResource), codeReviewService.getReviewState(sessionResource).read(r), codeReviewService.getPRReviewState(sessionResource).read(r));
                if (comments.length > 0) {
                    navigationBearings = agentFeedbackService.getNavigationBearing(sessionResource, comments);
                    hasAgentFeedback = hasAgentFeedbackComments(comments);
                    break;
                }
            }
            if (!navigationBearings) {
                hasCommentsContext.set(false);
                hasAgentFeedbackContext.set(false);
                hide();
                return;
            }
            hasCommentsContext.set(true);
            hasAgentFeedbackContext.set(hasAgentFeedback);
            widget.show(navigationBearings);
            show();
        }));
    }
    dispose() {
        this._store.dispose();
    }
};
AgentFeedbackOverlayController = __decorate([
    __param(2, IAgentFeedbackService),
    __param(3, IAgentSessionsService),
    __param(4, IInstantiationService),
    __param(5, IChatEditingService),
    __param(6, IContextKeyService),
    __param(7, ICodeReviewService)
], AgentFeedbackOverlayController);
let AgentFeedbackEditorOverlay = class AgentFeedbackEditorOverlay {
    static { this.ID = 'chat.agentFeedback.editorOverlay'; }
    constructor(editorGroupsService, instantiationService) {
        this._store = new DisposableStore();
        const editorGroups = observableFromEvent(this, Event.any(editorGroupsService.onDidAddGroup, editorGroupsService.onDidRemoveGroup), () => editorGroupsService.groups);
        const overlayWidgets = this._store.add(new DisposableMap());
        this._store.add(autorun(r => {
            const groups = editorGroups.read(r);
            const toDelete = new Set(overlayWidgets.keys());
            for (const group of groups) {
                if (!(group instanceof EditorGroupView)) {
                    continue;
                }
                toDelete.delete(group);
                if (!overlayWidgets.has(group)) {
                    const scopedInstaService = instantiationService.createChild(new ServiceCollection([IContextKeyService, group.scopedContextKeyService]));
                    const ctrl = scopedInstaService.createInstance(AgentFeedbackOverlayController, group.element, group);
                    overlayWidgets.set(group, combinedDisposable(ctrl, scopedInstaService));
                }
            }
            for (const group of toDelete) {
                overlayWidgets.deleteAndDispose(group);
            }
        }));
    }
    dispose() {
        this._store.dispose();
    }
};
AgentFeedbackEditorOverlay = __decorate([
    __param(0, IEditorGroupsService),
    __param(1, IInstantiationService)
], AgentFeedbackEditorOverlay);
export { AgentFeedbackEditorOverlay };
//# sourceMappingURL=agentFeedbackEditorOverlay.js.map