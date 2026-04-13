/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { darken, inputBackground, editorWidgetBackground, lighten, registerColor, textLinkForeground, contrastBorder } from '../../../../platform/theme/common/colorRegistry.js';
import { localize } from '../../../../nls.js';
// Seprate from main module to break dependency cycles between welcomePage and gettingStarted.
export const welcomePageBackground = registerColor('welcomePage.background', null, localize(17370, null));
export const welcomePageTileBackground = registerColor('welcomePage.tileBackground', { dark: editorWidgetBackground, light: editorWidgetBackground, hcDark: '#000', hcLight: editorWidgetBackground }, localize(17371, null));
export const welcomePageTileHoverBackground = registerColor('welcomePage.tileHoverBackground', { dark: lighten(editorWidgetBackground, .2), light: darken(editorWidgetBackground, .1), hcDark: null, hcLight: null }, localize(17372, null));
export const welcomePageTileBorder = registerColor('welcomePage.tileBorder', { dark: '#ffffff1a', light: '#0000001a', hcDark: contrastBorder, hcLight: contrastBorder }, localize(17373, null));
export const welcomePageProgressBackground = registerColor('welcomePage.progress.background', inputBackground, localize(17374, null));
export const welcomePageProgressForeground = registerColor('welcomePage.progress.foreground', textLinkForeground, localize(17375, null));
export const walkthroughStepTitleForeground = registerColor('walkthrough.stepTitle.foreground', { light: '#000000', dark: '#ffffff', hcDark: null, hcLight: null }, localize(17376, null));
//# sourceMappingURL=gettingStartedColors.js.map