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
import { Disposable, toDisposable } from '../../../../base/common/lifecycle.js';
import { dirname, basename } from '../../../../base/common/resources.js';
import { URI } from '../../../../base/common/uri.js';
import { IRemoteAgentHostService } from '../../../../platform/agentHost/common/remoteAgentHostService.js';
import { createFileSystemProviderError, FilePermission, FileSystemProviderErrorCode, FileType, } from '../../../../platform/files/common/files.js';
/**
 * The URI scheme used for browsing remote agent host filesystems.
 * URIs are structured as `agenthost://{sanitizedAddress}/path/on/remote`.
 */
export const AGENT_HOST_FS_SCHEME = 'agenthost';
/**
 * Build an agenthost URI for a given address and path.
 */
export function agentHostUri(authority, path) {
    return URI.from({ scheme: AGENT_HOST_FS_SCHEME, authority, path: path || '/' });
}
/**
 * Extract the remote filesystem path from an agenthost URI.
 * This is the inverse of {@link agentHostUri} -- the path component
 * of the URI is the path on the remote machine.
 */
export function agentHostRemotePath(uri) {
    return uri.path;
}
/**
 * Read-only {@link IFileSystemProvider} that proxies `stat` and `readdir`
 * calls through the agent host protocol's `browseDirectory` RPC.
 *
 * Registered once under the {@link AGENT_HOST_FS_SCHEME} scheme. Individual
 * connections are identified by the URI's authority component, which is
 * the sanitized remote address.
 */
let AgentHostFileSystemProvider = class AgentHostFileSystemProvider extends Disposable {
    constructor(_remoteAgentHostService) {
        super();
        this._remoteAgentHostService = _remoteAgentHostService;
        this.capabilities = 2048 /* FileSystemProviderCapabilities.Readonly */ |
            1024 /* FileSystemProviderCapabilities.PathCaseSensitive */ |
            2 /* FileSystemProviderCapabilities.FileReadWrite */; // required for the file service to resolve directory contents
        this._onDidChangeCapabilities = this._register(new Emitter());
        this.onDidChangeCapabilities = this._onDidChangeCapabilities.event;
        this._onDidChangeFile = this._register(new Emitter());
        this.onDidChangeFile = this._onDidChangeFile.event;
        this._authorityToAddress = new Map();
    }
    /**
     * Register a mapping from a URI authority to a remote address.
     * Returns a disposable that unregisters the mapping.
     */
    registerAuthority(authority, address) {
        this._authorityToAddress.set(authority, address);
        return toDisposable(() => this._authorityToAddress.delete(authority));
    }
    watch() {
        return Disposable.None;
    }
    async stat(resource) {
        const path = resource.path;
        // Root directory
        if (path === '/' || path === '') {
            return { type: FileType.Directory, mtime: 0, ctime: 0, size: 0, permissions: FilePermission.Readonly };
        }
        // Use URI dirname/basename to find the parent and entry name
        const parentUri = dirname(resource);
        const name = basename(resource);
        const entries = await this._listDirectory(resource.authority, parentUri);
        const entry = entries.find(e => e.name === name);
        if (!entry) {
            throw createFileSystemProviderError(`File not found: ${path}`, FileSystemProviderErrorCode.FileNotFound);
        }
        return {
            type: entry.type === 'directory' ? FileType.Directory : FileType.File,
            mtime: 0,
            ctime: 0,
            size: 0,
            permissions: FilePermission.Readonly,
        };
    }
    async readdir(resource) {
        const entries = await this._listDirectory(resource.authority, resource);
        return entries.map(e => [e.name, e.type === 'directory' ? FileType.Directory : FileType.File]);
    }
    // ---- Read-only stubs (required by interface) ----------------------------
    async readFile() {
        throw createFileSystemProviderError('readFile not supported on remote agent host filesystem', FileSystemProviderErrorCode.NoPermissions);
    }
    async writeFile(_resource, _content, _opts) {
        throw createFileSystemProviderError('writeFile not supported on remote agent host filesystem', FileSystemProviderErrorCode.NoPermissions);
    }
    async mkdir() {
        throw createFileSystemProviderError('mkdir not supported on remote agent host filesystem', FileSystemProviderErrorCode.NoPermissions);
    }
    async delete(_resource, _opts) {
        throw createFileSystemProviderError('delete not supported on remote agent host filesystem', FileSystemProviderErrorCode.NoPermissions);
    }
    async rename(_from, _to, _opts) {
        throw createFileSystemProviderError('rename not supported on remote agent host filesystem', FileSystemProviderErrorCode.NoPermissions);
    }
    // ---- Internals ----------------------------------------------------------
    _getConnection(authority) {
        const address = this._authorityToAddress.get(authority);
        if (!address) {
            throw createFileSystemProviderError(`No connection for authority: ${authority}`, FileSystemProviderErrorCode.Unavailable);
        }
        const connection = this._remoteAgentHostService.getConnection(address);
        if (!connection) {
            throw createFileSystemProviderError(`Connection unavailable: ${address}`, FileSystemProviderErrorCode.Unavailable);
        }
        return connection;
    }
    async _listDirectory(authority, resource) {
        const connection = this._getConnection(authority);
        try {
            // Convert the agenthost URI to a file URI for the remote server
            const remoteUri = URI.from({ scheme: 'file', path: resource.path || '/' });
            const result = await connection.browseDirectory(remoteUri);
            return result.entries;
        }
        catch (err) {
            throw createFileSystemProviderError(err instanceof Error ? err.message : String(err), FileSystemProviderErrorCode.Unavailable);
        }
    }
};
AgentHostFileSystemProvider = __decorate([
    __param(0, IRemoteAgentHostService)
], AgentHostFileSystemProvider);
export { AgentHostFileSystemProvider };
//# sourceMappingURL=agentHostFileSystemProvider.js.map