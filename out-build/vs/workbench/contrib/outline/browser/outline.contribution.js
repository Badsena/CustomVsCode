/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { localize, localize2 } from '../../../../nls.js';
import { Extensions as ViewExtensions } from '../../../common/views.js';
import { OutlinePane } from './outlinePane.js';
import { Registry } from '../../../../platform/registry/common/platform.js';
import { Extensions as ConfigurationExtensions } from '../../../../platform/configuration/common/configurationRegistry.js';
import { VIEW_CONTAINER } from '../../files/browser/explorerViewlet.js';
import { SyncDescriptor } from '../../../../platform/instantiation/common/descriptors.js';
import { Codicon } from '../../../../base/common/codicons.js';
import { registerIcon } from '../../../../platform/theme/common/iconRegistry.js';
import { IOutlinePane } from './outline.js';
// --- actions
import './outlineActions.js';
// --- view
const outlineViewIcon = registerIcon('outline-view-icon', Codicon.symbolClass, localize(13305, null));
Registry.as(ViewExtensions.ViewsRegistry).registerViews([{
        id: IOutlinePane.Id,
        name: localize2(13340, "Outline"),
        containerIcon: outlineViewIcon,
        ctorDescriptor: new SyncDescriptor(OutlinePane),
        canToggleVisibility: true,
        canMoveView: true,
        hideByDefault: false,
        collapsed: true,
        order: 2,
        weight: 30,
        focusCommand: { id: 'outline.focus' }
    }], VIEW_CONTAINER);
