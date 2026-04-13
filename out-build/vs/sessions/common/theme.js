/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { localize } from '../../nls.js';
import { registerColor, transparent } from '../../platform/theme/common/colorUtils.js';
import { contrastBorder, iconForeground } from '../../platform/theme/common/colorRegistry.js';
import { Color } from '../../base/common/color.js';
import { buttonBackground } from '../../platform/theme/common/colors/inputColors.js';
import { SIDE_BAR_BACKGROUND, SIDE_BAR_FOREGROUND } from '../../workbench/common/theme.js';
// Sessions sidebar background color
export const sessionsSidebarBackground = registerColor('sessionsSidebar.background', SIDE_BAR_BACKGROUND, localize(2958, null));
// Sessions sidebar border color
export const sessionsSidebarBorder = registerColor('sessionsSidebar.border', { dark: Color.fromHex('#808080').transparent(0.35), light: Color.fromHex('#808080').transparent(0.35), hcDark: contrastBorder, hcLight: contrastBorder }, localize(2959, null));
// Sessions sidebar header colors
export const sessionsSidebarHeaderBackground = registerColor('sessionsSidebarHeader.background', SIDE_BAR_BACKGROUND, localize(2960, null));
export const sessionsSidebarHeaderForeground = registerColor('sessionsSidebarHeader.foreground', SIDE_BAR_FOREGROUND, localize(2961, null));
// Chat bar title colors
export const chatBarTitleBackground = registerColor('chatBarTitle.background', SIDE_BAR_BACKGROUND, localize(2962, null));
export const chatBarTitleForeground = registerColor('chatBarTitle.foreground', SIDE_BAR_FOREGROUND, localize(2963, null));
// Agent feedback input widget border color
export const agentFeedbackInputWidgetBorder = registerColor('agentFeedbackInputWidget.border', { dark: transparent(iconForeground, 0.8), light: transparent(iconForeground, 0.8), hcDark: contrastBorder, hcLight: contrastBorder }, localize(2964, null));
// Sessions update button colors
export const sessionsUpdateButtonDownloadingBackground = registerColor('sessionsUpdateButton.downloadingBackground', transparent(buttonBackground, 0.4), localize(2965, null));
export const sessionsUpdateButtonDownloadedBackground = registerColor('sessionsUpdateButton.downloadedBackground', transparent(buttonBackground, 0.7), localize(2966, null));
//# sourceMappingURL=theme.js.map