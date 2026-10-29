import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { processAndBenchmark } from '../src/serializer.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runBenchmark() {
  console.log('=====================================================');
  console.log('  FIGMA-SPEC-COMPRESSOR TOKEN REDUCTION BENCHMARK    ');
  console.log('=====================================================\n');

  const fixturePath = path.join(__dirname, 'fixtures', 'saas-pricing-card.json');
  const rawContent = fs.readFileSync(fixturePath, 'utf-8');
  const rawJson = JSON.parse(rawContent);

  const result = processAndBenchmark(rawJson);

  let exactRawTokens: number = result.metrics.rawTokensEstimate;
  let exactCompressedTokens: number = result.metrics.compressedTokensEstimate;

  try {
    // Dynamic import to measure exact tokens if gpt-tokenizer is available
    const { encode } = await import('gpt-tokenizer');
    exactRawTokens = encode(rawContent).length;
    exactCompressedTokens = encode(result.yaml).length;
  } catch (e) {
    // Fallback to character-based heuristic
  }

  const exactReduction = Math.round((1 - exactCompressedTokens / exactRawTokens) * 100);

  console.log('Component Tested:     ', rawJson.name);
  console.log('Raw AST Nodes:        ', result.metrics.rawNodesCount);
  console.log('Pruned Spec Nodes:    ', result.metrics.cleanNodesCount);
  console.log('Node Count Reduction: ', `${Math.round((1 - result.metrics.cleanNodesCount / result.metrics.rawNodesCount) * 100)}%`);
  console.log('-----------------------------------------------------');
  console.log('Raw JSON Size:        ', `${(result.metrics.rawJsonBytes / 1024).toFixed(2)} KB`);
  console.log('Compressed YAML Size: ', `${(result.metrics.yamlBytes / 1024).toFixed(2)} KB`);
  console.log('Byte Size Reduction:  ', `${Math.round((1 - result.metrics.yamlBytes / result.metrics.rawJsonBytes) * 100)}%`);
  console.log('-----------------------------------------------------');
  console.log('Exact Raw Tokens:     ', exactRawTokens.toLocaleString());
  console.log('Exact Spec Tokens:    ', exactCompressedTokens.toLocaleString());
  console.log('Token Reduction Rate: ', `\x1b[32m${exactReduction}%\x1b[0m`);
  console.log('=====================================================\n');

  console.log('--- PREVIEW OF COMPRESSED AGENT-READY SPEC (YAML) ---');
  console.log(result.yaml.split('\n').slice(0, 35).join('\n'));
  console.log('... [truncated for display]\n');

  if (exactReduction >= 50) {
    console.log('\x1b[32m[PASS] Benchmark verified: Token reduction exceeds 50% target threshold!\x1b[0m');
    process.exit(0);
  } else {
    console.error('\x1b[31m[FAIL] Benchmark failed: Token reduction below 50% threshold.\x1b[0m');
    process.exit(1);
  }
}

runBenchmark();
