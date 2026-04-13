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
var InlineAnchorWidget_1;
import './media/chatInlineAnchorWidget.css';
import * as dom from '../../../../../../base/browser/dom.js';
import { StandardMouseEvent } from '../../../../../../base/browser/mouseEvent.js';
import { getDefaultHoverDelegate } from '../../../../../../base/browser/ui/hover/hoverDelegateFactory.js';
import { Disposable } from '../../../../../../base/common/lifecycle.js';
import { URI } from '../../../../../../base/common/uri.js';
import { ICodeEditorService } from '../../../../../../editor/browser/services/codeEditorService.js';
import { EditorContextKeys } from '../../../../../../editor/common/editorContextKeys.js';
import { SymbolKinds } from '../../../../../../editor/common/languages.js';
import { ILanguageService } from '../../../../../../editor/common/languages/language.js';
import { getIconClasses } from '../../../../../../editor/common/services/getIconClasses.js';
import { IModelService } from '../../../../../../editor/common/services/model.js';
import { DefinitionAction } from '../../../../../../editor/contrib/gotoSymbol/browser/goToCommands.js';
import * as nls from '../../../../../../nls.js';
import { getFlatContextMenuActions } from '../../../../../../platform/actions/browser/menuEntryActionViewItem.js';
import { Action2, IMenuService, MenuId, registerAction2 } from '../../../../../../platform/actions/common/actions.js';
import { IClipboardService } from '../../../../../../platform/clipboard/common/clipboardService.js';
import { ICommandService } from '../../../../../../platform/commands/common/commands.js';
import { IContextKeyService } from '../../../../../../platform/contextkey/common/contextkey.js';
import { IContextMenuService } from '../../../../../../platform/contextview/browser/contextView.js';
import { FileKind, IFileService } from '../../../../../../platform/files/common/files.js';
import { IHoverService } from '../../../../../../platform/hover/browser/hover.js';
import { IInstantiationService } from '../../../../../../platform/instantiation/common/instantiation.js';
import { ILabelService } from '../../../../../../platform/label/common/label.js';
import { IOpenerService } from '../../../../../../platform/opener/common/opener.js';
import { ITelemetryService } from '../../../../../../platform/telemetry/common/telemetry.js';
import { FolderThemeIcon, IThemeService } from '../../../../../../platform/theme/common/themeService.js';
import { fillEditorsDragData } from '../../../../../browser/dnd.js';
import { StaticResourceContextKey } from '../../../../../common/contextkeys.js';
import { IEditorService, SIDE_GROUP } from '../../../../../services/editor/common/editorService.js';
import { globMatchesResource } from '../../../../../services/editor/common/editorResolverService.js';
import { INotebookDocumentService } from '../../../../../services/notebook/common/notebookDocumentService.js';
import { ExplorerFolderContext } from '../../../../files/common/files.js';
import { IChatWidgetService } from '../../chat.js';
import { IChatImageCarouselService } from '../../chatImageCarouselService.js';
import { chatAttachmentResourceContextKey, hookUpSymbolAttachmentDragAndContextMenu } from '../../attachments/chatAttachmentWidgets.js';
import { IChatMarkdownAnchorService } from './chatMarkdownAnchorService.js';
import { IConfigurationService } from '../../../../../../platform/configuration/common/configuration.js';
import { ChatConfiguration } from '../../../common/constants.js';
import { getMediaMime } from '../../../../../../base/common/mime.js';
/**
 * Returns the editor ID to use when opening a resource from chat pills (inline anchors), based on the
 * `chat.editorAssociations` setting. Returns undefined if no association matches.
 */
