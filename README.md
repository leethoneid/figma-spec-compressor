# Figma Spec Compressor (Agent-Ready AST Pruner & MCP Server)

> Token-optimized AST pruning, live Figma API fetching, and genuine Model Context Protocol (MCP) server for Cursor and Claude Code.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Node: >=20](https://img.shields.io/badge/Node->=20-brightgreen.svg)]()
[![MCP: 2024-11-05](https://img.shields.io/badge/MCP-2024--11--05-blueviolet.svg)]()

---

## Why This Exists

When connecting Cursor, Claude Code, or Windsurf to Figma, raw Figma REST API responses frequently balloon to **50,000–300,000+ tokens** for modern SaaS dashboards and design system components.

This causes:
1. **Severe Context Exhaustion**: A single design frame can swallow the entire context window.
2. **Model Hallucinations**: Thousands of noisy SVG coordinate numbers, bounding boxes, and internal redlines distract LLMs from semantic styling and component hierarchy.
3. **High Latency & API Costs**: Massive payloads dramatically slow down agent responses.

**Figma Spec Compressor** strips 80%–95% of the raw wire noise, maps Figma layout and style properties into idiomatic Tailwind CSS classes, converts complex vector clumps into semantic icon tags, and feeds LLMs clean, structured YAML or Markdown specs.

---

## Verified Benchmark Results

Tested on minified wire JSON using exact BPE tokenization (`gpt-tokenizer` / cl100k_base):

| Tier | Component Description | Raw AST Nodes | Clean Spec Nodes | Raw Wire BPE Tokens | Compressed Spec Tokens | BPE Token Reduction | Compression Latency |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| **Tier 1** | SaaS Pricing Card (`saas-pricing-card.json`) | 23 | 21 | 3,010 | 615 | **80%** | ~25 ms |
| **Tier 2** | Enterprise SaaS Analytics Dashboard (50k+ stress test) | 646 | 327 | 189,485 | 9,800 | **95%** | ~180 ms |

---

## Agent Integrations (Cursor & Claude Code)

### 1. Cursor Integration (`.cursor/mcp.json`)

To enable Figma extraction tools directly in Cursor Composer or Chat, add the MCP server configuration to `.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "figma-spec": {
      "command": "npx",
      "args": ["-y", "--package=figma-spec-compressor", "figma-spec", "mcp"],
      "env": {
        "FIGMA_ACCESS_TOKEN": "figd_your_personal_access_token_here"
      }
    }
  }
}
```

#### Local Clone / Development Mode
If running from a local checkout or monorepo:
```json
{
  "mcpServers": {
    "figma-spec": {
      "command": "node",
      "args": ["/absolute/path/to/figma-spec-compressor/dist/cli.js", "mcp"],
      "env": {
        "FIGMA_ACCESS_TOKEN": "figd_your_personal_access_token_here"
      }
    }
  }
}
```

Once added, Cursor can automatically invoke:
- `compress_figma_url`: Fetches a live Figma URL (`https://www.figma.com/design/:fileKey/:slug?node-id=...`) and returns token-optimized YAML/Markdown specs.
- `compress_figma_json`: Compresses raw Figma JSON AST directly from files or clipboards.

### 2. Claude Code Integration

Add `figma-spec` directly via the Claude Code CLI:

```bash
claude mcp add figma-spec npx -y --package=figma-spec-compressor figma-spec mcp -e FIGMA_ACCESS_TOKEN=figd_your_personal_access_token_here
```

Or configure in your global MCP settings file (`~/.claude/mcp.json`):

```json
{
  "mcpServers": {
    "figma-spec": {
      "command": "npx",
      "args": ["-y", "--package=figma-spec-compressor", "figma-spec", "mcp"],
      "env": {
        "FIGMA_ACCESS_TOKEN": "figd_your_personal_access_token_here"
      }
    }
  }
}
```

---

## CLI Usage

### 1. Fetch & Compress Live Figma URLs
```bash
# Fetch and print compressed YAML spec with token reduction metrics
npx --package=figma-spec-compressor figma-spec url "https://www.figma.com/design/Vxyz123Abc/Dashboard?node-id=101-2034" --stats

# Pass access token explicitly
npx --package=figma-spec-compressor figma-spec url "https://www.figma.com/file/Vxyz123Abc" --token "figd_xxx" -o ./spec.yaml

# Generate full prompt markdown for agent consumption
npx --package=figma-spec-compressor figma-spec url "https://www.figma.com/design/Vxyz123Abc" -o ./prompt.md --markdown
```

### 2. Compress Local Figma JSON AST
```bash
# Compress local file and view reduction metrics
npx --package=figma-spec-compressor figma-spec compress ./fixtures/saas-pricing-card.json --stats

# Output directly to a file
npx --package=figma-spec-compressor figma-spec compress ./fixtures/saas-pricing-card.json -o ./spec.yaml
```

### 3. Run MCP Stdio Server
```bash
# Start standard input/output JSON-RPC MCP server
npx --package=figma-spec-compressor figma-spec mcp
```

---

## HTTP Microservice Mode

You can also run Figma Spec Compressor as a standalone HTTP service:

```bash
npm run serve
# Listening on port 3001
```

### API Endpoints

- `GET /health`  
  Returns `{ "status": "ok", "service": "figma-spec-compressor", "version": "1.1.0" }`.

- `POST /api/compress`  
  Accepts raw Figma JSON payload (up to 20 MB UTF-8 safe chunk buffer) and returns compressed YAML, markdown, and token metrics.

---

## Running Verification & Tests

```bash
# Run unit and scale integration test suite
npx tsx --test tests/mcp-and-scale.test.ts

# Run token reduction stress benchmark
npx tsx tests/benchmark.ts

# Verify TypeScript type checks
npx tsc --noEmit
```

---

## License

MIT © Solo Overseas
