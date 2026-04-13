/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Codicon } from '../../../../../base/common/codicons.js';
import { Schemas } from '../../../../../base/common/network.js';
import { URI } from '../../../../../base/common/uri.js';
import { localize } from '../../../../../nls.js';
import { registerIcon } from '../../../../../platform/theme/common/iconRegistry.js';
import { EditorInput } from '../../../../common/editor/editorInput.js';
const AgentPluginEditorIcon = registerIcon('agent-plugin-editor-icon', Codicon.extensions, localize(6134, null));
function getPluginId(item) {
    if (item.kind === "installed" /* AgentPluginItemKind.Installed */) {
        return item.plugin.uri.toString();
    }
    return `${item.marketplaceReference.canonicalId}/${item.source}`;
}
export class AgentPluginEditorInput extends EditorInput {
    static { this.ID = 'workbench.agentPlugin.input'; }
    get typeId() {
        return AgentPluginEditorInput.ID;
    }
    get capabilities() {
        return super.capabilities | 8 /* EditorInputCapabilities.Singleton */ | 2048 /* EditorInputCapabilities.RequiresModal */;
    }
    get resource() {
        return URI.from({
            scheme: Schemas.extension,
            path: `/agentPlugin/${encodeURIComponent(getPluginId(this._item))}`
        });
    }
    constructor(_item) {
        super();
        this._item = _item;
    }
    get item() { return this._item; }
    getName() {
        return localize(6135, null, this._item.name);
    }
    getIcon() {
        return AgentPluginEditorIcon;
    }
    matches(other) {
        if (super.matches(other)) {
            return true;
        }
        return other instanceof AgentPluginEditorInput && getPluginId(this._item) === getPluginId(other._item);
    }
}
//# sourceMappingURL=agentPluginEditorInput.js.map