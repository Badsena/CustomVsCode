/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as fs from 'fs';
import * as path from 'path';
import * as net from 'net';

export interface ProjectInfo {
	type: string;
	category: 'frontend' | 'backend' | 'static';
	rootPath: string;
	port: number;
	startCommand: string;
	label: string;
}

export class ProjectDetector {
	/**
	 * Scans the workspace root and returns an array of categorized ProjectInfo objects.
	 */
	public async detect(workspaceRoot: string | undefined): Promise<ProjectInfo[]> {
		const projects: ProjectInfo[] = [];
		if (!workspaceRoot || !fs.existsSync(workspaceRoot)) {
			return projects;
		}

		// 1. Check Root
		const rootInfos = await this._scanDirectory(workspaceRoot);
		projects.push(...rootInfos);

		// 2. Search Subfolders (1 level deep)
		try {
			const entries = await fs.promises.readdir(workspaceRoot, { withFileTypes: true });
			for (const entry of entries) {
				if (entry.isDirectory() && !['node_modules', '.git', 'dist', 'out', 'build', 'public', 'src', 'assets', '.vscode', '.next', '.nuxt'].includes(entry.name)) {
					const subPath = path.join(workspaceRoot, entry.name);
					const subInfos = await this._scanDirectory(subPath);
					for (const subInfo of subInfos) {
						const exists = projects.some(p => p.port === subInfo.port && p.type === subInfo.type);
						if (!exists) projects.push(subInfo);
					}
				}
			}
		} catch (e) {
			console.error('[ProjectDetector] Error reading directory:', e);
		}

		return projects;
	}

	private async _scanDirectory(dirPath: string): Promise<ProjectInfo[]> {
		let pkg: any = {};
		const pkgPath = path.join(dirPath, 'package.json');
		try {
			await fs.promises.access(pkgPath);
			pkg = JSON.parse(await fs.promises.readFile(pkgPath, 'utf8'));
		} catch { }
		const deps = { ...pkg.dependencies, ...pkg.devDependencies, ...pkg.peerDependencies };

		const found: ProjectInfo[] = [];

		// ── FRONTEND ────────────────────────────────────────────────────────
		if (deps['react-scripts'] || deps['react']) {
			found.push({ type: 'react', category: 'frontend', rootPath: dirPath, port: this._readPortFromEnv(dirPath) ?? 3000, startCommand: deps['react-scripts'] ? 'npm start' : 'npm run dev', label: 'React UI' });
		} else if (deps['vue-cli'] || deps['@vue/cli-service'] || deps['vue']) {
			found.push({ type: 'vue', category: 'frontend', rootPath: dirPath, port: this._readPortFromEnv(dirPath) ?? 8080, startCommand: deps['@vue/cli-service'] ? 'npm run serve' : 'npm run dev', label: 'Vue UI' });
		} else if (deps['svelte'] || this._hasFile(dirPath, 'svelte.config.js')) {
			found.push({ type: 'svelte', category: 'frontend', rootPath: dirPath, port: this._readPortFromEnv(dirPath) ?? 5173, startCommand: 'npm run dev', label: 'Svelte UI' });
		} else if (this._hasFile(dirPath, 'angular.json')) {
			found.push({ type: 'angular', category: 'frontend', rootPath: dirPath, port: this._readPortFromEnv(dirPath) ?? 4200, startCommand: 'npx ng serve', label: 'Angular UI' });
		} else if (this._hasFile(dirPath, 'index.html')) {
			found.push({ type: 'static', category: 'frontend', rootPath: dirPath, port: 5500, startCommand: 'npx live-server --port=5500', label: 'Static UI' });
		}

		// ── BACKEND ─────────────────────────────────────────────────────────
		if (this._hasFile(dirPath, 'server.js') || this._hasFile(dirPath, 'app.js') || deps['express']) {
			const entry = this._hasFile(dirPath, 'server.js') ? 'server.js' : (this._hasFile(dirPath, 'app.js') ? 'app.js' : 'index.js');
			found.push({ type: 'node', category: 'backend', rootPath: dirPath, port: this._readPortFromEnv(dirPath) ?? 3000, startCommand: `node ${entry}`, label: 'Node API' });
		}

		if (this._hasFile(dirPath, 'app.py') || this._hasFile(dirPath, 'main.py')) {
			const file = this._hasFile(dirPath, 'app.py') ? 'app.py' : 'main.py';
			const isFastApi = deps['fastapi'] || (await this._containsText(path.join(dirPath, file), 'FastAPI'));
			found.push({
				type: isFastApi ? 'fastapi' : 'python', category: 'backend',
				rootPath: dirPath, port: this._readPortFromEnv(dirPath) ?? (isFastApi ? 8000 : 5000),
				startCommand: isFastApi ? `uvicorn ${file.split('.')[0]}:app --reload` : `python ${file}`,
				label: isFastApi ? 'FastAPI' : 'Python API'
			});
		} else if (this._hasFile(dirPath, 'manage.py')) {
			found.push({ type: 'django', category: 'backend', rootPath: dirPath, port: this._readPortFromEnv(dirPath) ?? 8000, startCommand: 'python manage.py runserver', label: 'Django API' });
		}

		if (this._hasFile(dirPath, 'go.mod') || this._hasFile(dirPath, 'main.go')) {
			found.push({ type: 'go', category: 'backend', rootPath: dirPath, port: this._readPortFromEnv(dirPath) ?? 8080, startCommand: 'go run .', label: 'Go API' });
		}

		if (this._hasFile(dirPath, 'pom.xml')) {
			const springPort = this._readSpringBootPort(dirPath)
				?? this._readPortFromEnv(dirPath)
				?? 8080;
			found.push({
				type: 'java', category: 'backend',
				rootPath: dirPath, port: springPort,
				startCommand: 'mvn spring-boot:run',
				label: 'Spring Boot API'
			});
		}

		if (this._hasFile(dirPath, 'artisan')) {
			found.push({ type: 'laravel', category: 'backend', rootPath: dirPath, port: this._readPortFromEnv(dirPath) ?? 8000, startCommand: 'php artisan serve', label: 'Laravel API' });
		} else if (this._hasFile(dirPath, 'index.php') || this._hasFile(dirPath, 'Gemfile')) {
			if (this._hasFile(dirPath, 'Gemfile')) {
				found.push({ type: 'rails', category: 'backend', rootPath: dirPath, port: this._readPortFromEnv(dirPath) ?? 3000, startCommand: 'bundle exec rails server', label: 'Rails API' });
			} else {
				found.push({ type: 'php', category: 'backend', rootPath: dirPath, port: this._readPortFromEnv(dirPath) ?? 8080, startCommand: 'php -S localhost:8080', label: 'PHP Server' });
			}
		}

		return found;
	}

