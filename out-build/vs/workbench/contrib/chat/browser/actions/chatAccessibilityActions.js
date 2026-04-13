/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { alert } from '../../../../../base/browser/ui/aria/aria.js';
import { localize } from '../../../../../nls.js';
import { Action2, registerAction2 } from '../../../../../platform/actions/common/actions.js';
import { IStorageService } from '../../../../../platform/storage/common/storage.js';
import { ContextKeyExpr } from '../../../../../platform/contextkey/common/contextkey.js';
import { IChatWidgetService } from '../chat.js';
import { ChatContextKeys } from '../../common/actions/chatContextKeys.js';
import { isResponseVM } from '../../common/model/chatViewModel.js';
import { CONTEXT_ACCESSIBILITY_MODE_ENABLED } from '../../../../../platform/accessibility/common/accessibility.js';
import { accessibleViewCurrentProviderId, accessibleViewIsShown } from '../../../../contrib/accessibility/browser/accessibilityConfiguration.js';
import { CHAT_ACCESSIBLE_VIEW_INCLUDE_THINKING_STORAGE_KEY, isThinkingContentIncludedInAccessibleView } from '../accessibility/chatResponseAccessibleView.js';
export const ACTION_ID_FOCUS_CHAT_CONFIRMATION = 'workbench.action.chat.focusConfirmation';
export const ACTION_ID_TOGGLE_THINKING_CONTENT_ACCESSIBLE_VIEW = 'workbench.action.chat.toggleThinkingContentAccessibleView';
class AnnounceChatConfirmationAction extends Action2 {
    constructor() {
        super({
            id: ACTION_ID_FOCUS_CHAT_CONFIRMATION,
            title: { value: localize(5773, null), original: 'Focus Chat Confirmation' },
            category: { value: localize(5774, null), original: 'Chat' },
            precondition: ChatContextKeys.enabled,
            f1: true,
            keybinding: {
                weight: 200 /* KeybindingWeight.WorkbenchContrib */,
                primary: 2048 /* KeyMod.CtrlCmd */ | 31 /* KeyCode.KeyA */ | 1024 /* KeyMod.Shift */,
                when: ContextKeyExpr.and(CONTEXT_ACCESSIBILITY_MODE_ENABLED, ChatContextKeys.Editing.hasQuestionCarousel.negate())
            }
        });
    }
    async run(accessor) {
        const chatWidgetService = accessor.get(IChatWidgetService);
        const pendingWidget = chatWidgetService.getAllWidgets().find(widget => widget.viewModel?.model.requestNeedsInput.get());
        if (!pendingWidget) {
            alert(localize(5775, null));
            return;
        }
        const viewModel = pendingWidget.viewModel;
        if (!viewModel) {
            alert(localize(5776, null));
            return;
        }
        // Check for active confirmations in the chat responses
        let firstConfirmationElement;
        const lastResponse = viewModel.getItems()[viewModel.getItems().length - 1];
        if (isResponseVM(lastResponse)) {
            // eslint-disable-next-line no-restricted-syntax
            const confirmationWidgets = pendingWidget.domNode.querySelectorAll('.chat-confirmation-widget-container');
            if (confirmationWidgets.length > 0) {
                firstConfirmationElement = confirmationWidgets[0];
            }
        }
        if (firstConfirmationElement) {
            // Toggle: if the confirmation is already focused, move focus back to input
            if (firstConfirmationElement.contains(pendingWidget.domNode.ownerDocument.activeElement)) {
                pendingWidget.focusInput();
            }
            else {
                firstConfirmationElement.focus();
            }
        }
        else {
            alert(localize(5777, null));
        }
    }
}
class ToggleThinkingContentAccessibleViewAction extends Action2 {
    constructor() {
        super({
            id: ACTION_ID_TOGGLE_THINKING_CONTENT_ACCESSIBLE_VIEW,
            title: { value: localize(5778, null), original: 'Toggle Thinking Content in Accessible View' },
            category: { value: localize(5779, null), original: 'Chat' },
            precondition: ChatContextKeys.enabled,
            f1: true,
            keybinding: {
                primary: 512 /* KeyMod.Alt */ | 50 /* KeyCode.KeyT */,
                weight: 200 /* KeybindingWeight.WorkbenchContrib */,
                when: ContextKeyExpr.and(accessibleViewIsShown, ContextKeyExpr.equals(accessibleViewCurrentProviderId.key, "panelChat" /* AccessibleViewProviderId.PanelChat */))
            }
        });
    }
    async run(accessor) {
        const storageService = accessor.get(IStorageService);
        const includeThinking = isThinkingContentIncludedInAccessibleView(storageService);
        const updatedValue = !includeThinking;
        storageService.store(CHAT_ACCESSIBLE_VIEW_INCLUDE_THINKING_STORAGE_KEY, updatedValue, 0 /* StorageScope.PROFILE */, 0 /* StorageTarget.USER */);
        alert(updatedValue
            ? localize(5780, null)
            : localize(5781, null));
    }
}
export function registerChatAccessibilityActions() {
    registerAction2(AnnounceChatConfirmationAction);
    registerAction2(ToggleThinkingContentAccessibleViewAction);
}
//# sourceMappingURL=chatAccessibilityActions.js.map