import readline from 'node:readline';
import { extractFigmaNode, fetchFigmaNodeFromUrl } from './figma-client.js';
import { processAndBenchmark } from './serializer.js';

function formatSpecWithMetrics(result: any, format: string = 'yaml'): string {
  const reduction = result.metrics.reductionPercentage;
  const rawTokens = result.metrics.rawTokens ?? result.metrics.rawTokensEstimate;
  const compTokens = result.metrics.compressedTokens ?? result.metrics.compressedTokensEstimate;

  const header = [
    `# ==========================================`,
    `# Figma Spec Compression Summary`,
    `# Raw Nodes: ${result.metrics.rawNodesCount} -> Clean Nodes: ${result.metrics.cleanNodesCount}`,
    `# Tokens: ~${rawTokens.toLocaleString()} -> ~${compTokens.toLocaleString()} (${reduction}% reduction)`,
    `# Raw Size: ${(result.metrics.rawJsonBytes / 1024).toFixed(2)} KB -> Spec Size: ${(result.metrics.yamlBytes / 1024).toFixed(2)} KB`,
    `# ==========================================`,
    ``
  ].join('\n');

  const body = format === 'markdown' ? result.markdown : result.yaml;
  return `${header}${body}`;
}

export async function handleMcpMessage(
  msg: any,
  deps?: { fetchImpl?: typeof fetch }
): Promise<any | null> {
  if (!msg || typeof msg !== 'object') {
    return {
      jsonrpc: '2.0',
      id: null,
      error: { code: -32600, message: 'Invalid Request: payload must be a JSON-RPC object' }
    };
  }

  // MCP / JSON-RPC notification: notifications MUST NOT emit a response frame
  if (msg.id === undefined) {
    return null;
  }

  switch (msg.method) {
    case 'initialize': {
      return {
        jsonrpc: '2.0',
        id: msg.id,
        result: {
          protocolVersion: '2024-11-05',
          capabilities: {
            tools: {}
          },
          serverInfo: {
            name: 'figma-spec-compressor',
            version: '1.1.0'
          }
        }
      };
    }

    case 'ping': {
      return {
        jsonrpc: '2.0',
        id: msg.id,
        result: {}
      };
    }

    case 'tools/list': {
      return {
        jsonrpc: '2.0',
        id: msg.id,
        result: {
          tools: [
            {
              name: 'compress_figma_json',
              description: 'Compress raw Figma JSON AST into compact agent-ready YAML or Markdown specification with Tailwind classes and token metrics.',
              inputSchema: {
                type: 'object',
                properties: {
                  rawJson: {
                    type: 'string',
                    description: 'Raw Figma JSON AST string from Figma REST API or plugin'
                  },
                  format: {
                    type: 'string',
                    enum: ['yaml', 'markdown'],
                    default: 'yaml',
                    description: "Output format: 'yaml' for structured spec, 'markdown' for full prompt instructions"
                  }
                },
                required: ['rawJson']
              }
            },
            {
              name: 'compress_figma_url',
              description: 'Fetch a live Figma file/node via REST API and compress it into compact agent-ready YAML or Markdown specification.',
              inputSchema: {
                type: 'object',
                properties: {
                  url: {
                    type: 'string',
                    description: 'Figma file/node URL (e.g. https://www.figma.com/design/:key/:title?node-id=...)'
                  },
                  format: {
                    type: 'string',
                    enum: ['yaml', 'markdown'],
                    default: 'yaml',
                    description: "Output format: 'yaml' or 'markdown'"
                  },
                  figmaToken: {
                    type: 'string',
                    description: 'Figma Personal Access Token (optional if FIGMA_ACCESS_TOKEN env var is set)'
                  }
                },
                required: ['url']
              }
            }
          ]
        }
      };
    }

    case 'tools/call': {
      const toolName = msg.params?.name;
      const args = msg.params?.arguments || {};

      try {
        if (toolName === 'compress_figma_json') {
          let raw = args.rawJson;
          if (typeof raw === 'string') {
            raw = JSON.parse(raw);
          }
          if (!raw || typeof raw !== 'object') {
            throw new Error('Missing or invalid rawJson parameter: expected JSON string or object');
          }
          const node = extractFigmaNode(raw);
          const result = processAndBenchmark(node);
          const format = args.format === 'markdown' ? 'markdown' : 'yaml';
          const text = formatSpecWithMetrics(result, format);

          return {
            jsonrpc: '2.0',
            id: msg.id,
            result: {
              content: [
                {
                  type: 'text',
                  text
                }
              ]
            }
          };
        }

        if (toolName === 'compress_figma_url') {
          if (!args.url || typeof args.url !== 'string') {
            throw new Error('Missing required "url" parameter');
          }
          const node = await fetchFigmaNodeFromUrl(args.url, {
            token: args.figmaToken,
            fetchImpl: deps?.fetchImpl
          });
          const result = processAndBenchmark(node);
          const format = args.format === 'markdown' ? 'markdown' : 'yaml';
          const text = formatSpecWithMetrics(result, format);

          return {
            jsonrpc: '2.0',
            id: msg.id,
            result: {
              content: [
                {
                  type: 'text',
                  text
                }
              ]
            }
          };
        }

        throw new Error(`Unknown tool: ${toolName}`);
      } catch (err: any) {
        return {
          jsonrpc: '2.0',
          id: msg.id,
          result: {
            isError: true,
            content: [
              {
                type: 'text',
                text: `Error: ${err?.message || String(err)}`
              }
            ]
          }
        };
      }
    }

    default: {
      return {
        jsonrpc: '2.0',
        id: msg.id,
        error: {
          code: -32601,
          message: `Method not found: ${msg.method}`
        }
      };
    }
  }
}

export function startMcpStdioServer(): void {
  const rl = readline.createInterface({
    input: process.stdin,
    terminal: false
  });

  let pending: Promise<void> = Promise.resolve();

  rl.on('line', (line: string) => {
    const trimmed = line.trim();
    if (!trimmed) return;

    pending = pending.then(async () => {
      let msg: any;
      try {
        msg = JSON.parse(trimmed);
      } catch {
        const parseError = {
          jsonrpc: '2.0',
          id: null,
          error: { code: -32700, message: 'Parse error: invalid JSON' }
        };
        process.stdout.write(JSON.stringify(parseError) + '\n');
        return;
      }

      try {
        const response = await handleMcpMessage(msg);
        if (response !== null) {
          process.stdout.write(JSON.stringify(response) + '\n');
        }
      } catch (err: any) {
        process.stderr.write(`[figma-spec MCP Error] ${err?.message || err}\n`);
        const internalError = {
          jsonrpc: '2.0',
          id: msg?.id ?? null,
          error: { code: -32603, message: `Internal error: ${err?.message || err}` }
        };
        process.stdout.write(JSON.stringify(internalError) + '\n');
      }
    }).catch(err => {
      process.stderr.write(`[figma-spec MCP Queue Error] ${err?.message || err}\n`);
    });
  });

  rl.on('close', () => {
    pending.then(() => {
      if (process.stdout.writableLength > 0) {
        process.stdout.once('drain', () => {
          process.exit(0);
        });
      } else {
        setImmediate(() => {
          process.exit(0);
        });
      }
    });
  });
}
