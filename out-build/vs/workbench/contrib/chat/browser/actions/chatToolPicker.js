/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { assertNever } from '../../../../../base/common/assert.js';
import { Codicon } from '../../../../../base/common/codicons.js';
import { Emitter, Event } from '../../../../../base/common/event.js';
import { DisposableStore } from '../../../../../base/common/lifecycle.js';
import { ThemeIcon } from '../../../../../base/common/themables.js';
import { localize } from '../../../../../nls.js';
import { ICommandService } from '../../../../../platform/commands/common/commands.js';
import { ExtensionIdentifier } from '../../../../../platform/extensions/common/extensions.js';
import { IQuickInputService } from '../../../../../platform/quickinput/common/quickInput.js';
import { ITelemetryService } from '../../../../../platform/telemetry/common/telemetry.js';
import { IEditorService } from '../../../../services/editor/common/editorService.js';
import { IExtensionsWorkbenchService } from '../../../extensions/common/extensions.js';
import { IMcpRegistry } from '../../../mcp/common/mcpRegistryTypes.js';
import { IMcpService, IMcpWorkbenchService } from '../../../mcp/common/mcpTypes.js';
import { startServerAndWaitForLiveTools } from '../../../mcp/common/mcpTypesUtils.js';
import { ILanguageModelToolsConfirmationService } from '../../common/tools/languageModelToolsConfirmationService.js';
import { ILanguageModelToolsService, ToolDataSource } from '../../common/tools/languageModelToolsService.js';
import { ConfigureToolSets } from '../tools/toolSetsContribution.js';
var BucketOrdinal;
(function (BucketOrdinal) {
    BucketOrdinal[BucketOrdinal["User"] = 0] = "User";
    BucketOrdinal[BucketOrdinal["BuiltIn"] = 1] = "BuiltIn";
    BucketOrdinal[BucketOrdinal["Mcp"] = 2] = "Mcp";
    BucketOrdinal[BucketOrdinal["Extension"] = 3] = "Extension";
})(BucketOrdinal || (BucketOrdinal = {}));
// Type guards for new QuickTree types
function isBucketTreeItem(item) {
    return item.itemType === 'bucket';
}
function isToolSetTreeItem(item) {
    return item.itemType === 'toolset';
}
function isToolTreeItem(item) {
    return item.itemType === 'tool';
}
function isCallbackTreeItem(item) {
    return item.itemType === 'callback';
}
/**
 * Maps different icon types (ThemeIcon or URI-based) to QuickTreeItem icon properties.
 * Handles the conversion between ToolSet/IToolData icon formats and tree item requirements.
 * Provides a default tool icon when no icon is specified.
 *
 * @param icon - Icon to map (ThemeIcon, URI object, or undefined)
 * @param useDefaultToolIcon - Whether to use a default tool icon when none is provided
 * @returns Object with iconClass (for ThemeIcon) or iconPath (for URIs) properties
 */
function mapIconToTreeItem(icon, useDefaultToolIcon = false) {
    if (!icon) {
        if (useDefaultToolIcon) {
            return { iconClass: ThemeIcon.asClassName(Codicon.tools) };
        }
        return {};
    }
    if (ThemeIcon.isThemeIcon(icon)) {
        return { iconClass: ThemeIcon.asClassName(icon) };
    }
    else {
        return { iconPath: icon };
    }
}
function createToolTreeItemFromData(tool, checked) {
    const iconProps = mapIconToTreeItem(tool.icon, true); // Use default tool icon if none provided
    return {
        itemType: 'tool',
        tool,
        id: tool.id,
        label: tool.toolReferenceName ?? tool.displayName,
        description: tool.userDescription ?? tool.modelDescription,
        checked,
        ...iconProps
    };
}
function createToolSetTreeItem(toolset, checked, editorService) {
    const iconProps = mapIconToTreeItem(toolset.icon);
    const buttons = [];
    if (toolset.source.type === 'user') {
        const resource = toolset.source.file;
        buttons.push({
            iconClass: ThemeIcon.asClassName(Codicon.edit),
            tooltip: localize(6092, null),
            action: () => editorService.openEditor({ resource })
        });
    }
    return {
        itemType: 'toolset',
        toolset,
        buttons,
        id: toolset.id,
        label: toolset.referenceName,
        description: toolset.description,
        checked,
        children: undefined,
        collapsed: true,
        ...iconProps
    };
}
/**
 * New QuickTree implementation of the tools picker.
 * Uses IQuickTree to provide a true hierarchical tree structure with:
 * - Collapsible nodes for buckets and toolsets
 * - Checkbox state management with parent-child relationships
 * - Special handling for MCP servers (server as bucket, tools as direct children)
 * - Built-in filtering and search capabilities
 *
 * @param accessor - Service accessor for dependency injection
 * @param placeHolder - Placeholder text shown in the picker
 * @param description - Optional description text shown in the picker
 * @param toolsEntries - Optional initial selection state for tools and toolsets
 * @param modelId - Optional model ID to filter tools by supported models
 * @param onUpdate - Optional callback fired when the selection changes
 * @param token - Optional cancellation token to close the picker when cancelled
 * @returns Promise resolving to the final selection map, or undefined if cancelled
 */
