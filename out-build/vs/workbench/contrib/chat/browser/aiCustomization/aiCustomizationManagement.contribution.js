/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Disposable } from '../../../../../base/common/lifecycle.js';
import { localize, localize2 } from '../../../../../nls.js';
import { Action2, MenuRegistry, registerAction2 } from '../../../../../platform/actions/common/actions.js';
import { SyncDescriptor } from '../../../../../platform/instantiation/common/descriptors.js';
import { Registry } from '../../../../../platform/registry/common/platform.js';
import { EditorPaneDescriptor } from '../../../../browser/editor.js';
import { EditorExtensions } from '../../../../common/editor.js';
import { IEditorService } from '../../../../services/editor/common/editorService.js';
import { ChatContextKeys } from '../../common/actions/chatContextKeys.js';
import { CHAT_CATEGORY } from '../actions/chatActions.js';
import { AICustomizationManagementEditor } from './aiCustomizationManagementEditor.js';
import { AICustomizationManagementEditorInput } from './aiCustomizationManagementEditorInput.js';
import { AI_CUSTOMIZATION_MANAGEMENT_EDITOR_ID, AI_CUSTOMIZATION_MANAGEMENT_EDITOR_INPUT_ID, AI_CUSTOMIZATION_ITEM_DISABLED_KEY, AI_CUSTOMIZATION_ITEM_STORAGE_KEY, AI_CUSTOMIZATION_ITEM_TYPE_KEY, AI_CUSTOMIZATION_ITEM_URI_KEY, AICustomizationManagementCommands, AICustomizationManagementItemMenuId, BUILTIN_STORAGE, } from './aiCustomizationManagement.js';
import { registerWorkbenchContribution2 } from '../../../../common/contributions.js';
import { Codicon } from '../../../../../base/common/codicons.js';
import { URI } from '../../../../../base/common/uri.js';
import { ICommandService } from '../../../../../platform/commands/common/commands.js';
import { PromptsType } from '../../common/promptSyntax/promptTypes.js';
import { PromptsStorage, IPromptsService } from '../../common/promptSyntax/service/promptsService.js';
import { IAICustomizationWorkspaceService } from '../../common/aiCustomizationWorkspaceService.js';
import { ContextKeyExpr } from '../../../../../platform/contextkey/common/contextkey.js';
import { ChatConfiguration } from '../../common/constants.js';
import { IFileService } from '../../../../../platform/files/common/files.js';
import { IDialogService } from '../../../../../platform/dialogs/common/dialogs.js';
import { basename, dirname, isEqualOrParent } from '../../../../../base/common/resources.js';
import { Schemas } from '../../../../../base/common/network.js';
import { isWindows, isMacintosh } from '../../../../../base/common/platform.js';
import { ITelemetryService } from '../../../../../platform/telemetry/common/telemetry.js';
import { IClipboardService } from '../../../../../platform/clipboard/common/clipboardService.js';
import { getCodeEditor } from '../../../../../editor/browser/editorBrowser.js';
import { MarkdownString } from '../../../../../base/common/htmlContent.js';
import { IAgentPluginService } from '../../common/plugins/agentPluginService.js';
//#endregion
//#region Editor Registration
Registry.as(EditorExtensions.EditorPane).registerEditorPane(EditorPaneDescriptor.create(AICustomizationManagementEditor, AI_CUSTOMIZATION_MANAGEMENT_EDITOR_ID, localize(6410, null)), [
    // Note: Using the class directly since we use a singleton pattern
    new SyncDescriptor(AICustomizationManagementEditorInput)
]);
//#endregion
//#region Editor Serializer
class AICustomizationManagementEditorInputSerializer {
    canSerialize(editorInput) {
        return editorInput instanceof AICustomizationManagementEditorInput;
    }
    serialize(input) {
        return '';
    }
    deserialize(instantiationService) {
        return AICustomizationManagementEditorInput.getOrCreate();
    }
}
Registry.as(EditorExtensions.EditorFactory).registerEditorSerializer(AI_CUSTOMIZATION_MANAGEMENT_EDITOR_INPUT_ID, AICustomizationManagementEditorInputSerializer);
/**
 * Extracts a URI from various context formats.
 */
