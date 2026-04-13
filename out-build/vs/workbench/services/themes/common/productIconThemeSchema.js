/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as nls from '../../../../nls.js';
import { Registry } from '../../../../platform/registry/common/platform.js';
import { Extensions as JSONExtensions } from '../../../../platform/jsonschemas/common/jsonContributionRegistry.js';
import { fontIdErrorMessage, fontIdRegex, fontStyleRegex, fontWeightRegex, iconsSchemaId } from '../../../../platform/theme/common/iconRegistry.js';
const schemaId = 'vscode://schemas/product-icon-theme';
const schema = {
    type: 'object',
    allowComments: true,
    allowTrailingCommas: true,
    properties: {
        fonts: {
            type: 'array',
            items: {
                type: 'object',
                properties: {
                    id: {
                        type: 'string',
                        description: nls.localize(18865, null),
                        pattern: fontIdRegex.source,
                        patternErrorMessage: fontIdErrorMessage
                    },
                    src: {
                        type: 'array',
                        description: nls.localize(18866, null),
                        items: {
                            type: 'object',
                            properties: {
                                path: {
                                    type: 'string',
                                    description: nls.localize(18867, null),
                                },
                                format: {
                                    type: 'string',
                                    description: nls.localize(18868, null),
                                    enum: ['woff', 'woff2', 'truetype', 'opentype', 'embedded-opentype', 'svg']
                                }
                            },
                            required: [
                                'path',
                                'format'
                            ]
                        }
                    },
                    weight: {
                        type: 'string',
                        description: nls.localize(18869, null),
                        anyOf: [
                            { enum: ['normal', 'bold', 'lighter', 'bolder'] },
                            { type: 'string', pattern: fontWeightRegex.source }
                        ]
                    },
                    style: {
                        type: 'string',
                        description: nls.localize(18870, null),
                        anyOf: [
                            { enum: ['normal', 'italic', 'oblique'] },
                            { type: 'string', pattern: fontStyleRegex.source }
                        ]
                    }
                },
                required: [
                    'id',
                    'src'
                ]
            }
        },
        iconDefinitions: {
            description: nls.localize(18871, null),
            $ref: iconsSchemaId
        }
    }
};
export function registerProductIconThemeSchemas() {
    const schemaRegistry = Registry.as(JSONExtensions.JSONContribution);
    schemaRegistry.registerSchema(schemaId, schema);
}
//# sourceMappingURL=productIconThemeSchema.js.map