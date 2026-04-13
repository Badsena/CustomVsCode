/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Codicon } from '../../../../../base/common/codicons.js';
import { URI } from '../../../../../base/common/uri.js';
import { localize } from '../../../../../nls.js';
import { registerIcon } from '../../../../../platform/theme/common/iconRegistry.js';
import { EditorInput } from '../../../../common/editor/editorInput.js';
const chatDebugEditorIcon = registerIcon('chat-debug-editor-label-icon', Codicon.bug, localize(6872, null));
export class ChatDebugEditorInput extends EditorInput {
    constructor() {
        super(...arguments);
        this.resource = ChatDebugEditorInput.RESOURCE;
    }
    static { this.ID = 'workbench.editor.chatDebug'; }
    static { this.RESOURCE = URI.from({
        scheme: 'chat-debug',
        path: 'default'
    }); }
    static get instance() {
        if (!ChatDebugEditorInput._instance || ChatDebugEditorInput._instance.isDisposed()) {
            ChatDebugEditorInput._instance = new ChatDebugEditorInput();
        }
        return ChatDebugEditorInput._instance;
    }
    get typeId() { return ChatDebugEditorInput.ID; }
    get editorId() { return ChatDebugEditorInput.ID; }
    get capabilities() { return 2 /* EditorInputCapabilities.Readonly */ | 8 /* EditorInputCapabilities.Singleton */; }
    getName() {
        return localize(6873, null);
    }
    getIcon() {
        return chatDebugEditorIcon;
    }
    matches(other) {
        if (super.matches(other)) {
            return true;
        }
        return other instanceof ChatDebugEditorInput;
    }
}
export class ChatDebugEditorInputSerializer {
    canSerialize(editorInput) {
        return true;
    }
    serialize(editorInput) {
        return '';
    }
    deserialize(instantiationService) {
        return ChatDebugEditorInput.instance;
    }
}
//# sourceMappingURL=chatDebugEditorInput.js.map