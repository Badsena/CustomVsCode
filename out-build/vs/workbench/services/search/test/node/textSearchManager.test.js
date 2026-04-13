/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { CancellationToken } from '../../../../../base/common/cancellation.js';
import { URI } from '../../../../../base/common/uri.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { Range, TextSearchMatch2 } from '../../common/searchExtTypes.js';
import { NativeTextSearchManager } from '../../node/textSearchManager.js';
suite('NativeTextSearchManager', () => {
    test('fixes encoding', async () => {
        let correctEncoding = false;
        const provider = {
            provideTextSearchResults(query, options, progress, token) {
                correctEncoding = options.folderOptions[0].encoding === 'windows-1252';
                return null;
            }
        };
        const query = {
            type: 2 /* QueryType.Text */,
            contentPattern: {
                pattern: 'a'
            },
            folderQueries: [{
                    folder: URI.file('/some/folder'),
                    fileEncoding: 'windows1252'
                }]
        };
        const m = new NativeTextSearchManager(query, provider);
        await m.search(() => { }, CancellationToken.None);
        assert.ok(correctEncoding);
    });
    test('handles result from unmatched folder gracefully via optional chaining', async () => {
        let receivedResults = 0;
        const provider = {
            provideTextSearchResults(query, options, progress, token) {
                const range = new Range(0, 0, 0, 5);
                // Report a result from a folder that IS in the query - should be received
                progress.report(new TextSearchMatch2(URI.file('/folder1/test.txt'), [{ sourceRange: range, previewRange: range }], 'test match'));
                // Report a result from a folder that is NOT in the query
                // This exercises: folderQuery?.folder?.scheme where folderQuery is undefined
                // The optional chaining should handle this gracefully without throwing
                progress.report(new TextSearchMatch2(URI.file('/unknown/folder/file.txt'), [{ sourceRange: range, previewRange: range }], 'unmatched result'));
                return null;
            }
        };
        const query = {
            type: 2 /* QueryType.Text */,
            contentPattern: {
                pattern: 'a'
            },
            folderQueries: [
                { folder: URI.file('/folder1') }
            ]
        };
        const m = new NativeTextSearchManager(query, provider);
        // This should not throw even though a result from an unmatched folder was reported
        await m.search((results) => {
            receivedResults += results.length;
        }, CancellationToken.None);
        // Should only receive 1 result (the one from /folder1)
        // The result from /unknown/folder should be silently ignored
        assert.strictEqual(receivedResults, 1);
    });
    ensureNoDisposablesAreLeakedInTestSuite();
});
//# sourceMappingURL=textSearchManager.test.js.map