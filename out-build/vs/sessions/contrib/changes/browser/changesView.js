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
var ChangesTreeRenderer_1;
import './media/changesView.css';
import * as dom from '../../../../base/browser/dom.js';
import { Codicon } from '../../../../base/common/codicons.js';
import { MarkdownString } from '../../../../base/common/htmlContent.js';
import { Iterable } from '../../../../base/common/iterator.js';
import { DisposableStore, MutableDisposable } from '../../../../base/common/lifecycle.js';
import { autorun, constObservable, derived, derivedOpts, observableFromEvent, ObservablePromise, observableValue } from '../../../../base/common/observable.js';
import { basename, dirname } from '../../../../base/common/path.js';
import { extUriBiasedIgnorePathCase, isEqual } from '../../../../base/common/resources.js';
import { ThemeIcon } from '../../../../base/common/themables.js';
import { URI } from '../../../../base/common/uri.js';
import { localize, localize2 } from '../../../../nls.js';
import { MenuWorkbenchButtonBar } from '../../../../platform/actions/browser/buttonbar.js';
import { MenuWorkbenchToolBar } from '../../../../platform/actions/browser/toolbar.js';
import { MenuId, Action2, MenuRegistry, registerAction2 } from '../../../../platform/actions/common/actions.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { ContextKeyExpr, IContextKeyService, RawContextKey } from '../../../../platform/contextkey/common/contextkey.js';
import { IContextMenuService } from '../../../../platform/contextview/browser/contextView.js';
import { FileKind } from '../../../../platform/files/common/files.js';
import { IHoverService } from '../../../../platform/hover/browser/hover.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { IKeybindingService } from '../../../../platform/keybinding/common/keybinding.js';
import { ILabelService } from '../../../../platform/label/common/label.js';
import { WorkbenchCompressibleObjectTree } from '../../../../platform/list/browser/listService.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { bindContextKey } from '../../../../platform/observable/common/platformObservableUtils.js';
import { IOpenerService } from '../../../../platform/opener/common/opener.js';
import { ServiceCollection } from '../../../../platform/instantiation/common/serviceCollection.js';
import { IStorageService } from '../../../../platform/storage/common/storage.js';
import { ITelemetryService } from '../../../../platform/telemetry/common/telemetry.js';
import { IThemeService } from '../../../../platform/theme/common/themeService.js';
import { IWorkspaceContextService } from '../../../../platform/workspace/common/workspace.js';
import { fillEditorsDragData } from '../../../../workbench/browser/dnd.js';
import { ResourceLabels } from '../../../../workbench/browser/labels.js';
import { ViewPane, ViewAction } from '../../../../workbench/browser/parts/views/viewPane.js';
import { ViewPaneContainer } from '../../../../workbench/browser/parts/views/viewPaneContainer.js';
import { IViewDescriptorService } from '../../../../workbench/common/views.js';
import { IViewsService } from '../../../../workbench/services/views/common/viewsService.js';
import { IsSessionsWindowContext } from '../../../../workbench/common/contextkeys.js';
import { CHAT_CATEGORY } from '../../../../workbench/contrib/chat/browser/actions/chatActions.js';
import { IAgentSessionsService } from '../../../../workbench/contrib/chat/browser/agentSessions/agentSessionsService.js';
import { AgentSessionProviders } from '../../../../workbench/contrib/chat/browser/agentSessions/agentSessions.js';
import { ChatContextKeys } from '../../../../workbench/contrib/chat/common/actions/chatContextKeys.js';
import { isIChatSessionFileChange2 } from '../../../../workbench/contrib/chat/common/chatSessionsService.js';
import { chatEditingWidgetFileStateContextKey, hasAppliedChatEditsContextKey, hasUndecidedChatEditingResourceContextKey, IChatEditingService } from '../../../../workbench/contrib/chat/common/editing/chatEditingService.js';
import { createFileIconThemableTreeContainerScope } from '../../../../workbench/contrib/files/browser/views/explorerView.js';
import { IActivityService, NumberBadge } from '../../../../workbench/services/activity/common/activity.js';
import { ACTIVE_GROUP, IEditorService, SIDE_GROUP } from '../../../../workbench/services/editor/common/editorService.js';
import { IExtensionService } from '../../../../workbench/services/extensions/common/extensions.js';
import { IWorkbenchLayoutService } from '../../../../workbench/services/layout/browser/layoutService.js';
import { ISessionsManagementService } from '../../sessions/browser/sessionsManagementService.js';
import { GITHUB_REMOTE_FILE_SCHEME } from '../../sessions/common/sessionWorkspace.js';
import { getCodeReviewFilesFromSessionChanges, getCodeReviewVersion, ICodeReviewService } from '../../codeReview/browser/codeReviewService.js';
import { IGitService } from '../../../../workbench/contrib/git/common/gitService.js';
import { IGitHubService } from '../../github/browser/githubService.js';
import { CIStatusWidget } from './ciStatusWidget.js';
const $ = dom.$;
// --- Constants
export const CHANGES_VIEW_CONTAINER_ID = 'workbench.view.agentSessions.changesContainer';
export const CHANGES_VIEW_ID = 'workbench.view.agentSessions.changes';
const RUN_SESSION_CODE_REVIEW_ACTION_ID = 'sessions.codeReview.run';
// --- View Mode
export var ChangesViewMode;
(function (ChangesViewMode) {
    ChangesViewMode["List"] = "list";
    ChangesViewMode["Tree"] = "tree";
})(ChangesViewMode || (ChangesViewMode = {}));
const changesViewModeContextKey = new RawContextKey('changesViewMode', "list" /* ChangesViewMode.List */);
// --- Versions Mode
var ChangesVersionMode;
(function (ChangesVersionMode) {
    ChangesVersionMode["AllChanges"] = "allChanges";
    ChangesVersionMode["LastTurn"] = "lastTurn";
})(ChangesVersionMode || (ChangesVersionMode = {}));
const changesVersionModeContextKey = new RawContextKey('sessions.changesVersionMode', "allChanges" /* ChangesVersionMode.AllChanges */);
const isMergeBaseBranchProtectedContextKey = new RawContextKey('sessions.isMergeBaseBranchProtected', false);
const hasOpenPullRequestContextKey = new RawContextKey('sessions.hasOpenPullRequest', false);
function isChangesFileItem(element) {
    return element.type === 'file';
}
/**
 * Builds a tree of `IObjectTreeElement<ChangesTreeElement>` from a flat list of file items.
 * Groups files by their directory path segments to create a hierarchical tree structure.
 */
