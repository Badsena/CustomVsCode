/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Codicon } from '../../../../base/common/codicons.js';
import { constObservable, observableValue } from '../../../../base/common/observable.js';
import { joinPath } from '../../../../base/common/resources.js';
import { ThemeIcon } from '../../../../base/common/themables.js';
import { localize } from '../../../../nls.js';
import { createDecorator } from '../../../../platform/instantiation/common/instantiation.js';
import { AICustomizationManagementSection } from './aiCustomizationWorkspaceService.js';
import { PromptsType } from './promptSyntax/promptTypes.js';
import { PromptsStorage } from './promptSyntax/service/promptsService.js';
import { AGENT_MD_FILENAME } from './promptSyntax/config/promptFileLocations.js';
export const ICustomizationHarnessService = createDecorator('customizationHarnessService');
/**
 * Identifies the AI harness (execution environment) that customizations
 * are filtered for. Storage answers "where did this come from?"; harness
 * answers "who consumes it?".
 */
export var CustomizationHarness;
(function (CustomizationHarness) {
    CustomizationHarness["VSCode"] = "vscode";
    CustomizationHarness["CLI"] = "cli";
    CustomizationHarness["Claude"] = "claude";
})(CustomizationHarness || (CustomizationHarness = {}));
// #region Shared filter constants
/**
 * Hooks are always restricted to local + plugin sources regardless of harness.
 */
const HOOKS_FILTER = {
    sources: [PromptsStorage.local, PromptsStorage.plugin],
};
// #endregion
// #region Well-known user directories
/**
 * Returns the user-home directories accessible to the Copilot CLI harness.
 */
export function getCliUserRoots(userHome) {
    return [
        joinPath(userHome, '.copilot'),
        joinPath(userHome, '.claude'),
        joinPath(userHome, '.agents'),
    ];
}
/**
 * Returns the user-home directories accessible to the Claude harness.
 */
export function getClaudeUserRoots(userHome) {
    return [joinPath(userHome, '.claude')];
}
// #endregion
// #region Harness descriptor factories
/**
 * Builds the full source list from the base set (local, user, plugin)
 * plus any additional sources specific to the window type.
 *
 * Core passes `[PromptsStorage.extension]`; sessions passes its
 * BUILTIN_STORAGE constant.
 */
function buildAllSources(extras) {
    return [PromptsStorage.local, PromptsStorage.user, PromptsStorage.plugin, ...extras];
}
/**
 * Creates a "VS Code" harness descriptor that shows all storage sources
 * with no user-root restrictions.
 */
export function createVSCodeHarnessDescriptor(extras) {
    const filter = { sources: buildAllSources(extras) };
    return {
        id: CustomizationHarness.VSCode,
        label: localize(8441, null),
        icon: ThemeIcon.fromId(Codicon.vm.id),
        sectionOverrides: new Map([
            [AICustomizationManagementSection.Instructions, {
                    rootFileShortcuts: [AGENT_MD_FILENAME],
                }],
        ]),
        getStorageSourceFilter: () => filter,
    };
}
function createRestrictedHarnessDescriptor(id, label, icon, restrictedUserRoots, extras, options) {
    const allSources = buildAllSources(extras);
    const allRootsFilter = { sources: allSources };
    const restrictedFilter = { sources: allSources, includedUserFileRoots: restrictedUserRoots };
    return {
        id,
        label,
        icon,
        hiddenSections: options?.hiddenSections,
        workspaceSubpaths: options?.workspaceSubpaths,
        hideGenerateButton: options?.hideGenerateButton,
        sectionOverrides: options?.sectionOverrides,
        requiredAgentId: options?.requiredAgentId,
        instructionFileFilter: options?.instructionFileFilter,
        getStorageSourceFilter(type) {
            if (type === PromptsType.hook) {
                return HOOKS_FILTER;
            }
            if (type === PromptsType.prompt) {
                return allRootsFilter;
            }
            return restrictedFilter;
        },
    };
}
/**
 * Creates a "Copilot CLI" harness descriptor.
 */
