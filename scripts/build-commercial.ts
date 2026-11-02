import esbuild from 'esbuild';
import JavaScriptObfuscator from 'javascript-obfuscator';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const outDir = path.join(rootDir, 'release-commercial');

async function buildCommercialRelease() {
  console.log('====================================================');
  console.log('   FIGMA-SPEC-COMPRESSOR COMMERCIAL HARDENING BUILD   ');
  console.log('====================================================\n');

  // 1. Prepare output directories
  if (fs.existsSync(outDir)) {
    fs.rmSync(outDir, { recursive: true, force: true });
  }
  fs.mkdirSync(path.join(outDir, 'bin'), { recursive: true });

  console.log('[1/4] Bundling commercial edition via esbuild...');
  const bundleResult = await esbuild.build({
    entryPoints: [path.join(rootDir, 'src', 'commercial-cli.ts')],
    bundle: true,
    platform: 'node',
    target: 'node20',
    format: 'cjs',
    write: false,
    external: [
      // Externalize node builtins
      'node:*',
      'fs',
      'path',
      'os',
      'crypto',
      'http',
      'net',
      'readline',
      'child_process',
      'url'
    ],
    define: {
      'process.env.COMMERCIAL_BUILD': '"true"'
    }
  });

  const bundledCode = bundleResult.outputFiles[0].text;
  console.log(`      Bundled code size: ${(bundledCode.length / 1024).toFixed(2)} KB`);

  console.log('[2/4] Applying multi-layer anti-tamper obfuscation...');
  const obfuscated = JavaScriptObfuscator.obfuscate(bundledCode, {
    compact: true,
    controlFlowFlattening: true,
    controlFlowFlatteningThreshold: 0.75,
    deadCodeInjection: true,
    deadCodeInjectionThreshold: 0.35,
    stringArray: true,
    stringArrayEncoding: ['base64'],
    stringArrayThreshold: 0.8,
    transformObjectKeys: true,
    unicodeEscapeSequence: false,
    target: 'node'
  });

  let cleanCode = obfuscated.getObfuscatedCode();
  if (cleanCode.startsWith('#!')) {
    cleanCode = cleanCode.replace(/^#![^\r\n]*[\r\n]+/, '');
  }
  const finalCode = '#!/usr/bin/env node\n' + cleanCode;
  const binPath = path.join(outDir, 'bin', 'figma-spec-pro.cjs');
  fs.writeFileSync(binPath, finalCode, 'utf-8');
  console.log(`      Obfuscated hardened binary created at: ${binPath}`);
  console.log(`      Hardened output size: ${(finalCode.length / 1024).toFixed(2)} KB`);

  console.log('[3/4] Copying commercial EULA & docs...');
  fs.copyFileSync(
    path.join(rootDir, 'COMMERCIAL-EULA.md'),
    path.join(outDir, 'LICENSE.md')
  );

  // Write commercial package.json
  const commercialPkg = {
    name: 'figma-spec-compressor-pro',
    version: '1.1.0-pro',
    description: 'Figma Spec Compressor (Commercial Pro Edition) · DRM Protected',
    bin: {
      'figma-spec-pro': './bin/figma-spec-pro.cjs'
    },
    main: './bin/figma-spec-pro.cjs',
    type: 'commonjs',
    license: 'SEE LICENSE IN LICENSE.md',
    dependencies: {}
  };
  fs.writeFileSync(
    path.join(outDir, 'package.json'),
    JSON.stringify(commercialPkg, null, 2),
    'utf-8'
  );

  // Write commercial README
  const commercialReadme = `# Figma Spec Compressor (Commercial Pro Edition)

> Protected Commercial Release · Single User License

## Quick Start & Activation

### 1. Activate License on this Machine
\`\`\`bash
node ./bin/figma-spec-pro.cjs activate <YOUR_LICENSE_KEY>
\`\`\`
This cryptographically binds the license to your hardware fingerprint. Once activated, all features run offline.

### 2. Configure Cursor / Claude Code
In \`.cursor/mcp.json\`:
\`\`\`json
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
\`\`\`

## Legal
Licensed under the Commercial EULA (see LICENSE.md). Redistribution, resale, or reverse engineering is strictly prohibited.
`;
  fs.writeFileSync(path.join(outDir, 'README.md'), commercialReadme, 'utf-8');

  console.log('[4/4] Commercial release artifacts generated successfully!');
  console.log(`      Artifacts ready in: ${outDir}\n`);
}

buildCommercialRelease().catch(err => {
  console.error('Commercial build failed:', err);
  process.exit(1);
});
