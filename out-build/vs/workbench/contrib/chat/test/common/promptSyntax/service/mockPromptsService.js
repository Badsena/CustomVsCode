/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Emitter, Event } from '../../../../../../../base/common/event.js';
export class MockPromptsService {
    constructor() {
        this._onDidChangeCustomAgents = new Emitter();
        this.onDidChangeCustomAgents = this._onDidChangeCustomAgents.event;
        this._onDidLogDiscovery = new Emitter();
        this.onDidLogDiscovery = this._onDidLogDiscovery.event;
        this._customModes = [];
        this.onDidChangeInstructions = Event.None;
        this.onDidChangePromptFiles = Event.None;
        this.onDidChangeSkills = Event.None;
    }
    setCustomModes(modes) {
        this._customModes = modes;
        this._onDidChangeCustomAgents.fire();
    }
    async getCustomAgents(token, sessionResource) {
        return this._customModes;
    }
    // Stub implementations for required interface methods
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    getSyntaxParserFor(_model) { throw new Error('Not implemented'); }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    listPromptFiles(_type) { throw new Error('Not implemented'); }
    listPromptFilesForStorage(type, storage, token) { throw new Error('Not implemented'); }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    getSourceFolders(_type) { throw new Error('Not implemented'); }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    getResolvedSourceFolders(_type) { throw new Error('Not implemented'); }
    isValidSlashCommandName(_command) { return false; }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolvePromptSlashCommand(command, _token) { throw new Error('Not implemented'); }
    get onDidChangeSlashCommands() { throw new Error('Not implemented'); }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    getPromptSlashCommands(_token, _sessionResource) { throw new Error('Not implemented'); }
    getPromptSlashCommandName(uri, _token) { throw new Error('Not implemented'); }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    parse(_uri, _type, _token) { throw new Error('Not implemented'); }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    parseNew(_uri, _token) { throw new Error('Not implemented'); }
    getParsedPromptFile(textModel) { throw new Error('Not implemented'); }
    registerContributedFile(type, uri, extension, name, description, when) { throw new Error('Not implemented'); }
    getPromptLocationLabel(promptPath) { throw new Error('Not implemented'); }
    listNestedAgentMDs(token) { throw new Error('Not implemented'); }
    listAgentInstructions(token) { throw new Error('Not implemented'); }
    getAgentFileURIFromModeFile(oldURI) { throw new Error('Not implemented'); }
    getDisabledPromptFiles(type) { throw new Error('Method not implemented.'); }
    setDisabledPromptFiles(type, uris) { throw new Error('Method not implemented.'); }
    registerPromptFileProvider(extension, type, provider) { throw new Error('Method not implemented.'); }
    findAgentSkills(token, sessionResource) { throw new Error('Method not implemented.'); }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    getHooks(_token, _sessionResource) { throw new Error('Method not implemented.'); }
    getInstructionFiles(_token, _sessionResource) { throw new Error('Method not implemented.'); }
    dispose() { }
}
//# sourceMappingURL=mockPromptsService.js.map