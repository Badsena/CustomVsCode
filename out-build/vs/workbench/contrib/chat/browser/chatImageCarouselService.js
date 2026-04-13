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
import { getMediaMime } from '../../../../base/common/mime.js';
import { isEqual } from '../../../../base/common/resources.js';
import { URI } from '../../../../base/common/uri.js';
import { VSBuffer } from '../../../../base/common/buffer.js';
import { localize } from '../../../../nls.js';
import { createDecorator } from '../../../../platform/instantiation/common/instantiation.js';
import { ICommandService } from '../../../../platform/commands/common/commands.js';
import { IFileService } from '../../../../platform/files/common/files.js';
import { extractImagesFromChatRequest, extractImagesFromChatResponse } from '../common/chatImageExtraction.js';
import { isRequestVM, isResponseVM } from '../common/model/chatViewModel.js';
import { IChatWidgetService } from './chat.js';
export const IChatImageCarouselService = createDecorator('chatImageCarouselService');
//#endregion
//#region Testable helper functions
/**
 * Collects all carousel image sections from chat items.
 * Each request/response pair with images becomes one section containing
 * user attachment images, tool invocation images, and inline reference images.
 */
export async function collectCarouselSections(items, readFile) {
    const sections = [];
    // Build a map from request id to request VM for pairing
    const requestMap = new Map();
    for (const item of items) {
        if (isRequestVM(item)) {
            requestMap.set(item.id, item);
        }
    }
    for (const item of items) {
        if (!isResponseVM(item)) {
            continue;
        }
        const { title: extractedTitle, images: responseImages } = await extractImagesFromChatResponse(item, async (uri) => VSBuffer.wrap(await readFile(uri)));
        // Also collect images from the corresponding user request
        const request = requestMap.get(item.requestId);
        const requestImages = request ? extractImagesFromChatRequest(request) : [];
        const allImages = [...requestImages, ...responseImages];
        const dedupedImages = deduplicateConsecutiveImages(allImages);
        if (dedupedImages.length > 0) {
            sections.push({
                title: request?.messageText ?? extractedTitle,
                images: dedupedImages.map(({ id, name, mimeType, data, caption }) => ({ id, name, mimeType, data: data.buffer, caption }))
            });
        }
    }
    // Handle requests that have no response yet (e.g. pending requests with image attachments)
    const respondedRequestIds = new Set(items.filter(isResponseVM).map(r => r.requestId));
    for (const item of items) {
        if (!isRequestVM(item) || respondedRequestIds.has(item.id)) {
            continue;
        }
        const requestImages = extractImagesFromChatRequest(item);
        const dedupedImages = deduplicateConsecutiveImages(requestImages);
        if (dedupedImages.length > 0) {
            sections.push({
                title: item.messageText,
                images: dedupedImages.map(({ id, name, mimeType, data, caption }) => ({ id, name, mimeType, data: data.buffer, caption }))
            });
        }
    }
    return sections;
}
/**
 * Removes consecutive images with the same URI, keeping only the first occurrence
 * of each run of duplicates.
 */
function deduplicateConsecutiveImages(images) {
    return images.filter((img, index) => {
        if (index === 0) {
            return true;
        }
        return !isEqual(images[index - 1].uri, img.uri);
    });
}
/**
 * Finds the global index of the clicked image across all carousel sections.
 * Tries URI string match, then parsed URI equality, then data buffer equality.
 */
export function findClickedImageIndex(sections, resource, data) {
    let globalOffset = 0;
    for (const section of sections) {
        const localIndex = findImageInList(section.images, resource, data);
        if (localIndex >= 0) {
            return globalOffset + localIndex;
        }
        globalOffset += section.images.length;
    }
    return -1;
}
function findImageInList(images, resource, data) {
    // Try matching by URI string (for inline references and tool images with URIs)
    const uriStr = resource.toString();
    const byUri = images.findIndex(img => img.id === uriStr);
    if (byUri >= 0) {
        return byUri;
    }
    // Try matching by parsed URI equality (for tool invocation images with generated URIs)
    const byParsedUri = images.findIndex(img => {
        try {
            return isEqual(URI.parse(img.id), resource);
        }
        catch {
            return false;
        }
    });
    if (byParsedUri >= 0) {
        return byParsedUri;
    }
    // Fall back to matching by data buffer equality
    if (data) {
        const wrapped = VSBuffer.wrap(data);
        return images.findIndex(img => VSBuffer.wrap(img.data).equals(wrapped));
    }
    return -1;
}
/**
 * Builds the collection arguments for the carousel command.
 */
export function buildCollectionArgs(sections, clickedGlobalIndex, sessionResource) {
    const collectionId = sessionResource.toString() + '_carousel';
    const defaultTitle = localize(7169, null);
    return {
        collection: {
            id: collectionId,
            title: sections.length === 1
                ? (sections[0].title || defaultTitle)
                : defaultTitle,
            sections,
        },
        startIndex: clickedGlobalIndex,
    };
}
/**
 * Builds the single-image arguments for the carousel command.
 */
export function buildSingleImageArgs(resource, data) {
    const name = resource.path.split('/').pop() ?? 'image';
    const mimeType = getMediaMime(resource.path) ?? getMediaMime(name) ?? 'image/png';
    return { name, mimeType, data, title: name };
}
//#endregion
const CAROUSEL_COMMAND = 'workbench.action.chat.openImageInCarousel';
let ChatImageCarouselService = class ChatImageCarouselService {
    constructor(chatWidgetService, commandService, fileService) {
        this.chatWidgetService = chatWidgetService;
        this.commandService = commandService;
        this.fileService = fileService;
    }
    async openCarouselAtResource(resource, data) {
        const widget = this.chatWidgetService.lastFocusedWidget;
        if (!widget?.viewModel) {
            await this.openSingleImage(resource, data);
            return;
        }
        const items = widget.viewModel.getItems().filter((item) => isRequestVM(item) || isResponseVM(item));
        const readFile = async (uri) => (await this.fileService.readFile(uri)).value.buffer;
        const sections = await collectCarouselSections(items, readFile);
        const clickedGlobalIndex = findClickedImageIndex(sections, resource, data);
        if (clickedGlobalIndex === -1 || sections.length === 0) {
            await this.openSingleImage(resource, data);
            return;
        }
        const args = buildCollectionArgs(sections, clickedGlobalIndex, widget.viewModel.sessionResource);
        await this.commandService.executeCommand(CAROUSEL_COMMAND, args);
    }
    async openSingleImage(resource, data) {
        if (!data) {
            const content = await this.fileService.readFile(resource);
            data = content.value.buffer;
        }
        const args = buildSingleImageArgs(resource, data);
        await this.commandService.executeCommand(CAROUSEL_COMMAND, args);
    }
};
ChatImageCarouselService = __decorate([
    __param(0, IChatWidgetService),
    __param(1, ICommandService),
    __param(2, IFileService)
], ChatImageCarouselService);
export { ChatImageCarouselService };
//# sourceMappingURL=chatImageCarouselService.js.map