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
import * as dom from '../../../../base/browser/dom.js';
import { Codicon } from '../../../../base/common/codicons.js';
import { Emitter } from '../../../../base/common/event.js';
import { Disposable, DisposableStore } from '../../../../base/common/lifecycle.js';
import { basename } from '../../../../base/common/resources.js';
import { URI } from '../../../../base/common/uri.js';
import { localize } from '../../../../nls.js';
import { IActionWidgetService } from '../../../../platform/actionWidget/browser/actionWidget.js';
import { ICommandService } from '../../../../platform/commands/common/commands.js';
import { IFileDialogService } from '../../../../platform/dialogs/common/dialogs.js';
import { IStorageService } from '../../../../platform/storage/common/storage.js';
import { IUriIdentityService } from '../../../../platform/uriIdentity/common/uriIdentity.js';
import { renderIcon } from '../../../../base/browser/ui/iconLabel/iconLabels.js';
import { GITHUB_REMOTE_FILE_SCHEME, SessionWorkspace } from '../../sessions/common/sessionWorkspace.js';
const OPEN_REPO_COMMAND = 'github.copilot.chat.cloudSessions.openRepository';
const STORAGE_KEY_LAST_PROJECT = 'sessions.lastPickedProject';
const STORAGE_KEY_RECENT_PROJECTS = 'sessions.recentlyPickedProjects';
const MAX_RECENT_PROJECTS = 10;
const FILTER_THRESHOLD = 10;
// Legacy storage keys from the old separate folder/repo pickers
const LEGACY_STORAGE_KEY_LAST_FOLDER = 'agentSessions.lastPickedFolder';
const LEGACY_STORAGE_KEY_RECENT_FOLDERS = 'agentSessions.recentlyPickedFolders';
const LEGACY_STORAGE_KEY_LAST_REPO = 'agentSessions.lastPickedRepo';
const LEGACY_STORAGE_KEY_RECENT_REPOS = 'agentSessions.recentlyPickedRepos';
const COMMAND_BROWSE_FOLDERS = 'command:browseFolders';
const COMMAND_BROWSE_REPOS = 'command:browseRepos';
/**
 * A unified project picker that shows recently selected folders and repositories
 * in a single dropdown. Selecting a folder creates a local session; selecting a
 * repository creates a remote/cloud session.
 *
 * Actions at the bottom:
 * - "Browse Folders..." — opens a folder dialog
 * - "Browse Repositories..." — runs the cloud repository picker command
 */
