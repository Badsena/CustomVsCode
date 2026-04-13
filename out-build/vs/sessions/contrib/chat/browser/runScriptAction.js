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
import { $, addDisposableListener, append, EventType } from '../../../../base/browser/dom.js';
import { StandardKeyboardEvent } from '../../../../base/browser/keyboardEvent.js';
import { ActionViewItem, BaseActionViewItem } from '../../../../base/browser/ui/actionbar/actionViewItems.js';
import { Action } from '../../../../base/common/actions.js';
import { equals } from '../../../../base/common/arrays.js';
import { Codicon } from '../../../../base/common/codicons.js';
import { Disposable, DisposableStore } from '../../../../base/common/lifecycle.js';
import { autorun, derivedOpts } from '../../../../base/common/observable.js';
import { ThemeIcon } from '../../../../base/common/themables.js';
import { localize, localize2 } from '../../../../nls.js';
import { IActionViewItemService } from '../../../../platform/actions/browser/actionViewItemService.js';
import { ActionWidgetDropdownActionViewItem } from '../../../../platform/actions/browser/actionWidgetDropdownActionViewItem.js';
import { MenuId, registerAction2, Action2, MenuRegistry, SubmenuItemAction } from '../../../../platform/actions/common/actions.js';
import { IActionWidgetService } from '../../../../platform/actionWidget/browser/actionWidget.js';
import { ICommandService } from '../../../../platform/commands/common/commands.js';
import { ContextKeyExpr, IContextKeyService } from '../../../../platform/contextkey/common/contextkey.js';
import { IKeybindingService } from '../../../../platform/keybinding/common/keybinding.js';
import { KeybindingsRegistry } from '../../../../platform/keybinding/common/keybindingsRegistry.js';
import { IQuickInputService } from '../../../../platform/quickinput/common/quickInput.js';
import { ITelemetryService } from '../../../../platform/telemetry/common/telemetry.js';
import { IChatWidgetService } from '../../../../workbench/contrib/chat/browser/chat.js';
import { IViewsService } from '../../../../workbench/services/views/common/viewsService.js';
import { SessionsCategories } from '../../../common/categories.js';
import { IsActiveSessionBackgroundProviderContext, ISessionsManagementService } from '../../sessions/browser/sessionsManagementService.js';
import { Menus } from '../../../browser/menus.js';
import { ISessionsConfigurationService } from './sessionsConfigurationService.js';
import { IsAuxiliaryWindowContext } from '../../../../workbench/common/contextkeys.js';
import { SessionsWelcomeVisibleContext } from '../../../common/contextkeys.js';
import { RunScriptCustomTaskWidget } from './runScriptCustomTaskWidget.js';
import { SessionsViewId } from './newChatViewPane.js';
// Menu IDs - exported for use in auxiliary bar part
export const RunScriptDropdownMenuId = MenuId.for('AgentSessionsRunScriptDropdown');
// Action IDs
const RUN_SCRIPT_ACTION_PRIMARY_ID = 'workbench.action.agentSessions.runScriptPrimary';
const CONFIGURE_DEFAULT_RUN_ACTION_ID = 'workbench.action.agentSessions.configureDefaultRunAction';
const GENERATE_RUN_ACTION_ID = 'workbench.action.agentSessions.generateRunAction';
function getTaskDisplayLabel(task) {
    if (task.label && task.label.length > 0) {
        return task.label;
    }
    if (task.script && task.script.length > 0) {
        return task.script;
    }
    if (task.command && task.command.length > 0) {
        return task.command;
    }
    if (task.task && task.task.toString().length > 0) {
        return task.task.toString();
    }
    return '';
}
function getTaskCommandPreview(task) {
    if (task.command && task.command.length > 0) {
        return task.command;
    }
    if (task.script && task.script.length > 0) {
        return localize(3185, null, task.script);
    }
    if (task.task && task.task.toString().length > 0) {
        return task.task.toString();
    }
    return getTaskDisplayLabel(task);
}
function getPrimaryTask(tasks, pinnedTaskLabel) {
    if (tasks.length === 0) {
        return undefined;
    }
    if (pinnedTaskLabel) {
        const pinnedTask = tasks.find(task => task.task.label === pinnedTaskLabel);
        if (pinnedTask) {
            return pinnedTask;
        }
    }
    return tasks[0];
}
/**
 * Workbench contribution that adds a split dropdown action to the auxiliary bar title
 * for running a task via tasks.json.
 */
