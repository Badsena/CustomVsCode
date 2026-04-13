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
import { CancellationTokenSource } from '../../../../base/common/cancellation.js';
import { Codicon } from '../../../../base/common/codicons.js';
import { Disposable, DisposableStore, toDisposable } from '../../../../base/common/lifecycle.js';
import { autorun, debouncedObservable, derived, ObservablePromise, observableValue } from '../../../../base/common/observable.js';
import { basename } from '../../../../base/common/resources.js';
import { ThemeIcon } from '../../../../base/common/themables.js';
import { Range } from '../../../../editor/common/core/range.js';
import { localize } from '../../../../nls.js';
import { Action2, MenuId, registerAction2 } from '../../../../platform/actions/common/actions.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { IChatWidgetService } from '../../chat/browser/chat.js';
import { IChatContextPickService } from '../../chat/browser/attachments/chatContextPickService.js';
import { ChatContextKeys } from '../../chat/common/actions/chatContextKeys.js';
import { IDebugService } from '../common/debug.js';
import { Variable } from '../common/debugModel.js';
var PickerMode;
(function (PickerMode) {
    PickerMode["Main"] = "main";
    PickerMode["Expression"] = "expression";
})(PickerMode || (PickerMode = {}));
let DebugSessionContextPick = class DebugSessionContextPick {
    constructor(debugService) {
        this.debugService = debugService;
        this.type = 'pickerPick';
        this.label = localize(9805, null);
        this.icon = Codicon.debug;
        this.ordinal = -200;
    }
    isEnabled() {
        // Only enabled when there's a focused session that is stopped (paused)
        const viewModel = this.debugService.getViewModel();
        const focusedSession = viewModel.focusedSession;
        return !!focusedSession && focusedSession.state === 2 /* State.Stopped */;
    }
    asPicker(_widget) {
        const store = new DisposableStore();
        const mode = observableValue('debugPicker.mode', "main" /* PickerMode.Main */);
        const query = observableValue('debugPicker.query', '');
        const picksObservable = this.createPicksObservable(mode, query, store);
        return {
            placeholder: localize(9806, null),
            picks: (_queryObs, token) => {
                // Connect the external query observable to our internal one
                store.add(autorun(reader => {
                    query.set(_queryObs.read(reader), undefined);
                }));
                const cts = new CancellationTokenSource(token);
                store.add(toDisposable(() => cts.dispose(true)));
                return picksObservable;
            },
            goBack: () => {
                if (mode.get() === "expression" /* PickerMode.Expression */) {
                    mode.set("main" /* PickerMode.Main */, undefined);
                    return true; // Stay in picker
                }
                return false; // Go back to main context menu
            },
            dispose: () => store.dispose(),
        };
    }
    createPicksObservable(mode, query, store) {
        const debouncedQuery = debouncedObservable(query, 300);
        return derived(reader => {
            const currentMode = mode.read(reader);
            if (currentMode === "expression" /* PickerMode.Expression */) {
                return this.getExpressionPicks(debouncedQuery, store);
            }
            else {
                return this.getMainPicks(mode);
            }
        }).flatten();
    }
    getMainPicks(mode) {
        // Return an observable that resolves to the main picks
        const promise = derived(_reader => {
            return new ObservablePromise(this.buildMainPicks(mode));
        });
        return promise.map((value, reader) => {
            const result = value.promiseResult.read(reader);
            return { picks: result?.data || [], busy: result === undefined };
        });
    }
    async buildMainPicks(mode) {
        const picks = [];
        const viewModel = this.debugService.getViewModel();
        const stackFrame = viewModel.focusedStackFrame;
        const session = viewModel.focusedSession;
        if (!session || !stackFrame) {
            return picks;
        }
        // Add "Expression Value..." option at the top
        picks.push({
            label: localize(9807, null),
            iconClass: ThemeIcon.asClassName(Codicon.symbolVariable),
            asAttachment: () => {
                // Switch to expression mode
                mode.set("expression" /* PickerMode.Expression */, undefined);
                return 'noop';
            },
        });
        // Add watch expressions section
        const watches = this.debugService.getModel().getWatchExpressions();
        if (watches.length > 0) {
            picks.push({ type: 'separator', label: localize(9808, null) });
            for (const watch of watches) {
                picks.push({
                    label: watch.name,
                    description: watch.value,
                    iconClass: ThemeIcon.asClassName(Codicon.eye),
                    asAttachment: () => createDebugAttachments(stackFrame, createDebugVariableEntry(watch)),
                });
            }
        }
        // Add scopes and their variables
        let scopes = [];
        try {
            scopes = await stackFrame.getScopes();
        }
        catch {
            // Ignore errors when fetching scopes
        }
        for (const scope of scopes) {
            // Include variables from non-expensive scopes
            if (scope.expensive && !scope.childrenHaveBeenLoaded) {
                continue;
            }
            picks.push({ type: 'separator', label: scope.name });
            try {
                const variables = await scope.getChildren();
                if (variables.length > 1) {
                    picks.push({
                        label: localize(9809, null, scope.name),
                        iconClass: ThemeIcon.asClassName(Codicon.symbolNamespace),
                        asAttachment: () => createDebugAttachments(stackFrame, createScopeEntry(scope, variables)),
                    });
                }
                for (const variable of variables) {
                    picks.push({
                        label: variable.name,
                        description: formatVariableDescription(variable),
                        iconClass: ThemeIcon.asClassName(Codicon.symbolVariable),
                        asAttachment: () => createDebugAttachments(stackFrame, createDebugVariableEntry(variable)),
                    });
                }
            }
            catch {
                // Ignore errors when fetching variables
            }
        }
        return picks;
    }
    getExpressionPicks(query, _store) {
        const promise = derived((reader) => {
            const queryValue = query.read(reader);
            const cts = new CancellationTokenSource();
            reader.store.add(toDisposable(() => cts.dispose(true)));
            return new ObservablePromise(this.evaluateExpression(queryValue, cts.token));
        });
        return promise.map((value, r) => {
            const result = value.promiseResult.read(r);
            return { picks: result?.data || [], busy: result === undefined };
        });
    }
    async evaluateExpression(expression, token) {
        if (!expression.trim()) {
            return [{
                    label: localize(9810, null),
                    disabled: true,
                    asAttachment: () => 'noop',
                }];
        }
        const viewModel = this.debugService.getViewModel();
        const session = viewModel.focusedSession;
        const stackFrame = viewModel.focusedStackFrame;
        if (!session || !stackFrame) {
            return [{
                    label: localize(9811, null),
                    disabled: true,
                    asAttachment: () => 'noop',
                }];
        }
        try {
            const response = await session.evaluate(expression, stackFrame.frameId, 'watch');
            if (token.isCancellationRequested) {
                return [];
            }
            if (response?.body) {
                const resultValue = response.body.result;
                const resultType = response.body.type;
                return [{
                        label: expression,
                        description: formatExpressionResult(resultValue, resultType),
                        iconClass: ThemeIcon.asClassName(Codicon.symbolVariable),
                        asAttachment: () => createDebugAttachments(stackFrame, {
                            kind: 'debugVariable',
                            id: `debug-expression:${expression}`,
                            name: expression,
                            fullName: expression,
                            icon: Codicon.debug,
                            value: resultValue,
                            expression: expression,
                            type: resultType,
                            modelDescription: formatModelDescription(expression, resultValue, resultType),
                        }),
                    }];
            }
            else {
                return [{
                        label: expression,
                        description: localize(9812, null),
                        disabled: true,
                        asAttachment: () => 'noop',
                    }];
            }
        }
        catch (err) {
            return [{
                    label: expression,
                    description: err instanceof Error ? err.message : localize(9813, null),
                    disabled: true,
                    asAttachment: () => 'noop',
                }];
        }
    }
};
DebugSessionContextPick = __decorate([
    __param(0, IDebugService)
], DebugSessionContextPick);
function createDebugVariableEntry(expression) {
    return {
        kind: 'debugVariable',
        id: `debug-variable:${expression.getId()}`,
        name: expression.name,
        fullName: expression.name,
        icon: Codicon.debug,
        value: expression.value,
        expression: expression.name,
        type: expression.type,
        modelDescription: formatModelDescription(expression.name, expression.value, expression.type),
    };
}
function createPausedLocationEntry(stackFrame) {
    const uri = stackFrame.source.uri;
    let range = Range.lift(stackFrame.range);
    if (range.isEmpty()) {
        range = range.setEndPosition(range.startLineNumber + 1, 1);
    }
    return {
        kind: 'file',
        value: { uri, range },
        id: `debug-paused-location:${uri.toString()}:${range.startLineNumber}`,
        name: basename(uri),
        modelDescription: 'The debugger is currently paused at this location',
    };
}
function createDebugAttachments(stackFrame, variableEntry) {
    return [
        createPausedLocationEntry(stackFrame),
        variableEntry,
    ];
}
function createScopeEntry(scope, variables) {
    const variablesSummary = variables.map(v => `${v.name}: ${v.value}`).join('\n');
    return {
        kind: 'debugVariable',
        id: `debug-scope:${scope.name}`,
        name: `Scope: ${scope.name}`,
        fullName: `Scope: ${scope.name}`,
        icon: Codicon.debug,
        value: variablesSummary,
        expression: scope.name,
        type: 'scope',
        modelDescription: `Debug scope "${scope.name}" with ${variables.length} variables:\n${variablesSummary}`,
    };
}
function formatVariableDescription(expression) {
    const value = expression.value;
    const type = expression.type;
    if (type && value) {
        return `${type}: ${value}`;
    }
    return value || type || '';
}
function formatExpressionResult(value, type) {
    if (type && value) {
        return `${type}: ${value}`;
    }
    return value || type || '';
}
function formatModelDescription(name, value, type) {
    let description = `Debug variable "${name}"`;
    if (type) {
        description += ` of type ${type}`;
    }
    description += ` with value: ${value}`;
    return description;
}
let DebugChatContextContribution = class DebugChatContextContribution extends Disposable {
    static { this.ID = 'workbench.contrib.chat.debugChatContextContribution'; }
    constructor(contextPickService, instantiationService) {
        super();
        this._register(contextPickService.registerChatContextItem(instantiationService.createInstance(DebugSessionContextPick)));
    }
};
DebugChatContextContribution = __decorate([
    __param(0, IChatContextPickService),
    __param(1, IInstantiationService)
], DebugChatContextContribution);
export { DebugChatContextContribution };
// Context menu action: Add variable to chat
registerAction2(class extends Action2 {
    constructor() {
        super({
            id: 'workbench.debug.action.addVariableToChat',
            title: localize(9814, null),
            f1: false,
            menu: {
                id: MenuId.DebugVariablesContext,
                group: 'z_commands',
                order: 110,
                when: ChatContextKeys.enabled
            }
        });
    }
    async run(accessor, context) {
        const chatWidgetService = accessor.get(IChatWidgetService);
        const debugService = accessor.get(IDebugService);
        const widget = await chatWidgetService.revealWidget();
        if (!widget) {
            return;
        }
        // Context is the variable from the variables view
        const entry = createDebugVariableEntryFromContext(context);
        if (entry) {
            const stackFrame = debugService.getViewModel().focusedStackFrame;
            if (stackFrame) {
                widget.attachmentModel.addContext(createPausedLocationEntry(stackFrame));
            }
            widget.attachmentModel.addContext(entry);
        }
    }
});
// Context menu action: Add watch expression to chat
registerAction2(class extends Action2 {
    constructor() {
        super({
            id: 'workbench.debug.action.addWatchExpressionToChat',
            title: localize(9815, null),
            f1: false,
            menu: {
                id: MenuId.DebugWatchContext,
                group: 'z_commands',
                order: 110,
                when: ChatContextKeys.enabled
            }
        });
    }
    async run(accessor, context) {
        const chatWidgetService = accessor.get(IChatWidgetService);
        const debugService = accessor.get(IDebugService);
        const widget = await chatWidgetService.revealWidget();
        if (!context || !widget) {
            return;
        }
        // Context is the expression (watch expression or variable under it)
        const stackFrame = debugService.getViewModel().focusedStackFrame;
        if (stackFrame) {
            widget.attachmentModel.addContext(createPausedLocationEntry(stackFrame));
        }
        widget.attachmentModel.addContext(createDebugVariableEntry(context));
    }
});
// Context menu action: Add scope to chat
registerAction2(class extends Action2 {
    constructor() {
        super({
            id: 'workbench.debug.action.addScopeToChat',
            title: localize(9816, null),
            f1: false,
            menu: {
                id: MenuId.DebugScopesContext,
                group: 'z_commands',
                order: 1,
                when: ChatContextKeys.enabled
            }
        });
    }
    async run(accessor, context) {
        const chatWidgetService = accessor.get(IChatWidgetService);
        const debugService = accessor.get(IDebugService);
        const widget = await chatWidgetService.revealWidget();
        if (!context || !widget) {
            return;
        }
        // Get the actual scope and its variables
        const viewModel = debugService.getViewModel();
        const stackFrame = viewModel.focusedStackFrame;
        if (!stackFrame) {
            return;
        }
        try {
            const scopes = await stackFrame.getScopes();
            const scope = scopes.find(s => s.name === context.scope.name);
            if (scope) {
                const variables = await scope.getChildren();
                widget.attachmentModel.addContext(createPausedLocationEntry(stackFrame));
                widget.attachmentModel.addContext(createScopeEntry(scope, variables));
            }
        }
        catch {
            // Ignore errors
        }
    }
});
function isVariablesContext(context) {
    return typeof context === 'object' && context !== null && 'variable' in context && 'sessionId' in context;
}
function createDebugVariableEntryFromContext(context) {
    // The context can be either a Variable directly, or an IVariablesContext object
    if (context instanceof Variable) {
        return createDebugVariableEntry(context);
    }
    // Handle IVariablesContext format from the variables view
    if (isVariablesContext(context)) {
        const variable = context.variable;
        return {
            kind: 'debugVariable',
            id: `debug-variable:${variable.name}`,
            name: variable.name,
            fullName: variable.evaluateName ?? variable.name,
            icon: Codicon.debug,
            value: variable.value,
            expression: variable.evaluateName ?? variable.name,
            type: variable.type,
            modelDescription: formatModelDescription(variable.evaluateName || variable.name, variable.value, variable.type),
        };
    }
    return undefined;
}
//# sourceMappingURL=debugChatIntegration.js.map