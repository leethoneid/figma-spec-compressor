#!/usr/bin/env node
import { Command } from 'commander';
import fs from 'node:fs';
import path from 'node:path';
import { processAndBenchmark } from './serializer.js';

const program = new Command();

program
  .name('figma-spec')
  .description('Token-optimized AST pruning and spec extractor for Figma-to-Agent workflows')
  .version('1.0.0');

program
  .command('compress')
  .description('Compress raw Figma JSON AST into compact agent-ready YAML spec')
  .argument('<file>', 'Path to raw Figma JSON file')
  .option('-o, --output <path>', 'Output file path (YAML or Markdown)')
  .option('-m, --markdown', 'Output full prompt markdown instead of raw YAML', false)
  .option('-s, --stats', 'Print token and compression statistics to stdout', false)
  .action((filePath: string, options) => {
    try {
      const fullPath = path.resolve(process.cwd(), filePath);
      if (!fs.existsSync(fullPath)) {
        console.error(`Error: File not found at ${fullPath}`);
        process.exit(1);
      }

      const content = fs.readFileSync(fullPath, 'utf-8');
      const rawJson = JSON.parse(content);

      const result = processAndBenchmark(rawJson);

      const outputData = options.markdown ? result.markdown : result.yaml;

      if (options.output) {
        const outPath = path.resolve(process.cwd(), options.output);
        fs.writeFileSync(outPath, outputData, 'utf-8');
        console.log(`Successfully written spec to ${outPath}`);
      } else if (!options.stats) {
        console.log(outputData);
      }

      if (options.stats || options.output) {
        console.log('\n--- Compression Metrics ---');
        console.log(`Raw Nodes:          ${result.metrics.rawNodesCount}`);
        console.log(`Clean Nodes:        ${result.metrics.cleanNodesCount}`);
        console.log(`Raw JSON Size:      ${(result.metrics.rawJsonBytes / 1024).toFixed(2)} KB`);
        console.log(`Compressed Size:    ${(result.metrics.yamlBytes / 1024).toFixed(2)} KB`);
        console.log(`Est. Raw Tokens:    ${result.metrics.rawTokensEstimate.toLocaleString()}`);
        console.log(`Est. Spec Tokens:   ${result.metrics.compressedTokensEstimate.toLocaleString()}`);
        console.log(`Token Reduction:    ${result.metrics.reductionPercentage}%`);
      }
    } catch (err: any) {
      console.error(`Compression error: ${err.message}`);
      process.exit(1);
    }
  });

program.parse(process.argv);
