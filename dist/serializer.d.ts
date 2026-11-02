import { CleanSpecNode, CompressionResult, RawFigmaNode } from './types.js';
import { CompressorOptions } from './compressor.js';
export declare function serializeToYaml(spec: CleanSpecNode): string;
export declare function generateAgentPrompt(specYaml: string, componentName?: string): string;
export declare function processAndBenchmark(rawFigma: RawFigmaNode | any, options?: CompressorOptions): CompressionResult;
