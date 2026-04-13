/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { localize } from '../../../../../nls.js';
import { mergeCurrentHeaderBackground, mergeIncomingHeaderBackground, registerColor, transparent } from '../../../../../platform/theme/common/colorRegistry.js';
export const diff = registerColor('mergeEditor.change.background', '#9bb95533', localize(12654, null));
export const diffWord = registerColor('mergeEditor.change.word.background', { dark: '#9ccc2c33', light: '#9ccc2c66', hcDark: '#9ccc2c33', hcLight: '#9ccc2c66', }, localize(12655, null));
export const diffBase = registerColor('mergeEditor.changeBase.background', { dark: '#4B1818FF', light: '#FFCCCCFF', hcDark: '#4B1818FF', hcLight: '#FFCCCCFF', }, localize(12656, null));
export const diffWordBase = registerColor('mergeEditor.changeBase.word.background', { dark: '#6F1313FF', light: '#FFA3A3FF', hcDark: '#6F1313FF', hcLight: '#FFA3A3FF', }, localize(12657, null));
export const conflictBorderUnhandledUnfocused = registerColor('mergeEditor.conflict.unhandledUnfocused.border', { dark: '#ffa6007a', light: '#ffa600FF', hcDark: '#ffa6007a', hcLight: '#ffa6007a', }, localize(12658, null));
export const conflictBorderUnhandledFocused = registerColor('mergeEditor.conflict.unhandledFocused.border', '#ffa600', localize(12659, null));
export const conflictBorderHandledUnfocused = registerColor('mergeEditor.conflict.handledUnfocused.border', '#86868649', localize(12660, null));
export const conflictBorderHandledFocused = registerColor('mergeEditor.conflict.handledFocused.border', '#c1c1c1cc', localize(12661, null));
export const handledConflictMinimapOverViewRulerColor = registerColor('mergeEditor.conflict.handled.minimapOverViewRuler', '#adaca8ee', localize(12662, null));
export const unhandledConflictMinimapOverViewRulerColor = registerColor('mergeEditor.conflict.unhandled.minimapOverViewRuler', '#fcba03FF', localize(12663, null));
export const conflictingLinesBackground = registerColor('mergeEditor.conflictingLines.background', '#ffea0047', localize(12664, null));
const contentTransparency = 0.4;
export const conflictInput1Background = registerColor('mergeEditor.conflict.input1.background', transparent(mergeCurrentHeaderBackground, contentTransparency), localize(12665, null));
export const conflictInput2Background = registerColor('mergeEditor.conflict.input2.background', transparent(mergeIncomingHeaderBackground, contentTransparency), localize(12666, null));
//# sourceMappingURL=colors.js.map