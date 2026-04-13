/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { VSBuffer } from '../../../../../base/common/buffer.js';
import { joinPath } from '../../../../../base/common/resources.js';
import { URI } from '../../../../../base/common/uri.js';
import { localize, localize2 } from '../../../../../nls.js';
import { Action2, MenuId, registerAction2 } from '../../../../../platform/actions/common/actions.js';
import { Categories } from '../../../../../platform/action/common/actionCommonCategories.js';
import { ContextKeyExpr } from '../../../../../platform/contextkey/common/contextkey.js';
import { IDialogService, IFileDialogService } from '../../../../../platform/dialogs/common/dialogs.js';
import { IFileService } from '../../../../../platform/files/common/files.js';
import { INotificationService, Severity } from '../../../../../platform/notification/common/notification.js';
import { ITelemetryService } from '../../../../../platform/telemetry/common/telemetry.js';
import { ActiveEditorContext } from '../../../../common/contextkeys.js';
import { IEditorService } from '../../../../services/editor/common/editorService.js';
import { isChatViewTitleActionContext } from '../../common/actions/chatActions.js';
import { ChatContextKeys } from '../../common/actions/chatContextKeys.js';
import { IChatDebugService } from '../../common/chatDebugService.js';
import { ChatViewId, IChatWidgetService } from '../chat.js';
import { CHAT_CATEGORY, CHAT_CONFIG_MENU_ID } from './chatActions.js';
import { ChatDebugEditorInput } from '../chatDebug/chatDebugEditorInput.js';
import { Codicon } from '../../../../../base/common/codicons.js';
/**
 * Registers the Open Agent Debug Logs and Show Agent Debug Logs actions.
 */
