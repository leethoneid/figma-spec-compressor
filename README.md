# Figma Spec Compressor (Agent-Ready AST Pruner)

> Token-optimized AST pruning and specification extractor for Figma-to-Agent workflows (Cursor, Claude Code, Windsurf).

## Why This Exists

When connecting Cursor or Claude Code to Figma via MCP (Model Context Protocol), raw Figma node JSON frequently balloons to **50,000–100,000+ tokens** for complex design frames. 

This causes:
1. Massive context window consumption and rate limiting.
2. Slower generation speeds and high API token costs.
3. Model attention drift and styling hallucinations caused by thousands of noisy vector curves and irrelevant Figma internal metadata.

**Figma Spec Compressor** strips 70%+ of the noise, maps layouts and styles directly into concise Tailwind CSS tokens, and outputs clean, hierarchical YAML/Markdown specs tailored specifically for LLMs.

---

## Features

- ✂️ **Recursive AST Pruning**: Automatically drops hidden design layers, internal annotations, and collapses single-child wrapper frames.
- 🎨 **Figma-to-Tailwind Token Mapping**: Converts Auto-Layout, padding, gaps, colors, rounded corners, and drop shadows directly to idiomatic Tailwind classes (`flex-col`, `gap-6`, `p-8`, `rounded-xl`, `bg-slate-900`, etc.).
- 🧩 **Vector Clump to Semantic Icons**: Replaces bloated SVG coordinates and polygon arrays with concise `<Icon name="..." />` references.
- ⚡ **Huge Token Savings**: Consistently delivers **60%–80% token reduction** compared to raw Figma API responses.
- 🔌 **CLI & HTTP Server**: Use as a standalone CLI tool or run as a microservice for MCP proxy bridges.

---

## Installation & Usage

### 1. CLI Usage
```bash
# Compress raw Figma JSON and view metrics
npx figma-spec compress ./fixtures/frame.json --stats

# Export directly to an agent-ready markdown prompt
npx figma-spec compress ./fixtures/frame.json -o ./spec.md --markdown
```

### 2. Microservice Mode
```bash
npm run serve
# Listening on port 3001
# POST /api/compress with raw Figma JSON
```

### 3. Run Benchmark Tests
```bash
npm test
npm run benchmark
```
