/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { parse as parseJSONC } from '../../../../../base/common/jsonc.js';
import { setProperty, applyEdits } from '../../../../../base/common/jsonEdit.js';
import { isEqual } from '../../../../../base/common/resources.js';
import { URI } from '../../../../../base/common/uri.js';
import { VSBuffer } from '../../../../../base/common/buffer.js';
import { DisposableStore } from '../../../../../base/common/lifecycle.js';
import { ChatViewId } from '../chat.js';
import { CHAT_CATEGORY, CHAT_CONFIG_MENU_ID } from '../actions/chatActions.js';
import { localize, localize2 } from '../../../../../nls.js';
import { ChatContextKeys } from '../../common/actions/chatContextKeys.js';
import { Action2, registerAction2 } from '../../../../../platform/actions/common/actions.js';
import { Codicon } from '../../../../../base/common/codicons.js';
import { ContextKeyExpr } from '../../../../../platform/contextkey/common/contextkey.js';
import { IPromptsService, PromptsStorage } from '../../common/promptSyntax/service/promptsService.js';
import { PromptsType, Target } from '../../common/promptSyntax/promptTypes.js';
import { CancellationToken } from '../../../../../base/common/cancellation.js';
import { IQuickInputService } from '../../../../../platform/quickinput/common/quickInput.js';
import { IFileService } from '../../../../../platform/files/common/files.js';
import { HOOK_METADATA, HOOKS_BY_TARGET } from '../../common/promptSyntax/hookTypes.js';
import { formatHookCommandLabel, getEffectiveCommandFieldKey } from '../../common/promptSyntax/hookSchema.js';
import { getCopilotCliHookTypeName, resolveCopilotCliHookType } from '../../common/promptSyntax/hookCopilotCliCompat.js';
import { getHookSourceFormat, HookSourceFormat, buildNewHookEntry } from '../../common/promptSyntax/hookCompatibility.js';
import { getClaudeHookTypeName, resolveClaudeHookType } from '../../common/promptSyntax/hookClaudeCompat.js';
import { ILabelService } from '../../../../../platform/label/common/label.js';
import { IEditorService } from '../../../../services/editor/common/editorService.js';
import { findHookCommandSelection, findHookCommandInYaml, parseAllHookFiles } from './hookUtils.js';
import { IWorkspaceContextService } from '../../../../../platform/workspace/common/workspace.js';
import { IPathService } from '../../../../services/path/common/pathService.js';
import { INotificationService } from '../../../../../platform/notification/common/notification.js';
import { IBulkEditService, ResourceTextEdit } from '../../../../../editor/browser/services/bulkEditService.js';
import { Range } from '../../../../../editor/common/core/range.js';
import { getCodeEditor } from '../../../../../editor/browser/editorBrowser.js';
import { IRemoteAgentService } from '../../../../services/remote/common/remoteAgentService.js';
import { OS } from '../../../../../base/common/platform.js';
/**
 * Action ID for the `Configure Hooks` action.
 */
const CONFIGURE_HOOKS_ACTION_ID = 'workbench.action.chat.configure.hooks';
/**
 * Detects if existing hooks use Copilot CLI naming convention (camelCase).
 * Returns true if any existing key matches the Copilot CLI format.
 */
function usesCopilotCliNaming(hooksObj) {
    for (const key of Object.keys(hooksObj)) {
        // Check if any key resolves to a Copilot CLI hook type
        if (resolveCopilotCliHookType(key) !== undefined) {
            return true;
        }
    }
    return false;
}
/**
 * Gets the appropriate key name for a hook type based on the naming convention used in the file.
 */
function getHookTypeKeyName(hookTypeId, useCopilotCliNamingConvention) {
    if (useCopilotCliNamingConvention) {
        const copilotCliName = getCopilotCliHookTypeName(hookTypeId);
        if (copilotCliName) {
            return copilotCliName;
        }
    }
    // Fall back to PascalCase (enum value)
    return hookTypeId;
}
/**
 * Adds a hook to an existing hook file.
 */
