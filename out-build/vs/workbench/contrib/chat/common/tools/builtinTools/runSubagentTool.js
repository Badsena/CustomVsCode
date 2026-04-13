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
var RunSubagentTool_1;
import { CancellationToken } from '../../../../../../base/common/cancellation.js';
import { Codicon } from '../../../../../../base/common/codicons.js';
import { Event } from '../../../../../../base/common/event.js';
import { MarkdownString } from '../../../../../../base/common/htmlContent.js';
import { Disposable, DisposableStore } from '../../../../../../base/common/lifecycle.js';
import { ThemeIcon } from '../../../../../../base/common/themables.js';
import { generateUuid } from '../../../../../../base/common/uuid.js';
import { localize } from '../../../../../../nls.js';
import { IConfigurationService } from '../../../../../../platform/configuration/common/configuration.js';
import { IInstantiationService } from '../../../../../../platform/instantiation/common/instantiation.js';
import { ILogService } from '../../../../../../platform/log/common/log.js';
import { IProductService } from '../../../../../../platform/product/common/productService.js';
import { ChatRequestVariableSet } from '../../attachments/chatVariableEntries.js';
import { IChatService } from '../../chatService/chatService.js';
import { ChatAgentLocation, ChatConfiguration, ChatModeKind } from '../../constants.js';
import { ILanguageModelsService } from '../../languageModels.js';
import { IChatAgentService } from '../../participants/chatAgents.js';
import { ComputeAutomaticInstructions } from '../../promptSyntax/computeAutomaticInstructions.js';
import { mergeHooks } from '../../promptSyntax/hookSchema.js';
import { HookType } from '../../promptSyntax/hookTypes.js';
import { IPromptsService } from '../../promptSyntax/service/promptsService.js';
import { isBuiltinAgent } from '../../promptSyntax/utils/promptsServiceUtils.js';
import { ILanguageModelToolsService, isToolSet, ToolDataSource, VSCodeToolReference, } from '../languageModelToolsService.js';
import { ManageTodoListToolToolId } from './manageTodoListTool.js';
import { createToolSimpleTextResult } from './toolHelpers.js';
const BaseModelDescription = `Launch a new agent to handle complex, multi-step tasks autonomously. This tool is good at researching complex questions, searching for code, and executing multi-step tasks. When you are searching for a keyword or file and are not confident that you will find the right match in the first few tries, use this agent to perform the search for you.

- Agents do not run async or in the background, you will wait for the agent\'s result.
- When the agent is done, it will return a single message back to you. The result returned by the agent is not visible to the user. To show the user the result, you should send a text message back to the user with a concise summary of the result.
- Each agent invocation is stateless. You will not be able to send additional messages to the agent, nor will the agent be able to communicate with you outside of its final report. Therefore, your prompt should contain a highly detailed task description for the agent to perform autonomously and you should specify exactly what information the agent should return back to you in its final and only message to you.
- The agent's outputs should generally be trusted
- Clearly tell the agent whether you expect it to write code or just to do research (search, file reads, web fetches, etc.), since it is not aware of the user\'s intent`;
let RunSubagentTool = class RunSubagentTool extends Disposable {
    static { RunSubagentTool_1 = this; }
    static { this.Id = 'runSubagent'; }
    constructor(chatAgentService, chatService, languageModelToolsService, languageModelsService, logService, toolsService, configurationService, promptsService, instantiationService, productService) {
        super();
        this.chatAgentService = chatAgentService;
        this.chatService = chatService;
        this.languageModelToolsService = languageModelToolsService;
        this.languageModelsService = languageModelsService;
        this.logService = logService;
        this.toolsService = toolsService;
        this.configurationService = configurationService;
        this.promptsService = promptsService;
        this.instantiationService = instantiationService;
        this.productService = productService;
        /** Hack to port data between prepare/invoke */
        this._resolvedModels = new Map();
        this.onDidUpdateToolData = Event.filter(this.configurationService.onDidChangeConfiguration, e => e.affectsConfiguration(ChatConfiguration.SubagentToolCustomAgents));
    }
    getToolData() {
        let modelDescription = BaseModelDescription;
        const inputSchema = {
            type: 'object',
            properties: {
                prompt: {
                    type: 'string',
                    description: 'A detailed description of the task for the agent to perform'
                },
                description: {
                    type: 'string',
                    description: 'A short (3-5 word) description of the task'
                }
            },
            required: ['prompt', 'description']
        };
        if (this.configurationService.getValue(ChatConfiguration.SubagentToolCustomAgents)) {
            inputSchema.properties.agentName = {
                type: 'string',
                description: 'Optional name of a specific agent to invoke. If not provided, uses the current agent.'
            };
            modelDescription += `\n- If the user asks for a certain agent, you MUST provide that EXACT agent name (case-sensitive) to invoke that specific agent.`;
        }
        const runSubagentToolData = {
            id: RunSubagentTool_1.Id,
            toolReferenceName: VSCodeToolReference.runSubagent,
            icon: ThemeIcon.fromId(Codicon.organization.id),
            displayName: localize(8939, null),
            userDescription: localize(8940, null),
            modelDescription: modelDescription,
            source: ToolDataSource.Internal,
            inputSchema: inputSchema
        };
        return runSubagentToolData;
    }
    async invoke(invocation, _countTokens, _progress, token) {
        const args = invocation.parameters;
        this.logService.debug(`RunSubagentTool: Invoking with prompt: ${args.prompt.substring(0, 100)}...`);
        if (!invocation.context) {
            throw new Error('toolInvocationToken is required for this tool');
        }
        // Get the chat model and request for writing progress
        const model = this.chatService.getSession(invocation.context.sessionResource);
        if (!model) {
            throw new Error('Chat model not found for session');
        }
        const request = model.getRequests().at(-1);
        const store = new DisposableStore();
        try {
            // Get the default agent
            const defaultAgent = this.chatAgentService.getDefaultAgent(ChatAgentLocation.Chat, ChatModeKind.Agent);
            if (!defaultAgent) {
                return createToolSimpleTextResult('Error: No default agent available');
            }
            // Resolve mode-specific configuration if subagentId is provided
            let modeModelId = invocation.modelId;
            let modeTools = invocation.userSelectedTools;
            let modeInstructions;
            let subagent;
            let resolvedModelName;
            const subAgentName = args.agentName;
            if (subAgentName) {
                subagent = await this.getSubAgentByName(subAgentName);
                if (subagent) {
                    // Check the pre-resolved model cache from prepareToolInvocation
                    const cached = this._resolvedModels.get(invocation.callId);
                    if (cached) {
                        this._resolvedModels.delete(invocation.callId);
                        modeModelId = cached.modeModelId;
                        resolvedModelName = cached.resolvedModelName;
                    }
                    else {
                        // Fallback: resolve the model here if prepare didn't cache it
                        const resolved = this.resolveSubagentModel(subagent, invocation.modelId);
                        modeModelId = resolved.modeModelId;
                        resolvedModelName = resolved.resolvedModelName;
                    }
                    // Use mode-specific tools if available
                    const modeCustomTools = subagent.tools;
                    if (modeCustomTools) {
                        // Convert the mode's custom tools (array of qualified names) to UserSelectedTools format
                        const enablementMap = this.languageModelToolsService.toToolAndToolSetEnablementMap(modeCustomTools, undefined);
                        // Convert enablement map to UserSelectedTools (Record<string, boolean>)
                        modeTools = {};
                        for (const [tool, enabled] of enablementMap) {
                            if (!isToolSet(tool)) {
                                modeTools[tool.id] = enabled;
                            }
                        }
                    }
                    const instructions = subagent.agentInstructions;
                    modeInstructions = instructions && {
                        name: subAgentName,
                        content: instructions.content,
                        toolReferences: this.toolsService.toToolReferences(instructions.toolReferences),
                        metadata: instructions.metadata,
                        isBuiltin: isBuiltinAgent(subagent.source, subagent.uri, this.productService),
                    };
                }
                else {
                    throw new Error(`Requested agent '${subAgentName}' not found. Try again with the correct agent name, or omit the agentName to use the current agent.`);
                }
            }
            else {
                // No subagent name - clean up any cached entry and resolve model name from main model
                const cached = this._resolvedModels.get(invocation.callId);
                if (cached) {
                    this._resolvedModels.delete(invocation.callId);
                    resolvedModelName = cached.resolvedModelName;
                }
                else {
                    const resolvedModelMetadata = modeModelId ? this.languageModelsService.lookupLanguageModel(modeModelId) : undefined;
                    resolvedModelName = resolvedModelMetadata?.name;
                }
            }
            // Track whether we should collect markdown (after the last tool invocation)
            const markdownParts = [];
            // Generate a stable subAgentInvocationId for routing edits to this subagent's content part
            const subAgentInvocationId = invocation.callId ?? `subagent-${generateUuid()}`;
            let inEdit = false;
            const progressCallback = (parts) => {
                for (const part of parts) {
                    // Write certain parts immediately to the model
                    if (part.kind === 'textEdit' || part.kind === 'notebookEdit' || part.kind === 'codeblockUri') {
                        if (part.kind === 'codeblockUri' && !inEdit) {
                            inEdit = true;
                            model.acceptResponseProgress(request, { kind: 'markdownContent', content: new MarkdownString('```\n') });
                        }
                        // Attach subAgentInvocationId to codeblockUri parts so they can be routed to the subagent content part
                        if (part.kind === 'codeblockUri') {
                            model.acceptResponseProgress(request, { ...part, subAgentInvocationId });
                        }
                        else {
                            model.acceptResponseProgress(request, part);
                        }
                    }
                    else if (part.kind === 'hook') {
                        model.acceptResponseProgress(request, { ...part, subAgentInvocationId });
                    }
                    else if (part.kind === 'markdownContent') {
                        if (inEdit) {
                            model.acceptResponseProgress(request, { kind: 'markdownContent', content: new MarkdownString('\n```\n\n') });
                            inEdit = false;
                        }
                        // Collect markdown content for the tool result
                        markdownParts.push(part.content.value);
                    }
                }
            };
            if (modeTools) {
                modeTools[RunSubagentTool_1.Id] = false;
                modeTools[ManageTodoListToolToolId] = false;
                modeTools['copilot_askQuestions'] = false;
            }
            const variableSet = new ChatRequestVariableSet();
            const computer = this.instantiationService.createInstance(ComputeAutomaticInstructions, ChatModeKind.Agent, modeTools, undefined, invocation.context.sessionResource); // agents can not call subagents
            await computer.collect(variableSet, token);
            // Collect hooks from hook .json files
            let collectedHooks;
            try {
                const info = await this.promptsService.getHooks(token, invocation.context.sessionResource);
                collectedHooks = info?.hooks;
            }
            catch (error) {
                this.logService.warn('[ChatService] Failed to collect hooks:', error);
            }
            // Merge subagent-level hooks (from the agent's frontmatter) with global hooks.
            // Remap Stop hooks to SubagentStop since the agent is running as a subagent.
            if (subagent?.hooks) {
                const remapped = { ...subagent.hooks };
                if (remapped[HookType.Stop]) {
                    const stopHooks = remapped[HookType.Stop];
                    remapped[HookType.SubagentStop] = remapped[HookType.SubagentStop]
                        ? [...remapped[HookType.SubagentStop], ...stopHooks]
                        : stopHooks;
                    remapped[HookType.Stop] = undefined;
                }
                collectedHooks = mergeHooks(collectedHooks, remapped);
            }
            // Build the agent request
            const agentRequest = {
                sessionResource: invocation.context.sessionResource,
                requestId: invocation.callId ?? `subagent-${Date.now()}`,
                agentId: defaultAgent.id,
                message: args.prompt,
                variables: { variables: variableSet.asArray() },
                location: ChatAgentLocation.Chat,
                subAgentInvocationId: invocation.callId,
                subAgentName: subAgentName,
                userSelectedModelId: modeModelId,
                modelConfiguration: modeModelId ? this.languageModelsService.getModelConfiguration(modeModelId) : undefined,
                userSelectedTools: modeTools,
                modeInstructions,
                parentRequestId: invocation.chatRequestId,
                hooks: collectedHooks,
                hasHooksEnabled: !!collectedHooks && Object.values(collectedHooks).some(arr => arr.length > 0),
            };
            // Subscribe to tool invocations to clear markdown parts when a tool is invoked
            store.add(this.languageModelToolsService.onDidInvokeTool(e => {
                if (e.subagentInvocationId === subAgentInvocationId) {
                    markdownParts.length = 0;
                }
            }));
            // Invoke the agent
            const result = await this.chatAgentService.invokeAgent(defaultAgent.id, agentRequest, progressCallback, [], token);
            // Check for errors
            if (result.errorDetails) {
                return createToolSimpleTextResult(`Agent error: ${result.errorDetails.message}`);
            }
            // This is a hack due to the fact that edits are represented as empty codeblocks with URIs. That needs to be cleaned up,
            // in the meantime, just strip an empty codeblock left behind.
            const resultText = markdownParts.join('').replace(/^\n*```\n+```\n*/g, '').trim() || 'Agent completed with no output';
            // Store result in toolSpecificData for serialization
            if (invocation.toolSpecificData?.kind === 'subagent') {
                invocation.toolSpecificData.result = resultText;
                invocation.toolSpecificData.modelName = resolvedModelName;
            }
            // Return result with toolMetadata containing subAgentInvocationId for trajectory tracking
            return {
                content: [{
                        kind: 'text',
                        value: resultText
                    }],
                toolMetadata: {
                    subAgentInvocationId,
                    description: args.description,
                    agentName: agentRequest.subAgentName,
                    modelName: resolvedModelName,
                }
            };
        }
        catch (error) {
            const errorMessage = `Error invoking subagent: ${error instanceof Error ? error.message : 'Unknown error'}`;
            this.logService.error(errorMessage, error);
            return createToolSimpleTextResult(errorMessage);
        }
        finally {
            store.dispose();
        }
    }
    async getSubAgentByName(name) {
        const agents = await this.promptsService.getCustomAgents(CancellationToken.None);
        return agents.find(agent => agent.name === name);
    }
    /**
     * Resolves the model to be used by a subagent, applying multiplier-based
     * fallback to avoid using a more expensive model than the main agent.
     */
    resolveSubagentModel(subagent, mainModelId) {
        let modeModelId = mainModelId;
        if (subagent) {
            const modeModelQualifiedNames = subagent.model;
            if (modeModelQualifiedNames) {
                // Find the actual model identifier from the qualified name(s)
                outer: for (const qualifiedName of modeModelQualifiedNames) {
                    const lmByQualifiedName = this.languageModelsService.lookupLanguageModelByQualifiedName(qualifiedName);
                    if (lmByQualifiedName?.identifier) {
                        modeModelId = lmByQualifiedName.identifier;
                        break outer;
                    }
                }
            }
            // If the subagent's model has a larger multiplier than the main agent's model,
            // fall back to the main agent's model to avoid using a more expensive model.
            if (modeModelId && modeModelId !== mainModelId) {
                const mainModelMetadata = mainModelId ? this.languageModelsService.lookupLanguageModel(mainModelId) : undefined;
                const subagentModelMetadata = this.languageModelsService.lookupLanguageModel(modeModelId);
                const mainMultiplier = mainModelMetadata?.multiplierNumeric;
                const subagentMultiplier = subagentModelMetadata?.multiplierNumeric;
                if (mainMultiplier !== undefined && subagentMultiplier !== undefined && subagentMultiplier > mainMultiplier) {
                    this.logService.warn(`[RunSubagentTool] Subagent '${subagent.name}' requested model '${subagentModelMetadata?.name}' (multiplier: ${subagentMultiplier}) which has a larger multiplier than the main agent model '${mainModelMetadata?.name}' (multiplier: ${mainMultiplier}). Falling back to the main agent model.`);
                    modeModelId = mainModelId;
                }
            }
        }
        const resolvedModelMetadata = modeModelId ? this.languageModelsService.lookupLanguageModel(modeModelId) : undefined;
        return { modeModelId, resolvedModelName: resolvedModelMetadata?.name };
    }
    async prepareToolInvocation(context, _token) {
        const args = context.parameters;
        const subagent = args.agentName ? await this.getSubAgentByName(args.agentName) : undefined;
        // Resolve the model early and cache it for invoke()
        const resolved = this.resolveSubagentModel(subagent, context.modelId);
        this._resolvedModels.set(context.toolCallId, resolved);
        return {
            invocationMessage: args.description,
            toolSpecificData: {
                kind: 'subagent',
                description: args.description,
                agentName: subagent?.name,
                prompt: args.prompt,
                modelName: resolved.resolvedModelName,
            },
        };
    }
};
RunSubagentTool = RunSubagentTool_1 = __decorate([
    __param(0, IChatAgentService),
    __param(1, IChatService),
    __param(2, ILanguageModelToolsService),
    __param(3, ILanguageModelsService),
    __param(4, ILogService),
    __param(5, ILanguageModelToolsService),
    __param(6, IConfigurationService),
    __param(7, IPromptsService),
    __param(8, IInstantiationService),
    __param(9, IProductService)
], RunSubagentTool);
export { RunSubagentTool };
//# sourceMappingURL=runSubagentTool.js.map