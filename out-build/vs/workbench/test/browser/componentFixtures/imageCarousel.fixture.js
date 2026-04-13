/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Dimension } from '../../../../base/browser/dom.js';
import { mainWindow } from '../../../../base/browser/window.js';
import { VSBuffer } from '../../../../base/common/buffer.js';
import { CancellationToken } from '../../../../base/common/cancellation.js';
import { mock } from '../../../../base/test/common/mock.js';
import { ImageCarouselEditor } from '../../../contrib/imageCarousel/browser/imageCarouselEditor.js';
import { ImageCarouselEditorInput } from '../../../contrib/imageCarousel/browser/imageCarouselEditorInput.js';
import { createEditorServices, defineComponentFixture, defineThemedFixtureGroup } from './fixtureUtils.js';
import '../../../contrib/imageCarousel/browser/media/imageCarousel.css';
function createSolidPng(r, g, b, width = 64, height = 64) {
    const canvas = mainWindow.document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
    ctx.fillRect(0, 0, width, height);
    const dataUrl = canvas.toDataURL('image/png');
    const base64 = dataUrl.split(',')[1];
    return VSBuffer.wrap(Uint8Array.from(atob(base64), c => c.charCodeAt(0)));
}
function createTestImages() {
    return [
        { id: 'img-1', name: 'Red', mimeType: 'image/png', data: createSolidPng(220, 50, 50), caption: 'A red image' },
        { id: 'img-2', name: 'Green', mimeType: 'image/png', data: createSolidPng(50, 180, 50), caption: 'A green image' },
        { id: 'img-3', name: 'Blue', mimeType: 'image/png', data: createSolidPng(50, 80, 220) },
        { id: 'img-4', name: 'Yellow', mimeType: 'image/png', data: createSolidPng(230, 210, 50), caption: 'A yellow image' },
        { id: 'img-5', name: 'Purple', mimeType: 'image/png', data: createSolidPng(150, 50, 200) },
    ];
}
function createMockEditorGroup() {
    return new class extends mock() {
        constructor() {
            super(...arguments);
            this.windowId = mainWindow.vscodeWindowId;
        }
    }();
}
async function renderCarousel(context, collection, startIndex = 0) {
    const { container, disposableStore, theme } = context;
    container.style.width = '600px';
    container.style.height = '500px';
    const instantiationService = createEditorServices(disposableStore, {
        colorTheme: theme,
    });
    const editor = disposableStore.add(instantiationService.createInstance(ImageCarouselEditor, createMockEditorGroup()));
    editor.create(container);
    editor.layout(new Dimension(600, 500));
    const input = new ImageCarouselEditorInput(collection, startIndex);
    await editor.setInput(input, undefined, {}, CancellationToken.None);
}
function singleSectionCollection() {
    return {
        id: 'fixture-single',
        title: 'Test Carousel',
        sections: [{ title: 'All Images', images: createTestImages() }],
    };
}
function multiSectionCollection() {
    const images = createTestImages();
    return {
        id: 'fixture-multi',
        title: 'Multi-Section Carousel',
        sections: [
            { title: 'Warm Colors', images: [images[0], images[3]] },
            { title: 'Cool Colors', images: [images[2], images[4]] },
            { title: 'Nature', images: [images[1]] },
        ],
    };
}
function singleImageCollection() {
    const images = createTestImages();
    return {
        id: 'fixture-single-image',
        title: 'Single Image',
        sections: [{ title: '', images: [images[0]] }],
    };
}
export default defineThemedFixtureGroup({ path: 'imageCarousel/' }, {
    SingleSection: defineComponentFixture({
        render: ctx => renderCarousel(ctx, singleSectionCollection()),
    }),
    SingleSectionMiddleImage: defineComponentFixture({
        render: ctx => renderCarousel(ctx, singleSectionCollection(), 2),
    }),
    MultipleSections: defineComponentFixture({
        render: ctx => renderCarousel(ctx, multiSectionCollection()),
    }),
    SingleImage: defineComponentFixture({
        render: ctx => renderCarousel(ctx, singleImageCollection()),
    }),
});
//# sourceMappingURL=imageCarousel.fixture.js.map