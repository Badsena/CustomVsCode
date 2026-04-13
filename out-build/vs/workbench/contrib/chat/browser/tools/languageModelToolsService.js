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
var LanguageModelToolsService_1;
import { renderAsPlaintext } from '../../../../../base/browser/markdownRenderer.js';
import { assertNever } from '../../../../../base/common/assert.js';
import { RunOnceScheduler, timeout } from '../../../../../base/common/async.js';
import { encodeBase64 } from '../../../../../base/common/buffer.js';
import { CancellationToken, CancellationTokenSource } from '../../../../../base/common/cancellation.js';
import { Codicon } from '../../../../../base/common/codicons.js';
import { arrayEqualsC } from '../../../../../base/common/equals.js';
import { toErrorMessage } from '../../../../../base/common/errorMessage.js';
import { CancellationError, isCancellationError } from '../../../../../base/common/errors.js';
import { Emitter, Event } from '../../../../../base/common/event.js';
import { createMarkdownCommandLink, MarkdownString } from '../../../../../base/common/htmlContent.js';
import { Iterable } from '../../../../../base/common/iterator.js';
import { combinedDisposable, Disposable, DisposableStore, toDisposable } from '../../../../../base/common/lifecycle.js';
import { getMediaMime } from '../../../../../base/common/mime.js';
import { derived, derivedOpts, observableFromEventOpts, ObservableSet, observableSignal, transaction } from '../../../../../base/common/observable.js';
import Severity from '../../../../../base/common/severity.js';
import { StopWatch } from '../../../../../base/common/stopwatch.js';
import { ThemeIcon } from '../../../../../base/common/themables.js';
import { URI } from '../../../../../base/common/uri.js';
import { localize, localize2 } from '../../../../../nls.js';
import { IAccessibilityService } from '../../../../../platform/accessibility/common/accessibility.js';
import { AccessibilitySignal, IAccessibilitySignalService } from '../../../../../platform/accessibilitySignal/browser/accessibilitySignalService.js';
import { ICommandService } from '../../../../../platform/commands/common/commands.js';
import { IConfigurationService } from '../../../../../platform/configuration/common/configuration.js';
import { IContextKeyService } from '../../../../../platform/contextkey/common/contextkey.js';
import { IDialogService } from '../../../../../platform/dialogs/common/dialogs.js';
import { IInstantiationService } from '../../../../../platform/instantiation/common/instantiation.js';
import * as JSONContributionRegistry from '../../../../../platform/jsonschemas/common/jsonContributionRegistry.js';
import { ILogService } from '../../../../../platform/log/common/log.js';
import { observableConfigValue } from '../../../../../platform/observable/common/platformObservableUtils.js';
import { Registry } from '../../../../../platform/registry/common/platform.js';
import { IStorageService } from '../../../../../platform/storage/common/storage.js';
import { ITelemetryService } from '../../../../../platform/telemetry/common/telemetry.js';
import { IExtensionService } from '../../../../services/extensions/common/extensions.js';
import { ChatContextKeys } from '../../common/actions/chatContextKeys.js';
import { toToolSetVariableEntry, toToolVariableEntry } from '../../common/attachments/chatVariableEntries.js';
import { IChatService, IChatToolInvocation } from '../../common/chatService/chatService.js';
import { ChatConfiguration, isAutoApproveLevel } from '../../common/constants.js';
import { localChatSessionType } from '../../common/chatSessionsService.js';
import { ChatToolInvocation } from '../../common/model/chatProgressTypes/chatToolInvocation.js';
import { chatSessionResourceToId, getChatSessionType } from '../../common/model/chatUri.js';
import { HookType } from '../../common/promptSyntax/hookTypes.js';
import { ILanguageModelToolsConfirmationService } from '../../common/tools/languageModelToolsConfirmationService.js';
import { createToolSchemaUri, isToolSet, SpecedToolAliases, stringifyPromptTsxPart, ToolDataSource, ToolInvocationPresentation, toolMatchesModel, ToolSet, ToolSetForModel, VSCodeToolReference } from '../../common/tools/languageModelToolsService.js';
import { getToolConfirmationAlert } from '../accessibility/chatAccessibilityProvider.js';
import { IChatWidgetService } from '../chat.js';
const jsonSchemaRegistry = Registry.as(JSONContributionRegistry.Extensions.JSONContribution);
export var AutoApproveStorageKeys;
(function (AutoApproveStorageKeys) {
    AutoApproveStorageKeys["GlobalAutoApproveOptIn"] = "chat.tools.global.autoApprove.optIn";
})(AutoApproveStorageKeys || (AutoApproveStorageKeys = {}));
const SkipAutoApproveConfirmationKey = 'vscode.chat.tools.global.autoApprove.testMode';
// This tool will always require user confirmation even in auto approval mode.
// Users cannot auto approve this tool via settings either, as this is a tool used before the agentic loop.
const toolIdsThatCannotBeAutoApproved = new Set([
    'vscode_get_confirmation_with_options',
    'vscode_get_modified_files_confirmation',
]);
export const globalAutoApproveDescription = localize2(7821, 'Global auto approve also known as "YOLO mode" disables manual approval completely for _all tools in all workspaces_, allowing the agent to act fully autonomously. This is extremely dangerous and is *never* recommended, even containerized environments like [Codespaces](https://github.com/features/codespaces) and [Dev Containers](https://marketplace.visualstudio.com/items?itemName=ms-vscode-remote.remote-containers) have user keys forwarded into the container that could be compromised.\n\n**This feature disables [critical security protections](https://code.visualstudio.com/docs/copilot/security) and makes it much easier for an attacker to compromise the machine.**\n\nNote: This setting only controls tool approval and does not prevent the agent from asking questions. To automatically answer agent questions, use the [`chat.autoReply`](command:workbench.action.openSettings?%5B%22chat.autoReply%22%5D) setting.');









