/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { localize } from '../../../../../nls.js';
// ---- Build flow graph from debug events ----
/**
 * Truncates a string to a max length, appending an ellipsis if trimmed.
 */
function truncateLabel(text, maxLength) {
    if (text.length <= maxLength) {
        return text;
    }
    return text.substring(0, maxLength - 1) + '\u2026';
}
export function buildFlowGraph(events) {
    // Before filtering, extract description metadata from subagent events
    // that will be filtered out, so we can enrich the surviving sibling events.
    const subagentToolNames = new Set(['runSubagent', 'search_subagent']);
    // The extension emits two subagentInvocation events per subagent:
    // 1. "started" marker (agentName = descriptive name, status = running) — survives filtering
    // 2. completion event (agentName = "runSubagent", status = completed) — filtered out
    // The completion event carries the real description. When multiple subagents
    // run under the same parent, they share a parentEventId, so we match them
    // by order: the N-th started marker gets the N-th completion's description.
    const completionDescsByParent = new Map();
    const startedCountByParent = new Map();
    for (const e of events) {
        if (e.kind === 'subagentInvocation' && subagentToolNames.has(e.agentName) && e.description && e.parentEventId) {
            let descs = completionDescsByParent.get(e.parentEventId);
            if (!descs) {
                descs = [];
                completionDescsByParent.set(e.parentEventId, descs);
            }
            descs.push(e.description);
        }
    }
    function getSubagentDescription(event) {
        if (event.kind !== 'subagentInvocation' || !event.parentEventId) {
            return undefined;
        }
        const descs = completionDescsByParent.get(event.parentEventId);
        if (!descs || descs.length === 0) {
            return event.description && event.description !== event.agentName ? event.description : undefined;
        }
        const idx = startedCountByParent.get(event.parentEventId) ?? 0;
        startedCountByParent.set(event.parentEventId, idx + 1);
        return descs[idx] ?? descs[0];
    }
    // Filter out redundant events:
    // - toolCall with subagent tool names: the subagentInvocation event has richer metadata
    // - subagentInvocation with agentName matching a tool name: these are completion
    //   duplicates of the "SubAgent started" marker which has the proper descriptive name
    const filtered = events.filter(e => {
        if (e.kind === 'toolCall' && subagentToolNames.has(e.toolName.replace(/^\u{1F6E0}\uFE0F?\s*/u, ''))) {
            return false;
        }
        if (e.kind === 'subagentInvocation' && subagentToolNames.has(e.agentName)) {
            return false;
        }
        return true;
    });
    const idToEvent = new Map();
    const idToChildren = new Map();
    const roots = [];
    for (const event of filtered) {
        if (event.id) {
            idToEvent.set(event.id, event);
        }
    }
    for (const event of filtered) {
        if (event.parentEventId && idToEvent.has(event.parentEventId)) {
            let children = idToChildren.get(event.parentEventId);
            if (!children) {
                children = [];
                idToChildren.set(event.parentEventId, children);
            }
            children.push(event);
        }
        else {
            roots.push(event);
        }
    }
    function toFlowNode(event) {
        const children = event.id ? idToChildren.get(event.id) : undefined;
        // Remap generic events with well-known names to their proper kind
        // so they get correct styling and sublabel treatment.
        const effectiveKind = getEffectiveKind(event);
        // For subagent invocations, enrich with description from the
        // filtered-out completion sibling, or fall back to the event's own field.
        let label = getEventLabel(event, effectiveKind);
        const sublabel = getEventSublabel(event, effectiveKind);
        let tooltip = getEventTooltip(event);
        let description;
        if (effectiveKind === 'subagentInvocation') {
            description = getSubagentDescription(event);
            // Show "Subagent: <description>" as the label so users can identify
            // these nodes and see what task they perform.
            label = description
                ? localize(6912, null, truncateLabel(description, 30))
                : localize(6913, null);
            if (description) {
                // Ensure description appears in tooltip if not already present
                if (tooltip && !tooltip.includes(description)) {
                    const lines = tooltip.split('\n');
                    lines.splice(1, 0, description);
                    tooltip = lines.join('\n');
                }
            }
        }
        return {
            id: event.id ?? `event-${events.indexOf(event)}`,
            kind: effectiveKind,
            category: event.kind === 'generic' ? event.category : undefined,
            label,
            sublabel,
            description,
            tooltip,
            isError: isErrorEvent(event),
            created: event.created.getTime(),
            children: children?.map(toFlowNode) ?? [],
        };
    }
    return roots.map(toFlowNode);
}
// ---- Flow node filtering ----
/**
 * Filters a flow node tree by kind visibility and text search.
 * Returns a new tree — the input is not mutated.
 *
 * Kind filtering: nodes whose kind is not visible are removed.
 * For `subagentInvocation` nodes, the entire subgraph is removed.
 * For other kinds, the node is removed and its children are re-parented.
 *
 * Text filtering: only nodes whose label, sublabel, or tooltip match the
 * search term are kept, along with all their ancestors (path to root).
 * If a subagent label matches, its entire subgraph is kept.
 */
