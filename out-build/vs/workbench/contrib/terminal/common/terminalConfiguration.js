/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Codicon } from '../../../../base/common/codicons.js';
import { isMacintosh, isWindows } from '../../../../base/common/platform.js';
import { isString } from '../../../../base/common/types.js';
import { localize } from '../../../../nls.js';
import { Extensions } from '../../../../platform/configuration/common/configurationRegistry.js';
import product from '../../../../platform/product/common/product.js';
import { Registry } from '../../../../platform/registry/common/platform.js';
import { terminalColorSchema, terminalIconSchema } from '../../../../platform/terminal/common/terminalPlatformConfiguration.js';
import { Extensions as WorkbenchExtensions } from '../../../common/configuration.js';
import { terminalContribConfiguration } from '../terminalContribExports.js';
import { DEFAULT_COMMANDS_TO_SKIP_SHELL, DEFAULT_LETTER_SPACING, DEFAULT_LINE_HEIGHT, MAXIMUM_FONT_WEIGHT, MINIMUM_FONT_WEIGHT, SUGGESTIONS_FONT_WEIGHT } from './terminal.js';
const terminalDescriptors = '\n- ' + [
    '`\${cwd}`: ' + localize(15590, null),
    '`\${cwdFolder}`: ' + localize(15591, null),
    '`\${workspaceFolder}`: ' + localize(15592, null),
    '`\${workspaceFolderName}`: ' + localize(15593, null),
    '`\${local}`: ' + localize(15594, null),
    '`\${process}`: ' + localize(15595, null),
    '`\${progress}`: ' + localize(15596, null),
    '`\${separator}`: ' + localize(15597, null, '(` - `)'),
    '`\${sequence}`: ' + localize(15598, null),
    '`\${task}`: ' + localize(15599, null),
    '`\${shellType}`: ' + localize(15600, null),
    '`\${shellCommand}`: ' + localize(15601, null),
    '`\${shellPromptInput}`: ' + localize(15602, null),
].join('\n- '); // intentionally concatenated to not produce a string that is too long for translations
let terminalTitle = localize(15603, null);
terminalTitle += terminalDescriptors;
let terminalDescription = localize(15604, null);
terminalDescription += terminalDescriptors;
export const defaultTerminalFontSize = isMacintosh ? 12 : 14;
const terminalConfiguration = {
    ["terminal.integrated.sendKeybindingsToShell" /* TerminalSettingId.SendKeybindingsToShell */]: {
        markdownDescription: localize(15605, null, '`#terminal.integrated.commandsToSkipShell#`'),
        type: 'boolean',
        default: false
    },
    ["terminal.integrated.tabs.defaultColor" /* TerminalSettingId.TabsDefaultColor */]: {
        description: localize(15606, null),
        ...terminalColorSchema,
        scope: 5 /* ConfigurationScope.RESOURCE */
    },
    ["terminal.integrated.tabs.defaultIcon" /* TerminalSettingId.TabsDefaultIcon */]: {
        description: localize(15607, null),
        ...terminalIconSchema,
        default: Codicon.terminal.id,
        scope: 5 /* ConfigurationScope.RESOURCE */
    },
    ["terminal.integrated.tabs.enabled" /* TerminalSettingId.TabsEnabled */]: {
        description: localize(15608, null),
        type: 'boolean',
        default: true,
    },
    ["terminal.integrated.tabs.enableAnimation" /* TerminalSettingId.TabsEnableAnimation */]: {
        description: localize(15609, null),
        type: 'boolean',
        default: true,
    },
    ["terminal.integrated.tabs.hideCondition" /* TerminalSettingId.TabsHideCondition */]: {
        description: localize(15610, null),
        type: 'string',
        enum: ['never', 'singleTerminal', 'singleGroup'],
        enumDescriptions: [
            localize(15611, null),
            localize(15612, null),
            localize(15613, null),
        ],
        default: 'singleTerminal',
    },
    ["terminal.integrated.tabs.showActiveTerminal" /* TerminalSettingId.TabsShowActiveTerminal */]: {
        description: localize(15614, null),
        type: 'string',
        enum: ['always', 'singleTerminal', 'singleTerminalOrNarrow', 'never'],
        enumDescriptions: [
            localize(15615, null),
            localize(15616, null),
            localize(15617, null),
            localize(15618, null),
        ],
        default: 'singleTerminalOrNarrow',
    },
    ["terminal.integrated.tabs.showActions" /* TerminalSettingId.TabsShowActions */]: {
        description: localize(15619, null),
        type: 'string',
        enum: ['always', 'singleTerminal', 'singleTerminalOrNarrow', 'never'],
        enumDescriptions: [
            localize(15620, null),
            localize(15621, null),
            localize(15622, null),
            localize(15623, null),
        ],
        default: 'singleTerminalOrNarrow',
    },
    ["terminal.integrated.tabs.location" /* TerminalSettingId.TabsLocation */]: {
        type: 'string',
        enum: ['left', 'right'],
        enumDescriptions: [
            localize(15624, null),
            localize(15625, null)
        ],
        default: 'right',
        description: localize(15626, null)
    },
    ["terminal.integrated.defaultLocation" /* TerminalSettingId.DefaultLocation */]: {
        type: 'string',
        enum: ["editor" /* TerminalLocationConfigValue.Editor */, "view" /* TerminalLocationConfigValue.TerminalView */],
        enumDescriptions: [
            localize(15627, null),
            localize(15628, null)
        ],
        default: 'view',
        description: localize(15629, null)
    },
    ["terminal.integrated.tabs.focusMode" /* TerminalSettingId.TabsFocusMode */]: {
        type: 'string',
        enum: ['singleClick', 'doubleClick'],
        enumDescriptions: [
            localize(15630, null),
            localize(15631, null)
        ],
        default: 'doubleClick',
        description: localize(15632, null)
    },
    ["terminal.integrated.macOptionIsMeta" /* TerminalSettingId.MacOptionIsMeta */]: {
        description: localize(15633, null),
        type: 'boolean',
        default: false
    },
    ["terminal.integrated.macOptionClickForcesSelection" /* TerminalSettingId.MacOptionClickForcesSelection */]: {
        description: localize(15634, null),
        type: 'boolean',
        default: false
    },
    ["terminal.integrated.altClickMovesCursor" /* TerminalSettingId.AltClickMovesCursor */]: {
        markdownDescription: localize(15635, null, '`#editor.multiCursorModifier#`', '`\'alt\'`'),
        type: 'boolean',
        default: true
    },
    ["terminal.integrated.copyOnSelection" /* TerminalSettingId.CopyOnSelection */]: {
        description: localize(15636, null),
        type: 'boolean',
        default: false
    },
    ["terminal.integrated.enableMultiLinePasteWarning" /* TerminalSettingId.EnableMultiLinePasteWarning */]: {
        markdownDescription: localize(15637, null),
        type: 'string',
        enum: ['auto', 'always', 'never'],
        markdownEnumDescriptions: [
            localize(15638, null),
            localize(15639, null),
            localize(15640, null)
        ],
        default: 'auto'
    },
    ["terminal.integrated.drawBoldTextInBrightColors" /* TerminalSettingId.DrawBoldTextInBrightColors */]: {
        description: localize(15641, null),
        type: 'boolean',
        default: true
    },
    ["terminal.integrated.fontFamily" /* TerminalSettingId.FontFamily */]: {
        markdownDescription: localize(15642, null, '`#editor.fontFamily#`'),
        type: 'string',
    },
    ["terminal.integrated.fontLigatures.enabled" /* TerminalSettingId.FontLigaturesEnabled */]: {
        markdownDescription: localize(15643, null, `\`#${"terminal.integrated.fontFamily" /* TerminalSettingId.FontFamily */}#\``),
        type: 'boolean',
        default: false
    },
    ["terminal.integrated.fontLigatures.featureSettings" /* TerminalSettingId.FontLigaturesFeatureSettings */]: {
        markdownDescription: localize(15644, null) + '\n\n- ' + [
            `\`"calt" off, "ss03"\``,
            `\`"liga" on\``,
            `\`"calt" off, "dlig" on\``
        ].join('\n- '),
        type: 'string',
        default: '"calt" on'
    },
    ["terminal.integrated.fontLigatures.fallbackLigatures" /* TerminalSettingId.FontLigaturesFallbackLigatures */]: {
        markdownDescription: localize(15645, null, `\`#${"terminal.integrated.gpuAcceleration" /* TerminalSettingId.GpuAcceleration */}#\``, `\`#${"terminal.integrated.fontFamily" /* TerminalSettingId.FontFamily */}#\``),
        type: 'array',
        items: [{ type: 'string' }],
        default: [
            '<--', '<---', '<<-', '<-', '->', '->>', '-->', '--->',
            '<==', '<===', '<<=', '<=', '=>', '=>>', '==>', '===>', '>=', '>>=',
            '<->', '<-->', '<--->', '<---->', '<=>', '<==>', '<===>', '<====>', '::', ':::',
            '<~~', '</', '</>', '/>', '~~>', '==', '!=', '/=', '~=', '<>', '===', '!==', '!===',
            '<:', ':=', '*=', '*+', '<*', '<*>', '*>', '<|', '<|>', '|>', '+*', '=*', '=:', ':>',
            '/*', '*/', '+++', '<!--', '<!---'
        ]
    },
    ["terminal.integrated.fontSize" /* TerminalSettingId.FontSize */]: {
        description: localize(15646, null),
        type: 'number',
        default: defaultTerminalFontSize,
        minimum: 6,
        maximum: 100
    },
    ["terminal.integrated.letterSpacing" /* TerminalSettingId.LetterSpacing */]: {
        description: localize(15647, null),
        type: 'number',
        default: DEFAULT_LETTER_SPACING
    },
    ["terminal.integrated.lineHeight" /* TerminalSettingId.LineHeight */]: {
        description: localize(15648, null),
        type: 'number',
        default: DEFAULT_LINE_HEIGHT
    },
    ["terminal.integrated.minimumContrastRatio" /* TerminalSettingId.MinimumContrastRatio */]: {
        markdownDescription: localize(15649, null),
        type: 'number',
        default: 4.5,
        tags: ['accessibility']
    },
    ["terminal.integrated.tabStopWidth" /* TerminalSettingId.TabStopWidth */]: {
        markdownDescription: localize(15650, null),
        type: 'number',
        minimum: 1,
        default: 8
    },
    ["terminal.integrated.fastScrollSensitivity" /* TerminalSettingId.FastScrollSensitivity */]: {
        markdownDescription: localize(15651, null),
        type: 'number',
        default: 5
    },
    ["terminal.integrated.mouseWheelScrollSensitivity" /* TerminalSettingId.MouseWheelScrollSensitivity */]: {
        markdownDescription: localize(15652, null),
        type: 'number',
        default: 1
    },
    ["terminal.integrated.bellDuration" /* TerminalSettingId.BellDuration */]: {
        markdownDescription: localize(15653, null),
        type: 'number',
        default: 1000
    },
    ["terminal.integrated.fontWeight" /* TerminalSettingId.FontWeight */]: {
        'anyOf': [
            {
                type: 'number',
                minimum: MINIMUM_FONT_WEIGHT,
                maximum: MAXIMUM_FONT_WEIGHT,
                errorMessage: localize(15654, null)
            },
            {
                type: 'string',
                pattern: '^(normal|bold|1000|[1-9][0-9]{0,2})$'
            },
            {
                enum: SUGGESTIONS_FONT_WEIGHT,
            }
        ],
        description: localize(15655, null),
        default: 'normal'
    },
    ["terminal.integrated.fontWeightBold" /* TerminalSettingId.FontWeightBold */]: {
        'anyOf': [
            {
                type: 'number',
                minimum: MINIMUM_FONT_WEIGHT,
                maximum: MAXIMUM_FONT_WEIGHT,
                errorMessage: localize(15656, null)
            },
            {
                type: 'string',
                pattern: '^(normal|bold|1000|[1-9][0-9]{0,2})$'
            },
            {
                enum: SUGGESTIONS_FONT_WEIGHT,
            }
        ],
        description: localize(15657, null),
        default: 'bold'
    },
    ["terminal.integrated.cursorBlinking" /* TerminalSettingId.CursorBlinking */]: {
        description: localize(15658, null),
        type: 'boolean',
        default: false
    },
    ["terminal.integrated.textBlinking" /* TerminalSettingId.TextBlinking */]: {
        description: localize(15659, null),
        type: 'boolean',
        default: false
    },
    ["terminal.integrated.cursorStyle" /* TerminalSettingId.CursorStyle */]: {
        description: localize(15660, null),
        enum: ['block', 'line', 'underline'],
        default: 'block'
    },
    ["terminal.integrated.cursorStyleInactive" /* TerminalSettingId.CursorStyleInactive */]: {
        description: localize(15661, null),
        enum: ['outline', 'block', 'line', 'underline', 'none'],
        default: 'outline'
    },
    ["terminal.integrated.cursorWidth" /* TerminalSettingId.CursorWidth */]: {
        markdownDescription: localize(15662, null, '`#terminal.integrated.cursorStyle#`', '`line`'),
        type: 'number',
        default: 1
    },
    ["terminal.integrated.scrollback" /* TerminalSettingId.Scrollback */]: {
        description: localize(15663, null),
        type: 'number',
        default: 1000
    },
    ["terminal.integrated.detectLocale" /* TerminalSettingId.DetectLocale */]: {
        markdownDescription: localize(15664, null),
        type: 'string',
        enum: ['auto', 'off', 'on'],
        markdownEnumDescriptions: [
            localize(15665, null),
            localize(15666, null),
            localize(15667, null)
        ],
        default: 'auto'
    },
    ["terminal.integrated.gpuAcceleration" /* TerminalSettingId.GpuAcceleration */]: {
        type: 'string',
        enum: ['auto', 'on', 'off'],
        markdownEnumDescriptions: [
            localize(15668, null),
            localize(15669, null),
            localize(15670, null),
        ],
        default: 'auto',
        description: localize(15671, null)
    },
    ["terminal.integrated.tabs.separator" /* TerminalSettingId.TerminalTitleSeparator */]: {
        'type': 'string',
        'default': ' - ',
        'markdownDescription': localize(15672, null, `\`#${"terminal.integrated.tabs.title" /* TerminalSettingId.TerminalTitle */}#\``, `\`#${"terminal.integrated.tabs.description" /* TerminalSettingId.TerminalDescription */}#\``)
    },
    ["terminal.integrated.tabs.title" /* TerminalSettingId.TerminalTitle */]: {
        'type': 'string',
        'default': '${process}',
        'markdownDescription': terminalTitle
    },
    ["terminal.integrated.tabs.description" /* TerminalSettingId.TerminalDescription */]: {
        'type': 'string',
        'default': '${task}${separator}${local}${separator}${cwdFolder}',
        'markdownDescription': terminalDescription
    },
    ["terminal.integrated.rightClickBehavior" /* TerminalSettingId.RightClickBehavior */]: {
        type: 'string',
        enum: ['default', 'copyPaste', 'paste', 'selectWord', 'nothing'],
        enumDescriptions: [
            localize(15673, null),
            localize(15674, null),
            localize(15675, null),
            localize(15676, null),
            localize(15677, null)
        ],
        default: isMacintosh ? 'selectWord' : isWindows ? 'copyPaste' : 'default',
        description: localize(15678, null)
    },
    ["terminal.integrated.middleClickBehavior" /* TerminalSettingId.MiddleClickBehavior */]: {
        type: 'string',
        enum: ['default', 'paste'],
        enumDescriptions: [
            localize(15679, null),
            localize(15680, null),
        ],
        default: 'default',
        description: localize(15681, null)
    },
    ["terminal.integrated.cwd" /* TerminalSettingId.Cwd */]: {
        restricted: true,
        description: localize(15682, null),
        type: 'string',
        default: undefined,
        scope: 5 /* ConfigurationScope.RESOURCE */
    },
    ["terminal.integrated.confirmOnExit" /* TerminalSettingId.ConfirmOnExit */]: {
        description: localize(15683, null),
        type: 'string',
        enum: ['never', 'always', 'hasChildProcesses'],
        enumDescriptions: [
            localize(15684, null),
            localize(15685, null),
            localize(15686, null),
        ],
        default: 'never'
    },
    ["terminal.integrated.confirmOnKill" /* TerminalSettingId.ConfirmOnKill */]: {
        description: localize(15687, null),
        type: 'string',
        enum: ['never', 'editor', 'panel', 'always'],
        enumDescriptions: [
            localize(15688, null),
            localize(15689, null),
            localize(15690, null),
            localize(15691, null),
        ],
        default: 'editor'
    },
    ["terminal.integrated.enableBell" /* TerminalSettingId.EnableBell */]: {
        markdownDeprecationMessage: localize(15692, null),
        type: 'boolean',
        default: false
    },
    ["terminal.integrated.enableVisualBell" /* TerminalSettingId.EnableVisualBell */]: {
        description: localize(15693, null),
        type: 'boolean',
        default: false
    },
    ["terminal.integrated.commandsToSkipShell" /* TerminalSettingId.CommandsToSkipShell */]: {
        markdownDescription: localize(15694, null, DEFAULT_COMMANDS_TO_SKIP_SHELL.sort().map(command => `- ${command}`).join('\n'), `[${localize(15695, null)}](command:workbench.action.openRawDefaultSettings '${localize(15696, null)}')`),
        type: 'array',
        items: {
            type: 'string'
        },
        default: []
    },
    ["terminal.integrated.allowChords" /* TerminalSettingId.AllowChords */]: {
        markdownDescription: localize(15697, null, '`#terminal.integrated.commandsToSkipShell#`'),
        type: 'boolean',
        default: true
    },
    ["terminal.integrated.allowMnemonics" /* TerminalSettingId.AllowMnemonics */]: {
        markdownDescription: localize(15698, null),
        type: 'boolean',
        default: false
    },
    ["terminal.integrated.env.osx" /* TerminalSettingId.EnvMacOs */]: {
        restricted: true,
        markdownDescription: localize(15699, null),
        type: 'object',
        additionalProperties: {
            type: ['string', 'null']
        },
        default: {}
    },
    ["terminal.integrated.env.linux" /* TerminalSettingId.EnvLinux */]: {
        restricted: true,
        markdownDescription: localize(15700, null),
        type: 'object',
        additionalProperties: {
            type: ['string', 'null']
        },
        default: {}
    },
    ["terminal.integrated.env.windows" /* TerminalSettingId.EnvWindows */]: {
        restricted: true,
        markdownDescription: localize(15701, null),
        type: 'object',
        additionalProperties: {
            type: ['string', 'null']
        },
        default: {}
    },
    ["terminal.integrated.environmentChangesRelaunch" /* TerminalSettingId.EnvironmentChangesRelaunch */]: {
        markdownDescription: localize(15702, null),
        type: 'boolean',
        default: true
    },
    ["terminal.integrated.showExitAlert" /* TerminalSettingId.ShowExitAlert */]: {
        description: localize(15703, null),
        type: 'boolean',
        default: true
    },
    ["terminal.integrated.windowsUseConptyDll" /* TerminalSettingId.WindowsUseConptyDll */]: {
        restricted: true,
        markdownDescription: localize(15704, null),
        type: 'boolean',
        tags: ['preview'],
        default: false,
        experiment: {
            mode: 'auto'
        },
    },
    ["terminal.integrated.splitCwd" /* TerminalSettingId.SplitCwd */]: {
        description: localize(15705, null),
        type: 'string',
        enum: ['workspaceRoot', 'initial', 'inherited'],
        enumDescriptions: [
            localize(15706, null),
            localize(15707, null),
            localize(15708, null),
        ],
        default: 'inherited'
    },
    ["terminal.integrated.wordSeparators" /* TerminalSettingId.WordSeparators */]: {
        markdownDescription: localize(15709, null),
        type: 'string',
        // allow-any-unicode-next-line
        default: ' ()[]{}\',"`─‘’“”|'
    },
    ["terminal.integrated.enableFileLinks" /* TerminalSettingId.EnableFileLinks */]: {
        description: localize(15710, null),
        type: 'string',
        enum: ['off', 'on', 'notRemote'],
        enumDescriptions: [
            localize(15711, null),
            localize(15712, null),
            localize(15713, null)
        ],
        default: 'on'
    },
    ["terminal.integrated.allowedLinkSchemes" /* TerminalSettingId.AllowedLinkSchemes */]: {
        description: localize(15714, null),
        type: 'array',
        items: {
            type: 'string'
        },
        default: [
            'file',
            'http',
            'https',
            'mailto',
            'vscode',
            'vscode-insiders',
        ]
    },
    ["terminal.integrated.unicodeVersion" /* TerminalSettingId.UnicodeVersion */]: {
        type: 'string',
        enum: ['6', '11'],
        enumDescriptions: [
            localize(15715, null),
            localize(15716, null)
        ],
        default: '11',
        description: localize(15717, null)
    },
    ["terminal.integrated.enablePersistentSessions" /* TerminalSettingId.EnablePersistentSessions */]: {
        description: localize(15718, null),
        type: 'boolean',
        default: true
    },
    ["terminal.integrated.persistentSessionReviveProcess" /* TerminalSettingId.PersistentSessionReviveProcess */]: {
        markdownDescription: localize(15719, null),
        type: 'string',
        enum: ['onExit', 'onExitAndWindowClose', 'never'],
        markdownEnumDescriptions: [
            localize(15720, null),
            localize(15721, null),
            localize(15722, null)
        ],
        default: 'onExit'
    },
    ["terminal.integrated.hideOnStartup" /* TerminalSettingId.HideOnStartup */]: {
        description: localize(15723, null),
        type: 'string',
        enum: ['never', 'whenEmpty', 'always'],
        markdownEnumDescriptions: [
            localize(15724, null),
            localize(15725, null),
            localize(15726, null)
        ],
        default: 'never',
    },
    ["terminal.integrated.hideOnLastClosed" /* TerminalSettingId.HideOnLastClosed */]: {
        description: localize(15727, null),
        type: 'boolean',
        default: true
    },
    ["terminal.integrated.customGlyphs" /* TerminalSettingId.CustomGlyphs */]: {
        markdownDescription: localize(15728, null, [
            '- Box Drawing (U+2500-U+257F)',
            '- Block Elements (U+2580-U+259F)',
            '- Braille Patterns (U+2800-U+28FF)',
            '- Powerline Symbols (U+E0A0-U+E0D4, Private Use Area)',
            '- Progress Indicators (U+EE00-U+EE0B, Private Use Area)',
            '- Git Branch Symbols (U+F5D0-U+F60D, Private Use Area)',
            '- Symbols for Legacy Computing (U+1FB00-U+1FBFF)'
        ].join('\n'), `\`#${"terminal.integrated.gpuAcceleration" /* TerminalSettingId.GpuAcceleration */}#\``),
        type: 'boolean',
        default: true
    },
    ["terminal.integrated.rescaleOverlappingGlyphs" /* TerminalSettingId.RescaleOverlappingGlyphs */]: {
        markdownDescription: localize(15729, null),
        type: 'boolean',
        default: true
    },
    ["terminal.integrated.enableKittyKeyboardProtocol" /* TerminalSettingId.EnableKittyKeyboardProtocol */]: {
        restricted: true,
        markdownDescription: localize(15730, null),
        type: 'boolean',
        default: true,
        tags: ['advanced']
    },
    ["terminal.integrated.enableWin32InputMode" /* TerminalSettingId.EnableWin32InputMode */]: {
        restricted: true,
        markdownDescription: localize(15731, null),
        type: 'boolean',
        default: false,
        tags: ['experimental', 'advanced'],
        experiment: {
            mode: 'auto'
        }
    },
    ["terminal.integrated.experimental.aiProfileGrouping" /* TerminalSettingId.ExperimentalAiProfileGrouping */]: {
        markdownDescription: localize(15732, null),
        type: 'boolean',
        default: false,
        tags: ['experimental'],
        experiment: {
            mode: 'auto'
        }
    },
    ["terminal.integrated.shellIntegration.enabled" /* TerminalSettingId.ShellIntegrationEnabled */]: {
        restricted: true,
        markdownDescription: localize(15733, null, '`#terminal.integrated.shellIntegration.decorationsEnabled#`', '`#editor.accessibilitySupport#`'),
        type: 'boolean',
        default: true
    },
    ["terminal.integrated.shellIntegration.decorationsEnabled" /* TerminalSettingId.ShellIntegrationDecorationsEnabled */]: {
        restricted: true,
        markdownDescription: localize(15734, null),
        type: 'string',
        enum: ['both', 'gutter', 'overviewRuler', 'never'],
        enumDescriptions: [
            localize(15735, null),
            localize(15736, null),
            localize(15737, null),
            localize(15738, null),
        ],
        default: 'both'
    },
    ["terminal.integrated.shellIntegration.timeout" /* TerminalSettingId.ShellIntegrationTimeout */]: {
        restricted: true,
        markdownDescription: localize(15739, null, '`0`', '`-1`'),
        type: 'integer',
        minimum: -1,
        maximum: 60000,
        default: -1
    },
    ["terminal.integrated.shellIntegration.quickFixEnabled" /* TerminalSettingId.ShellIntegrationQuickFixEnabled */]: {
        restricted: true,
        markdownDescription: localize(15740, null),
        type: 'boolean',
        default: true
    },
    ["terminal.integrated.shellIntegration.environmentReporting" /* TerminalSettingId.ShellIntegrationEnvironmentReporting */]: {
        markdownDescription: localize(15741, null, `\`#${"terminal.integrated.suggest.enabled" /* TerminalContribSettingId.SuggestEnabled */}#\``),
        type: 'boolean',
        default: product.quality !== 'stable'
    },
    ["terminal.integrated.smoothScrolling" /* TerminalSettingId.SmoothScrolling */]: {
        markdownDescription: localize(15742, null),
        type: 'boolean',
        default: false
    },
    ["terminal.integrated.ignoreBracketedPasteMode" /* TerminalSettingId.IgnoreBracketedPasteMode */]: {
        markdownDescription: localize(15743, null, '`\\x1b[200~`', '`\\x1b[201~`'),
        type: 'boolean',
        default: false
    },
    ["terminal.integrated.enableImages" /* TerminalSettingId.EnableImages */]: {
        restricted: true,
        markdownDescription: localize(15744, null, `\`#${"terminal.integrated.gpuAcceleration" /* TerminalSettingId.GpuAcceleration */}#\``, `\`#${"terminal.integrated.windowsUseConptyDll" /* TerminalSettingId.WindowsUseConptyDll */}#\``),
        type: 'boolean',
        default: false
    },
    ["terminal.integrated.focusAfterRun" /* TerminalSettingId.FocusAfterRun */]: {
        markdownDescription: localize(15745, null),
        enum: ['terminal', 'accessible-buffer', 'none'],
        default: 'none',
        tags: ['accessibility'],
        markdownEnumDescriptions: [
            localize(15746, null),
            localize(15747, null),
            localize(15748, null),
        ]
    },
    ["terminal.integrated.allowInUntrustedWorkspace" /* TerminalSettingId.AllowInUntrustedWorkspace */]: {
        restricted: true,
        markdownDescription: localize(15749, null),
        type: 'boolean',
        default: false
    },
    ["terminal.integrated.developer.ptyHost.latency" /* TerminalSettingId.DeveloperPtyHostLatency */]: {
        description: localize(15750, null),
        type: 'number',
        minimum: 0,
        default: 0,
        tags: ['advanced']
    },
    ["terminal.integrated.developer.ptyHost.startupDelay" /* TerminalSettingId.DeveloperPtyHostStartupDelay */]: {
        description: localize(15751, null),
        type: 'number',
        minimum: 0,
        default: 0,
        tags: ['advanced']
    },
    ["terminal.integrated.developer.devMode" /* TerminalSettingId.DevMode */]: {
        description: localize(15752, null),
        type: 'boolean',
        default: false,
        tags: ['advanced']
    },
    ...terminalContribConfiguration,
};
export async function registerTerminalConfiguration(getFontSnippets) {
    const configurationRegistry = Registry.as(Extensions.Configuration);
    configurationRegistry.registerConfiguration({
        id: 'terminal',
        order: 100,
        title: localize(15753, null),
        type: 'object',
        properties: terminalConfiguration,
    });
    terminalConfiguration["terminal.integrated.fontFamily" /* TerminalSettingId.FontFamily */].defaultSnippets = await getFontSnippets();
}
Registry.as(WorkbenchExtensions.ConfigurationMigration)
    .registerConfigurationMigrations([{
        key: "terminal.integrated.enableBell" /* TerminalSettingId.EnableBell */,
        migrateFn: (enableBell, accessor) => {
            const configurationKeyValuePairs = [];
            let announcement = accessor('accessibility.signals.terminalBell')?.announcement ?? accessor('accessibility.alert.terminalBell');
            if (announcement !== undefined && !isString(announcement)) {
                announcement = announcement ? 'auto' : 'off';
            }
            configurationKeyValuePairs.push(['accessibility.signals.terminalBell', { value: { sound: enableBell ? 'on' : 'off', announcement } }]);
            configurationKeyValuePairs.push(["terminal.integrated.enableBell" /* TerminalSettingId.EnableBell */, { value: undefined }]);
            configurationKeyValuePairs.push(["terminal.integrated.enableVisualBell" /* TerminalSettingId.EnableVisualBell */, { value: enableBell }]);
            return configurationKeyValuePairs;
        }
    }]);
//# sourceMappingURL=terminalConfiguration.js.map