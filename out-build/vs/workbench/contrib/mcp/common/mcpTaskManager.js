/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { disposableTimeout } from '../../../../base/common/async.js';
import { CancellationTokenSource } from '../../../../base/common/cancellation.js';
import { CancellationError } from '../../../../base/common/errors.js';
import { Emitter } from '../../../../base/common/event.js';
import { Disposable, DisposableMap, DisposableStore, toDisposable } from '../../../../base/common/lifecycle.js';
import { generateUuid } from '../../../../base/common/uuid.js';
import { McpError } from './mcpTypes.js';
import { MCP } from './modelContextProtocol.js';
/**
 * Manages in-memory task state for server-side MCP tasks (sampling and elicitation).
 * Also tracks client-side tasks to survive handler reconnections.
 * Lifecycle is tied to the McpServer instance.
 */
export class McpTaskManager extends Disposable {
    constructor() {
        super(...arguments);
        this._serverTasks = this._register(new DisposableMap());
        this._clientTasks = this._register(new DisposableMap());
        this._onDidUpdateTask = this._register(new Emitter());
        this.onDidUpdateTask = this._onDidUpdateTask.event;
    }
    /**
     * Attach a new handler to this task manager.
     * Updates all client tasks to use the new handler.
     */
    setHandler(handler) {
        for (const task of this._clientTasks.values()) {
            task.setHandler(handler);
        }
    }
    /**
     * Get a client task by ID for status notification handling.
     */
    getClientTask(taskId) {
        return this._clientTasks.get(taskId);
    }
    /**
     * Track a new client task.
     */
    adoptClientTask(task) {
        this._clientTasks.set(task.id, task);
    }
    /**
     * Untracks a client task.
     */
    abandonClientTask(taskId) {
        this._clientTasks.deleteAndDispose(taskId);
    }
    /**
     * Create a new task and execute it asynchronously.
     * Returns the task immediately while execution continues in the background.
     */
    createTask(ttl, executor) {
        const taskId = generateUuid();
        const createdAt = new Date().toISOString();
        const createdAtTime = Date.now();
        const task = {
            taskId,
            status: 'working',
            createdAt,
            ttl,
            lastUpdatedAt: new Date().toISOString(),
            pollInterval: 1000, // Suggest 1 second polling interval
        };
        const store = new DisposableStore();
        const cts = new CancellationTokenSource();
        store.add(toDisposable(() => cts.dispose(true)));
        const executionPromise = this._executeTask(taskId, executor, cts.token);
        // Delete the task after its TTL. Or, if no TTL is given, delete it shortly after the task completes.
        if (ttl) {
            store.add(disposableTimeout(() => this._serverTasks.deleteAndDispose(taskId), ttl));
        }
        else {
            executionPromise.finally(() => {
                const timeout = this._register(disposableTimeout(() => {
                    this._serverTasks.deleteAndDispose(taskId);
                    this._store.delete(timeout);
                }, 60_000));
            });
        }
        this._serverTasks.set(taskId, {
            task,
            cts,
            dispose: () => store.dispose(),
            createdAtTime,
            executionPromise,
        });
        return { task };
    }
    /**
     * Execute a task asynchronously and update its state.
     */
    async _executeTask(taskId, executor, token) {
        try {
            const result = await executor(token);
            this._updateTaskStatus(taskId, 'completed', undefined, result);
        }
        catch (error) {
            if (error instanceof CancellationError) {
                this._updateTaskStatus(taskId, 'cancelled', 'Task was cancelled by the client');
            }
            else if (error instanceof McpError) {
                this._updateTaskStatus(taskId, 'failed', error.message, undefined, {
                    code: error.code,
                    message: error.message,
                    data: error.data,
                });
            }
            else if (error instanceof Error) {
                this._updateTaskStatus(taskId, 'failed', error.message, undefined, {
                    code: MCP.INTERNAL_ERROR,
                    message: error.message,
                });
            }
            else {
                this._updateTaskStatus(taskId, 'failed', 'Unknown error', undefined, {
                    code: MCP.INTERNAL_ERROR,
                    message: 'Unknown error',
                });
            }
        }
    }
    /**
     * Update task status and optionally store result or error.
     */
    _updateTaskStatus(taskId, status, statusMessage, result, error) {
        const entry = this._serverTasks.get(taskId);
        if (!entry) {
            return;
        }
        entry.task.status = status;
        entry.task.lastUpdatedAt = new Date().toISOString();
        if (statusMessage !== undefined) {
            entry.task.statusMessage = statusMessage;
        }
        if (result !== undefined) {
            entry.result = result;
        }
        if (error !== undefined) {
            entry.error = error;
        }
        this._onDidUpdateTask.fire({ ...entry.task });
    }
    /**
     * Get the current state of a task.
     * Returns an error if the task doesn't exist or has expired.
     */
    getTask(taskId) {
        const entry = this._serverTasks.get(taskId);
        if (!entry) {
            throw new McpError(MCP.INVALID_PARAMS, `Task not found: ${taskId}`);
        }
        return { ...entry.task };
    }
    /**
     * Get the result of a completed task.
     * Blocks until the task completes if it's still in progress.
     */
    async getTaskResult(taskId) {
        const entry = this._serverTasks.get(taskId);
        if (!entry) {
            throw new McpError(MCP.INVALID_PARAMS, `Task not found: ${taskId}`);
        }
        if (entry.task.status === 'working' || entry.task.status === 'input_required') {
            await entry.executionPromise;
        }
        // Refresh entry after waiting
        const updatedEntry = this._serverTasks.get(taskId);
        if (!updatedEntry) {
            throw new McpError(MCP.INVALID_PARAMS, `Task not found: ${taskId}`);
        }
        if (updatedEntry.error) {
            throw new McpError(updatedEntry.error.code, updatedEntry.error.message, updatedEntry.error.data);
        }
        if (!updatedEntry.result) {
            throw new McpError(MCP.INTERNAL_ERROR, 'Task completed but no result available');
        }
        return updatedEntry.result;
    }
    /**
     * Cancel a task.
     */
    cancelTask(taskId) {
        const entry = this._serverTasks.get(taskId);
        if (!entry) {
            throw new McpError(MCP.INVALID_PARAMS, `Task not found: ${taskId}`);
        }
        // Check if already in terminal status
        if (entry.task.status === 'completed' || entry.task.status === 'failed' || entry.task.status === 'cancelled') {
            throw new McpError(MCP.INVALID_PARAMS, `Cannot cancel task in ${entry.task.status} status`);
        }
        entry.task.status = 'cancelled';
        entry.task.statusMessage = 'Task was cancelled by the client';
        entry.cts.cancel();
        return { ...entry.task };
    }
    /**
     * List all tasks.
     */
    listTasks() {
        const tasks = [];
        for (const entry of this._serverTasks.values()) {
            tasks.push({ ...entry.task });
        }
        return { tasks };
    }
}
//# sourceMappingURL=mcpTaskManager.js.map