/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Codicon } from '../../../../../base/common/codicons.js';
import * as nls from '../../../../../nls.js';
import { registerIcon } from '../../../../../platform/theme/common/iconRegistry.js';
import { EditorInput } from '../../../../common/editor/editorInput.js';
const ChatManagementEditorIcon = registerIcon('ai-management-editor-label-icon', Codicon.copilot, nls.localize(7191, null));
const ModelsManagementEditorIcon = registerIcon('models-management-editor-label-icon', Codicon.settings, nls.localize(7192, null));
export const CHAT_MANAGEMENT_SECTION_USAGE = 'usage';
export const CHAT_MANAGEMENT_SECTION_MODELS = 'models';
export class ChatManagementEditorInput extends EditorInput {
    static { this.ID = 'workbench.input.chatManagement'; }
    constructor() {
        super();
        this.resource = undefined;
    }
    matches(otherInput) {
        return super.matches(otherInput) || otherInput instanceof ChatManagementEditorInput;
    }
    get typeId() {
        return ChatManagementEditorInput.ID;
    }
    getName() {
        return nls.localize(7193, null);
    }
    getIcon() {
        return ChatManagementEditorIcon;
    }
    async resolve() {
        return null;
    }
}
export class ModelsManagementEditorInput extends EditorInput {
    static { this.ID = 'workbench.input.modelsManagement'; }
    get capabilities() {
        return super.capabilities | 8 /* EditorInputCapabilities.Singleton */ | 2048 /* EditorInputCapabilities.RequiresModal */;
    }
    constructor() {
        super();
        this.resource = undefined;
    }
    matches(otherInput) {
        return super.matches(otherInput) || otherInput instanceof ModelsManagementEditorInput;
    }
    get typeId() {
        return ModelsManagementEditorInput.ID;
    }
    getName() {
        return nls.localize(7194, null);
    }
    getIcon() {
        return ModelsManagementEditorIcon;
    }
    async resolve() {
        return null;
    }
}
//# sourceMappingURL=chatManagementEditorInput.js.map