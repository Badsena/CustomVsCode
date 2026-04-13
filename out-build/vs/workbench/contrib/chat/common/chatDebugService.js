/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { createDecorator } from '../../../../platform/instantiation/common/instantiation.js';
/**
 * The severity level of a chat debug log event.
 */
export var ChatDebugLogLevel;
(function (ChatDebugLogLevel) {
    ChatDebugLogLevel[ChatDebugLogLevel["Trace"] = 0] = "Trace";
    ChatDebugLogLevel[ChatDebugLogLevel["Info"] = 1] = "Info";
    ChatDebugLogLevel[ChatDebugLogLevel["Warning"] = 2] = "Warning";
    ChatDebugLogLevel[ChatDebugLogLevel["Error"] = 3] = "Error";
})(ChatDebugLogLevel || (ChatDebugLogLevel = {}));
/**
 * The result of a hook execution.
 */
export var ChatDebugHookResult;
(function (ChatDebugHookResult) {
    /** The hook executed successfully (exit code 0). */
    ChatDebugHookResult[ChatDebugHookResult["Success"] = 0] = "Success";
    /** The hook returned a blocking error (exit code 2). */
    ChatDebugHookResult[ChatDebugHookResult["Error"] = 1] = "Error";
    /** The hook returned a non-blocking warning (other non-zero exit codes). */
    ChatDebugHookResult[ChatDebugHookResult["NonBlockingError"] = 2] = "NonBlockingError";
})(ChatDebugHookResult || (ChatDebugHookResult = {}));
export const IChatDebugService = createDecorator('chatDebugService');
//# sourceMappingURL=chatDebugService.js.map