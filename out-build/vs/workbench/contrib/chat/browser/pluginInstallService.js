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
import { Codicon } from '../../../../base/common/codicons.js';
import { URI } from '../../../../base/common/uri.js';
import { localize } from '../../../../nls.js';
import { ICommandService } from '../../../../platform/commands/common/commands.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { IDialogService } from '../../../../platform/dialogs/common/dialogs.js';
import { IFileService } from '../../../../platform/files/common/files.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { INotificationService, Severity } from '../../../../platform/notification/common/notification.js';
import { IProgressService } from '../../../../platform/progress/common/progress.js';
import { IQuickInputService } from '../../../../platform/quickinput/common/quickInput.js';
import { IAgentPluginRepositoryService } from '../common/plugins/agentPluginRepositoryService.js';
import { ChatConfiguration } from '../common/constants.js';
import { IPluginMarketplaceService, hasSourceChanged, parseMarketplaceReference, parseMarketplaceReferences } from '../common/plugins/pluginMarketplaceService.js';
let PluginInstallService = class PluginInstallService {
    constructor(_pluginRepositoryService, _pluginMarketplaceService, _fileService, _notificationService, _dialogService, _logService, _progressService, _commandService, _quickInputService, _configurationService) {
        this._pluginRepositoryService = _pluginRepositoryService;
        this._pluginMarketplaceService = _pluginMarketplaceService;
        this._fileService = _fileService;
        this._notificationService = _notificationService;
        this._dialogService = _dialogService;
        this._logService = _logService;
        this._progressService = _progressService;
        this._commandService = _commandService;
        this._quickInputService = _quickInputService;
        this._configurationService = _configurationService;
    }
    async installPlugin(plugin) {
        if (!await this._ensureMarketplaceTrusted(plugin)) {
            return;
        }
        const kind = plugin.sourceDescriptor.kind;
        if (kind === "relativePath" /* PluginSourceKind.RelativePath */) {
            return this._installRelativePathPlugin(plugin);
        }
        if (kind === "npm" /* PluginSourceKind.Npm */ || kind === "pip" /* PluginSourceKind.Pip */) {
            await this._installPackagePlugin(plugin);
            return;
        }
        // GitHub / GitUrl
        return this._installGitPlugin(plugin);
    }
    async installPluginFromSource(source) {
        const reference = parseMarketplaceReference(source);
        if (!reference) {
            this._notificationService.notify({
                severity: Severity.Error,
                message: localize(7571, null, source),
            });
            return;
        }
        if (reference.kind === "localFileUri" /* MarketplaceReferenceKind.LocalFileUri */) {
            this._notificationService.notify({
                severity: Severity.Error,
                message: localize(7572, null),
            });
            return;
        }
        const result = await this._doInstallFromSource(reference);
        if (!result.success && result.message) {
            this._notificationService.notify({
                severity: Severity.Error,
                message: result.message,
            });
        }
    }
    validatePluginSource(source) {
        const reference = parseMarketplaceReference(source);
        if (!reference) {
            return localize(7573, null, source);
        }
        if (reference.kind === "localFileUri" /* MarketplaceReferenceKind.LocalFileUri */) {
            return localize(7574, null);
        }
        return undefined;
    }
    async installPluginFromValidatedSource(source) {
        const reference = parseMarketplaceReference(source);
        if (!reference) {
            return {
                success: false,
                message: localize(7575, null, source),
            };
        }
        if (reference.kind === "localFileUri" /* MarketplaceReferenceKind.LocalFileUri */) {
            return {
                success: false,
                message: localize(7576, null),
            };
        }
        return this._doInstallFromSource(reference);
    }
    async _doInstallFromSource(reference) {
        // Build a source descriptor for the git clone.
        const sourceDescriptor = reference.kind === "githubShorthand" /* MarketplaceReferenceKind.GitHubShorthand */
            ? { kind: "github" /* PluginSourceKind.GitHub */, repo: reference.githubRepo }
            : { kind: "url" /* PluginSourceKind.GitUrl */, url: reference.cloneUrl };
        // Build a temporary plugin object for the trust gate and clone step.
        const tempPlugin = {
            name: reference.displayLabel,
            description: '',
            version: '',
            source: '',
            sourceDescriptor,
            marketplace: reference.displayLabel,
            marketplaceReference: reference,
            marketplaceType: "openPlugin" /* MarketplaceType.OpenPlugin */,
        };
        if (!await this._ensureMarketplaceTrusted(tempPlugin)) {
            return { success: false };
        }
        // Clone the repository.
        let repoDir;
        try {
            repoDir = await this._pluginRepositoryService.ensurePluginSource(tempPlugin, {
                progressTitle: localize(7577, null, reference.displayLabel),
                failureLabel: reference.displayLabel,
                marketplaceType: "openPlugin" /* MarketplaceType.OpenPlugin */,
            });
        }
        catch (e) {
            const detail = e instanceof Error ? e.message : String(e);
            return {
                success: false,
                message: localize(7578, null, reference.displayLabel, detail),
            };
        }
        const repoExists = await this._fileService.exists(repoDir);
        if (!repoExists) {
            return {
                success: false,
                message: localize(7579, null, reference.displayLabel),
            };
        }
        // Scan for marketplace.json to discover plugins.
        const discoveredPlugins = await this._pluginMarketplaceService.readPluginsFromDirectory(repoDir, reference);
        if (discoveredPlugins.length === 0) {
            void this._pluginRepositoryService.cleanupPluginSource(tempPlugin);
            return {
                success: false,
                message: localize(7580, null, reference.displayLabel),
            };
        }
        if (discoveredPlugins.length === 1) {
            const plugin = discoveredPlugins[0];
            const pluginDir = plugin.source ? URI.joinPath(repoDir, plugin.source) : repoDir;
            this._pluginMarketplaceService.addInstalledPlugin(pluginDir, plugin);
            this._addMarketplaceToConfig(reference);
            return { success: true };
        }
        // Multiple plugins — let the user choose.
        const picks = discoveredPlugins.map(p => ({
            label: p.name,
            description: p.description,
            plugin: p,
        }));
        const selected = await this._quickInputService.pick(picks, {
            placeHolder: localize(7581, null, reference.displayLabel),
            canPickMany: false,
        });
        if (!selected) {
            return { success: false };
        }
        const plugin = selected.plugin;
        const pluginDir = plugin.source ? URI.joinPath(repoDir, plugin.source) : repoDir;
        this._pluginMarketplaceService.addInstalledPlugin(pluginDir, plugin);
        this._addMarketplaceToConfig(reference);
        return { success: true };
    }
    _addMarketplaceToConfig(reference) {
        const currentValues = this._configurationService.getValue(ChatConfiguration.PluginMarketplaces) ?? [];
        const existingRefs = parseMarketplaceReferences(currentValues);
        if (existingRefs.some(r => r.canonicalId === reference.canonicalId)) {
            return;
        }
        this._configurationService.updateValue(ChatConfiguration.PluginMarketplaces, [...currentValues, reference.rawValue]);
    }
    async updatePlugin(plugin, silent) {
        const kind = plugin.sourceDescriptor.kind;
        if (kind === "npm" /* PluginSourceKind.Npm */ || kind === "pip" /* PluginSourceKind.Pip */) {
            // Package-manager "update" re-runs install via terminal
            return this._installPackagePlugin(plugin, silent);
        }
        // For relative-path and git sources, delegate to repository service
        return this._pluginRepositoryService.updatePluginSource(plugin, {
            pluginName: plugin.name,
            failureLabel: plugin.name,
            marketplaceType: plugin.marketplaceType,
        });
    }
    async updateAllPlugins(options, token) {
        const installed = this._pluginMarketplaceService.installedPlugins.get().filter(e => e.enabled);
        if (installed.length === 0) {
            return { updatedNames: [], failedNames: [] };
        }
        const updatedNames = [];
        const failedNames = [];
        const doUpdate = async () => {
            const gitTasks = [];
            const packagePlugins = [];
            // 1. Pull each unique marketplace repository first (handles all
            //    relative-path plugins and ensures the marketplace index on
            //    disk is up-to-date before we re-read it).
            const seenMarketplaces = new Set();
            for (const entry of installed) {
                const ref = entry.plugin.marketplaceReference;
                if (seenMarketplaces.has(ref.canonicalId)) {
                    continue;
                }
                seenMarketplaces.add(ref.canonicalId);
                gitTasks.push((async () => {
                    if (token.isCancellationRequested) {
                        return;
                    }
                    try {
                        const changed = await this._pluginRepositoryService.pullRepository(ref, {
                            pluginName: ref.displayLabel,
                            failureLabel: ref.displayLabel,
                            marketplaceType: entry.plugin.marketplaceType,
                            silent: options.silent,
                        });
                        if (changed) {
                            updatedNames.push(ref.displayLabel);
                        }
                    }
                    catch (err) {
                        this._logService.error(`[PluginInstallService] Failed to pull marketplace '${ref.displayLabel}':`, err);
                        failedNames.push(ref.displayLabel);
                    }
                })());
            }
            await Promise.all(gitTasks);
            // 2. Re-fetch marketplace data *after* pulling so we see any
            //    updated plugin descriptors (new versions, refs, etc.).
            const marketplacePlugins = await this._pluginMarketplaceService.fetchMarketplacePlugins(token);
            const marketplaceByKey = new Map();
            for (const mp of marketplacePlugins) {
                marketplaceByKey.set(`${mp.marketplaceReference.canonicalId}::${mp.name}`, mp);
            }
            // 3. Update non-relative-path plugins individually.
            const independentGitTasks = [];
            for (const entry of installed) {
                if (entry.plugin.sourceDescriptor.kind === "relativePath" /* PluginSourceKind.RelativePath */) {
                    continue;
                }
                const livePlugin = marketplaceByKey.get(`${entry.plugin.marketplaceReference.canonicalId}::${entry.plugin.name}`);
                if (!livePlugin || !hasSourceChanged(entry.plugin.sourceDescriptor, livePlugin.sourceDescriptor)) {
                    continue;
                }
                const desc = livePlugin.sourceDescriptor;
                if (desc.kind === "npm" /* PluginSourceKind.Npm */ || desc.kind === "pip" /* PluginSourceKind.Pip */) {
                    if (!options.force && !desc.version) {
                        continue;
                    }
                    packagePlugins.push({ installed: entry.plugin, marketplace: livePlugin });
                    continue;
                }
                independentGitTasks.push((async () => {
                    if (token.isCancellationRequested) {
                        return;
                    }
                    try {
                        const changed = await this._pluginRepositoryService.updatePluginSource(livePlugin, {
                            pluginName: livePlugin.name,
                            failureLabel: livePlugin.name,
                            marketplaceType: livePlugin.marketplaceType,
                            silent: options.silent,
                        });
                        if (changed) {
                            updatedNames.push(livePlugin.name);
                            this._pluginMarketplaceService.addInstalledPlugin(entry.pluginUri, livePlugin);
                        }
                    }
                    catch (err) {
                        this._logService.error(`[PluginInstallService] Failed to update plugin '${livePlugin.name}':`, err);
                        failedNames.push(livePlugin.name);
                    }
                })());
            }
            await Promise.all(independentGitTasks);
            for (const { installed: _installed, marketplace } of packagePlugins) {
                if (token.isCancellationRequested) {
                    return;
                }
                try {
                    const changed = await this.updatePlugin(marketplace, options?.silent);
                    if (changed) {
                        updatedNames.push(marketplace.name);
                        const pluginUri = this._pluginRepositoryService.getPluginSourceInstallUri(marketplace.sourceDescriptor);
                        this._pluginMarketplaceService.addInstalledPlugin(pluginUri, marketplace);
                    }
                }
                catch (err) {
                    this._logService.error(`[PluginInstallService] Failed to update plugin '${marketplace.name}':`, err);
                    failedNames.push(marketplace.name);
                }
            }
        };
        if (options.silent) {
            await doUpdate();
        }
        else {
            await this._progressService.withProgress({
                location: 15 /* ProgressLocation.Notification */,
                title: localize(7582, null),
            }, doUpdate);
        }
        if (failedNames.length > 0) {
            this._notificationService.notify({
                severity: Severity.Error,
                message: localize(7583, null, failedNames.join(', ')),
                actions: {
                    primary: [new Action('showGitOutput', localize(7584, null), undefined, true, () => {
                            this._commandService.executeCommand('git.showOutput');
                        })],
                },
            });
        }
        else if (updatedNames.length > 0) {
            this._pluginMarketplaceService.clearUpdatesAvailable();
            this._notificationService.notify({
                severity: Severity.Info,
                message: localize(7585, null, updatedNames.join(', ')),
            });
        }
        else if (!token.isCancellationRequested) {
            this._pluginMarketplaceService.clearUpdatesAvailable();
        }
        return { updatedNames, failedNames };
    }
    getPluginInstallUri(plugin) {
        if (plugin.sourceDescriptor.kind === "relativePath" /* PluginSourceKind.RelativePath */) {
            return this._pluginRepositoryService.getPluginInstallUri(plugin);
        }
        return this._pluginRepositoryService.getPluginSourceInstallUri(plugin.sourceDescriptor);
    }
    // --- Trust gate -------------------------------------------------------------
    async _ensureMarketplaceTrusted(plugin) {
        if (this._pluginMarketplaceService.isMarketplaceTrusted(plugin.marketplaceReference)) {
            return true;
        }
        const { confirmed } = await this._dialogService.confirm({
            type: 'question',
            message: localize(7586, null, plugin.marketplaceReference.displayLabel),
            detail: localize(7587, null, plugin.marketplaceReference.rawValue),
            primaryButton: localize(7588, null),
            custom: {
                icon: Codicon.shield,
            },
        });
        if (!confirmed) {
            return false;
        }
        this._pluginMarketplaceService.trustMarketplace(plugin.marketplaceReference);
        return true;
    }
    // --- Relative-path source (existing git-based flow) -----------------------
    async _installRelativePathPlugin(plugin) {
        try {
            await this._pluginRepositoryService.ensureRepository(plugin.marketplaceReference, {
                progressTitle: localize(7589, null, plugin.name),
                failureLabel: plugin.name,
                marketplaceType: plugin.marketplaceType,
            });
        }
        catch {
            return;
        }
        let pluginDir;
        try {
            pluginDir = this._pluginRepositoryService.getPluginInstallUri(plugin);
        }
        catch {
            this._notificationService.notify({
                severity: Severity.Error,
                message: localize(7590, null, plugin.source, plugin.marketplace),
            });
            return;
        }
        const pluginExists = await this._fileService.exists(pluginDir);
        if (!pluginExists) {
            this._notificationService.notify({
                severity: Severity.Error,
                message: localize(7591, null, plugin.source, plugin.marketplace),
            });
            return;
        }
        this._pluginMarketplaceService.addInstalledPlugin(pluginDir, plugin);
    }
    // --- GitHub / Git URL source (independent clone) --------------------------
    async _installGitPlugin(plugin) {
        const repo = this._pluginRepositoryService.getPluginSource(plugin.sourceDescriptor.kind);
        let pluginDir;
        try {
            pluginDir = await this._pluginRepositoryService.ensurePluginSource(plugin, {
                progressTitle: localize(7592, null, plugin.name),
                failureLabel: plugin.name,
                marketplaceType: plugin.marketplaceType,
            });
        }
        catch {
            return;
        }
        const pluginExists = await this._fileService.exists(pluginDir);
        if (!pluginExists) {
            this._notificationService.notify({
                severity: Severity.Error,
                message: localize(7593, null, repo.getLabel(plugin.sourceDescriptor)),
            });
            return;
        }
        this._pluginMarketplaceService.addInstalledPlugin(pluginDir, plugin);
    }
    // --- Package-manager sources (npm / pip) ----------------------------------
    async _installPackagePlugin(plugin, silent) {
        const repo = this._pluginRepositoryService.getPluginSource(plugin.sourceDescriptor.kind);
        if (!repo.runInstall) {
            this._logService.error(`[PluginInstallService] Expected package repository for kind '${plugin.sourceDescriptor.kind}'`);
            return false;
        }
        // Ensure the parent cache directory exists (returns npm/<pkg> or pip/<pkg>)
        const installDir = await this._pluginRepositoryService.ensurePluginSource(plugin);
        // The actual plugin content location (e.g. npm/<pkg>/node_modules/<pkg>)
        const pluginDir = this._pluginRepositoryService.getPluginSourceInstallUri(plugin.sourceDescriptor);
        const result = await repo.runInstall(installDir, pluginDir, plugin, { silent });
        if (!result) {
            return false;
        }
        this._pluginMarketplaceService.addInstalledPlugin(result.pluginDir, plugin);
        return true;
    }
};
PluginInstallService = __decorate([
    __param(0, IAgentPluginRepositoryService),
    __param(1, IPluginMarketplaceService),
    __param(2, IFileService),
    __param(3, INotificationService),
    __param(4, IDialogService),
    __param(5, ILogService),
    __param(6, IProgressService),
    __param(7, ICommandService),
    __param(8, IQuickInputService),
    __param(9, IConfigurationService)
], PluginInstallService);
export { PluginInstallService };
//# sourceMappingURL=pluginInstallService.js.map