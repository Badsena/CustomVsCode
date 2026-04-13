/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { localize } from '../../nls.js';
import { registerColor, editorBackground, contrastBorder, transparent, editorWidgetBackground, textLinkForeground, lighten, darken, focusBorder, activeContrastBorder, editorWidgetForeground, editorErrorForeground, editorWarningForeground, editorInfoForeground, treeIndentGuidesStroke, errorForeground, listActiveSelectionBackground, listActiveSelectionForeground, editorForeground, toolbarHoverBackground, inputBorder, widgetBorder, scrollbarShadow } from '../../platform/theme/common/colorRegistry.js';
import { Color } from '../../base/common/color.js';
import { ColorScheme } from '../../platform/theme/common/theme.js';
// < --- Workbench (not customizable) --- >
export function WORKBENCH_BACKGROUND(theme) {
    switch (theme.type) {
        case ColorScheme.LIGHT:
            return Color.fromHex('#F3F3F3');
        case ColorScheme.HIGH_CONTRAST_LIGHT:
            return Color.fromHex('#FFFFFF');
        case ColorScheme.HIGH_CONTRAST_DARK:
            return Color.fromHex('#000000');
        default:
            return Color.fromHex('#252526');
    }
}
// < --- Tabs --- >
//#region Tab Background
export const TAB_ACTIVE_BACKGROUND = registerColor('tab.activeBackground', editorBackground, localize(5053, null));
export const TAB_UNFOCUSED_ACTIVE_BACKGROUND = registerColor('tab.unfocusedActiveBackground', TAB_ACTIVE_BACKGROUND, localize(5054, null));
export const TAB_INACTIVE_BACKGROUND = registerColor('tab.inactiveBackground', {
    dark: '#2D2D2D',
    light: '#ECECEC',
    hcDark: null,
    hcLight: null,
}, localize(5055, null));
export const TAB_UNFOCUSED_INACTIVE_BACKGROUND = registerColor('tab.unfocusedInactiveBackground', TAB_INACTIVE_BACKGROUND, localize(5056, null));
//#endregion
//#region Tab Foreground
export const TAB_ACTIVE_FOREGROUND = registerColor('tab.activeForeground', {
    dark: Color.white,
    light: '#333333',
    hcDark: Color.white,
    hcLight: '#292929'
}, localize(5057, null));
export const TAB_INACTIVE_FOREGROUND = registerColor('tab.inactiveForeground', {
    dark: transparent(TAB_ACTIVE_FOREGROUND, 0.5),
    light: transparent(TAB_ACTIVE_FOREGROUND, 0.7),
    hcDark: Color.white,
    hcLight: '#292929'
}, localize(5058, null));
export const TAB_UNFOCUSED_ACTIVE_FOREGROUND = registerColor('tab.unfocusedActiveForeground', {
    dark: transparent(TAB_ACTIVE_FOREGROUND, 0.5),
    light: transparent(TAB_ACTIVE_FOREGROUND, 0.7),
    hcDark: Color.white,
    hcLight: '#292929'
}, localize(5059, null));
export const TAB_UNFOCUSED_INACTIVE_FOREGROUND = registerColor('tab.unfocusedInactiveForeground', {
    dark: transparent(TAB_INACTIVE_FOREGROUND, 0.5),
    light: transparent(TAB_INACTIVE_FOREGROUND, 0.5),
    hcDark: Color.white,
    hcLight: '#292929'
}, localize(5060, null));
//#endregion
//#region Tab Hover Foreground/Background
export const TAB_HOVER_BACKGROUND = registerColor('tab.hoverBackground', null, localize(5061, null));
export const TAB_UNFOCUSED_HOVER_BACKGROUND = registerColor('tab.unfocusedHoverBackground', {
    dark: transparent(TAB_HOVER_BACKGROUND, 0.5),
    light: transparent(TAB_HOVER_BACKGROUND, 0.7),
    hcDark: null,
    hcLight: null
}, localize(5062, null));
export const TAB_HOVER_FOREGROUND = registerColor('tab.hoverForeground', null, localize(5063, null));
export const TAB_UNFOCUSED_HOVER_FOREGROUND = registerColor('tab.unfocusedHoverForeground', {
    dark: transparent(TAB_HOVER_FOREGROUND, 0.5),
    light: transparent(TAB_HOVER_FOREGROUND, 0.5),
    hcDark: null,
    hcLight: null
}, localize(5064, null));
//#endregion
//#region Tab Borders
export const TAB_BORDER = registerColor('tab.border', {
    dark: '#252526',
    light: '#F3F3F3',
    hcDark: contrastBorder,
    hcLight: contrastBorder,
}, localize(5065, null));
export const TAB_LAST_PINNED_BORDER = registerColor('tab.lastPinnedBorder', {
    dark: treeIndentGuidesStroke,
    light: treeIndentGuidesStroke,
    hcDark: contrastBorder,
    hcLight: contrastBorder
}, localize(5066, null));
export const TAB_ACTIVE_BORDER = registerColor('tab.activeBorder', null, localize(5067, null));
export const TAB_UNFOCUSED_ACTIVE_BORDER = registerColor('tab.unfocusedActiveBorder', {
    dark: transparent(TAB_ACTIVE_BORDER, 0.5),
    light: transparent(TAB_ACTIVE_BORDER, 0.7),
    hcDark: null,
    hcLight: null
}, localize(5068, null));
export const TAB_ACTIVE_BORDER_TOP = registerColor('tab.activeBorderTop', {
    dark: null,
    light: null,
    hcDark: null,
    hcLight: '#B5200D'
}, localize(5069, null));
export const TAB_UNFOCUSED_ACTIVE_BORDER_TOP = registerColor('tab.unfocusedActiveBorderTop', {
    dark: transparent(TAB_ACTIVE_BORDER_TOP, 0.5),
    light: transparent(TAB_ACTIVE_BORDER_TOP, 0.7),
    hcDark: null,
    hcLight: '#B5200D'
}, localize(5070, null));
export const TAB_SELECTED_BORDER_TOP = registerColor('tab.selectedBorderTop', TAB_ACTIVE_BORDER_TOP, localize(5071, null));
export const TAB_SELECTED_BACKGROUND = registerColor('tab.selectedBackground', TAB_ACTIVE_BACKGROUND, localize(5072, null));
export const TAB_SELECTED_FOREGROUND = registerColor('tab.selectedForeground', TAB_ACTIVE_FOREGROUND, localize(5073, null));
export const TAB_HOVER_BORDER = registerColor('tab.hoverBorder', null, localize(5074, null));
export const TAB_UNFOCUSED_HOVER_BORDER = registerColor('tab.unfocusedHoverBorder', {
    dark: transparent(TAB_HOVER_BORDER, 0.5),
    light: transparent(TAB_HOVER_BORDER, 0.7),
    hcDark: null,
    hcLight: contrastBorder
}, localize(5075, null));
//#endregion
//#region Tab Drag and Drop Border
export const TAB_DRAG_AND_DROP_BORDER = registerColor('tab.dragAndDropBorder', {
    dark: TAB_ACTIVE_FOREGROUND,
    light: TAB_ACTIVE_FOREGROUND,
    hcDark: activeContrastBorder,
    hcLight: activeContrastBorder
}, localize(5076, null));
//#endregion
//#region Tab Modified Border
export const TAB_ACTIVE_MODIFIED_BORDER = registerColor('tab.activeModifiedBorder', {
    dark: '#3399CC',
    light: '#33AAEE',
    hcDark: null,
    hcLight: contrastBorder
}, localize(5077, null));
export const TAB_INACTIVE_MODIFIED_BORDER = registerColor('tab.inactiveModifiedBorder', {
    dark: transparent(TAB_ACTIVE_MODIFIED_BORDER, 0.5),
    light: transparent(TAB_ACTIVE_MODIFIED_BORDER, 0.5),
    hcDark: Color.white,
    hcLight: contrastBorder
}, localize(5078, null));
export const TAB_UNFOCUSED_ACTIVE_MODIFIED_BORDER = registerColor('tab.unfocusedActiveModifiedBorder', {
    dark: transparent(TAB_ACTIVE_MODIFIED_BORDER, 0.5),
    light: transparent(TAB_ACTIVE_MODIFIED_BORDER, 0.7),
    hcDark: Color.white,
    hcLight: contrastBorder
}, localize(5079, null));
export const TAB_UNFOCUSED_INACTIVE_MODIFIED_BORDER = registerColor('tab.unfocusedInactiveModifiedBorder', {
    dark: transparent(TAB_INACTIVE_MODIFIED_BORDER, 0.5),
    light: transparent(TAB_INACTIVE_MODIFIED_BORDER, 0.5),
    hcDark: Color.white,
    hcLight: contrastBorder
}, localize(5080, null));
//#endregion
// < --- Editors --- >
export const EDITOR_PANE_BACKGROUND = registerColor('editorPane.background', editorBackground, localize(5081, null));
export const EDITOR_GROUP_EMPTY_BACKGROUND = registerColor('editorGroup.emptyBackground', null, localize(5082, null));
export const EDITOR_GROUP_FOCUSED_EMPTY_BORDER = registerColor('editorGroup.focusedEmptyBorder', {
    dark: null,
    light: null,
    hcDark: focusBorder,
    hcLight: focusBorder
}, localize(5083, null));
export const EDITOR_GROUP_HEADER_TABS_BACKGROUND = registerColor('editorGroupHeader.tabsBackground', {
    dark: '#252526',
    light: '#F3F3F3',
    hcDark: null,
    hcLight: null
}, localize(5084, null));
export const EDITOR_GROUP_HEADER_TABS_BORDER = registerColor('editorGroupHeader.tabsBorder', null, localize(5085, null));
export const EDITOR_GROUP_HEADER_NO_TABS_BACKGROUND = registerColor('editorGroupHeader.noTabsBackground', editorBackground, localize(5086, null));
export const EDITOR_GROUP_HEADER_BORDER = registerColor('editorGroupHeader.border', {
    dark: null,
    light: null,
    hcDark: contrastBorder,
    hcLight: contrastBorder
}, localize(5087, null));
export const EDITOR_GROUP_BORDER = registerColor('editorGroup.border', {
    dark: '#444444',
    light: '#E7E7E7',
    hcDark: contrastBorder,
    hcLight: contrastBorder
}, localize(5088, null));
export const EDITOR_DRAG_AND_DROP_BACKGROUND = registerColor('editorGroup.dropBackground', {
    dark: Color.fromHex('#53595D').transparent(0.5),
    light: Color.fromHex('#2677CB').transparent(0.18),
    hcDark: null,
    hcLight: Color.fromHex('#0F4A85').transparent(0.50)
}, localize(5089, null));
export const EDITOR_DROP_INTO_PROMPT_FOREGROUND = registerColor('editorGroup.dropIntoPromptForeground', editorWidgetForeground, localize(5090, null));
export const EDITOR_DROP_INTO_PROMPT_BACKGROUND = registerColor('editorGroup.dropIntoPromptBackground', editorWidgetBackground, localize(5091, null));
export const EDITOR_DROP_INTO_PROMPT_BORDER = registerColor('editorGroup.dropIntoPromptBorder', {
    dark: null,
    light: null,
    hcDark: contrastBorder,
    hcLight: contrastBorder
}, localize(5092, null));
export const SIDE_BY_SIDE_EDITOR_HORIZONTAL_BORDER = registerColor('sideBySideEditor.horizontalBorder', EDITOR_GROUP_BORDER, localize(5093, null));
export const SIDE_BY_SIDE_EDITOR_VERTICAL_BORDER = registerColor('sideBySideEditor.verticalBorder', EDITOR_GROUP_BORDER, localize(5094, null));
// < --- Output Editor -->
const OUTPUT_VIEW_BACKGROUND = registerColor('outputView.background', null, localize(5095, null));
registerColor('outputViewStickyScroll.background', OUTPUT_VIEW_BACKGROUND, localize(5096, null));
// < --- Banner --- >
export const BANNER_BACKGROUND = registerColor('banner.background', {
    dark: listActiveSelectionBackground,
    light: darken(listActiveSelectionBackground, 0.3),
    hcDark: listActiveSelectionBackground,
    hcLight: listActiveSelectionBackground
}, localize(5097, null));
export const BANNER_FOREGROUND = registerColor('banner.foreground', listActiveSelectionForeground, localize(5098, null));
export const BANNER_ICON_FOREGROUND = registerColor('banner.iconForeground', editorInfoForeground, localize(5099, null));
// < --- Status --- >
export const STATUS_BAR_FOREGROUND = registerColor('statusBar.foreground', {
    dark: '#FFFFFF',
    light: '#FFFFFF',
    hcDark: '#FFFFFF',
    hcLight: editorForeground
}, localize(5100, null));
export const STATUS_BAR_NO_FOLDER_FOREGROUND = registerColor('statusBar.noFolderForeground', STATUS_BAR_FOREGROUND, localize(5101, null));
export const STATUS_BAR_BACKGROUND = registerColor('statusBar.background', {
    dark: '#007ACC',
    light: '#007ACC',
    hcDark: null,
    hcLight: null,
}, localize(5102, null));
export const STATUS_BAR_NO_FOLDER_BACKGROUND = registerColor('statusBar.noFolderBackground', {
    dark: '#68217A',
    light: '#68217A',
    hcDark: null,
    hcLight: null,
}, localize(5103, null));
export const STATUS_BAR_BORDER = registerColor('statusBar.border', {
    dark: null,
    light: null,
    hcDark: contrastBorder,
    hcLight: contrastBorder
}, localize(5104, null));
export const STATUS_BAR_FOCUS_BORDER = registerColor('statusBar.focusBorder', {
    dark: STATUS_BAR_FOREGROUND,
    light: STATUS_BAR_FOREGROUND,
    hcDark: null,
    hcLight: STATUS_BAR_FOREGROUND
}, localize(5105, null));
export const STATUS_BAR_NO_FOLDER_BORDER = registerColor('statusBar.noFolderBorder', STATUS_BAR_BORDER, localize(5106, null));
export const STATUS_BAR_ITEM_ACTIVE_BACKGROUND = registerColor('statusBarItem.activeBackground', {
    dark: Color.white.transparent(0.18),
    light: Color.white.transparent(0.18),
    hcDark: Color.white.transparent(0.18),
    hcLight: Color.black.transparent(0.18)
}, localize(5107, null));
export const STATUS_BAR_ITEM_FOCUS_BORDER = registerColor('statusBarItem.focusBorder', {
    dark: STATUS_BAR_FOREGROUND,
    light: STATUS_BAR_FOREGROUND,
    hcDark: null,
    hcLight: activeContrastBorder
}, localize(5108, null));
export const STATUS_BAR_ITEM_HOVER_BACKGROUND = registerColor('statusBarItem.hoverBackground', {
    dark: Color.white.transparent(0.12),
    light: Color.black.transparent(0.12),
    hcDark: Color.black,
    hcLight: Color.white
}, localize(5109, null));
export const STATUS_BAR_ITEM_HOVER_FOREGROUND = registerColor('statusBarItem.hoverForeground', STATUS_BAR_FOREGROUND, localize(5110, null));
export const STATUS_BAR_ITEM_COMPACT_HOVER_BACKGROUND = registerColor('statusBarItem.compactHoverBackground', {
    dark: Color.white.transparent(0.12),
    light: Color.black.transparent(0.12),
    hcDark: Color.black,
    hcLight: Color.white
}, localize(5111, null));
export const STATUS_BAR_PROMINENT_ITEM_FOREGROUND = registerColor('statusBarItem.prominentForeground', STATUS_BAR_FOREGROUND, localize(5112, null));
export const STATUS_BAR_PROMINENT_ITEM_BACKGROUND = registerColor('statusBarItem.prominentBackground', Color.black.transparent(0.5), localize(5113, null));
export const STATUS_BAR_PROMINENT_ITEM_HOVER_FOREGROUND = registerColor('statusBarItem.prominentHoverForeground', STATUS_BAR_ITEM_HOVER_FOREGROUND, localize(5114, null));
export const STATUS_BAR_PROMINENT_ITEM_HOVER_BACKGROUND = registerColor('statusBarItem.prominentHoverBackground', STATUS_BAR_ITEM_HOVER_BACKGROUND, localize(5115, null));
export const STATUS_BAR_ERROR_ITEM_BACKGROUND = registerColor('statusBarItem.errorBackground', {
    dark: darken(errorForeground, .4),
    light: darken(errorForeground, .4),
    hcDark: null,
    hcLight: '#B5200D'
}, localize(5116, null));
export const STATUS_BAR_ERROR_ITEM_FOREGROUND = registerColor('statusBarItem.errorForeground', Color.white, localize(5117, null));
export const STATUS_BAR_ERROR_ITEM_HOVER_FOREGROUND = registerColor('statusBarItem.errorHoverForeground', STATUS_BAR_ITEM_HOVER_FOREGROUND, localize(5118, null));
export const STATUS_BAR_ERROR_ITEM_HOVER_BACKGROUND = registerColor('statusBarItem.errorHoverBackground', STATUS_BAR_ITEM_HOVER_BACKGROUND, localize(5119, null));
export const STATUS_BAR_WARNING_ITEM_BACKGROUND = registerColor('statusBarItem.warningBackground', {
    dark: darken(editorWarningForeground, .4),
    light: darken(editorWarningForeground, .4),
    hcDark: null,
    hcLight: '#895503'
}, localize(5120, null));
export const STATUS_BAR_WARNING_ITEM_FOREGROUND = registerColor('statusBarItem.warningForeground', Color.white, localize(5121, null));
export const STATUS_BAR_WARNING_ITEM_HOVER_FOREGROUND = registerColor('statusBarItem.warningHoverForeground', STATUS_BAR_ITEM_HOVER_FOREGROUND, localize(5122, null));
export const STATUS_BAR_WARNING_ITEM_HOVER_BACKGROUND = registerColor('statusBarItem.warningHoverBackground', STATUS_BAR_ITEM_HOVER_BACKGROUND, localize(5123, null));
// < --- Activity Bar --- >
export const ACTIVITY_BAR_BACKGROUND = registerColor('activityBar.background', {
    dark: '#333333',
    light: '#2C2C2C',
    hcDark: '#000000',
    hcLight: '#FFFFFF'
}, localize(5124, null));
export const ACTIVITY_BAR_FOREGROUND = registerColor('activityBar.foreground', {
    dark: Color.white,
    light: Color.white,
    hcDark: Color.white,
    hcLight: editorForeground
}, localize(5125, null));
export const ACTIVITY_BAR_INACTIVE_FOREGROUND = registerColor('activityBar.inactiveForeground', {
    dark: transparent(ACTIVITY_BAR_FOREGROUND, 0.4),
    light: transparent(ACTIVITY_BAR_FOREGROUND, 0.4),
    hcDark: Color.white,
    hcLight: editorForeground
}, localize(5126, null));
export const ACTIVITY_BAR_BORDER = registerColor('activityBar.border', {
    dark: null,
    light: null,
    hcDark: contrastBorder,
    hcLight: contrastBorder
}, localize(5127, null));
export const ACTIVITY_BAR_ACTIVE_BORDER = registerColor('activityBar.activeBorder', {
    dark: ACTIVITY_BAR_FOREGROUND,
    light: ACTIVITY_BAR_FOREGROUND,
    hcDark: contrastBorder,
    hcLight: contrastBorder
}, localize(5128, null));
export const ACTIVITY_BAR_ACTIVE_FOCUS_BORDER = registerColor('activityBar.activeFocusBorder', {
    dark: null,
    light: null,
    hcDark: null,
    hcLight: '#B5200D'
}, localize(5129, null));
export const ACTIVITY_BAR_ACTIVE_BACKGROUND = registerColor('activityBar.activeBackground', null, localize(5130, null));
export const ACTIVITY_BAR_DRAG_AND_DROP_BORDER = registerColor('activityBar.dropBorder', {
    dark: ACTIVITY_BAR_FOREGROUND,
    light: ACTIVITY_BAR_FOREGROUND,
    hcDark: null,
    hcLight: null,
}, localize(5131, null));
export const ACTIVITY_BAR_BADGE_BACKGROUND = registerColor('activityBarBadge.background', {
    dark: '#007ACC',
    light: '#007ACC',
    hcDark: '#000000',
    hcLight: '#0F4A85'
}, localize(5132, null));
export const ACTIVITY_BAR_BADGE_FOREGROUND = registerColor('activityBarBadge.foreground', Color.white, localize(5133, null));
export const ACTIVITY_BAR_TOP_FOREGROUND = registerColor('activityBarTop.foreground', {
    dark: '#E7E7E7',
    light: '#424242',
    hcDark: Color.white,
    hcLight: editorForeground
}, localize(5134, null));
export const ACTIVITY_BAR_TOP_ACTIVE_BORDER = registerColor('activityBarTop.activeBorder', {
    dark: ACTIVITY_BAR_TOP_FOREGROUND,
    light: ACTIVITY_BAR_TOP_FOREGROUND,
    hcDark: contrastBorder,
    hcLight: '#B5200D'
}, localize(5135, null));
export const ACTIVITY_BAR_TOP_ACTIVE_BACKGROUND = registerColor('activityBarTop.activeBackground', null, localize(5136, null));
export const ACTIVITY_BAR_TOP_INACTIVE_FOREGROUND = registerColor('activityBarTop.inactiveForeground', {
    dark: transparent(ACTIVITY_BAR_TOP_FOREGROUND, 0.6),
    light: transparent(ACTIVITY_BAR_TOP_FOREGROUND, 0.75),
    hcDark: Color.white,
    hcLight: editorForeground
}, localize(5137, null));
export const ACTIVITY_BAR_TOP_DRAG_AND_DROP_BORDER = registerColor('activityBarTop.dropBorder', ACTIVITY_BAR_TOP_FOREGROUND, localize(5138, null));
export const ACTIVITY_BAR_TOP_BACKGROUND = registerColor('activityBarTop.background', null, localize(5139, null));
// < --- Panels --- >
export const PANEL_BACKGROUND = registerColor('panel.background', editorBackground, localize(5140, null));
export const PANEL_BORDER = registerColor('panel.border', {
    dark: Color.fromHex('#808080').transparent(0.35),
    light: Color.fromHex('#808080').transparent(0.35),
    hcDark: contrastBorder,
    hcLight: contrastBorder
}, localize(5141, null));
export const PANEL_TITLE_BORDER = registerColor('panelTitle.border', {
    dark: null,
    light: null,
    hcDark: PANEL_BORDER,
    hcLight: PANEL_BORDER
}, localize(5142, null));
export const PANEL_ACTIVE_TITLE_FOREGROUND = registerColor('panelTitle.activeForeground', {
    dark: '#E7E7E7',
    light: '#424242',
    hcDark: Color.white,
    hcLight: editorForeground
}, localize(5143, null));
export const PANEL_INACTIVE_TITLE_FOREGROUND = registerColor('panelTitle.inactiveForeground', {
    dark: transparent(PANEL_ACTIVE_TITLE_FOREGROUND, 0.6),
    light: transparent(PANEL_ACTIVE_TITLE_FOREGROUND, 0.75),
    hcDark: Color.white,
    hcLight: editorForeground
}, localize(5144, null));
export const PANEL_ACTIVE_TITLE_BORDER = registerColor('panelTitle.activeBorder', {
    dark: PANEL_ACTIVE_TITLE_FOREGROUND,
    light: PANEL_ACTIVE_TITLE_FOREGROUND,
    hcDark: contrastBorder,
    hcLight: '#B5200D'
}, localize(5145, null));
export const PANEL_TITLE_BADGE_BACKGROUND = registerColor('panelTitleBadge.background', ACTIVITY_BAR_BADGE_BACKGROUND, localize(5146, null));
export const PANEL_TITLE_BADGE_FOREGROUND = registerColor('panelTitleBadge.foreground', ACTIVITY_BAR_BADGE_FOREGROUND, localize(5147, null));
export const PANEL_INPUT_BORDER = registerColor('panelInput.border', {
    dark: inputBorder,
    light: Color.fromHex('#ddd'),
    hcDark: inputBorder,
    hcLight: inputBorder
}, localize(5148, null));
export const PANEL_DRAG_AND_DROP_BORDER = registerColor('panel.dropBorder', PANEL_ACTIVE_TITLE_FOREGROUND, localize(5149, null));
export const PANEL_SECTION_DRAG_AND_DROP_BACKGROUND = registerColor('panelSection.dropBackground', EDITOR_DRAG_AND_DROP_BACKGROUND, localize(5150, null));
export const PANEL_SECTION_HEADER_BACKGROUND = registerColor('panelSectionHeader.background', {
    dark: Color.fromHex('#808080').transparent(0.2),
    light: Color.fromHex('#808080').transparent(0.2),
    hcDark: null,
    hcLight: null,
}, localize(5151, null));
export const PANEL_SECTION_HEADER_FOREGROUND = registerColor('panelSectionHeader.foreground', null, localize(5152, null));
export const PANEL_SECTION_HEADER_BORDER = registerColor('panelSectionHeader.border', contrastBorder, localize(5153, null));
export const PANEL_SECTION_BORDER = registerColor('panelSection.border', PANEL_BORDER, localize(5154, null));
export const PANEL_STICKY_SCROLL_BACKGROUND = registerColor('panelStickyScroll.background', PANEL_BACKGROUND, localize(5155, null));
export const PANEL_STICKY_SCROLL_BORDER = registerColor('panelStickyScroll.border', null, localize(5156, null));
export const PANEL_STICKY_SCROLL_SHADOW = registerColor('panelStickyScroll.shadow', scrollbarShadow, localize(5157, null));
// < --- Browser --- >
export const BROWSER_BORDER = registerColor('browser.border', TAB_BORDER, localize(5158, null));
// < --- Profiles --- >
export const PROFILE_BADGE_BACKGROUND = registerColor('profileBadge.background', {
    dark: '#4D4D4D',
    light: '#C4C4C4',
    hcDark: Color.white,
    hcLight: Color.black
}, localize(5159, null));
export const PROFILE_BADGE_FOREGROUND = registerColor('profileBadge.foreground', {
    dark: Color.white,
    light: '#333333',
    hcDark: Color.black,
    hcLight: Color.white
}, localize(5160, null));
// < --- Remote --- >
export const STATUS_BAR_REMOTE_ITEM_BACKGROUND = registerColor('statusBarItem.remoteBackground', ACTIVITY_BAR_BADGE_BACKGROUND, localize(5161, null));
export const STATUS_BAR_REMOTE_ITEM_FOREGROUND = registerColor('statusBarItem.remoteForeground', ACTIVITY_BAR_BADGE_FOREGROUND, localize(5162, null));
export const STATUS_BAR_REMOTE_ITEM_HOVER_FOREGROUND = registerColor('statusBarItem.remoteHoverForeground', STATUS_BAR_ITEM_HOVER_FOREGROUND, localize(5163, null));
export const STATUS_BAR_REMOTE_ITEM_HOVER_BACKGROUND = registerColor('statusBarItem.remoteHoverBackground', {
    dark: STATUS_BAR_ITEM_HOVER_BACKGROUND,
    light: STATUS_BAR_ITEM_HOVER_BACKGROUND,
    hcDark: STATUS_BAR_ITEM_HOVER_BACKGROUND,
    hcLight: null
}, localize(5164, null));
export const STATUS_BAR_OFFLINE_ITEM_BACKGROUND = registerColor('statusBarItem.offlineBackground', '#6c1717', localize(5165, null));
export const STATUS_BAR_OFFLINE_ITEM_FOREGROUND = registerColor('statusBarItem.offlineForeground', STATUS_BAR_REMOTE_ITEM_FOREGROUND, localize(5166, null));
export const STATUS_BAR_OFFLINE_ITEM_HOVER_FOREGROUND = registerColor('statusBarItem.offlineHoverForeground', STATUS_BAR_ITEM_HOVER_FOREGROUND, localize(5167, null));
export const STATUS_BAR_OFFLINE_ITEM_HOVER_BACKGROUND = registerColor('statusBarItem.offlineHoverBackground', {
    dark: STATUS_BAR_ITEM_HOVER_BACKGROUND,
    light: STATUS_BAR_ITEM_HOVER_BACKGROUND,
    hcDark: STATUS_BAR_ITEM_HOVER_BACKGROUND,
    hcLight: null
}, localize(5168, null));
export const EXTENSION_BADGE_BACKGROUND = registerColor('extensionBadge.remoteBackground', ACTIVITY_BAR_BADGE_BACKGROUND, localize(5169, null));
export const EXTENSION_BADGE_FOREGROUND = registerColor('extensionBadge.remoteForeground', ACTIVITY_BAR_BADGE_FOREGROUND, localize(5170, null));
// < --- Side Bar --- >
export const SIDE_BAR_BACKGROUND = registerColor('sideBar.background', {
    dark: '#252526',
    light: '#F3F3F3',
    hcDark: '#000000',
    hcLight: '#FFFFFF'
}, localize(5171, null));
export const SIDE_BAR_FOREGROUND = registerColor('sideBar.foreground', null, localize(5172, null));
export const SIDE_BAR_BORDER = registerColor('sideBar.border', {
    dark: null,
    light: null,
    hcDark: contrastBorder,
    hcLight: contrastBorder
}, localize(5173, null));
export const SIDE_BAR_TITLE_BACKGROUND = registerColor('sideBarTitle.background', SIDE_BAR_BACKGROUND, localize(5174, null));
export const SIDE_BAR_TITLE_FOREGROUND = registerColor('sideBarTitle.foreground', SIDE_BAR_FOREGROUND, localize(5175, null));
export const SIDE_BAR_TITLE_BORDER = registerColor('sideBarTitle.border', {
    dark: null,
    light: null,
    hcDark: SIDE_BAR_BORDER,
    hcLight: SIDE_BAR_BORDER
}, localize(5176, null));
export const SIDE_BAR_DRAG_AND_DROP_BACKGROUND = registerColor('sideBar.dropBackground', EDITOR_DRAG_AND_DROP_BACKGROUND, localize(5177, null));
export const SIDE_BAR_SECTION_HEADER_BACKGROUND = registerColor('sideBarSectionHeader.background', {
    dark: Color.fromHex('#808080').transparent(0.2),
    light: Color.fromHex('#808080').transparent(0.2),
    hcDark: null,
    hcLight: null
}, localize(5178, null));
export const SIDE_BAR_SECTION_HEADER_FOREGROUND = registerColor('sideBarSectionHeader.foreground', SIDE_BAR_FOREGROUND, localize(5179, null));
export const SIDE_BAR_SECTION_HEADER_BORDER = registerColor('sideBarSectionHeader.border', contrastBorder, localize(5180, null));
export const ACTIVITY_BAR_TOP_BORDER = registerColor('sideBarActivityBarTop.border', SIDE_BAR_SECTION_HEADER_BORDER, localize(5181, null));
export const SIDE_BAR_STICKY_SCROLL_BACKGROUND = registerColor('sideBarStickyScroll.background', SIDE_BAR_BACKGROUND, localize(5182, null));
export const SIDE_BAR_STICKY_SCROLL_BORDER = registerColor('sideBarStickyScroll.border', null, localize(5183, null));
export const SIDE_BAR_STICKY_SCROLL_SHADOW = registerColor('sideBarStickyScroll.shadow', scrollbarShadow, localize(5184, null));
// < --- Title Bar --- >
export const TITLE_BAR_ACTIVE_FOREGROUND = registerColor('titleBar.activeForeground', {
    dark: '#CCCCCC',
    light: '#333333',
    hcDark: '#FFFFFF',
    hcLight: '#292929'
}, localize(5185, null));
export const TITLE_BAR_INACTIVE_FOREGROUND = registerColor('titleBar.inactiveForeground', {
    dark: transparent(TITLE_BAR_ACTIVE_FOREGROUND, 0.6),
    light: transparent(TITLE_BAR_ACTIVE_FOREGROUND, 0.6),
    hcDark: null,
    hcLight: '#292929'
}, localize(5186, null));
export const TITLE_BAR_ACTIVE_BACKGROUND = registerColor('titleBar.activeBackground', {
    dark: '#3C3C3C',
    light: '#DDDDDD',
    hcDark: '#000000',
    hcLight: '#FFFFFF'
}, localize(5187, null));
export const TITLE_BAR_INACTIVE_BACKGROUND = registerColor('titleBar.inactiveBackground', {
    dark: transparent(TITLE_BAR_ACTIVE_BACKGROUND, 0.6),
    light: transparent(TITLE_BAR_ACTIVE_BACKGROUND, 0.6),
    hcDark: null,
    hcLight: null,
}, localize(5188, null));
export const TITLE_BAR_BORDER = registerColor('titleBar.border', {
    dark: null,
    light: null,
    hcDark: contrastBorder,
    hcLight: contrastBorder
}, localize(5189, null));
// < --- Menubar --- >
export const MENUBAR_SELECTION_FOREGROUND = registerColor('menubar.selectionForeground', TITLE_BAR_ACTIVE_FOREGROUND, localize(5190, null));
export const MENUBAR_SELECTION_BACKGROUND = registerColor('menubar.selectionBackground', {
    dark: toolbarHoverBackground,
    light: toolbarHoverBackground,
    hcDark: null,
    hcLight: null,
}, localize(5191, null));
export const MENUBAR_SELECTION_BORDER = registerColor('menubar.selectionBorder', {
    dark: null,
    light: null,
    hcDark: activeContrastBorder,
    hcLight: activeContrastBorder,
}, localize(5192, null));
// < --- Command Center --- >
// foreground (inactive and active)
export const COMMAND_CENTER_FOREGROUND = registerColor('commandCenter.foreground', TITLE_BAR_ACTIVE_FOREGROUND, localize(5193, null), false);
export const COMMAND_CENTER_ACTIVEFOREGROUND = registerColor('commandCenter.activeForeground', MENUBAR_SELECTION_FOREGROUND, localize(5194, null), false);
export const COMMAND_CENTER_INACTIVEFOREGROUND = registerColor('commandCenter.inactiveForeground', TITLE_BAR_INACTIVE_FOREGROUND, localize(5195, null), false);
// background (inactive and active)
export const COMMAND_CENTER_BACKGROUND = registerColor('commandCenter.background', { dark: Color.white.transparent(0.05), hcDark: null, light: Color.black.transparent(0.05), hcLight: null }, localize(5196, null), false);
export const COMMAND_CENTER_ACTIVEBACKGROUND = registerColor('commandCenter.activeBackground', { dark: Color.white.transparent(0.08), hcDark: MENUBAR_SELECTION_BACKGROUND, light: Color.black.transparent(0.08), hcLight: MENUBAR_SELECTION_BACKGROUND }, localize(5197, null), false);
// border: active and inactive. defaults to active background
export const COMMAND_CENTER_BORDER = registerColor('commandCenter.border', { dark: transparent(TITLE_BAR_ACTIVE_FOREGROUND, .20), hcDark: contrastBorder, light: transparent(TITLE_BAR_ACTIVE_FOREGROUND, .20), hcLight: contrastBorder }, localize(5198, null), false);
export const COMMAND_CENTER_ACTIVEBORDER = registerColor('commandCenter.activeBorder', { dark: transparent(TITLE_BAR_ACTIVE_FOREGROUND, .30), hcDark: TITLE_BAR_ACTIVE_FOREGROUND, light: transparent(TITLE_BAR_ACTIVE_FOREGROUND, .30), hcLight: TITLE_BAR_ACTIVE_FOREGROUND }, localize(5199, null), false);
// border: defaults to active background
export const COMMAND_CENTER_INACTIVEBORDER = registerColor('commandCenter.inactiveBorder', transparent(TITLE_BAR_INACTIVE_FOREGROUND, .25), localize(5200, null), false);
// < --- Notifications --- >
export const NOTIFICATIONS_CENTER_BORDER = registerColor('notificationCenter.border', {
    dark: widgetBorder,
    light: widgetBorder,
    hcDark: contrastBorder,
    hcLight: contrastBorder
}, localize(5201, null));
export const NOTIFICATIONS_TOAST_BORDER = registerColor('notificationToast.border', {
    dark: widgetBorder,
    light: widgetBorder,
    hcDark: contrastBorder,
    hcLight: contrastBorder
}, localize(5202, null));
export const NOTIFICATIONS_FOREGROUND = registerColor('notifications.foreground', editorWidgetForeground, localize(5203, null));
export const NOTIFICATIONS_BACKGROUND = registerColor('notifications.background', editorWidgetBackground, localize(5204, null));
export const NOTIFICATIONS_LINKS = registerColor('notificationLink.foreground', textLinkForeground, localize(5205, null));
export const NOTIFICATIONS_CENTER_HEADER_FOREGROUND = registerColor('notificationCenterHeader.foreground', null, localize(5206, null));
export const NOTIFICATIONS_CENTER_HEADER_BACKGROUND = registerColor('notificationCenterHeader.background', {
    dark: lighten(NOTIFICATIONS_BACKGROUND, 0.3),
    light: darken(NOTIFICATIONS_BACKGROUND, 0.05),
    hcDark: NOTIFICATIONS_BACKGROUND,
    hcLight: NOTIFICATIONS_BACKGROUND
}, localize(5207, null));
export const NOTIFICATIONS_BORDER = registerColor('notifications.border', NOTIFICATIONS_CENTER_HEADER_BACKGROUND, localize(5208, null));
export const NOTIFICATIONS_ERROR_ICON_FOREGROUND = registerColor('notificationsErrorIcon.foreground', editorErrorForeground, localize(5209, null));
export const NOTIFICATIONS_WARNING_ICON_FOREGROUND = registerColor('notificationsWarningIcon.foreground', editorWarningForeground, localize(5210, null));
export const NOTIFICATIONS_INFO_ICON_FOREGROUND = registerColor('notificationsInfoIcon.foreground', editorInfoForeground, localize(5211, null));
export const WINDOW_ACTIVE_BORDER = registerColor('window.activeBorder', {
    dark: null,
    light: null,
    hcDark: contrastBorder,
    hcLight: contrastBorder
}, localize(5212, null));
export const WINDOW_INACTIVE_BORDER = registerColor('window.inactiveBorder', {
    dark: null,
    light: null,
    hcDark: contrastBorder,
    hcLight: contrastBorder
}, localize(5213, null));
//# sourceMappingURL=theme.js.map