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
import { Disposable } from '../../../../base/common/lifecycle.js';
import { autorun, constObservable, derived, ObservablePromise, observableValue } from '../../../../base/common/observable.js';
import { Codicon } from '../../../../base/common/codicons.js';
import { ThemeIcon } from '../../../../base/common/themables.js';
import { localize } from '../../../../nls.js';
import { Action2, MenuId, registerAction2 } from '../../../../platform/actions/common/actions.js';
import { ICommandService } from '../../../../platform/commands/common/commands.js';
import { IContextKeyService, RawContextKey } from '../../../../platform/contextkey/common/contextkey.js';
import { registerWorkbenchContribution2 } from '../../../../workbench/common/contributions.js';
import { CHAT_CATEGORY } from '../../../../workbench/contrib/chat/browser/actions/chatActions.js';
import { IGitService } from '../../../../workbench/contrib/git/common/gitService.js';
import { ISessionsManagementService } from '../../sessions/browser/sessionsManagementService.js';
const hasUpstreamBranchContextKey = new RawContextKey('agentSessionGitHasUpstreamBranch', false, {
    type: 'boolean',
    description: localize(3284, null),
});
let GitSyncContribution = class GitSyncContribution extends Disposable {
    static { this.ID = 'sessions.contrib.gitSync'; }
    constructor(contextKeyService, sessionManagementService, gitService) {
        super();
        this.contextKeyService = contextKeyService;
        this.sessionManagementService = sessionManagementService;
        this.gitService = gitService;
        this._isSyncingObs = observableValue(this, false);
        const hasUpstreamBranch = hasUpstreamBranchContextKey.bindTo(this.contextKeyService);
        const activeSessionWorktreeObs = derived(reader => {
            const activeSession = this.sessionManagementService.activeSession.read(reader);
            return activeSession?.worktree;
        });
        const activeSessionRepositoryPromiseObs = derived(reader => {
            const worktreeUri = activeSessionWorktreeObs.read(reader);
            if (!worktreeUri) {
                return constObservable(undefined);
            }
            return new ObservablePromise(this.gitService.openRepository(worktreeUri)).resolvedValue;
        });
        const activeSessionRepositoryStateObs = derived(reader => {
            const activeSessionRepository = activeSessionRepositoryPromiseObs.read(reader).read(reader);
            if (activeSessionRepository === undefined) {
                return undefined;
            }
            return activeSessionRepository.state.read(reader);
        });
        this._register(autorun(reader => {
            const isSyncing = this._isSyncingObs.read(reader);
            const activeSessionRepositoryState = activeSessionRepositoryStateObs.read(reader);
            if (!activeSessionRepositoryState) {
                hasUpstreamBranch.set(false);
                return;
            }
            const head = activeSessionRepositoryState.HEAD;
            hasUpstreamBranch.set(head?.upstream !== undefined);
            if (!head?.upstream) {
                return;
            }
            reader.store.add(registerSyncAction(head, isSyncing, (syncing) => {
                this._isSyncingObs.set(syncing, undefined);
            }));
        }));
    }
};
GitSyncContribution = __decorate([
    __param(0, IContextKeyService),
    __param(1, ISessionsManagementService),
    __param(2, IGitService)
], GitSyncContribution);
function registerSyncAction(branch, isSyncing, setSyncing) {
    const ahead = branch.ahead ?? 0;
    const behind = branch.behind ?? 0;
    const titleSegments = [localize(3285, null)];
    if (behind > 0) {
        titleSegments.push(`${behind}↓`);
    }
    if (ahead > 0) {
        titleSegments.push(`${ahead}↑`);
    }
    const icon = isSyncing
        ? ThemeIcon.modify(Codicon.sync, 'spin')
        : Codicon.sync;
    class SynchronizeChangesAction extends Action2 {
        static { this.ID = 'chatEditing.synchronizeChanges'; }
        constructor() {
            super({
                id: SynchronizeChangesAction.ID,
                title: titleSegments.join(' '),
                tooltip: localize(3286, null, behind, ahead),
                icon,
                category: CHAT_CATEGORY,
                menu: [
                    {
                        id: MenuId.ChatEditingSessionApplySubmenu,
                        group: 'navigation',
                        order: 0,
                        when: hasUpstreamBranchContextKey,
                    },
                ],
            });
        }
        async run(accessor) {
            const commandService = accessor.get(ICommandService);
            const sessionManagementService = accessor.get(ISessionsManagementService);
            const worktreeUri = sessionManagementService.getActiveSession()?.worktree;
            setSyncing(true);
            try {
                await commandService.executeCommand('git.sync', worktreeUri);
            }
            finally {
                setSyncing(false);
            }
        }
    }
    return registerAction2(SynchronizeChangesAction);
}
registerWorkbenchContribution2(GitSyncContribution.ID, GitSyncContribution, 3 /* WorkbenchPhase.AfterRestored */);
//# sourceMappingURL=git.contribution.js.map