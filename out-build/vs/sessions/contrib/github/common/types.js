/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
//#endregion
//#region Pull Request
export var GitHubPullRequestState;
(function (GitHubPullRequestState) {
    GitHubPullRequestState["Open"] = "open";
    GitHubPullRequestState["Closed"] = "closed";
    GitHubPullRequestState["Merged"] = "merged";
})(GitHubPullRequestState || (GitHubPullRequestState = {}));
export var MergeBlockerKind;
(function (MergeBlockerKind) {
    MergeBlockerKind["ChangesRequested"] = "changesRequested";
    MergeBlockerKind["CIFailed"] = "ciFailed";
    MergeBlockerKind["ApprovalNeeded"] = "approvalNeeded";
    MergeBlockerKind["Conflicts"] = "conflicts";
    MergeBlockerKind["Draft"] = "draft";
    MergeBlockerKind["Unknown"] = "unknown";
})(MergeBlockerKind || (MergeBlockerKind = {}));
//#endregion
//#region CI Checks
export var GitHubCheckStatus;
(function (GitHubCheckStatus) {
    GitHubCheckStatus["Queued"] = "queued";
    GitHubCheckStatus["InProgress"] = "in_progress";
    GitHubCheckStatus["Completed"] = "completed";
})(GitHubCheckStatus || (GitHubCheckStatus = {}));
export var GitHubCheckConclusion;
(function (GitHubCheckConclusion) {
    GitHubCheckConclusion["Success"] = "success";
    GitHubCheckConclusion["Failure"] = "failure";
    GitHubCheckConclusion["Neutral"] = "neutral";
    GitHubCheckConclusion["Cancelled"] = "cancelled";
    GitHubCheckConclusion["Skipped"] = "skipped";
    GitHubCheckConclusion["TimedOut"] = "timed_out";
    GitHubCheckConclusion["ActionRequired"] = "action_required";
    GitHubCheckConclusion["Stale"] = "stale";
})(GitHubCheckConclusion || (GitHubCheckConclusion = {}));
export var GitHubCIOverallStatus;
(function (GitHubCIOverallStatus) {
    GitHubCIOverallStatus["Pending"] = "pending";
    GitHubCIOverallStatus["Success"] = "success";
    GitHubCIOverallStatus["Failure"] = "failure";
    GitHubCIOverallStatus["Neutral"] = "neutral";
})(GitHubCIOverallStatus || (GitHubCIOverallStatus = {}));
//#endregion
//# sourceMappingURL=types.js.map