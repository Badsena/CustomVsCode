/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { DisposableStore } from '../../../../../../base/common/lifecycle.js';
import { observableValue } from '../../../../../../base/common/observable.js';
import { URI } from '../../../../../../base/common/uri.js';
import { mock } from '../../../../../../base/test/common/mock.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../../base/test/common/utils.js';
import { IConfigurationService } from '../../../../../../platform/configuration/common/configuration.js';
import { TestConfigurationService } from '../../../../../../platform/configuration/test/common/testConfigurationService.js';
import { IDialogService } from '../../../../../../platform/dialogs/common/dialogs.js';
import { TestInstantiationService } from '../../../../../../platform/instantiation/test/common/instantiationServiceMock.js';
import { IChatWidgetService, IChatAccessibilityService } from '../../../browser/chat.js';
import { IChatService } from '../../../common/chatService/chatService.js';
import { ChatModeKind } from '../../../common/constants.js';
import { CommandsRegistry } from '../../../../../../platform/commands/common/commands.js';
import { registerChatTitleActions } from '../../../browser/actions/chatTitleActions.js';
import { MockChatWidgetService } from '../widget/mockChatWidget.js';
import { MockChatService } from '../../common/chatService/mockChatService.js';
suite('RetryChatAction', () => {
    const store = new DisposableStore();
    let instantiationService;
    // Register actions once for all tests
    let actionsRegistered = false;
    function ensureActionsRegistered() {
        if (!actionsRegistered) {
            registerChatTitleActions();
            actionsRegistered = true;
        }
    }
    setup(() => {
        instantiationService = store.add(new TestInstantiationService());
        ensureActionsRegistered();
    });
    teardown(() => {
        store.clear();
    });
    ensureNoDisposablesAreLeakedInTestSuite();
    function createMockResponseVM(sessionResource, requestId) {
        return {
            sessionResource,
            requestId,
            setVote: () => { }, // Required by isResponseVM check
        };
    }
    function createMockRequest(id) {
        return {
            id,
            attempt: 0,
        };
    }
    function createMockEditingSession(entriesModifiedByRequest) {
        return {
            entries: observableValue('entries', entriesModifiedByRequest),
            restoreSnapshot: async (_requestId, _undoIndex) => { },
        };
    }
    function createMockWidget(mode, editingSession, lastResponseItem) {
        return {
            input: {
                currentModeKind: mode,
                currentLanguageModel: 'test-model',
            },
            viewModel: {
                model: {
                    editingSession,
                },
                getItems: () => lastResponseItem ? [lastResponseItem] : [],
            },
            getModeRequestOptions: () => ({}),
        };
    }
    test('retry action should not throw when using accessor synchronously', async () => {
        const sessionResource = URI.parse('test://session');
        const requestId = 'test-request-1';
        const mockRequest = createMockRequest(requestId);
        const mockResponse = createMockResponseVM(sessionResource, requestId);
        const editingSession = createMockEditingSession([]);
        const mockWidget = createMockWidget(ChatModeKind.Edit, editingSession, mockResponse);
        // Mock chat model
        const mockChatModel = {
            getRequests: () => [mockRequest],
        };
        // Create MockChatWidgetService with widget lookup override
        const mockChatWidgetService = new class extends MockChatWidgetService {
            getWidgetBySessionResource(_resource) {
                return mockWidget;
            }
        };
        let resendCalled = false;
        const mockChatService = new class extends MockChatService {
            getSession(_sessionResource) {
                return mockChatModel;
            }
            async resendRequest(_request, _options) {
                resendCalled = true;
            }
        };
        const mockConfigService = new TestConfigurationService();
        await mockConfigService.setUserConfiguration('chat.editing.confirmEditRequestRetry', false);
        const mockDialogService = new class extends mock() {
            async confirm(_confirmation) {
                return { confirmed: true };
            }
        };
        let acceptRequestCalled = false;
        const mockChatAccessibilityService = new class extends mock() {
            acceptRequest(_resource) {
                acceptRequestCalled = true;
            }
        };
        // Use set() instead of stub() for more direct service registration
        instantiationService.set(IChatWidgetService, mockChatWidgetService);
        instantiationService.set(IChatService, mockChatService);
        instantiationService.set(IConfigurationService, mockConfigService);
        instantiationService.set(IDialogService, mockDialogService);
        instantiationService.set(IChatAccessibilityService, mockChatAccessibilityService);
        // Get the action handler
        const commandHandler = CommandsRegistry.getCommand('workbench.action.chat.retry')?.handler;
        assert.ok(commandHandler, 'Command handler should be registered');
        // Run the action with the instantiation service acting as accessor
        await commandHandler(instantiationService, mockResponse);
        assert.ok(resendCalled, 'resendRequest should have been called');
        assert.ok(acceptRequestCalled, 'acceptRequest should have been called');
    });
    test('retry action should work with confirmation dialog (accessor used after await)', async () => {
        const sessionResource = URI.parse('test://session');
        const requestId = 'test-request-1';
        const mockRequest = createMockRequest(requestId);
        const mockResponse = createMockResponseVM(sessionResource, requestId);
        // Create an entry that was modified by this request to trigger confirmation
        const modifiedEntry = {
            modifiedURI: URI.parse('test://file.ts'),
            lastModifyingRequestId: requestId,
        };
        const editingSession = createMockEditingSession([modifiedEntry]);
        const mockWidget = createMockWidget(ChatModeKind.Edit, editingSession, mockResponse);
        // Mock chat model
        const mockChatModel = {
            getRequests: () => [mockRequest],
        };
        // Create MockChatWidgetService with widget lookup override
        const mockChatWidgetService = new class extends MockChatWidgetService {
            getWidgetBySessionResource(_resource) {
                return mockWidget;
            }
        };
        let resendCalled = false;
        const mockChatService = new class extends MockChatService {
            getSession(_sessionResource) {
                return mockChatModel;
            }
            async resendRequest(_request, _options) {
                resendCalled = true;
            }
        };
        // Enable confirmation dialog - this will trigger an await
        const mockConfigService = new TestConfigurationService();
        await mockConfigService.setUserConfiguration('chat.editing.confirmEditRequestRetry', true);
        let dialogShown = false;
        const mockDialogService = new class extends mock() {
            async confirm(_confirmation) {
                dialogShown = true;
                // Simulate async delay that would happen in real dialog
                await new Promise(resolve => setTimeout(resolve, 10));
                return { confirmed: true, checkboxChecked: false };
            }
        };
        let acceptRequestCalled = false;
        const mockChatAccessibilityService = new class extends mock() {
            acceptRequest(_resource) {
                acceptRequestCalled = true;
            }
        };
        // Use set() for more direct service registration
        instantiationService.set(IChatWidgetService, mockChatWidgetService);
        instantiationService.set(IChatService, mockChatService);
        instantiationService.set(IConfigurationService, mockConfigService);
        instantiationService.set(IDialogService, mockDialogService);
        instantiationService.set(IChatAccessibilityService, mockChatAccessibilityService);
        // Get the action handler
        const commandHandler = CommandsRegistry.getCommand('workbench.action.chat.retry')?.handler;
        assert.ok(commandHandler, 'Command handler should be registered');
        // Create a strict accessor that throws when used after dispose
        // This simulates the behavior of the real ServicesAccessor which becomes
        // invalid after the synchronous portion of the action handler
        let disposed = false;
        const strictAccessor = {
            get(id) {
                if (disposed) {
                    throw new Error(`Accessor was used after being disposed. Tried to get service: ${id.toString()}`);
                }
                return instantiationService.get(id);
            }
        };
        // Create a wrapper that disposes the accessor after the first await
        // by wrapping the dialog service
        const originalConfirm = mockDialogService.confirm.bind(mockDialogService);
        mockDialogService.confirm = async (confirmation) => {
            const result = await originalConfirm(confirmation);
            // Mark accessor as disposed after the await, simulating real behavior
            disposed = true;
            return result;
        };
        // Run the action - this should throw if accessor is used after the confirm await
        let threwError = false;
        let errorMessage = '';
        try {
            await commandHandler(strictAccessor, mockResponse);
        }
        catch (e) {
            threwError = true;
            errorMessage = e.message;
        }
        assert.ok(dialogShown, 'Dialog should have been shown');
        // The bug is that accessor.get(IChatAccessibilityService) is called after the await
        // This test should fail until the bug is fixed
        if (threwError) {
            assert.fail(`Action threw an error because accessor was used after await: ${errorMessage}`);
        }
        assert.ok(resendCalled, 'resendRequest should have been called');
        assert.ok(acceptRequestCalled, 'acceptRequest should have been called');
    });
});
//# sourceMappingURL=chatTitleActions.test.js.map