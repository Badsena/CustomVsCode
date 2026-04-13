/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { SessionsBrowserMain } from './web.main.js';
import { toDisposable } from '../../base/common/lifecycle.js';
import { mark } from '../../base/common/performance.js';
import { DeferredPromise } from '../../base/common/async.js';
const workbenchPromise = new DeferredPromise();
/**
 * Creates the Sessions workbench with the provided options in the provided container.
 */
export function create(domElement, options) {
    mark('code/didLoadWorkbenchMain');
    let instantiatedWorkbench = undefined;
    new SessionsBrowserMain(domElement, options).open().then(workbench => {
        instantiatedWorkbench = workbench;
        workbenchPromise.complete(workbench);
    });
    return toDisposable(() => {
        if (instantiatedWorkbench) {
            instantiatedWorkbench.shutdown();
        }
        else {
            workbenchPromise.p.then(w => w.shutdown());
        }
    });
}
//# sourceMappingURL=web.factory.js.map