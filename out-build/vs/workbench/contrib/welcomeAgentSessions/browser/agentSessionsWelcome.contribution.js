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
import { localize } from '../../../../nls.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { Registry } from '../../../../platform/registry/common/platform.js';
import { SyncDescriptor } from '../../../../platform/instantiation/common/descriptors.js';
import { registerWorkbenchContribution2 } from '../../../common/contributions.js';
import { EditorPaneDescriptor } from '../../../browser/editor.js';
import { EditorExtensions } from '../../../common/editor.js';
import { IEditorResolverService, RegisteredEditorPriority } from '../../../services/editor/common/editorResolverService.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { IEditorService } from '../../../services/editor/common/editorService.js';
import { IEditorGroupsService } from '../../../services/editor/common/editorGroupsService.js';
import { IContextKeyService } from '../../../../platform/contextkey/common/contextkey.js';
import { AuxiliaryBarMaximizedContext } from '../../../common/contextkeys.js';
import { IStorageService } from '../../../../platform/storage/common/storage.js';
import { AgentSessionsWelcomeInput } from './agentSessionsWelcomeInput.js';
import { AgentSessionsWelcomePage, AgentSessionsWelcomeInputSerializer } from './agentSessionsWelcome.js';
import { Action2, registerAction2 } from '../../../../platform/actions/common/actions.js';
import { ChatContextKeys } from '../../chat/common/actions/chatContextKeys.js';
import { IWorkspaceContextService } from '../../../../platform/workspace/common/workspace.js';
import { IChatEntitlementService } from '../../../services/chat/common/chatEntitlementService.js';
// Registration priority
const agentSessionsWelcomeInputTypeId = 'workbench.editors.agentSessionsWelcomeInput';
// Register editor serializer
Registry.as(EditorExtensions.EditorFactory)
    .registerEditorSerializer(agentSessionsWelcomeInputTypeId, AgentSessionsWelcomeInputSerializer);
