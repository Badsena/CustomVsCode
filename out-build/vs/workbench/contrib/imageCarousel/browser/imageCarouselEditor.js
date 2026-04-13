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
var ImageCarouselEditor_1;
import { addDisposableListener, clearNode, EventType, h } from '../../../../base/browser/dom.js';
import { StandardKeyboardEvent } from '../../../../base/browser/keyboardEvent.js';
import { DisposableStore } from '../../../../base/common/lifecycle.js';
import { clamp } from '../../../../base/common/numbers.js';
import { isMacintosh } from '../../../../base/common/platform.js';
import { localize } from '../../../../nls.js';
import { IThemeService } from '../../../../platform/theme/common/themeService.js';
import { EditorPane } from '../../../browser/parts/editor/editorPane.js';
import { ITelemetryService } from '../../../../platform/telemetry/common/telemetry.js';
import { IStorageService } from '../../../../platform/storage/common/storage.js';
import { ImageCarouselEditorInput } from './imageCarouselEditorInput.js';
const SCALE_PINCH_FACTOR = 0.075;
const MAX_SCALE = 20;
const MIN_SCALE = 0.1;
const PIXELATION_THRESHOLD = 3;
const ZOOM_LEVELS = [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1, 1.5, 2, 3, 5, 7, 10, 15, 20];
let ImageCarouselEditor = class ImageCarouselEditor extends EditorPane {
    static { ImageCarouselEditor_1 = this; }
    static { this.ID = 'workbench.editor.imageCarousel'; }
    constructor(group, telemetryService, themeService, storageService) {
        super(ImageCarouselEditor_1.ID, group, telemetryService, themeService, storageService);
        this._currentIndex = 0;
        this._zoomScale = 'fit';
        this._sections = [];
        this._flatImages = [];
        this._contentDisposables = this._register(new DisposableStore());
        this._imageDisposables = this._register(new DisposableStore());
        this._thumbnailElements = [];
    }
    createEditor(parent) {
        this._container = h('div.image-carousel-editor').root;
        parent.appendChild(this._container);
    }
    async setInput(input, options, context, token) {
        await super.setInput(input, options, context, token);
        this._sections = input.collection.sections;
        this._flatImages = [];
        for (let s = 0; s < this._sections.length; s++) {
            for (let i = 0; i < this._sections[s].images.length; i++) {
                this._flatImages.push({ sectionIndex: s, imageIndexInSection: i, image: this._sections[s].images[i] });
            }
        }
        this._currentIndex = Math.min(input.startIndex, Math.max(0, this._flatImages.length - 1));
        this.buildSlideshow();
    }
    clearInput() {
        this._contentDisposables.clear();
        this._imageDisposables.clear();
        this._zoomScale = 'fit';
        if (this._container) {
            clearNode(this._container);
        }
        this._elements = undefined;
        this._thumbnailElements = [];
        super.clearInput();
    }
    /**
     * Build the full DOM skeleton. Called once per setInput.
     */
    buildSlideshow() {
        if (!this._container) {
            return;
        }
        this._contentDisposables.clear();
        this._imageDisposables.clear();
        clearNode(this._container);
        if (this._flatImages.length === 0) {
            const empty = h('div.empty-message');
            empty.root.textContent = localize(11588, null);
            this._container.appendChild(empty.root);
            return;
        }
        const elements = h('div.slideshow-container', [
            h('div.image-area@imageArea', [
                h('div.main-image-container@mainImageContainer', [
                    h('img.main-image@mainImage'),
                ]),
                h('button.nav-arrow.prev-arrow@prevBtn', { ariaLabel: localize(11589, null) }, [
                    h('span.codicon.codicon-chevron-left'),
                ]),
                h('button.nav-arrow.next-arrow@nextBtn', { ariaLabel: localize(11590, null) }, [
                    h('span.codicon.codicon-chevron-right'),
                ]),
            ]),
            h('div.bottom-bar@bottomBar', [
                h('div.image-info-bar', [
                    h('span.caption-text@captionText'),
                    h('span.caption-separator@captionSeparator'),
                    h('span.image-counter@counter'),
                ]),
                h('div.sections-container@sectionsContainer'),
            ]),
        ]);
        this._elements = {
            root: elements.root,
            imageArea: elements.imageArea,
            mainImageContainer: elements.mainImageContainer,
            mainImage: elements.mainImage,
            captionText: elements.captionText,
            captionSeparator: elements.captionSeparator,
            counter: elements.counter,
            prevBtn: elements.prevBtn,
            nextBtn: elements.nextBtn,
            sectionsContainer: elements.sectionsContainer,
        };
        // Initialize image in fit mode
        this._elements.mainImage.classList.add('scale-to-fit');
        // Navigation listeners
        this._contentDisposables.add(addDisposableListener(this._elements.prevBtn, 'click', () => {
            if (this._currentIndex > 0) {
                this._currentIndex--;
                this.updateCurrentImage();
            }
        }));
        this._contentDisposables.add(addDisposableListener(this._elements.nextBtn, 'click', () => {
            if (this._currentIndex < this._flatImages.length - 1) {
                this._currentIndex++;
                this.updateCurrentImage();
            }
        }));
        // Keyboard navigation
        this._contentDisposables.add(addDisposableListener(elements.root, EventType.KEY_DOWN, e => {
            const event = new StandardKeyboardEvent(e);
            if (event.keyCode === 15 /* KeyCode.LeftArrow */) {
                this.previous();
                event.stopPropagation();
                event.preventDefault();
            }
            else if (event.keyCode === 17 /* KeyCode.RightArrow */) {
                this.next();
                event.stopPropagation();
                event.preventDefault();
            }
        }));
        elements.root.tabIndex = 0;
        // Zoom: scroll wheel + modifier key (Ctrl on Win/Linux, Alt on Mac) or pinch
        this._contentDisposables.add(addDisposableListener(this._elements.imageArea, EventType.MOUSE_WHEEL, (e) => {
            const isZoomModifier = isMacintosh ? e.altKey : e.ctrlKey;
            if (!isZoomModifier && !e.ctrlKey) {
                return;
            }
            e.preventDefault();
            if (e.deltaY === 0) {
                return;
            }
            if (this._zoomScale === 'fit') {
                this._initZoomFromFit();
            }
            const delta = e.deltaY > 0 ? 1 : -1;
            this._applyZoom(this._zoomScale * (1 - delta * SCALE_PINCH_FACTOR));
        }, { passive: false }));
        // Zoom: single click to zoom in/out (like image preview)
        // Track modifier keys at mousedown time
        let clickCtrlPressed = false;
        let clickAltPressed = false;
        this._contentDisposables.add(addDisposableListener(this._elements.mainImageContainer, EventType.MOUSE_DOWN, (e) => {
            if (e.button !== 0) {
                return;
            }
            clickCtrlPressed = e.ctrlKey;
            clickAltPressed = e.altKey;
        }));
        this._contentDisposables.add(addDisposableListener(this._elements.mainImageContainer, EventType.CLICK, (e) => {
            if (e.button !== 0) {
                return;
            }
            const isZoomOut = isMacintosh ? clickAltPressed : clickCtrlPressed;
            if (isZoomOut) {
                this._zoomOut();
            }
            else {
                this._zoomIn();
            }
        }));
        // Update zoom-out cursor class when modifier key is held
        const updateZoomCursor = (e) => {
            const isZoomOut = isMacintosh ? e.altKey : e.ctrlKey;
            this._elements.mainImageContainer.classList.toggle('zoom-out', isZoomOut);
        };
        this._contentDisposables.add(addDisposableListener(elements.root, EventType.KEY_DOWN, updateZoomCursor));
        this._contentDisposables.add(addDisposableListener(elements.root, EventType.KEY_UP, updateZoomCursor));
        // Build section thumbnails
        this._thumbnailElements = [];
        let flatIndex = 0;
        for (let s = 0; s < this._sections.length; s++) {
            const section = this._sections[s];
            // Add separator between sections (not before the first)
            if (s > 0 && this._sections.length > 1) {
                this._elements.sectionsContainer.appendChild(h('div.thumbnail-separator').root);
            }
            for (let i = 0; i < section.images.length; i++) {
                const image = section.images[i];
                const currentFlatIndex = flatIndex;
                const thumbnail = h('button.thumbnail@root', [
                    h('img.thumbnail-image@img'),
                ]);
                const btn = thumbnail.root;
                btn.ariaLabel = localize(11591, null, currentFlatIndex + 1, this._flatImages.length);
                const img = thumbnail.img;
                const blob = new Blob([image.data.buffer.slice(0)], { type: image.mimeType });
                const url = URL.createObjectURL(blob);
                img.src = url;
                img.alt = image.name;
                this._contentDisposables.add({ dispose: () => URL.revokeObjectURL(url) });
                this._contentDisposables.add(addDisposableListener(btn, 'click', () => {
                    this._currentIndex = currentFlatIndex;
                    this.updateCurrentImage();
                }));
                this._elements.sectionsContainer.appendChild(btn);
                this._thumbnailElements.push(btn);
                flatIndex++;
            }
        }
        this._container.appendChild(elements.root);
        // Set initial image
        this.updateCurrentImage();
    }
    /**
     * Update only the changing parts: main image src, caption, button states, thumbnail selection.
     * No DOM teardown/rebuild — eliminates the blank flash.
     */
    updateCurrentImage() {
        if (!this._elements) {
            return;
        }
        // Swap main image blob URL
        this._imageDisposables.clear();
        const entry = this._flatImages[this._currentIndex];
        const currentImage = entry.image;
        const blob = new Blob([currentImage.data.buffer.slice(0)], { type: currentImage.mimeType });
        const url = URL.createObjectURL(blob);
        this._elements.mainImage.src = url;
        this._elements.mainImage.alt = currentImage.name;
        this._imageDisposables.add({ dispose: () => URL.revokeObjectURL(url) });
        // Reset zoom when switching images
        this._applyZoom('fit');
        // Update info bar: caption + separator + counter
        if (currentImage.caption) {
            this._elements.captionText.textContent = currentImage.caption;
            this._elements.captionText.style.display = '';
            this._elements.captionSeparator.style.display = '';
        }
        else {
            this._elements.captionText.textContent = '';
            this._elements.captionText.style.display = 'none';
            this._elements.captionSeparator.style.display = 'none';
        }
        this._elements.counter.textContent = localize(11592, null, this._currentIndex + 1, this._flatImages.length);
        // Update button states
        this._elements.prevBtn.disabled = this._currentIndex === 0;
        this._elements.nextBtn.disabled = this._currentIndex === this._flatImages.length - 1;
        // Update thumbnail selection
        for (let i = 0; i < this._thumbnailElements.length; i++) {
            const isActive = i === this._currentIndex;
            const thumbnail = this._thumbnailElements[i];
            thumbnail.classList.toggle('active', isActive);
            if (isActive) {
                thumbnail.setAttribute('aria-current', 'page');
                // Scroll only the thumbnail strip, not the entire editor
                const container = this._elements.sectionsContainer;
                const containerRect = container.getBoundingClientRect();
                const thumbRect = thumbnail.getBoundingClientRect();
                if (thumbRect.left < containerRect.left) {
                    container.scrollLeft += thumbRect.left - containerRect.left;
                }
                else if (thumbRect.right > containerRect.right) {
                    container.scrollLeft += thumbRect.right - containerRect.right;
                }
            }
            else {
                thumbnail.removeAttribute('aria-current');
            }
        }
        // Update editor title to reflect current section
        if (this.input instanceof ImageCarouselEditorInput) {
            const currentSection = this._sections[entry.sectionIndex];
            this.input.setName(currentSection.title || this.input.collection.title);
        }
    }
    previous() {
        if (this._currentIndex > 0) {
            this._currentIndex--;
            this.updateCurrentImage();
        }
    }
    next() {
        if (this._currentIndex < this._flatImages.length - 1) {
            this._currentIndex++;
            this.updateCurrentImage();
        }
    }
    /**
     * Compute the current display scale when transitioning from 'fit' to numeric zoom.
     */
    _initZoomFromFit() {
        if (!this._elements) {
            return;
        }
        const img = this._elements.mainImage;
        if (img.naturalWidth > 0) {
            this._zoomScale = img.clientWidth / img.naturalWidth;
        }
        else {
            this._zoomScale = 1;
        }
    }
    /**
     * Zoom in to the next predefined zoom level.
     */
    _zoomIn() {
        if (this._zoomScale === 'fit') {
            this._initZoomFromFit();
        }
        const scale = this._zoomScale;
        let i = 0;
        for (; i < ZOOM_LEVELS.length; ++i) {
            if (ZOOM_LEVELS[i] > scale) {
                break;
            }
        }
        this._applyZoom(ZOOM_LEVELS[i] ?? MAX_SCALE);
    }
    /**
     * Zoom out to the previous predefined zoom level.
     */
    _zoomOut() {
        if (this._zoomScale === 'fit') {
            this._initZoomFromFit();
        }
        const scale = this._zoomScale;
        let i = ZOOM_LEVELS.length - 1;
        for (; i >= 0; --i) {
            if (ZOOM_LEVELS[i] < scale) {
                break;
            }
        }
        this._applyZoom(ZOOM_LEVELS[i] ?? MIN_SCALE);
    }
    /**
     * Apply fit-to-container or numeric zoom with scroll-center preservation.
     */
    _applyZoom(newScale) {
        if (!this._elements) {
            return;
        }
        const container = this._elements.mainImageContainer;
        const img = this._elements.mainImage;
        if (newScale === 'fit') {
            this._zoomScale = 'fit';
            img.classList.add('scale-to-fit');
            img.classList.remove('pixelated');
            img.style.zoom = '';
            container.classList.remove('zoomed');
            container.classList.remove('zoom-out');
            container.scrollTo(0, 0);
        }
        else {
            const scale = clamp(newScale, MIN_SCALE, MAX_SCALE);
            this._zoomScale = scale;
            // Capture scroll center ratio before changing zoom.
            const dx = container.scrollWidth > 0
                ? (container.scrollLeft + container.clientWidth / 2) / container.scrollWidth
                : 0.5;
            const dy = container.scrollHeight > 0
                ? (container.scrollTop + container.clientHeight / 2) / container.scrollHeight
                : 0.5;
            img.classList.remove('scale-to-fit');
            img.classList.toggle('pixelated', scale >= PIXELATION_THRESHOLD);
            img.style.zoom = String(scale);
            container.classList.add('zoomed');
            // Restore scroll center — works because setting img.style.zoom triggers
            // synchronous layout, so scrollWidth/scrollHeight reflect the new size.
            const newScrollX = container.scrollWidth * dx - container.clientWidth / 2;
            const newScrollY = container.scrollHeight * dy - container.clientHeight / 2;
            container.scrollTo(newScrollX, newScrollY);
        }
    }
    focus() {
        super.focus();
        this._elements?.root.focus();
    }
    layout(dimension) {
        if (this._container) {
            this._container.style.width = `${dimension.width}px`;
            this._container.style.height = `${dimension.height}px`;
        }
    }
};
ImageCarouselEditor = ImageCarouselEditor_1 = __decorate([
    __param(1, ITelemetryService),
    __param(2, IThemeService),
    __param(3, IStorageService)
], ImageCarouselEditor);
export { ImageCarouselEditor };
//# sourceMappingURL=imageCarouselEditor.js.map