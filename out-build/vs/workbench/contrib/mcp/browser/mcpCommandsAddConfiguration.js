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
import { mapFindFirst } from '../../../../base/common/arraysFind.js';
import { assertNever } from '../../../../base/common/assert.js';
import { disposableTimeout } from '../../../../base/common/async.js';
import { parse as parseJsonc } from '../../../../base/common/jsonc.js';
import { DisposableStore } from '../../../../base/common/lifecycle.js';
import { Schemas } from '../../../../base/common/network.js';
import { autorun } from '../../../../base/common/observable.js';
import { basename } from '../../../../base/common/resources.js';
import { URI } from '../../../../base/common/uri.js';
import { generateUuid } from '../../../../base/common/uuid.js';
import { localize } from '../../../../nls.js';
import { ICommandService } from '../../../../platform/commands/common/commands.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { IFileService } from '../../../../platform/files/common/files.js';
import { ILabelService } from '../../../../platform/label/common/label.js';
import { INotificationService } from '../../../../platform/notification/common/notification.js';
import { IOpenerService } from '../../../../platform/opener/common/opener.js';
import { IQuickInputService } from '../../../../platform/quickinput/common/quickInput.js';
import { ITelemetryService } from '../../../../platform/telemetry/common/telemetry.js';
import { isWorkspaceFolder, IWorkspaceContextService } from '../../../../platform/workspace/common/workspace.js';
import { IFileDialogService } from '../../../../platform/dialogs/common/dialogs.js';
import { IEditorService } from '../../../services/editor/common/editorService.js';
import { IWorkbenchEnvironmentService } from '../../../services/environment/common/environmentService.js';
import { IWorkbenchMcpManagementService } from '../../../services/mcp/common/mcpWorkbenchManagementService.js';
import { allDiscoverySources, mcpDiscoverySection, mcpStdioServerSchema } from '../common/mcpConfiguration.js';
import { IMcpRegistry } from '../common/mcpRegistryTypes.js';
import { IMcpService } from '../common/mcpTypes.js';
import { ILogService } from '../../../../platform/log/common/log.js';
export var AddConfigurationType;
(function (AddConfigurationType) {
    AddConfigurationType[AddConfigurationType["Stdio"] = 0] = "Stdio";
    AddConfigurationType[AddConfigurationType["HTTP"] = 1] = "HTTP";
    AddConfigurationType[AddConfigurationType["NpmPackage"] = 2] = "NpmPackage";
    AddConfigurationType[AddConfigurationType["PipPackage"] = 3] = "PipPackage";
    AddConfigurationType[AddConfigurationType["NuGetPackage"] = 4] = "NuGetPackage";
    AddConfigurationType[AddConfigurationType["DockerImage"] = 5] = "DockerImage";
})(AddConfigurationType || (AddConfigurationType = {}));
export const AssistedTypes = {
    [2 /* AddConfigurationType.NpmPackage */]: {
        title: localize(12194, null),
        placeholder: localize(12195, null),
        pickLabel: localize(12196, null),
        pickDescription: localize(12197, null),
        enabledConfigKey: null, // always enabled
    },
    [3 /* AddConfigurationType.PipPackage */]: {
        title: localize(12198, null),
        placeholder: localize(12199, null),
        pickLabel: localize(12200, null),
        pickDescription: localize(12201, null),
        enabledConfigKey: null, // always enabled
    },
    [4 /* AddConfigurationType.NuGetPackage */]: {
        title: localize(12202, null),
        placeholder: localize(12203, null),
        pickLabel: localize(12204, null),
        pickDescription: localize(12205, null),
        enabledConfigKey: 'chat.mcp.assisted.nuget.enabled',
    },
    [5 /* AddConfigurationType.DockerImage */]: {
        title: localize(12206, null),
        placeholder: localize(12207, null),
        pickLabel: localize(12208, null),
        pickDescription: localize(12209, null),
        enabledConfigKey: null, // always enabled
    },
};
var AddConfigurationCopilotCommand;
(function (AddConfigurationCopilotCommand) {
    /** Returns whether MCP enhanced setup is enabled. */
    AddConfigurationCopilotCommand["IsSupported"] = "github.copilot.chat.mcp.setup.check";
    /** Takes an npm/pip package name, validates its owner. */
    AddConfigurationCopilotCommand["ValidatePackage"] = "github.copilot.chat.mcp.setup.validatePackage";
    /** Returns the resolved MCP configuration. */
    AddConfigurationCopilotCommand["StartFlow"] = "github.copilot.chat.mcp.setup.flow";
})(AddConfigurationCopilotCommand || (AddConfigurationCopilotCommand = {}));
let McpAddConfigurationCommand = class McpAddConfigurationCommand {
    constructor(workspaceFolder, _quickInputService, _mcpManagementService, _workspaceService, _environmentService, _commandService, _mcpRegistry, _openerService, _editorService, _fileService, _notificationService, _telemetryService, _mcpService, _label, _configurationService) {
        this.workspaceFolder = workspaceFolder;
        this._quickInputService = _quickInputService;
        this._mcpManagementService = _mcpManagementService;
        this._workspaceService = _workspaceService;
        this._environmentService = _environmentService;
        this._commandService = _commandService;
        this._mcpRegistry = _mcpRegistry;
        this._openerService = _openerService;
        this._editorService = _editorService;
        this._fileService = _fileService;
        this._notificationService = _notificationService;
        this._telemetryService = _telemetryService;
        this._mcpService = _mcpService;
        this._label = _label;
        this._configurationService = _configurationService;
    }
    async getServerType() {
        const items = [
            { kind: 0 /* AddConfigurationType.Stdio */, label: localize(12210, null), description: localize(12211, null) },
            { kind: 1 /* AddConfigurationType.HTTP */, label: localize(12212, null), description: localize(12213, null) }
        ];
        let aiSupported;
        try {
            aiSupported = await this._commandService.executeCommand("github.copilot.chat.mcp.setup.check" /* AddConfigurationCopilotCommand.IsSupported */);
        }
        catch {
            // ignored
        }
        if (aiSupported) {
            items.unshift({ type: 'separator', label: localize(12214, null) });
            const elligableTypes = Object.entries(AssistedTypes).map(([type, { pickLabel, pickDescription, enabledConfigKey }]) => {
                if (enabledConfigKey) {
                    const enabled = this._configurationService.getValue(enabledConfigKey) ?? false;
                    if (!enabled) {
                        return;
                    }
                }
                return {
                    kind: Number(type),
                    label: pickLabel,
                    description: pickDescription,
                };
            }).filter(x => !!x);
            items.push({ type: 'separator', label: localize(12215, null) }, ...elligableTypes);
        }
        items.push({ type: 'separator' });
        const discovery = this._configurationService.getValue(mcpDiscoverySection);
        if (discovery && typeof discovery === 'object' && allDiscoverySources.some(d => !discovery[d])) {
            items.push({
                kind: 'discovery',
                label: localize(12216, null),
            });
        }
        items.push({
            kind: 'browse',
            label: localize(12217, null),
        });
        const result = await this._quickInputService.pick(items, {
            placeHolder: localize(12218, null),
        });
        if (result?.kind === 'browse') {
            this._commandService.executeCommand("workbench.mcp.browseServers" /* McpCommandIds.Browse */);
            return undefined;
        }
        if (result?.kind === 'discovery') {
            this._commandService.executeCommand('workbench.action.openSettings', mcpDiscoverySection);
            return undefined;
        }
        return result?.kind;
    }
    async getStdioConfig() {
        const command = await this._quickInputService.input({
            title: localize(12219, null),
            placeHolder: localize(12220, null),
            ignoreFocusLost: true,
        });
        if (!command) {
            return undefined;
        }
        this._telemetryService.publicLog2('mcp.addserver', {
            packageType: 'stdio'
        });
        // Split command into command and args, handling quotes
        const parts = command.match(/(?:[^\s"]+|"[^"]*")+/g);
        return {
            type: "stdio" /* McpServerType.LOCAL */,
            command: parts[0].replace(/"/g, ''),
            args: parts.slice(1).map(arg => arg.replace(/"/g, ''))
        };
    }
    async getSSEConfig() {
        const url = await this._quickInputService.input({
            title: localize(12221, null),
            placeHolder: localize(12222, null),
            ignoreFocusLost: true,
        });
        if (!url) {
            return undefined;
        }
        this._telemetryService.publicLog2('mcp.addserver', {
            packageType: 'sse'
        });
        return { url, type: "http" /* McpServerType.REMOTE */ };
    }
    async getServerId(suggestion = `my-mcp-server-${generateUuid().split('-')[0]}`) {
        const id = await this._quickInputService.input({
            title: localize(12223, null),
            placeHolder: localize(12224, null),
            value: suggestion,
            ignoreFocusLost: true,
        });
        return id;
    }
    async getConfigurationTarget() {
        const options = [
            { target: 3 /* ConfigurationTarget.USER_LOCAL */, label: localize(12225, null), description: localize(12226, null) }
        ];
        const raLabel = this._environmentService.remoteAuthority && this._label.getHostLabel(Schemas.vscodeRemote, this._environmentService.remoteAuthority);
        if (raLabel) {
            options.push({ target: 4 /* ConfigurationTarget.USER_REMOTE */, label: localize(12227, null), description: localize(12228, null, raLabel) });
        }
        const workbenchState = this._workspaceService.getWorkbenchState();
        if (workbenchState !== 1 /* WorkbenchState.EMPTY */) {
            const target = workbenchState === 2 /* WorkbenchState.FOLDER */ ? this._workspaceService.getWorkspace().folders[0] : 5 /* ConfigurationTarget.WORKSPACE */;
            if (this._environmentService.remoteAuthority) {
                options.push({ target, label: localize(12229, null), description: localize(12230, null, raLabel) });
            }
            else {
                options.push({ target, label: localize(12231, null), description: localize(12232, null) });
            }
        }
        if (options.length === 1) {
            return options[0].target;
        }
        const targetPick = await this._quickInputService.pick(options, {
            title: localize(12233, null),
            placeHolder: localize(12234, null)
        });
        return targetPick?.target;
    }
    async getAssistedConfig(type) {
        const packageName = await this._quickInputService.input({
            ignoreFocusLost: true,
            title: AssistedTypes[type].title,
            placeHolder: AssistedTypes[type].placeholder,
        });
        if (!packageName) {
            return undefined;
        }
        let LoadAction;
        (function (LoadAction) {
            LoadAction["Retry"] = "retry";
            LoadAction["Cancel"] = "cancel";
            LoadAction["Allow"] = "allow";
            LoadAction["OpenUri"] = "openUri";
        })(LoadAction || (LoadAction = {}));
        const loadingQuickPickStore = new DisposableStore();
        const loadingQuickPick = loadingQuickPickStore.add(this._quickInputService.createQuickPick());
        loadingQuickPick.title = localize(12235, null);
        loadingQuickPick.busy = true;
        loadingQuickPick.ignoreFocusOut = true;
        const packageType = this.getPackageType(type);
        this._telemetryService.publicLog2('mcp.addserver', {
            packageType: packageType
        });
        this._commandService.executeCommand("github.copilot.chat.mcp.setup.validatePackage" /* AddConfigurationCopilotCommand.ValidatePackage */, {
            type: packageType,
            name: packageName,
            targetConfig: {
                ...mcpStdioServerSchema,
                properties: {
                    ...mcpStdioServerSchema.properties,
                    name: {
                        type: 'string',
                        description: 'Suggested name of the server, alphanumeric and hyphen only',
                    }
                },
                required: [...(mcpStdioServerSchema.required || []), 'name'],
            },
        }).then(result => {
            if (!result || result.state === 'error') {
                loadingQuickPick.title = result?.error || 'Unknown error loading package';
                const items = [];
                if (result?.helpUri) {
                    items.push({
                        id: "openUri" /* LoadAction.OpenUri */,
                        label: result.helpUriLabel ?? localize(12236, null),
                        helpUri: URI.parse(result.helpUri),
                    });
                }
                items.push({ id: "retry" /* LoadAction.Retry */, label: localize(12237, null) }, { id: "cancel" /* LoadAction.Cancel */, label: localize(12238, null) });
                loadingQuickPick.items = items;
            }
            else {
                loadingQuickPick.title = localize(12239, null, result.name ?? packageName, result.version ? `@${result.version}` : '', result.publisher);
                loadingQuickPick.items = [
                    { id: "allow" /* LoadAction.Allow */, label: localize(12240, null) },
                    { id: "cancel" /* LoadAction.Cancel */, label: localize(12241, null) }
                ];
            }
            loadingQuickPick.busy = false;
        });
        const loadingAction = await new Promise(resolve => {
            loadingQuickPickStore.add(loadingQuickPick.onDidAccept(() => resolve(loadingQuickPick.selectedItems[0])));
            loadingQuickPickStore.add(loadingQuickPick.onDidHide(() => resolve(undefined)));
            loadingQuickPick.show();
        }).finally(() => loadingQuickPickStore.dispose());
        switch (loadingAction?.id) {
            case "retry" /* LoadAction.Retry */:
                return this.getAssistedConfig(type);
            case "openUri" /* LoadAction.OpenUri */:
                if (loadingAction.helpUri) {
                    this._openerService.open(loadingAction.helpUri);
                }
                return undefined;
            case "allow" /* LoadAction.Allow */:
                break;
            case "cancel" /* LoadAction.Cancel */:
            default:
                return undefined;
        }
        const config = await this._commandService.executeCommand("github.copilot.chat.mcp.setup.flow" /* AddConfigurationCopilotCommand.StartFlow */, {
            name: packageName,
            type: packageType
        });
        if (config?.type === 'mapped') {
            return {
                name: config.name,
                server: config.server,
                inputs: config.inputs,
            };
        }
        else if (config?.type === 'assisted' || !config?.type) {
            return config;
        }
        else {
            assertNever(config?.type);
        }
    }
    /** Shows the location of a server config once it's discovered. */
    showOnceDiscovered(name) {
        const store = new DisposableStore();
        store.add(autorun(reader => {
            const colls = this._mcpRegistry.collections.read(reader);
            const servers = this._mcpService.servers.read(reader);
            const match = mapFindFirst(colls, collection => mapFindFirst(collection.serverDefinitions.read(reader), server => server.label === name ? { server, collection } : undefined));
            const server = match && servers.find(s => s.definition.id === match.server.id);
            if (match && server) {
                if (match.collection.presentation?.origin) {
                    this._editorService.openEditor({
                        resource: match.collection.presentation.origin,
                        options: {
                            selection: match.server.presentation?.origin?.range,
                            preserveFocus: true,
                        }
                    });
                }
                else {
                    this._commandService.executeCommand("workbench.mcp.serverOptions" /* McpCommandIds.ServerOptions */, name);
                }
                server.start({ promptType: 'all-untrusted' }).then(state => {
                    if (state.state === 3 /* McpConnectionState.Kind.Error */) {
                        server.showOutput();
                    }
                });
                store.dispose();
            }
        }));
        store.add(disposableTimeout(() => store.dispose(), 5000));
    }
    async run() {
        // Step 1: Choose server type
        const serverType = await this.getServerType();
        if (serverType === undefined) {
            return;
        }
        // Step 2: Get server details based on type
        let config;
        let suggestedName;
        let inputs;
        let inputValues;
        switch (serverType) {
            case 0 /* AddConfigurationType.Stdio */:
                config = await this.getStdioConfig();
                break;
            case 1 /* AddConfigurationType.HTTP */:
                config = await this.getSSEConfig();
                break;
            case 2 /* AddConfigurationType.NpmPackage */:
            case 3 /* AddConfigurationType.PipPackage */:
            case 4 /* AddConfigurationType.NuGetPackage */:
            case 5 /* AddConfigurationType.DockerImage */: {
                const r = await this.getAssistedConfig(serverType);
                config = r?.server ? { ...r.server, type: "stdio" /* McpServerType.LOCAL */ } : undefined;
                suggestedName = r?.name;
                inputs = r?.inputs;
                inputValues = r?.inputValues;
                break;
            }
            default:
                assertNever(serverType);
        }
        if (!config) {
            return;
        }
        // Step 3: Get server ID
        const name = await this.getServerId(suggestedName);
        if (!name) {
            return;
        }
        // Step 4: Choose configuration target if no configUri provided
        let target = this.workspaceFolder;
        if (!target) {
            target = await this.getConfigurationTarget();
            if (!target) {
                return;
            }
        }
        await this._mcpManagementService.install({ name, config, inputs }, { target });
        if (inputValues) {
            for (const [key, value] of Object.entries(inputValues)) {
                await this._mcpRegistry.setSavedInput(key, (isWorkspaceFolder(target) ? 6 /* ConfigurationTarget.WORKSPACE_FOLDER */ : target) ?? 5 /* ConfigurationTarget.WORKSPACE */, value);
            }
        }
        const packageType = this.getPackageType(serverType);
        if (packageType) {
            this._telemetryService.publicLog2('mcp.addserver.completed', {
                packageType,
                serverType: config.type,
                target: target === 5 /* ConfigurationTarget.WORKSPACE */ ? 'workspace' : 'user'
            });
        }
        this.showOnceDiscovered(name);
    }
    async pickForUrlHandler(resource, showIsPrimary = false) {
        const name = decodeURIComponent(basename(resource)).replace(/\.json$/, '');
        const placeHolder = localize(12242, null, name);
        const items = [
            { id: 'install', label: localize(12243, null) },
            { id: 'show', label: localize(12244, null, name) },
            { id: 'rename', label: localize(12245, null, name) },
            { id: 'cancel', label: localize(12246, null) },
        ];
        if (showIsPrimary) {
            [items[0], items[1]] = [items[1], items[0]];
        }
        const pick = await this._quickInputService.pick(items, { placeHolder, ignoreFocusLost: true });
        const getEditors = () => this._editorService.findEditors(resource);
        switch (pick?.id) {
            case 'show':
                await this._editorService.openEditor({ resource });
                break;
            case 'install':
                await this._editorService.save(getEditors());
                try {
                    const contents = await this._fileService.readFile(resource);
                    const { inputs, ...config } = parseJsonc(contents.value.toString());
                    await this._mcpManagementService.install({ name, config, inputs });
                    this._editorService.closeEditors(getEditors());
                    this.showOnceDiscovered(name);
                }
                catch (e) {
                    this._notificationService.error(localize(12247, null, name, e.message));
                    await this._editorService.openEditor({ resource });
                }
                break;
            case 'rename': {
                const newName = await this._quickInputService.input({ placeHolder: localize(12248, null), value: name });
                if (newName) {
                    const newURI = resource.with({ path: `/${encodeURIComponent(newName)}.json` });
                    await this._editorService.save(getEditors());
                    await this._fileService.move(resource, newURI);
                    return this.pickForUrlHandler(newURI, showIsPrimary);
                }
                break;
            }
        }
    }
    getPackageType(serverType) {
        switch (serverType) {
            case 2 /* AddConfigurationType.NpmPackage */:
                return 'npm';
            case 3 /* AddConfigurationType.PipPackage */:
                return 'pip';
            case 4 /* AddConfigurationType.NuGetPackage */:
                return 'nuget';
            case 5 /* AddConfigurationType.DockerImage */:
                return 'docker';
            case 0 /* AddConfigurationType.Stdio */:
                return 'stdio';
            case 1 /* AddConfigurationType.HTTP */:
                return 'sse';
            default:
                return undefined;
        }
    }
};
McpAddConfigurationCommand = __decorate([
    __param(1, IQuickInputService),
    __param(2, IWorkbenchMcpManagementService),
    __param(3, IWorkspaceContextService),
    __param(4, IWorkbenchEnvironmentService),
    __param(5, ICommandService),
    __param(6, IMcpRegistry),
    __param(7, IOpenerService),
    __param(8, IEditorService),
    __param(9, IFileService),
    __param(10, INotificationService),
    __param(11, ITelemetryService),
    __param(12, IMcpService),
    __param(13, ILabelService),
    __param(14, IConfigurationService)
], McpAddConfigurationCommand);
export { McpAddConfigurationCommand };
let McpInstallFromManifestCommand = class McpInstallFromManifestCommand {
    constructor(_fileDialogService, _fileService, _quickInputService, _notificationService, _mcpManagementService, _logService) {
        this._fileDialogService = _fileDialogService;
        this._fileService = _fileService;
        this._quickInputService = _quickInputService;
        this._notificationService = _notificationService;
        this._mcpManagementService = _mcpManagementService;
        this._logService = _logService;
    }
    async run() {
        // Step 1: Open file dialog to select the manifest file
        const result = await this._fileDialogService.showOpenDialog({
            title: localize(12249, null),
            filters: [{ name: localize(12250, null), extensions: ['json'] }],
            canSelectFiles: true,
            canSelectMany: false,
            openLabel: localize(12251, null)
        });
        if (!result?.[0]) {
            return;
        }
        const manifestUri = result[0];
        // Step 2: Read and parse the manifest file
        let manifest;
        try {
            const contents = await this._fileService.readFile(manifestUri);
            manifest = parseJsonc(contents.value.toString());
        }
        catch (e) {
            this._notificationService.error(localize(12252, null, e.message));
            return;
        }
        if (!manifest || typeof manifest !== 'object') {
            this._notificationService.error(localize(12253, null));
            return;
        }
        // Step 3: Validate and extract configuration from gallery manifest
        const galleryManifest = manifest;
        // Determine package type from manifest
        let packageType;
        if (Array.isArray(galleryManifest.packages) && galleryManifest.packages.length > 0) {
            packageType = galleryManifest.packages[0].registryType;
        }
        else if (Array.isArray(galleryManifest.remotes) && galleryManifest.remotes.length > 0) {
            packageType = "remote" /* RegistryType.REMOTE */;
        }
        else {
            this._notificationService.error(localize(12254, null));
            return;
        }
        let config;
        let inputs;
        try {
            const { mcpServerConfiguration, notices } = this._mcpManagementService.getMcpServerConfigurationFromManifest(galleryManifest, packageType);
            config = mcpServerConfiguration.config;
            inputs = mcpServerConfiguration.inputs;
            if (notices.length > 0) {
                this._logService.warn(`MCP Management Service: Warnings while installing the MCP server from ${manifestUri.path}`, notices);
            }
        }
        catch (e) {
            this._notificationService.error(localize(12255, null, e.message));
            return;
        }
        // Step 4: Get server name from manifest or prompt user
        let name = galleryManifest.name;
        if (!name) {
            name = await this._quickInputService.input({
                title: localize(12256, null),
                placeHolder: localize(12257, null),
                value: basename(manifestUri).replace(/\.json$/i, ''),
                ignoreFocusLost: true,
            });
            if (!name) {
                return;
            }
        }
        // Step 5: Install to user settings
        try {
            await this._mcpManagementService.install({ name, config, inputs });
            this._notificationService.info(localize(12258, null, name));
        }
        catch (e) {
            this._notificationService.error(localize(12259, null, e.message));
        }
    }
};
McpInstallFromManifestCommand = __decorate([
    __param(0, IFileDialogService),
    __param(1, IFileService),
    __param(2, IQuickInputService),
    __param(3, INotificationService),
    __param(4, IWorkbenchMcpManagementService),
    __param(5, ILogService)
], McpInstallFromManifestCommand);
export { McpInstallFromManifestCommand };
//# sourceMappingURL=mcpCommandsAddConfiguration.js.map