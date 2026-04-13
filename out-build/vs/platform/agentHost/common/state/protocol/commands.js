/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
// ─── reconnect ───────────────────────────────────────────────────────────────
/**
 * Discriminant for reconnect result types.
 *
 * @category Commands
 */
export var ReconnectResultType;
(function (ReconnectResultType) {
    ReconnectResultType["Replay"] = "replay";
    ReconnectResultType["Snapshot"] = "snapshot";
})(ReconnectResultType || (ReconnectResultType = {}));
// ─── fetchContent ────────────────────────────────────────────────────────────
/**
 * Encoding of fetched content data.
 *
 * @category Commands
 */
export var ContentEncoding;
(function (ContentEncoding) {
    ContentEncoding["Base64"] = "base64";
    ContentEncoding["Utf8"] = "utf-8";
})(ContentEncoding || (ContentEncoding = {}));
//# sourceMappingURL=commands.js.map