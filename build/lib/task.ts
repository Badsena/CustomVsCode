/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import fancyLog from 'fancy-log';
import ansiColors from 'ansi-colors';

export interface BaseTask {
	displayName?: string;
	taskName?: string;
	_tasks?: Task[];
}
export interface PromiseTask extends BaseTask {
	(): Promise<void>;
}
export interface StreamTask extends BaseTask {
	(): NodeJS.ReadWriteStream;
}
export interface CallbackTask extends BaseTask {
	(cb?: (err?: Error) => void): void;
}

export type Task = PromiseTask | StreamTask | CallbackTask;

function _isPromise(p: Promise<void> | NodeJS.ReadWriteStream): p is Promise<void> {
	return typeof (p as Promise<void>).then === 'function';
}

function _renderTime(time: number): string {
	return `${Math.round(time)} ms`;
}

async function _execute(task: Task): Promise<void> {
	const name = task.taskName || task.displayName || `<anonymous>`;
	fancyLog('Starting', ansiColors.cyan(name), '...');
	const startTime = process.hrtime();
	try {
		await _doExecute(task);
	} catch (err) {
		fancyLog(ansiColors.red(`Error in ${name}:`), err);
		throw err;
	}
	const elapsedArr = process.hrtime(startTime);
	const elapsedNanoseconds = (elapsedArr[0] * 1e9 + elapsedArr[1]);
	fancyLog(`Finished`, ansiColors.cyan(name), 'after', ansiColors.magenta(_renderTime(elapsedNanoseconds / 1e6)));
}

const DEFAULT_TASK_TIMEOUT = 20 * 60 * 1000; // 20 minutes
const HEARTBEAT_INTERVAL = 5 * 60 * 1000; // 5 minutes

async function _doExecute(task: Task): Promise<void> {
	const name = task.taskName || task.displayName || `<anonymous>`;

	// Always invoke as if it were a callback task
	return new Promise((resolve, reject) => {
		let timeout: NodeJS.Timeout | undefined;
		let heartbeat: NodeJS.Timeout | undefined;

		const done = (err?: any) => {
			if (timeout) {
				clearTimeout(timeout);
				timeout = undefined;
			}
			if (heartbeat) {
				clearInterval(heartbeat);
				heartbeat = undefined;
			}
			if (err) {
				reject(err);
			} else {
				resolve();
			}
		};

		timeout = setTimeout(() => {
			fancyLog(ansiColors.yellow(`[task] Task '${name}' is taking longer than 20 minutes. Forcefully resolving...`));
			done();
		}, DEFAULT_TASK_TIMEOUT);

		heartbeat = setInterval(() => {
			fancyLog(ansiColors.yellow(`[task] Task '${name}' is still running (5m heartbeat)...`));
		}, HEARTBEAT_INTERVAL);

		if (task.length === 1) {
			// this is a callback task
			task((err) => {
				done(err);
			});
			return;
		}

		const taskResult = task() as any;

		if (typeof taskResult === 'undefined') {
			// this is a sync task
			done();
			return;
		}

		if (_isPromise(taskResult)) {
			// this is a promise returning task
			taskResult.then(() => done(), (err: any) => done(err));
			return;
		}

		// this is a stream returning task
		taskResult.on('end', () => done());
		taskResult.on('finish', () => done());
		taskResult.on('error', (err: any) => done(err));
	});
}

export function series(...tasks: Task[]): PromiseTask {
	const result = async () => {
		for (let i = 0; i < tasks.length; i++) {
			await _execute(tasks[i]);
		}
	};
	result._tasks = tasks;
	return result;
}

export function parallel(...tasks: Task[]): PromiseTask {
	const result = async () => {
		await Promise.all(tasks.map(t => _execute(t)));
	};
	result._tasks = tasks;
	return result;
}

export function define(name: string, task: Task): Task {
	if (task._tasks) {
		// This is a composite task
		const lastTask = task._tasks[task._tasks.length - 1];

		if (lastTask._tasks || lastTask.taskName) {
			// This is a composite task without a real task function
			// => generate a fake task function
			return define(name, series(task, () => Promise.resolve()));
		}

		lastTask.taskName = name;
		task.displayName = name;
		return task;
	}

	// This is a simple task
	task.taskName = name;
	task.displayName = name;
	return task;
}
