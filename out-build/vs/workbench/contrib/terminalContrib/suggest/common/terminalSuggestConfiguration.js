/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { localize } from '../../../../../nls.js';
import { Extensions as ConfigurationExtensions } from '../../../../../platform/configuration/common/configurationRegistry.js';
import { Registry } from '../../../../../platform/registry/common/platform.js';
export var TerminalSuggestSettingId;
(function (TerminalSuggestSettingId) {
    TerminalSuggestSettingId["Enabled"] = "terminal.integrated.suggest.enabled";
    TerminalSuggestSettingId["QuickSuggestions"] = "terminal.integrated.suggest.quickSuggestions";
    TerminalSuggestSettingId["SuggestOnTriggerCharacters"] = "terminal.integrated.suggest.suggestOnTriggerCharacters";
    TerminalSuggestSettingId["RunOnEnter"] = "terminal.integrated.suggest.runOnEnter";
    TerminalSuggestSettingId["WindowsExecutableExtensions"] = "terminal.integrated.suggest.windowsExecutableExtensions";
    TerminalSuggestSettingId["Providers"] = "terminal.integrated.suggest.providers";
    TerminalSuggestSettingId["ShowStatusBar"] = "terminal.integrated.suggest.showStatusBar";
    TerminalSuggestSettingId["CdPath"] = "terminal.integrated.suggest.cdPath";
    TerminalSuggestSettingId["InlineSuggestion"] = "terminal.integrated.suggest.inlineSuggestion";
    TerminalSuggestSettingId["UpArrowNavigatesHistory"] = "terminal.integrated.suggest.upArrowNavigatesHistory";
    TerminalSuggestSettingId["SelectionMode"] = "terminal.integrated.suggest.selectionMode";
    TerminalSuggestSettingId["InsertTrailingSpace"] = "terminal.integrated.suggest.insertTrailingSpace";
})(TerminalSuggestSettingId || (TerminalSuggestSettingId = {}));
export const windowsDefaultExecutableExtensions = [
    'exe', // Executable file
    'bat', // Batch file
    'cmd', // Command script
    'com', // Command file
    'msi', // Windows Installer package
    'ps1', // PowerShell script
    'vbs', // VBScript file
    'js', // JScript file
    'jar', // Java Archive (requires Java runtime)
    'py', // Python script (requires Python interpreter)
    'rb', // Ruby script (requires Ruby interpreter)
    'pl', // Perl script (requires Perl interpreter)
    'sh', // Shell script (via WSL or third-party tools)
];
export const terminalSuggestConfigSection = 'terminal.integrated.suggest';
/**
 * Normalizes the quickSuggestions config value to an object.
 * Handles migration from boolean values:
 * - `true` -> { commands: 'on', arguments: 'on', unknown: 'on' }
 * - `false` -> { commands: 'off', arguments: 'off', unknown: 'off' }
 * - object -> passed through as-is
 */
