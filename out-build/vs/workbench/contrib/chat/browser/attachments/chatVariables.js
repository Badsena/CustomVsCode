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
import { IChatWidgetService } from '../chat.js';
import { ChatDynamicVariableModel } from './chatDynamicVariables.js';
import { Range } from '../../../../../editor/common/core/range.js';
export function getDynamicVariablesForWidget(widget) {
    if (!widget.viewModel || !widget.supportsFileReferences) {
        return [];
    }
    const model = widget.getContrib(ChatDynamicVariableModel.ID);
    if (!model) {
        return [];
    }
    // track for editing state
    if (widget.viewModel.editing && model.variables.length > 0) {
        return model.variables;
    }
    if (widget.input.attachmentModel.attachments.length > 0 && widget.viewModel.editing) {
        const references = [];
        const editorModel = widget.inputEditor.getModel();
        const modelTextLength = editorModel?.getValueLength() ?? 0;
        for (const attachment of widget.input.attachmentModel.attachments) {
            // If the attachment has a range, it is a dynamic variable
            if (attachment.range) {
                if (attachment.range.start >= attachment.range.endExclusive) {
                    continue;
                }
                if (attachment.range.start < 0 || attachment.range.endExclusive > modelTextLength) {
                    continue;
                }
                if (!editorModel) {
                    continue;
                }
                const startPos = editorModel.getPositionAt(attachment.range.start);
                const endPos = editorModel.getPositionAt(attachment.range.endExclusive);
                const referenceObj = {
                    id: attachment.id,
                    fullName: attachment.name,
                    modelDescription: attachment.modelDescription,
                    range: new Range(startPos.lineNumber, startPos.column, endPos.lineNumber, endPos.column),
                    icon: attachment.icon,
                    isFile: attachment.kind === 'file',
                    isDirectory: attachment.kind === 'directory',
                    data: attachment.value
                };
                references.push(referenceObj);
            }
        }
        return references.length > 0 ? references : model.variables;
    }
    return model.variables;
}
export function getSelectedToolAndToolSetsForWidget(widget) {
    return widget.input.selectedToolsModel.entriesMap.get();
}
let ChatVariablesService = class ChatVariablesService {
    constructor(chatWidgetService) {
        this.chatWidgetService = chatWidgetService;
    }
    getDynamicVariables(sessionResource) {
        const widget = this.chatWidgetService.getWidgetBySessionResource(sessionResource);
        if (!widget) {
            return [];
        }
        return getDynamicVariablesForWidget(widget);
    }
    getSelectedToolAndToolSets(sessionResource) {
        const widget = this.chatWidgetService.getWidgetBySessionResource(sessionResource);
        if (!widget) {
            return new Map();
        }
        return getSelectedToolAndToolSetsForWidget(widget);
    }
};
ChatVariablesService = __decorate([
    __param(0, IChatWidgetService)
], ChatVariablesService);
export { ChatVariablesService };
//# sourceMappingURL=chatVariables.js.map