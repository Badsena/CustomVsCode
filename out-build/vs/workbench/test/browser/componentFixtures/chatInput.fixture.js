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
import { Emitter, Event } from '../../../../base/common/event.js';
import { observableValue } from '../../../../base/common/observable.js';
import { URI } from '../../../../base/common/uri.js';
import { mock } from '../../../../base/test/common/mock.js';
import { Codicon } from '../../../../base/common/codicons.js';
import { IMenuService, MenuId, MenuItemAction } from '../../../../platform/actions/common/actions.js';
import { ICommandService } from '../../../../platform/commands/common/commands.js';
import { IContextKeyService } from '../../../../platform/contextkey/common/contextkey.js';
import { ITextModelService } from '../../../../editor/common/services/resolverService.js';
import { IFileService } from '../../../../platform/files/common/files.js';
import { ISharedWebContentExtractorService } from '../../../../platform/webContentExtractor/common/webContentExtractor.js';
import { IDecorationsService } from '../../../services/decorations/common/decorations.js';
import { ITextFileService } from '../../../services/textfile/common/textfiles.js';
import { IExtensionService } from '../../../services/extensions/common/extensions.js';
import { IPathService } from '../../../services/path/common/pathService.js';
import { IChatWidgetHistoryService } from '../../../contrib/chat/common/widget/chatWidgetHistoryService.js';
import { IChatContextPickService } from '../../../contrib/chat/browser/attachments/chatContextPickService.js';
import { IWorkspaceContextService } from '../../../../platform/workspace/common/workspace.js';
import { IViewDescriptorService } from '../../../common/views.js';
import { IAgentSessionsService } from '../../../contrib/chat/browser/agentSessions/agentSessionsService.js';
import { IChatAttachmentResolveService } from '../../../contrib/chat/browser/attachments/chatAttachmentResolveService.js';
import { IChatAttachmentWidgetRegistry } from '../../../contrib/chat/browser/attachments/chatAttachmentWidgetRegistry.js';
import { IChatContextService } from '../../../contrib/chat/browser/contextContrib/chatContextService.js';
import { ChatInputPart } from '../../../contrib/chat/browser/widget/input/chatInputPart.js';
import { IChatArtifactsService } from '../../../contrib/chat/common/tools/chatArtifactsService.js';
import { IChatTodoListService } from '../../../contrib/chat/common/tools/chatTodoListService.js';
import { ChatAgentLocation } from '../../../contrib/chat/common/constants.js';
import { IChatEntitlementService } from '../../../services/chat/common/chatEntitlementService.js';
import { IChatModeService } from '../../../contrib/chat/common/chatModes.js';
import { IChatService } from '../../../contrib/chat/common/chatService/chatService.js';
import { IChatSessionsService } from '../../../contrib/chat/common/chatSessionsService.js';
import { ILanguageModelsService } from '../../../contrib/chat/common/languageModels.js';
import { IChatAgentService } from '../../../contrib/chat/common/participants/chatAgents.js';
import { ILanguageModelToolsService } from '../../../contrib/chat/common/tools/languageModelToolsService.js';
import { IWorkbenchAssignmentService } from '../../../services/assignment/common/assignmentService.js';
import { IEditorService } from '../../../services/editor/common/editorService.js';
import { IWorkbenchLayoutService } from '../../../services/layout/browser/layoutService.js';
import { IActionWidgetService } from '../../../../platform/actionWidget/browser/actionWidget.js';
import { IProductService } from '../../../../platform/product/common/productService.js';
import { IUpdateService } from '../../../../platform/update/common/update.js';
import { IListService, ListService } from '../../../../platform/list/browser/listService.js';
import { INotebookDocumentService } from '../../../services/notebook/common/notebookDocumentService.js';
import { createEditorServices, defineComponentFixture, defineThemedFixtureGroup, registerWorkbenchServices } from './fixtureUtils.js';
import '../../../contrib/chat/browser/widget/media/chat.css';
let FixtureMenuService = class FixtureMenuService {
    constructor(_contextKeyService, _commandService) {
        this._contextKeyService = _contextKeyService;
        this._commandService = _commandService;
        this._items = new Map();
    }
    addItem(menuId, item) {
        const key = menuId.id;
        let items = this._items.get(key);
        if (!items) {
            items = [];
            this._items.set(key, items);
        }
        items.push(item);
    }
    createMenu(id) {
        const actions = [];
        for (const item of this._items.get(id.id) ?? []) {
            const group = item.group ?? '';
            let entry = actions.find(a => a[0] === group);
            if (!entry) {
                entry = [group, []];
                actions.push(entry);
            }
            entry[1].push(new MenuItemAction(item.command, item.alt, {}, undefined, undefined, this._contextKeyService, this._commandService));
        }
        return { onDidChange: Event.None, dispose() { }, getActions: () => actions };
    }
    getMenuActions() { return []; }
    getMenuContexts() { return new Set(); }
    resetHiddenStates() { }
};
FixtureMenuService = __decorate([
    __param(0, IContextKeyService),
    __param(1, ICommandService)
], FixtureMenuService);
async function renderChatInput(context, fixtureOptions = {}) {
    const { container, disposableStore } = context;
    const { artifacts = [], editingSession, todos = [] } = fixtureOptions;
    const artifactsObs = observableValue('artifacts', artifacts);
    const instantiationService = createEditorServices(disposableStore, {
        colorTheme: context.theme,
        additionalServices: (reg) => {
            reg.define(IMenuService, FixtureMenuService);
            registerWorkbenchServices(reg);
            // eslint-disable-next-line local/code-no-dangerous-type-assertions
            reg.defineInstance(ITextModelService, new class extends mock() {
                async createModelReference() { return { object: { textEditorModel: null }, dispose() { } }; }
            }());
            reg.defineInstance(IDecorationsService, new class extends mock() {
                constructor() {
                    super(...arguments);
                    this.onDidChangeDecorations = Event.None;
                }
            }());
            reg.defineInstance(ITextFileService, new class extends mock() {
                constructor() {
                    super(...arguments);
                    this.untitled = new class extends mock() {
                        constructor() {
                            super(...arguments);
                            this.onDidChangeLabel = Event.None;
                        }
                    }();
                }
            }());
            reg.defineInstance(ILanguageModelsService, new class extends mock() {
                constructor() {
                    super(...arguments);
                    this.onDidChangeLanguageModels = Event.None;
                }
                getLanguageModelIds() { return []; }
            }());
            reg.defineInstance(IFileService, new class extends mock() {
                constructor() {
                    super(...arguments);
                    this.onDidFilesChange = Event.None;
                    this.onDidRunOperation = Event.None;
                }
            }());
            reg.defineInstance(IEditorService, new class extends mock() {
                constructor() {
                    super(...arguments);
                    this.onDidActiveEditorChange = Event.None;
                }
            }());
            reg.defineInstance(IChatAgentService, new class extends mock() {
                constructor() {
                    super(...arguments);
                    this.onDidChangeAgents = Event.None;
                }
                getAgents() { return []; }
                getActivatedAgents() { return []; }
            }());
            reg.defineInstance(ISharedWebContentExtractorService, new class extends mock() {
            }());
            reg.defineInstance(IWorkbenchAssignmentService, new class extends mock() {
                constructor() {
                    super(...arguments);
                    this.onDidRefetchAssignments = Event.None;
                }
                async getCurrentExperiments() { return []; }
                async getTreatment() { return undefined; }
            }());
            reg.defineInstance(IChatEntitlementService, new class extends mock() {
            }());
            reg.defineInstance(IChatModeService, new class extends mock() {
                constructor() {
                    super(...arguments);
                    this.onDidChangeChatModes = Event.None;
                }
                getModes() { return { builtin: [], custom: [] }; }
                findModeById() { return undefined; }
            }());
            reg.defineInstance(ILanguageModelToolsService, new class extends mock() {
                constructor() {
                    super(...arguments);
                    this.onDidChangeTools = Event.None;
                }
                getTools() { return []; }
            }());
            reg.defineInstance(IChatService, new class extends mock() {
                constructor() {
                    super(...arguments);
                    this.onDidSubmitRequest = Event.None;
                }
            }());
            reg.defineInstance(IChatSessionsService, new class extends mock() {
                constructor() {
                    super(...arguments);
                    this.onDidChangeSessionOptions = Event.None;
                    this.onDidChangeOptionGroups = Event.None;
                    this.onDidChangeAvailability = Event.None;
                }
                getAllChatSessionContributions() { return []; }
            }());
            reg.defineInstance(IChatContextService, new class extends mock() {
            }());
            reg.defineInstance(IAgentSessionsService, new class extends mock() {
                constructor() {
                    super(...arguments);
                    this.model = new class extends mock() {
                        constructor() {
                            super(...arguments);
                            this.onDidChangeSessions = Event.None;
                        }
                    }();
                }
            }());
            reg.defineInstance(IWorkspaceContextService, new class extends mock() {
                constructor() {
                    super(...arguments);
                    this.onDidChangeWorkspaceFolders = Event.None;
                }
                getWorkspace() { return { id: '', folders: [], configuration: undefined }; }
            }());
            reg.defineInstance(IWorkbenchLayoutService, new class extends mock() {
                constructor() {
                    super(...arguments);
                    this.onDidChangePartVisibility = Event.None;
                    this.onDidChangeWindowMaximized = Event.None;
                }
                isVisible() { return true; }
            }());
            reg.defineInstance(IViewDescriptorService, new class extends mock() {
                constructor() {
                    super(...arguments);
                    this.onDidChangeLocation = Event.None;
                }
            }());
            reg.defineInstance(IChatAttachmentWidgetRegistry, new class extends mock() {
            }());
            reg.defineInstance(IChatAttachmentResolveService, new class extends mock() {
            }());
            reg.defineInstance(IExtensionService, new class extends mock() {
                constructor() {
                    super(...arguments);
                    this.onDidChangeExtensions = Event.None;
                }
            }());
            reg.defineInstance(IPathService, new class extends mock() {
            }());
            reg.defineInstance(IChatWidgetHistoryService, new class extends mock() {
                constructor() {
                    super(...arguments);
                    this.onDidChangeHistory = Event.None;
                }
                getHistory() { return []; }
            }());
            reg.defineInstance(IChatContextPickService, new class extends mock() {
            }());
            reg.defineInstance(IListService, new ListService());
            reg.defineInstance(INotebookDocumentService, new class extends mock() {
            }());
            reg.defineInstance(IActionWidgetService, new class extends mock() {
                show() { }
                hide() { }
                get isVisible() { return false; }
            }());
            reg.defineInstance(IProductService, new class extends mock() {
            }());
            reg.defineInstance(IUpdateService, new class extends mock() {
                constructor() {
                    super(...arguments);
                    this.onStateChange = Event.None;
                }
                get state() { return { type: "uninitialized" /* StateType.Uninitialized */ }; }
            }());
            reg.defineInstance(IChatArtifactsService, new class extends mock() {
                constructor() {
                    super(...arguments);
                    this.onDidUpdateArtifacts = Event.None;
                }
                getArtifacts() { return [...artifacts]; }
                setArtifacts() { }
                migrateArtifacts() { }
                artifacts() { return artifactsObs; }
            }());
            reg.defineInstance(IChatTodoListService, new class extends mock() {
                constructor() {
                    super(...arguments);
                    this.onDidUpdateTodos = Event.None;
                }
                getTodos() { return [...todos]; }
                setTodos() { }
                migrateTodos() { }
            }());
        },
    });
    container.style.width = '500px';
    container.style.backgroundColor = 'var(--vscode-sideBar-background, var(--vscode-editor-background))';
    container.classList.add('monaco-workbench');
    const session = document.createElement('div');
    session.classList.add('interactive-session');
    container.appendChild(session);
    const menuService = instantiationService.get(IMenuService);
    menuService.addItem(MenuId.ChatInput, { command: { id: 'workbench.action.chat.attachContext', title: '+', icon: Codicon.add }, group: 'navigation', order: -1 });
    menuService.addItem(MenuId.ChatInput, { command: { id: 'workbench.action.chat.openModePicker', title: 'Agent' }, group: 'navigation', order: 1 });
    menuService.addItem(MenuId.ChatInput, { command: { id: 'workbench.action.chat.openModelPicker', title: 'GPT-5.3-Codex' }, group: 'navigation', order: 3 });
    menuService.addItem(MenuId.ChatInput, { command: { id: 'workbench.action.chat.configureTools', title: '', icon: Codicon.settingsGear }, group: 'navigation', order: 100 });
    menuService.addItem(MenuId.ChatExecute, { command: { id: 'workbench.action.chat.submit', title: 'Send', icon: Codicon.arrowUp }, group: 'navigation', order: 4 });
    menuService.addItem(MenuId.ChatInputSecondary, { command: { id: 'workbench.action.chat.openSessionTargetPicker', title: 'Local' }, group: 'navigation', order: 0 });
    menuService.addItem(MenuId.ChatInputSecondary, { command: { id: 'workbench.action.chat.openPermissionPicker', title: 'Default Approvals' }, group: 'navigation', order: 10 });
    const options = {
        renderFollowups: false,
        renderInputToolbarBelowInput: false,
        renderWorkingSet: !!editingSession,
        menus: { executeToolbar: MenuId.ChatExecute, telemetrySource: 'fixture' },
        widgetViewKindTag: 'view',
        inputEditorMinLines: 2,
    };
    const styles = {
        overlayBackground: 'var(--vscode-editor-background)',
        listForeground: 'var(--vscode-foreground)',
        listBackground: 'var(--vscode-editor-background)',
    };
    try {
        const inputPart = disposableStore.add(instantiationService.createInstance(ChatInputPart, ChatAgentLocation.Chat, options, styles, false));
        const mockWidget = new class extends mock() {
            constructor() {
                super(...arguments);
                this.onDidChangeViewModel = new Emitter().event;
                this.viewModel = undefined;
                this.contribs = [];
                this.location = ChatAgentLocation.Chat;
                this.viewContext = {};
            }
        }();
        inputPart.render(session, '', mockWidget);
        inputPart.layout(500);
        await new Promise(r => setTimeout(r, 100));
        inputPart.layout(500);
        inputPart.renderArtifactsWidget(URI.parse('chat-session:test-session'));
        await inputPart.renderChatTodoListWidget(URI.parse('chat-session:test-session'));
        await new Promise(r => setTimeout(r, 50));
        if (editingSession) {
            inputPart.renderChatEditingSessionState(editingSession);
            await new Promise(r => setTimeout(r, 50));
            inputPart.layout(500);
        }
    }
    catch (e) {
        const err = document.createElement('pre');
        err.style.cssText = 'color:red;font-size:11px;white-space:pre-wrap';
        err.textContent = `Render error: ${e instanceof Error ? e.message : String(e)}`;
        session.appendChild(err);
    }
}
const sampleArtifacts = [
    { label: 'Dev Server', uri: 'http://localhost:3000', type: 'devServer' },
    { label: 'Screenshot', uri: 'file:///tmp/screenshot.png', type: 'screenshot' },
    { label: 'Plan', uri: 'file:///tmp/plan.md', type: 'plan' },
];
function createMockEditingSession(files) {
    const entries = files.map(f => {
        const entry = new class extends mock() {
            constructor() {
                super(...arguments);
                this.entryId = f.uri;
                this.modifiedURI = URI.parse(f.uri);
                this.originalURI = URI.parse(f.uri);
                this.state = observableValue('state', 0 /* ModifiedFileEntryState.Modified */);
                this.linesAdded = observableValue('linesAdded', f.added);
                this.linesRemoved = observableValue('linesRemoved', f.removed);
                this.lastModifyingRequestId = 'request-1';
                this.changesCount = observableValue('changesCount', 1);
                this.isCurrentlyBeingModifiedBy = observableValue('isCurrentlyBeingModifiedBy', undefined);
                this.lastModifyingResponse = observableValue('lastModifyingResponse', undefined);
                this.rewriteRatio = observableValue('rewriteRatio', 0);
                this.waitsForLastEdits = observableValue('waitsForLastEdits', false);
                this.reviewMode = observableValue('reviewMode', false);
                this.autoAcceptController = observableValue('autoAcceptController', undefined);
            }
        }();
        return entry;
    });
    return new class extends mock() {
        constructor() {
            super(...arguments);
            this.isGlobalEditingSession = false;
            this.chatSessionResource = URI.parse('chat-session:test-session');
            this.onDidDispose = Event.None;
            this.state = observableValue('state', 2 /* ChatEditingSessionState.Idle */);
            this.entries = observableValue('entries', entries);
            this.requestDisablement = observableValue('requestDisablement', []);
        }
    }();
}
const sampleTodos = [
    { id: 1, title: 'Set up project structure', status: 'completed' },
    { id: 2, title: 'Implement auth service', status: 'in-progress' },
    { id: 3, title: 'Add unit tests', status: 'not-started' },
];
export default defineThemedFixtureGroup({ path: 'chat/input/' }, {
    Default: defineComponentFixture({ render: context => renderChatInput(context) }),
    WithArtifacts: defineComponentFixture({ render: context => renderChatInput(context, { artifacts: sampleArtifacts }) }),
    WithFileChanges: defineComponentFixture({
        render: context => renderChatInput(context, { editingSession: createMockEditingSession([{ uri: 'file:///workspace/src/fibon.ts', added: 21, removed: 1 }]) })
    }),
    WithTodos: defineComponentFixture({
        render: context => renderChatInput(context, { todos: sampleTodos })
    }),
    WithArtifactsAndFileChanges: defineComponentFixture({
        render: context => renderChatInput(context, { artifacts: sampleArtifacts, editingSession: createMockEditingSession([{ uri: 'file:///workspace/src/fibon.ts', added: 21, removed: 1 }]) })
    }),
    Full: defineComponentFixture({
        render: context => renderChatInput(context, {
            artifacts: sampleArtifacts,
            editingSession: createMockEditingSession([{ uri: 'file:///workspace/src/fibon.ts', added: 21, removed: 1 }]),
            todos: sampleTodos,
        })
    }),
});
//# sourceMappingURL=chatInput.fixture.js.map