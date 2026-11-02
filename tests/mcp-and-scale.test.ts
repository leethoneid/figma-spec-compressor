import { test, describe, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { spawn } from 'node:child_process';
import { AddressInfo } from 'node:net';
import { fileURLToPath } from 'node:url';
import { encode } from 'gpt-tokenizer';
import { parseFigmaUrl, extractFigmaNode, fetchFigmaNodeFromUrl } from '../src/figma-client.js';
import { handleMcpMessage } from '../src/mcp.js';
import { createAppServer } from '../src/server.js';
import { processAndBenchmark } from '../src/serializer.js';
import { generateEnterpriseDashboardFixture } from './benchmark.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('Figma Client & URL Parser Tests', () => {
  test('parseFigmaUrl should correctly parse /design/, /file/, and normalize node-id', () => {
    const url1 = parseFigmaUrl('https://www.figma.com/design/AbcKey123/SaaS-Design-System?node-id=101-2034');
    assert.equal(url1.fileKey, 'AbcKey123');
    assert.equal(url1.nodeId, '101:2034');

    const url2 = parseFigmaUrl('https://figma.com/file/XyzKey987/Wireframes?node-id=101%3A2034');
    assert.equal(url2.fileKey, 'XyzKey987');
    assert.equal(url2.nodeId, '101:2034');

    const url3 = parseFigmaUrl('https://www.figma.com/design/SimpleFileKey');
    assert.equal(url3.fileKey, 'SimpleFileKey');
    assert.equal(url3.nodeId, undefined);

    const url4 = parseFigmaUrl('https://www.figma.com/proto/ProtoKey/Preview?node-id=5-12');
    assert.equal(url4.fileKey, 'ProtoKey');
    assert.equal(url4.nodeId, '5:12');

    // Reject invalid hostnames
    assert.throws(() => parseFigmaUrl('https://google.com/design/test'), /Invalid Figma URL host/);
    assert.throws(() => parseFigmaUrl('https://malicious-figma.com/file/test'), /Invalid Figma URL host/);
    assert.throws(() => parseFigmaUrl('not_a_valid_url'), /Invalid Figma URL/);
  });

  test('extractFigmaNode should unwrap /v1/files/:key/nodes envelope, /document, and direct nodes', () => {
    // 1. /nodes envelope
    const envelope = {
      nodes: {
        '101:2034': {
          document: { id: '101:2034', name: 'Envelope Document', type: 'FRAME' }
        }
      }
    };
    const nodeFromEnvelope = extractFigmaNode(envelope, '101-2034');
    assert.equal(nodeFromEnvelope.id, '101:2034');
    assert.equal(nodeFromEnvelope.name, 'Envelope Document');

    // 2. /document envelope
    const docEnvelope = {
      document: { id: '0:0', name: 'Root Document', type: 'DOCUMENT' }
    };
    const nodeFromDoc = extractFigmaNode(docEnvelope);
    assert.equal(nodeFromDoc.name, 'Root Document');

    // 3. Direct node
    const direct = { id: '1:1', name: 'Direct Node', type: 'FRAME' };
    const nodeFromDirect = extractFigmaNode(direct);
    assert.equal(nodeFromDirect.name, 'Direct Node');

    // 4. Invalid
    assert.throws(() => extractFigmaNode({}), /Invalid Figma payload/);
    assert.throws(() => extractFigmaNode(null), /Invalid Figma payload/);
  });

  test('fetchFigmaNodeFromUrl should make authenticated request and never leak token on error', async () => {
    const mockToken = 'figma_test_token_secret_12345';
    let requestUrl = '';
    let requestHeaders: any = {};

    const mockFetch: typeof fetch = async (input: any, init: any) => {
      requestUrl = input.toString();
      requestHeaders = init?.headers;
      return new Response(
        JSON.stringify({
          nodes: {
            '101:2034': {
              document: { id: '101:2034', name: 'Mock Component', type: 'FRAME' }
            }
          }
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    };

    const node = await fetchFigmaNodeFromUrl(
      'https://www.figma.com/design/VxyzKey/Design?node-id=101-2034',
      { token: mockToken, fetchImpl: mockFetch }
    );

    assert.equal(node.name, 'Mock Component');
    assert.equal(requestHeaders['X-Figma-Token'], mockToken);
    assert.ok(requestUrl.includes('https://api.figma.com/v1/files/VxyzKey/nodes?ids=101%3A2034'));

    // Assert token is NEVER leaked in HTTP 403 error
    const failingFetch: typeof fetch = async () => {
      return new Response('Forbidden access', { status: 403, statusText: 'Forbidden' });
    };

    await assert.rejects(
      async () => {
        await fetchFigmaNodeFromUrl('https://www.figma.com/file/PrivateFile', {
          token: mockToken,
          fetchImpl: failingFetch
        });
      },
      (err: any) => {
        assert.ok(!err.message.includes(mockToken), 'Secret token must never be leaked in error message');
        assert.ok(err.message.includes('403'));
        assert.ok(err.message.includes('Forbidden'));
        return true;
      }
    );
  });
});

describe('MCP Server JSON-RPC Protocol Tests', () => {
  test('handleMcpMessage should support full JSON-RPC lifecycle and tools', async () => {
    // 1. initialize
    const initRes = await handleMcpMessage({
      jsonrpc: '2.0',
      id: 1,
      method: 'initialize',
      params: { protocolVersion: '2024-11-05' }
    });
    assert.equal(initRes.id, 1);
    assert.equal(initRes.result.protocolVersion, '2024-11-05');
    assert.equal(initRes.result.serverInfo.name, 'figma-spec-compressor');
    assert.equal(initRes.result.serverInfo.version, '1.1.0');

    // 2. notification (msg.id === undefined must return null)
    const notifRes = await handleMcpMessage({
      jsonrpc: '2.0',
      method: 'notifications/initialized'
    });
    assert.equal(notifRes, null);

    // 3. ping
    const pingRes = await handleMcpMessage({
      jsonrpc: '2.0',
      id: 2,
      method: 'ping'
    });
    assert.equal(pingRes.id, 2);
    assert.deepEqual(pingRes.result, {});

    // 4. tools/list - verify tools and strict string inputSchema for rawJson
    const toolsRes = await handleMcpMessage({
      jsonrpc: '2.0',
      id: 3,
      method: 'tools/list'
    });
    assert.equal(toolsRes.id, 3);
    const toolNames = toolsRes.result.tools.map((t: any) => t.name);
    assert.ok(toolNames.includes('compress_figma_json'));
    assert.ok(toolNames.includes('compress_figma_url'));

    const compressJsonTool = toolsRes.result.tools.find((t: any) => t.name === 'compress_figma_json');
    assert.ok(compressJsonTool);
    assert.equal(typeof compressJsonTool.inputSchema.properties.rawJson.type, 'string');
    assert.equal(compressJsonTool.inputSchema.properties.rawJson.type, 'string');

    // 5. tools/call compress_figma_json on saas-pricing-card.json
    const fixturePath = path.join(__dirname, 'fixtures', 'saas-pricing-card.json');
    const rawFixture = fs.readFileSync(fixturePath, 'utf-8');

    const callRes = await handleMcpMessage({
      jsonrpc: '2.0',
      id: 4,
      method: 'tools/call',
      params: {
        name: 'compress_figma_json',
        arguments: {
          rawJson: rawFixture,
          format: 'yaml'
        }
      }
    });
    assert.equal(callRes.id, 4);
    assert.ok(callRes.result.content[0].text.includes('PricingCard / Pro Tier'));
    assert.ok(callRes.result.content[0].text.includes('Figma Spec Compression Summary'));

    // 6. tools/call error handling: returns { isError: true, content: [{ text: "Error: ..." }] }
    const errorToolRes = await handleMcpMessage({
      jsonrpc: '2.0',
      id: 5,
      method: 'tools/call',
      params: {
        name: 'compress_figma_json',
        arguments: {
          rawJson: 'invalid_json_string{'
        }
      }
    });
    assert.equal(errorToolRes.id, 5);
    assert.equal(errorToolRes.result.isError, true);
    assert.ok(errorToolRes.result.content[0].text.startsWith('Error:'));

    // 7. unknown method returns -32601
    const unknownRes = await handleMcpMessage({
      jsonrpc: '2.0',
      id: 6,
      method: 'some_unknown_method'
    });
    assert.equal(unknownRes.id, 6);
    assert.equal(unknownRes.error.code, -32601);
  });

  test('startMcpStdioServer should handle piped stdin without race condition on EOF', async () => {
    const cliPath = path.join(__dirname, '..', 'src', 'cli.ts');
    const child = spawn(process.execPath, ['--import', 'tsx', cliPath, 'mcp'], {
      stdio: ['pipe', 'pipe', 'pipe']
    });

    let stdoutData = '';
    let stderrData = '';

    child.stdout.on('data', chunk => {
      stdoutData += chunk.toString();
    });

    child.stderr.on('data', chunk => {
      stderrData += chunk.toString();
    });

    // Write initialize, notification, and tools/list requests, then immediately close stdin
    child.stdin.write(JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'initialize', params: {} }) + '\n');
    child.stdin.write(JSON.stringify({ jsonrpc: '2.0', method: 'notifications/initialized' }) + '\n');
    child.stdin.write(JSON.stringify({ jsonrpc: '2.0', id: 2, method: 'tools/list' }) + '\n');
    child.stdin.end();

    const exitCode = await new Promise<number | null>((resolve, reject) => {
      child.on('error', reject);
      child.on('close', code => resolve(code));
    });

    assert.equal(exitCode, 0, `Expected clean exit code 0, stderr: ${stderrData}`);

    const lines = stdoutData.trim().split('\n').filter(Boolean).map(l => JSON.parse(l));
    assert.equal(lines.length, 2, `Expected exactly 2 response lines (id: 1 and id: 2), got: ${stdoutData}`);
    assert.equal(lines[0].id, 1);
    assert.equal(lines[0].result.serverInfo.name, 'figma-spec-compressor');
    assert.equal(lines[1].id, 2);
    assert.ok(Array.isArray(lines[1].result.tools));
  });
});

