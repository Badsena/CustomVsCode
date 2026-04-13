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
import { Disposable, DisposableStore, toDisposable } from '../../../../base/common/lifecycle.js';
import { CancellationError } from '../../../../base/common/errors.js';
import { Emitter, Event } from '../../../../base/common/event.js';
import { ITerminalService } from './terminal.js';
import { DetachedProcessInfo } from './detachedTerminal.js';
import { TERMINAL_BACKGROUND_COLOR } from '../common/terminalColorRegistry.js';
import { PANEL_BACKGROUND } from '../../../common/theme.js';
import { IContextKeyService } from '../../../../platform/contextkey/common/contextkey.js';
import { ChatContextKeys } from '../../chat/common/actions/chatContextKeys.js';
import { editorBackground } from '../../../../platform/theme/common/colorRegistry.js';
import { Color } from '../../../../base/common/color.js';
function getChatTerminalBackgroundColor(theme, contextKeyService, storedBackground) {
    if (storedBackground) {
        const color = Color.fromHex(storedBackground);
        if (color) {
            return color;
        }
    }
    const terminalBackground = theme.getColor(TERMINAL_BACKGROUND_COLOR);
    if (terminalBackground) {
        return terminalBackground;
    }
    const isInEditor = ChatContextKeys.inChatEditor.getValue(contextKeyService);
    return theme.getColor(isInEditor ? editorBackground : PANEL_BACKGROUND);
}
/**
 * Computes the maximum column width of content in a terminal buffer.
 * Iterates through each line and finds the rightmost non-empty cell.
 *
 * @param buffer The buffer to measure
 * @param cols The terminal column count (used to clamp line length)
 * @returns The maximum column width (number of columns used), or 0 if all lines are empty
 */
export function computeMaxBufferColumnWidth(buffer, cols) {
    let maxWidth = 0;
    for (let y = 0; y < buffer.length; y++) {
        const line = buffer.getLine(y);
        if (!line) {
            continue;
        }
        // Find the last non-empty cell by iterating backwards
        const lineLength = Math.min(line.length, cols);
        for (let x = lineLength - 1; x >= 0; x--) {
            if (line.getCell(x)?.getChars()) {
                maxWidth = Math.max(maxWidth, x + 1);
                break;
            }
        }
    }
    return maxWidth;
}
/**
 * Checks if two VT strings match around a boundary where we would slice.
 * This is an efficient O(1) check that verifies a small window of characters
 * before the slice point to detect if the VT sequences have diverged (common on Windows).
 *
 * @param newVT The new VT text to compare.
 * @param oldVT The old VT text to compare against.
 * @param slicePoint The point where we would slice. Must be <= both string lengths.
 * @param windowSize The number of characters before slicePoint to check (default 50).
 * @returns True if the boundary matches, false if VT sequences have diverged.
 */
export function vtBoundaryMatches(newVT, oldVT, slicePoint, windowSize = 50) {
    const start = Math.max(0, slicePoint - windowSize);
    const end = slicePoint;
    for (let i = start; i < end; i++) {
        if (newVT.charCodeAt(i) !== oldVT.charCodeAt(i)) {
            return false;
        }
    }
    return true;
}
var ChatTerminalMirrorMetrics;
(function (ChatTerminalMirrorMetrics) {
    ChatTerminalMirrorMetrics[ChatTerminalMirrorMetrics["MirrorRowCount"] = 10] = "MirrorRowCount";
    ChatTerminalMirrorMetrics[ChatTerminalMirrorMetrics["MirrorColCountFallback"] = 80] = "MirrorColCountFallback";
    /**
     * Maximum number of lines for which we compute the max column width.
     * Computing max column width iterates the entire buffer, so we skip it
     * for large outputs to avoid performance issues.
     */
    ChatTerminalMirrorMetrics[ChatTerminalMirrorMetrics["MaxLinesForColumnWidthComputation"] = 100] = "MaxLinesForColumnWidthComputation";
})(ChatTerminalMirrorMetrics || (ChatTerminalMirrorMetrics = {}));
/**
 * Computes the line count for terminal output between start and end lines.
 * The end line is exclusive (points to the line after output ends).
 */
