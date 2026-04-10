import * as path from 'path';
import * as fs from 'fs';
import { exec } from 'child_process';
import { promisify } from 'util';
import axios from 'axios';
import * as vscode from 'vscode';
import extract = require('extract-zip');

const execAsync = promisify(exec);

async function hideTestFolder(projectPath: string, folderPattern: string, gitPattern: string) {
	try {
		const config = vscode.workspace.getConfiguration('files');
		const excludes: any = { ...(config.get('exclude') || {}) };
		if (!excludes[folderPattern]) {
			excludes[folderPattern] = true;
			await config.update('exclude', excludes, vscode.ConfigurationTarget.Workspace);
		}

		// Also add to .git/info/exclude to hide from Git
		const gitExcludePath = path.join(projectPath, '.git', 'info', 'exclude');
		if (fs.existsSync(path.dirname(gitExcludePath))) {
			let content = '';
			if (fs.existsSync(gitExcludePath)) {
				content = fs.readFileSync(gitExcludePath, 'utf8');
			}
			const gitPatternFormatted = gitPattern.replace(/\\/g, '/');
			if (!content.includes(gitPatternFormatted)) {
				fs.appendFileSync(gitExcludePath, `\n${gitPatternFormatted}\n`);
			}
		}
	} catch (e) {
		console.warn('Could not hide test folder', e);
	}
}

async function unhideTestFolder(projectPath: string, folderPattern: string, gitPattern: string) {
	try {
		const config = vscode.workspace.getConfiguration('files');
		const excludes: any = { ...(config.get('exclude') || {}) };
		if (excludes[folderPattern]) {
			delete excludes[folderPattern];
			await config.update('exclude', excludes, vscode.ConfigurationTarget.Workspace);
		}

		// Remove from .git/info/exclude
		const gitExcludePath = path.join(projectPath, '.git', 'info', 'exclude');
		if (fs.existsSync(gitExcludePath)) {
			let content = fs.readFileSync(gitExcludePath, 'utf8');
			const gitPatternFormatted = gitPattern.replace(/\\/g, '/');
			if (content.includes(gitPatternFormatted)) {
				const lines = content.split('\n').filter(line => line.trim() !== gitPatternFormatted);
				fs.writeFileSync(gitExcludePath, lines.join('\n'));
			}
		}
	} catch (e) {
		console.warn('Could not unhide test folder', e);
	}
}

export interface VerificationRequest {
	project_path: string;
	question_id: number;
	qb_name: string;
	token: string;
	backend_url: string;
}

/**
 * Executes a command and captures output even if it fails
 */
export function execAllowFail(command: string, options: any = {}): Promise<{ stdout: string, stderr: string, exitCode: number }> {
	return new Promise(resolve => {
		exec(command, options, (error, stdout, stderr) => {
			resolve({
				stdout: stdout ? stdout.toString() : '',
				stderr: stderr ? stderr.toString() : '',
				exitCode: error ? (error as any).code || 1 : 0,
			});
		});
	});
}

export function parseTestResults(output: string) {
	const results: any = {
		total: 0,
		passed: 0,
		failed: 0,
		skipped: 0,
		errors: 0,
		passedTests: [] as string[],
		failedTests: [] as string[],
		skippedTests: [] as string[],
		errorTests: [] as string[]
	};

	// Parse Maven Surefire summary
	const testRegex = /Tests run: (\d+), Failures: (\d+), Errors: (\d+), Skipped: (\d+)/;
	const match = output.match(testRegex);

	if (match) {
		results.total = parseInt(match[1]);
		results.failed = parseInt(match[2]);
		results.errors = parseInt(match[3]);
		results.skipped = parseInt(match[4]);
		results.passed = results.total - results.failed - results.errors - results.skipped;
	}

	// Extract individual test cases with PASS status
	const passRegex = /(\S+)\s+-\s+PASS/g;
	let passMatch;
	while ((passMatch = passRegex.exec(output)) !== null) {
		results.passedTests.push(passMatch[1]);
	}

	// Extract failed test cases (FAIL status)
	const failRegex = /(\S+)\s+-\s+FAIL/g;
	let failMatch;
	while ((failMatch = failRegex.exec(output)) !== null) {
		results.failedTests.push(failMatch[1]);
	}

	// Extract skipped test cases (SKIP status)
	const skipRegex = /(\S+)\s+-\s+SKIP/g;
	let skipMatch;
	while ((skipMatch = skipRegex.exec(output)) !== null) {
		results.skippedTests.push(skipMatch[1]);
	}

	// Extract error test cases (ERROR status)
	const errorRegex = /^(\w+):\s*ERROR$/gm;
	let errorMatch;
	while ((errorMatch = errorRegex.exec(output)) !== null) {
		results.errorTests.push(errorMatch[1]);
	}

	return results;
}