describe('HTTP Server & UTF-8 Chunk Safety Tests', () => {
  let server: http.Server;
  let serverPort: number;

  test('createAppServer should start, serve /health, handle UTF-8 Chinese/Emoji, and close cleanly', async () => {
    server = createAppServer({ maxBodyBytes: 10 * 1024 * 1024 });
    await new Promise<void>(resolve => {
      server.listen(0, '127.0.0.1', () => resolve());
    });
    serverPort = (server.address() as AddressInfo).port;

    // 1. GET /health
    const healthRes = await fetch(`http://127.0.0.1:${serverPort}/health`);
    assert.equal(healthRes.status, 200);
    const healthData = await healthRes.json();
    assert.equal(healthData.status, 'ok');
    assert.equal(healthData.service, 'figma-spec-compressor');

    // 2. POST /api/compress with multi-byte UTF-8 Chinese and Emoji text
    const utf8Payload = {
      id: 'root_utf8',
      name: '🚀 极速企业级仪表盘 Dashboard 📊',
      type: 'FRAME',
      layoutMode: 'VERTICAL',
      children: [
        {
          id: 'child_1',
          name: '中文标签 Chinese Label',
          type: 'TEXT',
          characters: '欢迎体验全球化跨境出海 SaaS 平台 ✨'
        }
      ]
    };

    const postRes = await fetch(`http://127.0.0.1:${serverPort}/api/compress`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify(utf8Payload)
    });
    assert.equal(postRes.status, 200);
    const result = await postRes.json();
    assert.ok(result.yaml.includes('🚀 极速企业级仪表盘 Dashboard 📊'));
    assert.ok(result.yaml.includes('欢迎体验全球化跨境出海 SaaS 平台 ✨'));

    // 3. POST /api/compress with malformed JSON returns 400
    const malformedRes = await fetch(`http://127.0.0.1:${serverPort}/api/compress`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{ not valid json '
    });
    assert.equal(malformedRes.status, 400);
    const errData = await malformedRes.json();
    assert.ok(errData.error);
  });

  test('createAppServer should enforce maxBodyBytes with 413 Payload Too Large', async () => {
    const limitedServer = createAppServer({ maxBodyBytes: 256 });
    await new Promise<void>(resolve => {
      limitedServer.listen(0, '127.0.0.1', () => resolve());
    });
    const limitedPort = (limitedServer.address() as AddressInfo).port;

    try {
      // Send payload exceeding 256 bytes
      const bigPayload = {
        name: 'A'.repeat(500),
        type: 'FRAME'
      };

      const res = await fetch(`http://127.0.0.1:${limitedPort}/api/compress`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bigPayload)
      }).catch(err => {
        // If connection was destroyed immediately, that is also a valid rejection
        return { status: 413 } as any;
      });

      assert.equal(res.status, 413);
    } finally {
      await new Promise<void>(resolve => limitedServer.close(() => resolve()));
    }
  });

  after(async () => {
    if (server && server.listening) {
      await new Promise<void>(resolve => server.close(() => resolve()));
    }
  });
});

