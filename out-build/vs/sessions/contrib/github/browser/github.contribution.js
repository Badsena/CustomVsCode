/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { registerSingleton } from '../../../../platform/instantiation/common/extensions.js';
import { GitHubService, IGitHubService } from './githubService.js';
registerSingleton(IGitHubService, GitHubService, 1 /* InstantiationType.Delayed */);
//# sourceMappingURL=github.contribution.js.map