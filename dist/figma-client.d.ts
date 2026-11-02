import { RawFigmaNode } from './types.js';
export interface ParsedFigmaUrl {
    fileKey: string;
    nodeId?: string;
}
export declare function parseFigmaUrl(urlStr: string): ParsedFigmaUrl;
export declare function extractFigmaNode(payload: any, preferredNodeId?: string): RawFigmaNode;
export declare function fetchFigmaNodeFromUrl(figmaUrl: string, options?: {
    token?: string;
    fetchImpl?: typeof fetch;
    timeoutMs?: number;
}): Promise<RawFigmaNode>;
