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
var GitHubFileSystemProvider_1;
import { Emitter } from '../../../../base/common/event.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { FileSystemProviderErrorCode, FileType, createFileSystemProviderError } from '../../../../platform/files/common/files.js';
import { IRequestService, asJson } from '../../../../platform/request/common/request.js';
import { IAuthenticationService } from '../../../../workbench/services/authentication/common/authentication.js';
import { CancellationToken } from '../../../../base/common/cancellation.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { GITHUB_REMOTE_FILE_SCHEME } from '../../sessions/common/sessionWorkspace.js';
/**
 * Derives a display name from a github-remote-file URI.
 * Returns "repo (branch)" or just "repo" when on HEAD.
 */
export function getGitHubRemoteFileDisplayName(uri) {
    if (uri.scheme !== GITHUB_REMOTE_FILE_SCHEME) {
        return undefined;
    }
    const parts = uri.path.split('/').filter(Boolean);
    // path = /{owner}/{repo}/{ref}/...
    if (parts.length >= 3) {
        const [, repo, ref] = parts;
        const decodedRepo = decodeURIComponent(repo);
        const decodedRef = decodeURIComponent(ref);
        if (decodedRef === 'HEAD') {
            return decodedRepo;
        }
        return `${decodedRepo} (${decodedRef})`;
    }
    return undefined;
}
/**
 * A readonly virtual filesystem provider backed by the GitHub REST API.
 *
 * URI format: github-remote-file://github/{owner}/{repo}/{ref}/{path...}
 *
 * For example: github-remote-file://github/microsoft/vscode/main/src/vs/base/common/uri.ts
 *
 * This provider fetches the full recursive tree from the GitHub Trees API on first
 * access and caches it. Individual file contents are fetched on demand via the
 * Blobs API.
 */
