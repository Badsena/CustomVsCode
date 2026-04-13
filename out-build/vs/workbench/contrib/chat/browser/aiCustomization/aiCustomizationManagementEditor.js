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
var AICustomizationManagementEditor_1;
import './media/aiCustomizationManagement.css';
import * as DOM from '../../../../../base/browser/dom.js';
import { RunOnceScheduler } from '../../../../../base/common/async.js';
import { CancellationToken } from '../../../../../base/common/cancellation.js';
import { VSBuffer } from '../../../../../base/common/buffer.js';
import { onUnexpectedError } from '../../../../../base/common/errors.js';
import { DisposableStore, toDisposable } from '../../../../../base/common/lifecycle.js';
import { Event } from '../../../../../base/common/event.js';
import { autorun } from '../../../../../base/common/observable.js';
import { Sizing, SplitView } from '../../../../../base/browser/ui/splitview/splitview.js';
import { localize } from '../../../../../nls.js';
import { generateUuid } from '../../../../../base/common/uuid.js';
import { IStorageService } from '../../../../../platform/storage/common/storage.js';
import { ITelemetryService } from '../../../../../platform/telemetry/common/telemetry.js';
import { IThemeService } from '../../../../../platform/theme/common/themeService.js';
import { EditorPane } from '../../../../browser/parts/editor/editorPane.js';
import { IInstantiationService } from '../../../../../platform/instantiation/common/instantiation.js';
import { IContextKeyService } from '../../../../../platform/contextkey/common/contextkey.js';
import { WorkbenchList } from '../../../../../platform/list/browser/listService.js';
import { ThemeIcon } from '../../../../../base/common/themables.js';
import { Codicon } from '../../../../../base/common/codicons.js';
import { IOpenerService } from '../../../../../platform/opener/common/opener.js';
import { basename, dirname, isEqual, isEqualOrParent } from '../../../../../base/common/resources.js';
import { URI } from '../../../../../base/common/uri.js';
import { registerColor } from '../../../../../platform/theme/common/colorRegistry.js';
import { PANEL_BORDER } from '../../../../common/theme.js';
import { AICustomizationListWidget } from './aiCustomizationListWidget.js';
import { McpListWidget } from './mcpListWidget.js';
import { PluginListWidget } from './pluginListWidget.js';
import { AI_CUSTOMIZATION_MANAGEMENT_EDITOR_ID, AI_CUSTOMIZATION_MANAGEMENT_SIDEBAR_WIDTH_KEY, AI_CUSTOMIZATION_MANAGEMENT_SELECTED_SECTION_KEY, AICustomizationManagementSection, BUILTIN_STORAGE, CONTEXT_AI_CUSTOMIZATION_MANAGEMENT_EDITOR, CONTEXT_AI_CUSTOMIZATION_MANAGEMENT_SECTION, SIDEBAR_DEFAULT_WIDTH, SIDEBAR_MIN_WIDTH, SIDEBAR_MAX_WIDTH, CONTENT_MIN_WIDTH, } from './aiCustomizationManagement.js';
import { agentIcon, instructionsIcon, promptIcon, skillIcon, hookIcon, pluginIcon } from './aiCustomizationIcons.js';
import { ChatModelsWidget } from '../chatManagement/chatModelsWidget.js';
import { PromptsType, Target } from '../../common/promptSyntax/promptTypes.js';
import { IPromptsService, PromptsStorage } from '../../common/promptSyntax/service/promptsService.js';
import { AGENT_MD_FILENAME } from '../../common/promptSyntax/config/promptFileLocations.js';
import { NEW_PROMPT_COMMAND_ID, NEW_INSTRUCTIONS_COMMAND_ID, NEW_AGENT_COMMAND_ID, NEW_SKILL_COMMAND_ID } from '../promptSyntax/newPromptFileActions.js';
import { showConfigureHooksQuickPick } from '../promptSyntax/hookActions.js';
import { resolveWorkspaceTargetDirectory, resolveUserTargetDirectory } from './customizationCreatorService.js';
import { ICommandService } from '../../../../../platform/commands/common/commands.js';
import { IAICustomizationWorkspaceService } from '../../common/aiCustomizationWorkspaceService.js';
import { CodeEditorWidget } from '../../../../../editor/browser/widget/codeEditor/codeEditorWidget.js';
import { createTextBufferFactoryFromSnapshot } from '../../../../../editor/common/model/textModel.js';
import { IModelService } from '../../../../../editor/common/services/model.js';
import { ITextModelService } from '../../../../../editor/common/services/resolverService.js';
import { IConfigurationService } from '../../../../../platform/configuration/common/configuration.js';
import { getSimpleEditorOptions } from '../../../codeEditor/browser/simpleEditorOptions.js';
import { IWorkingCopyService } from '../../../../services/workingCopy/common/workingCopyService.js';
import { IFileDialogService } from '../../../../../platform/dialogs/common/dialogs.js';
import { IHoverService } from '../../../../../platform/hover/browser/hover.js';
import { IFileService } from '../../../../../platform/files/common/files.js';
import { INotificationService } from '../../../../../platform/notification/common/notification.js';
import { IQuickInputService } from '../../../../../platform/quickinput/common/quickInput.js';
import { McpServerEditorInput } from '../../../mcp/browser/mcpServerEditorInput.js';
import { McpServerEditor } from '../../../mcp/browser/mcpServerEditor.js';
import { getDefaultHoverDelegate } from '../../../../../base/browser/ui/hover/hoverDelegateFactory.js';
import { AgentPluginEditor } from '../agentPluginEditor/agentPluginEditor.js';
import { AgentPluginEditorInput } from '../agentPluginEditor/agentPluginEditorInput.js';
import { ICustomizationHarnessService, CustomizationHarness, matchesWorkspaceSubpath } from '../../common/customizationHarnessService.js';
import { ChatConfiguration } from '../../common/constants.js';
const $ = DOM.$;
//#endregion
export const aiCustomizationManagementSashBorder = registerColor('aiCustomizationManagement.sashBorder', PANEL_BORDER, localize(6449, null));
class SectionItemDelegate {
    getHeight() {
        return 26;
    }
    getTemplateId() {
        return 'sectionItem';
    }
}
class SectionItemRenderer {
    constructor() {
        this.templateId = 'sectionItem';
    }
    renderTemplate(container) {
        container.classList.add('section-list-item');
        const icon = DOM.append(container, $('.section-icon'));
        const label = DOM.append(container, $('.section-label'));
        const count = DOM.append(container, $('.section-count'));
        return { container, icon, label, count };
    }
    renderElement(element, index, templateData) {
        templateData.icon.className = 'section-icon';
        templateData.icon.classList.add(...ThemeIcon.asClassNameArray(element.icon));
        templateData.label.textContent = element.label;
        if (element.count > 0) {
            templateData.count.textContent = String(element.count);
            templateData.count.style.display = '';
        }
        else {
            templateData.count.textContent = '';
            templateData.count.style.display = 'none';
        }
    }
    disposeTemplate() { }
}
//#endregion
/**
 * Editor pane for the AI Customizations Management Editor.
 * Provides a global view of all AI customizations with a sidebar for navigation
 * and a content area showing a searchable list of items.
 */
