/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as nls from '../../../../nls.js';
import assert from 'assert';
import { mock } from '../../../../base/test/common/mock.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../base/test/common/utils.js';
import { SyncDescriptor } from '../../../../platform/instantiation/common/descriptors.js';
import { NullLogService } from '../../../../platform/log/common/log.js';
import { TestNotificationService } from '../../../../platform/notification/test/common/testNotificationService.js';
import { Registry } from '../../../../platform/registry/common/platform.js';
import { NullTelemetryService } from '../../../../platform/telemetry/common/telemetryUtils.js';
import { MainThreadTreeViews } from '../../browser/mainThreadTreeViews.js';
import { CustomTreeView } from '../../../browser/parts/views/treeView.js';
import { Extensions, IViewDescriptorService, TreeItemCollapsibleState } from '../../../common/views.js';
import { ViewDescriptorService } from '../../../services/views/browser/viewDescriptorService.js';
import { TestViewsService, workbenchInstantiationService } from '../../../test/browser/workbenchTestServices.js';
import { TestExtensionService } from '../../../test/common/workbenchTestServices.js';
import { CancellationToken } from '../../../../base/common/cancellation.js';
import { Mimes } from '../../../../base/common/mime.js';
import { URI } from '../../../../base/common/uri.js';
suite('MainThreadHostTreeView', function () {
    const testTreeViewId = 'testTreeView';
    const customValue = 'customValue';
    const ViewsRegistry = Registry.as(Extensions.ViewsRegistry);
    class MockExtHostTreeViewsShape extends mock() {
        async $getChildren(treeViewId, treeItemHandle) {
            return [[0, { handle: 'testItem1', collapsibleState: TreeItemCollapsibleState.Expanded, customProp: customValue }]];
        }
        async $hasResolve() {
            return false;
        }
        $setVisible() { }
    }
    let container;
    let mainThreadTreeViews;
    let extHostTreeViewsShape;
    let instantiationService;
    teardown(() => {
        ViewsRegistry.deregisterViews(ViewsRegistry.getViews(container), container);
    });
    const disposables = ensureNoDisposablesAreLeakedInTestSuite();
    setup(async () => {
        instantiationService = workbenchInstantiationService(undefined, disposables);
        const viewDescriptorService = disposables.add(instantiationService.createInstance(ViewDescriptorService));
        instantiationService.stub(IViewDescriptorService, viewDescriptorService);
        // eslint-disable-next-line local/code-no-any-casts
        container = Registry.as(Extensions.ViewContainersRegistry).registerViewContainer({ id: 'testContainer', title: nls.localize2(3595, 'test'), ctorDescriptor: new SyncDescriptor({}) }, 0 /* ViewContainerLocation.Sidebar */);
        const viewDescriptor = {
            id: testTreeViewId,
            ctorDescriptor: null,
            name: nls.localize2(3596, 'Test View 1'),
            treeView: disposables.add(instantiationService.createInstance(CustomTreeView, 'testTree', 'Test Title', 'extension.id')),
        };
        ViewsRegistry.registerViews([viewDescriptor], container);
        const testExtensionService = new TestExtensionService();
        extHostTreeViewsShape = new MockExtHostTreeViewsShape();
        mainThreadTreeViews = disposables.add(new MainThreadTreeViews(new class {
            constructor() {
                this.remoteAuthority = '';
                this.extensionHostKind = 1 /* ExtensionHostKind.LocalProcess */;
            }
            dispose() { }
            assertRegistered() { }
            set(v) { return null; }
            getProxy() {
                return extHostTreeViewsShape;
            }
            drain() { return null; }
        }, new TestViewsService(), new TestNotificationService(), testExtensionService, new NullLogService(), NullTelemetryService));
        mainThreadTreeViews.$registerTreeViewDataProvider(testTreeViewId, { showCollapseAll: false, canSelectMany: false, dropMimeTypes: [], dragMimeTypes: [], hasHandleDrag: false, hasHandleDrop: false, manuallyManageCheckboxes: false });
        await testExtensionService.whenInstalledExtensionsRegistered();
    });
    test('getChildren keeps custom properties', async () => {
        const treeView = ViewsRegistry.getView(testTreeViewId).treeView;
        const children = await treeView.dataProvider?.getChildren({ handle: 'root', collapsibleState: TreeItemCollapsibleState.Expanded });
        assert(children.length === 1, 'Exactly one child should be returned');
        assert(children[0].customProp === customValue, 'Tree Items should keep custom properties');
    });
    test('handleDrag reconstructs URI list from uriListData', async () => {
        const testTreeViewIdWithDrag = 'testTreeViewWithDrag';
        // Create a mock that returns URI list data
        const mockExtHostWithDrag = new class extends mock() {
            async $getChildren(treeViewId, treeItemHandle) {
                return [[0, { handle: 'item1', collapsibleState: TreeItemCollapsibleState.None }]];
            }
            async $hasResolve() {
                return false;
            }
            $setVisible() { }
            async $handleDrag(_sourceViewId, _sourceTreeItemHandles, _operationUuid, _token) {
                // Return a DataTransferDTO with text/uri-list containing uriListData
                // This simulates what the extension host sends after URI transformation
                return {
                    items: [
                        [Mimes.uriList, {
                                id: 'test-id',
                                // This is the original (untransformed) string - should NOT be used
                                asString: 'file:///original/untransformed/path.txt',
                                fileData: undefined,
                                // This is the transformed URI data - should be used
                                uriListData: [
                                    { scheme: 'file', authority: '', path: '/transformed/correct/path.txt', query: '', fragment: '' }
                                ]
                            }]
                    ]
                };
            }
        }();
        // Register a view with drag support
        const viewDescriptorWithDrag = {
            id: testTreeViewIdWithDrag,
            ctorDescriptor: null,
            name: nls.localize2(3597, 'Test View 2'),
            treeView: disposables.add(instantiationService.createInstance(CustomTreeView, 'testTree2', 'Test Title 2', 'extension.id')),
        };
        ViewsRegistry.registerViews([viewDescriptorWithDrag], container);
        const dragTestExtensionService = new TestExtensionService();
        const dragTestMainThreadTreeViews = disposables.add(new MainThreadTreeViews(new class {
            constructor() {
                this.remoteAuthority = '';
                this.extensionHostKind = 1 /* ExtensionHostKind.LocalProcess */;
            }
            dispose() { }
            assertRegistered() { }
            set(v) { return null; }
            getProxy() {
                return mockExtHostWithDrag;
            }
            drain() { return null; }
        }, new TestViewsService(), new TestNotificationService(), dragTestExtensionService, new NullLogService(), NullTelemetryService));
        dragTestMainThreadTreeViews.$registerTreeViewDataProvider(testTreeViewIdWithDrag, {
            showCollapseAll: false,
            canSelectMany: false,
            dropMimeTypes: [],
            dragMimeTypes: [Mimes.uriList],
            hasHandleDrag: true,
            hasHandleDrop: false,
            manuallyManageCheckboxes: false
        });
        await dragTestExtensionService.whenInstalledExtensionsRegistered();
        // Get the tree view and its drag controller
        const dragTestTreeView = ViewsRegistry.getView(testTreeViewIdWithDrag).treeView;
        const dragController = dragTestTreeView.dragAndDropController;
        assert(dragController, 'Drag controller should exist');
        // Call handleDrag
        const result = await dragController.handleDrag(['item1'], 'test-operation-uuid', CancellationToken.None);
        assert(result, 'Result should not be undefined');
        // Verify that the URI list was reconstructed from uriListData, not asString
        const uriListItem = result.get(Mimes.uriList);
        assert(uriListItem, 'URI list item should exist');
        const uriListValue = await uriListItem.asString();
        // The value should be the transformed URI, not the original untransformed one
        assert.strictEqual(uriListValue, URI.from({ scheme: 'file', authority: '', path: '/transformed/correct/path.txt', query: '', fragment: '' }).toString());
    });
});
//# sourceMappingURL=mainThreadTreeViews.test.js.map