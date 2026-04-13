/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
import { localize, localize2 } from '../../../../nls.js';
import { GettingStartedInputSerializer, GettingStartedPage, inWelcomeContext } from './gettingStarted.js';
import { Registry } from '../../../../platform/registry/common/platform.js';
import { EditorExtensions } from '../../../common/editor.js';
import { MenuId, registerAction2, Action2 } from '../../../../platform/actions/common/actions.js';
import { ContextKeyExpr, IContextKeyService, RawContextKey } from '../../../../platform/contextkey/common/contextkey.js';
import { IEditorService, SIDE_GROUP } from '../../../services/editor/common/editorService.js';
import { EditorPaneDescriptor } from '../../../browser/editor.js';
import { SyncDescriptor } from '../../../../platform/instantiation/common/descriptors.js';
import { IWalkthroughsService } from './gettingStartedService.js';
import { GettingStartedInput } from './gettingStartedInput.js';
import { registerWorkbenchContribution2 } from '../../../common/contributions.js';
import { Extensions as ConfigurationExtensions } from '../../../../platform/configuration/common/configurationRegistry.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { workbenchConfigurationNodeBase } from '../../../common/configuration.js';
import { CommandsRegistry, ICommandService } from '../../../../platform/commands/common/commands.js';
import { IQuickInputService } from '../../../../platform/quickinput/common/quickInput.js';
import { IRemoteAgentService } from '../../../services/remote/common/remoteAgentService.js';
import { isLinux, isMacintosh, isWindows } from '../../../../base/common/platform.js';
import { IExtensionManagementServerService } from '../../../services/extensionManagement/common/extensionManagement.js';
import { IExtensionService } from '../../../services/extensions/common/extensions.js';
import { StartupPageEditorResolverContribution, StartupPageRunnerContribution } from './startupPage.js';
import { Categories } from '../../../../platform/action/common/actionCommonCategories.js';
import { DisposableStore } from '../../../../base/common/lifecycle.js';
import { AccessibleViewRegistry } from '../../../../platform/accessibility/browser/accessibleViewRegistry.js';
import { GettingStartedAccessibleView } from './gettingStartedAccessibleView.js';
import { AgentSessionsWelcomePage } from '../../welcomeAgentSessions/browser/agentSessionsWelcome.js';
import { IChatEntitlementService } from '../../../services/chat/common/chatEntitlementService.js';
export * as icons from './gettingStartedIcons.js';
registerAction2(class extends Action2 {
    constructor() {
        super({
            id: 'workbench.action.openWalkthrough',
            title: localize2(17327, 'Welcome'),
            category: Categories.Help,
            f1: true,
            menu: {
                id: MenuId.MenubarHelpMenu,
                group: '1_welcome',
                order: 1,
            },
            metadata: {
                description: localize2(17328, 'Opens a Walkthrough to help you get started in VS Code.')
            }
        });
    }
    run(accessor, walkthroughID, optionsOrToSide) {
        const editorService = accessor.get(IEditorService);
        const commandService = accessor.get(ICommandService);
        const configurationService = accessor.get(IConfigurationService);
        const chatEntitlementService = accessor.get(IChatEntitlementService);
        const toSide = typeof optionsOrToSide === 'object' ? optionsOrToSide.toSide : optionsOrToSide;
        const inactive = typeof optionsOrToSide === 'object' ? optionsOrToSide.inactive : false;
        const activeEditor = editorService.activeEditor;
        // If no specific walkthrough is requested and agent sessions welcome is preferred, open that instead
        if (!walkthroughID && !chatEntitlementService.sentiment.hidden && configurationService.getValue('workbench.startupEditor') === 'agentSessionsWelcomePage') {
            commandService.executeCommand(AgentSessionsWelcomePage.COMMAND_ID);
            return;
        }
        else {
            if (walkthroughID) {
                const selectedCategory = typeof walkthroughID === 'string' ? walkthroughID : walkthroughID.category;
                let selectedStep;
                if (typeof walkthroughID === 'object' && 'category' in walkthroughID && 'step' in walkthroughID) {
                    selectedStep = `${walkthroughID.category}#${walkthroughID.step}`;
                }
                else {
                    selectedStep = undefined;
                }
                // If the walkthrough is already open just reveal the step
                if (selectedStep && activeEditor instanceof GettingStartedInput && activeEditor.selectedCategory === selectedCategory) {
                    activeEditor.showWelcome = false;
                    commandService.executeCommand('walkthroughs.selectStep', selectedStep);
                    return;
                }
                let options;
                if (selectedCategory) {
                    // Otherwise open the walkthrough editor with the selected category and step
                    options = { selectedCategory, selectedStep, showWelcome: false, preserveFocus: toSide ?? false, inactive };
                }
                else {
                    // Open Welcome page
                    options = { selectedCategory, selectedStep, showWelcome: true, preserveFocus: toSide ?? false, inactive };
                }
                editorService.openEditor({
                    resource: GettingStartedInput.RESOURCE,
                    options
                }, toSide ? SIDE_GROUP : undefined);
            }
            else {
                editorService.openEditor({
                    resource: GettingStartedInput.RESOURCE,
                    options: { preserveFocus: toSide ?? false, inactive }
                }, toSide ? SIDE_GROUP : undefined);
            }
        }
    }
});
Registry.as(EditorExtensions.EditorFactory).registerEditorSerializer(GettingStartedInput.ID, GettingStartedInputSerializer);
Registry.as(EditorExtensions.EditorPane).registerEditorPane(EditorPaneDescriptor.create(GettingStartedPage, GettingStartedPage.ID, localize(17311, null)), [
    new SyncDescriptor(GettingStartedInput)
]);
const category = localize2(17329, "Welcome");
registerAction2(class extends Action2 {
    constructor() {
        super({
            id: 'welcome.goBack',
            title: localize2(17330, 'Go Back'),
            category,
            keybinding: {
                weight: 100 /* KeybindingWeight.EditorContrib */,
                primary: 9 /* KeyCode.Escape */,
                when: inWelcomeContext
            },
            precondition: ContextKeyExpr.equals('activeEditor', 'gettingStartedPage'),
            f1: true
        });
    }
    run(accessor) {
        const editorService = accessor.get(IEditorService);
        const editorPane = editorService.activeEditorPane;
        if (editorPane instanceof GettingStartedPage) {
            editorPane.escape();
        }
    }
});
CommandsRegistry.registerCommand({
    id: 'walkthroughs.selectStep',
    handler: (accessor, stepID) => {
        const editorService = accessor.get(IEditorService);
        const editorPane = editorService.activeEditorPane;
        if (editorPane instanceof GettingStartedPage) {
            editorPane.selectStepLoose(stepID);
        }
        else {
            console.error('Cannot run walkthroughs.selectStep outside of walkthrough context');
        }
    }
});
registerAction2(class extends Action2 {
    constructor() {
        super({
            id: 'welcome.markStepComplete',
            title: localize(17312, null),
            category,
        });
    }
    run(accessor, arg) {
        if (!arg) {
            return;
        }
        const gettingStartedService = accessor.get(IWalkthroughsService);
        gettingStartedService.progressStep(arg);
    }
});
registerAction2(class extends Action2 {
    constructor() {
        super({
            id: 'welcome.markStepIncomplete',
            title: localize(17313, null),
            category,
        });
    }
    run(accessor, arg) {
        if (!arg) {
            return;
        }
        const gettingStartedService = accessor.get(IWalkthroughsService);
        gettingStartedService.deprogressStep(arg);
    }
});
registerAction2(class extends Action2 {
    constructor() {
        super({
            id: 'welcome.showAllWalkthroughs',
            title: localize2(17331, 'Open Walkthrough...'),
            category,
            f1: true,
            menu: {
                id: MenuId.MenubarHelpMenu,
                group: '1_welcome',
                order: 3,
            },
        });
    }
    async getQuickPickItems(contextService, gettingStartedService) {
        const categories = await gettingStartedService.getWalkthroughs();
        return categories
            .filter(c => contextService.contextMatchesRules(c.when))
            .map(x => ({
            id: x.id,
            label: x.title,
            detail: x.description,
            description: x.source,
        }));
    }
    async run(accessor) {
        const commandService = accessor.get(ICommandService);
        const contextService = accessor.get(IContextKeyService);
        const quickInputService = accessor.get(IQuickInputService);
        const gettingStartedService = accessor.get(IWalkthroughsService);
        const extensionService = accessor.get(IExtensionService);
        const disposables = new DisposableStore();
        const quickPick = disposables.add(quickInputService.createQuickPick());
        quickPick.canSelectMany = false;
        quickPick.matchOnDescription = true;
        quickPick.matchOnDetail = true;
        quickPick.placeholder = localize(17314, null);
        quickPick.items = await this.getQuickPickItems(contextService, gettingStartedService);
        quickPick.busy = true;
        disposables.add(quickPick.onDidAccept(() => {
            const selection = quickPick.selectedItems[0];
            if (selection) {
                commandService.executeCommand('workbench.action.openWalkthrough', selection.id);
            }
            quickPick.hide();
        }));
        disposables.add(quickPick.onDidHide(() => disposables.dispose()));
        await extensionService.whenInstalledExtensionsRegistered();
        disposables.add(gettingStartedService.onDidAddWalkthrough(async () => {
            quickPick.items = await this.getQuickPickItems(contextService, gettingStartedService);
        }));
        quickPick.show();
        quickPick.busy = false;
    }
});
CommandsRegistry.registerCommand({
    id: 'welcome.newWorkspaceChat',
    handler: (accessor, stepID) => {
        const commandService = accessor.get(ICommandService);
        commandService.executeCommand('workbench.action.chat.open', { mode: 'agent', query: '#new ', isPartialQuery: true });
    }
});
export const WorkspacePlatform = new RawContextKey('workspacePlatform', undefined, localize(17315, null));
let WorkspacePlatformContribution = class WorkspacePlatformContribution {
    static { this.ID = 'workbench.contrib.workspacePlatform'; }
    constructor(extensionManagementServerService, remoteAgentService, contextService) {
        this.extensionManagementServerService = extensionManagementServerService;
        this.remoteAgentService = remoteAgentService;
        this.contextService = contextService;
        this.remoteAgentService.getEnvironment().then(env => {
            const remoteOS = env?.os;
            const remotePlatform = remoteOS === 2 /* OS.Macintosh */ ? 'mac'
                : remoteOS === 1 /* OS.Windows */ ? 'windows'
                    : remoteOS === 3 /* OS.Linux */ ? 'linux'
                        : undefined;
            if (remotePlatform) {
                WorkspacePlatform.bindTo(this.contextService).set(remotePlatform);
            }
            else if (this.extensionManagementServerService.localExtensionManagementServer) {
                if (isMacintosh) {
                    WorkspacePlatform.bindTo(this.contextService).set('mac');
                }
                else if (isLinux) {
                    WorkspacePlatform.bindTo(this.contextService).set('linux');
                }
                else if (isWindows) {
                    WorkspacePlatform.bindTo(this.contextService).set('windows');
                }
            }
            else if (this.extensionManagementServerService.webExtensionManagementServer) {
                WorkspacePlatform.bindTo(this.contextService).set('webworker');
            }
            else {
                console.error('Error: Unable to detect workspace platform');
            }
        });
    }
};
WorkspacePlatformContribution = __decorate([
    __param(0, IExtensionManagementServerService),
    __param(1, IRemoteAgentService),
    __param(2, IContextKeyService)
], WorkspacePlatformContribution);
const configurationRegistry = Registry.as(ConfigurationExtensions.Configuration);
configurationRegistry.registerConfiguration({
    ...workbenchConfigurationNodeBase,
    properties: {
        'workbench.welcomePage.walkthroughs.openOnInstall': {
            scope: 2 /* ConfigurationScope.MACHINE */,
            type: 'boolean',
            default: true,
            description: localize(17316, null)
        },
        'workbench.startupEditor': {
            'scope': 5 /* ConfigurationScope.RESOURCE */,
            'type': 'string',
            'enum': ['none', 'welcomePage', 'readme', 'newUntitledFile', 'welcomePageInEmptyWorkbench', 'terminal', 'agentSessionsWelcomePage'],
            'enumDescriptions': [
                localize(17317, null),
                localize(17318, null),
                localize(17319, null),
                localize(17320, null),
                localize(17321, null),
                localize(17322, null),
                localize(17323, null),
            ],
            'default': 'welcomePage',
            'description': localize(17324, null),
            'experiment': { mode: 'auto' }
        },
        'workbench.welcomePage.preferReducedMotion': {
            scope: 1 /* ConfigurationScope.APPLICATION */,
            type: 'boolean',
            default: false,
            deprecationMessage: localize(17325, null),
            description: localize(17326, null)
        }
    }
});
registerWorkbenchContribution2(WorkspacePlatformContribution.ID, WorkspacePlatformContribution, 3 /* WorkbenchPhase.AfterRestored */);
registerWorkbenchContribution2(StartupPageEditorResolverContribution.ID, StartupPageEditorResolverContribution, 2 /* WorkbenchPhase.BlockRestore */);
registerWorkbenchContribution2(StartupPageRunnerContribution.ID, StartupPageRunnerContribution, 3 /* WorkbenchPhase.AfterRestored */);
AccessibleViewRegistry.register(new GettingStartedAccessibleView());
//# sourceMappingURL=gettingStarted.contribution.js.map