// --- configurations
Registry.as(ConfigurationExtensions.Configuration).registerConfiguration({
    'id': 'outline',
    'order': 117,
    'title': localize(13306, null),
    'type': 'object',
    'properties': {
        ["outline.icons" /* OutlineConfigKeys.icons */]: {
            'description': localize(13307, null),
            'type': 'boolean',
            'default': true
        },
        ["outline.collapseItems" /* OutlineConfigKeys.collapseItems */]: {
            'description': localize(13308, null),
            'type': 'string',
            scope: 6 /* ConfigurationScope.LANGUAGE_OVERRIDABLE */,
            'enum': [
                'alwaysCollapse',
                'alwaysExpand'
            ],
            'enumDescriptions': [
                localize(13309, null),
                localize(13310, null)
            ],
            'default': 'alwaysExpand'
        },
        ["outline.problems.enabled" /* OutlineConfigKeys.problemsEnabled */]: {
            'markdownDescription': localize(13311, null, '`#problems.visibility#`'),
            'type': 'boolean',
            'default': true
        },
        ["outline.problems.colors" /* OutlineConfigKeys.problemsColors */]: {
            'markdownDescription': localize(13312, null, '`#problems.visibility#`'),
            'type': 'boolean',
            'default': true
        },
        ["outline.problems.badges" /* OutlineConfigKeys.problemsBadges */]: {
            'markdownDescription': localize(13313, null, '`#problems.visibility#`'),
            'type': 'boolean',
            'default': true
        },
        'outline.showFiles': {
            type: 'boolean',
            scope: 6 /* ConfigurationScope.LANGUAGE_OVERRIDABLE */,
            default: true,
            markdownDescription: localize(13314, null)
        },
        'outline.showModules': {
            type: 'boolean',
            scope: 6 /* ConfigurationScope.LANGUAGE_OVERRIDABLE */,
            default: true,
            markdownDescription: localize(13315, null)
        },
        'outline.showNamespaces': {
            type: 'boolean',
            default: true,
            scope: 6 /* ConfigurationScope.LANGUAGE_OVERRIDABLE */,
            markdownDescription: localize(13316, null)
        },
        'outline.showPackages': {
            type: 'boolean',
            default: true,
            scope: 6 /* ConfigurationScope.LANGUAGE_OVERRIDABLE */,
            markdownDescription: localize(13317, null)
        },
        'outline.showClasses': {
            type: 'boolean',
            default: true,
            scope: 6 /* ConfigurationScope.LANGUAGE_OVERRIDABLE */,
            markdownDescription: localize(13318, null)
        },
        'outline.showMethods': {
            type: 'boolean',
            default: true,
            scope: 6 /* ConfigurationScope.LANGUAGE_OVERRIDABLE */,
            markdownDescription: localize(13319, null)
        },
        'outline.showProperties': {
            type: 'boolean',
            default: true,
            scope: 6 /* ConfigurationScope.LANGUAGE_OVERRIDABLE */,
            markdownDescription: localize(13320, null)
        },
        'outline.showFields': {
            type: 'boolean',
            default: true,
            scope: 6 /* ConfigurationScope.LANGUAGE_OVERRIDABLE */,
            markdownDescription: localize(13321, null)
        },
        'outline.showConstructors': {
            type: 'boolean',
            default: true,
            scope: 6 /* ConfigurationScope.LANGUAGE_OVERRIDABLE */,
            markdownDescription: localize(13322, null)
        },
        'outline.showEnums': {
            type: 'boolean',
            default: true,
            scope: 6 /* ConfigurationScope.LANGUAGE_OVERRIDABLE */,
            markdownDescription: localize(13323, null)
        },
        'outline.showInterfaces': {
            type: 'boolean',
            default: true,
            scope: 6 /* ConfigurationScope.LANGUAGE_OVERRIDABLE */,
            markdownDescription: localize(13324, null)
        },
        'outline.showFunctions': {
            type: 'boolean',
            default: true,
            scope: 6 /* ConfigurationScope.LANGUAGE_OVERRIDABLE */,
            markdownDescription: localize(13325, null)
        },
        'outline.showVariables': {
            type: 'boolean',
            default: true,
            scope: 6 /* ConfigurationScope.LANGUAGE_OVERRIDABLE */,
            markdownDescription: localize(13326, null)
        },
        'outline.showConstants': {
            type: 'boolean',
            default: true,
            scope: 6 /* ConfigurationScope.LANGUAGE_OVERRIDABLE */,
            markdownDescription: localize(13327, null)
        },
        'outline.showStrings': {
            type: 'boolean',
            default: true,
            scope: 6 /* ConfigurationScope.LANGUAGE_OVERRIDABLE */,
            markdownDescription: localize(13328, null)
        },
        'outline.showNumbers': {
            type: 'boolean',
            default: true,
            scope: 6 /* ConfigurationScope.LANGUAGE_OVERRIDABLE */,
            markdownDescription: localize(13329, null)
        },
        'outline.showBooleans': {
            type: 'boolean',
            scope: 6 /* ConfigurationScope.LANGUAGE_OVERRIDABLE */,
            default: true,
            markdownDescription: localize(13330, null)
        },
        'outline.showArrays': {
            type: 'boolean',
            default: true,
            scope: 6 /* ConfigurationScope.LANGUAGE_OVERRIDABLE */,
            markdownDescription: localize(13331, null)
        },
        'outline.showObjects': {
            type: 'boolean',
            default: true,
            scope: 6 /* ConfigurationScope.LANGUAGE_OVERRIDABLE */,
            markdownDescription: localize(13332, null)
        },
        'outline.showKeys': {
            type: 'boolean',
            default: true,
            scope: 6 /* ConfigurationScope.LANGUAGE_OVERRIDABLE */,
            markdownDescription: localize(13333, null)
        },
        'outline.showNull': {
            type: 'boolean',
            default: true,
            scope: 6 /* ConfigurationScope.LANGUAGE_OVERRIDABLE */,
            markdownDescription: localize(13334, null)
        },
        'outline.showEnumMembers': {
            type: 'boolean',
            default: true,
            scope: 6 /* ConfigurationScope.LANGUAGE_OVERRIDABLE */,
            markdownDescription: localize(13335, null)
        },
        'outline.showStructs': {
            type: 'boolean',
            default: true,
            scope: 6 /* ConfigurationScope.LANGUAGE_OVERRIDABLE */,
            markdownDescription: localize(13336, null)
        },
        'outline.showEvents': {
            type: 'boolean',
            default: true,
            scope: 6 /* ConfigurationScope.LANGUAGE_OVERRIDABLE */,
            markdownDescription: localize(13337, null)
        },
        'outline.showOperators': {
            type: 'boolean',
            default: true,
            scope: 6 /* ConfigurationScope.LANGUAGE_OVERRIDABLE */,
            markdownDescription: localize(13338, null)
        },
        'outline.showTypeParameters': {
            type: 'boolean',
            default: true,
            scope: 6 /* ConfigurationScope.LANGUAGE_OVERRIDABLE */,
            markdownDescription: localize(13339, null)
        }
    }
});
//# sourceMappingURL=outline.contribution.js.map