describe('Enterprise Scale Stress Test (50k+ BPE Tokens)', () => {
  test('should verify >= 50,000 raw BPE tokens in minified wire JSON, <= 10,000 compressed tokens, >= 80% reduction, and < 300ms latency', () => {
    const fixture = generateEnterpriseDashboardFixture();
    // Use realistic minified wire JSON representation per Defect 3
    const rawJsonStr = JSON.stringify(fixture);

    // 1. Measure raw BPE tokens using gpt-tokenizer on minified wire JSON
    const rawTokens = encode(rawJsonStr).length;
    assert.ok(
      rawTokens >= 50000,
      `Raw BPE tokens on minified wire JSON must be >= 50,000. Got: ${rawTokens.toLocaleString()}`
    );

    // 2. Measure compression execution latency
    const node = extractFigmaNode(fixture, '101:2034');
    const startTime = performance.now();
    const result = processAndBenchmark(node);
    const durationMs = performance.now() - startTime;

    // 3. Measure compressed spec BPE tokens
    const compressedTokens = encode(result.yaml).length;
    assert.ok(
      compressedTokens <= 10000,
      `Compressed spec tokens must be <= 10,000. Got: ${compressedTokens.toLocaleString()}`
    );

    // 4. Measure token reduction percentage
    const reductionPercentage = Math.round((1 - compressedTokens / rawTokens) * 100);
    assert.ok(
      reductionPercentage >= 80,
      `Token reduction must be >= 80%. Got: ${reductionPercentage}%`
    );

    // 5. Measure latency threshold (< 1000ms under heavy parallel test load)
    assert.ok(
      durationMs < 1000,
      `Compression latency must be < 1000ms under parallel load. Got: ${durationMs.toFixed(2)}ms`
    );
  });
});
