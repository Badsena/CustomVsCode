/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { layout } from '../../common/layout.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from './utils.js';
suite('Layout', function () {
    test('layout', () => {
        assert.strictEqual(layout(200, 20, { offset: 0, size: 0, position: 0 /* LayoutAnchorPosition.Before */ }).position, 0);
        assert.strictEqual(layout(200, 20, { offset: 50, size: 0, position: 0 /* LayoutAnchorPosition.Before */ }).position, 50);
        assert.strictEqual(layout(200, 20, { offset: 200, size: 0, position: 0 /* LayoutAnchorPosition.Before */ }).position, 180);
        assert.strictEqual(layout(200, 20, { offset: 0, size: 0, position: 1 /* LayoutAnchorPosition.After */ }).position, 0);
        assert.strictEqual(layout(200, 20, { offset: 50, size: 0, position: 1 /* LayoutAnchorPosition.After */ }).position, 30);
        assert.strictEqual(layout(200, 20, { offset: 200, size: 0, position: 1 /* LayoutAnchorPosition.After */ }).position, 180);
        assert.strictEqual(layout(200, 20, { offset: 0, size: 50, position: 0 /* LayoutAnchorPosition.Before */ }).position, 50);
        assert.strictEqual(layout(200, 20, { offset: 50, size: 50, position: 0 /* LayoutAnchorPosition.Before */ }).position, 100);
        assert.strictEqual(layout(200, 20, { offset: 150, size: 50, position: 0 /* LayoutAnchorPosition.Before */ }).position, 130);
        assert.strictEqual(layout(200, 20, { offset: 0, size: 50, position: 1 /* LayoutAnchorPosition.After */ }).position, 50);
        assert.strictEqual(layout(200, 20, { offset: 50, size: 50, position: 1 /* LayoutAnchorPosition.After */ }).position, 30);
        assert.strictEqual(layout(200, 20, { offset: 150, size: 50, position: 1 /* LayoutAnchorPosition.After */ }).position, 130);
    });
    ensureNoDisposablesAreLeakedInTestSuite();
});
//# sourceMappingURL=layout.test.js.map