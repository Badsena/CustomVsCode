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
import * as dom from '../../../../../base/browser/dom.js';
import { timeout } from '../../../../../base/common/async.js';
import { Emitter, Event } from '../../../../../base/common/event.js';
import { combinedDisposable, Disposable, toDisposable } from '../../../../../base/common/lifecycle.js';
import { isEqual } from '../../../../../base/common/resources.js';
import { ILayoutService } from '../../../../../platform/layout/browser/layoutService.js';
import { ACTIVE_GROUP, IEditorService } from '../../../../services/editor/common/editorService.js';
import { IEditorGroupsService, isEditorGroup } from '../../../../services/editor/common/editorGroupsService.js';
import { IViewsService } from '../../../../services/views/common/viewsService.js';
import { IChatService } from '../../common/chatService/chatService.js';
import { ChatViewId, ChatViewPaneTarget, IQuickChatService, isIChatViewViewContext } from '../chat.js';
import { ChatEditor } from '../widgetHosts/editor/chatEditor.js';
import { ChatEditorInput } from '../widgetHosts/editor/chatEditorInput.js';
let ChatWidgetService = class ChatWidgetService extends Disposable {
    constructor(editorGroupsService, viewsService, quickChatService, layoutService, editorService, chatService) {
        super();
        this.editorGroupsService = editorGroupsService;
        this.viewsService = viewsService;
        this.quickChatService = quickChatService;
        this.layoutService = layoutService;
        this.editorService = editorService;
        this.chatService = chatService;
        this._widgets = [];
        this._lastFocusedWidget = undefined;
        this._onDidAddWidget = this._register(new Emitter());
        this.onDidAddWidget = this._onDidAddWidget.event;
        this._onDidBackgroundSession = this._register(new Emitter());
        this.onDidBackgroundSession = this._onDidBackgroundSession.event;
        this._onDidChangeFocusedWidget = this._register(new Emitter());
        this.onDidChangeFocusedWidget = this._onDidChangeFocusedWidget.event;
        this._onDidChangeFocusedSession = this._register(new Emitter());
        this.onDidChangeFocusedSession = this._onDidChangeFocusedSession.event;
    }
    get lastFocusedWidget() {
        return this._lastFocusedWidget;
    }
    getAllWidgets() {
        return this._widgets;
    }
    getWidgetsByLocations(location) {
        return this._widgets.filter(w => w.location === location);
    }
    getWidgetByInputUri(uri) {
        return this._widgets.find(w => isEqual(w.input.inputUri, uri));
    }
    getWidgetBySessionResource(sessionResource) {
        return this._widgets.find(w => isEqual(w.viewModel?.sessionResource, sessionResource));
    }
    async revealWidget(preserveFocus) {
        const last = this.lastFocusedWidget;
        if (last && await this.reveal(last, preserveFocus)) {
            return last;
        }
        return (await this.viewsService.openView(ChatViewId, !preserveFocus))?.widget;
    }
    async reveal(widget, preserveFocus) {
        if (widget.viewModel?.sessionResource) {
            const alreadyOpenWidget = await this.revealSessionIfAlreadyOpen(widget.viewModel.sessionResource, { preserveFocus });
            if (alreadyOpenWidget) {
                return true;
            }
        }
        if (isIChatViewViewContext(widget.viewContext)) {
            const view = await this.viewsService.openView(widget.viewContext.viewId, !preserveFocus);
            if (!preserveFocus) {
                view?.focus();
            }
            return !!view;
        }
        return false;
    }
    async openSession(sessionResource, target, options) {
        // Reveal if already open unless instructed otherwise
        if (typeof target === 'undefined' || options?.revealIfOpened) {
            const alreadyOpenWidget = await this.revealSessionIfAlreadyOpen(sessionResource, options);
            if (alreadyOpenWidget) {
                return alreadyOpenWidget;
            }
        }
        else {
            await this.prepareSessionForMove(sessionResource, target);
        }
        // Load this session in chat view (preferred)
        if (target === ChatViewPaneTarget || typeof target === 'undefined') {
            const chatView = await this.viewsService.openView(ChatViewId, !options?.preserveFocus);
            if (chatView) {
                await chatView.loadSession(sessionResource);
                if (!options?.preserveFocus) {
                    chatView.focusInput();
                }
            }
            return chatView?.widget;
        }
        // Open in chat editor
        const pane = await this.editorService.openEditor({
            resource: sessionResource,
            options: {
                ...options,
                revealIfOpened: options?.revealIfOpened ?? true // always try to reveal if already opened unless explicitly told not to
            }
        }, target);
        return pane instanceof ChatEditor ? pane.widget : undefined;
    }
    async revealSessionIfAlreadyOpen(sessionResource, options) {
        // Already open in chat view?
        const chatView = this.viewsService.getViewWithId(ChatViewId);
        if (chatView?.widget.viewModel?.sessionResource && isEqual(chatView.widget.viewModel.sessionResource, sessionResource)) {
            const view = await this.viewsService.openView(ChatViewId, !options?.preserveFocus);
            if (!options?.preserveFocus) {
                view?.focus();
            }
            return chatView.widget;
        }
        // Already open in an editor?
        const existingEditor = this.findExistingChatEditorByUri(sessionResource);
        if (existingEditor) {
            const existingEditorWindowId = existingEditor.group.windowId;
            // focus transfer to other documents is async. If we depend on the focus
            // being synchronously transferred in consuming code, this can fail, so
            // wait for it to propagate
            const isGroupActive = () => dom.getWindow(this.layoutService.activeContainer).vscodeWindowId === existingEditorWindowId;
            let ensureFocusTransfer;
            if (!isGroupActive() && !options?.preserveFocus) {
                ensureFocusTransfer = Event.toPromise(Event.once(Event.filter(this.layoutService.onDidChangeActiveContainer, isGroupActive)));
            }
            const pane = await existingEditor.group.openEditor(existingEditor.editor, options);
            await ensureFocusTransfer;
            return pane instanceof ChatEditor ? pane.widget : undefined;
        }
        // Already open in quick chat?
        if (isEqual(sessionResource, this.quickChatService.sessionResource)) {
            this.quickChatService.focus();
            return undefined;
        }
        return undefined;
    }
    async prepareSessionForMove(sessionResource, target) {
        const existingWidget = this.getWidgetBySessionResource(sessionResource);
        if (existingWidget) {
            const existingEditor = isIChatViewViewContext(existingWidget.viewContext) ?
                undefined :
                this.findExistingChatEditorByUri(sessionResource);
            if (isIChatViewViewContext(existingWidget.viewContext) && target === ChatViewPaneTarget) {
                return;
            }
            if (!isIChatViewViewContext(existingWidget.viewContext) && target !== ChatViewPaneTarget && existingEditor && this.isSameEditorTarget(existingEditor.group.id, target)) {
                return;
            }
            if (existingEditor) {
                // widget.clear() on an editor leaves behind an empty chat editor
                await this.editorService.closeEditor({ editor: existingEditor.editor, groupId: existingEditor.group.id }, { preserveFocus: true });
            }
            else {
                await existingWidget.clear();
            }
        }
    }
    findExistingChatEditorByUri(sessionUri) {
        for (const group of this.editorGroupsService.groups) {
            for (const editor of group.editors) {
                if (editor instanceof ChatEditorInput && isEqual(editor.sessionResource, sessionUri)) {
                    return { editor, group };
                }
            }
        }
        return undefined;
    }
    isSameEditorTarget(currentGroupId, target) {
        return typeof target === 'number' && target === currentGroupId ||
            target === ACTIVE_GROUP && this.editorGroupsService.activeGroup?.id === currentGroupId ||
            isEditorGroup(target) && target.id === currentGroupId;
    }
    setLastFocusedWidget(widget) {
        if (widget === this._lastFocusedWidget) {
            return;
        }
        this._lastFocusedWidget = widget;
        this._onDidChangeFocusedWidget.fire(widget);
        this._onDidChangeFocusedSession.fire();
    }
    register(newWidget) {
        if (this._widgets.some(widget => widget === newWidget)) {
            throw new Error('Cannot register the same widget multiple times');
        }
        this._widgets.push(newWidget);
        this._onDidAddWidget.fire(newWidget);
        if (!this._lastFocusedWidget) {
            this.setLastFocusedWidget(newWidget);
        }
        return combinedDisposable(newWidget.onDidFocus(() => this.setLastFocusedWidget(newWidget)), newWidget.onDidChangeViewModel(({ previousSessionResource, currentSessionResource }) => {
            if (this._lastFocusedWidget === newWidget && !isEqual(previousSessionResource, currentSessionResource)) {
                this._onDidChangeFocusedSession.fire();
            }
            if (!previousSessionResource || (currentSessionResource && isEqual(previousSessionResource, currentSessionResource))) {
                return;
            }
            // Timeout to ensure it wasn't just moving somewhere else
            void timeout(200).then(() => {
                if (!this.getWidgetBySessionResource(previousSessionResource) && this.chatService.getSession(previousSessionResource)) {
                    this._onDidBackgroundSession.fire(previousSessionResource);
                }
            });
        }), toDisposable(() => {
            this._widgets.splice(this._widgets.indexOf(newWidget), 1);
            if (this._lastFocusedWidget === newWidget) {
                this.setLastFocusedWidget(undefined);
            }
        }));
    }
};
ChatWidgetService = __decorate([
    __param(0, IEditorGroupsService),
    __param(1, IViewsService),
    __param(2, IQuickChatService),
    __param(3, ILayoutService),
    __param(4, IEditorService),
    __param(5, IChatService)
], ChatWidgetService);
export { ChatWidgetService };
//# sourceMappingURL=chatWidgetService.js.map