
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import fs from 'fs';
import path from 'path';
import _glob from 'glob';
const glob = _glob.default || _glob;

const root = 'C:/Users/Admin/Desktop/CustomVsCode/CustomVsCode';
const nativeExtensions = ['git', 'microsoft-authentication'];

function test(native) {
    const nativeExtensionsSet = new Set(nativeExtensions);
    const manifests = glob.sync('extensions/*/package.json', { cwd: root });

    const results = manifests.map(manifestPath => {
        const extensionPath = path.dirname(path.join(root, manifestPath));
        const extensionName = path.basename(extensionPath);
        return { name: extensionName, native: nativeExtensionsSet.has(extensionName) };
    }).filter(({ name, native: isNative }) => native ? isNative : !isNative);

    console.log(`Native: ${native}, Found:`, results.map(r => r.name).join(', '));
}

test(true);
test(false);
