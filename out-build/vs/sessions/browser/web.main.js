/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { BrowserMain } from '../../workbench/browser/web.main.js';
import { Workbench as SessionsWorkbench } from './workbench.js';
export class SessionsBrowserMain extends BrowserMain {
    createWorkbench(domElement, serviceCollection, logService) {
        console.log('[Sessions Web] Creating Sessions workbench (not standard workbench)');
        return new SessionsWorkbench(domElement, undefined, serviceCollection, logService);
    }
}
//# sourceMappingURL=web.main.js.map