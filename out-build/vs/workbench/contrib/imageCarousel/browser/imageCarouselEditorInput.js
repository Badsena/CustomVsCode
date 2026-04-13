/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { EditorInput } from '../../../common/editor/editorInput.js';
import { URI } from '../../../../base/common/uri.js';
import { Schemas } from '../../../../base/common/network.js';
export class ImageCarouselEditorInput extends EditorInput {
    static { this.ID = 'workbench.input.imageCarousel'; }
    get capabilities() {
        return super.capabilities | 8 /* EditorInputCapabilities.Singleton */ | 2048 /* EditorInputCapabilities.RequiresModal */;
    }
    constructor(collection, startIndex = 0) {
        super();
        this.collection = collection;
        this.startIndex = startIndex;
        this._resource = URI.from({
            scheme: Schemas.vscodeImageCarousel,
            path: `/${encodeURIComponent(collection.id)}`,
        });
        this._name = collection.title;
    }
    get typeId() {
        return ImageCarouselEditorInput.ID;
    }
    get resource() {
        return this._resource;
    }
    getName() {
        return this._name;
    }
    setName(name) {
        if (this._name !== name) {
            this._name = name;
            this._onDidChangeLabel.fire();
        }
    }
    matches(other) {
        if (other instanceof ImageCarouselEditorInput) {
            return other.collection.id === this.collection.id;
        }
        return false;
    }
}
//# sourceMappingURL=imageCarouselEditorInput.js.map