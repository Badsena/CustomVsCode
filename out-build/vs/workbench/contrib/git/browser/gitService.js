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
import { BugIndicatingError } from '../../../../base/common/errors.js';
import { Disposable, toDisposable } from '../../../../base/common/lifecycle.js';
import { observableValueOpts } from '../../../../base/common/observable.js';
import { structuralEquals } from '../../../../base/common/equals.js';
import { AutoOpenBarrier } from '../../../../base/common/async.js';
import { ILogService } from '../../../../platform/log/common/log.js';
let GitService = class GitService extends Disposable {
    get repositories() {
        return this._delegate?.repositories ?? [];
    }
    constructor(logService) {
        super();
        this.logService = logService;
        this._delegateBarrier = new AutoOpenBarrier(10_000);
    }
    setDelegate(delegate) {
        // The delegate can only be set once, since the vscode.git
        // extension can only run in one extension host process per
        // window.
        if (this._delegate) {
            this.logService.error('[GitService][setDelegate] GitExtension delegate is already set.');
            throw new BugIndicatingError('GitExtension delegate is already set.');
        }
        this._delegate = delegate;
        this._delegateBarrier.open();
        return toDisposable(() => {
            this._delegate = undefined;
        });
    }
    async openRepository(uri) {
        // We need to wait for the delegate to be set before we can open a repository.
        // At the moment we are waiting for 10 seconds before we automatically open the
        // barrier.
        await this._delegateBarrier.wait();
        if (!this._delegate) {
            this.logService.warn('[GitService][openRepository] GitExtension delegate is not set after 10 seconds. Cannot open repository.');
            return undefined;
        }
        return this._delegate.openRepository(uri);
    }
};
GitService = __decorate([
    __param(0, ILogService)
], GitService);
export { GitService };
export class GitRepository extends Disposable {
    updateState(state) {
        this.state.set(state, undefined);
    }
    constructor(rootUri, initialState, delegate) {
        super();
        this.delegate = delegate;
        this.rootUri = rootUri;
        this.state = observableValueOpts({ owner: this, equalsFn: structuralEquals }, initialState);
    }
    async getRefs(query, token) {
        return this.delegate.getRefs(this.rootUri, query, token);
    }
    async diffBetweenWithStats(ref1, ref2, path) {
        return this.delegate.diffBetweenWithStats(this.rootUri, ref1, ref2, path);
    }
    async diffBetweenWithStats2(ref, path) {
        return this.delegate.diffBetweenWithStats2(this.rootUri, ref, path);
    }
}
//# sourceMappingURL=gitService.js.map