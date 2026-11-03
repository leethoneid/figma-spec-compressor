import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { FigmaCompressor, unwrapFigmaNode } from '../src/compressor.js';
import { serializeToYaml, processAndBenchmark } from '../src/serializer.js';
import { RawFigmaNode } from '../src/types.js';

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
    assert.equal(iconNode.id, '101:2045', 'Icon node must preserve source node id');
  });

  test('should preserve source node id and componentId when folding icons', () => {
    const compressor = new FigmaCompressor();

    // 1. Single vector preserves its own ID
    const singleVector: RawFigmaNode = {
      id: 'vector:101',
      name: 'SearchIcon',
      type: 'VECTOR',
      absoluteBoundingBox: { x: 0, y: 0, width: 20, height: 20 }
    };
    const cleanVector = compressor.compress(singleVector);
    assert.ok(cleanVector);
    assert.equal(cleanVector.type, 'icon');
    assert.equal(cleanVector.id, 'vector:101');
    assert.equal(cleanVector.componentId, undefined);

    // 2. Vector group collapses to icon with parent frame ID
    const vectorGroup: RawFigmaNode = {
      id: 'frame:202',
      name: 'UserGlyph',
      type: 'FRAME',
      absoluteBoundingBox: { x: 0, y: 0, width: 24, height: 24 },
      children: [
        { id: 'path:1', name: 'Outline', type: 'VECTOR' },
        { id: 'path:2', name: 'Fill', type: 'VECTOR' }
      ]
    };
    const cleanGroup = compressor.compress(vectorGroup);
    assert.ok(cleanGroup);
    assert.equal(cleanGroup.type, 'icon');
    assert.equal(cleanGroup.id, 'frame:202');
    assert.equal(cleanGroup.componentId, undefined);

    // 3. INSTANCE node preserves both id and distinct componentId
    const instanceIcon: RawFigmaNode = {
      id: 'instance:303',
      componentId: 'master:999',
      name: 'HeartIcon',
      type: 'VECTOR',
      absoluteBoundingBox: { x: 0, y: 0, width: 16, height: 16 }
    };
    const cleanInstance = compressor.compress(instanceIcon);
    assert.ok(cleanInstance);
    assert.equal(cleanInstance.type, 'icon');
    assert.equal(cleanInstance.id, 'instance:303');
    assert.equal(cleanInstance.componentId, 'master:999');

    // 4. Node with missing ID does not fabricate fake ID
    const noIdIcon: RawFigmaNode = {
      id: '',
      name: 'AnonIcon',
      type: 'VECTOR',
      absoluteBoundingBox: { x: 0, y: 0, width: 16, height: 16 }
    };
    const cleanNoId = compressor.compress(noIdIcon);
    assert.ok(cleanNoId);
    assert.equal(cleanNoId.type, 'icon');
    assert.equal(cleanNoId.id, undefined);
    assert.equal(cleanNoId.componentId, undefined);

    // 5. Non-icon nodes (frame, text, button) MUST NOT have id attached (prevents token inflation)
    const textNode: RawFigmaNode = {
      id: 'text:404',
      name: 'Heading',
      type: 'TEXT',
      characters: 'Hello World'
    };
    const cleanText = compressor.compress(textNode);
    assert.ok(cleanText);
    assert.equal(cleanText.type, 'text');
    assert.equal(cleanText.id, undefined);

    // 6. YAML serialization should cleanly format id and componentId
    const yamlOutput = serializeToYaml(cleanInstance);
    assert.ok(yamlOutput.includes('id: instance:303'));
    assert.ok(yamlOutput.includes('componentId: master:999'));
    assert.ok(yamlOutput.includes('icon: HeartIcon (16x16)'));
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

  test('should handle sizing and layout constraints correctly', () => {
    const compressor = new FigmaCompressor();

    // Vertical parent with children
    const verticalParent: RawFigmaNode = {
      id: '1:1',
      name: 'VerticalContainer',
      type: 'FRAME',
      layoutMode: 'VERTICAL',
      children: [
        {
          id: '1:2',
          name: 'FillChild',
          type: 'FRAME',
          layoutSizingHorizontal: 'FILL',
          children: []
        },
        {
          id: '1:3',
          name: 'StretchChild',
          type: 'FRAME',
          layoutAlign: 'STRETCH',
          children: []
        },
        {
          id: '1:4',
          name: 'FixedChild',
          type: 'FRAME',
          layoutSizingHorizontal: 'FIXED',
          layoutSizingVertical: 'FIXED',
          size: { x: 32, y: 48 },
          children: []
        },
        {
          id: '1:5',
          name: 'CustomFixedChild',
          type: 'FRAME',
          layoutSizingHorizontal: 'FIXED',
          layoutSizingVertical: 'FIXED',
          size: { x: 300, y: 70 },
          children: []
        }
      ]
    };

    const resV = compressor.compress(verticalParent);
    assert.ok(resV);
    const fillChild = resV.children?.find(c => c.name === 'FillChild');
    assert.ok(fillChild?.classes?.includes('w-full'), 'FILL in vertical parent should be w-full');

    const stretchChild = resV.children?.find(c => c.name === 'StretchChild');
    assert.ok(stretchChild?.classes?.includes('w-full'), 'STRETCH in vertical parent should be w-full');

    const fixedChild = resV.children?.find(c => c.name === 'FixedChild');
    assert.ok(fixedChild?.classes?.includes('w-8'), '32px fixed width should map to w-8');
    assert.ok(fixedChild?.classes?.includes('h-12'), '48px fixed height should map to h-12');

    const customFixedChild = resV.children?.find(c => c.name === 'CustomFixedChild');
    assert.ok(customFixedChild?.classes?.includes('w-[300px]'), '300px fixed width should map to w-[300px]');
    assert.ok(customFixedChild?.classes?.includes('h-[70px]'), '70px fixed height should map to h-[70px]');

    // Horizontal parent with children
    const horizontalParent: RawFigmaNode = {
      id: '2:1',
      name: 'HorizontalContainer',
      type: 'FRAME',
      layoutMode: 'HORIZONTAL',
      layoutWrap: 'WRAP',
      clipsContent: true,
      opacity: 0.5,
      children: [
        {
          id: '2:2',
          name: 'FillChildH',
          type: 'FRAME',
          layoutSizingHorizontal: 'FILL',
          layoutSizingVertical: 'FILL',
          children: []
        },
        {
          id: '2:3',
          name: 'GrowChildH',
          type: 'FRAME',
          layoutGrow: 1,
          layoutAlign: 'STRETCH',
          children: []
        }
      ]
    };

    const resH = compressor.compress(horizontalParent);
    assert.ok(resH);
    assert.ok(resH.classes?.includes('flex-wrap'), 'WRAP layout should emit flex-wrap');
    assert.ok(resH.classes?.includes('overflow-hidden'), 'clipsContent: true should emit overflow-hidden');
    assert.ok(resH.classes?.includes('opacity-50'), 'opacity: 0.5 should emit opacity-50');

    const fillChildH = resH.children?.find(c => c.name === 'FillChildH');
    assert.ok(fillChildH?.classes?.includes('flex-1'), 'FILL horizontal in horizontal parent should be flex-1');
    assert.ok(fillChildH?.classes?.includes('h-full'), 'FILL vertical should be h-full');

    const growChildH = resH.children?.find(c => c.name === 'GrowChildH');
    assert.ok(growChildH?.classes?.includes('flex-1'), 'layoutGrow 1 in horizontal parent should be flex-1');
    assert.ok(growChildH?.classes?.includes('h-full'), 'layoutAlign STRETCH in horizontal parent should be h-full');
  });

  test('should handle rectangleCornerRadii, gradient fills, and image leaf nodes', () => {
    const compressor = new FigmaCompressor();

    const mixedRadiiNode: RawFigmaNode = {
      id: '3:1',
      name: 'MixedRadiiCard',
      type: 'FRAME',
      rectangleCornerRadii: [16, 8, 0, 4],
      children: []
    };
    const resRadii = compressor.compress(mixedRadiiNode);
    assert.ok(resRadii);
    assert.ok(resRadii.classes?.includes('rounded-tl-xl'));
    assert.ok(resRadii.classes?.includes('rounded-tr-md'));
    assert.ok(resRadii.classes?.includes('rounded-bl'));
    assert.equal(resRadii.classes?.includes('rounded-br'), false);

    const uniformRadiiNode: RawFigmaNode = {
      id: '3:2',
      name: 'UniformRadiiCard',
      type: 'FRAME',
      rectangleCornerRadii: [12, 12, 12, 12],
      children: []
    };
    const resUniform = compressor.compress(uniformRadiiNode);
    assert.ok(resUniform);
    assert.ok(resUniform.classes?.includes('rounded-lg'));

    const gradientNode: RawFigmaNode = {
      id: '3:3',
      name: 'GradientBanner',
      type: 'FRAME',
      fills: [
        {
          type: 'GRADIENT_LINEAR',
          visible: true,
          gradientStops: [
            { position: 0, color: { r: 0.231, g: 0.51, b: 0.965 } }, // blue-500 (#3b82f6)
            { position: 1, color: { r: 0.063, g: 0.725, b: 0.506 } } // emerald-500 (#10b981)
          ]
        }
      ],
      children: []
    };
    const resGradient = compressor.compress(gradientNode);
    assert.ok(resGradient);
    assert.ok(resGradient.classes?.includes('bg-gradient-to-r'));
    assert.ok(resGradient.classes?.includes('from-blue-500'));
    assert.ok(resGradient.classes?.includes('to-emerald-500'));

    const imageNode: RawFigmaNode = {
      id: '3:4',
      name: 'AvatarPhoto',
      type: 'RECTANGLE',
      size: { x: 64, y: 64 },
      cornerRadius: 999,
      fills: [
        {
          type: 'IMAGE',
          visible: true
        }
      ]
    };
    const resImage = compressor.compress(imageNode);
    assert.ok(resImage);
    assert.equal(resImage.type, 'image');
    assert.equal(resImage.name, 'AvatarPhoto');
    assert.equal(resImage.image, 'AvatarPhoto (64x64)');
    assert.ok(resImage.classes?.includes('rounded-full'));
  });

  test('should unwrap Figma REST API envelope and DOCUMENT/CANVAS structures', () => {
    const compressor = new FigmaCompressor();

    // 1. API nodes envelope { nodes: { "123:456": { document: { ... } } } }
    const apiEnvelope = {
      name: 'Design System',
      nodes: {
        '123:456': {
          document: {
            id: '123:456',
            name: 'HeroSection',
            type: 'FRAME',
            layoutMode: 'VERTICAL',
            children: []
          }
        }
      }
    };
    const unwrappedFromNodes = unwrapFigmaNode(apiEnvelope);
    assert.equal(unwrappedFromNodes.name, 'HeroSection');
    const spec1 = compressor.compress(apiEnvelope);
    assert.ok(spec1);
    assert.equal(spec1.name, 'HeroSection');

    // 2. Full document hierarchy DOCUMENT -> CANVAS -> FRAME
    const fullDoc = {
      document: {
        id: '0:0',
        name: 'Document',
        type: 'DOCUMENT',
        children: [
          {
            id: '0:1',
            name: 'Page 1',
            type: 'CANVAS',
            children: [
              {
                id: '1:10',
                name: 'PricingModal',
                type: 'FRAME',
                children: []
              }
            ]
          }
        ]
      }
    };
    const unwrappedFromDoc = unwrapFigmaNode(fullDoc);
    assert.equal(unwrappedFromDoc.name, 'PricingModal');
    const spec2 = compressor.compress(fullDoc);
    assert.ok(spec2);
    assert.equal(spec2.name, 'PricingModal');
  });

  test('should accurately account cleanNodeCount when collapsing multi-vector icon frames', () => {
    const compressor = new FigmaCompressor();

    const multiVectorIconFrame: RawFigmaNode = {
      id: '10:1',
      name: 'TrashIcon',
      type: 'FRAME',
      absoluteBoundingBox: { x: 0, y: 0, width: 24, height: 24 },
      children: [
        { id: '10:2', name: 'Path 1', type: 'VECTOR', absoluteBoundingBox: { x: 2, y: 2, width: 10, height: 10 } },
        { id: '10:3', name: 'Path 2', type: 'VECTOR', absoluteBoundingBox: { x: 4, y: 4, width: 8, height: 8 } },
        { id: '10:4', name: 'Path 3', type: 'VECTOR', absoluteBoundingBox: { x: 6, y: 6, width: 6, height: 6 } },
        { id: '10:5', name: 'Path 4', type: 'VECTOR', absoluteBoundingBox: { x: 8, y: 8, width: 4, height: 4 } }
      ]
    };

    const spec = compressor.compress(multiVectorIconFrame);
    assert.ok(spec);
    assert.equal(spec.type, 'icon');
    assert.equal(spec.name, 'TrashIcon');
    assert.equal(spec.icon, 'TrashIcon (24x24)');

    // 1 frame + 4 vectors = 5 raw nodes
    assert.equal(compressor.rawNodeCount, 5, 'Raw node count should reflect all 5 nodes');
    // Collapses to 1 icon node -> cleanNodeCount must be 1, NOT 5
    assert.equal(compressor.cleanNodeCount, 1, 'Clean node count must be 1 after vector collapsing');
  });

  test('should compute exact BPE tokens and high reduction metrics on pricing card fixture', () => {
    const result = processAndBenchmark(rawFixture);

    assert.ok(typeof result.metrics.rawTokens === 'number');
    assert.ok(typeof result.metrics.compressedTokens === 'number');
    assert.ok(result.metrics.rawTokens > 0, `rawTokens must be > 0, got ${result.metrics.rawTokens}`);
    assert.ok(
      result.metrics.compressedTokens < result.metrics.rawTokens,
      `compressedTokens (${result.metrics.compressedTokens}) must be < rawTokens (${result.metrics.rawTokens})`
    );
    assert.ok(
      result.metrics.reductionPercentage >= 78,
      `Expected reduction >= 78%, got ${result.metrics.reductionPercentage}%`
    );
    assert.equal(result.metrics.rawTokensEstimate, result.metrics.rawTokens);
    assert.equal(result.metrics.compressedTokensEstimate, result.metrics.compressedTokens);
  });

  test('should omit redundant name when name equals text in YAML serialization except on root', () => {
    const compressor = new FigmaCompressor();
    const spec = compressor.compress(rawFixture);
    assert.ok(spec);

    const yamlStr = serializeToYaml(spec);
    // Root name should be preserved
    assert.ok(yamlStr.includes('name: PricingCard / Pro Tier'));
    // Container frames should omit type: frame
    assert.equal(yamlStr.includes('type: frame'), false, 'type: frame should be omitted in YAML');
    // For "MOST POPULAR", text is "MOST POPULAR" so "name: MOST POPULAR" should be stripped
    assert.equal(yamlStr.includes('name: MOST POPULAR'), false, 'Redundant name matching text should be omitted');
    assert.ok(yamlStr.includes('text: MOST POPULAR'));
  });
});