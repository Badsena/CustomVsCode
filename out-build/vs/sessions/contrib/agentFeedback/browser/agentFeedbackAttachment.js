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
import { Disposable, DisposableMap } from '../../../../base/common/lifecycle.js';
import { Codicon } from '../../../../base/common/codicons.js';
import { basename } from '../../../../base/common/resources.js';
import { localize } from '../../../../nls.js';
import { IAgentFeedbackService } from './agentFeedbackService.js';
import { IChatWidgetService } from '../../../../workbench/contrib/chat/browser/chat.js';
export const ATTACHMENT_ID_PREFIX = 'agentFeedback:';
/**
 * Keeps the "N feedback items" attachment in the chat input in sync with the
 * AgentFeedbackService. One attachment per session resource, updated reactively.
 * Clears feedback after the chat prompt is sent.
 */
let AgentFeedbackAttachmentContribution = class AgentFeedbackAttachmentContribution extends Disposable {
    static { this.ID = 'workbench.contrib.agentFeedbackAttachment'; }
    constructor(_agentFeedbackService, _chatWidgetService) {
        super();
        this._agentFeedbackService = _agentFeedbackService;
        this._chatWidgetService = _chatWidgetService;
        /** Track onDidAcceptInput subscriptions per widget session */
        this._widgetListeners = this._store.add(new DisposableMap());
        this._store.add(this._agentFeedbackService.onDidChangeFeedback(e => {
            this._updateAttachment(e.sessionResource);
            this._ensureAcceptListener(e.sessionResource);
        }));
    }
    async _updateAttachment(sessionResource) {
        const widget = this._chatWidgetService.getWidgetBySessionResource(sessionResource);
        if (!widget) {
            return;
        }
        const feedbackItems = this._agentFeedbackService.getFeedback(sessionResource);
        const attachmentId = ATTACHMENT_ID_PREFIX + sessionResource.toString();
        if (feedbackItems.length === 0) {
            widget.attachmentModel.delete(attachmentId);
            return;
        }
        const value = this._buildFeedbackValue(feedbackItems);
        const entry = {
            kind: 'agentFeedback',
            id: attachmentId,
            name: feedbackItems.length === 1
                ? localize(2999, null)
                : localize(3000, null, feedbackItems.length),
            icon: Codicon.comment,
            sessionResource,
            feedbackItems: feedbackItems.map(f => ({
                id: f.id,
                text: f.text,
                resourceUri: f.resourceUri,
                range: f.range,
                codeSelection: f.codeSelection,
                diffHunks: f.diffHunks,
            })),
            value,
        };
        // Upsert
        widget.attachmentModel.delete(attachmentId);
        widget.attachmentModel.addContext(entry);
    }
    /**
     * Builds a rich string value for the agent feedback attachment from
     * the selection and diff context already stored on each feedback item.
     */
    _buildFeedbackValue(feedbackItems) {
        const parts = ['The following comments were made on the code changes:'];
        for (const item of feedbackItems) {
            const fileName = basename(item.resourceUri);
            const lineRef = item.range.startLineNumber === item.range.endLineNumber
                ? `${item.range.startLineNumber}`
                : `${item.range.startLineNumber}-${item.range.endLineNumber}`;
            let part = `[${fileName}:${lineRef}]`;
            if (item.codeSelection) {
                part += `\nSelection:\n\`\`\`\n${item.codeSelection}\n\`\`\``;
            }
            if (item.diffHunks) {
                part += `\nDiff Hunks:\n\`\`\`diff\n${item.diffHunks}\n\`\`\``;
            }
            part += `\nComment: ${item.text}`;
            parts.push(part);
        }
        return parts.join('\n\n');
    }
    /**
     * Ensure we listen for the chat widget's submit event so we can clear feedback after send.
     */
    _ensureAcceptListener(sessionResource) {
        const key = sessionResource.toString();
        if (this._widgetListeners.has(key)) {
            return;
        }
        const widget = this._chatWidgetService.getWidgetBySessionResource(sessionResource);
        if (!widget) {
            return;
        }
        this._widgetListeners.set(key, widget.onDidSubmitAgent(() => {
            this._agentFeedbackService.clearFeedback(sessionResource);
            this._widgetListeners.deleteAndDispose(key);
        }));
    }
};
AgentFeedbackAttachmentContribution = __decorate([
    __param(0, IAgentFeedbackService),
    __param(1, IChatWidgetService)
], AgentFeedbackAttachmentContribution);
export { AgentFeedbackAttachmentContribution };
//# sourceMappingURL=agentFeedbackAttachment.js.map