/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { registerWorkbenchContribution2 } from '../../../../workbench/common/contributions.js';
import { WorkspaceFolderManagementContribution } from './workspaceFolderManagement.js';
registerWorkbenchContribution2(WorkspaceFolderManagementContribution.ID, WorkspaceFolderManagementContribution, 3 /* WorkbenchPhase.AfterRestored */);
//# sourceMappingURL=workspace.contribution.js.map