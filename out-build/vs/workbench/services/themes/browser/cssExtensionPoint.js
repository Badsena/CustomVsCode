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
import * as nls from '../../../../nls.js';
import { ExtensionsRegistry } from '../../extensions/common/extensionsRegistry.js';
import { isProposedApiEnabled } from '../../extensions/common/extensions.js';
import * as resources from '../../../../base/common/resources.js';
import { IFileService } from '../../../../platform/files/common/files.js';
import { IBrowserWorkbenchEnvironmentService } from '../../environment/browser/environmentService.js';
import { DisposableStore, toDisposable } from '../../../../base/common/lifecycle.js';
import { URI } from '../../../../base/common/uri.js';
import { FileAccess } from '../../../../base/common/network.js';
import { createLinkElement } from '../../../../base/browser/dom.js';
import { IWorkbenchThemeService } from '../common/workbenchThemeService.js';
import { IStorageService } from '../../../../platform/storage/common/storage.js';
import { ExtensionIdentifier } from '../../../../platform/extensions/common/extensions.js';
const CSS_CACHE_STORAGE_KEY = 'workbench.contrib.css.cache';
const cssExtensionPoint = ExtensionsRegistry.registerExtensionPoint({
    extensionPoint: 'css',
    jsonSchema: {
        description: nls.localize(18746, null),
        type: 'array',
        items: {
            type: 'object',
            properties: {
                path: {
                    description: nls.localize(18747, null),
                    type: 'string'
                }
            },
            required: ['path']
        },
        defaultSnippets: [{ body: [{ path: '${1:styles.css}' }] }]
    }
});
class CSSFileWatcher {
    constructor(fileService, environmentService, onUpdate) {
        this.fileService = fileService;
        this.environmentService = environmentService;
        this.onUpdate = onUpdate;
        this.watchedLocations = new Map();
    }
    watch(uri) {
        const key = uri.toString();
        if (this.watchedLocations.has(key)) {
            return;
        }
        if (!this.environmentService.isExtensionDevelopment) {
            return;
        }
        const disposables = new DisposableStore();
        disposables.add(this.fileService.watch(uri));
        disposables.add(this.fileService.onDidFilesChange(e => {
            if (e.contains(uri, 0 /* FileChangeType.UPDATED */)) {
                this.onUpdate(uri);
            }
        }));
        this.watchedLocations.set(key, { uri, disposables });
    }
    unwatch(uri) {
        const key = uri.toString();
        const entry = this.watchedLocations.get(key);
        if (entry) {
            entry.disposables.dispose();
            this.watchedLocations.delete(key);
        }
    }
    dispose() {
        for (const entry of this.watchedLocations.values()) {
            entry.disposables.dispose();
        }
        this.watchedLocations.clear();
    }
}
let CSSExtensionPoint = class CSSExtensionPoint {
    constructor(fileService, environmentService, themeService, storageService) {
        this.themeService = themeService;
        this.storageService = storageService;
        this.disposables = new DisposableStore();
        this.stylesheetsByExtension = new Map();
        this.pendingExtensions = new Map();
        this.watcher = this.disposables.add(new CSSFileWatcher(fileService, environmentService, uri => this.reloadStylesheet(uri)));
        this.disposables.add(toDisposable(() => {
            for (const entries of this.stylesheetsByExtension.values()) {
                for (const entry of entries) {
                    entry.disposables.dispose();
                }
            }
            this.stylesheetsByExtension.clear();
        }));
        // Apply cached CSS immediately on startup if a theme from the cached extension is active
        this.applyCachedCSS();
        // Listen to theme changes to activate/deactivate CSS
        this.disposables.add(this.themeService.onDidColorThemeChange(() => this.onThemeChange()));
        this.disposables.add(this.themeService.onDidFileIconThemeChange(() => this.onThemeChange()));
        this.disposables.add(this.themeService.onDidProductIconThemeChange(() => this.onThemeChange()));
        cssExtensionPoint.setHandler((extensions, delta) => {
            // Handle removed extensions
            for (const extension of delta.removed) {
                const extensionId = extension.description.identifier.value;
                this.pendingExtensions.delete(extensionId);
                this.removeStylesheets(extensionId);
                this.clearCacheForExtension(extensionId);
            }
            // Handle added extensions
            for (const extension of delta.added) {
                if (!isProposedApiEnabled(extension.description, 'css')) {
                    extension.collector.error(`The '${cssExtensionPoint.name}' contribution point is proposed API.`);
                    continue;
                }
                const extensionValue = extension.value;
                const collector = extension.collector;
                if (!extensionValue || !Array.isArray(extensionValue)) {
                    collector.error(nls.localize(18748, null));
                    continue;
                }
                const extensionId = extension.description.identifier.value;
                // Store the extension for later activation
                this.pendingExtensions.set(extensionId, extension);
                // Check if this extension's theme is currently active
                if (this.isExtensionThemeActive(extensionId)) {
                    this.activateExtensionCSS(extension);
                }
                else if (this.stylesheetsByExtension.has(extensionId)) {
                    // Theme is no longer active but cached CSS is still loaded — remove it
                    this.removeStylesheets(extensionId);
                    this.clearCacheForExtension(extensionId);
                }
            }
        });
    }
    isExtensionThemeActive(extensionId) {
        const colorTheme = this.themeService.getColorTheme();
        const fileIconTheme = this.themeService.getFileIconTheme();
        const productIconTheme = this.themeService.getProductIconTheme();
        return !!(colorTheme.extensionData && ExtensionIdentifier.equals(colorTheme.extensionData.extensionId, extensionId)) ||
            !!(fileIconTheme.extensionData && ExtensionIdentifier.equals(fileIconTheme.extensionData.extensionId, extensionId)) ||
            !!(productIconTheme.extensionData && ExtensionIdentifier.equals(productIconTheme.extensionData.extensionId, extensionId));
    }
    onThemeChange() {
        // Activate pending extensions whose theme just became active
        for (const [extensionId, extension] of this.pendingExtensions) {
            if (!this.stylesheetsByExtension.has(extensionId) && this.isExtensionThemeActive(extensionId)) {
                this.activateExtensionCSS(extension);
            }
        }
        // Deactivate all extensions whose theme is no longer active,
        // including cached CSS that may not yet be in pendingExtensions
        for (const extensionId of this.stylesheetsByExtension.keys()) {
            if (!this.isExtensionThemeActive(extensionId)) {
                this.removeStylesheets(extensionId);
                this.clearCacheForExtension(extensionId);
            }
        }
    }
    activateExtensionCSS(extension) {
        const extensionId = extension.description.identifier.value;
        // Already activated (e.g., from cache on startup)
        if (this.stylesheetsByExtension.has(extensionId)) {
            return;
        }
        const extensionLocation = extension.description.extensionLocation;
        const extensionValue = extension.value;
        const collector = extension.collector;
        const entries = [];
        const cssLocations = [];
        for (const cssContribution of extensionValue) {
            if (!cssContribution.path || typeof cssContribution.path !== 'string') {
                collector.error(nls.localize(18749, null));
                continue;
            }
            const cssLocation = resources.joinPath(extensionLocation, cssContribution.path);
            // Validate that the CSS file is within the extension folder
            if (!resources.isEqualOrParent(cssLocation, extensionLocation)) {
                collector.warn(nls.localize(18750, null, cssLocation.path, extensionLocation.path));
                continue;
            }
            const entryDisposables = new DisposableStore();
            const element = this.createCSSLinkElement(cssLocation, extensionId, entryDisposables);
            entries.push({ uri: cssLocation, element, disposables: entryDisposables });
            cssLocations.push(cssLocation.toString());
            // Watch for changes
            this.watcher.watch(cssLocation);
        }
        if (entries.length > 0) {
            this.stylesheetsByExtension.set(extensionId, entries);
            // Cache the CSS locations for faster startup next time
            this.cacheExtensionCSS(extensionId, cssLocations);
        }
    }
    removeStylesheets(extensionId) {
        const entries = this.stylesheetsByExtension.get(extensionId);
        if (entries) {
            for (const entry of entries) {
                this.watcher.unwatch(entry.uri);
                entry.disposables.dispose();
            }
            this.stylesheetsByExtension.delete(extensionId);
        }
    }
    applyCachedCSS() {
        const cached = this.getCachedCSS();
        if (!cached) {
            return;
        }
        // Check if a theme from the cached extension is active
        if (!this.isExtensionThemeActive(cached.extensionId)) {
            // Theme changed, invalidate the cache
            this.clearCacheForExtension(cached.extensionId);
            return;
        }
        // Apply cached CSS immediately
        const entries = [];
        for (const cssLocationString of cached.cssLocations) {
            const cssLocation = URI.parse(cssLocationString);
            const entryDisposables = new DisposableStore();
            const element = this.createCSSLinkElement(cssLocation, cached.extensionId, entryDisposables);
            entries.push({ uri: cssLocation, element, disposables: entryDisposables });
            // Watch for changes
            this.watcher.watch(cssLocation);
        }
        if (entries.length > 0) {
            this.stylesheetsByExtension.set(cached.extensionId, entries);
        }
    }
    getCachedCSS() {
        const raw = this.storageService.get(CSS_CACHE_STORAGE_KEY, 0 /* StorageScope.PROFILE */);
        if (!raw) {
            return undefined;
        }
        try {
            return JSON.parse(raw);
        }
        catch {
            return undefined;
        }
    }
    cacheExtensionCSS(extensionId, cssLocations) {
        const entry = { extensionId, cssLocations };
        this.storageService.store(CSS_CACHE_STORAGE_KEY, JSON.stringify(entry), 0 /* StorageScope.PROFILE */, 1 /* StorageTarget.MACHINE */);
    }
    clearCacheForExtension(extensionId) {
        const cached = this.getCachedCSS();
        if (cached && ExtensionIdentifier.equals(cached.extensionId, extensionId)) {
            this.storageService.remove(CSS_CACHE_STORAGE_KEY, 0 /* StorageScope.PROFILE */);
        }
    }
    createCSSLinkElement(uri, extensionId, disposables) {
        const element = createLinkElement();
        element.rel = 'stylesheet';
        element.type = 'text/css';
        element.className = `extension-contributed-css ${extensionId}`;
        element.href = FileAccess.uriToBrowserUri(uri).toString(true);
        disposables.add(toDisposable(() => element.remove()));
        return element;
    }
    reloadStylesheet(uri) {
        const uriString = uri.toString();
        for (const entries of this.stylesheetsByExtension.values()) {
            for (const entry of entries) {
                if (entry.uri.toString() === uriString) {
                    // Cache-bust by adding a timestamp query parameter
                    const browserUri = FileAccess.uriToBrowserUri(uri);
                    entry.element.href = browserUri.with({ query: `v=${Date.now()}` }).toString(true);
                }
            }
        }
    }
    dispose() {
        this.disposables.dispose();
    }
};
CSSExtensionPoint = __decorate([
    __param(0, IFileService),
    __param(1, IBrowserWorkbenchEnvironmentService),
    __param(2, IWorkbenchThemeService),
    __param(3, IStorageService)
], CSSExtensionPoint);
export { CSSExtensionPoint };
//# sourceMappingURL=cssExtensionPoint.js.map