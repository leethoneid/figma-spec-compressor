# Figma Spec Compressor · Global GTM & Launch Copy Kit
> Ready-to-copy marketing assets, launch threads, and payment setup SOP for Solo Overseas monetization.

---

## 1. Creem.io 5-Minute Setup SOP (中国个人收款配置指南 · 支付宝打款)

### Step 1: 注册与结算配置 (中国身份证 + 支付宝)
1. 访问并注册 [Creem.io](https://creem.io)（专为出海开发者设计的 MoR 代收代缴平台）。
2. 在账号认证中选择 **Individual (个人开发者)**，填写大陆个人身份证信息完成合规审核（无需境外公司）。
3. 在 **Payout Settings（打款设置）** 中：
   - 结算方式选择 **Alipay（支付宝人民币）**；
   - 绑定您的实名支付宝账号与姓名。
   - **特点**：每次结账直接打款至支付宝，不占用每年 5 万美元外汇限额，合规代扣国际增值税。

### Step 2: 创建数字商品与授权码
1. 进入 **Products** -> **New Product**：
   - **Name**: `Figma Spec Compressor Pro (Lifetime License)`
   - **Price**: `$29.00` (One-time payment / 单次买断)
   - **Product Type**: `Digital Download / License Key`
   - **Description**: 
     > Universal token-optimized Model Context Protocol (MCP) server & CLI for Google Antigravity, Cursor, Claude Code, Windsurf, Zed, Codex, and Trae. Prunes raw Figma API payloads by 80%–95% in 50ms. Lifetime access to MCP server binaries, cross-editor configs, updates, and Tailwind prompt kits.
2. 在 **Fulfillment（履约交付）** 设置：
   - **File Upload**: 上传编译好的加固发布压缩包 `figma-spec-pro-v1.1.0.zip`（由 `npm run package:commercial` 一键生成）；
   - **License Keys**: 开启 **"Generate License Keys"**（单码限 2 台设备绑定）。
3. 复制生成的专属收银台链接（Checkout URL，如 `https://checkout.creem.io/...`）。
4. 将该链接粘贴替换到 `site/index.html` 中的购买按钮！

---

## 2. X (Twitter) 3-Tweet Launch Thread

### Tweet 1 (The Hook + Video)
> Figma's REST API is notorious for pumping 50,000–200,000+ tokens of raw vector noise into your LLM.
> 
> Cursor chokes, your context window explodes, and your wallet bleeds $0.35 per prompt.
> 
> So I built Figma Spec Compressor: a lightweight MCP server that cuts raw payloads by 80%–95% in 50ms with zero layout hallucinations.
> 
> Watch it in action 👇 (Attach 30s screen recording)

### Tweet 2 (The Engineering Behind It)
> How does it achieve 95% token savings without losing styling?
> 
> 1. AST Pruning: Drops invisible layers and redundant coordinate matrices.
> 2. Auto-Layout Translation: Directly translates flexbox, fills, and padding into idiomatic Tailwind v3/v4 classes.
> 3. Vector Clump Collapsing: Collapses 100+ SVG path points into single semantic `<icon>` tags.
> 4. Verified on cl100k_base BPE: 189,485 raw tokens -> 9,800 clean spec tokens.

### Tweet 3 (CTA & Links)
> It runs as a native stdio MCP server & CLI for Google Antigravity, Cursor Composer, Claude Code, Zed / ZCode, Windsurf, Trae, and Codex.
> 
> 30-second setup in standard MCP config.
> 
> 🔗 Live Interactive Demo & Pro Pass ($29): [your-landing-page-url]
> 📦 Smithery / MCP Directory: [smithery-url]
> 
> Feedback or feature requests? Drop them below! 🚀

---

## 3. Hacker News (Show HN)

**Title**: `Show HN: Figma Spec Compressor – Cut Figma tokens by 95% for Cursor and Claude Code`

**Post Body**:
```markdown
Hey HN,

Like many of you, I've been using Cursor Composer and Claude Code to build frontends from Figma designs. But connecting LLMs to the Figma REST API has been painful:

A single modern SaaS dashboard easily yields 150,000 to 200,000+ tokens of raw JSON. Even with 200k context windows, this causes three major problems:
1. Context Exhaustion: A single design frame swallows the entire window, leaving no room for reasoning or backend code.
2. Geometry Hallucinations: Models get distracted by endless floating-point bounding boxes (`x: 104.234, y: 521.112`) and produce broken CSS.
3. Cost & Latency: Paying ~$0.30+ per prompt and waiting 20 seconds for the model to parse vector matrices.

To fix this, I built **Figma Spec Compressor** (https://your-landing-url):
- It implements the Model Context Protocol (MCP) as a lightweight stdio server.
- It parses the Figma AST, prunes invisible nodes, maps Auto Layout properties into Tailwind classes, and collapses nested SVG vector clumps into semantic icon references.
- Benchmark: On a 646-node SaaS analytics dashboard, minified wire tokens dropped from 189,485 down to 9,800 exact BPE tokens (94.8% reduction), running in ~54ms on Node.

You can configure it in `.cursor/mcp.json` with 4 lines of JSON and pass live Figma URLs directly in chat.

I've put together an interactive comparison demo showing raw wire JSON vs compressed YAML vs live rendered output: https://your-landing-url

I’d love to hear your thoughts on how your team currently bridges Figma and AI coding tools!
```

---

## 4. Reddit Launch Post (`r/Cursor` & `r/ClaudeAI`)

**Title**: `I was tired of Figma blowing up Cursor's 200k context window, so I built a lightweight MCP token compressor (80%–95% cut)`

**Post Body**:
```markdown
Hey everyone,

Whenever I tried feeding Figma components into Cursor Composer via API or raw JSON, I kept running into the same wall: modern Figma frames are absurdly noisy. A single enterprise dashboard was eating 180k+ tokens just for bounding boxes, internal redlines, and vector paths.

I ended up building an MCP server called **Figma Spec Compressor** to solve my own problem:
- It strips out vector coordinate bloat and maps layout/padding/colors directly into Tailwind CSS classes.
- It runs over standard stdio JSON-RPC, so you just add it to `.cursor/mcp.json` once.
- Once added, you can literally paste: `"Build this: https://figma.com/design/...?"` into Cursor, and it fetches the live node, compresses it from ~180k down to ~9k tokens in 50ms, and Cursor writes the React code immediately without context lag.

I verified the numbers using OpenAI's cl100k_base BPE tokenizer:
- SaaS Pricing Card: 3,010 -> 615 tokens (80% reduction)
- Analytics Dashboard: 189,485 -> 9,800 tokens (95% reduction)

Check out the interactive demo or grab it here: [your-landing-url]

Hope this saves you guys some token bills and headaches! Happy to answer questions or add feature requests.
```

---

## 5. Smithery.ai / MCP Directory Submission

1. Ensure `smithery.yaml` is in repository root (already committed).
2. Go to [https://smithery.ai/new](https://smithery.ai/new).
3. Paste repository URL: `https://github.com/leethoneid/figma-spec-compressor`.
4. Click **Import**. Smithery will automatically index the tool and generate a 1-click install command for Cursor, Claude Desktop, and Windsurf users worldwide.
