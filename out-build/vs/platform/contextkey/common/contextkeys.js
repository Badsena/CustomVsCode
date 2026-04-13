/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { isIOS, isLinux, isMacintosh, isMobile, isWeb, isWindows } from '../../../base/common/platform.js';
import { localize } from '../../../nls.js';
import { RawContextKey } from './contextkey.js';
export const IsMacContext = new RawContextKey('isMac', isMacintosh, localize(1960, null));
export const IsLinuxContext = new RawContextKey('isLinux', isLinux, localize(1961, null));
export const IsWindowsContext = new RawContextKey('isWindows', isWindows, localize(1962, null));
export const IsWebContext = new RawContextKey('isWeb', isWeb, localize(1963, null));
export const IsMacNativeContext = new RawContextKey('isMacNative', isMacintosh && !isWeb, localize(1964, null));
export const IsIOSContext = new RawContextKey('isIOS', isIOS, localize(1965, null));
export const IsMobileContext = new RawContextKey('isMobile', isMobile, localize(1966, null));
export const IsDevelopmentContext = new RawContextKey('isDevelopment', false, true);
export const ProductQualityContext = new RawContextKey('productQualityType', '', localize(1967, null));
export const InputFocusedContextKey = 'inputFocus';
export const InputFocusedContext = new RawContextKey(InputFocusedContextKey, false, localize(1968, null));
//# sourceMappingURL=contextkeys.js.map