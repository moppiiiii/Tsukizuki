// カードの柄を画像（JPEG の data URL）にして使い回す。
// 描画は重いので、1 回 22ms までに区切って少しずつ描き、描けたものから表示する。
import { useCallback, useSyncExternalStore } from 'react'

import {
  ctx2d,
  hashStr,
  makeCanvas,
  matte,
  noiseOf,
  rgbHsl,
  rngOf,
} from './canvas'
import { hexRgb } from './color'
import { DESIGN_MAP, DESIGNS } from './designs'

export const ART_SIZE = { l: [520, 328], s: [168, 106] } as const
export type ArtSize = keyof typeof ART_SIZE

type ArtArgs = [design: string, color: string, seed: number, size: ArtSize]

// 描画に失敗した柄は '' を入れておき、プレースホルダーのグラデーションのまま表示する
const cache = new Map<string, string>()
const queue = new Map<string, ArtArgs>()
const listeners = new Map<string, Set<() => void>>()
let timer: ReturnType<typeof setTimeout> | null = null

const artKey = (...[design, color, seed, size]: ArtArgs) =>
  `${design}|${color}|${seed}|${size}`

function renderArt(...[design, color, seed, size]: ArtArgs): string {
  const [w, h] = ART_SIZE[size]
  const c = makeCanvas(w, h)
  const ctx = ctx2d(c)
  const D = DESIGN_MAP[design] || DESIGNS[0]
  const r = rngOf((seed ^ hashStr(design)) >>> 0)
  const [H, S, L] = rgbHsl(hexRgb(color))
  D.draw(ctx, w, h, { color, H, S, L, r, n: noiseOf(r), k: w / ART_SIZE.l[0] })
  matte(ctx, w, h, r)
  return c.toDataURL('image/jpeg', 0.88)
}

function run() {
  timer = null
  const t0 = performance.now()
  for (const [key, args] of queue) {
    queue.delete(key)
    let url = ''
    try {
      url = renderArt(...args)
    } catch {
      // 描けなかった柄はプレースホルダーのまま
    }
    cache.set(key, url)
    listeners.get(key)?.forEach((fn) => fn())
    if (performance.now() - t0 > 22) break
  }
  if (queue.size) timer = setTimeout(run, 12)
}

function request(args: ArtArgs) {
  const key = artKey(...args)
  if (cache.has(key) || queue.has(key)) return
  queue.set(key, args)
  if (!timer) timer = setTimeout(run, 0)
}

/** 柄の画像 URL を返す。まだ描けていなければ '' を返し、描けたら再描画される */
export function useArt(
  design: string,
  color: string,
  seed: number,
  size: ArtSize,
): string {
  const key = artKey(design, color, seed, size)
  const subscribe = useCallback(
    (cb: () => void) => {
      let set = listeners.get(key)
      if (!set) listeners.set(key, (set = new Set()))
      set.add(cb)
      request([design, color, seed, size])
      return () => {
        set.delete(cb)
        if (!set.size) listeners.delete(key)
      }
    },
    // key に design / color / seed / size がすべて入っている
    [key],
  )
  return useSyncExternalStore(
    subscribe,
    () => cache.get(key) ?? '',
    () => '',
  )
}
