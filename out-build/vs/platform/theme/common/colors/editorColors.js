/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as nls from '../../../../nls.js';
// Import the effects we need
import { Color, RGBA } from '../../../../base/common/color.js';
import { registerColor, transparent, lessProminent, darken, lighten } from '../colorUtils.js';
// Import the colors we need
import { foreground, contrastBorder, activeContrastBorder } from './baseColors.js';
import { scrollbarShadow, badgeBackground } from './miscColors.js';
// ----- editor
export const editorBackground = registerColor('editor.background', { light: '#ffffff', dark: '#1E1E1E', hcDark: Color.black, hcLight: Color.white }, nls.localize(2514, null));
export const editorForeground = registerColor('editor.foreground', { light: '#333333', dark: '#BBBBBB', hcDark: Color.white, hcLight: foreground }, nls.localize(2515, null));
export const editorStickyScrollBackground = registerColor('editorStickyScroll.background', editorBackground, nls.localize(2516, null));
export const editorStickyScrollGutterBackground = registerColor('editorStickyScrollGutter.background', editorBackground, nls.localize(2517, null));
export const editorStickyScrollHoverBackground = registerColor('editorStickyScrollHover.background', { dark: '#2A2D2E', light: '#F0F0F0', hcDark: null, hcLight: Color.fromHex('#0F4A85').transparent(0.1) }, nls.localize(2518, null));
export const editorStickyScrollBorder = registerColor('editorStickyScroll.border', { dark: null, light: null, hcDark: contrastBorder, hcLight: contrastBorder }, nls.localize(2519, null));
export const editorStickyScrollShadow = registerColor('editorStickyScroll.shadow', scrollbarShadow, nls.localize(2520, null));
export const editorWidgetBackground = registerColor('editorWidget.background', { dark: '#252526', light: '#F3F3F3', hcDark: '#0C141F', hcLight: Color.white }, nls.localize(2521, null));
export const editorWidgetForeground = registerColor('editorWidget.foreground', foreground, nls.localize(2522, null));
export const editorWidgetBorder = registerColor('editorWidget.border', { dark: '#454545', light: '#C8C8C8', hcDark: contrastBorder, hcLight: contrastBorder }, nls.localize(2523, null));
export const editorWidgetResizeBorder = registerColor('editorWidget.resizeBorder', null, nls.localize(2524, null));
export const editorErrorBackground = registerColor('editorError.background', null, nls.localize(2525, null), true);
export const editorErrorForeground = registerColor('editorError.foreground', { dark: '#F14C4C', light: '#E51400', hcDark: '#F48771', hcLight: '#B5200D' }, nls.localize(2526, null));
export const editorErrorBorder = registerColor('editorError.border', { dark: null, light: null, hcDark: Color.fromHex('#E47777').transparent(0.8), hcLight: '#B5200D' }, nls.localize(2527, null));
export const editorWarningBackground = registerColor('editorWarning.background', null, nls.localize(2528, null), true);
export const editorWarningForeground = registerColor('editorWarning.foreground', { dark: '#CCA700', light: '#BF8803', hcDark: '#FFD370', hcLight: '#895503' }, nls.localize(2529, null));
export const editorWarningBorder = registerColor('editorWarning.border', { dark: null, light: null, hcDark: Color.fromHex('#FFCC00').transparent(0.8), hcLight: Color.fromHex('#FFCC00').transparent(0.8) }, nls.localize(2530, null));
export const editorInfoBackground = registerColor('editorInfo.background', null, nls.localize(2531, null), true);
export const editorInfoForeground = registerColor('editorInfo.foreground', { dark: '#59a4f9', light: '#0063d3', hcDark: '#59a4f9', hcLight: '#0063d3' }, nls.localize(2532, null));
export const editorInfoBorder = registerColor('editorInfo.border', { dark: null, light: null, hcDark: Color.fromHex('#59a4f9').transparent(0.8), hcLight: '#292929' }, nls.localize(2533, null));
export const editorHintForeground = registerColor('editorHint.foreground', { dark: Color.fromHex('#eeeeee').transparent(0.7), light: '#6c6c6c', hcDark: null, hcLight: null }, nls.localize(2534, null));
export const editorHintBorder = registerColor('editorHint.border', { dark: null, light: null, hcDark: Color.fromHex('#eeeeee').transparent(0.8), hcLight: '#292929' }, nls.localize(2535, null));
export const editorActiveLinkForeground = registerColor('editorLink.activeForeground', { dark: '#4E94CE', light: Color.blue, hcDark: Color.cyan, hcLight: '#292929' }, nls.localize(2536, null));
// ----- editor selection
export const editorSelectionBackground = registerColor('editor.selectionBackground', { light: '#ADD6FF', dark: '#264F78', hcDark: '#f3f518', hcLight: '#0F4A85' }, nls.localize(2537, null));
export const editorSelectionForeground = registerColor('editor.selectionForeground', { light: null, dark: null, hcDark: '#000000', hcLight: Color.white }, nls.localize(2538, null));
export const editorInactiveSelection = registerColor('editor.inactiveSelectionBackground', { light: transparent(editorSelectionBackground, 0.5), dark: transparent(editorSelectionBackground, 0.5), hcDark: transparent(editorSelectionBackground, 0.7), hcLight: transparent(editorSelectionBackground, 0.5) }, nls.localize(2539, null), true);
export const editorSelectionHighlight = registerColor('editor.selectionHighlightBackground', { light: lessProminent(editorSelectionBackground, editorBackground, 0.3, 0.6), dark: lessProminent(editorSelectionBackground, editorBackground, 0.3, 0.6), hcDark: null, hcLight: null }, nls.localize(2540, null), true);
export const editorSelectionHighlightBorder = registerColor('editor.selectionHighlightBorder', { light: null, dark: null, hcDark: activeContrastBorder, hcLight: activeContrastBorder }, nls.localize(2541, null));
export const editorCompositionBorder = registerColor('editor.compositionBorder', { light: '#000000', dark: '#ffffff', hcLight: '#000000', hcDark: '#ffffff' }, nls.localize(2542, null));
// ----- editor find
export const editorFindMatch = registerColor('editor.findMatchBackground', { light: '#A8AC94', dark: '#515C6A', hcDark: null, hcLight: null }, nls.localize(2543, null));
export const editorFindMatchForeground = registerColor('editor.findMatchForeground', null, nls.localize(2544, null));
export const editorFindMatchHighlight = registerColor('editor.findMatchHighlightBackground', { light: '#EA5C0055', dark: '#EA5C0055', hcDark: null, hcLight: null }, nls.localize(2545, null), true);
export const editorFindMatchHighlightForeground = registerColor('editor.findMatchHighlightForeground', null, nls.localize(2546, null), true);
export const editorFindRangeHighlight = registerColor('editor.findRangeHighlightBackground', { dark: '#3a3d4166', light: '#b4b4b44d', hcDark: null, hcLight: null }, nls.localize(2547, null), true);
export const editorFindMatchBorder = registerColor('editor.findMatchBorder', { light: null, dark: null, hcDark: activeContrastBorder, hcLight: activeContrastBorder }, nls.localize(2548, null));
export const editorFindMatchHighlightBorder = registerColor('editor.findMatchHighlightBorder', { light: null, dark: null, hcDark: activeContrastBorder, hcLight: activeContrastBorder }, nls.localize(2549, null));
export const editorFindRangeHighlightBorder = registerColor('editor.findRangeHighlightBorder', { dark: null, light: null, hcDark: transparent(activeContrastBorder, 0.4), hcLight: transparent(activeContrastBorder, 0.4) }, nls.localize(2550, null), true);
// ----- editor hover
export const editorHoverHighlight = registerColor('editor.hoverHighlightBackground', { light: '#ADD6FF26', dark: '#264f7840', hcDark: '#ADD6FF26', hcLight: null }, nls.localize(2551, null), true);
export const editorHoverBackground = registerColor('editorHoverWidget.background', editorWidgetBackground, nls.localize(2552, null));
export const editorHoverForeground = registerColor('editorHoverWidget.foreground', editorWidgetForeground, nls.localize(2553, null));
export const editorHoverBorder = registerColor('editorHoverWidget.border', editorWidgetBorder, nls.localize(2554, null));
export const editorHoverStatusBarBackground = registerColor('editorHoverWidget.statusBarBackground', { dark: lighten(editorHoverBackground, 0.2), light: darken(editorHoverBackground, 0.05), hcDark: editorWidgetBackground, hcLight: editorWidgetBackground }, nls.localize(2555, null));
// ----- editor inlay hint
export const editorInlayHintForeground = registerColor('editorInlayHint.foreground', { dark: '#969696', light: '#969696', hcDark: Color.white, hcLight: Color.black }, nls.localize(2556, null));
export const editorInlayHintBackground = registerColor('editorInlayHint.background', { dark: transparent(badgeBackground, .10), light: transparent(badgeBackground, .10), hcDark: transparent(Color.white, .10), hcLight: transparent(badgeBackground, .10) }, nls.localize(2557, null));
export const editorInlayHintTypeForeground = registerColor('editorInlayHint.typeForeground', editorInlayHintForeground, nls.localize(2558, null));
export const editorInlayHintTypeBackground = registerColor('editorInlayHint.typeBackground', editorInlayHintBackground, nls.localize(2559, null));
export const editorInlayHintParameterForeground = registerColor('editorInlayHint.parameterForeground', editorInlayHintForeground, nls.localize(2560, null));
export const editorInlayHintParameterBackground = registerColor('editorInlayHint.parameterBackground', editorInlayHintBackground, nls.localize(2561, null));
// ----- editor lightbulb
export const editorLightBulbForeground = registerColor('editorLightBulb.foreground', { dark: '#FFCC00', light: '#DDB100', hcDark: '#FFCC00', hcLight: '#007ACC' }, nls.localize(2562, null));
export const editorLightBulbAutoFixForeground = registerColor('editorLightBulbAutoFix.foreground', { dark: '#75BEFF', light: '#007ACC', hcDark: '#75BEFF', hcLight: '#007ACC' }, nls.localize(2563, null));
export const editorLightBulbAiForeground = registerColor('editorLightBulbAi.foreground', editorLightBulbForeground, nls.localize(2564, null));
// ----- editor snippet
export const snippetTabstopHighlightBackground = registerColor('editor.snippetTabstopHighlightBackground', { dark: new Color(new RGBA(124, 124, 124, 0.3)), light: new Color(new RGBA(10, 50, 100, 0.2)), hcDark: new Color(new RGBA(124, 124, 124, 0.3)), hcLight: new Color(new RGBA(10, 50, 100, 0.2)) }, nls.localize(2565, null));
export const snippetTabstopHighlightBorder = registerColor('editor.snippetTabstopHighlightBorder', null, nls.localize(2566, null));
export const snippetFinalTabstopHighlightBackground = registerColor('editor.snippetFinalTabstopHighlightBackground', null, nls.localize(2567, null));
export const snippetFinalTabstopHighlightBorder = registerColor('editor.snippetFinalTabstopHighlightBorder', { dark: '#525252', light: new Color(new RGBA(10, 50, 100, 0.5)), hcDark: '#525252', hcLight: '#292929' }, nls.localize(2568, null));
// ----- diff editor
export const defaultInsertColor = new Color(new RGBA(155, 185, 85, .2));
export const defaultRemoveColor = new Color(new RGBA(255, 0, 0, .2));
export const diffInserted = registerColor('diffEditor.insertedTextBackground', { dark: '#9ccc2c33', light: '#9ccc2c40', hcDark: null, hcLight: null }, nls.localize(2569, null), true);
export const diffRemoved = registerColor('diffEditor.removedTextBackground', { dark: '#ff000033', light: '#ff000033', hcDark: null, hcLight: null }, nls.localize(2570, null), true);
export const diffInsertedLine = registerColor('diffEditor.insertedLineBackground', { dark: defaultInsertColor, light: defaultInsertColor, hcDark: null, hcLight: null }, nls.localize(2571, null), true);
export const diffRemovedLine = registerColor('diffEditor.removedLineBackground', { dark: defaultRemoveColor, light: defaultRemoveColor, hcDark: null, hcLight: null }, nls.localize(2572, null), true);
export const diffInsertedLineGutter = registerColor('diffEditorGutter.insertedLineBackground', null, nls.localize(2573, null));
export const diffRemovedLineGutter = registerColor('diffEditorGutter.removedLineBackground', null, nls.localize(2574, null));
export const diffOverviewRulerInserted = registerColor('diffEditorOverview.insertedForeground', null, nls.localize(2575, null));
export const diffOverviewRulerRemoved = registerColor('diffEditorOverview.removedForeground', null, nls.localize(2576, null));
export const diffInsertedOutline = registerColor('diffEditor.insertedTextBorder', { dark: null, light: null, hcDark: '#33ff2eff', hcLight: '#374E06' }, nls.localize(2577, null));
export const diffRemovedOutline = registerColor('diffEditor.removedTextBorder', { dark: null, light: null, hcDark: '#FF008F', hcLight: '#AD0707' }, nls.localize(2578, null));
export const diffBorder = registerColor('diffEditor.border', { dark: null, light: null, hcDark: contrastBorder, hcLight: contrastBorder }, nls.localize(2579, null));
export const diffDiagonalFill = registerColor('diffEditor.diagonalFill', { dark: '#cccccc33', light: '#22222233', hcDark: null, hcLight: null }, nls.localize(2580, null));
export const diffUnchangedRegionBackground = registerColor('diffEditor.unchangedRegionBackground', 'sideBar.background', nls.localize(2581, null));
export const diffUnchangedRegionForeground = registerColor('diffEditor.unchangedRegionForeground', 'foreground', nls.localize(2582, null));
export const diffUnchangedTextBackground = registerColor('diffEditor.unchangedCodeBackground', { dark: '#74747429', light: '#b8b8b829', hcDark: null, hcLight: null }, nls.localize(2583, null));
// ----- widget
export const widgetShadow = registerColor('widget.shadow', { dark: transparent(Color.black, .36), light: transparent(Color.black, .16), hcDark: null, hcLight: null }, nls.localize(2584, null));
export const widgetBorder = registerColor('widget.border', { dark: null, light: null, hcDark: contrastBorder, hcLight: contrastBorder }, nls.localize(2585, null));
// ----- toolbar
export const toolbarHoverBackground = registerColor('toolbar.hoverBackground', { dark: '#5a5d5e50', light: '#b8b8b850', hcDark: null, hcLight: null }, nls.localize(2586, null));
export const toolbarHoverOutline = registerColor('toolbar.hoverOutline', { dark: null, light: null, hcDark: activeContrastBorder, hcLight: activeContrastBorder }, nls.localize(2587, null));
export const toolbarActiveBackground = registerColor('toolbar.activeBackground', { dark: lighten(toolbarHoverBackground, 0.1), light: darken(toolbarHoverBackground, 0.1), hcDark: null, hcLight: null }, nls.localize(2588, null));
// ----- breadcumbs
export const breadcrumbsForeground = registerColor('breadcrumb.foreground', transparent(foreground, 0.8), nls.localize(2589, null));
export const breadcrumbsBackground = registerColor('breadcrumb.background', editorBackground, nls.localize(2590, null));
export const breadcrumbsFocusForeground = registerColor('breadcrumb.focusForeground', { light: darken(foreground, 0.2), dark: lighten(foreground, 0.1), hcDark: lighten(foreground, 0.1), hcLight: lighten(foreground, 0.1) }, nls.localize(2591, null));
export const breadcrumbsActiveSelectionForeground = registerColor('breadcrumb.activeSelectionForeground', { light: darken(foreground, 0.2), dark: lighten(foreground, 0.1), hcDark: lighten(foreground, 0.1), hcLight: lighten(foreground, 0.1) }, nls.localize(2592, null));
export const breadcrumbsPickerBackground = registerColor('breadcrumbPicker.background', editorWidgetBackground, nls.localize(2593, null));
// ----- merge
const headerTransparency = 0.5;
const currentBaseColor = Color.fromHex('#40C8AE').transparent(headerTransparency);
const incomingBaseColor = Color.fromHex('#40A6FF').transparent(headerTransparency);
const commonBaseColor = Color.fromHex('#606060').transparent(0.4);
const contentTransparency = 0.4;
const rulerTransparency = 1;
export const mergeCurrentHeaderBackground = registerColor('merge.currentHeaderBackground', { dark: currentBaseColor, light: currentBaseColor, hcDark: null, hcLight: null }, nls.localize(2594, null), true);
export const mergeCurrentContentBackground = registerColor('merge.currentContentBackground', transparent(mergeCurrentHeaderBackground, contentTransparency), nls.localize(2595, null), true);
export const mergeIncomingHeaderBackground = registerColor('merge.incomingHeaderBackground', { dark: incomingBaseColor, light: incomingBaseColor, hcDark: null, hcLight: null }, nls.localize(2596, null), true);
export const mergeIncomingContentBackground = registerColor('merge.incomingContentBackground', transparent(mergeIncomingHeaderBackground, contentTransparency), nls.localize(2597, null), true);
export const mergeCommonHeaderBackground = registerColor('merge.commonHeaderBackground', { dark: commonBaseColor, light: commonBaseColor, hcDark: null, hcLight: null }, nls.localize(2598, null), true);
export const mergeCommonContentBackground = registerColor('merge.commonContentBackground', transparent(mergeCommonHeaderBackground, contentTransparency), nls.localize(2599, null), true);
export const mergeBorder = registerColor('merge.border', { dark: null, light: null, hcDark: '#C3DF6F', hcLight: '#007ACC' }, nls.localize(2600, null));
export const overviewRulerCurrentContentForeground = registerColor('editorOverviewRuler.currentContentForeground', { dark: transparent(mergeCurrentHeaderBackground, rulerTransparency), light: transparent(mergeCurrentHeaderBackground, rulerTransparency), hcDark: mergeBorder, hcLight: mergeBorder }, nls.localize(2601, null));
export const overviewRulerIncomingContentForeground = registerColor('editorOverviewRuler.incomingContentForeground', { dark: transparent(mergeIncomingHeaderBackground, rulerTransparency), light: transparent(mergeIncomingHeaderBackground, rulerTransparency), hcDark: mergeBorder, hcLight: mergeBorder }, nls.localize(2602, null));
export const overviewRulerCommonContentForeground = registerColor('editorOverviewRuler.commonContentForeground', { dark: transparent(mergeCommonHeaderBackground, rulerTransparency), light: transparent(mergeCommonHeaderBackground, rulerTransparency), hcDark: mergeBorder, hcLight: mergeBorder }, nls.localize(2603, null));
export const overviewRulerFindMatchForeground = registerColor('editorOverviewRuler.findMatchForeground', { dark: '#d186167e', light: '#d186167e', hcDark: '#AB5A00', hcLight: '#AB5A00' }, nls.localize(2604, null), true);
export const overviewRulerSelectionHighlightForeground = registerColor('editorOverviewRuler.selectionHighlightForeground', '#A0A0A0CC', nls.localize(2605, null), true);
// ----- problems
export const problemsErrorIconForeground = registerColor('problemsErrorIcon.foreground', editorErrorForeground, nls.localize(2606, null));
export const problemsWarningIconForeground = registerColor('problemsWarningIcon.foreground', editorWarningForeground, nls.localize(2607, null));
export const problemsInfoIconForeground = registerColor('problemsInfoIcon.foreground', editorInfoForeground, nls.localize(2608, null));
//# sourceMappingURL=editorColors.js.map