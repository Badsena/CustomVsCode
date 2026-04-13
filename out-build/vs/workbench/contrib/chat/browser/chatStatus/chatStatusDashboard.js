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
import { $, append, EventType, addDisposableListener, EventHelper, disposableWindowInterval, getWindow } from '../../../../../base/browser/dom.js';
import { Gesture, EventType as TouchEventType } from '../../../../../base/browser/touch.js';
import { ActionBar } from '../../../../../base/browser/ui/actionbar/actionbar.js';
import { Button } from '../../../../../base/browser/ui/button/button.js';
import { renderLabelWithIcons } from '../../../../../base/browser/ui/iconLabel/iconLabels.js';
import { Checkbox } from '../../../../../base/browser/ui/toggle/toggle.js';
import { toAction } from '../../../../../base/common/actions.js';
import { cancelOnDispose } from '../../../../../base/common/cancellation.js';
import { Codicon } from '../../../../../base/common/codicons.js';
import { safeIntl } from '../../../../../base/common/date.js';
import { MarkdownString } from '../../../../../base/common/htmlContent.js';
import { MutableDisposable, DisposableStore } from '../../../../../base/common/lifecycle.js';
import { parseLinkedText } from '../../../../../base/common/linkedText.js';
import { language } from '../../../../../base/common/platform.js';
import { ThemeIcon } from '../../../../../base/common/themables.js';
import { isObject } from '../../../../../base/common/types.js';
import { URI } from '../../../../../base/common/uri.js';
import { IInlineCompletionsService } from '../../../../../editor/browser/services/inlineCompletionsService.js';
import { ILanguageService } from '../../../../../editor/common/languages/language.js';
import { ITextResourceConfigurationService } from '../../../../../editor/common/services/textResourceConfiguration.js';
import { ILanguageFeaturesService } from '../../../../../editor/common/services/languageFeatures.js';
import { IQuickInputService } from '../../../../../platform/quickinput/common/quickInput.js';
import { localize } from '../../../../../nls.js';
import { ICommandService } from '../../../../../platform/commands/common/commands.js';
import { IConfigurationService } from '../../../../../platform/configuration/common/configuration.js';
import { IHoverService, nativeHoverDelegate } from '../../../../../platform/hover/browser/hover.js';
import { IMarkdownRendererService } from '../../../../../platform/markdown/browser/markdownRenderer.js';
import { Link } from '../../../../../platform/opener/browser/link.js';
import { IOpenerService } from '../../../../../platform/opener/common/opener.js';
import { ITelemetryService } from '../../../../../platform/telemetry/common/telemetry.js';
import { defaultButtonStyles, defaultCheckboxStyles } from '../../../../../platform/theme/browser/defaultStyles.js';
import { DomWidget } from '../../../../../platform/domWidget/browser/domWidget.js';
import { EditorResourceAccessor, SideBySideEditor } from '../../../../common/editor.js';
import { IChatEntitlementService, ChatEntitlement, getChatPlanName } from '../../../../services/chat/common/chatEntitlementService.js';
import { IEditorService } from '../../../../services/editor/common/editorService.js';
import { IChatSessionsService } from '../../common/chatSessionsService.js';
import { isNewUser } from './chatStatus.js';
import { IChatStatusItemService } from './chatStatusItemService.js';
import product from '../../../../../platform/product/common/product.js';
import { contrastBorder, inputValidationErrorBorder, inputValidationInfoBorder, inputValidationWarningBorder, registerColor, transparent } from '../../../../../platform/theme/common/colorRegistry.js';
import { Color } from '../../../../../base/common/color.js';
import { IViewsService } from '../../../../services/views/common/viewsService.js';
import { ChatViewId } from '../chat.js';
import { isCompletionsEnabled } from '../../../../../editor/common/services/completionsEnablement.js';
const defaultChat = product.defaultChatAgent;
const gaugeForeground = registerColor('gauge.foreground', {
    dark: inputValidationInfoBorder,
    light: inputValidationInfoBorder,
    hcDark: contrastBorder,
    hcLight: contrastBorder
}, localize(7450, null));
registerColor('gauge.background', {
    dark: transparent(gaugeForeground, 0.3),
    light: transparent(gaugeForeground, 0.3),
    hcDark: Color.white,
    hcLight: Color.white
}, localize(7451, null));
registerColor('gauge.border', {
    dark: null,
    light: null,
    hcDark: contrastBorder,
    hcLight: contrastBorder
}, localize(7452, null));
const gaugeWarningForeground = registerColor('gauge.warningForeground', {
    dark: inputValidationWarningBorder,
    light: inputValidationWarningBorder,
    hcDark: contrastBorder,
    hcLight: contrastBorder
}, localize(7453, null));
registerColor('gauge.warningBackground', {
    dark: transparent(gaugeWarningForeground, 0.3),
    light: transparent(gaugeWarningForeground, 0.3),
    hcDark: Color.white,
    hcLight: Color.white
}, localize(7454, null));
const gaugeErrorForeground = registerColor('gauge.errorForeground', {
    dark: inputValidationErrorBorder,
    light: inputValidationErrorBorder,
    hcDark: contrastBorder,
    hcLight: contrastBorder
}, localize(7455, null));
registerColor('gauge.errorBackground', {
    dark: transparent(gaugeErrorForeground, 0.3),
    light: transparent(gaugeErrorForeground, 0.3),
    hcDark: Color.white,
    hcLight: Color.white
}, localize(7456, null));
let ChatStatusDashboard = class ChatStatusDashboard extends DomWidget {
    constructor(chatEntitlementService, chatStatusItemService, commandService, configurationService, editorService, hoverService, languageService, openerService, telemetryService, textResourceConfigurationService, inlineCompletionsService, chatSessionsService, markdownRendererService, languageFeaturesService, quickInputService, viewService) {
        super();
        this.chatEntitlementService = chatEntitlementService;
        this.chatStatusItemService = chatStatusItemService;
        this.commandService = commandService;
        this.configurationService = configurationService;
        this.editorService = editorService;
        this.hoverService = hoverService;
        this.languageService = languageService;
        this.openerService = openerService;
        this.telemetryService = telemetryService;
        this.textResourceConfigurationService = textResourceConfigurationService;
        this.inlineCompletionsService = inlineCompletionsService;
        this.chatSessionsService = chatSessionsService;
        this.markdownRendererService = markdownRendererService;
        this.languageFeaturesService = languageFeaturesService;
        this.quickInputService = quickInputService;
        this.viewService = viewService;
        this.element = $('div.chat-status-bar-entry-tooltip');
        this.dateFormatter = safeIntl.DateTimeFormat(language, { year: 'numeric', month: 'long', day: 'numeric' });
        this.dateTimeFormatter = safeIntl.DateTimeFormat(language, { year: 'numeric', month: 'long', day: 'numeric', hour: 'numeric', minute: 'numeric' });
        this.quotaPercentageFormatter = safeIntl.NumberFormat(undefined, { maximumFractionDigits: 1, minimumFractionDigits: 0 });
        this.quotaOverageFormatter = safeIntl.NumberFormat(undefined, { maximumFractionDigits: 2, minimumFractionDigits: 0 });
        this.render();
    }
    render() {
        const token = cancelOnDispose(this._store);
        let needsSeparator = false;
        const addSeparator = (label, action) => {
            if (needsSeparator) {
                this.element.appendChild($('hr'));
            }
            if (label || action) {
                this.renderHeader(this.element, this._store, label ?? '', action);
            }
            needsSeparator = true;
        };
        // Quota Indicator
        const { chat: chatQuota, completions: completionsQuota, premiumChat: premiumChatQuota, resetDate, resetDateHasTime } = this.chatEntitlementService.quotas;
        if (chatQuota || completionsQuota || premiumChatQuota) {
            const usageTitle = this.getUsageTitle();
            addSeparator(usageTitle, toAction({
                id: 'workbench.action.manageCopilot',
                label: localize(7457, null),
                tooltip: localize(7458, null),
                class: ThemeIcon.asClassName(Codicon.settings),
                run: () => this.runCommandAndClose(() => this.openerService.open(URI.parse(defaultChat?.manageSettingsUrl ?? ''))),
            }));
            const completionsQuotaIndicator = completionsQuota && (completionsQuota.total > 0 || completionsQuota.unlimited) ? this.createQuotaIndicator(this.element, this._store, completionsQuota, localize(7459, null), false) : undefined;
            const chatQuotaIndicator = chatQuota && (chatQuota.total > 0 || chatQuota.unlimited) ? this.createQuotaIndicator(this.element, this._store, chatQuota, localize(7460, null), false) : undefined;
            const premiumChatLabel = premiumChatQuota?.overageEnabled && !premiumChatQuota?.unlimited ? localize(7461, null) : localize(7462, null);
            const premiumChatQuotaIndicator = premiumChatQuota && (premiumChatQuota.total > 0 || premiumChatQuota.unlimited) ? this.createQuotaIndicator(this.element, this._store, premiumChatQuota, premiumChatLabel, true) : undefined;
            if (resetDate) {
                this.element.appendChild($('div.description', undefined, localize(7463, null, resetDateHasTime ? this.dateTimeFormatter.value.format(new Date(resetDate)) : this.dateFormatter.value.format(new Date(resetDate)))));
            }
            if (this.chatEntitlementService.entitlement === ChatEntitlement.Free && (Number(chatQuota?.percentRemaining) <= 25 || Number(completionsQuota?.percentRemaining) <= 25)) {
                const upgradeProButton = this._store.add(new Button(this.element, { ...defaultButtonStyles, hoverDelegate: nativeHoverDelegate, secondary: this.canUseChat() /* use secondary color when chat can still be used */ }));
                upgradeProButton.label = localize(7464, null);
                this._store.add(upgradeProButton.onDidClick(() => this.runCommandAndClose('workbench.action.chat.upgradePlan')));
            }
            (async () => {
                await this.chatEntitlementService.update(token);
                if (token.isCancellationRequested) {
                    return;
                }
                const { chat: chatQuota, completions: completionsQuota, premiumChat: premiumChatQuota } = this.chatEntitlementService.quotas;
                if (completionsQuota) {
                    completionsQuotaIndicator?.(completionsQuota);
                }
                if (chatQuota) {
                    chatQuotaIndicator?.(chatQuota);
                }
                if (premiumChatQuota) {
                    premiumChatQuotaIndicator?.(premiumChatQuota);
                }
            })();
        }
        // Anonymous Indicator
        else if (this.chatEntitlementService.anonymous && this.chatEntitlementService.sentiment.installed) {
            addSeparator(localize(7465, null));
            this.createQuotaIndicator(this.element, this._store, localize(7466, null), localize(7467, null), false);
            this.createQuotaIndicator(this.element, this._store, localize(7468, null), localize(7469, null), false);
        }
        // Chat sessions
        {
            const inProgress = this.chatSessionsService.getInProgress();
            if (inProgress.some(item => item.count > 0)) {
                addSeparator(localize(7470, null), toAction({
                    id: 'workbench.view.chat.status.sessions',
                    label: localize(7471, null),
                    tooltip: localize(7472, null),
                    class: ThemeIcon.asClassName(Codicon.eye),
                    run: () => {
                        this.viewService.openView(ChatViewId, true);
                        this.hoverService.hideHover(true);
                    }
                }));
                for (const { displayName, count } of inProgress) {
                    if (count > 0) {
                        const text = localize(7473, null, displayName);
                        const chatSessionsElement = this.element.appendChild($('div.description'));
                        const parts = renderLabelWithIcons(text);
                        chatSessionsElement.append(...parts);
                    }
                }
            }
        }
        // Contributions
        {
            for (const item of this.chatStatusItemService.getEntries()) {
                addSeparator();
                const itemDisposables = this._store.add(new MutableDisposable());
                let rendered = this.renderContributedChatStatusItem(item);
                itemDisposables.value = rendered.disposables;
                this.element.appendChild(rendered.element);
                this._store.add(this.chatStatusItemService.onDidChange(e => {
                    if (e.entry.id === item.id) {
                        const previousElement = rendered.element;
                        rendered = this.renderContributedChatStatusItem(e.entry);
                        itemDisposables.value = rendered.disposables;
                        previousElement.replaceWith(rendered.element);
                    }
                }));
            }
        }
        // Settings
        {
            const chatSentiment = this.chatEntitlementService.sentiment;
            addSeparator(localize(7474, null), chatSentiment.installed && !chatSentiment.disabled && !chatSentiment.untrusted && defaultChat?.completionsEnablementSetting ? toAction({
                id: 'workbench.action.openChatSettings',
                label: localize(7475, null),
                tooltip: localize(7476, null),
                class: ThemeIcon.asClassName(Codicon.settingsGear),
                run: () => this.runCommandAndClose(() => this.commandService.executeCommand('workbench.action.openSettings', { query: `@id:${defaultChat?.completionsEnablementSetting} @id:${defaultChat?.nextEditSuggestionsSetting}` })),
            }) : undefined);
            this.createSettings(this.element, this._store);
        }
        // Model Selection
        {
            const providers = this.languageFeaturesService.inlineCompletionsProvider.allNoModel();
            const provider = providers.find(p => p.modelInfo && p.modelInfo.models.length > 0);
            if (provider) {
                const modelInfo = provider.modelInfo;
                const currentModel = modelInfo.models.find(m => m.id === modelInfo.currentModelId);
                if (currentModel) {
                    const modelContainer = this.element.appendChild($('div.model-selection'));
                    modelContainer.appendChild($('span.model-text', undefined, localize(7477, null)));
                    const actionBar = modelContainer.appendChild($('div.model-action-bar'));
                    const toolbar = this._store.add(new ActionBar(actionBar, { hoverDelegate: nativeHoverDelegate }));
                    toolbar.push([toAction({
                            id: 'workbench.action.selectInlineCompletionsModel',
                            label: currentModel.name,
                            tooltip: localize(7478, null),
                            class: ThemeIcon.asClassName(Codicon.gear),
                            run: async () => {
                                await this.showModelPicker(provider);
                            }
                        })], { icon: false, label: true });
                }
            }
        }
        // Provider Options
        {
            const providers = this.languageFeaturesService.inlineCompletionsProvider.allNoModel();
            for (const provider of providers) {
                if (provider.providerOptions && provider.providerOptions.length > 0) {
                    for (const option of provider.providerOptions) {
                        const currentValue = option.values.find(v => v.id === option.currentValueId);
                        if (currentValue) {
                            const optionContainer = this.element.appendChild($('div.suggest-option-selection'));
                            optionContainer.appendChild($('span.suggest-option-text', undefined, option.label));
                            const actionBar = optionContainer.appendChild($('div.suggest-option-action-bar'));
                            const toolbar = this._store.add(new ActionBar(actionBar, { hoverDelegate: nativeHoverDelegate }));
                            toolbar.push([toAction({
                                    id: `workbench.action.selectProviderOption.${option.id}`,
                                    label: currentValue.label,
                                    tooltip: localize(7479, null, option.label),
                                    run: async () => {
                                        await this.showProviderOptionPicker(provider, option);
                                    }
                                })], { icon: false, label: true });
                        }
                    }
                }
            }
        }
        // Completions Snooze
        if (this.canUseChat()) {
            const snooze = append(this.element, $('div.snooze-completions'));
            this.createCompletionsSnooze(snooze, localize(7480, null), this._store);
        }
        // New to Chat / Signed out
        {
            const newUser = isNewUser(this.chatEntitlementService);
            const anonymousUser = this.chatEntitlementService.anonymous;
            const disabled = this.chatEntitlementService.sentiment.disabled || this.chatEntitlementService.sentiment.untrusted;
            const signedOut = this.chatEntitlementService.entitlement === ChatEntitlement.Unknown;
            if (newUser || signedOut || disabled) {
                addSeparator();
                let descriptionText;
                let descriptionClass = '.description';
                if (newUser && anonymousUser) {
                    descriptionText = new MarkdownString(localize(7481, null, defaultChat?.provider?.default?.name ?? 'GitHub', defaultChat?.provider?.default?.name ?? 'GitHub', defaultChat?.termsStatementUrl ?? '', defaultChat?.privacyStatementUrl ?? ''), { isTrusted: true });
                    descriptionClass = `${descriptionClass}.terms`;
                }
                else if (newUser) {
                    descriptionText = localize(7482, null);
                }
                else if (anonymousUser) {
                    descriptionText = localize(7483, null);
                }
                else if (disabled) {
                    descriptionText = localize(7484, null);
                }
                else {
                    descriptionText = localize(7485, null);
                }
                let buttonLabel;
                if (newUser) {
                    buttonLabel = localize(7486, null);
                }
                else if (anonymousUser) {
                    buttonLabel = localize(7487, null);
                }
                else if (disabled) {
                    buttonLabel = localize(7488, null);
                }
                else {
                    buttonLabel = localize(7489, null);
                }
                let commandId;
                if (newUser && anonymousUser) {
                    commandId = 'workbench.action.chat.triggerSetupAnonymousWithoutDialog';
                }
                else {
                    commandId = 'workbench.action.chat.triggerSetup';
                }
                if (typeof descriptionText === 'string') {
                    this.element.appendChild($(`div${descriptionClass}`, undefined, descriptionText));
                }
                else {
                    this.element.appendChild($(`div${descriptionClass}`, undefined, this._store.add(this.markdownRendererService.render(descriptionText)).element));
                }
                const button = this._store.add(new Button(this.element, { ...defaultButtonStyles, hoverDelegate: nativeHoverDelegate }));
                button.label = buttonLabel;
                this._store.add(button.onDidClick(() => this.runCommandAndClose(commandId)));
            }
        }
    }
    canUseChat() {
        if (!this.chatEntitlementService.sentiment.installed || this.chatEntitlementService.sentiment.disabled || this.chatEntitlementService.sentiment.untrusted) {
            return false; // chat not installed or not enabled
        }
        if (this.chatEntitlementService.entitlement === ChatEntitlement.Unknown || this.chatEntitlementService.entitlement === ChatEntitlement.Available) {
            return this.chatEntitlementService.anonymous; // signed out or not-yet-signed-up users can only use Chat if anonymous access is allowed
        }
        if (this.chatEntitlementService.entitlement === ChatEntitlement.Free && this.chatEntitlementService.quotas.chat?.percentRemaining === 0 && this.chatEntitlementService.quotas.completions?.percentRemaining === 0) {
            return false; // free user with no quota left
        }
        return true;
    }
    getUsageTitle() {
        const planName = getChatPlanName(this.chatEntitlementService.entitlement);
        return localize(7490, null, planName);
    }
    renderHeader(container, disposables, label, action) {
        const header = container.appendChild($('div.header', undefined, label ?? ''));
        if (action) {
            const toolbar = disposables.add(new ActionBar(header, { hoverDelegate: nativeHoverDelegate }));
            toolbar.push([action], { icon: true, label: false });
        }
    }
    renderContributedChatStatusItem(item) {
        const disposables = new DisposableStore();
        const itemElement = $('div.contribution');
        const headerLabel = typeof item.label === 'string' ? item.label : item.label.label;
        const headerLink = typeof item.label === 'string' ? undefined : item.label.link;
        this.renderHeader(itemElement, disposables, headerLabel, headerLink ? toAction({
            id: 'workbench.action.openChatStatusItemLink',
            label: localize(7491, null),
            tooltip: localize(7492, null),
            class: ThemeIcon.asClassName(Codicon.linkExternal),
            run: () => this.runCommandAndClose(() => this.openerService.open(URI.parse(headerLink))),
        }) : undefined);
        const itemBody = itemElement.appendChild($('div.body'));
        const description = itemBody.appendChild($('span.description'));
        this.renderTextPlus(description, item.description, disposables);
        if (item.detail) {
            const detail = itemBody.appendChild($('div.detail-item'));
            this.renderTextPlus(detail, item.detail, disposables);
        }
        return { element: itemElement, disposables };
    }
    renderTextPlus(target, text, store) {
        for (const node of parseLinkedText(text).nodes) {
            if (typeof node === 'string') {
                const parts = renderLabelWithIcons(node);
                target.append(...parts);
            }
            else {
                store.add(new Link(target, node, undefined, this.hoverService, this.openerService));
            }
        }
    }
    runCommandAndClose(commandOrFn, ...args) {
        if (typeof commandOrFn === 'function') {
            commandOrFn(...args);
        }
        else {
            this.telemetryService.publicLog2('workbenchActionExecuted', { id: commandOrFn, from: 'chat-status' });
            this.commandService.executeCommand(commandOrFn, ...args);
        }
        this.hoverService.hideHover(true);
    }
    createQuotaIndicator(container, disposables, quota, label, supportsOverage) {
        const quotaValue = $('span.quota-value');
        const quotaBit = $('div.quota-bit');
        const overageLabel = $('span.overage-label');
        const quotaIndicator = container.appendChild($('div.quota-indicator', undefined, $('div.quota-label', undefined, $('span', undefined, label), quotaValue), $('div.quota-bar', undefined, quotaBit), $('div.description', undefined, overageLabel)));
        if (supportsOverage && (this.chatEntitlementService.entitlement === ChatEntitlement.Pro || this.chatEntitlementService.entitlement === ChatEntitlement.ProPlus)) {
            const manageOverageButton = disposables.add(new Button(quotaIndicator, { ...defaultButtonStyles, secondary: true, hoverDelegate: nativeHoverDelegate }));
            manageOverageButton.label = localize(7493, null);
            disposables.add(manageOverageButton.onDidClick(() => this.runCommandAndClose(() => this.openerService.open(URI.parse(defaultChat?.manageOverageUrl ?? '')))));
        }
        const update = (quota) => {
            quotaIndicator.classList.remove('error');
            quotaIndicator.classList.remove('warning');
            let usedPercentage;
            if (typeof quota === 'string' || quota.unlimited) {
                usedPercentage = 0;
            }
            else {
                usedPercentage = Math.max(0, 100 - quota.percentRemaining);
            }
            if (typeof quota === 'string') {
                quotaValue.textContent = quota;
            }
            else if (quota.unlimited) {
                quotaValue.textContent = localize(7494, null);
            }
            else if (quota.overageCount) {
                quotaValue.textContent = localize(7495, null, this.quotaOverageFormatter.value.format(quota.overageCount));
            }
            else {
                quotaValue.textContent = localize(7496, null, this.quotaPercentageFormatter.value.format(usedPercentage));
            }
            quotaBit.style.width = `${usedPercentage}%`;
            const overageEnabled = supportsOverage && typeof quota !== 'string' && quota?.overageEnabled;
            if (usedPercentage >= 90 && !overageEnabled) {
                quotaIndicator.classList.add('error');
            }
            else if (usedPercentage >= 75 && !overageEnabled) {
                quotaIndicator.classList.add('warning');
            }
            if (supportsOverage) {
                if (typeof quota !== 'string' && quota.unlimited) {
                    overageLabel.textContent = '';
                }
                else if (typeof quota !== 'string' && quota?.overageEnabled) {
                    overageLabel.replaceChildren(localize(7497, null), $('br'), localize(7498, null));
                }
                else {
                    overageLabel.textContent = localize(7499, null);
                }
            }
            else {
                overageLabel.textContent = '';
            }
        };
        update(quota);
        return update;
    }
    createSettings(container, disposables) {
        const modeId = this.editorService.activeTextEditorLanguageId;
        const settings = container.appendChild($('div.settings'));
        // --- Inline Suggestions
        {
            const globalSetting = append(settings, $('div.setting'));
            this.createInlineSuggestionsSetting(globalSetting, localize(7500, null), '*', disposables);
            if (modeId) {
                const languageSetting = append(settings, $('div.setting'));
                this.createInlineSuggestionsSetting(languageSetting, localize(7501, null, this.languageService.getLanguageName(modeId) ?? modeId), modeId, disposables);
            }
        }
        // --- Next edit suggestions
        {
            const setting = append(settings, $('div.setting'));
            this.createNextEditSuggestionsSetting(setting, localize(7502, null), this.getCompletionsSettingAccessor(modeId), disposables);
        }
        return settings;
    }
    createSetting(container, settingIdsToReEvaluate, label, accessor, disposables) {
        const checkbox = disposables.add(new Checkbox(label, Boolean(accessor.readSetting()), { ...defaultCheckboxStyles }));
        container.appendChild(checkbox.domNode);
        const settingLabel = append(container, $('span.setting-label', undefined, label));
        disposables.add(Gesture.addTarget(settingLabel));
        [EventType.CLICK, TouchEventType.Tap].forEach(eventType => {
            disposables.add(addDisposableListener(settingLabel, eventType, e => {
                if (checkbox?.enabled) {
                    EventHelper.stop(e, true);
                    checkbox.checked = !checkbox.checked;
                    accessor.writeSetting(checkbox.checked);
                    checkbox.focus();
                }
            }));
        });
        disposables.add(checkbox.onChange(() => {
            accessor.writeSetting(checkbox.checked);
        }));
        disposables.add(this.configurationService.onDidChangeConfiguration(e => {
            if (settingIdsToReEvaluate.some(id => e.affectsConfiguration(id))) {
                checkbox.checked = Boolean(accessor.readSetting());
            }
        }));
        if (!this.canUseChat()) {
            container.classList.add('disabled');
            checkbox.disable();
            checkbox.checked = false;
        }
        return checkbox;
    }
    createInlineSuggestionsSetting(container, label, modeId, disposables) {
        this.createSetting(container, [defaultChat.completionsEnablementSetting], label, this.getCompletionsSettingAccessor(modeId), disposables);
    }
    getCompletionsSettingAccessor(modeId = '*') {
        const settingId = defaultChat?.completionsEnablementSetting ?? 'missing.setting';
        return {
            readSetting: () => isCompletionsEnabled(this.configurationService, modeId),
            writeSetting: (value) => {
                this.telemetryService.publicLog2('chatStatus.settingChanged', {
                    settingIdentifier: settingId,
                    settingMode: modeId,
                    settingEnablement: value ? 'enabled' : 'disabled'
                });
                let result = this.configurationService.getValue(settingId);
                if (!isObject(result)) {
                    result = Object.create(null);
                }
                return this.configurationService.updateValue(settingId, { ...result, [modeId]: value });
            }
        };
    }
    createNextEditSuggestionsSetting(container, label, completionsSettingAccessor, disposables) {
        const nesSettingId = defaultChat?.nextEditSuggestionsSetting ?? '';
        const completionsSettingId = defaultChat?.completionsEnablementSetting ?? '';
        const resource = EditorResourceAccessor.getOriginalUri(this.editorService.activeEditor, { supportSideBySide: SideBySideEditor.PRIMARY });
        const checkbox = this.createSetting(container, [nesSettingId, completionsSettingId], label, {
            readSetting: () => completionsSettingAccessor.readSetting() && this.textResourceConfigurationService.getValue(resource, nesSettingId),
            writeSetting: (value) => {
                this.telemetryService.publicLog2('chatStatus.settingChanged', {
                    settingIdentifier: nesSettingId,
                    settingEnablement: value ? 'enabled' : 'disabled'
                });
                return this.textResourceConfigurationService.updateValue(resource, nesSettingId, value);
            }
        }, disposables);
        // enablement of NES depends on completions setting
        // so we have to update our checkbox state accordingly
        if (!completionsSettingAccessor.readSetting()) {
            container.classList.add('disabled');
            checkbox.disable();
        }
        disposables.add(this.configurationService.onDidChangeConfiguration(e => {
            if (e.affectsConfiguration(completionsSettingId)) {
                if (completionsSettingAccessor.readSetting() && this.canUseChat()) {
                    checkbox.enable();
                    container.classList.remove('disabled');
                }
                else {
                    checkbox.disable();
                    container.classList.add('disabled');
                }
            }
        }));
    }
    createCompletionsSnooze(container, label, disposables) {
        const isEnabled = () => {
            const completionsEnabled = isCompletionsEnabled(this.configurationService);
            const completionsEnabledActiveLanguage = isCompletionsEnabled(this.configurationService, this.editorService.activeTextEditorLanguageId);
            return completionsEnabled || completionsEnabledActiveLanguage;
        };
        const button = disposables.add(new Button(container, { disabled: !isEnabled(), ...defaultButtonStyles, hoverDelegate: nativeHoverDelegate, secondary: true }));
        const timerDisplay = container.appendChild($('span.snooze-label'));
        const actionBar = container.appendChild($('div.snooze-action-bar'));
        const toolbar = disposables.add(new ActionBar(actionBar, { hoverDelegate: nativeHoverDelegate }));
        const cancelAction = toAction({
            id: 'workbench.action.cancelSnoozeStatusBarLink',
            label: localize(7503, null),
            run: () => this.inlineCompletionsService.cancelSnooze(),
            class: ThemeIcon.asClassName(Codicon.stopCircle)
        });
        const update = (isEnabled) => {
            container.classList.toggle('disabled', !isEnabled);
            toolbar.clear();
            const timeLeftMs = this.inlineCompletionsService.snoozeTimeLeft;
            if (!isEnabled || timeLeftMs <= 0) {
                timerDisplay.textContent = localize(7504, null);
                timerDisplay.title = '';
                button.label = label;
                button.setTitle(localize(7505, null));
                return true;
            }
            const timeLeftSeconds = Math.ceil(timeLeftMs / 1000);
            const minutes = Math.floor(timeLeftSeconds / 60);
            const seconds = timeLeftSeconds % 60;
            timerDisplay.textContent = `${minutes}:${seconds < 10 ? '0' : ''}${seconds} ${localize(7506, null)}`;
            timerDisplay.title = localize(7507, null);
            button.label = localize(7508, null);
            button.setTitle(localize(7509, null));
            toolbar.push([cancelAction], { icon: true, label: false });
            return false;
        };
        // Update every second if there's time remaining
        const timerDisposables = disposables.add(new DisposableStore());
        function updateIntervalTimer() {
            timerDisposables.clear();
            const enabled = isEnabled();
            if (update(enabled)) {
                return;
            }
            timerDisposables.add(disposableWindowInterval(getWindow(container), () => update(enabled), 1000));
        }
        updateIntervalTimer();
        disposables.add(button.onDidClick(() => {
            this.inlineCompletionsService.snooze();
            update(isEnabled());
        }));
        disposables.add(this.configurationService.onDidChangeConfiguration(e => {
            if (defaultChat?.completionsEnablementSetting && e.affectsConfiguration(defaultChat.completionsEnablementSetting)) {
                button.enabled = isEnabled();
            }
            updateIntervalTimer();
        }));
        disposables.add(this.inlineCompletionsService.onDidChangeIsSnoozing(e => {
            updateIntervalTimer();
        }));
    }
    async showModelPicker(provider) {
        if (!provider.modelInfo || !provider.setModelId) {
            return;
        }
        const modelInfo = provider.modelInfo;
        const items = modelInfo.models.map(model => ({
            id: model.id,
            label: model.name,
            description: model.id === modelInfo.currentModelId ? localize(7510, null) : undefined,
            picked: model.id === modelInfo.currentModelId
        }));
        const selected = await this.quickInputService.pick(items, {
            placeHolder: localize(7511, null, provider.displayName || 'inline completions'),
            canPickMany: false
        });
        if (selected && selected.id && selected.id !== modelInfo.currentModelId) {
            await provider.setModelId(selected.id);
        }
        this.hoverService.hideHover(true);
    }
    async showProviderOptionPicker(provider, option) {
        if (!provider.setProviderOption) {
            return;
        }
        const items = option.values.map(value => ({
            id: value.id,
            label: value.label,
            description: value.id === option.currentValueId ? localize(7512, null) : undefined,
            picked: value.id === option.currentValueId,
        }));
        const selected = await this.quickInputService.pick(items, {
            placeHolder: localize(7513, null, option.label),
            canPickMany: false
        });
        if (selected && selected.id && selected.id !== option.currentValueId) {
            await provider.setProviderOption(option.id, selected.id);
        }
        this.hoverService.hideHover(true);
    }
};
ChatStatusDashboard = __decorate([
    __param(0, IChatEntitlementService),
    __param(1, IChatStatusItemService),
    __param(2, ICommandService),
    __param(3, IConfigurationService),
    __param(4, IEditorService),
    __param(5, IHoverService),
    __param(6, ILanguageService),
    __param(7, IOpenerService),
    __param(8, ITelemetryService),
    __param(9, ITextResourceConfigurationService),
    __param(10, IInlineCompletionsService),
    __param(11, IChatSessionsService),
    __param(12, IMarkdownRendererService),
    __param(13, ILanguageFeaturesService),
    __param(14, IQuickInputService),
    __param(15, IViewsService)
], ChatStatusDashboard);
export { ChatStatusDashboard };
//# sourceMappingURL=chatStatusDashboard.js.map