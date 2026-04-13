/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Action, Separator, SubmenuAction } from '../../../../base/common/actions.js';
import { Codicon } from '../../../../base/common/codicons.js';
import { Schemas } from '../../../../base/common/network.js';
import { localize, localize2 } from '../../../../nls.js';
import { MenuId, MenuRegistry } from '../../../../platform/actions/common/actions.js';
import { ContextKeyExpr } from '../../../../platform/contextkey/common/contextkey.js';
import { TerminalLocation } from '../../../../platform/terminal/common/terminal.js';
import { ResourceContextKey } from '../../../common/contextkeys.js';
import { TaskExecutionSupportedContext } from '../../tasks/common/taskService.js';
import { TERMINAL_VIEW_ID } from '../common/terminal.js';
import { TerminalContextKeys } from '../common/terminalContextKey.js';
import { terminalStrings } from '../common/terminalStrings.js';
import { ACTIVE_GROUP, AUX_WINDOW_GROUP, SIDE_GROUP } from '../../../services/editor/common/editorService.js';
import { HasSpeechProvider } from '../../speech/common/speechService.js';
import { hasKey } from '../../../../base/common/types.js';
export var TerminalContextMenuGroup;
(function (TerminalContextMenuGroup) {
    TerminalContextMenuGroup["Chat"] = "0_chat";
    TerminalContextMenuGroup["Create"] = "1_create";
    TerminalContextMenuGroup["Edit"] = "3_edit";
    TerminalContextMenuGroup["Clear"] = "5_clear";
    TerminalContextMenuGroup["Kill"] = "7_kill";
    TerminalContextMenuGroup["Config"] = "9_config";
})(TerminalContextMenuGroup || (TerminalContextMenuGroup = {}));
export var TerminalMenuBarGroup;
(function (TerminalMenuBarGroup) {
    TerminalMenuBarGroup["Create"] = "1_create";
    TerminalMenuBarGroup["Run"] = "3_run";
    TerminalMenuBarGroup["Manage"] = "5_manage";
    TerminalMenuBarGroup["Configure"] = "7_configure";
})(TerminalMenuBarGroup || (TerminalMenuBarGroup = {}));
export function setupTerminalMenus() {
    MenuRegistry.appendMenuItems([
        {
            id: MenuId.MenubarTerminalMenu,
            item: {
                group: "1_create" /* TerminalMenuBarGroup.Create */,
                command: {
                    id: "workbench.action.terminal.new" /* TerminalCommandId.New */,
                    title: localize(15444, null)
                },
                order: 1
            }
        },
        {
            id: MenuId.MenubarTerminalMenu,
            item: {
                group: "1_create" /* TerminalMenuBarGroup.Create */,
                command: {
                    id: "workbench.action.terminal.newInNewWindow" /* TerminalCommandId.NewInNewWindow */,
                    title: localize(15445, null),
                    precondition: ContextKeyExpr.has("terminalIsOpen" /* TerminalContextKeyStrings.IsOpen */)
                },
                order: 2,
                when: TerminalContextKeys.processSupported
            }
        },
        {
            id: MenuId.MenubarTerminalMenu,
            item: {
                group: "1_create" /* TerminalMenuBarGroup.Create */,
                command: {
                    id: "workbench.action.terminal.split" /* TerminalCommandId.Split */,
                    title: localize(15446, null),
                    precondition: ContextKeyExpr.has("terminalIsOpen" /* TerminalContextKeyStrings.IsOpen */)
                },
                order: 2,
                when: TerminalContextKeys.processSupported
            }
        },
        {
            id: MenuId.MenubarTerminalMenu,
            item: {
                group: "3_run" /* TerminalMenuBarGroup.Run */,
                command: {
                    id: "workbench.action.terminal.runActiveFile" /* TerminalCommandId.RunActiveFile */,
                    title: localize(15447, null)
                },
                order: 3,
                when: TerminalContextKeys.processSupported
            }
        },
        {
            id: MenuId.MenubarTerminalMenu,
            item: {
                group: "3_run" /* TerminalMenuBarGroup.Run */,
                command: {
                    id: "workbench.action.terminal.runSelectedText" /* TerminalCommandId.RunSelectedText */,
                    title: localize(15448, null)
                },
                order: 4,
                when: TerminalContextKeys.processSupported
            }
        },
    ]);
    MenuRegistry.appendMenuItems([
        {
            id: MenuId.TerminalInstanceContext,
            item: {
                command: {
                    id: "workbench.action.terminal.killViewOrEditor" /* TerminalCommandId.KillViewOrEditor */,
                    title: terminalStrings.kill.value,
                },
                group: "7_kill" /* TerminalContextMenuGroup.Kill */
            }
        },
        {
            id: MenuId.TerminalInstanceContext,
            item: {
                command: {
                    id: "workbench.action.terminal.copySelection" /* TerminalCommandId.CopySelection */,
                    title: localize(15449, null)
                },
                group: "3_edit" /* TerminalContextMenuGroup.Edit */,
                order: 1
            }
        },
        {
            id: MenuId.TerminalInstanceContext,
            item: {
                command: {
                    id: "workbench.action.terminal.copySelectionAsHtml" /* TerminalCommandId.CopySelectionAsHtml */,
                    title: localize(15450, null)
                },
                group: "3_edit" /* TerminalContextMenuGroup.Edit */,
                order: 2
            }
        },
        {
            id: MenuId.TerminalInstanceContext,
            item: {
                command: {
                    id: "workbench.action.terminal.paste" /* TerminalCommandId.Paste */,
                    title: localize(15451, null)
                },
                group: "3_edit" /* TerminalContextMenuGroup.Edit */,
                order: 3
            }
        },
        {
            id: MenuId.TerminalInstanceContext,
            item: {
                command: {
                    id: "workbench.action.terminal.clear" /* TerminalCommandId.Clear */,
                    title: localize(15452, null)
                },
                group: "5_clear" /* TerminalContextMenuGroup.Clear */,
            }
        },
        {
            id: MenuId.TerminalInstanceContext,
            item: {
                command: {
                    id: "workbench.action.terminal.sizeToContentWidth" /* TerminalCommandId.SizeToContentWidth */,
                    title: terminalStrings.toggleSizeToContentWidth
                },
                group: "9_config" /* TerminalContextMenuGroup.Config */
            }
        },
        {
            id: MenuId.TerminalInstanceContext,
            item: {
                command: {
                    id: "workbench.action.terminal.selectAll" /* TerminalCommandId.SelectAll */,
                    title: localize(15453, null),
                },
                group: "3_edit" /* TerminalContextMenuGroup.Edit */,
                order: 3
            }
        },
    ]);
    MenuRegistry.appendMenuItem(MenuId.EditorTabsBarContext, {
        command: {
            id: "workbench.action.createTerminalEditorSameGroup" /* TerminalCommandId.CreateTerminalEditorSameGroup */,
            title: terminalStrings.new
        },
        group: '1_zzz_file',
        order: 30,
        when: TerminalContextKeys.processSupported
    });
    MenuRegistry.appendMenuItem(MenuId.EmptyEditorGroupContext, {
        command: {
            id: "workbench.action.createTerminalEditorSameGroup" /* TerminalCommandId.CreateTerminalEditorSameGroup */,
            title: terminalStrings.new
        },
        group: '1_zzz_file',
        order: 30,
        when: TerminalContextKeys.processSupported
    });
    MenuRegistry.appendMenuItems([
        {
            id: MenuId.TerminalEditorInstanceContext,
            item: {
                group: "1_create" /* TerminalContextMenuGroup.Create */,
                command: {
                    id: "workbench.action.terminal.split" /* TerminalCommandId.Split */,
                    title: terminalStrings.split.value
                }
            }
        },
        {
            id: MenuId.TerminalEditorInstanceContext,
            item: {
                command: {
                    id: "workbench.action.terminal.new" /* TerminalCommandId.New */,
                    title: terminalStrings.new
                },
                group: "1_create" /* TerminalContextMenuGroup.Create */
            }
        },
        {
            id: MenuId.TerminalEditorInstanceContext,
            item: {
                command: {
                    id: "workbench.action.terminal.killEditor" /* TerminalCommandId.KillEditor */,
                    title: terminalStrings.kill.value
                },
                group: "7_kill" /* TerminalContextMenuGroup.Kill */
            }
        },
        {
            id: MenuId.TerminalEditorInstanceContext,
            item: {
                command: {
                    id: "workbench.action.terminal.copySelection" /* TerminalCommandId.CopySelection */,
                    title: localize(15454, null)
                },
                group: "3_edit" /* TerminalContextMenuGroup.Edit */,
                order: 1
            }
        },
        {
            id: MenuId.TerminalEditorInstanceContext,
            item: {
                command: {
                    id: "workbench.action.terminal.copySelectionAsHtml" /* TerminalCommandId.CopySelectionAsHtml */,
                    title: localize(15455, null)
                },
                group: "3_edit" /* TerminalContextMenuGroup.Edit */,
                order: 2
            }
        },
        {
            id: MenuId.TerminalEditorInstanceContext,
            item: {
                command: {
                    id: "workbench.action.terminal.paste" /* TerminalCommandId.Paste */,
                    title: localize(15456, null)
                },
                group: "3_edit" /* TerminalContextMenuGroup.Edit */,
                order: 3
            }
        },
        {
            id: MenuId.TerminalEditorInstanceContext,
            item: {
                command: {
                    id: "workbench.action.terminal.clear" /* TerminalCommandId.Clear */,
                    title: localize(15457, null)
                },
                group: "5_clear" /* TerminalContextMenuGroup.Clear */,
            }
        },
        {
            id: MenuId.TerminalEditorInstanceContext,
            item: {
                command: {
                    id: "workbench.action.terminal.selectAll" /* TerminalCommandId.SelectAll */,
                    title: localize(15458, null),
                },
                group: "3_edit" /* TerminalContextMenuGroup.Edit */,
                order: 3
            }
        },
        {
            id: MenuId.TerminalEditorInstanceContext,
            item: {
                command: {
                    id: "workbench.action.terminal.sizeToContentWidth" /* TerminalCommandId.SizeToContentWidth */,
                    title: terminalStrings.toggleSizeToContentWidth
                },
                group: "9_config" /* TerminalContextMenuGroup.Config */
            }
        }
    ]);
    MenuRegistry.appendMenuItems([
        {
            id: MenuId.TerminalTabEmptyAreaContext,
            item: {
                command: {
                    id: "workbench.action.terminal.newWithProfile" /* TerminalCommandId.NewWithProfile */,
                    title: localize(15459, null)
                },
                group: "1_create" /* TerminalContextMenuGroup.Create */
            }
        },
        {
            id: MenuId.TerminalTabEmptyAreaContext,
            item: {
                command: {
                    id: "workbench.action.terminal.new" /* TerminalCommandId.New */,
                    title: terminalStrings.new
                },
                group: "1_create" /* TerminalContextMenuGroup.Create */
            }
        }
    ]);
    MenuRegistry.appendMenuItems([
        {
            id: MenuId.TerminalNewDropdownContext,
            item: {
                command: {
                    id: "workbench.action.terminal.selectDefaultShell" /* TerminalCommandId.SelectDefaultProfile */,
                    title: localize2(15482, 'Select Default Profile'),
                },
                group: '3_configure'
            }
        },
        {
            id: MenuId.TerminalNewDropdownContext,
            item: {
                command: {
                    id: "workbench.action.terminal.openSettings" /* TerminalCommandId.ConfigureTerminalSettings */,
                    title: localize(15460, null)
                },
                group: '3_configure'
            }
        },
        {
            id: MenuId.TerminalNewDropdownContext,
            item: {
                command: {
                    id: 'workbench.action.tasks.runTask',
                    title: localize(15461, null)
                },
                when: TaskExecutionSupportedContext,
                group: '4_tasks',
                order: 1
            },
        },
        {
            id: MenuId.TerminalNewDropdownContext,
            item: {
                command: {
                    id: 'workbench.action.tasks.configureTaskRunner',
                    title: localize(15462, null)
                },
                when: TaskExecutionSupportedContext,
                group: '4_tasks',
                order: 2
            },
        }
    ]);
    MenuRegistry.appendMenuItems([
        {
            id: MenuId.ViewTitle,
            item: {
                command: {
                    id: "workbench.action.terminal.switchTerminal" /* TerminalCommandId.SwitchTerminal */,
                    title: localize2(15483, 'Switch Terminal')
                },
                group: 'navigation',
                order: 0,
                when: ContextKeyExpr.and(ContextKeyExpr.equals('view', TERMINAL_VIEW_ID), ContextKeyExpr.not(`config.${"terminal.integrated.tabs.enabled" /* TerminalSettingId.TabsEnabled */}`)),
            }
        },
        {
            // This is used to show instead of tabs when there is only a single terminal
            id: MenuId.ViewTitle,
            item: {
                command: {
                    id: "workbench.action.terminal.focus" /* TerminalCommandId.Focus */,
                    title: terminalStrings.focus
                },
                alt: {
                    id: "workbench.action.terminal.split" /* TerminalCommandId.Split */,
                    title: terminalStrings.split.value,
                    icon: Codicon.splitHorizontal
                },
                group: 'navigation',
                order: 0,
                when: ContextKeyExpr.and(ContextKeyExpr.not("hasHiddenChatTerminals" /* TerminalContribContextKeyStrings.ChatHasHiddenTerminals */), ContextKeyExpr.equals('view', TERMINAL_VIEW_ID), ContextKeyExpr.has(`config.${"terminal.integrated.tabs.enabled" /* TerminalSettingId.TabsEnabled */}`), ContextKeyExpr.or(ContextKeyExpr.and(ContextKeyExpr.equals(`config.${"terminal.integrated.tabs.showActiveTerminal" /* TerminalSettingId.TabsShowActiveTerminal */}`, 'singleTerminal'), ContextKeyExpr.equals("terminalGroupCount" /* TerminalContextKeyStrings.GroupCount */, 1)), ContextKeyExpr.and(ContextKeyExpr.equals(`config.${"terminal.integrated.tabs.showActiveTerminal" /* TerminalSettingId.TabsShowActiveTerminal */}`, 'singleTerminalOrNarrow'), ContextKeyExpr.or(ContextKeyExpr.equals("terminalGroupCount" /* TerminalContextKeyStrings.GroupCount */, 1), ContextKeyExpr.has("isTerminalTabsNarrow" /* TerminalContextKeyStrings.TabsNarrow */))), ContextKeyExpr.and(ContextKeyExpr.equals(`config.${"terminal.integrated.tabs.showActiveTerminal" /* TerminalSettingId.TabsShowActiveTerminal */}`, 'singleGroup'), ContextKeyExpr.equals("terminalGroupCount" /* TerminalContextKeyStrings.GroupCount */, 1)), ContextKeyExpr.equals(`config.${"terminal.integrated.tabs.showActiveTerminal" /* TerminalSettingId.TabsShowActiveTerminal */}`, 'always'))),
            }
        },
        {
            id: MenuId.ViewTitle,
            item: {
                command: {
                    id: "workbench.action.terminal.split" /* TerminalCommandId.Split */,
                    title: terminalStrings.split,
                    icon: Codicon.splitHorizontal
                },
                group: 'navigation',
                order: 2,
                when: TerminalContextKeys.shouldShowViewInlineActions
            }
        },
        {
            id: MenuId.ViewTitle,
            item: {
                command: {
                    id: "workbench.action.terminal.kill" /* TerminalCommandId.Kill */,
                    title: terminalStrings.kill,
                    icon: Codicon.trash
                },
                group: 'navigation',
                order: 3,
                when: TerminalContextKeys.shouldShowViewInlineActions
            }
        },
        {
            id: MenuId.ViewTitle,
            item: {
                command: {
                    id: "workbench.action.terminal.new" /* TerminalCommandId.New */,
                    title: terminalStrings.new,
                    icon: Codicon.plus
                },
                alt: {
                    id: "workbench.action.terminal.split" /* TerminalCommandId.Split */,
                    title: terminalStrings.split.value,
                    icon: Codicon.splitHorizontal
                },
                group: 'navigation',
                order: 0,
                when: ContextKeyExpr.and(ContextKeyExpr.equals('view', TERMINAL_VIEW_ID), ContextKeyExpr.or(TerminalContextKeys.webExtensionContributedProfile, TerminalContextKeys.processSupported))
            }
        },
        {
            id: MenuId.ViewTitle,
            item: {
                command: {
                    id: "workbench.action.terminal.clear" /* TerminalCommandId.Clear */,
                    title: localize(15463, null),
                    icon: Codicon.clearAll
                },
                group: 'navigation',
                order: 6,
                when: ContextKeyExpr.equals('view', TERMINAL_VIEW_ID),
                isHiddenByDefault: true
            }
        },
        {
            id: MenuId.ViewTitle,
            item: {
                command: {
                    id: "workbench.action.terminal.runActiveFile" /* TerminalCommandId.RunActiveFile */,
                    title: localize(15464, null),
                    icon: Codicon.run
                },
                group: 'navigation',
                order: 7,
                when: ContextKeyExpr.equals('view', TERMINAL_VIEW_ID),
                isHiddenByDefault: true
            }
        },
        {
            id: MenuId.ViewTitle,
            item: {
                command: {
                    id: "workbench.action.terminal.runSelectedText" /* TerminalCommandId.RunSelectedText */,
                    title: localize(15465, null),
                    icon: Codicon.selection
                },
                group: 'navigation',
                order: 8,
                when: ContextKeyExpr.equals('view', TERMINAL_VIEW_ID),
                isHiddenByDefault: true
            },
        },
        {
            id: MenuId.ViewTitle,
            item: {
                command: {
                    id: "workbench.action.terminal.startVoice" /* TerminalCommandId.StartVoice */,
                    title: localize(15466, null),
                },
                group: 'navigation',
                order: 9,
                when: ContextKeyExpr.and(ContextKeyExpr.equals('view', TERMINAL_VIEW_ID), TerminalContextKeys.terminalDictationInProgress.toNegated()),
                isHiddenByDefault: true
            },
        },
        {
            id: MenuId.ViewTitle,
            item: {
                command: {
                    id: "workbench.action.terminal.stopVoice" /* TerminalCommandId.StopVoice */,
                    title: localize(15467, null),
                },
                group: 'navigation',
                order: 9,
                when: ContextKeyExpr.and(ContextKeyExpr.equals('view', TERMINAL_VIEW_ID), TerminalContextKeys.terminalDictationInProgress),
                isHiddenByDefault: true
            },
        },
    ]);
    MenuRegistry.appendMenuItems([
        {
            id: MenuId.TerminalTabContext,
            item: {
                command: {
                    id: "workbench.action.terminal.splitActiveTab" /* TerminalCommandId.SplitActiveTab */,
                    title: terminalStrings.split.value,
                },
                group: "1_create" /* TerminalContextMenuGroup.Create */,
                order: 1
            }
        },
        {
            id: MenuId.TerminalTabContext,
            item: {
                command: {
                    id: "workbench.action.terminal.moveToEditor" /* TerminalCommandId.MoveToEditor */,
                    title: terminalStrings.moveToEditor.value
                },
                group: "1_create" /* TerminalContextMenuGroup.Create */,
                order: 2
            }
        },
        {
            id: MenuId.TerminalTabContext,
            item: {
                command: {
                    id: "workbench.action.terminal.moveIntoNewWindow" /* TerminalCommandId.MoveIntoNewWindow */,
                    title: terminalStrings.moveIntoNewWindow.value
                },
                group: "1_create" /* TerminalContextMenuGroup.Create */,
                order: 2
            }
        },
        {
            id: MenuId.TerminalTabContext,
            item: {
                command: {
                    id: "workbench.action.terminal.renameActiveTab" /* TerminalCommandId.RenameActiveTab */,
                    title: localize(15468, null)
                },
                group: "3_edit" /* TerminalContextMenuGroup.Edit */
            }
        },
        {
            id: MenuId.TerminalTabContext,
            item: {
                command: {
                    id: "workbench.action.terminal.changeIconActiveTab" /* TerminalCommandId.ChangeIconActiveTab */,
                    title: localize(15469, null)
                },
                group: "3_edit" /* TerminalContextMenuGroup.Edit */
            }
        },
        {
            id: MenuId.TerminalTabContext,
            item: {
                command: {
                    id: "workbench.action.terminal.changeColorActiveTab" /* TerminalCommandId.ChangeColorActiveTab */,
                    title: localize(15470, null)
                },
                group: "3_edit" /* TerminalContextMenuGroup.Edit */
            }
        },
        {
            id: MenuId.TerminalTabContext,
            item: {
                command: {
                    id: "workbench.action.terminal.sizeToContentWidth" /* TerminalCommandId.SizeToContentWidth */,
                    title: terminalStrings.toggleSizeToContentWidth
                },
                group: "3_edit" /* TerminalContextMenuGroup.Edit */
            }
        },
        {
            id: MenuId.TerminalTabContext,
            item: {
                command: {
                    id: "workbench.action.terminal.joinActiveTab" /* TerminalCommandId.JoinActiveTab */,
                    title: localize(15471, null)
                },
                when: TerminalContextKeys.tabsSingularSelection.toNegated(),
                group: "9_config" /* TerminalContextMenuGroup.Config */
            }
        },
        {
            id: MenuId.TerminalTabContext,
            item: {
                command: {
                    id: "workbench.action.terminal.unsplit" /* TerminalCommandId.Unsplit */,
                    title: terminalStrings.unsplit.value
                },
                when: ContextKeyExpr.and(TerminalContextKeys.tabsSingularSelection, TerminalContextKeys.splitTerminalTabFocused),
                group: "9_config" /* TerminalContextMenuGroup.Config */
            }
        },
        {
            id: MenuId.TerminalTabContext,
            item: {
                command: {
                    id: "workbench.action.terminal.killActiveTab" /* TerminalCommandId.KillActiveTab */,
                    title: terminalStrings.kill.value
                },
                group: "7_kill" /* TerminalContextMenuGroup.Kill */,
            }
        }
    ]);
    MenuRegistry.appendMenuItem(MenuId.EditorTitleContext, {
        command: {
            id: "workbench.action.terminal.moveToTerminalPanel" /* TerminalCommandId.MoveToTerminalPanel */,
            title: terminalStrings.moveToTerminalPanel
        },
        when: ResourceContextKey.Scheme.isEqualTo(Schemas.vscodeTerminal),
        group: '2_files'
    });
    MenuRegistry.appendMenuItem(MenuId.EditorTitleContext, {
        command: {
            id: "workbench.action.terminal.rename" /* TerminalCommandId.Rename */,
            title: terminalStrings.rename
        },
        when: ResourceContextKey.Scheme.isEqualTo(Schemas.vscodeTerminal),
        group: '2_files'
    });
    MenuRegistry.appendMenuItem(MenuId.EditorTitleContext, {
        command: {
            id: "workbench.action.terminal.changeColor" /* TerminalCommandId.ChangeColor */,
            title: terminalStrings.changeColor
        },
        when: ResourceContextKey.Scheme.isEqualTo(Schemas.vscodeTerminal),
        group: '2_files'
    });
    MenuRegistry.appendMenuItem(MenuId.EditorTitleContext, {
        command: {
            id: "workbench.action.terminal.changeIcon" /* TerminalCommandId.ChangeIcon */,
            title: terminalStrings.changeIcon
        },
        when: ResourceContextKey.Scheme.isEqualTo(Schemas.vscodeTerminal),
        group: '2_files'
    });
    MenuRegistry.appendMenuItem(MenuId.EditorTitleContext, {
        command: {
            id: "workbench.action.terminal.sizeToContentWidth" /* TerminalCommandId.SizeToContentWidth */,
            title: terminalStrings.toggleSizeToContentWidth
        },
        when: ResourceContextKey.Scheme.isEqualTo(Schemas.vscodeTerminal),
        group: '2_files'
    });
    for (const menuId of [MenuId.EditorTitle, MenuId.CompactWindowEditorTitle]) {
        MenuRegistry.appendMenuItem(menuId, {
            command: {
                id: "workbench.action.createTerminalEditorSameGroup" /* TerminalCommandId.CreateTerminalEditorSameGroup */,
                title: terminalStrings.new,
                icon: Codicon.plus
            },
            alt: {
                id: "workbench.action.terminal.split" /* TerminalCommandId.Split */,
                title: terminalStrings.split.value,
                icon: Codicon.splitHorizontal
            },
            group: 'navigation',
            order: 0,
            when: ResourceContextKey.Scheme.isEqualTo(Schemas.vscodeTerminal)
        });
        MenuRegistry.appendMenuItem(menuId, {
            command: {
                id: "workbench.action.terminal.clear" /* TerminalCommandId.Clear */,
                title: localize(15472, null),
                icon: Codicon.clearAll
            },
            group: 'navigation',
            order: 6,
            when: ResourceContextKey.Scheme.isEqualTo(Schemas.vscodeTerminal),
            isHiddenByDefault: true
        });
        MenuRegistry.appendMenuItem(menuId, {
            command: {
                id: "workbench.action.terminal.runActiveFile" /* TerminalCommandId.RunActiveFile */,
                title: localize(15473, null),
                icon: Codicon.run
            },
            group: 'navigation',
            order: 7,
            when: ResourceContextKey.Scheme.isEqualTo(Schemas.vscodeTerminal),
            isHiddenByDefault: true
        });
        MenuRegistry.appendMenuItem(menuId, {
            command: {
                id: "workbench.action.terminal.runSelectedText" /* TerminalCommandId.RunSelectedText */,
                title: localize(15474, null),
                icon: Codicon.selection
            },
            group: 'navigation',
            order: 8,
            when: ResourceContextKey.Scheme.isEqualTo(Schemas.vscodeTerminal),
            isHiddenByDefault: true
        });
        MenuRegistry.appendMenuItem(menuId, {
            command: {
                id: "workbench.action.terminal.startVoice" /* TerminalCommandId.StartVoice */,
                title: localize(15475, null),
                icon: Codicon.mic
            },
            group: 'navigation',
            order: 9,
            when: ContextKeyExpr.and(ResourceContextKey.Scheme.isEqualTo(Schemas.vscodeTerminal), TerminalContextKeys.terminalDictationInProgress.negate()),
            isHiddenByDefault: true
        });
        MenuRegistry.appendMenuItem(menuId, {
            command: {
                id: "workbench.action.terminal.stopVoice" /* TerminalCommandId.StopVoice */,
                title: localize(15476, null),
                icon: Codicon.run
            },
            group: 'navigation',
            order: 10,
            when: ContextKeyExpr.and(ResourceContextKey.Scheme.isEqualTo(Schemas.vscodeTerminal), HasSpeechProvider, TerminalContextKeys.terminalDictationInProgress),
            isHiddenByDefault: true
        });
    }
}
export function getTerminalActionBarArgs(location, profiles, defaultProfileName, contributedProfiles, terminalService, dropdownMenu, disposableStore, configurationService) {
    const shouldElevateAiProfiles = configurationService.getValue("terminal.integrated.experimental.aiProfileGrouping" /* TerminalSettingId.ExperimentalAiProfileGrouping */);
    profiles = profiles.filter(e => !e.isAutoDetected);
    const [aiProfiles, otherProfiles] = shouldElevateAiProfiles
        ? splitProfiles(profiles)
        : [[], profiles];
    const [aiContributedProfiles, otherContributedProfiles] = shouldElevateAiProfiles
        ? splitContributedProfiles(contributedProfiles)
        : [[], contributedProfiles];
    const dropdownActions = [];
    const submenuActions = [];
    const splitLocation = (location === TerminalLocation.Editor || (typeof location === 'object' && hasKey(location, { viewColumn: true }) && location.viewColumn === ACTIVE_GROUP)) ? { viewColumn: SIDE_GROUP } : { splitActiveTerminal: true };
    if (location === TerminalLocation.Editor) {
        location = { viewColumn: ACTIVE_GROUP };
    }
    dropdownActions.push(disposableStore.add(new Action("workbench.action.terminal.new" /* TerminalCommandId.New */, terminalStrings.new, undefined, true, () => terminalService.createAndFocusTerminal())));
    dropdownActions.push(disposableStore.add(new Action("workbench.action.terminal.newInNewWindow" /* TerminalCommandId.NewInNewWindow */, terminalStrings.newInNewWindow.value, undefined, true, () => terminalService.createAndFocusTerminal({
        location: {
            viewColumn: AUX_WINDOW_GROUP,
            auxiliary: { compact: true },
        }
    }))));
    dropdownActions.push(disposableStore.add(new Action("workbench.action.terminal.split" /* TerminalCommandId.Split */, terminalStrings.split.value, undefined, true, () => terminalService.createAndFocusTerminal({
        location: splitLocation
    }))));
    dropdownActions.push(new Separator());
    for (const p of aiProfiles) {
        addProfileActions(p, defaultProfileName, location, splitLocation, terminalService, dropdownActions, submenuActions, disposableStore);
    }
    for (const contributed of aiContributedProfiles) {
        addContributedProfileActions(contributed, defaultProfileName, location, splitLocation, terminalService, dropdownActions, submenuActions, disposableStore);
    }
    if ((aiProfiles.length > 0 || aiContributedProfiles.length > 0) && (otherProfiles.length > 0 || otherContributedProfiles.length > 0)) {
        dropdownActions.push(new Separator());
    }
    for (const p of otherProfiles) {
        addProfileActions(p, defaultProfileName, location, splitLocation, terminalService, dropdownActions, submenuActions, disposableStore);
    }
    for (const contributed of otherContributedProfiles) {
        addContributedProfileActions(contributed, defaultProfileName, location, splitLocation, terminalService, dropdownActions, submenuActions, disposableStore);
    }
    if (dropdownActions.length > 0) {
        dropdownActions.push(new SubmenuAction('split.profile', localize(15477, null), submenuActions));
        dropdownActions.push(new Separator());
    }
    const actions = dropdownMenu.getActions();
    dropdownActions.push(...Separator.join(...actions.map(a => a[1])));
    const dropdownAction = disposableStore.add(new Action('refresh profiles', localize(15478, null), 'codicon-chevron-down', true));
    return { dropdownAction, dropdownMenuActions: dropdownActions, className: `terminal-tab-actions-${terminalService.resolveLocation(location)}` };
}
function splitProfiles(profiles) {
    const aiProfiles = [];
    const otherProfiles = [];
    for (const profile of profiles) {
        if (isAiProfileName(profile.profileName)) {
            aiProfiles.push(profile);
        }
        else {
            otherProfiles.push(profile);
        }
    }
    return [aiProfiles, otherProfiles];
}
function splitContributedProfiles(contributedProfiles) {
    const aiContributedProfiles = [];
    const otherContributedProfiles = [];
    for (const profile of contributedProfiles) {
        if (isAiContributedProfile(profile)) {
            aiContributedProfiles.push(profile);
        }
        else {
            otherContributedProfiles.push(profile);
        }
    }
    return [aiContributedProfiles, otherContributedProfiles];
}
function isAiContributedProfile(profile) {
    const extensionIdentifier = profile.extensionIdentifier.toLowerCase();
    if (extensionIdentifier === 'github.copilot-chat' || extensionIdentifier === 'anthropic.claude-code') {
        return true;
    }
    return isAiProfileName(profile.title);
}
function isAiProfileName(name) {
    const lowerCaseName = name.toLowerCase();
    return lowerCaseName.includes('copilot') || lowerCaseName.includes('claude');
}
function addProfileActions(profile, defaultProfileName, location, splitLocation, terminalService, dropdownActions, submenuActions, disposableStore) {
    const isDefault = profile.profileName === defaultProfileName;
    const options = { config: profile, location };
    const splitOptions = { config: profile, location: splitLocation };
    const sanitizedProfileName = profile.profileName.replace(/[\n\r\t]/g, '');
    dropdownActions.push(disposableStore.add(new Action("workbench.action.terminal.newWithProfile" /* TerminalCommandId.NewWithProfile */, isDefault ? localize(15479, null, sanitizedProfileName) : sanitizedProfileName, undefined, true, async () => {
        await terminalService.createAndFocusTerminal(options);
    })));
    submenuActions.push(disposableStore.add(new Action("workbench.action.terminal.split" /* TerminalCommandId.Split */, isDefault ? localize(15480, null, sanitizedProfileName) : sanitizedProfileName, undefined, true, async () => {
        await terminalService.createAndFocusTerminal(splitOptions);
    })));
}
function addContributedProfileActions(contributed, defaultProfileName, location, splitLocation, terminalService, dropdownActions, submenuActions, disposableStore) {
    const isDefault = contributed.title === defaultProfileName;
    const title = isDefault ? localize(15481, null, contributed.title.replace(/[\n\r\t]/g, '')) : contributed.title.replace(/[\n\r\t]/g, '');
    dropdownActions.push(disposableStore.add(new Action('contributed', title, undefined, true, () => terminalService.createAndFocusTerminal({
        config: {
            extensionIdentifier: contributed.extensionIdentifier,
            id: contributed.id,
            title
        },
        location
    }))));
    submenuActions.push(disposableStore.add(new Action('contributed-split', title, undefined, true, () => terminalService.createAndFocusTerminal({
        config: {
            extensionIdentifier: contributed.extensionIdentifier,
            id: contributed.id,
            title
        },
        location: splitLocation
    }))));
}
//# sourceMappingURL=terminalMenus.js.map