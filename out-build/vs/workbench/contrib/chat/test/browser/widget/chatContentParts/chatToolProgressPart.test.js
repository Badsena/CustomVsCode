/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { Event } from '../../../../../../../base/common/event.js';
import { DisposableStore } from '../../../../../../../base/common/lifecycle.js';
import { observableValue } from '../../../../../../../base/common/observable.js';
import { URI } from '../../../../../../../base/common/uri.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../../../base/test/common/utils.js';
import { mainWindow } from '../../../../../../../base/browser/window.js';
import { IHoverService } from '../../../../../../../platform/hover/browser/hover.js';
import { IConfigurationService } from '../../../../../../../platform/configuration/common/configuration.js';
import { TestConfigurationService } from '../../../../../../../platform/configuration/test/common/testConfigurationService.js';
import { workbenchInstantiationService } from '../../../../../../test/browser/workbenchTestServices.js';
import { IChatMarkdownAnchorService } from '../../../../browser/widget/chatContentParts/chatMarkdownAnchorService.js';
import { ChatToolProgressSubPart } from '../../../../browser/widget/chatContentParts/toolInvocationParts/chatToolProgressPart.js';
import { isMcpToolInvocation } from '../../../../browser/widget/chatContentParts/toolInvocationParts/chatToolPartUtilities.js';
import { ToolDataSource } from '../../../../common/tools/languageModelToolsService.js';
suite('ChatToolProgressSubPart', () => {
    const store = ensureNoDisposablesAreLeakedInTestSuite();
    let disposables;
    let instantiationService;
    let mockMarkdownRenderer;
    let mockAnchorService;
    let mockHoverService;
    let mockConfigurationService;
    let mockEditorPool;
    let mockCodeBlockModelCollection;
    function createRenderContext(isComplete = false) {
        const mockElement = {
            isComplete,
            id: 'test-response-id',
            sessionResource: URI.parse('chat-session://test/session1'),
            setVote: () => { },
            get model() { return {}; }
        };
        return {
            element: mockElement,
            inlineTextModels: {},
            elementIndex: 0,
            container: mainWindow.document.createElement('div'),
            content: [],
            contentIndex: 0,
            editorPool: mockEditorPool,
            codeBlockStartIndex: 0,
            treeStartIndex: 0,
            diffEditorPool: {},
            codeBlockModelCollection: mockCodeBlockModelCollection,
            currentWidth: observableValue('currentWidth', 500),
            onDidChangeVisibility: Event.None
        };
    }
    function createSerializedToolInvocation(options = {}) {
        return {
            presentation: undefined,
            toolSpecificData: undefined,
            originMessage: undefined,
            invocationMessage: options.invocationMessage ?? 'Running tool...',
            pastTenseMessage: undefined,
            resultDetails: undefined,
            isConfirmed: { type: 1 /* ToolConfirmKind.ConfirmationNotNeeded */ },
            isComplete: options.isComplete ?? false,
            toolCallId: 'tool-call-id',
            toolId: options.toolId ?? 'test_tool',
            source: options.source,
            kind: 'toolInvocationSerialized'
        };
    }
    function createToolInvocation(options = {}) {
        const source = options.source ?? ToolDataSource.Internal;
        const toolId = options.toolId ?? 'test_tool';
        return {
            presentation: undefined,
            toolSpecificData: undefined,
            originMessage: undefined,
            invocationMessage: options.invocationMessage ?? 'Running tool...',
            pastTenseMessage: undefined,
            source,
            toolId,
            toolCallId: 'live-tool-call-id',
            state: observableValue('state', {
                type: 2 /* IChatToolInvocation.StateKind.Executing */,
                parameters: undefined,
                confirmed: { type: 1 /* ToolConfirmKind.ConfirmationNotNeeded */ },
                progress: observableValue('progress', { message: undefined, progress: undefined })
            }),
            isAttachedToThinking: false,
            kind: 'toolInvocation',
            toJSON: () => createSerializedToolInvocation({ source, toolId, invocationMessage: options.invocationMessage })
        };
    }
    setup(() => {
        disposables = store.add(new DisposableStore());
        instantiationService = workbenchInstantiationService(undefined, store);
        mockConfigurationService = new TestConfigurationService();
        instantiationService.stub(IConfigurationService, mockConfigurationService);
        mockMarkdownRenderer = {
            render: (markdown, _options, outElement) => {
                const element = outElement ?? mainWindow.document.createElement('div');
                const content = typeof markdown === 'string' ? markdown : (markdown.value ?? '');
                element.textContent = content;
                return {
                    element,
                    dispose: () => { }
                };
            }
        };
        mockAnchorService = {
            _serviceBrand: undefined,
            register: () => ({ dispose: () => { } }),
            lastFocusedAnchor: undefined
        };
        instantiationService.stub(IChatMarkdownAnchorService, mockAnchorService);
        mockHoverService = {
            _serviceBrand: undefined,
            showHover: () => undefined,
            showDelayedHover: () => undefined,
            showAndFocusLastHover: () => { },
            hideHover: () => { },
            setupDelayedHover: () => ({ dispose: () => { } }),
            setupManagedHover: () => ({ dispose: () => { }, show: () => { }, hide: () => { }, update: () => { } }),
            showManagedHover: () => undefined,
            isHovered: () => false,
        };
        instantiationService.stub(IHoverService, mockHoverService);
        mockEditorPool = {};
        mockCodeBlockModelCollection = {};
    });
    teardown(() => {
        disposables.dispose();
    });
    test('detects MCP tool invocations for live and serialized rows', () => {
        const mcpSource = {
            type: 'mcp',
            label: 'Weather MCP',
            serverLabel: 'Weather',
            instructions: undefined,
            collectionId: 'collection',
            definitionId: 'definition'
        };
        const cases = [
            isMcpToolInvocation(createToolInvocation({ source: mcpSource })),
            isMcpToolInvocation(createSerializedToolInvocation({ source: undefined, toolId: 'mcp__weather' })),
            isMcpToolInvocation(createSerializedToolInvocation({ source: ToolDataSource.Internal, toolId: 'fetch_webpage' }))
        ];
        assert.deepStrictEqual(cases, [true, true, false]);
    });
    test('adds shimmer styling for active MCP tool progress', () => {
        const mcpTool = createSerializedToolInvocation({
            source: {
                type: 'mcp',
                label: 'Weather MCP',
                serverLabel: 'Weather',
                instructions: undefined,
                collectionId: 'collection',
                definitionId: 'definition'
            },
            toolId: 'weather_lookup'
        });
        const part = disposables.add(instantiationService.createInstance(ChatToolProgressSubPart, mcpTool, createRenderContext(false), mockMarkdownRenderer, new Set()));
        assert.ok(part.domNode.querySelector('.shimmer-progress'));
    });
    test('does not add shimmer styling for non-MCP tool progress', () => {
        const tool = createSerializedToolInvocation({
            source: ToolDataSource.Internal,
            toolId: 'fetch_webpage'
        });
        const part = disposables.add(instantiationService.createInstance(ChatToolProgressSubPart, tool, createRenderContext(false), mockMarkdownRenderer, new Set()));
        assert.strictEqual(part.domNode.querySelector('.shimmer-progress'), null);
    });
});
//# sourceMappingURL=chatToolProgressPart.test.js.map