export function registerChatOpenAgentDebugPanelAction() {
    registerAction2(class OpenAgentDebugPanelAction extends Action2 {
        constructor() {
            super({
                id: 'workbench.action.chat.openAgentDebugPanel',
                title: localize2(6035, "Open Agent Debug Logs"),
                f1: true,
                category: Categories.Developer,
                precondition: ChatContextKeys.enabled,
            });
        }
        async run(accessor) {
            const editorService = accessor.get(IEditorService);
            const chatDebugService = accessor.get(IChatDebugService);
            // Clear active session so the editor shows the home view
            chatDebugService.activeSessionResource = undefined;
            const options = { pinned: true, viewHint: 'home' };
            await editorService.openEditor(ChatDebugEditorInput.instance, options);
        }
    });
    registerAction2(class OpenAgentDebugPanelForSessionAction extends Action2 {
        constructor() {
            super({
                id: 'workbench.action.chat.openAgentDebugPanelForSession',
                title: localize2(6036, "Show Agent Debug Logs"),
                f1: false,
                category: CHAT_CATEGORY,
                precondition: ChatContextKeys.enabled,
                menu: [{
                        id: CHAT_CONFIG_MENU_ID,
                        when: ContextKeyExpr.and(ChatContextKeys.enabled, ContextKeyExpr.equals('view', ChatViewId)),
                        order: 0,
                        group: '4_logs'
                    }, {
                        id: MenuId.ChatWelcomeContext,
                        group: '2_settings',
                        order: 0,
                        when: ChatContextKeys.inChatEditor.negate()
                    }]
            });
        }
        async run(accessor, context, filter) {
            const editorService = accessor.get(IEditorService);
            const chatWidgetService = accessor.get(IChatWidgetService);
            const chatDebugService = accessor.get(IChatDebugService);
            // Extract session resource from context — may be a URI directly
            // or an IChatViewTitleActionContext from the chat config menu
            let sessionResource;
            if (URI.isUri(context)) {
                sessionResource = context;
            }
            else if (isChatViewTitleActionContext(context)) {
                sessionResource = context.sessionResource;
            }
            // Fall back to the last focused widget
            if (!sessionResource) {
                const widget = chatWidgetService.lastFocusedWidget;
                sessionResource = widget?.viewModel?.sessionResource;
            }
            chatDebugService.activeSessionResource = sessionResource;
            const options = { pinned: true, sessionResource, viewHint: 'logs', filter };
            await editorService.openEditor(ChatDebugEditorInput.instance, options);
        }
    });
    const defaultDebugLogFileName = 'agent-debug-log.json';
    const debugLogFilters = [{ name: localize(6029, null), extensions: ['json'] }];
    registerAction2(class ExportAgentDebugLogAction extends Action2 {
        constructor() {
            super({
                id: 'workbench.action.chat.exportAgentDebugLog',
                title: localize2(6037, "Export Agent Debug Log..."),
                icon: Codicon.desktopDownload,
                f1: true,
                category: Categories.Developer,
                precondition: ChatContextKeys.enabled,
                menu: [{
                        id: MenuId.EditorTitle,
                        group: 'navigation',
                        when: ActiveEditorContext.isEqualTo(ChatDebugEditorInput.ID),
                        order: 10
                    }],
            });
        }
        async run(accessor) {
            const chatDebugService = accessor.get(IChatDebugService);
            const fileDialogService = accessor.get(IFileDialogService);
            const fileService = accessor.get(IFileService);
            const notificationService = accessor.get(INotificationService);
            const telemetryService = accessor.get(ITelemetryService);
            const sessionResource = chatDebugService.activeSessionResource;
            if (!sessionResource) {
                notificationService.notify({ severity: Severity.Info, message: localize(6030, null) });
                return;
            }
            const defaultUri = joinPath(await fileDialogService.defaultFilePath(), defaultDebugLogFileName);
            const outputPath = await fileDialogService.showSaveDialog({ defaultUri, filters: debugLogFilters });
            if (!outputPath) {
                return;
            }
            const data = await chatDebugService.exportLog(sessionResource);
            if (!data) {
                notificationService.notify({ severity: Severity.Warning, message: localize(6031, null) });
                return;
            }
            await fileService.writeFile(outputPath, VSBuffer.wrap(data));
            telemetryService.publicLog2('chatDebugLogExported', {
                fileSizeBytes: data.byteLength,
            });
        }
    });
    registerAction2(class ImportAgentDebugLogAction extends Action2 {
        constructor() {
            super({
                id: 'workbench.action.chat.importAgentDebugLog',
                title: localize2(6038, "Import Agent Debug Log..."),
                icon: Codicon.cloudUpload,
                f1: true,
                category: Categories.Developer,
                precondition: ChatContextKeys.enabled,
                menu: [{
                        id: MenuId.EditorTitle,
                        group: 'navigation',
                        when: ActiveEditorContext.isEqualTo(ChatDebugEditorInput.ID),
                        order: 11
                    }],
            });
        }
        async run(accessor) {
            const chatDebugService = accessor.get(IChatDebugService);
            const dialogService = accessor.get(IDialogService);
            const editorService = accessor.get(IEditorService);
            const fileDialogService = accessor.get(IFileDialogService);
            const fileService = accessor.get(IFileService);
            const notificationService = accessor.get(INotificationService);
            const telemetryService = accessor.get(ITelemetryService);
            const defaultUri = joinPath(await fileDialogService.defaultFilePath(), defaultDebugLogFileName);
            const result = await fileDialogService.showOpenDialog({
                defaultUri,
                canSelectFiles: true,
                filters: debugLogFilters
            });
            if (!result) {
                return;
            }
            const maxImportSize = 50 * 1024 * 1024; // 50 MB
            const stat = await fileService.stat(result[0]);
            if (stat.size !== undefined && stat.size > maxImportSize) {
                telemetryService.publicLog2('chatDebugLogImported', {
                    fileSizeBytes: stat.size,
                    result: 'fileTooLarge',
                });
                await dialogService.warn(localize(6032, null), localize(6033, null, (stat.size / (1024 * 1024)).toFixed(1)));
                return;
            }
            const content = await fileService.readFile(result[0]);
            const sessionUri = await chatDebugService.importLog(content.value.buffer);
            if (!sessionUri) {
                telemetryService.publicLog2('chatDebugLogImported', {
                    fileSizeBytes: content.value.byteLength,
                    result: 'providerFailed',
                });
                notificationService.notify({ severity: Severity.Warning, message: localize(6034, null) });
                return;
            }
            telemetryService.publicLog2('chatDebugLogImported', {
                fileSizeBytes: content.value.byteLength,
                result: 'success',
            });
            const options = { pinned: true, sessionResource: sessionUri, viewHint: 'overview' };
            await editorService.openEditor(ChatDebugEditorInput.instance, options);
        }
    });
}
//# sourceMappingURL=chatOpenAgentDebugPanelAction.js.map