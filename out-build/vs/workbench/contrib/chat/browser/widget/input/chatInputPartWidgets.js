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
import { Disposable, DisposableStore } from '../../../../../../base/common/lifecycle.js';
import { IContextKeyService } from '../../../../../../platform/contextkey/common/contextkey.js';
import { IInstantiationService } from '../../../../../../platform/instantiation/common/instantiation.js';
/**
 * Registry for chat input part widgets.
 * Widgets register themselves and are instantiated by the controller based on context key conditions.
 */
export const ChatInputPartWidgetsRegistry = new class {
    constructor() {
        this.widgets = [];
    }
    register(id, ctor, when) {
        this.widgets.push({ id, ctor: ctor, when });
    }
    getWidgets() {
        return this.widgets;
    }
}();
/**
 * Controller that manages the rendering of widgets in the chat input part.
 * Widgets are shown/hidden based on context key conditions.
 */
let ChatInputPartWidgetController = class ChatInputPartWidgetController extends Disposable {
    constructor(container, contextKeyService, instantiationService) {
        super();
        this.container = container;
        this.contextKeyService = contextKeyService;
        this.instantiationService = instantiationService;
        this.renderedWidgets = new Map();
        this.update();
        this._register(this.contextKeyService.onDidChangeContext(e => {
            const relevantKeys = new Set();
            for (const descriptor of ChatInputPartWidgetsRegistry.getWidgets()) {
                if (descriptor.when) {
                    for (const key of descriptor.when.keys()) {
                        relevantKeys.add(key);
                    }
                }
            }
            if (e.affectsSome(relevantKeys)) {
                this.update();
            }
        }));
    }
    update() {
        const visibleIds = new Set();
        for (const descriptor of ChatInputPartWidgetsRegistry.getWidgets()) {
            if (this.contextKeyService.contextMatchesRules(descriptor.when)) {
                visibleIds.add(descriptor.id);
            }
        }
        for (const [id, rendered] of this.renderedWidgets) {
            if (!visibleIds.has(id)) {
                rendered.widget.domNode.remove();
                rendered.disposables.dispose();
                this.renderedWidgets.delete(id);
            }
        }
        for (const descriptor of ChatInputPartWidgetsRegistry.getWidgets()) {
            if (!visibleIds.has(descriptor.id)) {
                continue;
            }
            if (!this.renderedWidgets.has(descriptor.id)) {
                const disposables = new DisposableStore();
                const widget = this.instantiationService.createInstance(descriptor.ctor);
                disposables.add(widget);
                this.renderedWidgets.set(descriptor.id, { descriptor, widget, disposables });
                this.container.appendChild(widget.domNode);
            }
        }
    }
    get height() {
        let total = 0;
        for (const rendered of this.renderedWidgets.values()) {
            total += rendered.widget.height;
        }
        return total;
    }
    dispose() {
        for (const rendered of this.renderedWidgets.values()) {
            rendered.widget.domNode.remove();
            rendered.disposables.dispose();
        }
        this.renderedWidgets.clear();
        super.dispose();
    }
};
ChatInputPartWidgetController = __decorate([
    __param(1, IContextKeyService),
    __param(2, IInstantiationService)
], ChatInputPartWidgetController);
export { ChatInputPartWidgetController };
//# sourceMappingURL=chatInputPartWidgets.js.map