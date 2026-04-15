/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

const esbuild = require('esbuild');
const path = require('path');
const fs = require('fs');

const isWatch = process.argv.includes('--watch');

/** @type {esbuild.BuildOptions} */
const buildOptions = {
	entryPoints: ['./src/extension.ts'],
	bundle: true,
	outfile: './out/extension.js',
	external: ['vscode'],
	platform: 'node',
	target: 'es2020',
	format: 'cjs',
	sourcemap: true,
	minify: false,
};

async function build() {
	// ── Copy eruda.js asset to out/assets/ ──
	const srcAssets = path.join(__dirname, 'src', 'assets');
	const outAssets = path.join(__dirname, 'out', 'assets');
	if (!fs.existsSync(outAssets)) {
		fs.mkdirSync(outAssets, { recursive: true });
	}
	const erudaSrc = path.join(srcAssets, 'eruda.js');
	const erudaDest = path.join(outAssets, 'eruda.js');
	if (fs.existsSync(erudaSrc)) {
		fs.copyFileSync(erudaSrc, erudaDest);
		console.log('[esbuild] Copied eruda.js to out/assets/');
	}

	if (isWatch) {
		const ctx = await esbuild.context(buildOptions);
		await ctx.watch();
		console.log('[esbuild] Watching for changes…');
	} else {
		await esbuild.build(buildOptions);
		console.log('[esbuild] Build complete.');
	}
}

build().catch((err) => {
	console.error(err);
	process.exit(1);
});
