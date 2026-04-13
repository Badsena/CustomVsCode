/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
/**
 * This is a subset of the types export from jsonTypes.d.ts in @vscode/prompt-tsx.
 * It's just the types needed to stringify prompt-tsx tool results.
 * It should be kept in sync with the types in that file.
 *
 * Note: do NOT use `declare` with const enums, esbuild doesn't inline them.
 * See https://github.com/evanw/esbuild/issues/4394
 */
export var PromptNodeType;
(function (PromptNodeType) {
    PromptNodeType[PromptNodeType["Piece"] = 1] = "Piece";
    PromptNodeType[PromptNodeType["Text"] = 2] = "Text";
})(PromptNodeType || (PromptNodeType = {}));
/**
 * Constructor kind of the node represented by {@link PieceJSON}. This is
 * less descriptive than the actual constructor, as we only care to preserve
 * the element data that the renderer cares about.
 */
export var PieceCtorKind;
(function (PieceCtorKind) {
    PieceCtorKind[PieceCtorKind["BaseChatMessage"] = 1] = "BaseChatMessage";
    PieceCtorKind[PieceCtorKind["Other"] = 2] = "Other";
    PieceCtorKind[PieceCtorKind["ImageChatMessage"] = 3] = "ImageChatMessage";
})(PieceCtorKind || (PieceCtorKind = {}));
export function stringifyPromptElementJSON(element) {
    const strs = [];
    stringifyPromptNodeJSON(element.node, strs);
    return strs.join('');
}
function stringifyPromptNodeJSON(node, strs) {
    if (node.type === 2 /* PromptNodeType.Text */) {
        if (node.lineBreakBefore) {
            strs.push('\n');
        }
        if (typeof node.text === 'string') {
            strs.push(node.text);
        }
    }
    else if (node.ctor === 3 /* PieceCtorKind.ImageChatMessage */) {
        // This case currently can't be hit by prompt-tsx
        strs.push('<image>');
    }
    else if (node.ctor === 1 /* PieceCtorKind.BaseChatMessage */ || node.ctor === 2 /* PieceCtorKind.Other */) {
        for (const child of node.children) {
            stringifyPromptNodeJSON(child, strs);
        }
    }
}
//# sourceMappingURL=promptTsxTypes.js.map