let LanguageModelToolsService = class LanguageModelToolsService extends Disposable {
    static { LanguageModelToolsService_1 = this; }
    constructor(_instantiationService, _extensionService, _contextKeyService, _chatService, _dialogService, _telemetryService, _logService, _configurationService, _accessibilityService, _accessibilitySignalService, _storageService, _confirmationService, _commandService, _chatWidgetService) {
        super();
        this._instantiationService = _instantiationService;
        this._extensionService = _extensionService;
        this._contextKeyService = _contextKeyService;
        this._chatService = _chatService;
        this._dialogService = _dialogService;
        this._telemetryService = _telemetryService;
        this._logService = _logService;
        this._configurationService = _configurationService;
        this._accessibilityService = _accessibilityService;
        this._accessibilitySignalService = _accessibilitySignalService;
        this._storageService = _storageService;
        this._confirmationService = _confirmationService;
        this._commandService = _commandService;
        this._chatWidgetService = _chatWidgetService;
        this._onDidChangeTools = this._register(new Emitter());
        this.onDidChangeTools = this._onDidChangeTools.event;
        this._onDidPrepareToolCallBecomeUnresponsive = this._register(new Emitter());
        this.onDidPrepareToolCallBecomeUnresponsive = this._onDidPrepareToolCallBecomeUnresponsive.event;
        this._onDidInvokeTool = this._register(new Emitter());
        this.onDidInvokeTool = this._onDidInvokeTool.event;
        /** Throttle tools updates because it sends all tools and runs on context key updates */
        this._onDidChangeToolsScheduler = this._register(new RunOnceScheduler(() => this._onDidChangeTools.fire(), 750));
        this._tools = new Map();
        this._toolContextKeys = new Set();
        this._callsByRequestId = new Map();
        /** Pending tool calls in the streaming phase, keyed by toolCallId */
        this._pendingToolCalls = new Map();
        this._toolSets = new ObservableSet();
        this.toolSets = derived(this, reader => {
            const allToolSets = Array.from(this._toolSets.observable.read(reader));
            return allToolSets.filter(toolSet => this.isPermitted(toolSet, reader));
        });
        this.allToolsIncludingDisableObs = observableFromEventOpts({ equalsFn: arrayEqualsC() }, this.onDidChangeTools, () => Array.from(this.getAllToolsIncludingDisabled()));
        this.toolsWithFullReferenceName = derived(reader => {
            const result = [];
            const coveredByToolSets = new Set();
            for (const toolSet of this.toolSets.read(reader)) {
                if (toolSet.source.type !== 'user') {
                    result.push([toolSet, getToolSetFullReferenceName(toolSet)]);
                    for (const tool of toolSet.getTools()) {
                        result.push([tool, getToolFullReferenceName(tool, toolSet)]);
                        coveredByToolSets.add(tool);
                    }
                }
            }
            for (const tool of this.allToolsIncludingDisableObs.read(reader)) {
                // todo@connor4312/aeschil: this effectively hides model-specific tools
                // for prompt referencing. Should we eventually enable this? (If so how?)
                if (tool.when && !this._contextKeyService.contextMatchesRules(tool.when)) {
                    continue;
                }
                if (tool.canBeReferencedInPrompt && !coveredByToolSets.has(tool) && this.isPermitted(tool, reader)) {
                    result.push([tool, getToolFullReferenceName(tool)]);
                }
            }
            return result;
        });
        this._isAgentModeEnabled = observableConfigValue(ChatConfiguration.AgentEnabled, true, this._configurationService);
        this._register(this._contextKeyService.onDidChangeContext(e => {
            if (e.affectsSome(this._toolContextKeys)) {
                // Not worth it to compute a delta here unless we have many tools changing often
                this._onDidChangeToolsScheduler.schedule();
            }
        }));
        this._register(this._configurationService.onDidChangeConfiguration(e => {
            if (e.affectsConfiguration(ChatConfiguration.ExtensionToolsEnabled) || e.affectsConfiguration(ChatConfiguration.AgentEnabled)) {
                this._onDidChangeToolsScheduler.schedule();
            }
        }));
        // Clear out warning accepted state if the setting is disabled
        this._register(Event.runAndSubscribe(this._configurationService.onDidChangeConfiguration, e => {
            if (!e || e.affectsConfiguration(ChatConfiguration.GlobalAutoApprove)) {
                if (this._configurationService.getValue(ChatConfiguration.GlobalAutoApprove) !== true) {
                    this._storageService.remove("chat.tools.global.autoApprove.optIn" /* AutoApproveStorageKeys.GlobalAutoApproveOptIn */, -1 /* StorageScope.APPLICATION */);
                }
            }
        }));
        this._ctxToolsCount = ChatContextKeys.Tools.toolsCount.bindTo(_contextKeyService);
        // Create the internal VS Code tool set
        this.vscodeToolSet = this._register(this.createToolSet(ToolDataSource.Internal, 'vscode', VSCodeToolReference.vscode, {
            icon: ThemeIcon.fromId(Codicon.vscode.id),
            description: localize(7799, null),
        }));
        // Create the internal Execute tool set
        this.executeToolSet = this._register(this.createToolSet(ToolDataSource.Internal, 'execute', SpecedToolAliases.execute, {
            icon: ThemeIcon.fromId(Codicon.terminal.id),
            description: localize(7800, null),
        }));
        // Create the internal Read tool set
        this.readToolSet = this._register(this.createToolSet(ToolDataSource.Internal, 'read', SpecedToolAliases.read, {
            icon: ThemeIcon.fromId(Codicon.book.id),
            description: localize(7801, null),
        }));
        // Create the internal Agent tool set
        this.agentToolSet = this._register(this.createToolSet(ToolDataSource.Internal, 'agent', SpecedToolAliases.agent, {
            icon: ThemeIcon.fromId(Codicon.agent.id),
            description: localize(7802, null),
        }));
    }
    /**
     * Returns if the given tool or toolset is permitted in the current context.
     * When agent mode is enabled, all tools are permitted (no restriction)
     * When agent mode is disabled only a subset of read-only tools are permitted in agentic-loop contexts.
     */
    isPermitted(toolOrToolSet, reader) {
        const agentModeEnabled = this._isAgentModeEnabled.read(reader);
        if (agentModeEnabled !== false) {
            return true;
        }
        // Internal tools that explicitly cannot be referenced in prompts are always permitted
        // since they are infrastructure tools (e.g. inline_chat_exit), not user-facing agent tools
        if (!isToolSet(toolOrToolSet) && toolOrToolSet.canBeReferencedInPrompt === false && toolOrToolSet.source.type === 'internal') {
            return true;
        }
        const permittedInternalToolSetIds = [SpecedToolAliases.read, SpecedToolAliases.search, SpecedToolAliases.web];
        if (isToolSet(toolOrToolSet)) {
            const permitted = toolOrToolSet.source.type === 'internal' && permittedInternalToolSetIds.includes(toolOrToolSet.referenceName);
            this._logService.trace(`LanguageModelToolsService#isPermitted: ToolSet ${toolOrToolSet.id} (${toolOrToolSet.referenceName}) permitted=${permitted}`);
            return permitted;
        }
        for (const toolSet of this._toolSets) {
            if (toolSet.source.type === 'internal' && permittedInternalToolSetIds.includes(toolSet.referenceName)) {
                for (const memberTool of toolSet.getTools()) {
                    if (memberTool.id === toolOrToolSet.id) {
                        this._logService.trace(`LanguageModelToolsService#isPermitted: Tool ${toolOrToolSet.id} (${toolOrToolSet.toolReferenceName}) permitted=true (member of ${toolSet.referenceName})`);
                        return true;
                    }
                }
            }
        }
        // Special case for 'vscode_fetchWebPage_internal', which is allowed if we allow 'web' tools
        // Fetch is implemented with two tools, this one and 'copilot_fetchWebPage'
        if (toolOrToolSet.id === 'vscode_fetchWebPage_internal' && permittedInternalToolSetIds.includes(SpecedToolAliases.web)) {
            this._logService.trace(`LanguageModelToolsService#isPermitted: Tool ${toolOrToolSet.id} (${toolOrToolSet.toolReferenceName}) permitted=true (special case)`);
            return true;
        }
        this._logService.trace(`LanguageModelToolsService#isPermitted: Tool ${toolOrToolSet.id} (${toolOrToolSet.toolReferenceName}) permitted=false`);
        return false;
    }
    dispose() {
        super.dispose();
        this._callsByRequestId.forEach(calls => calls.forEach(call => call.store.dispose()));
        this._pendingToolCalls.clear();
        this._ctxToolsCount.reset();
    }
    registerToolData(toolData) {
        if (this._tools.has(toolData.id)) {
            throw new Error(`Tool "${toolData.id}" is already registered.`);
        }
        this._tools.set(toolData.id, { data: toolData });
        this._ctxToolsCount.set(this._tools.size);
        if (!this._onDidChangeToolsScheduler.isScheduled()) {
            this._onDidChangeToolsScheduler.schedule();
        }
        toolData.when?.keys().forEach(key => this._toolContextKeys.add(key));
        let store;
        if (toolData.inputSchema) {
            store = new DisposableStore();
            const schemaUrl = createToolSchemaUri(toolData.id).toString();
            jsonSchemaRegistry.registerSchema(schemaUrl, toolData.inputSchema, store);
            store.add(jsonSchemaRegistry.registerSchemaAssociation(schemaUrl, `/lm/tool/${toolData.id}/tool_input.json`));
        }
        return toDisposable(() => {
            store?.dispose();
            this._tools.delete(toolData.id);
            this._ctxToolsCount.set(this._tools.size);
            this._refreshAllToolContextKeys();
            if (!this._onDidChangeToolsScheduler.isScheduled()) {
                this._onDidChangeToolsScheduler.schedule();
            }
        });
    }
    flushToolUpdates() {
        this._onDidChangeToolsScheduler.flush();
    }
    _refreshAllToolContextKeys() {
        this._toolContextKeys.clear();
        for (const tool of this._tools.values()) {
            tool.data.when?.keys().forEach(key => this._toolContextKeys.add(key));
        }
    }
    registerToolImplementation(id, tool) {
        const entry = this._tools.get(id);
        if (!entry) {
            throw new Error(`Tool "${id}" was not contributed.`);
        }
        if (entry.impl) {
            throw new Error(`Tool "${id}" already has an implementation.`);
        }
        entry.impl = tool;
        return toDisposable(() => {
            entry.impl = undefined;
        });
    }
    registerTool(toolData, tool) {
        return combinedDisposable(this.registerToolData(toolData), this.registerToolImplementation(toolData.id, tool));
    }
    getTools(model) {
        const toolDatas = Iterable.map(this._tools.values(), i => i.data);
        const extensionToolsEnabled = this._configurationService.getValue(ChatConfiguration.ExtensionToolsEnabled);
        return Iterable.filter(toolDatas, toolData => {
            const satisfiesWhenClause = !toolData.when || this._contextKeyService.contextMatchesRules(toolData.when);
            const satisfiesExternalToolCheck = toolData.source.type !== 'extension' || !!extensionToolsEnabled;
            const satisfiesPermittedCheck = this.isPermitted(toolData);
            const satisfiesModelFilter = toolMatchesModel(toolData, model);
            return satisfiesWhenClause && satisfiesExternalToolCheck && satisfiesPermittedCheck && satisfiesModelFilter;
        });
    }
    observeTools(model) {
        const meta = derived(reader => {
            const signal = observableSignal('observeToolsContext');
            const trigger = () => transaction(tx => signal.trigger(tx));
            reader.store.add(this.onDidChangeTools(trigger));
            return signal;
        });
        return derivedOpts({ equalsFn: arrayEqualsC() }, reader => {
            meta.read(reader).read(reader);
            return Array.from(this.getTools(model));
        });
    }
    getAllToolsIncludingDisabled() {
        const toolDatas = Iterable.map(this._tools.values(), i => i.data);
        const extensionToolsEnabled = this._configurationService.getValue(ChatConfiguration.ExtensionToolsEnabled);
        return Iterable.filter(toolDatas, toolData => {
            const satisfiesExternalToolCheck = toolData.source.type !== 'extension' || !!extensionToolsEnabled;
            const satisfiesPermittedCheck = this.isPermitted(toolData);
            return satisfiesExternalToolCheck && satisfiesPermittedCheck;
        });
    }
    getTool(id) {
        return this._tools.get(id)?.data;
    }
    getToolByName(name) {
        for (const tool of this.getAllToolsIncludingDisabled()) {
            if (tool.toolReferenceName === name) {
                return tool;
            }
        }
        return undefined;
    }
    _handlePreToolUseDenial(dto, hookResult, toolData, pendingInvocation, request) {
        const hookReason = hookResult.permissionDecisionReason ?? localize(7803, null);
        const reason = localize(7804, null, HookType.PreToolUse, hookReason);
        this._logService.debug(`[LanguageModelToolsService#invokeTool] Tool ${dto.toolId} denied by preToolUse hook: ${hookReason}`);
        if (toolData) {
            if (pendingInvocation) {
                pendingInvocation.presentation = ToolInvocationPresentation.Hidden;
                pendingInvocation.cancelFromStreaming(0 /* ToolConfirmKind.Denied */, reason);
            }
            else if (request) {
                const cancelledInvocation = ChatToolInvocation.createCancelled({ toolCallId: dto.callId, toolId: dto.toolId, toolData, subagentInvocationId: dto.subAgentInvocationId, chatRequestId: dto.chatRequestId }, dto.parameters, 0 /* ToolConfirmKind.Denied */, reason);
                cancelledInvocation.presentation = ToolInvocationPresentation.Hidden;
                this._chatService.appendProgress(request, cancelledInvocation);
            }
        }
        return {
            content: [{ kind: 'text', value: `Tool execution denied: ${hookReason}` }],
            toolResultError: hookReason,
        };
    }
    /**
     * Validate updatedInput from a preToolUse hook against the tool's input schema
     * using the json.validate command from the JSON extension.
     * @returns An error message string if validation fails, or undefined if valid.
     */
    async _validateUpdatedInput(toolId, toolData, updatedInput) {
        if (!toolData?.inputSchema) {
            return undefined;
        }
        try {
            const schemaUri = createToolSchemaUri(toolId);
            const inputJson = JSON.stringify(updatedInput);
            const diagnostics = await this._commandService.executeCommand('json.validate', schemaUri, inputJson) || [];
            if (diagnostics.length > 0) {
                return diagnostics.map(d => d.message).join('; ');
            }
        }
        catch (e) {
            // json extension may not be available; skip validation
            this._logService.debug(`[LanguageModelToolsService#_validateUpdatedInput] json.validate command failed, skipping validation: ${toErrorMessage(e)}`);
        }
        return undefined;
    }
    async invokeTool(dto, countTokens, token) {
        this._logService.trace(`[LanguageModelToolsService#invokeTool] Invoking tool ${dto.toolId} with parameters ${JSON.stringify(dto.parameters)}`);
        const toolData = this._tools.get(dto.toolId)?.data;
        let model;
        let request;
        if (dto.context?.sessionResource) {
            model = this._chatService.getSession(dto.context.sessionResource);
            request = model?.getRequests().at(-1);
            if (request?.response?.isCanceled || request?.response?.isComplete) {
                this._logService.debug(`[LanguageModelToolsService#invokeTool] Ignoring tool ${dto.toolId} for cancelled/complete request ${request.id}`);
                throw new CancellationError();
            }
        }
        // Check if there's an existing pending tool call from streaming phase BEFORE hook check
        let pendingToolCallKey;
        let toolInvocation;
        if (this._pendingToolCalls.has(dto.callId)) {
            pendingToolCallKey = dto.callId;
            toolInvocation = this._pendingToolCalls.get(dto.callId);
        }
        else if (dto.chatStreamToolCallId && this._pendingToolCalls.has(dto.chatStreamToolCallId)) {
            pendingToolCallKey = dto.chatStreamToolCallId;
            toolInvocation = this._pendingToolCalls.get(dto.chatStreamToolCallId);
        }
        let requestId;
        let store;
        if (dto.context && request) {
            requestId = request.id;
            store = new DisposableStore();
            if (!this._callsByRequestId.has(requestId)) {
                this._callsByRequestId.set(requestId, []);
            }
            const trackedCall = { store };
            this._callsByRequestId.get(requestId).push(trackedCall);
            const source = new CancellationTokenSource();
            store.add(toDisposable(() => {
                source.dispose(true);
            }));
            store.add(token.onCancellationRequested((() => {
                IChatToolInvocation.confirmWith(toolInvocation, { type: 0 /* ToolConfirmKind.Denied */ });
                source.cancel();
            })));
            store.add(source.token.onCancellationRequested(() => {
                IChatToolInvocation.confirmWith(toolInvocation, { type: 0 /* ToolConfirmKind.Denied */ });
            }));
            token = source.token;
        }
        // Handle preToolUse hook denial
        const preToolUseHookResult = dto.preToolUseResult;
        if (preToolUseHookResult?.permissionDecision === 'deny') {
            const denialResult = this._handlePreToolUseDenial(dto, preToolUseHookResult, toolData, toolInvocation, request);
            if (pendingToolCallKey) {
                this._pendingToolCalls.delete(pendingToolCallKey);
            }
            return denialResult;
        }
        // Apply updatedInput from preToolUse hook if provided, after validating against the tool's input schema
        if (preToolUseHookResult?.updatedInput) {
            const validationError = await this._validateUpdatedInput(dto.toolId, toolData, preToolUseHookResult.updatedInput);
            if (validationError) {
                this._logService.warn(`[LanguageModelToolsService#invokeTool] Tool ${dto.toolId} updatedInput from preToolUse hook failed schema validation: ${validationError}`);
            }
            else {
                this._logService.debug(`[LanguageModelToolsService#invokeTool] Tool ${dto.toolId} input modified by preToolUse hook`);
                dto.parameters = preToolUseHookResult.updatedInput;
            }
        }
        // Fire the event to notify listeners that a tool is being invoked
        this._onDidInvokeTool.fire({
            toolId: dto.toolId,
            sessionResource: dto.context?.sessionResource,
            requestId: dto.chatRequestId,
            subagentInvocationId: dto.subAgentInvocationId,
        });
        // When invoking a tool, don't validate the "when" clause. An extension may have invoked a tool just as it was becoming disabled, and just let it go through rather than throw and break the chat.
        let tool = this._tools.get(dto.toolId);
        if (!tool) {
            throw new Error(`Tool ${dto.toolId} was not contributed`);
        }
        if (!tool.impl) {
            await this._extensionService.activateByEvent(`onLanguageModelTool:${dto.toolId}`);
            // Extension should activate and register the tool implementation
            tool = this._tools.get(dto.toolId);
            if (!tool?.impl) {
                throw new Error(`Tool ${dto.toolId} does not have an implementation registered.`);
            }
        }
        // Note: pending invocation lookup was already done above for the hook check
        const hadPendingInvocation = !!toolInvocation;
        if (hadPendingInvocation && pendingToolCallKey) {
            // Remove from pending since we're now invoking it
            this._pendingToolCalls.delete(pendingToolCallKey);
        }
        let toolResult;
        let prepareTimeWatch;
        let invocationTimeWatch;
        let preparedInvocation;
        try {
            if (dto.context) {
                if (!model) {
                    throw new Error(`Tool called for unknown chat session`);
                }
                if (!request) {
                    throw new Error(`Tool called for unknown chat request`);
                }
                dto.modelId = request.modelId;
                dto.userSelectedTools = request.userSelectedTools && { ...request.userSelectedTools };
                prepareTimeWatch = StopWatch.create(true);
                preparedInvocation = await this.prepareToolInvocationWithHookResult(tool, dto, preToolUseHookResult, token);
                prepareTimeWatch.stop();
                const { autoConfirmed, preparedInvocation: updatedPreparedInvocation } = await this.resolveAutoConfirmFromHook(preToolUseHookResult, tool, dto, preparedInvocation, dto.context?.sessionResource);
                preparedInvocation = updatedPreparedInvocation;
                // Important: a tool invocation that will be autoconfirmed should never
                // be in the chat response in the `NeedsConfirmation` state, even briefly,
                // as that triggers notifications and causes issues in eval.
                if (hadPendingInvocation && toolInvocation) {
                    // Transition from streaming to executing/waiting state
                    toolInvocation.transitionFromStreaming(preparedInvocation, dto.parameters, autoConfirmed);
                }
                else {
                    // Create a new tool invocation (no streaming phase)
                    toolInvocation = new ChatToolInvocation(preparedInvocation, tool.data, dto.chatStreamToolCallId ?? dto.callId, dto.subAgentInvocationId, dto.parameters);
                    if (autoConfirmed) {
                        IChatToolInvocation.confirmWith(toolInvocation, autoConfirmed);
                    }
                    this._chatService.appendProgress(request, toolInvocation);
                }
                dto.toolSpecificData = toolInvocation?.toolSpecificData;
                if (preparedInvocation?.confirmationMessages?.title) {
                    if (!IChatToolInvocation.executionConfirmedOrDenied(toolInvocation) && !autoConfirmed) {
                        this.playAccessibilitySignal([toolInvocation], dto.context?.sessionResource);
                    }
                    const userConfirmed = await IChatToolInvocation.awaitConfirmation(toolInvocation, token);
                    if (userConfirmed.type === 0 /* ToolConfirmKind.Denied */) {
                        throw new CancellationError();
                    }
                    if (userConfirmed.type === 5 /* ToolConfirmKind.Skipped */) {
                        toolResult = {
                            content: [{
                                    kind: 'text',
                                    value: 'The user chose to skip the tool call, they want to proceed without running it'
                                }]
                        };
                        return toolResult;
                    }
                    if (userConfirmed.type === 4 /* ToolConfirmKind.UserAction */ && userConfirmed.selectedButton) {
                        dto.selectedCustomButton = userConfirmed.selectedButton;
                    }
                    if (dto.toolSpecificData?.kind === 'input') {
                        dto.parameters = dto.toolSpecificData.rawInput;
                        dto.toolSpecificData = undefined;
                    }
                }
            }
            else {
                prepareTimeWatch = StopWatch.create(true);
                preparedInvocation = await this.prepareToolInvocationWithHookResult(tool, dto, preToolUseHookResult, token);
                prepareTimeWatch.stop();
                const { autoConfirmed: fallbackAutoConfirmed, preparedInvocation: updatedPreparedInvocation } = await this.resolveAutoConfirmFromHook(preToolUseHookResult, tool, dto, preparedInvocation, undefined);
                preparedInvocation = updatedPreparedInvocation;
                if (preparedInvocation?.confirmationMessages?.title && !fallbackAutoConfirmed) {
                    const result = await this._dialogService.confirm({ message: renderAsPlaintext(preparedInvocation.confirmationMessages.title), detail: renderAsPlaintext(preparedInvocation.confirmationMessages.message) });
                    if (!result.confirmed) {
                        throw new CancellationError();
                    }
                }
                dto.toolSpecificData = preparedInvocation?.toolSpecificData;
            }
            if (token.isCancellationRequested) {
                throw new CancellationError();
            }
            invocationTimeWatch = StopWatch.create(true);
            toolResult = await tool.impl.invoke(dto, countTokens, {
                report: step => {
                    toolInvocation?.acceptProgress(step);
                }
            }, token);
            invocationTimeWatch.stop();
            this.ensureToolDetails(dto, toolResult, tool.data, toolInvocation);
            const afterExecuteState = await toolInvocation?.didExecuteTool(toolResult, undefined, () => this.shouldAutoConfirmPostExecution(tool.data.id, tool.data.runsInWorkspace, tool.data.source, dto.parameters, dto.context?.sessionResource, dto.chatRequestId));
            if (toolInvocation && afterExecuteState?.type === 3 /* IChatToolInvocation.StateKind.WaitingForPostApproval */) {
                const postConfirm = await IChatToolInvocation.awaitPostConfirmation(toolInvocation, token);
                if (postConfirm.type === 0 /* ToolConfirmKind.Denied */) {
                    throw new CancellationError();
                }
                if (postConfirm.type === 5 /* ToolConfirmKind.Skipped */) {
                    toolResult = {
                        content: [{
                                kind: 'text',
                                value: 'The tool executed but the user chose not to share the results'
                            }]
                    };
                }
            }
            this._telemetryService.publicLog2('languageModelToolInvoked', {
                result: 'success',
                chatSessionId: dto.context?.sessionResource ? chatSessionResourceToId(dto.context.sessionResource) : undefined,
                toolId: tool.data.id,
                toolExtensionId: tool.data.source.type === 'extension' ? tool.data.source.extensionId.value : undefined,
                toolSourceKind: tool.data.source.type,
                prepareTimeMs: prepareTimeWatch?.elapsed(),
                invocationTimeMs: invocationTimeWatch?.elapsed(),
            });
            return toolResult;
        }
        catch (err) {
            const result = isCancellationError(err) ? 'userCancelled' : 'error';
            this._telemetryService.publicLog2('languageModelToolInvoked', {
                result,
                chatSessionId: dto.context?.sessionResource ? chatSessionResourceToId(dto.context.sessionResource) : undefined,
                toolId: tool.data.id,
                toolExtensionId: tool.data.source.type === 'extension' ? tool.data.source.extensionId.value : undefined,
                toolSourceKind: tool.data.source.type,
                prepareTimeMs: prepareTimeWatch?.elapsed(),
                invocationTimeMs: invocationTimeWatch?.elapsed(),
            });
            if (!isCancellationError(err)) {
                this._logService.error(`[LanguageModelToolsService#invokeTool] Error from tool ${dto.toolId} with parameters ${JSON.stringify(dto.parameters)}:\n${toErrorMessage(err, true)}`);
            }
            toolResult ??= { content: [] };
            toolResult.toolResultError = err instanceof Error ? err.message : String(err);
            if (tool.data.alwaysDisplayInputOutput) {
                toolResult.toolResultDetails = { input: this.formatToolInput(dto), output: [{ type: 'embed', isText: true, value: String(err) }], isError: true };
            }
            throw err;
        }
        finally {
            toolInvocation?.didExecuteTool(toolResult, true);
            if (store) {
                this.cleanupCallDisposables(requestId, store);
            }
        }
    }
    async prepareToolInvocationWithHookResult(tool, dto, hookResult, token) {
        let forceConfirmationReason;
        if (hookResult?.permissionDecision === 'ask') {
            const hookMessage = localize(7805, null, HookType.PreToolUse);
            forceConfirmationReason = hookResult.permissionDecisionReason
                ? `${hookMessage}: ${hookResult.permissionDecisionReason}`
                : hookMessage;
        }
        return this.prepareToolInvocation(tool, dto, forceConfirmationReason, token);
    }
    /**
     * Determines the auto-confirm decision based on a preToolUse hook result.
     * If the hook returned 'allow', auto-approves. If 'ask', forces confirmation
     * and ensures confirmation messages exist on `preparedInvocation`. Otherwise
     * falls back to normal auto-confirm logic.
     *
     * Returns the possibly-updated preparedInvocation along with the auto-confirm decision,
     * since when the hook returns 'ask' and preparedInvocation was undefined, we create one.
     */
    async resolveAutoConfirmFromHook(hookResult, tool, dto, preparedInvocation, sessionResource) {
        if (hookResult?.permissionDecision === 'allow') {
            this._logService.debug(`[LanguageModelToolsService#invokeTool] Tool ${dto.toolId} auto-approved by preToolUse hook`);
            return { autoConfirmed: { type: 1 /* ToolConfirmKind.ConfirmationNotNeeded */, reason: localize(7806, null) }, preparedInvocation };
        }
        if (hookResult?.permissionDecision === 'ask') {
            this._logService.debug(`[LanguageModelToolsService#invokeTool] Tool ${dto.toolId} requires confirmation (preToolUse hook returned 'ask')`);
            // Ensure confirmation messages exist when hook requires confirmation
            if (!preparedInvocation?.confirmationMessages?.title) {
                if (!preparedInvocation) {
                    preparedInvocation = {};
                }
                const fullReferenceName = getToolFullReferenceName(tool.data);
                const hookReason = hookResult.permissionDecisionReason;
                const hookNote = hookReason
                    ? localize(7807, null, HookType.PreToolUse, hookReason)
                    : localize(7808, null, HookType.PreToolUse);
                preparedInvocation.confirmationMessages = {
                    ...preparedInvocation.confirmationMessages,
                    title: localize(7809, null, fullReferenceName),
                    message: new MarkdownString(`_${hookNote}_`),
                    allowAutoConfirm: false,
                };
                preparedInvocation.toolSpecificData = {
                    kind: 'input',
                    rawInput: dto.parameters,
                };
            }
            else {
                // Tool already has its own confirmation - prepend hook note
                const hookReason = hookResult.permissionDecisionReason;
                const hookNote = hookReason
                    ? localize(7810, null, HookType.PreToolUse, hookReason)
                    : localize(7811, null, HookType.PreToolUse);
                const existing = preparedInvocation.confirmationMessages;
                if (preparedInvocation.toolSpecificData?.kind === 'terminal') {
                    // Terminal tools render message as hover only; use disclaimer for visible text
                    const existingDisclaimerText = existing.disclaimer
                        ? (typeof existing.disclaimer === 'string' ? existing.disclaimer : existing.disclaimer.value)
                        : undefined;
                    const combinedDisclaimer = existingDisclaimerText
                        ? `${hookNote}\n\n${existingDisclaimerText}`
                        : hookNote;
                    preparedInvocation.confirmationMessages = {
                        ...existing,
                        disclaimer: combinedDisclaimer,
                        allowAutoConfirm: false,
                    };
                }
                else {
                    // Edit/other tools: prepend hook note to the message body
                    const msgText = typeof existing.message === 'string' ? existing.message : existing.message?.value ?? '';
                    preparedInvocation.confirmationMessages = {
                        ...existing,
                        message: new MarkdownString(`_${hookNote}_\n\n${msgText}`),
                        allowAutoConfirm: false,
                    };
                }
            }
            return { autoConfirmed: undefined, preparedInvocation };
        }
        // No hook decision - use normal auto-confirm logic
        const autoConfirmed = await this.shouldAutoConfirm(tool.data.id, tool.data.runsInWorkspace, tool.data.source, dto.parameters, sessionResource, dto.chatRequestId);
        return { autoConfirmed, preparedInvocation };
    }
    async prepareToolInvocation(tool, dto, forceConfirmationReason, token) {
        let prepared;
        if (tool.impl.prepareToolInvocation) {
            const preparePromise = tool.impl.prepareToolInvocation({
                parameters: dto.parameters,
                toolCallId: dto.callId,
                chatRequestId: dto.chatRequestId,
                chatSessionResource: dto.context?.sessionResource,
                chatInteractionId: dto.chatInteractionId,
                modelId: dto.modelId,
                forceConfirmationReason: forceConfirmationReason
            }, token);
            const raceResult = await Promise.race([
                timeout(3000, token).then(() => 'timeout'),
                preparePromise
            ]);
            if (raceResult === 'timeout' && dto.context) {
                this._onDidPrepareToolCallBecomeUnresponsive.fire({
                    sessionResource: dto.context.sessionResource,
                    toolData: tool.data
                });
            }
            prepared = await preparePromise;
        }
        const isEligibleForAutoApproval = this.isToolEligibleForAutoApproval(tool.data);
        // Default confirmation messages if tool is not eligible for auto-approval
        if (!isEligibleForAutoApproval && !prepared?.confirmationMessages?.title) {
            if (!prepared) {
                prepared = {};
            }
            const fullReferenceName = getToolFullReferenceName(tool.data);
            // TODO: This should be more detailed per tool.
            prepared.confirmationMessages = {
                ...prepared.confirmationMessages,
                title: localize(7812, null),
                message: localize(7813, null, fullReferenceName),
                disclaimer: toolIdsThatCannotBeAutoApproved.has(tool.data.id) ? undefined : new MarkdownString(localize(7814, null, getToolFullReferenceName(tool.data), createMarkdownCommandLink({ text: '`' + ChatConfiguration.EligibleForAutoApproval + '`', id: 'workbench.action.openSettings', arguments: [ChatConfiguration.EligibleForAutoApproval], tooltip: localize(7815, null) }, false)), { isTrusted: true }),
                allowAutoConfirm: false,
            };
        }
        if (!isEligibleForAutoApproval && prepared?.confirmationMessages?.title) {
            // Always overwrite the disclaimer if not eligible for auto-approval
            prepared.confirmationMessages.disclaimer = toolIdsThatCannotBeAutoApproved.has(tool.data.id) ? undefined : new MarkdownString(localize(7816, null, getToolFullReferenceName(tool.data), createMarkdownCommandLink({ text: '`' + ChatConfiguration.EligibleForAutoApproval + '`', id: 'workbench.action.openSettings', arguments: [ChatConfiguration.EligibleForAutoApproval], tooltip: localize(7817, null) }, false)), { isTrusted: true });
        }
        if (prepared?.confirmationMessages?.title) {
            if (prepared.toolSpecificData?.kind !== 'terminal' && prepared.confirmationMessages.allowAutoConfirm !== false) {
                prepared.confirmationMessages.allowAutoConfirm = isEligibleForAutoApproval;
            }
            if (!prepared.toolSpecificData && tool.data.alwaysDisplayInputOutput) {
                prepared.toolSpecificData = {
                    kind: 'input',
                    rawInput: dto.parameters,
                };
            }
        }
        return prepared;
    }
    beginToolCall(options) {
        // First try to look up by tool ID (the package.json "name" field),
        // then fall back to looking up by toolReferenceName
        const toolEntry = this._tools.get(options.toolId);
        if (!toolEntry) {
            return undefined;
        }
        // Don't create a streaming invocation for tools that don't implement handleToolStream.
        // These tools will have their invocation created directly in invokeToolInternal.
        if (!toolEntry.impl?.handleToolStream) {
            return undefined;
        }
        // Create the invocation in streaming state
        const invocation = ChatToolInvocation.createStreaming({
            toolCallId: options.toolCallId,
            toolId: options.toolId,
            toolData: toolEntry.data,
            subagentInvocationId: options.subagentInvocationId,
            chatRequestId: options.chatRequestId,
        });
        // Track the pending tool call
        this._pendingToolCalls.set(options.toolCallId, invocation);
        // If we have a session, append the invocation to the chat as progress
        if (options.sessionResource) {
            const model = this._chatService.getSession(options.sessionResource);
            if (model) {
                // Find the request by chatRequestId if available, otherwise use the last request
                const request = (options.chatRequestId
                    ? model.getRequests().find(r => r.id === options.chatRequestId)
                    : undefined) ?? model.getRequests().at(-1);
                if (request) {
                    this._chatService.appendProgress(request, invocation);
                }
            }
        }
        // Call handleToolStream to get initial streaming message
        this._callHandleToolStream(toolEntry, invocation, options.toolCallId, undefined, CancellationToken.None);
        return invocation;
    }
    async _callHandleToolStream(toolEntry, invocation, toolCallId, rawInput, token) {
        if (!toolEntry.impl?.handleToolStream) {
            return;
        }
        try {
            const result = await toolEntry.impl.handleToolStream({
                toolCallId,
                rawInput,
                chatRequestId: invocation.chatRequestId,
            }, token);
            if (result?.invocationMessage) {
                invocation.updateStreamingMessage(result.invocationMessage);
            }
        }
        catch (error) {
            this._logService.error(`[LanguageModelToolsService#_callHandleToolStream] Error calling handleToolStream for tool ${toolEntry.data.id}:`, error);
        }
    }
    async updateToolStream(toolCallId, partialInput, token) {
        const invocation = this._pendingToolCalls.get(toolCallId);
        if (!invocation) {
            return;
        }
        // Update the partial input on the invocation
        invocation.updatePartialInput(partialInput);
        // Call handleToolStream if the tool implements it
        const toolEntry = this._tools.get(invocation.toolId);
        if (toolEntry) {
            await this._callHandleToolStream(toolEntry, invocation, toolCallId, partialInput, token);
        }
    }
    playAccessibilitySignal(toolInvocations, chatSessionResource) {
        const autoApproved = this._configurationService.getValue(ChatConfiguration.GlobalAutoApprove);
        if (autoApproved) {
            return;
        }
        // Autopilot/auto-approve permission levels auto-approve all tools, skip signal
        if (chatSessionResource) {
            const model = this._chatService.getSession(chatSessionResource);
            const request = model?.getRequests().at(-1);
            if (isAutoApproveLevel(request?.modeInfo?.permissionLevel) || this._isSessionLiveAutoApproveLevel(chatSessionResource)) {
                return;
            }
        }
        // Filter out any tool invocations that have already been confirmed/denied.
        // This is a defensive check - normally the call site should prevent this,
        // but tools may be auto-approved through various mechanisms (per-session rules,
        // per-workspace rules, etc.) that could cause a race condition.
        const pendingInvocations = toolInvocations.filter(inv => !IChatToolInvocation.executionConfirmedOrDenied(inv));
        if (pendingInvocations.length === 0) {
            return;
        }
        const setting = this._configurationService.getValue(AccessibilitySignal.chatUserActionRequired.settingsKey);
        if (!setting) {
            return;
        }
        const soundEnabled = setting.sound === 'on' || (setting.sound === 'auto' && (this._accessibilityService.isScreenReaderOptimized()));
        const announcementEnabled = this._accessibilityService.isScreenReaderOptimized() && setting.announcement === 'auto';
        if (soundEnabled || announcementEnabled) {
            this._accessibilitySignalService.playSignal(AccessibilitySignal.chatUserActionRequired, { customAlertMessage: this._instantiationService.invokeFunction(getToolConfirmationAlert, pendingInvocations), userGesture: true, modality: !soundEnabled ? 'announcement' : undefined });
        }
    }
    ensureToolDetails(dto, toolResult, toolData, toolInvocation) {
        if (!toolResult.toolResultDetails && (toolData.alwaysDisplayInputOutput || (this.toolResultHasImages(toolResult) && !this.toolResultMessageHasImageFileWidgets(toolResult, toolInvocation)))) {
            toolResult.toolResultDetails = {
                input: this.formatToolInput(dto),
                output: this.toolResultToIO(toolResult),
            };
        }
    }
    toolResultHasImages(toolResult) {
        return toolResult.content.some(part => part.kind === 'data' && part.value.mimeType?.startsWith('image/'));
    }
    /**
     * Returns true if the tool result message (or falling back to the tool invocation's
     * pastTenseMessage from streaming) contains empty markdown links pointing to image
     * files (the `[](imageUri)` pattern) that will be rendered as file pills by renderFileWidgets.
     */
    toolResultMessageHasImageFileWidgets(toolResult, toolInvocation) {
        // Check toolResult.toolResultMessage first — this is what didExecuteTool will
        // copy into pastTenseMessage, and it's already available at this point.
        // Fall back to pastTenseMessage which may have been set during the streaming phase.
        const message = toolResult.toolResultMessage ?? toolInvocation?.pastTenseMessage;
        if (!message) {
            return false;
        }
        const value = typeof message === 'string' ? message : message.value;
        // Match empty-text markdown links: [](uri) or [ ](uri), capturing the uri
        const linkPattern = /\[\s*\]\((?<uri>[^)]+)\)/g;
        let match;
        while ((match = linkPattern.exec(value)) !== null) {
            try {
                const parsed = URI.parse(match.groups.uri);
                const mime = getMediaMime(parsed.path);
                if (mime?.startsWith('image/')) {
                    return true;
                }
            }
            catch {
                // Invalid URI, skip
            }
        }
        return false;
    }
    formatToolInput(dto) {
        return JSON.stringify(dto.parameters, undefined, 2);
    }
    toolResultToIO(toolResult) {
        return toolResult.content.map(part => {
            if (part.kind === 'text') {
                return { type: 'embed', isText: true, value: part.value };
            }
            else if (part.kind === 'promptTsx') {
                return { type: 'embed', isText: true, value: stringifyPromptTsxPart(part) };
            }
            else if (part.kind === 'data') {
                return { type: 'embed', value: encodeBase64(part.value.data), mimeType: part.value.mimeType };
            }
            else {
                assertNever(part);
            }
        });
    }
    /**
     * Returns true if enterprise policy has explicitly disabled the global auto-approve setting.
     * When this is the case, Bypass Approvals and Autopilot permission levels should not auto-approve tools.
     */
    _isAutoApprovePolicyRestricted() {
        const inspected = this._configurationService.inspect(ChatConfiguration.GlobalAutoApprove);
        return inspected.policyValue === false;
    }
    /**
     * Returns true if the session's current (live) permission picker level is auto-approve.
     * This checks the widget's current state, not what was stamped on the request,
     * so switching to Autopilot mid-session takes effect immediately.
     */
    _isSessionLiveAutoApproveLevel(chatSessionResource) {
        const widget = this._chatWidgetService.getWidgetBySessionResource(chatSessionResource)
            ?? this._chatWidgetService.lastFocusedWidget;
        return !!widget && isAutoApproveLevel(widget.input.currentModeInfo.permissionLevel);
    }
    getEligibleForAutoApprovalSpecialCase(toolData) {
        if (toolData.id === 'vscode_fetchWebPage_internal') {
            return 'fetch';
        }
        return undefined;
    }
    isToolEligibleForAutoApproval(toolData) {
        const fullReferenceName = this.getEligibleForAutoApprovalSpecialCase(toolData) ?? getToolFullReferenceName(toolData);
        if (toolData.id === 'copilot_fetchWebPage') {
            // Special case, this fetch will call an internal tool 'vscode_fetchWebPage_internal'
            return true;
        }
        if (toolIdsThatCannotBeAutoApproved.has(toolData.id)) {
            // Special case, this tool will always require user confirmation as there are multiple options,
            // These aren't LM generated instead are generated by extension before agentic loop starts.
            return false;
        }
        const eligibilityConfig = this._configurationService.getValue(ChatConfiguration.EligibleForAutoApproval);
        if (eligibilityConfig && typeof eligibilityConfig === 'object' && fullReferenceName) {
            // Direct match
            if (Object.prototype.hasOwnProperty.call(eligibilityConfig, fullReferenceName)) {
                return eligibilityConfig[fullReferenceName];
            }
            // Back compat with legacy names
            if (toolData.legacyToolReferenceFullNames) {
                for (const legacyName of toolData.legacyToolReferenceFullNames) {
                    // Check if the full legacy name is in the config
                    if (Object.prototype.hasOwnProperty.call(eligibilityConfig, legacyName)) {
                        return eligibilityConfig[legacyName];
                    }
                    // Some tools may be both renamed and namespaced from a toolset, eg: xxx/yyy -> yyy
                    if (legacyName.includes('/')) {
                        const trimmedLegacyName = legacyName.split('/').pop();
                        if (trimmedLegacyName && Object.prototype.hasOwnProperty.call(eligibilityConfig, trimmedLegacyName)) {
                            return eligibilityConfig[trimmedLegacyName];
                        }
                    }
                }
            }
        }
        return true;
    }
    async shouldAutoConfirm(toolId, runsInWorkspace, source, parameters, chatSessionResource, chatRequestId) {
        const tool = this._tools.get(toolId);
        if (!tool) {
            return undefined;
        }
        // Auto-Approve All permission level bypasses all tool confirmations,
        // unless enterprise policy has explicitly disabled global auto-approve.
        // Check both the request-stamped level AND the live picker level so that
        // switching to Autopilot mid-session takes effect immediately.
        if (chatSessionResource && !this._isAutoApprovePolicyRestricted()) {
            const model = this._chatService.getSession(chatSessionResource);
            const request = model?.getRequests().at(-1);
            if (isAutoApproveLevel(request?.modeInfo?.permissionLevel) || this._isSessionLiveAutoApproveLevel(chatSessionResource)) {
                // CLI sessions must always show their multi-option confirmation dialogs
                // (e.g. uncommitted-changes prompt) even under Bypass Approvals
                if (!(toolIdsThatCannotBeAutoApproved.has(tool.data.id) && getChatSessionType(chatSessionResource) !== localChatSessionType)) {
                    return { type: 1 /* ToolConfirmKind.ConfirmationNotNeeded */, reason: 'auto-approve-all' };
                }
            }
        }
        if (!this.isToolEligibleForAutoApproval(tool.data)) {
            return undefined;
        }
        const reason = this._confirmationService.getPreConfirmAction({ toolId, source, parameters, chatSessionResource });
        if (reason) {
            return reason;
        }
        const config = this._configurationService.inspect(ChatConfiguration.GlobalAutoApprove);
        // If we know the tool runs at a global level, only consider the global config.
        // If we know the tool runs at a workspace level, use those specific settings when appropriate.
        let value = config.value ?? config.defaultValue;
        if (typeof runsInWorkspace === 'boolean') {
            value = config.userLocalValue ?? config.applicationValue;
            if (runsInWorkspace) {
                value = config.workspaceValue ?? config.workspaceFolderValue ?? config.userRemoteValue ?? value;
            }
        }
        const autoConfirm = value === true || (typeof value === 'object' && value.hasOwnProperty(toolId) && value[toolId] === true);
        if (autoConfirm) {
            if (await this._checkGlobalAutoApprove()) {
                return { type: 2 /* ToolConfirmKind.Setting */, id: ChatConfiguration.GlobalAutoApprove };
            }
        }
        return undefined;
    }
    async shouldAutoConfirmPostExecution(toolId, runsInWorkspace, source, parameters, chatSessionResource, chatRequestId) {
        // Auto-Approve All permission level bypasses all post-execution confirmations,
        // unless enterprise policy has explicitly disabled global auto-approve.
        // Check both the request-stamped level AND the live picker level.
        if (chatSessionResource && !this._isAutoApprovePolicyRestricted()) {
            const model = this._chatService.getSession(chatSessionResource);
            const request = model?.getRequests().at(-1);
            if (isAutoApproveLevel(request?.modeInfo?.permissionLevel) || this._isSessionLiveAutoApproveLevel(chatSessionResource)) {
                if (!(toolIdsThatCannotBeAutoApproved.has(toolId) && getChatSessionType(chatSessionResource) !== localChatSessionType)) {
                    return { type: 1 /* ToolConfirmKind.ConfirmationNotNeeded */, reason: 'auto-approve-all' };
                }
            }
        }
        if (this._configurationService.getValue(ChatConfiguration.GlobalAutoApprove) && await this._checkGlobalAutoApprove()) {
            return { type: 2 /* ToolConfirmKind.Setting */, id: ChatConfiguration.GlobalAutoApprove };
        }
        return this._confirmationService.getPostConfirmAction({ toolId, source, parameters, chatSessionResource });
    }
    async _checkGlobalAutoApprove() {
        const optedIn = this._storageService.getBoolean("chat.tools.global.autoApprove.optIn" /* AutoApproveStorageKeys.GlobalAutoApproveOptIn */, -1 /* StorageScope.APPLICATION */, false);
        if (optedIn) {
            return true;
        }
        if (this._contextKeyService.getContextKeyValue(SkipAutoApproveConfirmationKey) === true) {
            return true;
        }
        if (this._pendingGlobalAutoApproveCheck) {
            return this._pendingGlobalAutoApproveCheck;
        }
        this._pendingGlobalAutoApproveCheck = this._doCheckGlobalAutoApprove();
        try {
            return await this._pendingGlobalAutoApproveCheck;
        }
        finally {
            this._pendingGlobalAutoApproveCheck = undefined;
        }
    }
    async _doCheckGlobalAutoApprove() {
        const store = new DisposableStore();
        try {
            // Dismiss the dialog automatically if another window stores the
            // opt-in flag, avoiding duplicate approval prompts.
            const cts = new CancellationTokenSource();
            store.add(cts);
            store.add(this._storageService.onDidChangeValue(-1 /* StorageScope.APPLICATION */, "chat.tools.global.autoApprove.optIn" /* AutoApproveStorageKeys.GlobalAutoApproveOptIn */, store)(() => {
                if (this._storageService.getBoolean("chat.tools.global.autoApprove.optIn" /* AutoApproveStorageKeys.GlobalAutoApproveOptIn */, -1 /* StorageScope.APPLICATION */, false)) {
                    cts.cancel();
                }
            }));
            const promptResult = await this._dialogService.prompt({
                type: Severity.Warning,
                message: localize(7818, null),
                buttons: [
                    {
                        label: localize(7819, null),
                        run: () => true
                    },
                    {
                        label: localize(7820, null),
                        run: () => false
                    },
                ],
                custom: {
                    icon: Codicon.warning,
                    markdownDetails: [{
                            markdown: new MarkdownString(globalAutoApproveDescription.value, { isTrusted: { enabledCommands: ['workbench.action.openSettings'] } }),
                        }],
                },
                token: cts.token,
            });
            // If cancelled by cross-window approval, treat as approved
            if (cts.token.isCancellationRequested) {
                return true;
            }
            if (promptResult.result !== true) {
                await this._configurationService.updateValue(ChatConfiguration.GlobalAutoApprove, false);
                return false;
            }
            this._storageService.store("chat.tools.global.autoApprove.optIn" /* AutoApproveStorageKeys.GlobalAutoApproveOptIn */, true, -1 /* StorageScope.APPLICATION */, 0 /* StorageTarget.USER */);
            return true;
        }
        finally {
            store.dispose();
        }
    }
    cleanupCallDisposables(requestId, store) {
        if (requestId) {
            const disposables = this._callsByRequestId.get(requestId);
            if (disposables) {
                const index = disposables.findIndex(d => d.store === store);
                if (index > -1) {
                    disposables.splice(index, 1);
                }
                if (disposables.length === 0) {
                    this._callsByRequestId.delete(requestId);
                }
            }
        }
        store.dispose();
    }
    cancelToolCallsForRequest(requestId) {
        const calls = this._callsByRequestId.get(requestId);
        if (calls) {
            calls.forEach(call => call.store.dispose());
            this._callsByRequestId.delete(requestId);
        }
        // Clean up any pending tool calls that belong to this request
        for (const [toolCallId, invocation] of this._pendingToolCalls) {
            if (invocation.chatRequestId === requestId) {
                this._pendingToolCalls.delete(toolCallId);
            }
        }
    }
    static { this.githubMCPServerAliases = ['github/github-mcp-server', 'io.github.github/github-mcp-server', 'github-mcp-server']; }
    static { this.playwrightMCPServerAliases = ['microsoft/playwright-mcp', 'com.microsoft/playwright-mcp']; }
    *getToolSetAliases(toolSet, fullReferenceName) {
        if (fullReferenceName !== toolSet.referenceName) {
            yield toolSet.referenceName; // tool set name without '/*'
        }
        if (toolSet.legacyFullNames) {
            yield* toolSet.legacyFullNames;
        }
        switch (toolSet.referenceName) {
            case 'github':
                for (const alias of LanguageModelToolsService_1.githubMCPServerAliases) {
                    yield alias + '/*';
                }
                break;
            case 'playwright':
                for (const alias of LanguageModelToolsService_1.playwrightMCPServerAliases) {
                    yield alias + '/*';
                }
                break;
            case SpecedToolAliases.execute: // 'execute'
                yield 'shell'; // legacy alias
                break;
            case SpecedToolAliases.agent: // 'agent'
                yield VSCodeToolReference.runSubagent; // prefer the tool set over th old tool name
                yield 'custom-agent'; // legacy alias
                break;
        }
    }
    *getToolAliases(toolSet, fullReferenceName) {
        const referenceName = toolSet.toolReferenceName ?? toolSet.displayName;
        if (fullReferenceName !== referenceName && referenceName !== VSCodeToolReference.runSubagent) {
            yield referenceName; // simple name, without toolset name
        }
        if (toolSet.legacyToolReferenceFullNames) {
            for (const legacyName of toolSet.legacyToolReferenceFullNames) {
                yield legacyName;
                const lastSlashIndex = legacyName.lastIndexOf('/');
                if (lastSlashIndex !== -1) {
                    yield legacyName.substring(lastSlashIndex + 1); // it was also known under the simple name
                }
            }
        }
        const slashIndex = fullReferenceName.lastIndexOf('/');
        if (slashIndex !== -1) {
            switch (fullReferenceName.substring(0, slashIndex)) {
                case 'github':
                    for (const alias of LanguageModelToolsService_1.githubMCPServerAliases) {
                        yield alias + fullReferenceName.substring(slashIndex);
                    }
                    break;
                case 'playwright':
                    for (const alias of LanguageModelToolsService_1.playwrightMCPServerAliases) {
                        yield alias + fullReferenceName.substring(slashIndex);
                    }
                    break;
            }
        }
    }
    /**
     * Create a map that contains all tools and toolsets with their enablement state.
     * @param fullReferenceNames A list of tool or toolset by their full reference names that are enabled.
     * @returns A map of tool or toolset instances to their enablement state.
     */
    toToolAndToolSetEnablementMap(fullReferenceNames, model) {
        const toolOrToolSetNames = new Set(fullReferenceNames);
        const result = new Map();
        for (const [tool, fullReferenceName] of this.toolsWithFullReferenceName.get()) {
            if (isToolSet(tool)) {
                const enabled = toolOrToolSetNames.has(fullReferenceName) || Iterable.some(this.getToolSetAliases(tool, fullReferenceName), name => toolOrToolSetNames.has(name));
                const scoped = model ? new ToolSetForModel(tool, model) : tool;
                result.set(scoped, enabled);
                if (enabled) {
                    for (const memberTool of scoped.getTools()) {
                        result.set(memberTool, true);
                    }
                }
            }
            else {
                if (model && !toolMatchesModel(tool, model)) {
                    continue;
                }
                if (!result.has(tool)) { // already set via an enabled toolset
                    const enabled = toolOrToolSetNames.has(fullReferenceName)
                        || Iterable.some(this.getToolAliases(tool, fullReferenceName), name => toolOrToolSetNames.has(name))
                        || !!tool.legacyToolReferenceFullNames?.some(toolFullName => {
                            // enable tool if just the legacy tool set name is present
                            const index = toolFullName.lastIndexOf('/');
                            return index !== -1 && toolOrToolSetNames.has(toolFullName.substring(0, index));
                        });
                    result.set(tool, enabled);
                }
            }
        }
        // also add all user tool sets (not part of the prompt referencable tools)
        for (const toolSet of this._toolSets) {
            if (toolSet.source.type === 'user') {
                const enabled = Iterable.every(toolSet.getTools(), t => result.get(t) === true);
                result.set(toolSet, enabled);
            }
        }
        return result;
    }
    toFullReferenceNames(map) {
        const result = [];
        const toolsCoveredByEnabledToolSet = new Set();
        for (const [tool, fullReferenceName] of this.toolsWithFullReferenceName.get()) {
            if (isToolSet(tool)) {
                if (map.get(tool)) {
                    result.push(fullReferenceName);
                    for (const memberTool of tool.getTools()) {
                        toolsCoveredByEnabledToolSet.add(memberTool);
                    }
                }
            }
            else {
                if (map.get(tool) && !toolsCoveredByEnabledToolSet.has(tool)) {
                    result.push(fullReferenceName);
                }
            }
        }
        return result;
    }
    toToolReferences(variableReferences) {
        const toolsOrToolSetByName = new Map();
        for (const [tool, fullReferenceName] of this.toolsWithFullReferenceName.get()) {
            toolsOrToolSetByName.set(fullReferenceName, tool);
        }
        const result = [];
        for (const ref of variableReferences) {
            const toolOrToolSet = toolsOrToolSetByName.get(ref.name);
            if (toolOrToolSet) {
                if (isToolSet(toolOrToolSet)) {
                    result.push(toToolSetVariableEntry(toolOrToolSet, ref.range));
                }
                else {
                    result.push(toToolVariableEntry(toolOrToolSet, ref.range));
                }
            }
        }
        return result;
    }
    getToolSetsForModel(model, reader) {
        if (!model) {
            return this.toolSets.read(reader);
        }
        return Iterable.map(this.toolSets.read(reader), ts => new ToolSetForModel(ts, model));
    }
    getToolSet(id) {
        for (const toolSet of this._toolSets) {
            if (toolSet.id === id) {
                return toolSet;
            }
        }
        return undefined;
    }
    getToolSetByName(name) {
        for (const toolSet of this._toolSets) {
            if (toolSet.referenceName === name) {
                return toolSet;
            }
        }
        return undefined;
    }
    getSpecedToolSetName(referenceName) {
        if (LanguageModelToolsService_1.githubMCPServerAliases.includes(referenceName)) {
            return 'github';
        }
        if (LanguageModelToolsService_1.playwrightMCPServerAliases.includes(referenceName)) {
            return 'playwright';
        }
        return referenceName;
    }
    createToolSet(source, id, referenceName, options) {
        const that = this;
        referenceName = this.getSpecedToolSetName(referenceName);
        const result = new class extends ToolSet {
            dispose() {
                if (that._toolSets.has(result)) {
                    this._tools.clear();
                    that._toolSets.delete(result);
                }
            }
        }(id, referenceName, options?.icon ?? Codicon.tools, source, options?.description, options?.legacyFullNames, this._contextKeyService);
        this._toolSets.add(result);
        return result;
    }
    *getFullReferenceNames() {
        for (const [, fullReferenceName] of this.toolsWithFullReferenceName.get()) {
            yield fullReferenceName;
        }
    }
    getDeprecatedFullReferenceNames() {
        const result = new Map();
        const knownToolSetNames = new Set();
        const add = (name, fullReferenceName) => {
            if (name !== fullReferenceName) {
                if (!result.has(name)) {
                    result.set(name, new Set());
                }
                result.get(name).add(fullReferenceName);
            }
        };
        for (const [tool, _] of this.toolsWithFullReferenceName.get()) {
            if (isToolSet(tool)) {
                knownToolSetNames.add(tool.referenceName);
                if (tool.legacyFullNames) {
                    for (const legacyName of tool.legacyFullNames) {
                        knownToolSetNames.add(legacyName);
                    }
                }
            }
        }
        for (const [tool, fullReferenceName] of this.toolsWithFullReferenceName.get()) {
            if (isToolSet(tool)) {
                for (const alias of this.getToolSetAliases(tool, fullReferenceName)) {
                    add(alias, fullReferenceName);
                }
            }
            else {
                for (const alias of this.getToolAliases(tool, fullReferenceName)) {
                    add(alias, fullReferenceName);
                }
                if (tool.legacyToolReferenceFullNames) {
                    // If the tool is in a toolset (fullReferenceName has a '/'), also add the
                    // namespaced form of legacy names (e.g. 'vscode/oldName' → 'vscode/newName')
                    const slashIndex = fullReferenceName.lastIndexOf('/');
                    const toolSetPrefix = slashIndex !== -1 ? fullReferenceName.substring(0, slashIndex + 1) : undefined;
                    for (const legacyName of tool.legacyToolReferenceFullNames) {
                        if (toolSetPrefix && !legacyName.includes('/')) {
                            add(toolSetPrefix + legacyName, fullReferenceName);
                        }
                        // for any 'orphaned' toolsets (toolsets that no longer exist and
                        // do not have an explicit legacy mapping), we should
                        // just point them to the list of tools directly
                        if (legacyName.includes('/')) {
                            const toolSetFullName = legacyName.substring(0, legacyName.lastIndexOf('/'));
                            if (!knownToolSetNames.has(toolSetFullName)) {
                                add(toolSetFullName, fullReferenceName);
                            }
                        }
                    }
                }
            }
        }
        return result;
    }
    getToolByFullReferenceName(fullReferenceName) {
        for (const [tool, toolFullReferenceName] of this.toolsWithFullReferenceName.get()) {
            if (fullReferenceName === toolFullReferenceName) {
                return tool;
            }
            const aliases = isToolSet(tool) ? this.getToolSetAliases(tool, toolFullReferenceName) : this.getToolAliases(tool, toolFullReferenceName);
            if (Iterable.some(aliases, alias => fullReferenceName === alias)) {
                return tool;
            }
        }
        return undefined;
    }
    getFullReferenceName(tool, toolSet) {
        if (isToolSet(tool)) {
            return getToolSetFullReferenceName(tool);
        }
        return getToolFullReferenceName(tool, toolSet);
    }
};
LanguageModelToolsService = LanguageModelToolsService_1 = __decorate([
    __param(0, IInstantiationService),
    __param(1, IExtensionService),
    __param(2, IContextKeyService),
    __param(3, IChatService),
    __param(4, IDialogService),
    __param(5, ITelemetryService),
    __param(6, ILogService),
    __param(7, IConfigurationService),
    __param(8, IAccessibilityService),
    __param(9, IAccessibilitySignalService),
    __param(10, IStorageService),
    __param(11, ILanguageModelToolsConfirmationService),
    __param(12, ICommandService),
    __param(13, IChatWidgetService)
], LanguageModelToolsService);
export { LanguageModelToolsService };
function getToolFullReferenceName(tool, toolSet) {
    const toolName = tool.toolReferenceName ?? tool.displayName;
    if (toolSet) {
        return `${toolSet.referenceName}/${toolName}`;
    }
    else if (tool.source.type === 'extension') {
        return `${tool.source.extensionId.value.toLowerCase()}/${toolName}`;
    }
    return toolName;
}
function getToolSetFullReferenceName(toolSet) {
    if (toolSet.source.type === 'mcp') {
        return `${toolSet.referenceName}/*`;
    }
    return toolSet.referenceName;
}
//# sourceMappingURL=languageModelToolsService.js.map