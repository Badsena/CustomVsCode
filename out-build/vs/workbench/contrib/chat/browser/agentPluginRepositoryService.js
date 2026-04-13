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
import { Action } from '../../../../base/common/actions.js';
import { SequencerByKey } from '../../../../base/common/async.js';
import { Lazy } from '../../../../base/common/lazy.js';
import { revive } from '../../../../base/common/marshalling.js';
import { dirname, isEqual, isEqualOrParent, joinPath } from '../../../../base/common/resources.js';
import { localize } from '../../../../nls.js';
import { ICommandService } from '../../../../platform/commands/common/commands.js';
import { IEnvironmentService } from '../../../../platform/environment/common/environment.js';
import { IFileService } from '../../../../platform/files/common/files.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { INotificationService, Severity } from '../../../../platform/notification/common/notification.js';
import { IProgressService } from '../../../../platform/progress/common/progress.js';
import { IStorageService } from '../../../../platform/storage/common/storage.js';
import { GitHubPluginSource, GitUrlPluginSource, NpmPluginSource, PipPluginSource, RelativePathPluginSource } from './pluginSources.js';
const MARKETPLACE_INDEX_STORAGE_KEY = 'chat.plugins.marketplaces.index.v1';
let AgentPluginRepositoryService = class AgentPluginRepositoryService {
    constructor(_commandService, environmentService, _fileService, instantiationService, _logService, _notificationService, _progressService, _storageService) {
        this._commandService = _commandService;
        this._fileService = _fileService;
        this._logService = _logService;
        this._notificationService = _notificationService;
        this._progressService = _progressService;
        this._storageService = _storageService;
        this._marketplaceIndex = new Lazy(() => this._loadMarketplaceIndex());
        this._cloneSequencer = new SequencerByKey();
        this._cacheRoot = joinPath(environmentService.cacheHome, 'agentPlugins');
        // Build per-kind source repository map via instantiation service so
        // each repository can inject its own dependencies.
        this._pluginSources = new Map([
            ["relativePath" /* PluginSourceKind.RelativePath */, new RelativePathPluginSource()],
            ["github" /* PluginSourceKind.GitHub */, instantiationService.createInstance(GitHubPluginSource)],
            ["url" /* PluginSourceKind.GitUrl */, instantiationService.createInstance(GitUrlPluginSource)],
            ["npm" /* PluginSourceKind.Npm */, instantiationService.createInstance(NpmPluginSource)],
            ["pip" /* PluginSourceKind.Pip */, instantiationService.createInstance(PipPluginSource)],
        ]);
    }
    getPluginSource(kind) {
        const repo = this._pluginSources.get(kind);
        if (!repo) {
            throw new Error(`No source repository registered for kind '${kind}'`);
        }
        return repo;
    }
    getRepositoryUri(marketplace, marketplaceType) {
        if (marketplace.kind === "localFileUri" /* MarketplaceReferenceKind.LocalFileUri */ && marketplace.localRepositoryUri) {
            return marketplace.localRepositoryUri;
        }
        const indexed = this._marketplaceIndex.value.get(marketplace.canonicalId);
        if (indexed?.repositoryUri) {
            return indexed.repositoryUri;
        }
        return this._getRepoCacheDirForReference(marketplace);
    }
    getPluginInstallUri(plugin) {
        const repoDir = this.getRepositoryUri(plugin.marketplaceReference, plugin.marketplaceType);
        return this._getPluginDir(repoDir, plugin.source);
    }
    async ensureRepository(marketplace, options) {
        const repoDir = this.getRepositoryUri(marketplace, options?.marketplaceType);
        return this._cloneSequencer.queue(repoDir.fsPath, async () => {
            const repoExists = await this._fileService.exists(repoDir);
            if (repoExists) {
                this._updateMarketplaceIndex(marketplace, repoDir, options?.marketplaceType);
                return repoDir;
            }
            if (marketplace.kind === "localFileUri" /* MarketplaceReferenceKind.LocalFileUri */) {
                throw new Error(`Local marketplace repository does not exist: ${repoDir.fsPath}`);
            }
            const progressTitle = options?.progressTitle ?? localize(6136, null, marketplace.displayLabel);
            const failureLabel = options?.failureLabel ?? marketplace.displayLabel;
            await this._cloneRepository(repoDir, marketplace.cloneUrl, progressTitle, failureLabel);
            this._updateMarketplaceIndex(marketplace, repoDir, options?.marketplaceType);
            return repoDir;
        });
    }
    async pullRepository(marketplace, options) {
        const repoDir = this.getRepositoryUri(marketplace, options?.marketplaceType);
        const repoExists = await this._fileService.exists(repoDir);
        if (!repoExists) {
            this._logService.warn(`[AgentPluginRepositoryService] Cannot update plugin '${options?.pluginName ?? marketplace.displayLabel}': repository not cloned`);
            return false;
        }
        const updateLabel = options?.pluginName ?? marketplace.displayLabel;
        try {
            const doPull = async () => {
                return !!(await this._commandService.executeCommand('_git.pull', repoDir.fsPath));
            };
            if (options?.silent) {
                return await doPull();
            }
            return await this._progressService.withProgress({
                location: 15 /* ProgressLocation.Notification */,
                title: localize(6137, null, updateLabel),
                cancellable: false,
            }, doPull);
        }
        catch (err) {
            this._logService.error(`[AgentPluginRepositoryService] Failed to update ${marketplace.displayLabel}:`, err);
            if (!options?.silent) {
                this._notificationService.notify({
                    severity: Severity.Error,
                    message: localize(6138, null, options?.failureLabel ?? updateLabel, err?.message ?? String(err)),
                    actions: {
                        primary: [new Action('showGitOutput', localize(6139, null), undefined, true, () => {
                                this._commandService.executeCommand('git.showOutput');
                            })],
                    },
                });
            }
            throw err;
        }
    }
    _getRepoCacheDirForReference(reference) {
        return joinPath(this._cacheRoot, ...reference.cacheSegments);
    }
    _loadMarketplaceIndex() {
        const result = new Map();
        const stored = this._storageService.getObject(MARKETPLACE_INDEX_STORAGE_KEY, -1 /* StorageScope.APPLICATION */);
        if (!stored) {
            return result;
        }
        const revived = revive(stored);
        for (const [canonicalId, entry] of Object.entries(revived)) {
            if (!entry || !entry.repositoryUri) {
                continue;
            }
            result.set(canonicalId, {
                repositoryUri: entry.repositoryUri,
                marketplaceType: entry.marketplaceType,
            });
        }
        return result;
    }
    _updateMarketplaceIndex(marketplace, repositoryUri, marketplaceType) {
        if (marketplace.kind === "localFileUri" /* MarketplaceReferenceKind.LocalFileUri */) {
            return;
        }
        const previous = this._marketplaceIndex.value.get(marketplace.canonicalId);
        if (previous && previous.repositoryUri.toString() === repositoryUri.toString() && previous.marketplaceType === marketplaceType) {
            return;
        }
        this._marketplaceIndex.value.set(marketplace.canonicalId, { repositoryUri, marketplaceType });
        this._saveMarketplaceIndex();
    }
    _saveMarketplaceIndex() {
        const serialized = {};
        for (const [canonicalId, entry] of this._marketplaceIndex.value) {
            serialized[canonicalId] = JSON.parse(JSON.stringify({
                repositoryUri: entry.repositoryUri,
                marketplaceType: entry.marketplaceType,
            }));
        }
        if (Object.keys(serialized).length === 0) {
            this._storageService.remove(MARKETPLACE_INDEX_STORAGE_KEY, -1 /* StorageScope.APPLICATION */);
            return;
        }
        this._storageService.store(MARKETPLACE_INDEX_STORAGE_KEY, JSON.stringify(serialized), -1 /* StorageScope.APPLICATION */, 1 /* StorageTarget.MACHINE */);
    }
    async _cloneRepository(repoDir, cloneUrl, progressTitle, failureLabel, ref) {
        try {
            await this._progressService.withProgress({
                location: 15 /* ProgressLocation.Notification */,
                title: progressTitle,
                cancellable: false,
            }, async () => {
                await this._fileService.createFolder(dirname(repoDir));
                await this._commandService.executeCommand('_git.cloneRepository', cloneUrl, repoDir.fsPath, ref);
            });
        }
        catch (err) {
            this._logService.error(`[AgentPluginRepositoryService] Failed to clone ${cloneUrl}:`, err);
            this._notificationService.notify({
                severity: Severity.Error,
                message: localize(6140, null, failureLabel, err?.message ?? String(err)),
                actions: {
                    primary: [new Action('showGitOutput', localize(6141, null), undefined, true, () => {
                            this._commandService.executeCommand('git.showOutput');
                        })],
                },
            });
            throw err;
        }
    }
    _getPluginDir(repoDir, source) {
        const normalizedSource = source.trim().replace(/^\.?\/+|\/+$/g, '');
        const pluginDir = normalizedSource ? joinPath(repoDir, normalizedSource) : repoDir;
        if (!isEqualOrParent(pluginDir, repoDir)) {
            throw new Error(`Invalid plugin source path '${source}'`);
        }
        return pluginDir;
    }
    getPluginSourceInstallUri(sourceDescriptor) {
        return this.getPluginSource(sourceDescriptor.kind).getInstallUri(this._cacheRoot, sourceDescriptor);
    }
    async ensurePluginSource(plugin, options) {
        const repo = this.getPluginSource(plugin.sourceDescriptor.kind);
        if (plugin.sourceDescriptor.kind === "relativePath" /* PluginSourceKind.RelativePath */) {
            return this.ensureRepository(plugin.marketplaceReference, options);
        }
        return repo.ensure(this._cacheRoot, plugin, options);
    }
    async updatePluginSource(plugin, options) {
        const repo = this.getPluginSource(plugin.sourceDescriptor.kind);
        if (plugin.sourceDescriptor.kind === "relativePath" /* PluginSourceKind.RelativePath */) {
            return this.pullRepository(plugin.marketplaceReference, options);
        }
        return repo.update(this._cacheRoot, plugin, options);
    }
    async fetchRepository(marketplace) {
        const repoDir = this.getRepositoryUri(marketplace);
        const repoExists = await this._fileService.exists(repoDir);
        if (!repoExists) {
            return false;
        }
        try {
            await this._commandService.executeCommand('_git.fetchRepository', repoDir.fsPath);
            const behindCount = await this._commandService.executeCommand('_git.revListCount', repoDir.fsPath, 'HEAD', '@{u}') ?? 0;
            return behindCount > 0;
        }
        catch (err) {
            this._logService.debug(`[AgentPluginRepositoryService] Silent fetch failed for ${marketplace.displayLabel}:`, err);
            return false;
        }
    }
    async cleanupPluginSource(plugin) {
        const repo = this.getPluginSource(plugin.sourceDescriptor.kind);
        const cleanupDir = repo.getCleanupTarget(this._cacheRoot, plugin.sourceDescriptor);
        if (!cleanupDir) {
            return;
        }
        try {
            const exists = await this._fileService.exists(cleanupDir);
            if (exists) {
                await this._fileService.del(cleanupDir, { recursive: true });
                this._logService.info(`[${plugin.sourceDescriptor.kind}] Removed plugin cache: ${cleanupDir.toString()}`);
            }
        }
        catch (err) {
            this._logService.warn(`[${plugin.sourceDescriptor.kind}] Failed to remove plugin cache '${cleanupDir.toString()}':`, err);
        }
        try {
            // Prune empty parent directories up to (but not including) the cache root
            // so we don't leave dangling owner/authority folders behind.
            await this._pruneEmptyParents(cleanupDir);
        }
        catch (err) {
            this._logService.warn(`[${plugin.sourceDescriptor.kind}] Failed to cleanup plugin source:`, err);
        }
    }
    /**
     * Walk from {@link child}'s parent toward {@link _cacheRoot}, removing
     * each directory that is empty. Stops as soon as a non-empty directory
     * is found or the cache root is reached. Only operates on descendants
     * of the cache root — returns immediately for paths outside it.
     */
    async _pruneEmptyParents(child) {
        if (!isEqualOrParent(child, this._cacheRoot)) {
            return;
        }
        let current = dirname(child);
        while (isEqualOrParent(current, this._cacheRoot) && !isEqual(current, this._cacheRoot)) {
            try {
                const stat = await this._fileService.resolve(current);
                if (stat.children && stat.children.length > 0) {
                    break;
                }
                await this._fileService.del(current);
            }
            catch {
                break;
            }
            current = dirname(current);
        }
    }
};
AgentPluginRepositoryService = __decorate([
    __param(0, ICommandService),
    __param(1, IEnvironmentService),
    __param(2, IFileService),
    __param(3, IInstantiationService),
    __param(4, ILogService),
    __param(5, INotificationService),
    __param(6, IProgressService),
    __param(7, IStorageService)
], AgentPluginRepositoryService);
export { AgentPluginRepositoryService };
//# sourceMappingURL=agentPluginRepositoryService.js.map