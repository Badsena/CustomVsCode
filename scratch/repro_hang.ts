/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
// @ts-ignore
import es from 'event-stream';
// @ts-ignore
import Vinyl from 'vinyl';
// @ts-ignore
import * as util from '../build/lib/util.ts';

const files = [];
for (let i = 0; i < 5000; i++) {
    files.push(new Vinyl({ path: `test${i}.js`, contents: Buffer.from('console.log("hello")') }));
}
files.push(new Vinyl({ path: 'test.sh', contents: Buffer.from('echo "hello"') }));

const input = es.readArray(files);
const stream = input.pipe(util.setExecutableBit(['**/*.sh']));

stream.on('data', (f) => {
    console.log('Data:', f.path, 'Mode:', f.stat?.mode);
});

stream.on('end', () => {
    console.log('Stream ended');
    process.exit(0);
});

setTimeout(() => {
    console.error('Timed out after 5s');
    process.exit(1);
}, 5000);
