/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { localize } from '../../../../nls.js';
import { Registry } from '../../../../platform/registry/common/platform.js';
import { Extensions as ConfigurationExtensions } from '../../../../platform/configuration/common/configurationRegistry.js';
import { ThemeSettings } from '../common/workbenchThemeService.js';
import { COLOR_THEME_CONFIGURATION_SETTINGS_TAG, formatSettingAsLink } from '../common/themeConfiguration.js';
import { isLinux } from '../../../../base/common/platform.js';
const configurationRegistry = Registry.as(ConfigurationExtensions.Configuration);
configurationRegistry.registerConfiguration({
    properties: {
        [ThemeSettings.SYSTEM_COLOR_THEME]: {
            type: 'string',
            enum: ['default', 'auto', 'light', 'dark'],
            enumDescriptions: [
                localize(18953, null),
                localize(18954, null),
                localize(18955, null),
                localize(18956, null),
            ],
            markdownDescription: localize(18957, null, formatSettingAsLink(ThemeSettings.COLOR_THEME), formatSettingAsLink(ThemeSettings.DETECT_COLOR_SCHEME)),
            default: 'default',
            included: !isLinux,
            scope: 1 /* ConfigurationScope.APPLICATION */,
            tags: [COLOR_THEME_CONFIGURATION_SETTINGS_TAG],
        }
    }
});
//# sourceMappingURL=themes.contribution.js.map