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
import { Codicon } from '../../../../base/common/codicons.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { autorun } from '../../../../base/common/observable.js';
import { URI } from '../../../../base/common/uri.js';
import { localize2 } from '../../../../nls.js';
import { Action2, registerAction2 } from '../../../../platform/actions/common/actions.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { getWorkbenchContribution, registerWorkbenchContribution2 } from '../../../../workbench/common/contributions.js';
import { IAgentSessionsService } from '../../../../workbench/contrib/chat/browser/agentSessions/agentSessionsService.js';
import { AgentSessionProviders } from '../../../../workbench/contrib/chat/browser/agentSessions/agentSessions.js';
import { ITerminalService } from '../../../../workbench/contrib/terminal/browser/terminal.js';
import { IPathService } from '../../../../workbench/services/path/common/pathService.js';
import { Menus } from '../../../browser/menus.js';
import { ISessionsManagementService } from '../../sessions/browser/sessionsManagementService.js';
import { IsAuxiliaryWindowContext } from '../../../../workbench/common/contextkeys.js';
import { ContextKeyExpr } from '../../../../platform/contextkey/common/contextkey.js';
import { SessionsWelcomeVisibleContext } from '../../../common/contextkeys.js';
import { IViewsService } from '../../../../workbench/services/views/common/viewsService.js';
import { TERMINAL_VIEW_ID } from '../../../../workbench/contrib/terminal/common/terminal.js';
/**
 * Returns the cwd URI for the given session: worktree or repository path for
 * background sessions only. Returns `undefined` for non-background sessions
 * (Cloud, Local, etc.) which have no local worktree, or when no path is available.
 */
function getSessionCwd(session) {
    if (session?.providerType !== AgentSessionProviders.Background) {
        return undefined;
    }
    return session.worktree ?? session.repository;
}
/**
 * Manages terminal instances in the sessions window, ensuring:
 * - A terminal exists for the active session's worktree (or repository if no worktree).
 * - Terminals are shown/hidden based on their initial cwd matching the active path.
 * - All terminals for a worktree are closed when the session is archived.
 */