export async function showToolsPicker(accessor, placeHolder, source, description, getToolsEntries, model, token) {
    const quickPickService = accessor.get(IQuickInputService);
    const mcpService = accessor.get(IMcpService);
    const mcpRegistry = accessor.get(IMcpRegistry);
    const commandService = accessor.get(ICommandService);
    const extensionsWorkbenchService = accessor.get(IExtensionsWorkbenchService);
    const editorService = accessor.get(IEditorService);
    const mcpWorkbenchService = accessor.get(IMcpWorkbenchService);
    const toolsService = accessor.get(ILanguageModelToolsService);
    const confirmationService = accessor.get(ILanguageModelToolsConfirmationService);
    const telemetryService = accessor.get(ITelemetryService);
    const mcpServerByTool = new Map();
    for (const server of mcpService.servers.get()) {
        for (const tool of server.tools.get()) {
            mcpServerByTool.set(tool.id, server);
        }
    }
    function computeItems(previousToolsEntries) {
        // Create default entries if none provided
        let toolsEntries = getToolsEntries ? new Map([...getToolsEntries()].map(([k, enabled]) => [k.id, enabled])) : undefined;
        if (!toolsEntries) {
            const defaultEntries = new Map();
            for (const tool of toolsService.getTools(model)) {
                if (tool.canBeReferencedInPrompt) {
                    defaultEntries.set(tool, false);
                }
            }
            for (const toolSet of toolsService.getToolSetsForModel(model)) {
                defaultEntries.set(toolSet, false);
            }
            toolsEntries = defaultEntries;
        }
        previousToolsEntries?.forEach((value, key) => {
            toolsEntries.set(key.id, value);
        });
        // Build tree structure
        const treeItems = [];
        const bucketMap = new Map();
        const getKey = (source) => {
            switch (source.type) {
                case 'mcp':
                case 'extension':
                    return ToolDataSource.toKey(source);
                case 'internal':
                    return 1 /* BucketOrdinal.BuiltIn */.toString();
                case 'user':
                    return 0 /* BucketOrdinal.User */.toString();
                case 'external':
                    throw new Error('should not be reachable');
                default:
                    assertNever(source);
            }
        };
        const mcpServers = new Map(mcpService.servers.get().map(s => [s.definition.id, { server: s, seen: false }]));
        const createBucket = (source, key) => {
            if (source.type === 'mcp') {
                const mcpServerEntry = mcpServers.get(source.definitionId);
                if (!mcpServerEntry) {
                    return undefined;
                }
                mcpServerEntry.seen = true;
                const mcpServer = mcpServerEntry.server;
                const buttons = [];
                const collection = mcpRegistry.collections.get().find(c => c.id === mcpServer.collection.id);
                if (collection?.source) {
                    buttons.push({
                        iconClass: ThemeIcon.asClassName(Codicon.settingsGear),
                        tooltip: localize(6093, null, collection.label),
                        action: () => collection.source ? collection.source instanceof ExtensionIdentifier ? extensionsWorkbenchService.open(collection.source.value, { tab: "features" /* ExtensionEditorTab.Features */, feature: 'mcp' }) : mcpWorkbenchService.open(collection.source, { tab: "configuration" /* McpServerEditorTab.Configuration */ }) : undefined
                    });
                }
                else if (collection?.presentation?.origin) {
                    buttons.push({
                        iconClass: ThemeIcon.asClassName(Codicon.settingsGear),
                        tooltip: localize(6094, null, collection.label),
                        action: () => editorService.openEditor({
                            resource: collection.presentation.origin,
                        })
                    });
                }
                if (mcpServer.connectionState.get().state === 3 /* McpConnectionState.Kind.Error */) {
                    buttons.push({
                        iconClass: ThemeIcon.asClassName(Codicon.warning),
                        tooltip: localize(6095, null),
                        action: () => mcpServer.showOutput(),
                    });
                }
                const cacheState = mcpServer.cacheState.get();
                const children = [];
                let collapsed = true;
                if (cacheState === 0 /* McpServerCacheState.Unknown */ || cacheState === 2 /* McpServerCacheState.Outdated */) {
                    collapsed = false;
                    children.push({
                        itemType: 'callback',
                        iconClass: ThemeIcon.asClassName(Codicon.sync),
                        label: localize(6096, null),
                        pickable: false,
                        run: () => {
                            treePicker.busy = true;
                            (async () => {
                                const ok = await startServerAndWaitForLiveTools(mcpServer, { promptType: 'all-untrusted' });
                                if (!ok) {
                                    mcpServer.showOutput();
                                    treePicker.hide();
                                    return;
                                }
                                treePicker.busy = false;
                                computeItems(collectResults());
                            })();
                            return false;
                        },
                    });
                }
                const bucket = {
                    itemType: 'bucket',
                    ordinal: 2 /* BucketOrdinal.Mcp */,
                    id: key,
                    label: source.label,
                    checked: undefined,
                    collapsed,
                    children,
                    buttons,
                    sortOrder: 2,
                };
                const iconPath = mcpServer.serverMetadata.get()?.icons.getUrl(22);
                if (iconPath) {
                    bucket.iconPath = iconPath;
                }
                else {
                    bucket.iconClass = ThemeIcon.asClassName(Codicon.mcp);
                }
                return bucket;
            }
            else if (source.type === 'extension') {
                return {
                    itemType: 'bucket',
                    ordinal: 3 /* BucketOrdinal.Extension */,
                    id: key,
                    label: source.label,
                    checked: undefined,
                    children: [],
                    buttons: [],
                    collapsed: true,
                    iconClass: ThemeIcon.asClassName(Codicon.extensions),
                    sortOrder: 3,
                };
            }
            else if (source.type === 'internal') {
                return {
                    itemType: 'bucket',
                    ordinal: 1 /* BucketOrdinal.BuiltIn */,
                    id: key,
                    label: localize(6097, null),
                    checked: undefined,
                    children: [],
                    buttons: [],
                    collapsed: false,
                    sortOrder: 1,
                };
            }
            else {
                return {
                    itemType: 'bucket',
                    ordinal: 0 /* BucketOrdinal.User */,
                    id: key,
                    label: localize(6098, null),
                    checked: undefined,
                    children: [],
                    buttons: [],
                    collapsed: true,
                    sortOrder: 4,
                };
            }
        };
        const getBucket = (source) => {
            const key = getKey(source);
            let bucket = bucketMap.get(key);
            if (!bucket) {
                bucket = createBucket(source, key);
                if (bucket) {
                    bucketMap.set(key, bucket);
                }
            }
            return bucket;
        };
        for (const toolSet of toolsService.getToolSetsForModel(model)) {
            if (!toolsEntries.has(toolSet.id)) {
                continue;
            }
            const bucket = getBucket(toolSet.source);
            if (!bucket) {
                continue;
            }
            const toolSetChecked = toolsEntries.get(toolSet.id) === true;
            if (toolSet.source.type === 'mcp') {
                // bucket represents the toolset
                bucket.toolset = toolSet;
                if (toolSetChecked) {
                    bucket.checked = toolSetChecked;
                }
                // all mcp tools are part of toolsService.getTools()
            }
            else {
                const treeItem = createToolSetTreeItem(toolSet, toolSetChecked, editorService);
                bucket.children.push(treeItem);
                const children = [];
                for (const tool of toolSet.getTools()) {
                    const toolChecked = toolSetChecked || toolsEntries.get(tool.id) === true;
                    const toolTreeItem = createToolTreeItemFromData(tool, toolChecked);
                    children.push(toolTreeItem);
                }
                if (children.length > 0) {
                    treeItem.children = children;
                }
            }
        }
        // getting potentially disabled tools is fine here because we filter `toolsEntries.has`
        for (const tool of toolsService.getAllToolsIncludingDisabled()) {
            if (!tool.canBeReferencedInPrompt || !toolsEntries.has(tool.id)) {
                continue;
            }
            const bucket = getBucket(tool.source);
            if (!bucket) {
                continue;
            }
            const toolChecked = bucket.checked === true || toolsEntries.get(tool.id) === true;
            const toolTreeItem = createToolTreeItemFromData(tool, toolChecked);
            bucket.children.push(toolTreeItem);
        }
        // Show entries for MCP servers that don't have any tools in them and might need to be started.
        for (const { server, seen } of mcpServers.values()) {
            const cacheState = server.cacheState.get();
            if (!seen && (cacheState === 0 /* McpServerCacheState.Unknown */ || cacheState === 2 /* McpServerCacheState.Outdated */)) {
                getBucket({ type: 'mcp', definitionId: server.definition.id, label: server.definition.label, instructions: '', serverLabel: '', collectionId: server.collection.id });
            }
        }
        // Convert bucket map to sorted tree items
        const sortedBuckets = Array.from(bucketMap.values()).sort((a, b) => {
            if (a.sortOrder !== b.sortOrder) {
                return a.sortOrder - b.sortOrder;
            }
            return a.label.localeCompare(b.label);
        });
        for (const bucket of sortedBuckets) {
            treeItems.push(bucket);
            // Sort children alphabetically
            bucket.children.sort((a, b) => a.label.localeCompare(b.label));
            for (const child of bucket.children) {
                if (isToolSetTreeItem(child) && child.children) {
                    child.children.sort((a, b) => a.label.localeCompare(b.label));
                }
            }
        }
        // Add approval management buttons to tool items that support confirmation
        for (const bucket of sortedBuckets) {
            const isMcpBucket = bucket.ordinal === 2 /* BucketOrdinal.Mcp */;
            const addConfirmationButton = (toolItem) => {
                if (!confirmationService.toolCanManageConfirmation(toolItem.tool)) {
                    return;
                }
                const tool = toolItem.tool;
                const manageTools = isMcpBucket ? bucket.children.flatMap(c => isToolTreeItem(c) ? [c.tool] : isToolSetTreeItem(c) && c.children ? c.children.filter(isToolTreeItem).map(gc => gc.tool) : []) : [tool];
                const buttons = toolItem.buttons ? [...toolItem.buttons] : [];
                buttons.push({
                    iconClass: ThemeIcon.asClassName(Codicon.pass),
                    tooltip: localize(6099, null),
                    keepOpen: true,
                    action: () => confirmationService.manageConfirmationPreferences(manageTools, { focusToolId: tool.id })
                });
                toolItem.buttons = buttons;
            };
            for (const child of bucket.children) {
                if (isToolTreeItem(child)) {
                    addConfirmationButton(child);
                }
                else if (isToolSetTreeItem(child) && child.children) {
                    for (const grandchild of child.children) {
                        if (isToolTreeItem(grandchild)) {
                            addConfirmationButton(grandchild);
                        }
                    }
                }
            }
        }
        if (treeItems.length === 0) {
            treePicker.placeholder = localize(6100, null);
        }
        else {
            treePicker.placeholder = placeHolder;
        }
        treePicker.setItemTree(treeItems);
    }
    // Create and configure the tree picker
    const store = new DisposableStore();
    const treePicker = store.add(quickPickService.createQuickTree());
    treePicker.placeholder = placeHolder;
    treePicker.description = description;
    treePicker.matchOnDescription = true;
    treePicker.matchOnLabel = true;
    treePicker.sortByLabel = false;
    computeItems();
    // Handle button triggers
    store.add(treePicker.onDidTriggerItemButton(e => {
        if (e.button && typeof e.button.action === 'function') {
            const actionableButton = e.button;
            actionableButton.action();
            store.dispose();
        }
    }));
    const collectResults = () => {
        const result = new Map();
        const traverse = (items) => {
            for (const item of items) {
                if (isBucketTreeItem(item)) {
                    if (item.toolset) { // MCP server
                        // MCP toolset is enabled only if all tools are enabled
                        const allChecked = item.checked === true;
                        result.set(item.toolset, allChecked);
                    }
                    traverse(item.children);
                }
                else if (isToolSetTreeItem(item)) {
                    result.set(item.toolset, item.checked === true);
                    if (item.children) {
                        traverse(item.children);
                    }
                }
                else if (isToolTreeItem(item)) {
                    result.set(item.tool, item.checked || result.get(item.tool) === true); // tools can be in user tool sets and other buckets
                }
            }
        };
        traverse(treePicker.itemTree);
        return result;
    };
    // Handle acceptance
    let didAccept = false;
    const didAcceptFinalItem = store.add(new Emitter());
    store.add(treePicker.onDidAccept(() => {
        // Check if a callback item was activated
        const activeItems = treePicker.activeItems;
        const callbackItem = activeItems.find(isCallbackTreeItem);
        if (!callbackItem) {
            didAccept = true;
            treePicker.hide();
            return;
        }
        const ret = callbackItem.run();
        if (ret !== false) {
            didAcceptFinalItem.fire();
        }
    }));
    const addMcpServerButton = {
        iconClass: ThemeIcon.asClassName(Codicon.mcp),
        tooltip: localize(6101, null)
    };
    const installExtension = {
        iconClass: ThemeIcon.asClassName(Codicon.extensions),
        tooltip: localize(6102, null)
    };
    const configureToolSets = {
        iconClass: ThemeIcon.asClassName(Codicon.gear),
        tooltip: localize(6103, null)
    };
    treePicker.title = localize(6104, null);
    treePicker.buttons = [addMcpServerButton, installExtension, configureToolSets];
    store.add(treePicker.onDidTriggerButton(button => {
        if (button === addMcpServerButton) {
            commandService.executeCommand("workbench.mcp.addConfiguration" /* McpCommandIds.AddConfiguration */);
        }
        else if (button === installExtension) {
            extensionsWorkbenchService.openSearch('@tag:language-model-tools');
        }
        else if (button === configureToolSets) {
            commandService.executeCommand(ConfigureToolSets.ID);
        }
        treePicker.hide();
    }));
    // Close picker when cancelled (e.g., when mode changes)
    if (token) {
        store.add(token.onCancellationRequested(() => {
            treePicker.hide();
        }));
    }
    // Capture initial state for telemetry comparison
    const initialState = collectResults();
    treePicker.show();
    await Promise.race([Event.toPromise(Event.any(treePicker.onDidHide, didAcceptFinalItem.event), store)]);
    // Send telemetry about tool selection changes
    sendDidChangeEvent(source, telemetryService, initialState, collectResults(), mcpRegistry);
    store.dispose();
    return didAccept ? collectResults() : undefined;
}
/**
 * Categorizes a tool or toolset source for privacy-safe telemetry.
 * Returns identifying info only for built-in/extension tools where names are public.
 * For user-defined and user MCP tools, only the category is returned.
 *
 * @param item - The tool or toolset to categorize
 * @param mcpRegistry - The MCP registry to look up collection sources for MCP tools
 */
