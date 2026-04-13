/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { localize, localize2 } from '../../../../nls.js';
import { Action2, registerAction2 } from '../../../../platform/actions/common/actions.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { METERED_CONNECTION_SETTING_KEY } from '../../../../platform/meteredConnection/common/meteredConnection.js';
import { IQuickInputService } from '../../../../platform/quickinput/common/quickInput.js';
import { registerWorkbenchContribution2 } from '../../../common/contributions.js';
import { MeteredConnectionStatusContribution } from './meteredConnectionStatus.js';
import '../../../../platform/meteredConnection/common/meteredConnection.config.contribution.js';
registerWorkbenchContribution2(MeteredConnectionStatusContribution.ID, MeteredConnectionStatusContribution, 3 /* WorkbenchPhase.AfterRestored */);
registerAction2(class ConfigureMeteredConnectionAction extends Action2 {
    static { this.ID = 'workbench.action.configureMeteredConnection'; }
    constructor() {
        super({
            id: ConfigureMeteredConnectionAction.ID,
            title: localize2(12728, 'Configure Metered Connection'),
            f1: true
        });
    }
    async run(accessor) {
        const quickInputService = accessor.get(IQuickInputService);
        const configurationService = accessor.get(IConfigurationService);
        const currentValue = configurationService.getValue(METERED_CONNECTION_SETTING_KEY);
        const picks = [
            {
                value: 'auto',
                label: localize(12721, null),
                description: localize(12722, null),
                picked: currentValue === 'auto'
            },
            {
                value: 'on',
                label: localize(12723, null),
                description: localize(12724, null),
                picked: currentValue === 'on'
            },
            {
                value: 'off',
                label: localize(12725, null),
                description: localize(12726, null),
                picked: currentValue === 'off'
            }
        ];
        const pick = await quickInputService.pick(picks, {
            placeHolder: localize(12727, null),
            activeItem: picks.find(p => p.picked)
        });
        if (pick) {
            await configurationService.updateValue(METERED_CONNECTION_SETTING_KEY, pick.value);
        }
    }
});
//# sourceMappingURL=meteredConnection.contribution.js.map