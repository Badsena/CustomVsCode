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
import { Disposable, DisposableMap } from '../../../base/common/lifecycle.js';
import { Emitter } from '../../../base/common/event.js';
import { IViewDescriptorService } from '../../common/views.js';
/**
 * Tracks the number of visible view containers at a given location.
 * A view container is considered visible if it has active views (activeViewDescriptors.length > 0).
 * Fires an event when the number of visible containers changes.
 */
let VisibleViewContainersTracker = class VisibleViewContainersTracker extends Disposable {
    constructor(location, viewDescriptorService) {
        super();
        this.location = location;
        this.viewDescriptorService = viewDescriptorService;
        this.viewContainerModelListeners = this._register(new DisposableMap());
        this._onDidChange = this._register(new Emitter());
        this.onDidChange = this._onDidChange.event;
        this._visibleCount = 0;
        this.registerListeners();
        this.initializeViewContainerListeners();
        this.updateVisibleCount();
    }
    /**
     * Returns the current number of visible view containers at this location.
     */
    get visibleCount() {
        return this._visibleCount;
    }
    registerListeners() {
        // Track view container additions/removals
        this._register(this.viewDescriptorService.onDidChangeViewContainers(({ added, removed }) => {
            // Add listeners for new view containers
            for (const { container, location } of added) {
                if (location === this.location) {
                    this.addViewContainerModelListener(container.id);
                }
            }
            // Remove listeners for removed view containers
            for (const { container, location } of removed) {
                if (location === this.location) {
                    this.viewContainerModelListeners.deleteAndDispose(container.id);
                }
            }
            const relevantChange = [...added, ...removed].some(({ location }) => location === this.location);
            if (relevantChange) {
                this.updateVisibleCount();
            }
        }));
        // Track container location changes
        this._register(this.viewDescriptorService.onDidChangeContainerLocation(({ viewContainer, from, to }) => {
            // Update listeners when container moves
            if (from === this.location) {
                this.viewContainerModelListeners.deleteAndDispose(viewContainer.id);
            }
            if (to === this.location) {
                this.addViewContainerModelListener(viewContainer.id);
            }
            if (from === this.location || to === this.location) {
                this.updateVisibleCount();
            }
        }));
    }
    initializeViewContainerListeners() {
        // Initialize listeners for existing view containers
        for (const container of this.viewDescriptorService.getViewContainersByLocation(this.location)) {
            this.addViewContainerModelListener(container.id);
        }
    }
    addViewContainerModelListener(containerId) {
        const container = this.viewDescriptorService.getViewContainerById(containerId);
        if (container) {
            const model = this.viewDescriptorService.getViewContainerModel(container);
            const listener = model.onDidChangeActiveViewDescriptors(() => this.updateVisibleCount());
            this.viewContainerModelListeners.set(containerId, listener);
        }
    }
    updateVisibleCount() {
        const viewContainers = this.viewDescriptorService.getViewContainersByLocation(this.location);
        const visibleViewContainers = viewContainers.filter(container => this.viewDescriptorService.getViewContainerModel(container).activeViewDescriptors.length > 0);
        const newCount = visibleViewContainers.length;
        if (this._visibleCount !== newCount) {
            const before = this._visibleCount;
            this._visibleCount = newCount;
            this._onDidChange.fire({ before, after: newCount });
        }
    }
};
VisibleViewContainersTracker = __decorate([
    __param(1, IViewDescriptorService)
], VisibleViewContainersTracker);
export { VisibleViewContainersTracker };
//# sourceMappingURL=visibleViewContainersTracker.js.map