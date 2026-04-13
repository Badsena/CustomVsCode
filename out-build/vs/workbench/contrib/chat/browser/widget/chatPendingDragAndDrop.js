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
import { DragAndDropObserver } from '../../../../../base/browser/dom.js';
import { Disposable, toDisposable } from '../../../../../base/common/lifecycle.js';
import { IChatService } from '../../common/chatService/chatService.js';
const PENDING_REQUEST_ID_ATTR = 'data-pending-request-id';
const PENDING_KIND_ATTR = 'data-pending-kind';
const DRAGGING_CLASS = 'chat-pending-dragging';
/**
 * Manages drag-and-drop reordering for pending (steering/queued) chat messages.
 * Attaches drag handles to pending request rows and uses event delegation on
 * the list container to handle drop targets, keeping logic isolated from the
 * renderer itself.
 */
let ChatPendingDragController = class ChatPendingDragController extends Disposable {
    constructor(listContainer, _getViewModel, _chatService) {
        super();
        this._getViewModel = _getViewModel;
        this._chatService = _chatService;
        this._insertIndicator = dom.$('.chat-pending-insert-indicator');
        listContainer.append(this._insertIndicator);
        this._register(toDisposable(() => this._insertIndicator.remove()));
        this._register(new DragAndDropObserver(listContainer, {
            onDragOver: (e) => this._onDragOver(e),
            onDragLeave: () => this._hideIndicator(),
            onDragEnd: () => this._onDragEnd(),
            onDrop: (e) => this._onDrop(e),
        }));
    }
    /**
     * Called by the renderer to wire up a drag handle for a pending request row.
     */
    attachDragHandle(element, handleEl, rowContainer, disposables) {
        handleEl.setAttribute('draggable', 'true');
        disposables.add(dom.addDisposableListener(handleEl, dom.EventType.DRAG_START, (e) => {
            if (!e.dataTransfer || !element.pendingKind) {
                return;
            }
            this._dragState = { element, pendingKind: element.pendingKind };
            rowContainer.classList.add(DRAGGING_CLASS);
            // Use the row as the drag image
            e.dataTransfer.setDragImage(rowContainer, 0, 0);
            e.dataTransfer.effectAllowed = 'move';
        }));
        disposables.add(dom.addDisposableListener(handleEl, dom.EventType.DRAG_END, () => {
            rowContainer.classList.remove(DRAGGING_CLASS);
            this._onDragEnd();
        }));
    }
    // --- drag event handlers (delegated on the container) ---
    _onDragOver(e) {
        if (!this._dragState) {
            return;
        }
        const target = this._findDropTarget(e);
        if (!target) {
            this._hideIndicator();
            return;
        }
        e.preventDefault();
        if (e.dataTransfer) {
            e.dataTransfer.dropEffect = 'move';
        }
        const rect = target.row.getBoundingClientRect();
        const midY = rect.top + rect.height / 2;
        const before = e.clientY < midY;
        this._showIndicator(target.row, before);
    }
    _onDrop(e) {
        this._hideIndicator();
        if (!this._dragState) {
            return;
        }
        const target = this._findDropTarget(e);
        if (!target) {
            return;
        }
        e.preventDefault();
        const rect = target.row.getBoundingClientRect();
        const midY = rect.top + rect.height / 2;
        const insertBefore = e.clientY < midY;
        this._reorder(this._dragState.element, target.requestId, insertBefore);
        this._dragState = undefined;
    }
    _onDragEnd() {
        this._hideIndicator();
        this._dragState = undefined;
    }
    // --- indicator positioning ---
    _showIndicator(targetRow, before) {
        const rect = targetRow.getBoundingClientRect();
        const parentRect = this._insertIndicator.parentElement.getBoundingClientRect();
        this._insertIndicator.style.display = 'block';
        this._insertIndicator.style.left = `${rect.left - parentRect.left}px`;
        this._insertIndicator.style.width = `${rect.width}px`;
        this._insertIndicator.style.top = before
            ? `${rect.top - parentRect.top}px`
            : `${rect.bottom - parentRect.top}px`;
    }
    _hideIndicator() {
        this._insertIndicator.style.display = 'none';
    }
    // --- target resolution ---
    _findDropTarget(e) {
        if (!this._dragState) {
            return undefined;
        }
        const target = e.target?.closest?.(`[${PENDING_REQUEST_ID_ATTR}]`);
        if (!target) {
            return undefined;
        }
        const requestId = target.getAttribute(PENDING_REQUEST_ID_ATTR);
        const kind = target.getAttribute(PENDING_KIND_ATTR);
        // Only allow reorder within the same group
        if (kind !== this._dragState.pendingKind || requestId === this._dragState.element.id) {
            return undefined;
        }
        return { row: target, requestId };
    }
    // --- reorder logic ---
    _reorder(draggedElement, targetId, insertBefore) {
        const viewModel = this._getViewModel();
        if (!viewModel) {
            return;
        }
        const pendingRequests = viewModel.model.getPendingRequests();
        const draggedKind = draggedElement.pendingKind;
        // Split into the dragged kind's group and the rest (preserving order)
        const group = [];
        const rest = [];
        for (const p of pendingRequests) {
            (p.kind === draggedKind ? group : rest).push(p);
        }
        // Remove dragged from group
        const draggedIdx = group.findIndex(p => p.request.id === draggedElement.id);
        if (draggedIdx === -1) {
            return;
        }
        const [dragged] = group.splice(draggedIdx, 1);
        // Find target position and insert
        let targetIdx = group.findIndex(p => p.request.id === targetId);
        if (targetIdx === -1) {
            return;
        }
        if (!insertBefore) {
            targetIdx++;
        }
        group.splice(targetIdx, 0, dragged);
        // Rebuild full list: steering first, then queued (matching addPendingRequest ordering)
        const reordered = (draggedKind === "steering" /* ChatRequestQueueKind.Steering */
            ? [...group, ...rest] // group is steering, rest is queued
            : [...rest, ...group] // rest is steering, group is queued
        ).map(p => ({ requestId: p.request.id, kind: p.kind }));
        this._chatService.setPendingRequests(viewModel.sessionResource, reordered);
    }
};
ChatPendingDragController = __decorate([
    __param(2, IChatService)
], ChatPendingDragController);
export { ChatPendingDragController };
//# sourceMappingURL=chatPendingDragAndDrop.js.map