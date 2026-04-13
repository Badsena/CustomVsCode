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
var AgentSessionsModel_1, AgentSessionsCache_1;
import { ThrottledDelayer } from '../../../../../base/common/async.js';
import { Codicon } from '../../../../../base/common/codicons.js';
import { Emitter } from '../../../../../base/common/event.js';
import { Disposable, DisposableMap } from '../../../../../base/common/lifecycle.js';
import { ResourceMap } from '../../../../../base/common/map.js';
import { safeStringify } from '../../../../../base/common/objects.js';
import { ThemeIcon } from '../../../../../base/common/themables.js';
import { URI } from '../../../../../base/common/uri.js';
import { localize } from '../../../../../nls.js';
import { IInstantiationService } from '../../../../../platform/instantiation/common/instantiation.js';
import { ILogService, LogLevel } from '../../../../../platform/log/common/log.js';
import { IProductService } from '../../../../../platform/product/common/productService.js';
import { Registry } from '../../../../../platform/registry/common/platform.js';
import { IStorageService } from '../../../../../platform/storage/common/storage.js';
import { IWorkspaceContextService } from '../../../../../platform/workspace/common/workspace.js';
import { IWorkspaceTrustManagementService } from '../../../../../platform/workspace/common/workspaceTrust.js';
import { IChatEntitlementService } from '../../../../services/chat/common/chatEntitlementService.js';
import { IWorkbenchEnvironmentService } from '../../../../services/environment/common/environmentService.js';
import { ILifecycleService } from '../../../../services/lifecycle/common/lifecycle.js';
import { Extensions, IOutputService } from '../../../../services/output/common/output.js';
import { IChatSessionsService, isSessionInProgressStatus } from '../../common/chatSessionsService.js';
import { getChatSessionType } from '../../common/model/chatUri.js';
import { IChatWidgetService } from '../chat.js';
import { AgentSessionProviders, getAgentSessionProvider, getAgentSessionProviderIcon, getAgentSessionProviderName, isBuiltInAgentSessionProvider } from './agentSessions.js';
//#region Interfaces, Types
export { ChatSessionStatus as AgentSessionStatus, isSessionInProgressStatus } from '../../common/chatSessionsService.js';
/**
 * Checks if the provided changes object represents valid diff information.
 */
export function hasValidDiff(changes) {
    if (!changes) {
        return false;
    }
    if (changes instanceof Array) {
        return changes.length > 0;
    }
    return changes.files > 0 || changes.insertions > 0 || changes.deletions > 0;
}
/**
 * Gets a summary of agent session changes, converting from array format to object format if needed.
 */
