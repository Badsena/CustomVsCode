/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { bufferToStream, VSBuffer } from '../../../../base/common/buffer.js';
import { CancellationToken } from '../../../../base/common/cancellation.js';
import { NullLogService } from '../../../log/common/log.js';
import { AbstractRequestService, NO_FETCH_TELEMETRY } from '../../common/request.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../base/test/common/utils.js';
class TestRequestService extends AbstractRequestService {
    constructor(handler) {
        super(new NullLogService());
        this.handler = handler;
    }
    async request(options, token) {
        return this.logAndRequest(options, () => this.handler(options));
    }
    async resolveProxy(_url) { return undefined; }
    async lookupAuthorization(_authInfo) { return undefined; }
    async lookupKerberosAuthorization(_url) { return undefined; }
    async loadCertificates() { return []; }
}
function makeResponse(statusCode) {
    return {
        res: { headers: {}, statusCode },
        stream: bufferToStream(VSBuffer.fromString(''))
    };
}
suite('AbstractRequestService', () => {
    const store = ensureNoDisposablesAreLeakedInTestSuite();
    test('onDidCompleteRequest fires with correct data', async () => {
        const service = store.add(new TestRequestService(() => Promise.resolve(makeResponse(200))));
        const events = [];
        store.add(service.onDidCompleteRequest(e => events.push(e)));
        await service.request({ url: 'http://test', callSite: 'test.callSite' }, CancellationToken.None);
        assert.strictEqual(events.length, 1);
        assert.strictEqual(events[0].callSite, 'test.callSite');
        assert.strictEqual(events[0].statusCode, 200);
        assert.ok(events[0].latency >= 0);
    });
    test('onDidCompleteRequest reports status code from response', async () => {
        const service = store.add(new TestRequestService(() => Promise.resolve(makeResponse(404))));
        const events = [];
        store.add(service.onDidCompleteRequest(e => events.push(e)));
        await service.request({ url: 'http://test', callSite: 'test.notFound' }, CancellationToken.None);
        assert.strictEqual(events.length, 1);
        assert.strictEqual(events[0].statusCode, 404);
    });
    test('onDidCompleteRequest fires for NO_FETCH_TELEMETRY', async () => {
        const service = store.add(new TestRequestService(() => Promise.resolve(makeResponse(200))));
        const events = [];
        store.add(service.onDidCompleteRequest(e => events.push(e)));
        await service.request({ url: 'http://test', callSite: NO_FETCH_TELEMETRY }, CancellationToken.None);
        assert.strictEqual(events.length, 1);
        assert.strictEqual(events[0].callSite, NO_FETCH_TELEMETRY);
    });
    test('onDidCompleteRequest does not fire when request throws', async () => {
        const service = store.add(new TestRequestService(() => Promise.reject(new Error('network error'))));
        const events = [];
        store.add(service.onDidCompleteRequest(e => events.push(e)));
        await assert.rejects(() => service.request({ url: 'http://test', callSite: 'test.error' }, CancellationToken.None));
        assert.strictEqual(events.length, 0);
    });
    test('onDidCompleteRequest fires for each request', async () => {
        const service = store.add(new TestRequestService(() => Promise.resolve(makeResponse(200))));
        const events = [];
        store.add(service.onDidCompleteRequest(e => events.push(e)));
        await service.request({ url: 'http://test/1', callSite: 'first' }, CancellationToken.None);
        await service.request({ url: 'http://test/2', callSite: 'second' }, CancellationToken.None);
        assert.deepStrictEqual(events.map(e => e.callSite), ['first', 'second']);
    });
});
//# sourceMappingURL=requestService.test.js.map