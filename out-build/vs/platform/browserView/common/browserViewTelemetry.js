/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
export function logBrowserOpen(telemetryService, source) {
    telemetryService.publicLog2('integratedBrowser.open', { source });
}
//# sourceMappingURL=browserViewTelemetry.js.map