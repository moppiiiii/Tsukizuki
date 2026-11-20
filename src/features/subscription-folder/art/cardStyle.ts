// カードの配色（文字色・影・下地）と背景画像のスタイル
import type { CSSProperties } from 'react'
import { mixHex } from './color'
import { toneOf } from './designs'

type Tone = 'dark' | 'light'

function toneVars(tone: Tone) {
  const dark = tone === 'dark'
  return {
    ci: dark ? '#FFFFFF' : '#141414',
    // マットな見た目に合わせ、文字の影はにじませず細くする
    ts: dark ? '0 1px 1px rgba(0,0,0,.22)' : 'none',
    scrim: dark
      ? 'linear-gradient(to top, rgba(0,0,0,.5), rgba(0,0,0,0) 58%), linear-gradient(to bottom, rgba(0,0,0,.26), rgba(0,0,0,0) 38%)'
      : 'linear-gradient(to top, rgba(255,255,255,.62), rgba(255,255,255,0) 58%), linear-gradient(to bottom, rgba(255,255,255,.4), rgba(255,255,255,0) 38%)',
    pill: dark ? '#141414' : '#FFFFFF',
  }
}

/** カード要素に渡す CSS 変数（--ci = 文字色 など） */
export function cardVars(color: string, design: string): CSSProperties {
  const v = toneVars(toneOf(design, color))
  return {
    '--cc': color,
    '--ci': v.ci,
    '--ts': v.ts,
    '--scrim': v.scrim,
    '--pill-ink': v.pill,
  } as CSSProperties
}

/**
 * 柄の背景スタイル。柄が描けるまでは色のグラデーションを出す。
 * veil を渡すと柄の上に半透明の膜を重ねる（カード裏面の文字を読みやすくするため）。
 */
export function artStyle(color: string, url: string, veil?: Tone): CSSProperties {
  if (!url) {
    return {
      backgroundColor: color,
      backgroundImage: `linear-gradient(140deg, ${mixHex(color, 0.2)}, ${color} 50%, ${mixHex(color, -0.24)})`,
    }
  }
  const film =
    veil === 'dark'
      ? 'linear-gradient(rgba(0,0,0,.52), rgba(0,0,0,.52)), '
      : veil === 'light'
        ? 'linear-gradient(rgba(255,255,255,.62), rgba(255,255,255,.62)), '
        : ''
  return { backgroundColor: color, backgroundImage: `${film}url("${url}")` }
}

export { toneOf }
