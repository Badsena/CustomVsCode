/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { createDecorator } from '../../../../../platform/instantiation/common/instantiation.js';
export const IChatAttachmentWidgetRegistry = createDecorator('chatAttachmentWidgetRegistry');
export class ChatAttachmentWidgetRegistry {
    constructor() {
        this._factories = new Map();
    }
    registerFactory(kind, factory) {
        this._factories.set(kind, factory);
        return {
            dispose: () => {
                if (this._factories.get(kind) === factory) {
                    this._factories.delete(kind);
                }
            }
        };
    }
    createWidget(attachment, options, container) {
        const factory = this._factories.get(attachment.kind);
        if (!factory) {
            return undefined;
        }
        return factory(attachment, options, container);
    }
}
//# sourceMappingURL=chatAttachmentWidgetRegistry.js.map