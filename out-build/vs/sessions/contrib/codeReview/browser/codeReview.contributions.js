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
import { Codicon } from '../../../../base/common/codicons.js';
import { Disposable, MutableDisposable } from '../../../../base/common/lifecycle.js';
import { autorun, observableFromEvent } from '../../../../base/common/observable.js';
import { URI } from '../../../../base/common/uri.js';
import { localize } from '../../../../nls.js';
import { Action2, MenuId, registerAction2 } from '../../../../platform/actions/common/actions.js';
import { ContextKeyExpr, IContextKeyService, RawContextKey } from '../../../../platform/contextkey/common/contextkey.js';
import { registerSingleton } from '../../../../platform/instantiation/common/extensions.js';
import { registerWorkbenchContribution2 } from '../../../../workbench/common/contributions.js';
import { IsSessionsWindowContext } from '../../../../workbench/common/contextkeys.js';
import { ChatContextKeys } from '../../../../workbench/contrib/chat/common/actions/chatContextKeys.js';
import { AgentSessionProviders } from '../../../../workbench/contrib/chat/browser/agentSessions/agentSessions.js';
import { IAgentSessionsService } from '../../../../workbench/contrib/chat/browser/agentSessions/agentSessionsService.js';
import { CHAT_CATEGORY } from '../../../../workbench/contrib/chat/browser/actions/chatActions.js';
import { ISessionsManagementService } from '../../sessions/browser/sessionsManagementService.js';
import { IAgentFeedbackService } from '../../agentFeedback/browser/agentFeedbackService.js';
import { getSessionEditorComments } from '../../agentFeedback/browser/sessionEditorComments.js';
import { CodeReviewService, getCodeReviewFilesFromSessionChanges, getCodeReviewVersion, ICodeReviewService, MAX_CODE_REVIEWS_PER_SESSION_VERSION } from './codeReviewService.js';
registerSingleton(ICodeReviewService, CodeReviewService, 1 /* InstantiationType.Delayed */);
const canRunSessionCodeReviewContextKey = new RawContextKey('sessions.canRunCodeReview', true, {
    type: 'boolean',
    description: localize(3267, null),
});
function registerSessionCodeReviewAction(tooltip, icon) {
    class RunSessionCodeReviewAction extends Action2 {
        static { this.ID = 'sessions.codeReview.run'; }
        constructor() {
            super({
                id: RunSessionCodeReviewAction.ID,
                title: localize(3268, null),
                tooltip,
                category: CHAT_CATEGORY,
                icon,
                precondition: canRunSessionCodeReviewContextKey,
                menu: [
                    {
                        id: MenuId.ChatEditingSessionChangesToolbar,
                        group: 'navigation',
                        order: 7,
                        when: ContextKeyExpr.and(IsSessionsWindowContext, ChatContextKeys.hasAgentSessionChanges, ChatContextKeys.agentSessionType.notEqualsTo(AgentSessionProviders.Cloud)),
                    },
                ],
            });
        }
        async run(accessor, sessionResource) {
            const sessionManagementService = accessor.get(ISessionsManagementService);
            const agentSessionsService = accessor.get(IAgentSessionsService);
            const codeReviewService = accessor.get(ICodeReviewService);
            const agentFeedbackService = accessor.get(IAgentFeedbackService);
            const resource = URI.isUri(sessionResource)
                ? sessionResource
                : sessionManagementService.getActiveSession()?.resource;
            if (!resource) {
                return;
            }
            const session = agentSessionsService.getSession(resource);
            if (!(session?.changes instanceof Array) || session.changes.length === 0) {
                return;
            }
            const files = getCodeReviewFilesFromSessionChanges(session.changes);
            const version = getCodeReviewVersion(files);
            // If there are existing comments (code review or PR review), navigate to the first one
            const reviewState = codeReviewService.getReviewState(resource).get();
            const prReviewState = codeReviewService.getPRReviewState(resource).get();
            const reviewCount = reviewState.kind !== "idle" /* CodeReviewStateKind.Idle */ && reviewState.version === version ? reviewState.reviewCount : 0;
            const codeReviewCount = reviewState.kind === "result" /* CodeReviewStateKind.Result */ && reviewState.version === version ? reviewState.comments.length : 0;
            const prReviewCount = prReviewState.kind === "loaded" /* PRReviewStateKind.Loaded */ ? prReviewState.comments.length : 0;
            if (codeReviewCount > 0 || prReviewCount > 0) {
                const comments = getSessionEditorComments(resource, agentFeedbackService.getFeedback(resource), reviewState, prReviewState);
                const first = agentFeedbackService.getNextNavigableItem(resource, comments, true);
                if (first) {
                    await agentFeedbackService.revealSessionComment(resource, first.id, first.resourceUri, first.range);
                }
                return;
            }
            if (reviewCount >= MAX_CODE_REVIEWS_PER_SESSION_VERSION) {
                return;
            }
            codeReviewService.requestReview(resource, version, files);
        }
    }
    return registerAction2(RunSessionCodeReviewAction);
}
let CodeReviewToolbarContribution = class CodeReviewToolbarContribution extends Disposable {
    static { this.ID = 'sessions.contrib.codeReviewToolbar'; }
    constructor(contextKeyService, _agentSessionsService, _sessionManagementService, _codeReviewService) {
        super();
        this._agentSessionsService = _agentSessionsService;
        this._sessionManagementService = _sessionManagementService;
        this._codeReviewService = _codeReviewService;
        this._actionRegistration = this._register(new MutableDisposable());
        const canRunCodeReviewContext = canRunSessionCodeReviewContextKey.bindTo(contextKeyService);
        const sessionsChangedSignal = observableFromEvent(this, this._agentSessionsService.model.onDidChangeSessions, () => undefined);
        this._register(autorun(reader => {
            const activeSession = this._sessionManagementService.activeSession.read(reader);
            sessionsChangedSignal.read(reader);
            this._actionRegistration.clear();
            const sessionResource = activeSession?.resource;
            if (!sessionResource) {
                canRunCodeReviewContext.set(false);
                this._actionRegistration.value = registerSessionCodeReviewAction(localize(3269, null), Codicon.codeReview);
                return;
            }
            const session = this._agentSessionsService.getSession(sessionResource);
            if (!(session?.changes instanceof Array) || session.changes.length === 0) {
                canRunCodeReviewContext.set(false);
                this._actionRegistration.value = registerSessionCodeReviewAction(localize(3270, null), Codicon.codeReview);
                return;
            }
            const files = getCodeReviewFilesFromSessionChanges(session.changes);
            const version = getCodeReviewVersion(files);
            const reviewState = this._codeReviewService.getReviewState(sessionResource).read(reader);
            const prReviewState = this._codeReviewService.getPRReviewState(sessionResource).read(reader);
            const reviewCount = reviewState.kind !== "idle" /* CodeReviewStateKind.Idle */ && reviewState.version === version ? reviewState.reviewCount : 0;
            const codeReviewCount = reviewState.kind === "result" /* CodeReviewStateKind.Result */ && reviewState.version === version ? reviewState.comments.length : 0;
            const prReviewCount = prReviewState.kind === "loaded" /* PRReviewStateKind.Loaded */ ? prReviewState.comments.length : 0;
            const totalCommentCount = codeReviewCount + prReviewCount;
            let canRunCodeReview = true;
            let tooltip = localize(3271, null);
            let icon = Codicon.codeReview;
            if (reviewState.kind === "loading" /* CodeReviewStateKind.Loading */ && reviewState.version === version) {
                canRunCodeReview = false;
                tooltip = localize(3272, null);
                icon = Codicon.commentDraft;
            }
            else if (totalCommentCount > 0) {
                canRunCodeReview = true;
                icon = Codicon.commentUnresolved;
                tooltip = totalCommentCount === 1
                    ? localize(3273, null)
                    : localize(3274, null, totalCommentCount);
            }
            else if (reviewCount >= MAX_CODE_REVIEWS_PER_SESSION_VERSION) {
                canRunCodeReview = false;
                tooltip = localize(3275, null, MAX_CODE_REVIEWS_PER_SESSION_VERSION);
                icon = Codicon.codeReview;
            }
            else if (reviewState.kind === "result" /* CodeReviewStateKind.Result */ && reviewState.version === version) {
                canRunCodeReview = true;
                tooltip = reviewState.didProduceComments
                    ? localize(3276, null)
                    : localize(3277, null);
                icon = reviewState.didProduceComments ? Codicon.comment : Codicon.codeReview;
            }
            canRunCodeReviewContext.set(canRunCodeReview);
            this._actionRegistration.value = registerSessionCodeReviewAction(tooltip, icon);
        }));
    }
};
CodeReviewToolbarContribution = __decorate([
    __param(0, IContextKeyService),
    __param(1, IAgentSessionsService),
    __param(2, ISessionsManagementService),
    __param(3, ICodeReviewService)
], CodeReviewToolbarContribution);
registerWorkbenchContribution2(CodeReviewToolbarContribution.ID, CodeReviewToolbarContribution, 3 /* WorkbenchPhase.AfterRestored */);
//# sourceMappingURL=codeReview.contributions.js.map