/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { URI } from '../../../base/common/uri.js';
import { createDecorator } from '../../instantiation/common/instantiation.js';
// IPC contract between the renderer and the agent host utility process.
// Defines all serializable event types, the IAgent provider interface,
// and the IAgentService / IAgentHostService service decorators.
export var AgentHostIpcChannels;
(function (AgentHostIpcChannels) {
    /** Channel for the agent host service on the main-process side */
    AgentHostIpcChannels["AgentHost"] = "agentHost";
    /** Channel for log forwarding from the agent host process */
    AgentHostIpcChannels["Logger"] = "agentHostLogger";
})(AgentHostIpcChannels || (AgentHostIpcChannels = {}));
/** Configuration key that controls whether the agent host process is spawned. */
export const AgentHostEnabledSettingId = 'chat.agentHost.enabled';
// ---- Session URI helpers ----------------------------------------------------
export var AgentSession;
(function (AgentSession) {
    /**
     * Creates a session URI from a provider name and raw session ID.
     * The URI scheme is the provider name (e.g., `copilot:/<rawId>`).
     */
    function uri(provider, rawSessionId) {
        return URI.from({ scheme: provider, path: `/${rawSessionId}` });
    }
    AgentSession.uri = uri;
    /**
     * Extracts the raw session ID from a session URI (the path without leading slash).
     * Accepts both a URI object and a URI string.
     */
    function id(session) {
        const parsed = typeof session === 'string' ? URI.parse(session) : session;
        return parsed.path.substring(1);
    }
    AgentSession.id = id;
    /**
     * Extracts the provider name from a session URI scheme.
     * Accepts both a URI object and a URI string.
     */
    function provider(session) {
        const parsed = typeof session === 'string' ? URI.parse(session) : session;
        return parsed.scheme || undefined;
    }
    AgentSession.provider = provider;
})(AgentSession || (AgentSession = {}));
// ---- Service interfaces -----------------------------------------------------
export const IAgentService = createDecorator('agentService');
export const IAgentHostService = createDecorator('agentHostService');
//# sourceMappingURL=agentService.js.map