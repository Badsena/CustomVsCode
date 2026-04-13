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
import { Disposable } from '../../../../../base/common/lifecycle.js';
import { localize } from '../../../../../nls.js';
import { ICommandService } from '../../../../../platform/commands/common/commands.js';
import { ContextKeyExpr, IContextKeyService } from '../../../../../platform/contextkey/common/contextkey.js';
import { IConfigurationService } from '../../../../../platform/configuration/common/configuration.js';
import { accessibleViewIsShown, accessibleViewCurrentProviderId } from '../../../accessibility/browser/accessibilityConfiguration.js';
export var ClassName;
(function (ClassName) {
    ClassName["Active"] = "active";
    ClassName["EditorTextArea"] = "textarea";
})(ClassName || (ClassName = {}));
let TerminalAccessibilityHelpProvider = class TerminalAccessibilityHelpProvider extends Disposable {
    onClose() {
        const expr = ContextKeyExpr.and(accessibleViewIsShown, ContextKeyExpr.equals(accessibleViewCurrentProviderId.key, "terminal-help" /* AccessibleViewProviderId.TerminalHelp */));
        if (expr?.evaluate(this._contextKeyService.getContext(null))) {
            this._commandService.executeCommand("workbench.action.terminal.focusAccessibleBuffer" /* TerminalAccessibilityCommandId.FocusAccessibleBuffer */);
        }
        else {
            this._instance.focus();
        }
        this.dispose();
    }
    constructor(_instance, _xterm, _commandService, _configurationService, _contextKeyService) {
        super();
        this._instance = _instance;
        this._commandService = _commandService;
        this._configurationService = _configurationService;
        this._contextKeyService = _contextKeyService;
        this.id = "terminal-help" /* AccessibleViewProviderId.TerminalHelp */;
        this._hasShellIntegration = false;
        this.options = {
            type: "help" /* AccessibleViewType.Help */,
            readMoreUrl: 'https://code.visualstudio.com/docs/editor/accessibility#_terminal-accessibility'
        };
        this.verbositySettingKey = "accessibility.verbosity.terminal" /* AccessibilityVerbositySettingId.Terminal */;
        this._hasShellIntegration = _xterm.shellIntegration.status === 2 /* ShellIntegrationStatus.VSCode */;
    }
    provideContent() {
        const content = [
            localize(15807, null, "workbench.action.terminal.focusAccessibleBuffer" /* TerminalAccessibilityCommandId.FocusAccessibleBuffer */),
            localize(15808, null),
            localize(15809, null, "workbench.action.terminal.openDetectedLink" /* TerminalLinksCommandId.OpenDetectedLink */),
            localize(15810, null, "workbench.action.terminal.newWithProfile" /* TerminalCommandId.NewWithProfile */),
            localize(15811, null, "terminal.integrated.focusAfterRun" /* TerminalSettingId.FocusAfterRun */),
        ];
        if (!this._configurationService.getValue("terminal.integrated.accessibleViewFocusOnCommandExecution" /* TerminalAccessibilitySettingId.AccessibleViewFocusOnCommandExecution */)) {
            content.push(localize(15812, null));
        }
        if (this._configurationService.getValue("terminal.integrated.suggest.enabled" /* TerminalSuggestSettingId.Enabled */)) {
            content.push(localize(15813, null, "workbench.action.terminal.triggerSuggest" /* TerminalSuggestCommandId.TriggerSuggest */));
            content.push(localize(15814, null));
            content.push(localize(15815, null, "workbench.action.terminal.acceptSelectedSuggestion" /* TerminalSuggestCommandId.AcceptSelectedSuggestion */, "workbench.action.terminal.configureSuggestSettings" /* TerminalSuggestCommandId.ConfigureSettings */));
            content.push(localize(15816, null, "workbench.action.terminal.suggestToggleDetails" /* TerminalSuggestCommandId.ToggleDetails */, "workbench.action.terminal.suggestToggleDetailsFocus" /* TerminalSuggestCommandId.ToggleDetailsFocus */));
            content.push(localize(15817, null, "workbench.action.terminal.suggestLearnMore" /* TerminalSuggestCommandId.LearnMore */));
            content.push(localize(15818, null, "workbench.action.terminal.configureSuggestSettings" /* TerminalSuggestCommandId.ConfigureSettings */));
        }
        if (this._instance.shellType === "cmd" /* WindowsShellType.CommandPrompt */) {
            content.push(localize(15819, null));
        }
        if (this._hasShellIntegration) {
            content.push(localize(15820, null));
            content.push('- ' + localize(15821, null, "workbench.action.terminal.accessibleBufferGoToNextCommand" /* TerminalAccessibilityCommandId.AccessibleBufferGoToNextCommand */));
            content.push('- ' + localize(15822, null, "workbench.action.terminal.accessibleBufferGoToPreviousCommand" /* TerminalAccessibilityCommandId.AccessibleBufferGoToPreviousCommand */));
            content.push('- ' + localize(15823, null, "editor.action.accessibleViewGoToSymbol" /* AccessibilityCommandId.GoToSymbol */));
            content.push('- ' + localize(15824, null, "workbench.action.terminal.runRecentCommand" /* TerminalHistoryCommandId.RunRecentCommand */));
            content.push('- ' + localize(15825, null, "workbench.action.terminal.goToRecentDirectory" /* TerminalHistoryCommandId.GoToRecentDirectory */));
        }
        else {
            content.push(localize(15826, null));
        }
        return content.join('\n');
    }
};
TerminalAccessibilityHelpProvider = __decorate([
    __param(2, ICommandService),
    __param(3, IConfigurationService),
    __param(4, IContextKeyService)
], TerminalAccessibilityHelpProvider);
export { TerminalAccessibilityHelpProvider };
//# sourceMappingURL=terminalAccessibilityHelp.js.map