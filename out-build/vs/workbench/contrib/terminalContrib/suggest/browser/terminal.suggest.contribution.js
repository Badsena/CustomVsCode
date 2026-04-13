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
var TerminalSuggestContribution_1, TerminalSuggestProvidersConfigurationManager_1;
import * as dom from '../../../../../base/browser/dom.js';
import { Event } from '../../../../../base/common/event.js';
import { DisposableStore, MutableDisposable, toDisposable, Disposable, DisposableMap } from '../../../../../base/common/lifecycle.js';
import { isWindows } from '../../../../../base/common/platform.js';
import { localize2 } from '../../../../../nls.js';
import { IConfigurationService } from '../../../../../platform/configuration/common/configuration.js';
import { ContextKeyExpr, IContextKeyService } from '../../../../../platform/contextkey/common/contextkey.js';
import { IInstantiationService } from '../../../../../platform/instantiation/common/instantiation.js';
import { TerminalLocation } from '../../../../../platform/terminal/common/terminal.js';
import { registerActiveInstanceAction, registerTerminalAction } from '../../../terminal/browser/terminalActions.js';
import { registerTerminalContribution } from '../../../terminal/browser/terminalExtensions.js';
import { TerminalContextKeys } from '../../../terminal/common/terminalContextKey.js';
import { terminalSuggestConfigSection, registerTerminalSuggestProvidersConfiguration } from '../common/terminalSuggestConfiguration.js';
import { ITerminalCompletionService, TerminalCompletionService } from './terminalCompletionService.js';
import { ITerminalContributionService } from '../../../terminal/common/terminalExtensionPoints.js';
import { registerSingleton } from '../../../../../platform/instantiation/common/extensions.js';
import { SuggestAddon } from './terminalSuggestAddon.js';
import { TerminalClipboardContribution } from '../../clipboard/browser/terminal.clipboard.contribution.js';
import { SimpleSuggestContext } from '../../../../services/suggest/browser/simpleSuggestWidget.js';
import { SuggestDetailsClassName } from '../../../../services/suggest/browser/simpleSuggestWidgetDetails.js';
import { EditorContextKeys } from '../../../../../editor/common/editorContextKeys.js';
import { MenuId } from '../../../../../platform/actions/common/actions.js';
import { IPreferencesService } from '../../../../services/preferences/common/preferences.js';
import './terminalSymbolIcons.js';
import { LspCompletionProviderAddon } from './lspCompletionProviderAddon.js';
import { createTerminalLanguageVirtualUri, LspTerminalModelContentProvider } from './lspTerminalModelContentProvider.js';
import { ITextModelService } from '../../../../../editor/common/services/resolverService.js';
import { ILanguageFeaturesService } from '../../../../../editor/common/services/languageFeatures.js';
import { getTerminalLspSupportedLanguageObj } from './lspTerminalUtil.js';
import { IOpenerService } from '../../../../../platform/opener/common/opener.js';
import { Codicon } from '../../../../../base/common/codicons.js';
registerSingleton(ITerminalCompletionService, TerminalCompletionService, 1 /* InstantiationType.Delayed */);
// #region Terminal Contributions
let TerminalSuggestContribution = class TerminalSuggestContribution extends DisposableStore {
    static { TerminalSuggestContribution_1 = this; }
    static { this.ID = 'terminal.suggest'; }
    static get(instance) {
        return instance.getContribution(TerminalSuggestContribution_1.ID);
    }
    get addon() { return this._addon.value; }
    get lspAddons() { return Array.from(this._lspAddons.values()); }
    constructor(_ctx, _contextKeyService, _configurationService, _instantiationService, _terminalCompletionService, _textModelService, _languageFeaturesService) {
        super();
        this._ctx = _ctx;
        this._contextKeyService = _contextKeyService;
        this._configurationService = _configurationService;
        this._instantiationService = _instantiationService;
        this._terminalCompletionService = _terminalCompletionService;
        this._textModelService = _textModelService;
        this._languageFeaturesService = _languageFeaturesService;
        this._addon = new MutableDisposable();
        this._lspAddons = this.add(new DisposableMap());
        this._lspModelProvider = new MutableDisposable();
        this.add(toDisposable(() => {
            this._addon?.dispose();
            this._lspModelProvider?.value?.dispose();
            this._lspModelProvider?.dispose();
        }));
        this._terminalSuggestWidgetVisibleContextKey = TerminalContextKeys.suggestWidgetVisible.bindTo(this._contextKeyService);
        this.add(this._configurationService.onDidChangeConfiguration(e => {
            if (e.affectsConfiguration("terminal.integrated.suggest.enabled" /* TerminalSuggestSettingId.Enabled */)) {
                const completionsEnabled = this._configurationService.getValue(terminalSuggestConfigSection).enabled;
                if (!completionsEnabled) {
                    this._addon.clear();
                    this._lspAddons.clearAndDisposeAll();
                }
                const xtermRaw = this._ctx.instance.xterm?.raw;
                if (!!xtermRaw && completionsEnabled) {
                    this._loadAddons(xtermRaw);
                }
            }
        }));
        // Initialize the dynamic providers configuration manager
        TerminalSuggestProvidersConfigurationManager.initialize(this._instantiationService);
        // Listen for terminal location changes to update the suggest widget container
        this.add(this._ctx.instance.onDidChangeTarget((target) => {
            this._updateContainerForTarget(target);
        }));
        // The terminal view can be reparented (for example when moved into a new view). Ensure the
        // suggest widget follows the terminal's DOM when focus returns to the instance.
        this.add(this._ctx.instance.onDidFocus(() => {
            const xtermRaw = this._ctx.instance.xterm?.raw;
            if (xtermRaw) {
                this._prepareAddonLayout(xtermRaw);
            }
        }));
    }
    xtermOpen(xterm) {
        const config = this._configurationService.getValue(terminalSuggestConfigSection);
        const enabled = config.enabled;
        if (!enabled) {
            return;
        }
        this._loadAddons(xterm.raw);
        this.add(Event.runAndSubscribe(this._ctx.instance.onDidChangeShellType, async () => {
            this._refreshAddons();
            this._lspModelProvider.value?.shellTypeChanged(this._ctx.instance.shellType);
        }));
    }
    async _loadLspCompletionAddon(xterm) {
        let lspTerminalObj = undefined;
        // TODO: Change to always load after settings update for terminal suggest provider
        if (!this._ctx.instance.shellType || !(lspTerminalObj = getTerminalLspSupportedLanguageObj(this._ctx.instance.shellType))) {
            this._lspAddons.clearAndDisposeAll();
            return;
        }
        const virtualTerminalDocumentUri = createTerminalLanguageVirtualUri(this._ctx.instance.instanceId, lspTerminalObj.extension);
        // Load and register the LSP completion providers (one per language server)
        this._lspModelProvider.value = this._instantiationService.createInstance(LspTerminalModelContentProvider, this._ctx.instance.capabilities, this._ctx.instance.instanceId, virtualTerminalDocumentUri, this._ctx.instance.shellType);
        this.add(this._lspModelProvider.value);
        const textVirtualModel = await this._textModelService.createModelReference(virtualTerminalDocumentUri);
        this.add(textVirtualModel);
        const virtualProviders = this._languageFeaturesService.completionProvider.all(textVirtualModel.object.textEditorModel);
        const filteredProviders = virtualProviders.filter(p => p._debugDisplayName !== 'wordbasedCompletions');
        // Iterate through all available providers
        for (const provider of filteredProviders) {
            const lspCompletionProviderAddon = this._instantiationService.createInstance(LspCompletionProviderAddon, provider, textVirtualModel, this._lspModelProvider.value);
            this._lspAddons.set(provider._debugDisplayName, lspCompletionProviderAddon);
            xterm.loadAddon(lspCompletionProviderAddon);
            this.add(this._terminalCompletionService.registerTerminalCompletionProvider('lsp', lspCompletionProviderAddon.id, lspCompletionProviderAddon, ...(lspCompletionProviderAddon.triggerCharacters ?? [])));
        }
    }
    _loadAddons(xterm) {
        // Don't re-create the addon
        if (this._addon.value) {
            return;
        }
        const addon = this._addon.value = this._instantiationService.createInstance(SuggestAddon, this._ctx.instance.sessionId, this._ctx.instance.shellType, this._ctx.instance.capabilities, this._terminalSuggestWidgetVisibleContextKey);
        xterm.loadAddon(addon);
        this._loadLspCompletionAddon(xterm);
        this._prepareAddonLayout(xterm);
        this.add(dom.addDisposableListener(this._ctx.instance.domElement, dom.EventType.FOCUS_OUT, (e) => {
            const focusedElement = e.relatedTarget;
            if (focusedElement?.classList.contains(SuggestDetailsClassName)) {
                // Don't hide the suggest widget if the focus is moving to the details
                return;
            }
            addon.hideSuggestWidget(true);
        }));
        this.add(addon.onAcceptedCompletion(async (text) => {
            this._ctx.instance.focus();
            this._ctx.instance.sendText(text, false);
        }));
        const clipboardContrib = TerminalClipboardContribution.get(this._ctx.instance);
        this.add(clipboardContrib.onWillPaste(() => addon.isPasting = true));
        this.add(clipboardContrib.onDidPaste(() => {
            // Delay this slightly as synchronizing the prompt input is debounced
            setTimeout(() => addon.isPasting = false, 100);
        }));
        if (!isWindows) {
            let barrier;
            this.add(addon.onDidReceiveCompletions(() => {
                barrier?.open();
                barrier = undefined;
            }));
        }
    }
    _refreshAddons() {
        const addon = this._addon.value;
        if (!addon) {
            return;
        }
        addon.shellType = this._ctx.instance.shellType;
        if (!this._ctx.instance.xterm?.raw) {
            return;
        }
        // Relies on shell type being set
        this._loadLspCompletionAddon(this._ctx.instance.xterm.raw);
    }
    _updateContainerForTarget(target) {
        const addon = this._addon.value;
        if (!addon || !this._ctx.instance.xterm?.raw) {
            return;
        }
        this._prepareAddonLayout(this._ctx.instance.xterm.raw);
    }
    async _prepareAddonLayout(xterm) {
        const addon = this._addon.value;
        if (!addon || this.isDisposed) {
            return;
        }
        const xtermElement = xterm.element ?? await this._waitForXtermElement(xterm);
        if (!xtermElement || this.isDisposed || addon !== this._addon.value) {
            return;
        }
        const container = this._resolveAddonContainer(xtermElement);
        addon.setContainerWithOverflow(container);
        // eslint-disable-next-line no-restricted-syntax
        const screenElement = xtermElement?.querySelector('.xterm-screen');
        if (dom.isHTMLElement(screenElement)) {
            addon.setScreen(screenElement);
        }
    }
    async _waitForXtermElement(xterm) {
        if (xterm.element) {
            return xterm.element;
        }
        await Promise.race([
            Event.toPromise(Event.filter(this._ctx.instance.onDidChangeVisibility, visible => visible)),
            Event.toPromise(this._ctx.instance.onDisposed)
        ]);
        if (this.isDisposed || this._ctx.instance.isDisposed) {
            return undefined;
        }
        return xterm.element ?? undefined;
    }
    _resolveAddonContainer(xtermElement) {
        if (this._ctx.instance.target === TerminalLocation.Editor) {
            return xtermElement;
        }
        return dom.findParentWithClass(xtermElement, 'panel') ?? xtermElement;
    }
};
TerminalSuggestContribution = TerminalSuggestContribution_1 = __decorate([
    __param(1, IContextKeyService),
    __param(2, IConfigurationService),
    __param(3, IInstantiationService),
    __param(4, ITerminalCompletionService),
    __param(5, ITextModelService),
    __param(6, ILanguageFeaturesService)
], TerminalSuggestContribution);
registerTerminalContribution(TerminalSuggestContribution.ID, TerminalSuggestContribution);
// #endregion
// #region Actions
registerTerminalAction({
    id: "workbench.action.terminal.changeSelectionModeNever" /* TerminalSuggestCommandId.ChangeSelectionModeNever */,
    title: localize2(16221, 'Selection Mode: None'),
    tooltip: localize2(16222, 'Do not select the top suggestion until down is pressed, at which point Tab or Enter will accept the suggestion. Activate to change.'),
    f1: false,
    precondition: ContextKeyExpr.and(ContextKeyExpr.or(TerminalContextKeys.processSupported, TerminalContextKeys.terminalHasBeenCreated), TerminalContextKeys.focus, TerminalContextKeys.isOpen, TerminalContextKeys.suggestWidgetVisible, ContextKeyExpr.equals(`config.${"terminal.integrated.suggest.selectionMode" /* TerminalSuggestSettingId.SelectionMode */}`, 'never')),
    menu: {
        id: MenuId.MenubarTerminalSuggestStatusMenu,
        group: 'left',
        order: 1,
        when: ContextKeyExpr.and(ContextKeyExpr.equals(`config.${"terminal.integrated.suggest.selectionMode" /* TerminalSuggestSettingId.SelectionMode */}`, 'never'), ContextKeyExpr.or(ContextKeyExpr.equals(`config.${"terminal.integrated.suggest.quickSuggestions" /* TerminalSuggestSettingId.QuickSuggestions */}`, true), ContextKeyExpr.equals(`config.${"terminal.integrated.suggest.suggestOnTriggerCharacters" /* TerminalSuggestSettingId.SuggestOnTriggerCharacters */}`, true)))
    },
    run: (c, accessor) => {
        accessor.get(IConfigurationService).updateValue("terminal.integrated.suggest.selectionMode" /* TerminalSuggestSettingId.SelectionMode */, 'partial');
    }
});
registerTerminalAction({
    id: "workbench.action.terminal.changeSelectionModePartial" /* TerminalSuggestCommandId.ChangeSelectionModePartial */,
    title: localize2(16223, 'Selection Mode: Partial (Tab)'),
    tooltip: localize2(16224, 'Partially select the top suggestion, Tab will accept a suggestion when visible. Activate to change.'),
    f1: false,
    precondition: ContextKeyExpr.and(ContextKeyExpr.or(TerminalContextKeys.processSupported, TerminalContextKeys.terminalHasBeenCreated), TerminalContextKeys.focus, TerminalContextKeys.isOpen, TerminalContextKeys.suggestWidgetVisible, ContextKeyExpr.equals(`config.${"terminal.integrated.suggest.selectionMode" /* TerminalSuggestSettingId.SelectionMode */}`, 'partial')),
    menu: {
        id: MenuId.MenubarTerminalSuggestStatusMenu,
        group: 'left',
        order: 1,
        when: ContextKeyExpr.and(ContextKeyExpr.equals(`config.${"terminal.integrated.suggest.selectionMode" /* TerminalSuggestSettingId.SelectionMode */}`, 'partial'), ContextKeyExpr.or(ContextKeyExpr.equals(`config.${"terminal.integrated.suggest.quickSuggestions" /* TerminalSuggestSettingId.QuickSuggestions */}`, true), ContextKeyExpr.equals(`config.${"terminal.integrated.suggest.suggestOnTriggerCharacters" /* TerminalSuggestSettingId.SuggestOnTriggerCharacters */}`, true)))
    },
    run: (c, accessor) => {
        accessor.get(IConfigurationService).updateValue("terminal.integrated.suggest.selectionMode" /* TerminalSuggestSettingId.SelectionMode */, 'always');
    }
});
registerTerminalAction({
    id: "workbench.action.terminal.changeSelectionModeAlways" /* TerminalSuggestCommandId.ChangeSelectionModeAlways */,
    title: localize2(16225, 'Selection Mode: Always (Tab or Enter)'),
    tooltip: localize2(16226, 'Always select the top suggestion, Tab or Enter will accept a suggestion when visible. Activate to change.'),
    f1: false,
    precondition: ContextKeyExpr.and(ContextKeyExpr.or(TerminalContextKeys.processSupported, TerminalContextKeys.terminalHasBeenCreated), TerminalContextKeys.focus, TerminalContextKeys.isOpen, TerminalContextKeys.suggestWidgetVisible),
    menu: {
        id: MenuId.MenubarTerminalSuggestStatusMenu,
        group: 'left',
        order: 1,
        when: ContextKeyExpr.and(ContextKeyExpr.equals(`config.${"terminal.integrated.suggest.selectionMode" /* TerminalSuggestSettingId.SelectionMode */}`, 'always'), ContextKeyExpr.or(ContextKeyExpr.equals(`config.${"terminal.integrated.suggest.quickSuggestions" /* TerminalSuggestSettingId.QuickSuggestions */}`, true), ContextKeyExpr.equals(`config.${"terminal.integrated.suggest.suggestOnTriggerCharacters" /* TerminalSuggestSettingId.SuggestOnTriggerCharacters */}`, true)))
    },
    run: (c, accessor) => {
        accessor.get(IConfigurationService).updateValue("terminal.integrated.suggest.selectionMode" /* TerminalSuggestSettingId.SelectionMode */, 'never');
    }
});
registerTerminalAction({
    id: "workbench.action.terminal.doNotShowSuggestOnType" /* TerminalSuggestCommandId.DoNotShowOnType */,
    title: localize2(16227, 'Don\'t show IntelliSense unless triggered explicitly. This disables the quick suggestions and suggest on trigger characters settings.'),
    f1: false,
    precondition: ContextKeyExpr.and(ContextKeyExpr.or(TerminalContextKeys.processSupported, TerminalContextKeys.terminalHasBeenCreated), TerminalContextKeys.focus, TerminalContextKeys.isOpen, TerminalContextKeys.suggestWidgetVisible),
    icon: Codicon.eye,
    menu: {
        id: MenuId.MenubarTerminalSuggestStatusMenu,
        group: 'right',
        order: 1,
        when: ContextKeyExpr.and(ContextKeyExpr.or(ContextKeyExpr.equals(`config.${"terminal.integrated.suggest.quickSuggestions" /* TerminalSuggestSettingId.QuickSuggestions */}.commands`, 'on'), ContextKeyExpr.equals(`config.${"terminal.integrated.suggest.quickSuggestions" /* TerminalSuggestSettingId.QuickSuggestions */}.arguments`, 'on')), ContextKeyExpr.equals(`config.${"terminal.integrated.suggest.suggestOnTriggerCharacters" /* TerminalSuggestSettingId.SuggestOnTriggerCharacters */}`, true)),
    },
    run: (c, accessor) => {
        accessor.get(IConfigurationService).updateValue("terminal.integrated.suggest.quickSuggestions" /* TerminalSuggestSettingId.QuickSuggestions */, { commands: 'off', arguments: 'off', unknown: 'off' });
        accessor.get(IConfigurationService).updateValue("terminal.integrated.suggest.suggestOnTriggerCharacters" /* TerminalSuggestSettingId.SuggestOnTriggerCharacters */, false);
    }
});
registerTerminalAction({
    id: "workbench.action.terminal.showSuggestOnType" /* TerminalSuggestCommandId.ShowOnType */,
    title: localize2(16228, 'Show IntelliSense while typing. This enables the quick suggestions for commands and arguments, and suggest on trigger characters settings.'),
    f1: false,
    precondition: ContextKeyExpr.and(ContextKeyExpr.or(TerminalContextKeys.processSupported, TerminalContextKeys.terminalHasBeenCreated), TerminalContextKeys.focus, TerminalContextKeys.isOpen, TerminalContextKeys.suggestWidgetVisible),
    icon: Codicon.eyeClosed,
    menu: {
        id: MenuId.MenubarTerminalSuggestStatusMenu,
        group: 'right',
        order: 1,
        when: ContextKeyExpr.or(ContextKeyExpr.and(ContextKeyExpr.equals(`config.${"terminal.integrated.suggest.quickSuggestions" /* TerminalSuggestSettingId.QuickSuggestions */}.commands`, 'off'), ContextKeyExpr.equals(`config.${"terminal.integrated.suggest.quickSuggestions" /* TerminalSuggestSettingId.QuickSuggestions */}.arguments`, 'off')), ContextKeyExpr.equals(`config.${"terminal.integrated.suggest.suggestOnTriggerCharacters" /* TerminalSuggestSettingId.SuggestOnTriggerCharacters */}`, false)),
    },
    run: (c, accessor) => {
        accessor.get(IConfigurationService).updateValue("terminal.integrated.suggest.quickSuggestions" /* TerminalSuggestSettingId.QuickSuggestions */, { commands: 'on', arguments: 'on', unknown: 'off' });
        accessor.get(IConfigurationService).updateValue("terminal.integrated.suggest.suggestOnTriggerCharacters" /* TerminalSuggestSettingId.SuggestOnTriggerCharacters */, true);
    }
});
registerTerminalAction({
    id: "workbench.action.terminal.suggestLearnMore" /* TerminalSuggestCommandId.LearnMore */,
    title: localize2(16229, 'Learn More'),
    f1: false,
    precondition: ContextKeyExpr.and(ContextKeyExpr.or(TerminalContextKeys.processSupported, TerminalContextKeys.terminalHasBeenCreated), TerminalContextKeys.focus, TerminalContextKeys.isOpen, TerminalContextKeys.suggestWidgetVisible),
    icon: Codicon.question,
    menu: {
        id: MenuId.MenubarTerminalSuggestStatusMenu,
        group: 'right',
        order: 2
    },
    run: (c, accessor) => {
        // (accessor.get(IOpenerService)).open('https://aka.ms/vscode-terminal-intellisense'); // Neutralized Microsoft link
        (accessor.get(IOpenerService)).open('https://amypocoder.com/docs/terminal-intellisense');
    }
});
registerTerminalAction({
    id: "workbench.action.terminal.configureSuggestSettings" /* TerminalSuggestCommandId.ConfigureSettings */,
    title: localize2(16230, 'Configure'),
    f1: false,
    precondition: ContextKeyExpr.and(ContextKeyExpr.or(TerminalContextKeys.processSupported, TerminalContextKeys.terminalHasBeenCreated), TerminalContextKeys.focus, TerminalContextKeys.isOpen, TerminalContextKeys.suggestWidgetVisible),
    icon: Codicon.gear,
    menu: {
        id: MenuId.MenubarTerminalSuggestStatusMenu,
        group: 'right',
        order: 3
    },
    run: (c, accessor) => accessor.get(IPreferencesService).openSettings({ query: terminalSuggestConfigSection })
});
registerActiveInstanceAction({
    id: "workbench.action.terminal.triggerSuggest" /* TerminalSuggestCommandId.TriggerSuggest */,
    title: localize2(16231, 'Trigger Suggest'),
    f1: false,
    keybinding: {
        primary: 2048 /* KeyMod.CtrlCmd */ | 10 /* KeyCode.Space */,
        mac: { primary: 256 /* KeyMod.WinCtrl */ | 10 /* KeyCode.Space */ },
        weight: 200 /* KeybindingWeight.WorkbenchContrib */ + 1,
        when: ContextKeyExpr.and(TerminalContextKeys.focus, TerminalContextKeys.suggestWidgetVisible.negate(), ContextKeyExpr.equals(`config.${"terminal.integrated.suggest.enabled" /* TerminalSuggestSettingId.Enabled */}`, true))
    },
    run: (activeInstance) => TerminalSuggestContribution.get(activeInstance)?.addon?.requestCompletions(true)
});
registerActiveInstanceAction({
    id: "workbench.action.terminal.resetSuggestWidgetSize" /* TerminalSuggestCommandId.ResetWidgetSize */,
    title: localize2(16232, 'Reset Suggest Widget Size'),
    run: (activeInstance) => TerminalSuggestContribution.get(activeInstance)?.addon?.resetWidgetSize()
});
registerActiveInstanceAction({
    id: "workbench.action.terminal.selectPrevSuggestion" /* TerminalSuggestCommandId.SelectPrevSuggestion */,
    title: localize2(16233, 'Select the Previous Suggestion'),
    f1: false,
    precondition: ContextKeyExpr.and(ContextKeyExpr.or(TerminalContextKeys.processSupported, TerminalContextKeys.terminalHasBeenCreated), TerminalContextKeys.focus, TerminalContextKeys.isOpen, TerminalContextKeys.suggestWidgetVisible),
    keybinding: {
        // Up is bound to other workbench keybindings that this needs to beat
        primary: 16 /* KeyCode.UpArrow */,
        weight: 200 /* KeybindingWeight.WorkbenchContrib */ + 1,
        when: ContextKeyExpr.or(SimpleSuggestContext.HasNavigated, ContextKeyExpr.equals(`config.${"terminal.integrated.suggest.upArrowNavigatesHistory" /* TerminalSuggestSettingId.UpArrowNavigatesHistory */}`, false))
    },
    run: (activeInstance) => TerminalSuggestContribution.get(activeInstance)?.addon?.selectPreviousSuggestion()
});
registerActiveInstanceAction({
    id: "workbench.action.terminal.selectPrevPageSuggestion" /* TerminalSuggestCommandId.SelectPrevPageSuggestion */,
    title: localize2(16234, 'Select the Previous Page Suggestion'),
    f1: false,
    precondition: ContextKeyExpr.and(ContextKeyExpr.or(TerminalContextKeys.processSupported, TerminalContextKeys.terminalHasBeenCreated), TerminalContextKeys.focus, TerminalContextKeys.isOpen, TerminalContextKeys.suggestWidgetVisible),
    keybinding: {
        // Up is bound to other workbench keybindings that this needs to beat
        primary: 11 /* KeyCode.PageUp */,
        weight: 200 /* KeybindingWeight.WorkbenchContrib */ + 1
    },
    run: (activeInstance) => TerminalSuggestContribution.get(activeInstance)?.addon?.selectPreviousPageSuggestion()
});
registerActiveInstanceAction({
    id: "workbench.action.terminal.selectNextSuggestion" /* TerminalSuggestCommandId.SelectNextSuggestion */,
    title: localize2(16235, 'Select the Next Suggestion'),
    f1: false,
    precondition: ContextKeyExpr.and(ContextKeyExpr.or(TerminalContextKeys.processSupported, TerminalContextKeys.terminalHasBeenCreated), TerminalContextKeys.focus, TerminalContextKeys.isOpen, TerminalContextKeys.suggestWidgetVisible),
    keybinding: {
        // Down is bound to other workbench keybindings that this needs to beat
        primary: 18 /* KeyCode.DownArrow */,
        weight: 200 /* KeybindingWeight.WorkbenchContrib */ + 1
    },
    run: (activeInstance) => TerminalSuggestContribution.get(activeInstance)?.addon?.selectNextSuggestion()
});
registerActiveInstanceAction({
    id: 'terminalSuggestToggleExplainMode',
    title: localize2(16236, 'Suggest Toggle Explain Modes'),
    f1: false,
    precondition: ContextKeyExpr.and(ContextKeyExpr.or(TerminalContextKeys.processSupported, TerminalContextKeys.terminalHasBeenCreated), TerminalContextKeys.focus, TerminalContextKeys.isOpen, TerminalContextKeys.suggestWidgetVisible),
    keybinding: {
        // Down is bound to other workbench keybindings that this needs to beat
        weight: 200 /* KeybindingWeight.WorkbenchContrib */ + 1,
        primary: 2048 /* KeyMod.CtrlCmd */ | 90 /* KeyCode.Slash */,
    },
    run: (activeInstance) => TerminalSuggestContribution.get(activeInstance)?.addon?.toggleExplainMode()
});
registerActiveInstanceAction({
    id: "workbench.action.terminal.suggestToggleDetailsFocus" /* TerminalSuggestCommandId.ToggleDetailsFocus */,
    title: localize2(16237, 'Suggest Toggle Suggestion Focus'),
    f1: false,
    // HACK: This does not work with a precondition of `TerminalContextKeys.suggestWidgetVisible`, so make sure to not override the editor's keybinding
    precondition: EditorContextKeys.textInputFocus.negate(),
    keybinding: {
        weight: 200 /* KeybindingWeight.WorkbenchContrib */,
        primary: 2048 /* KeyMod.CtrlCmd */ | 512 /* KeyMod.Alt */ | 10 /* KeyCode.Space */,
        mac: { primary: 256 /* KeyMod.WinCtrl */ | 512 /* KeyMod.Alt */ | 10 /* KeyCode.Space */ }
    },
    run: (activeInstance) => TerminalSuggestContribution.get(activeInstance)?.addon?.toggleSuggestionFocus()
});
registerActiveInstanceAction({
    id: "workbench.action.terminal.suggestToggleDetails" /* TerminalSuggestCommandId.ToggleDetails */,
    title: localize2(16238, 'Suggest Toggle Details'),
    f1: false,
    precondition: ContextKeyExpr.and(ContextKeyExpr.or(TerminalContextKeys.processSupported, TerminalContextKeys.terminalHasBeenCreated), TerminalContextKeys.isOpen, TerminalContextKeys.focus, TerminalContextKeys.suggestWidgetVisible, SimpleSuggestContext.HasFocusedSuggestion),
    keybinding: {
        // HACK: Force weight to be higher than that to start terminal chat
        weight: 400 /* KeybindingWeight.ExternalExtension */ + 2,
        primary: 2048 /* KeyMod.CtrlCmd */ | 10 /* KeyCode.Space */,
        secondary: [2048 /* KeyMod.CtrlCmd */ | 39 /* KeyCode.KeyI */],
        mac: { primary: 256 /* KeyMod.WinCtrl */ | 10 /* KeyCode.Space */, secondary: [2048 /* KeyMod.CtrlCmd */ | 39 /* KeyCode.KeyI */] }
    },
    run: (activeInstance) => TerminalSuggestContribution.get(activeInstance)?.addon?.toggleSuggestionDetails()
});
registerActiveInstanceAction({
    id: "workbench.action.terminal.selectNextPageSuggestion" /* TerminalSuggestCommandId.SelectNextPageSuggestion */,
    title: localize2(16239, 'Select the Next Page Suggestion'),
    f1: false,
    precondition: ContextKeyExpr.and(ContextKeyExpr.or(TerminalContextKeys.processSupported, TerminalContextKeys.terminalHasBeenCreated), TerminalContextKeys.focus, TerminalContextKeys.isOpen, TerminalContextKeys.suggestWidgetVisible),
    keybinding: {
        // Down is bound to other workbench keybindings that this needs to beat
        primary: 12 /* KeyCode.PageDown */,
        weight: 200 /* KeybindingWeight.WorkbenchContrib */ + 1
    },
    run: (activeInstance) => TerminalSuggestContribution.get(activeInstance)?.addon?.selectNextPageSuggestion()
});
registerActiveInstanceAction({
    id: "workbench.action.terminal.acceptSelectedSuggestion" /* TerminalSuggestCommandId.AcceptSelectedSuggestion */,
    title: localize2(16240, 'Insert'),
    f1: false,
    precondition: ContextKeyExpr.and(ContextKeyExpr.or(TerminalContextKeys.processSupported, TerminalContextKeys.terminalHasBeenCreated), TerminalContextKeys.focus, TerminalContextKeys.isOpen, TerminalContextKeys.suggestWidgetVisible),
    keybinding: [{
            primary: 2 /* KeyCode.Tab */,
            // Tab is bound to other workbench keybindings that this needs to beat
            weight: 200 /* KeybindingWeight.WorkbenchContrib */ + 2,
            when: ContextKeyExpr.and(SimpleSuggestContext.HasFocusedSuggestion)
        },
        {
            primary: 3 /* KeyCode.Enter */,
            // Enter accepts when: explicitly invoked (ctrl+space), OR not in partial mode, OR not first suggestion, OR user has navigated
            when: ContextKeyExpr.and(SimpleSuggestContext.HasFocusedSuggestion, ContextKeyExpr.or(SimpleSuggestContext.ExplicitlyInvoked, ContextKeyExpr.notEquals(`config.${"terminal.integrated.suggest.selectionMode" /* TerminalSuggestSettingId.SelectionMode */}`, 'partial'), SimpleSuggestContext.FirstSuggestionFocused.toNegated(), SimpleSuggestContext.HasNavigated)),
            weight: 200 /* KeybindingWeight.WorkbenchContrib */ + 1
        }],
    run: (activeInstance) => TerminalSuggestContribution.get(activeInstance)?.addon?.acceptSelectedSuggestion()
});
registerActiveInstanceAction({
    id: "workbench.action.terminal.acceptSelectedSuggestionEnter" /* TerminalSuggestCommandId.AcceptSelectedSuggestionEnter */,
    title: localize2(16241, 'Accept Selected Suggestion (Enter)'),
    f1: false,
    precondition: ContextKeyExpr.and(ContextKeyExpr.or(TerminalContextKeys.processSupported, TerminalContextKeys.terminalHasBeenCreated), TerminalContextKeys.focus, TerminalContextKeys.isOpen, TerminalContextKeys.suggestWidgetVisible),
    keybinding: {
        primary: 3 /* KeyCode.Enter */,
        // Enter is bound to other workbench keybindings that this needs to beat
        weight: 200 /* KeybindingWeight.WorkbenchContrib */ + 1,
        when: ContextKeyExpr.notEquals(`config.${"terminal.integrated.suggest.runOnEnter" /* TerminalSuggestSettingId.RunOnEnter */}`, 'never'),
    },
    run: async (activeInstance) => TerminalSuggestContribution.get(activeInstance)?.addon?.acceptSelectedSuggestion(undefined, true)
});
registerActiveInstanceAction({
    id: "workbench.action.terminal.hideSuggestWidget" /* TerminalSuggestCommandId.HideSuggestWidget */,
    title: localize2(16242, 'Hide Suggest Widget'),
    f1: false,
    precondition: ContextKeyExpr.and(ContextKeyExpr.or(TerminalContextKeys.processSupported, TerminalContextKeys.terminalHasBeenCreated), TerminalContextKeys.focus, TerminalContextKeys.isOpen, TerminalContextKeys.suggestWidgetVisible),
    keybinding: {
        primary: 9 /* KeyCode.Escape */,
        // Escape is bound to other workbench keybindings that this needs to beat
        weight: 200 /* KeybindingWeight.WorkbenchContrib */ + 1
    },
    run: (activeInstance) => TerminalSuggestContribution.get(activeInstance)?.addon?.hideSuggestWidget(true)
});
registerActiveInstanceAction({
    id: "workbench.action.terminal.hideSuggestWidgetAndNavigateHistory" /* TerminalSuggestCommandId.HideSuggestWidgetAndNavigateHistory */,
    title: localize2(16243, 'Hide Suggest Widget and Navigate History'),
    f1: false,
    precondition: ContextKeyExpr.and(ContextKeyExpr.or(TerminalContextKeys.processSupported, TerminalContextKeys.terminalHasBeenCreated), TerminalContextKeys.focus, TerminalContextKeys.isOpen, TerminalContextKeys.suggestWidgetVisible),
    keybinding: {
        primary: 16 /* KeyCode.UpArrow */,
        when: ContextKeyExpr.and(SimpleSuggestContext.HasNavigated.negate(), ContextKeyExpr.equals(`config.${"terminal.integrated.suggest.upArrowNavigatesHistory" /* TerminalSuggestSettingId.UpArrowNavigatesHistory */}`, true)),
        weight: 200 /* KeybindingWeight.WorkbenchContrib */ + 2
    },
    run: (activeInstance) => {
        TerminalSuggestContribution.get(activeInstance)?.addon?.hideSuggestWidget(true);
        activeInstance.sendText('\u001b[A', false); // Up arrow
    }
});
// #endregion
// #region Dynamic Providers Configuration
let TerminalSuggestProvidersConfigurationManager = class TerminalSuggestProvidersConfigurationManager extends Disposable {
    static { TerminalSuggestProvidersConfigurationManager_1 = this; }
    static initialize(instantiationService) {
        if (!this._instance) {
            this._instance = instantiationService.createInstance(TerminalSuggestProvidersConfigurationManager_1);
        }
    }
    constructor(_terminalCompletionService, _terminalContributionService) {
        super();
        this._terminalCompletionService = _terminalCompletionService;
        this._terminalContributionService = _terminalContributionService;
        this._register(this._terminalCompletionService.onDidChangeProviders(() => {
            this._updateConfiguration();
        }));
        this._register(this._terminalContributionService.onDidChangeTerminalCompletionProviders(() => {
            this._updateConfiguration();
        }));
        // Initial configuration
        this._updateConfiguration();
    }
    _updateConfiguration() {
        // Add statically declared providers from package.json contributions
        const providers = new Map();
        this._terminalContributionService.terminalCompletionProviders.forEach(o => providers.set(o.extensionIdentifier, { ...o, id: o.extensionIdentifier }));
        // Add dynamically registered providers (that aren't already declared statically)
        for (const { id } of this._terminalCompletionService.providers) {
            if (id && !providers.has(id)) {
                providers.set(id, { id });
            }
        }
        registerTerminalSuggestProvidersConfiguration(providers);
    }
};
TerminalSuggestProvidersConfigurationManager = TerminalSuggestProvidersConfigurationManager_1 = __decorate([
    __param(0, ITerminalCompletionService),
    __param(1, ITerminalContributionService)
], TerminalSuggestProvidersConfigurationManager);
// #endregion
//# sourceMappingURL=terminal.suggest.contribution.js.map