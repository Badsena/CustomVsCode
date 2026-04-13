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
import * as DOM from '../../../../../base/browser/dom.js';
import { Button } from '../../../../../base/browser/ui/button/button.js';
import { Codicon } from '../../../../../base/common/codicons.js';
import { Emitter } from '../../../../../base/common/event.js';
import { Disposable, DisposableStore } from '../../../../../base/common/lifecycle.js';
import { ThemeIcon } from '../../../../../base/common/themables.js';
import { isUUID } from '../../../../../base/common/uuid.js';
import { localize } from '../../../../../nls.js';
import { IConfigurationService } from '../../../../../platform/configuration/common/configuration.js';
import { defaultButtonStyles } from '../../../../../platform/theme/browser/defaultStyles.js';
import { IChatDebugService } from '../../common/chatDebugService.js';
import { IChatService } from '../../common/chatService/chatService.js';
import { AGENT_DEBUG_LOG_ENABLED_SETTING } from '../../common/promptSyntax/promptTypes.js';
import { getChatSessionType, isUntitledChatSession, LocalChatSessionUri } from '../../common/model/chatUri.js';
import { IChatWidgetService } from '../chat.js';
import { IPreferencesService } from '../../../../services/preferences/common/preferences.js';
const $ = DOM.$;
let ChatDebugHomeView = class ChatDebugHomeView extends Disposable {
    constructor(parent, chatService, chatDebugService, chatWidgetService, configurationService, preferencesService) {
        super();
        this.chatService = chatService;
        this.chatDebugService = chatDebugService;
        this.chatWidgetService = chatWidgetService;
        this.configurationService = configurationService;
        this.preferencesService = preferencesService;
        this._onNavigateToSession = this._register(new Emitter());
        this.onNavigateToSession = this._onNavigateToSession.event;
        this.renderDisposables = this._register(new DisposableStore());
        this.container = DOM.append(parent, $('.chat-debug-home'));
        this.scrollContent = DOM.append(this.container, $('div.chat-debug-home-content'));
        this._register(this.configurationService.onDidChangeConfiguration(e => {
            if (e.affectsConfiguration(AGENT_DEBUG_LOG_ENABLED_SETTING)) {
                this.render();
            }
        }));
    }
    show() {
        this.container.style.display = '';
        this.render();
    }
    hide() {
        this.container.style.display = 'none';
    }
    render() {
        DOM.clearNode(this.scrollContent);
        this.renderDisposables.clear();
        DOM.append(this.scrollContent, $('h2.chat-debug-home-title', undefined, localize(6935, null)));
        const isEnabled = this.configurationService.getValue(AGENT_DEBUG_LOG_ENABLED_SETTING);
        if (!isEnabled) {
            DOM.append(this.scrollContent, $('p.chat-debug-home-subtitle', undefined, localize(6936, null)));
            const enableButton = this.renderDisposables.add(new Button(this.scrollContent, { ...defaultButtonStyles, secondary: true }));
            enableButton.element.style.width = 'auto';
            enableButton.label = localize(6937, null);
            this.renderDisposables.add(enableButton.onDidClick(() => {
                this.preferencesService.openSettings({ jsonEditor: false, query: AGENT_DEBUG_LOG_ENABLED_SETTING });
            }));
            return;
        }
        // Determine the active session resource
        const activeWidget = this.chatWidgetService.lastFocusedWidget;
        const activeSessionResource = activeWidget?.viewModel?.sessionResource;
        // List sessions that have debug event data.
        // Use the debug service as the source of truth — it includes sessions
        // whose chat models may have been archived (e.g. when a new chat was started).
        const cliSessionTypes = new Set(['copilotcli', 'claude-code']);
        const sessionResources = [...this.chatDebugService.getSessionResources()].reverse()
            // Hide untitled bootstrap sessions for CLI session types (e.g. copilotcli, claude-code).
            // These are transient sessions created during async session setup that only contain
            // a single "Load Hooks" event and would confuse users.
            .filter(r => !cliSessionTypes.has(getChatSessionType(r)) || !isUntitledChatSession(r));
        // Sort: active session first
        if (activeSessionResource) {
            const activeIndex = sessionResources.findIndex(r => r.toString() === activeSessionResource.toString());
            if (activeIndex > 0) {
                sessionResources.splice(activeIndex, 1);
                sessionResources.unshift(activeSessionResource);
            }
        }
        DOM.append(this.scrollContent, $('p.chat-debug-home-subtitle', undefined, sessionResources.length > 0
            ? localize(6938, null)
            : localize(6939, null)));
        if (sessionResources.length > 0) {
            const sessionList = DOM.append(this.scrollContent, $('.chat-debug-home-session-list'));
            sessionList.setAttribute('role', 'list');
            sessionList.setAttribute('aria-label', localize(6940, null));
            const items = [];
            for (const sessionResource of sessionResources) {
                const rawTitle = this.chatService.getSessionTitle(sessionResource);
                const importedTitle = this.chatDebugService.getImportedSessionTitle(sessionResource);
                let sessionTitle;
                if (rawTitle && !isUUID(rawTitle)) {
                    sessionTitle = rawTitle;
                }
                else if (LocalChatSessionUri.isLocalSession(sessionResource)) {
                    sessionTitle = localize(6941, null);
                }
                else if (importedTitle) {
                    sessionTitle = localize(6942, null, importedTitle);
                }
                else if (getChatSessionType(sessionResource) === 'copilotcli') {
                    const pathId = sessionResource.path.replace(/^\//, '').split('-')[0];
                    const shortId = pathId || sessionResource.authority || sessionResource.toString();
                    sessionTitle = localize(6943, null, shortId);
                }
                else if (getChatSessionType(sessionResource) === 'claude-code') {
                    const pathId = sessionResource.path.replace(/^\//, '').split('-')[0];
                    const shortId = pathId || sessionResource.authority || sessionResource.toString();
                    sessionTitle = localize(6944, null, shortId);
                }
                else {
                    sessionTitle = localize(6945, null);
                }
                const isActive = activeSessionResource !== undefined && sessionResource.toString() === activeSessionResource.toString();
                const item = DOM.append(sessionList, $('button.chat-debug-home-session-item'));
                item.setAttribute('role', 'listitem');
                if (isActive) {
                    item.classList.add('chat-debug-home-session-item-active');
                    item.setAttribute('aria-current', 'true');
                }
                DOM.append(item, $(`span${ThemeIcon.asCSSSelector(Codicon.comment)}`));
                const titleSpan = DOM.append(item, $('span.chat-debug-home-session-item-title'));
                titleSpan.textContent = sessionTitle;
                const ariaLabel = isActive
                    ? localize(6946, null, sessionTitle)
                    : sessionTitle;
                item.setAttribute('aria-label', ariaLabel);
                if (isActive) {
                    DOM.append(item, $('span.chat-debug-home-session-badge', undefined, localize(6947, null)));
                }
                this.renderDisposables.add(DOM.addDisposableListener(item, DOM.EventType.CLICK, () => {
                    this._onNavigateToSession.fire(sessionResource);
                }));
                items.push(item);
            }
            // Arrow key navigation between session items
            this.renderDisposables.add(DOM.addDisposableListener(sessionList, DOM.EventType.KEY_DOWN, (e) => {
                if (items.length === 0) {
                    return;
                }
                const focused = DOM.getActiveElement();
                const idx = items.indexOf(focused);
                if (idx === -1) {
                    return;
                }
                let nextIdx;
                switch (e.key) {
                    case 'ArrowDown':
                        nextIdx = idx + 1 < items.length ? idx + 1 : idx;
                        break;
                    case 'ArrowUp':
                        nextIdx = idx - 1 >= 0 ? idx - 1 : idx;
                        break;
                    case 'Home':
                        nextIdx = 0;
                        break;
                    case 'End':
                        nextIdx = items.length - 1;
                        break;
                }
                if (nextIdx !== undefined) {
                    e.preventDefault();
                    items[nextIdx].focus();
                }
            }));
        }
    }
};
ChatDebugHomeView = __decorate([
    __param(1, IChatService),
    __param(2, IChatDebugService),
    __param(3, IChatWidgetService),
    __param(4, IConfigurationService),
    __param(5, IPreferencesService)
], ChatDebugHomeView);
export { ChatDebugHomeView };
//# sourceMappingURL=chatDebugHomeView.js.map