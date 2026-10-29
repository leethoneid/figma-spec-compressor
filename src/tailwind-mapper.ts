import { FigmaColor, FigmaPaint, FigmaTypeStyle, RawFigmaNode } from './types.js';

export function rgbaToHex(color?: FigmaColor, opacity: number = 1): string | null {
  if (!color) return null;
  const r = Math.round(color.r * 255);
  const g = Math.round(color.g * 255);
  const b = Math.round(color.b * 255);
  const a = color.a !== undefined ? color.a * opacity : opacity;
  
  const toHex = (n: number) => n.toString(16).padStart(2, '0');
  if (a < 1) {
    const alphaHex = Math.round(a * 255).toString(16).padStart(2, '0');
    return `#${toHex(r)}${toHex(g)}${toHex(b)}${alphaHex}`;
  }
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

export function mapColorToTailwind(hex: string, prefix: 'bg' | 'text' | 'border'): string {
  const commonColors: Record<string, string> = {
    '#ffffff': `${prefix}-white`,
    '#000000': `${prefix}-black`,
    '#f8fafc': `${prefix}-slate-50`,
    '#f1f5f9': `${prefix}-slate-100`,
    '#e2e8f0': `${prefix}-slate-200`,
    '#94a3b8': `${prefix}-slate-400`,
    '#64748b': `${prefix}-slate-500`,
    '#334155': `${prefix}-slate-700`,
    '#0f172a': `${prefix}-slate-900`,
    '#f9fafb': `${prefix}-gray-50`,
    '#f3f4f6': `${prefix}-gray-100`,
    '#e5e7eb': `${prefix}-gray-200`,
    '#9ca3af': `${prefix}-gray-400`,
    '#6b7280': `${prefix}-gray-500`,
    '#374151': `${prefix}-gray-700`,
    '#111827': `${prefix}-gray-900`,
    '#2563eb': `${prefix}-blue-600`,
    '#3b82f6': `${prefix}-blue-500`,
    '#1d4ed8': `${prefix}-blue-700`,
    '#10b981': `${prefix}-emerald-500`,
    '#ef4444': `${prefix}-red-500`
  };

  const lower = hex.toLowerCase();
  if (commonColors[lower]) {
    return commonColors[lower];
  }
  return `${prefix}-[${hex}]`;
}

export function mapSpacing(px?: number): number | null {
  if (px === undefined || px === 0) return 0;
  // Standard 4px grid: 4px = 1, 8px = 2, 12px = 3, 16px = 4, 20px = 5, 24px = 6, 32px = 8, 40px = 10, 48px = 12
  const scale: Record<number, number> = {
    4: 1, 8: 2, 12: 3, 16: 4, 20: 5, 24: 6, 28: 7, 32: 8, 36: 9, 40: 10, 48: 12, 64: 16
  };
  if (scale[px]) return scale[px];
  const rounded = Math.round(px / 4);
  return rounded > 0 ? rounded : null;
}

export function mapTypography(style?: FigmaTypeStyle): string[] {
  if (!style) return [];
  const classes: string[] = [];

  // Font size
  if (style.fontSize) {
    if (style.fontSize <= 12) classes.push('text-xs');
    else if (style.fontSize <= 14) classes.push('text-sm');
    else if (style.fontSize <= 16) classes.push('text-base');
    else if (style.fontSize <= 18) classes.push('text-lg');
    else if (style.fontSize <= 20) classes.push('text-xl');
    else if (style.fontSize <= 24) classes.push('text-2xl');
    else if (style.fontSize <= 30) classes.push('text-3xl');
    else if (style.fontSize <= 36) classes.push('text-4xl');
    else classes.push(`text-[${style.fontSize}px]`);
  }

  // Font weight
  if (style.fontWeight) {
    if (style.fontWeight >= 700) classes.push('font-bold');
    else if (style.fontWeight >= 600) classes.push('font-semibold');
    else if (style.fontWeight >= 500) classes.push('font-medium');
    else if (style.fontWeight <= 300) classes.push('font-light');
  }

  // Text align
  if (style.textAlignHorizontal === 'CENTER') classes.push('text-center');
  else if (style.textAlignHorizontal === 'RIGHT') classes.push('text-right');

  return classes;
}

export function mapNodeToClasses(node: RawFigmaNode): string[] {
  const classes: string[] = [];

  // 1. Layout Mode (Flexbox)
  if (node.layoutMode === 'HORIZONTAL') {
    classes.push('flex', 'flex-row');
  } else if (node.layoutMode === 'VERTICAL') {
    classes.push('flex', 'flex-col');
  }

  // Alignment
  if (node.layoutMode && node.layoutMode !== 'NONE') {
    if (node.primaryAxisAlignItems === 'CENTER') classes.push('justify-center');
    else if (node.primaryAxisAlignItems === 'SPACE_BETWEEN') classes.push('justify-between');
    else if (node.primaryAxisAlignItems === 'MAX') classes.push('justify-end');

    if (node.counterAxisAlignItems === 'CENTER') classes.push('items-center');
    else if (node.counterAxisAlignItems === 'MAX') classes.push('items-end');
    else if (node.counterAxisAlignItems === 'MIN') classes.push('items-start');

    // Gap
    if (node.itemSpacing && node.itemSpacing > 0) {
      const gap = mapSpacing(node.itemSpacing);
      if (gap !== null) classes.push(`gap-${gap}`);
      else classes.push(`gap-[${node.itemSpacing}px]`);
    }
  }

  // 2. Padding
  const pt = node.paddingTop || 0;
  const pb = node.paddingBottom || 0;
  const pl = node.paddingLeft || 0;
  const pr = node.paddingRight || 0;

  if (pt === pb && pl === pr && pt === pl && pt > 0) {
    const p = mapSpacing(pt);
    if (p !== null) classes.push(`p-${p}`);
    else classes.push(`p-[${pt}px]`);
  } else {
    if (pt === pb && pt > 0) {
      const py = mapSpacing(pt);
      classes.push(py !== null ? `py-${py}` : `py-[${pt}px]`);
    } else {
      if (pt > 0) classes.push(`pt-[${pt}px]`);
      if (pb > 0) classes.push(`pb-[${pb}px]`);
    }

    if (pl === pr && pl > 0) {
      const px = mapSpacing(pl);
      classes.push(px !== null ? `px-${px}` : `px-[${pl}px]`);
    } else {
      if (pl > 0) classes.push(`pl-[${pl}px]`);
      if (pr > 0) classes.push(`pr-[${pr}px]`);
    }
  }

  // 3. Fills (Background)
  if (node.fills && Array.isArray(node.fills)) {
    const visibleFill = node.fills.find((f: FigmaPaint) => f.visible !== false && f.type === 'SOLID');
    if (visibleFill && visibleFill.color) {
      const hex = rgbaToHex(visibleFill.color, visibleFill.opacity ?? 1);
      if (hex) {
        if (node.type === 'TEXT') {
          classes.push(mapColorToTailwind(hex, 'text'));
        } else {
          classes.push(mapColorToTailwind(hex, 'bg'));
        }
      }
    }
  }

  // 4. Borders / Strokes
  if (node.strokes && Array.isArray(node.strokes) && node.strokes.length > 0) {
    const visibleStroke = node.strokes.find((s: FigmaPaint) => s.visible !== false);
    if (visibleStroke && visibleStroke.color) {
      const hex = rgbaToHex(visibleStroke.color, visibleStroke.opacity ?? 1);
      const weight = node.strokeWeight || 1;
      classes.push(weight === 1 ? 'border' : `border-[${weight}px]`);
      if (hex) classes.push(mapColorToTailwind(hex, 'border'));
    }
  }

  // 5. Corner Radius
  if (node.cornerRadius && node.cornerRadius > 0) {
    if (node.cornerRadius <= 4) classes.push('rounded');
    else if (node.cornerRadius <= 8) classes.push('rounded-md');
    else if (node.cornerRadius <= 12) classes.push('rounded-lg');
    else if (node.cornerRadius <= 16) classes.push('rounded-xl');
    else if (node.cornerRadius <= 24) classes.push('rounded-2xl');
    else if (node.cornerRadius >= 999) classes.push('rounded-full');
    else classes.push(`rounded-[${node.cornerRadius}px]`);
  }

  // 6. Effects (Shadow)
  if (node.effects && Array.isArray(node.effects)) {
    const dropShadow = node.effects.find(e => e.visible !== false && e.type === 'DROP_SHADOW');
    if (dropShadow) {
      const r = dropShadow.radius || 0;
      if (r <= 4) classes.push('shadow-sm');
      else if (r <= 8) classes.push('shadow');
      else if (r <= 16) classes.push('shadow-md');
      else classes.push('shadow-lg');
    }
  }

  // 7. Typography (for Text)
  if (node.type === 'TEXT' && node.style) {
    classes.push(...mapTypography(node.style));
  }

  return classes;
}
