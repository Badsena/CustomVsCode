/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
// This should be the only place that is allowed to import from @vscode/component-explorer
// eslint-disable-next-line local/code-import-patterns
import { defineFixture, defineFixtureGroup, defineFixtureVariants } from '@vscode/component-explorer';
import { DisposableStore, toDisposable } from '../../../../base/common/lifecycle.js';
// eslint-disable-next-line local/code-import-patterns
import '../../../../../../build/vite/style.css';
import '../../../browser/media/style.css';
// Theme
import { IEnvironmentService } from '../../../../platform/environment/common/environment.js';
import { Registry } from '../../../../platform/registry/common/platform.js';
import { getIconsStyleSheet } from '../../../../platform/theme/browser/iconsStyleSheet.js';
import { ColorScheme } from '../../../../platform/theme/common/theme.js';
import { IThemeService, Extensions as ThemingExtensions } from '../../../../platform/theme/common/themeService.js';
import { generateColorThemeCSS } from '../../../services/themes/browser/colorThemeCss.js';
import { ColorThemeData } from '../../../services/themes/common/colorThemeData.js';
import { COLOR_THEME_DARK_INITIAL_COLORS, COLOR_THEME_LIGHT_INITIAL_COLORS } from '../../../services/themes/common/workbenchThemeService.js';
// Instantiation
import { SyncDescriptor } from '../../../../platform/instantiation/common/descriptors.js';
import { ServiceCollection } from '../../../../platform/instantiation/common/serviceCollection.js';
import { TestInstantiationService } from '../../../../platform/instantiation/test/common/instantiationServiceMock.js';
// Test service implementations
import { Emitter, Event } from '../../../../base/common/event.js';
import { mock } from '../../../../base/test/common/mock.js';
import { ICodeEditorService } from '../../../../editor/browser/services/codeEditorService.js';
import { IInlineCompletionsService, InlineCompletionsService } from '../../../../editor/browser/services/inlineCompletionsService.js';
import { ILanguageService } from '../../../../editor/common/languages/language.js';
import { ILanguageConfigurationService } from '../../../../editor/common/languages/languageConfigurationRegistry.js';
import { IEditorWorkerService } from '../../../../editor/common/services/editorWorker.js';
import { ILanguageFeatureDebounceService, LanguageFeatureDebounceService } from '../../../../editor/common/services/languageFeatureDebounce.js';
import { ILanguageFeaturesService } from '../../../../editor/common/services/languageFeatures.js';
import { LanguageFeaturesService } from '../../../../editor/common/services/languageFeaturesService.js';
import { LanguageService } from '../../../../editor/common/services/languageService.js';
import { IModelService } from '../../../../editor/common/services/model.js';
import { ModelService } from '../../../../editor/common/services/modelService.js';
import { ITextResourcePropertiesService } from '../../../../editor/common/services/textResourceConfiguration.js';
import { ITreeSitterLibraryService } from '../../../../editor/common/services/treeSitter/treeSitterLibraryService.js';
import { ICodeLensCache } from '../../../../editor/contrib/codelens/browser/codeLensCache.js';
import { TestCodeEditorService, TestCommandService } from '../../../../editor/test/browser/editorTestServices.js';
import { TestLanguageConfigurationService } from '../../../../editor/test/common/modes/testLanguageConfigurationService.js';
import { TestEditorWorkerService } from '../../../../editor/test/common/services/testEditorWorkerService.js';
import { TestTextResourcePropertiesService } from '../../../../editor/test/common/services/testTextResourcePropertiesService.js';
import { TestTreeSitterLibraryService } from '../../../../editor/test/common/services/testTreeSitterLibraryService.js';
import { IAccessibilityService } from '../../../../platform/accessibility/common/accessibility.js';
import { TestAccessibilityService } from '../../../../platform/accessibility/test/common/testAccessibilityService.js';
import { IActionViewItemService, NullActionViewItemService } from '../../../../platform/actions/browser/actionViewItemService.js';
import { IMenuService } from '../../../../platform/actions/common/actions.js';
import { IClipboardService } from '../../../../platform/clipboard/common/clipboardService.js';
import { TestClipboardService } from '../../../../platform/clipboard/test/common/testClipboardService.js';
import { ICommandService } from '../../../../platform/commands/common/commands.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { TestConfigurationService } from '../../../../platform/configuration/test/common/testConfigurationService.js';
import { IContextKeyService } from '../../../../platform/contextkey/common/contextkey.js';
import { IContextMenuService, IContextViewService } from '../../../../platform/contextview/browser/contextView.js';
import { IDataChannelService, NullDataChannelService } from '../../../../platform/dataChannel/common/dataChannel.js';
import { IDefaultAccountService } from '../../../../platform/defaultAccount/common/defaultAccount.js';
import { IDialogService } from '../../../../platform/dialogs/common/dialogs.js';
import { TestDialogService } from '../../../../platform/dialogs/test/common/testDialogService.js';
import { IHoverService } from '../../../../platform/hover/browser/hover.js';
import { IKeybindingService } from '../../../../platform/keybinding/common/keybinding.js';
import { MockContextKeyService, MockKeybindingService } from '../../../../platform/keybinding/test/common/mockKeybindingService.js';
import { ILabelService } from '../../../../platform/label/common/label.js';
import { ILoggerService, ILogService, NullLoggerService, NullLogService } from '../../../../platform/log/common/log.js';
import { INotificationService } from '../../../../platform/notification/common/notification.js';
import { TestNotificationService } from '../../../../platform/notification/test/common/testNotificationService.js';
import { IOpenerService } from '../../../../platform/opener/common/opener.js';
import { NullOpenerService } from '../../../../platform/opener/test/common/nullOpenerService.js';
import { IStorageService } from '../../../../platform/storage/common/storage.js';
import { ITelemetryService } from '../../../../platform/telemetry/common/telemetry.js';
import { NullTelemetryServiceShape } from '../../../../platform/telemetry/common/telemetryUtils.js';
import { TestThemeService } from '../../../../platform/theme/test/common/testThemeService.js';
import { IUndoRedoService } from '../../../../platform/undoRedo/common/undoRedo.js';
import { UndoRedoService } from '../../../../platform/undoRedo/common/undoRedoService.js';
import { IUserInteractionService, MockUserInteractionService } from '../../../../platform/userInteraction/browser/userInteractionService.js';
import { TestMenuService } from '../workbenchTestServices.js';
// Import color registrations to ensure colors are available
import { isThenable } from '../../../../base/common/async.js';
import '../../../../platform/theme/common/colors/baseColors.js';
import '../../../../platform/theme/common/colors/editorColors.js';
import '../../../../platform/theme/common/colors/listColors.js';
import '../../../../platform/theme/common/colors/miscColors.js';
import '../../../common/theme.js';
/**
 * A storage service that never stores anything and always returns the default/fallback value.
 * This is useful for fixtures where we want consistent behavior without persisted state.
 */
