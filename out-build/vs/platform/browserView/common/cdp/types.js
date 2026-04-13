/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
/**
 * CDP error codes following JSON-RPC 2.0 conventions
 */
export const CDPErrorCode = {
    /** Method not found */
    MethodNotFound: -32601,
    /** Invalid params */
    InvalidParams: -32602,
    /** Internal error */
    InternalError: -32603,
    /** Server error (generic) */
    ServerError: -32000,
};
/**
 * Base CDP error class with error code
 */
export class CDPError extends Error {
    constructor(message, code) {
        super(message);
        this.code = code;
        this.name = 'CDPError';
    }
}
/**
 * Error thrown when a CDP method is not found
 */
export class CDPMethodNotFoundError extends CDPError {
    constructor(method) {
        super(`Method not found: ${method}`, CDPErrorCode.MethodNotFound);
        this.name = 'CDPMethodNotFoundError';
    }
}
/**
 * Error thrown when CDP params are invalid
 */
export class CDPInvalidParamsError extends CDPError {
    constructor(message) {
        super(message, CDPErrorCode.InvalidParams);
        this.name = 'CDPInvalidParamsError';
    }
}
/**
 * Error thrown for internal CDP errors
 */
export class CDPInternalError extends CDPError {
    constructor(message) {
        super(message, CDPErrorCode.InternalError);
        this.name = 'CDPInternalError';
    }
}
/**
 * Error thrown for generic CDP server errors
 */
export class CDPServerError extends CDPError {
    constructor(message) {
        super(message, CDPErrorCode.ServerError);
        this.name = 'CDPServerError';
    }
}
//# sourceMappingURL=types.js.map