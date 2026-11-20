// 画面下の「¥」ボタン。マウスを乗せるかタップすると、丸がパネルに広がり、
// 毎月・1年の支払い合計と次の支払いを動き付きで出す。
// 丸は画面中央から左にずらして置き（右隣は ＋ ボタン）、パネルは画面中央に広がる。
import { useEffect, useRef, useState, type CSSProperties } from 'react'

import { cx, prefersReducedMotion } from '../dom'
import {
  diffDays,
  dueLabel,
  monthlyOf,
  nextDate,
  shortDate,
  yearlyOf,
  yen,
} from '../model/format'
import type { Sub } from '../model/types'

type Props = {
  subs: Sub[]
  /** フォルダを開いている間は隠す */
  hidden: boolean
}

export function SummaryFab({ subs, hidden }: Props) {
  const rootRef = useRef<HTMLDivElement>(null)
  // hover = マウスが乗っている / pinned = クリックかタップで開いたまま
  const [hover, setHover] = useState(false)
  const [pinned, setPinned] = useState(false)
  const open = !hidden && (hover || pinned)
  // 隣の ＋ へ向かう途中でかすっただけでは開かないよう、少し留まってから開く
  const hoverTimer = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  )
  const enter = () => {
    clearTimeout(hoverTimer.current)
    hoverTimer.current = setTimeout(() => setHover(true), 140)
  }
  const leave = () => {
    clearTimeout(hoverTimer.current)
    setHover(false)
  }
  useEffect(() => () => clearTimeout(hoverTimer.current), [])

  useEffect(() => {
    if (!hidden) return
    leave()
    setPinned(false)
  }, [hidden])

  // 開いたままのときは、外側のタップか Esc で閉じる
  useEffect(() => {
    if (!pinned) return
    const onDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setPinned(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setPinned(false)
    }
    document.addEventListener('pointerdown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [pinned])

  const monthly = useCountUp(
    subs.reduce((a, s) => a + monthlyOf(s), 0),
    open,
  )
  const yearly = useCountUp(
    subs.reduce((a, s) => a + yearlyOf(s), 0),
    open,
  )
  const next = nextPayment(subs)

  return (
    <div
      ref={rootRef}
      className={cx('fab', open && 'open', hidden && 'away')}
      inert={hidden}
      onPointerEnter={(e) => e.pointerType === 'mouse' && enter()}
      onPointerLeave={(e) => e.pointerType === 'mouse' && leave()}
    >
      <div className="fab-shape">
        <div className="fab-body" id="fab-body" aria-hidden={!open}>
          {subs.length ? (
            <>
              <div className="fab-stats" style={{ '--d': 0 } as CSSProperties}>
                <div>
                  <span className="fab-label">Per month</span>
                  <span className="fab-value">{yen(monthly)}</span>
                </div>
                <div>
                  <span className="fab-label">Per year</span>
                  <span className="fab-value sub">{yen(yearly)}</span>
                </div>
              </div>
              {next && (
                <div className="fab-next" style={{ '--d': 1 } as CSSProperties}>
                  <span className="fab-label">Next payment</span>
                  <span className="fab-next-row">
                    <span className="fab-next-name">{next.name}</span>
                    <span className="fab-next-meta">
                      {next.date} · {next.due}
                      <b>{next.amount}</b>
                    </span>
                  </span>
                </div>
              )}
            </>
          ) : (
            <p className="fab-empty" style={{ '--d': 0 } as CSSProperties}>
              No subscriptions yet
            </p>
          )}
        </div>
        <span className="fab-icon" aria-hidden="true">
          ¥
        </span>
        <button
          className="fab-hit"
          type="button"
          aria-expanded={open}
          aria-controls="fab-body"
          aria-label={open ? 'Hide payment summary' : 'Show payment summary'}
          onClick={() => setPinned((p) => !p)}
          onFocus={(e) =>
            e.currentTarget.matches(':focus-visible') && setHover(true)
          }
          onBlur={() => setHover(false)}
        />
      </div>
    </div>
  )
}

/** 開いたときに 0 から目標の金額まで数え上げる */
function useCountUp(target: number, run: boolean): number {
  const [value, setValue] = useState(target)
  useEffect(() => {
    if (!run || prefersReducedMotion()) {
      setValue(target)
      return
    }
    // パネルが広がり始めてから数え始める
    const start = performance.now() + 120
    const dur = 720
    let raf = 0
    const tick = (t: number) => {
      const p = Math.min(1, Math.max(0, (t - start) / dur))
      setValue(target * (1 - Math.pow(1 - p, 3)))
      if (p < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [target, run])
  return value
}

/** 次に支払うサブスク。同じ日に複数あれば「+◯ more」とまとめる */
function nextPayment(subs: Sub[]) {
  if (!subs.length) return null
  const list = subs
    .map((s) => ({ s, d: nextDate(s) }))
    .sort((a, b) => a.d.getTime() - b.d.getTime())
  const first = list[0]
  const same = list.filter((x) => x.d.getTime() === first.d.getTime())
  return {
    name:
      same.length > 1
        ? `${first.s.name} +${same.length - 1} more`
        : first.s.name,
    amount: yen(same.reduce((a, x) => a + x.s.price, 0)),
    date: shortDate(first.d),
    due: dueLabel(diffDays(first.d)),
  }
}
