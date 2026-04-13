/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { localize } from '../../../../../nls.js';
import { Codicon } from '../../../../../base/common/codicons.js';
import { URI } from '../../../../../base/common/uri.js';
import { foreground, listActiveSelectionForeground, registerColor, transparent } from '../../../../../platform/theme/common/colorRegistry.js';
import { getChatSessionType } from '../../common/model/chatUri.js';
export var AgentSessionProviders;
(function (AgentSessionProviders) {
    AgentSessionProviders["Local"] = "local";
    AgentSessionProviders["Background"] = "copilotcli";
    AgentSessionProviders["Cloud"] = "copilot-cloud-agent";
    AgentSessionProviders["Claude"] = "claude-code";
    AgentSessionProviders["Codex"] = "openai-codex";
    AgentSessionProviders["Growth"] = "copilot-growth";
    AgentSessionProviders["AgentHostCopilot"] = "agent-host-copilot";
})(AgentSessionProviders || (AgentSessionProviders = {}));
export function isBuiltInAgentSessionProvider(provider) {
    return provider === AgentSessionProviders.Local ||
        provider === AgentSessionProviders.Background ||
        provider === AgentSessionProviders.Cloud ||
        provider === AgentSessionProviders.Claude;
}
export function getAgentSessionProvider(sessionResource) {
    const type = URI.isUri(sessionResource) ? getChatSessionType(sessionResource) : sessionResource;
    switch (type) {
        case AgentSessionProviders.Local:
        case AgentSessionProviders.Background:
        case AgentSessionProviders.Cloud:
        case AgentSessionProviders.Claude:
        case AgentSessionProviders.Codex:
        case AgentSessionProviders.AgentHostCopilot:
            return type;
        default:
            return undefined;
    }
}
export function getAgentSessionProviderName(provider) {
    switch (provider) {
        case AgentSessionProviders.Local:
            return localize(6168, null);
        case AgentSessionProviders.Background:
            return localize(6169, null);
        case AgentSessionProviders.Cloud:
            return localize(6170, null);
        case AgentSessionProviders.Claude:
            return 'Claude';
        case AgentSessionProviders.Codex:
            return 'Codex';
        case AgentSessionProviders.Growth:
            return 'Growth';
        case AgentSessionProviders.AgentHostCopilot:
            return 'Agent Host - Copilot';
    }
}
export function getAgentSessionProviderIcon(provider) {
    switch (provider) {
        case AgentSessionProviders.Local:
            return Codicon.vm;
        case AgentSessionProviders.Background:
            return Codicon.worktree;
        case AgentSessionProviders.Cloud:
            return Codicon.cloud;
        case AgentSessionProviders.Codex:
            return Codicon.openai;
        case AgentSessionProviders.Claude:
            return Codicon.claude;
        case AgentSessionProviders.Growth:
            return Codicon.lightbulb;
        case AgentSessionProviders.AgentHostCopilot:
            return Codicon.vscodeInsiders; // default; use getAgentHostIcon() for quality-aware icon
    }
}
/**
 * Returns the VS Code or VS Code Insiders icon depending on product quality.
 */
export function getAgentHostIcon(productService) {
    return productService.quality === 'stable' ? Codicon.vscode : Codicon.vscodeInsiders;
}
export function isFirstPartyAgentSessionProvider(provider) {
    switch (provider) {
        case AgentSessionProviders.Local:
        case AgentSessionProviders.Background:
        case AgentSessionProviders.Cloud:
        case AgentSessionProviders.AgentHostCopilot:
            return true;
        case AgentSessionProviders.Claude:
        case AgentSessionProviders.Codex:
        case AgentSessionProviders.Growth:
            return false;
    }
}
/**
 * Returns whether the given session type is an agent host target.
 * Matches the local agent host (`agent-host-*`) and remote agent hosts (`remote-*`).
 *
 * Note: The `remote-` prefix convention is established by
 * {@link RemoteAgentHostContribution} which generates session types as
 * `remote-{sanitizedAddress}-{provider}`. If future remote providers that
 * are NOT agent hosts need a different prefix, this function must be updated.
 */
export function isAgentHostTarget(target) {
    return target === AgentSessionProviders.AgentHostCopilot ||
        target.startsWith('agent-host-') ||
        target.startsWith('remote-');
}
export function getAgentCanContinueIn(provider) {
    switch (provider) {
        case AgentSessionProviders.Local:
        case AgentSessionProviders.Background:
        case AgentSessionProviders.Cloud:
            return true;
        case AgentSessionProviders.Claude:
        case AgentSessionProviders.Codex:
        case AgentSessionProviders.Growth:
        case AgentSessionProviders.AgentHostCopilot:
            return false;
    }
}
export function getAgentSessionProviderDescription(provider) {
    switch (provider) {
        case AgentSessionProviders.Local:
            return localize(6171, null);
        case AgentSessionProviders.Background:
            return localize(6172, null);
        case AgentSessionProviders.Cloud:
            return localize(6173, null);
        case AgentSessionProviders.Claude:
            return localize(6174, null);
        case AgentSessionProviders.Codex:
            return localize(6175, null);
        case AgentSessionProviders.Growth:
            return localize(6176, null);
        case AgentSessionProviders.AgentHostCopilot:
            return 'Run a Copilot SDK agent in a dedicated process.';
    }
}
export var AgentSessionsViewerOrientation;
(function (AgentSessionsViewerOrientation) {
    AgentSessionsViewerOrientation[AgentSessionsViewerOrientation["Stacked"] = 1] = "Stacked";
    AgentSessionsViewerOrientation[AgentSessionsViewerOrientation["SideBySide"] = 2] = "SideBySide";
})(AgentSessionsViewerOrientation || (AgentSessionsViewerOrientation = {}));
export var AgentSessionsViewerPosition;
(function (AgentSessionsViewerPosition) {
    AgentSessionsViewerPosition[AgentSessionsViewerPosition["Left"] = 1] = "Left";
    AgentSessionsViewerPosition[AgentSessionsViewerPosition["Right"] = 2] = "Right";
})(AgentSessionsViewerPosition || (AgentSessionsViewerPosition = {}));
export const agentSessionReadIndicatorForeground = registerColor('agentSessionReadIndicator.foreground', { dark: transparent(foreground, 0.2), light: transparent(foreground, 0.2), hcDark: null, hcLight: null }, localize(6177, null));
export const agentSessionSelectedBadgeBorder = registerColor('agentSessionSelectedBadge.border', { dark: transparent(listActiveSelectionForeground, 0.3), light: transparent(listActiveSelectionForeground, 0.3), hcDark: foreground, hcLight: foreground }, localize(6178, null));
export const agentSessionSelectedUnfocusedBadgeBorder = registerColor('agentSessionSelectedUnfocusedBadge.border', { dark: transparent(foreground, 0.3), light: transparent(foreground, 0.3), hcDark: foreground, hcLight: foreground }, localize(6179, null));
export const AGENT_SESSION_RENAME_ACTION_ID = 'agentSession.rename';
export const AGENT_SESSION_DELETE_ACTION_ID = 'agentSession.delete';
//# sourceMappingURL=agentSessions.js.map