/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Iterable } from '../../../../../base/common/iterator.js';
import { Disposable, toDisposable } from '../../../../../base/common/lifecycle.js';
import { Schemas } from '../../../../../base/common/network.js';
import { derived, ObservableSet } from '../../../../../base/common/observable.js';
import { URI } from '../../../../../base/common/uri.js';
import { localize } from '../../../../../nls.js';
import { ByteSize } from '../../../../../platform/files/common/files.js';
import { createDecorator } from '../../../../../platform/instantiation/common/instantiation.js';
import { stringifyPromptElementJSON } from './promptTsxTypes.js';
/**
 * Check if a tool matches the given model metadata based on the tool's `models` selectors.
 * If the tool has no `models` defined, it matches all models.
 * If model is undefined, model-specific filtering is skipped (tool is included).
 */
export function toolMatchesModel(toolData, model) {
    // If no model selectors are defined, the tool is available for all models
    if (!toolData.models || toolData.models.length === 0) {
        return true;
    }
    // If model is undefined, skip model-specific filtering
    if (!model) {
        return true;
    }
    // Check if any selector matches the model (OR logic)
    return toolData.models.some(selector => (!selector.id || selector.id === model.id) &&
        (!selector.vendor || selector.vendor === model.vendor) &&
        (!selector.family || selector.family === model.family) &&
        (!selector.version || selector.version === model.version));
}
export var ToolDataSource;
(function (ToolDataSource) {
    ToolDataSource.Internal = { type: 'internal', label: 'Built-In' };
    /** External tools may not be contributed or invoked, but may be invoked externally and described in an IChatToolInvocationSerialized */
    ToolDataSource.External = { type: 'external', label: 'External' };
    function toKey(source) {
        switch (source.type) {
            case 'extension': return `extension:${source.extensionId.value}`;
            case 'mcp': return `mcp:${source.collectionId}:${source.definitionId}`;
            case 'user': return `user:${source.file.toString()}`;
            case 'internal': return 'internal';
            case 'external': return 'external';
        }
    }
    ToolDataSource.toKey = toKey;
    function equals(a, b) {
        return toKey(a) === toKey(b);
    }
    ToolDataSource.equals = equals;
    function classify(source) {
        if (source.type === 'internal') {
            return { ordinal: 1, label: localize(8972, null) };
        }
        else if (source.type === 'mcp') {
            return { ordinal: 2, label: source.label };
        }
        else if (source.type === 'user') {
            return { ordinal: 0, label: localize(8973, null) };
        }
        else {
            return { ordinal: 3, label: source.label };
        }
    }
    ToolDataSource.classify = classify;
})(ToolDataSource || (ToolDataSource = {}));
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function isToolInvocationContext(obj) {
    return obj !== null && typeof obj === 'object' && URI.isUri(obj.sessionResource);
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function isToolResultInputOutputDetails(obj) {
    return typeof obj === 'object' && typeof obj?.input === 'string' && (typeof obj?.output === 'string' || Array.isArray(obj?.output));
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function isToolResultOutputDetails(obj) {
    return typeof obj === 'object' && typeof obj?.output === 'object' && typeof obj?.output?.mimeType === 'string' && obj?.output?.type === 'data';
}
export function toolContentToA11yString(part) {
    return part.map(p => {
        switch (p.kind) {
            case 'promptTsx':
                return stringifyPromptTsxPart(p);
            case 'text':
                return p.value;
            case 'data':
                return localize(8974, null, ByteSize.formatSize(p.value.data.byteLength), p.value.mimeType || 'unknown');
        }
    }).join(', ');
}
export function toolResultHasBuffers(result) {
    return result.content.some(part => part.kind === 'data');
}
export function stringifyPromptTsxPart(part) {
    return stringifyPromptElementJSON(part.value);
}
export var ToolInvocationPresentation;
(function (ToolInvocationPresentation) {
    ToolInvocationPresentation["Hidden"] = "hidden";
    ToolInvocationPresentation["HiddenAfterComplete"] = "hiddenAfterComplete";
})(ToolInvocationPresentation || (ToolInvocationPresentation = {}));
export function isToolSet(obj) {
    return !!obj && obj.getTools !== undefined;
}
export class ToolSet {
    constructor(id, referenceName, icon, source, description, legacyFullNames, _contextKeyService) {
        this.id = id;
        this.referenceName = referenceName;
        this.icon = icon;
        this.source = source;
        this.description = description;
        this.legacyFullNames = legacyFullNames;
        this._contextKeyService = _contextKeyService;
        this._tools = new ObservableSet();
        this._toolSets = new ObservableSet();
        this.isHomogenous = derived(r => {
            return !Iterable.some(this._tools.observable.read(r), tool => !ToolDataSource.equals(tool.source, this.source))
                && !Iterable.some(this._toolSets.observable.read(r), toolSet => !ToolDataSource.equals(toolSet.source, this.source));
        });
    }
    addTool(data, tx) {
        this._tools.add(data, tx);
        return toDisposable(() => {
            this._tools.delete(data);
        });
    }
    addToolSet(toolSet, tx) {
        if (toolSet === this) {
            return Disposable.None;
        }
        this._toolSets.add(toolSet, tx);
        return toDisposable(() => {
            this._toolSets.delete(toolSet);
        });
    }
    getTools(r) {
        return Iterable.concat(Iterable.filter(this._tools.observable.read(r), toolData => this._contextKeyService.contextMatchesRules(toolData.when)), ...Iterable.map(this._toolSets.observable.read(r), toolSet => toolSet.getTools(r)));
    }
}
export class ToolSetForModel {
    get id() {
        return this._toolSet.id;
    }
    get referenceName() {
        return this._toolSet.referenceName;
    }
    get icon() {
        return this._toolSet.icon;
    }
    get source() {
        return this._toolSet.source;
    }
    get description() {
        return this._toolSet.description;
    }
    get legacyFullNames() {
        return this._toolSet.legacyFullNames;
    }
    constructor(_toolSet, model) {
        this._toolSet = _toolSet;
        this.model = model;
    }
    getTools(r) {
        return Iterable.filter(this._toolSet.getTools(r), toolData => toolMatchesModel(toolData, this.model));
    }
}
export const ILanguageModelToolsService = createDecorator('ILanguageModelToolsService');
export function createToolInputUri(toolCallId) {
    return URI.from({ scheme: Schemas.inMemory, path: `/lm/tool/${toolCallId}/tool_input.json` });
}
export function createToolSchemaUri(toolOrId) {
    if (typeof toolOrId !== 'string') {
        toolOrId = toolOrId.id;
    }
    return URI.from({ scheme: Schemas.vscode, authority: 'schemas', path: `/lm/tool/${toolOrId}` });
}
export var SpecedToolAliases;
(function (SpecedToolAliases) {
    SpecedToolAliases.execute = 'execute';
    SpecedToolAliases.edit = 'edit';
    SpecedToolAliases.search = 'search';
    SpecedToolAliases.agent = 'agent';
    SpecedToolAliases.read = 'read';
    SpecedToolAliases.web = 'web';
    SpecedToolAliases.todo = 'todo';
})(SpecedToolAliases || (SpecedToolAliases = {}));
export var VSCodeToolReference;
(function (VSCodeToolReference) {
    VSCodeToolReference.runSubagent = 'runSubagent';
    VSCodeToolReference.vscode = 'vscode';
})(VSCodeToolReference || (VSCodeToolReference = {}));
//# sourceMappingURL=languageModelToolsService.js.map