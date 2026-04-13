/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var PromptsDebugContribution_1;
import { Disposable } from '../../../../base/common/lifecycle.js';
import { generateUuid } from '../../../../base/common/uuid.js';
import { IChatDebugService } from '../common/chatDebugService.js';
import { IPromptsService } from '../common/promptSyntax/service/promptsService.js';
/**
 * Bridges {@link IPromptsService} discovery log events to {@link IChatDebugService}.
 *
 * This contribution listens for discovery events emitted by the prompts service
 * and forwards them as debug log entries. It also registers a resolve provider
 * so expanding a discovery event in the Agent Debug Logs shows the full file list.
 */
let PromptsDebugContribution = class PromptsDebugContribution extends Disposable {
    static { PromptsDebugContribution_1 = this; }
    static { this.ID = 'workbench.contrib.promptsDebug'; }
    static { this.MAX_DISCOVERY_DETAILS = 10_000; }
    constructor(promptsService, chatDebugService) {
        super();
        /**
         * Maps debug event IDs to their discovery info, so that
         * {@link IChatDebugService.resolveEvent} can return rich details.
         */
        this._discoveryEventDetails = new Map();
        // Forward discovery log events to the debug service.
        this._register(promptsService.onDidLogDiscovery(entry => {
            let eventId;
            if (entry.discoveryInfo) {
                eventId = generateUuid();
                this._discoveryEventDetails.set(eventId, entry.discoveryInfo);
                // Evict oldest entries when the map exceeds the cap.
                if (this._discoveryEventDetails.size > PromptsDebugContribution_1.MAX_DISCOVERY_DETAILS) {
                    const first = this._discoveryEventDetails.keys().next().value;
                    if (first !== undefined) {
                        this._discoveryEventDetails.delete(first);
                    }
                }
            }
            // Enrich details with file paths so they appear in the event
            // payload (e.g. forwarded via onDidReceiveChatDebugEvent to the
            // extension's JSONL file logger).
            let details = entry.details;
            if (entry.discoveryInfo) {
                const info = entry.discoveryInfo;
                const loaded = info.files.filter(f => f.status === 'loaded').map(f => f.name ?? f.uri.path.split('/').pop() ?? f.uri.toString());
                const skipped = info.files.filter(f => f.status === 'skipped').map(f => {
                    const label = f.uri.toString();
                    return f.skipReason ? `${label} (${f.skipReason})` : label;
                });
                const folders = info.sourceFolders?.map(sf => sf.uri.path) ?? [];
                const parts = [];
                if (details) {
                    parts.push(details);
                }
                if (loaded.length > 0) {
                    parts.push(`loaded: [${truncateList(loaded)}]`);
                }
                if (skipped.length > 0) {
                    parts.push(`skipped: [${truncateList(skipped)}]`);
                }
                if (folders.length > 0) {
                    parts.push(`folders: [${truncateList(folders)}]`);
                }
                details = parts.join(' | ') || undefined;
            }
            chatDebugService.log(entry.sessionResource, entry.name, details, undefined, { id: eventId, category: entry.category });
        }));
        // Register a resolve provider so expanding a discovery event
        // in the Agent Debug Logs shows the full file list.
        this._register(chatDebugService.registerProvider({
            provideChatDebugLog: async () => undefined,
            resolveChatDebugLogEvent: async (eventId) => {
                return this._resolveDiscoveryEvent(eventId);
            }
        }));
    }
    _resolveDiscoveryEvent(eventId) {
        const info = this._discoveryEventDetails.get(eventId);
        if (!info) {
            return undefined;
        }
        return {
            kind: 'fileList',
            discoveryType: info.type,
            files: info.files.map(f => ({
                uri: f.uri,
                name: f.name,
                status: f.status,
                storage: f.storage,
                extensionId: f.extensionId,
                skipReason: f.skipReason,
                errorMessage: f.errorMessage,
                duplicateOf: f.duplicateOf,
            })),
            sourceFolders: info.sourceFolders?.map(sf => ({
                uri: sf.uri,
                storage: sf.storage,
            })),
        };
    }
};
PromptsDebugContribution = PromptsDebugContribution_1 = __decorate([
    __param(0, IPromptsService),
    __param(1, IChatDebugService)
], PromptsDebugContribution);
export { PromptsDebugContribution };
const MAX_LIST_ITEMS = 100;
/**
 * Join a list of strings, truncating after {@link MAX_LIST_ITEMS} entries.
 * Full details are available via {@link IChatDebugService.resolveEvent}.
 */
function truncateList(items) {
    if (items.length <= MAX_LIST_ITEMS) {
        return items.join(', ');
    }
    return items.slice(0, MAX_LIST_ITEMS).join(', ') + ` (+${items.length - MAX_LIST_ITEMS} more)`;
}
//# sourceMappingURL=promptsDebugContribution.js.map