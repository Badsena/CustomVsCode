
import * as net from 'net';
import * as fs from 'fs';
import * as path from 'path';

export class PortResolver {
    private static instance: PortResolver;

    private constructor() {}

    public static getInstance(): PortResolver {
        if (!PortResolver.instance) {
            PortResolver.instance = new PortResolver();
        }
        return PortResolver.instance;
    }

    /**
     * Resolves the active port for a given project.
     * Tries to be framework-aware by checking common configs and .env files.
     */
    public async resolve(projectPath: string, _type: string): Promise<number> {
        // 1. Try to parse from configuration files
        const configPort = this.tryGetPortFromConfig(projectPath, _type);
        if (configPort !== undefined && await this.isPortActive(configPort)) {
            return configPort;
        }

        // 2. Try common environment variables
        const envPort = this.tryGetPortFromEnv(projectPath);
        if (envPort !== undefined && await this.isPortActive(envPort)) {
            return envPort;
        }

        // 3. Fallback to heuristic scan
        const defaultPort = this.getDefaultPort(_type);
        const activePort = await this.findActivePort(defaultPort);
        
        return activePort || defaultPort;
    }

    private tryGetPortFromConfig(projectPath: string, _type: string): number | undefined {
        try {
            // Simplified logic: Search for common port patterns in config files
            const configFiles = ['vite.config.ts', 'vite.config.js', 'next.config.js', 'package.json'];
            for (const file of configFiles) {
                const filePath = path.join(projectPath, file);
                if (fs.existsSync(filePath)) {
                    const content = fs.readFileSync(filePath, 'utf8');
                    const match = content.match(/port[:\s]+(\d+)/i);
                    if (match) return parseInt(match[1]);
                }
            }
        } catch (e) {
            console.error(`PortResolver: Error parsing config: ${e}`);
        }
        return undefined;
    }

    private tryGetPortFromEnv(projectPath: string): number | undefined {
        try {
            const envPath = path.join(projectPath, '.env');
            if (fs.existsSync(envPath)) {
                const content = fs.readFileSync(envPath, 'utf8');
                const match = content.match(/PORT=(\d+)/i);
                if (match) return parseInt(match[1]);
            }
        } catch (e) {
            console.error(`PortResolver: Error parsing .env: ${e}`);
        }
        return undefined;
    }

    private async findActivePort(basePort: number): Promise<number | undefined> {
        const scanRange = [basePort, 3000, 5173, 8000, 8080, 4200];
        // Remove duplicates and maintain priority
        const uniquePorts = Array.from(new Set(scanRange));
        
        for (const port of uniquePorts) {
            if (await this.isPortActive(port)) return port;
        }
        return undefined;
    }

    private isPortActive(port: number): Promise<boolean> {
        return new Promise((resolve) => {
            const server = net.createServer();
            server.once('error', (err: NodeJS.ErrnoException) => {
                resolve(err.code === 'EADDRINUSE');
            });
            server.once('listening', () => {
                server.close();
                resolve(false);
            });
            server.listen(port, '127.0.0.1');
        });
    }

    private getDefaultPort(type: string): number {
        switch (type.toLowerCase()) {
            case 'vite': return 5173;
            case 'next': return 3000;
            case 'django': return 8000;
            default: return 3000;
        }
    }
}
