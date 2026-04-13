/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import './media/terminalResizeDimensionsOverlay.css';
import { $ } from '../../../../../base/browser/dom.js';
import { disposableTimeout } from '../../../../../base/common/async.js';
import { Disposable, MutableDisposable, toDisposable } from '../../../../../base/common/lifecycle.js';
var Constants;
(function (Constants) {
    Constants[Constants["ResizeOverlayHideDelay"] = 500] = "ResizeOverlayHideDelay";
    Constants["VisibleClass"] = "visible";
})(Constants || (Constants = {}));
export class TerminalResizeDimensionsOverlay extends Disposable {
    constructor(_container, xterm) {
        super();
        this._container = _container;
        this._resizeOverlayHideTimeout = this._register(new MutableDisposable());
        this._register(xterm.raw.onResize(dims => this._handleDimensionsChanged(dims)));
        this._register(toDisposable(() => {
            this._resizeOverlay?.remove();
            this._resizeOverlay = undefined;
        }));
    }
    _handleDimensionsChanged(dims) {
        const container = this._container;
        if (!container || !container.isConnected) {
            return;
        }
        const overlay = this._ensureResizeOverlay(container);
        overlay.textContent = `${dims.cols} x ${dims.rows}`;
        overlay.classList.add("visible" /* Constants.VisibleClass */);
        this._resizeOverlayHideTimeout.value = disposableTimeout(() => {
            this._resizeOverlay?.classList.remove("visible" /* Constants.VisibleClass */);
        }, 500 /* Constants.ResizeOverlayHideDelay */);
    }
    _ensureResizeOverlay(container) {
        if (!this._resizeOverlay) {
            this._resizeOverlay = $('.terminal-resize-overlay');
            this._resizeOverlay.setAttribute('role', 'status');
            this._resizeOverlay.setAttribute('aria-live', 'polite');
            container.appendChild(this._resizeOverlay);
        }
        else if (!container.contains(this._resizeOverlay)) {
            container.appendChild(this._resizeOverlay);
        }
        return this._resizeOverlay;
    }
}
//# sourceMappingURL=terminalResizeDimensionsOverlay.js.map