async function addHookToFile(hookFileUri, hookTypeId, fileService, editorService, notificationService, bulkEditService, openEditorOverride) {
    // Parse existing file
    let hooksContent;
    const fileExists = await fileService.exists(hookFileUri);
    if (fileExists) {
        const existingContent = await fileService.readFile(hookFileUri);
        try {
            hooksContent = parseJSONC(existingContent.value.toString());
            // Ensure hooks object exists
            if (!hooksContent.hooks) {
                hooksContent.hooks = {};
            }
        }
        catch {
            // If parsing fails, show error and open file for user to fix
            notificationService.error(localize(7628, null));
            await editorService.openEditor({ resource: hookFileUri });
            return;
        }
    }
    else {
        // Create new structure
        hooksContent = { hooks: {} };
    }
    // Detect source format from file URI
    const sourceFormat = getHookSourceFormat(hookFileUri);
    const isClaude = sourceFormat === HookSourceFormat.Claude;
    // Detect naming convention from existing keys
    const useCopilotCliNamingConvention = !isClaude && usesCopilotCliNaming(hooksContent.hooks);
    const hookTypeKeyName = isClaude
        ? (getClaudeHookTypeName(hookTypeId) ?? hookTypeId)
        : getHookTypeKeyName(hookTypeId, useCopilotCliNamingConvention);
    // Also check if there's an existing key for this hook type (with either naming)
    // Find existing key that resolves to the same hook type
    let existingKeyForType;
    for (const key of Object.keys(hooksContent.hooks)) {
        const resolvedType = isClaude
            ? resolveClaudeHookType(key)
            : resolveCopilotCliHookType(key);
        if (resolvedType === hookTypeId || key === hookTypeId) {
            existingKeyForType = key;
            break;
        }
    }
    // Use existing key if found, otherwise use the detected naming convention
    const keyToUse = existingKeyForType ?? hookTypeKeyName;
    // Determine the new hook index (append if hook type already exists)
    const newHookEntry = buildNewHookEntry(sourceFormat);
    const existingHooks = hooksContent.hooks[keyToUse];
    const newHookIndex = Array.isArray(existingHooks) ? existingHooks.length : 0;
    // Generate the new JSON content using setProperty to preserve comments
    let jsonContent;
    if (fileExists) {
        // Use setProperty to make targeted edits that preserve comments
        const originalText = (await fileService.readFile(hookFileUri)).value.toString();
        const detectedEol = originalText.includes('\r\n') ? '\r\n' : '\n';
        const formattingOptions = { tabSize: 1, insertSpaces: false, eol: detectedEol };
        const edits = setProperty(originalText, ['hooks', keyToUse, newHookIndex], newHookEntry, formattingOptions);
        jsonContent = applyEdits(originalText, edits);
    }
    else {
        // New file - use JSON.stringify since there are no comments to preserve
        const newContent = { hooks: { [keyToUse]: [newHookEntry] } };
        jsonContent = JSON.stringify(newContent, null, '\t');
    }
    // Check if the file is already open in an editor
    const existingEditor = editorService.editors.find(e => isEqual(e.resource, hookFileUri));
    if (existingEditor) {
        // File is already open - first focus the editor, then update its model directly
        await editorService.openEditor({
            resource: hookFileUri,
            options: {
                pinned: false
            }
        });
        // Get the code editor and update its content directly
        const editor = getCodeEditor(editorService.activeTextEditorControl);
        if (editor && editor.hasModel() && isEqual(editor.getModel().uri, hookFileUri)) {
            const model = editor.getModel();
            // Apply the full content replacement using executeEdits
            model.pushEditOperations([], [{
                    range: model.getFullModelRange(),
                    text: jsonContent
                }], () => null);
            // Find and apply the selection
            const selection = findHookCommandSelection(jsonContent, keyToUse, newHookIndex, 'command');
            if (selection && selection.endLineNumber !== undefined && selection.endColumn !== undefined) {
                editor.setSelection({
                    startLineNumber: selection.startLineNumber,
                    startColumn: selection.startColumn,
                    endLineNumber: selection.endLineNumber,
                    endColumn: selection.endColumn
                });
                editor.revealLineInCenter(selection.startLineNumber);
            }
        }
        else {
            // Fallback: active editor/model check failed, apply via bulk edit service
            await bulkEditService.apply([
                new ResourceTextEdit(hookFileUri, { range: new Range(1, 1, Number.MAX_SAFE_INTEGER, 1), text: jsonContent })
            ], { label: localize(7629, null) });
            // Find the selection for the new hook's command field
            const selection = findHookCommandSelection(jsonContent, keyToUse, newHookIndex, 'command');
            // Re-open editor with selection
            await editorService.openEditor({
                resource: hookFileUri,
                options: {
                    selection,
                    pinned: false
                }
            });
        }
    }
    else {
        // File is not currently open in an editor
        if (!fileExists) {
            // File doesn't exist - write new file directly and open
            await fileService.writeFile(hookFileUri, VSBuffer.fromString(jsonContent));
        }
        else {
            // File exists but isn't open - open it first, then use bulk edit for undo support
            await editorService.openEditor({
                resource: hookFileUri,
                options: { pinned: false }
            });
            // Apply the edit via bulk edit service for proper undo support
            await bulkEditService.apply([
                new ResourceTextEdit(hookFileUri, { range: new Range(1, 1, Number.MAX_SAFE_INTEGER, 1), text: jsonContent })
            ], { label: localize(7630, null) });
        }
        // Find the selection for the new hook's command field
        const selection = findHookCommandSelection(jsonContent, keyToUse, newHookIndex, 'command');
        // Open editor with selection (or re-focus if already open)
        if (openEditorOverride) {
            await openEditorOverride(hookFileUri, { selection });
        }
        else {
            await editorService.openEditor({
                resource: hookFileUri,
                options: {
                    selection,
                    pinned: false
                }
            });
        }
    }
}
/**
 * Awaits a single pick interaction on the given picker.
 * Returns the selected item, 'back' if the back button was pressed, or undefined if cancelled.
 */