let RunScriptContribution = class RunScriptContribution extends Disposable {
    static { this.ID = 'workbench.contrib.agentSessions.runScript'; }
    constructor(_activeSessionService, _keybindingService, _quickInputService, _sessionsConfigService, _chatWidgetService, _viewsService, _actionViewItemService) {
        super();
        this._activeSessionService = _activeSessionService;
        this._quickInputService = _quickInputService;
        this._sessionsConfigService = _sessionsConfigService;
        this._chatWidgetService = _chatWidgetService;
        this._viewsService = _viewsService;
        this._actionViewItemService = _actionViewItemService;
        this._activeRunState = derivedOpts({
            owner: this,
            equalsFn: (a, b) => {
                if (a === b) {
                    return true;
                }
                if (!a || !b) {
                    return false;
                }
                return a.session === b.session
                    && a.pinnedTaskLabel === b.pinnedTaskLabel
                    && equals(a.tasks, b.tasks, (t1, t2) => t1.task.label === t2.task.label
                        && t1.task.command === t2.task.command
                        && t1.target === t2.target
                        && t1.task.runOptions?.runOn === t2.task.runOptions?.runOn);
            }
        }, reader => {
            const activeSession = this._activeSessionService.activeSession.read(reader);
            if (!activeSession) {
                return undefined;
            }
            const tasks = this._sessionsConfigService.getSessionTasks(activeSession).read(reader);
            const pinnedTaskLabel = this._sessionsConfigService.getPinnedTaskLabel(activeSession.repository).read(reader);
            return { session: activeSession, tasks, pinnedTaskLabel };
        }).recomputeInitiallyAndOnChange(this._store);
        this._registerActionViewItemProvider();
        this._registerActions();
    }
    _registerActionViewItemProvider() {
        const that = this;
        this._register(this._actionViewItemService.register(Menus.TitleBarSessionMenu, RunScriptDropdownMenuId, (action, options, instantiationService) => {
            if (!(action instanceof SubmenuItemAction)) {
                return undefined;
            }
            return instantiationService.createInstance(RunScriptActionViewItem, action, options, that._activeRunState, (session) => that._showConfigureQuickPick(session), (session, existingTask, mode) => that._showCustomCommandInput(session, existingTask, mode));
        }));
    }
    _registerActions() {
        const that = this;
        this._register(registerAction2(class extends Action2 {
            constructor() {
                super({
                    id: RUN_SCRIPT_ACTION_PRIMARY_ID,
                    title: { value: localize(3186, null), original: 'Run Primary Task' },
                    icon: Codicon.play,
                    category: SessionsCategories.Sessions,
                    f1: true,
                });
            }
            async run() {
                const activeState = that._activeRunState.get();
                if (!activeState) {
                    return;
                }
                const { tasks, session } = activeState;
                if (tasks.length === 0) {
                    const task = await that._showConfigureQuickPick(session);
                    if (task) {
                        await that._sessionsConfigService.runTask(task, session);
                    }
                    return;
                }
                const primaryTask = getPrimaryTask(tasks, activeState.pinnedTaskLabel);
                if (!primaryTask) {
                    return;
                }
                await that._sessionsConfigService.runTask(primaryTask.task, session);
            }
        }));
        this._register(autorun(reader => {
            const activeState = this._activeRunState.read(reader);
            if (!activeState) {
                return;
            }
            const { session, tasks } = activeState;
            const configureScriptPrecondition = session.worktree ?? session.repository ? ContextKeyExpr.true() : ContextKeyExpr.false();
            reader.store.add(registerAction2(class extends Action2 {
                constructor() {
                    super({
                        id: CONFIGURE_DEFAULT_RUN_ACTION_ID,
                        title: localize2(3223, "Add Task..."),
                        category: SessionsCategories.Sessions,
                        icon: Codicon.add,
                        precondition: configureScriptPrecondition,
                        menu: [{
                                id: RunScriptDropdownMenuId,
                                group: tasks.length === 0 ? 'navigation' : '1_configure',
                                order: 0
                            }]
                    });
                }
                async run() {
                    const task = await that._showConfigureQuickPick(session);
                    if (task) {
                        await that._sessionsConfigService.runTask(task, session);
                    }
                }
            }));
            reader.store.add(registerAction2(class extends Action2 {
                constructor() {
                    super({
                        id: GENERATE_RUN_ACTION_ID,
                        title: localize2(3224, "Generate New Task..."),
                        category: SessionsCategories.Sessions,
                        precondition: IsActiveSessionBackgroundProviderContext,
                        menu: [{
                                id: RunScriptDropdownMenuId,
                                group: tasks.length === 0 ? 'navigation' : '1_configure',
                                order: 1
                            }]
                    });
                }
                async run() {
                    if (session.isUntitled) {
                        const viewPane = that._viewsService.getViewWithId(SessionsViewId);
                        viewPane?.sendQuery('/generate-run-commands');
                    }
                    else {
                        const widget = that._chatWidgetService.getWidgetBySessionResource(session.resource);
                        await widget?.acceptInput('/generate-run-commands');
                    }
                }
            }));
        }));
    }
    async _showConfigureQuickPick(session) {
        const nonSessionTasks = await this._sessionsConfigService.getNonSessionTasks(session);
        if (nonSessionTasks.length === 0) {
            // No existing tasks, go straight to custom command input
            return this._showCustomCommandInput(session);
        }
        const items = [];
        items.push({ type: 'separator', label: localize(3187, null) });
        items.push({
            label: localize(3188, null),
            description: localize(3189, null),
        });
        if (nonSessionTasks.length > 0) {
            items.push({ type: 'separator', label: localize(3190, null) });
            for (const { task, target } of nonSessionTasks) {
                items.push({
                    label: getTaskDisplayLabel(task),
                    description: task.command,
                    task,
                    source: target,
                });
            }
        }
        const picked = await this._quickInputService.pick(items, {
            placeHolder: localize(3191, null),
        });
        if (!picked) {
            return undefined;
        }
        const pickedItem = picked;
        if (pickedItem.task) {
            return this._showCustomCommandInput(session, { task: pickedItem.task, target: pickedItem.source ?? 'workspace' });
        }
        else {
            // Custom command path
            return this._showCustomCommandInput(session);
        }
    }
    async _showCustomCommandInput(session, existingTask, mode = 'add') {
        const taskConfiguration = await this._showCustomCommandWidget(session, existingTask, mode);
        if (!taskConfiguration) {
            return undefined;
        }
        if (existingTask) {
            if (mode === 'configure') {
                const newLabel = taskConfiguration.label?.trim() || existingTask.task.label || taskConfiguration.command;
                let updatedTask = {
                    ...existingTask.task,
                    label: newLabel,
                    inSessions: true,
                };
                if (taskConfiguration.command && existingTask.task.command !== undefined) {
                    updatedTask = {
                        ...updatedTask,
                        command: taskConfiguration.command,
                    };
                }
                if (taskConfiguration.runOn) {
                    updatedTask = {
                        ...updatedTask,
                        runOptions: {
                            ...(existingTask.task.runOptions ?? {}),
                            runOn: taskConfiguration.runOn,
                        },
                    };
                }
                await this._sessionsConfigService.updateTask(existingTask.task.label, updatedTask, session, existingTask.target, taskConfiguration.target);
                return updatedTask;
            }
            await this._sessionsConfigService.addTaskToSessions(existingTask.task, session, existingTask.target, { runOn: taskConfiguration.runOn ?? 'default' });
            return {
                ...existingTask.task,
                inSessions: true,
                ...(taskConfiguration.runOn ? { runOptions: { runOn: taskConfiguration.runOn } } : {}),
            };
        }
        return this._sessionsConfigService.createAndAddTask(taskConfiguration.label, taskConfiguration.command, session, taskConfiguration.target, taskConfiguration.runOn ? { runOn: taskConfiguration.runOn } : undefined);
    }
    _showCustomCommandWidget(session, existingTask, mode = 'add') {
        const workspaceTargetDisabledReason = !(session.worktree ?? session.repository)
            ? localize(3192, null)
            : undefined;
        const isConfigureMode = mode === 'configure';
        return new Promise(resolve => {
            const disposables = new DisposableStore();
            let settled = false;
            const quickWidget = disposables.add(this._quickInputService.createQuickWidget());
            quickWidget.title = isConfigureMode
                ? localize(3193, null)
                : existingTask
                    ? localize(3194, null)
                    : localize(3195, null);
            quickWidget.description = isConfigureMode
                ? localize(3196, null)
                : existingTask
                    ? localize(3197, null)
                    : localize(3198, null);
            quickWidget.ignoreFocusOut = true;
            const widget = disposables.add(new RunScriptCustomTaskWidget({
                label: existingTask?.task.label,
                labelDisabledReason: existingTask && !isConfigureMode ? localize(3199, null) : undefined,
                command: existingTask ? getTaskCommandPreview(existingTask.task) : undefined,
                commandDisabledReason: existingTask && !isConfigureMode ? localize(3200, null) : undefined,
                target: existingTask?.target,
                targetDisabledReason: existingTask && !isConfigureMode ? localize(3201, null) : workspaceTargetDisabledReason,
                runOn: existingTask?.task.runOptions?.runOn === 'worktreeCreated' ? 'worktreeCreated' : undefined,
                mode: isConfigureMode ? 'configure' : existingTask ? 'add-existing' : 'add',
            }));
            quickWidget.widget = widget.domNode;
            const complete = (result) => {
                if (settled) {
                    return;
                }
                settled = true;
                resolve(result);
                quickWidget.hide();
            };
            disposables.add(widget.onDidSubmit(result => complete(result)));
            disposables.add(widget.onDidCancel(() => complete(undefined)));
            disposables.add(quickWidget.onDidHide(() => {
                if (!settled) {
                    settled = true;
                    resolve(undefined);
                }
                disposables.dispose();
            }));
            quickWidget.show();
            widget.focus();
        });
    }
};
RunScriptContribution = __decorate([
    __param(0, ISessionsManagementService),
    __param(1, IKeybindingService),
    __param(2, IQuickInputService),
    __param(3, ISessionsConfigurationService),
    __param(4, IChatWidgetService),
    __param(5, IViewsService),
    __param(6, IActionViewItemService)
], RunScriptContribution);
export { RunScriptContribution };
/**
 * Split-button action view item for the run script picker in the sessions titlebar.
 * The primary button runs the pinned task, or the first task if none is pinned.
 * The dropdown arrow opens a custom action widget with categories and per-item
 * toolbar actions (pin, configure, remove).
 */