function computeOutputLineCount(startLine, endLine) {
    return Math.max(endLine - startLine, 0);
}
export async function getCommandOutputSnapshot(xtermTerminal, command, log) {
    const executedMarker = command.executedMarker;
    const endMarker = command.endMarker;
    if (!endMarker || endMarker.isDisposed) {
        return undefined;
    }
    if (!executedMarker || executedMarker.isDisposed) {
        const raw = xtermTerminal.raw;
        const buffer = raw.buffer.active;
        const offsets = [
            -(buffer.baseY + buffer.cursorY),
            -buffer.baseY,
            0
        ];
        let startMarker;
        for (const offset of offsets) {
            startMarker = raw.registerMarker(offset);
            if (startMarker) {
                break;
            }
        }
        if (!startMarker || startMarker.isDisposed) {
            return { text: '', lineCount: 0 };
        }
        const startLine = startMarker.line;
        let text;
        try {
            text = await xtermTerminal.getRangeAsVT(startMarker, endMarker, true);
        }
        catch (error) {
            log?.('fallback', error);
            return undefined;
        }
        finally {
            startMarker.dispose();
        }
        if (!text) {
            return { text: '', lineCount: 0 };
        }
        const endLine = endMarker.line;
        const lineCount = computeOutputLineCount(startLine, endLine);
        return { text, lineCount };
    }
    const startLine = executedMarker.line;
    const endLine = endMarker.line;
    const lineCount = computeOutputLineCount(startLine, endLine);
    let text;
    try {
        text = await xtermTerminal.getRangeAsVT(executedMarker, endMarker, true);
    }
    catch (error) {
        log?.('primary', error);
        return undefined;
    }
    if (!text) {
        return { text: '', lineCount: 0 };
    }
    return { text, lineCount };
}
/**
 * Mirrors a terminal command's output into a detached terminal instance.
 * Used in the chat terminal tool progress part to show command output.
 */
