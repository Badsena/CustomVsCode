/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Emitter } from '../../../../../base/common/event.js';
import { Disposable, DisposableStore } from '../../../../../base/common/lifecycle.js';
import { localize } from '../../../../../nls.js';
import { MenuRegistry } from '../../../../../platform/actions/common/actions.js';
import { CommandsRegistry } from '../../../../../platform/commands/common/commands.js';
import { viewFilterSubmenu } from '../../../../browser/parts/views/viewFilter.js';
import { parseTimeToken, stripTimestampTokens } from '../../common/chatDebugEvents.js';
import { CHAT_DEBUG_FILTER_ACTIVE, CHAT_DEBUG_KIND_TOOL_CALL, CHAT_DEBUG_KIND_MODEL_TURN, CHAT_DEBUG_KIND_PROMPT_DISCOVERY, CHAT_DEBUG_KIND_SUBAGENT, CHAT_DEBUG_CMD_TOGGLE_TOOL_CALL, CHAT_DEBUG_CMD_TOGGLE_MODEL_TURN, CHAT_DEBUG_CMD_TOGGLE_PROMPT_DISCOVERY, CHAT_DEBUG_CMD_TOGGLE_SUBAGENT, } from './chatDebugTypes.js';
/**
 * Shared filter state for the Agent Debug Logs.
 *
 * Both the Logs view and the Flow Chart view read from this single source of
 * truth. Toggle commands modify the state and fire `onDidChange` so every
 * consumer can re-render.
 */
export class ChatDebugFilterState extends Disposable {
    constructor() {
        super(...arguments);
        this._onDidChange = this._register(new Emitter());
        this.onDidChange = this._onDidChange.event;
        // Kind visibility
        this.filterKindToolCall = true;
        this.filterKindModelTurn = true;
        this.filterKindPromptDiscovery = true;
        this.filterKindSubagent = true;
        // Text filter
        this.textFilter = '';
    }
    isKindVisible(kind, category) {
        switch (kind) {
            case 'toolCall': return this.filterKindToolCall;
            case 'modelTurn': return this.filterKindModelTurn;
            case 'generic':
                // The "Prompt Discovery" toggle only hides events produced by
                // the prompt discovery pipeline (category === 'discovery').
                // Other generic events (e.g. from external providers) are
                // always visible and are not affected by this toggle.
                if (category !== 'discovery') {
                    return true;
                }
                return this.filterKindPromptDiscovery;
            case 'subagentInvocation': return this.filterKindSubagent;
            default: return true;
        }
    }
    isAllKindsVisible() {
        return this.filterKindToolCall && this.filterKindModelTurn &&
            this.filterKindPromptDiscovery && this.filterKindSubagent;
    }
    isAllFiltersDefault() {
        return this.isAllKindsVisible();
    }
    setTextFilter(text) {
        const normalized = text.toLowerCase();
        if (this.textFilter !== normalized) {
            this.textFilter = normalized;
            this.beforeTimestamp = parseTimeToken(normalized, 'before');
            this.afterTimestamp = parseTimeToken(normalized, 'after');
            this._onDidChange.fire();
        }
    }
    /** Returns the text filter with before:/after: tokens removed. */
    get textFilterWithoutTimestamps() {
        return stripTimestampTokens(this.textFilter);
    }
    isTimestampVisible(created) {
        const time = created.getTime();
        if (this.beforeTimestamp !== undefined && time > this.beforeTimestamp) {
            return false;
        }
        if (this.afterTimestamp !== undefined && time < this.afterTimestamp) {
            return false;
        }
        return true;
    }
    fire() {
        this._onDidChange.fire();
    }
}
/**
 * Registers the toggle-filter commands and menu items once, wired to a shared
 * {@link ChatDebugFilterState}. Returns a disposable that unregisters them.
 */
export function registerFilterMenuItems(state, scopedContextKeyService) {
    const store = new DisposableStore();
    // Bind context keys so the "More Filters" submenu shows toggle checkboxes
    CHAT_DEBUG_FILTER_ACTIVE.bindTo(scopedContextKeyService).set(true);
    const kindToolCallKey = CHAT_DEBUG_KIND_TOOL_CALL.bindTo(scopedContextKeyService);
    kindToolCallKey.set(true);
    const kindModelTurnKey = CHAT_DEBUG_KIND_MODEL_TURN.bindTo(scopedContextKeyService);
    kindModelTurnKey.set(true);
    const kindPromptDiscoveryKey = CHAT_DEBUG_KIND_PROMPT_DISCOVERY.bindTo(scopedContextKeyService);
    kindPromptDiscoveryKey.set(true);
    const kindSubagentKey = CHAT_DEBUG_KIND_SUBAGENT.bindTo(scopedContextKeyService);
    kindSubagentKey.set(true);
    const registerToggle = (id, title, key, group, getter, setter, ctxKey) => {
        store.add(CommandsRegistry.registerCommand(id, () => {
            const newVal = !getter();
            setter(newVal);
            ctxKey.set(newVal);
            state.fire();
        }));
        store.add(MenuRegistry.appendMenuItem(viewFilterSubmenu, {
            command: { id, title, toggled: key },
            group,
            when: CHAT_DEBUG_FILTER_ACTIVE,
        }));
    };
    registerToggle(CHAT_DEBUG_CMD_TOGGLE_TOOL_CALL, localize(6900, null), CHAT_DEBUG_KIND_TOOL_CALL, '1_kind', () => state.filterKindToolCall, v => { state.filterKindToolCall = v; }, kindToolCallKey);
    registerToggle(CHAT_DEBUG_CMD_TOGGLE_MODEL_TURN, localize(6901, null), CHAT_DEBUG_KIND_MODEL_TURN, '1_kind', () => state.filterKindModelTurn, v => { state.filterKindModelTurn = v; }, kindModelTurnKey);
    registerToggle(CHAT_DEBUG_CMD_TOGGLE_PROMPT_DISCOVERY, localize(6902, null), CHAT_DEBUG_KIND_PROMPT_DISCOVERY, '1_kind', () => state.filterKindPromptDiscovery, v => { state.filterKindPromptDiscovery = v; }, kindPromptDiscoveryKey);
    registerToggle(CHAT_DEBUG_CMD_TOGGLE_SUBAGENT, localize(6903, null), CHAT_DEBUG_KIND_SUBAGENT, '1_kind', () => state.filterKindSubagent, v => { state.filterKindSubagent = v; }, kindSubagentKey);
    return store;
}
/**
 * Binds context keys for filter state into a scoped context key service.
 * Returns a function to sync all keys from the current state.
 */
export function bindFilterContextKeys(state, scopedContextKeyService) {
    CHAT_DEBUG_FILTER_ACTIVE.bindTo(scopedContextKeyService).set(true);
    const kindToolCallKey = CHAT_DEBUG_KIND_TOOL_CALL.bindTo(scopedContextKeyService);
    const kindModelTurnKey = CHAT_DEBUG_KIND_MODEL_TURN.bindTo(scopedContextKeyService);
    const kindPromptDiscoveryKey = CHAT_DEBUG_KIND_PROMPT_DISCOVERY.bindTo(scopedContextKeyService);
    const kindSubagentKey = CHAT_DEBUG_KIND_SUBAGENT.bindTo(scopedContextKeyService);
    return () => {
        kindToolCallKey.set(state.filterKindToolCall);
        kindModelTurnKey.set(state.filterKindModelTurn);
        kindPromptDiscoveryKey.set(state.filterKindPromptDiscovery);
        kindSubagentKey.set(state.filterKindSubagent);
    };
}
//# sourceMappingURL=chatDebugFilters.js.map