class NullStorageService {
    constructor() {
        this._onDidChangeValue = new Emitter();
        this._onDidChangeTarget = new Emitter();
        this.onDidChangeTarget = this._onDidChangeTarget.event;
        this._onWillSaveState = new Emitter();
        this.onWillSaveState = this._onWillSaveState.event;
    }
    onDidChangeValue(scope, key, disposable) {
        return Event.filter(this._onDidChangeValue.event, e => e.scope === scope && (key === undefined || e.key === key), disposable);
    }
    get(_key, _scope, fallbackValue) {
        return fallbackValue;
    }
    getBoolean(_key, _scope, fallbackValue) {
        return fallbackValue;
    }
    getNumber(_key, _scope, fallbackValue) {
        return fallbackValue;
    }
    getObject(_key, _scope, fallbackValue) {
        return fallbackValue;
    }
    store(_key, _value, _scope, _target) {
        // no-op
    }
    storeAll(_entries, _external) {
        // no-op
    }
    remove(_key, _scope) {
        // no-op
    }
    isNew(_scope) {
        return true;
    }
    flush(_reason) {
        return Promise.resolve();
    }
    optimize(_scope) {
        return Promise.resolve();
    }
    log() {
        // no-op
    }
    keys(_scope, _target) {
        return [];
    }
    switch() {
        return Promise.resolve();
    }
    hasScope(_scope) {
        return false;
    }
}
// ============================================================================
// Themes
// ============================================================================
const themingRegistry = Registry.as(ThemingExtensions.ThemingContribution);
const mockEnvironmentService = Object.create(null);
export const darkTheme = ColorThemeData.createUnloadedThemeForThemeType(ColorScheme.DARK, COLOR_THEME_DARK_INITIAL_COLORS);
export const lightTheme = ColorThemeData.createUnloadedThemeForThemeType(ColorScheme.LIGHT, COLOR_THEME_LIGHT_INITIAL_COLORS);
let globalStyleSheet;
let iconsStyleSheetCache;
let darkThemeStyleSheet;
let lightThemeStyleSheet;
function getGlobalStyleSheet() {
    if (!globalStyleSheet) {
        globalStyleSheet = new CSSStyleSheet();
        const globalRules = [];
        for (const sheet of Array.from(document.styleSheets)) {
            try {
                for (const rule of Array.from(sheet.cssRules)) {
                    globalRules.push(rule.cssText);
                }
            }
            catch {
                // Cross-origin stylesheets can't be read
            }
        }
        globalStyleSheet.replaceSync(globalRules.join('\n'));
    }
    return globalStyleSheet;
}
function getIconsStyleSheetCached() {
    if (!iconsStyleSheetCache) {
        iconsStyleSheetCache = new CSSStyleSheet();
        const iconsSheet = getIconsStyleSheet(undefined);
        iconsStyleSheetCache.replaceSync(iconsSheet.getCSS());
        iconsSheet.dispose();
    }
    return iconsStyleSheetCache;
}
function getThemeStyleSheet(theme) {
    const isDark = theme.type === ColorScheme.DARK;
    if (isDark && darkThemeStyleSheet) {
        return darkThemeStyleSheet;
    }
    if (!isDark && lightThemeStyleSheet) {
        return lightThemeStyleSheet;
    }
    const scopeSelector = '.' + theme.classNames[0];
    const sheet = new CSSStyleSheet();
    const css = generateColorThemeCSS(theme, scopeSelector, themingRegistry.getThemingParticipants(), mockEnvironmentService);
    sheet.replaceSync(css.code);
    if (isDark) {
        darkThemeStyleSheet = sheet;
    }
    else {
        lightThemeStyleSheet = sheet;
    }
    return sheet;
}
let globalStylesInstalled = false;
function installGlobalStyles() {
    if (globalStylesInstalled) {
        return;
    }
    globalStylesInstalled = true;
    document.adoptedStyleSheets = [
        ...document.adoptedStyleSheets,
        getGlobalStyleSheet(),
        getIconsStyleSheetCached(),
        getThemeStyleSheet(darkTheme),
        getThemeStyleSheet(lightTheme),
    ];
}
export function setupTheme(container, theme) {
    installGlobalStyles();
    container.classList.add('monaco-workbench', getPlatformClass(), ...theme.classNames);
}
function getPlatformClass() {
    const alwaysUseMac = true;
    if (alwaysUseMac) {
        return 'mac';
    }
    else {
        const ua = navigator.userAgent;
        if (ua.includes('Macintosh')) {
            return 'mac';
        }
        if (ua.includes('Linux')) {
            return 'linux';
        }
        return 'windows';
    }
}
/**
 * Creates a TestInstantiationService with all services needed for CodeEditorWidget.
 * Additional services can be registered via the options callback.
 */
