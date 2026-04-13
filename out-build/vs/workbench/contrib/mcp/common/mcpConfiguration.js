/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { MarkdownString } from '../../../../base/common/htmlContent.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { localize } from '../../../../nls.js';
import { SyncDescriptor } from '../../../../platform/instantiation/common/descriptors.js';
import { Registry } from '../../../../platform/registry/common/platform.js';
import { mcpSchemaId } from '../../../services/configuration/common/configuration.js';
import { inputsSchema } from '../../../services/configurationResolver/common/configurationResolverSchema.js';
import { Extensions } from '../../../services/extensionManagement/common/extensionFeatures.js';
const mcpActivationEventPrefix = 'onMcpCollection:';
/**
 * note: `contributedCollectionId` is _not_ the collection ID. The collection
 * ID is formed by passing the contributed ID through `extensionPrefixedIdentifier`
 */
export const mcpActivationEvent = (contributedCollectionId) => mcpActivationEventPrefix + contributedCollectionId;
export var DiscoverySource;
(function (DiscoverySource) {
    DiscoverySource["ClaudeDesktop"] = "claude-desktop";
    DiscoverySource["Windsurf"] = "windsurf";
    DiscoverySource["CursorGlobal"] = "cursor-global";
    DiscoverySource["CursorWorkspace"] = "cursor-workspace";
})(DiscoverySource || (DiscoverySource = {}));
export const allDiscoverySources = Object.keys({
    ["claude-desktop" /* DiscoverySource.ClaudeDesktop */]: true,
    ["windsurf" /* DiscoverySource.Windsurf */]: true,
    ["cursor-global" /* DiscoverySource.CursorGlobal */]: true,
    ["cursor-workspace" /* DiscoverySource.CursorWorkspace */]: true,
});
export const discoverySourceLabel = {
    ["claude-desktop" /* DiscoverySource.ClaudeDesktop */]: localize(12462, null),
    ["windsurf" /* DiscoverySource.Windsurf */]: localize(12463, null),
    ["cursor-global" /* DiscoverySource.CursorGlobal */]: localize(12464, null),
    ["cursor-workspace" /* DiscoverySource.CursorWorkspace */]: localize(12465, null),
};
export const discoverySourceSettingsLabel = {
    ["claude-desktop" /* DiscoverySource.ClaudeDesktop */]: localize(12466, null),
    ["windsurf" /* DiscoverySource.Windsurf */]: localize(12467, null),
    ["cursor-global" /* DiscoverySource.CursorGlobal */]: localize(12468, null),
    ["cursor-workspace" /* DiscoverySource.CursorWorkspace */]: localize(12469, null),
};
export const mcpConfigurationSection = 'mcp';
export const mcpDiscoverySection = 'chat.mcp.discovery.enabled';
export const mcpServerSamplingSection = 'chat.mcp.serverSampling';
export const mcpSchemaExampleServers = {
    'mcp-server-time': {
        command: 'python',
        args: ['-m', 'mcp_server_time', '--local-timezone=America/Los_Angeles'],
        env: {},
    }
};
const httpSchemaExamples = {
    'my-mcp-server': {
        url: 'http://localhost:3001/mcp',
        headers: {},
    }
};
const mcpDevModeProps = (stdio) => ({
    dev: {
        type: 'object',
        markdownDescription: localize(12470, null),
        examples: [{ watch: 'src/**/*.ts', debug: { type: 'node' } }],
        properties: {
            watch: {
                description: localize(12471, null),
                examples: ['src/**/*.ts'],
                oneOf: [{ type: 'string' }, { type: 'array', items: { type: 'string' } }],
            },
            ...(stdio && {
                debug: {
                    markdownDescription: localize(12472, null),
                    oneOf: [
                        {
                            type: 'object',
                            required: ['type'],
                            properties: {
                                type: {
                                    type: 'string',
                                    enum: ['node'],
                                    description: localize(12473, null)
                                }
                            },
                            additionalProperties: false
                        },
                        {
                            type: 'object',
                            required: ['type'],
                            properties: {
                                type: {
                                    type: 'string',
                                    enum: ['debugpy'],
                                    description: localize(12474, null)
                                },
                                debugpyPath: {
                                    type: 'string',
                                    description: localize(12475, null)
                                },
                            },
                            additionalProperties: false
                        }
                    ]
                }
            })
        }
    }
});
export const mcpStdioServerSchema = {
    type: 'object',
    additionalProperties: false,
    examples: [mcpSchemaExampleServers['mcp-server-time']],
    properties: {
        type: {
            type: 'string',
            enum: ['stdio'],
            description: localize(12476, null)
        },
        sandboxEnabled: {
            type: 'boolean',
            default: false,
            description: localize(12477, null)
        },
        command: {
            type: 'string',
            description: localize(12478, null)
        },
        cwd: {
            type: 'string',
            description: localize(12479, null),
            examples: ['${workspaceFolder}'],
        },
        args: {
            type: 'array',
            description: localize(12480, null),
            items: {
                type: 'string'
            },
        },
        envFile: {
            type: 'string',
            description: localize(12481, null),
            examples: ['${workspaceFolder}/.env'],
        },
        env: {
            description: localize(12482, null),
            additionalProperties: {
                anyOf: [
                    { type: 'null' },
                    { type: 'string' },
                    { type: 'number' },
                ]
            }
        },
        ...mcpDevModeProps(true),
    }
};
export const mcpServerSchema = {
    id: mcpSchemaId,
    type: 'object',
    title: localize(12483, null),
    allowTrailingCommas: true,
    allowComments: true,
    additionalProperties: false,
    properties: {
        sandbox: {
            description: localize(12484, null),
            type: 'object',
            additionalProperties: false,
            properties: {
                network: {
                    description: localize(12485, null),
                    type: 'object',
                    additionalProperties: false,
                    properties: {
                        allowedDomains: {
                            description: localize(12486, null),
                            type: 'array',
                            items: { type: 'string' },
                            default: []
                        },
                        deniedDomains: {
                            description: localize(12487, null),
                            type: 'array',
                            items: { type: 'string' },
                            default: []
                        }
                    }
                },
                filesystem: {
                    description: localize(12488, null),
                    type: 'object',
                    additionalProperties: false,
                    properties: {
                        denyRead: {
                            description: localize(12489, null),
                            type: 'array',
                            items: { type: 'string' },
                            default: []
                        },
                        allowWrite: {
                            description: localize(12490, null),
                            type: 'array',
                            items: { type: 'string' },
                            default: []
                        },
                        denyWrite: {
                            description: localize(12491, null),
                            type: 'array',
                            items: { type: 'string' },
                            default: []
                        }
                    }
                }
            }
        },
        servers: {
            examples: [
                mcpSchemaExampleServers,
                httpSchemaExamples,
            ],
            additionalProperties: {
                oneOf: [
                    mcpStdioServerSchema, {
                        type: 'object',
                        additionalProperties: false,
                        required: ['url'],
                        examples: [httpSchemaExamples['my-mcp-server']],
                        properties: {
                            type: {
                                type: 'string',
                                enum: ['http', 'sse'],
                                description: localize(12492, null)
                            },
                            url: {
                                type: 'string',
                                format: 'uri',
                                pattern: '^https?:\\/\\/.+',
                                patternErrorMessage: localize(12493, null),
                                description: localize(12494, null)
                            },
                            headers: {
                                type: 'object',
                                description: localize(12495, null),
                                additionalProperties: { type: 'string' },
                            },
                            ...mcpDevModeProps(false),
                        }
                    },
                ]
            }
        },
        inputs: inputsSchema.definitions.inputs
    }
};
export const mcpContributionPoint = {
    extensionPoint: 'mcpServerDefinitionProviders',
    activationEventsGenerator: function* (contribs) {
        for (const contrib of contribs) {
            if (contrib.id) {
                yield mcpActivationEvent(contrib.id);
            }
        }
    },
    jsonSchema: {
        description: localize(12496, null),
        type: 'array',
        defaultSnippets: [{ body: [{ id: '', label: '' }] }],
        items: {
            additionalProperties: false,
            type: 'object',
            defaultSnippets: [{ body: { id: '', label: '' } }],
            properties: {
                id: {
                    description: localize(12497, null),
                    type: 'string'
                },
                label: {
                    description: localize(12498, null),
                    type: 'string'
                },
                when: {
                    description: localize(12499, null),
                    type: 'string'
                }
            }
        }
    }
};
class McpServerDefinitionsProviderRenderer extends Disposable {
    constructor() {
        super(...arguments);
        this.type = 'table';
    }
    shouldRender(manifest) {
        return !!manifest.contributes?.mcpServerDefinitionProviders && Array.isArray(manifest.contributes.mcpServerDefinitionProviders) && manifest.contributes.mcpServerDefinitionProviders.length > 0;
    }
    render(manifest) {
        const mcpServerDefinitionProviders = manifest.contributes?.mcpServerDefinitionProviders ?? [];
        const headers = [localize(12500, null), localize(12501, null)];
        const rows = mcpServerDefinitionProviders
            .map(mcpServerDefinitionProvider => {
            return [
                new MarkdownString().appendMarkdown(`\`${mcpServerDefinitionProvider.id}\``),
                mcpServerDefinitionProvider.label
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
    id: mcpConfigurationSection,
    label: localize(12502, null),
    access: {
        canToggle: false
    },
    renderer: new SyncDescriptor(McpServerDefinitionsProviderRenderer),
});
//# sourceMappingURL=mcpConfiguration.js.map