/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Disposable } from '../../../../../base/common/lifecycle.js';
import { observableValue } from '../../../../../base/common/observable.js';
const LOG_PREFIX = '[GitHubRepositoryModel]';
/**
 * Reactive model for a GitHub repository. Wraps fetcher data
 * in observables and supports on-demand refresh.
 */
export class GitHubRepositoryModel extends Disposable {
    constructor(owner, repo, _fetcher, _logService) {
        super();
        this.owner = owner;
        this.repo = repo;
        this._fetcher = _fetcher;
        this._logService = _logService;
        this._repository = observableValue(this, undefined);
        this.repository = this._repository;
    }
    async refresh() {
        try {
            const data = await this._fetcher.getRepository(this.owner, this.repo);
            this._repository.set(data, undefined);
        }
        catch (err) {
            this._logService.error(`${LOG_PREFIX} Failed to refresh repository ${this.owner}/${this.repo}:`, err);
        }
    }
}
//# sourceMappingURL=githubRepositoryModel.js.map