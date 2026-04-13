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
var CodeReviewService_1;
import { Disposable, DisposableStore } from '../../../../base/common/lifecycle.js';
import { autorun, observableValue, transaction } from '../../../../base/common/observable.js';
import { URI } from '../../../../base/common/uri.js';
import { Range } from '../../../../editor/common/core/range.js';
import { createDecorator } from '../../../../platform/instantiation/common/instantiation.js';
import { ICommandService } from '../../../../platform/commands/common/commands.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { IStorageService } from '../../../../platform/storage/common/storage.js';
import { generateUuid } from '../../../../base/common/uuid.js';
import { hash } from '../../../../base/common/hash.js';
import { hasKey } from '../../../../base/common/types.js';
import { isIChatSessionFileChange2 } from '../../../../workbench/contrib/chat/common/chatSessionsService.js';
import { IAgentSessionsService } from '../../../../workbench/contrib/chat/browser/agentSessions/agentSessionsService.js';
import { IGitHubService } from '../../github/browser/githubService.js';
import { ISessionsManagementService } from '../../sessions/browser/sessionsManagementService.js';
export function getCodeReviewFilesFromSessionChanges(changes) {
    return changes.map(change => {
        if (isIChatSessionFileChange2(change)) {
            return {
                currentUri: change.modifiedUri ?? change.uri,
                baseUri: change.originalUri,
            };
        }
        return {
            currentUri: change.modifiedUri,
            baseUri: change.originalUri,
        };
    });
}
export function getCodeReviewVersion(files) {
    const stableFileList = files
        .map(file => `${file.currentUri.toString()}|${file.baseUri?.toString() ?? ''}`)
        .sort();
    return `v1:${stableFileList.length}:${hash(stableFileList)}`;
}
export const MAX_CODE_REVIEWS_PER_SESSION_VERSION = 5;
export var CodeReviewStateKind;
(function (CodeReviewStateKind) {
    CodeReviewStateKind["Idle"] = "idle";
    CodeReviewStateKind["Loading"] = "loading";
    CodeReviewStateKind["Result"] = "result";
    CodeReviewStateKind["Error"] = "error";
})(CodeReviewStateKind || (CodeReviewStateKind = {}));
// --- PR Review Types ---------------------------------------------------------
export var PRReviewStateKind;
(function (PRReviewStateKind) {
    PRReviewStateKind["None"] = "none";
    PRReviewStateKind["Loading"] = "loading";
    PRReviewStateKind["Loaded"] = "loaded";
    PRReviewStateKind["Error"] = "error";
})(PRReviewStateKind || (PRReviewStateKind = {}));
// --- Service Interface -------------------------------------------------------
export const ICodeReviewService = createDecorator('codeReviewService');
function isRawCodeReviewRangeWithPositions(range) {
    return typeof range === 'object' && range !== null && hasKey(range, { start: true, end: true });
}
function isRawCodeReviewRangeTuple(range) {
    return Array.isArray(range) && range.length >= 2;
}
function normalizeCodeReviewUri(uri) {
    return typeof uri === 'string' ? URI.parse(uri) : URI.revive(uri);
}
function normalizeCodeReviewRange(range) {
    if (Range.isIRange(range)) {
        return Range.lift(range);
    }
    if (isRawCodeReviewRangeTuple(range)) {
        const [start, end] = range;
        return new Range((start.line ?? 0) + 1, (start.character ?? 0) + 1, (end.line ?? start.line ?? 0) + 1, (end.character ?? start.character ?? 0) + 1);
    }
    if (isRawCodeReviewRangeWithPositions(range) && range.start && range.end) {
        return new Range((range.start.line ?? 0) + 1, (range.start.character ?? 0) + 1, (range.end.line ?? range.start.line ?? 0) + 1, (range.end.character ?? range.start.character ?? 0) + 1);
    }
    const lineRange = range;
    return new Range((lineRange.startLine ?? 0) + 1, (lineRange.startColumn ?? 0) + 1, (lineRange.endLine ?? lineRange.startLine ?? 0) + 1, (lineRange.endColumn ?? lineRange.startColumn ?? 0) + 1);
}
function normalizeCodeReviewSuggestion(suggestion) {
    if (!suggestion) {
        return undefined;
    }
    return {
        edits: suggestion.edits.map(edit => ({
            range: normalizeCodeReviewRange(edit.range),
            newText: edit.newText,
            oldText: edit.oldText,
        })),
    };
}
let CodeReviewService = class CodeReviewService extends Disposable {
    static { CodeReviewService_1 = this; }
    static { this._STORAGE_KEY = 'codeReview.reviews'; }
    constructor(_commandService, _logService, _storageService, _gitHubService, _sessionsManagementService, _agentSessionsService) {
        super();
        this._commandService = _commandService;
        this._logService = _logService;
        this._storageService = _storageService;
        this._gitHubService = _gitHubService;
        this._sessionsManagementService = _sessionsManagementService;
        this._agentSessionsService = _agentSessionsService;
        this._reviewsBySession = new Map();
        this._prReviewBySession = new Map();
        this._loadFromStorage();
        this._registerSessionListeners();
        this._register(autorun(reader => {
            const activeSession = this._sessionsManagementService.activeSession.read(reader);
            if (activeSession) {
                this._ensurePRReviewInitialized(activeSession.resource);
            }
        }));
        this._register(this._agentSessionsService.model.onDidChangeSessions(() => {
            for (const session of this._agentSessionsService.model.sessions) {
                if (!session.isArchived()) {
                    this._ensurePRReviewInitialized(session.resource);
                }
            }
        }));
        this._register(this._agentSessionsService.model.onDidChangeSessionArchivedState(e => {
            if (e.isArchived()) {
                this._disposePRReview(e.resource);
            }
        }));
    }
    getReviewState(sessionResource) {
        return this._getOrCreateData(sessionResource).state;
    }
    hasReview(sessionResource, version) {
        const data = this._reviewsBySession.get(sessionResource.toString());
        if (!data) {
            return false;
        }
        const state = data.state.get();
        return state.kind === "result" /* CodeReviewStateKind.Result */ && state.version === version;
    }
    requestReview(sessionResource, version, files) {
        const data = this._getOrCreateData(sessionResource);
        const currentState = data.state.get();
        const currentReviewCount = currentState.kind !== "idle" /* CodeReviewStateKind.Idle */ && currentState.version === version ? currentState.reviewCount : 0;
        // Don't re-request if already loading or unresolved comments remain for this version.
        if (currentState.kind === "loading" /* CodeReviewStateKind.Loading */ && currentState.version === version) {
            return;
        }
        if (currentReviewCount >= MAX_CODE_REVIEWS_PER_SESSION_VERSION) {
            return;
        }
        if (currentState.kind === "result" /* CodeReviewStateKind.Result */ && currentState.version === version && currentState.comments.length > 0) {
            return;
        }
        data.state.set({ kind: "loading" /* CodeReviewStateKind.Loading */, version, reviewCount: currentReviewCount + 1 }, undefined);
        this._executeReview(sessionResource, version, files, data);
    }
    removeComment(sessionResource, commentId) {
        const data = this._reviewsBySession.get(sessionResource.toString());
        if (!data) {
            return;
        }
        const state = data.state.get();
        if (state.kind !== "result" /* CodeReviewStateKind.Result */) {
            return;
        }
        const filtered = state.comments.filter(c => c.id !== commentId);
        data.state.set({ kind: "result" /* CodeReviewStateKind.Result */, version: state.version, reviewCount: state.reviewCount, comments: filtered, didProduceComments: state.didProduceComments }, undefined);
        this._saveToStorage();
    }
    updateComment(sessionResource, commentId, newBody) {
        const data = this._reviewsBySession.get(sessionResource.toString());
        if (!data) {
            return;
        }
        const state = data.state.get();
        if (state.kind !== "result" /* CodeReviewStateKind.Result */) {
            return;
        }
        const updated = state.comments.map(c => c.id === commentId ? { ...c, body: newBody } : c);
        data.state.set({ kind: "result" /* CodeReviewStateKind.Result */, version: state.version, reviewCount: state.reviewCount, comments: updated, didProduceComments: state.didProduceComments }, undefined);
        this._saveToStorage();
    }
    dismissReview(sessionResource) {
        const data = this._reviewsBySession.get(sessionResource.toString());
        if (data) {
            data.state.set({ kind: "idle" /* CodeReviewStateKind.Idle */ }, undefined);
            this._saveToStorage();
        }
    }
    _getOrCreateData(sessionResource) {
        const key = sessionResource.toString();
        let data = this._reviewsBySession.get(key);
        if (!data) {
            data = {
                state: observableValue(`codeReview.state.${key}`, { kind: "idle" /* CodeReviewStateKind.Idle */ }),
            };
            this._reviewsBySession.set(key, data);
        }
        return data;
    }
    async _executeReview(sessionResource, version, files, data) {
        try {
            const result = await this._commandService.executeCommand('chat.internal.codeReview.run', {
                files: files.map(f => ({
                    currentUri: f.currentUri,
                    baseUri: f.baseUri,
                })),
            });
            // Check if version is still current (hasn't been dismissed or replaced)
            const currentState = data.state.get();
            if (currentState.kind !== "loading" /* CodeReviewStateKind.Loading */ || currentState.version !== version) {
                return;
            }
            if (!result || result.type === 'cancelled') {
                data.state.set({ kind: "idle" /* CodeReviewStateKind.Idle */ }, undefined);
                return;
            }
            if (result.type === 'error') {
                data.state.set({ kind: "error" /* CodeReviewStateKind.Error */, version, reviewCount: currentState.reviewCount, reason: result.reason ?? 'Unknown error' }, undefined);
                return;
            }
            if (result.type === 'success') {
                const comments = (result.comments ?? []).map((raw) => ({
                    id: generateUuid(),
                    uri: normalizeCodeReviewUri(raw.uri),
                    range: normalizeCodeReviewRange(raw.range),
                    body: raw.body ?? '',
                    kind: raw.kind ?? '',
                    severity: raw.severity ?? '',
                    suggestion: normalizeCodeReviewSuggestion(raw.suggestion),
                }));
                transaction(tx => {
                    data.state.set({ kind: "result" /* CodeReviewStateKind.Result */, version, reviewCount: currentState.reviewCount, comments, didProduceComments: comments.length > 0 }, tx);
                });
                this._saveToStorage();
            }
        }
        catch (err) {
            const currentState = data.state.get();
            if (currentState.kind === "loading" /* CodeReviewStateKind.Loading */ && currentState.version === version) {
                data.state.set({ kind: "error" /* CodeReviewStateKind.Error */, version, reviewCount: currentState.reviewCount, reason: String(err) }, undefined);
            }
        }
    }
    _loadFromStorage() {
        const raw = this._storageService.get(CodeReviewService_1._STORAGE_KEY, 1 /* StorageScope.WORKSPACE */);
        if (!raw) {
            return;
        }
        try {
            const stored = JSON.parse(raw);
            for (const [key, review] of Object.entries(stored)) {
                const comments = review.comments.map(c => ({
                    id: c.id,
                    uri: URI.revive(c.uri),
                    range: c.range,
                    body: c.body,
                    kind: c.kind,
                    severity: c.severity,
                    suggestion: c.suggestion,
                }));
                const data = this._getOrCreateData(URI.parse(key));
                data.state.set({ kind: "result" /* CodeReviewStateKind.Result */, version: review.version, reviewCount: review.reviewCount ?? 1, comments, didProduceComments: review.didProduceComments ?? comments.length > 0 }, undefined);
            }
        }
        catch {
            // Corrupted storage data - ignore
        }
    }
    _saveToStorage() {
        const stored = {};
        for (const [key, data] of this._reviewsBySession) {
            const state = data.state.get();
            if (state.kind === "result" /* CodeReviewStateKind.Result */) {
                stored[key] = {
                    version: state.version,
                    reviewCount: state.reviewCount,
                    didProduceComments: state.didProduceComments,
                    comments: state.comments.map(c => ({
                        id: c.id,
                        uri: c.uri.toJSON(),
                        range: c.range,
                        body: c.body,
                        kind: c.kind,
                        severity: c.severity,
                        suggestion: c.suggestion,
                    })),
                };
            }
        }
        if (Object.keys(stored).length === 0) {
            this._storageService.remove(CodeReviewService_1._STORAGE_KEY, 1 /* StorageScope.WORKSPACE */);
        }
        else {
            this._storageService.store(CodeReviewService_1._STORAGE_KEY, JSON.stringify(stored), 1 /* StorageScope.WORKSPACE */, 1 /* StorageTarget.MACHINE */);
        }
    }
    _registerSessionListeners() {
        // Clean up when a session is archived
        this._register(this._agentSessionsService.onDidChangeSessionArchivedState(session => {
            if (session.isArchived()) {
                const key = session.resource.toString();
                const data = this._reviewsBySession.get(key);
                if (data) {
                    data.state.set({ kind: "idle" /* CodeReviewStateKind.Idle */ }, undefined);
                    this._saveToStorage();
                }
            }
        }));
        // Clean up when session changes make a review version outdated
        this._register(this._agentSessionsService.model.onDidChangeSessions(() => {
            let changed = false;
            for (const [key, data] of this._reviewsBySession) {
                const state = data.state.get();
                if (state.kind !== "result" /* CodeReviewStateKind.Result */) {
                    continue;
                }
                const session = this._agentSessionsService.getSession(URI.parse(key));
                if (!session) {
                    // Session no longer exists - clean up
                    data.state.set({ kind: "idle" /* CodeReviewStateKind.Idle */ }, undefined);
                    changed = true;
                    continue;
                }
                if (!(session.changes instanceof Array) || session.changes.length === 0) {
                    // Session has no file-level changes - clean up
                    data.state.set({ kind: "idle" /* CodeReviewStateKind.Idle */ }, undefined);
                    changed = true;
                    continue;
                }
                const files = getCodeReviewFilesFromSessionChanges(session.changes);
                const currentVersion = getCodeReviewVersion(files);
                if (state.version !== currentVersion) {
                    // Version mismatch - review is stale
                    data.state.set({ kind: "idle" /* CodeReviewStateKind.Idle */ }, undefined);
                    changed = true;
                }
            }
            if (changed) {
                this._saveToStorage();
            }
        }));
    }
    getPRReviewState(sessionResource) {
        return this._getOrCreatePRReviewData(sessionResource).state;
    }
    async resolvePRReviewThread(sessionResource, threadId) {
        const context = this._sessionsManagementService.getGitHubContextForSession(sessionResource);
        if (context?.prNumber !== undefined) {
            const prModel = this._gitHubService.getPullRequest(context.owner, context.repo, context.prNumber);
            try {
                await prModel.resolveThread(threadId);
            }
            catch (err) {
                this._logService.warn('[CodeReviewService] Failed to resolve PR thread on GitHub:', err);
            }
        }
        // Remove from local state regardless of GitHub success
        const data = this._prReviewBySession.get(sessionResource.toString());
        if (data) {
            const currentState = data.state.get();
            if (currentState.kind === "loaded" /* PRReviewStateKind.Loaded */) {
                const filtered = currentState.comments.filter(c => c.id !== threadId);
                data.state.set({ kind: "loaded" /* PRReviewStateKind.Loaded */, comments: filtered }, undefined);
            }
        }
    }
    _getOrCreatePRReviewData(sessionResource) {
        const key = sessionResource.toString();
        let data = this._prReviewBySession.get(key);
        if (!data) {
            data = {
                state: observableValue(`prReview.state.${key}`, { kind: "none" /* PRReviewStateKind.None */ }),
                disposables: new DisposableStore(),
                initialized: false,
            };
            this._prReviewBySession.set(key, data);
        }
        return data;
    }
    _ensurePRReviewInitialized(sessionResource) {
        const data = this._getOrCreatePRReviewData(sessionResource);
        if (data.initialized) {
            return;
        }
        const context = this._sessionsManagementService.getGitHubContextForSession(sessionResource);
        if (!context || context.prNumber === undefined) {
            return;
        }
        data.initialized = true;
        data.state.set({ kind: "loading" /* PRReviewStateKind.Loading */ }, undefined);
        const prModel = this._gitHubService.getPullRequest(context.owner, context.repo, context.prNumber);
        // Watch the PR model's review threads and map to local state
        data.disposables.add(autorun(reader => {
            const threads = prModel.reviewThreads.read(reader);
            const comments = [];
            for (const thread of threads) {
                if (thread.isResolved) {
                    continue;
                }
                const fileUri = this._sessionsManagementService.resolveSessionFileUri(sessionResource, thread.path);
                if (!fileUri) {
                    continue;
                }
                const line = thread.line ?? 1;
                const firstComment = thread.comments[0];
                comments.push({
                    id: String(thread.id),
                    uri: fileUri,
                    range: new Range(line, 1, line, 1),
                    body: firstComment?.body ?? '',
                    author: firstComment?.author.login ?? '',
                });
            }
            data.state.set({ kind: "loaded" /* PRReviewStateKind.Loaded */, comments }, undefined);
        }));
        // Start polling and initial fetch
        prModel.refreshThreads().catch(err => {
            this._logService.error('[CodeReviewService] Failed to fetch PR review threads:', err);
            data.state.set({ kind: "error" /* PRReviewStateKind.Error */, reason: String(err) }, undefined);
        });
        prModel.startPolling();
    }
    _disposePRReview(sessionResource) {
        const key = sessionResource.toString();
        const data = this._prReviewBySession.get(key);
        if (data) {
            data.disposables.dispose();
            this._prReviewBySession.delete(key);
        }
    }
    dispose() {
        for (const data of this._prReviewBySession.values()) {
            data.disposables.dispose();
        }
        this._prReviewBySession.clear();
        super.dispose();
    }
};
CodeReviewService = CodeReviewService_1 = __decorate([
    __param(0, ICommandService),
    __param(1, ILogService),
    __param(2, IStorageService),
    __param(3, IGitHubService),
    __param(4, ISessionsManagementService),
    __param(5, IAgentSessionsService)
], CodeReviewService);
export { CodeReviewService };
//# sourceMappingURL=codeReviewService.js.map