let DetachedTerminalCommandMirror = class DetachedTerminalCommandMirror extends Disposable {
    constructor(_xtermTerminal, _command, _terminalService, _contextKeyService) {
        super();
        this._xtermTerminal = _xtermTerminal;
        this._command = _command;
        this._terminalService = _terminalService;
        this._contextKeyService = _contextKeyService;
        this._streamingDisposables = this._register(new DisposableStore());
        this._onDidUpdateEmitter = this._register(new Emitter());
        this.onDidUpdate = this._onDidUpdateEmitter.event;
        this._onDidInputEmitter = this._register(new Emitter());
        this.onDidInput = this._onDidInputEmitter.event;
        this._lastVT = '';
        this._lineCount = 0;
        this._maxColumnWidth = 0;
        this._dirtyScheduled = false;
        this._isStreaming = false;
        this._register(toDisposable(() => {
            this._stopStreaming();
        }));
    }
    async attach(container) {
        if (this._store.isDisposed) {
            return;
        }
        let terminal;
        try {
            terminal = await this._getOrCreateTerminal();
        }
        catch (error) {
            if (error instanceof CancellationError) {
                return;
            }
            throw error;
        }
        if (this._store.isDisposed) {
            return;
        }
        if (this._attachedContainer !== container) {
            container.classList.add('chat-terminal-output-terminal');
            terminal.attachToElement(container, { enableGpu: false });
            this._attachedContainer = container;
        }
    }
    async renderCommand() {
        if (this._store.isDisposed) {
            return undefined;
        }
        let detached;
        try {
            detached = await this._getOrCreateTerminal();
        }
        catch (error) {
            if (error instanceof CancellationError) {
                return undefined;
            }
            throw error;
        }
        if (this._store.isDisposed) {
            return undefined;
        }
        let vt;
        try {
            vt = await this._getCommandOutputAsVT(this._xtermTerminal);
        }
        catch {
            // ignore and treat as no output
        }
        if (!vt) {
            return undefined;
        }
        if (this._store.isDisposed) {
            return undefined;
        }
        await new Promise(resolve => {
            // Only append if the boundary around the slice point matches; otherwise rewrite.
            // This is an efficient constant-time check (checking up to 50 characters) instead of comparing the entire prefix.
            // On Windows, VT sequences can differ even for equivalent content, causing corruption
            // if we blindly append.
            const canAppend = !!this._lastVT && vt.text.length >= this._lastVT.length && this._vtBoundaryMatches(vt.text, this._lastVT.length);
            if (!canAppend) {
                // Use \x1bc (RIS) + new content in one write to avoid a blank frame
                const payload = this._lastVT ? `\x1bc${vt.text}` : vt.text;
                if (payload) {
                    detached.xterm.write(payload, resolve);
                }
                else {
                    resolve();
                }
            }
            else {
                const appended = vt.text.slice(this._lastVT.length);
                if (appended) {
                    detached.xterm.write(appended, resolve);
                }
                else {
                    resolve();
                }
            }
        });
        this._lastVT = vt.text;
        const sourceRaw = this._xtermTerminal.raw;
        if (sourceRaw) {
            this._sourceRaw = sourceRaw;
            this._lastUpToDateCursorY = this._getAbsoluteCursorY(sourceRaw);
            if (!this._isStreaming && (!this._command.endMarker || this._command.endMarker.isDisposed)) {
                this._startStreaming(sourceRaw);
            }
        }
        this._lineCount = this._getRenderedLineCount();
        // Only compute max column width after the command finishes and for small outputs
        const commandFinished = this._command.endMarker && !this._command.endMarker.isDisposed;
        if (commandFinished && this._lineCount <= 100 /* ChatTerminalMirrorMetrics.MaxLinesForColumnWidthComputation */) {
            this._maxColumnWidth = this._computeMaxColumnWidth();
        }
        return { lineCount: this._lineCount, maxColumnWidth: this._maxColumnWidth };
    }
    async _getCommandOutputAsVT(source) {
        if (this._store.isDisposed) {
            return undefined;
        }
        const executedMarker = this._command.executedMarker ?? this._command.commandExecutedMarker;
        if (!executedMarker) {
            return undefined;
        }
        const endMarker = this._command.endMarker;
        const text = await source.getRangeAsVT(executedMarker, endMarker, endMarker?.line !== executedMarker.line);
        if (this._store.isDisposed) {
            return undefined;
        }
        if (!text) {
            return { text: '' };
        }
        return { text };
    }
    _getRenderedLineCount() {
        // Calculate line count from the command's markers when available
        const endMarker = this._command.endMarker;
        if (this._command.executedMarker && endMarker && !endMarker.isDisposed) {
            const startLine = this._command.executedMarker.line;
            const endLine = endMarker.line;
            return computeOutputLineCount(startLine, endLine);
        }
        // During streaming (no end marker), calculate from the source terminal buffer
        const executedMarker = this._command.executedMarker ?? this._command.commandExecutedMarker;
        if (executedMarker && this._sourceRaw) {
            const buffer = this._sourceRaw.buffer.active;
            const currentLine = buffer.baseY + buffer.cursorY;
            return computeOutputLineCount(executedMarker.line, currentLine);
        }
        return this._lineCount;
    }
    _computeMaxColumnWidth() {
        const detached = this._detachedTerminal;
        if (!detached) {
            return 0;
        }
        return computeMaxBufferColumnWidth(detached.xterm.buffer.active, detached.xterm.cols);
    }
    async _getOrCreateTerminal() {
        if (this._detachedTerminal) {
            return this._detachedTerminal;
        }
        if (this._detachedTerminalPromise) {
            return this._detachedTerminalPromise;
        }
        if (this._store.isDisposed) {
            throw new CancellationError();
        }
        const createPromise = (async () => {
            const colorProvider = {
                getBackgroundColor: (theme) => getChatTerminalBackgroundColor(theme, this._contextKeyService)
            };
            const processInfo = new DetachedProcessInfo({ initialCwd: '' });
            const detached = await this._terminalService.createDetachedTerminal({
                cols: this._xtermTerminal.raw.cols ?? 80 /* ChatTerminalMirrorMetrics.MirrorColCountFallback */,
                rows: 10 /* ChatTerminalMirrorMetrics.MirrorRowCount */,
                readonly: false,
                processInfo,
                disableOverviewRuler: true,
                colorProvider
            });
            if (this._store.isDisposed) {
                processInfo.dispose();
                detached.dispose();
                throw new CancellationError();
            }
            this._detachedTerminal = detached;
            this._register(processInfo);
            this._register(detached);
            // Forward input from the mirror terminal to the source terminal
            this._register(detached.onData(data => this._onDidInputEmitter.fire(data)));
            return detached;
        })();
        this._detachedTerminalPromise = createPromise;
        return createPromise;
    }
    _startStreaming(raw) {
        if (this._store.isDisposed || this._isStreaming) {
            return;
        }
        this._isStreaming = true;
        this._streamingDisposables.add(Event.any(raw.onCursorMove, raw.onLineFeed, raw.onWriteParsed)(() => this._handleCursorEvent()));
        this._streamingDisposables.add(raw.onData(() => this._handleCursorEvent()));
    }
    _stopStreaming() {
        if (!this._isStreaming) {
            return;
        }
        this._streamingDisposables.clear();
        this._isStreaming = false;
        this._lowestDirtyCursorY = undefined;
        this._sourceRaw = undefined;
    }
    _handleCursorEvent() {
        if (this._store.isDisposed || !this._sourceRaw) {
            return;
        }
        const cursorY = this._getAbsoluteCursorY(this._sourceRaw);
        this._lowestDirtyCursorY = this._lowestDirtyCursorY === undefined ? cursorY : Math.min(this._lowestDirtyCursorY, cursorY);
        this._scheduleFlush();
    }
    _scheduleFlush() {
        if (this._dirtyScheduled || this._store.isDisposed) {
            return;
        }
        this._dirtyScheduled = true;
        queueMicrotask(() => {
            this._dirtyScheduled = false;
            if (this._store.isDisposed) {
                return;
            }
            this._flushDirtyRange();
        });
    }
    _flushDirtyRange() {
        if (this._store.isDisposed || this._flushPromise) {
            return;
        }
        this._flushPromise = this._doFlushDirtyRange().finally(() => {
            this._flushPromise = undefined;
        });
    }
    async _doFlushDirtyRange() {
        if (this._store.isDisposed) {
            return;
        }
        const sourceRaw = this._xtermTerminal.raw;
        let detached = this._detachedTerminal;
        if (!detached) {
            try {
                detached = await this._getOrCreateTerminal();
            }
            catch (error) {
                if (error instanceof CancellationError) {
                    return;
                }
                throw error;
            }
        }
        if (this._store.isDisposed) {
            return;
        }
        const detachedRaw = detached?.xterm;
        if (!sourceRaw || !detachedRaw) {
            return;
        }
        this._sourceRaw = sourceRaw;
        const currentCursor = this._getAbsoluteCursorY(sourceRaw);
        const previousCursor = this._lastUpToDateCursorY ?? currentCursor;
        const startCandidate = this._lowestDirtyCursorY ?? currentCursor;
        this._lowestDirtyCursorY = undefined;
        const startLine = Math.min(previousCursor, startCandidate);
        // Ensure we resolve any pending flush even when no actual new output is available.
        const vt = await this._getCommandOutputAsVT(this._xtermTerminal);
        if (!vt) {
            return;
        }
        if (this._store.isDisposed) {
            return;
        }
        if (vt.text === this._lastVT) {
            this._lastUpToDateCursorY = currentCursor;
            if (this._command.endMarker && !this._command.endMarker.isDisposed) {
                this._stopStreaming();
            }
            return;
        }
        // Only append if: (1) cursor hasn't moved backwards, and (2) boundary around slice point matches.
        // This is an efficient O(1) check instead of comparing the entire prefix.
        // On Windows, VT sequences can differ even for equivalent content, so we must verify.
        const canAppend = !!this._lastVT && startLine >= previousCursor && vt.text.length >= this._lastVT.length && this._vtBoundaryMatches(vt.text, this._lastVT.length);
        await new Promise(resolve => {
            if (!canAppend) {
                // Use \x1bc (RIS) + new content in one write to avoid a blank frame
                const payload = this._lastVT ? `\x1bc${vt.text}` : vt.text;
                if (payload) {
                    detachedRaw.write(payload, resolve);
                }
                else {
                    resolve();
                }
            }
            else {
                const appended = vt.text.slice(this._lastVT.length);
                if (appended) {
                    detachedRaw.write(appended, resolve);
                }
                else {
                    resolve();
                }
            }
        });
        this._lastVT = vt.text;
        this._lineCount = this._getRenderedLineCount();
        this._lastUpToDateCursorY = currentCursor;
        const commandFinished = this._command.endMarker && !this._command.endMarker.isDisposed;
        if (commandFinished) {
            // Only compute max column width after the command finishes and for small outputs
            if (this._lineCount <= 100 /* ChatTerminalMirrorMetrics.MaxLinesForColumnWidthComputation */) {
                this._maxColumnWidth = this._computeMaxColumnWidth();
            }
            this._stopStreaming();
        }
        this._onDidUpdateEmitter.fire({ lineCount: this._lineCount, maxColumnWidth: this._maxColumnWidth });
    }
    _getAbsoluteCursorY(raw) {
        return raw.buffer.active.baseY + raw.buffer.active.cursorY;
    }
    /**
     * Checks if the new VT text matches the old VT around the boundary where we would slice.
     */
    _vtBoundaryMatches(newVT, slicePoint) {
        return vtBoundaryMatches(newVT, this._lastVT, slicePoint);
    }
};
DetachedTerminalCommandMirror = __decorate([
    __param(2, ITerminalService),
    __param(3, IContextKeyService)
], DetachedTerminalCommandMirror);
export { DetachedTerminalCommandMirror };
/**
 * Mirrors a terminal output snapshot into a detached terminal instance.
 * Used when the terminal has been disposed of but we still want to show the output.
 */