export function normalizeQuickSuggestionsConfig(config) {
    if (typeof config === 'boolean') {
        return config
            ? { commands: 'on', arguments: 'on', unknown: 'off' }
            : { commands: 'off', arguments: 'off', unknown: 'off' };
    }
    return config;
}
export const terminalSuggestConfiguration = {
    ["terminal.integrated.suggest.enabled" /* TerminalSuggestSettingId.Enabled */]: {
        restricted: true,
        markdownDescription: localize(16301, null, 'Windows PowerShell, PowerShell v7+, zsh, bash, fish', `\`#${"terminal.integrated.shellIntegration.enabled" /* TerminalSettingId.ShellIntegrationEnabled */}#\``),
        type: 'boolean',
        default: true,
    },
    ["terminal.integrated.suggest.providers" /* TerminalSuggestSettingId.Providers */]: {
        restricted: true,
        markdownDescription: localize(16302, null),
        type: 'object',
        properties: {},
    },
    ["terminal.integrated.suggest.quickSuggestions" /* TerminalSuggestSettingId.QuickSuggestions */]: {
        restricted: true,
        markdownDescription: localize(16303, null, `\`#${"terminal.integrated.suggest.suggestOnTriggerCharacters" /* TerminalSuggestSettingId.SuggestOnTriggerCharacters */}#\``),
        type: 'object',
        properties: {
            commands: {
                description: localize(16304, null),
                type: 'string',
                enum: ['on', 'off'],
            },
            arguments: {
                description: localize(16305, null),
                type: 'string',
                enum: ['on', 'off'],
            },
            unknown: {
                description: localize(16306, null),
                type: 'string',
                enum: ['on', 'off'],
            },
        },
        additionalProperties: false,
        default: {
            commands: 'off',
            arguments: 'off',
            unknown: 'off',
        },
    },
    ["terminal.integrated.suggest.suggestOnTriggerCharacters" /* TerminalSuggestSettingId.SuggestOnTriggerCharacters */]: {
        restricted: true,
        markdownDescription: localize(16307, null),
        type: 'boolean',
        default: false,
    },
    ["terminal.integrated.suggest.runOnEnter" /* TerminalSuggestSettingId.RunOnEnter */]: {
        restricted: true,
        markdownDescription: localize(16308, null),
        enum: ['never', 'exactMatch', 'exactMatchIgnoreExtension', 'always'],
        markdownEnumDescriptions: [
            localize(16309, null),
            localize(16310, null),
            localize(16311, null),
            localize(16312, null)
        ],
        default: 'never',
    },
    ["terminal.integrated.suggest.selectionMode" /* TerminalSuggestSettingId.SelectionMode */]: {
        markdownDescription: localize(16313, null),
        type: 'string',
        enum: ['partial', 'always', 'never'],
        markdownEnumDescriptions: [
            localize(16314, null),
            localize(16315, null),
            localize(16316, null),
        ],
        default: 'partial',
    },
    ["terminal.integrated.suggest.windowsExecutableExtensions" /* TerminalSuggestSettingId.WindowsExecutableExtensions */]: {
        restricted: true,
        markdownDescription: localize(16317, null, windowsDefaultExecutableExtensions.sort().map(extension => `- ${extension}`).join('\n')),
        type: 'object',
        default: {},
    },
    ["terminal.integrated.suggest.showStatusBar" /* TerminalSuggestSettingId.ShowStatusBar */]: {
        restricted: true,
        markdownDescription: localize(16318, null),
        type: 'boolean',
        default: true,
    },
    ["terminal.integrated.suggest.cdPath" /* TerminalSuggestSettingId.CdPath */]: {
        restricted: true,
        markdownDescription: localize(16319, null),
        type: 'string',
        enum: ['off', 'relative', 'absolute'],
        markdownEnumDescriptions: [
            localize(16320, null),
            localize(16321, null),
            localize(16322, null),
        ],
        default: 'absolute',
    },
    ["terminal.integrated.suggest.inlineSuggestion" /* TerminalSuggestSettingId.InlineSuggestion */]: {
        restricted: true,
        markdownDescription: localize(16323, null),
        type: 'string',
        enum: ['off', 'alwaysOnTopExceptExactMatch', 'alwaysOnTop'],
        markdownEnumDescriptions: [
            localize(16324, null),
            localize(16325, null),
            localize(16326, null),
        ],
        default: 'alwaysOnTop',
    },
    ["terminal.integrated.suggest.upArrowNavigatesHistory" /* TerminalSuggestSettingId.UpArrowNavigatesHistory */]: {
        restricted: true,
        markdownDescription: localize(16327, null),
        type: 'boolean',
        default: true,
    },
    ["terminal.integrated.suggest.insertTrailingSpace" /* TerminalSuggestSettingId.InsertTrailingSpace */]: {
        restricted: true,
        markdownDescription: localize(16328, null),
        type: 'boolean',
        default: false,
    },
};
let terminalSuggestProvidersConfiguration;
export function registerTerminalSuggestProvidersConfiguration(providers) {
    const oldProvidersConfiguration = terminalSuggestProvidersConfiguration;
    providers ??= new Map();
    if (!providers.has('lsp')) {
        providers.set('lsp', {
            id: 'lsp',
            description: localize(16329, null)
        });
    }
    const providersProperties = {};
    for (const id of Array.from(providers.keys()).sort()) {
        providersProperties[id] = {
            type: 'boolean',
            default: id === 'lsp' ? false : true,
            description: providers.get(id)?.description ??
                localize(16330, null, id)
        };
    }
    const defaultValue = {};
    for (const key in providersProperties) {
        defaultValue[key] = providersProperties[key].default;
    }
    terminalSuggestProvidersConfiguration = {
        id: 'terminalSuggestProviders',
        order: 100,
        title: localize(16331, null),
        type: 'object',
        properties: {
            ["terminal.integrated.suggest.providers" /* TerminalSuggestSettingId.Providers */]: {
                restricted: true,
                markdownDescription: localize(16332, null),
                type: 'object',
                properties: providersProperties,
                default: defaultValue,
                tags: ['preview'],
                additionalProperties: false
            }
        }
    };
    const registry = Registry.as(ConfigurationExtensions.Configuration);
    registry.updateConfigurations({
        add: [terminalSuggestProvidersConfiguration],
        remove: oldProvidersConfiguration ? [oldProvidersConfiguration] : []
    });
}
registerTerminalSuggestProvidersConfiguration();
//# sourceMappingURL=terminalSuggestConfiguration.js.map