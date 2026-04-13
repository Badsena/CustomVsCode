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
import { CancellationToken } from '../../../base/common/cancellation.js';
import { getErrorMessage, isCancellationError } from '../../../base/common/errors.js';
import { Schemas } from '../../../base/common/network.js';
import { basename } from '../../../base/common/resources.js';
import { gt } from '../../../base/common/semver/semver.js';
import { URI } from '../../../base/common/uri.js';
import { localize } from '../../../nls.js';
import { EXTENSION_IDENTIFIER_REGEX, IExtensionGalleryService, IExtensionManagementService } from './extensionManagement.js';
import { areSameExtensions, getExtensionId, getGalleryExtensionId, getIdAndVersion } from './extensionManagementUtil.js';
import { EXTENSION_CATEGORIES } from '../../extensions/common/extensions.js';
import { IProductService } from '../../product/common/productService.js';
const notFound = (id) => localize(2101, null, id);
const useId = localize(2102, null, 'ms-dotnettools.csharp');
let ExtensionManagementCLI = class ExtensionManagementCLI {
    constructor(extensionsForceVersionByQuality, logger, extensionManagementService, extensionGalleryService, productService) {
        this.extensionsForceVersionByQuality = extensionsForceVersionByQuality;
        this.logger = logger;
        this.extensionManagementService = extensionManagementService;
        this.extensionGalleryService = extensionGalleryService;
        this.productService = productService;
        this.extensionsForceVersionByQuality = this.extensionsForceVersionByQuality.map(e => e.toLowerCase());
    }
    get location() {
        return undefined;
    }
    async listExtensions(showVersions, category, profileLocation) {
        let extensions = await this.extensionManagementService.getInstalled(1 /* ExtensionType.User */, profileLocation);
        const categories = EXTENSION_CATEGORIES.map(c => c.toLowerCase());
        if (category && category !== '') {
            if (categories.indexOf(category.toLowerCase()) < 0) {
                this.logger.info('Invalid category please enter a valid category. To list valid categories run --category without a category specified');
                return;
            }
            extensions = extensions.filter(e => {
                if (e.manifest.categories) {
                    const lowerCaseCategories = e.manifest.categories.map(c => c.toLowerCase());
                    return lowerCaseCategories.indexOf(category.toLowerCase()) > -1;
                }
                return false;
            });
        }
        else if (category === '') {
            this.logger.info('Possible Categories: ');
            categories.forEach(category => {
                this.logger.info(category);
            });
            return;
        }
        if (this.location) {
            this.logger.info(localize(2103, null, this.location));
        }
        extensions = extensions.sort((e1, e2) => e1.identifier.id.localeCompare(e2.identifier.id));
        let lastId = undefined;
        for (const extension of extensions) {
            if (lastId !== extension.identifier.id) {
                lastId = extension.identifier.id;
                this.logger.info(showVersions ? `${lastId}@${extension.manifest.version}` : lastId);
            }
        }
    }
    async installExtensions(extensions, builtinExtensions, installOptions, force) {
        const failed = [];
        try {
            if (extensions.length) {
                this.logger.info(this.location ? localize(2104, null, this.location) : localize(2105, null));
            }
            const installVSIXInfos = [];
            const installExtensionInfos = [];
            const addInstallExtensionInfo = (id, version, isBuiltin) => {
                if (this.extensionsForceVersionByQuality?.some(e => e === id.toLowerCase())) {
                    version = this.productService.quality !== 'stable' ? 'prerelease' : undefined;
                }
                installExtensionInfos.push({ id, version: version !== 'prerelease' ? version : undefined, installOptions: { ...installOptions, isBuiltin, installPreReleaseVersion: version === 'prerelease' || installOptions.installPreReleaseVersion } });
            };
            for (const extension of extensions) {
                if (extension instanceof URI) {
                    installVSIXInfos.push({ vsix: extension, installOptions });
                }
                else {
                    const [id, version] = getIdAndVersion(extension);
                    addInstallExtensionInfo(id, version, false);
                }
            }
            for (const extension of builtinExtensions) {
                if (extension instanceof URI) {
                    installVSIXInfos.push({ vsix: extension, installOptions: { ...installOptions, isBuiltin: true, donotIncludePackAndDependencies: true } });
                }
                else {
                    const [id, version] = getIdAndVersion(extension);
                    addInstallExtensionInfo(id, version, true);
                }
            }
            const installed = await this.extensionManagementService.getInstalled(undefined, installOptions.profileLocation);
            if (installVSIXInfos.length) {
                await Promise.all(installVSIXInfos.map(async ({ vsix, installOptions }) => {
                    try {
                        await this.installVSIX(vsix, installOptions, force, installed);
                    }
                    catch (err) {
                        this.logger.error(err);
                        failed.push(vsix.toString());
                    }
                }));
            }
            if (installExtensionInfos.length) {
                const failedGalleryExtensions = await this.installGalleryExtensions(installExtensionInfos, installed, force);
                failed.push(...failedGalleryExtensions);
            }
        }
        catch (error) {
            this.logger.error(localize(2106, null, getErrorMessage(error)));
            throw error;
        }
        if (failed.length) {
            throw new Error(localize(2107, null, failed.join(', ')));
        }
    }
    async updateExtensions(profileLocation) {
        const installedExtensions = await this.extensionManagementService.getInstalled(1 /* ExtensionType.User */, profileLocation);
        const installedExtensionsQuery = [];
        for (const extension of installedExtensions) {
            if (!!extension.identifier.uuid) { // No need to check new version for an unpublished extension
                installedExtensionsQuery.push({ ...extension.identifier, preRelease: extension.preRelease });
            }
        }
        this.logger.trace(localize(2108, null, installedExtensionsQuery.length));
        const availableVersions = await this.extensionGalleryService.getExtensions(installedExtensionsQuery, { compatible: true }, CancellationToken.None);
        const extensionsToUpdate = [];
        for (const newVersion of availableVersions) {
            for (const oldVersion of installedExtensions) {
                if (areSameExtensions(oldVersion.identifier, newVersion.identifier) && gt(newVersion.version, oldVersion.manifest.version)) {
                    extensionsToUpdate.push({
                        extension: newVersion,
                        options: { operation: 3 /* InstallOperation.Update */, installPreReleaseVersion: oldVersion.preRelease, profileLocation, isApplicationScoped: oldVersion.isApplicationScoped }
                    });
                }
            }
        }
        if (!extensionsToUpdate.length) {
            this.logger.info(localize(2109, null));
            return;
        }
        this.logger.info(localize(2110, null, extensionsToUpdate.map(ext => ext.extension.identifier.id).join(', ')));
        const installationResult = await this.extensionManagementService.installGalleryExtensions(extensionsToUpdate);
        for (const extensionResult of installationResult) {
            if (extensionResult.error) {
                this.logger.error(localize(2111, null, extensionResult.identifier.id, getErrorMessage(extensionResult.error)));
            }
            else {
                this.logger.info(localize(2112, null, extensionResult.identifier.id, extensionResult.local?.manifest.version));
            }
        }
    }
    async installGalleryExtensions(installExtensionInfos, installed, force) {
        installExtensionInfos = installExtensionInfos.filter(installExtensionInfo => {
            const { id, version, installOptions } = installExtensionInfo;
            const installedExtension = installed.find(i => areSameExtensions(i.identifier, { id }));
            if (installedExtension) {
                if (!force && (!version || (version === 'prerelease' && installedExtension.preRelease))) {
                    this.logger.info(localize(2113, null, id, installedExtension.manifest.version, id));
                    return false;
                }
                if (version && installedExtension.manifest.version === version) {
                    this.logger.info(localize(2114, null, `${id}@${version}`));
                    return false;
                }
                if (installedExtension.preRelease && version !== 'prerelease') {
                    installOptions.preRelease = false;
                }
            }
            return true;
        });
        if (!installExtensionInfos.length) {
            return [];
        }
        const failed = [];
        const extensionsToInstall = [];
        const galleryExtensions = await this.getGalleryExtensions(installExtensionInfos);
        await Promise.all(installExtensionInfos.map(async ({ id, version, installOptions }) => {
            const gallery = galleryExtensions.get(id.toLowerCase());
            if (!gallery) {
                this.logger.error(`${notFound(version ? `${id}@${version}` : id)}\n${useId}`);
                failed.push(id);
                return;
            }
            try {
                const manifest = await this.extensionGalleryService.getManifest(gallery, CancellationToken.None);
                if (manifest && !this.validateExtensionKind(manifest)) {
                    return;
                }
            }
            catch (err) {
                this.logger.error(err.message || err.stack || err);
                failed.push(id);
                return;
            }
            const installedExtension = installed.find(e => areSameExtensions(e.identifier, gallery.identifier));
            if (installedExtension) {
                if (gallery.version === installedExtension.manifest.version) {
                    this.logger.info(localize(2115, null, version ? `${id}@${version}` : id));
                    return;
                }
                this.logger.info(localize(2116, null, id, gallery.version));
            }
            if (installOptions.isBuiltin) {
                this.logger.info(version ? localize(2117, null, id, version) : localize(2118, null, id));
            }
            else {
                this.logger.info(version ? localize(2119, null, id, version) : localize(2120, null, id));
            }
            extensionsToInstall.push({
                extension: gallery,
                options: { ...installOptions, installGivenVersion: !!version, isApplicationScoped: installOptions.isApplicationScoped || installedExtension?.isApplicationScoped },
            });
        }));
        if (extensionsToInstall.length) {
            const installationResult = await this.extensionManagementService.installGalleryExtensions(extensionsToInstall);
            for (const extensionResult of installationResult) {
                if (extensionResult.error) {
                    this.logger.error(localize(2121, null, extensionResult.identifier.id, getErrorMessage(extensionResult.error)));
                    failed.push(extensionResult.identifier.id);
                }
                else {
                    this.logger.info(localize(2122, null, extensionResult.identifier.id, extensionResult.local?.manifest.version));
                }
            }
        }
        return failed;
    }
    async installVSIX(vsix, installOptions, force, installedExtensions) {
        const manifest = await this.extensionManagementService.getManifest(vsix);
        if (!manifest) {
            throw new Error('Invalid vsix');
        }
        const valid = await this.validateVSIX(manifest, force, installOptions.profileLocation, installedExtensions);
        if (valid) {
            try {
                await this.extensionManagementService.install(vsix, { ...installOptions, installGivenVersion: true });
                this.logger.info(localize(2123, null, basename(vsix)));
            }
            catch (error) {
                if (isCancellationError(error)) {
                    this.logger.info(localize(2124, null, basename(vsix)));
                }
                else {
                    throw error;
                }
            }
        }
    }
    async getGalleryExtensions(extensions) {
        const galleryExtensions = new Map();
        const preRelease = extensions.some(e => e.installOptions.installPreReleaseVersion);
        const targetPlatform = await this.extensionManagementService.getTargetPlatform();
        const extensionInfos = [];
        for (const extension of extensions) {
            if (EXTENSION_IDENTIFIER_REGEX.test(extension.id)) {
                extensionInfos.push({ ...extension, preRelease });
            }
        }
        if (extensionInfos.length) {
            const result = await this.extensionGalleryService.getExtensions(extensionInfos, { targetPlatform }, CancellationToken.None);
            for (const extension of result) {
                galleryExtensions.set(extension.identifier.id.toLowerCase(), extension);
            }
        }
        return galleryExtensions;
    }
    validateExtensionKind(_manifest) {
        return true;
    }
    async validateVSIX(manifest, force, profileLocation, installedExtensions) {
        if (!force) {
            const extensionIdentifier = { id: getGalleryExtensionId(manifest.publisher, manifest.name) };
            const newer = installedExtensions.find(local => areSameExtensions(extensionIdentifier, local.identifier) && gt(local.manifest.version, manifest.version));
            if (newer) {
                this.logger.info(localize(2125, null, newer.identifier.id, newer.manifest.version, manifest.version));
                return false;
            }
        }
        return this.validateExtensionKind(manifest);
    }
    async uninstallExtensions(extensions, force, profileLocation) {
        const getId = async (extensionDescription) => {
            if (extensionDescription instanceof URI) {
                const manifest = await this.extensionManagementService.getManifest(extensionDescription);
                return getExtensionId(manifest.publisher, manifest.name);
            }
            return extensionDescription;
        };
        const uninstalledExtensions = [];
        for (const extension of extensions) {
            const id = await getId(extension);
            const installed = await this.extensionManagementService.getInstalled(undefined, profileLocation);
            const extensionsToUninstall = installed.filter(e => areSameExtensions(e.identifier, { id }));
            if (!extensionsToUninstall.length) {
                throw new Error(`${this.notInstalled(id)}\n${useId}`);
            }
            if (extensionsToUninstall.some(e => e.type === 0 /* ExtensionType.System */)) {
                this.logger.info(localize(2126, null, id));
                return;
            }
            if (!force && extensionsToUninstall.some(e => e.isBuiltin)) {
                this.logger.info(localize(2127, null, id));
                return;
            }
            this.logger.info(localize(2128, null, id));
            for (const extensionToUninstall of extensionsToUninstall) {
                await this.extensionManagementService.uninstall(extensionToUninstall, { profileLocation });
                uninstalledExtensions.push(extensionToUninstall);
            }
            if (this.location) {
                this.logger.info(localize(2129, null, id, this.location));
            }
            else {
                this.logger.info(localize(2130, null, id));
            }
        }
    }
    async locateExtension(extensions) {
        const installed = await this.extensionManagementService.getInstalled();
        extensions.forEach(e => {
            installed.forEach(i => {
                if (i.identifier.id === e) {
                    if (i.location.scheme === Schemas.file) {
                        this.logger.info(i.location.fsPath);
                        return;
                    }
                }
            });
        });
    }
    notInstalled(id) {
        return this.location ? localize(2131, null, id, this.location) : localize(2132, null, id);
    }
};
ExtensionManagementCLI = __decorate([
    __param(2, IExtensionManagementService),
    __param(3, IExtensionGalleryService),
    __param(4, IProductService)
], ExtensionManagementCLI);
export { ExtensionManagementCLI };
//# sourceMappingURL=extensionManagementCLI.js.map