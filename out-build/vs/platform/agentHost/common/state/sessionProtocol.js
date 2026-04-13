/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
export { ContentEncoding, ReconnectResultType } from './protocol/commands.js';
// Error codes
export { AhpErrorCodes, JsonRpcErrorCodes } from './protocol/errors.js';
// ---- Backward-compatible error code aliases ---------------------------------
export const JSON_RPC_PARSE_ERROR = -32700;
export const JSON_RPC_INTERNAL_ERROR = -32603;
export const AHP_SESSION_NOT_FOUND = -32001;
export const AHP_PROVIDER_NOT_FOUND = -32002;
export const AHP_SESSION_ALREADY_EXISTS = -32003;
export const AHP_TURN_IN_PROGRESS = -32004;
export const AHP_UNSUPPORTED_PROTOCOL_VERSION = -32005;
export const AHP_CONTENT_NOT_FOUND = -32006;
export function isJsonRpcRequest(msg) {
    return 'method' in msg && 'id' in msg;
}
export function isJsonRpcNotification(msg) {
    return 'method' in msg && !('id' in msg);
}
export function isJsonRpcResponse(msg) {
    return 'id' in msg && !('method' in msg);
}
// ---- VS Code-specific types ------------------------------------------------
/**
 * Error with a JSON-RPC error code for protocol-level failures.
 */
export class ProtocolError extends Error {
    constructor(code, message) {
        super(message);
        this.code = code;
    }
}
//# sourceMappingURL=sessionProtocol.js.map