let WorkspacePicker = class WorkspacePicker extends Disposable {
    get selectedProject() {
        return this._selectedProject;
    }
    constructor(actionWidgetService, storageService, fileDialogService, commandService, uriIdentityService) {
        super();
        this.actionWidgetService = actionWidgetService;
        this.storageService = storageService;
        this.fileDialogService = fileDialogService;
        this.commandService = commandService;
        this.uriIdentityService = uriIdentityService;
        this._onDidSelectProject = this._register(new Emitter());
        this.onDidSelectProject = this._onDidSelectProject.event;
        this._recentProjects = [];
        this._renderDisposables = this._register(new DisposableStore());
        // Restore recently picked projects (or migrate from legacy storage)
        try {
            const stored = this.storageService.get(STORAGE_KEY_RECENT_PROJECTS, 0 /* StorageScope.PROFILE */);
            if (stored) {
                this._recentProjects = JSON.parse(stored);
            }
            else {
                this._migrateFromLegacyStorage();
            }
        }
        catch { /* ignore */ }
        // Restore last picked project (or migrate from legacy)
        try {
            const last = this.storageService.get(STORAGE_KEY_LAST_PROJECT, 0 /* StorageScope.PROFILE */);
            if (last) {
                this._selectedProject = this._fromStored(JSON.parse(last));
            }
            else {
                this._migrateLastPickedFromLegacy();
            }
        }
        catch { /* ignore */ }
    }
    /**
     * Migrates recently picked folders and repos from the old separate storage
     * keys into the unified project list.
     */
    _migrateFromLegacyStorage() {
        const migrated = [];
        try {
            const storedFolders = this.storageService.get(LEGACY_STORAGE_KEY_RECENT_FOLDERS, 0 /* StorageScope.PROFILE */);
            if (storedFolders) {
                for (const uriStr of JSON.parse(storedFolders)) {
                    migrated.push({ uri: URI.parse(uriStr).toJSON() });
                }
            }
        }
        catch { /* ignore */ }
        try {
            const storedRepos = this.storageService.get(LEGACY_STORAGE_KEY_RECENT_REPOS, 0 /* StorageScope.PROFILE */);
            if (storedRepos) {
                for (const repo of JSON.parse(storedRepos)) {
                    migrated.push({ uri: URI.from({ scheme: GITHUB_REMOTE_FILE_SCHEME, authority: 'github', path: `/${repo.id}/HEAD` }).toJSON() });
                }
            }
        }
        catch { /* ignore */ }
        if (migrated.length > 0) {
            this._recentProjects = migrated.slice(0, MAX_RECENT_PROJECTS);
            this._persistRecents();
        }
    }
    /**
     * Migrates the last picked folder or repo from the old storage keys.
     */
    _migrateLastPickedFromLegacy() {
        try {
            const lastFolder = this.storageService.get(LEGACY_STORAGE_KEY_LAST_FOLDER, 0 /* StorageScope.PROFILE */);
            if (lastFolder) {
                this._selectedProject = new SessionWorkspace(URI.parse(lastFolder));
                return;
            }
        }
        catch { /* ignore */ }
        try {
            const lastRepo = this.storageService.get(LEGACY_STORAGE_KEY_LAST_REPO, 0 /* StorageScope.PROFILE */);
            if (lastRepo) {
                const repo = JSON.parse(lastRepo);
                this._selectedProject = new SessionWorkspace(URI.from({ scheme: GITHUB_REMOTE_FILE_SCHEME, authority: 'github', path: `/${repo.id}/HEAD` }));
            }
        }
        catch { /* ignore */ }
    }
    /**
     * Renders the project picker trigger button into the given container.
     * Returns the container element.
     */
    render(container) {
        this._renderDisposables.clear();
        const slot = dom.append(container, dom.$('.sessions-chat-picker-slot.sessions-chat-workspace-picker'));
        this._renderDisposables.add({ dispose: () => slot.remove() });
        const trigger = dom.append(slot, dom.$('a.action-label'));
        trigger.tabIndex = 0;
        trigger.role = 'button';
        this._triggerElement = trigger;
        this._updateTriggerLabel();
        this._renderDisposables.add(dom.addDisposableListener(trigger, dom.EventType.CLICK, (e) => {
            dom.EventHelper.stop(e, true);
            this.showPicker();
        }));
        this._renderDisposables.add(dom.addDisposableListener(trigger, dom.EventType.KEY_DOWN, (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                dom.EventHelper.stop(e, true);
                this.showPicker();
            }
        }));
        return slot;
    }
    /**
     * Shows the project picker dropdown anchored to the trigger element.
     */
    showPicker() {
        if (!this._triggerElement || this.actionWidgetService.isVisible) {
            return;
        }
        const items = this._buildItems();
        const showFilter = items.filter(i => i.kind === "action" /* ActionListItemKind.Action */).length > FILTER_THRESHOLD;
        const triggerElement = this._triggerElement;
        const delegate = {
            onSelect: (item) => {
                this.actionWidgetService.hide();
                const uriStr = URI.revive(item.uri).toString();
                if (uriStr === COMMAND_BROWSE_FOLDERS) {
                    this._browseForFolder();
                }
                else if (uriStr === COMMAND_BROWSE_REPOS) {
                    this._browseForRepo();
                }
                else {
                    this._selectProject(this._fromStored(item));
                }
            },
            onHide: () => { triggerElement.focus(); },
        };
        const listOptions = showFilter ? { showFilter: true, filterPlaceholder: localize(3261, null) } : undefined;
        this.actionWidgetService.show('workspacePicker', false, items, delegate, this._triggerElement, undefined, [], {
            getAriaLabel: (item) => item.label ?? '',
            getWidgetAriaLabel: () => localize(3262, null),
        }, listOptions);
    }
    /**
     * Programmatically set the selected project.
     * @param fireEvent Whether to fire the onDidSelectProject event. Defaults to true.
     */
    setSelectedProject(project, fireEvent = true) {
        this._selectProject(project, fireEvent);
    }
    /**
     * Clears the selected project.
     */
    clearSelection() {
        this._selectedProject = undefined;
        this._updateTriggerLabel();
    }
    /**
     * Removes a project from the recently picked list by URI.
     */
    removeFromRecents(uri) {
        this._recentProjects = this._recentProjects.filter(p => !this.uriIdentityService.extUri.isEqual(URI.revive(p.uri), uri));
        this._persistRecents();
        if (this._selectedProject && this.uriIdentityService.extUri.isEqual(this._selectedProject.uri, uri)) {
            this._selectedProject = undefined;
            this.storageService.remove(STORAGE_KEY_LAST_PROJECT, 0 /* StorageScope.PROFILE */);
            this._updateTriggerLabel();
        }
    }
    _selectProject(project, fireEvent = true) {
        this._selectedProject = project;
        const stored = this._toStored(project);
        this._addToRecents(stored);
        this.storageService.store(STORAGE_KEY_LAST_PROJECT, JSON.stringify(stored), 0 /* StorageScope.PROFILE */, 1 /* StorageTarget.MACHINE */);
        this._updateTriggerLabel();
        if (fireEvent) {
            this._onDidSelectProject.fire(project);
        }
    }
    async _browseForFolder() {
        try {
            const selected = await this.fileDialogService.showOpenDialog({
                canSelectFiles: false,
                canSelectFolders: true,
                canSelectMany: false,
                title: localize(3263, null),
            });
            if (selected?.[0]) {
                this._selectProject(new SessionWorkspace(selected[0]));
            }
        }
        catch {
            // dialog was cancelled or failed
        }
    }
    async _browseForRepo() {
        try {
            const result = await this.commandService.executeCommand(OPEN_REPO_COMMAND);
            if (result) {
                this._selectProject(new SessionWorkspace(URI.from({ scheme: GITHUB_REMOTE_FILE_SCHEME, authority: 'github', path: `/${result}/HEAD` })));
            }
        }
        catch {
            // command was cancelled or failed
        }
    }
    _addToRecents(stored) {
        this._recentProjects = [
            stored,
            ...this._recentProjects.filter(p => !this._isSameProject(p, stored)),
        ].slice(0, MAX_RECENT_PROJECTS);
        this._persistRecents();
    }
    _persistRecents() {
        this.storageService.store(STORAGE_KEY_RECENT_PROJECTS, JSON.stringify(this._recentProjects), 0 /* StorageScope.PROFILE */, 1 /* StorageTarget.MACHINE */);
    }
    _buildItems() {
        const seen = new Set();
        const items = [];
        // Collect all projects (current + recents), deduped
        const allProjects = [];
        if (this._selectedProject) {
            const stored = this._toStored(this._selectedProject);
            seen.add(this._projectKey(stored));
            allProjects.push(stored);
        }
        for (const project of this._recentProjects) {
            const key = this._projectKey(project);
            if (!seen.has(key)) {
                seen.add(key);
                allProjects.push(project);
            }
        }
        // Split into folders and repos, sort each group alphabetically
        const isStoredFolder = (p) => URI.revive(p.uri).scheme !== GITHUB_REMOTE_FILE_SCHEME;
        const folders = allProjects.filter(p => isStoredFolder(p)).sort((a, b) => this._getStoredProjectLabel(a).localeCompare(this._getStoredProjectLabel(b)));
        const repos = allProjects.filter(p => !isStoredFolder(p)).sort((a, b) => this._getStoredProjectLabel(a).localeCompare(this._getStoredProjectLabel(b)));
        const selectedKey = this._selectedProject ? this._projectKey(this._toStored(this._selectedProject)) : undefined;
        // Folders first
        for (const project of folders) {
            const isSelected = selectedKey !== undefined && this._projectKey(project) === selectedKey;
            items.push({
                kind: "action" /* ActionListItemKind.Action */,
                label: this._getStoredProjectLabel(project),
                group: { title: '', icon: Codicon.folder },
                item: isSelected ? { ...project, checked: true } : project,
                onRemove: () => this._removeProject(project),
            });
        }
        // Then repos
        for (const project of repos) {
            const isSelected = selectedKey !== undefined && this._projectKey(project) === selectedKey;
            items.push({
                kind: "action" /* ActionListItemKind.Action */,
                label: this._getStoredProjectLabel(project),
                group: { title: '', icon: Codicon.repo },
                item: isSelected ? { ...project, checked: true } : project,
                onRemove: () => this._removeProject(project),
            });
        }
        // Separator + Browse actions
        if (items.length > 0) {
            items.push({ kind: "separator" /* ActionListItemKind.Separator */, label: '' });
        }
        items.push({
            kind: "action" /* ActionListItemKind.Action */,
            label: localize(3264, null),
            group: { title: '', icon: Codicon.folderOpened },
            item: { uri: URI.parse(COMMAND_BROWSE_FOLDERS).toJSON() },
        });
        items.push({
            kind: "action" /* ActionListItemKind.Action */,
            label: localize(3265, null),
            group: { title: '', icon: Codicon.repo },
            item: { uri: URI.parse(COMMAND_BROWSE_REPOS).toJSON() },
        });
        return items;
    }
    _removeProject(project) {
        this._recentProjects = this._recentProjects.filter(p => !this._isSameProject(p, project));
        this._persistRecents();
    }
    _updateTriggerLabel() {
        if (!this._triggerElement) {
            return;
        }
        dom.clearNode(this._triggerElement);
        const project = this._selectedProject;
        const label = project ? this._getProjectLabel(project) : localize(3266, null);
        const icon = project ? (project.isFolder ? Codicon.folder : Codicon.repo) : Codicon.project;
        dom.append(this._triggerElement, renderIcon(icon));
        const labelSpan = dom.append(this._triggerElement, dom.$('span.sessions-chat-dropdown-label'));
        labelSpan.textContent = label;
        dom.append(this._triggerElement, renderIcon(Codicon.chevronDown));
    }
    _getProjectLabel(project) {
        return this._getStoredProjectLabel({ uri: project.uri.toJSON() });
    }
    _getStoredProjectLabel(project) {
        const uri = URI.revive(project.uri);
        if (uri.scheme !== GITHUB_REMOTE_FILE_SCHEME) {
            return basename(uri);
        }
        // For repos, extract "owner/repo" from the URI path (e.g. "/owner/repo/HEAD" → "owner/repo")
        return uri.path.substring(1).replace(/\/HEAD$/, '');
    }
    _toStored(project) {
        return {
            uri: project.uri.toJSON(),
        };
    }
    _fromStored(stored) {
        return new SessionWorkspace(URI.revive(stored.uri));
    }
    _projectKey(project) {
        return URI.revive(project.uri).toString();
    }
    _isSameProject(a, b) {
        return this.uriIdentityService.extUri.isEqual(URI.revive(a.uri), URI.revive(b.uri));
    }
};
WorkspacePicker = __decorate([
    __param(0, IActionWidgetService),
    __param(1, IStorageService),
    __param(2, IFileDialogService),
    __param(3, ICommandService),
    __param(4, IUriIdentityService)
], WorkspacePicker);
export { WorkspacePicker };
//# sourceMappingURL=workspacePicker.js.map