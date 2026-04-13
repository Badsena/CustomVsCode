/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var ModelNameColumnRenderer_1, MultiplierColumnRenderer_1, TokenLimitsColumnRenderer_1, ActionsColumnRenderer_1, ChatModelsWidget_1;
import './media/chatModelsWidget.css';
import { Disposable, DisposableStore } from '../../../../../base/common/lifecycle.js';
import { Emitter } from '../../../../../base/common/event.js';
import * as DOM from '../../../../../base/browser/dom.js';
import { Button } from '../../../../../base/browser/ui/button/button.js';
import { ThemeIcon } from '../../../../../base/common/themables.js';
import { ILanguageModelsService } from '../../../chat/common/languageModels.js';
import { localize } from '../../../../../nls.js';
import { defaultButtonStyles } from '../../../../../platform/theme/browser/defaultStyles.js';
import { IInstantiationService } from '../../../../../platform/instantiation/common/instantiation.js';
import { WorkbenchTable } from '../../../../../platform/list/browser/listService.js';
import { IHoverService } from '../../../../../platform/hover/browser/hover.js';
import { MarkdownString } from '../../../../../base/common/htmlContent.js';
import { IExtensionService } from '../../../../services/extensions/common/extensions.js';
import { IContextMenuService } from '../../../../../platform/contextview/browser/contextView.js';
import { toAction, Action, Separator, SubmenuAction } from '../../../../../base/common/actions.js';
import { ActionBar } from '../../../../../base/browser/ui/actionbar/actionbar.js';
import { Codicon } from '../../../../../base/common/codicons.js';
import { ChatModelsViewModel, SEARCH_SUGGESTIONS, isLanguageModelProviderEntry, isLanguageModelGroupEntry, isStatusEntry } from './chatModelsViewModel.js';
import { HighlightedLabel } from '../../../../../base/browser/ui/highlightedlabel/highlightedLabel.js';
import { SuggestEnabledInput } from '../../../codeEditor/browser/suggestEnabledInput/suggestEnabledInput.js';
import { Delayer } from '../../../../../base/common/async.js';
import { settingsTextInputBorder } from '../../../preferences/common/settingsEditorColorRegistry.js';
import { IChatEntitlementService, ChatEntitlement } from '../../../../services/chat/common/chatEntitlementService.js';
import { DropdownMenuActionViewItem } from '../../../../../base/browser/ui/dropdown/dropdownActionViewItem.js';
import { ToolBar } from '../../../../../base/browser/ui/toolbar/toolbar.js';
import { preferencesClearInputIcon } from '../../../preferences/browser/preferencesIcons.js';
import { ICommandService } from '../../../../../platform/commands/common/commands.js';
import { IEditorProgressService } from '../../../../../platform/progress/common/progress.js';
import { IContextKeyService } from '../../../../../platform/contextkey/common/contextkey.js';
import { CONTEXT_MODELS_SEARCH_FOCUS } from '../../common/constants.js';
import { IDialogService } from '../../../../../platform/dialogs/common/dialogs.js';
import Severity from '../../../../../base/common/severity.js';
const $ = DOM.$;
const HEADER_HEIGHT = 30;
const VENDOR_ROW_HEIGHT = 30;
const MODEL_ROW_HEIGHT = 26;
export function getModelHoverContent(model) {
    const markdown = new MarkdownString('', { isTrusted: true, supportThemeIcons: true });
    markdown.appendMarkdown(`**${model.metadata.name}**`);
    if (model.metadata.id !== model.metadata.version) {
        markdown.appendMarkdown(`&nbsp;<span style="background-color:#8080802B;">&nbsp;_${model.metadata.id}@${model.metadata.version}_&nbsp;</span>`);
    }
    else {
        markdown.appendMarkdown(`&nbsp;<span style="background-color:#8080802B;">&nbsp;_${model.metadata.id}_&nbsp;</span>`);
    }
    markdown.appendText(`\n`);
    if (model.metadata.statusIcon && model.metadata.tooltip) {
        if (model.metadata.statusIcon) {
            markdown.appendMarkdown(`$(${model.metadata.statusIcon.id})&nbsp;`);
        }
        markdown.appendMarkdown(`${model.metadata.tooltip}`);
        markdown.appendText(`\n`);
    }
    if (model.metadata.multiplier) {
        markdown.appendMarkdown(`${localize(7197, null)}: `);
        markdown.appendMarkdown(model.metadata.multiplier);
        markdown.appendText(`\n`);
    }
    if (model.metadata.maxInputTokens || model.metadata.maxOutputTokens) {
        const totalTokens = (model.metadata.maxInputTokens ?? 0) + (model.metadata.maxOutputTokens ?? 0);
        markdown.appendMarkdown(`${localize(7198, null)}: `);
        markdown.appendMarkdown(`${formatTokenCount(totalTokens)}`);
        markdown.appendText(`\n`);
    }
    if (model.metadata.capabilities) {
        markdown.appendMarkdown(`${localize(7199, null)}: `);
        if (model.metadata.capabilities?.toolCalling) {
            markdown.appendMarkdown(`&nbsp;<span style="background-color:#8080802B;">&nbsp;_${localize(7200, null)}_&nbsp;</span>`);
        }
        if (model.metadata.capabilities?.vision) {
            markdown.appendMarkdown(`&nbsp;<span style="background-color:#8080802B;">&nbsp;_${localize(7201, null)}_&nbsp;</span>`);
        }
        if (model.metadata.capabilities?.agentMode) {
            markdown.appendMarkdown(`&nbsp;<span style="background-color:#8080802B;">&nbsp;_${localize(7202, null)}_&nbsp;</span>`);
        }
        for (const editTool of model.metadata.capabilities.editTools ?? []) {
            markdown.appendMarkdown(`&nbsp;<span style="background-color:#8080802B;">&nbsp;_${editTool}_&nbsp;</span>`);
        }
        markdown.appendText(`\n`);
    }
    return markdown;
}
class ModelsFilterAction extends Action {
    constructor() {
        super('workbench.models.filter', localize(7203, null), ThemeIcon.asClassName(Codicon.filter));
    }
    async run() {
    }
}
function toggleFilter(currentQuery, filter) {
    const { query, synonyms = [], excludes = [] } = filter;
    const allSynonyms = [query, ...synonyms];
    const isChecked = allSynonyms.some(q => currentQuery.includes(q));
    const hasExcludedQuery = excludes.some(q => currentQuery.includes(q));
    if (isChecked) {
        // Query or synonym is already set, remove all of them (toggle off)
        let queryWithRemovedFilter = currentQuery;
        for (const q of allSynonyms) {
            queryWithRemovedFilter = queryWithRemovedFilter.replace(q, '');
        }
        return queryWithRemovedFilter.replace(/\s+/g, ' ').trim();
    }
    else if (hasExcludedQuery) {
        // An excluded query is set, replace it with the new query
        let newQuery = currentQuery;
        for (const q of excludes) {
            newQuery = newQuery.replace(q, '');
        }
        newQuery = newQuery.replace(/\s+/g, ' ').trim();
        return newQuery ? `${newQuery} ${query}` : query;
    }
    else {
        // No filter is set, add the new query
        const trimmedQuery = currentQuery.trim();
        return trimmedQuery ? `${trimmedQuery} ${query}` : query;
    }
}
let ModelsSearchFilterDropdownMenuActionViewItem = class ModelsSearchFilterDropdownMenuActionViewItem extends DropdownMenuActionViewItem {
    constructor(action, options, search, viewModel, contextMenuService) {
        super(action, { getActions: () => this.getActions() }, contextMenuService, {
            ...options,
            classNames: action.class,
            anchorAlignmentProvider: () => 1 /* AnchorAlignment.RIGHT */,
            menuAsChild: true
        });
        this.search = search;
        this.viewModel = viewModel;
    }
    createGroupByAction(grouping, label) {
        return {
            id: `groupBy.${grouping}`,
            label,
            class: undefined,
            enabled: true,
            tooltip: localize(7204, null, label),
            checked: this.viewModel.groupBy === grouping,
            run: () => {
                this.viewModel.groupBy = grouping;
            }
        };
    }
    createProviderAction(vendor, displayName) {
        const query = `@provider:"${displayName}"`;
        const currentQuery = this.search.getValue();
        const isChecked = currentQuery.includes(query) || currentQuery.includes(`@provider:${vendor}`);
        return {
            id: `provider-${vendor}`,
            label: displayName,
            tooltip: localize(7205, null, displayName),
            class: undefined,
            enabled: true,
            checked: isChecked,
            run: () => this.toggleFilterAndSearch({ query, synonyms: [`@provider:${vendor}`] })
        };
    }
    createCapabilityAction(capability, label) {
        const query = `@capability:${capability}`;
        const currentQuery = this.search.getValue();
        const isChecked = currentQuery.includes(query);
        return {
            id: `capability-${capability}`,
            label,
            tooltip: localize(7206, null, label),
            class: undefined,
            enabled: true,
            checked: isChecked,
            run: () => this.toggleFilterAndSearch({ query })
        };
    }
    createVisibleAction(visible, label) {
        const query = `@visible:${visible}`;
        const currentQuery = this.search.getValue();
        const isChecked = currentQuery.includes(query);
        return {
            id: `visible-${visible}`,
            label,
            tooltip: localize(7207, null, label),
            class: undefined,
            enabled: true,
            checked: isChecked,
            run: () => this.toggleFilterAndSearch({ query, excludes: [`@visible:${!visible}`] })
        };
    }
    toggleFilterAndSearch(filter) {
        const currentQuery = this.search.getValue();
        const newQuery = toggleFilter(currentQuery, filter);
        this.search.setValue(newQuery);
    }
    getActions() {
        const actions = [];
        // Capability filters
        actions.push(this.createCapabilityAction('tools', localize(7208, null)), this.createCapabilityAction('vision', localize(7209, null)), this.createCapabilityAction('agent', localize(7210, null)));
        // Visibility filters
        actions.push(new Separator());
        actions.push(this.createVisibleAction(true, localize(7211, null)));
        actions.push(this.createVisibleAction(false, localize(7212, null)));
        // Provider filters - only show providers with configured models
        const configuredVendors = this.viewModel.getConfiguredVendors();
        if (configuredVendors.length > 1) {
            actions.push(new Separator());
            actions.push(...configuredVendors.map(vendor => this.createProviderAction(vendor.vendor.vendor, vendor.group.name)));
        }
        // Group By
        actions.push(new Separator());
        const groupByActions = [];
        groupByActions.push(this.createGroupByAction("vendor" /* ChatModelGroup.Vendor */, localize(7213, null)));
        groupByActions.push(this.createGroupByAction("visibility" /* ChatModelGroup.Visibility */, localize(7214, null)));
        actions.push(new SubmenuAction('groupBy', localize(7215, null), groupByActions));
        return actions;
    }
};
ModelsSearchFilterDropdownMenuActionViewItem = __decorate([
    __param(4, IContextMenuService)
], ModelsSearchFilterDropdownMenuActionViewItem);
class Delegate {
    constructor() {
        this.headerRowHeight = HEADER_HEIGHT;
    }
    getHeight(element) {
        return isLanguageModelProviderEntry(element) || isLanguageModelGroupEntry(element) ? VENDOR_ROW_HEIGHT : MODEL_ROW_HEIGHT;
    }
}
class ModelsTableColumnRenderer {
    renderElement(element, index, templateData) {
        templateData.elementDisposables.clear();
        const isVendor = isLanguageModelProviderEntry(element);
        const isGroup = isLanguageModelGroupEntry(element);
        const isStatus = isStatusEntry(element);
        templateData.container.classList.add('models-table-column');
        templateData.container.parentElement.classList.toggle('models-vendor-row', isVendor || isGroup);
        templateData.container.parentElement.classList.toggle('models-model-row', !isVendor && !isGroup);
        templateData.container.parentElement.classList.toggle('models-status-row', isStatus);
        templateData.container.parentElement.classList.toggle('model-hidden', !isVendor && !isGroup && !isStatus && !element.model.visible);
        if (isVendor) {
            this.renderVendorElement(element, index, templateData);
        }
        else if (isGroup) {
            this.renderGroupElement(element, index, templateData);
        }
        else if (isStatus) {
            this.renderStatusElement(element, index, templateData);
        }
        else {
            this.renderModelElement(element, index, templateData);
        }
    }
    renderStatusElement(element, index, templateData) { }
    disposeTemplate(templateData) {
        templateData.elementDisposables.dispose();
        templateData.disposables.dispose();
    }
}
class GutterColumnRenderer extends ModelsTableColumnRenderer {
    static { this.TEMPLATE_ID = 'gutter'; }
    constructor(viewModel) {
        super();
        this.viewModel = viewModel;
        this.templateId = GutterColumnRenderer.TEMPLATE_ID;
    }
    renderTemplate(container) {
        const disposables = new DisposableStore();
        const elementDisposables = new DisposableStore();
        container.classList.add('models-gutter-column');
        const actionBar = disposables.add(new ActionBar(container));
        return {
            listRowElement: container.parentElement?.parentElement ?? null,
            container,
            actionBar,
            disposables,
            elementDisposables
        };
    }
    renderElement(entry, index, templateData) {
        templateData.actionBar.clear();
        super.renderElement(entry, index, templateData);
    }
    renderVendorElement(entry, index, templateData) {
        this.renderCollapsableElement(entry, templateData);
    }
    renderGroupElement(entry, index, templateData) {
        this.renderCollapsableElement(entry, templateData);
    }
    renderCollapsableElement(entry, templateData) {
        if (templateData.listRowElement) {
            templateData.listRowElement.setAttribute('aria-expanded', entry.collapsed ? 'false' : 'true');
        }
        const label = entry.collapsed ? localize(7216, null) : localize(7217, null);
        const toggleCollapseAction = {
            id: 'toggleCollapse',
            label,
            tooltip: label,
            enabled: true,
            class: ThemeIcon.asClassName(entry.collapsed ? Codicon.chevronRight : Codicon.chevronDown),
            run: () => this.viewModel.toggleCollapsed(entry)
        };
        templateData.actionBar.push(toggleCollapseAction, { icon: true, label: false });
    }
    renderModelElement(entry, index, templateData) {
        const { model: modelEntry } = entry;
        const isVisible = modelEntry.visible;
        const toggleVisibilityAction = toAction({
            id: 'toggleVisibility',
            label: isVisible ? localize(7218, null) : localize(7219, null),
            class: `model-visibility-toggle ${isVisible ? `${ThemeIcon.asClassName(Codicon.eye)} model-visible` : `${ThemeIcon.asClassName(Codicon.eyeClosed)} model-hidden`}`,
            tooltip: isVisible ? localize(7220, null) : localize(7221, null),
            checked: !isVisible,
            run: async () => this.viewModel.toggleVisibility(entry)
        });
        templateData.actionBar.push(toggleVisibilityAction, { icon: true, label: false });
    }
}
let ModelNameColumnRenderer = class ModelNameColumnRenderer extends ModelsTableColumnRenderer {
    static { ModelNameColumnRenderer_1 = this; }
    static { this.TEMPLATE_ID = 'modelName'; }
    constructor(hoverService) {
        super();
        this.hoverService = hoverService;
        this.templateId = ModelNameColumnRenderer_1.TEMPLATE_ID;
    }
    renderTemplate(container) {
        const disposables = new DisposableStore();
        const elementDisposables = new DisposableStore();
        const nameContainer = DOM.append(container, $('.model-name-container'));
        const statusIcon = DOM.append(nameContainer, $('.status-icon'));
        const nameLabel = disposables.add(new HighlightedLabel(DOM.append(nameContainer, $('.model-name'))));
        const modelStatusIcon = DOM.append(nameContainer, $('.model-status-icon'));
        const actionBar = disposables.add(new ActionBar(DOM.append(nameContainer, $('.model-name-actions'))));
        return {
            container,
            statusIcon,
            nameLabel,
            modelStatusIcon,
            actionBar,
            disposables,
            elementDisposables
        };
    }
    renderElement(entry, index, templateData) {
        DOM.clearNode(templateData.modelStatusIcon);
        templateData.actionBar.clear();
        templateData.nameLabel.element.classList.remove('error-status', 'warning-status', 'info-status');
        super.renderElement(entry, index, templateData);
    }
    renderVendorElement(entry, index, templateData) {
        templateData.nameLabel.set(entry.vendorEntry.group.name, undefined);
    }
    renderGroupElement(entry, index, templateData) {
        templateData.nameLabel.set(entry.label, undefined);
    }
    renderModelElement(entry, index, templateData) {
        const { model: modelEntry, modelNameMatches } = entry;
        templateData.statusIcon.style.display = 'none';
        templateData.modelStatusIcon.className = 'model-status-icon';
        if (modelEntry.metadata.statusIcon) {
            templateData.modelStatusIcon.classList.add(...ThemeIcon.asClassNameArray(modelEntry.metadata.statusIcon));
            templateData.modelStatusIcon.style.display = '';
        }
        else {
            templateData.modelStatusIcon.style.display = 'none';
        }
        templateData.nameLabel.set(modelEntry.metadata.name, modelNameMatches);
        const markdown = new MarkdownString('', { isTrusted: true, supportThemeIcons: true });
        markdown.appendMarkdown(`**${entry.model.metadata.name}**`);
        if (entry.model.metadata.id !== entry.model.metadata.version) {
            markdown.appendMarkdown(`&nbsp;<span style="background-color:#8080802B;">&nbsp;_${entry.model.metadata.id}@${entry.model.metadata.version}_&nbsp;</span>`);
        }
        else {
            markdown.appendMarkdown(`&nbsp;<span style="background-color:#8080802B;">&nbsp;_${entry.model.metadata.id}_&nbsp;</span>`);
        }
        markdown.appendText(`\n`);
        if (entry.model.metadata.statusIcon && entry.model.metadata.tooltip) {
            if (entry.model.metadata.statusIcon) {
                markdown.appendMarkdown(`$(${entry.model.metadata.statusIcon.id})&nbsp;`);
            }
            markdown.appendMarkdown(`${entry.model.metadata.tooltip}`);
            markdown.appendText(`\n`);
        }
        if (!entry.model.visible) {
            markdown.appendMarkdown(`\n\n${localize(7222, null)}`);
        }
        templateData.elementDisposables.add(this.hoverService.setupDelayedHoverAtMouse(templateData.container, () => ({
            content: markdown,
            appearance: {
                compact: true,
                skipFadeInAnimation: true,
            }
        })));
    }
    renderStatusElement(entry, index, templateData) {
        templateData.statusIcon.style.display = '';
        templateData.statusIcon.className = 'status-icon';
        switch (entry.severity) {
            case Severity.Error:
                templateData.nameLabel.element.classList.add('error-status');
                templateData.statusIcon.classList.add(...ThemeIcon.asClassNameArray(Codicon.error));
                break;
            case Severity.Warning:
                templateData.nameLabel.element.classList.add('warning-status');
                templateData.statusIcon.classList.add(...ThemeIcon.asClassNameArray(Codicon.warning));
                break;
            case Severity.Info:
                templateData.nameLabel.element.classList.add('info-status');
                templateData.statusIcon.classList.add(...ThemeIcon.asClassNameArray(Codicon.info));
                break;
        }
        templateData.nameLabel.set(entry.message, undefined, entry.message);
    }
};
ModelNameColumnRenderer = ModelNameColumnRenderer_1 = __decorate([
    __param(0, IHoverService)
], ModelNameColumnRenderer);
let MultiplierColumnRenderer = class MultiplierColumnRenderer extends ModelsTableColumnRenderer {
    static { MultiplierColumnRenderer_1 = this; }
    static { this.TEMPLATE_ID = 'multiplier'; }
    constructor(hoverService) {
        super();
        this.hoverService = hoverService;
        this.templateId = MultiplierColumnRenderer_1.TEMPLATE_ID;
    }
    renderTemplate(container) {
        const disposables = new DisposableStore();
        const elementDisposables = new DisposableStore();
        const multiplierElement = DOM.append(container, $('.model-multiplier'));
        return {
            container,
            multiplierElement,
            disposables,
            elementDisposables
        };
    }
    renderElement(entry, index, templateData) {
        templateData.multiplierElement.textContent = '';
        super.renderElement(entry, index, templateData);
    }
    renderGroupElement(element, index, templateData) {
    }
    renderVendorElement(element, index, templateData) {
    }
    renderModelElement(entry, index, templateData) {
        const multiplierText = entry.model.metadata.multiplier ?? '-';
        templateData.multiplierElement.textContent = multiplierText;
        if (multiplierText !== '-') {
            templateData.elementDisposables.add(this.hoverService.setupDelayedHoverAtMouse(templateData.container, () => ({
                content: localize(7223, null, multiplierText),
                appearance: {
                    compact: true,
                    skipFadeInAnimation: true
                }
            })));
        }
    }
};
MultiplierColumnRenderer = MultiplierColumnRenderer_1 = __decorate([
    __param(0, IHoverService)
], MultiplierColumnRenderer);
let TokenLimitsColumnRenderer = class TokenLimitsColumnRenderer extends ModelsTableColumnRenderer {
    static { TokenLimitsColumnRenderer_1 = this; }
    static { this.TEMPLATE_ID = 'tokenLimits'; }
    constructor(hoverService) {
        super();
        this.hoverService = hoverService;
        this.templateId = TokenLimitsColumnRenderer_1.TEMPLATE_ID;
    }
    renderTemplate(container) {
        const disposables = new DisposableStore();
        const elementDisposables = new DisposableStore();
        const tokenLimitsElement = DOM.append(container, $('.model-token-limits'));
        return {
            container,
            tokenLimitsElement,
            disposables,
            elementDisposables
        };
    }
    renderElement(entry, index, templateData) {
        DOM.clearNode(templateData.tokenLimitsElement);
        super.renderElement(entry, index, templateData);
    }
    renderVendorElement(entry, index, templateData) {
    }
    renderGroupElement(entry, index, templateData) {
    }
    renderModelElement(entry, index, templateData) {
        const { model: modelEntry } = entry;
        const markdown = new MarkdownString('', { isTrusted: true, supportThemeIcons: true });
        if (modelEntry.metadata.maxInputTokens || modelEntry.metadata.maxOutputTokens) {
            const totalTokens = (modelEntry.metadata.maxInputTokens ?? 0) + (modelEntry.metadata.maxOutputTokens ?? 0);
            const tokenDiv = DOM.append(templateData.tokenLimitsElement, $('.token-limit-item'));
            const tokenText = DOM.append(tokenDiv, $('span'));
            tokenText.textContent = formatTokenCount(totalTokens);
            markdown.appendMarkdown(`${localize(7224, null)}: `);
            markdown.appendMarkdown(`${formatTokenCount(totalTokens)}`);
        }
        templateData.elementDisposables.add(this.hoverService.setupDelayedHoverAtMouse(templateData.container, () => ({
            content: markdown,
            appearance: {
                compact: true,
                skipFadeInAnimation: true,
            }
        })));
    }
};
TokenLimitsColumnRenderer = TokenLimitsColumnRenderer_1 = __decorate([
    __param(0, IHoverService)
], TokenLimitsColumnRenderer);
class CapabilitiesColumnRenderer extends ModelsTableColumnRenderer {
    constructor() {
        super(...arguments);
        this.templateId = CapabilitiesColumnRenderer.TEMPLATE_ID;
        this._onDidClickCapability = new Emitter();
        this.onDidClickCapability = this._onDidClickCapability.event;
    }
    static { this.TEMPLATE_ID = 'capabilities'; }
    dispose() {
        this._onDidClickCapability.dispose();
    }
    renderTemplate(container) {
        const disposables = new DisposableStore();
        const elementDisposables = new DisposableStore();
        container.classList.add('model-capability-column');
        const metadataRow = DOM.append(container, $('.model-capabilities'));
        return {
            container,
            metadataRow,
            disposables,
            elementDisposables
        };
    }
    renderElement(entry, index, templateData) {
        DOM.clearNode(templateData.metadataRow);
        super.renderElement(entry, index, templateData);
    }
    renderVendorElement(entry, index, templateData) {
    }
    renderGroupElement(entry, index, templateData) {
    }
    renderModelElement(entry, index, templateData) {
        const { model: modelEntry, capabilityMatches } = entry;
        if (modelEntry.metadata.capabilities?.toolCalling) {
            templateData.elementDisposables.add(this.createCapabilityButton(templateData.metadataRow, capabilityMatches?.includes('toolCalling') || false, localize(7225, null), 'tools'));
        }
        if (modelEntry.metadata.capabilities?.vision) {
            templateData.elementDisposables.add(this.createCapabilityButton(templateData.metadataRow, capabilityMatches?.includes('vision') || false, localize(7226, null), 'vision'));
        }
    }
    createCapabilityButton(container, isActive, label, capability) {
        const disposables = new DisposableStore();
        const buttonContainer = DOM.append(container, $('.model-badge-container'));
        const button = disposables.add(new Button(buttonContainer, { secondary: true }));
        button.element.classList.add('model-capability');
        button.element.classList.toggle('active', isActive);
        button.label = label;
        disposables.add(button.onDidClick(() => this._onDidClickCapability.fire(capability)));
        return disposables;
    }
}
let ActionsColumnRenderer = class ActionsColumnRenderer extends ModelsTableColumnRenderer {
    static { ActionsColumnRenderer_1 = this; }
    static { this.TEMPLATE_ID = 'actions'; }
    constructor(viewModel, instantiationService, languageModelsService, dialogService, commandService, contextMenuService) {
        super();
        this.viewModel = viewModel;
        this.instantiationService = instantiationService;
        this.languageModelsService = languageModelsService;
        this.dialogService = dialogService;
        this.commandService = commandService;
        this.contextMenuService = contextMenuService;
        this.templateId = ActionsColumnRenderer_1.TEMPLATE_ID;
    }
    renderTemplate(container) {
        const disposables = new DisposableStore();
        const elementDisposables = new DisposableStore();
        container.classList.add('models-actions-column');
        const parent = DOM.append(container, $('.actions-container'));
        const actionBar = disposables.add(this.instantiationService.createInstance(ToolBar, parent, this.contextMenuService, {
            icon: true,
            label: false,
            moreIcon: Codicon.gear,
            anchorAlignmentProvider: () => 1 /* AnchorAlignment.RIGHT */
        }));
        return {
            container,
            actionBar,
            disposables,
            elementDisposables
        };
    }
    renderElement(entry, index, templateData) {
        templateData.actionBar.setActions([]);
        super.renderElement(entry, index, templateData);
    }
    renderVendorElement(entry, index, templateData) {
        const { vendorEntry } = entry;
        const primaryActions = [];
        const secondaryActions = [];
        if (vendorEntry.vendor.configuration) {
            secondaryActions.push(toAction({
                id: 'configureAction',
                label: localize(7227, null),
                run: () => this.languageModelsService.configureLanguageModelsProviderGroup(vendorEntry.vendor.vendor, vendorEntry.group.name)
            }));
            secondaryActions.push(toAction({
                id: 'deleteAction',
                label: localize(7228, null),
                class: ThemeIcon.asClassName(Codicon.trash),
                run: async () => {
                    const result = await this.dialogService.confirm({
                        type: 'info',
                        message: localize(7229, null, vendorEntry.group.name)
                    });
                    if (!result.confirmed) {
                        return;
                    }
                    await this.languageModelsService.removeLanguageModelsProviderGroup(vendorEntry.vendor.vendor, vendorEntry.group.name);
                }
            }));
        }
        else if (vendorEntry.vendor.managementCommand) {
            primaryActions.push(toAction({
                id: 'manageVendor',
                label: localize(7230, null, vendorEntry.group.name),
                class: ThemeIcon.asClassName(Codicon.gear),
                run: async () => {
                    await this.commandService.executeCommand(vendorEntry.vendor.managementCommand, vendorEntry.vendor.vendor);
                    this.viewModel.refresh();
                }
            }));
        }
        templateData.actionBar.setActions(primaryActions, secondaryActions);
    }
    renderGroupElement(entry, index, templateData) {
    }
    renderModelElement(entry, index, templateData) {
        const configActions = this.languageModelsService.getModelConfigurationActions(entry.model.identifier);
        if (configActions.length === 0 && !entry.model.metadata.configurationSchema) {
            return;
        }
        const secondaryActions = [...configActions];
        // Always add "Configure..." as fallback for complex properties
        secondaryActions.push(toAction({
            id: 'configureModel',
            label: localize(7231, null),
            run: () => this.languageModelsService.configureModel(entry.model.identifier)
        }));
        templateData.actionBar.setActions([], secondaryActions);
    }
};
ActionsColumnRenderer = ActionsColumnRenderer_1 = __decorate([
    __param(1, IInstantiationService),
    __param(2, ILanguageModelsService),
    __param(3, IDialogService),
    __param(4, ICommandService),
    __param(5, IContextMenuService)
], ActionsColumnRenderer);
class ProviderColumnRenderer extends ModelsTableColumnRenderer {
    constructor() {
        super(...arguments);
        this.templateId = ProviderColumnRenderer.TEMPLATE_ID;
    }
    static { this.TEMPLATE_ID = 'provider'; }
    renderTemplate(container) {
        const disposables = new DisposableStore();
        const elementDisposables = new DisposableStore();
        const providerElement = DOM.append(container, $('.model-provider'));
        return {
            container,
            providerElement,
            disposables,
            elementDisposables
        };
    }
    renderVendorElement(entry, index, templateData) {
        templateData.providerElement.textContent = '';
    }
    renderGroupElement(entry, index, templateData) {
        templateData.providerElement.textContent = '';
    }
    renderModelElement(entry, index, templateData) {
        templateData.providerElement.textContent = entry.model.provider.vendor.displayName;
    }
}
function formatTokenCount(count) {
    if (count >= 1000000) {
        return `${(count / 1000000).toFixed(1)}M`;
    }
    else if (count >= 1000) {
        return `${(count / 1000).toFixed(0)}K`;
    }
    return count.toString();
}
let ChatModelsWidget = class ChatModelsWidget extends Disposable {
    static { ChatModelsWidget_1 = this; }
    static { this.NUM_INSTANCES = 0; }
    constructor(languageModelsService, instantiationService, extensionService, contextMenuService, chatEntitlementService, editorProgressService, commandService, contextKeyService) {
        super();
        this.languageModelsService = languageModelsService;
        this.instantiationService = instantiationService;
        this.extensionService = extensionService;
        this.contextMenuService = contextMenuService;
        this.chatEntitlementService = chatEntitlementService;
        this.editorProgressService = editorProgressService;
        this.commandService = commandService;
        this._onDidChangeItemCount = this._register(new Emitter());
        this.onDidChangeItemCount = this._onDidChangeItemCount.event;
        this.dropdownActions = [];
        this.tableDisposables = this._register(new DisposableStore());
        this.searchFocusContextKey = CONTEXT_MODELS_SEARCH_FOCUS.bindTo(contextKeyService);
        this.delayedFiltering = this._register(new Delayer(200));
        this.viewModel = this._register(this.instantiationService.createInstance(ChatModelsViewModel));
        this.element = DOM.$('.models-widget');
        this.create(this.element);
        const loadingPromise = this.extensionService.whenInstalledExtensionsRegistered().then(() => this.viewModel.refresh());
        this.editorProgressService.showWhile(loadingPromise, 300);
    }
    create(container) {
        const searchAndButtonContainer = DOM.append(container, $('.models-search-and-button-container'));
        const placeholder = localize(7232, null);
        const searchContainer = DOM.append(searchAndButtonContainer, $('.models-search-container'));
        this.searchWidget = this._register(this.instantiationService.createInstance(SuggestEnabledInput, 'chatModelsWidget.searchbox', searchContainer, {
            triggerCharacters: ['@', ':'],
            provideResults: (query) => {
                const providerSuggestions = this.viewModel.getVendors().map(v => `@provider:"${v.displayName}"`);
                const allSuggestions = [
                    ...providerSuggestions,
                    ...SEARCH_SUGGESTIONS.CAPABILITIES,
                    ...SEARCH_SUGGESTIONS.VISIBILITY,
                ];
                if (!query.trim()) {
                    return allSuggestions;
                }
                const queryParts = query.split(/\s/g);
                const lastPart = queryParts[queryParts.length - 1];
                if (lastPart.startsWith('@provider:')) {
                    return providerSuggestions;
                }
                else if (lastPart.startsWith('@capability:')) {
                    return SEARCH_SUGGESTIONS.CAPABILITIES;
                }
                else if (lastPart.startsWith('@visible:')) {
                    return SEARCH_SUGGESTIONS.VISIBILITY;
                }
                else if (lastPart.startsWith('@')) {
                    return allSuggestions;
                }
                return [];
            }
        }, placeholder, `chatModelsWidget:searchinput:${ChatModelsWidget_1.NUM_INSTANCES++}`, {
            placeholderText: placeholder,
            styleOverrides: {
                inputBorder: settingsTextInputBorder
            },
            focusContextKey: this.searchFocusContextKey,
        }));
        const filterAction = this._register(new ModelsFilterAction());
        const clearSearchAction = this._register(new Action('workbench.models.clearSearch', localize(7233, null), ThemeIcon.asClassName(preferencesClearInputIcon), false, () => this.clearSearch()));
        const collapseAllAction = this._register(new Action('workbench.models.collapseAll', localize(7234, null), ThemeIcon.asClassName(Codicon.collapseAll), false, () => {
            this.viewModel.collapseAll();
        }));
        collapseAllAction.enabled = this.viewModel.viewModelEntries.some(e => isLanguageModelGroupEntry(e) || isLanguageModelProviderEntry(e));
        this._register(this.viewModel.onDidChange(() => collapseAllAction.enabled = this.viewModel.viewModelEntries.some(e => isLanguageModelProviderEntry(e) || isLanguageModelGroupEntry(e))));
        this._register(this.searchWidget.onInputDidChange(() => {
            clearSearchAction.enabled = !!this.searchWidget.getValue();
            this.filterModels();
        }));
        this.searchActionsContainer = DOM.append(searchContainer, $('.models-search-actions'));
        const actions = [clearSearchAction, collapseAllAction, filterAction];
        const toolBar = this._register(new ToolBar(this.searchActionsContainer, this.contextMenuService, {
            actionViewItemProvider: (action, options) => {
                if (action.id === filterAction.id) {
                    return this.instantiationService.createInstance(ModelsSearchFilterDropdownMenuActionViewItem, action, options, {
                        getValue: () => this.searchWidget.getValue(),
                        setValue: (searchValue) => this.search(searchValue)
                    }, this.viewModel);
                }
                return undefined;
            },
            getKeyBinding: () => undefined
        }));
        toolBar.setActions(actions);
        // Add padding to input box for toolbar
        this.searchWidget.inputWidget.getContainerDomNode().style.paddingRight = `${DOM.getTotalWidth(this.searchActionsContainer) + 12}px`;
        this.addButtonContainer = DOM.append(searchAndButtonContainer, $('.section-title-actions'));
        const buttonOptions = {
            ...defaultButtonStyles,
            supportIcons: true,
        };
        this.addButton = this._register(new Button(this.addButtonContainer, buttonOptions));
        this.addButton.label = `$(${Codicon.add.id}) ${localize(7235, null)}`;
        this.addButton.element.classList.add('models-add-model-button');
        this.updateAddModelsButton();
        this._register(this.addButton.onDidClick((e) => {
            if (this.dropdownActions.length > 0) {
                this.contextMenuService.showContextMenu({
                    getAnchor: () => this.addButton.element,
                    getActions: () => this.dropdownActions,
                });
            }
        }));
        // Table container
        this.tableContainer = DOM.append(container, $('.models-table-container'));
        // Create table
        this.createTable();
        this._register(this.viewModel.onDidChangeGrouping(() => this.createTable()));
        this._register(this.chatEntitlementService.onDidChangeEntitlement(() => this.updateAddModelsButton()));
        this._register(this.languageModelsService.onDidChangeLanguageModelVendors(() => this.updateAddModelsButton()));
    }
    createTable() {
        this.tableDisposables.clear();
        DOM.clearNode(this.tableContainer);
        const gutterColumnRenderer = this.instantiationService.createInstance(GutterColumnRenderer, this.viewModel);
        const modelNameColumnRenderer = this.instantiationService.createInstance(ModelNameColumnRenderer);
        const costColumnRenderer = this.instantiationService.createInstance(MultiplierColumnRenderer);
        const tokenLimitsColumnRenderer = this.instantiationService.createInstance(TokenLimitsColumnRenderer);
        const capabilitiesColumnRenderer = this.instantiationService.createInstance(CapabilitiesColumnRenderer);
        const actionsColumnRenderer = this.instantiationService.createInstance(ActionsColumnRenderer, this.viewModel);
        const providerColumnRenderer = this.instantiationService.createInstance(ProviderColumnRenderer);
        this.tableDisposables.add(capabilitiesColumnRenderer);
        this.tableDisposables.add(capabilitiesColumnRenderer.onDidClickCapability(capability => {
            const currentQuery = this.searchWidget.getValue();
            const query = `@capability:${capability}`;
            const newQuery = toggleFilter(currentQuery, { query });
            this.search(newQuery);
        }));
        const columns = [
            {
                label: '',
                tooltip: '',
                weight: 0.05,
                minimumWidth: 40,
                maximumWidth: 40,
                templateId: GutterColumnRenderer.TEMPLATE_ID,
                project(row) { return row; }
            },
            {
                label: localize(7236, null),
                tooltip: '',
                weight: 0.35,
                minimumWidth: 200,
                templateId: ModelNameColumnRenderer.TEMPLATE_ID,
                project(row) { return row; }
            }
        ];
        if (this.viewModel.groupBy === "visibility" /* ChatModelGroup.Visibility */) {
            columns.push({
                label: localize(7237, null),
                tooltip: '',
                weight: 0.15,
                minimumWidth: 100,
                templateId: ProviderColumnRenderer.TEMPLATE_ID,
                project(row) { return row; }
            });
        }
        columns.push({
            label: localize(7238, null),
            tooltip: '',
            weight: 0.1,
            minimumWidth: 140,
            templateId: TokenLimitsColumnRenderer.TEMPLATE_ID,
            project(row) { return row; }
        }, {
            label: localize(7239, null),
            tooltip: '',
            weight: 0.2,
            minimumWidth: 180,
            templateId: CapabilitiesColumnRenderer.TEMPLATE_ID,
            project(row) { return row; }
        }, {
            label: localize(7240, null),
            tooltip: '',
            weight: 0.1,
            minimumWidth: 60,
            templateId: MultiplierColumnRenderer.TEMPLATE_ID,
            project(row) { return row; }
        }, {
            label: '',
            tooltip: '',
            weight: 0.05,
            minimumWidth: 64,
            maximumWidth: 64,
            templateId: ActionsColumnRenderer.TEMPLATE_ID,
            project(row) { return row; }
        });
        this.table = this.tableDisposables.add(this.instantiationService.createInstance(WorkbenchTable, 'ModelsWidget', this.tableContainer, new Delegate(), columns, [
            gutterColumnRenderer,
            modelNameColumnRenderer,
            costColumnRenderer,
            tokenLimitsColumnRenderer,
            capabilitiesColumnRenderer,
            actionsColumnRenderer,
            providerColumnRenderer
        ], {
            identityProvider: { getId: (e) => e.id },
            horizontalScrolling: false,
            accessibilityProvider: {
                getAriaLabel: (e) => {
                    if (isLanguageModelProviderEntry(e)) {
                        return localize(7241, null, e.vendorEntry.group.name);
                    }
                    else if (isLanguageModelGroupEntry(e)) {
                        return e.id === 'visible' ? localize(7242, null) : localize(7243, null);
                    }
                    else if (isStatusEntry(e)) {
                        return localize(7244, null, e.message);
                    }
                    const ariaLabels = [];
                    ariaLabels.push(localize(7245, null, e.model.metadata.name, e.model.provider.vendor.displayName));
                    if (e.model.metadata.maxInputTokens || e.model.metadata.maxOutputTokens) {
                        const totalTokens = (e.model.metadata.maxInputTokens ?? 0) + (e.model.metadata.maxOutputTokens ?? 0);
                        ariaLabels.push(localize(7246, null, formatTokenCount(totalTokens)));
                    }
                    if (e.model.metadata.capabilities) {
                        ariaLabels.push(localize(7247, null, Object.keys(e.model.metadata.capabilities).join(', ')));
                    }
                    const multiplierText = e.model.metadata.multiplier ?? '-';
                    if (multiplierText !== '-') {
                        ariaLabels.push(localize(7248, null, multiplierText));
                    }
                    if (e.model.visible) {
                        ariaLabels.push(localize(7249, null));
                    }
                    else {
                        ariaLabels.push(localize(7250, null));
                    }
                    return ariaLabels.join('. ');
                },
                getWidgetAriaLabel: () => localize(7251, null)
            },
            multipleSelectionSupport: true,
            setRowLineHeight: false,
            openOnSingleClick: true,
            alwaysConsumeMouseWheel: false,
        }));
        this.tableDisposables.add(this.table.onContextMenu(e => {
            if (!e.element) {
                return;
            }
            const selection = this.table.getSelection();
            const selectedEntries = selection.every(i => i !== e.index) ? [e.element] : selection.map(i => this.viewModel.viewModelEntries[i]).filter(e => !!e);
            // Get model entries from selection (filter out vendor/group/status entries)
            const selectedModelEntries = selectedEntries.filter((entry) => !isLanguageModelProviderEntry(entry) && !isLanguageModelGroupEntry(entry) && !isStatusEntry(entry));
            const actions = [];
            let configureGroup;
            let configureVendor;
            if (selectedModelEntries.length) {
                const visibleModels = selectedModelEntries.filter(entry => entry.model.visible);
                const hiddenModels = selectedModelEntries.filter(entry => !entry.model.visible);
                actions.push(toAction({
                    id: 'hideSelectedModels',
                    label: localize(7252, null),
                    enabled: visibleModels.length > 0,
                    run: () => this.viewModel.setModelsVisibility(selectedModelEntries, false)
                }));
                actions.push(toAction({
                    id: 'showSelectedModels',
                    label: localize(7253, null),
                    enabled: hiddenModels.length > 0,
                    run: () => this.viewModel.setModelsVisibility(selectedModelEntries, true)
                }));
                // Show per-model configuration actions for a single model
                if (selectedModelEntries.length === 1) {
                    const configActions = this.languageModelsService.getModelConfigurationActions(selectedModelEntries[0].model.identifier);
                    if (configActions.length) {
                        actions.push(new Separator());
                        actions.push(...configActions);
                    }
                }
                // Show configure action if all models are from the same group
                configureGroup = selectedModelEntries[0].model.provider.group.name;
                configureVendor = selectedModelEntries[0].model.provider.vendor;
                if (selectedModelEntries.some(entry => entry.model.provider.vendor.isDefault || entry.model.provider.group.name !== configureGroup)) {
                    configureGroup = undefined;
                    configureVendor = undefined;
                }
            }
            else if (selectedEntries.length === 1) {
                const entry = e.element;
                if (isLanguageModelProviderEntry(entry)) {
                    if (!entry.vendorEntry.vendor.isDefault) {
                        actions.push(toAction({
                            id: 'hideAllModels',
                            label: localize(7254, null),
                            run: () => this.viewModel.setGroupVisibility(entry, false)
                        }));
                        actions.push(toAction({
                            id: 'showAllModels',
                            label: localize(7255, null),
                            run: () => this.viewModel.setGroupVisibility(entry, true)
                        }));
                    }
                    configureGroup = entry.vendorEntry.group.name;
                    configureVendor = entry.vendorEntry.vendor;
                }
            }
            if (configureGroup && configureVendor) {
                if (configureVendor.managementCommand || configureVendor.configuration) {
                    if (actions.length) {
                        actions.push(new Separator());
                    }
                    if (configureVendor.managementCommand) {
                        actions.push(toAction({
                            id: 'configureVendor',
                            label: localize(7256, null),
                            run: async () => {
                                await this.commandService.executeCommand(configureVendor.managementCommand, configureVendor.vendor);
                                await this.viewModel.refresh();
                            }
                        }));
                    }
                    else {
                        actions.push(toAction({
                            id: 'configureVendor',
                            label: localize(7257, null),
                            run: () => this.languageModelsService.configureLanguageModelsProviderGroup(configureVendor.vendor, configureGroup)
                        }));
                    }
                }
            }
            if (actions.length > 0) {
                this.contextMenuService.showContextMenu({
                    getAnchor: () => e.anchor,
                    getActions: () => actions
                });
            }
        }));
        this.table.splice(0, this.table.length, this.viewModel.viewModelEntries);
        this._onDidChangeItemCount.fire(this.itemCount);
        this.tableDisposables.add(this.viewModel.onDidChange(({ at, removed, added }) => {
            this.table.splice(at, removed, added);
            this._onDidChangeItemCount.fire(this.itemCount);
            if (this.viewModel.selectedEntry) {
                const selectedEntryIndex = this.viewModel.viewModelEntries.indexOf(this.viewModel.selectedEntry);
                this.table.setFocus([selectedEntryIndex]);
                this.table.setSelection([selectedEntryIndex]);
            }
        }));
        this.tableDisposables.add(this.table.onDidOpen(async ({ element, browserEvent }) => {
            if (!element) {
                return;
            }
            if (isStatusEntry(element)) {
                return;
            }
            if (isLanguageModelProviderEntry(element) || isLanguageModelGroupEntry(element)) {
                this.viewModel.toggleCollapsed(element);
            }
            else if (!DOM.isMouseEvent(browserEvent) || browserEvent.detail === 2) {
                this.viewModel.toggleVisibility(element);
            }
        }));
        this.tableDisposables.add(this.table.onDidChangeSelection(e => this.viewModel.selectedEntry = e.elements[0]));
        this.tableDisposables.add(this.table.onDidBlur(() => {
            if (this.viewModel.shouldRefilter()) {
                this.viewModel.filter(this.searchWidget.getValue());
            }
        }));
        this.layout(this.element.clientHeight, this.element.clientWidth);
    }
    updateAddModelsButton() {
        const configurableVendors = this.languageModelsService.getVendors().filter(vendor => vendor.managementCommand || vendor.configuration);
        const entitlement = this.chatEntitlementService.entitlement;
        const isManagedEntitlement = entitlement === ChatEntitlement.Business || entitlement === ChatEntitlement.Enterprise;
        const supportsAddingModels = this.chatEntitlementService.isInternal
            || (entitlement !== ChatEntitlement.Unknown
                && entitlement !== ChatEntitlement.Available
                && !isManagedEntitlement);
        this.addButton.enabled = supportsAddingModels && configurableVendors.length > 0;
        this.addButton.setTitle(!supportsAddingModels && isManagedEntitlement ? localize(7258, null) : '');
        this.dropdownActions = configurableVendors.map(vendor => toAction({
            id: `enable-${vendor.vendor}`,
            label: vendor.displayName,
            run: async () => {
                await this.addModelsForVendor(vendor);
            }
        }));
    }
    filterModels() {
        this.delayedFiltering.trigger(() => {
            this.viewModel.filter(this.searchWidget.getValue());
        });
    }
    async addModelsForVendor(vendor) {
        this.languageModelsService.configureLanguageModelsProviderGroup(vendor.vendor);
    }
    layout(height, width) {
        width = width - 24;
        this.searchWidget.layout(new DOM.Dimension(width - this.searchActionsContainer.clientWidth - this.addButtonContainer.clientWidth - 8, 22));
        const tableHeight = height - 40;
        this.tableContainer.style.height = `${tableHeight}px`;
        this.table.layout(tableHeight, width);
    }
    focusSearch() {
        this.searchWidget.focus();
    }
    search(filter) {
        this.focusSearch();
        this.searchWidget.setValue(filter);
        this.viewModel.filter(filter);
    }
    clearSearch() {
        this.focusSearch();
        this.searchWidget.setValue('');
    }
    render() {
        if (this.viewModel.shouldRefilter()) {
            this.viewModel.filter(this.searchWidget.getValue());
        }
    }
    /**
     * Gets the total model count (excluding vendor/group/status headers).
     */
    get itemCount() {
        return this.viewModel.viewModelEntries
            .filter(e => !isLanguageModelProviderEntry(e) && !isLanguageModelGroupEntry(e) && !isStatusEntry(e))
            .length;
    }
    /**
     * Re-fires the current item count. Call after subscribing to onDidChangeItemCount
     * to ensure the subscriber receives the latest count.
     */
    fireItemCount() {
        this._onDidChangeItemCount.fire(this.itemCount);
    }
};
ChatModelsWidget = ChatModelsWidget_1 = __decorate([
    __param(0, ILanguageModelsService),
    __param(1, IInstantiationService),
    __param(2, IExtensionService),
    __param(3, IContextMenuService),
    __param(4, IChatEntitlementService),
    __param(5, IEditorProgressService),
    __param(6, ICommandService),
    __param(7, IContextKeyService)
], ChatModelsWidget);
export { ChatModelsWidget };
//# sourceMappingURL=chatModelsWidget.js.map