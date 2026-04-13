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
import { Emitter } from '../../../../base/common/event.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { IChatSessionsService } from '../../../../workbench/contrib/chat/common/chatSessionsService.js';
import { AgentSessionProviders } from '../../../../workbench/contrib/chat/browser/agentSessions/agentSessions.js';
import { ContextKeyExpr, IContextKeyService } from '../../../../platform/contextkey/common/contextkey.js';
const REPOSITORY_OPTION_ID = 'repository';
const BRANCH_OPTION_ID = 'branch';
const ISOLATION_OPTION_ID = 'isolation';
const AGENT_OPTION_ID = 'agent';
/**
 * Local new session for Background agent sessions.
 * Fires `onDidChange` for both `repoUri` and `isolationMode` changes.
 * Notifies the extension service with session options for each property change.
 */
let CopilotCLISession = class CopilotCLISession extends Disposable {
    get project() { return this._project; }
    get isolationMode() { return this._isolationMode; }
    get branch() { return this._branch; }
    get modelId() { return this._modelId; }
    get mode() { return this._mode; }
    get query() { return this._query; }
    get attachedContext() { return this._attachedContext; }
    get disabled() {
        if (!this._repoUri) {
            return true;
        }
        if (this._isolationMode === 'worktree' && !this._branch) {
            return true;
        }
        return false;
    }
    constructor(resource, defaultRepoUri, chatSessionsService, logService) {
        super();
        this.resource = resource;
        this.chatSessionsService = chatSessionsService;
        this.logService = logService;
        this._onDidChange = this._register(new Emitter());
        this.onDidChange = this._onDidChange.event;
        this.target = AgentSessionProviders.Background;
        this.selectedOptions = new Map();
        if (defaultRepoUri) {
            this._repoUri = defaultRepoUri;
            this.setOption(REPOSITORY_OPTION_ID, defaultRepoUri.fsPath);
        }
        this._isolationMode = 'worktree';
        this.setOption(ISOLATION_OPTION_ID, 'worktree');
    }
    setProject(project) {
        this._project = project;
        this._repoUri = project.uri;
        this.setIsolationMode('worktree');
        this._branch = undefined;
        this._onDidChange.fire('repoUri');
        this._onDidChange.fire('disabled');
        this.setOption(REPOSITORY_OPTION_ID, project.uri.fsPath);
    }
    setIsolationMode(mode) {
        if (this._isolationMode !== mode) {
            this._isolationMode = mode;
            this._onDidChange.fire('isolationMode');
            this._onDidChange.fire('disabled');
            this.setOption(ISOLATION_OPTION_ID, mode);
        }
    }
    setBranch(branch) {
        if (this._branch !== branch) {
            this._branch = branch;
            this._onDidChange.fire('branch');
            this._onDidChange.fire('disabled');
            this.setOption(BRANCH_OPTION_ID, branch ?? '');
        }
    }
    setModelId(modelId) {
        this._modelId = modelId;
    }
    setMode(mode) {
        if (this._mode?.id !== mode?.id) {
            this._mode = mode;
            this._onDidChange.fire('agent');
            const modeName = mode?.isBuiltin ? undefined : mode?.name.get();
            this.setOption(AGENT_OPTION_ID, modeName ?? '');
        }
    }
    setQuery(query) {
        this._query = query;
    }
    setAttachedContext(context) {
        this._attachedContext = context;
    }
    setOption(optionId, value) {
        if (typeof value === 'string') {
            this.selectedOptions.set(optionId, { id: value, name: value });
        }
        else {
            this.selectedOptions.set(optionId, value);
        }
        this.chatSessionsService.notifySessionOptionsChange(this.resource, [{ optionId, value }]).catch((err) => this.logService.error(`Failed to notify session option ${optionId} change:`, err));
    }
};
CopilotCLISession = __decorate([
    __param(2, IChatSessionsService),
    __param(3, ILogService)
], CopilotCLISession);
export { CopilotCLISession };
/**
 * Remote new session for Cloud agent sessions.
 * Manages extension-driven option groups (models, etc.) and their values.
 * Fires events for option group changes.
 */
