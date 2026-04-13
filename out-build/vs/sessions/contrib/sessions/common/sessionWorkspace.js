/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
export const GITHUB_REMOTE_FILE_SCHEME = 'github-remote-file';
/**
 * Represents a workspace (folder or repository) for a session.
 * The workspace type (folder vs repo) is derived from the URI scheme.
 */
export class SessionWorkspace {
    constructor(uri, repository) {
        this.uri = uri;
        this.repository = repository;
    }
    /** Whether this is a local folder workspace. */
    get isFolder() {
        return this.uri.scheme !== GITHUB_REMOTE_FILE_SCHEME;
    }
    /** Whether this is a remote repository workspace. */
    get isRepo() {
        return this.uri.scheme === GITHUB_REMOTE_FILE_SCHEME;
    }
    /** Returns a new SessionWorkspace with the repository updated. */
    withRepository(repository) {
        return new SessionWorkspace(this.uri, repository);
    }
}
//# sourceMappingURL=sessionWorkspace.js.map