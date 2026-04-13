/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import './media/terminalSymbolIcons.css';
import { SYMBOL_ICON_ENUMERATOR_FOREGROUND, SYMBOL_ICON_ENUMERATOR_MEMBER_FOREGROUND, SYMBOL_ICON_METHOD_FOREGROUND, SYMBOL_ICON_VARIABLE_FOREGROUND, SYMBOL_ICON_FILE_FOREGROUND, SYMBOL_ICON_FOLDER_FOREGROUND } from '../../../../../editor/contrib/symbolIcons/browser/symbolIcons.js';
import { registerColor } from '../../../../../platform/theme/common/colorUtils.js';
import { localize } from '../../../../../nls.js';
import { registerIcon } from '../../../../../platform/theme/common/iconRegistry.js';
import { Codicon } from '../../../../../base/common/codicons.js';
export const TERMINAL_SYMBOL_ICON_FLAG_FOREGROUND = registerColor('terminalSymbolIcon.flagForeground', SYMBOL_ICON_ENUMERATOR_FOREGROUND, localize(16263, null));
export const TERMINAL_SYMBOL_ICON_ALIAS_FOREGROUND = registerColor('terminalSymbolIcon.aliasForeground', SYMBOL_ICON_METHOD_FOREGROUND, localize(16264, null));
export const TERMINAL_SYMBOL_ICON_OPTION_VALUE_FOREGROUND = registerColor('terminalSymbolIcon.optionValueForeground', SYMBOL_ICON_ENUMERATOR_MEMBER_FOREGROUND, localize(16265, null));
export const TERMINAL_SYMBOL_ICON_METHOD_FOREGROUND = registerColor('terminalSymbolIcon.methodForeground', SYMBOL_ICON_METHOD_FOREGROUND, localize(16266, null));
export const TERMINAL_SYMBOL_ICON_ARGUMENT_FOREGROUND = registerColor('terminalSymbolIcon.argumentForeground', SYMBOL_ICON_VARIABLE_FOREGROUND, localize(16267, null));
export const TERMINAL_SYMBOL_ICON_OPTION_FOREGROUND = registerColor('terminalSymbolIcon.optionForeground', SYMBOL_ICON_ENUMERATOR_FOREGROUND, localize(16268, null));
export const TERMINAL_SYMBOL_ICON_INLINE_SUGGESTION_FOREGROUND = registerColor('terminalSymbolIcon.inlineSuggestionForeground', null, localize(16269, null));
export const TERMINAL_SYMBOL_ICON_FILE_FOREGROUND = registerColor('terminalSymbolIcon.fileForeground', SYMBOL_ICON_FILE_FOREGROUND, localize(16270, null));
export const TERMINAL_SYMBOL_ICON_FOLDER_FOREGROUND = registerColor('terminalSymbolIcon.folderForeground', SYMBOL_ICON_FOLDER_FOREGROUND, localize(16271, null));
export const TERMINAL_SYMBOL_ICON_COMMIT_FOREGROUND = registerColor('terminalSymbolIcon.commitForeground', SYMBOL_ICON_FILE_FOREGROUND, localize(16272, null));
export const TERMINAL_SYMBOL_ICON_BRANCH_FOREGROUND = registerColor('terminalSymbolIcon.branchForeground', SYMBOL_ICON_FILE_FOREGROUND, localize(16273, null));
export const TERMINAL_SYMBOL_ICON_TAG_FOREGROUND = registerColor('terminalSymbolIcon.tagForeground', SYMBOL_ICON_FILE_FOREGROUND, localize(16274, null));
export const TERMINAL_SYMBOL_ICON_STASH_FOREGROUND = registerColor('terminalSymbolIcon.stashForeground', SYMBOL_ICON_FILE_FOREGROUND, localize(16275, null));
export const TERMINAL_SYMBOL_ICON_REMOTE_FOREGROUND = registerColor('terminalSymbolIcon.remoteForeground', SYMBOL_ICON_FILE_FOREGROUND, localize(16276, null));
export const TERMINAL_SYMBOL_ICON_PULL_REQUEST_FOREGROUND = registerColor('terminalSymbolIcon.pullRequestForeground', SYMBOL_ICON_FILE_FOREGROUND, localize(16277, null));
export const TERMINAL_SYMBOL_ICON_PULL_REQUEST_DONE_FOREGROUND = registerColor('terminalSymbolIcon.pullRequestDoneForeground', SYMBOL_ICON_FILE_FOREGROUND, localize(16278, null));
export const TERMINAL_SYMBOL_ICON_SYMBOLIC_LINK_FILE_FOREGROUND = registerColor('terminalSymbolIcon.symbolicLinkFileForeground', SYMBOL_ICON_FILE_FOREGROUND, localize(16279, null));
export const TERMINAL_SYMBOL_ICON_SYMBOLIC_LINK_FOLDER_FOREGROUND = registerColor('terminalSymbolIcon.symbolicLinkFolderForeground', SYMBOL_ICON_FOLDER_FOREGROUND, localize(16280, null));
export const TERMINAL_SYMBOL_ICON_SYMBOL_TEXT_FOREGROUND = registerColor('terminalSymbolIcon.symbolText', SYMBOL_ICON_FILE_FOREGROUND, localize(16281, null));
export const terminalSymbolFlagIcon = registerIcon('terminal-symbol-flag', Codicon.flag, localize(16282, null), TERMINAL_SYMBOL_ICON_FLAG_FOREGROUND);
export const terminalSymbolAliasIcon = registerIcon('terminal-symbol-alias', Codicon.symbolMethod, localize(16283, null), TERMINAL_SYMBOL_ICON_ALIAS_FOREGROUND);
export const terminalSymbolEnumMember = registerIcon('terminal-symbol-option-value', Codicon.symbolEnumMember, localize(16284, null), TERMINAL_SYMBOL_ICON_OPTION_VALUE_FOREGROUND);
export const terminalSymbolMethodIcon = registerIcon('terminal-symbol-method', Codicon.symbolMethod, localize(16285, null), TERMINAL_SYMBOL_ICON_METHOD_FOREGROUND);
export const terminalSymbolArgumentIcon = registerIcon('terminal-symbol-argument', Codicon.symbolVariable, localize(16286, null), TERMINAL_SYMBOL_ICON_ARGUMENT_FOREGROUND);
export const terminalSymbolOptionIcon = registerIcon('terminal-symbol-option', Codicon.symbolEnum, localize(16287, null), TERMINAL_SYMBOL_ICON_OPTION_FOREGROUND);
export const terminalSymbolInlineSuggestionIcon = registerIcon('terminal-symbol-inline-suggestion', Codicon.star, localize(16288, null), TERMINAL_SYMBOL_ICON_INLINE_SUGGESTION_FOREGROUND);
export const terminalSymbolFileIcon = registerIcon('terminal-symbol-file', Codicon.symbolFile, localize(16289, null), TERMINAL_SYMBOL_ICON_FILE_FOREGROUND);
export const terminalSymbolFolderIcon = registerIcon('terminal-symbol-folder', Codicon.symbolFolder, localize(16290, null), TERMINAL_SYMBOL_ICON_FOLDER_FOREGROUND);
export const terminalSymbolCommitIcon = registerIcon('terminal-symbol-commit', Codicon.gitCommit, localize(16291, null), TERMINAL_SYMBOL_ICON_COMMIT_FOREGROUND);
export const terminalSymbolBranchIcon = registerIcon('terminal-symbol-branch', Codicon.gitBranch, localize(16292, null), TERMINAL_SYMBOL_ICON_BRANCH_FOREGROUND);
export const terminalSymbolTagIcon = registerIcon('terminal-symbol-tag', Codicon.tag, localize(16293, null), TERMINAL_SYMBOL_ICON_TAG_FOREGROUND);
export const terminalSymbolStashIcon = registerIcon('terminal-symbol-stash', Codicon.gitStash, localize(16294, null), TERMINAL_SYMBOL_ICON_STASH_FOREGROUND);
export const terminalSymbolRemoteIcon = registerIcon('terminal-symbol-remote', Codicon.remote, localize(16295, null), TERMINAL_SYMBOL_ICON_REMOTE_FOREGROUND);
export const terminalSymbolPullRequestIcon = registerIcon('terminal-symbol-pull-request', Codicon.gitPullRequest, localize(16296, null), TERMINAL_SYMBOL_ICON_PULL_REQUEST_FOREGROUND);
export const terminalSymbolPullRequestDoneIcon = registerIcon('terminal-symbol-pull-request-done', Codicon.gitPullRequestDone, localize(16297, null), TERMINAL_SYMBOL_ICON_PULL_REQUEST_DONE_FOREGROUND);
export const terminalSymbolSymbolicLinkFileIcon = registerIcon('terminal-symbol-symbolic-link-file', Codicon.fileSymlinkFile, localize(16298, null), TERMINAL_SYMBOL_ICON_SYMBOLIC_LINK_FILE_FOREGROUND);
export const terminalSymbolSymbolicLinkFolderIcon = registerIcon('terminal-symbol-symbolic-link-folder', Codicon.fileSymlinkDirectory, localize(16299, null), TERMINAL_SYMBOL_ICON_SYMBOLIC_LINK_FOLDER_FOREGROUND);
export const terminalSymbolSymbolTextIcon = registerIcon('terminal-symbol-symbol-text', Codicon.symbolKey, localize(16300, null), TERMINAL_SYMBOL_ICON_SYMBOL_TEXT_FOREGROUND);
//# sourceMappingURL=terminalSymbolIcons.js.map