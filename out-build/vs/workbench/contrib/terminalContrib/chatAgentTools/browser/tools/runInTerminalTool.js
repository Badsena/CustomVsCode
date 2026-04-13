/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var RunInTerminalTool_1;
import { DeferredPromise, timeout } from '../../../../../../base/common/async.js';
import { CancellationTokenSource } from '../../../../../../base/common/cancellation.js';
import { Codicon } from '../../../../../../base/common/codicons.js';
import { CancellationError } from '../../../../../../base/common/errors.js';
import { Event } from '../../../../../../base/common/event.js';
import { escapeMarkdownSyntaxTokens, MarkdownString } from '../../../../../../base/common/htmlContent.js';
import { Disposable, DisposableStore, MutableDisposable } from '../../../../../../base/common/lifecycle.js';
import { ResourceMap } from '../../../../../../base/common/map.js';
import { getMediaMime } from '../../../../../../base/common/mime.js';
import { basename, posix, win32 } from '../../../../../../base/common/path.js';
import { OS } from '../../../../../../base/common/platform.js';
import { count } from '../../../../../../base/common/strings.js';
import { generateUuid } from '../../../../../../base/common/uuid.js';
import { localize } from '../../../../../../nls.js';
import { IConfigurationService } from '../../../../../../platform/configuration/common/configuration.js';
import { IFileService } from '../../../../../../platform/files/common/files.js';
import { IInstantiationService } from '../../../../../../platform/instantiation/common/instantiation.js';
import { ILabelService } from '../../../../../../platform/label/common/label.js';
import { IStorageService } from '../../../../../../platform/storage/common/storage.js';
import { ITerminalLogService } from '../../../../../../platform/terminal/common/terminal.js';
import { IRemoteAgentService } from '../../../../../services/remote/common/remoteAgentService.js';
import { IChatService } from '../../../../chat/common/chatService/chatService.js';
import { ILanguageModelToolsService, ToolDataSource, ToolInvocationPresentation } from '../../../../chat/common/tools/languageModelToolsService.js';
import { ITerminalChatService, ITerminalService } from '../../../../terminal/browser/terminal.js';
import { ITerminalProfileResolverService } from '../../../../terminal/common/terminal.js';
import { getRecommendedToolsOverRunInTerminal } from '../alternativeRecommendation.js';
import { BasicExecuteStrategy } from '../executeStrategy/basicExecuteStrategy.js';
import { NoneExecuteStrategy } from '../executeStrategy/noneExecuteStrategy.js';
import { RichExecuteStrategy } from '../executeStrategy/richExecuteStrategy.js';
import { getOutput } from '../outputHelpers.js';
import { extractCdPrefix, isFish, isPowerShell, isWindowsPowerShell, isZsh, normalizeTerminalCommandForDisplay } from '../runInTerminalHelpers.js';
import { NodeCommandLinePresenter } from './commandLinePresenter/nodeCommandLinePresenter.js';
import { PythonCommandLinePresenter } from './commandLinePresenter/pythonCommandLinePresenter.js';
import { RubyCommandLinePresenter } from './commandLinePresenter/rubyCommandLinePresenter.js';
import { SandboxedCommandLinePresenter } from './commandLinePresenter/sandboxedCommandLinePresenter.js';
import { RunInTerminalToolTelemetry } from '../runInTerminalToolTelemetry.js';
import { ToolTerminalCreator } from '../toolTerminalCreator.js';
import { TreeSitterCommandParser } from '../treeSitterCommandParser.js';
import { CommandLineAutoApproveAnalyzer } from './commandLineAnalyzer/commandLineAutoApproveAnalyzer.js';
import { CommandLineFileWriteAnalyzer } from './commandLineAnalyzer/commandLineFileWriteAnalyzer.js';
import { CommandLineSandboxAnalyzer } from './commandLineAnalyzer/commandLineSandboxAnalyzer.js';
import { OutputMonitor } from './monitoring/outputMonitor.js';
import { OutputMonitorState } from './monitoring/types.js';
import { chatSessionResourceToId, LocalChatSessionUri } from '../../../../chat/common/model/chatUri.js';
import { URI } from '../../../../../../base/common/uri.js';
import { CommandLineCdPrefixRewriter } from './commandLineRewriter/commandLineCdPrefixRewriter.js';
import { CommandLinePreventHistoryRewriter } from './commandLineRewriter/commandLinePreventHistoryRewriter.js';
import { CommandLinePwshChainOperatorRewriter } from './commandLineRewriter/commandLinePwshChainOperatorRewriter.js';
import { CommandLineSandboxRewriter } from './commandLineRewriter/commandLineSandboxRewriter.js';
import { IWorkspaceContextService } from '../../../../../../platform/workspace/common/workspace.js';
import { IHistoryService } from '../../../../../services/history/common/history.js';
import { TerminalCommandArtifactCollector } from './terminalCommandArtifactCollector.js';
import { isNumber, isString } from '../../../../../../base/common/types.js';
import { ChatConfiguration, isAutoApproveLevel } from '../../../../chat/common/constants.js';
import { IChatWidgetService } from '../../../../chat/browser/chat.js';
import { clamp } from '../../../../../../base/common/numbers.js';
import { SandboxOutputAnalyzer } from './sandboxOutputAnalyzer.js';
import { IAgentSessionsService } from '../../../../chat/browser/agentSessions/agentSessionsService.js';
import { ITerminalSandboxService } from '../../common/terminalSandboxService.js';
// #region Tool data
const TOOL_REFERENCE_NAME = 'runInTerminal';
const LEGACY_TOOL_REFERENCE_FULL_NAMES = ['runCommands/runInTerminal'];
function createPowerShellModelDescription(shell) {
    const isWinPwsh = isWindowsPowerShell(shell);
    return [
        `This tool allows you to execute ${isWinPwsh ? 'Windows PowerShell 5.1' : 'PowerShell'} commands in a persistent terminal session, preserving environment variables, working directory, and other context across multiple commands.`,
        '',
        'Command Execution:',
        // IMPORTANT: PowerShell 5 does not support `&&` so always re-write them to `;`. Note that
        // the behavior of `&&` differs a little from `;` but in general it's fine
        isWinPwsh ? '- Use semicolons ; to chain commands on one line, NEVER use && even when asked explicitly' : '- Prefer ; when chaining commands on one line',
        '- Prefer pipelines | for object-based data flow',
        '- Never create a sub-shell (eg. powershell -c "command") unless explicitly asked',
        '',
        'Directory Management:',
        '- Prefer relative paths when navigating directories, only use absolute when the path is far away or the current cwd is not expected',
        '- Remember when isBackground=false is specified, that the shell and cwd are reused until it is moved to the background',
        '- Use $PWD or Get-Location for current directory',
        '- Use Push-Location/Pop-Location for directory stack',
        '',
        'Program Execution:',
        '- Supports .NET, Python, Node.js, and other executables',
        '- Install modules via Install-Module, Install-Package',
        '- Use Get-Command to verify cmdlet/function availability',
        '',
        'Background Processes:',
        '- For long-running tasks (e.g., servers), set isBackground=true',
        '- Returns a terminal ID for checking status and runtime later',
        '- Use Start-Job for background PowerShell jobs',
        '',
        'Output Management:',
        '- Output is automatically truncated if longer than 60KB to prevent context overflow',
        '- Use Select-Object, Where-Object, Format-Table to filter output',
        '- Use -First/-Last parameters to limit results',
        '- For pager commands, add | Out-String or | Format-List',
        '',
        'Best Practices:',
        '- Use proper cmdlet names instead of aliases in scripts',
        '- Quote paths with spaces: "C:\\Path With Spaces"',
        '- Prefer PowerShell cmdlets over external commands when available',
        '- Prefer idiomatic PowerShell like Get-ChildItem instead of dir or ls for file listings',
        '- Use Test-Path to check file/directory existence',
        '- Be specific with Select-Object properties to avoid excessive output',
        '- Avoid printing credentials unless absolutely required',
    ].join('\n');
}
function createGenericDescription(isSandboxEnabled) {
    const parts = [`
Command Execution:
- Use && to chain simple commands on one line
- Prefer pipelines | over temporary files for data flow
- Never create a sub-shell (eg. bash -c "command") unless explicitly asked

Directory Management:
- Prefer relative paths when navigating directories, only use absolute when the path is far away or the current cwd is not expected
- Remember when isBackground=false is specified, that shell and cwd is reused until it is moved to the background
- Use $PWD for current directory references
- Consider using pushd/popd for directory stack management
- Supports directory shortcuts like ~ and -

Program Execution:
- Supports Python, Node.js, and other executables
- Install packages via package managers (brew, apt, etc.)
- Use which or command -v to verify command availability

Background Processes:
- For long-running tasks (e.g., servers), set isBackground=true
- Returns a terminal ID for checking status and runtime later`];
    if (isSandboxEnabled) {
        parts.push(`
Sandboxing:
- ATTENTION: Terminal sandboxing is enabled, commands run in a sandbox by default
- When a command fails due to sandbox restrictions, immediately re-run it with requestUnsandboxedExecution=true and prompt the user to bypass the sandbox
- Only set requestUnsandboxedExecution=true when there is evidence of failures caused by the sandbox, e.g. 'Operation not permitted' errors, network failures, or file access errors, etc
- When setting requestUnsandboxedExecution=true, also provide requestUnsandboxedExecutionReason; the user will be prompted before it runs unsandboxed`);
    }
    parts.push(`

Output Management:
- Output is automatically truncated if longer than 60KB to prevent context overflow
- Use head, tail, grep, awk to filter and limit output size
- For pager commands, disable paging: git --no-pager or add | cat
- Use wc -l to count lines before displaying large outputs

Best Practices:
- Quote variables: "$var" instead of $var to handle spaces
- Use find with -exec or xargs for file operations
- Be specific with commands to avoid excessive output
- Avoid printing credentials unless absolutely required`);
    return parts.join('');
}
function createBashModelDescription(isSandboxEnabled) {
    return [
        'This tool allows you to execute shell commands in a persistent bash terminal session, preserving environment variables, working directory, and other context across multiple commands.',
        createGenericDescription(isSandboxEnabled),
        '- Use [[ ]] for conditional tests instead of [ ]',
        '- Prefer $() over backticks for command substitution',
        '- Use set -e at start of complex commands to exit on errors'
    ].join('\n');
}
function createZshModelDescription(isSandboxEnabled) {
    return [
        'This tool allows you to execute shell commands in a persistent zsh terminal session, preserving environment variables, working directory, and other context across multiple commands.',
        createGenericDescription(isSandboxEnabled),
        '- Use type to check command type (builtin, function, alias)',
        '- Use jobs, fg, bg for job control',
        '- Use [[ ]] for conditional tests instead of [ ]',
        '- Prefer $() over backticks for command substitution',
        '- Use setopt errexit for strict error handling',
        '- Take advantage of zsh globbing features (**, extended globs)'
    ].join('\n');
}
function createFishModelDescription(isSandboxEnabled) {
    return [
        'This tool allows you to execute shell commands in a persistent fish terminal session, preserving environment variables, working directory, and other context across multiple commands.',
        createGenericDescription(isSandboxEnabled),
        '- Use type to check command type (builtin, function, alias)',
        '- Use jobs, fg, bg for job control',
        '- Use test expressions for conditionals (no [[ ]] syntax)',
        '- Prefer command substitution with () syntax',
        '- Variables are arrays by default, use $var[1] for first element',
        '- Use set -e for strict error handling',
        '- Take advantage of fish\'s autosuggestions and completions'
    ].join('\n');
}
export async function createRunInTerminalToolData(accessor) {
    const instantiationService = accessor.get(IInstantiationService);
    const terminalSandboxService = accessor.get(ITerminalSandboxService);
    const profileFetcher = instantiationService.createInstance(TerminalProfileFetcher);
    const [shell, os, isSandboxEnabled] = await Promise.all([
        profileFetcher.getCopilotShell(),
        profileFetcher.osBackend,
        terminalSandboxService.isEnabled(),
    ]);
    let modelDescription;
    if (shell && os && isPowerShell(shell, os)) {
        modelDescription = createPowerShellModelDescription(shell);
    }
    else if (shell && os && isZsh(shell, os)) {
        modelDescription = createZshModelDescription(isSandboxEnabled);
    }
    else if (shell && os && isFish(shell, os)) {
        modelDescription = createFishModelDescription(isSandboxEnabled);
    }
    else {
        modelDescription = createBashModelDescription(isSandboxEnabled);
    }
    return {
        id: "run_in_terminal" /* TerminalToolId.RunInTerminal */,
        toolReferenceName: TOOL_REFERENCE_NAME,
        legacyToolReferenceFullNames: LEGACY_TOOL_REFERENCE_FULL_NAMES,
        displayName: localize(15931, null),
        modelDescription,
        userDescription: localize(15932, null),
        source: ToolDataSource.Internal,
        icon: Codicon.terminal,
        inputSchema: {
            type: 'object',
            properties: {
                command: {
                    type: 'string',
                    description: 'The command to run in the terminal.'
                },
                explanation: {
                    type: 'string',
                    description: 'A one-sentence description of what the command does. This will be shown to the user before the command is run.'
                },
                goal: {
                    type: 'string',
                    description: 'A short description of the goal or purpose of the command (e.g., "Install dependencies", "Start development server").'
                },
                isBackground: {
                    type: 'boolean',
                    description: `Whether the command starts a background process.\n\n- If true, a new shell will be spawned where the cwd is the workspace directory and will run asynchronously in the background and you will not see the output.\n\n- If false, a single shell is shared between all non-background terminals where the cwd starts at the workspace directory and is remembered until that terminal is moved to the background, the tool call will block on the command finishing and only then you will get the output.\n\nExamples of background processes: building in watch mode, starting a server. You can check the output of a background process later on by using ${"get_terminal_output" /* TerminalToolId.GetTerminalOutput */}.`
                },
                timeout: {
                    type: 'number',
                    description: 'An optional timeout in milliseconds. When provided, the tool will stop tracking the command after this duration and return the output collected so far with a timeout indicator. Be conservative with the timeout duration, give enough time that the command would complete on a low-end machine. Use 0 for no timeout. If it\'s not clear how long the command will take then use 0 to avoid prematurely terminating it, never guess too low.',
                },
                ...isSandboxEnabled ? {
                    requestUnsandboxedExecution: {
                        type: 'boolean',
                        description: 'Request that this command run outside the terminal sandbox. Only set this when the command clearly needs unsandboxed access. The user will be prompted before the command runs unsandboxed.'
                    },
                    requestUnsandboxedExecutionReason: {
                        type: 'string',
                        description: 'A short explanation of why this command must run outside the terminal sandbox. Only provide this when requestUnsandboxedExecution is true.'
                    },
                } : {},
            },
            required: [
                'command',
                'explanation',
                'goal',
                'isBackground',
                'timeout',
            ]
        }
    };
}
// #endregion
// #region Tool implementation
var TerminalToolStorageKeysInternal;
(function (TerminalToolStorageKeysInternal) {
    TerminalToolStorageKeysInternal["TerminalSession"] = "chat.terminalSessions";
})(TerminalToolStorageKeysInternal || (TerminalToolStorageKeysInternal = {}));
/**
 * A set of characters to ignore when reporting telemetry
 */
