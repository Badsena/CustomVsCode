/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Codicon } from '../../../../../base/common/codicons.js';
import { localize } from '../../../../../nls.js';
import { EditorInput } from '../../../../common/editor/editorInput.js';
import { AI_CUSTOMIZATION_MANAGEMENT_EDITOR_INPUT_ID } from './aiCustomizationManagement.js';
/**
 * Editor input for the AI Customizations Management Editor.
 * This is a singleton-style input with no file resource.
 */
export class AICustomizationManagementEditorInput extends EditorInput {
    static { this.ID = AI_CUSTOMIZATION_MANAGEMENT_EDITOR_INPUT_ID; }
    get capabilities() {
        return super.capabilities | 8 /* EditorInputCapabilities.Singleton */ | 2048 /* EditorInputCapabilities.RequiresModal */;
    }
    /**
     * Gets or creates the singleton instance of this input.
     */
    static getOrCreate() {
        if (!AICustomizationManagementEditorInput._instance || AICustomizationManagementEditorInput._instance.isDisposed()) {
            AICustomizationManagementEditorInput._instance = new AICustomizationManagementEditorInput();
        }
        return AICustomizationManagementEditorInput._instance;
    }
    constructor() {
        super();
        this.resource = undefined;
    }
    matches(otherInput) {
        return super.matches(otherInput) || otherInput instanceof AICustomizationManagementEditorInput;
    }
    get typeId() {
        return AICustomizationManagementEditorInput.ID;
    }
    getName() {
        return localize(6484, null);
    }
    getIcon() {
        return Codicon.settingsGear;
    }
    async resolve() {
        return null;
    }
}
//# sourceMappingURL=aiCustomizationManagementEditorInput.js.map