let AICustomizationManagementEditor = class AICustomizationManagementEditor extends EditorPane {
    static { AICustomizationManagementEditor_1 = this; }
    static { this.ID = AI_CUSTOMIZATION_MANAGEMENT_EDITOR_ID; }
    constructor(group, telemetryService, themeService, storageService, instantiationService, contextKeyService, openerService, commandService, workspaceService, promptsService, textModelService, configurationService, workingCopyService, fileDialogService, hoverService, modelService, quickInputService, fileService, notificationService, harnessService) {
        super(AICustomizationManagementEditor_1.ID, group, telemetryService, themeService, storageService);
        this.storageService = storageService;
        this.instantiationService = instantiationService;
        this.openerService = openerService;
        this.commandService = commandService;
        this.workspaceService = workspaceService;
        this.promptsService = promptsService;
        this.textModelService = textModelService;
        this.configurationService = configurationService;
        this.workingCopyService = workingCopyService;
        this.fileDialogService = fileDialogService;
        this.hoverService = hoverService;
        this.modelService = modelService;
        this.quickInputService = quickInputService;
        this.fileService = fileService;
        this.notificationService = notificationService;
        this.harnessService = harnessService;
        this.editorActionButtonInProgress = false;
        this.editorModelChangeDisposables = this._register(new DisposableStore());
        this.builtinEditingSessions = new Map();
        this.viewMode = 'list';
        this.mcpDetailDisposables = this._register(new DisposableStore());
        this.pluginDetailDisposables = this._register(new DisposableStore());
        this.sections = [];
        this.allSections = [];
        this.selectedSection = AICustomizationManagementSection.Agents;
        this.editorDisposables = this._register(new DisposableStore());
        this.promptsSectionCountScheduler = this._register(new RunOnceScheduler(() => this._doRefreshAllPromptsSectionCounts(), 100));
        this._editorContentChanged = false;
        this.inEditorContextKey = CONTEXT_AI_CUSTOMIZATION_MANAGEMENT_EDITOR.bindTo(contextKeyService);
        this.sectionContextKey = CONTEXT_AI_CUSTOMIZATION_MANAGEMENT_SECTION.bindTo(contextKeyService);
        // Track workspace changes for embedded editor
        this._register(autorun(reader => {
            this.workspaceService.activeProjectRoot.read(reader);
            if (this.viewMode === 'editor') {
                this.currentEditingProjectRoot = this.workspaceService.getActiveProjectRoot();
            }
        }));
        this._register(toDisposable(() => {
            this.currentModelRef?.dispose();
            this.currentModelRef = undefined;
        }));
        this._register(toDisposable(() => this.disposeBuiltinEditingSessions()));
        // Build sections from the workspace service configuration
        const sectionInfo = {
            [AICustomizationManagementSection.Agents]: { label: localize(6450, null), icon: agentIcon },
            [AICustomizationManagementSection.Skills]: { label: localize(6451, null), icon: skillIcon },
            [AICustomizationManagementSection.Instructions]: { label: localize(6452, null), icon: instructionsIcon },
            [AICustomizationManagementSection.Prompts]: { label: localize(6453, null), icon: promptIcon },
            [AICustomizationManagementSection.Hooks]: { label: localize(6454, null), icon: hookIcon },
            [AICustomizationManagementSection.McpServers]: { label: localize(6455, null), icon: Codicon.server },
            [AICustomizationManagementSection.Plugins]: { label: localize(6456, null), icon: pluginIcon },
            [AICustomizationManagementSection.Models]: { label: localize(6457, null), icon: Codicon.vm },
        };
        for (const id of this.workspaceService.managementSections) {
            const info = sectionInfo[id];
            if (info) {
                this.allSections.push({ id, ...info, count: 0 });
            }
        }
        this.rebuildVisibleSections();
        // Restore selected section from storage, falling back to first available
        const savedSection = this.storageService.get(AI_CUSTOMIZATION_MANAGEMENT_SELECTED_SECTION_KEY, 0 /* StorageScope.PROFILE */);
        if (savedSection && this.sections.some(s => s.id === savedSection)) {
            this.selectedSection = savedSection;
        }
        else if (this.sections.length > 0) {
            this.selectedSection = this.sections[0].id;
        }
    }
    createEditor(parent) {
        this.editorDisposables.clear();
        this.container = DOM.append(parent, $('.ai-customization-management-editor'));
        this.createSplitView();
        this.updateStyles();
    }
    createSplitView() {
        this.splitViewContainer = DOM.append(this.container, $('.management-split-view'));
        this.sidebarContainer = $('.management-sidebar');
        this.contentContainer = $('.management-content');
        this.createSidebar();
        this.createContent();
        this.splitView = this.editorDisposables.add(new SplitView(this.splitViewContainer, {
            orientation: 1 /* Orientation.HORIZONTAL */,
            proportionalLayout: true,
        }));
        const savedWidth = this.storageService.getNumber(AI_CUSTOMIZATION_MANAGEMENT_SIDEBAR_WIDTH_KEY, 0 /* StorageScope.PROFILE */, SIDEBAR_DEFAULT_WIDTH);
        // Sidebar view
        this.splitView.addView({
            onDidChange: Event.None,
            element: this.sidebarContainer,
            minimumSize: SIDEBAR_MIN_WIDTH,
            maximumSize: SIDEBAR_MAX_WIDTH,
            layout: (width, _, height) => {
                this.sidebarContainer.style.width = `${width}px`;
                if (height !== undefined) {
                    const footerHeight = this.folderPickerContainer?.offsetHeight ?? 0;
                    const listHeight = height - 8 - footerHeight;
                    this.sectionsList.layout(listHeight, width);
                }
            },
        }, savedWidth, undefined, true);
        // Content view
        this.splitView.addView({
            onDidChange: Event.None,
            element: this.contentContainer,
            minimumSize: CONTENT_MIN_WIDTH,
            maximumSize: Number.POSITIVE_INFINITY,
            layout: (width, _, height) => {
                this.contentContainer.style.width = `${width}px`;
                if (height !== undefined) {
                    this.listWidget.layout(height - 16, width - 24);
                    this.mcpListWidget?.layout(height - 16, width - 24);
                    this.pluginListWidget?.layout(height - 16, width - 24);
                    const modelsFooterHeight = this.modelsFooterElement?.offsetHeight || 80;
                    this.modelsWidget?.layout(height - 16 - modelsFooterHeight, width);
                    if (this.viewMode === 'editor' && this.embeddedEditor) {
                        const editorHeaderHeight = 50;
                        const padding = 24;
                        this.embeddedEditor.layout({ width: Math.max(0, width - padding), height: Math.max(0, height - editorHeaderHeight - padding) });
                    }
                    if (this.viewMode === 'mcpDetail' && this.embeddedMcpEditor) {
                        const backHeaderHeight = 40;
                        this.embeddedMcpEditor.layout(new DOM.Dimension(width, Math.max(0, height - backHeaderHeight)));
                    }
                    if (this.viewMode === 'pluginDetail' && this.embeddedPluginEditor) {
                        const backHeaderHeight = 40;
                        this.embeddedPluginEditor.layout(new DOM.Dimension(width, Math.max(0, height - backHeaderHeight)));
                    }
                }
            },
        }, Sizing.Distribute, undefined, true);
        // Persist sidebar width
        this.editorDisposables.add(this.splitView.onDidSashChange(() => {
            const width = this.splitView.getViewSize(0);
            this.storageService.store(AI_CUSTOMIZATION_MANAGEMENT_SIDEBAR_WIDTH_KEY, width, 0 /* StorageScope.PROFILE */, 0 /* StorageTarget.USER */);
        }));
        // Reset on double-click
        this.editorDisposables.add(this.splitView.onDidSashReset(() => {
            const totalWidth = this.splitView.getViewSize(0) + this.splitView.getViewSize(1);
            this.splitView.resizeView(0, SIDEBAR_DEFAULT_WIDTH);
            this.splitView.resizeView(1, totalWidth - SIDEBAR_DEFAULT_WIDTH);
        }));
    }
    /**
     * Whether the harness selector UI is enabled.
     * When disabled, the editor behaves as if "Local" is always selected.
     */
    get isHarnessSelectorEnabled() {
        return this.configurationService.getValue(ChatConfiguration.ChatCustomizationHarnessSelectorEnabled) !== false;
    }
    /**
     * Rebuilds the visible sections list based on the active harness's
     * `hiddenSections`. If the current selection falls into a hidden
     * section, the first visible section is selected instead.
     */
    rebuildVisibleSections() {
        let hidden;
        if (this.isHarnessSelectorEnabled) {
            const activeId = this.harnessService.activeHarness.get();
            const descriptor = this.harnessService.availableHarnesses.get().find(h => h.id === activeId);
            hidden = new Set(descriptor?.hiddenSections ?? []);
        }
        else {
            hidden = new Set(); // Local harness has no hidden sections
        }
        this.sections.length = 0;
        for (const s of this.allSections) {
            if (!hidden.has(s.id)) {
                this.sections.push(s);
            }
        }
        // Update the list widget if it exists
        if (this.sectionsList) {
            this.sectionsList.splice(0, this.sectionsList.length, this.sections);
        }
        // If the current selection is hidden, fall back to first visible
        if (!this.sections.some(s => s.id === this.selectedSection) && this.sections.length > 0) {
            this.selectSection(this.sections[0].id);
        }
        else {
            this.ensureSectionsListReflectsActiveSection();
        }
    }
    createSidebar() {
        const sidebarContent = DOM.append(this.sidebarContainer, $('.sidebar-content'));
        // Harness dropdown (shown when multiple harnesses available)
        this.createHarnessDropdown(sidebarContent);
        // Main sections list container (takes remaining space)
        const sectionsListContainer = DOM.append(sidebarContent, $('.sidebar-sections-list'));
        this.sectionsList = this.editorDisposables.add(this.instantiationService.createInstance((WorkbenchList), 'AICustomizationManagementSections', sectionsListContainer, new SectionItemDelegate(), [new SectionItemRenderer()], {
            multipleSelectionSupport: false,
            setRowLineHeight: false,
            horizontalScrolling: false,
            accessibilityProvider: {
                getAriaLabel: (item) => item.label,
                getWidgetAriaLabel: () => localize(6458, null),
            },
            openOnSingleClick: true,
            identityProvider: {
                getId: (item) => item.id,
            },
        }));
        this.sectionsList.splice(0, this.sectionsList.length, this.sections);
        this.ensureSectionsListReflectsActiveSection();
        this.editorDisposables.add(this.sectionsList.onDidChangeSelection(e => {
            if (e.elements.length === 0) {
                this.ensureSectionsListReflectsActiveSection();
                return;
            }
            this.selectSection(e.elements[0].id);
        }));
        // React to harness changes — rebuild visible sections and refresh counts.
        // Also track availableHarnesses to handle agent registration/unregistration.
        this.editorDisposables.add(autorun(reader => {
            const available = this.harnessService.availableHarnesses.read(reader);
            const activeId = this.harnessService.activeHarness.read(reader);
            // If the active harness is no longer available, fall back to the default
            if (!available.some(h => h.id === activeId) && available.length > 0) {
                this.harnessService.setActiveHarness(available[0].id);
                return; // setActiveHarness will trigger another autorun cycle
            }
            this.rebuildVisibleSections();
            this.updateHarnessDropdown();
            this.refreshAllPromptsSectionCounts();
        }));
        // When the harness selector setting is off, lock to Local harness.
        // In Sessions (single CLI harness) the dropdown is already hidden and
        // setActiveHarness(VSCode) is a safe no-op since the CLI harness
        // remains active — filtering stays correct for that window.
        if (!this.isHarnessSelectorEnabled) {
            this.harnessService.setActiveHarness(CustomizationHarness.VSCode);
        }
        this.editorDisposables.add(this.configurationService.onDidChangeConfiguration(e => {
            if (e.affectsConfiguration(ChatConfiguration.ChatCustomizationHarnessSelectorEnabled)) {
                if (!this.isHarnessSelectorEnabled) {
                    this.harnessService.setActiveHarness(CustomizationHarness.VSCode);
                }
            }
        }));
        // Folder picker (sessions window only)
        if (this.workspaceService.isSessionsWindow) {
            this.createFolderPicker(sidebarContent);
        }
    }
    createHarnessDropdown(sidebarContent) {
        if (!this.isHarnessSelectorEnabled) {
            return;
        }
        const container = this.harnessDropdownContainer = DOM.append(sidebarContent, $('.sidebar-harness-dropdown'));
        this.harnessDropdownButton = DOM.append(container, $('button.harness-dropdown-button'));
        this.harnessDropdownButton.setAttribute('aria-label', localize(6459, null));
        this.harnessDropdownButton.setAttribute('aria-haspopup', 'listbox');
        this.harnessDropdownIcon = DOM.append(this.harnessDropdownButton, $('span.harness-dropdown-icon'));
        this.harnessDropdownLabel = DOM.append(this.harnessDropdownButton, $('span.harness-dropdown-label'));
        DOM.append(this.harnessDropdownButton, $('span.harness-dropdown-chevron.codicon.codicon-chevron-down'));
        this.updateHarnessDropdown();
        this.editorDisposables.add(DOM.addDisposableListener(this.harnessDropdownButton, 'click', () => {
            this.showHarnessPicker();
        }));
    }
    updateHarnessDropdown() {
        if (!this.harnessDropdownContainer || !this.harnessDropdownIcon || !this.harnessDropdownLabel) {
            return;
        }
        const harnesses = this.harnessService.availableHarnesses.get();
        // Hide dropdown when only one harness is available
        this.harnessDropdownContainer.style.display = harnesses.length <= 1 ? 'none' : '';
        const activeId = this.harnessService.activeHarness.get();
        const descriptor = harnesses.find(h => h.id === activeId);
        if (descriptor) {
            this.harnessDropdownIcon.className = 'harness-dropdown-icon';
            this.harnessDropdownIcon.classList.add(...ThemeIcon.asClassNameArray(descriptor.icon));
            this.harnessDropdownLabel.textContent = descriptor.label;
        }
    }
    showHarnessPicker() {
        const harnesses = this.harnessService.availableHarnesses.get();
        const activeId = this.harnessService.activeHarness.get();
        const items = harnesses.map(h => ({
            label: h.label,
            iconClass: ThemeIcon.asClassName(h.icon),
            id: h.id,
            picked: h.id === activeId,
        }));
        const picker = this.quickInputService.createQuickPick();
        picker.items = items;
        picker.placeholder = localize(6460, null);
        picker.canSelectMany = false;
        picker.activeItems = items.filter(i => i.picked);
        picker.onDidAccept(() => {
            const selected = picker.activeItems[0];
            if (selected) {
                this.harnessService.setActiveHarness(selected.id);
            }
            picker.dispose();
        });
        picker.onDidHide(() => picker.dispose());
        picker.show();
    }
    createFolderPicker(sidebarContent) {
        const footer = this.folderPickerContainer = DOM.append(sidebarContent, $('.sidebar-folder-picker'));
        const button = DOM.append(footer, $('button.folder-picker-button'));
        button.setAttribute('aria-label', localize(6461, null));
        const folderIcon = DOM.append(button, $(`.codicon.codicon-${Codicon.folder.id}`));
        folderIcon.classList.add('folder-picker-icon');
        this.folderPickerLabel = DOM.append(button, $('span.folder-picker-label'));
        this.folderPickerClearButton = DOM.append(footer, $('button.folder-picker-clear'));
        this.folderPickerClearButton.setAttribute('aria-label', localize(6462, null));
        DOM.append(this.folderPickerClearButton, $(`.codicon.codicon-${Codicon.close.id}`));
        // Clicking the main button opens the folder dialog
        this.editorDisposables.add(DOM.addDisposableListener(button, 'click', () => {
            this.browseForFolder();
        }));
        // Clear button resets to session default
        this.editorDisposables.add(DOM.addDisposableListener(this.folderPickerClearButton, 'click', () => {
            this.workspaceService.clearOverrideProjectRoot();
        }));
        // Hover showing full path
        this.editorDisposables.add(this.hoverService.setupManagedHover(getDefaultHoverDelegate('element'), button, () => {
            const root = this.workspaceService.getActiveProjectRoot();
            return root?.fsPath ?? '';
        }));
        // Keep label and clear button in sync with the active root
        this.editorDisposables.add(autorun(reader => {
            const root = this.workspaceService.activeProjectRoot.read(reader);
            const hasOverride = this.workspaceService.hasOverrideProjectRoot.read(reader);
            this.updateFolderPickerLabel(root, hasOverride);
        }));
    }
    updateFolderPickerLabel(root, hasOverride) {
        if (this.folderPickerLabel) {
            this.folderPickerLabel.textContent = root ? basename(root) : localize(6463, null);
        }
        if (this.folderPickerClearButton) {
            this.folderPickerClearButton.style.display = hasOverride ? '' : 'none';
        }
    }
    async browseForFolder() {
        const result = await this.fileDialogService.showOpenDialog({
            canSelectFolders: true,
            canSelectFiles: false,
            canSelectMany: false,
            title: localize(6464, null),
            defaultUri: this.workspaceService.getActiveProjectRoot(),
        });
        if (result?.[0]) {
            this.workspaceService.setOverrideProjectRoot(result[0]);
        }
    }
    createContent() {
        const contentInner = DOM.append(this.contentContainer, $('.content-inner'));
        // Container for prompts-based content (Agents, Skills, Instructions, Prompts)
        this.promptsContentContainer = DOM.append(contentInner, $('.prompts-content-container'));
        this.listWidget = this.editorDisposables.add(this.instantiationService.createInstance(AICustomizationListWidget));
        this.promptsContentContainer.appendChild(this.listWidget.element);
        // Handle item selection
        this.editorDisposables.add(this.listWidget.onDidSelectItem(item => {
            this.telemetryService.publicLog2('chatCustomizationEditor.itemSelected', {
                section: this.selectedSection,
                promptType: item.promptType,
                storage: item.storage,
            });
            const isWorkspaceFile = item.storage === PromptsStorage.local;
            const isReadOnly = item.storage === PromptsStorage.extension || item.storage === PromptsStorage.plugin || item.storage === BUILTIN_STORAGE;
            this.showEmbeddedEditor(item.uri, item.name, item.promptType, item.storage, isWorkspaceFile, isReadOnly);
        }));
        // Handle create actions - AI-guided creation
        this.editorDisposables.add(this.listWidget.onDidRequestCreate(promptType => {
            this.createNewItemWithAI(promptType);
        }));
        // Handle manual create actions - open editor directly
        this.editorDisposables.add(this.listWidget.onDidRequestCreateManual(({ type, target, rootFileName }) => {
            this.createNewItemManual(type, target, rootFileName);
        }));
        // Container for Models content (only in sessions)
        const hasSections = new Set(this.workspaceService.managementSections);
        if (hasSections.has(AICustomizationManagementSection.Models)) {
            this.modelsContentContainer = DOM.append(contentInner, $('.models-content-container'));
            this.modelsWidget = this.editorDisposables.add(this.instantiationService.createInstance(ChatModelsWidget));
            this.modelsContentContainer.appendChild(this.modelsWidget.element);
            this.modelsFooterElement = DOM.append(this.modelsContentContainer, $('.section-footer'));
            const modelsDescription = DOM.append(this.modelsFooterElement, $('p.section-footer-description'));
            modelsDescription.textContent = localize(6465, null);
            const modelsLink = DOM.append(this.modelsFooterElement, $('a.section-footer-link'));
            modelsLink.textContent = localize(6466, null);
            modelsLink.href = 'https://code.visualstudio.com/docs/copilot/customization/language-models';
            this.editorDisposables.add(DOM.addDisposableListener(modelsLink, 'click', (e) => {
                e.preventDefault();
                this.openerService.open(URI.parse(modelsLink.href));
            }));
        }
        // Container for MCP content
        if (hasSections.has(AICustomizationManagementSection.McpServers)) {
            this.mcpContentContainer = DOM.append(contentInner, $('.mcp-content-container'));
            this.mcpListWidget = this.editorDisposables.add(this.instantiationService.createInstance(McpListWidget));
            this.mcpContentContainer.appendChild(this.mcpListWidget.element);
            // Embedded MCP server detail view
            this.mcpDetailContainer = DOM.append(contentInner, $('.mcp-detail-container'));
            this.createEmbeddedMcpDetail();
            this.editorDisposables.add(this.mcpListWidget.onDidSelectServer(server => {
                this.showEmbeddedMcpDetail(server);
            }));
        }
        // Container for Plugins content
        if (hasSections.has(AICustomizationManagementSection.Plugins)) {
            this.pluginContentContainer = DOM.append(contentInner, $('.plugin-content-container'));
            this.pluginListWidget = this.editorDisposables.add(this.instantiationService.createInstance(PluginListWidget));
            this.pluginContentContainer.appendChild(this.pluginListWidget.element);
            // Embedded plugin detail view
            this.pluginDetailContainer = DOM.append(contentInner, $('.plugin-detail-container'));
            this.createEmbeddedPluginDetail();
            this.editorDisposables.add(this.pluginListWidget.onDidSelectPlugin(item => {
                this.showEmbeddedPluginDetail(item);
            }));
        }
        // Embedded editor container
        this.editorContentContainer = DOM.append(contentInner, $('.editor-content-container'));
        this.createEmbeddedEditor();
        // Set initial visibility based on selected section
        this.updateContentVisibility();
        // Wire up section count updates — active prompts section gets its count
        // from the list widget; all prompts sections are also refreshed from
        // the prompts service on every change event for consistency.
        this.editorDisposables.add(this.listWidget.onDidChangeItemCount(count => {
            if (this.isPromptsSection(this.selectedSection)) {
                this.updateSectionCount(this.selectedSection, count);
            }
        }));
        if (this.mcpListWidget) {
            this.editorDisposables.add(this.mcpListWidget.onDidChangeItemCount(count => {
                this.updateSectionCount(AICustomizationManagementSection.McpServers, count);
            }));
            this.mcpListWidget.fireItemCount();
        }
        if (this.pluginListWidget) {
            this.editorDisposables.add(this.pluginListWidget.onDidChangeItemCount(count => {
                this.updateSectionCount(AICustomizationManagementSection.Plugins, count);
            }));
            this.pluginListWidget.fireItemCount();
        }
        if (this.modelsWidget) {
            this.editorDisposables.add(this.modelsWidget.onDidChangeItemCount(count => {
                this.updateSectionCount(AICustomizationManagementSection.Models, count);
            }));
            this.modelsWidget.fireItemCount();
        }
        // Any prompts data change → refresh ALL prompts section counts (debounced)
        this.editorDisposables.add(this.promptsService.onDidChangeCustomAgents(() => this.refreshAllPromptsSectionCounts()));
        this.editorDisposables.add(this.promptsService.onDidChangeSkills(() => this.refreshAllPromptsSectionCounts()));
        this.editorDisposables.add(this.promptsService.onDidChangeInstructions(() => this.refreshAllPromptsSectionCounts()));
        this.editorDisposables.add(this.promptsService.onDidChangeSlashCommands(() => this.refreshAllPromptsSectionCounts()));
        // Load initial counts for all sections
        this.refreshAllPromptsSectionCounts();
        // Load items for the initial section
        if (this.isPromptsSection(this.selectedSection)) {
            void this.listWidget.setSection(this.selectedSection);
        }
    }
    isPromptsSection(section) {
        return section === AICustomizationManagementSection.Agents ||
            section === AICustomizationManagementSection.Skills ||
            section === AICustomizationManagementSection.Instructions ||
            section === AICustomizationManagementSection.Prompts ||
            section === AICustomizationManagementSection.Hooks;
    }
    //#region Section Counts
    /**
     * Updates the count for a specific section and re-renders the sidebar.
     */
    updateSectionCount(sectionId, count) {
        const section = this.sections.find(s => s.id === sectionId);
        if (!section || section.count === count) {
            return;
        }
        section.count = count;
        // Re-splice the sections list to trigger re-render
        this.sectionsList.splice(0, this.sectionsList.length, this.sections);
        this.ensureSectionsListReflectsActiveSection();
    }
    /**
     * Schedules a debounced refresh of all prompts-based section counts.
     */
    refreshAllPromptsSectionCounts() {
        this.promptsSectionCountScheduler.schedule();
    }
    /**
     * Performs the actual refresh of all prompts-based section counts.
     * Uses the list widget's shared item-loading logic so sidebar counts
     * match the per-group counts shown inside each section.
     */
    _doRefreshAllPromptsSectionCounts() {
        for (const section of this.sections) {
            if (this.isPromptsSection(section.id)) {
                this.listWidget.computeItemCountForSection(section.id).then(count => {
                    this.updateSectionCount(section.id, count);
                }, onUnexpectedError);
            }
        }
    }
    //#endregion
    selectSection(section) {
        if (this.selectedSection === section) {
            this.ensureSectionsListReflectsActiveSection(section);
            return;
        }
        this.telemetryService.publicLog2('chatCustomizationEditor.sectionChanged', {
            section,
        });
        if (this.viewMode === 'editor') {
            this.goBackToList();
        }
        if (this.viewMode === 'mcpDetail') {
            this.goBackFromMcpDetail();
        }
        if (this.viewMode === 'pluginDetail') {
            this.goBackFromPluginDetail();
        }
        this.selectedSection = section;
        this.sectionContextKey.set(section);
        // Persist selection
        this.storageService.store(AI_CUSTOMIZATION_MANAGEMENT_SELECTED_SECTION_KEY, section, 0 /* StorageScope.PROFILE */, 0 /* StorageTarget.USER */);
        // Update content visibility
        this.updateContentVisibility();
        // Load items for the new section (only for prompts-based sections)
        if (this.isPromptsSection(section)) {
            void this.listWidget.setSection(section);
        }
        this.ensureSectionsListReflectsActiveSection(section);
    }
    ensureSectionsListReflectsActiveSection(section = this.selectedSection) {
        if (!this.sectionsList) {
            return;
        }
        const index = this.sections.findIndex(s => s.id === section);
        if (index < 0) {
            return;
        }
        const selection = this.sectionsList.getSelection();
        if (selection.length !== 1 || selection[0] !== index) {
            this.sectionsList.setSelection([index]);
        }
        const focus = this.sectionsList.getFocus();
        if (focus.length !== 1 || focus[0] !== index) {
            this.sectionsList.setFocus([index]);
        }
    }
    updateContentVisibility() {
        const isEditorMode = this.viewMode === 'editor';
        const isMcpDetailMode = this.viewMode === 'mcpDetail';
        const isPluginDetailMode = this.viewMode === 'pluginDetail';
        const isDetailMode = isMcpDetailMode || isPluginDetailMode;
        const isPromptsSection = this.isPromptsSection(this.selectedSection);
        const isModelsSection = this.selectedSection === AICustomizationManagementSection.Models;
        const isMcpSection = this.selectedSection === AICustomizationManagementSection.McpServers;
        const isPluginsSection = this.selectedSection === AICustomizationManagementSection.Plugins;
        if (this.promptsContentContainer) {
            this.promptsContentContainer.style.display = !isEditorMode && !isDetailMode && isPromptsSection ? '' : 'none';
        }
        if (this.modelsContentContainer) {
            this.modelsContentContainer.style.display = !isEditorMode && !isDetailMode && isModelsSection ? '' : 'none';
        }
        if (this.mcpContentContainer) {
            this.mcpContentContainer.style.display = !isEditorMode && !isDetailMode && isMcpSection ? '' : 'none';
        }
        if (this.mcpDetailContainer) {
            this.mcpDetailContainer.style.display = isMcpDetailMode ? '' : 'none';
        }
        if (this.pluginContentContainer) {
            this.pluginContentContainer.style.display = !isEditorMode && !isDetailMode && isPluginsSection ? '' : 'none';
        }
        if (this.pluginDetailContainer) {
            this.pluginDetailContainer.style.display = isPluginDetailMode ? '' : 'none';
        }
        if (this.editorContentContainer) {
            this.editorContentContainer.style.display = isEditorMode ? '' : 'none';
        }
        // Render and layout models widget when switching to it
        if (isModelsSection && this.modelsWidget) {
            this.modelsWidget.render();
            if (this.dimension) {
                this.layout(this.dimension);
            }
        }
    }
    /**
     * Creates a new customization using the AI-guided flow.
     */
    async createNewItemWithAI(type) {
        this.telemetryService.publicLog2('chatCustomizationEditor.createItem', {
            section: this.selectedSection,
            promptType: type,
            creationMode: 'ai',
            target: 'workspace',
        });
        if (this.input) {
            this.group.closeEditor(this.input);
        }
        await this.workspaceService.generateCustomization(type);
    }
    /**
     * Creates a new prompt file and opens it in the embedded editor.
     */
    async createNewItemManual(type, target, rootFileName) {
        this.telemetryService.publicLog2('chatCustomizationEditor.createItem', {
            section: this.selectedSection,
            promptType: type,
            creationMode: 'manual',
            target: target === 'workspace-root' ? 'workspace' : target,
        });
        // Handle workspace-root files (e.g. AGENTS.md or CLAUDE.md at project root).
        // rootFileName is passed from rootFileShortcuts; falls back to
        // the section override's rootFile, then AGENTS.md as the default.
        if (target === 'workspace-root') {
            const projectRoot = this.workspaceService.getActiveProjectRoot();
            if (!projectRoot) {
                return;
            }
            const override = this.harnessService.getActiveDescriptor().sectionOverrides?.get(this.selectedSection);
            const fileName = rootFileName ?? override?.rootFile ?? AGENT_MD_FILENAME;
            const fileUri = URI.joinPath(projectRoot, fileName);
            if (await this.fileService.exists(fileUri)) {
                // File already exists — just open it
                await this.showEmbeddedEditor(fileUri, fileName, PromptsType.instructions, PromptsStorage.local, true);
            }
            else {
                await this.fileService.createFile(fileUri);
                await this.showEmbeddedEditor(fileUri, fileName, PromptsType.instructions, PromptsStorage.local, true);
            }
            void this.listWidget.refresh();
            return;
        }
        if (type === PromptsType.hook) {
            if (this.workspaceService.isSessionsWindow) {
                // Sessions: show hooks filtered to Copilot CLI (GitHub Copilot) hook types
                await this.instantiationService.invokeFunction(showConfigureHooksQuickPick, {
                    openEditor: async (resource) => {
                        await this.showEmbeddedEditor(resource, basename(resource), PromptsType.hook, PromptsStorage.local, true);
                        return;
                    },
                    target: Target.GitHubCopilot,
                });
            }
            else {
                // Core: use the default core behaviour
                await this.instantiationService.invokeFunction(showConfigureHooksQuickPick, {
                    openEditor: async (resource) => {
                        await this.showEmbeddedEditor(resource, basename(resource), PromptsType.hook, PromptsStorage.local, true);
                        return;
                    }
                });
            }
            return;
        }
        const targetDir = await this.resolveTargetDirectoryWithPicker(type, target);
        if (targetDir === null) {
            return; // User cancelled the picker
        }
        // targetDir may be undefined when no matching folder exists for the
        // requested storage type (e.g. skills have no user-storage folder).
        // Pass it through — the command handles undefined by showing its own
        // folder picker via askForPromptSourceFolder.
        // When the active harness overrides the file extension (e.g. Claude
        // rules use .md instead of .instructions.md), pass it through so the
        // name picker and file creation use the correct extension.
        const override = this.harnessService.getActiveDescriptor().sectionOverrides?.get(this.selectedSection);
        const options = {
            targetFolder: targetDir,
            targetStorage: target === 'user' ? PromptsStorage.user : PromptsStorage.local,
            fileExtension: override?.fileExtension,
            openFile: async (uri) => {
                const isWorkspace = target === 'workspace';
                await this.showEmbeddedEditor(uri, basename(uri), type, target === 'user' ? PromptsStorage.user : PromptsStorage.local, isWorkspace);
                return this.embeddedEditor;
            },
        };
        let commandId;
        switch (type) {
            case PromptsType.prompt:
                commandId = NEW_PROMPT_COMMAND_ID;
                break;
            case PromptsType.instructions:
                commandId = NEW_INSTRUCTIONS_COMMAND_ID;
                break;
            case PromptsType.agent:
                commandId = NEW_AGENT_COMMAND_ID;
                break;
            case PromptsType.skill:
                commandId = NEW_SKILL_COMMAND_ID;
                break;
            default: return;
        }
        await this.commandService.executeCommand(commandId, options);
        void this.listWidget.refresh();
    }
    /**
     * Resolves the target directory for creating a new customization file.
     * If multiple source folders exist for the given storage type, shows a
     * picker to let the user choose. Otherwise, returns the single match.
     *
     * @returns the resolved URI, `undefined` when no folder is available,
     *          or `null` when the user cancelled the picker.
     */
    async resolveTargetDirectoryWithPicker(type, target) {
        const allFolders = await this.promptsService.getSourceFolders(type);
        const projectRoot = this.workspaceService.getActiveProjectRoot();
        const descriptor = this.harnessService.getActiveDescriptor();
        const subpaths = descriptor.workspaceSubpaths;
        // Partition folders by whether they're under the active project root.
        // The storage tags from getSourceFolders() are unreliable (tilde-expanded
        // user paths like ~/.copilot/skills get tagged PromptsStorage.local),
        // so we use the project root as the authoritative boundary.
        let matchingFolders;
        if (target === 'workspace') {
            matchingFolders = projectRoot
                ? allFolders.filter(f => {
                    if (!isEqualOrParent(f.uri, projectRoot)) {
                        return false;
                    }
                    // When the active harness specifies workspaceSubpaths, only offer
                    // directories whose path includes one of those sub-paths.
                    if (subpaths) {
                        return matchesWorkspaceSubpath(f.uri.path, subpaths);
                    }
                    return true;
                })
                : [];
        }
        else {
            matchingFolders = projectRoot
                ? allFolders.filter(f => !isEqualOrParent(f.uri, projectRoot))
                : allFolders;
            // When the active harness restricts user roots, only offer
            // directories under the harness-accessible user roots
            // (e.g. Claude → ~/.claude only, not ~/.copilot or profile paths).
            const filter = this.harnessService.getStorageSourceFilter(type);
            if (filter.includedUserFileRoots) {
                const roots = filter.includedUserFileRoots;
                matchingFolders = matchingFolders.filter(f => roots.some(root => isEqualOrParent(f.uri, root)));
            }
        }
        // Deduplicate by URI (getSourceFolders may return the same path
        // from both config-based discovery and the AgenticPromptsService override)
        const seen = new Set();
        matchingFolders = matchingFolders.filter(f => {
            const key = f.uri.toString();
            if (seen.has(key)) {
                return false;
            }
            seen.add(key);
            return true;
        });
        if (matchingFolders.length === 0) {
            // No matching folders — return undefined so the command can fall
            // back to askForPromptSourceFolder (not null which means cancellation)
            return undefined;
        }
        if (matchingFolders.length === 1) {
            return matchingFolders[0].uri;
        }
        // Multiple directories — ask the user which one to use
        const items = matchingFolders.map(folder => ({
            label: this.promptsService.getPromptLocationLabel(folder),
            description: folder.uri.fsPath,
            uri: folder.uri,
        }));
        const picked = await this.quickInputService.pick(items, {
            placeHolder: localize(6467, null),
        });
        return picked?.uri ?? null;
    }
    updateStyles() {
        const borderColor = this.theme.getColor(aiCustomizationManagementSashBorder);
        if (borderColor) {
            this.splitView?.style({ separatorBorder: borderColor });
        }
    }
    async setInput(input, options, context, token) {
        // On (re)open, clear any override so the root comes from the default source
        this.workspaceService.clearOverrideProjectRoot();
        this.inEditorContextKey.set(true);
        this.sectionContextKey.set(this.selectedSection);
        this.telemetryService.publicLog2('chatCustomizationEditor.opened', {
            section: this.selectedSection,
        });
        await super.setInput(input, options, context, token);
        if (this.dimension) {
            this.layout(this.dimension);
        }
    }
    clearInput() {
        this.inEditorContextKey.set(false);
        if (this.viewMode === 'editor') {
            this.goBackToList();
        }
        if (this.viewMode === 'mcpDetail') {
            this.goBackFromMcpDetail();
        }
        if (this.viewMode === 'pluginDetail') {
            this.goBackFromPluginDetail();
        }
        // Clear transient folder override on close
        this.workspaceService.clearOverrideProjectRoot();
        this.disposeBuiltinEditingSessions();
        super.clearInput();
    }
    layout(dimension) {
        this.dimension = dimension;
        if (this.container && this.splitView) {
            this.splitViewContainer.style.height = `${dimension.height}px`;
            this.splitView.layout(dimension.width, dimension.height);
        }
    }
    focus() {
        super.focus();
        if (this.viewMode === 'editor') {
            this.embeddedEditor?.focus();
            return;
        }
        if (this.selectedSection === AICustomizationManagementSection.McpServers) {
            this.mcpListWidget?.focusSearch();
        }
        else if (this.selectedSection === AICustomizationManagementSection.Plugins) {
            this.pluginListWidget?.focusSearch();
        }
        else if (this.selectedSection === AICustomizationManagementSection.Models) {
            this.modelsWidget?.focusSearch();
        }
        else {
            this.listWidget?.focusSearch();
        }
    }
    /**
     * Selects a specific section programmatically.
     */
    selectSectionById(sectionId) {
        const index = this.sections.findIndex(s => s.id === sectionId);
        if (index >= 0) {
            // Directly update state and UI, bypassing the early-return guard in selectSection
            // to handle the case where the editor just opened with a persisted section that
            // matches the requested one (content might not be loaded yet).
            if (this.viewMode === 'editor') {
                this.goBackToList();
            }
            if (this.viewMode === 'mcpDetail') {
                this.goBackFromMcpDetail();
            }
            if (this.viewMode === 'pluginDetail') {
                this.goBackFromPluginDetail();
            }
            this.selectedSection = sectionId;
            this.sectionContextKey.set(sectionId);
            this.storageService.store(AI_CUSTOMIZATION_MANAGEMENT_SELECTED_SECTION_KEY, sectionId, 0 /* StorageScope.PROFILE */, 0 /* StorageTarget.USER */);
            this.updateContentVisibility();
            if (this.isPromptsSection(sectionId)) {
                void this.listWidget.setSection(sectionId);
            }
            this.ensureSectionsListReflectsActiveSection(sectionId);
        }
    }
    /**
     * Refreshes the list widget.
     */
    refreshList() {
        void this.listWidget.refresh();
    }
    /**
     * Generates a debug report for the current section.
     */
    async generateDebugReport() {
        return this.listWidget.generateDebugReport();
    }
    //#region Embedded Editor
    createEmbeddedEditor() {
        if (!this.editorContentContainer) {
            return;
        }
        const editorHeader = DOM.append(this.editorContentContainer, $('.editor-header'));
        this.editorActionButton = DOM.append(editorHeader, $('button.editor-back-button'));
        this.editorActionButton.setAttribute('aria-label', localize(6468, null));
        this.editorActionButtonIcon = DOM.append(this.editorActionButton, $(`.codicon.codicon-${Codicon.arrowLeft.id}.editor-action-button-icon`));
        this.editorActionButtonIcon.setAttribute('aria-hidden', 'true');
        this.editorDisposables.add(DOM.addDisposableListener(this.editorActionButton, 'click', () => {
            void this.handleEditorActionButton().catch(error => {
                console.error('Failed to handle editor back action:', error);
                this.notificationService.error(localize(6469, null));
            });
        }));
        const itemInfo = DOM.append(editorHeader, $('.editor-item-info'));
        this.editorItemNameElement = DOM.append(itemInfo, $('.editor-item-name'));
        this.editorItemPathElement = DOM.append(itemInfo, $('.editor-item-path'));
        this.editorSaveIndicator = DOM.append(editorHeader, $('.editor-save-indicator'));
        const embeddedEditorContainer = DOM.append(this.editorContentContainer, $('.embedded-editor-container'));
        const overflowWidgetsDomNode = DOM.append(this.editorContentContainer, $('.embedded-editor-overflow-widgets.monaco-editor'));
        this.editorDisposables.add(toDisposable(() => overflowWidgetsDomNode.remove()));
        this.embeddedEditor = this.editorDisposables.add(this.instantiationService.createInstance(CodeEditorWidget, embeddedEditorContainer, {
            ...getSimpleEditorOptions(this.configurationService),
            readOnly: false,
            minimap: { enabled: false },
            lineNumbers: 'on',
            wordWrap: 'on',
            scrollBeyondLastLine: false,
            automaticLayout: false,
            folding: true,
            renderLineHighlight: 'all',
            scrollbar: { vertical: 'auto', horizontal: 'auto' },
            overflowWidgetsDomNode,
        }, { isSimpleWidget: false }));
    }
    async showEmbeddedEditor(uri, displayName, promptType, storage, isWorkspaceFile = false, isReadOnly = false) {
        this.currentModelRef?.dispose();
        this.currentModelRef = undefined;
        this.editorModelChangeDisposables.clear();
        this.currentEditingUri = uri;
        this.currentEditingProjectRoot = isWorkspaceFile ? this.workspaceService.getActiveProjectRoot() : undefined;
        this.currentEditingStorage = storage;
        this.currentEditingPromptType = promptType;
        this.viewMode = 'editor';
        this.editorItemNameElement.textContent = displayName;
        this.editorItemPathElement.textContent = basename(uri);
        this._editorContentChanged = false;
        this.resetEditorSaveIndicator();
        this.updateEditorActionButton();
        this.updateContentVisibility();
        try {
            if (storage === BUILTIN_STORAGE && (promptType === PromptsType.prompt || promptType === PromptsType.skill)) {
                const session = await this.getOrCreateBuiltinEditingSession(uri);
                if (!isEqual(this.currentEditingUri, uri)) {
                    return;
                }
                this.embeddedEditor.setModel(session.model);
                this.embeddedEditor.updateOptions({ readOnly: false });
                this._editorContentChanged = session.model.getValue() !== session.originalContent;
                this.updateEditorActionButton();
                if (this.dimension) {
                    this.layout(this.dimension);
                }
                this.embeddedEditor.focus();
                this.editorModelChangeDisposables.add(session.model.onDidChangeContent(() => {
                    this._editorContentChanged = session.model.getValue() !== session.originalContent;
                    this.updateEditorActionButton();
                }));
                return;
            }
            const ref = await this.textModelService.createModelReference(uri);
            if (!isEqual(this.currentEditingUri, uri)) {
                ref.dispose();
                return; // another item was selected while loading
            }
            this.currentModelRef = ref;
            this.embeddedEditor.setModel(ref.object.textEditorModel);
            this.embeddedEditor.updateOptions({ readOnly: isReadOnly });
            if (this.dimension) {
                this.layout(this.dimension);
            }
            this.embeddedEditor.focus();
            this._editorContentChanged = this.workingCopyService.isDirty(uri);
            this.editorModelChangeDisposables.add(ref.object.textEditorModel.onDidChangeContent(() => {
                this._editorContentChanged = true;
                this.resetEditorSaveIndicator();
            }));
            this.editorModelChangeDisposables.add(this.workingCopyService.onDidSave(e => {
                if (isEqual(e.workingCopy.resource, uri)) {
                    this._editorContentChanged = this.workingCopyService.isDirty(uri);
                    this.editorSaveIndicator.className = 'editor-save-indicator visible saved';
                    this.editorSaveIndicator.classList.add(...ThemeIcon.asClassNameArray(Codicon.check));
                    this.editorSaveIndicator.title = localize(6470, null);
                }
            }));
        }
        catch (error) {
            console.error('Failed to load model for embedded editor:', error);
            if (isEqual(this.currentEditingUri, uri)) {
                this.goBackToList();
            }
        }
    }
    goBackToList() {
        const fileUri = this.currentEditingUri;
        const backgroundSaveRequest = this.createExistingCustomizationSaveRequest();
        if (backgroundSaveRequest) {
            this.telemetryService.publicLog2('chatCustomizationEditor.saveItem', {
                promptType: this.currentEditingPromptType ?? '',
                storage: String(this.currentEditingStorage ?? ''),
                saveTarget: 'existing',
            });
        }
        if (fileUri && this.currentEditingStorage === BUILTIN_STORAGE) {
            this.disposeBuiltinEditingSession(fileUri);
        }
        this.currentModelRef?.dispose();
        this.currentModelRef = undefined;
        this.currentEditingUri = undefined;
        this.currentEditingProjectRoot = undefined;
        this.currentEditingStorage = undefined;
        this.currentEditingPromptType = undefined;
        this._editorContentChanged = false;
        this.editorModelChangeDisposables.clear();
        this.resetEditorSaveIndicator();
        this.updateEditorActionButton();
        this.embeddedEditor?.setModel(null);
        this.viewMode = 'list';
        this.updateContentVisibility();
        // Refresh the list to pick up newly created/edited files
        void this.listWidget?.refresh();
        if (this.dimension) {
            this.layout(this.dimension);
        }
        this.listWidget?.focusSearch();
        if (backgroundSaveRequest) {
            const saveRequest = backgroundSaveRequest;
            void this.saveExistingCustomization(saveRequest).catch(error => {
                console.error('Failed to save customization changes on exit:', error);
                this.notificationService.warn(localize(6471, null, basename(saveRequest.fileUri)));
            });
        }
    }
    //#endregion
    async getOrCreateBuiltinEditingSession(uri) {
        const key = uri.toString();
        const existing = this.builtinEditingSessions.get(key);
        if (existing && !existing.model.isDisposed()) {
            return existing;
        }
        const ref = await this.textModelService.createModelReference(uri);
        try {
            const session = {
                model: this.modelService.createModel(createTextBufferFactoryFromSnapshot(ref.object.textEditorModel.createSnapshot()), { languageId: ref.object.textEditorModel.getLanguageId(), onDidChange: Event.None }, URI.from({ scheme: 'ai-customization-builtin', path: uri.path, query: generateUuid() }), false),
                originalContent: ref.object.textEditorModel.getValue(),
            };
            this.builtinEditingSessions.set(key, session);
            return session;
        }
        finally {
            ref.dispose();
        }
    }
    createBuiltinPromptSaveRequest(target) {
        const sourceUri = this.currentEditingUri;
        const promptType = this.currentEditingPromptType;
        if (!sourceUri || this.currentEditingStorage !== BUILTIN_STORAGE || (promptType !== PromptsType.prompt && promptType !== PromptsType.skill) || !target.folder || target.target === 'cancel') {
            return;
        }
        const session = this.builtinEditingSessions.get(sourceUri.toString());
        if (!session || !this._editorContentChanged) {
            return;
        }
        return {
            target: target.target,
            folder: target.folder,
            sourceUri,
            content: session.model.getValue(),
            promptType,
            projectRoot: target.target === 'workspace' ? this.workspaceService.getActiveProjectRoot() : undefined,
        };
    }
    createExistingCustomizationSaveRequest() {
        if (!this._editorContentChanged || this.currentEditingStorage === BUILTIN_STORAGE || !this.currentEditingUri) {
            return undefined;
        }
        const model = this.currentModelRef?.object.textEditorModel;
        if (!model) {
            return undefined;
        }
        return {
            fileUri: this.currentEditingUri,
            content: model.getValue(),
            projectRoot: this.currentEditingProjectRoot,
        };
    }
    async saveBuiltinPromptCopy(request) {
        let targetUri;
        if (request.promptType === PromptsType.skill) {
            // Skills use {skillName}/SKILL.md directory structure
            const skillFolderName = basename(dirname(request.sourceUri));
            targetUri = URI.joinPath(request.folder, skillFolderName, basename(request.sourceUri));
        }
        else {
            targetUri = URI.joinPath(request.folder, basename(request.sourceUri));
        }
        await this.fileService.createFolder(dirname(targetUri));
        await this.fileService.writeFile(targetUri, VSBuffer.fromString(request.content));
        if (request.target === 'workspace' && request.projectRoot) {
            await this.workspaceService.commitFiles(request.projectRoot, [targetUri]);
        }
    }
    async saveExistingCustomization(request) {
        await this.fileService.writeFile(request.fileUri, VSBuffer.fromString(request.content));
        if (request.projectRoot) {
            await this.workspaceService.commitFiles(request.projectRoot, [request.fileUri]);
        }
    }
    async pickBuiltinPromptSaveTarget() {
        const items = [];
        const promptType = this.currentEditingPromptType ?? PromptsType.prompt;
        const workspaceFolder = resolveWorkspaceTargetDirectory(this.workspaceService, promptType);
        if (workspaceFolder) {
            items.push({
                label: localize(6472, null),
                description: workspaceFolder.fsPath,
                target: 'workspace',
                folder: workspaceFolder,
            });
        }
        const userFolder = await resolveUserTargetDirectory(this.promptsService, promptType);
        if (userFolder) {
            items.push({
                label: localize(6473, null),
                description: userFolder.fsPath,
                target: 'user',
                folder: userFolder,
            });
        }
        items.push({
            label: localize(6474, null),
            target: 'cancel',
        });
        return this.quickInputService.pick(items, {
            canPickMany: false,
            placeHolder: localize(6475, null),
            matchOnDescription: true,
        });
    }
    async handleEditorActionButton() {
        if (this.editorActionButtonInProgress) {
            return;
        }
        this.editorActionButtonInProgress = true;
        this.updateEditorActionButton();
        let backgroundSaveRequest;
        try {
            if (this.shouldShowBuiltinSaveAction()) {
                const selection = await this.pickBuiltinPromptSaveTarget();
                if (!selection || selection.target === 'cancel') {
                    return;
                }
                backgroundSaveRequest = this.createBuiltinPromptSaveRequest(selection);
                if (backgroundSaveRequest) {
                    this.telemetryService.publicLog2('chatCustomizationEditor.saveItem', {
                        promptType: this.currentEditingPromptType ?? '',
                        storage: String(this.currentEditingStorage ?? ''),
                        saveTarget: selection.target,
                    });
                }
            }
            this.goBackToList();
            if (backgroundSaveRequest) {
                const saveRequest = backgroundSaveRequest;
                void this.saveBuiltinPromptCopy(saveRequest).then(() => {
                    void this.listWidget?.refresh();
                }, error => {
                    console.error('Failed to save built-in override:', error);
                    this.notificationService.warn(saveRequest.target === 'workspace'
                        ? localize(6476, null)
                        : localize(6477, null));
                });
            }
        }
        finally {
            this.editorActionButtonInProgress = false;
            this.updateEditorActionButton();
        }
    }
    updateEditorActionButton() {
        if (!this.editorActionButton || !this.editorActionButtonIcon) {
            return;
        }
        const shouldShowBuiltinSaveAction = this.shouldShowBuiltinSaveAction();
        this.editorActionButtonIcon.className = `codicon codicon-${shouldShowBuiltinSaveAction ? Codicon.save.id : Codicon.arrowLeft.id} editor-action-button-icon`;
        this.editorActionButton.disabled = this.editorActionButtonInProgress;
        this.editorActionButton.setAttribute('aria-label', shouldShowBuiltinSaveAction
            ? localize(6478, null)
            : localize(6479, null));
        this.editorActionButton.title = shouldShowBuiltinSaveAction
            ? localize(6480, null)
            : localize(6481, null);
    }
    shouldShowBuiltinSaveAction() {
        return this._editorContentChanged
            && this.currentEditingStorage === BUILTIN_STORAGE
            && (this.currentEditingPromptType === PromptsType.prompt || this.currentEditingPromptType === PromptsType.skill);
    }
    resetEditorSaveIndicator() {
        this.editorSaveIndicator.className = 'editor-save-indicator';
        this.editorSaveIndicator.title = '';
    }
    disposeBuiltinEditingSessions() {
        for (const session of this.builtinEditingSessions.values()) {
            session.model.dispose();
        }
        this.builtinEditingSessions.clear();
    }
    disposeBuiltinEditingSession(uri) {
        const key = uri.toString();
        const session = this.builtinEditingSessions.get(key);
        if (!session) {
            return;
        }
        session.model.dispose();
        this.builtinEditingSessions.delete(key);
    }
    //#region Embedded MCP Server Detail
    createEmbeddedMcpDetail() {
        if (!this.mcpDetailContainer) {
            return;
        }
        // Back button header
        const detailHeader = DOM.append(this.mcpDetailContainer, $('.editor-header'));
        const backButton = DOM.append(detailHeader, $('button.editor-back-button'));
        backButton.setAttribute('aria-label', localize(6482, null));
        const backIconEl = DOM.append(backButton, $(`.codicon.codicon-${Codicon.arrowLeft.id}`));
        backIconEl.setAttribute('aria-hidden', 'true');
        this.editorDisposables.add(DOM.addDisposableListener(backButton, 'click', () => {
            this.goBackFromMcpDetail();
        }));
        // Container for the MCP server editor
        const editorContainer = DOM.append(this.mcpDetailContainer, $('.mcp-detail-editor-container'));
        // Create the embedded MCP server editor pane
        this.embeddedMcpEditor = this.editorDisposables.add(this.instantiationService.createInstance(McpServerEditor, this.group));
        this.embeddedMcpEditor.create(editorContainer);
    }
    async showEmbeddedMcpDetail(server) {
        if (!this.embeddedMcpEditor) {
            return;
        }
        this.viewMode = 'mcpDetail';
        this.updateContentVisibility();
        const input = this.instantiationService.createInstance(McpServerEditorInput, server);
        this.mcpDetailDisposables.clear();
        this.mcpDetailDisposables.add(input);
        try {
            await this.embeddedMcpEditor.setInput(input, undefined, {}, CancellationToken.None);
        }
        catch {
            this.goBackFromMcpDetail();
            return;
        }
        if (this.dimension) {
            this.layout(this.dimension);
        }
    }
    goBackFromMcpDetail() {
        this.mcpDetailDisposables.clear();
        this.embeddedMcpEditor?.clearInput();
        this.viewMode = 'list';
        this.updateContentVisibility();
        if (this.dimension) {
            this.layout(this.dimension);
        }
        this.mcpListWidget?.focusSearch();
    }
    //#endregion
    //#region Embedded Plugin Detail
    createEmbeddedPluginDetail() {
        if (!this.pluginDetailContainer) {
            return;
        }
        // Back button header
        const detailHeader = DOM.append(this.pluginDetailContainer, $('.editor-header'));
        const backButton = DOM.append(detailHeader, $('button.editor-back-button'));
        backButton.setAttribute('aria-label', localize(6483, null));
        const backIconEl = DOM.append(backButton, $(`.codicon.codicon-${Codicon.arrowLeft.id}`));
        backIconEl.setAttribute('aria-hidden', 'true');
        this.editorDisposables.add(DOM.addDisposableListener(backButton, 'click', () => {
            this.goBackFromPluginDetail();
        }));
        // Container for the plugin editor
        const editorContainer = DOM.append(this.pluginDetailContainer, $('.plugin-detail-editor-container'));
        // Create the embedded plugin editor pane
        this.embeddedPluginEditor = this.editorDisposables.add(this.instantiationService.createInstance(AgentPluginEditor, this.group));
        this.embeddedPluginEditor.create(editorContainer);
    }
    async showEmbeddedPluginDetail(item) {
        if (!this.embeddedPluginEditor) {
            return;
        }
        this.viewMode = 'pluginDetail';
        this.updateContentVisibility();
        const input = new AgentPluginEditorInput(item);
        this.pluginDetailDisposables.clear();
        this.pluginDetailDisposables.add(input);
        try {
            await this.embeddedPluginEditor.setInput(input, undefined, {}, CancellationToken.None);
        }
        catch {
            this.goBackFromPluginDetail();
            return;
        }
        if (this.dimension) {
            this.layout(this.dimension);
        }
    }
    goBackFromPluginDetail() {
        this.pluginDetailDisposables.clear();
        this.embeddedPluginEditor?.clearInput();
        this.viewMode = 'list';
        this.updateContentVisibility();
        if (this.dimension) {
            this.layout(this.dimension);
        }
        this.pluginListWidget?.focusSearch();
    }
};
AICustomizationManagementEditor = AICustomizationManagementEditor_1 = __decorate([
    __param(1, ITelemetryService),
    __param(2, IThemeService),
    __param(3, IStorageService),
    __param(4, IInstantiationService),
    __param(5, IContextKeyService),
    __param(6, IOpenerService),
    __param(7, ICommandService),
    __param(8, IAICustomizationWorkspaceService),
    __param(9, IPromptsService),
    __param(10, ITextModelService),
    __param(11, IConfigurationService),
    __param(12, IWorkingCopyService),
    __param(13, IFileDialogService),
    __param(14, IHoverService),
    __param(15, IModelService),
    __param(16, IQuickInputService),
    __param(17, IFileService),
    __param(18, INotificationService),
    __param(19, ICustomizationHarnessService)
], AICustomizationManagementEditor);
export { AICustomizationManagementEditor };
//# sourceMappingURL=aiCustomizationManagementEditor.js.map