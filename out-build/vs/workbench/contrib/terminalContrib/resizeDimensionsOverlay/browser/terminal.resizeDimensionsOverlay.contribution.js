/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Disposable, MutableDisposable } from '../../../../../base/common/lifecycle.js';
import { registerTerminalContribution } from '../../../terminal/browser/terminalExtensions.js';
import { timeout } from '../../../../../base/common/async.js';
import { TerminalResizeDimensionsOverlay } from './terminalResizeDimensionsOverlay.js';
class TerminalResizeDimensionsOverlayContribution extends Disposable {
    static { this.ID = 'terminal.resizeDimensionsOverlay'; }
    constructor(_ctx) {
        super();
        this._ctx = _ctx;
        this._overlay = this._register(new MutableDisposable());
    }
    xtermOpen(xterm) {
        // Initialize resize dimensions overlay
        this._ctx.processManager.ptyProcessReady.then(() => {
            // Wait a second to avoid resize events during startup like when opening a terminal or
            // when a terminal reconnects. Ideally we'd have an actual event to listen to here.
            timeout(1000).then(() => {
                if (!this._store.isDisposed) {
                    this._overlay.value = new TerminalResizeDimensionsOverlay(this._ctx.instance.domElement, xterm);
                }
            });
        });
    }
}
registerTerminalContribution(TerminalResizeDimensionsOverlayContribution.ID, TerminalResizeDimensionsOverlayContribution);
//# sourceMappingURL=terminal.resizeDimensionsOverlay.contribution.js.map