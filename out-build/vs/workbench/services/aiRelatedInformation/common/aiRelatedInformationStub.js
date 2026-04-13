/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Event } from '../../../../base/common/event.js';
import { registerSingleton } from '../../../../platform/instantiation/common/extensions.js';
import { IAiRelatedInformationService } from './aiRelatedInformation.js';
import { IChatAgentService } from '../../../contrib/chat/common/participants/chatAgents.js';
class NullAiRelatedInformationService {
    isEnabled() { return false; }
    async getRelatedInformation() { return []; }
    registerAiRelatedInformationProvider() { return { dispose: () => { } }; }
}
class NullChatAgentService {
    constructor() {
        this.onDidChangeAgents = Event.None;
        this.hasToolsAgent = false;
    }
    registerAgent() { return { dispose: () => { } }; }
    registerAgentImplementation() { return { dispose: () => { } }; }
    registerDynamicAgent() { return { dispose: () => { } }; }
    registerAgentCompletionProvider() { return { dispose: () => { } }; }
    async getAgentCompletionItems() { return []; }
    registerChatParticipantDetectionProvider() { return { dispose: () => { } }; }
    async detectAgentOrCommand() { return undefined; }
    hasChatParticipantDetectionProviders() { return false; }
    async invokeAgent() { return {}; }
    setRequestTools() { }
    setYieldRequested() { }
    async getFollowups() { return []; }
    async getChatTitle() { return undefined; }
    async getChatSummary() { return undefined; }
    getAgent() { return undefined; }
    getAgentByFullyQualifiedId() { return undefined; }
    getAgents() { return []; }
    getActivatedAgents() { return []; }
    getAgentsByName() { return []; }
    agentHasDupeName() { return false; }
    getDefaultAgent() { return undefined; }
    getContributedDefaultAgent() { return undefined; }
    updateAgent() { }
}
registerSingleton(IAiRelatedInformationService, NullAiRelatedInformationService, 1 /* InstantiationType.Delayed */);
registerSingleton(IChatAgentService, NullChatAgentService, 1 /* InstantiationType.Delayed */);
//# sourceMappingURL=aiRelatedInformationStub.js.map