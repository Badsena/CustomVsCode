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
import { Codicon } from '../../../../base/common/codicons.js';
import { Emitter } from '../../../../base/common/event.js';
import { constObservable, derived, observableFromEvent, observableValue } from '../../../../base/common/observable.js';
import { ThemeIcon } from '../../../../base/common/themables.js';
import { LineRange } from '../../../../editor/common/core/ranges/lineRange.js';
import { CodeActionController } from '../../../../editor/contrib/codeAction/browser/codeActionController.js';
import { InlineEditsGutterIndicator, InlineEditsGutterIndicatorData, InlineSuggestionGutterMenuData, SimpleInlineSuggestModel } from '../../../../editor/contrib/inlineCompletions/browser/view/inlineEdits/components/gutterIndicatorView.js';
import { InlineEditTabAction } from '../../../../editor/contrib/inlineCompletions/browser/view/inlineEdits/inlineEditsViewInterface.js';
import { IAccessibilityService } from '../../../../platform/accessibility/common/accessibility.js';
import { IMenuService, MenuId, MenuItemAction } from '../../../../platform/actions/common/actions.js';
import { IContextKeyService } from '../../../../platform/contextkey/common/contextkey.js';
import { IHoverService } from '../../../../platform/hover/browser/hover.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { IKeybindingService } from '../../../../platform/keybinding/common/keybinding.js';
import { IThemeService } from '../../../../platform/theme/common/themeService.js';
import { IUserInteractionService } from '../../../../platform/userInteraction/browser/userInteractionService.js';
let InlineChatGutterAffordance = class InlineChatGutterAffordance extends InlineEditsGutterIndicator {
    constructor(myEditorObs, selection, _keybindingService, hoverService, instantiationService, accessibilityService, themeService, userInteractionService, menuService, contextKeyService) {
        const menu = menuService.createMenu(MenuId.InlineChatEditorAffordance, contextKeyService);
        const menuObs = observableFromEvent(menu.onDidChange, () => menu.getActions({ renderShortTitle: false }));
        const codeActionController = CodeActionController.get(myEditorObs.editor);
        const lightBulbObs = codeActionController?.lightBulbState;
        const data = derived(r => {
            const value = selection.read(r);
            if (!value) {
                return undefined;
            }
            const commandGroups = [];
            for (const [, groupActions] of menuObs.read(r)) {
                const group = [];
                for (const action of groupActions) {
                    if (action instanceof MenuItemAction) {
                        group.push({
                            command: { id: action.item.id, title: action.label },
                            icon: ThemeIcon.isThemeIcon(action.item.icon) ? action.item.icon : undefined
                        });
                    }
                }
                if (group.length > 0) {
                    commandGroups.push(group);
                }
            }
            // Use the cursor position (active end of selection) to determine the line
            const cursorPosition = value.getPosition();
            const lineRange = new LineRange(cursorPosition.lineNumber, cursorPosition.lineNumber + 1);
            // Create minimal gutter menu data (empty for prototype)
            const gutterMenuData = new InlineSuggestionGutterMenuData(undefined, // action
            '', // displayName
            commandGroups, // extensionCommands
            undefined, // alternativeAction
            undefined, // modelInfo
            undefined, // setModelId
            true);
            // Use lightbulb icon/color when code actions are available, otherwise sparkle
            const lightBulbInfo = lightBulbObs?.read(r);
            const icon = lightBulbInfo ? lightBulbInfo.icon : Codicon.sparkle;
            return new InlineEditsGutterIndicatorData(gutterMenuData, lineRange, new SimpleInlineSuggestModel(() => { }, () => { }), undefined, // altAction
            { icon });
        });
        const focusIsInMenu = observableValue({}, false);
        super(myEditorObs, data, constObservable(InlineEditTabAction.Inactive), constObservable(0), constObservable(false), focusIsInMenu, hoverService, instantiationService, accessibilityService, themeService, userInteractionService);
        this._onDidRunAction = this._store.add(new Emitter());
        this.onDidRunAction = this._onDidRunAction.event;
        this._store.add(menu);
        this._store.add(this.onDidCloseWithCommand(commandId => this._onDidRunAction.fire(commandId)));
    }
};
InlineChatGutterAffordance = __decorate([
    __param(2, IKeybindingService),
    __param(3, IHoverService),
    __param(4, IInstantiationService),
    __param(5, IAccessibilityService),
    __param(6, IThemeService),
    __param(7, IUserInteractionService),
    __param(8, IMenuService),
    __param(9, IContextKeyService)
], InlineChatGutterAffordance);
export { InlineChatGutterAffordance };
//# sourceMappingURL=inlineChatGutterAffordance.js.map