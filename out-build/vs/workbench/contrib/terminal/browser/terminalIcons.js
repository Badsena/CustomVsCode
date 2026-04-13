/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Codicon } from '../../../../base/common/codicons.js';
import { localize } from '../../../../nls.js';
import { registerIcon } from '../../../../platform/theme/common/iconRegistry.js';
export const terminalViewIcon = registerIcon('terminal-view-icon', Codicon.terminal, localize(15401, null));
export const renameTerminalIcon = registerIcon('terminal-rename', Codicon.edit, localize(15402, null));
export const killTerminalIcon = registerIcon('terminal-kill', Codicon.trash, localize(15403, null));
export const newTerminalIcon = registerIcon('terminal-new', Codicon.add, localize(15404, null));
export const configureTerminalProfileIcon = registerIcon('terminal-configure-profile', Codicon.gear, localize(15405, null));
export const terminalDecorationMark = registerIcon('terminal-decoration-mark', Codicon.circleSmallFilled, localize(15406, null));
export const terminalDecorationIncomplete = registerIcon('terminal-decoration-incomplete', Codicon.circle, localize(15407, null));
export const terminalDecorationError = registerIcon('terminal-decoration-error', Codicon.errorSmall, localize(15408, null));
export const terminalDecorationSuccess = registerIcon('terminal-decoration-success', Codicon.circleFilled, localize(15409, null));
export const commandHistoryRemoveIcon = registerIcon('terminal-command-history-remove', Codicon.close, localize(15410, null));
export const commandHistoryOutputIcon = registerIcon('terminal-command-history-output', Codicon.output, localize(15411, null));
export const commandHistoryFuzzySearchIcon = registerIcon('terminal-command-history-fuzzy-search', Codicon.searchFuzzy, localize(15412, null));
export const commandHistoryOpenFileIcon = registerIcon('terminal-command-history-open-file', Codicon.symbolReference, localize(15413, null));
//# sourceMappingURL=terminalIcons.js.map