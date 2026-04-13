/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { isWeb, isWindows } from '../../../base/common/platform.js';
import { PolicyCategory } from '../../../base/common/policy.js';
import { localize } from '../../../nls.js';
import { Extensions as ConfigurationExtensions } from '../../configuration/common/configurationRegistry.js';
import product from '../../product/common/product.js';
import { Registry } from '../../registry/common/platform.js';
const configurationRegistry = Registry.as(ConfigurationExtensions.Configuration);
configurationRegistry.registerConfiguration({
    id: 'update',
    order: 15,
    title: localize(2820, null),
    type: 'object',
    properties: {
        'update.mode': {
            type: 'string',
            enum: ['none', 'manual', 'start', 'default'],
            default: 'default',
            scope: 1 /* ConfigurationScope.APPLICATION */,
            description: localize(2821, null),
            tags: ['usesOnlineServices'],
            enumDescriptions: [
                localize(2822, null),
                localize(2823, null),
                localize(2824, null),
                localize(2825, null)
            ],
            policy: {
                name: 'UpdateMode',
                category: PolicyCategory.Update,
                minimumVersion: '1.67',
                localization: {
                    description: { key: 'updateMode', value: localize(2826, null), },
                    enumDescriptions: [
                        {
                            key: 'none',
                            value: localize(2827, null),
                        },
                        {
                            key: 'manual',
                            value: localize(2828, null),
                        },
                        {
                            key: 'start',
                            value: localize(2829, null),
                        },
                        {
                            key: 'default',
                            value: localize(2830, null),
                        }
                    ]
                },
            }
        },
        'update.channel': {
            type: 'string',
            default: 'default',
            scope: 1 /* ConfigurationScope.APPLICATION */,
            description: localize(2831, null),
            deprecationMessage: localize(2832, null, 'update.mode')
        },
        'update.enableWindowsBackgroundUpdates': {
            type: 'boolean',
            default: true,
            scope: 1 /* ConfigurationScope.APPLICATION */,
            title: localize(2833, null),
            description: localize(2834, null),
            included: isWindows && !isWeb
        },
        'update.showReleaseNotes': {
            type: 'boolean',
            default: true,
            scope: 1 /* ConfigurationScope.APPLICATION */,
            description: localize(2835, null),
            tags: ['usesOnlineServices']
        },
        'update.statusBar': {
            type: 'string',
            enum: ['hidden', 'actionable', 'detailed'],
            default: 'detailed',
            scope: 1 /* ConfigurationScope.APPLICATION */,
            description: localize(2836, null),
            enumDescriptions: [
                localize(2837, null),
                localize(2838, null),
                localize(2839, null)
            ]
        },
        'update.titleBar': {
            type: 'string',
            enum: ['none', 'actionable', 'detailed', 'always'],
            default: product.quality !== 'stable' ? 'actionable' : 'none',
            scope: 1 /* ConfigurationScope.APPLICATION */,
            tags: ['experimental'],
            experiment: { mode: 'startup' },
            description: localize(2840, null),
            enumDescriptions: [
                localize(2841, null),
                localize(2842, null),
                localize(2843, null),
                localize(2844, null)
            ]
        }
    }
});
//# sourceMappingURL=update.config.contribution.js.map