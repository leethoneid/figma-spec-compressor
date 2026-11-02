import { FigmaColor, FigmaTypeStyle, RawFigmaNode } from './types.js';
export declare function rgbaToHex(color?: FigmaColor, opacity?: number): string | null;
export declare function mapColorToTailwind(hex: string, prefix: 'bg' | 'text' | 'border' | 'from' | 'to' | string): string;
export declare function mapSpacing(px?: number): number | null;
export declare function mapTypography(style?: FigmaTypeStyle): string[];
export declare function mapNodeToClasses(node: RawFigmaNode, parentLayoutMode?: 'NONE' | 'HORIZONTAL' | 'VERTICAL'): string[];