export function getAgentChangesSummary(changes) {
    if (!changes) {
        return;
    }
    if (!(changes instanceof Array)) {
        return changes;
    }
    let insertions = 0;
    let deletions = 0;
    for (const change of changes) {
        insertions += change.insertions;
        deletions += change.deletions;
    }
    return { files: changes.length, insertions, deletions };
}
export function isLocalAgentSessionItem(session) {
    return session.providerType === AgentSessionProviders.Local;
}
export function isAgentSession(obj) {
    const session = obj;
    return URI.isUri(session?.resource)
        && typeof session.isArchived === 'function'
        && typeof session.setArchived === 'function'
        && typeof session.isPinned === 'function'
        && typeof session.setPinned === 'function'
        && typeof session.isRead === 'function'
        && typeof session.isMarkedUnread === 'function'
        && typeof session.setRead === 'function';
}
export function isAgentSessionsModel(obj) {
    const sessionsModel = obj;
    return Array.isArray(sessionsModel?.sessions) && typeof sessionsModel?.getSession === 'function';
}
export var AgentSessionSection;
(function (AgentSessionSection) {
    // Pinned Grouping
    AgentSessionSection["Pinned"] = "pinned";
    // Date Grouping
    AgentSessionSection["Today"] = "today";
    AgentSessionSection["Yesterday"] = "yesterday";
    AgentSessionSection["Week"] = "week";
    AgentSessionSection["Older"] = "older";
    AgentSessionSection["Archived"] = "archived";
    // Capped Grouping
    AgentSessionSection["More"] = "more";
    // Repository Grouping
    AgentSessionSection["Repository"] = "repository";
})(AgentSessionSection || (AgentSessionSection = {}));
export function isAgentSessionSection(obj) {
    const candidate = obj;
    return typeof candidate.section === 'string' && Array.isArray(candidate.sessions);
}
export function isMarshalledAgentSessionContext(thing) {
    if (typeof thing === 'object' && thing !== null) {
        const candidate = thing;
        return candidate.$mid === 25 /* MarshalledId.AgentSessionContext */ && typeof candidate.session === 'object' && candidate.session !== null;
    }
    return false;
}
//#endregion
//#region Sessions Logger
const agentSessionsOutputChannelId = 'agentSessionsOutput';
const agentSessionsOutputChannelLabel = localize(6242, null);
function statusToString(status) {
    switch (status) {
        case 0 /* AgentSessionStatus.Failed */: return 'Failed';
        case 1 /* AgentSessionStatus.Completed */: return 'Completed';
        case 2 /* AgentSessionStatus.InProgress */: return 'InProgress';
        case 3 /* AgentSessionStatus.NeedsInput */: return 'NeedsInput';
        default: return `Unknown(${status})`;
    }
}
let AgentSessionsLogger = class AgentSessionsLogger extends Disposable {
    constructor(getSessionsData, logService, outputService, chatEntitlementService) {
        super();
        this.getSessionsData = getSessionsData;
        this.logService = logService;
        this.outputService = outputService;
        this.chatEntitlementService = chatEntitlementService;
        this.isChannelRegistered = false;
        this.updateChannelRegistration();
        this.registerListeners();
    }
    updateChannelRegistration() {
        const chatDisabled = this.chatEntitlementService.sentiment.hidden;
        if (chatDisabled && this.isChannelRegistered) {
            Registry.as(Extensions.OutputChannels).removeChannel(agentSessionsOutputChannelId);
            this.isChannelRegistered = false;
        }
        else if (!chatDisabled && !this.isChannelRegistered) {
            Registry.as(Extensions.OutputChannels).registerChannel({
                id: agentSessionsOutputChannelId,
                label: agentSessionsOutputChannelLabel,
                log: false
            });
            this.isChannelRegistered = true;
        }
    }
    registerListeners() {
        this._register(this.logService.onDidChangeLogLevel(level => {
            if (level === LogLevel.Trace) {
                this.logAllStatsIfTrace('Log level changed to trace');
            }
        }));
        this._register(this.chatEntitlementService.onDidChangeSentiment(() => {
            this.updateChannelRegistration();
        }));
    }
    logIfTrace(msg) {
        if (this.logService.getLevel() !== LogLevel.Trace) {
            return;
        }
        this.trace(`[Agent Sessions] ${msg}`);
    }
    logAllStatsIfTrace(reason) {
        if (this.logService.getLevel() !== LogLevel.Trace) {
            return;
        }
        this.logAllSessions(reason);
        this.logSessionStates();
    }
    logAllSessions(reason) {
        const { sessions, sessionStates } = this.getSessionsData();
        const lines = [];
        lines.push(`=== Agent Sessions (${reason}) ===`);
        let count = 0;
        for (const session of sessions) {
            count++;
            const state = sessionStates.get(session.resource);
            lines.push(`--- Session: ${session.label} ---`);
            lines.push(`  Resource: ${session.resource.toString()}`);
            lines.push(`  Provider Type: ${session.providerType}`);
            lines.push(`  Provider Label: ${session.providerLabel}`);
            lines.push(`  Status: ${statusToString(session.status)}`);
            lines.push(`  Icon: ${session.icon.id}`);
            if (session.description) {
                lines.push(`  Description: ${typeof session.description === 'string' ? session.description : session.description.value}`);
            }
            if (session.badge) {
                lines.push(`  Badge: ${typeof session.badge === 'string' ? session.badge : session.badge.value}`);
            }
            if (session.tooltip) {
                lines.push(`  Tooltip: ${typeof session.tooltip === 'string' ? session.tooltip : session.tooltip.value}`);
            }
            // Timing info
            lines.push(`  Timing:`);
            lines.push(`    Created: ${session.timing.created ? new Date(session.timing.created).toISOString() : 'N/A'}`);
            lines.push(`    Last Request Started: ${session.timing.lastRequestStarted ? new Date(session.timing.lastRequestStarted).toISOString() : 'N/A'}`);
            lines.push(`    Last Request Ended: ${session.timing.lastRequestEnded ? new Date(session.timing.lastRequestEnded).toISOString() : 'N/A'}`);
            // Changes info
            if (session.changes) {
                const summary = getAgentChangesSummary(session.changes);
                if (summary) {
                    lines.push(`  Changes: ${summary.files} files, +${summary.insertions} -${summary.deletions}`);
                }
            }
            // Our state (read/unread, archived)
            lines.push(`  State:`);
            lines.push(`    Archived (provider): ${session.archived ?? 'N/A'}`);
            lines.push(`    Archived (computed): ${session.isArchived()}`);
            lines.push(`    Archived (stored): ${state?.archived ?? 'N/A'}`);
            lines.push(`    Pinned: ${session.isPinned()}`);
            lines.push(`    Pinned (stored): ${state?.pinned ?? 'N/A'}`);
            lines.push(`    Read: ${session.isRead()}`);
            lines.push(`    Read date (stored): ${state?.read ? new Date(state.read).toISOString() : 'N/A'}`);
            lines.push('');
        }
        lines.unshift(`Total sessions: ${count}`, '');
        lines.push(`=== End Agent Sessions ===`);
        this.trace(lines.join('\n'));
    }
    logSessionStates() {
        const { sessionStates } = this.getSessionsData();
        const lines = [];
        lines.push(`=== Session States ===`);
        lines.push(`Total stored states: ${sessionStates.size}`);
        lines.push('');
        for (const [resource, state] of sessionStates) {
            lines.push(`URI: ${resource.toString()}`);
            lines.push(`  Archived: ${state.archived}`);
            lines.push(`  Pinned: ${state.pinned}`);
            lines.push(`  Read: ${state.read ? new Date(state.read).toISOString() : '0 (unread)'}`);
            lines.push('');
        }
        lines.push(`=== End Session States ===`);
        this.trace(lines.join('\n'));
    }
    trace(msg) {
        const channel = this.outputService.getChannel(agentSessionsOutputChannelId);
        if (!channel) {
            return;
        }
        channel.append(`${msg}\n`);
    }
};
AgentSessionsLogger = __decorate([
    __param(1, ILogService),
    __param(2, IOutputService),
    __param(3, IChatEntitlementService)
], AgentSessionsLogger);
//#endregion
let AgentSessionsModel = class AgentSessionsModel extends Disposable {
    static { AgentSessionsModel_1 = this; }
    get resolved() { return this._resolved; }
    get sessions() {
        const sessions = Array.from(this._sessions.values());
        if (this.environmentService.isSessionsWindow) {
            return sessions.filter(session => session.providerType !== AgentSessionProviders.Claude && session.providerType !== AgentSessionProviders.Codex); // filter out sessions that can currently not be triggered in the sessions app (TODO@bpasero revisit later)
        }
        return sessions;
    }
    constructor(chatSessionsService, lifecycleService, instantiationService, storageService, productService, chatWidgetService, workspaceContextService, workspaceTrustManagementService, chatEntitlementService, environmentService) {
        super();
        this.chatSessionsService = chatSessionsService;
        this.lifecycleService = lifecycleService;
        this.instantiationService = instantiationService;
        this.storageService = storageService;
        this.productService = productService;
        this.chatWidgetService = chatWidgetService;
        this.workspaceContextService = workspaceContextService;
        this.workspaceTrustManagementService = workspaceTrustManagementService;
        this.chatEntitlementService = chatEntitlementService;
        this.environmentService = environmentService;
        this._onWillResolve = this._register(new Emitter());
        this.onWillResolve = this._onWillResolve.event;
        this._onDidResolve = this._register(new Emitter());
        this.onDidResolve = this._onDidResolve.event;
        this._onDidChangeSessions = this._register(new Emitter());
        this.onDidChangeSessions = this._onDidChangeSessions.event;
        this._onDidChangeSessionArchivedState = this._register(new Emitter());
        this.onDidChangeSessionArchivedState = this._onDidChangeSessionArchivedState.event;
        this._resolved = false;
        this.resolvers = this._register(new DisposableMap());
        this._sessions = new ResourceMap();
        this.cache = this.instantiationService.createInstance(AgentSessionsCache);
        for (const data of this.cache.loadCachedSessions()) {
            const session = this.toAgentSession(data);
            this._sessions.set(session.resource, session);
        }
        this.sessionStates = this.cache.loadSessionStates();
        this.logger = this._register(this.instantiationService.createInstance(AgentSessionsLogger, () => ({
            sessions: this._sessions.values(),
            sessionStates: this.sessionStates,
        })));
        this.logger.logAllStatsIfTrace('Loaded cached sessions');
        this.readDateBaseline = this.resolveReadDateBaseline(); // we use this to account for bugfixes in the read/unread tracking
        this.registerListeners();
    }
    registerListeners() {
        // Sessions updates
        this._register(this.chatSessionsService.onDidChangeItemsProviders(({ chatSessionType }) => this.resolve(chatSessionType)));
        this._register(this.chatSessionsService.onDidChangeAvailability(() => this.resolve(undefined)));
        this._register(this.chatSessionsService.onDidChangeSessionItems((delta) => {
            const changedChatSessionTypes = new Set();
            for (const resource of delta.addedOrUpdated ?? []) {
                changedChatSessionTypes.add(getChatSessionType(resource.resource));
            }
            for (const resource of delta.removed ?? []) {
                changedChatSessionTypes.add(getChatSessionType(resource));
            }
            for (const chatSessionType of changedChatSessionTypes) {
                this.resolveProvider(chatSessionType, { refreshProvider: false /* skip because we react on an event already */ });
            }
        }));
        this._register(this.workspaceContextService.onDidChangeWorkspaceFolders(() => this.resolve(undefined)));
        this._register(this.workspaceTrustManagementService.onDidChangeTrust(() => this.resolve(undefined)));
        // State
        this._register(this.storageService.onWillSaveState(() => {
            this.cache.saveCachedSessions(Array.from(this._sessions.values()));
            this.cache.saveSessionStates(this.sessionStates);
        }));
    }
    getSession(resource) {
        return this._sessions.get(resource);
    }
    async resolve(provider) {
        const providers = Array.isArray(provider)
            ? provider
            : provider !== undefined
                ? [provider]
                : this.chatSessionsService.getRegisteredChatSessionItemProviders();
        await Promise.all(providers.map(provider => this.resolveProvider(provider, { refreshProvider: true })));
    }
    resolveProvider(provider, options) {
        if (this.chatEntitlementService.sentiment.hidden) {
            return Promise.resolve(); // don't resolve if AI features are disabled
        }
        let resolver = this.resolvers.get(provider);
        if (!resolver) {
            resolver = new ThrottledDelayer(500);
            this.resolvers.set(provider, resolver);
        }
        return resolver.trigger(async (token) => {
            if (token.isCancellationRequested || this.lifecycleService.willShutdown) {
                return;
            }
            try {
                this._onWillResolve.fire(provider);
                return await this.doResolveProvider(provider, options, token);
            }
            catch (error) {
                this.logger.logIfTrace(`Error resolving sessions for provider ${provider}: ${error instanceof Error ? error.stack : String(error)}`);
            }
            finally {
                this._onDidResolve.fire(provider);
            }
        });
    }
    async doResolveProvider(provider, options, token) {
        if (options.refreshProvider) {
            await this.chatSessionsService.refreshChatSessionItems([provider], token);
        }
        const mapSessionContributionToType = new Map();
        for (const contribution of this.chatSessionsService.getAllChatSessionContributions()) {
            mapSessionContributionToType.set(contribution.type, contribution);
        }
        // Phase 1: Fetch new items for this provider (async, may interleave with other providers)
        const sessions = new ResourceMap();
        for await (const { chatSessionType, items: providerSessions } of this.chatSessionsService.getChatSessionItems([provider], token)) {
            if (token.isCancellationRequested) {
                return;
            }
            for (const session of providerSessions) {
                let icon;
                let providerLabel;
                const agentSessionProvider = getAgentSessionProvider(chatSessionType);
                if (agentSessionProvider !== undefined) {
                    providerLabel = getAgentSessionProviderName(agentSessionProvider);
                    icon = getAgentSessionProviderIcon(agentSessionProvider);
                }
                else {
                    providerLabel = mapSessionContributionToType.get(chatSessionType)?.name ?? chatSessionType;
                    icon = session.iconPath ?? Codicon.terminal;
                }
                const changes = session.changes;
                const normalizedChanges = changes && !(changes instanceof Array)
                    ? { files: changes.files, insertions: changes.insertions, deletions: changes.deletions }
                    : changes;
                sessions.set(session.resource, this.toAgentSession({
                    providerType: chatSessionType,
                    providerLabel,
                    resource: session.resource,
                    label: session.label.split('\n')[0], // protect against weird multi-line labels that break our layout
                    description: session.description,
                    icon,
                    badge: session.badge,
                    tooltip: session.tooltip,
                    status: session.status ?? 1 /* AgentSessionStatus.Completed */,
                    archived: session.archived,
                    timing: session.timing,
                    changes: normalizedChanges,
                    metadata: session.metadata,
                }));
            }
        }
        // Phase 2: Atomically update sessions (sync - reads latest this._sessions
        // so concurrent updateItems calls for other providers don't lose data)
        for (const [, session] of this._sessions) {
            if (session.providerType !== provider &&
                !sessions.has(session.resource) &&
                (isBuiltInAgentSessionProvider(session.providerType) || mapSessionContributionToType.has(session.providerType))) {
                sessions.set(session.resource, session);
            }
        }
        this._sessions = sessions;
        this._resolved = true;
        this.logger.logAllStatsIfTrace('Sessions resolved from providers');
        this._onDidChangeSessions.fire();
    }
    toAgentSession(data) {
        return {
            ...data,
            isArchived: () => this.isArchived(data),
            setArchived: (archived) => this.setArchived(data, archived),
            isPinned: () => this.isPinned(data),
            setPinned: (pinned) => this.setPinned(data, pinned),
            isRead: () => this.isRead(data),
            isMarkedUnread: () => this.isMarkedUnread(data),
            setRead: (read) => this.setRead(data, read),
        };
    }
    //#region States
    static { this.UNREAD_MARKER = -1; }
    isArchived(session) {
        return this.sessionStates.get(session.resource)?.archived ?? Boolean(session.archived);
    }
    setArchived(session, archived) {
        if (archived) {
            this.setRead(session, true); // mark as read when archiving
        }
        if (archived === this.isArchived(session)) {
            return; // no change
        }
        const state = this.sessionStates.get(session.resource) ?? {};
        this.sessionStates.set(session.resource, { ...state, archived });
        const agentSession = this._sessions.get(session.resource);
        if (agentSession) {
            this._onDidChangeSessionArchivedState.fire(agentSession);
        }
        this._onDidChangeSessions.fire();
    }
    isPinned(session) {
        return this.sessionStates.get(session.resource)?.pinned ?? false;
    }
    setPinned(session, pinned) {
        if (pinned === this.isPinned(session)) {
            return; // no change
        }
        const state = this.sessionStates.get(session.resource) ?? {};
        this.sessionStates.set(session.resource, { ...state, pinned });
        this._onDidChangeSessions.fire();
    }
    isMarkedUnread(session) {
        return this.sessionStates.get(session.resource)?.read === AgentSessionsModel_1.UNREAD_MARKER;
    }
    isRead(session) {
        if (this.isArchived(session)) {
            return true; // archived sessions are always read
        }
        const storedReadDate = this.sessionStates.get(session.resource)?.read;
        if (storedReadDate === AgentSessionsModel_1.UNREAD_MARKER) {
            return false;
        }
        const readDate = Math.max(storedReadDate ?? 0, this.readDateBaseline /* Use read date baseline when no read date is stored */);
        // Install a heuristic to reduce false positives: a user might observe
        // the output of a session and quickly click on another session before
        // it is finished. Strictly speaking the session is unread, but we
        // allow a certain threshold of time to count as read to accommodate.
        if (readDate >= this.sessionTimeForReadStateTracking(session) - 2000) {
            return true;
        }
        // Never consider a session as unread if its connected to a widget
        return !!this.chatWidgetService.getWidgetBySessionResource(session.resource);
    }
    sessionTimeForReadStateTracking(session) {
        return session.timing.lastRequestEnded ?? session.timing.created;
    }
    setRead(session, read, skipEvent) {
        const state = this.sessionStates.get(session.resource) ?? {};
        let newRead;
        if (read) {
            newRead = Math.max(Date.now(), this.sessionTimeForReadStateTracking(session));
            if (typeof state.read === 'number' && state.read >= newRead) {
                return; // already read with a sufficient timestamp
            }
        }
        else {
            newRead = AgentSessionsModel_1.UNREAD_MARKER;
            if (state.read === AgentSessionsModel_1.UNREAD_MARKER) {
                return; // already unread
            }
        }
        this.sessionStates.set(session.resource, { ...state, read: newRead });
        if (!skipEvent) {
            this._onDidChangeSessions.fire();
        }
    }
    static { this.READ_DATE_BASELINE_KEY = 'agentSessions.readDateBaseline2'; }
    resolveReadDateBaseline() {
        let readDateBaseline = this.storageService.getNumber(AgentSessionsModel_1.READ_DATE_BASELINE_KEY, 1 /* StorageScope.WORKSPACE */, 0);
        if (readDateBaseline > 0) {
            return readDateBaseline; // already resolved
        }
        // For stable, preserve unread state for sessions from the last 7 days
        // For other qualities, mark all sessions as read
        readDateBaseline = this.productService.quality === 'stable'
            ? Date.now() - (7 * 24 * 60 * 60 * 1000)
            : Date.now();
        this.storageService.store(AgentSessionsModel_1.READ_DATE_BASELINE_KEY, readDateBaseline, 1 /* StorageScope.WORKSPACE */, 1 /* StorageTarget.MACHINE */);
        return readDateBaseline;
    }
};
AgentSessionsModel = AgentSessionsModel_1 = __decorate([
    __param(0, IChatSessionsService),
    __param(1, ILifecycleService),
    __param(2, IInstantiationService),
    __param(3, IStorageService),
    __param(4, IProductService),
    __param(5, IChatWidgetService),
    __param(6, IWorkspaceContextService),
    __param(7, IWorkspaceTrustManagementService),
    __param(8, IChatEntitlementService),
    __param(9, IWorkbenchEnvironmentService)
], AgentSessionsModel);
export { AgentSessionsModel };
let AgentSessionsCache = class AgentSessionsCache {
    static { AgentSessionsCache_1 = this; }
    static { this.SESSIONS_STORAGE_KEY = 'agentSessions.model.cache'; }
    static { this.STATE_STORAGE_KEY = 'agentSessions.state.cache'; }
    constructor(storageService) {
        this.storageService = storageService;
    }
    //#region Sessions
    saveCachedSessions(sessions) {
        const serialized = sessions.map(session => ({
            providerType: session.providerType,
            providerLabel: session.providerLabel,
            resource: session.resource.toString(),
            icon: session.icon.id,
            label: session.label,
            description: session.description,
            badge: session.badge,
            tooltip: session.tooltip,
            status: isSessionInProgressStatus(session.status) ? 1 /* AgentSessionStatus.Completed */ : session.status, // never cache sessions as in progress, this needs to be live state
            archived: session.archived,
            timing: session.timing,
            changes: session.changes,
            metadata: session.metadata
        }));
        this.storageService.store(AgentSessionsCache_1.SESSIONS_STORAGE_KEY, safeStringify(serialized), 1 /* StorageScope.WORKSPACE */, 1 /* StorageTarget.MACHINE */);
    }
    loadCachedSessions() {
        const sessionsCache = this.storageService.get(AgentSessionsCache_1.SESSIONS_STORAGE_KEY, 1 /* StorageScope.WORKSPACE */);
        if (!sessionsCache) {
            return [];
        }
        try {
            const cached = JSON.parse(sessionsCache);
            return cached.map((session) => ({
                providerType: session.providerType,
                providerLabel: session.providerLabel,
                resource: typeof session.resource === 'string' ? URI.parse(session.resource) : URI.revive(session.resource),
                icon: ThemeIcon.fromId(session.icon),
                label: session.label,
                description: session.description,
                badge: session.badge,
                tooltip: session.tooltip,
                status: session.status,
                archived: session.archived,
                timing: {
                    // Support loading both new and old cache formats (TODO@bpasero remove old format support after some time)
                    created: session.timing.created ?? session.timing.startTime ?? 0,
                    lastRequestStarted: session.timing.lastRequestStarted ?? session.timing.startTime,
                    lastRequestEnded: session.timing.lastRequestEnded ?? session.timing.endTime,
                },
                changes: Array.isArray(session.changes) ? session.changes.map((change) => ({
                    modifiedUri: URI.revive(change.modifiedUri),
                    originalUri: change.originalUri ? URI.revive(change.originalUri) : undefined,
                    insertions: change.insertions,
                    deletions: change.deletions,
                })) : session.changes,
                metadata: session.metadata,
            }));
        }
        catch {
            return []; // invalid data in storage, fallback to empty sessions list
        }
    }
    //#endregion
    //#region States
    saveSessionStates(states) {
        const serialized = Array.from(states.entries()).map(([resource, state]) => ({
            resource: resource.toString(),
            archived: state.archived,
            pinned: state.pinned,
            read: state.read
        }));
        this.storageService.store(AgentSessionsCache_1.STATE_STORAGE_KEY, JSON.stringify(serialized), 1 /* StorageScope.WORKSPACE */, 1 /* StorageTarget.MACHINE */);
    }
    loadSessionStates() {
        const states = new ResourceMap();
        const statesCache = this.storageService.get(AgentSessionsCache_1.STATE_STORAGE_KEY, 1 /* StorageScope.WORKSPACE */);
        if (!statesCache) {
            return states;
        }
        try {
            const cached = JSON.parse(statesCache);
            for (const entry of cached) {
                states.set(typeof entry.resource === 'string' ? URI.parse(entry.resource) : URI.revive(entry.resource), {
                    archived: entry.archived,
                    pinned: entry.pinned,
                    read: entry.read
                });
            }
        }
        catch {
            // invalid data in storage, fallback to empty states
        }
        return states;
    }
};
AgentSessionsCache = AgentSessionsCache_1 = __decorate([
    __param(0, IStorageService)
], AgentSessionsCache);
//#endregion
//# sourceMappingURL=agentSessionsModel.js.map