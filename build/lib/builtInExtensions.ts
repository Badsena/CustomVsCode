/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import es from 'event-stream';
import fs from 'fs';
import path from 'path';
import os from 'os';
import vfs from 'vinyl-fs';
import rimraf from 'rimraf';
import fancyLog from 'fancy-log';
import ansiColors from 'ansi-colors';
import { Stream } from 'stream';
import _glob from 'glob';
const glob = (_glob as any).default || _glob;
import File from 'vinyl';
import rename from 'gulp-rename';
import vzip from 'gulp-vinyl-zip';
import filter from 'gulp-filter';
import * as util from './util.ts';
import * as ext from './extensions.ts';
import { fetchUrl } from './fetch.ts';

export interface IExtensionDefinition {
	name: string;
	version: string;
	repo: string;
	metadata: any;
	platforms?: string[];
	sha256?: string;
}

const root = path.dirname(path.dirname(import.meta.dirname));
const productjson = JSON.parse(fs.readFileSync(path.join(import.meta.dirname, '../../product.json'), 'utf8'));
const builtInExtensions = productjson.builtInExtensions as IExtensionDefinition[] || [];
const webBuiltInExtensions = productjson.webBuiltInExtensions as IExtensionDefinition[] || [];
const controlFilePath = path.join(os.homedir(), '.vscode-oss-dev', 'extensions', 'control.json');
const ENABLE_LOGGING = !process.env['VSCODE_BUILD_BUILTIN_EXTENSIONS_SILENCE_PLEASE'];

function log(...messages: string[]): void {
	if (ENABLE_LOGGING) {
		fancyLog(...messages);
	}
}

function getExtensionPath(extension: IExtensionDefinition): string {
	return path.join(root, '.build', 'builtInExtensions', extension.name);
}

function isUpToDate(extension: IExtensionDefinition): boolean {
	const packagePath = path.join(getExtensionPath(extension), 'package.json');

	if (!fs.existsSync(packagePath)) {
		return false;
	}

	const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
	return packageJson.version === extension.version;
}

function getExtensionDownloadStream(extension: IExtensionDefinition): Stream {
	const galleryServiceUrl = productjson.extensionsGallery?.serviceUrl;
	return (galleryServiceUrl ? ext.fromMarketplace(galleryServiceUrl, extension) : ext.fromGithub(extension))
		.pipe(util.skipDirectories())
		.pipe(rename((p: any) => p.dirname = `${extension.name}/${p.dirname}`));
}

export function getExtensionStream(extension: IExtensionDefinition): Stream {
	// if the extension exists on disk, use those files instead of downloading anew
	if (isUpToDate(extension)) {
		log('[extensions]', `${extension.name}@${extension.version} up to date`, ansiColors.green('✔︎'));
		const cwd = getExtensionPath(extension);
		const files = glob.sync('**', { cwd, nodir: true, dot: true }) as string[];
		return es.readArray(files.map((f: string) => {
			const filePath = path.join(cwd, f);
			return new File({
				path: f,
				base: '.',
				contents: fs.readFileSync(filePath),
				stat: fs.statSync(filePath)
			});
		})).pipe(rename((p: any) => p.dirname = `${extension.name}/${p.dirname}`));
	}

	return getExtensionDownloadStream(extension);
}

async function syncMarketplaceExtension(extension: IExtensionDefinition): Promise<void> {
	const galleryServiceUrl = productjson.extensionsGallery?.serviceUrl;
	const source = ansiColors.blue(galleryServiceUrl ? '[marketplace]' : '[github]');
	if (isUpToDate(extension)) {
		log(source, `${extension.name}@${extension.version}`, ansiColors.green('✔︎'));
		return;
	}

	const extensionPath = getExtensionPath(extension);
	rimraf.sync(extensionPath);

	const [publisher, name] = extension.name.split('.');
	const url = galleryServiceUrl ? `${galleryServiceUrl}/publishers/${publisher}/vsextensions/${name}/${extension.version}/vspackage` : extension.repo;

	log(source, `Downloading extension: ${extension.name}@${extension.version}...`);

	const file = await fetchUrl(url, { checksumSha256: extension.sha256, verbose: true });
	const extractStream = es.readArray([file])
		.pipe(vzip.src())
		.pipe(filter('extension/**'))
		.pipe(rename((p: any) => p.dirname = p.dirname!.replace(/^extension\/?/, '')))
		.pipe(vfs.dest(extensionPath));

	await util.streamToPromise(extractStream as any);
	log(source, extension.name, ansiColors.green('✔︎'));
}

async function syncExtension(extension: IExtensionDefinition, controlState: 'disabled' | 'marketplace'): Promise<void> {
	if (extension.platforms) {
		const platforms = new Set(extension.platforms);
		if (!platforms.has(process.platform)) {
			log(ansiColors.gray('[skip]'), `${extension.name}@${extension.version}: Platform '${process.platform}' not supported`, ansiColors.green('✔︎'));
			return;
		}
	}

	if (controlState === 'disabled') {
		log(ansiColors.blue('[disabled]'), ansiColors.gray(extension.name));
		return;
	}

	await syncMarketplaceExtension(extension);
}

function writeControlFile(control: { [name: string]: 'disabled' | 'marketplace' }): void {
	try {
		fs.mkdirSync(path.dirname(controlFilePath), { recursive: true });
		fs.writeFileSync(controlFilePath, JSON.stringify(control, null, 2));
	} catch (err) {
		// ignore
	}
}

export async function getBuiltInExtensions(): Promise<void> {
	const control: { [name: string]: 'disabled' | 'marketplace' } = {};

	for (const extension of builtInExtensions) {
		control[extension.name] = 'marketplace';
	}

	for (const extension of webBuiltInExtensions) {
		control[extension.name] = 'marketplace';
	}

	writeControlFile(control);

	const allExtensions = [...builtInExtensions, ...webBuiltInExtensions];

	// Sequential synchronization for absolute reliability
	for (const extension of allExtensions) {
		await syncExtension(extension, 'marketplace');
	}
}

if (import.meta.main) {
	getBuiltInExtensions().catch(err => {
		console.error(err);
		process.exit(1);
	});
}