let RunScriptActionViewItem = class RunScriptActionViewItem extends BaseActionViewItem {
    constructor(action, _options, _activeRunState, _showConfigureQuickPick, _showCustomCommandInput, _commandService, _sessionsConfigService, _keybindingService, _actionWidgetService, contextKeyService, telemetryService, _chatWidgetService, _viewsService) {
        super(undefined, action);
        this._activeRunState = _activeRunState;
        this._showConfigureQuickPick = _showConfigureQuickPick;
        this._showCustomCommandInput = _showCustomCommandInput;
        this._commandService = _commandService;
        this._sessionsConfigService = _sessionsConfigService;
        this._keybindingService = _keybindingService;
        this._actionWidgetService = _actionWidgetService;
        this._chatWidgetService = _chatWidgetService;
        this._viewsService = _viewsService;
        const state = this._activeRunState.get();
        const hasTasks = state && state.tasks.length > 0;
        // Primary action button - runs the pinned task (or first task when none is pinned)
        this._primaryActionAction = this._register(new Action('agentSessions.runScriptPrimary', this._getPrimaryActionTooltip(state), ThemeIcon.asClassName(Codicon.play), hasTasks, () => this._commandService.executeCommand(RUN_SCRIPT_ACTION_PRIMARY_ID)));
        this._primaryAction = this._register(new ActionViewItem(undefined, this._primaryActionAction, { icon: true, label: false }));
        // Update enabled state when tasks change
        this._register(autorun(reader => {
            const runState = this._activeRunState.read(reader);
            this._primaryActionAction.enabled = !!runState && runState.tasks.length > 0;
            this._primaryActionAction.label = this._getPrimaryActionTooltip(runState);
        }));
        // Dropdown with categorized actions and per-item toolbars
        const dropdownAction = this._register(new Action('agentSessions.runScriptDropdown', localize(3202, null)));
        this._dropdown = this._register(new ChevronActionWidgetDropdown(dropdownAction, {
            actionProvider: { getActions: () => this._getDropdownActions() },
            showItemKeybindings: true,
        }, this._actionWidgetService, this._keybindingService, contextKeyService, telemetryService));
    }
    render(container) {
        super.render(container);
        container.classList.add('monaco-dropdown-with-default');
        // Primary action button
        const primaryContainer = $('.action-container');
        this._primaryAction.render(append(container, primaryContainer));
        this._register(addDisposableListener(primaryContainer, EventType.KEY_DOWN, (e) => {
            const event = new StandardKeyboardEvent(e);
            if (event.equals(17 /* KeyCode.RightArrow */)) {
                this._primaryAction.blur();
                this._dropdown.focus();
                event.stopPropagation();
            }
        }));
        // Dropdown arrow button
        const dropdownContainer = $('.dropdown-action-container');
        this._dropdown.render(append(container, dropdownContainer));
        this._register(addDisposableListener(dropdownContainer, EventType.KEY_DOWN, (e) => {
            const event = new StandardKeyboardEvent(e);
            if (event.equals(15 /* KeyCode.LeftArrow */)) {
                this._dropdown.setFocusable(false);
                this._primaryAction.focus();
                event.stopPropagation();
            }
        }));
    }
    focus(fromRight) {
        if (fromRight) {
            this._dropdown.focus();
        }
        else {
            this._primaryAction.focus();
        }
    }
    blur() {
        this._primaryAction.blur();
        this._dropdown.blur();
    }
    setFocusable(focusable) {
        this._primaryAction.setFocusable(focusable);
        this._dropdown.setFocusable(focusable);
    }
    _getPrimaryActionTooltip(state) {
        if (!state || state.tasks.length === 0) {
            return localize(3203, null);
        }
        const primaryTask = getPrimaryTask(state.tasks, state.pinnedTaskLabel)?.task;
        if (!primaryTask) {
            return localize(3204, null);
        }
        const keybindingLabel = this._keybindingService.lookupKeybinding(RUN_SCRIPT_ACTION_PRIMARY_ID)?.getLabel();
        return keybindingLabel
            ? localize(3205, null, getTaskDisplayLabel(primaryTask), keybindingLabel)
            : getTaskDisplayLabel(primaryTask);
    }
    _getDropdownActions() {
        const state = this._activeRunState.get();
        if (!state) {
            return [];
        }
        const { tasks, session, pinnedTaskLabel } = state;
        const actions = [];
        // Category for normal tasks (no header shown)
        const defaultCategory = { label: '', order: 0, showHeader: false };
        // Category for worktree-creation tasks
        const worktreeCategory = { label: localize(3206, null), order: 1, showHeader: true };
        // Category for add actions
        const addCategory = { label: localize(3207, null), order: 2, showHeader: true };
        for (let i = 0; i < tasks.length; i++) {
            const entry = tasks[i];
            const task = entry.task;
            const isWorktreeTask = task.runOptions?.runOn === 'worktreeCreated';
            const isPinned = task.label === pinnedTaskLabel;
            const toolbarActions = [
                {
                    id: `runScript.pin.${i}`,
                    label: isPinned ? localize(3208, null) : localize(3209, null),
                    tooltip: isPinned ? localize(3210, null) : localize(3211, null),
                    class: ThemeIcon.asClassName(isPinned ? Codicon.pinned : Codicon.pin),
                    enabled: !!session.repository,
                    run: async () => {
                        this._actionWidgetService.hide();
                        this._sessionsConfigService.setPinnedTaskLabel(session.repository, isPinned ? undefined : task.label);
                    }
                },
                {
                    id: `runScript.configure.${i}`,
                    label: localize(3212, null),
                    tooltip: localize(3213, null),
                    class: ThemeIcon.asClassName(Codicon.gear),
                    enabled: true,
                    run: async () => {
                        this._actionWidgetService.hide();
                        await this._showCustomCommandInput(session, { task, target: entry.target }, 'configure');
                    }
                },
                {
                    id: `runScript.remove.${i}`,
                    label: localize(3214, null),
                    tooltip: localize(3215, null),
                    class: ThemeIcon.asClassName(Codicon.close),
                    enabled: true,
                    run: async () => {
                        this._actionWidgetService.hide();
                        await this._sessionsConfigService.removeTask(task.label, session, entry.target);
                    }
                }
            ];
            actions.push({
                id: `runScript.task.${i}`,
                label: getTaskDisplayLabel(task),
                tooltip: '',
                hover: {
                    content: localize(3216, null, getTaskDisplayLabel(task)),
                    position: { hoverPosition: 0 /* HoverPosition.LEFT */ }
                },
                icon: Codicon.play,
                enabled: true,
                class: undefined,
                category: isWorktreeTask ? worktreeCategory : defaultCategory,
                toolbarActions,
                run: async () => {
                    await this._sessionsConfigService.runTask(task, session);
                },
            });
        }
        // "Add Task..." action
        const canConfigure = !!(session.worktree ?? session.repository);
        actions.push({
            id: 'runScript.addAction',
            label: localize(3217, null),
            tooltip: '',
            hover: {
                content: canConfigure
                    ? localize(3218, null)
                    : localize(3219, null),
                position: { hoverPosition: 0 /* HoverPosition.LEFT */ }
            },
            icon: Codicon.add,
            enabled: canConfigure,
            class: undefined,
            category: addCategory,
            run: async () => {
                const task = await this._showConfigureQuickPick(session);
                if (task) {
                    await this._sessionsConfigService.runTask(task, session);
                }
            },
        });
        // "Generate New Task..." action
        actions.push({
            id: 'runScript.generateAction',
            label: localize(3220, null),
            tooltip: '',
            hover: {
                content: localize(3221, null),
                position: { hoverPosition: 0 /* HoverPosition.LEFT */ },
            },
            icon: Codicon.sparkle,
            enabled: true,
            class: undefined,
            category: addCategory,
            run: async () => {
                if (session.isUntitled) {
                    const viewPane = this._viewsService.getViewWithId(SessionsViewId);
                    viewPane?.sendQuery('/generate-run-commands');
                }
                else {
                    const widget = this._chatWidgetService.getWidgetBySessionResource(session.resource);
                    await widget?.acceptInput('/generate-run-commands');
                }
            },
        });
        return actions;
    }
};
RunScriptActionViewItem = __decorate([
    __param(5, ICommandService),
    __param(6, ISessionsConfigurationService),
    __param(7, IKeybindingService),
    __param(8, IActionWidgetService),
    __param(9, IContextKeyService),
    __param(10, ITelemetryService),
    __param(11, IChatWidgetService),
    __param(12, IViewsService)
], RunScriptActionViewItem);
/**
 * {@link ActionWidgetDropdownActionViewItem} that renders a chevron-down icon
 * as its label, used as the dropdown arrow in the split button.
 */
