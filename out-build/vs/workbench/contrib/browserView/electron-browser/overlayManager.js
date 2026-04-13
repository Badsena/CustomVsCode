/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Disposable } from '../../../../base/common/lifecycle.js';
import { MicrotaskEmitter } from '../../../../base/common/event.js';
import { createDecorator } from '../../../../platform/instantiation/common/instantiation.js';
import { getDomNodePagePosition } from '../../../../base/browser/dom.js';
export var BrowserOverlayType;
(function (BrowserOverlayType) {
    BrowserOverlayType["Menu"] = "menu";
    BrowserOverlayType["QuickInput"] = "quickInput";
    BrowserOverlayType["Hover"] = "hover";
    BrowserOverlayType["Dialog"] = "dialog";
    BrowserOverlayType["Notification"] = "notification";
    BrowserOverlayType["Unknown"] = "unknown";
})(BrowserOverlayType || (BrowserOverlayType = {}));
const OVERLAY_DEFINITIONS = [
    { className: 'monaco-menu-container', type: BrowserOverlayType.Menu },
    { className: 'quick-input-widget', type: BrowserOverlayType.QuickInput },
    { className: 'monaco-hover', type: BrowserOverlayType.Hover },
    { className: 'editor-widget', type: BrowserOverlayType.Hover },
    { className: 'suggest-details-container', type: BrowserOverlayType.Hover },
    { className: 'monaco-dialog-modal-block', type: BrowserOverlayType.Dialog },
    { className: 'monaco-modal-editor-block', type: BrowserOverlayType.Dialog },
    { className: 'notifications-center', type: BrowserOverlayType.Notification },
    { className: 'notification-toast-container', type: BrowserOverlayType.Notification },
    // Context view is very generic, so treat the content as unknown
    { className: 'context-view', type: BrowserOverlayType.Unknown }
];
export const IBrowserOverlayManager = createDecorator('browserOverlayManager');
export class BrowserOverlayManager extends Disposable {
    constructor(targetWindow) {
        super();
        this.targetWindow = targetWindow;
        this._onDidChangeOverlayState = this._register(new MicrotaskEmitter({
            onWillAddFirstListener: () => {
                // Start observing the document for structural changes
                this._observerIsConnected = true;
                this._structuralObserver.observe(this.targetWindow.document.body, {
                    childList: true,
                    subtree: true
                });
                this.updateTrackedElements();
            },
            onDidRemoveLastListener: () => {
                // Stop observing when no listeners are present
                this._observerIsConnected = false;
                this._structuralObserver.disconnect();
                this.stopTrackingElements();
            },
            // Must be passed to prevent duplicate emits
            merge: () => { }
        }));
        this.onDidChangeOverlayState = this._onDidChangeOverlayState.event;
        this._overlayCollections = new Map();
        this._overlayRectangles = new WeakMap();
        this._elementObservers = new WeakMap();
        this._observerIsConnected = false;
        this._shadowRootObservers = new WeakMap();
        this._shadowRootOverlayCache = new WeakMap();
        // Initialize live collections for each overlay selector in main document
        for (const overlayDefinition of OVERLAY_DEFINITIONS) {
            this._overlayCollections.set(overlayDefinition.className, {
                type: overlayDefinition.type,
                // We need dynamic collections for overlay detection, using getElementsByClassName is intentional here
                // eslint-disable-next-line no-restricted-syntax
                collection: this.targetWindow.document.getElementsByClassName(overlayDefinition.className)
            });
        }
        // Initialize live collection for shadow root hosts
        // We need dynamic collections for overlay detection, using getElementsByClassName is intentional here
        // eslint-disable-next-line no-restricted-syntax
        this._shadowRootHostCollection = this.targetWindow.document.getElementsByClassName('shadow-root-host');
        // Setup structural observer to watch for element additions/removals
        this._structuralObserver = new targetWindow.MutationObserver((mutations) => {
            let didRemove = false;
            for (const mutation of mutations) {
                for (const node of mutation.removedNodes) {
                    // Clean up element observers
                    if (this._elementObservers.has(node)) {
                        const observer = this._elementObservers.get(node);
                        observer?.disconnect();
                        this._elementObservers.delete(node);
                        didRemove = true;
                    }
                    if (this._overlayRectangles.delete(node)) {
                        didRemove = true;
                    }
                    // Clean up shadow root observers when shadow-root-host elements are removed
                    const hostElement = node;
                    if (hostElement.shadowRoot) {
                        const shadowRoot = hostElement.shadowRoot;
                        const observer = this._shadowRootObservers.get(shadowRoot);
                        if (observer) {
                            observer.disconnect();
                            this._shadowRootObservers.delete(shadowRoot);
                            this._shadowRootOverlayCache.delete(shadowRoot);
                            didRemove = true;
                        }
                    }
                }
            }
            this.updateTrackedElements(didRemove);
        });
    }
    *overlays() {
        // Yield overlays from main document live collections
        for (const entry of this._overlayCollections.values()) {
            for (const element of entry.collection) {
                yield { element: element, type: entry.type };
            }
        }
        // Yield overlays from shadow roots
        for (const hostElement of this._shadowRootHostCollection) {
            const shadowRoot = hostElement.shadowRoot;
            if (shadowRoot) {
                let cache = this._shadowRootOverlayCache.get(shadowRoot);
                if (!cache) {
                    // Rebuild cache
                    cache = [];
                    for (const overlayDefinition of OVERLAY_DEFINITIONS) {
                        // We need to query shadow roots for overlay detection, using querySelectorAll is intentional here
                        // eslint-disable-next-line no-restricted-syntax
                        const elements = shadowRoot.querySelectorAll(`.${overlayDefinition.className}`);
                        for (const element of elements) {
                            cache.push({ element: element, type: overlayDefinition.type });
                        }
                    }
                    this._shadowRootOverlayCache.set(shadowRoot, cache);
                }
                yield* cache;
            }
        }
    }
    updateTrackedElements(shouldEmit = false) {
        // Track shadow roots using live collection
        for (const host of this._shadowRootHostCollection) {
            const hostElement = host;
            const shadowRoot = hostElement.shadowRoot;
            if (shadowRoot && !this._shadowRootObservers.has(shadowRoot)) {
                // Create observer for this shadow root
                const observer = new this.targetWindow.MutationObserver(() => {
                    // Clear element cache when shadow root structure changes
                    this._shadowRootOverlayCache.delete(shadowRoot);
                    this._onDidChangeOverlayState.fire();
                });
                observer.observe(shadowRoot, {
                    childList: true,
                    subtree: true
                });
                this._shadowRootObservers.set(shadowRoot, observer);
                shouldEmit = true;
            }
        }
        // Scan all overlay collections for elements and ensure they have observers
        for (const overlay of this.overlays()) {
            // Create a new observer for this specific element if we don't already have one
            if (!this._elementObservers.has(overlay.element)) {
                const observer = new this.targetWindow.MutationObserver(() => {
                    this._overlayRectangles.delete(overlay.element);
                    this._onDidChangeOverlayState.fire();
                });
                // Store the observer in the WeakMap
                this._elementObservers.set(overlay.element, observer);
                // Start observing this element
                observer.observe(overlay.element, {
                    attributes: true,
                    attributeFilter: ['style', 'class'],
                    childList: true,
                    subtree: true
                });
                shouldEmit = true;
            }
        }
        if (shouldEmit) {
            this._onDidChangeOverlayState.fire();
        }
    }
    getRect(element) {
        if (!this._overlayRectangles.has(element)) {
            const rect = getDomNodePagePosition(element);
            // If the observer is not connected (no listeners), do not cache rectangles as we won't know when they change.
            if (!this._observerIsConnected) {
                return rect;
            }
            this._overlayRectangles.set(element, rect);
        }
        return this._overlayRectangles.get(element);
    }
    getOverlappingOverlays(element) {
        const elementRect = getDomNodePagePosition(element);
        const overlappingOverlays = [];
        // Check against all precomputed overlay rectangles
        for (const overlay of this.overlays()) {
            const overlayRect = this.getRect(overlay.element);
            if (overlayRect && this.isRectanglesOverlapping(elementRect, overlayRect)) {
                overlappingOverlays.push({
                    type: overlay.type,
                    rect: overlayRect
                });
            }
        }
        return overlappingOverlays;
    }
    isRectanglesOverlapping(rect1, rect2) {
        // If elements are offscreen or set to zero size, consider them non-overlapping
        if (rect1.width === 0 || rect1.height === 0 || rect2.width === 0 || rect2.height === 0) {
            return false;
        }
        return !(rect1.left + rect1.width <= rect2.left ||
            rect2.left + rect2.width <= rect1.left ||
            rect1.top + rect1.height <= rect2.top ||
            rect2.top + rect2.height <= rect1.top);
    }
    stopTrackingElements() {
        // Disconnect all element observers
        for (const overlay of this.overlays()) {
            const observer = this._elementObservers.get(overlay.element);
            observer?.disconnect();
        }
        // Disconnect all shadow root observers
        for (const hostElement of this._shadowRootHostCollection) {
            const shadowRoot = hostElement.shadowRoot;
            const shadowObserver = this._shadowRootObservers.get(shadowRoot);
            shadowObserver?.disconnect();
        }
        this._shadowRootObservers = new WeakMap();
        this._shadowRootOverlayCache = new WeakMap();
        this._overlayRectangles = new WeakMap();
        this._elementObservers = new WeakMap();
    }
    dispose() {
        this._observerIsConnected = false;
        this._structuralObserver.disconnect();
        this.stopTrackingElements();
        super.dispose();
    }
}
//# sourceMappingURL=overlayManager.js.map