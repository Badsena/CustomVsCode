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
import { Disposable, DisposableMap } from '../../../../../base/common/lifecycle.js';
import { joinPath, isEqualOrParent } from '../../../../../base/common/resources.js';
import { localize } from '../../../../../nls.js';
import * as extensionsRegistry from '../../../../services/extensions/common/extensionsRegistry.js';
import { IPromptsService, PromptsStorage } from './service/promptsService.js';
import { PromptsType } from './promptTypes.js';
import { CommandsRegistry } from '../../../../../platform/commands/common/commands.js';
import { CancellationToken } from '../../../../../base/common/cancellation.js';
import { SyncDescriptor } from '../../../../../platform/instantiation/common/descriptors.js';
import { Registry } from '../../../../../platform/registry/common/platform.js';
import { Extensions } from '../../../../services/extensionManagement/common/extensionFeatures.js';
import { ContextKeyExpr } from '../../../../../platform/contextkey/common/contextkey.js';
var ChatContributionPoint;
(function (ChatContributionPoint) {
    ChatContributionPoint["chatInstructions"] = "chatInstructions";
    ChatContributionPoint["chatAgents"] = "chatAgents";
    ChatContributionPoint["chatPromptFiles"] = "chatPromptFiles";
    ChatContributionPoint["chatSkills"] = "chatSkills";
})(ChatContributionPoint || (ChatContributionPoint = {}));
function registerChatFilesExtensionPoint(point) {
    return extensionsRegistry.ExtensionsRegistry.registerExtensionPoint({
        extensionPoint: point,
        jsonSchema: {
            description: localize(8489, null, point),
            type: 'array',
            items: {
                additionalProperties: false,
                type: 'object',
                defaultSnippets: [{
                        body: {
                            path: point === ChatContributionPoint.chatSkills
                                ? './relative/path/to/skill-name/SKILL.md'
                                : './relative/path/to/file.md',
                        }
                    }],
                required: ['path'],
                properties: {
                    path: {
                        description: point === ChatContributionPoint.chatSkills
                            ? localize(8490, null)
                            : localize(8491, null),
                        type: 'string'
                    },
                    name: {
                        description: localize(8492, null),
                        deprecationMessage: localize(8493, null),
                        type: 'string'
                    },
                    description: {
                        description: localize(8494, null),
                        deprecationMessage: localize(8495, null),
                        type: 'string'
                    },
                    when: {
                        description: localize(8496, null),
                        type: 'string'
                    }
                }
            }
        }
    });
}
const epPrompt = registerChatFilesExtensionPoint(ChatContributionPoint.chatPromptFiles);
const epInstructions = registerChatFilesExtensionPoint(ChatContributionPoint.chatInstructions);
const epAgents = registerChatFilesExtensionPoint(ChatContributionPoint.chatAgents);
const epSkills = registerChatFilesExtensionPoint(ChatContributionPoint.chatSkills);
function pointToType(contributionPoint) {
    switch (contributionPoint) {
        case ChatContributionPoint.chatPromptFiles: return PromptsType.prompt;
        case ChatContributionPoint.chatInstructions: return PromptsType.instructions;
        case ChatContributionPoint.chatAgents: return PromptsType.agent;
        case ChatContributionPoint.chatSkills: return PromptsType.skill;
        default: {
            const exhaustiveCheck = contributionPoint;
            throw new Error(`Unknown contribution point: ${exhaustiveCheck}`);
        }
    }
}
function key(extensionId, type, path) {
    return `${extensionId.value}/${type}/${path}`;
}
let ChatPromptFilesExtensionPointHandler = class ChatPromptFilesExtensionPointHandler {
    static { this.ID = 'workbench.contrib.chatPromptFilesExtensionPointHandler'; }
    constructor(promptsService) {
        this.promptsService = promptsService;
        this.registrations = new DisposableMap();
        this.handle(epPrompt, ChatContributionPoint.chatPromptFiles);
        this.handle(epInstructions, ChatContributionPoint.chatInstructions);
        this.handle(epAgents, ChatContributionPoint.chatAgents);
        this.handle(epSkills, ChatContributionPoint.chatSkills);
    }
    handle(extensionPoint, contributionPoint) {
        extensionPoint.setHandler((_extensions, delta) => {
            for (const ext of delta.added) {
                const type = pointToType(contributionPoint);
                for (const raw of ext.value) {
                    if (!raw.path) {
                        ext.collector.error(localize(8497, null, ext.description.identifier.value, contributionPoint));
                        continue;
                    }
                    const fileUri = joinPath(ext.description.extensionLocation, raw.path);
                    if (!isEqualOrParent(fileUri, ext.description.extensionLocation)) {
                        ext.collector.error(localize(8498, null, ext.description.identifier.value, contributionPoint, raw.path));
                        continue;
                    }
                    if (raw.when && !ContextKeyExpr.deserialize(raw.when)) {
                        ext.collector.error(localize(8499, null, ext.description.identifier.value, contributionPoint, raw.path, raw.when));
                        continue;
                    }
                    try {
                        const d = this.promptsService.registerContributedFile(type, fileUri, ext.description, raw.name, raw.description, raw.when);
                        this.registrations.set(key(ext.description.identifier, type, raw.path), d);
                    }
                    catch (e) {
                        const msg = e instanceof Error ? e.message : String(e);
                        ext.collector.error(localize(8500, null, ext.description.identifier.value, contributionPoint, raw.path, msg));
                    }
                }
            }
            for (const ext of delta.removed) {
                const type = pointToType(contributionPoint);
                for (const raw of ext.value) {
                    this.registrations.deleteAndDispose(key(ext.description.identifier, type, raw.path));
                }
            }
        });
    }
};
ChatPromptFilesExtensionPointHandler = __decorate([
    __param(0, IPromptsService)
], ChatPromptFilesExtensionPointHandler);
export { ChatPromptFilesExtensionPointHandler };
/**
 * Register the command to list all extension-contributed prompt files.
 */