function awaitPick(picker, backButton) {
    return new Promise(resolve => {
        let resolved = false;
        const done = (value) => {
            if (!resolved) {
                resolved = true;
                disposables.dispose();
                resolve(value);
            }
        };
        const disposables = new DisposableStore();
        disposables.add(picker.onDidAccept(() => {
            done(picker.activeItems[0]);
        }));
        disposables.add(picker.onDidTriggerButton(button => {
            if (button === backButton) {
                done('back');
            }
        }));
        disposables.add(picker.onDidHide(() => {
            done(undefined);
        }));
    });
}
var Step;
(function (Step) {
    Step[Step["SelectHookType"] = 1] = "SelectHookType";
    Step[Step["SelectHook"] = 2] = "SelectHook";
    Step[Step["SelectFile"] = 3] = "SelectFile";
    Step[Step["SelectFolder"] = 4] = "SelectFolder";
    Step[Step["EnterFilename"] = 5] = "EnterFilename";
})(Step || (Step = {}));
/**
 * Shows the Configure Hooks quick pick UI, allowing the user to view,
 * open, or create hooks. Can be called from the action or slash command.
 */
export async function showConfigureHooksQuickPick(accessor, options) {
    const promptsService = accessor.get(IPromptsService);
    const quickInputService = accessor.get(IQuickInputService);
    const fileService = accessor.get(IFileService);
    const labelService = accessor.get(ILabelService);
    const editorService = accessor.get(IEditorService);
    const workspaceService = accessor.get(IWorkspaceContextService);
    const pathService = accessor.get(IPathService);
    const notificationService = accessor.get(INotificationService);
    const bulkEditService = accessor.get(IBulkEditService);
    const remoteAgentService = accessor.get(IRemoteAgentService);
    // Get the remote OS (or fall back to local OS)
    const remoteEnv = await remoteAgentService.getEnvironment();
    const targetOS = remoteEnv?.os ?? OS;
    // Get workspace root and user home for path resolution
    const workspaceFolder = workspaceService.getWorkspace().folders[0];
    const workspaceRootUri = workspaceFolder?.uri;
    const userHomeUri = await pathService.userHome();
    const userHome = userHomeUri.fsPath ?? userHomeUri.path;
    // Parse all hook files upfront to count hooks per type
    const hookEntries = await parseAllHookFiles(promptsService, fileService, labelService, workspaceRootUri, userHome, targetOS, CancellationToken.None, { includeAgentHooks: true });
    // Count hooks per type
    const hookCountByType = new Map();
    for (const entry of hookEntries) {
        hookCountByType.set(entry.hookType, (hookCountByType.get(entry.hookType) ?? 0) + 1);
    }
    // Create a single picker instance reused across all steps
    const store = new DisposableStore();
    const picker = store.add(quickInputService.createQuickPick({ useSeparators: true }));
    const backButton = quickInputService.backButton;
    picker.show();
    let step = 1 /* Step.SelectHookType */;
    let selectedHookType;
    let selectedHook;
    let selectedFile;
    let selectedFolder;
    // Track steps that were actually shown to the user, so Back
    // skips over auto-executed steps and returns to the last visible one.
    const stepHistory = [];
    const goBack = () => stepHistory.pop();
    try {
        while (true) {
            switch (step) {
                case 1 /* Step.SelectHookType */: {
                    // Step 1: Show lifecycle events with hook counts, filtered by target
                    const makeItem = ([hookType, meta]) => {
                        const count = hookCountByType.get(hookType) ?? 0;
                        const countLabel = count > 0 ? ` (${count})` : '';
                        return {
                            label: `${meta.label}${countLabel}`,
                            description: meta.description,
                            hookType,
                            hookTypeMeta: meta
                        };
                    };
                    let pickerItems;
                    if (options?.target) {
                        // Filtered to a specific target
                        const targetHookTypes = new Set(Object.values(HOOKS_BY_TARGET[options.target]));
                        pickerItems = Object.entries(HOOK_METADATA)
                            .filter(([hookType]) => targetHookTypes.has(hookType))
                            .map(makeItem);
                    }
                    else {
                        // No target: group into Default (shared), VS Code Only, Copilot CLI Only
                        const vscodeTypes = new Set(Object.values(HOOKS_BY_TARGET[Target.VSCode]));
                        const copilotTypes = new Set(Object.values(HOOKS_BY_TARGET[Target.GitHubCopilot]));
                        const allEntries = Object.entries(HOOK_METADATA);
                        const shared = allEntries.filter(([h]) => vscodeTypes.has(h) && copilotTypes.has(h));
                        const vscodeOnly = allEntries.filter(([h]) => vscodeTypes.has(h) && !copilotTypes.has(h));
                        const copilotOnly = allEntries.filter(([h]) => !vscodeTypes.has(h) && copilotTypes.has(h));
                        pickerItems = [];
                        if (shared.length > 0) {
                            pickerItems.push({ type: 'separator', label: localize(7631, null) });
                            pickerItems.push(...shared.map(makeItem));
                        }
                        if (vscodeOnly.length > 0) {
                            pickerItems.push({ type: 'separator', label: localize(7632, null) });
                            pickerItems.push(...vscodeOnly.map(makeItem));
                        }
                        if (copilotOnly.length > 0) {
                            pickerItems.push({ type: 'separator', label: localize(7633, null) });
                            pickerItems.push(...copilotOnly.map(makeItem));
                        }
                    }
                    picker.items = pickerItems;
                    picker.value = '';
                    picker.placeholder = localize(7634, null);
                    picker.title = localize(7635, null);
                    picker.buttons = [];
                    const result = await awaitPick(picker, backButton);
                    if (!result || result === 'back') {
                        return;
                    }
                    selectedHookType = result;
                    stepHistory.push(1 /* Step.SelectHookType */);
                    step = 2 /* Step.SelectHook */;
                    break;
                }
                case 2 /* Step.SelectHook */: {
                    // Filter hooks by the selected type
                    const hooksOfType = hookEntries.filter(h => h.hookType === selectedHookType.hookType);
                    // Separate hooks by source
                    const fileHooks = hooksOfType.filter(h => !h.agentName);
                    const agentHooks = hooksOfType.filter(h => h.agentName);
                    // Step 2: Show "Add new hook" + existing hooks of this type
                    const hookItems = [];
                    // Add "Add new hook" option at the top
                    hookItems.push({
                        label: `$(plus) ${localize(7636, null)}`,
                        isAddNewHook: true,
                        alwaysShow: true
                    });
                    // Add existing file-based hooks
                    if (fileHooks.length > 0) {
                        hookItems.push({
                            type: 'separator',
                            label: localize(7637, null)
                        });
                        for (const entry of fileHooks) {
                            const description = labelService.getUriLabel(entry.fileUri, { relative: true });
                            hookItems.push({
                                label: entry.commandLabel,
                                description,
                                hookEntry: entry
                            });
                        }
                    }
                    // Add agent-defined hooks grouped by agent name
                    if (agentHooks.length > 0) {
                        const agentNames = [...new Set(agentHooks.map(h => h.agentName))];
                        for (const agentName of agentNames) {
                            hookItems.push({
                                type: 'separator',
                                label: localize(7638, null, agentName)
                            });
                            for (const entry of agentHooks.filter(h => h.agentName === agentName)) {
                                const description = labelService.getUriLabel(entry.fileUri, { relative: true });
                                hookItems.push({
                                    label: entry.commandLabel,
                                    description,
                                    hookEntry: entry
                                });
                            }
                        }
                    }
                    // Auto-execute if only "Add new hook" is available (no existing hooks)
                    if (hooksOfType.length === 0) {
                        selectedHook = hookItems[0];
                    }
                    else {
                        picker.items = hookItems;
                        picker.value = '';
                        picker.placeholder = localize(7639, null);
                        picker.title = selectedHookType.hookTypeMeta.label;
                        picker.buttons = [backButton];
                        const result = await awaitPick(picker, backButton);
                        if (result === 'back') {
                            step = goBack() ?? 1 /* Step.SelectHookType */;
                            break;
                        }
                        if (!result) {
                            return;
                        }
                        selectedHook = result;
                        stepHistory.push(2 /* Step.SelectHook */);
                    }
                    // Handle clicking on existing hook (focus into command)
                    if (selectedHook.hookEntry) {
                        const entry = selectedHook.hookEntry;
                        let selection;
                        if (entry.agentName) {
                            // Agent hook: search the YAML frontmatter for the command
                            try {
                                const content = await fileService.readFile(entry.fileUri);
                                const commandText = formatHookCommandLabel(entry.command, targetOS);
                                if (commandText) {
                                    selection = findHookCommandInYaml(content.value.toString(), commandText);
                                }
                            }
                            catch {
                                // Ignore errors and just open without selection
                            }
                        }
                        else {
                            // File hook: use JSON-based selection finder
                            const commandFieldName = getEffectiveCommandFieldKey(entry.command, targetOS);
                            if (commandFieldName) {
                                try {
                                    const content = await fileService.readFile(entry.fileUri);
                                    selection = findHookCommandSelection(content.value.toString(), entry.originalHookTypeId, entry.index, commandFieldName);
                                }
                                catch {
                                    // Ignore errors and just open without selection
                                }
                            }
                        }
                        if (options?.openEditor) {
                            await options.openEditor(entry.fileUri, { selection });
                        }
                        else {
                            await editorService.openEditor({
                                resource: entry.fileUri,
                                options: {
                                    selection,
                                    pinned: false
                                }
                            });
                        }
                        return;
                    }
                    // "Add new hook" was selected
                    step = 3 /* Step.SelectFile */;
                    break;
                }
                case 3 /* Step.SelectFile */: {
                    // Step 3: Handle "Add new hook" - show create new file + existing hook files
                    // Get existing hook files (local storage only, not User Data)
                    const hookFiles = await promptsService.listPromptFilesForStorage(PromptsType.hook, PromptsStorage.local, CancellationToken.None);
                    const fileItems = [];
                    // Add "Create new hook config file" option at the top
                    fileItems.push({
                        label: `$(new-file) ${localize(7640, null)}`,
                        isCreateNewFile: true,
                        alwaysShow: true
                    });
                    // Add existing hook files
                    if (hookFiles.length > 0) {
                        fileItems.push({
                            type: 'separator',
                            label: localize(7641, null)
                        });
                        for (const hookFile of hookFiles) {
                            const relativePath = labelService.getUriLabel(hookFile.uri, { relative: true });
                            fileItems.push({
                                label: relativePath,
                                fileUri: hookFile.uri
                            });
                        }
                    }
                    // Auto-execute if no existing hook files
                    if (hookFiles.length === 0) {
                        selectedFile = fileItems[0];
                    }
                    else {
                        picker.items = fileItems;
                        picker.value = '';
                        picker.placeholder = localize(7642, null);
                        picker.title = localize(7643, null);
                        picker.buttons = [backButton];
                        const result = await awaitPick(picker, backButton);
                        if (result === 'back') {
                            step = goBack() ?? 2 /* Step.SelectHook */;
                            break;
                        }
                        if (!result) {
                            return;
                        }
                        selectedFile = result;
                        stepHistory.push(3 /* Step.SelectFile */);
                    }
                    // Handle adding hook to existing file
                    if (selectedFile.fileUri) {
                        await addHookToFile(selectedFile.fileUri, selectedHookType.hookType, fileService, editorService, notificationService, bulkEditService, options?.openEditor);
                        return;
                    }
                    // "Create new hook config file" was selected
                    step = 4 /* Step.SelectFolder */;
                    break;
                }
                case 4 /* Step.SelectFolder */: {
                    // Get source folders for hooks
                    const allFolders = await promptsService.getSourceFolders(PromptsType.hook);
                    const localFolders = allFolders.filter(f => f.storage === PromptsStorage.local);
                    if (localFolders.length === 0) {
                        notificationService.error(localize(7644, null));
                        return;
                    }
                    // Auto-select if only one folder, otherwise show picker
                    selectedFolder = localFolders[0];
                    if (localFolders.length > 1) {
                        const folderItems = localFolders.map(folder => ({
                            label: labelService.getUriLabel(folder.uri, { relative: true }),
                            folder
                        }));
                        picker.items = folderItems;
                        picker.value = '';
                        picker.placeholder = localize(7645, null);
                        picker.title = localize(7646, null);
                        picker.buttons = [backButton];
                        const result = await awaitPick(picker, backButton);
                        if (result === 'back') {
                            step = goBack() ?? 3 /* Step.SelectFile */;
                            break;
                        }
                        if (!result) {
                            return;
                        }
                        selectedFolder = result.folder;
                        stepHistory.push(4 /* Step.SelectFolder */);
                    }
                    step = 5 /* Step.EnterFilename */;
                    break;
                }
                case 5 /* Step.EnterFilename */: {
                    // Hide the picker and show an input box for the filename
                    picker.hide();
                    const fileNameResult = await new Promise(resolve => {
                        let resolved = false;
                        const done = (value) => {
                            if (!resolved) {
                                resolved = true;
                                inputDisposables.dispose();
                                resolve(value);
                            }
                        };
                        const inputDisposables = new DisposableStore();
                        const inputBox = inputDisposables.add(quickInputService.createInputBox());
                        inputBox.prompt = localize(7647, null);
                        inputBox.placeholder = localize(7648, null);
                        inputBox.title = localize(7649, null);
                        inputBox.buttons = [backButton];
                        inputBox.ignoreFocusOut = true;
                        inputDisposables.add(inputBox.onDidAccept(async () => {
                            const value = inputBox.value;
                            if (!value || !value.trim()) {
                                inputBox.validationMessage = localize(7650, null);
                                return;
                            }
                            const name = value.trim();
                            if (/[/\\:*?"<>|]/.test(name)) {
                                inputBox.validationMessage = localize(7651, null);
                                return;
                            }
                            done(name);
                        }));
                        inputDisposables.add(inputBox.onDidChangeValue(() => {
                            inputBox.validationMessage = undefined;
                        }));
                        inputDisposables.add(inputBox.onDidTriggerButton(button => {
                            if (button === backButton) {
                                done('back');
                            }
                        }));
                        inputDisposables.add(inputBox.onDidHide(() => {
                            done(undefined);
                        }));
                        inputBox.show();
                    });
                    if (fileNameResult === 'back') {
                        // Re-show the picker for the previous step
                        picker.show();
                        step = goBack() ?? 4 /* Step.SelectFolder */;
                        break;
                    }
                    if (!fileNameResult) {
                        return;
                    }
                    // Create the hooks folder if it doesn't exist
                    await fileService.createFolder(selectedFolder.uri);
                    // Use user-provided filename with .json extension
                    const hookFileName = fileNameResult.endsWith('.json') ? fileNameResult : `${fileNameResult}.json`;
                    const hookFileUri = URI.joinPath(selectedFolder.uri, hookFileName);
                    // Check if file already exists
                    if (await fileService.exists(hookFileUri)) {
                        // File exists - add hook to it instead of creating new
                        await addHookToFile(hookFileUri, selectedHookType.hookType, fileService, editorService, notificationService, bulkEditService, options?.openEditor);
                        return;
                    }
                    // Detect if new file is a Claude hooks file based on its path
                    const newFileFormat = getHookSourceFormat(hookFileUri);
                    const isClaudeNewFile = newFileFormat === HookSourceFormat.Claude;
                    const isCopilotCliOnly = !isClaudeNewFile
                        && !new Set(Object.values(HOOKS_BY_TARGET[Target.VSCode])).has(selectedHookType.hookType)
                        && new Set(Object.values(HOOKS_BY_TARGET[Target.GitHubCopilot])).has(selectedHookType.hookType);
                    const hookTypeKey = isClaudeNewFile
                        ? (getClaudeHookTypeName(selectedHookType.hookType) ?? selectedHookType.hookType)
                        : isCopilotCliOnly
                            ? (getCopilotCliHookTypeName(selectedHookType.hookType) ?? selectedHookType.hookType)
                            : selectedHookType.hookType;
                    const newFileHookEntry = isCopilotCliOnly
                        ? { type: 'command', [targetOS === 1 /* OperatingSystem.Windows */ ? 'powershell' : 'bash']: '' }
                        : buildNewHookEntry(newFileFormat);
                    const commandFieldKey = isCopilotCliOnly
                        ? (targetOS === 1 /* OperatingSystem.Windows */ ? 'powershell' : 'bash')
                        : 'command';
                    // Create new hook file with the selected hook type
                    const hooksContent = {
                        ...(isCopilotCliOnly ? { version: 1 } : {}),
                        hooks: {
                            [hookTypeKey]: [
                                newFileHookEntry
                            ]
                        }
                    };
                    const jsonContent = JSON.stringify(hooksContent, null, '\t');
                    await fileService.writeFile(hookFileUri, VSBuffer.fromString(jsonContent));
                    options?.onHookFileCreated?.(hookFileUri);
                    // Find the selection for the new hook's command field
                    const selection = findHookCommandSelection(jsonContent, hookTypeKey, 0, commandFieldKey);
                    // Open editor with selection
                    if (options?.openEditor) {
                        await options.openEditor(hookFileUri, { selection });
                    }
                    else {
                        await editorService.openEditor({
                            resource: hookFileUri,
                            options: {
                                selection,
                                pinned: false
                            }
                        });
                    }
                    return;
                }
            }
        }
    }
    finally {
        store.dispose();
    }
}
class ManageHooksAction extends Action2 {
    constructor() {
        super({
            id: CONFIGURE_HOOKS_ACTION_ID,
            title: localize2(7652, "Configure Hooks..."),
            shortTitle: localize2(7653, "Hooks"),
            icon: Codicon.zap,
            f1: true,
            precondition: ChatContextKeys.enabled,
            category: CHAT_CATEGORY,
            menu: {
                id: CHAT_CONFIG_MENU_ID,
                when: ContextKeyExpr.and(ChatContextKeys.enabled, ContextKeyExpr.equals('view', ChatViewId)),
                order: 12,
                group: '1_level'
            }
        });
    }
    async run(accessor) {
        return showConfigureHooksQuickPick(accessor);
    }
}
/**
 * Helper to register the `Manage Hooks` action.
 */
export function registerHookActions() {
    registerAction2(ManageHooksAction);
}
//# sourceMappingURL=hookActions.js.map