/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { localize } from '../../nls.js';
import { Lazy } from './lazy.js';
import { LANGUAGE_DEFAULT } from './platform.js';
const minute = 60;
const hour = minute * 60;
const day = hour * 24;
const week = day * 7;
const month = day * 30;
const year = day * 365;
/**
 * Create a localized difference of the time between now and the specified date.
 * @param date The date to generate the difference from.
 * @param appendAgoLabel Whether to append the " ago" to the end.
 * @param useFullTimeWords Whether to use full words (eg. seconds) instead of
 * shortened (eg. secs).
 * @param disallowNow Whether to disallow the string "now" when the difference
 * is less than 30 seconds.
 */
export function fromNow(date, appendAgoLabel, useFullTimeWords, disallowNow) {
    if (typeof date === 'undefined') {
        return localize(49, null);
    }
    if (typeof date !== 'number') {
        date = date.getTime();
    }
    const seconds = Math.round((new Date().getTime() - date) / 1000);
    if (seconds < -30) {
        return localize(50, null, fromNow(new Date().getTime() + seconds * 1000, false));
    }
    if (!disallowNow && seconds < 30) {
        return localize(51, null);
    }
    let value;
    if (seconds < minute) {
        value = seconds;
        if (appendAgoLabel) {
            if (value === 1) {
                return useFullTimeWords
                    ? localize(52, null, value)
                    : localize(53, null, value);
            }
            else {
                return useFullTimeWords
                    ? localize(54, null, value)
                    : localize(55, null, value);
            }
        }
        else {
            if (value === 1) {
                return useFullTimeWords
                    ? localize(56, null, value)
                    : localize(57, null, value);
            }
            else {
                return useFullTimeWords
                    ? localize(58, null, value)
                    : localize(59, null, value);
            }
        }
    }
    if (seconds < hour) {
        value = Math.round(seconds / minute);
        if (appendAgoLabel) {
            if (value === 1) {
                return useFullTimeWords
                    ? localize(60, null, value)
                    : localize(61, null, value);
            }
            else {
                return useFullTimeWords
                    ? localize(62, null, value)
                    : localize(63, null, value);
            }
        }
        else {
            if (value === 1) {
                return useFullTimeWords
                    ? localize(64, null, value)
                    : localize(65, null, value);
            }
            else {
                return useFullTimeWords
                    ? localize(66, null, value)
                    : localize(67, null, value);
            }
        }
    }
    if (seconds < day) {
        value = Math.round(seconds / hour);
        if (appendAgoLabel) {
            if (value === 1) {
                return useFullTimeWords
                    ? localize(68, null, value)
                    : localize(69, null, value);
            }
            else {
                return useFullTimeWords
                    ? localize(70, null, value)
                    : localize(71, null, value);
            }
        }
        else {
            if (value === 1) {
                return useFullTimeWords
                    ? localize(72, null, value)
                    : localize(73, null, value);
            }
            else {
                return useFullTimeWords
                    ? localize(74, null, value)
                    : localize(75, null, value);
            }
        }
    }
    if (seconds < week) {
        value = Math.round(seconds / day);
        if (appendAgoLabel) {
            return value === 1
                ? localize(76, null, value)
                : localize(77, null, value);
        }
        else {
            return value === 1
                ? localize(78, null, value)
                : localize(79, null, value);
        }
    }
    if (seconds < month) {
        value = Math.round(seconds / week);
        if (appendAgoLabel) {
            if (value === 1) {
                return useFullTimeWords
                    ? localize(80, null, value)
                    : localize(81, null, value);
            }
            else {
                return useFullTimeWords
                    ? localize(82, null, value)
                    : localize(83, null, value);
            }
        }
        else {
            if (value === 1) {
                return useFullTimeWords
                    ? localize(84, null, value)
                    : localize(85, null, value);
            }
            else {
                return useFullTimeWords
                    ? localize(86, null, value)
                    : localize(87, null, value);
            }
        }
    }
    if (seconds < year) {
        value = Math.round(seconds / month);
        if (appendAgoLabel) {
            if (value === 1) {
                return useFullTimeWords
                    ? localize(88, null, value)
                    : localize(89, null, value);
            }
            else {
                return useFullTimeWords
                    ? localize(90, null, value)
                    : localize(91, null, value);
            }
        }
        else {
            if (value === 1) {
                return useFullTimeWords
                    ? localize(92, null, value)
                    : localize(93, null, value);
            }
            else {
                return useFullTimeWords
                    ? localize(94, null, value)
                    : localize(95, null, value);
            }
        }
    }
    value = Math.round(seconds / year);
    if (appendAgoLabel) {
        if (value === 1) {
            return useFullTimeWords
                ? localize(96, null, value)
                : localize(97, null, value);
        }
        else {
            return useFullTimeWords
                ? localize(98, null, value)
                : localize(99, null, value);
        }
    }
    else {
        if (value === 1) {
            return useFullTimeWords
                ? localize(100, null, value)
                : localize(101, null, value);
        }
        else {
            return useFullTimeWords
                ? localize(102, null, value)
                : localize(103, null, value);
        }
    }
}
export function fromNowByDay(date, appendAgoLabel, useFullTimeWords) {
    if (typeof date !== 'number') {
        date = date.getTime();
    }
    const todayMidnightTime = new Date();
    todayMidnightTime.setHours(0, 0, 0, 0);
    const yesterdayMidnightTime = new Date(todayMidnightTime.getTime());
    yesterdayMidnightTime.setDate(yesterdayMidnightTime.getDate() - 1);
    if (date > todayMidnightTime.getTime()) {
        return localize(104, null);
    }
    if (date > yesterdayMidnightTime.getTime()) {
        return localize(105, null);
    }
    return fromNow(date, appendAgoLabel, useFullTimeWords);
}
/**
 * Gets a readable duration with intelligent/lossy precision. For example "40ms" or "3.040s")
 * @param ms The duration to get in milliseconds.
 * @param useFullTimeWords Whether to use full words (eg. seconds) instead of
 * shortened (eg. secs).
 */
