/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import * as sinon from 'sinon';
import { EventEmitter } from 'events';
import { runWithFakedTimers } from '../../../../base/test/common/timeTravelScheduler.js';
import { BrowserSessionTrust } from '../../electron-main/browserSessionTrust.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../base/test/common/utils.js';
const STORAGE_KEY = 'browserView.sessionTrustData';
const TRUST_DURATION_MS = 7 * 24 * 60 * 60 * 1000;
class TestElectronSession {
    constructor() {
        this.closeAllConnections = sinon.stub().resolves();
    }
    setCertificateVerifyProc(callback) {
        this.certificateVerifyProc = callback;
    }
    asSession() {
        return this;
    }
}
class TestBrowserSession {
    constructor(id, electronSession) {
        this.id = id;
        this.electronSession = electronSession;
    }
    asBrowserSession() {
        return this;
    }
}
class TestApplicationStorageMainService {
    constructor() {
        this.data = new Map();
        this.store = sinon.stub().callsFake((key, value) => {
            this.data.set(key, String(value));
        });
        this.remove = sinon.stub().callsFake(key => {
            this.data.delete(key);
        });
    }
    get(key, _scope, fallbackValue) {
        return this.data.get(key) ?? fallbackValue;
    }
    seed(key, value) {
        this.data.set(key, value);
    }
    read(key) {
        return this.data.get(key);
    }
    asService() {
        return this;
    }
}
class TestWebContents extends EventEmitter {
    asWebContents() {
        return this;
    }
}
function createTrust(sessionId = 'test-session') {
    const electronSession = new TestElectronSession();
    const browserSession = new TestBrowserSession(sessionId, electronSession.asSession());
    const trust = new BrowserSessionTrust(browserSession.asBrowserSession());
    const storage = new TestApplicationStorageMainService();
    return { trust, electronSession, storage };
}
function createCertificate(fingerprint, extra) {
    return { fingerprint, issuerName: 'Test CA', subjectName: 'test.example.com', validStart: 0, validExpiry: 0, ...extra };
}
function invokeVerifyProc(electronSession, request) {
    assert.ok(electronSession.certificateVerifyProc);
    let result;
    electronSession.certificateVerifyProc({
        errorCode: 0,
        verificationResult: 'OK',
        ...request
    }, value => {
        result = value;
    });
    assert.notStrictEqual(result, undefined);
    return result;
}
suite('BrowserSessionTrust', () => {
    teardown(() => {
        sinon.restore();
    });
    test('installs certificate verify proc and tracks certificate errors', () => {
        const { trust, electronSession } = createTrust();
        const verificationResult = invokeVerifyProc(electronSession, {
            hostname: 'example.com',
            errorCode: -202,
            verificationResult: 'net::ERR_CERT_AUTHORITY_INVALID',
            certificate: createCertificate('abc123')
        });
        assert.strictEqual(verificationResult, -3);
        assert.deepStrictEqual(trust.getCertificateError('https://example.com/path'), {
            host: 'example.com',
            fingerprint: 'abc123',
            error: 'net::ERR_CERT_AUTHORITY_INVALID',
            url: 'https://example.com/path',
            hasTrustedException: false,
            issuerName: 'Test CA',
            subjectName: 'test.example.com',
            validStart: 0,
            validExpiry: 0,
        });
        invokeVerifyProc(electronSession, {
            hostname: 'example.com',
            certificate: createCertificate('abc123')
        });
        assert.strictEqual(trust.getCertificateError('https://example.com/path'), undefined);
    });
    test('trustCertificate persists data under the trust storage key', async () => {
        const { trust, storage } = createTrust();
        trust.connectStorage(storage.asService());
        await trust.trustCertificate('example.com', 'abc123');
        assert.strictEqual(storage.store.calledOnce, true);
        assert.deepStrictEqual(storage.store.firstCall.args.slice(0, 4), [STORAGE_KEY, storage.read(STORAGE_KEY), -1 /* StorageScope.APPLICATION */, 1 /* StorageTarget.MACHINE */]);
        const persisted = JSON.parse(storage.read(STORAGE_KEY));
        assert.deepStrictEqual(persisted['test-session'].trustedCerts.map((entry) => ({ host: entry.host, fingerprint: entry.fingerprint })), [{ host: 'example.com', fingerprint: 'abc123' }]);
    });
    test('trustCertificate stores expiresAt relative to current time', async () => {
        const clock = sinon.useFakeTimers({ now: Date.parse('2026-03-01T00:00:00.000Z') });
        const { trust, storage } = createTrust();
        trust.connectStorage(storage.asService());
        await trust.trustCertificate('example.com', 'abc123');
        const persisted = JSON.parse(storage.read(STORAGE_KEY));
        const [entry] = persisted['test-session'].trustedCerts;
        assert.strictEqual(entry.host, 'example.com');
        assert.strictEqual(entry.fingerprint, 'abc123');
        assert.strictEqual(entry.expiresAt, Date.now() + TRUST_DURATION_MS);
        clock.restore();
    });
    test('trust is valid at expiration and invalid after expiration', async () => {
        const clock = sinon.useFakeTimers({ now: Date.parse('2026-03-01T00:00:00.000Z') });
        const { trust, electronSession, storage } = createTrust();
        const webContents = new TestWebContents();
        trust.installCertErrorHandler(webContents.asWebContents());
        trust.connectStorage(storage.asService());
        await trust.trustCertificate('example.com', 'abc123');
        electronSession.closeAllConnections.resetHistory();
        // Prior to the expiration boundary, trust should still be valid
        clock.tick(TRUST_DURATION_MS - 10);
        let callbackResult;
        const firstEvent = { preventDefault: sinon.spy() };
        webContents.emit('certificate-error', firstEvent, 'https://example.com', 'ERR_CERT', createCertificate('abc123'), (value) => {
            callbackResult = value;
        });
        assert.strictEqual(callbackResult, true);
        // After expiration, trust should be revoked
        clock.tick(20);
        const secondEvent = { preventDefault: sinon.spy() };
        webContents.emit('certificate-error', secondEvent, 'https://example.com', 'ERR_CERT', createCertificate('abc123'), (value) => {
            callbackResult = value;
        });
        assert.strictEqual(callbackResult, false);
        clock.restore();
    });
    test('connectStorage restores valid trust entries and prunes expired ones', () => runWithFakedTimers({ useFakeTimers: true }, async () => {
        const { trust, storage } = createTrust();
        const webContents = new TestWebContents();
        trust.installCertErrorHandler(webContents.asWebContents());
        storage.seed(STORAGE_KEY, JSON.stringify({
            'test-session': {
                trustedCerts: [
                    { host: 'valid.example.com', fingerprint: 'valid', expiresAt: Date.now() + 1000 },
                    { host: 'expired.example.com', fingerprint: 'expired', expiresAt: Date.now() - 1000 }
                ]
            }
        }));
        trust.connectStorage(storage.asService());
        let callbackResult;
        const validEvent = { preventDefault: sinon.spy() };
        webContents.emit('certificate-error', validEvent, 'https://valid.example.com', 'ERR_CERT', createCertificate('valid'), (value) => {
            callbackResult = value;
        });
        assert.strictEqual(callbackResult, true);
        const expiredEvent = { preventDefault: sinon.spy() };
        webContents.emit('certificate-error', expiredEvent, 'https://expired.example.com', 'ERR_CERT', createCertificate('expired'), (value) => {
            callbackResult = value;
        });
        assert.strictEqual(callbackResult, false);
        const persisted = JSON.parse(storage.read(STORAGE_KEY));
        assert.deepStrictEqual(persisted['test-session'].trustedCerts.map((entry) => ({ host: entry.host, fingerprint: entry.fingerprint })), [{ host: 'valid.example.com', fingerprint: 'valid' }]);
    }));
    test('stored and reloaded trust expires and is pruned', async () => {
        const clock = sinon.useFakeTimers({ now: Date.parse('2026-03-01T00:00:00.000Z') });
        const storage = new TestApplicationStorageMainService();
        const firstSession = new TestElectronSession();
        const firstBrowserSession = new TestBrowserSession('test-session', firstSession.asSession());
        const firstTrust = new BrowserSessionTrust(firstBrowserSession.asBrowserSession());
        firstTrust.connectStorage(storage.asService());
        await firstTrust.trustCertificate('reload.example.com', 'reload-fingerprint');
        clock.tick(TRUST_DURATION_MS + 1);
        const secondSession = new TestElectronSession();
        const secondBrowserSession = new TestBrowserSession('test-session', secondSession.asSession());
        const secondTrust = new BrowserSessionTrust(secondBrowserSession.asBrowserSession());
        const webContents = new TestWebContents();
        secondTrust.installCertErrorHandler(webContents.asWebContents());
        secondTrust.connectStorage(storage.asService());
        let callbackResult;
        const event = { preventDefault: sinon.spy() };
        webContents.emit('certificate-error', event, 'https://reload.example.com', 'ERR_CERT', createCertificate('reload-fingerprint'), (value) => {
            callbackResult = value;
        });
        assert.strictEqual(callbackResult, false);
        assert.strictEqual(storage.read(STORAGE_KEY), undefined);
        clock.restore();
    });
    test('untrustCertificate removes persisted trust and closes connections', async () => {
        const { trust, electronSession, storage } = createTrust();
        trust.connectStorage(storage.asService());
        await trust.trustCertificate('example.com', 'abc123');
        electronSession.closeAllConnections.resetHistory();
        storage.store.resetHistory();
        await trust.untrustCertificate('example.com', 'abc123');
        assert.strictEqual(electronSession.closeAllConnections.calledOnce, true);
        assert.strictEqual(storage.remove.calledOnceWithExactly(STORAGE_KEY, -1 /* StorageScope.APPLICATION */), true);
        assert.strictEqual(storage.read(STORAGE_KEY), undefined);
    });
    test('untrustCertificate throws when certificate is not found', async () => {
        const { trust, electronSession, storage } = createTrust();
        trust.connectStorage(storage.asService());
        await assert.rejects(() => trust.untrustCertificate('missing.example.com', 'missing-fingerprint'), error => {
            assert.ok(error instanceof Error);
            assert.strictEqual(error.message, 'Certificate not found: host=missing.example.com fingerprint=missing-fingerprint');
            return true;
        });
        assert.strictEqual(electronSession.closeAllConnections.called, false);
    });
    test('clear removes trust, clears cert errors, and closes connections', async () => {
        const { trust, electronSession, storage } = createTrust();
        trust.connectStorage(storage.asService());
        await trust.trustCertificate('example.com', 'abc123');
        invokeVerifyProc(electronSession, {
            hostname: 'example.com',
            errorCode: -202,
            verificationResult: 'net::ERR_CERT_COMMON_NAME_INVALID',
            certificate: createCertificate('abc123')
        });
        await trust.clear();
        assert.strictEqual(electronSession.closeAllConnections.calledOnce, true);
        assert.strictEqual(trust.getCertificateError('https://example.com'), undefined);
        assert.strictEqual(storage.read(STORAGE_KEY), undefined);
    });
    test('installCertErrorHandler only allows trusted certificates', async () => {
        const { trust } = createTrust();
        const webContents = new TestWebContents();
        trust.installCertErrorHandler(webContents.asWebContents());
        let callbackResult;
        const firstEvent = { preventDefault: sinon.spy() };
        webContents.emit('certificate-error', firstEvent, 'https://example.com', 'ERR_CERT', createCertificate('abc123'), (value) => {
            callbackResult = value;
        });
        assert.strictEqual(callbackResult, false);
        assert.strictEqual(firstEvent.preventDefault.calledOnce, true);
        await trust.trustCertificate('example.com', 'abc123');
        const secondEvent = { preventDefault: sinon.spy() };
        webContents.emit('certificate-error', secondEvent, 'https://example.com', 'ERR_CERT', createCertificate('abc123'), (value) => {
            callbackResult = value;
        });
        assert.strictEqual(callbackResult, true);
        assert.strictEqual(secondEvent.preventDefault.calledOnce, true);
    });
    ensureNoDisposablesAreLeakedInTestSuite();
});
//# sourceMappingURL=browserSessionTrust.test.js.map