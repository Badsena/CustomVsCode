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
import { CancellationToken } from '../../../../base/common/cancellation.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { IRequestService, asJson } from '../../../../platform/request/common/request.js';
import { IAuthenticationService } from '../../../../workbench/services/authentication/common/authentication.js';
const LOG_PREFIX = '[GitHubApiClient]';
const GITHUB_API_BASE = 'https://api.github.com';
const GITHUB_GRAPHQL_ENDPOINT = `${GITHUB_API_BASE}/graphql`;
export class GitHubApiError extends Error {
    constructor(message, statusCode, rateLimitRemaining) {
        super(message);
        this.statusCode = statusCode;
        this.rateLimitRemaining = rateLimitRemaining;
        this.name = 'GitHubApiError';
    }
}
/**
 * Low-level GitHub REST API client. Handles authentication,
 * request construction, and error classification.
 *
 * This class is stateless with respect to domain data — it only
 * manages auth tokens and raw HTTP communication.
 */
let GitHubApiClient = class GitHubApiClient extends Disposable {
    constructor(_requestService, _authenticationService, _logService) {
        super();
        this._requestService = _requestService;
        this._authenticationService = _authenticationService;
        this._logService = _logService;
    }
    async request(method, path, callSite, body) {
        return this._request(method, `${GITHUB_API_BASE}${path}`, path, 'application/vnd.github.v3+json', callSite, body);
    }
    async graphql(query, callSite, variables) {
        const response = await this._request('POST', GITHUB_GRAPHQL_ENDPOINT, '/graphql', 'application/vnd.github+json', callSite, { query, variables });
        if (response.errors?.length) {
            throw new GitHubApiError(response.errors.map(error => error.message).join('; '), 200, undefined);
        }
        if (!response.data) {
            throw new GitHubApiError('GitHub GraphQL response did not include data', 200, undefined);
        }
        return response.data;
    }
    async _request(method, url, pathForLogging, accept, callSite, body) {
        const token = await this._getAuthToken();
        this._logService.trace(`${LOG_PREFIX} ${method} ${pathForLogging}`);
        const response = await this._requestService.request({
            type: method,
            url,
            headers: {
                'Authorization': `token ${token}`,
                'Accept': accept,
                'User-Agent': 'VSCode-Sessions-GitHub',
                ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
            },
            data: body !== undefined ? JSON.stringify(body) : undefined,
            callSite
        }, CancellationToken.None);
        const rateLimitRemaining = parseRateLimitHeader(response.res.headers?.['x-ratelimit-remaining']);
        if (rateLimitRemaining !== undefined && rateLimitRemaining < 100) {
            this._logService.warn(`${LOG_PREFIX} GitHub API rate limit low: ${rateLimitRemaining} remaining`);
        }
        const statusCode = response.res.statusCode ?? 0;
        if (statusCode < 200 || statusCode >= 300) {
            const errorBody = await asJson(response).catch(() => undefined);
            throw new GitHubApiError(errorBody?.message ?? `GitHub API request failed: ${method} ${pathForLogging} (${statusCode})`, statusCode, rateLimitRemaining);
        }
        if (statusCode === 204) {
            return undefined;
        }
        const data = await asJson(response);
        if (!data) {
            throw new GitHubApiError(`Failed to parse response for ${method} ${pathForLogging}`, statusCode, rateLimitRemaining);
        }
        return data;
    }
    async _getAuthToken() {
        let sessions = await this._authenticationService.getSessions('github', [], { silent: true });
        if (!sessions || sessions.length === 0) {
            sessions = await this._authenticationService.getSessions('github', [], { createIfNone: true });
        }
        if (!sessions || sessions.length === 0) {
            throw new Error('No GitHub authentication sessions available');
        }
        return sessions[0].accessToken ?? '';
    }
};
GitHubApiClient = __decorate([
    __param(0, IRequestService),
    __param(1, IAuthenticationService),
    __param(2, ILogService)
], GitHubApiClient);
export { GitHubApiClient };
function parseRateLimitHeader(value) {
    if (value === undefined) {
        return undefined;
    }
    const str = Array.isArray(value) ? value[0] : value;
    const parsed = parseInt(str, 10);
    return isNaN(parsed) ? undefined : parsed;
}
//# sourceMappingURL=githubApiClient.js.map