/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { CancellationToken } from '../../../../../../base/common/cancellation.js';
import { DisposableStore } from '../../../../../../base/common/lifecycle.js';
import { URI } from '../../../../../../base/common/uri.js';
import { Range } from '../../../../../../editor/common/core/range.js';
import { LanguageFeaturesService } from '../../../../../../editor/common/services/languageFeaturesService.js';
import { createTextModel } from '../../../../../../editor/test/common/testTextModel.js';
import { FileMatch, OneLineRange, TextSearchMatch } from '../../../../../services/search/common/search.js';
import { UsagesTool, UsagesToolId } from '../../../browser/tools/usagesTool.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../../base/test/common/utils.js';
function getTextContent(result) {
    const part = result.content.find((p) => p.kind === 'text');
    return part?.value ?? '';
}
suite('UsagesTool', () => {
    const disposables = new DisposableStore();
    let langFeatures;
    const testUri = URI.parse('file:///test/file.ts');
    const testContent = [
        'import { MyClass } from "./myClass";',
        '',
        'function doSomething() {',
        '\tconst instance = new MyClass();',
        '\tinstance.run();',
        '}',
    ].join('\n');
    function createMockModelService(models) {
        return {
            _serviceBrand: undefined,
            getModel: (uri) => models?.find(m => m.uri.toString() === uri.toString()) ?? null,
        };
    }
    function createMockSearchService(searchImpl) {
        return {
            _serviceBrand: undefined,
            textSearch: async (query) => searchImpl?.(query) ?? { results: [], messages: [] },
        };
    }
    function createMockTextModelService(model) {
        return {
            _serviceBrand: undefined,
            createModelReference: async () => ({
                object: { textEditorModel: model },
                dispose: () => { },
            }),
            registerTextModelContentProvider: () => ({ dispose: () => { } }),
            canHandleResource: () => false,
        };
    }
    function createMockWorkspaceService() {
        const folderUri = URI.parse('file:///test');
        const folder = {
            uri: folderUri,
            toResource: (relativePath) => URI.parse(`file:///test/${relativePath}`),
        };
        return {
            _serviceBrand: undefined,
            getWorkspace: () => ({ folders: [folder] }),
            getWorkspaceFolder: (uri) => {
                if (uri.toString().startsWith(folderUri.toString())) {
                    return folder;
                }
                return null;
            },
        };
    }
    function createInvocation(parameters) {
        return { parameters };
    }
    const noopCountTokens = async () => 0;
    const noopProgress = { report() { } };
    function createTool(textModelService, workspaceService, options) {
        return new UsagesTool(langFeatures, options?.modelService ?? createMockModelService(), options?.searchService ?? createMockSearchService(), textModelService, workspaceService);
    }
    setup(() => {
        langFeatures = new LanguageFeaturesService();
    });
    teardown(() => {
        disposables.clear();
    });
    ensureNoDisposablesAreLeakedInTestSuite();
    suite('getToolData', () => {
        test('reports no providers when none registered', () => {
            const tool = disposables.add(createTool(createMockTextModelService(null), createMockWorkspaceService()));
            const data = tool.getToolData();
            assert.strictEqual(data.id, UsagesToolId);
            assert.ok(data.modelDescription.includes('No languages currently have reference providers'));
        });
        test('lists registered language ids', () => {
            const model = disposables.add(createTextModel('', 'typescript', undefined, testUri));
            const tool = disposables.add(createTool(createMockTextModelService(model), createMockWorkspaceService()));
            disposables.add(langFeatures.referenceProvider.register('typescript', { provideReferences: () => [] }));
            const data = tool.getToolData();
            assert.ok(data.modelDescription.includes('typescript'));
        });
        test('reports all languages for wildcard', () => {
            const tool = disposables.add(createTool(createMockTextModelService(null), createMockWorkspaceService()));
            disposables.add(langFeatures.referenceProvider.register('*', { provideReferences: () => [] }));
            const data = tool.getToolData();
            assert.ok(data.modelDescription.includes('all languages'));
        });
    });
    suite('invoke', () => {
        test('returns error when no uri or filePath provided', async () => {
            const tool = disposables.add(createTool(createMockTextModelService(null), createMockWorkspaceService()));
            const result = await tool.invoke(createInvocation({ symbol: 'MyClass', lineContent: 'MyClass' }), noopCountTokens, noopProgress, CancellationToken.None);
            assert.ok(getTextContent(result).includes('Provide either'));
        });
        test('returns error when line content not found', async () => {
            const model = disposables.add(createTextModel(testContent, 'typescript', undefined, testUri));
            disposables.add(langFeatures.referenceProvider.register('typescript', { provideReferences: () => [] }));
            const tool = disposables.add(createTool(createMockTextModelService(model), createMockWorkspaceService()));
            const result = await tool.invoke(createInvocation({ symbol: 'MyClass', uri: testUri.toString(), lineContent: 'nonexistent line' }), noopCountTokens, noopProgress, CancellationToken.None);
            assert.ok(getTextContent(result).includes('Could not find line content'));
        });
        test('returns error when symbol not found in line', async () => {
            const model = disposables.add(createTextModel(testContent, 'typescript', undefined, testUri));
            disposables.add(langFeatures.referenceProvider.register('typescript', { provideReferences: () => [] }));
            const tool = disposables.add(createTool(createMockTextModelService(model), createMockWorkspaceService()));
            const result = await tool.invoke(createInvocation({ symbol: 'NotHere', uri: testUri.toString(), lineContent: 'function doSomething' }), noopCountTokens, noopProgress, CancellationToken.None);
            assert.ok(getTextContent(result).includes('Could not find symbol'));
        });
        test('finds references and classifies them with usage tags', async () => {
            const model = disposables.add(createTextModel(testContent, 'typescript', undefined, testUri));
            const otherUri = URI.parse('file:///test/other.ts');
            const refProvider = {
                provideReferences: (_model) => [
                    { uri: testUri, range: new Range(1, 10, 1, 17) },
                    { uri: testUri, range: new Range(4, 23, 4, 30) },
                    { uri: otherUri, range: new Range(5, 1, 5, 8) },
                ]
            };
            const defProvider = {
                provideDefinition: () => [{ uri: testUri, range: new Range(1, 10, 1, 17) }]
            };
            const implProvider = {
                provideImplementation: () => [{ uri: otherUri, range: new Range(5, 1, 5, 8) }]
            };
            disposables.add(langFeatures.referenceProvider.register('typescript', refProvider));
            disposables.add(langFeatures.definitionProvider.register('typescript', defProvider));
            disposables.add(langFeatures.implementationProvider.register('typescript', implProvider));
            // Model is open for testUri so IModelService returns it; otherUri needs search
            const searchCalled = [];
            const searchService = createMockSearchService(query => {
                searchCalled.push(query);
                const fileMatch = new FileMatch(otherUri);
                fileMatch.results = [new TextSearchMatch('export class MyClass implements IMyClass {', new OneLineRange(4, 0, 7) // 0-based line 4 = 1-based line 5
                    )];
                return { results: [fileMatch], messages: [] };
            });
            const modelService = createMockModelService([model]);
            const tool = disposables.add(createTool(createMockTextModelService(model), createMockWorkspaceService(), { modelService, searchService }));
            const result = await tool.invoke(createInvocation({ symbol: 'MyClass', uri: testUri.toString(), lineContent: 'import { MyClass }' }), noopCountTokens, noopProgress, CancellationToken.None);
            const text = getTextContent(result);
            // Check overall structure
            assert.ok(text.includes('3 usages of `MyClass`'));
            // Check usage tag format
            assert.ok(text.includes(`<usage type="definition" uri="${testUri.toString()}" line="1">`));
            assert.ok(text.includes(`<usage type="reference" uri="${testUri.toString()}" line="4">`));
            assert.ok(text.includes(`<usage type="implementation" uri="${otherUri.toString()}" line="5">`));
            // Check that previews from open model are included (testUri lines)
            assert.ok(text.includes('import { MyClass } from "./myClass"'));
            assert.ok(text.includes('const instance = new MyClass()'));
            // Check that preview from search service is included (otherUri)
            assert.ok(text.includes('export class MyClass implements IMyClass {'));
            // Check closing tags
            assert.ok(text.includes('</usage>'));
            // Verify search service was called for the non-open file
            assert.strictEqual(searchCalled.length, 1);
            assert.ok(searchCalled[0].contentPattern.pattern.includes('MyClass'));
            assert.ok(searchCalled[0].contentPattern.isWordMatch);
        });
        test('uses self-closing tag when no preview available', async () => {
            const model = disposables.add(createTextModel(testContent, 'typescript', undefined, testUri));
            const otherUri = URI.parse('file:///test/other.ts');
            disposables.add(langFeatures.referenceProvider.register('typescript', {
                provideReferences: () => [
                    { uri: otherUri, range: new Range(10, 5, 10, 12) },
                ]
            }));
            // Search returns no results for this file (symbol renamed/aliased)
            const searchService = createMockSearchService(() => ({ results: [], messages: [] }));
            const tool = disposables.add(createTool(createMockTextModelService(model), createMockWorkspaceService(), { searchService }));
            const result = await tool.invoke(createInvocation({ symbol: 'MyClass', uri: testUri.toString(), lineContent: 'import { MyClass }' }), noopCountTokens, noopProgress, CancellationToken.None);
            const text = getTextContent(result);
            assert.ok(text.includes(`<usage type="reference" uri="${otherUri.toString()}" line="10" />`));
        });
        test('does not call search service for files already open in model service', async () => {
            const model = disposables.add(createTextModel(testContent, 'typescript', undefined, testUri));
            disposables.add(langFeatures.referenceProvider.register('typescript', {
                provideReferences: () => [
                    { uri: testUri, range: new Range(1, 10, 1, 17) },
                ]
            }));
            let searchCalled = false;
            const searchService = createMockSearchService(() => {
                searchCalled = true;
                return { results: [], messages: [] };
            });
            const modelService = createMockModelService([model]);
            const tool = disposables.add(createTool(createMockTextModelService(model), createMockWorkspaceService(), { modelService, searchService }));
            const result = await tool.invoke(createInvocation({ symbol: 'MyClass', uri: testUri.toString(), lineContent: 'import { MyClass }' }), noopCountTokens, noopProgress, CancellationToken.None);
            assert.ok(getTextContent(result).includes('1 usages'));
            assert.strictEqual(searchCalled, false, 'search service should not be called when all files are open');
        });
        test('handles whitespace normalization in lineContent', async () => {
            const content = 'function   doSomething(x:  number) {}';
            const model = disposables.add(createTextModel(content, 'typescript', undefined, testUri));
            disposables.add(langFeatures.referenceProvider.register('typescript', {
                provideReferences: () => [
                    { uri: testUri, range: new Range(1, 12, 1, 23) },
                ]
            }));
            const tool = disposables.add(createTool(createMockTextModelService(model), createMockWorkspaceService()));
            const result = await tool.invoke(createInvocation({ symbol: 'doSomething', uri: testUri.toString(), lineContent: 'function doSomething(x: number)' }), noopCountTokens, noopProgress, CancellationToken.None);
            assert.ok(getTextContent(result).includes('1 usages'));
        });
        test('resolves filePath via workspace folders', async () => {
            const fileUri = URI.parse('file:///test/src/file.ts');
            const model = disposables.add(createTextModel(testContent, 'typescript', undefined, fileUri));
            disposables.add(langFeatures.referenceProvider.register('typescript', {
                provideReferences: () => [
                    { uri: fileUri, range: new Range(1, 10, 1, 17) },
                ]
            }));
            const tool = disposables.add(createTool(createMockTextModelService(model), createMockWorkspaceService()));
            const result = await tool.invoke(createInvocation({ symbol: 'MyClass', filePath: 'src/file.ts', lineContent: 'import { MyClass }' }), noopCountTokens, noopProgress, CancellationToken.None);
            assert.ok(getTextContent(result).includes('1 usages'));
        });
    });
});
//# sourceMappingURL=usagesTool.test.js.map