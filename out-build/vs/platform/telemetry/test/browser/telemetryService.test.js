/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import * as sinon from 'sinon';
import sinonTest from 'sinon-test';
import { mainWindow } from '../../../../base/browser/window.js';
import * as Errors from '../../../../base/common/errors.js';
import { Emitter } from '../../../../base/common/event.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../base/test/common/utils.js';
import { TestConfigurationService } from '../../../configuration/test/common/testConfigurationService.js';
import product from '../../../product/common/product.js';
import ErrorTelemetry from '../../browser/errorTelemetry.js';
import { TelemetryService } from '../../common/telemetryService.js';
import { NullAppender } from '../../common/telemetryUtils.js';
const sinonTestFn = sinonTest(sinon);
class TestTelemetryAppender {
    constructor() {
        this.events = [];
        this.isDisposed = false;
    }
    log(eventName, data) {
        this.events.push({ eventName, data });
    }
    getEventsCount() {
        return this.events.length;
    }
    flush() {
        this.isDisposed = true;
        return Promise.resolve(null);
    }
}
class ErrorTestingSettings {
    constructor() {
        this.randomUserFile = 'a/path/that/doe_snt/con-tain/code/names.js';
        this.anonymizedRandomUserFile = '<REDACTED: user-file-path>';
        this.nodeModulePathToRetain = 'node_modules/path/that/shouldbe/retained/names.js:14:15854';
        this.anonymizedNodeModulePath = '<REDACTED: user-file-path>/node_modules/path/that/shouldbe/retained/names.js:14:15854';
        this.nodeModuleAsarPathToRetain = 'node_modules.asar/path/that/shouldbe/retained/names.js:14:12354';
        this.anonymizedNodeModuleAsarPath = '<REDACTED: user-file-path>/node_modules.asar/path/that/shouldbe/retained/names.js:14:12354';
        this.fullNodeModulePath = '/Users/username/projects/vscode/node_modules/@xterm/xterm/lib/xterm.js:1:243732';
        this.anonymizedFullNodeModulePath = '<REDACTED: user-file-path>/node_modules/@xterm/xterm/lib/xterm.js:1:243732';
        this.fullNodeModuleAsarPath = '/Users/username/projects/vscode/node_modules.asar/@xterm/xterm/lib/xterm.js:1:376066';
        this.anonymizedFullNodeModuleAsarPath = '<REDACTED: user-file-path>/node_modules.asar/@xterm/xterm/lib/xterm.js:1:376066';
        this.extensionPathToRetain = '.vscode/extensions/ms-python.python-2024.0.1/out/extension.js:144:145516';
        this.fullExtensionPath = '/Users/username/.vscode/extensions/ms-python.python-2024.0.1/out/extension.js:144:145516';
        this.anonymizedExtensionPath = '<REDACTED: user-file-path>/.vscode/extensions/ms-python.python-2024.0.1/out/extension.js:144:145516';
        this.serverInsidersExtensionPathToRetain = '.vscode-server-insiders/extensions/ms-vscode.remote-server-2024.1.0/out/server.js:99:8888';
        this.fullServerInsidersExtensionPath = '/home/user/.vscode-server-insiders/extensions/ms-vscode.remote-server-2024.1.0/out/server.js:99:8888';
        this.anonymizedServerInsidersExtensionPath = '<REDACTED: user-file-path>/.vscode-server-insiders/extensions/ms-vscode.remote-server-2024.1.0/out/server.js:99:8888';
        this.builtinExtensionPathToRetain = 'Resources/app/extensions/git/out/git.js:42:1234';
        this.fullBuiltinExtensionPath = '/Applications/Visual Studio Code.app/Contents/Resources/app/extensions/git/out/git.js:42:1234';
        this.anonymizedBuiltinExtensionPath = '<REDACTED: user-file-path>/Resources/app/extensions/git/out/git.js:42:1234';
        this.personalInfo = 'DANGEROUS/PATH';
        this.importantInfo = 'important/information';
        this.filePrefix = 'file:///';
        this.dangerousPathWithImportantInfo = this.filePrefix + this.personalInfo + '/resources/app/' + this.importantInfo;
        this.dangerousPathWithoutImportantInfo = this.filePrefix + this.personalInfo;
        this.missingModelPrefix = 'Received model events for missing model ';
        this.missingModelMessage = this.missingModelPrefix + ' ' + this.dangerousPathWithoutImportantInfo;
        this.noSuchFilePrefix = 'ENOENT: no such file or directory';
        this.noSuchFileMessage = this.noSuchFilePrefix + ' \'' + this.personalInfo + '\'';
        this.stack = [`at e._modelEvents (${this.randomUserFile}:11:7309)`,
            `    at t.AllWorkers (${this.randomUserFile}:6:8844)`,
            `    at e.(anonymous function) [as _modelEvents] (${this.randomUserFile}:5:29552)`,
            `    at Function.<anonymous> (${this.randomUserFile}:6:8272)`,
            `    at e.dispatch (${this.randomUserFile}:5:26931)`,
            `    at e.request (/${this.nodeModuleAsarPathToRetain})`,
            `    at t._handleMessage (${this.nodeModuleAsarPathToRetain})`,
            `    at t._onmessage (/${this.nodeModulePathToRetain})`,
            `    at t.onmessage (${this.nodeModulePathToRetain})`,
            `    at get dimensions (${this.fullNodeModulePath})`,
            `    at _._refreshCanvasDimensions (${this.fullNodeModuleAsarPath})`,
            `    at uv.provideCodeActions (${this.fullExtensionPath})`,
            `    at remote.handleConnection (${this.fullServerInsidersExtensionPath})`,
            `    at git.getRepositoryState (${this.fullBuiltinExtensionPath})`,
            `    at DedicatedWorkerGlobalScope.self.onmessage`,
            this.dangerousPathWithImportantInfo,
            this.dangerousPathWithoutImportantInfo,
            this.missingModelMessage,
            this.noSuchFileMessage];
    }
}
suite('TelemetryService', () => {
    const TestProductService = { _serviceBrand: undefined, ...product };
    test('Disposing', sinonTestFn(function () {
        const testAppender = new TestTelemetryAppender();
        const service = new TelemetryService({ appenders: [testAppender] }, new TestConfigurationService(), TestProductService);
        service.publicLog('testPrivateEvent');
        assert.strictEqual(testAppender.getEventsCount(), 1);
        service.dispose();
        assert.strictEqual(!testAppender.isDisposed, true);
    }));
    // event reporting
    test('Simple event', sinonTestFn(function () {
        const testAppender = new TestTelemetryAppender();
        const service = new TelemetryService({ appenders: [testAppender] }, new TestConfigurationService(), TestProductService);
        service.publicLog('testEvent');
        assert.strictEqual(testAppender.getEventsCount(), 1);
        assert.strictEqual(testAppender.events[0].eventName, 'testEvent');
        assert.notStrictEqual(testAppender.events[0].data, null);
        service.dispose();
    }));
    test('Event with data', sinonTestFn(function () {
        const testAppender = new TestTelemetryAppender();
        const service = new TelemetryService({ appenders: [testAppender] }, new TestConfigurationService(), TestProductService);
        service.publicLog('testEvent', {
            'stringProp': 'property',
            'numberProp': 1,
            'booleanProp': true,
            'complexProp': {
                'value': 0
            }
        });
        assert.strictEqual(testAppender.getEventsCount(), 1);
        assert.strictEqual(testAppender.events[0].eventName, 'testEvent');
        assert.notStrictEqual(testAppender.events[0].data, null);
        assert.strictEqual(testAppender.events[0].data['stringProp'], 'property');
        assert.strictEqual(testAppender.events[0].data['numberProp'], 1);
        assert.strictEqual(testAppender.events[0].data['booleanProp'], true);
        assert.strictEqual(testAppender.events[0].data['complexProp'].value, 0);
        service.dispose();
    }));
    test('common properties added to *all* events, simple event', function () {
        const testAppender = new TestTelemetryAppender();
        const service = new TelemetryService({
            appenders: [testAppender],
            commonProperties: { foo: 'JA!', get bar() { return Math.random() % 2 === 0; } }
        }, new TestConfigurationService(), TestProductService);
        service.publicLog('testEvent');
        const [first] = testAppender.events;
        assert.strictEqual(Object.keys(first.data).length, 2);
        assert.strictEqual(typeof first.data['foo'], 'string');
        assert.strictEqual(typeof first.data['bar'], 'boolean');
        service.dispose();
    });
    test('common properties added to *all* events, event with data', function () {
        const testAppender = new TestTelemetryAppender();
        const service = new TelemetryService({
            appenders: [testAppender],
            commonProperties: { foo: 'JA!', get bar() { return Math.random() % 2 === 0; } }
        }, new TestConfigurationService(), TestProductService);
        service.publicLog('testEvent', { hightower: 'xl', price: 8000 });
        const [first] = testAppender.events;
        assert.strictEqual(Object.keys(first.data).length, 4);
        assert.strictEqual(typeof first.data['foo'], 'string');
        assert.strictEqual(typeof first.data['bar'], 'boolean');
        assert.strictEqual(typeof first.data['hightower'], 'string');
        assert.strictEqual(typeof first.data['price'], 'number');
        service.dispose();
    });
    test('TelemetryInfo comes from properties', function () {
        const service = new TelemetryService({
            appenders: [NullAppender],
            commonProperties: {
                sessionID: 'one',
                ['common.machineId']: 'three',
            }
        }, new TestConfigurationService(), TestProductService);
        assert.strictEqual(service.sessionId, 'one');
        assert.strictEqual(service.machineId, 'three');
        service.dispose();
    });
    test('telemetry on by default', function () {
        const testAppender = new TestTelemetryAppender();
        const service = new TelemetryService({ appenders: [testAppender] }, new TestConfigurationService(), TestProductService);
        service.publicLog('testEvent');
        assert.strictEqual(testAppender.getEventsCount(), 1);
        assert.strictEqual(testAppender.events[0].eventName, 'testEvent');
        service.dispose();
    });
    class TestErrorTelemetryService extends TelemetryService {
        constructor(config) {
            super({ ...config, sendErrorTelemetry: true }, new TestConfigurationService, TestProductService);
        }
    }
    test('Error events', sinonTestFn(function () {
        const origErrorHandler = Errors.errorHandler.getUnexpectedErrorHandler();
        Errors.setUnexpectedErrorHandler(() => { });
        try {
            const testAppender = new TestTelemetryAppender();
            const service = new TestErrorTelemetryService({ appenders: [testAppender] });
            const errorTelemetry = new ErrorTelemetry(service);
            const e = new Error('This is a test.');
            // for Phantom
            if (!e.stack) {
                e.stack = 'blah';
            }
            Errors.onUnexpectedError(e);
            this.clock.tick(ErrorTelemetry.ERROR_FLUSH_TIMEOUT);
            assert.strictEqual(testAppender.getEventsCount(), 1);
            assert.strictEqual(testAppender.events[0].eventName, 'UnhandledError');
            assert.strictEqual(testAppender.events[0].data.msg, 'This is a test.');
            errorTelemetry.dispose();
            service.dispose();
        }
        finally {
            Errors.setUnexpectedErrorHandler(origErrorHandler);
        }
    }));
    // 	test('Unhandled Promise Error events', sinonTestFn(function() {
    //
    // 		let origErrorHandler = Errors.errorHandler.getUnexpectedErrorHandler();
    // 		Errors.setUnexpectedErrorHandler(() => {});
    //
    // 		try {
    // 			let service = new MainTelemetryService();
    // 			let testAppender = new TestTelemetryAppender();
    // 			service.addTelemetryAppender(testAppender);
    //
    // 			winjs.Promise.wrapError(new Error('This should not get logged'));
    // 			winjs.TPromise.as(true).then(() => {
    // 				throw new Error('This should get logged');
    // 			});
    // 			// prevent console output from failing the test
    // 			this.stub(console, 'log');
    // 			// allow for the promise to finish
    // 			this.clock.tick(MainErrorTelemetry.ERROR_FLUSH_TIMEOUT);
    //
    // 			assert.strictEqual(testAppender.getEventsCount(), 1);
    // 			assert.strictEqual(testAppender.events[0].eventName, 'UnhandledError');
    // 			assert.strictEqual(testAppender.events[0].data.msg,  'This should get logged');
    //
    // 			service.dispose();
    // 		} finally {
    // 			Errors.setUnexpectedErrorHandler(origErrorHandler);
    // 		}
    // 	}));
    test('Handle global errors', sinonTestFn(function () {
        const errorStub = sinon.stub();
        mainWindow.onerror = errorStub;
        const testAppender = new TestTelemetryAppender();
        const service = new TestErrorTelemetryService({ appenders: [testAppender] });
        const errorTelemetry = new ErrorTelemetry(service);
        const testError = new Error('test');
        (mainWindow.onerror)('Error Message', 'file.js', 2, 42, testError);
        this.clock.tick(ErrorTelemetry.ERROR_FLUSH_TIMEOUT);
        assert.strictEqual(errorStub.alwaysCalledWithExactly('Error Message', 'file.js', 2, 42, testError), true);
        assert.strictEqual(errorStub.callCount, 1);
        assert.strictEqual(testAppender.getEventsCount(), 1);
        assert.strictEqual(testAppender.events[0].eventName, 'UnhandledError');
        assert.strictEqual(testAppender.events[0].data.msg, 'Error Message');
        assert.strictEqual(testAppender.events[0].data.file, 'file.js');
        assert.strictEqual(testAppender.events[0].data.line, 2);
        assert.strictEqual(testAppender.events[0].data.column, 42);
        assert.strictEqual(testAppender.events[0].data.uncaught_error_msg, 'test');
        errorTelemetry.dispose();
        service.dispose();
        sinon.restore();
    }));
    test('Error Telemetry removes PII from filename with spaces', sinonTestFn(function () {
        const errorStub = sinon.stub();
        mainWindow.onerror = errorStub;
        const settings = new ErrorTestingSettings();
        const testAppender = new TestTelemetryAppender();
        const service = new TestErrorTelemetryService({ appenders: [testAppender] });
        const errorTelemetry = new ErrorTelemetry(service);
        const personInfoWithSpaces = settings.personalInfo.slice(0, 2) + ' ' + settings.personalInfo.slice(2);
        const dangerousFilenameError = new Error('dangerousFilename');
        dangerousFilenameError.stack = settings.stack;
        mainWindow.onerror('dangerousFilename', settings.dangerousPathWithImportantInfo.replace(settings.personalInfo, personInfoWithSpaces) + '/test.js', 2, 42, dangerousFilenameError);
        this.clock.tick(ErrorTelemetry.ERROR_FLUSH_TIMEOUT);
        assert.strictEqual(errorStub.callCount, 1);
        assert.strictEqual(testAppender.events[0].data.file.indexOf(settings.dangerousPathWithImportantInfo.replace(settings.personalInfo, personInfoWithSpaces)), -1);
        assert.strictEqual(testAppender.events[0].data.file, settings.importantInfo + '/test.js');
        errorTelemetry.dispose();
        service.dispose();
        sinon.restore();
    }));
    test('Uncaught Error Telemetry removes PII from filename', sinonTestFn(function () {
        const clock = this.clock;
        const errorStub = sinon.stub();
        mainWindow.onerror = errorStub;
        const settings = new ErrorTestingSettings();
        const testAppender = new TestTelemetryAppender();
        const service = new TestErrorTelemetryService({ appenders: [testAppender] });
        const errorTelemetry = new ErrorTelemetry(service);
        let dangerousFilenameError = new Error('dangerousFilename');
        dangerousFilenameError.stack = settings.stack;
        mainWindow.onerror('dangerousFilename', settings.dangerousPathWithImportantInfo + '/test.js', 2, 42, dangerousFilenameError);
        clock.tick(ErrorTelemetry.ERROR_FLUSH_TIMEOUT);
        assert.strictEqual(errorStub.callCount, 1);
        assert.strictEqual(testAppender.events[0].data.file.indexOf(settings.dangerousPathWithImportantInfo), -1);
        dangerousFilenameError = new Error('dangerousFilename');
        dangerousFilenameError.stack = settings.stack;
        mainWindow.onerror('dangerousFilename', settings.dangerousPathWithImportantInfo + '/test.js', 2, 42, dangerousFilenameError);
        clock.tick(ErrorTelemetry.ERROR_FLUSH_TIMEOUT);
        assert.strictEqual(errorStub.callCount, 2);
        assert.strictEqual(testAppender.events[0].data.file.indexOf(settings.dangerousPathWithImportantInfo), -1);
        assert.strictEqual(testAppender.events[0].data.file, settings.importantInfo + '/test.js');
        errorTelemetry.dispose();
        service.dispose();
        sinon.restore();
    }));
    test('Unexpected Error Telemetry removes PII', sinonTestFn(function () {
        const origErrorHandler = Errors.errorHandler.getUnexpectedErrorHandler();
        Errors.setUnexpectedErrorHandler(() => { });
        try {
            const settings = new ErrorTestingSettings();
            const testAppender = new TestTelemetryAppender();
            const service = new TestErrorTelemetryService({ appenders: [testAppender] });
            const errorTelemetry = new ErrorTelemetry(service);
            const dangerousPathWithoutImportantInfoError = new Error(settings.dangerousPathWithoutImportantInfo);
            dangerousPathWithoutImportantInfoError.stack = settings.stack;
            Errors.onUnexpectedError(dangerousPathWithoutImportantInfoError);
            this.clock.tick(ErrorTelemetry.ERROR_FLUSH_TIMEOUT);
            assert.strictEqual(testAppender.events[0].data.msg.indexOf(settings.personalInfo), -1);
            assert.strictEqual(testAppender.events[0].data.msg.indexOf(settings.filePrefix), -1);
            assert.strictEqual(testAppender.events[0].data.callstack.indexOf(settings.personalInfo), -1);
            assert.strictEqual(testAppender.events[0].data.callstack.indexOf(settings.filePrefix), -1);
            assert.notStrictEqual(testAppender.events[0].data.callstack.indexOf(settings.stack[4].replace(settings.randomUserFile, settings.anonymizedRandomUserFile)), -1);
            assert.strictEqual(testAppender.events[0].data.callstack.split('\n').length, settings.stack.length);
            errorTelemetry.dispose();
            service.dispose();
        }
        finally {
            Errors.setUnexpectedErrorHandler(origErrorHandler);
        }
    }));
    test('Uncaught Error Telemetry removes PII', sinonTestFn(function () {
        const errorStub = sinon.stub();
        mainWindow.onerror = errorStub;
        const settings = new ErrorTestingSettings();
        const testAppender = new TestTelemetryAppender();
        const service = new TestErrorTelemetryService({ appenders: [testAppender] });
        const errorTelemetry = new ErrorTelemetry(service);
        const dangerousPathWithoutImportantInfoError = new Error('dangerousPathWithoutImportantInfo');
        dangerousPathWithoutImportantInfoError.stack = settings.stack;
        mainWindow.onerror(settings.dangerousPathWithoutImportantInfo, 'test.js', 2, 42, dangerousPathWithoutImportantInfoError);
        this.clock.tick(ErrorTelemetry.ERROR_FLUSH_TIMEOUT);
        assert.strictEqual(errorStub.callCount, 1);
        // Test that no file information remains, esp. personal info
        assert.strictEqual(testAppender.events[0].data.msg.indexOf(settings.personalInfo), -1);
        assert.strictEqual(testAppender.events[0].data.msg.indexOf(settings.filePrefix), -1);
        assert.strictEqual(testAppender.events[0].data.callstack.indexOf(settings.personalInfo), -1);
        assert.strictEqual(testAppender.events[0].data.callstack.indexOf(settings.filePrefix), -1);
        assert.notStrictEqual(testAppender.events[0].data.callstack.indexOf(settings.stack[4].replace(settings.randomUserFile, settings.anonymizedRandomUserFile)), -1);
        assert.strictEqual(testAppender.events[0].data.callstack.split('\n').length, settings.stack.length);
        errorTelemetry.dispose();
        service.dispose();
        sinon.restore();
    }));
    test('Unexpected Error Telemetry removes PII but preserves Code file path', sinonTestFn(function () {
        const origErrorHandler = Errors.errorHandler.getUnexpectedErrorHandler();
        Errors.setUnexpectedErrorHandler(() => { });
        try {
            const settings = new ErrorTestingSettings();
            const testAppender = new TestTelemetryAppender();
            const service = new TestErrorTelemetryService({ appenders: [testAppender] });
            const errorTelemetry = new ErrorTelemetry(service);
            const dangerousPathWithImportantInfoError = new Error(settings.dangerousPathWithImportantInfo);
            dangerousPathWithImportantInfoError.stack = settings.stack;
            // Test that important information remains but personal info does not
            Errors.onUnexpectedError(dangerousPathWithImportantInfoError);
            this.clock.tick(ErrorTelemetry.ERROR_FLUSH_TIMEOUT);
            assert.notStrictEqual(testAppender.events[0].data.msg.indexOf(settings.importantInfo), -1);
            assert.strictEqual(testAppender.events[0].data.msg.indexOf(settings.personalInfo), -1);
            assert.strictEqual(testAppender.events[0].data.msg.indexOf(settings.filePrefix), -1);
            assert.notStrictEqual(testAppender.events[0].data.callstack.indexOf(settings.importantInfo), -1);
            assert.strictEqual(testAppender.events[0].data.callstack.indexOf(settings.personalInfo), -1);
            assert.strictEqual(testAppender.events[0].data.callstack.indexOf(settings.filePrefix), -1);
            assert.notStrictEqual(testAppender.events[0].data.callstack.indexOf(settings.stack[4].replace(settings.randomUserFile, settings.anonymizedRandomUserFile)), -1);
            assert.strictEqual(testAppender.events[0].data.callstack.split('\n').length, settings.stack.length);
            errorTelemetry.dispose();
            service.dispose();
        }
        finally {
            Errors.setUnexpectedErrorHandler(origErrorHandler);
        }
    }));
    test('Uncaught Error Telemetry removes PII but preserves Code file path', sinonTestFn(function () {
        const errorStub = sinon.stub();
        mainWindow.onerror = errorStub;
        const settings = new ErrorTestingSettings();
        const testAppender = new TestTelemetryAppender();
        const service = new TestErrorTelemetryService({ appenders: [testAppender] });
        const errorTelemetry = new ErrorTelemetry(service);
        const dangerousPathWithImportantInfoError = new Error('dangerousPathWithImportantInfo');
        dangerousPathWithImportantInfoError.stack = settings.stack;
        mainWindow.onerror(settings.dangerousPathWithImportantInfo, 'test.js', 2, 42, dangerousPathWithImportantInfoError);
        this.clock.tick(ErrorTelemetry.ERROR_FLUSH_TIMEOUT);
        assert.strictEqual(errorStub.callCount, 1);
        // Test that important information remains but personal info does not
        assert.notStrictEqual(testAppender.events[0].data.callstack.indexOf(settings.anonymizedNodeModuleAsarPath), -1, 'bare node_modules.asar path');
        assert.notStrictEqual(testAppender.events[0].data.callstack.indexOf(settings.anonymizedNodeModulePath), -1, 'bare node_modules path');
        assert.notStrictEqual(testAppender.events[0].data.msg.indexOf(settings.importantInfo), -1);
        assert.strictEqual(testAppender.events[0].data.msg.indexOf(settings.personalInfo), -1);
        assert.strictEqual(testAppender.events[0].data.msg.indexOf(settings.filePrefix), -1);
        assert.notStrictEqual(testAppender.events[0].data.callstack.indexOf(settings.importantInfo), -1);
        assert.strictEqual(testAppender.events[0].data.callstack.indexOf(settings.personalInfo), -1);
        assert.strictEqual(testAppender.events[0].data.callstack.indexOf(settings.filePrefix), -1);
        assert.notStrictEqual(testAppender.events[0].data.callstack.indexOf(settings.stack[4].replace(settings.randomUserFile, settings.anonymizedRandomUserFile)), -1);
        assert.strictEqual(testAppender.events[0].data.callstack.split('\n').length, settings.stack.length);
        errorTelemetry.dispose();
        service.dispose();
        sinon.restore();
    }));
    test('Unexpected Error Telemetry removes PII but preserves Code file path with node modules', sinonTestFn(function () {
        const origErrorHandler = Errors.errorHandler.getUnexpectedErrorHandler();
        Errors.setUnexpectedErrorHandler(() => { });
        try {
            const settings = new ErrorTestingSettings();
            const testAppender = new TestTelemetryAppender();
            const service = new TestErrorTelemetryService({ appenders: [testAppender] });
            const errorTelemetry = new ErrorTelemetry(service);
            const dangerousPathWithImportantInfoError = new Error(settings.dangerousPathWithImportantInfo);
            dangerousPathWithImportantInfoError.stack = settings.stack;
            Errors.onUnexpectedError(dangerousPathWithImportantInfoError);
            this.clock.tick(ErrorTelemetry.ERROR_FLUSH_TIMEOUT);
            // All node_modules paths (bare and full) should preserve the node_modules/... suffix after redaction
            const cs = testAppender.events[0].data.callstack;
            assert.notStrictEqual(cs.indexOf(settings.anonymizedNodeModuleAsarPath), -1, 'bare node_modules.asar path');
            assert.notStrictEqual(cs.indexOf(settings.anonymizedNodeModulePath), -1, 'bare node_modules path');
            assert.notStrictEqual(cs.indexOf(settings.anonymizedFullNodeModulePath), -1, 'full node_modules path');
            assert.notStrictEqual(cs.indexOf(settings.anonymizedFullNodeModuleAsarPath), -1, 'full node_modules.asar path');
            errorTelemetry.dispose();
            service.dispose();
        }
        finally {
            Errors.setUnexpectedErrorHandler(origErrorHandler);
        }
    }));
    test('Unexpected Error Telemetry removes PII but preserves extension path', sinonTestFn(function () {
        const origErrorHandler = Errors.errorHandler.getUnexpectedErrorHandler();
        Errors.setUnexpectedErrorHandler(() => { });
        try {
            const settings = new ErrorTestingSettings();
            const testAppender = new TestTelemetryAppender();
            const service = new TestErrorTelemetryService({ appenders: [testAppender] });
            const errorTelemetry = new ErrorTelemetry(service);
            const dangerousPathWithImportantInfoError = new Error(settings.dangerousPathWithImportantInfo);
            dangerousPathWithImportantInfoError.stack = settings.stack;
            Errors.onUnexpectedError(dangerousPathWithImportantInfoError);
            this.clock.tick(ErrorTelemetry.ERROR_FLUSH_TIMEOUT);
            // Verify user extension path is preserved but parent folder is redacted
            assert.notStrictEqual(testAppender.events[0].data.callstack.indexOf(settings.extensionPathToRetain), -1, 'User extension path should be retained');
            assert.notStrictEqual(testAppender.events[0].data.callstack.indexOf(settings.anonymizedExtensionPath), -1, 'User extension path should be anonymized with preserved extension name');
            // Verify the username is removed
            assert.strictEqual(testAppender.events[0].data.callstack.indexOf('/Users/username/'), -1, 'Username should be redacted from extension path');
            // Verify server-insiders extension path is preserved (multi-segment suffix like .vscode-server-insiders)
            assert.notStrictEqual(testAppender.events[0].data.callstack.indexOf(settings.serverInsidersExtensionPathToRetain), -1, 'Server-insiders extension path should be retained');
            assert.notStrictEqual(testAppender.events[0].data.callstack.indexOf(settings.anonymizedServerInsidersExtensionPath), -1, 'Server-insiders extension path should be anonymized with preserved extension name');
            // Verify the home directory is removed
            assert.strictEqual(testAppender.events[0].data.callstack.indexOf('/home/user/'), -1, 'Home directory should be redacted from server-insiders extension path');
            // Verify built-in extension path is preserved but app folder is redacted
            assert.notStrictEqual(testAppender.events[0].data.callstack.indexOf(settings.builtinExtensionPathToRetain), -1, 'Built-in extension path should be retained');
            assert.notStrictEqual(testAppender.events[0].data.callstack.indexOf(settings.anonymizedBuiltinExtensionPath), -1, 'Built-in extension path should be anonymized with preserved extension name');
            // Verify the app path is removed
            assert.strictEqual(testAppender.events[0].data.callstack.indexOf('/Applications/Visual Studio Code.app'), -1, 'App path should be redacted from built-in extension path');
            errorTelemetry.dispose();
            service.dispose();
        }
        finally {
            Errors.setUnexpectedErrorHandler(origErrorHandler);
        }
    }));
    test('Unexpected Error Telemetry removes PII but preserves Code file path when PIIPath is configured', sinonTestFn(function () {
        const origErrorHandler = Errors.errorHandler.getUnexpectedErrorHandler();
        Errors.setUnexpectedErrorHandler(() => { });
        try {
            const settings = new ErrorTestingSettings();
            const testAppender = new TestTelemetryAppender();
            const service = new TestErrorTelemetryService({ appenders: [testAppender], piiPaths: [settings.personalInfo + '/resources/app/'] });
            const errorTelemetry = new ErrorTelemetry(service);
            const dangerousPathWithImportantInfoError = new Error(settings.dangerousPathWithImportantInfo);
            dangerousPathWithImportantInfoError.stack = settings.stack;
            // Test that important information remains but personal info does not
            Errors.onUnexpectedError(dangerousPathWithImportantInfoError);
            this.clock.tick(ErrorTelemetry.ERROR_FLUSH_TIMEOUT);
            assert.notStrictEqual(testAppender.events[0].data.msg.indexOf(settings.importantInfo), -1);
            assert.strictEqual(testAppender.events[0].data.msg.indexOf(settings.personalInfo), -1);
            assert.strictEqual(testAppender.events[0].data.msg.indexOf(settings.filePrefix), -1);
            assert.notStrictEqual(testAppender.events[0].data.callstack.indexOf(settings.importantInfo), -1);
            assert.strictEqual(testAppender.events[0].data.callstack.indexOf(settings.personalInfo), -1);
            assert.strictEqual(testAppender.events[0].data.callstack.indexOf(settings.filePrefix), -1);
            assert.notStrictEqual(testAppender.events[0].data.callstack.indexOf(settings.stack[4].replace(settings.randomUserFile, settings.anonymizedRandomUserFile)), -1);
            assert.strictEqual(testAppender.events[0].data.callstack.split('\n').length, settings.stack.length);
            errorTelemetry.dispose();
            service.dispose();
        }
        finally {
            Errors.setUnexpectedErrorHandler(origErrorHandler);
        }
    }));
    test('Uncaught Error Telemetry removes PII but preserves Code file path when PIIPath is configured', sinonTestFn(function () {
        const errorStub = sinon.stub();
        mainWindow.onerror = errorStub;
        const settings = new ErrorTestingSettings();
        const testAppender = new TestTelemetryAppender();
        const service = new TestErrorTelemetryService({ appenders: [testAppender], piiPaths: [settings.personalInfo + '/resources/app/'] });
        const errorTelemetry = new ErrorTelemetry(service);
        const dangerousPathWithImportantInfoError = new Error('dangerousPathWithImportantInfo');
        dangerousPathWithImportantInfoError.stack = settings.stack;
        mainWindow.onerror(settings.dangerousPathWithImportantInfo, 'test.js', 2, 42, dangerousPathWithImportantInfoError);
        this.clock.tick(ErrorTelemetry.ERROR_FLUSH_TIMEOUT);
        assert.strictEqual(errorStub.callCount, 1);
        // Test that important information remains but personal info does not
        assert.notStrictEqual(testAppender.events[0].data.msg.indexOf(settings.importantInfo), -1);
        assert.strictEqual(testAppender.events[0].data.msg.indexOf(settings.personalInfo), -1);
        assert.strictEqual(testAppender.events[0].data.msg.indexOf(settings.filePrefix), -1);
        assert.notStrictEqual(testAppender.events[0].data.callstack.indexOf(settings.importantInfo), -1);
        assert.strictEqual(testAppender.events[0].data.callstack.indexOf(settings.personalInfo), -1);
        assert.strictEqual(testAppender.events[0].data.callstack.indexOf(settings.filePrefix), -1);
        assert.notStrictEqual(testAppender.events[0].data.callstack.indexOf(settings.stack[4].replace(settings.randomUserFile, settings.anonymizedRandomUserFile)), -1);
        assert.strictEqual(testAppender.events[0].data.callstack.split('\n').length, settings.stack.length);
        errorTelemetry.dispose();
        service.dispose();
        sinon.restore();
    }));
    test('Unexpected Error Telemetry removes PII but preserves Missing Model error message', sinonTestFn(function () {
        const origErrorHandler = Errors.errorHandler.getUnexpectedErrorHandler();
        Errors.setUnexpectedErrorHandler(() => { });
        try {
            const settings = new ErrorTestingSettings();
            const testAppender = new TestTelemetryAppender();
            const service = new TestErrorTelemetryService({ appenders: [testAppender] });
            const errorTelemetry = new ErrorTelemetry(service);
            const missingModelError = new Error(settings.missingModelMessage);
            missingModelError.stack = settings.stack;
            // Test that no file information remains, but this particular
            // error message does (Received model events for missing model)
            Errors.onUnexpectedError(missingModelError);
            this.clock.tick(ErrorTelemetry.ERROR_FLUSH_TIMEOUT);
            assert.notStrictEqual(testAppender.events[0].data.msg.indexOf(settings.missingModelPrefix), -1);
            assert.strictEqual(testAppender.events[0].data.msg.indexOf(settings.personalInfo), -1);
            assert.strictEqual(testAppender.events[0].data.msg.indexOf(settings.filePrefix), -1);
            assert.notStrictEqual(testAppender.events[0].data.callstack.indexOf(settings.missingModelPrefix), -1);
            assert.strictEqual(testAppender.events[0].data.callstack.indexOf(settings.personalInfo), -1);
            assert.strictEqual(testAppender.events[0].data.callstack.indexOf(settings.filePrefix), -1);
            assert.notStrictEqual(testAppender.events[0].data.callstack.indexOf(settings.stack[4].replace(settings.randomUserFile, settings.anonymizedRandomUserFile)), -1);
            assert.strictEqual(testAppender.events[0].data.callstack.split('\n').length, settings.stack.length);
            errorTelemetry.dispose();
            service.dispose();
        }
        finally {
            Errors.setUnexpectedErrorHandler(origErrorHandler);
        }
    }));
    test('Uncaught Error Telemetry removes PII but preserves Missing Model error message', sinonTestFn(function () {
        const errorStub = sinon.stub();
        mainWindow.onerror = errorStub;
        const settings = new ErrorTestingSettings();
        const testAppender = new TestTelemetryAppender();
        const service = new TestErrorTelemetryService({ appenders: [testAppender] });
        const errorTelemetry = new ErrorTelemetry(service);
        const missingModelError = new Error('missingModelMessage');
        missingModelError.stack = settings.stack;
        mainWindow.onerror(settings.missingModelMessage, 'test.js', 2, 42, missingModelError);
        this.clock.tick(ErrorTelemetry.ERROR_FLUSH_TIMEOUT);
        assert.strictEqual(errorStub.callCount, 1);
        // Test that no file information remains, but this particular
        // error message does (Received model events for missing model)
        assert.notStrictEqual(testAppender.events[0].data.msg.indexOf(settings.missingModelPrefix), -1);
        assert.strictEqual(testAppender.events[0].data.msg.indexOf(settings.personalInfo), -1);
        assert.strictEqual(testAppender.events[0].data.msg.indexOf(settings.filePrefix), -1);
        assert.notStrictEqual(testAppender.events[0].data.callstack.indexOf(settings.missingModelPrefix), -1);
        assert.strictEqual(testAppender.events[0].data.callstack.indexOf(settings.personalInfo), -1);
        assert.strictEqual(testAppender.events[0].data.callstack.indexOf(settings.filePrefix), -1);
        assert.notStrictEqual(testAppender.events[0].data.callstack.indexOf(settings.stack[4].replace(settings.randomUserFile, settings.anonymizedRandomUserFile)), -1);
        assert.strictEqual(testAppender.events[0].data.callstack.split('\n').length, settings.stack.length);
        errorTelemetry.dispose();
        service.dispose();
        sinon.restore();
    }));
    test('Unexpected Error Telemetry removes PII but preserves No Such File error message', sinonTestFn(function () {
        const origErrorHandler = Errors.errorHandler.getUnexpectedErrorHandler();
        Errors.setUnexpectedErrorHandler(() => { });
        try {
            const settings = new ErrorTestingSettings();
            const testAppender = new TestTelemetryAppender();
            const service = new TestErrorTelemetryService({ appenders: [testAppender] });
            const errorTelemetry = new ErrorTelemetry(service);
            const noSuchFileError = new Error(settings.noSuchFileMessage);
            noSuchFileError.stack = settings.stack;
            // Test that no file information remains, but this particular
            // error message does (ENOENT: no such file or directory)
            Errors.onUnexpectedError(noSuchFileError);
            this.clock.tick(ErrorTelemetry.ERROR_FLUSH_TIMEOUT);
            assert.notStrictEqual(testAppender.events[0].data.msg.indexOf(settings.noSuchFilePrefix), -1);
            assert.strictEqual(testAppender.events[0].data.msg.indexOf(settings.personalInfo), -1);
            assert.strictEqual(testAppender.events[0].data.msg.indexOf(settings.filePrefix), -1);
            assert.notStrictEqual(testAppender.events[0].data.callstack.indexOf(settings.noSuchFilePrefix), -1);
            assert.strictEqual(testAppender.events[0].data.callstack.indexOf(settings.personalInfo), -1);
            assert.strictEqual(testAppender.events[0].data.callstack.indexOf(settings.filePrefix), -1);
            assert.notStrictEqual(testAppender.events[0].data.callstack.indexOf(settings.stack[4].replace(settings.randomUserFile, settings.anonymizedRandomUserFile)), -1);
            assert.strictEqual(testAppender.events[0].data.callstack.split('\n').length, settings.stack.length);
            errorTelemetry.dispose();
            service.dispose();
        }
        finally {
            Errors.setUnexpectedErrorHandler(origErrorHandler);
        }
    }));
    test('Uncaught Error Telemetry removes PII but preserves No Such File error message', sinonTestFn(function () {
        const origErrorHandler = Errors.errorHandler.getUnexpectedErrorHandler();
        Errors.setUnexpectedErrorHandler(() => { });
        try {
            const errorStub = sinon.stub();
            mainWindow.onerror = errorStub;
            const settings = new ErrorTestingSettings();
            const testAppender = new TestTelemetryAppender();
            const service = new TestErrorTelemetryService({ appenders: [testAppender] });
            const errorTelemetry = new ErrorTelemetry(service);
            const noSuchFileError = new Error('noSuchFileMessage');
            noSuchFileError.stack = settings.stack;
            mainWindow.onerror(settings.noSuchFileMessage, 'test.js', 2, 42, noSuchFileError);
            this.clock.tick(ErrorTelemetry.ERROR_FLUSH_TIMEOUT);
            assert.strictEqual(errorStub.callCount, 1);
            // Test that no file information remains, but this particular
            // error message does (ENOENT: no such file or directory)
            Errors.onUnexpectedError(noSuchFileError);
            assert.notStrictEqual(testAppender.events[0].data.msg.indexOf(settings.noSuchFilePrefix), -1);
            assert.strictEqual(testAppender.events[0].data.msg.indexOf(settings.personalInfo), -1);
            assert.strictEqual(testAppender.events[0].data.msg.indexOf(settings.filePrefix), -1);
            assert.notStrictEqual(testAppender.events[0].data.callstack.indexOf(settings.noSuchFilePrefix), -1);
            assert.strictEqual(testAppender.events[0].data.callstack.indexOf(settings.personalInfo), -1);
            assert.strictEqual(testAppender.events[0].data.callstack.indexOf(settings.filePrefix), -1);
            assert.notStrictEqual(testAppender.events[0].data.callstack.indexOf(settings.stack[4].replace(settings.randomUserFile, settings.anonymizedRandomUserFile)), -1);
            assert.strictEqual(testAppender.events[0].data.callstack.split('\n').length, settings.stack.length);
            errorTelemetry.dispose();
            service.dispose();
            sinon.restore();
        }
        finally {
            Errors.setUnexpectedErrorHandler(origErrorHandler);
        }
    }));
    test('Telemetry Service sends events when telemetry is on', sinonTestFn(function () {
        const testAppender = new TestTelemetryAppender();
        const service = new TelemetryService({ appenders: [testAppender] }, new TestConfigurationService(), TestProductService);
        service.publicLog('testEvent');
        assert.strictEqual(testAppender.getEventsCount(), 1);
        service.dispose();
    }));
    test('Telemetry Service checks with config service', function () {
        let telemetryLevel = "off" /* TelemetryConfiguration.OFF */;
        const emitter = new Emitter();
        const testAppender = new TestTelemetryAppender();
        const service = new TelemetryService({
            appenders: [testAppender]
        }, new class extends TestConfigurationService {
            constructor() {
                super(...arguments);
                this.onDidChangeConfiguration = emitter.event;
            }
            getValue() {
                return telemetryLevel;
            }
        }(), TestProductService);
        assert.strictEqual(service.telemetryLevel, 0 /* TelemetryLevel.NONE */);
        telemetryLevel = "all" /* TelemetryConfiguration.ON */;
        emitter.fire({ affectsConfiguration: () => true });
        assert.strictEqual(service.telemetryLevel, 3 /* TelemetryLevel.USAGE */);
        telemetryLevel = "error" /* TelemetryConfiguration.ERROR */;
        emitter.fire({ affectsConfiguration: () => true });
        assert.strictEqual(service.telemetryLevel, 2 /* TelemetryLevel.ERROR */);
        service.dispose();
    });
    test('Unexpected Error Telemetry removes Windows PII but preserves code path', sinonTestFn(function () {
        const origErrorHandler = Errors.errorHandler.getUnexpectedErrorHandler();
        Errors.setUnexpectedErrorHandler(() => { });
        try {
            const testAppender = new TestTelemetryAppender();
            const service = new TestErrorTelemetryService({ appenders: [testAppender] });
            const errorTelemetry = new ErrorTelemetry(service);
            const windowsUserPath = 'c:/Users/bpasero/AppData/Local/Programs/Microsoft%20VS%20Code%20Insiders/resources/app/';
            const codePath = 'out/vs/workbench/workbench.desktop.main.js';
            const stack = [
                `    at cTe.gc (vscode-file://vscode-app/${windowsUserPath}${codePath}:2724:81492)`,
                `    at async cTe.setInput (vscode-file://vscode-app/${windowsUserPath}${codePath}:2724:80650)`,
                `    at async qJe.S (vscode-file://vscode-app/${windowsUserPath}${codePath}:698:58520)`,
                `    at async qJe.L (vscode-file://vscode-app/${windowsUserPath}${codePath}:698:57080)`,
                `    at async qJe.openEditor (vscode-file://vscode-app/${windowsUserPath}${codePath}:698:56162)`
            ];
            const windowsError = new Error('The editor could not be opened because the file was not found.');
            windowsError.stack = stack.join('\n');
            Errors.onUnexpectedError(windowsError);
            this.clock.tick(ErrorTelemetry.ERROR_FLUSH_TIMEOUT);
            assert.strictEqual(testAppender.getEventsCount(), 1);
            // Verify PII (username and path) is removed
            assert.strictEqual(testAppender.events[0].data.callstack.indexOf('bpasero'), -1);
            assert.strictEqual(testAppender.events[0].data.callstack.indexOf('Users'), -1);
            assert.strictEqual(testAppender.events[0].data.callstack.indexOf('c:/Users'), -1);
            // Verify important code path is preserved
            assert.notStrictEqual(testAppender.events[0].data.callstack.indexOf(codePath), -1);
            assert.notStrictEqual(testAppender.events[0].data.callstack.indexOf('out/vs/workbench'), -1);
            errorTelemetry.dispose();
            service.dispose();
        }
        finally {
            Errors.setUnexpectedErrorHandler(origErrorHandler);
        }
    }));
    test('Uncaught Error Telemetry removes Windows PII but preserves code path', sinonTestFn(function () {
        const errorStub = sinon.stub();
        mainWindow.onerror = errorStub;
        const testAppender = new TestTelemetryAppender();
        const service = new TestErrorTelemetryService({ appenders: [testAppender] });
        const errorTelemetry = new ErrorTelemetry(service);
        const windowsUserPath = 'c:/Users/bpasero/AppData/Local/Programs/Microsoft%20VS%20Code%20Insiders/resources/app/';
        const codePath = 'out/vs/workbench/workbench.desktop.main.js';
        const stack = [
            `    at cTe.gc (vscode-file://vscode-app/${windowsUserPath}${codePath}:2724:81492)`,
            `    at async cTe.setInput (vscode-file://vscode-app/${windowsUserPath}${codePath}:2724:80650)`,
            `    at async qJe.S (vscode-file://vscode-app/${windowsUserPath}${codePath}:698:58520)`
        ];
        const windowsError = new Error('The editor could not be opened because the file was not found.');
        windowsError.stack = stack.join('\n');
        mainWindow.onerror('The editor could not be opened because the file was not found.', 'test.js', 2, 42, windowsError);
        this.clock.tick(ErrorTelemetry.ERROR_FLUSH_TIMEOUT);
        assert.strictEqual(errorStub.callCount, 1);
        // Verify PII (username and path) is removed
        assert.strictEqual(testAppender.events[0].data.callstack.indexOf('bpasero'), -1);
        assert.strictEqual(testAppender.events[0].data.callstack.indexOf('Users'), -1);
        assert.strictEqual(testAppender.events[0].data.callstack.indexOf('c:/Users'), -1);
        // Verify important code path is preserved
        assert.notStrictEqual(testAppender.events[0].data.callstack.indexOf(codePath), -1);
        assert.notStrictEqual(testAppender.events[0].data.callstack.indexOf('out/vs/workbench'), -1);
        errorTelemetry.dispose();
        service.dispose();
        sinon.restore();
    }));
    test('Unexpected Error Telemetry removes macOS PII but preserves code path', sinonTestFn(function () {
        const origErrorHandler = Errors.errorHandler.getUnexpectedErrorHandler();
        Errors.setUnexpectedErrorHandler(() => { });
        try {
            const testAppender = new TestTelemetryAppender();
            const service = new TestErrorTelemetryService({ appenders: [testAppender] });
            const errorTelemetry = new ErrorTelemetry(service);
            const macUserPath = 'Applications/Visual%20Studio%20Code%20-%20Insiders.app/Contents/Resources/app/';
            const codePath = 'out/vs/workbench/workbench.desktop.main.js';
            const stack = [
                `    at uTe.gc (vscode-file://vscode-app/${macUserPath}${codePath}:2720:81492)`,
                `    at async uTe.setInput (vscode-file://vscode-app/${macUserPath}${codePath}:2720:80650)`,
                `    at async JJe.S (vscode-file://vscode-app/${macUserPath}${codePath}:698:58520)`,
                `    at async JJe.L (vscode-file://vscode-app/${macUserPath}${codePath}:698:57080)`,
                `    at async JJe.openEditor (vscode-file://vscode-app/${macUserPath}${codePath}:698:56162)`
            ];
            const macError = new Error('The editor could not be opened because the file was not found.');
            macError.stack = stack.join('\n');
            Errors.onUnexpectedError(macError);
            this.clock.tick(ErrorTelemetry.ERROR_FLUSH_TIMEOUT);
            assert.strictEqual(testAppender.getEventsCount(), 1);
            // Verify PII (application path) is removed
            assert.strictEqual(testAppender.events[0].data.callstack.indexOf('Applications/Visual'), -1);
            assert.strictEqual(testAppender.events[0].data.callstack.indexOf('Visual%20Studio%20Code'), -1);
            // Verify important code path is preserved
            assert.notStrictEqual(testAppender.events[0].data.callstack.indexOf(codePath), -1);
            assert.notStrictEqual(testAppender.events[0].data.callstack.indexOf('out/vs/workbench'), -1);
            errorTelemetry.dispose();
            service.dispose();
        }
        finally {
            Errors.setUnexpectedErrorHandler(origErrorHandler);
        }
    }));
    test('Uncaught Error Telemetry removes macOS PII but preserves code path', sinonTestFn(function () {
        const errorStub = sinon.stub();
        mainWindow.onerror = errorStub;
        const testAppender = new TestTelemetryAppender();
        const service = new TestErrorTelemetryService({ appenders: [testAppender] });
        const errorTelemetry = new ErrorTelemetry(service);
        const macUserPath = 'Applications/Visual%20Studio%20Code%20-%20Insiders.app/Contents/Resources/app/';
        const codePath = 'out/vs/workbench/workbench.desktop.main.js';
        const stack = [
            `    at uTe.gc (vscode-file://vscode-app/${macUserPath}${codePath}:2720:81492)`,
            `    at async uTe.setInput (vscode-file://vscode-app/${macUserPath}${codePath}:2720:80650)`,
            `    at async JJe.S (vscode-file://vscode-app/${macUserPath}${codePath}:698:58520)`
        ];
        const macError = new Error('The editor could not be opened because the file was not found.');
        macError.stack = stack.join('\n');
        mainWindow.onerror('The editor could not be opened because the file was not found.', 'test.js', 2, 42, macError);
        this.clock.tick(ErrorTelemetry.ERROR_FLUSH_TIMEOUT);
        assert.strictEqual(errorStub.callCount, 1);
        // Verify PII (application path) is removed
        assert.strictEqual(testAppender.events[0].data.callstack.indexOf('Applications/Visual'), -1);
        assert.strictEqual(testAppender.events[0].data.callstack.indexOf('Visual%20Studio%20Code'), -1);
        // Verify important code path is preserved
        assert.notStrictEqual(testAppender.events[0].data.callstack.indexOf(codePath), -1);
        assert.notStrictEqual(testAppender.events[0].data.callstack.indexOf('out/vs/workbench'), -1);
        errorTelemetry.dispose();
        service.dispose();
        sinon.restore();
    }));
    test('Unexpected Error Telemetry removes Linux PII but preserves code path', sinonTestFn(function () {
        const origErrorHandler = Errors.errorHandler.getUnexpectedErrorHandler();
        Errors.setUnexpectedErrorHandler(() => { });
        try {
            const testAppender = new TestTelemetryAppender();
            const service = new TestErrorTelemetryService({ appenders: [testAppender] });
            const errorTelemetry = new ErrorTelemetry(service);
            const linuxUserPath = '/home/parallels/GitDevelopment/vscode-node-sqlite3-perf/';
            const linuxSystemPath = 'usr/share/code-insiders/resources/app/';
            const codePath = 'out/vs/workbench/workbench.desktop.main.js';
            const stack = [
                `    at _kt.G (vscode-file://vscode-app/${linuxSystemPath}${codePath}:3825:65940)`,
                `    at _kt.F (vscode-file://vscode-app/${linuxSystemPath}${codePath}:3825:65765)`,
                `    at async axt.L (vscode-file://vscode-app/${linuxSystemPath}${codePath}:3830:9998)`,
                `    at async axt.readStream (vscode-file://vscode-app/${linuxSystemPath}${codePath}:3830:9773)`,
                `    at async mye.Eb (vscode-file://vscode-app/${linuxSystemPath}${codePath}:1313:12359)`
            ];
            const linuxError = new Error(`Invalid fake file 'git:${linuxUserPath}index.js.git?{"path":"${linuxUserPath}index.js","ref":""}' (Canceled: Canceled)`);
            linuxError.stack = stack.join('\n');
            Errors.onUnexpectedError(linuxError);
            this.clock.tick(ErrorTelemetry.ERROR_FLUSH_TIMEOUT);
            assert.strictEqual(testAppender.getEventsCount(), 1);
            // Verify PII (username and home directory) is removed
            assert.strictEqual(testAppender.events[0].data.msg.indexOf('parallels'), -1);
            assert.strictEqual(testAppender.events[0].data.msg.indexOf('/home/parallels'), -1);
            assert.strictEqual(testAppender.events[0].data.msg.indexOf('GitDevelopment'), -1);
            assert.strictEqual(testAppender.events[0].data.callstack.indexOf('parallels'), -1);
            assert.strictEqual(testAppender.events[0].data.callstack.indexOf('/home/parallels'), -1);
            // Verify important code path is preserved
            assert.notStrictEqual(testAppender.events[0].data.callstack.indexOf(codePath), -1);
            assert.notStrictEqual(testAppender.events[0].data.callstack.indexOf('out/vs/workbench'), -1);
            errorTelemetry.dispose();
            service.dispose();
        }
        finally {
            Errors.setUnexpectedErrorHandler(origErrorHandler);
        }
    }));
    test('Uncaught Error Telemetry removes Linux PII but preserves code path', sinonTestFn(function () {
        const errorStub = sinon.stub();
        mainWindow.onerror = errorStub;
        const testAppender = new TestTelemetryAppender();
        const service = new TestErrorTelemetryService({ appenders: [testAppender] });
        const errorTelemetry = new ErrorTelemetry(service);
        const linuxUserPath = '/home/parallels/GitDevelopment/vscode-node-sqlite3-perf/';
        const linuxSystemPath = 'usr/share/code-insiders/resources/app/';
        const codePath = 'out/vs/workbench/workbench.desktop.main.js';
        const stack = [
            `    at _kt.G (vscode-file://vscode-app/${linuxSystemPath}${codePath}:3825:65940)`,
            `    at _kt.F (vscode-file://vscode-app/${linuxSystemPath}${codePath}:3825:65765)`,
            `    at async axt.L (vscode-file://vscode-app/${linuxSystemPath}${codePath}:3830:9998)`
        ];
        const linuxError = new Error(`Unable to read file 'git:${linuxUserPath}index.js.git'`);
        linuxError.stack = stack.join('\n');
        mainWindow.onerror(`Unable to read file 'git:${linuxUserPath}index.js.git'`, 'test.js', 2, 42, linuxError);
        this.clock.tick(ErrorTelemetry.ERROR_FLUSH_TIMEOUT);
        assert.strictEqual(errorStub.callCount, 1);
        // Verify PII (username and home directory) is removed
        assert.strictEqual(testAppender.events[0].data.msg.indexOf('parallels'), -1);
        assert.strictEqual(testAppender.events[0].data.msg.indexOf('/home/parallels'), -1);
        assert.strictEqual(testAppender.events[0].data.msg.indexOf('GitDevelopment'), -1);
        assert.strictEqual(testAppender.events[0].data.callstack.indexOf('parallels'), -1);
        assert.strictEqual(testAppender.events[0].data.callstack.indexOf('/home/parallels'), -1);
        // Verify important code path is preserved
        assert.notStrictEqual(testAppender.events[0].data.callstack.indexOf(codePath), -1);
        assert.notStrictEqual(testAppender.events[0].data.callstack.indexOf('out/vs/workbench'), -1);
        errorTelemetry.dispose();
        service.dispose();
        sinon.restore();
    }));
    test('Unexpected Error Telemetry strips web origin but preserves path in web stack traces when piiPaths includes origin', sinonTestFn(function () {
        const origErrorHandler = Errors.errorHandler.getUnexpectedErrorHandler();
        Errors.setUnexpectedErrorHandler(() => { });
        try {
            const testAppender = new TestTelemetryAppender();
            const webOrigin = 'https://codespace-host.github.dev';
            const service = new TestErrorTelemetryService({ appenders: [testAppender], piiPaths: [webOrigin] });
            const errorTelemetry = new ErrorTelemetry(service);
            const bundlePath = '/static/build/bundle.js';
            const stack = [
                `Error: Something failed`,
                `    at x3t._delegate (${webOrigin}${bundlePath}:1:200953)`,
                `    at y4u.run (${webOrigin}${bundlePath}:1:304822)`,
                `    at DedicatedWorkerGlobalScope.self.onmessage`,
            ];
            const webError = new Error('Something failed');
            webError.stack = stack.join('\n');
            Errors.onUnexpectedError(webError);
            this.clock.tick(ErrorTelemetry.ERROR_FLUSH_TIMEOUT);
            assert.strictEqual(testAppender.getEventsCount(), 1);
            const cs = testAppender.events[0].data.callstack;
            // Verify the web origin is stripped (not leaked as PII)
            assert.strictEqual(cs.indexOf(webOrigin), -1, 'Web origin should be stripped');
            assert.strictEqual(cs.indexOf('https://'), -1, 'HTTPS scheme should be stripped');
            // Verify the bundle path is preserved for debugging
            assert.notStrictEqual(cs.indexOf(bundlePath), -1, 'Bundle path should be preserved');
            errorTelemetry.dispose();
            service.dispose();
        }
        finally {
            Errors.setUnexpectedErrorHandler(origErrorHandler);
        }
    }));
    ensureNoDisposablesAreLeakedInTestSuite();
});
//# sourceMappingURL=telemetryService.test.js.map