function extractURI(context) {
    if (URI.isUri(context)) {
        return context;
    }
    if (typeof context === 'string') {
        return URI.parse(context);
    }
    if (URI.isUri(context.uri)) {
        return context.uri;
    }
    return URI.parse(context.uri);
}
/**
 * Extracts storage type from context.
 */
function extractStorage(context) {
    if (URI.isUri(context) || typeof context === 'string') {
        return undefined;
    }
    return context.storage;
}
/**
 * Extracts prompt type from context.
 */
function extractPromptType(context) {
    if (URI.isUri(context) || typeof context === 'string') {
        return undefined;
    }
    return context.promptType;
}
// Open file action
const OPEN_AI_CUSTOMIZATION_MGMT_FILE_ID = 'aiCustomizationManagement.openFile';
registerAction2(class extends Action2 {
    constructor() {
        super({
            id: OPEN_AI_CUSTOMIZATION_MGMT_FILE_ID,
            title: localize2(6435, "Open"),
            icon: Codicon.goToFile,
        });
    }
    async run(accessor, context) {
        const editorService = accessor.get(IEditorService);
        const storage = extractStorage(context);
        const editorPane = await editorService.openEditor({
            resource: extractURI(context)
        });
        const codeEditor = getCodeEditor(editorPane?.getControl());
        if (codeEditor && (storage === PromptsStorage.extension || storage === PromptsStorage.plugin)) {
            codeEditor.updateOptions({
                readOnly: true,
                readOnlyMessage: new MarkdownString(localize(6411, null)),
            });
        }
    }
});
// Run prompt action
const RUN_PROMPT_MGMT_ID = 'aiCustomizationManagement.runPrompt';
registerAction2(class extends Action2 {
    constructor() {
        super({
            id: RUN_PROMPT_MGMT_ID,
            title: localize2(6436, "Run Prompt"),
            icon: Codicon.play,
        });
    }
    async run(accessor, context) {
        const commandService = accessor.get(ICommandService);
        await commandService.executeCommand('workbench.action.chat.run.prompt.current', extractURI(context));
    }
});
// Reveal in Finder/Explorer action
const REVEAL_IN_OS_LABEL = isWindows
    ? localize2(6437, "Reveal in File Explorer")
    : isMacintosh
        ? localize2(6438, "Reveal in Finder")
        : localize2(6439, "Open Containing Folder");