let GitHubFileSystemProvider = class GitHubFileSystemProvider extends Disposable {
    static { GitHubFileSystemProvider_1 = this; }
    /** Cache TTL - 5 minutes */
    static { this.CACHE_TTL_MS = 5 * 60 * 1000; }
    /** Negative cache TTL - 1 minute */
    static { this.NOT_FOUND_CACHE_TTL_MS = 60 * 1000; }
    constructor(requestService, authenticationService, logService) {
        super();
        this.requestService = requestService;
        this.authenticationService = authenticationService;
        this.logService = logService;
        this._onDidChangeCapabilities = this._register(new Emitter());
        this.onDidChangeCapabilities = this._onDidChangeCapabilities.event;
        this.capabilities = 2048 /* FileSystemProviderCapabilities.Readonly */ |
            2 /* FileSystemProviderCapabilities.FileReadWrite */ |
            1024 /* FileSystemProviderCapabilities.PathCaseSensitive */;
        this._onDidChangeFile = this._register(new Emitter());
        this.onDidChangeFile = this._onDidChangeFile.event;
        /** Cache keyed by "owner/repo/ref" */
        this.treeCache = new Map();
        /** Negative cache for refs that returned 404, keyed by "owner/repo/ref" */
        this.notFoundCache = new Map();
        /** In-flight fetch promises keyed by "owner/repo/ref" to deduplicate concurrent requests */
        this.pendingFetches = new Map();
    }
    // --- URI parsing
    /**
     * Parse a github-remote-file URI into its components.
     * Format: github-remote-file://github/{owner}/{repo}/{ref}/{path...}
     */
    parseUri(resource) {
        // authority = "github"
        // path = /{owner}/{repo}/{ref}/{rest...}
        const parts = resource.path.split('/').filter(Boolean);
        if (parts.length < 3) {
            throw createFileSystemProviderError('Invalid github-remote-file URI: expected /{owner}/{repo}/{ref}/...', FileSystemProviderErrorCode.FileNotFound);
        }
        const owner = decodeURIComponent(parts[0]);
        const repo = decodeURIComponent(parts[1]);
        const ref = decodeURIComponent(parts[2]);
        const path = parts.slice(3).map(decodeURIComponent).join('/');
        return { owner, repo, ref, path };
    }
    getCacheKey(owner, repo, ref) {
        return `${owner}/${repo}/${ref}`;
    }
    // --- GitHub API
    async getAuthToken() {
        let sessions = await this.authenticationService.getSessions('github', [], { silent: true });
        if (!sessions || sessions.length === 0) {
            sessions = await this.authenticationService.getSessions('github', [], { createIfNone: true });
        }
        if (!sessions || sessions.length === 0) {
            throw createFileSystemProviderError('No GitHub authentication sessions available', FileSystemProviderErrorCode.Unavailable);
        }
        return sessions[0].accessToken ?? '';
    }
    fetchTree(owner, repo, ref) {
        const cacheKey = this.getCacheKey(owner, repo, ref);
        // Check positive cache
        const cached = this.treeCache.get(cacheKey);
        if (cached && (Date.now() - cached.fetchedAt) < GitHubFileSystemProvider_1.CACHE_TTL_MS) {
            return Promise.resolve(cached);
        }
        // Check negative cache (recently returned 404)
        const notFoundAt = this.notFoundCache.get(cacheKey);
        if (notFoundAt !== undefined && (Date.now() - notFoundAt) < GitHubFileSystemProvider_1.NOT_FOUND_CACHE_TTL_MS) {
            return Promise.reject(createFileSystemProviderError(`Tree not found for ${owner}/${repo}@${ref}`, FileSystemProviderErrorCode.FileNotFound));
        }
        // Deduplicate concurrent requests for the same tree
        const pending = this.pendingFetches.get(cacheKey);
        if (pending) {
            return pending;
        }
        const promise = this.doFetchTree(owner, repo, ref, cacheKey).finally(() => {
            this.pendingFetches.delete(cacheKey);
        });
        this.pendingFetches.set(cacheKey, promise);
        return promise;
    }
    async doFetchTree(owner, repo, ref, cacheKey) {
        this.logService.info(`[SessionRepoFS] Fetching tree for ${owner}/${repo}@${ref}`);
        const token = await this.getAuthToken();
        const url = `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/git/trees/${encodeURIComponent(ref)}?recursive=1`;
        const response = await this.requestService.request({
            type: 'GET',
            url,
            headers: {
                'Authorization': `token ${token}`,
                'Accept': 'application/vnd.github.v3+json',
                'User-Agent': 'VSCode-SessionRepoFS',
            },
            callSite: 'githubFileSystemProvider.fetchTree'
        }, CancellationToken.None);
        // Cache 404s so we don't keep re-fetching missing trees
        if (response.res.statusCode === 404) {
            this.notFoundCache.set(cacheKey, Date.now());
            throw createFileSystemProviderError(`Tree not found for ${owner}/${repo}@${ref}`, FileSystemProviderErrorCode.FileNotFound);
        }
        const data = await asJson(response);
        if (!data) {
            throw createFileSystemProviderError(`Failed to fetch tree for ${owner}/${repo}@${ref}`, FileSystemProviderErrorCode.Unavailable);
        }
        const entries = new Map();
        // Add root directory entry
        entries.set('', { type: FileType.Directory, size: 0, sha: data.sha });
        // Track directories implicitly from paths
        const dirs = new Set();
        for (const entry of data.tree) {
            const fileType = entry.type === 'tree' ? FileType.Directory : FileType.File;
            entries.set(entry.path, { type: fileType, size: entry.size ?? 0, sha: entry.sha });
            if (fileType === FileType.Directory) {
                dirs.add(entry.path);
            }
            // Ensure parent directories are tracked
            const pathParts = entry.path.split('/');
            for (let i = 1; i < pathParts.length; i++) {
                const parentPath = pathParts.slice(0, i).join('/');
                if (!dirs.has(parentPath)) {
                    dirs.add(parentPath);
                    if (!entries.has(parentPath)) {
                        entries.set(parentPath, { type: FileType.Directory, size: 0, sha: '' });
                    }
                }
            }
        }
        const cacheEntry = { entries, fetchedAt: Date.now() };
        this.treeCache.set(cacheKey, cacheEntry);
        return cacheEntry;
    }
    // --- IFileSystemProvider
    async stat(resource) {
        const { owner, repo, ref, path } = this.parseUri(resource);
        const tree = await this.fetchTree(owner, repo, ref);
        const entry = tree.entries.get(path);
        if (!entry) {
            throw createFileSystemProviderError('File not found', FileSystemProviderErrorCode.FileNotFound);
        }
        return {
            type: entry.type,
            ctime: 0,
            mtime: 0,
            size: entry.size,
        };
    }
    async readdir(resource) {
        const { owner, repo, ref, path } = this.parseUri(resource);
        const tree = await this.fetchTree(owner, repo, ref);
        const prefix = path ? path + '/' : '';
        const result = [];
        for (const [entryPath, entry] of tree.entries) {
            if (!entryPath.startsWith(prefix)) {
                continue;
            }
            const relativePath = entryPath.slice(prefix.length);
            // Only include direct children (no nested paths)
            if (relativePath && !relativePath.includes('/')) {
                result.push([relativePath, entry.type]);
            }
        }
        return result;
    }
    async readFile(resource) {
        const { owner, repo, ref, path } = this.parseUri(resource);
        const tree = await this.fetchTree(owner, repo, ref);
        const entry = tree.entries.get(path);
        if (!entry || entry.type === FileType.Directory) {
            throw createFileSystemProviderError('File not found', FileSystemProviderErrorCode.FileNotFound);
        }
        const token = await this.getAuthToken();
        // Fetch file content via the Blobs API
        const url = `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/git/blobs/${encodeURIComponent(entry.sha)}`;
        const response = await this.requestService.request({
            type: 'GET',
            url,
            headers: {
                'Authorization': `token ${token}`,
                'Accept': 'application/vnd.github.v3+json',
                'User-Agent': 'VSCode-SessionRepoFS',
            },
            callSite: 'githubFileSystemProvider.readFile'
        }, CancellationToken.None);
        const data = await asJson(response);
        if (!data) {
            throw createFileSystemProviderError(`Failed to read file ${path}`, FileSystemProviderErrorCode.Unavailable);
        }
        if (data.encoding === 'base64') {
            const binaryString = atob(data.content.replace(/\n/g, ''));
            const bytes = new Uint8Array(binaryString.length);
            for (let i = 0; i < binaryString.length; i++) {
                bytes[i] = binaryString.charCodeAt(i);
            }
            return bytes;
        }
        return new TextEncoder().encode(data.content);
    }
    // --- Readonly stubs
    watch() {
        return Disposable.None;
    }
    async writeFile(_resource, _content, _opts) {
        throw createFileSystemProviderError('Operation not supported', FileSystemProviderErrorCode.NoPermissions);
    }
    async mkdir(_resource) {
        throw createFileSystemProviderError('Operation not supported', FileSystemProviderErrorCode.NoPermissions);
    }
    async delete(_resource, _opts) {
        throw createFileSystemProviderError('Operation not supported', FileSystemProviderErrorCode.NoPermissions);
    }
    async rename(_from, _to, _opts) {
        throw createFileSystemProviderError('Operation not supported', FileSystemProviderErrorCode.NoPermissions);
    }
    // --- Cache management
    invalidateCache(owner, repo, ref) {
        const cacheKey = this.getCacheKey(owner, repo, ref);
        this.treeCache.delete(cacheKey);
        this.notFoundCache.delete(cacheKey);
    }
    dispose() {
        this.treeCache.clear();
        this.notFoundCache.clear();
        this.pendingFetches.clear();
        super.dispose();
    }
};
GitHubFileSystemProvider = GitHubFileSystemProvider_1 = __decorate([
    __param(0, IRequestService),
    __param(1, IAuthenticationService),
    __param(2, ILogService)
], GitHubFileSystemProvider);
export { GitHubFileSystemProvider };
//# sourceMappingURL=githubFileSystemProvider.js.map