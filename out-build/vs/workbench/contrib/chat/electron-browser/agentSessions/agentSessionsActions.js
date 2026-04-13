import { localize2 } from '../../../../../nls.js';
import { Action2 } from '../../../../../platform/actions/common/actions.js';
import { ContextKeyExpr } from '../../../../../platform/contextkey/common/contextkey.js';
import { INativeHostService } from '../../../../../platform/native/common/native.js';
import { ChatEntitlementContextKeys } from '../../../../services/chat/common/chatEntitlementService.js';
import { CHAT_CATEGORY } from '../../browser/actions/chatActions.js';
import { ProductQualityContext } from '../../../../../platform/contextkey/common/contextkeys.js';
import { IsSessionsWindowContext } from '../../../../common/contextkeys.js';
import { IOpenerService } from '../../../../../platform/opener/common/opener.js';
import { IProductService } from '../../../../../platform/product/common/productService.js';
import { URI } from '../../../../../base/common/uri.js';
import { isMacintosh, isWindows } from '../../../../../base/common/platform.js';
import { IWorkbenchEnvironmentService } from '../../../../services/environment/common/environmentService.js';
import { Schemas } from '../../../../../base/common/network.js';
export class OpenSessionsWindowAction extends Action2 {
    constructor() {
        super({
            id: 'workbench.action.openSessionsWindow',
            title: localize2(9020, "Open Sessions Window"),
            category: CHAT_CATEGORY,
            precondition: ContextKeyExpr.and(ProductQualityContext.notEqualsTo('stable'), ChatEntitlementContextKeys.Setup.hidden.negate(), IsSessionsWindowContext.negate()),
            f1: true,
        });
    }
    async run(accessor) {
        const openerService = accessor.get(IOpenerService);
        const productService = accessor.get(IProductService);
        const environmentService = accessor.get(IWorkbenchEnvironmentService);
        if (environmentService.isBuilt && (isMacintosh || isWindows)) {
            const scheme = productService.quality === 'stable'
                ? 'vscode-sessions'
                : productService.quality === 'exploration'
                    ? 'vscode-sessions-exploration'
                    : 'vscode-sessions-insiders';
            await openerService.open(URI.from({ scheme, authority: Schemas.file }), { openExternal: true });
        }
        else {
            const nativeHostService = accessor.get(INativeHostService);
            await nativeHostService.openSessionsWindow();
        }
    }
}
//# sourceMappingURL=agentSessionsActions.js.map