const REVEAL_AI_CUSTOMIZATION_IN_OS_ID = 'aiCustomizationManagement.revealInOS';
registerAction2(class extends Action2 {
    constructor() {
        super({
            id: REVEAL_AI_CUSTOMIZATION_IN_OS_ID,
            title: REVEAL_IN_OS_LABEL,
            icon: Codicon.folderOpened,
        });
    }
    async run(accessor, context) {
        const commandService = accessor.get(ICommandService);
        const uri = extractURI(context);
        // Use existing reveal command
        await commandService.executeCommand('revealFileInOS', uri);
    }
});
// Delete action
const DELETE_AI_CUSTOMIZATION_ID = 'aiCustomizationManagement.delete';
registerAction2(class extends Action2 {
    constructor() {
        super({
            id: DELETE_AI_CUSTOMIZATION_ID,
            title: localize2(6440, "Delete"),
            icon: Codicon.trash,
        });
    }
    async run(accessor, context) {
        const fileService = accessor.get(IFileService);
        const dialogService = accessor.get(IDialogService);
        const uri = extractURI(context);
        const storage = extractStorage(context);
        const promptType = extractPromptType(context);
        const isSkill = promptType === PromptsType.skill;
        // For skills, use the parent folder name since skills are structured as <skillname>/SKILL.md.
        const fileName = isSkill ? basename(dirname(uri)) : basename(uri);
        // Plugin-provided files: offer to uninstall the plugin
        if (storage === PromptsStorage.plugin) {
            const agentPluginService = accessor.get(IAgentPluginService);
            const plugin = agentPluginService.plugins.get().find(p => isEqualOrParent(uri, p.uri));
            if (plugin) {
                const result = await dialogService.confirm({
                    message: localize(6412, null, plugin.label),
                    detail: localize(6413, null),
                    primaryButton: localize(6414, null),
                    type: 'question',
                });
                if (result.confirmed) {
                    plugin.remove();
                }
            }
            return;
        }
        // Extension and built-in files cannot be deleted
        if (storage === PromptsStorage.extension || storage === BUILTIN_STORAGE) {
            await dialogService.info(localize(6415, null), localize(6416, null));
            return;
        }
        // Confirm deletion
        const message = isSkill
            ? localize(6417, null, fileName)
            : localize(6418, null, fileName);
        const confirmation = await dialogService.confirm({
            message,
            detail: localize(6419, null),
            primaryButton: localize(6420, null),
            type: 'warning',
        });
        if (confirmation.confirmed) {
            try {
                const telemetryService = accessor.get(ITelemetryService);
                telemetryService.publicLog2('chatCustomizationEditor.deleteItem', {
                    promptType: promptType ?? '',
                    storage: storage ?? '',
                });
            }
            catch {
                // Telemetry must not block deletion
            }
            // For skills, delete the parent folder (e.g. .github/skills/my-skill/)
            // since each skill is a folder containing SKILL.md.
            const deleteTarget = isSkill ? dirname(uri) : uri;
            const useTrash = fileService.hasCapability(deleteTarget, 4096 /* FileSystemProviderCapabilities.Trash */);
            await fileService.del(deleteTarget, { useTrash, recursive: isSkill });
            // Commit the deletion to git (sessions: main repo + worktree)
            if (storage === PromptsStorage.local) {
                const workspaceService = accessor.get(IAICustomizationWorkspaceService);
                const projectRoot = workspaceService.getActiveProjectRoot();
                if (projectRoot) {
                    await workspaceService.deleteFiles(projectRoot, [deleteTarget]);
                }
            }
        }
    }
});
// Copy path action
const COPY_AI_CUSTOMIZATION_PATH_ID = 'aiCustomizationManagement.copyPath';
registerAction2(class extends Action2 {
    constructor() {
        super({
            id: COPY_AI_CUSTOMIZATION_PATH_ID,
            title: localize2(6441, "Copy Path"),
            icon: Codicon.clippy,
        });
    }
    async run(accessor, context) {
        const clipboardService = accessor.get(IClipboardService);
        const uri = extractURI(context);
        const textToCopy = uri.scheme === 'file' ? uri.fsPath : uri.toString(true);
        await clipboardService.writeText(textToCopy);
    }
});
/**
 * When clause that hides an action for read-only (extension, plugin, built-in) items.
 */
const WHEN_ITEM_IS_DELETABLE = ContextKeyExpr.and(ContextKeyExpr.notEquals(AI_CUSTOMIZATION_ITEM_STORAGE_KEY, PromptsStorage.extension), ContextKeyExpr.notEquals(AI_CUSTOMIZATION_ITEM_STORAGE_KEY, PromptsStorage.plugin), ContextKeyExpr.notEquals(AI_CUSTOMIZATION_ITEM_STORAGE_KEY, BUILTIN_STORAGE));
/**
 * When clause that shows an action only for plugin items.
 */
