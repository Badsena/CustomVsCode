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
import * as dom from '../../../../../../base/browser/dom.js';
import { StandardKeyboardEvent } from '../../../../../../base/browser/keyboardEvent.js';
import { renderIcon, renderLabelWithIcons } from '../../../../../../base/browser/ui/iconLabel/iconLabels.js';
import { Codicon } from '../../../../../../base/common/codicons.js';
import { Emitter } from '../../../../../../base/common/event.js';
import { MarkdownString } from '../../../../../../base/common/htmlContent.js';
import { Disposable } from '../../../../../../base/common/lifecycle.js';
import { autorun } from '../../../../../../base/common/observable.js';
import { ThemeIcon } from '../../../../../../base/common/themables.js';
import { localize } from '../../../../../../nls.js';
import { IActionWidgetService } from '../../../../../../platform/actionWidget/browser/actionWidget.js';
import { ICommandService } from '../../../../../../platform/commands/common/commands.js';
import { IProductService } from '../../../../../../platform/product/common/productService.js';
import { ITelemetryService } from '../../../../../../platform/telemetry/common/telemetry.js';
import { TelemetryTrustedValue } from '../../../../../../platform/telemetry/common/telemetryUtils.js';
import { MANAGE_CHAT_COMMAND_ID } from '../../../common/constants.js';
import { ILanguageModelsService } from '../../../common/languageModels.js';
import { ChatEntitlement, IChatEntitlementService, isProUser } from '../../../../../services/chat/common/chatEntitlementService.js';
import * as semver from '../../../../../../base/common/semver/semver.js';
import { IUpdateService } from '../../../../../../platform/update/common/update.js';
function isVersionAtLeast(current, required) {
    const currentSemver = semver.coerce(current);
    if (!currentSemver) {
        return false;
    }
    return semver.gte(currentSemver, required);
}
function getUpdateHoverContent(updateState) {
    const hoverContent = new MarkdownString('', { isTrusted: true, supportThemeIcons: true });
    switch (updateState) {
        case "available for download" /* StateType.AvailableForDownload */:
            hoverContent.appendMarkdown(localize(8204, null));
            break;
        case "downloaded" /* StateType.Downloaded */:
        case "ready" /* StateType.Ready */:
            hoverContent.appendMarkdown(localize(8205, null));
            break;
        default:
            hoverContent.appendMarkdown(localize(8206, null));
            break;
    }
    return hoverContent;
}
/**
 * Section identifiers for collapsible groups in the model picker.
 */
const ModelPickerSection = {
    Other: 'other',
};
function createModelItem(action, model, hoverPosition) {
    return {
        item: action,
        kind: "action" /* ActionListItemKind.Action */,
        label: action.label,
        description: action.description,
        group: { title: '', icon: action.icon ?? ThemeIcon.fromId(action.checked ? Codicon.check.id : Codicon.blank.id) },
        hideIcon: false,
        section: action.section,
        hover: model ? { content: getModelHoverContent(model), position: hoverPosition } : undefined,
        submenuActions: action.toolbarActions,
    };
}
/**
 * Returns a short description summarizing the model's current configuration values
 * for properties marked with group 'navigation' (e.g., "High", "Medium").
 */
