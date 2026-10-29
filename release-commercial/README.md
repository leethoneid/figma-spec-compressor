# Figma Spec Compressor (Commercial Pro Edition)

> Protected Commercial Release · Single User License

## Quick Start & Activation

### 1. Activate License on this Machine
```bash
node ./bin/figma-spec-pro.cjs activate <YOUR_LICENSE_KEY>
```
This cryptographically binds the license to your hardware fingerprint. Once activated, all features run offline.

### 2. Configure Cursor / Claude Code
In `.cursor/mcp.json`:
```json
{
  "mcpServers": {
    "figma-spec": {
      "command": "node",
      "args": ["/absolute/path/to/release-commercial/bin/figma-spec-pro.cjs", "mcp"],
      "env": {
        "FIGMA_ACCESS_TOKEN": "figd_your_token_here",
        "FIGMA_SPEC_LICENSE_KEY": "YOUR_LICENSE_KEY"
      }
    }
  }
}
```

## Legal
Licensed under the Commercial EULA (see LICENSE.md). Redistribution, resale, or reverse engineering is strictly prohibited.
