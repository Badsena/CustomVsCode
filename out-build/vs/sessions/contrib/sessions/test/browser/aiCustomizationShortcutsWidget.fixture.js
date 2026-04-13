/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { toAction } from '../../../../../base/common/actions.js';
import { Emitter, Event } from '../../../../../base/common/event.js';
import { DisposableStore } from '../../../../../base/common/lifecycle.js';
import { observableValue } from '../../../../../base/common/observable.js';
import { URI } from '../../../../../base/common/uri.js';
import { mock } from '../../../../../base/test/common/mock.js';
import { IActionViewItemService } from '../../../../../platform/actions/browser/actionViewItemService.js';
import { IMenuService, isIMenuItem, MenuId, MenuRegistry } from '../../../../../platform/actions/common/actions.js';
import { IStorageService } from '../../../../../platform/storage/common/storage.js';
import { IFileService } from '../../../../../platform/files/common/files.js';
import { IWorkspaceContextService } from '../../../../../platform/workspace/common/workspace.js';
import { IPromptsService, PromptsStorage } from '../../../../../workbench/contrib/chat/common/promptSyntax/service/promptsService.js';
import { PromptsType } from '../../../../../workbench/contrib/chat/common/promptSyntax/promptTypes.js';
import { ILanguageModelsService } from '../../../../../workbench/contrib/chat/common/languageModels.js';
import { IMcpService } from '../../../../../workbench/contrib/mcp/common/mcpTypes.js';
import { IAICustomizationWorkspaceService } from '../../../../../workbench/contrib/chat/common/aiCustomizationWorkspaceService.js';
import { IAgentPluginService } from '../../../../../workbench/contrib/chat/common/plugins/agentPluginService.js';
import { createEditorServices, defineComponentFixture, defineThemedFixtureGroup, registerWorkbenchServices } from '../../../../../workbench/test/browser/componentFixtures/fixtureUtils.js';
import { AICustomizationShortcutsWidget } from '../../browser/aiCustomizationShortcutsWidget.js';
import { CUSTOMIZATION_ITEMS, CustomizationLinkViewItem } from '../../browser/customizationsToolbar.contribution.js';
import { ISessionsManagementService } from '../../browser/sessionsManagementService.js';
import { Menus } from '../../../../browser/menus.js';
// Ensure color registrations are loaded
import '../../../../common/theme.js';
import '../../../../../platform/theme/common/colors/inputColors.js';
// ============================================================================
// One-time menu item registration (module-level).
// MenuRegistry.appendMenuItem does not throw on duplicates, unlike registerAction2
// which registers global commands and throws on the second call.
// ============================================================================
const menuRegistrations = new DisposableStore();
for (const [index, config] of CUSTOMIZATION_ITEMS.entries()) {
    menuRegistrations.add(MenuRegistry.appendMenuItem(Menus.SidebarCustomizations, {
        command: { id: config.id, title: config.label },
        group: 'navigation',
        order: index + 1,
    }));
}
// ============================================================================
// FixtureMenuService — reads from MenuRegistry without context-key filtering
// (MockContextKeyService.contextMatchesRules always returns false, which hides
// every item when using the real MenuService.)
// ============================================================================
class FixtureMenuService {
    createMenu(id) {
        return {
            onDidChange: Event.None,
            dispose: () => { },
            getActions: () => {
                const items = MenuRegistry.getMenuItems(id).filter(isIMenuItem);
                items.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
                const actions = items.map(item => {
                    const title = typeof item.command.title === 'string' ? item.command.title : item.command.title.value;
                    return toAction({ id: item.command.id, label: title, run: () => { } });
                });
                return actions.length ? [['navigation', actions]] : [];
            },
        };
    }
    getMenuActions(_id, _contextKeyService, _options) { return []; }
    getMenuContexts() { return new Set(); }
    resetHiddenStates() { }
}
// ============================================================================
// Minimal IActionViewItemService that supports register/lookUp
// ============================================================================
class FixtureActionViewItemService {
    constructor() {
        this._providers = new Map();
        this._onDidChange = new Emitter();
        this.onDidChange = this._onDidChange.event;
    }
    register(menu, commandId, provider) {
        const key = `${menu.id}/${commandId instanceof MenuId ? commandId.id : commandId}`;
        this._providers.set(key, provider);
        return { dispose: () => { this._providers.delete(key); } };
    }
    lookUp(menu, commandId) {
        const key = `${menu.id}/${commandId instanceof MenuId ? commandId.id : commandId}`;
        return this._providers.get(key);
    }
}
// ============================================================================
// Mock helpers
// ============================================================================
const defaultFilter = {
    sources: [PromptsStorage.local, PromptsStorage.user, PromptsStorage.extension],
};
function createMockPromptsService() {
    return createMockPromptsServiceWithCounts();
}
function createMockPromptsServiceWithCounts(counts) {
    const fakeUri = (prefix, i) => URI.parse(`file:///mock/${prefix}-${i}.md`);
    const fakeItem = (prefix, i) => ({ uri: fakeUri(prefix, i), storage: PromptsStorage.local });
    const agents = Array.from({ length: counts?.agents ?? 0 }, (_, i) => ({
        uri: fakeUri('agent', i),
        source: { storage: PromptsStorage.local },
    }));
    const skills = Array.from({ length: counts?.skills ?? 0 }, (_, i) => fakeItem('skill', i));
    const prompts = Array.from({ length: counts?.prompts ?? 0 }, (_, i) => ({
        promptPath: { uri: fakeUri('prompt', i), storage: PromptsStorage.local, type: PromptsType.prompt },
    }));
    const instructions = Array.from({ length: counts?.instructions ?? 0 }, (_, i) => fakeItem('instructions', i));
    const hooks = Array.from({ length: counts?.hooks ?? 0 }, (_, i) => fakeItem('hook', i));
    return new class extends mock() {
        constructor() {
            super(...arguments);
            this.onDidChangeCustomAgents = Event.None;
            this.onDidChangeSlashCommands = Event.None;
        }
        async getCustomAgents() { return agents; }
        async findAgentSkills() { return skills; }
        async getPromptSlashCommands() { return prompts; }
        async listPromptFiles(type) {
            return (type === PromptsType.hook ? hooks : instructions);
        }
        async listAgentInstructions() { return []; }
    }();
}
function createMockMcpService(serverCount = 0) {
    const MockServer = mock();
    const servers = observableValue('mockMcpServers', Array.from({ length: serverCount }, () => new MockServer()));
    return new class extends mock() {
        constructor() {
            super(...arguments);
            this.servers = servers;
        }
    }();
}
function createMockWorkspaceService() {
    const activeProjectRoot = observableValue('mockActiveProjectRoot', undefined);
    return new class extends mock() {
        constructor() {
            super(...arguments);
            this.activeProjectRoot = activeProjectRoot;
        }
        getActiveProjectRoot() { return undefined; }
        getStorageSourceFilter() { return defaultFilter; }
    }();
}
function createMockWorkspaceContextService() {
    return new class extends mock() {
        constructor() {
            super(...arguments);
            this.onDidChangeWorkspaceFolders = Event.None;
        }
        getWorkspace() { return { id: 'test', folders: [] }; }
    }();
}
// ============================================================================
// Render helper
// ============================================================================
function renderWidget(ctx, options) {
    ctx.container.style.width = '300px';
    ctx.container.style.backgroundColor = 'var(--vscode-sideBar-background)';
    const actionViewItemService = new FixtureActionViewItemService();
    const instantiationService = createEditorServices(ctx.disposableStore, {
        colorTheme: ctx.theme,
        additionalServices: (reg) => {
            // Register overrides BEFORE registerWorkbenchServices so they take priority
            reg.defineInstance(IMenuService, new FixtureMenuService());
            reg.defineInstance(IActionViewItemService, actionViewItemService);
            registerWorkbenchServices(reg);
            // Services needed by AICustomizationShortcutsWidget
            reg.defineInstance(IPromptsService, options?.counts ? createMockPromptsServiceWithCounts(options.counts) : createMockPromptsService());
            reg.defineInstance(IMcpService, createMockMcpService(options?.mcpServerCount ?? 0));
            reg.defineInstance(IAICustomizationWorkspaceService, createMockWorkspaceService());
            reg.defineInstance(IWorkspaceContextService, createMockWorkspaceContextService());
            reg.defineInstance(IAgentPluginService, new class extends mock() {
                constructor() {
                    super(...arguments);
                    this.plugins = observableValue('mockPlugins', []);
                }
            }());
            // Additional services needed by CustomizationLinkViewItem
            reg.defineInstance(ILanguageModelsService, new class extends mock() {
                constructor() {
                    super(...arguments);
                    this.onDidChangeLanguageModels = Event.None;
                }
            }());
            reg.defineInstance(ISessionsManagementService, new class extends mock() {
                constructor() {
                    super(...arguments);
                    this.activeSession = observableValue('activeSession', undefined);
                }
            }());
            reg.defineInstance(IFileService, new class extends mock() {
                constructor() {
                    super(...arguments);
                    this.onDidFilesChange = Event.None;
                }
            }());
        },
    });
    // Register view item factories from the real CustomizationLinkViewItem (per-render, instance-scoped)
    for (const config of CUSTOMIZATION_ITEMS) {
        ctx.disposableStore.add(actionViewItemService.register(Menus.SidebarCustomizations, config.id, (action, options) => {
            return instantiationService.createInstance(CustomizationLinkViewItem, action, options, config);
        }));
    }
    // Override storage to set initial collapsed state
    if (options?.collapsed) {
        const storageService = instantiationService.get(IStorageService);
        instantiationService.set(IStorageService, new class extends mock() {
            getBoolean(key, scope, fallbackValue) {
                if (key === 'agentSessions.customizationsCollapsed') {
                    return true;
                }
                return storageService.getBoolean(key, scope, fallbackValue);
            }
            store() { }
        }());
    }
    // Create the widget (uses FixtureMenuService → reads MenuRegistry items registered above)
    ctx.disposableStore.add(instantiationService.createInstance(AICustomizationShortcutsWidget, ctx.container, undefined));
}
// ============================================================================
// Fixtures
// ============================================================================
export default defineThemedFixtureGroup({ path: 'sessions/' }, {
    Expanded: defineComponentFixture({
        labels: { kind: 'screenshot' },
        render: (ctx) => renderWidget(ctx),
    }),
    Collapsed: defineComponentFixture({
        labels: { kind: 'screenshot' },
        render: (ctx) => renderWidget(ctx, { collapsed: true }),
    }),
    WithMcpServers: defineComponentFixture({
        labels: { kind: 'screenshot' },
        render: (ctx) => renderWidget(ctx, { mcpServerCount: 3 }),
    }),
    CollapsedWithMcpServers: defineComponentFixture({
        labels: { kind: 'screenshot' },
        render: (ctx) => renderWidget(ctx, { mcpServerCount: 3, collapsed: true }),
    }),
    WithCounts: defineComponentFixture({
        labels: { kind: 'screenshot' },
        render: (ctx) => renderWidget(ctx, {
            mcpServerCount: 2,
            counts: { agents: 2, skills: 30, instructions: 16, prompts: 17, hooks: 4 },
        }),
    }),
});
//# sourceMappingURL=aiCustomizationShortcutsWidget.fixture.js.map