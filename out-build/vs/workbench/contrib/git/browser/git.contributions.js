/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { registerSingleton } from '../../../../platform/instantiation/common/extensions.js';
import { IGitService } from '../common/gitService.js';
import { GitService } from './gitService.js';
registerSingleton(IGitService, GitService, 1 /* InstantiationType.Delayed */);
//# sourceMappingURL=git.contributions.js.map