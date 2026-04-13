/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as nls from '../../../../nls.js';
const idDescription = nls.localize(18153, null);
const typeDescription = nls.localize(18154, null);
const descriptionDescription = nls.localize(18155, null);
const defaultDescription = nls.localize(18156, null);
export const inputsSchema = {
    definitions: {
        inputs: {
            type: 'array',
            description: nls.localize(18157, null),
            items: {
                oneOf: [
                    {
                        type: 'object',
                        required: ['id', 'type', 'description'],
                        additionalProperties: false,
                        properties: {
                            id: {
                                type: 'string',
                                description: idDescription
                            },
                            type: {
                                type: 'string',
                                description: typeDescription,
                                enum: ['promptString'],
                                enumDescriptions: [
                                    nls.localize(18158, null),
                                ]
                            },
                            description: {
                                type: 'string',
                                description: descriptionDescription
                            },
                            default: {
                                type: 'string',
                                description: defaultDescription
                            },
                            password: {
                                type: 'boolean',
                                description: nls.localize(18159, null),
                            },
                        }
                    },
                    {
                        type: 'object',
                        required: ['id', 'type', 'description', 'options'],
                        additionalProperties: false,
                        properties: {
                            id: {
                                type: 'string',
                                description: idDescription
                            },
                            type: {
                                type: 'string',
                                description: typeDescription,
                                enum: ['pickString'],
                                enumDescriptions: [
                                    nls.localize(18160, null),
                                ]
                            },
                            description: {
                                type: 'string',
                                description: descriptionDescription
                            },
                            default: {
                                type: 'string',
                                description: defaultDescription
                            },
                            options: {
                                type: 'array',
                                description: nls.localize(18161, null),
                                items: {
                                    oneOf: [
                                        {
                                            type: 'string'
                                        },
                                        {
                                            type: 'object',
                                            required: ['value'],
                                            additionalProperties: false,
                                            properties: {
                                                label: {
                                                    type: 'string',
                                                    description: nls.localize(18162, null)
                                                },
                                                value: {
                                                    type: 'string',
                                                    description: nls.localize(18163, null)
                                                }
                                            }
                                        }
                                    ]
                                }
                            }
                        }
                    },
                    {
                        type: 'object',
                        required: ['id', 'type', 'command'],
                        additionalProperties: false,
                        properties: {
                            id: {
                                type: 'string',
                                description: idDescription
                            },
                            type: {
                                type: 'string',
                                description: typeDescription,
                                enum: ['command'],
                                enumDescriptions: [
                                    nls.localize(18164, null),
                                ]
                            },
                            command: {
                                type: 'string',
                                description: nls.localize(18165, null)
                            },
                            args: {
                                oneOf: [
                                    {
                                        type: 'object',
                                        description: nls.localize(18166, null)
                                    },
                                    {
                                        type: 'array',
                                        description: nls.localize(18167, null)
                                    },
                                    {
                                        type: 'string',
                                        description: nls.localize(18168, null)
                                    }
                                ]
                            }
                        }
                    }
                ]
            }
        }
    }
};
//# sourceMappingURL=configurationResolverSchema.js.map