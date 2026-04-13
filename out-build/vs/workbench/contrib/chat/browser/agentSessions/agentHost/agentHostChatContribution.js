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
var AgentHostContribution_1;
import { Disposable, DisposableMap, DisposableStore, toDisposable } from '../../../../../../base/common/lifecycle.js';
import { URI } from '../../../../../../base/common/uri.js';
import { IConfigurationService } from '../../../../../../platform/configuration/common/configuration.js';
import { IAgentHostService, AgentHostEnabledSettingId } from '../../../../../../platform/agentHost/common/agentService.js';
import { isSessionAction } from '../../../../../../platform/agentHost/common/state/sessionActions.js';
import { SessionClientState } from '../../../../../../platform/agentHost/common/state/sessionClientState.js';
import { ROOT_STATE_URI } from '../../../../../../platform/agentHost/common/state/sessionState.js';
import { IDefaultAccountService } from '../../../../../../platform/defaultAccount/common/defaultAccount.js';
import { IInstantiationService } from '../../../../../../platform/instantiation/common/instantiation.js';
import { ILogService, LogLevel } from '../../../../../../platform/log/common/log.js';
import { Registry } from '../../../../../../platform/registry/common/platform.js';
import { IAuthenticationService } from '../../../../../services/authentication/common/authentication.js';
import { Extensions, IOutputService } from '../../../../../services/output/common/output.js';
import { IChatSessionsService } from '../../../common/chatSessionsService.js';
import { ILanguageModelsService } from '../../../common/languageModels.js';
import { AgentHostLanguageModelProvider } from './agentHostLanguageModelProvider.js';
import { AgentHostSessionHandler } from './agentHostSessionHandler.js';
import { AgentHostSessionListController } from './agentHostSessionListController.js';
export { AgentHostSessionHandler } from './agentHostSessionHandler.js';
export { AgentHostSessionListController } from './agentHostSessionListController.js';
/**
 * Discovers available agents from the agent host process and dynamically
 * registers each one as a chat session type with its own session handler,
 * list controller, and language model provider.
 *
 * Gated on the `chat.agentHost.enabled` setting.
 */
