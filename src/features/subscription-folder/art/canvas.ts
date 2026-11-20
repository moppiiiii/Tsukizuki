// カードの柄を描くための canvas 補助関数（乱数・ノイズ・ぼかし・グラデーション表など）

export type RGB = [number, number, number] | number[]

export function rgbHsl([r, g, b]: RGB): [number, number, number] {
  r /= 255
  g /= 255
  b /= 255
  const mx = Math.max(r, g, b)
  const mn = Math.min(r, g, b)
  const l = (mx + mn) / 2
  let h = 0
  let s = 0
  if (mx !== mn) {
    const d = mx - mn
    s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn)
    h = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4
    h *= 60
  }
  return [h, s * 100, l * 100]
}

export function hslRgb(h: number, s: number, l: number): number[] {
  h = (((h % 360) + 360) % 360) / 360
  s = Math.max(0, Math.min(100, s)) / 100
  l = Math.max(0, Math.min(100, l)) / 100
  if (!s) {
    const v = l * 255
    return [v, v, v]
  }
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s
  const p = 2 * l - q
  const f = (t: number) => {
    if (t < 0) t += 1
    if (t > 1) t -= 1
    if (t < 1 / 6) return p + (q - p) * 6 * t
    if (t < 0.5) return q
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6
    return p
  }
  return [f(h + 1 / 3) * 255, f(h) * 255, f(h - 1 / 3) * 255]
}

export const hsl = (h: number, s: number, l: number, a = 1) =>
  `hsla(${(((h % 360) + 360) % 360).toFixed(1)},${Math.max(0, Math.min(100, s)).toFixed(1)}%,${Math.max(0, Math.min(100, l)).toFixed(1)}%,${a})`

