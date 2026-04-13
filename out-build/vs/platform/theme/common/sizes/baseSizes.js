/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as nls from '../../../../nls.js';
import { registerSize, sizeForAllThemes } from '../sizeUtils.js';
// ------ Font Sizes
export const bodyFontSize = registerSize('bodyFontSize', sizeForAllThemes(13, 'px'), nls.localize(2747, null));
export const bodyFontSizeSmall = registerSize('bodyFontSize.small', sizeForAllThemes(12, 'px'), nls.localize(2748, null));
export const bodyFontSizeXSmall = registerSize('bodyFontSize.xSmall', sizeForAllThemes(11, 'px'), nls.localize(2749, null));
export const codiconFontSize = registerSize('codiconFontSize', sizeForAllThemes(16, 'px'), nls.localize(2750, null));
// ------ Corner Radii
export const cornerRadiusMedium = registerSize('cornerRadius.medium', sizeForAllThemes(6, 'px'), nls.localize(2751, null));
export const cornerRadiusXSmall = registerSize('cornerRadius.xSmall', sizeForAllThemes(2, 'px'), nls.localize(2752, null));
export const cornerRadiusSmall = registerSize('cornerRadius.small', sizeForAllThemes(4, 'px'), nls.localize(2753, null));
export const cornerRadiusLarge = registerSize('cornerRadius.large', sizeForAllThemes(8, 'px'), nls.localize(2754, null));
export const cornerRadiusXLarge = registerSize('cornerRadius.xLarge', sizeForAllThemes(12, 'px'), nls.localize(2755, null));
export const cornerRadiusCircle = registerSize('cornerRadius.circle', sizeForAllThemes(9999, 'px'), nls.localize(2756, null));
// ------ Stroke Thickness
export const strokeThickness = registerSize('strokeThickness', sizeForAllThemes(1, 'px'), nls.localize(2757, null));
//# sourceMappingURL=baseSizes.js.map