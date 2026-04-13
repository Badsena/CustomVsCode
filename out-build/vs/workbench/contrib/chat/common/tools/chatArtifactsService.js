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
import { Emitter } from '../../../../../base/common/event.js';
import { Disposable } from '../../../../../base/common/lifecycle.js';
import { observableValueOpts } from '../../../../../base/common/observable.js';
import { createDecorator } from '../../../../../platform/instantiation/common/instantiation.js';
import { IStorageService } from '../../../../../platform/storage/common/storage.js';
import { Memento } from '../../../../common/memento.js';
import { chatSessionResourceToId } from '../model/chatUri.js';
export const IChatArtifactsService = createDecorator('chatArtifactsService');
let ChatArtifactsStorage = class ChatArtifactsStorage {
    constructor(storageService) {
        this._memento = new Memento('chat-artifacts', storageService);
    }
    getArtifacts(sessionResource) {
        const storage = this._memento.getMemento(1 /* StorageScope.WORKSPACE */, 1 /* StorageTarget.MACHINE */);
        return storage[this._toKey(sessionResource)] || [];
    }
    setArtifacts(sessionResource, artifacts) {
        const storage = this._memento.getMemento(1 /* StorageScope.WORKSPACE */, 1 /* StorageTarget.MACHINE */);
        storage[this._toKey(sessionResource)] = artifacts;
        this._memento.saveMemento();
    }
    migrateArtifacts(oldSessionResource, newSessionResource) {
        const artifacts = this.getArtifacts(oldSessionResource);
        if (artifacts.length > 0) {
            this.setArtifacts(newSessionResource, artifacts);
            const storage = this._memento.getMemento(1 /* StorageScope.WORKSPACE */, 1 /* StorageTarget.MACHINE */);
            delete storage[this._toKey(oldSessionResource)];
            this._memento.saveMemento();
        }
    }
    _toKey(sessionResource) {
        return chatSessionResourceToId(sessionResource);
    }
};
ChatArtifactsStorage = __decorate([
    __param(0, IStorageService)
], ChatArtifactsStorage);
let ChatArtifactsService = class ChatArtifactsService extends Disposable {
    constructor(storageService) {
        super();
        this._onDidUpdateArtifacts = this._register(new Emitter());
        this.onDidUpdateArtifacts = this._onDidUpdateArtifacts.event;
        this._observables = new Map();
        this._storage = new ChatArtifactsStorage(storageService);
    }
    getArtifacts(sessionResource) {
        return this._storage.getArtifacts(sessionResource);
    }
    setArtifacts(sessionResource, artifacts) {
        this._storage.setArtifacts(sessionResource, artifacts);
        const key = chatSessionResourceToId(sessionResource);
        this._observables.get(key)?.set(artifacts, undefined);
        this._onDidUpdateArtifacts.fire(sessionResource);
    }
    migrateArtifacts(oldSessionResource, newSessionResource) {
        this._storage.migrateArtifacts(oldSessionResource, newSessionResource);
        this._onDidUpdateArtifacts.fire(newSessionResource);
    }
    artifacts(sessionResource) {
        const key = chatSessionResourceToId(sessionResource);
        let obs = this._observables.get(key);
        if (!obs) {
            obs = observableValueOpts({ owner: this, equalsFn: () => false }, this._storage.getArtifacts(sessionResource));
            this._observables.set(key, obs);
        }
        return obs;
    }
};
ChatArtifactsService = __decorate([
    __param(0, IStorageService)
], ChatArtifactsService);
export { ChatArtifactsService };
//# sourceMappingURL=chatArtifactsService.js.map