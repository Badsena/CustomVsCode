/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation.
 *--------------------------------------------------------------------------------------------*/

// 🚫 DISABLED — Chat Output Renderer removed in Amypo Coder

import { Disposable } from '../../../base/common/lifecycle.js';
import { IExtHostContext } from '../../services/extensions/common/extHostCustomers.js';
import { MainThreadChatOutputRendererShape } from '../common/extHost.protocol.js';

export class MainThreadChatOutputRenderer extends Disposable implements MainThreadChatOutputRendererShape {

	constructor(
		_extHostContext: IExtHostContext
	) {
		super();
		// no-op
	}

	override dispose(): void {
		super.dispose();
	}

	$registerChatOutputRenderer(): void {
		// no-op
	}

	$unregisterChatOutputRenderer(): void {
		// no-op
	}
}
