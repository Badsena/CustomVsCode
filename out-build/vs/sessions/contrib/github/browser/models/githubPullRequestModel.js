/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { RunOnceScheduler } from '../../../../../base/common/async.js';
import { Disposable } from '../../../../../base/common/lifecycle.js';
import { observableValue } from '../../../../../base/common/observable.js';
const LOG_PREFIX = '[GitHubPullRequestModel]';
const DEFAULT_POLL_INTERVAL_MS = 30_000;
/**
 * Reactive model for a GitHub pull request. Wraps fetcher data in
 * observables, supports on-demand refresh, and can poll periodically.
 */
export class GitHubPullRequestModel extends Disposable {
    constructor(owner, repo, prNumber, _fetcher, _logService) {
        super();
        this.owner = owner;
        this.repo = repo;
        this.prNumber = prNumber;
        this._fetcher = _fetcher;
        this._logService = _logService;
        this._pullRequest = observableValue(this, undefined);
        this.pullRequest = this._pullRequest;
        this._mergeability = observableValue(this, undefined);
        this.mergeability = this._mergeability;
        this._reviewThreads = observableValue(this, []);
        this.reviewThreads = this._reviewThreads;
        this._disposed = false;
        this._pollScheduler = this._register(new RunOnceScheduler(() => this._poll(), DEFAULT_POLL_INTERVAL_MS));
    }
    /**
     * Refresh all PR data: pull request info, mergeability, and review threads.
     */
    async refresh() {
        await Promise.all([
            this._refreshPullRequest(),
            this._refreshMergeability(),
            this._refreshThreads(),
        ]);
    }
    /**
     * Refresh only the review threads.
     */
    async refreshThreads() {
        await this._refreshThreads();
    }
    /**
     * Post a reply to an existing review thread and refresh threads.
     */
    async postReviewComment(body, inReplyTo) {
        const comment = await this._fetcher.postReviewComment(this.owner, this.repo, this.prNumber, body, inReplyTo);
        await this._refreshThreads();
        return comment;
    }
    /**
     * Post a top-level issue comment on the PR.
     */
    async postIssueComment(body) {
        return this._fetcher.postIssueComment(this.owner, this.repo, this.prNumber, body);
    }
    /**
     * Resolve a review thread and refresh the thread list.
     */
    async resolveThread(threadId) {
        await this._fetcher.resolveThread(this.owner, this.repo, threadId);
        await this._refreshThreads();
    }
    /**
     * Start periodic polling. Each cycle refreshes all PR data.
     */
    startPolling(intervalMs = DEFAULT_POLL_INTERVAL_MS) {
        this._pollScheduler.cancel();
        this._pollScheduler.schedule(intervalMs);
    }
    /**
     * Stop periodic polling.
     */
    stopPolling() {
        this._pollScheduler.cancel();
    }
    async _poll() {
        await this.refresh();
        // Re-schedule for next poll cycle (RunOnceScheduler is one-shot)
        if (!this._disposed) {
            this._pollScheduler.schedule();
        }
    }
    dispose() {
        this._disposed = true;
        super.dispose();
    }
    async _refreshPullRequest() {
        try {
            const data = await this._fetcher.getPullRequest(this.owner, this.repo, this.prNumber);
            this._pullRequest.set(data, undefined);
        }
        catch (err) {
            this._logService.error(`${LOG_PREFIX} Failed to refresh PR #${this.prNumber}:`, err);
        }
    }
    async _refreshMergeability() {
        try {
            const data = await this._fetcher.getMergeability(this.owner, this.repo, this.prNumber);
            this._mergeability.set(data, undefined);
        }
        catch (err) {
            this._logService.error(`${LOG_PREFIX} Failed to refresh mergeability for PR #${this.prNumber}:`, err);
        }
    }
    async _refreshThreads() {
        try {
            const data = await this._fetcher.getReviewThreads(this.owner, this.repo, this.prNumber);
            this._reviewThreads.set(data, undefined);
        }
        catch (err) {
            this._logService.error(`${LOG_PREFIX} Failed to refresh threads for PR #${this.prNumber}:`, err);
        }
    }
}
//# sourceMappingURL=githubPullRequestModel.js.map