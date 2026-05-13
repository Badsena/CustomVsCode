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
	external: ['vscode', 'chii'],  // ✅ chii must be external
	platform: 'node',
	target: 'es2020',
	format: 'cjs',
	sourcemap: true,
	minify: false,
};

async function build() {
	const srcAssets = path.join(__dirname, 'src', 'assets');
	const outAssets = path.join(__dirname, 'out', 'assets');

	// ✅ Clean before copy
	if (fs.existsSync(outAssets)) {
		fs.rmSync(outAssets, { recursive: true });
	}
	fs.mkdirSync(outAssets, { recursive: true });

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
