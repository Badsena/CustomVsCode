/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
/**
 * Stateless fetcher for GitHub repository data.
 * All methods return raw typed data with no caching or state.
 */
export class GitHubRepositoryFetcher {
    constructor(_apiClient) {
        this._apiClient = _apiClient;
    }
    async getRepository(owner, repo) {
        const data = await this._apiClient.request('GET', `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`, 'githubApi.getRepository');
        return {
            owner: data.owner.login,
            name: data.name,
            fullName: data.full_name,
            defaultBranch: data.default_branch,
            isPrivate: data.private,
            description: data.description ?? '',
        };
    }
}
//# sourceMappingURL=githubRepositoryFetcher.js.map