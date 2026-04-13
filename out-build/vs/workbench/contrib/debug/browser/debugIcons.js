/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Codicon } from '../../../../base/common/codicons.js';
import { localize } from '../../../../nls.js';
import { registerIcon } from '../../../../platform/theme/common/iconRegistry.js';
export const debugConsoleViewIcon = registerIcon('debug-console-view-icon', Codicon.debugConsole, localize(9903, null));
export const runViewIcon = registerIcon('run-view-icon', Codicon.debugAlt, localize(9904, null));
export const variablesViewIcon = registerIcon('variables-view-icon', Codicon.debugAlt, localize(9905, null));
export const watchViewIcon = registerIcon('watch-view-icon', Codicon.debugAlt, localize(9906, null));
export const callStackViewIcon = registerIcon('callstack-view-icon', Codicon.debugAlt, localize(9907, null));
export const breakpointsViewIcon = registerIcon('breakpoints-view-icon', Codicon.debugAlt, localize(9908, null));
export const loadedScriptsViewIcon = registerIcon('loaded-scripts-view-icon', Codicon.debugAlt, localize(9909, null));
export const breakpoint = {
    regular: registerIcon('debug-breakpoint', Codicon.debugBreakpoint, localize(9910, null)),
    disabled: registerIcon('debug-breakpoint-disabled', Codicon.debugBreakpointDisabled, localize(9911, null)),
    unverified: registerIcon('debug-breakpoint-unverified', Codicon.debugBreakpointUnverified, localize(9912, null)),
    pending: registerIcon('debug-breakpoint-pending', Codicon.debugBreakpointPending, localize(9913, null)),
};
export const functionBreakpoint = {
    regular: registerIcon('debug-breakpoint-function', Codicon.debugBreakpointFunction, localize(9914, null)),
    disabled: registerIcon('debug-breakpoint-function-disabled', Codicon.debugBreakpointFunctionDisabled, localize(9915, null)),
    unverified: registerIcon('debug-breakpoint-function-unverified', Codicon.debugBreakpointFunctionUnverified, localize(9916, null))
};
export const conditionalBreakpoint = {
    regular: registerIcon('debug-breakpoint-conditional', Codicon.debugBreakpointConditional, localize(9917, null)),
    disabled: registerIcon('debug-breakpoint-conditional-disabled', Codicon.debugBreakpointConditionalDisabled, localize(9918, null)),
    unverified: registerIcon('debug-breakpoint-conditional-unverified', Codicon.debugBreakpointConditionalUnverified, localize(9919, null))
};
export const dataBreakpoint = {
    regular: registerIcon('debug-breakpoint-data', Codicon.debugBreakpointData, localize(9920, null)),
    disabled: registerIcon('debug-breakpoint-data-disabled', Codicon.debugBreakpointDataDisabled, localize(9921, null)),
    unverified: registerIcon('debug-breakpoint-data-unverified', Codicon.debugBreakpointDataUnverified, localize(9922, null)),
};
export const logBreakpoint = {
    regular: registerIcon('debug-breakpoint-log', Codicon.debugBreakpointLog, localize(9923, null)),
    disabled: registerIcon('debug-breakpoint-log-disabled', Codicon.debugBreakpointLogDisabled, localize(9924, null)),
    unverified: registerIcon('debug-breakpoint-log-unverified', Codicon.debugBreakpointLogUnverified, localize(9925, null)),
};
export const debugBreakpointHint = registerIcon('debug-hint', Codicon.debugHint, localize(9926, null));
export const debugBreakpointUnsupported = registerIcon('debug-breakpoint-unsupported', Codicon.debugBreakpointUnsupported, localize(9927, null));
export const allBreakpoints = [breakpoint, functionBreakpoint, conditionalBreakpoint, dataBreakpoint, logBreakpoint];
export const debugStackframe = registerIcon('debug-stackframe', Codicon.debugStackframe, localize(9928, null));
export const debugStackframeFocused = registerIcon('debug-stackframe-focused', Codicon.debugStackframeFocused, localize(9929, null));
export const debugGripper = registerIcon('debug-gripper', Codicon.gripper, localize(9930, null));
export const debugRestartFrame = registerIcon('debug-restart-frame', Codicon.debugRestartFrame, localize(9931, null));
export const debugStop = registerIcon('debug-stop', Codicon.debugStop, localize(9932, null));
export const debugDisconnect = registerIcon('debug-disconnect', Codicon.debugDisconnect, localize(9933, null));
export const debugRestart = registerIcon('debug-restart', Codicon.debugRestart, localize(9934, null));
export const debugStepOver = registerIcon('debug-step-over', Codicon.debugStepOver, localize(9935, null));
export const debugStepInto = registerIcon('debug-step-into', Codicon.debugStepInto, localize(9936, null));
export const debugStepOut = registerIcon('debug-step-out', Codicon.debugStepOut, localize(9937, null));
export const debugStepBack = registerIcon('debug-step-back', Codicon.debugStepBack, localize(9938, null));
export const debugPause = registerIcon('debug-pause', Codicon.debugPause, localize(9939, null));
export const debugContinue = registerIcon('debug-continue', Codicon.debugContinue, localize(9940, null));
export const debugReverseContinue = registerIcon('debug-reverse-continue', Codicon.debugReverseContinue, localize(9941, null));
export const debugRun = registerIcon('debug-run', Codicon.run, localize(9942, null));
export const debugStart = registerIcon('debug-start', Codicon.debugStart, localize(9943, null));
export const debugConfigure = registerIcon('debug-configure', Codicon.gear, localize(9944, null));
export const debugConsole = registerIcon('debug-console', Codicon.gear, localize(9945, null));
export const debugRemoveConfig = registerIcon('debug-remove-config', Codicon.trash, localize(9946, null));
export const debugCollapseAll = registerIcon('debug-collapse-all', Codicon.collapseAll, localize(9947, null));
export const callstackViewSession = registerIcon('callstack-view-session', Codicon.bug, localize(9948, null));
export const debugConsoleClearAll = registerIcon('debug-console-clear-all', Codicon.clearAll, localize(9949, null));
export const watchExpressionsRemoveAll = registerIcon('watch-expressions-remove-all', Codicon.closeAll, localize(9950, null));
export const watchExpressionRemove = registerIcon('watch-expression-remove', Codicon.removeClose, localize(9951, null));
export const watchExpressionsAdd = registerIcon('watch-expressions-add', Codicon.add, localize(9952, null));
export const watchExpressionsAddFuncBreakpoint = registerIcon('watch-expressions-add-function-breakpoint', Codicon.add, localize(9953, null));
export const watchExpressionsAddDataBreakpoint = registerIcon('watch-expressions-add-data-breakpoint', Codicon.variableGroup, localize(9954, null));
export const breakpointsRemoveAll = registerIcon('breakpoints-remove-all', Codicon.closeAll, localize(9955, null));
export const breakpointsActivate = registerIcon('breakpoints-activate', Codicon.activateBreakpoints, localize(9956, null));
export const debugConsoleEvaluationInput = registerIcon('debug-console-evaluation-input', Codicon.arrowSmallRight, localize(9957, null));
export const debugConsoleEvaluationPrompt = registerIcon('debug-console-evaluation-prompt', Codicon.chevronRight, localize(9958, null));
export const debugInspectMemory = registerIcon('debug-inspect-memory', Codicon.fileBinary, localize(9959, null));
//# sourceMappingURL=debugIcons.js.map