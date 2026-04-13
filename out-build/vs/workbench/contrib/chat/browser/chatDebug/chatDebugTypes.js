/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as DOM from '../../../../../base/browser/dom.js';
import { BreadcrumbsItem } from '../../../../../base/browser/ui/breadcrumbs/breadcrumbsWidget.js';
import { RawContextKey } from '../../../../../platform/contextkey/common/contextkey.js';
const $ = DOM.$;
export var ViewState;
(function (ViewState) {
    ViewState["Home"] = "home";
    ViewState["Overview"] = "overview";
    ViewState["Logs"] = "logs";
    ViewState["FlowChart"] = "flowchart";
})(ViewState || (ViewState = {}));
export var LogsViewMode;
(function (LogsViewMode) {
    LogsViewMode["List"] = "list";
    LogsViewMode["Tree"] = "tree";
})(LogsViewMode || (LogsViewMode = {}));
export const CHAT_DEBUG_FILTER_ACTIVE = new RawContextKey('chatDebugFilterActive', false);
export const CHAT_DEBUG_KIND_TOOL_CALL = new RawContextKey('chatDebug.kindToolCall', true);
export const CHAT_DEBUG_KIND_MODEL_TURN = new RawContextKey('chatDebug.kindModelTurn', true);
export const CHAT_DEBUG_KIND_PROMPT_DISCOVERY = new RawContextKey('chatDebug.kindPromptDiscovery', true);
export const CHAT_DEBUG_KIND_SUBAGENT = new RawContextKey('chatDebug.kindSubagent', true);
// Filter toggle command IDs
export const CHAT_DEBUG_CMD_TOGGLE_TOOL_CALL = 'chatDebug.filter.toggleToolCall';
export const CHAT_DEBUG_CMD_TOGGLE_MODEL_TURN = 'chatDebug.filter.toggleModelTurn';
export const CHAT_DEBUG_CMD_TOGGLE_PROMPT_DISCOVERY = 'chatDebug.filter.togglePromptDiscovery';
export const CHAT_DEBUG_CMD_TOGGLE_SUBAGENT = 'chatDebug.filter.toggleSubagent';
export class TextBreadcrumbItem extends BreadcrumbsItem {
    constructor(_text, _isLink = false) {
        super();
        this._text = _text;
        this._isLink = _isLink;
    }
    equals(other) {
        return other instanceof TextBreadcrumbItem && other._text === this._text;
    }
    dispose() {
        // Nothing to dispose
    }
    render(container) {
        container.classList.add('chat-debug-breadcrumb-item');
        if (this._isLink) {
            container.classList.add('chat-debug-breadcrumb-item-link');
        }
        DOM.append(container, $('span.chat-debug-breadcrumb-item-label', undefined, this._text));
    }
}
/**
 * Wire up Left/Right arrow, Home/End, and Enter keyboard navigation
 * on a BreadcrumbsWidget container.
 */
export function setupBreadcrumbKeyboardNavigation(container, widget) {
    return DOM.addDisposableListener(container, DOM.EventType.KEY_DOWN, (e) => {
        switch (e.key) {
            case 'ArrowLeft':
                e.preventDefault();
                widget.focusPrev();
                break;
            case 'ArrowRight':
                e.preventDefault();
                widget.focusNext();
                break;
            case 'Home':
                e.preventDefault();
                widget.setFocused(widget.getItems()[0]);
                break;
            case 'End': {
                e.preventDefault();
                const items = widget.getItems();
                widget.setFocused(items[items.length - 1]);
                break;
            }
            case 'Enter':
            case ' ': {
                e.preventDefault();
                const focused = widget.getFocused();
                if (focused) {
                    widget.setSelection(focused);
                }
                break;
            }
        }
    });
}
//# sourceMappingURL=chatDebugTypes.js.map