export function filterFlowNodes(nodes, options) {
    let result = filterByKind(nodes, options.isKindVisible);
    if (options.textFilter) {
        result = filterByText(result, options.textFilter);
    }
    return result;
}
function filterByKind(nodes, isKindVisible) {
    const result = [];
    let changed = false;
    for (const node of nodes) {
        if (!isKindVisible(node.kind, node.category)) {
            changed = true;
            // For subagents, drop the entire subgraph
            if (node.kind === 'subagentInvocation') {
                continue;
            }
            // For other kinds, re-parent children up
            result.push(...filterByKind(node.children, isKindVisible));
            continue;
        }
        const filteredChildren = filterByKind(node.children, isKindVisible);
        if (filteredChildren !== node.children) {
            changed = true;
            result.push({ ...node, children: filteredChildren });
        }
        else {
            result.push(node);
        }
    }
    return changed ? result : nodes;
}
function nodeMatchesText(node, text) {
    return node.label.toLowerCase().includes(text) ||
        (node.sublabel?.toLowerCase().includes(text) ?? false) ||
        (node.tooltip?.toLowerCase().includes(text) ?? false);
}
function filterByText(nodes, text) {
    const result = [];
    for (const node of nodes) {
        if (nodeMatchesText(node, text)) {
            // Node matches — keep it with all descendants
            result.push(node);
            continue;
        }
        // Check if any descendant matches
        const filteredChildren = filterByText(node.children, text);
        if (filteredChildren.length > 0) {
            // Keep this node as an ancestor of matching descendants
            result.push({ ...node, children: filteredChildren });
        }
    }
    return result;
}
/**
 * Counts the total number of nodes in a tree (each node + all descendants).
 */
function countNodes(nodes) {
    let count = 0;
    for (const node of nodes) {
        count += 1 + countNodes(node.children);
    }
    return count;
}
/**
 * Slices a flow node tree to at most `maxCount` nodes (pre-order DFS).
 *
 * When a subagent's children would exceed the remaining budget, the
 * children list is truncated. Returns the sliced tree along with total
 * and shown node counts for the "Show More" UI.
 */
