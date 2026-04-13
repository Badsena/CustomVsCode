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
var ChatEntitlementContext_1;
import product from '../../../../platform/product/common/product.js';
import { Barrier } from '../../../../base/common/async.js';
import { CancellationToken, CancellationTokenSource } from '../../../../base/common/cancellation.js';
import { Emitter, Event } from '../../../../base/common/event.js';
import { Lazy } from '../../../../base/common/lazy.js';
import { Disposable, MutableDisposable } from '../../../../base/common/lifecycle.js';
import { localize } from '../../../../nls.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { IContextKeyService, RawContextKey } from '../../../../platform/contextkey/common/contextkey.js';
import { IDialogService } from '../../../../platform/dialogs/common/dialogs.js';
import { createDecorator, IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { IProductService } from '../../../../platform/product/common/productService.js';
import { asText, IRequestService } from '../../../../platform/request/common/request.js';
import { IStorageService } from '../../../../platform/storage/common/storage.js';
import { ITelemetryService } from '../../../../platform/telemetry/common/telemetry.js';
import { IAuthenticationService } from '../../authentication/common/authentication.js';
import { IOpenerService } from '../../../../platform/opener/common/opener.js';
import { URI } from '../../../../base/common/uri.js';
import Severity from '../../../../base/common/severity.js';
import { IWorkbenchEnvironmentService } from '../../environment/common/environmentService.js';
import { isWeb } from '../../../../base/common/platform.js';
import { ILifecycleService } from '../../lifecycle/common/lifecycle.js';
import { registerSingleton } from '../../../../platform/instantiation/common/extensions.js';
import { observableFromEvent } from '../../../../base/common/observable.js';
import { IDefaultAccountService } from '../../../../platform/defaultAccount/common/defaultAccount.js';
export var ChatEntitlementContextKeys;
(function (ChatEntitlementContextKeys) {
    ChatEntitlementContextKeys.Setup = {
        hidden: new RawContextKey('chatSetupHidden', false, true), // True when chat setup is explicitly hidden.
        installed: new RawContextKey('chatSetupInstalled', false, true), // True when the chat extension is installed and enabled.
        disabled: new RawContextKey('chatSetupDisabled', false, true), // True when the chat extension is disabled due to any other reason than workspace trust.
        untrusted: new RawContextKey('chatSetupUntrusted', false, true), // True when the chat extension is disabled due to workspace trust.
        later: new RawContextKey('chatSetupLater', false, true), // True when the user wants to finish setup later.
        registered: new RawContextKey('chatSetupRegistered', false, true) // True when the user has registered as Free or Pro user.
    };
    ChatEntitlementContextKeys.Entitlement = {
        signedOut: new RawContextKey('chatEntitlementSignedOut', false, true), // True when user is signed out.
        canSignUp: new RawContextKey('chatPlanCanSignUp', false, true), // True when user can sign up to be a chat free user.
        planFree: new RawContextKey('chatPlanFree', false, true), // True when user is a chat free user.
        planPro: new RawContextKey('chatPlanPro', false, true), // True when user is a chat pro user.
        planProPlus: new RawContextKey('chatPlanProPlus', false, true), // True when user is a chat pro plus user.
        planBusiness: new RawContextKey('chatPlanBusiness', false, true), // True when user is a chat business user.
        planEnterprise: new RawContextKey('chatPlanEnterprise', false, true), // True when user is a chat enterprise user.
        organisations: new RawContextKey('chatEntitlementOrganisations', undefined, true), // The organizations the user belongs to.
        internal: new RawContextKey('chatEntitlementInternal', false, true), // True when user belongs to internal organisation.
        sku: new RawContextKey('chatEntitlementSku', undefined, true), // The SKU of the user.
    };
    ChatEntitlementContextKeys.chatQuotaExceeded = new RawContextKey('chatQuotaExceeded', false, true);
    ChatEntitlementContextKeys.completionsQuotaExceeded = new RawContextKey('completionsQuotaExceeded', false, true);
    ChatEntitlementContextKeys.chatAnonymous = new RawContextKey('chatAnonymous', false, true);
})(ChatEntitlementContextKeys || (ChatEntitlementContextKeys = {}));
export const IChatEntitlementService = createDecorator('chatEntitlementService');
export var ChatEntitlement;
(function (ChatEntitlement) {
    /** Signed out */
    ChatEntitlement[ChatEntitlement["Unknown"] = 1] = "Unknown";
    /** Signed in but not yet resolved */
    ChatEntitlement[ChatEntitlement["Unresolved"] = 2] = "Unresolved";
    /** Signed in and entitled to Free */
    ChatEntitlement[ChatEntitlement["Available"] = 3] = "Available";
    /** Signed in but not entitled to Free */
    ChatEntitlement[ChatEntitlement["Unavailable"] = 4] = "Unavailable";
    /** Signed-up to Free */
    ChatEntitlement[ChatEntitlement["Free"] = 5] = "Free";
    /** Signed-up to Pro */
    ChatEntitlement[ChatEntitlement["Pro"] = 6] = "Pro";
    /** Signed-up to Pro Plus */
    ChatEntitlement[ChatEntitlement["ProPlus"] = 7] = "ProPlus";
    /** Signed-up to Business */
    ChatEntitlement[ChatEntitlement["Business"] = 8] = "Business";
    /** Signed-up to Enterprise */
    ChatEntitlement[ChatEntitlement["Enterprise"] = 9] = "Enterprise";
})(ChatEntitlement || (ChatEntitlement = {}));
//#region Helper Functions
/**
 * Checks the chat entitlements to see if the user falls into the paid category
 * @param chatEntitlement The chat entitlement to check
 * @returns Whether or not they are a paid user
 */
export function isProUser(chatEntitlement) {
    return chatEntitlement === ChatEntitlement.Pro ||
        chatEntitlement === ChatEntitlement.ProPlus ||
        chatEntitlement === ChatEntitlement.Business ||
        chatEntitlement === ChatEntitlement.Enterprise;
}
/**
 * Gets the full plan name for the given chat entitlement
 * @param chatEntitlement The chat entitlement to get the plan name for
 * @returns The localized full plan name (e.g., "Copilot Pro", "Copilot Free")
 */
export function getChatPlanName(chatEntitlement) {
    switch (chatEntitlement) {
        case ChatEntitlement.Pro:
            return localize(18080, null);
        case ChatEntitlement.ProPlus:
            return localize(18081, null);
        case ChatEntitlement.Business:
            return localize(18082, null);
        case ChatEntitlement.Enterprise:
            return localize(18083, null);
        default:
            return localize(18084, null);
    }
}
//#region Service Implementation
const defaultChatAgent = {
    upgradePlanUrl: product.defaultChatAgent?.upgradePlanUrl ?? '',
    providerUriSetting: product.defaultChatAgent?.providerUriSetting ?? '',
    entitlementSignupLimitedUrl: product.defaultChatAgent?.entitlementSignupLimitedUrl ?? '',
    chatQuotaExceededContext: product.defaultChatAgent?.chatQuotaExceededContext ?? '',
    completionsQuotaExceededContext: product.defaultChatAgent?.completionsQuotaExceededContext ?? ''
};
const CHAT_ALLOW_ANONYMOUS_CONFIGURATION_KEY = 'chat.allowAnonymousAccess';
function isAnonymous(configurationService, entitlement, sentiment) {
    if (configurationService.getValue(CHAT_ALLOW_ANONYMOUS_CONFIGURATION_KEY) !== true) {
        return false; // only enabled behind an experimental setting
    }
    if (entitlement !== ChatEntitlement.Unknown) {
        return false; // only consider signed out users
    }
    if (sentiment.hidden || sentiment.disabled) {
        return false; // only consider enabled scenarios
    }
    return true;
}
function logChatEntitlements(state, configurationService, telemetryService) {
    telemetryService.publicLog2('chatEntitlements', {
        chatHidden: Boolean(state.hidden),
        chatDisabled: Boolean(state.disabled),
        chatEntitlement: state.entitlement,
        chatRegistered: Boolean(state.registered),
        chatAnonymous: isAnonymous(configurationService, state.entitlement, state)
    });
}
let ChatEntitlementService = class ChatEntitlementService extends Disposable {
    constructor(instantiationService, productService, environmentService, contextKeyService, configurationService, telemetryService) {
        super();
        this.contextKeyService = contextKeyService;
        this.configurationService = configurationService;
        this.telemetryService = telemetryService;
        //#endregion
        //#region --- Quotas
        this._onDidChangeQuotaExceeded = this._register(new Emitter());
        this.onDidChangeQuotaExceeded = this._onDidChangeQuotaExceeded.event;
        this._onDidChangeQuotaRemaining = this._register(new Emitter());
        this.onDidChangeQuotaRemaining = this._onDidChangeQuotaRemaining.event;
        this._quotas = {};
        this.ExtensionQuotaContextKeys = {
            chatQuotaExceeded: defaultChatAgent.chatQuotaExceededContext,
            completionsQuotaExceeded: defaultChatAgent.completionsQuotaExceededContext,
        };
        this._onDidChangeAnonymous = this._register(new Emitter());
        this.onDidChangeAnonymous = this._onDidChangeAnonymous.event;
        this.anonymousObs = observableFromEvent(this.onDidChangeAnonymous, () => this.anonymous);
        this.chatQuotaExceededContextKey = ChatEntitlementContextKeys.chatQuotaExceeded.bindTo(this.contextKeyService);
        this.completionsQuotaExceededContextKey = ChatEntitlementContextKeys.completionsQuotaExceeded.bindTo(this.contextKeyService);
        this.anonymousContextKey = ChatEntitlementContextKeys.chatAnonymous.bindTo(this.contextKeyService);
        this.anonymousContextKey.set(this.anonymous);
        this.onDidChangeEntitlement = Event.map(Event.filter(this.contextKeyService.onDidChangeContext, e => e.affectsSome(new Set([
            ChatEntitlementContextKeys.Entitlement.planPro.key,
            ChatEntitlementContextKeys.Entitlement.planBusiness.key,
            ChatEntitlementContextKeys.Entitlement.planEnterprise.key,
            ChatEntitlementContextKeys.Entitlement.planProPlus.key,
            ChatEntitlementContextKeys.Entitlement.planFree.key,
            ChatEntitlementContextKeys.Entitlement.canSignUp.key,
            ChatEntitlementContextKeys.Entitlement.signedOut.key,
            ChatEntitlementContextKeys.Entitlement.organisations.key,
            ChatEntitlementContextKeys.Entitlement.internal.key,
            ChatEntitlementContextKeys.Entitlement.sku.key
        ])), this._store), () => { }, this._store);
        this.entitlementObs = observableFromEvent(this.onDidChangeEntitlement, () => this.entitlement);
        this.onDidChangeSentiment = Event.map(Event.filter(this.contextKeyService.onDidChangeContext, e => e.affectsSome(new Set([
            ChatEntitlementContextKeys.Setup.hidden.key,
            ChatEntitlementContextKeys.Setup.disabled.key,
            ChatEntitlementContextKeys.Setup.untrusted.key,
            ChatEntitlementContextKeys.Setup.installed.key,
            ChatEntitlementContextKeys.Setup.later.key,
            ChatEntitlementContextKeys.Setup.registered.key
        ])), this._store), () => { }, this._store);
        this.sentimentObs = observableFromEvent(this.onDidChangeSentiment, () => this.sentiment);
        if ((isWeb && !environmentService.remoteAuthority)) {
            ChatEntitlementContextKeys.Setup.hidden.bindTo(this.contextKeyService).set(true); // hide copilot UI on web if unsupported
            return;
        }
        if (!productService.defaultChatAgent) {
            return; // we need a default chat agent configured going forward from here
        }
        const context = this.context = new Lazy(() => this._register(instantiationService.createInstance(ChatEntitlementContext)));
        this.requests = new Lazy(() => this._register(instantiationService.createInstance(ChatEntitlementRequests, context.value, {
            clearQuotas: () => this.clearQuotas(),
            acceptQuotas: quotas => this.acceptQuotas(quotas)
        })));
        this.registerListeners();
    }
    get entitlement() {
        if (this.contextKeyService.getContextKeyValue(ChatEntitlementContextKeys.Entitlement.planPro.key) === true) {
            return ChatEntitlement.Pro;
        }
        else if (this.contextKeyService.getContextKeyValue(ChatEntitlementContextKeys.Entitlement.planBusiness.key) === true) {
            return ChatEntitlement.Business;
        }
        else if (this.contextKeyService.getContextKeyValue(ChatEntitlementContextKeys.Entitlement.planEnterprise.key) === true) {
            return ChatEntitlement.Enterprise;
        }
        else if (this.contextKeyService.getContextKeyValue(ChatEntitlementContextKeys.Entitlement.planProPlus.key) === true) {
            return ChatEntitlement.ProPlus;
        }
        else if (this.contextKeyService.getContextKeyValue(ChatEntitlementContextKeys.Entitlement.planFree.key) === true) {
            return ChatEntitlement.Free;
        }
        else if (this.contextKeyService.getContextKeyValue(ChatEntitlementContextKeys.Entitlement.canSignUp.key) === true) {
            return ChatEntitlement.Available;
        }
        else if (this.contextKeyService.getContextKeyValue(ChatEntitlementContextKeys.Entitlement.signedOut.key) === true) {
            return ChatEntitlement.Unknown;
        }
        return ChatEntitlement.Unresolved;
    }
    get isInternal() {
        return this.contextKeyService.getContextKeyValue(ChatEntitlementContextKeys.Entitlement.internal.key) === true;
    }
    get organisations() {
        return this.contextKeyService.getContextKeyValue(ChatEntitlementContextKeys.Entitlement.organisations.key);
    }
    get sku() {
        return this.contextKeyService.getContextKeyValue(ChatEntitlementContextKeys.Entitlement.sku.key);
    }
    get copilotTrackingId() {
        return this.context?.value.state.copilotTrackingId;
    }
    get previewFeaturesDisabled() {
        return this.contextKeyService.getContextKeyValue('github.copilot.previewFeaturesDisabled') === true;
    }
    get quotas() { return this._quotas; }
    registerListeners() {
        const quotaExceededSet = new Set([this.ExtensionQuotaContextKeys.chatQuotaExceeded, this.ExtensionQuotaContextKeys.completionsQuotaExceeded]);
        const cts = this._register(new MutableDisposable());
        this._register(this.contextKeyService.onDidChangeContext(e => {
            if (e.affectsSome(quotaExceededSet)) {
                if (cts.value) {
                    cts.value.cancel();
                }
                cts.value = new CancellationTokenSource();
                this.update(cts.value.token);
            }
        }));
        let anonymousUsage = this.anonymous;
        const updateAnonymousUsage = () => {
            const newAnonymousUsage = this.anonymous;
            if (newAnonymousUsage !== anonymousUsage) {
                anonymousUsage = newAnonymousUsage;
                this.anonymousContextKey.set(newAnonymousUsage);
                if (this.context?.hasValue) {
                    logChatEntitlements(this.context.value.state, this.configurationService, this.telemetryService);
                }
                this._onDidChangeAnonymous.fire();
            }
        };
        this._register(this.configurationService.onDidChangeConfiguration(e => {
            if (e.affectsConfiguration(CHAT_ALLOW_ANONYMOUS_CONFIGURATION_KEY)) {
                updateAnonymousUsage();
            }
        }));
        this._register(this.onDidChangeEntitlement(() => updateAnonymousUsage()));
        this._register(this.onDidChangeSentiment(() => updateAnonymousUsage()));
    }
    acceptQuotas(quotas) {
        const oldQuota = this._quotas;
        this._quotas = quotas;
        this.updateContextKeys();
        const { changed: chatChanged } = this.compareQuotas(oldQuota.chat, quotas.chat);
        const { changed: completionsChanged } = this.compareQuotas(oldQuota.completions, quotas.completions);
        const { changed: premiumChatChanged } = this.compareQuotas(oldQuota.premiumChat, quotas.premiumChat);
        if (chatChanged.exceeded || completionsChanged.exceeded || premiumChatChanged.exceeded) {
            this._onDidChangeQuotaExceeded.fire();
        }
        if (chatChanged.remaining || completionsChanged.remaining || premiumChatChanged.remaining) {
            this._onDidChangeQuotaRemaining.fire();
        }
    }
    compareQuotas(oldQuota, newQuota) {
        return {
            changed: {
                exceeded: (oldQuota?.percentRemaining === 0) !== (newQuota?.percentRemaining === 0),
                remaining: oldQuota?.percentRemaining !== newQuota?.percentRemaining
            }
        };
    }
    clearQuotas() {
        this.acceptQuotas({});
    }
    updateContextKeys() {
        this.chatQuotaExceededContextKey.set(this._quotas.chat?.percentRemaining === 0);
        this.completionsQuotaExceededContextKey.set(this._quotas.completions?.percentRemaining === 0);
    }
    get sentiment() {
        return {
            installed: this.contextKeyService.getContextKeyValue(ChatEntitlementContextKeys.Setup.installed.key) === true,
            hidden: this.contextKeyService.getContextKeyValue(ChatEntitlementContextKeys.Setup.hidden.key) === true,
            disabled: this.contextKeyService.getContextKeyValue(ChatEntitlementContextKeys.Setup.disabled.key) === true,
            untrusted: this.contextKeyService.getContextKeyValue(ChatEntitlementContextKeys.Setup.untrusted.key) === true,
            later: this.contextKeyService.getContextKeyValue(ChatEntitlementContextKeys.Setup.later.key) === true,
            registered: this.contextKeyService.getContextKeyValue(ChatEntitlementContextKeys.Setup.registered.key) === true
        };
    }
    get anonymous() {
        return isAnonymous(this.configurationService, this.entitlement, this.sentiment);
    }
    //#endregion
    markAnonymousRateLimited() {
        if (!this.anonymous) {
            return;
        }
        this.chatQuotaExceededContextKey.set(true);
        this._onDidChangeQuotaExceeded.fire();
    }
    async update(token) {
        await this.requests?.value.forceResolveEntitlement(token);
    }
};
ChatEntitlementService = __decorate([
    __param(0, IInstantiationService),
    __param(1, IProductService),
    __param(2, IWorkbenchEnvironmentService),
    __param(3, IContextKeyService),
    __param(4, IConfigurationService),
    __param(5, ITelemetryService)
], ChatEntitlementService);
export { ChatEntitlementService };
let ChatEntitlementRequests = class ChatEntitlementRequests extends Disposable {
    constructor(context, chatQuotasAccessor, telemetryService, logService, requestService, dialogService, openerService, lifecycleService, defaultAccountService, authenticationService) {
        super();
        this.context = context;
        this.chatQuotasAccessor = chatQuotasAccessor;
        this.telemetryService = telemetryService;
        this.logService = logService;
        this.requestService = requestService;
        this.dialogService = dialogService;
        this.openerService = openerService;
        this.lifecycleService = lifecycleService;
        this.defaultAccountService = defaultAccountService;
        this.authenticationService = authenticationService;
        this.pendingResolveCts = new CancellationTokenSource();
        this.state = { entitlement: this.context.state.entitlement };
        this.registerListeners();
        this.resolve();
    }
    registerListeners() {
        this._register(this.defaultAccountService.onDidChangeDefaultAccount(() => this.resolve()));
        this._register(this.context.onDidChange(() => {
            if (!this.context.state.installed || this.context.state.disabled || this.context.state.entitlement === ChatEntitlement.Unknown) {
                // When the extension is not installed, disabled or the user is not entitled
                // make sure to clear quotas so that any indicators are also gone
                this.state = { entitlement: this.state.entitlement, quotas: undefined };
                this.chatQuotasAccessor.clearQuotas();
            }
        }));
    }
    async resolve() {
        this.pendingResolveCts.dispose(true);
        const cts = this.pendingResolveCts = new CancellationTokenSource();
        const defaultAccount = await this.defaultAccountService.getDefaultAccount();
        if (cts.token.isCancellationRequested) {
            return;
        }
        // Immediately signal whether we have a session or not
        let state = undefined;
        if (defaultAccount) {
            // Do not overwrite any state we have already
            if (this.state.entitlement === ChatEntitlement.Unknown) {
                state = { entitlement: ChatEntitlement.Unresolved };
            }
        }
        else {
            state = { entitlement: ChatEntitlement.Unknown };
        }
        if (state) {
            this.update(state);
        }
        if (defaultAccount) {
            // Afterwards resolve entitlement with a network request
            // but only unless it was not already resolved before.
            await this.resolveEntitlement(defaultAccount, cts.token);
        }
    }
    async resolveEntitlement(defaultAccount, token) {
        const entitlements = await this.doResolveEntitlement(defaultAccount, token);
        if (typeof entitlements?.entitlement === 'number' && !token.isCancellationRequested) {
            this.update(entitlements);
        }
        return entitlements;
    }
    async doResolveEntitlement(defaultAccount, token) {
        if (token.isCancellationRequested) {
            return undefined;
        }
        const entitlementsData = defaultAccount.entitlementsData;
        if (!entitlementsData) {
            this.logService.trace('[chat entitlement]: no entitlements data available on default account');
            return { entitlement: entitlementsData === null ? ChatEntitlement.Unknown : ChatEntitlement.Unresolved };
        }
        let entitlement;
        if (entitlementsData.access_type_sku === 'free_limited_copilot') {
            entitlement = ChatEntitlement.Free;
        }
        else if (entitlementsData.can_signup_for_limited) {
            entitlement = ChatEntitlement.Available;
        }
        else if (entitlementsData.copilot_plan === 'individual') {
            entitlement = ChatEntitlement.Pro;
        }
        else if (entitlementsData.copilot_plan === 'individual_pro') {
            entitlement = ChatEntitlement.ProPlus;
        }
        else if (entitlementsData.copilot_plan === 'business') {
            entitlement = ChatEntitlement.Business;
        }
        else if (entitlementsData.copilot_plan === 'enterprise') {
            entitlement = ChatEntitlement.Enterprise;
        }
        else {
            entitlement = ChatEntitlement.Unavailable;
        }
        const entitlements = {
            entitlement,
            organisations: entitlementsData.organization_login_list,
            quotas: this.toQuotas(entitlementsData),
            sku: entitlementsData.access_type_sku,
            copilotTrackingId: entitlementsData.analytics_tracking_id
        };
        this.logService.trace(`[chat entitlement]: resolved to ${entitlements.entitlement}, quotas: ${JSON.stringify(entitlements.quotas)}`);
        this.telemetryService.publicLog2('chatInstallEntitlement', {
            entitlement: entitlements.entitlement,
            tid: entitlementsData.analytics_tracking_id,
            sku: entitlements.sku,
            quotaChat: entitlements.quotas?.chat?.remaining,
            quotaPremiumChat: entitlements.quotas?.premiumChat?.remaining,
            quotaCompletions: entitlements.quotas?.completions?.remaining,
            quotaResetDate: entitlements.quotas?.resetDate
        });
        return entitlements;
    }
    toQuotas(entitlementsData) {
        const quotas = {
            resetDate: entitlementsData.quota_reset_date_utc ?? entitlementsData.quota_reset_date ?? entitlementsData.limited_user_reset_date,
            resetDateHasTime: typeof entitlementsData.quota_reset_date_utc === 'string',
        };
        // Legacy Free SKU Quota
        if (entitlementsData.monthly_quotas?.chat && typeof entitlementsData.limited_user_quotas?.chat === 'number') {
            quotas.chat = {
                total: entitlementsData.monthly_quotas.chat,
                remaining: entitlementsData.limited_user_quotas.chat,
                percentRemaining: Math.min(100, Math.max(0, (entitlementsData.limited_user_quotas.chat / entitlementsData.monthly_quotas.chat) * 100)),
                overageEnabled: false,
                overageCount: 0,
                unlimited: false
            };
        }
        if (entitlementsData.monthly_quotas?.completions && typeof entitlementsData.limited_user_quotas?.completions === 'number') {
            quotas.completions = {
                total: entitlementsData.monthly_quotas.completions,
                remaining: entitlementsData.limited_user_quotas.completions,
                percentRemaining: Math.min(100, Math.max(0, (entitlementsData.limited_user_quotas.completions / entitlementsData.monthly_quotas.completions) * 100)),
                overageEnabled: false,
                overageCount: 0,
                unlimited: false
            };
        }
        // New Quota Snapshot
        if (entitlementsData.quota_snapshots) {
            for (const quotaType of ['chat', 'completions', 'premium_interactions']) {
                const rawQuotaSnapshot = entitlementsData.quota_snapshots[quotaType];
                if (!rawQuotaSnapshot) {
                    continue;
                }
                const quotaSnapshot = {
                    total: rawQuotaSnapshot.entitlement,
                    remaining: rawQuotaSnapshot.remaining,
                    percentRemaining: Math.min(100, Math.max(0, rawQuotaSnapshot.percent_remaining)),
                    overageEnabled: rawQuotaSnapshot.overage_permitted,
                    overageCount: rawQuotaSnapshot.overage_count,
                    unlimited: rawQuotaSnapshot.unlimited
                };
                switch (quotaType) {
                    case 'chat':
                        quotas.chat = quotaSnapshot;
                        break;
                    case 'completions':
                        quotas.completions = quotaSnapshot;
                        break;
                    case 'premium_interactions':
                        quotas.premiumChat = quotaSnapshot;
                        break;
                }
            }
        }
        return quotas;
    }
    async request(url, type, body, sessions, token, callSite) {
        let lastRequest;
        for (const session of sessions) {
            if (token.isCancellationRequested) {
                return lastRequest;
            }
            try {
                const response = await this.requestService.request({
                    type,
                    url,
                    data: type === 'POST' ? JSON.stringify(body) : undefined,
                    disableCache: true,
                    headers: {
                        'Authorization': `Bearer ${session.accessToken}`
                    },
                    callSite
                }, token);
                const status = response.res.statusCode;
                if (status && status !== 200) {
                    lastRequest = response;
                    continue; // try next session
                }
                return response;
            }
            catch (error) {
                if (!token.isCancellationRequested) {
                    this.logService.error(`[chat entitlement] request: error ${error}`);
                }
            }
        }
        return lastRequest;
    }
    update(state) {
        this.state = state;
        this.context.update({ entitlement: this.state.entitlement, organisations: this.state.organisations, sku: this.state.sku, copilotTrackingId: this.state.copilotTrackingId });
        if (state.quotas) {
            this.chatQuotasAccessor.acceptQuotas(state.quotas);
        }
    }
    async forceResolveEntitlement(token = CancellationToken.None) {
        const defaultAccount = await this.defaultAccountService.refresh();
        if (!defaultAccount) {
            return undefined;
        }
        return this.resolveEntitlement(defaultAccount, token);
    }
    async signUpFree() {
        const sessions = await this.getSessions();
        if (sessions.length === 0) {
            return undefined;
        }
        return this.doSignUpFree(sessions);
    }
    async doSignUpFree(sessions) {
        const body = {
            restricted_telemetry: this.telemetryService.telemetryLevel === 0 /* TelemetryLevel.NONE */ ? 'disabled' : 'enabled',
            public_code_suggestions: 'enabled'
        };
        const response = await this.request(defaultChatAgent.entitlementSignupLimitedUrl, 'POST', body, sessions, CancellationToken.None, 'chatEntitlementService.signUpFree');
        if (!response) {
            const retry = await this.onUnknownSignUpError(localize(18085, null), '[chat entitlement] sign-up: no response');
            return retry ? this.doSignUpFree(sessions) : { errorCode: 1 };
        }
        if (response.res.statusCode && response.res.statusCode !== 200) {
            if (response.res.statusCode === 422) {
                try {
                    const responseText = await asText(response);
                    if (responseText) {
                        const responseError = JSON.parse(responseText);
                        if (typeof responseError.message === 'string' && responseError.message) {
                            this.onUnprocessableSignUpError(`[chat entitlement] sign-up: unprocessable entity (${responseError.message})`, responseError.message);
                            return { errorCode: response.res.statusCode };
                        }
                    }
                }
                catch (error) {
                    // ignore - handled below
                }
            }
            const retry = await this.onUnknownSignUpError(localize(18086, null, response.res.statusCode), `[chat entitlement] sign-up: unexpected status code ${response.res.statusCode}`);
            return retry ? this.doSignUpFree(sessions) : { errorCode: response.res.statusCode };
        }
        let responseText = null;
        try {
            responseText = await asText(response);
        }
        catch (error) {
            // ignore - handled below
        }
        if (!responseText) {
            const retry = await this.onUnknownSignUpError(localize(18087, null), '[chat entitlement] sign-up: response has no content');
            return retry ? this.doSignUpFree(sessions) : { errorCode: 2 };
        }
        let parsedResult = undefined;
        try {
            parsedResult = JSON.parse(responseText);
            this.logService.trace(`[chat entitlement] sign-up: response is ${responseText}`);
        }
        catch (err) {
            const retry = await this.onUnknownSignUpError(localize(18088, null), `[chat entitlement] sign-up: error parsing response (${err})`);
            return retry ? this.doSignUpFree(sessions) : { errorCode: 3 };
        }
        // We have made it this far, so the user either did sign-up or was signed-up already.
        // That is, because the endpoint throws in all other case according to Patrick.
        this.update({ entitlement: ChatEntitlement.Free });
        return Boolean(parsedResult?.subscribed);
    }
    async getSessions() {
        const defaultAccount = await this.defaultAccountService.getDefaultAccount();
        if (defaultAccount) {
            const sessions = await this.authenticationService.getSessions(defaultAccount.authenticationProvider.id);
            const accountSessions = sessions.filter(s => s.id === defaultAccount.sessionId);
            if (accountSessions.length) {
                return accountSessions;
            }
        }
        return [...(await this.authenticationService.getSessions(this.defaultAccountService.getDefaultAccountAuthenticationProvider().id))];
    }
    async onUnknownSignUpError(detail, logMessage) {
        this.logService.error(logMessage);
        if (!this.lifecycleService.willShutdown) {
            const { confirmed } = await this.dialogService.confirm({
                type: Severity.Error,
                message: localize(18089, null),
                detail,
                primaryButton: localize(18090, null)
            });
            return confirmed;
        }
        return false;
    }
    onUnprocessableSignUpError(logMessage, logDetails) {
        this.logService.error(logMessage);
        if (!this.lifecycleService.willShutdown) {
            this.dialogService.prompt({
                type: Severity.Error,
                message: localize(18091, null),
                detail: logDetails,
                buttons: [
                    {
                        label: localize(18092, null),
                        run: () => { }
                    },
                    {
                        label: localize(18093, null),
                        run: () => this.openerService.open(URI.parse(defaultChatAgent.upgradePlanUrl))
                    }
                ]
            });
        }
    }
    async signIn(options) {
        const defaultAccount = await this.defaultAccountService.signIn({
            additionalScopes: options?.additionalScopes,
            extraAuthorizeParameters: { get_started_with: 'copilot-vscode' },
            provider: options?.useSocialProvider
        });
        if (!defaultAccount) {
            return {};
        }
        const entitlements = await this.doResolveEntitlement(defaultAccount, CancellationToken.None);
        return { defaultAccount, entitlements };
    }
    dispose() {
        this.pendingResolveCts.dispose(true);
        super.dispose();
    }
};
ChatEntitlementRequests = __decorate([
    __param(2, ITelemetryService),
    __param(3, ILogService),
    __param(4, IRequestService),
    __param(5, IDialogService),
    __param(6, IOpenerService),
    __param(7, ILifecycleService),
    __param(8, IDefaultAccountService),
    __param(9, IAuthenticationService)
], ChatEntitlementRequests);
export { ChatEntitlementRequests };
let ChatEntitlementContext = class ChatEntitlementContext extends Disposable {
    static { ChatEntitlementContext_1 = this; }
    static { this.CHAT_ENTITLEMENT_CONTEXT_STORAGE_KEY = 'chat.setupContext'; }
    static { this.CHAT_DISABLED_CONFIGURATION_KEY = 'chat.disableAIFeatures'; }
    get state() { return this.withConfiguration(this.suspendedState ?? this._state); }
    constructor(contextKeyService, storageService, logService, configurationService, telemetryService) {
        super();
        this.storageService = storageService;
        this.logService = logService;
        this.configurationService = configurationService;
        this.telemetryService = telemetryService;
        this.suspendedState = undefined;
        this._onDidChange = this._register(new Emitter());
        this.onDidChange = this._onDidChange.event;
        this.updateBarrier = undefined;
        this.canSignUpContextKey = ChatEntitlementContextKeys.Entitlement.canSignUp.bindTo(contextKeyService);
        this.signedOutContextKey = ChatEntitlementContextKeys.Entitlement.signedOut.bindTo(contextKeyService);
        this.freeContextKey = ChatEntitlementContextKeys.Entitlement.planFree.bindTo(contextKeyService);
        this.proContextKey = ChatEntitlementContextKeys.Entitlement.planPro.bindTo(contextKeyService);
        this.proPlusContextKey = ChatEntitlementContextKeys.Entitlement.planProPlus.bindTo(contextKeyService);
        this.businessContextKey = ChatEntitlementContextKeys.Entitlement.planBusiness.bindTo(contextKeyService);
        this.enterpriseContextKey = ChatEntitlementContextKeys.Entitlement.planEnterprise.bindTo(contextKeyService);
        this.organisationsContextKey = ChatEntitlementContextKeys.Entitlement.organisations.bindTo(contextKeyService);
        this.isInternalContextKey = ChatEntitlementContextKeys.Entitlement.internal.bindTo(contextKeyService);
        this.skuContextKey = ChatEntitlementContextKeys.Entitlement.sku.bindTo(contextKeyService);
        this.hiddenContext = ChatEntitlementContextKeys.Setup.hidden.bindTo(contextKeyService);
        this.laterContext = ChatEntitlementContextKeys.Setup.later.bindTo(contextKeyService);
        this.installedContext = ChatEntitlementContextKeys.Setup.installed.bindTo(contextKeyService);
        this.disabledContext = ChatEntitlementContextKeys.Setup.disabled.bindTo(contextKeyService);
        this.untrustedContext = ChatEntitlementContextKeys.Setup.untrusted.bindTo(contextKeyService);
        this.registeredContext = ChatEntitlementContextKeys.Setup.registered.bindTo(contextKeyService);
        this._state = this.storageService.getObject(ChatEntitlementContext_1.CHAT_ENTITLEMENT_CONTEXT_STORAGE_KEY, 0 /* StorageScope.PROFILE */) ?? { entitlement: ChatEntitlement.Unknown, organisations: undefined, sku: undefined, copilotTrackingId: undefined };
        this.updateContextSync();
        this.registerListeners();
    }
    registerListeners() {
        this._register(this.configurationService.onDidChangeConfiguration(e => {
            if (e.affectsConfiguration(ChatEntitlementContext_1.CHAT_DISABLED_CONFIGURATION_KEY)) {
                this.updateContext();
            }
        }));
    }
    withConfiguration(state) {
        if (this.configurationService.getValue(ChatEntitlementContext_1.CHAT_DISABLED_CONFIGURATION_KEY) === true) {
            return {
                ...state,
                hidden: true // Setting always wins: if AI is disabled, set `hidden: true`
            };
        }
        return state;
    }
    async update(context) {
        this.logService.trace(`[chat entitlement context] update(): ${JSON.stringify(context)}`);
        const oldState = JSON.stringify(this._state);
        if (typeof context.installed === 'boolean' && typeof context.disabled === 'boolean' && typeof context.untrusted === 'boolean') {
            this._state.installed = context.installed;
            this._state.disabled = context.disabled;
            this._state.untrusted = context.untrusted;
            if (context.installed && !context.disabled) {
                context.hidden = false; // treat this as a sign to make Chat visible again in case it is hidden
            }
        }
        if (typeof context.hidden === 'boolean') {
            this._state.hidden = context.hidden;
        }
        if (typeof context.later === 'boolean') {
            this._state.later = context.later;
        }
        if (typeof context.entitlement === 'number') {
            this._state.entitlement = context.entitlement;
            this._state.organisations = context.organisations;
            this._state.sku = context.sku;
            this._state.copilotTrackingId = context.copilotTrackingId;
            if (this._state.entitlement === ChatEntitlement.Free || isProUser(this._state.entitlement)) {
                this._state.registered = true;
            }
            else if (this._state.entitlement === ChatEntitlement.Available) {
                this._state.registered = false; // only reset when signed-in user can sign-up for free
            }
        }
        if (isAnonymous(this.configurationService, this._state.entitlement, this._state)) {
            this._state.sku = 'no_auth_limited_copilot'; // no-auth users have a fixed SKU
        }
        if (oldState === JSON.stringify(this._state)) {
            return; // state did not change
        }
        this.storageService.store(ChatEntitlementContext_1.CHAT_ENTITLEMENT_CONTEXT_STORAGE_KEY, {
            ...this._state,
            later: undefined // do not persist this across restarts for now
        }, 0 /* StorageScope.PROFILE */, 1 /* StorageTarget.MACHINE */);
        return this.updateContext();
    }
    async updateContext() {
        await this.updateBarrier?.wait();
        this.updateContextSync();
    }
    updateContextSync() {
        const state = this.withConfiguration(this._state);
        this.signedOutContextKey.set(state.entitlement === ChatEntitlement.Unknown);
        this.canSignUpContextKey.set(state.entitlement === ChatEntitlement.Available);
        this.freeContextKey.set(state.entitlement === ChatEntitlement.Free);
        this.proContextKey.set(state.entitlement === ChatEntitlement.Pro);
        this.proPlusContextKey.set(state.entitlement === ChatEntitlement.ProPlus);
        this.businessContextKey.set(state.entitlement === ChatEntitlement.Business);
        this.enterpriseContextKey.set(state.entitlement === ChatEntitlement.Enterprise);
        this.organisationsContextKey.set(state.organisations);
        this.isInternalContextKey.set(Boolean(state.organisations?.some(org => org === 'github' || org === 'microsoft' || org === 'ms-copilot' || org === 'MicrosoftCopilot')));
        this.skuContextKey.set(state.sku);
        this.hiddenContext.set(!!state.hidden);
        this.laterContext.set(!!state.later);
        this.installedContext.set(!!state.installed);
        this.disabledContext.set(!!state.disabled);
        this.untrustedContext.set(!!state.untrusted);
        this.registeredContext.set(!!state.registered);
        this.logService.trace(`[chat entitlement context] updateContext(): ${JSON.stringify(state)}`);
        logChatEntitlements(state, this.configurationService, this.telemetryService);
        this._onDidChange.fire();
    }
    suspend() {
        this.suspendedState = { ...this._state };
        this.updateBarrier = new Barrier();
    }
    resume() {
        this.suspendedState = undefined;
        this.updateBarrier?.open();
        this.updateBarrier = undefined;
    }
};
ChatEntitlementContext = ChatEntitlementContext_1 = __decorate([
    __param(0, IContextKeyService),
    __param(1, IStorageService),
    __param(2, ILogService),
    __param(3, IConfigurationService),
    __param(4, ITelemetryService)
], ChatEntitlementContext);
export { ChatEntitlementContext };
//#endregion
registerSingleton(IChatEntitlementService, ChatEntitlementService, 0 /* InstantiationType.Eager */);
//# sourceMappingURL=chatEntitlementService.js.map