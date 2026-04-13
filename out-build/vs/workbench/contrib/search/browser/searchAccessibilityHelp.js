/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Disposable } from '../../../../base/common/lifecycle.js';
import { isMacintosh } from '../../../../base/common/platform.js';
import { localize } from '../../../../nls.js';
import { SearchContext } from '../common/constants.js';
import { ISearchViewModelWorkbenchService } from './searchTreeModel/searchViewModelWorkbenchService.js';
import { IViewsService } from '../../../services/views/common/viewsService.js';
import { getSearchView } from './searchActionsBase.js';
export class SearchAccessibilityHelp {
    constructor() {
        this.priority = 105;
        this.name = 'search';
        this.type = "help" /* AccessibleViewType.Help */;
        this.when = SearchContext.SearchInputBoxFocusedKey;
    }
    getProvider(accessor) {
        const searchViewModelService = accessor.get(ISearchViewModelWorkbenchService);
        const viewsService = accessor.get(IViewsService);
        const searchModel = searchViewModelService.searchModel;
        if (!searchModel) {
            return undefined;
        }
        return new SearchAccessibilityHelpProvider(searchModel, viewsService);
    }
}
class SearchAccessibilityHelpProvider extends Disposable {
    constructor(_searchModel, _viewsService) {
        super();
        this._searchModel = _searchModel;
        this._viewsService = _viewsService;
        this.id = "searchHelp" /* AccessibleViewProviderId.SearchHelp */;
        this.verbositySettingKey = "accessibility.verbosity.find" /* AccessibilityVerbositySettingId.Find */;
        this.options = { type: "help" /* AccessibleViewType.Help */ };
    }
    onClose() {
        getSearchView(this._viewsService)?.focus();
    }
    provideContent() {
        const content = [];
        const resultCount = this._searchModel.searchResult.count();
        const isReplaceMode = this._searchModel.replaceActive;
        // Header
        content.push(localize(14491, null));
        content.push(localize(14492, null));
        content.push('');
        // Current Search Status
        content.push(localize(14493, null));
        content.push(localize(14494, null));
        if (resultCount !== undefined) {
            if (resultCount === 0) {
                content.push(localize(14495, null));
            }
            else {
                content.push(localize(14496, null, resultCount));
            }
        }
        else {
            content.push(localize(14497, null));
        }
        content.push('');
        // Inside the Search Input
        content.push(localize(14498, null));
        content.push(localize(14499, null));
        content.push('');
        // What You Hear
        content.push(localize(14500, null));
        content.push(localize(14501, null));
        content.push(localize(14502, null));
        content.push(localize(14503, null));
        content.push(localize(14504, null));
        content.push(localize(14505, null));
        content.push('');
        // Focus Behavior
        content.push(localize(14506, null));
        content.push(localize(14507, null));
        content.push(localize(14508, null));
        content.push(localize(14509, null, '<keybinding:search.action.focusNextSearchResult>'));
        content.push('');
        // Keyboard Navigation Summary
        content.push(localize(14510, null));
        content.push('');
        content.push(localize(14511, null));
        content.push(localize(14512, null));
        content.push(localize(14513, null));
        content.push('');
        content.push(localize(14514, null));
        content.push(localize(14515, null));
        content.push(localize(14516, null));
        content.push('');
        content.push(localize(14517, null));
        content.push(localize(14518, null, '<keybinding:search.action.focusNextSearchResult>'));
        content.push(localize(14519, null, '<keybinding:search.action.focusPreviousSearchResult>'));
        content.push('');
        // Search Options
        content.push(localize(14520, null));
        content.push(localize(14521, null));
        content.push(localize(14522, null));
        content.push(localize(14523, null));
        content.push('');
        // Replace Mode
        if (isReplaceMode) {
            content.push(localize(14524, null));
            content.push(localize(14525, null));
            content.push(localize(14526, null));
            content.push(localize(14527, null));
            content.push('');
        }
        // Settings
        content.push(localize(14528, null, '<keybinding:workbench.action.openSettings>'));
        content.push(localize(14529, null));
        content.push(localize(14530, null));
        content.push(localize(14531, null));
        content.push(localize(14532, null));
        content.push(localize(14533, null));
        content.push(localize(14534, null));
        content.push(localize(14535, null));
        content.push(localize(14536, null));
        content.push(localize(14537, null));
        content.push(localize(14538, null));
        content.push(localize(14539, null));
        content.push(localize(14540, null));
        // Replace-specific setting
        if (isReplaceMode) {
            content.push(localize(14541, null));
        }
        // Platform-specific setting
        if (isMacintosh) {
            content.push('');
            content.push(localize(14542, null));
            content.push(localize(14543, null));
        }
        content.push('');
        content.push(localize(14544, null));
        content.push(localize(14545, null));
        return content.join('\n');
    }
}
//# sourceMappingURL=searchAccessibilityHelp.js.map