
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import vsce from '@vscode/vsce';
import * as path from 'path';
import * as fs from 'fs';

const extensionPath = 'C:/Users/Admin/Desktop/CustomVsCode/CustomVsCode/extensions/git';

async function test() {
	try {
		console.log('Testing vsce.listFiles...');
		const fileNames = await vsce.listFiles({ cwd: extensionPath, packageManager: vsce.PackageManager.None });
		console.log(`Found ${fileNames.length} files.`);
		console.log('Sample files:', fileNames.slice(0, 5));

		const finalFileNames = fileNames;
		['package.json', 'package.nls.json'].forEach(p => {
			if (fs.existsSync(path.join(extensionPath, p)) && !finalFileNames.includes(p)) {
				finalFileNames.push(p);
			}
		});

		console.log('Final file count:', finalFileNames.length);
		console.log('Has package.json?', finalFileNames.includes('package.json'));

	} catch (err) {
		console.error('Error:', err);
	}
}

test();
