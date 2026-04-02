import * as vscode from 'vscode';

export interface QuestionData {
    id?: number;
    title?: string;
    description?: string;
    question?: string;
    content?: string;
    difficulty?: string;
    points?: number;
    time_limit?: number;
    input_format?: string;
    output_format?: string;
    constraints?: string;
    sample_input?: string;
    sample_output?: string;
    examples?: Array<{ input: string; output: string; explanation?: string }>;
    tags?: string[];
    // Catch-all for any extra fields
    [key: string]: any;
}

export function getQuestionHtml(
    webview: vscode.Webview,
    question: QuestionData
): string {
    const nonce = getNonce();

    // Extract the question text from whichever field the API uses
    const title = question.title || question.name || `Question #${question.id || ''}`;
    const description = question.description || question.question || question.content || '';
    const difficulty = question.difficulty || question.level || '';
    const points = question.points || question.marks || question.score || 0;
    const timeLimit = question.time_limit || question.duration || 0;

    // Build examples HTML
    let examplesHtml = '';
    if (question.examples && question.examples.length > 0) {
        examplesHtml = question.examples.map((ex, i) => `
            <div class="example">
                <h3>Example ${i + 1}</h3>
                <div class="io-block">
                    <div class="io-label">Input:</div>
                    <pre class="io-content">${escapeHtml(ex.input)}</pre>
                </div>
                <div class="io-block">
                    <div class="io-label">Output:</div>
                    <pre class="io-content">${escapeHtml(ex.output)}</pre>
                </div>
                ${ex.explanation ? `<div class="io-block"><div class="io-label">Explanation:</div><p class="explanation">${escapeHtml(ex.explanation)}</p></div>` : ''}
            </div>
        `).join('');
    } else if (question.sample_input || question.sample_output) {
        examplesHtml = `
            <div class="example">
                <h3>Sample</h3>
                ${question.sample_input ? `<div class="io-block"><div class="io-label">Input:</div><pre class="io-content">${escapeHtml(question.sample_input)}</pre></div>` : ''}
                ${question.sample_output ? `<div class="io-block"><div class="io-label">Output:</div><pre class="io-content">${escapeHtml(question.sample_output)}</pre></div>` : ''}
            </div>
        `;
    }

    // Difficulty badge color
    const diffColors: Record<string, string> = {
        'easy': '#4caf50', 'medium': '#ff9800', 'hard': '#f44336',
        'beginner': '#4caf50', 'intermediate': '#ff9800', 'advanced': '#f44336'
    };
    const diffColor = diffColors[difficulty.toLowerCase()] || '#2196f3';

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta http-equiv="Content-Security-Policy"
        content="default-src 'none'; style-src 'nonce-${nonce}'; script-src 'nonce-${nonce}'; img-src ${webview.cspSource} https: data:;">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${escapeHtml(title)}</title>
    <style nonce="${nonce}">
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        body {
            font-family: 'Inter', var(--vscode-font-family), system-ui, sans-serif;
            background: var(--vscode-editor-background, #1e1e2e);
            color: var(--vscode-editor-foreground, #cdd6f4);
            padding: 24px 32px;
            line-height: 1.7;
            overflow-y: auto;
        }

        .header {
            display: flex;
            align-items: flex-start;
            justify-content: space-between;
            margin-bottom: 24px;
            padding-bottom: 20px;
            border-bottom: 1px solid var(--vscode-panel-border, #313244);
        }

        .header-left { flex: 1; }

        h1 {
            font-size: 22px;
            font-weight: 700;
            color: var(--vscode-foreground, #cdd6f4);
            margin-bottom: 10px;
            line-height: 1.3;
        }

        .meta {
            display: flex;
            gap: 10px;
            flex-wrap: wrap;
            align-items: center;
        }

        .badge {
            padding: 3px 10px;
            border-radius: 12px;
            font-size: 11px;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }

        .badge-difficulty {
            background: ${diffColor}22;
            color: ${diffColor};
            border: 1px solid ${diffColor}44;
        }

        .badge-points {
            background: #f59e0b22;
            color: #f59e0b;
            border: 1px solid #f59e0b44;
        }

        .badge-time {
            background: #6366f122;
            color: #818cf8;
            border: 1px solid #6366f144;
        }

        .badge-tag {
            background: var(--vscode-input-background, #313244);
            color: var(--vscode-descriptionForeground, #a6adc8);
            border: 1px solid var(--vscode-input-border, #45475a);
        }

        .section {
            margin-bottom: 24px;
        }

        .section h2 {
            font-size: 15px;
            font-weight: 600;
            color: var(--vscode-foreground, #cdd6f4);
            margin-bottom: 10px;
            display: flex;
            align-items: center;
            gap: 8px;
        }

        .section h2::before {
            content: '';
            width: 3px;
            height: 16px;
            background: var(--vscode-button-background, #89b4fa);
            border-radius: 2px;
        }

        .description {
            font-size: 14px;
            color: var(--vscode-editor-foreground, #cdd6f4);
            line-height: 1.8;
            white-space: pre-wrap;
        }

        .example {
            background: var(--vscode-input-background, #313244);
            border: 1px solid var(--vscode-input-border, #45475a);
            border-radius: 8px;
            padding: 16px;
            margin-bottom: 12px;
        }

        .example h3 {
            font-size: 13px;
            font-weight: 600;
            color: var(--vscode-descriptionForeground, #a6adc8);
            margin-bottom: 12px;
        }

        .io-block {
            margin-bottom: 10px;
        }

        .io-label {
            font-size: 11px;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            color: var(--vscode-descriptionForeground, #a6adc8);
            margin-bottom: 4px;
        }

        .io-content {
            background: var(--vscode-editor-background, #1e1e2e);
            border: 1px solid var(--vscode-panel-border, #45475a);
            border-radius: 6px;
            padding: 10px 14px;
            font-family: 'Cascadia Code', 'Fira Code', monospace;
            font-size: 13px;
            line-height: 1.5;
            white-space: pre-wrap;
            overflow-x: auto;
        }

        .explanation {
            font-size: 13px;
            color: var(--vscode-descriptionForeground, #a6adc8);
            font-style: italic;
        }

        .constraints {
            background: #f4433611;
            border: 1px solid #f4433633;
            border-radius: 8px;
            padding: 14px 18px;
            font-family: monospace;
            font-size: 13px;
            white-space: pre-wrap;
            line-height: 1.6;
        }

        .raw-data {
            margin-top: 32px;
            padding-top: 20px;
            border-top: 1px solid var(--vscode-panel-border, #313244);
        }

        .raw-data summary {
            font-size: 12px;
            color: var(--vscode-descriptionForeground, #a6adc8);
            cursor: pointer;
            padding: 6px 0;
        }

        .raw-data pre {
            background: var(--vscode-input-background, #313244);
            border-radius: 6px;
            padding: 12px;
            font-size: 11px;
            overflow-x: auto;
            margin-top: 8px;
            max-height: 300px;
            overflow-y: auto;
        }
    </style>
</head>
<body>

    <div class="header">
        <div class="header-left">
            <h1>${escapeHtml(title)}</h1>
            <div class="meta">
                ${difficulty ? `<span class="badge badge-difficulty">${escapeHtml(difficulty)}</span>` : ''}
                ${points ? `<span class="badge badge-points">🏆 ${points} Points</span>` : ''}
                ${timeLimit ? `<span class="badge badge-time">⏱ ${timeLimit} min</span>` : ''}
                ${(question.tags || []).map((t: string) => `<span class="badge badge-tag">${escapeHtml(t)}</span>`).join('')}
            </div>
        </div>
    </div>

    ${description ? `
    <div class="section">
        <h2>Problem Statement</h2>
        <div class="description">${formatDescription(description)}</div>
    </div>
    ` : ''}

    ${question.input_format ? `
    <div class="section">
        <h2>Input Format</h2>
        <div class="description">${escapeHtml(question.input_format)}</div>
    </div>
    ` : ''}

    ${question.output_format ? `
    <div class="section">
        <h2>Output Format</h2>
        <div class="description">${escapeHtml(question.output_format)}</div>
    </div>
    ` : ''}

    ${examplesHtml ? `
    <div class="section">
        <h2>Examples</h2>
        ${examplesHtml}
    </div>
    ` : ''}

    ${question.constraints ? `
    <div class="section">
        <h2>Constraints</h2>
        <div class="constraints">${escapeHtml(question.constraints)}</div>
    </div>
    ` : ''}

    <div class="raw-data">
        <details>
            <summary>📋 View Raw Question Data</summary>
            <pre>${escapeHtml(JSON.stringify(question, null, 2))}</pre>
        </details>
    </div>

    <script nonce="${nonce}">
        const vscode = acquireVsCodeApi();
    </script>
</body>
</html>`;
}

function escapeHtml(text: string): string {
    return String(text)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function formatDescription(text: string): string {
    // Convert markdown-like formatting to basic HTML
    let html = escapeHtml(text);
    // Bold: **text** or __text__
    html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/__(.+?)__/g, '<strong>$1</strong>');
    // Italic: *text* or _text_
    html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');
    // Code: `text`
    html = html.replace(/`(.+?)`/g, '<code style="background:var(--vscode-input-background);padding:2px 6px;border-radius:3px;font-size:12px;">$1</code>');
    // Line breaks
    html = html.replace(/\n/g, '<br>');
    return html;
}

function getNonce(): string {
    let text = '';
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    for (let i = 0; i < 32; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
}
