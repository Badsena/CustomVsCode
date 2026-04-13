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
import { Extensions as WorkbenchExtensions, registerWorkbenchContribution2 } from '../../../common/contributions.js';
import { Registry } from '../../../../platform/registry/common/platform.js';
import { ILabelService } from '../../../../platform/label/common/label.js';
import { isWeb, OS } from '../../../../base/common/platform.js';
import { Schemas } from '../../../../base/common/network.js';
import { IRemoteAgentService } from '../../../services/remote/common/remoteAgentService.js';
import { ILoggerService } from '../../../../platform/log/common/log.js';
import { localize, localize2 } from '../../../../nls.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { Extensions as ConfigurationExtensions } from '../../../../platform/configuration/common/configurationRegistry.js';
import { IFileService } from '../../../../platform/files/common/files.js';
import { IDialogService, IFileDialogService } from '../../../../platform/dialogs/common/dialogs.js';
import { IWorkbenchEnvironmentService } from '../../../services/environment/common/environmentService.js';
import { IWorkspaceContextService } from '../../../../platform/workspace/common/workspace.js';
import { Action2, registerAction2 } from '../../../../platform/actions/common/actions.js';
import { Categories } from '../../../../platform/action/common/actionCommonCategories.js';
import { PersistentConnection } from '../../../../platform/remote/common/remoteAgentConnection.js';
import { IDownloadService } from '../../../../platform/download/common/download.js';
import { DownloadServiceChannel } from '../../../../platform/download/common/downloadIpc.js';
import { RemoteLoggerChannelClient } from '../../../../platform/log/common/logIpc.js';
import { REMOTE_DEFAULT_IF_LOCAL_EXTENSIONS } from '../../../../platform/remote/common/remote.js';
import product from '../../../../platform/product/common/product.js';
const EXTENSION_IDENTIFIER_PATTERN = '([a-z0-9A-Z][a-z0-9-A-Z]*)\\.([a-z0-9A-Z][a-z0-9-A-Z]*)$';
let LabelContribution = class LabelContribution {
    static { this.ID = 'workbench.contrib.remoteLabel'; }
    constructor(labelService, remoteAgentService) {
        this.labelService = labelService;
        this.remoteAgentService = remoteAgentService;
        this.registerFormatters();
    }
    registerFormatters() {
        this.remoteAgentService.getEnvironment().then(remoteEnvironment => {
            const os = remoteEnvironment?.os || OS;
            const formatting = {
                label: '${path}',
                separator: os === 1 /* OperatingSystem.Windows */ ? '\\' : '/',
                tildify: os !== 1 /* OperatingSystem.Windows */,
                normalizeDriveLetter: os === 1 /* OperatingSystem.Windows */,
                workspaceSuffix: isWeb ? undefined : Schemas.vscodeRemote
            };
            this.labelService.registerFormatter({
                scheme: Schemas.vscodeRemote,
                formatting
            });
            if (remoteEnvironment) {
                this.labelService.registerFormatter({
                    scheme: Schemas.vscodeUserData,
                    formatting
                });
            }
        });
    }
};
LabelContribution = __decorate([
    __param(0, ILabelService),
    __param(1, IRemoteAgentService)
], LabelContribution);
export { LabelContribution };
let RemoteChannelsContribution = class RemoteChannelsContribution extends Disposable {
    constructor(remoteAgentService, downloadService, loggerService) {
        super();
        const connection = remoteAgentService.getConnection();
        if (connection) {
            connection.registerChannel('download', new DownloadServiceChannel(downloadService));
            connection.withChannel('logger', async (channel) => this._register(new RemoteLoggerChannelClient(loggerService, channel)));
        }
    }
};
RemoteChannelsContribution = __decorate([
    __param(0, IRemoteAgentService),
    __param(1, IDownloadService),
    __param(2, ILoggerService)
], RemoteChannelsContribution);
let RemoteInvalidWorkspaceDetector = class RemoteInvalidWorkspaceDetector extends Disposable {
    static { this.ID = 'workbench.contrib.remoteInvalidWorkspaceDetector'; }
    constructor(fileService, dialogService, environmentService, contextService, fileDialogService, remoteAgentService) {
        super();
        this.fileService = fileService;
        this.dialogService = dialogService;
        this.environmentService = environmentService;
        this.contextService = contextService;
        this.fileDialogService = fileDialogService;
        // When connected to a remote workspace, we currently cannot
        // validate that the workspace exists before actually opening
        // it. As such, we need to check on that after startup and guide
        // the user to a valid workspace.
        // (see https://github.com/microsoft/vscode/issues/133872)
        if (this.environmentService.remoteAuthority) {
            remoteAgentService.getEnvironment().then(remoteEnv => {
                if (remoteEnv) {
                    // we use the presence of `remoteEnv` to figure out
                    // if we got a healthy remote connection
                    // (see https://github.com/microsoft/vscode/issues/135331)
                    this.validateRemoteWorkspace();
                }
            });
        }
    }
    async validateRemoteWorkspace() {
        const workspace = this.contextService.getWorkspace();
        const workspaceUriToStat = workspace.configuration ?? workspace.folders.at(0)?.uri;
        if (!workspaceUriToStat) {
            return; // only when in workspace
        }
        const exists = await this.fileService.exists(workspaceUriToStat);
        if (exists) {
            return; // all good!
        }
        const res = await this.dialogService.confirm({
            type: 'warning',
            message: localize(14038, null),
            detail: localize(14039, null),
            primaryButton: localize(14040, null)
        });
        if (res.confirmed) {
            // Pick Workspace
            if (workspace.configuration) {
                return this.fileDialogService.pickWorkspaceAndOpen({});
            }
            // Pick Folder
            return this.fileDialogService.pickFolderAndOpen({});
        }
    }
};
RemoteInvalidWorkspaceDetector = __decorate([
    __param(0, IFileService),
    __param(1, IDialogService),
    __param(2, IWorkbenchEnvironmentService),
    __param(3, IWorkspaceContextService),
    __param(4, IFileDialogService),
    __param(5, IRemoteAgentService)
], RemoteInvalidWorkspaceDetector);
const workbenchContributionsRegistry = Registry.as(WorkbenchExtensions.Workbench);
registerWorkbenchContribution2(LabelContribution.ID, LabelContribution, 1 /* WorkbenchPhase.BlockStartup */);
workbenchContributionsRegistry.registerWorkbenchContribution(RemoteChannelsContribution, 3 /* LifecyclePhase.Restored */);
registerWorkbenchContribution2(RemoteInvalidWorkspaceDetector.ID, RemoteInvalidWorkspaceDetector, 1 /* WorkbenchPhase.BlockStartup */);
const enableDiagnostics = true;
if (enableDiagnostics) {
    class TriggerReconnectAction extends Action2 {
        constructor() {
            super({
                id: 'workbench.action.triggerReconnect',
                title: localize2(14084, 'Connection: Trigger Reconnect'),
                category: Categories.Developer,
                f1: true,
            });
        }
        async run(accessor) {
            PersistentConnection.debugTriggerReconnection();
        }
    }
    class PauseSocketWriting extends Action2 {
        constructor() {
            super({
                id: 'workbench.action.pauseSocketWriting',
                title: localize2(14085, 'Connection: Pause socket writing'),
                category: Categories.Developer,
                f1: true,
            });
        }
        async run(accessor) {
            PersistentConnection.debugPauseSocketWriting();
        }
    }
    registerAction2(TriggerReconnectAction);
    registerAction2(PauseSocketWriting);
}
const extensionKindSchema = {
    type: 'string',
    enum: [
        'ui',
        'workspace'
    ],
    enumDescriptions: [
        localize(14041, null),
        localize(14042, null)
    ],
};
Registry.as(ConfigurationExtensions.Configuration)
    .registerConfiguration({
    id: 'remote',
    title: localize(14043, null),
    type: 'object',
    properties: {
        'remote.extensionKind': {
            type: 'object',
            markdownDescription: localize(14044, null),
            patternProperties: {
                [EXTENSION_IDENTIFIER_PATTERN]: {
                    oneOf: [{ type: 'array', items: extensionKindSchema }, extensionKindSchema],
                    default: ['ui'],
                },
            },
            default: {
                'pub.name': ['ui']
            }
        },
        'remote.restoreForwardedPorts': {
            type: 'boolean',
            markdownDescription: localize(14045, null),
            default: true
        },
        'remote.autoForwardPorts': {
            type: 'boolean',
            markdownDescription: localize(14046, null, '`#remote.autoForwardPortsSource#`'),
            default: true
        },
        'remote.autoForwardPortsSource': {
            type: 'string',
            markdownDescription: localize(14047, null, '`#remote.autoForwardPorts#`', '`#remote.autoForwardPortsSource#`'),
            enum: ['process', 'output', 'hybrid'],
            enumDescriptions: [
                localize(14048, null),
                localize(14049, null),
                localize(14050, null)
            ],
            default: 'process'
        },
        'remote.autoForwardPortsFallback': {
            type: 'number',
            default: 20,
            markdownDescription: localize(14051, null)
        },
        'remote.forwardOnOpen': {
            type: 'boolean',
            description: localize(14052, null),
            default: true
        },
        // Consider making changes to extensions\configuration-editing\schemas\devContainer.schema.src.json
        // and extensions\configuration-editing\schemas\attachContainer.schema.json
        // to keep in sync with devcontainer.json schema.
        'remote.portsAttributes': {
            type: 'object',
            patternProperties: {
                '(^\\d+(-\\d+)?$)|(.+)': {
                    type: 'object',
                    description: localize(14053, null),
                    properties: {
                        'onAutoForward': {
                            type: 'string',
                            enum: ['notify', 'openBrowser', 'openBrowserOnce', 'openPreview', 'silent', 'ignore'],
                            enumDescriptions: [
                                localize(14054, null),
                                localize(14055, null),
                                localize(14056, null),
                                localize(14057, null),
                                localize(14058, null),
                                localize(14059, null)
                            ],
                            description: localize(14060, null),
                            default: 'notify'
                        },
                        'elevateIfNeeded': {
                            type: 'boolean',
                            description: localize(14061, null),
                            default: false
                        },
                        'label': {
                            type: 'string',
                            description: localize(14062, null),
                            default: localize(14063, null)
                        },
                        'requireLocalPort': {
                            type: 'boolean',
                            markdownDescription: localize(14064, null),
                            default: false
                        },
                        'protocol': {
                            type: 'string',
                            enum: ['http', 'https'],
                            description: localize(14065, null)
                        }
                    },
                    default: {
                        'label': localize(14066, null),
                        'onAutoForward': 'notify'
                    }
                }
            },
            markdownDescription: localize(14067, null),
            defaultSnippets: [{ body: { '${1:3000}': { label: '${2:Application}', onAutoForward: 'openPreview' } } }],
            errorMessage: localize(14068, null),
            additionalProperties: false,
            default: {
                '443': {
                    'protocol': 'https'
                },
                '8443': {
                    'protocol': 'https'
                }
            }
        },
        'remote.otherPortsAttributes': {
            type: 'object',
            properties: {
                'onAutoForward': {
                    type: 'string',
                    enum: ['notify', 'openBrowser', 'openPreview', 'silent', 'ignore'],
                    enumDescriptions: [
                        localize(14069, null),
                        localize(14070, null),
                        localize(14071, null),
                        localize(14072, null),
                        localize(14073, null)
                    ],
                    description: localize(14074, null),
                    default: 'notify'
                },
                'elevateIfNeeded': {
                    type: 'boolean',
                    description: localize(14075, null),
                    default: false
                },
                'label': {
                    type: 'string',
                    description: localize(14076, null),
                    default: localize(14077, null)
                },
                'requireLocalPort': {
                    type: 'boolean',
                    markdownDescription: localize(14078, null),
                    default: false
                },
                'protocol': {
                    type: 'string',
                    enum: ['http', 'https'],
                    description: localize(14079, null)
                }
            },
            defaultSnippets: [{ body: { onAutoForward: 'ignore' } }],
            markdownDescription: localize(14080, null, '`#remote.portsAttributes#`'),
            additionalProperties: false
        },
        'remote.localPortHost': {
            type: 'string',
            enum: ['localhost', 'allInterfaces'],
            default: 'localhost',
            description: localize(14081, null)
        },
        [REMOTE_DEFAULT_IF_LOCAL_EXTENSIONS]: {
            type: 'array',
            markdownDescription: localize(14082, null),
            default: product?.remoteDefaultExtensionsIfInstalledLocally || [],
            items: {
                type: 'string',
                pattern: EXTENSION_IDENTIFIER_PATTERN,
                patternErrorMessage: localize(14083, null)
            },
        }
    }
});
//# sourceMappingURL=remote.contribution.js.map