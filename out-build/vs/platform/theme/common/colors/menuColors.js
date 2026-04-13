/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as nls from '../../../../nls.js';
// Import the effects we need
import { registerColor } from '../colorUtils.js';
// Import the colors we need
import { contrastBorder, activeContrastBorder } from './baseColors.js';
import { selectForeground, selectBackground } from './inputColors.js';
import { listActiveSelectionBackground, listActiveSelectionForeground } from './listColors.js';
export const menuBorder = registerColor('menu.border', { dark: null, light: null, hcDark: contrastBorder, hcLight: contrastBorder }, nls.localize(2693, null));
export const menuForeground = registerColor('menu.foreground', selectForeground, nls.localize(2694, null));
export const menuBackground = registerColor('menu.background', selectBackground, nls.localize(2695, null));
export const menuSelectionForeground = registerColor('menu.selectionForeground', listActiveSelectionForeground, nls.localize(2696, null));
export const menuSelectionBackground = registerColor('menu.selectionBackground', listActiveSelectionBackground, nls.localize(2697, null));
export const menuSelectionBorder = registerColor('menu.selectionBorder', { dark: null, light: null, hcDark: activeContrastBorder, hcLight: activeContrastBorder }, nls.localize(2698, null));
export const menuSeparatorBackground = registerColor('menu.separatorBackground', { dark: '#606060', light: '#D4D4D4', hcDark: contrastBorder, hcLight: contrastBorder }, nls.localize(2699, null));
//# sourceMappingURL=menuColors.js.map