/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { localize } from '../../../nls.js';
import { Extensions as ConfigurationExtensions } from '../../configuration/common/configurationRegistry.js';
import { Registry } from '../../registry/common/platform.js';
const configurationRegistry = Registry.as(ConfigurationExtensions.Configuration);
configurationRegistry.registerConfiguration({
    id: 'network',
    order: 14,
    title: localize(2328, null),
    type: 'object',
    properties: {
        'network.meteredConnection': {
            type: 'string',
            enum: ['auto', 'on', 'off'],
            enumDescriptions: [
                localize(2329, null),
                localize(2330, null),
                localize(2331, null)
            ],
            default: 'auto',
            scope: 1 /* ConfigurationScope.APPLICATION */,
            description: localize(2332, null),
            tags: ['usesOnlineServices']
        }
    }
});
//# sourceMappingURL=meteredConnection.config.contribution.js.map