	private _readSpringBootPort(root: string): number | undefined {
		const files = [
			path.join(root, 'src', 'main', 'resources', 'application.properties'),
			path.join(root, 'src', 'main', 'resources', 'application.yml'),
			path.join(root, 'src', 'main', 'resources', 'application.yaml'),
			path.join(root, 'application.properties'),
		];

		for (const filePath of files) {
			if (!fs.existsSync(filePath)) continue;
			try {
				const content = fs.readFileSync(filePath, 'utf8');
				// .properties format
				const propMatch = content.match(/^server\.port\s*=\s*(\d+)/m);
				if (propMatch) return parseInt(propMatch[1], 10);
				// .yml format
				const ymlMatch = content.match(/^\s*port\s*:\s*(\d+)/m);
				if (ymlMatch) return parseInt(ymlMatch[1], 10);
			} catch { continue; }
		}
		return undefined;
	}

	private async _containsText(filepath: string, text: string): Promise<boolean> {
		try {
			const content = await fs.promises.readFile(filepath, 'utf8');
			return content.includes(text);
		} catch { return false; }
	}

	public async resolveUrl(info: ProjectInfo): Promise<string> {
		if (await this._waitForPort(info.port, 5)) {
			return `http://localhost:${info.port}`;
		}
		const commonPorts = [5173, 5174, 3000, 3001, 8000, 8080, 5500];
		for (const p of commonPorts) {
			if (p === info.port) continue;
			if (await this._isPortOpen(p)) return `http://localhost:${p}`;
		}
		return `http://localhost:${info.port}`;
	}

	private async _waitForPort(port: number, retries: number): Promise<boolean> {
		for (let i = 0; i < retries; i++) {
			if (await this._isPortOpen(port)) return true;
			await this._sleep(300);
		}
		return false;
	}

	private _isPortOpen(port: number): Promise<boolean> {
		return new Promise((resolve) => {
			const socket = new net.Socket();
			socket.setTimeout(150);
			socket.on('connect', () => { socket.destroy(); resolve(true); });
			socket.on('error', () => { socket.destroy(); resolve(false); });
			socket.on('timeout', () => { socket.destroy(); resolve(false); });
			socket.connect(port, '127.0.0.1');
		});
	}

	private _hasFile(root: string, filename: string): boolean {
		return fs.existsSync(path.join(root, filename));
	}

	private _readPortFromEnv(root: string): number | undefined {
		const envPath = path.join(root, '.env');
		if (!fs.existsSync(envPath)) return undefined;
		try {
			const c = fs.readFileSync(envPath, 'utf8');
			const m = c.match(/^PORT\s*=\s*(\d+)/m);
			return m ? parseInt(m[1], 10) : undefined;
		} catch { return undefined; }
	}

	private _sleep(ms: number): Promise<void> { return new Promise(r => setTimeout(r, ms)); }
}
