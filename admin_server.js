/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 3000;
const JSON_FILE = path.join(__dirname, 'amypo-extensions.json');

// Read extensions from local JSON file
function readExtensions() {
    try {
        const raw = fs.readFileSync(JSON_FILE, 'utf-8');
        return JSON.parse(raw);
    } catch (err) {
        console.error('[Server] Error reading JSON file:', err.message);
        return { status: 200, message: 'Fallback', datas: [] };
    }
}

// Write extensions to local JSON file
function writeExtensions(data) {
    fs.writeFileSync(JSON_FILE, JSON.stringify(data, null, 4), 'utf-8');
    console.log(`[Server] Saved ${data.datas.length} extensions to amypo-extensions.json`);
}

const server = http.createServer((req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }

    // Serve Admin HTML
    if (req.url === '/' || req.url === '/index.html') {
        const filePath = path.join(__dirname, 'amypo-extension-admin.html');
        fs.readFile(filePath, (err, content) => {
            if (err) {
                res.writeHead(500);
                res.end('Error loading HTML.');
                return;
            }
            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.end(content, 'utf-8');
        });
        return;
    }

    // GET: Return current extensions from JSON file
    if (req.method === 'GET' && req.url === '/api/sandbox/extension_details') {
        const data = readExtensions();
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(data));
        return;
    }

    // POST: Add extension
    if (req.method === 'POST' && req.url === '/api/sandbox/add_extension') {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', () => {
            try {
                const { extension_id } = JSON.parse(body);
                const data = readExtensions();

                if (!data.datas.includes(extension_id)) {
                    data.datas.push(extension_id);
                    writeExtensions(data);
                }

                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ status: 200, message: `Added ${extension_id}` }));
            } catch (err) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ status: 400, message: err.message }));
            }
        });
        return;
    }

    // DELETE: Remove extension
    if (req.method === 'DELETE' && req.url === '/api/sandbox/remove_extension') {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', () => {
            try {
                const { extension_id } = JSON.parse(body);
                const data = readExtensions();

                data.datas = data.datas.filter(id => id !== extension_id);
                writeExtensions(data);

                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ status: 200, message: `Removed ${extension_id}` }));
            } catch (err) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ status: 400, message: err.message }));
            }
        });
        return;
    }

    res.writeHead(404);
    res.end('Not found');
});

server.listen(PORT, () => {
    console.log(`\n======================================================`);
    console.log(`✅ Local JSON API running at: http://localhost:${PORT}`);
    console.log(`📄 Data file: amypo-extensions.json`);
    console.log(`======================================================`);
    console.log(`\nEndpoints:`);
    console.log(`  GET  /api/sandbox/extension_details  → Read list`);
    console.log(`  POST /api/sandbox/add_extension      → Add extension`);
    console.log(`  DELETE /api/sandbox/remove_extension  → Remove extension`);
    console.log(`\nAdmin Panel: http://localhost:${PORT}\n`);
});
