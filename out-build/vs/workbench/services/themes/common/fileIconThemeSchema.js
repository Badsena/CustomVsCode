/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as nls from '../../../../nls.js';
import { Registry } from '../../../../platform/registry/common/platform.js';
import { Extensions as JSONExtensions } from '../../../../platform/jsonschemas/common/jsonContributionRegistry.js';
import { fontWeightRegex, fontStyleRegex, fontSizeRegex, fontIdRegex, fontColorRegex, fontIdErrorMessage } from '../../../../platform/theme/common/iconRegistry.js';
const schemaId = 'vscode://schemas/icon-theme';
const schema = {
    type: 'object',
    allowComments: true,
    allowTrailingCommas: true,
    definitions: {
        folderExpanded: {
            type: 'string',
            description: nls.localize(18814, null)
        },
        folder: {
            type: 'string',
            description: nls.localize(18815, null)
        },
        file: {
            type: 'string',
            description: nls.localize(18816, null)
        },
        rootFolder: {
            type: 'string',
            description: nls.localize(18817, null)
        },
        rootFolderExpanded: {
            type: 'string',
            description: nls.localize(18818, null)
        },
        rootFolderNames: {
            type: 'object',
            description: nls.localize(18819, null),
            additionalProperties: {
                type: 'string',
                description: nls.localize(18820, null)
            }
        },
        rootFolderNamesExpanded: {
            type: 'object',
            description: nls.localize(18821, null),
            additionalProperties: {
                type: 'string',
                description: nls.localize(18822, null)
            }
        },
        folderNames: {
            type: 'object',
            description: nls.localize(18823, null),
            additionalProperties: {
                type: 'string',
                description: nls.localize(18824, null)
            }
        },
        folderNamesExpanded: {
            type: 'object',
            description: nls.localize(18825, null),
            additionalProperties: {
                type: 'string',
                description: nls.localize(18826, null)
            }
        },
        fileExtensions: {
            type: 'object',
            description: nls.localize(18827, null),
            additionalProperties: {
                type: 'string',
                description: nls.localize(18828, null)
            }
        },
        fileNames: {
            type: 'object',
            description: nls.localize(18829, null),
            additionalProperties: {
                type: 'string',
                description: nls.localize(18830, null)
            }
        },
        languageIds: {
            type: 'object',
            description: nls.localize(18831, null),
            additionalProperties: {
                type: 'string',
                description: nls.localize(18832, null)
            }
        },
        associations: {
            type: 'object',
            properties: {
                folderExpanded: {
                    $ref: '#/definitions/folderExpanded'
                },
                folder: {
                    $ref: '#/definitions/folder'
                },
                file: {
                    $ref: '#/definitions/file'
                },
                folderNames: {
                    $ref: '#/definitions/folderNames'
                },
                folderNamesExpanded: {
                    $ref: '#/definitions/folderNamesExpanded'
                },
                rootFolder: {
                    $ref: '#/definitions/rootFolder'
                },
                rootFolderExpanded: {
                    $ref: '#/definitions/rootFolderExpanded'
                },
                rootFolderNames: {
                    $ref: '#/definitions/rootFolderNames'
                },
                rootFolderNamesExpanded: {
                    $ref: '#/definitions/rootFolderNamesExpanded'
                },
                fileExtensions: {
                    $ref: '#/definitions/fileExtensions'
                },
                fileNames: {
                    $ref: '#/definitions/fileNames'
                },
                languageIds: {
                    $ref: '#/definitions/languageIds'
                }
            }
        }
    },
    properties: {
        fonts: {
            type: 'array',
            description: nls.localize(18833, null),
            items: {
                type: 'object',
                properties: {
                    id: {
                        type: 'string',
                        description: nls.localize(18834, null),
                        pattern: fontIdRegex.source,
                        patternErrorMessage: fontIdErrorMessage
                    },
                    src: {
                        type: 'array',
                        description: nls.localize(18835, null),
                        items: {
                            type: 'object',
                            properties: {
                                path: {
                                    type: 'string',
                                    description: nls.localize(18836, null),
                                },
                                format: {
                                    type: 'string',
                                    description: nls.localize(18837, null),
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
                        description: nls.localize(18838, null),
                        pattern: fontWeightRegex.source
                    },
                    style: {
                        type: 'string',
                        description: nls.localize(18839, null),
                        pattern: fontStyleRegex.source
                    },
                    size: {
                        type: 'string',
                        description: nls.localize(18840, null),
                        pattern: fontSizeRegex.source
                    }
                },
                required: [
                    'id',
                    'src'
                ]
            }
        },
        iconDefinitions: {
            type: 'object',
            description: nls.localize(18841, null),
            additionalProperties: {
                type: 'object',
                description: nls.localize(18842, null),
                properties: {
                    iconPath: {
                        type: 'string',
                        description: nls.localize(18843, null)
                    },
                    fontCharacter: {
                        type: 'string',
                        description: nls.localize(18844, null)
                    },
                    fontColor: {
                        type: 'string',
                        format: 'color-hex',
                        description: nls.localize(18845, null),
                        pattern: fontColorRegex.source
                    },
                    fontSize: {
                        type: 'string',
                        description: nls.localize(18846, null),
                        pattern: fontSizeRegex.source
                    },
                    fontId: {
                        type: 'string',
                        description: nls.localize(18847, null),
                        pattern: fontIdRegex.source,
                        patternErrorMessage: fontIdErrorMessage
                    }
                }
            }
        },
        folderExpanded: {
            $ref: '#/definitions/folderExpanded'
        },
        folder: {
            $ref: '#/definitions/folder'
        },
        file: {
            $ref: '#/definitions/file'
        },
        folderNames: {
            $ref: '#/definitions/folderNames'
        },
        folderNamesExpanded: {
            $ref: '#/definitions/folderNamesExpanded'
        },
        rootFolder: {
            $ref: '#/definitions/rootFolder'
        },
        rootFolderExpanded: {
            $ref: '#/definitions/rootFolderExpanded'
        },
        rootFolderNames: {
            $ref: '#/definitions/rootFolderNames'
        },
        rootFolderNamesExpanded: {
            $ref: '#/definitions/rootFolderNamesExpanded'
        },
        fileExtensions: {
            $ref: '#/definitions/fileExtensions'
        },
        fileNames: {
            $ref: '#/definitions/fileNames'
        },
        languageIds: {
            $ref: '#/definitions/languageIds'
        },
        light: {
            $ref: '#/definitions/associations',
            description: nls.localize(18848, null)
        },
        highContrast: {
            $ref: '#/definitions/associations',
            description: nls.localize(18849, null)
        },
        hidesExplorerArrows: {
            type: 'boolean',
            description: nls.localize(18850, null)
        },
        showLanguageModeIcons: {
            type: 'boolean',
            description: nls.localize(18851, null)
        }
    }
};
export function registerFileIconThemeSchemas() {
    const schemaRegistry = Registry.as(JSONExtensions.JSONContribution);
    schemaRegistry.registerSchema(schemaId, schema);
}
//# sourceMappingURL=fileIconThemeSchema.js.map