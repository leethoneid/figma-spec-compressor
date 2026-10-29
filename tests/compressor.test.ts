import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { FigmaCompressor } from '../src/compressor.js';
import { serializeToYaml, processAndBenchmark } from '../src/serializer.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('FigmaCompressor Unit Tests', () => {
  const fixturePath = path.join(__dirname, 'fixtures', 'saas-pricing-card.json');
  const rawFixture = JSON.parse(fs.readFileSync(fixturePath, 'utf-8'));

  test('should prune invisible internal nodes', () => {
    const compressor = new FigmaCompressor({ dropInvisibleNodes: true });
    const spec = compressor.compress(rawFixture);

    assert.ok(spec);
    // Assert the invisible "Internal Design Annotations" frame is dropped
    const hasInvisible = spec.children?.some(c => c.name.includes('Annotations'));
    assert.equal(hasInvisible, false, 'Invisible annotation nodes should be completely stripped');
  });

  test('should map layout and padding into Tailwind classes', () => {
    const compressor = new FigmaCompressor();
    const spec = compressor.compress(rawFixture);

    assert.ok(spec);
    assert.ok(spec.classes);
    assert.ok(spec.classes.includes('flex'));
    assert.ok(spec.classes.includes('flex-col'));
    assert.ok(spec.classes.includes('items-center'));
    assert.ok(spec.classes.includes('p-8')); // 32px padding -> p-8
    assert.ok(spec.classes.includes('gap-6')); // 24px gap -> gap-6
    assert.ok(spec.classes.includes('rounded-xl')); // 16px radius -> rounded-xl
    assert.ok(spec.classes.includes('shadow-md')); // 12px blur drop shadow -> shadow-md
  });

  test('should convert vector glyphs into semantic icon elements', () => {
    const compressor = new FigmaCompressor();
    const spec = compressor.compress(rawFixture);

    assert.ok(spec);
    const featureList = spec.children?.find(c => c.name === 'Features List');
    assert.ok(featureList);

    const firstItem = featureList.children?.[0];
    assert.ok(firstItem);

    const iconNode = firstItem.children?.find(c => c.type === 'icon');
    assert.ok(iconNode, 'Vector node should be converted to clean icon type');
    assert.equal(iconNode.name, 'CheckIcon');
    assert.ok(iconNode.icon?.includes('CheckIcon (16x16)'));
  });

  test('should identify CTA button type and classes', () => {
    const compressor = new FigmaCompressor();
    const spec = compressor.compress(rawFixture);

    assert.ok(spec);
    const ctaButton = spec.children?.find(c => c.name.includes('CTA Button'));
    assert.ok(ctaButton);
    assert.equal(ctaButton.type, 'button');
    assert.ok(ctaButton.classes?.includes('rounded-md'));
  });

  test('should serialize to clean valid YAML without errors', () => {
    const compressor = new FigmaCompressor();
    const spec = compressor.compress(rawFixture);
    assert.ok(spec);

    const yamlStr = serializeToYaml(spec);
    assert.ok(yamlStr.length > 50);
    assert.ok(yamlStr.includes('PricingCard / Pro Tier'));
    assert.ok(yamlStr.includes('classes:'));
  });

  test('should achieve significant token and byte reduction in benchmark', () => {
    const result = processAndBenchmark(rawFixture);

    assert.ok(result.metrics.reductionPercentage >= 50, `Expected >= 50% token reduction, got ${result.metrics.reductionPercentage}%`);
    assert.ok(result.metrics.yamlBytes < result.metrics.rawJsonBytes);
  });
});
