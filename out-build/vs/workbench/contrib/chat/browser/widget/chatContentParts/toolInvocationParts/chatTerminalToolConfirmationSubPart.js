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
import { append, h } from '../../../../../../../base/browser/dom.js';
import { Separator } from '../../../../../../../base/common/actions.js';
import { asArray } from '../../../../../../../base/common/arrays.js';
import { Codicon } from '../../../../../../../base/common/codicons.js';
import { ErrorNoTelemetry } from '../../../../../../../base/common/errors.js';
import { createCommandUri, MarkdownString } from '../../../../../../../base/common/htmlContent.js';
import { thenRegisterOrDispose, toDisposable } from '../../../../../../../base/common/lifecycle.js';
import { Schemas } from '../../../../../../../base/common/network.js';
import Severity from '../../../../../../../base/common/severity.js';
import { isObject } from '../../../../../../../base/common/types.js';
import { URI } from '../../../../../../../base/common/uri.js';
import { generateUuid } from '../../../../../../../base/common/uuid.js';
import { ILanguageService } from '../../../../../../../editor/common/languages/language.js';
import { IModelService } from '../../../../../../../editor/common/services/model.js';
import { ITextModelService } from '../../../../../../../editor/common/services/resolverService.js';
import { localize } from '../../../../../../../nls.js';
import { IConfigurationService } from '../../../../../../../platform/configuration/common/configuration.js';
import { IContextKeyService } from '../../../../../../../platform/contextkey/common/contextkey.js';
import { IDialogService } from '../../../../../../../platform/dialogs/common/dialogs.js';
import { IHoverService } from '../../../../../../../platform/hover/browser/hover.js';
import { IInstantiationService } from '../../../../../../../platform/instantiation/common/instantiation.js';
import { IKeybindingService } from '../../../../../../../platform/keybinding/common/keybinding.js';
import { IStorageService } from '../../../../../../../platform/storage/common/storage.js';
import { IPreferencesService } from '../../../../../../services/preferences/common/preferences.js';
import { ITerminalChatService } from '../../../../../terminal/browser/terminal.js';
import { ChatContextKeys } from '../../../../common/actions/chatContextKeys.js';
import { migrateLegacyTerminalToolSpecificData } from '../../../../common/chat.js';
import { IChatToolInvocation } from '../../../../common/chatService/chatService.js';
import { AcceptToolConfirmationActionId, SkipToolConfirmationActionId } from '../../../actions/chatToolActions.js';
import { IChatWidgetService } from '../../../chat.js';
import { ChatCustomConfirmationWidget } from '../chatConfirmationWidget.js';
import { ChatMarkdownContentPart } from '../chatMarkdownContentPart.js';
import { BaseChatToolInvocationSubPart } from './chatToolInvocationSubPart.js';
export var TerminalToolConfirmationStorageKeys;
(function (TerminalToolConfirmationStorageKeys) {
    TerminalToolConfirmationStorageKeys["TerminalAutoApproveWarningAccepted"] = "chat.tools.terminal.autoApprove.warningAccepted";
})(TerminalToolConfirmationStorageKeys || (TerminalToolConfirmationStorageKeys = {}));
let ChatTerminalToolConfirmationSubPart = class ChatTerminalToolConfirmationSubPart extends BaseChatToolInvocationSubPart {
    constructor(toolInvocation, terminalData, context, renderer, editorPool, currentWidthDelegate, codeBlockModelCollection, codeBlockStartIndex, instantiationService, dialogService, keybindingService, modelService, languageService, configurationService, contextKeyService, chatWidgetService, preferencesService, storageService, terminalChatService, textModelService, hoverService) {
        super(toolInvocation);
        this.context = context;
        this.renderer = renderer;
        this.editorPool = editorPool;
        this.currentWidthDelegate = currentWidthDelegate;
        this.codeBlockModelCollection = codeBlockModelCollection;
        this.codeBlockStartIndex = codeBlockStartIndex;
        this.instantiationService = instantiationService;
        this.dialogService = dialogService;
        this.keybindingService = keybindingService;
        this.modelService = modelService;
        this.languageService = languageService;
        this.configurationService = configurationService;
        this.contextKeyService = contextKeyService;
        this.chatWidgetService = chatWidgetService;
        this.preferencesService = preferencesService;
        this.storageService = storageService;
        this.terminalChatService = terminalChatService;
        this.codeblocks = [];
        const state = toolInvocation.state.get();
        if (state.type !== 1 /* IChatToolInvocation.StateKind.WaitingForConfirmation */ || !state.confirmationMessages?.title) {
            throw new Error('Confirmation messages are missing');
        }
        terminalData = migrateLegacyTerminalToolSpecificData(terminalData);
        const { title, message, disclaimer, terminalCustomActions } = state.confirmationMessages;
        // Use pre-computed confirmation data from runInTerminalTool (cd prefix extraction happens there for localization)
        // Use presentationOverrides for display if available (e.g., extracted Python code)
        const initialContent = terminalData.presentationOverrides?.commandLine ?? terminalData.confirmation?.commandLine ?? (terminalData.commandLine.toolEdited ?? terminalData.commandLine.original).trimStart();
        const cdPrefix = terminalData.confirmation?.cdPrefix ?? '';
        // When presentationOverrides is set, the editor should be read-only since the displayed content
        // differs from the actual command (e.g., extracted Python code vs full python -c command)
        const isReadOnly = !!terminalData.presentationOverrides;
        const autoApproveEnabled = this.configurationService.getValue("chat.tools.terminal.enableAutoApprove" /* TerminalContribSettingId.EnableAutoApprove */) === true;
        const autoApproveWarningAccepted = this.storageService.getBoolean("chat.tools.terminal.autoApprove.warningAccepted" /* TerminalToolConfirmationStorageKeys.TerminalAutoApproveWarningAccepted */, -1 /* StorageScope.APPLICATION */, false);
        let moreActions = undefined;
        if (autoApproveEnabled) {
            moreActions = [];
            if (!autoApproveWarningAccepted) {
                moreActions.push({
                    label: localize(8075, null),
                    data: {
                        type: 'enable'
                    }
                });
                moreActions.push(new Separator());
                if (terminalCustomActions) {
                    for (const action of terminalCustomActions) {
                        if (!(action instanceof Separator)) {
                            action.disabled = true;
                        }
                    }
                }
            }
            if (terminalCustomActions) {
                moreActions.push(...terminalCustomActions);
            }
            if (moreActions.length === 0) {
                moreActions = undefined;
            }
        }
        const codeBlockRenderOptions = {
            hideToolbar: true,
            reserveWidth: 19,
            verticalPadding: 5,
            editorOptions: {
                wordWrap: 'on',
                readOnly: isReadOnly,
                tabFocusMode: true,
                ariaLabel: typeof title === 'string' ? title : title.value
            }
        };
        const languageId = this.languageService.getLanguageIdByLanguageName(terminalData.presentationOverrides?.language ?? terminalData.language ?? 'sh') ?? 'shellscript';
        const model = this._register(this.modelService.createModel(initialContent, this.languageService.createById(languageId), this._getUniqueCodeBlockUri(), true));
        thenRegisterOrDispose(textModelService.createModelReference(model.uri), this._store);
        const editor = this._register(this.editorPool.get());
        editor.object.render({
            codeBlockIndex: this.codeBlockStartIndex,
            codeBlockPartIndex: 0,
            element: this.context.element,
            languageId,
            renderOptions: codeBlockRenderOptions,
            textModel: Promise.resolve(model),
            chatSessionResource: this.context.element.sessionResource
        }, this.currentWidthDelegate());
        this.codeblocks.push({
            codeBlockIndex: this.codeBlockStartIndex,
            codemapperUri: undefined,
            elementId: this.context.element.id,
            focus: () => editor.object.focus(),
            ownerMarkdownPartId: this.codeblocksPartId,
            uri: model.uri,
            uriPromise: Promise.resolve(model.uri),
            chatSessionResource: this.context.element.sessionResource
        });
        this._register(model.onDidChangeContent(e => {
            const currentValue = model.getValue();
            // Only set userEdited if the content actually differs from the initial value
            // Prepend cd prefix back if it was extracted for display
            if (currentValue !== initialContent) {
                terminalData.commandLine.userEdited = cdPrefix + currentValue;
            }
            else {
                terminalData.commandLine.userEdited = undefined;
            }
        }));
        const elements = h('.chat-confirmation-message-terminal', [
            h('.chat-confirmation-message-terminal-editor@editor'),
            h('.chat-confirmation-message-terminal-disclaimer@disclaimer'),
        ]);
        append(elements.editor, editor.object.element);
        this._register(hoverService.setupDelayedHover(elements.editor, {
            content: message || '',
            style: 1 /* HoverStyle.Pointer */,
            position: { hoverPosition: 0 /* HoverPosition.LEFT */ },
        }));
        const confirmWidget = this._register(this.instantiationService.createInstance((ChatCustomConfirmationWidget), this.context, {
            title,
            icon: Codicon.terminal,
            message: elements.root,
            buttons: this._createButtons(moreActions)
        }));
        if (disclaimer) {
            this._appendMarkdownPart(elements.disclaimer, disclaimer, codeBlockRenderOptions);
        }
        const hasToolConfirmationKey = ChatContextKeys.Editing.hasToolConfirmation.bindTo(this.contextKeyService);
        hasToolConfirmationKey.set(true);
        this._register(toDisposable(() => hasToolConfirmationKey.reset()));
        this._register(confirmWidget.onDidClick(async (button) => {
            let doComplete = true;
            const data = button.data;
            let toolConfirmKind = 0 /* ToolConfirmKind.Denied */;
            if (typeof data === 'boolean') {
                if (data) {
                    toolConfirmKind = 4 /* ToolConfirmKind.UserAction */;
                    // Clear out any auto approve info since this was an explicit user action. This
                    // can happen when the auto approve feature is off.
                    if (terminalData.autoApproveInfo) {
                        terminalData.autoApproveInfo = undefined;
                    }
                }
            }
            else if (typeof data !== 'boolean') {
                switch (data.type) {
                    case 'enable': {
                        const optedIn = await this._showAutoApproveWarning();
                        if (optedIn) {
                            this.storageService.store("chat.tools.terminal.autoApprove.warningAccepted" /* TerminalToolConfirmationStorageKeys.TerminalAutoApproveWarningAccepted */, true, -1 /* StorageScope.APPLICATION */, 0 /* StorageTarget.USER */);
                            // If this command would have been auto-approved, approve immediately
                            if (terminalData.autoApproveInfo) {
                                toolConfirmKind = 4 /* ToolConfirmKind.UserAction */;
                            }
                            // If this would not have been auto approved, enable the options and
                            // do not complete
                            else if (terminalCustomActions) {
                                for (const action of terminalCustomActions) {
                                    if (!(action instanceof Separator)) {
                                        action.disabled = false;
                                    }
                                }
                                confirmWidget.updateButtons(this._createButtons(terminalCustomActions));
                                doComplete = false;
                            }
                        }
                        else {
                            doComplete = false;
                        }
                        break;
                    }
                    case 'skip': {
                        toolConfirmKind = 5 /* ToolConfirmKind.Skipped */;
                        break;
                    }
                    case 'newRule': {
                        const newRules = asArray(data.rule);
                        // Group rules by scope
                        const sessionRules = newRules.filter(r => r.scope === 'session');
                        const workspaceRules = newRules.filter(r => r.scope === 'workspace');
                        const userRules = newRules.filter(r => r.scope === 'user');
                        // Handle session-scoped rules (temporary, in-memory only)
                        const chatSessionResource = this.context.element.sessionResource;
                        for (const rule of sessionRules) {
                            this.terminalChatService.addSessionAutoApproveRule(chatSessionResource, rule.key, rule.value);
                        }
                        // Handle workspace-scoped rules
                        if (workspaceRules.length > 0) {
                            const inspect = this.configurationService.inspect("chat.tools.terminal.autoApprove" /* TerminalContribSettingId.AutoApprove */);
                            const oldValue = inspect.workspaceValue ?? {};
                            if (isObject(oldValue)) {
                                const newValue = { ...oldValue };
                                for (const rule of workspaceRules) {
                                    newValue[rule.key] = rule.value;
                                }
                                await this.configurationService.updateValue("chat.tools.terminal.autoApprove" /* TerminalContribSettingId.AutoApprove */, newValue, 5 /* ConfigurationTarget.WORKSPACE */);
                            }
                            else {
                                this.preferencesService.openSettings({
                                    jsonEditor: true,
                                    target: 5 /* ConfigurationTarget.WORKSPACE */,
                                    revealSetting: { key: "chat.tools.terminal.autoApprove" /* TerminalContribSettingId.AutoApprove */ },
                                });
                                throw new ErrorNoTelemetry(`Cannot add new rule, existing workspace setting is unexpected format`);
                            }
                        }
                        // Handle user-scoped rules
                        if (userRules.length > 0) {
                            const inspect = this.configurationService.inspect("chat.tools.terminal.autoApprove" /* TerminalContribSettingId.AutoApprove */);
                            const oldValue = inspect.userValue ?? {};
                            if (isObject(oldValue)) {
                                const newValue = { ...oldValue };
                                for (const rule of userRules) {
                                    newValue[rule.key] = rule.value;
                                }
                                await this.configurationService.updateValue("chat.tools.terminal.autoApprove" /* TerminalContribSettingId.AutoApprove */, newValue, 2 /* ConfigurationTarget.USER */);
                            }
                            else {
                                this.preferencesService.openSettings({
                                    jsonEditor: true,
                                    target: 2 /* ConfigurationTarget.USER */,
                                    revealSetting: { key: "chat.tools.terminal.autoApprove" /* TerminalContribSettingId.AutoApprove */ },
                                });
                                throw new ErrorNoTelemetry(`Cannot add new rule, existing setting is unexpected format`);
                            }
                        }
                        function formatRuleLinks(rules, scope) {
                            return rules.map(e => {
                                if (scope === 'session') {
                                    return `\`${e.key}\``;
                                }
                                const target = scope === 'workspace' ? 5 /* ConfigurationTarget.WORKSPACE */ : 2 /* ConfigurationTarget.USER */;
                                const settingsUri = createCommandUri("workbench.action.terminal.chat.openTerminalSettingsLink" /* TerminalContribCommandId.OpenTerminalSettingsLink */, target);
                                return `[\`${e.key}\`](${settingsUri.toString()} "${localize(8076, null)}")`;
                            }).join(', ');
                        }
                        const mdTrustSettings = {
                            isTrusted: {
                                enabledCommands: ["workbench.action.terminal.chat.openTerminalSettingsLink" /* TerminalContribCommandId.OpenTerminalSettingsLink */]
                            }
                        };
                        const parts = [];
                        if (sessionRules.length > 0) {
                            parts.push(sessionRules.length === 1
                                ? localize(8077, null, formatRuleLinks(sessionRules, 'session'))
                                : localize(8078, null, formatRuleLinks(sessionRules, 'session')));
                        }
                        if (workspaceRules.length > 0) {
                            parts.push(workspaceRules.length === 1
                                ? localize(8079, null, formatRuleLinks(workspaceRules, 'workspace'))
                                : localize(8080, null, formatRuleLinks(workspaceRules, 'workspace')));
                        }
                        if (userRules.length > 0) {
                            parts.push(userRules.length === 1
                                ? localize(8081, null, formatRuleLinks(userRules, 'user'))
                                : localize(8082, null, formatRuleLinks(userRules, 'user')));
                        }
                        if (parts.length > 0) {
                            terminalData.autoApproveInfo = new MarkdownString(parts.join(', '), mdTrustSettings);
                        }
                        toolConfirmKind = 4 /* ToolConfirmKind.UserAction */;
                        break;
                    }
                    case 'configure': {
                        this.preferencesService.openSettings({
                            target: 2 /* ConfigurationTarget.USER */,
                            query: `@id:${"chat.tools.terminal.autoApprove" /* TerminalContribSettingId.AutoApprove */}`,
                        });
                        doComplete = false;
                        break;
                    }
                    case 'sessionApproval': {
                        const sessionResource = this.context.element.sessionResource;
                        this.terminalChatService.setChatSessionAutoApproval(sessionResource, true);
                        const disableUri = createCommandUri("workbench.action.terminal.chat.disableSessionAutoApproval" /* TerminalContribCommandId.DisableSessionAutoApproval */, sessionResource);
                        const mdTrustSettings = {
                            isTrusted: {
                                enabledCommands: ["workbench.action.terminal.chat.disableSessionAutoApproval" /* TerminalContribCommandId.DisableSessionAutoApproval */]
                            }
                        };
                        terminalData.autoApproveInfo = new MarkdownString(`${localize(8083, null)} ([${localize(8084, null)}](${disableUri.toString()}))`, mdTrustSettings);
                        toolConfirmKind = 4 /* ToolConfirmKind.UserAction */;
                        break;
                    }
                }
            }
            if (doComplete) {
                IChatToolInvocation.confirmWith(toolInvocation, { type: toolConfirmKind });
                this.chatWidgetService.getWidgetBySessionResource(this.context.element.sessionResource)?.focusInput();
            }
        }));
        this.domNode = confirmWidget.domNode;
    }
    _createButtons(moreActions) {
        const getLabelAndTooltip = (label, actionId, tooltipDetail = label) => {
            const tooltip = this.keybindingService.appendKeybinding(tooltipDetail, actionId);
            return { label, tooltip };
        };
        return [
            {
                ...getLabelAndTooltip(localize(8085, null), AcceptToolConfirmationActionId),
                data: true,
                moreActions,
            },
            {
                ...getLabelAndTooltip(localize(8086, null), SkipToolConfirmationActionId, localize(8087, null)),
                data: { type: 'skip' },
                isSecondary: true,
            },
        ];
    }
    async _showAutoApproveWarning() {
        const promptResult = await this.dialogService.prompt({
            type: Severity.Info,
            message: localize(8088, null),
            buttons: [{
                    label: localize(8089, null),
                    run: () => true
                }],
            cancelButton: true,
            custom: {
                icon: Codicon.shield,
                markdownDetails: [{
                        markdown: new MarkdownString(localize(8090, null)),
                    }, {
                        markdown: new MarkdownString(`[${localize(8091, null)}](https://code.visualstudio.com/docs/copilot/security#_security-considerations)`)
                    }],
            }
        });
        return promptResult.result === true;
    }
    _getUniqueCodeBlockUri() {
        return URI.from({
            scheme: Schemas.vscodeChatCodeBlock,
            path: generateUuid(),
        });
    }
    _appendMarkdownPart(container, message, codeBlockRenderOptions) {
        const part = this._register(this.instantiationService.createInstance(ChatMarkdownContentPart, {
            kind: 'markdownContent',
            content: typeof message === 'string' ? new MarkdownString().appendMarkdown(message) : message
        }, this.context, this.editorPool, false, this.codeBlockStartIndex, this.renderer, undefined, this.currentWidthDelegate(), this.codeBlockModelCollection, { codeBlockRenderOptions }));
        append(container, part.domNode);
    }
};
ChatTerminalToolConfirmationSubPart = __decorate([
    __param(8, IInstantiationService),
    __param(9, IDialogService),
    __param(10, IKeybindingService),
    __param(11, IModelService),
    __param(12, ILanguageService),
    __param(13, IConfigurationService),
    __param(14, IContextKeyService),
    __param(15, IChatWidgetService),
    __param(16, IPreferencesService),
    __param(17, IStorageService),
    __param(18, ITerminalChatService),
    __param(19, ITextModelService),
    __param(20, IHoverService)
], ChatTerminalToolConfirmationSubPart);
export { ChatTerminalToolConfirmationSubPart };
//# sourceMappingURL=chatTerminalToolConfirmationSubPart.js.map