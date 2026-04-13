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
var ExtHostGitExtensionService_1;
import { Event } from '../../../base/common/event.js';
import { Disposable, DisposableStore } from '../../../base/common/lifecycle.js';
import { URI } from '../../../base/common/uri.js';
import { ExtensionIdentifier } from '../../../platform/extensions/common/extensions.js';
import { createDecorator } from '../../../platform/instantiation/common/instantiation.js';
import { IExtHostExtensionService } from './extHostExtensionService.js';
import { IExtHostRpcService } from './extHostRpcService.js';
import { GitRefTypeDto, MainContext } from './extHost.protocol.js';
import { ResourceMap } from '../../../base/common/map.js';
const GIT_EXTENSION_ID = 'vscode.git';
function toGitRefTypeDto(type) {
    switch (type) {
        case 0 /* GitRefType.Head */: return GitRefTypeDto.Head;
        case 1 /* GitRefType.RemoteHead */: return GitRefTypeDto.RemoteHead;
        case 2 /* GitRefType.Tag */: return GitRefTypeDto.Tag;
        default: throw new Error(`Unknown GitRefType: ${type}`);
    }
}
function toGitBranchDto(branch) {
    return {
        name: branch.name,
        commit: branch.commit,
        type: toGitRefTypeDto(branch.type),
        remote: branch.remote,
        base: branch.base,
        upstream: branch.upstream ? toGitUpstreamRefDto(branch.upstream) : undefined,
        ahead: branch.ahead,
        behind: branch.behind,
    };
}
function toGitUpstreamRefDto(upstream) {
    return {
        remote: upstream.remote,
        name: upstream.name,
        commit: upstream.commit,
    };
}
// Status values from the git extension's const enum Status
var GitStatus;
(function (GitStatus) {
    GitStatus[GitStatus["INDEX_ADDED"] = 1] = "INDEX_ADDED";
    GitStatus[GitStatus["INDEX_DELETED"] = 2] = "INDEX_DELETED";
    GitStatus[GitStatus["INDEX_RENAMED"] = 3] = "INDEX_RENAMED";
    GitStatus[GitStatus["MODIFIED"] = 5] = "MODIFIED";
    GitStatus[GitStatus["DELETED"] = 6] = "DELETED";
    GitStatus[GitStatus["UNTRACKED"] = 7] = "UNTRACKED";
    GitStatus[GitStatus["INTENT_TO_ADD"] = 9] = "INTENT_TO_ADD";
    GitStatus[GitStatus["INTENT_TO_RENAME"] = 10] = "INTENT_TO_RENAME";
})(GitStatus || (GitStatus = {}));
function toGitChangeDto(change) {
    switch (change.status) {
        // Added: no original
        case 1 /* GitStatus.INDEX_ADDED */:
        case 7 /* GitStatus.UNTRACKED */:
        case 9 /* GitStatus.INTENT_TO_ADD */:
            return { uri: change.uri, originalUri: undefined, modifiedUri: change.uri };
        // Deleted: no modified
        case 2 /* GitStatus.INDEX_DELETED */:
        case 6 /* GitStatus.DELETED */:
            return { uri: change.uri, originalUri: change.uri, modifiedUri: undefined };
        // Renamed: original is old name, modified is new name
        case 3 /* GitStatus.INDEX_RENAMED */:
        case 10 /* GitStatus.INTENT_TO_RENAME */:
            return { uri: change.uri, originalUri: change.originalUri, modifiedUri: change.renameUri };
        // Modified and everything else: both original and modified
        default:
            return { uri: change.uri, originalUri: change.originalUri, modifiedUri: change.uri };
    }
}
var GitRefType;
(function (GitRefType) {
    GitRefType[GitRefType["Head"] = 0] = "Head";
    GitRefType[GitRefType["RemoteHead"] = 1] = "RemoteHead";
    GitRefType[GitRefType["Tag"] = 2] = "Tag";
})(GitRefType || (GitRefType = {}));
export const IExtHostGitExtensionService = createDecorator('IExtHostGitExtensionService');
let ExtHostGitExtensionService = class ExtHostGitExtensionService extends Disposable {
    static { ExtHostGitExtensionService_1 = this; }
    static { this._handlePool = 0; }
    constructor(extHostRpc, _extHostExtensionService) {
        super();
        this._extHostExtensionService = _extHostExtensionService;
        this._repositories = new Map();
        this._repositoryByUri = new ResourceMap();
        this._disposables = this._register(new DisposableStore());
        this._proxy = extHostRpc.getProxy(MainContext.MainThreadGitExtension);
    }
    async $isGitExtensionAvailable() {
        const registry = await this._extHostExtensionService.getExtensionRegistry();
        return !!registry.getExtensionDescription(GIT_EXTENSION_ID);
    }
    async $openRepository(uri) {
        const api = await this._ensureGitApi();
        if (!api) {
            return undefined;
        }
        const repository = await api.openRepository(URI.revive(uri));
        if (!repository) {
            return undefined;
        }
        const existingHandle = this._repositoryByUri.get(repository.rootUri);
        if (existingHandle !== undefined) {
            const state = await this._getRepositoryState(repository);
            return { handle: existingHandle, rootUri: repository.rootUri, state };
        }
        let repositoryState = repository.state;
        if (repositoryState.HEAD === undefined) {
            // Opening the repository does not wait for the repository state to be
            // initialized so we need to wait for the first change event to ensure
            // that the repository state is fully loaded before we return it to the
            // main thread.
            await Event.toPromise(repositoryState.onDidChange, this._disposables);
            repositoryState = repository.state;
        }
        // Store the repository and its handle in the maps
        const handle = ExtHostGitExtensionService_1._handlePool++;
        this._repositories.set(handle, repository);
        this._repositoryByUri.set(repository.rootUri, handle);
        // Subscribe to repository state changes
        this._disposables.add(repository.state.onDidChange(() => {
            this._proxy.$onDidChangeRepository(handle);
        }));
        const state = await this._getRepositoryState(repository);
        return { handle, rootUri: repository.rootUri, state };
    }
    async $getRefs(handle, query, token) {
        const repository = this._repositories.get(handle);
        if (!repository) {
            return [];
        }
        try {
            const refs = await repository.getRefs(query, token);
            const result = refs.map(ref => {
                if (!ref.name || !ref.commit) {
                    return undefined;
                }
                const id = ref.type === 0 /* GitRefType.Head */
                    ? `refs/heads/${ref.name}`
                    : ref.type === 1 /* GitRefType.RemoteHead */
                        ? `refs/remotes/${ref.remote}/${ref.name}`
                        : `refs/tags/${ref.name}`;
                return {
                    id,
                    name: ref.name,
                    type: toGitRefTypeDto(ref.type),
                    revision: ref.commit
                };
            });
            return result.filter(ref => !!ref);
        }
        catch {
            return [];
        }
    }
    async $getRepositoryState(handle) {
        const repository = this._repositories.get(handle);
        if (!repository) {
            return undefined;
        }
        return this._getRepositoryState(repository);
    }
    async _getRepositoryState(repository) {
        const state = repository.state;
        // Base branch
        const base = await this._getBranchBase(repository);
        return {
            HEAD: state.HEAD ? toGitBranchDto({ ...state.HEAD, base }) : undefined,
            mergeChanges: state.mergeChanges.map(toGitChangeDto),
            indexChanges: state.indexChanges.map(toGitChangeDto),
            workingTreeChanges: state.workingTreeChanges.map(toGitChangeDto),
            untrackedChanges: state.untrackedChanges.map(toGitChangeDto),
        };
    }
    async _getBranchBase(repository) {
        const state = repository.state;
        if (!state.HEAD?.name) {
            return undefined;
        }
        const baseBranch = await repository.getBranchBase(state.HEAD.name);
        if (!baseBranch?.name) {
            return undefined;
        }
        const isProtected = repository.isBranchProtected(baseBranch);
        return { name: baseBranch.name, isProtected };
    }
    async $diffBetweenWithStats(handle, ref1, ref2, path) {
        const repository = this._repositories.get(handle);
        if (!repository) {
            return [];
        }
        try {
            const changes = await repository.diffBetweenWithStats(ref1, ref2, path);
            return changes.map(c => ({
                ...toGitChangeDto(c),
                insertions: c.insertions,
                deletions: c.deletions,
            }));
        }
        catch {
            return [];
        }
    }
    async $diffBetweenWithStats2(handle, ref, path) {
        const repository = this._repositories.get(handle);
        if (!repository) {
            return [];
        }
        try {
            const changes = await repository.diffBetweenWithStats2(ref, path);
            return changes.map(c => ({
                ...toGitChangeDto(c),
                insertions: c.insertions,
                deletions: c.deletions,
            }));
        }
        catch {
            return [];
        }
    }
    async _ensureGitApi() {
        if (this._gitApi) {
            return this._gitApi;
        }
        try {
            await this._extHostExtensionService.activateByIdWithErrors(new ExtensionIdentifier(GIT_EXTENSION_ID), { startup: false, extensionId: new ExtensionIdentifier(GIT_EXTENSION_ID), activationEvent: 'api' });
            const exports = this._extHostExtensionService.getExtensionExports(new ExtensionIdentifier(GIT_EXTENSION_ID));
            if (!!exports && typeof exports.getAPI === 'function') {
                this._gitApi = exports.getAPI(1);
            }
        }
        catch {
            // Git extension not available
        }
        return this._gitApi;
    }
    dispose() {
        this._disposables.dispose();
        super.dispose();
    }
};
ExtHostGitExtensionService = ExtHostGitExtensionService_1 = __decorate([
    __param(0, IExtHostRpcService),
    __param(1, IExtHostExtensionService)
], ExtHostGitExtensionService);
export { ExtHostGitExtensionService };
//# sourceMappingURL=extHostGitExtensionService.js.map