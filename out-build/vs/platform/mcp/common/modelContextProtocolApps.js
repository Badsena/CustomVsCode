/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
/* eslint-disable local/code-no-unexternalized-strings */
/**
 * Schema updated from the Model Context Protocol Apps repository at
 * https://github.com/modelcontextprotocol/ext-apps/blob/main/src/spec.types.ts
 *
 * ⚠️ Do not edit within `namespace` manually except to update schema versions ⚠️
 */
export var McpApps;
(function (McpApps) {
    /**
     * Current protocol version supported by this SDK.
     *
     * The SDK automatically handles version negotiation during initialization.
     * Apps and hosts don't need to manage protocol versions manually.
     */
    McpApps.LATEST_PROTOCOL_VERSION = "2026-01-26";
    /**
     * Method string constants for MCP Apps protocol messages.
     *
     * These constants provide a type-safe way to check message methods without
     * accessing internal Zod schema properties. External libraries should use
     * these constants instead of accessing `schema.shape.method._def.values[0]`.
     *
     * @example
     * ```typescript
     * import { SANDBOX_PROXY_READY_METHOD } from '@modelcontextprotocol/ext-apps';
     *
     * if (event.data.method === SANDBOX_PROXY_READY_METHOD) {
     *   // Handle sandbox proxy ready notification
     * }
     * ```
     */
    McpApps.OPEN_LINK_METHOD = "ui/open-link";
    McpApps.MESSAGE_METHOD = "ui/message";
    McpApps.SANDBOX_PROXY_READY_METHOD = "ui/notifications/sandbox-proxy-ready";
    McpApps.SANDBOX_RESOURCE_READY_METHOD = "ui/notifications/sandbox-resource-ready";
    McpApps.SIZE_CHANGED_METHOD = "ui/notifications/size-changed";
    McpApps.TOOL_INPUT_METHOD = "ui/notifications/tool-input";
    McpApps.TOOL_INPUT_PARTIAL_METHOD = "ui/notifications/tool-input-partial";
    McpApps.TOOL_RESULT_METHOD = "ui/notifications/tool-result";
    McpApps.TOOL_CANCELLED_METHOD = "ui/notifications/tool-cancelled";
    McpApps.HOST_CONTEXT_CHANGED_METHOD = "ui/notifications/host-context-changed";
    McpApps.RESOURCE_TEARDOWN_METHOD = "ui/resource-teardown";
    McpApps.INITIALIZE_METHOD = "ui/initialize";
    McpApps.INITIALIZED_METHOD = "ui/notifications/initialized";
    McpApps.REQUEST_DISPLAY_MODE_METHOD = "ui/request-display-mode";
    McpApps.UPDATE_MODEL_CONTEXT_METHOD = "ui/update-model-context";
    McpApps.DOWNLOAD_FILE_METHOD = "ui/download-file";
})(McpApps || (McpApps = {}));
//# sourceMappingURL=modelContextProtocolApps.js.map