const telemetryIgnoredSequences = [
    '\x1b[I', // Focus in
    '\x1b[O', // Focus out
];
const altBufferMessage = '\n' + localize(15933, null);
const deniedCommandCircuitBreakerThreshold = 3;
let RunInTerminalTool = class RunInTerminalTool extends Disposable {
    static { RunInTerminalTool_1 = this; }
    static { this._activeExecutions = new Map(); }
    static getBackgroundOutput(id) {
        const execution = RunInTerminalTool_1._activeExecutions.get(id);
        if (!execution) {
            throw new Error('Invalid terminal ID');
        }
        return execution.getOutput();
    }
    /**
     * Gets an active terminal execution by ID. Returns undefined if not found.
     * Can be used to await the completion of a background terminal command.
     */
    static getExecution(id) {
        return RunInTerminalTool_1._activeExecutions.get(id);
    }
    /**
     * Removes an active terminal execution by ID and disposes it.
     * @returns true if the execution was found and removed, false otherwise.
     */
    static removeExecution(id) {
        const execution = RunInTerminalTool_1._activeExecutions.get(id);
        if (!execution) {
            return false;
        }
        execution.dispose();
        RunInTerminalTool_1._activeExecutions.delete(id);
        return true;
    }
    constructor(_chatService, _configurationService, _fileService, _historyService, _instantiationService, _labelService, _languageModelToolsService, _remoteAgentService, _storageService, _terminalChatService, _logService, _terminalService, _terminalSandboxService, _workspaceContextService, _chatWidgetService, _agentSessionsService) {
        super();
        this._chatService = _chatService;
        this._configurationService = _configurationService;
        this._fileService = _fileService;
        this._historyService = _historyService;
        this._instantiationService = _instantiationService;
        this._labelService = _labelService;
        this._languageModelToolsService = _languageModelToolsService;
        this._remoteAgentService = _remoteAgentService;
        this._storageService = _storageService;
        this._terminalChatService = _terminalChatService;
        this._logService = _logService;
        this._terminalService = _terminalService;
        this._terminalSandboxService = _terminalSandboxService;
        this._workspaceContextService = _workspaceContextService;
        this._chatWidgetService = _chatWidgetService;
        this._agentSessionsService = _agentSessionsService;
        this._archivedSessionListener = this._register(new MutableDisposable());
        this._sessionTerminalAssociations = new ResourceMap();
        this._sessionTerminalInstances = new ResourceMap();
        this._sessionDeniedCommandCounts = new ResourceMap();
        this._terminalsBeingDisposedBySessionCleanup = new Set();
        this._osBackend = this._remoteAgentService.getEnvironment().then(remoteEnv => remoteEnv?.os ?? OS);
        this._terminalToolCreator = this._instantiationService.createInstance(ToolTerminalCreator);
        this._treeSitterCommandParser = this._register(this._instantiationService.createInstance(TreeSitterCommandParser));
        this._telemetry = this._instantiationService.createInstance(RunInTerminalToolTelemetry);
        this._commandArtifactCollector = this._instantiationService.createInstance(TerminalCommandArtifactCollector);
        this._profileFetcher = this._instantiationService.createInstance(TerminalProfileFetcher);
        this._commandLineRewriters = [
            this._register(this._instantiationService.createInstance(CommandLineCdPrefixRewriter)),
            this._register(this._instantiationService.createInstance(CommandLinePwshChainOperatorRewriter, this._treeSitterCommandParser)),
            this._register(this._instantiationService.createInstance(CommandLinePreventHistoryRewriter)),
            this._register(this._instantiationService.createInstance(CommandLineSandboxRewriter)),
        ];
        this._commandLineAnalyzers = [
            this._register(this._instantiationService.createInstance(CommandLineFileWriteAnalyzer, this._treeSitterCommandParser, (message, args) => this._logService.info(`RunInTerminalTool#CommandLineFileWriteAnalyzer: ${message}`, args))),
            this._register(this._instantiationService.createInstance(CommandLineAutoApproveAnalyzer, this._treeSitterCommandParser, this._telemetry, (message, args) => this._logService.info(`RunInTerminalTool#CommandLineAutoApproveAnalyzer: ${message}`, args))),
            this._register(this._instantiationService.createInstance(CommandLineSandboxAnalyzer)),
        ];
        this._commandLinePresenters = [
            this._instantiationService.createInstance(SandboxedCommandLinePresenter),
            new NodeCommandLinePresenter(),
            new PythonCommandLinePresenter(),
            new RubyCommandLinePresenter(),
        ];
        this._outputAnalyzers = [
            this._register(this._instantiationService.createInstance(SandboxOutputAnalyzer)),
        ];
        // Clear out warning accepted state if the setting is disabled
        this._register(Event.runAndSubscribe(this._configurationService.onDidChangeConfiguration, e => {
            if (!e || e.affectsConfiguration("chat.tools.terminal.enableAutoApprove" /* TerminalChatAgentToolsSettingId.EnableAutoApprove */)) {
                if (this._configurationService.getValue("chat.tools.terminal.enableAutoApprove" /* TerminalChatAgentToolsSettingId.EnableAutoApprove */) !== true) {
                    this._storageService.remove("chat.tools.terminal.autoApprove.warningAccepted" /* TerminalToolConfirmationStorageKeys.TerminalAutoApproveWarningAccepted */, -1 /* StorageScope.APPLICATION */);
                }
            }
        }));
        // Restore terminal associations from storage
        this._restoreTerminalAssociations();
        this._register(this._terminalService.onDidDisposeInstance(e => {
            this._removeTerminalAssociations(e);
        }));
        // Listen for chat session disposal to clean up associated terminals
        this._register(this._chatService.onDidDisposeSession(e => {
            for (const resource of e.sessionResource) {
                this._cleanupSessionTerminals(resource);
            }
        }));
    }
    async handleToolStream(context, _token) {
        const partialInput = context.rawInput;
        if (partialInput && typeof partialInput === 'object' && partialInput.command) {
            const normalizedCommand = normalizeTerminalCommandForDisplay(partialInput.command).replace(/\r\n|\r|\n/g, ' ');
            const truncatedCommand = normalizedCommand.length > 80
                ? normalizedCommand.substring(0, 77) + '...'
                : normalizedCommand;
            const invocationMessage = partialInput.isBackground
                ? new MarkdownString(localize(15934, null, truncatedCommand))
                : new MarkdownString(localize(15935, null, truncatedCommand));
            return { invocationMessage };
        }
        return { invocationMessage: localize(15936, null) };
    }
    async prepareToolInvocation(context, token) {
        const args = context.parameters;
        const chatSessionResource = context.chatSessionResource;
        let instance;
        if (chatSessionResource) {
            const toolTerminal = this._sessionTerminalAssociations.get(chatSessionResource);
            if (toolTerminal && !toolTerminal.isBackground) {
                instance = toolTerminal.instance;
            }
        }
        const [os, shell, cwd, isTerminalSandboxEnabled] = await Promise.all([
            this._osBackend,
            this._profileFetcher.getCopilotShell(),
            (async () => {
                let cwd = await instance?.getCwdResource();
                if (!cwd) {
                    const activeWorkspaceRootUri = this._historyService.getLastActiveWorkspaceRoot();
                    const workspaceFolder = activeWorkspaceRootUri ? this._workspaceContextService.getWorkspaceFolder(activeWorkspaceRootUri) ?? undefined : undefined;
                    cwd = workspaceFolder?.uri;
                }
                return cwd;
            })(),
            this._terminalSandboxService.isEnabled()
        ]);
        const language = os === 1 /* OperatingSystem.Windows */ ? 'pwsh' : 'sh';
        const requiresUnsandboxConfirmation = isTerminalSandboxEnabled && args.requestUnsandboxedExecution === true;
        const terminalToolSessionId = generateUuid();
        // Generate a custom command ID to link the command between renderer and pty host
        const terminalCommandId = `tool-${generateUuid()}`;
        let rewrittenCommand = args.command;
        let forDisplayCommand = undefined;
        let isSandboxWrapped = false;
        for (const rewriter of this._commandLineRewriters) {
            const rewriteResult = await rewriter.rewrite({
                commandLine: rewrittenCommand,
                cwd,
                shell,
                os,
                requestUnsandboxedExecution: requiresUnsandboxConfirmation,
            });
            if (rewriteResult) {
                rewrittenCommand = rewriteResult.rewritten;
                forDisplayCommand = rewriteResult.forDisplay;
                if (rewriteResult.isSandboxWrapped) {
                    isSandboxWrapped = true;
                }
                this._logService.info(`RunInTerminalTool: Command rewritten by ${rewriter.constructor.name}: ${rewriteResult.reasoning}`);
            }
        }
        const toolSpecificData = {
            kind: 'terminal',
            terminalToolSessionId,
            terminalCommandId,
            commandLine: {
                original: args.command,
                toolEdited: rewrittenCommand === args.command ? undefined : rewrittenCommand,
                forDisplay: forDisplayCommand ?? normalizeTerminalCommandForDisplay(rewrittenCommand ?? args.command),
                isSandboxWrapped,
            },
            cwd,
            language,
            isBackground: args.isBackground,
            requestUnsandboxedExecution: requiresUnsandboxConfirmation,
            requestUnsandboxedExecutionReason: args.requestUnsandboxedExecutionReason,
        };
        // HACK: Exit early if there's an alternative recommendation, this is a little hacky but
        // it's the current mechanism for re-routing terminal tool calls to something else.
        const alternativeRecommendation = getRecommendedToolsOverRunInTerminal(args.command, this._languageModelToolsService);
        if (alternativeRecommendation) {
            toolSpecificData.alternativeRecommendation = alternativeRecommendation;
            return {
                confirmationMessages: undefined,
                presentation: ToolInvocationPresentation.Hidden,
                toolSpecificData,
            };
        }
        // Determine auto approval, this happens even when auto approve is off to that reasoning
        // can be reviewed in the terminal channel. It also allows gauging the effective set of
        // commands that would be auto approved if it were enabled.
        const commandLine = rewrittenCommand ?? args.command;
        const isEligibleForAutoApproval = () => {
            const config = this._configurationService.getValue(ChatConfiguration.EligibleForAutoApproval);
            if (config && typeof config === 'object') {
                if (Object.prototype.hasOwnProperty.call(config, TOOL_REFERENCE_NAME)) {
                    return config[TOOL_REFERENCE_NAME];
                }
                for (const legacyName of LEGACY_TOOL_REFERENCE_FULL_NAMES) {
                    if (Object.prototype.hasOwnProperty.call(config, legacyName)) {
                        return config[legacyName];
                    }
                }
            }
            // Default
            return true;
        };
        const isAutoApproveEnabled = this._configurationService.getValue("chat.tools.terminal.enableAutoApprove" /* TerminalChatAgentToolsSettingId.EnableAutoApprove */) === true;
        const isAutoApproveWarningAccepted = this._storageService.getBoolean("chat.tools.terminal.autoApprove.warningAccepted" /* TerminalToolConfirmationStorageKeys.TerminalAutoApproveWarningAccepted */, -1 /* StorageScope.APPLICATION */, false);
        const isAutoApproveAllowed = isEligibleForAutoApproval() && isAutoApproveEnabled && isAutoApproveWarningAccepted;
        const commandLineAnalyzerOptions = {
            commandLine,
            cwd,
            os,
            shell,
            treeSitterLanguage: isPowerShell(shell, os) ? "powershell" /* TreeSitterCommandParserLanguage.PowerShell */ : "bash" /* TreeSitterCommandParserLanguage.Bash */,
            terminalToolSessionId,
            chatSessionResource,
        };
        const commandLineAnalyzerResults = await Promise.all(this._commandLineAnalyzers.map(e => e.analyze(commandLineAnalyzerOptions)));
        const disclaimersRaw = commandLineAnalyzerResults.map(e => e.disclaimers).filter(e => !!e).flatMap(e => e);
        let disclaimer;
        if (disclaimersRaw.length > 0) {
            const disclaimerTexts = disclaimersRaw.map(d => typeof d === 'string' ? d : d.value);
            const hasMarkdownDisclaimer = disclaimersRaw.some(d => typeof d !== 'string');
            const mdOptions = hasMarkdownDisclaimer
                ? { supportThemeIcons: true, isTrusted: { enabledCommands: ["workbench.action.terminal.chat.openTerminalSettingsLink" /* TerminalChatCommandId.OpenTerminalSettingsLink */] } }
                : { supportThemeIcons: true };
            disclaimer = new MarkdownString(`$(${Codicon.info.id}) ` + disclaimerTexts.join(' '), mdOptions);
        }
        const analyzersIsAutoApproveAllowed = commandLineAnalyzerResults.every(e => e.isAutoApproveAllowed);
        const customActions = !requiresUnsandboxConfirmation && isEligibleForAutoApproval() && analyzersIsAutoApproveAllowed ? commandLineAnalyzerResults.map(e => e.customActions ?? []).flat() : undefined;
        let shellType = basename(shell, '.exe');
        if (shellType === 'powershell') {
            shellType = 'pwsh';
        }
        // Check if the command would be auto-approved based on rules (ignoring warning state)
        const wouldBeAutoApproved = (
        // Does at least one analyzer auto approve
        commandLineAnalyzerResults.some(e => e.isAutoApproved) &&
            // No analyzer denies auto approval
            commandLineAnalyzerResults.every(e => e.isAutoApproved !== false) &&
            // All analyzers allow auto approval
            analyzersIsAutoApproveAllowed);
        const isFinalAutoApproved = (
        // Is the setting enabled and the user has opted-in
        isAutoApproveAllowed &&
            // Would be auto-approved based on rules
            wouldBeAutoApproved) || commandLineAnalyzerResults.some(e => e.forceAutoApproval);
        // Pass auto approve info if the command:
        // - Was auto approved
        // - Would have be auto approved, but the opt-in warning was not accepted
        // - Was denied explicitly by a rule
        //
        // This allows surfacing this information to the user.
        if (isFinalAutoApproved || (isAutoApproveEnabled && commandLineAnalyzerResults.some(e => e.autoApproveInfo))) {
            toolSpecificData.autoApproveInfo = commandLineAnalyzerResults.find(e => e.autoApproveInfo)?.autoApproveInfo;
        }
        // Extract cd prefix for display - show directory in title, command suffix in editor
        const commandToDisplay = (toolSpecificData.commandLine.forDisplay ?? toolSpecificData.commandLine.userEdited ?? toolSpecificData.commandLine.toolEdited ?? toolSpecificData.commandLine.original).trimStart();
        const extractedCd = extractCdPrefix(commandToDisplay, shell, os);
        let confirmationTitle;
        if (extractedCd && cwd) {
            // Construct the full directory path using the cwd's scheme/authority
            const isAbsolutePath = os === 1 /* OperatingSystem.Windows */
                ? win32.isAbsolute(extractedCd.directory)
                : posix.isAbsolute(extractedCd.directory);
            const directoryUri = isAbsolutePath
                ? URI.from({ scheme: cwd.scheme, authority: cwd.authority, path: extractedCd.directory })
                : URI.joinPath(cwd, extractedCd.directory);
            const directoryLabel = this._labelService.getUriLabel(directoryUri);
            const cdPrefix = commandToDisplay.substring(0, commandToDisplay.length - extractedCd.command.length);
            toolSpecificData.confirmation = {
                commandLine: extractedCd.command,
                cwdLabel: directoryLabel,
                cdPrefix,
            };
            confirmationTitle = args.isBackground
                ? localize(15937, null, shellType, directoryLabel)
                : localize(15938, null, shellType, directoryLabel);
        }
        else {
            toolSpecificData.confirmation = {
                commandLine: commandToDisplay,
            };
            confirmationTitle = args.isBackground
                ? localize(15939, null, shellType)
                : localize(15940, null, shellType);
        }
        // Check for presentation overrides (e.g., Python -c command extraction)
        // Use the command after cd prefix extraction if available, since that's what's displayed in the editor
        const commandForPresenter = extractedCd?.command ?? commandToDisplay;
        let presenterInput = commandForPresenter;
        for (const presenter of this._commandLinePresenters) {
            const presenterResult = await presenter.present({ commandLine: { original: args.command, forDisplay: presenterInput }, shell, os });
            if (presenterResult) {
                toolSpecificData.presentationOverrides = {
                    commandLine: presenterResult.commandLine,
                    language: presenterResult.language ?? undefined,
                };
                if (extractedCd && toolSpecificData.confirmation?.cwdLabel) {
                    confirmationTitle = args.isBackground
                        ? localize(15941, null, presenterResult.languageDisplayName, shellType, toolSpecificData.confirmation.cwdLabel)
                        : localize(15942, null, presenterResult.languageDisplayName, shellType, toolSpecificData.confirmation.cwdLabel);
                }
                else {
                    confirmationTitle = args.isBackground
                        ? localize(15943, null, presenterResult.languageDisplayName, shellType)
                        : localize(15944, null, presenterResult.languageDisplayName, shellType);
                }
                if (!presenterResult.processOtherPresenters) {
                    break;
                }
                presenterInput = presenterResult.commandLine;
            }
        }
        if (requiresUnsandboxConfirmation) {
            disclaimer = new MarkdownString([
                disclaimer?.value,
                localize(15945, null)
            ].filter(Boolean).join(' '), { supportThemeIcons: true, isTrusted: disclaimer?.isTrusted });
            confirmationTitle = args.isBackground
                ? localize(15946, null, shellType)
                : localize(15947, null, shellType);
        }
        // Check if the session's permission level (Autopilot/Bypass Approvals) auto-approves all tools.
        // When active, skip terminal confirmation entirely since the user has opted into full auto-approval.
        const isSessionAutoApproved = chatSessionResource && this._isSessionAutoApproveLevel(chatSessionResource);
        const deniedAnalyzerResult = commandLineAnalyzerResults.find(e => e.isAutoApproved === false && e.denialDetails);
        // In auto-approval session mode, fail closed for policy-denied commands instead of showing
        // a confirmation that may block unattended runs.
        if (isSessionAutoApproved && deniedAnalyzerResult?.denialDetails && context.forceConfirmationReason === undefined) {
            const denial = deniedAnalyzerResult.denialDetails;
            const deniedRule = denial.ruleSourceText
                ? ` Rule: \`${escapeMarkdownSyntaxTokens(denial.ruleSourceText)}\`.`
                : '';
            const deniedAttempts = this._recordDeniedCommandAttempt(chatSessionResource, denial);
            const shouldCircuitBreak = deniedAttempts >= deniedCommandCircuitBreakerThreshold;
            toolSpecificData.alternativeRecommendation = shouldCircuitBreak
                ? `POLICY_DENIED_CIRCUIT_BREAKER: Command was blocked ${deniedAttempts} times in this session and will not be retried. Scope: ${denial.scope}. Command: \`${escapeMarkdownSyntaxTokens(denial.deniedCommand)}\`. Reason: ${denial.reason}.${deniedRule}`
                : `POLICY_DENIED: Command was not executed in auto-approval session mode. Scope: ${denial.scope}. Command: \`${escapeMarkdownSyntaxTokens(denial.deniedCommand)}\`. Reason: ${denial.reason}.${deniedRule}`;
            return {
                confirmationMessages: undefined,
                toolSpecificData,
            };
        }
        if (isSessionAutoApproved && chatSessionResource) {
            this._sessionDeniedCommandCounts.delete(chatSessionResource);
        }
        // If forceConfirmationReason is set, always show confirmation regardless of auto-approval
        const shouldShowConfirmation = requiresUnsandboxConfirmation || (!isFinalAutoApproved && !isSessionAutoApproved) || context.forceConfirmationReason !== undefined;
        const confirmationMessage = requiresUnsandboxConfirmation
            ? new MarkdownString(localize(15948, null, args.explanation, args.goal, args.requestUnsandboxedExecutionReason || localize(15949, null)))
            : new MarkdownString(localize(15950, null, args.explanation, args.goal));
        const confirmationMessages = shouldShowConfirmation ? {
            title: confirmationTitle,
            message: confirmationMessage,
            disclaimer,
            allowAutoConfirm: requiresUnsandboxConfirmation ? false : undefined,
            terminalCustomActions: customActions,
        } : undefined;
        const rawDisplayCommand = toolSpecificData.commandLine.forDisplay ?? toolSpecificData.commandLine.toolEdited ?? toolSpecificData.commandLine.original;
        const displayCommand = rawDisplayCommand.length > 80
            ? rawDisplayCommand.substring(0, 77) + '...'
            : rawDisplayCommand;
        const escapedDisplayCommand = escapeMarkdownSyntaxTokens(displayCommand);
        const invocationMessage = toolSpecificData.commandLine.isSandboxWrapped
            ? new MarkdownString(args.isBackground
                ? localize(15951, null, escapedDisplayCommand)
                : localize(15952, null, escapedDisplayCommand), { supportThemeIcons: true })
            : new MarkdownString(args.isBackground
                ? localize(15953, null, escapedDisplayCommand)
                : localize(15954, null, escapedDisplayCommand));
        return {
            invocationMessage,
            confirmationMessages,
            toolSpecificData,
        };
    }
    /**
     * Returns true if the chat session's permission level (Autopilot/Bypass Approvals)
     * auto-approves all tool calls, unless enterprise policy restricts it.
     * Checks both the request-stamped level and the live picker level.
     */
    _isSessionAutoApproveLevel(chatSessionResource) {
        const inspected = this._configurationService.inspect(ChatConfiguration.GlobalAutoApprove);
        if (inspected.policyValue === false) {
            return false;
        }
        // Check the terminal chat service's session auto-approval state
        if (this._terminalChatService.hasChatSessionAutoApproval(chatSessionResource)) {
            return true;
        }
        // Check the live widget picker level (handles mid-session switches).
        // Fall back to lastFocusedWidget if the session-specific widget isn't found
        // (e.g., widget was backgrounded or URI mismatch).
        const widget = this._chatWidgetService.getWidgetBySessionResource(chatSessionResource)
            ?? this._chatWidgetService.lastFocusedWidget;
        if (widget && isAutoApproveLevel(widget.input.currentModeInfo.permissionLevel)) {
            return true;
        }
        // Fall back to the request-stamped level
        const model = this._chatService.getSession(chatSessionResource);
        const request = model?.getRequests().at(-1);
        return isAutoApproveLevel(request?.modeInfo?.permissionLevel);
    }
    async invoke(invocation, _countTokens, _progress, token) {
        const toolSpecificData = invocation.toolSpecificData;
        if (!toolSpecificData) {
            throw new Error('toolSpecificData must be provided for this tool');
        }
        if (!invocation.context) {
            throw new Error('Invocation context must be provided for this tool');
        }
        const commandId = toolSpecificData.terminalCommandId;
        if (toolSpecificData.alternativeRecommendation) {
            return {
                content: [{
                        kind: 'text',
                        value: toolSpecificData.alternativeRecommendation
                    }]
            };
        }
        const args = invocation.parameters;
        this._logService.debug(`RunInTerminalTool: Invoking with options ${JSON.stringify(args)}`);
        let toolResultMessage;
        const chatSessionResource = invocation.context.sessionResource;
        const command = toolSpecificData.commandLine.userEdited ?? toolSpecificData.commandLine.toolEdited ?? toolSpecificData.commandLine.original;
        const didUserEditCommand = (toolSpecificData.commandLine.userEdited !== undefined &&
            toolSpecificData.commandLine.userEdited !== toolSpecificData.commandLine.original);
        const didToolEditCommand = (!didUserEditCommand &&
            toolSpecificData.commandLine.toolEdited !== undefined &&
            toolSpecificData.commandLine.toolEdited !== toolSpecificData.commandLine.original);
        const didSandboxWrapCommand = toolSpecificData.commandLine.isSandboxWrapped === true;
        if (token.isCancellationRequested) {
            throw new CancellationError();
        }
        let error;
        const isNewSession = !args.isBackground && !this._sessionTerminalAssociations.has(chatSessionResource);
        const timingStart = Date.now();
        const termId = generateUuid();
        const terminalToolSessionId = toolSpecificData.terminalToolSessionId;
        const store = new DisposableStore();
        // Unified terminal initialization
        this._logService.debug(`RunInTerminalTool: Creating ${args.isBackground ? 'background' : 'foreground'} terminal. termId=${termId}, chatSessionResource=${chatSessionResource}`);
        const toolTerminal = await this._initTerminal(chatSessionResource, termId, terminalToolSessionId, args.isBackground, token);
        this._handleTerminalVisibility(toolTerminal, chatSessionResource);
        const timingConnectMs = Date.now() - timingStart;
        const xterm = await toolTerminal.instance.xtermReadyPromise;
        if (!xterm) {
            throw new Error('Instance was disposed before xterm.js was ready');
        }
        const commandDetection = toolTerminal.instance.capabilities.get(2 /* TerminalCapability.CommandDetection */);
        let inputUserChars = 0;
        let inputUserSigint = false;
        store.add(xterm.raw.onData(data => {
            if (!telemetryIgnoredSequences.includes(data)) {
                inputUserChars += data.length;
            }
            inputUserSigint ||= data === '\x03';
        }));
        // Unified execution: always use execute strategy for both background and foreground
        let terminalResult = '';
        let outputLineCount = -1;
        let exitCode;
        let altBufferResult;
        let didTimeout = false;
        let didMoveToBackground = args.isBackground;
        let timeoutPromise;
        let timeoutRacePromise;
        let outputMonitor;
        let pollingResult;
        const executeCancellation = store.add(new CancellationTokenSource(token));
        // Set up timeout if provided and the setting is enabled (only for foreground)
        const timeoutValue = args.timeout !== undefined ? clamp(args.timeout, 0, Number.MAX_SAFE_INTEGER) : undefined;
        if (!args.isBackground && timeoutValue !== undefined && timeoutValue > 0) {
            const shouldEnforceTimeout = this._configurationService.getValue("chat.tools.terminal.enforceTimeoutFromModel" /* TerminalChatAgentToolsSettingId.EnforceTimeoutFromModel */) === true;
            if (shouldEnforceTimeout) {
                timeoutPromise = timeout(timeoutValue);
                timeoutRacePromise = timeoutPromise.then(() => ({ type: 'timeout' })).catch(() => ({ type: 'timeout' }));
            }
        }
        // Set up continue in background listener - uses a race promise instead of cancellation
        // to allow the execution strategy to continue running and preserve its marker
        let continueInBackgroundResolve;
        const continueInBackgroundPromise = new Promise(resolve => {
            continueInBackgroundResolve = resolve;
        });
        if (terminalToolSessionId) {
            store.add(this._terminalChatService.onDidContinueInBackground(sessionId => {
                if (sessionId === terminalToolSessionId) {
                    const execution = RunInTerminalTool_1._activeExecutions.get(termId);
                    if (execution) {
                        execution.setBackground();
                    }
                    didMoveToBackground = true;
                    // Resolve the race promise instead of cancelling - this allows the execution
                    // to continue running so it can be awaited later
                    continueInBackgroundResolve?.();
                }
            }));
        }
        let executionPromise;
        try {
            // Create unified ActiveTerminalExecution (creates and owns the strategy)
            const execution = this._instantiationService.createInstance(ActiveTerminalExecution, chatSessionResource, termId, toolTerminal, commandDetection, args.isBackground);
            if (toolTerminal.shellIntegrationQuality === "none" /* ShellIntegrationQuality.None */) {
                toolResultMessage = '$(info) Enable [shell integration](https://code.visualstudio.com/docs/terminal/shell-integration) to improve command detection';
            }
            this._logService.debug(`RunInTerminalTool: Using \`${execution.strategy.type}\` execute strategy for command \`${command}\``);
            store.add(execution);
            RunInTerminalTool_1._activeExecutions.set(termId, execution);
            // Set up OutputMonitor when start marker is created
            const startMarkerPromise = Event.toPromise(execution.strategy.onDidCreateStartMarker);
            store.add(execution.strategy.onDidCreateStartMarker(startMarker => {
                if (!outputMonitor) {
                    outputMonitor = store.add(this._instantiationService.createInstance(OutputMonitor, {
                        instance: toolTerminal.instance,
                        sessionResource: chatSessionResource,
                        getOutput: (marker) => execution.getOutput(marker ?? startMarker)
                    }, undefined, invocation.context, token, command));
                }
            }));
            // Start execution (non-blocking - runs in background)
            executionPromise = execution.start(command, executeCancellation.token, commandId);
            if (args.isBackground) {
                // Background mode: wait for OutputMonitor to detect idle, then return
                this._logService.debug(`RunInTerminalTool: Starting background execution \`${command}\``);
                // Wait for the start marker to be created (which creates the outputMonitor)
                await startMarkerPromise;
                if (outputMonitor) {
                    await Event.toPromise(outputMonitor.onDidFinishCommand);
                    pollingResult = outputMonitor.pollingResult;
                }
                await this._commandArtifactCollector.capture(toolSpecificData, toolTerminal.instance, commandId);
                if (token.isCancellationRequested) {
                    throw new CancellationError();
                }
                const state = toolSpecificData.terminalCommandState ?? {};
                state.timestamp = state.timestamp ?? timingStart;
                toolSpecificData.terminalCommandState = state;
                // if the command is wrapped in a sandbox, we will not show the command. This is because the sandbox may add additional commands that are not relevant to the user, and the output will provide more context about what is running.
                let resultText = (didSandboxWrapCommand ? `Command is now running in terminal with ID=${termId}`
                    : didUserEditCommand
                        ? `Note: The user manually edited the command to \`${command}\`, and that command is now running in terminal with ID=${termId}`
                        : didToolEditCommand
                            ? `Note: The tool simplified the command to \`${command}\`, and that command is now running in terminal with ID=${termId}`
                            : `Command is running in terminal with ID=${termId}`);
                if (pollingResult && pollingResult.modelOutputEvalResponse) {
                    resultText += `\n\ The command became idle with output:\n${pollingResult.modelOutputEvalResponse}`;
                }
                else if (pollingResult) {
                    resultText += `\n\ The command is still running, with output:\n${pollingResult.output}`;
                }
                const endCwd = await toolTerminal.instance.getCwdResource();
                return {
                    toolMetadata: {
                        exitCode: undefined, // Background processes don't have immediate exit codes
                        id: termId,
                        cwd: endCwd?.toString(),
                    },
                    content: [{
                            kind: 'text',
                            value: resultText,
                        }],
                };
            }
            else {
                // Foreground mode: race execution completion against continue in background
                const raceCandidates = [
                    executionPromise.then(result => ({ type: 'completed', result })),
                    continueInBackgroundPromise.then(() => ({ type: 'background' }))
                ];
                if (timeoutRacePromise) {
                    raceCandidates.push(timeoutRacePromise);
                }
                const raceResult = await Promise.race(raceCandidates);
                if (raceResult.type === 'background') {
                    // Moved to background - execution continues running, just return current output
                    this._logService.debug(`RunInTerminalTool: Continue in background triggered, returning output collected so far`);
                    error = 'continueInBackground';
                    const backgroundOutput = execution.getOutput();
                    outputLineCount = backgroundOutput ? count(backgroundOutput.trim(), '\n') + 1 : 0;
                    terminalResult = backgroundOutput;
                }
                else if (raceResult.type === 'timeout') {
                    // Timeout reached - return partial output and keep terminal alive as background.
                    this._logService.debug(`RunInTerminalTool: Timeout reached, returning output collected so far`);
                    error = 'timeout';
                    didTimeout = true;
                    didMoveToBackground = true;
                    toolTerminal.isBackground = true;
                    this._sessionTerminalAssociations.delete(chatSessionResource);
                    await this._associateProcessIdWithSession(toolTerminal.instance, chatSessionResource, termId, toolTerminal.shellIntegrationQuality, true);
                    const timeoutOutput = execution.getOutput();
                    outputLineCount = timeoutOutput ? count(timeoutOutput.trim(), '\n') + 1 : 0;
                    terminalResult = timeoutOutput ?? '';
                }
                else {
                    const executeResult = raceResult.result;
                    // Reset user input state after command execution completes
                    toolTerminal.receivedUserInput = false;
                    if (token.isCancellationRequested) {
                        throw new CancellationError();
                    }
                    if (executeResult.didEnterAltBuffer) {
                        const state = toolSpecificData.terminalCommandState ?? {};
                        state.timestamp = state.timestamp ?? timingStart;
                        toolSpecificData.terminalCommandState = state;
                        toolResultMessage = altBufferMessage;
                        outputLineCount = 0;
                        error = executeResult.error ?? 'alternateBuffer';
                        const altBufferCwd = await toolTerminal.instance.getCwdResource();
                        altBufferResult = {
                            toolResultMessage,
                            toolMetadata: {
                                exitCode: undefined,
                                id: termId,
                                cwd: altBufferCwd?.toString(),
                            },
                            content: [{
                                    kind: 'text',
                                    value: altBufferMessage,
                                }]
                        };
                    }
                    else {
                        await this._commandArtifactCollector.capture(toolSpecificData, toolTerminal.instance, commandId);
                        {
                            const state = toolSpecificData.terminalCommandState ?? {};
                            state.timestamp = state.timestamp ?? timingStart;
                            if (executeResult.exitCode !== undefined) {
                                state.exitCode = executeResult.exitCode;
                                if (state.timestamp !== undefined) {
                                    state.duration = state.duration ?? Math.max(0, Date.now() - state.timestamp);
                                }
                            }
                            toolSpecificData.terminalCommandState = state;
                        }
                        this._logService.debug(`RunInTerminalTool: Finished \`${execution.strategy.type}\` execute strategy with exitCode \`${executeResult.exitCode}\`, result.length \`${executeResult.output?.length}\`, error \`${executeResult.error}\``);
                        outputLineCount = executeResult.output === undefined ? 0 : count(executeResult.output.trim(), '\n') + 1;
                        exitCode = executeResult.exitCode;
                        error = executeResult.error;
                        const resultArr = [];
                        if (executeResult.output !== undefined) {
                            resultArr.push(executeResult.output);
                        }
                        if (executeResult.additionalInformation) {
                            resultArr.push(executeResult.additionalInformation);
                        }
                        terminalResult = resultArr.join('\n\n');
                    }
                }
            }
        }
        catch (e) {
            // Handle timeout case - get output collected so far and return it
            if (didTimeout && e instanceof CancellationError) {
                this._logService.debug(`RunInTerminalTool: Timeout reached, returning output collected so far`);
                error = 'timeout';
                didMoveToBackground = true;
                toolTerminal.isBackground = true;
                this._sessionTerminalAssociations.delete(chatSessionResource);
                const timeoutOutput = getOutput(toolTerminal.instance, undefined);
                outputLineCount = timeoutOutput ? count(timeoutOutput.trim(), '\n') + 1 : 0;
                terminalResult = timeoutOutput ?? '';
            }
            else {
                this._logService.debug(`RunInTerminalTool: Threw exception`);
                // Capture output snapshot before disposing on cancellation
                if (e instanceof CancellationError) {
                    await this._commandArtifactCollector.capture(toolSpecificData, toolTerminal.instance, commandId);
                    // Mark the command as cancelled if it hasn't finished yet
                    // This ensures the decoration shows a failure icon instead of running
                    const state = toolSpecificData.terminalCommandState ?? {};
                    if (state.exitCode === undefined) {
                        state.exitCode = -1;
                        state.timestamp = state.timestamp ?? timingStart;
                        state.duration = state.duration ?? Math.max(0, Date.now() - state.timestamp);
                    }
                    toolSpecificData.terminalCommandState = state;
                }
                // Clean up the execution on error
                RunInTerminalTool_1._activeExecutions.get(termId)?.dispose();
                RunInTerminalTool_1._activeExecutions.delete(termId);
                toolTerminal.instance.dispose();
                error = e instanceof CancellationError ? 'canceled' : 'unexpectedException';
                throw e;
            }
        }
        finally {
            timeoutPromise?.cancel();
            if (didMoveToBackground && executionPromise) {
                // Execution moved to background - attach error handler since we won't await it
                executionPromise.catch((e) => {
                    if (!(e instanceof CancellationError)) {
                        this._logService.error(`RunInTerminalTool: Background execution error`, e);
                    }
                });
            }
            else {
                // Foreground completed or error - clean up execution
                RunInTerminalTool_1._activeExecutions.get(termId)?.dispose();
                RunInTerminalTool_1._activeExecutions.delete(termId);
            }
            store.dispose();
            const timingExecuteMs = Date.now() - timingStart;
            this._telemetry.logInvoke(toolTerminal.instance, {
                terminalToolSessionId: toolSpecificData.terminalToolSessionId,
                didUserEditCommand,
                didToolEditCommand,
                isBackground: args.isBackground,
                shellIntegrationQuality: toolTerminal.shellIntegrationQuality,
                error,
                isNewSession,
                outputLineCount,
                exitCode,
                timingExecuteMs,
                timingConnectMs,
                inputUserChars,
                inputUserSigint,
                terminalExecutionIdleBeforeTimeout: pollingResult?.state === OutputMonitorState.Idle,
                pollDurationMs: pollingResult?.pollDurationMs,
                inputToolManualAcceptCount: outputMonitor?.outputMonitorTelemetryCounters?.inputToolManualAcceptCount,
                inputToolManualRejectCount: outputMonitor?.outputMonitorTelemetryCounters?.inputToolManualRejectCount,
                inputToolManualChars: outputMonitor?.outputMonitorTelemetryCounters?.inputToolManualChars,
                inputToolAutoAcceptCount: outputMonitor?.outputMonitorTelemetryCounters?.inputToolAutoAcceptCount,
                inputToolAutoChars: outputMonitor?.outputMonitorTelemetryCounters?.inputToolAutoChars,
                inputToolManualShownCount: outputMonitor?.outputMonitorTelemetryCounters?.inputToolManualShownCount,
                inputToolFreeFormInputCount: outputMonitor?.outputMonitorTelemetryCounters?.inputToolFreeFormInputCount,
                inputToolFreeFormInputShownCount: outputMonitor?.outputMonitorTelemetryCounters?.inputToolFreeFormInputShownCount
            });
        }
        if (altBufferResult) {
            return altBufferResult;
        }
        const resultText = [];
        if (!didSandboxWrapCommand) {
            if (didUserEditCommand) {
                resultText.push(`Note: The user manually edited the command to \`${command}\`, and this is the output of running that command instead:\n`);
            }
            else if (didToolEditCommand) {
                resultText.push(`Note: The tool simplified the command to \`${command}\`, and this is the output of running that command instead:\n`);
            }
            if (didMoveToBackground && !args.isBackground) {
                resultText.push(`Note: This terminal execution was moved to the background using the ID ${termId}\n`);
            }
        }
        if (didTimeout && timeoutValue !== undefined && timeoutValue > 0) {
            resultText.push(`Note: Command timed out after ${timeoutValue}ms. Output collected so far is shown below and the command may still be running in terminal ID ${termId}.\n\n`);
        }
        let outputAnalyzerMessage;
        for (const analyzer of this._outputAnalyzers) {
            const message = await analyzer.analyze({ exitCode, exitResult: terminalResult, commandLine: command, isSandboxWrapped: didSandboxWrapCommand });
            if (message) {
                outputAnalyzerMessage = message;
                break;
            }
        }
        if (outputAnalyzerMessage) {
            resultText.push(`${outputAnalyzerMessage}\n`);
        }
        resultText.push(terminalResult);
        const isError = exitCode !== undefined && exitCode !== 0;
        const endCwd = await toolTerminal.instance.getCwdResource();
        const imageContent = await this._extractImagesFromOutput(terminalResult, endCwd);
        return {
            toolResultMessage,
            toolMetadata: {
                exitCode: exitCode,
                id: termId,
                cwd: endCwd?.toString(),
                timedOut: didTimeout || undefined,
                timeoutMs: didTimeout ? timeoutValue : undefined,
            },
            toolResultDetails: isError ? {
                input: command,
                output: [{ type: 'embed', isText: true, value: terminalResult }],
                isError: true
            } : undefined,
            content: [
                {
                    kind: 'text',
                    value: resultText.join(''),
                },
                ...imageContent,
            ]
        };
    }
    static { this._maxImageFileSize = 5 * 1024 * 1024; }
    /**
     * Scans terminal output for file paths that point to images and reads them.
     * Returns data content parts for any found images that exist on disk.
     */
    async _extractImagesFromOutput(output, cwd) {
        const normalizedOutput = output.replace(/\r?\n/g, '');
        // Match paths ending with image extensions. A leading / or \ is sufficient
        // to identify a path segment; the full path up to the extension is captured.
        const pathPattern = /(?:[^\s]*[\/\\][^\s]*\.(?:png|jpe?g|gif|webp|bmp))/gi;
        const matches = new Set();
        for (const match of normalizedOutput.matchAll(pathPattern)) {
            matches.add(match[0]);
        }
        if (matches.size === 0) {
            return [];
        }
        const results = [];
        for (const filePath of matches) {
            try {
                const mimeType = getMediaMime(filePath);
                if (!mimeType || !mimeType.startsWith('image/')) {
                    continue;
                }
                // Resolve the URI - check for absolute path (Unix / or Windows drive letter)
                let fileUri;
                if (/^\/|^[A-Za-z]:[\\\/]/.test(filePath)) {
                    fileUri = URI.file(filePath);
                }
                else if (cwd) {
                    fileUri = URI.joinPath(cwd, filePath);
                }
                else {
                    continue;
                }
                const stat = await this._fileService.stat(fileUri).catch(() => undefined);
                if (!stat || stat.isDirectory || stat.size > RunInTerminalTool_1._maxImageFileSize) {
                    continue;
                }
                const fileContent = await this._fileService.readFile(fileUri);
                results.push({
                    kind: 'data',
                    value: {
                        mimeType,
                        data: fileContent.value,
                    },
                });
            }
            catch {
                // Ignore files that can't be read
            }
        }
        return results;
    }
    _handleTerminalVisibility(toolTerminal, chatSessionResource) {
        const chatSessionOpenInWidget = !!this._chatWidgetService.getWidgetBySessionResource(chatSessionResource);
        if (this._configurationService.getValue("chat.tools.terminal.outputLocation" /* TerminalChatAgentToolsSettingId.OutputLocation */) === 'terminal' && chatSessionOpenInWidget) {
            this._terminalService.setActiveInstance(toolTerminal.instance);
            this._terminalService.revealTerminal(toolTerminal.instance, true);
        }
    }
    // #region Terminal init
    /**
     * Initializes a terminal for command execution. For foreground mode, reuses existing cached
     * terminal from the session. For background mode, always creates a new terminal to allow
     * parallel execution.
     */
    async _initTerminal(chatSessionResource, termId, terminalToolSessionId, isBackground, token) {
        // For foreground mode, try to reuse cached terminal (but not if it was a background terminal)
        if (!isBackground) {
            const cachedTerminal = this._sessionTerminalAssociations.get(chatSessionResource);
            if (cachedTerminal && !cachedTerminal.isBackground) {
                this._logService.debug(`RunInTerminalTool: Using cached terminal with session resource \`${chatSessionResource}\``);
                this._terminalToolCreator.refreshShellIntegrationQuality(cachedTerminal);
                this._terminalChatService.registerTerminalInstanceWithToolSession(terminalToolSessionId, cachedTerminal.instance);
                return cachedTerminal;
            }
        }
        this._logService.debug(`RunInTerminalTool: Creating ${isBackground ? 'background' : 'foreground'} terminal with ID=${termId}`);
        const profile = await this._profileFetcher.getCopilotProfile();
        const os = await this._osBackend;
        const toolTerminal = await this._terminalToolCreator.createTerminal(profile, os, token);
        toolTerminal.isBackground = isBackground;
        this._terminalChatService.registerTerminalInstanceWithToolSession(terminalToolSessionId, toolTerminal.instance);
        this._terminalChatService.registerTerminalInstanceWithChatSession(chatSessionResource, toolTerminal.instance);
        this._registerInputListener(toolTerminal);
        this._addSessionTerminalAssociation(chatSessionResource, toolTerminal);
        if (token.isCancellationRequested) {
            toolTerminal.instance.dispose();
            throw new CancellationError();
        }
        await this._setupProcessIdAssociation(toolTerminal, chatSessionResource, termId, isBackground);
        return toolTerminal;
    }
    _registerInputListener(toolTerminal) {
        const disposable = toolTerminal.instance.onData(data => {
            if (!telemetryIgnoredSequences.includes(data)) {
                toolTerminal.receivedUserInput = data.length > 0;
            }
        });
        this._register(toolTerminal.instance.onDisposed(() => disposable.dispose()));
    }
    // #endregion
    // #region Session management
    _restoreTerminalAssociations() {
        const storedAssociations = this._storageService.get("chat.terminalSessions" /* TerminalToolStorageKeysInternal.TerminalSession */, 1 /* StorageScope.WORKSPACE */, '{}');
        try {
            const associations = JSON.parse(storedAssociations);
            // Find existing terminals and associate them with sessions
            for (const instance of this._terminalService.instances) {
                if (instance.processId) {
                    const association = associations[instance.processId];
                    if (association) {
                        // Convert stored string ID to URI for backward compatibility
                        const chatSessionResource = LocalChatSessionUri.forSession(association.sessionId);
                        this._logService.debug(`RunInTerminalTool: Restored terminal association for PID ${instance.processId}, session ${association.sessionId}`);
                        const toolTerminal = {
                            instance,
                            shellIntegrationQuality: association.shellIntegrationQuality,
                            isBackground: association.isBackground
                        };
                        this._addSessionTerminalAssociation(chatSessionResource, toolTerminal);
                        this._terminalChatService.registerTerminalInstanceWithChatSession(chatSessionResource, instance);
                        // Listen for terminal disposal to clean up storage
                        this._register(instance.onDisposed(() => {
                            this._removeProcessIdAssociation(instance.processId);
                        }));
                    }
                }
            }
        }
        catch (error) {
            this._logService.debug(`RunInTerminalTool: Failed to restore terminal associations: ${error}`);
        }
    }
    async _setupProcessIdAssociation(toolTerminal, chatSessionResource, termId, isBackground) {
        await this._associateProcessIdWithSession(toolTerminal.instance, chatSessionResource, termId, toolTerminal.shellIntegrationQuality, isBackground);
        this._register(toolTerminal.instance.onDisposed(() => {
            if (toolTerminal.instance.processId) {
                this._removeProcessIdAssociation(toolTerminal.instance.processId);
            }
        }));
    }
    async _associateProcessIdWithSession(terminal, chatSessionResource, id, shellIntegrationQuality, isBackground) {
        try {
            // Wait for process ID with timeout
            const pid = await Promise.race([
                terminal.processReady.then(() => terminal.processId),
                timeout(5000).then(() => { throw new Error('Timeout'); })
            ]);
            if (isNumber(pid)) {
                const storedAssociations = this._storageService.get("chat.terminalSessions" /* TerminalToolStorageKeysInternal.TerminalSession */, 1 /* StorageScope.WORKSPACE */, '{}');
                const associations = JSON.parse(storedAssociations);
                // Convert URI to string ID for storage (backward compatibility)
                const sessionId = chatSessionResourceToId(chatSessionResource);
                const existingAssociation = associations[pid] || {};
                associations[pid] = {
                    ...existingAssociation,
                    sessionId,
                    shellIntegrationQuality,
                    id,
                    isBackground
                };
                this._storageService.store("chat.terminalSessions" /* TerminalToolStorageKeysInternal.TerminalSession */, JSON.stringify(associations), 1 /* StorageScope.WORKSPACE */, 0 /* StorageTarget.USER */);
                this._logService.debug(`RunInTerminalTool: Associated terminal PID ${pid} with session ${sessionId}`);
            }
        }
        catch (error) {
            this._logService.debug(`RunInTerminalTool: Failed to associate terminal with session: ${error}`);
        }
    }
    async _removeProcessIdAssociation(pid) {
        try {
            const storedAssociations = this._storageService.get("chat.terminalSessions" /* TerminalToolStorageKeysInternal.TerminalSession */, 1 /* StorageScope.WORKSPACE */, '{}');
            const associations = JSON.parse(storedAssociations);
            if (associations[pid]) {
                delete associations[pid];
                this._storageService.store("chat.terminalSessions" /* TerminalToolStorageKeysInternal.TerminalSession */, JSON.stringify(associations), 1 /* StorageScope.WORKSPACE */, 0 /* StorageTarget.USER */);
                this._logService.debug(`RunInTerminalTool: Removed terminal association for PID ${pid}`);
            }
        }
        catch (error) {
            this._logService.debug(`RunInTerminalTool: Failed to remove terminal association: ${error}`);
        }
    }
    _cleanupSessionTerminals(chatSessionResource) {
        const sessionTerminals = this._sessionTerminalInstances.get(chatSessionResource);
        const toolTerminal = this._sessionTerminalAssociations.get(chatSessionResource);
        const terminalsToDispose = sessionTerminals ?? (toolTerminal ? new Set([toolTerminal.instance]) : undefined);
        if (!terminalsToDispose || terminalsToDispose.size === 0) {
            return;
        }
        this._logService.debug(`RunInTerminalTool: Cleaning up ${terminalsToDispose.size} terminal(s) for ended chat session ${chatSessionResource}`);
        this._sessionTerminalAssociations.delete(chatSessionResource);
        this._sessionTerminalInstances.delete(chatSessionResource);
        this._sessionDeniedCommandCounts.delete(chatSessionResource);
        for (const terminal of terminalsToDispose) {
            // Skip redundant map walks in onDidDispose since this session has already been removed.
            this._terminalsBeingDisposedBySessionCleanup.add(terminal);
            terminal.dispose();
        }
        // Clean up any active executions associated with this session
        const terminalToRemove = [];
        for (const [termId, execution] of RunInTerminalTool_1._activeExecutions.entries()) {
            if (terminalsToDispose.has(execution.instance)) {
                execution.dispose();
                terminalToRemove.push(termId);
            }
        }
        for (const termId of terminalToRemove) {
            RunInTerminalTool_1._activeExecutions.delete(termId);
        }
    }
    _recordDeniedCommandAttempt(chatSessionResource, denial) {
        let sessionCounts = this._sessionDeniedCommandCounts.get(chatSessionResource);
        if (!sessionCounts) {
            sessionCounts = new Map();
            this._sessionDeniedCommandCounts.set(chatSessionResource, sessionCounts);
        }
        const signature = JSON.stringify([denial.scope, denial.deniedCommand, denial.ruleSourceText ?? denial.reason]);
        const attempts = (sessionCounts.get(signature) ?? 0) + 1;
        sessionCounts.set(signature, attempts);
        return attempts;
    }
    _addSessionTerminalAssociation(chatSessionResource, toolTerminal) {
        this._ensureArchivedSessionListener();
        let sessionTerminals = this._sessionTerminalInstances.get(chatSessionResource);
        if (!sessionTerminals) {
            sessionTerminals = new Set();
            this._sessionTerminalInstances.set(chatSessionResource, sessionTerminals);
        }
        sessionTerminals.add(toolTerminal.instance);
        if (!toolTerminal.isBackground) {
            this._sessionTerminalAssociations.set(chatSessionResource, toolTerminal);
        }
    }
    _ensureArchivedSessionListener() {
        if (this._archivedSessionListener.value) {
            return;
        }
        // Archiving a session does not fire onDidDisposeSession, but we still need to dispose
        // any terminals associated with the archived session to avoid process accumulation.
        this._archivedSessionListener.value = this._agentSessionsService.onDidChangeSessionArchivedState(session => {
            if (session.isArchived()) {
                this._cleanupSessionTerminals(session.resource);
            }
        });
    }
    _removeTerminalAssociations(terminal) {
        if (this._terminalsBeingDisposedBySessionCleanup.delete(terminal)) {
            return;
        }
        for (const [sessionResource, toolTerminal] of this._sessionTerminalAssociations.entries()) {
            if (terminal === toolTerminal.instance) {
                this._sessionTerminalAssociations.delete(sessionResource);
            }
        }
        for (const [sessionResource, sessionTerminals] of this._sessionTerminalInstances.entries()) {
            if (!sessionTerminals.delete(terminal)) {
                continue;
            }
            if (sessionTerminals.size === 0) {
                this._sessionTerminalInstances.delete(sessionResource);
            }
        }
    }
};
RunInTerminalTool = RunInTerminalTool_1 = __decorate([
    __param(0, IChatService),
    __param(1, IConfigurationService),
    __param(2, IFileService),
    __param(3, IHistoryService),
    __param(4, IInstantiationService),
    __param(5, ILabelService),
    __param(6, ILanguageModelToolsService),
    __param(7, IRemoteAgentService),
    __param(8, IStorageService),
    __param(9, ITerminalChatService),
    __param(10, ITerminalLogService),
    __param(11, ITerminalService),
    __param(12, ITerminalSandboxService),
    __param(13, IWorkspaceContextService),
    __param(14, IChatWidgetService),
    __param(15, IAgentSessionsService)
], RunInTerminalTool);
export { RunInTerminalTool };
/**
 * Represents an active terminal command execution that can run in either foreground or background
 * mode. This unified class replaces the previous split between foreground strategy execution and
 * BackgroundTerminalExecution, allowing seamless switching between modes.
 */