function buildTreeChildren(items) {
    if (items.length === 0) {
        return [];
    }
    const root = { name: '', uri: URI.file('/'), children: new Map(), files: [] };
    for (const item of items) {
        const fullDirPath = dirname(item.uri.path);
        // For github-remote-file URIs, strip the /{owner}/{repo}/{ref} prefix
        // so the tree shows repo-relative paths instead of internal URI segments.
        let displayDirPath = fullDirPath;
        let uriBasePrefix = '';
        if (item.uri.scheme === GITHUB_REMOTE_FILE_SCHEME) {
            const parts = fullDirPath.split('/').filter(Boolean);
            if (parts.length >= 3) {
                uriBasePrefix = '/' + parts.slice(0, 3).join('/');
                displayDirPath = '/' + parts.slice(3).join('/');
            }
            else {
                uriBasePrefix = '/' + parts.join('/');
                displayDirPath = '/';
            }
        }
        const segments = displayDirPath.split('/').filter(Boolean);
        let current = root;
        let currentFullPath = uriBasePrefix;
        for (const segment of segments) {
            currentFullPath += '/' + segment;
            if (!current.children.has(segment)) {
                current.children.set(segment, {
                    name: segment,
                    uri: item.uri.with({ path: currentFullPath }),
                    children: new Map(),
                    files: []
                });
            }
            current = current.children.get(segment);
        }
        current.files.push(item);
    }
    function convert(node) {
        const result = [];
        for (const [, child] of node.children) {
            const folderElement = { type: 'folder', uri: child.uri, name: child.name };
            const folderChildren = convert(child);
            result.push({
                element: folderElement,
                children: folderChildren,
                collapsible: true,
                collapsed: false,
            });
        }
        for (const file of node.files) {
            result.push({
                element: file,
                collapsible: false,
            });
        }
        return result;
    }
    return convert(root);
}
// --- View Pane
let ChangesViewPane = class ChangesViewPane extends ViewPane {
    get viewMode() { return this.viewModeObs.get(); }
    set viewMode(mode) {
        if (this.viewModeObs.get() === mode) {
            return;
        }
        this.viewModeObs.set(mode, undefined);
        this.viewModeContextKey.set(mode);
        this.storageService.store('changesView.viewMode', mode, 1 /* StorageScope.WORKSPACE */, 0 /* StorageTarget.USER */);
    }
    setVersionMode(mode) {
        if (this.versionModeObs.get() === mode) {
            return;
        }
        this.versionModeObs.set(mode, undefined);
        this.versionModeContextKey.set(mode);
    }
    get activeSessionHasChanges() {
        return this.activeSessionHasChangesObs;
    }
    constructor(options, keybindingService, contextMenuService, configurationService, contextKeyService, viewDescriptorService, instantiationService, openerService, themeService, hoverService, chatEditingService, editorService, activityService, agentSessionsService, sessionManagementService, labelService, storageService, codeReviewService, gitService, gitHubService) {
        super(options, keybindingService, contextMenuService, configurationService, contextKeyService, viewDescriptorService, instantiationService, openerService, themeService, hoverService);
        this.chatEditingService = chatEditingService;
        this.editorService = editorService;
        this.activityService = activityService;
        this.agentSessionsService = agentSessionsService;
        this.sessionManagementService = sessionManagementService;
        this.labelService = labelService;
        this.storageService = storageService;
        this.codeReviewService = codeReviewService;
        this.gitService = gitService;
        this.gitHubService = gitHubService;
        this.renderDisposables = this._register(new DisposableStore());
        // Track current body dimensions for list layout
        this.currentBodyHeight = 0;
        this.currentBodyWidth = 0;
        // Version mode (all changes, last turn, uncommitted)
        this.versionModeObs = observableValue(this, "allChanges" /* ChangesVersionMode.AllChanges */);
        // Badge for file count
        this.badgeDisposable = this._register(new MutableDisposable());
        // View mode
        const storedMode = this.storageService.get('changesView.viewMode', 1 /* StorageScope.WORKSPACE */);
        const initialMode = storedMode === "tree" /* ChangesViewMode.Tree */ ? "tree" /* ChangesViewMode.Tree */ : "list" /* ChangesViewMode.List */;
        this.viewModeObs = observableValue(this, initialMode);
        this.viewModeContextKey = changesViewModeContextKey.bindTo(contextKeyService);
        this.viewModeContextKey.set(initialMode);
        // Version mode
        this.versionModeContextKey = changesVersionModeContextKey.bindTo(contextKeyService);
        this.versionModeContextKey.set("allChanges" /* ChangesVersionMode.AllChanges */);
        // Track active session from sessions management service
        this.activeSession = derivedOpts({
            equalsFn: (a, b) => isEqual(a?.resource, b?.resource),
        }, reader => {
            const activeSession = this.sessionManagementService.activeSession.read(reader);
            if (!activeSession?.resource) {
                return undefined;
            }
            return activeSession;
        }).recomputeInitiallyAndOnChange(this._store);
        // Track active session repository changes
        const activeSessionRepositoryPromiseObs = derived(reader => {
            const activeSessionWorktree = this.activeSession.read(reader)?.worktree;
            if (!activeSessionWorktree) {
                return constObservable(undefined);
            }
            return new ObservablePromise(this.gitService.openRepository(activeSessionWorktree)).resolvedValue;
        });
        this.activeSessionRepositoryObs = derived(reader => {
            const activeSessionRepositoryPromise = activeSessionRepositoryPromiseObs.read(reader);
            if (activeSessionRepositoryPromise === undefined) {
                return undefined;
            }
            return activeSessionRepositoryPromise.read(reader);
        });
        this.activeSessionFileCountObs = this.createActiveSessionFileCountObservable();
        this.activeSessionHasChangesObs = this.activeSessionFileCountObs.map(fileCount => fileCount > 0).recomputeInitiallyAndOnChange(this._store);
        // Set chatSessionType on the view's context key service so ViewTitle
        // menu items can use it in their `when` clauses. Update reactively
        // when the active session changes.
        const viewSessionTypeKey = this.scopedContextKeyService.createKey(ChatContextKeys.agentSessionType.key, '');
        this._register(autorun(reader => {
            const activeSession = this.activeSession.read(reader);
            viewSessionTypeKey.set(activeSession?.providerType ?? '');
        }));
    }
    createActiveSessionFileCountObservable() {
        const activeSessionResource = this.activeSession.map(a => a?.resource);
        const sessionsChangedSignal = observableFromEvent(this, this.agentSessionsService.model.onDidChangeSessions, () => ({}));
        const sessionFileChangesObs = derived(reader => {
            const sessionResource = activeSessionResource.read(reader);
            sessionsChangedSignal.read(reader);
            if (!sessionResource) {
                return Iterable.empty();
            }
            const model = this.agentSessionsService.getSession(sessionResource);
            return model?.changes instanceof Array ? model.changes : Iterable.empty();
        });
        return derived(reader => {
            const activeSession = this.activeSession.read(reader);
            if (!activeSession) {
                return 0;
            }
            let editingSessionCount = 0;
            if (activeSession.providerType !== AgentSessionProviders.Background) {
                const sessions = this.chatEditingService.editingSessionsObs.read(reader);
                const session = sessions.find(candidate => isEqual(candidate.chatSessionResource, activeSession.resource));
                editingSessionCount = session ? session.entries.read(reader).length : 0;
            }
            const sessionFiles = [...sessionFileChangesObs.read(reader)];
            const sessionFilesCount = sessionFiles.length;
            return editingSessionCount + sessionFilesCount;
        }).recomputeInitiallyAndOnChange(this._store);
    }
    updateBadge(fileCount) {
        if (fileCount > 0) {
            const message = fileCount === 1
                ? localize(3089, null)
                : localize(3090, null, fileCount);
            this.badgeDisposable.value = this.activityService.showViewActivity(CHANGES_VIEW_ID, { badge: new NumberBadge(fileCount, () => message) });
        }
        else {
            this.badgeDisposable.clear();
        }
    }
    renderBody(container) {
        super.renderBody(container);
        this.bodyContainer = dom.append(container, $('.changes-view-body'));
        // Welcome message for empty state
        this.welcomeContainer = dom.append(this.bodyContainer, $('.changes-welcome'));
        const welcomeIcon = dom.append(this.welcomeContainer, $('.changes-welcome-icon'));
        welcomeIcon.classList.add(...ThemeIcon.asClassNameArray(Codicon.diffMultiple));
        const welcomeMessage = dom.append(this.welcomeContainer, $('.changes-welcome-message'));
        welcomeMessage.textContent = localize(3091, null);
        // Actions container - positioned outside and above the card
        this.actionsContainer = dom.append(this.bodyContainer, $('.chat-editing-session-actions.outside-card'));
        // Main container with file icons support (the "card")
        this.contentContainer = dom.append(this.bodyContainer, $('.chat-editing-session-container.show-file-icons'));
        this._register(createFileIconThemableTreeContainerScope(this.contentContainer, this.themeService));
        // Toggle class based on whether the file icon theme has file icons
        const updateHasFileIcons = () => {
            this.contentContainer.classList.toggle('has-file-icons', this.themeService.getFileIconTheme().hasFileIcons);
        };
        updateHasFileIcons();
        this._register(this.themeService.onDidFileIconThemeChange(updateHasFileIcons));
        // Overview section (header with summary only - actions moved outside card)
        this.overviewContainer = dom.append(this.contentContainer, $('.chat-editing-session-overview'));
        this.summaryContainer = dom.append(this.overviewContainer, $('.changes-summary'));
        // List container
        this.listContainer = dom.append(this.contentContainer, $('.chat-editing-session-list'));
        // CI Status widget beneath the card
        this.ciStatusWidget = this._register(this.instantiationService.createInstance(CIStatusWidget, this.bodyContainer));
        this._register(this.ciStatusWidget.onDidChangeHeight(() => this.layoutTree()));
        this._register(this.onDidChangeBodyVisibility(visible => {
            if (visible) {
                this.onVisible();
            }
            else {
                this.renderDisposables.clear();
            }
        }));
        // Trigger initial render if already visible
        if (this.isBodyVisible()) {
            this.onVisible();
        }
    }
    onVisible() {
        this.renderDisposables.clear();
        const activeSessionResource = this.activeSession.map(a => a?.resource);
        // Create observable for the active editing session
        // Note: We must read editingSessionsObs to establish a reactive dependency,
        // so that the view updates when a new editing session is added (e.g., cloud sessions)
        const activeEditingSessionObs = derived(reader => {
            const activeSession = this.activeSession.read(reader);
            if (!activeSession) {
                return undefined;
            }
            const sessions = this.chatEditingService.editingSessionsObs.read(reader);
            return sessions.find(candidate => isEqual(candidate.chatSessionResource, activeSession.resource));
        });
        // Create observable for edit session entries from the ACTIVE session only (local editing sessions)
        const editSessionEntriesObs = derived(reader => {
            const activeSession = this.activeSession.read(reader);
            // Background chat sessions render the working set based on the session files, not the editing session
            if (activeSession?.providerType === AgentSessionProviders.Background) {
                return [];
            }
            const session = activeEditingSessionObs.read(reader);
            if (!session) {
                return [];
            }
            const entries = session.entries.read(reader);
            const items = [];
            for (const entry of entries) {
                const isDeletion = entry.isDeletion ?? false;
                const linesAdded = entry.linesAdded?.read(reader) ?? 0;
                const linesRemoved = entry.linesRemoved?.read(reader) ?? 0;
                items.push({
                    type: 'file',
                    uri: entry.modifiedURI,
                    originalUri: entry.originalURI,
                    state: entry.state.read(reader),
                    isDeletion,
                    changeType: isDeletion ? 'deleted' : 'modified',
                    linesAdded,
                    linesRemoved,
                    reviewCommentCount: 0,
                });
            }
            return items;
        });
        // Signal observable that triggers when sessions data changes
        const sessionsChangedSignal = observableFromEvent(this.renderDisposables, this.agentSessionsService.model.onDidChangeSessions, () => ({}));
        // Observable for session file changes from agentSessionsService (cloud/background sessions)
        // Reactive to both activeSession changes AND session data changes
        const sessionFileChangesObs = derived(reader => {
            const sessionResource = activeSessionResource.read(reader);
            sessionsChangedSignal.read(reader);
            if (!sessionResource) {
                return Iterable.empty();
            }
            const model = this.agentSessionsService.getSession(sessionResource);
            return model?.changes instanceof Array ? model.changes : Iterable.empty();
        });
        const reviewCommentCountByFileObs = derived(reader => {
            const sessionResource = activeSessionResource.read(reader);
            const sessionChanges = [...sessionFileChangesObs.read(reader)];
            if (!sessionResource) {
                return new Map();
            }
            const result = new Map();
            const prReviewState = this.codeReviewService.getPRReviewState(sessionResource).read(reader);
            if (prReviewState.kind === "loaded" /* PRReviewStateKind.Loaded */) {
                for (const comment of prReviewState.comments) {
                    const uriKey = comment.uri.fsPath;
                    result.set(uriKey, (result.get(uriKey) ?? 0) + 1);
                }
            }
            if (sessionChanges.length === 0) {
                return result;
            }
            const reviewFiles = getCodeReviewFilesFromSessionChanges(sessionChanges);
            const reviewVersion = getCodeReviewVersion(reviewFiles);
            const reviewState = this.codeReviewService.getReviewState(sessionResource).read(reader);
            if (reviewState.kind !== "result" /* CodeReviewStateKind.Result */ || reviewState.version !== reviewVersion) {
                return result;
            }
            for (const comment of reviewState.comments) {
                const uriKey = comment.uri.fsPath;
                result.set(uriKey, (result.get(uriKey) ?? 0) + 1);
            }
            return result;
        });
        // Convert session file changes to list items (cloud/background sessions)
        const sessionFilesObs = derived(reader => {
            const reviewCommentCountByFile = reviewCommentCountByFileObs.read(reader);
            return [...sessionFileChangesObs.read(reader)].map((entry) => {
                const isDeletion = entry.modifiedUri === undefined;
                const isAddition = entry.originalUri === undefined;
                const uri = isIChatSessionFileChange2(entry)
                    ? entry.modifiedUri ?? entry.uri
                    : entry.modifiedUri;
                return {
                    type: 'file',
                    uri,
                    originalUri: entry.originalUri,
                    state: 1 /* ModifiedFileEntryState.Accepted */,
                    isDeletion,
                    changeType: isDeletion ? 'deleted' : isAddition ? 'added' : 'modified',
                    linesAdded: entry.insertions,
                    linesRemoved: entry.deletions,
                    reviewCommentCount: reviewCommentCountByFile.get(uri.fsPath) ?? 0,
                };
            });
        });
        // Create observable for last turn changes using diffBetweenWithStats
        // Reactively computes the diff between HEAD^ and HEAD. Memoize the diff observable so
        // that we only recompute it when the HEAD commit id actually changes.
        const headCommitObs = derived(reader => {
            const repository = this.activeSessionRepositoryObs.read(reader);
            return repository?.state.read(reader)?.HEAD?.commit;
        });
        const lastCheckpointRefObs = derived(reader => {
            const sessionResource = activeSessionResource.read(reader);
            if (!sessionResource) {
                return undefined;
            }
            sessionsChangedSignal.read(reader);
            const model = this.agentSessionsService.getSession(sessionResource);
            return model?.metadata?.lastCheckpointRef;
        });
        const beforeLastCheckpointRefObs = derived(reader => {
            const lastCheckpointRef = lastCheckpointRefObs.read(reader);
            if (!lastCheckpointRef) {
                return undefined;
            }
            const checkpointSegments = lastCheckpointRef.split('/');
            const turnCount = parseInt(checkpointSegments.pop() ?? '-1', 10);
            if (!Number.isFinite(turnCount) || turnCount <= 0) {
                return undefined;
            }
            checkpointSegments.push(`${turnCount - 1}`);
            return checkpointSegments.join('/');
        });
        const lastTurnChangesObs = derived(reader => {
            const repository = this.activeSessionRepositoryObs.read(reader);
            const headCommit = headCommitObs.read(reader);
            if (!repository || !headCommit) {
                return constObservable(undefined);
            }
            const lastCheckpointRef = lastCheckpointRefObs.read(reader);
            const beforeLastCheckpointRef = beforeLastCheckpointRefObs.read(reader);
            return lastCheckpointRef && beforeLastCheckpointRef
                ? new ObservablePromise(repository.diffBetweenWithStats2(`${beforeLastCheckpointRef}..${lastCheckpointRef}`)).resolvedValue
                : new ObservablePromise(repository.diffBetweenWithStats(`${headCommit}^`, headCommit)).resolvedValue;
        });
        // Combine both entry sources for display
        const combinedEntriesObs = derived(reader => {
            const headCommit = headCommitObs.read(reader);
            const versionMode = this.versionModeObs.read(reader);
            const editEntries = editSessionEntriesObs.read(reader);
            const sessionFiles = sessionFilesObs.read(reader);
            const lastTurnDiffChanges = lastTurnChangesObs.read(reader).read(reader);
            let sourceEntries;
            if (versionMode === "lastTurn" /* ChangesVersionMode.LastTurn */) {
                const diffChanges = lastTurnDiffChanges ?? [];
                const lastCheckpointRef = lastCheckpointRefObs.read(undefined);
                const beforeLastCheckpointRef = beforeLastCheckpointRefObs.read(undefined);
                const ref = lastCheckpointRef
                    ? lastCheckpointRef
                    : headCommit;
                const parentRef = beforeLastCheckpointRef
                    ? beforeLastCheckpointRef
                    : headCommit ? `${headCommit}^` : undefined;
                sourceEntries = diffChanges.map(change => {
                    const isDeletion = change.modifiedUri === undefined;
                    const isAddition = change.originalUri === undefined;
                    const uri = change.modifiedUri ?? change.uri;
                    const fileUri = isDeletion
                        ? uri
                        : ref
                            ? uri.with({ scheme: 'git', query: JSON.stringify({ path: uri.fsPath, ref }) })
                            : uri;
                    const originalUri = isAddition
                        ? change.originalUri
                        : parentRef
                            ? fileUri.with({ scheme: 'git', query: JSON.stringify({ path: fileUri.fsPath, ref: parentRef }) })
                            : change.originalUri;
                    return {
                        type: 'file',
                        uri: fileUri,
                        originalUri,
                        state: 1 /* ModifiedFileEntryState.Accepted */,
                        isDeletion,
                        changeType: isDeletion ? 'deleted' : isAddition ? 'added' : 'modified',
                        linesAdded: change.insertions,
                        linesRemoved: change.deletions,
                        reviewCommentCount: 0,
                    };
                });
            }
            else {
                sourceEntries = [...editEntries, ...sessionFiles];
            }
            const resources = new Set();
            const entries = [];
            for (const item of sourceEntries) {
                if (!resources.has(item.uri.fsPath)) {
                    resources.add(item.uri.fsPath);
                    entries.push(item);
                }
            }
            return entries.sort((a, b) => extUriBiasedIgnorePathCase.compare(a.uri, b.uri));
        });
        // Calculate stats from combined entries
        const topLevelStats = derived(reader => {
            const editEntries = editSessionEntriesObs.read(reader);
            const sessionFiles = sessionFilesObs.read(reader);
            const entries = combinedEntriesObs.read(reader);
            let added = 0, removed = 0;
            for (const entry of entries) {
                added += entry.linesAdded;
                removed += entry.linesRemoved;
            }
            const files = entries.length;
            const isSessionMenu = editEntries.length === 0 && sessionFiles.length > 0;
            return { files, added, removed, isSessionMenu };
        });
        // Setup context keys and actions toolbar
        if (this.actionsContainer) {
            dom.clearNode(this.actionsContainer);
            const scopedInstantiationService = this.renderDisposables.add(this.instantiationService.createChild(new ServiceCollection([IContextKeyService, this.scopedContextKeyService])));
            // Set the chat session type context key reactively so that menu items with
            // `chatSessionType == copilotcli` (e.g. Create Pull Request) are shown
            const chatSessionTypeKey = this.scopedContextKeyService.createKey(ChatContextKeys.agentSessionType.key, '');
            this.renderDisposables.add(autorun(reader => {
                const activeSession = this.activeSession.read(reader);
                chatSessionTypeKey.set(activeSession?.providerType ?? '');
            }));
            // Bind required context keys for the menu buttons
            this.renderDisposables.add(bindContextKey(hasUndecidedChatEditingResourceContextKey, this.scopedContextKeyService, r => {
                const session = activeEditingSessionObs.read(r);
                if (!session) {
                    return false;
                }
                const entries = session.entries.read(r);
                return entries.some(entry => entry.state.read(r) === 0 /* ModifiedFileEntryState.Modified */);
            }));
            this.renderDisposables.add(bindContextKey(hasAppliedChatEditsContextKey, this.scopedContextKeyService, r => {
                const session = activeEditingSessionObs.read(r);
                if (!session) {
                    return false;
                }
                const entries = session.entries.read(r);
                return entries.length > 0;
            }));
            const hasAgentSessionChangesObs = derived(reader => {
                const { files } = topLevelStats.read(reader);
                return files > 0;
            });
            this.renderDisposables.add(bindContextKey(ChatContextKeys.hasAgentSessionChanges, this.scopedContextKeyService, r => hasAgentSessionChangesObs.read(r)));
            const isMergeBaseBranchProtectedObs = derived(reader => {
                const activeSession = this.activeSession.read(reader);
                return activeSession?.worktreeBaseBranchProtected === true;
            });
            this.renderDisposables.add(bindContextKey(isMergeBaseBranchProtectedContextKey, this.scopedContextKeyService, r => isMergeBaseBranchProtectedObs.read(r)));
            const hasOpenPullRequestObs = derived(reader => {
                const sessionResource = activeSessionResource.read(reader);
                if (!sessionResource) {
                    return false;
                }
                sessionsChangedSignal.read(reader);
                const metadata = this.agentSessionsService.getSession(sessionResource)?.metadata;
                return !!metadata?.pullRequestUrl;
            });
            this.renderDisposables.add(bindContextKey(hasOpenPullRequestContextKey, this.scopedContextKeyService, r => hasOpenPullRequestObs.read(r)));
            this.renderDisposables.add(autorun(reader => {
                const { isSessionMenu, added, removed } = topLevelStats.read(reader);
                const sessionResource = activeSessionResource.read(reader);
                sessionsChangedSignal.read(reader); // Re-evaluate when session metadata changes (e.g. pullRequestUrl)
                const menuId = isSessionMenu ? MenuId.ChatEditingSessionChangesToolbar : MenuId.ChatEditingWidgetToolbar;
                // Read code review state to update the button label dynamically
                let reviewCommentCount;
                let codeReviewLoading = false;
                if (sessionResource) {
                    const prReviewState = this.codeReviewService.getPRReviewState(sessionResource).read(reader);
                    const prReviewCommentCount = prReviewState.kind === "loaded" /* PRReviewStateKind.Loaded */ ? prReviewState.comments.length : 0;
                    const sessionChanges = this.agentSessionsService.getSession(sessionResource)?.changes;
                    if (sessionChanges instanceof Array && sessionChanges.length > 0) {
                        const reviewFiles = getCodeReviewFilesFromSessionChanges(sessionChanges);
                        const reviewVersion = getCodeReviewVersion(reviewFiles);
                        const reviewState = this.codeReviewService.getReviewState(sessionResource).read(reader);
                        if (reviewState.kind === "loading" /* CodeReviewStateKind.Loading */ && reviewState.version === reviewVersion) {
                            codeReviewLoading = true;
                        }
                        else {
                            const codeReviewCommentCount = reviewState.kind === "result" /* CodeReviewStateKind.Result */ && reviewState.version === reviewVersion ? reviewState.comments.length : 0;
                            const totalReviewCommentCount = codeReviewCommentCount + prReviewCommentCount;
                            if (totalReviewCommentCount > 0) {
                                reviewCommentCount = totalReviewCommentCount;
                            }
                        }
                    }
                    else if (prReviewCommentCount > 0) {
                        reviewCommentCount = prReviewCommentCount;
                    }
                }
                reader.store.add(scopedInstantiationService.createInstance(MenuWorkbenchButtonBar, this.actionsContainer, menuId, {
                    telemetrySource: 'changesView',
                    disableWhileRunning: isSessionMenu,
                    menuOptions: isSessionMenu && sessionResource
                        ? { args: [sessionResource, this.agentSessionsService.getSession(sessionResource)?.metadata] }
                        : { shouldForwardArgs: true },
                    buttonConfigProvider: (action) => {
                        if (action.id === 'chatEditing.viewChanges' || action.id === 'chatEditing.viewPreviousEdits' || action.id === 'chatEditing.viewAllSessionChanges' || action.id === 'chat.openSessionWorktreeInVSCode') {
                            const diffStatsLabel = new MarkdownString(`<span class="working-set-lines-added">+${added}</span>&nbsp;<span class="working-set-lines-removed">-${removed}</span>`, { supportHtml: true });
                            return { showIcon: true, showLabel: true, isSecondary: true, customClass: 'working-set-diff-stats', customLabel: diffStatsLabel };
                        }
                        if (action.id === RUN_SESSION_CODE_REVIEW_ACTION_ID) {
                            if (codeReviewLoading) {
                                return { showIcon: true, showLabel: true, isSecondary: true, customLabel: '$(loading~spin)', customClass: 'code-review-loading' };
                            }
                            if (reviewCommentCount !== undefined) {
                                return { showIcon: true, showLabel: true, isSecondary: true, customLabel: String(reviewCommentCount), customClass: 'code-review-comments' };
                            }
                            return { showIcon: true, showLabel: false, isSecondary: true };
                        }
                        if (action.id === 'chatEditing.synchronizeChanges') {
                            return { showIcon: true, showLabel: true, isSecondary: false };
                        }
                        if (action.id === 'github.copilot.chat.createPullRequestCopilotCLIAgentSession.createPR') {
                            return { showIcon: true, showLabel: true, isSecondary: false };
                        }
                        if (action.id === 'github.copilot.chat.openPullRequestCopilotCLIAgentSession.openPR') {
                            return { showIcon: true, showLabel: false, isSecondary: true };
                        }
                        if (action.id === 'github.copilot.chat.mergeCopilotCLIAgentSessionChanges.merge') {
                            return { showIcon: true, showLabel: true, isSecondary: false };
                        }
                        return undefined;
                    }
                }));
            }));
        }
        // Update visibility based on entries
        this.renderDisposables.add(autorun(reader => {
            const { files } = topLevelStats.read(reader);
            const hasEntries = files > 0;
            dom.setVisibility(hasEntries, this.contentContainer);
            dom.setVisibility(hasEntries, this.actionsContainer);
            dom.setVisibility(!hasEntries, this.welcomeContainer);
        }));
        // Update badge when file count changes
        this.renderDisposables.add(autorun(reader => {
            this.updateBadge(topLevelStats.read(reader).files);
        }));
        // Update summary text (line counts only, file count is shown in badge)
        if (this.summaryContainer) {
            dom.clearNode(this.summaryContainer);
            const linesAddedSpan = dom.$('.working-set-lines-added');
            const linesRemovedSpan = dom.$('.working-set-lines-removed');
            this.summaryContainer.appendChild(linesAddedSpan);
            this.summaryContainer.appendChild(linesRemovedSpan);
            this.renderDisposables.add(autorun(reader => {
                const { added, removed } = topLevelStats.read(reader);
                linesAddedSpan.textContent = `+${added}`;
                linesRemovedSpan.textContent = `-${removed}`;
            }));
        }
        // Create the tree
        if (!this.tree && this.listContainer) {
            const resourceLabels = this._register(this.instantiationService.createInstance(ResourceLabels, { onDidChangeVisibility: this.onDidChangeBodyVisibility }));
            this.tree = this.instantiationService.createInstance((WorkbenchCompressibleObjectTree), 'ChangesViewTree', this.listContainer, new ChangesTreeDelegate(), [this.instantiationService.createInstance(ChangesTreeRenderer, resourceLabels, MenuId.ChatEditingWidgetModifiedFilesToolbar)], {
                alwaysConsumeMouseWheel: false,
                accessibilityProvider: {
                    getAriaLabel: (element) => isChangesFileItem(element) ? basename(element.uri.path) : element.name,
                    getWidgetAriaLabel: () => localize(3092, null)
                },
                dnd: {
                    getDragURI: (element) => element.uri.toString(),
                    getDragLabel: (elements) => {
                        const uris = elements.map(e => e.uri);
                        if (uris.length === 1) {
                            return this.labelService.getUriLabel(uris[0], { relative: true });
                        }
                        return `${uris.length}`;
                    },
                    dispose: () => { },
                    onDragOver: () => false,
                    drop: () => { },
                    onDragStart: (data, originalEvent) => {
                        try {
                            const elements = data.getData();
                            const uris = elements.filter(isChangesFileItem).map(e => e.uri);
                            this.instantiationService.invokeFunction(accessor => fillEditorsDragData(accessor, uris, originalEvent));
                        }
                        catch {
                            // noop
                        }
                    },
                },
                identityProvider: {
                    getId: (element) => element.uri.toString()
                },
                compressionEnabled: true,
                twistieAdditionalCssClass: (e) => {
                    return this.viewMode === "list" /* ChangesViewMode.List */
                        ? 'force-no-twistie'
                        : undefined;
                },
            });
        }
        // Register tree event handlers
        if (this.tree) {
            const tree = this.tree;
            // Re-layout when collapse state changes so the card height adjusts
            this.renderDisposables.add(tree.onDidChangeContentHeight(() => this.layoutTree()));
            const openFileItem = (item, items, sideBySide) => {
                const { uri: modifiedFileUri, originalUri, isDeletion } = item;
                const currentIndex = items.indexOf(item);
                const navigation = {
                    total: items.length,
                    current: currentIndex,
                    navigate: (index) => {
                        const target = items[index];
                        if (target) {
                            openFileItem(target, items, false);
                        }
                    }
                };
                const group = sideBySide ? SIDE_GROUP : ACTIVE_GROUP;
                if (isDeletion && originalUri) {
                    this.editorService.openEditor({
                        resource: originalUri,
                        options: { modal: { navigation } }
                    }, group);
                    return;
                }
                if (originalUri) {
                    this.editorService.openEditor({
                        original: { resource: originalUri },
                        modified: { resource: modifiedFileUri },
                        options: { modal: { navigation } }
                    }, group);
                    return;
                }
                this.editorService.openEditor({
                    resource: modifiedFileUri,
                    options: { modal: { navigation } }
                }, group);
            };
            this.renderDisposables.add(tree.onDidOpen((e) => {
                if (!e.element || !isChangesFileItem(e.element)) {
                    return;
                }
                const items = combinedEntriesObs.get();
                openFileItem(e.element, items, e.sideBySide);
            }));
        }
        // Bind CI status widget to active session's PR CI model
        if (this.ciStatusWidget) {
            const activeSessionResourceObs = derived(this, reader => this.sessionManagementService.activeSession.read(reader)?.resource);
            const ciModelObs = derived(this, reader => {
                const session = this.sessionManagementService.activeSession.read(reader);
                if (!session) {
                    return undefined;
                }
                const context = this.sessionManagementService.getGitHubContextForSession(session.resource);
                if (!context || context.prNumber === undefined) {
                    return undefined;
                }
                // Use the PR's headRef from the PR model to get CI checks
                const prModel = this.gitHubService.getPullRequest(context.owner, context.repo, context.prNumber);
                const pr = prModel.pullRequest.read(reader);
                if (!pr) {
                    // Trigger a refresh if PR data isn't loaded yet
                    prModel.refresh();
                    return undefined;
                }
                const ciModel = this.gitHubService.getPullRequestCI(context.owner, context.repo, pr.headRef);
                ciModel.refresh();
                return ciModel;
            });
            this.renderDisposables.add(this.ciStatusWidget.bind(ciModelObs, activeSessionResourceObs));
        }
        // Update tree data with combined entries
        this.renderDisposables.add(autorun(reader => {
            const entries = combinedEntriesObs.read(reader);
            const viewMode = this.viewModeObs.read(reader);
            if (!this.tree) {
                return;
            }
            // Toggle list-mode class to remove tree indentation in list mode
            this.listContainer?.classList.toggle('list-mode', viewMode === "list" /* ChangesViewMode.List */);
            if (viewMode === "tree" /* ChangesViewMode.Tree */) {
                // Tree mode: build hierarchical tree from file entries
                const treeChildren = buildTreeChildren(entries);
                this.tree.setChildren(null, treeChildren);
            }
            else {
                // List mode: flat list of file items
                const listChildren = entries.map(item => ({
                    element: item,
                    collapsible: false,
                }));
                this.tree.setChildren(null, listChildren);
            }
            this.layoutTree();
        }));
    }
    layoutTree() {
        if (!this.tree || !this.listContainer) {
            return;
        }
        // Calculate remaining height for the tree by subtracting other elements
        const bodyHeight = this.currentBodyHeight;
        if (bodyHeight <= 0) {
            return;
        }
        // Measure non-list elements height (padding, actions, overview)
        const bodyPadding = 16; // 8px top + 8px bottom from .changes-view-body
        const actionsHeight = this.actionsContainer?.offsetHeight ?? 0;
        const actionsMargin = actionsHeight > 0 ? 8 : 0; // margin-bottom on actions container
        const overviewHeight = this.overviewContainer?.offsetHeight ?? 0;
        const containerPadding = 8; // 4px top + 4px bottom from .chat-editing-session-container
        const containerBorder = 2; // 1px top + 1px bottom border
        const fixedUsed = bodyPadding + actionsHeight + actionsMargin + overviewHeight + containerPadding + containerBorder;
        // Determine CI widget space needs
        const ciWidget = this.ciStatusWidget;
        const ciVisible = ciWidget?.visible ?? false;
        const ciHeaderHeight = ciVisible ? CIStatusWidget.HEADER_HEIGHT : 0;
        const ciMargin = ciVisible ? 8 : 0; // margin-top on CI widget
        const ciDesiredHeight = ciWidget?.desiredHeight ?? 0;
        const spaceForTreeAndCI = Math.max(0, bodyHeight - fixedUsed - ciMargin);
        // Give the tree priority, then CI gets the rest (with min/max on CI body)
        const treeContentHeight = this.tree.contentHeight;
        let treeHeight;
        let ciBodyHeight = 0;
        if (!ciVisible) {
            treeHeight = Math.min(spaceForTreeAndCI, treeContentHeight);
        }
        else {
            // Reserve space for the CI header
            const spaceAfterCIHeader = Math.max(0, spaceForTreeAndCI - ciHeaderHeight);
            // Give the tree what it needs first, up to available space
            treeHeight = Math.min(spaceAfterCIHeader, treeContentHeight);
            // Remaining goes to CI body
            const remainingForCIBody = Math.max(0, spaceAfterCIHeader - treeHeight);
            const ciDesiredBodyHeight = Math.max(0, ciDesiredHeight - ciHeaderHeight);
            ciBodyHeight = Math.min(ciDesiredBodyHeight, remainingForCIBody);
            // Ensure CI body gets at least MIN_BODY_HEIGHT if there's content
            if (ciDesiredBodyHeight > 0 && ciBodyHeight < CIStatusWidget.MIN_BODY_HEIGHT) {
                const minCIBody = Math.min(CIStatusWidget.MIN_BODY_HEIGHT, ciDesiredBodyHeight);
                const needed = minCIBody - ciBodyHeight;
                const canTake = Math.max(0, treeHeight - 0); // tree can shrink to 0
                const taken = Math.min(needed, canTake);
                treeHeight -= taken;
                ciBodyHeight += taken;
            }
            // Cap CI body at MAX_BODY_HEIGHT
            ciBodyHeight = Math.min(ciBodyHeight, CIStatusWidget.MAX_BODY_HEIGHT);
            ciWidget.layout(ciBodyHeight);
        }
        this.tree.layout(treeHeight, this.currentBodyWidth);
        this.tree.getHTMLElement().style.height = `${treeHeight}px`;
    }
    layoutBody(height, width) {
        super.layoutBody(height, width);
        this.currentBodyHeight = height;
        this.currentBodyWidth = width;
        this.layoutTree();
    }
    focus() {
        super.focus();
        this.tree?.domFocus();
    }
    dispose() {
        this.tree?.dispose();
        this.tree = undefined;
        super.dispose();
    }
};
ChangesViewPane = __decorate([
    __param(1, IKeybindingService),
    __param(2, IContextMenuService),
    __param(3, IConfigurationService),
    __param(4, IContextKeyService),
    __param(5, IViewDescriptorService),
    __param(6, IInstantiationService),
    __param(7, IOpenerService),
    __param(8, IThemeService),
    __param(9, IHoverService),
    __param(10, IChatEditingService),
    __param(11, IEditorService),
    __param(12, IActivityService),
    __param(13, IAgentSessionsService),
    __param(14, ISessionsManagementService),
    __param(15, ILabelService),
    __param(16, IStorageService),
    __param(17, ICodeReviewService),
    __param(18, IGitService),
    __param(19, IGitHubService)
], ChangesViewPane);
export { ChangesViewPane };
let ChangesViewPaneContainer = class ChangesViewPaneContainer extends ViewPaneContainer {
    constructor(layoutService, telemetryService, instantiationService, contextMenuService, themeService, storageService, configurationService, extensionService, contextService, viewDescriptorService, logService) {
        super(CHANGES_VIEW_CONTAINER_ID, { mergeViewWithContainerWhenSingleView: true }, instantiationService, configurationService, layoutService, contextMenuService, telemetryService, extensionService, themeService, storageService, contextService, viewDescriptorService, logService);
    }
    create(parent) {
        super.create(parent);
        parent.classList.add('changes-viewlet');
    }
};
ChangesViewPaneContainer = __decorate([
    __param(0, IWorkbenchLayoutService),
    __param(1, ITelemetryService),
    __param(2, IInstantiationService),
    __param(3, IContextMenuService),
    __param(4, IThemeService),
    __param(5, IStorageService),
    __param(6, IConfigurationService),
    __param(7, IExtensionService),
    __param(8, IWorkspaceContextService),
    __param(9, IViewDescriptorService),
    __param(10, ILogService)
], ChangesViewPaneContainer);
export { ChangesViewPaneContainer };
// --- Tree Delegate & Renderer
class ChangesTreeDelegate {
    getHeight(_element) {
        return 22;
    }
    getTemplateId(_element) {
        return ChangesTreeRenderer.TEMPLATE_ID;
    }
}
let ChangesTreeRenderer = class ChangesTreeRenderer {
    static { ChangesTreeRenderer_1 = this; }
    static { this.TEMPLATE_ID = 'changesTreeRenderer'; }
    constructor(labels, menuId, instantiationService, contextKeyService, labelService) {
        this.labels = labels;
        this.menuId = menuId;
        this.instantiationService = instantiationService;
        this.contextKeyService = contextKeyService;
        this.labelService = labelService;
        this.templateId = ChangesTreeRenderer_1.TEMPLATE_ID;
    }
    renderTemplate(container) {
        const templateDisposables = new DisposableStore();
        const label = templateDisposables.add(this.labels.create(container, { supportHighlights: true, supportIcons: true }));
        const reviewCommentsBadge = dom.$('.changes-review-comments-badge');
        label.element.appendChild(reviewCommentsBadge);
        const lineCountsContainer = $('.working-set-line-counts');
        const addedSpan = dom.$('.working-set-lines-added');
        const removedSpan = dom.$('.working-set-lines-removed');
        lineCountsContainer.appendChild(addedSpan);
        lineCountsContainer.appendChild(removedSpan);
        label.element.appendChild(lineCountsContainer);
        const decorationBadge = dom.$('.changes-decoration-badge');
        label.element.appendChild(decorationBadge);
        let toolbar;
        let contextKeyService;
        if (this.menuId) {
            const actionBarContainer = $('.chat-collapsible-list-action-bar');
            contextKeyService = templateDisposables.add(this.contextKeyService.createScoped(actionBarContainer));
            const scopedInstantiationService = templateDisposables.add(this.instantiationService.createChild(new ServiceCollection([IContextKeyService, contextKeyService])));
            toolbar = templateDisposables.add(scopedInstantiationService.createInstance(MenuWorkbenchToolBar, actionBarContainer, this.menuId, { menuOptions: { shouldForwardArgs: true, arg: undefined } }));
            label.element.appendChild(actionBarContainer);
        }
        return { templateDisposables, label, toolbar, contextKeyService, reviewCommentsBadge, decorationBadge, addedSpan, removedSpan, lineCountsContainer };
    }
    renderElement(node, _index, templateData) {
        const element = node.element;
        templateData.label.element.style.display = 'flex';
        if (isChangesFileItem(element)) {
            this.renderFileElement(element, templateData);
        }
        else {
            this.renderFolderElement(element, templateData);
        }
    }
    renderCompressedElements(node, _index, templateData) {
        const compressed = node.element;
        const lastElement = compressed.elements[compressed.elements.length - 1];
        templateData.label.element.style.display = 'flex';
        if (isChangesFileItem(lastElement)) {
            // Shouldn't happen in practice - files don't get compressed
            this.renderFileElement(lastElement, templateData);
        }
        else {
            // Compressed folder chain - show joined folder names
            const label = compressed.elements.map(e => isChangesFileItem(e) ? basename(e.uri.path) : e.name);
            templateData.label.setResource({ resource: lastElement.uri, name: label }, {
                fileKind: FileKind.FOLDER,
                separator: this.labelService.getSeparator(lastElement.uri.scheme),
            });
            // Hide file-specific decorations for folders
            templateData.reviewCommentsBadge.style.display = 'none';
            templateData.decorationBadge.style.display = 'none';
            templateData.lineCountsContainer.style.display = 'none';
            if (templateData.toolbar) {
                templateData.toolbar.context = undefined;
            }
            if (templateData.contextKeyService) {
                chatEditingWidgetFileStateContextKey.bindTo(templateData.contextKeyService).set(undefined);
            }
        }
    }
    renderFileElement(data, templateData) {
        templateData.label.setFile(data.uri, {
            fileKind: FileKind.FILE,
            fileDecorations: undefined,
            strikethrough: data.changeType === 'deleted',
            hidePath: true,
        });
        // Show file-specific decorations
        templateData.lineCountsContainer.style.display = '';
        templateData.decorationBadge.style.display = '';
        if (data.reviewCommentCount > 0) {
            templateData.reviewCommentsBadge.style.display = '';
            templateData.reviewCommentsBadge.className = 'changes-review-comments-badge';
            templateData.reviewCommentsBadge.replaceChildren(dom.$('.codicon.codicon-comment-unresolved'), dom.$('span', undefined, `${data.reviewCommentCount}`));
        }
        else {
            templateData.reviewCommentsBadge.style.display = 'none';
            templateData.reviewCommentsBadge.replaceChildren();
        }
        // Update decoration badge (A/M/D)
        const badge = templateData.decorationBadge;
        badge.className = 'changes-decoration-badge';
        switch (data.changeType) {
            case 'added':
                badge.textContent = 'A';
                badge.classList.add('added');
                break;
            case 'deleted':
                badge.textContent = 'D';
                badge.classList.add('deleted');
                break;
            case 'modified':
            default:
                badge.textContent = 'M';
                badge.classList.add('modified');
                break;
        }
        templateData.addedSpan.textContent = `+${data.linesAdded}`;
        templateData.removedSpan.textContent = `-${data.linesRemoved}`;
        // eslint-disable-next-line no-restricted-syntax
        templateData.label.element.querySelector('.monaco-icon-name-container')?.classList.add('modified');
        if (templateData.toolbar) {
            templateData.toolbar.context = data.uri;
        }
        if (templateData.contextKeyService) {
            chatEditingWidgetFileStateContextKey.bindTo(templateData.contextKeyService).set(data.state);
        }
    }
    renderFolderElement(data, templateData) {
        templateData.label.setFile(data.uri, {
            fileKind: FileKind.FOLDER,
        });
        // Hide file-specific decorations for folders
        templateData.reviewCommentsBadge.style.display = 'none';
        templateData.decorationBadge.style.display = 'none';
        templateData.lineCountsContainer.style.display = 'none';
        if (templateData.toolbar) {
            templateData.toolbar.context = undefined;
        }
        if (templateData.contextKeyService) {
            chatEditingWidgetFileStateContextKey.bindTo(templateData.contextKeyService).set(undefined);
        }
    }
    disposeTemplate(templateData) {
        templateData.templateDisposables.dispose();
    }
};
ChangesTreeRenderer = ChangesTreeRenderer_1 = __decorate([
    __param(2, IInstantiationService),
    __param(3, IContextKeyService),
    __param(4, ILabelService)
], ChangesTreeRenderer);
// --- View Mode Actions
class SetChangesListViewModeAction extends ViewAction {
    constructor() {
        super({
            id: 'workbench.changesView.action.setListViewMode',
            title: localize(3093, null),
            viewId: CHANGES_VIEW_ID,
            f1: false,
            icon: Codicon.listTree,
            toggled: changesViewModeContextKey.isEqualTo("list" /* ChangesViewMode.List */),
            menu: {
                id: MenuId.ViewTitle,
                when: ContextKeyExpr.equals('view', CHANGES_VIEW_ID),
                group: '1_viewmode',
                order: 1
            }
        });
    }
    async runInView(_, view) {
        view.viewMode = "list" /* ChangesViewMode.List */;
    }
}
class SetChangesTreeViewModeAction extends ViewAction {
    constructor() {
        super({
            id: 'workbench.changesView.action.setTreeViewMode',
            title: localize(3094, null),
            viewId: CHANGES_VIEW_ID,
            f1: false,
            icon: Codicon.listFlat,
            toggled: changesViewModeContextKey.isEqualTo("tree" /* ChangesViewMode.Tree */),
            menu: {
                id: MenuId.ViewTitle,
                when: ContextKeyExpr.equals('view', CHANGES_VIEW_ID),
                group: '1_viewmode',
                order: 2
            }
        });
    }
    async runInView(_, view) {
        view.viewMode = "tree" /* ChangesViewMode.Tree */;
    }
}
registerAction2(SetChangesListViewModeAction);
registerAction2(SetChangesTreeViewModeAction);
// --- Versions Submenu
MenuRegistry.appendMenuItem(MenuId.ViewTitle, {
    submenu: MenuId.ChatEditingSessionChangesVersionsSubmenu,
    title: localize2(3095, 'Versions'),
    icon: Codicon.versions,
    group: 'navigation',
    order: 9,
    when: ContextKeyExpr.and(ContextKeyExpr.equals('view', CHANGES_VIEW_ID), IsSessionsWindowContext, ChatContextKeys.hasAgentSessionChanges),
});
class AllChangesAction extends Action2 {
    constructor() {
        super({
            id: 'chatEditing.versionsAllChanges',
            title: localize2(3096, 'All Changes'),
            category: CHAT_CATEGORY,
            toggled: changesVersionModeContextKey.isEqualTo("allChanges" /* ChangesVersionMode.AllChanges */),
            menu: [{
                    id: MenuId.ChatEditingSessionChangesVersionsSubmenu,
                    group: '1_changes',
                    order: 1,
                }],
        });
    }
    async run(accessor) {
        const viewsService = accessor.get(IViewsService);
        const view = viewsService.getActiveViewWithId(CHANGES_VIEW_ID);
        view?.setVersionMode("allChanges" /* ChangesVersionMode.AllChanges */);
    }
}
registerAction2(AllChangesAction);
class LastTurnChangesAction extends Action2 {
    constructor() {
        super({
            id: 'chatEditing.versionsLastTurnChanges',
            title: localize2(3097, "Last Turn's Changes"),
            category: CHAT_CATEGORY,
            toggled: changesVersionModeContextKey.isEqualTo("lastTurn" /* ChangesVersionMode.LastTurn */),
            menu: [{
                    id: MenuId.ChatEditingSessionChangesVersionsSubmenu,
                    group: '1_changes',
                    order: 2,
                }],
        });
    }
    async run(accessor) {
        const viewsService = accessor.get(IViewsService);
        const view = viewsService.getActiveViewWithId(CHANGES_VIEW_ID);
        view?.setVersionMode("lastTurn" /* ChangesVersionMode.LastTurn */);
    }
}
registerAction2(LastTurnChangesAction);
//# sourceMappingURL=changesView.js.map