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
import { toAction } from '../../../../base/common/actions.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { Schemas } from '../../../../base/common/network.js';
import { autorun } from '../../../../base/common/observable.js';
import { Codicon } from '../../../../base/common/codicons.js';
import { localize, localize2 } from '../../../../nls.js';
import { Action2, MenuId, MenuRegistry, registerAction2 } from '../../../../platform/actions/common/actions.js';
import { ICommandService } from '../../../../platform/commands/common/commands.js';
import { ContextKeyExpr, IContextKeyService, RawContextKey } from '../../../../platform/contextkey/common/contextkey.js';
import { INotificationService, Severity } from '../../../../platform/notification/common/notification.js';
import { IOpenerService } from '../../../../platform/opener/common/opener.js';
import { IProductService } from '../../../../platform/product/common/productService.js';
import { registerWorkbenchContribution2 } from '../../../../workbench/common/contributions.js';
import { IsSessionsWindowContext } from '../../../../workbench/common/contextkeys.js';
import { CHAT_CATEGORY } from '../../../../workbench/contrib/chat/browser/actions/chatActions.js';
import { ChatContextKeys } from '../../../../workbench/contrib/chat/common/actions/chatContextKeys.js';
import { ISessionsManagementService } from '../../sessions/browser/sessionsManagementService.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { URI } from '../../../../base/common/uri.js';
const hasWorktreeAndRepositoryContextKey = new RawContextKey('agentSessionHasWorktreeAndRepository', false, {
    type: 'boolean',
    description: localize(3078, null)
});
let ApplyChangesToParentRepoContribution = class ApplyChangesToParentRepoContribution extends Disposable {
    static { this.ID = 'sessions.contrib.applyChangesToParentRepo'; }
    constructor(contextKeyService, sessionManagementService) {
        super();
        const worktreeAndRepoKey = hasWorktreeAndRepositoryContextKey.bindTo(contextKeyService);
        this._register(autorun(reader => {
            const activeSession = sessionManagementService.activeSession.read(reader);
            const hasWorktreeAndRepo = !!activeSession?.worktree && !!activeSession?.repository;
            worktreeAndRepoKey.set(hasWorktreeAndRepo);
        }));
    }
};
ApplyChangesToParentRepoContribution = __decorate([
    __param(0, IContextKeyService),
    __param(1, ISessionsManagementService)
], ApplyChangesToParentRepoContribution);
class ApplyChangesToParentRepoAction extends Action2 {
    static { this.ID = 'chatEditing.applyChangesToParentRepo'; }
    constructor() {
        super({
            id: ApplyChangesToParentRepoAction.ID,
            title: localize2(3084, 'Apply Changes to Parent Repository'),
            icon: Codicon.desktopDownload,
            category: CHAT_CATEGORY,
            precondition: ContextKeyExpr.and(IsSessionsWindowContext, hasWorktreeAndRepositoryContextKey),
            menu: [
                {
                    id: MenuId.ChatEditingSessionApplySubmenu,
                    group: 'navigation',
                    order: 2,
                    when: ContextKeyExpr.and(ContextKeyExpr.false(), IsSessionsWindowContext, hasWorktreeAndRepositoryContextKey),
                },
            ],
        });
    }
    async run(accessor) {
        const sessionManagementService = accessor.get(ISessionsManagementService);
        const commandService = accessor.get(ICommandService);
        const notificationService = accessor.get(INotificationService);
        const logService = accessor.get(ILogService);
        const openerService = accessor.get(IOpenerService);
        const productService = accessor.get(IProductService);
        const activeSession = sessionManagementService.getActiveSession();
        if (!activeSession?.worktree || !activeSession?.repository) {
            return;
        }
        const worktreeRoot = activeSession.worktree;
        const repoRoot = activeSession.repository;
        const openFolderAction = toAction({
            id: 'applyChangesToParentRepo.openFolder',
            label: localize(3079, null),
            run: () => {
                const scheme = productService.quality === 'stable'
                    ? 'vscode'
                    : productService.quality === 'exploration'
                        ? 'vscode-exploration'
                        : 'vscode-insiders';
                const params = new URLSearchParams();
                params.set('windowId', '_blank');
                params.set('session', activeSession.resource.toString());
                openerService.open(URI.from({
                    scheme,
                    authority: Schemas.file,
                    path: repoRoot.path,
                    query: params.toString(),
                }), { openExternal: true });
            }
        });
        try {
            // Get the worktree branch name. Since the worktree and parent repo
            // share the same git object store, the parent can directly reference
            // this branch for a merge.
            const worktreeBranch = await commandService.executeCommand('_git.revParseAbbrevRef', worktreeRoot.fsPath);
            if (!worktreeBranch) {
                notificationService.notify({
                    severity: Severity.Warning,
                    message: localize(3080, null),
                });
                return;
            }
            // Merge the worktree branch into the parent repo.
            // This is idempotent: if already merged, git says "Already up to date."
            // If new commits exist, they're brought in. Handles partial applies naturally.
            const result = await commandService.executeCommand('_git.mergeBranch', repoRoot.fsPath, worktreeBranch);
            if (!result) {
                logService.warn('[ApplyChangesToParentRepo] No result from merge command');
            }
            else {
                notificationService.notify({
                    severity: Severity.Info,
                    message: typeof result === 'string' && result.startsWith('Already up to date')
                        ? localize(3081, null)
                        : localize(3082, null),
                    actions: { primary: [openFolderAction] }
                });
            }
        }
        catch (err) {
            logService.error('[ApplyChangesToParentRepo] Failed to apply changes', err);
            notificationService.notify({
                severity: Severity.Warning,
                message: localize(3083, null),
                actions: { primary: [openFolderAction] }
            });
        }
    }
}
registerAction2(ApplyChangesToParentRepoAction);
registerWorkbenchContribution2(ApplyChangesToParentRepoContribution.ID, ApplyChangesToParentRepoContribution, 3 /* WorkbenchPhase.AfterRestored */);
// Register the apply submenu in the session changes toolbar
MenuRegistry.appendMenuItem(MenuId.ChatEditingSessionChangesToolbar, {
    submenu: MenuId.ChatEditingSessionApplySubmenu,
    title: localize2(3085, 'Apply Actions'),
    group: 'navigation',
    order: 1,
    when: ContextKeyExpr.and(IsSessionsWindowContext, ChatContextKeys.hasAgentSessionChanges),
});
//# sourceMappingURL=applyChangesToParentRepo.js.map