CommandsRegistry.registerCommand('_listExtensionPromptFiles', async (accessor) => {
    const promptsService = accessor.get(IPromptsService);
    // Get extension prompt files for all prompt types in parallel
    const [agents, instructions, prompts, skills, hooks] = await Promise.all([
        promptsService.listPromptFiles(PromptsType.agent, CancellationToken.None),
        promptsService.listPromptFiles(PromptsType.instructions, CancellationToken.None),
        promptsService.listPromptFiles(PromptsType.prompt, CancellationToken.None),
        promptsService.listPromptFiles(PromptsType.skill, CancellationToken.None),
        promptsService.listPromptFiles(PromptsType.hook, CancellationToken.None),
    ]);
    // Combine all files and collect extension-contributed ones
    const result = [];
    for (const file of [...agents, ...instructions, ...prompts, ...skills, ...hooks]) {
        if (file.storage === PromptsStorage.extension) {
            result.push({ uri: file.uri.toJSON(), type: file.type });
        }
    }
    return result;
});
class ChatPromptFilesDataRenderer extends Disposable {
    constructor(contributionPoint) {
        super();
        this.contributionPoint = contributionPoint;
        this.type = 'table';
    }
    shouldRender(manifest) {
        return !!manifest.contributes?.[this.contributionPoint];
    }
    render(manifest) {
        const contributions = manifest.contributes?.[this.contributionPoint] ?? [];
        if (!contributions.length) {
            return { data: { headers: [], rows: [] }, dispose: () => { } };
        }
        const headers = [
            localize(8501, null),
            localize(8502, null),
            localize(8503, null),
        ];
        const rows = contributions.map(d => {
            return [
                d.name ?? '-',
                d.description ?? '-',
                d.path,
            ];
        });
        return {
            data: {
                headers,
                rows
            },
            dispose: () => { }
        };
    }
}
Registry.as(Extensions.ExtensionFeaturesRegistry).registerExtensionFeature({
    id: ChatContributionPoint.chatPromptFiles,
    label: localize(8504, null),
    access: {
        canToggle: false
    },
    renderer: new SyncDescriptor(ChatPromptFilesDataRenderer, [ChatContributionPoint.chatPromptFiles]),
});
Registry.as(Extensions.ExtensionFeaturesRegistry).registerExtensionFeature({
    id: ChatContributionPoint.chatInstructions,
    label: localize(8505, null),
    access: {
        canToggle: false
    },
    renderer: new SyncDescriptor(ChatPromptFilesDataRenderer, [ChatContributionPoint.chatInstructions]),
});
Registry.as(Extensions.ExtensionFeaturesRegistry).registerExtensionFeature({
    id: ChatContributionPoint.chatAgents,
    label: localize(8506, null),
    access: {
        canToggle: false
    },
    renderer: new SyncDescriptor(ChatPromptFilesDataRenderer, [ChatContributionPoint.chatAgents]),
});
Registry.as(Extensions.ExtensionFeaturesRegistry).registerExtensionFeature({
    id: ChatContributionPoint.chatSkills,
    label: localize(8507, null),
    access: {
        canToggle: false
    },
    renderer: new SyncDescriptor(ChatPromptFilesDataRenderer, [ChatContributionPoint.chatSkills]),
});
//# sourceMappingURL=chatPromptFilesContribution.js.map