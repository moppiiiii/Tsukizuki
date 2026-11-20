// 色の計算（16進カラーの分解・明るさ・混色）

export const hexRgb = (h: string): [number, number, number] => [
  parseInt(h.slice(1, 3), 16),
  parseInt(h.slice(3, 5), 16),
  parseInt(h.slice(5, 7), 16),
]

/** 相対輝度（WCAG の定義） */
export function lum(hex: string): number {
  const c = hexRgb(hex).map((v) => {
    v /= 255
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)
  })
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]
}

const DARK_INK = '#141414'
const DARK_L = lum(DARK_INK)

/** 背景色の上に載せる文字色として、白と黒のどちらがコントラストを取れるか */
export function inkFor(hex: string): '#FFFFFF' | typeof DARK_INK {
  const L = lum(hex)
  return 1.05 / (L + 0.05) >= (L + 0.05) / (DARK_L + 0.05)
    ? '#FFFFFF'
    : DARK_INK
}

/** t > 0 で白へ、t < 0 で黒へ寄せる */
export function mixHex(hex: string, t: number): string {
  const c = hexRgb(hex)
  const to = t >= 0 ? 255 : 0
  const a = Math.abs(t)
  return `rgb(${c.map((v) => Math.round(v + (to - v) * a)).join(',')})`
}
