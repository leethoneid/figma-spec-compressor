export interface FigmaColor {
  r: number;
  g: number;
  b: number;
  a?: number;
}

export interface FigmaPaint {
  type: string;
  visible?: boolean;
  opacity?: number;
  color?: FigmaColor;
}

export interface FigmaEffect {
  type: string;
  visible?: boolean;
  radius?: number;
  color?: FigmaColor;
  offset?: { x: number; y: number };
}

export interface FigmaTypeStyle {
  fontFamily?: string;
  fontSize?: number;
  fontWeight?: number;
  letterSpacing?: number;
  lineHeightPx?: number;
  textAlignHorizontal?: string;
}

export interface RawFigmaNode {
  id: string;
  name: string;
  type: string;
  visible?: boolean;
  opacity?: number;
  layoutMode?: 'NONE' | 'HORIZONTAL' | 'VERTICAL';
  primaryAxisAlignItems?: string;
  counterAxisAlignItems?: string;
  itemSpacing?: number;
  paddingLeft?: number;
  paddingRight?: number;
  paddingTop?: number;
  paddingBottom?: number;
  cornerRadius?: number;
  characters?: string;
  style?: FigmaTypeStyle;
  fills?: FigmaPaint[];
  strokes?: FigmaPaint[];
  strokeWeight?: number;
  effects?: FigmaEffect[];
  absoluteBoundingBox?: { x: number; y: number; width: number; height: number };
  children?: RawFigmaNode[];
  [key: string]: any;
}

export interface CleanSpecNode {
  name: string;
  type?: 'frame' | 'text' | 'button' | 'icon' | 'image' | 'component';
  classes?: string;
  text?: string;
  icon?: string;
  children?: CleanSpecNode[];
}

export interface CompressionResult {
  spec: CleanSpecNode;
  yaml: string;
  markdown: string;
  metrics: {
    rawNodesCount: number;
    cleanNodesCount: number;
    rawJsonBytes: number;
    yamlBytes: number;
    rawTokensEstimate: number;
    compressedTokensEstimate: number;
    reductionPercentage: number;
  };
}
