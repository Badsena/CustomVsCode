/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { getTelemetryLevel } from '../../../../platform/telemetry/common/telemetryUtils.js';
/**
 * Determines if experiment properties will be set on telemetry events.
 * When true, TelemetryService should buffer events until setExperimentProperty is called.
 */
export function experimentsEnabled(configurationService, productService, environmentService) {
    return getTelemetryLevel(configurationService) === 3 /* TelemetryLevel.USAGE */ &&
        !!productService.tasConfig &&
        !environmentService.disableExperiments &&
        !environmentService.extensionTestsLocationURI &&
        !environmentService.enableSmokeTestDriver &&
        configurationService.getValue('workbench.enableExperiments') === true;
}
//# sourceMappingURL=workbenchTelemetryUtils.js.map