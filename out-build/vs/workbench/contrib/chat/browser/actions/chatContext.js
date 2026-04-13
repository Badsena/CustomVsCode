var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Codicon } from '../../../../../base/common/codicons.js';
import { Disposable, DisposableStore } from '../../../../../base/common/lifecycle.js';
import { isElectron } from '../../../../../base/common/platform.js';
import { localize } from '../../../../../nls.js';
import { IClipboardService } from '../../../../../platform/clipboard/common/clipboardService.js';
import { IInstantiationService } from '../../../../../platform/instantiation/common/instantiation.js';
import { ILabelService } from '../../../../../platform/label/common/label.js';
import { EditorResourceAccessor, SideBySideEditor } from '../../../../common/editor.js';
import { DiffEditorInput } from '../../../../common/editor/diffEditorInput.js';
import { IEditorService } from '../../../../services/editor/common/editorService.js';
import { IHostService } from '../../../../services/host/browser/host.js';
import { UntitledTextEditorInput } from '../../../../services/untitled/common/untitledTextEditorInput.js';
import { FileEditorInput } from '../../../files/browser/editors/fileEditorInput.js';
import { NotebookEditorInput } from '../../../notebook/common/notebookEditorInput.js';
import { IChatContextPickService } from '../attachments/chatContextPickService.js';
import { toToolSetVariableEntry, toToolVariableEntry } from '../../common/attachments/chatVariableEntries.js';
import { isToolSet, ToolDataSource } from '../../common/tools/languageModelToolsService.js';
import { imageToHash, isImage } from '../widget/input/editor/chatPasteProviders.js';
import { convertBufferToScreenshotVariable } from '../attachments/chatScreenshotContext.js';
import { ChatInstructionsPickerPick } from '../promptSyntax/attachInstructionsAction.js';
import { createDebugEventsAttachment } from '../chatDebug/chatDebugAttachment.js';
import { IChatDebugService } from '../../common/chatDebugService.js';
import { ITerminalService } from '../../../terminal/browser/terminal.js';
/**
 * Command ID that extensions can call to enable debug tools for the current
 * chat session. Sets the context key and immediately flushes tool updates so
 * that newly-enabled tools are visible on the next `vscode.lm.tools` read.
 */
