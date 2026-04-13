/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as nls from '../../../../nls.js';
import { createDecorator } from '../../../../platform/instantiation/common/instantiation.js';
import { RawContextKey, ContextKeyExpr } from '../../../../platform/contextkey/common/contextkey.js';
export const CustomExecutionSupportedContext = new RawContextKey('customExecutionSupported', false, nls.localize(15308, null));
export const ShellExecutionSupportedContext = new RawContextKey('shellExecutionSupported', false, nls.localize(15309, null));
export const TaskCommandsRegistered = new RawContextKey('taskCommandsRegistered', false, nls.localize(15310, null));
export const ProcessExecutionSupportedContext = new RawContextKey('processExecutionSupported', false, nls.localize(15311, null));
export const ServerlessWebContext = new RawContextKey('serverlessWebContext', false, nls.localize(15312, null));
export const TasksAvailableContext = new RawContextKey('tasksAvailable', false, nls.localize(15313, null));
export const TaskExecutionSupportedContext = ContextKeyExpr.or(ContextKeyExpr.and(ShellExecutionSupportedContext, ProcessExecutionSupportedContext), CustomExecutionSupportedContext);
export const ITaskService = createDecorator('taskService');
//# sourceMappingURL=taskService.js.map