export function sliceFlowNodes(nodes, maxCount) {
    const totalCount = countNodes(nodes);
    if (totalCount <= maxCount) {
        return { nodes: nodes, totalCount, shownCount: totalCount };
    }
    let remaining = maxCount;
    function sliceTree(nodeList) {
        const result = [];
        for (const node of nodeList) {
            if (remaining <= 0) {
                break;
            }
            remaining--; // count this node
            if (node.children.length === 0 || remaining <= 0) {
                result.push(node.children.length === 0 ? node : { ...node, children: [] });
            }
            else {
                const slicedChildren = sliceTree(node.children);
                result.push(slicedChildren !== node.children ? { ...node, children: slicedChildren } : node);
            }
        }
        return result;
    }
    const sliced = sliceTree(nodes);
    const shownCount = maxCount - remaining;
    return { nodes: sliced, totalCount, shownCount };
}
// ---- Discovery node merging ----
function isDiscoveryNode(node) {
    return node.kind === 'generic' && node.category === 'discovery';
}
/**
 * Merges consecutive prompt-discovery nodes (generic events with
 * `category === 'discovery'`) into a single summary node.
 *
 * The merged node always stays in the graph and carries the individual
 * nodes in `mergedNodes`.  Expansion (showing the individual nodes to the
 * right) is handled at the layout level.
 *
 * Operates recursively on children.
 */
export function mergeDiscoveryNodes(nodes) {
    const result = [];
    let i = 0;
    while (i < nodes.length) {
        const node = nodes[i];
        // Non-discovery node: recurse into children and pass through.
        if (!isDiscoveryNode(node)) {
            const mergedChildren = mergeDiscoveryNodes(node.children);
            result.push(mergedChildren !== node.children ? { ...node, children: mergedChildren } : node);
            i++;
            continue;
        }
        // Accumulate a run of consecutive discovery nodes.
        const run = [node];
        let j = i + 1;
        while (j < nodes.length && isDiscoveryNode(nodes[j])) {
            run.push(nodes[j]);
            j++;
        }
        if (run.length < 2) {
            // Single discovery node — nothing to merge.
            result.push(node);
            i = j;
            continue;
        }
        // Build a stable id from the first node so the expand state persists.
        const mergedId = `merged-discovery:${run[0].id}`;
        // Build a merged summary node.
        const labels = run.map(n => n.label);
        const uniqueLabels = [...new Set(labels)];
        const summaryLabel = uniqueLabels.length <= 2
            ? uniqueLabels.join(', ')
            : localize(6914, null, uniqueLabels[0], run.length - 1);
        result.push({
            id: mergedId,
            kind: 'generic',
            category: 'discovery',
            label: summaryLabel,
            sublabel: localize(6915, null, run.length),
            tooltip: run.map(n => n.label + (n.sublabel ? `: ${n.sublabel}` : '')).join('\n'),
            created: run[0].created,
            children: [],
            mergedNodes: run,
        });
        i = j;
    }
    return result;
}
// ---- Tool call node merging ----
function isToolCallNode(node) {
    return node.kind === 'toolCall';
}
/**
 * Returns the tool name from a tool-call node's label.
 * Tool call labels are set to `event.toolName` (possibly with a leading
 * emoji prefix stripped), so the label itself is the canonical tool name.
 */
function getToolName(node) {
    return node.label;
}
/**
 * Merges consecutive tool-call nodes that invoke the same tool into a
 * single summary node.
 *
 * This mirrors `mergeDiscoveryNodes`: the merged node carries the
 * individual nodes in `mergedNodes` and expansion is handled at the
 * layout level.
 *
 * Operates recursively on children.
 */
