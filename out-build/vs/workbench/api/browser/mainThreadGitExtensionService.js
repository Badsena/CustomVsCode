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
import { Sequencer } from '../../../base/common/async.js';
import { Disposable } from '../../../base/common/lifecycle.js';
import { ResourceMap } from '../../../base/common/map.js';
import { URI } from '../../../base/common/uri.js';
import { GitRepository } from '../../contrib/git/browser/gitService.js';
import { IGitService, GitRefType } from '../../contrib/git/common/gitService.js';
import { extHostNamedCustomer } from '../../services/extensions/common/extHostCustomers.js';
import { ExtHostContext, GitRefTypeDto, MainContext } from '../common/extHost.protocol.js';
function toGitRefType(type) {
    switch (type) {
        case GitRefTypeDto.Head: return GitRefType.Head;
        case GitRefTypeDto.RemoteHead: return GitRefType.RemoteHead;
        case GitRefTypeDto.Tag: return GitRefType.Tag;
        default: throw new Error(`Unknown GitRefType: ${type}`);
    }
}
function toGitDiffChange(dto) {
    return {
        uri: URI.revive(dto.uri),
        originalUri: dto.originalUri ? URI.revive(dto.originalUri) : undefined,
        modifiedUri: dto.modifiedUri ? URI.revive(dto.modifiedUri) : undefined,
        insertions: dto.insertions,
        deletions: dto.deletions,
    };
}
function toGitRepositoryState(dto) {
    return {
        HEAD: dto?.HEAD ? {
            type: toGitRefType(dto.HEAD.type),
            name: dto.HEAD.name,
            commit: dto.HEAD.commit,
            remote: dto.HEAD.remote,
            base: dto.HEAD.base,
            upstream: dto.HEAD.upstream,
            ahead: dto.HEAD.ahead,
            behind: dto.HEAD.behind,
        } : undefined,
        mergeChanges: dto?.mergeChanges?.map(c => ({
            uri: URI.revive(c.uri),
            originalUri: c.originalUri ? URI.revive(c.originalUri) : undefined,
            modifiedUri: c.modifiedUri ? URI.revive(c.modifiedUri) : undefined,
        })) ?? [],
        indexChanges: dto?.indexChanges?.map(c => ({
            uri: URI.revive(c.uri),
            originalUri: c.originalUri ? URI.revive(c.originalUri) : undefined,
            modifiedUri: c.modifiedUri ? URI.revive(c.modifiedUri) : undefined,
        })) ?? [],
        workingTreeChanges: dto?.workingTreeChanges?.map(c => ({
            uri: URI.revive(c.uri),
            originalUri: c.originalUri ? URI.revive(c.originalUri) : undefined,
            modifiedUri: c.modifiedUri ? URI.revive(c.modifiedUri) : undefined,
        })) ?? [],
        untrackedChanges: dto?.untrackedChanges?.map(c => ({
            uri: URI.revive(c.uri),
            originalUri: c.originalUri ? URI.revive(c.originalUri) : undefined,
            modifiedUri: c.modifiedUri ? URI.revive(c.modifiedUri) : undefined,
        })) ?? [],
    };
}
let MainThreadGitExtensionService = class MainThreadGitExtensionService extends Disposable {
    get repositories() {
        return this._repositories.values();
    }
    constructor(extHostContext, gitService) {
        super();
        this.gitService = gitService;
        this._openRepositorySequencer = new Sequencer();
        this._repositoryHandles = new ResourceMap();
        this._repositories = new Map();
        this._proxy = extHostContext.getProxy(ExtHostContext.ExtHostGitExtension);
        this._initializeDelegate();
    }
    async _initializeDelegate() {
        // Check whether the vscode.git extension is available in the extension host
        // process before setting the delegate. The delegate should only be set once,
        // for the extension host process that runs the vscode.git extension
        const isExtensionAvailable = await this._proxy.$isGitExtensionAvailable();
        if (isExtensionAvailable && !this._store.isDisposed) {
            this._register(this.gitService.setDelegate(this));
        }
    }
    _getRepositoryByUri(uri) {
        const handle = this._repositoryHandles.get(uri);
        return handle !== undefined ? this._repositories.get(handle) : undefined;
    }
    async openRepository(uri) {
        return this._openRepositorySequencer.queue(async () => {
            // Check if we already have a repository for the given URI
            const existingRepository = this._getRepositoryByUri(uri);
            if (existingRepository) {
                return existingRepository;
            }
            // Open the repository
            const result = await this._proxy.$openRepository(uri);
            if (!result) {
                return undefined;
            }
            const repositoryRootUri = URI.revive(result.rootUri);
            // Check if we already have a repository for the given root
            const existingRepositoryForRoot = this._getRepositoryByUri(repositoryRootUri);
            if (existingRepositoryForRoot) {
                return existingRepositoryForRoot;
            }
            // Create a new repository and store it in the maps
            const state = toGitRepositoryState(result.state);
            const repository = new GitRepository(repositoryRootUri, state, this);
            this._repositories.set(result.handle, repository);
            this._repositoryHandles.set(repositoryRootUri, result.handle);
            return repository;
        });
    }
    async getRefs(root, query, token) {
        const handle = this._repositoryHandles.get(root);
        if (handle === undefined) {
            return [];
        }
        const result = await this._proxy.$getRefs(handle, query, token);
        if (token?.isCancellationRequested) {
            return [];
        }
        return result.map(ref => ({
            ...ref,
            type: toGitRefType(ref.type)
        }));
    }
    async diffBetweenWithStats(root, ref1, ref2, path) {
        const handle = this._repositoryHandles.get(root);
        if (handle === undefined) {
            return [];
        }
        const result = await this._proxy.$diffBetweenWithStats(handle, ref1, ref2, path);
        return result.map(toGitDiffChange);
    }
    async diffBetweenWithStats2(root, ref, path) {
        const handle = this._repositoryHandles.get(root);
        if (handle === undefined) {
            return [];
        }
        const result = await this._proxy.$diffBetweenWithStats2(handle, ref, path);
        return result.map(toGitDiffChange);
    }
    async $onDidChangeRepository(handle) {
        const repository = this._repositories.get(handle);
        if (!repository) {
            return;
        }
        const state = await this._proxy.$getRepositoryState(handle);
        if (!state) {
            return;
        }
        // Update the repository state
        repository.updateState(toGitRepositoryState(state));
    }
};
MainThreadGitExtensionService = __decorate([
    extHostNamedCustomer(MainContext.MainThreadGitExtension),
    __param(1, IGitService)
], MainThreadGitExtensionService);
export { MainThreadGitExtensionService };
//# sourceMappingURL=mainThreadGitExtensionService.js.map