export const EnableChatDebugToolsCommandId = 'chat.enableDebugTools';
let ChatContextContributions = class ChatContextContributions extends Disposable {
    static { this.ID = 'chat.contextContributions'; }
    constructor(instantiationService, contextPickService) {
        super();
        // ###############################################################################################
        //
        // Default context picks/values which are "native" to chat. This is NOT the complete list
        // and feature area specific context, like for notebooks, problems, etc, should be contributed
        // by the feature area.
        //
        // ###############################################################################################
        this._store.add(contextPickService.registerChatContextItem(instantiationService.createInstance(ToolsContextPickerPick)));
        this._store.add(contextPickService.registerChatContextItem(instantiationService.createInstance(ChatInstructionsPickerPick)));
        this._store.add(contextPickService.registerChatContextItem(instantiationService.createInstance(OpenEditorContextValuePick)));
        this._store.add(contextPickService.registerChatContextItem(instantiationService.createInstance(ClipboardImageContextValuePick)));
        this._store.add(contextPickService.registerChatContextItem(instantiationService.createInstance(ScreenshotContextValuePick)));
        this._store.add(contextPickService.registerChatContextItem(instantiationService.createInstance(DebugEventsSnapshotContextValuePick)));
    }
};
ChatContextContributions = __decorate([
    __param(0, IInstantiationService),
    __param(1, IChatContextPickService)
], ChatContextContributions);
export { ChatContextContributions };
class ToolsContextPickerPick {
    constructor() {
        this.type = 'pickerPick';
        this.label = localize(5918, null);
        this.icon = Codicon.tools;
        this.ordinal = -500;
    }
    isEnabled(widget) {
        return !!widget.attachmentCapabilities.supportsToolAttachments;
    }
    asPicker(widget) {
        const items = [];
        for (const [entry, enabled] of widget.input.selectedToolsModel.entriesMap.get()) {
            if (enabled) {
                if (isToolSet(entry)) {
                    items.push({
                        toolInfo: ToolDataSource.classify(entry.source),
                        label: entry.referenceName,
                        description: entry.description,
                        asAttachment: () => toToolSetVariableEntry(entry)
                    });
                }
                else {
                    items.push({
                        toolInfo: ToolDataSource.classify(entry.source),
                        label: entry.toolReferenceName ?? entry.displayName,
                        description: entry.userDescription ?? entry.modelDescription,
                        asAttachment: () => toToolVariableEntry(entry)
                    });
                }
            }
        }
        items.sort((a, b) => {
            let res = a.toolInfo.ordinal - b.toolInfo.ordinal;
            if (res === 0) {
                res = a.toolInfo.label.localeCompare(b.toolInfo.label);
            }
            if (res === 0) {
                res = a.label.localeCompare(b.label);
            }
            return res;
        });
        let lastGroupLabel;
        const picks = [];
        for (const item of items) {
            if (lastGroupLabel !== item.toolInfo.label) {
                picks.push({ type: 'separator', label: item.toolInfo.label });
                lastGroupLabel = item.toolInfo.label;
            }
            picks.push(item);
        }
        return {
            placeholder: localize(5919, null),
            picks: Promise.resolve(picks)
        };
    }
}
let OpenEditorContextValuePick = class OpenEditorContextValuePick {
    constructor(_editorService, _labelService) {
        this._editorService = _editorService;
        this._labelService = _labelService;
        this.type = 'valuePick';
        this.label = localize(5920, null);
        this.icon = Codicon.file;
        this.ordinal = 800;
    }
    isEnabled() {
        return this._editorService.editors.filter(e => e instanceof FileEditorInput || e instanceof DiffEditorInput || e instanceof UntitledTextEditorInput).length > 0;
    }
    async asAttachment() {
        const result = [];
        for (const editor of this._editorService.editors) {
            if (!(editor instanceof FileEditorInput || editor instanceof DiffEditorInput || editor instanceof UntitledTextEditorInput || editor instanceof NotebookEditorInput)) {
                continue;
            }
            const uri = EditorResourceAccessor.getOriginalUri(editor, { supportSideBySide: SideBySideEditor.PRIMARY });
            if (!uri) {
                continue;
            }
            result.push({
                kind: 'file',
                id: uri.toString(),
                value: uri,
                name: this._labelService.getUriBasenameLabel(uri),
            });
        }
        return result;
    }
};
OpenEditorContextValuePick = __decorate([
    __param(0, IEditorService),
    __param(1, ILabelService)
], OpenEditorContextValuePick);
let ClipboardImageContextValuePick = class ClipboardImageContextValuePick {
    constructor(_clipboardService) {
        this._clipboardService = _clipboardService;
        this.type = 'valuePick';
        this.label = localize(5921, null);
        this.icon = Codicon.fileMedia;
    }
    async isEnabled(widget) {
        if (!widget.attachmentCapabilities.supportsImageAttachments) {
            return false;
        }
        if (!widget.input.selectedLanguageModel.get()?.metadata.capabilities?.vision) {
            return false;
        }
        const imageData = await this._clipboardService.readImage();
        return isImage(imageData);
    }
    async asAttachment() {
        const fileBuffer = await this._clipboardService.readImage();
        return {
            id: await imageToHash(fileBuffer),
            name: localize(5922, null),
            fullName: localize(5923, null),
            value: fileBuffer,
            kind: 'image',
        };
    }
};
ClipboardImageContextValuePick = __decorate([
    __param(0, IClipboardService)
], ClipboardImageContextValuePick);
let TerminalContext = class TerminalContext {
    constructor(_resource, _terminalService) {
        this._resource = _resource;
        this._terminalService = _terminalService;
        this.type = 'valuePick';
        this.icon = Codicon.terminal;
        this.label = localize(5924, null);
    }
    isEnabled(widget) {
        const terminal = this._terminalService.getInstanceFromResource(this._resource);
        return !!widget.attachmentCapabilities.supportsTerminalAttachments && terminal?.isDisposed === false;
    }
    async asAttachment(widget) {
        const terminal = this._terminalService.getInstanceFromResource(this._resource);
        if (!terminal) {
            return;
        }
        const params = new URLSearchParams(this._resource.query);
        const command = terminal.capabilities.get(2 /* TerminalCapability.CommandDetection */)?.commands.find(cmd => cmd.id === params.get('command'));
        if (!command) {
            return;
        }
        const attachment = {
            kind: 'terminalCommand',
            id: `terminalCommand:${Date.now()}}`,
            value: this.asValue(command),
            name: command.command,
            command: command.command,
            output: command.getOutput(),
            exitCode: command.exitCode,
            resource: this._resource
        };
        const cleanup = new DisposableStore();
        let disposed = false;
        const disposeCleanup = () => {
            if (disposed) {
                return;
            }
            disposed = true;
            cleanup.dispose();
        };
        cleanup.add(widget.attachmentModel.onDidChange(e => {
            if (e.deleted.includes(attachment.id)) {
                disposeCleanup();
            }
        }));
        cleanup.add(terminal.onDisposed(() => {
            widget.attachmentModel.delete(attachment.id);
            widget.refreshParsedInput();
            disposeCleanup();
        }));
        return attachment;
    }
    asValue(command) {
        let value = `Command: ${command.command}`;
        const output = command.getOutput();
        if (output) {
            value += `\nOutput:\n${output}`;
        }
        if (typeof command.exitCode === 'number') {
            value += `\nExit Code: ${command.exitCode}`;
        }
        return value;
    }
};
TerminalContext = __decorate([
    __param(1, ITerminalService)
], TerminalContext);
export { TerminalContext };
let ScreenshotContextValuePick = class ScreenshotContextValuePick {
    constructor(_hostService) {
        this._hostService = _hostService;
        this.type = 'valuePick';
        this.icon = Codicon.deviceCamera;
        this.label = (isElectron
            ? localize(5925, null)
            : localize(5926, null));
    }
    async isEnabled(widget) {
        return !!widget.attachmentCapabilities.supportsImageAttachments && !!widget.input.selectedLanguageModel.get()?.metadata.capabilities?.vision;
    }
    async asAttachment() {
        const blob = await this._hostService.getScreenshot();
        return blob && convertBufferToScreenshotVariable(blob);
    }
};
ScreenshotContextValuePick = __decorate([
    __param(0, IHostService)
], ScreenshotContextValuePick);
let DebugEventsSnapshotContextValuePick = class DebugEventsSnapshotContextValuePick {
    constructor(_chatDebugService) {
        this._chatDebugService = _chatDebugService;
        this.type = 'valuePick';
        this.icon = Codicon.output;
        this.label = localize(5927, null);
        this.ordinal = -600;
    }
    isEnabled(widget) {
        const sessionResource = widget.viewModel?.sessionResource;
        return !!sessionResource && this._chatDebugService.getEvents(sessionResource).length > 0;
    }
    async asAttachment(widget) {
        const sessionResource = widget.viewModel?.sessionResource;
        if (!sessionResource) {
            return undefined;
        }
        return createDebugEventsAttachment(sessionResource, this._chatDebugService);
    }
};
DebugEventsSnapshotContextValuePick = __decorate([
    __param(0, IChatDebugService)
], DebugEventsSnapshotContextValuePick);
//# sourceMappingURL=chatContext.js.map