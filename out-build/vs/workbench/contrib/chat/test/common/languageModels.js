/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Event } from '../../../../../base/common/event.js';
import { Disposable } from '../../../../../base/common/lifecycle.js';
import { observableValue } from '../../../../../base/common/observable.js';
export class NullLanguageModelsService {
    constructor() {
        this.onDidChangeLanguageModels = Event.None;
        this.onDidChangeLanguageModelVendors = Event.None;
        this.onDidChangeModelsControlManifest = Event.None;
        this.restrictedChatParticipants = observableValue('restrictedChatParticipants', Object.create(null));
    }
    registerLanguageModelProvider(vendor, provider) {
        return Disposable.None;
    }
    deltaLanguageModelChatProviderDescriptors(added, removed) {
    }
    updateModelPickerPreference(modelIdentifier, showInModelPicker) {
        return;
    }
    getVendors() {
        return [];
    }
    getLanguageModelIds() {
        return [];
    }
    lookupLanguageModel(identifier) {
        return undefined;
    }
    lookupLanguageModelByQualifiedName(qualifiedName) {
        return undefined;
    }
    getLanguageModels() {
        return [];
    }
    setContributedSessionModels() {
        return;
    }
    clearContributedSessionModels() {
        return;
    }
    getLanguageModelGroups(vendor) {
        return [];
    }
    async selectLanguageModels(selector) {
        return [];
    }
    sendChatRequest(identifier, from, messages, options, token) {
        throw new Error('Method not implemented.');
    }
    computeTokenLength(identifier, message, token) {
        throw new Error('Method not implemented.');
    }
    getModelConfiguration(_modelId) {
        return undefined;
    }
    async setModelConfiguration(_modelId, _values) {
    }
    getModelConfigurationActions(_modelId) {
        return [];
    }
    async configureLanguageModelsProviderGroup(vendorId, name) {
    }
    async configureModel(_modelId) {
    }
    async addLanguageModelsProviderGroup(name, vendorId, configuration) {
    }
    async removeLanguageModelsProviderGroup(vendorId, providerGroupName) {
    }
    async migrateLanguageModelsProviderGroup(languageModelsProviderGroup) { }
    getRecentlyUsedModelIds() {
        return [];
    }
    addToRecentlyUsedList() { }
    clearRecentlyUsedList() { }
    getModelsControlManifest() {
        return { free: {}, paid: {} };
    }
}
//# sourceMappingURL=languageModels.js.map