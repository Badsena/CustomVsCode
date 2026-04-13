/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Codicon } from '../../../../../../base/common/codicons.js';
import { Emitter, Event } from '../../../../../../base/common/event.js';
import { Disposable } from '../../../../../../base/common/lifecycle.js';
import { constObservable } from '../../../../../../base/common/observable.js';
import { ThemeIcon } from '../../../../../../base/common/themables.js';
import { MockContextKeyService } from '../../../../../../platform/keybinding/test/common/mockKeybindingService.js';
import { ToolDataSource, ToolSet } from '../../../common/tools/languageModelToolsService.js';
export class MockLanguageModelToolsService extends Disposable {
    constructor() {
        super();
        this.vscodeToolSet = new ToolSet('vscode', 'vscode', ThemeIcon.fromId(Codicon.code.id), ToolDataSource.Internal, undefined, undefined, new MockContextKeyService());
        this.executeToolSet = new ToolSet('execute', 'execute', ThemeIcon.fromId(Codicon.terminal.id), ToolDataSource.Internal, undefined, undefined, new MockContextKeyService());
        this.readToolSet = new ToolSet('read', 'read', ThemeIcon.fromId(Codicon.book.id), ToolDataSource.Internal, undefined, undefined, new MockContextKeyService());
        this.agentToolSet = new ToolSet('agent', 'agent', ThemeIcon.fromId(Codicon.agent.id), ToolDataSource.Internal, undefined, undefined, new MockContextKeyService());
        this._onDidInvokeTool = this._register(new Emitter());
        this._registeredToolIds = new Set();
        this._registeredToolSetNames = new Set();
        this._toolSetTools = new Map();
        this.onDidChangeTools = Event.None;
        this.onDidPrepareToolCallBecomeUnresponsive = Event.None;
        this.onDidInvokeTool = this._onDidInvokeTool.event;
        this.toolSets = constObservable([]);
    }
    fireOnDidInvokeTool(event) {
        this._onDidInvokeTool.fire(event);
    }
    registerToolData(toolData) {
        return Disposable.None;
    }
    resetToolAutoConfirmation() {
    }
    getToolPostExecutionAutoConfirmation(toolId) {
        return 'never';
    }
    resetToolPostExecutionAutoConfirmation() {
    }
    flushToolUpdates() {
    }
    cancelToolCallsForRequest(requestId) {
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    setToolAutoConfirmation(toolId, scope) {
    }
    getToolAutoConfirmation(toolId) {
        return 'never';
    }
    registerToolImplementation(name, tool) {
        return Disposable.None;
    }
    registerTool(toolData, tool) {
        return Disposable.None;
    }
    getTools() {
        return [];
    }
    getAllToolsIncludingDisabled() {
        return [];
    }
    addRegisteredToolId(id) {
        this._registeredToolIds.add(id);
    }
    getTool(id) {
        if (this._registeredToolIds.has(id)) {
            return { id, source: ToolDataSource.Internal, displayName: id, modelDescription: id };
        }
        return undefined;
    }
    observeTools() {
        return constObservable([]);
    }
    getToolByName(name) {
        return undefined;
    }
    acceptProgress(sessionId, callId, progress) {
    }
    async invokeTool(dto, countTokens, token) {
        return {
            content: [{ kind: 'text', value: 'result' }]
        };
    }
    beginToolCall(_options) {
        // Mock implementation - return undefined
        return undefined;
    }
    async updateToolStream(_toolCallId, _partialInput, _token) {
        // Mock implementation - do nothing
    }
    getToolSetsForModel(model, reader) {
        return [];
    }
    addRegisteredToolSetName(name, tools) {
        this._registeredToolSetNames.add(name);
        if (tools) {
            this._toolSetTools.set(name, tools);
        }
    }
    getToolSetByName(name) {
        if (this._registeredToolSetNames.has(name)) {
            const tools = this._toolSetTools.get(name) ?? [];
            return { id: name, referenceName: name, icon: ThemeIcon.fromId(Codicon.tools.id), source: ToolDataSource.Internal, getTools: () => tools };
        }
        return undefined;
    }
    getToolSet(id) {
        return undefined;
    }
    createToolSet() {
        throw new Error('Method not implemented.');
    }
    toToolAndToolSetEnablementMap(toolOrToolSetNames) {
        throw new Error('Method not implemented.');
    }
    toToolReferences(variableReferences) {
        throw new Error('Method not implemented.');
    }
    getFullReferenceNames() {
        throw new Error('Method not implemented.');
    }
    getToolByFullReferenceName(qualifiedName) {
        throw new Error('Method not implemented.');
    }
    getFullReferenceName(tool, set) {
        throw new Error('Method not implemented.');
    }
    toFullReferenceNames(map) {
        throw new Error('Method not implemented.');
    }
    getDeprecatedFullReferenceNames() {
        throw new Error('Method not implemented.');
    }
}
//# sourceMappingURL=mockLanguageModelToolsService.js.map