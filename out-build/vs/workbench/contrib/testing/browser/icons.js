/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Codicon } from '../../../../base/common/codicons.js';
import { localize } from '../../../../nls.js';
import { registerIcon, spinningLoading } from '../../../../platform/theme/common/iconRegistry.js';
import { registerThemingParticipant } from '../../../../platform/theme/common/themeService.js';
import { ThemeIcon } from '../../../../base/common/themables.js';
import { testingColorRunAction, testStatesToIconColors, testStatesToRetiredIconColors } from './theme.js';
export const testingViewIcon = registerIcon('test-view-icon', Codicon.beaker, localize(16385, null));
export const testingResultsIcon = registerIcon('test-results-icon', Codicon.checklist, localize(16386, null));
export const testingRunIcon = registerIcon('testing-run-icon', Codicon.run, localize(16387, null));
export const testingRerunIcon = registerIcon('testing-rerun-icon', Codicon.debugRerun, localize(16388, null));
export const testingRunAllIcon = registerIcon('testing-run-all-icon', Codicon.runAll, localize(16389, null));
// todo: https://github.com/microsoft/vscode-codicons/issues/72
export const testingDebugAllIcon = registerIcon('testing-debug-all-icon', Codicon.debugAltSmall, localize(16390, null));
export const testingDebugIcon = registerIcon('testing-debug-icon', Codicon.debugAltSmall, localize(16391, null));
export const testingCoverageIcon = registerIcon('testing-coverage-icon', Codicon.runCoverage, localize(16392, null));
export const testingCoverageAllIcon = registerIcon('testing-coverage-all-icon', Codicon.runAllCoverage, localize(16393, null));
export const testingCancelIcon = registerIcon('testing-cancel-icon', Codicon.debugStop, localize(16394, null));
export const testingFilterIcon = registerIcon('testing-filter', Codicon.filter, localize(16395, null));
export const testingHiddenIcon = registerIcon('testing-hidden', Codicon.eyeClosed, localize(16396, null));
export const testingShowAsList = registerIcon('testing-show-as-list-icon', Codicon.listTree, localize(16397, null));
export const testingShowAsTree = registerIcon('testing-show-as-list-icon', Codicon.listFlat, localize(16398, null));
export const testingUpdateProfiles = registerIcon('testing-update-profiles', Codicon.gear, localize(16399, null));
export const testingRefreshTests = registerIcon('testing-refresh-tests', Codicon.refresh, localize(16400, null));
export const testingTurnContinuousRunOn = registerIcon('testing-turn-continuous-run-on', Codicon.eye, localize(16401, null));
export const testingTurnContinuousRunOff = registerIcon('testing-turn-continuous-run-off', Codicon.eyeClosed, localize(16402, null));
export const testingContinuousIsOn = registerIcon('testing-continuous-is-on', Codicon.eye, localize(16403, null));
export const testingCancelRefreshTests = registerIcon('testing-cancel-refresh-tests', Codicon.stop, localize(16404, null));
export const testingCoverageReport = registerIcon('testing-coverage', Codicon.coverage, localize(16405, null));
export const testingWasCovered = registerIcon('testing-was-covered', Codicon.check, localize(16406, null));
export const testingCoverageMissingBranch = registerIcon('testing-missing-branch', Codicon.question, localize(16407, null));
export const testingStatesToIcons = new Map([
    [6 /* TestResultState.Errored */, registerIcon('testing-error-icon', Codicon.issues, localize(16408, null))],
    [4 /* TestResultState.Failed */, registerIcon('testing-failed-icon', Codicon.error, localize(16409, null))],
    [3 /* TestResultState.Passed */, registerIcon('testing-passed-icon', Codicon.pass, localize(16410, null))],
    [1 /* TestResultState.Queued */, registerIcon('testing-queued-icon', Codicon.history, localize(16411, null))],
    [2 /* TestResultState.Running */, spinningLoading],
    [5 /* TestResultState.Skipped */, registerIcon('testing-skipped-icon', Codicon.debugStepOver, localize(16412, null))],
    [0 /* TestResultState.Unset */, registerIcon('testing-unset-icon', Codicon.circleOutline, localize(16413, null))],
]);
registerThemingParticipant((theme, collector) => {
    for (const [state, icon] of testingStatesToIcons.entries()) {
        const color = testStatesToIconColors[state];
        const retiredColor = testStatesToRetiredIconColors[state];
        if (!color) {
            continue;
        }
        collector.addRule(`.monaco-workbench ${ThemeIcon.asCSSSelector(icon)} {
			color: ${theme.getColor(color)} !important;
		}`);
        if (!retiredColor) {
            continue;
        }
        collector.addRule(`
			.test-explorer .computed-state.retired${ThemeIcon.asCSSSelector(icon)},
			.testing-run-glyph.retired${ThemeIcon.asCSSSelector(icon)}{
				color: ${theme.getColor(retiredColor)} !important;
			}
		`);
    }
    collector.addRule(`
		.monaco-editor .glyph-margin-widgets ${ThemeIcon.asCSSSelector(testingRunIcon)},
		.monaco-editor .glyph-margin-widgets ${ThemeIcon.asCSSSelector(testingRunAllIcon)},
		.monaco-editor .glyph-margin-widgets ${ThemeIcon.asCSSSelector(testingDebugIcon)},
		.monaco-editor .glyph-margin-widgets ${ThemeIcon.asCSSSelector(testingDebugAllIcon)} {
			color: ${theme.getColor(testingColorRunAction)};
		}
	`);
});
//# sourceMappingURL=icons.js.map