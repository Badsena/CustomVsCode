/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
//#endregion
/**
 * Stateless fetcher for GitHub CI check data (check runs, check suites).
 * All methods return raw typed data with no caching or state.
 */
export class GitHubPRCIFetcher {
    constructor(_apiClient) {
        this._apiClient = _apiClient;
    }
    async getCheckRuns(owner, repo, ref) {
        const data = await this._apiClient.request('GET', `/repos/${e(owner)}/${e(repo)}/commits/${e(ref)}/check-runs`, 'githubApi.getCheckRuns');
        return data.check_runs.map(mapCheckRun);
    }
    /**
     * Get logs/output for a specific check run.
     *
     * Tries multiple sources in order:
     * 1. The check run's own output fields (title, summary, text) — set by the
     *    check run creator via the Checks API.
     * 2. Annotations attached to the check run.
     * 3. GitHub Actions job logs (only works for GitHub Actions workflows).
     */
    async getCheckRunAnnotations(owner, repo, checkRunId) {
        const sections = [];
        let detail;
        // 1. Fetch check run detail for output fields
        try {
            detail = await this._apiClient.request('GET', `/repos/${e(owner)}/${e(repo)}/check-runs/${checkRunId}`, 'githubApi.getCheckRunAnnotations');
            const output = detail.output;
            if (output.title) {
                sections.push(`# ${output.title}`);
            }
            if (output.summary) {
                sections.push(output.summary);
            }
            if (output.text) {
                sections.push(output.text);
            }
        }
        catch {
            // Ignore — output may not be available
        }
        // 2. Fetch annotations
        try {
            const annotations = await this._apiClient.request('GET', `/repos/${e(owner)}/${e(repo)}/check-runs/${checkRunId}/annotations`, 'githubApi.getCheckRunAnnotations.annotations');
            if (annotations.length > 0) {
                sections.push(annotations.map(a => `[${a.annotation_level}] ${a.path}:${a.start_line}${a.end_line !== a.start_line ? `-${a.end_line}` : ''} ${a.title ? `(${a.title}) ` : ''}${a.message}`).join('\n'));
            }
        }
        catch {
            // Ignore — annotations may not be available
        }
        if (sections.length > 0) {
            return sections.join('\n\n');
        }
        return 'No output available for this check run.';
    }
}
//#region Helpers
function e(value) {
    return encodeURIComponent(value);
}
function mapCheckRun(data) {
    return {
        id: data.id,
        name: data.name,
        status: mapCheckStatus(data.status),
        conclusion: data.conclusion ? mapCheckConclusion(data.conclusion) : undefined,
        startedAt: data.started_at ?? undefined,
        completedAt: data.completed_at ?? undefined,
        detailsUrl: data.details_url ?? undefined,
    };
}
function mapCheckStatus(status) {
    switch (status) {
        case 'queued': return "queued" /* GitHubCheckStatus.Queued */;
        case 'in_progress': return "in_progress" /* GitHubCheckStatus.InProgress */;
        case 'completed': return "completed" /* GitHubCheckStatus.Completed */;
        default: return "queued" /* GitHubCheckStatus.Queued */;
    }
}
function mapCheckConclusion(conclusion) {
    switch (conclusion) {
        case 'success': return "success" /* GitHubCheckConclusion.Success */;
        case 'failure': return "failure" /* GitHubCheckConclusion.Failure */;
        case 'neutral': return "neutral" /* GitHubCheckConclusion.Neutral */;
        case 'cancelled': return "cancelled" /* GitHubCheckConclusion.Cancelled */;
        case 'skipped': return "skipped" /* GitHubCheckConclusion.Skipped */;
        case 'timed_out': return "timed_out" /* GitHubCheckConclusion.TimedOut */;
        case 'action_required': return "action_required" /* GitHubCheckConclusion.ActionRequired */;
        case 'stale': return "stale" /* GitHubCheckConclusion.Stale */;
        default: return "neutral" /* GitHubCheckConclusion.Neutral */;
    }
}
/**
 * Compute an overall CI status from a list of check runs.
 */
export function computeOverallCIStatus(checks) {
    if (checks.length === 0) {
        return "neutral" /* GitHubCIOverallStatus.Neutral */;
    }
    let hasFailure = false;
    let hasPending = false;
    for (const check of checks) {
        if (check.status !== "completed" /* GitHubCheckStatus.Completed */) {
            hasPending = true;
            continue;
        }
        if (check.conclusion === "failure" /* GitHubCheckConclusion.Failure */ ||
            check.conclusion === "timed_out" /* GitHubCheckConclusion.TimedOut */ ||
            check.conclusion === "action_required" /* GitHubCheckConclusion.ActionRequired */) {
            hasFailure = true;
        }
    }
    if (hasFailure) {
        return "failure" /* GitHubCIOverallStatus.Failure */;
    }
    if (hasPending) {
        return "pending" /* GitHubCIOverallStatus.Pending */;
    }
    return "success" /* GitHubCIOverallStatus.Success */;
}
//#endregion
//# sourceMappingURL=githubPRCIFetcher.js.map