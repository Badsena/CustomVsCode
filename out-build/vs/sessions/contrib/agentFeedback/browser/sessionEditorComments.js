/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Range } from '../../../../editor/common/core/range.js';
export var SessionEditorCommentSource;
(function (SessionEditorCommentSource) {
    SessionEditorCommentSource["AgentFeedback"] = "agentFeedback";
    SessionEditorCommentSource["CodeReview"] = "codeReview";
    SessionEditorCommentSource["PRReview"] = "prReview";
})(SessionEditorCommentSource || (SessionEditorCommentSource = {}));
export function getCodeReviewComments(reviewState) {
    return reviewState.kind === "result" /* CodeReviewStateKind.Result */ ? reviewState.comments : [];
}
export function getPRReviewComments(prReviewState) {
    return prReviewState?.kind === "loaded" /* PRReviewStateKind.Loaded */ ? prReviewState.comments : [];
}
export function getSessionEditorComments(sessionResource, agentFeedbackItems, reviewState, prReviewState) {
    const comments = [];
    for (const item of agentFeedbackItems) {
        comments.push({
            id: toSessionEditorCommentId("agentFeedback" /* SessionEditorCommentSource.AgentFeedback */, item.id),
            sourceId: item.id,
            source: "agentFeedback" /* SessionEditorCommentSource.AgentFeedback */,
            sessionResource,
            resourceUri: item.resourceUri,
            range: item.range,
            text: item.text,
            suggestion: item.suggestion,
            canConvertToAgentFeedback: false,
        });
    }
    for (const item of getCodeReviewComments(reviewState)) {
        comments.push({
            id: toSessionEditorCommentId("codeReview" /* SessionEditorCommentSource.CodeReview */, item.id),
            sourceId: item.id,
            source: "codeReview" /* SessionEditorCommentSource.CodeReview */,
            sessionResource,
            resourceUri: item.uri,
            range: item.range,
            text: item.body,
            suggestion: item.suggestion,
            severity: item.severity,
            canConvertToAgentFeedback: true,
        });
    }
    for (const item of getPRReviewComments(prReviewState)) {
        comments.push({
            id: toSessionEditorCommentId("prReview" /* SessionEditorCommentSource.PRReview */, item.id),
            sourceId: item.id,
            source: "prReview" /* SessionEditorCommentSource.PRReview */,
            sessionResource,
            resourceUri: item.uri,
            range: item.range,
            text: item.body,
            canConvertToAgentFeedback: true,
        });
    }
    comments.sort(compareSessionEditorComments);
    return comments;
}
export function compareSessionEditorComments(a, b) {
    return a.resourceUri.toString().localeCompare(b.resourceUri.toString())
        || Range.compareRangesUsingStarts(Range.lift(a.range), Range.lift(b.range))
        || a.source.localeCompare(b.source)
        || a.sourceId.localeCompare(b.sourceId);
}
export function groupNearbySessionEditorComments(items, lineThreshold = 5) {
    if (items.length === 0) {
        return [];
    }
    const sorted = [...items].sort(compareSessionEditorComments);
    const groups = [];
    let currentGroup = [sorted[0]];
    for (let i = 1; i < sorted.length; i++) {
        const firstItem = currentGroup[0];
        const currentItem = sorted[i];
        const sameResource = currentItem.resourceUri.toString() === firstItem.resourceUri.toString();
        const verticalSpan = currentItem.range.startLineNumber - firstItem.range.startLineNumber;
        if (sameResource && verticalSpan <= lineThreshold) {
            currentGroup.push(currentItem);
        }
        else {
            groups.push(currentGroup);
            currentGroup = [currentItem];
        }
    }
    groups.push(currentGroup);
    return groups;
}
export function getResourceEditorComments(resourceUri, comments) {
    const resource = resourceUri.toString();
    return comments.filter(comment => comment.resourceUri.toString() === resource);
}
export function toSessionEditorCommentId(source, sourceId) {
    return `${source}:${sourceId}`;
}
export function hasAgentFeedbackComments(comments) {
    return comments.some(comment => comment.source === "agentFeedback" /* SessionEditorCommentSource.AgentFeedback */);
}
//# sourceMappingURL=sessionEditorComments.js.map