export function getDurationString(ms, useFullTimeWords) {
    const seconds = Math.abs(ms / 1000);
    if (seconds < 1) {
        return useFullTimeWords
            ? localize(106, null, ms)
            : localize(107, null, ms);
    }
    if (seconds < minute) {
        return useFullTimeWords
            ? localize(108, null, Math.round(ms) / 1000)
            : localize(109, null, Math.round(ms) / 1000);
    }
    if (seconds < hour) {
        return useFullTimeWords
            ? localize(110, null, Math.round(ms / (1000 * minute)))
            : localize(111, null, Math.round(ms / (1000 * minute)));
    }
    if (seconds < day) {
        return useFullTimeWords
            ? localize(112, null, Math.round(ms / (1000 * hour)))
            : localize(113, null, Math.round(ms / (1000 * hour)));
    }
    return localize(114, null, Math.round(ms / (1000 * day)));
}
export function toLocalISOString(date) {
    return date.getFullYear() +
        '-' + String(date.getMonth() + 1).padStart(2, '0') +
        '-' + String(date.getDate()).padStart(2, '0') +
        'T' + String(date.getHours()).padStart(2, '0') +
        ':' + String(date.getMinutes()).padStart(2, '0') +
        ':' + String(date.getSeconds()).padStart(2, '0') +
        '.' + (date.getMilliseconds() / 1000).toFixed(3).slice(2, 5) +
        'Z';
}
export const safeIntl = {
    DateTimeFormat(locales, options) {
        return new Lazy(() => {
            try {
                return new Intl.DateTimeFormat(locales, options);
            }
            catch {
                return new Intl.DateTimeFormat(undefined, options);
            }
        });
    },
    Collator(locales, options) {
        return new Lazy(() => {
            try {
                return new Intl.Collator(locales, options);
            }
            catch {
                return new Intl.Collator(undefined, options);
            }
        });
    },
    Segmenter(locales, options) {
        return new Lazy(() => {
            try {
                return new Intl.Segmenter(locales, options);
            }
            catch {
                return new Intl.Segmenter(undefined, options);
            }
        });
    },
    Locale(tag, options) {
        return new Lazy(() => {
            try {
                return new Intl.Locale(tag, options);
            }
            catch {
                return new Intl.Locale(LANGUAGE_DEFAULT, options);
            }
        });
    },
    NumberFormat(locales, options) {
        return new Lazy(() => {
            try {
                return new Intl.NumberFormat(locales, options);
            }
            catch {
                return new Intl.NumberFormat(undefined, options);
            }
        });
    }
};
//# sourceMappingURL=date.js.map