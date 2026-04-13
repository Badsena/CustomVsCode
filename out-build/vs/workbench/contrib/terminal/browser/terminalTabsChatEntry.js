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
import { ThemeIcon } from '../../../../base/common/themables.js';
import { Codicon } from '../../../../base/common/codicons.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { $ } from '../../../../base/browser/dom.js';
import { localize } from '../../../../nls.js';
import { ICommandService } from '../../../../platform/commands/common/commands.js';
import { ITerminalChatService, ITerminalService } from './terminal.js';
import * as dom from '../../../../base/browser/dom.js';
let TerminalTabsChatEntry = class TerminalTabsChatEntry extends Disposable {
    dispose() {
        this._entry.remove();
        this._label.remove();
        this._deleteButton.remove();
        super.dispose();
    }
    constructor(container, _tabContainer, _commandService, _terminalChatService, _terminalService) {
        super();
        this._tabContainer = _tabContainer;
        this._commandService = _commandService;
        this._terminalChatService = _terminalChatService;
        this._terminalService = _terminalService;
        this._entry = dom.append(container, $('.terminal-tabs-chat-entry'));
        this._entry.tabIndex = 0;
        this._entry.setAttribute('role', 'button');
        const entry = dom.append(this._entry, $('.terminal-tabs-entry'));
        const icon = dom.append(entry, $('.terminal-tabs-chat-entry-icon'));
        icon.classList.add(...ThemeIcon.asClassNameArray(Codicon.commentDiscussionSparkle));
        this._label = dom.append(entry, $('.terminal-tabs-chat-entry-label'));
        // Add delete button (right-aligned via CSS margin-left: auto)
        this._deleteButton = dom.append(entry, $('.terminal-tabs-chat-entry-delete'));
        this._deleteButton.classList.add(...ThemeIcon.asClassNameArray(Codicon.trashcan));
        this._deleteButton.tabIndex = 0;
        this._deleteButton.setAttribute('role', 'button');
        this._deleteButton.setAttribute('aria-label', localize(15505, null));
        this._deleteButton.setAttribute('title', localize(15506, null));
        const runChatTerminalsCommand = () => {
            void this._commandService.executeCommand('workbench.action.terminal.chat.viewHiddenChatTerminals');
        };
        this._register(dom.addDisposableListener(this._entry, dom.EventType.CLICK, e => {
            // Don't trigger if clicking on the delete button
            if (e.target === this._deleteButton || this._deleteButton.contains(e.target)) {
                return;
            }
            e.preventDefault();
            runChatTerminalsCommand();
        }));
        this._register(dom.addDisposableListener(this._entry, dom.EventType.KEY_DOWN, e => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                runChatTerminalsCommand();
            }
        }));
        // Delete button click handler
        this._register(dom.addDisposableListener(this._deleteButton, dom.EventType.CLICK, async (e) => {
            e.preventDefault();
            e.stopPropagation();
            await this._deleteAllHiddenTerminals();
        }));
        // Delete button keyboard handler
        this._register(dom.addDisposableListener(this._deleteButton, dom.EventType.KEY_DOWN, async (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                e.stopPropagation();
                await this._deleteAllHiddenTerminals();
            }
        }));
        this.update();
    }
    async _deleteAllHiddenTerminals() {
        const hiddenTerminals = this._terminalChatService.getToolSessionTerminalInstances(true);
        await Promise.all(hiddenTerminals.map(terminal => this._terminalService.safeDisposeTerminal(terminal)));
    }
    get element() {
        return this._entry;
    }
    update() {
        const hiddenChatTerminalCount = this._terminalChatService.getToolSessionTerminalInstances(true).length;
        if (hiddenChatTerminalCount <= 0) {
            this._entry.style.display = 'none';
            this._label.textContent = '';
            this._entry.removeAttribute('aria-label');
            this._entry.removeAttribute('title');
            return;
        }
        this._entry.style.display = '';
        const tooltip = localize(15507, null);
        this._entry.setAttribute('title', tooltip);
        const hasText = this._tabContainer.classList.contains('has-text');
        if (hasText) {
            this._label.textContent = hiddenChatTerminalCount === 1
                ? localize(15508, null, hiddenChatTerminalCount)
                : localize(15509, null, hiddenChatTerminalCount);
        }
        else {
            this._label.textContent = `${hiddenChatTerminalCount}`;
        }
        const ariaLabel = hiddenChatTerminalCount === 1
            ? localize(15510, null)
            : localize(15511, null, hiddenChatTerminalCount);
        this._entry.setAttribute('aria-label', ariaLabel);
    }
};
TerminalTabsChatEntry = __decorate([
    __param(2, ICommandService),
    __param(3, ITerminalChatService),
    __param(4, ITerminalService)
], TerminalTabsChatEntry);
export { TerminalTabsChatEntry };
//# sourceMappingURL=terminalTabsChatEntry.js.map