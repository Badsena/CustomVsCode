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
import { localize, localize2 } from '../../../../../nls.js';
import { $ } from '../../../../../base/browser/dom.js';
import { CancellationTokenSource } from '../../../../../base/common/cancellation.js';
import { IContextKeyService, ContextKeyExpr, RawContextKey } from '../../../../../platform/contextkey/common/contextkey.js';
import { Action2, registerAction2, MenuId } from '../../../../../platform/actions/common/actions.js';
import { IInstantiationService } from '../../../../../platform/instantiation/common/instantiation.js';
import { IEditorService } from '../../../../services/editor/common/editorService.js';
import { Codicon } from '../../../../../base/common/codicons.js';
import { ThemeIcon } from '../../../../../base/common/themables.js';
import { toDisposable } from '../../../../../base/common/lifecycle.js';
import { Event } from '../../../../../base/common/event.js';
import { ILogService } from '../../../../../platform/log/common/log.js';
import { IConfigurationService } from '../../../../../platform/configuration/common/configuration.js';
import { ITelemetryService } from '../../../../../platform/telemetry/common/telemetry.js';
import { IBrowserElementsService } from '../../../../services/browserElements/browser/browserElementsService.js';
import { IChatWidgetService } from '../../../chat/browser/chat.js';
import { ChatContextKeys } from '../../../chat/common/actions/chatContextKeys.js';
import { ChatConfiguration } from '../../../chat/common/constants.js';
import { getDisplayNameFromOuterHTML, createElementContextValue } from '../../../../../platform/browserElements/common/browserElements.js';
import { BrowserViewCommandId } from '../../../../../platform/browserView/common/browserView.js';
import { BrowserEditorInput } from '../../common/browserEditorInput.js';
import { Button } from '../../../../../base/browser/ui/button/button.js';
import { WorkbenchHoverDelegate } from '../../../../../platform/hover/browser/hover.js';
import { BrowserEditor, BrowserEditorContribution, CONTEXT_BROWSER_HAS_ERROR, CONTEXT_BROWSER_HAS_URL, CONTEXT_BROWSER_FOCUSED } from '../browserEditor.js';
import { Extensions as ConfigurationExtensions } from '../../../../../platform/configuration/common/configurationRegistry.js';
import { Registry } from '../../../../../platform/registry/common/platform.js';
import { PolicyCategory } from '../../../../../base/common/policy.js';
import { workbenchConfigurationNodeBase } from '../../../../common/configuration.js';
// Register tools
import '../tools/browserTools.contribution.js';
import { BrowserActionCategory } from '../browserViewActions.js';
// Context key expression to check if browser editor is active
const BROWSER_EDITOR_ACTIVE = ContextKeyExpr.equals('activeEditor', BrowserEditorInput.EDITOR_ID);
const BrowserCategory = localize2(5586, "Browser");
export const CONTEXT_BROWSER_ELEMENT_SELECTION_ACTIVE = new RawContextKey('browserElementSelectionActive', false, localize(5577, null));
const canShareBrowserWithAgentContext = ContextKeyExpr.and(ChatContextKeys.enabled, ContextKeyExpr.has(`config.${ChatConfiguration.AgentEnabled}`), ContextKeyExpr.has(`config.workbench.browser.enableChatTools`));
/**
 * Contribution that manages element selection, element attachment to chat,
 * console session lifecycle, console log attachment to chat, and agent sharing.
 */
