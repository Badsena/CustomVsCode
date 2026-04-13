/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as nls from '../../../nls.js';
import * as objects from '../../../base/common/objects.js';
import { Registry } from '../../../platform/registry/common/platform.js';
import { ExtensionsRegistry } from '../../services/extensions/common/extensionsRegistry.js';
import { Extensions, validateProperty, OVERRIDE_PROPERTY_REGEX, configurationDefaultsSchemaId, getDefaultValue, getAllConfigurationProperties, parseScope, EXTENSION_UNIFICATION_EXTENSION_IDS, overrideIdentifiersFromKey } from '../../../platform/configuration/common/configurationRegistry.js';
import { Extensions as JSONExtensions } from '../../../platform/jsonschemas/common/jsonContributionRegistry.js';
import { workspaceSettingsSchemaId, launchSchemaId, tasksSchemaId, mcpSchemaId } from '../../services/configuration/common/configuration.js';
import { isObject, isUndefined } from '../../../base/common/types.js';
import { ExtensionIdentifierMap } from '../../../platform/extensions/common/extensions.js';
import { Extensions as ExtensionFeaturesExtensions } from '../../services/extensionManagement/common/extensionFeatures.js';
import { Disposable } from '../../../base/common/lifecycle.js';
import { SyncDescriptor } from '../../../platform/instantiation/common/descriptors.js';
import { MarkdownString } from '../../../base/common/htmlContent.js';
import product from '../../../platform/product/common/product.js';
const jsonRegistry = Registry.as(JSONExtensions.JSONContribution);
const configurationRegistry = Registry.as(Extensions.Configuration);
const configurationEntrySchema = {
    type: 'object',
    defaultSnippets: [{ body: { title: '', properties: {} } }],
    properties: {
        title: {
            description: nls.localize(3495, null),
            type: 'string'
        },
        order: {
            description: nls.localize(3496, null),
            type: 'integer'
        },
        properties: {
            description: nls.localize(3497, null),
            type: 'object',
            propertyNames: {
                pattern: '\\S+',
                patternErrorMessage: nls.localize(3498, null),
            },
            additionalProperties: {
                anyOf: [
                    {
                        title: nls.localize(3499, null),
                        $ref: 'http://json-schema.org/draft-07/schema#'
                    },
                    {
                        type: 'object',
                        properties: {
                            scope: {
                                type: 'string',
                                enum: ['application', 'machine', 'window', 'resource', 'language-overridable', 'machine-overridable'],
                                default: 'window',
                                enumDescriptions: [
                                    nls.localize(3500, null),
                                    nls.localize(3501, null),
                                    nls.localize(3502, null),
                                    nls.localize(3503, null),
                                    nls.localize(3504, null),
                                    nls.localize(3505, null)
                                ],
                                markdownDescription: nls.localize(3506, null)
                            },
                            enumDescriptions: {
                                type: 'array',
                                items: {
                                    type: 'string',
                                },
                                description: nls.localize(3507, null)
                            },
                            markdownEnumDescriptions: {
                                type: 'array',
                                items: {
                                    type: 'string',
                                },
                                description: nls.localize(3508, null)
                            },
                            enumItemLabels: {
                                type: 'array',
                                items: {
                                    type: 'string'
                                },
                                markdownDescription: nls.localize(3509, null, '`enum`')
                            },
                            markdownDescription: {
                                type: 'string',
                                description: nls.localize(3510, null)
                            },
                            deprecationMessage: {
                                type: 'string',
                                description: nls.localize(3511, null)
                            },
                            markdownDeprecationMessage: {
                                type: 'string',
                                description: nls.localize(3512, null)
                            },
                            editPresentation: {
                                type: 'string',
                                enum: ['singlelineText', 'multilineText'],
                                enumDescriptions: [
                                    nls.localize(3513, null),
                                    nls.localize(3514, null)
                                ],
                                default: 'singlelineText',
                                description: nls.localize(3515, null)
                            },
                            order: {
                                type: 'integer',
                                description: nls.localize(3516, null)
                            },
                            ignoreSync: {
                                type: 'boolean',
                                description: nls.localize(3517, null)
                            },
                            keywords: {
                                type: 'array',
                                items: {
                                    type: 'string'
                                },
                                description: nls.localize(3518, null)
                            },
                            tags: {
                                type: 'array',
                                items: {
                                    type: 'string',
                                    enum: [
                                        'accessibility',
                                        'advanced',
                                        'experimental',
                                        'telemetry',
                                        'usesOnlineServices',
                                    ],
                                    enumDescriptions: [
                                        nls.localize(3519, null),
                                        nls.localize(3520, null),
                                        nls.localize(3521, null),
                                        nls.localize(3522, null),
                                        nls.localize(3523, null),
                                        nls.localize(3524, null)
                                    ],
                                },
                                additionalItems: true,
                                markdownDescription: nls.localize(3525, null),
                            }
                        }
                    }
                ]
            }
        }
    }
};
// build up a delta across two ext points and only apply it once
let _configDelta;
// BEGIN VSCode extension point `configurationDefaults`
const defaultConfigurationExtPoint = ExtensionsRegistry.registerExtensionPoint({
    extensionPoint: 'configurationDefaults',
    jsonSchema: {
        $ref: configurationDefaultsSchemaId,
    },
    canHandleResolver: true
});
defaultConfigurationExtPoint.setHandler((extensions, { added, removed }) => {
    if (_configDelta) {
        // HIGHLY unlikely, but just in case
        configurationRegistry.deltaConfiguration(_configDelta);
    }
    const configNow = _configDelta = {};
    // schedule a HIGHLY unlikely task in case only the default configurations EXT point changes
    queueMicrotask(() => {
        if (_configDelta === configNow) {
            configurationRegistry.deltaConfiguration(_configDelta);
            _configDelta = undefined;
        }
    });
    if (removed.length) {
        const removedDefaultConfigurations = removed.map(extension => ({ overrides: objects.deepClone(extension.value), source: { id: extension.description.identifier.value, displayName: extension.description.displayName } }));
        _configDelta.removedDefaults = removedDefaultConfigurations;
    }
    if (added.length) {
        const registeredProperties = configurationRegistry.getConfigurationProperties();
        const allowedScopes = [7 /* ConfigurationScope.MACHINE_OVERRIDABLE */, 4 /* ConfigurationScope.WINDOW */, 5 /* ConfigurationScope.RESOURCE */, 6 /* ConfigurationScope.LANGUAGE_OVERRIDABLE */];
        const addedDefaultConfigurations = added.map(extension => {
            const overrides = objects.deepClone(extension.value);
            for (const key of Object.keys(overrides)) {
                const registeredPropertyScheme = registeredProperties[key];
                if (registeredPropertyScheme?.disallowConfigurationDefault) {
                    extension.collector.warn(nls.localize(3526, null, key));
                    delete overrides[key];
                    continue;
                }
                if (!OVERRIDE_PROPERTY_REGEX.test(key)) {
                    if (registeredPropertyScheme?.scope && !allowedScopes.includes(registeredPropertyScheme.scope)) {
                        extension.collector.warn(nls.localize(3527, null, key));
                        delete overrides[key];
                        continue;
                    }
                }
            }
            return { overrides, source: { id: extension.description.identifier.value, displayName: extension.description.displayName } };
        });
        _configDelta.addedDefaults = addedDefaultConfigurations;
    }
});
// END VSCode extension point `configurationDefaults`
// BEGIN VSCode extension point `configuration`
const configurationExtPoint = ExtensionsRegistry.registerExtensionPoint({
    extensionPoint: 'configuration',
    deps: [defaultConfigurationExtPoint],
    jsonSchema: {
        description: nls.localize(3528, null),
        oneOf: [
            configurationEntrySchema,
            {
                type: 'array',
                items: configurationEntrySchema
            }
        ]
    },
    canHandleResolver: true
});
const extensionConfigurations = new ExtensionIdentifierMap();
configurationExtPoint.setHandler((extensions, { added, removed }) => {
    // HIGHLY unlikely (only configuration but not defaultConfiguration EXT point changes)
    _configDelta ??= {};
    if (removed.length) {
        const removedConfigurations = [];
        for (const extension of removed) {
            removedConfigurations.push(...(extensionConfigurations.get(extension.description.identifier) || []));
            extensionConfigurations.delete(extension.description.identifier);
        }
        _configDelta.removedConfigurations = removedConfigurations;
    }
    const seenProperties = new Set();
    function handleConfiguration(node, extension) {
        const configuration = objects.deepClone(node);
        if (configuration.title && (typeof configuration.title !== 'string')) {
            extension.collector.error(nls.localize(3529, null));
        }
        validateProperties(configuration, extension);
        configuration.id = node.id || extension.description.identifier.value;
        configuration.extensionInfo = { id: extension.description.identifier.value, displayName: extension.description.displayName };
        configuration.restrictedProperties = extension.description.capabilities?.untrustedWorkspaces?.supported === 'limited' ? extension.description.capabilities?.untrustedWorkspaces.restrictedConfigurations : undefined;
        configuration.title = configuration.title || extension.description.displayName || extension.description.identifier.value;
        return configuration;
    }
    function validateProperties(configuration, extension) {
        const properties = configuration.properties;
        const extensionConfigurationPolicy = product.extensionConfigurationPolicy;
        if (properties) {
            if (typeof properties !== 'object') {
                extension.collector.error(nls.localize(3530, null));
                configuration.properties = {};
            }
            for (const key in properties) {
                const propertyConfiguration = properties[key];
                const message = validateProperty(key, propertyConfiguration, extension.description.identifier.value);
                if (message) {
                    delete properties[key];
                    extension.collector.warn(message);
                    continue;
                }
                if (seenProperties.has(key) && !EXTENSION_UNIFICATION_EXTENSION_IDS.has(extension.description.identifier.value.toLowerCase())) {
                    delete properties[key];
                    extension.collector.warn(nls.localize(3531, null, key));
                    continue;
                }
                if (!isObject(propertyConfiguration)) {
                    delete properties[key];
                    extension.collector.error(nls.localize(3532, null, key));
                    continue;
                }
                if (extensionConfigurationPolicy?.[key]) {
                    propertyConfiguration.policy = extensionConfigurationPolicy?.[key];
                }
                if (propertyConfiguration.tags?.some(tag => tag.toLowerCase() === 'onexp')) {
                    propertyConfiguration.experiment = {
                        mode: 'startup'
                    };
                }
                seenProperties.add(key);
                propertyConfiguration.scope = propertyConfiguration.scope ? parseScope(propertyConfiguration.scope.toString()) : 4 /* ConfigurationScope.WINDOW */;
            }
        }
        const subNodes = configuration.allOf;
        if (subNodes) {
            extension.collector.error(nls.localize(3533, null));
            for (const node of subNodes) {
                validateProperties(node, extension);
            }
        }
    }
    if (added.length) {
        const addedConfigurations = [];
        for (const extension of added) {
            const configurations = [];
            const value = extension.value;
            if (Array.isArray(value)) {
                value.forEach(v => configurations.push(handleConfiguration(v, extension)));
            }
            else {
                configurations.push(handleConfiguration(value, extension));
            }
            extensionConfigurations.set(extension.description.identifier, configurations);
            addedConfigurations.push(...configurations);
        }
        _configDelta.addedConfigurations = addedConfigurations;
    }
    configurationRegistry.deltaConfiguration(_configDelta);
    _configDelta = undefined;
});
// END VSCode extension point `configuration`
jsonRegistry.registerSchema('vscode://schemas/workspaceConfig', {
    allowComments: true,
    allowTrailingCommas: true,
    default: {
        folders: [
            {
                path: ''
            }
        ],
        settings: {}
    },
    required: ['folders'],
    properties: {
        'folders': {
            minItems: 0,
            uniqueItems: true,
            description: nls.localize(3534, null),
            items: {
                type: 'object',
                defaultSnippets: [{ body: { path: '$1' } }],
                oneOf: [{
                        properties: {
                            path: {
                                type: 'string',
                                description: nls.localize(3535, null)
                            },
                            name: {
                                type: 'string',
                                description: nls.localize(3536, null)
                            }
                        },
                        required: ['path']
                    }, {
                        properties: {
                            uri: {
                                type: 'string',
                                description: nls.localize(3537, null)
                            },
                            name: {
                                type: 'string',
                                description: nls.localize(3538, null)
                            }
                        },
                        required: ['uri']
                    }]
            }
        },
        'settings': {
            type: 'object',
            default: {},
            description: nls.localize(3539, null),
            $ref: workspaceSettingsSchemaId
        },
        'launch': {
            type: 'object',
            default: { configurations: [], compounds: [] },
            description: nls.localize(3540, null),
            $ref: launchSchemaId
        },
        'tasks': {
            type: 'object',
            default: { version: '2.0.0', tasks: [] },
            description: nls.localize(3541, null),
            $ref: tasksSchemaId
        },
        'mcp': {
            type: 'object',
            default: {
                inputs: [],
                servers: {
                    'mcp-server-time': {
                        command: 'uvx',
                        args: ['mcp_server_time', '--local-timezone=America/Los_Angeles']
                    }
                }
            },
            description: nls.localize(3542, null),
            $ref: mcpSchemaId
        },
        'extensions': {
            type: 'object',
            default: {},
            description: nls.localize(3543, null),
            $ref: 'vscode://schemas/extensions'
        },
        'remoteAuthority': {
            type: 'string',
            doNotSuggest: true,
            description: nls.localize(3544, null),
        },
        'transient': {
            type: 'boolean',
            doNotSuggest: true,
            description: nls.localize(3545, null),
        }
    },
    errorMessage: nls.localize(3546, null)
});
class SettingsTableRenderer extends Disposable {
    constructor() {
        super(...arguments);
        this.type = 'table';
    }
    shouldRender(manifest) {
        return !!manifest.contributes?.configuration;
    }
    render(manifest) {
        const configuration = manifest.contributes?.configuration
            ? Array.isArray(manifest.contributes.configuration) ? manifest.contributes.configuration : [manifest.contributes.configuration]
            : [];
        const properties = getAllConfigurationProperties(configuration);
        const contrib = properties ? Object.keys(properties) : [];
        const headers = [nls.localize(3547, null), nls.localize(3548, null), nls.localize(3549, null)];
        const rows = contrib.sort((a, b) => a.localeCompare(b))
            .map(key => {
            return [
                new MarkdownString().appendMarkdown(`\`${key}\``),
                properties[key].markdownDescription ? new MarkdownString(properties[key].markdownDescription, false) : properties[key].description ?? '',
                new MarkdownString().appendCodeblock('json', JSON.stringify(isUndefined(properties[key].default) ? getDefaultValue(properties[key].type) : properties[key].default, null, 2)),
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
Registry.as(ExtensionFeaturesExtensions.ExtensionFeaturesRegistry).registerExtensionFeature({
    id: 'configuration',
    label: nls.localize(3550, null),
    access: {
        canToggle: false
    },
    renderer: new SyncDescriptor(SettingsTableRenderer),
});
class ConfigurationDefaultsTableRenderer extends Disposable {
    constructor() {
        super(...arguments);
        this.type = 'table';
    }
    shouldRender(manifest) {
        return !!manifest.contributes?.configurationDefaults;
    }
    render(manifest) {
        const configurationDefaults = manifest.contributes?.configurationDefaults ?? {};
        const headers = [nls.localize(3551, null), nls.localize(3552, null), nls.localize(3553, null)];
        const rows = [];
        for (const key of Object.keys(configurationDefaults).sort((a, b) => a.localeCompare(b))) {
            const value = configurationDefaults[key];
            if (OVERRIDE_PROPERTY_REGEX.test(key)) {
                const languages = overrideIdentifiersFromKey(key);
                const languageMarkdown = new MarkdownString().appendMarkdown(`${languages.join(', ')}`);
                for (const key of Object.keys(value).sort((a, b) => a.localeCompare(b))) {
                    const row = [];
                    row.push(languageMarkdown);
                    row.push(new MarkdownString().appendMarkdown(`\`${key}\``));
                    row.push(new MarkdownString().appendCodeblock('json', JSON.stringify(value[key], null, 2)));
                    rows.push(row);
                }
            }
            else {
                const row = [];
                row.push('');
                row.push(new MarkdownString().appendMarkdown(`\`${key}\``));
                row.push(new MarkdownString().appendCodeblock('json', JSON.stringify(value, null, 2)));
                rows.push(row);
            }
        }
        return {
            data: {
                headers,
                rows
            },
            dispose: () => { }
        };
    }
}
Registry.as(ExtensionFeaturesExtensions.ExtensionFeaturesRegistry).registerExtensionFeature({
    id: 'configurationDefaults',
    label: nls.localize(3554, null),
    access: {
        canToggle: false
    },
    renderer: new SyncDescriptor(ConfigurationDefaultsTableRenderer),
});
//# sourceMappingURL=configurationExtensionPoint.js.map