import { RawFigmaNode, CleanSpecNode } from './types.js';
export interface CompressorOptions {
    collapseSingleChildWrappers?: boolean;
    convertVectorsToIcons?: boolean;
    dropInvisibleNodes?: boolean;
    omitRedundantTextName?: boolean;
}
export declare function unwrapFigmaNode(input: any): RawFigmaNode;
export declare class FigmaCompressor {
    private options;
    rawNodeCount: number;
    cleanNodeCount: number;
    constructor(options?: CompressorOptions);
    private countRawNodes;
    private countCleanNodes;
    compress(rawRoot: any): CleanSpecNode | null;
    private processNode;
}