let AgentHostContribution = class AgentHostContribution extends Disposable {
    static { AgentHostContribution_1 = this; }
    static { this.ID = 'workbench.contrib.agentHostContribution'; }
    static { this._outputChannelId = 'agentHostIpc'; }
    constructor(_agentHostService, _chatSessionsService, _defaultAccountService, _authenticationService, _logService, _languageModelsService, _outputService, _instantiationService, configurationService) {
        super();
        this._agentHostService = _agentHostService;
        this._chatSessionsService = _chatSessionsService;
        this._defaultAccountService = _defaultAccountService;
        this._authenticationService = _authenticationService;
        this._logService = _logService;
        this._languageModelsService = _languageModelsService;
        this._outputService = _outputService;
        this._instantiationService = _instantiationService;
        this._isChannelRegistered = false;
        this._agentRegistrations = this._register(new DisposableMap());
        /** Model providers keyed by agent provider, for pushing model updates. */
        this._modelProviders = new Map();
        if (!configurationService.getValue(AgentHostEnabledSettingId)) {
            return;
        }
        this._setupIpcLogging();
        // Shared client state for protocol reconciliation
        this._clientState = this._register(new SessionClientState(this._agentHostService.clientId, this._logService));
        // Forward action envelopes from the host to client state
        this._register(this._agentHostService.onDidAction(envelope => {
            // Only root actions are relevant here; session actions are
            // handled by individual session handlers.
            if (!isSessionAction(envelope.action)) {
                this._clientState.receiveEnvelope(envelope);
            }
        }));
        // Forward notifications to client state
        this._register(this._agentHostService.onDidNotification(n => {
            this._clientState.receiveNotification(n);
        }));
        // React to root state changes (agent discovery / removal)
        this._register(this._clientState.onDidChangeRootState(rootState => {
            this._handleRootStateChange(rootState);
        }));
        this._initializeAndSubscribe();
    }
    // ---- IPC output channel (trace-level only) ------------------------------
    _setupIpcLogging() {
        this._updateOutputChannel();
        this._register(this._logService.onDidChangeLogLevel(() => this._updateOutputChannel()));
        // Subscribe to action / notification streams for IPC logging
        this._register(this._agentHostService.onDidAction(e => {
            this._traceIpc('event', 'onDidAction', e);
        }));
        this._register(this._agentHostService.onDidNotification(e => {
            this._traceIpc('event', 'onDidNotification', e);
        }));
    }
    _updateOutputChannel() {
        const isTrace = this._logService.getLevel() === LogLevel.Trace;
        const registry = Registry.as(Extensions.OutputChannels);
        if (isTrace && !this._isChannelRegistered) {
            registry.registerChannel({
                id: AgentHostContribution_1._outputChannelId,
                label: 'Agent Host IPC',
                log: false,
                languageId: 'log',
            });
            this._isChannelRegistered = true;
            this._outputChannel = undefined; // force re-fetch
        }
        else if (!isTrace && this._isChannelRegistered) {
            registry.removeChannel(AgentHostContribution_1._outputChannelId);
            this._isChannelRegistered = false;
            this._outputChannel = undefined;
        }
    }
    _traceIpc(direction, method, data) {
        if (this._logService.getLevel() !== LogLevel.Trace) {
            return;
        }
        if (!this._outputChannel) {
            this._outputChannel = this._outputService.getChannel(AgentHostContribution_1._outputChannelId);
            if (!this._outputChannel) {
                return;
            }
        }
        const timestamp = new Date().toISOString();
        let payload;
        try {
            payload = data !== undefined ? JSON.stringify(data, (_key, value) => {
                if (value && typeof value === 'object' && value.$mid !== undefined && value.scheme !== undefined) {
                    return URI.revive(value).toString();
                }
                return value;
            }, 2) : '';
        }
        catch {
            payload = String(data);
        }
        const arrow = direction === 'call' ? '>>' : direction === 'result' ? '<<' : '**';
        this._outputChannel.append(`[${timestamp}] [trace] ${arrow} ${method}${payload ? `\n${payload}` : ''}\n`);
    }
    async _initializeAndSubscribe() {
        try {
            const snapshot = await this._agentHostService.subscribe(URI.parse(ROOT_STATE_URI));
            if (this._store.isDisposed) {
                return;
            }
            // Feed snapshot into client state — fires onDidChangeRootState
            this._clientState.handleSnapshot(ROOT_STATE_URI, snapshot.state, snapshot.fromSeq);
        }
        catch (err) {
            this._logService.error('[AgentHost] Failed to subscribe to root state', err);
        }
    }
    _handleRootStateChange(rootState) {
        const incoming = new Set(rootState.agents.map(a => a.provider));
        // Remove agents that are no longer present
        for (const [provider] of this._agentRegistrations) {
            if (!incoming.has(provider)) {
                this._agentRegistrations.deleteAndDispose(provider);
                this._modelProviders.delete(provider);
            }
        }
        // Register new agents and push model updates to existing ones
        for (const agent of rootState.agents) {
            if (!this._agentRegistrations.has(agent.provider)) {
                this._registerAgent(agent);
            }
            else {
                // Push updated models to existing model provider
                const modelProvider = this._modelProviders.get(agent.provider);
                modelProvider?.updateModels(agent.models);
            }
        }
    }
    _registerAgent(agent) {
        const store = new DisposableStore();
        this._agentRegistrations.set(agent.provider, store);
        const sessionType = `agent-host-${agent.provider}`;
        const agentId = sessionType;
        const vendor = sessionType;
        // Chat session contribution
        store.add(this._chatSessionsService.registerChatSessionContribution({
            type: sessionType,
            name: agentId,
            displayName: agent.displayName,
            description: agent.description,
            canDelegate: true,
            requiresCustomModels: true,
        }));
        // Session list controller
        const listController = store.add(this._instantiationService.createInstance(AgentHostSessionListController, sessionType, agent.provider, this._agentHostService, undefined));
        store.add(this._chatSessionsService.registerChatSessionItemController(sessionType, listController));
        // Session handler
        const sessionHandler = store.add(this._instantiationService.createInstance(AgentHostSessionHandler, {
            provider: agent.provider,
            agentId,
            sessionType,
            fullName: agent.displayName,
            description: agent.description,
            connection: this._agentHostService,
        }));
        store.add(this._chatSessionsService.registerChatSessionContentProvider(sessionType, sessionHandler));
        // Language model provider
        const vendorDescriptor = { vendor, displayName: agent.displayName, configuration: undefined, managementCommand: undefined, when: undefined };
        this._languageModelsService.deltaLanguageModelChatProviderDescriptors([vendorDescriptor], []);
        store.add(toDisposable(() => this._languageModelsService.deltaLanguageModelChatProviderDescriptors([], [vendorDescriptor])));
        const modelProvider = store.add(new AgentHostLanguageModelProvider(sessionType, vendor));
        modelProvider.updateModels(agent.models);
        this._modelProviders.set(agent.provider, modelProvider);
        store.add(toDisposable(() => this._modelProviders.delete(agent.provider)));
        store.add(this._languageModelsService.registerLanguageModelProvider(vendor, modelProvider));
        // Push auth token and refresh models from server
        this._pushAuthToken().then(() => this._agentHostService.refreshModels()).catch(() => { });
        store.add(this._defaultAccountService.onDidChangeDefaultAccount(() => this._pushAuthToken().then(() => this._agentHostService.refreshModels()).catch(() => { })));
        store.add(this._authenticationService.onDidChangeSessions(() => this._pushAuthToken().then(() => this._agentHostService.refreshModels()).catch(() => { })));
    }
    async _pushAuthToken() {
        try {
            const account = await this._defaultAccountService.getDefaultAccount();
            if (!account) {
                return;
            }
            const sessions = await this._authenticationService.getSessions(account.authenticationProvider.id);
            const session = sessions.find(s => s.id === account.sessionId);
            if (session) {
                await this._agentHostService.setAuthToken(session.accessToken);
            }
        }
        catch {
            // best-effort
        }
    }
};
AgentHostContribution = AgentHostContribution_1 = __decorate([
    __param(0, IAgentHostService),
    __param(1, IChatSessionsService),
    __param(2, IDefaultAccountService),
    __param(3, IAuthenticationService),
    __param(4, ILogService),
    __param(5, ILanguageModelsService),
    __param(6, IOutputService),
    __param(7, IInstantiationService),
    __param(8, IConfigurationService)
], AgentHostContribution);
export { AgentHostContribution };
//# sourceMappingURL=agentHostChatContribution.js.map