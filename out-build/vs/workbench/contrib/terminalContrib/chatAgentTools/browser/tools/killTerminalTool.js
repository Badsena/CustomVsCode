/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Codicon } from '../../../../../../base/common/codicons.js';
import { Disposable } from '../../../../../../base/common/lifecycle.js';
import { localize } from '../../../../../../nls.js';
import { ToolDataSource } from '../../../../chat/common/tools/languageModelToolsService.js';
import { RunInTerminalTool } from './runInTerminalTool.js';
export const KillTerminalToolData = {
    id: "kill_terminal" /* TerminalToolId.KillTerminal */,
    toolReferenceName: 'killTerminal',
    displayName: localize(15914, null),
    modelDescription: `Kill a terminal by its ID. Use this to clean up terminals that are no longer needed (e.g., after stopping a server or when a long-running task completes). The terminal ID is returned by ${"run_in_terminal" /* TerminalToolId.RunInTerminal */} when isBackground=true.`,
    icon: Codicon.terminal,
    source: ToolDataSource.Internal,
    inputSchema: {
        type: 'object',
        properties: {
            id: {
                type: 'string',
                description: `The ID of the background terminal to kill (returned by ${"run_in_terminal" /* TerminalToolId.RunInTerminal */} when isBackground=true).`
            },
        },
        required: [
            'id',
        ]
    }
};
export class KillTerminalTool extends Disposable {
    async prepareToolInvocation(_context, _token) {
        return {
            invocationMessage: localize(15915, null),
            pastTenseMessage: localize(15916, null),
        };
    }
    async invoke(invocation, _countTokens, _progress, _token) {
        const args = invocation.parameters;
        const execution = RunInTerminalTool.getExecution(args.id);
        if (!execution) {
            return {
                content: [{
                        kind: 'text',
                        value: `Error: No active terminal execution found with ID ${args.id}. The terminal may have already been killed or the ID is invalid.`
                    }]
            };
        }
        // Get the final output before killing
        const finalOutput = execution.getOutput();
        // Dispose the terminal instance (this kills the process)
        execution.instance.dispose();
        // Remove the execution from tracking
        RunInTerminalTool.removeExecution(args.id);
        const outputSummary = finalOutput
            ? `Final output before termination:\n${finalOutput}`
            : 'No output was captured.';
        return {
            content: [{
                    kind: 'text',
                    value: `Successfully killed background terminal ${args.id}. ${outputSummary}`
                }]
        };
    }
}
//# sourceMappingURL=killTerminalTool.js.map