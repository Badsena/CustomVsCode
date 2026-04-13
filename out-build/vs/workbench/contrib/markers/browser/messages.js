/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as nls from '../../../../nls.js';
import { basename } from '../../../../base/common/resources.js';
import { MarkerSeverity } from '../../../../platform/markers/common/markers.js';
export default class Messages {
    static { this.MARKERS_PANEL_TOGGLE_LABEL = nls.localize(12082, null); }
    static { this.MARKERS_PANEL_SHOW_LABEL = nls.localize2(12127, "Focus Problems (Errors, Warnings, Infos)"); }
    static { this.PROBLEMS_PANEL_CONFIGURATION_TITLE = nls.localize(12083, null); }
    static { this.PROBLEMS_PANEL_CONFIGURATION_AUTO_REVEAL = nls.localize(12084, null); }
    static { this.PROBLEMS_PANEL_CONFIGURATION_VIEW_MODE = nls.localize(12085, null); }
    static { this.PROBLEMS_PANEL_CONFIGURATION_SHOW_CURRENT_STATUS = nls.localize(12086, null); }
    static { this.PROBLEMS_PANEL_CONFIGURATION_COMPARE_ORDER = nls.localize(12087, null); }
    static { this.PROBLEMS_PANEL_CONFIGURATION_COMPARE_ORDER_SEVERITY = nls.localize(12088, null); }
    static { this.PROBLEMS_PANEL_CONFIGURATION_COMPARE_ORDER_POSITION = nls.localize(12089, null); }
    static { this.MARKERS_PANEL_TITLE_PROBLEMS = nls.localize2(12128, "Problems"); }
    static { this.MARKERS_PANEL_NO_PROBLEMS_BUILT = nls.localize(12090, null); }
    static { this.MARKERS_PANEL_NO_PROBLEMS_ACTIVE_FILE_BUILT = nls.localize(12091, null); }
    static { this.MARKERS_PANEL_NO_PROBLEMS_FILTERS = nls.localize(12092, null); }
    static { this.MARKERS_PANEL_ACTION_TOOLTIP_MORE_FILTERS = nls.localize(12093, null); }
    static { this.MARKERS_PANEL_FILTER_LABEL_SHOW_ERRORS = nls.localize(12094, null); }
    static { this.MARKERS_PANEL_FILTER_LABEL_SHOW_WARNINGS = nls.localize(12095, null); }
    static { this.MARKERS_PANEL_FILTER_LABEL_SHOW_INFOS = nls.localize(12096, null); }
    static { this.MARKERS_PANEL_FILTER_LABEL_EXCLUDED_FILES = nls.localize(12097, null); }
    static { this.MARKERS_PANEL_FILTER_LABEL_ACTIVE_FILE = nls.localize(12098, null); }
    static { this.MARKERS_PANEL_ACTION_TOOLTIP_FILTER = nls.localize(12099, null); }
    static { this.MARKERS_PANEL_ACTION_TOOLTIP_QUICKFIX = nls.localize(12100, null); }
    static { this.MARKERS_PANEL_FILTER_ARIA_LABEL = nls.localize(12101, null); }
    static { this.MARKERS_PANEL_FILTER_PLACEHOLDER = nls.localize(12102, null); }
    static { this.MARKERS_PANEL_FILTER_ERRORS = nls.localize(12103, null); }
    static { this.MARKERS_PANEL_FILTER_WARNINGS = nls.localize(12104, null); }
    static { this.MARKERS_PANEL_FILTER_INFOS = nls.localize(12105, null); }
    static { this.MARKERS_PANEL_SINGLE_ERROR_LABEL = nls.localize(12106, null); }
    static { this.MARKERS_PANEL_MULTIPLE_ERRORS_LABEL = (noOfErrors) => { return nls.localize(12107, null, '' + noOfErrors); }; }
    static { this.MARKERS_PANEL_SINGLE_WARNING_LABEL = nls.localize(12108, null); }
    static { this.MARKERS_PANEL_MULTIPLE_WARNINGS_LABEL = (noOfWarnings) => { return nls.localize(12109, null, '' + noOfWarnings); }; }
    static { this.MARKERS_PANEL_SINGLE_INFO_LABEL = nls.localize(12110, null); }
    static { this.MARKERS_PANEL_MULTIPLE_INFOS_LABEL = (noOfInfos) => { return nls.localize(12111, null, '' + noOfInfos); }; }
    static { this.MARKERS_PANEL_SINGLE_UNKNOWN_LABEL = nls.localize(12112, null); }
    static { this.MARKERS_PANEL_MULTIPLE_UNKNOWNS_LABEL = (noOfUnknowns) => { return nls.localize(12113, null, '' + noOfUnknowns); }; }
    static { this.MARKERS_PANEL_AT_LINE_COL_NUMBER = (ln, col) => { return nls.localize(12114, null, '' + ln, '' + col); }; }
    static { this.MARKERS_TREE_ARIA_LABEL_RESOURCE = (noOfProblems, fileName, folder) => { return nls.localize(12115, null, noOfProblems, fileName, folder); }; }
    static { this.MARKERS_TREE_ARIA_LABEL_MARKER = (marker) => {
        const relatedInformationMessage = marker.relatedInformation.length ? nls.localize(12116, null, marker.relatedInformation.length) : '';
        switch (marker.marker.severity) {
            case MarkerSeverity.Error:
                return marker.marker.source ? nls.localize(12117, null, marker.marker.message, marker.marker.startLineNumber, marker.marker.startColumn, relatedInformationMessage, marker.marker.source)
                    : nls.localize(12118, null, marker.marker.message, marker.marker.startLineNumber, marker.marker.startColumn, relatedInformationMessage);
            case MarkerSeverity.Warning:
                return marker.marker.source ? nls.localize(12119, null, marker.marker.message, marker.marker.startLineNumber, marker.marker.startColumn, relatedInformationMessage, marker.marker.source)
                    : nls.localize(12120, null, marker.marker.message, marker.marker.startLineNumber, marker.marker.startColumn, relatedInformationMessage, relatedInformationMessage);
            case MarkerSeverity.Info:
                return marker.marker.source ? nls.localize(12121, null, marker.marker.message, marker.marker.startLineNumber, marker.marker.startColumn, relatedInformationMessage, marker.marker.source)
                    : nls.localize(12122, null, marker.marker.message, marker.marker.startLineNumber, marker.marker.startColumn, relatedInformationMessage);
            default:
                return marker.marker.source ? nls.localize(12123, null, marker.marker.source, marker.marker.message, marker.marker.startLineNumber, marker.marker.startColumn, relatedInformationMessage, marker.marker.source)
                    : nls.localize(12124, null, marker.marker.message, marker.marker.startLineNumber, marker.marker.startColumn, relatedInformationMessage);
        }
    }; }
    static { this.MARKERS_TREE_ARIA_LABEL_RELATED_INFORMATION = (relatedInformation) => nls.localize(12125, null, relatedInformation.message, relatedInformation.startLineNumber, relatedInformation.startColumn, basename(relatedInformation.resource)); }
    static { this.SHOW_ERRORS_WARNINGS_ACTION_LABEL = nls.localize(12126, null); }
}
//# sourceMappingURL=messages.js.map