const WHEN_ITEM_IS_PLUGIN = ContextKeyExpr.equals(AI_CUSTOMIZATION_ITEM_STORAGE_KEY, PromptsStorage.plugin);
// Register context menu items
// Inline hover actions (shown as icon buttons on hover)
MenuRegistry.appendMenuItem(AICustomizationManagementItemMenuId, {
    command: { id: COPY_AI_CUSTOMIZATION_PATH_ID, title: localize(6421, null), icon: Codicon.clippy },
    group: 'inline',
    order: 1,
});
MenuRegistry.appendMenuItem(AICustomizationManagementItemMenuId, {
    command: { id: DELETE_AI_CUSTOMIZATION_ID, title: localize(6422, null), icon: Codicon.trash },
    group: 'inline',
    order: 10,
    when: WHEN_ITEM_IS_DELETABLE,
});
// Context menu items (shown on right-click)
MenuRegistry.appendMenuItem(AICustomizationManagementItemMenuId, {
    command: { id: OPEN_AI_CUSTOMIZATION_MGMT_FILE_ID, title: localize(6423, null) },
    group: '1_open',
    order: 1,
});
MenuRegistry.appendMenuItem(AICustomizationManagementItemMenuId, {
    command: { id: RUN_PROMPT_MGMT_ID, title: localize(6424, null), icon: Codicon.play },
    group: '2_run',
    order: 1,
    when: ContextKeyExpr.equals(AI_CUSTOMIZATION_ITEM_TYPE_KEY, PromptsType.prompt),
});
MenuRegistry.appendMenuItem(AICustomizationManagementItemMenuId, {
    command: { id: REVEAL_AI_CUSTOMIZATION_IN_OS_ID, title: REVEAL_IN_OS_LABEL.value },
    group: '3_file',
    order: 1,
    when: ContextKeyExpr.or(ContextKeyExpr.regex(AI_CUSTOMIZATION_ITEM_URI_KEY, new RegExp(`^${Schemas.file}:`)), ContextKeyExpr.regex(AI_CUSTOMIZATION_ITEM_URI_KEY, new RegExp(`^${Schemas.vscodeUserData}:`))),
});
MenuRegistry.appendMenuItem(AICustomizationManagementItemMenuId, {
    command: { id: DELETE_AI_CUSTOMIZATION_ID, title: localize(6425, null) },
    group: '4_modify',
    order: 1,
    when: WHEN_ITEM_IS_DELETABLE,
});
// Uninstall Plugin action - shown for plugin-provided items
const UNINSTALL_PLUGIN_AI_CUSTOMIZATION_ID = 'aiCustomizationManagement.uninstallPlugin';
registerAction2(class extends Action2 {
    constructor() {
        super({
            id: UNINSTALL_PLUGIN_AI_CUSTOMIZATION_ID,
            title: localize2(6442, "Uninstall Plugin"),
            icon: Codicon.trash,
        });
    }
    async run(accessor, context) {
        const agentPluginService = accessor.get(IAgentPluginService);
        const dialogService = accessor.get(IDialogService);
        const uri = extractURI(context);
        const plugin = agentPluginService.plugins.get().find(p => isEqualOrParent(uri, p.uri));
        if (!plugin) {
            return;
        }
        const result = await dialogService.confirm({
            message: localize(6426, null, plugin.label),
            detail: localize(6427, null),
            primaryButton: localize(6428, null),
            type: 'question',
        });
        if (result.confirmed) {
            plugin.remove();
        }
    }
});
MenuRegistry.appendMenuItem(AICustomizationManagementItemMenuId, {
    command: { id: UNINSTALL_PLUGIN_AI_CUSTOMIZATION_ID, title: localize(6429, null), icon: Codicon.trash },
    group: 'inline',
    order: 10,
    when: WHEN_ITEM_IS_PLUGIN,
});
MenuRegistry.appendMenuItem(AICustomizationManagementItemMenuId, {
    command: { id: UNINSTALL_PLUGIN_AI_CUSTOMIZATION_ID, title: localize(6430, null) },
    group: '4_modify',
    order: 1,
    when: WHEN_ITEM_IS_PLUGIN,
});
// Disable item action
const DISABLE_AI_CUSTOMIZATION_MGMT_ITEM_ID = 'aiCustomizationManagement.disableItem';
registerAction2(class extends Action2 {
    constructor() {
        super({
            id: DISABLE_AI_CUSTOMIZATION_MGMT_ITEM_ID,
            title: localize2(6443, "Disable"),
            icon: Codicon.eyeClosed,
        });
    }
    async run(accessor, context) {
        const promptsService = accessor.get(IPromptsService);
        const uri = extractURI(context);
        const promptType = extractPromptType(context);
        if (!promptType) {
            return;
        }
        const disabled = promptsService.getDisabledPromptFiles(promptType);
        disabled.add(uri);
        promptsService.setDisabledPromptFiles(promptType, disabled);
    }
});
// Enable item action
const ENABLE_AI_CUSTOMIZATION_MGMT_ITEM_ID = 'aiCustomizationManagement.enableItem';
registerAction2(class extends Action2 {
    constructor() {
        super({
            id: ENABLE_AI_CUSTOMIZATION_MGMT_ITEM_ID,
            title: localize2(6444, "Enable"),
            icon: Codicon.eye,
        });
    }
    async run(accessor, context) {
        const promptsService = accessor.get(IPromptsService);
        const uri = extractURI(context);
        const promptType = extractPromptType(context);
        if (!promptType) {
            return;
        }
        const disabled = promptsService.getDisabledPromptFiles(promptType);
        disabled.delete(uri);
        promptsService.setDisabledPromptFiles(promptType, disabled);
    }
});
// Context menu: Disable (shown when builtin item is enabled)
MenuRegistry.appendMenuItem(AICustomizationManagementItemMenuId, {
    command: { id: DISABLE_AI_CUSTOMIZATION_MGMT_ITEM_ID, title: localize(6431, null) },
    group: '5_toggle',
    order: 1,
    when: ContextKeyExpr.and(ContextKeyExpr.equals(AI_CUSTOMIZATION_ITEM_DISABLED_KEY, false), ContextKeyExpr.equals(AI_CUSTOMIZATION_ITEM_STORAGE_KEY, BUILTIN_STORAGE), ContextKeyExpr.equals(AI_CUSTOMIZATION_ITEM_TYPE_KEY, PromptsType.skill)),
});
// Context menu: Enable (shown when builtin item is disabled)
MenuRegistry.appendMenuItem(AICustomizationManagementItemMenuId, {
    command: { id: ENABLE_AI_CUSTOMIZATION_MGMT_ITEM_ID, title: localize(6432, null) },
    group: '5_toggle',
    order: 1,
    when: ContextKeyExpr.and(ContextKeyExpr.equals(AI_CUSTOMIZATION_ITEM_DISABLED_KEY, true), ContextKeyExpr.equals(AI_CUSTOMIZATION_ITEM_STORAGE_KEY, BUILTIN_STORAGE), ContextKeyExpr.equals(AI_CUSTOMIZATION_ITEM_TYPE_KEY, PromptsType.skill)),
});
// Inline hover: Disable (shown when builtin item is enabled)
MenuRegistry.appendMenuItem(AICustomizationManagementItemMenuId, {
    command: { id: DISABLE_AI_CUSTOMIZATION_MGMT_ITEM_ID, title: localize(6433, null), icon: Codicon.eyeClosed },
    group: 'inline',
    order: 5,
    when: ContextKeyExpr.and(ContextKeyExpr.equals(AI_CUSTOMIZATION_ITEM_DISABLED_KEY, false), ContextKeyExpr.equals(AI_CUSTOMIZATION_ITEM_STORAGE_KEY, BUILTIN_STORAGE), ContextKeyExpr.equals(AI_CUSTOMIZATION_ITEM_TYPE_KEY, PromptsType.skill)),
});
// Inline hover: Enable (shown when builtin item is disabled)
MenuRegistry.appendMenuItem(AICustomizationManagementItemMenuId, {
    command: { id: ENABLE_AI_CUSTOMIZATION_MGMT_ITEM_ID, title: localize(6434, null), icon: Codicon.eye },
    group: 'inline',
    order: 5,
    when: ContextKeyExpr.and(ContextKeyExpr.equals(AI_CUSTOMIZATION_ITEM_DISABLED_KEY, true), ContextKeyExpr.equals(AI_CUSTOMIZATION_ITEM_STORAGE_KEY, BUILTIN_STORAGE), ContextKeyExpr.equals(AI_CUSTOMIZATION_ITEM_TYPE_KEY, PromptsType.skill)),
});
//#endregion
//#region Actions
class AICustomizationManagementActionsContribution extends Disposable {
    static { this.ID = 'workbench.contrib.aiCustomizationManagementActions'; }
    constructor() {
        super();
        this.registerActions();
    }
    registerActions() {
        // Open AI Customizations Editor
        this._register(registerAction2(class extends Action2 {
            constructor() {
                super({
                    id: AICustomizationManagementCommands.OpenEditor,
                    title: localize2(6445, "Open Customizations (Preview)"),
                    shortTitle: localize2(6446, "Customizations (Preview)"),
                    category: CHAT_CATEGORY,
                    precondition: ContextKeyExpr.and(ChatContextKeys.enabled, ContextKeyExpr.has(`config.${ChatConfiguration.ChatCustomizationMenuEnabled}`)),
                    f1: true,
                });
            }
            async run(accessor, section) {
                const editorService = accessor.get(IEditorService);
                const input = AICustomizationManagementEditorInput.getOrCreate();
                const pane = await editorService.openEditor(input, { pinned: true });
                if (section && pane instanceof AICustomizationManagementEditor) {
                    pane.selectSectionById(section);
                }
            }
        }));
    }
}
registerWorkbenchContribution2(AICustomizationManagementActionsContribution.ID, AICustomizationManagementActionsContribution, 3 /* WorkbenchPhase.AfterRestored */);
//#endregion
//# sourceMappingURL=aiCustomizationManagement.contribution.js.map