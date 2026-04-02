/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Event } from '../../../../base/common/event.js';
import { InstantiationType, registerSingleton } from '../../../../platform/instantiation/common/extensions.js';
import { IAiRelatedInformationService } from './aiRelatedInformation.js';
import { IChatAgentService } from '../../../contrib/chat/common/participants/chatAgents.js';

class NullAiRelatedInformationService implements IAiRelatedInformationService {
	_serviceBrand: undefined;
	isEnabled() { return false; }
	async getRelatedInformation() { return []; }
	registerAiRelatedInformationProvider() { return { dispose: () => { } }; }
}

class NullChatAgentService implements IChatAgentService {
	_serviceBrand: undefined;
	readonly onDidChangeAgents = Event.None;
	readonly hasToolsAgent = false;
	registerAgent() { return { dispose: () => { } }; }
	registerAgentImplementation() { return { dispose: () => { } }; }
	registerDynamicAgent() { return { dispose: () => { } }; }
	registerAgentCompletionProvider() { return { dispose: () => { } }; }
	async getAgentCompletionItems() { return []; }
	registerChatParticipantDetectionProvider() { return { dispose: () => { } }; }
	async detectAgentOrCommand() { return undefined; }
	hasChatParticipantDetectionProviders() { return false; }
	async invokeAgent() { return {} as any; }
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

registerSingleton(IAiRelatedInformationService, NullAiRelatedInformationService, InstantiationType.Delayed);
registerSingleton(IChatAgentService, NullChatAgentService, InstantiationType.Delayed);
