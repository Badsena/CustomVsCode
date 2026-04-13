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
import { ISessionsManagementService } from '../../sessions/browser/sessionsManagementService.js';
import { AgentSessionProviders } from '../../../../workbench/contrib/chat/browser/agentSessions/agentSessions.js';
import { IWorkspaceContextService } from '../../../../platform/workspace/common/workspace.js';
import { IWorkspaceEditingService } from '../../../../workbench/services/workspaces/common/workspaceEditing.js';
import { IWorkspaceTrustManagementService } from '../../../../platform/workspace/common/workspaceTrust.js';
import { IUriIdentityService } from '../../../../platform/uriIdentity/common/uriIdentity.js';
import { autorun } from '../../../../base/common/observable.js';
import { getGitHubRemoteFileDisplayName } from '../../fileTreeView/browser/githubFileSystemProvider.js';
import { Queue } from '../../../../base/common/async.js';
import { AGENT_HOST_FS_SCHEME } from '../../remoteAgentHost/browser/agentHostFileSystemProvider.js';
let WorkspaceFolderManagementContribution = class WorkspaceFolderManagementContribution extends Disposable {
    static { this.ID = 'workbench.contrib.workspaceFolderManagement'; }
    constructor(sessionManagementService, uriIdentityService, workspaceContextService, workspaceEditingService, workspaceTrustManagementService) {
        super();
        this.sessionManagementService = sessionManagementService;
        this.uriIdentityService = uriIdentityService;
        this.workspaceContextService = workspaceContextService;
        this.workspaceEditingService = workspaceEditingService;
        this.workspaceTrustManagementService = workspaceTrustManagementService;
        this.queue = this._register(new Queue());
        this._register(autorun(reader => {
            const activeSession = this.sessionManagementService.activeSession.read(reader);
            this.queue.queue(() => this.updateWorkspaceFoldersForSession(activeSession));
        }));
    }
    async updateWorkspaceFoldersForSession(session) {
        await this.manageTrustWorkspaceForSession(session);
        const activeSessionFolderData = this.getActiveSessionFolderData(session);
        const currentRepo = this.workspaceContextService.getWorkspace().folders[0]?.uri;
        if (!activeSessionFolderData) {
            if (currentRepo) {
                await this.workspaceEditingService.removeFolders([currentRepo], true);
            }
            return;
        }
        if (!currentRepo) {
            await this.workspaceEditingService.addFolders([activeSessionFolderData], true);
            return;
        }
        if (this.uriIdentityService.extUri.isEqual(currentRepo, activeSessionFolderData.uri)) {
            return;
        }
        await this.workspaceEditingService.updateFolders(0, 1, [activeSessionFolderData], true);
    }
    getActiveSessionFolderData(session) {
        if (!session) {
            return undefined;
        }
        if (session.worktree) {
            return {
                uri: session.worktree,
                name: session.repository ? `${this.uriIdentityService.extUri.basename(session.repository)} (${session.worktreeBranchName ?? this.uriIdentityService.extUri.basename(session.worktree)})` : this.uriIdentityService.extUri.basename(session.worktree)
            };
        }
        if (session.repository) {
            // Remote agent host sessions use a read-only FS provider that
            // should not be added as a workspace folder.
            if (session.repository.scheme === AGENT_HOST_FS_SCHEME) {
                return undefined;
            }
            if (session.providerType === AgentSessionProviders.Background) {
                return { uri: session.repository };
            }
            if (session.providerType === AgentSessionProviders.Cloud) {
                return {
                    uri: session.repository,
                    name: getGitHubRemoteFileDisplayName(session.repository),
                };
            }
        }
        return undefined;
    }
    async manageTrustWorkspaceForSession(session) {
        if (session?.providerType !== AgentSessionProviders.Background) {
            return;
        }
        if (!session.repository || !session.worktree) {
            return;
        }
        if (!this.isUriTrusted(session.worktree)) {
            await this.workspaceTrustManagementService.setUrisTrust([session.worktree], true);
        }
    }
    isUriTrusted(uri) {
        return this.workspaceTrustManagementService.getTrustedUris().some(trustedUri => this.uriIdentityService.extUri.isEqual(trustedUri, uri));
    }
};
WorkspaceFolderManagementContribution = __decorate([
    __param(0, ISessionsManagementService),
    __param(1, IUriIdentityService),
    __param(2, IWorkspaceContextService),
    __param(3, IWorkspaceEditingService),
    __param(4, IWorkspaceTrustManagementService)
], WorkspaceFolderManagementContribution);
export { WorkspaceFolderManagementContribution };
//# sourceMappingURL=workspaceFolderManagement.js.map