let DetachedTerminalSnapshotMirror = class DetachedTerminalSnapshotMirror extends Disposable {
    constructor(output, _getTheme, _terminalService, _contextKeyService) {
        super();
        this._getTheme = _getTheme;
        this._terminalService = _terminalService;
        this._contextKeyService = _contextKeyService;
        this._dirty = true;
        this._output = output;
        const processInfo = this._register(new DetachedProcessInfo({ initialCwd: '' }));
        this._detachedTerminal = this._terminalService.createDetachedTerminal({
            cols: 80 /* ChatTerminalMirrorMetrics.MirrorColCountFallback */,
            rows: 10 /* ChatTerminalMirrorMetrics.MirrorRowCount */,
            readonly: true,
            processInfo,
            disableOverviewRuler: true,
            colorProvider: {
                getBackgroundColor: theme => {
                    const storedBackground = this._getTheme()?.background;
                    return getChatTerminalBackgroundColor(theme, this._contextKeyService, storedBackground);
                }
            }
        }).then(terminal => {
            // If the store is already disposed, dispose the terminal immediately
            if (this._store.isDisposed) {
                terminal.dispose();
                return terminal;
            }
            return this._register(terminal);
        });
    }
    async _getTerminal() {
        if (!this._detachedTerminal) {
            throw new Error('Detached terminal not initialized');
        }
        return this._detachedTerminal;
    }
    setOutput(output) {
        this._output = output;
        this._dirty = true;
    }
    async attach(container) {
        const terminal = await this._getTerminal();
        if (this._store.isDisposed) {
            return;
        }
        container.classList.add('chat-terminal-output-terminal');
        const needsAttach = this._attachedContainer !== container || container.firstChild === null;
        if (needsAttach) {
            terminal.attachToElement(container, { enableGpu: false });
            this._attachedContainer = container;
        }
        this._container = container;
        this._applyTheme(container);
    }
    async render() {
        const output = this._output;
        if (!output) {
            return undefined;
        }
        if (!this._dirty) {
            return { lineCount: this._lastRenderedLineCount ?? output.lineCount, maxColumnWidth: this._lastRenderedMaxColumnWidth };
        }
        const terminal = await this._getTerminal();
        if (this._store.isDisposed) {
            return undefined;
        }
        if (this._container) {
            this._applyTheme(this._container);
        }
        const text = output.text ?? '';
        const lineCount = output.lineCount ?? this._estimateLineCount(text);
        if (!text) {
            this._dirty = false;
            this._lastRenderedLineCount = lineCount;
            this._lastRenderedMaxColumnWidth = 0;
            return { lineCount: 0, maxColumnWidth: 0 };
        }
        await new Promise(resolve => terminal.xterm.write(text, resolve));
        if (this._store.isDisposed) {
            return undefined;
        }
        this._dirty = false;
        this._lastRenderedLineCount = lineCount;
        // Only compute max column width for small outputs to avoid performance issues
        if (this._shouldComputeMaxColumnWidth(lineCount)) {
            this._lastRenderedMaxColumnWidth = this._computeMaxColumnWidth(terminal);
        }
        return { lineCount, maxColumnWidth: this._lastRenderedMaxColumnWidth };
    }
    _computeMaxColumnWidth(terminal) {
        return computeMaxBufferColumnWidth(terminal.xterm.buffer.active, terminal.xterm.cols);
    }
    _estimateLineCount(text) {
        if (!text) {
            return 0;
        }
        const sanitized = text.replace(/\r/g, '');
        const segments = sanitized.split('\n');
        const count = sanitized.endsWith('\n') ? segments.length - 1 : segments.length;
        return Math.max(count, 1);
    }
    _shouldComputeMaxColumnWidth(lineCount) {
        return lineCount <= 100 /* ChatTerminalMirrorMetrics.MaxLinesForColumnWidthComputation */;
    }
    _applyTheme(container) {
        const theme = this._getTheme();
        if (!theme) {
            container.style.removeProperty('background-color');
            container.style.removeProperty('color');
            return;
        }
        if (theme.background) {
            container.style.backgroundColor = theme.background;
        }
        if (theme.foreground) {
            container.style.color = theme.foreground;
        }
    }
};
DetachedTerminalSnapshotMirror = __decorate([
    __param(2, ITerminalService),
    __param(3, IContextKeyService)
], DetachedTerminalSnapshotMirror);
export { DetachedTerminalSnapshotMirror };
//# sourceMappingURL=chatTerminalCommandMirror.js.map