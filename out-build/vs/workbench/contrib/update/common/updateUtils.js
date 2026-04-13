/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { localize } from '../../../../nls.js';
/**
 * Returns the progress percentage based on the current and maximum progress values.
 */
export function computeProgressPercent(current, max) {
    if (current === undefined || max === undefined || max <= 0) {
        return undefined;
    }
    return Math.max(Math.min(Math.round((current / max) * 100), 100), 0);
}
/**
 * Computes an estimate of remaining download time in seconds.
 */
export function computeDownloadTimeRemaining(state) {
    const { downloadedBytes, totalBytes, startTime } = state;
    if (downloadedBytes === undefined || totalBytes === undefined || startTime === undefined) {
        return undefined;
    }
    const elapsedMs = Date.now() - startTime;
    if (downloadedBytes <= 0 || totalBytes <= 0 || elapsedMs <= 0) {
        return undefined;
    }
    const remainingBytes = totalBytes - downloadedBytes;
    if (remainingBytes <= 0) {
        return 0;
    }
    const bytesPerMs = downloadedBytes / elapsedMs;
    if (bytesPerMs <= 0) {
        return undefined;
    }
    const remainingMs = remainingBytes / bytesPerMs;
    return Math.ceil(remainingMs / 1000);
}
/**
 * Computes the current download speed in bytes per second.
 */
export function computeDownloadSpeed(state) {
    const { downloadedBytes, startTime } = state;
    if (downloadedBytes === undefined || startTime === undefined) {
        return undefined;
    }
    const elapsedMs = Date.now() - startTime;
    if (elapsedMs <= 0 || downloadedBytes <= 0) {
        return undefined;
    }
    return (downloadedBytes / elapsedMs) * 1000;
}
/**
 * Computes the version to use for fetching update info.
 * - If the minor version differs: returns `{major}.{minor}` (e.g., 1.108.2 -> 1.109.5 => 1.109)
 * - If the same minor: returns the target version as-is (e.g., 1.109.2 -> 1.109.5 => 1.109.5)
 */
export function computeUpdateInfoVersion(currentVersion, targetVersion) {
    const current = tryParseVersion(currentVersion);
    const target = tryParseVersion(targetVersion);
    if (!current || !target) {
        return undefined;
    }
    if (current.minor !== target.minor || current.major !== target.major) {
        return `${target.major}.${target.minor}`;
    }
    return `${target.major}.${target.minor}.${target.patch}`;
}
/**
 * Computes the URL to fetch update info from.
 * Follows the release notes URL pattern but with `_update` suffix.
 */
export function getUpdateInfoUrl(version) {
    const versionLabel = version.replace(/\./g, '_').replace(/_0$/, '');
    return `https://code.visualstudio.com/raw/v${versionLabel}_update.md`;
}
/**
 * Formats the time remaining as a human-readable string.
 */
export function formatTimeRemaining(seconds) {
    const hours = seconds / 3600;
    if (hours >= 1) {
        const formattedHours = formatDecimal(hours);
        if (formattedHours === '1') {
            return localize(16965, null, formattedHours);
        }
        else {
            return localize(16966, null, formattedHours);
        }
    }
    const minutes = Math.floor(seconds / 60);
    if (minutes >= 1) {
        return localize(16967, null, minutes);
    }
    return localize(16968, null, seconds);
}
/**
 * Formats a byte count as a human-readable string.
 */
export function formatBytes(bytes) {
    if (bytes < 1024) {
        return localize(16969, null, bytes);
    }
    const kb = bytes / 1024;
    if (kb < 1024) {
        return localize(16970, null, formatDecimal(kb));
    }
    const mb = kb / 1024;
    if (mb < 1024) {
        return localize(16971, null, formatDecimal(mb));
    }
    const gb = mb / 1024;
    return localize(16972, null, formatDecimal(gb));
}
/**
 * Tries to parse a date string and returns the timestamp or undefined if parsing fails.
 */
export function tryParseDate(date) {
    if (date === undefined) {
        return undefined;
    }
    try {
        const parsed = Date.parse(date);
        return isNaN(parsed) ? undefined : parsed;
    }
    catch {
        return undefined;
    }
}
/**
 * Formats a timestamp as a localized date string.
 */
export function formatDate(timestamp) {
    return new Date(timestamp).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}
/**
 * Formats a number to 1 decimal place, omitting ".0" for whole numbers.
 */
export function formatDecimal(value) {
    const rounded = Math.round(value * 10) / 10;
    return rounded % 1 === 0 ? rounded.toString() : rounded.toFixed(1);
}
/**
 * Parses a version string in the format "major.minor.patch" and returns an object with the components.
 */
export function tryParseVersion(version) {
    if (version === undefined) {
        return undefined;
    }
    const match = /^(\d{1,10})\.(\d{1,10})\.(\d{1,10})/.exec(version);
    if (!match) {
        return undefined;
    }
    try {
        return {
            major: parseInt(match[1]),
            minor: parseInt(match[2]),
            patch: parseInt(match[3])
        };
    }
    catch {
        return undefined;
    }
}
/**
 * Processes an error message and returns a user-friendly version of it, or undefined if the error should be ignored.
 */
export function preprocessError(error) {
    if (!error) {
        return undefined;
    }
    if (/The request timed out|The network connection was lost/i.test(error)) {
        return undefined;
    }
    return error.replace(/See https:\/\/github\.com\/Squirrel\/Squirrel\.Mac\/issues\/182 for more information/, 'This might mean the application was put on quarantine by macOS. See [this link](https://github.com/microsoft/vscode/issues/7426#issuecomment-425093469) for more information');
}
/**
 * Determines whether there is a major or minor version change between two versions.
 */
export function isMajorMinorVersionChange(previousVersion, newVersion) {
    const previous = tryParseVersion(previousVersion);
    const current = tryParseVersion(newVersion);
    return !!previous && !!current && (previous.major !== current.major || previous.minor !== current.minor);
}
//# sourceMappingURL=updateUtils.js.map