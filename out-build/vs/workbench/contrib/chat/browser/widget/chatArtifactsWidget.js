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
var ChatArtifactsWidget_1;
import * as dom from '../../../../../base/browser/dom.js';
import { ButtonWithIcon } from '../../../../../base/browser/ui/button/button.js';
import { Codicon } from '../../../../../base/common/codicons.js';
import { Disposable, DisposableStore, MutableDisposable } from '../../../../../base/common/lifecycle.js';
import { getMediaMime } from '../../../../../base/common/mime.js';
import { autorun } from '../../../../../base/common/observable.js';
import { ThemeIcon } from '../../../../../base/common/themables.js';
import { URI } from '../../../../../base/common/uri.js';
import { localize } from '../../../../../nls.js';
import { ICommandService } from '../../../../../platform/commands/common/commands.js';
import { IConfigurationService } from '../../../../../platform/configuration/common/configuration.js';
import { IFileService } from '../../../../../platform/files/common/files.js';
import { IInstantiationService } from '../../../../../platform/instantiation/common/instantiation.js';
import { WorkbenchList } from '../../../../../platform/list/browser/listService.js';
import { IOpenerService } from '../../../../../platform/opener/common/opener.js';
import { ChatConfiguration } from '../../common/constants.js';
import { IChatArtifactsService } from '../../common/tools/chatArtifactsService.js';
const ARTIFACT_TYPE_ICONS = {
    devServer: Codicon.globe,
    screenshot: Codicon.file,
    plan: Codicon.book,
};
let ChatArtifactsWidget = class ChatArtifactsWidget extends Disposable {
    static { ChatArtifactsWidget_1 = this; }
    static { this.ELEMENT_HEIGHT = 22; }
    static { this.MAX_ITEMS_SHOWN = 6; }
    constructor(_chatArtifactsService, _instantiationService, _openerService, _configurationService, _commandService, _fileService) {
        super();
        this._chatArtifactsService = _chatArtifactsService;
        this._instantiationService = _instantiationService;
        this._openerService = _openerService;
        this._configurationService = _configurationService;
        this._commandService = _commandService;
        this._fileService = _fileService;
        this._autorunDisposable = this._register(new MutableDisposable());
        this._isCollapsed = true;
        this._listStore = this._register(new DisposableStore());
        this.domNode = dom.$('.chat-artifacts-widget');
        this.domNode.style.display = 'none';
    }
    render(sessionResource) {
        this._sessionResource = sessionResource;
        this._currentObs = this._chatArtifactsService.artifacts(sessionResource);
        dom.clearNode(this.domNode);
        this._listStore.clear();
        const headerNode = dom.$('.chat-artifacts-header');
        this.domNode.appendChild(headerNode);
        const labelContainer = headerNode.appendChild(dom.$('.chat-artifacts-label'));
        const headerButton = this._listStore.add(new ButtonWithIcon(labelContainer, {}));
        this._listStore.add(headerButton.onDidClick(() => {
            this._isCollapsed = !this._isCollapsed;
            this._updateExpansionState(headerButton);
        }));
        const listContainer = dom.$('.chat-artifacts-list');
        this.domNode.appendChild(listContainer);
        this._list = this._listStore.add(this._instantiationService.createInstance((WorkbenchList), 'ChatArtifactsList', listContainer, new ChatArtifactsListDelegate(), [new ChatArtifactsListRenderer()], { alwaysConsumeMouseWheel: false }));
        this._listStore.add(this._list.onDidOpen(e => {
            if (e.element) {
                if (e.element.type === 'screenshot' && this._configurationService.getValue(ChatConfiguration.ImageCarouselEnabled)) {
                    this._openScreenshotInCarousel(e.element);
                }
                else {
                    this._openerService.open(URI.parse(e.element.uri));
                }
            }
        }));
        this._updateExpansionState(headerButton);
        this._autorunDisposable.value = autorun((reader) => {
            const artifacts = this._currentObs.read(reader);
            if (artifacts.length === 0) {
                this.domNode.style.display = 'none';
                return;
            }
            this.domNode.style.display = '';
            headerButton.label = artifacts.length === 1
                ? localize(7853, null)
                : localize(7854, null, artifacts.length);
            const itemsShown = Math.min(artifacts.length, ChatArtifactsWidget_1.MAX_ITEMS_SHOWN);
            const listHeight = itemsShown * ChatArtifactsWidget_1.ELEMENT_HEIGHT;
            this._list.layout(listHeight);
            listContainer.style.height = listHeight + 4 /* bottom padding */ + 'px';
            this._list.splice(0, this._list.length, [...artifacts]);
        });
    }
    async _openScreenshotInCarousel(clicked) {
        const allArtifacts = this._currentObs?.get() ?? [];
        const screenshots = allArtifacts.filter(a => a.type === 'screenshot');
        const startIndex = screenshots.indexOf(clicked);
        const images = await Promise.all(screenshots.map(async (a) => {
            const uri = URI.parse(a.uri);
            const content = await this._fileService.readFile(uri);
            const name = uri.path.split('/').pop() ?? 'image';
            return {
                id: a.uri,
                name,
                mimeType: getMediaMime(name) ?? 'image/png',
                data: content.value.buffer,
            };
        }));
        await this._commandService.executeCommand('workbench.action.chat.openImageInCarousel', {
            collection: {
                id: this._sessionResource.toString() + '_artifacts_carousel',
                title: localize(7855, null),
                sections: [{ title: '', images }],
            },
            startIndex: Math.max(0, startIndex),
        });
    }
    _updateExpansionState(headerButton) {
        headerButton.icon = this._isCollapsed ? Codicon.chevronRight : Codicon.chevronDown;
        this.domNode.classList.toggle('chat-artifacts-collapsed', this._isCollapsed);
    }
    hide() {
        this._autorunDisposable.clear();
        this.domNode.style.display = 'none';
    }
};
ChatArtifactsWidget = ChatArtifactsWidget_1 = __decorate([
    __param(0, IChatArtifactsService),
    __param(1, IInstantiationService),
    __param(2, IOpenerService),
    __param(3, IConfigurationService),
    __param(4, ICommandService),
    __param(5, IFileService)
], ChatArtifactsWidget);
export { ChatArtifactsWidget };
class ChatArtifactsListDelegate {
    getHeight() {
        return ChatArtifactsWidget.ELEMENT_HEIGHT;
    }
    getTemplateId() {
        return ChatArtifactsListRenderer.TEMPLATE_ID;
    }
}
class ChatArtifactsListRenderer {
    constructor() {
        this.templateId = ChatArtifactsListRenderer.TEMPLATE_ID;
    }
    static { this.TEMPLATE_ID = 'chatArtifactsListRenderer'; }
    renderTemplate(container) {
        const row = dom.append(container, dom.$('.chat-artifacts-list-row'));
        const iconElement = dom.append(row, dom.$('.chat-artifacts-list-icon'));
        const labelElement = dom.append(row, dom.$('.chat-artifacts-list-label'));
        return { container: row, iconElement, labelElement };
    }
    renderElement(artifact, _index, templateData) {
        const icon = (artifact.type && ARTIFACT_TYPE_ICONS[artifact.type]) || Codicon.archive;
        templateData.iconElement.className = 'chat-artifacts-list-icon ' + ThemeIcon.asClassName(icon);
        templateData.labelElement.textContent = artifact.label;
        templateData.container.title = artifact.uri;
    }
    disposeTemplate() { }
}
//# sourceMappingURL=chatArtifactsWidget.js.map