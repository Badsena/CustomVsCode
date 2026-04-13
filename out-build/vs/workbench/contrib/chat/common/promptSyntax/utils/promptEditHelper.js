/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
const isSimpleNameRegex = /^[\w\/\.-]+$/;
export function formatArrayValue(name, quotePreference) {
    switch (quotePreference) {
        case '\'':
            return `'${name}'`;
        case '"':
            return `"${name}"`;
    }
    return isSimpleNameRegex.test(name) ? name : `'${name}'`;
}
export function getQuotePreference(arrayValue, model) {
    const firstStringItem = arrayValue.items.find(item => item.type === 'scalar' && isSimpleNameRegex.test(item.value));
    const firstChar = firstStringItem ? model.getValueInRange(firstStringItem.range).charAt(0) : undefined;
    if (firstChar === `'` || firstChar === `"`) {
        return firstChar;
    }
    return '';
}
//# sourceMappingURL=promptEditHelper.js.map