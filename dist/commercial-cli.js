#!/usr/bin/env node
import { Command } from 'commander';
import fs from 'node:fs';
import path from 'node:path';
import { extractFigmaNode, fetchFigmaNodeFromUrl } from './figma-client.js';
import { startMcpStdioServer } from './mcp.js';
import { processAndBenchmark } from './serializer.js';
import { assertCommercialLicense, CommercialLicenseError } from './commercial/guard.js';
import { getMachineFingerprint } from './commercial/machine-id.js';
const program = new Command();
program
    .name('figma-spec-pro')
    .description('Figma Spec Compressor (Commercial Pro Edition) · Hardened Anti-Piracy Build')
    .version('1.1.0-pro')
    .option('-l, --license <key>', 'Commercial License Key or Offline Activation Token');
function printMetrics(metrics) {
    const rawTokens = metrics.rawTokens ?? metrics.rawTokensEstimate;
    const compressedTokens = metrics.compressedTokens ?? metrics.compressedTokensEstimate;
    console.log('\n--- Compression Metrics ---');
    console.log(`Raw Nodes:          ${metrics.rawNodesCount}`);
    console.log(`Clean Nodes:        ${metrics.cleanNodesCount}`);
    console.log(`Raw JSON Size:      ${(metrics.rawJsonBytes / 1024).toFixed(2)} KB`);
    console.log(`Compressed Size:    ${(metrics.yamlBytes / 1024).toFixed(2)} KB`);
    console.log(`Est. Raw Tokens:    ${rawTokens.toLocaleString()}`);
    console.log(`Est. Spec Tokens:   ${compressedTokens.toLocaleString()}`);
    console.log(`Token Reduction:    ${metrics.reductionPercentage}%`);
}
program
    .command('activate')
    .description('Activate and bind commercial license key to this machine')
    .argument('<licenseKey>', 'Commercial License Key')
    .action(async (key) => {
    try {
        console.log('Activating commercial license...');
        const res = await assertCommercialLicense({ licenseKey: key });
        console.log(`\n[SUCCESS] License activated for: ${res.buyerId}`);
        console.log(`Machine Fingerprint: ${getMachineFingerprint()}`);
        console.log('Hardware binding saved. You can now use all Pro features offline.');
    }
    catch (err) {
        console.error(err?.message || err);
        process.exit(1);
    }
});
program
    .command('compress')
    .description('Compress raw Figma JSON AST into compact agent-ready YAML spec')
    .argument('<file>', 'Path to raw Figma JSON file')
    .option('-o, --output <path>', 'Output file path (YAML or Markdown)')
    .option('-m, --markdown', 'Output full prompt markdown instead of raw YAML', false)
    .option('-s, --stats', 'Print token and compression statistics to stdout', false)
    .action(async (filePath, options) => {
    try {
        const fullPath = path.resolve(process.cwd(), filePath);
        if (!fs.existsSync(fullPath)) {
            console.error(`Error: File not found at ${fullPath}`);
            process.exit(1);
        }
        const content = fs.readFileSync(fullPath, 'utf-8');
        const rawJson = JSON.parse(content);
        const node = extractFigmaNode(rawJson);
        const result = processAndBenchmark(node);
        const outputData = options.markdown ? result.markdown : result.yaml;
        if (options.output) {
            const outPath = path.resolve(process.cwd(), options.output);
            fs.writeFileSync(outPath, outputData, 'utf-8');
            console.log(`Successfully written spec to ${outPath}`);
        }
        else if (!options.stats) {
            console.log(outputData);
        }
        if (options.stats || options.output) {
            printMetrics(result.metrics);
        }
    }
    catch (err) {
        console.error(`Compression error: ${err.message}`);
        process.exit(1);
    }
});
program
    .command('url')
    .description('Fetch and compress a Figma file or node directly from its URL (Pro Feature)')
    .argument('<figmaUrl>', 'Figma URL (e.g. https://www.figma.com/design/:fileKey/slug?node-id=...)')
    .option('-t, --token <token>', 'Figma Personal Access Token (defaults to FIGMA_ACCESS_TOKEN env var)')
    .option('-o, --output <path>', 'Output file path (YAML or Markdown)')
    .option('-m, --markdown', 'Output full prompt markdown instead of raw YAML', false)
    .option('-s, --stats', 'Print token and compression statistics to stdout', false)
    .action(async (figmaUrl, options) => {
    try {
        // Commercial license check gate for live URL fetching
        const globalOpts = program.opts();
        await assertCommercialLicense({ licenseKey: globalOpts.license });
        const node = await fetchFigmaNodeFromUrl(figmaUrl, { token: options.token });
        const result = processAndBenchmark(node);
        const outputData = options.markdown ? result.markdown : result.yaml;
        if (options.output) {
            const outPath = path.resolve(process.cwd(), options.output);
            fs.writeFileSync(outPath, outputData, 'utf-8');
            console.log(`Successfully written spec to ${outPath}`);
        }
        else if (!options.stats) {
            console.log(outputData);
        }
        if (options.stats || options.output) {
            printMetrics(result.metrics);
        }
    }
    catch (err) {
        if (err instanceof CommercialLicenseError) {
            console.error(err.message);
        }
        else {
            console.error(`Figma URL error: ${err.message}`);
        }
        process.exit(1);
    }
});
program
    .command('mcp')
    .description('Start Model Context Protocol (MCP) Stdio server for Cursor and Claude Code (Pro Feature)')
    .action(async () => {
    try {
        // Commercial license gate for MCP server
        const globalOpts = program.opts();
        await assertCommercialLicense({ licenseKey: globalOpts.license });
        startMcpStdioServer();
    }
    catch (err) {
        process.stderr.write(`[COMMERCIAL MCP FAILED] ${err?.message || err}\n`);
        process.exit(1);
    }
});
program.parse(process.argv);