let SessionsTerminalContribution = class SessionsTerminalContribution extends Disposable {
    static { this.ID = 'workbench.contrib.sessionsTerminal'; }
    constructor(_sessionsManagementService, _terminalService, _agentSessionsService, _logService, _pathService) {
        super();
        this._sessionsManagementService = _sessionsManagementService;
        this._terminalService = _terminalService;
        this._agentSessionsService = _agentSessionsService;
        this._logService = _logService;
        this._pathService = _pathService;
        // React to active session changes — use worktree/repo for background sessions, home dir otherwise
        this._register(autorun(reader => {
            const session = this._sessionsManagementService.activeSession.read(reader);
            this._onActiveSessionChanged(session);
        }));
        // Hide restored terminals from a previous window session that don't
        // belong to the current active session. These arrive asynchronously
        // during reconnection and would otherwise flash in the foreground.
        this._register(this._terminalService.onDidCreateInstance(instance => {
            if (instance.shellLaunchConfig.attachPersistentProcess && this._activeKey) {
                instance.getInitialCwd().then(cwd => {
                    if (cwd.toLowerCase() !== this._activeKey) {
                        const availableInstance = this._getAvailableTerminal(instance, `hide restored terminal for ${cwd}`);
                        if (!availableInstance) {
                            return;
                        }
                        this._terminalService.moveToBackground(availableInstance);
                        this._logService.trace(`[SessionsTerminal] Hid restored terminal ${availableInstance.instanceId} (cwd: ${cwd})`);
                    }
                });
            }
        }));
        // When a session is archived, close all terminals for its worktree
        this._register(this._agentSessionsService.model.onDidChangeSessionArchivedState(session => {
            if (session.isArchived()) {
                const worktreePath = session.metadata?.worktreePath;
                if (worktreePath) {
                    this._closeTerminalsForPath(URI.file(worktreePath).fsPath);
                }
            }
        }));
    }
    /**
     * Ensures a terminal exists for the given cwd by scanning all terminal
     * instances for a matching initial cwd. If none is found, creates a new
     * one. Sets it as active and optionally focuses it.
     */
    async ensureTerminal(cwd, focus) {
        const key = cwd.fsPath.toLowerCase();
        let existing = await this._findTerminalsForKey(key);
        if (existing.length === 0) {
            try {
                const createdInstance = this._getAvailableTerminal(await this._terminalService.createTerminal({ config: { cwd } }), `activate created terminal for ${cwd.fsPath}`);
                if (!createdInstance) {
                    return [];
                }
                existing = [createdInstance];
                this._terminalService.setActiveInstance(createdInstance);
                this._logService.trace(`[SessionsTerminal] Created terminal ${createdInstance.instanceId} for ${cwd.fsPath}`);
            }
            catch (e) {
                this._logService.trace(`[SessionsTerminal] Cannot create terminal for ${cwd.fsPath}: ${e}`);
                return [];
            }
        }
        if (focus) {
            await this._terminalService.focusActiveInstance();
        }
        return existing;
    }
    async _onActiveSessionChanged(session) {
        if (!session) {
            return;
        }
        const sessionCwd = getSessionCwd(session);
        const targetPath = sessionCwd ?? await this._pathService.userHome();
        const targetKey = targetPath.fsPath.toLowerCase();
        if (this._activeKey === targetKey) {
            return;
        }
        this._activeKey = targetKey;
        const instances = await this.ensureTerminal(targetPath, false);
        // If the active key changed while we were awaiting, a newer call has
        // taken over — skip the visibility update to avoid flicker.
        if (this._activeKey !== targetKey) {
            return;
        }
        await this._updateTerminalVisibility(targetKey, instances.map(instance => instance.instanceId));
    }
    /**
     * Finds the first terminal instance whose initial cwd (lower-cased) matches
     * the given key.
     */
    async _findTerminalsForKey(key) {
        const result = [];
        for (const instance of this._terminalService.instances) {
            try {
                const cwd = await instance.getInitialCwd();
                if (cwd.toLowerCase() === key) {
                    result.push(instance);
                }
            }
            catch {
                // ignore terminals whose cwd cannot be resolved
            }
        }
        return result;
    }
    _getAvailableTerminal(instance, action) {
        const currentInstance = this._terminalService.getInstanceFromId(instance.instanceId);
        if (!currentInstance || currentInstance.isDisposed) {
            this._logService.trace(`[SessionsTerminal] Cannot ${action}; terminal ${instance.instanceId} is no longer available`);
            return undefined;
        }
        return currentInstance;
    }
    /**
     * Shows background terminals whose initial cwd matches the active key and
     * hides foreground terminals whose initial cwd does not match.
     */
    async _updateTerminalVisibility(activeKey, forceForegroundTerminalIds) {
        const toShow = [];
        const toHide = [];
        for (const instance of [...this._terminalService.instances]) {
            let cwd;
            try {
                cwd = (await instance.getInitialCwd()).toLowerCase();
            }
            catch {
                continue;
            }
            const currentInstance = this._getAvailableTerminal(instance, `update visibility for ${cwd}`);
            if (!currentInstance) {
                continue;
            }
            const isForeground = this._terminalService.foregroundInstances.includes(currentInstance);
            const isForceVisible = forceForegroundTerminalIds.includes(currentInstance.instanceId);
            const belongsToActiveSession = cwd === activeKey;
            if ((belongsToActiveSession || isForceVisible) && !isForeground) {
                toShow.push(currentInstance);
            }
            else if (!belongsToActiveSession && !isForceVisible && isForeground) {
                toHide.push(currentInstance);
            }
        }
        for (const instance of toShow) {
            const availableInstance = this._getAvailableTerminal(instance, 'show background terminal');
            if (availableInstance) {
                await this._terminalService.showBackgroundTerminal(availableInstance, true);
            }
        }
        for (const instance of toHide) {
            const availableInstance = this._getAvailableTerminal(instance, 'move terminal to background');
            if (availableInstance) {
                this._terminalService.moveToBackground(availableInstance);
            }
        }
        // Set the terminal with the most recent command as active
        const foreground = this._terminalService.foregroundInstances;
        let mostRecent;
        let mostRecentTimestamp = -1;
        for (const instance of foreground) {
            const cmdDetection = instance.capabilities.get(2 /* TerminalCapability.CommandDetection */);
            const lastCmd = cmdDetection?.commands.at(-1);
            if (lastCmd && lastCmd.timestamp > mostRecentTimestamp) {
                mostRecentTimestamp = lastCmd.timestamp;
                mostRecent = instance;
            }
        }
        if (mostRecent) {
            this._terminalService.setActiveInstance(mostRecent);
        }
    }
    async _closeTerminalsForPath(fsPath) {
        const key = fsPath.toLowerCase();
        for (const instance of [...this._terminalService.instances]) {
            try {
                const cwd = (await instance.getInitialCwd()).toLowerCase();
                if (cwd === key) {
                    const availableInstance = this._getAvailableTerminal(instance, `close archived terminal for ${fsPath}`);
                    if (!availableInstance) {
                        continue;
                    }
                    this._terminalService.safeDisposeTerminal(availableInstance);
                    this._logService.trace(`[SessionsTerminal] Closed archived terminal ${availableInstance.instanceId}`);
                }
            }
            catch {
                // ignore
            }
        }
    }
    async dumpTracking() {
        console.log(`[SessionsTerminal] Active key: ${this._activeKey ?? '<none>'}`);
        console.log('[SessionsTerminal] === All Terminals ===');
        for (const instance of this._terminalService.instances) {
            let cwd = '<unknown>';
            try {
                cwd = await instance.getInitialCwd();
            }
            catch { /* ignored */ }
            const isForeground = this._terminalService.foregroundInstances.includes(instance);
            console.log(`  ${instance.instanceId} - ${cwd} - ${isForeground ? 'foreground' : 'background'}`);
        }
    }
    async showAllTerminals() {
        for (const instance of this._terminalService.instances) {
            if (!this._terminalService.foregroundInstances.includes(instance)) {
                await this._terminalService.showBackgroundTerminal(instance, true);
                this._logService.trace(`[SessionsTerminal] Moved terminal ${instance.instanceId} to foreground`);
            }
        }
    }
};
SessionsTerminalContribution = __decorate([
    __param(0, ISessionsManagementService),
    __param(1, ITerminalService),
    __param(2, IAgentSessionsService),
    __param(3, ILogService),
    __param(4, IPathService)
], SessionsTerminalContribution);
export { SessionsTerminalContribution };
registerWorkbenchContribution2(SessionsTerminalContribution.ID, SessionsTerminalContribution, 3 /* WorkbenchPhase.AfterRestored */);
class OpenSessionInTerminalAction extends Action2 {
    constructor() {
        super({
            id: 'agentSession.openInTerminal',
            title: localize2(3314, "Open Terminal"),
            icon: Codicon.terminal,
            menu: [{
                    id: Menus.TitleBarSessionMenu,
                    group: 'navigation',
                    order: 9,
                    when: ContextKeyExpr.and(IsAuxiliaryWindowContext.toNegated(), SessionsWelcomeVisibleContext.toNegated())
                }]
        });
    }
    async run(_accessor) {
        const contribution = getWorkbenchContribution(SessionsTerminalContribution.ID);
        const sessionsManagementService = _accessor.get(ISessionsManagementService);
        const pathService = _accessor.get(IPathService);
        const viewsService = _accessor.get(IViewsService);
        const activeSession = sessionsManagementService.activeSession.get();
        const cwd = getSessionCwd(activeSession) ?? await pathService.userHome();
        await contribution.ensureTerminal(cwd, true);
        viewsService.openView(TERMINAL_VIEW_ID);
    }
}
registerAction2(OpenSessionInTerminalAction);
class DumpTerminalTrackingAction extends Action2 {
    constructor() {
        super({
            id: 'agentSession.dumpTerminalTracking',
            title: localize2(3315, "Dump Terminal Tracking"),
            f1: true,
        });
    }
    async run() {
        const contribution = getWorkbenchContribution(SessionsTerminalContribution.ID);
        await contribution.dumpTracking();
    }
}
registerAction2(DumpTerminalTrackingAction);
class ShowAllTerminalsAction extends Action2 {
    constructor() {
        super({
            id: 'agentSession.showAllTerminals',
            title: localize2(3316, "Show All Terminals"),
            f1: true,
        });
    }
    async run() {
        const contribution = getWorkbenchContribution(SessionsTerminalContribution.ID);
        await contribution.showAllTerminals();
    }
}
registerAction2(ShowAllTerminalsAction);
//# sourceMappingURL=sessionsTerminalContribution.js.map