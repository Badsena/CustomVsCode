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
import { localize } from '../../../../nls.js';
import { $, addDisposableListener, EventType } from '../../../../base/browser/dom.js';
import { renderIcon } from '../../../../base/browser/ui/iconLabel/iconLabels.js';
import { Codicon } from '../../../../base/common/codicons.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { IHoverService } from '../../../../platform/hover/browser/hover.js';
/**
 * Widget that displays site security information (e.g. certificate errors)
 * as an indicator button inside the URL bar, with a hover popover for details.
 */
let SiteInfoWidget = class SiteInfoWidget extends Disposable {
    constructor(parent, editor, hoverService) {
        super();
        this.editor = editor;
        this.hoverService = hoverService;
        this._container = $('.browser-site-info-container');
        this._container.style.display = 'none';
        this._indicator = $('.browser-site-info-indicator');
        this._indicator.tabIndex = 0;
        this._indicator.role = 'button';
        this._indicator.ariaLabel = localize(5597, null);
        this._indicator.appendChild(renderIcon(Codicon.workspaceUntrusted));
        this._container.appendChild(this._indicator);
        parent.appendChild(this._container);
        this._register(addDisposableListener(this._indicator, EventType.CLICK, () => this._showHover()));
        this._register(addDisposableListener(this._indicator, EventType.KEY_DOWN, (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                this._showHover();
            }
        }));
    }
    /**
     * Update visibility and state from a certificate error (or lack thereof).
     */
    setCertificateError(certError) {
        this._container.style.display = certError ? '' : 'none';
    }
    _showHover() {
        const certError = this.editor.getCertificateError();
        if (!certError) {
            return;
        }
        const content = document.createElement('div');
        content.classList.add('browser-site-info-hover-content');
        const heading = document.createElement('div');
        heading.classList.add('browser-site-info-hover-heading');
        heading.textContent = localize(5598, null);
        content.appendChild(heading);
        const detail1 = document.createElement('div');
        detail1.classList.add('browser-site-info-hover-detail');
        detail1.textContent = localize(5599, null);
        content.appendChild(detail1);
        if (certError.hasTrustedException) {
            const detail2 = document.createElement('div');
            detail2.classList.add('browser-site-info-hover-detail');
            detail2.textContent = localize(5600, null, certError.host, certError.error);
            content.appendChild(detail2);
            const revokeLink = document.createElement('a');
            revokeLink.classList.add('browser-site-info-hover-revoke');
            revokeLink.textContent = localize(5601, null);
            revokeLink.role = 'button';
            revokeLink.tabIndex = 0;
            revokeLink.addEventListener('click', () => {
                hover?.dispose();
                this.editor.revokeAndClose(certError);
            });
            revokeLink.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    hover?.dispose();
                    this.editor.revokeAndClose(certError);
                }
            });
            content.appendChild(revokeLink);
        }
        const hover = this.hoverService.showInstantHover({
            content,
            target: this._indicator,
            container: this._container,
            position: { hoverPosition: 2 /* HoverPosition.BELOW */ },
            persistence: { sticky: true }
        }, true);
    }
};
SiteInfoWidget = __decorate([
    __param(2, IHoverService)
], SiteInfoWidget);
export { SiteInfoWidget };
//# sourceMappingURL=siteInfoWidget.js.map