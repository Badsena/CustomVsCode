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
import { reset } from '../../../../base/browser/dom.js';
import { Codicon } from '../../../../base/common/codicons.js';
import { MarkdownString } from '../../../../base/common/htmlContent.js';
import { Disposable, MutableDisposable } from '../../../../base/common/lifecycle.js';
import { autorun } from '../../../../base/common/observable.js';
import { localize } from '../../../../nls.js';
import { IMarkdownRendererService } from '../../../../platform/markdown/browser/markdownRenderer.js';
/**
 * A small reusable widget that renders an enablement status message inside
 * a `.status` container, matching the style used by the extension and MCP
 * server editors. The message is shown only when the contribution is
 * disabled and is rendered as markdown with a theme icon prefix.
 */
let EnablementStatusWidget = class EnablementStatusWidget extends Disposable {
    constructor(_container, enablement, _labels, _markdownRendererService) {
        super();
        this._container = _container;
        this._labels = _labels;
        this._markdownRendererService = _markdownRendererService;
        this._renderDisposables = this._register(new MutableDisposable());
        this._register(autorun(reader => {
            this._render(enablement.read(reader));
        }));
    }
    _render(state) {
        reset(this._container);
        this._renderDisposables.value = undefined;
        let message;
        if (state === 0 /* ContributionEnablementState.DisabledProfile */) {
            message = this._labels.disabledProfile;
        }
        else if (state === 1 /* ContributionEnablementState.DisabledWorkspace */) {
            message = this._labels.disabledWorkspace;
        }
        if (!message) {
            return;
        }
        const markdown = new MarkdownString('', { isTrusted: true, supportThemeIcons: true });
        markdown.appendMarkdown(`$(${Codicon.info.id})&nbsp;`);
        markdown.appendText(message);
        const rendered = this._markdownRendererService.render(markdown);
        this._renderDisposables.value = rendered;
        this._container.appendChild(rendered.element);
    }
};
EnablementStatusWidget = __decorate([
    __param(3, IMarkdownRendererService)
], EnablementStatusWidget);
export { EnablementStatusWidget };
/** Default labels for plugin enablement status. */
export const pluginEnablementLabels = {
    disabledProfile: localize(7566, null),
    disabledWorkspace: localize(7567, null),
};
/** Default labels for MCP server enablement status. */
export const mcpServerEnablementLabels = {
    disabledProfile: localize(7568, null),
    disabledWorkspace: localize(7569, null),
};
//# sourceMappingURL=enablementStatusWidget.js.map