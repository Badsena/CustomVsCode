/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { CancellationError } from '../../../../../../base/common/errors.js';
import { Codicon } from '../../../../../../base/common/codicons.js';
import { Disposable } from '../../../../../../base/common/lifecycle.js';
import { localize } from '../../../../../../nls.js';
import { ToolDataSource } from '../../../../chat/common/tools/languageModelToolsService.js';
import { RunInTerminalTool } from './runInTerminalTool.js';
import { raceCancellationError, timeout } from '../../../../../../base/common/async.js';
export const AwaitTerminalToolData = {
    id: "await_terminal" /* TerminalToolId.AwaitTerminal */,
    toolReferenceName: 'awaitTerminal',
    displayName: localize(15886, null),
    modelDescription: 'Wait for a background terminal command to complete. Returns the output, exit code, or timeout status.',
    icon: Codicon.terminal,
    source: ToolDataSource.Internal,
    inputSchema: {
        type: 'object',
        properties: {
            id: {
                type: 'string',
                description: `The ID of the terminal to await (returned by ${"run_in_terminal" /* TerminalToolId.RunInTerminal */} when isBackground=true).`
            },
            timeout: {
                type: 'number',
                description: 'Timeout in milliseconds. If the command does not complete within this time, returns the output collected so far with a timeout indicator. Use 0 for no timeout.'
            },
        },
        required: [
            'id',
            'timeout',
        ]
    }
};
export class AwaitTerminalTool extends Disposable {
    async prepareToolInvocation(_context, _token) {
        return {
            invocationMessage: localize(15887, null),
            pastTenseMessage: localize(15888, null),
        };
    }
    async invoke(invocation, _countTokens, _progress, token) {
        const args = invocation.parameters;
        const execution = RunInTerminalTool.getExecution(args.id);
        if (!execution) {
            return {
                content: [{
                        kind: 'text',
                        value: `Error: No active terminal execution found with ID ${args.id}. The terminal may have already completed or the ID is invalid.`
                    }]
            };
        }
        try {
            let result;
            // Treat negative values as no timeout (same as 0)
            const timeoutMs = Math.max(0, args.timeout);
            const hasTimeout = timeoutMs > 0;
            if (hasTimeout) {
                // Race completion against timeout and cancellation
                const timeoutPromise = timeout(timeoutMs).then(() => ({ type: 'timeout' }));
                const completionPromise = raceCancellationError(execution.completionPromise, token)
                    .then(r => ({ type: 'completed', result: r }));
                const raceResult = await Promise.race([completionPromise, timeoutPromise]);
                if (raceResult.type === 'timeout') {
                    // Timeout reached - return partial output
                    const partialOutput = execution.getOutput();
                    return {
                        toolMetadata: {
                            exitCode: undefined,
                            timedOut: true
                        },
                        content: [{
                                kind: 'text',
                                value: `Terminal ${args.id} timed out after ${timeoutMs}ms. Output collected so far:\n${partialOutput}`
                            }]
                    };
                }
                result = raceResult.result;
            }
            else {
                // No timeout - await completion directly with cancellation support
                result = await raceCancellationError(execution.completionPromise, token);
            }
            // Command completed
            const output = execution.getOutput();
            const exitCodeText = result.exitCode !== undefined ? ` (exit code: ${result.exitCode})` : '';
            return {
                toolMetadata: {
                    exitCode: result.exitCode
                },
                content: [{
                        kind: 'text',
                        value: `Terminal ${args.id} completed${exitCodeText}:\n${output}`
                    }]
            };
        }
        catch (e) {
            if (e instanceof CancellationError) {
                throw e;
            }
            return {
                content: [{
                        kind: 'text',
                        value: `Error awaiting terminal ${args.id}: ${e instanceof Error ? e.message : String(e)}`
                    }]
            };
        }
    }
}
//# sourceMappingURL=awaitTerminalTool.js.map