export function hashStr(s: string): number {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

/** シード付き乱数（mulberry32） */
export function rngOf(seed: number): () => number {
  let a = seed >>> 0 || 1
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export type Noise = ((x: number, y: number) => number) & {
  fbm: (x: number, y: number, o?: number) => number
}

/** 2 次元のバリューノイズと、それを重ねた fBm */
export function noiseOf(r: () => number): Noise {
  const P = new Uint8Array(512)
  const V = new Float32Array(256)
  for (let i = 0; i < 256; i++) {
    P[i] = i
    V[i] = r()
  }
  for (let i = 255; i > 0; i--) {
    const j = Math.floor(r() * (i + 1))
    const t = P[i]
    P[i] = P[j]
    P[j] = t
  }
  for (let i = 0; i < 256; i++) P[i + 256] = P[i]
  const n = ((x: number, y: number) => {
    const xi = Math.floor(x)
    const yi = Math.floor(y)
    const xf = x - xi
    const yf = y - yi
    const X = xi & 255
    const Y = yi & 255
    const a = V[P[P[X] + Y]]
    const b = V[P[P[X + 1] + Y]]
    const c = V[P[P[X] + Y + 1]]
    const d = V[P[P[X + 1] + Y + 1]]
    const u = xf * xf * (3 - 2 * xf)
    const v = yf * yf * (3 - 2 * yf)
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v
  }) as Noise
  n.fbm = (x, y, o = 4) => {
    let s = 0
    let amp = 0.5
    let f = 1
    let norm = 0
    for (let i = 0; i < o; i++) {
      s += amp * n(x * f, y * f)
      norm += amp
      amp *= 0.5
      f *= 2.03
    }
    return s / norm
  }
  return n
}

export function makeCanvas(w: number, h: number): HTMLCanvasElement {
  const c = document.createElement('canvas')
  c.width = Math.max(1, Math.round(w))
  c.height = Math.max(1, Math.round(h))
  return c
}

export function ctx2d(c: HTMLCanvasElement): CanvasRenderingContext2D {
  const x = c.getContext('2d')
  if (!x) throw new Error('canvas 2d context is unavailable')
  return x
}

// ctx.filter（blur）が使えるブラウザかどうか。初回だけ調べる
let filterSupport: boolean | null = null
function canFilter(): boolean {
  if (filterSupport === null) {
    try {
      const x = ctx2d(makeCanvas(1, 1))
      x.filter = 'blur(2px)'
      filterSupport = x.filter === 'blur(2px)'
    } catch {
      filterSupport = false
    }
  }
  return filterSupport
}

/** fn で描いた内容を px だけぼかして ctx に重ねる。filter 非対応なら縮小→拡大でぼかす */
export function blurLayer(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  px: number,
  fn: (x: CanvasRenderingContext2D) => void,
) {
  if (px <= 0.5) {
    fn(ctx)
    return
  }
  const pad = Math.ceil(px * 2)
  if (canFilter()) {
    const c = makeCanvas(w + pad * 2, h + pad * 2)
    const x = ctx2d(c)
    x.translate(pad, pad)
    fn(x)
    ctx.save()
    ctx.filter = `blur(${px}px)`
    ctx.drawImage(c, -pad, -pad)
    ctx.restore()
  } else {
    const k = Math.max(1, px / 2)
    const c = makeCanvas((w + pad * 2) / k, (h + pad * 2) / k)
    const x = ctx2d(c)
    x.scale(c.width / (w + pad * 2), c.height / (h + pad * 2))
    x.translate(pad, pad)
    fn(x)
    ctx.save()
    ctx.imageSmoothingEnabled = true
    ctx.imageSmoothingQuality = 'high'
    ctx.drawImage(c, -pad, -pad, w + pad * 2, h + pad * 2)
    ctx.restore()
  }
}

/** [位置 0..1, RGB] の列から 256 段の色表を作る */
export function ramp(stops: Array<[number, RGB]>): Uint8ClampedArray {
  const lut = new Uint8ClampedArray(256 * 3)
  for (let i = 0; i < 256; i++) {
    const t = i / 255
    let j = 0
    while (j < stops.length - 2 && t > stops[j + 1][0]) j++
    const [t0, c0] = stops[j]
    const [t1, c1] = stops[j + 1]
    const u = Math.min(1, Math.max(0, (t - t0) / (t1 - t0 || 1)))
    for (let q = 0; q < 3; q++) lut[i * 3 + q] = c0[q] + (c1[q] - c0[q]) * u
  }
  return lut
}

/** 1 ピクセルずつ色を決めて塗る */
export function pixels(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  fn: (x: number, y: number, out: number[]) => void,
) {
  const img = ctx.createImageData(w, h)
  const d = img.data
  const out = [0, 0, 0]
  for (let y = 0, i = 0; y < h; y++) {
    for (let x = 0; x < w; x++, i += 4) {
      fn(x, y, out)
      d[i] = out[0]
      d[i + 1] = out[1]
      d[i + 2] = out[2]
      d[i + 3] = 255
    }
  }
  ctx.putImageData(img, 0, 0)
}

/** pixels を 1/f の解像度で計算して拡大する（重い柄の高速化） */
export function lowres(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  f: number,
  fn: (x: number, y: number, out: number[]) => void,
) {
  const sw = Math.ceil(w / f)
  const sh = Math.ceil(h / f)
  const c = makeCanvas(sw, sh)
  pixels(ctx2d(c), sw, sh, (x, y, o) => fn(x * f, y * f, o))
  ctx.save()
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(c, 0, 0, w, h)
  ctx.restore()
}

/** 粒状ノイズ */
export function grain(ctx: CanvasRenderingContext2D, w: number, h: number, amt: number, r: () => number) {
  const img = ctx.getImageData(0, 0, w, h)
  const d = img.data
  for (let i = 0; i < d.length; i += 4) {
    const v = (r() - 0.5) * amt
    d[i] += v
    d[i + 1] += v
    d[i + 2] += v
  }
  ctx.putImageData(img, 0, 0)
}

/**
 * マット仕上げ。描き終えた柄に重ね、ツヤのある見た目を抑える。
 * 彩度を 84% に落とし、明るさを 14〜241 の幅に収めて白く飛んだ反射や真っ黒をなくし、紙のような細かい粒を足す
 */
export function matte(ctx: CanvasRenderingContext2D, w: number, h: number, r: () => number) {
  const SAT = 0.84
  const LO = 14
  const HI = 241
  const GRAIN = 7
  const k = (HI - LO) / 255
  const img = ctx.getImageData(0, 0, w, h)
  const d = img.data
  for (let i = 0; i < d.length; i += 4) {
    const R = d[i]
    const G = d[i + 1]
    const B = d[i + 2]
    const Y = R * 0.299 + G * 0.587 + B * 0.114
    const n = (r() - 0.5) * GRAIN
    d[i] = LO + (Y + (R - Y) * SAT) * k + n
    d[i + 1] = LO + (Y + (G - Y) * SAT) * k + n
    d[i + 2] = LO + (Y + (B - Y) * SAT) * k + n
  }
  ctx.putImageData(img, 0, 0)
}

/** 周辺減光 */
export function vignette(ctx: CanvasRenderingContext2D, w: number, h: number, a: number) {
  const g = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.3, w / 2, h / 2, Math.max(w, h) * 0.75)
  g.addColorStop(0, 'rgba(0,0,0,0)')
  g.addColorStop(1, `rgba(0,0,0,${a})`)
  ctx.fillStyle = g
  ctx.fillRect(0, 0, w, h)
}

export function rrect(x: CanvasRenderingContext2D, X: number, Y: number, W: number, H: number, R: number) {
  x.beginPath()
  if (typeof x.roundRect === 'function') x.roundRect(X, Y, W, H, R)
  else x.rect(X, Y, W, H)
}

export const lerp3 = (a: RGB, b: RGB, t: number, out: number[]) => {
  out[0] = a[0] + (b[0] - a[0]) * t
  out[1] = a[1] + (b[1] - a[1]) * t
  out[2] = a[2] + (b[2] - a[2]) * t
}
