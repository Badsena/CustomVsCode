/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { localize } from '../../../../nls.js';
import { ExtensionsRegistry } from '../../../services/extensions/common/extensionsRegistry.js';
const titleTranslated = localize(17377, null);
export const walkthroughsExtensionPoint = ExtensionsRegistry.registerExtensionPoint({
    extensionPoint: 'walkthroughs',
    jsonSchema: {
        description: localize(17378, null),
        type: 'array',
        items: {
            type: 'object',
            required: ['id', 'title', 'description', 'steps'],
            defaultSnippets: [{ body: { 'id': '$1', 'title': '$2', 'description': '$3', 'steps': [] } }],
            properties: {
                id: {
                    type: 'string',
                    description: localize(17379, null),
                },
                title: {
                    type: 'string',
                    description: localize(17380, null)
                },
                icon: {
                    type: 'string',
                    description: localize(17381, null),
                },
                description: {
                    type: 'string',
                    description: localize(17382, null)
                },
                featuredFor: {
                    type: 'array',
                    description: localize(17383, null),
                    items: {
                        type: 'string'
                    },
                },
                when: {
                    type: 'string',
                    description: localize(17384, null)
                },
                steps: {
                    type: 'array',
                    description: localize(17385, null),
                    items: {
                        type: 'object',
                        required: ['id', 'title', 'media'],
                        defaultSnippets: [{
                                body: {
                                    'id': '$1', 'title': '$2', 'description': '$3',
                                    'completionEvents': ['$5'],
                                    'media': {},
                                }
                            }],
                        properties: {
                            id: {
                                type: 'string',
                                description: localize(17386, null),
                            },
                            title: {
                                type: 'string',
                                description: localize(17387, null)
                            },
                            description: {
                                type: 'string',
                                description: localize(17388, null, `[${titleTranslated}](command:myext.command)`, `[${titleTranslated}](command:toSide:myext.command)`, `[${titleTranslated}](https://aka.ms)`)
                            },
                            button: {
                                deprecationMessage: localize(17389, null, `[${titleTranslated}](command:myext.command)`, `[${titleTranslated}](command:toSide:myext.command)`, `[${titleTranslated}](https://aka.ms)`),
                            },
                            media: {
                                type: 'object',
                                description: localize(17390, null),
                                oneOf: [
                                    {
                                        required: ['image', 'altText'],
                                        additionalProperties: false,
                                        properties: {
                                            path: {
                                                deprecationMessage: localize(17391, null)
                                            },
                                            image: {
                                                description: localize(17392, null),
                                                oneOf: [
                                                    {
                                                        type: 'string',
                                                    },
                                                    {
                                                        type: 'object',
                                                        required: ['dark', 'light', 'hc', 'hcLight'],
                                                        properties: {
                                                            dark: {
                                                                description: localize(17393, null),
                                                                type: 'string',
                                                            },
                                                            light: {
                                                                description: localize(17394, null),
                                                                type: 'string',
                                                            },
                                                            hc: {
                                                                description: localize(17395, null),
                                                                type: 'string',
                                                            },
                                                            hcLight: {
                                                                description: localize(17396, null),
                                                                type: 'string',
                                                            }
                                                        }
                                                    }
                                                ]
                                            },
                                            altText: {
                                                type: 'string',
                                                description: localize(17397, null)
                                            }
                                        }
                                    },
                                    {
                                        required: ['svg', 'altText'],
                                        additionalProperties: false,
                                        properties: {
                                            svg: {
                                                description: localize(17398, null),
                                                type: 'string',
                                            },
                                            altText: {
                                                type: 'string',
                                                description: localize(17399, null)
                                            },
                                        }
                                    },
                                    {
                                        required: ['markdown'],
                                        additionalProperties: false,
                                        properties: {
                                            path: {
                                                deprecationMessage: localize(17400, null)
                                            },
                                            markdown: {
                                                description: localize(17401, null),
                                                type: 'string',
                                            }
                                        }
                                    }
                                ]
                            },
                            completionEvents: {
                                description: localize(17402, null),
                                type: 'array',
                                items: {
                                    type: 'string',
                                    defaultSnippets: [
                                        {
                                            label: 'onCommand',
                                            description: localize(17403, null),
                                            body: 'onCommand:${1:commandId}'
                                        },
                                        {
                                            label: 'onLink',
                                            description: localize(17404, null),
                                            body: 'onLink:${2:linkId}'
                                        },
                                        {
                                            label: 'onView',
                                            description: localize(17405, null),
                                            body: 'onView:${2:viewId}'
                                        },
                                        {
                                            label: 'onSettingChanged',
                                            description: localize(17406, null),
                                            body: 'onSettingChanged:${2:settingName}'
                                        },
                                        {
                                            label: 'onContext',
                                            description: localize(17407, null),
                                            body: 'onContext:${2:key}'
                                        },
                                        {
                                            label: 'onExtensionInstalled',
                                            description: localize(17408, null),
                                            body: 'onExtensionInstalled:${3:extensionId}'
                                        },
                                        {
                                            label: 'onStepSelected',
                                            description: localize(17409, null),
                                            body: 'onStepSelected'
                                        },
                                    ]
                                }
                            },
                            doneOn: {
                                description: localize(17410, null),
                                deprecationMessage: localize(17411, null),
                                type: 'object',
                                required: ['command'],
                                defaultSnippets: [{ 'body': { command: '$1' } }],
                                properties: {
                                    'command': {
                                        description: localize(17412, null),
                                        type: 'string'
                                    }
                                },
                            },
                            when: {
                                type: 'string',
                                description: localize(17413, null)
                            }
                        }
                    }
                }
            }
        }
    },
    activationEventsGenerator: function* (walkthroughContributions) {
        for (const walkthroughContribution of walkthroughContributions) {
            if (walkthroughContribution.id) {
                yield `onWalkthrough:${walkthroughContribution.id}`;
            }
        }
    }
});
//# sourceMappingURL=gettingStartedExtensionPoint.js.map