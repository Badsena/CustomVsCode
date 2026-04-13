/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as extensionsRegistry from '../../../services/extensions/common/extensionsRegistry.js';
import * as nls from '../../../../nls.js';
import { launchSchemaId } from '../../../services/configuration/common/configuration.js';
import { inputsSchema } from '../../../services/configurationResolver/common/configurationResolverSchema.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { Extensions } from '../../../services/extensionManagement/common/extensionFeatures.js';
import { SyncDescriptor } from '../../../../platform/instantiation/common/descriptors.js';
import { Registry } from '../../../../platform/registry/common/platform.js';
// debuggers extension point
export const debuggersExtPoint = extensionsRegistry.ExtensionsRegistry.registerExtensionPoint({
    extensionPoint: 'debuggers',
    defaultExtensionKind: ['workspace'],
    jsonSchema: {
        description: nls.localize(10286, null),
        type: 'array',
        defaultSnippets: [{ body: [{ type: '' }] }],
        items: {
            additionalProperties: false,
            type: 'object',
            defaultSnippets: [{ body: { type: '', program: '', runtime: '' } }],
            properties: {
                type: {
                    description: nls.localize(10287, null),
                    type: 'string'
                },
                label: {
                    description: nls.localize(10288, null),
                    type: 'string'
                },
                program: {
                    description: nls.localize(10289, null),
                    type: 'string'
                },
                args: {
                    description: nls.localize(10290, null),
                    type: 'array'
                },
                runtime: {
                    description: nls.localize(10291, null),
                    type: 'string'
                },
                runtimeArgs: {
                    description: nls.localize(10292, null),
                    type: 'array'
                },
                variables: {
                    description: nls.localize(10293, null),
                    type: 'object'
                },
                initialConfigurations: {
                    description: nls.localize(10294, null),
                    type: ['array', 'string'],
                },
                languages: {
                    description: nls.localize(10295, null),
                    type: 'array'
                },
                configurationSnippets: {
                    description: nls.localize(10296, null),
                    type: 'array'
                },
                configurationAttributes: {
                    description: nls.localize(10297, null),
                    type: 'object'
                },
                when: {
                    description: nls.localize(10298, null),
                    type: 'string',
                    default: ''
                },
                hiddenWhen: {
                    description: nls.localize(10299, null),
                    type: 'string',
                    default: ''
                },
                deprecated: {
                    description: nls.localize(10300, null),
                    type: 'string',
                    default: ''
                },
                windows: {
                    description: nls.localize(10301, null),
                    type: 'object',
                    properties: {
                        runtime: {
                            description: nls.localize(10302, null),
                            type: 'string'
                        }
                    }
                },
                osx: {
                    description: nls.localize(10303, null),
                    type: 'object',
                    properties: {
                        runtime: {
                            description: nls.localize(10304, null),
                            type: 'string'
                        }
                    }
                },
                linux: {
                    description: nls.localize(10305, null),
                    type: 'object',
                    properties: {
                        runtime: {
                            description: nls.localize(10306, null),
                            type: 'string'
                        }
                    }
                },
                strings: {
                    description: nls.localize(10307, null),
                    type: 'object',
                    properties: {
                        unverifiedBreakpoints: {
                            description: nls.localize(10308, null),
                            type: 'string'
                        }
                    }
                }
            }
        }
    }
});
// breakpoints extension point #9037
export const breakpointsExtPoint = extensionsRegistry.ExtensionsRegistry.registerExtensionPoint({
    extensionPoint: 'breakpoints',
    jsonSchema: {
        description: nls.localize(10309, null),
        type: 'array',
        defaultSnippets: [{ body: [{ language: '' }] }],
        items: {
            type: 'object',
            additionalProperties: false,
            defaultSnippets: [{ body: { language: '' } }],
            properties: {
                language: {
                    description: nls.localize(10310, null),
                    type: 'string'
                },
                when: {
                    description: nls.localize(10311, null),
                    type: 'string',
                    default: ''
                }
            }
        }
    }
});
// debug general schema
export const presentationSchema = {
    type: 'object',
    description: nls.localize(10312, null),
    properties: {
        hidden: {
            type: 'boolean',
            default: false,
            description: nls.localize(10313, null)
        },
        group: {
            type: 'string',
            default: '',
            description: nls.localize(10314, null)
        },
        order: {
            type: 'number',
            default: 1,
            description: nls.localize(10315, null)
        }
    },
    default: {
        hidden: false,
        group: '',
        order: 1
    }
};
const defaultCompound = { name: 'Compound', configurations: [] };
export const launchSchema = {
    id: launchSchemaId,
    type: 'object',
    title: nls.localize(10316, null),
    allowTrailingCommas: true,
    allowComments: true,
    required: [],
    default: { version: '0.2.0', configurations: [], compounds: [] },
    properties: {
        version: {
            type: 'string',
            description: nls.localize(10317, null),
            default: '0.2.0'
        },
        configurations: {
            type: 'array',
            description: nls.localize(10318, null),
            items: {
                defaultSnippets: [],
                'type': 'object',
                oneOf: []
            }
        },
        compounds: {
            type: 'array',
            description: nls.localize(10319, null),
            items: {
                type: 'object',
                required: ['name', 'configurations'],
                properties: {
                    name: {
                        type: 'string',
                        description: nls.localize(10320, null)
                    },
                    presentation: presentationSchema,
                    configurations: {
                        type: 'array',
                        default: [],
                        items: {
                            oneOf: [{
                                    enum: [],
                                    description: nls.localize(10321, null)
                                }, {
                                    type: 'object',
                                    required: ['name'],
                                    properties: {
                                        name: {
                                            enum: [],
                                            description: nls.localize(10322, null)
                                        },
                                        folder: {
                                            enum: [],
                                            description: nls.localize(10323, null)
                                        }
                                    }
                                }]
                        },
                        description: nls.localize(10324, null)
                    },
                    stopAll: {
                        type: 'boolean',
                        default: false,
                        description: nls.localize(10325, null)
                    },
                    preLaunchTask: {
                        type: 'string',
                        default: '',
                        description: nls.localize(10326, null)
                    }
                },
                default: defaultCompound
            },
            default: [
                defaultCompound
            ]
        },
        inputs: inputsSchema.definitions.inputs
    }
};
class DebuggersDataRenderer extends Disposable {
    constructor() {
        super(...arguments);
        this.type = 'table';
    }
    shouldRender(manifest) {
        return !!manifest.contributes?.debuggers;
    }
    render(manifest) {
        const contrib = manifest.contributes?.debuggers || [];
        if (!contrib.length) {
            return { data: { headers: [], rows: [] }, dispose: () => { } };
        }
        const headers = [
            nls.localize(10327, null),
            nls.localize(10328, null),
        ];
        const rows = contrib.map(d => {
            return [
                d.label ?? '',
                d.type
            ];
        });
        return {
            data: {
                headers,
                rows
            },
            dispose: () => { }
        };
    }
}
Registry.as(Extensions.ExtensionFeaturesRegistry).registerExtensionFeature({
    id: 'debuggers',
    label: nls.localize(10329, null),
    access: {
        canToggle: false
    },
    renderer: new SyncDescriptor(DebuggersDataRenderer),
});
//# sourceMappingURL=debugSchemas.js.map