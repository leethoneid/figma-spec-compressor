import { RawFigmaNode, CleanSpecNode, FigmaPaint } from './types.js';
import { mapNodeToClasses } from './tailwind-mapper.js';

export interface CompressorOptions {
  collapseSingleChildWrappers?: boolean;
  convertVectorsToIcons?: boolean;
  dropInvisibleNodes?: boolean;
  omitRedundantTextName?: boolean;
}

export function unwrapFigmaNode(input: any): RawFigmaNode {
  if (!input || typeof input !== 'object') {
    return input;
  }
  let node = input;
  if (input.nodes && typeof input.nodes === 'object') {
    const entries = Object.values(input.nodes);
    const found = entries.find((entry: any) => entry && entry.document);
    if (found && (found as any).document) {
      node = (found as any).document;
    }
  } else if (input.document && typeof input.document === 'object') {
    node = input.document;
  }

  while (
    node &&
    (node.type === 'DOCUMENT' || node.type === 'CANVAS') &&
    Array.isArray(node.children) &&
    node.children.length === 1
  ) {
    node = node.children[0];
  }

  return node;
}

export class FigmaCompressor {
  private options: Required<CompressorOptions>;
  public rawNodeCount: number = 0;
  public cleanNodeCount: number = 0;

  constructor(options: CompressorOptions = {}) {
    this.options = {
      collapseSingleChildWrappers: options.collapseSingleChildWrappers ?? true,
      convertVectorsToIcons: options.convertVectorsToIcons ?? true,
      dropInvisibleNodes: options.dropInvisibleNodes ?? true,
      omitRedundantTextName: options.omitRedundantTextName ?? false
    };
  }

  private countRawNodes(node: RawFigmaNode): void {
    this.rawNodeCount++;
    if (node.children && Array.isArray(node.children)) {
      for (const child of node.children) {
        this.countRawNodes(child);
      }
    }
  }

  private countCleanNodes(spec: CleanSpecNode | null): number {
    if (!spec) return 0;
    let count = 1;
    if (spec.children && Array.isArray(spec.children)) {
      for (const child of spec.children) {
        count += this.countCleanNodes(child);
      }
    }
    return count;
  }

  public compress(rawRoot: any): CleanSpecNode | null {
    const unwrappedRoot = unwrapFigmaNode(rawRoot);
    if (!unwrappedRoot) return null;

    this.rawNodeCount = 0;
    this.cleanNodeCount = 0;
    this.countRawNodes(unwrappedRoot);

    const cleanRoot = this.processNode(unwrappedRoot);
    this.cleanNodeCount = this.countCleanNodes(cleanRoot);
    return cleanRoot;
  }

  private processNode(node: RawFigmaNode, parentLayoutMode?: 'NONE' | 'HORIZONTAL' | 'VERTICAL'): CleanSpecNode | null {
    if (this.options.dropInvisibleNodes && node.visible === false) {
      return null;
    }

    // 1. Convert vector clusters into simple semantic icon elements
    if (this.options.convertVectorsToIcons && (node.type === 'VECTOR' || node.type === 'BOOLEAN_OPERATION')) {
      const w = node.absoluteBoundingBox?.width ? Math.round(node.absoluteBoundingBox.width) : 16;
      const h = node.absoluteBoundingBox?.height ? Math.round(node.absoluteBoundingBox.height) : 16;
      return {
        name: node.name || 'Icon',
        type: 'icon',
        icon: `${node.name || 'Icon'} (${w}x${h})`
      };
    }

    // Image Node Detection
    const hasImageFill = node.fills && Array.isArray(node.fills) && node.fills.some(
      (f: FigmaPaint) => f.visible !== false && f.type === 'IMAGE'
    );
    if (hasImageFill && (!node.children || node.children.length === 0)) {
      const classList = mapNodeToClasses(node, parentLayoutMode);
      const classesString = classList.length > 0 ? classList.join(' ') : undefined;
      const w = Math.round(node.size?.x ?? node.absoluteBoundingBox?.width ?? 0);
      const h = Math.round(node.size?.y ?? node.absoluteBoundingBox?.height ?? 0);
      const imageNode: CleanSpecNode = {
        name: node.name || 'Image',
        type: 'image',
        image: `${node.name || 'Image'} (${w}x${h})`
      };
      if (classesString) {
        imageNode.classes = classesString;
      }
      return imageNode;
    }

    // 2. Process children first
    let processedChildren: CleanSpecNode[] = [];
    if (node.children && Array.isArray(node.children)) {
      for (const child of node.children) {
        const cleanChild = this.processNode(child, node.layoutMode);
        if (cleanChild) {
          processedChildren.push(cleanChild);
        }
      }
    }

    // Collapse adjacent or nested pure vector noise
    if (this.options.convertVectorsToIcons && processedChildren.length > 0) {
      const allVectors = processedChildren.every(c => c.type === 'icon');
      if (allVectors && (node.name.toLowerCase().includes('icon') || node.name.toLowerCase().includes('svg') || node.name.toLowerCase().includes('glyph'))) {
        const w = node.absoluteBoundingBox?.width ? Math.round(node.absoluteBoundingBox.width) : 16;
        const h = node.absoluteBoundingBox?.height ? Math.round(node.absoluteBoundingBox.height) : 16;
        return {
          name: node.name,
          type: 'icon',
          icon: `${node.name} (${w}x${h})`
        };
      }
    }

    // 3. Clean and map classes
    const classList = mapNodeToClasses(node, parentLayoutMode);
    const classesString = classList.length > 0 ? classList.join(' ') : undefined;

    // 4. Single-child wrapper collapse (e.g. Frame or Group containing only 1 child Frame or Component with no distinct styles)
    if (
      this.options.collapseSingleChildWrappers &&
      processedChildren.length === 1 &&
      !classesString &&
      (node.type === 'FRAME' || node.type === 'GROUP') &&
      (processedChildren[0].type === 'frame' || processedChildren[0].type === 'component')
    ) {
      return processedChildren[0];
    }

    // 5. Determine clean node type
    let cleanType: CleanSpecNode['type'] = 'frame';
    if (node.type === 'TEXT') {
      cleanType = 'text';
    } else if (node.name.toLowerCase().includes('button') || (node.type === 'INSTANCE' && node.name.toLowerCase().includes('btn'))) {
      cleanType = 'button';
    } else if (node.type === 'COMPONENT' || node.type === 'INSTANCE') {
      cleanType = 'component';
    }

    const result: CleanSpecNode = {
      name: node.name,
      type: cleanType
    };

    if (classesString) {
      result.classes = classesString;
    }

    if (cleanType === 'text') {
      result.text = node.characters?.trim() || '';
    }

    if (processedChildren.length > 0) {
      result.children = processedChildren;
    }

    return result;
  }
}