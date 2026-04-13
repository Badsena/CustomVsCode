/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as nls from '../../../../nls.js';
import { Schemas } from './problemMatcher.js';
const schema = {
    definitions: {
        showOutputType: {
            type: 'string',
            enum: ['always', 'silent', 'never']
        },
        options: {
            type: 'object',
            description: nls.localize(15171, null),
            properties: {
                cwd: {
                    type: 'string',
                    description: nls.localize(15172, null)
                },
                env: {
                    type: 'object',
                    additionalProperties: {
                        type: 'string'
                    },
                    description: nls.localize(15173, null)
                }
            },
            additionalProperties: {
                type: ['string', 'array', 'object']
            }
        },
        problemMatcherType: {
            oneOf: [
                {
                    type: 'string',
                    errorMessage: nls.localize(15174, null)
                },
                Schemas.LegacyProblemMatcher,
                {
                    type: 'array',
                    items: {
                        anyOf: [
                            {
                                type: 'string',
                                errorMessage: nls.localize(15175, null)
                            },
                            Schemas.LegacyProblemMatcher
                        ]
                    }
                }
            ]
        },
        shellConfiguration: {
            type: 'object',
            additionalProperties: false,
            description: nls.localize(15176, null),
            properties: {
                executable: {
                    type: 'string',
                    description: nls.localize(15177, null)
                },
                args: {
                    type: 'array',
                    description: nls.localize(15178, null),
                    items: {
                        type: 'string'
                    }
                }
            }
        },
        commandConfiguration: {
            type: 'object',
            additionalProperties: false,
            properties: {
                command: {
                    type: 'string',
                    description: nls.localize(15179, null)
                },
                args: {
                    type: 'array',
                    description: nls.localize(15180, null),
                    items: {
                        type: 'string'
                    }
                },
                options: {
                    $ref: '#/definitions/options'
                }
            }
        },
        taskDescription: {
            type: 'object',
            required: ['taskName'],
            additionalProperties: false,
            properties: {
                taskName: {
                    type: 'string',
                    description: nls.localize(15181, null)
                },
                command: {
                    type: 'string',
                    description: nls.localize(15182, null)
                },
                args: {
                    type: 'array',
                    description: nls.localize(15183, null),
                    items: {
                        type: 'string'
                    }
                },
                options: {
                    $ref: '#/definitions/options'
                },
                windows: {
                    anyOf: [
                        {
                            $ref: '#/definitions/commandConfiguration',
                            description: nls.localize(15184, null),
                        },
                        {
                            properties: {
                                problemMatcher: {
                                    $ref: '#/definitions/problemMatcherType',
                                    description: nls.localize(15185, null)
                                }
                            }
                        }
                    ]
                },
                osx: {
                    anyOf: [
                        {
                            $ref: '#/definitions/commandConfiguration',
                            description: nls.localize(15186, null)
                        },
                        {
                            properties: {
                                problemMatcher: {
                                    $ref: '#/definitions/problemMatcherType',
                                    description: nls.localize(15187, null)
                                }
                            }
                        }
                    ]
                },
                linux: {
                    anyOf: [
                        {
                            $ref: '#/definitions/commandConfiguration',
                            description: nls.localize(15188, null)
                        },
                        {
                            properties: {
                                problemMatcher: {
                                    $ref: '#/definitions/problemMatcherType',
                                    description: nls.localize(15189, null)
                                }
                            }
                        }
                    ]
                },
                suppressTaskName: {
                    type: 'boolean',
                    description: nls.localize(15190, null),
                    default: true
                },
                showOutput: {
                    $ref: '#/definitions/showOutputType',
                    description: nls.localize(15191, null)
                },
                echoCommand: {
                    type: 'boolean',
                    description: nls.localize(15192, null),
                    default: true
                },
                isWatching: {
                    type: 'boolean',
                    deprecationMessage: nls.localize(15193, null),
                    description: nls.localize(15194, null),
                    default: true
                },
                isBackground: {
                    type: 'boolean',
                    description: nls.localize(15195, null),
                    default: true
                },
                promptOnClose: {
                    type: 'boolean',
                    description: nls.localize(15196, null),
                    default: false
                },
                isBuildCommand: {
                    type: 'boolean',
                    description: nls.localize(15197, null),
                    default: true
                },
                isTestCommand: {
                    type: 'boolean',
                    description: nls.localize(15198, null),
                    default: true
                },
                problemMatcher: {
                    $ref: '#/definitions/problemMatcherType',
                    description: nls.localize(15199, null)
                }
            }
        },
        taskRunnerConfiguration: {
            type: 'object',
            required: [],
            properties: {
                command: {
                    type: 'string',
                    description: nls.localize(15200, null)
                },
                args: {
                    type: 'array',
                    description: nls.localize(15201, null),
                    items: {
                        type: 'string'
                    }
                },
                options: {
                    $ref: '#/definitions/options'
                },
                showOutput: {
                    $ref: '#/definitions/showOutputType',
                    description: nls.localize(15202, null)
                },
                isWatching: {
                    type: 'boolean',
                    deprecationMessage: nls.localize(15203, null),
                    description: nls.localize(15204, null),
                    default: true
                },
                isBackground: {
                    type: 'boolean',
                    description: nls.localize(15205, null),
                    default: true
                },
                promptOnClose: {
                    type: 'boolean',
                    description: nls.localize(15206, null),
                    default: false
                },
                echoCommand: {
                    type: 'boolean',
                    description: nls.localize(15207, null),
                    default: true
                },
                suppressTaskName: {
                    type: 'boolean',
                    description: nls.localize(15208, null),
                    default: true
                },
                taskSelector: {
                    type: 'string',
                    description: nls.localize(15209, null)
                },
                problemMatcher: {
                    $ref: '#/definitions/problemMatcherType',
                    description: nls.localize(15210, null)
                },
                tasks: {
                    type: 'array',
                    description: nls.localize(15211, null),
                    items: {
                        type: 'object',
                        $ref: '#/definitions/taskDescription'
                    }
                }
            }
        }
    }
};
export default schema;
//# sourceMappingURL=jsonSchemaCommon.js.map