function categorizeTool(item, mcpRegistry) {
    const source = item.source;
    switch (source.type) {
        case 'internal':
            // Built-in tools are safe to identify by name
            return { category: 'builtin', name: item.id };
        case 'extension':
            // Extension tools are public, safe to include name and extension ID
            return { category: 'extension', name: item.id, extensionId: source.extensionId.value };
        case 'mcp': {
            // MCP tools: check if the collection comes from an extension
            // Never include tool names for privacy, but include extension ID if from an extension
            const collection = mcpRegistry.collections.get().find(c => c.id === source.collectionId);
            if (collection?.source instanceof ExtensionIdentifier) {
                return { category: 'extension-mcp', extensionId: collection.source.value };
            }
            // User-configured MCP server - don't include any identifying info
            return { category: 'user-mcp' };
        }
        case 'user':
            // User-defined tool sets: don't include names for privacy
            return { category: 'user-toolset' };
        case 'external':
            // External tools shouldn't appear in the picker, treat as user-defined for safety
            return { category: 'user-toolset' };
        default:
            assertNever(source);
    }
}
function computeToolToggleSummary(initialState, finalState, mcpRegistry) {
    const summary = {
        builtinEnabled: 0,
        builtinDisabled: 0,
        extensionEnabled: 0,
        extensionDisabled: 0,
        extensionMcpEnabled: 0,
        extensionMcpDisabled: 0,
        userMcpEnabled: 0,
        userMcpDisabled: 0,
        userToolsetEnabled: 0,
        userToolsetDisabled: 0,
        details: ''
    };
    const detailItems = [];
    // Compare states and record changes
    for (const [item, finalEnabled] of finalState) {
        const initialEnabled = initialState.get(item) ?? false;
        if (initialEnabled === finalEnabled) {
            continue; // No change
        }
        const categorized = categorizeTool(item, mcpRegistry);
        const enabled = finalEnabled;
        switch (categorized.category) {
            case 'builtin':
                if (enabled) {
                    summary.builtinEnabled++;
                }
                else {
                    summary.builtinDisabled++;
                }
                detailItems.push({ category: 'builtin', name: categorized.name, enabled });
                break;
            case 'extension':
                if (enabled) {
                    summary.extensionEnabled++;
                }
                else {
                    summary.extensionDisabled++;
                }
                detailItems.push({ category: 'extension', name: categorized.name, extensionId: categorized.extensionId, enabled });
                break;
            case 'extension-mcp':
                if (enabled) {
                    summary.extensionMcpEnabled++;
                }
                else {
                    summary.extensionMcpDisabled++;
                }
                detailItems.push({ category: 'extension-mcp', extensionId: categorized.extensionId, enabled });
                break;
            case 'user-mcp':
                if (enabled) {
                    summary.userMcpEnabled++;
                }
                else {
                    summary.userMcpDisabled++;
                }
                // Don't include name for privacy
                detailItems.push({ category: 'user-mcp', enabled });
                break;
            case 'user-toolset':
                if (enabled) {
                    summary.userToolsetEnabled++;
                }
                else {
                    summary.userToolsetDisabled++;
                }
                // Don't include name for privacy
                detailItems.push({ category: 'user-toolset', enabled });
                break;
        }
    }
    // Serialize details as JSON
    summary.details = JSON.stringify(detailItems);
    return summary;
}
function sendDidChangeEvent(source, telemetryService, initialState, finalState, mcpRegistry) {
    const summary = computeToolToggleSummary(initialState, finalState, mcpRegistry);
    const changed = summary.builtinEnabled > 0 || summary.builtinDisabled > 0 ||
        summary.extensionEnabled > 0 || summary.extensionDisabled > 0 ||
        summary.extensionMcpEnabled > 0 || summary.extensionMcpDisabled > 0 ||
        summary.userMcpEnabled > 0 || summary.userMcpDisabled > 0 ||
        summary.userToolsetEnabled > 0 || summary.userToolsetDisabled > 0;
    telemetryService.publicLog2('chatToolPickerClosed', {
        source,
        changed,
        builtinEnabled: summary.builtinEnabled,
        builtinDisabled: summary.builtinDisabled,
        extensionEnabled: summary.extensionEnabled,
        extensionDisabled: summary.extensionDisabled,
        extensionMcpEnabled: summary.extensionMcpEnabled,
        extensionMcpDisabled: summary.extensionMcpDisabled,
        userMcpEnabled: summary.userMcpEnabled,
        userMcpDisabled: summary.userMcpDisabled,
        userToolsetEnabled: summary.userToolsetEnabled,
        userToolsetDisabled: summary.userToolsetDisabled,
        details: summary.details,
    });
}
//# sourceMappingURL=chatToolPicker.js.map