function getModelConfigurationDescription(model, languageModelsService) {
    const schema = model.metadata.configurationSchema;
    if (!schema?.properties) {
        return undefined;
    }
    const currentConfig = languageModelsService.getModelConfiguration(model.identifier) ?? {};
    const parts = [];
    for (const [key, propSchema] of Object.entries(schema.properties)) {
        if (propSchema.group !== 'navigation') {
            continue;
        }
        const value = currentConfig[key] ?? propSchema.default;
        if (value === undefined) {
            continue;
        }
        const enumItemLabels = propSchema.enumItemLabels;
        const enumIndex = propSchema.enum?.indexOf(value) ?? -1;
        const label = enumItemLabels?.[enumIndex] ?? String(value);
        parts.push(label);
    }
    return parts.length > 0 ? parts.join(', ') : undefined;
}
function createModelAction(model, selectedModelId, onSelect, languageModelsService, section) {
    const toolbarActions = languageModelsService.getModelConfigurationActions(model.identifier);
    const configDescription = getModelConfigurationDescription(model, languageModelsService);
    const baseDescription = model.metadata.multiplier ?? model.metadata.detail;
    const description = configDescription && baseDescription
        ? `${configDescription} · ${baseDescription}`
        : configDescription ?? baseDescription;
    return {
        id: model.identifier,
        enabled: true,
        icon: model.metadata.statusIcon,
        checked: model.identifier === selectedModelId,
        class: undefined,
        description,
        tooltip: model.metadata.name,
        label: model.metadata.name,
        section,
        toolbarActions: toolbarActions && toolbarActions.length > 0 ? toolbarActions : undefined,
        run: () => onSelect(model),
    };
}
function shouldShowManageModelsAction(chatEntitlementService) {
    return chatEntitlementService.entitlement === ChatEntitlement.Free ||
        chatEntitlementService.entitlement === ChatEntitlement.Pro ||
        chatEntitlementService.entitlement === ChatEntitlement.ProPlus ||
        chatEntitlementService.entitlement === ChatEntitlement.Business ||
        chatEntitlementService.entitlement === ChatEntitlement.Enterprise ||
        chatEntitlementService.isInternal;
}
function createManageModelsAction(commandService) {
    return {
        id: 'manageModels',
        enabled: true,
        checked: false,
        class: ThemeIcon.asClassName(Codicon.gear),
        tooltip: localize(8207, null),
        label: localize(8208, null),
        run: () => { commandService.executeCommand(MANAGE_CHAT_COMMAND_ID); }
    };
}
/**
 * Builds the grouped items for the model picker dropdown.
 *
 * Layout:
 * 1. Auto (always first)
 * 2. Promoted section (selected + recently used + featured models from control manifest)
 *    - Available models sorted alphabetically, followed by unavailable models
 *    - Unavailable models show upgrade/update/admin status
 * 3. Other Models (collapsible toggle, available first, then sorted by vendor then name)
 * 4. Optional "Manage Models..." action shown in Other Models after a separator
 */
