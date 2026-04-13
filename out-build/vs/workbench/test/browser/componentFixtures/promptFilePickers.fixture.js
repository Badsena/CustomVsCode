/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { mainWindow } from '../../../../base/browser/window.js';
import { Event } from '../../../../base/common/event.js';
import { ResourceSet } from '../../../../base/common/map.js';
import { URI } from '../../../../base/common/uri.js';
import { mock } from '../../../../base/test/common/mock.js';
import { ICommandService } from '../../../../platform/commands/common/commands.js';
import { IContextMenuService, IContextViewService } from '../../../../platform/contextview/browser/contextView.js';
import { IDialogService } from '../../../../platform/dialogs/common/dialogs.js';
import { IFileService } from '../../../../platform/files/common/files.js';
import { ILayoutService } from '../../../../platform/layout/browser/layoutService.js';
import { ILabelService } from '../../../../platform/label/common/label.js';
import { IListService, ListService } from '../../../../platform/list/browser/listService.js';
import { IOpenerService } from '../../../../platform/opener/common/opener.js';
import { IProductService } from '../../../../platform/product/common/productService.js';
import { IQuickInputService } from '../../../../platform/quickinput/common/quickInput.js';
import { QuickInputService } from '../../../../platform/quickinput/browser/quickInputService.js';
import { PromptFilePickers } from '../../../contrib/chat/browser/promptSyntax/pickers/promptFilePickers.js';
import { PromptsType } from '../../../contrib/chat/common/promptSyntax/promptTypes.js';
import { AgentFileType, IPromptsService, PromptsStorage } from '../../../contrib/chat/common/promptSyntax/service/promptsService.js';
import { createEditorServices, defineComponentFixture, defineThemedFixtureGroup } from './fixtureUtils.js';
class FixtureQuickInputService extends QuickInputService {
    createQuickPick(options = { useSeparators: false }) {
        const quickPick = super.createQuickPick(options);
        quickPick.ignoreFocusOut = true;
        return quickPick;
    }
}
export default defineThemedFixtureGroup({ path: 'chat/' }, {
    PromptFiles: defineComponentFixture({
        labels: { kind: 'screenshot' },
        render: context => renderPromptFilePickerFixture({
            ...context,
            type: PromptsType.prompt,
            placeholder: 'Select the prompt file to run',
            seedData: promptsService => {
                promptsService.localPromptFiles = [
                    { uri: URI.file('/workspace/.github/prompts/refactor.prompt.md'), storage: PromptsStorage.local, type: PromptsType.prompt, name: 'Refactor Prompt', description: 'Refactor selected code' },
                    { uri: URI.file('/workspace/.github/prompts/docs.prompt.md'), storage: PromptsStorage.local, type: PromptsType.prompt, name: 'Docs Prompt', description: 'Generate docs for symbols' },
                ];
                promptsService.userPromptFiles = [
                    { uri: URI.file('/home/dev/.copilot/prompts/review.prompt.md'), storage: PromptsStorage.user, type: PromptsType.prompt, name: 'Review Prompt', description: 'Review this change' },
                ];
            },
        }),
    }),
    InstructionFilesWithAgentInstructions: defineComponentFixture({
        labels: { kind: 'screenshot' },
        render: context => renderPromptFilePickerFixture({
            ...context,
            type: PromptsType.instructions,
            placeholder: 'Select instruction files',
            seedData: promptsService => {
                promptsService.localPromptFiles = [
                    { uri: URI.file('/workspace/.github/instructions/repo.instructions.md'), storage: PromptsStorage.local, type: PromptsType.instructions, name: 'Repo Rules', description: 'Repository-wide coding rules' },
                ];
                promptsService.agentInstructionFiles = [
                    { uri: URI.file('/workspace/AGENTS.md'), realPath: undefined, type: AgentFileType.agentsMd },
                    { uri: URI.file('/workspace/.github/copilot-instructions.md'), realPath: undefined, type: AgentFileType.copilotInstructionsMd },
                ];
            },
        }),
    }),
});
async function renderPromptFilePickerFixture({ container, disposableStore, theme, type, placeholder, seedData }) {
    const quickInputHost = document.createElement('div');
    quickInputHost.style.position = 'relative';
    const hostWidth = 800;
    const hostHeight = 600;
    quickInputHost.style.width = `${hostWidth}px`;
    quickInputHost.style.height = `${hostHeight}px`;
    quickInputHost.style.minHeight = `${hostHeight}px`;
    quickInputHost.style.overflow = 'hidden';
    container.appendChild(quickInputHost);
    const promptsState = {
        localPromptFiles: [],
        userPromptFiles: [],
        extensionPromptFiles: [],
        agentInstructionFiles: [],
        disabled: new ResourceSet(),
    };
    seedData(promptsState);
    const promptsService = new class extends mock() {
        async listPromptFilesForStorage(type, storage, _token) {
            switch (storage) {
                case PromptsStorage.local:
                    return promptsState.localPromptFiles.filter(file => file.type === type);
                case PromptsStorage.user:
                    return promptsState.userPromptFiles.filter(file => file.type === type);
                case PromptsStorage.extension:
                    return promptsState.extensionPromptFiles.filter(file => file.type === type);
                case PromptsStorage.plugin:
                    return [];
                default:
                    return [];
            }
        }
        async listAgentInstructions(_token) {
            return promptsState.agentInstructionFiles;
        }
        async parseNew(_uri, _token) {
            throw new Error('Not implemented');
        }
        getDisabledPromptFiles(_type) {
            return promptsState.disabled;
        }
        setDisabledPromptFiles(_type, uris) {
            promptsState.disabled = uris;
        }
    };
    const layoutService = new class extends mock() {
        constructor() {
            super(...arguments);
            this.activeContainer = quickInputHost;
            this.activeContainerOffset = { top: 0, quickPickTop: 20 };
            this.mainContainer = quickInputHost;
            this.mainContainerOffset = { top: 0, quickPickTop: 20 };
            this.containers = [quickInputHost];
            this.onDidLayoutMainContainer = Event.None;
            this.onDidLayoutContainer = Event.None;
            this.onDidLayoutActiveContainer = Event.None;
            this.onDidAddContainer = Event.None;
            this.onDidChangeActiveContainer = Event.None;
        }
        get activeContainerDimension() { return { width: hostWidth, height: hostHeight }; }
        get mainContainerDimension() { return { width: hostWidth, height: hostHeight }; }
        getContainer() {
            return quickInputHost;
        }
        whenContainerStylesLoaded() {
            return undefined;
        }
        focus() { }
    };
    const contextMenuService = new class extends mock() {
        constructor() {
            super(...arguments);
            this.onDidShowContextMenu = Event.None;
            this.onDidHideContextMenu = Event.None;
        }
        showContextMenu() { }
    };
    const contextViewService = new class extends mock() {
        constructor() {
            super(...arguments);
            this.anchorAlignment = 0;
        }
        showContextView() { return { close: () => { } }; }
        hideContextView() { }
        getContextViewElement() { return quickInputHost; }
        layout() { }
    };
    const instantiationService = createEditorServices(disposableStore, {
        colorTheme: theme,
        additionalServices: registration => {
            registration.defineInstance(ILayoutService, layoutService);
            registration.defineInstance(IContextMenuService, contextMenuService);
            registration.defineInstance(IContextViewService, contextViewService);
            registration.define(IListService, ListService);
            registration.define(IQuickInputService, FixtureQuickInputService);
            registration.defineInstance(IPromptsService, promptsService);
            registration.defineInstance(IOpenerService, new class extends mock() {
            });
            registration.defineInstance(IFileService, new class extends mock() {
            });
            registration.defineInstance(IDialogService, new class extends mock() {
            });
            registration.defineInstance(ICommandService, new class extends mock() {
            });
            registration.defineInstance(ILabelService, new class extends mock() {
                getUriLabel(uri) {
                    return uri.path;
                }
            });
            registration.defineInstance(IProductService, new class extends mock() {
            });
        }
    });
    const pickers = instantiationService.createInstance(PromptFilePickers);
    void pickers.selectPromptFile({
        placeholder,
        type,
    });
    // Wait for the quickpick widget to render and have dimensions
    const quickInputWidget = await waitForElement(quickInputHost, '.quick-input-widget', el => el.offsetWidth > 0 && el.offsetHeight > 0);
    if (quickInputWidget) {
        // Reset positioning
        quickInputWidget.style.position = 'relative';
        quickInputWidget.style.top = '0';
        quickInputWidget.style.left = '0';
        // Move widget to container and remove host
        container.appendChild(quickInputWidget);
        quickInputHost.remove();
        // Set explicit dimensions on container to match widget
        const rect = quickInputWidget.getBoundingClientRect();
        container.style.width = `${rect.width}px`;
        container.style.height = `${rect.height}px`;
    }
}
async function waitForElement(root, selector, condition, timeout = 2000) {
    const start = Date.now();
    while (Date.now() - start < timeout) {
        const el = root.querySelector(selector);
        if (el && condition(el)) {
            // Wait one more frame to ensure layout is complete
            await new Promise(resolve => mainWindow.requestAnimationFrame(resolve));
            return el;
        }
        await new Promise(resolve => setTimeout(resolve, 10));
    }
    return root.querySelector(selector);
}
//# sourceMappingURL=promptFilePickers.fixture.js.map