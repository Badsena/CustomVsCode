/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { isWindows } from '../../../../../base/common/platform.js';
import { isObject, isString } from '../../../../../base/common/types.js';
import { localize, localize2 } from '../../../../../nls.js';
import { IQuickInputService } from '../../../../../platform/quickinput/common/quickInput.js';
import { registerTerminalAction } from '../../../terminal/browser/terminalActions.js';
export var TerminalSendSignalCommandId;
(function (TerminalSendSignalCommandId) {
    TerminalSendSignalCommandId["SendSignal"] = "workbench.action.terminal.sendSignal";
})(TerminalSendSignalCommandId || (TerminalSendSignalCommandId = {}));
function toOptionalString(obj) {
    return isString(obj) ? obj : undefined;
}
const sendSignalString = localize2(16208, "Send Signal");
registerTerminalAction({
    id: "workbench.action.terminal.sendSignal" /* TerminalSendSignalCommandId.SendSignal */,
    title: sendSignalString,
    f1: !isWindows,
    metadata: {
        description: sendSignalString.value,
        args: [{
                name: 'args',
                schema: {
                    type: 'object',
                    required: ['signal'],
                    properties: {
                        signal: {
                            description: localize(16194, null),
                            type: 'string'
                        }
                    },
                }
            }]
    },
    run: async (c, accessor, args) => {
        const quickInputService = accessor.get(IQuickInputService);
        const instance = c.service.activeInstance;
        if (!instance) {
            return;
        }
        function isSignalArg(obj) {
            return isObject(obj) && 'signal' in obj;
        }
        let signal = isSignalArg(args) ? toOptionalString(args.signal) : undefined;
        if (!signal) {
            const signalOptions = [
                { label: 'SIGINT', description: localize(16195, null) },
                { label: 'SIGTERM', description: localize(16196, null) },
                { label: 'SIGKILL', description: localize(16197, null) },
                { label: 'SIGSTOP', description: localize(16198, null) },
                { label: 'SIGCONT', description: localize(16199, null) },
                { label: 'SIGHUP', description: localize(16200, null) },
                { label: 'SIGQUIT', description: localize(16201, null) },
                { label: 'SIGUSR1', description: localize(16202, null) },
                { label: 'SIGUSR2', description: localize(16203, null) },
                { type: 'separator' },
                { label: localize(16204, null) }
            ];
            const selected = await quickInputService.pick(signalOptions, {
                placeHolder: localize(16205, null)
            });
            if (!selected) {
                return;
            }
            if (selected.label === localize(16206, null)) {
                const inputSignal = await quickInputService.input({
                    prompt: localize(16207, null),
                });
                if (!inputSignal) {
                    return;
                }
                signal = inputSignal;
            }
            else {
                signal = selected.label;
            }
        }
        await instance.sendSignal(signal);
    }
});
//# sourceMappingURL=terminal.sendSignal.contribution.js.map