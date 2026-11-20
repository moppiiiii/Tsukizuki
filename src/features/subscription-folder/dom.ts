// DOM を直接さわる処理（スクロール・アニメーション・端末の安全領域）
import { useLayoutEffect, useRef } from 'react'

export const prefersReducedMotion = () =>
  typeof matchMedia === 'function' &&
  matchMedia('(prefers-reduced-motion: reduce)').matches

/** マウス操作の端末で、フォルダをポインタに合わせて傾けてよいか */
export const canTilt = () =>
  !prefersReducedMotion() &&
  matchMedia('(hover: hover) and (pointer: fine)').matches

export const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms))

/** ダイアログを閉じるアニメーションの長さ */
export const dialogCloseMs = () => (prefersReducedMotion() ? 0 : 190)

export const cx = (...names: Array<string | false | null | undefined>) =>
  names.filter(Boolean).join(' ')

/** 直近の値を、イベントリスナーなど長生きする関数から読むための ref */
export function useLatest<T>(value: T) {
  const ref = useRef(value)
  useLayoutEffect(() => {
    ref.current = value
  })
  return ref
}

export type Box = { left: number; top: number; width: number; height: number }
export const boxOf = (el: Element): Box => {
  const r = el.getBoundingClientRect()
  return { left: r.left, top: r.top, width: r.width, height: r.height }
}

// iPhone のノッチなどで隠れる上下の幅。初回だけ測る
let insets: { top: number; bottom: number } | null = null
export function safeInsets() {
  if (!insets) {
    const p = document.createElement('div')
    p.style.cssText =
      'position:fixed;left:0;bottom:0;width:0;height:0;padding-bottom:env(safe-area-inset-bottom,0px);visibility:hidden;pointer-events:none'
    document.body.appendChild(p)
    const bottom = p.offsetHeight || 0
    p.style.paddingBottom = '0'
    p.style.paddingTop = 'env(safe-area-inset-top,0px)'
    const top = p.offsetHeight || 0
    p.remove()
    insets = { top, bottom }
  }
  return insets
}

/** フォルダを開いている間、背面のページをスクロールさせない */
export function lockScroll(on: boolean) {
  const html = document.documentElement
  if (on) {
    const sbw = innerWidth - html.clientWidth
    if (sbw > 0) html.style.paddingRight = sbw + 'px'
    html.classList.add('locked')
  } else {
    html.classList.remove('locked')
    html.style.paddingRight = ''
  }
}

/** フォルダの上に、カードを扇状に広げる高さ need が空くまでページをスクロールする */
export async function ensureRoom(src: Element, need: number) {
  const r = src.getBoundingClientRect()
  const { top, bottom } = safeInsets()
  const ceil = need + 16 + top
  const floor = innerHeight - 16 - bottom
  let dy = 0
  if (r.top < ceil) dy = r.top - ceil
  else if (r.bottom > floor) dy = Math.min(r.bottom - floor, r.top - ceil)
  if (Math.abs(dy) < 2) return
  if (prefersReducedMotion()) {
    scrollBy(0, dy)
    return
  }
  scrollBy({ top: dy, behavior: 'smooth' })
  await new Promise<void>((res) => {
    const t = setTimeout(res, 650)
    addEventListener(
      'scrollend',
      () => {
        clearTimeout(t)
        res()
      },
      { once: true },
    )
  })
}

/** 新しく作ったフォルダを見える位置に出し、ポンと出てくるアニメーションをつける */
export function popIn(el: HTMLElement | undefined) {
  if (!el || prefersReducedMotion()) return
  el.scrollIntoView({ block: 'nearest' })
  el.animate(
    [
      { transform: 'translateY(18px) scale(.7)', opacity: 0 },
      { transform: 'none', opacity: 1 },
    ],
    { duration: 520, easing: 'cubic-bezier(.2,1.3,.4,1)' },
  )
}
