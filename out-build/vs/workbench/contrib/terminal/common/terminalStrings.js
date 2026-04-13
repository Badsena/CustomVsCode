/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { localize, localize2 } from '../../../../nls.js';
/**
 * An object holding strings shared by multiple parts of the terminal
 */
export const terminalStrings = {
    terminal: localize(15771, null),
    new: localize(15772, null),
    doNotShowAgain: localize(15773, null),
    currentSessionCategory: localize(15774, null),
    previousSessionCategory: localize(15775, null),
    typeTask: localize(15776, null),
    typeLocal: localize(15777, null),
    actionCategory: localize2(15780, "Terminal"),
    focus: localize2(15781, "Focus Terminal"),
    focusInstance: localize2(15782, "Focus Terminal"),
    focusAndHideAccessibleBuffer: localize2(15783, "Focus Terminal and Hide Accessible Buffer"),
    kill: {
        ...localize2(15784, "Kill Terminal"),
        short: localize(15778, null),
    },
    moveToEditor: localize2(15785, "Move Terminal into Editor Area"),
    moveIntoNewWindow: localize2(15786, "Move Terminal into New Window"),
    newInNewWindow: localize2(15787, "New Terminal Window"),
    moveToTerminalPanel: localize2(15788, "Move Terminal into Panel"),
    changeIcon: localize2(15789, "Change Icon..."),
    changeColor: localize2(15790, "Change Color..."),
    split: {
        ...localize2(15791, "Split Terminal"),
        short: localize(15779, null),
    },
    unsplit: localize2(15792, "Unsplit Terminal"),
    rename: localize2(15793, "Rename..."),
    toggleSizeToContentWidth: localize2(15794, "Toggle Size to Content Width"),
    focusHover: localize2(15795, "Focus Hover"),
    newWithCwd: localize2(15796, "Create New Terminal Starting in a Custom Working Directory"),
    renameWithArgs: localize2(15797, "Rename the Currently Active Terminal"),
    scrollToPreviousCommand: localize2(15798, "Scroll to Previous Command"),
    scrollToNextCommand: localize2(15799, "Scroll to Next Command"),
    revealCommand: localize2(15800, "Reveal Command in Terminal"),
};
//# sourceMappingURL=terminalStrings.js.map