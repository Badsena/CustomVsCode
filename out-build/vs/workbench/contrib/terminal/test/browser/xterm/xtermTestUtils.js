/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Emitter } from '../../../../../../base/common/event.js';
import { XtermAddonImporter } from '../../../browser/xterm/xtermAddonImporter.js';
export class TestWebglAddon {
    static { this.shouldThrow = false; }
    static { this.isEnabled = false; }
    constructor(preserveDrawingBuffer) {
        this._onChangeTextureAtlas = new Emitter();
        this._onAddTextureAtlasCanvas = new Emitter();
        this._onRemoveTextureAtlasCanvas = new Emitter();
        this._onContextLoss = new Emitter();
        this.onChangeTextureAtlas = this._onChangeTextureAtlas.event;
        this.onAddTextureAtlasCanvas = this._onAddTextureAtlasCanvas.event;
        this.onRemoveTextureAtlasCanvas = this._onRemoveTextureAtlasCanvas.event;
        this.onContextLoss = this._onContextLoss.event;
    }
    activate() {
        TestWebglAddon.isEnabled = !TestWebglAddon.shouldThrow;
        if (TestWebglAddon.shouldThrow) {
            throw new Error('Test webgl set to throw');
        }
    }
    dispose() {
        TestWebglAddon.isEnabled = false;
        this._onChangeTextureAtlas.dispose();
        this._onAddTextureAtlasCanvas.dispose();
        this._onRemoveTextureAtlasCanvas.dispose();
        this._onContextLoss.dispose();
    }
    clearTextureAtlas() { }
}
export class TestXtermAddonImporter extends XtermAddonImporter {
    async importAddon(name) {
        if (name === 'webgl') {
            return TestWebglAddon;
        }
        return super.importAddon(name);
    }
}
//# sourceMappingURL=xtermTestUtils.js.map