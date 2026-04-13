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
import './media/unifiedQuickAccess.css';
import { $, addDisposableListener, EventType } from '../../../../../../base/browser/dom.js';
import { Disposable, DisposableStore, isDisposable } from '../../../../../../base/common/lifecycle.js';
import { IQuickInputService } from '../../../../../../platform/quickinput/common/quickInput.js';
import { IInstantiationService } from '../../../../../../platform/instantiation/common/instantiation.js';
import { localize } from '../../../../../../nls.js';
import { Radio } from '../../../../../../base/browser/ui/radio/radio.js';
import { CancellationTokenSource } from '../../../../../../base/common/cancellation.js';
import { Extensions } from '../../../../../../platform/quickinput/common/quickAccess.js';
import { Registry } from '../../../../../../platform/registry/common/platform.js';
import { IContextKeyService } from '../../../../../../platform/contextkey/common/contextkey.js';
import { createInstantHoverDelegate, getDefaultHoverDelegate } from '../../../../../../base/browser/ui/hover/hoverDelegateFactory.js';
import { IHoverService } from '../../../../../../platform/hover/browser/hover.js';
import { Codicon } from '../../../../../../base/common/codicons.js';
import { renderIcon } from '../../../../../../base/browser/ui/iconLabel/iconLabels.js';
import { Event } from '../../../../../../base/common/event.js';
import { ILayoutService } from '../../../../../../platform/layout/browser/layoutService.js';
import { ICommandService } from '../../../../../../platform/commands/common/commands.js';
import { IKeybindingService } from '../../../../../../platform/keybinding/common/keybinding.js';
import { ACTION_ID_NEW_CHAT, CHAT_OPEN_ACTION_ID } from '../../actions/chatActions.js';
/** Marker ID for the "send to agent" quick pick item */
const SEND_TO_AGENT_ID = 'unified-quick-access-send-to-agent';
/**
 * Default tabs for the unified quick access widget.
 */
export const DEFAULT_UNIFIED_QUICK_ACCESS_TABS = [
    {
        id: 'agentSessions',
        label: localize(6323, null),
        prefix: 'agent ',
        placeholder: localize(6324, null),
        tooltip: localize(6325, null),
    },
    {
        id: 'commands',
        label: localize(6326, null),
        prefix: '>',
        placeholder: localize(6327, null),
        tooltip: localize(6328, null),
    },
    {
        id: 'files',
        label: localize(6329, null),
        prefix: '',
        placeholder: localize(6330, null),
        tooltip: localize(6331, null),
    },
];
/**
 * Service for showing a unified quick access widget with multiple tabs.
 * Combines multiple QuickAccessProviders into a single tabbed interface.
 */