export function mergeToolCallNodes(nodes) {
    const result = [];
    let i = 0;
    while (i < nodes.length) {
        const node = nodes[i];
        // Non-tool-call node: recurse into children and pass through.
        if (!isToolCallNode(node)) {
            const mergedChildren = mergeToolCallNodes(node.children);
            result.push(mergedChildren !== node.children ? { ...node, children: mergedChildren } : node);
            i++;
            continue;
        }
        // Accumulate a run of consecutive tool-call nodes with the same tool name.
        const toolName = getToolName(node);
        const run = [node];
        let j = i + 1;
        while (j < nodes.length && isToolCallNode(nodes[j]) && getToolName(nodes[j]) === toolName) {
            run.push(nodes[j]);
            j++;
        }
        if (run.length < 2) {
            // Single tool call — recurse into children, nothing to merge.
            const mergedChildren = mergeToolCallNodes(node.children);
            result.push(mergedChildren !== node.children ? { ...node, children: mergedChildren } : node);
            i = j;
            continue;
        }
        // Build a stable id from the first node so the expand state persists.
        const mergedId = `merged-toolCall:${run[0].id}`;
        result.push({
            id: mergedId,
            kind: 'toolCall',
            label: toolName,
            sublabel: localize(6916, null, run.length),
            tooltip: run.map(n => n.label + (n.sublabel ? `: ${n.sublabel}` : '')).join('\n'),
            created: run[0].created,
            children: [],
            mergedNodes: run,
        });
        i = j;
    }
    return result;
}
// ---- Event helpers ----
/**
 * Remaps generic events with well-known names (e.g. "User message",
 * "Agent response") to their proper typed kind so they receive
 * correct colors, labels, and sublabel treatment in the flow chart.
 */
