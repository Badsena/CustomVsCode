/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Codicon } from '../../../../base/common/codicons.js';
import { localize, localize2 } from '../../../../nls.js';
import { Action2, MenuRegistry, registerAction2 } from '../../../../platform/actions/common/actions.js';
import { ContextKeyExpr, RawContextKey } from '../../../../platform/contextkey/common/contextkey.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { isEqual } from '../../../../base/common/resources.js';
import { IEditorService } from '../../../../workbench/services/editor/common/editorService.js';
import { IEditorGroupsService } from '../../../../workbench/services/editor/common/editorGroupsService.js';
import { IChatWidgetService } from '../../../../workbench/contrib/chat/browser/chat.js';
import { ChatContextKeys } from '../../../../workbench/contrib/chat/common/actions/chatContextKeys.js';
import { CHAT_CATEGORY } from '../../../../workbench/contrib/chat/browser/actions/chatActions.js';
import { IAgentFeedbackService } from './agentFeedbackService.js';
import { getActiveResourceCandidates, getSessionForResource } from './agentFeedbackEditorUtils.js';
import { Menus } from '../../../browser/menus.js';
import { IChatEditingService } from '../../../../workbench/contrib/chat/common/editing/chatEditingService.js';
import { IAgentSessionsService } from '../../../../workbench/contrib/chat/browser/agentSessions/agentSessionsService.js';
import { ICodeReviewService } from '../../codeReview/browser/codeReviewService.js';
import { getSessionEditorComments } from './sessionEditorComments.js';
export const submitFeedbackActionId = 'agentFeedbackEditor.action.submit';
export const navigatePreviousFeedbackActionId = 'agentFeedbackEditor.action.navigatePrevious';
export const navigateNextFeedbackActionId = 'agentFeedbackEditor.action.navigateNext';
export const clearAllFeedbackActionId = 'agentFeedbackEditor.action.clearAll';
export const navigationBearingFakeActionId = 'agentFeedbackEditor.navigation.bearings';
export const hasSessionEditorComments = new RawContextKey('agentFeedbackEditor.hasSessionComments', false);
export const hasSessionAgentFeedback = new RawContextKey('agentFeedbackEditor.hasAgentFeedback', false);
class AgentFeedbackEditorAction extends Action2 {
    constructor(desc) {
        super({
            category: CHAT_CATEGORY,
            ...desc,
        });
    }
    async run(accessor) {
        const editorService = accessor.get(IEditorService);
        const agentFeedbackService = accessor.get(IAgentFeedbackService);
        const chatEditingService = accessor.get(IChatEditingService);
        const agentSessionsService = accessor.get(IAgentSessionsService);
        const codeReviewService = accessor.get(ICodeReviewService);
        const editorGroupsService = accessor.get(IEditorGroupsService);
        const activePane = editorService.activeEditorPane
            ?? editorGroupsService.getGroups(1 /* GroupsOrder.MOST_RECENTLY_ACTIVE */).find(g => g.activeEditorPane)?.activeEditorPane
            ?? editorService.visibleEditorPanes[0];
        const candidates = getActiveResourceCandidates(activePane?.input);
        for (const candidate of candidates) {
            const sessionResource = getSessionForResource(candidate, chatEditingService, agentSessionsService)
                ?? agentFeedbackService.getMostRecentSessionForResource(candidate);
            if (!sessionResource) {
                continue;
            }
            const comments = getSessionEditorComments(sessionResource, agentFeedbackService.getFeedback(sessionResource), codeReviewService.getReviewState(sessionResource).get(), codeReviewService.getPRReviewState(sessionResource).get());
            if (comments.length > 0) {
                return this.runWithSession(accessor, sessionResource);
            }
        }
    }
}
class SubmitFeedbackAction extends AgentFeedbackEditorAction {
    constructor() {
        super({
            id: submitFeedbackActionId,
            title: localize2(3004, 'Submit Feedback'),
            shortTitle: localize2(3005, 'Submit'),
            icon: Codicon.send,
            precondition: ChatContextKeys.enabled,
            menu: {
                id: Menus.AgentFeedbackEditorContent,
                group: 'a_submit',
                order: 0,
                when: ContextKeyExpr.and(ChatContextKeys.enabled, hasSessionAgentFeedback),
            },
        });
    }
    async runWithSession(accessor, sessionResource) {
        const chatWidgetService = accessor.get(IChatWidgetService);
        const agentFeedbackService = accessor.get(IAgentFeedbackService);
        const editorService = accessor.get(IEditorService);
        const logService = accessor.get(ILogService);
        const widget = chatWidgetService.getWidgetBySessionResource(sessionResource);
        if (!widget) {
            logService.error('[AgentFeedback] Cannot submit feedback: no chat widget found for session', sessionResource.toString());
            return;
        }
        // Close all editors belonging to the session resource
        const editorsToClose = [];
        for (const { editor, groupId } of editorService.getEditors(1 /* EditorsOrder.SEQUENTIAL */)) {
            const candidates = getActiveResourceCandidates(editor);
            const belongsToSession = candidates.some(uri => isEqual(agentFeedbackService.getMostRecentSessionForResource(uri), sessionResource));
            if (belongsToSession) {
                editorsToClose.push({ editor, groupId });
            }
        }
        if (editorsToClose.length) {
            await editorService.closeEditors(editorsToClose);
        }
        await widget.acceptInput('act on feedback'); // move to use /act-on-feedback when the bug is fixed
    }
}
class NavigateFeedbackAction extends AgentFeedbackEditorAction {
    constructor(_next) {
        super({
            id: _next ? navigateNextFeedbackActionId : navigatePreviousFeedbackActionId,
            title: _next
                ? localize2(3006, 'Go to Next Feedback Comment')
                : localize2(3007, 'Go to Previous Feedback Comment'),
            icon: _next ? Codicon.arrowDown : Codicon.arrowUp,
            f1: true,
            precondition: ChatContextKeys.enabled,
            menu: {
                id: Menus.AgentFeedbackEditorContent,
                group: 'navigate',
                order: _next ? 2 : 1,
                when: ContextKeyExpr.and(ChatContextKeys.enabled, hasSessionEditorComments),
            },
        });
        this._next = _next;
    }
    async runWithSession(accessor, sessionResource) {
        const agentFeedbackService = accessor.get(IAgentFeedbackService);
        const codeReviewService = accessor.get(ICodeReviewService);
        const comments = getSessionEditorComments(sessionResource, agentFeedbackService.getFeedback(sessionResource), codeReviewService.getReviewState(sessionResource).get(), codeReviewService.getPRReviewState(sessionResource).get());
        const comment = agentFeedbackService.getNextNavigableItem(sessionResource, comments, this._next);
        if (!comment) {
            return;
        }
        await agentFeedbackService.revealSessionComment(sessionResource, comment.id, comment.resourceUri, comment.range);
    }
}
class ClearAllFeedbackAction extends AgentFeedbackEditorAction {
    constructor() {
        super({
            id: clearAllFeedbackActionId,
            title: localize2(3008, 'Clear'),
            tooltip: localize2(3009, 'Clear All Feedback'),
            icon: Codicon.clearAll,
            f1: true,
            precondition: ContextKeyExpr.and(ChatContextKeys.enabled),
            menu: {
                id: Menus.AgentFeedbackEditorContent,
                group: 'a_submit',
                order: 1,
                when: ContextKeyExpr.and(ChatContextKeys.enabled, hasSessionAgentFeedback),
            },
        });
    }
    runWithSession(accessor, sessionResource) {
        const agentFeedbackService = accessor.get(IAgentFeedbackService);
        agentFeedbackService.clearFeedback(sessionResource);
    }
}
export function registerAgentFeedbackEditorActions() {
    registerAction2(SubmitFeedbackAction);
    registerAction2(class extends NavigateFeedbackAction {
        constructor() { super(false); }
    });
    registerAction2(class extends NavigateFeedbackAction {
        constructor() { super(true); }
    });
    registerAction2(ClearAllFeedbackAction);
    MenuRegistry.appendMenuItem(Menus.AgentFeedbackEditorContent, {
        command: {
            id: navigationBearingFakeActionId,
            title: localize(3003, null),
            precondition: ContextKeyExpr.false(),
        },
        group: 'navigate',
        order: -1,
        when: ContextKeyExpr.and(ChatContextKeys.enabled, hasSessionEditorComments),
    });
}
//# sourceMappingURL=agentFeedbackEditorActions.js.map