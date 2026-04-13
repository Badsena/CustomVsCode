/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { localize, localize2 } from '../../../../nls.js';
import { Action2, MenuRegistry, registerAction2 } from '../../../../platform/actions/common/actions.js';
import { ContextKeyExpr } from '../../../../platform/contextkey/common/contextkey.js';
import { AI_CUSTOMIZATION_VIEW_ID, AICustomizationItemMenuId } from './aiCustomizationTreeView.js';
import { AICustomizationItemDisabledContextKey, AICustomizationItemStorageContextKey, AICustomizationItemTypeContextKey } from './aiCustomizationTreeViewViews.js';
import { PromptsType } from '../../../../workbench/contrib/chat/common/promptSyntax/promptTypes.js';
import { Codicon } from '../../../../base/common/codicons.js';
import { ICommandService } from '../../../../platform/commands/common/commands.js';
import { URI } from '../../../../base/common/uri.js';
import { IEditorService } from '../../../../workbench/services/editor/common/editorService.js';
import { IFileService } from '../../../../platform/files/common/files.js';
import { IClipboardService } from '../../../../platform/clipboard/common/clipboardService.js';
import { IDialogService } from '../../../../platform/dialogs/common/dialogs.js';
import { IPromptsService } from '../../../../workbench/contrib/chat/common/promptSyntax/service/promptsService.js';
import { IViewsService } from '../../../../workbench/services/views/common/viewsService.js';
import { BUILTIN_STORAGE } from '../../chat/common/builtinPromptsStorage.js';
/**
 * Extracts a URI from various context formats.
 * Context can be a URI, string, or an object with uri property.
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
//#endregion
//#region Context Menu Actions
// Open file action
const OPEN_AI_CUSTOMIZATION_FILE_ID = 'aiCustomization.openFile';
registerAction2(class extends Action2 {
    constructor() {
        super({
            id: OPEN_AI_CUSTOMIZATION_FILE_ID,
            title: localize2(3058, "Open"),
            icon: Codicon.goToFile,
        });
    }
    async run(accessor, context) {
        const editorService = accessor.get(IEditorService);
        await editorService.openEditor({
            resource: extractURI(context)
        });
    }
});
// Run prompt action
const RUN_PROMPT_FROM_VIEW_ID = 'aiCustomization.runPrompt';
registerAction2(class extends Action2 {
    constructor() {
        super({
            id: RUN_PROMPT_FROM_VIEW_ID,
            title: localize2(3059, "Run Prompt"),
            icon: Codicon.play,
        });
    }
    async run(accessor, context) {
        const commandService = accessor.get(ICommandService);
        await commandService.executeCommand('workbench.action.chat.run.prompt.current', extractURI(context));
    }
});
// Delete file action
const DELETE_AI_CUSTOMIZATION_FILE_ID = 'aiCustomization.deleteFile';
registerAction2(class extends Action2 {
    constructor() {
        super({
            id: DELETE_AI_CUSTOMIZATION_FILE_ID,
            title: localize2(3060, "Delete"),
            icon: Codicon.trash,
        });
    }
    async run(accessor, context) {
        const fileService = accessor.get(IFileService);
        const dialogService = accessor.get(IDialogService);
        const uri = extractURI(context);
        const name = typeof context === 'object' && !URI.isUri(context) ? context.name ?? '' : '';
        if (uri.scheme !== 'file') {
            return;
        }
        const confirmation = await dialogService.confirm({
            message: localize(3047, null, name || uri.path),
            primaryButton: localize(3048, null),
        });
        if (confirmation.confirmed) {
            const useTrash = fileService.hasCapability(uri, 4096 /* FileSystemProviderCapabilities.Trash */);
            await fileService.del(uri, { useTrash, recursive: true });
        }
    }
});
// Copy path action
const COPY_AI_CUSTOMIZATION_PATH_ID = 'aiCustomization.copyPath';
registerAction2(class extends Action2 {
    constructor() {
        super({
            id: COPY_AI_CUSTOMIZATION_PATH_ID,
            title: localize2(3061, "Copy Path"),
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
// Register context menu items
// Inline hover actions (shown as icon buttons on hover)
MenuRegistry.appendMenuItem(AICustomizationItemMenuId, {
    command: { id: DELETE_AI_CUSTOMIZATION_FILE_ID, title: localize(3049, null), icon: Codicon.trash },
    group: 'inline',
    order: 10,
});
// Context menu items (shown on right-click)
MenuRegistry.appendMenuItem(AICustomizationItemMenuId, {
    command: { id: OPEN_AI_CUSTOMIZATION_FILE_ID, title: localize(3050, null) },
    group: '1_open',
    order: 1,
});
MenuRegistry.appendMenuItem(AICustomizationItemMenuId, {
    command: { id: RUN_PROMPT_FROM_VIEW_ID, title: localize(3051, null), icon: Codicon.play },
    group: '2_run',
    order: 1,
    when: ContextKeyExpr.equals(AICustomizationItemTypeContextKey.key, PromptsType.prompt),
});
MenuRegistry.appendMenuItem(AICustomizationItemMenuId, {
    command: { id: COPY_AI_CUSTOMIZATION_PATH_ID, title: localize(3052, null) },
    group: '3_modify',
    order: 1,
});
MenuRegistry.appendMenuItem(AICustomizationItemMenuId, {
    command: { id: DELETE_AI_CUSTOMIZATION_FILE_ID, title: localize(3053, null) },
    group: '3_modify',
    order: 10,
});
// Disable item action
const DISABLE_AI_CUSTOMIZATION_ITEM_ID = 'aiCustomization.disableItem';
registerAction2(class extends Action2 {
    constructor() {
        super({
            id: DISABLE_AI_CUSTOMIZATION_ITEM_ID,
            title: localize2(3062, "Disable"),
            icon: Codicon.eyeClosed,
        });
    }
    async run(accessor, context) {
        if (typeof context !== 'object' || URI.isUri(context)) {
            return;
        }
        const promptsService = accessor.get(IPromptsService);
        const viewsService = accessor.get(IViewsService);
        const uri = extractURI(context);
        const promptType = context.promptType;
        if (!promptType) {
            return;
        }
        const disabled = promptsService.getDisabledPromptFiles(promptType);
        disabled.add(uri);
        promptsService.setDisabledPromptFiles(promptType, disabled);
        const view = viewsService.getActiveViewWithId(AI_CUSTOMIZATION_VIEW_ID);
        view?.refresh();
    }
});
// Enable item action
const ENABLE_AI_CUSTOMIZATION_ITEM_ID = 'aiCustomization.enableItem';
registerAction2(class extends Action2 {
    constructor() {
        super({
            id: ENABLE_AI_CUSTOMIZATION_ITEM_ID,
            title: localize2(3063, "Enable"),
            icon: Codicon.eye,
        });
    }
    async run(accessor, context) {
        if (typeof context !== 'object' || URI.isUri(context)) {
            return;
        }
        const promptsService = accessor.get(IPromptsService);
        const viewsService = accessor.get(IViewsService);
        const uri = extractURI(context);
        const promptType = context.promptType;
        if (!promptType) {
            return;
        }
        const disabled = promptsService.getDisabledPromptFiles(promptType);
        disabled.delete(uri);
        promptsService.setDisabledPromptFiles(promptType, disabled);
        const view = viewsService.getActiveViewWithId(AI_CUSTOMIZATION_VIEW_ID);
        view?.refresh();
    }
});
// Context menu: Disable (shown when builtin item is enabled)
MenuRegistry.appendMenuItem(AICustomizationItemMenuId, {
    command: { id: DISABLE_AI_CUSTOMIZATION_ITEM_ID, title: localize(3054, null) },
    group: '4_toggle',
    order: 1,
    when: ContextKeyExpr.and(ContextKeyExpr.equals(AICustomizationItemDisabledContextKey.key, false), ContextKeyExpr.equals(AICustomizationItemStorageContextKey.key, BUILTIN_STORAGE), ContextKeyExpr.equals(AICustomizationItemTypeContextKey.key, PromptsType.skill)),
});
// Context menu: Enable (shown when builtin item is disabled)
MenuRegistry.appendMenuItem(AICustomizationItemMenuId, {
    command: { id: ENABLE_AI_CUSTOMIZATION_ITEM_ID, title: localize(3055, null) },
    group: '4_toggle',
    order: 1,
    when: ContextKeyExpr.and(ContextKeyExpr.equals(AICustomizationItemDisabledContextKey.key, true), ContextKeyExpr.equals(AICustomizationItemStorageContextKey.key, BUILTIN_STORAGE), ContextKeyExpr.equals(AICustomizationItemTypeContextKey.key, PromptsType.skill)),
});
// Inline hover: Disable (shown when builtin item is enabled)
MenuRegistry.appendMenuItem(AICustomizationItemMenuId, {
    command: { id: DISABLE_AI_CUSTOMIZATION_ITEM_ID, title: localize(3056, null), icon: Codicon.eyeClosed },
    group: 'inline',
    order: 5,
    when: ContextKeyExpr.and(ContextKeyExpr.equals(AICustomizationItemDisabledContextKey.key, false), ContextKeyExpr.equals(AICustomizationItemStorageContextKey.key, BUILTIN_STORAGE), ContextKeyExpr.equals(AICustomizationItemTypeContextKey.key, PromptsType.skill)),
});
// Inline hover: Enable (shown when builtin item is disabled)
MenuRegistry.appendMenuItem(AICustomizationItemMenuId, {
    command: { id: ENABLE_AI_CUSTOMIZATION_ITEM_ID, title: localize(3057, null), icon: Codicon.eye },
    group: 'inline',
    order: 5,
    when: ContextKeyExpr.and(ContextKeyExpr.equals(AICustomizationItemDisabledContextKey.key, true), ContextKeyExpr.equals(AICustomizationItemStorageContextKey.key, BUILTIN_STORAGE), ContextKeyExpr.equals(AICustomizationItemTypeContextKey.key, PromptsType.skill)),
});
//#endregion
//# sourceMappingURL=aiCustomizationTreeView.contribution.js.map