export function createCliHarnessDescriptor(cliUserRoots, extras) {
    return createRestrictedHarnessDescriptor(CustomizationHarness.CLI, localize(8442, null), ThemeIcon.fromId(Codicon.worktree.id), cliUserRoots, extras, {
        hideGenerateButton: true,
        requiredAgentId: 'copilotcli',
        workspaceSubpaths: ['.github', '.copilot', '.agents', '.claude'],
        sectionOverrides: new Map([
            [AICustomizationManagementSection.Instructions, {
                    rootFileShortcuts: [AGENT_MD_FILENAME],
                }],
        ]),
    });
}
/**
 * Creates a "Claude" harness descriptor.
 * Claude does not support prompt files (.prompt.md), AGENTS.md, or extension-contributed plugins.
 * It supports agents (.claude/agents/), instructions (CLAUDE.md, .claude/rules/),
 * skills (.claude/skills/), and hooks (.claude/settings.json).
 */
export function createClaudeHarnessDescriptor(claudeRoots, extras) {
    return createRestrictedHarnessDescriptor(CustomizationHarness.Claude, localize(8443, null), ThemeIcon.fromId(Codicon.claude.id), claudeRoots, extras, {
        hiddenSections: [AICustomizationManagementSection.Prompts, AICustomizationManagementSection.Plugins],
        workspaceSubpaths: ['.claude'],
        hideGenerateButton: true,
        requiredAgentId: 'claude-code',
        sectionOverrides: new Map([
            [AICustomizationManagementSection.Hooks, {
                    label: localize(8444, null),
                    commandId: 'copilot.claude.hooks',
                }],
            [AICustomizationManagementSection.Instructions, {
                    label: localize(8445, null),
                    rootFile: 'CLAUDE.md',
                    typeLabel: localize(8446, null),
                    fileExtension: '.md',
                }],
        ]),
        instructionFileFilter: ['CLAUDE.md', 'CLAUDE.local.md', '.claude/rules/', 'copilot-instructions.md'],
    });
}
// #endregion
// #region Helpers
/**
 * Tests whether a file path belongs to one of the given workspace sub-paths.
 * Matches on path segment boundaries to avoid false positives
 * (e.g. `.claude` must appear as `/.claude/` in the path, not as part of
 * a longer segment like `not.claude`).
 */
export function matchesWorkspaceSubpath(filePath, subpaths) {
    return subpaths.some(sp => filePath.includes(`/${sp}/`) || filePath.endsWith(`/${sp}`));
}
/**
 * Tests whether an instruction file matches one of the harness's recognized
 * instruction file patterns. Patterns can be exact filenames (e.g. `CLAUDE.md`)
 * or path prefixes ending with `/` (e.g. `.claude/rules/`).
 */
export function matchesInstructionFileFilter(filePath, filters) {
    const name = filePath.substring(filePath.lastIndexOf('/') + 1);
    return filters.some(f => {
        if (f.endsWith('/')) {
            // Path prefix: check if the file is under this directory
            return filePath.includes(`/${f}`) || filePath.startsWith(f);
        }
        return name === f;
    });
}
// #endregion
// #region Base implementation
/**
 * Reusable base implementation of {@link ICustomizationHarnessService}.
 * Concrete registrations only need to supply the list of harness
 * descriptors and a default harness id.
 */
export class CustomizationHarnessServiceBase {
    constructor(harnesses, defaultHarness, availableHarnesses) {
        this._allHarnesses = harnesses;
        this._activeHarness = observableValue(this, defaultHarness);
        this.activeHarness = this._activeHarness;
        this.availableHarnesses = availableHarnesses ?? constObservable(harnesses);
    }
    setActiveHarness(id) {
        const available = this.availableHarnesses.get();
        if (available.some(h => h.id === id)) {
            this._activeHarness.set(id, undefined);
        }
    }
    getStorageSourceFilter(type) {
        const descriptor = this.getActiveDescriptor();
        return descriptor.getStorageSourceFilter(type);
    }
    getActiveDescriptor() {
        const activeId = this._activeHarness.get();
        const available = this.availableHarnesses.get();
        return available.find(h => h.id === activeId) ?? available[0] ?? this._allHarnesses[0];
    }
}
// #endregion
//# sourceMappingURL=customizationHarnessService.js.map