function getEffectiveKind(event) {
    if (event.kind === 'generic') {
        const name = event.name.toLowerCase().replace(/[\s_-]+/g, '');
        if (name === 'usermessage' || name === 'userprompt' || name === 'user' || name.startsWith('usermessage')) {
            return 'userMessage';
        }
        if (name === 'response' || name.startsWith('agentresponse') || name.startsWith('assistantresponse') || name.startsWith('modelresponse')) {
            return 'agentResponse';
        }
        const cat = event.category?.toLowerCase();
        if (cat === 'user' || cat === 'usermessage') {
            return 'userMessage';
        }
        if (cat === 'response' || cat === 'agentresponse') {
            return 'agentResponse';
        }
    }
    return event.kind;
}
function getEventLabel(event, effectiveKind) {
    const kind = effectiveKind ?? event.kind;
    switch (kind) {
        case 'userMessage':
            return localize(6917, null);
        case 'modelTurn':
            return event.kind === 'modelTurn' ? (event.model ?? localize(6918, null)) : localize(6919, null);
        case 'toolCall':
            return event.kind === 'toolCall' ? event.toolName : event.kind === 'generic' ? event.name : localize(6920, null);
        case 'subagentInvocation':
            return event.kind === 'subagentInvocation' ? event.agentName : localize(6921, null);
        case 'agentResponse':
            return localize(6922, null);
        case 'generic':
            return event.kind === 'generic' ? event.name : localize(6923, null);
    }
}
function getEventSublabel(event, effectiveKind) {
    const kind = effectiveKind ?? event.kind;
    switch (kind) {
        case 'modelTurn': {
            const parts = [];
            if (event.kind === 'modelTurn' && event.requestName) {
                parts.push(event.requestName);
            }
            if (event.kind === 'modelTurn' && event.totalTokens) {
                parts.push(localize(6924, null, event.totalTokens));
            }
            if (event.kind === 'modelTurn' && event.durationInMillis) {
                parts.push(formatDuration(event.durationInMillis));
            }
            return parts.length > 0 ? parts.join(' \u00b7 ') : undefined;
        }
        case 'toolCall': {
            const parts = [];
            if (event.kind === 'toolCall' && event.result) {
                parts.push(event.result);
            }
            if (event.kind === 'toolCall' && event.durationInMillis) {
                parts.push(formatDuration(event.durationInMillis));
            }
            return parts.length > 0 ? parts.join(' \u00b7 ') : undefined;
        }
        case 'subagentInvocation': {
            const parts = [];
            if (event.kind === 'subagentInvocation' && event.status) {
                parts.push(event.status);
            }
            if (event.kind === 'subagentInvocation' && event.durationInMillis) {
                parts.push(formatDuration(event.durationInMillis));
            }
            return parts.length > 0 ? parts.join(' \u00b7 ') : undefined;
        }
        case 'userMessage':
        case 'agentResponse': {
            // Use the message summary as the sublabel. For remapped generic
            // events, use the details property.
            let text;
            if (event.kind === 'userMessage' || event.kind === 'agentResponse') {
                text = event.message;
            }
            else if (event.kind === 'generic') {
                text = event.details;
            }
            if (!text) {
                return undefined;
            }
            // Find the first meaningful line, skipping trivial lines like
            // lone brackets/braces that appear when the message is JSON.
            const lines = text.split('\n');
            let firstLine = '';
            for (const line of lines) {
                const trimmed = line.trim();
                if (trimmed && trimmed.length > 2) {
                    firstLine = trimmed;
                    break;
                }
            }
            if (!firstLine) {
                // Fall back to the full text collapsed to a single line
                firstLine = text.replace(/\s+/g, ' ').trim();
            }
            if (!firstLine) {
                return undefined;
            }
            return firstLine.length > 60 ? firstLine.substring(0, 57) + '...' : firstLine;
        }
        default:
            return undefined;
    }
}
function formatDuration(ms) {
    if (ms < 1000) {
        return `${ms}ms`;
    }
    return `${(ms / 1000).toFixed(1)}s`;
}
function isErrorEvent(event) {
    return (event.kind === 'toolCall' && event.result === 'error') ||
        (event.kind === 'generic' && event.level === 3 /* ChatDebugLogLevel.Error */) ||
        (event.kind === 'subagentInvocation' && event.status === 'failed');
}
const TOOLTIP_MAX_LENGTH = 500;
function getEventTooltip(event) {
    switch (event.kind) {
        case 'userMessage': {
            const msg = event.message.trim();
            if (msg.length > TOOLTIP_MAX_LENGTH) {
                return msg.substring(0, TOOLTIP_MAX_LENGTH) + '\u2026';
            }
            return msg || undefined;
        }
        case 'toolCall': {
            const parts = [event.toolName];
            if (event.input) {
                const input = event.input.trim();
                parts.push(localize(6925, null, input.length > TOOLTIP_MAX_LENGTH ? input.substring(0, TOOLTIP_MAX_LENGTH) + '\u2026' : input));
            }
            if (event.output) {
                const output = event.output.trim();
                parts.push(localize(6926, null, output.length > TOOLTIP_MAX_LENGTH ? output.substring(0, TOOLTIP_MAX_LENGTH) + '\u2026' : output));
            }
            if (event.result) {
                parts.push(localize(6927, null, event.result));
            }
            return parts.join('\n');
        }
        case 'subagentInvocation': {
            const parts = [event.agentName];
            if (event.description) {
                parts.push(event.description);
            }
            if (event.status) {
                parts.push(localize(6928, null, event.status));
            }
            if (event.toolCallCount !== undefined) {
                parts.push(localize(6929, null, event.toolCallCount));
            }
            if (event.modelTurnCount !== undefined) {
                parts.push(localize(6930, null, event.modelTurnCount));
            }
            return parts.join('\n');
        }
        case 'generic': {
            if (event.details) {
                const details = event.details.trim();
                return details.length > TOOLTIP_MAX_LENGTH ? details.substring(0, TOOLTIP_MAX_LENGTH) + '\u2026' : details;
            }
            return undefined;
        }
        case 'modelTurn': {
            const parts = [];
            if (event.model) {
                parts.push(event.model);
            }
            if (event.totalTokens) {
                parts.push(localize(6931, null, event.totalTokens));
            }
            if (event.inputTokens) {
                parts.push(localize(6932, null, event.inputTokens));
            }
            if (event.outputTokens) {
                parts.push(localize(6933, null, event.outputTokens));
            }
            if (event.durationInMillis) {
                parts.push(localize(6934, null, formatDuration(event.durationInMillis)));
            }
            return parts.length > 0 ? parts.join('\n') : undefined;
        }
        default:
            return undefined;
    }
}
//# sourceMappingURL=chatDebugFlowGraph.js.map