export function parseReactTestResults(output: string) {
	const results: any = {
		total: 0,
		passed: 0,
		failed: 0,
		skipped: 0,
		errors: 0,
		passedTests: [] as string[],
		failedTests: [] as string[],
		skippedTests: [] as string[],
		errorTests: [] as string[]
	};

	if (!output) return results;

	// Strip ANSI codes to simplify parsing
	const cleanOutput = output.replace(/\x1b\[[0-9;]*[a-zA-Z]/g, '');

	// Parse summary counts
	const testsLineMatch = cleanOutput.match(/Tests:\s+(.+)/);
	if (testsLineMatch) {
		const statsStr = testsLineMatch[1];
		const totalMatch = statsStr.match(/(\d+)\s+total/);
		const passedMatch = statsStr.match(/(\d+)\s+passed/);
		const failedMatch = statsStr.match(/(\d+)\s+failed/);
		const skippedMatch = statsStr.match(/(\d+)\s+skipped/);

		if (totalMatch) results.total = parseInt(totalMatch[1], 10);
		if (passedMatch) results.passed = parseInt(passedMatch[1], 10);
		if (failedMatch) results.failed = parseInt(failedMatch[1], 10);
		if (skippedMatch) results.skipped = parseInt(skippedMatch[1], 10);
	}

	// Extract individual test cases
	const passRegex = /^\s*(?:✓|√)\s+(.+?)(?:\s+\(\d+\s*s?ms\))?$/gm;
	let passMatch;
	while ((passMatch = passRegex.exec(cleanOutput)) !== null) {
		results.passedTests.push(passMatch[1].trim());
	}

	const failRegex = /^\s*(?:✕|x|×)\s+(.+?)(?:\s+\(\d+\s*s?ms\))?$/gm;
	let failMatch;
	while ((failMatch = failRegex.exec(cleanOutput)) !== null) {
		results.failedTests.push(failMatch[1].trim());
	}

	const skipRegex = /^\s*(?:○|-)\s+(.+?)(?:\s+\(\d+\s*s?ms\))?$/gm;
	let skipMatch;
	while ((skipMatch = skipRegex.exec(cleanOutput)) !== null) {
		results.skippedTests.push(skipMatch[1].trim());
	}

	// Fallback if summary was not found but we parsed valid items
	if (results.total === 0 && (results.passedTests.length > 0 || results.failedTests.length > 0 || results.skippedTests.length > 0)) {
		results.passed = results.passedTests.length;
		results.failed = results.failedTests.length;
		results.skipped = results.skippedTests.length;
		results.total = results.passed + results.failed + results.skipped;
	}

	return results;
}

export async function verifySpringBoot(request: VerificationRequest) {
	let token = 'AmypoToken'

	const { project_path, question_id, qb_name, backend_url } = request;
	const localDestPath = path.join(project_path, 'src', 'test', 'java', 'com', 'example', 'demo');
	const localDeletePath = path.join(project_path, 'src', 'test');

	try {
		await hideTestFolder(project_path, '**/src/test', 'src/test');
		console.log('Fetching testcases from:', backend_url);

		const payload = {
			question_id: question_id,
			qb_name: qb_name,
		};

		console.log("payload", payload);


		// Step 1: Fetch test cases from API
		const response = await axios.post(
			`${backend_url}/project-testcase`,
			payload,
			{
				headers: {
					'Content-Type': 'application/json',
					'Authorization': `Bearer ${token}`
				},
				responseType: 'arraybuffer'
			}
		);

		if (response.status !== 200) {
			throw new Error(`Failed to fetch testcase from backend. Status: ${response.status}`);
		}

		console.log('✓ Testcase fetched successfully', response);

		// Step 2: Extract directly to application test directory
		if (!fs.existsSync(localDestPath)) {
			fs.mkdirSync(localDestPath, { recursive: true });
		}

		const zipFilePath = path.join(project_path, 'testcases.zip');
		fs.writeFileSync(zipFilePath, Buffer.from(response.data));

		try {
			await extract(zipFilePath, { dir: path.resolve(localDestPath) });
			console.log('✓ Files extracted to project test directory');
		} catch (extractErr) {
			console.error('Failed to extract zip:', extractErr);
			throw new Error('Testcase extraction failed. Please ensure you have sufficient permissions.');
		} finally {
			if (fs.existsSync(zipFilePath)) fs.unlinkSync(zipFilePath);
		}

		// Step 3: Run Maven tests locally
		const projectRoot = project_path;
		console.log('🧪 Running Maven tests in:', projectRoot);

		const testStartTime = Date.now();
		// Maven clean test command - may take time
		const { stdout, stderr, exitCode } = await execAllowFail(`cd "${projectRoot}" && mvn clean test`, {
			maxBuffer: 50 * 1024 * 1024,
			timeout: 480000 // 8 minutes
		});

		const testDuration = ((Date.now() - testStartTime) / 1000).toFixed(2);
		const fullOutput = `${stdout}${stderr ? '\n' + stderr : ''}`;
		const testResults = parseTestResults(stdout);

		console.log(`✓ Tests completed in ${testDuration} seconds`);

		// Step 4: Cleanup test files
		if (fs.existsSync(localDeletePath)) {
			fs.rmSync(localDeletePath, { recursive: true, force: true });
			console.log('✓ Local test files cleaned up');
		}

		return {
			success: exitCode === 0 && testResults.total > 0,
			message: exitCode === 0 ? 'Test cases executed successfully' : 'Tests execution failed',
			test_results: testResults,
			full_terminal_output: fullOutput
		};

	} catch (error: any) {
		console.error('Error in verifySpringBoot:', error);
		if (fs.existsSync(localDeletePath)) {
			fs.rmSync(localDeletePath, { recursive: true, force: true });
		}
		throw error;
	} finally {
		await unhideTestFolder(project_path, '**/src/test', 'src/test');
	}
}

export async function verifyReact(request: VerificationRequest) {
	const { project_path, question_id, qb_name, token, backend_url } = request;
	const localDestPath = path.join(project_path, 'reactapp', 'src', 'testcase');
	const localDeletePath = localDestPath;

	try {
		await hideTestFolder(project_path, '**/src/testcase', 'reactapp/src/testcase');
		console.log('Fetching testcases from:', backend_url);

		// Step 1: Fetch test cases from API
		const response = await axios.post(
			`${backend_url}/project-testcase`,
			{ question_id, qb_name },
			{
				headers: {
					'Content-Type': 'application/json',
					'Authorization': `Bearer ${token}`
				},
				responseType: 'arraybuffer'
			}
		);

		if (response.status !== 200) {
			throw new Error(`Failed to fetch testcase from backend. Status: ${response.status}`);
		}

		console.log('✓ Testcase fetched successfully');

		// Step 2: Extract directly to application test directory
		if (!fs.existsSync(localDestPath)) {
			fs.mkdirSync(localDestPath, { recursive: true });
		}

		const zipFilePath = path.join(project_path, 'testcases_react.zip');
		fs.writeFileSync(zipFilePath, Buffer.from(response.data));

		try {
			await extract(zipFilePath, { dir: path.resolve(localDestPath) });
			console.log('✓ Files extracted to project test directory');
		} catch (extractErr) {
			console.error('Failed to extract zip:', extractErr);
			throw new Error('Testcase extraction failed. Please ensure you have sufficient permissions.');
		} finally {
			if (fs.existsSync(zipFilePath)) fs.unlinkSync(zipFilePath);
		}

		// Step 3: Run React tests locally
		const projectRoot = path.join(project_path, 'reactapp');
		console.log('🧪 Running React tests in:', projectRoot);

		const testStartTime = Date.now();
		const testCmd = `cd "${projectRoot}" && npm test -- src/testcase --watchAll=false`;

		const { stdout, stderr, exitCode } = await execAllowFail(testCmd);
		const fullOutput = `${stdout || ''}${stderr ? '\n' + stderr : ''}`;
		const testDuration = ((Date.now() - testStartTime) / 1000).toFixed(2);
		const testSuccess = exitCode === 0;

		const parsedResults = parseReactTestResults(fullOutput);

		console.log(`✓ Tests completed in ${testDuration} seconds`);

		// Step 4: Cleanup test files
		if (fs.existsSync(localDeletePath)) {
			fs.rmSync(localDeletePath, { recursive: true, force: true });
			console.log('✓ Local test files cleaned up');
		}

		return {
			success: testSuccess,
			message: testSuccess ? 'Test cases executed successfully' : 'Tests execution failed',
			test_results: parsedResults,
			full_terminal_output: fullOutput
		};

	} catch (error: any) {
		console.error('Error in verifyReact:', error);
		if (fs.existsSync(localDeletePath)) {
			fs.rmSync(localDeletePath, { recursive: true, force: true });
		}
		throw error;
	} finally {
		await unhideTestFolder(project_path, '**/src/testcase', 'reactapp/src/testcase');
	}
}
