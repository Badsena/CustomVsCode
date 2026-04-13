/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as nls from '../../../../nls.js';
// Import the effects we need
import { Color } from '../../../../base/common/color.js';
import { registerColor, transparent } from '../colorUtils.js';
// Import the colors we need
import { contrastBorder, focusBorder } from './baseColors.js';
// ----- sash
export const sashHoverBorder = registerColor('sash.hoverBorder', focusBorder, nls.localize(2711, null));
// ----- badge
export const badgeBackground = registerColor('badge.background', { dark: '#4D4D4D', light: '#C4C4C4', hcDark: Color.black, hcLight: '#0F4A85' }, nls.localize(2712, null));
export const badgeForeground = registerColor('badge.foreground', { dark: Color.white, light: '#333', hcDark: Color.white, hcLight: Color.white }, nls.localize(2713, null));
export const activityWarningBadgeForeground = registerColor('activityWarningBadge.foreground', { dark: Color.white, light: Color.white, hcDark: Color.white, hcLight: Color.white }, nls.localize(2714, null));
export const activityWarningBadgeBackground = registerColor('activityWarningBadge.background', { dark: '#B27C00', light: '#B27C00', hcDark: null, hcLight: '#B27C00' }, nls.localize(2715, null));
export const activityErrorBadgeForeground = registerColor('activityErrorBadge.foreground', { dark: Color.black.lighten(0.2), light: Color.white, hcDark: null, hcLight: Color.black.lighten(0.2) }, nls.localize(2716, null));
export const activityErrorBadgeBackground = registerColor('activityErrorBadge.background', { dark: '#F14C4C', light: '#E51400', hcDark: null, hcLight: '#F14C4C' }, nls.localize(2717, null));
// ----- scrollbar
export const scrollbarShadow = registerColor('scrollbar.shadow', { dark: '#000000', light: '#DDDDDD', hcDark: null, hcLight: null }, nls.localize(2718, null));
export const scrollbarSliderBackground = registerColor('scrollbarSlider.background', { dark: Color.fromHex('#797979').transparent(0.4), light: Color.fromHex('#646464').transparent(0.4), hcDark: transparent(contrastBorder, 0.6), hcLight: transparent(contrastBorder, 0.4) }, nls.localize(2719, null));
export const scrollbarSliderHoverBackground = registerColor('scrollbarSlider.hoverBackground', { dark: Color.fromHex('#646464').transparent(0.7), light: Color.fromHex('#646464').transparent(0.7), hcDark: transparent(contrastBorder, 0.8), hcLight: transparent(contrastBorder, 0.8) }, nls.localize(2720, null));
export const scrollbarSliderActiveBackground = registerColor('scrollbarSlider.activeBackground', { dark: Color.fromHex('#BFBFBF').transparent(0.4), light: Color.fromHex('#000000').transparent(0.6), hcDark: contrastBorder, hcLight: contrastBorder }, nls.localize(2721, null));
export const scrollbarBackground = registerColor('scrollbar.background', null, nls.localize(2722, null));
// ----- progress bar
export const progressBarBackground = registerColor('progressBar.background', { dark: Color.fromHex('#0E70C0'), light: Color.fromHex('#0E70C0'), hcDark: contrastBorder, hcLight: contrastBorder }, nls.localize(2723, null));
// ----- chart
export const chartLine = registerColor('chart.line', { dark: '#236B8E', light: '#236B8E', hcDark: '#236B8E', hcLight: '#236B8E' }, nls.localize(2724, null));
export const chartAxis = registerColor('chart.axis', { dark: Color.fromHex('#BFBFBF').transparent(0.4), light: Color.fromHex('#000000').transparent(0.6), hcDark: contrastBorder, hcLight: contrastBorder }, nls.localize(2725, null));
export const chartGuide = registerColor('chart.guide', { dark: Color.fromHex('#BFBFBF').transparent(0.2), light: Color.fromHex('#000000').transparent(0.2), hcDark: contrastBorder, hcLight: contrastBorder }, nls.localize(2726, null));
//# sourceMappingURL=miscColors.js.map