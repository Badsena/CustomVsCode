/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as platform from '../../../../base/common/platform.js';
import { AbstractGotoLineQuickAccessProvider } from '../../../../editor/contrib/quickAccess/browser/gotoLineQuickAccess.js';
import * as nls from '../../../../nls.js';
import { Extensions as ConfigurationExtensions } from '../../../../platform/configuration/common/configurationRegistry.js';
import { ContextKeyExpr } from '../../../../platform/contextkey/common/contextkey.js';
import { SyncDescriptor } from '../../../../platform/instantiation/common/descriptors.js';
import { registerSingleton } from '../../../../platform/instantiation/common/extensions.js';
import { Extensions as QuickAccessExtensions } from '../../../../platform/quickinput/common/quickAccess.js';
import { Registry } from '../../../../platform/registry/common/platform.js';
import { ViewPaneContainer } from '../../../browser/parts/views/viewPaneContainer.js';
import { defaultQuickAccessContextKeyValue } from '../../../browser/quickaccess.js';
import { Extensions as ViewExtensions } from '../../../common/views.js';
import { GotoSymbolQuickAccessProvider } from '../../codeEditor/browser/quickaccess/gotoSymbolQuickAccess.js';
import { AnythingQuickAccessProvider } from './anythingQuickAccess.js';
import { registerContributions as replaceContributions } from './replaceContributions.js';
import { registerContributions as notebookSearchContributions } from './notebookSearch/notebookSearchContributions.js';
import { searchViewIcon } from './searchIcons.js';
import { SearchView } from './searchView.js';
import { registerContributions as searchWidgetContributions } from './searchWidget.js';
import { SymbolsQuickAccessProvider } from './symbolsQuickAccess.js';
import { ISearchHistoryService, SearchHistoryService } from '../common/searchHistoryService.js';
import { SearchViewModelWorkbenchService } from './searchTreeModel/searchModel.js';
import { ISearchViewModelWorkbenchService } from './searchTreeModel/searchViewModelWorkbenchService.js';
import { SEARCH_EXCLUDE_CONFIG, VIEWLET_ID, VIEW_ID, DEFAULT_MAX_SEARCH_RESULTS } from '../../../services/search/common/search.js';
import { CommandsRegistry } from '../../../../platform/commands/common/commands.js';
import { assertType } from '../../../../base/common/types.js';
import { getWorkspaceSymbols } from '../common/search.js';
import { SearchChatContextContribution } from './searchChatContext.js';
import './searchActionsCopy.js';
import './searchActionsFind.js';
import './searchActionsNav.js';
import './searchActionsRemoveReplace.js';
import './searchActionsSymbol.js';
import './searchActionsTopBar.js';
import './searchActionsTextQuickAccess.js';
import { TEXT_SEARCH_QUICK_ACCESS_PREFIX, TextSearchQuickAccess } from './quickTextSearch/textSearchQuickAccess.js';
import { Extensions } from '../../../common/configuration.js';
import { registerWorkbenchContribution2 } from '../../../common/contributions.js';
import { AccessibleViewRegistry } from '../../../../platform/accessibility/browser/accessibleViewRegistry.js';
import { SearchAccessibilityHelp } from './searchAccessibilityHelp.js';
registerSingleton(ISearchViewModelWorkbenchService, SearchViewModelWorkbenchService, 1 /* InstantiationType.Delayed */);
registerSingleton(ISearchHistoryService, SearchHistoryService, 1 /* InstantiationType.Delayed */);
replaceContributions();
notebookSearchContributions();
searchWidgetContributions();
registerWorkbenchContribution2(SearchChatContextContribution.ID, SearchChatContextContribution, 3 /* WorkbenchPhase.AfterRestored */);
AccessibleViewRegistry.register(new SearchAccessibilityHelp());
const SEARCH_MODE_CONFIG = 'search.mode';
const viewContainer = Registry.as(ViewExtensions.ViewContainersRegistry).registerViewContainer({
    id: VIEWLET_ID,
    title: nls.localize2(14489, "Search"),
    ctorDescriptor: new SyncDescriptor(ViewPaneContainer, [VIEWLET_ID, { mergeViewWithContainerWhenSingleView: true }]),
    hideIfEmpty: true,
    icon: searchViewIcon,
    order: 1,
}, 0 /* ViewContainerLocation.Sidebar */, { doNotRegisterOpenCommand: true });
const viewDescriptor = {
    id: VIEW_ID,
    containerIcon: searchViewIcon,
    name: nls.localize2(14490, "Search"),
    ctorDescriptor: new SyncDescriptor(SearchView),
    canToggleVisibility: false,
    canMoveView: true,
    openCommandActionDescriptor: {
        id: viewContainer.id,
        mnemonicTitle: nls.localize(14413, null),
        keybindings: {
            primary: 2048 /* KeyMod.CtrlCmd */ | 1024 /* KeyMod.Shift */ | 36 /* KeyCode.KeyF */,
            // Yes, this is weird. See #116188, #115556, #115511, and now #124146, for examples of what can go wrong here.
            when: ContextKeyExpr.regex('neverMatch', /doesNotMatch/)
        },
        order: 1
    }
};
// Register search default location to sidebar
Registry.as(ViewExtensions.ViewsRegistry).registerViews([viewDescriptor], viewContainer);
// Register Quick Access Handler
const quickAccessRegistry = Registry.as(QuickAccessExtensions.Quickaccess);
quickAccessRegistry.registerQuickAccessProvider({
    ctor: AnythingQuickAccessProvider,
    prefix: AnythingQuickAccessProvider.PREFIX,
    placeholder: nls.localize(14414, null, AbstractGotoLineQuickAccessProvider.GO_TO_LINE_PREFIX, GotoSymbolQuickAccessProvider.PREFIX),
    contextKey: defaultQuickAccessContextKeyValue,
    helpEntries: [{
            description: nls.localize(14415, null),
            commandId: 'workbench.action.quickOpen',
            commandCenterOrder: 10
        }]
});
quickAccessRegistry.registerQuickAccessProvider({
    ctor: SymbolsQuickAccessProvider,
    prefix: SymbolsQuickAccessProvider.PREFIX,
    placeholder: nls.localize(14416, null),
    contextKey: 'inWorkspaceSymbolsPicker',
    helpEntries: [{ description: nls.localize(14417, null), commandId: "workbench.action.showAllSymbols" /* Constants.SearchCommandIds.ShowAllSymbolsActionId */ }]
});
quickAccessRegistry.registerQuickAccessProvider({
    ctor: TextSearchQuickAccess,
    prefix: TEXT_SEARCH_QUICK_ACCESS_PREFIX,
    contextKey: 'inTextSearchPicker',
    placeholder: nls.localize(14418, null),
    helpEntries: [
        {
            description: nls.localize(14419, null),
            commandId: "workbench.action.quickTextSearch" /* Constants.SearchCommandIds.QuickTextSearchActionId */,
            commandCenterOrder: 25,
        }
    ]
});
// Configuration
const configurationRegistry = Registry.as(ConfigurationExtensions.Configuration);
configurationRegistry.registerConfiguration({
    id: 'search',
    order: 13,
    title: nls.localize(14420, null),
    type: 'object',
    properties: {
        [SEARCH_EXCLUDE_CONFIG]: {
            type: 'object',
            markdownDescription: nls.localize(14421, null),
            default: { '**/node_modules': true, '**/bower_components': true, '**/*.code-search': true },
            additionalProperties: {
                anyOf: [
                    {
                        type: 'boolean',
                        description: nls.localize(14422, null),
                    },
                    {
                        type: 'object',
                        properties: {
                            when: {
                                type: 'string', // expression ({ "**/*.js": { "when": "$(basename).js" } })
                                pattern: '\\w*\\$\\(basename\\)\\w*',
                                default: '$(basename).ext',
                                markdownDescription: nls.localize(14423, null)
                            }
                        }
                    }
                ]
            },
            scope: 5 /* ConfigurationScope.RESOURCE */
        },
        [SEARCH_MODE_CONFIG]: {
            type: 'string',
            enum: ['view', 'reuseEditor', 'newEditor'],
            default: 'view',
            markdownDescription: nls.localize(14424, null),
            enumDescriptions: [
                nls.localize(14425, null),
                nls.localize(14426, null),
                nls.localize(14427, null),
            ]
        },
        'search.useRipgrep': {
            type: 'boolean',
            description: nls.localize(14428, null),
            deprecationMessage: nls.localize(14429, null),
            default: true
        },
        'search.maintainFileSearchCache': {
            type: 'boolean',
            deprecationMessage: nls.localize(14430, null),
            description: nls.localize(14431, null),
            default: false
        },
        'search.useIgnoreFiles': {
            type: 'boolean',
            markdownDescription: nls.localize(14432, null),
            default: true,
            scope: 5 /* ConfigurationScope.RESOURCE */
        },
        'search.useGlobalIgnoreFiles': {
            type: 'boolean',
            markdownDescription: nls.localize(14433, null, '`#search.useIgnoreFiles#`'),
            default: false,
            scope: 5 /* ConfigurationScope.RESOURCE */
        },
        'search.useParentIgnoreFiles': {
            type: 'boolean',
            markdownDescription: nls.localize(14434, null, '`#search.useIgnoreFiles#`'),
            default: false,
            scope: 5 /* ConfigurationScope.RESOURCE */
        },
        'search.quickOpen.includeSymbols': {
            type: 'boolean',
            description: nls.localize(14435, null),
            default: false
        },
        'search.ripgrep.maxThreads': {
            type: 'number',
            description: nls.localize(14436, null),
            default: 0
        },
        'search.quickOpen.includeHistory': {
            type: 'boolean',
            description: nls.localize(14437, null),
            default: true
        },
        'search.quickOpen.history.filterSortOrder': {
            type: 'string',
            enum: ['default', 'recency'],
            default: 'default',
            enumDescriptions: [
                nls.localize(14438, null),
                nls.localize(14439, null)
            ],
            description: nls.localize(14440, null)
        },
        'search.followSymlinks': {
            type: 'boolean',
            description: nls.localize(14441, null),
            default: true
        },
        'search.smartCase': {
            type: 'boolean',
            description: nls.localize(14442, null),
            default: false
        },
        'search.globalFindClipboard': {
            type: 'boolean',
            default: false,
            description: nls.localize(14443, null),
            included: platform.isMacintosh
        },
        'search.location': {
            type: 'string',
            enum: ['sidebar', 'panel'],
            default: 'sidebar',
            description: nls.localize(14444, null),
            deprecationMessage: nls.localize(14445, null)
        },
        'search.maxResults': {
            type: ['number', 'null'],
            default: DEFAULT_MAX_SEARCH_RESULTS,
            markdownDescription: nls.localize(14446, null)
        },
        'search.collapseResults': {
            type: 'string',
            enum: ['auto', 'alwaysCollapse', 'alwaysExpand'],
            enumDescriptions: [
                nls.localize(14447, null),
                '',
                ''
            ],
            default: 'alwaysExpand',
            description: nls.localize(14448, null),
        },
        'search.useReplacePreview': {
            type: 'boolean',
            default: true,
            description: nls.localize(14449, null),
        },
        'search.showLineNumbers': {
            type: 'boolean',
            default: false,
            description: nls.localize(14450, null),
        },
        'search.usePCRE2': {
            type: 'boolean',
            default: false,
            description: nls.localize(14451, null),
            deprecationMessage: nls.localize(14452, null),
        },
        'search.actionsPosition': {
            type: 'string',
            enum: ['auto', 'right'],
            enumDescriptions: [
                nls.localize(14453, null),
                nls.localize(14454, null),
            ],
            default: 'right',
            description: nls.localize(14455, null)
        },
        'search.searchOnType': {
            type: 'boolean',
            default: true,
            description: nls.localize(14456, null)
        },
        'search.seedWithNearestWord': {
            type: 'boolean',
            default: false,
            description: nls.localize(14457, null)
        },
        'search.seedOnFocus': {
            type: 'boolean',
            default: false,
            markdownDescription: nls.localize(14458, null)
        },
        'search.searchOnTypeDebouncePeriod': {
            type: 'number',
            default: 300,
            markdownDescription: nls.localize(14459, null, '`#search.searchOnType#`')
        },
        'search.searchEditor.doubleClickBehaviour': {
            type: 'string',
            enum: ['selectWord', 'goToLocation', 'openLocationToSide'],
            default: 'goToLocation',
            enumDescriptions: [
                nls.localize(14460, null),
                nls.localize(14461, null),
                nls.localize(14462, null),
            ],
            markdownDescription: nls.localize(14463, null)
        },
        'search.searchEditor.singleClickBehaviour': {
            type: 'string',
            enum: ['default', 'peekDefinition',],
            default: 'default',
            enumDescriptions: [
                nls.localize(14464, null),
                nls.localize(14465, null),
            ],
            markdownDescription: nls.localize(14466, null)
        },
        'search.searchEditor.reusePriorSearchConfiguration': {
            type: 'boolean',
            default: false,
            markdownDescription: nls.localize(14467, null)
        },
        'search.searchEditor.defaultNumberOfContextLines': {
            type: ['number', 'null'],
            default: 1,
            markdownDescription: nls.localize(14468, null)
        },
        'search.searchEditor.focusResultsOnSearch': {
            type: 'boolean',
            default: false,
            markdownDescription: nls.localize(14469, null)
        },
        'search.sortOrder': {
            type: 'string',
            enum: ["default" /* SearchSortOrder.Default */, "fileNames" /* SearchSortOrder.FileNames */, "type" /* SearchSortOrder.Type */, "modified" /* SearchSortOrder.Modified */, "countDescending" /* SearchSortOrder.CountDescending */, "countAscending" /* SearchSortOrder.CountAscending */],
            default: "default" /* SearchSortOrder.Default */,
            enumDescriptions: [
                nls.localize(14470, null),
                nls.localize(14471, null),
                nls.localize(14472, null),
                nls.localize(14473, null),
                nls.localize(14474, null),
                nls.localize(14475, null)
            ],
            description: nls.localize(14476, null)
        },
        'search.decorations.colors': {
            type: 'boolean',
            description: nls.localize(14477, null),
            default: true
        },
        'search.decorations.badges': {
            type: 'boolean',
            description: nls.localize(14478, null),
            default: true
        },
        'search.defaultViewMode': {
            type: 'string',
            enum: ["tree" /* ViewMode.Tree */, "list" /* ViewMode.List */],
            default: "list" /* ViewMode.List */,
            enumDescriptions: [
                nls.localize(14479, null),
                nls.localize(14480, null)
            ],
            description: nls.localize(14481, null)
        },
        'search.quickAccess.preserveInput': {
            type: 'boolean',
            description: nls.localize(14482, null),
            default: false
        },
        'search.experimental.closedNotebookRichContentResults': {
            type: 'boolean',
            description: nls.localize(14483, null),
            default: false
        },
        'search.searchView.semanticSearchBehavior': {
            type: 'string',
            description: nls.localize(14484, null),
            enum: ["manual" /* SemanticSearchBehavior.Manual */, "runOnEmpty" /* SemanticSearchBehavior.RunOnEmpty */, "auto" /* SemanticSearchBehavior.Auto */],
            default: "manual" /* SemanticSearchBehavior.Manual */,
            enumDescriptions: [
                nls.localize(14485, null),
                nls.localize(14486, null),
                nls.localize(14487, null)
            ],
            tags: ['preview'],
        },
        'search.searchView.keywordSuggestions': {
            type: 'boolean',
            description: nls.localize(14488, null),
            default: false,
            tags: ['preview'],
        },
    }
});
CommandsRegistry.registerCommand('_executeWorkspaceSymbolProvider', async function (accessor, ...args) {
    const [query] = args;
    assertType(typeof query === 'string');
    const result = await getWorkspaceSymbols(query);
    return result.map(item => item.symbol);
});
// todo: @andreamah get rid of this after a few iterations
Registry.as(Extensions.ConfigurationMigration)
    .registerConfigurationMigrations([{
        key: 'search.experimental.quickAccess.preserveInput',
        migrateFn: (value, _accessor) => ([
            ['search.quickAccess.preserveInput', { value }],
            ['search.experimental.quickAccess.preserveInput', { value: undefined }]
        ])
    }]);
//# sourceMappingURL=search.contribution.js.map