function getEditorOverrideForChatResource(resource, configurationService) {
    const associations = configurationService.getValue(ChatConfiguration.EditorAssociations) ?? {};
    // Sort patterns by length (longer patterns are more specific)
    const sortedPatterns = Object.keys(associations).sort((a, b) => b.length - a.length);
    for (const pattern of sortedPatterns) {
        if (globMatchesResource(pattern, resource)) {
            return associations[pattern];
        }
    }
    return undefined;
}
export function renderFileWidgets(element, instantiationService, chatMarkdownAnchorService, disposables) {
    // eslint-disable-next-line no-restricted-syntax
    const links = element.querySelectorAll('a');
    links.forEach(a => {
        // Empty link text -> render file widget
        // Also support metadata format: [linkText](file:///...uri?vscodeLinkType=...)
        const linkText = a.textContent?.trim();
        let shouldRenderWidget = false;
        let metadata;
        const href = a.getAttribute('data-href');
        let uri;
        if (href) {
            try {
                uri = URI.parse(href);
            }
            catch {
                // Invalid URI, skip rendering widget
            }
        }
        if (!linkText) {
            shouldRenderWidget = true;
        }
        else if (uri) {
            // Check for vscodeLinkType in query parameters
            const searchParams = new URLSearchParams(uri.query);
            const vscodeLinkType = searchParams.get('vscodeLinkType');
            if (vscodeLinkType) {
                metadata = {
                    vscodeLinkType,
                    linkText
                };
                shouldRenderWidget = true;
                // Strip vscodeLinkType from the URI once we've extracted the metadata for better compatibility with different FS
                searchParams.delete('vscodeLinkType');
                const remainingQuery = searchParams.toString();
                uri = uri.with({ query: remainingQuery });
            }
        }
        if (shouldRenderWidget && uri?.scheme) {
            const widget = instantiationService.createInstance(InlineAnchorWidget, a, { kind: 'inlineReference', inlineReference: uri }, metadata);
            disposables.add(chatMarkdownAnchorService.register(widget));
            disposables.add(widget);
        }
    });
}
let InlineAnchorWidget = class InlineAnchorWidget extends Disposable {
    static { InlineAnchorWidget_1 = this; }
    static { this.className = 'chat-inline-anchor-widget'; }
    constructor(element, inlineReference, metadata, chatImageCarouselService, configurationService, originalContextKeyService, contextMenuService, fileService, hoverService, instantiationService, labelService, languageService, menuService, modelService, telemetryService, themeService, notebookDocumentService, openerService) {
        super();
        this.element = element;
        this.inlineReference = inlineReference;
        this.metadata = metadata;
        this.chatImageCarouselService = chatImageCarouselService;
        this.configurationService = configurationService;
        this.notebookDocumentService = notebookDocumentService;
        this.openerService = openerService;
        // TODO: Make sure we handle updates from an inlineReference being `resolved` late
        this.data = 'uri' in inlineReference.inlineReference
            ? inlineReference.inlineReference
            : 'name' in inlineReference.inlineReference
                ? { kind: 'symbol', symbol: inlineReference.inlineReference }
                : { uri: inlineReference.inlineReference };
        element.classList.add(InlineAnchorWidget_1.className, 'show-file-icons');
        let iconText;
        let iconClasses;
        let location;
        if (this.data.kind === 'symbol') {
            const symbol = this.data.symbol;
            location = this.data.symbol.location;
            iconText = [this.data.symbol.name];
            iconClasses = ['codicon', ...getIconClasses(modelService, languageService, undefined, undefined, SymbolKinds.toIcon(symbol.kind))];
            this._store.add(instantiationService.invokeFunction(accessor => hookUpSymbolAttachmentDragAndContextMenu(accessor, element, originalContextKeyService, { value: symbol.location, name: symbol.name, kind: symbol.kind }, MenuId.ChatInlineSymbolAnchorContext)));
        }
        else {
            location = this.data;
            const filePathLabel = this.metadata?.linkText ?? labelService.getUriBasenameLabel(location.uri);
            if (location.range && this.data.kind !== 'symbol') {
                const suffix = location.range.startLineNumber === location.range.endLineNumber
                    ? `:${location.range.startLineNumber}`
                    : `:${location.range.startLineNumber}-${location.range.endLineNumber}`;
                iconText = [filePathLabel, dom.$('span.label-suffix', undefined, suffix)];
            }
            else if (location.uri.scheme === 'vscode-notebook-cell' && this.data.kind !== 'symbol') {
                iconText = [`${filePathLabel} • cell${this.getCellIndex(location.uri)}`];
            }
            else {
                iconText = [filePathLabel];
            }
            let fileKind = location.uri.path.endsWith('/') ? FileKind.FOLDER : FileKind.FILE;
            const recomputeIconClasses = () => getIconClasses(modelService, languageService, location.uri, fileKind, fileKind === FileKind.FOLDER && !themeService.getFileIconTheme().hasFolderIcons ? FolderThemeIcon : undefined);
            iconClasses = recomputeIconClasses();
            const refreshIconClasses = () => {
                iconEl.classList.remove(...iconClasses);
                iconClasses = recomputeIconClasses();
                iconEl.classList.add(...iconClasses);
            };
            let isDirectory = false;
            fileService.stat(location.uri)
                .then(stat => {
                isDirectory = stat.isDirectory;
                if (stat.isDirectory) {
                    fileKind = FileKind.FOLDER;
                    refreshIconClasses();
                }
            })
                .catch(() => { });
            // Context menu (context key service created lazily on first context menu open)
            let contextKeyService;
            let isFolderContext;
            let contextMenuInitialized = false;
            const ensureContextKeyService = () => {
                if (!contextKeyService) {
                    contextKeyService = this._register(originalContextKeyService.createScoped(element));
                    chatAttachmentResourceContextKey.bindTo(contextKeyService).set(location.uri.toString());
                    isFolderContext = ExplorerFolderContext.bindTo(contextKeyService);
                }
                return contextKeyService;
            };
            this._register(dom.addDisposableListener(element, dom.EventType.CONTEXT_MENU, async (domEvent) => {
                const event = new StandardMouseEvent(dom.getWindow(domEvent), domEvent);
                dom.EventHelper.stop(domEvent, true);
                const cks = ensureContextKeyService();
                if (!contextMenuInitialized) {
                    contextMenuInitialized = true;
                    const resourceContextKey = new StaticResourceContextKey(cks, fileService, languageService, modelService);
                    resourceContextKey.set(location.uri);
                }
                isFolderContext.set(isDirectory);
                if (this._store.isDisposed) {
                    return;
                }
                contextMenuService.showContextMenu({
                    contextKeyService: cks,
                    getAnchor: () => event,
                    getActions: () => {
                        const menu = menuService.getMenuActions(MenuId.ChatInlineResourceAnchorContext, cks, { arg: location.uri });
                        return getFlatContextMenuActions(menu);
                    },
                });
            }));
            // Add line range label for screen readers
            if (location.range) {
                if (location.range.startLineNumber === location.range.endLineNumber) {
                    element.setAttribute('aria-label', nls.localize(7873, null, filePathLabel, location.range.startLineNumber));
                }
                else {
                    element.setAttribute('aria-label', nls.localize(7874, null, filePathLabel, location.range.startLineNumber, location.range.endLineNumber));
                }
            }
        }
        const iconEl = dom.$('span.icon');
        iconEl.classList.add(...iconClasses);
        element.replaceChildren(iconEl, dom.$('span.icon-label', {}, ...iconText));
        const fragment = location.range ? `${location.range.startLineNumber},${location.range.startColumn}` : '';
        element.setAttribute('data-href', (fragment ? location.uri.with({ fragment }) : location.uri).toString());
        // Hover
        const relativeLabel = labelService.getUriLabel(location.uri, { relative: true });
        this._register(hoverService.setupManagedHover(getDefaultHoverDelegate('element'), element, relativeLabel));
        // Drag and drop
        if (this.data.kind !== 'symbol') {
            element.draggable = true;
            this._register(dom.addDisposableListener(element, 'dragstart', e => {
                const stat = {
                    resource: location.uri,
                    selection: location.range,
                };
                instantiationService.invokeFunction(accessor => fillEditorsDragData(accessor, [stat], e));
                e.dataTransfer?.setDragImage(element, 0, 0);
            }));
        }
        // Click handler to open with custom editor association from chat.editorAssociations setting
        this._register(dom.addDisposableListener(element, 'click', async (e) => {
            dom.EventHelper.stop(e, true);
            // If the reference is an image file and the carousel is enabled, open the carousel
            const mimeType = getMediaMime(location.uri.path);
            if (mimeType?.startsWith('image/') && this.configurationService.getValue(ChatConfiguration.ImageCarouselEnabled)) {
                await this.chatImageCarouselService.openCarouselAtResource(location.uri);
                return;
            }
            const editorOverride = getEditorOverrideForChatResource(location.uri, this.configurationService);
            const editorOptions = {
                override: editorOverride,
            };
            if (location.range) {
                editorOptions.selection = location.range;
            }
            await this.openerService.open(location.uri, {
                fromUserGesture: true,
                editorOptions
            });
        }));
    }
    getHTMLElement() {
        return this.element;
    }
    getCellIndex(location) {
        const notebook = this.notebookDocumentService.getNotebook(location);
        const index = notebook?.getCellIndex(location) ?? -1;
        return index >= 0 ? ` ${index + 1}` : '';
    }
};
InlineAnchorWidget = InlineAnchorWidget_1 = __decorate([
    __param(3, IChatImageCarouselService),
    __param(4, IConfigurationService),
    __param(5, IContextKeyService),
    __param(6, IContextMenuService),
    __param(7, IFileService),
    __param(8, IHoverService),
    __param(9, IInstantiationService),
    __param(10, ILabelService),
    __param(11, ILanguageService),
    __param(12, IMenuService),
    __param(13, IModelService),
    __param(14, ITelemetryService),
    __param(15, IThemeService),
    __param(16, INotebookDocumentService),
    __param(17, IOpenerService)
], InlineAnchorWidget);
export { InlineAnchorWidget };
//#region Resource context menu
registerAction2(class AddFileToChatAction extends Action2 {
    static { this.id = 'chat.inlineResourceAnchor.addFileToChat'; }
    constructor() {
        super({
            id: AddFileToChatAction.id,
            title: nls.localize2(7879, "Add File to Chat"),
            menu: [{
                    id: MenuId.ChatInlineResourceAnchorContext,
                    group: 'chat',
                    order: 1,
                    when: ExplorerFolderContext.negate(),
                }]
        });
    }
    async run(accessor, resource) {
        const chatWidgetService = accessor.get(IChatWidgetService);
        const widget = chatWidgetService.lastFocusedWidget;
        if (widget) {
            widget.attachmentModel.addFile(resource);
        }
    }
});
//#endregion
//#region Resource keybindings
registerAction2(class CopyResourceAction extends Action2 {
    static { this.id = 'chat.inlineResourceAnchor.copyResource'; }
    constructor() {
        super({
            id: CopyResourceAction.id,
            title: nls.localize2(7880, "Copy"),
            f1: false,
            precondition: chatAttachmentResourceContextKey,
            keybinding: {
                weight: 200 /* KeybindingWeight.WorkbenchContrib */,
                primary: 2048 /* KeyMod.CtrlCmd */ | 33 /* KeyCode.KeyC */,
            }
        });
    }
    async run(accessor) {
        const chatWidgetService = accessor.get(IChatMarkdownAnchorService);
        const clipboardService = accessor.get(IClipboardService);
        const anchor = chatWidgetService.lastFocusedAnchor;
        if (!anchor) {
            return;
        }
        // TODO: we should also write out the standard mime types so that external programs can use them
        // like how `fillEditorsDragData` works but without having an event to work with.
        const resource = anchor.data.kind === 'symbol' ? anchor.data.symbol.location.uri : anchor.data.uri;
        clipboardService.writeResources([resource]);
    }
});
registerAction2(class OpenToSideResourceAction extends Action2 {
    static { this.id = 'chat.inlineResourceAnchor.openToSide'; }
    constructor() {
        super({
            id: OpenToSideResourceAction.id,
            title: nls.localize2(7881, "Open to the Side"),
            f1: false,
            precondition: chatAttachmentResourceContextKey,
            keybinding: {
                weight: 400 /* KeybindingWeight.ExternalExtension */ + 2,
                primary: 2048 /* KeyMod.CtrlCmd */ | 3 /* KeyCode.Enter */,
                mac: {
                    primary: 256 /* KeyMod.WinCtrl */ | 3 /* KeyCode.Enter */
                },
            },
            menu: [MenuId.ChatInlineSymbolAnchorContext, MenuId.ChatInputSymbolAttachmentContext].map(id => ({
                id: id,
                group: 'navigation',
                order: 1
            }))
        });
    }
    async run(accessor, arg) {
        const editorService = accessor.get(IEditorService);
        const configurationService = accessor.get(IConfigurationService);
        const target = this.getTarget(accessor, arg);
        if (!target) {
            return;
        }
        const targetUri = URI.isUri(target) ? target : target.uri;
        const editorOverride = getEditorOverrideForChatResource(targetUri, configurationService);
        const input = URI.isUri(target)
            ? { resource: target, options: { override: editorOverride } }
            : {
                resource: target.uri, options: {
                    override: editorOverride,
                    selection: {
                        startColumn: target.range.startColumn,
                        startLineNumber: target.range.startLineNumber,
                    }
                }
            };
        await editorService.openEditors([input], SIDE_GROUP);
    }
    getTarget(accessor, arg) {
        const chatWidgetService = accessor.get(IChatMarkdownAnchorService);
        if (arg) {
            return arg;
        }
        const anchor = chatWidgetService.lastFocusedAnchor;
        if (!anchor) {
            return undefined;
        }
        return anchor.data.kind === 'symbol' ? anchor.data.symbol.location : anchor.data.uri;
    }
});
//#endregion
//#region Symbol context menu
registerAction2(class GoToDefinitionAction extends Action2 {
    static { this.id = 'chat.inlineSymbolAnchor.goToDefinition'; }
    constructor() {
        super({
            id: GoToDefinitionAction.id,
            title: {
                ...nls.localize2(7882, "Go to Definition"),
                mnemonicTitle: nls.localize(7875, null),
            },
            menu: [MenuId.ChatInlineSymbolAnchorContext, MenuId.ChatInputSymbolAttachmentContext].map(id => ({
                id,
                group: '4_symbol_nav',
                order: 1.1,
                when: EditorContextKeys.hasDefinitionProvider,
            }))
        });
    }
    async run(accessor, location) {
        const editorService = accessor.get(ICodeEditorService);
        const instantiationService = accessor.get(IInstantiationService);
        await openEditorWithSelection(editorService, location);
        const action = new DefinitionAction({ openToSide: false, openInPeek: false, muteMessage: true }, { title: { value: '', original: '' }, id: '', precondition: undefined });
        return instantiationService.invokeFunction(accessor => action.run(accessor));
    }
});
async function openEditorWithSelection(editorService, location) {
    await editorService.openCodeEditor({
        resource: location.uri, options: {
            selection: {
                startColumn: location.range.startColumn,
                startLineNumber: location.range.startLineNumber,
            }
        }
    }, null);
}
async function runGoToCommand(accessor, command, location) {
    const editorService = accessor.get(ICodeEditorService);
    const commandService = accessor.get(ICommandService);
    await openEditorWithSelection(editorService, location);
    return commandService.executeCommand(command);
}
registerAction2(class GoToTypeDefinitionsAction extends Action2 {
    static { this.id = 'chat.inlineSymbolAnchor.goToTypeDefinitions'; }
    constructor() {
        super({
            id: GoToTypeDefinitionsAction.id,
            title: {
                ...nls.localize2(7883, "Go to Type Definitions"),
                mnemonicTitle: nls.localize(7876, null),
            },
            menu: [MenuId.ChatInlineSymbolAnchorContext, MenuId.ChatInputSymbolAttachmentContext].map(id => ({
                id,
                group: '4_symbol_nav',
                order: 1.1,
                when: EditorContextKeys.hasTypeDefinitionProvider,
            })),
        });
    }
    async run(accessor, location) {
        await runGoToCommand(accessor, 'editor.action.goToTypeDefinition', location);
    }
});
registerAction2(class GoToImplementations extends Action2 {
    static { this.id = 'chat.inlineSymbolAnchor.goToImplementations'; }
    constructor() {
        super({
            id: GoToImplementations.id,
            title: {
                ...nls.localize2(7884, "Go to Implementations"),
                mnemonicTitle: nls.localize(7877, null),
            },
            menu: [MenuId.ChatInlineSymbolAnchorContext, MenuId.ChatInputSymbolAttachmentContext].map(id => ({
                id,
                group: '4_symbol_nav',
                order: 1.2,
                when: EditorContextKeys.hasImplementationProvider,
            })),
        });
    }
    async run(accessor, location) {
        await runGoToCommand(accessor, 'editor.action.goToImplementation', location);
    }
});
registerAction2(class GoToReferencesAction extends Action2 {
    static { this.id = 'chat.inlineSymbolAnchor.goToReferences'; }
    constructor() {
        super({
            id: GoToReferencesAction.id,
            title: {
                ...nls.localize2(7885, "Go to References"),
                mnemonicTitle: nls.localize(7878, null),
            },
            menu: [MenuId.ChatInlineSymbolAnchorContext, MenuId.ChatInputSymbolAttachmentContext].map(id => ({
                id,
                group: '4_symbol_nav',
                order: 1.3,
                when: EditorContextKeys.hasReferenceProvider,
            })),
        });
    }
    async run(accessor, location) {
        await runGoToCommand(accessor, 'editor.action.goToReferences', location);
    }
});
//#endregion
//# sourceMappingURL=chatInlineAnchorWidget.js.map