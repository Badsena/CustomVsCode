/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { DeferredPromise } from '../../../../../../base/common/async.js';
import { MutableDisposable, toDisposable } from '../../../../../../base/common/lifecycle.js';
/**
 * Sets up a recreating start marker which is resilient to prompts that clear/re-render (eg. transient
 * or powerlevel10k style prompts). The marker is recreated at the cursor position whenever the
 * existing marker is disposed. The caller is responsible for adding the startMarker to the store.
 */
export function setupRecreatingStartMarker(xterm, startMarker, fire, store, log) {
    const markerListener = new MutableDisposable();
    const recreateStartMarker = () => {
        if (store.isDisposed) {
            return;
        }
        const marker = xterm.raw.registerMarker();
        startMarker.value = marker ?? undefined;
        fire(marker);
        if (!marker) {
            markerListener.clear();
            return;
        }
        markerListener.value = marker.onDispose(() => {
            log?.('Start marker was disposed, recreating');
            recreateStartMarker();
        });
    };
    recreateStartMarker();
    store.add(toDisposable(() => {
        markerListener.dispose();
        startMarker.clear();
        fire(undefined);
    }));
    store.add(startMarker);
}
export function createAltBufferPromise(xterm, store, log) {
    const deferred = new DeferredPromise();
    const complete = () => {
        if (!deferred.isSettled) {
            log?.('Detected alternate buffer entry');
            deferred.complete();
        }
    };
    if (xterm.raw.buffer.active === xterm.raw.buffer.alternate) {
        complete();
    }
    else {
        store.add(xterm.raw.buffer.onBufferChange(() => {
            if (xterm.raw.buffer.active === xterm.raw.buffer.alternate) {
                complete();
            }
        }));
    }
    return deferred.p;
}
//# sourceMappingURL=strategyHelpers.js.map