let BrowserEditorChatIntegration = class BrowserEditorChatIntegration extends BrowserEditorContribution {
    constructor(editor, contextKeyService, instantiationService, telemetryService, logService, browserElementsService, chatWidgetService, configurationService) {
        super(editor);
        this.contextKeyService = contextKeyService;
        this.telemetryService = telemetryService;
        this.logService = logService;
        this.browserElementsService = browserElementsService;
        this.chatWidgetService = chatWidgetService;
        this.configurationService = configurationService;
        this._elementSelectionActiveContext = CONTEXT_BROWSER_ELEMENT_SELECTION_ACTIVE.bindTo(contextKeyService);
        // Build share toggle button
        const hoverDelegate = this._register(instantiationService.createInstance(WorkbenchHoverDelegate, 'element', undefined, { position: { hoverPosition: 3 /* HoverPosition.ABOVE */ } }));
        this._shareButtonContainer = $('.browser-share-toggle-container');
        this._shareButton = this._register(new Button(this._shareButtonContainer, {
            supportIcons: true,
            title: localize(5578, null),
            small: true,
            hoverDelegate
        }));
        this._shareButton.element.classList.add('browser-share-toggle');
        this._shareButton.label = '$(agent)';
        this._register(this._shareButton.onDidClick(() => {
            this._toggleShareWithAgent();
        }));
        // Show share button only when chat is enabled and browser tools are enabled
        const updateShareButtonVisibility = () => {
            this._shareButtonContainer.style.display = contextKeyService.contextMatchesRules(canShareBrowserWithAgentContext) ? '' : 'none';
        };
        updateShareButtonVisibility();
        const agentSharingKeys = new Set(canShareBrowserWithAgentContext.keys());
        this._register(Event.filter(contextKeyService.onDidChangeContext, e => e.affectsSome(agentSharingKeys))(() => {
            updateShareButtonVisibility();
        }));
    }
    get urlBarWidgets() {
        return [{ element: this._shareButtonContainer, order: 100 }];
    }
    subscribeToModel(model, store) {
        // Start console session when a page URL is loaded
        if (model.url) {
            store.add(this._startConsoleSession(model.id));
        }
        else {
            store.add(Event.once(Event.filter(model.onDidNavigate, e => !!e.url))(() => {
                store.add(this._startConsoleSession(model.id));
            }));
        }
        // Manage sharing state
        this._updateSharingState(true);
        store.add(model.onDidChangeSharedWithAgent(() => {
            this._updateSharingState(false);
        }));
        store.add(Event.filter(this.contextKeyService.onDidChangeContext, e => e.affectsSome(new Set(canShareBrowserWithAgentContext.keys())))(() => {
            this._updateSharingState(false);
        }));
    }
    clear() {
        if (this._elementSelectionCts) {
            this._elementSelectionCts.dispose(true);
            this._elementSelectionCts = undefined;
        }
        this._elementSelectionActiveContext.reset();
    }
    // -- Sharing -------------------------------------------------------
    _toggleShareWithAgent() {
        const model = this.editor.model;
        if (!model) {
            return;
        }
        model.setSharedWithAgent(!model.sharedWithAgent);
    }
    _updateSharingState(isInitialState) {
        const model = this.editor.model;
        const sharingEnabled = this.contextKeyService.contextMatchesRules(canShareBrowserWithAgentContext);
        const isShared = sharingEnabled && !!model && model.sharedWithAgent;
        this.editor.browserContainer.classList.toggle('animate', !isInitialState);
        this.editor.browserContainer.classList.toggle('shared', isShared);
        this._shareButton.checked = isShared;
        this._shareButton.label = isShared
            ? localize(5579, null) + ' $(agent)'
            : '$(agent)';
        this._shareButton.setTitle(isShared
            ? localize(5580, null)
            : localize(5581, null));
    }
    // -- Element Selection ----------------------------------------------
    /**
     * Start element selection in the browser view, wait for a user selection, and add it to chat.
     */
    async addElementToChat() {
        // If selection is already active, cancel it
        if (this._elementSelectionCts) {
            this._elementSelectionCts.dispose(true);
            this._elementSelectionCts = undefined;
            this._elementSelectionActiveContext.set(false);
            return;
        }
        // Start new selection
        const cts = new CancellationTokenSource();
        this._elementSelectionCts = cts;
        this._elementSelectionActiveContext.set(true);
        this.telemetryService.publicLog2('integratedBrowser.addElementToChat.start', {});
        try {
            const browserViewId = this.editor.model?.id;
            if (!browserViewId) {
                throw new Error('No browser view ID found');
            }
            // Make the browser the focused view
            this.editor.ensureBrowserFocus();
            const locator = { browserViewId };
            // Start debug session for integrated browser
            await this.browserElementsService.startDebugSession(cts.token, locator);
            // Get the browser container bounds
            const { width, height } = this.editor.browserContainer.getBoundingClientRect();
            // Get element data from user selection
            const elementData = await this.browserElementsService.getElementData({ x: 0, y: 0, width, height }, cts.token, locator);
            if (!elementData) {
                throw new Error('Element data not found');
            }
            const { attachCss, attachImages } = await this._attachElementDataToChat(elementData);
            this.telemetryService.publicLog2('integratedBrowser.addElementToChat.added', {
                attachCss,
                attachImages
            });
        }
        catch (error) {
            if (!cts.token.isCancellationRequested) {
                this.logService.error('BrowserEditor.addElementToChat: Failed to select element', error);
            }
        }
        finally {
            cts.dispose();
            if (this._elementSelectionCts === cts) {
                this._elementSelectionCts = undefined;
                this._elementSelectionActiveContext.set(false);
            }
        }
    }
    /**
     * Accept the currently focused element during element selection and attach it to chat.
     */
    async addFocusedElementToChat() {
        if (!this._elementSelectionCts) {
            return;
        }
        const cts = this._elementSelectionCts;
        const browserViewId = this.editor.model?.id;
        if (!browserViewId) {
            return;
        }
        const locator = { browserViewId };
        const { width, height } = this.editor.browserContainer.getBoundingClientRect();
        const elementData = await this.browserElementsService.getFocusedElementData({ x: 0, y: 0, width, height }, cts.token, locator);
        if (!elementData) {
            return;
        }
        await this._attachElementDataToChat(elementData);
        cts.dispose();
        if (this._elementSelectionCts === cts) {
            this._elementSelectionCts = undefined;
            this._elementSelectionActiveContext.set(false);
        }
    }
    async _attachElementDataToChat(elementData) {
        const bounds = elementData.bounds;
        const toAttach = [];
        const displayName = getDisplayNameFromOuterHTML(elementData.outerHTML);
        const attachCss = this.configurationService.getValue('chat.sendElementsToChat.attachCSS');
        const value = createElementContextValue(elementData, displayName, attachCss);
        toAttach.push({
            id: 'element-' + Date.now(),
            name: displayName,
            fullName: displayName,
            value: value,
            modelDescription: attachCss
                ? 'Structured browser element context with HTML path, attributes, and computed styles.'
                : 'Structured browser element context with HTML path and attributes.',
            kind: 'element',
            icon: ThemeIcon.fromId(Codicon.layout.id),
            ancestors: elementData.ancestors,
            attributes: elementData.attributes,
            computedStyles: attachCss ? elementData.computedStyles : undefined,
            dimensions: elementData.dimensions,
            innerText: elementData.innerText,
        });
        const attachImages = this.configurationService.getValue('chat.sendElementsToChat.attachImages');
        const model = this.editor.model;
        if (attachImages && model) {
            const screenshotBuffer = await model.captureScreenshot({
                quality: 90,
                rect: bounds
            });
            toAttach.push({
                id: 'element-screenshot-' + Date.now(),
                name: 'Element Screenshot',
                fullName: 'Element Screenshot',
                kind: 'image',
                value: screenshotBuffer.buffer
            });
        }
        const widget = await this.chatWidgetService.revealWidget() ?? this.chatWidgetService.lastFocusedWidget;
        widget?.attachmentModel?.addContext(...toAttach);
        return { attachCss, attachImages };
    }
    // -- Console Logs ---------------------------------------------------
    /**
     * Grab the current console logs from the active console session and attach them to chat.
     */
    async addConsoleLogsToChat() {
        const browserViewId = this.editor.model?.id;
        if (!browserViewId) {
            return;
        }
        const locator = { browserViewId };
        try {
            const logs = await this.browserElementsService.getConsoleLogs(locator);
            if (!logs) {
                return;
            }
            const toAttach = [];
            toAttach.push({
                id: 'console-logs-' + Date.now(),
                name: localize(5582, null),
                fullName: localize(5583, null),
                value: logs,
                modelDescription: 'Console logs captured from Integrated Browser.',
                kind: 'element',
                icon: ThemeIcon.fromId(Codicon.terminal.id),
            });
            const widget = await this.chatWidgetService.revealWidget() ?? this.chatWidgetService.lastFocusedWidget;
            widget?.attachmentModel?.addContext(...toAttach);
        }
        catch (error) {
            this.logService.error('BrowserEditor.addConsoleLogsToChat: Failed to get console logs', error);
        }
    }
    _startConsoleSession(browserViewId) {
        const cts = new CancellationTokenSource();
        const locator = { browserViewId };
        this.browserElementsService.startConsoleSession(cts.token, locator).catch(error => {
            if (!cts.token.isCancellationRequested) {
                this.logService.error('BrowserEditor: Failed to start console session', error);
            }
        });
        return toDisposable(() => {
            cts.dispose(true);
        });
    }
};
BrowserEditorChatIntegration = __decorate([
    __param(1, IContextKeyService),
    __param(2, IInstantiationService),
    __param(3, ITelemetryService),
    __param(4, ILogService),
    __param(5, IBrowserElementsService),
    __param(6, IChatWidgetService),
    __param(7, IConfigurationService)
], BrowserEditorChatIntegration);
export { BrowserEditorChatIntegration };
// Register the contribution
BrowserEditor.registerContribution(BrowserEditorChatIntegration);
// -- Actions ------------------------------------------------------------
class AddElementToChatAction extends Action2 {
    static { this.ID = BrowserViewCommandId.AddElementToChat; }
    constructor() {
        const enabled = ContextKeyExpr.and(ChatContextKeys.enabled, ContextKeyExpr.equals('config.chat.sendElementsToChat.enabled', true));
        super({
            id: AddElementToChatAction.ID,
            title: localize2(5587, 'Add Element to Chat'),
            category: BrowserCategory,
            icon: Codicon.inspect,
            f1: true,
            precondition: ContextKeyExpr.and(BROWSER_EDITOR_ACTIVE, CONTEXT_BROWSER_HAS_URL, CONTEXT_BROWSER_HAS_ERROR.negate(), enabled),
            toggled: CONTEXT_BROWSER_ELEMENT_SELECTION_ACTIVE,
            menu: {
                id: MenuId.BrowserActionsToolbar,
                group: 'actions',
                order: 1,
                when: enabled
            },
            keybinding: [{
                    weight: 200 /* KeybindingWeight.WorkbenchContrib */ + 50, // Priority over terminal
                    primary: 2048 /* KeyMod.CtrlCmd */ | 1024 /* KeyMod.Shift */ | 33 /* KeyCode.KeyC */,
                }, {
                    when: CONTEXT_BROWSER_ELEMENT_SELECTION_ACTIVE,
                    weight: 200 /* KeybindingWeight.WorkbenchContrib */,
                    primary: 9 /* KeyCode.Escape */
                }]
        });
    }
    async run(accessor, browserEditor = accessor.get(IEditorService).activeEditorPane) {
        if (browserEditor instanceof BrowserEditor) {
            await browserEditor.getContribution(BrowserEditorChatIntegration)?.addElementToChat();
        }
    }
}
class AddConsoleLogsToChatAction extends Action2 {
    static { this.ID = BrowserViewCommandId.AddConsoleLogsToChat; }
    constructor() {
        const enabled = ContextKeyExpr.and(ChatContextKeys.enabled, ContextKeyExpr.equals('config.chat.sendElementsToChat.enabled', true));
        super({
            id: AddConsoleLogsToChatAction.ID,
            title: localize2(5588, 'Add Console Logs to Chat'),
            category: BrowserActionCategory,
            icon: Codicon.output,
            f1: true,
            precondition: ContextKeyExpr.and(BROWSER_EDITOR_ACTIVE, CONTEXT_BROWSER_HAS_URL, CONTEXT_BROWSER_HAS_ERROR.negate(), enabled),
            menu: {
                id: MenuId.BrowserActionsToolbar,
                group: 'actions',
                order: 2,
                when: enabled
            }
        });
    }
    async run(accessor, browserEditor = accessor.get(IEditorService).activeEditorPane) {
        if (browserEditor instanceof BrowserEditor) {
            await browserEditor.getContribution(BrowserEditorChatIntegration)?.addConsoleLogsToChat();
        }
    }
}
class AddFocusedElementToChatAction extends Action2 {
    constructor() {
        super({
            id: 'workbench.action.browser.addFocusedElementToChat',
            title: localize2(5589, 'Add Focused Element to Chat'),
            category: BrowserActionCategory,
            f1: false,
            precondition: CONTEXT_BROWSER_FOCUSED,
            keybinding: {
                weight: 200 /* KeybindingWeight.WorkbenchContrib */ + 50,
                primary: 3 /* KeyCode.Enter */,
                when: CONTEXT_BROWSER_ELEMENT_SELECTION_ACTIVE
            }
        });
    }
    async run(accessor) {
        const browserEditor = accessor.get(IEditorService).activeEditorPane;
        if (browserEditor instanceof BrowserEditor) {
            await browserEditor.getContribution(BrowserEditorChatIntegration)?.addFocusedElementToChat();
        }
    }
}
registerAction2(AddElementToChatAction);
registerAction2(AddConsoleLogsToChatAction);
registerAction2(AddFocusedElementToChatAction);
Registry.as(ConfigurationExtensions.Configuration).registerConfiguration({
    ...workbenchConfigurationNodeBase,
    properties: {
        'workbench.browser.enableChatTools': {
            type: 'boolean',
            default: false,
            experiment: { mode: 'startup' },
            tags: ['experimental'],
            markdownDescription: localize(5584, null),
            policy: {
                name: 'BrowserChatTools',
                category: PolicyCategory.InteractiveSession,
                minimumVersion: '1.110',
                value: (policyData) => policyData.chat_preview_features_enabled === false ? false : undefined,
                localization: {
                    description: {
                        key: 'browser.enableChatTools',
                        value: localize(5585, null)
                    }
                },
            }
        }
    }
});
//# sourceMappingURL=browserEditorChatFeatures.js.map