/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { ExtensionIdentifier } from '../../../../../platform/extensions/common/extensions.js';
import product from '../../../../../platform/product/common/product.js';
import { localize } from '../../../../../nls.js';
const defaultChat = {
    completionsRefreshTokenCommand: product.defaultChatAgent?.completionsRefreshTokenCommand ?? '',
    chatRefreshTokenCommand: product.defaultChatAgent?.chatRefreshTokenCommand ?? '',
    providerExtensionId: product.defaultChatAgent?.providerExtensionId ?? '',
};
export var ChatSetupAnonymous;
(function (ChatSetupAnonymous) {
    ChatSetupAnonymous[ChatSetupAnonymous["Disabled"] = 0] = "Disabled";
    ChatSetupAnonymous[ChatSetupAnonymous["EnabledWithDialog"] = 1] = "EnabledWithDialog";
    ChatSetupAnonymous[ChatSetupAnonymous["EnabledWithoutDialog"] = 2] = "EnabledWithoutDialog";
})(ChatSetupAnonymous || (ChatSetupAnonymous = {}));
export var ChatSetupStep;
(function (ChatSetupStep) {
    ChatSetupStep[ChatSetupStep["Initial"] = 1] = "Initial";
    ChatSetupStep[ChatSetupStep["SigningIn"] = 2] = "SigningIn";
    ChatSetupStep[ChatSetupStep["Installing"] = 3] = "Installing";
})(ChatSetupStep || (ChatSetupStep = {}));
export var ChatSetupStrategy;
(function (ChatSetupStrategy) {
    ChatSetupStrategy[ChatSetupStrategy["Canceled"] = 0] = "Canceled";
    ChatSetupStrategy[ChatSetupStrategy["DefaultSetup"] = 1] = "DefaultSetup";
    ChatSetupStrategy[ChatSetupStrategy["SetupWithoutEnterpriseProvider"] = 2] = "SetupWithoutEnterpriseProvider";
    ChatSetupStrategy[ChatSetupStrategy["SetupWithEnterpriseProvider"] = 3] = "SetupWithEnterpriseProvider";
    ChatSetupStrategy[ChatSetupStrategy["SetupWithGoogleProvider"] = 4] = "SetupWithGoogleProvider";
    ChatSetupStrategy[ChatSetupStrategy["SetupWithAppleProvider"] = 5] = "SetupWithAppleProvider";
})(ChatSetupStrategy || (ChatSetupStrategy = {}));
export function refreshTokens(commandService) {
    // ugly, but we need to signal to the extension that entitlements changed
    commandService.executeCommand(defaultChat.completionsRefreshTokenCommand);
    commandService.executeCommand(defaultChat.chatRefreshTokenCommand);
}
/**
 * Ensures the authentication provider extension is enabled.
 * If the extension is found locally but disabled, it will be
 * re-enabled and running extensions will be updated.
 *
 * @returns `true` if the extension was re-enabled, `false` otherwise.
 */
export async function maybeEnableAuthExtension(extensionsWorkbenchService, logService) {
    if (!defaultChat.providerExtensionId) {
        return false;
    }
    const providerExtension = extensionsWorkbenchService.local.find(e => ExtensionIdentifier.equals(e.identifier.id, defaultChat.providerExtensionId));
    if (!providerExtension) {
        return false;
    }
    if (providerExtension.enablementState === 10 /* EnablementState.DisabledGlobally */ ||
        providerExtension.enablementState === 11 /* EnablementState.DisabledWorkspace */) {
        logService.info(`[chat setup] auth provider extension '${defaultChat.providerExtensionId}' is disabled, re-enabling it`);
        try {
            await extensionsWorkbenchService.setEnablement([providerExtension], 12 /* EnablementState.EnabledGlobally */);
            await extensionsWorkbenchService.updateRunningExtensions(localize(7361, null));
            return true;
        }
        catch (error) {
            logService.error(`[chat setup] failed to re-enable auth provider extension '${defaultChat.providerExtensionId}'`, error);
            return false;
        }
    }
    return false;
}
//# sourceMappingURL=chatSetup.js.map