// Register editor pane
Registry.as(EditorExtensions.EditorPane).registerEditorPane(EditorPaneDescriptor.create(AgentSessionsWelcomePage, AgentSessionsWelcomePage.ID, localize(17294, null)), [
    new SyncDescriptor(AgentSessionsWelcomeInput)
]);
const getWorkspaceKind = (workspaceContextService) => {
    const state = workspaceContextService.getWorkbenchState();
    switch (state) {
        case 1 /* WorkbenchState.EMPTY */:
            return 'empty';
        case 2 /* WorkbenchState.FOLDER */:
            return 'folder';
        case 3 /* WorkbenchState.WORKSPACE */:
            return 'workspace';
        default:
            return 'empty';
    }
};
// Register resolver contribution
let AgentSessionsWelcomeEditorResolverContribution = class AgentSessionsWelcomeEditorResolverContribution extends Disposable {
    static { this.ID = 'workbench.contrib.agentSessionsWelcomeEditorResolver'; }
    constructor(editorResolverService, instantiationService, workspaceContextService) {
        super();
        this._register(editorResolverService.registerEditor(`${AgentSessionsWelcomeInput.RESOURCE.scheme}:${AgentSessionsWelcomeInput.RESOURCE.authority}/**`, {
            id: AgentSessionsWelcomePage.ID,
            label: localize(17295, null),
            priority: RegisteredEditorPriority.builtin,
        }, {
            singlePerResource: true,
            canSupportResource: resource => resource.scheme === AgentSessionsWelcomeInput.RESOURCE.scheme &&
                resource.authority === AgentSessionsWelcomeInput.RESOURCE.authority
        }, {
            createEditorInput: () => {
                return {
                    editor: instantiationService.createInstance(AgentSessionsWelcomeInput, { workspaceKind: getWorkspaceKind(workspaceContextService) }),
                };
            }
        }));
    }
};
AgentSessionsWelcomeEditorResolverContribution = __decorate([
    __param(0, IEditorResolverService),
    __param(1, IInstantiationService),
    __param(2, IWorkspaceContextService)
], AgentSessionsWelcomeEditorResolverContribution);
// Register command to open agent sessions welcome page
registerAction2(class OpenAgentSessionsWelcomeAction extends Action2 {
    constructor() {
        super({
            id: AgentSessionsWelcomePage.COMMAND_ID,
            title: localize(17296, null),
            precondition: ChatContextKeys.enabled
        });
    }
    async run(accessor) {
        const editorService = accessor.get(IEditorService);
        const instantiationService = accessor.get(IInstantiationService);
        const workspaceContextService = accessor.get(IWorkspaceContextService);
        const input = instantiationService.createInstance(AgentSessionsWelcomeInput, { initiator: 'command', workspaceKind: getWorkspaceKind(workspaceContextService) });
        await editorService.openEditor(input, { pinned: true });
    }
});
// Runner contribution - handles opening on startup
let AgentSessionsWelcomeRunnerContribution = class AgentSessionsWelcomeRunnerContribution extends Disposable {
    static { this.ID = 'workbench.contrib.agentSessionsWelcomeRunner'; }
    constructor(configurationService, editorService, editorGroupsService, instantiationService, contextKeyService, storageService, workspaceContextService, chatEntitlementService) {
        super();
        this.configurationService = configurationService;
        this.editorService = editorService;
        this.editorGroupsService = editorGroupsService;
        this.instantiationService = instantiationService;
        this.contextKeyService = contextKeyService;
        this.storageService = storageService;
        this.workspaceContextService = workspaceContextService;
        this.chatEntitlementService = chatEntitlementService;
        this.run();
    }
    async run() {
        // Check if AI features are enabled
        if (this.chatEntitlementService.sentiment.hidden) {
            return;
        }
        // Get startup editor configuration
        const startupEditor = this.configurationService.getValue('workbench.startupEditor');
        // Only proceed if configured to show agent sessions welcome page
        if (startupEditor !== 'agentSessionsWelcomePage') {
            return;
        }
        // Wait for editors to restore
        await this.editorGroupsService.whenReady;
        // If the auxiliary bar is maximized, we do not show the welcome page
        if (AuxiliaryBarMaximizedContext.getValue(this.contextKeyService)) {
            return;
        }
        // Check if there's prefill data from a workspace transfer - always show welcome page in that case
        const hasPrefillData = !!this.storageService.get('chat.welcomeViewPrefill', -1 /* StorageScope.APPLICATION */);
        // Don't open if there are already editors open (unless we have prefill data)
        if (this.editorService.activeEditor && !hasPrefillData) {
            return;
        }
        // Open the agent sessions welcome page
        const input = this.instantiationService.createInstance(AgentSessionsWelcomeInput, { initiator: 'startup', workspaceKind: getWorkspaceKind(this.workspaceContextService) });
        await this.editorService.openEditor(input, { pinned: false });
    }
};
AgentSessionsWelcomeRunnerContribution = __decorate([
    __param(0, IConfigurationService),
    __param(1, IEditorService),
    __param(2, IEditorGroupsService),
    __param(3, IInstantiationService),
    __param(4, IContextKeyService),
    __param(5, IStorageService),
    __param(6, IWorkspaceContextService),
    __param(7, IChatEntitlementService)
], AgentSessionsWelcomeRunnerContribution);
// Register contributions
registerWorkbenchContribution2(AgentSessionsWelcomeEditorResolverContribution.ID, AgentSessionsWelcomeEditorResolverContribution, 1 /* WorkbenchPhase.BlockStartup */);
registerWorkbenchContribution2(AgentSessionsWelcomeRunnerContribution.ID, AgentSessionsWelcomeRunnerContribution, 3 /* WorkbenchPhase.AfterRestored */);
//# sourceMappingURL=agentSessionsWelcome.contribution.js.map