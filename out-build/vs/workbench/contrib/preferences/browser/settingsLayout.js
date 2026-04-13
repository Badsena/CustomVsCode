/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { isWeb, isWindows } from '../../../../base/common/platform.js';
import { localize } from '../../../../nls.js';
const COMMONLY_USED_SETTINGS = [
    'editor.fontSize',
    'editor.formatOnSave',
    'files.autoSave',
    'GitHub.copilot-chat.manageExtension',
    'editor.defaultFormatter',
    'editor.fontFamily',
    'editor.wordWrap',
    'chat.agent.maxRequests',
    'files.exclude',
    'workbench.colorTheme',
    'editor.tabSize',
    'editor.mouseWheelZoom',
    'editor.formatOnPaste'
];
export function getCommonlyUsedData(settingGroups) {
    const allSettings = new Map();
    for (const group of settingGroups) {
        for (const section of group.sections) {
            for (const s of section.settings) {
                allSettings.set(s.key, s);
            }
        }
    }
    const settings = [];
    for (const id of COMMONLY_USED_SETTINGS) {
        const setting = allSettings.get(id);
        if (setting) {
            settings.push(setting);
        }
    }
    return {
        id: 'commonlyUsed',
        label: localize(13654, null),
        settings
    };
}
export const tocData = {
    id: 'root',
    label: 'root',
    children: [
        {
            id: 'editor',
            label: localize(13655, null),
            settings: ['editor.*'],
            children: [
                {
                    id: 'editor/cursor',
                    label: localize(13656, null),
                    settings: ['editor.cursor*']
                },
                {
                    id: 'editor/find',
                    label: localize(13657, null),
                    settings: ['editor.find.*']
                },
                {
                    id: 'editor/font',
                    label: localize(13658, null),
                    settings: ['editor.font*']
                },
                {
                    id: 'editor/format',
                    label: localize(13659, null),
                    settings: ['editor.format*']
                },
                {
                    id: 'editor/diffEditor',
                    label: localize(13660, null),
                    settings: ['diffEditor.*']
                },
                {
                    id: 'editor/multiDiffEditor',
                    label: localize(13661, null),
                    settings: ['multiDiffEditor.*']
                },
                {
                    id: 'editor/minimap',
                    label: localize(13662, null),
                    settings: ['editor.minimap.*']
                },
                {
                    id: 'editor/suggestions',
                    label: localize(13663, null),
                    settings: ['editor.*suggest*']
                },
                {
                    id: 'editor/files',
                    label: localize(13664, null),
                    settings: ['files.*']
                }
            ]
        },
        {
            id: 'workbench',
            label: localize(13665, null),
            settings: ['workbench.*'],
            children: [
                {
                    id: 'workbench/appearance',
                    label: localize(13666, null),
                    settings: ['workbench.activityBar.*', 'workbench.*color*', 'workbench.fontAliasing', 'workbench.iconTheme', 'workbench.sidebar.location', 'workbench.*.visible', 'workbench.tips.enabled', 'workbench.tree.*', 'workbench.view.*']
                },
                {
                    id: 'workbench/breadcrumbs',
                    label: localize(13667, null),
                    settings: ['breadcrumbs.*']
                },
                {
                    id: 'workbench/editor',
                    label: localize(13668, null),
                    settings: ['workbench.editor.*']
                },
                {
                    id: 'workbench/settings',
                    label: localize(13669, null),
                    settings: ['workbench.settings.*']
                },
                {
                    id: 'workbench/zenmode',
                    label: localize(13670, null),
                    settings: ['zenmode.*']
                },
                {
                    id: 'workbench/screencastmode',
                    label: localize(13671, null),
                    settings: ['screencastMode.*']
                },
                {
                    id: 'workbench/browser',
                    label: localize(13672, null),
                    settings: ['workbench.browser.*']
                }
            ]
        },
        {
            id: 'window',
            label: localize(13673, null),
            settings: ['window.*'],
            children: [
                {
                    id: 'window/newWindow',
                    label: localize(13674, null),
                    settings: ['window.*newwindow*']
                }
            ]
        },
        {
            id: 'chat',
            label: localize(13675, null),
            children: [
                {
                    id: 'chat/agent',
                    label: localize(13676, null),
                    settings: [
                        'chat.agent.*',
                        'chat.checkpoints.*',
                        'chat.editRequests',
                        'chat.requestQueuing.*',
                        'chat.undoRequests.*',
                        'chat.customAgentInSubagent.*',
                        'chat.editing.autoAcceptDelay',
                        'chat.editing.confirmEditRequest*',
                        'chat.planAgent.defaultModel'
                    ]
                },
                {
                    id: 'chat/appearance',
                    label: localize(13677, null),
                    settings: [
                        'chat.editor.*',
                        'chat.fontFamily',
                        'chat.fontSize',
                        'chat.math.*',
                        'chat.agentsControl.*',
                        'chat.alternativeToolAction.*',
                        'chat.codeBlock.*',
                        'chat.editing.explainChanges.enabled',
                        'chat.editMode.hidden',
                        'chat.editorAssociations',
                        'chat.extensionUnification.*',
                        'chat.inlineReferences.*',
                        'chat.notifyWindow*',
                        'chat.statusWidget.*',
                        'chat.tips.*',
                        'chat.unifiedAgentsBar.*',
                        'accessibility.signals.chatUserActionRequired',
                        'accessibility.signals.chatResponseReceived'
                    ]
                },
                {
                    id: 'chat/sessions',
                    label: localize(13678, null),
                    settings: [
                        'chat.agentSessionProjection.*',
                        'chat.sessions.*',
                        'chat.viewProgressBadge.*',
                        'chat.viewSessions.*',
                        'chat.restoreLastPanelSession',
                        'chat.exitAfterDelegation',
                        'chat.repoInfo.*'
                    ]
                },
                {
                    id: 'chat/tools',
                    label: localize(13679, null),
                    settings: [
                        'chat.tools.*',
                        'chat.extensionTools.*'
                    ]
                },
                {
                    id: 'chat/mcp',
                    label: localize(13680, null),
                    settings: ['mcp', 'chat.mcp.*', 'mcp.*']
                },
                {
                    id: 'chat/context',
                    label: localize(13681, null),
                    settings: [
                        'chat.detectParticipant.*',
                        'chat.experimental.detectParticipant.*',
                        'chat.implicitContext.*',
                        'chat.promptFilesLocations',
                        'chat.instructionsFilesLocations',
                        'chat.modeFilesLocations',
                        'chat.agentFilesLocations',
                        'chat.agentSkillsLocations',
                        'chat.hookFilesLocations',
                        'chat.promptFilesRecommendations',
                        'chat.useAgentsMdFile',
                        'chat.useNestedAgentsMdFiles',
                        'chat.useAgentSkills',
                        'chat.experimental.useSkillAdherencePrompt',
                        'chat.useHooks',
                        'chat.includeApplyingInstructions',
                        'chat.includeReferencedInstructions',
                        'chat.sendElementsToChat.*',
                        'chat.useClaudeMdFile'
                    ]
                },
                {
                    id: 'chat/inlineChat',
                    label: localize(13682, null),
                    settings: ['inlineChat.*']
                },
                {
                    id: 'chat/miscellaneous',
                    label: localize(13683, null),
                    settings: [
                        'chat.disableAIFeatures',
                        'chat.allowAnonymousAccess'
                    ]
                },
            ]
        },
        {
            id: 'features',
            label: localize(13684, null),
            children: [
                {
                    id: 'features/accessibilitySignals',
                    label: localize(13685, null),
                    settings: ['accessibility.signal*']
                },
                {
                    id: 'features/accessibility',
                    label: localize(13686, null),
                    settings: ['accessibility.*']
                },
                {
                    id: 'features/explorer',
                    label: localize(13687, null),
                    settings: ['explorer.*', 'outline.*']
                },
                {
                    id: 'features/search',
                    label: localize(13688, null),
                    settings: ['search.*']
                },
                {
                    id: 'features/debug',
                    label: localize(13689, null),
                    settings: ['debug.*', 'launch']
                },
                {
                    id: 'features/testing',
                    label: localize(13690, null),
                    settings: ['testing.*']
                },
                {
                    id: 'features/scm',
                    label: localize(13691, null),
                    settings: ['scm.*']
                },
                {
                    id: 'features/extensions',
                    label: localize(13692, null),
                    settings: ['extensions.*']
                },
                {
                    id: 'features/terminal',
                    label: localize(13693, null),
                    settings: ['terminal.*']
                },
                {
                    id: 'features/task',
                    label: localize(13694, null),
                    settings: ['task.*']
                },
                {
                    id: 'features/problems',
                    label: localize(13695, null),
                    settings: ['problems.*']
                },
                {
                    id: 'features/output',
                    label: localize(13696, null),
                    settings: ['output.*']
                },
                {
                    id: 'features/comments',
                    label: localize(13697, null),
                    settings: ['comments.*']
                },
                {
                    id: 'features/remote',
                    label: localize(13698, null),
                    settings: ['remote.*']
                },
                {
                    id: 'features/timeline',
                    label: localize(13699, null),
                    settings: ['timeline.*']
                },
                {
                    id: 'features/notebook',
                    label: localize(13700, null),
                    settings: ['notebook.*', 'interactiveWindow.*']
                },
                {
                    id: 'features/mergeEditor',
                    label: localize(13701, null),
                    settings: ['mergeEditor.*']
                },
                {
                    id: 'features/issueReporter',
                    label: localize(13702, null),
                    settings: ['issueReporter.*'],
                    hide: !isWeb
                }
            ]
        },
        {
            id: 'application',
            label: localize(13703, null),
            children: [
                {
                    id: 'application/http',
                    label: localize(13704, null),
                    settings: ['http.*']
                },
                {
                    id: 'application/keyboard',
                    label: localize(13705, null),
                    settings: ['keyboard.*']
                },
                {
                    id: 'application/update',
                    label: localize(13706, null),
                    settings: ['update.*']
                },
                {
                    id: 'application/telemetry',
                    label: localize(13707, null),
                    settings: ['telemetry.*']
                },
                {
                    id: 'application/settingsSync',
                    label: localize(13708, null),
                    settings: ['settingsSync.*']
                },
                {
                    id: 'application/network',
                    label: localize(13709, null),
                    settings: ['network.*']
                },
                {
                    id: 'application/experimental',
                    label: localize(13710, null),
                    settings: ['application.experimental.*']
                },
                {
                    id: 'application/other',
                    label: localize(13711, null),
                    settings: ['application.*'],
                    hide: isWindows
                }
            ]
        },
        {
            id: 'security',
            label: localize(13712, null),
            settings: ['security.*'],
            children: [
                {
                    id: 'security/workspace',
                    label: localize(13713, null),
                    settings: ['security.workspace.*']
                }
            ]
        }
    ]
};
//# sourceMappingURL=settingsLayout.js.map