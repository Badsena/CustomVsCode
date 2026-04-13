/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { createMarkdownCommandLink, MarkdownString } from '../../../../../../../base/common/htmlContent.js';
import { localize } from '../../../../../../../nls.js';
import { IChatToolInvocation } from '../../../../common/chatService/chatService.js';
export function isMcpToolInvocation(toolInvocation) {
    return toolInvocation.source?.type === 'mcp' || toolInvocation.toolId.toLowerCase().includes('mcp');
}
/**
 * Determines whether a tool invocation's progress text should shimmer.
 * MCP tools shimmer; askQuestions defers to the caller's default; all others opt out.
 */
export function shouldShimmerForTool(toolInvocation) {
    if (isMcpToolInvocation(toolInvocation)) {
        return true;
    }
    if (toolInvocation.toolId === 'copilot_askQuestions' || toolInvocation.toolId === 'vscode_askQuestions') {
        return false;
    }
    return false;
}
/**
 * Creates a markdown message explaining why a tool was auto-approved.
 * @param toolInvocation The tool invocation to get the approval message for
 * @returns A markdown string with the approval message, or undefined if no message should be shown
 */
export function getToolApprovalMessage(toolInvocation) {
    const reason = IChatToolInvocation.executionConfirmedOrDenied(toolInvocation);
    if (!reason || typeof reason === 'boolean') {
        return undefined;
    }
    return getApprovalMessageFromReason(reason);
}
/**
 * Creates a markdown message from a ConfirmedReason explaining why a tool was auto-approved.
 * @param reason The confirmation reason
 * @returns A markdown string with the approval message, or undefined if no message should be shown
 */
export function getApprovalMessageFromReason(reason) {
    let md;
    switch (reason.type) {
        case 2 /* ToolConfirmKind.Setting */:
            md = localize(8124, null, createMarkdownCommandLink({ text: '`' + reason.id + '`', id: 'workbench.action.openSettings', arguments: [reason.id], tooltip: localize(8125, null) }, false));
            break;
        case 3 /* ToolConfirmKind.LmServicePerTool */:
            md = reason.scope === 'session'
                ? localize(8126, null)
                : reason.scope === 'workspace'
                    ? localize(8127, null)
                    : localize(8128, null);
            md += ' (' + createMarkdownCommandLink({ text: localize(8129, null), id: 'workbench.action.chat.editToolApproval', arguments: [reason.scope], tooltip: localize(8130, null) }) + ')';
            break;
        case 1 /* ToolConfirmKind.ConfirmationNotNeeded */:
            if (reason.reason) {
                return typeof reason.reason === 'string'
                    ? new MarkdownString(reason.reason, { isTrusted: true })
                    : reason.reason;
            }
            return undefined;
        case 4 /* ToolConfirmKind.UserAction */:
        case 0 /* ToolConfirmKind.Denied */:
        default:
            return undefined;
    }
    return new MarkdownString(md, { isTrusted: true });
}
//# sourceMappingURL=chatToolPartUtilities.js.map