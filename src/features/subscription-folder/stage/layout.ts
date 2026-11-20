// フォルダを開いたときに、カードを扇状に並べる位置の計算
import type { Box } from '../dom'

/** カード 1 枚の大きさ（クレジットカードと同じ縦横比） */
export type Geo = { W: number; H: number }
/** カードの静止位置。x, y は開いたフォルダ左上からの px、r は回転角（度） */
export type RestPos = { x: number; y: number; r: number }

export function computeGeo(vw: number): Geo {
  const W = Math.round(Math.min(200, Math.max(138, vw * 0.2)))
  return { W, H: Math.round(W / 1.586) }
}

/** カードを広げるのにフォルダの上に必要な高さ */
export const fanRoomAbove = (n: number, geo: Geo) =>
  geo.H + 26 + (n > 6 ? geo.H * 0.72 : 0)

/** カードが出入りする位置（フォルダのポケット） */
export const pocket = (box: Box, geo: Geo) => ({
  x: box.width / 2 - geo.W / 2,
  y: box.height * 0.66 - geo.H / 2,
})

/**
 * n 枚のカードの静止位置。7 枚以上は 2 段にする。
 * 画面幅に収まらないときはカードどうしの角度を詰め、扇の中心を画面内に寄せる。
 */
export function layoutFan(
  n: number,
  box: Box,
  geo: Geo,
  vw: number,
): RestPos[] {
  const out: RestPos[] = []
  if (!n) return out
  const { W, H } = geo
  const rows = n > 6 ? 2 : 1
  const counts = rows === 1 ? [n] : [Math.ceil(n / 2), Math.floor(n / 2)]
  const R0 = Math.max(W * 2.1, 240)
  const gap = H * 0.72
  const maxHalf = vw / 2 - 14
  const rowsGeo = counts.map((cnt, r) => {
    const lift = (rows - 1 - r) * gap
    const R = R0 + lift
    let step = cnt > 1 ? (13 * Math.PI) / 180 : 0
    if (cnt > 1 && R * Math.sin((step * (cnt - 1)) / 2) > maxHalf - W * 0.6) {
      step =
        (2 *
          Math.asin(Math.min(0.98, Math.max(0.02, (maxHalf - W * 0.6) / R)))) /
        (cnt - 1)
    }
    return {
      cnt,
      lift,
      R,
      step,
      half: R * Math.sin((step * (cnt - 1)) / 2) + W * 0.6,
    }
  })
  const half = Math.max(...rowsGeo.map((g) => g.half))
  const folderCx = box.left + box.width / 2
  const fanCx =
    half * 2 >= vw - 28
      ? vw / 2
      : Math.min(Math.max(folderCx, half + 14), vw - half - 14)
  const offX = fanCx - folderCx
  let idx = 0
  rowsGeo.forEach((g) => {
    const py = -H * 0.5 - 8 - g.lift + g.R
    const start = (-g.step * (g.cnt - 1)) / 2
    for (let j = 0; j < g.cnt; j++, idx++) {
      const a = start + g.step * j
      // 手で並べたような小さなずれ
      const jitter = ((idx * 53) % 7) - 3
      const cx =
        box.width / 2 + offX + g.R * Math.sin(a) + (((idx * 31) % 5) - 2) * 3
      const cy = py - g.R * Math.cos(a) + (((idx * 29) % 5) - 2) * 3
      out.push({
        x: Math.round(cx - W / 2),
        y: Math.round(cy - H / 2),
        r: +(((a * 180) / Math.PI) * 0.62 + jitter * 0.8).toFixed(2),
      })
    }
  })
  return out
}
