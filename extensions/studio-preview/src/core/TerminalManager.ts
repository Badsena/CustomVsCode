import * as vscode from 'vscode';
import { ProjectInfo } from './ProjectDetector';
 
export enum TerminalStatus {
    Starting = 'starting',
    Running = 'running',
    Stopped = 'stopped',
    Error = 'error'
}
 
export class TerminalManager {
    private terminal: vscode.Terminal | undefined;
    private _isRunning: boolean = false;
    private _onStatusChange = new vscode.EventEmitter<TerminalStatus>();
    public readonly onStatusChange = this._onStatusChange.event;
 
    constructor() {
        vscode.window.onDidCloseTerminal((t) => {
            if (t === this.terminal || t.name === "Amypo Browser Runner") {
                this.terminal = undefined;
                this._isRunning = false;
                this._onStatusChange.fire(TerminalStatus.Stopped);
                vscode.commands.executeCommand('setContext', 'amypo.serverRunning', false);
            }
        });
    }
 
    public get isRunning(): boolean {
        // Double check terminal existence and status
        if (this._isRunning && (!this.terminal || this.terminal.exitStatus !== undefined)) {
            this._isRunning = false;
            vscode.commands.executeCommand('setContext', 'amypo.serverRunning', false);
        }
        return this._isRunning;
    }
 
    /**
     * Starts the dev server for the given project.
     * Synchronized with the new ProjectDetector API.
     */
    public async startServer(project: ProjectInfo): Promise<void> {
        if (!project.startCommand) {
            console.log('[TerminalManager] No start command, skipping terminal execution');
            return;
        }
 
        this._onStatusChange.fire(TerminalStatus.Starting);
 
        // Resilient terminal creation
        if (!this.terminal || this.terminal.exitStatus !== undefined) {
            this.terminal = vscode.window.terminals.find(t => t.name === "Amypo Browser Runner");
            
            if (!this.terminal) {
                this.terminal = vscode.window.createTerminal({
                    name: "Amypo Browser Runner",
                    cwd: project.rootPath
                });
                // Give PowerShell 1 second to initialize to prevent stack overflow crash -1073741510
                await new Promise<void>(resolve => setTimeout(resolve, 1000));
            }
        }
 
        try {
            // Focus terminal so user can see logs
            this.terminal!.show(false); 
 
            // Interrupt any current process safely
            this.terminal!.sendText('\u0003', true); 
            
            // Execute the detector's provided command
            this.terminal!.sendText(project.startCommand);
            
            this._isRunning = true;
            this._onStatusChange.fire(TerminalStatus.Running);
            vscode.commands.executeCommand('setContext', 'amypo.serverRunning', true);
        } catch (err) {
            console.error('[TerminalManager] Error starting server:', err);
            this._onStatusChange.fire(TerminalStatus.Error);
            this._isRunning = false;
        }
    }
 
    public stop() {
        if (this.terminal) {
            try {
                this.terminal.sendText('\u0003');
                this.terminal.dispose();
            } catch (_e) {}
            this.terminal = undefined;
            this._isRunning = false;
            this._onStatusChange.fire(TerminalStatus.Stopped);
            vscode.commands.executeCommand('setContext', 'amypo.serverRunning', false);
        }
    }
 
    public dispose() {
        this.stop();
    }
}
