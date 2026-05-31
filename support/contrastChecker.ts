// WCAG 2.2 contrast ratio calculations.
// Reference: https://www.w3.org/TR/WCAG22/#dfn-relative-luminance

export interface ColorPair {
  name: string
  fg: string   // foreground hex, e.g. '#ffffff'
  bg: string   // background hex
  largeText: boolean  // true if ≥ 18pt, or ≥ 14pt bold
}

export interface ContrastResult {
  name: string
  fg: string
  bg: string
  ratio: number
  required: number
  pass: boolean
}

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '')
  const full = h.length === 3
    ? h.split('').map(c => c + c).join('')
    : h
  return [
    parseInt(full.slice(0, 2), 16),
    parseInt(full.slice(2, 4), 16),
    parseInt(full.slice(4, 6), 16),
  ]
}

function toLinear(channel: number): number {
  const c = channel / 255
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
}

function relativeLuminance(hex: string): number {
  const [r, g, b] = hexToRgb(hex)
  return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b)
}

export function contrastRatio(fg: string, bg: string): number {
  const l1 = relativeLuminance(fg)
  const l2 = relativeLuminance(bg)
  const lighter = Math.max(l1, l2)
  const darker  = Math.min(l1, l2)
  return (lighter + 0.05) / (darker + 0.05)
}

// WCAG 2.2 AA thresholds: 4.5:1 normal text, 3:1 large text.
// Large text = ≥ 18pt (24px) or ≥ 14pt bold (≈18.67px).
const AA_NORMAL = 4.5
const AA_LARGE  = 3.0

export function checkPairs(pairs: ColorPair[]): ContrastResult[] {
  return pairs.map(p => {
    const ratio    = contrastRatio(p.fg, p.bg)
    const required = p.largeText ? AA_LARGE : AA_NORMAL
    return { name: p.name, fg: p.fg, bg: p.bg, ratio: Math.round(ratio * 100) / 100, required, pass: ratio >= required }
  })
}