class ChevronActionWidgetDropdown extends ActionWidgetDropdownActionViewItem {
    renderLabel(element) {
        element.classList.add('codicon', 'codicon-chevron-down');
        return null;
    }
}
// Register the Run split button submenu on the workbench title bar (background sessions only)
MenuRegistry.appendMenuItem(Menus.TitleBarSessionMenu, {
    submenu: RunScriptDropdownMenuId,
    isSplitButton: true,
    title: localize2(3225, "Run"),
    icon: Codicon.play,
    group: 'navigation',
    order: 8,
    when: ContextKeyExpr.and(IsAuxiliaryWindowContext.toNegated(), SessionsWelcomeVisibleContext.toNegated(), IsActiveSessionBackgroundProviderContext)
});
// Disabled placeholder shown in the titlebar when the active session does not support running scripts
class RunScriptNotAvailableAction extends Action2 {
    constructor() {
        super({
            id: 'workbench.action.agentSessions.runScript.notAvailable',
            title: localize2(3226, "Run"),
            tooltip: localize(3222, null),
            icon: Codicon.play,
            precondition: ContextKeyExpr.false(),
            menu: [{
                    id: Menus.TitleBarSessionMenu,
                    group: 'navigation',
                    order: 8,
                    when: ContextKeyExpr.and(IsAuxiliaryWindowContext.toNegated(), SessionsWelcomeVisibleContext.toNegated(), IsActiveSessionBackgroundProviderContext.toNegated())
                }]
        });
    }
    run() { }
}
registerAction2(RunScriptNotAvailableAction);
// Register F5 keybinding at module level to ensure it's in the registry
// before the keybinding resolver is cached. The command handler is
// registered later by RunScriptContribution.
KeybindingsRegistry.registerKeybindingRule({
    id: RUN_SCRIPT_ACTION_PRIMARY_ID,
    primary: 63 /* KeyCode.F5 */,
    weight: 200 /* KeybindingWeight.WorkbenchContrib */ + 100,
    when: IsAuxiliaryWindowContext.toNegated()
});
//# sourceMappingURL=runScriptAction.js.map