let RemoteNewSession = class RemoteNewSession extends Disposable {
    get project() { return this._project; }
    get isolationMode() { return undefined; }
    get branch() { return undefined; }
    get modelId() { return this._modelId; }
    get mode() { return undefined; }
    get query() { return this._query; }
    get attachedContext() { return this._attachedContext; }
    get disabled() {
        return !this._repoUri && !this.selectedOptions.has('repositories');
    }
    constructor(resource, target, chatSessionsService, contextKeyService, logService) {
        super();
        this.resource = resource;
        this.target = target;
        this.chatSessionsService = chatSessionsService;
        this.contextKeyService = contextKeyService;
        this.logService = logService;
        this._onDidChange = this._register(new Emitter());
        this.onDidChange = this._onDidChange.event;
        this._onDidChangeOptionGroups = this._register(new Emitter());
        this.onDidChangeOptionGroups = this._onDidChangeOptionGroups.event;
        this.selectedOptions = new Map();
        this._whenClauseKeys = new Set();
        this._updateWhenClauseKeys();
        this._register(this.chatSessionsService.onDidChangeOptionGroups(() => {
            this._updateWhenClauseKeys();
            this._onDidChangeOptionGroups.fire();
            this._onDidChange.fire('options');
        }));
        this._register(this.contextKeyService.onDidChangeContext(e => {
            if (this._whenClauseKeys.size > 0 && e.affectsSome(this._whenClauseKeys)) {
                this._onDidChangeOptionGroups.fire();
            }
        }));
    }
    setProject(project) {
        this._project = project;
        this._repoUri = project.uri;
        this._onDidChange.fire('repoUri');
        this._onDidChange.fire('disabled');
        const id = project.uri.path.substring(1);
        this.setOption('repositories', { id, name: id });
    }
    setIsolationMode(_mode) {
        // No-op for remote sessions
    }
    setBranch(_branch) {
        // No-op for remote sessions
    }
    setModelId(modelId) {
        this._modelId = modelId;
    }
    setMode(_mode) {
        // Intentionally a no-op: remote sessions do not support client-side mode selection.
        // Any mode or behavior differences are determined by the remote session provider/server.
    }
    setQuery(query) {
        this._query = query;
    }
    setAttachedContext(context) {
        this._attachedContext = context;
    }
    setOption(optionId, value) {
        if (typeof value !== 'string') {
            this.selectedOptions.set(optionId, value);
        }
        this._onDidChange.fire('options');
        this._onDidChange.fire('disabled');
        this.chatSessionsService.notifySessionOptionsChange(this.resource, [{ optionId, value }]).catch((err) => this.logService.error(`Failed to notify extension of ${optionId} change:`, err));
    }
    // --- Option group accessors ---
    getModelOptionGroup() {
        const groups = this._getOptionGroups();
        if (!groups) {
            return undefined;
        }
        const group = groups.find(g => isModelOptionGroup(g));
        if (!group) {
            return undefined;
        }
        return { group, value: this._getValueForGroup(group) };
    }
    getOtherOptionGroups() {
        const groups = this._getOptionGroups();
        if (!groups) {
            return [];
        }
        return groups
            .filter(g => !isModelOptionGroup(g) && !isRepositoriesOptionGroup(g) && this._isOptionGroupVisible(g))
            .map(g => ({ group: g, value: this._getValueForGroup(g) }));
    }
    getOptionValue(groupId) {
        return this.selectedOptions.get(groupId);
    }
    setOptionValue(groupId, value) {
        this.setOption(groupId, value);
    }
    // --- Internals ---
    _getOptionGroups() {
        return this.chatSessionsService.getOptionGroupsForSessionType(this.target);
    }
    _isOptionGroupVisible(group) {
        if (!group.when) {
            return true;
        }
        const expr = ContextKeyExpr.deserialize(group.when);
        return !expr || this.contextKeyService.contextMatchesRules(expr);
    }
    _updateWhenClauseKeys() {
        this._whenClauseKeys.clear();
        const groups = this._getOptionGroups();
        if (!groups) {
            return;
        }
        for (const group of groups) {
            if (group.when) {
                const expr = ContextKeyExpr.deserialize(group.when);
                if (expr) {
                    for (const key of expr.keys()) {
                        this._whenClauseKeys.add(key);
                    }
                }
            }
        }
    }
    _getValueForGroup(group) {
        const selected = this.selectedOptions.get(group.id);
        if (selected) {
            return selected;
        }
        // Check for extension-set session option
        const sessionOption = this.chatSessionsService.getSessionOption(this.resource, group.id);
        if (sessionOption && typeof sessionOption !== 'string') {
            return sessionOption;
        }
        if (typeof sessionOption === 'string') {
            const item = group.items.find(i => i.id === sessionOption.trim());
            if (item) {
                return item;
            }
        }
        // Default to first item marked as default, or first item
        return group.items.find(i => i.default === true) ?? group.items[0];
    }
};
RemoteNewSession = __decorate([
    __param(2, IChatSessionsService),
    __param(3, IContextKeyService),
    __param(4, ILogService)
], RemoteNewSession);
export { RemoteNewSession };
function isModelOptionGroup(group) {
    if (group.id === 'models') {
        return true;
    }
    const nameLower = group.name.toLowerCase();
    return nameLower === 'model' || nameLower === 'models';
}
function isRepositoriesOptionGroup(group) {
    return group.id === 'repositories';
}
//# sourceMappingURL=newSession.js.map