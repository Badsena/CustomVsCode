/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { localize } from '../../../../../nls.js';
import { terminalProfileBaseProperties } from '../../../../../platform/terminal/common/terminalPlatformConfiguration.js';
import { PolicyCategory } from '../../../../../base/common/policy.js';
export var TerminalChatAgentToolsSettingId;
(function (TerminalChatAgentToolsSettingId) {
    TerminalChatAgentToolsSettingId["EnableAutoApprove"] = "chat.tools.terminal.enableAutoApprove";
    TerminalChatAgentToolsSettingId["AutoApprove"] = "chat.tools.terminal.autoApprove";
    TerminalChatAgentToolsSettingId["AutoApproveWorkspaceNpmScripts"] = "chat.tools.terminal.autoApproveWorkspaceNpmScripts";
    TerminalChatAgentToolsSettingId["IgnoreDefaultAutoApproveRules"] = "chat.tools.terminal.ignoreDefaultAutoApproveRules";
    TerminalChatAgentToolsSettingId["BlockDetectedFileWrites"] = "chat.tools.terminal.blockDetectedFileWrites";
    TerminalChatAgentToolsSettingId["ShellIntegrationTimeout"] = "chat.tools.terminal.shellIntegrationTimeout";
    TerminalChatAgentToolsSettingId["AutoReplyToPrompts"] = "chat.tools.terminal.autoReplyToPrompts";
    TerminalChatAgentToolsSettingId["OutputLocation"] = "chat.tools.terminal.outputLocation";
    TerminalChatAgentToolsSettingId["TerminalSandboxEnabled"] = "chat.tools.terminal.sandbox.enabled";
    TerminalChatAgentToolsSettingId["TerminalSandboxNetwork"] = "chat.tools.terminal.sandbox.network";
    TerminalChatAgentToolsSettingId["TerminalSandboxLinuxFileSystem"] = "chat.tools.terminal.sandbox.linuxFileSystem";
    TerminalChatAgentToolsSettingId["TerminalSandboxMacFileSystem"] = "chat.tools.terminal.sandbox.macFileSystem";
    TerminalChatAgentToolsSettingId["PreventShellHistory"] = "chat.tools.terminal.preventShellHistory";
    TerminalChatAgentToolsSettingId["EnforceTimeoutFromModel"] = "chat.tools.terminal.enforceTimeoutFromModel";
    TerminalChatAgentToolsSettingId["TerminalProfileLinux"] = "chat.tools.terminal.terminalProfile.linux";
    TerminalChatAgentToolsSettingId["TerminalProfileMacOs"] = "chat.tools.terminal.terminalProfile.osx";
    TerminalChatAgentToolsSettingId["TerminalProfileWindows"] = "chat.tools.terminal.terminalProfile.windows";
    TerminalChatAgentToolsSettingId["DeprecatedAutoApproveCompatible"] = "chat.agent.terminal.autoApprove";
    TerminalChatAgentToolsSettingId["DeprecatedAutoApprove1"] = "chat.agent.terminal.allowList";
    TerminalChatAgentToolsSettingId["DeprecatedAutoApprove2"] = "chat.agent.terminal.denyList";
    TerminalChatAgentToolsSettingId["DeprecatedAutoApprove3"] = "github.copilot.chat.agent.terminal.allowList";
    TerminalChatAgentToolsSettingId["DeprecatedAutoApprove4"] = "github.copilot.chat.agent.terminal.denyList";
})(TerminalChatAgentToolsSettingId || (TerminalChatAgentToolsSettingId = {}));
const autoApproveBoolean = {
    type: 'boolean',
    enum: [
        true,
        false,
    ],
    enumDescriptions: [
        localize(15992, null),
        localize(15993, null),
    ],
    description: localize(15994, null),
};
const terminalChatAgentProfileSchema = {
    type: 'object',
    required: ['path'],
    properties: {
        path: {
            description: localize(15995, null),
            type: 'string',
        },
        ...terminalProfileBaseProperties,
    }
};
export const terminalChatAgentToolsConfiguration = {
    ["chat.tools.terminal.enableAutoApprove" /* TerminalChatAgentToolsSettingId.EnableAutoApprove */]: {
        description: localize(15996, null),
        type: 'boolean',
        default: true,
        policy: {
            name: 'ChatToolsTerminalEnableAutoApprove',
            category: PolicyCategory.IntegratedTerminal,
            minimumVersion: '1.104',
            localization: {
                description: {
                    key: 'autoApproveMode.description',
                    value: localize(15997, null),
                }
            }
        }
    },
    ["chat.tools.terminal.autoApprove" /* TerminalChatAgentToolsSettingId.AutoApprove */]: {
        markdownDescription: [
            localize(15998, null, '`/`', '`i`'),
            localize(15999, null, '`true`', '`false`', '`null`'),
            localize(16000, null, '`foo && bar`', '`foo`', '`bar`', '`true`', '`false`', '`<(foo)`'),
            localize(16001, null, '`{ approve: false, matchCommandLine: true }`'),
            localize(16002, null, `\`#${"chat.tools.terminal.ignoreDefaultAutoApproveRules" /* TerminalChatAgentToolsSettingId.IgnoreDefaultAutoApproveRules */}#\``, '`true`'),
            [
                localize(16003, null),
                `|${localize(16004, null)}|${localize(16005, null)}|`,
                '|---|---|',
                '| `\"mkdir\": true` | ' + localize(16006, null, '`mkdir`'),
                '| `\"npm run build\": true` | ' + localize(16007, null, '`npm run build`'),
                '| `\"bin/test.sh\": true` | ' + localize(16008, null, '`bin/test.sh`', '`bin\\test.sh`', '`./bin/test.sh`'),
                '| `\"/^git (status\\|show\\\\b.*)$/\": true` | ' + localize(16009, null, '`git status`', '`git show`'),
                '| `\"/^Get-ChildItem\\\\b/i\": true` | ' + localize(16010, null, '`Get-ChildItem`'),
                '| `\"/.*/\": true` | ' + localize(16011, null),
                '| `\"rm\": false` | ' + localize(16012, null, '`rm`'),
                '| `\"/\\\\.ps1/i\": { approve: false, matchCommandLine: true }` | ' + localize(16013, null, '`".ps1"`'),
                '| `\"rm\": null` | ' + localize(16014, null, '`false`', '`rm`'),
            ].join('\n'),
        ].join('\n\n'),
        type: 'object',
        additionalProperties: {
            anyOf: [
                autoApproveBoolean,
                {
                    type: 'object',
                    properties: {
                        approve: autoApproveBoolean,
                        matchCommandLine: {
                            type: 'boolean',
                            enum: [
                                true,
                                false,
                            ],
                            enumDescriptions: [
                                localize(16015, null),
                                localize(16016, null),
                            ],
                            description: localize(16017, null),
                        }
                    },
                    required: ['approve']
                },
                {
                    type: 'null',
                    description: localize(16018, null),
                },
            ]
        },
        default: {
            // This is the default set of terminal auto approve commands. Note that these are best
            // effort and do not aim to provide exhaustive coverage to prevent dangerous commands
            // from executing as that is simply not feasible. Workspace trust and warnings of
            // possible prompt injection are _the_ thing protecting the user in agent mode, once
            // that trust boundary has been breached all bets are off as trusting a workspace that
            // contains anything malicious has already compromised the machine.
            //
            // Instead, the focus here is to unblock the user from approving clearly safe commands
            // frequently and cover common edge cases that could arise from the user auto-approving
            // commands.
            //
            // Take for example `find` which looks innocuous and most users are likely to auto
            // approve future calls when offered. However, the `-exec` argument can run anything. So
            // instead of leaving this decision up to the user we provide relatively safe defaults
            // and block common edge cases. So offering these default rules, despite their flaws, is
            // likely to protect the user more in general than leaving everything up to them (plus
            // make agent mode more convenient).
            // #region Safe commands
            //
            // Generally safe and common readonly commands
            cd: true,
            echo: true,
            ls: true,
            dir: true,
            pwd: true,
            cat: true,
            head: true,
            tail: true,
            findstr: true,
            wc: true,
            tr: true,
            cut: true,
            cmp: true,
            which: true,
            basename: true,
            dirname: true,
            realpath: true,
            readlink: true,
            stat: true,
            file: true,
            od: true,
            du: true,
            df: true,
            sleep: true,
            nl: true,
            // grep
            // - Variable
            // - `-f`: Read patterns from file, this is an acceptable risk since you can do similar
            //   with cat
            // - `-P`: PCRE risks include denial of service (memory exhaustion, catastrophic
            //   backtracking) which could lock up the terminal. Older PCRE versions allow code
            //   execution via this flag but this has been patched with CVEs.
            // - Variable injection is possible, but requires setting a variable which would need
            //   manual approval.
            grep: true,
            // #endregion
            // #region Safe sub-commands
            //
            // Safe and common sub-commands
            // Note: These patterns support `-C <path>` and `--no-pager` immediately after `git`
            '/^git(\\s+(-C\\s+\\S+|--no-pager))*\\s+status\\b/': true,
            '/^git(\\s+(-C\\s+\\S+|--no-pager))*\\s+log\\b/': true,
            '/^git(\\s+(-C\\s+\\S+|--no-pager))*\\s+log\\b.*\\s--output(=|\\s|$)/': false,
            '/^git(\\s+(-C\\s+\\S+|--no-pager))*\\s+show\\b/': true,
            '/^git(\\s+(-C\\s+\\S+|--no-pager))*\\s+diff\\b/': true,
            '/^git(\\s+(-C\\s+\\S+|--no-pager))*\\s+ls-files\\b/': true,
            // git grep
            // - `--open-files-in-pager`: This is the configured pager, so no risk of code execution
            // - See notes on `grep`
            '/^git(\\s+(-C\\s+\\S+|--no-pager))*\\s+grep\\b/': true,
            // git branch
            // - `-d`, `-D`, `--delete`: Prevent branch deletion
            // - `-m`, `-M`: Prevent branch renaming
            // - `--force`: Generally dangerous
            '/^git(\\s+(-C\\s+\\S+|--no-pager))*\\s+branch\\b/': true,
            '/^git(\\s+(-C\\s+\\S+|--no-pager))*\\s+branch\\b.*\\s-(d|D|m|M|-delete|-force)\\b/': false,
            // docker - readonly sub-commands
            '/^docker\\s+(ps|images|info|version|inspect|logs|top|stats|port|diff|search|events)\\b/': true,
            '/^docker\\s+(container|image|network|volume|context|system)\\s+(ls|ps|inspect|history|show|df|info)\\b/': true,
            '/^docker\\s+compose\\s+(ps|ls|top|logs|images|config|version|port|events)\\b/': true,
            // #endregion
            // #region PowerShell
            'Get-ChildItem': true,
            'Get-Content': true,
            'Get-Date': true,
            'Get-Random': true,
            'Get-Location': true,
            'Set-Location': true,
            'Write-Host': true,
            'Write-Output': true,
            'Out-String': true,
            'Split-Path': true,
            'Join-Path': true,
            'Start-Sleep': true,
            'Where-Object': true,
            // Blanket approval of safe verbs
            '/^Select-[a-z0-9]/i': true,
            '/^Measure-[a-z0-9]/i': true,
            '/^Compare-[a-z0-9]/i': true,
            '/^Format-[a-z0-9]/i': true,
            '/^Sort-[a-z0-9]/i': true,
            // #endregion
            // #region Package managers (npm, yarn, pnpm)
            //
            // Read-only commands that don't modify files or execute arbitrary code.
            // npm read-only commands
            '/^npm\\s+(ls|list|outdated|view|info|show|explain|why|root|prefix|bin|search|doctor|fund|repo|bugs|docs|home|help(-search)?)\\b/': true,
            '/^npm\\s+config\\s+(list|get)\\b/': true,
            '/^npm\\s+pkg\\s+get\\b/': true,
            '/^npm\\s+audit$/': true,
            '/^npm\\s+cache\\s+verify\\b/': true,
            // yarn read-only commands
            '/^yarn\\s+(list|outdated|info|why|bin|help|versions)\\b/': true,
            '/^yarn\\s+licenses\\b/': true,
            '/^yarn\\s+audit\\b(?!.*\\bfix\\b)/': true,
            '/^yarn\\s+config\\s+(list|get)\\b/': true,
            '/^yarn\\s+cache\\s+dir\\b/': true,
            // pnpm read-only commands
            '/^pnpm\\s+(ls|list|outdated|why|root|bin|doctor)\\b/': true,
            '/^pnpm\\s+licenses\\b/': true,
            '/^pnpm\\s+audit\\b(?!.*\\bfix\\b)/': true,
            '/^pnpm\\s+config\\s+(list|get)\\b/': true,
            // Safe lockfile-only installs since we trust the workspace and lock file is trusted.
            'npm ci': true,
            '/^yarn\\s+install\\s+--frozen-lockfile\\b/': true,
            '/^pnpm\\s+install\\s+--frozen-lockfile\\b/': true,
            // #endregion
            // #region Safe + disabled args
            //
            // Commands that are generally allowed with special cases we block. Note that shell
            // expansion is handled by the inline command detection when parsing sub-commands.
            // column
            // - `-c`: We block excessive columns that could lead to memory exhaustion.
            column: true,
            '/^column\\b.*\\s-c\\s+[0-9]{4,}/': false,
            // date
            // -s|--set: Sets the system clock
            date: true,
            '/^date\\b.*\\s(-s|--set)\\b/': false,
            // find
            // - `-delete`: Deletes files or directories.
            // - `-exec`/`-execdir`: Execute on results.
            // - `-fprint`/`fprintf`/`fls`: Writes files.
            // - `-ok`/`-okdir`: Like exec but with a confirmation.
            find: true,
            '/^find\\b.*\\s-(delete|exec|execdir|fprint|fprintf|fls|ok|okdir)\\b/': false,
            // rg (ripgrep)
            // - `--pre`: Executes arbitrary command as preprocessor for every file searched.
            // - `--hostname-bin`: Executes arbitrary command to get hostname.
            rg: true,
            '/^rg\\b.*\\s(--pre|--hostname-bin)\\b/': false,
            // sed
            // - `-e`/`--expression`: Add the commands in script to the set of commands to be run
            //   while processing the input.
            // - `-f`/`--file`: Add the commands contained in the file script-file to the set of
            //   commands to be run while processing the input.
            // - `w`/`W` commands: Write to files (blocked by `-i` check + agent typically won't use).
            // - `s///e` flag: Executes substitution result as shell command
            // - `s///w` flag: Write substitution result to file
            // - `;W` Write first line of pattern space to file
            // - Note that `--sandbox` exists which blocks unsafe commands that could potentially be
            //   leveraged to auto approve
            // - In-place editing (`-i`, `-I`, `--in-place`) is detected and blocked via file write
            //   detection if necessary
            sed: true,
            '/^sed\\b.*\\s(-[a-zA-Z]*(e|f)[a-zA-Z]*|--expression|--file)\\b/': false,
            '/^sed\\b.*s\\/.*\\/.*\\/[ew]/': false,
            '/^sed\\b.*;W/': false,
            // sort
            // - `-o`: Output redirection can write files (`sort -o /etc/something file`) which are
            //   blocked currently
            // - `-S`: Memory exhaustion is possible (`sort -S 100G file`), we allow possible denial
            //   of service.
            sort: true,
            '/^sort\\b.*\\s-(o|S)\\b/': false,
            // tree
            // - `-o`: Output redirection can write files (`tree -o /etc/something file`) which are
            //   blocked currently
            tree: true,
            '/^tree\\b.*\\s-o\\b/': false,
            // xxd
            // - Only allow flags and a single input file as it's difficult to parse the outfile
            //   positional argument safely.
            '/^xxd$/': true,
            '/^xxd\\b(\\s+-\\S+)*\\s+[^-\\s]\\S*$/': true,
            // #endregion
            // #region Dangerous commands
            //
            // There are countless dangerous commands available on the command line, the defaults
            // here include common ones that the user is likely to want to explicitly approve first.
            // This is not intended to be a catch all as the user needs to opt-in to auto-approve
            // commands, it provides some additional safety when the commands get approved by overly
            // broad user/workspace rules.
            // Deleting files
            rm: false,
            rmdir: false,
            del: false,
            'Remove-Item': false,
            ri: false,
            rd: false,
            erase: false,
            dd: false,
            // Managing/killing processes, dangerous thing to do generally
            kill: false,
            ps: false,
            top: false,
            'Stop-Process': false,
            spps: false,
            taskkill: false,
            'taskkill.exe': false,
            // Web requests, prompt injection concerns
            curl: false,
            wget: false,
            'Invoke-RestMethod': false,
            'Invoke-WebRequest': false,
            'irm': false,
            'iwr': false,
            // File permissions and ownership, messing with these can cause hard to diagnose issues
            chmod: false,
            chown: false,
            'Set-ItemProperty': false,
            'sp': false,
            'Set-Acl': false,
            // General eval/command execution, can lead to anything else running
            jq: false,
            xargs: false,
            eval: false,
            'Invoke-Expression': false,
            iex: false,
            // #endregion
        },
    },
    ["chat.tools.terminal.ignoreDefaultAutoApproveRules" /* TerminalChatAgentToolsSettingId.IgnoreDefaultAutoApproveRules */]: {
        type: 'boolean',
        default: false,
        tags: ['experimental'],
        markdownDescription: localize(16019, null, `\`#${"chat.tools.terminal.autoApprove" /* TerminalChatAgentToolsSettingId.AutoApprove */}#\``),
    },
    ["chat.tools.terminal.autoApproveWorkspaceNpmScripts" /* TerminalChatAgentToolsSettingId.AutoApproveWorkspaceNpmScripts */]: {
        restricted: true,
        type: 'boolean',
        // In order to use agent mode the workspace must be trusted, this plus the fact that
        // modifying package.json is protected means this is safe to enable by default.
        default: true,
        tags: ['experimental'],
        markdownDescription: localize(16020, null),
    },
    ["chat.tools.terminal.blockDetectedFileWrites" /* TerminalChatAgentToolsSettingId.BlockDetectedFileWrites */]: {
        type: 'string',
        enum: ['never', 'outsideWorkspace', 'all'],
        enumDescriptions: [
            localize(16021, null),
            localize(16022, null),
            localize(16023, null),
        ],
        default: 'outsideWorkspace',
        tags: ['experimental'],
        markdownDescription: localize(16024, null),
    },
    ["chat.tools.terminal.shellIntegrationTimeout" /* TerminalChatAgentToolsSettingId.ShellIntegrationTimeout */]: {
        markdownDescription: localize(16025, null, `\`#${"terminal.integrated.shellIntegration.enabled" /* TerminalSettingId.ShellIntegrationEnabled */}#\``),
        type: 'integer',
        minimum: -1,
        maximum: 60000,
        default: -1,
        markdownDeprecationMessage: localize(16026, null, `\`#${"terminal.integrated.shellIntegration.timeout" /* TerminalSettingId.ShellIntegrationTimeout */}#\``)
    },
    ["chat.tools.terminal.terminalProfile.linux" /* TerminalChatAgentToolsSettingId.TerminalProfileLinux */]: {
        restricted: true,
        markdownDescription: localize(16027, null),
        type: ['object', 'null'],
        default: null,
        'anyOf': [
            { type: 'null' },
            terminalChatAgentProfileSchema
        ],
        defaultSnippets: [
            {
                body: {
                    path: '${1}'
                }
            }
        ]
    },
    ["chat.tools.terminal.terminalProfile.osx" /* TerminalChatAgentToolsSettingId.TerminalProfileMacOs */]: {
        restricted: true,
        markdownDescription: localize(16028, null),
        type: ['object', 'null'],
        default: null,
        'anyOf': [
            { type: 'null' },
            terminalChatAgentProfileSchema
        ],
        defaultSnippets: [
            {
                body: {
                    path: '${1}'
                }
            }
        ]
    },
    ["chat.tools.terminal.terminalProfile.windows" /* TerminalChatAgentToolsSettingId.TerminalProfileWindows */]: {
        restricted: true,
        markdownDescription: localize(16029, null),
        type: ['object', 'null'],
        default: null,
        'anyOf': [
            { type: 'null' },
            terminalChatAgentProfileSchema
        ],
        defaultSnippets: [
            {
                body: {
                    path: '${1}'
                }
            }
        ]
    },
    ["chat.tools.terminal.autoReplyToPrompts" /* TerminalChatAgentToolsSettingId.AutoReplyToPrompts */]: {
        type: 'boolean',
        default: false,
        tags: ['experimental'],
        markdownDescription: localize(16030, null),
    },
    ["chat.tools.terminal.outputLocation" /* TerminalChatAgentToolsSettingId.OutputLocation */]: {
        markdownDescription: localize(16031, null),
        type: 'string',
        enum: ['terminal', 'chat'],
        enumDescriptions: [
            localize(16032, null),
            localize(16033, null),
        ],
        default: 'chat',
        tags: ['experimental'],
        experiment: {
            mode: 'auto'
        }
    },
    ["chat.tools.terminal.sandbox.enabled" /* TerminalChatAgentToolsSettingId.TerminalSandboxEnabled */]: {
        markdownDescription: localize(16034, null),
        type: 'boolean',
        default: false,
        tags: ['preview'],
        restricted: true,
        experiment: {
            mode: 'auto'
        }
    },
    ["chat.tools.terminal.sandbox.network" /* TerminalChatAgentToolsSettingId.TerminalSandboxNetwork */]: {
        markdownDescription: localize(16035, null, `\`#${"chat.tools.terminal.sandbox.enabled" /* TerminalChatAgentToolsSettingId.TerminalSandboxEnabled */}#\``),
        type: 'object',
        properties: {
            allowedDomains: {
                type: 'array',
                description: localize(16036, null, '`*.example.com`'),
                items: { type: 'string' },
                default: []
            },
            deniedDomains: {
                type: 'array',
                description: localize(16037, null),
                items: { type: 'string' },
                default: []
            },
            allowTrustedDomains: {
                type: 'boolean',
                description: localize(16038, null),
                default: false
            }
        },
        default: {
            allowedDomains: [],
            deniedDomains: [],
            allowTrustedDomains: false
        },
        tags: ['preview'],
        restricted: true,
    },
    ["chat.tools.terminal.sandbox.linuxFileSystem" /* TerminalChatAgentToolsSettingId.TerminalSandboxLinuxFileSystem */]: {
        markdownDescription: localize(16039, null, `\`#${"chat.tools.terminal.sandbox.enabled" /* TerminalChatAgentToolsSettingId.TerminalSandboxEnabled */}#\``),
        type: 'object',
        properties: {
            denyRead: {
                type: 'array',
                description: localize(16040, null),
                items: { type: 'string' },
                default: []
            },
            allowWrite: {
                type: 'array',
                description: localize(16041, null),
                items: { type: 'string' },
                default: ['.']
            },
            denyWrite: {
                type: 'array',
                description: localize(16042, null),
                items: { type: 'string' },
                default: []
            }
        },
        default: {
            denyRead: [],
            allowWrite: ['.'],
            denyWrite: []
        },
        tags: ['preview'],
        restricted: true,
    },
    ["chat.tools.terminal.sandbox.macFileSystem" /* TerminalChatAgentToolsSettingId.TerminalSandboxMacFileSystem */]: {
        markdownDescription: localize(16043, null, `\`#${"chat.tools.terminal.sandbox.enabled" /* TerminalChatAgentToolsSettingId.TerminalSandboxEnabled */}#\``),
        type: 'object',
        properties: {
            denyRead: {
                type: 'array',
                description: localize(16044, null),
                items: { type: 'string' },
                default: []
            },
            allowWrite: {
                type: 'array',
                description: localize(16045, null),
                items: { type: 'string' },
                default: ['.']
            },
            denyWrite: {
                type: 'array',
                description: localize(16046, null),
                items: { type: 'string' },
                default: []
            }
        },
        default: {
            denyRead: [],
            allowWrite: ['.'],
            denyWrite: []
        },
        tags: ['preview'],
        restricted: true,
    },
    ["chat.tools.terminal.preventShellHistory" /* TerminalChatAgentToolsSettingId.PreventShellHistory */]: {
        type: 'boolean',
        default: true,
        markdownDescription: [
            localize(16047, null),
            `- \`bash\`: ${localize(16048, null)}`,
            `- \`zsh\`: ${localize(16049, null)}`,
            `- \`fish\`: ${localize(16050, null)}`,
            `- \`pwsh\`: ${localize(16051, null)}`,
        ].join('\n'),
    },
    ["chat.tools.terminal.enforceTimeoutFromModel" /* TerminalChatAgentToolsSettingId.EnforceTimeoutFromModel */]: {
        restricted: true,
        type: 'boolean',
        default: true,
        tags: ['experimental'],
        experiment: {
            mode: 'auto'
        },
        markdownDescription: localize(16052, null),
    }
};
for (const id of [
    "chat.agent.terminal.allowList" /* TerminalChatAgentToolsSettingId.DeprecatedAutoApprove1 */,
    "chat.agent.terminal.denyList" /* TerminalChatAgentToolsSettingId.DeprecatedAutoApprove2 */,
    "github.copilot.chat.agent.terminal.allowList" /* TerminalChatAgentToolsSettingId.DeprecatedAutoApprove3 */,
    "github.copilot.chat.agent.terminal.denyList" /* TerminalChatAgentToolsSettingId.DeprecatedAutoApprove4 */,
    "chat.agent.terminal.autoApprove" /* TerminalChatAgentToolsSettingId.DeprecatedAutoApproveCompatible */,
]) {
    terminalChatAgentToolsConfiguration[id] = {
        deprecated: true,
        markdownDeprecationMessage: localize(16053, null, `\`#${"chat.tools.terminal.autoApprove" /* TerminalChatAgentToolsSettingId.AutoApprove */}#\``)
    };
}
//# sourceMappingURL=terminalChatAgentToolsConfiguration.js.map