import { RawFigmaNode, CleanSpecNode } from './types.js';
import { mapNodeToClasses } from './tailwind-mapper.js';

export interface CompressorOptions {
  collapseSingleChildWrappers?: boolean;
  convertVectorsToIcons?: boolean;
  dropInvisibleNodes?: boolean;
}

export class FigmaCompressor {
  private options: Required<CompressorOptions>;
  public rawNodeCount: number = 0;
  public cleanNodeCount: number = 0;

  constructor(options: CompressorOptions = {}) {
    this.options = {
      collapseSingleChildWrappers: options.collapseSingleChildWrappers ?? true,
      convertVectorsToIcons: options.convertVectorsToIcons ?? true,
      dropInvisibleNodes: options.dropInvisibleNodes ?? true
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

  public compress(rawRoot: RawFigmaNode): CleanSpecNode | null {
    this.rawNodeCount = 0;
    this.cleanNodeCount = 0;
    this.countRawNodes(rawRoot);

    return this.processNode(rawRoot);
  }

  private processNode(node: RawFigmaNode): CleanSpecNode | null {
    if (this.options.dropInvisibleNodes && node.visible === false) {
      return null;
    }

    // 1. Convert vector clusters into simple semantic icon elements
    if (this.options.convertVectorsToIcons && (node.type === 'VECTOR' || node.type === 'BOOLEAN_OPERATION')) {
      this.cleanNodeCount++;
      const w = node.absoluteBoundingBox?.width ? Math.round(node.absoluteBoundingBox.width) : 16;
      const h = node.absoluteBoundingBox?.height ? Math.round(node.absoluteBoundingBox.height) : 16;
      return {
        name: node.name || 'Icon',
        type: 'icon',
        icon: `${node.name || 'Icon'} (${w}x${h})`
      };
    }

    // 2. Process children first
    let processedChildren: CleanSpecNode[] = [];
    if (node.children && Array.isArray(node.children)) {
      for (const child of node.children) {
        const cleanChild = this.processNode(child);
        if (cleanChild) {
          processedChildren.push(cleanChild);
        }
      }
    }

    // Collapse adjacent or nested pure vector noise
    if (this.options.convertVectorsToIcons && processedChildren.length > 0) {
      const allVectors = processedChildren.every(c => c.type === 'icon');
      if (allVectors && (node.name.toLowerCase().includes('icon') || node.name.toLowerCase().includes('svg') || node.name.toLowerCase().includes('glyph'))) {
        this.cleanNodeCount++;
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
    const classList = mapNodeToClasses(node);
    const classesString = classList.length > 0 ? classList.join(' ') : undefined;

    // 4. Single-child wrapper collapse (e.g. Frame containing only 1 child Frame with no distinct styles)
    if (
      this.options.collapseSingleChildWrappers &&
      processedChildren.length === 1 &&
      !classesString &&
      node.type === 'FRAME' &&
      processedChildren[0].type === 'frame'
    ) {
      return processedChildren[0];
    }

    this.cleanNodeCount++;

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
