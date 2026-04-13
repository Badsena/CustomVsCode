/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Color, RGBA } from '../../../../base/common/color.js';
import { localize } from '../../../../nls.js';
import { editorWidgetBorder, focusBorder, inputBackground, inputBorder, inputForeground, listHoverBackground, registerColor, selectBackground, selectBorder, selectForeground, checkboxBackground, checkboxBorder, checkboxForeground, transparent } from '../../../../platform/theme/common/colorRegistry.js';
import { PANEL_BORDER } from '../../../common/theme.js';
// General setting colors
export const settingsHeaderForeground = registerColor('settings.headerForeground', { light: '#444444', dark: '#e7e7e7', hcDark: '#ffffff', hcLight: '#292929' }, localize(13812, null));
export const settingsHeaderHoverForeground = registerColor('settings.settingsHeaderHoverForeground', transparent(settingsHeaderForeground, 0.7), localize(13813, null));
export const modifiedItemIndicator = registerColor('settings.modifiedItemIndicator', {
    light: new Color(new RGBA(102, 175, 224)),
    dark: new Color(new RGBA(12, 125, 157)),
    hcDark: new Color(new RGBA(0, 73, 122)),
    hcLight: new Color(new RGBA(102, 175, 224)),
}, localize(13814, null));
export const settingsHeaderBorder = registerColor('settings.headerBorder', PANEL_BORDER, localize(13815, null));
export const settingsSashBorder = registerColor('settings.sashBorder', PANEL_BORDER, localize(13816, null));
// Enum control colors
export const settingsSelectBackground = registerColor(`settings.dropdownBackground`, selectBackground, localize(13817, null));
export const settingsSelectForeground = registerColor('settings.dropdownForeground', selectForeground, localize(13818, null));
export const settingsSelectBorder = registerColor('settings.dropdownBorder', selectBorder, localize(13819, null));
export const settingsSelectListBorder = registerColor('settings.dropdownListBorder', editorWidgetBorder, localize(13820, null));
// Bool control colors
export const settingsCheckboxBackground = registerColor('settings.checkboxBackground', checkboxBackground, localize(13821, null));
export const settingsCheckboxForeground = registerColor('settings.checkboxForeground', checkboxForeground, localize(13822, null));
export const settingsCheckboxBorder = registerColor('settings.checkboxBorder', checkboxBorder, localize(13823, null));
// Text control colors
export const settingsTextInputBackground = registerColor('settings.textInputBackground', inputBackground, localize(13824, null));
export const settingsTextInputForeground = registerColor('settings.textInputForeground', inputForeground, localize(13825, null));
export const settingsTextInputBorder = registerColor('settings.textInputBorder', inputBorder, localize(13826, null));
// Number control colors
export const settingsNumberInputBackground = registerColor('settings.numberInputBackground', inputBackground, localize(13827, null));
export const settingsNumberInputForeground = registerColor('settings.numberInputForeground', inputForeground, localize(13828, null));
export const settingsNumberInputBorder = registerColor('settings.numberInputBorder', inputBorder, localize(13829, null));
export const focusedRowBackground = registerColor('settings.focusedRowBackground', {
    dark: transparent(listHoverBackground, .6),
    light: transparent(listHoverBackground, .6),
    hcDark: null,
    hcLight: null,
}, localize(13830, null));
export const rowHoverBackground = registerColor('settings.rowHoverBackground', {
    dark: transparent(listHoverBackground, .3),
    light: transparent(listHoverBackground, .3),
    hcDark: null,
    hcLight: null
}, localize(13831, null));
export const focusedRowBorder = registerColor('settings.focusedRowBorder', focusBorder, localize(13832, null));
//# sourceMappingURL=settingsEditorColorRegistry.js.map