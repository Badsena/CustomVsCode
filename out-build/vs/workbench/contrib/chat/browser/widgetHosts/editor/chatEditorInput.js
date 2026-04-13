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
var ChatEditorInput_1;
import { CancellationToken } from '../../../../../../base/common/cancellation.js';
import { Codicon } from '../../../../../../base/common/codicons.js';
import { Disposable, MutableDisposable } from '../../../../../../base/common/lifecycle.js';
import { revive } from '../../../../../../base/common/marshalling.js';
import { Schemas } from '../../../../../../base/common/network.js';
import { isEqual } from '../../../../../../base/common/resources.js';
import { truncate } from '../../../../../../base/common/strings.js';
import { ThemeIcon } from '../../../../../../base/common/themables.js';
import { URI } from '../../../../../../base/common/uri.js';
import * as nls from '../../../../../../nls.js';
import { IDialogService } from '../../../../../../platform/dialogs/common/dialogs.js';
import { IInstantiationService } from '../../../../../../platform/instantiation/common/instantiation.js';
import { registerIcon } from '../../../../../../platform/theme/common/iconRegistry.js';
import { EditorInput } from '../../../../../common/editor/editorInput.js';
import { IChatService } from '../../../common/chatService/chatService.js';
import { IChatSessionsService, localChatSessionType } from '../../../common/chatSessionsService.js';
import { ChatAgentLocation, ChatEditorTitleMaxLength } from '../../../common/constants.js';
import { LocalChatSessionUri, getChatSessionType } from '../../../common/model/chatUri.js';
const ChatEditorIcon = registerIcon('chat-editor-label-icon', Codicon.chatSparkle, nls.localize(8320, null));
let ChatEditorInput = class ChatEditorInput extends EditorInput {
    static { ChatEditorInput_1 = this; }
    static { this.TypeID = 'workbench.input.chatSession'; }
    static { this.EditorID = 'workbench.editor.chatSession'; }
    /**
     * Get the uri of the session this editor input is associated with.
     *
     * This should be preferred over using `resource` directly, as it handles cases where a chat editor becomes a session
     */
    get sessionResource() { return this._sessionResource; }
    get model() {
        return this.modelRef.value?.object;
    }
    static getNewEditorUri() {
        return ChatEditorUri.getNewEditorUri();
    }
    constructor(resource, options, chatService, dialogService, chatSessionsService, instantiationService) {
        super();
        this.resource = resource;
        this.options = options;
        this.chatService = chatService;
        this.dialogService = dialogService;
        this.chatSessionsService = chatSessionsService;
        this.instantiationService = instantiationService;
        this.didTransferOutEditingSession = false;
        this.modelRef = this._register(new MutableDisposable());
        this.closeHandler = this;
        if (resource.scheme === Schemas.vscodeChatEditor) {
            const parsed = ChatEditorUri.parse(resource);
            if (!parsed || typeof parsed !== 'number') {
                throw new Error('Invalid chat URI');
            }
        }
        else if (resource.scheme === Schemas.vscodeLocalChatSession) {
            const localSessionId = LocalChatSessionUri.parseLocalSessionId(resource);
            if (!localSessionId) {
                throw new Error('Invalid local chat session URI');
            }
            this._sessionResource = resource;
        }
        else {
            this._sessionResource = resource;
        }
    }
    showConfirm() {
        return !!(this.model && shouldShowClearEditingSessionConfirmation(this.model));
    }
    transferOutEditingSession() {
        this.didTransferOutEditingSession = true;
        return this.model?.editingSession;
    }
    async confirm(editors) {
        if (!this.model?.editingSession || this.didTransferOutEditingSession || this.getSessionType() !== localChatSessionType) {
            return 0 /* ConfirmResult.SAVE */;
        }
        const titleOverride = nls.localize(8321, null);
        const messageOverride = nls.localize(8322, null);
        const result = await showClearEditingSessionConfirmation(this.model, this.dialogService, { titleOverride, messageOverride });
        return result ? 0 /* ConfirmResult.SAVE */ : 2 /* ConfirmResult.CANCEL */;
    }
    get editorId() {
        return ChatEditorInput_1.EditorID;
    }
    get capabilities() {
        return super.capabilities | 1024 /* EditorInputCapabilities.ForceReveal */ | 128 /* EditorInputCapabilities.CanDropIntoEditor */;
    }
    copy() {
        return this.instantiationService.createInstance(ChatEditorInput_1, ChatEditorInput_1.getNewEditorUri(), {});
    }
    matches(otherInput) {
        if (!(otherInput instanceof ChatEditorInput_1)) {
            return false;
        }
        return isEqual(this.sessionResource, otherInput.sessionResource);
    }
    get typeId() {
        return ChatEditorInput_1.TypeID;
    }
    getName() {
        // If we have a resolved model, use its title
        if (this.model?.title) {
            // Only truncate if the default title is being used (don't truncate custom titles)
            return this.model.hasCustomTitle ? this.model.title : truncate(this.model.title, ChatEditorTitleMaxLength);
        }
        // If we have a sessionId but no resolved model, try to get the title from persisted sessions
        if (this._sessionResource) {
            // First try the active session registry
            const existingSession = this.chatService.getSession(this._sessionResource);
            if (existingSession?.title) {
                return existingSession.title;
            }
            // If not in active registry, try persisted session data
            const persistedTitle = this.chatService.getSessionTitle(this._sessionResource);
            if (persistedTitle && persistedTitle.trim()) { // Only use non-empty persisted titles
                return persistedTitle;
            }
        }
        // If a preferred title was provided in options, use it
        if (this.options.title?.preferred) {
            return this.options.title.preferred;
        }
        // Fall back to default naming pattern
        return this.options.title?.fallback ?? nls.localize(8323, null);
    }
    getTitle(verbosity) {
        const name = this.getName();
        if (verbosity === 2 /* Verbosity.LONG */) { // Verbosity LONG is used for tooltips
            const sessionTypeDisplayName = this.getSessionTypeDisplayName();
            if (sessionTypeDisplayName) {
                return `${name} | ${sessionTypeDisplayName}`;
            }
        }
        return name;
    }
    getSessionTypeDisplayName() {
        const sessionType = this.getSessionType();
        if (sessionType === localChatSessionType) {
            return;
        }
        const contributions = this.chatSessionsService.getAllChatSessionContributions();
        const contribution = contributions.find(c => c.type === sessionType);
        return contribution?.displayName;
    }
    getIcon() {
        const resolvedIcon = this.resolveIcon();
        if (resolvedIcon) {
            this.cachedIcon = resolvedIcon;
            return resolvedIcon;
        }
        // Fall back to default icon
        return ChatEditorIcon;
    }
    resolveIcon() {
        // TODO@osortega,@rebornix double check: Chat Session Item icon is reserved for chat session list and deprecated for chat session status. thus here we use session type icon. We may want to show status for the Editor Title.
        const sessionType = this.getSessionType();
        if (sessionType !== localChatSessionType) {
            return this.chatSessionsService.getChatSessionContribution(sessionType)?.icon;
        }
        return undefined;
    }
    /**
     * Returns chat session type from a URI, or {@linkcode localChatSessionType} if not specified or cannot be determined.
     */
    getSessionType() {
        return getChatSessionType(this.resource);
    }
    async resolve() {
        const searchParams = new URLSearchParams(this.resource.query);
        const chatSessionType = searchParams.get('chatSessionType');
        const inputType = chatSessionType ?? this.resource.authority;
        if (this._sessionResource) {
            this.modelRef.value = await this.chatService.acquireOrLoadSession(this._sessionResource, ChatAgentLocation.Chat, CancellationToken.None);
            // For local session only, if we find no existing session, create a new one
            if (!this.model && LocalChatSessionUri.parseLocalSessionId(this._sessionResource)) {
                this.modelRef.value = this.chatService.startNewLocalSession(ChatAgentLocation.Chat, { canUseTools: true });
            }
        }
        else if (!this.options.target) {
            this.modelRef.value = this.chatService.startNewLocalSession(ChatAgentLocation.Chat, { canUseTools: !inputType });
        }
        else if (this.options.target.data) {
            this.modelRef.value = this.chatService.loadSessionFromData(this.options.target.data);
        }
        if (!this.model || this.isDisposed()) {
            return null;
        }
        this._sessionResource = this.model.sessionResource;
        this._register(this.model.onDidChange((e) => {
            // Invalidate icon cache when label changes
            this.cachedIcon = undefined;
            this._onDidChangeLabel.fire();
        }));
        // Check if icon has changed after model resolution
        const newIcon = this.resolveIcon();
        if (newIcon && (!this.cachedIcon || !this.iconsEqual(this.cachedIcon, newIcon))) {
            this.cachedIcon = newIcon;
        }
        this._onDidChangeLabel.fire();
        return this._register(new ChatEditorModel(this.model));
    }
    iconsEqual(a, b) {
        if (ThemeIcon.isThemeIcon(a) && ThemeIcon.isThemeIcon(b)) {
            return a.id === b.id;
        }
        if (a instanceof URI && b instanceof URI) {
            return a.toString() === b.toString();
        }
        return false;
    }
};
ChatEditorInput = ChatEditorInput_1 = __decorate([
    __param(2, IChatService),
    __param(3, IDialogService),
    __param(4, IChatSessionsService),
    __param(5, IInstantiationService)
], ChatEditorInput);
export { ChatEditorInput };
export class ChatEditorModel extends Disposable {
    constructor(model) {
        super();
        this.model = model;
        this._isResolved = false;
    }
    async resolve() {
        this._isResolved = true;
    }
    isResolved() {
        return this._isResolved;
    }
    isDisposed() {
        return this._store.isDisposed;
    }
}
var ChatEditorUri;
(function (ChatEditorUri) {
    const scheme = Schemas.vscodeChatEditor;
    function getNewEditorUri() {
        const handle = Math.floor(Math.random() * 1e9);
        return URI.from({ scheme, path: `chat-${handle}` });
    }
    ChatEditorUri.getNewEditorUri = getNewEditorUri;
    function parse(resource) {
        if (resource.scheme !== scheme) {
            return undefined;
        }
        const match = resource.path.match(/chat-(\d+)/);
        const handleStr = match?.[1];
        if (typeof handleStr !== 'string') {
            return undefined;
        }
        const handle = parseInt(handleStr);
        if (isNaN(handle)) {
            return undefined;
        }
        return handle;
    }
    ChatEditorUri.parse = parse;
})(ChatEditorUri || (ChatEditorUri = {}));
export class ChatEditorInputSerializer {
    canSerialize(input) {
        return input instanceof ChatEditorInput && !!input.sessionResource;
    }
    serialize(input) {
        if (!this.canSerialize(input)) {
            return undefined;
        }
        const obj = {
            options: input.options,
            sessionResource: input.sessionResource,
            resource: input.resource,
        };
        return JSON.stringify(obj);
    }
    deserialize(instantiationService, serializedEditor) {
        try {
            // Old inputs have a session id for local session
            // Use revive to properly restore URIs and other special objects in options.target.data
            const parsed = revive(JSON.parse(serializedEditor));
            // First if we have a modern session resource, use that
            if (parsed.sessionResource) {
                const sessionResource = URI.revive(parsed.sessionResource);
                return instantiationService.createInstance(ChatEditorInput, sessionResource, parsed.options);
            }
            // Otherwise check to see if we're a chat editor with a local session id
            let resource = URI.revive(parsed.resource);
            if (resource.scheme === Schemas.vscodeChatEditor && parsed.sessionId) {
                resource = LocalChatSessionUri.forSession(parsed.sessionId);
            }
            return instantiationService.createInstance(ChatEditorInput, resource, parsed.options);
        }
        catch (err) {
            return undefined;
        }
    }
}
export async function showClearEditingSessionConfirmation(model, dialogService, options) {
    const undecidedEdits = shouldShowClearEditingSessionConfirmation(model, options);
    if (!undecidedEdits) {
        return true; // safe to dispose without confirmation
    }
    const defaultPhrase = nls.localize(8324, null);
    const defaultTitle = nls.localize(8325, null);
    const phrase = options?.messageOverride ?? defaultPhrase;
    const title = options?.titleOverride ?? defaultTitle;
    const { result } = await dialogService.prompt({
        title,
        message: phrase + ' ' + nls.localize(8326, null, undecidedEdits),
        type: 'info',
        cancelButton: true,
        buttons: [
            {
                label: nls.localize(8327, null),
                run: async () => {
                    await model.editingSession.accept();
                    return true;
                }
            },
            {
                label: nls.localize(8328, null),
                run: async () => {
                    await model.editingSession.reject();
                    return true;
                }
            }
        ],
    });
    return Boolean(result);
}
/** Returns the number of files in the  model's modifications that need a prompt before saving */
export function shouldShowClearEditingSessionConfirmation(model, options) {
    if (!model.editingSession || (model.willKeepAlive && !options?.isArchiveAction)) {
        return 0; // safe to dispose without confirmation
    }
    const currentEdits = model.editingSession.entries.get();
    const undecidedEdits = currentEdits.filter((edit) => edit.state.get() === 0 /* ModifiedFileEntryState.Modified */);
    return undecidedEdits.length;
}
//# sourceMappingURL=chatEditorInput.js.map