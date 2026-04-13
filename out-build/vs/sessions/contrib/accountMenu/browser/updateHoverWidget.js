/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { localize } from '../../../../nls.js';
import './media/updateHoverWidget.css';
export class UpdateHoverWidget {
    constructor(updateService, productService, hoverService) {
        this.updateService = updateService;
        this.productService = productService;
        this.hoverService = hoverService;
    }
    attachTo(target) {
        return this.hoverService.setupDelayedHover(target, () => ({
            content: this.createHoverContent(),
            position: { hoverPosition: 1 /* HoverPosition.RIGHT */ },
            appearance: { showPointer: true }
        }), { groupId: 'sessions-account-update' });
    }
    createHoverContent(state = this.updateService.state) {
        const update = this.getUpdateFromState(state);
        const currentVersion = this.productService.version ?? localize(2983, null);
        const targetVersion = update?.productVersion ?? update?.version ?? localize(2984, null);
        const currentCommit = this.productService.commit;
        const targetCommit = update?.version;
        const progressPercent = this.getUpdateProgressPercent(state);
        const container = document.createElement('div');
        container.classList.add('sessions-update-hover');
        // Header: e.g. "Downloading VS Code Insiders"
        const header = document.createElement('div');
        header.classList.add('sessions-update-hover-header');
        header.textContent = this.getUpdateHeaderLabel(state.type);
        container.appendChild(header);
        // Progress bar
        if (progressPercent !== undefined) {
            const progressTrack = document.createElement('div');
            progressTrack.classList.add('sessions-update-hover-progress-track');
            const progressFill = document.createElement('div');
            progressFill.classList.add('sessions-update-hover-progress-fill');
            progressFill.style.width = `${progressPercent}%`;
            progressTrack.appendChild(progressFill);
            container.appendChild(progressTrack);
        }
        // Version info grid
        const detailsGrid = document.createElement('div');
        detailsGrid.classList.add('sessions-update-hover-grid');
        const currentDate = this.productService.date ? new Date(this.productService.date) : undefined;
        const currentAge = currentDate ? this.formatCompactAge(currentDate.getTime()) : undefined;
        const newAge = update?.timestamp ? this.formatCompactAge(update.timestamp) : undefined;
        this.appendGridRow(detailsGrid, localize(2985, null), currentVersion, currentAge, currentCommit);
        this.appendGridRow(detailsGrid, localize(2986, null), targetVersion, newAge, targetCommit);
        container.appendChild(detailsGrid);
        return container;
    }
    appendGridRow(grid, label, version, age, commit) {
        const labelEl = document.createElement('span');
        labelEl.classList.add('sessions-update-hover-label');
        labelEl.textContent = label;
        grid.appendChild(labelEl);
        const versionEl = document.createElement('span');
        versionEl.classList.add('sessions-update-hover-version');
        versionEl.textContent = version;
        grid.appendChild(versionEl);
        const ageEl = document.createElement('span');
        ageEl.classList.add('sessions-update-hover-age');
        ageEl.textContent = age ?? '';
        grid.appendChild(ageEl);
        const commitEl = document.createElement('span');
        commitEl.classList.add('sessions-update-hover-commit');
        commitEl.textContent = commit ? commit.substring(0, 7) : '';
        grid.appendChild(commitEl);
    }
    formatCompactAge(timestamp) {
        const seconds = Math.round((Date.now() - timestamp) / 1000);
        if (seconds < 60) {
            return localize(2987, null);
        }
        const minutes = Math.round(seconds / 60);
        if (minutes < 60) {
            return localize(2988, null, minutes);
        }
        const hours = Math.round(seconds / 3600);
        if (hours < 24) {
            return localize(2989, null, hours);
        }
        const days = Math.round(seconds / 86400);
        if (days < 7) {
            return localize(2990, null, days);
        }
        const weeks = Math.round(days / 7);
        if (weeks < 5) {
            return localize(2991, null, weeks);
        }
        const months = Math.round(days / 30);
        return localize(2992, null, months);
    }
    getUpdateFromState(state) {
        switch (state.type) {
            case "available for download" /* StateType.AvailableForDownload */:
            case "downloaded" /* StateType.Downloaded */:
            case "ready" /* StateType.Ready */:
            case "overwriting" /* StateType.Overwriting */:
            case "updating" /* StateType.Updating */:
                return state.update;
            case "downloading" /* StateType.Downloading */:
                return state.update;
            default:
                return undefined;
        }
    }
    /**
     * Returns progress as a percentage (0-100), or undefined if progress is not applicable.
     */
    getUpdateProgressPercent(state) {
        switch (state.type) {
            case "downloading" /* StateType.Downloading */: {
                const downloadingState = state;
                if (downloadingState.downloadedBytes !== undefined && downloadingState.totalBytes && downloadingState.totalBytes > 0) {
                    return Math.min(100, Math.round((downloadingState.downloadedBytes / downloadingState.totalBytes) * 100));
                }
                return 0;
            }
            case "updating" /* StateType.Updating */: {
                const updatingState = state;
                if (updatingState.currentProgress !== undefined && updatingState.maxProgress && updatingState.maxProgress > 0) {
                    return Math.min(100, Math.round((updatingState.currentProgress / updatingState.maxProgress) * 100));
                }
                return 0;
            }
            case "downloaded" /* StateType.Downloaded */:
            case "ready" /* StateType.Ready */:
                return 100;
            case "available for download" /* StateType.AvailableForDownload */:
            case "overwriting" /* StateType.Overwriting */:
                return 0;
            default:
                return undefined;
        }
    }
    getUpdateHeaderLabel(type) {
        const productName = this.productService.nameShort;
        switch (type) {
            case "ready" /* StateType.Ready */:
                return localize(2993, null, productName);
            case "available for download" /* StateType.AvailableForDownload */:
                return localize(2994, null, productName);
            case "downloading" /* StateType.Downloading */:
            case "overwriting" /* StateType.Overwriting */:
                return localize(2995, null, productName);
            case "downloaded" /* StateType.Downloaded */:
                return localize(2996, null, productName);
            case "updating" /* StateType.Updating */:
                return localize(2997, null, productName);
            default:
                return localize(2998, null, productName);
        }
    }
}
//# sourceMappingURL=updateHoverWidget.js.map