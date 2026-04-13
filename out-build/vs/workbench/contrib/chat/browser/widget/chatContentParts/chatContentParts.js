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
import { Disposable, ReferenceCollection } from '../../../../../../base/common/lifecycle.js';
import { IModelService } from '../../../../../../editor/common/services/model.js';
/**
 * Ref-counted collection of inline text models keyed by URI. Models are
 * created on first acquire and disposed only when the last reference is
 * released, preventing duplicate-model errors during re-renders.
 */
let InlineTextModelCollection = class InlineTextModelCollection extends Disposable {
    constructor(modelService) {
        super();
        this._collection = new InlineTextModelReferenceCollection(modelService);
    }
    acquire(uri, value, languageSelection, isForSimpleWidget) {
        return this._collection.acquire(uri.toString(), uri, value, languageSelection, isForSimpleWidget);
    }
};
InlineTextModelCollection = __decorate([
    __param(0, IModelService)
], InlineTextModelCollection);
export { InlineTextModelCollection };
class InlineTextModelReferenceCollection extends ReferenceCollection {
    constructor(modelService) {
        super();
        this.modelService = modelService;
    }
    createReferencedObject(key, uri, value, languageSelection, isForSimpleWidget) {
        return this.modelService.createModel(value, languageSelection, uri, isForSimpleWidget);
    }
    destroyReferencedObject(_key, model) {
        model.dispose();
    }
}
//# sourceMappingURL=chatContentParts.js.map