let UnifiedQuickAccess = class UnifiedQuickAccess extends Disposable {
    constructor(tabs, quickInputService, instantiationService, contextKeyService, layoutService, commandService, keybindingService, hoverService) {
        super();
        this.quickInputService = quickInputService;
        this.instantiationService = instantiationService;
        this.contextKeyService = contextKeyService;
        this.layoutService = layoutService;
        this.commandService = commandService;
        this.keybindingService = keybindingService;
        this.hoverService = hoverService;
        this.registry = Registry.as(Extensions.Quickaccess);
        this.mapProviderToDescriptor = new Map();
        this._currentDisposables = this._register(new DisposableStore());
        this._providerDisposables = this._register(new DisposableStore());
        this._isInternalValueChange = false; // Flag to prevent recursive tab detection
        this._isUpdatingSendToAgent = false; // Guard to prevent infinite loop
        this._tabs = tabs ?? DEFAULT_UNIFIED_QUICK_ACCESS_TABS;
    }
    /**
     * Show the unified quick access widget.
     * @param initialTabId Optional tab ID to start with. Defaults to first tab.
     * @param initialValue Optional initial filter value.
     */
    show(initialTabId, initialValue) {
        // If already showing, just focus
        if (this._currentPicker) {
            return;
        }
        this._currentDisposables.clear();
        // Create picker
        const picker = this._currentDisposables.add(this.quickInputService.createQuickPick({ useSeparators: true }));
        this._currentPicker = picker;
        // Configure picker
        picker.ignoreFocusOut = false;
        picker.matchOnDescription = true;
        picker.matchOnDetail = true;
        picker.sortByLabel = false;
        // Find initial tab
        const initialTab = initialTabId
            ? this._tabs.find(t => t.id === initialTabId) ?? this._tabs[0]
            : this._tabs[0];
        this._currentTab = initialTab;
        // Create and inject tab bar into the picker
        this._injectTabBar(picker);
        // Set initial value and activate tab
        // Start with empty value (don't prefill prefix) so user can type naturally
        this._isInternalValueChange = true;
        picker.value = initialValue ?? '';
        picker.placeholder = initialTab.placeholder;
        this._isInternalValueChange = false;
        // Start providing items for initial tab
        this._activateProvider(initialTab, picker);
        // Handle value changes - detect prefix changes to switch tabs
        this._currentDisposables.add(picker.onDidChangeValue(value => {
            if (this._isInternalValueChange) {
                return;
            }
            // Check if user removed the shortcut character (including when input is emptied) - switch back to Files
            if (this._arrivedViaShortcut) {
                const shortcut = this._arrivedViaShortcut;
                if (!value.startsWith(shortcut)) {
                    const filesTab = this._tabs.find(t => t.id === 'files');
                    if (filesTab && filesTab !== this._currentTab) {
                        this._arrivedViaShortcut = undefined;
                        this._switchTab(filesTab, picker, false);
                        return;
                    }
                }
            }
            const matchingTab = this._detectTabFromValue(value);
            if (matchingTab && matchingTab !== this._currentTab) {
                this._switchTab(matchingTab, picker, true);
            }
            // Update send button state based on input
            this._updateSendButtonState(value);
            // Debounce send-to-agent check to let provider finish
            if (this._sendToAgentTimeout) {
                clearTimeout(this._sendToAgentTimeout);
            }
            this._sendToAgentTimeout = setTimeout(() => this._maybeShowSendToAgent(picker), 150);
        }));
        // Handle accept - send to agent if no real items or send-to-agent is selected
        this._currentDisposables.add(picker.onDidAccept(() => {
            const selectedItems = picker.selectedItems;
            const activeItems = picker.activeItems;
            // Check if send-to-agent item is selected
            const sendToAgentSelected = selectedItems.length > 0 &&
                selectedItems[0].id === SEND_TO_AGENT_ID;
            // Check if there are any real items active (not send-to-agent)
            const hasRealActiveItem = activeItems.some(item => item.id !== SEND_TO_AGENT_ID);
            // Get the filter text (without prefix or shortcut character)
            let filterText;
            if (this._arrivedViaShortcut && picker.value.startsWith(this._arrivedViaShortcut)) {
                filterText = picker.value.substring(1).trim();
            }
            else if (this._currentTab) {
                filterText = picker.value.substring(this._currentTab.prefix.length).trim();
            }
            else {
                filterText = picker.value.trim();
            }
            // Send to agent if:
            // 1. Send-to-agent item is explicitly selected, OR
            // 2. No real items are active AND user has typed something
            if (sendToAgentSelected || (!hasRealActiveItem && filterText)) {
                this._sendMessage(picker.value);
            }
        }));
        // Handle hide
        this._currentDisposables.add(picker.onDidHide(() => {
            this._providerDisposables.clear();
            this._providerCts?.cancel();
            this._providerCts = undefined;
            this._currentPicker = undefined;
            this._currentTab = undefined;
            this._arrivedViaShortcut = undefined;
            // Clear any pending timeout
            if (this._sendToAgentTimeout) {
                clearTimeout(this._sendToAgentTimeout);
                this._sendToAgentTimeout = undefined;
            }
            // Remove the injected tab bar from DOM
            this._tabBarContainer?.remove();
            this._tabBarContainer = undefined;
            // Clear button references
            this._sendButton = undefined;
            this._sendButtonLabel = undefined;
            this._sendButtonIcon = undefined;
            this._sendButtonHover = undefined;
            this._currentDisposables.clear();
        }));
        // Show picker
        picker.show();
    }
    /**
     * Hide the unified quick access widget if visible.
     */
    hide() {
        this._currentPicker?.hide();
    }
    /**
     * Check if the widget is currently visible.
     */
    get isVisible() {
        return !!this._currentPicker;
    }
    /**
     * Inject the custom tab bar into the picker's header area.
     */
    _injectTabBar(picker) {
        // Wait for picker to be shown to access DOM
        const showDisposable = this._currentDisposables.add(Event.once(this.quickInputService.onShow)(() => {
            this._currentDisposables.delete(showDisposable);
            // Find the quick input widget container via layout service
            // eslint-disable-next-line no-restricted-syntax
            const quickInputWidget = this.layoutService.activeContainer.querySelector('.quick-input-widget');
            if (!quickInputWidget) {
                return;
            }
            // Find the header element (contains input box) and list element
            // eslint-disable-next-line no-restricted-syntax
            const header = quickInputWidget.querySelector('.quick-input-header');
            // eslint-disable-next-line no-restricted-syntax
            const list = quickInputWidget.querySelector('.quick-input-list');
            if (!header || !list) {
                return;
            }
            // Create tab bar container
            const tabBarContainer = $('div.unified-quick-access-tabs');
            this._tabBarContainer = tabBarContainer;
            // Create Radio widget for tabs
            const hoverDelegate = this._currentDisposables.add(createInstantHoverDelegate());
            const radioItems = this._tabs.map(tab => ({
                text: tab.label,
                tooltip: tab.tooltip,
                isActive: tab === this._currentTab,
            }));
            const radio = this._currentDisposables.add(new Radio({
                items: radioItems,
                hoverDelegate,
            }));
            tabBarContainer.appendChild(radio.domNode);
            // Handle tab selection
            this._currentDisposables.add(radio.onDidSelect(index => {
                const selectedTab = this._tabs[index];
                if (selectedTab && selectedTab !== this._currentTab) {
                    this._switchTab(selectedTab, picker, false);
                }
            }));
            // Create send button (far right)
            const sendButton = this._createSendButton(picker);
            tabBarContainer.appendChild(sendButton);
            // Insert tab bar between the header (input box) and the list (results)
            list.parentElement?.insertBefore(tabBarContainer, list);
            // Store reference to radio for updates
            picker._unifiedRadio = radio;
        }));
    }
    /**
     * Create the send button.
     */
    _createSendButton(picker) {
        const container = $('div.unified-quick-access-send-container');
        // Create send button
        const button = $('button.unified-send-button');
        button.setAttribute('type', 'button');
        this._sendButton = button;
        const icon = renderIcon(Codicon.send);
        icon.classList.add('unified-send-icon');
        this._sendButtonIcon = icon;
        button.appendChild(icon);
        const labelSpan = $('span.unified-send-label');
        this._sendButtonLabel = labelSpan;
        button.appendChild(labelSpan);
        container.appendChild(button);
        // Set up managed hover for the button
        this._sendButtonHover = this._currentDisposables.add(this.hoverService.setupManagedHover(getDefaultHoverDelegate('mouse'), button, ''));
        // Initialize button state
        this._updateSendButtonState(picker.value);
        // Click handler - behavior depends on input state
        this._currentDisposables.add(addDisposableListener(button, EventType.CLICK, (e) => {
            e.preventDefault();
            e.stopPropagation();
            const hasInput = picker.value.trim().length > 0;
            if (hasInput) {
                this._sendMessageRaw(picker.value);
            }
            else {
                this._openChat();
            }
        }));
        return container;
    }
    /**
     * Update the send button label and tooltip based on input state.
     */
    _updateSendButtonState(value) {
        if (!this._sendButton || !this._sendButtonLabel || !this._sendButtonIcon) {
            return;
        }
        const hasInput = value.trim().length > 0;
        if (hasInput) {
            // Show "Send" with no keybinding in tooltip (Enter is implied by quick pick)
            this._sendButtonLabel.textContent = localize(6332, null);
            this._sendButtonHover?.update(localize(6333, null));
            this._sendButtonIcon.style.display = '';
        }
        else {
            // Show "Open Chat" with open chat keybinding and hide icon
            const openChatKeybinding = this.keybindingService.lookupKeybinding(CHAT_OPEN_ACTION_ID);
            const openChatLabel = openChatKeybinding?.getLabel() ?? '';
            this._sendButtonLabel.textContent = localize(6334, null);
            const tooltip = openChatLabel
                ? localize(6335, null, openChatLabel)
                : localize(6336, null);
            this._sendButtonHover?.update(tooltip);
            this._sendButtonIcon.style.display = 'none';
        }
    }
    /**
     * Open chat without sending a message.
     */
    _openChat() {
        this.hide();
        this.commandService.executeCommand(CHAT_OPEN_ACTION_ID);
    }
    /**
     * Send the exact message to a new agent session (no prefix stripping).
     */
    async _sendMessageRaw(value) {
        const message = value.trim();
        if (!message) {
            return;
        }
        // Hide the picker first
        this.hide();
        // Always create a new chat first
        await this.commandService.executeCommand(ACTION_ID_NEW_CHAT);
        // Then send the message to the new chat
        const options = {
            query: message,
            isPartialQuery: false,
        };
        this.commandService.executeCommand(CHAT_OPEN_ACTION_ID, options);
    }
    /**
     * Send the current message to a new agent session (strips prefix or shortcut character).
     */
    async _sendMessage(value) {
        // Strip any prefix or shortcut character from the value
        let message = value;
        // First, strip shortcut character if we arrived via shortcut
        if (this._arrivedViaShortcut && message.startsWith(this._arrivedViaShortcut)) {
            message = message.substring(1).trim();
        }
        else if (this._currentTab) {
            // Otherwise strip the normal prefix
            if (value.startsWith(this._currentTab.prefix)) {
                message = value.substring(this._currentTab.prefix.length).trim();
            }
        }
        if (!message) {
            return;
        }
        // Hide the picker first
        this.hide();
        // Always create a new chat first
        await this.commandService.executeCommand(ACTION_ID_NEW_CHAT);
        // Then send the message to the new chat
        const options = {
            query: message,
            isPartialQuery: false,
        };
        this.commandService.executeCommand(CHAT_OPEN_ACTION_ID, options);
    }
    /**
     * Check if we should show the "send to agent" item.
     * Always shows it as the first item when user has typed something.
     */
    _maybeShowSendToAgent(picker) {
        // Guard against recursive calls
        if (this._isUpdatingSendToAgent) {
            return;
        }
        // Get the filter text (without prefix or shortcut character)
        let filterText;
        if (this._arrivedViaShortcut && picker.value.startsWith(this._arrivedViaShortcut)) {
            // Strip shortcut character
            filterText = picker.value.substring(1).trim();
        }
        else if (this._currentTab) {
            filterText = picker.value.substring(this._currentTab.prefix.length).trim();
        }
        else {
            filterText = picker.value.trim();
        }
        // Use full input if filter text is empty but there's input (user typed without prefix)
        const fullInput = picker.value.trim();
        const messageToSend = filterText || fullInput;
        // Only show if user has typed something
        if (!messageToSend) {
            return;
        }
        // Don't show if picker is still loading
        if (picker.busy) {
            return;
        }
        // Check if send-to-agent is already the first item with same description
        const firstItem = picker.items[0];
        if (firstItem?.id === SEND_TO_AGENT_ID && firstItem.description === fullInput) {
            return; // Already showing correct send-to-agent item
        }
        // Create the send-to-agent item
        const sendItem = {
            id: SEND_TO_AGENT_ID,
            label: `$(send) ${localize(6337, null)}`,
            description: fullInput,
            alwaysShow: true,
            ariaLabel: localize(6338, null, fullInput),
        };
        // Get current items, excluding any existing send-to-agent item
        const currentItems = picker.items.filter(item => item.id !== SEND_TO_AGENT_ID);
        // Determine if we should show send-to-agent as first item:
        // - Always on Sessions tab (agent sessions)
        // - Only if no other items exist on Commands/Files tabs
        const isSessionsTab = this._currentTab?.id === 'agentSessions';
        const hasOtherItems = currentItems.length > 0;
        const showFirst = isSessionsTab || !hasOtherItems;
        // Set guard and update items
        this._isUpdatingSendToAgent = true;
        try {
            if (showFirst) {
                picker.items = [sendItem, ...currentItems];
            }
            else {
                // Don't show send-to-agent on Commands/Files when there are matches
                picker.items = currentItems;
            }
        }
        finally {
            this._isUpdatingSendToAgent = false;
        }
    }
    /**
     * Switch to a different tab.
     */
    _switchTab(tab, picker, preserveFilterText) {
        if (tab === this._currentTab) {
            return;
        }
        const previousTab = this._currentTab;
        this._currentTab = tab;
        // Update Radio selection
        const radio = picker._unifiedRadio;
        if (radio) {
            const index = this._tabs.indexOf(tab);
            if (index >= 0) {
                radio.setActiveItem(index);
            }
        }
        // Update picker value (with flag to prevent recursive tab detection)
        this._isInternalValueChange = true;
        if (preserveFilterText && previousTab) {
            // User typed a shortcut prefix - normalize the value to show just the shortcut character
            const currentValue = picker.value;
            // Strip previous tab's prefix if present
            let filterText = currentValue;
            if (currentValue.startsWith(previousTab.prefix)) {
                filterText = currentValue.substring(previousTab.prefix.length);
            }
            // Handle shortcut transitions - ensure only one shortcut char is shown
            if (this._arrivedViaShortcut === '<' && tab.id === 'agentSessions') {
                // Strip any leading "<" chars and set just one
                filterText = filterText.replace(/^<+/, '');
                picker.value = '<' + filterText;
            }
            else if (this._arrivedViaShortcut === '>' && tab.id === 'commands') {
                // Strip any leading ">" chars and set just one
                filterText = filterText.replace(/^>+/, '');
                picker.value = '>' + filterText;
            }
            else {
                // Normal prefix-based switching
                picker.value = tab.prefix + filterText;
            }
        }
        else if (previousTab) {
            // User clicked tab - keep current text but strip old prefix (don't add new prefix)
            const currentValue = picker.value;
            if (currentValue.startsWith(previousTab.prefix)) {
                picker.value = currentValue.substring(previousTab.prefix.length);
            }
            // Also strip shortcut character if present
            if (picker.value.startsWith('<') || picker.value.startsWith('>')) {
                picker.value = picker.value.substring(1);
            }
            // Clear shortcut tracking when switching via click
            this._arrivedViaShortcut = undefined;
        }
        // else: first tab activation, value already set
        this._isInternalValueChange = false;
        picker.placeholder = tab.placeholder;
        // Re-activate provider
        this._activateProvider(tab, picker);
    }
    /**
     * Detect which tab matches the current value based on prefix.
     * Only switches away from current tab if user explicitly typed a different prefix.
     * Supports shortcut keys: ">" for Commands, "<" for Sessions.
     */
    _detectTabFromValue(value) {
        // Check for "<" shortcut to switch to Sessions (from Files or Commands)
        if (value === '<' || value.startsWith('<')) {
            const sessionsTab = this._tabs.find(t => t.id === 'agentSessions');
            if (sessionsTab && this._currentTab?.id !== 'agentSessions') {
                this._arrivedViaShortcut = '<';
                return sessionsTab;
            }
        }
        // Check for ">" shortcut to switch to Commands (from Files or Sessions)
        if (value === '>' || value.startsWith('>')) {
            const commandsTab = this._tabs.find(t => t.id === 'commands');
            if (commandsTab && this._currentTab?.id !== 'commands') {
                this._arrivedViaShortcut = '>';
                return commandsTab;
            }
        }
        // Don't auto-switch if current tab matches (user is just typing)
        if (this._currentTab && value.startsWith(this._currentTab.prefix)) {
            return this._currentTab;
        }
        // Sort by prefix length descending to match most specific first
        // Skip empty prefix - it would match everything
        const sortedTabs = [...this._tabs]
            .filter(tab => tab.prefix.length > 0)
            .sort((a, b) => b.prefix.length - a.prefix.length);
        return sortedTabs.find(tab => value.startsWith(tab.prefix));
    }
    /**
     * Activate the provider for a given tab.
     */
    _activateProvider(tab, picker) {
        // Clear previous provider resources
        this._providerDisposables.clear();
        this._providerCts?.cancel();
        this._providerCts = new CancellationTokenSource();
        this._providerDisposables.add(this._providerCts);
        // Special handling for Send tab - no provider needed
        if (tab.isSendTab) {
            picker.busy = false;
            picker.items = [{
                    label: localize(6339, null),
                    alwaysShow: true,
                }];
            return;
        }
        // Clear items while loading
        picker.items = [];
        picker.busy = true;
        // Get provider for this tab's prefix
        const [provider] = this._getOrInstantiateProvider(tab.prefix);
        if (provider) {
            // Configure filtering - strip the tab's prefix or shortcut character from the filter value
            const tabPrefix = tab.prefix;
            const arrivedViaShortcut = this._arrivedViaShortcut;
            picker.filterValue = (value) => {
                // If arrived via shortcut, strip the shortcut character
                if (arrivedViaShortcut && value.startsWith(arrivedViaShortcut)) {
                    return value.substring(1);
                }
                // Otherwise strip the normal prefix
                if (value.startsWith(tabPrefix)) {
                    return value.substring(tabPrefix.length);
                }
                return value;
            };
            // Let provider populate the picker
            const providerDisposable = provider.provide(picker, this._providerCts.token);
            this._providerDisposables.add(providerDisposable);
        }
        else {
            picker.busy = false;
            picker.items = [{
                    label: localize(6340, null),
                    alwaysShow: true,
                }];
        }
    }
    /**
     * Get or create a provider instance for the given prefix.
     */
    _getOrInstantiateProvider(prefix) {
        // Try to find provider by exact prefix match first
        const providerDescriptor = this.registry.getQuickAccessProvider(prefix, this.contextKeyService);
        if (!providerDescriptor) {
            return [undefined, undefined];
        }
        let provider = this.mapProviderToDescriptor.get(providerDescriptor);
        if (!provider) {
            provider = this.instantiationService.createInstance(providerDescriptor.ctor);
            this.mapProviderToDescriptor.set(providerDescriptor, provider);
        }
        return [provider, providerDescriptor];
    }
    dispose() {
        this._providerCts?.cancel();
        for (const provider of this.mapProviderToDescriptor.values()) {
            if (isDisposable(provider)) {
                provider.dispose();
            }
        }
        super.dispose();
    }
};
UnifiedQuickAccess = __decorate([
    __param(1, IQuickInputService),
    __param(2, IInstantiationService),
    __param(3, IContextKeyService),
    __param(4, ILayoutService),
    __param(5, ICommandService),
    __param(6, IKeybindingService),
    __param(7, IHoverService)
], UnifiedQuickAccess);
export { UnifiedQuickAccess };
//# sourceMappingURL=unifiedQuickAccess.js.map