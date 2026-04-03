/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';

export function getQuestionTemplate(webview: vscode.Webview, extensionUri: vscode.Uri): string {
    const nonce = getNonce();

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src ${webview.cspSource}; style-src ${webview.cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}';">
    <style>
        :root {
            --padding: 20px;
            --header-bg: var(--vscode-sideBar-background, #1e1e1e);
            --border-color: var(--vscode-panel-border, #333);
            --accent-color: #00ce7a;
            --text-color: var(--vscode-editor-foreground, #cccccc);
            --muted-color: var(--vscode-descriptionForeground, #888888);
            --code-bg: var(--vscode-textCodeBlock-background, #252526);
        }

        body {
            background-color: var(--vscode-editor-background, #121212);
            color: var(--text-color);
            font-family: var(--vscode-font-family, 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif);
            margin: 0;
            padding: 0;
            line-height: 1.6;
            overflow-x: hidden;
        }

        header {
            padding: 12px 16px;
            border-bottom: 1px solid var(--border-color);
            display: flex;
            align-items: center;
            gap: 8px;
            position: sticky;
            top: 0;
            background: var(--vscode-editor-background);
            z-index: 100;
        }

        .header-title {
            font-size: 11px;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            color: var(--muted-color);
        }

        .container {
            padding: var(--padding);
        }

        .status-badge {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            background-color: #E8F5E9;
            color: #2E7D32;
            padding: 4px 12px;
            border-radius: 16px;
            display: inline-flex;
            align-items: center;
            gap: 6px;
            font-size: 11px;
            font-weight: 600;
            margin-bottom: 20px;
            border: 1px solid #C8E6C9;
        }

        .status-badge svg {
            fill: currentColor;
        }

        h1 {
            font-size: 20px;
            font-weight: 700;
            margin: 0 0 16px 0;
            color: var(--vscode-editor-foreground);
        }

        p {
            font-size: 14px;
            margin-bottom: 24px;
            color: var(--text-color);
        }

        h2 {
            font-size: 15px;
            font-weight: 600;
            margin: 32px 0 12px 0;
            color: var(--vscode-editor-foreground);
        }

        .code-block {
            background: var(--code-bg);
            padding: 16px;
            border-radius: 8px;
            font-family: var(--vscode-editor-font-family, 'Courier New', Courier, monospace);
            font-size: 13px;
            margin-bottom: 16px;
        }

        .code-line {
            display: flex;
            gap: 12px;
        }

        .code-key { color: var(--accent-color); }
        .code-val { color: #f14c4c; }

        .sidebar-section {
            margin-top: 40px;
            border-top: 1px solid var(--border-color);
        }

        .section-header {
            display: flex;
            align-items: center;
            gap: 8px;
            padding: 10px 0;
            font-size: 11px;
            font-weight: 600;
            text-transform: uppercase;
            color: var(--muted-color);
            cursor: pointer;
        }

        .section-header svg {
            transform: rotate(-90deg);
            transition: transform 0.2s;
        }

        .section-header.active svg {
            transform: rotate(0deg);
        }

    </style>
</head>
<body>
    <!-- Top Right Native-Looking Window Controls -->
    <div style="position: absolute; top: 12px; right: 12px; display: flex; gap: 8px;">
        <button onclick="minimize()" style="background: transparent; border: 1px solid #ccc; border-radius: 4px; cursor: pointer; padding: 4px;" title="Minimize Question">
            <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                <rect x="2" y="7" width="12" height="2"/>
            </svg>
        </button>
        <button onclick="maximize()" style="background: transparent; border: 1px solid #ccc; border-radius: 4px; cursor: pointer; padding: 4px;" title="Maximize Question">
            <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                <path d="M2 2v12h12V2H2zm1 1h10v10H3V3z"/>
            </svg>
        </button>
    </div>

    <script nonce="${nonce}">
        const vscode = acquireVsCodeApi();
        function minimize() {
            vscode.postMessage({ command: 'minimize' });
        }
        function maximize() {
            vscode.postMessage({ command: 'maximize' });
        }
    </script>

    <div class="container">
        <div class="status-badge">
            <svg width="14" height="14" viewBox="0 0 16 16">
                <path d="M13.854 3.646l-7.354 7.354-3.354-3.354.708-.708 2.646 2.646 6.646-6.646.708.708z"/>
            </svg>
            Two Sum Problem
        </div>

        <h1 style="margin-bottom: 24px;">Two Sum Problem</h1>

        <p style="color: var(--vscode-descriptionForeground); font-size: 13.5px; opacity: 0.9;">
            Given an array of integers <strong>nums</strong> and an integer <strong>target</strong>, 
            return the indices of the two numbers such that they add up to target.
        </p>

        <h2 style="margin-top: 32px; border-bottom: none; font-size: 14px;">Input:</h2>
        
        <div class="code-block" style="margin-top: 12px; line-height: 1.8;">
            <div class="code-line">
                <span class="code-key">nums</span>
                <span style="color: var(--muted-color); padding: 0 4px;">=</span>
                <span class="code-val">[2, 7, 11, 15]</span>
            </div>
            <div class="code-line">
                <span class="code-key">target</span>
                <span style="color: var(--muted-color); padding: 0 4px;">=</span>
                <span class="code-val">9</span>
            </div>
        </div>

        <div class="sidebar-section" style="margin-top: 48px; border-top: 1px solid var(--border-color);">
            <div class="section-header" style="justify-content: space-between; padding-right: 8px;">
                <div style="display: flex; align-items: center; gap: 8px;">
                    <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
                        <path d="M6 4l4 4-4 4L6 4z"/>
                    </svg>
                    OUTLINE
                </div>
            </div>
            <div class="section-header" style="justify-content: space-between; padding-right: 8px;">
                <div style="display: flex; align-items: center; gap: 8px;">
                    <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
                        <path d="M6 4l4 4-4 4L6 4z"/>
                    </svg>
                    TIMELINE
                </div>
            </div>
        </div>
    </div>

    <script nonce="${nonce}">
        // Script logic for interactions
    </script>
</body>
</html>`;
}

function getNonce() {
    let text = '';
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    for (let i = 0; i < 32; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
}