export function buildModelPickerItems(models, selectedModelId, recentModelIds, controlModels, currentVSCodeVersion, updateStateType, onSelect, manageSettingsUrl, useGroupedModelPicker, manageModelsAction, chatEntitlementService, showUnavailableFeatured, showFeatured, hoverPosition, languageModelsService) {
    const items = [];
    if (models.length === 0) {
        items.push(createModelItem({
            id: 'auto',
            enabled: true,
            checked: true,
            class: undefined,
            tooltip: localize(8209, null),
            label: localize(8210, null),
            run: () => { }
        }));
    }
    if (useGroupedModelPicker) {
        let otherModels = [];
        if (models.length) {
            // Collect all available models into lookup maps
            const allModelsMap = new Map();
            const modelsByMetadataId = new Map();
            for (const model of models) {
                allModelsMap.set(model.identifier, model);
                modelsByMetadataId.set(model.metadata.id, model);
            }
            const placed = new Set();
            const markPlaced = (identifierOrId, metadataId) => {
                placed.add(identifierOrId);
                if (metadataId) {
                    placed.add(metadataId);
                }
            };
            const resolveModel = (id) => allModelsMap.get(id) ?? modelsByMetadataId.get(id);
            const getUnavailableReason = (entry) => {
                const isBusinessOrEnterpriseUser = chatEntitlementService.entitlement === ChatEntitlement.Business || chatEntitlementService.entitlement === ChatEntitlement.Enterprise;
                if (!isBusinessOrEnterpriseUser) {
                    return 'upgrade';
                }
                if (entry.minVSCodeVersion && !isVersionAtLeast(currentVSCodeVersion, entry.minVSCodeVersion)) {
                    return 'update';
                }
                return 'admin';
            };
            // --- 1. Auto ---
            const autoModel = models.find(m => m.metadata.id === 'auto' && m.metadata.vendor === 'copilot');
            if (autoModel) {
                markPlaced(autoModel.identifier, autoModel.metadata.id);
                items.push(createModelItem(createModelAction(autoModel, selectedModelId, onSelect, languageModelsService), autoModel, hoverPosition));
            }
            const promotedItems = [];
            // Try to place a model by id. Returns true if handled.
            const tryPlaceModel = (id) => {
                if (placed.has(id)) {
                    return false;
                }
                const model = resolveModel(id);
                if (model && !placed.has(model.identifier)) {
                    markPlaced(model.identifier, model.metadata.id);
                    const entry = controlModels[model.metadata.id];
                    if (entry?.minVSCodeVersion && !isVersionAtLeast(currentVSCodeVersion, entry.minVSCodeVersion)) {
                        promotedItems.push({ kind: 'unavailable', id: model.metadata.id, entry, reason: 'update' });
                    }
                    else {
                        promotedItems.push({ kind: 'available', model });
                    }
                    return true;
                }
                if (!model) {
                    const entry = controlModels[id];
                    if (entry && !entry.exists) {
                        markPlaced(id);
                        promotedItems.push({ kind: 'unavailable', id, entry, reason: getUnavailableReason(entry) });
                        return true;
                    }
                }
                return false;
            };
            // Selected model
            if (selectedModelId && selectedModelId !== autoModel?.identifier) {
                tryPlaceModel(selectedModelId);
            }
            // Recently used models
            for (const id of recentModelIds) {
                tryPlaceModel(id);
            }
            // Featured models from control manifest
            if (showFeatured) {
                for (const [entryId, entry] of Object.entries(controlModels)) {
                    if (!entry.featured || placed.has(entryId)) {
                        continue;
                    }
                    const model = resolveModel(entryId);
                    if (model && !placed.has(model.identifier)) {
                        if (entry.minVSCodeVersion && !isVersionAtLeast(currentVSCodeVersion, entry.minVSCodeVersion)) {
                            if (showUnavailableFeatured) {
                                markPlaced(model.identifier, model.metadata.id);
                                promotedItems.push({ kind: 'unavailable', id: entryId, entry, reason: 'update' });
                            }
                        }
                        else {
                            markPlaced(model.identifier, model.metadata.id);
                            promotedItems.push({ kind: 'available', model });
                        }
                    }
                    else if (!model && !entry.exists) {
                        if (showUnavailableFeatured) {
                            markPlaced(entryId);
                            promotedItems.push({ kind: 'unavailable', id: entryId, entry, reason: getUnavailableReason(entry) });
                        }
                    }
                }
            }
            // Render promoted section: available first, then sorted alphabetically by name
            if (promotedItems.length > 0) {
                promotedItems.sort((a, b) => {
                    const aAvail = a.kind === 'available' ? 0 : 1;
                    const bAvail = b.kind === 'available' ? 0 : 1;
                    if (aAvail !== bAvail) {
                        return aAvail - bAvail;
                    }
                    const aName = a.kind === 'available' ? a.model.metadata.name : a.entry.label;
                    const bName = b.kind === 'available' ? b.model.metadata.name : b.entry.label;
                    return aName.localeCompare(bName);
                });
                for (const item of promotedItems) {
                    if (item.kind === 'available') {
                        items.push(createModelItem(createModelAction(item.model, selectedModelId, onSelect, languageModelsService), item.model, hoverPosition));
                    }
                    else {
                        items.push(createUnavailableModelItem(item.id, item.entry, item.reason, manageSettingsUrl, updateStateType, undefined, hoverPosition));
                    }
                }
            }
            // --- 3. Other Models (collapsible) ---
            otherModels = models
                .filter(m => !placed.has(m.identifier) && !placed.has(m.metadata.id))
                .sort((a, b) => {
                const aEntry = controlModels[a.metadata.id] ?? controlModels[a.identifier];
                const bEntry = controlModels[b.metadata.id] ?? controlModels[b.identifier];
                const aAvail = aEntry?.minVSCodeVersion && !isVersionAtLeast(currentVSCodeVersion, aEntry.minVSCodeVersion) ? 1 : 0;
                const bAvail = bEntry?.minVSCodeVersion && !isVersionAtLeast(currentVSCodeVersion, bEntry.minVSCodeVersion) ? 1 : 0;
                if (aAvail !== bAvail) {
                    return aAvail - bAvail;
                }
                const aCopilot = a.metadata.vendor === 'copilot' ? 0 : 1;
                const bCopilot = b.metadata.vendor === 'copilot' ? 0 : 1;
                if (aCopilot !== bCopilot) {
                    return aCopilot - bCopilot;
                }
                const vendorCmp = a.metadata.vendor.localeCompare(b.metadata.vendor);
                return vendorCmp !== 0 ? vendorCmp : a.metadata.name.localeCompare(b.metadata.name);
            });
            if (otherModels.length > 0) {
                if (items.length > 0) {
                    items.push({ kind: "separator" /* ActionListItemKind.Separator */ });
                }
                items.push({
                    item: {
                        id: 'otherModels',
                        enabled: true,
                        checked: false,
                        class: undefined,
                        tooltip: localize(8211, null),
                        label: localize(8212, null),
                        run: () => { }
                    },
                    kind: "action" /* ActionListItemKind.Action */,
                    label: localize(8213, null),
                    group: { title: '', icon: Codicon.chevronDown },
                    hideIcon: false,
                    section: ModelPickerSection.Other,
                    isSectionToggle: true,
                });
                for (const model of otherModels) {
                    const entry = controlModels[model.metadata.id] ?? controlModels[model.identifier];
                    if (entry?.minVSCodeVersion && !isVersionAtLeast(currentVSCodeVersion, entry.minVSCodeVersion)) {
                        items.push(createUnavailableModelItem(model.metadata.id, entry, 'update', manageSettingsUrl, updateStateType, ModelPickerSection.Other, hoverPosition));
                    }
                    else {
                        items.push(createModelItem(createModelAction(model, selectedModelId, onSelect, languageModelsService, ModelPickerSection.Other), model, hoverPosition));
                    }
                }
            }
        }
        if (manageModelsAction) {
            items.push({ kind: "separator" /* ActionListItemKind.Separator */, section: otherModels.length ? ModelPickerSection.Other : undefined });
            items.push({
                item: manageModelsAction,
                kind: "action" /* ActionListItemKind.Action */,
                label: manageModelsAction.label,
                group: { title: '', icon: Codicon.blank },
                hideIcon: false,
                section: otherModels.length ? ModelPickerSection.Other : undefined,
                showAlways: true,
            });
        }
    }
    else {
        // Flat list: auto first, then all models sorted alphabetically
        const autoModel = models.find(m => m.metadata.id === 'auto' && m.metadata.vendor === 'copilot');
        if (autoModel) {
            items.push(createModelItem(createModelAction(autoModel, selectedModelId, onSelect, languageModelsService), autoModel, hoverPosition));
        }
        const sortedModels = models
            .filter(m => m !== autoModel)
            .sort((a, b) => {
            const vendorCmp = a.metadata.vendor.localeCompare(b.metadata.vendor);
            return vendorCmp !== 0 ? vendorCmp : a.metadata.name.localeCompare(b.metadata.name);
        });
        for (const model of sortedModels) {
            items.push(createModelItem(createModelAction(model, selectedModelId, onSelect, languageModelsService), model, hoverPosition));
        }
    }
    return items;
}
export function getModelPickerAccessibilityProvider() {
    return {
        isChecked(element) {
            return element.kind === "action" /* ActionListItemKind.Action */ ? !!element?.item?.checked : undefined;
        },
        getRole: (element) => {
            switch (element.kind) {
                case "action" /* ActionListItemKind.Action */: return 'menuitemradio';
                case "separator" /* ActionListItemKind.Separator */: return 'separator';
                default: return 'separator';
            }
        },
        getWidgetRole: () => 'menu',
    };
}
function createUnavailableModelItem(id, entry, reason, manageSettingsUrl, updateStateType, section, hoverPosition) {
    let description;
    if (reason === 'upgrade') {
        description = new MarkdownString(localize(8214, null), { isTrusted: true });
    }
    else if (reason === 'update') {
        description = localize(8215, null);
    }
    else {
        description = manageSettingsUrl
            ? new MarkdownString(localize(8216, null, manageSettingsUrl), { isTrusted: true })
            : localize(8217, null);
    }
    let hoverContent;
    if (reason === 'upgrade') {
        hoverContent = new MarkdownString('', { isTrusted: true, supportThemeIcons: true });
        hoverContent.appendMarkdown(localize(8218, null));
    }
    else if (reason === 'update') {
        hoverContent = getUpdateHoverContent(updateStateType);
    }
    else {
        hoverContent = new MarkdownString('', { isTrusted: true, supportThemeIcons: true });
        hoverContent.appendMarkdown(localize(8219, null));
    }
    return {
        item: {
            id,
            enabled: false,
            checked: false,
            class: undefined,
            tooltip: entry.label,
            label: entry.label,
            description: typeof description === 'string' ? description : undefined,
            run: () => { }
        },
        kind: "action" /* ActionListItemKind.Action */,
        label: entry.label,
        description,
        group: { title: '', icon: ThemeIcon.fromId(Codicon.blank.id) },
        disabled: true,
        hideIcon: false,
        className: 'chat-model-picker-unavailable',
        section,
        hover: { content: hoverContent, position: hoverPosition },
    };
}
/**
 * A model selection dropdown widget.
 *
 * Renders a button showing the currently selected model name.
 * On click, opens a grouped picker popup with:
 * Auto → Promoted (recently used + curated) → Other Models (collapsed with search).
 *
 * The widget owns its state - set models, selection, and curated IDs via setters.
 * Listen for selection changes via `onDidChangeSelection`.
 */
