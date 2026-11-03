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
  gradientStops?: Array<{ position: number; color: FigmaColor }>;
  imageRef?: string;
  scaleMode?: string;
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
  clipsContent?: boolean;
  layoutMode?: 'NONE' | 'HORIZONTAL' | 'VERTICAL';
  layoutWrap?: 'NO_WRAP' | 'WRAP';
  layoutSizingHorizontal?: 'FIXED' | 'HUG' | 'FILL';
  layoutSizingVertical?: 'FIXED' | 'HUG' | 'FILL';
  layoutAlign?: string;
  layoutGrow?: number;
  primaryAxisAlignItems?: string;
  counterAxisAlignItems?: string;
  itemSpacing?: number;
  paddingLeft?: number;
  paddingRight?: number;
  paddingTop?: number;
  paddingBottom?: number;
  cornerRadius?: number;
  rectangleCornerRadii?: [number, number, number, number];
  characters?: string;
  style?: FigmaTypeStyle;
  fills?: FigmaPaint[];
  strokes?: FigmaPaint[];
  strokeWeight?: number;
  effects?: FigmaEffect[];
  size?: { x: number; y: number };
  absoluteBoundingBox?: { x: number; y: number; width: number; height: number };
  children?: RawFigmaNode[];
  [key: string]: any;
}

export interface CleanSpecNode {
  id?: string;
  componentId?: string;
  name?: string;
  type?: 'frame' | 'text' | 'button' | 'icon' | 'image' | 'component';
  classes?: string;
  text?: string;
  icon?: string;
  image?: string;
  repeatCount?: number;
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
    rawTokens?: number;
    compressedTokens?: number;
    rawTokensEstimate: number;
    compressedTokensEstimate: number;
    reductionPercentage: number;
  };
}
