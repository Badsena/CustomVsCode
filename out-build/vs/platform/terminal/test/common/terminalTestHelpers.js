/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
/**
 * A logger for xterm.js that suppresses noisy warnings during tests.
 */
export const TestXtermLogger = {
    trace: () => { },
    debug: () => { },
    info: () => { },
    warn: (message) => {
        if (message.includes('task queue')) {
            return;
        }
        console.warn(message);
    },
    error: (message) => {
        console.error(message);
    }
};
//# sourceMappingURL=terminalTestHelpers.js.map