let ModelPickerWidget = class ModelPickerWidget extends Disposable {
    get selectedModel() {
        return this._selectedModel;
    }
    get domNode() {
        return this._domNode;
    }
    constructor(_delegate, _hoverPosition, _actionWidgetService, _commandService, _telemetryService, _languageModelsService, _productService, _entitlementService, _updateService) {
        super();
        this._delegate = _delegate;
        this._hoverPosition = _hoverPosition;
        this._actionWidgetService = _actionWidgetService;
        this._commandService = _commandService;
        this._telemetryService = _telemetryService;
        this._languageModelsService = _languageModelsService;
        this._productService = _productService;
        this._entitlementService = _entitlementService;
        this._updateService = _updateService;
        this._onDidChangeSelection = this._register(new Emitter());
        this.onDidChangeSelection = this._onDidChangeSelection.event;
        this._register(this._languageModelsService.onDidChangeLanguageModels(() => {
            this._renderLabel();
        }));
    }
    setHideChevrons(hideChevrons) {
        this._hideChevrons = hideChevrons;
        this._register(autorun(reader => {
            const hide = hideChevrons.read(reader);
            if (this._domNode) {
                this._domNode.classList.toggle('hide-chevrons', hide);
            }
            this._renderLabel();
        }));
    }
    setSelectedModel(model) {
        this._selectedModel = model;
        this._renderLabel();
    }
    setBadge(badge) {
        this._badge = badge;
        this._updateBadge();
    }
    render(container) {
        this._domNode = dom.append(container, dom.$('a.action-label'));
        this._domNode.tabIndex = 0;
        this._domNode.setAttribute('role', 'button');
        this._domNode.setAttribute('aria-haspopup', 'true');
        this._domNode.setAttribute('aria-expanded', 'false');
        // Apply initial collapsed state now that _domNode exists
        if (this._hideChevrons?.get()) {
            this._domNode.classList.toggle('hide-chevrons', true);
        }
        this._badgeIcon = dom.append(this._domNode, dom.$('span.model-picker-badge'));
        this._updateBadge();
        this._renderLabel();
        // Open picker on click
        this._register(dom.addDisposableListener(this._domNode, dom.EventType.MOUSE_DOWN, (e) => {
            if (e.button !== 0) {
                return; // only left click
            }
            dom.EventHelper.stop(e, true);
            this.show();
        }));
        // Open picker on Enter/Space
        this._register(dom.addDisposableListener(this._domNode, dom.EventType.KEY_DOWN, (e) => {
            const event = new StandardKeyboardEvent(e);
            if (event.equals(3 /* KeyCode.Enter */) || event.equals(10 /* KeyCode.Space */)) {
                dom.EventHelper.stop(e, true);
                this.show();
            }
        }));
    }
    show(anchor) {
        const anchorElement = anchor ?? this._domNode;
        if (!anchorElement) {
            return;
        }
        const previousModel = this._selectedModel;
        const onSelect = (model) => {
            this._telemetryService.publicLog2('chat.modelChange', {
                fromModel: previousModel?.metadata.vendor === 'copilot' ? new TelemetryTrustedValue(previousModel.identifier) : 'unknown',
                toModel: model.metadata.vendor === 'copilot' ? new TelemetryTrustedValue(model.identifier) : 'unknown'
            });
            this._selectedModel = model;
            this._renderLabel();
            this._onDidChangeSelection.fire(model);
        };
        const models = this._delegate.getModels();
        const showFilter = models.length >= 10;
        const isPro = isProUser(this._entitlementService.entitlement);
        const manifest = this._languageModelsService.getModelsControlManifest();
        const controlModelsForTier = isPro ? manifest.paid : manifest.free;
        const canShowManageModelsAction = this._delegate.showManageModelsAction() && shouldShowManageModelsAction(this._entitlementService);
        const manageModelsAction = canShowManageModelsAction ? createManageModelsAction(this._commandService) : undefined;
        const items = buildModelPickerItems(models, this._selectedModel?.identifier, this._languageModelsService.getRecentlyUsedModelIds(), controlModelsForTier, this._productService.version, this._updateService.state.type, onSelect, this._productService.defaultChatAgent?.manageSettingsUrl, this._delegate.useGroupedModelPicker(), !showFilter ? manageModelsAction : undefined, this._entitlementService, this._delegate.showUnavailableFeatured(), this._delegate.showFeatured(), this._hoverPosition, this._languageModelsService);
        const listOptions = {
            showFilter,
            filterPlaceholder: localize(8220, null),
            filterActions: showFilter && manageModelsAction ? [manageModelsAction] : undefined,
            focusFilterOnOpen: true,
            collapsedByDefault: new Set([ModelPickerSection.Other]),
            minWidth: 200,
        };
        const previouslyFocusedElement = dom.getActiveElement();
        const delegate = {
            onSelect: (action) => {
                this._actionWidgetService.hide();
                action.run();
            },
            onHide: () => {
                this._domNode?.setAttribute('aria-expanded', 'false');
                if (dom.isHTMLElement(previouslyFocusedElement)) {
                    previouslyFocusedElement.focus();
                }
            }
        };
        this._domNode?.setAttribute('aria-expanded', 'true');
        this._actionWidgetService.show('ChatModelPicker', false, items, delegate, anchorElement, undefined, [], getModelPickerAccessibilityProvider(), listOptions);
        const activeElement = dom.getActiveElement();
        if (dom.isHTMLInputElement(activeElement) && activeElement.classList.contains('action-list-filter-input')) {
            activeElement.classList.add('chat-model-picker-filter-input');
        }
    }
    _updateBadge() {
        if (this._badgeIcon) {
            if (this._badge) {
                const icon = this._badge === 'info' ? Codicon.info : Codicon.warning;
                dom.reset(this._badgeIcon, renderIcon(icon));
                this._badgeIcon.style.display = '';
                this._badgeIcon.classList.toggle('info', this._badge === 'info');
                this._badgeIcon.classList.toggle('warning', this._badge === 'warning');
            }
            else {
                this._badgeIcon.style.display = 'none';
            }
        }
    }
    _renderLabel() {
        if (!this._domNode) {
            return;
        }
        const { name, statusIcon } = this._selectedModel?.metadata || {};
        const domChildren = [];
        if (statusIcon) {
            const iconElement = renderIcon(statusIcon);
            domChildren.push(iconElement);
        }
        const modelLabel = name ?? localize(8221, null);
        const configDescription = this._selectedModel
            ? getModelConfigurationDescription(this._selectedModel, this._languageModelsService)
            : undefined;
        const fullLabel = configDescription
            ? `${modelLabel} · ${configDescription}`
            : modelLabel;
        domChildren.push(dom.$('span.chat-input-picker-label', undefined, fullLabel));
        // Badge icon between label and chevron
        if (this._badgeIcon) {
            domChildren.push(this._badgeIcon);
        }
        domChildren.push(...renderLabelWithIcons(`$(chevron-down)`));
        dom.reset(this._domNode, ...domChildren);
        // Aria
        this._domNode.ariaLabel = localize(8222, null, fullLabel);
    }
};
ModelPickerWidget = __decorate([
    __param(2, IActionWidgetService),
    __param(3, ICommandService),
    __param(4, ITelemetryService),
    __param(5, ILanguageModelsService),
    __param(6, IProductService),
    __param(7, IChatEntitlementService),
    __param(8, IUpdateService)
], ModelPickerWidget);
export { ModelPickerWidget };
function getModelHoverContent(model) {
    const isAuto = model.metadata.id === 'auto' && model.metadata.vendor === 'copilot';
    const markdown = new MarkdownString('', { isTrusted: true, supportThemeIcons: true });
    markdown.appendMarkdown(`**${model.metadata.name}**`);
    markdown.appendText(`\n`);
    if (model.metadata.statusIcon && model.metadata.tooltip) {
        if (model.metadata.statusIcon) {
            markdown.appendMarkdown(`$(${model.metadata.statusIcon.id})&nbsp;`);
        }
        markdown.appendMarkdown(`${model.metadata.tooltip}`);
        markdown.appendText(`\n`);
    }
    if (model.metadata.multiplier) {
        markdown.appendMarkdown(`${localize(8223, null, model.metadata.multiplier)}`);
        markdown.appendText(`\n`);
    }
    if (!isAuto && (model.metadata.maxInputTokens || model.metadata.maxOutputTokens)) {
        const totalTokens = (model.metadata.maxInputTokens ?? 0) + (model.metadata.maxOutputTokens ?? 0);
        markdown.appendMarkdown(`${localize(8224, null)}: `);
        markdown.appendMarkdown(`${formatTokenCount(totalTokens)}`);
        markdown.appendText(`\n`);
    }
    return markdown;
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
//# sourceMappingURL=chatModelPicker.js.map