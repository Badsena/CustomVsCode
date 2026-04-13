/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { isStandalone } from '../../base/browser/browser.js';
import { isLinux, isMacintosh, isNative, isWeb, isWindows } from '../../base/common/platform.js';
import { localize } from '../../nls.js';
import { Extensions as ConfigurationExtensions } from '../../platform/configuration/common/configurationRegistry.js';
import product from '../../platform/product/common/product.js';
import { Registry } from '../../platform/registry/common/platform.js';
import { ConfigurationMigrationWorkbenchContribution, DynamicWindowConfiguration, DynamicWorkbenchSecurityConfiguration, Extensions, problemsConfigurationNodeBase, windowConfigurationNodeBase, workbenchConfigurationNodeBase } from '../common/configuration.js';
import { registerWorkbenchContribution2 } from '../common/contributions.js';
import { CustomEditorLabelService } from '../services/editor/common/customEditorLabelService.js';
import { defaultWindowTitle, defaultWindowTitleSeparator } from './parts/titlebar/windowTitle.js';
const registry = Registry.as(ConfigurationExtensions.Configuration);
// Configuration
(function registerConfiguration() {
    // Migration support
    registerWorkbenchContribution2(ConfigurationMigrationWorkbenchContribution.ID, ConfigurationMigrationWorkbenchContribution, 4 /* WorkbenchPhase.Eventually */);
    // Dynamic Configuration
    registerWorkbenchContribution2(DynamicWorkbenchSecurityConfiguration.ID, DynamicWorkbenchSecurityConfiguration, 3 /* WorkbenchPhase.AfterRestored */);
    // Workbench
    registry.registerConfiguration({
        ...workbenchConfigurationNodeBase,
        'properties': {
            'workbench.externalBrowser': {
                type: 'string',
                markdownDescription: localize(4700, null),
                included: isNative,
                restricted: true
            },
            'workbench.editor.titleScrollbarSizing': {
                type: 'string',
                enum: ['default', 'large'],
                enumDescriptions: [
                    localize(4701, null),
                    localize(4702, null)
                ],
                description: localize(4703, null),
                default: 'default',
            },
            'workbench.editor.titleScrollbarVisibility': {
                type: 'string',
                enum: ['auto', 'visible', 'hidden'],
                enumDescriptions: [
                    localize(4704, null),
                    localize(4705, null),
                    localize(4706, null)
                ],
                description: localize(4707, null),
                default: 'auto',
            },
            ["workbench.editor.showTabs" /* LayoutSettings.EDITOR_TABS_MODE */]: {
                'type': 'string',
                'enum': ["multiple" /* EditorTabsMode.MULTIPLE */, "single" /* EditorTabsMode.SINGLE */, "none" /* EditorTabsMode.NONE */],
                'enumDescriptions': [
                    localize(4708, null),
                    localize(4709, null),
                    localize(4710, null),
                ],
                'description': localize(4711, null),
                'default': 'multiple'
            },
            ["workbench.editor.editorActionsLocation" /* LayoutSettings.EDITOR_ACTIONS_LOCATION */]: {
                'type': 'string',
                'enum': ["default" /* EditorActionsLocation.DEFAULT */, "titleBar" /* EditorActionsLocation.TITLEBAR */, "hidden" /* EditorActionsLocation.HIDDEN */],
                'markdownEnumDescriptions': [
                    localize(4712, null, '`#workbench.editor.showTabs#`', '`none`'),
                    localize(4713, null, '`#window.customTitleBarVisibility#`', '`never`'),
                    localize(4714, null),
                ],
                'markdownDescription': localize(4715, null),
                'default': 'default'
            },
            'workbench.editor.alwaysShowEditorActions': {
                'type': 'boolean',
                'markdownDescription': localize(4716, null),
                'default': false
            },
            'workbench.editor.wrapTabs': {
                'type': 'boolean',
                'markdownDescription': localize(4717, null, '`#workbench.editor.showTabs#`', '`multiple`'),
                'default': false
            },
            'workbench.editor.scrollToSwitchTabs': {
                'type': 'boolean',
                'markdownDescription': localize(4718, null, '`#workbench.editor.showTabs#`', '`multiple`'),
                'default': false
            },
            'workbench.editor.highlightModifiedTabs': {
                'type': 'boolean',
                'markdownDescription': localize(4719, null, '`#workbench.editor.showTabs#`', `multiple`),
                'default': false
            },
            'workbench.editor.decorations.badges': {
                'type': 'boolean',
                'markdownDescription': localize(4720, null),
                'default': true
            },
            'workbench.editor.decorations.colors': {
                'type': 'boolean',
                'markdownDescription': localize(4721, null),
                'default': true
            },
            [CustomEditorLabelService.SETTING_ID_ENABLED]: {
                'type': 'boolean',
                'markdownDescription': localize(4722, null),
                'default': true,
            },
            [CustomEditorLabelService.SETTING_ID_PATTERNS]: {
                'type': 'object',
                'markdownDescription': (() => {
                    let customEditorLabelDescription = localize(4723, null);
                    customEditorLabelDescription += '\n- ' + [
                        localize(4724, null),
                        localize(4725, null),
                        localize(4726, null),
                        localize(4727, null),
                        localize(4728, null),
                    ].join('\n- '); // intentionally concatenated to not produce a string that is too long for translations
                    customEditorLabelDescription += '\n\n' + localize(4729, null);
                    return customEditorLabelDescription;
                })(),
                additionalProperties: {
                    type: ['string', 'null'],
                    markdownDescription: localize(4730, null),
                    minLength: 1,
                    pattern: '.*[a-zA-Z0-9].*'
                },
                'default': {}
            },
            'workbench.editor.labelFormat': {
                'type': 'string',
                'enum': ['default', 'short', 'medium', 'long'],
                'enumDescriptions': [
                    localize(4731, null),
                    localize(4732, null),
                    localize(4733, null),
                    localize(4734, null)
                ],
                'default': 'default',
                'description': localize(4735, null),
            },
            'workbench.editor.untitled.labelFormat': {
                'type': 'string',
                'enum': ['content', 'name'],
                'enumDescriptions': [
                    localize(4736, null),
                    localize(4737, null),
                ],
                'default': 'content',
                'description': localize(4738, null),
            },
            'workbench.editor.empty.hint': {
                'type': 'string',
                'enum': ['text', 'hidden'],
                'default': 'text',
                'markdownDescription': localize(4739, null)
            },
            'workbench.editor.languageDetection': {
                type: 'boolean',
                default: true,
                description: localize(4740, null),
                scope: 6 /* ConfigurationScope.LANGUAGE_OVERRIDABLE */
            },
            'workbench.editor.historyBasedLanguageDetection': {
                type: 'boolean',
                default: true,
                description: localize(4741, null),
            },
            'workbench.editor.preferHistoryBasedLanguageDetection': {
                type: 'boolean',
                default: false,
                description: localize(4742, null),
            },
            'workbench.editor.languageDetectionHints': {
                type: 'object',
                default: { 'untitledEditors': true, 'notebookEditors': true },
                description: localize(4743, null),
                additionalProperties: false,
                properties: {
                    untitledEditors: {
                        type: 'boolean',
                        description: localize(4744, null),
                    },
                    notebookEditors: {
                        type: 'boolean',
                        description: localize(4745, null),
                    }
                }
            },
            'workbench.editor.tabActionLocation': {
                type: 'string',
                enum: ['left', 'right'],
                default: 'right',
                markdownDescription: localize(4746, null, '`#workbench.editor.showTabs#`', '`multiple`')
            },
            'workbench.editor.tabActionCloseVisibility': {
                type: 'boolean',
                default: true,
                description: localize(4747, null)
            },
            'workbench.editor.tabActionUnpinVisibility': {
                type: 'boolean',
                default: true,
                description: localize(4748, null)
            },
            'workbench.editor.showTabIndex': {
                'type': 'boolean',
                'default': false,
                'markdownDescription': localize(4749, null, '`#workbench.editor.showTabs#`', '`multiple`')
            },
            'workbench.editor.tabSizing': {
                'type': 'string',
                'enum': ['fit', 'shrink', 'fixed'],
                'default': 'fit',
                'enumDescriptions': [
                    localize(4750, null),
                    localize(4751, null),
                    localize(4752, null)
                ],
                'markdownDescription': localize(4753, null, '`#workbench.editor.showTabs#`', '`multiple`')
            },
            'workbench.editor.tabSizingFixedMinWidth': {
                'type': 'number',
                'default': 50,
                'minimum': 38,
                'markdownDescription': localize(4754, null, '`#workbench.editor.tabSizing#`', '`fixed`')
            },
            'workbench.editor.tabSizingFixedMaxWidth': {
                'type': 'number',
                'default': 160,
                'minimum': 38,
                'markdownDescription': localize(4755, null, '`#workbench.editor.tabSizing#`', '`fixed`')
            },
            'window.density.editorTabHeight': {
                'type': 'string',
                'enum': ['default', 'compact'],
                'default': 'default',
                'markdownDescription': localize(4756, null, '`#workbench.editor.showTabs#`', '`multiple`')
            },
            'workbench.editor.pinnedTabSizing': {
                'type': 'string',
                'enum': ['normal', 'compact', 'shrink'],
                'default': 'normal',
                'enumDescriptions': [
                    localize(4757, null),
                    localize(4758, null),
                    localize(4759, null)
                ],
                'markdownDescription': localize(4760, null, '`#workbench.editor.showTabs#`', '`multiple`')
            },
            'workbench.editor.pinnedTabsOnSeparateRow': {
                'type': 'boolean',
                'default': false,
                'markdownDescription': localize(4761, null, '`#workbench.editor.showTabs#`', '`multiple`'),
            },
            'workbench.editor.preventPinnedEditorClose': {
                'type': 'string',
                'enum': ['keyboardAndMouse', 'keyboard', 'mouse', 'never'],
                'default': 'keyboardAndMouse',
                'enumDescriptions': [
                    localize(4762, null),
                    localize(4763, null),
                    localize(4764, null),
                    localize(4765, null)
                ],
                description: localize(4766, null),
            },
            'workbench.editor.splitSizing': {
                'type': 'string',
                'enum': ['auto', 'distribute', 'split'],
                'default': 'auto',
                'enumDescriptions': [
                    localize(4767, null),
                    localize(4768, null),
                    localize(4769, null)
                ],
                'description': localize(4770, null)
            },
            'workbench.editor.splitOnDragAndDrop': {
                'type': 'boolean',
                'default': true,
                'description': localize(4771, null)
            },
            'workbench.editor.dragToOpenWindow': {
                'type': 'boolean',
                'default': true,
                'markdownDescription': localize(4772, null)
            },
            'workbench.editor.focusRecentEditorAfterClose': {
                'type': 'boolean',
                'description': localize(4773, null),
                'default': true
            },
            'workbench.editor.showIcons': {
                'type': 'boolean',
                'description': localize(4774, null),
                'default': true
            },
            'workbench.editor.enablePreview': {
                'type': 'boolean',
                'description': localize(4775, null),
                'default': true
            },
            'workbench.editor.enablePreviewFromQuickOpen': {
                'type': 'boolean',
                'markdownDescription': localize(4776, null, '`#workbench.editor.showTabs#`', '`multiple`'),
                'default': false
            },
            'workbench.editor.enablePreviewFromCodeNavigation': {
                'type': 'boolean',
                'markdownDescription': localize(4777, null, '`#workbench.editor.showTabs#`', '`multiple`'),
                'default': false
            },
            'workbench.editor.closeOnFileDelete': {
                'type': 'boolean',
                'description': localize(4778, null),
                'default': false
            },
            'workbench.editor.openPositioning': {
                'type': 'string',
                'enum': ['left', 'right', 'first', 'last'],
                'default': 'right',
                'markdownDescription': localize(4779, null, '`left`', '`right`', '`first`', '`last`')
            },
            'workbench.editor.openSideBySideDirection': {
                'type': 'string',
                'enum': ['right', 'down'],
                'default': 'right',
                'markdownDescription': localize(4780, null)
            },
            'workbench.editor.closeEmptyGroups': {
                'type': 'boolean',
                'description': localize(4781, null),
                'default': true
            },
            'workbench.editor.revealIfOpen': {
                'type': 'boolean',
                'description': localize(4782, null),
                'default': false
            },
            'workbench.editor.useModal': {
                'type': 'string',
                'enum': ['off', 'some', 'all'],
                'enumDescriptions': [
                    localize(4783, null),
                    localize(4784, null),
                    localize(4785, null),
                ],
                'description': localize(4786, null),
                'default': product.quality !== 'stable' ? 'some' : 'off', // TODO@bpasero figure out the default
                tags: ['experimental'],
                experiment: {
                    mode: 'auto'
                }
            },
            'workbench.editor.swipeToNavigate': {
                'type': 'boolean',
                'description': localize(4787, null),
                'default': false,
                'included': isMacintosh && !isWeb
            },
            'workbench.editor.mouseBackForwardToNavigate': {
                'type': 'boolean',
                'description': localize(4788, null),
                'default': true
            },
            'workbench.editor.navigationScope': {
                'type': 'string',
                'enum': ['default', 'editorGroup', 'editor'],
                'default': 'default',
                'markdownDescription': localize(4789, null),
                'enumDescriptions': [
                    localize(4790, null),
                    localize(4791, null),
                    localize(4792, null)
                ],
            },
            'workbench.editor.restoreViewState': {
                'type': 'boolean',
                'markdownDescription': localize(4793, null, '`#workbench.editor.sharedViewState#`'),
                'default': true,
                'scope': 6 /* ConfigurationScope.LANGUAGE_OVERRIDABLE */
            },
            'workbench.editor.sharedViewState': {
                'type': 'boolean',
                'description': localize(4794, null),
                'default': false
            },
            'workbench.editor.restoreEditors': {
                'type': 'boolean',
                'description': localize(4795, null),
                'default': true
            },
            'workbench.editor.splitInGroupLayout': {
                'type': 'string',
                'enum': ['vertical', 'horizontal'],
                'default': 'horizontal',
                'markdownDescription': localize(4796, null),
                'enumDescriptions': [
                    localize(4797, null),
                    localize(4798, null)
                ]
            },
            'workbench.editor.centeredLayoutAutoResize': {
                'type': 'boolean',
                'default': true,
                'description': localize(4799, null)
            },
            'workbench.editor.centeredLayoutFixedWidth': {
                'type': 'boolean',
                'default': false,
                'description': localize(4800, null)
            },
            'workbench.editor.doubleClickTabToToggleEditorGroupSizes': {
                'type': 'string',
                'enum': ['maximize', 'expand', 'off'],
                'default': 'expand',
                'markdownDescription': localize(4801, null, '`#workbench.editor.showTabs#`', '`multiple`'),
                'enumDescriptions': [
                    localize(4802, null),
                    localize(4803, null),
                    localize(4804, null)
                ]
            },
            'workbench.editor.limit.enabled': {
                'type': 'boolean',
                'default': false,
                'description': localize(4805, null)
            },
            'workbench.editor.limit.value': {
                'type': 'number',
                'default': 10,
                'exclusiveMinimum': 0,
                'markdownDescription': localize(4806, null, '`#workbench.editor.limit.perEditorGroup#`')
            },
            'workbench.editor.limit.excludeDirty': {
                'type': 'boolean',
                'default': false,
                'description': localize(4807, null)
            },
            'workbench.editor.limit.perEditorGroup': {
                'type': 'boolean',
                'default': false,
                'description': localize(4808, null)
            },
            'workbench.localHistory.enabled': {
                'type': 'boolean',
                'default': true,
                'description': localize(4809, null),
                'scope': 5 /* ConfigurationScope.RESOURCE */
            },
            'workbench.localHistory.maxFileSize': {
                'type': 'number',
                'default': 256,
                'minimum': 1,
                'description': localize(4810, null),
                'scope': 5 /* ConfigurationScope.RESOURCE */
            },
            'workbench.localHistory.maxFileEntries': {
                'type': 'number',
                'default': 50,
                'minimum': 0,
                'description': localize(4811, null),
                'scope': 5 /* ConfigurationScope.RESOURCE */
            },
            'workbench.localHistory.exclude': {
                'type': 'object',
                'patternProperties': {
                    '.*': { 'type': 'boolean' }
                },
                'markdownDescription': localize(4812, null),
                'scope': 5 /* ConfigurationScope.RESOURCE */
            },
            'workbench.localHistory.mergeWindow': {
                'type': 'number',
                'default': 10,
                'minimum': 1,
                'markdownDescription': localize(4813, null),
                'scope': 5 /* ConfigurationScope.RESOURCE */
            },
            'workbench.commandPalette.history': {
                'type': 'number',
                'description': localize(4814, null),
                'default': 50,
                'minimum': 0
            },
            'workbench.commandPalette.preserveInput': {
                'type': 'boolean',
                'description': localize(4815, null),
                'default': false
            },
            'workbench.commandPalette.experimental.suggestCommands': {
                'type': 'boolean',
                tags: ['experimental'],
                'description': localize(4816, null),
                'default': false
            },
            'workbench.commandPalette.experimental.askChatLocation': {
                'type': 'string',
                tags: ['experimental'],
                'description': localize(4817, null),
                'default': 'chatView',
                enum: ['chatView', 'quickChat'],
                enumDescriptions: [
                    localize(4818, null),
                    localize(4819, null)
                ]
            },
            'workbench.commandPalette.showAskInChat': {
                'type': 'boolean',
                tags: ['experimental'],
                'description': localize(4820, null),
                'default': true
            },
            'workbench.commandPalette.experimental.enableNaturalLanguageSearch': {
                'type': 'boolean',
                tags: ['experimental'],
                'description': localize(4821, null),
                'default': true
            },
            'workbench.quickOpen.closeOnFocusLost': {
                'type': 'boolean',
                'description': localize(4822, null),
                'default': true
            },
            'workbench.quickOpen.preserveInput': {
                'type': 'boolean',
                'description': localize(4823, null),
                'default': false
            },
            'workbench.settings.openDefaultSettings': {
                'type': 'boolean',
                'description': localize(4824, null),
                'default': false
            },
            'workbench.settings.useSplitJSON': {
                'type': 'boolean',
                'markdownDescription': localize(4825, null),
                'default': false
            },
            'workbench.settings.openDefaultKeybindings': {
                'type': 'boolean',
                'description': localize(4826, null),
                'default': false
            },
            'workbench.settings.alwaysShowAdvancedSettings': {
                'type': 'boolean',
                'description': localize(4827, null),
                'default': product.quality !== 'stable'
            },
            'workbench.sideBar.location': {
                'type': 'string',
                'enum': ['left', 'right'],
                'default': 'left',
                'description': localize(4828, null)
            },
            'workbench.panel.showLabels': {
                'type': 'boolean',
                'default': true,
                'description': localize(4829, null),
            },
            'workbench.panel.defaultLocation': {
                'type': 'string',
                'enum': ['left', 'bottom', 'top', 'right'],
                'default': 'bottom',
                'description': localize(4830, null),
            },
            'workbench.panel.opensMaximized': {
                'type': 'string',
                'enum': ['always', 'never', 'preserve'],
                'default': 'preserve',
                'description': localize(4831, null),
                'enumDescriptions': [
                    localize(4832, null),
                    localize(4833, null),
                    localize(4834, null)
                ]
            },
            'workbench.secondarySideBar.defaultVisibility': {
                'type': 'string',
                'enum': ['hidden', 'visibleInWorkspace', 'visible', 'maximizedInWorkspace', 'maximized'],
                'default': 'visibleInWorkspace',
                'description': localize(4835, null),
                'enumDescriptions': [
                    localize(4836, null),
                    localize(4837, null),
                    localize(4838, null),
                    localize(4839, null),
                    localize(4840, null)
                ]
            },
            'workbench.secondarySideBar.forceMaximized': {
                'type': 'boolean',
                'default': false,
                tags: ['experimental'],
                'description': localize(4841, null),
            },
            'workbench.secondarySideBar.showLabels': {
                'type': 'boolean',
                'default': true,
                'markdownDescription': localize(4842, null, '`#workbench.activityBar.location#`', '`top`'),
            },
            'workbench.statusBar.visible': {
                'type': 'boolean',
                'default': true,
                'description': localize(4843, null)
            },
            ["workbench.notifications.position" /* NotificationsSettings.NOTIFICATIONS_POSITION */]: {
                'type': 'string',
                'enum': ["bottom-right" /* NotificationsPosition.BOTTOM_RIGHT */, "bottom-left" /* NotificationsPosition.BOTTOM_LEFT */, "top-right" /* NotificationsPosition.TOP_RIGHT */],
                'default': "bottom-right" /* NotificationsPosition.BOTTOM_RIGHT */,
                'description': localize(4844, null),
                'enumDescriptions': [
                    localize(4845, null),
                    localize(4846, null),
                    localize(4847, null)
                ],
                'tags': ['experimental'],
                'experiment': {
                    'mode': 'auto'
                }
            },
            ["workbench.notifications.showInTitleBar" /* NotificationsSettings.NOTIFICATIONS_BUTTON */]: {
                'type': 'boolean',
                'default': true,
                'description': localize(4848, null)
            },
            ["workbench.activityBar.location" /* LayoutSettings.ACTIVITY_BAR_LOCATION */]: {
                'type': 'string',
                'enum': ['default', 'top', 'bottom', 'hidden'],
                'default': 'default',
                'markdownDescription': localize(4849, null),
                'enumDescriptions': [
                    localize(4850, null),
                    localize(4851, null),
                    localize(4852, null),
                    localize(4853, null)
                ],
            },
            ["workbench.activityBar.autoHide" /* LayoutSettings.ACTIVITY_BAR_AUTO_HIDE */]: {
                'type': 'boolean',
                'default': false,
                'markdownDescription': localize(4854, null, '`#workbench.activityBar.location#`', '`top`', '`bottom`'),
            },
            ["workbench.activityBar.compact" /* LayoutSettings.ACTIVITY_BAR_COMPACT */]: {
                'type': 'boolean',
                'default': false,
                'markdownDescription': localize(4855, null, '`#workbench.activityBar.location#`', '`default`'),
            },
            'workbench.activityBar.iconClickBehavior': {
                'type': 'string',
                'enum': ['toggle', 'focus'],
                'default': 'toggle',
                'markdownDescription': localize(4856, null, '`#workbench.activityBar.location#`', '`default`'),
                'enumDescriptions': [
                    localize(4857, null),
                    localize(4858, null)
                ]
            },
            'workbench.view.alwaysShowHeaderActions': {
                'type': 'boolean',
                'default': false,
                'description': localize(4859, null)
            },
            'workbench.view.showQuietly': {
                'type': 'object',
                'description': localize(4860, null),
                'scope': 4 /* ConfigurationScope.WINDOW */,
                'properties': {
                    'workbench.panel.output': {
                        'type': 'boolean',
                        'description': localize(4861, null)
                    }
                },
                'additionalProperties': false
            },
            'workbench.fontAliasing': {
                'type': 'string',
                'enum': ['default', 'antialiased', 'none', 'auto'],
                'default': 'default',
                'description': localize(4862, null),
                'enumDescriptions': [
                    localize(4863, null),
                    localize(4864, null),
                    localize(4865, null),
                    localize(4866, null)
                ],
                'included': isMacintosh
            },
            'workbench.settings.editor': {
                'type': 'string',
                'enum': ['ui', 'json'],
                'enumDescriptions': [
                    localize(4867, null),
                    localize(4868, null),
                ],
                'description': localize(4869, null),
                'default': 'ui',
                'scope': 4 /* ConfigurationScope.WINDOW */
            },
            'workbench.settings.showAISearchToggle': {
                'type': 'boolean',
                'default': true,
                'description': localize(4870, null),
            },
            'workbench.hover.delay': {
                'type': 'number',
                'description': localize(4871, null),
                // Testing has indicated that on Windows and Linux 500 ms matches the native hovers most closely.
                // On Mac, the delay is 1500.
                'default': isMacintosh ? 1500 : 500,
                'minimum': 0
            },
            'workbench.hover.reducedDelay': {
                'type': 'number',
                'description': localize(4872, null),
                'default': 500,
                'minimum': 0
            },
            'workbench.reduceMotion': {
                type: 'string',
                description: localize(4873, null),
                'enumDescriptions': [
                    localize(4874, null),
                    localize(4875, null),
                    localize(4876, null),
                ],
                default: 'auto',
                tags: ['accessibility'],
                enum: ['on', 'off', 'auto']
            },
            'workbench.reduceTransparency': {
                type: 'string',
                description: localize(4877, null),
                'enumDescriptions': [
                    localize(4878, null),
                    localize(4879, null),
                    localize(4880, null),
                ],
                default: 'off',
                tags: ['accessibility'],
                enum: ['on', 'off', 'auto']
            },
            'workbench.navigationControl.enabled': {
                'type': 'boolean',
                'default': true,
                'markdownDescription': isWeb ?
                    localize(4881, null) :
                    localize(4882, null, '`#window.customTitleBarVisibility#`', '`never`')
            },
            ["workbench.layoutControl.enabled" /* LayoutSettings.LAYOUT_ACTIONS */]: {
                'type': 'boolean',
                'default': true,
                'markdownDescription': isWeb ?
                    localize(4883, null) :
                    localize(4884, null, '`#window.customTitleBarVisibility#`', '`never`')
            },
            'workbench.layoutControl.type': {
                'type': 'string',
                'enum': ['menu', 'toggles', 'both'],
                'enumDescriptions': [
                    localize(4885, null),
                    localize(4886, null),
                    localize(4887, null),
                ],
                'default': 'both',
                'description': localize(4888, null),
            },
            'workbench.tips.enabled': {
                'type': 'boolean',
                'default': true,
                'description': localize(4889, null)
            },
            ["workbench.shadows" /* LayoutSettings.SHADOWS */]: {
                'type': 'boolean',
                'default': true,
                'description': localize(4890, null)
            },
        }
    });
    // Window
    let windowTitleDescription = localize(4891, null);
    windowTitleDescription += '\n- ' + [
        localize(4892, null),
        localize(4893, null),
        localize(4894, null),
        localize(4895, null),
        localize(4896, null),
        localize(4897, null),
        localize(4898, null),
        localize(4899, null),
        localize(4900, null),
        localize(4901, null),
        localize(4902, null),
        localize(4903, null),
        localize(4904, null),
        localize(4905, null),
        localize(4906, null),
        localize(4907, null),
        localize(4908, null),
        localize(4909, null),
        localize(4910, null),
        localize(4911, null, '`accessibility.windowTitleOptimized`'),
        localize(4912, null)
    ].join('\n- '); // intentionally concatenated to not produce a string that is too long for translations
    registry.registerConfiguration({
        ...windowConfigurationNodeBase,
        'properties': {
            'window.title': {
                'type': 'string',
                'default': defaultWindowTitle,
                'markdownDescription': windowTitleDescription
            },
            'window.titleSeparator': {
                'type': 'string',
                'default': defaultWindowTitleSeparator,
                'markdownDescription': localize(4913, null, '`#window.title#`')
            },
            ["window.commandCenter" /* LayoutSettings.COMMAND_CENTER */]: {
                type: 'boolean',
                default: true,
                markdownDescription: isWeb ?
                    localize(4914, null) :
                    localize(4915, null, '`#window.customTitleBarVisibility#`', '`never`')
            },
            'window.menuBarVisibility': {
                'type': 'string',
                'enum': ['classic', 'visible', 'toggle', 'hidden', 'compact'],
                'markdownEnumDescriptions': [
                    localize(4916, null),
                    localize(4917, null),
                    isMacintosh ?
                        localize(4918, null) :
                        localize(4919, null),
                    localize(4920, null),
                    isWeb ?
                        localize(4921, null) :
                        localize(4922, null, '`#window.titleBarStyle#`', '`native`', '`#window.menuStyle#`', '`native`', '`inherit`')
                ],
                'default': isWeb ? 'compact' : 'classic',
                'scope': 1 /* ConfigurationScope.APPLICATION */,
                'markdownDescription': isMacintosh ?
                    localize(4923, null) :
                    localize(4924, null),
                'included': isWindows || isLinux || isWeb
            },
            'window.enableMenuBarMnemonics': {
                'type': 'boolean',
                'default': true,
                'scope': 1 /* ConfigurationScope.APPLICATION */,
                'description': localize(4925, null),
                'included': isWindows || isLinux
            },
            'window.customMenuBarAltFocus': {
                'type': 'boolean',
                'default': true,
                'scope': 1 /* ConfigurationScope.APPLICATION */,
                'markdownDescription': localize(4926, null),
                'included': isWindows || isLinux
            },
            'window.openFilesInNewWindow': {
                'type': 'string',
                'enum': ['on', 'off', 'default'],
                'enumDescriptions': [
                    localize(4927, null),
                    localize(4928, null),
                    isMacintosh ?
                        localize(4929, null) :
                        localize(4930, null)
                ],
                'default': 'off',
                'scope': 1 /* ConfigurationScope.APPLICATION */,
                'markdownDescription': isMacintosh ?
                    localize(4931, null) :
                    localize(4932, null)
            },
            'window.openFoldersInNewWindow': {
                'type': 'string',
                'enum': ['on', 'off', 'default'],
                'enumDescriptions': [
                    localize(4933, null),
                    localize(4934, null),
                    localize(4935, null)
                ],
                'default': 'default',
                'scope': 1 /* ConfigurationScope.APPLICATION */,
                'markdownDescription': localize(4936, null)
            },
            'window.confirmBeforeClose': {
                'type': 'string',
                'enum': ['always', 'keyboardOnly', 'never'],
                'enumDescriptions': [
                    isWeb ?
                        localize(4937, null) :
                        localize(4938, null),
                    isWeb ?
                        localize(4939, null) :
                        localize(4940, null),
                    isWeb ?
                        localize(4941, null) :
                        localize(4942, null)
                ],
                'default': (isWeb && !isStandalone()) ? 'keyboardOnly' : 'never', // on by default in web, unless PWA, never on desktop
                'markdownDescription': isWeb ?
                    localize(4943, null) :
                    localize(4944, null),
                'scope': 1 /* ConfigurationScope.APPLICATION */
            }
        }
    });
    // Dynamic Window Configuration
    registerWorkbenchContribution2(DynamicWindowConfiguration.ID, DynamicWindowConfiguration, 4 /* WorkbenchPhase.Eventually */);
    // Problems
    registry.registerConfiguration({
        ...problemsConfigurationNodeBase,
        'properties': {
            'problems.visibility': {
                'type': 'boolean',
                'default': true,
                'description': localize(4945, null),
            },
        }
    });
    // Zen Mode
    registry.registerConfiguration({
        'id': 'zenMode',
        'order': 9,
        'title': localize(4946, null),
        'type': 'object',
        'properties': {
            'zenMode.fullScreen': {
                'type': 'boolean',
                'default': true,
                'description': localize(4947, null)
            },
            'zenMode.centerLayout': {
                'type': 'boolean',
                'default': true,
                'description': localize(4948, null)
            },
            'zenMode.showTabs': {
                'type': 'string',
                'enum': ['multiple', 'single', 'none'],
                'description': localize(4949, null),
                'enumDescriptions': [
                    localize(4950, null),
                    localize(4951, null),
                    localize(4952, null),
                ],
                'default': 'multiple'
            },
            'zenMode.hideStatusBar': {
                'type': 'boolean',
                'default': true,
                'description': localize(4953, null)
            },
            'zenMode.hideActivityBar': {
                'type': 'boolean',
                'default': true,
                'description': localize(4954, null)
            },
            'zenMode.hideLineNumbers': {
                'type': 'boolean',
                'default': true,
                'description': localize(4955, null)
            },
            'zenMode.restore': {
                'type': 'boolean',
                'default': true,
                'description': localize(4956, null)
            },
            'zenMode.silentNotifications': {
                'type': 'boolean',
                'default': true,
                'description': localize(4957, null)
            }
        }
    });
})();
Registry.as(Extensions.ConfigurationMigration)
    .registerConfigurationMigrations([{
        key: 'workbench.activityBar.visible', migrateFn: (value) => {
            const result = [];
            if (value !== undefined) {
                result.push(['workbench.activityBar.visible', { value: undefined }]);
            }
            if (value === false) {
                result.push(["workbench.activityBar.location" /* LayoutSettings.ACTIVITY_BAR_LOCATION */, { value: "hidden" /* ActivityBarPosition.HIDDEN */ }]);
            }
            return result;
        }
    }]);
