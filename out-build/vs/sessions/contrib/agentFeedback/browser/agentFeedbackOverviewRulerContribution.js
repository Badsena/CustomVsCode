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
import { Disposable } from '../../../../base/common/lifecycle.js';
import { registerEditorContribution } from '../../../../editor/browser/editorExtensions.js';
import { overviewRulerInfo } from '../../../../editor/common/core/editorColorRegistry.js';
import { OverviewRulerLane } from '../../../../editor/common/model.js';
import { themeColorFromId } from '../../../../platform/theme/common/themeService.js';
import { registerColor } from '../../../../platform/theme/common/colorRegistry.js';
import { localize } from '../../../../nls.js';
import { IAgentFeedbackService } from './agentFeedbackService.js';
import { IChatEditingService } from '../../../../workbench/contrib/chat/common/editing/chatEditingService.js';
import { IAgentSessionsService } from '../../../../workbench/contrib/chat/browser/agentSessions/agentSessionsService.js';
import { getSessionForResource } from './agentFeedbackEditorUtils.js';
const overviewRulerAgentFeedbackForeground = registerColor('editorOverviewRuler.agentFeedbackForeground', overviewRulerInfo, localize(3039, null));
let AgentFeedbackOverviewRulerContribution = class AgentFeedbackOverviewRulerContribution extends Disposable {
    static { this.ID = 'agentFeedback.overviewRulerContribution'; }
    constructor(_editor, _agentFeedbackService, _chatEditingService, _agentSessionsService) {
        super();
        this._editor = _editor;
        this._agentFeedbackService = _agentFeedbackService;
        this._chatEditingService = _chatEditingService;
        this._agentSessionsService = _agentSessionsService;
        this._decorations = this._editor.createDecorationsCollection();
        this._store.add(this._agentFeedbackService.onDidChangeFeedback(() => this._updateDecorations()));
        this._store.add(this._editor.onDidChangeModel(() => {
            this._resolveSession();
            this._updateDecorations();
        }));
        this._resolveSession();
        this._updateDecorations();
    }
    _resolveSession() {
        const model = this._editor.getModel();
        if (!model) {
            this._sessionResource = undefined;
            return;
        }
        this._sessionResource = getSessionForResource(model.uri, this._chatEditingService, this._agentSessionsService);
    }
    _updateDecorations() {
        if (!this._sessionResource) {
            this._decorations.clear();
            return;
        }
        const model = this._editor.getModel();
        if (!model) {
            this._decorations.clear();
            return;
        }
        const feedbackItems = this._agentFeedbackService.getFeedback(this._sessionResource);
        const modelUri = model.uri.toString();
        this._decorations.set(feedbackItems
            .filter(item => item.resourceUri.toString() === modelUri)
            .map(item => ({
            range: item.range,
            options: {
                description: 'agent-feedback-overview-ruler',
                overviewRuler: {
                    color: themeColorFromId(overviewRulerAgentFeedbackForeground),
                    position: OverviewRulerLane.Center,
                }
            }
        })));
    }
    dispose() {
        this._decorations.clear();
        super.dispose();
    }
};
AgentFeedbackOverviewRulerContribution = __decorate([
    __param(1, IAgentFeedbackService),
    __param(2, IChatEditingService),
    __param(3, IAgentSessionsService)
], AgentFeedbackOverviewRulerContribution);
export { AgentFeedbackOverviewRulerContribution };
registerEditorContribution(AgentFeedbackOverviewRulerContribution.ID, AgentFeedbackOverviewRulerContribution, 3 /* EditorContributionInstantiation.Eventually */);
//# sourceMappingURL=agentFeedbackOverviewRulerContribution.js.map