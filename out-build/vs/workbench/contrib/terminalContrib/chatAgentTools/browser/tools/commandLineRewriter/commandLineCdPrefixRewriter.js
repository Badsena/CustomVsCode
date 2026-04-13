/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Disposable } from '../../../../../../../base/common/lifecycle.js';
import { extractCdPrefix } from '../../runInTerminalHelpers.js';
export class CommandLineCdPrefixRewriter extends Disposable {
    rewrite(options) {
        if (!options.cwd) {
            return undefined;
        }
        // Re-write the command if it starts with `cd <dir> && <suffix>` or `cd <dir>; <suffix>`
        // to just `<suffix>` if the directory matches the current terminal's cwd. This simplifies
        // the result in the chat by removing redundancies that some models like to add.
        const extracted = extractCdPrefix(options.commandLine, options.shell, options.os);
        if (extracted) {
            // Normalize trailing slashes
            let cdDirPath = extracted.directory.replace(/(?:[\\\/])$/, '');
            let cwdFsPath = options.cwd.fsPath.replace(/(?:[\\\/])$/, '');
            // Case-insensitive comparison on Windows
            if (options.os === 1 /* OperatingSystem.Windows */) {
                cdDirPath = cdDirPath.toLowerCase();
                cwdFsPath = cwdFsPath.toLowerCase();
            }
            if (cdDirPath === cwdFsPath) {
                return { rewritten: extracted.command, reasoning: 'Removed redundant cd command' };
            }
        }
        return undefined;
    }
}
//# sourceMappingURL=commandLineCdPrefixRewriter.js.map