Registry.as(Extensions.ConfigurationMigration)
    .registerConfigurationMigrations([{
        key: "workbench.activityBar.location" /* LayoutSettings.ACTIVITY_BAR_LOCATION */, migrateFn: (value) => {
            const results = [];
            if (value === 'side') {
                results.push(["workbench.activityBar.location" /* LayoutSettings.ACTIVITY_BAR_LOCATION */, { value: "default" /* ActivityBarPosition.DEFAULT */ }]);
            }
            return results;
        }
    }]);
Registry.as(Extensions.ConfigurationMigration)
    .registerConfigurationMigrations([{
        key: 'workbench.editor.doubleClickTabToToggleEditorGroupSizes', migrateFn: (value) => {
            const results = [];
            if (typeof value === 'boolean') {
                value = value ? 'expand' : 'off';
                results.push(['workbench.editor.doubleClickTabToToggleEditorGroupSizes', { value }]);
            }
            return results;
        }
    }, {
        key: "workbench.editor.showTabs" /* LayoutSettings.EDITOR_TABS_MODE */, migrateFn: (value) => {
            const results = [];
            if (typeof value === 'boolean') {
                value = value ? "multiple" /* EditorTabsMode.MULTIPLE */ : "single" /* EditorTabsMode.SINGLE */;
                results.push(["workbench.editor.showTabs" /* LayoutSettings.EDITOR_TABS_MODE */, { value }]);
            }
            return results;
        }
    }, {
        key: 'workbench.editor.tabCloseButton', migrateFn: (value) => {
            const result = [];
            if (value === 'left' || value === 'right') {
                result.push(['workbench.editor.tabActionLocation', { value }]);
            }
            else if (value === 'off') {
                result.push(['workbench.editor.tabActionCloseVisibility', { value: false }]);
            }
            return result;
        }
    }, {
        key: 'zenMode.hideTabs', migrateFn: (value) => {
            const result = [['zenMode.hideTabs', { value: undefined }]];
            if (value === true) {
                result.push(['zenMode.showTabs', { value: 'single' }]);
            }
            return result;
        }
    }]);
//# sourceMappingURL=workbench.contribution.js.map