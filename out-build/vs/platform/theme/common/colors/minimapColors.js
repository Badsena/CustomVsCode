/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as nls from '../../../../nls.js';
// Import the effects we need
import { Color, RGBA } from '../../../../base/common/color.js';
import { registerColor, transparent } from '../colorUtils.js';
// Import the colors we need
import { editorFindMatchHighlight, editorInfoBorder, editorInfoForeground, editorSelectionBackground, editorSelectionHighlight, editorWarningBorder, editorWarningForeground } from './editorColors.js';
import { scrollbarSliderActiveBackground, scrollbarSliderBackground, scrollbarSliderHoverBackground } from './miscColors.js';
export const minimapFindMatch = registerColor('minimap.findMatchHighlight', editorFindMatchHighlight, nls.localize(2700, null), true);
export const minimapSelectionOccurrenceHighlight = registerColor('minimap.selectionOccurrenceHighlight', editorSelectionHighlight, nls.localize(2701, null), true);
export const minimapSelection = registerColor('minimap.selectionHighlight', editorSelectionBackground, nls.localize(2702, null), true);
export const minimapInfo = registerColor('minimap.infoHighlight', { dark: editorInfoForeground, light: editorInfoForeground, hcDark: editorInfoBorder, hcLight: editorInfoBorder }, nls.localize(2703, null));
export const minimapWarning = registerColor('minimap.warningHighlight', { dark: editorWarningForeground, light: editorWarningForeground, hcDark: editorWarningBorder, hcLight: editorWarningBorder }, nls.localize(2704, null));
export const minimapError = registerColor('minimap.errorHighlight', { dark: new Color(new RGBA(255, 18, 18, 0.7)), light: new Color(new RGBA(255, 18, 18, 0.7)), hcDark: new Color(new RGBA(255, 50, 50, 1)), hcLight: '#B5200D' }, nls.localize(2705, null));
export const minimapBackground = registerColor('minimap.background', null, nls.localize(2706, null));
export const minimapForegroundOpacity = registerColor('minimap.foregroundOpacity', Color.fromHex('#000f'), nls.localize(2707, null));
export const minimapSliderBackground = registerColor('minimapSlider.background', transparent(scrollbarSliderBackground, 0.5), nls.localize(2708, null));
export const minimapSliderHoverBackground = registerColor('minimapSlider.hoverBackground', transparent(scrollbarSliderHoverBackground, 0.5), nls.localize(2709, null));
export const minimapSliderActiveBackground = registerColor('minimapSlider.activeBackground', transparent(scrollbarSliderActiveBackground, 0.5), nls.localize(2710, null));
//# sourceMappingURL=minimapColors.js.map