let ActiveTerminalExecution = class ActiveTerminalExecution extends Disposable {
    /**
     * The promise that resolves when the execute strategy completes. Can be awaited to get the
     * full result with exit code.
     */
    get completionPromise() {
        return this._completionDeferred.p;
    }
    get isBackground() {
        return this._isBackground;
    }
    get startMarker() {
        return this._startMarker;
    }
    get instance() {
        return this._toolTerminal.instance;
    }
    constructor(sessionResource, termId, toolTerminal, commandDetection, isBackground, _instantiationService) {
        super();
        this.sessionResource = sessionResource;
        this.termId = termId;
        this._instantiationService = _instantiationService;
        this._toolTerminal = toolTerminal;
        this._isBackground = isBackground;
        this._completionDeferred = new DeferredPromise();
        // Create and register the strategy for disposal to clean up its internal resources
        this.strategy = this._register(this._createStrategy(commandDetection));
        this._register(this.strategy.onDidCreateStartMarker(marker => {
            if (marker) {
                // Don't register marker - strategy already manages its lifecycle
                this._startMarker = marker;
            }
        }));
    }
    _createStrategy(commandDetection) {
        switch (this._toolTerminal.shellIntegrationQuality) {
            case "none" /* ShellIntegrationQuality.None */:
                return this._instantiationService.createInstance(NoneExecuteStrategy, this._toolTerminal.instance, () => this._toolTerminal.receivedUserInput ?? false);
            case "basic" /* ShellIntegrationQuality.Basic */:
                return this._instantiationService.createInstance(BasicExecuteStrategy, this._toolTerminal.instance, () => this._toolTerminal.receivedUserInput ?? false, commandDetection);
            case "rich" /* ShellIntegrationQuality.Rich */:
                return this._instantiationService.createInstance(RichExecuteStrategy, this._toolTerminal.instance, commandDetection);
        }
    }
    /**
     * Starts the command execution using the execute strategy.
     * @param commandLine The command to execute
     * @param token Cancellation token
     * @param commandId Optional command ID for linking
     * @returns The execution result
     */
    async start(commandLine, token, commandId) {
        try {
            const result = await this.strategy.execute(commandLine, token, commandId);
            this._completionDeferred.complete(result);
            return result;
        }
        catch (e) {
            this._completionDeferred.error(e);
            throw e;
        }
    }
    /**
     * Switches this execution to foreground mode, meaning callers will await its completion.
     */
    setForeground() {
        this._isBackground = false;
    }
    /**
     * Switches this execution to background mode.
     */
    setBackground() {
        this._isBackground = true;
    }
    /**
     * Gets the current output from the terminal.
     */
    getOutput(marker) {
        return getOutput(this.instance, marker ?? this._startMarker);
    }
};
ActiveTerminalExecution = __decorate([
    __param(5, IInstantiationService)
], ActiveTerminalExecution);
let TerminalProfileFetcher = class TerminalProfileFetcher {
    constructor(_configurationService, _terminalProfileResolverService, _remoteAgentService) {
        this._configurationService = _configurationService;
        this._terminalProfileResolverService = _terminalProfileResolverService;
        this._remoteAgentService = _remoteAgentService;
        this.osBackend = this._remoteAgentService.getEnvironment().then(remoteEnv => remoteEnv?.os ?? OS);
    }
    async getCopilotProfile() {
        const os = await this.osBackend;
        // Check for chat agent terminal profile first
        const customChatAgentProfile = this._getChatTerminalProfile(os);
        if (customChatAgentProfile) {
            return customChatAgentProfile;
        }
        // When setting is null, use the previous behavior
        const defaultProfile = await this._terminalProfileResolverService.getDefaultProfile({
            os,
            remoteAuthority: this._remoteAgentService.getConnection()?.remoteAuthority
        });
        // Force pwsh over cmd as cmd doesn't have shell integration
        if (basename(defaultProfile.path) === 'cmd.exe') {
            return {
                ...defaultProfile,
                path: 'C:\\WINDOWS\\System32\\WindowsPowerShell\\v1.0\\powershell.exe',
                profileName: 'PowerShell'
            };
        }
        // Setting icon: undefined allows the system to use the default AI terminal icon (not overridden or removed)
        return { ...defaultProfile, icon: undefined };
    }
    async getCopilotShell() {
        return (await this.getCopilotProfile()).path;
    }
    _getChatTerminalProfile(os) {
        let profileSetting;
        switch (os) {
            case 1 /* OperatingSystem.Windows */:
                profileSetting = "chat.tools.terminal.terminalProfile.windows" /* TerminalChatAgentToolsSettingId.TerminalProfileWindows */;
                break;
            case 2 /* OperatingSystem.Macintosh */:
                profileSetting = "chat.tools.terminal.terminalProfile.osx" /* TerminalChatAgentToolsSettingId.TerminalProfileMacOs */;
                break;
            case 3 /* OperatingSystem.Linux */:
            default:
                profileSetting = "chat.tools.terminal.terminalProfile.linux" /* TerminalChatAgentToolsSettingId.TerminalProfileLinux */;
                break;
        }
        const profile = this._configurationService.getValue(profileSetting);
        if (this._isValidChatAgentTerminalProfile(profile)) {
            return profile;
        }
        return undefined;
    }
    _isValidChatAgentTerminalProfile(profile) {
        if (profile === null || profile === undefined || typeof profile !== 'object') {
            return false;
        }
        if ('path' in profile && isString(profile.path)) {
            return true;
        }
        return false;
    }
};
TerminalProfileFetcher = __decorate([
    __param(0, IConfigurationService),
    __param(1, ITerminalProfileResolverService),
    __param(2, IRemoteAgentService)
], TerminalProfileFetcher);
export { TerminalProfileFetcher };
// #endregion
//# sourceMappingURL=runInTerminalTool.js.map