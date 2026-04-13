/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { localize } from '../../../../../nls.js';
import { registerColor } from '../../../../../platform/theme/common/colorUtils.js';
export const terminalStickyScrollBackground = registerColor('terminalStickyScroll.background', null, localize(16212, null));
export const terminalStickyScrollHoverBackground = registerColor('terminalStickyScrollHover.background', {
    dark: '#2A2D2E',
    light: '#F0F0F0',
    hcDark: '#E48B39',
    hcLight: '#0f4a85'
}, localize(16213, null));
registerColor('terminalStickyScroll.border', {
    dark: null,
    light: null,
    hcDark: '#6fc3df',
    hcLight: '#0f4a85'
}, localize(16214, null));
//# sourceMappingURL=terminalStickyScrollColorRegistry.js.map