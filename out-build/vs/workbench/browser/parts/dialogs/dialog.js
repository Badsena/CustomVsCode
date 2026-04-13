/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { EventHelper } from '../../../../base/browser/dom.js';
import { fromNow } from '../../../../base/common/date.js';
import { localize } from '../../../../nls.js';
import { defaultButtonStyles, defaultCheckboxStyles, defaultInputBoxStyles, defaultDialogStyles } from '../../../../platform/theme/browser/defaultStyles.js';
const defaultDialogAllowableCommands = new Set([
    'workbench.action.quit',
    'workbench.action.reloadWindow',
    'copy',
    'cut',
    'editor.action.selectAll',
    'editor.action.clipboardCopyAction',
    'editor.action.clipboardCutAction',
    'editor.action.clipboardPasteAction'
]);
export function createWorkbenchDialogOptions(options, keybindingService, layoutService, hostService, allowableCommands = defaultDialogAllowableCommands) {
    return {
        keyEventProcessor: (event) => {
            const resolved = keybindingService.softDispatch(event, layoutService.activeContainer);
            if (resolved.kind === 2 /* ResultKind.KbFound */ && resolved.commandId) {
                if (!allowableCommands.has(resolved.commandId)) {
                    EventHelper.stop(event, true);
                }
            }
        },
        buttonStyles: defaultButtonStyles,
        checkboxStyles: defaultCheckboxStyles,
        inputBoxStyles: defaultInputBoxStyles,
        dialogStyles: defaultDialogStyles,
        onVisibilityChange: (window, visible) => hostService.setWindowDimmed(window, visible),
        ...options
    };
}
export function createBrowserAboutDialogDetails(productService) {
    const detailString = (useAgo) => {
        return localize(3934, null, productService.version || 'Unknown', productService.commit || 'Unknown', productService.date ? `${productService.date}${useAgo ? ' (' + fromNow(new Date(productService.date), true) + ')' : ''}` : 'Unknown', navigator.userAgent);
    };
    const details = detailString(true);
    const detailsToCopy = detailString(false);
    return {
        title: productService.nameLong,
        details: details,
        detailsToCopy: detailsToCopy
    };
}
//# sourceMappingURL=dialog.js.map