export function createEditorServices(disposables, options) {
    const services = new ServiceCollection();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const serviceIdentifiers = [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const define = (id, ctor) => {
        if (!services.has(id)) {
            services.set(id, new SyncDescriptor(ctor));
        }
        serviceIdentifiers.push(id);
    };
    const defineInstance = (id, instance) => {
        if (!services.has(id)) {
            services.set(id, instance);
        }
        serviceIdentifiers.push(id);
    };
    // Base editor services
    define(IAccessibilityService, TestAccessibilityService);
    define(IKeybindingService, MockKeybindingService);
    define(IClipboardService, TestClipboardService);
    define(IEditorWorkerService, TestEditorWorkerService);
    defineInstance(IOpenerService, NullOpenerService);
    define(INotificationService, TestNotificationService);
    define(IDialogService, TestDialogService);
    define(IUndoRedoService, UndoRedoService);
    define(ILanguageService, LanguageService);
    define(ILanguageConfigurationService, TestLanguageConfigurationService);
    define(IConfigurationService, TestConfigurationService);
    define(ITextResourcePropertiesService, TestTextResourcePropertiesService);
    defineInstance(IStorageService, new NullStorageService());
    if (options?.colorTheme) {
        defineInstance(IThemeService, new TestThemeService(options.colorTheme));
    }
    else {
        define(IThemeService, TestThemeService);
    }
    define(ILogService, NullLogService);
    define(IModelService, ModelService);
    define(ICodeEditorService, TestCodeEditorService);
    define(IContextKeyService, MockContextKeyService);
    define(ICommandService, TestCommandService);
    define(ITelemetryService, NullTelemetryServiceShape);
    define(ILoggerService, NullLoggerService);
    define(IDataChannelService, NullDataChannelService);
    define(IEnvironmentService, class extends mock() {
        constructor() {
            super(...arguments);
            this.isBuilt = true;
            this.isExtensionDevelopment = false;
        }
    });
    define(ILanguageFeatureDebounceService, LanguageFeatureDebounceService);
    define(ILanguageFeaturesService, LanguageFeaturesService);
    define(ITreeSitterLibraryService, TestTreeSitterLibraryService);
    define(IInlineCompletionsService, InlineCompletionsService);
    defineInstance(ICodeLensCache, {
        _serviceBrand: undefined,
        put: () => { },
        get: () => undefined,
        delete: () => { },
    });
    defineInstance(IHoverService, {
        _serviceBrand: undefined,
        showDelayedHover: () => undefined,
        setupDelayedHover: () => ({ dispose: () => { } }),
        setupDelayedHoverAtMouse: () => ({ dispose: () => { } }),
        showInstantHover: () => undefined,
        hideHover: () => { },
        showAndFocusLastHover: () => { },
        setupManagedHover: () => ({ dispose: () => { }, show: () => { }, hide: () => { }, update: () => { } }),
        showManagedHover: () => { },
    });
    defineInstance(IDefaultAccountService, {
        _serviceBrand: undefined,
        onDidChangeDefaultAccount: new Emitter().event,
        onDidChangePolicyData: new Emitter().event,
        policyData: null,
        copilotTokenInfo: null,
        onDidChangeCopilotTokenInfo: new Emitter().event,
        getDefaultAccount: async () => null,
        getDefaultAccountAuthenticationProvider: () => ({ id: 'test', name: 'Test', scopes: [], enterprise: false }),
        setDefaultAccountProvider: () => { },
        refresh: async () => null,
        signIn: async () => null,
        signOut: async () => { },
    });
    // User interaction service with focus simulation enabled (all elements appear focused in fixtures)
    defineInstance(IUserInteractionService, new MockUserInteractionService(true, false));
    // Allow additional services to be registered
    options?.additionalServices?.({ define, defineInstance });
    const instantiationService = disposables.add(new TestInstantiationService(services, true));
    disposables.add(toDisposable(() => {
        for (const id of serviceIdentifiers) {
            const instanceOrDescriptor = services.get(id);
            if (typeof instanceOrDescriptor?.dispose === 'function') {
                instanceOrDescriptor.dispose();
            }
        }
    }));
    return instantiationService;
}
/**
 * Registers additional services needed by workbench components (merge editor, etc.).
 * Use with createEditorServices additionalServices option.
 */
export function registerWorkbenchServices(registration) {
    registration.defineInstance(IContextMenuService, {
        showContextMenu: () => { },
        onDidShowContextMenu: () => ({ dispose: () => { } }),
        onDidHideContextMenu: () => ({ dispose: () => { } }),
        _serviceBrand: undefined,
    });
    registration.defineInstance(IContextViewService, {
        showContextView: () => ({ close: () => { } }),
        hideContextView: () => { },
        getContextViewElement: () => { throw new Error('Not implemented'); },
        layout: () => { },
        anchorAlignment: 0,
        _serviceBrand: undefined,
    });
    registration.defineInstance(ILabelService, {
        getUriLabel: (uri) => uri.path,
        getUriBasenameLabel: (uri) => uri.path.split('/').pop() ?? '',
        getWorkspaceLabel: () => '',
        getHostLabel: () => '',
        getSeparator: () => '/',
        registerFormatter: () => ({ dispose: () => { } }),
        onDidChangeFormatters: () => ({ dispose: () => { } }),
        registerCachedFormatter: () => ({ dispose: () => { } }),
        _serviceBrand: undefined,
        getHostTooltip: () => '',
    });
    registration.define(IMenuService, TestMenuService);
    registration.define(IActionViewItemService, NullActionViewItemService);
}
// ============================================================================
// Text Models
// ============================================================================
/**
 * Creates a text model using the ModelService.
 */
export function createTextModel(instantiationService, text, uri, languageId) {
    const modelService = instantiationService.get(IModelService);
    const languageService = instantiationService.get(ILanguageService);
    const languageSelection = languageId ? languageService.createById(languageId) : null;
    return modelService.createModel(text, languageSelection, uri);
}
function resolveLabels(labels) {
    const result = [];
    if (labels?.kind === 'screenshot') {
        result.push('.screenshot');
    }
    else if (labels?.kind === 'animated') {
        result.push('animated');
    }
    if (labels?.blocksCi) {
        result.push('blocks-ci');
    }
    return result;
}
/**
 * Creates Dark and Light fixture variants from a single render function.
 * The render function receives a context with container and disposableStore.
 *
 * Note: If render returns a Promise, the async work will run in background.
 * Component-explorer waits 2 animation frames after sync render returns,
 * which should be sufficient for most async setup, but timing is not guaranteed.
 */
export function defineComponentFixture(options) {
    const createFixture = (theme) => defineFixture({
        isolation: 'none',
        displayMode: { type: 'component' },
        properties: [],
        background: theme === darkTheme ? 'dark' : 'light',
        render: (container) => {
            const disposableStore = new DisposableStore();
            setupTheme(container, theme);
            // Start render (may be async) - component-explorer will wait 2 rAF after this returns
            const result = options.render({ container, disposableStore, theme });
            return isThenable(result) ? result.then(() => disposableStore) : disposableStore;
        },
    });
    const labels = resolveLabels(options.labels);
    return defineFixtureVariants(labels.length > 0 ? { labels } : {}, {
        Dark: createFixture(darkTheme),
        Light: createFixture(lightTheme),
    });
}
export function defineThemedFixtureGroup(optionsOrFixtures, fixtures) {
    if (fixtures) {
        const options = optionsOrFixtures;
        return defineFixtureGroup({
            labels: resolveLabels(options.labels),
            path: options.path,
        }, fixtures);
    }
    return defineFixtureGroup(optionsOrFixtures);
}
//# sourceMappingURL=fixtureUtils.js.map