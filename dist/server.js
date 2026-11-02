import http from 'node:http';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { extractFigmaNode } from './figma-client.js';
import { processAndBenchmark } from './serializer.js';
export function createAppServer(options = {}) {
    const maxBodyBytes = options.maxBodyBytes ?? 20 * 1024 * 1024; // Default 20 MB
    const apiKey = options.apiKey ?? process.env.API_KEY;
    const server = http.createServer((req, res) => {
        // CORS headers
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-API-Key, X-Figma-Token');
        if (req.method === 'OPTIONS') {
            res.writeHead(204);
            res.end();
            return;
        }
        if (req.method === 'GET' && req.url === '/health') {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ status: 'ok', service: 'figma-spec-compressor', version: '1.1.0' }));
            return;
        }
        if (req.method === 'POST' && req.url === '/api/compress') {
            // API Key Authentication Guard (if configured)
            if (apiKey) {
                const authHeader = req.headers['authorization'];
                const customKey = req.headers['x-api-key'];
                const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : customKey;
                if (!token || token !== apiKey) {
                    res.writeHead(401, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: 'Unauthorized: Invalid or missing API key' }));
                    return;
                }
            }
            let totalBytes = 0;
            const chunks = [];
            let isExceeded = false;
            req.on('error', () => {
                // Safe guard against destroyed/aborted requests
            });
            req.on('data', (chunk) => {
                if (isExceeded)
                    return;
                totalBytes += chunk.length;
                if (totalBytes > maxBodyBytes) {
                    isExceeded = true;
                    res.writeHead(413, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: 'Payload Too Large' }));
                    req.destroy();
                    return;
                }
                chunks.push(chunk);
            });
            req.on('end', () => {
                if (isExceeded)
                    return;
                try {
                    const body = Buffer.concat(chunks).toString('utf-8');
                    const rawJson = JSON.parse(body);
                    const node = extractFigmaNode(rawJson);
                    const result = processAndBenchmark(node);
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify(result));
                }
                catch (err) {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: err?.message || 'Invalid JSON input' }));
                }
            });
            return;
        }
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Not Found' }));
    });
    return server;
}
const isDirectRun = Boolean(process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url));
if (isDirectRun) {
    const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3001;
    const HOST = process.env.HOST || '127.0.0.1'; // Safe default: bind to localhost
    const server = createAppServer();
    server.listen(PORT, HOST, () => {
        console.log(`[Figma-Spec-Compressor] HTTP Server listening on http://${HOST}:${PORT}`);
    });
}
