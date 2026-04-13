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
import { URI } from '../../../../../../../base/common/uri.js';
import { VSBuffer } from '../../../../../../../base/common/buffer.js';
import { FileType, IFileService } from '../../../../../../../platform/files/common/files.js';
import { dirname } from '../../../../../../../base/common/resources.js';
import { InMemoryFileSystemProvider } from '../../../../../../../platform/files/common/inMemoryFilesystemProvider.js';
import { ResourceMap } from '../../../../../../../base/common/map.js';
/**
 * Test file system provider that extends InMemoryFileSystemProvider with realpath support.
 * Allows tests to define custom realpath mappings to simulate symlinks.
 */
export class TestInMemoryFileSystemProviderWithRealPath extends InMemoryFileSystemProvider {
    constructor() {
        super(...arguments);
        this.realPathMappings = new ResourceMap();
    }
    get capabilities() {
        return super.capabilities | 262144 /* FileSystemProviderCapabilities.FileRealpath */;
    }
    /**
     * Defines a realpath mapping for a URI.
     * When realpath() is called for the given URI, it will return the mapped realPath.
     * Use this to simulate symlinks - multiple URIs can map to the same realPath.
     */
    setRealPath(uri, realPath) {
        this.realPathMappings.set(uri, realPath);
    }
    /**
     * Clears all realpath mappings.
     */
    clearRealPathMappings() {
        this.realPathMappings.clear();
    }
    /**
     * Returns the realpath for the given resource.
     * If a mapping was set via setRealPath(), returns that mapped path.
     * Otherwise returns the original path (simulating a non-symlink file).
     */
    async realpath(resource) {
        const mapped = this.realPathMappings.get(resource);
        if (mapped) {
            return mapped.path;
        }
        // Default: return original path (not a symlink)
        return resource.path;
    }
    /**
     * Override stat to mark files with realPath mappings as symbolic links.
     */
    async stat(resource) {
        const baseStat = await super.stat(resource);
        const isSymlink = this.realPathMappings.has(resource);
        if (isSymlink) {
            return {
                ...baseStat,
                type: baseStat.type | FileType.SymbolicLink
            };
        }
        return baseStat;
    }
    /**
     * Override readdir to mark files with realPath mappings as symbolic links.
     */
    async readdir(resource) {
        const entries = await super.readdir(resource);
        return entries.map(([name, type]) => {
            const childUri = URI.joinPath(resource, name);
            if (this.realPathMappings.has(childUri)) {
                return [name, type | FileType.SymbolicLink];
            }
            return [name, type];
        });
    }
}
/**
 * Creates mock filesystem from provided file entries.
 * @param fileService File service instance
 * @param files Array of file entries with path and contents
 */
export function mockFiles(fileService, files, parentFolder) {
    return new MockFilesystem(files, fileService).mock(parentFolder);
}
/**
 * Utility to recursively creates provided filesystem structure.
 */
let MockFilesystem = class MockFilesystem {
    constructor(input, fileService) {
        this.input = input;
        this.fileService = fileService;
        this.createdFiles = [];
        this.createdFolders = [];
        this.createdRootFolders = [];
    }
    /**
     * Starts the mock process.
     */
    async mock(parentFolder) {
        // Check if input is the new simplified format
        if (this.input.length > 0 && 'path' in this.input[0]) {
            return this.mockFromFileEntries(this.input);
        }
        // Use the old format
        return this.mockFromFolders(this.input, parentFolder);
    }
    /**
     * Mock using the new simplified file entry format.
     */
    async mockFromFileEntries(fileEntries) {
        // Create all files and their parent directories
        for (const fileEntry of fileEntries) {
            const fileUri = URI.file(fileEntry.path);
            // Ensure parent directories exist
            await this.ensureParentDirectories(dirname(fileUri));
            // Create the file
            const contents = fileEntry.contents.join('\n');
            await this.fileService.writeFile(fileUri, VSBuffer.fromString(contents));
            this.createdFiles.push(fileUri);
        }
    }
    /**
     * Mock using the old nested folder format.
     */
    async mockFromFolders(folders, parentFolder) {
        const result = await Promise.all(folders.map((folder) => this.mockFolder(folder, parentFolder)));
        this.createdRootFolders.push(...result);
    }
    async delete() {
        // Delete files created by the new format
        for (const fileUri of this.createdFiles) {
            if (await this.fileService.exists(fileUri)) {
                await this.fileService.del(fileUri, { useTrash: false });
            }
        }
        for (const folderUri of this.createdFolders.reverse()) { // reverse to delete children first
            if (await this.fileService.exists(folderUri)) {
                await this.fileService.del(folderUri, { recursive: true, useTrash: false });
            }
        }
        // Delete root folders created by the old format
        for (const folder of this.createdRootFolders) {
            await this.fileService.del(folder, { recursive: true, useTrash: false });
        }
    }
    /**
     * The internal implementation of the filesystem mocking process for the old format.
     */
    async mockFolder(folder, parentFolder) {
        const folderUri = parentFolder
            ? URI.joinPath(parentFolder, folder.name)
            : URI.file(folder.name);
        if (!(await this.fileService.exists(folderUri))) {
            try {
                await this.fileService.createFolder(folderUri);
            }
            catch (error) {
                throw new Error(`Failed to create folder '${folderUri.fsPath}': ${error}.`);
            }
        }
        const resolvedChildren = [];
        for (const child of folder.children) {
            const childUri = URI.joinPath(folderUri, child.name);
            // create child file
            if ('contents' in child) {
                const contents = (typeof child.contents === 'string')
                    ? child.contents
                    : child.contents.join('\n');
                await this.fileService.writeFile(childUri, VSBuffer.fromString(contents));
                resolvedChildren.push(childUri);
                continue;
            }
            // recursively create child filesystem structure
            resolvedChildren.push(await this.mockFolder(child, folderUri));
        }
        return folderUri;
    }
    /**
     * Ensures that all parent directories of the given file URI exist.
     */
    async ensureParentDirectories(dirUri) {
        if (!await this.fileService.exists(dirUri)) {
            // First ensure the parent directory exists (recursive call)
            if (dirUri.path !== '/') {
                await this.ensureParentDirectories(dirname(dirUri));
            }
            // Then create this directory
            try {
                await this.fileService.createFolder(dirUri);
                this.createdFolders.push(dirUri);
            }
            catch (error) {
                throw new Error(`Failed to create directory '${dirUri.toString()}': ${error}.`);
            }
        }
    }
};
MockFilesystem = __decorate([
    __param(1, IFileService)
], MockFilesystem);
export { MockFilesystem };
//# sourceMappingURL=mockFilesystem.js.map