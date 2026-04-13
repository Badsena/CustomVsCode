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
import { VSBuffer } from '../../../../base/common/buffer.js';
import { Emitter } from '../../../../base/common/event.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { localize } from '../../../../nls.js';
import { IFileService } from '../../../../platform/files/common/files.js';
import { IUriIdentityService } from '../../../../platform/uriIdentity/common/uriIdentity.js';
import { IEditorService } from '../../../services/editor/common/editorService.js';
import { ITextEditorService } from '../../../services/textfile/common/textEditorService.js';
import { IUserDataProfileService } from '../../../services/userDataProfile/common/userDataProfile.js';
import { equals } from '../../../../base/common/objects.js';
import { visit } from '../../../../base/common/json.js';
import { ITextModelService } from '../../../../editor/common/services/resolverService.js';
import { ITextFileService } from '../../../services/textfile/common/textfiles.js';
import { getCodeEditor } from '../../../../editor/browser/editorBrowser.js';
import { SnippetController2 } from '../../../../editor/contrib/snippet/browser/snippetController2.js';
import { ILanguageModelsConfigurationService } from '../common/languageModelsConfiguration.js';
import { Extensions as JSONExtensions } from '../../../../platform/jsonschemas/common/jsonContributionRegistry.js';
import { Registry } from '../../../../platform/registry/common/platform.js';
import { ILanguageModelsService } from '../common/languageModels.js';
let LanguageModelsConfigurationService = class LanguageModelsConfigurationService extends Disposable {
    get configurationFile() { return this.modelsConfigurationFile; }
    constructor(fileService, textFileService, textModelService, editorService, textEditorService, userDataProfileService, uriIdentityService) {
        super();
        this.fileService = fileService;
        this.textFileService = textFileService;
        this.textModelService = textModelService;
        this.editorService = editorService;
        this.textEditorService = textEditorService;
        this._onDidChangeLanguageModelGroups = this._register(new Emitter());
        this.onDidChangeLanguageModelGroups = this._onDidChangeLanguageModelGroups.event;
        this.languageModelsProviderGroups = [];
        this.modelsConfigurationFile = uriIdentityService.extUri.joinPath(userDataProfileService.currentProfile.location, 'chatLanguageModels.json');
        this.updateLanguageModelsConfiguration();
        this._register(fileService.watch(this.modelsConfigurationFile));
        this._register(fileService.onDidFilesChange(e => {
            if (e.contains(this.modelsConfigurationFile)) {
                this.updateLanguageModelsConfiguration();
            }
        }));
    }
    setLanguageModelsConfiguration(languageModelsConfiguration) {
        const changedGroups = [];
        const oldGroupMap = new Map(this.languageModelsProviderGroups.map(g => [`${g.vendor}:${g.name}`, g]));
        const newGroupMap = new Map(languageModelsConfiguration.map(g => [`${g.vendor}:${g.name}`, g]));
        // Find added or modified groups
        for (const [key, newGroup] of newGroupMap) {
            const oldGroup = oldGroupMap.get(key);
            if (!oldGroup || !equals(oldGroup, newGroup)) {
                changedGroups.push(newGroup);
            }
        }
        // Find removed groups
        for (const [key, oldGroup] of oldGroupMap) {
            if (!newGroupMap.has(key)) {
                changedGroups.push(oldGroup);
            }
        }
        this.languageModelsProviderGroups = languageModelsConfiguration;
        if (changedGroups.length > 0) {
            this._onDidChangeLanguageModelGroups.fire(changedGroups);
        }
    }
    async updateLanguageModelsConfiguration() {
        const languageModelsProviderGroups = await this.withLanguageModelsProviderGroups();
        this.setLanguageModelsConfiguration(languageModelsProviderGroups);
    }
    getLanguageModelsProviderGroups() {
        return this.languageModelsProviderGroups;
    }
    async addLanguageModelsProviderGroup(toAdd) {
        await this.withLanguageModelsProviderGroups(async (languageModelsProviderGroups) => {
            if (languageModelsProviderGroups.some(({ name, vendor }) => name === toAdd.name && vendor === toAdd.vendor)) {
                throw new Error(`Language model group with name ${toAdd.name} already exists for vendor ${toAdd.vendor}`);
            }
            languageModelsProviderGroups.push(toAdd);
            return languageModelsProviderGroups;
        });
        await this.updateLanguageModelsConfiguration();
        const result = this.getLanguageModelsProviderGroups().find(group => group.name === toAdd.name && group.vendor === toAdd.vendor);
        if (!result) {
            throw new Error(`Language model group with name ${toAdd.name} not found for vendor ${toAdd.vendor}`);
        }
        return result;
    }
    async updateLanguageModelsProviderGroup(from, to) {
        await this.withLanguageModelsProviderGroups(async (languageModelsProviderGroups) => {
            const result = [];
            for (const group of languageModelsProviderGroups) {
                if (group.name === from.name && group.vendor === from.vendor) {
                    result.push(to);
                }
                else {
                    result.push(group);
                }
            }
            return result;
        });
        await this.updateLanguageModelsConfiguration();
        const result = this.getLanguageModelsProviderGroups().find(group => group.name === to.name && group.vendor === to.vendor);
        if (!result) {
            throw new Error(`Language model group with name ${to.name} not found for vendor ${to.vendor}`);
        }
        return result;
    }
    async removeLanguageModelsProviderGroup(toRemove) {
        await this.withLanguageModelsProviderGroups(async (languageModelsProviderGroups) => {
            const result = [];
            for (const group of languageModelsProviderGroups) {
                if (group.name === toRemove.name && group.vendor === toRemove.vendor) {
                    continue;
                }
                result.push(group);
            }
            return result;
        });
        await this.updateLanguageModelsConfiguration();
    }
    async configureLanguageModels(options) {
        const editor = await this.editorService.openEditor(this.textEditorService.createTextEditor({ resource: this.modelsConfigurationFile }));
        if (!editor || !options?.group) {
            return;
        }
        const codeEditor = getCodeEditor(editor.getControl());
        if (!codeEditor) {
            return;
        }
        if (!options.group.range) {
            return;
        }
        if (options.snippet) {
            // Insert snippet at the end of the last property line (before the closing brace line), with comma prepended
            const model = codeEditor.getModel();
            if (!model) {
                return;
            }
            const lastPropertyLine = options.group.range.endLineNumber - 1;
            const lastPropertyLineLength = model.getLineLength(lastPropertyLine);
            const insertPosition = { lineNumber: lastPropertyLine, column: lastPropertyLineLength + 1 };
            codeEditor.setPosition(insertPosition);
            codeEditor.revealPositionNearTop(insertPosition);
            codeEditor.focus();
            SnippetController2.get(codeEditor)?.insert(',\n' + options.snippet);
        }
        else {
            const position = { lineNumber: options.group.range.startLineNumber, column: options.group.range.startColumn };
            codeEditor.setPosition(position);
            codeEditor.revealPositionNearTop(position);
            codeEditor.focus();
        }
    }
    async withLanguageModelsProviderGroups(update) {
        const exists = await this.fileService.exists(this.modelsConfigurationFile);
        if (!exists) {
            await this.fileService.writeFile(this.modelsConfigurationFile, VSBuffer.fromString(JSON.stringify([], undefined, '\t')));
        }
        const ref = await this.textModelService.createModelReference(this.modelsConfigurationFile);
        const model = ref.object.textEditorModel;
        try {
            const languageModelsProviderGroups = parseLanguageModelsProviderGroups(model);
            if (!update) {
                return languageModelsProviderGroups;
            }
            const updatedLanguageModelsProviderGroups = await update(languageModelsProviderGroups);
            for (const group of updatedLanguageModelsProviderGroups) {
                delete group.range;
            }
            model.setValue(JSON.stringify(updatedLanguageModelsProviderGroups, undefined, '\t'));
            await this.textFileService.save(this.modelsConfigurationFile);
            return updatedLanguageModelsProviderGroups;
        }
        finally {
            ref.dispose();
        }
    }
};
LanguageModelsConfigurationService = __decorate([
    __param(0, IFileService),
    __param(1, ITextFileService),
    __param(2, ITextModelService),
    __param(3, IEditorService),
    __param(4, ITextEditorService),
    __param(5, IUserDataProfileService),
    __param(6, IUriIdentityService)
], LanguageModelsConfigurationService);
export { LanguageModelsConfigurationService };
export function parseLanguageModelsProviderGroups(model) {
    const configuration = [];
    let currentProperty = null;
    let currentParent = configuration;
    const previousParents = [];
    function onValue(value, offset, length) {
        if (Array.isArray(currentParent)) {
            currentParent.push(value);
        }
        else if (currentProperty !== null) {
            currentParent[currentProperty] = value;
        }
    }
    const visitor = {
        onObjectBegin: (offset, length) => {
            const object = {};
            if (previousParents.length === 1 && Array.isArray(currentParent)) {
                const start = model.getPositionAt(offset);
                const end = model.getPositionAt(offset + length);
                object.range = {
                    startLineNumber: start.lineNumber,
                    startColumn: start.column,
                    endLineNumber: end.lineNumber,
                    endColumn: end.column
                };
            }
            onValue(object, offset, length);
            previousParents.push(currentParent);
            currentParent = object;
            currentProperty = null;
        },
        onObjectProperty: (name, offset, length) => {
            currentProperty = name;
        },
        onObjectEnd: (offset, length) => {
            const parent = currentParent;
            if (parent.range) {
                const end = model.getPositionAt(offset + length);
                parent.range = {
                    startLineNumber: parent.range.startLineNumber,
                    startColumn: parent.range.startColumn,
                    endLineNumber: end.lineNumber,
                    endColumn: end.column
                };
            }
            if (parent._parentConfigurationRange) {
                const end = model.getPositionAt(offset + length);
                parent._parentConfigurationRange.endLineNumber = end.lineNumber;
                parent._parentConfigurationRange.endColumn = end.column;
                delete parent._parentConfigurationRange;
            }
            currentParent = previousParents.pop();
        },
        onArrayBegin: (offset, length) => {
            if (currentParent === configuration && previousParents.length === 0) {
                previousParents.push(currentParent);
                currentProperty = null;
                return;
            }
            const array = [];
            onValue(array, offset, length);
            previousParents.push(currentParent);
            currentParent = array;
            currentProperty = null;
        },
        onArrayEnd: (offset, length) => {
            const parent = currentParent;
            if (parent._parentConfigurationRange) {
                const end = model.getPositionAt(offset + length);
                parent._parentConfigurationRange.endLineNumber = end.lineNumber;
                parent._parentConfigurationRange.endColumn = end.column;
                delete parent._parentConfigurationRange;
            }
            currentParent = previousParents.pop();
        },
        onLiteralValue: (value, offset, length) => {
            onValue(value, offset, length);
        },
    };
    visit(model.getValue(), visitor);
    return configuration;
}
const languageModelsSchemaId = 'vscode://schemas/language-models';
let ChatLanguageModelsDataContribution = class ChatLanguageModelsDataContribution extends Disposable {
    static { this.ID = 'workbench.contrib.chatLanguageModelsData'; }
    constructor(languageModelsService, languageModelsConfigurationService) {
        super();
        this.languageModelsService = languageModelsService;
        const registry = Registry.as(JSONExtensions.JSONContribution);
        this._register(registry.registerSchemaAssociation(languageModelsSchemaId, languageModelsConfigurationService.configurationFile.toString()));
        this.updateSchema(registry);
        this._register(this.languageModelsService.onDidChangeLanguageModels(() => this.updateSchema(registry)));
    }
    updateSchema(registry) {
        const vendors = this.languageModelsService.getVendors();
        // Build per-model configuration schemas
        const modelSchemas = [];
        const modelIds = this.languageModelsService.getLanguageModelIds();
        for (const modelId of modelIds) {
            const metadata = this.languageModelsService.lookupLanguageModel(modelId);
            if (metadata?.configurationSchema) {
                modelSchemas.push({
                    if: {
                        properties: {
                            vendor: { const: metadata.vendor }
                        }
                    },
                    then: {
                        properties: {
                            settings: {
                                type: 'object',
                                properties: {
                                    [metadata.id]: metadata.configurationSchema
                                }
                            }
                        }
                    }
                });
            }
        }
        const schema = {
            type: 'array',
            items: {
                properties: {
                    vendor: {
                        type: 'string',
                        enum: vendors.map(v => v.vendor)
                    },
                    name: { type: 'string' },
                    settings: {
                        type: 'object',
                        description: localize(7570, null),
                    }
                },
                allOf: [
                    ...vendors.map(vendor => ({
                        if: {
                            properties: {
                                vendor: { const: vendor.vendor }
                            }
                        },
                        then: vendor.configuration
                    })),
                    ...modelSchemas
                ],
                required: ['vendor', 'name']
            }
        };
        registry.registerSchema(languageModelsSchemaId, schema);
    }
};
ChatLanguageModelsDataContribution = __decorate([
    __param(0, ILanguageModelsService),
    __param(1, ILanguageModelsConfigurationService)
], ChatLanguageModelsDataContribution);
export { ChatLanguageModelsDataContribution };
//# sourceMappingURL=languageModelsConfigurationService.js.map