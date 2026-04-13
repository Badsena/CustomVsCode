/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { URI } from '../../../../base/common/uri.js';
import * as nls from '../../../../nls.js';
import { RawContextKey } from '../../../../platform/contextkey/common/contextkey.js';
import { createDecorator } from '../../../../platform/instantiation/common/instantiation.js';
export const VIEWLET_ID = 'workbench.view.debug';
export const VARIABLES_VIEW_ID = 'workbench.debug.variablesView';
export const WATCH_VIEW_ID = 'workbench.debug.watchExpressionsView';
export const CALLSTACK_VIEW_ID = 'workbench.debug.callStackView';
export const LOADED_SCRIPTS_VIEW_ID = 'workbench.debug.loadedScriptsView';
export const BREAKPOINTS_VIEW_ID = 'workbench.debug.breakPointsView';
export const DISASSEMBLY_VIEW_ID = 'workbench.debug.disassemblyView';
export const DEBUG_PANEL_ID = 'workbench.panel.repl';
export const REPL_VIEW_ID = 'workbench.panel.repl.view';
export const CONTEXT_DEBUG_TYPE = new RawContextKey('debugType', undefined, { type: 'string', description: nls.localize(10197, null) });
export const CONTEXT_DEBUG_CONFIGURATION_TYPE = new RawContextKey('debugConfigurationType', undefined, { type: 'string', description: nls.localize(10198, null) });
export const CONTEXT_DEBUG_STATE = new RawContextKey('debugState', 'inactive', { type: 'string', description: nls.localize(10199, null) });
export const CONTEXT_DEBUG_UX_KEY = 'debugUx';
export const CONTEXT_DEBUG_UX = new RawContextKey(CONTEXT_DEBUG_UX_KEY, 'default', { type: 'string', description: nls.localize(10200, null) });
export const CONTEXT_HAS_DEBUGGED = new RawContextKey('hasDebugged', false, { type: 'boolean', description: nls.localize(10201, null) });
export const CONTEXT_IN_DEBUG_MODE = new RawContextKey('inDebugMode', false, { type: 'boolean', description: nls.localize(10202, null) });
export const CONTEXT_IN_DEBUG_REPL = new RawContextKey('inDebugRepl', false, { type: 'boolean', description: nls.localize(10203, null) });
export const CONTEXT_BREAKPOINT_WIDGET_VISIBLE = new RawContextKey('breakpointWidgetVisible', false, { type: 'boolean', description: nls.localize(10204, null) });
export const CONTEXT_IN_BREAKPOINT_WIDGET = new RawContextKey('inBreakpointWidget', false, { type: 'boolean', description: nls.localize(10205, null) });
export const CONTEXT_BREAKPOINTS_FOCUSED = new RawContextKey('breakpointsFocused', true, { type: 'boolean', description: nls.localize(10206, null) });
export const CONTEXT_WATCH_EXPRESSIONS_FOCUSED = new RawContextKey('watchExpressionsFocused', true, { type: 'boolean', description: nls.localize(10207, null) });
export const CONTEXT_WATCH_EXPRESSIONS_EXIST = new RawContextKey('watchExpressionsExist', false, { type: 'boolean', description: nls.localize(10208, null) });
export const CONTEXT_VARIABLES_FOCUSED = new RawContextKey('variablesFocused', true, { type: 'boolean', description: nls.localize(10209, null) });
export const CONTEXT_EXPRESSION_SELECTED = new RawContextKey('expressionSelected', false, { type: 'boolean', description: nls.localize(10210, null) });
export const CONTEXT_BREAKPOINT_INPUT_FOCUSED = new RawContextKey('breakpointInputFocused', false, { type: 'boolean', description: nls.localize(10211, null) });
export const CONTEXT_CALLSTACK_ITEM_TYPE = new RawContextKey('callStackItemType', undefined, { type: 'string', description: nls.localize(10212, null) });
export const CONTEXT_CALLSTACK_SESSION_IS_ATTACH = new RawContextKey('callStackSessionIsAttach', false, { type: 'boolean', description: nls.localize(10213, null) });
export const CONTEXT_CALLSTACK_ITEM_STOPPED = new RawContextKey('callStackItemStopped', false, { type: 'boolean', description: nls.localize(10214, null) });
export const CONTEXT_CALLSTACK_SESSION_HAS_ONE_THREAD = new RawContextKey('callStackSessionHasOneThread', false, { type: 'boolean', description: nls.localize(10215, null) });
export const CONTEXT_CALLSTACK_FOCUSED = new RawContextKey('callStackFocused', true, { type: 'boolean', description: nls.localize(10216, null) });
export const CONTEXT_WATCH_ITEM_TYPE = new RawContextKey('watchItemType', undefined, { type: 'string', description: nls.localize(10217, null) });
export const CONTEXT_CAN_VIEW_MEMORY = new RawContextKey('canViewMemory', undefined, { type: 'boolean', description: nls.localize(10218, null) });
export const CONTEXT_BREAKPOINT_ITEM_TYPE = new RawContextKey('breakpointItemType', undefined, { type: 'string', description: nls.localize(10219, null) });
export const CONTEXT_BREAKPOINT_ITEM_IS_DATA_BYTES = new RawContextKey('breakpointItemBytes', undefined, { type: 'boolean', description: nls.localize(10220, null) });
export const CONTEXT_BREAKPOINT_HAS_MODES = new RawContextKey('breakpointHasModes', false, { type: 'boolean', description: nls.localize(10221, null) });
export const CONTEXT_BREAKPOINT_SUPPORTS_CONDITION = new RawContextKey('breakpointSupportsCondition', false, { type: 'boolean', description: nls.localize(10222, null) });
export const CONTEXT_LOADED_SCRIPTS_SUPPORTED = new RawContextKey('loadedScriptsSupported', false, { type: 'boolean', description: nls.localize(10223, null) });
export const CONTEXT_LOADED_SCRIPTS_ITEM_TYPE = new RawContextKey('loadedScriptsItemType', undefined, { type: 'string', description: nls.localize(10224, null) });
export const CONTEXT_FOCUSED_SESSION_IS_ATTACH = new RawContextKey('focusedSessionIsAttach', false, { type: 'boolean', description: nls.localize(10225, null) });
export const CONTEXT_FOCUSED_SESSION_IS_NO_DEBUG = new RawContextKey('focusedSessionIsNoDebug', false, { type: 'boolean', description: nls.localize(10226, null) });
export const CONTEXT_STEP_BACK_SUPPORTED = new RawContextKey('stepBackSupported', false, { type: 'boolean', description: nls.localize(10227, null) });
export const CONTEXT_RESTART_FRAME_SUPPORTED = new RawContextKey('restartFrameSupported', false, { type: 'boolean', description: nls.localize(10228, null) });
export const CONTEXT_STACK_FRAME_SUPPORTS_RESTART = new RawContextKey('stackFrameSupportsRestart', false, { type: 'boolean', description: nls.localize(10229, null) });
export const CONTEXT_JUMP_TO_CURSOR_SUPPORTED = new RawContextKey('jumpToCursorSupported', false, { type: 'boolean', description: nls.localize(10230, null) });
export const CONTEXT_STEP_INTO_TARGETS_SUPPORTED = new RawContextKey('stepIntoTargetsSupported', false, { type: 'boolean', description: nls.localize(10231, null) });
export const CONTEXT_BREAKPOINTS_EXIST = new RawContextKey('breakpointsExist', false, { type: 'boolean', description: nls.localize(10232, null) });
export const CONTEXT_DEBUGGERS_AVAILABLE = new RawContextKey('debuggersAvailable', false, { type: 'boolean', description: nls.localize(10233, null) });
export const CONTEXT_DEBUG_EXTENSION_AVAILABLE = new RawContextKey('debugExtensionAvailable', true, { type: 'boolean', description: nls.localize(10234, null) });
export const CONTEXT_DEBUG_PROTOCOL_VARIABLE_MENU_CONTEXT = new RawContextKey('debugProtocolVariableMenuContext', undefined, { type: 'string', description: nls.localize(10235, null) });
export const CONTEXT_SET_VARIABLE_SUPPORTED = new RawContextKey('debugSetVariableSupported', false, { type: 'boolean', description: nls.localize(10236, null) });
export const CONTEXT_SET_DATA_BREAKPOINT_BYTES_SUPPORTED = new RawContextKey('debugSetDataBreakpointAddressSupported', false, { type: 'boolean', description: nls.localize(10237, null) });
export const CONTEXT_SET_EXPRESSION_SUPPORTED = new RawContextKey('debugSetExpressionSupported', false, { type: 'boolean', description: nls.localize(10238, null) });
export const CONTEXT_BREAK_WHEN_VALUE_CHANGES_SUPPORTED = new RawContextKey('breakWhenValueChangesSupported', false, { type: 'boolean', description: nls.localize(10239, null) });
export const CONTEXT_BREAK_WHEN_VALUE_IS_ACCESSED_SUPPORTED = new RawContextKey('breakWhenValueIsAccessedSupported', false, { type: 'boolean', description: nls.localize(10240, null) });
export const CONTEXT_BREAK_WHEN_VALUE_IS_READ_SUPPORTED = new RawContextKey('breakWhenValueIsReadSupported', false, { type: 'boolean', description: nls.localize(10241, null) });
export const CONTEXT_TERMINATE_DEBUGGEE_SUPPORTED = new RawContextKey('terminateDebuggeeSupported', false, { type: 'boolean', description: nls.localize(10242, null) });
export const CONTEXT_SUSPEND_DEBUGGEE_SUPPORTED = new RawContextKey('suspendDebuggeeSupported', false, { type: 'boolean', description: nls.localize(10243, null) });
export const CONTEXT_TERMINATE_THREADS_SUPPORTED = new RawContextKey('terminateThreadsSupported', false, { type: 'boolean', description: nls.localize(10244, null) });
export const CONTEXT_VARIABLE_EVALUATE_NAME_PRESENT = new RawContextKey('variableEvaluateNamePresent', false, { type: 'boolean', description: nls.localize(10245, null) });
export const CONTEXT_VARIABLE_IS_READONLY = new RawContextKey('variableIsReadonly', false, { type: 'boolean', description: nls.localize(10246, null) });
export const CONTEXT_VARIABLE_VALUE = new RawContextKey('variableValue', false, { type: 'string', description: nls.localize(10247, null) });
export const CONTEXT_VARIABLE_TYPE = new RawContextKey('variableType', false, { type: 'string', description: nls.localize(10248, null) });
export const CONTEXT_VARIABLE_INTERFACES = new RawContextKey('variableInterfaces', false, { type: 'array', description: nls.localize(10249, null) });
export const CONTEXT_VARIABLE_NAME = new RawContextKey('variableName', false, { type: 'string', description: nls.localize(10250, null) });
export const CONTEXT_VARIABLE_LANGUAGE = new RawContextKey('variableLanguage', false, { type: 'string', description: nls.localize(10251, null) });
export const CONTEXT_VARIABLE_EXTENSIONID = new RawContextKey('variableExtensionId', false, { type: 'string', description: nls.localize(10252, null) });
export const CONTEXT_EXCEPTION_WIDGET_VISIBLE = new RawContextKey('exceptionWidgetVisible', false, { type: 'boolean', description: nls.localize(10253, null) });
export const CONTEXT_MULTI_SESSION_REPL = new RawContextKey('multiSessionRepl', false, { type: 'boolean', description: nls.localize(10254, null) });
export const CONTEXT_MULTI_SESSION_DEBUG = new RawContextKey('multiSessionDebug', false, { type: 'boolean', description: nls.localize(10255, null) });
export const CONTEXT_DISASSEMBLE_REQUEST_SUPPORTED = new RawContextKey('disassembleRequestSupported', false, { type: 'boolean', description: nls.localize(10256, null) });
export const CONTEXT_DISASSEMBLY_VIEW_FOCUS = new RawContextKey('disassemblyViewFocus', false, { type: 'boolean', description: nls.localize(10257, null) });
export const CONTEXT_LANGUAGE_SUPPORTS_DISASSEMBLE_REQUEST = new RawContextKey('languageSupportsDisassembleRequest', false, { type: 'boolean', description: nls.localize(10258, null) });
export const CONTEXT_FOCUSED_STACK_FRAME_HAS_INSTRUCTION_POINTER_REFERENCE = new RawContextKey('focusedStackFrameHasInstructionReference', false, { type: 'boolean', description: nls.localize(10259, null) });
export const debuggerDisabledMessage = (debugType) => nls.localize(10260, null, debugType);
export const EDITOR_CONTRIBUTION_ID = 'editor.contrib.debug';
export const BREAKPOINT_EDITOR_CONTRIBUTION_ID = 'editor.contrib.breakpoint';
export const DEBUG_SCHEME = 'debug';
export const INTERNAL_CONSOLE_OPTIONS_SCHEMA = {
    enum: ['neverOpen', 'openOnSessionStart', 'openOnFirstSessionStart'],
    default: 'openOnFirstSessionStart',
    description: nls.localize(10261, null)
};
export var State;
(function (State) {
    State[State["Inactive"] = 0] = "Inactive";
    State[State["Initializing"] = 1] = "Initializing";
    State[State["Stopped"] = 2] = "Stopped";
    State[State["Running"] = 3] = "Running";
})(State || (State = {}));
export function getStateLabel(state) {
    switch (state) {
        case 1 /* State.Initializing */: return 'initializing';
        case 2 /* State.Stopped */: return 'stopped';
        case 3 /* State.Running */: return 'running';
        default: return 'inactive';
    }
}
export var MemoryRangeType;
(function (MemoryRangeType) {
    MemoryRangeType[MemoryRangeType["Valid"] = 0] = "Valid";
    MemoryRangeType[MemoryRangeType["Unreadable"] = 1] = "Unreadable";
    MemoryRangeType[MemoryRangeType["Error"] = 2] = "Error";
})(MemoryRangeType || (MemoryRangeType = {}));
export const DEBUG_MEMORY_SCHEME = 'vscode-debug-memory';
export function isFrameDeemphasized(frame) {
    const hint = frame.presentationHint ?? frame.source.presentationHint;
    return hint === 'deemphasize' || hint === 'subtle';
}
export var DataBreakpointSetType;
(function (DataBreakpointSetType) {
    DataBreakpointSetType[DataBreakpointSetType["Variable"] = 0] = "Variable";
    DataBreakpointSetType[DataBreakpointSetType["Address"] = 1] = "Address";
})(DataBreakpointSetType || (DataBreakpointSetType = {}));
export function isDebugConfig(thing) {
    return 'type' in thing && 'request' in thing;
}
export var DebugConfigurationProviderTriggerKind;
(function (DebugConfigurationProviderTriggerKind) {
    /**
     *	`DebugConfigurationProvider.provideDebugConfigurations` is called to provide the initial debug configurations for a newly created launch.json.
     */
    DebugConfigurationProviderTriggerKind[DebugConfigurationProviderTriggerKind["Initial"] = 1] = "Initial";
    /**
     * `DebugConfigurationProvider.provideDebugConfigurations` is called to provide dynamically generated debug configurations when the user asks for them through the UI (e.g. via the "Select and Start Debugging" command).
     */
    DebugConfigurationProviderTriggerKind[DebugConfigurationProviderTriggerKind["Dynamic"] = 2] = "Dynamic";
})(DebugConfigurationProviderTriggerKind || (DebugConfigurationProviderTriggerKind = {}));
export var DebuggerString;
(function (DebuggerString) {
    DebuggerString["UnverifiedBreakpoints"] = "unverifiedBreakpoints";
})(DebuggerString || (DebuggerString = {}));
// Debug service interfaces
export const IDebugService = createDecorator('debugService');
// Editor interfaces
export var BreakpointWidgetContext;
(function (BreakpointWidgetContext) {
    BreakpointWidgetContext[BreakpointWidgetContext["CONDITION"] = 0] = "CONDITION";
    BreakpointWidgetContext[BreakpointWidgetContext["HIT_COUNT"] = 1] = "HIT_COUNT";
    BreakpointWidgetContext[BreakpointWidgetContext["LOG_MESSAGE"] = 2] = "LOG_MESSAGE";
    BreakpointWidgetContext[BreakpointWidgetContext["TRIGGER_POINT"] = 3] = "TRIGGER_POINT";
})(BreakpointWidgetContext || (BreakpointWidgetContext = {}));
export var DebugVisualizationType;
(function (DebugVisualizationType) {
    DebugVisualizationType[DebugVisualizationType["Command"] = 0] = "Command";
    DebugVisualizationType[DebugVisualizationType["Tree"] = 1] = "Tree";
})(DebugVisualizationType || (DebugVisualizationType = {}));
export var DebugTreeItemCollapsibleState;
(function (DebugTreeItemCollapsibleState) {
    DebugTreeItemCollapsibleState[DebugTreeItemCollapsibleState["None"] = 0] = "None";
    DebugTreeItemCollapsibleState[DebugTreeItemCollapsibleState["Collapsed"] = 1] = "Collapsed";
    DebugTreeItemCollapsibleState[DebugTreeItemCollapsibleState["Expanded"] = 2] = "Expanded";
})(DebugTreeItemCollapsibleState || (DebugTreeItemCollapsibleState = {}));
export var IDebugVisualizationTreeItem;
(function (IDebugVisualizationTreeItem) {
    IDebugVisualizationTreeItem.deserialize = (v) => v;
    IDebugVisualizationTreeItem.serialize = (item) => item;
})(IDebugVisualizationTreeItem || (IDebugVisualizationTreeItem = {}));
export var IDebugVisualization;
(function (IDebugVisualization) {
    IDebugVisualization.deserialize = (v) => ({
        id: v.id,
        name: v.name,
        iconPath: v.iconPath && { light: URI.revive(v.iconPath.light), dark: URI.revive(v.iconPath.dark) },
        iconClass: v.iconClass,
        visualization: v.visualization,
    });
    IDebugVisualization.serialize = (visualizer) => visualizer;
})(IDebugVisualization || (IDebugVisualization = {}));
//# sourceMappingURL=debug.js.map